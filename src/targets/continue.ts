import type { Action } from "../core/install-fs.js";
import type { Skill } from "../core/skill.js";
import type { InstallContext, SkillStatus, Target } from "./types.js";
import { frontmatter, installFilePerSkill, MANAGED_LINE, statusFilePerSkill, uninstallFilePerSkill } from "./render.js";

/** Render a skill's Continue rule file (shared by install and drift detection). */
function build(skill: Skill): string {
	// Continue rules use `globs`/`alwaysApply` frontmatter; an empty glob + description
	// makes it a model-requested rule, mirroring on-demand skill invocation.
	const front = frontmatter({ description: skill.frontmatter.description, alwaysApply: false });
	return `${front}\n${MANAGED_LINE}\n\n${skill.body}\n`;
}

/**
 * Continue — one Markdown rule per skill under `.continue/rules/`. Continue reads
 * each `.md` in that directory as a rule; each skill becomes its own file and
 * uninstall only touches files carrying our marker.
 */
export const continueTarget: Target = {
	name: "continue",
	describe: "Continue — .continue/rules/<name>.md (one rule file per skill)",
	supportsSymlink: false,

	install(ctx: InstallContext): Action[] {
		return installFilePerSkill(ctx, "md", build);
	},

	uninstall(ctx: InstallContext): Action[] {
		return uninstallFilePerSkill(ctx, "md");
	},

	status(ctx: InstallContext): SkillStatus[] {
		return statusFilePerSkill(ctx, "md", build);
	},
};
