import type { Target } from "../targets/types.js";

/**
 * Resolve the filesystem mode a target can use on the current platform.
 *
 * @param target - Destination adapter.
 * @param preferred - Configured or observed native install mode.
 * @param platform - Node platform, injectable for tests.
 * @returns `copy` for generated targets and Windows symlink installs; otherwise the preferred mode.
 */
export function effectiveInstallMode(
	target: Target,
	preferred: "symlink" | "copy",
	platform: NodeJS.Platform = process.platform,
): "symlink" | "copy" {
	if (!target.supportsSymlink) return "copy";

	return preferred === "symlink" && platform === "win32" ? "copy" : preferred;
}
