/** A near-miss prompt that shares vocabulary with a skill but should route elsewhere. */
export interface NearMiss {
	prompt: string;
	expect: string | null;
}

/** Trigger prompts for one skill: requests that should load it, and near misses that should not. */
export interface TriggerCases {
	should: string[];
	near: NearMiss[];
}

/** One routing case and the picks observed across repeated runs. */
export interface TriggerResult {
	owner: string;
	kind: "should" | "near";
	prompt: string;
	expect: string | null;
	picks: (string | null)[];
}

/** Per-skill routing score. */
export interface TriggerScore {
	skill: string;
	should: { passed: number; total: number };
	near: { passed: number; total: number };
}

/**
 * Check a trigger set's shape against the discovered skills.
 *
 * @param set - Parsed `evals/triggers.json`.
 * @param names - Every discovered skill name.
 * @returns Human-readable problems; empty when valid.
 */
export function validateTriggers(set: Record<string, TriggerCases>, names: string[]): string[] {
	const problems: string[] = [];
	const known = new Set(names);
	const seen = new Set<string>();

	for (const name of names) if (!set[name]) problems.push(`${name}: no trigger cases`);

	for (const [owner, cases] of Object.entries(set)) {
		if (!known.has(owner)) problems.push(`${owner}: not a skill`);

		if (!Array.isArray(cases.should) || cases.should.length < 3) problems.push(`${owner}: needs at least 3 should prompts`);

		if (!Array.isArray(cases.near) || cases.near.length < 2) problems.push(`${owner}: needs at least 2 near misses`);

		for (const prompt of [...(cases.should ?? []), ...(cases.near ?? []).map((n) => n.prompt)]) {
			const key = prompt.trim().toLowerCase();

			if (key.length === 0) problems.push(`${owner}: empty prompt`);

			if (seen.has(key)) problems.push(`${owner}: duplicate prompt "${prompt}"`);

			seen.add(key);
		}

		for (const near of cases.near ?? []) {
			if (near.expect === owner) problems.push(`${owner}: near miss expects its own skill`);

			if (near.expect !== null && !known.has(near.expect)) problems.push(`${owner}: near miss expects unknown ${near.expect}`);
		}
	}

	return problems;
}

/**
 * Build the routing prompt: the always-loaded skill index plus one user request.
 *
 * @param skills - Name and description for every skill, as a host would index them.
 * @param request - The user request to route.
 * @returns A prompt asking for exactly one skill or none, as JSON.
 */
export function routerPrompt(skills: { name: string; description: string }[], request: string): string {
	return [
		"You are a coding agent. These skills are available; load one only when its description fits the request.",
		"",
		...skills.map((s) => `- ${s.name}: ${s.description}`),
		"",
		`User request: ${request}`,
		"",
		'Which single skill best fits this request? Choose null when none fits. Answer ONLY with JSON: {"skill": "<name>"} or {"skill": null}.',
	].join("\n");
}

/**
 * Parse a routing answer, failing closed on anything but one known skill or null.
 *
 * @param text - Raw model text, optionally fenced.
 * @param names - Every known skill name.
 * @returns The picked skill, or null for no skill.
 */
export function parsePick(text: string, names: string[]): string | null {
	const match = /\{[^{}]*\}/.exec(text);

	if (!match) throw new Error("Router returned no JSON object.");

	const parsed = JSON.parse(match[0]) as { skill?: unknown };

	if (parsed.skill === null) return null;

	if (typeof parsed.skill !== "string" || !names.includes(parsed.skill)) throw new Error(`Router picked an unknown skill: ${String(parsed.skill)}`);

	return parsed.skill;
}

/**
 * Score routing results per owning skill. A case passes when the majority of its runs picked the expected skill.
 *
 * @param results - Observed picks per case.
 * @returns Scores sorted by skill name.
 */
export function scoreTriggers(results: TriggerResult[]): TriggerScore[] {
	const scores = new Map<string, TriggerScore>();

	for (const result of results) {
		const score = scores.get(result.owner) ?? { skill: result.owner, should: { passed: 0, total: 0 }, near: { passed: 0, total: 0 } };
		const bucket = score[result.kind];
		const hits = result.picks.filter((pick) => pick === result.expect).length;

		bucket.total++;

		if (hits * 2 > result.picks.length) bucket.passed++;

		scores.set(result.owner, score);
	}

	return [...scores.values()].sort((a, b) => a.skill.localeCompare(b.skill));
}
