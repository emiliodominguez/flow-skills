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

	it("flags a skill missing its description", () => {
		const broken = { name: "x", dir: "", file: "", frontmatter: { name: "x", description: "" }, body: "hello world ".repeat(10), raw: "" };
		const issues = validateSkill(broken);
		expect(issues.some((i) => i.rule === "frontmatter.description")).toBe(true);
	});
});
