---
name: ed-animate
description: "Design, tune or critique interface motion through storyboard, optional development dials, and rendered interaction checks. Use when motion should clarify hierarchy, feedback or a specific visual experience. Invoke as /ed-animate in Claude Code or $ed-animate in Codex. Hands off to /ed-styles for layout or /ed-review for implementation review."
---

> Host syntax: `/skill-name` in Claude Code; `$skill-name` in Codex. Use the host spelling for handoffs.

# Animate

Make motion serve the interaction. Preserve readable content, responsive input and a correct
final state when animation is reduced, interrupted, replayed or unavailable.

## Select the mode

- **Storyboard:** describe trigger, sequence, spatial relationship and end state before code.
- **Dials:** expose a small set of development-only parameters when interactive tuning helps.
- **Critique:** inspect existing motion and identify the concrete perceptual or interaction issue.

Use the installed animation stack or native CSS/Web Animations where appropriate. Do not add
Motion, a canvas renderer or a build dependency merely because a sample uses one. Check actual
library versions and official APIs when uncertain.

## Implement the sequence

1. Define the interaction's trigger, duration budget, cancellation and final state. Choose a
   small set of timings, easing/spring values and amplitudes. Name reusable constants with
   units (`durationMs`, `durationSeconds`) and convert deliberately; eliminate unexplained
   magic numbers without abstracting every one-off value.
2. Derive stagger from order/count where sequencing matters. Use state or lifecycle-aware
   timelines appropriate to the UI; a single increasing stage counter is not universal.
3. Prefer transform/opacity for suitable effects, but measure real frame behavior and visual
   quality. Avoid layout thrashing, unnecessary promoted layers, and permanent `will-change`.
4. Respect reduced motion explicitly. With Motion use the supported configuration or hook;
   otherwise branch on the relevant media preference. Reduced motion must still show content,
   preserve feedback and complete state transitions without relying on an animation event.
5. Clean up listeners, observers, animation handles, timers and RAF loops. Handle unmount,
   navigation, rapid repeated input and interruption so stale callbacks cannot mutate new state.

## Development dials

Keep controls outside production UI and use the actual framework/build tool's development
mechanism. If using React, mount a separate development component and keep Hooks unconditional
inside it; do not wrap Hook calls in a conditional guard. Feed tuned values back into source
and remove temporary controls unless the user wants to keep them.

## Critique and verify

Assess hierarchy, continuity, rhythm and affordance against the intended experience. Show a
concrete before/after effect or parameter change instead of generic "add more polish" advice.
Run the page and inspect initial, intermediate and final states, representative viewports,
keyboard/pointer interaction, reduced motion, replay and cancellation. Capture stable evidence
when comparison helps. A build passing does not prove the animation looks or behaves correctly.

## Anti-patterns

- Decorative movement that obscures reading or delays usable input.
- A hidden initial state that remains hidden if animation never completes.
- Replaying an old timeline after unmount or assuming reduced motion is enabled by default.
- Framework-specific development guards or spring fields copied into an incompatible stack.

## Done when

- The motion expresses the intended behavior and has a valid reduced/static alternative.
- Rendering, cancellation, replay and lifecycle behavior are checked where relevant.
- Tuned values, cleanup and remaining verification limits are clear.

Use /ed-styles for related layout work or /ed-review for implementation review.
