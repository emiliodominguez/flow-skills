---
name: ed-brainstorm
description: "Explore an unclear idea, expose important assumptions, compare useful alternatives and converge on a design sketch. Use before implementation when the outcome or approach still needs discovery. Invoke as /ed-brainstorm in Claude Code or $ed-brainstorm in Codex. Hands off to /ed-prototype for an experiment or /ed-plan for an executable design."
---

> Host syntax: `/skill-name` in Claude Code; `$skill-name` in Codex. Use the host spelling for handoffs.

# Brainstorm

Develop the idea with the user. Spend questions on uncertainty that changes the result, and
keep exploration distinct from commitments to implement or operate a system.

## Process

1. Restate the intended experience or outcome, existing constraints and non-goals. Read relevant
   source or supplied artifacts before proposing incompatible stacks or architecture.
2. Rank unknowns by dependency: resolve the choice that changes the others first. Ask one
   question at a time when dialogue helps, with a recommendation and a real tradeoff. Do not
   keep asking for agreement on details the user already decides.
3. Offer meaningfully different approaches. Compare behavior, complexity, operating effort,
   reversibility and cost where relevant. Label estimates and assumptions; do not invent
   precise latency, budgets or adoption numbers without measurements or sources.
4. Stress-test the strongest options with concrete user and failure scenarios. A skeptic panel
   can help consequential independent questions when delegation is available and authorized;
   otherwise apply the relevant lenses directly. Do not require a fixed number of objections.
5. Choose the smallest experiment that resolves the next important uncertainty. Use
   /ed-prototype for an experiential or technical question; use source-based research for a
   factual one. Preserve creative exploration when the user is still looking for surprise.
6. Produce a concise design sketch: outcome, non-goals, chosen direction, alternatives and
   reasons, key boundaries, unresolved assumptions, and what evidence changes the decision.

## Modes

- **Collaborative:** expand and refine ideas with the user, following their response and taste.
- **Adversarial:** on request or for a consequential decision, challenge assumptions with a
  concrete counterexample. State uncertainty and update the design when evidence changes.

Neither mode turns disagreement into a contest. A plausible objection is a hypothesis to
investigate, not a reason to block all progress.

## Anti-patterns

- Ten superficially different versions of the same idea.
- Fabricated precision or trend names in place of actual constraints.
- Requiring total certainty before a cheap reversible experiment.
- Ending with another permission question when planning or implementation is already requested.

## Done when

- The user has a useful direction or a clear experiment, with assumptions exposed.
- Tradeoffs connect to the intended outcome and existing constraints.
- The next step is concrete without pretending open questions are settled.

Use /ed-prototype to resolve an open question or /ed-plan when the design is ready; continue
into already authorized work without an artificial handoff pause.
