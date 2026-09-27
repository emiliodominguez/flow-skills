# Security

Skills are instructions that agents follow with your permissions, so a skill that could lead an
agent to leak secrets, bypass authorization or take destructive actions is a security issue.

Please report one privately through
[GitHub security advisories](https://github.com/emiliodominguez/flow-skills/security/advisories/new)
rather than a public issue. Include the skill, the request that triggered the behavior, and what
the agent did.

When you install any skills, including these, review them first. `npx skills add ... --list` shows
what a source contains, and every skill is a plain Markdown folder you can read before installing.
