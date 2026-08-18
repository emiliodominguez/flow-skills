---
name: ed-prune-claude-setup
description: "Audit and curate a Claude Code or Codex setup - memory entries, CLAUDE.md/AGENTS.md rules, settings/config, and enabled plugins/skills. Surface stale, duplicate, dead, or redundant entries and confirm each removal with the user. Use when the user says \"prune my agent setup\", \"prune my Claude setup\", \"prune my Codex setup\", \"audit my config\", \"prune memory\", \"clean up my setup\", or \"is this still needed\". NOT for code cleanup (that's /ed-simplify or /ed-refactor). Out of scope: caches, history, and backups. Invoke as /ed-prune-claude-setup in Claude Code or $ed-prune-claude-setup in Codex."
---

> Host syntax: invoke skills as `/skill-name` in Claude Code or `$skill-name` in Codex. Slash-form handoffs below use the Claude spelling; substitute `$` in Codex.

# Prune Agent Setup

Rules rot. Memory entries go stale, instruction files accumulate dead bullets, settings gather permissions for tools you stopped using, and skill folders fill with things you never invoke. This skill is the periodic curation pass that keeps a Claude Code or Codex setup honest.

It does **NOT** touch caches, sessions, history, downloads, backups, or transient files - those are mechanical and belong in a shell alias (see the very end).

---

## Process

Four audits. For each, surface findings as a punch list - the user confirms every removal. Run the audits in parallel where the reads are independent.

### Audit 1 - Memory

Use the current host's explicitly exposed persistent-memory location. In Claude Code this is commonly `~/.claude/projects/<project-hash>/memory/`; use the exact path provided by the session rather than guessing. If the host exposes no persistent-memory files, mark this audit **not applicable** and continue.

Read `MEMORY.md` and every file it references. Flag entries that are:

- **Duplicated by host instructions** - same rule encoded in memory and CLAUDE.md/AGENTS.md where memory adds no extra reasoning, context, or `Why:` the instruction bullet lacks
- **Stale references** - a file path, function, flag, repo, or service that no longer exists. **Verify before flagging:** check the file exists, grep for the symbol, etc. Do not surface false positives
- **Outdated time-bound facts** - project memories with a date, sprint, deadline, or named release that has already passed
- **Contradicted by current state** - rule says "do X" but the code/config has been changed to do the opposite since the memory was written
- **Index drift** - files present in `memory/` but missing from `MEMORY.md`, or `MEMORY.md` lines pointing to files that don't exist

For each finding, record: memory name, one-line description, and the precise reason it's flagged.

### Audit 2 - Host instructions

Read every applicable instruction file for the active host:

- Claude Code: `~/.claude/CLAUDE.md`; applicable project `CLAUDE.md`, `.claude/CLAUDE.md`, and `CLAUDE.local.md` files; and every active `.claude/rules/**/*.md` file
- Codex: `$CODEX_HOME/AGENTS.override.md` or `$CODEX_HOME/AGENTS.md`; then the applicable `AGENTS.override.md` or `AGENTS.md` at each level from the repository root to the working directory, including any configured fallback filenames

Prefer the host's reported active instruction sources when available. Account for precedence: an override can make a lower-priority file inactive without making it safe to delete.

Flag bullets / sections that are:

- **Tool reference duplicating MCP auto-loads** - if an MCP server already publishes instructions every session, the instruction-file mirror is dead weight
- **Enforced by configuration or a hook** - if host configuration already enforces this rule deterministically, the prose bullet is belt-and-suspenders at best
- **Reference to a tool/path/service no longer present** in the setup
- **Internal contradiction** - two bullets that disagree, or a bullet that contradicts a memory
- **Boilerplate** that doesn't actually shape behavior (e.g., generic intro lines)

### Audit 3 - Host settings

Read the active host's settings:

- Claude Code: `~/.claude/settings.json`, plus applicable project `.claude/settings.json` and local `.claude/settings.local.json`
- Codex: `$CODEX_HOME/config.toml` (normally `~/.codex/config.toml`) plus applicable trusted-project `.codex/config.toml` files

Flag:

