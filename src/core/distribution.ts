import path from "node:path";
import { loadProfiles, readJson } from "./repo.js";
import type { Issue, Skill } from "./skill.js";

/** The fields of `.claude-plugin/plugin.json` this repo keeps in step with package.json. */
interface PluginManifest {
	name?: string;
	version?: string;
}

/** The fields of `.claude-plugin/marketplace.json` this repo checks. */
interface MarketplaceManifest {
	name?: string;
	plugins?: { name?: string; source?: unknown }[];
}

/**
 * Check the distribution metadata around the corpus: install profiles reference real skills,
 * and the plugin marketplace manifests agree with each other and with package.json.
 * `npx skills add` needs none of these files, so each check only runs when its file exists.
 *
 * @param root - The repo root.
 * @param skills - The loaded skills.
 * @returns Distribution issues.
 */
export function validateDistribution(root: string, skills: Skill[]): Issue[] {
	const issues: Issue[] = [];
	const add = (skill: string, rule: string, message: string) => issues.push({ skill, level: "error", rule, message });
	const names = new Set(skills.map((s) => s.name));

	for (const [profile, members] of Object.entries(loadProfiles(root))) {
		for (const member of members) {
			if (!names.has(member)) add("profiles.json", "profile.unknown-skill", `profile "${profile}" lists unknown skill "${member}"`);
		}
	}

	const pkg = readJson<{ version?: string }>(path.join(root, "package.json"));
	const plugin = readJson<PluginManifest>(path.join(root, ".claude-plugin", "plugin.json"));
	const marketplace = readJson<MarketplaceManifest>(path.join(root, ".claude-plugin", "marketplace.json"));

	if (plugin && pkg?.version && plugin.version !== pkg.version) {
		add("plugin.json", "plugin.version", `version ${plugin.version ?? "(none)"} != package.json ${pkg.version}; run pnpm version:packages`);
	}

	if (marketplace) {
		const entry = marketplace.plugins?.find((p) => p.name === plugin?.name);

		if (!entry) add("marketplace.json", "marketplace.plugin", `no plugin entry named "${plugin?.name ?? "(missing plugin.json)"}"`);
		else if (entry.source !== "./") add("marketplace.json", "marketplace.source", 'the plugin entry must use source "./" (this repository)');
	}

	return issues;
}
