import { makeBundleTarget } from "./bundle.js";

/**
 * aider - reads a conventions file (referenced via `read:` in `.aider.conf.yml`,
 * conventionally `CONVENTIONS.md`). Skills are merged as delimited sections
 * inside one managed block so surrounding conventions are preserved.
 */
export const aiderTarget = makeBundleTarget({
	name: "aider",
	describe: "aider - CONVENTIONS.md (skills merged in one managed block)",
	heading: "# Agent skills",
});
