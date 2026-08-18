import fs from "node:fs";
import path from "node:path";
import type { Action } from "../core/install-fs.js";
import { backup, copyDir, isSymlinkTo, removePath, symlink, writeFile } from "../core/install-fs.js";
import type { InstallContext, SkillStatus, Target } from "./types.js";
import { MANAGED_LINE } from "./render.js";

/** Dropped into a copied skill dir so uninstall can tell a copy of ours from a user's own dir. */
const MARKER = ".agent-skills";
const MANIFEST = ".agent-skills-manifest.json";

interface NativeManifest {
	managedBy: "agent-skills";
	version: 1;
	skills: Record<string, { source: string; mode: "symlink" | "copy" }>;
}

/**
 * Read the native install manifest, rejecting an unrelated file at the reserved path.
 *
 * @param root - Native skills destination directory.
 * @returns The verified manifest or a new empty manifest.
 */
function readManifest(root: string): NativeManifest {
	const file = path.join(root, MANIFEST);

	try {
		if (!fs.lstatSync(file).isFile()) throw new Error("manifest path is not a regular file");

		const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as Partial<NativeManifest>;

		if (parsed.managedBy !== "agent-skills" || parsed.version !== 1 || typeof parsed.skills !== "object" || parsed.skills === null) {
			throw new Error("unexpected manifest shape");
		}

		return parsed as NativeManifest;
	} catch (err) {
		if (err && typeof err === "object" && "code" in err && err.code === "ENOENT") {
			return { managedBy: "agent-skills", version: 1, skills: {} };
		}

		throw new Error(`${file} is not a valid agent-skills ownership manifest: ${err instanceof Error ? err.message : String(err)}`, {
			cause: err,
		});
	}
}

/**
 * Persist native install ownership independently of symlink targets so a moved
 * source checkout can be safely repaired.
 *
 * @param root - Native skills destination directory.
 * @param manifest - Ownership data to write, or remove when empty.
 * @param dryRun - When true, touch nothing.
 */
function writeManifest(root: string, manifest: NativeManifest, dryRun: boolean): void {
	if (dryRun) return;

	const file = path.join(root, MANIFEST);

	if (Object.keys(manifest.skills).length === 0) {
		fs.rmSync(file, { force: true });

		return;
	}

	fs.mkdirSync(root, { recursive: true });
	fs.writeFileSync(file, JSON.stringify(manifest, null, 2) + "\n", "utf8");
}

/**
 * Whether the destination's manifest records ownership of one skill.
 *
 * @param dest - Installed skill path.
 * @returns The recorded source and install mode, or null when unowned.
 */
function manifestEntry(dest: string): { source: string; mode: "symlink" | "copy" } | null {
	try {
		return readManifest(path.dirname(dest)).skills[path.basename(dest)] ?? null;
	} catch {
		return null;
	}
}

/**
 * Whether the manifest's recorded symlink is still the entry at the destination.
 * This accepts a broken link after the source checkout moves, but never a replacement
 * directory or a symlink to an unrelated target.
 *
 * @param dest - Installed skill path.
 * @returns True only when the link still resolves lexically to the recorded source.
 */
function hasRecordedSymlink(dest: string): boolean {
	const entry = manifestEntry(dest);

	return entry?.mode === "symlink" && isSymlinkTo(dest, entry.source);
}

/**
 * Any entry (dir, file, or symlink — including a broken one) exists at `p`.
 *
 * @param p - The path to test.
 * @returns True if any entry exists at `p`.
 */
function present(p: string): boolean {
	try {
		fs.lstatSync(p);

		return true;
	} catch {
		return false;
	}
}

/**
 * Whether `dest` was created by this tool: our symlink into the repo, or a copy carrying the marker.
 *
 * @param dest - The installed path to test.
 * @param srcDir - The repo skill dir our symlink should point at.
 * @returns True if the entry is managed by agent-skills.
 */
function isManaged(dest: string, srcDir: string): boolean {
	return isSymlinkTo(dest, srcDir) || hasManagedCopyMarker(dest) || hasRecordedSymlink(dest);
}

/**
 * Verify that a copied skill carries the exact regular-file ownership marker written by this installer.
 *
 * @param dest - Installed skill directory.
 * @returns True only for an exact agent-skills marker file.
 */
function hasManagedCopyMarker(dest: string): boolean {
	const marker = path.join(dest, MARKER);

	try {
		return fs.lstatSync(marker).isFile() && fs.readFileSync(marker, "utf8") === MANAGED_LINE + "\n";
	} catch {
		return false;
	}
}

/**
 * Compare complete skill directory trees, excluding the install ownership marker.
 *
 * @param source - Source skill directory.
 * @param installed - Installed copied skill directory.
 * @returns True when names, entry types, symlink targets, and file bytes match.
 */
