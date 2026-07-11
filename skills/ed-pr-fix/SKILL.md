---
name: ed-pr-fix
description: Address GitHub PR review comments — pull ALL open feedback, group it by intent, fix in a coherent order, and reply to every thread with a commit link. Use after /ed-ship when reviewers leave comments (or when invoked as /ed-pr-fix, when the user says "address the review", "fix the PR feedback", "respond to comments"). Fixes use /ed-work discipline; hands back to /ed-ship to push the follow-up commits.
---

# PR Fix

Reviewers left comments. Don't attack them one by one — pull all of them, group by
intent, plan a coherent order, then fix and reply. The discipline this skill enforces:
**no comment is left without a response, and every "fixed" reply links the commit that
fixed it.** A reviewer must be able to trace your reply straight to the diff.

---

## Phase 1: Pull all the feedback

```bash
gh pr view --comments                              # top-level conversation
gh api repos/:owner/:repo/pulls/<NUM>/comments     # inline review comments (per file/line)
gh api repos/:owner/:repo/pulls/<NUM>/reviews      # full review bodies + verdicts
```

Read **every** comment before touching code — including resolved ones (they carry context
for newer threads). For each, capture:

- **File and line** it points at
- **What's being asked** — change request, question, suggestion, nit, blocker
- **Who said it** — and whether that reviewer commented elsewhere (their comments may
  form one theme)

Keep a running list keyed by thread id so nothing falls through the cracks in Phase 4.

> **Optional — big PRs only.** If there are many comments spread across many files, spin
> up **one** read-only triage agent (`type: Explore`, no edits) to bucket the threads into
> the Phase 2 categories and hand back a table. Don't fan out further — one agent, one
> pass, purely to save you the manual sort. For a normal PR, skip it and sort by hand.

---

## Phase 2: Group by intent

Bucket every comment. Different buckets earn different responses:

- **Blocker** — must change before merge. Bug, security hole, broken test, wrong behaviour.
- **Should-fix** — meaningful improvement. Clearer name, missing case, simpler structure.
- **Nit / style** — preference. Line break, comment phrasing. Still gets a reply.
- **Question** — reviewer wants context, not a code change. Answer clearly; only touch code
  if the question exposed a real issue.
- **Disagreement** — you think the reviewer is wrong. Push back with reasoning; don't
  silently capitulate and don't silently ignore. Reviewers respect a well-argued case.

**If two reviewers contradict each other, raise it explicitly before doing either:**

> *"A wants X, B wants Y. I'd lean X because Z. Which way do we go?"*

Guessing which reviewer to obey and silently overriding the other is how you earn a second
round of comments.

---

## Phase 3: Plan the fix order

- **Blockers first** — until they're gone, merging is off the table.
- **Group fixes by file** — fewer context switches, cleaner commits.
- **Group fixes that touch the same code path** — so one fix doesn't quietly break the
  assumption another fix depends on.
- **One commit per logical concern, not per comment.** Three naming nits in one file → one
  `chore:` commit. But keep concerns separate so the review trail stays legible.

---

## Phase 4: Execute + reply to every thread

Fix with **/ed-work discipline: one slice per concern, verify each before moving on.** No
batching three unrelated fixes into one unverified push.

For each fix:

1. Make the change.
2. Run the test that covers that area — or write one if it's missing (a blocker with no
   test is a blocker waiting to come back).
3. **Reply to the thread**, and link the commit sha so the reviewer can trace it:
   - Fixed → *"Fixed in `abc1234`."*
   - Fixed + hardened → *"Good catch — fixed in `abc1234`, added a regression test."*
   - Nit you took → *"Done in `abc1234`."*
   - Nit you're declining → acknowledge it, don't ignore it: *"Leaving as-is — `x` reads
     fine here and matches the file. Shout if you feel strongly."*
   - Disagreement → *"Disagree — [reasoning]. Keep as-is?"* Leave it **open**; the
     reviewer decides, not you.
   - Question → answer it plainly; change code only if the answer revealed a real bug.
4. Resolve threads you've genuinely addressed. Leave open the ones you pushed back on or
   left unchanged by design.

**Every single comment ends in one of three states:** fixed-and-replied,
pushed-back-with-reasoning, or nit-acknowledged. None left silent.

---

## Phase 5: Re-push, re-request review

```bash
git push
gh pr comment --body "Addressed feedback — see per-thread replies. Ready for another look."
```

**Don't squash the fix commits into the originals.** Reviewers want to see exactly what
changed since their last pass — squashing destroys that trail. Squash happens at merge
time, never before.

Then re-request review (`gh pr edit --add-reviewer <name>` if they were dropped) and wait.

---

## Anti-patterns

- ❌ Fixing comments one at a time without reading them all first — you'll re-fix the same
  code twice
- ❌ Leaving any comment with no response — silently dismissing a nit reads as ignoring it
- ❌ "Done." with no commit sha — reviewers can't tell what you actually changed
- ❌ Force-pushing over existing commits before reviewers have re-checked
- ❌ Squashing fix commits into the originals before merge — destroys the review trail
- ❌ Closing a comment you disagreed with instead of arguing the case in the thread
- ❌ Silently picking a side when two reviewers contradict each other
- ❌ Batching three unrelated fixes into one unverified commit — fix per /ed-work slice,
  verify each

---

## Done when

- Every comment has a response — fix-and-reply, push-back-with-reasoning, or
  acknowledged-nit — and every "fixed" reply links a commit sha
- All blockers are fixed and verified (test output, not "looks right")
- Contradicting reviewers were surfaced and resolved, not silently overridden
- Fix commits are pushed **unsquashed**; reviewers re-requested

Then: wait for re-review. Green → return to **`/ed-ship`** to merge or push the follow-up.
More comments → run `/ed-pr-fix` again.
