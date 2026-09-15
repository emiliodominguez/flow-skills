---
name: ed-repo-brief
description: "Build or refresh a compact, source-cited repository knowledge base for a specific change or subsystem. Use when agents repeatedly rediscover conventions, an investigation spans sessions, or an existing brief may be stale; use /ed-onboard for an initial general tour. Invoke as /ed-repo-brief in Claude Code or $ed-repo-brief in Codex. Feeds /ed-plan and /ed-specialize with verified constraints and unresolved assumptions."
---

> Host syntax: `/skill-name` in Claude Code; `$skill-name` in Codex. Use the host spelling for handoffs.

# Repository brief

Capture the facts that change implementation decisions, with sources another agent can
reopen. A repository brief is maintained evidence, not an authority above user instructions
or the repository's own rules.

## Phase 1: Bound the question

Identify the requested task or subsystem and the next consumer. Read applicable AGENTS.md /
CLAUDE.md, manifests, lockfiles, lint/format configuration, CI, and representative nearby code.
Trace one relevant flow before describing architecture. Use /ed-onboard when a broad tour is
needed first; do not scan the whole repository for a narrow change.

Use an existing knowledge location if the user supplies one. Otherwise write
`.plans/context/<topic>.md`. Preserve tracked/ignored status and explain when an ignored
file is local-only. Do not change global instructions, ignore rules, or install a skill as
a side effect of producing a brief.

## Phase 2: Separate fact from inference

For each load-bearing claim, cite a repository path plus a symbol or line range at the
recorded revision. Include command output when the claim is operational. Capture:

- Repository identity, branch, commit, date, scope, and relevant dirty/untracked files.
- Constraint provenance: explicit instruction, executable configuration, repeated precedent,
  or inference. Do not promote a single example into a universal rule.
- Entry points, ownership boundaries, key types/contracts, and one real data flow.
- Exact build/test/lint commands and working directories. Mark each `run`, `observed in
  config`, or `unavailable`; record actual outcomes without claiming unrun commands pass.
- Reusable patterns, exceptions, failure modes, and areas the task must not change.
- Assumptions and hypotheses, each with evidence that would confirm or falsify it.

Secrets and private payloads do not belong in a knowledge artifact. Record variable names
and required access, not credential values. Prefer primary documentation or pinned source
when an external API fact is uncertain; record the version and date checked.

## Phase 3: Write for selective reading

Keep the brief small enough for its consumer to use directly. Use a table for claims:

| Claim | Kind | Source at revision | Confidence / unresolved evidence |
| --- | --- | --- | --- |
| Function declarations and four-column tabs | config or instruction | actual file and key | confirmed or unknown |

Add sections for scope, architecture, commands, conventions, hypotheses, and refresh triggers
only when they carry task-relevant information. Split substantial subsystem detail into
linked sibling files; keep an index of what to read for each task. Avoid copied source files,
transcripts, file listings, and generic framework tutorials.

## Phase 4: Refresh and verify

Reopen the sources for claims the next task relies on. Compare current instructions,
configuration, relevant source, and dependency versions with the brief's recorded inputs.
A new commit outside its scope need not invalidate everything; changed cited inputs do.
Mark unsupported claims stale and update only affected sections. Keep uncertainty explicit
when access is unavailable. Never infer that old evidence remains valid from a date alone.

For consequential decisions, have an independent pragmatic verifier check the claims and
hypotheses using /ed-verify. Missing verification stays visible; a useful partial brief does
not certify an implementation.

## Anti-patterns

- Writing "uses DDD" or "all IDs are opaque" without actual types and boundary evidence.
- Copying preferences from another repository over the current repository's conventions.
- Calling a command verified when it was only found in package.json.
- Treating a stale brief as permission to ignore live source or user scope.

## Done when

- The next worker can find the relevant code, conventions, commands, and unresolved questions.
- Load-bearing claims have source citations and a current or explicitly stale status.
- The artifact path and refresh conditions are recorded.

Hand off to /ed-plan for task decomposition or /ed-specialize for a repository-specific worker.
