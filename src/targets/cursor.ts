import type { Action } from "../core/install-fs.js";
import type { InstallContext, Target } from "./types.js";
import { frontmatter, installFilePerSkill, MANAGED_LINE, uninstallFilePerSkill } from "./render.js";

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
		return installFilePerSkill(ctx, "mdc", (skill) => {
			const front = frontmatter({ description: skill.frontmatter.description, globs: "", alwaysApply: false });
			return `${front}\n${MANAGED_LINE}\n\n${skill.body}\n`;
		});
	},

	uninstall(ctx: InstallContext): Action[] {
		return uninstallFilePerSkill(ctx, "mdc");
	},
};
