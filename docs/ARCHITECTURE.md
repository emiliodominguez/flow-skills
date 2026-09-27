# Architecture

This repository owns skill content and the checks that keep it portable. It does not ship an
installer. The open [skills CLI](https://skills.sh) discovers `skills/` and copies each skill
folder, supporting files included, into whichever agents the user picks.

## Layout

| Path                                              | Purpose                                                              |
| ------------------------------------------------- | -------------------------------------------------------------------- |
| `skills/<name>/`                                  | The source of truth: `SKILL.md` plus optional `references/*.md`      |
| `profiles.json`                                   | Named skill sets, passed to `npx skills add --skill`                 |
| `install.sh`, `uninstall.sh`, `scripts/common.sh` | Thin wrappers over `npx skills add/remove`: profiles, legacy cleanup |
| `.claude-plugin/`                                 | Optional plugin-marketplace manifests, versioned with `package.json` |
| `src/`                                            | Authoring CLI (`pnpm skills list`, `validate`, `new`)                |
| `scripts/gen-skill-docs.ts`                       | Generates the catalog, skill graph, per-skill pages and llms.txt     |
| `scripts/smoke-install.sh`                        | Real `npx skills` install and removal in a throwaway project         |
| `scripts/eval-llm.ts`, `scripts/prepare-eval.ts`  | Optional model audit and scenario fixtures                           |
| `test/`, `evals/`                                 | Unit tests, instruction markers, agent scenarios                     |

## Portability contract

- **Frontmatter:** only fields from the [Agent Skills specification](https://agentskills.io/specification)
  (`name`, `description`, `license`, `compatibility`, `metadata`, `allowed-tools`). Any
  agent-specific extension is a validation error, so every agent reads a skill the same way.
- **Body:** names no product, tool or model and uses no invocation syntax. Skills refer to each
  other by backticked name (`` `flow-verify` ``), and each agent applies its own syntax.
- **Supporting files:** situational detail goes in `references/<topic>.md`. The body links to the
  file and says when to read it, and the file is copied along with the skill.

## Validation

`pnpm validate` checks the whole corpus in one pass. A YAML error is reported as an issue and
doesn't stop the scan.

**Errors** (always fail):

- malformed YAML, or a missing, mismatched, non-kebab-case or over-64-character `name`
- a missing, multi-line or over-1,024-character `description`
- frontmatter fields outside the spec, a `metadata` value that is not a string, or a missing or
  unknown `metadata.stage`
- broken `references/` links, and backticked `flow-*` names that match no skill (checked in
  bodies, descriptions and references)
- an empty corpus, or descriptions totaling more than 8,000 characters
- profile members that don't exist, `plugin.json` version drift from `package.json`, or a
  marketplace entry that doesn't point at `./`

**Warnings** (fail only with `--strict`):

- a description over 280 or under 80 characters, or one without a handoff clause
- a body over 500 lines or about 5,000 tokens
- filler words, or a missing `Done when` or anti-patterns section

The description budgets exist because every installed description stays in the agent's context,
and many agents cap the size of their skill index.

## Generated docs

`pnpm docs:gen` writes `docs/SKILLS.md`, `docs/SKILL-MAP.md`, `docs/skills/` and the root [`llms.txt`](https://llmstxt.org) index that agents and crawlers can read. The skill graph
is built by `src/core/graph.ts`: edges come from each description's closing clause (`Hands off to`,
`Hands back to`, `Routes to` or `Feeds`), and groups come from `metadata.stage`. `SKILL-MAP.md`
shows a stage overview, the full graph and a table, and each skill page shows its own neighborhood,
all as Mermaid diagrams that GitHub renders inline. `pnpm docs:check` reports stale or obsolete output without writing anything.

## Tooling notes

- TypeScript runs through Node's `--import tsx` loader, so there is no build step.
- The package is marked `private` only to prevent an accidental npm publish. Users install from GitHub.
- Instruction markers and the optional model audit check wording, not behavior. Real agent
  decisions are assessed with isolated scenarios; see [evals](../evals/README.md).
