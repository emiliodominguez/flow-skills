---
name: ed-prune-claude-setup
description: Audit and curate the Claude Code setup — memory entries, CLAUDE.md rules, settings.json, enabled plugins/skills. Surface stale, duplicate, dead, or now-redundant entries and confirm each removal with the user. Use when the user says "prune my claude setup", "audit my config", "prune memory", "trim CLAUDE.md", "clean up my claude setup", "is this still needed", or when invoked as /ed-prune-claude-setup. NOT for code cleanup (that's /ed-simplify or /ed-refactor). Out of scope: mechanical junk like caches, history, backups — those belong in a shell alias.
---

# Prune Claude Setup

Rules rot. Memory entries go stale, CLAUDE.md accumulates dead bullets, `settings.json` gathers permissions for tools you stopped using, the skill folder fills with things you never invoke. This skill is the periodic curation pass that keeps the setup honest.

It does **NOT** touch caches, sessions, history, downloads, backups, or transient files — those are mechanical and belong in a shell alias (see the very end).

---

## Process

Four audits. For each, surface findings as a punch list — the user confirms every removal. Run the audits in parallel where the reads are independent.

### Audit 1 — Memory

Locate the memory directory for the current session: `~/.claude/projects/<project-hash>/memory/`. The exact path is in the system prompt's `auto memory` section — use that path, do not guess.

Read `MEMORY.md` and every file it references. Flag entries that are:

- **Duplicated by CLAUDE.md** — same rule encoded in both places where the memory adds no extra reasoning, context, or `Why:` the CLAUDE.md bullet lacks
- **Stale references** — a file path, function, flag, repo, or service that no longer exists. **Verify before flagging:** check the file exists, grep for the symbol, etc. Do not surface false positives
- **Outdated time-bound facts** — project memories with a date, sprint, deadline, or named release that has already passed
- **Contradicted by current state** — rule says "do X" but the code/config has been changed to do the opposite since the memory was written
- **Index drift** — files present in `memory/` but missing from `MEMORY.md`, or `MEMORY.md` lines pointing to files that don't exist

For each finding, record: memory name, one-line description, and the precise reason it's flagged.

### Audit 2 — CLAUDE.md

Path: `~/.claude/CLAUDE.md` and any project-level `CLAUDE.md` in the current working directory. Read each.

Flag bullets / sections that are:

- **Tool reference duplicating MCP auto-loads** — if an MCP server already publishes instructions every session (visible in system reminders), the CLAUDE.md mirror is dead weight
- **Enforced by a hook** — if `settings.json` has a hook that already enforces this rule deterministically, the CLAUDE.md bullet is belt-and-suspenders at best
- **Reference to a tool/path/service no longer present** in the setup
- **Internal contradiction** — two bullets that disagree, or a bullet that contradicts a memory
- **Boilerplate** that doesn't actually shape behavior (e.g., generic intro lines)

### Audit 3 — settings.json

Paths: `~/.claude/settings.json` and `~/.claude/settings.local.json` if present.

Flag:

- **Permission entries** for tools, commands, or MCP servers the user can't recall using recently (ask)
- **Hooks** that reference scripts, binaries, or paths that no longer exist (verify with `ls`/`which`)
- **Env vars** for features the user has stopped using
- **`enabledPlugins`** entries the user can't recall using

### Audit 4 — Skills & Plugins

Paths:

- `~/.claude/skills/` — `ls` the directory
- `enabledPlugins` in `settings.json`
- Marketplace skills loaded via the session's available-skills list

Ask the user which skills they've actually invoked recently. Don't lecture — just present the list and ask "any of these you can't remember using?" Anything they can't recall is a candidate.

---

## Report format

After all four audits, present **one consolidated punch list**, grouped by audit, with two confidence tiers:

```
MEMORY (3 flagged)
  ✗ feedback-foo — duplicates CLAUDE.md rule "Code Style > X", memory adds no extra why
  ✗ project-q3-launch — references "Q3 launch" which shipped 2025-10-14
  ⚠ reference-grafana-board — URL grafana.internal/d/api-latency, can't verify from here

CLAUDE.md (2 flagged)
  ✗ "## Tools > Grepika" — 30 lines duplicating MCP auto-loaded instructions
  ⚠ "No vercel env pull" — could be a PreToolUse hook instead

SETTINGS.JSON (1 flagged)
  ⚠ Permission `Bash(terraform:*)` — confirm: still using terraform?

SKILLS (0 flagged)
```

- `✗` = confident removal candidate
- `⚠` = needs user input before deciding

Then ask the user to confirm item-by-item, or accept the shortcut **"remove all ✗, keep all ⚠"**.

---

## Apply changes

Only after explicit confirmation, in this order:

1. Delete or edit memory files; update `MEMORY.md` to match
2. Edit `CLAUDE.md`
3. Edit `settings.json` (back up first with the full path: `cp ~/.claude/settings.json ~/.claude/settings.json.bak-$(date +%Y%m%d)`), then confirm it still parses as JSON after editing — a malformed `settings.json` can wedge the CLI
4. Skills: never auto-delete a skill directory — print the `rm -rf` command and let the user run it

After applying, re-read `MEMORY.md` and confirm the index matches the actual files on disk.

---

## Rules

- **Never auto-delete.** Every removal needs explicit user confirmation. No exceptions.
- **Verify before flagging.** False positives erode trust faster than missed findings. If a memory names a file, check the file exists. If it names a function, grep for it.
- **Show the why.** Each flagged item gets a one-line reason. "Duplicate of CLAUDE.md > X" beats "redundant".
- **Two tiers, don't blur them.** `✗` is confident; `⚠` needs input. Don't promote `⚠` to `✗` to make the punch list look tidier.
- **No mechanical scope creep.** No touching `cache/`, `image-cache/`, `paste-cache/`, `file-history/`, `sessions/`, `shell-snapshots/`, `backups/`, `downloads/`, `telemetry/`, `debug/`, `history.jsonl`. If the user has no shell alias for these, offer one at the end as a separate suggestion (don't bundle it into this pass).
- **Don't add features to this skill mid-run.** If you notice another category worth auditing, write it down and propose adding it next time — don't expand scope live.

---

## Suggested shell alias (offer at the end, only if asked)

For the mechanical bits this skill deliberately doesn't touch:

```sh
alias claude-cleanup-cache='find ~/.claude/{image-cache,paste-cache,file-history,shell-snapshots,backups} -type f -mtime +30 -delete 2>/dev/null'
```

Tunes the `+30` (days) to taste. Offer this only if the user asks for the mechanical companion — don't push it.

---

## Done when

- All four audits run, false positives filtered out
- Consolidated punch list shown with `✗`/`⚠` tiers
- Every `✗` confirmed or explicitly kept
- Memory files, `MEMORY.md`, `CLAUDE.md`, `settings.json` reflect the confirmed decisions
- Backup of `settings.json` exists if it was modified
- User knows roughly when to run this again (monthly is a reasonable default)
