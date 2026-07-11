import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { discoverSkills } from "../src/core/registry";
import { claudeTarget } from "../src/targets/claude";
import { cursorTarget } from "../src/targets/cursor";
import { codexTarget } from "../src/targets/codex";
import { windsurfTarget } from "../src/targets/windsurf";
import { MANAGED_LINE } from "../src/targets/render";
import { BLOCK_START, BLOCK_END } from "../src/core/install-fs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skills = discoverSkills(path.join(root, "skills")).slice(0, 2);

let tmp: string;
beforeEach(() => {
	tmp = fs.mkdtempSync(path.join(os.tmpdir(), "agent-skills-test-"));
});
afterEach(() => {
	fs.rmSync(tmp, { recursive: true, force: true });
});

describe("claude target", () => {
	it("symlinks each skill dir and uninstalls cleanly", () => {
		const dest = path.join(tmp, "skills");
		claudeTarget.install({ skills, dest, mode: "symlink", dryRun: false });
		const link = path.join(dest, skills[0]!.name);
		expect(fs.lstatSync(link).isSymbolicLink()).toBe(true);
		expect(fs.existsSync(path.join(link, "SKILL.md"))).toBe(true);

		claudeTarget.uninstall({ skills, dest, mode: "symlink", dryRun: false });
		expect(fs.existsSync(link)).toBe(false);
	});

	it("copies each skill dir in copy mode", () => {
		const dest = path.join(tmp, "skills");
		claudeTarget.install({ skills, dest, mode: "copy", dryRun: false });
		const copied = path.join(dest, skills[0]!.name, "SKILL.md");
		expect(fs.lstatSync(path.join(dest, skills[0]!.name)).isSymbolicLink()).toBe(false);
		expect(fs.readFileSync(copied, "utf8")).toContain("name:");
	});

	it("dry-run touches nothing", () => {
		const dest = path.join(tmp, "skills");
		claudeTarget.install({ skills, dest, mode: "symlink", dryRun: true });
		expect(fs.existsSync(dest)).toBe(false);
	});
});

describe("cursor target", () => {
	it("writes a managed .mdc per skill and only removes managed files", () => {
		const dest = path.join(tmp, "rules");
		cursorTarget.install({ skills, dest, mode: "copy", dryRun: false });
		const file = path.join(dest, `${skills[0]!.name}.mdc`);
		const content = fs.readFileSync(file, "utf8");
		expect(content).toContain("description:");
		expect(content).toContain(MANAGED_LINE);

		// A user's own file of the same shape must survive uninstall.
		const userFile = path.join(dest, "my-own.mdc");
		fs.writeFileSync(userFile, "hand written");
		cursorTarget.uninstall({ skills, dest, mode: "copy", dryRun: false });
		expect(fs.existsSync(file)).toBe(false);
		expect(fs.existsSync(userFile)).toBe(true);
	});
});

describe("windsurf target", () => {
	it("writes a managed .md per skill", () => {
		const dest = path.join(tmp, "wrules");
		windsurfTarget.install({ skills, dest, mode: "copy", dryRun: false });
		expect(fs.readFileSync(path.join(dest, `${skills[0]!.name}.md`), "utf8")).toContain(MANAGED_LINE);
	});
});

describe("codex target", () => {
	it("bundles into a managed block, preserving user content, idempotently", () => {
		const dest = path.join(tmp, "AGENTS.md");
		fs.writeFileSync(dest, "# My project\n\nUser instructions here.\n");

		codexTarget.install({ skills, dest, mode: "copy", dryRun: false });
		let content = fs.readFileSync(dest, "utf8");
		expect(content).toContain("User instructions here.");
		expect(content).toContain(BLOCK_START);
		expect(content).toContain(BLOCK_END);
		expect(content).toContain(`## ${skills[0]!.name}`);

		// Re-install stays single-block (idempotent).
		codexTarget.install({ skills, dest, mode: "copy", dryRun: false });
		content = fs.readFileSync(dest, "utf8");
		expect(content.match(new RegExp(BLOCK_START, "g"))?.length).toBe(1);

		// Uninstall removes the block, keeps user content.
		codexTarget.uninstall({ skills, dest, mode: "copy", dryRun: false });
		content = fs.readFileSync(dest, "utf8");
		expect(content).toContain("User instructions here.");
		expect(content).not.toContain(BLOCK_START);
	});
});
