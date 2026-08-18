---
name: ed-adversarial-review
description: "Red-team a change before it ships - fan out attacker personas (exploit developer, chaos engineer, malicious user, boundary breaker, data-integrity auditor, time bomb) that each try to BREAK the code or HURT the user, then a verification pass keeps only breaks that are actually reachable in the real code. Use for anything security-, money-, data-, auth-, or concurrency-sensitive, after /ed-review, or when invoked as /ed-adversarial-review (also \"red team this\", \"how could this break\", \"attack this\", \"poke holes in the code\", \"what could go wrong in prod\"). Complements /ed-review (which asks \"is it correct?\"); this asks \"how do I break it?\". Hands off to /ed-work to fix, then re-run. Invoke as /ed-adversarial-review in Claude Code or $ed-adversarial-review in Codex."
---

> Host syntax: invoke skills as `/skill-name` in Claude Code or `$skill-name` in Codex. Slash-form handoffs below use the Claude spelling; substitute `$` in Codex.

# Adversarial Review

`/ed-review` asks *"is this correct and maintainable?"* This skill asks a different,
nastier question: **"how do I break this, and how does it hurt the user?"** You stop being
the author and become the attacker. Every persona's goal is a concrete failure - an input,
a sequence, a race - that produces a bad outcome.

Run this on anything that touches: auth, money, user data, migrations, external input,
concurrency, file/network I/O, or anything irreversible. It's heavier than `/ed-review` -
use it where the blast radius justifies it.

**Scope by default:** every committed and working-tree change since the merge base with the
repository's default branch, including staged, unstaged, and untracked files. Resolve the
default branch from repository metadata instead of assuming `main`. Override on request.
Also read enough of the *surrounding* code to know what the change can actually reach - an
attack is only real if it's reachable.

---

## Step 1: Map the attack surface

Before attacking, sketch what the change exposes (do this yourself from the diff):

- **Entry points** - new/changed endpoints, CLI args, message handlers, file readers,
  env/config reads. Anywhere untrusted data enters.
- **Sensitive sinks** - db writes, shell/exec, filesystem, network calls, auth decisions,
  money/state mutations, anything that logs.
- **Trust boundaries** - where does "outside" data cross into "trusted" code, and what
  validates it on the way?
- **Invariants** - what must always be true (balance ≥ 0, one owner per record, idempotent
  retry)? These are the things to try to violate.

**If there's no entry point, sensitive sink, or invariant to violate** - a docs-only, CSS,
or pure-refactor diff - say so and **stop**: this is the wrong tool, `/ed-review` suffices.
Attacking a change with no surface only manufactures the theoretical findings this skill
forbids.

---

## Step 2: Fan out the attacker personas (parallel, read-only)

Launch the personas as **parallel subagents in one batch** using the host's delegation
mechanism. Run them **read-only** and keep all writes in the orchestrator. If the host has
no subagent support, run the personas sequentially; otherwise batch them within available
concurrency. Scale the set to the change; always run at least Exploit Developer + Boundary
Breaker. Each returns concrete **break scenarios** in the schema below - not "this could
be unsafe", but "*this input → this bad outcome*".

1. **Exploit Developer.** Injection (SQL / command / template / path traversal), auth
   bypass, IDOR / missing object-level authz, SSRF, unsafe deserialization, secret
   leakage into logs/errors/responses, TOCTOU. "What request gives me data or power I
   shouldn't have?"
2. **Chaos Engineer.** Failure injection: network drops mid-call, timeout, partial write,
   process crash *between* two writes, disk full, dependency 500s, retry storms,
   non-idempotent retries double-applying. "What breaks when the environment misbehaves?"
3. **Malicious User.** Abuse & exhaustion: unbounded/pathological input, giant payloads,
   rate-limit bypass, privilege escalation, scraping, cost amplification (a cheap request
   that triggers expensive work). "How do I abuse this at scale?"
4. **Boundary Breaker.** Zero / empty / null / negative / max / off-by-one, unicode &
   emoji & RTL, extremely long strings, concurrent callers hitting the same row, clock
   skew, timezone/DST, floating-point rounding. "What input is the code not expecting?"
