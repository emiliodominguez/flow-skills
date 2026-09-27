---
name: flow-pr-fix
description: "Address pull-request review feedback with traceable fixes and verified published state; push, replies and thread resolution stay within what the user authorized. Use when a PR has review comments. Hands back to `flow-review` or `flow-ship`."
---

# Fix PR feedback

Map every thread with actionable feedback to a disposition and evidence. Never announce or resolve a fix reviewers cannot see on the published revision.

## Process

1. Resolve the exact repository and PR, base and head, current commit SHA, and local work state. Read the description, reviews, threads, and checks, following pagination. Track resolved, outdated, and already-addressed feedback so reruns do not duplicate replies.
2. Normalize conversations:
   - Keep the root review comment ID separate from the GraphQL thread ID. Review replies target the root comment, never another reply.
   - Issue comments and review threads are different channels.
   - Use connected tools or `gh api` only when available and authorized, with current API shapes.
3. Group by intent and classify each item: fix, already fixed, needs evidence, disagreement, or out of scope. Resolve reviewer conflicts against contracts and source; ask only about a consequential, genuinely ambiguous decision.
4. Make logical changes, preserving unrelated staging and work. Run relevant tests and repository gates; review substantive behavior changes. Keep unsquashed fix commits when review practice needs traceability; do not rewrite public history by default.
5. Build a response map: thread and root ID, disposition, exact change, commit or file evidence, validation. A local-only request ends here with local fixes and reply drafts.
6. When publishing is authorized, push and confirm the remote head contains the fix. Only then, if replies or resolution are also authorized, post concise evidence-backed responses and resolve fully addressed threads. Leave disagreements and missing evidence open. After an uncertain response, check whether the action succeeded before retrying.
7. Re-fetch the PR and confirm what is published, answered, resolved, or pending. Judge checks on the latest head, not an earlier green commit.

## Anti-patterns

- Replying "fixed" with an unpublished SHA, or resolving before a push succeeds.
- Treating every historical thread as new work, or replying to a reply ID.
- Accepting every suggestion without checking the behavior contract.
- Sending comments or reviewer notifications just because code changes were authorized.

## Done when

- Every thread with current actionable feedback has a clear disposition.
- Requested fixes are verified and their publication status is accurate.
- Authorized replies and resolutions cite visible evidence; disagreements stay open.

Use `flow-review` for affected behavior or `flow-ship` for the remaining authorized delivery action.
