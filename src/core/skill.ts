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
	/** Directory name - the canonical id, must equal `frontmatter.name`. */
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
	/** Concatenated Markdown of supporting files under `references/`, scanned for skill references. */
	supporting: string;
}

/** A validation finding against a skill. `error` fails CI; `warn` is advisory. */
export interface Issue {
	skill: string;
	level: "error" | "warn";
	rule: string;
	message: string;
}

/** Hard limit from the Agent Skills spec; hosts truncate or reject beyond it. */
export const DESCRIPTION_MAX_LENGTH = 1024;

/** Descriptions stay in every session's context, so each one should stay near this size. */
export const DESCRIPTION_TARGET_LENGTH = 280;

/** Below this, a description gives the model too little to match the skill on. */
export const DESCRIPTION_MIN_LENGTH = 80;

/**
 * Combined description budget for the whole corpus. Hosts cap the always-loaded skill index
 * (some at about 8,000 characters) and shorten or drop skills beyond it.
 */
export const DESCRIPTION_CORPUS_BUDGET = 8000;

/** The spec recommends keeping SKILL.md under 500 lines and roughly 5,000 tokens. */
export const BODY_MAX_LINES = 500;

/** A conservative 4-characters-per-token estimate of the 5,000-token body guidance. */
export const BODY_MAX_CHARS = 20000;

/** The only frontmatter fields allowed: the Agent Skills specification, so every host reads skills the same way. */
export const SPEC_FIELDS = ["name", "description", "license", "compatibility", "metadata", "allowed-tools"];

/** Verbs that introduce a description's handoff clause; the docs skill map is parsed from it. */
export const HANDOFF_VERB = /\b(hands? (?:off|back) to|routes? to|feeds?)\b/i;

/** Low-value filler that weakens instructions; flagged so skills stay crisp. */
export const WEASEL_WORDS = ["simply", "basically", "effortlessly", "trivially", "needless to say", "as you can see", "it goes without saying"];

/** Canonical kebab-case check for skill ids - shared with the `new` command. */
export const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Workflow stages, in graph order. Each skill declares one as `metadata.stage`; the docs
 * dependency graph groups skills by it.
 */
export const STAGES = ["explore", "understand", "plan", "build", "verify", "deliver", "operate"] as const;

/** A workflow stage from {@link STAGES}. */
export type Stage = (typeof STAGES)[number];

/**
 * The declared workflow stage of a skill.
 *
 * @param skill - A loaded skill.
 * @returns The stage, or undefined when missing or unknown.
 */
export function skillStage(skill: Skill): Stage | undefined {
	const metadata = skill.frontmatter.metadata;
	const stage = metadata && typeof metadata === "object" ? (metadata as Record<string, unknown>).stage : undefined;

	return STAGES.find((known) => known === stage);
}

