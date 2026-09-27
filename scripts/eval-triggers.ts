import fs from "node:fs";
import path from "node:path";
import { findRepoRoot, SKILLS_DIR } from "../src/core/repo.js";
import { discoverSkills } from "../src/core/registry.js";
import { complete, numberFlag, requireModel } from "./lib/anthropic.js";
import { parsePick, routerPrompt, scoreTriggers, validateTriggers, type TriggerCases, type TriggerResult } from "./lib/trigger-eval.js";

/**
 * Optional routing eval: does the description index send each request to the right skill, or to none?
 * Usage: pnpm eval:triggers [skill-name] [--runs 3] [--min 0.9]; requires ANTHROPIC_API_KEY and ANTHROPIC_MODEL.
 */
const root = findRepoRoot();
const skills = discoverSkills(path.join(root, SKILLS_DIR));
const names = skills.map((s) => s.name);
const set = JSON.parse(fs.readFileSync(path.join(root, "evals", "triggers.json"), "utf8")) as Record<string, TriggerCases>;
const problems = validateTriggers(set, names);

if (problems.length > 0) {
	for (const problem of problems) console.error(`✗ ${problem}`);

	process.exit(1);
}

const config = requireModel("Trigger eval");
const argv = process.argv.slice(2);
const only = argv.find((arg) => !arg.startsWith("--") && names.includes(arg));
const runs = numberFlag(argv, "runs", 1);
const min = numberFlag(argv, "min", 0.9);
const index = skills.map((s) => ({ name: s.name, description: s.frontmatter.description }));
const results: TriggerResult[] = [];

for (const [owner, cases] of Object.entries(set)) {
	if (only && owner !== only) continue;

	const queue = [
		...cases.should.map((prompt) => ({ kind: "should" as const, prompt, expect: owner })),
		...cases.near.map((near) => ({ kind: "near" as const, prompt: near.prompt, expect: near.expect })),
	];

	for (const item of queue) {
		const picks: (string | null)[] = [];

		for (let i = 0; i < runs; i++) {
			try {
				const { text } = await complete(config, routerPrompt(index, item.prompt), { maxTokens: 64 });

				picks.push(parsePick(text, names));
			} catch (err) {
				console.error(`! ${owner}: ${err instanceof Error ? err.message : String(err)}`);
				picks.push("error");
			}
		}

		results.push({ owner, ...item, picks });
	}
}

let passed = 0;
let total = 0;

for (const score of scoreTriggers(results)) {
	passed += score.should.passed + score.near.passed;
	total += score.should.total + score.near.total;
	console.log(`${score.skill.padEnd(26)} should ${score.should.passed}/${score.should.total}  near ${score.near.passed}/${score.near.total}`);
}

const misses = results.filter((r) => r.picks.filter((p) => p === r.expect).length * 2 <= r.picks.length);

if (misses.length > 0) console.log("\nMisrouted:");

for (const miss of misses)
	console.log(`  [${miss.owner} ${miss.kind}] "${miss.prompt}" expected ${miss.expect ?? "none"}, got ${miss.picks.join(", ")}`);

const accuracy = total === 0 ? 0 : passed / total;

console.log(`\nRouting accuracy ${(accuracy * 100).toFixed(1)}% (${passed}/${total}, ${runs} run(s) per prompt, model ${config.model})`);

if (accuracy < min) process.exit(1);
