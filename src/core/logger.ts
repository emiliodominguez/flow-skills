import pc from "picocolors";

/** Glyph vocabulary. Unicode; picocolors drops color on non-TTY / NO_COLOR. */
export const sym = {
	ok: "✓",
	err: "✗",
	warn: "⚠",
	step: "›",
	arrow: "→",
	dot: "·",
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
