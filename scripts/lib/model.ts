import { spawn } from "node:child_process";
import os from "node:os";

/**
 * Model access for the optional evals. None of them run in CI.
 *
 * Backends (EVAL_BACKEND):
 * - `api` (default): the Anthropic Messages API with ANTHROPIC_API_KEY and EVAL_MODEL or ANTHROPIC_MODEL.
 * - `claude`: the signed-in Claude Code CLI in headless mode, isolated from settings, memory files,
 *   skills and tools so the local install cannot leak into a baseline. EVAL_MODEL is optional.
 */
const API = "https://api.anthropic.com/v1/messages";
const BACKENDS = ["api", "claude"] as const;

/** Neutral system prompt for runs without a skill, so both variants start from the same base. */
export const BASE_SYSTEM = "You are a coding agent.";

/** Resolved backend, model and credentials for a model-backed eval run. */
export interface ModelConfig {
	backend: (typeof BACKENDS)[number];
	model?: string;
	apiKey?: string;
}

/** One model completion with the usage needed for cost comparisons. */
export interface Completion {
	text: string;
	outputTokens: number;
}

interface AnthropicResponse {
	content?: { text?: string }[];
	usage?: { output_tokens?: number };
	error?: { message: string };
}

/**
 * Resolve the backend from the environment, exiting with status 2 ("not run") when it is unusable.
 *
 * @param label - Name of the eval, used in the not-run message.
 * @param env - Environment to read, for tests.
 * @returns The backend configuration.
 */
export function requireModel(label: string, env: NodeJS.ProcessEnv = process.env): ModelConfig {
	const backend = (env.EVAL_BACKEND ?? "api") as ModelConfig["backend"];
	const model = env.EVAL_MODEL ?? env.ANTHROPIC_MODEL;

	if (!BACKENDS.includes(backend)) {
		console.error(`${label} not run: EVAL_BACKEND must be one of ${BACKENDS.join(", ")}.`);
		process.exit(2);
	}

	if (backend === "api" && (!env.ANTHROPIC_API_KEY || !model)) {
		console.error(`${label} not run: set ANTHROPIC_API_KEY and EVAL_MODEL, or use EVAL_BACKEND=claude with a signed-in CLI.`);
		console.error("This command fails when unavailable; pnpm test needs no credentials.");
		process.exit(2);
	}

	return { backend, model, apiKey: env.ANTHROPIC_API_KEY };
}

/**
 * Build headless CLI arguments that replace the default system prompt and disable tools, skills
 * and every settings source, so only the eval's own context reaches the model.
 *
 * @param system - System prompt for this call.
 * @param model - Optional model alias or ID.
 * @returns Arguments for the `claude` executable.
 */
export function claudeArgs(system: string, model?: string): string[] {
	const args = [
		"-p",
		"--output-format",
		"json",
		"--tools",
		"",
		"--disable-slash-commands",
		"--setting-sources",
		"",
		"--strict-mcp-config",
		"--mcp-config",
		'{"mcpServers":{}}',
		"--settings",
		'{"disableAllHooks":true,"autoMemoryEnabled":false}',
		"--no-chrome",
		"--no-session-persistence",
		"--system-prompt",
		system,
	];

	return model ? [...args, "--model", model] : args;
}

/**
 * Parse the CLI's JSON result, failing on error results.
 *
 * @param stdout - Raw standard output of `claude -p --output-format json`.
 * @returns The answer text and output token usage.
 */
export function parseClaudeOutput(stdout: string): Completion {
	const data = JSON.parse(stdout) as { result?: string; is_error?: boolean; usage?: { output_tokens?: number } };

	if (data.is_error || typeof data.result !== "string") throw new Error(`claude CLI error: ${data.result ?? "no result"}`);

	return { text: data.result, outputTokens: data.usage?.output_tokens ?? 0 };
}

