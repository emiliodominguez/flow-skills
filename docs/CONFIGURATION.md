# Configuration

The installer reads `agent-skills.config.json` at the repo root. Everything has a built-in
default, so the file is optional — it exists to change target paths and defaults.

Precedence (later wins, deep-merged):

1. built-in defaults (`src/core/config.ts`)
2. `agent-skills.config.json` (committed)
3. `.agent-skills.local.json` (git-ignored — machine-specific overrides)

## Fields

```jsonc
{
	"$schema": "./agent-skills.schema.json",

	// Directory (relative to repo root) that holds the skill folders.
	"skillsDir": "skills",

	// Default strategy for the native (claude) target: symlink (live) or copy (frozen).
	"installMode": "symlink",

	// Targets used when --target is not passed.
	"defaultTargets": ["claude"],

	// Per-target enablement and install paths. `userPath` is used with --scope user
	// (global); `projectPath` with --scope project (relative to the current directory).
	"targets": {
		"claude": { "enabled": true, "userPath": "~/.claude/skills", "projectPath": ".claude/skills" },
		"cursor": { "enabled": true, "userPath": "~/.cursor/rules", "projectPath": ".cursor/rules" },
		"codex": { "enabled": true, "userPath": "~/.codex/AGENTS.md", "projectPath": "AGENTS.md" },
		"windsurf": { "enabled": true, "userPath": "~/.codeium/windsurf/memories", "projectPath": ".windsurf/rules" },
	},
}
```

The JSON Schema at `agent-skills.schema.json` gives editor autocomplete and validation via
the `$schema` key.

## Scopes

- `--scope user` (default) installs into the global path (`userPath`), so the skills are
  available in every project.
- `--scope project` installs into the current repo (`projectPath`), so the skills travel
  with that project and can be committed.

## A note on target paths

The `claude` paths are exact. The `cursor`, `codex`, and `windsurf` paths follow each tool's
**documented convention at the time of writing**, but these tools move — a new version may
change where it reads rules from. If a target installs to the wrong place:

1. Check the tool's current docs for its rules/instructions directory.
2. Override the path in `agent-skills.config.json` (or `.agent-skills.local.json` for a
   machine-specific tweak).

Verify without touching anything first:

```sh
pnpm skills install -t cursor --dry-run
```

## Local overrides

Keep machine-specific paths out of the committed config by putting them in
`.agent-skills.local.json` (git-ignored), same shape, deep-merged on top:

```json
{
	"targets": {
		"cursor": { "userPath": "/custom/path/.cursor/rules" }
	}
}
```
