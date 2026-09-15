# Authoring skills

Write the information that changes an agent's decisions. Assume the agent understands ordinary
coding; avoid copied manuals, repeated global rules and universal solutions to local failures.

## Contract

Scaffold with `pnpm skills new <name>`. Keep portable frontmatter to `name` and `description`.
Names match the directory, use kebab-case and contain at most 64 characters. Descriptions stay
within 1024 characters, front-load the use case, name both `/skill` and `$skill`, and include
real handoffs using `hands off to`, `hands back to`, `routes to` or `feeds`.

Descriptions are discovery metadata, not a place for an entire workflow. Prefer concise,
discriminating triggers and boundaries. In the body include the outcome, necessary process,
likely failure modes, evidence and a `Done when` gate. A small skill needs no extra resources.

## Execution rules

- Follow current user intent and repository requirements; preserve an existing authorization.
- Use actual host capabilities. Skills, agents, tools and model names are different resources.
- Delegate useful independent work only when available and authorized. Define write ownership.
- For retrying work, specify finite stop conditions and preserve attempts across handoffs.
- Distinguish worker checks, independent acceptance, broad review and delivery authorization.
- Follow the user's artifact location and tracking policy. Ignored files do not travel with Git.
- Verify current official documentation or pinned source for unstable APIs and configuration.

Use a concise self-contained body where practical. Native targets copy/link supporting
resources, but rendered targets currently export only body and description. A required relative
reference or script therefore needs adapter support before a skill relying on it is portable.
Do not add hidden dependencies on sibling skills that may not be installed; provide a meaningful
fallback or state the needed capability.

## Evaluation

Add 3-5 instruction markers to `evals/beats.json`. These are inexpensive wording regressions,
not proof of agent behavior. For a complex skill, execute representative requests in isolated
fixtures using a fresh worker and minimal task context. Give expected outcomes only to the
assessor, not the worker. Record the actual result and revise demonstrated failures.

Test both intended triggers and nearby requests that should stay outside the skill. Include
missing evidence, changed inputs, interruption, permission boundaries and small-task routing
where they affect the workflow. See [evaluation cases](../evals/README.md).

## Before committing

Run the repository gate in [AGENTS.md](../AGENTS.md), regenerate docs with `pnpm docs:gen`,
and check them with `pnpm docs:check`. Inspect the generated result and test native installs
in an isolated project. Keep strict formatting, padding and JSDoc conventions intact.
