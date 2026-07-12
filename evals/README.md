# Skill evals

A skill is a prompt, so "does it work?" can't be answered by unit tests alone. These evals
pin each skill to a **behavioral contract**: the distinctive mechanics it promises to instruct.

## Beats

`beats.json` maps each skill to 3–5 _beats_ — short phrases naming the mechanics that make it
that skill (e.g. `ed-review` → `persona`, `refute`, `confirmed`). A beat is a case-insensitive
substring the skill's body must contain.

## Two graders

- **Model-free (CI):** `pnpm test` runs [`test/evals.test.ts`](../test/evals.test.ts), which
  asserts every skill declares beats and its body still delivers each one. This catches a skill
  that drifts away from a promised mechanic, and forces a new skill to declare its contract.
- **LLM-graded (manual):** `pnpm eval:llm [skill]` asks a judge model whether an agent that
  followed the skill would actually perform each beat — a stronger check than substring
  presence. It's gated on `ANTHROPIC_API_KEY` (skips cleanly without one) and never runs in CI.
  Override the model with `ANTHROPIC_MODEL`.

## Adding a skill

Add a `beats.json` entry with 3–5 verifiable beats; `pnpm test` fails until the body delivers
them.
