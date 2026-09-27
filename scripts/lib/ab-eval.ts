import type { Verdict } from "./eval-verdict.js";

/** One with/without comparison case: a situation and the observable qualities a good answer has. */
export interface AbCase {
	id: string;
	skill: string;
	prompt: string;
	assertions: string[];
}

/** Graded output of one run of one variant. */
export interface AbRun {
	id: string;
	variant: "with" | "without";
	verdicts: Verdict[];
	outputTokens: number;
}

/** Pass rates for one assertion with and without the skill. */
export interface AssertionSummary {
	assertion: string;
	with: number;
	without: number;
	flag: "ok" | "passes either way" | "worse with skill" | "fails either way";
}

/** Comparison summary for one case. */
export interface AbSummary {
	id: string;
	with: number;
	without: number;
	tokensWith: number;
	tokensWithout: number;
	assertions: AssertionSummary[];
}

/**
 * Check A/B cases against the discovered skills.
 *
 * @param cases - Parsed `evals/ab.json`.
 * @param names - Every discovered skill name.
 * @returns Human-readable problems; empty when valid.
 */
export function validateAbCases(cases: AbCase[], names: string[]): string[] {
	const problems: string[] = [];
	const ids = new Set<string>();

	for (const item of cases) {
		if (!/^[a-z0-9-]+$/.test(item.id ?? "")) problems.push(`case id "${item.id}" must be kebab-case`);

		if (ids.has(item.id)) problems.push(`${item.id}: duplicate id`);

		ids.add(item.id);

		if (!names.includes(item.skill)) problems.push(`${item.id}: unknown skill ${item.skill}`);

		if (!item.prompt?.trim()) problems.push(`${item.id}: empty prompt`);

		if (!Array.isArray(item.assertions) || item.assertions.length < 2) problems.push(`${item.id}: needs at least 2 assertions`);

		if (new Set(item.assertions ?? []).size !== (item.assertions ?? []).length) problems.push(`${item.id}: duplicate assertions`);
	}

	return problems;
}

/**
 * Build the judge prompt for one response. Output is parsed with `parseVerdicts`, keyed by assertion.
 *
 * @param prompt - The situation the agent answered.
 * @param response - The agent's answer.
 * @param assertions - Observable qualities to grade.
 * @returns The judge prompt.
 */
export function judgePrompt(prompt: string, response: string, assertions: string[]): string {
	return [
		"Grade a coding agent's answer. Judge only what the answer actually says it does or produces, strictly and literally.",
		"",
		"SITUATION:",
		prompt,
		"",
		"ANSWER:",
		"---",
		response,
		"---",
		"",
		"Assertions:",
		assertions.map((a, i) => `${i + 1}. ${a}`).join("\n"),
		"",
		'Return ONLY a JSON array: [{"beat":"<assertion text exactly>","present":true|false,"why":"<short>"}].',
	].join("\n");
}

/**
 * Flag an assertion by how its pass rate moves with the skill.
 *
 * @param withRate - Pass rate with the skill loaded.
 * @param withoutRate - Pass rate without it.
 * @returns A flag; anything but "ok" means the assertion or the skill needs attention.
 */
function flagFor(withRate: number, withoutRate: number): AssertionSummary["flag"] {
	if (withRate < withoutRate) return "worse with skill";

	if (withoutRate === 1) return "passes either way";

	if (withRate === 0) return "fails either way";

	return "ok";
}

/**
 * Summarize graded runs into per-case and per-assertion pass rates.
 *
 * @param cases - The cases that were run.
 * @param runs - Every graded run.
 * @returns One summary per case, in case order.
 */
export function summarizeAb(cases: AbCase[], runs: AbRun[]): AbSummary[] {
	return cases.map((item) => {
		const mine = runs.filter((run) => run.id === item.id);

		/**
		 * Mean over runs of a numeric projection.
		 *
		 * @param list - Runs to average.
		 * @param value - Projection per run.
		 * @returns The mean, or 0 with no runs.
		 */
		function mean(list: AbRun[], value: (run: AbRun) => number): number {
			return list.length === 0 ? 0 : list.reduce((sum, run) => sum + value(run), 0) / list.length;
		}

		/**
		 * Pass rate of one assertion across runs.
		 *
		 * @param list - Runs to inspect.
		 * @param assertion - The assertion text.
		 * @returns Fraction of runs where it was present.
		 */
		function rate(list: AbRun[], assertion: string): number {
			return mean(list, (run) => (run.verdicts.find((v) => v.beat === assertion)?.present ? 1 : 0));
		}

		/**
		 * Share of assertions one run passed.
		 *
		 * @param run - A graded run.
		 * @returns Fraction of assertions present.
		 */
		function passShare(run: AbRun): number {
			return run.verdicts.filter((v) => v.present).length / Math.max(item.assertions.length, 1);
		}

		const withRuns = mine.filter((run) => run.variant === "with");
		const withoutRuns = mine.filter((run) => run.variant === "without");
		const assertions = item.assertions.map((assertion) => {
			const w = rate(withRuns, assertion);
			const wo = rate(withoutRuns, assertion);

			return { assertion, with: w, without: wo, flag: flagFor(w, wo) };
		});

		return {
			id: item.id,
			with: mean(withRuns, passShare),
			without: mean(withoutRuns, passShare),
			tokensWith: mean(withRuns, (run) => run.outputTokens),
			tokensWithout: mean(withoutRuns, (run) => run.outputTokens),
			assertions,
		};
	});
}
