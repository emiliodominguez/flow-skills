# Authoring skills

A good skill contains the information that changes an agent's decisions, and nothing else. Assume
the agent already knows how to code; leave out copied manuals, general rules and advice any
capable agent follows anyway.

`pnpm validate` enforces the mechanical rules (see [Architecture](ARCHITECTURE.md#validation)).
This guide covers what it can't check.

## 1. Scaffold

```sh
pnpm skills new flow-<name> -d "What it does. Use when <triggers>. Hands off to \`flow-next\`."
```

Names use the `flow-` prefix and match their directory. Set `metadata.stage` to the skill's
workflow stage (`explore`, `understand`, `plan`, `build`, `verify`, `deliver` or `operate`); the
[skill graph](SKILL-MAP.md) groups skills by it. Add the skill to `profiles.json` if it belongs to a profile.

## 2. Write the description

The description is always loaded, and it's how the agent decides to use the skill. Aim for about
200 characters:

1. What the skill does, in plain words.
2. When to use it, with the words a user would actually say.
3. A boundary only when a neighboring skill could be confused with it.
4. A handoff clause naming the next skills in backticks. The skill graph draws its edges from it.

## 3. Write the body

- **Outcome first:** one or two lines on what success looks like.
- **Process:** phases or numbered steps with the decisions that matter: thresholds, budgets and
  stop conditions.
- **`## Anti-patterns`:** concrete failures this skill prevents.
- **`## Done when`:** observable results and the evidence needed to claim them.
- **Last line:** the next skill by backticked name, or the terminal result.

Use terse imperative sentences and bullets. If a sentence isn't a distinct rule, threshold or
decision, cut it. Move material that only some runs need into `references/<topic>.md`, one level
deep, and say when to read it.

## 4. Keep it agent-agnostic

- Name no product, tool or model, and use no invocation syntax such as `/name` or `$name`.
- Describe capabilities, not products: "a separate agent or fresh context", "the settings layers",
  "available delegation".
- Check what the environment actually provides at run time. Skills, agents, tools and models are
  different things; never assume one implies another.
- Don't depend on a sibling skill being installed. Give a fallback or name the capability you need.

## 5. Keep behavior safe

- Follow the user's current intent and the repository's rules, and don't re-ask for authorization
  the user already gave.
- Delegate only independent work, only when delegation is available and authorized, and with
  clear file ownership.
- Give retrying work finite stop conditions, and preserve attempt counts across handoffs.
- Keep worker checks, independent acceptance, broad review and delivery authorization separate.
- Respect where the user keeps artifacts. Git-ignored files don't travel with the repository.

## 6. Evaluate

- Add 3-5 short markers to `evals/beats.json`. They must appear in `SKILL.md`, and they catch
  accidental wording loss, not behavior.
- For a complex skill, run representative requests in isolated fixtures with a fresh agent, and
  give the expected outcome only to the assessor.
- Test requests that should trigger the skill and nearby ones that shouldn't.

See [evaluations](../evals/README.md). Then run `pnpm check`, commit the `pnpm docs:gen` output,
and try an install with `./install.sh --local --project` in a throwaway project.
