---
name: flow-release
description: "Versioned software releases and publication recovery. Use when preparing a version, publishing artifacts or resuming a partial release. Hands off to `flow-ship` or `flow-triage`."
metadata:
  stage: deliver
---

# Release

Make the requested version available with evidence tying its source, metadata and artifacts
together. Git delivery belongs to `flow-ship`; package or release publication is a separate action.

## Phase 1: Establish the release contract

- Read the versioning policy, release mechanism, supported targets, pending changes, existing
  tags and published versions. Determine the authorized stage: prepare, tag or publish.
  Reuse current authorization; publication never implies deployment or announcements.
- Select the version from actual compatibility changes and repository policy, including
  prerelease rules and coordinated packages. Write user-facing release notes from the real
  diff, identifying breaking behavior, migration steps and meaningful limitations.
- Record source revision, version, expected artifacts, destinations, build inputs and required
  gates in a release record. A version string alone does not identify the source or artifact.

## Phase 2: Verify the candidate

- Build from the intended clean revision with the recorded toolchain and locked inputs.
  Preserve unrelated work. Run repository gates and inspect the packaged contents, metadata,
  checksums and any required signatures or provenance. Verify the contents users will receive.
- Install or consume the candidate in a disposable environment. Check its reported version
  and at least one representative behavior; a version command alone is not a functional test.
- Reuse an existing verified artifact when resuming. If rebuilding is necessary, establish
  equivalence using the project's reproducibility/provenance policy. Never assume that the
  same source produces identical bytes or that different bytes are automatically acceptable.

## Phase 3: Reconcile remote state before publication

- Inspect the authoritative state of every target. Classify each expected artifact as absent,
  present and matching, present and conflicting, or unknown. A timeout means unknown, not absent.
- Verify that an existing tag resolves to the intended source commit, accounting for tag
  objects separately from their target commits. Never move or delete it to include newer work.
- Retry only missing steps whose preconditions still hold. Query unknown outcomes before
  repeating a mutation. Matching published artifacts stay untouched; a conflict stops that
  target and needs an explicit repair decision under the registry's immutability policy.
- Complete authorized steps in dependency order and persist each observed result. Preparation
  can finish without publication; a partially published version must remain explicitly partial.

## Phase 4: Verify the consumer result

- Read back the tag, release metadata and artifact identities from the actual destinations.
  Fetch and consume the published version in a clean environment, checking checksums or the
  applicable provenance and the same representative behavior tested on the candidate.
- Report per-target evidence, the source revision, artifact identities and any pending or
  conflicting state. Keep a recovery path that respects immutable versions: a forward fix,
  withdrawal or correction may need a separately authorized action.
- Stop at the requested release stage. Record later changes as remaining work; do not assign
  them a new version, open another release, deploy or announce unless that was requested.

## Anti-patterns

- Rerunning a whole release pipeline after an upload timeout without checking the destination.
- Publishing from the current checkout when the release tag identifies another revision.
- Calling a release complete because a tag exists or a publish command exited successfully.
- Replacing conflicting immutable artifacts, inventing release notes, or starting a follow-up release.

## Done when

- The authorized stage is reached for every required target, or its exact partial state is recorded.
- Version, source, notes and artifact identities agree, with consumer-side verification evidence.
- Unrun checks and recovery decisions are explicit; no extra delivery stage is implied.

Use `flow-ship` for requested Git delivery or `flow-triage` for an observed release incident;
when unavailable, perform the equivalent delivery checks or record the incident evidence.
