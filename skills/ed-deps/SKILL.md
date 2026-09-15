---
name: ed-deps
description: "Update dependencies using current release guidance, compatible upgrade groups, coherent lockfiles and verified installation. Use for dependency currency, advisories or requested framework upgrades. Invoke as /ed-deps in Claude Code or $ed-deps in Codex. Hands off to /ed-review for changes or /ed-migrate for API migration."
---

> Host syntax: `/skill-name` in Claude Code; `$skill-name` in Codex. Use the host spelling for handoffs.

# Dependencies

Move to supported versions with a reproducible installation and a clear compatibility story.
Latest is a candidate, not proof that the repository can adopt it unchanged.

## Process

1. Discover the package manager, lockfile, runtime engines, workspace layout and repository
   upgrade policy. Establish existing check failures so an upgrade is not blamed for baseline
   problems or credited with fixing unrelated ones.
2. Inventory outdated direct dependencies, relevant transitive constraints and advisories using
   current registry/vendor data. Read the changelog and migration guide for breaking changes,
   runtime requirements, peer ranges, renamed APIs and available codemods.
3. Group tightly coupled packages by compatibility: a framework and renderer, test runner and
   coverage provider, compiler and its required tooling. Upgrade one compatibility group at a
   time; independent major migrations remain separate. Do not gate halfway through an
   officially required paired upgrade.
4. Update manifests and lockfiles through the package manager. Respect the repository's pinning
   policy; do not hand-edit resolution/integrity data, bypass peer checks or disable package
   verification to force a version through. Review unexpected transitive or install-script changes.
5. Apply documented API/configuration migrations and run targeted behavior, repository gates
   and a frozen/reproducible install. Patch/minor labels reduce expected breakage but are not
   a substitute for verification.
6. Record each group updated, evidence, changes in behavior and anything held back with its
   concrete compatibility reason and unblock condition. Do not claim the entire dependency
   graph is current from a check of only top-level packages.

## Anti-patterns

- A blind bulk major update with no migration or engine/peer inspection.
- Forbidding a coordinated update that the vendor requires.
- Installing an unavailable version or guessing release notes from memory.
- Silently pinning an old dependency without a reason, or treating an unrun check as green.

## Done when

- Manifest and lockfile agree and the intended version groups install reproducibly.
- Relevant behavior and required checks run on the updated graph.
- Holds, baseline failures and unverified compatibility are explicit.

Use /ed-review for the upgrade diff or /ed-migrate for a separately scoped API transformation.
