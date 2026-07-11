import type { Action } from "../core/install-fs.js";
import { readManagedBlock, removeManagedBlock, writeManagedBlock } from "../core/install-fs.js";
import type { InstallContext, SkillStatus, Target } from "./types.js";
import type { Skill } from "../core/skill.js";

const HEADING = "# Agent skills";

/**
 * Render one skill as a delimited AGENTS.md section. The `<!-- skill:name -->`
 * markers (not `##` or `---`, both of which appear inside skill bodies) are what
 * we parse on, so a section can always be found and replaced unambiguously.
 */
function section(skill: Skill): string {
	return `<!-- skill:${skill.name} -->\n## ${skill.name}\n\n_${skill.frontmatter.description}_\n\n${skill.body}\n<!-- /skill:${skill.name} -->`;
}

/** Parse an existing managed block into a name → delimited-section map. */
function parseSections(inner: string | null): Map<string, string> {
	const map = new Map<string, string>();
	if (!inner) return map;
	const re = /<!-- skill:(\S+) -->\n[\s\S]*?\n<!-- \/skill:\1 -->/g;
	for (const match of inner.matchAll(re)) map.set(match[1]!, match[0]);
	return map;
}

/** Render the full managed block from the section map, sorted for stable diffs. */
function renderBlock(map: Map<string, string>): string {
	const sections = [...map.keys()].sort().map((name) => map.get(name)!);
	return `${HEADING}\n\n${sections.join("\n\n")}`;
}

/**
 * Codex / AGENTS.md — a single bundle file. Skills are merged as delimited
 * sections inside one managed block: a partial `install`/`uninstall` upserts or
 * removes only the named skills, leaving both the other skills and any
 * surrounding user content untouched.
 */
export const codexTarget: Target = {
	name: "codex",
	describe: "Codex — AGENTS.md (skills merged as sections in one managed block)",
	supportsSymlink: false,

	install(ctx: InstallContext): Action[] {
		const map = parseSections(readManagedBlock(ctx.dest));
		for (const skill of ctx.skills) map.set(skill.name, section(skill));
		return [writeManagedBlock(ctx.dest, renderBlock(map), ctx.dryRun)];
	},

	uninstall(ctx: InstallContext): Action[] {
		const map = parseSections(readManagedBlock(ctx.dest));
		for (const skill of ctx.skills) map.delete(skill.name);
		if (map.size === 0) {
			const action = removeManagedBlock(ctx.dest, ctx.dryRun);
			return action ? [action] : [];
		}
		return [writeManagedBlock(ctx.dest, renderBlock(map), ctx.dryRun)];
	},

	status(ctx: InstallContext): SkillStatus[] {
		const map = parseSections(readManagedBlock(ctx.dest));
		return ctx.skills.map((skill) => {
			const existing = map.get(skill.name);
			if (existing === undefined) return { skill: skill.name, state: "missing" };
			return { skill: skill.name, state: existing === section(skill) ? "generated" : "drifted" };
		});
	},
};
