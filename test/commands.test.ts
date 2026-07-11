import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { listCommand } from "../src/commands/list";
import { syncCommand } from "../src/commands/sync";
import { cursorTarget } from "../src/targets/cursor";
import { discoverSkills } from "../src/core/registry";
import { findRepoRoot } from "../src/core/config";

const repo = findRepoRoot();
const skills = discoverSkills(path.join(repo, "skills"));

// These commands print to stdout and read the real repo/config; silence output and
// run them against a throwaway cwd so nothing real is touched.
let logSpy: ReturnType<typeof vi.spyOn>;
let cwd: string;
let tmp: string;

beforeEach(() => {
	logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
	cwd = process.cwd();
	tmp = fs.mkdtempSync(path.join(os.tmpdir(), "agent-skills-cmd-"));
	process.chdir(tmp);
});
afterEach(() => {
	process.chdir(cwd);
	fs.rmSync(tmp, { recursive: true, force: true });
	logSpy.mockRestore();
	process.exitCode = 0;
});

describe("list", () => {
	it("lists skills, and with flags the targets and profiles, without throwing", () => {
		expect(() => listCommand({})).not.toThrow();
		expect(() => listCommand({ targets: true, profiles: true })).not.toThrow();
		// Something was printed (the skills heading at minimum).
		expect(logSpy.mock.calls.flat().join("\n")).toContain(skills[0]!.name);
	});
});

describe("sync", () => {
	it("re-installs only what is currently installed at a target", () => {
		// Install one skill into project-scope cursor rules under the throwaway cwd.
		const dest = path.join(tmp, ".cursor", "rules");
		cursorTarget.install({ skills: [skills[0]!], dest, mode: "copy", force: false, dryRun: false });
		const file = path.join(dest, `${skills[0]!.name}.mdc`);
		const before = fs.readFileSync(file, "utf8");

		syncCommand({ target: ["cursor"], scope: "project" });

		// The installed skill was re-generated (same content); no other skill appeared.
		expect(fs.readFileSync(file, "utf8")).toBe(before);
		expect(fs.readdirSync(dest)).toEqual([`${skills[0]!.name}.mdc`]);
	});

	it("dry-run reports 'nothing installed' when a target is empty", () => {
		expect(() => syncCommand({ target: ["cursor"], scope: "project", dryRun: true })).not.toThrow();
		expect(fs.existsSync(path.join(tmp, ".cursor"))).toBe(false);
	});
});
