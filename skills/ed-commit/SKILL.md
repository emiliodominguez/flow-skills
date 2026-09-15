---
name: ed-commit
description: "Inspect the intended change and write a conventional commit message, or stage and create an atomic commit when requested. Message-only requests do not mutate Git state. Invoke as /ed-commit in Claude Code or $ed-commit in Codex. Hands off to /ed-ship when pushing or a pull request is part of the user request."
---

> Host syntax: `/skill-name` in Claude Code; `$skill-name` in Codex. Use the host spelling for handoffs.

# Commit

Make one logical change understandable from history. First distinguish a message draft from
permission to stage or commit; pushing and opening a PR are separate requested outcomes.

## Process

1. Inspect branch, status, staged changes, unstaged changes and relevant untracked files.
   Read the actual index with `git diff --cached`; `git diff` alone misses staged content.
   Preserve unrelated user staging and working files.
2. Group changes by intent. Include required tests, generated artifacts and docs with the
   behavior they support. Do not split an inseparable change just to minimize file count.
3. Draft a conventional subject: `type(scope): imperative description`. Use the repository's
   allowed types, scopes, length and language. Describe the effect, not a file inventory.
4. Explain the why in the body when it is not obvious. State constraints, significant tradeoffs,
   and breaking-change migration information. Do not invent historical rationale or claim checks
   that are unrun. Follow this repository's no Co-Authored-By / generated-credit convention.
5. For a message-only request, return the message and stop. For an authorized commit, stage only
   the intended paths/hunks. Use `git add -p` when interactive selection is available; in a
   noninteractive host, use scoped paths or carefully inspected patches rather than hanging.
6. Inspect the final index, run the required gate and commit. Hooks must run. A failed plain
   commit creates no new commit, so a later retry must not amend the previous good commit.
   An interrupted explicit amend needs its actual HEAD state checked before retrying.
7. Verify the resulting commit contents and remaining worktree state. Report the SHA and scope;
   do not claim it is pushed unless the remote confirms it.

## Anti-patterns

- `git add .` when the index or working tree contains unrelated changes.
- Mutating Git for "write me a commit message".
- Bypassing hooks, weakening checks, or amending an unrelated earlier commit after failure.
- Shell interpolation of a generated multi-line message; use a file or structured argument.

## Done when

- The message accurately describes one logical change and its reason.
- If committing is requested, the committed index matches the intended scope and passes
  required checks, with unrelated changes preserved.

Use /ed-ship only for delivery actions already included in the user's request.
