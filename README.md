# agent-skills

Author agent skills **once**, install them **anywhere**.

A source-of-truth repo for a suite of workflow skills (the `ed-*` family) plus a small,
tested CLI that installs them into **Claude Code**, **Cursor**, **Codex / AGENTS.md**, and
**Windsurf** — with validation, scaffolding, and a symlink-or-copy installer.

```sh
./install.sh                 # all skills → Claude Code (symlinked, edit-live)
pnpm skills install -t cursor codex
pnpm skills new my-skill
pnpm skills validate
```

---

## Why

Every assistant has its own place and format for "always-available instructions": Claude
Code has `~/.claude/skills/<name>/SKILL.md`, Cursor has `.cursor/rules/*.mdc`, Codex reads
`AGENTS.md`, Windsurf has `.windsurf/rules`. Writing the same guidance four times rots fast.

Here each skill is written once as a `SKILL.md`. Target **adapters** transform it into each
tool's native format on install. One source, many destinations.

---

## The skill suite

A connected workflow that moves work from idea to shipped. See the full map in
[`docs/OVERVIEW.md`](docs/OVERVIEW.md).

| Phase       | Skills                                                                              |
| ----------- | ----------------------------------------------------------------------------------- |
| **Think**   | `ed-brainstorm` · `ed-prototype`                                                    |
| **Plan**    | `ed-plan` — parallel research, writes `.plans/<file>`                               |
| **Build**   | `ed-work` — executes a plan in a fresh context, slice by slice                      |
| **Check**   | `ed-review` (persona panel + verification) · `ed-adversarial-review` (red-team)     |
| **Polish**  | `ed-simplify` · `ed-refactor`                                                       |
| **Ship**    | `ed-ship` · `ed-pr-fix` · `ed-git-fix`                                              |
| **Support** | `ed-diagnose` · `ed-handoff` · `ed-styles` · `ed-animate` · `ed-prune-claude-setup` |

`ed-plan` writes a plan file, then you execute it in a **fresh session** with `/ed-work` —
planning and building don't share a crowded context window.

---

## Install

**Requirements:** Node ≥ 20. pnpm is auto-enabled via corepack if missing.

### Option A — bootstrap script (no setup)

```sh
git clone https://github.com/emiliodominguez/agent-skills.git
cd agent-skills
./install.sh                       # → Claude Code, symlinked
./install.sh -- -t cursor codex    # → Cursor + Codex
./install.sh -- --copy             # → copy a frozen snapshot instead of symlinking
```

### Option B — pnpm

```sh
pnpm install
pnpm skills install                # default target(s) from config
pnpm skills install -t windsurf -s project   # into ./.windsurf/rules of the current project
```

### Option C — one-off via npx (from git)

```sh
npx github:emiliodominguez/agent-skills install -t claude
```

---

## Usage

```
agent-skills list [--targets]         List skills (and, with --targets, the adapters)
agent-skills validate [--strict]      Validate frontmatter, naming, cross-references
agent-skills install [skills...]      Install skills into target(s)
agent-skills uninstall [skills...]    Remove installed skills
agent-skills new <name> [-d "desc"]   Scaffold a new skill from the template
```

**Common flags** (`install` / `uninstall`):

| Flag                     | Meaning                                                       |
| ------------------------ | ------------------------------------------------------------- |
| `-t, --target <name...>` | `claude`, `cursor`, `codex`, `windsurf` (default: config)     |
| `-s, --scope <scope>`    | `user` (global, default) or `project` (into the current repo) |
| `--copy`                 | copy files instead of symlinking (native `claude` target)     |
| `--dry-run`              | print the plan without touching anything                      |

Pass specific skills to scope an operation: `agent-skills install ed-plan ed-work`.

---

## Targets

| Target       | Emits                        | Install shape                                                      |
| ------------ | ---------------------------- | ------------------------------------------------------------------ |
| **claude**   | `SKILL.md` (unchanged)       | one directory per skill; **symlink** (live) or copy                |
| **cursor**   | `.mdc` rule with frontmatter | one file per skill in `.cursor/rules/`                             |
| **codex**    | `AGENTS.md` sections         | all skills in one **managed block** (preserves your other content) |
| **windsurf** | `.md` rule                   | one file per skill in `.windsurf/rules/`                           |

Generated files carry a marker so `uninstall` **only removes files this tool created** — it
never deletes your hand-written rules or clobbers surrounding `AGENTS.md` content.

Only the `claude` target supports symlinking (the format is identical to the source). The
others are transformed, so they're always generated fresh — re-run `install` to sync.

---

## Configure

`agent-skills.config.json` (JSON-schema-backed) sets defaults and per-target paths:

```jsonc
{
	"installMode": "symlink", // or "copy"
	"defaultTargets": ["claude"],
	"targets": {
		"claude": { "enabled": true, "userPath": "~/.claude/skills", "projectPath": ".claude/skills" },
		"cursor": { "enabled": true, "userPath": "~/.cursor/rules", "projectPath": ".cursor/rules" },
		// codex, windsurf ...
	},
}
```

Paths for Cursor/Codex/Windsurf follow each tool's documented convention; adjust them here
if your version differs. Keep machine-specific overrides in a git-ignored
`.agent-skills.local.json` (same shape, deep-merged on top).

---

## Author a new skill

```sh
pnpm skills new my-skill -d "One line: what it does — when to use — handoff."
# edit skills/my-skill/SKILL.md
pnpm skills validate
pnpm skills install -t claude
```

Skills follow a shared anatomy (frontmatter → phased body → `Anti-patterns` → `Done when`).
See [`docs/AUTHORING.md`](docs/AUTHORING.md) and [`CONTRIBUTING.md`](CONTRIBUTING.md).

---

## Develop

```sh
pnpm skills <cmd>     # run the CLI from source (tsx)
pnpm test             # vitest — validates the corpus + exercises every adapter
pnpm run typecheck    # tsc --noEmit
pnpm run build        # bundle to dist/ (tsup)
pnpm run format       # prettier (tabs, width 150)
```

CI runs typecheck + validate + test + format-check on every push and PR.

---

## License

MIT — see [LICENSE](LICENSE).
