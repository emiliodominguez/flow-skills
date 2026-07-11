import { makeBundleTarget } from "./bundle.js";

/**
 * Codex / AGENTS.md — a single bundle file. Skills are merged as delimited
 * sections inside one managed block: a partial `install`/`uninstall` upserts or
 * removes only the named skills, leaving both the other skills and any
 * surrounding user content untouched.
 */
export const codexTarget = makeBundleTarget({
	name: "codex",
	describe: "Codex — AGENTS.md (skills merged as sections in one managed block)",
	heading: "# Agent skills",
});
