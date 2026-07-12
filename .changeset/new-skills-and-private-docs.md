---
"@emiliodominguez/agent-skills": minor
---

Two new skills, plus repo guidance:

- **`ed-deps`** — update dependencies to latest safely: inventory what's outdated, read the changelog for every major before bumping it, upgrade one at a time behind the test gate, and record anything held back with a reason.
- **`ed-commit`** — author atomic, conventional commits: split unrelated work, pick the right type/scope, write an imperative subject and a body that explains the why.
- Added a repo-level `CLAUDE.md` encoding the project conventions (the gate, `docs:gen`-on-skill-change, the changesets flow) and realigned the README/docs to the private, versioning-only reality.
