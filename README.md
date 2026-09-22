# agent-skills

A private source-of-truth repository for **28 focused workflow skills** and a TypeScript CLI
that installs them into Claude Code, Codex and other assistants.

The suite covers design, implementation, review, delivery and maintenance. Longer work can use
an orchestrator with separate workers, independent acceptance gates and resumable evidence.
Small work stays direct.

## Start

Requirements: Node.js 22.12 or newer and the repository's pnpm version.

```sh
git clone https://github.com/emiliodominguez/agent-skills.git
cd agent-skills
pnpm install --frozen-lockfile
pnpm skills install --profile core -t claude codex
```

This repository is private; cloning requires your existing GitHub authentication. Native
Claude Code and Codex installations use live directory symlinks, or `--copy` for a snapshot.
`./install.sh` remains the bootstrap entry point and installs the full suite by default.
Run `./uninstall.sh -- --dry-run` to preview removal, then `./uninstall.sh` to remove the
managed Claude Code and Codex installations. Both scripts forward additional CLI arguments.
In a source checkout, the wrappers install dependencies and build the CLI first; `--dry-run`
suppresses changes to managed target files, not this local bootstrap preparation.

Prefer a profile to keep discovery focused:

| Profile         | Purpose                                                                   |
| --------------- | ------------------------------------------------------------------------- |
| `core`          | Plan, implement, test, review, commit, deliver and hand off               |
| `orchestration` | Plan, coordinate, verify, build repository context and specialize workers |
| `frontend`      | Prototype, style and animate                                              |
| `review`        | Review, adversarial review, simplify and refactor                         |
| `maintenance`   | Diagnose, triage, benchmark, upgrade, migrate and repair workflows        |

Explicit skill names override a profile. Install all skills by omitting names and profiles.

## Use the skills

Use `/ed-plan` in Claude Code and `$ed-plan` in Codex. Skill descriptions also support
automatic selection when the host provides it. These are instruction workflows; installing
one does not start a background process, register subagents or grant tool permissions.

| Need                                                  | Skill                                                              |
| ----------------------------------------------------- | ------------------------------------------------------------------ |
| Explore an idea or test a hypothesis                  | `ed-brainstorm`, `ed-prototype`                                    |
| Understand a repository or maintain cited context     | `ed-onboard`, `ed-repo-brief`                                      |
| Produce an executable plan                            | `ed-plan`                                                          |
| Implement a bounded change                            | `ed-work`, `ed-test`                                               |
| Coordinate dependent work with independent gates      | `ed-orchestrate`, `ed-verify`                                      |
| Match a worker and verifier to repository conventions | `ed-specialize`                                                    |
| Review or improve existing code                       | `ed-review`, `ed-adversarial-review`, `ed-refactor`, `ed-simplify` |
| Migrate, upgrade or measure                           | `ed-migrate`, `ed-deps`, `ed-benchmark`                            |
| Diagnose or triage                                    | `ed-diagnose`, `ed-triage`                                         |
| Deliver and address feedback                          | `ed-commit`, `ed-ship`, `ed-pr-fix`, `ed-git-fix`                  |
| Refine UI and documentation                           | `ed-styles`, `ed-animate`, `ed-docs`                               |
| Resume work or curate agent setup                     | `ed-handoff`, `ed-prune-claude-setup`                              |

Examples, using Claude spelling:

```text
/ed-work Fix the empty search state and verify it in the browser.
/ed-plan Plan the account export feature with explicit acceptance and non-goals.
/ed-orchestrate .plans/account-export.md
/ed-repo-brief Capture this subsystem's contracts and actual lint/test commands.
/ed-specialize Create portable worker and verifier briefs for this repository.
```

An orchestrated task moves from worker output to an independent `ACCEPT`, `REJECT` or `BLOCKED`
verdict. Only accepted, current evidence releases dependent tasks. Retry budgets and acceptance
records survive a handoff. Direct execution remains available when independent delegation is
unnecessary or unavailable, without claiming that self-checks are independent review.

Read [the workflow guide](docs/OVERVIEW.md), [orchestration example](docs/ORCHESTRATION.md),
[full catalog](docs/SKILLS.md) or [handoff table](docs/SKILL-MAP.md).

## CLI

