# State coverage

Build and exercise every state that applies. Missing states are the most common reason a UI looks
finished in a screenshot and broken in use.

| State | What good looks like | Common miss |
| --- | --- | --- |
| Default | Clear hierarchy, one primary action | Everything the same weight |
| Hover | Subtle, fast (100-200ms) change on pointer devices only (`@media (hover: hover)`) | Hover-only affordances on touch |
| Focus-visible | Visible 3:1 indicator, not clipped by `overflow` or sticky UI | `outline: none` with no replacement |
| Active / pressed | Immediate feedback | No response until the request returns |
| Disabled | Clearly inactive, still readable, with a reason when it isn't obvious | Low-contrast text, no explanation |
| Loading | Skeleton that matches the final layout; spinner only for short, unknown-shape waits | Layout jump when data arrives |
| Empty | Explains why and offers the next step | Blank area or a bare "No data" |
| Error | Says what happened and how to recover, near the cause, announced to assistive tech | Generic "Something went wrong", `alert()` |
| Partial / degraded | Works when one request fails or an image is missing | Whole page fails for one widget |
| Success | Confirms the result, then gets out of the way | Toast that steals focus or disappears too fast to read |
| Overflow | Long names truncate or wrap deliberately; many items paginate or virtualize | Text spills out of cards |
| Localization | 30-40% longer strings, RTL mirroring via logical properties, locale formats | Fixed widths, hardcoded `left`/`right` |
| Themes | Dark mode uses tuned surfaces, not inverted colors; images and shadows adapt | Pure black backgrounds, invisible borders |
| Reduced motion | Same content and end state without non-essential movement | Content that only appears through animation |
| Offline / slow | Stale data is labelled; actions queue or fail clearly | Silent failures |

## Realistic content, honestly labelled

- Use the product's domain: real feature names, prices and flows from the user or the codebase.
- Never invent testimonials, customer logos, press quotes or precise performance claims and
  present them as real. Mark mock data as mock (a comment, a `data-mock` attribute or an obvious
  sample label) so it can't ship by accident.
- Vary name lengths and include non-Latin names to test layout.
- Include at least one worst case per list: the longest title, a missing avatar, zero items.
