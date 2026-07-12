import fs from "node:fs";
import path from "node:path";

/** Marker wrapping generated content so we can update/remove it without touching user content. */
export const BLOCK_START = "<!-- agent-skills:start -->";
export const BLOCK_END = "<!-- agent-skills:end -->";

/** One recorded filesystem action, for the install/uninstall report. */
export interface Action {
	verb: "symlink" | "copy" | "write" | "remove" | "backup" | "skip";
	path: string;
	note?: string;
}

/**
 * Ensure a directory exists (recursive mkdir), unless dry-running.
 *
 * @param dir - Directory to create.
 * @param dryRun - When true, do nothing.
 */
export function ensureDir(dir: string, dryRun: boolean): void {
	if (!dryRun) fs.mkdirSync(dir, { recursive: true });
}

/**
 * Whether `linkPath` is a symlink resolving to `target`.
 *
 * @param linkPath - Path that may be a symlink.
 * @param target - Expected resolved target.
 * @returns True if `linkPath` is a symlink pointing at `target`.
 */
export function isSymlinkTo(linkPath: string, target: string): boolean {
	try {
		if (!fs.lstatSync(linkPath).isSymbolicLink()) return false;

		return path.resolve(path.dirname(linkPath), fs.readlinkSync(linkPath)) === path.resolve(target);
	} catch {
		return false;
	}
}

/**
 * Remove a file, directory, or symlink. `force: true` no-ops on a missing path
 * and removes broken symlinks, so no existence pre-check is needed.
 *
 * @param target - Path to remove.
 * @param dryRun - When true, do nothing.
 */
export function removePath(target: string, dryRun: boolean): void {
	if (!dryRun) fs.rmSync(target, { recursive: true, force: true });
}

/**
 * Move an existing entry aside to a timestamped `.bak-<n>` sibling instead of
 * deleting it. Used before a `--force` overwrite/removal of something the tool
 * did not create, so nothing is ever destroyed outright.
 *
 * @param target - The path to move aside.
 * @param stamp - A monotonic-ish suffix (caller passes Date.now()).
 * @param dryRun - When true, only record the action.
 * @returns The recorded action.
 */
export function backup(target: string, stamp: number, dryRun: boolean): Action {
	const dest = `${target}.bak-${stamp}`;

	if (!dryRun) fs.renameSync(target, dest);

	return { verb: "backup", path: target, note: `→ ${path.basename(dest)}` };
}

/**
 * Symlink `src` to `dest`, replacing any existing entry at `dest`.
 *
 * @param src - Source path (the repo skill dir).
 * @param dest - Where the symlink is created.
 * @param dryRun - When true, only record the action.
 * @returns The recorded action.
 */
export function symlink(src: string, dest: string, dryRun: boolean): Action {
	if (isSymlinkTo(dest, src)) return { verb: "skip", path: dest, note: "already linked" };

	ensureDir(path.dirname(dest), dryRun);
	removePath(dest, dryRun);

	if (!dryRun) fs.symlinkSync(src, dest, "dir");

	return { verb: "symlink", path: dest, note: `→ ${src}` };
}

/**
 * Copy a directory tree from `src` to `dest`, replacing any existing entry.
 *
 * @param src - Source directory.
 * @param dest - Destination directory.
 * @param dryRun - When true, only record the action.
 * @returns The recorded action.
 */
export function copyDir(src: string, dest: string, dryRun: boolean): Action {
	ensureDir(path.dirname(dest), dryRun);
	removePath(dest, dryRun);

	if (!dryRun) fs.cpSync(src, dest, { recursive: true });

	return { verb: "copy", path: dest };
}

/**
 * Write a file (one skill → one generated file), replacing any existing entry.
 *
 * @param dest - Destination file path.
 * @param content - File contents.
 * @param dryRun - When true, only record the action.
 * @returns The recorded action.
 */
export function writeFile(dest: string, content: string, dryRun: boolean): Action {
	ensureDir(path.dirname(dest), dryRun);

	if (!dryRun) fs.writeFileSync(dest, content, "utf8");

	return { verb: "write", path: dest };
}

