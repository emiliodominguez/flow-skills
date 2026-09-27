---
"flow-skills": minor
---

Add model-backed evals: `pnpm eval:triggers` scores routing from the description index against four positive prompts and three near misses per skill (`evals/triggers.json`), and `pnpm eval:ab` answers cases with and without the skill and flags assertions that pass either way (`evals/ab.json`). Sharpen overlapping descriptions found by routing runs, add a deadline-pressure red flag to flow-test, a message-only mode decision and user-visible-effect example to flow-commit, and an up-front proof check to flow-diagnose.
