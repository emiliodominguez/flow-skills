import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Action } from "../core/install-fs.js";
import { isSymlinkTo, removePath } from "../core/install-fs.js";
import type { InstallContext, SkillStatus, Target } from "./types.js";
import { makeBundleTarget } from "./bundle.js";
import { claudeTarget } from "./claude.js";
import { MANAGED_LINE } from "./render.js";

const COPY_MARKER = ".agent-skills";
const legacyBundleTarget = makeBundleTarget({ name: "codex-legacy", describe: "Legacy Codex AGENTS.md bundle", heading: "# Agent skills" });

/**
 * Reject pre-native Codex config paths that still name an AGENTS.md bundle file.
 *
 * @param dest - Resolved Codex destination.
 */
function assertNativeDestination(dest: string): void {
	if (path.basename(dest).toLowerCase() === "agents.md") {
		throw new Error(
			`Codex now installs native skill directories. Change the codex projectPath to .agents/skills or userPath to ~/.agents/skills instead of ${dest}.`,
		);
	}
}

/**
 * Resolve known pre-native Codex locations only when the destination is an official
 * user or repository `.agents/skills` directory.
 *
 * @param dest - Resolved native Codex destination.
 * @returns Legacy bundle and skill directories, or null for a custom destination.
 */
function legacyLocations(dest: string): { agentsFile: string; skillsDir?: string } | null {
	const officialUser = path.join(os.homedir(), ".agents", "skills");

	if (path.resolve(dest) === officialUser) {
		return { agentsFile: path.join(os.homedir(), ".codex", "AGENTS.md"), skillsDir: path.join(os.homedir(), ".codex", "skills") };
	}

	if (path.basename(dest) === "skills" && path.basename(path.dirname(dest)) === ".agents") {
		return { agentsFile: path.join(path.dirname(path.dirname(dest)), "AGENTS.md") };
	}

	return null;
}

/**
 * Whether a legacy copied skill has the exact ownership marker written by agent-skills.
 *
 * @param dir - Legacy installed skill directory.
 * @returns True only for an exact regular marker file.
 */
function isManagedCopy(dir: string): boolean {
	const marker = path.join(dir, COPY_MARKER);

	try {
		return fs.lstatSync(marker).isFile() && fs.readFileSync(marker, "utf8") === MANAGED_LINE + "\n";
	} catch {
		return false;
	}
}

/**
 * Whether any filesystem entry, including a broken symlink, exists at a path.
 *
 * @param target - Path to inspect.
 * @returns True when lstat can observe an entry.
 */
function entryExists(target: string): boolean {
	try {
		fs.lstatSync(target);

		return true;
	} catch {
		return false;
	}
}

/**
 * Remove only selected skills from a legacy Codex AGENTS.md managed bundle.
 *
 * @param ctx - Current native operation context.
 * @param agentsFile - Legacy AGENTS.md destination.
 * @param skills - Skills that were successfully installed or explicitly uninstalled.
 * @returns Migration actions, leaving unselected legacy sections intact.
 */
function removeLegacyBundleSkills(ctx: InstallContext, agentsFile: string, skills: InstallContext["skills"]): Action[] {
	if (skills.length === 0) return [];

	const legacyCtx = { ...ctx, dest: agentsFile, skills, mode: "copy" as const };
	const present = new Set(
		legacyBundleTarget
			.status(legacyCtx)
			.filter((status) => status.state !== "missing")
			.map((status) => status.skill),
	);
	const installed = skills.filter((skill) => present.has(skill.name));

	if (installed.length === 0) return [];

	return legacyBundleTarget
		.uninstall({ ...legacyCtx, skills: installed })
		.map((action) => ({ ...action, note: "removed migrated legacy Codex AGENTS.md skill section" }));
}

/**
 * Install native Codex skills and clean up only provably managed legacy locations.
 *
 * @param ctx - Native install context.
 * @returns Native install and migration actions.
 */
