import fs from "node:fs";
import path from "node:path";
import { findRepoRoot, SKILLS_DIR } from "../core/repo.js";
import { KEBAB } from "../core/skill.js";
import { log } from "../core/logger.js";

/**
 * Turn a kebab-case id into a Title Case heading (`flow-plan` → `Flow Plan`).
 *
 * @param name - Kebab-case skill id.
 * @returns A human title.
 */
function titleize(name: string): string {
	return name
		.split("-")
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
		.join(" ");
}

/**
 * `new` - scaffold a new skill directory from the template.
 *
 * @param name - Kebab-case skill id (also the directory name).
 * @param opts - `description` for the frontmatter.
 */
export function newCommand(name: string, opts: { description?: string }): void {
	if (!KEBAB.test(name) || name.length > 64) {
		log.error(`"${name}" must be kebab-case (a-z, 0-9, hyphens) and at most 64 characters.`);
		process.exitCode = 1;

		return;
	}

	const root = findRepoRoot();
	const dir = path.join(root, SKILLS_DIR, name);

	if (fs.existsSync(dir)) {
		log.error(`Skill "${name}" already exists at ${dir}`);
		process.exitCode = 1;

		return;
	}

	const template = fs.readFileSync(path.join(root, "templates", "SKILL.md.tmpl"), "utf8");
	const description = opts.description ?? "<What it does. Use when <triggers>. Hands off to `<next-skill>`.>";
	const content = template
		.replaceAll("{{name}}", name)
		.replaceAll("{{description}}", JSON.stringify(description))
		.replaceAll("{{title}}", titleize(name));

	fs.mkdirSync(dir, { recursive: true });
	fs.writeFileSync(path.join(dir, "SKILL.md"), content, "utf8");
	log.ok(`Created ${path.relative(root, path.join(dir, "SKILL.md"))}`);
	log.muted("Edit it, add an evals/beats.json entry, then run `pnpm validate` and `pnpm docs:gen`.");
}
