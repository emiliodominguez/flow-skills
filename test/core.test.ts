import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseFrontmatter } from "../src/core/skill";
import { frontmatter } from "../src/targets/render";
import { prettyPath } from "../src/core/paths";
import { packageRoot } from "../src/core/config";
import { readManagedBlock, writeManagedBlock, removeManagedBlock, BLOCK_START, BLOCK_END } from "../src/core/install-fs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("parseFrontmatter (F5)", () => {
	it("consumes all whitespace after the colon, not just one space", () => {
		const { data } = parseFrontmatter(`---\nname:   my-skill\ndescription:   "Foo"\n---\nbody`);
		expect(data.name).toBe("my-skill");
		expect(data.description).toBe("Foo");
	});

	it("keeps a value that itself contains a colon", () => {
		const { data } = parseFrontmatter(`---\nname: x\ndescription: Out of scope: nope\n---\nbody`);
		expect(data.description).toBe("Out of scope: nope");
	});
});

describe("frontmatter escaping (F2 / escapeYaml)", () => {
	it("quotes values with a colon, hash, or ampersand; leaves plain values bare", () => {
		expect(frontmatter({ description: "Out of scope: junk" })).toContain('description: "Out of scope: junk"');
		expect(frontmatter({ description: "tag with #hash" })).toContain('description: "tag with #hash"');
		expect(frontmatter({ description: "A and B" })).toContain("description: A and B");
	});

	it("round-trips a colon-containing description through parseFrontmatter", () => {
		const desc = "Audit — Out of scope: caches, history";
		const block = frontmatter({ trigger: "model_decision", description: desc });
		expect(parseFrontmatter(`${block}\nbody`).data.description).toBe(desc);
	});
});

describe("prettyPath (home-prefix boundary)", () => {
	it("does not mangle a sibling dir sharing the home prefix", () => {
		const home = os.homedir();
		expect(prettyPath(home)).toBe("~");
		expect(prettyPath(path.join(home, "skills"))).toBe(path.join("~", "skills"));
		expect(prettyPath(home + "-sibling/x")).toBe(home + "-sibling/x");
	});
});

describe("packageRoot (F4)", () => {
	it("resolves to the package root (has package.json + skills)", () => {
		const r = packageRoot();
		expect(fs.existsSync(path.join(r, "package.json"))).toBe(true);
		expect(fs.existsSync(path.join(r, "skills"))).toBe(true);
		expect(r).toBe(root);
	});
});

describe("managed block hardening (F6)", () => {
	let tmp: string;
	beforeEach(() => {
		tmp = fs.mkdtempSync(path.join(os.tmpdir(), "agent-skills-block-"));
	});
	afterEach(() => {
		fs.rmSync(tmp, { recursive: true, force: true });
	});

	it("does not treat an inline (mid-line) marker in user prose as a boundary", () => {
		const dest = path.join(tmp, "AGENTS.md");
		fs.writeFileSync(dest, `See \`${BLOCK_START}\` for how this works.\n`);
		writeManagedBlock(dest, "hello", false);
		const content = fs.readFileSync(dest, "utf8");
		// The inline mention survives; our block is appended, and there is exactly one real pair.
		expect(content).toContain("for how this works");
		expect(content.match(new RegExp(`^${BLOCK_START}$`, "gm"))?.length).toBe(1);
	});

	it("round-trips content via readManagedBlock", () => {
		const dest = path.join(tmp, "AGENTS.md");
		writeManagedBlock(dest, "payload-123", false);
		expect(readManagedBlock(dest)).toBe("payload-123");
	});

	it("throws on duplicate marker pairs instead of guessing", () => {
		const dest = path.join(tmp, "AGENTS.md");
		fs.writeFileSync(dest, `${BLOCK_START}\na\n${BLOCK_END}\n\n${BLOCK_START}\nb\n${BLOCK_END}\n`);
		expect(() => writeManagedBlock(dest, "x", false)).toThrow(/duplicate/i);
	});

	it("keeps surrounding user content on removal", () => {
		const dest = path.join(tmp, "AGENTS.md");
		fs.writeFileSync(dest, "# Mine\n\nkeep me\n");
		writeManagedBlock(dest, "ours", false);
		removeManagedBlock(dest, false);
		const content = fs.readFileSync(dest, "utf8");
		expect(content).toContain("keep me");
		expect(content).not.toContain(BLOCK_START);
	});
});
