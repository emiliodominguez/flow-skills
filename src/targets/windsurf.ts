import type { Action } from "../core/install-fs.js";
import type { InstallContext, Target } from "./types.js";
import { frontmatter, installFilePerSkill, MANAGED_LINE, uninstallFilePerSkill } from "./render.js";

/**
 * Windsurf — one Markdown rule per skill under `.windsurf/rules/`. The frontmatter
 * goes through the shared `frontmatter()` renderer so a description containing a
 * colon (e.g. "Out of scope: …") is quoted rather than emitted as invalid YAML.
 */
export const windsurfTarget: Target = {
	name: "windsurf",
	describe: "Windsurf — .windsurf/rules/<name>.md (one rule file per skill)",
	supportsSymlink: false,

	install(ctx: InstallContext): Action[] {
		return installFilePerSkill(ctx, "md", (skill) => {
			const front = frontmatter({ trigger: "model_decision", description: skill.frontmatter.description });
			return `${front}\n${MANAGED_LINE}\n\n${skill.body}\n`;
		});
	},

	uninstall(ctx: InstallContext): Action[] {
		return uninstallFilePerSkill(ctx, "md");
	},
};
