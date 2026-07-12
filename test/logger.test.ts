import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { log, sym, targetHeader, printActions, summarize, isBlockedSkip, sanitize } from "../src/core/logger";
import type { Action } from "../src/core/install-fs";

// The logger writes to console; capture output so we can assert on the rendered lines.
let logSpy: ReturnType<typeof vi.spyOn>;
let errSpy: ReturnType<typeof vi.spyOn>;

/**
 * Join everything written to console.log during the current test into one string.
 *
 * @returns The concatenated stdout lines.
 */
function out(): string {
	return logSpy.mock.calls.flat().join("\n");
}

beforeEach(() => {
	logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
	errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
	logSpy.mockRestore();
	errSpy.mockRestore();
});

describe("summarize", () => {
	it("returns '' for no actions", () => {
		expect(summarize([])).toBe("");
	});

	it("counts each verb with its past-tense word, in a stable order", () => {
		const actions: Action[] = [
			{ verb: "symlink", path: "/x/a" },
			{ verb: "symlink", path: "/x/b" },
			{ verb: "skip", path: "/x/c" },
			{ verb: "remove", path: "/x/d" },
			{ verb: "backup", path: "/x/e" },
			{ verb: "copy", path: "/x/f" },
			{ verb: "write", path: "/x/g" },
		];

		const phrase = summarize(actions);

		// symlink before copy/write/remove/backup/skip; counts folded per verb.
		expect(phrase).toBe(`2 linked ${sym.dot} 1 copied ${sym.dot} 1 written ${sym.dot} 1 removed ${sym.dot} 1 backed up ${sym.dot} 1 unchanged`);
	});
});

describe("printActions", () => {
	it("renders each verb, using notes where present and dropping the symlink source note", () => {
		const actions: Action[] = [
			{ verb: "symlink", path: "/dest/ed-plan", note: "→ /repo/skills/ed-plan" },
			{ verb: "copy", path: "/dest/ed-work" },
			{ verb: "write", path: "/dest/AGENTS.md", note: "managed block" },
			{ verb: "remove", path: "/dest/ed-old" },
			{ verb: "backup", path: "/dest/ed-x", note: "→ ed-x.bak-1" },
			{ verb: "skip", path: "/dest/ed-y", note: "already linked" },
		];

		printActions(actions);
		const text = out();

		// basenames, not full paths
		expect(text).toContain("ed-plan");
		expect(text).not.toContain("/repo/skills/ed-plan"); // verbose source note is dropped
		expect(text).toContain("linked");
		expect(text).toContain("copied");
		expect(text).toContain("written (managed block)");
		expect(text).toContain("removed");
		expect(text).toContain("backed up → ed-x.bak-1");
		expect(text).toContain("already linked");
	});

	it("falls back to default words when notes are absent", () => {
		printActions([
			{ verb: "write", path: "/dest/f" },
			{ verb: "remove", path: "/dest/g" },
			{ verb: "backup", path: "/dest/h" },
			{ verb: "skip", path: "/dest/i" },
		]);
		const text = out();

		expect(text).toContain("written");
		expect(text).toContain("removed");
		expect(text).toContain("backed up");
		expect(text).toContain("unchanged");
	});
});

describe("targetHeader", () => {
	it("prints name and destination, with and without a note", () => {
		targetHeader("claude", "/home/u/.claude/skills", "symlink");
		targetHeader("codex", "/home/u/AGENTS.md");
		const text = out();

		expect(text).toContain("claude");
		expect(text).toContain("symlink");
		expect(text).toContain("codex");
	});
});

describe("log", () => {
	it("emphasizes backticked code spans and strips the backticks", () => {
		log.info("run `agent-skills install`");
		const text = out();

		expect(text).toContain("agent-skills install");
		expect(text).not.toContain("`");
	});

	it("passes plain messages through every level without a backtick span", () => {
		log.ok("done");
		log.warn("careful");
		log.step("working");
		log.muted("quiet");
		log.heading("Section");
		log.error("boom");

		expect(out()).toContain("done");
		expect(errSpy.mock.calls.flat().join("\n")).toContain("boom");
	});
});

describe("isBlockedSkip / blocked-skip summary", () => {
	it("classifies only unmanaged-collision skips as blocked", () => {
		expect(isBlockedSkip({ verb: "skip", path: "/x", note: "exists, not managed by agent-skills" })).toBe(true);
		expect(isBlockedSkip({ verb: "skip", path: "/x", note: "already linked" })).toBe(false);
		expect(isBlockedSkip({ verb: "skip", path: "/x", note: "absent" })).toBe(false);
		expect(isBlockedSkip({ verb: "symlink", path: "/x" })).toBe(false);
	});

	it("summarize splits blocked skips from benign ones", () => {
		const actions: Action[] = [
			{ verb: "symlink", path: "/x/a" },
			{ verb: "skip", path: "/x/b", note: "already linked" },
			{ verb: "skip", path: "/x/c", note: "exists, not managed by agent-skills — use --force to overwrite" },
		];

		expect(summarize(actions)).toBe(`1 linked ${sym.dot} 1 skipped ${sym.dot} 1 unchanged`);
	});

	it("words a bundle-uninstall rewrite as 'updated', not 'written'", () => {
		const rewrite: Action = { verb: "write", path: "/dest/AGENTS.md", note: "updated" };

		expect(summarize([rewrite])).toBe("1 updated");
		printActions([rewrite]);
		expect(out()).toContain("updated");
	});
});

describe("sanitize", () => {
	it("removes the control bytes so an escape sequence can't be acted on", () => {
		// The ESC (\x1b) and BEL (\x07) are stripped; the now-inert printable
		// payload ("[2J") remains as plain text — the terminal can't clear itself.
		expect(sanitize("a\x1b[2Jb\x07c")).toBe("a[2Jbc");
		expect(sanitize("plain")).toBe("plain");
	});

	it("keeps tab and newline", () => {
		expect(sanitize("keep\tthis\nplease")).toBe("keep\tthis\nplease");
	});
});
