import { describe, it, expect } from "vitest";
import path from "node:path";
import { discoverSkills } from "../src/core/registry";
import { focusGraph, handoffEdges, handoffTargets, stageGraph, suiteGraph } from "../src/core/graph";
import type { Skill } from "../src/core/skill";

/**
 * Build an in-memory skill for graph tests.
 *
 * @param name - Skill name.
 * @param stage - Its workflow stage.
 * @param description - Description holding the handoff clause.
 * @returns The skill.
 */
function skill(name: string, stage: string, description: string): Skill {
	return { name, dir: "", file: "", body: "", raw: "", supporting: "", frontmatter: { name, description, metadata: { stage } } };
}

const plan = skill("flow-plan", "plan", "Plan work; small edits go to `flow-work`. Hands off to `flow-work` or `flow-ghost`.");
const work = skill("flow-work", "build", "Build it. Hands off to `flow-review`.");
const review = skill("flow-review", "verify", "Review it. Routes to `flow-work`, `flow-review`.");
const lonely = skill("flow-lonely", "operate", "No handoff clause here.");
const corpus = [plan, work, review, lonely];

describe("handoff edges", () => {
	it("reads only the handoff clause, ignoring self, unknown names and earlier mentions", () => {
		const names = new Set(corpus.map((s) => s.name));

		expect(handoffTargets(plan, names)).toEqual(["flow-work"]);
		expect(handoffTargets(review, names)).toEqual(["flow-work"]);
		expect(handoffTargets(lonely, names)).toEqual([]);
	});

	it("lists every edge in skill order", () => {
		expect(handoffEdges(corpus)).toEqual([
			{ from: "flow-plan", to: "flow-work" },
			{ from: "flow-work", to: "flow-review" },
			{ from: "flow-review", to: "flow-work" },
		]);
	});
});

describe("mermaid output", () => {
	it("groups the suite by stage in stage order with safe node ids", () => {
		const graph = suiteGraph(corpus);

		expect(graph.startsWith("flowchart LR")).toBe(true);
		expect(graph.indexOf("subgraph stage_plan")).toBeLessThan(graph.indexOf("subgraph stage_build"));
		expect(graph).toContain('flow_plan["flow-plan"]');
		expect(graph).toContain("flow_work --> flow_review");
		expect(graph).not.toContain("subgraph stage_explore");
	});

	it("collapses to stages with counted, ordered cross-stage edges", () => {
		const graph = stageGraph([...corpus, skill("flow-test", "build", "Test. Hands off to `flow-review`.")]);

		expect(graph).toContain('stage_build["build (2)"]');
		expect(graph.split("\n").filter((line) => line.includes("-->"))).toEqual([
			"  stage_plan -->|1| stage_build",
			"  stage_build -->|2| stage_verify",
			"  stage_verify -->|1| stage_build",
		]);
	});

	it("focuses one skill with its predecessors and successors", () => {
		const graph = focusGraph(work, handoffEdges(corpus));

		expect(graph).toContain("flow_plan --> flow_work");
		expect(graph).toContain("flow_review --> flow_work");
		expect(graph).toContain("flow_work --> flow_review");
		expect(graph).toContain("class flow_work focus");
		expect(graph.match(/flow_review\["flow-review"\]/g)).toHaveLength(1);
	});
});

describe("real corpus graph", () => {
	it("gives every skill a stage and at least one connection", () => {
		const skills = discoverSkills(path.resolve(import.meta.dirname, "..", "skills"));
		const edges = handoffEdges(skills);

		for (const s of skills)
			expect(
				edges.some((e) => e.from === s.name || e.to === s.name),
				s.name,
			).toBe(true);

		expect(suiteGraph(skills).match(/subgraph /g)).toHaveLength(7);
	});
});
