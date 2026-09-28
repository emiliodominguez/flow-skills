import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { discoverSkills } from "../src/core/registry";
import { validateTriggerSplits } from "../scripts/lib/routing-splits";
import { type TriggerCases } from "../scripts/lib/trigger-eval";
import { evaluateWorkflow, parseContinuation, validateWorkflows, type WorkflowCase } from "../scripts/lib/workflow-eval";

const root = path.resolve(import.meta.dirname, "..");
const corpus = discoverSkills(path.join(root, "skills"));
const names = corpus.map(function (skill) {
	return skill.name;
});
const development = JSON.parse(fs.readFileSync(path.join(root, "evals/triggers.json"), "utf8")) as Record<string, TriggerCases>;
const heldout = JSON.parse(fs.readFileSync(path.join(root, "evals/triggers-heldout.json"), "utf8")) as Record<string, TriggerCases>;
const workflows = JSON.parse(fs.readFileSync(path.join(root, "evals/workflows.json"), "utf8")) as WorkflowCase[];
const skills = [
	{ name: "flow-work", description: "Implement changes", body: "WORK_BODY_SENTINEL" },
	{ name: "flow-test", description: "Test behaviors", body: "TEST_BODY_SENTINEL" },
	{ name: "flow-ship", description: "Deliver changes", body: "UNAVAILABLE_BODY_SENTINEL" },
];
const conversation: WorkflowCase = {
	id: "corrected-scope",
	installed: ["flow-work", "flow-test"],
	steps: [
		{ message: "Fix this and push afterward.", expect: ["flow-work"], assertions: ["ASSESSOR_ONLY_FIRST"] },
		{ message: "Correction: keep this uncommitted and finish the tests.", expect: ["flow-test"], assertions: ["ASSESSOR_ONLY_SECOND"] },
	],
};

describe("routing split integrity", function () {
	it("covers every current skill independently in both splits", function () {
		expect(validateTriggerSplits(development, heldout, names)).toEqual([]);
		expect(validateWorkflows(workflows, names)).toEqual([]);
	});

	it("rejects normalized duplicates across the boundary and within a split", function () {
		const leaked = structuredClone(heldout);

		leaked["flow-work"]!.should[0] = `  ${development["flow-work"]!.should[0]!.toUpperCase().replaceAll(" ", "\n ")}  `;
		expect(validateTriggerSplits(development, leaked, names)).toEqual([expect.stringContaining("heldout: reused normalized prompt")]);
		const repeated = structuredClone(heldout);

		repeated["flow-work"]!.near[0]!.prompt = repeated["flow-work"]!.should[0]!.replaceAll(" ", "\n ");
		expect(validateTriggerSplits(development, repeated, names)).toEqual([expect.stringContaining("heldout: reused normalized prompt")]);
	});

	it("rejects missing held-out coverage and unknown expected skills", function () {
		const invalid = structuredClone(heldout);

		delete invalid["flow-work"];
		invalid["flow-test"]!.near[0]!.expect = "flow-unavailable";
		expect(validateTriggerSplits(development, invalid, names).length).toBeGreaterThanOrEqual(2);
	});
});

