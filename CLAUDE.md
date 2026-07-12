# CLAUDE.md — agent-skills

Project guidance for Claude Code sessions working in this repo. The user's global
`~/.claude/CLAUDE.md` still applies; this file adds the repo-specific rules that bite.

## What this is

A **private** source-of-truth repo for the `ed-*` skill suite plus a tested CLI that installs
the skills into Claude Code and other assistants. Not published to npm; distributed by cloning
this repo. The skills author's own machine runs them **live via symlink** into `~/.claude/skills`.

## Architecture (one paragraph)

`skills/<name>/SKILL.md` is the source of truth. **Target adapters** in `src/targets/` transform
each skill into a tool's native format on install (claude = symlink/copy the dir; cursor/windsurf/
cline/continue = one generated file per skill; codex/copilot/zed/aider = all skills in one managed
block). `src/commands/` holds the CLI verbs; `src/cli.ts` builds the commander program and
`src/index.ts` runs it. `src/core/` holds config, skill parsing/validation, path + install-fs
helpers, and the logger. The installer only ever touches entries it created (markers / managed
blocks); `--force` backs up, never deletes.

## The gate — run before every commit

```sh
pnpm run format      # prettier
pnpm run lint        # eslint (padding + jsdoc rules are enforced, not optional)
pnpm run typecheck   # tsc over src + test + scripts
pnpm run validate    # skill frontmatter / naming / refs / quality lints
pnpm test            # vitest (or test:coverage — CI enforces a 70% branch threshold)
pnpm run build       # tsup bundle
```

**Whenever a skill changes (body, description, or a new/removed skill), run `pnpm docs:gen`** and
commit the result — CI's docs-freshness check fails on stale `docs/`. This is the single most
common trip-up.

## Authoring a skill

- Scaffold with `pnpm skills new <name>`; keep the shared anatomy: frontmatter (`name`,
  `description`, `version`) → phased body → `## Anti-patterns` → `## Done when` → a final handoff
  line naming the next skill.
- The **description** must name its own `/<skill>` trigger, stay under 1024 chars, and end with a
  handoff clause (`hands off to /ed-x`, `routes to`, or `feeds`) — the skill map is parsed from it.
- Every skill needs an entry in **`evals/beats.json`** (3–5 lowercase substrings that appear in the
  body); `pnpm test` fails until the body delivers them. See `evals/README.md`.
- `pnpm skills install -t claude` re-links; since installs are symlinks, source edits are already
  live — `pnpm skills sync` re-generates the non-symlink targets.

## Releasing (changesets)

Versioning/changelog is automated with changesets; npm publish is gated on `NPM_TOKEN` (unset — this
repo is private, so the flow is **versioning only**, no publish).

- User-facing change → `pnpm changeset` in the same commit (new skills = `minor`, fixes = `patch`).
- Push to `main` → the release workflow opens a **"version packages" PR** (bumps `package.json` +
  prepends to `CHANGELOG.md`). Merging it lands the release. `0.1.0`–`0.4.0` were hand-cut; `0.4.1`
  onward go through changesets.

## Conventions

- **Conventional commits** (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `build:`,
  `ci:`). **No `Co-Authored-By` trailers.**
- **Function declarations over arrow functions.** Tabs (width 4), print width 150. **JSDoc on every
  `src/` function** (`@param`, `@returns` where non-void) — eslint enforces it.
- Prefer the dedicated skills over ad-hoc work: `/ed-plan` → `/ed-work` → `/ed-review` → `/ed-ship`;
  `/ed-deps` for dependency bumps; `/ed-commit` for commit authoring.
