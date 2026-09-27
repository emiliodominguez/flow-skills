# Design notes

Why the suite works the way it does. Last reviewed against primary sources on 2026-09-27. A new
practice is adopted only when it solves a problem actually seen in this repository.

## What changed and why

| Earlier assumption                                  | Current behavior                                                    |
| --------------------------------------------------- | ------------------------------------------------------------------- |
| Every review needs a fixed multi-agent panel        | Choose review lenses and delegation from the actual scope and risk  |
| Fresh sessions are mandatory and always cheaper     | Persist plans; continue or start fresh depending on the context     |
| A worker's green report completes a dependent phase | Require independent acceptance when the plan declares it            |
| Static types make runtime guards redundant          | Trace where input really comes from and check boundary invariants   |
| A combined worktree diff covers the index           | Inspect committed, staged, unstaged and untracked layers separately |
| Any matching prediction confirms a cause            | Use discriminating experiments and keep uncertainty visible         |
| Every major dependency moves alone                  | Upgrade tightly coupled compatibility groups together               |
| A shorter animation handles reduced motion          | Preserve content, final state, cancellation and cleanup explicitly  |
| Ignored plans and handoffs are portable             | Say an artifact is local-only unless it is actually shared          |
| A prompt judge or substring check proves behavior   | Keep instruction checks separate from real isolated task runs       |
| Skills target a couple of named agents              | Skills are agent-agnostic and install into any supported agent      |
| Long descriptions improve activation                | Short descriptions within a corpus budget; detail in `references/`  |

## Token budget

Every installed skill's description is loaded into each session, and many agents cap the total
size of their skill index (some at about 8,000 characters, shortening or dropping skills past
it). So the suite keeps each description near 200 characters and the whole corpus under 8,000.
Bodies load only when a skill runs. Material that only some runs need, such as orchestration
run records, plan execution fields, delegated-worker details and native agent configuration,
lives in `references/` and loads on demand.

## Compatibility decisions

- **Spec-only frontmatter.** Agent-specific extensions (invocation controls, forked contexts,
  argument hints, per-agent policy files) would make a skill behave differently from one agent to
  the next. Rules about independence and authorization are written in the body instead.
- **Models stay with the runtime.** Skills never name a model. The optional instruction audit
  needs an explicitly configured model rather than a hardcoded alias.
- **Tooling moves in compatible groups.** TypeScript 7 waits until `typescript-eslint` supports
  it, and Vitest moves together with its coverage provider.
- **Node.js tracks the active LTS** (24, pinned in `.nvmrc`). `@types/node` stays on the same major so code cannot use APIs the runtime lacks.

## Sources

**Formats and distribution**

- [Agent Skills specification](https://agentskills.io/specification): metadata, directory layout and progressive disclosure.
- [skills CLI](https://github.com/vercel-labs/skills): discovery, multi-agent installation, updates and removal.
- Agent vendors' skill authoring guides, for description limits, index budgets and optional plugin channels.

**Engineering practice**

- [Git diff](https://git-scm.com/docs/git-diff) and [Git push](https://git-scm.com/docs/git-push): index comparisons and force-with-lease.
- [Google SRE troubleshooting](https://sre.google/sre-book/effective-troubleshooting/): competing hypotheses and diagnostic uncertainty.
- [TypeScript assertions](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-assertions): static assertions add no runtime validation.
- [Motion configuration](https://motion.dev/docs/react-motion-config) and [scoped animation](https://motion.dev/docs/react-use-animate): reduced-motion policy and cleanup.
- [CSS cascade layers](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@layer): layered and unlayered precedence.

Ronie Uliana's _The Orchestrator Pattern: Managing AI Work at Scale_ (2026-01-27) motivated
explicit goals, phase gates and specialist roles. This suite adds bounded retries, stale-evidence
handling, capability checks and concrete run records. The prompts are original.

## Migration from agent-skills (ed-\*)

The project used to be called `agent-skills`, with `ed-*` skills and its own installer. Both are retired.

| Before                                   | Now                                               |
| ---------------------------------------- | ------------------------------------------------- |
| `ed-<name>`                              | `flow-<name>`                                     |
| `ed-prune-claude-setup`                  | `flow-prune-agent-setup` (works with any agent)   |
| `pnpm skills install --profile core`     | `./install.sh --profile core` or `npx skills add` |
| `pnpm skills uninstall`                  | `./uninstall.sh` or `npx skills remove`           |
| `pnpm skills sync`                       | `npx skills update`                               |
| `agent-skills.config.json` profiles      | `profiles.json`                                   |
| Generated rule files for rule-only tools | Native skill folders via the skills CLI           |

`./install.sh` and `./uninstall.sh` clean up old `ed-*` installs first. They remove only symlinks
into a `skills/ed-*` source and copies carrying the old `.agent-skills` marker, and touch nothing
else. Preview with `./uninstall.sh --legacy-only --dry-run`. Rule files and managed blocks the old
installer wrote for rule-only tools are not removed automatically; delete those by hand.

## Test limits

- Unit tests cover validation, reporting and the authoring commands.
- `pnpm smoke` runs a real `npx skills` install and removal for several agents in a throwaway
  project. It checks files on disk, not live agent sessions.
- Isolated scenario runs check selected high-impact decisions, not every agent or task.
