import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { newCommand } from "../src/commands/new";
import { validateCommand } from "../src/commands/validate";
import { installSource, listCommand, summarizeSkillDescription } from "../src/commands/list";
import { validateDistribution } from "../src/core/distribution";
import { findRepoRoot, loadProfiles } from "../src/core/repo";
import { buildProgram } from "../src/cli";

const repo = path.resolve(import.meta.dirname, "..");
const spies: { mockRestore: () => void }[] = [];
let logSpy: ReturnType<typeof vi.spyOn>;

/** Silence console output and keep a handle on stdout for assertions. */
function silence() {
	logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
	spies.push(logSpy);
	spies.push(vi.spyOn(console, "error").mockImplementation(() => {}));
}

/** Restore console and reset the exit code between tests. */
function restore() {
	spies.forEach((s) => s.mockRestore());
	spies.length = 0;
	process.exitCode = 0;
}

/**
 * Create a minimal skills repo in a temp dir.
 *
 * @returns The temp repo path.
 */
function tempRepo(): string {
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "flow-skills-"));

	fs.writeFileSync(path.join(tmp, "package.json"), JSON.stringify({ version: "1.0.0" }));
	fs.mkdirSync(path.join(tmp, "skills"));
	fs.mkdirSync(path.join(tmp, "templates"));
	fs.writeFileSync(path.join(tmp, "templates", "SKILL.md.tmpl"), "---\nname: {{name}}\ndescription: {{description}}\n---\n\n# {{title}}\n");

	return tmp;
}

describe("newCommand", () => {
	let tmp: string;
	let cwd: string;

	beforeEach(() => {
		tmp = tempRepo();
		cwd = process.cwd();
		process.chdir(tmp);
		silence();
	});

	afterEach(() => {
		process.chdir(cwd);
		restore();
		fs.rmSync(tmp, { recursive: true, force: true });
	});

	it("scaffolds a skill from the template with a portable description", () => {
		newCommand("flow-new-skill", { description: "Does a thing: carefully" });

		const content = fs.readFileSync(path.join(tmp, "skills", "flow-new-skill", "SKILL.md"), "utf8");

		expect(content).toContain("name: flow-new-skill");
		expect(content).toContain('description: "Does a thing: carefully"');
		expect(content).toContain("# Flow New Skill");
		expect(process.exitCode).toBeFalsy();
	});

	it("falls back to a placeholder description", () => {
		newCommand("flow-plain", {});

		expect(fs.readFileSync(path.join(tmp, "skills", "flow-plain", "SKILL.md"), "utf8")).toContain("What it does");
	});

	it("rejects a non-kebab name and refuses to overwrite", () => {
		newCommand("Bad Name", {});
		expect(process.exitCode).toBe(1);
		process.exitCode = 0;
		newCommand("flow-dup", {});
		newCommand("flow-dup", {});
		expect(process.exitCode).toBe(1);
	});
});

describe("repo helpers", () => {
	it("finds the root from a nested directory and fails outside a repo", () => {
		expect(findRepoRoot(path.join(repo, "skills", "flow-plan"))).toBe(repo);
		expect(() => findRepoRoot(os.tmpdir())).toThrow(/No skills repository/);
	});

	it("loads profiles and treats a missing file as none", () => {
		expect(Object.keys(loadProfiles(repo))).toContain("core");
		expect(loadProfiles(os.tmpdir())).toEqual({});
	});
});

describe("validateDistribution", () => {
	let tmp: string;

	beforeEach(() => {
		tmp = tempRepo();
	});

	afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

	it("passes the manifests of the real repository", () => {
		expect(validateDistribution(repo, []).filter((i) => i.rule.startsWith("plugin") || i.rule.startsWith("marketplace"))).toEqual([]);
	});

	it("flags unknown profile members, version drift and a mismatched marketplace", () => {
		fs.writeFileSync(path.join(tmp, "profiles.json"), JSON.stringify({ profiles: { core: ["flow-ghost"] } }));
		fs.mkdirSync(path.join(tmp, ".claude-plugin"));
		fs.writeFileSync(path.join(tmp, ".claude-plugin", "plugin.json"), JSON.stringify({ name: "p", version: "0.9.0" }));
		fs.writeFileSync(path.join(tmp, ".claude-plugin", "marketplace.json"), JSON.stringify({ plugins: [{ name: "p", source: "./other" }] }));

		expect(validateDistribution(tmp, []).map((i) => i.rule)).toEqual(["profile.unknown-skill", "plugin.version", "marketplace.source"]);

		fs.writeFileSync(path.join(tmp, ".claude-plugin", "marketplace.json"), JSON.stringify({ plugins: [] }));
		expect(validateDistribution(tmp, []).map((i) => i.rule)).toContain("marketplace.plugin");
	});
});

describe("validateCommand", () => {
	beforeEach(silence);
	afterEach(restore);

	it("passes strictly on the clean corpus and reports a non-zero skill count", () => {
		validateCommand({ strict: true });

		expect(logSpy.mock.calls.flat().join("\n")).toMatch(/Checked [1-9]\d* skills/);
		expect(process.exitCode).toBeFalsy();
	});
});

describe("listCommand", () => {
	beforeEach(silence);
	afterEach(restore);

	it("emits parseable JSON with skills and profiles", () => {
		listCommand({ json: true });

		const data = JSON.parse(logSpy.mock.calls.flat().join("\n"));

		expect(data.skills.length).toBeGreaterThanOrEqual(16);
		expect(data.profiles.core).toContain("flow-plan");
	});

	it("prints profiles as npx skills commands", () => {
		listCommand({ profiles: true });

		expect(logSpy.mock.calls.flat().join("\n")).toContain("npx skills add emiliodominguez/flow-skills --skill flow-plan");
	});

	it("summarizes descriptions and derives the install source", () => {
		expect(summarizeSkillDescription("Deploy safely. Longer details")).toBe("Deploy safely");
		expect(installSource(repo)).toBe("emiliodominguez/flow-skills");
		expect(installSource(os.tmpdir())).toBe(".");
	});
});

describe("buildProgram", () => {
	it("registers only authoring commands", () => {
		expect(
			buildProgram()
				.commands.map((c) => c.name())
				.sort(),
		).toEqual(["list", "new", "validate"]);
	});
});
