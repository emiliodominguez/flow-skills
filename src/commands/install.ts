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

	if (opts.dryRun) log.warn("dry run — no files will be changed");
	log.info(pc.dim(`${mode} ${skills.length} skill(s) → [${targets.join(", ")}] (${scope} scope)`));

	for (const name of targets) {
		const tc = config.targets[name];
		if (!tc || !tc.enabled) {
			log.warn(`target "${name}" is disabled or unknown in config — skipping`);
			continue;
		}
		const target = getTarget(name);
		const dest = resolveTargetPath(scope === "user" ? tc.userPath : tc.projectPath, process.cwd());
		const usedMode = target.supportsSymlink ? installMode : "copy";
		const ctx = { skills, dest, mode: usedMode, force: !!opts.force, dryRun: !!opts.dryRun };

		log.heading(`${target.name} → ${prettyPath(dest)}${target.supportsSymlink ? pc.dim(` (${usedMode})`) : ""}`);
		const actions = mode === "install" ? target.install(ctx) : target.uninstall(ctx);
		if (actions.length === 0) log.dim("  (nothing to do)");
		else actions.forEach(printAction);
	}

	if (!opts.dryRun) log.ok(`${mode} complete`);
}
