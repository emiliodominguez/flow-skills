---
name: ed-plan
description: Research the codebase with parallel read-only agents, design the approach, then write a task-decomposed plan to ./.plans/<date>-<slug>.md so a FRESH session can execute it. Use when the design from /ed-brainstorm is clear and you need to figure out HOW (or when invoked as /ed-plan, or when the user says "make a plan", "break this down", "what's the approach"). Writes a plan file and hands off to /ed-work in a clean context.
---

# Plan

Between idea and code. Research what exists, decide the shape of the change, chop it into
shippable tasks — then **write the plan to a file** so the work runs in a fresh, clean
context instead of a window already crowded with research.

**No implementation code in this phase.** Sketches and pseudocode are fine; real edits to
project files are not. The one file you DO write is the plan itself.

**Why a file + fresh session?** Planning is research-heavy and fills the context window
with exploration you won't need while coding. Executing from a written plan in a new
session is cheaper (warm cache, less to re-read), cleaner (no stale detours), and
reproducible (anyone can pick up the file).

---

## Phase 1: Research — fan out, read-only (15–30 min max)

Before designing anything, find out what the codebase already gives you. **Always first** —
it kills bad plans before they cost time. Run these as **parallel subagents in one
message** (Agent tool, `type: Explore` or `general-purpose` — read-only, they never edit).
Give each a narrow angle:

1. **Precedent** — has the team solved something similar nearby? Where? Match that style.
2. **Constraints** — build system, lint rules, framework gotchas, perf budgets, the
   testing setup. What will fight this change?
3. **Blast radius** — who calls / imports / depends on anything this change touches? What
   breaks if the interface moves?
4. **Prior art in tests** — how is this area tested today? What's the contract as the
   tests see it?

Each subagent returns a tight findings list (paths + line refs, not prose essays). You
synthesize into a **3–6 line "what I found" summary** and **surface anything that
invalidates the brainstorm** loudly — a wrong premise here is worth more than a whole plan.

For a tiny change, skip the fan-out and read the 2–3 relevant files yourself. Match effort
to risk.

---

## Phase 2: Design the change

Now decide HOW. Cover, in prose + sketches (10–30 lines, a whiteboard in markdown):

- **Entry point** — what file/function does the change start in?
- **Data flow** — what moves through the system, in what shape?
- **Module boundaries** — what stays in A vs lives in B? If unclear, keep it where it is.
- **Public interface** — what new/changed functions, types, endpoints exist after?
- **Migration story** — if callers in the wild depend on what you're changing, how do they
  transition? (expand → migrate → contract)
- **Failure modes** — what can go wrong, what's the contract on failure?

**Push back if research surfaced a simpler approach than the brainstorm landed on.** The
brainstorm sketch is a starting point, not a contract.

---

## Phase 3: Decompose into tasks

Each task is:

- **Independently verifiable** — a concrete "done" check (test passes, output is X, error
  is gone).
- **Small enough to ship in one PR** — 15 min to a few hours.
- **Dependency-ordered** — if B uses what A built, A comes first.
- **A vertical slice when possible** — all the layers for ONE working capability, not "all
  the DB, then all the API, then all the UI".

3–8 tasks is healthy. At 12+, the design is too big — go back to brainstorm and shrink
scope.

---

## Phase 4: Write the plan file

Write the plan to `./.plans/<YYYY-MM-DD>-<slug>.md` (slug derived from the goal, e.g.
`2026-07-11-add-oauth-login.md`).

**Keep plans out of git:**
- If a `.gitignore` exists and doesn't already ignore `.plans/`, append a `.plans/` line.
- If there's no `.gitignore`, create one with `.plans/`.
- If the project isn't a git repo at all, just write the file and note it in your reply.

Use this exact schema so `/ed-work` can read it cold:

```markdown
# Plan — <one-line goal>

**Created:** YYYY-MM-DD
**Status:** ready
**Design source:** <brainstorm summary / issue link / "ad-hoc">

## Goal
<2–3 sentences. What "done" looks like for the whole plan.>

## Research findings
<3–6 bullets. Precedent, constraints, blast radius, anything that changed the approach.>

## Design
<10–30 lines: entry point, data flow, module boundaries, public interface,
migration story, failure modes. Prose + sketches, no implementation code.>

## Tasks
- [ ] **T1 — <verb-led title>**
      Acceptance: <observable done-check>
      Touches: <files/areas>
      Depends on: <none | T#>
- [ ] **T2 — ...**

## Open questions / risks
<what's still undecided, what could go wrong>
```

`/ed-work` flips `- [ ]` → `- [x]` in this file as each task's acceptance is proven, so the
file stays an accurate live checklist across sessions.

---

## Anti-patterns

- ❌ Writing the plan without reading the code first
- ❌ Tasks like "implement the feature" — that's the whole thing, not a task
- ❌ Horizontal slicing ("Phase 1: database, Phase 2: API") — nothing ships until the end
- ❌ Forgetting the migration story when changing a public interface
- ❌ Designing the perfect end state with no working intermediate state
- ❌ Leaving the plan only in chat — write the file, or the fresh-context handoff can't work
- ❌ Committing `.plans/` — it's scratch, keep it git-ignored

---

## Done when

- Parallel research findings are synthesized and written into the plan
- Design fits in <50 lines, and any brainstorm-invalidating surprise was surfaced
- Tasks are ordered, sized, and have acceptance criteria
- The plan file exists at `./.plans/<date>-<slug>.md` and `.plans/` is git-ignored
- You can name what could still go wrong and what's not yet decided

Then print the path and say:
**"Plan written to `.plans/<file>`. Start a fresh session (or `/clear`) and run
`/ed-work .plans/<file>` to execute it in a clean context."**
