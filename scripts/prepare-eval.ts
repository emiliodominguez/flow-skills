import fs from "node:fs";
import path from "node:path";
import { findRepoRoot } from "../src/core/repo.js";
import { prepareScenario, type Scenario } from "./lib/fixtures.js";

const root = findRepoRoot();
const scenarios = JSON.parse(fs.readFileSync(path.join(root, "evals/scenarios.json"), "utf8")) as Scenario[];
const [id, destination] = process.argv.slice(2);
const scenario = scenarios.find(function (entry) {
	return entry.id === id;
});

if (!scenario || !destination)
	throw new Error(
		`Usage: pnpm eval:prepare <${scenarios
			.map(function (entry) {
				return entry.id;
			})
			.join("|")}> <new-directory>`,
	);

const directory = path.resolve(destination);

prepareScenario(scenario, directory);
console.log(`Fixture: ${directory}`);
console.log(`Skill: ${path.join(root, "skills", scenario.skill, "SKILL.md")}`);
console.log(`Agent prompt: ${scenario.prompt}`);
console.log("Prepared only. No agent has run and no behavioral verdict has been issued.");
