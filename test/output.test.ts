import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { load as loadYaml } from "js-yaml";
import { discoverSkills } from "../src/core/registry";
import { cursorTarget } from "../src/targets/cursor";
import { windsurfTarget } from "../src/targets/windsurf";
import { codexTarget } from "../src/targets/codex";
import type { InstallContext } from "../src/targets/types";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skills = discoverSkills(path.join(root, "skills"));

/** Extract and parse the leading `---` frontmatter of a generated file with a real YAML parser. */
function parseYamlFrontmatter(content: string): Record<string, unknown> {
	const match = /^---\n([\s\S]*?)\n---/.exec(content);

	expect(match, "generated file should have frontmatter").toBeTruthy();

	return loadYaml(match![1]!) as Record<string, unknown>;
}

let tmp: string;

beforeEach(() => {
	tmp = fs.mkdtempSync(path.join(os.tmpdir(), "agent-skills-out-"));
});
afterEach(() => {
	fs.rmSync(tmp, { recursive: true, force: true });
});

describe("generated output is valid for the whole corpus", () => {
	function ctx(over: Partial<InstallContext> & { dest: string }): InstallContext {
		return { skills, mode: "copy", force: false, dryRun: false, ...over };
	}

	it("every cursor .mdc has valid YAML frontmatter whose description round-trips", () => {
		const dest = path.join(tmp, "cursor");

		cursorTarget.install(ctx({ dest }));

		for (const skill of skills) {
			const content = fs.readFileSync(path.join(dest, `${skill.name}.mdc`), "utf8");
			const fm = parseYamlFrontmatter(content);

			expect(fm.description, skill.name).toBe(skill.frontmatter.description);
			expect(fm.alwaysApply).toBe(false);
		}
	});

	it("every windsurf .md has valid YAML frontmatter whose description round-trips", () => {
		const dest = path.join(tmp, "windsurf");

		windsurfTarget.install(ctx({ dest }));

		for (const skill of skills) {
			const content = fs.readFileSync(path.join(dest, `${skill.name}.md`), "utf8");
			const fm = parseYamlFrontmatter(content);

			expect(fm.description, skill.name).toBe(skill.frontmatter.description);
			expect(fm.trigger).toBe("model_decision");
		}
	});

	it("codex installs every skill as a valid native SKILL.md", () => {
		const dest = path.join(tmp, ".agents", "skills");

		codexTarget.install(ctx({ dest }));

		for (const skill of skills) {
			const content = fs.readFileSync(path.join(dest, skill.name, "SKILL.md"), "utf8");
			const fm = parseYamlFrontmatter(content);

			expect(fm.name, skill.name).toBe(skill.name);
			expect(fm.description, skill.name).toBe(skill.frontmatter.description);
		}
	});
});
