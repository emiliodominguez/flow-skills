/** A complete instruction-audit judgment for one declared beat. */
export interface Verdict {
	beat: string;
	present: boolean;
	why: string;
}

/**
 * Parse a complete judge response. Missing, duplicate, or unknown judgments fail closed.
 * This validates reporting integrity, not whether an agent performs the skill correctly.
 *
 * @param response - Raw model text, optionally inside one JSON code fence.
 * @param beats - Exact expected beat identifiers.
 * @returns One validated judgment per beat, in request order.
 */
export function parseVerdicts(response: string, beats: string[]): Verdict[] {
	if (beats.length === 0 || new Set(beats).size !== beats.length) {
		throw new Error("Expected beats must be non-empty and unique.");
	}

	const trimmed = response.trim();
	const fenced = /^```(?:json)?\s*\n([\s\S]*?)\n```$/.exec(trimmed);
	const parsed: unknown = JSON.parse(fenced?.[1] ?? trimmed);

	if (!Array.isArray(parsed) || parsed.length !== beats.length) {
		throw new Error(`Judge must return exactly ${beats.length} verdicts.`);
	}

	const expected = new Set(beats);
	const verdicts = new Map<string, Verdict>();

	for (const entry of parsed) {
		if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
			throw new Error("Each verdict must be an object.");
		}

		const value = entry as Record<string, unknown>;

		if (
			typeof value.beat !== "string" ||
			!expected.has(value.beat) ||
			verdicts.has(value.beat) ||
			typeof value.present !== "boolean" ||
			typeof value.why !== "string" ||
			value.why.trim().length === 0
		) {
			throw new Error("Verdicts need unique expected beats, boolean present values, and non-empty reasons.");
		}

		verdicts.set(value.beat, { beat: value.beat, present: value.present, why: value.why });
	}

	return beats.map(function (beat) {
		return verdicts.get(beat)!;
	});
}
