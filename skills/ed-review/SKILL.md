---
name: ed-review
description: "Multi-persona review of changes before they ship — fans out distinct-viewpoint reviewers (correctness, readability, architecture, security, performance, simplicity), then runs an adversarial verification pass that tries to REFUTE each finding so only real, confidence-tagged problems survive. Use after /ed-work is complete, before /ed-ship, or when invoked as /ed-review (also triggers on \"review this\", \"check before I push\", \"audit changes\"). Surfaces real problems only — no nitpicking. Hands off to /ed-adversarial-review for a red-team pass, /ed-simplify for de-slopping, or /ed-ship to merge. Invoke as /ed-review in Claude Code or $ed-review in Codex."
---

> Host syntax: invoke skills as `/skill-name` in Claude Code or `$skill-name` in Codex. Slash-form handoffs below use the Claude spelling; substitute `$` in Codex.

# Review

Not five clones of the same reviewer — a panel of reviewers who each think differently,
followed by a skeptic who tries to prove each finding wrong. What survives is worth your
time. Confident false positives are the failure mode this skill is built to defeat.

**Scope by default:** every committed and working-tree change since the merge base with the
repository's default branch, including staged, unstaged, and untracked files. Resolve the
default branch from repository metadata instead of assuming `main`. Override on request. If
there are no changes, say so and stop.

---

## Step 1: Scope

Start with `git status --short`, resolve the default branch, and diff its merge base against
the working tree. Explicitly add untracked files to the review scope because `git diff`
doesn't list them.

Read the diff yourself first — enough to know the shape and pick the reviewer set.
**Correctness is always on**, and **Security is always on whenever the diff touches input,
auth, filesystem, db, or shell** — those two are the coverage floor and "low-risk" is a
guess you make _before_ the review finds anything, so never drop them. Scale the rest
(readability, architecture, performance, simplicity): small diff → just those two plus one
or two; large or risky (auth, money, migrations, concurrency) → all 6, and follow with
`/ed-adversarial-review`.

---

## Step 2: Fan out the persona reviewers (parallel, read-only)

Launch the chosen personas as **parallel subagents in one batch** using the host's
delegation mechanism. **Run them read-only: instruct them not to edit, and remember only
you, the orchestrator, write files.** If the host has no subagent support, run the same
personas sequentially; otherwise batch personas and verifiers within available concurrency. Give each the
diff scope, its lens, and the **findings schema**. Each persona has a distinct mental model,
so they surface different classes of problem. **For a very large diff (hundreds of files),
shard the diff across agents by directory/file** rather than handing every persona the whole
thing — adding lenses multiplies load, it doesn't split it:

1. **Correctness — the Skeptical Senior.** Does it do what it claims? Logic errors
   (off-by-one, wrong predicate/branch), unhandled edge cases (null/empty/max/concurrent),
   API misuse (arg order, ignored returns, missing `await`), type lies (`as any`,
   suppressions), tests that assert on mocks instead of the public contract.
2. **Readability — the New Hire reading it cold.** Understandable in 60 seconds?
   Intent-hiding names (`data`, `info`, `manager`, `helper`), mixed abstraction levels,
   comments that explain *what* not *why*, stale comments, leftover `console.log`, dead
   branches, unused imports.
3. **Architecture — the Maintainer two years from now.** Does the change deepen or
   shallowify the module? New surface that should be private, cross-boundary coupling to
   internals, a missing (or premature) abstraction, public API changed with no migration
   path.
4. **Security — the Adversary (light lens).** Unvalidated input reaching db/fs/shell,
   secrets in code/logs/errors, missing authn/authz, injection vectors, vulnerable deps
   if a lockfile changed, trust boundaries crossed without validation. *(For a real attack
   pass, run `/ed-adversarial-review`.)*
5. **Performance — the Performance Hawk.** N+1 queries, unbounded loops, repeated
   compilation in hot paths, sync work that should be parallel (or vice versa),
   re-renders / missing memo / bundle bloat (frontend), a cache added with no measurement.
