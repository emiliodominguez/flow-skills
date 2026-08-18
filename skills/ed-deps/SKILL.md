---
name: ed-deps
description: "Update dependencies to their latest versions safely - inventory what's outdated, read the changelog for every major before bumping it, upgrade one at a time behind the test gate, and record anything held back with a reason. Use when bumping dependencies, chasing a security advisory, or on a routine currency pass (also /ed-deps, \"update dependencies\", \"bump deps\", \"are these up to date\", \"upgrade the packages\"). Hands off to /ed-review for the diff, then /ed-ship. Invoke as /ed-deps in Claude Code or $ed-deps in Codex."
---

> Host syntax: invoke skills as `/skill-name` in Claude Code or `$skill-name` in Codex. Slash-form handoffs below use the Claude spelling; substitute `$` in Codex.

# Deps

Dependency upgrades break in two ways: a major with a migration you didn't read, and a bulk bump where one break hides in a pile of twenty. The discipline below keeps upgrades **current, deliberate, and reversible** - never a blind `update --latest` and a prayer.

Default scope is the project's direct dependencies. Transitive pins and lockfile-only bumps are in scope when an advisory or a resolution demands them.

---

## Phase 1: Inventory

See what's **outdated** and how risky each bump is before touching anything.

- List what's behind (`pnpm outdated` / `npm outdated`) and group by the jump: **patch** (safe), **minor** (usually safe), **major** (read first).
- Run the security audit (`pnpm audit`) and mark anything with an advisory - those jump the queue regardless of how big the version bump is.
- Note any dependency you already know is **held back** (a peer-dependency ceiling, an upstream that hasn't shipped support yet).

---

## Phase 2: Read before you leap

For **every major**, read its **changelog** or migration guide before you bump it - the release notes, not a guess.

- Fetch the real notes (the package's releases page, or Context7 for the library's docs). Look for renamed exports, dropped Node versions, changed defaults, and codemods.
- If the migration is non-trivial, treat that one major as its own unit of work with its own commit.
- A minor that the changelog flags as behaviourally risky gets the same treatment as a major.

---

## Phase 3: Upgrade in safe order, one at a time

- Land **patches and minors** first, as one batch - low risk, and it clears the noise so a major's breakage is isolated.
- Then bump each **major one at a time**, never several at once. When something breaks you want exactly one suspect.
- Update the **lockfile** with the manifest and commit them together (`chore(deps): …`); a hand-edited version with a stale lockfile installs the old package.

---

## Phase 4: Verify each bump

Run the gate after **each** bump, not once at the end:

- `typecheck → lint → test → build` (whatever the project's gate is). Green before the next bump.
- A break you can fix from the migration guide → fix it in the same commit as the bump. A break you can't → revert that one dependency and move on; don't leave the tree red.

---

## Phase 5: Hold back with a reason

Some upgrades can't land yet - a peer-dependency conflict, an upstream that hasn't caught up. When you skip one, **record why**, so the next currency pass doesn't silently re-discover it.

- Pin it and note the blocker and the unblock condition (in the changelog, a comment, or the dependabot ignore list).
- Prefer a documented hold over a silent stale pin - the difference between "we chose this" and "we forgot".

---

## Anti-patterns

- ❌ `update --latest` / bump-everything-at-once, so one failure hides in the pile
- ❌ Upgrading a major without reading its changelog or migration guide
- ❌ Skipping the gate between bumps and discovering three breakages at once
- ❌ Editing a version in the manifest by hand without updating the lockfile
- ❌ Silently pinning an old version with no note on why it's held back

---

## Done when

- Dependencies are current, or explicitly held back with a documented reason
- Every major was read before it was bumped, and landed one at a time
- The gate is green in the final state and the lockfile is committed alongside the manifest
- The audit shows no unaddressed high/critical advisory

Then: `/ed-review` the diff (dependency bumps are behaviour changes in disguise), then `/ed-ship`.