function sameSkillTree(source: string, installed: string): boolean {
	try {
		const sourceEntries = fs.readdirSync(source, { withFileTypes: true }).filter((entry) => entry.name !== MARKER);
		const installedEntries = fs.readdirSync(installed, { withFileTypes: true }).filter((entry) => entry.name !== MARKER);
		const sourceNames = sourceEntries.map((entry) => entry.name).sort();
		const installedNames = installedEntries.map((entry) => entry.name).sort();

		if (sourceNames.length !== installedNames.length || sourceNames.some((name, index) => name !== installedNames[index])) return false;

		return sourceNames.every((name) => {
			const sourcePath = path.join(source, name);
			const installedPath = path.join(installed, name);
			const sourceStat = fs.lstatSync(sourcePath);
			const installedStat = fs.lstatSync(installedPath);

			if (sourceStat.isDirectory() !== installedStat.isDirectory() || sourceStat.isSymbolicLink() !== installedStat.isSymbolicLink())
				return false;

			if (sourceStat.isDirectory()) return sameSkillTree(sourcePath, installedPath);

			if (sourceStat.isSymbolicLink()) return fs.readlinkSync(sourcePath) === fs.readlinkSync(installedPath);

			return fs.readFileSync(sourcePath).equals(fs.readFileSync(installedPath));
		});
	} catch {
		return false;
	}
}

/**
 * Claude Code — the native format. Each skill is a directory containing SKILL.md
 * under `~/.claude/skills/<name>/`. Symlink mode points the entry at the repo so
 * edits are live; copy mode drops a frozen snapshot (marked so uninstall is safe).
 * A directory we did not create is never touched without `--force`, and even then
 * it's backed up (moved aside), never deleted outright.
 */
export const claudeTarget: Target = {
	name: "claude",
	describe: "Claude Code — ~/.claude/skills/<name>/SKILL.md (native; symlink or copy)",
	supportsSymlink: true,

	install(ctx: InstallContext): Action[] {
		const manifest = readManifest(ctx.dest);
		const actions: Action[] = ctx.skills.flatMap((skill): Action[] => {
			const dest = path.join(ctx.dest, skill.name);
			const actions: Action[] = [];

			if (present(dest) && !isManaged(dest, skill.dir)) {
				if (!ctx.force) return [{ verb: "skip", path: dest, note: "exists, not managed by agent-skills — use --force to overwrite" }];

				actions.push(backup(dest, Date.now(), ctx.dryRun));
			}

			if (ctx.mode === "symlink") {
				actions.push(symlink(skill.dir, dest, ctx.dryRun));
			} else {
				actions.push(copyDir(skill.dir, dest, ctx.dryRun));
				writeFile(path.join(dest, MARKER), MANAGED_LINE + "\n", ctx.dryRun);
			}

			if (!actions.some((action) => action.verb === "skip" && action.note !== "already linked")) {
				manifest.skills[skill.name] = { source: skill.dir, mode: ctx.mode };
			}

			return actions;
		});

		writeManifest(ctx.dest, manifest, ctx.dryRun);

		return actions;
	},

	uninstall(ctx: InstallContext): Action[] {
		const manifest = readManifest(ctx.dest);
		const actions: Action[] = ctx.skills.flatMap((skill): Action[] => {
			const dest = path.join(ctx.dest, skill.name);

			if (!present(dest)) {
				delete manifest.skills[skill.name];

				return [{ verb: "skip", path: dest, note: "absent" }];
			}

			if (isManaged(dest, skill.dir)) {
				removePath(dest, ctx.dryRun);
				delete manifest.skills[skill.name];

				return [{ verb: "remove", path: dest }];
			}

			if (ctx.force) {
				const action = backup(dest, Date.now(), ctx.dryRun);

				delete manifest.skills[skill.name];

				return [action];
			}

			return [{ verb: "skip", path: dest, note: "not managed by agent-skills — use --force to remove" }];
		});

		writeManifest(ctx.dest, manifest, ctx.dryRun);

		return actions;
	},

	status(ctx: InstallContext): SkillStatus[] {
		return ctx.skills.map((skill) => {
			const dest = path.join(ctx.dest, skill.name);

			if (!present(dest)) return { skill: skill.name, state: "missing" };

			if (isSymlinkTo(dest, skill.dir)) return { skill: skill.name, state: "linked", mode: "symlink" };

			if (hasRecordedSymlink(dest)) return { skill: skill.name, state: "drifted", mode: "symlink" };

			if (hasManagedCopyMarker(dest)) {
				return { skill: skill.name, state: sameSkillTree(skill.dir, dest) ? "copied" : "drifted", mode: "copy" };
			}

			return { skill: skill.name, state: "conflict" };
		});
	},
};