/**
 * Parse a SKILL.md's leading `---` frontmatter as YAML, matching the shared Agent
 * Skills format.
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
	const referencesDir = path.join(dir, "references");
	const supporting = fs.existsSync(referencesDir)
		? fs
				.readdirSync(referencesDir)
				.filter((entry) => entry.endsWith(".md"))
				.sort()
				.map((entry) => fs.readFileSync(path.join(referencesDir, entry), "utf8"))
				.join("\n")
		: "";

	return {
		name: path.basename(dir),
		dir,
		file,
		frontmatter: { name: "", description: "", ...data } as SkillFrontmatter,
		body,
		raw,
		parseError: error,
		supporting,
	};
}

/**
 * Structural validation of one skill (frontmatter shape, naming, description, body size,
 * supporting-file links). Cross-skill checks live in
 * {@link validateReferences} and {@link validateCorpus}.
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

		if (name.length > 64) add("error", "name.length", "skill names must not exceed 64 characters");

		if (!KEBAB.test(name)) add("error", "name.kebab", `name "${name}" is not kebab-case`);
	}

	if (!description) {
		add("error", "frontmatter.description", fm.description === "" ? "missing `description` in frontmatter" : "`description` must be a string");
	} else {
		if (description.includes("\n")) add("error", "description.single-line", "description must be a single line");

		if (description.length > DESCRIPTION_MAX_LENGTH) {
			add("error", "description.length", `description is ${description.length} chars (> ${DESCRIPTION_MAX_LENGTH})`);
		} else if (description.length > DESCRIPTION_TARGET_LENGTH) {
			add(
				"warn",
				"description.budget",
				`description is ${description.length} chars (> ${DESCRIPTION_TARGET_LENGTH}); it is loaded in every session`,
			);
		}

		if (description.length < DESCRIPTION_MIN_LENGTH) {
			add(
				"warn",
				"description.thin",
				`description is only ${description.length} chars (< ${DESCRIPTION_MIN_LENGTH}); say what it does, when to use it, and its handoff`,
			);
		}

		if (!HANDOFF_VERB.test(description))
			add("warn", "description.handoff", "description has no handoff clause (hands off to / routes to / feeds)");
	}

	// Host-specific extensions make a skill behave differently per agent; keep the corpus portable.
	for (const key of Object.keys(fm)) {
		if (!SPEC_FIELDS.includes(key))
			add("error", "frontmatter.portable", `\`${key}\` is not an Agent Skills spec field; skills must stay host-agnostic`);
	}

	const metadata = fm.metadata;

	// The spec defines metadata as a string-to-string map.
	if (metadata !== undefined && (typeof metadata !== "object" || metadata === null || Array.isArray(metadata))) {
		add("error", "metadata.shape", "`metadata` must be a map of string keys to string values");
	} else if (metadata && Object.values(metadata).some((value) => typeof value !== "string")) {
		add("error", "metadata.shape", "`metadata` values must be strings");
	}

	if (!skillStage(skill)) add("error", "metadata.stage", `\`metadata.stage\` must be one of: ${STAGES.join(", ")}`);

	const lines = skill.body.split("\n").length;

	if (lines > BODY_MAX_LINES || skill.body.length > BODY_MAX_CHARS) {
		add("warn", "body.size", `body is ${lines} lines / ${skill.body.length} chars; move situational material to references/`);
	}

	if (skill.body.length < 40) add("warn", "body.thin", "body is very short - is this skill complete?");

	for (const link of localLinks(skill.body)) {
		if (skill.dir && !fs.existsSync(path.join(skill.dir, link))) add("error", "link.missing", `links to ${link}, which does not exist`);
	}

	const weasel = WEASEL_WORDS.filter((w) => new RegExp(`\\b${w}\\b`, "i").test(skill.body));

	if (weasel.length > 0) add("warn", "prose.weasel", `filler that weakens instructions: ${weasel.join(", ")}`);

	if (!/^##\s+Done when/im.test(skill.body)) add("warn", "structure.done-when", "no `## Done when` completion gate");

	if (!/^##.*(anti-pattern|rules|does not do)/im.test(skill.body))
		add("warn", "structure.guardrails", "no guardrails section (Anti-patterns / Rules / does-NOT-do)");

	return issues;
}

/**
 * Relative Markdown link targets in a body, ignoring URLs, anchors and absolute paths.
 *
 * @param body - Skill Markdown body.
 * @returns Link paths relative to the skill directory, without fragments.
 */
export function localLinks(body: string): string[] {
	return [...body.matchAll(/\]\(([^)\s]+)\)/g)]
		.map((m) => m[1]!.split("#")[0]!)
		.filter((link) => link !== "" && !/^[a-z][a-z0-9+.-]*:/i.test(link) && !link.startsWith("/"));
}

/**
 * Corpus-wide checks: an empty corpus, and the combined description budget.
 *
 * @param skills - The full set of loaded skills.
 * @returns Corpus issues.
 */
export function validateCorpus(skills: Skill[]): Issue[] {
	if (skills.length === 0) {
		return [{ skill: "corpus", level: "error", rule: "corpus.empty", message: "No skills found; check the skills directory." }];
	}

	const total = skills.reduce((sum, skill) => sum + String(skill.frontmatter.description ?? "").length, 0);

	if (total > DESCRIPTION_CORPUS_BUDGET) {
		return [
			{
				skill: "corpus",
				level: "error",
				rule: "corpus.description-budget",
				message: `model-invocable descriptions total ${total} chars (> ${DESCRIPTION_CORPUS_BUDGET}); hosts will truncate or drop skills`,
			},
		];
	}

	return [];
}

/**
 * Extract backticked skill references (`` `flow-plan` ``) from prose - the one grammar for
 * "what looks like a skill reference", shared by the dangling-reference lint here and the
 * docs handoff-map generator so they never disagree. Plain names keep skills host-agnostic;
 * each host has its own invocation syntax.
 *
 * @param text - Prose that may mention skills.
 * @returns The referenced tokens, in order (with duplicates).
 */
export function extractSkillRefs(text: string): string[] {
	return [...text.matchAll(/`([a-z][a-z0-9]*-[a-z0-9-]+)`/g)].map((m) => m[1]!);
}

/**
 * Cross-skill reference check: flags backticked names that look like a skill in
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
		// Scan the description (the handoff clause is load-bearing) and supporting references.
		const haystack = `${skill.body}\n${skill.frontmatter.description}\n${skill.supporting}`;

		for (const token of extractSkillRefs(haystack)) {
			if (seen.has(token) || names.has(token)) continue;

			seen.add(token);
			const family = token.split("-")[0] + "-";

			if (families.has(family)) {
				issues.push({
					skill: skill.name,
					level: "error",
					rule: "reference.dangling",
					message: `references ${token}, which is not a known skill (removed or misspelled?)`,
				});
			}
		}
	}

	return issues;
}
