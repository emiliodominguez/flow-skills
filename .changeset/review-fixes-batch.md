---
"@emiliodominguez/agent-skills": patch
---

Review fixes on the 0.4.0 feature batch:

- **Skill map**: correct a mis-parsed handoff edge — `ed-pr-fix` now maps to `ed-ship` (not a bogus `ed-work`). The handoff-verb regex is word-boundaried (so "feeds" no longer matches inside "feedback") and also recognises "hands back to".
- **Release hardening**: the npm token is scoped to the publish step only (was exposed to install/build), `changesets/action` is pinned to a commit SHA, and the pre-publish typecheck/lint/validate/test gate is restored so a red commit can't ship.
- **`eval:llm`**: tolerates fenced/trailing judge output when extracting the JSON verdict array, and guards the error-body parse.
- **Completion drift-guard**: `buildProgram()` is extracted to `src/cli.ts` and a test asserts the shell-completion command list matches the registered CLI commands.
- **Internal**: the `/skill` reference parser is shared between the linter and the map generator, and install scopes are single-sourced across the CLI option, interactive picker, and completion.
