# agent-skills

Author agent skills **once**, install them **anywhere**.

A source-of-truth repo for a suite of workflow skills (the `ed-*` family) plus a small,
tested CLI that installs them into **Claude Code**, **Cursor**, **Codex / AGENTS.md**,
**Windsurf**, **GitHub Copilot**, **Zed**, **aider**, **Cline**, and **Continue** — with
validation, scaffolding, and a symlink-or-copy installer.

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
`AGENTS.md`, Windsurf has `.windsurf/rules`, and Copilot, Zed, aider, Cline and Continue each
have their own. Writing the same guidance over and over rots fast.

Here each skill is written once as a `SKILL.md`. Target **adapters** transform it into each
tool's native format on install. One source, many destinations.

---

## The skill suite

A connected workflow that moves work from idea to shipped. See the full map in
[`docs/OVERVIEW.md`](docs/OVERVIEW.md).

| Phase          | Skills                                                                                                             |
| -------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Think**      | `ed-brainstorm` · `ed-prototype`                                                                                   |
| **Understand** | `ed-onboard` — map an unfamiliar codebase fast                                                                     |
| **Plan**       | `ed-plan` — parallel research, writes `.plans/<file>`                                                              |
| **Build**      | `ed-work` · `ed-test` (test strategy) · `ed-migrate` (cross-file sweeps)                                           |
| **Check**      | `ed-review` (persona panel + verification) · `ed-adversarial-review` (red-team)                                    |
| **Polish**     | `ed-simplify` · `ed-refactor`                                                                                      |
| **Ship**       | `ed-ship` · `ed-docs` · `ed-pr-fix` · `ed-git-fix`                                                                 |
| **Support**    | `ed-diagnose` · `ed-triage` · `ed-benchmark` · `ed-handoff` · `ed-styles` · `ed-animate` · `ed-prune-claude-setup` |

`ed-plan` writes a plan file, then you execute it in a **fresh session** with `/ed-work` —
planning and building don't share a crowded context window.

---

## Install

