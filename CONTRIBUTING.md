# Contributing

## Adding or changing a skill

1. `pnpm skills new <name> -d "description"` - scaffolds `skills/<name>/SKILL.md`.
2. Write it following [`docs/AUTHORING.md`](docs/AUTHORING.md) - shared anatomy, voice, and
   the multi-agent pattern (only where it earns its keep).
3. `pnpm skills validate` - must be clean (no errors).
4. `pnpm skills install -t claude codex` and try it in real sessions on both hosts.
5. `pnpm test` and `pnpm run format` before committing.

## What validation enforces

- `SKILL.md` exists; frontmatter has `name` and a single-line `description`.
- `name` is kebab-case and equals the directory name.
- No `/skill-name` or `$skill-name` handoff points at a skill that doesn't exist (dangling reference).
- Warnings (non-blocking): description over 1024 chars, suspiciously thin body.

Run with `--strict` to fail on warnings too (CI does not, by default).

## Adding a target adapter

Implement the `Target` interface in `src/targets/<name>.ts`:

```ts
export const myTarget: Target = {
	name: "mytool",
	describe: "MyTool - where and what it emits",
	supportsSymlink: false,
	install(ctx) {
		/* return Action[] */
	},
	uninstall(ctx) {
		/* return Action[] */
	},
	status(ctx) {
		/* return SkillStatus[] */
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

Releases use [changesets](https://github.com/changesets/changesets). GitHub Actions is currently
disabled, so versioning and publishing are manual. When your change is user-facing, add a
changeset in the same PR:

```sh
pnpm changeset          # pick patch/minor/major and write a one-line summary
```

When a version is ready, update the package metadata and changelog locally:

```sh
pnpm run version:packages
git add package.json CHANGELOG.md .changeset
git commit -m "chore(release): version packages"
```

Review the generated changes before committing. Run `pnpm run release` only when publishing is
explicitly requested and npm authentication is configured.

Changesets remain the source of release intent even while the automation is disabled.

## Code style

Function declarations over arrow functions, tabs (width 4), print width 150 (Prettier
config is committed). JSDoc on exported functions.
