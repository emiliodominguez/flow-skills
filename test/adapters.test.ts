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
import { BLOCK_START, writeManagedBlock } from "../src/core/install-fs";
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

	it("does not trust a forged or non-file copy marker", () => {
		const dest = path.join(tmp, "skills");
		const userDir = path.join(dest, skills[0]!.name);

		fs.mkdirSync(path.join(userDir, ".agent-skills"), { recursive: true });
		fs.writeFileSync(path.join(userDir, "SKILL.md"), "the user's own file");
		const actions = claudeTarget.uninstall(ctx({ dest, skills: [skills[0]!] }));

		expect(actions[0]!.verb).toBe("skip");
		expect(fs.existsSync(userDir)).toBe(true);
	});

	it("does not follow a symlinked copy marker", () => {
		const dest = path.join(tmp, "skills");
		const userDir = path.join(dest, skills[0]!.name);
		const genuineTextElsewhere = path.join(tmp, "marker-text");

		fs.mkdirSync(userDir, { recursive: true });
		fs.writeFileSync(genuineTextElsewhere, MANAGED_LINE + "\n");
		fs.symlinkSync(genuineTextElsewhere, path.join(userDir, ".agent-skills"));
		fs.writeFileSync(path.join(userDir, "user.txt"), "keep me");

		const actions = claudeTarget.uninstall(ctx({ dest, skills: [skills[0]!] }));

		expect(actions[0]!.verb).toBe("skip");
		expect(fs.readFileSync(path.join(userDir, "user.txt"), "utf8")).toBe("keep me");
	});

	it("rejects a symlinked ownership manifest without mutating its target", () => {
		const dest = path.join(tmp, "skills");
		const externalManifest = path.join(tmp, "external-manifest.json");
		const content = '{"managedBy":"agent-skills","version":1,"skills":{}}\n';

		fs.mkdirSync(dest, { recursive: true });
		fs.writeFileSync(externalManifest, content);
		fs.symlinkSync(externalManifest, path.join(dest, ".agent-skills-manifest.json"));

		expect(() => claudeTarget.install(ctx({ dest, skills: [skills[0]!], mode: "symlink" }))).toThrow(/not a regular file/);
		expect(fs.readFileSync(externalManifest, "utf8")).toBe(content);
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

	it("repairs a stale managed symlink after the source checkout moves", () => {
		const dest = path.join(tmp, "skills");

		claudeTarget.install(ctx({ dest, skills: [skills[0]!], mode: "symlink" }));
		const link = path.join(dest, skills[0]!.name);
		const movedDir = path.join(tmp, "new-checkout", "skills", skills[0]!.name);
		const movedSkill = { ...skills[0]!, dir: movedDir, file: path.join(movedDir, "SKILL.md") };

		fs.cpSync(skills[0]!.dir, movedDir, { recursive: true });
		const actions = claudeTarget.install(ctx({ dest, skills: [movedSkill], mode: "symlink" }));

		expect(actions[0]!.verb).toBe("symlink");
		expect(fs.realpathSync(link)).toBe(fs.realpathSync(movedDir));
	});

	it("does not trust a stale manifest after a managed symlink is replaced", () => {
		const dest = path.join(tmp, "skills");
		const replaced = path.join(dest, skills[0]!.name);

		claudeTarget.install(ctx({ dest, skills: [skills[0]!], mode: "symlink" }));
		fs.unlinkSync(replaced);
		fs.mkdirSync(replaced);
		fs.writeFileSync(path.join(replaced, "user.txt"), "keep me");

		const installActions = claudeTarget.install(ctx({ dest, skills: [skills[0]!], mode: "symlink" }));
		const uninstallActions = claudeTarget.uninstall(ctx({ dest, skills: [skills[0]!], mode: "symlink" }));

		expect(installActions[0]!.verb).toBe("skip");
		expect(uninstallActions[0]!.verb).toBe("skip");
		expect(fs.readFileSync(path.join(replaced, "user.txt"), "utf8")).toBe("keep me");

		const forced = claudeTarget.uninstall(ctx({ dest, skills: [skills[0]!], mode: "symlink", force: true }));
		const backupDir = fs.readdirSync(dest).find((entry) => entry.startsWith(`${skills[0]!.name}.bak-`));

		expect(forced[0]!.verb).toBe("backup");
		expect(backupDir).toBeTruthy();
		expect(fs.readFileSync(path.join(dest, backupDir!, "user.txt"), "utf8")).toBe("keep me");
		expect(fs.existsSync(path.join(dest, ".agent-skills-manifest.json"))).toBe(false);
	});

	it("drops stale manifest ownership when uninstall finds no entry", () => {
		const dest = path.join(tmp, "skills");
		const link = path.join(dest, skills[0]!.name);

		claudeTarget.install(ctx({ dest, mode: "symlink" }));
		fs.unlinkSync(link);
		claudeTarget.uninstall(ctx({ dest, skills: [skills[0]!], mode: "symlink" }));

		const manifest = JSON.parse(fs.readFileSync(path.join(dest, ".agent-skills-manifest.json"), "utf8")) as {
			skills: Record<string, unknown>;
		};

		expect(manifest.skills[skills[0]!.name]).toBeUndefined();
		expect(manifest.skills[skills[1]!.name]).toBeTruthy();
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

	it("does not follow same-name symlinks that point outside the target directory", () => {
		const dest = path.join(tmp, "rules");
		const file = path.join(dest, `${skills[0]!.name}.mdc`);
		const external = path.join(tmp, "external.mdc");
		const externalContent = MANAGED_LINE + "\nuser-owned target\n";

		fs.mkdirSync(dest, { recursive: true });
		fs.writeFileSync(external, externalContent);
		fs.symlinkSync(external, file);

		const actions = cursorTarget.install(ctx({ dest, skills: [skills[0]!] }));

		expect(actions[0]!.verb).toBe("skip");
		expect(cursorTarget.status(ctx({ dest, skills: [skills[0]!] }))[0]!.state).toBe("conflict");
		expect(fs.readFileSync(external, "utf8")).toBe(externalContent);
	});

	it("treats broken same-name symlinks as conflicts instead of writing through them", () => {
		const dest = path.join(tmp, "rules");
		const file = path.join(dest, `${skills[0]!.name}.mdc`);
		const external = path.join(tmp, "missing-external.mdc");

		fs.mkdirSync(dest, { recursive: true });
		fs.symlinkSync(external, file);

		const actions = cursorTarget.install(ctx({ dest, skills: [skills[0]!] }));

		expect(actions[0]!.verb).toBe("skip");
		expect(cursorTarget.status(ctx({ dest, skills: [skills[0]!] }))[0]!.state).toBe("conflict");
		expect(fs.existsSync(external)).toBe(false);
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

describe("codex target (native skills)", () => {
	it("symlinks complete skill directories and uninstalls cleanly", () => {
		const dest = path.join(tmp, ".agents", "skills");

		codexTarget.install(ctx({ dest, mode: "symlink" }));
		const link = path.join(dest, skills[0]!.name);

		expect(fs.lstatSync(link).isSymbolicLink()).toBe(true);
		expect(fs.existsSync(path.join(link, "SKILL.md"))).toBe(true);
		expect(codexTarget.status(ctx({ dest, mode: "symlink" }))[0]!.state).toBe("linked");

		codexTarget.uninstall(ctx({ dest, mode: "symlink" }));
		expect(fs.existsSync(link)).toBe(false);
	});

	it("preserves an unmanaged skill unless --force is explicit", () => {
		const dest = path.join(tmp, ".agents", "skills");
		const userDir = path.join(dest, skills[0]!.name);

		fs.mkdirSync(userDir, { recursive: true });
		fs.writeFileSync(path.join(userDir, "SKILL.md"), "user-owned");

		const actions = codexTarget.install(ctx({ dest, skills: [skills[0]!], mode: "symlink" }));

		expect(actions[0]!.verb).toBe("skip");
		expect(fs.readFileSync(path.join(userDir, "SKILL.md"), "utf8")).toBe("user-owned");
	});

	it("removes a legacy managed AGENTS.md block while preserving user instructions", () => {
		const dest = path.join(tmp, ".agents", "skills");
		const legacy = path.join(tmp, "AGENTS.md");
		const name = skills[0]!.name;

		fs.writeFileSync(legacy, "# User instructions\n\nKeep this.\n");
		writeManagedBlock(legacy, `# Agent skills\n\n<!-- skill:${name} -->\n## ${name}\n\nold generated skill\n<!-- /skill:${name} -->`, false);
		const actions = codexTarget.install(ctx({ dest, skills: [skills[0]!], mode: "symlink" }));
		const content = fs.readFileSync(legacy, "utf8");

		expect(content).toContain("Keep this.");
		expect(content).not.toContain(BLOCK_START);
		expect(actions.some((action) => action.note?.includes("legacy Codex AGENTS.md skill section"))).toBe(true);
	});

	it("migrates and uninstalls only selected legacy AGENTS.md sections", () => {
		const dest = path.join(tmp, ".agents", "skills");
		const legacy = path.join(tmp, "AGENTS.md");
		const first = skills[0]!;
		const second = skills[1]!;
		const firstSection = `<!-- skill:${first.name} -->\n## ${first.name}\n\nold generated skill\n<!-- /skill:${first.name} -->`;
		const secondSection = `<!-- skill:${second.name} -->\n## ${second.name}\n\nold generated skill\n<!-- /skill:${second.name} -->`;

		writeManagedBlock(legacy, `# Agent skills\n\n${firstSection}\n\n${secondSection}`, false);
		codexTarget.install(ctx({ dest, skills: [first], mode: "symlink" }));

		expect(fs.readFileSync(legacy, "utf8")).not.toContain(`skill:${first.name}`);
		expect(fs.readFileSync(legacy, "utf8")).toContain(`skill:${second.name}`);
		expect(codexTarget.status(ctx({ dest, skills: [second] }))[0]!.state).toBe("conflict");

		codexTarget.uninstall(ctx({ dest, skills: [second] }));
		expect(fs.existsSync(legacy)).toBe(false);
	});

	it("rejects a legacy AGENTS.md destination even when the path does not exist", () => {
		const dest = path.join(tmp, "AGENTS.md");

		expect(() => codexTarget.install(ctx({ dest, skills: [skills[0]!] }))).toThrow(/native skill directories/i);
		expect(fs.existsSync(dest)).toBe(false);
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

	it("cline: a legacy single FILE at dest is skipped (no mkdir EEXIST), backed up under --force", () => {
		const dest = path.join(tmp, ".clinerules"); // a FILE where the adapter wants a directory

		fs.writeFileSync(dest, "the user's legacy clinerules");

		const skipped = clineTarget.install(ctx({ dest, skills: [skills[0]!] }));

		expect(skipped[0]!.verb).toBe("skip");
		expect(fs.readFileSync(dest, "utf8")).toBe("the user's legacy clinerules"); // preserved, no throw

		const forced = clineTarget.install(ctx({ dest, skills: [skills[0]!], force: true }));

		expect(forced.map((a) => a.verb)).toContain("backup");
		expect(fs.statSync(dest).isDirectory()).toBe(true); // now the directory we wanted
		expect(fs.existsSync(path.join(dest, `${skills[0]!.name}.md`))).toBe(true);
		expect(fs.readdirSync(tmp).some((e) => e.startsWith(".clinerules.bak-"))).toBe(true); // legacy file preserved aside
	});
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

	it("claude copy: resource drift is detected even when SKILL.md is unchanged", () => {
		const source = path.join(tmp, "resource-skill");
		const dir = path.join(tmp, "claude-resource-copy");

		fs.mkdirSync(path.join(source, "scripts"), { recursive: true });
		fs.writeFileSync(path.join(source, "SKILL.md"), "---\nname: resource-skill\ndescription: resource test\n---\nbody");
		fs.writeFileSync(path.join(source, "scripts", "tool.sh"), "v1\n");
		const skill = { ...skills[0]!, name: "resource-skill", dir: source, file: path.join(source, "SKILL.md") };

		claudeTarget.install(ctx({ dest: dir, skills: [skill], mode: "copy" }));
		expect(claudeTarget.status(ctx({ dest: dir, skills: [skill] }))[0]!.state).toBe("copied");
		fs.writeFileSync(path.join(source, "scripts", "tool.sh"), "v2\n");
		expect(claudeTarget.status(ctx({ dest: dir, skills: [skill] }))[0]!.state).toBe("drifted");
	});

	it("cursor: generated, then drifted after editing the file", () => {
		const dest = path.join(tmp, "rules");

		cursorTarget.install(ctx({ dest, skills: [skills[0]!] }));
		expect(cursorTarget.status(ctx({ dest, skills: [skills[0]!] }))[0]!.state).toBe("generated");
		fs.appendFileSync(path.join(dest, `${skills[0]!.name}.mdc`), "\nDRIFT\n");
		expect(cursorTarget.status(ctx({ dest, skills: [skills[0]!] }))[0]!.state).toBe("drifted");
	});

	it("codex: linked for an installed skill, missing for one that isn't", () => {
		const dest = path.join(tmp, ".agents", "skills");

		codexTarget.install(ctx({ dest, skills: [skills[0]!], mode: "symlink" }));
		expect(codexTarget.status(ctx({ dest, skills: [skills[0]!], mode: "symlink" }))[0]!.state).toBe("linked");
		expect(codexTarget.status(ctx({ dest, skills: [skills[1]!] }))[0]!.state).toBe("missing");
	});
});
