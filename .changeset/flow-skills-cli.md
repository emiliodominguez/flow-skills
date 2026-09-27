---
"flow-skills": major
---

Rename the project to flow-skills and the skill prefix from ed- to flow- (ed-prune-claude-setup becomes flow-prune-agent-setup). Distribute through the open skills CLI (npx skills add emiliodominguez/flow-skills) for any supported agent, plus an optional Claude Code plugin marketplace. Remove the custom installer, target adapters, sync, doctor and completion commands; install.sh and uninstall.sh now wrap npx skills with profiles and clean up legacy ed-* installs.

Make every skill host-agnostic: spec-only frontmatter, no host names or invocation syntax, and backticked skill references. Cut the always-loaded description budget from about 10,500 to under 7,000 characters, tighten bodies, and move situational material into on-demand references/ files. Validation now enforces portable frontmatter, per-skill and corpus description budgets, body size, reference links and manifest consistency.