describe("conversation decisions", function () {
	it("rejects unavailable expectations, duplicate identities and incomplete conversations", function () {
		const invalid = structuredClone(conversation);

		invalid.installed.push("flow-missing");
		invalid.steps = [{ message: "", expect: ["flow-ship"], assertions: ["same", "same"] }];
		const problems = validateWorkflows(
			[invalid, invalid],
			skills.map(function (skill) {
				return skill.name;
			}),
		);

		for (const fragment of ["duplicate id", "invalid installed", "at least two", "empty user", "unavailable", "invalid assertions"]) {
			expect(
				problems.some(function (problem) {
					return problem.includes(fragment);
				}),
			).toBe(true);
		}
	});

	it("requires a complete nonempty continuation", function () {
		expect(parseContinuation('```json\n{"next":"Inspect the current diff"}\n```')).toBe("Inspect the current diff");

		for (const value of ['{"next":""}', '{"next":false}', '[{"next":"action"}]', 'prefix {"next":"action"}', '{"next":"partial']) {
			expect(function () {
				parseContinuation(value);
			}).toThrow();
		}
	});

	it("replays observed answers, retains loaded skills and withholds the rubric and unavailable bodies", async function () {
		const calls: { prompt: string; system: string }[] = [];
		const replies = ['{"skill":"flow-work"}', '{"next":"FIRST_OBSERVED_ACTION"}', '{"skill":"flow-test"}', '{"next":"Keep local and test"}'];
		const judged: string[] = [];
		const results = await evaluateWorkflow(
			conversation,
			skills,
			async function (prompt, system) {
				calls.push({ prompt, system });

				return replies[calls.length - 1]!;
			},
			async function (prompt) {
				judged.push(prompt);

				return JSON.stringify([
					{ beat: conversation.steps[judged.length - 1]!.assertions[0], present: true, why: "Observed decision matches." },
				]);
			},
		);

		expect(results).toHaveLength(2);
		expect(
			results.every(function (result) {
				return result.verdicts.every(function (verdict) {
					return verdict.present;
				});
			}),
		).toBe(true);
		expect(calls[2]!.prompt).toContain("FIRST_OBSERVED_ACTION");
		expect(calls[3]!.prompt).toContain("Correction: keep this uncommitted");
		expect(calls[1]!.system).toContain("WORK_BODY_SENTINEL");
		expect(calls[1]!.system).not.toContain("TEST_BODY_SENTINEL");
		expect(calls[3]!.system).toContain("WORK_BODY_SENTINEL");
		expect(calls[3]!.system).toContain("TEST_BODY_SENTINEL");
		expect(JSON.stringify(calls)).not.toContain("ASSESSOR_ONLY");
		expect(JSON.stringify(calls)).not.toContain("UNAVAILABLE_BODY_SENTINEL");
		expect(judged[1]).toContain("ASSESSOR_ONLY_SECOND");
		expect(judged[1]).toContain("FIRST_OBSERVED_ACTION");
	});

	it("keeps a wrong route failed even when the judge approves the answer", async function () {
		let call = 0;
		let turn = 0;
		const results = await evaluateWorkflow(
			conversation,
			skills,
			async function () {
				return ++call % 2 ? '{"skill":null}' : '{"next":"Inspect and test"}';
			},
			async function () {
				return JSON.stringify([{ beat: conversation.steps[turn++]!.assertions[0], present: true, why: "Approved." }]);
			},
		);

		expect(
			results.every(function (result) {
				return !result.verdicts[0]!.present;
			}),
		).toBe(true);
	});

	it("rejects a route to a skill outside the installed subset", async function () {
		await expect(
			evaluateWorkflow(
				conversation,
				skills,
				async function () {
					return '{"skill":"flow-ship"}';
				},
				async function () {
					throw new Error("Assessor must not run");
				},
			),
		).rejects.toThrow();
	});

	it("does not turn an incomplete later judgment into a successful partial conversation", async function () {
		let call = 0;
		let turn = 0;
		const persisted: number[] = [];

		await expect(
			evaluateWorkflow(
				conversation,
				skills,
				async function () {
					return ++call % 2 ? '{"skill":"flow-work"}' : '{"next":"Continue within scope"}';
				},
				async function () {
					return turn++ === 0 ? JSON.stringify([{ beat: "ASSESSOR_ONLY_FIRST", present: true, why: "Complete first turn." }]) : "[]";
				},
				function (result) {
					persisted.push(result.turn);
				},
			),
		).rejects.toThrow("exactly 1 verdicts");
		expect(persisted).toEqual([1]);
	});
});

describe("evaluation CLI boundaries", function () {
	it("rejects invalid options and names before attempting a model call", function () {
		const cases = [
			["eval-triggers.ts", "--set", "training"],
			["eval-triggers.ts", "flow-missing"],
			["eval-triggers.ts", "--runs", "1.5"],
			["eval-workflows.ts", "missing-workflow"],
			["eval-workflows.ts", "--runs", "0"],
		];

		for (const [file, ...args] of cases) {
			const result = spawnSync(process.execPath, ["--import", "tsx", path.join(root, "scripts", file!), ...args], {
				cwd: root,
				encoding: "utf8",
				env: { ...process.env, EVAL_BACKEND: "api", ANTHROPIC_API_KEY: "", EVAL_MODEL: "" },
			});

			expect(result.status, result.stderr).toBe(1);
			expect(result.stderr.trim()).not.toBe("");
			expect(result.stderr).not.toContain("not run");
		}
	});

	it("reports missing model configuration as not run", function () {
		const result = spawnSync(process.execPath, ["--import", "tsx", path.join(root, "scripts/eval-workflows.ts")], {
			cwd: root,
			encoding: "utf8",
			env: { ...process.env, EVAL_BACKEND: "api", ANTHROPIC_API_KEY: "", EVAL_MODEL: "" },
		});

		expect(result.status).toBe(2);
		expect(result.stderr).toContain("not run");
	});
});
