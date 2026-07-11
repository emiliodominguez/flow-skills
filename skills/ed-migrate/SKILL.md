---
name: ed-migrate
description: Run a large mechanical change across many files safely — nail the transform on one canonical example, enumerate every site, apply it in an isolated worktree, and verify each site as you go so a bad rewrite can't hide in the pile. Use for codemods, API renames, framework upgrades, or any repetitive cross-file edit (also /ed-migrate, "rename this everywhere", "migrate all callers", "apply this change across the repo"). Hands off to /ed-review for a correctness pass, then /ed-ship.
version: 0.1.0
---

# Migrate

A migration fails in one of two ways: you miss sites, or you break some while "fixing" all. The discipline below closes both — an exhaustive site list and a per-site verify loop — so scale doesn't hide mistakes.

---

## Phase 1: Define the transform on one example

Before touching the second file, get the **before → after** exactly right on one representative site.

- Write the canonical example down: this pattern becomes that pattern.
- Cover the variants up front — the call with extra args, the destructured import, the re-export, the one already half-migrated. List the shapes you'll encounter so none surprises you at file 200.
- Decide **automated vs. by-hand**: a clean syntactic change wants a codemod/`sed`/AST tool; a semantic one that needs judgement per site is done by hand. Most migrations are a mix — script the mechanical 90%, hand-do the tail.

---

## Phase 2: Enumerate every site

You can't migrate what you haven't found.

- Grep/AST-search for the pattern **and its aliases** (re-exports, wildcard imports, dynamic references, string references in config or tests).
- Produce the full list of sites and **count it**. That number is your denominator — you'll check it off to zero.
- Watch for sites tools miss: reflection, generated code, docs, comments that will now lie.

---

## Phase 3: Isolate in a worktree

Do the migration in a **dedicated git worktree / branch**, never in a dirty tree.

- A big sweep mixed with other work is unreviewable and un-revertable. Keep it alone.
- If you're fanning out parallel agents to transform disjoint site groups, give each its **own worktree** so concurrent edits can't corrupt each other, then merge.

---

## Phase 4: Transform and verify each site

Apply the transform, then **verify per site — not just at the end**.

- After each site (or each batch), run the tightest check that proves it: typecheck the file, run its tests, or compile. A green whole-suite at the end can't tell you *which* of 200 edits silently changed behaviour.
- Check off the site list as you go. The denominator from Phase 2 hits zero exactly.
- When a site doesn't fit the transform, stop and decide — extend the rule, or handle it by hand and note why. Don't force it.

---

## Phase 5: Prove the whole is intact

- Full build + typecheck + test suite green.
- Re-run the Phase 2 search: **zero** un-migrated sites remain (and no new ones crept in).
- Skim the diff for scale-hidden damage — a mechanical rewrite that technically applied but changed meaning in an edge case.

---

## Anti-patterns

- ❌ One giant find-and-replace across the repo with no per-site verification
- ❌ Starting the sweep before the transform is pinned on a canonical example
- ❌ Trusting the first grep — missing aliases, dynamic refs, generated code, config strings
- ❌ Parallel agents editing overlapping files in one tree, corrupting each other's writes
- ❌ Declaring done on a green final suite without re-searching for missed sites
- ❌ Forcing an ill-fitting site into the mechanical rule instead of handling it by hand

---

## Done when

- The transform is pinned on a canonical example, variants enumerated
- Every site is accounted for; the search now returns zero un-migrated hits
- Each site was verified as applied, not just the suite at the end
- Full build + tests are green and the diff is confined to the migration

Then: pick up `/ed-review` for a correctness pass over the sweep, then `/ed-ship`.
