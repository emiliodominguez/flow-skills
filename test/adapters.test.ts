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
import { clineTarget } from "../src/targets/cline";
import { continueTarget } from "../src/targets/continue";
import { copilotTarget } from "../src/targets/copilot";
import { zedTarget } from "../src/targets/zed";
import { aiderTarget } from "../src/targets/aider";
import { MANAGED_LINE } from "../src/targets/render";
import { BLOCK_START } from "../src/core/install-fs";
import type { InstallContext } from "../src/targets/types";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const allSkills = discoverSkills(path.join(root, "skills"));
const skills = allSkills.slice(0, 2);

/** Build an InstallContext with sensible defaults for tests. */
function ctx(over: Partial<InstallContext> & { dest: string }): InstallContext {
	return { skills, mode: "copy", force: false, dryRun: false, ...over };
}

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
		claudeTarget.install(ctx({ dest, mode: "symlink" }));
		const link = path.join(dest, skills[0]!.name);
		expect(fs.lstatSync(link).isSymbolicLink()).toBe(true);
		claudeTarget.uninstall(ctx({ dest, mode: "symlink" }));
		expect(fs.existsSync(link)).toBe(false);
	});

	it("copies each skill dir in copy mode and marks it", () => {
		const dest = path.join(tmp, "skills");
		claudeTarget.install(ctx({ dest, mode: "copy" }));
		const copied = path.join(dest, skills[0]!.name);
		expect(fs.lstatSync(copied).isSymbolicLink()).toBe(false);
		expect(fs.existsSync(path.join(copied, ".agent-skills"))).toBe(true);
		// A marked copy is recognised as ours and removed on uninstall.
		const actions = claudeTarget.uninstall(ctx({ dest, mode: "copy" }));
		expect(actions[0]!.verb).toBe("remove");
		expect(fs.existsSync(copied)).toBe(false);
	});

	it("F1: uninstall NEVER deletes a directory it didn't create", () => {
		const dest = path.join(tmp, "skills");
		const userDir = path.join(dest, skills[0]!.name);
		fs.mkdirSync(userDir, { recursive: true });
		fs.writeFileSync(path.join(userDir, "SKILL.md"), "the user's own file");
		const actions = claudeTarget.uninstall(ctx({ dest, skills: [skills[0]!] }));
		expect(actions[0]!.verb).toBe("skip");
		expect(fs.readFileSync(path.join(userDir, "SKILL.md"), "utf8")).toBe("the user's own file");
	});

	it("F1: install refuses a non-managed dir without --force, obeys it with --force", () => {
		const dest = path.join(tmp, "skills");
		const userDir = path.join(dest, skills[0]!.name);
		fs.mkdirSync(userDir, { recursive: true });
		fs.writeFileSync(path.join(userDir, "SKILL.md"), "the user's own file");

		const skipped = claudeTarget.install(ctx({ dest, skills: [skills[0]!], mode: "symlink" }));
		expect(skipped[0]!.verb).toBe("skip");
		expect(fs.readFileSync(path.join(userDir, "SKILL.md"), "utf8")).toBe("the user's own file");

		const forced = claudeTarget.install(ctx({ dest, skills: [skills[0]!], mode: "symlink", force: true }));
		// --force backs the user's dir up (never deletes) then symlinks ours in.
		expect(forced.map((a) => a.verb)).toEqual(["backup", "symlink"]);
		expect(fs.lstatSync(userDir).isSymbolicLink()).toBe(true);
		const bak = fs.readdirSync(dest).find((e) => e.startsWith(`${skills[0]!.name}.bak-`));
		expect(bak, "backup dir should exist").toBeTruthy();
		expect(fs.readFileSync(path.join(dest, bak!, "SKILL.md"), "utf8")).toBe("the user's own file");
	});

	it("dry-run touches nothing", () => {
		const dest = path.join(tmp, "skills");
		claudeTarget.install(ctx({ dest, mode: "symlink", dryRun: true }));
		expect(fs.existsSync(dest)).toBe(false);
	});
});

