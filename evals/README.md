# Skill evaluations

Keep these evidence layers separate. A prompt containing the right words is not proof that
an agent will follow it.

| Layer                   | Command or method                                          | What it establishes                                                          |
| ----------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Instruction markers     | `pnpm test`                                                | Every skill declares 3-5 distinctive markers and contains them               |
| Model instruction audit | `pnpm eval:llm [skill]`                                    | A configured judge evaluates the written instructions against those markers  |
| Routing                 | `pnpm eval:triggers [skill] [--runs 3]`                    | The description index routes requests to the right skill, or to none         |
| With/without answers    | `pnpm eval:ab [case or skill] [--runs 3] [--out file]`     | Loading the skill changes a model's answer on the asserted qualities         |
| Conversation decisions  | `pnpm eval:workflows [case] [--runs 3]`                    | Routing and proposed next actions follow conversation state and corrections  |
| Behavioral scenarios    | `pnpm eval:behavior [scenario]`, or a manual agent session | Actual decisions, commands, artifacts and stopping behavior in that scenario |

## Instruction markers and model audit

`beats.json` holds short, case-insensitive, whitespace-normalized substrings. They prevent
accidental textual omissions; they do not validate runtime behavior or quality.

## Model backends

The answer-only model evals (`eval:llm`, `eval:triggers`, `eval:ab`, `eval:workflows`) share one client with two backends:

| `EVAL_BACKEND` | Auth                                  | Notes                                                                    |
| -------------- | ------------------------------------- | ------------------------------------------------------------------------ |
| `api`          | `ANTHROPIC_API_KEY` plus `EVAL_MODEL` | Default. Provider charges apply.                                         |
| `claude`       | A signed-in Claude Code CLI           | Uses your plan's limits. `EVAL_MODEL` is optional (for example `haiku`). |

The `claude` backend runs the CLI headless with its default system prompt replaced, native tools
disabled, and a strict empty MCP configuration. Skills, settings sources, hooks, auto memory,
browser integration and session persistence are disabled. `EVAL_JUDGE_MODEL` sets a separate
judge for `eval:ab` and `eval:workflows`; the routing and A/B runners offer `--concurrency`.
Missing configuration exits 2 and means **not run**; nothing selects an
invented model identifier, and none of this runs in CI.

```sh
EVAL_BACKEND=claude EVAL_MODEL=haiku pnpm eval:triggers --runs 2
EVAL_BACKEND=claude EVAL_MODEL=haiku EVAL_JUDGE_MODEL=sonnet pnpm eval:ab --runs 3 --save .eval-runs
```

Other agent CLIs are not supported yet: their skill discovery also reads the shared install
directory with no switch to turn it off, which would contaminate the without-skill baseline.

The audit requires a complete JSON array with one unique verdict per marker, a boolean
`present`, and a nonempty reason. Empty, partial, duplicated, unknown, malformed or truncated
responses fail. A complete negative verdict also fails. This integrity check prevents missing
evidence from becoming a passing score; it does not turn the audit into behavioral evaluation.

## Routing

`triggers.json` gives every skill four requests that should load it and three near misses that
share its vocabulary but belong to another skill (or to none). The runner shows a model the
same name-and-description index a host loads, asks which single skill it would load first, and
scores each prompt by strict majority over `--runs`. It exits 1 below `--min` accuracy (default 0.9)
or on any model/parsing error, even if other picks would provide a passing majority. The response
must be one complete routing object, optionally in one JSON fence; extra or partial output fails.

`--set dev` is the default and uses `triggers.json`. `--set heldout` uses
`triggers-heldout.json`, with one positive and one near miss per skill. Both splits must cover the
corpus, use known labels and have no reused prompts after case/whitespace normalization. CI
checks those properties without model access.

```sh
EVAL_BACKEND=claude pnpm eval:triggers flow-release --set dev --runs 3
EVAL_BACKEND=claude pnpm eval:triggers --set heldout --runs 3 --out .eval-runs/routing-validation.json
```

Tune descriptions against development prompts. Freeze held-out prompts before their first model
run and do not rewrite them or tune descriptions in response to their scores. A newly discovered
failure can become a development case; retire that held-out case explicitly and add a fresh,
unseen replacement for later validation. New skills need independently authored held-out cases.
Changing the validation set starts a new dataset version, identified by its content hash.

The held-out set is public and maintained in this repository, not a secret or independently
administered benchmark. Avoid opening its prompts while tuning. Held-out misses omit prompt text
from stdout; the optional JSON report retains individual picks and labels along with dataset and
description-index hashes, backend/model configuration and repetition count. Output files are
created exclusively. A small fixed set and a single model run establish only narrow evidence.

## Conversation decisions

```sh
EVAL_BACKEND=claude pnpm eval:workflows --runs 2 --save .eval-runs/workflow-decisions
EVAL_BACKEND=claude pnpm eval:workflows missing-review-skill
```

`workflows.json` defines multi-turn user messages, an installed skill subset and assessor-only
expectations. The initial cases cover plan/build/review/push handoffs, a correction revoking
delivery, and review when the named review skill is unavailable. At each turn the router sees
only available descriptions and the observed conversation. The continuation model receives the
actual prior answers and progressively loaded skill bodies, without expected routes or assertions.
A fresh assessor grades the written next action; a deterministic route failure cannot be
overridden by the assessor. Missing, duplicate or malformed judgments are errors.

This is a **decision-only conversation proxy**. Later user turns supply milestones such as
"implementation is complete"; no fixture is built, no tests or delivery commands execute, and a
passing proposed action is not evidence that an agent performs it. Use `eval:behavior` for actual
tool execution. These workflow cases are development regressions, not held-out cases.

