---
name: ed-specialize
description: "Create a repository-specific worker brief and matching verifier brief from inspected code, conventions, and a bounded task. Use when generic coding agents repeatedly miss local architecture, strict lint rules, or domain contracts. Generate native agent configuration only when requested for an identified host. Invoke as /ed-specialize in Claude Code or $ed-specialize in Codex. Feeds /ed-orchestrate or /ed-work with a grounded specialist contract."
---

> Host syntax: `/skill-name` in Claude Code; `$skill-name` in Codex. Use the host spelling for handoffs.

# Specialize a worker

Turn repository evidence into a focused execution brief. Specialization supplies the right
constraints and checks; it does not grant tools, register an agent, or override user scope.

## Phase 1: Establish the evidence

Read the target task, applicable repository instructions, configuration, and representative
implementation and test files. Reuse a current /ed-repo-brief if available, reopening the
sources for each relevant constraint. If the brief is stale or the task is ambiguous, resolve
that gap before writing a confident specialist profile.

Distinguish enforced rules from precedent and preferences. For example, copy actual
EditorConfig, Prettier, ESLint/Stylelint, type boundary, and documentation rules when present;
do not invent DDD, a logging library, a build chain, or function syntax because another repo
uses them. Include deliberate exceptions where local code demonstrates them.

## Phase 2: Produce two bounded briefs

Write to the user's chosen location or `.plans/specialists/<topic>/`. Create `worker.md`
and `verifier.md`. Keep the roles separate and link their common evidence.

The **worker brief** includes:

- Purpose, matching task types, and explicit exclusions.
- Repository revision, source citations, relevant files/symbols, and input dependencies.
- Allowed write set and external actions; shared files requiring coordination.
- Implementation conventions that affect this task, with provenance and exceptions.
- Expected deliverable, behavioral acceptance, exact local commands, and evidence format.
- Stop conditions and correction budget inherited from the plan; report scope conflicts.
- Output: actual changes and revision, checks run/results, open questions, and artifact path.

The **verifier brief** includes:

- The same unchanged acceptance criteria and downstream use.
- Independent read access to the implementation, tests, and raw outputs.
- Pragmatic or production profile, with relevant runtime and repository quality gates.
- A prohibition on changing deliverables or accepting the worker's claims without evidence.
- The /ed-verify verdict format, including BLOCKED for missing prerequisites.

Do not preload either role with the desired verdict or tell it to ignore defects to meet a
schedule. Do not make the verifier a copy of the worker prompt with "review" appended.

## Phase 3: Bind to the actual host

Default to portable Markdown briefs. They can be supplied to an available agent, or used by
/ed-work directly. Check available specialists before introducing a redundant role.

If the user requests native agent files, inspect existing configuration and current official
host documentation before generating them. Keep host-specific tool names, model identifiers,
and configuration fields out of the portable briefs. Preserve existing files and permissions;
never enable broader tool access as a convenience. A generated file is a draft until the host
actually discovers it. Report discovery/registration separately from file creation.

In Claude Code, skills and subagents are different resources. Do not assume a subagent can
spawn further subagents or inherits the parent's loaded skills; verify current host behavior
and explicitly supply required context. In Codex, use the actual delegation/configuration
capabilities of the active runtime rather than inventing an equivalent YAML schema.

## Phase 4: Exercise the specialist

When delegation is available and authorized, give the worker a small realistic task in an
isolated fixture and give a different verifier its raw result plus the acceptance contract.
Keep expected answers out of the worker context. Inspect output and evidence, then fix only
observed gaps in the briefs. Do not affect production systems to test a prompt. If an
independent run is unavailable, label the briefs untested instead of claiming effectiveness.

## Anti-patterns

- A role consisting of "you are a world-class senior engineer" plus generic best practices.
- Installing or registering agents when the user asks only for a reusable brief.
- Pinning a model/tool name without checking host support.
- Silently relaxing repository gates to make a generated specialist succeed.

## Done when

- Worker and verifier briefs are grounded in current repository evidence and task scope.
- Write ownership, acceptance, stop conditions, and evidence outputs are explicit.
- Validation and host-registration status are reported accurately.

Hand the briefs to /ed-orchestrate for coordinated work or /ed-work for a bounded direct task.
