import fs from "node:fs";
import path from "node:path";

/** Parsed YAML frontmatter of a SKILL.md. `name` and `description` are required. */
export interface SkillFrontmatter {
	name: string;
	description: string;
	[key: string]: unknown;
}

/** A single skill loaded from disk. */
export interface Skill {
	/** Directory name — the canonical id, must equal `frontmatter.name`. */
	name: string;
	/** Absolute path to the skill directory. */
	dir: string;
	/** Absolute path to the skill's SKILL.md. */
	file: string;
	/** Parsed frontmatter. */
	frontmatter: SkillFrontmatter;
	/** Markdown body with the frontmatter stripped. */
	body: string;
	/** Full raw file contents. */
	raw: string;
}

/** A validation finding against a skill. `error` fails CI; `warn` is advisory. */
export interface Issue {
	skill: string;
	level: "error" | "warn";
	rule: string;
	message: string;
}

/** Max description length before we warn — long descriptions bloat the model's skill index. */
export const DESCRIPTION_WARN_LIMIT = 1024;

/** Below this, a description gives the model too little to match the skill on. */
export const DESCRIPTION_MIN_LENGTH = 80;

/** Low-value filler that weakens instructions; flagged so skills stay crisp. */
export const WEASEL_WORDS = ["simply", "basically", "effortlessly", "trivially", "needless to say", "as you can see", "it goes without saying"];

/** Canonical kebab-case check for skill ids — shared with the `new` command. */
export const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Parse a SKILL.md's leading `---` frontmatter tolerantly — the way agent skill
 * loaders do — treating each `key: value` line as a single-line string. This is
 * deliberately more lenient than strict YAML so that descriptions containing a
 * `: ` (e.g. "Out of scope: …") parse the same way Claude Code accepts them.
 *
 * @param raw - Full SKILL.md contents.
 * @returns The parsed key/value data and the body with frontmatter stripped.
 */
export function parseFrontmatter(raw: string): { data: Record<string, string>; body: string } {
	const match = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n([\s\S]*))?$/.exec(raw);

	if (!match) return { data: {}, body: raw.trim() };

	const data: Record<string, string> = {};

	for (const line of match[1]!.split(/\r?\n/)) {
		if (!line.trim() || line.trimStart().startsWith("#")) continue;

		const kv = /^([A-Za-z0-9_-]+):[ \t]*(.*)$/.exec(line);

		if (!kv) continue;

		let value = kv[2] ?? "";

		if (value.length >= 2 && ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))) {
			value = value.slice(1, -1);
		}

		data[kv[1]!] = value;
	}

	return { data, body: (match[2] ?? "").trim() };
}

/**
 * Load and parse a single skill directory.
 *
 * @param dir - Absolute path to a directory containing a SKILL.md.
 * @returns The parsed {@link Skill}, or throws if SKILL.md is missing.
 */
export function loadSkill(dir: string): Skill {
	const file = path.join(dir, "SKILL.md");

	if (!fs.existsSync(file)) throw new Error(`No SKILL.md in ${dir}`);

	const raw = fs.readFileSync(file, "utf8");
	const { data, body } = parseFrontmatter(raw);

	return {
		name: path.basename(dir),
		dir,
		file,
		frontmatter: { name: "", description: "", ...data } as SkillFrontmatter,
		body,
		raw,
	};
}

/**
 * Structural validation of one skill (frontmatter shape, naming, description).
 * Cross-skill checks (dangling references) live in {@link validateReferences}.
 *
 * @param skill - A loaded skill.
 * @returns Any issues found (empty array = clean).
 */
