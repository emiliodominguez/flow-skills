import fs from "node:fs";
import path from "node:path";
import pc from "picocolors";
import { findRepoRoot, loadConfig, type Config } from "../core/config.js";
import { selectSkills } from "../core/registry.js";
import { resolveTargetPath, prettyPath } from "../core/paths.js";
import { log, printActions, targetHeader, reportSummary, sym } from "../core/logger.js";
import type { Action } from "../core/install-fs.js";
import { getTarget } from "../targets/index.js";

/** Options shared by `install` and `uninstall`. */
export interface InstallOptions {
	target?: string[];
	scope?: "user" | "project";
	copy?: boolean;
	force?: boolean;
	dryRun?: boolean;
	/** install only: keep running and re-generate non-native targets on source change. */
	watch?: boolean;
	/** named install set(s) from config `profiles` — expanded to skills when no explicit skills are passed. */
	profile?: string[];
}

/**
 * Resolve which skills an operation targets. Explicit `[skills...]` args win; then
 * `--profile <name...>` (the union of the named profiles' skill lists); otherwise
 * all skills (empty list). Throws on an unknown profile name.
 *
 * @param skillNames - Positional skill args.
 * @param profiles - `--profile` values.
 * @param config - Resolved config (holds the `profiles` map).
 * @returns The effective skill-name list to select.
 */
export function resolveSelection(skillNames: string[], profiles: string[] | undefined, config: Config): string[] {
	if (skillNames.length > 0) return skillNames;

	if (!profiles?.length) return [];

	const names = new Set<string>();

	for (const name of profiles) {
		const list = config.profiles[name];

		if (!list) {
			const known = Object.keys(config.profiles);

			throw new Error(`Unknown profile "${name}".${known.length ? ` Known: ${known.join(", ")}.` : " No profiles configured."}`);
		}

		for (const skill of list) names.add(skill);
	}

	// An empty union would fall through to "all skills" downstream — catastrophic for
	// `uninstall --profile <empty>` (removes everything). Refuse it explicitly.
	if (names.size === 0) {
		throw new Error(`Profile ${profiles.map((p) => `"${p}"`).join(", ")} lists no skills; add skills to it, or omit --profile to act on all.`);
	}

	return [...names];
}

/**
 * `install` / `uninstall` — sync selected skills into one or more targets.
 *
 * @param mode - Which operation to run.
 * @param skillNames - Specific skills, or empty for all.
 * @param opts - Targets, scope, copy/symlink, dry-run, watch.
 */
export function installCommand(mode: "install" | "uninstall", skillNames: string[], opts: InstallOptions): void {
	const root = findRepoRoot();
	const config = loadConfig(root);
	const skillsDir = path.join(root, config.skillsDir);

	if (skillNames.length > 0 && opts.profile?.length) log.warn("--profile ignored: explicit skill names take precedence");

	const selected = resolveSelection(skillNames, opts.profile, config);

	const { failures, actions } = runOnce(mode, selected, opts, config, skillsDir);

	if (failures.length > 0) {
		log.error(`${mode} failed for: ${failures.join(", ")}`);
		process.exitCode = 1;
	} else {
		reportSummary(`${mode} complete`, actions, { dryRun: opts.dryRun, whenEmpty: "no changes" });
	}

	if (mode === "install" && opts.watch && !opts.dryRun) watch(selected, opts, config, skillsDir);
}

/**
 * Run one install/uninstall pass and return the ids of targets that failed.
 * Reloaded skills each call so `--watch` picks up source edits.
 *
 * @param mode - Which operation to run.
 * @param skillNames - Specific skills, or empty for all.
 * @param opts - Targets, scope, copy/symlink, dry-run, watch.
 * @param config - The resolved config.
 * @param skillsDir - Absolute path to the skills directory.
 * @returns The ids of targets that failed and every action taken.
 */
function runOnce(
	mode: "install" | "uninstall",
	skillNames: string[],
	opts: InstallOptions,
	config: Config,
	skillsDir: string,
): { failures: string[]; actions: Action[] } {
	const skills = selectSkills(skillsDir, skillNames);
	const targets = opts.target?.length ? opts.target : config.defaultTargets;
	const scope = opts.scope ?? "user";
	const installMode = opts.copy ? "copy" : config.installMode;

	// Windows can't create symlinks without elevation; fall back to copy for the native target.
	const onWindows = process.platform === "win32";

	if (opts.dryRun) log.warn("dry run — no files will be changed");

	const count = `${skills.length} skill${skills.length === 1 ? "" : "s"}`;

	log.muted(`${mode} ${sym.dot} ${count} ${sym.dot} ${targets.join(", ")} ${sym.dot} ${scope} scope`);

	const failures: string[] = [];
	const allActions: Action[] = [];

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

		targetHeader(target.name, dest, target.supportsSymlink ? usedMode : "generated");

		try {
			const actions = mode === "install" ? target.install(ctx) : target.uninstall(ctx);

			if (actions.length === 0) log.muted("  nothing to do");
			else printActions(actions);

			allActions.push(...actions);
		} catch (err) {
			// One target failing (e.g. malformed AGENTS.md) shouldn't abort the others.
			failures.push(name);
			log.error(`${name}: ${err instanceof Error ? err.message : String(err)}`);
		}
	}

	return { failures, actions: allActions };
}

/**
 * Watch the skills directory and re-run install on change (debounced). Symlinked
 * native installs are already live, so watch is only useful when a generated
 * (non-native) target is selected — but we re-run every selected target for
 * simplicity; the native one just no-ops ("already linked").
 *
 * @param skillNames - Specific skills, or empty for all.
 * @param opts - Targets, scope, copy/symlink, dry-run, watch.
 * @param config - The resolved config.
 * @param skillsDir - Absolute path to the skills directory (watched recursively).
 */
function watch(skillNames: string[], opts: InstallOptions, config: Config, skillsDir: string): void {
	log.info(pc.dim(`\nwatching ${prettyPath(skillsDir)} for changes — Ctrl-C to stop`));
	let timer: NodeJS.Timeout | undefined;

	fs.watch(skillsDir, { recursive: true }, () => {
		clearTimeout(timer);
		timer = setTimeout(() => {
			log.step("change detected — re-installing");

			try {
				runOnce("install", skillNames, opts, config, skillsDir);
			} catch (err) {
				// A source edit (e.g. renaming a watched skill) can throw; keep the watcher alive.
				log.error(`re-install failed: ${err instanceof Error ? err.message : String(err)} — still watching`);
			}
		}, 150);
	});
}
