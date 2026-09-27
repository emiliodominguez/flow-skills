import fs from "node:fs";
import path from "node:path";
import { loadSkill, type Skill } from "./skill.js";

/**
 * Discover every skill under a skills directory (each subdir with a SKILL.md).
 *
 * @param skillsDir - Absolute path to the directory holding skill folders.
 * @returns Loaded skills, sorted by name.
 */
export function discoverSkills(skillsDir: string): Skill[] {
	if (!fs.existsSync(skillsDir)) return [];

	const skills: Skill[] = [];

	for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
		if (!entry.isDirectory()) continue;

		const dir = path.join(skillsDir, entry.name);

		if (fs.existsSync(path.join(dir, "SKILL.md"))) skills.push(loadSkill(dir));
	}

	return skills.sort((a, b) => a.name.localeCompare(b.name));
}
