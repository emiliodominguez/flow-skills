# Practice refresh and compatibility

Reviewed against current primary documentation on 2026-09-15. The suite keeps all original
skill names and the existing installer architecture. This is a behavior-focused refresh;
new features are adopted when they solve an observed problem in this repository.

## Changes across the suite

| Previous assumption                                    | Current behavior                                                     |
| ------------------------------------------------------ | -------------------------------------------------------------------- |
| Every review needs a fixed multi-agent panel           | Choose lenses and delegation from concrete scope and risk            |
| Fresh sessions are mandatory and automatically cheaper | Persist plans; continue or start fresh according to task context     |
| A worker's green report completes a dependent phase    | Require independent acceptance when the plan declares it             |
| Static types make runtime guards redundant             | Trace actual input provenance and boundary invariants                |
| A combined worktree diff covers the index              | Inspect committed, staged, unstaged and untracked layers separately  |
| Any matching prediction confirms a cause               | Use discriminating experiments and preserve uncertainty              |
| Every major dependency moves alone                     | Upgrade tightly coupled compatibility groups atomically              |
| Shorter animation duration handles reduced motion      | Preserve content, final state, cancellation and lifecycle explicitly |
| Ignored plans/handoffs are portable                    | State local-only availability unless the artifact is actually shared |
| A prompt judge or substring check proves behavior      | Separate instruction checks from actual isolated task runs           |

## Primary references

These references support the design choices; host capabilities still depend on the active
runtime and repository configuration.

- [Agent Skills specification](https://agentskills.io/specification): metadata, directory layout and progressive disclosure.
- [OpenAI skill authoring](https://learn.chatgpt.com/docs/build-skills): concise discovery descriptions and optional resources.
- [OpenAI subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents): bounded context and care with parallel writes.
- [Claude Code best practices](https://code.claude.com/docs/en/best-practices): executable verification and scoped context.
- [Claude Code skills](https://code.claude.com/docs/en/skills) and [subagents](https://code.claude.com/docs/en/sub-agents): distinct resources and host-specific configuration.
- [Git diff](https://git-scm.com/docs/git-diff) and [Git push](https://git-scm.com/docs/git-push): index comparisons and explicit force-with-lease expectations.
- [Git Town sync](https://www.git-town.com/commands/sync.html): scope and external effects of stack operations.
- [Google SRE troubleshooting](https://sre.google/sre-book/effective-troubleshooting/): competing hypotheses and diagnostic uncertainty.
- [TypeScript assertions](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-assertions): static assertions do not add runtime validation.
- [Motion configuration](https://motion.dev/docs/react-motion-config) and [scoped animation](https://motion.dev/docs/react-use-animate): reduced-motion policy and lifecycle cleanup.
- [CSS cascade layers](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@layer): layered and unlayered precedence.
- [Claude MCP scopes](https://code.claude.com/docs/en/mcp) and [Codex configuration](https://learn.chatgpt.com/docs/config-file/config-basic): effective configuration discovery.
- [Vitest 5 migration](https://vitest.dev/guide/migration/) and [TypeScript 6 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html): development-tool migration requirements.

The user-supplied article, Ronie Uliana's _The Orchestrator Pattern: Managing AI Work at Scale_
(2026-01-27), motivates explicit goals, phase gates and specialist roles. The implementation
adds bounded retries, stale-evidence handling, host capability checks and concrete run records.
The prompts are original and are not a verbatim copy of the article.

## Compatibility decisions

Shared skills keep only portable `name` and `description` frontmatter. Native Claude/Codex
installs preserve directories; generated rule/bundle exports do not emulate native subagent
configuration or copy supporting resources. Model selection stays with the active runtime.
The optional instruction judge requires an explicit available `ANTHROPIC_MODEL` rather than a
hardcoded model alias.

Development tools update in compatible groups. TypeScript 7 is held because the inspected
`typescript-eslint@8.70.0` peer range is `>=4.8.4 <6.1.0`; TypeScript 6 is the supported update.
Vitest and its coverage provider move together to version 5, requiring Node 22.12 or newer.
Repository package-manager resolution policy remains active; it is not bypassed to force a
newer package through.

## Review and test limits

All 24 previous skill bodies receive a full review and refactor; four dedicated skills are
added. Automated tests verify the installer, validation and reporting invariants. Independent
fixture runs verify selected high-impact decisions, not every possible host or task. Native
installation checks validate files/links; they do not claim real Claude Code or Codex CLI
sessions execute in an environment where those hosts are unavailable.

## Destination changes

Cursor's file adapter now uses the project rules location in either scope. Windsurf defaults
to `.devin/rules`, and Cline uses its current `.cline/rules` locations. Existing paths are not
deleted automatically. See [configuration](CONFIGURATION.md) for verified host sources and
migration instructions. These rules adapters remain distinct from native skill integrations.
