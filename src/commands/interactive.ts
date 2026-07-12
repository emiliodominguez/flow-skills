import path from "node:path";
import * as p from "@clack/prompts";
import { findRepoRoot, loadConfig } from "../core/config.js";
import { discoverSkills } from "../core/registry.js";
import { TARGETS } from "../targets/index.js";
import { installCommand } from "./install.js";
import { doctorCommand } from "./doctor.js";
import { listCommand } from "./list.js";

/**
 * Interactive picker shown when the CLI is run with no subcommand on a TTY.
 * Walks the user through an action and (for install/uninstall) the targets,
 * skills, and scope, then dispatches to the matching command.
 *
 * @returns Resolves once the chosen command has run, or the user cancelled.
 */
export async function interactiveCommand(): Promise<void> {
	const root = findRepoRoot();
	const config = loadConfig(root);
	const skills = discoverSkills(path.join(root, config.skillsDir));

	p.intro("agent-skills");

	const action = await p.select({
		message: "What would you like to do?",
		options: [
			{ value: "install", label: "Install skills" },
			{ value: "uninstall", label: "Uninstall skills" },
			{ value: "doctor", label: "Doctor — check install state" },
			{ value: "list", label: "List skills" },
		],
	});

	if (p.isCancel(action)) {
		p.cancel("Cancelled.");

		return;
	}

	if (action === "list") {
		listCommand({ targets: true, profiles: true });

		return;
	}

	if (action === "doctor") {
		doctorCommand({});

		return;
	}

	const targets = await p.multiselect({
		message: "Into which target(s)?",
		options: Object.values(TARGETS).map((t) => ({ value: t.name, label: t.name, hint: t.describe })),
		initialValues: config.defaultTargets,
		required: true,
	});

	if (p.isCancel(targets)) {
		p.cancel("Cancelled.");

		return;
	}

	const chosen = await p.multiselect({
		message: "Which skills? (space to toggle · select none = all)",
		options: skills.map((s) => ({ value: s.name, label: s.name })),
		required: false,
	});

	if (p.isCancel(chosen)) {
		p.cancel("Cancelled.");

		return;
	}

	const scope = await p.select({
		message: "Scope",
		options: [
			{ value: "user" as const, label: "user — global (~)" },
			{ value: "project" as const, label: "project — this repo" },
		],
		initialValue: "user" as const,
	});

	if (p.isCancel(scope)) {
		p.cancel("Cancelled.");

		return;
	}

	p.outro(`${action} → ${targets.join(", ")}`);
	installCommand(action, chosen, { target: targets, scope });
}
