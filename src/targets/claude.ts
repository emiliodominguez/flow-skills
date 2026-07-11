import path from "node:path";
import type { Action } from "../core/install-fs.js";
import { copyDir, removePath, symlink } from "../core/install-fs.js";
import type { InstallContext, Target } from "./types.js";

/**
 * Claude Code — the native format. Each skill is a directory containing SKILL.md
 * under `~/.claude/skills/<name>/`. Symlink mode points the entry at the repo so
 * edits are live; copy mode drops a frozen snapshot.
 */
export const claudeTarget: Target = {
	name: "claude",
	describe: "Claude Code — ~/.claude/skills/<name>/SKILL.md (native; symlink or copy)",
	bundle: false,

	install(ctx: InstallContext): Action[] {
		return ctx.skills.map((skill) => {
			const dest = path.join(ctx.dest, skill.name);
			return ctx.mode === "symlink" ? symlink(skill.dir, dest, ctx.dryRun) : copyDir(skill.dir, dest, ctx.dryRun);
		});
	},

	uninstall(ctx: InstallContext): Action[] {
		return ctx.skills.map((skill) => {
			const dest = path.join(ctx.dest, skill.name);
			removePath(dest, ctx.dryRun);
			return { verb: "remove", path: dest } satisfies Action;
		});
	},
};
