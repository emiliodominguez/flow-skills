import fs from "node:fs";
import { createInterface } from "node:readline";
import { auditedTool, FIXTURE_TOOLS, type FixtureConfig } from "./lib/fixture-tools.js";

// Minimal stdio MCP transport for the bounded, repository-owned evaluation fixture tools.
const config = JSON.parse(fs.readFileSync(process.argv[2]!, "utf8")) as FixtureConfig;
const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });

for await (const line of lines) {
	let id: unknown = null;

	try {
		const request = JSON.parse(line) as { id?: unknown; method: string; params?: Record<string, unknown> };

		if (request.id === undefined) continue;

		id = request.id;
		let result: unknown;

		if (request.method === "initialize")
			result = {
				protocolVersion: request.params?.protocolVersion ?? "2024-11-05",
				capabilities: { tools: {} },
				serverInfo: { name: "flow-fixture", version: "1.0.0" },
			};
		else if (request.method === "ping") result = {};
		else if (request.method === "tools/list") result = { tools: FIXTURE_TOOLS };
		else if (request.method === "tools/call") {
			const name = request.params?.name;
			const args = request.params?.arguments ?? {};

			if (typeof name !== "string" || !args || typeof args !== "object" || Array.isArray(args)) throw new Error("Invalid tool call");

			result = auditedTool(config, name, args as Record<string, unknown>);
		} else {
			process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, error: { code: -32601, message: "Unknown method" } })}\n`);
			continue;
		}

		process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, result })}\n`);
	} catch (error) {
		process.stdout.write(
			`${JSON.stringify({ jsonrpc: "2.0", id, error: { code: -32603, message: error instanceof Error ? error.message : String(error) } })}\n`,
		);
	}
}
