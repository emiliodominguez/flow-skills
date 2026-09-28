import fs from "node:fs";
import path from "node:path";
import { Command, InvalidArgumentError } from "commander";
import { discoverSkills } from "../src/core/registry.js";
import { findRepoRoot, SKILLS_DIR } from "../src/core/repo.js";
import { complete, requireModel } from "./lib/model.js";
import { digest } from "./lib/fixtures.js";
import { evaluateWorkflow, validateWorkflows, type WorkflowCase, type WorkflowResult } from "./lib/workflow-eval.js";

/**
 * Parse an independent repetition count.
 * @param raw - CLI option value.
 * @returns A positive integer.
 */
function positiveInteger(raw: string): number {
	const value = Number(raw);

	if (!Number.isSafeInteger(value) || value < 1) throw new InvalidArgumentError("Expected a positive integer.");

	return value;
}

const cli = new Command()
	.description("Evaluate conversation routing and next-action decisions. No tools execute.")
	.argument("[case]", "Workflow case id, or all when omitted")
	.option("--runs <count>", "Independent conversations per case", positiveInteger, 1)
	.option("--save <directory>", "New evidence directory")
	.parse();
const options = cli.opts<{ runs: number; save?: string }>();
const root = findRepoRoot();
const cases = JSON.parse(fs.readFileSync(path.join(root, "evals/workflows.json"), "utf8")) as WorkflowCase[];
const corpus = discoverSkills(path.join(root, SKILLS_DIR));
const skills = corpus.map(function (skill) {
	return { name: skill.name, description: skill.frontmatter.description, body: `${skill.body}\n${skill.supporting}` };
});
const problems = validateWorkflows(
	cases,
	skills.map(function (skill) {
		return skill.name;
	}),
);
const selected = cases.filter(function (item) {
	return !cli.args[0] || item.id === cli.args[0];
});

if (problems.length) cli.error(problems.join("\n"));

if (!selected.length) cli.error(`Unknown workflow: ${cli.args[0]}`);

if (options.save && fs.existsSync(options.save)) cli.error(`Output directory already exists: ${options.save}`);

const config = requireModel("Workflow eval");
const judge = { ...config, model: process.env.EVAL_JUDGE_MODEL ?? config.model };
const destination = path.resolve(options.save ?? path.join(root, ".eval-runs", `workflows-${Date.now()}`));
const metadata = {
	kind: "decision-only",
	setHash: digest(JSON.stringify(cases)),
	skillsHash: digest(JSON.stringify(skills)),
	backend: config.backend,
	model: config.model ?? "default",
	judgeModel: judge.model ?? "default",
};

fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.mkdirSync(destination);

const summaries: { id: string; run: number; status: string; completedTurns: number; expectedTurns: number }[] = [];

for (const item of selected) {
	for (let run = 1; run <= options.runs; run++) {
		const directory = path.join(destination, `${item.id}-${run}`);

		fs.mkdirSync(directory);
		let callNumber = 0;
		const completed: WorkflowResult[] = [];

		/**
		 * Capture each model exchange before moving to a dependent turn.
		 * @param kind - Executor or assessor.
		 * @param prompt - User-message content.
		 * @param system - Isolated system context.
		 * @returns The raw answer text.
		 */
		async function call(kind: "answer" | "judge", prompt: string, system: string): Promise<string> {
			const result = await complete(kind === "judge" ? judge : config, prompt, { system, maxTokens: 2000 });

			fs.writeFileSync(path.join(directory, `call-${++callNumber}-${kind}.json`), JSON.stringify({ prompt, system, ...result }, null, "\t"));

			return result.text;
		}

		/**
		 * Ask the routing/continuation model without assessor expectations.
		 * @param prompt - Visible conversation.
		 * @param system - Installed or loaded skill context.
		 * @returns A routing or continuation answer.
		 */
		async function answer(prompt: string, system: string): Promise<string> {
			return call("answer", prompt, system);
		}

		/**
		 * Assess a proposed decision in a separate completion.
		 * @param prompt - Evidence and assertions.
		 * @param system - Assessor role.
		 * @returns Strict verdict JSON.
		 */
		async function assess(prompt: string, system: string): Promise<string> {
			return call("judge", prompt, system);
		}

		try {
			const results = await evaluateWorkflow(item, skills, answer, assess, function (result) {
				completed.push(result);
				fs.writeFileSync(path.join(directory, `turn-${result.turn}.json`), JSON.stringify(result, null, "\t"));
			});
			const status =
				results.length === item.steps.length &&
				results.every(function (result) {
					return result.verdicts.every(function (verdict) {
						return verdict.present;
					});
				})
					? "PASS"
					: "FAIL";

			fs.writeFileSync(path.join(directory, "result.json"), JSON.stringify({ ...metadata, id: item.id, run, status, results }, null, "\t"));
			summaries.push({ id: item.id, run, status, completedTurns: results.length, expectedTurns: item.steps.length });
			console.log(`${item.id} ${run}: ${status} (${results.length} decision turns)`);
		} catch (error) {
			fs.writeFileSync(
				path.join(directory, "result.json"),
				JSON.stringify(
					{
						...metadata,
						id: item.id,
						run,
						status: "ERROR",
						results: completed,
						error: error instanceof Error ? error.message : String(error),
					},
					null,
					"\t",
				),
			);
			summaries.push({ id: item.id, run, status: "ERROR", completedTurns: completed.length, expectedTurns: item.steps.length });
			console.error(`${item.id} ${run}: ERROR; inspect ${directory}`);
		}
	}
}

fs.writeFileSync(path.join(destination, "summary.json"), JSON.stringify({ ...metadata, summaries }, null, "\t"));
console.log(`Decision-only workflow evidence: ${destination}`);
process.exitCode = summaries.every(function (summary) {
	return summary.status === "PASS";
})
	? 0
	: 1;
