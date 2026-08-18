---
name: ed-ship
description: "Get reviewed changes to production safely — atomic commits with conventional-commit messages, a draft PR with auto-fix on pre-commit failures, and a pre-launch checklist for anything user-facing. Use after /ed-review passes (and /ed-adversarial-review for security/money/data/auth/migration-sensitive changes), or when invoked as /ed-ship (also \"push this\", \"open a PR\", \"let's ship it\", \"ready to deploy\"). Hands off to /ed-pr-fix when reviewers comment, /ed-git-fix when the push snags on a rebase/conflict. Invoke as /ed-ship in Claude Code or $ed-ship in Codex."
---

> Host syntax: invoke skills as `/skill-name` in Claude Code or `$skill-name` in Codex. Slash-form handoffs below use the Claude spelling; substitute `$` in Codex.

# Ship

Move reviewed changes through commit → PR → production. Each step catches a different class of mistake — don't skip any. The one discipline this skill enforces: **nothing ships un-reviewed, and every commit is atomic and honestly attributed.**

**Gate — don't ship un-reviewed.** This runs *after* `/ed-review` passes. For anything security-, money-, data-, auth-, or migration-sensitive, it also runs after `/ed-adversarial-review`. If review hasn't happened, stop and run `/ed-review` first — shipping is not the place to discover the bug.

---

## Step 1: Atomic commits

**Preflight:** confirm you're on a branch, not a detached HEAD — `git symbolic-ref -q HEAD` should succeed. If it's detached (post-bisect, a checked-out tag/sha), stop and create a branch first, or the commits can't be published as a PR.

Group changes by intent, not by file. One concern per commit. Use conventional-commit prefixes:

- `feat:` — new capability
- `fix:` — bug fix
- `refactor:` — behavior-preserving change
- `chore:` — tooling, deps, formatting
- `docs:` — documentation only
- `test:` — adding/fixing tests

**Rules:**
- Title under 70 chars, imperative mood ("add", not "added").
- Body explains *why*, not *what*. The diff shows *what*.
- **No `Co-Authored-By` trailers. Ever.** No "Generated with" credits either.
- One commit ≠ one file. One commit = one coherent change.
- If the title needs an "and", split the commit.

---

## Step 2: Open / update the draft PR

Draft first — a PR marked ready pings reviewers, and you're not ready until Step 4.

**Preflight:** confirm `gh` is installed and authed (`gh auth status`) and the branch has a remote. If `gh` is missing/unauthed or there's no remote, stop and tell the user — or `git push -u origin HEAD` and hand over the compare URL — rather than erroring on `gh pr create`.

```bash
gh pr create --draft --title "..." --body "..."
```

If the PR already exists, update it (`gh pr edit` or just push) rather than opening a duplicate.

PR body template:

```
## Summary
- 1–3 bullets, each starts with a verb

## Why
- 1–2 sentences on the motivation (link the issue/spec if one exists)

## Test plan
- [ ] How a reviewer can verify locally
- [ ] What's covered by tests, what isn't
- [ ] Any manual steps
```

**If a pre-commit hook fails:** read the failure. Fix the underlying issue. Re-stage the fix. Then re-commit — **after a failed plain `git commit`, make a NEW commit** (the blocked commit never happened, so `--amend` would rewrite the *previous*, good commit). The one exception: if the aborted operation was itself a `git commit --amend`, HEAD is unchanged, so re-run `--amend` — a new commit there would leave an unwanted extra one. Verify with `git log` if unsure. **If the hook keeps failing and you can't resolve the cause after a reasonable attempt, stop and report to the user** — don't loop.

**Never bypass the hook** (`--no-verify`) to force it through. Fix the cause.

**If the push snags on a rebase or conflict** (`! [rejected]`, non-fast-forward, a stack that needs restacking): stop and hand to `/ed-git-fix` — don't force-push over it.

---

## Step 3: Pre-launch checklist (only for user-facing changes)

Skip for internal refactors. Apply to anything that hits production behavior.

- [ ] **Tests cover the happy path** and at least one realistic failure case
- [ ] **The feature works in a browser** if it's UI (load it, click it, see it — type-check ≠ works)
- [ ] **Logs and telemetry** in place for anything you'll want to see in prod
- [ ] **Rollback plan** — what's the one-command revert if this is wrong? (`git revert <sha>`, feature flag off, etc.)
- [ ] **Migration safety** — if there's a schema change, it's reversible and backwards-compatible with old code (deploy migration before code, or expand-then-contract)
- [ ] **Env vars / secrets** live in the deploy target, not just locally. Don't run `vercel env pull` on Infisical projects.
- [ ] **Feature flag** if rollout should be gradual
- [ ] **On-call awareness** if this touches critical paths

---

## Step 4: Promote to ready, request review

**First confirm CI is green.** The pre-launch checklist covers only *local* checks, but CI runs the moment the PR opens — don't `gh pr ready` on a red pipeline (that's the mistake this skill exists to catch before reviewers see it):

```bash
gh pr checks --watch   # wait for green; if red, fix via /ed-work before promoting
gh pr ready
```

Tag the *right* reviewer for the change — don't ping everyone. Confirm the test plan boxes reflect what you actually ran.

---

## Anti-patterns

- ❌ Shipping before `/ed-review` passed (or `/ed-adversarial-review` on sensitive changes)
- ❌ Squashing unrelated changes into one commit ("WIP", "stuff", "misc fixes")
- ❌ `--amend` after a pre-commit hook failure — make a new commit instead
- ❌ Bypassing hooks with `--no-verify` instead of fixing the failure
- ❌ Force-pushing to main, or to any branch reviewers are already on
- ❌ Force-pushing through a rejected push instead of handing to `/ed-git-fix`
- ❌ Shipping the migration and the code that depends on it in one deploy
- ❌ Skipping `gh pr ready` and assuming people will review a draft
- ❌ Adding `Co-Authored-By: Claude` (or any co-author / generated-by trailer) — never

---

## Done when

- Every commit is atomic, conventional-prefixed, and lands cleanly (no `--amend`-after-hook, no `--no-verify`)
- PR is open, marked ready, and the test plan is filled in
- Pre-launch checklist passed (or skipped with a stated reason)
- The right reviewer is tagged

Then: wait for review. When reviewers comment, use `/ed-pr-fix`. If the push snagged on a rebase or conflict, use `/ed-git-fix`, then come back here.
