import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { listCommand } from "../src/commands/list";
import { syncCommand } from "../src/commands/sync";
import { resolveSelection } from "../src/commands/install";
import type { Config } from "../src/core/config";
import { cursorTarget } from "../src/targets/cursor";
import { claudeTarget } from "../src/targets/claude";
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

	it("preserves an explicitly copied native install", () => {
		const dest = path.join(tmp, ".claude", "skills");

		claudeTarget.install({ skills: [skills[0]!], dest, mode: "copy", force: false, dryRun: false });
		syncCommand({ target: ["claude"], scope: "project" });

		expect(fs.lstatSync(path.join(dest, skills[0]!.name)).isSymbolicLink()).toBe(false);
		expect(fs.existsSync(path.join(dest, skills[0]!.name, ".agent-skills"))).toBe(true);
	});

	it("preserves the recorded mode while repairing drifted native installs", () => {
		const dest = path.join(tmp, ".claude", "skills");
		const copied = path.join(dest, skills[0]!.name);
		const linked = path.join(dest, skills[1]!.name);

		claudeTarget.install({ skills: [skills[0]!], dest, mode: "copy", force: false, dryRun: false });
		fs.writeFileSync(path.join(copied, "drift.txt"), "stale");
		claudeTarget.install({ skills: [skills[1]!], dest, mode: "symlink", force: false, dryRun: false });
		const oldSource = path.join(tmp, "moved-checkout", skills[1]!.name);
		const manifestFile = path.join(dest, ".agent-skills-manifest.json");
		const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8")) as {
			skills: Record<string, { source: string; mode: "symlink" | "copy" }>;
		};

		manifest.skills[skills[1]!.name]!.source = oldSource;
		fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + "\n");
		fs.unlinkSync(linked);
		fs.symlinkSync(oldSource, linked, "dir");

		syncCommand({ target: ["claude"], scope: "project" });

		expect(fs.lstatSync(copied).isSymbolicLink()).toBe(false);
		expect(fs.existsSync(path.join(copied, "drift.txt"))).toBe(false);
		expect(fs.lstatSync(linked).isSymbolicLink()).toBe(true);
		expect(fs.realpathSync(linked)).toBe(fs.realpathSync(skills[1]!.dir));
	});
});

describe("resolveSelection (profiles)", () => {
	const config = { profiles: { wip: [], frontend: ["ed-styles", "ed-work"] } } as unknown as Config;

	it("an EMPTY profile throws — it must not fall through to 'all skills' (uninstall would remove everything)", () => {
		expect(() => resolveSelection([], ["wip"], config)).toThrow(/lists no skills/);
	});
	it("an unknown profile throws", () => {
		expect(() => resolveSelection([], ["nope"], config)).toThrow(/Unknown profile/);
	});
	it("a real profile resolves to its union; explicit skill args win over --profile", () => {
		expect(resolveSelection([], ["frontend"], config)).toEqual(["ed-styles", "ed-work"]);
		expect(resolveSelection(["ed-plan"], ["frontend"], config)).toEqual(["ed-plan"]);
	});
	it("no profile and no skills → [] (means all)", () => {
		expect(resolveSelection([], undefined, config)).toEqual([]);
	});
});
