import { describe, it, expect } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { discoverSkills } from "../src/core/registry";
import { validateReferences, validateSkill } from "../src/core/skill";
import { validateAll } from "../src/commands/validate";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skillsDir = path.join(root, "skills");

describe("skills corpus", () => {
	const skills = discoverSkills(skillsDir);

	it("discovers the skill set", () => {
		expect(skills.length).toBeGreaterThanOrEqual(16);
	});

	it("every skill's frontmatter name matches its directory", () => {
		for (const skill of skills) expect(skill.frontmatter.name, skill.name).toBe(skill.name);
	});

	it("has zero validation ERRORS across the corpus", () => {
		const errors = validateAll(skillsDir).issues.filter((i) => i.level === "error");

		expect(errors, JSON.stringify(errors, null, 2)).toEqual([]);
	});

	it("has no dangling cross-references", () => {
		const dangling = validateReferences(skills).filter((i) => i.rule === "reference.dangling");

		expect(dangling).toEqual([]);
	});

	it("validates Claude and Codex reference syntax", () => {
		const known = {
			name: "ed-known",
			dir: "",
			file: "",
			frontmatter: { name: "ed-known", description: "Use /ed-known or $ed-known." },
			body: "Continue with /ed-missing-claude and $ed-missing-codex.\n\n## Done when\n- done\n\n## Rules\n- safe",
			raw: "",
		};
		const rules = validateReferences([known]).map((issue) => issue.message);

		expect(rules).toEqual(expect.arrayContaining([expect.stringContaining("ed-missing-claude"), expect.stringContaining("ed-missing-codex")]));
	});

	it("flags a skill missing its description", () => {
		const broken = { name: "x", dir: "", file: "", frontmatter: { name: "x", description: "" }, body: "hello world ".repeat(10), raw: "" };
		const issues = validateSkill(broken);

		expect(issues.some((i) => i.rule === "frontmatter.description")).toBe(true);
	});

	it("reports non-string frontmatter fields without crashing validation", () => {
		const broken = {
			name: "x",
			dir: "",
			file: "",
			frontmatter: { name: 42, description: ["wrong"] },
			body: "hello world ".repeat(10),
			raw: "",
		};
		const issues = validateSkill(broken as never);

		expect(issues.map((issue) => issue.message)).toEqual(expect.arrayContaining(["`name` must be a string", "`description` must be a string"]));
	});

	it("warns on filler words, a too-thin description, and missing Claude/Codex self-triggers", () => {
		const skill = {
			name: "ed-demo",
			dir: "",
			file: "",
			frontmatter: { name: "ed-demo", description: "Too short." },
			body: "Do it. This is basically trivially done.\n\n## Done when\n- done\n\n## Anti-patterns\n- none",
			raw: "",
		};
		const rules = validateSkill(skill).map((i) => i.rule);

		expect(rules).toContain("prose.weasel");
		expect(rules).toContain("description.thin");
		expect(rules).toContain("description.trigger.claude");
		expect(rules).toContain("description.trigger.codex");
	});
});
