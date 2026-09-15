---
name: ed-test
description: "Design and execute tests around observable behavior, regressions, integration boundaries, or flakiness. Use when adding coverage, validating a change, or repairing unreliable tests; avoid tests that mirror trivial implementation. Invoke as /ed-test in Claude Code or $ed-test in Codex. Hands off to /ed-work for implementation or /ed-verify for an acceptance gate."
---

> Host syntax: `/skill-name` in Claude Code; `$skill-name` in Codex. Use the host spelling for handoffs.

# Test

Choose the lowest level that exercises the real failure mode. A test is useful when it
rejects an incorrect observable result and survives a valid implementation rewrite.

## Process

1. Read the requirement, changed code, test configuration, existing fixtures, and repository
   commands. Identify the contract, risk, and observation boundary before choosing a framework.
2. Use unit tests for pure logic, integration tests for real module/protocol boundaries, and
   end-to-end tests for critical user flows. Use browser-driven component tests when DOM,
   layout or interaction behavior is the risk. Do not impose a fixed pyramid or E2E quota.
3. For an unclear existing contract, write a characterization test and label what current
   behavior it preserves. Pin before you change, but do not freeze a known bug as intended
   behavior without discussing that distinction.
4. Give each test one reason to fail. Assert outputs, accessible behavior, effects or public
   contracts. Mock external boundaries intentionally; avoid mocking the code that the test
   claims to validate. Use realistic fixtures without credentials or production data.
5. Run the targeted tests and verify they are discovered. For a regression, demonstrate the
   relevant failure before the fix or use a safe negative control. Inspect why it fails;
   a broken import is not evidence of the bug. After the change, run required repository
   gates and affected integration checks.
6. Report exact commands, environment, discovered tests, results and remaining gaps. Coverage
   identifies unexercised code; it is not proof of correct assertions or complete behavior.

## Flakiness

Reproduce and isolate nondeterminism: shared state, clock/timezone, randomness, ordering,
network, concurrency, or resource cleanup. Use controlled clocks/seeds and observable waits
where appropriate; reset per-test state. Run enough targeted repetitions to evaluate the
specific suspected cause. Never add a blind retry to make red disappear. A temporary quarantine
needs an explicit owner/reason and remains visible as missing coverage.

For UI tests, prefer semantic locators and observable readiness over sleeps. Stabilize viewport,
fonts and data before visual comparison; still inspect meaningful visual differences.

## Anti-patterns

- Snapshotting huge output without an explicit contract or reviewing the diff.
- Testing that a heading or implementation string exists instead of behavior.
- Claiming tests pass without running the actual runner and checking discovery.
- Adding a dependency, retry policy or global coverage target without a demonstrated need.

## Done when

- Tests exercise the identified contract and fail for meaningful violations.
- Actual runner results are recorded, including unavailable or skipped checks.
- Any remaining flakiness or coverage gap has a concrete consequence and next action.

Continue with /ed-work when implementation is needed, or /ed-verify when the evidence must
satisfy a separate phase gate.
