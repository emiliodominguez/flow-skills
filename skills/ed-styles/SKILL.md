---
name: ed-styles
description: "Implement or refactor CSS with the repository's styling architecture, supported browsers, accessible states and measured visual behavior. Use for layout, responsive styling, cascade problems and UI polish. Invoke as /ed-styles in Claude Code or $ed-styles in Codex. Hands off to /ed-animate for motion or /ed-review for implementation review."
---

> Host syntax: `/skill-name` in Claude Code; `$skill-name` in Codex. Use the host spelling for handoffs.

# Styles

Solve the layout or visual problem within the project's actual CSS architecture. Use newer
features when they provide a concrete benefit inside the supported browser matrix.

## Phase 1: Inspect the design contract

Read the component, design/reference, token system, stylesheet organization, browser targets,
Prettier/Stylelint rules and nearby patterns. Preserve plain CSS, modules, utility classes,
CSS-in-JS or SCSS as appropriate. Do not impose module bracket notation or naming conventions
from another repository.

## Phase 2: Build deliberate layout and cascade

- Use existing tokens and custom properties for shared values. Keep one-off values local when
  inventing a token would add indirection without reuse.
- Prefer layout primitives, intrinsic sizing, logical properties, `gap`, `minmax()` and
  `aspect-ratio` over brittle coordinates. Account for long text, localization and zoom.
- Scope selectors and inspect specificity and source order. Add `@layer` only with a coherent
  cascade strategy: unlayered normal styles outrank layered normal rules, and important-layer
  order reverses. Layers do not automatically fix a vendor override.
- Check browser support before using nesting, container queries, `:has()`, `color-mix()`,
  view transitions or scroll-driven effects. Use suitable fallbacks or targeted `@supports`
  when required. Parser support alone is not proof of bug-free behavior.
- Transition explicit properties. Avoid `transition: all` and broad animation resets that
  affect unrelated components. Preserve comments/directives that tools or maintainers need.

## Phase 3: Preserve accessible and reduced-motion states

Use semantic controls, meaningful focus order, visible focus and sufficient contrast. Prefer
`:focus-visible` when supported, with an appropriate fallback; never remove the only keyboard
indicator. Visually hidden content needs an established accessible utility rather than
`display: none` when it must remain available to assistive technology.

For `prefers-reduced-motion`, design a reduced or static presentation that retains content and
state changes. Do not blindly shorten every animation: infinite iteration, delays, animation
callbacks and initially hidden elements need explicit handling. Test with the preference on.
Check relevant hover, focus, active, disabled, error, empty, loading and forced-colors states.

## Phase 4: Measure and inspect

Use containment, `content-visibility` and rendering hints only for demonstrated performance
needs. Consider intrinsic size and scroll geometry; containment can clip popovers or tooltips.
Check anchors, scrolling and overflow where affected rather than assuming a CSS hint is free.

Inspect the actual page at representative widths, text lengths and zoom, with stable data and
fonts. Exercise keyboard and pointer behavior, check overflow and compare with the reference.
Run the repository's lint/build checks. If browser access is missing, identify which visual
and interaction claims remain unverified.

## Anti-patterns

- A catalog of trendy CSS features with no relation to the requested design.
- Global overrides that silently change unrelated components or remove focus.
- Treating a typecheck or source screenshot as rendered visual verification.
- Applying another project's SCSS/module conventions as universal rules.

## Done when

- The rendered change meets the design and responsive requirements in supported targets.
- Interaction, focus and reduced-motion behavior are verified or explicitly unverified.
- The cascade and source follow local conventions without unrelated rewrites.

Use /ed-animate for a motion-specific pass or /ed-review for implementation review.
