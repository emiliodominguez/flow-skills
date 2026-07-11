import fs from "node:fs";
import path from "node:path";
import type { Action } from "../core/install-fs.js";
import { copyDir, isSymlinkTo, removePath, symlink, writeFile } from "../core/install-fs.js";
import type { InstallContext, Target } from "./types.js";
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
 * A pre-existing directory we did not create is never touched without `--force`.
 */
export const claudeTarget: Target = {
	name: "claude",
	describe: "Claude Code — ~/.claude/skills/<name>/SKILL.md (native; symlink or copy)",
	supportsSymlink: true,

	install(ctx: InstallContext): Action[] {
		return ctx.skills.map((skill) => {
			const dest = path.join(ctx.dest, skill.name);
			if (present(dest) && !isManaged(dest, skill.dir) && !ctx.force) {
				return { verb: "skip", path: dest, note: "exists, not managed by agent-skills — use --force to overwrite" } satisfies Action;
			}
			if (ctx.mode === "symlink") return symlink(skill.dir, dest, ctx.dryRun);
			const action = copyDir(skill.dir, dest, ctx.dryRun);
			writeFile(path.join(dest, MARKER), MANAGED_LINE + "\n", ctx.dryRun);
			return action;
		});
	},

	uninstall(ctx: InstallContext): Action[] {
		return ctx.skills.map((skill) => {
			const dest = path.join(ctx.dest, skill.name);
			if (!present(dest)) return { verb: "skip", path: dest, note: "absent" } satisfies Action;
			if (isManaged(dest, skill.dir) || ctx.force) {
				removePath(dest, ctx.dryRun);
				return { verb: "remove", path: dest } satisfies Action;
			}
			return { verb: "skip", path: dest, note: "not managed by agent-skills — use --force to remove" } satisfies Action;
		});
	},
};
