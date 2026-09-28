import fs from "node:fs";
import path from "node:path";
import { Command, InvalidArgumentError, Option } from "commander";
import { findRepoRoot, SKILLS_DIR } from "../src/core/repo.js";
import { discoverSkills } from "../src/core/registry.js";
import { complete, mapPool, requireModel } from "./lib/model.js";
import { parsePick, routerPrompt, scoreTriggers, type TriggerCases, type TriggerResult } from "./lib/trigger-eval.js";
import { validateTriggerSplits } from "./lib/routing-splits.js";
import { digest } from "./lib/fixtures.js";

/**
 * Parse a repetition or concurrency count.
 * @param raw - CLI option text.
 * @returns A positive integer.
 */
function positiveInteger(raw: string): number {
	const value = Number(raw);

	if (!Number.isSafeInteger(value) || value < 1) throw new InvalidArgumentError("Expected a positive integer.");

	return value;
}

/**
 * Parse the minimum acceptable accuracy.
 * @param raw - CLI option text.
 * @returns A fraction greater than zero and at most one.
 */
function accuracyFlag(raw: string): number {
	const value = Number(raw);

	if (!Number.isFinite(value) || value <= 0 || value > 1) throw new InvalidArgumentError("Expected a fraction greater than 0 and at most 1.");

	return value;
}

const cli = new Command()
	.description("Evaluate routing against development or frozen held-out prompts.")
	.argument("[skill]", "Evaluate only this skill's cases")
	.addOption(new Option("--set <split>", "Prompt split").choices(["dev", "heldout"]).default("dev"))
	.option("--runs <count>", "Independent picks per prompt", positiveInteger, 1)
	.option("--min <accuracy>", "Minimum majority accuracy", accuracyFlag, 0.9)
	.option("--concurrency <count>", "Maximum simultaneous model calls", positiveInteger, 4)
	.option("--out <file>", "Write a new JSON evidence file")
	.parse();
const options = cli.opts<{ set: "dev" | "heldout"; runs: number; min: number; concurrency: number; out?: string }>();
const root = findRepoRoot();
const skills = discoverSkills(path.join(root, SKILLS_DIR));
const names = skills.map(function (skill) {
	return skill.name;
});
const dev = JSON.parse(fs.readFileSync(path.join(root, "evals/triggers.json"), "utf8")) as Record<string, TriggerCases>;
const heldout = JSON.parse(fs.readFileSync(path.join(root, "evals/triggers-heldout.json"), "utf8")) as Record<string, TriggerCases>;
const problems = validateTriggerSplits(dev, heldout, names);
const only = cli.args[0];

if (only && !names.includes(only)) cli.error(`Unknown skill: ${only}`);

if (options.out && fs.existsSync(options.out)) cli.error(`Output already exists: ${options.out}`);

if (problems.length > 0) cli.error(problems.join("\n"));

const config = requireModel("Trigger eval");
const set = options.set === "dev" ? dev : heldout;
const index = skills.map(function (skill) {
	return { name: skill.name, description: skill.frontmatter.description };
});
const queue = Object.entries(set)
	.filter(function ([owner]) {
		return !only || owner === only;
	})
	.flatMap(function ([owner, cases]) {
		return [
			...cases.should.map(function (prompt) {
				return { owner, kind: "should" as const, prompt, expect: owner as string | null };
			}),
			...cases.near.map(function (near) {
				return { owner, kind: "near" as const, prompt: near.prompt, expect: near.expect };
			}),
		];
	});
const calls = queue.flatMap(function (item, caseIndex) {
	return Array.from({ length: options.runs }, function () {
		return { item, caseIndex };
	});
});
const picks = await mapPool(calls, options.concurrency, async function ({ item }) {
	try {
		const { text } = await complete(config, routerPrompt(index, item.prompt), { maxTokens: 64 });

		return parsePick(text, names);
	} catch (error) {
		console.error(`! ${item.owner}: ${error instanceof Error ? error.message : String(error)}`);

		return "error";
	}
});
const results: TriggerResult[] = queue.map(function (item, caseIndex) {
	return {
		...item,
		picks: picks.filter(function (_, i) {
			return calls[i]?.caseIndex === caseIndex;
		}),
	};
});
let passed = 0;
let total = 0;

for (const score of scoreTriggers(results)) {
	passed += score.should.passed + score.near.passed;
	total += score.should.total + score.near.total;
	console.log(`${score.skill.padEnd(26)} should ${score.should.passed}/${score.should.total}  near ${score.near.passed}/${score.near.total}`);
}

const misses = results.filter(function (result) {
	return (
		result.picks.filter(function (pick) {
			return pick === result.expect;
		}).length *
			2 <=
		result.picks.length
	);
});

if (misses.length > 0) console.log("\nMisrouted:");

for (const miss of misses)
	console.log(
		`  [${miss.owner} ${miss.kind}] expected ${miss.expect ?? "none"}, got ${miss.picks.join(", ")}${options.set === "dev" ? `: ${miss.prompt}` : ""}`,
	);

const accuracy = total === 0 ? 0 : passed / total;
const report = {
	split: options.set,
	setHash: digest(JSON.stringify(set)),
	indexHash: digest(JSON.stringify(index)),
	backend: config.backend,
	model: config.model ?? "default",
	runs: options.runs,
	filter: only ?? null,
	passed,
	total,
	accuracy,
	errors: picks.filter(function (pick) {
		return pick === "error";
	}).length,
	results,
};

console.log(
	`\n${options.set} routing accuracy ${(accuracy * 100).toFixed(1)}% (${passed}/${total}, ${options.runs} run(s) per prompt, ${config.backend} ${config.model ?? "default model"})`,
);
console.log(`Dataset SHA-256: ${report.setHash}`);

if (options.out) {
	fs.mkdirSync(path.dirname(path.resolve(options.out)), { recursive: true });
	fs.writeFileSync(options.out, JSON.stringify(report, null, "\t"), { flag: "wx" });
}

if (report.errors || accuracy < options.min) process.exit(1);
