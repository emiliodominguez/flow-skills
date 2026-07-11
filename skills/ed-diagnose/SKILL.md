---
name: ed-diagnose
description: Root-cause a bug or performance regression through a disciplined loop — reproduce, minimise, hypothesise, instrument, fix, then add a regression test. Use when something is broken, throwing, failing, slow, or behaving unexpectedly (or when invoked as /ed-diagnose, when the user says "debug this", "why isn't this working", "it's broken", "investigate"). Hands off to /ed-work to fix once the root cause is known, then back here to verify.
---

# Diagnose

For bugs that don't yield to a quick fix. The discipline below stops you from guessing your way deeper into the problem. The one rule underneath all six phases: **a cause is confirmed by evidence that matches a prediction — never by "seems likely".**

**Do NOT skip phases.** When you feel you "already know" the answer, that's exactly when you skip step 1 and waste an hour fixing the wrong thing.

---

## Phase 1: Reproduce reliably

You don't understand a bug you can't reproduce.

- Get a single command, click sequence, or input that **always** triggers it.
- Note the environment (OS, browser, node version, env vars, data).
- If it's intermittent, find the conditions that change failure rate — concurrency, time of day, dataset size, cache state.
- **Write down the steps.** You'll need them again in Phase 6.

If you cannot reproduce, stop and gather more data. Logs from the user, a recording, a packet capture. Do not move on.

---

## Phase 2: Minimise

Shrink the failing case until removing one more thing makes it stop failing.

- Delete unrelated code paths.
- Cut down the input.
- Stub out dependencies one by one.
- Isolate to the smallest function/component/query that still breaks.

The minimal case usually points at the cause.

---

## Phase 3: Hypothesise

State an explicit, falsifiable hypothesis:

> *"The bug is X. I expect Y to be true if X is correct. If Y is false, X is wrong."*

Hold it lightly. Strong hypotheses are wrong faster, which is good.

Rank candidate causes by likelihood and ease-of-test. Test the easiest one first.

### When it's murky: fan out competing hypotheses (optional)

**Match effort to difficulty.** For a simple or obvious bug, stay single-threaded — one hypothesis, test it, move on. Fanning out here would be ceremony, not speed.

But when the bug is genuinely murky and you have **several plausible, competing causes** (e.g. "it's a stale cache" vs. "it's a race in the writer" vs. "it's a serialization boundary"), you MAY investigate them in parallel instead of serially:

1. **One agent per competing hypothesis.** Launch them as **parallel read-only subagents in one message** (Agent tool, `type: Explore` or `general-purpose` — **read-only, they never edit, they never fix**). Assign each agent exactly one candidate cause.
2. **Each agent's job is evidence, not verdicts.** Give it the reproduction, the minimal case, and its assigned hypothesis. It reads the relevant code and gathers evidence **FOR and AGAINST** that cause — the guard that would prevent it, the call path that would trigger it, the state that would have to hold — and reports back what it found.
3. **You pick the survivor.** Collect the reports. Discard the causes the evidence argues against. The hypothesis left standing — the one nothing refuted and something supports — is the one you carry into Phase 4 to **prove**. A parallel sweep narrows the field fast; it does not confirm anything on its own.

This is optional acceleration, not mandatory ceremony. It replaces serial guessing with a parallel narrowing pass — the actual confirmation still happens in Phase 4, against instrumentation.

---

## Phase 4: Instrument

Add observation, not fixes. Yet.

- Log values at every boundary between your hypothesis and the failure.
- Add asserts on invariants you assume hold.
- Use a debugger for stepwise inspection if the state is complex.
- For perf: profile, capture traces, measure — never guess what's slow.

Re-run the reproduction. Read what the instrumentation says. Compare it to the prediction your hypothesis made in Phase 3.

**This is the evidence gate.** A hypothesis is confirmed only when the instrumentation output **matches its prediction** — the value you expected to be null is null, the branch you expected to run ran, the query you blamed is the one that's slow. "It seems likely" and "that would explain it" are not confirmation.

If reality matches the prediction → you've found it.
If not → the hypothesis is wrong, no matter how plausible it felt. Back to Phase 3 with what you learned.

---

## Phase 5: Fix at the right level

Now you may change code. Make the **smallest fix that addresses the root cause**, not a symptom.

- A null-check that silences the error is usually a band-aid. Why was the value null?
- A `try/catch` that swallows the failure hides it. Why did it throw?
- A retry that masks the race condition leaves the race. What is the race?

When tempted by a band-aid: write down what the right fix would be, even if you don't ship it now. Don't pretend the band-aid is the answer.

---

## Phase 6: Regression test

Lock the fix in.

- Write a test that **fails on the broken version** and **passes on the fixed version**.
- The test should target the behaviour, not the implementation. If you refactor the fix, the test should still pass.
- Run the full suite. Confirm nothing else broke.

If you can't write a regression test for this class of bug, name what's missing in the test infrastructure as a follow-up.

---

## Anti-patterns

- ❌ "Let me try adding a null check" before you know what's null and why
- ❌ Calling a hypothesis confirmed because it's plausible, without instrumentation that matches its prediction
- ❌ Fanning out parallel hypothesis agents for a simple bug — that's ceremony, not speed
- ❌ Letting a hypothesis subagent edit or "fix" code — they gather evidence, read-only
- ❌ Fixing the first thing that makes the symptom go away
- ❌ Adding logs and then forgetting to read them
- ❌ "It works on my machine" — that's a data point, not a conclusion
- ❌ Shipping the fix without a regression test

---

## Done when

- The reproduction case is documented
- The root cause is named in one sentence, backed by instrumentation that matched its prediction
- The fix is minimal and addresses the cause, not a symptom
- A regression test fails before the fix and passes after

Then: pick up `/ed-work` if the fix needs more than one slice, or go straight to `/ed-review`.
