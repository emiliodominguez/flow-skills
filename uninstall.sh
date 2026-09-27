#!/usr/bin/env sh
# Remove flow-skills with the open skills CLI (https://skills.sh), for any supported agent.
# Removes only this suite's skills by name, plus installs left by the retired agent-skills
# CLI. Arguments after "--" go to "npx skills remove" unchanged.
#
#   ./uninstall.sh                         # every flow-* skill, user scope, all agents
#   ./uninstall.sh --profile frontend      # one profile from profiles.json (repeatable)
#   ./uninstall.sh --project               # from the current project instead of user scope
#   ./uninstall.sh --legacy-only           # only clean up the retired agent-skills installs
#   ./uninstall.sh -- -a <agent>           # limit removal to specific agents
#   ./uninstall.sh --dry-run               # print what would happen without changing anything
#
set -eu

ROOT="$(cd "$(dirname "$0")" && pwd)"
. "$ROOT/scripts/common.sh"

SCOPE="-g"
SKILLS=""
DRY_RUN=0
LEGACY_ONLY=0

while [ $# -gt 0 ]; do
	case "$1" in
		--profile)
			[ $# -ge 2 ] || die "--profile needs a name"
			SKILLS="$SKILLS $(profile_skills "$2")" || exit 1
			shift 2
			;;
		--project) SCOPE="" && shift ;;
		--legacy-only) LEGACY_ONLY=1 && shift ;;
		--dry-run) DRY_RUN=1 && shift ;;
		--) shift && break ;;
		-h | --help) sed -n '2,13p' "$0" && exit 0 ;;
		*) die "Unknown option $1 (pass skills CLI flags after --)" ;;
	esac
done

remove_legacy
[ "$LEGACY_ONLY" = 1 ] && exit 0

require_node
[ -n "$SKILLS" ] || SKILLS="$(all_skills)"

set -- remove $(printf '%s\n' $SKILLS | sort -u) $SCOPE -y "$@"

say "npx $SKILLS_CLI $*"
[ "$DRY_RUN" = 1 ] && exit 0
npx -y "$SKILLS_CLI" "$@"
