# Contributing

Use Node.js 22.12 or newer and the pnpm version pinned in `package.json`. Install the locked
versions with `pnpm install --frozen-lockfile`.

## Adding or changing a skill

1. Scaffold with `pnpm skills new <name> -d "description"`.
2. Follow [authoring](docs/AUTHORING.md): clear discovery, a bounded workflow, evidence and a
   checkable finish. Use independent delegation when the work warrants it and the host allows it.
3. Update `evals/beats.json` and regenerate documentation with `pnpm docs:gen`.
4. Try relevant scenarios in isolated sessions. Test native Claude Code and Codex installation
   in a throwaway project with `pnpm skills install -t claude codex --scope project`. Use the
   absolute source CLI path when invoking from outside this checkout. Report unavailable hosts
   and unrun behavioral checks honestly.
5. Run the full gate below, review the resulting diff, and add a changeset for user-facing work.

## Required gate

Run before every commit:

```sh
pnpm run format
pnpm run lint
pnpm run typecheck
pnpm run validate
pnpm run test:coverage
pnpm run build
```

After skill edits, inspect and commit `pnpm docs:gen` output and run `pnpm docs:check`.
For CLI/package changes also run `pnpm smoke`, which packs and installs into a temporary project.
Do not depend on hosted CI being enabled; inspect the actual run state.

Validation rejects an empty corpus, malformed YAML, absent `SKILL.md`, a non-kebab-case or
mismatched name, names over 64 characters, descriptions over 1024 characters, and dangling
skill handoffs. Quality warnings, such as a suspiciously thin body, are non-blocking unless
`--strict` is selected. Instruction-marker tests do not prove agent behavior; see [evals](evals/README.md).

## Adding a target adapter

Implement the `Target` interface in `src/targets/<name>.ts`, register it in
`src/targets/index.ts`, add defaults to both `src/core/config.ts` and
`agent-skills.config.json`, then test install, status, drift, uninstall and conflicts.

Use current primary host documentation for format, activation and scope. A host supporting
native skills does not mean this CLI's existing rules adapter installs them. State resource
and activation limits. Reuse the filesystem helpers and managed markers; never overwrite
unmanaged content by default. Test `--force` backups and non-mutating dry runs.

## Commits and releases

Use conventional commits, without `Co-Authored-By` trailers. Add a changeset with
`pnpm changeset` for user-facing changes. New skills are normally a minor change; bug fixes
are normally patch changes. Explicitly call out minimum-runtime or destination changes.

When release preparation is requested, run `pnpm run version:packages` and review the generated
package metadata and changelog. Publishing with `pnpm run release` requires an explicit request
and configured npm authentication. Changesets record release intent even when automation is disabled.

## Code style

Prefer function declarations. Use tabs (width 4), print width 150, and the committed Prettier
and ESLint configuration. Every function in `src/` needs JSDoc, with `@param` and non-void
`@returns`. Keep the required blank-line discipline. Use ASCII hyphens instead of em or en dashes.
