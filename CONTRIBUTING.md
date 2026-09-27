# Contributing

```sh
pnpm install --frozen-lockfile
pnpm check    # everything CI runs; the pre-commit hook formats staged files
```

Style, frontmatter, budgets, links and generated docs are all enforced by `pnpm check`. When it
passes, what's left is judgment:

## Changing a skill

- Start new skills with `pnpm skills new flow-<name>`, and read [authoring](docs/AUTHORING.md) for
  what makes a skill good. Tooling can't check that.
- Add its markers to `evals/beats.json`, add it to `profiles.json` if it belongs to a profile, and
  commit the `pnpm docs:gen` output.
- Try it for real: `./install.sh --local --project` in a throwaway project, then use it in an agent
  session. Say which agents you tried and what you didn't check; marker tests don't prove behavior
  ([evals](evals/README.md)).
- For install script or manifest changes, run `pnpm smoke`. It needs npm registry access.

## Commits and versions

- Use conventional commits.
- Add a changeset (`pnpm changeset`) for user-facing work: new skills are minor, fixes are patch,
  renames or removals are major.
- `pnpm run version:packages` bumps the version, writes the changelog and syncs the plugin manifest.
  Nothing is published to npm; users install from GitHub.
