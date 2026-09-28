#!/usr/bin/env sh
# End-to-end install check with the real skills CLI: discover the corpus from this checkout,
# install it into a throwaway project and home for several agents, then remove it with uninstall.sh.
# Needs network access to the npm registry for "npx skills".
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
. "$ROOT/scripts/common.sh"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/flow-smoke.XXXXXX")"
trap 'rm -rf "$WORK"' EXIT
mkdir -p "$WORK/home" "$WORK/project"
cd "$WORK/project"

# Keep CLI writes and legacy cleanup inside the fixture, including agent-specific overrides.
run_isolated() {
	env HOME="$WORK/home" CODEX_HOME="$WORK/home/.codex" CLAUDE_CONFIG_DIR="$WORK/home/.claude" \
		XDG_CONFIG_HOME="$WORK/home/.config" DISABLE_TELEMETRY=1 DO_NOT_TRACK=1 NO_COLOR=1 "$@"
}

# The CLI can exit zero and print Done! even when individual targets failed.
assert_install_succeeded() {
	if grep -Eq 'Failed to install|does not support global skill installation' "$1"; then
		cat "$1"
		echo "skills CLI reported an install failure" >&2
		exit 1
	fi
}

run_isolated npx -y "$SKILLS_CLI" --version

EXPECTED="$(cd "$ROOT/skills" && for d in */; do [ -f "$d/SKILL.md" ] && printf '%s\n' "${d%/}"; done | sort)"
COUNT="$(printf '%s\n' "$EXPECTED" | wc -l | tr -d ' ')"

# Profiles resolve and the wrapper prints the command it would run.
run_isolated sh "$ROOT/install.sh" --local --project --profile core --profile review --dry-run | grep -q -- "--skill flow-adversarial-review flow-commit"

run_isolated npx -y "$SKILLS_CLI" add "$ROOT" --list >"$WORK/list.txt" 2>&1
for name in $EXPECTED; do
	grep -q "$name" "$WORK/list.txt" || { cat "$WORK/list.txt"; echo "skills CLI did not discover $name" >&2; exit 1; }
done

for scope in project global; do
	case "$scope" in
		project) base="$WORK/project" ;;
		global) base="$WORK/home" ;;
	esac
	for mode in symlink copy; do
		set --
		[ "$scope" = project ] && set -- --project
		install_log="$WORK/$scope-$mode-install.log"
		uninstall_log="$WORK/$scope-$mode-uninstall.log"

		# Explicit agents bypass the upstream automatic selection of project-only PromptScript.
		# Installation mode and agent flags belong after the wrapper's separator.
		(
			set -- "$@" -- -a claude-code codex cursor --skill '*' -y
			[ "$mode" = copy ] && set -- "$@" --copy
			run_isolated sh "$ROOT/install.sh" --local "$@"
		) >"$install_log" 2>&1 || { cat "$install_log"; exit 1; }
		assert_install_succeeded "$install_log"

		for dir in "$base/.claude/skills" "$base/.agents/skills"; do
			for name in $EXPECTED; do
				diff -qr "$ROOT/skills/$name" "$dir/$name" || { cat "$install_log"; echo "$dir/$name differs from source or is missing" >&2; exit 1; }
			done
		done
		for name in $EXPECTED; do
			if [ "$mode" = symlink ]; then
				[ -L "$base/.claude/skills/$name" ] || { cat "$install_log"; echo "$name was not symlinked for Claude Code" >&2; exit 1; }
			else
				[ ! -L "$base/.claude/skills/$name" ] || { echo "$name was symlinked despite --copy" >&2; exit 1; }
			fi
		done

		# Exercise the documented way to check whether a reported partial install succeeded.
		set --
		[ "$scope" = global ] && set -- -g
		run_isolated npx -y "$SKILLS_CLI" list "$@" >"$WORK/installed-list.txt" 2>&1 || { cat "$WORK/installed-list.txt"; exit 1; }
		for name in $EXPECTED; do
			grep -q "$name" "$WORK/installed-list.txt" || { cat "$WORK/installed-list.txt"; echo "installed skill $name was not listed" >&2; exit 1; }
		done

		set --
		[ "$scope" = project ] && set -- --project
		run_isolated sh "$ROOT/uninstall.sh" "$@" -- -a claude-code codex cursor >"$uninstall_log" 2>&1 || { cat "$uninstall_log"; exit 1; }
		for dir in "$base/.claude/skills" "$base/.agents/skills" "$base/.cursor/skills" "$base/.codex/skills"; do
			for name in $EXPECTED; do
				[ ! -e "$dir/$name" ] && [ ! -L "$dir/$name" ] || { cat "$uninstall_log"; echo "$dir/$name survived uninstall" >&2; exit 1; }
			done
		done
		echo "skills CLI installed, listed and removed all $COUNT skills in $scope scope using $mode mode."
	done
done

# PromptScript itself remains supported for project installs.
run_isolated sh "$ROOT/install.sh" --local --project -- -a promptscript --skill flow-plan -y --copy >"$WORK/promptscript-install.log" 2>&1 || { cat "$WORK/promptscript-install.log"; exit 1; }
assert_install_succeeded "$WORK/promptscript-install.log"
cmp -s "$ROOT/skills/flow-plan/SKILL.md" .agents/skills/flow-plan/SKILL.md || { echo "PromptScript project install is missing or differs from source" >&2; exit 1; }
run_isolated sh "$ROOT/uninstall.sh" --project -- -a promptscript >"$WORK/promptscript-uninstall.log" 2>&1 || { cat "$WORK/promptscript-uninstall.log"; exit 1; }
[ ! -e .agents/skills/flow-plan ] && [ ! -L .agents/skills/flow-plan ] || { echo "PromptScript project install survived uninstall" >&2; exit 1; }
echo "skills CLI installed and removed flow-plan for PromptScript in project scope."
