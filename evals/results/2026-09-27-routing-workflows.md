# Held-out routing and conversation decisions

Runs used the signed-in CLI backend, CLI 2.1.283 and Node 26.5.0 on macOS, without model
overrides. A separate live startup probe reported `claude-opus-5-5`, zero tools and zero MCP
servers with the final answer-only configuration. Assertions remained private to fresh assessor
calls. No skill descriptions, skill bodies or evaluation prompts were tuned after these runs.

## Routing

The frozen set contains 74 prompts: one positive and one near miss for each of 37 skills.
It has no case/whitespace-normalized duplicates within itself or against the 259 development
prompts. Its SHA-256 is
`9fa1b6d7003d2834487e5e97e4be681bb9c44eecf5dad25128c91235bcac7685`.

The first run passed **74/74**. After tightening routing-response parsing and explicitly
disabling ambient MCP tools, hooks and memory, an unchanged-set rerun also passed **74/74**.
Each run used one pick per prompt. A filtered development run for `flow-release` passed **7/7**
before those runner corrections. Raw reports are local at `.eval-runs/heldout-first.json`,
`.eval-runs/heldout-isolated.json` and `.eval-runs/release-dev-new-runner.json`.

This public, author-maintained validation set is small. Two observed runs on one configured
backend are not an independent blind benchmark or evidence of general routing accuracy.

## Conversation decisions

The final runner passed all three conversations, comprising eight graded turns:

| Case                  | Turns | Observed decisions                                                                                                           |
| --------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------- |
| plan-work-review-push | 4     | Selected the appropriate skill at each stage and preserved the plan-only, uncommitted, review-only and push-only boundaries. |
| user-revokes-delivery | 2     | Continued the regression test under the corrected local, uncommitted scope.                                                  |
| missing-review-skill  | 2     | Proposed review using available capabilities without requiring the absent skill.                                             |

Raw exchanges, individual graded turns and results are local at
`.eval-runs/workflows-isolated`. These are written next-action decisions. User messages supply
the intermediate milestones; no implementation, review command or push actually executes.

The earlier integration run at `.eval-runs/workflows-first` failed one planning assertion:
the answer promised acceptance criteria but did not state observable JSON-output criteria.
The remaining seven turns passed. The final rerun passed without changing that assertion or
skill instructions, so the earlier failure remains evidence of variability, not a fixed skill
defect. Neither run measures benefit against a without-skill baseline.

## Harness verification

Review reproduced acceptance of contradictory routing objects and loss of earlier graded
results after a later-turn error. Both are fixed and covered by regression tests. The shared
answer-only backend now disables all MCP tools explicitly, plus hooks, memory, browser
integration and persistence. The live isolation probe is saved at
`.eval-runs/workflow-isolation.json`. The behavioral staged-review scenario still passed after
reusing those arguments for its assessor; evidence is in `.eval-runs/behavior-shared-isolation`.

The repository gate passed 133 tests, formatting, lint, types, skill validation, coverage and
generated-document checks. The production dependency audit reported no known vulnerabilities.
Independent read-only reviews accepted the routing and workflow changes after corrections.
