import path from "node:path";
import pc from "picocolors";
import { findRepoRoot, loadConfig } from "../core/config.js";
import { discoverSkills } from "../core/registry.js";
import { resolveTargetPath, prettyPath } from "../core/paths.js";
import { log, printAction } from "../core/logger.js";
import { getTarget } from "../targets/index.js";
import type { SkillState } from "../targets/types.js";

/** States that mean "this skill is currently installed here" (so re-install it). */
const INSTALLED = new Set<SkillState>(["linked", "copied", "generated", "drifted"]);

/**
 * `sync` — re-run install for whatever is *already* installed, across targets, so
 * a source edit propagates everywhere with one command. For each target it reads
 * the on-disk state (like `doctor`) and re-installs only the skills that are
 * present (skipping `missing` and never touching a `conflict` it didn't create).
 *
 * @param opts - Targets (default: all enabled) and scope.
 */
export function syncCommand(opts: { target?: string[]; scope?: "user" | "project"; dryRun?: boolean }): void {
	const root = findRepoRoot();
	const config = loadConfig(root);
	const skills = discoverSkills(path.join(root, config.skillsDir));
	const scope = opts.scope ?? "user";
	const targets = opts.target?.length ? opts.target : Object.keys(config.targets).filter((name) => config.targets[name]?.enabled);

	if (opts.dryRun) log.warn("dry run — no files will be changed");

	const failures: string[] = [];
	let synced = 0;
	for (const name of targets) {
		const tc = config.targets[name];
		if (!tc || !tc.enabled) {
			log.warn(`target "${name}" is disabled or unknown — skipping`);
			continue;
		}
		try {
			const target = getTarget(name);
			const dest = resolveTargetPath(scope === "user" ? tc.userPath : tc.projectPath, process.cwd());
			log.heading(`${target.name} → ${prettyPath(dest)}`);

			const statuses = target.status({ skills, dest, mode: config.installMode, force: false, dryRun: true });
			const installedNames = new Set(statuses.filter((s) => INSTALLED.has(s.state)).map((s) => s.skill));
			const toSync = skills.filter((s) => installedNames.has(s.name));
			if (toSync.length === 0) {
				log.dim("  (nothing installed here)");
				continue;
			}
			const actions = target.install({ skills: toSync, dest, mode: config.installMode, force: false, dryRun: !!opts.dryRun });
			actions.forEach(printAction);
			synced += toSync.length;
		} catch (err) {
			// One target failing (e.g. malformed AGENTS.md) shouldn't abort the others.
			failures.push(name);
			log.error(`${name}: ${err instanceof Error ? err.message : String(err)}`);
		}
	}

	if (failures.length > 0) {
		log.error(`sync failed for: ${failures.join(", ")}`);
		process.exitCode = 1;
	} else {
		log.info(pc.dim(`\nsynced ${synced} installed skill(s)`));
		if (!opts.dryRun) log.ok("sync complete");
	}
}