export function validateSkill(skill: Skill): Issue[] {
	const issues: Issue[] = [];
	const add = (level: Issue["level"], rule: string, message: string) => issues.push({ skill: skill.name, level, rule, message });
	const fm = skill.frontmatter;

	if (!fm.name) {
		add("error", "frontmatter.name", "missing `name` in frontmatter");
	} else {
		if (fm.name !== skill.name) add("error", "name.match-dir", `frontmatter name "${fm.name}" != directory "${skill.name}"`);

		if (!KEBAB.test(fm.name)) add("error", "name.kebab", `name "${fm.name}" is not kebab-case`);
	}

	if (!fm.description) {
		add("error", "frontmatter.description", "missing `description` in frontmatter");
	} else {
		if (fm.description.includes("\n")) add("error", "description.single-line", "description must be a single line");

		if (fm.description.length > DESCRIPTION_WARN_LIMIT) {
			add("warn", "description.length", `description is ${fm.description.length} chars (> ${DESCRIPTION_WARN_LIMIT}); consider trimming`);
		}

		if (fm.description.length < DESCRIPTION_MIN_LENGTH) {
			add(
				"warn",
				"description.thin",
				`description is only ${fm.description.length} chars (< ${DESCRIPTION_MIN_LENGTH}); say what it does, when to use it, and its handoff`,
			);
		}

		// The convention is to name the skill's own /trigger in its description so it's discoverable.
		if (fm.name && !fm.description.toLowerCase().includes(`/${fm.name.toLowerCase()}`)) {
			add("warn", "description.trigger", `description should name its own /${skill.name} trigger so users can invoke it`);
		}
	}

	// `version` is optional, but if present it should be a semver-ish string so `list` can surface it.
	if (typeof fm.version === "string" && fm.version && !/^\d+\.\d+\.\d+/.test(fm.version)) {
		add("warn", "version.semver", `version "${fm.version}" is not semver-ish (e.g. 1.2.0)`);
	}

	if (skill.body.length < 40) add("warn", "body.thin", "body is very short — is this skill complete?");

	const weasel = WEASEL_WORDS.filter((w) => new RegExp(`\\b${w}\\b`, "i").test(skill.body));

	if (weasel.length > 0) add("warn", "prose.weasel", `filler that weakens instructions: ${weasel.join(", ")}`);

	if (!/^##\s+Done when/im.test(skill.body)) add("warn", "structure.done-when", "no `## Done when` completion gate");

	if (!/^##.*(anti-pattern|rules|does not do)/im.test(skill.body))
		add("warn", "structure.guardrails", "no guardrails section (Anti-patterns / Rules / does-NOT-do)");

	return issues;
}

/**
 * Extract `/skill-ref` tokens (without the leading slash) from prose — the one
 * grammar for "what looks like a skill reference", shared by the dangling-reference
 * lint here and the docs handoff-map generator so they never disagree.
 *
 * @param text - Prose that may mention `/skill` references.
 * @returns The referenced tokens, in order (with duplicates).
 */
export function extractSkillRefs(text: string): string[] {
	return [...text.matchAll(/\/([a-z][a-z0-9-]{2,})/g)].map((m) => m[1]!);
}

/**
 * Cross-skill reference check: flags `/name` mentions that look like a skill in
 * the same family (share a `prefix-`) but don't exist in the set. Catches a
 * handoff that points at a removed or misspelled skill.
 *
 * @param skills - The full set of loaded skills.
 * @returns Dangling-reference issues.
 */
export function validateReferences(skills: Skill[]): Issue[] {
	const issues: Issue[] = [];
	const names = new Set(skills.map((s) => s.name));
	const families = new Set(skills.map((s) => s.name.split("-")[0] + "-"));

	for (const skill of skills) {
		const seen = new Set<string>();
		// Scan the description too — the handoff clause lives there and is load-bearing.
		const haystack = `${skill.body}\n${skill.frontmatter.description}`;

		for (const token of extractSkillRefs(haystack)) {
			if (seen.has(token) || names.has(token)) continue;

			seen.add(token);
			const family = token.split("-")[0] + "-";

			if (families.has(family)) {
				issues.push({
					skill: skill.name,
					level: "error",
					rule: "reference.dangling",
					message: `references /${token} which is not a known skill (removed or misspelled?)`,
				});
			}
		}
	}

	return issues;
}
