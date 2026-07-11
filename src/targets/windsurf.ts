import path from "node:path";
import type { Action } from "../core/install-fs.js";
import { writeFile } from "../core/install-fs.js";
import type { InstallContext, Target } from "./types.js";
import { MANAGED_LINE, removeIfManaged } from "./render.js";

/**
 * Windsurf — one Markdown rule per skill under `.windsurf/rules/`. Windsurf reads
 * plain `.md` rule files with a leading activation hint; we use an on-demand
 * "glob"/"model decision" style header comment plus the skill body.
 */
export const windsurfTarget: Target = {
	name: "windsurf",
	describe: "Windsurf — .windsurf/rules/<name>.md (one rule file per skill)",
	bundle: false,

	install(ctx: InstallContext): Action[] {
		return ctx.skills.map((skill) => {
			const dest = path.join(ctx.dest, `${skill.name}.md`);
			const header = `---\ntrigger: model_decision\ndescription: ${skill.frontmatter.description}\n---`;
			const content = `${header}\n${MANAGED_LINE}\n\n${skill.body}\n`;
			return writeFile(dest, content, ctx.dryRun);
		});
	},

	uninstall(ctx: InstallContext): Action[] {
		return ctx.skills.map((skill) => removeIfManaged(path.join(ctx.dest, `${skill.name}.md`), ctx.dryRun)).filter((a): a is Action => a !== null);
	},
};
