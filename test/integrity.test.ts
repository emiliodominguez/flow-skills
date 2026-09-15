import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { installCommand } from "../src/commands/install.js";
import { syncCommand } from "../src/commands/sync.js";
import { doctorCommand } from "../src/commands/doctor.js";
import { validateAll } from "../src/commands/validate.js";
import { validateSkill, type Skill } from "../src/core/skill.js";
import { loadConfig } from "../src/core/config.js";

const repo = path.resolve(import.meta.dirname, "..");
const loader = import.meta.resolve("tsx");
let directory: string;
let previousCwd: string;

beforeEach(function () {
	directory = fs.mkdtempSync(path.join(os.tmpdir(), "skills-integrity-"));
	previousCwd = process.cwd();
	fs.writeFileSync(path.join(directory, "agent-skills.config.json"), "{}");
	fs.mkdirSync(path.join(directory, "skills"));
	process.chdir(directory);
	vi.spyOn(console, "log").mockImplementation(function () {});
	vi.spyOn(console, "error").mockImplementation(function () {});
});

afterEach(function () {
	process.chdir(previousCwd);
	fs.rmSync(directory, { recursive: true, force: true });
	vi.restoreAllMocks();
	process.exitCode = 0;
});

describe("verification cannot succeed without a target", function () {
	it("rejects an empty corpus", function () {
		expect(validateAll(path.join(directory, "skills")).issues).toContainEqual(expect.objectContaining({ rule: "corpus.empty", level: "error" }));
	});

	it.each(["install", "sync", "doctor"])("reports an unknown %s target as failure", function (command) {
		if (command === "install") installCommand("install", [], { target: ["cluade"], scope: "project" });

		if (command === "sync") syncCommand({ target: ["cluade"], scope: "project" });

		if (command === "doctor") doctorCommand({ target: ["cluade"], scope: "project", json: true });

		expect(process.exitCode).toBe(1);
		expect(fs.readdirSync(directory).sort()).toEqual(["agent-skills.config.json", "skills"]);

		if (command === "doctor") {
			const output = vi.mocked(console.log).mock.calls.flat().join("\n");

			expect(JSON.parse(output)).toMatchObject({ healthy: false, problems: 1 });
		}
	});

	it("treats standard name and description bounds as errors", function () {
		const name = "a".repeat(65);
		const skill: Skill = {
			name,
			dir: "",
			file: "",
			frontmatter: { name, description: "a".repeat(1025) },
			body: "## Rules\nRead evidence.\n## Done when\nThe result is inspected.",
			raw: "",
		};

		expect(
			validateSkill(skill)
				.filter(function (issue) {
					return issue.level === "error";
				})
				.map(function (issue) {
					return issue.rule;
				}),
		).toEqual(expect.arrayContaining(["name.length", "description.length"]));
	});

	it("continues installing valid targets after an enabled unregistered adapter fails", function () {
		fs.writeFileSync(path.join(directory, "agent-skills.config.json"), JSON.stringify({ targets: { typo: { enabled: true } } }));
		const source = path.join(directory, "skills", "example");

		fs.mkdirSync(source);
		fs.writeFileSync(path.join(source, "SKILL.md"), "---\nname: example\ndescription: Example.\n---\n# Example\n");
		installCommand("install", [], { target: ["typo", "cursor"], scope: "project" });
		expect(process.exitCode).toBe(1);
		expect(fs.readFileSync(path.join(directory, ".cursor/rules/example.mdc"), "utf8")).toContain("# Example");
	});

	it("skips disabled inherited defaults but rejects an explicit disabled target", function () {
		fs.writeFileSync(path.join(directory, "agent-skills.config.json"), JSON.stringify({ targets: { codex: { enabled: false } } }));
		installCommand("install", [], { scope: "project", dryRun: true });
		expect(process.exitCode ?? 0).toBe(0);
		installCommand("install", [], { target: ["codex"], scope: "project", dryRun: true });
		expect(process.exitCode).toBe(1);
	});

	it("uses discoverable rule locations in both built-in and committed defaults", function () {
		for (const root of [directory, repo]) {
			const { targets } = loadConfig(root);

			expect(targets.cursor).toMatchObject({ userPath: ".cursor/rules", projectPath: ".cursor/rules" });
			expect(targets.windsurf).toMatchObject({ userPath: ".devin/rules", projectPath: ".devin/rules" });
			expect(targets.cline).toMatchObject({ userPath: "~/.cline/rules", projectPath: ".cline/rules" });
		}
	});
});

describe("generated documentation checks", function () {
	function generate(check: boolean) {
		return spawnSync(process.execPath, ["--import", loader, path.join(repo, "scripts/gen-skill-docs.ts"), ...(check ? ["--check"] : [])], {
			cwd: directory,
			encoding: "utf8",
			timeout: 15_000,
		});
	}

	it("detects drift and obsolete pages without rewriting them", function () {
		const source = path.join(directory, "skills", "example");

		fs.mkdirSync(source);
		fs.writeFileSync(path.join(source, "SKILL.md"), "---\nname: example\ndescription: Example skill.\n---\n# Example\n");
		expect(generate(false).status).toBe(0);
		expect(generate(true).status).toBe(0);

		const catalog = path.join(directory, "docs", "SKILLS.md");
		const obsolete = path.join(directory, "docs", "skills", "removed.md");

		fs.writeFileSync(catalog, "out of date\n");
		fs.writeFileSync(obsolete, "old generated page\n");
		expect(generate(true).status).toBe(1);
		expect(fs.readFileSync(catalog, "utf8")).toBe("out of date\n");
		expect(fs.existsSync(obsolete)).toBe(true);
		expect(generate(false).status).toBe(0);
		expect(fs.existsSync(obsolete)).toBe(false);
		expect(generate(true).status).toBe(0);
	});

	it.skipIf(process.platform === "win32").each(["file", "directory"])(
		"refuses a symlinked output %s without altering its referent",
		function (kind) {
			const source = path.join(directory, "skills", "example");

			fs.mkdirSync(source);
			fs.writeFileSync(path.join(source, "SKILL.md"), "---\nname: example\ndescription: Example.\n---\n# Example\n");
			expect(generate(false).status).toBe(0);
			const external = path.join(directory, "handwritten");

			fs.mkdirSync(external);
			const handwritten = path.join(external, "notes.md");

			fs.writeFileSync(handwritten, "Keep this content.\n");
			const output = path.join(directory, "docs", "skills", ...(kind === "file" ? ["example.md"] : []));

			fs.rmSync(output, { recursive: true });
			fs.symlinkSync(kind === "file" ? handwritten : external, output);
			expect(generate(true).status).toBe(1);
			expect(generate(false).status).toBe(1);
			expect(fs.readFileSync(handwritten, "utf8")).toBe("Keep this content.\n");
			expect(fs.readdirSync(external)).toEqual(["notes.md"]);
		},
	);
});
