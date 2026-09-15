---
name: ed-onboard
description: "Map an unfamiliar repository by discovering its commands, tracing one real flow, and identifying ownership, conventions and constraints. Use for an initial codebase tour; use /ed-repo-brief for maintained task-specific knowledge. Invoke as /ed-onboard in Claude Code or $ed-onboard in Codex. Hands off to /ed-plan, /ed-diagnose, or /ed-repo-brief."
---

> Host syntax: `/skill-name` in Claude Code; `$skill-name` in Codex. Use the host spelling for handoffs.

# Onboard

Build enough of a map to place the next change confidently. Explore breadth-first, then go
deep on a representative flow instead of reading every file.

## Process

1. Read applicable instructions, README, manifests, lockfiles and CI. Identify how to build,
   run, test and lint, and the actual entry points. Inspect scripts before running them so
   database resets, installations or external actions are not mistaken for read-only checks.
2. Run relevant permitted commands when the environment supports them. Record verified,
   failed, and unrun commands separately, with reasons. Missing credentials do not prevent a
   useful source-based map, but they limit what runtime claims are supported.
3. Trace one real flow end to end: entry, routing, domain logic, storage/integration and result.
   Cite the files and symbols at each boundary. Do not infer architecture from directory names.
4. For a large repository, assign independent read-only subsystem explorers when authorized
   and available. Ask for purpose, important files/types, connections and landmines in a common
   compact shape. A small repository does not need a fan-out.
5. Distil the map to the files the next task actually needs, with conventions, invariants,
   ownership and unresolved questions. Separate enforced rules from observed precedent.
6. Write the map in the user's location or the repository's existing knowledge convention.
   Use /ed-repo-brief when it needs citations, freshness tracking and reuse across sessions.

## Anti-patterns

- Calling source-based understanding runtime verification.
- Automatically executing setup scripts that mutate external services.
- Listing every file instead of tracing useful boundaries and decisions.
- Blocking the entire map because one environment-dependent command cannot run.

## Done when

- The main commands and their verification status are known.
- One real flow and its ownership boundaries are mapped with source locations.
- The next task's relevant conventions, landmines and uncertainty are captured.

Continue with /ed-plan, /ed-diagnose for a specific bug, or /ed-repo-brief for maintained context.
