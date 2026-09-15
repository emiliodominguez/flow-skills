---
name: ed-review
description: "Review code changes for concrete correctness and maintainability problems, with severity, confidence, and falsifiable evidence. Scale independent reviewer lenses to the diff and verify disputed findings. Use before shipping or when asked to review; a bounded acceptance gate belongs in /ed-verify. Invoke as /ed-review in Claude Code or $ed-review in Codex. Routes to /ed-work for fixes, /ed-adversarial-review for deeper attack analysis, or /ed-ship for authorized delivery."
---

> Host syntax: `/skill-name` in Claude Code; `$skill-name` in Codex. Use the host spelling for handoffs.

# Review

Find defects a maintainer can act on. Review the user's requested scope and distinguish
confirmed bugs from plausible risks and refuted claims.

## Phase 1: Pin the change

Use the supplied PR/base/commit when available. Otherwise resolve the repository's default
branch and merge base from actual metadata; do not assume main or a remote name. Include
committed changes, the index, unstaged changes, and relevant untracked files as separate
layers. An unstaged edit can cancel a staged one in the final working tree while the staged
version is still what a commit publishes. Inspect both versions when they diverge.

If the request is a whole-repository audit, review that scope instead of returning "no diff".
Record the inspected revision, assumptions, and anything inaccessible.

## Phase 2: Choose the lenses

Correctness is the baseline. Add security for actual trust-boundary changes, architecture for
ownership/API changes, performance for hot paths, and readability/simplicity for maintenance
risk. A small change can use one reviewer; distinct personas or file shards help with large,
independent surfaces. Do not require an arbitrary panel size.

When authorized and available, delegate bounded read-only reviews in parallel with clear file
ownership and one findings schema. Reviewers may run isolated checks, but do not edit the
source under review. Without independent agents, perform an explicit single-reviewer pass
and report that limit rather than pretending role labels create independence.

## Findings schema

- Location: file, symbol/line, and inspected revision/layer.
- Lens and severity: blocking | should-fix | optional.
- Claim: the concrete defect or risk.
- Scenario: inputs/state that reach an incorrect outcome.
- Evidence: reproduction, source proof, or the unresolved premise.
- Correction: the smallest useful direction, not a demanded redesign.

Drop preferences with no practical consequence unless the user asks for style feedback.
Required formatter/linter failures are repository gates, not personal taste.

## Phase 3: Challenge findings

Deduplicate by defect and scenario, retaining distinct defects on the same line. Try to refute
candidate findings with caller contracts, guards, types, tests and actual reachability. Types
alone do not prove external JSON, storage, DOM, or network data satisfies a runtime invariant.

For consequential or disputed findings, use an independent verifier when available. Batch
related claims; do not create one agent per trivial observation. Classify:

- **CONFIRMED:** reproduced or proven reachable with a concrete wrong result.
- **PLAUSIBLE:** a specific risk remains, but necessary evidence is unavailable.
- **REFUTED:** a named guard, contract, or reproduction disproves the scenario.

Keep PLAUSIBLE findings explicitly uncertain; never silently promote them to confirmed or
drop them as refuted. Only a demonstrated blocker is presented as a confirmed blocking defect.
If uncertainty prevents a required gate from passing, report that gate as blocked.

## Phase 4: Report and close

Lead with actionable findings, ordered by severity, with file references and evidence. Include
checks performed, scope not checked, and any material uncertainty. "No findings" is valid;
it does not mean unrun tests pass or the entire system is certified.

If changes occur after review, assess the affected diff and invalidate relevant findings or
acceptance. Do not rerun unrelated reviews for presentation-only edits. In a coordinated run,
return findings to the owner and leave edits and retry state to that owner.

## Anti-patterns

- A fixed six-persona ceremony for a small diff.
- Reporting a suspicion as a proven defect, or hiding a plausible unresolved risk.
- Treating no findings as deployment permission or production verification.
- Reviewing only the final working tree when the staged artifact differs.

## Done when

- The requested scope is inspected with appropriate lenses and revision context.
- Findings are deduplicated, confidence-tagged, and supported by a falsifiable scenario.
- Checks and remaining uncertainty are explicit, with no invented findings to pad the report.

Route real fixes to /ed-work, deeper attack analysis to /ed-adversarial-review when needed,
and completed review to /ed-ship only within the user's delivery authorization.
