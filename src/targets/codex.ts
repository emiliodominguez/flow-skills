import type { Action } from "../core/install-fs.js";
import { removeManagedBlock, writeManagedBlock } from "../core/install-fs.js";
import type { InstallContext, Target } from "./types.js";

/**
 * Codex / AGENTS.md — a single bundle file. All selected skills are concatenated
 * into one managed block (delimited so any surrounding user content in AGENTS.md
 * is preserved). Read by Codex CLI and other tools that honor AGENTS.md.
 */
export const codexTarget: Target = {
	name: "codex",
	describe: "Codex — AGENTS.md (all skills bundled into one managed block)",
	bundle: true,

	install(ctx: InstallContext): Action[] {
		const sections = ctx.skills.map((skill) => `## ${skill.name}\n\n_${skill.frontmatter.description}_\n\n${skill.body}`);
		const content = `# Agent skills\n\n${sections.join("\n\n---\n\n")}`;
		return [writeManagedBlock(ctx.dest, content, ctx.dryRun)];
	},

	uninstall(ctx: InstallContext): Action[] {
		const action = removeManagedBlock(ctx.dest, ctx.dryRun);
		return action ? [action] : [];
	},
};
