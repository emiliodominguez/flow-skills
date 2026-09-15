---
name: ed-adversarial-review
description: "Evaluate concrete attack paths and failure modes in a specified change or system, tracing entry points through trust boundaries to reachable impact. Use when an adversarial review is requested or a consequential trust-boundary change needs deeper verification. Invoke as /ed-adversarial-review in Claude Code or $ed-adversarial-review in Codex. Hands off to /ed-work for authorized fixes or /ed-review for broader maintainability review."
---

> Host syntax: `/skill-name` in Claude Code; `$skill-name` in Codex. Use the host spelling for handoffs.

# Adversarial review

Try to disprove the system's important invariants with concrete inputs and state. Findings
need a reachable path or an explicit evidence gap; a clean report is allowed.

## Phase 1: Bound the target

Read the requested scope, repository instructions, architecture and diff. Include committed,
staged, unstaged and relevant untracked artifacts separately when reviewing changes. Record
the exact revision, available test environment and intended invariants.

Map the attack surface: entry points, untrusted data, transformations, authorization decisions,
sinks and persistence. Identify who controls each input and what must remain true. Use local
fixtures or an authorized environment for reproductions; a review request does not imply
permission to run destructive traffic against a live system.

## Phase 2: Select useful adversarial lenses

Choose lenses for actual risks rather than a fixed panel:

- **Exploit developer:** input reaches an unsafe interpreter, file path, renderer or command.
- **Boundary breaker:** one actor accesses another actor's resource or crosses an isolation rule.
- **Data-integrity auditor:** concurrent writes, retries or partial failure violate invariants.
- **Chaos engineer:** lost connections, unavailable dependencies and interruption break recovery.
- **Malicious user:** legal UI/API operations combine into an unauthorized result.
- **Time bomb:** expiration, growth, resource limits or stale state changes behavior over time.

Use independent read-only agents when available, authorized and useful. Give each a bounded
surface and common findings schema; one reviewer can cover a small surface. No persona label
creates independence or grants extra testing permissions.

## Phase 3: Trace and challenge each finding

Record location/revision, preconditions, attacker-controlled input, exact sequence, affected
invariant, impact, and smallest correction. Reproduce safely when possible. Follow the path
through guards and caller contracts instead of stopping at a suspicious function name.

Challenge candidates with an independent verifier for consequential or disputed claims:

- CONFIRMED: the impact is reproduced or the reachable path is demonstrated.
- PLAUSIBLE: a specific path is argued but required evidence is missing; name that gap.
- REFUTED: a concrete control or reproduction makes the scenario impossible.

Keep severity separate from confidence. Retain useful plausible risks with uncertainty and
drop refuted claims. A type assertion, comment, or worker report does not establish a runtime
trust guarantee for network, storage, DOM or external input.

## Phase 4: Report

Deduplicate by failure path. Lead with confirmed actionable findings, then material unresolved
risks and unchecked scope. Give evidence and remediation direction. State residual risk from
actual coverage limits; do not invent a vulnerability just to fill a section.

Review-only work stops at findings. If fixes are already requested, delegate or implement them
within scope and recheck the affected paths on the new revision. Do not quietly repair an
artifact while presenting yourself as its independent verifier.

## Anti-patterns

- Generic vulnerability lists without an input-to-impact trace.
- Calling a missing reproduction REFUTED, or a suspicion CONFIRMED.
- Requiring a full red-team panel for every filesystem or input-related edit.
- Claiming a system is secure because a scoped review has no findings.

## Done when

- Relevant invariants and boundaries are assessed at the recorded revision.
- Findings distinguish reproduced impact, unresolved evidence and disproven paths.
- Residual risk and coverage limits are stated without padding or implied certification.

Return the findings; use /ed-work for fixes only when authorized, or /ed-review for a wider
code-quality review.
