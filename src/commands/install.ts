import path from "node:path";
import pc from "picocolors";
import { findRepoRoot, loadConfig } from "../core/config.js";
import { selectSkills } from "../core/registry.js";
import { resolveTargetPath, prettyPath } from "../core/paths.js";
import { log, printAction } from "../core/logger.js";
import { getTarget } from "../targets/index.js";

/** Options shared by `install` and `uninstall`. */
export interface InstallOptions {
	target?: string[];
	scope?: "user" | "project";
	copy?: boolean;
	force?: boolean;
	dryRun?: boolean;
}

/**
 * `install` / `uninstall` — sync selected skills into one or more targets.
 *
 * @param mode - Which operation to run.
 * @param skillNames - Specific skills, or empty for all.
 * @param opts - Targets, scope, copy/symlink, dry-run.
 */
export function installCommand(mode: "install" | "uninstall", skillNames: string[], opts: InstallOptions): void {
	const root = findRepoRoot();
	const config = loadConfig(root);
	const skillsDir = path.join(root, config.skillsDir);
	const skills = selectSkills(skillsDir, skillNames);
	const targets = opts.target?.length ? opts.target : config.defaultTargets;
	const scope = opts.scope ?? "user";
	const installMode = opts.copy ? "copy" : config.installMode;

	// Windows can't create symlinks without elevation; fall back to copy for the native target.
	const onWindows = process.platform === "win32";

	if (opts.dryRun) log.warn("dry run — no files will be changed");
	log.info(pc.dim(`${mode} ${skills.length} skill(s) → [${targets.join(", ")}] (${scope} scope)`));

	const failures: string[] = [];
	for (const name of targets) {
		const tc = config.targets[name];
		if (!tc || !tc.enabled) {
			log.warn(`target "${name}" is disabled or unknown in config — skipping`);
			continue;
		}
		const target = getTarget(name);
		const dest = resolveTargetPath(scope === "user" ? tc.userPath : tc.projectPath, process.cwd());
		let usedMode = target.supportsSymlink ? installMode : "copy";
		if (usedMode === "symlink" && onWindows) {
			usedMode = "copy";
			log.warn(`${name}: symlinks need elevation on Windows — using copy mode`);
		}
		const ctx = { skills, dest, mode: usedMode, force: !!opts.force, dryRun: !!opts.dryRun };

		log.heading(`${target.name} → ${prettyPath(dest)}${target.supportsSymlink ? pc.dim(` (${usedMode})`) : ""}`);
		try {
			const actions = mode === "install" ? target.install(ctx) : target.uninstall(ctx);
			if (actions.length === 0) log.dim("  (nothing to do)");
			else actions.forEach(printAction);
		} catch (err) {
			// One target failing (e.g. malformed AGENTS.md) shouldn't abort the others.
			failures.push(name);
			log.error(`${name}: ${err instanceof Error ? err.message : String(err)}`);
		}
	}

	if (failures.length > 0) {
		log.error(`${mode} failed for: ${failures.join(", ")}`);
		process.exitCode = 1;
	} else if (!opts.dryRun) {
		log.ok(`${mode} complete`);
	}
}
