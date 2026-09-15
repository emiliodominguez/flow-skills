---
name: ed-migrate
description: "Apply a known API or pattern transformation across a repository with an explicit site inventory, variant handling and per-site evidence. Use for repetitive cross-file migrations after the desired transformation is understood. Invoke as /ed-migrate in Claude Code or $ed-migrate in Codex. Hands off to /ed-review or /ed-orchestrate for dependent migration phases."
---

> Host syntax: `/skill-name` in Claude Code; `$skill-name` in Codex. Use the host spelling for handoffs.

# Migrate

Prove a canonical transformation, then account for every affected site. A migration is complete
when its inventory reconciles, including intentionally retained exceptions.

## Process

1. Read the target contract, supported versions, consumers and repository gates. Establish the
   baseline and preserve dirty work. Use an isolated branch/worktree when needed for a broad
   change; start it from the correct revision and account for required uncommitted inputs.
2. Enumerate actual sites and variants before editing. Distinguish source files from generated
   output, dynamic/configuration uses and external consumers. Record the denominator so
   progress has a meaning beyond "many files changed".
3. Implement one canonical example and verify its behavior, failure path and relevant callers.
   Capture variants that cannot safely use the same rewrite.
4. For repeatable mechanical work, prefer a pinned parser/codemod when syntax requires it;
   use a narrow textual transformation only when its preconditions make that reliable. Preview
   the diff and check rerun/idempotency behavior where the migration must be repeatable.
5. Apply in bounded groups. Use disjoint file ownership and separate worktrees for parallel
   workers when available and authorized; shared files and lockfiles require serialized writes.
   Each worker returns per site outcomes and evidence before integration.
6. Run project-aware checks with the real configuration, not a standalone compiler invocation
   that ignores tsconfig or equivalent project settings. Verify integrated interfaces and any
   required expand/migrate/contract compatibility stages.
7. Search for residual old patterns and reconcile every site: migrated, intentionally retained,
   not applicable, or blocked with a reason. Remove old support only when consumers permit it.

## Anti-patterns

- A global replacement before validating a representative case and its variants.
- Editing generated files without their generators or forgetting dynamic consumers.
- Calling a sweep complete without an inventory denominator and residual search.
- Combining unverified parallel changes and assuming isolated green tests cover integration.

## Done when

- The inventory accounts for every site and exception.
- The canonical transformation and integrated result meet the compatibility contract.
- Required checks and blocked consumers are recorded at the current revision.

Use /ed-review for the completed diff or /ed-orchestrate for further dependent migration phases.
