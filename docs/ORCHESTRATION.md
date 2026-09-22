# A verified run

Use `ed-orchestrate` when a defined plan has dependencies whose mistakes would propagate.
It supplies a coordination protocol, not a scheduler or a background service.

## Example: add an export capability

Create a plan with `ed-plan`. A minimal meaningful contract looks like this:

```markdown
# Plan - account export

**Status:** ready
**Execution:** orchestrated
**Revision:** 1
Goal: a user can export only their own records as JSON.
Non-goals: new authentication, UI redesign, production deployment.
Limits: three execution attempts per task; two active workers; 30 minute dispatch budget.
Profile budget: inherit the current session; higher-cost profiles require current-user approval.

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
      Verify: production; actual browser interaction and required checks

Integrated acceptance: UI through route to data respects ownership and produces valid JSON.
```

Replace example paths, commands and acceptance details with actual repository evidence before
execution. This sketch is explanatory; it is not an executable plan for every repository.
Execution fields are optional. Mark them required or preferred and name any fallback
explicitly. They are separate from the pragmatic or production verification profile. The
orchestrator resolves portable display labels to host identifiers; repository text alone does
not authorize a higher-cost profile.

## Run and resume

```text
/ed-orchestrate .plans/account-export.md
```

Use `$ed-orchestrate` in Codex. Supply a repository brief and specialist briefs when they reduce
repeated discovery. An explicit invocation never creates a missing agent type or permission.

The run records each worker artifact, verifier verdict and inspected revision. A worker reports
what it changes and checks; it cannot mark its own dependent phase accepted. A rejected task
receives the exact failed criterion and reproduction, with the same acceptance contract.

A restart reads the existing run directory. It preserves retry counts, reconciles in-flight
operations and invalidates evidence only where relevant inputs change. A missing required tool
or exhausted budget produces a concrete blocked state instead of an endless correction loop.

## Completion

The run completes when all requested tasks and integrated acceptance pass. Its report names
accepted work, evidence, remaining gaps and the actual delivery state. Review, merge, publish
and deploy keep the user's existing authorization boundaries. Direct execution is available
when independent delegation is unavailable, but must be labeled as self-verified.
