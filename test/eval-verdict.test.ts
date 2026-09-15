import { describe, expect, it } from "vitest";
import { parseVerdicts } from "../scripts/lib/eval-verdict.js";

const beats = ["acceptance", "evidence"];
const judgments = [
	{ beat: "evidence", present: false, why: "No artifact identity is recorded." },
	{ beat: "acceptance", present: true, why: "Each outcome has an explicit gate." },
];

describe("instruction-audit verdict integrity", function () {
	it("accepts a complete response and preserves negative judgments", function () {
		expect(parseVerdicts(JSON.stringify(judgments), beats)).toEqual([judgments[1], judgments[0]]);
	});

	it("accepts one complete JSON fence", function () {
		expect(parseVerdicts("```json\n" + JSON.stringify(judgments) + "\n```", beats)).toHaveLength(2);
	});

	it.each([
		[],
		[judgments[0]],
		[judgments[0], judgments[0]],
		[judgments[0], { beat: "invented", present: true, why: "Fine" }],
		[judgments[0], { beat: "acceptance", present: "true", why: "Fine" }],
		[judgments[0], { beat: "acceptance", present: true, why: " " }],
		[judgments[0], null],
		{ verdicts: judgments },
	])("rejects incomplete or malformed judgments: %j", function (value) {
		expect(function () {
			parseVerdicts(JSON.stringify(value), beats);
		}).toThrow();
	});

	it("does not recover a convenient array from a truncated or ambiguous response", function () {
		for (const value of ["Approved: " + JSON.stringify(judgments), JSON.stringify(judgments).slice(0, -1)]) {
			expect(function () {
				parseVerdicts(value, beats);
			}).toThrow();
		}
	});

	it("rejects an empty or duplicated expected contract", function () {
		for (const expected of [[], ["acceptance", "acceptance"]]) {
			expect(function () {
				parseVerdicts("[]", expected);
			}).toThrow();
		}
	});
});
