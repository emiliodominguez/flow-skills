# Everyday examples

These are illustrative worked examples, not transcripts or claims that checks ran in your
repository. Copy a starting prompt, adapt its paths, and collect fresh evidence. The commands
assume a project that declares the named scripts; use its actual package manager and gates.
Skill names are plain text here; use your agent's invocation syntax if it requires one.

## Fix a small bug

**Starting state:** `src/cart.ts` adds each line's unit price but ignores quantity. The existing
test covers only quantity one. Two units priced at 250 cents incorrectly total 250 cents.

```text
flow-work Fix total(lines) in src/cart.ts so it sums priceCents times quantity.
Keep empty input returning zero. Add a regression test in test/cart.test.ts,
run the relevant tests and repository checks, and leave the changes uncommitted.
```

**Flow:** `flow-work`, then `flow-review` if the repository requires review. A bounded bug with
an explicit expected result does not need a separate planning or orchestration session.

| Artifact              | Concrete result                                                                                          |
| --------------------- | -------------------------------------------------------------------------------------------------------- |
| `src/cart.ts`         | Each line contributes `priceCents * quantity`; public input/output shape stays the same.                 |
| `test/cart.test.ts`   | Quantity two at 250 returns 500; mixed lines and empty input remain covered.                             |
| Verification evidence | Record the failing regression before the fix, then its passing result and the required repository gates. |

In a project with these scripts, run `pnpm test -- test/cart.test.ts` and `pnpm check`.
Evidence should include the command, exit status, relevant observed result and tested revision
or diff. "Tests pass" without running them is not the artifact. If checks fail before the edit,
record that baseline and show whether the regression itself changed from failing to passing.

**Stop when:** the requested calculation and regression pass, required checks have known results,
and the working diff is ready to inspect. The request ends before a commit or push. An unrelated
README edit already in the working tree stays out of the change.

## Upgrade a dependency

**Starting state:** the application uses an older date library. Its runtime range, supported
date formats and locale behavior are part of the compatibility contract.

```text
flow-deps Upgrade date-fns to the newest release compatible with this repository's
supported runtime. Inspect the vendor migration notes, preserve our displayed dates
and locale behavior, update the lockfile through the package manager, and verify a
frozen install. Leave a reviewable diff and explain any version held back.
```

**Flow:** `flow-deps`, then `flow-review`. Use `flow-migrate` only if the upgrade exposes a
separately scoped transformation across many call sites. If a suggested skill is not installed,
perform the equivalent review or inventory with the capabilities available.

| Artifact                            | Concrete result                                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `package.json` and `pnpm-lock.yaml` | The selected version and resolved graph agree; the lockfile comes from the package manager.            |
| Date formatting call sites          | Any required API changes follow the actual vendor migration guide.                                     |
| Behavior evidence                   | Representative locale, invalid-input and timezone-boundary cases preserve the supported contract.      |
| Upgrade note                        | Previous/selected versions, vendor source, runtime/peer constraints, migration decisions and any hold. |

Run the project's date tests and required checks, then `pnpm install --frozen-lockfile`.
Inspect unexpected transitive or install-script changes. Verify the user-visible date output
in the runtime that displays it when formatting behavior changes. A successful install alone
does not prove compatibility. If the newest release requires an unsupported runtime, report
that constraint and the selected compatible release; do not silently widen the runtime range.

**Stop when:** the intended compatibility group installs reproducibly, behavior checks pass
or have an explicit blocker, and the diff explains what changed. No publication is requested.

## Handle disputed review feedback

**Starting state:** a reviewer asks to remove a null check because `parseConfig` has a typed
parameter. Its input comes from parsed external JSON. Another comment requests a variable rename.

```text
flow-pr-fix Address the review on this branch: "Remove the null check in parseConfig;
the parameter is Config, so it cannot be null" and "Rename cfg to config."
Check each suggestion against the runtime behavior, make the justified changes,
run the required checks and push this branch. Do not post replies or resolve threads.
```

**Flow:** `flow-pr-fix`, using `flow-review` for the resulting diff and `flow-ship` for the
authorized push. The latest user instruction controls communication and the terminal action.

| Comment               | Disposition in this example                                          | Evidence to collect                                             |
| --------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------- |
| Remove the null check | Keep the guard; the type annotation does not validate external JSON. | Trace the caller and exercise null, malformed and valid inputs. |
| Rename `cfg`          | Apply the rename within the affected scope.                          | Inspect references and run the relevant tests/typecheck.        |

The artifacts are the justified code/test diff and a local per-comment disposition. For the
guard, cite the input path and observed failure the guard prevents. Do not claim the reviewer
is wrong solely because the skill says to be skeptical. If the caller actually validates all
input first, reconsider the suggestion using that evidence.

After the repository gates pass, push the intended branch and verify its remote commit matches
the tested commit. Inspect hosted checks on that commit; distinguish passed, pending, failed
and absent checks. If later fixes change the code, rerun affected checks before another push.

**Stop when:** the justified changes reached the remote and each comment has a supported local
disposition. Replies and thread resolution remain untouched because the prompt excludes them.
If runtime evidence is missing, record the open question rather than deleting the guard on trust.

For a dependent workflow with independent acceptance gates, see [Orchestration](ORCHESTRATION.md).
