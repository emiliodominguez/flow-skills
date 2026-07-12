import type { Action } from "../core/install-fs.js";
import type { Skill } from "../core/skill.js";
import type { InstallContext, SkillStatus, Target } from "./types.js";
import { frontmatter, installFilePerSkill, MANAGED_LINE, statusFilePerSkill, uninstallFilePerSkill } from "./render.js";

/**
 * Render a skill's `.mdc` file contents (shared by install and drift detection).
 *
 * @param skill - The skill to render.
 * @returns The rule file contents.
 */
function build(skill: Skill): string {
	const front = frontmatter({ description: skill.frontmatter.description, globs: "", alwaysApply: false });

	return `${front}\n${MANAGED_LINE}\n\n${skill.body}\n`;
}

/**
 * Cursor — one `.mdc` rule file per skill under `.cursor/rules/`. `alwaysApply:
 * false` + a description makes it an "agent-requested" rule Cursor pulls in when
 * relevant, mirroring how a skill is invoked on demand.
 */
export const cursorTarget: Target = {
	name: "cursor",
	describe: "Cursor — .cursor/rules/<name>.mdc (agent-requested rule per skill)",
	supportsSymlink: false,

	install(ctx: InstallContext): Action[] {
		return installFilePerSkill(ctx, "mdc", build);
	},

	uninstall(ctx: InstallContext): Action[] {
		return uninstallFilePerSkill(ctx, "mdc");
	},

	status(ctx: InstallContext): SkillStatus[] {
		return statusFilePerSkill(ctx, "mdc", build);
	},
};
