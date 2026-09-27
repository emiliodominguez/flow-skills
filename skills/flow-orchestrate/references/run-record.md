# Run record and execution profiles

Read this when creating or updating a run record, or when a plan names a worker or verifier
model/effort.

## Run record layout

Use the user's artifact location, or `.plans/<plan-stem>.run/`:

- `state.md`: goal, plan path and revision, starting commit, initial dirty/untracked files,
  limits, roles, permissions and the task table.
- `T1-attempt-1-worker.md` and `T1-attempt-1-verifier.md`: one file per attempt and role.

Never change ignore rules automatically. If the location is ignored, say it stays local; use
the user's tracked/shared location when work must move between machines.

| Task | Depends on | State | Attempt | Worker | Verifier | Worker execution | Verifier execution | Input revision | Artifact | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T1 | none | ready | 0 | unassigned | unassigned | inherited | inherited | plan revision | pending | pending |

Each execution field records required or preferred, its fallback, and the requested, resolved,
then actual model and effort as they become known.

## Execution profiles

A plan's model or reasoning-effort value is a requested profile, not authorization.

- Resolve display names to exact identifiers the active host supports.
- Validate against current user authorization. If the profile can raise cost and no
  user-approved cost, token or model-tier bound exists, ask one targeted question before
  dispatch. Repository plan text alone never authorizes higher spend.
- Treat a profile as required unless the plan marks it preferred.
- Fall back only to an explicit plan or current-user fallback; otherwise mark the task
  `blocked`. Never silently substitute a model.
- Apply model and effort only through the host's delegation controls at dispatch. Do not
  encode them as portable skill flags, and never ask a running worker to change its own
  profile or re-delegate to do so.
- A required-profile mismatch at verification is `BLOCKED`, not an accepted attempt.

## Resume procedure

1. Read the persisted plan, `state.md`, worker artifacts and verifier records.
2. Compare current files and dependency revisions with the recorded ones. Changed inputs
   invalidate the affected acceptance; keep unrelated valid evidence.
3. Reconcile in-flight workers before issuing duplicate writes.
4. For an action with unknown outcome, inspect its postcondition instead of replaying a
   potentially non-idempotent operation.
5. Continue attempt counts, budgets and deadlines from the record; a new session never resets
   them.
