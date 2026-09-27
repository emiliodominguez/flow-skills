/** Minimal Messages API client shared by the optional model evals. None of them run in CI. */
const API = "https://api.anthropic.com/v1/messages";

/** Credentials and model for a model-backed eval run. */
export interface ModelConfig {
	apiKey: string;
	model: string;
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
 * Read the model configuration, exiting with status 2 ("not run") when it is missing.
 *
 * @param label - Name of the eval, used in the not-run message.
 * @returns The configured API key and model.
 */
export function requireModel(label: string): ModelConfig {
	const apiKey = process.env.ANTHROPIC_API_KEY;
	const model = process.env.ANTHROPIC_MODEL;

	if (!apiKey || !model) {
		console.error(`${label} not run: set ANTHROPIC_API_KEY and an available ANTHROPIC_MODEL.`);
		console.error("This command fails when unavailable; pnpm test needs no API credentials.");
		process.exit(2);
	}

	return { apiKey, model };
}

/**
 * Send one user prompt, optionally with a system prompt, and return the text.
 *
 * @param config - Credentials and model.
 * @param prompt - The user message.
 * @param options - Optional system prompt and output token cap.
 * @returns The concatenated text blocks and output token usage.
 */
export async function complete(config: ModelConfig, prompt: string, options: { system?: string; maxTokens?: number } = {}): Promise<Completion> {
	const res = await fetch(API, {
		method: "POST",
		signal: AbortSignal.timeout(120_000),
		headers: { "x-api-key": config.apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
		body: JSON.stringify({
			model: config.model,
			max_tokens: options.maxTokens ?? 2048,
			...(options.system ? { system: options.system } : {}),
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
