import fs from "node:fs";
import path from "node:path";
import { findRepoRoot, loadConfig } from "../src/core/config.js";
import { discoverSkills } from "../src/core/registry.js";
import { parseVerdicts, type Verdict } from "./lib/eval-verdict.js";

/**
 * Optional model audit of instruction coverage. It does not execute an agent task.
 * Usage: pnpm eval:llm [skill-name]; requires ANTHROPIC_API_KEY and ANTHROPIC_MODEL.
 */
const API = "https://api.anthropic.com/v1/messages";
const MODEL = process.env.ANTHROPIC_MODEL;

interface AnthropicResponse {
	content?: { text?: string }[];
	error?: { message: string };
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
		signal: AbortSignal.timeout(60_000),
		headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
		body: JSON.stringify({ model: MODEL, max_tokens: 2048, messages: [{ role: "user", content: prompt }] }),
	});

	// Guard the parse so a non-JSON error body (5xx/gateway) throws our message, not a SyntaxError.
	const data = (await res.json().catch(() => ({}) as AnthropicResponse)) as AnthropicResponse;

	if (!res.ok || data.error) throw new Error(data.error?.message ?? `HTTP ${res.status}`);

	const text = data.content?.map((block) => block.text ?? "").join("") ?? "";

	return parseVerdicts(text, beats);
}

const apiKey = process.env.ANTHROPIC_API_KEY;

if (!apiKey || !MODEL) {
	console.error("Instruction audit not run: set ANTHROPIC_API_KEY and an available ANTHROPIC_MODEL.");
	console.error("This command fails when unavailable; pnpm test needs no API credentials.");
	process.exit(2);
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