describe("cursor / windsurf (file-per-skill)", () => {
	it("cursor writes a managed .mdc and only removes managed files", () => {
		const dest = path.join(tmp, "rules");
		cursorTarget.install(ctx({ dest }));
		const file = path.join(dest, `${skills[0]!.name}.mdc`);
		expect(fs.readFileSync(file, "utf8")).toContain(MANAGED_LINE);

		const userFile = path.join(dest, "my-own.mdc");
		fs.writeFileSync(userFile, "hand written");
		cursorTarget.uninstall(ctx({ dest }));
		expect(fs.existsSync(file)).toBe(false);
		expect(fs.existsSync(userFile)).toBe(true);
	});

	it("F2: windsurf emits a quoted (valid-YAML) scalar for a colon-containing description", () => {
		const dest = path.join(tmp, "wrules");
		const colonSkill = allSkills.find((s) => s.frontmatter.description.includes(": "));
		expect(colonSkill, "corpus should have a description with a colon").toBeTruthy();
		windsurfTarget.install(ctx({ dest, skills: [colonSkill!] }));
		const content = fs.readFileSync(path.join(dest, `${colonSkill!.name}.md`), "utf8");
		// A JSON.stringify'd value is a valid YAML double-quoted scalar; the old bug emitted it raw.
		expect(content).toContain(`description: ${JSON.stringify(colonSkill!.frontmatter.description)}`);
		expect(content).not.toContain(`description: ${colonSkill!.frontmatter.description}`);
	});
});

describe("codex target (bundle merge)", () => {
	it("preserves surrounding user content", () => {
		const dest = path.join(tmp, "AGENTS.md");
		fs.writeFileSync(dest, "# My project\n\nUser instructions here.\n");
		codexTarget.install(ctx({ dest }));
		const content = fs.readFileSync(dest, "utf8");
		expect(content).toContain("User instructions here.");
		expect(content).toContain(BLOCK_START);
	});

	it("F3: partial install merges; uninstall removes only the named skills", () => {
		const dest = path.join(tmp, "AGENTS.md");
		const [a, b] = [skills[0]!, skills[1]!];

		codexTarget.install(ctx({ dest, skills: [a] }));
		codexTarget.install(ctx({ dest, skills: [b] }));
		let content = fs.readFileSync(dest, "utf8");
		expect(content).toContain(`## ${a.name}`);
		expect(content).toContain(`## ${b.name}`); // b did NOT clobber a
		expect(content.match(new RegExp(`^${BLOCK_START}$`, "gm"))?.length).toBe(1);

		codexTarget.uninstall(ctx({ dest, skills: [a] }));
		content = fs.readFileSync(dest, "utf8");
		expect(content).not.toContain(`## ${a.name}`);
		expect(content).toContain(`## ${b.name}`); // b survived a's removal

		codexTarget.uninstall(ctx({ dest, skills: [b] }));
		expect(fs.existsSync(dest)).toBe(false); // last skill out removes the file we created
	});
});

describe("file-per-skill targets (windsurf / cline / continue)", () => {
	for (const [name, target, ext] of [
		["windsurf", windsurfTarget, "md"],
		["cline", clineTarget, "md"],
		["continue", continueTarget, "md"],
	] as const) {
		it(`${name}: install → generated → uninstall round-trip`, () => {
			const dest = path.join(tmp, name);
			target.install(ctx({ dest, skills: [skills[0]!] }));
			const file = path.join(dest, `${skills[0]!.name}.${ext}`);
			expect(fs.readFileSync(file, "utf8")).toContain(MANAGED_LINE);
			expect(target.status(ctx({ dest, skills: [skills[0]!] }))[0]!.state).toBe("generated");
			target.uninstall(ctx({ dest, skills: [skills[0]!] }));
			expect(fs.existsSync(file)).toBe(false);
		});
	}
});

