#!/usr/bin/env sh
# End-to-end install check with the real skills CLI: discover the corpus from this checkout,
# install it into a throwaway project for several agents, then remove it with uninstall.sh.
# Needs network access to the npm registry for "npx skills".
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/flow-smoke.XXXXXX")"
trap 'rm -rf "$WORK"' EXIT
export HOME="$WORK/home" DISABLE_TELEMETRY=1 DO_NOT_TRACK=1
mkdir -p "$HOME" "$WORK/project"
cd "$WORK/project"

EXPECTED="$(cd "$ROOT/skills" && for d in */; do [ -f "$d/SKILL.md" ] && printf '%s\n' "${d%/}"; done | sort)"
COUNT="$(printf '%s\n' "$EXPECTED" | wc -l | tr -d ' ')"

# Profiles resolve and the wrapper prints the command it would run.
sh "$ROOT/install.sh" --local --project --profile core --profile review --dry-run | grep -q -- "--skill flow-adversarial-review flow-commit"

npx -y skills@1 add "$ROOT" --list >"$WORK/list.txt" 2>&1
for name in $EXPECTED; do
	grep -q "$name" "$WORK/list.txt" || { cat "$WORK/list.txt"; echo "skills CLI did not discover $name" >&2; exit 1; }
done

sh "$ROOT/install.sh" --local --project -- -a claude-code codex cursor -y --copy >"$WORK/install.log" 2>&1 || { cat "$WORK/install.log"; exit 1; }

INSTALLED=0
for dir in .claude/skills .agents/skills .cursor/skills; do
	[ -d "$dir" ] || continue
	for name in $EXPECTED; do
		cmp -s "$ROOT/skills/$name/SKILL.md" "$dir/$name/SKILL.md" || { echo "$dir/$name/SKILL.md differs from source" >&2; exit 1; }
	done
	INSTALLED=$((INSTALLED + 1))
done
[ "$INSTALLED" -ge 2 ] || { cat "$WORK/install.log"; echo "expected installs for at least two agent directories" >&2; exit 1; }
[ -f .agents/skills/flow-plan/references/orchestration-fields.md ] || [ -f .claude/skills/flow-plan/references/orchestration-fields.md ] ||
	{ echo "supporting references/ files were not installed" >&2; exit 1; }

sh "$ROOT/uninstall.sh" --project >"$WORK/uninstall.log" 2>&1 || { cat "$WORK/uninstall.log"; exit 1; }
for dir in .claude/skills .agents/skills .cursor/skills; do
	for name in $EXPECTED; do
		[ ! -e "$dir/$name" ] || { cat "$WORK/uninstall.log"; echo "$dir/$name survived uninstall" >&2; exit 1; }
	done
done

echo "skills CLI discovered, installed ($INSTALLED agent dirs) and removed all $COUNT skills."
