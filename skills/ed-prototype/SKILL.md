---
name: ed-prototype
description: Build throwaway code to answer a specific design question — a tiny runnable terminal app for state/logic questions, or several radically different UI variations toggleable from one route for visual questions. Use when the user says "prototype this", "let me play with it", "try a few designs", "sanity-check this state machine", or when invoked as /ed-prototype. Output is DISPOSABLE — meant to be thrown away once the question is answered. Hands off to /ed-brainstorm or /ed-plan with the answer.
---

# Prototype

A prototype is **throwaway code that answers ONE question.** The question decides the shape.

The output is never the production code. Resist the urge to "make it real" — that's what `/ed-plan` and `/ed-work` are for, with proper acceptance criteria. Prototypes exist to make the design conversation concrete, fast, then get thrown away.

---

## Pick the right branch

Ask first: **what's the ONE question?** Name it in a sentence before you write anything. If you can't, you're not ready to prototype — go back to `/ed-brainstorm`. If there are two questions, pick the one that unblocks the other and defer the rest.

### Branch A: State / logic / data model questions
"What does this state machine actually feel like?" "Can this data shape express what we need?" "How do these rules interact?"

→ Build a **runnable terminal app** (small CLI, tiny Node/Python script, REPL session). No UI distraction. Print the state, accept commands, iterate.

Optimise for:
- One file, executable in one command
- Logs the state at every step
- A loop the user can drive interactively
- Trivial to add or remove edge cases

### Branch B: Visual / interaction / aesthetics questions
"What does this layout feel like?" "Is this animation right?" "Which of these three menus is clearer?"

→ Build **2–4 radically different UI variations**, all toggleable from a single route or page. Differences should be obvious — different layouts, different interaction models, different visual hierarchies.

Do NOT build "the design with three small variants of the button color". That's a dial, not a prototype.

Optimise for:
- One route, switch variant via query param or button
- Each variant is a separate component file
- Use placeholder data — the design question is about *form*, not content
- Hardcode anything that isn't the question

---

## Rules

- **Write WORSE code than usual on purpose.** No abstractions, no error handling, no tests, no types beyond what makes the IDE happy. Refactoring a prototype is wasted time.
- **Keep it in a `prototypes/` or `playground/` folder** so it doesn't get confused with real code. (Branch B on a file-routed framework needs a real route to render — use a throwaway/dev-only route with its components under `playground/`, not wired into production navigation.)
- **Time-box it.** ~30–60 min for terminal, 1–2 hours for UI — but since an agent can't reliably feel elapsed time, watch the *observable* proxy: once you're past ~1–2 files or a second abstraction starts appearing, the question is too big — split it or narrow it.
- **Don't commit a prototype to the main branch** unless explicitly asked. A scratch branch or leaving it uncommitted is fine.

---

## Output

When the prototype is ready, present:

1. **How to run it** (one command).
2. **What to look for** — the specific question the prototype was built to answer.
3. **Your own observation** — what you noticed while building it that's worth surfacing.

---

## Closing the loop

The prototype isn't the deliverable. The **answer** is.

After the user has played with it:
- "Did this answer the question?" — if yes, capture the answer in 1–2 sentences.
- If no, what changed? Adjust the prototype, or admit it can't answer this question (sometimes the answer is: "we need to ship a real version to find out").
- **"This one's great, let's build on it"** — that means the DESIGN is settled, not that the scratch code ships. Restate the answer and hand to `/ed-plan` to rebuild it properly; the throwaway code still doesn't become the implementation.

Then either delete the prototype or move it to an `archive/` folder. **Don't let it linger as half-real code** that someone later mistakes for the plan.

---

## Anti-patterns

- ❌ "Prototype" that's actually a feature attempt with the production tech stack
- ❌ Three variants that differ in tiny details ("padding 12 vs 16") — that's a tweak, not exploration
- ❌ Adding tests to a prototype
- ❌ Refactoring the prototype before throwing it away
- ❌ Prototyping two questions at once so neither gets a clean answer
- ❌ Merging the prototype's code into the real implementation — start fresh from the answer

---

## Done when

- The ONE question has a captured answer in 1–2 sentences
- The user has run it and reacted (or explicitly declined to)
- The prototype is deleted or moved to `archive/` — nothing half-real left on the branch

Then say: **"Question answered: <answer>. Back to `/ed-brainstorm` to fold it into the design, or `/ed-plan` if the design's already settled."** Carry the ANSWER forward, never the code.