6. **Simplicity — the Minimalist.** Single-use abstractions, defensive checks for
   impossible cases, indirection that hides a one-liner, AI slop. *Flag only — the rewrite
   is `/ed-simplify`.*

### Findings schema (every reviewer returns this shape)

```
- file:line   path and 1-indexed line
- persona     which lens
- severity    blocking | should-fix | nice-to-have
- claim       one sentence: the defect
- scenario    concrete inputs/state → wrong outcome (the falsifiable part)
- fix         one-line suggested direction
```

A finding with no concrete `scenario` is a vibe, not a bug — tell reviewers to drop it.

---

## Step 3: Merge

Collect all findings, **dedup by `file:line` + claim** (two personas often flag the same
spot — merge only when they describe the _same_ defect, keeping the sharpest claim and both
lenses). Two _different_ defects on one line (say a wrong predicate and an unhandled null)
stay as separate findings. You now have one candidate list.

---

## Step 4: Adversarial verification — try to refute each finding

This is the step that makes the review trustworthy. For each surviving candidate, spawn an
independent **verifier subagent** (parallel; read-only) whose *job is to refute it*:

> *"Here is a claimed defect: <claim + scenario>. Try to prove it is NOT a real problem —
> name the guard, caller contract, type, or test that makes the scenario impossible. Then
> verdict it: **REFUTED** only if you can name what makes it impossible or show the code
> isn't reachable from the diff; **CONFIRMED** if you can reproduce it or prove it reaches;
> otherwise **PLAUSIBLE** — you couldn't prove it impossible but couldn't reproduce it
> either. Do NOT drop an unproven-but-unblocked finding to REFUTED."*

Reserve REFUTED for a _named_ blocker (or code not present) — "I couldn't confirm
reachability" is PLAUSIBLE, not REFUTED, or the tier that keeps true-but-unproven bugs would
never fire. For a small candidate list, verify every finding. For a large one, batch by file.

### Verdict schema

```
- verdict   CONFIRMED (reproduced / proven reachable) | PLAUSIBLE (argued, not proven) | REFUTED
- reason    the reproduction, the counter-argument, or the refutation
```

Drop everything `REFUTED`. Keep `CONFIRMED` and `PLAUSIBLE`. If a refuted finding is the
kind a human reviewer would otherwise re-raise, note it once under "considered and ruled
out" so nobody re-litigates it.

---

## Step 5: Report

```
## Blocking
- [file:line] (persona · CONFIRMED) one-line claim — one-line fix

## Should-fix
- [file:line] (persona · CONFIRMED|PLAUSIBLE) one-line claim — one-line fix

## Nice-to-have
- [file:line] (persona) one-line claim

## Considered and ruled out   (only if useful)
- [file:line] claim — why it's not a problem
```

- **Blocking** = correctness bugs, security holes, broken tests. Fix before ship.
- **Should-fix** = real problems, not urgent, cheap now.
- **Nice-to-have** = preference. Skip if nobody cares.

**Don't pad.** No blockers → say "no blockers" and move on. Inventing findings to look
thorough is the opposite of thorough.

---

## What this skill does NOT do

- ❌ Formatting nits (Prettier handles that)
- ❌ Bikeshedding names that are already fine
- ❌ Demanding tests for trivial code
- ❌ Demanding refactors orthogonal to the change
- ❌ "Consider using…" with no concrete reason
- ❌ Reporting a finding that verification couldn't confirm was reachable

---

## Done when

- The chosen personas ran and returned structured findings
- Findings were deduped and each ran through adversarial verification
- Report is triaged and confidence-tagged, with no padding
- Every Blocking item has a concrete fix proposed

Then either:
- Blocking items? Fix them (`/ed-work`) and re-run review.
- Security/data-sensitive change? Run `/ed-adversarial-review` for a red-team pass.
- Slop or bloat? `/ed-simplify` the diff.
- Clean? Say **"Review passed. Ready for `/ed-ship`?"**
