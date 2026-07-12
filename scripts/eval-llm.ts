import fs from "node:fs";
import path from "node:path";
import { findRepoRoot, loadConfig } from "../src/core/config.js";
import { discoverSkills } from "../src/core/registry.js";

/**
 * LLM-graded behavioral eval. For each skill, a judge model decides whether an
 * agent faithfully following the skill would exhibit each of its declared beats
 * (see `evals/beats.json`). The cheap, model-free version runs in `pnpm test`;
 * this is the "real" grader and is gated on ANTHROPIC_API_KEY.
 *
 * Usage: `pnpm eval:llm [skill-name]` (omit the name to grade every skill).
 */
const API = "https://api.anthropic.com/v1/messages";
const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";

interface AnthropicResponse {
	content?: { type: string; text?: string }[];
	error?: { message: string };
}

interface Verdict {
	beat: string;
	present: boolean;
	why?: string;
}

/**
 * Ask the judge model which beats a skill's instructions would exhibit.
 *
 * @param body - The skill's instruction body.
 * @param beats - The declared beats to grade.
 * @param apiKey - The Anthropic API key.
 * @returns One verdict per beat.
 */
async function grade(body: string, beats: string[], apiKey: string): Promise<Verdict[]> {
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

	const res = await fetch(API, {
		method: "POST",
		headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
		body: JSON.stringify({ model: MODEL, max_tokens: 1024, messages: [{ role: "user", content: prompt }] }),
	});

	const data = (await res.json()) as AnthropicResponse;

	if (!res.ok || data.error) throw new Error(data.error?.message ?? `HTTP ${res.status}`);

	const text = data.content?.map((block) => block.text ?? "").join("") ?? "";
	const json = /\[[\s\S]*\]/.exec(text);

	if (!json) throw new Error(`judge did not return JSON: ${text.slice(0, 120)}`);

	return JSON.parse(json[0]) as Verdict[];
}

const apiKey = process.env.ANTHROPIC_API_KEY;

if (!apiKey) {
	console.log("ANTHROPIC_API_KEY is not set — skipping LLM evals.");
	console.log("The model-free beat check runs in `pnpm test`. Set the key to grade with a judge model.");
	process.exit(0);
}

const root = findRepoRoot();
const skills = discoverSkills(path.join(root, loadConfig(root).skillsDir));
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
		const verdicts = await grade(skill.body, list, apiKey);
		const missing = verdicts.filter((v) => !v.present);

		console.log(`${missing.length === 0 ? "✓" : "✗"} ${skill.name} — ${list.length - missing.length}/${list.length} beats`);

		for (const miss of missing) {
			failed++;
			console.log(`    ✗ ${miss.beat} — ${miss.why ?? ""}`);
		}
	} catch (err) {
		failed++;
		console.log(`! ${skill.name} — eval error: ${err instanceof Error ? err.message : String(err)}`);
	}
}

if (failed > 0) process.exit(1);
