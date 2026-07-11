import pc from "picocolors";
import type { Action } from "./install-fs.js";
import { prettyPath } from "./paths.js";

/** Minimal leveled console output. */
export const log = {
	info: (msg: string) => console.log(msg),
	step: (msg: string) => console.log(pc.cyan("›") + " " + msg),
	ok: (msg: string) => console.log(pc.green("✓") + " " + msg),
	warn: (msg: string) => console.log(pc.yellow("!") + " " + msg),
	error: (msg: string) => console.error(pc.red("✗") + " " + msg),
	dim: (msg: string) => console.log(pc.dim(msg)),
	heading: (msg: string) => console.log("\n" + pc.bold(msg)),
};

const VERB_COLOR: Record<Action["verb"], (s: string) => string> = {
	symlink: pc.cyan,
	copy: pc.blue,
	write: pc.blue,
	remove: pc.red,
	backup: pc.yellow,
	skip: pc.dim,
};

/**
 * Print a filesystem action as an indented, colorized line.
 *
 * @param action - The action to render.
 */
export function printAction(action: Action): void {
	const verb = VERB_COLOR[action.verb](action.verb.padEnd(7));
	const note = action.note ? pc.dim(" " + action.note) : "";
	console.log(`  ${verb} ${prettyPath(action.path)}${note}`);
}
