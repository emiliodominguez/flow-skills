# DESIGN.md template

A single file an agent or designer can read before building any screen. Keep it short and
concrete: every rule should be something a reviewer can check. Store it where the project keeps
docs (for example the repository root or `docs/`).

```markdown
# Design - <product>

## Direction
<one line: surface, audience, visual language, system or archetype>
Dials: density N, variance N, motion N. <one sentence on why>

## Principles
- <3-5 decisions that settle arguments, e.g. "Data first: charts never share a card with marketing copy">

## Color
| Role | Light | Dark | Use |
| --- | --- | --- | --- |
| surface | #... | #... | page background |
| text | #... | #... | body copy (contrast N:1) |
| muted | #... | #... | secondary text (contrast N:1) |
| border | #... | #... | dividers, input borders (3:1 for inputs) |
| accent | #... | #... | primary action and focus only |
| danger / success / warning | ... | ... | status, always paired with an icon or text |

## Typography
Families: <display>, <body>, <mono>. Scale ratio: N.
| Token | Size | Line height | Weight | Use |
| --- | --- | --- | --- | --- |

## Space, shape, elevation
Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64...
Radius: small N, medium N, large N (nested elements use the smaller one).
Elevation: <levels and when each is used>. Container: N px, grid: N columns, gutter N.

## Motion
Durations: fast N ms, base N ms, slow N ms. Easing: <curves>.
Motion is used for: <feedback, state change, hierarchy>. Reduced motion: <what changes>.

## Components
<For each core component: anatomy, variants, sizes and states (hover, focus, active, disabled, loading, error).>

## Layout and responsive
Breakpoints: <values>. <How key layouts collapse below each breakpoint.>

## Content
Voice: <tone>. Copy rules: sentence case, specific verbs, no filler.
Mock data is labelled as mock. No invented logos, testimonials or metrics.

## Don't
- <Project-specific defaults to avoid, each with the reason.>
```
