# Generic tells

Patterns that make an interface look assembled from defaults. Each is a question to answer, not
a ban: keep the pattern when the brief or the existing system justifies it, and write down why.

## Layout

- **Three equal cards in a row** as the answer to every feature section. Could the content be a
  list, a comparison, a single hero feature with supporting details, or a table?
- **Every section centered and symmetric.** Does anything deserve emphasis through position or scale?
- **The same layout repeated section after section** (image left, text right, then swapped).
  Across a long page, vary the layout family with the content, not for its own sake.
- **Bento grids with empty or filler tiles.** The grid should have exactly as many cells as real content.
- **Full-height hero with a vague headline, a paragraph and two buttons.** Is the headline specific
  enough to stand alone in two lines, with one primary action visible without scrolling?
- **Fixed `100vh` sections.** Use `min-height: 100dvh` or content height; `100vh` jumps on mobile browsers.

## Type

- **One default sans at one weight** for everything. Is there a display role, and is hierarchy
  carried by size, weight and spacing?
- **Tiny uppercase eyebrow labels over every heading.** One or two per page at most, and only when
  they add information.
- **Headlines that wrap into many lines** on mobile because the container is narrow. Check line count at 375px.
- **Body text wider than about 75 characters** or lighter than the contrast minimum.

## Color and surface

- **Purple-to-blue gradients and glowing orbs** as the default "modern" look. Does the brand have its own color?
- **Several competing accents.** One accent for action and focus; status colors are separate and semantic.
- **Pure black on pure white, or pure black dark mode.** Tuned near-black and off-white reduce glare;
  dark surfaces need their own elevation scale.
- **Generic gray drop shadows on every card.** Use elevation only where it communicates layering;
  otherwise separate with space or a hairline.
- **Glassmorphism on scrolling content.** Blur is expensive and hurts contrast; keep it to fixed layers if used at all.

## Components

- **Filled button plus ghost button pairs** everywhere. Is there really a second action, and does
  it need that much weight?
- **Two CTAs with the same intent** ("Get started" and "Start free"). Keep one.
- **Pill badges saying "New" or "Beta"** on everything.
- **Modals for simple edits** that could be inline or a side panel.
- **Carousel testimonials with dots.** Carousels hide content and are hard to use with assistive tech.

## Content

- **Filler copy:** "Elevate", "seamless", "unleash", "next-gen", "revolutionize", headings that
  describe the section instead of saying something.
- **Invented trust signals:** customer logos, testimonials, star ratings or precise metrics that
  aren't real. Use real ones or clearly labelled placeholders.
- **Lorem ipsum, "John Doe", identical dates and avatars.** Draft real copy and varied sample data.
- **Title Case On Every Heading** when the product's voice is sentence case.

## Decoration

- **Clutter that signals "designed":** section numbers ("01 / Features"), fake status dots, version
  stamps in heroes, scroll-down cues, decorative code snippets or div-built fake screenshots.
- **Motion on everything.** Every animation should communicate feedback, state change or hierarchy.
- **Noise, grain and gradients added to hide an empty layout.** Fix the composition first.
