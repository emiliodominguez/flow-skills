# Audit rubric

Score each dimension 1-5 and attach evidence: a screenshot region, a selector, or a measured value.
A score without evidence doesn't count. Re-score after the redesign with the same method.

| Score | Meaning |
| --- | --- |
| 1 | Broken or actively harmful |
| 2 | Works but clearly generic, inconsistent or hard to use |
| 3 | Acceptable, with visible rough edges |
| 4 | Consistent and deliberate, minor issues |
| 5 | Exemplary for this product and audience |

## Dimensions

**Hierarchy.** Can a first-time user find the main action in 5 seconds? One primary action per
view; secondary actions visibly quieter; headings describe content.

**Typography.** Consistent scale from tokens; at most two families; body at least 16px; line
length 45-75 characters; headings don't wrap into long stacks on mobile; tabular numbers in data.

**Color and contrast.** Text meets 4.5:1 (3:1 large), controls and focus 3:1; one accent with a
clear job; neutrals share one tint; dark mode tuned rather than inverted; color never the only signal.

**Layout and spacing.** Spacing comes from a scale; edges and baselines align; containers have a
max width; no horizontal overflow; related items are grouped by proximity.

**Components and consistency.** The same thing looks and behaves the same everywhere; shared
components instead of copies; one radius and one elevation system; icons share stroke and size.

**States.** Hover, focus-visible, active, disabled, loading, empty, error and success exist where
relevant, and error messages say how to recover.

**Responsiveness.** Works at 375, 768, 1280 and wide screens; layouts reflow rather than shrink;
touch targets at least 24px; nothing hidden under sticky UI; `100dvh` rather than `100vh`.

**Accessibility.** Keyboard operable with visible focus, semantic structure and landmarks,
labelled controls, reduced motion honored. Run `flow-a11y` for a full audit.

**Performance.** No layout shift from fonts, images or late content; images sized and responsive;
the largest above-the-fold element loads early; no heavy dependency for a small visual effect.
Use field data when available, lab data otherwise.

**Content.** Specific, plain copy in the product's voice; no filler phrases; no invented
testimonials, logos or metrics; no lorem ipsum or placeholder names.

## Punch list format

| # | Issue | Evidence | Dimension | Impact | Effort | Risk | Step |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Body text 14px, 4.1:1 contrast | `.prose` computed styles | Typography, Contrast | High | Low | Low | Tokens |
