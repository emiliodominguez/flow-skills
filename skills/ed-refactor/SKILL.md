---
name: ed-refactor
description: "Improve code structure while preserving the defined observable behavior and public contracts. Use for extracting responsibilities, reducing coupling or simplifying ownership; intentional behavior changes belong in /ed-work. Invoke as /ed-refactor in Claude Code or $ed-refactor in Codex. Hands off to /ed-review or /ed-migrate for a repeated cross-file transformation."
---

> Host syntax: `/skill-name` in Claude Code; `$skill-name` in Codex. Use the host spelling for handoffs.

# Refactor

Change structure within an explicit behavior boundary. Preserve outputs, errors, ordering,
state lifetime and public compatibility unless the user also requests those behaviors change.

## Process

1. Define the structural problem, affected callers and observable contract. Read source,
   repository conventions and relevant tests before choosing an abstraction.
2. Establish a safety net proportional to the change: existing tests, characterisation tests,
   boundary fixtures, traces, or static/reference checks. A private rename may need no new
   test; a difficult I/O boundary may need a small harness. Do not extract a new architecture
   first merely to create the safety net that was supposed to protect the extraction.
3. Choose a small transformation that improves ownership or makes a module deeper without
   enlarging unnecessary public surface. Similar syntax is not always the same responsibility;
   semantic reasons matter more than a fixed number of duplicate call sites.
4. Apply reversible steps and compare behavior after each meaningful boundary change. Keep
   one writer per file/index. Parallel read-only inspection can help independent areas;
   parallel implementation requires disjoint ownership and integration checks.
5. Preserve API consumers, serialization, component identity, effect cleanup, module side
   effects and runtime guards at untrusted boundaries. A type annotation does not prove a
   runtime value is valid. Update generated output through its source/tooling.
6. Verify affected callers and required repository gates on the integrated result. Keep
   intentional behavior changes separate in the diff and explain them if already requested.

## Anti-patterns

- Turning a structural improvement into a new framework or domain architecture.
- Adding abstractions solely because code appears twice.
- Treating fewer lines or all-green unrelated tests as proof of preserved behavior.
- Scope creep into adjacent features or deleting user changes to get a clean worktree.

## Done when

- The structural problem improves and the stated behavior boundary remains supported by evidence.
- Affected consumers and repository gates are checked at the current revision.
- The change follows local conventions and stays within scope; single-writer ownership is clear.

Use /ed-review for the result or /ed-migrate when applying a proven transformation across sites.
