import path from "node:path";
import pc from "picocolors";
import { findRepoRoot, loadConfig } from "../core/config.js";
import { discoverSkills } from "../core/registry.js";
import { validateReferences, validateSkill, type Issue, type Skill } from "../core/skill.js";
import { log, sym, sanitize } from "../core/logger.js";

/**
 * Run all validations over an already-loaded skill set.
 *
 * @param skills - The loaded skills.
 * @returns All issues (errors + warnings) across every skill.
 */
export function collectIssuesFor(skills: Skill[]): Issue[] {
	const issues = skills.flatMap((skill) => validateSkill(skill));

	issues.push(...validateReferences(skills));

	return issues;
}

/**
 * Validate a skills directory in one scan. Reused by the CLI and the test suite
 * so "the tests" and "the command" can never drift.
 *
 * @param skillsDir - Absolute path to the skills directory.
 * @returns The loaded skills and their issues.
 */
export function validateAll(skillsDir: string): { skills: Skill[]; issues: Issue[] } {
	const skills = discoverSkills(skillsDir);

	return { skills, issues: collectIssuesFor(skills) };
}

/**
 * `validate` - structural checks on every skill; exits non-zero on any error.
 *
 * @param opts - `strict` to also fail on warnings.
 */
export function validateCommand(opts: { strict?: boolean }): void {
	const root = findRepoRoot();
	const config = loadConfig(root);
	const { skills, issues } = validateAll(path.join(root, config.skillsDir));

	const errors = issues.filter((i) => i.level === "error");
	const warns = issues.filter((i) => i.level === "warn");
	// Skill names and messages embed repo-derived frontmatter; sanitize before printing.
	const width = Math.max(0, ...issues.map((i) => sanitize(i.skill).length));

	for (const issue of issues) {
		const isError = issue.level === "error";
		const tag = (isError ? pc.red : pc.yellow)(`${isError ? sym.err : sym.warn} ${(isError ? "error" : "warn").padEnd(5)}`);

		console.log(`  ${tag}  ${pc.bold(sanitize(issue.skill).padEnd(width))}  ${pc.dim(issue.rule)} ${pc.dim(sym.dot)} ${sanitize(issue.message)}`);
	}

	log.heading(`Checked ${skills.length} skill${skills.length === 1 ? "" : "s"}`);

	if (errors.length === 0 && warns.length === 0) log.ok("all clean");
	else log.info(`${errors.length} error${errors.length === 1 ? "" : "s"} ${sym.dot} ${warns.length} warning${warns.length === 1 ? "" : "s"}`);

	if (errors.length > 0 || (opts.strict && warns.length > 0)) process.exitCode = 1;
}
