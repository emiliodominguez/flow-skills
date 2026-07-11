import fs from "node:fs";
import path from "node:path";
import { Command, Option } from "commander";
import { packageRoot } from "./core/config.js";
import { log } from "./core/logger.js";
import { listCommand } from "./commands/list.js";
import { validateCommand } from "./commands/validate.js";
import { installCommand } from "./commands/install.js";
import { doctorCommand } from "./commands/doctor.js";
import { newCommand } from "./commands/new.js";

function version(): string {
	try {
		// The CLI's own package.json, not the repo the user happens to be run from.
		const pkg = JSON.parse(fs.readFileSync(path.join(packageRoot(), "package.json"), "utf8")) as { version?: string };
		return pkg.version ?? "0.0.0";
	} catch {
		return "0.0.0";
	}
}

const program = new Command();

program
	.name("agent-skills")
	.description("Author agent skills once; install them into Claude Code, Cursor, Codex/AGENTS.md and Windsurf.")
	.version(version());

program
	.command("list")
	.description("List all skills (and, with --targets, the install targets)")
	.option("--targets", "also list available target adapters")
	.action((opts) => listCommand(opts));

program
	.command("validate")
	.description("Validate every skill's frontmatter, naming, and cross-references")
	.option("--strict", "fail on warnings too")
	.action((opts) => validateCommand(opts));

const targetOption = new Option("-t, --target <name...>", "target(s): claude, cursor, codex, windsurf (default: config)");
const scopeOption = new Option("-s, --scope <scope>", "install scope").choices(["user", "project"]).default("user");

program
	.command("install")
	.description("Install skills into one or more targets (symlink by default)")
	.argument("[skills...]", "specific skills to install (default: all)")
	.addOption(targetOption)
	.addOption(scopeOption)
	.option("--copy", "copy files instead of symlinking (native target only)")
	.option("--force", "overwrite entries not created by agent-skills")
	.option("--dry-run", "show what would happen without changing anything")
	.action((skills, opts) => installCommand("install", skills, opts));

program
	.command("uninstall")
	.description("Remove previously-installed skills from one or more targets")
	.argument("[skills...]", "specific skills to remove (default: all)")
	.addOption(targetOption)
	.addOption(scopeOption)
	.option("--force", "remove entries even if not created by agent-skills")
	.option("--dry-run", "show what would happen without changing anything")
	.action((skills, opts) => installCommand("uninstall", skills, opts));

program
	.command("doctor")
	.description("Report install state per target and flag drift or conflicts")
	.addOption(targetOption)
	.addOption(scopeOption)
	.action((opts) => doctorCommand(opts));

program
	.command("new")
	.description("Scaffold a new skill from the template")
	.argument("<name>", "kebab-case skill id")
	.option("-d, --description <text>", "frontmatter description")
	.action((name, opts) => newCommand(name, opts));

program.parseAsync(process.argv).catch((err: unknown) => {
	log.error(err instanceof Error ? err.message : String(err));
	process.exit(1);
});
