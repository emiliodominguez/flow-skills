# Configuration

The CLI merges built-in defaults, `agent-skills.config.json`, then the git-ignored
`.agent-skills.local.json`. Overrides are merged by field and target. The
[JSON Schema](../agent-skills.schema.json) provides editor validation; unknown runtime
adapter names still fail rather than creating a host integration.

## Fields and profiles

| Field                        | Meaning                                                     |
| ---------------------------- | ----------------------------------------------------------- |
| `skillsDir`                  | Skill corpus directory relative to its configuration root   |
| `installMode`                | `symlink` or `copy` for native targets                      |
| `defaultTargets`             | Targets for install/uninstall when `--target` is omitted    |
| `profiles`                   | Named arrays of skill names; inspect with `list --profiles` |
| `targets.<name>.enabled`     | Whether an adapter is available for selection               |
| `targets.<name>.userPath`    | Destination for `--scope user`                              |
| `targets.<name>.projectPath` | Destination for `--scope project`                           |

The committed profiles are `core`, `orchestration`, `frontend`, `review` and `maintenance`.
Multiple profiles resolve to their union. Explicit skill names override profiles. An unknown
or empty profile fails; it never falls through to an operation on every skill.

Install/uninstall skip disabled inherited default targets. Explicitly requesting a disabled
or unknown target fails. `sync` and `doctor` default to enabled targets; explicit invalid
selections fail there too. Configuration does not dynamically register target adapters.

## Destination defaults

Relative paths resolve against the consuming Git project root, or the invocation directory
when outside Git. The source corpus may live elsewhere. `~` expands to the user's home.

| Target     | User scope                        | Project scope                     |
| ---------- | --------------------------------- | --------------------------------- |
| `claude`   | `~/.claude/skills`                | `.claude/skills`                  |
| `cursor`   | `.cursor/rules`                   | `.cursor/rules`                   |
| `codex`    | `~/.agents/skills`                | `.agents/skills`                  |
| `windsurf` | `.devin/rules`                    | `.devin/rules`                    |
| `copilot`  | `.github/copilot-instructions.md` | `.github/copilot-instructions.md` |
| `zed`      | `.rules`                          | `.rules`                          |
| `aider`    | `CONVENTIONS.md`                  | `CONVENTIONS.md`                  |
| `cline`    | `~/.cline/rules`                  | `.cline/rules`                    |
| `continue` | `~/.continue/rules`               | `.continue/rules`                 |

The scope selects a configured destination; it does not guarantee a global host feature.
Cursor, Windsurf, Copilot, Zed and aider use project files in either scope with these defaults.
Use `--scope project` when trying adapters in a throwaway project.

## Host compatibility and path migration

The defaults were reviewed on 2026-09-15. Host formats and local overrides still need to match
the installed application version.

- **Cursor:** `.cursor/rules/*.mdc` is a project rules location. Global user rules are configured
  through the host UI, so the previous `~/.cursor/rules` default was misleading. The adapter
  now uses the project path in either scope. [Cursor rules](https://cursor.com/docs/rules).
- **Windsurf/Cascade:** current documentation prefers `.devin/rules/*.md`; `.windsurf/rules`
  remains a legacy fallback. The global location is one `global_rules.md` file, limited to
  6,000 characters, rather than arbitrary per-skill files in its memories directory. The adapter
  now writes project rules under `.devin/rules` in either scope. Older builds can retain the
  legacy project path with a local override. [Cascade rules](https://docs.devin.ai/desktop/cascade/memories).
- **Cline:** rules now use `~/.cline/rules` globally and `.cline/rules` for the project. This
  adapter emits rules, even though Cline also has native skills. Existing `.clinerules` output
  is not automatically removed. [Cline configuration](https://docs.cline.bot/getting-started/config).
- **Continue:** the adapter emits Markdown rules with descriptions. Project rules live in
  `.continue/rules`. Confirm global loading with the installed Continue version rather than
  treating a successful file write as activation. [Continue rules](https://docs.continue.dev/customize/deep-dives/rules).
- **aider:** explicitly load `CONVENTIONS.md` with `aider --read CONVENTIONS.md`, or configure
  `read: CONVENTIONS.md` in `.aider.conf.yml`. [aider conventions](https://aider.chat/docs/usage/conventions.html).

Before moving an existing install, inspect its old destination and managed markers. Preview
installation to the new destination, install and check host discovery. Then remove only the
old managed entries after reviewing their ownership. The CLI does not scan or delete old paths
when defaults change. Existing local overrides take precedence and may keep the old location.
Avoid loading both old and new copies at once.

## Local overrides

For an older Windsurf build, for example:

```json
{
	"targets": {
		"windsurf": {
			"userPath": ".windsurf/rules",
			"projectPath": ".windsurf/rules"
		}
	}
}
```

Save machine-specific overrides in `.agent-skills.local.json`. Use the committed config for
intentional shared defaults. Inspect before writing:

```sh
pnpm skills install --profile core -t cursor --scope project --dry-run
pnpm skills doctor -t cursor --scope project --json
```

`doctor` measures filesystem ownership and drift. A healthy report can include missing skills;
it does not prove the application discovered or executed anything.
