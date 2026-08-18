import fs from "node:fs";
import path from "node:path";
import { load as loadYaml } from "js-yaml";

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
	/** YAML parse failure captured so validation can report it without aborting the corpus scan. */
	parseError?: string;
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
 * Parse a SKILL.md's leading `---` frontmatter as YAML, matching the shared agent
 * skills format consumed by Claude Code and Codex.
 *
 * @param raw - Full SKILL.md contents.
 * @returns The parsed key/value data and the body with frontmatter stripped.
 */
export function parseFrontmatter(raw: string): { data: Record<string, unknown>; body: string; error?: string } {
	const match = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n([\s\S]*))?$/.exec(raw);

	if (!match) return { data: {}, body: raw.trim() };

	try {
		const parsed = loadYaml(match[1]!);

		if (parsed === null) return { data: {}, body: (match[2] ?? "").trim() };

		if (typeof parsed !== "object" || Array.isArray(parsed)) {
			return { data: {}, body: (match[2] ?? "").trim(), error: "frontmatter must be a YAML mapping" };
		}

		return { data: parsed as Record<string, unknown>, body: (match[2] ?? "").trim() };
	} catch (err) {
		return {
			data: {},
			body: (match[2] ?? "").trim(),
			error: err instanceof Error ? err.message.split("\n")[0] : String(err),
		};
	}
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
	const { data, body, error } = parseFrontmatter(raw);

	return {
		name: path.basename(dir),
		dir,
		file,
		frontmatter: { name: "", description: "", ...data } as SkillFrontmatter,
		body,
		raw,
		parseError: error,
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
	const name = typeof fm.name === "string" ? fm.name : "";
	const description = typeof fm.description === "string" ? fm.description : "";

	if (skill.parseError) add("error", "frontmatter.yaml", `invalid YAML: ${skill.parseError}`);

	if (!name) {
		add("error", "frontmatter.name", fm.name === "" ? "missing `name` in frontmatter" : "`name` must be a string");
	} else {
		if (name !== skill.name) add("error", "name.match-dir", `frontmatter name "${name}" != directory "${skill.name}"`);

		if (!KEBAB.test(name)) add("error", "name.kebab", `name "${name}" is not kebab-case`);
	}

	if (!description) {
		add("error", "frontmatter.description", fm.description === "" ? "missing `description` in frontmatter" : "`description` must be a string");
	} else {
		if (description.includes("\n")) add("error", "description.single-line", "description must be a single line");

		if (description.length > DESCRIPTION_WARN_LIMIT) {
			add("warn", "description.length", `description is ${description.length} chars (> ${DESCRIPTION_WARN_LIMIT}); consider trimming`);
		}

		if (description.length < DESCRIPTION_MIN_LENGTH) {
			add(
				"warn",
				"description.thin",
				`description is only ${description.length} chars (< ${DESCRIPTION_MIN_LENGTH}); say what it does, when to use it, and its handoff`,
			);
		}

		// Name both hosts' explicit invocation syntax so users can discover and invoke the skill.
		if (name && !description.toLowerCase().includes(`/${name.toLowerCase()}`)) {
			add("warn", "description.trigger.claude", `description should name /${skill.name} for Claude Code invocation`);
		}

		if (name && !description.toLowerCase().includes(`$${name.toLowerCase()}`)) {
			add("warn", "description.trigger.codex", `description should name $${skill.name} for Codex invocation`);
		}
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
 * Extract `/skill-ref` and `$skill-ref` tokens (without the sigil) from prose — the one
 * grammar for "what looks like a skill reference", shared by the dangling-reference
 * lint here and the docs handoff-map generator so they never disagree.
 *
 * @param text - Prose that may mention Claude Code or Codex skill references.
 * @returns The referenced tokens, in order (with duplicates).
 */
export function extractSkillRefs(text: string): string[] {
	return [...text.matchAll(/(?:\/|\$)([a-z][a-z0-9-]{2,})/g)].map((m) => m[1]!);
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