describe("new bundle targets (copilot / zed / aider)", () => {
	for (const [name, target, filename] of [
		["copilot", copilotTarget, "copilot-instructions.md"],
		["zed", zedTarget, ".rules"],
		["aider", aiderTarget, "CONVENTIONS.md"],
	] as const) {
		it(`${name}: merges into a managed block and removes cleanly`, () => {
			const dest = path.join(tmp, filename);
			target.install(ctx({ dest, skills: [skills[0]!] }));
			const content = fs.readFileSync(dest, "utf8");
			expect(content).toContain(BLOCK_START);
			expect(content).toContain(`## ${skills[0]!.name}`);
			expect(target.status(ctx({ dest, skills: [skills[0]!] }))[0]!.state).toBe("generated");
			expect(target.status(ctx({ dest, skills: [skills[1]!] }))[0]!.state).toBe("missing");
			target.uninstall(ctx({ dest, skills: [skills[0]!] }));
			expect(fs.existsSync(dest)).toBe(false); // sole skill removed → file we created is gone
		});
	}
});

describe("force + backup (never delete unmanaged)", () => {
	it("cursor install backs up an unmanaged file under --force instead of overwriting it", () => {
		const dest = path.join(tmp, "rules");
		const file = path.join(dest, `${skills[0]!.name}.mdc`);
		fs.mkdirSync(dest, { recursive: true });
		fs.writeFileSync(file, "the user's own mdc");

		const skipped = cursorTarget.install(ctx({ dest, skills: [skills[0]!] }));
		expect(skipped[0]!.verb).toBe("skip");
		expect(fs.readFileSync(file, "utf8")).toBe("the user's own mdc");

		const forced = cursorTarget.install(ctx({ dest, skills: [skills[0]!], force: true }));
		expect(forced.map((a) => a.verb)).toEqual(["backup", "write"]);
		const bak = fs.readdirSync(dest).find((e) => e.startsWith(`${skills[0]!.name}.mdc.bak-`));
		expect(bak, "backup file should exist").toBeTruthy();
		expect(fs.readFileSync(path.join(dest, bak!), "utf8")).toBe("the user's own mdc");
	});
});

describe("status (doctor)", () => {
	it("claude: linked, then conflict for a foreign dir, then missing", () => {
		const dir = path.join(tmp, "claude");
		claudeTarget.install(ctx({ dest: dir, mode: "symlink" }));
		expect(claudeTarget.status(ctx({ dest: dir, mode: "symlink" })).every((s) => s.state === "linked")).toBe(true);

		const foreign = path.join(tmp, "foreign");
		fs.mkdirSync(path.join(foreign, skills[0]!.name), { recursive: true });
		expect(claudeTarget.status(ctx({ dest: foreign, skills: [skills[0]!] }))[0]!.state).toBe("conflict");

		expect(claudeTarget.status(ctx({ dest: path.join(tmp, "empty"), skills: [skills[0]!] }))[0]!.state).toBe("missing");
	});

	it("claude copy: copied, then drifted after editing the copy", () => {
		const dir = path.join(tmp, "claude-copy");
		claudeTarget.install(ctx({ dest: dir, skills: [skills[0]!], mode: "copy" }));
		expect(claudeTarget.status(ctx({ dest: dir, skills: [skills[0]!] }))[0]!.state).toBe("copied");
		fs.appendFileSync(path.join(dir, skills[0]!.name, "SKILL.md"), "\ndrift\n");
		expect(claudeTarget.status(ctx({ dest: dir, skills: [skills[0]!] }))[0]!.state).toBe("drifted");
	});

	it("cursor: generated, then drifted after editing the file", () => {
		const dest = path.join(tmp, "rules");
		cursorTarget.install(ctx({ dest, skills: [skills[0]!] }));
		expect(cursorTarget.status(ctx({ dest, skills: [skills[0]!] }))[0]!.state).toBe("generated");
		fs.appendFileSync(path.join(dest, `${skills[0]!.name}.mdc`), "\nDRIFT\n");
		expect(cursorTarget.status(ctx({ dest, skills: [skills[0]!] }))[0]!.state).toBe("drifted");
	});

	it("codex: generated for an installed skill, missing for one that isn't", () => {
		const dest = path.join(tmp, "AGENTS.md");
		codexTarget.install(ctx({ dest, skills: [skills[0]!] }));
		expect(codexTarget.status(ctx({ dest, skills: [skills[0]!] }))[0]!.state).toBe("generated");
		expect(codexTarget.status(ctx({ dest, skills: [skills[1]!] }))[0]!.state).toBe("missing");
	});
});