// Markers are matched only when alone on their own line (multiline-anchored), so
// the strings appearing inside a user's prose can never be mistaken for a boundary.
/**
 * Build a multiline-anchored regex matching `marker` only when alone on its line.
 *
 * @param marker - The literal marker string to anchor.
 * @param flags - Regex flags (callers pass "gm" or "m").
 * @returns A regex matching the marker on its own line.
 */
function lineAnchored(marker: string, flags: string): RegExp {
	return new RegExp(`^${escapeRe(marker)}$`, flags);
}

/**
 * Verify the file holds at most one matched start/end marker pair, throwing on a
 * mismatched or duplicate set.
 *
 * @param existing - The current file contents.
 * @param dest - The file path (for the error message).
 * @returns The number of start markers found (0 or 1).
 */
function assertSinglePair(existing: string, dest: string): number {
	const starts = existing.match(lineAnchored(BLOCK_START, "gm"))?.length ?? 0;
	const ends = existing.match(lineAnchored(BLOCK_END, "gm"))?.length ?? 0;

	if (starts !== ends || starts > 1) {
		throw new Error(`${dest} has malformed or duplicate agent-skills markers (${starts} start / ${ends} end). Fix them by hand and re-run.`);
	}

	return starts;
}

/**
 * Read the content inside our managed block, or null if there is none. Used by
 * bundle adapters to merge new skills with already-installed ones.
 *
 * @param dest - The bundle file.
 * @returns The inner block content, or null.
 */
export function readManagedBlock(dest: string): string | null {
	if (!fs.existsSync(dest)) return null;

	const existing = fs.readFileSync(dest, "utf8");

	assertSinglePair(existing, dest);
	const match = new RegExp(`^${escapeRe(BLOCK_START)}$\\n([\\s\\S]*?)\\n^${escapeRe(BLOCK_END)}$`, "m").exec(existing);

	return match ? match[1]! : null;
}

/**
 * Write a delimited managed block into a (possibly pre-existing) file, leaving
 * surrounding user content intact. Throws if the file has duplicate/mismatched
 * markers rather than guessing which pair is ours.
 *
 * @param dest - The bundle file.
 * @param content - The managed content to place between the markers.
 * @param dryRun - When true, only record the action.
 * @returns The recorded action.
 */
export function writeManagedBlock(dest: string, content: string, dryRun: boolean): Action {
	const block = `${BLOCK_START}\n${content}\n${BLOCK_END}`;
	let next: string;

	if (fs.existsSync(dest)) {
		const existing = fs.readFileSync(dest, "utf8");
		const pairs = assertSinglePair(existing, dest);
		const blockRe = new RegExp(`^${escapeRe(BLOCK_START)}$[\\s\\S]*?^${escapeRe(BLOCK_END)}$`, "m");

		next = pairs === 1 ? existing.replace(blockRe, block) : existing.trimEnd() + "\n\n" + block + "\n";
	} else {
		next = block + "\n";
	}

	ensureDir(path.dirname(dest), dryRun);

	if (!dryRun) fs.writeFileSync(dest, next, "utf8");

	return { verb: "write", path: dest, note: "managed block" };
}

/**
 * Remove our managed block from a bundle file, leaving user content. If the file
 * held nothing but our block (so we created it), it's removed; otherwise the
 * user's surrounding content is preserved.
 *
 * @param dest - The bundle file.
 * @param dryRun - When true, only record the action.
 * @returns The recorded action, or null if there was nothing to remove.
 */
export function removeManagedBlock(dest: string, dryRun: boolean): Action | null {
	if (!fs.existsSync(dest)) return null;

	const existing = fs.readFileSync(dest, "utf8");

	if (assertSinglePair(existing, dest) === 0) return null;

	const blockRe = new RegExp(`\\n*^${escapeRe(BLOCK_START)}$[\\s\\S]*?^${escapeRe(BLOCK_END)}$\\n*`, "m");
	const next = existing.replace(blockRe, "\n").trim();

	if (!dryRun) {
		if (next.length === 0) fs.rmSync(dest, { force: true });
		else fs.writeFileSync(dest, next + "\n", "utf8");
	}

	return { verb: next.length === 0 ? "remove" : "write", path: dest, note: "managed block" };
}

/**
 * Escape a string for safe literal use inside a regex.
 *
 * @param s - The string to escape.
 * @returns The regex-escaped string.
 */
function escapeRe(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