function installCodex(ctx: Parameters<Target["install"]>[0]): Action[] {
	assertNativeDestination(ctx.dest);
	const legacy = legacyLocations(ctx.dest);
	const blocked = new Set<string>();
	const actions: Action[] = [];

	if (legacy?.skillsDir) {
		for (const skill of ctx.skills) {
			const oldDest = path.join(legacy.skillsDir, skill.name);

			try {
				fs.lstatSync(oldDest);
			} catch {
				continue;
			}

			if (!isSymlinkTo(oldDest, skill.dir) && !isManagedCopy(oldDest)) {
				blocked.add(skill.name);
				actions.push({
					verb: "skip",
					path: path.join(ctx.dest, skill.name),
					note: `same-name legacy skill at ${oldDest} is not managed — resolve duplicate first`,
				});
			}
		}
	}

	const installable = ctx.skills.filter((skill) => !blocked.has(skill.name));

	actions.push(...claudeTarget.install({ ...ctx, skills: installable }));
	const installed = installable.filter((skill) => {
		const newDest = path.join(ctx.dest, skill.name);

		return !actions.some((action) => action.verb === "skip" && action.path === newDest && !action.note?.includes("already linked"));
	});

	if (legacy?.skillsDir) {
		for (const skill of installed) {
			const oldDest = path.join(legacy.skillsDir, skill.name);
			const newDest = path.join(ctx.dest, skill.name);
			const newInstalled = ctx.dryRun || isSymlinkTo(newDest, skill.dir) || isManagedCopy(newDest);

			if (newInstalled && (isSymlinkTo(oldDest, skill.dir) || isManagedCopy(oldDest))) {
				removePath(oldDest, ctx.dryRun);
				actions.push({ verb: "remove", path: oldDest, note: "migrated legacy Codex skill" });
			}
		}
	}

	if (legacy) actions.push(...removeLegacyBundleSkills(ctx, legacy.agentsFile, installed));

	return actions;
}

/**
 * Uninstall selected native and provably managed legacy Codex skills.
 *
 * @param ctx - Native uninstall context.
 * @returns Native and legacy removal actions.
 */
function uninstallCodex(ctx: InstallContext): Action[] {
	assertNativeDestination(ctx.dest);
	const actions = claudeTarget.uninstall(ctx);
	const legacy = legacyLocations(ctx.dest);

	if (legacy?.skillsDir) {
		for (const skill of ctx.skills) {
			const oldDest = path.join(legacy.skillsDir, skill.name);

			if (!entryExists(oldDest)) continue;

			if (isSymlinkTo(oldDest, skill.dir) || isManagedCopy(oldDest)) {
				removePath(oldDest, ctx.dryRun);
				actions.push({ verb: "remove", path: oldDest, note: "removed legacy Codex skill" });
			} else {
				actions.push({ verb: "skip", path: oldDest, note: "legacy skill is not managed by agent-skills" });
			}
		}
	}

	if (legacy) actions.push(...removeLegacyBundleSkills(ctx, legacy.agentsFile, ctx.skills));

	return actions;
}

/**
 * Report native state and flag any same-name legacy Codex installation as a conflict.
 *
 * @param ctx - Native status context.
 * @returns Per-skill status with legacy duplicates surfaced.
 */
function statusCodex(ctx: InstallContext): SkillStatus[] {
	assertNativeDestination(ctx.dest);
	const statuses = claudeTarget.status(ctx);
	const legacy = legacyLocations(ctx.dest);
	const legacyBundle = new Set<string>();

	if (legacy) {
		for (const status of legacyBundleTarget.status({ ...ctx, dest: legacy.agentsFile, mode: "copy" })) {
			if (status.state !== "missing") legacyBundle.add(status.skill);
		}
	}

	return statuses.map((status) => {
		const oldSkill = legacy?.skillsDir ? path.join(legacy.skillsDir, status.skill) : null;
		const hasLegacy = legacyBundle.has(status.skill) || (oldSkill !== null && entryExists(oldSkill));

		return hasLegacy ? { skill: status.skill, state: "conflict" } : status;
	});
}

/**
 * Codex — the native agent-skills format. Codex supports the same SKILL.md
 * directory shape as Claude Code and follows symlinked skill directories.
 */
export const codexTarget: Target = {
	...claudeTarget,
	name: "codex",
	describe: "Codex — ~/.agents/skills/<name>/SKILL.md (native; symlink or copy)",
	install: installCodex,
	uninstall: uninstallCodex,
	status: statusCodex,
};
