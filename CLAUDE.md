# CLAUDE.md - agent-skills

Project guidance for Claude Code sessions working in this repo. The user's global
`~/.claude/CLAUDE.md` still applies; this file adds the repo-specific rules that bite.

## What this is

A **private** source-of-truth repo for the `ed-*` skill suite plus a tested CLI that installs
the skills into Claude Code, Codex, and other assistants. Not published to npm; distributed by
cloning this repo. Native Claude Code and Codex installs use **live symlinks** or explicit copy mode.

## Architecture (one paragraph)

`skills/<name>/SKILL.md` is the source of truth. **Target adapters** in `src/targets/` transform
each skill into a tool's native format on install (claude/codex = symlink/copy the dir; cursor/
windsurf/cline/continue = one generated file per skill; copilot/zed/aider = all skills in one
managed block). `src/commands/` holds the CLI verbs; `src/cli.ts` builds the commander program and
`src/index.ts` runs it. `src/core/` holds config, skill parsing/validation, path + install-fs
helpers, and the logger. The installer only ever touches entries it created (markers / managed
blocks); `--force` backs up, never deletes.

## The gate - run before every commit

```sh
pnpm run format      # prettier
pnpm run lint        # eslint (padding + jsdoc rules are enforced, not optional)
pnpm run typecheck   # tsc over src + test + scripts
pnpm run validate    # skill frontmatter / naming / refs / quality lints
pnpm run test:coverage  # vitest with the required 70% branch threshold
pnpm run build       # tsup bundle
```

**Whenever a skill changes (body, description, or a new/removed skill), run `pnpm docs:gen`** and
inspect and commit the generated result, then run `pnpm docs:check`. Use `pnpm smoke` for CLI/package
changes. Check actual hosted CI status; local evidence is required even when Actions is disabled.

## Authoring a skill

- Scaffold with `pnpm skills new <name>`; keep the shared anatomy: frontmatter (`name`,
  `description`) → phased body → `## Anti-patterns` → `## Done when` → a final handoff
  line naming the next skill.
- The **description** must name its own `/<skill>` (Claude Code) and `$<skill>` (Codex) triggers, stay under 1024 chars, and end with a
  handoff clause (`hands off to /ed-x`, `routes to`, or `feeds`) - the skill map is parsed from it.
- Every skill needs an entry in **`evals/beats.json`** (3-5 lowercase substrings that appear in the
  body); `pnpm test` checks text presence, not actual behavior. See `evals/README.md`.
- Test native installation in a throwaway project using `--scope project`. Source edits are live for symlinks;
  `pnpm skills sync` refreshes copies and generated targets. Distinguish installation tests from real host sessions.
- Keep shared skills self-contained for rendered targets. Native agent definitions are a separate capability.

## Releasing (changesets)

Do not assume a release workflow ran. Inspect actual Actions status and keep publishing within the user request.

- Add a changeset for each user-facing change (new skills = `minor`, fixes = `patch`).
- When a version is ready, run `pnpm run version:packages`, review the version and changelog changes, and commit them.
- Run `pnpm run release` only when publishing is explicitly requested and npm authentication is configured.

## Conventions

- **Conventional commits** (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `build:`,
  `ci:`). **No `Co-Authored-By` trailers.**
- **Function declarations over arrow functions.** Tabs (width 4), print width 150. **JSDoc on every
  `src/` function** (`@param`, `@returns` where non-void) - eslint enforces it.
- Do not use em or en dashes in prose, comments, metadata, or user-facing text. Rewrite the sentence or use an ASCII hyphen.
- Prefer the dedicated skills over ad-hoc work: `/ed-plan` → `/ed-work` → `/ed-review` → `/ed-ship`;
  `/ed-deps` for dependency bumps; `/ed-commit` for commit authoring.
