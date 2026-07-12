import { describe, it, expect } from "vitest";
import { buildProgram } from "../src/cli";
import { COMMANDS } from "../src/commands/completion";

// Guards the one hazard of a hand-maintained completion list: drift from the real
// commander commands. If a command is added/removed without updating COMMANDS, this fails.
describe("completion stays in sync with the CLI", () => {
	const registered = buildProgram()
		.commands.map((c) => c.name())
		.sort();
	const offered = COMMANDS.split(" ").sort();

	it("offers exactly the registered commands", () => {
		expect(offered).toEqual(registered);
	});
});
