import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { newCommand } from "../src/commands/new";
import { validateCommand } from "../src/commands/validate";
import { completionCommand } from "../src/commands/completion";
import { listCommand } from "../src/commands/list";

const spies: { mockRestore: () => void }[] = [];
let logSpy: ReturnType<typeof vi.spyOn>;

function silence() {
	logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
	spies.push(logSpy);
	spies.push(vi.spyOn(console, "error").mockImplementation(() => {}));
}

function restore() {
	spies.forEach((s) => s.mockRestore());
	spies.length = 0;
	process.exitCode = 0;
}

describe("newCommand", () => {
	let tmp: string;
	let cwd: string;

	beforeEach(() => {
		tmp = fs.mkdtempSync(path.join(os.tmpdir(), "agent-skills-new-"));
		// A minimal repo so findRepoRoot lands here: config marker + skills dir + template.
		fs.writeFileSync(path.join(tmp, "agent-skills.config.json"), "{}");
		fs.mkdirSync(path.join(tmp, "skills"));
		fs.mkdirSync(path.join(tmp, "templates"));
		fs.writeFileSync(path.join(tmp, "templates", "SKILL.md.tmpl"), "---\nname: {{name}}\ndescription: {{description}}\n---\n\n# {{title}}\n");
		cwd = process.cwd();
		process.chdir(tmp);
		silence();
	});

	afterEach(() => {
		process.chdir(cwd);
		restore();
		fs.rmSync(tmp, { recursive: true, force: true });
	});

	it("scaffolds a skill from the template, titleizing the name and using the given description", () => {
		newCommand("my-new-skill", { description: "Does a thing" });

		const content = fs.readFileSync(path.join(tmp, "skills", "my-new-skill", "SKILL.md"), "utf8");

		expect(content).toContain("name: my-new-skill");
		expect(content).toContain("description: Does a thing");
		expect(content).toContain("# My New Skill");
		expect(process.exitCode).toBeFalsy();
	});

	it("falls back to a placeholder description when none is given", () => {
		newCommand("plain-skill", {});

		const content = fs.readFileSync(path.join(tmp, "skills", "plain-skill", "SKILL.md"), "utf8");

		expect(content).toContain("what it does");
	});

	it("rejects a non-kebab name and exits non-zero without writing", () => {
		newCommand("Bad Name", {});

		expect(process.exitCode).toBe(1);
		expect(fs.existsSync(path.join(tmp, "skills", "Bad Name"))).toBe(false);
	});

	it("refuses to overwrite an existing skill", () => {
		newCommand("dup-skill", { description: "first" });
		process.exitCode = 0;
		newCommand("dup-skill", { description: "second" });

		expect(process.exitCode).toBe(1);
	});
});

describe("validateCommand", () => {
	// Runs against the real repo (cwd = repo root), which is clean.
	beforeEach(silence);
	afterEach(restore);

	it("passes on the clean corpus and reports a non-zero skill count", () => {
		validateCommand({});

		const output = logSpy.mock.calls.flat().join("\n");

		// Guard against a vacuous pass: it must have actually checked skills.
		expect(output).toMatch(/Checked [1-9]\d* skills/);
		expect(process.exitCode).toBeFalsy();
	});

	it("accepts --strict on the clean corpus", () => {
		validateCommand({ strict: true });

		expect(process.exitCode).toBeFalsy();
	});
});

describe("listCommand --json", () => {
	beforeEach(silence);
	afterEach(restore);

	it("emits parseable JSON with skills, targets, and profiles", () => {
		listCommand({ json: true });

		const data = JSON.parse(logSpy.mock.calls.flat().join("\n"));

		expect(data.skills.length).toBeGreaterThanOrEqual(16);
		expect(data.targets.length).toBeGreaterThanOrEqual(9);
		expect(data.skills[0]).toHaveProperty("description");
	});
});

describe("completionCommand", () => {
	beforeEach(silence);
	afterEach(restore);

	it("emits a bash completion script naming the targets", () => {
		completionCommand("bash");

		const out = logSpy.mock.calls.flat().join("\n");

		expect(out).toContain("complete -F _agent_skills agent-skills");
		expect(out).toContain("claude");
	});

	it("emits a zsh script", () => {
		completionCommand("zsh");

		expect(logSpy.mock.calls.flat().join("\n")).toContain("#compdef agent-skills");
	});

	it("errors and exits non-zero on an unknown shell", () => {
		completionCommand("powershell");

		expect(process.exitCode).toBe(1);
	});
});
