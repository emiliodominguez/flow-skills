---
"flow-skills": patch
---

Document explicit agent selection as the workaround for the upstream PromptScript global-install error, including why `--all` still selects unsupported targets. Update runtime requirements and installation-check documentation. Extend the real CLI smoke test to cover project and global installs in symlink and copy modes, verify installed contents and listing, and reject failure messages even when the CLI exits successfully.
