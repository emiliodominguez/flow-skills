# Contributing

```sh
pnpm install --frozen-lockfile
pnpm check    # format, lint, types, validation, tests and generated docs
```

Style, frontmatter, budgets, links and generated docs are all enforced by `pnpm check`. When it
passes, what's left is judgment:

## Changing a skill

- Start new skills with `pnpm skills new flow-<name>`, and read [authoring](docs/AUTHORING.md) for
  what makes a skill good. Tooling can't check that.
- Add its markers to `evals/beats.json` and its routing prompts to `evals/triggers.json`, add it to
  `profiles.json` if it belongs to a profile, and commit the `pnpm docs:gen` output.
- If you have model access, run `pnpm eval:triggers` after description changes and `pnpm eval:ab`
  for behavior you claim the skill changes.
- Try it for real: `./install.sh --local --project` in a throwaway project, then use it in an agent
  session. Say which agents you tried and what you didn't check; marker tests don't prove behavior
  ([evals](evals/README.md)).
- For install script or manifest changes, run `pnpm smoke`. It needs npm registry access and
  checks install, list and removal in temporary project and user directories, using both symlinks
  and copies. It also checks PromptScript in project scope. These are CLI checks, not agent sessions.
- CI also runs `pnpm audit --prod --audit-level=high`.

## Commits and versions

- Use conventional commits.
- Add a changeset (`pnpm changeset`) for user-facing work: new skills are minor, fixes are patch,
  renames or removals are major.
- `pnpm run version:packages` bumps the version, writes the changelog and syncs the plugin manifest.
  Nothing is published to npm; users install from GitHub.
