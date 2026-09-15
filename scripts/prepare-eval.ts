import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { findRepoRoot } from "../src/core/config.js";

interface Scenario {
	id: string;
	skill: string;
	prompt: string;
	files: Record<string, string>;
	git?: boolean;
	stagedFiles?: Record<string, string>;
	workingFiles?: Record<string, string>;
}

const root = findRepoRoot();
const scenarios = JSON.parse(fs.readFileSync(path.join(root, "evals/scenarios.json"), "utf8")) as Scenario[];
const [id, destination] = process.argv.slice(2);
const scenario = scenarios.find(function (entry) {
	return entry.id === id;
});

if (!scenario || !destination) {
	throw new Error(`Usage: pnpm eval:prepare <${scenarios.map((entry) => entry.id).join("|")}> <new-directory>`);
}

const directory = path.resolve(destination);

/** Resolve only fixture-relative file paths, including on Windows. */
function fixturePath(file: string): string {
	const target = path.resolve(directory, file);
	const relative = path.relative(directory, target);

	if (!relative || relative === ".." || relative.startsWith(".." + path.sep) || path.isAbsolute(relative)) {
		throw new Error(`Fixture path escapes destination: ${file}`);
	}

	return target;
}

/** Write a trusted scenario layer under the newly created fixture directory. */
function writeLayer(files: Record<string, string> = {}): void {
	for (const [file, content] of Object.entries(files)) {
		const target = fixturePath(file);

		fs.mkdirSync(path.dirname(target), { recursive: true });
		fs.writeFileSync(target, content);
	}
}

/** Run fixture-local Git operations without changing global identity or config. */
function git(...args: string[]): void {
	execFileSync("git", ["-c", "user.name=Eval Fixture", "-c", "user.email=fixture@example.invalid", "-c", "commit.gpgsign=false", ...args], {
		cwd: directory,
		stdio: "pipe",
	});
}

// Validate every path before creating anything. mkdir refuses existing paths, even symlinks.
for (const layer of [scenario.files, scenario.stagedFiles ?? {}, scenario.workingFiles ?? {}]) {
	for (const file of Object.keys(layer)) fixturePath(file);
}

fs.mkdirSync(directory);
writeLayer(scenario.files);

if (scenario.git) {
	git("init", "--initial-branch=main");
	git("add", ".");
	git("commit", "-m", "Fixture baseline");
	git("switch", "-c", "feature/access");
	writeLayer(scenario.stagedFiles);
	git("add", ".");
	writeLayer(scenario.workingFiles);
}

console.log(`Fixture: ${directory}`);
console.log(`Skill: ${path.join(root, "skills", scenario.skill, "SKILL.md")}`);
console.log(`Agent prompt: ${scenario.prompt}`);
console.log("Prepared only. No agent has run and no behavioral verdict has been issued.");
