import type { Action } from "../core/install-fs.js";
import type { Skill } from "../core/skill.js";
import type { InstallContext, SkillStatus, Target } from "./types.js";
import { frontmatter, installFilePerSkill, MANAGED_LINE, statusFilePerSkill, uninstallFilePerSkill } from "./render.js";

/**
 * Render a skill's Windsurf `.md` rule (shared by install and drift detection).
 *
 * @param skill - The skill to render.
 * @returns The rule file contents.
 */
function build(skill: Skill): string {
	const front = frontmatter({ trigger: "model_decision", description: skill.frontmatter.description });

	return `${front}\n${MANAGED_LINE}\n\n${skill.body}\n`;
}

/**
 * Windsurf - one Markdown rule per skill under `.devin/rules/`. The frontmatter
 * goes through the shared `frontmatter()` renderer so a description containing a
 * colon (e.g. "Out of scope: …") is quoted rather than emitted as invalid YAML.
 */
export const windsurfTarget: Target = {
	name: "windsurf",
	describe: "Windsurf - .devin/rules/<name>.md (one rule file per skill)",
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
