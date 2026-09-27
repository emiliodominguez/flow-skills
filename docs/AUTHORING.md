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

1. What the skill is, as a short noun phrase.
2. `Use when` plus the words and symptoms a user would actually say.
3. A boundary only when a neighboring skill could be confused with it.
4. A handoff clause naming the next skills in backticks. The skill graph draws its edges from it.

Don't summarize the procedure. An agent that reads the steps in the description may follow them
and skip the body. Avoid trigger words a neighbor also claims; `pnpm eval:triggers` finds them.

## 3. Write the body

- **Outcome first:** one or two lines on what success looks like.
- **Process:** phases or numbered steps with the decisions that matter: thresholds, budgets and
  stop conditions.
- **`## Anti-patterns`:** concrete failures this skill prevents.
- **`## Done when`:** observable results and the evidence needed to claim them.
- **Last line:** the next skill by backticked name, or the terminal result.
- **`## Red flags`** (discipline skills): the excuses agents give for skipping a step, each with
  the correct response. Write them from observed runs, not imagination.

Match the form to the failure: a firm rule plus red flags when agents skip a step under pressure,
a template when output has the wrong shape, a required slot when an element keeps going missing.
Explain why rather than stacking capitalized MUSTs.

Use terse imperative sentences and bullets. If a sentence isn't a distinct rule, threshold or
decision, cut it. Move material that only some runs need into `references/<topic>.md`, one level
deep, and say when to read it.

## 4. Keep it agent-agnostic

- Name no product, tool or model, and use no invocation syntax such as `/name` or `$name`.
- Stay platform-neutral: no code-hosting, CI or stack-tool specifics. Say "change request (pull or
  merge request)" and "the platform's CLI or API", and describe tool behavior by category.
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

- Before writing, run the task without the skill and record what goes wrong. No observed gap, no skill.
- Add 3-5 short markers to `evals/beats.json`. They must appear in `SKILL.md`, and they catch
  accidental wording loss, not behavior.
- Add four should prompts and three near misses to `evals/triggers.json`, and run
  `pnpm eval:triggers` when you have model access.
- Add an `evals/ab.json` case for behavior the skill claims to change. `pnpm eval:ab` flags
  assertions that pass without the skill; those measure nothing.
- For a complex skill, run representative requests in isolated fixtures with a fresh agent, and
  give the expected outcome only to the assessor.

See [evaluations](../evals/README.md). Then run `pnpm check`, commit the `pnpm docs:gen` output,
and try an install with `./install.sh --local --project` in a throwaway project.
