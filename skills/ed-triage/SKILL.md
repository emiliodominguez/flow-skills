---
name: ed-triage
description: Triage an incident or issue fast — confirm it's real and reproducible, assess blast radius and severity, contain an active incident before hunting root cause, then decide fix-now vs. later and route to the right skill. Use for a new bug report, a production alert, or a pile of issues to prioritize (also /ed-triage, "is this a real problem", "how bad is this", "what should I do about this bug", "prod is down"). Routes to /ed-diagnose for root cause, /ed-work to fix, or /ed-adversarial-review when it's a security issue.
version: 0.1.0
---

# Triage

Triage is a routing decision, not a fix. Its job is to answer **is this real, how bad is it, and what happens next** — quickly and honestly — so effort lands where it matters. Getting root-cause-happy here is a trap: for an active incident, stopping the bleeding comes before understanding the wound.

---

## Phase 1: Confirm it's real

- Reproduce it, or find the evidence that it happened (logs, traces, a screenshot, error rates). An unreproduced, unevidenced report is *unconfirmed* — say so.
- Pin down the conditions: which users, which version, since when, what changed around then (a deploy? a data migration? traffic?).
- Rule out the non-bug: misconfiguration, expected behaviour, user error, an already-known issue. Don't spin up an investigation for a dupe.

---

## Phase 2: Assess blast radius and severity

Severity is **impact × reach**, not how alarming it looks.

- **Reach**: one user or all of them? one edge case or the main path?
- **Impact**: cosmetic, degraded, data-loss, security, money. Silent data corruption outranks a loud crash.
- **Trajectory**: stable, or getting worse each minute? A small-but-spreading problem is a big problem.
- Land on a severity you can defend in one sentence: *"data-loss on the checkout path for ~5% of users, growing."*

---

## Phase 3: Contain, if it's live

For an **active incident**, mitigate before you root-cause.

- Stop the bleeding: roll back the suspect deploy, feature-flag it off, throttle, fail over. A mitigated incident buys you time to diagnose calmly.
- Containment is not the fix — it's the tourniquet. Note that the root cause is still open.
- For a non-urgent issue, skip this phase.

---

## Phase 4: Decide and route

Decide **fix-now vs. later** from severity × effort, then route — don't fix it here.

- **Now**: high severity, or cheap enough that deferring costs more than doing it.
- **Later**: low impact, or high effort with a workaround — file it with the severity, repro, and evidence so it's actionable later, not re-triaged from scratch.
- **Route to the right skill**: `/ed-diagnose` when the cause is unknown and needs hunting; `/ed-work` when the fix is understood and spans slices; `/ed-adversarial-review` when it's security-, auth-, money-, or data-integrity-sensitive.

---

## Anti-patterns

- ❌ Diving into root-cause on a live incident before containing it
- ❌ Rating severity by how scary it looks instead of impact × reach
- ❌ Treating an unreproduced report as a confirmed bug
- ❌ Spending high-severity effort on a low-impact issue because it's easy
- ❌ Filing "later" work with no repro or severity, so it must be triaged again
- ❌ Fixing it inside triage instead of routing — triage decides, other skills do

---

## Done when

- The issue is confirmed real (reproduced or evidenced) or explicitly marked unconfirmed
- Severity is stated as impact × reach in one defensible sentence
- An active incident is contained, with the root cause noted as still open
- A fix-now-vs-later call is made and routed to the right skill, with repro + evidence attached

Then: hand off to `/ed-diagnose` to root-cause, `/ed-work` to fix a known cause, or `/ed-adversarial-review` for a security-sensitive issue.
