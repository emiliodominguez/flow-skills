# AGENTS.md - flow-skills

Project guidance for agent sessions working in this repository. Global user instructions still apply.

## What this is

The source-of-truth repository for the host-agnostic `flow-*` skill suite. It is distributed
from GitHub through the open skills CLI (`npx skills add emiliodominguez/flow-skills`), which installs
into any supported agent. `.claude-plugin/` manifests are an optional plugin-marketplace channel.
Nothing is published to npm.

## Architecture

`skills/<name>/SKILL.md` is the source of truth, with optional `references/*.md` loaded on demand.
`profiles.json` holds install profiles. `install.sh` / `uninstall.sh` wrap `npx skills add/remove`,
adding profiles and legacy `ed-*` cleanup. `src/` is an authoring CLI only (`pnpm skills list|validate|new`):
`src/core/skill.ts` parses and validates skills, `src/core/distribution.ts` checks profiles and manifests.

## Required gate

Run `pnpm check` before committing (format check, lint, typecheck, validate, tests with coverage, docs check).

Whenever a skill changes (body, description, or a new or removed skill), run `pnpm docs:gen`, inspect
and commit the generated docs, and run `pnpm docs:check`. Run `pnpm smoke` for install script or
manifest changes. Check actual hosted CI status; local evidence is required even when Actions is disabled.

## Skill authoring

- Scaffold with `pnpm skills new flow-<name>`. Keep the anatomy: frontmatter, phased body,
  `## Anti-patterns`, `## Done when`, and a final line naming the next skill.
- Keep skills host-agnostic: frontmatter holds only Agent Skills spec fields (normally `name` and
  `description`); bodies name no host, tool or model and use no host invocation syntax. Refer to other
  skills by backticked name, for example `` `flow-verify` ``.
- Descriptions are always in context: aim for about 200 characters, stay under 280, and end with a
  handoff clause (`Hands off to`, `Hands back to`, `Routes to`, or `Feeds`) naming skills in backticks.
  The docs skill map is parsed from it. The corpus must stay under 8,000 description characters.
- Move situational material to `references/<topic>.md` and say when to read it.
- Every skill needs an entry in `evals/beats.json` (3-5 lowercase substrings from `SKILL.md`). These
  check text presence, not behavior. See `evals/README.md`.
- Test installs in a throwaway project with `./install.sh --local --project`. Distinguish install
  checks from real agent sessions.

## Versions (changesets)

- Add a changeset for each user-facing change (new skills = minor, fixes = patch, renames = major).
- When a version is ready, run `pnpm run version:packages` (it also syncs `.claude-plugin/plugin.json`),
  review the version and changelog, and commit them.

## Conventions

- Conventional commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `build:`, `ci:`).
  No `Co-Authored-By` trailers.
- Function declarations over arrow functions. Tabs (width 4), print width 150. JSDoc on every `src/`
  function (`@param`, `@returns` where non-void); eslint enforces it.
- Do not use em or en dashes in prose, comments, metadata, or user-facing text. Use an ASCII hyphen.
- Prefer the suite's own skills: `flow-plan` → `flow-work` → `flow-review` → `flow-ship`; `flow-deps`
  for dependency bumps; `flow-commit` for commit authoring.
