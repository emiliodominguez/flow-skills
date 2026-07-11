# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/); this project uses [SemVer](https://semver.org/).

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
