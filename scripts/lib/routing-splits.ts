import { validateTriggers, type TriggerCases } from "./trigger-eval.js";

/**
 * Normalize prompt identity across development and held-out splits.
 * @param prompt - A routing request.
 * @returns Case- and whitespace-insensitive text.
 */
export function promptKey(prompt: string): string {
	return prompt.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Enumerate a routing split without exposing labels to the model.
 * @param set - Requests grouped by owning skill.
 * @returns All positive and near-miss prompt texts.
 */
export function splitPrompts(set: Record<string, TriggerCases>): string[] {
	return Object.values(set).flatMap(function (item) {
		return [
			...item.should,
			...item.near.map(function (near) {
				return near.prompt;
			}),
		];
	});
}

/**
 * Validate split coverage and prohibit prompt reuse across the evaluation boundary.
 * @param development - Prompts used while tuning descriptions.
 * @param heldout - Frozen validation prompts, at least one positive and near miss per skill.
 * @param names - Installed corpus names.
 * @returns Problems, or an empty array for independent valid splits.
 */
export function validateTriggerSplits(development: Record<string, TriggerCases>, heldout: Record<string, TriggerCases>, names: string[]): string[] {
	const problems = [
		...validateTriggers(development, names).map(function (problem) {
			return `dev: ${problem}`;
		}),
		...validateTriggers(heldout, names, { should: 1, near: 1 }).map(function (problem) {
			return `heldout: ${problem}`;
		}),
	];

	if (problems.length) return problems;

	const seen = new Set<string>();

	for (const [split, set] of [
		["dev", development],
		["heldout", heldout],
	] as const) {
		for (const prompt of splitPrompts(set)) {
			const key = promptKey(prompt);

			if (seen.has(key)) problems.push(`${split}: reused normalized prompt: ${prompt}`);

			seen.add(key);
		}
	}

	return problems;
}
