# WCAG 2.2 AA checklist

Grouped by what you test, not by guideline number. "Auto" means a scanner can flag it; everything
else needs a person or a scripted interaction. New in 2.2 is marked **(2.2)**.

## Structure and semantics

| Check | Criterion | How |
| --- | --- | --- |
| Page has a unique, descriptive `<title>` and `lang` | 2.4.2, 3.1.1 | Auto + read |
| Landmarks: one `main`, labelled `nav`s, header/footer where used | 1.3.1 | Accessibility tree |
| Headings form a logical outline; no skipped levels used for styling | 1.3.1, 2.4.6 | Heading list |
| Lists, tables and their headers use real markup | 1.3.1 | Auto + inspect |
| Reading order matches visual order | 1.3.2 | Disable CSS or linearize |
| Language changes inside the page are marked | 3.1.2 | Inspect |

## Names, roles, states

| Check | Criterion | How |
| --- | --- | --- |
| Every control has an accessible name; visible label text is part of it | 4.1.2, 2.5.3 | Auto + tree |
| Icon-only buttons are named; decorative images use empty `alt` | 1.1.1 | Auto + review |
| Informative images and charts have text alternatives with the same meaning | 1.1.1 | Review |
| Toggles, tabs, accordions and menus expose state (`aria-expanded`, `aria-selected`, `aria-pressed`) | 4.1.2 | Tree while operating |
| Async results, toasts and validation summaries are announced (live region or focus move) | 4.1.3 | Screen reader |

## Keyboard and focus

| Check | Criterion | How |
| --- | --- | --- |
| Everything operable by keyboard, no traps | 2.1.1, 2.1.2 | Manual pass |
| Focus order follows meaning | 2.4.3 | Manual pass |
| Focus indicator is always visible | 2.4.7 | Manual pass |
| Focused element is not fully hidden by sticky headers, banners or chat widgets **(2.2)** | 2.4.11 | Tab through with sticky UI present |
| Skip link or landmark navigation bypasses repeated blocks | 2.4.1 | Manual |
| Dialogs move focus in, contain it, close on Escape and return focus | 2.1.2, 2.4.3 | Manual |
| Single-character shortcuts can be turned off or remapped | 2.1.4 | Manual |

## Forms

| Check | Criterion | How |
| --- | --- | --- |
| Inputs have programmatic labels and instructions | 1.3.1, 3.3.2 | Auto + tree |
| Errors are identified in text, associated with the field and suggest a fix | 3.3.1, 3.3.3 | Submit invalid data |
| Autocomplete tokens on personal-data fields | 1.3.5 | Inspect |
| Information already entered in a flow is not requested again **(2.2)** | 3.3.7 | Walk the flow |
| Login does not require a cognitive test (allow paste, password managers, or an alternative) **(2.2)** | 3.3.8 | Try paste and autofill |
| Legal and financial submissions can be reviewed, corrected or reversed | 3.3.4 | Walk the flow |

## Visual

| Check | Criterion | How |
| --- | --- | --- |
| Text contrast 4.5:1, large text (24px, or 18.66px bold) 3:1 | 1.4.3 | Measure computed colors, including over images |
| Controls, focus rings, chart lines and input borders 3:1 against adjacent colors | 1.4.11 | Measure |
| Color is not the only signal (links, errors, status, charts) | 1.4.1 | Grayscale view |
| Content works in forced-colors / high-contrast mode | 1.4.11 (best practice) | Emulate forced colors |
| Help mechanisms appear in the same relative place on every page **(2.2)** | 3.2.6 | Compare pages |

## Zoom, reflow and text

| Check | Criterion | How |
| --- | --- | --- |
| Text resizes to 200% without loss | 1.4.4 | Browser zoom |
| At 320 CSS px wide, no two-dimensional scrolling except data tables, maps and similar | 1.4.10 | Narrow viewport |
| Overriding line height 1.5, paragraph spacing 2x, letter spacing 0.12em, word spacing 0.16em loses nothing | 1.4.12 | Text-spacing bookmarklet or stylesheet |
| Content on hover or focus is dismissible, hoverable and persistent | 1.4.13 | Manual |
| Works in portrait and landscape | 1.3.4 | Rotate or resize |

## Pointer, motion and timing

| Check | Criterion | How |
| --- | --- | --- |
| Targets at least 24x24 CSS px, or spaced so a 24px circle doesn't overlap neighbors **(2.2)** | 2.5.8 | Measure |
| Drag interactions have a single-pointer alternative **(2.2)** | 2.5.7 | Manual |
| Multipoint or path gestures have a simple alternative | 2.5.1 | Manual |
| Actions fire on up-event or can be aborted | 2.5.2 | Manual |
| Moving, auto-updating content can be paused | 2.2.2 | Manual |
| Nothing flashes more than 3 times per second | 2.3.1 | Review |
| `prefers-reduced-motion` removes non-essential motion without hiding content | 2.3.3 (AAA, expected practice) | Emulate the preference |
| Time limits can be extended or turned off | 2.2.1 | Manual |

## Severity guide

- **Blocker:** a user group cannot complete the task (keyboard trap, unlabelled submit, CAPTCHA with no alternative).
- **Serious:** completion is very hard or error-prone (missing error association, invisible focus).
- **Moderate:** extra effort or confusion (skipped heading levels, weak link text).
- **Minor:** polish with limited impact.
