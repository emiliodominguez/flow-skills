---
name: ed-benchmark
description: "Measure before optimizing — define the metric and a representative workload, build a repeatable benchmark, capture a baseline, then change one thing at a time and report honest deltas with variance. Use before any performance work, to validate an optimization actually helped, or when someone claims something is \"slow\" without numbers (also /ed-benchmark, \"is this faster\", \"benchmark this\", \"measure the performance\"). Feeds the perf path of /ed-diagnose; hands off to /ed-work to implement a proven win. Invoke as /ed-benchmark in Claude Code or $ed-benchmark in Codex."
---

> Host syntax: invoke skills as `/skill-name` in Claude Code or `$skill-name` in Codex. Slash-form handoffs below use the Claude spelling; substitute `$` in Codex.

# Benchmark

Optimizing without measuring is guessing, and guesses make code uglier and slower about as often as faster. The rule under every phase: **a speedup is real only when a repeatable measurement shows it beats the baseline by more than the noise.**

---

## Phase 1: Define the metric and the workload

Decide what "fast" means *before* measuring.

- **Metric**: latency (which percentile — p50 hides the tail, p99 is what users feel), throughput, memory, allocations, cold vs. warm. Pick the one that matches the actual complaint.
- **Workload**: input that resembles production — realistic size, shape, and distribution. A benchmark on toy data optimizes for toy data.
- **Target**: what would make this worth doing? "20% off p99" is a goal; "faster" is not.

---

## Phase 2: Build a repeatable benchmark

A measurement you can't reproduce isn't evidence.

- Isolate the thing under test from setup/teardown so you time the work, not the fixture.
- **Warm up** (JIT, caches), then take **many runs** and report a distribution, not one number.
- Control the environment: quiet machine, fixed frequency where you can, no other load, same data each run. Note what you couldn't control.
- Make it one command. You'll run it dozens of times.

---

## Phase 3: Capture the baseline

- Run the benchmark on the **unchanged** code and record the numbers *with their variance* (e.g. `p99 = 42ms ± 3ms over 50 runs`).
- This is the number every change is measured against. Commit it or paste it somewhere durable — a baseline you have to re-derive is a baseline you'll fudge.

---

## Phase 4: Change one thing, measure the delta

- Change **one** variable. Re-run. Compare to baseline.
- A delta smaller than the combined variance is **noise, not a win** — don't bank it. Require the improvement to clear the error bars.
- Keep changes that clear the bar; **revert the ones that don't**, even if they "should" be faster. The measurement outranks the theory.
- Profile to find the *next* bottleneck rather than guessing — optimize what's actually hot.

---

## Phase 5: Report honestly

- State baseline → result with variance and run count, and the exact workload/environment.
- Report regressions and no-ops too, not just the win. "No measurable change" is a complete, useful result.
- Note the trade-off the speedup cost (readability, memory, complexity) so the reader can judge whether it was worth it.

---

## Anti-patterns

- ❌ Optimizing from intuition without a baseline measurement
- ❌ A single run instead of a distribution — you measured noise
- ❌ Claiming a win that's smaller than the run-to-run variance
- ❌ Benchmarking toy input that doesn't resemble the real workload
- ❌ Changing several things at once so you can't attribute the delta
- ❌ Keeping a "should be faster" change the numbers say didn't help

---

## Done when

- The metric, workload, and target were defined before measuring
- The benchmark is one command and produces a distribution, not a single number
- A baseline with variance is recorded
- Each kept change beats the baseline by more than the noise; the report includes variance, workload, and trade-offs

Then: hand a proven win to `/ed-work` to implement cleanly, or return to `/ed-diagnose` if the numbers point at a deeper root cause.
