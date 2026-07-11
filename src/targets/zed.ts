import { makeBundleTarget } from "./bundle.js";

/**
 * Zed — the editor's agent reads a single `.rules` file at the worktree root.
 * Skills are merged as delimited sections inside one managed block, so any
 * hand-written rules in the same file are preserved.
 */
export const zedTarget = makeBundleTarget({
	name: "zed",
	describe: "Zed — .rules (skills merged in one managed block)",
	heading: "# Agent skills",
});
