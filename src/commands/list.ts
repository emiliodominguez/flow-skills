import path from "node:path";
import pc from "picocolors";
import { findRepoRoot, loadProfiles, readJson, SKILLS_DIR } from "../core/repo.js";
import { discoverSkills } from "../core/registry.js";
import { log, sanitize } from "../core/logger.js";

/**
 * Build a compact list summary: the description's first sentence, capped.
 *
 * @param description - Full skill description.
 * @returns Sanitized summary text.
 */
export function summarizeSkillDescription(description: string): string {
	return sanitize(
		description
			.split(/\.| - /)[0]!
			.trim()
			.slice(0, 90),
	);
}

/**
 * The `owner/repo` source for `npx skills add`, read from package.json `repository`.
 *
 * @param root - The repo root.
 * @returns The GitHub shorthand, or "." when the repository URL is not a GitHub URL.
 */
export function installSource(root: string): string {
	const pkg = readJson<{ repository?: string | { url?: string } }>(path.join(root, "package.json"));
	const url = typeof pkg?.repository === "string" ? pkg.repository : (pkg?.repository?.url ?? "");
	const match = /github\.com[/:]([^/]+\/[^/.]+)/.exec(url);

	return match ? match[1]! : ".";
}

/**
 * `list` - show every skill in the repo, and optionally the install profiles as
 * ready-to-run `npx skills add` commands.
 *
 * @param opts - `profiles` to print the install sets; `json` for a machine-readable dump.
 */
export function listCommand(opts: { profiles?: boolean; json?: boolean }): void {
	const root = findRepoRoot();
	const skills = discoverSkills(path.join(root, SKILLS_DIR));
	const profiles = loadProfiles(root);
	const source = installSource(root);

	if (opts.json) {
		const payload = {
			skills: skills.map((s) => ({ name: s.name, description: s.frontmatter.description })),
			profiles,
		};

		console.log(JSON.stringify(payload, null, 2));

		return;
	}

	log.heading(`Skills (${skills.length})`);
	const width = Math.max(...skills.map((s) => sanitize(s.name).length), 0);

	for (const skill of skills) {
		console.log(`  ${pc.bold(sanitize(skill.name).padEnd(width))}  ${pc.dim(summarizeSkillDescription(skill.frontmatter.description))}`);
	}

	if (opts.profiles) {
		log.heading(`Profiles (${Object.keys(profiles).length})`);

		for (const [name, members] of Object.entries(profiles)) {
			console.log(`  ${pc.bold(name)}`);
			console.log(`    ${pc.dim(`npx skills add ${source} --skill ${members.join(" ")}`)}`);
		}
	}
}
