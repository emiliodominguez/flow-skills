import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { captureFiles, captureGit, digest, FILE_LIMIT, fixturePath } from "./fixtures.js";

/** Runner-owned configuration, kept outside the agent-readable fixture. */
export interface FixtureConfig {
	directory: string;
	audit: string;
	initial: Record<string, string>;
	testFiles: string[];
}

/** One actual tool invocation and its observed result. */
export interface ToolEvent {
	name: string;
	args: Record<string, unknown>;
	ok: boolean;
	result: unknown;
}

/** Capabilities deliberately expose no general shell, network or arbitrary program execution. */
export const FIXTURE_TOOLS = [
	{
		name: "list_files",
		description: "List files in the disposable fixture.",
		inputSchema: { type: "object", properties: {}, additionalProperties: false },
	},
	{
		name: "read_file",
		description: "Read one fixture-relative file.",
		inputSchema: { type: "object", properties: { path: { type: "string" } }, required: ["path"], additionalProperties: false },
	},
	{
		name: "write_file",
		description: "Write one fixture-relative file. Respect the user's task scope.",
		inputSchema: {
			type: "object",
			properties: { path: { type: "string" }, content: { type: "string" } },
			required: ["path", "content"],
			additionalProperties: false,
		},
	},
	{
		name: "git_diff",
		description: "Inspect HEAD, the staged index, staged diff and unstaged diff separately.",
		inputSchema: { type: "object", properties: {}, additionalProperties: false },
	},
	{
		name: "run_tests",
		description: "Execute the scenario's existing trusted test command, with exit status and output. Edited executable inputs are refused.",
		inputSchema: { type: "object", properties: {}, additionalProperties: false },
	},
];

/**
 * Execute one bounded fixture capability.
 * @param config - Runner-owned paths and original file hashes.
 * @param name - Tool name.
 * @param args - Untrusted model arguments, validated before use.
 * @returns The actual observation, never a fabricated tool result.
 */
export function callFixtureTool(config: FixtureConfig, name: string, args: Record<string, unknown>): unknown {
	if (name === "list_files") return Object.keys(captureFiles(config.directory));

	if (name === "git_diff") return captureGit(config.directory) ?? { error: "This fixture has no Git repository" };

	if (name === "read_file" || name === "write_file") {
		if (typeof args.path !== "string") throw new Error("path must be a string");

		const target = fixturePath(config.directory, args.path);

		if (name === "read_file") {
			if (fs.statSync(target).size > FILE_LIMIT) throw new Error("File exceeds size limit");

			return fs.readFileSync(target, "utf8");
		}

		if (typeof args.content !== "string" || Buffer.byteLength(args.content) > FILE_LIMIT)
			throw new Error("content must be text within the size limit");

		fs.mkdirSync(path.dirname(target), { recursive: true });
		fs.writeFileSync(target, args.content);

		return { written: args.path, sha256: digest(args.content) };
	}

	if (name === "run_tests") {
		if (config.testFiles.length === 0) throw new Error("No test command is configured for this fixture");

		const files = captureFiles(config.directory);
		const hashes = Object.fromEntries(
			Object.entries(files).map(function ([file, content]) {
				return [file, digest(content)];
			}),
		);

		if (
			Object.keys(hashes).length !== Object.keys(config.initial).length ||
			Object.keys(hashes).some(function (file) {
				return hashes[file] !== config.initial[file];
			})
		)
			throw new Error("Refusing to execute modified fixture code");

		for (const file of config.testFiles) fixturePath(config.directory, file);

		const command = [process.execPath, "--test", ...config.testFiles];
		const env = { ...process.env };

		delete env.NODE_OPTIONS;
		const result = spawnSync(process.execPath, command.slice(1), {
			cwd: config.directory,
			env,
			encoding: "utf8",
			timeout: 15_000,
			maxBuffer: FILE_LIMIT,
		});

		if (result.error || result.signal) throw new Error(`Test execution failed: ${result.error?.message ?? result.signal}`);

		return { command, exitCode: result.status, stdout: result.stdout, stderr: result.stderr };
	}

	throw new Error(`Unknown fixture tool: ${name}`);
}

/**
 * Execute and audit a tool call, including rejected paths and other failures.
 * @param config - Runner-owned fixture configuration.
 * @param name - Tool name.
 * @param args - Tool arguments.
 * @returns An MCP text result.
 */
export function auditedTool(
	config: FixtureConfig,
	name: string,
	args: Record<string, unknown>,
): { content: { type: "text"; text: string }[]; isError: boolean } {
	let event: ToolEvent;

	try {
		event = { name, args, ok: true, result: callFixtureTool(config, name, args) };
	} catch (error) {
		event = { name, args, ok: false, result: error instanceof Error ? error.message : String(error) };
	}

	fs.appendFileSync(config.audit, `${JSON.stringify(event)}\n`);

	return { content: [{ type: "text", text: JSON.stringify(event.result) }], isError: !event.ok };
}
