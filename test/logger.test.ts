import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { log, sanitize } from "../src/core/logger";

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

describe("sanitize", () => {
	it("removes the control bytes so an escape sequence can't be acted on", () => {
		// The ESC (\x1b) and BEL (\x07) are stripped; the now-inert printable
		// payload ("[2J") remains as plain text - the terminal can't clear itself.
		expect(sanitize("a\x1b[2Jb\x07c")).toBe("a[2Jbc");
		expect(sanitize("plain")).toBe("plain");
	});

	it("keeps tab and newline", () => {
		expect(sanitize("keep\tthis\nplease")).toBe("keep\tthis\nplease");
	});
});
