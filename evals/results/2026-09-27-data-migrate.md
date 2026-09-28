# Data migration skill: initial evidence

The starting corpus was revision `43de19c`. The `data-live-backfill` prompt in `ab.json`
was first answered without new guidance, through the signed-in CLI backend with its default
model, tools and skills disabled, and a neutral working directory. This was an answer-only
exercise, not a database migration or a tool-using behavioral run.

The initial answer caught stale values, old writers and checkpoint atomicity. It also assumed
a database engine/version, stated that completion was achievable today, supplied unmeasured
throughput estimates, and described rollback without rehearsing recovery. Those are the gaps
addressed by the new skill. A successful response must derive capabilities and operating limits
from the actual environment and distinguish recoverable application changes from lost data.

The case includes six assertions spanning those gaps and the existing correct behavior.
Use `pnpm eval:ab data-live-backfill --runs 3` for another comparison. Routing uses the new
skill's four positive requests and three near misses; the initial run routed all seven correctly.

## Repeated answer comparison

`EVAL_BACKEND=claude pnpm eval:ab data-live-backfill --runs 2` completed with two answers per
variant and the default model as judge. The six-assertion mean was 92% with the skill and 50%
without. Measurement before estimates and recovery rehearsal passed in both skill answers
and neither baseline answer. Concurrent-write handling, checkpointing and reconciliation
passed either way; retain them as regression guards, not evidence of improvement.

Engine discovery scored 50% with the skill and 0% without. The judge treated conditional
engine-specific examples inconsistently across the two skill answers. Both still assumed an
engine for their example syntax, so this remains a limitation rather than a proven success.
These small samples and a shared answering/judging model do not establish an effect size or
certify migration execution. Raw answers and verdicts were retained in local `.eval-runs/`.

The local repository gate passed with 36 skills and 7,469 description characters. The real
installer discovered, installed, listed and removed the corpus in disposable project/user
scopes, using both copy and symlink modes. This establishes packaging, not agent behavior.
