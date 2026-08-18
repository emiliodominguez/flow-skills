import type { Action } from "../core/install-fs.js";
import type { Skill } from "../core/skill.js";
import type { InstallContext, SkillStatus, Target } from "./types.js";
import { frontmatter, installFilePerSkill, MANAGED_LINE, statusFilePerSkill, uninstallFilePerSkill } from "./render.js";

/**
 * Render a skill's Cline rule file (shared by install and drift detection).
 *
 * @param skill - The skill to render.
 * @returns The rule file contents.
 */
function build(skill: Skill): string {
	const front = frontmatter({ description: skill.frontmatter.description });

	return `${front}\n${MANAGED_LINE}\n\n${skill.body}\n`;
}

/**
 * Cline - one Markdown rule per skill under `.clinerules/`. Cline loads every
 * file in that directory as an always-on instruction, so each skill becomes its
 * own file and uninstall only touches files carrying our marker.
 */
export const clineTarget: Target = {
	name: "cline",
	describe: "Cline - .clinerules/<name>.md (one rule file per skill)",
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
