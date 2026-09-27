# Fidelity loop

Use this when matching a reference image or design file. The goal is the reference's intent at
its width, and sensible behavior at every other width.

## Before coding

1. Record the reference's width. Measure the container width, column count, gutters and outer margins.
2. Extract the system, not the pixels: type sizes and weights, spacing steps, colors, radii,
   shadows. Map each to an existing token, or propose a new one if it repeats.
3. List every region and component, and mark which already exist in the codebase.
4. Note what the reference doesn't show: other widths, states, long content. Decide those up front.

## Each pass

1. Render at the reference width and capture a screenshot.
2. Compare side by side, or as an overlay at 50% opacity when tooling allows.
3. Walk this order and fix the first category that differs before moving on, because later
   categories depend on earlier ones:
   1. **Structure:** regions present, order, grid and column spans.
   2. **Size and spacing:** container widths, gaps, padding, vertical rhythm.
   3. **Typography:** family, size, weight, line height, letter spacing, wrapping.
   4. **Color and surface:** backgrounds, text, borders, shadows, gradients.
   5. **Detail:** radius, icon weight and size, image crop, dividers.
4. Re-render and repeat. Also render one narrower and one wider width each pass to make sure a
   fix didn't break reflow.

## When to stop or deviate

- Stop when a pass finds no difference a user would notice.
- Deviate from the reference, and say so, when matching it would break accessibility (contrast,
  target size, focus), the existing design system, or responsive behavior.
- An image-only reference can't show hover, focus or motion. Take those from the design
  direction, not guesswork.
