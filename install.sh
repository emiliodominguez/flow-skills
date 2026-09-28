#!/usr/bin/env sh
# Install flow-skills with the open skills CLI (https://skills.sh), for any supported agent.
# A thin wrapper over "npx skills add" that adds profiles and removes installs left by the
# retired agent-skills CLI. Arguments after "--" go to "npx skills add" unchanged.
#
#   ./install.sh                           # all skills, user scope; the CLI asks which agents
#   ./install.sh --profile core            # one profile from profiles.json (repeatable)
#   ./install.sh --project                 # into the current project instead of user scope
#   ./install.sh --local                   # from this checkout instead of GitHub
#   ./install.sh -- -a <agent>... -y       # recommended for user scope; avoids project-only agents
#   ./install.sh --dry-run                 # print the command without running it
#
set -eu

ROOT="$(cd "$(dirname "$0")" && pwd)"
. "$ROOT/scripts/common.sh"

SOURCE="$REPO_SOURCE"
SCOPE="-g"
SKILLS=""
DRY_RUN=0

while [ $# -gt 0 ]; do
	case "$1" in
		--profile)
			[ $# -ge 2 ] || die "--profile needs a name"
			SKILLS="$SKILLS $(profile_skills "$2")" || exit 1
			shift 2
			;;
		--project) SCOPE="" && shift ;;
		--local) SOURCE="$ROOT" && shift ;;
		--dry-run) DRY_RUN=1 && shift ;;
		--) shift && break ;;
		-h | --help) sed -n '2,13p' "$0" && exit 0 ;;
		*) die "Unknown option $1 (pass skills CLI flags after --)" ;;
	esac
done

require_node
remove_legacy

set -- add "$SOURCE" $SCOPE "$@"
if [ -n "$SKILLS" ]; then
	# Profiles overlap; install each skill once.
	set -- "$@" --skill $(printf '%s\n' $SKILLS | sort -u)
fi

say "npx $SKILLS_CLI $*"
[ "$DRY_RUN" = 1 ] && exit 0
npx -y "$SKILLS_CLI" "$@"
