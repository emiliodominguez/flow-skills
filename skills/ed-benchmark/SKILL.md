---
name: ed-benchmark
description: "Measure a performance claim with a defined workload, timing boundary, reproducible baseline and uncertainty. Use before optimizing or to compare alternatives; measurements must reflect the actual cold, warm, latency or throughput question. Invoke as /ed-benchmark in Claude Code or $ed-benchmark in Codex. Feeds /ed-work or /ed-refactor with evidence."
---

> Host syntax: `/skill-name` in Claude Code; `$skill-name` in Codex. Use the host spelling for handoffs.

# Benchmark

Define what improves before measuring. Preserve raw results and compare like with like rather
than reporting a single attractive timing.

## Process

1. State the metric, workload, target and practical decision. Define the timed boundary and
   cache/process state: cold startup includes initialization; steady-state throughput may use
   warmup. Keep cold and warm experiments separate.
2. Record baseline revision, runtime/build settings, hardware/environment, fixtures, concurrency,
   sample unit and measurement tool/version. Include setup inside the timing only when it is
   part of the metric; do not warm away the behavior under investigation.
3. Run a representative baseline and candidate with controlled conditions. Change one relevant
   variable per experiment. Interleave comparable A/B samples when time drift matters, and
   isolate data/state between samples where necessary.
4. Collect enough observations for the claim. Report distribution and uncertainty: median,
   tail such as p95/p99 when sample size supports it, variance, outliers and known noise.
   Avoid false precision, unexplained outlier removal or tail claims from a handful of runs.
5. Inspect regressions and tradeoffs in memory, CPU, responsiveness, bundle size or complexity.
   Profile when the measured result needs an explanation. A smaller benchmark score is not
   automatically a better user experience.
6. Save the harness or command, raw samples and comparison so the next person can rerun it.
   State whether the improvement is large enough relative to noise to support the decision.

## Anti-patterns

- Warming a cold-start benchmark or excluding the initialization being investigated.
- Comparing development and production builds as if only the implementation changed.
- Reporting a single best run or p99 without a meaningful sample population.
- Claiming a causal explanation from timing alone.

## Done when

- Baseline and candidate use a relevant reproducible workload and timing boundary.
- Raw results, uncertainty and meaningful regressions are visible.
- The evidence supports an optimization decision or a specific need for better measurement.

Use /ed-work or /ed-refactor only for an optimization the evidence justifies.
