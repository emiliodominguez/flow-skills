# Contributing

## Adding or changing a skill

1. `pnpm skills new <name> -d "description"` — scaffolds `skills/<name>/SKILL.md`.
2. Write it following [`docs/AUTHORING.md`](docs/AUTHORING.md) — shared anatomy, voice, and
   the multi-agent pattern (only where it earns its keep).
3. `pnpm skills validate` — must be clean (no errors).
4. `pnpm skills install -t claude` and try it in a real session.
5. `pnpm test` and `pnpm run format` before committing.

## What validation enforces

- `SKILL.md` exists; frontmatter has `name` and a single-line `description`.
- `name` is kebab-case and equals the directory name.
- No `/skill-name` handoff points at a skill that doesn't exist (dangling reference).
- Warnings (non-blocking): description over 1024 chars, suspiciously thin body.

Run with `--strict` to fail on warnings too (CI does not, by default).

## Adding a target adapter

Implement the `Target` interface in `src/targets/<name>.ts`:

```ts
export const myTarget: Target = {
	name: "mytool",
	describe: "MyTool — where and what it emits",
	bundle: false, // true if it's a single file for all skills
	install(ctx) {
		/* return Action[] */
	},
	uninstall(ctx) {
		/* return Action[] */
	},
};
```

Then register it in `src/targets/index.ts`, add a default path block to
`agent-skills.config.json`, and add a case to `test/adapters.test.ts`. Reuse the helpers in
`src/core/install-fs.ts` (`symlink`, `copyDir`, `writeFile`, `writeManagedBlock`) and the
managed-file marker in `src/targets/render.ts` so `uninstall` stays safe.

## Commit style

Conventional commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`). No
`Co-Authored-By` trailers.

## Releasing (changesets)

Releases are automated with [changesets](https://github.com/changesets/changesets). When your
change is user-facing, add a changeset in the same PR:

```sh
pnpm changeset          # pick patch/minor/major and write a one-line summary
```

On merge to `main`, the release workflow opens (or updates) a **"version packages" PR** that
bumps the version and prepends the summaries to `CHANGELOG.md`. Merging _that_ PR lands the
release. This repo is **private and not published**, so `NPM_TOKEN` is intentionally unset and
the flow is **versioning-only** — no npm publish. (Set `NPM_TOKEN` to turn publishing on.) The
repo setting _Allow GitHub Actions to create and approve pull requests_ is enabled so the
version PR can open.

Releases `0.1.0`–`0.4.0` were cut by hand; `0.4.1` onward go through this flow.

## Code style

Function declarations over arrow functions, tabs (width 4), print width 150 (Prettier
config is committed). JSDoc on exported functions.
