import fs from "node:fs";
import path from "node:path";

/** Skills live in `skills/<name>/SKILL.md`, the layout `npx skills` and Claude Code plugins both scan. */
export const SKILLS_DIR = "skills";

/** Named install sets: a profile name → the skill ids passed to `npx skills add --skill`. */
export type Profiles = Record<string, string[]>;

/**
 * Locate the repo root by walking up from a start dir until the plugin manifest
 * (`.claude-plugin/plugin.json`) or a `package.json` beside a `skills/` dir is found.
 *
 * @param startDir - Where to begin the upward search (default: cwd).
 * @returns The repo root directory.
 * @throws If no ancestor looks like a skills repository.
 */
export function findRepoRoot(startDir: string = process.cwd()): string {
	for (let dir = path.resolve(startDir); ;) {
		if (fs.existsSync(path.join(dir, ".claude-plugin", "plugin.json"))) return dir;

		if (fs.existsSync(path.join(dir, "package.json")) && fs.existsSync(path.join(dir, SKILLS_DIR))) return dir;

		const parent = path.dirname(dir);

		if (parent === dir) throw new Error(`No skills repository found above ${startDir}.`);

		dir = parent;
	}
}

/**
 * Read `profiles.json` from the repo root. A missing file means no profiles.
 *
 * @param root - The repo root (see {@link findRepoRoot}).
 * @returns The configured profiles.
 */
export function loadProfiles(root: string): Profiles {
	const file = path.join(root, "profiles.json");

	if (!fs.existsSync(file)) return {};

	const data = JSON.parse(fs.readFileSync(file, "utf8")) as { profiles?: Profiles };

	return data.profiles ?? {};
}

/**
 * Parse a JSON file, returning undefined when it is absent.
 *
 * @param file - Absolute path to the JSON file.
 * @returns The parsed value, or undefined.
 */
export function readJson<T>(file: string): T | undefined {
	if (!fs.existsSync(file)) return undefined;

	return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}
