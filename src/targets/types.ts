import type { Skill } from "../core/skill.js";
import type { Action } from "../core/install-fs.js";

/** Inputs an adapter needs to install or uninstall a set of skills. */
export interface InstallContext {
	/** Skills selected for this operation. */
	skills: Skill[];
	/** Resolved destination — a directory (dir/file-per-skill) or a file (bundle). */
	dest: string;
	/** symlink (native only) or copy/generate. */
	mode: "symlink" | "copy";
	/** Overwrite / remove entries this tool did not create. */
	force: boolean;
	/** When true, compute actions but touch nothing. */
	dryRun: boolean;
}

/** A destination adapter: turns skills into one tool's on-disk convention. */
export interface Target {
	/** Stable id (matches config keys and `--target`). */
	name: string;
	/** One-line description of what it emits. */
	describe: string;
	/** Whether this target can install by symlink (native format) or only generate. */
	supportsSymlink: boolean;
	/** Install the skills. */
	install(ctx: InstallContext): Action[];
	/** Remove previously-installed skills. */
	uninstall(ctx: InstallContext): Action[];
}
