import os from "node:os";
import fs from "node:fs";
import path from "node:path";

/**
 * Find the consuming Git repository root for project-scoped installs. If the
 * current directory is not inside a Git repository, keep the current directory.
 *
 * @param startDir - Directory from which the CLI was invoked.
 * @returns The nearest ancestor containing a `.git` file or directory.
 */
export function findProjectRoot(startDir: string = process.cwd()): string {
	let dir = path.resolve(startDir);

	for (;;) {
		if (fs.existsSync(path.join(dir, ".git"))) return dir;

		const parent = path.dirname(dir);

		if (parent === dir) return path.resolve(startDir);

		dir = parent;
	}
}

/**
 * Expand a leading `~` to the user's home directory.
 *
 * @param p - A path that may start with `~`.
 * @returns The absolute-ish path with `~` resolved to the home dir.
 */
export function expandHome(p: string): string {
	if (p === "~") return os.homedir();

	if (p.startsWith("~/")) return path.join(os.homedir(), p.slice(2));

	return p;
}

/**
 * Resolve a configured target path against a base directory, expanding `~`.
 * User-scope paths are typically absolute (`~/...`); project-scope paths are
 * relative to `baseDir`.
 *
 * @param configured - The path from config (may use `~` or be relative).
 * @param baseDir - Directory to resolve relative paths against (usually cwd).
 * @returns An absolute path.
 */
export function resolveTargetPath(configured: string, baseDir: string): string {
	const expanded = expandHome(configured);

	return path.isAbsolute(expanded) ? expanded : path.resolve(baseDir, expanded);
}

/**
 * Shorten an absolute path for display by collapsing the home dir to `~`.
 *
 * @param p - An absolute path.
 * @returns The path with the home dir shown as `~`.
 */
export function prettyPath(p: string): string {
	const home = os.homedir();

	if (p === home) return "~";

	return p.startsWith(home + path.sep) ? "~" + p.slice(home.length) : p;
}
