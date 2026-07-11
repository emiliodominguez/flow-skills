import type { Target } from "./types.js";
import { claudeTarget } from "./claude.js";
import { cursorTarget } from "./cursor.js";
import { codexTarget } from "./codex.js";
import { windsurfTarget } from "./windsurf.js";

/** All known target adapters, keyed by id. */
export const TARGETS: Record<string, Target> = {
	claude: claudeTarget,
	cursor: cursorTarget,
	codex: codexTarget,
	windsurf: windsurfTarget,
};

/**
 * Resolve a target adapter by id.
 *
 * @param name - Target id (`claude`, `cursor`, `codex`, `windsurf`).
 * @returns The adapter.
 * @throws If the id is unknown.
 */
export function getTarget(name: string): Target {
	const target = TARGETS[name];
	if (!target) throw new Error(`Unknown target "${name}". Known: ${Object.keys(TARGETS).join(", ")}`);
	return target;
}

export type { Target, InstallContext, TargetResult } from "./types.js";