/**
 * Run one headless CLI call with the prompt on standard input, from a neutral working directory.
 *
 * @param args - CLI arguments.
 * @param prompt - The user message.
 * @returns Standard output.
 */
function runClaude(args: string[], prompt: string): Promise<string> {
	return new Promise((resolve, reject) => {
		const child = spawn("claude", args, { cwd: os.tmpdir(), stdio: ["pipe", "pipe", "pipe"] });
		let out = "";
		let err = "";
		const timer = setTimeout(() => child.kill(), 300_000);

		child.stdout.on("data", (chunk: Buffer) => (out += chunk.toString()));
		child.stderr.on("data", (chunk: Buffer) => (err += chunk.toString()));
		child.on("error", reject);
		child.on("close", (code) => {
			clearTimeout(timer);

			if (code === 0) resolve(out);
			else reject(new Error(`claude exited ${code}: ${(err || out).trim().slice(0, 300)}`));
		});
		child.stdin.end(prompt);
	});
}

/**
 * Call the Messages API.
 *
 * @param config - Backend configuration with an API key and model.
 * @param prompt - The user message.
 * @param system - Optional system prompt.
 * @param maxTokens - Output token cap.
 * @returns The answer text and output token usage.
 */
async function callApi(config: ModelConfig, prompt: string, system: string | undefined, maxTokens: number): Promise<Completion> {
	const res = await fetch(API, {
		method: "POST",
		signal: AbortSignal.timeout(120_000),
		headers: { "x-api-key": config.apiKey ?? "", "anthropic-version": "2023-06-01", "content-type": "application/json" },
		body: JSON.stringify({
			model: config.model,
			max_tokens: maxTokens,
			...(system ? { system } : {}),
			messages: [{ role: "user", content: prompt }],
		}),
	});

	// Guard the parse so a non-JSON error body (5xx/gateway) throws our message, not a SyntaxError.
	const data = (await res.json().catch(() => ({}) as AnthropicResponse)) as AnthropicResponse;

	if (!res.ok || data.error) throw new Error(data.error?.message ?? `HTTP ${res.status}`);

	return {
		text: data.content?.map((block) => block.text ?? "").join("") ?? "",
		outputTokens: data.usage?.output_tokens ?? 0,
	};
}

/**
 * Send one user prompt through the configured backend and return the text.
 *
 * @param config - Backend configuration.
 * @param prompt - The user message.
 * @param options - Optional system prompt and output token cap (the CLI backend ignores the cap).
 * @returns The answer text and output token usage.
 */
export async function complete(config: ModelConfig, prompt: string, options: { system?: string; maxTokens?: number } = {}): Promise<Completion> {
	if (config.backend === "claude") return parseClaudeOutput(await runClaude(claudeArgs(options.system ?? BASE_SYSTEM, config.model), prompt));

	return callApi(config, prompt, options.system ?? BASE_SYSTEM, options.maxTokens ?? 2048);
}

/**
 * Map items through an async function with bounded concurrency, preserving order.
 *
 * @param items - Inputs.
 * @param limit - Maximum calls in flight.
 * @param fn - Async mapper.
 * @returns Results in input order.
 */
export async function mapPool<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
	const results = new Array<R>(items.length);
	let next = 0;

	/** Pull items until the queue is empty. */
	async function worker(): Promise<void> {
		while (next < items.length) {
			const index = next++;

			results[index] = await fn(items[index] as T, index);
		}
	}

	await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));

	return results;
}

/**
 * Read a numeric `--name value` flag from argv.
 *
 * @param argv - Process arguments.
 * @param name - Flag name without dashes.
 * @param fallback - Value when the flag is absent.
 * @returns The parsed positive number.
 */
export function numberFlag(argv: string[], name: string, fallback: number): number {
	const index = argv.indexOf(`--${name}`);

	if (index === -1) return fallback;

	const value = Number(argv[index + 1]);

	if (!Number.isFinite(value) || value <= 0) throw new Error(`--${name} needs a positive number`);

	return value;
}
