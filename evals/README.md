# Skill evaluations

Keep three kinds of evidence separate. A prompt containing the right words is not proof that
an agent will follow it.

| Layer                   | Command or method                                          | What it establishes                                                          |
| ----------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Instruction markers     | `pnpm test`                                                | Every skill declares 3-5 distinctive markers and contains them               |
| Model instruction audit | `pnpm eval:llm [skill]`                                    | A configured judge evaluates the written instructions against those markers  |
| Routing                 | `pnpm eval:triggers [skill] [--runs 3]`                    | The description index routes requests to the right skill, or to none         |
| With/without answers    | `pnpm eval:ab [case or skill] [--runs 3] [--out file]`     | Loading the skill changes a model's answer on the asserted qualities         |
| Behavioral scenarios    | Prepare an isolated fixture, then run an independent agent | Actual decisions, commands, artifacts and stopping behavior in that scenario |

## Instruction markers and model audit

`beats.json` holds short, case-insensitive, whitespace-normalized substrings. They prevent
accidental textual omissions; they do not validate runtime behavior or quality.

## Model backends

The model evals (`eval:llm`, `eval:triggers`, `eval:ab`) share one client with two backends:

| `EVAL_BACKEND` | Auth                                  | Notes                                                                    |
| -------------- | ------------------------------------- | ------------------------------------------------------------------------ |
| `api`          | `ANTHROPIC_API_KEY` plus `EVAL_MODEL` | Default. Provider charges apply.                                         |
| `claude`       | A signed-in Claude Code CLI           | Uses your plan's limits. `EVAL_MODEL` is optional (for example `haiku`). |

The `claude` backend runs the CLI headless with its default system prompt replaced and tools,
skills and every settings source disabled, so memory files and locally installed skills cannot
leak into a baseline. `EVAL_JUDGE_MODEL` sets a separate judge for `eval:ab`, and `--concurrency`
bounds parallel calls. Missing configuration exits 2 and means **not run**; nothing selects an
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
scores each prompt by majority over `--runs`. It exits 1 below `--min` accuracy (default 0.9).
Misroutes are description problems: fix the description that attracted or lost the request,
not the prompt. Keep a few prompts back when tuning so the score is not fitted to its own test.

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
