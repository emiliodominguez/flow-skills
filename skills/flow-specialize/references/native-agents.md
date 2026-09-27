# Native agent configuration

Read this only when the user asks for host-native agent files in addition to the portable briefs.

- Inspect existing configuration and current official host documentation before generating anything.
- Keep host-specific tool names, model identifiers, and config fields out of the portable briefs.
- Preserve existing files and permissions. Never broaden tool access for convenience.
- A generated file is a draft until the host actually discovers it. Report discovery or registration separately from file creation.
- Skills and delegated agents are different resources. Do not assume a delegated agent can spawn further agents or inherits the parent's loaded skills; verify current behavior and supply required context explicitly.
- Use only the delegation and configuration schema the active host documents. Do not port one host's format to another.
