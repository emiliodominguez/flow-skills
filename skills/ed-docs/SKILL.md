---
name: ed-docs
description: "Create or update documentation for a defined reader and task, grounding examples and claims in the current implementation. Use for guides, API/reference docs, architecture rationale or stale documentation cleanup. Invoke as /ed-docs in Claude Code or $ed-docs in Codex. Feeds /ed-review for correctness checks or /ed-ship when documentation accompanies delivery."
---

> Host syntax: `/skill-name` in Claude Code; `$skill-name` in Codex. Use the host spelling for handoffs.

# Document

Start with the reader's question. Documentation earns space by helping someone use, change
or reason about the system without rediscovering its important constraints.

## Process

1. Identify the reader and document's job: tutorial, task guide, reference, or explanation.
   Inspect existing docs and the actual API, behavior, configuration and examples.
2. Ground claims in source, tests, history, ADRs or issues. Explain invariants and tradeoffs,
   but do not invent historical intent. Label an inferred current rationale as inference.
3. Colocate documentation with the thing it explains when the repository supports it. Keep a
   source of truth and link with stable anchors instead of maintaining contradictory copies.
   Generate repetitive API/reference material when existing tooling does so reliably.
4. Write the procedure or contract readers need: prerequisites, working commands, inputs,
   outputs, failure cases and meaningful limitations. Preserve necessary signatures, parameters
   and examples even when they also appear in source; consumer-facing reference has value.
5. Run meaningful examples or check them against the installed API. Validate links and anchors,
   regenerate owned docs and inspect output. Mark unrun commands or access-dependent examples
   honestly rather than presenting them as tested.
6. Prune obsolete and duplicated material that adds no reader value. Preserve legal notices,
   compiler/tool directives, supported compatibility notes and rationale still needed by users.

## Anti-patterns

- A source-code paraphrase without answering a reader question.
- Removing useful reference material merely because code also contains it.
- A stale command copied from memory or an invented reason for an old design.
- Hand-editing generated pages instead of their generator/source.

## Done when

- The reader can perform the intended task or understand the stated contract.
- Claims, examples and links correspond to the current source, with verification limits visible.
- Generated artifacts and relevant source docs agree.

Use /ed-review for correctness review or /ed-ship when the documentation is part of delivery.
