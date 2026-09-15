---
name: ed-prune-claude-setup
description: "Audit and curate user-owned Claude Code or Codex instructions, memories, configuration, plugins and skills using effective scope and provenance. Use to remove stale or conflicting setup entries; caches, history and backups are outside scope. Invoke as /ed-prune-claude-setup in Claude Code or $ed-prune-claude-setup in Codex. Feeds /ed-handoff when unresolved setup decisions remain."
---

> Host syntax: `/skill-name` in Claude Code; `$skill-name` in Codex. Use the host spelling for handoffs.

# Prune an agent setup

Find stale or conflicting instructions and configuration, then apply the cleanup the user
authorizes. Preserve ownership, active scope and effective behavior instead of deleting by age.

## Phase 1: Discover effective sources

Identify the host and version, active project/profile, command-line overrides, and managed
layers before attributing behavior to a file. Read current official host documentation where
configuration locations or precedence are uncertain. Do not assume Claude and Codex use the
same schema or that every settings file is user-owned.

For Claude Code, inspect applicable CLAUDE.md, settings.json scopes and plugin configuration;
MCP definitions also use project `.mcp.json` and user/local entries in `~/.claude.json`.
For Codex, inspect applicable AGENTS.md and the actual active config/profile layers, including
managed/system and CLI overrides as read-only context. Locate personal skill ownership through
the host's supported manager. Avoid printing credentials from any configuration.

## Phase 2: Perform four audits

1. **Instructions:** stale paths, redundant or contradictory rules, procedures that belong in
   a focused skill, and rules already reliably enforced by tooling. Verify references first.
2. **Memory:** outdated facts and duplicates, with source/age and the intended consumer.
   Unknown relevance is not evidence for deletion; reconcile any maintained memory index.
3. **Settings and integrations:** effective values, obsolete connections and conflicting scopes.
   Distinguish allow, ask and deny entries; removing a protective rule changes behavior even
   when the associated tool has no recent usage.
4. **Skills/plugins:** overlap, routing quality, inactive workflows, ownership and actual host
   discovery. Inspect enabledPlugins where the host uses that field; do not infer the schema
   for another host. Separate installed links from source directories and host-owned bundles.

Parallel read-only audits are useful only when authorized and independent. Merge findings
into one punch list: exact item, source/owner, reason, evidence, consequence, confidence and
proposed action. Label uncertain candidates and false positives explicitly.

## Phase 3: Apply the requested scope

For an audit-only request, report the punch list. For an explicit cleanup, perform the authorized
reversible edits without asking again for every item. Request a decision only for consequential
uncertainty or destructive action not already authorized. Do not auto-delete unknown assets.

Back up settings that change, preserve unrelated keys, use the owning installer/plugin manager
where available, and validate the resulting format and effective behavior. Unlinking an
installation is different from deleting its source. An explicitly requested user-owned skill
removal should be completed through the supported mechanism, not replaced with an unsafe shell
command for the user to run. Do not edit managed/plugin-owned sources directly.

## Phase 4: Confirm behavior

Reinspect active values and discovery after changes. Explain removed/retained items and any
remaining conflicts. Distinguish disk changes from cached session/UI state; do not repeatedly
rewrite correct files because a current session has not refreshed its index.

## Anti-patterns

- Treating old or unused entries as proven obsolete.
- Auditing one settings file and claiming the entire effective setup is covered.
- Removing deny rules, plugin-owned assets, caches or history under a vague cleanup request.
- Repeated approval questions after the user already specifies the exact cleanup.

## Done when

- Findings are grounded in effective scope, provenance and a concrete behavioral consequence.
- Authorized changes validate and preserve unrelated setup; uncertain items remain explicit.
- Actual host discovery/effective state is checked, or its limits are reported.

Use /ed-handoff only if unresolved decisions or a later session need a continuation record.
