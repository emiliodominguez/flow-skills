import fs from "node:fs";
import path from "node:path";

/** Marker wrapping generated content so we can update/remove it without touching user content. */
export const BLOCK_START = "<!-- agent-skills:start -->";
export const BLOCK_END = "<!-- agent-skills:end -->";

/** One recorded filesystem action, for the install/uninstall report. */
export interface Action {
	verb: "symlink" | "copy" | "write" | "remove" | "skip";
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
		const stat = fs.lstatSync(linkPath);
		if (!stat.isSymbolicLink()) return false;
		return path.resolve(path.dirname(linkPath), fs.readlinkSync(linkPath)) === path.resolve(target);
	} catch {
		return false;
	}
}

/**
 * Remove a file, directory, or symlink if it exists.
 *
 * @param target - Path to remove.
 * @param dryRun - When true, do nothing.
 */
export function removePath(target: string, dryRun: boolean): void {
	if (dryRun) return;
	if (fs.existsSync(target) || isLink(target)) fs.rmSync(target, { recursive: true, force: true });
}

function isLink(p: string): boolean {
	try {
		return fs.lstatSync(p).isSymbolicLink();
	} catch {
		return false;
	}
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

/**
 * Write a delimited managed block into a (possibly pre-existing) file, leaving
 * any surrounding user content intact. Used for bundle targets like AGENTS.md.
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
		const re = new RegExp(`${escapeRe(BLOCK_START)}[\\s\\S]*?${escapeRe(BLOCK_END)}`);
		next = re.test(existing) ? existing.replace(re, block) : existing.trimEnd() + "\n\n" + block + "\n";
	} else {
		next = block + "\n";
	}
	ensureDir(path.dirname(dest), dryRun);
	if (!dryRun) fs.writeFileSync(dest, next, "utf8");
	return { verb: "write", path: dest, note: "managed block" };
}

/**
 * Remove our managed block from a bundle file (leaving user content). If the
 * file becomes only whitespace, it's removed entirely.
 *
 * @param dest - The bundle file.
 * @param dryRun - When true, only record the action.
 * @returns The recorded action, or null if there was nothing to remove.
 */
export function removeManagedBlock(dest: string, dryRun: boolean): Action | null {
	if (!fs.existsSync(dest)) return null;
	const existing = fs.readFileSync(dest, "utf8");
	const re = new RegExp(`\\n*${escapeRe(BLOCK_START)}[\\s\\S]*?${escapeRe(BLOCK_END)}\\n*`);
	if (!re.test(existing)) return null;
	const next = existing.replace(re, "\n").trim();
	if (!dryRun) {
		if (next.length === 0) fs.rmSync(dest, { force: true });
		else fs.writeFileSync(dest, next + "\n", "utf8");
	}
	return { verb: next.length === 0 ? "remove" : "write", path: dest, note: "managed block" };
}

function escapeRe(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
