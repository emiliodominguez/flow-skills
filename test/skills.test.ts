import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { discoverSkills } from "../src/core/registry";
import {
	DESCRIPTION_CORPUS_BUDGET,
	extractSkillRefs,
	loadSkill,
	localLinks,
	validateCorpus,
	validateReferences,
	validateSkill,
	type Skill,
} from "../src/core/skill";
import { validateAll } from "../src/commands/validate";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skillsDir = path.join(root, "skills");

/**
 * Build an in-memory skill with sensible defaults for validation tests.
 *
 * @param overrides - Fields to replace on the default skill.
 * @returns A skill that passes validation unless the overrides break it.
 */
function makeSkill(overrides: Omit<Partial<Skill>, "frontmatter"> & { frontmatter?: Record<string, unknown> } = {}): Skill {
	return {
		name: "flow-demo",
		dir: "",
		file: "",
		body: "Do the thing.\n\n## Anti-patterns\n- none\n\n## Done when\n- done",
		raw: "",
		supporting: "",
		...overrides,
		frontmatter: {
			name: "flow-demo",
			description: "Demonstrate validation with a description long enough to pass. Hands off to `flow-other` for more.",
			...overrides.frontmatter,
		},
	} as Skill;
}

describe("skills corpus", () => {
	const skills = discoverSkills(skillsDir);

	it("discovers the skill set", () => {
		expect(skills.length).toBeGreaterThanOrEqual(16);
	});

	it("every skill's frontmatter name matches its directory and uses the flow- prefix", () => {
		for (const skill of skills) {
			expect(skill.frontmatter.name, skill.name).toBe(skill.name);
			expect(skill.name.startsWith("flow-"), skill.name).toBe(true);
		}
	});

	it("has zero validation ERRORS across the corpus", () => {
		const errors = validateAll(skillsDir).issues.filter((i) => i.level === "error");

		expect(errors, JSON.stringify(errors, null, 2)).toEqual([]);
	});

	it("stays host-agnostic: no host names or host invocation syntax in skill content", () => {
		for (const skill of skills) {
			const text = `${skill.frontmatter.description}\n${skill.body}\n${skill.supporting}`;

			expect(text, skill.name).not.toMatch(/claude|codex|cursor|copilot|windsurf/i);
			expect(text, skill.name).not.toMatch(/[/$]flow-[a-z]/);
		}
	});

	it("keeps the corpus description budget", () => {
		const total = skills.reduce((sum, skill) => sum + skill.frontmatter.description.length, 0);

		expect(total).toBeLessThanOrEqual(DESCRIPTION_CORPUS_BUDGET);
	});
});

describe("validateSkill", () => {
	it("accepts a clean portable skill", () => {
		expect(validateSkill(makeSkill())).toEqual([]);
	});

	it("rejects host-specific frontmatter", () => {
		const issues = validateSkill(makeSkill({ frontmatter: { "disable-model-invocation": true, context: "fork" } }));

		expect(issues.filter((i) => i.rule === "frontmatter.portable")).toHaveLength(2);
		expect(issues.every((i) => i.level === "error")).toBe(true);
	});

	it("accepts optional spec fields", () => {
		expect(validateSkill(makeSkill({ frontmatter: { license: "MIT", metadata: { owner: "x" } } }))).toEqual([]);
	});

	it("flags a missing description", () => {
		expect(validateSkill(makeSkill({ frontmatter: { description: "" } })).some((i) => i.rule === "frontmatter.description")).toBe(true);
	});

	it("reports non-string frontmatter fields without crashing validation", () => {
		const issues = validateSkill(makeSkill({ frontmatter: { name: 42, description: ["wrong"] } }));

		expect(issues.map((issue) => issue.message)).toEqual(expect.arrayContaining(["`name` must be a string", "`description` must be a string"]));
	});

	it("warns on filler words, a thin description, a missing handoff and structure gaps", () => {
		const rules = validateSkill(makeSkill({ frontmatter: { description: "Too short." }, body: "This is basically trivially done." })).map(
			(i) => i.rule,
		);

		expect(rules).toEqual(
			expect.arrayContaining([
				"prose.weasel",
				"description.thin",
				"description.handoff",
				"structure.done-when",
				"structure.guardrails",
				"body.thin",
			]),
		);
	});

	it("warns over the per-skill description budget and errors past the spec limit", () => {
		const long = `${"x".repeat(300)} Hands off to \`flow-other\`.`;

		expect(validateSkill(makeSkill({ frontmatter: { description: long } })).map((i) => i.rule)).toContain("description.budget");
		expect(validateSkill(makeSkill({ frontmatter: { description: "x".repeat(1025) } })).map((i) => i.rule)).toContain("description.length");
	});

	it("rejects bad names and oversized bodies", () => {
		const rules = validateSkill(makeSkill({ name: "Bad_Name", frontmatter: { name: "Bad_Name" }, body: "line\n".repeat(600) })).map(
			(i) => i.rule,
		);

		expect(rules).toEqual(expect.arrayContaining(["name.kebab", "body.size"]));
	});
});

describe("supporting files", () => {
	it("loads references, checks links, and scans references for dangling skill names", () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "flow-skill-"));

		fs.mkdirSync(path.join(dir, "references"));
		fs.writeFileSync(path.join(dir, "references", "extra.md"), "Then use `flow-missing`.");
		fs.writeFileSync(
			path.join(dir, "SKILL.md"),
			'---\nname: x\ndescription: "d"\n---\nRead [extra](references/extra.md), [gone](references/gone.md) and [site](https://example.com).',
		);

		const skill = loadSkill(dir);

		expect(skill.supporting).toContain("flow-missing");
		expect(localLinks(skill.body)).toEqual(["references/extra.md", "references/gone.md"]);
		expect(
			validateSkill(skill)
				.filter((i) => i.rule === "link.missing")
				.map((i) => i.message),
		).toEqual(["links to references/gone.md, which does not exist"]);
		expect(validateReferences([makeSkill({ supporting: skill.supporting })]).map((i) => i.message)).toContainEqual(
			expect.stringContaining("flow-missing"),
		);
		fs.rmSync(dir, { recursive: true, force: true });
	});

	it("captures invalid YAML as a parse error", () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "flow-skill-"));

		fs.writeFileSync(path.join(dir, "SKILL.md"), "---\nname: [unclosed\n---\nbody");
		expect(validateSkill(loadSkill(dir)).map((i) => i.rule)).toContain("frontmatter.yaml");
		fs.rmSync(dir, { recursive: true, force: true });
	});
});

describe("references and corpus", () => {
	it("extracts backticked skill names only", () => {
		expect(extractSkillRefs("Use `flow-plan`, then /flow-work and `ls`.")).toEqual(["flow-plan"]);
	});

	it("flags dangling same-family references", () => {
		const issues = validateReferences([makeSkill({ body: "Continue with `flow-nope`." })]);

		expect(issues.map((i) => i.message)).toEqual(expect.arrayContaining([expect.stringContaining("flow-nope")]));
	});

	it("rejects an empty corpus and an oversized description budget", () => {
		expect(validateCorpus([])).toContainEqual(expect.objectContaining({ rule: "corpus.empty", level: "error" }));

		const big = Array.from({ length: 40 }, (_, i) => makeSkill({ name: `flow-${i}`, frontmatter: { description: "y".repeat(250) } }));

		expect(validateCorpus(big)).toContainEqual(expect.objectContaining({ rule: "corpus.description-budget" }));
	});
});
