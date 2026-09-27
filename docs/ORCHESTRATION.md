# A verified run

Use `flow-orchestrate` when a plan has dependent steps and a mistake in one would spread to the
next. It gives the agent a coordination protocol; it is not a scheduler or a background service.

## 1. Write the contract

Create the plan with `flow-plan`. A small but complete contract for an export feature:

```markdown
# Plan - account export

**Status:** ready
**Execution:** orchestrated
**Revision:** 1
Goal: a user can export only their own records as JSON.
Non-goals: new authentication, UI redesign, production deployment.
Limits: three execution attempts per task; two active workers; 30 minute dispatch budget.
Profile budget: inherit the current session; higher-cost profiles need the user's approval.

- [ ] T1 - implement the export use case
      Depends on: none
      Touches: export domain/application modules and their tests
      Artifact: implementation diff
      Worker execution: preferred; model=current; effort=medium; fallback=inherited
      Verifier execution: required; model=current; effort=medium; fallback=none
      Acceptance: own records export; another account's records are excluded
      Verify: production; repository test command; positive and negative account fixtures
      Stop: scope conflict, missing account contract, exhausted attempts
- [ ] T2 - wire the existing API route
      Depends on: T1
      Touches: export route and integration tests
      Acceptance: documented response, authorization and error behavior
      Verify: production; existing integration runner and repository gates
- [ ] T3 - connect the existing UI
      Depends on: T2
      Touches: export control and browser tests
      Acceptance: download, failure and busy states work in supported browsers
      Verify: production; real browser interaction and required checks

Integrated acceptance: UI through route to data respects ownership and produces valid JSON.
```

This is an illustration. Replace paths, commands and acceptance details with your repository's
real ones before running it.

The execution lines are optional. Mark each one `required` or `preferred` and name a fallback.
They choose how a worker or verifier runs, which is separate from the pragmatic or production
verification profile. The orchestrator maps the labels to whatever the current agent supports,
and plan text alone never authorizes a more expensive profile.

## 2. Run it

Invoke `flow-orchestrate` with the plan path, for example `.plans/account-export.md`. A
repository brief (`flow-repo-brief`) and specialist briefs (`flow-specialize`) help when agents
would otherwise repeat the same discovery. Invoking the skill never creates an agent type or
grants a permission the environment doesn't already have.

- Each worker returns an artifact, and a separate verifier issues a verdict for the inspected revision.
- A worker cannot accept its own task or release the tasks that depend on it.
- A rejected task goes back with the exact failed criterion and a reproduction. The contract stays the same.

## 3. Resume

A restart reads the existing run records. Attempt counts carry over, in-flight operations are
reconciled, and only evidence whose inputs changed is invalidated. A missing tool or an
exhausted budget ends in a clear `BLOCKED` state, not an endless correction loop.

## 4. Finish

The run finishes when every requested task and the integrated acceptance pass. The report lists
accepted work, evidence, remaining gaps and the actual delivery state. Review, merge, publish
and deploy still need the user's authorization. When independent delegation isn't available,
direct execution is fine, but it must be labeled self-verified.
