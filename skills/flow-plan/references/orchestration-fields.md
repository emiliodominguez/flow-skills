# Orchestration plan fields

Read this only when a plan uses `**Execution:** orchestrated` or sets execution profiles.

## Limits

Record attempt, concurrency and elapsed-time bounds in `**Limits:**`. Define accepted dependency
artifacts and worker ownership per task. `flow-orchestrate` keeps per-attempt verdict records.

## Execution profiles

Add these optional lines to a task:

```markdown
      Worker execution: <required|preferred; model; effort; fallback or none>
      Verifier execution: <required|preferred; model; effort; fallback or none>
```

- Mark each line `required` or `preferred`, name the requested model and effort, and state a
  named fallback or `none`.
- Keep display labels portable; the active host resolves exact identifiers.
- These fields are separate from the pragmatic or production verification profile in `Verify`.
- A repository plan does not authorize higher spend. Cite an existing user-approved cost,
  token or model-tier bound, or leave that decision to the current user before dispatch.
