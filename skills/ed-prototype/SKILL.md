---
name: ed-prototype
description: "Build a small runnable experiment that answers one explicit technical or experiential question, including visual alternatives when useful. Use to test uncertainty before committing to production architecture. Invoke as /ed-prototype in Claude Code or $ed-prototype in Codex. Hands off to /ed-brainstorm with the answer or /ed-plan for production acceptance."
---

> Host syntax: `/skill-name` in Claude Code; `$skill-name` in Codex. Use the host spelling for handoffs.

# Prototype

Answer one question with a runnable artifact. Default to disposable work, but let the user
choose to retain or promote useful code after its limitations are assessed.

## Process

1. Define the question, hypothesis, observation and stop condition. Set scope and an effort
   budget proportional to the uncertainty. Reuse the existing stack when it supports the
   experiment; do not introduce a new framework for a small demonstration.
2. Isolate the artifact from production navigation, data and deployment. Use the user's chosen
   directory or the repository's prototype convention. Do not change ignore rules automatically.
3. Choose the experiment shape:
   - A terminal app or script for data flow, algorithms, protocol and state-machine questions.
   - A visual route/demo for layout, motion and interaction; show a few meaningfully different
     alternatives together when comparison is the point.
4. Build only the paths needed to answer the question. Include validation and failure behavior
   where they affect that answer. Minimal does not mean a crashing demo or empty event handlers.
   A fixed file-count rule must not prevent the components the experiment actually needs.
5. Run it. Record the startup command, representative inputs and observed outcomes. Inspect a
   visual prototype in the browser, including interaction and final state; code inspection
   alone does not confirm the experience. Mark unavailable checks explicitly.
6. Compare evidence with the hypothesis. State what the prototype demonstrates and what it
   does not, including mocked services, assumed data, and missing operational behavior.
7. Record disposition: keep, archive, discard, or promote. A throwaway default does not override
   an explicit request to build on the prototype. For promotion, inspect useful pieces and
   define production requirements and gaps through /ed-plan; avoid an automatic rewrite.

## Anti-patterns

- Implementing an entire product to answer a narrow uncertainty.
- Omitting error paths that are essential to the question.
- Presenting mocked success as proof of a real integration.
- Forcing the user to discard code they explicitly choose to retain.

## Done when

- The artifact runs and the stated question has an evidence-backed answer or a specific limit.
- The next person can reproduce the experiment.
- The artifact's location, limitations and disposition are clear.

Return the answer to /ed-brainstorm or use /ed-plan for the production work the user requests.
