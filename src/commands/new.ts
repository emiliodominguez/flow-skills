import fs from "node:fs";
import path from "node:path";
import { findRepoRoot, loadConfig } from "../core/config.js";
import { log } from "../core/logger.js";

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Turn a kebab-case id into a Title Case heading (`ed-plan` → `Ed Plan`).
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
 * `new` — scaffold a new skill directory from the template.
 *
 * @param name - Kebab-case skill id (also the directory name).
 * @param opts - `description` for the frontmatter.
 */
export function newCommand(name: string, opts: { description?: string }): void {
	if (!KEBAB.test(name)) {
		log.error(`"${name}" is not kebab-case (a-z, 0-9, hyphens).`);
		process.exitCode = 1;
		return;
	}
	const root = findRepoRoot();
	const config = loadConfig(root);
	const dir = path.join(root, config.skillsDir, name);
	if (fs.existsSync(dir)) {
		log.error(`Skill "${name}" already exists at ${dir}`);
		process.exitCode = 1;
		return;
	}

	const template = fs.readFileSync(path.join(root, "templates", "SKILL.md.tmpl"), "utf8");
	const description = opts.description ?? `<one line: what it does — when to use / trigger phrases — handoff>.`;
	const content = template.replaceAll("{{name}}", name).replaceAll("{{description}}", description).replaceAll("{{title}}", titleize(name));

	fs.mkdirSync(dir, { recursive: true });
	fs.writeFileSync(path.join(dir, "SKILL.md"), content, "utf8");
	log.ok(`Created ${path.relative(root, path.join(dir, "SKILL.md"))}`);
	log.dim("Edit it, then run `agent-skills validate` and `agent-skills install`.");
}
