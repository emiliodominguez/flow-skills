# Architecture

How the tool is put together, for anyone changing it.

## The idea in one line

Skills are authored once as `SKILL.md`; **target adapters** transform each skill into one
tool's on-disk convention at install time. One source, many destinations.

## Module map

```
src/
  index.ts              CLI wiring (commander) — parses args, dispatches to commands
  commands/
    install.ts          install / uninstall — resolves config + targets, runs adapters
    doctor.ts           doctor — report install state + drift/conflicts per target
    validate.ts         validate — one scan, shared with the test suite
    list.ts             list — skills and target adapters
    new.ts              new — scaffold a skill from templates/SKILL.md.tmpl
  core/
    skill.ts            parse SKILL.md frontmatter (tolerant), validate, KEBAB
    registry.ts         discover / select skills on disk
    config.ts           load + merge config; findRepoRoot / packageRoot
    paths.ts            ~ expansion, target-path resolution, prettyPath
    install-fs.ts       filesystem primitives: symlink, copyDir, writeFile,
                        managed-block read/write/remove (line-anchored, guarded)
    logger.ts           colorized output + action printing
  targets/
    types.ts            the Target interface + InstallContext
    index.ts            target registry (name → adapter)
    render.ts           frontmatter renderer + escaping + file-per-skill helpers
    claude.ts           native: one dir per skill (symlink or marked copy)
    cursor.ts           file-per-skill: .cursor/rules/<name>.mdc
    windsurf.ts         file-per-skill: .windsurf/rules/<name>.md
    codex.ts            bundle: AGENTS.md sections in one managed block
scripts/gen-skill-docs.ts   regenerates docs/SKILLS.md
test/                        vitest: corpus validation, adapters, core units
```

## The Target interface

Every destination implements one small contract (`src/targets/types.ts`):

```ts
interface Target {
	name: string; // "claude" | "cursor" | "codex" | "windsurf"
	describe: string; // shown by `list --targets`
	supportsSymlink: boolean; // true only for the native (claude) format
	install(ctx: InstallContext): Action[];
	uninstall(ctx: InstallContext): Action[];
	status(ctx: InstallContext): SkillStatus[]; // for `doctor`: linked/generated/drifted/conflict/missing
}
```

`InstallContext` carries the selected `skills`, the resolved `dest`, the `mode`
(`symlink | copy`), a `force` flag, and `dryRun`. Adapters return a list of `Action`s
(`symlink | copy | write | remove | skip`) that the command layer prints — they never log
directly, which keeps them testable.

Three adapter shapes:

- **dir-per-skill** (`claude`) — each skill is a directory; symlinked to the repo (live) or
  copied (frozen).
- **file-per-skill** (`cursor`, `windsurf`) — each skill is one generated file; they share
  `installFilePerSkill` / `uninstallFilePerSkill` in `render.ts`.
- **bundle** (`codex`) — all skills live in one file (`AGENTS.md`) as delimited sections
  inside a managed block.

Adding a target = implement the interface, register it in `targets/index.ts`, add a default
path to `agent-skills.config.json`, add a test. See [CONTRIBUTING.md](../CONTRIBUTING.md).

## Install flow

```
install [skills...] --target … --scope … [--copy] [--force] [--dry-run]
  → findRepoRoot()                     locate the repo (or installed package)
  → loadConfig(root)                   defaults ← config file ← .local override
  → selectSkills(skillsDir, names)     all skills, or the named subset
  → for each target:
       resolve dest (user|project path, ~ expanded)
       mode = target.supportsSymlink ? installMode : "copy"
       target.install({ skills, dest, mode, force, dryRun })
  → print the actions
```

## Safety model — what the tool will and won't touch

This is the important part. The installer writes into your real config directories, so it is
deliberately conservative about **destroying anything it did not create**.

- **Native (claude).** An entry is "managed" if it is a symlink into this repo, or a copied
  directory carrying an `.agent-skills` marker file. `install` **refuses** to overwrite an
  unmanaged `~/.claude/skills/<name>/` (a directory you hand-authored) unless you pass
  `--force`; `uninstall` **skips** unmanaged entries entirely. So a name collision with your
  own skill can never silently delete your work.
- **File-per-skill (cursor, windsurf).** Generated files carry a marker comment. Both
  `install` and `uninstall` touch a file **only if it carries that marker**, never a
  hand-written rule of the same name.
- **Bundle (codex).** Edits are confined to a delimited managed block inside `AGENTS.md`.
  Surrounding content you wrote is preserved. Markers are matched only when alone on their
  own line, and duplicate/malformed marker pairs cause a hard error instead of a guess.
- **`--force`** is the explicit escape hatch — but it **backs up** (moves to a `.bak-<n>`
  sibling), never deletes outright.
- **Windows** has no symlink privilege by default, so the native target falls back to copy.
- **`--dry-run`** prints every action without touching the filesystem; **`doctor`** reports
  drift/conflicts read-only.
- One target throwing (e.g. a malformed `AGENTS.md`) is caught and reported — the other
  targets still run, and the command exits non-zero.

## Parsing note

`SKILL.md` frontmatter is parsed by a small tolerant reader (`parseFrontmatter`), not a
strict YAML library — on purpose. Agent skill loaders accept unquoted descriptions
containing a colon (e.g. "Out of scope: …"); a strict YAML parser rejects them. The tool
reads frontmatter the way the consuming agents do. When the tool _writes_ frontmatter for
cursor/windsurf, it quotes such values so the output is valid YAML for those tools.
