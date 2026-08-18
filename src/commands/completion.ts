import { SCOPES } from "../core/config.js";
import { log } from "../core/logger.js";
import { TARGETS } from "../targets/index.js";

/** Subcommands offered for completion. A test asserts this matches the registered commands. */
export const COMMANDS = "list validate install uninstall sync doctor new completion";

/** The flags worth completing after a subcommand. */
const FLAGS = "--target --scope --copy --force --dry-run --watch --profile --json --strict --targets --profiles --help";

/** Scope values, from the single source of truth in config. */
const SCOPE_VALUES = SCOPES.join(" ");

/**
 * The bash completion script.
 *
 * @param targets - Space-separated target names.
 * @returns The script text.
 */
function bash(targets: string): string {
	return `# agent-skills bash completion. Add to ~/.bashrc:  eval "$(agent-skills completion bash)"
_agent_skills() {
  local cur prev
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"
  case "$prev" in
    -t|--target) COMPREPLY=( $(compgen -W "${targets}" -- "$cur") ); return;;
    -s|--scope) COMPREPLY=( $(compgen -W "${SCOPE_VALUES}" -- "$cur") ); return;;
  esac
  if [ "$COMP_CWORD" -eq 1 ]; then
    COMPREPLY=( $(compgen -W "${COMMANDS}" -- "$cur") ); return
  fi
  COMPREPLY=( $(compgen -W "${FLAGS}" -- "$cur") )
}
complete -F _agent_skills agent-skills`;
}

/**
 * The zsh completion script.
 *
 * @param targets - Space-separated target names.
 * @returns The script text.
 */
function zsh(targets: string): string {
	return `#compdef agent-skills
# agent-skills zsh completion. Add to ~/.zshrc:  eval "$(agent-skills completion zsh)"
_agent_skills() {
  if (( CURRENT == 2 )); then compadd -- ${COMMANDS}; return; fi
  case "\${words[CURRENT-1]}" in
    -t|--target) compadd -- ${targets}; return;;
    -s|--scope) compadd -- ${SCOPE_VALUES}; return;;
  esac
  compadd -- ${FLAGS}
}
compdef _agent_skills agent-skills`;
}

/**
 * The fish completion script.
 *
 * @param targets - Space-separated target names.
 * @returns The script text.
 */
function fish(targets: string): string {
	return `# agent-skills fish completion. Add to ~/.config/fish/config.fish:  agent-skills completion fish | source
complete -c agent-skills -f
complete -c agent-skills -n __fish_use_subcommand -a "${COMMANDS}"
complete -c agent-skills -s t -l target -x -a "${targets}"
complete -c agent-skills -s s -l scope -x -a "${SCOPE_VALUES}"`;
}

/**
 * `completion` - print a shell completion script to stdout for eval/sourcing.
 *
 * @param shell - One of `bash`, `zsh`, `fish` (default `bash`).
 */
export function completionCommand(shell: string): void {
	const targets = Object.keys(TARGETS).join(" ");
	const builders: Record<string, (t: string) => string> = { bash, zsh, fish };
	const build = builders[shell];

	if (!build) {
		log.error(`unknown shell "${shell}" - use one of: bash, zsh, fish`);
		process.exitCode = 1;

		return;
	}

	console.log(build(targets));
}
