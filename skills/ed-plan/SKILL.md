---
name: ed-plan
description: "Turn a defined outcome into a source-grounded plan with dependency-ordered tasks, explicit acceptance criteria, evidence, and stop conditions. Use for work spanning multiple changes or sessions; a small direct edit belongs in /ed-work. Invoke as /ed-plan in Claude Code or $ed-plan in Codex. Hands off to /ed-work for direct execution or /ed-orchestrate for independent phase gates."
---

> Host syntax: `/skill-name` in Claude Code; `$skill-name` in Codex. Use the host spelling for handoffs.

# Plan

Make the next action decidable from an artifact. Research and design here; change production
code only when implementation is part of the user's request and the plan is ready.

## Phase 1: Establish intent and evidence

Read current user scope, repository instructions, relevant source, tests, and executable
configuration. Use a current /ed-repo-brief if available. Identify precedent, constraints,
blast radius, and the smallest behavior the user needs. Use read-only explorers for genuinely
independent research when available and authorized; a few relevant files do not need a team.

Resolve conflicting findings against source. Distinguish facts from assumptions and hypotheses.
Ask about an ambiguity only if different answers materially change the outcome; resolve routine
implementation choices from the repository. Record what evidence falsifies risky assumptions.

## Phase 2: Design and decompose

Describe entry points, data flow, ownership boundaries, interfaces, failure behavior, and any
migration or rollout. Prefer a vertical slice that demonstrates value at each step. Preserve
existing architecture unless the requested outcome requires changing it.

Give each task an ID, dependencies, bounded write set, deliverable, and observable acceptance.
Name the exact check and expected result, not just "run tests". Include required lint, format,
type, documentation, and runtime gates from this repository. Choose pragmatic verification
for decision artifacts and production verification for code intended to ship.

A task count or time estimate is guidance, not a reason to omit necessary work. Split when
scope cannot be verified independently; merge tasks whose supposed independence is artificial.

## Phase 3: Persist the contract

Use the user's plan location or `.plans/<YYYY-MM-DD>-<slug>.md`. Preserve existing ignore and
tracking policy; an ignored file stays local unless explicitly shared. Do not modify
`.gitignore` or instruction files merely to write a plan.

```markdown
# Plan - <goal>
**Created:** YYYY-MM-DD
**Status:** ready
**Execution:** direct | orchestrated
**Revision:** <plan revision>
**Repository:** <commit and relevant dirty/untracked state>

## Goal and non-goals
<Observable user outcome, scope boundaries, authorized external actions.>

## Research and design
<Source paths/symbols, key decisions, data flow, assumptions and how to test them.>

## Tasks
- [ ] **T1 - <verb-led task>**
      Depends on: none
      Touches: <owned files/areas>
      Artifact: <deliverable>
      Acceptance: <observable expected behavior>
      Verify: <profile, command + cwd / evidence, expected result>
      Stop: <scope conflict, missing prerequisite, finite correction budget>

## Integrated acceptance
<Checks proving the combined result satisfies the user outcome.>

## Risks and open decisions
<Unresolved consequential questions, not guessed requirements.>
```

For orchestration, include the attempt, concurrency, and elapsed-time limits; define accepted
dependency artifacts and worker ownership. /ed-orchestrate keeps per-attempt verdict records.
For direct work, /ed-work records actual evidence beside each completed task. Existing simple
plans with Acceptance, Touches and Depends on remain usable; fill missing material criteria
before execution instead of requiring a cosmetic schema migration.

## Phase 4: Check readiness and hand off

Walk the dependency graph: no cycles or missing IDs, no consumer before its producer, no
parallel ownership conflict. Each acceptance must be assessable without guessing intent.
If a consequential decision remains unresolved, mark the plan blocked and name the question.

A fresh session is optional when research has crowded the context; a written plan also supports
continuing in this session. Preserve current user steering over an older plan. If execution is
already requested, continue through the appropriate skill without asking again.

## Anti-patterns

- A generic task list that does not cite the actual code or define downstream acceptance.
- Requiring a fixed number of tasks, agents, or a fresh session for every change.
- Silently expanding scope or inventing a new architecture while decomposing.
- Calling an ignored plan portable without making it available to the next session.

## Done when

- The plan exists, scope and uncertainty are explicit, and dependencies are coherent.
- Every task and the integrated outcome has a concrete completion check.
- The next executor can start without redoing research or guessing material requirements.

Name the plan path and use /ed-work or /ed-orchestrate according to its execution mode.
