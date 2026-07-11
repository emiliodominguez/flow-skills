import path from "node:path";
import pc from "picocolors";
import { findRepoRoot, loadConfig } from "../core/config.js";
import { discoverSkills } from "../core/registry.js";
import { log } from "../core/logger.js";
import { TARGETS } from "../targets/index.js";

/**
 * `list` — show every skill in the repo and the available targets.
 *
 * @param opts - `targets` to also print the target adapters.
 */
export function listCommand(opts: { targets?: boolean }): void {
	const root = findRepoRoot();
	const config = loadConfig(root);
	const skills = discoverSkills(path.join(root, config.skillsDir));

	log.heading(`Skills (${skills.length})`);
	const width = Math.max(...skills.map((s) => s.name.length), 0);
	for (const skill of skills) {
		const summary = skill.frontmatter.description.split(/[.—]/)[0]!.trim().slice(0, 90);
		console.log(`  ${pc.bold(skill.name.padEnd(width))}  ${pc.dim(summary)}`);
	}

	if (opts.targets) {
		log.heading("Targets");
		for (const target of Object.values(TARGETS)) {
			console.log(`  ${pc.bold(target.name.padEnd(width))}  ${pc.dim(target.describe)}`);
		}
	}
}
