import fs from "node:fs";
import path from "node:path";
import { Command, Option } from "commander";
import { packageRoot, SCOPES } from "./core/config.js";
import { listCommand } from "./commands/list.js";
import { validateCommand } from "./commands/validate.js";
import { installCommand } from "./commands/install.js";
import { syncCommand } from "./commands/sync.js";
import { doctorCommand } from "./commands/doctor.js";
import { newCommand } from "./commands/new.js";
import { completionCommand } from "./commands/completion.js";
import { interactiveCommand } from "./commands/interactive.js";

/**
 * Read the CLI's own version from its package.json, falling back to "0.0.0".
 *
 * @returns The package version string.
 */
function version(): string {
	try {
		// The CLI's own package.json, not the repo the user happens to be run from.
		const pkg = JSON.parse(fs.readFileSync(path.join(packageRoot(), "package.json"), "utf8")) as { version?: string };

		return pkg.version ?? "0.0.0";
	} catch {
		return "0.0.0";
	}
}

/**
 * Build the configured commander program (without parsing). Kept separate from the
 * entry point so tests can introspect the registered commands.
 *
 * @returns The fully-configured program.
 */
export function buildProgram(): Command {
	const program = new Command();

	program
		.name("agent-skills")
		.description("Author agent skills once; install them into Claude Code, Cursor, Codex, Windsurf, Copilot, Zed, aider, Cline and Continue.")
		.version(version());

	program
		.command("list")
		.description("List all skills (and, with --targets, the install targets)")
		.option("--targets", "also list available target adapters")
		.option("--profiles", "also list configured install profiles")
		.option("--json", "output machine-readable JSON")
		.action((opts) => listCommand(opts));

	program
		.command("validate")
		.description("Validate every skill's frontmatter, naming, and cross-references")
		.option("--strict", "fail on warnings too")
		.action((opts) => validateCommand(opts));

	const targetOption = new Option(
		"-t, --target <name...>",
		"target(s): claude, cursor, codex, windsurf, copilot, zed, aider, cline, continue (default: config)",
	);
	const scopeOption = new Option("-s, --scope <scope>", "install scope").choices([...SCOPES]).default("user");

	program
		.command("install")
		.description("Install skills into one or more targets (symlink by default)")
		.argument("[skills...]", "specific skills to install (default: all)")
		.addOption(targetOption)
		.addOption(scopeOption)
		.option("--copy", "copy files instead of symlinking (native target only)")
		.option("--force", "overwrite entries not created by agent-skills")
		.option("--dry-run", "show what would happen without changing anything")
		.option("--watch", "keep running and re-generate targets on source change")
		.option("--profile <name...>", "install a named set of skills from config `profiles`")
		.action((skills, opts) => installCommand("install", skills, opts));

	program
		.command("uninstall")
		.description("Remove previously-installed skills from one or more targets")
		.argument("[skills...]", "specific skills to remove (default: all)")
		.addOption(targetOption)
		.addOption(scopeOption)
		.option("--force", "remove entries even if not created by agent-skills")
		.option("--dry-run", "show what would happen without changing anything")
		.option("--profile <name...>", "remove a named set of skills from config `profiles`")
		.action((skills, opts) => installCommand("uninstall", skills, opts));

	program
		.command("sync")
		.description("Re-install whatever is currently installed, across targets, to propagate source edits")
		.addOption(targetOption)
		.addOption(scopeOption)
		.option("--dry-run", "show what would happen without changing anything")
		.action((opts) => syncCommand(opts));

	program
		.command("doctor")
		.description("Report install state per target and flag drift or conflicts")
		.addOption(targetOption)
		.addOption(scopeOption)
		.option("--json", "output machine-readable JSON")
		.action((opts) => doctorCommand(opts));

	program
		.command("new")
		.description("Scaffold a new skill from the template")
		.argument("<name>", "kebab-case skill id")
		.option("-d, --description <text>", "frontmatter description")
		.action((name, opts) => newCommand(name, opts));

	program
		.command("completion")
		.description("Print a shell completion script (bash, zsh, or fish) to eval/source")
		.argument("[shell]", "shell: bash, zsh, or fish", "bash")
		.action((shell) => completionCommand(shell));

	// No subcommand on a TTY → interactive picker; otherwise show help.
	program.action(async () => {
		if (process.stdin.isTTY && process.stdout.isTTY) await interactiveCommand();
		else program.help();
	});

	return program;
}
