---
name: ed-docs
description: "Write documentation that explains why, not what - capture the decisions, trade-offs, and gotchas the code can't show, aimed at a specific reader's question, and anchored close to the code so it can't rot. Use when writing a README, an ADR, an API doc, or module/architecture notes, or when existing docs are stale (also /ed-docs, \"document this\", \"write a README\", \"explain how this works\" as a durable artifact). Hands off to /ed-ship to land the docs with the change they describe. Invoke as /ed-docs in Claude Code or $ed-docs in Codex."
---

> Host syntax: invoke skills as `/skill-name` in Claude Code or `$skill-name` in Codex. Slash-form handoffs below use the Claude spelling; substitute `$` in Codex.

# Docs

The code already says *what* it does - a doc that restates it adds nothing and rots on the first refactor. Good docs carry what the code **can't**: why it's built this way, what was rejected, and where the sharp edges are. Every phase serves one test: **would this save the next reader a question the code alone couldn't answer?**

---

## Phase 1: Reader and question

Docs are written for a specific reader answering a specific question.

- Name the reader: a future maintainer? an API consumer? someone deciding whether to use this?
- Name the question they arrive with: "how do I call this?", "why is it built this way?", "is it safe to change X?"
- If you can't name the reader and the question, you're about to write filler. Stop and find them.

---

## Phase 2: Explain the why

Write what the code can't tell them.

- **Decisions and trade-offs**: why this approach, what you rejected and why, the constraint that forced it. This is the highest-value content and the first thing lost when the author leaves.
- **The non-obvious**: the ordering that matters, the invariant that must hold, the reason for the ugly workaround (link the issue).
- **The shape, not the lines**: the module's job and how it connects - not a line-by-line paraphrase of the source.
- Lead with what the reader needs first. Concrete example over abstract description; show a real call.

---

## Phase 3: Anchor so it can't rot

Docs die when they drift from the code and nobody notices.

- **Colocate**: keep the doc next to what it describes (module header, a `docs/` page beside the code, a doc-comment) so a change and its doc move together.
- **Point at the source of truth instead of copying it** - link the type, reference the test that demonstrates behaviour, generate reference material from code where you can. A copied value is a lie waiting to happen.
- **Prefer executable docs**: an example that runs in CI can't silently go stale.

---

## Phase 4: Prune

More docs is not better. Stale or redundant docs are worse than none - they mislead.

- Delete docs that restate the code, duplicate another doc, or describe removed behaviour.
- When you change behaviour, update or delete the docs it touched **in the same change**. A doc PR that lags the code is how rot starts.

---

## Anti-patterns

- ❌ Narrating *what* the code does line by line instead of *why*
- ❌ Writing for no one in particular - filler that answers no real question
- ❌ Copying values, signatures, or config the code already owns (they drift)
- ❌ Docs far from the code they describe, so the two diverge unnoticed
- ❌ Adding docs and leaving the stale ones they contradict in place
- ❌ A wall of prose where a runnable example would do

---

## Done when

- The reader and the question the doc answers are clear
- It explains decisions, trade-offs, and gotchas - not a paraphrase of the code
- It's anchored near the code and points at the source of truth rather than copying it
- Stale and redundant docs on the same subject are pruned in the same change

Then: pick up `/ed-ship` to land the docs alongside the change they describe.
