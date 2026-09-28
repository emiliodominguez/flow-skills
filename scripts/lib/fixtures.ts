import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

/** Trusted starting files and Git layers for one disposable agent exercise. */
export interface Scenario {
	id: string;
	skill: string;
	prompt: string;
	files: Record<string, string>;
	git?: boolean;
	stagedFiles?: Record<string, string>;
	workingFiles?: Record<string, string>;
}

/** Maximum content exposed by the fixture tools in one file. */
export const FILE_LIMIT = 1_000_000;

/**
 * Hash exact bytes for artifact and instruction provenance.
 * @param content - Input bytes or text.
 * @returns A SHA-256 digest.
 */
export function digest(content: string | Buffer): string {
	return createHash("sha256").update(content).digest("hex");
}

/**
 * Resolve a file inside a fixture without allowing traversal, Git internals or symlinks.
 * @param directory - Fixture root, which may not exist yet.
 * @param file - Portable relative file name.
 * @returns An absolute confined path.
 */
export function fixturePath(directory: string, file: string): string {
	const parts = file.split(/[\\/]/);

	if (
		!file ||
		path.isAbsolute(file) ||
		/[\0:]/.test(file) ||
		parts.some(function (part) {
			return !part || part === "." || part === ".." || part.toLowerCase() === ".git" || /[. ]$/.test(part);
		})
	) {
		throw new Error(`Invalid fixture path: ${file}`);
	}

	let current = path.resolve(directory);

	for (const part of ["", ...parts]) {
		current = path.join(current, part);

		if (fs.lstatSync(current, { throwIfNoEntry: false })?.isSymbolicLink()) throw new Error(`Symlink in fixture path: ${file}`);
	}

	return current;
}

/**
 * Run an explicit Git operation with fixture-local identity and no global hooks/config.
 * @param directory - Fixture root.
 * @param args - Git argument vector, never a shell command.
 * @returns Standard output.
 */
export function fixtureGit(directory: string, args: string[]): string {
	const env: NodeJS.ProcessEnv = { ...process.env, GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: os.devNull };

	delete env.GIT_DIR;
	delete env.GIT_WORK_TREE;
	delete env.GIT_INDEX_FILE;

	return execFileSync(
		"git",
		[
			"-c",
			"core.fsmonitor=false",
			"-c",
			`core.hooksPath=${os.devNull}`,
			"-c",
			"user.name=Eval Fixture",
			"-c",
			"user.email=fixture@example.invalid",
			"-c",
			"commit.gpgsign=false",
			...args,
		],
		{
			cwd: directory,
			env,
			encoding: "utf8",
			timeout: 15_000,
			maxBuffer: FILE_LIMIT,
		},
	);
}

/**
 * Read fixture files, rejecting symlinks and oversized content. Git state is captured separately.
 * @param directory - Fixture root.
 * @returns File contents keyed by portable relative path.
 */
export function captureFiles(directory: string): Record<string, string> {
	const files: Record<string, string> = {};
	let total = 0;

	/**
	 * Visit one confined directory.
	 * @param relative - Relative directory, empty at the root.
	 */
	function visit(relative: string): void {
		for (const entry of fs.readdirSync(path.join(directory, relative), { withFileTypes: true }).sort(function (a, b) {
			return a.name.localeCompare(b.name);
		})) {
			if (entry.name === ".git") continue;

			const name = relative ? `${relative}/${entry.name}` : entry.name;
			const target = fixturePath(directory, name);

			if (entry.isDirectory()) visit(name);
			else if (entry.isFile()) {
				const size = fs.statSync(target).size;

				total += size;

				if (size > FILE_LIMIT || total > FILE_LIMIT * 10) throw new Error("Fixture exceeds capture size limit");

				files[name] = fs.readFileSync(target, "utf8");
			} else throw new Error(`Unsupported fixture entry: ${name}`);
		}
	}

	visit("");

	return files;
}

/**
 * Create a fresh disposable scenario. Existing paths are never replaced.
 * @param scenario - Repository-owned fixture data.
 * @param directory - New directory, with an existing parent.
 */
export function prepareScenario(scenario: Scenario, directory: string): void {
	for (const layer of [scenario.files, scenario.stagedFiles ?? {}, scenario.workingFiles ?? {}]) {
		for (const file of Object.keys(layer)) fixturePath(directory, file);
	}

	fs.mkdirSync(directory);

	/**
	 * Write one trusted fixture layer.
	 * @param files - Relative file names and contents.
	 */
	function writeLayer(files: Record<string, string> = {}): void {
		for (const [file, content] of Object.entries(files)) {
			const target = fixturePath(directory, file);

			fs.mkdirSync(path.dirname(target), { recursive: true });
			fs.writeFileSync(target, content);
		}
	}

	writeLayer(scenario.files);

	if (scenario.git) {
		fixtureGit(directory, ["-c", "init.templateDir=", "init", "--initial-branch=main"]);
		fixtureGit(directory, ["add", "."]);
		fixtureGit(directory, ["commit", "-m", "Fixture baseline"]);
		fixtureGit(directory, ["switch", "-c", "feature/access"]);
		writeLayer(scenario.stagedFiles);
		fixtureGit(directory, ["add", "."]);
		writeLayer(scenario.workingFiles);
	}
}

/**
 * Capture the reviewed Git layers and index identity without refreshing the index.
 * @param directory - Fixture root.
 * @returns Git evidence, or undefined for non-Git fixtures.
 */
export function captureGit(directory: string): Record<string, string> | undefined {
	if (!fs.existsSync(path.join(directory, ".git"))) return undefined;

	return {
		head: fixtureGit(directory, ["rev-parse", "HEAD"]),
		index: fixtureGit(directory, ["ls-files", "--stage"]),
		staged: fixtureGit(directory, ["diff", "--no-ext-diff", "--no-textconv", "--cached"]),
		unstaged: fixtureGit(directory, ["diff", "--no-ext-diff", "--no-textconv"]),
	};
}
