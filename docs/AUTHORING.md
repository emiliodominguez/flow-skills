# Authoring a skill

A skill is a prompt a future agent reads when a task matches its `description`. Write it
like terse, opinionated documentation for a capable colleague — not a tutorial.

## Anatomy

```
---
name: ed-<x>
description: <what it does> — <when to use / trigger phrases> — <handoff line>.
---

# <Title>

<1–3 lines: what this skill is for and the ONE discipline it enforces.>

---

## <Phases or Process>     ← numbered steps, each with a clear job

## Anti-patterns           ← ❌ concrete things not to do

## Done when               ← observable completion gate + a concrete handoff sentence
```

## The description is load-bearing

It's how the model decides to invoke the skill. Pack it with:

- **What** it does, in the first clause.
- **When** to use it — real trigger phrases a user would type ("review this", "make a
  plan").
- **Handoff** — which skill comes next.
- **Explicit invocation** — name `/<skill>` for Claude Code and `$<skill>` for Codex.

Keep it one line. Long is fine (it's an index entry), but under ~1024 chars.

## Voice

- Terse, imperative, second person. No hedging, no filler, no "you might consider".
- Opinionated defaults. A skill that refuses to decide is useless.
- `❌` for anti-patterns. Concrete, not abstract ("names like `data`/`manager`", not "bad
  names").
- End with a sentence the agent can literally say to hand off.
- Tabs in code samples. `function foo()` over arrow functions.

## The multi-agent pattern — only where it earns its keep

Reach for parallel subagents when **diverse viewpoints or breadth** genuinely beat one
pass: review, adversarial review, research, large-scale simplification. The shared shape:

```
1. SCOPE   — determine the target.
2. FAN OUT — launch distinct-PERSONA agents with the host's delegation mechanism
             (run read-only; only you write; batch within available concurrency).
             Each returns findings in ONE fixed schema.
3. MERGE   — dedup by file:line.
4. VERIFY  — an independent agent tries to REFUTE each finding. Keep survivors, tagged
             CONFIRMED / PLAUSIBLE. Default to refuted when unsure.
5. REPORT  — triaged, deduped, no padding.
```

Do **not** bolt this onto a skill where a single agent is obviously better
(`ed-git-fix`, `ed-handoff`, `ed-styles`). Over-engineering is itself an anti-pattern.

Personas must have _different mental models_ — "the security adversary", "the new hire
reading it cold", "the maintainer in two years" — not six copies of "review this code".

## Before you commit

- `pnpm skills validate` is clean (naming, refs, and the quality lints: the description names
  its own `/<skill>` and `$<skill>` triggers and is a real sentence, the body has no filler words).
- You added an **`evals/beats.json` entry** — 3–5 lowercase substrings naming the skill's
  distinctive mechanics that appear in its body. `pnpm test` fails until they do (see
  [`../evals/README.md`](../evals/README.md)).
- `pnpm docs:gen` was run and the regenerated `docs/` is committed.
- You invoked the skill in a real session and it did the right thing (evidence, not "looks
  right").
- Every `/other-skill` or `$other-skill` handoff points at a skill that exists.
