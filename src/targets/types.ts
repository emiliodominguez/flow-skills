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
	/** When true, compute actions but touch nothing. */
	dryRun: boolean;
}

/** Result of an install/uninstall for one target. */
export interface TargetResult {
	target: string;
	actions: Action[];
}

/** A destination adapter: turns skills into one tool's on-disk convention. */
export interface Target {
	/** Stable id (matches config keys and `--target`). */
	name: string;
	/** One-line description of what it emits. */
	describe: string;
	/** Whether `dest` is a directory (false) or a single bundle file (true). */
	bundle: boolean;
	/** Install the skills. */
	install(ctx: InstallContext): Action[];
	/** Remove previously-installed skills. */
	uninstall(ctx: InstallContext): Action[];
}
