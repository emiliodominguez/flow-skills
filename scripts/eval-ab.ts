import fs from "node:fs";
import path from "node:path";
import { findRepoRoot, SKILLS_DIR } from "../src/core/repo.js";
import { discoverSkills } from "../src/core/registry.js";
import { type AbCase, type AbRun, judgePrompt, summarizeAb, validateAbCases } from "./lib/ab-eval.js";
import { complete, mapPool, numberFlag, requireModel } from "./lib/model.js";
import { parseVerdicts, type Verdict } from "./lib/eval-verdict.js";

/**
 * Optional with/without comparison: answer each case with and without the skill loaded, grade both
 * against the same assertions, and flag assertions that do not discriminate. It compares written
 * answers, not tool-using agent sessions; use the behavioral scenarios for those.
 * Usage: pnpm eval:ab [case-id|skill-name] [--runs 3] [--out path] [--save dir] [--concurrency 4]. EVAL_JUDGE_MODEL optionally sets a separate judge.
 */
const INSTRUCTION =
	"You cannot run tools here. Say exactly what you would do, in order, what you would run, and produce any artifact the request asks for.";

const root = findRepoRoot();
const skills = discoverSkills(path.join(root, SKILLS_DIR));
const cases = JSON.parse(fs.readFileSync(path.join(root, "evals", "ab.json"), "utf8")) as AbCase[];
const problems = validateAbCases(
	cases,
	skills.map((s) => s.name),
);

if (problems.length > 0) {
	for (const problem of problems) console.error(`✗ ${problem}`);

	process.exit(1);
}

const config = requireModel("A/B eval");
const argv = process.argv.slice(2);
const filter = argv.find((arg, i) => !arg.startsWith("--") && !["--out", "--save", "--runs", "--concurrency"].includes(argv[i - 1] ?? ""));
const selected = filter ? cases.filter((c) => c.id === filter || c.skill === filter) : cases;
const runs = numberFlag(argv, "runs", 3);
const outIndex = argv.indexOf("--out");
const out = outIndex === -1 ? undefined : argv[outIndex + 1];
const saveIndex = argv.indexOf("--save");
const save = saveIndex === -1 ? undefined : argv[saveIndex + 1];
const judge = { ...config, model: process.env.EVAL_JUDGE_MODEL ?? config.model };
const concurrency = numberFlag(argv, "concurrency", 4);

if (selected.length === 0) {
	console.error(`No case or skill named "${filter}".`);
	process.exit(1);
}

/**
 * Grade one answer, asking the judge once more if its first response is not a complete verdict set.
 * A second malformed response still fails; nothing is recovered from partial output.
 *
 * @param item - The case being graded.
 * @param answer - The answer text.
 * @returns One verdict per assertion.
 */
async function gradeAnswer(item: AbCase, answer: string): Promise<Verdict[]> {
	const prompt = judgePrompt(item.prompt, answer, item.assertions);

	try {
		return parseVerdicts((await complete(judge, prompt)).text, item.assertions);
	} catch {
		return parseVerdicts(
			(await complete(judge, `${prompt}\n\nYour previous reply was not valid. Output only the JSON array, nothing else.`)).text,
			item.assertions,
		);
	}
}

const calls = selected.flatMap((item) =>
	(["with", "without"] as const).flatMap((variant) => Array.from({ length: runs }, () => ({ item, variant }))),
);
const graded = (
	await mapPool(calls, concurrency, async ({ item, variant }, index): Promise<AbRun | undefined> => {
		const skill = skills.find((s) => s.name === item.skill);
		const system = `Follow this skill for the request.\n\n${skill?.body ?? ""}\n\n${skill?.supporting ?? ""}`;

		try {
			const answer = await complete(config, `${item.prompt}\n\n${INSTRUCTION}`, {
				system: variant === "with" ? system : undefined,
				maxTokens: 3000,
			});
			const verdicts = await gradeAnswer(item, answer.text);

			if (save) {
				fs.mkdirSync(save, { recursive: true });
				fs.writeFileSync(
					path.join(save, `${item.id}-${variant}-${index}.json`),
					JSON.stringify({ answer: answer.text, verdicts }, null, "\t"),
				);
			}

			return { id: item.id, variant, verdicts, outputTokens: answer.outputTokens };
		} catch (err) {
			console.error(`! ${item.id} ${variant}: ${err instanceof Error ? err.message : String(err)}`);

			return undefined;
		}
	})
).filter((run): run is AbRun => run !== undefined);

/**
 * Format a fraction as a percentage.
 *
 * @param value - A fraction from 0 to 1.
 * @returns The rounded percentage.
 */
function pct(value: number): string {
	return `${Math.round(value * 100)}%`;
}

const lines = [
	`# A/B eval (${new Date().toISOString().slice(0, 10)}, ${config.backend} ${config.model ?? "default model"}, judge ${judge.model ?? "default"}, ${runs} run(s) per variant)`,
	"",
];
let flagged = 0;

for (const summary of summarizeAb(selected, graded)) {
	lines.push(`## ${summary.id}`, "", `Pass rate with skill ${pct(summary.with)}, without ${pct(summary.without)}.`);
	lines.push(`Mean output tokens with ${Math.round(summary.tokensWith)}, without ${Math.round(summary.tokensWithout)}.`, "");
	lines.push("| Assertion | With | Without | Flag |", "| --- | --- | --- | --- |");

	for (const a of summary.assertions) {
		if (a.flag !== "ok") flagged++;

		lines.push(`| ${a.assertion} | ${pct(a.with)} | ${pct(a.without)} | ${a.flag} |`);
	}

	lines.push("");
}

const report = lines.join("\n");

console.log(report);

if (out) fs.writeFileSync(path.resolve(out), `${report}\n`);

if (flagged > 0) console.log(`${flagged} assertion(s) flagged: revise the assertion or the skill.`);
