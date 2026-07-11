# The ed-* skill suite

A connected workflow. Each skill does one job and hands off to the next.

```
ed-brainstorm ──idea → sharp design──┐
ed-prototype  ──throwaway answer──────┤
                                      ▼
ed-plan ──parallel research + design → writes .plans/<date>-<slug>.md
   │
   │   ⟢ start a FRESH session (plan is on disk)
   ▼
ed-work ──executes the plan task-by-task in clean context
   │
   ▼
ed-review ───────── multi-persona review + adversarial verification
ed-adversarial-review ─ red-team: try to BREAK it / hurt the user
   │
   ▼
ed-simplify ──de-slop      ed-refactor ──structure-only
   │
   ▼
ed-ship ──commits + PR──► ed-pr-fix ──► ed-git-fix (when git snags)

support: ed-diagnose · ed-handoff · ed-styles · ed-animate · ed-prune-claude-setup
```

## The seven practices threaded through the suite

1. **Distinct personas, not clones.** N agents with different mental models catch failure
   modes that N identical agents never will.
2. **Adversarial verification.** Every finding is handed to an independent agent whose job
   is to _refute_ it. Only survivors are reported, tagged `CONFIRMED` / `PLAUSIBLE`.
3. **Structured findings.** Reviewers return one fixed shape (`file:line · severity ·
claim · scenario · fix`) so results dedup and rank deterministically.
4. **Plan / execute separation.** Write the plan to disk; execute it in a fresh session.
   Cheaper (warm cache), cleaner (no stale exploration), reproducible.
5. **Read-only reviewers, one writer.** Review/research agents can't edit; only the
   orchestrator writes. No parallel-edit corruption.
6. **Evidence gates.** "Done" needs observable proof — a test, a reproduced break, a
   screenshot. A green typecheck is never, alone, evidence a feature works.
7. **Severity + confidence, no padding.** Triaged, tagged, and honest. "No blockers" is a
   complete result; nothing is invented to look thorough.

## How a multi-agent review runs

`ed-review` and `ed-adversarial-review` share one shape:

1. **Scope** the diff (`git diff main...HEAD` by default).
2. **Fan out** distinct persona agents in parallel (read-only). ed-review lenses:
   correctness, readability, architecture, security, performance, simplicity.
   ed-adversarial-review attackers: exploit developer, chaos engineer, malicious user,
   boundary breaker, data-integrity auditor, time bomb.
3. **Merge** — dedup by `file:line`.
4. **Verify** — an independent agent tries to refute each finding (ed-review) or confirm
   each attack is reachable (ed-adversarial-review). Default to refuted when unsure.
5. **Report** — triaged, deduped, confidence-tagged, with a concrete fix per item.

`ed-review` asks _"is it correct and maintainable?"_; `ed-adversarial-review` asks _"how do
I break it?"_. Run the latter on anything touching auth, money, data, migrations, or
concurrency.
