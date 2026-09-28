import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { Command, InvalidArgumentError, Option } from "commander";
import { findRepoRoot } from "../src/core/repo.js";
import { loadSkill } from "../src/core/skill.js";
import { captureFiles, captureGit, digest, prepareScenario, type Scenario } from "./lib/fixtures.js";
import {
	behaviorArgs,
	behaviorJudgePrompt,
	checkBehavior,
	fileHashes,
	parseBehaviorTranscript,
	runBoundedProcess,
	type BehaviorCase,
} from "./lib/behavior-eval.js";
import { FIXTURE_TOOLS, type ToolEvent } from "./lib/fixture-tools.js";
import { BASE_SYSTEM, claudeArgs, parseClaudeOutput, type ModelConfig } from "./lib/model.js";
import { parseVerdicts, type Verdict } from "./lib/eval-verdict.js";

/**
 * Parse a bounded positive integer CLI option.
 * @param raw - Option value.
 * @returns A positive integer.
 */
function positiveInteger(raw: string): number {
	const value = Number(raw);

	if (!Number.isSafeInteger(value) || value < 1) throw new InvalidArgumentError("Expected a positive integer.");

	return value;
}

const cli = new Command()
	.description("Run isolated, tool-using behavioral scenarios. Requires EVAL_BACKEND=claude.")
	.argument("[scenario]", "Scenario id, or all when omitted")
	.option("--runs <count>", "Independent runs per variant", positiveInteger, 1)
	.option("--timeout <seconds>", "Time limit per agent run", positiveInteger, 180)
	.option("--save <directory>", "New output directory; existing paths are refused")
	.addOption(new Option("--variant <variant>", "Skill context to load").choices(["with", "without", "both"]).default("with"))
	.parse();
const options = cli.opts<{ runs: number; timeout: number; save?: string; variant: "with" | "without" | "both" }>();
const root = findRepoRoot();
const scenarios = JSON.parse(fs.readFileSync(path.join(root, "evals/scenarios.json"), "utf8")) as Scenario[];
const cases = JSON.parse(fs.readFileSync(path.join(root, "evals/behavior.json"), "utf8")) as BehaviorCase[];
const filter = cli.args[0];
const selected = scenarios.filter(function (scenario) {
	return !filter || scenario.id === filter;
});

if (!selected.length) cli.error(`Unknown scenario: ${filter}`);

for (const scenario of selected) {
	const matches = cases.filter(function (item) {
		return item.id === scenario.id;
	});
	const item = matches[0];

	if (!item) throw new Error(`Missing assessment for ${scenario.id}`);

	if (
		matches.length !== 1 ||
		!Array.isArray(item.assertions) ||
		item.assertions.length === 0 ||
		new Set(item.assertions).size !== item.assertions.length
	)
		cli.error(`Missing or invalid assessment for ${scenario.id}`);

	if (
		item.requiredTools.some(function (name) {
			return !FIXTURE_TOOLS.some(function (tool) {
				return tool.name === name;
			});
		})
	)
		cli.error(`Unknown required tool for ${scenario.id}`);
}

if (process.env.EVAL_BACKEND !== "claude") {
	console.error("Behavioral eval not run: set EVAL_BACKEND=claude and sign in to the CLI. Model usage may incur charges or consume plan limits.");
	process.exit(2);
}

let cliVersion: string;

try {
	cliVersion = execFileSync("claude", ["--version"], { encoding: "utf8", timeout: 10_000 }).trim();
} catch {
	console.error("Behavioral eval not run: the claude CLI is unavailable.");
	process.exit(2);
}

const config: ModelConfig = { backend: "claude", model: process.env.EVAL_MODEL };
const judge = { ...config, model: process.env.EVAL_JUDGE_MODEL ?? config.model };
const destination = path.resolve(options.save ?? path.join(root, ".eval-runs", `behavior-${Date.now()}`));

fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.mkdirSync(destination);

const variants = options.variant === "both" ? (["with", "without"] as const) : [options.variant];
const summaries: { id: string; variant: string; run: number; status: string; directory: string }[] = [];
const harnessHash = digest(
	[
		"scripts/eval-behavior.ts",
		"scripts/fixture-server.ts",
		"scripts/lib/behavior-eval.ts",
		"scripts/lib/fixtures.ts",
		"scripts/lib/fixture-tools.ts",
		"scripts/lib/model.ts",
		"scripts/lib/eval-verdict.ts",
	]
		.map(function (file) {
			return fs.readFileSync(path.join(root, file), "utf8");
		})
		.join("\n"),
);
let interrupted = false;

