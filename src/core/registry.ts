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

/**
 * Resolve a caller-supplied list of skill names to loaded skills, or return all.
 *
 * @param skillsDir - Absolute path to the skills directory.
 * @param names - Specific skill names, or empty/undefined for all.
 * @returns The matching skills.
 * @throws If a requested name is not found.
 */
export function selectSkills(skillsDir: string, names?: string[]): Skill[] {
	const all = discoverSkills(skillsDir);

	if (!names || names.length === 0) return all;

	const byName = new Map(all.map((s) => [s.name, s]));

	return names.map((n) => {
		const skill = byName.get(n);

		if (!skill) throw new Error(`Unknown skill "${n}". Run \`agent-skills list\` to see available skills.`);

		return skill;
	});
}
