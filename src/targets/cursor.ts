import path from "node:path";
import type { Action } from "../core/install-fs.js";
import { writeFile } from "../core/install-fs.js";
import type { InstallContext, Target } from "./types.js";
import { frontmatter, MANAGED_LINE, removeIfManaged } from "./render.js";

/**
 * Cursor — one `.mdc` rule file per skill under `.cursor/rules/`. `alwaysApply:
 * false` + a description makes it an "agent-requested" rule Cursor pulls in when
 * relevant, mirroring how a skill is invoked on demand.
 */
export const cursorTarget: Target = {
	name: "cursor",
	describe: "Cursor — .cursor/rules/<name>.mdc (agent-requested rule per skill)",
	bundle: false,

	install(ctx: InstallContext): Action[] {
		return ctx.skills.map((skill) => {
			const dest = path.join(ctx.dest, `${skill.name}.mdc`);
			const content = `${frontmatter({ description: skill.frontmatter.description, globs: "", alwaysApply: false })}\n${MANAGED_LINE}\n\n${skill.body}\n`;
			return writeFile(dest, content, ctx.dryRun);
		});
	},

	uninstall(ctx: InstallContext): Action[] {
		return ctx.skills
			.map((skill) => removeIfManaged(path.join(ctx.dest, `${skill.name}.mdc`), ctx.dryRun))
			.filter((a): a is Action => a !== null);
	},
};
