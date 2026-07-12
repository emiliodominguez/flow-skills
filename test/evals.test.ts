import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { discoverSkills } from "../src/core/registry";

// A skill's "beats" are the distinctive mechanics it promises to instruct. This is a
// cheap, model-free behavioral contract: if a skill drifts away from a promised beat,
// the substring check fails. The LLM-graded version lives in `pnpm eval:llm`.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const beats = JSON.parse(fs.readFileSync(path.join(root, "evals", "beats.json"), "utf8")) as Record<string, string[]>;
const skills = discoverSkills(path.join(root, "skills"));

describe("skill behavioral beats", () => {
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
		it(`${skill.name}: its body still delivers every declared beat`, () => {
			const body = skill.body.toLowerCase();
			const missing = (beats[skill.name] ?? []).filter((beat) => !body.includes(beat.toLowerCase()));

			expect(missing, `${skill.name} no longer mentions: ${missing.join(", ")}`).toEqual([]);
		});
	}
});
