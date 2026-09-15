import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { discoverSkills } from "../src/core/registry";

// Cheap instruction-marker regression checks. These do not execute an agent or
// prove behavior; realistic task runs are described in evals/README.md.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const beats = JSON.parse(fs.readFileSync(path.join(root, "evals", "beats.json"), "utf8")) as Record<string, string[]>;
const skills = discoverSkills(path.join(root, "skills"));

describe("skill instruction markers", () => {
	it("every skill declares a non-empty beats entry", () => {
		for (const skill of skills) {
			expect(beats[skill.name], `${skill.name} has no beats entry in evals/beats.json`).toBeTruthy();
			expect((beats[skill.name] ?? []).length, `${skill.name} beats is empty`).toBeGreaterThanOrEqual(3);
		}
	});

	it("beats.json has no entry for a skill that no longer exists", () => {
		const names = new Set(skills.map((s) => s.name));

		for (const name of Object.keys(beats)) {
			expect(names.has(name), `beats.json references unknown skill "${name}"`).toBe(true);
		}
	});

	for (const skill of skills) {
		it(`${skill.name}: its body includes every declared instruction marker`, () => {
			const body = skill.body.toLowerCase().replace(/\s+/g, " ");
			const missing = (beats[skill.name] ?? []).filter((beat) => !body.includes(beat.toLowerCase().replace(/\s+/g, " ")));

			expect(missing, `${skill.name} no longer mentions: ${missing.join(", ")}`).toEqual([]);
		});
	}
});