```text
agent-skills                              Interactive picker in a terminal
agent-skills list [--targets] [--profiles] [--json]
agent-skills validate [--strict]
agent-skills install [skills...]           Install selected skills
agent-skills uninstall [skills...]         Remove selected managed installations
agent-skills sync                          Refresh already installed skills
agent-skills doctor [--json]               Inspect installation health
agent-skills new <name> [-d "description"]
agent-skills completion [bash|zsh|fish]
```

| Install/uninstall flag      | Behavior                                                    |
| --------------------------- | ----------------------------------------------------------- |
| `-t, --target <name...>`    | Select target adapters; defaults to Claude Code and Codex   |
| `-s, --scope user\|project` | Configured user or project destination (see target caveats) |
| `--profile <name...>`       | Union of configured skill groups                            |
| `--copy`                    | Copy native skill directories instead of linking            |
| `--force`                   | Back up unmanaged collisions before replacement/removal     |
| `--dry-run`                 | Preview without filesystem changes                          |
| `--watch`                   | Reinstall on source changes; install only                   |

Unknown or disabled explicitly selected targets exit unsuccessfully. `doctor --json` reports
these as unhealthy instead of silently treating them as successful empty checks. An empty skill
corpus fails validation. Names are limited to 64 characters and descriptions to 1024.

## Target formats

| Target         | Installed format                                    |
| -------------- | --------------------------------------------------- |
| Claude Code    | Native `~/.claude/skills/<name>/SKILL.md` directory |
| Codex          | Native `~/.agents/skills/<name>/SKILL.md` directory |
| Cursor         | Generated `.mdc` rules                              |
| Windsurf       | Generated Markdown rules                            |
| Cline          | Generated `.cline/rules/*.md` files                 |
| Continue       | Generated Markdown rules                            |
| GitHub Copilot | Managed block in `copilot-instructions.md`          |
| Zed            | Managed block in `.rules`                           |
| aider          | Managed block in `CONVENTIONS.md`                   |

Native directories preserve supporting files. Generated rule/bundle targets currently render
the skill body and description; they do not install native agents or copy supporting resources.
The current suite is self-contained so these exports remain usable. Host discovery, permissions
and delegation differ; see [current practices and compatibility](docs/PRACTICES.md).

## Configuration and ownership

`agent-skills.config.json` defines `skillsDir`, installation mode, profiles, enabled targets and
user/project paths. `.agent-skills.local.json` supplies machine-specific overrides. See
[configuration](docs/CONFIGURATION.md) and its [schema](agent-skills.schema.json).

The installer recognizes its native symlinks/copies and generated markers. It preserves
unmanaged collisions unless `--force` requests a backup and replacement. Native Windows installs
use copy mode. Codex migration only removes provably managed legacy content. `sync` preserves
existing native copy/symlink modes and does not install unrelated missing skills.

If discovery fails, inspect `pnpm skills doctor --json` and an install `--dry-run`. Check the
configured path against your host/version. After moving a source checkout, reinstall to repair
its managed links or choose copy mode. Detailed behavior lives in [architecture](docs/ARCHITECTURE.md).

## Develop and validate

```sh
pnpm run format
pnpm run lint
pnpm run typecheck
pnpm run validate
pnpm run test:coverage
pnpm run build
pnpm docs:gen
pnpm docs:check
pnpm smoke
```

TypeScript entry points use `node --import tsx`, avoiding the extra IPC server used by the tsx
CLI. Formatting, padding and JSDoc conventions remain strict. Generated docs are derived from
`skills/*/SKILL.md`; `docs:check` detects drift without changing files or the Git index.

Three evaluation layers have different claims: instruction-marker tests check text presence;
`eval:llm` audits instructions using an explicitly configured model; realistic isolated agent
runs evaluate actual decisions and artifacts. See [evals](evals/README.md) for cases and limits.

All original skill names remain available. Plans can continue in the current session; a fresh
session is optional. Artifact paths follow user/repository tracking policy rather than changing
ignore rules automatically. [Migration notes](docs/PRACTICES.md) explain the changed defaults.

Add a changeset for user-facing changes and follow [contributing](CONTRIBUTING.md). Existing CI
and release definitions remain available; check whether Actions is enabled for a particular run.
Publishing a package, merging or deploying requires the corresponding user request.

## License

MIT - see [LICENSE](LICENSE).