5. **Data Integrity Auditor.** Corruption & loss: non-atomic multi-step writes with no
   transaction, lost updates under concurrency, ordering assumptions, an unsafe or
   irreversible migration, cache/db divergence. "How do I leave data wrong or gone?"
6. **Time Bomb / Future Maintainer.** Latent rot: hardcoded dates/limits/IDs, unbounded
   growth (a table/list/log that never prunes), feature-flag debt, `TODO` landmines,
   deprecated APIs that break on the next upgrade. "What ships fine today and detonates
   later?"

### Break scenario schema (every attacker returns this)

```
- persona        which attacker
- target         file:line the attack lands on
- severity       critical | high | medium | low
- attack         the concrete input / sequence / condition
- outcome        the bad result (data leaked, corrupted, DoS, wrong authz, crash)
- exploitability Demonstrated (traced a concrete path) | Theoretical (plausible, not traced)
```

---

## Step 3: Verify - is the break actually reachable?

Attackers over-claim. For each scenario, use an independent **verifier subagent** (parallel
and read-only when the host supports it; sequential otherwise) that must confirm the attack
is reachable **in this code**. Verify every scenario for a small list; batch by file or
persona for a large one while respecting available concurrency.

> *"Here is a claimed break: <attack → outcome>. Trace the actual code path. Is there a
> guard, validation, type, framework default, or auth check that already stops it? Verdict:
> **REFUTED** only if you can NAME the blocker, or the attack needs code not present here
> (out-of-scope); **CONFIRMED** if you can name a reachable path; otherwise **PLAUSIBLE** -
> no named blocker, but the trace is incomplete. Do NOT drop to REFUTED just because the
> path is hard to trace: in a red-team pass a missed exploit is the expensive error, so an
> unblocked-but-untraced attack stays PLAUSIBLE."*

### Verdict schema

```
- verdict   CONFIRMED (reachable path named) | PLAUSIBLE (likely reachable, gap in trace) | REFUTED
- reason    the reachable path, the residual doubt, or what already blocks it
```

Keep `CONFIRMED` + `PLAUSIBLE`. Drop `REFUTED`, but list a one-liner for the notable ones
under "attacks that don't land" so the user sees the surface was checked, not skipped.

---

## Step 4: Report

```
## Critical - fix before ship
- [file:line] (persona · CONFIRMED · Demonstrated) attack → outcome
      Fix: <concrete direction>

## High
- [file:line] (persona · CONFIRMED|PLAUSIBLE) attack → outcome - fix

## Medium / Low
- [file:line] (persona) attack → outcome - fix

## Attacks that don't land   (proof the surface was checked)
- [file:line] attack - why it's already blocked

## Residual risk
- <what this pass did NOT cover - modality not run, code paths out of scope>
```

Order by `severity` then `exploitability` (Demonstrated before Theoretical). Every Critical
and High gets a concrete fix. **Name what you did not cover** - silent gaps read as "all
clear" when they aren't.

---

## Anti-patterns

- ❌ Reporting a vulnerability for code that isn't in the diff or reachable from it
- ❌ "This could theoretically be unsafe" with no attack input and no traced path
- ❌ Stopping at "found injection" without the concrete payload and the sink it reaches
- ❌ Skipping verification - unverified attacker output is mostly false positives
- ❌ A clean report with no "residual risk" section - you always missed *something*; say what
- ❌ Duplicating `/ed-review`'s correctness/readability findings - this pass is about breaking, not polishing

---

## Done when

- Attack surface is mapped; at least Exploit Developer + Boundary Breaker ran
- Every break scenario went through reachability verification
- Report is severity-ordered, confidence- and exploitability-tagged
- Residual risk (what wasn't covered) is stated explicitly

Then either:
- Critical/High confirmed? Fix with `/ed-work`, then **re-run this skill** to confirm the hole is closed.
- Clean? Say **"No reachable breaks found; residual risk noted. Ready for `/ed-ship`?"**
