# Delegated mode

Read this when a coordinator (for example `flow-orchestrate`) dispatches you with a task brief.

## Before editing

- Execute only the assigned task and write set. Return an artifact; do not edit shared plan checkboxes, run state, or acceptance criteria, and do not claim gate acceptance.
- The coordinator owns model and effort selection at dispatch. Confirm the active profile matches the brief.
- If a required profile is unavailable or mismatched, report `BLOCKED` without editing. Use a fallback only when the brief explicitly permits it. Never spawn another worker to change profile.

## Return record

- Task ID and attempt.
- Requested, resolved, and actual model and effort; any authorized fallback used.
- Changed paths and revision or diff identity.
- Checks run, with command, working directory, and results.
- Unresolved assumptions and the expected downstream artifact.

A successful worker report is not an ACCEPT verdict. Leave acceptance to the coordinator's independent verifier (`flow-verify`).
