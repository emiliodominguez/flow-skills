---
"@emiliodominguez/agent-skills": patch
---

Add a bootstrap `uninstall.sh` companion to `install.sh`, include it in packed releases, and document dry-run removal. Make both bootstrap scripts use the shipped bundle in package installs and consistently enforce the pinned Node and pnpm requirements.
