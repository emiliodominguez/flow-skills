# AGENTS.md - agent-skills

Project guidance for Codex sessions working in this repository. Global user instructions still apply.

## What this is

This is the private source-of-truth repository for the `ed-*` skill suite and the CLI that installs it into Claude Code, Codex, and other assistants. Native Claude Code and Codex installs use live symlinks or explicit copy mode.

## Architecture

`skills/<name>/SKILL.md` is the source of truth. Target adapters in `src/targets/` install native Claude Code and Codex skill directories, render file-per-skill formats for Cursor/Windsurf/Cline/Continue, and render managed bundles for Copilot/Zed/aider. Commands live in `src/commands/`; shared parsing, validation, paths, and filesystem safety live in `src/core/`.

## Required gate

Run every command before committing:

```sh
pnpm run format
pnpm run lint
pnpm run typecheck
pnpm run validate
pnpm run test:coverage
pnpm run build
```

Whenever a skill body or description changes, run `pnpm docs:gen`, inspect and commit the generated docs, and run `pnpm docs:check`. Use `pnpm smoke` for CLI/package changes.

## Skill authoring

- Scaffold with `pnpm skills new <name>`.
- Keep frontmatter valid YAML and include only `name` and `description`.
- Name both explicit invocation forms in descriptions: `/<skill>` for Claude Code and `$<skill>` for Codex.
- Add 3-5 required body substrings to `evals/beats.json` for every skill.
- Test native installs in a throwaway project with `pnpm skills install -t claude codex --scope project`. Report actual host exercises separately from filesystem installation checks.
- Instruction markers and the optional LLM instruction audit do not prove behavior. See `evals/README.md`.
- Keep workflows self-contained for rendered targets; host agent configs and supporting-file installation are separate capabilities.

## Repository conventions

- Use conventional commits; never add `Co-Authored-By` trailers.
- Prefer function declarations over arrow functions.
- Use tabs with width 4 and a print width of 150.
- Add JSDoc to every function in `src/`, including `@param` and non-void `@returns`.
- Do not use em or en dashes in prose, comments, metadata, or user-facing text. Rewrite the sentence or use an ASCII hyphen.
- Use changesets for user-facing changes. Check actual GitHub Actions status rather than assuming remote checks ran. Publish only when explicitly requested and npm-authenticated.
