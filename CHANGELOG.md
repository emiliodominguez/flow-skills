# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/); this project uses [SemVer](https://semver.org/).

## [Unreleased]

### Added

- **`sync` command** — re-installs whatever is already installed across all targets (via
  `Target.status()`), so a source edit propagates everywhere with one command.
- **`install --watch`** — keeps running and re-generates targets on source change (debounced).
- **Five new targets** — GitHub Copilot (`.github/copilot-instructions.md`), Zed (`.rules`),
  aider (`CONVENTIONS.md`), Cline (`.clinerules/`), and Continue (`.continue/rules/`). The
  bundle adapters (codex, copilot, zed, aider) now share one `makeBundleTarget` factory.
- **Profiles** — a `profiles` map in config plus `install/uninstall --profile <name...>` to
  install curated subsets; `list --profiles` prints them.
- **Per-skill `version`** frontmatter, validated as semver-ish and surfaced by `list`.
- **Golden snapshot tests** freezing each adapter's exact output for a synthetic fixture skill.
- **Generated per-skill docs** — `docs/skills/<name>.md` for each skill, linked from the
  catalog; CI docs-freshness now covers the whole `docs/` tree.
- **Six new skills** — `ed-test`, `ed-onboard`, `ed-migrate`, `ed-benchmark`, `ed-docs`, and
  `ed-triage`.

### Changed

- **Package prepared for npm publishing** as the scoped `@emiliodominguez/agent-skills` (no
  longer `private`); the release workflow will `pnpm publish` on the next `v*` tag once the
  `NPM_TOKEN` secret is set. Not yet on npm.
- Dependencies brought to their latest majors: `commander` 15, `eslint`/`@eslint/js` 10,
  `vitest` 4 (+ explicit `vite` 8, which vitest 4 requires for its module runner),
  `js-yaml` 5, `lint-staged` 17, `@types/node` 26, and the CI GitHub Actions.
- Dropped `@types/js-yaml` (js-yaml 5 ships its own types); tsup target bumped to node22.

### Held back

- **TypeScript stays on 5.x.** TypeScript 7 (the native compiler) is blocked upstream:
  `typescript-eslint` declares `peerDependencies.typescript >=4.8.4 <6.1.0`, so type-aware
  linting cannot run on TS 7 yet. Dependabot is configured to skip the TS major until
  typescript-eslint ships support.

## [0.2.0] — 2026-07-11

A "bulletproof" hardening pass across correctness, operations, and process.

### Added

- **`doctor` command** — reports each target's install state (linked / copied / generated /
  drifted / conflict / missing) via a new `Target.status()`, flags drift and conflicts, and
  exits non-zero so it's scriptable.
- **`--force` flag** on `install`/`uninstall` — and it **backs up** (moves to a `.bak-<n>`
  sibling) rather than deleting outright.
- **Auto-generated skills catalog** (`docs/SKILLS.md` via `pnpm docs:gen`), enforced fresh by CI.
- **ESLint** (typescript-eslint) with the type-aware async rules; **coverage** (v8, 70%
  threshold, ~84% actual); **packaging smoke test** (`pnpm smoke`); **husky + lint-staged**
  pre-commit; **Dependabot**; a **release workflow**; `.editorconfig` and a PR template.

### Changed

- File-per-skill targets (cursor/windsurf) now guard **unmanaged files on install too** (they
  previously overwrote them) — consistent with the native target; both honor `--force`.
- One target failing no longer aborts the others (per-target error handling; non-zero exit).
- On Windows the native target falls back to copy (no symlink privilege).
- Typecheck now covers `test/` and `scripts/` (they were silently excluded); the CI test job
  runs on a Node 22/24 matrix.

### Fixed

- Stricter skill lint: the dangling-reference check now also scans descriptions; warns on
  missing `Done when` / guardrails sections.

## [0.1.1] — 2026-07-11

Hardening pass from a multi-persona review of 0.1.0, each fix covered by a regression test.

### Fixed

- **Data loss (blocking):** the `claude` target now recognises entries it created (a symlink
  into the repo, or a `.agent-skills` marker in a copy). `install` refuses to overwrite an
  unmanaged directory without `--force`, and `uninstall` never deletes one.
- **Windsurf invalid YAML:** frontmatter is rendered through the shared `frontmatter()`
  helper, so a description containing `: ` (or `#`/`&`) is quoted instead of emitted raw.
- **Codex clobbering:** `AGENTS.md` is now a section-level merge with per-skill markers, so a
  partial `-t codex` install/uninstall only touches the named skills.
- **`findRepoRoot` off-by-one:** the fallback walks up to the package root (works for the
  bundled `dist/` and `tsx` layouts alike), so `npx github:…` from outside a checkout finds
  the skills; `--version` reads the CLI's own package; `agent-skills.config.json` ships in
  `files`.
- **Robustness:** frontmatter parser tolerates multi-space key alignment; `AGENTS.md` markers
  are line-anchored and duplicate/malformed pairs throw instead of corrupting content;
  `prettyPath` respects path boundaries; `escapeYaml`, symlink capability (`supportsSymlink`),
  and shared file-per-skill helpers replace dead/duplicated code.

### Added

- `--force` flag on `install`/`uninstall`.

## [0.1.0] — 2026-07-11

Initial release.

### Added

- **16 `ed-*` skills** as the source of truth, upgraded to a shared anatomy with
  multi-agent review/planning, adversarial verification, and a plan→work fresh-context flow.
- **CLI** (`agent-skills`): `list`, `validate`, `install`, `uninstall`, `new`.
- **Target adapters**: `claude` (native, symlink or copy), `cursor` (`.mdc`), `codex`
  (`AGENTS.md` managed block), `windsurf` (`.md`).
- **Install modes**: symlink (edit-live) by default, `--copy` for frozen snapshots;
  `user`/`project` scopes; `--dry-run`.
- **Validation**: frontmatter shape, kebab-case naming, dir/name match, dangling
  cross-reference detection — shared by the CLI and the test suite.
- **Safety**: generated files carry a marker so `uninstall` only removes tool-created
  files; `AGENTS.md` edits are confined to a delimited managed block.
- **Config** (`agent-skills.config.json` + JSON schema) with git-ignored local overrides.
- **Bootstrap** `install.sh`, tests (vitest), CI (typecheck + validate + test + format),
  and docs (overview, authoring, roadmap).
