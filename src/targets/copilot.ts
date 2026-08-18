import { makeBundleTarget } from "./bundle.js";

/**
 * GitHub Copilot - `.github/copilot-instructions.md`. Copilot reads a single
 * repository-wide instructions file, so skills are merged as delimited sections
 * inside one managed block (like Codex), preserving any hand-written guidance.
 */
export const copilotTarget = makeBundleTarget({
	name: "copilot",
	describe: "GitHub Copilot - .github/copilot-instructions.md (skills merged in one managed block)",
	heading: "# Agent skills",
});
