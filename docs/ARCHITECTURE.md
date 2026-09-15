# Architecture

Skills are authored once as `skills/<name>/SKILL.md`. Target adapters install native skill
directories or render the body into a host's rule format. These are different delivery modes;
a rendered rule does not acquire native skill discovery, supporting files or agent configuration.

## Module map

| Module                                               | Responsibility                                                                   |
| ---------------------------------------------------- | -------------------------------------------------------------------------------- |
| `src/index.ts`, `src/cli.ts`                         | Process entry point and Commander command wiring                                 |
| `src/commands/`                                      | Install/uninstall, sync, doctor, validation, listing, scaffolding and completion |
| `src/core/config.ts`                                 | Root discovery, built-in defaults and config precedence                          |
| `src/core/registry.ts`, `skill.ts`                   | Discover, select, parse and validate the corpus                                  |
| `src/core/paths.ts`, `install-mode.ts`               | Resolve destinations and supported native install mode                           |
| `src/core/install-fs.ts`                             | Ownership-aware filesystem operations and managed blocks                         |
| `src/targets/`                                       | Format-specific install, uninstall and status adapters                           |
| `scripts/gen-skill-docs.ts`                          | Catalog, handoff table and per-skill pages; read-only freshness mode             |
| `scripts/eval-llm.ts`, `scripts/lib/eval-verdict.ts` | Optional instruction audit and complete-verdict validation                       |
| `test/`, `evals/`                                    | CLI regression checks, instruction markers and realistic agent scenarios         |

## Adapter contract

Each `Target` has a name, description, `supportsSymlink` flag and three methods:
`install(ctx): Action[]`, `uninstall(ctx): Action[]`, `status(ctx): SkillStatus[]`.
The context supplies selected skills, resolved destination, mode, force and dry-run flags.
Adapters return actions instead of logging, keeping behavior testable.

| Adapter shape       | Targets                           | Output                                           |
| ------------------- | --------------------------------- | ------------------------------------------------ |
| Directory per skill | Claude Code, Codex                | Symlinked or copied complete directory           |
| File per skill      | Cursor, Windsurf, Cline, Continue | Generated rule containing body and description   |
| Managed bundle      | Copilot, Zed, aider               | Selected skill sections within a delimited block |

Keep native host capabilities separate from what an adapter actually emits. Current target
paths and migration considerations are in [configuration](CONFIGURATION.md).

## Command flow

Install resolves the corpus root and merged config, selects explicit names or profile unions,
then resolves each selected target's consuming-project or user path. It invokes the adapter
with the effective mode, prints actions and collects failures. One target's failure does not
prevent subsequent targets from being inspected. Unknown or disabled requested targets fail.

`sync` refreshes only existing managed installations and preserves native copy/symlink modes.
`doctor` reads state without mutation; missing skills mean uninstalled, while drift, conflicts
and target errors make the report unhealthy. A healthy doctor report is not proof of host
activation. `validate` rejects an empty corpus and reports all discoverable skill issues.

## Ownership and safety

- Native entries are managed through the ownership manifest, a recognized source symlink or
  a copied directory's marker. An unmanaged collision is preserved unless `--force` requests
  a backup and replacement. Uninstall skips unmanaged entries.
- File-per-skill outputs carry a marker; managed blocks delimit only the installer-owned
  portion of a shared file. Hand-written surrounding content is preserved.
- `--force` backs up collisions to a sibling path. It is not blanket permission to remove
  unrelated configuration. `--dry-run` previews without changes.
- Codex legacy migration touches only content it can attribute to this installer. Windows
  native installations use copy mode when symlinking is unavailable.
- Changes to default destinations do not scan or delete old locations. Migration must preserve
  hand-written content and inspect the old install explicitly.

## Validation and generated artifacts

Frontmatter is parsed with `js-yaml`; malformed YAML becomes an issue rather than aborting the
corpus scan. Descriptions are quoted when rendering to preserve colon-containing text.
`docs:gen` owns the catalog, handoff table and generated skill pages. `docs:check` reports stale
or obsolete output without rewriting files or the Git index.

Instruction markers catch textual omissions. The optional model audit accepts only one typed,
nonempty verdict for every requested marker; empty, partial, duplicate or unknown verdicts fail.
It requires an explicit model and API key and fails visibly when unavailable. Neither check
executes a skill. Actual agent decisions are assessed with isolated scenarios in [evals](../evals/README.md).

TypeScript scripts run through Node's `--import tsx` loader. The build remains a bundled CLI;
`pnpm smoke` checks the packed artifact from a clean consumer project.
