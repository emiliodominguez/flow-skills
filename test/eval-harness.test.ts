import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { findRepoRoot, SKILLS_DIR } from "../src/core/repo.js";
import { discoverSkills } from "../src/core/registry.js";
import { type AbCase, judgePrompt, summarizeAb, validateAbCases } from "../scripts/lib/ab-eval.js";
import { parsePick, routerPrompt, scoreTriggers, validateTriggers, type TriggerCases } from "../scripts/lib/trigger-eval.js";

const root = findRepoRoot();
const names = discoverSkills(path.join(root, SKILLS_DIR)).map((s) => s.name);

/**
 * Read a JSON file from the evals directory.
 *
 * @param file - File name inside `evals/`.
 * @returns The parsed JSON.
 */
function readEval<T>(file: string): T {
	return JSON.parse(fs.readFileSync(path.join(root, "evals", file), "utf8")) as T;
}

describe("trigger evals", () => {
	it("cover every skill with valid positive and near-miss prompts", () => {
		expect(validateTriggers(readEval<Record<string, TriggerCases>>("triggers.json"), names)).toEqual([]);
	});

	it("flag missing skills, self-targeting near misses and duplicates", () => {
		const problems = validateTriggers(
			{
				"flow-a": { should: ["x", "y", "x"], near: [{ prompt: "z", expect: "flow-a" }] },
				"flow-ghost": {
					should: ["p", "q", "r"],
					near: [
						{ prompt: "s", expect: "flow-nope" },
						{ prompt: "t", expect: null },
					],
				},
			},
			["flow-a", "flow-b"],
		);

		expect(problems).toEqual(
			expect.arrayContaining([
				"flow-b: no trigger cases",
				"flow-ghost: not a skill",
				"flow-a: needs at least 2 near misses",
				'flow-a: duplicate prompt "x"',
				"flow-a: near miss expects its own skill",
				"flow-ghost: near miss expects unknown flow-nope",
			]),
		);
	});

	it("parse picks and fail closed on unknown skills", () => {
		expect(parsePick('```json\n{"skill": "flow-a"}\n```', ["flow-a"])).toBe("flow-a");
		expect(parsePick('{"skill": null}', ["flow-a"])).toBeNull();
		expect(() => parsePick('{"skill": "flow-x"}', ["flow-a"])).toThrow(/unknown/);
		expect(() => parsePick("no idea", ["flow-a"])).toThrow(/no JSON/);
	});

	it("build a router prompt from the index and score by majority", () => {
		expect(routerPrompt([{ name: "flow-a", description: "Does A." }], "do a")).toContain("- flow-a: Does A.");

		const [score] = scoreTriggers([
			{ owner: "flow-a", kind: "should", prompt: "1", expect: "flow-a", picks: ["flow-a", "flow-a", null] },
			{ owner: "flow-a", kind: "should", prompt: "2", expect: "flow-a", picks: ["flow-b", null, "flow-a"] },
			{ owner: "flow-a", kind: "near", prompt: "3", expect: null, picks: [null] },
		]);

		expect(score).toEqual({ skill: "flow-a", should: { passed: 1, total: 2 }, near: { passed: 1, total: 1 } });
	});
});

describe("A/B evals", () => {
	it("have valid cases for existing skills", () => {
		expect(validateAbCases(readEval<AbCase[]>("ab.json"), names)).toEqual([]);
	});

	it("reject malformed cases", () => {
		const problems = validateAbCases(
			[
				{ id: "Bad Id", skill: "flow-x", prompt: " ", assertions: ["a"] },
				{ id: "ok", skill: "flow-a", prompt: "p", assertions: ["a", "a"] },
				{ id: "ok", skill: "flow-a", prompt: "p", assertions: ["a", "b"] },
			],
			["flow-a"],
		);

		expect(problems).toEqual([
			'case id "Bad Id" must be kebab-case',
			"Bad Id: unknown skill flow-x",
			"Bad Id: empty prompt",
			"Bad Id: needs at least 2 assertions",
			"ok: duplicate assertions",
			"ok: duplicate id",
		]);
	});

	it("put the situation, answer and assertions in the judge prompt", () => {
		const prompt = judgePrompt("situation", "answer", ["one", "two"]);

		expect(prompt).toContain("situation");
		expect(prompt).toContain("answer");
		expect(prompt).toContain("2. two");
	});

	it("summarize pass rates and flag non-discriminating assertions", () => {
		const item: AbCase = { id: "c", skill: "flow-a", prompt: "p", assertions: ["helps", "always", "hurts", "never"] };

		/**
		 * Build verdicts from a presence map.
		 *
		 * @param present - Assertion presence flags in assertion order.
		 * @returns Verdicts for the case assertions.
		 */
		function verdicts(present: boolean[]) {
			return item.assertions.map((beat, i) => ({ beat, present: present[i] ?? false, why: "" }));
		}

		const [summary] = summarizeAb(
			[item],
			[
				{ id: "c", variant: "with", verdicts: verdicts([true, true, false, false]), outputTokens: 100 },
				{ id: "c", variant: "without", verdicts: verdicts([false, true, true, false]), outputTokens: 300 },
			],
		);

		expect(summary?.with).toBe(0.5);
		expect(summary?.tokensWithout).toBe(300);
		expect(summary?.assertions.map((a) => a.flag)).toEqual(["ok", "passes either way", "worse with skill", "fails either way"]);
	});
});
