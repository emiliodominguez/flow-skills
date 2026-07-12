import path from "node:path";
import pc from "picocolors";
import { findRepoRoot, loadConfig } from "../core/config.js";
import { discoverSkills } from "../core/registry.js";
import { resolveTargetPath, prettyPath } from "../core/paths.js";
import { log } from "../core/logger.js";
import { getTarget } from "../targets/index.js";
import type { SkillState } from "../targets/types.js";

const STATE_COLOR: Record<SkillState, (s: string) => string> = {
	linked: pc.green,
	copied: pc.green,
	generated: pc.green,
	drifted: pc.yellow,
	conflict: pc.yellow,
	missing: pc.dim,
};

/** States that don't need attention (missing just means "not installed here"). */
const HEALTHY = new Set<SkillState>(["linked", "copied", "generated", "missing"]);

/**
 * `doctor` — report each target's install state and flag drift or conflicts.
 * Exits non-zero when something needs attention, so it's scriptable.
 *
 * @param opts - Targets (default: all enabled) and scope.
 */
export function doctorCommand(opts: { target?: string[]; scope?: "user" | "project" }): void {
	const root = findRepoRoot();
	const config = loadConfig(root);
	const skills = discoverSkills(path.join(root, config.skillsDir));
	const scope = opts.scope ?? "user";
	const targets = opts.target?.length ? opts.target : Object.keys(config.targets).filter((name) => config.targets[name]?.enabled);

	let problems = 0;

	for (const name of targets) {
		const tc = config.targets[name];

		if (!tc || !tc.enabled) {
			log.warn(`target "${name}" is disabled or unknown — skipping`);
			continue;
		}

		const dest = resolveTargetPath(scope === "user" ? tc.userPath : tc.projectPath, process.cwd());

		log.heading(`${name} → ${prettyPath(dest)}`);

		let statuses;

		try {
			statuses = getTarget(name).status({ skills, dest, mode: config.installMode, force: false, dryRun: true });
		} catch (err) {
			log.error(`  ${err instanceof Error ? err.message : String(err)}`);
			problems++;
			continue;
		}

		const counts = new Map<SkillState, number>();

		for (const status of statuses) counts.set(status.state, (counts.get(status.state) ?? 0) + 1);

		log.info("  " + [...counts.entries()].map(([state, n]) => STATE_COLOR[state](`${n} ${state}`)).join("  "));

		for (const status of statuses) {
			if (HEALTHY.has(status.state)) continue;

			problems++;
			log.info(`    ${STATE_COLOR[status.state](status.state.padEnd(9))} ${status.skill}`);
		}
	}

	if (problems > 0) {
		log.warn(`${problems} item(s) need attention. Re-run \`install\` to fix drift; inspect conflicts by hand (or --force).`);
		process.exitCode = 1;
	} else {
		log.ok("all installed skills are healthy");
	}
}
