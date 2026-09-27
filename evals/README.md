# Skill evaluations

Keep three kinds of evidence separate. A prompt containing the right words is not proof that
an agent will follow it.

| Layer                   | Command or method                                          | What it establishes                                                          |
| ----------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Instruction markers     | `pnpm test`                                                | Every skill declares 3-5 distinctive markers and contains them               |
| Model instruction audit | `pnpm eval:llm [skill]`                                    | A configured judge evaluates the written instructions against those markers  |
| Behavioral scenarios    | Prepare an isolated fixture, then run an independent agent | Actual decisions, commands, artifacts and stopping behavior in that scenario |

## Instruction markers and model audit

`beats.json` holds short, case-insensitive, whitespace-normalized substrings. They prevent
accidental textual omissions; they do not validate runtime behavior or quality.

The optional model audit calls the Anthropic API and requires both `ANTHROPIC_API_KEY` and an available `ANTHROPIC_MODEL`.
Missing configuration exits 2 and means **not run**. It never selects an invented or stale
model identifier. Model calls can incur provider charges and do not run in CI.

The audit requires a complete JSON array with one unique verdict per marker, a boolean
`present`, and a nonempty reason. Empty, partial, duplicated, unknown, malformed or truncated
responses fail. A complete negative verdict also fails. This integrity check prevents missing
evidence from becoming a passing score; it does not turn the audit into behavioral evaluation.

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
relevant cases when their workflow changes; add new failure cases from real use. Evaluate
activation separately with ambiguous positive requests and nearby negative requests when the
host exposes skill discovery.
