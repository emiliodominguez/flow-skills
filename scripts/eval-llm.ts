import fs from "node:fs";
import path from "node:path";
import { findRepoRoot, SKILLS_DIR } from "../src/core/repo.js";
import { discoverSkills } from "../src/core/registry.js";
import { complete, type ModelConfig, requireModel } from "./lib/model.js";
import { parseVerdicts, type Verdict } from "./lib/eval-verdict.js";

// Optional model audit of instruction coverage. It does not execute an agent task.
// Usage: pnpm eval:llm [skill-name]; see scripts/lib/model.ts for backends.

/**
 * Ask the judge model which beats a skill's instructions would exhibit.
 *
 * @param body - The skill's instruction body.
 * @param beats - The declared beats to grade.
 * @param config - Credentials and model.
 * @returns One verdict per beat.
 */
async function grade(body: string, beats: string[], config: ModelConfig): Promise<Verdict[]> {
	const prompt = [
		'You are grading a reusable coding-agent "skill" (an instruction file).',
		"",
		"SKILL:",
		"---",
		body,
		"---",
		"",
		'For each "beat" below (a mechanic the skill claims to instruct), decide whether an agent',
		"that faithfully followed this skill would actually perform it. Be strict and literal.",
		"",
		beats.map((b, i) => `${i + 1}. ${b}`).join("\n"),
		"",
		'Return ONLY a JSON array: [{"beat":"<beat>","present":true|false,"why":"<short>"}].',
	].join("\n");

	const { text } = await complete(config, prompt);

	return parseVerdicts(text, beats);
}

const config = requireModel("Instruction audit");
const root = findRepoRoot();
const skills = discoverSkills(path.join(root, SKILLS_DIR));
const beats = JSON.parse(fs.readFileSync(path.join(root, "evals", "beats.json"), "utf8")) as Record<string, string[]>;
const only = process.argv[2];
const targets = only ? skills.filter((s) => s.name === only) : skills;

if (targets.length === 0) {
	console.error(`No skill named "${only}".`);
	process.exit(1);
}

let failed = 0;

for (const skill of targets) {
	const list = beats[skill.name] ?? [];

	try {
		const verdicts = await grade(skill.body, list, config);
		const missing = verdicts.filter((v) => !v.present);

		console.log(`${missing.length === 0 ? "✓" : "✗"} ${skill.name} - ${list.length - missing.length}/${list.length} beats`);

		for (const miss of missing) {
			failed++;
			console.log(`    ✗ ${miss.beat} - ${miss.why ?? ""}`);
		}
	} catch (err) {
		failed++;
		console.log(`! ${skill.name} - eval error: ${err instanceof Error ? err.message : String(err)}`);
	}
}

if (failed > 0) process.exit(1);
