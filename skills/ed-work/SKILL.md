---
name: ed-work
description: "Execute work as thin, verified vertical slices - either from a plan file written by /ed-plan (`/ed-work .plans/PLAN.md`) in a fresh context, or ad-hoc from a description when there's no plan. Write code, prove it works with evidence, then move to the next slice. Use for any implementation work (or when invoked as /ed-work, when the user says \"implement this\", \"build this\", \"let's code this up\", \"make it work\", \"run the plan\"). Verifies against official docs when uncertain, prefers tests-first for new behavior, and hands off to /ed-review when the work is complete. Invoke as /ed-work in Claude Code or $ed-work in Codex."
---

> Host syntax: invoke skills as `/skill-name` in Claude Code or `$skill-name` in Codex. Slash-form handoffs below use the Claude spelling; substitute `$` in Codex.

# Work

Turn a plan (or a request) into working code, one small verified slice at a time. Each
slice is a change you can *prove* works before moving on.

It has two modes. **Pick by the argument, not merely by whether a plan file exists** -
completed plans accumulate in `.plans/`, so "a plan is present" is the steady state:

- an explicit path (`/ed-work .plans/<file>`) → **Mode A** on that file;
- a description (`/ed-work add a logout button`) → **Mode B**, ad-hoc;
- bare `/ed-work` → **Mode A** on the one plan whose `**Status:**` is `ready` and that still
  has unchecked `- [ ]` tasks. If several qualify (or none), list the candidates and ask.

---

## Mode A: Execute a plan (fresh context)

Triggered by `/ed-work .plans/<file>`, a bare `/ed-work` with a single in-progress plan, or
"run the plan" (see the selection rule above).

**Assume you are starting cold.** Do not rely on prior conversation.

1. **Read the plan file** in full. If the named plan is missing, unreadable, or has no
   `- [ ]` tasks, **stop and report** before touching code - don't guess a plan. Then read
   the files it names in `Touches:` - get the real code in front of you, not your memory.
2. **Restate** the goal and the task list back to the user in 3-4 lines, and name the
   first task you'll execute. If the plan and the current code already disagree (the code
   moved since the plan was written), say so before touching anything.
3. **Execute tasks in dependency order, one at a time** (see "Every slice" below).
4. **After a task's acceptance is proven, check it off in the plan file**: flip
   `- [ ]` → `- [x]` and append a one-line evidence note, e.g.
   `- [x] **T1 - add token endpoint** ✓ test `auth.test.ts` green`.
   The plan file stays a live, accurate checklist across sessions.
5. When all tasks are `- [x]`, set `**Status:** done` in the plan file (so it's no longer a
   bare-`/ed-work` candidate), then stop and hand off to review.

If a task turns out to be wrong or impossible as written, **stop and report** - don't
silently improvise a different plan. The plan may need a fix (`/ed-plan`), not a workaround.

---

## Mode B: Ad-hoc (no plan file)

Triggered by `/ed-work <description>` with no plan. Same slicing discipline, no file to
check off. For anything bigger than a couple of slices, suggest `/ed-plan` first.

---

## Before you write any code (both modes)

1. **Know what "done" is** - the task's acceptance criteria, or the ad-hoc ask, in one line.
2. **State assumptions out loud** if anything is ambiguous:
   > *"I'm assuming X. Correct me or I'll proceed."*
3. **Check real docs if unsure of a library API.** Memory is unreliable - use the host's
   official-documentation search, configured docs MCP, web access, or the lockfile-pinned
   source. Don't guess API shapes.
4. **Match the surrounding code.** Tabs if it uses tabs. `function foo()` if it declares
   functions. Bracket notation for SCSS modules. Copy the neighborhood's idiom.

---

## Every slice: build → verify

### Tests-first (default for new behavior)

1. Write a failing test describing the behavior in plain terms - the public contract, not
   the implementation.
2. Run it. Confirm it fails **for the right reason** (not a typo/import error).
3. Write the minimum code to pass.
4. Run the test; run the whole suite if it's cheap.
5. Refactor only what's ugly. Re-run.

A good test survives a rewrite of the implementation. If it breaks when you change *how*
without changing *what*, it's too coupled - fix the test.

### Direct (refactors, UI, anything not behavior-changing)

1. Make the smallest change that moves toward the acceptance criteria.
2. Verify by **running** it - UI in a browser, script in a shell, function in a quick test.
3. For UI: **load the page and look at it** before claiming done. Type-check ≠ "it works".

---

## Verify before claiming done

Every slice ends with **evidence** it works:

- A passing test you wrote for this slice
- A screenshot or recording of the UI behavior
- A console paste showing the script ran
- A live response from the API

"Looks right" is not evidence. A green type-check is not evidence of correctness. When a
change has real runtime surface, prefer driving it end-to-end with the host's browser/API tools over
trusting tests alone.

---

## Discipline

- **One slice at a time.** Resist also-fixing the unrelated thing you noticed - note it for
  later.
- **Don't refactor adjacent code** outside the slice's scope. (That's `/ed-refactor`.)
- **Don't add features beyond the task** because they "seem useful".
- **No error handling for impossible cases.** Trust internal code; validate at system
  boundaries only.
- **Default to no comments.** Add one only when the *why* is non-obvious; never explain
  *what*.

---

## When you get stuck

- **Reproduce the failure cleanly.** If you can't make it fail consistently, you don't
  understand it yet.
- **Localise it.** Bisect. Disable half. Print at every boundary. Find the smallest input
  that breaks.
- Hard bug? Switch to `/ed-diagnose`.
- **3 attempts, slowing progress → stop and ask.** The plan may be wrong; don't dig deeper.

---

## Anti-patterns

- ❌ Executing a plan without reading the actual files it touches first
- ❌ Improvising a different plan silently when a task doesn't fit - report instead
- ❌ Marking a task `- [x]` without evidence its acceptance is met
- ❌ Doing three slices at once so nothing is independently verifiable
- ❌ "Type-check passes" presented as proof the feature works
- ❌ Guessing a library's API instead of checking the docs

---

## Done when

- Every plan task is `- [x]` with an evidence note (Mode A), or the ad-hoc ask is met (Mode B)
- Each slice showed evidence (test output, screenshot, response paste)
- The code reads like the code around it
- No abstractions beyond what the work needed

Then say: **"Work complete. Ready for `/ed-review`?"** (or `/ed-adversarial-review` if the
change is security- or data-sensitive).
