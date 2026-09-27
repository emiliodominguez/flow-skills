# flow-skills

[![Skills: 28](https://img.shields.io/badge/skills-28-2ea44f?style=for-the-badge&labelColor=161b22&logo=markdown&logoColor=white)](docs/SKILLS.md)
[![Agent Skills: spec compliant](https://img.shields.io/badge/Agent%20Skills-spec%20compliant-8250df?style=for-the-badge&labelColor=161b22&logo=bookstack&logoColor=white)](https://agentskills.io/specification)
[![Agents: any](https://img.shields.io/badge/agents-any-0969da?style=for-the-badge&labelColor=161b22&logo=probot&logoColor=white)](https://github.com/vercel-labs/skills)
[![Install: npx skills add](https://img.shields.io/badge/npx-skills%20add-cb3837?style=for-the-badge&labelColor=161b22&logo=npm&logoColor=white)](https://skills.sh)
[![License: MIT](https://img.shields.io/badge/license-MIT-3da639?style=for-the-badge&labelColor=161b22&logo=opensourceinitiative&logoColor=white)](LICENSE)

Portable workflow skills for AI coding agents: plan, build, verify and ship with evidence.

---

**flow-skills** is a set of 28 [Agent Skills](https://agentskills.io) for everyday software work:
exploring ideas, planning, implementing, testing, reviewing, verifying, delivering and maintaining.
Each skill is a plain `SKILL.md` folder that follows the open specification, so any agent that
supports skills can use it.

- **Agent-agnostic.** Skills name no product, tool or model and use only spec frontmatter. The same
  files behave the same way wherever they're installed.
- **Light on context.** Descriptions average about 250 characters and stay under 7,000 in total.
  Detailed guidance loads only when a skill runs.
- **Evidence over claims.** Every skill ends with observable checks. Larger work can pass through
  independent `ACCEPT` / `REJECT` / `BLOCKED` gates.

## Quick start

```sh
npx skills add emiliodominguez/flow-skills
```

The [skills CLI](https://skills.sh) detects the agents on your machine, asks which skills to install,
and places them in each agent's own skills directory. Then describe the task to your agent, or call a
skill by name using your agent's invocation syntax:

```text
flow-plan Add account export with explicit acceptance criteria and non-goals.
```

## Install options

| Goal                                | Command                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------ |
| Pick skills and agents in a prompt  | `npx skills add emiliodominguez/flow-skills`                             |
| Install for your user, not the repo | `npx skills add emiliodominguez/flow-skills -g`                          |
| Target specific agents, no prompts  | `npx skills add emiliodominguez/flow-skills -a <agent>... -y`            |
| Install specific skills             | `npx skills add emiliodominguez/flow-skills --skill flow-plan flow-work` |
| See what is available               | `npx skills add emiliodominguez/flow-skills --list`                      |
| Update or remove later              | `npx skills update` / `npx skills remove`                                |

Agent ids come from the [skills CLI](https://github.com/vercel-labs/skills). You can
also copy any `skills/<name>/` folder into your agent's skills directory by hand.

### Profiles

Install only the part of the workflow you use. Profiles are defined in [`profiles.json`](profiles.json).

| Profile         | Skills (without the `flow-` prefix)                                                                |
| --------------- | -------------------------------------------------------------------------------------------------- |
| `core`          | plan, work, test, review, commit, ship, handoff                                                    |
| `orchestration` | plan, orchestrate, verify, repo-brief, specialize, work, review, handoff                           |
| `frontend`      | styles, animate, prototype                                                                         |
| `review`        | review, adversarial-review, simplify, refactor                                                     |
| `maintenance`   | deps, diagnose, triage, benchmark, refactor, simplify, migrate, git-fix, pr-fix, prune-agent-setup |

From a clone, the wrapper scripts accept profiles and pass everything after `--` to `npx skills`:

```sh
./install.sh --profile core --profile review   # user scope; the CLI asks which agents
./install.sh --project -- -a <agent> -y        # current project, one agent
./uninstall.sh --dry-run                       # preview removing every flow-* skill
```

### More options

- `./install.sh --local` installs from your clone instead of GitHub.
- `./uninstall.sh --profile <name>` removes a single profile.
- Both scripts first remove leftovers from the retired `agent-skills` installer (the old `ed-*`
  symlinks and marked copies); `./uninstall.sh --legacy-only` does only that. See the
  [migration notes](docs/PRACTICES.md#migration-from-agent-skills-ed-).
- The `.claude-plugin/` folder also lets agents that read that marketplace format install the suite
  as a plugin. Plugin managers usually namespace skill names, so `npx skills` stays the recommended path.

## Pick a skill

| When you need to...                             | Use                                                                        |
| ----------------------------------------------- | -------------------------------------------------------------------------- |
| Explore an idea or test a hypothesis            | `flow-brainstorm`, `flow-prototype`                                        |
| Understand a repository                         | `flow-onboard`, `flow-repo-brief`                                          |
| Turn a goal into an executable plan             | `flow-plan`                                                                |
| Implement and test a bounded change             | `flow-work`, `flow-test`                                                   |
| Run dependent tasks with independent acceptance | `flow-orchestrate`, `flow-verify`, `flow-specialize`                       |
| Review or improve code                          | `flow-review`, `flow-adversarial-review`, `flow-refactor`, `flow-simplify` |
| Upgrade, migrate or measure                     | `flow-deps`, `flow-migrate`, `flow-benchmark`                              |
| Investigate a failure                           | `flow-triage`, `flow-diagnose`                                             |
| Commit, ship and handle review feedback         | `flow-commit`, `flow-ship`, `flow-pr-fix`, `flow-git-fix`                  |
| Polish UI or documentation                      | `flow-styles`, `flow-animate`, `flow-docs`                                 |
| Pause work or tidy your agent setup             | `flow-handoff`, `flow-prune-agent-setup`                                   |

A typical path is `flow-plan` → `flow-work` → `flow-review` → `flow-ship`. Small changes can start at
`flow-work`. Each skill ends by naming the next one; the [skill graph](docs/SKILL-MAP.md) shows every route.

Skills are instructions only. Installing one starts no process, registers no agent and grants no permission.

## Documentation

| Read                                   | To learn                                                     |
| -------------------------------------- | ------------------------------------------------------------ |
| [Workflow](docs/OVERVIEW.md)           | Which flow fits a task, and how contracts and evidence work  |
| [Orchestration](docs/ORCHESTRATION.md) | A worked example of a gated, resumable multi-step run        |
| [Skills catalog](docs/SKILLS.md)       | Every skill's description, with a full page for each         |
| [Design notes](docs/PRACTICES.md)      | Sources, compatibility decisions, token budget and migration |
| [Authoring](docs/AUTHORING.md)         | How to write a good skill for this suite                     |
| [Architecture](docs/ARCHITECTURE.md)   | Repository layout and what validation enforces               |
| [Evaluations](evals/README.md)         | What the tests prove, and how to run real agent scenarios    |

## Contributing

```sh
pnpm install --frozen-lockfile
pnpm check        # format, lint, types, skill validation, tests, docs
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the skill workflow and changesets.

## License

[MIT](LICENSE)
