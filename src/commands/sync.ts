import path from "node:path";
import { findRepoRoot, loadConfig } from "../core/config.js";
import { discoverSkills } from "../core/registry.js";
import { findProjectRoot, resolveTargetPath } from "../core/paths.js";
import { effectiveInstallMode } from "../core/install-mode.js";
import { log, printActions, targetHeader, reportSummary } from "../core/logger.js";
import type { Action } from "../core/install-fs.js";
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
	const projectRoot = findProjectRoot();

	if (opts.dryRun) log.warn("dry run — no files will be changed");

	const failures: string[] = [];
	const allActions: Action[] = [];

	for (const name of targets) {
		const tc = config.targets[name];

		if (!tc || !tc.enabled) {
			log.warn(`target "${name}" is disabled or unknown — skipping`);
			continue;
		}

		try {
			const target = getTarget(name);
			const dest = resolveTargetPath(scope === "user" ? tc.userPath : tc.projectPath, projectRoot);

			targetHeader(target.name, dest, target.supportsSymlink ? "preserve installed mode" : "generated");

			const statuses = target.status({ skills, dest, mode: config.installMode, force: false, dryRun: true });
			const installedNames = new Set(statuses.filter((s) => INSTALLED.has(s.state)).map((s) => s.skill));
			const toSync = skills.filter((s) => installedNames.has(s.name));

			if (toSync.length === 0) {
				log.muted("  nothing installed here");
				continue;
			}

			const actions: Action[] = [];

			if (target.supportsSymlink) {
				const byName = new Map(statuses.map((status) => [status.skill, status]));
				const linked = toSync.filter((skill) => byName.get(skill.name)?.mode === "symlink");
				const copied = toSync.filter((skill) => byName.get(skill.name)?.mode !== "symlink");

				if (linked.length > 0) {
					actions.push(
						...target.install({
							skills: linked,
							dest,
							mode: effectiveInstallMode(target, "symlink"),
							force: false,
							dryRun: !!opts.dryRun,
						}),
					);
				}

				if (copied.length > 0) {
					actions.push(...target.install({ skills: copied, dest, mode: "copy", force: false, dryRun: !!opts.dryRun }));
				}
			} else {
				actions.push(...target.install({ skills: toSync, dest, mode: "copy", force: false, dryRun: !!opts.dryRun }));
			}

			printActions(actions);
			allActions.push(...actions);
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
		reportSummary("sync complete", allActions, { dryRun: opts.dryRun, whenEmpty: "nothing installed anywhere" });
	}
}