for (const scenario of selected) {
	const item = cases.find(function (entry) {
		return entry.id === scenario.id;
	})!;
	const skill = loadSkill(path.join(root, "skills", scenario.skill));

	for (const variant of variants) {
		for (let run = 1; run <= options.runs; run++) {
			if (interrupted) {
				summaries.push({ id: scenario.id, variant, run, status: "NOT_RUN", directory: "" });
				continue;
			}

			const directory = path.join(destination, `${scenario.id}-${variant}-${run}`);
			const fixture = path.join(directory, "fixture");
			const audit = path.join(directory, "tools.jsonl");

			fs.mkdirSync(directory);
			prepareScenario(scenario, fixture);
			const before = captureFiles(fixture);
			const gitBefore = captureGit(fixture);
			const started = Date.now();
			const metadata = {
				harnessHash,
				id: scenario.id,
				variant,
				run,
				cliVersion,
				node: process.version,
				platform: os.platform(),
				requestedModel: config.model ?? "default",
				judgeModel: judge.model ?? "default",
				skillHash: digest(skill.raw),
				supportingHash: digest(skill.supporting),
				scenarioHash: digest(JSON.stringify(scenario)),
				assessmentHash: digest(JSON.stringify(item)),
			};

			fs.writeFileSync(audit, "");
			fs.writeFileSync(
				path.join(directory, "before.json"),
				JSON.stringify({ files: before, hashes: fileHashes(before), git: gitBefore }, null, "\t"),
			);
			const toolConfig = path.join(directory, "tools-config.json");

			fs.writeFileSync(toolConfig, JSON.stringify({ directory: fixture, audit, initial: fileHashes(before), testFiles: item.testFiles }));
			const mcpConfig = JSON.stringify({
				mcpServers: {
					fixture: {
						command: process.execPath,
						args: ["--import", import.meta.resolve("tsx"), path.join(root, "scripts/fixture-server.ts"), toolConfig],
					},
				},
			});
			const context = variant === "with" ? `${BASE_SYSTEM}\nFollow this skill:\n${skill.body}\n${skill.supporting}` : BASE_SYSTEM;
			const system = `${context}\nYou have fixture tools for files, Git layers and configured tests. Use them to carry out the request. All paths are relative to the disposable fixture. No shell, network, delegation or outside files are available. Return your findings and evidence in the final answer; do not write an answer file unless the task asks for one.`;
			let status: string;

			try {
				const execution = await runBoundedProcess(
					"claude",
					behaviorArgs(system, mcpConfig, config.model),
					fixture,
					scenario.prompt,
					options.timeout * 1000,
				);

				interrupted = execution.interrupted;

				fs.writeFileSync(path.join(directory, "transcript.jsonl"), execution.stdout);
				fs.writeFileSync(path.join(directory, "process.json"), JSON.stringify({ ...execution, stdout: undefined }, null, "\t"));

				if (execution.interrupted || execution.timedOut || execution.exitCode !== 0)
					throw new Error(`Agent failed: exit=${execution.exitCode}, timeout=${execution.timedOut}, interrupted=${execution.interrupted}`);

				const answer = parseBehaviorTranscript(execution.stdout);
				const events = fs
					.readFileSync(audit, "utf8")
					.trim()
					.split("\n")
					.filter(Boolean)
					.map(function (line) {
						return JSON.parse(line) as ToolEvent;
					});
				const after = captureFiles(fixture);
				const gitAfter = captureGit(fixture);
				const checks = checkBehavior(item, before, after, events);

				checks.push({
					beat: "preserves Git state",
					present: JSON.stringify(gitBefore) === JSON.stringify(gitAfter),
					why: "Compared HEAD, index entries and both diffs before/after execution",
				});
				const evidence = { prompt: scenario.prompt, answer: answer.answer, before, after, gitBefore, gitAfter, tools: events };

				fs.writeFileSync(path.join(directory, "answer.json"), JSON.stringify(answer, null, "\t"));
				const judgeArgs = claudeArgs("You are an independent execution assessor. Grade only the supplied evidence.", judge.model);
				const judgeExecution = await runBoundedProcess(
					"claude",
					judgeArgs,
					os.tmpdir(),
					behaviorJudgePrompt(item, evidence),
					options.timeout * 1000,
				);

				interrupted = judgeExecution.interrupted;
				fs.writeFileSync(path.join(directory, "judge-process.json"), JSON.stringify(judgeExecution, null, "\t"));

				if (judgeExecution.interrupted || judgeExecution.timedOut || judgeExecution.exitCode !== 0)
					throw new Error("Assessor execution failed or was interrupted");

				const assessment = parseClaudeOutput(judgeExecution.stdout);

				fs.writeFileSync(path.join(directory, "judge.txt"), assessment.text);
				const verdicts: Verdict[] = [...checks, ...parseVerdicts(assessment.text, item.assertions)];

				status = verdicts.every(function (verdict) {
					return verdict.present;
				})
					? "PASS"
					: "FAIL";
				fs.writeFileSync(
					path.join(directory, "result.json"),
					JSON.stringify({ ...metadata, ...answer, durationMs: Date.now() - started, status, verdicts }, null, "\t"),
				);
			} catch (error) {
				status = "ERROR";
				fs.writeFileSync(
					path.join(directory, "result.json"),
					JSON.stringify(
						{ ...metadata, durationMs: Date.now() - started, status, error: error instanceof Error ? error.message : String(error) },
						null,
						"\t",
					),
				);
			} finally {
				try {
					const after = captureFiles(fixture);

					fs.writeFileSync(
						path.join(directory, "after.json"),
						JSON.stringify({ files: after, hashes: fileHashes(after), git: captureGit(fixture) }, null, "\t"),
					);
				} catch (error) {
					status = "ERROR";
					fs.writeFileSync(
						path.join(directory, "result.json"),
						JSON.stringify(
							{
								...metadata,
								status,
								error: `Final artifact capture failed: ${error instanceof Error ? error.message : String(error)}`,
							},
							null,
							"\t",
						),
					);
				}
			}

			summaries.push({ id: scenario.id, variant, run, status, directory });
			console.log(`${scenario.id} ${variant} ${run}: ${status} (${directory})`);
		}
	}
}

fs.writeFileSync(path.join(destination, "summary.json"), JSON.stringify(summaries, null, "\t"));
console.log(`Behavioral evidence: ${destination}`);
process.exitCode = interrupted
	? 130
	: summaries.every(function (summary) {
				return summary.status === "PASS";
		  })
		? 0
		: 1;