Each run saves every raw model exchange, each completed graded turn and a final result. The
summary records dataset/skill hashes, model configuration, expected/completed turn counts and
PASS, FAIL or ERROR. Earlier graded turns survive a later error. Existing evidence directories
are never overwritten. Exit 0 requires every selected conversation and turn to pass; failures
or incomplete evidence exit 1, and missing backend configuration exits 2. Model calls are opt-in
and never part of CI.

## With/without answers

`ab.json` holds situations with assertions a good answer meets. Each case runs `--runs` times
with the skill as system context and without it; a judge grades every answer against the same
assertions. The report shows pass rates, mean output tokens, and a flag per assertion:

- **passes either way**: the assertion does not measure the skill; sharpen it or drop it.
- **worse with skill**: the skill is steering answers away from the assertion; fix the skill.
- **fails either way**: the skill does not deliver it, or the assertion is unreachable in text.

This compares written answers without tools. It shows whether the instructions change
decisions, not whether an agent executes them; use the behavioral scenarios for that. Both
model evals need the same configuration as the audit and can incur provider charges.

## Reproducible behavioral scenarios

### Automated execution

```sh
EVAL_BACKEND=claude pnpm eval:behavior
EVAL_BACKEND=claude pnpm eval:behavior contract-verification --runs 2 --variant both --save .eval-runs/verification
```

The runner prepares a fresh fixture per case, repetition and variant, then launches a real
headless agent with tools. `--variant with` is the default; `without` omits skill context and
`both` runs the same exercise with and without it. `EVAL_MODEL` and `EVAL_JUDGE_MODEL` select
the executing and assessing models; omission uses the signed-in CLI's default. Model usage
consumes plan limits or incurs provider charges. These runs are opt-in and never run in CI.

Execution currently supports the signed-in Claude CLI with `--no-session-persistence`
and explicit MCP configuration. Hooks and auto memory are disabled explicitly. Built-in tools, installed skills,
settings sources and ambient MCP servers are disabled. The five fixture capabilities are:

- `list_files` and `read_file`: inspect only the disposable fixture.
- `write_file`: edit fixture files so unauthorized edits remain observable failures.
- `git_diff`: capture HEAD, index entries, staged diff and unstaged diff separately.
- `run_tests`: execute the scenario's fixed test command and return its real exit status/output.

There is no general shell, network tool or delegation capability. File tools reject traversal,
symlinks and Git internals. Test execution is allowed only while the fixture still matches its
trusted starting files; the runner does not execute agent-written code. This bounded capability
environment establishes behavior for these exercises, not compatibility with every native host
tool or a general-purpose sandbox for arbitrary repositories.

`behavior.json` holds assessor-only assertions, protected-file rules and required tool calls.
The executing agent receives the task, skill context and capability description, never the
rubric. After execution, deterministic checks compare files and Git state and inspect actual
tool calls, including writes later restored. A separate fresh model call assesses the remaining
semantic assertions against the answer, audit and before/after artifacts. A missing, duplicate
or malformed judgment fails the run. The judge cannot override a failed deterministic check.

Each output directory contains the fixture, before/after contents and hashes, `tools.jsonl`,
the CLI transcript, process exit evidence, answer, raw judge response and `result.json`.
`summary.json` records every requested run. Skill/scenario/assessment hashes, CLI and runtime
versions, observed model identifiers, usage and duration identify the evidence. Keep raw output
local by default; inspect it before sharing. Existing output directories are never overwritten.

The default timeout is 180 seconds per executor or assessor; `--timeout` changes it. Interrupting
a run terminates its active execution, records remaining cases as NOT_RUN and exits 130. Nonzero exits,
timeouts, permission failures, missing tool evidence and failed assertions exit 1. Missing
backend configuration or CLI exits 2 and means **not run**. Exit 0 requires every selected
run to pass, including both variants when requested. A task-level REJECT or BLOCKED can be
the correct behavior and receive a behavioral PASS.

The backend uses the CLI's documented [programmatic execution](https://code.claude.com/docs/en/headless)
and [explicit MCP configuration](https://code.claude.com/docs/en/mcp). The skills themselves remain
host-agnostic. CI tests the harness with local fixtures and processes, without calling a model.

### Manual execution

`scenarios.json` contains starting files, prompts and Git layers. Prepare one into a **new**
directory; the preparer refuses to replace an existing path and makes no network calls:

```sh
pnpm eval:prepare staged-review /tmp/flow-skills-review-example
pnpm eval:prepare contract-verification /tmp/flow-skills-verifier-example
pnpm eval:prepare resume-budget /tmp/flow-skills-resume-example
```

Use a fresh agent with only the printed prompt, named `SKILL.md`, fixture path and relevant
host capability/permission context. Do not pass the assessor rubric, previous findings or the
expected outcome. Keep the assessor separate from execution. The preparer creates files and
Git state; it does not launch, simulate or grade an agent.

The first two scenarios are read-only. The resume scenario may write plan/run records but
must preserve implementation artifacts and historical verdicts. Each fixture is disposable.
The tool refuses to write outside its requested directory.

The assessor uses [rubric](RUBRIC.md), inspects actual artifacts and records skill hashes,
agent/host context, checks, observed outcome and limitations. A fixture that ends in REJECT
or BLOCKED can be the correct skill behavior. Distinguish that result from a passing task gate.

[The initial run record](results/2026-09-15.md) records three isolated exercises. It is evidence
for those cases only, not certification of every skill, model or supported application. Repeat
relevant cases when their workflow changes; add new failure cases from real use.
