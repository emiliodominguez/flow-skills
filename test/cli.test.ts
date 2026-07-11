import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { installCommand } from "../src/commands/install";
import { doctorCommand } from "../src/commands/doctor";

// Run from a temp cwd so `findRepoRoot` falls back to the package (its skills) and
// project-scope installs land in the temp dir instead of the real config dirs.
let tmp: string;
let cwd: string;
const spies: { mockRestore: () => void }[] = [];

beforeEach(() => {
	tmp = fs.mkdtempSync(path.join(os.tmpdir(), "agent-skills-cli-"));
	cwd = process.cwd();
	process.chdir(tmp);
	spies.push(vi.spyOn(console, "log").mockImplementation(() => {}));
	spies.push(vi.spyOn(console, "error").mockImplementation(() => {}));
});
afterEach(() => {
	process.chdir(cwd);
	spies.forEach((s) => s.mockRestore());
	spies.length = 0;
	// Commands under test set process.exitCode; reset it so it can't fail the vitest run.
	process.exitCode = 0;
	fs.rmSync(tmp, { recursive: true, force: true });
});

describe("installCommand (project scope)", () => {
	it("installs all skills into the claude project dir as symlinks, then uninstalls", () => {
		installCommand("install", [], { target: ["claude"], scope: "project" });
		const dir = path.join(tmp, ".claude", "skills");
		const entries = fs.readdirSync(dir);
		expect(entries.length).toBeGreaterThanOrEqual(16);
		expect(fs.lstatSync(path.join(dir, entries[0]!)).isSymbolicLink()).toBe(true);

		installCommand("uninstall", [], { target: ["claude"], scope: "project" });
		expect(fs.existsSync(dir) ? fs.readdirSync(dir).length : 0).toBe(0);
	});

	it("installs a single skill to cursor as a generated .mdc", () => {
		installCommand("install", ["ed-plan"], { target: ["cursor"], scope: "project" });
		expect(fs.existsSync(path.join(tmp, ".cursor", "rules", "ed-plan.mdc"))).toBe(true);
	});

	it("copy mode drops a marked copy; codex bundles; dry-run changes nothing", () => {
		installCommand("install", ["ed-plan"], { target: ["claude"], scope: "project", copy: true });
		expect(fs.existsSync(path.join(tmp, ".claude", "skills", "ed-plan", ".agent-skills"))).toBe(true);

		installCommand("install", ["ed-work"], { target: ["codex"], scope: "project" });
		expect(fs.readFileSync(path.join(tmp, "AGENTS.md"), "utf8")).toContain("<!-- skill:ed-work -->");

		installCommand("install", ["ed-review"], { target: ["windsurf"], scope: "project", dryRun: true });
		expect(fs.existsSync(path.join(tmp, ".windsurf"))).toBe(false);
	});

	it("doctor reports healthy right after a project install, drift after an edit", () => {
		installCommand("install", ["ed-plan"], { target: ["cursor"], scope: "project" });
		process.exitCode = 0;
		doctorCommand({ target: ["cursor"], scope: "project" });
		expect(process.exitCode).toBeFalsy(); // healthy → no problem exit code

		fs.appendFileSync(path.join(tmp, ".cursor", "rules", "ed-plan.mdc"), "\nDRIFT\n");
		doctorCommand({ target: ["cursor"], scope: "project" });
		expect(process.exitCode).toBe(1); // drift flagged
	});
});
