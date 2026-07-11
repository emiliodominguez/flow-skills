import fs from "node:fs";
import path from "node:path";
import type { Action } from "../core/install-fs.js";
import { backup, copyDir, isSymlinkTo, removePath, symlink, writeFile } from "../core/install-fs.js";
import type { InstallContext, SkillStatus, Target } from "./types.js";
import { MANAGED_LINE } from "./render.js";

/** Dropped into a copied skill dir so uninstall can tell a copy of ours from a user's own dir. */
const MARKER = ".agent-skills";

/** Any entry (dir, file, or symlink — including a broken one) exists at `p`. */
function present(p: string): boolean {
	try {
		fs.lstatSync(p);
		return true;
	} catch {
		return false;
	}
}

/** Whether `dest` was created by this tool: our symlink into the repo, or a copy carrying the marker. */
function isManaged(dest: string, srcDir: string): boolean {
	return isSymlinkTo(dest, srcDir) || fs.existsSync(path.join(dest, MARKER));
}

/**
 * Claude Code — the native format. Each skill is a directory containing SKILL.md
 * under `~/.claude/skills/<name>/`. Symlink mode points the entry at the repo so
 * edits are live; copy mode drops a frozen snapshot (marked so uninstall is safe).
 * A directory we did not create is never touched without `--force`, and even then
 * it's backed up (moved aside), never deleted outright.
 */
export const claudeTarget: Target = {
	name: "claude",
	describe: "Claude Code — ~/.claude/skills/<name>/SKILL.md (native; symlink or copy)",
	supportsSymlink: true,

	install(ctx: InstallContext): Action[] {
		return ctx.skills.flatMap((skill) => {
			const dest = path.join(ctx.dest, skill.name);
			const actions: Action[] = [];
			if (present(dest) && !isManaged(dest, skill.dir)) {
				if (!ctx.force) return [{ verb: "skip", path: dest, note: "exists, not managed by agent-skills — use --force to overwrite" }];
				actions.push(backup(dest, Date.now(), ctx.dryRun));
			}
			if (ctx.mode === "symlink") {
				actions.push(symlink(skill.dir, dest, ctx.dryRun));
			} else {
				actions.push(copyDir(skill.dir, dest, ctx.dryRun));
				writeFile(path.join(dest, MARKER), MANAGED_LINE + "\n", ctx.dryRun);
			}
			return actions;
		});
	},

	uninstall(ctx: InstallContext): Action[] {
		return ctx.skills.flatMap((skill) => {
			const dest = path.join(ctx.dest, skill.name);
			if (!present(dest)) return [{ verb: "skip", path: dest, note: "absent" }];
			if (isManaged(dest, skill.dir)) {
				removePath(dest, ctx.dryRun);
				return [{ verb: "remove", path: dest }];
			}
			if (ctx.force) return [backup(dest, Date.now(), ctx.dryRun)];
			return [{ verb: "skip", path: dest, note: "not managed by agent-skills — use --force to remove" }];
		});
	},

	status(ctx: InstallContext): SkillStatus[] {
		return ctx.skills.map((skill) => {
			const dest = path.join(ctx.dest, skill.name);
			if (!present(dest)) return { skill: skill.name, state: "missing" };
			if (isSymlinkTo(dest, skill.dir)) return { skill: skill.name, state: "linked" };
			if (fs.existsSync(path.join(dest, MARKER))) {
				const installed = path.join(dest, "SKILL.md");
				const same = fs.existsSync(installed) && fs.readFileSync(installed, "utf8") === fs.readFileSync(skill.file, "utf8");
				return { skill: skill.name, state: same ? "copied" : "drifted" };
			}
			return { skill: skill.name, state: "conflict" };
		});
	},
};
