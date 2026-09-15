import path from "node:path";
import pc from "picocolors";
import { findRepoRoot, loadConfig } from "../core/config.js";
import { discoverSkills } from "../core/registry.js";
import { findProjectRoot, resolveTargetPath } from "../core/paths.js";
import { log, targetHeader, sym } from "../core/logger.js";
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

/** One target's computed install report. */
interface TargetReport {
	target: string;
	dest: string;
	error?: string;
	counts: Partial<Record<SkillState, number>>;
	attention: { skill: string; state: SkillState }[];
}

/**
 * `doctor` - report each target's install state and flag drift or conflicts.
 * Exits non-zero when something needs attention, so it's scriptable.
 *
 * @param opts - Targets (default: all enabled), scope, and `json` for machine output.
 */
export function doctorCommand(opts: { target?: string[]; scope?: "user" | "project"; json?: boolean }): void {
	const root = findRepoRoot();
	const config = loadConfig(root);
	const skills = discoverSkills(path.join(root, config.skillsDir));
	const scope = opts.scope ?? "user";
	const targets = opts.target?.length ? opts.target : Object.keys(config.targets).filter((name) => config.targets[name]?.enabled);
	const projectRoot = findProjectRoot();

	const reports: TargetReport[] = [];
	let problems = 0;

	for (const name of targets) {
		const tc = config.targets[name];

		if (!tc || !tc.enabled) {
			problems++;
			reports.push({ target: name, dest: "", error: "Target is disabled or unknown", counts: {}, attention: [] });

			continue;
		}

		const dest = resolveTargetPath(scope === "user" ? tc.userPath : tc.projectPath, projectRoot);

		try {
			const statuses = getTarget(name).status({ skills, dest, mode: config.installMode, force: false, dryRun: true });
			const counts: Partial<Record<SkillState, number>> = {};

			for (const status of statuses) counts[status.state] = (counts[status.state] ?? 0) + 1;

			const attention = statuses.filter((s) => !HEALTHY.has(s.state)).map((s) => ({ skill: s.skill, state: s.state }));

			problems += attention.length;
			reports.push({ target: name, dest, counts, attention });
		} catch (err) {
			problems++;
			reports.push({ target: name, dest, error: err instanceof Error ? err.message : String(err), counts: {}, attention: [] });
		}
	}

	if (problems > 0) process.exitCode = 1;

	if (opts.json) {
		console.log(JSON.stringify({ scope, healthy: problems === 0, problems, targets: reports }, null, 2));

		return;
	}

	for (const report of reports) {
		targetHeader(report.target, report.dest);

		if (report.error) {
			log.error(`  ${report.error}`);
			continue;
		}

		const counts = Object.entries(report.counts) as [SkillState, number][];

		log.info("  " + counts.map(([state, n]) => STATE_COLOR[state](`${n} ${state}`)).join(`   ${sym.dot} `));

		for (const item of report.attention) {
			log.info(`    ${STATE_COLOR[item.state](item.state.padEnd(9))} ${pc.bold(item.skill)}`);
		}
	}

	if (problems > 0) log.warn(`${problems} item(s) need attention. Re-run \`install\` to fix drift; inspect conflicts by hand (or \`--force\`).`);
	else log.ok("all installed skills are healthy");
}
