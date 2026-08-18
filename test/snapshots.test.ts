import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadSkill } from "../src/core/skill";
import { getTarget } from "../src/targets/index";
import type { InstallContext } from "../src/targets/types";

/**
 * Golden snapshots freeze the EXACT bytes each adapter emits for a fixed synthetic
 * skill. A format change in any adapter shows up as a snapshot diff in review.
 * The fixture is synthetic (not a real skill) so the snapshots never churn when
 * the skill corpus is edited. Its description carries a colon and both invocation
 * syntaxes to exercise YAML quoting and cross-references.
 */
const FIXTURE = `---
name: ed-fixture
description: "A fixture skill: freeze the exact adapter output. Use when snapshot-testing; invoke /ed-fixture in Claude Code or $ed-fixture in Codex; hand off to /ed-work or $ed-work."
---

# Fixture

One line about the fixture and the discipline it enforces.

---

## Process

1. **Step one** - do the thing.
2. **Step two** - verify it.

---

## Anti-patterns

- ❌ Something not to do

---

## Done when

- The snapshot matches

Then: hand off to \`/ed-work\` in Claude Code or \`$ed-work\` in Codex.
`;

const here = path.dirname(fileURLToPath(import.meta.url));
let tmp: string;
let ctx: InstallContext;

beforeAll(() => {
	tmp = fs.mkdtempSync(path.join(os.tmpdir(), "agent-skills-snap-"));
	const skillDir = path.join(tmp, "ed-fixture");

	fs.mkdirSync(skillDir, { recursive: true });
	fs.writeFileSync(path.join(skillDir, "SKILL.md"), FIXTURE);
	const skill = loadSkill(skillDir);

	ctx = { skills: [skill], dest: "", mode: "copy", force: false, dryRun: false };
});
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

/** One adapter's snapshot case: how to derive its dest and where its output lands. */
interface Case {
	target: string;
	snap: string;
	/** true → dest is the bundle file itself; false → dest is a directory. */
	bundle: boolean;
	/** the generated file to read, relative to a fresh working dir. */
	rel: string;
}

/** Install one target into a fresh dir and return the generated file's contents. */
function render(c: Case): string {
	const work = fs.mkdtempSync(path.join(tmp, `${c.target}-`));
	const out = path.join(work, c.rel);

	getTarget(c.target).install({ ...ctx, dest: c.bundle ? out : work });

	return fs.readFileSync(out, "utf8");
}

describe("golden adapter output", () => {
	const cases: Case[] = [
		{ target: "claude", snap: "claude-SKILL.md", bundle: false, rel: "ed-fixture/SKILL.md" },
		{ target: "cursor", snap: "cursor.mdc", bundle: false, rel: "ed-fixture.mdc" },
		{ target: "windsurf", snap: "windsurf.md", bundle: false, rel: "ed-fixture.md" },
		{ target: "cline", snap: "cline.md", bundle: false, rel: "ed-fixture.md" },
		{ target: "continue", snap: "continue.md", bundle: false, rel: "ed-fixture.md" },
		{ target: "codex", snap: "claude-SKILL.md", bundle: false, rel: "ed-fixture/SKILL.md" },
		{ target: "copilot", snap: "copilot-instructions.md", bundle: true, rel: "copilot-instructions.md" },
		{ target: "zed", snap: "zed.rules", bundle: true, rel: ".rules" },
		{ target: "aider", snap: "aider-CONVENTIONS.md", bundle: true, rel: "CONVENTIONS.md" },
	];

	for (const c of cases) {
		it(`${c.target} output is unchanged`, async () => {
			await expect(render(c)).toMatchFileSnapshot(path.join(here, "__snapshots__", c.snap));
		});
	}
});
