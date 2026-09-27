import { Command } from "commander";
import { listCommand } from "./commands/list.js";
import { validateCommand } from "./commands/validate.js";
import { newCommand } from "./commands/new.js";

/**
 * Build the configured commander program (without parsing). Kept separate from the
 * entry point so tests can introspect the registered commands. Installing is the job of
 * `npx skills`; this program only authors and checks the corpus.
 *
 * @returns The fully-configured program.
 */
export function buildProgram(): Command {
	const program = new Command();

	program.name("flow-skills").description("Author and validate the flow-skills corpus. Install with `npx skills add`.");

	program
		.command("list")
		.description("List all skills")
		.option("--profiles", "also print install profiles as npx skills commands")
		.option("--json", "output machine-readable JSON")
		.action((opts) => listCommand(opts));

	program
		.command("validate")
		.description("Validate skill frontmatter, naming, references, budgets and manifests")
		.option("--strict", "fail on warnings too")
		.action((opts) => validateCommand(opts));

	program
		.command("new")
		.description("Scaffold a new skill from the template")
		.argument("<name>", "kebab-case skill id, including the flow- prefix")
		.option("-d, --description <text>", "frontmatter description")
		.action((name, opts) => newCommand(name, opts));

	return program;
}
