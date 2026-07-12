import path from "node:path";
import pc from "picocolors";
import type { Action } from "./install-fs.js";
import { prettyPath } from "./paths.js";

/** Glyph vocabulary. Unicode; picocolors drops color on non-TTY / NO_COLOR. */
export const sym = {
	ok: "✓",
	err: "✗",
	warn: "⚠",
	info: "›",
	arrow: "→",
	dot: "·",
	bullet: "•",
	added: "+",
	removed: "−",
	changed: "~",
};

/**
 * Colorize backticked `code` spans so command hints stand out in any message.
 *
 * @param msg - A message that may contain `backtick` spans.
 * @returns The message with backticked spans cyan and the backticks stripped.
 */
function emphasizeCode(msg: string): string {
	return msg.replace(/`([^`]+)`/g, (_full, code: string) => pc.cyan(code));
}

/** Leveled console output with one consistent glyph + color vocabulary. */
export const log = {
	info: (msg: string) => console.log(emphasizeCode(msg)),
	muted: (msg: string) => console.log(pc.dim(emphasizeCode(msg))),
	step: (msg: string) => console.log(`${pc.cyan(sym.info)} ${emphasizeCode(msg)}`),
	ok: (msg: string) => console.log(`${pc.green(sym.ok)} ${emphasizeCode(msg)}`),
	warn: (msg: string) => console.log(`${pc.yellow(sym.warn)} ${emphasizeCode(msg)}`),
	error: (msg: string) => console.error(`${pc.red(sym.err)} ${emphasizeCode(msg)}`),
	dim: (msg: string) => console.log(pc.dim(msg)),
	heading: (msg: string) => console.log(`\n${pc.bold(msg)}`),
};

/**
 * Print a target's section header — bold name, dim destination, optional note
 * (install mode, "generated", etc.). The per-skill lines beneath omit the
 * directory since it lives here.
 *
 * @param name - Target adapter name.
 * @param dest - Absolute destination path (shortened to `~` for display).
 * @param note - Optional trailing note (e.g. "symlink", "generated").
 */
export function targetHeader(name: string, dest: string, note?: string): void {
	const where = pc.dim(`${sym.arrow} ${prettyPath(dest)}`);
	const tail = note ? pc.dim(` ${sym.dot} ${note}`) : "";

	console.log(`\n${pc.bold(name)} ${where}${tail}`);
}

/** How each action verb renders: glyph, color, and its past-tense word. */
interface VerbStyle {
	glyph: string;
	color: (s: string) => string;
	word: string;
}

const VERB: Record<Action["verb"], VerbStyle> = {
	symlink: { glyph: sym.added, color: pc.green, word: "linked" },
	copy: { glyph: sym.added, color: pc.green, word: "copied" },
	write: { glyph: sym.added, color: pc.green, word: "written" },
	remove: { glyph: sym.removed, color: pc.red, word: "removed" },
	backup: { glyph: sym.changed, color: pc.yellow, word: "backed up" },
	skip: { glyph: sym.dot, color: pc.dim, word: "unchanged" },
};

/**
 * The dim detail shown after a skill's name for one action. The verbose
 * `→ <src>` note on a symlink is dropped (the header already says where).
 *
 * @param action - The recorded action.
 * @returns The trailing detail text.
 */
function detailFor(action: Action): string {
	const { word } = VERB[action.verb];

	if (action.verb === "skip") return action.note ?? word;

	if (action.verb === "backup") return action.note ? `${word} ${action.note}` : word;

	if (action.verb === "write" || action.verb === "remove") return action.note ? `${word} (${action.note})` : word;

	return word;
}

/**
 * Print a block of actions as aligned, colorized lines under a target header.
 * Shows each entry's basename (the directory is in the header) plus a dim
 * outcome word.
 *
 * @param actions - The recorded actions for one target.
 */
export function printActions(actions: Action[]): void {
	const width = Math.max(0, ...actions.map((a) => path.basename(a.path).length));

	for (const action of actions) {
		const { glyph, color } = VERB[action.verb];
		const name = path.basename(action.path).padEnd(width);

		console.log(`  ${color(glyph)} ${name}  ${pc.dim(detailFor(action))}`);
	}
}

/**
 * Summarize a set of actions into a human phrase like `2 linked · 20 unchanged`.
 *
 * @param actions - Actions across one or more targets.
 * @returns A summary string, or "" when there were no actions.
 */
export function summarize(actions: Action[]): string {
	if (actions.length === 0) return "";

	const order: Action["verb"][] = ["symlink", "copy", "write", "remove", "backup", "skip"];
	const counts = new Map<Action["verb"], number>();

	for (const action of actions) counts.set(action.verb, (counts.get(action.verb) ?? 0) + 1);

	return order
		.filter((verb) => counts.get(verb))
		.map((verb) => `${counts.get(verb)} ${VERB[verb].word}`)
		.join(` ${sym.dot} `);
}
