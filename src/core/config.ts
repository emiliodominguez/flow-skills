import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Where a target installs by default, per scope. Paths may use `~`. */
export interface TargetConfig {
	enabled: boolean;
	userPath: string;
	projectPath: string;
}

/** The full resolved config for a repo. */
export interface Config {
	skillsDir: string;
	installMode: "symlink" | "copy";
	defaultTargets: string[];
	targets: Record<string, TargetConfig>;
}

const DEFAULTS: Config = {
	skillsDir: "skills",
	installMode: "symlink",
	defaultTargets: ["claude"],
	targets: {
		claude: { enabled: true, userPath: "~/.claude/skills", projectPath: ".claude/skills" },
		cursor: { enabled: true, userPath: "~/.cursor/rules", projectPath: ".cursor/rules" },
		codex: { enabled: true, userPath: "~/.codex/AGENTS.md", projectPath: "AGENTS.md" },
		windsurf: { enabled: true, userPath: "~/.codeium/windsurf/memories", projectPath: ".windsurf/rules" },
		// Project-oriented tools: no global rules location, so userPath mirrors the project path.
		copilot: { enabled: true, userPath: ".github/copilot-instructions.md", projectPath: ".github/copilot-instructions.md" },
		zed: { enabled: true, userPath: ".rules", projectPath: ".rules" },
		aider: { enabled: true, userPath: "CONVENTIONS.md", projectPath: "CONVENTIONS.md" },
		cline: { enabled: true, userPath: ".clinerules", projectPath: ".clinerules" },
		continue: { enabled: true, userPath: "~/.continue/rules", projectPath: ".continue/rules" },
	},
};

/**
 * Locate the repo root by walking up from a start dir until an
 * `agent-skills.config.json` (or the package.json + skills dir) is found. Falls
 * back to the installed package root so a globally-installed CLI still works.
 *
 * @param startDir - Where to begin the upward search (default: cwd).
 * @returns The repo/package root directory.
 */
export function findRepoRoot(startDir: string = process.cwd()): string {
	// 1. A repo checkout: walk up from cwd for the config file.
	for (let dir = startDir; ;) {
		if (fs.existsSync(path.join(dir, "agent-skills.config.json"))) return dir;
		const parent = path.dirname(dir);
		if (parent === dir) break;
		dir = parent;
	}
	// 2. Installed bin with no ancestor config: the package root that ships the skills.
	return packageRoot();
}

/**
 * Walk up from this module to the package root — the first ancestor holding a
 * package.json next to the skills directory. Layout-independent, so it resolves
 * correctly whether running from bundled `dist/index.js` or `tsx src/...`.
 *
 * @returns The package root directory.
 */
export function packageRoot(): string {
	let dir = path.dirname(fileURLToPath(import.meta.url));
	for (;;) {
		if (fs.existsSync(path.join(dir, "package.json")) && fs.existsSync(path.join(dir, "skills"))) return dir;
		const parent = path.dirname(dir);
		if (parent === dir) return path.dirname(fileURLToPath(import.meta.url));
		dir = parent;
	}
}

/**
 * Load config from `agent-skills.config.json`, deep-merged over built-in
 * defaults, with an optional git-ignored `.agent-skills.local.json` override.
 *
 * @param root - The repo root (see {@link findRepoRoot}).
 * @returns The effective config.
 */
export function loadConfig(root: string): Config {
	const cfg: Config = structuredClone(DEFAULTS);
	mergeInto(cfg, readJsonIfExists(path.join(root, "agent-skills.config.json")));
	mergeInto(cfg, readJsonIfExists(path.join(root, ".agent-skills.local.json")));
	return cfg;
}

function readJsonIfExists(file: string): Partial<Config> | undefined {
	if (!fs.existsSync(file)) return undefined;
	// mergeInto only reads known keys, so a stray `$schema` is ignored — no cleanup needed.
	return JSON.parse(fs.readFileSync(file, "utf8")) as Partial<Config>;
}

function mergeInto(base: Config, override?: Partial<Config>): void {
	if (!override) return;
	if (override.skillsDir) base.skillsDir = override.skillsDir;
	if (override.installMode) base.installMode = override.installMode;
	if (override.defaultTargets) base.defaultTargets = override.defaultTargets;
	if (override.targets) {
		for (const [name, tc] of Object.entries(override.targets)) {
			base.targets[name] = { ...(base.targets[name] ?? { enabled: true, userPath: "", projectPath: "" }), ...tc };
		}
	}
}
