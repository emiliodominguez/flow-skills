# Roadmap

Where this goes next. This is the shareable, committed plan; use `/ed-plan` to spin up a
working plan in `.plans/` (git-ignored) when you pick something up.

## Tooling — near term

- [ ] `agent-skills doctor` — report install state: which skills are installed in which
      targets, and flag **drift** (a target's copy differs from the source, or a dead
      symlink). The first thing to run when "a skill isn't showing up".
- [ ] `agent-skills sync` — re-run install for whatever is currently installed, across all
      targets, so a source edit propagates everywhere with one command.
- [ ] Golden snapshot tests for adapter output — freeze the exact `.mdc` / `AGENTS.md` /
      `.md` a skill produces, so a format change is caught in review.
- [ ] `--watch` on install — re-generate non-native targets on source change (native is
      already live via symlink).
- [ ] Publish to npm as a scoped package (`@emiliodominguez/agent-skills`) so `npx` works
      without the `github:` prefix.

## Targets — expand coverage

- [ ] **GitHub Copilot** — `.github/copilot-instructions.md` (bundle, like Codex).
- [ ] **Zed** — `.zed/` rules.
- [ ] **Cline / Continue / aider** — each reads its own convention; add adapters as needed.
- [ ] Verify current Cursor/Windsurf paths against the latest releases and pin the
      documented default per tool version (they move).

## Profiles

- [ ] Named install sets in config — a `profiles` map (e.g. a `frontend` profile listing
      the CSS/UI skills) so `install --profile frontend` installs a curated subset per
      project.

## New skill candidates

Each needs an `/ed-brainstorm` pass before it's real — listed here as prompts, not commitments.

- **ed-test** — test strategy & authoring: what to test at which level, characterization
  tests, fixing flaky tests. (Today this lives inside `ed-work`; may deserve its own skill.)
- **ed-onboard** — understand an unfamiliar codebase fast: map entry points, data flow, and
  the 5 files that matter, via parallel read-only explorers.
- **ed-migrate** — large, mechanical, cross-file migrations with worktree isolation and a
  verify-each-site loop.
- **ed-benchmark** — measure before optimizing: set up a repeatable benchmark, capture a
  baseline, report deltas. (Feeds `ed-diagnose`'s perf path.)
- **ed-docs** — write docs that explain _why_, not _what_; keep them from rotting.
- **ed-triage** — incident/issue triage: reproduce, assess blast radius, decide
  fix-now-vs-later, route to the right skill.

## Housekeeping

- [ ] Per-skill version/changelog note in frontmatter, surfaced by `list`.
- [ ] A `docs/` page per skill generated from its `SKILL.md` for browsing on GitHub.
