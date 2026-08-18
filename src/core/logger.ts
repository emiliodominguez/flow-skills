import path from "node:path";
import pc from "picocolors";
import type { Action } from "./install-fs.js";
import { prettyPath } from "./paths.js";

/** Glyph vocabulary. Unicode; picocolors drops color on non-TTY / NO_COLOR. */
export const sym = {
	ok: "✓",
	err: "✗",
	warn: "⚠",
	step: "›",
	arrow: "→",
	dot: "·",
	added: "+",
	// U+2212 MINUS SIGN (not ASCII "-"), so the removal glyph optically matches the
	// weight and width of the "+" added glyph in aligned columns.
	removed: "−",
	changed: "~",
};

/**
 * Strip C0/C1 control bytes (except tab/newline) from text that originates in a
 * skills repo - a directory basename or frontmatter value the user may not have
 * authored - so a crafted repo can't smuggle raw terminal escape sequences into
 * the output. Our own color codes are applied *after* this, so they're unaffected.
 *
 * @param text - Untrusted, repo-derived text.
 * @returns The text with control characters removed.
 */
export function sanitize(text: string): string {
	// C0 controls (keeping \t = \x09 and \n = \x0A), DEL, and C1 controls.
	// eslint-disable-next-line no-control-regex
	return text.replace(/[\x00-\x08\x0B-\x1F\x7F-\x9F]/g, "");
}

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
	step: (msg: string) => console.log(`${pc.cyan(sym.step)} ${emphasizeCode(msg)}`),
	ok: (msg: string) => console.log(`${pc.green(sym.ok)} ${emphasizeCode(msg)}`),
	warn: (msg: string) => console.log(`${pc.yellow(sym.warn)} ${emphasizeCode(msg)}`),
	error: (msg: string) => console.error(`${pc.red(sym.err)} ${emphasizeCode(msg)}`),
	heading: (msg: string) => console.log(`\n${pc.bold(msg)}`),
};

/**
 * Print a target's section header - bold name, dim destination, optional note
 * (install mode, "generated", etc.). The per-skill lines beneath omit the
 * directory since it lives here.
 *
 * @param name - Target adapter name.
 * @param dest - Absolute destination path (shortened to `~` for display).
 * @param note - Optional trailing note (e.g. "symlink", "generated").
 */
export function targetHeader(name: string, dest: string, note?: string): void {
	const where = pc.dim(`${sym.arrow} ${sanitize(prettyPath(dest))}`);
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
 * A skip that flags an unmanaged collision - the adapters phrase these
 * "… not managed …" and the user must resolve them with `--force`. Distinct
 * from a benign "already linked" / "absent" skip that needs no attention.
 *
 * @param action - The action to classify.
 * @returns True when the action is a skip blocked by an unmanaged entry.
 */
export function isBlockedSkip(action: Action): boolean {
	return action.verb === "skip" && !!action.note?.includes("not managed");
}

/**
 * The single summary word for an action. Folds the two context distinctions the
 * raw verb can't express: a bundle uninstall that rewrites the file (tagged
 * `note: "updated"`) reads "updated" not "written", and skips split into blocked
 * "skipped" vs. benign "unchanged".
 *
 * @param action - The action to classify.
 * @returns The past-tense summary word.
 */
function wordFor(action: Action): string {
	if (action.verb === "skip") return isBlockedSkip(action) ? "skipped" : "unchanged";

	if (action.verb === "write" && action.note === "updated") return "updated";

	return VERB[action.verb].word;
}

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

	if (action.verb === "write" && action.note === "updated") return "updated";

	if (action.verb === "write" || action.verb === "remove") return action.note ? `${word} (${action.note})` : word;

	return word;
}

/**
 * Print a block of actions as aligned, colorized lines under a target header.
 * Shows each entry's (sanitized) basename plus a dim outcome word.
 *
 * @param actions - The recorded actions for one target.
 */
export function printActions(actions: Action[]): void {
	const names = actions.map((action) => sanitize(path.basename(action.path)));
	const width = Math.max(0, ...names.map((name) => name.length));

	actions.forEach((action, i) => {
		const { glyph, color } = VERB[action.verb];

		console.log(`  ${color(glyph)} ${names[i]!.padEnd(width)}  ${pc.dim(detailFor(action))}`);
	});
}

/**
 * Summarize a set of actions into a human phrase like `2 linked · 20 unchanged`.
 *
 * @param actions - Actions across one or more targets.
 * @returns A summary string, or "" when there were no actions.
 */
export function summarize(actions: Action[]): string {
	if (actions.length === 0) return "";

	// Display order for the phrase - a superset of VERB.word (writes can read
	// "updated"; skips split into "skipped"/"unchanged"), so it's kept explicit.
	const order = ["linked", "copied", "written", "updated", "removed", "backed up", "skipped", "unchanged"];
	const counts = new Map<string, number>();

	for (const action of actions) {
		const word = wordFor(action);

		counts.set(word, (counts.get(word) ?? 0) + 1);
	}

	return order
		.filter((word) => counts.get(word))
		.map((word) => `${counts.get(word)} ${word}`)
		.join(` ${sym.dot} `);
}

/**
 * Print the completion footer for an install/uninstall/sync run: a one-line
 * summary, plus a warning when skills were left untouched by an unmanaged
 * collision - so a blocked run is never reported as an unqualified success.
 *
 * @param label - The completed action, e.g. "install complete".
 * @param actions - Every action the run performed.
 * @param opts - `dryRun` to phrase it as a preview; `whenEmpty` for the no-action text.
 */
export function reportSummary(label: string, actions: Action[], opts: { dryRun?: boolean; whenEmpty: string }): void {
	const phrase = summarize(actions) || opts.whenEmpty;

	if (opts.dryRun) log.muted(`\ndry run ${sym.dot} ${phrase}`);
	else log.ok(`${label} ${pc.dim(`${sym.dot} ${phrase}`)}`);

	const blocked = actions.filter(isBlockedSkip).length;

	if (blocked > 0)
		log.warn(
			`${blocked} skill${blocked === 1 ? "" : "s"} left untouched (exists, not managed) - re-run with \`--force\`, or inspect with \`doctor\`.`,
		);
}
