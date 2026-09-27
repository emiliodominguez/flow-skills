import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { discoverSkills } from "../src/core/registry";
import { loadProfiles } from "../src/core/repo";

// The README hand-writes a few facts about the corpus; keep them from drifting.
const root = path.resolve(import.meta.dirname, "..");
const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
const skills = discoverSkills(path.join(root, "skills"));

describe("README", () => {
	it("states the actual skill count in the badge and the intro", () => {
		expect(readme).toContain(`badge/skills-${skills.length}-`);
		expect(readme).toContain(`set of ${skills.length} [Agent Skills]`);
	});

	it("lists every profile with exactly its profiles.json members", () => {
		for (const [name, members] of Object.entries(loadProfiles(root))) {
			const row = new RegExp(`^\\| \`${name}\`\\s*\\| (.+?)\\s*\\|$`, "m").exec(readme);

			expect(row, `README has no row for profile ${name}`).not.toBeNull();
			expect(row![1]!.split(", "), name).toEqual(members.map((member) => member.replace(/^flow-/, "")));
		}
	});

	it("names only skills that exist", () => {
		const names = new Set(skills.map((skill) => skill.name));

		for (const [, ref] of readme.matchAll(/`(flow-[a-z-]+)`/g)) expect(names.has(ref!), ref).toBe(true);
	});
});