- **Permission entries** for tools, commands, or MCP servers the user can't recall using recently (ask)
- **Hooks** that reference scripts, binaries, or paths that no longer exist (verify with `ls`/`which`)
- **Env vars** for features the user has stopped using
- **Enabled plugin or MCP entries** the user can't recall using (including Claude's `enabledPlugins`)

### Audit 4 - Skills & Plugins

Paths:

- Claude Code: `~/.claude/skills/` plus applicable project `.claude/skills/` directories
- Codex: `~/.agents/skills/`, every applicable project `.agents/skills/` directory from the working directory to the repository root, plus user-managed legacy entries in `~/.codex/skills/`; exclude `.system` and other host-managed/plugin cache entries from removal candidates
- Enabled plugins in the active host's settings/config
- Marketplace skills loaded via the session's available-skills list

Ask the user which skills they've actually invoked recently. Don't lecture - just present the list and ask "any of these you can't remember using?" Anything they can't recall is a candidate.

---

## Report format

After all four audits, present **one consolidated punch list**, grouped by audit, with two confidence tiers:

```
MEMORY (3 flagged)
  ✗ feedback-foo - duplicates CLAUDE.md rule "Code Style > X", memory adds no extra why
  ✗ project-q3-launch - references "Q3 launch" which shipped 2025-10-14
  ⚠ reference-grafana-board - URL grafana.internal/d/api-latency, can't verify from here

HOST INSTRUCTIONS (2 flagged)
  ✗ "## Tools > Grepika" - 30 lines duplicating MCP auto-loaded instructions
  ⚠ "No vercel env pull" - could be a PreToolUse hook instead

HOST SETTINGS (1 flagged)
  ⚠ Permission `Bash(terraform:*)` - confirm: still using terraform?

SKILLS (0 flagged)
```

- `✗` = confident removal candidate
- `⚠` = needs user input before deciding

Then ask the user to confirm item-by-item, or accept the shortcut **"remove all ✗, keep all ⚠"**.

---

## Apply changes

Only after explicit confirmation, in this order:

1. Delete or edit memory files; update `MEMORY.md` to match
2. Edit the applicable `CLAUDE.md` or `AGENTS.md`
3. Edit host settings only after backing up the exact file, then validate its JSON or TOML syntax - malformed settings can wedge the CLI
4. Skills: never auto-delete a skill directory - print the `rm -rf` command and let the user run it

After applying, re-read any persistent-memory index and confirm it matches the actual files on disk.

---

## Rules

- **Never auto-delete.** Every removal needs explicit user confirmation. No exceptions.
- **Verify before flagging.** False positives erode trust faster than missed findings. If a memory names a file, check the file exists. If it names a function, grep for it.
- **Show the why.** Each flagged item gets a one-line reason. "Duplicate of CLAUDE.md/AGENTS.md > X" beats "redundant".
- **Two tiers, don't blur them.** `✗` is confident; `⚠` needs input. Don't promote `⚠` to `✗` to make the punch list look tidier.
- **No mechanical scope creep.** No touching `cache/`, `image-cache/`, `paste-cache/`, `file-history/`, `sessions/`, `shell-snapshots/`, `backups/`, `downloads/`, `telemetry/`, `debug/`, `history.jsonl`. If the user has no shell alias for these, offer one at the end as a separate suggestion (don't bundle it into this pass).
- **Don't add features to this skill mid-run.** If you notice another category worth auditing, write it down and propose adding it next time - don't expand scope live.

---

## Claude-only cache alias (offer at the end, only if asked)

When the active host is Claude Code, the user may ask for a mechanical cache companion:

```sh
alias claude-cleanup-cache='find ~/.claude/{image-cache,paste-cache,file-history,shell-snapshots,backups} -type f -mtime +30 -delete 2>/dev/null'
```

Tune the `+30` (days) to taste. Offer this only if the user asks for the mechanical companion while auditing Claude Code. Do not offer it for Codex; this skill does not prescribe deletion of Codex host-managed caches.

---

## Done when

- All four audits run, false positives filtered out
- Consolidated punch list shown with `✗`/`⚠` tiers
- Every `✗` confirmed or explicitly kept
- Memory files, instruction files, and host settings reflect the confirmed decisions
- A backup of the host settings file exists if it was modified
- User knows roughly when to run this again (monthly is a reasonable default)
