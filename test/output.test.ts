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

	it("codex bundles every skill as a recoverable section", () => {
		const dest = path.join(tmp, "AGENTS.md");

		codexTarget.install(ctx({ dest }));
		const content = fs.readFileSync(dest, "utf8");

		for (const skill of skills) {
			expect(content, skill.name).toContain(`<!-- skill:${skill.name} -->`);
			expect(content, skill.name).toContain(`<!-- /skill:${skill.name} -->`);
		}

		// Marker count equals the skill count → no section swallowed another.
		expect(content.match(/<!-- skill:/g)?.length).toBe(skills.length);
	});
});