**Requirements:** Node ≥ 22. pnpm is auto-enabled via corepack if missing.

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
agent-skills list [--targets] [--profiles]   List skills (and, optionally, adapters / profiles)
agent-skills validate [--strict]      Validate frontmatter, naming, cross-references
agent-skills install [skills...]      Install skills into target(s)
agent-skills uninstall [skills...]    Remove installed skills
agent-skills sync                     Re-install whatever is already installed (propagate edits)
agent-skills doctor                   Report install state per target; flag drift/conflicts
agent-skills new <name> [-d "desc"]   Scaffold a new skill from the template
```

**Common flags** (`install` / `uninstall`):

| Flag                     | Meaning                                                                                                   |
| ------------------------ | --------------------------------------------------------------------------------------------------------- |
| `-t, --target <name...>` | `claude`, `cursor`, `codex`, `windsurf`, `copilot`, `zed`, `aider`, `cline`, `continue` (default: config) |
| `-s, --scope <scope>`    | `user` (global, default) or `project` (into the current repo)                                             |
| `--profile <name...>`    | install/remove a named set of skills from config `profiles`                                               |
| `--copy`                 | copy files instead of symlinking (native `claude` target)                                                 |
| `--force`                | overwrite/remove entries not created by agent-skills                                                      |
| `--dry-run`              | print the plan without touching anything                                                                  |
| `--watch`                | (`install`) keep running and re-generate targets on source change                                         |

Run **`agent-skills doctor`** any time to see what's installed where and whether anything
has drifted from the source or conflicts with a hand-written file. Run **`agent-skills sync`**
to re-generate whatever is currently installed across all targets, so a source edit
propagates everywhere with one command.

Pass specific skills to scope an operation: `agent-skills install ed-plan ed-work`. Or install
a curated subset with a profile: `agent-skills install --profile frontend`.

---

## Targets

| Target       | Emits                             | Install shape                                                      |
| ------------ | --------------------------------- | ------------------------------------------------------------------ |
| **claude**   | `SKILL.md` (unchanged)            | one directory per skill; **symlink** (live) or copy                |
| **cursor**   | `.mdc` rule with frontmatter      | one file per skill in `.cursor/rules/`                             |
| **codex**    | `AGENTS.md` sections              | all skills in one **managed block** (preserves your other content) |
| **windsurf** | `.md` rule                        | one file per skill in `.windsurf/rules/`                           |
| **copilot**  | `.github/copilot-instructions.md` | all skills in one **managed block**                                |
| **zed**      | `.rules`                          | all skills in one **managed block**                                |
| **aider**    | `CONVENTIONS.md`                  | all skills in one **managed block**                                |
| **cline**    | `.md` rule                        | one file per skill in `.clinerules/`                               |
| **continue** | `.md` rule                        | one file per skill in `.continue/rules/`                           |

Only the `claude` target supports symlinking (the format is identical to the source). The
others are transformed, so they're always generated fresh — re-run `install` (or `sync`) to
update. The bundle targets (codex, copilot, zed, aider) merge every skill into one delimited
managed block, preserving any surrounding content you wrote in the same file.

### Safety — what it will and won't touch

The installer writes into your real config directories, so it never destroys anything it did
not create:

- **claude** only overwrites/removes a directory that is _its own_ symlink or a copy it
  marked. A hand-authored `~/.claude/skills/<name>/` that collides with a skill name is
  **left alone** unless you pass `--force`.
- **cursor/windsurf** files carry a marker; both `install` and `uninstall` touch only
  marked files.
- **codex** edits stay inside a delimited block in `AGENTS.md`; your surrounding content is
  preserved.
- `--force` never deletes outright — it **backs the entry up** to a `.bak-<n>` sibling first.
- On Windows (no symlink privilege), the native target automatically falls back to `--copy`.
- `--dry-run` previews every action; `doctor` reports drift without changing anything.

Full detail: [docs/ARCHITECTURE.md → Safety model](docs/ARCHITECTURE.md#safety-model--what-the-tool-will-and-wont-touch).

---

## Configure

`agent-skills.config.json` (JSON-schema-backed) sets defaults and per-target paths:

```jsonc
{
	"installMode": "symlink", // or "copy"
	"defaultTargets": ["claude"],
	"profiles": {
		// named install sets: `install --profile frontend`
		"frontend": ["ed-styles", "ed-animate", "ed-prototype"],
	},
	"targets": {
		"claude": { "enabled": true, "userPath": "~/.claude/skills", "projectPath": ".claude/skills" },
		"cursor": { "enabled": true, "userPath": "~/.cursor/rules", "projectPath": ".cursor/rules" },
		// codex, windsurf, copilot, zed, aider, cline, continue ...
	},
}
```

Paths for the non-native targets follow each tool's documented convention; adjust them here
if your version differs (the newer tools' rules directories move — re-check yours). A
`profiles` map lets you curate subsets for `install --profile <name>`. Keep machine-specific
overrides in a git-ignored `.agent-skills.local.json` (same shape, deep-merged on top). Full
reference: [docs/CONFIGURATION.md](docs/CONFIGURATION.md).

---

## Documentation

| Doc                                                               | What's in it                                               |
| ----------------------------------------------------------------- | ---------------------------------------------------------- |
| [docs/SKILLS.md](docs/SKILLS.md)                                  | Catalog of every skill and what it's for (auto-generated)  |
| [docs/SKILL-MAP.md](docs/SKILL-MAP.md)                            | Rendered graph of how the skills hand off (auto-generated) |
| [docs/OVERVIEW.md](docs/OVERVIEW.md)                              | The skill workflow and the practices behind it             |
| [docs/CONFIGURATION.md](docs/CONFIGURATION.md)                    | Config reference — targets, scopes, paths                  |
| [docs/AUTHORING.md](docs/AUTHORING.md)                            | How to write a good skill                                  |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)                      | How the CLI works + the safety model                       |
| [CONTRIBUTING.md](CONTRIBUTING.md) · [CHANGELOG.md](CHANGELOG.md) | Contributing & release history                             |

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
pnpm skills <cmd>       # run the CLI from source (tsx)
pnpm test               # vitest — corpus validation, adapters, core units, CLI
pnpm run test:coverage  # vitest with v8 coverage (70% threshold)
pnpm run typecheck      # tsc over src + test + scripts
pnpm run lint           # eslint (typescript-eslint)
pnpm run format         # prettier (tabs, width 150)
pnpm docs:gen           # regenerate docs/SKILLS.md from the skills
pnpm smoke              # pack + install the tarball in a clean project, run the bin
pnpm run build          # bundle to dist/ (tsup)
```

A husky pre-commit hook runs prettier + eslint on staged files. CI runs three jobs on every
push and PR: **lint** (eslint, format, docs-freshness, prod-dependency audit), **test**
(typecheck, validate, coverage on a Node 22/24 matrix), and **pack** (the packaging smoke
test). Pushing a `v*` tag runs the release workflow.

---

## Troubleshooting

**A skill isn't showing up in the tool.** Confirm it installed to the right place:
`pnpm skills install -t <target> --dry-run`. For non-`claude` targets, check the path
matches your tool's current rules directory and override it in `agent-skills.config.json`
if not (see [docs/CONFIGURATION.md](docs/CONFIGURATION.md)).

**`install` says "exists, not managed".** There's already a directory/file at the
destination that this tool didn't create. Inspect it; if it's safe to replace, re-run with
`--force`.

**`AGENTS.md` errors with "malformed or duplicate markers".** The file has more than one
`agent-skills` marker pair (e.g. from a bad merge). Remove the stray pair by hand and re-run.

**`pnpm install` warns about ignored build scripts (esbuild).** Allow it once — this repo
already lists esbuild in `pnpm-workspace.yaml`; run `pnpm install` again after cloning.

**Broken symlinks after moving the repo.** Symlinked (`claude`) installs point at the repo's
path. If you move the repo, re-run `pnpm skills install` to repoint them, or use `--copy`.

---

## License

MIT — see [LICENSE](LICENSE).
