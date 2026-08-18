import path from "node:path";
import pc from "picocolors";
import { findRepoRoot, loadConfig } from "../core/config.js";
import { discoverSkills } from "../core/registry.js";
import { log, sanitize } from "../core/logger.js";
import { TARGETS } from "../targets/index.js";

/**
 * Build a compact list summary while accepting current and legacy separators.
 *
 * @param description - Full skill description.
 * @returns Sanitized summary text.
 */
export function summarizeSkillDescription(description: string): string {
	return sanitize(
		description
			.split(/\.| - |\u2013|\u2014/)[0]!
			.trim()
			.slice(0, 90),
	);
}

/**
 * `list` - show every skill in the repo and the available targets.
 *
 * @param opts - `targets` to also print the target adapters; `profiles` to print
 *   the configured install sets; `json` for a machine-readable dump.
 */
export function listCommand(opts: { targets?: boolean; profiles?: boolean; json?: boolean }): void {
	const root = findRepoRoot();
	const config = loadConfig(root);
	const skills = discoverSkills(path.join(root, config.skillsDir));

	if (opts.json) {
		const payload = {
			skills: skills.map((s) => ({
				name: s.name,
				description: s.frontmatter.description,
			})),
			targets: Object.values(TARGETS).map((t) => ({ name: t.name, describe: t.describe })),
			profiles: config.profiles,
		};

		console.log(JSON.stringify(payload, null, 2));

		return;
	}

	log.heading(`Skills (${skills.length})`);
	const width = Math.max(...skills.map((s) => sanitize(s.name).length), 0);

	for (const skill of skills) {
		const summary = summarizeSkillDescription(skill.frontmatter.description);

		console.log(`  ${pc.bold(sanitize(skill.name).padEnd(width))}  ${pc.dim(summary)}`);
	}

	if (opts.targets) {
		log.heading("Targets");
		const targets = Object.values(TARGETS);
		const targetWidth = Math.max(...targets.map((t) => t.name.length), 0);

		for (const target of targets) {
			console.log(`  ${pc.bold(target.name.padEnd(targetWidth))}  ${pc.dim(target.describe)}`);
		}
	}

	if (opts.profiles) {
		const names = Object.keys(config.profiles);

		log.heading(`Profiles (${names.length})`);

		if (names.length === 0) {
			console.log(pc.dim("  (none configured - add a `profiles` map to agent-skills.config.json)"));
		} else {
			const profileWidth = Math.max(...names.map((n) => n.length), 0);

			for (const name of names) {
				console.log(`  ${pc.bold(name.padEnd(profileWidth))}  ${pc.dim(config.profiles[name]!.join(", "))}`);
			}
		}
	}
}
