#!/usr/bin/env sh
# Bootstrap installer for agent-skills.
# Uses the shipped bundle in packages; source checkouts install deps and build first.
# Everything after `--` (or any extra args) is passed through to the CLI.
#
#   ./install.sh                      # install all skills into Claude Code + Codex (symlink)
#   ./install.sh -- -t cursor codex   # install into Cursor + Codex
#   ./install.sh -- --copy            # copy instead of symlink
#
set -eu

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

say() { printf '\033[36m›\033[0m %s\n' "$1"; }
die() { printf '\033[31m✗\033[0m %s\n' "$1" >&2; exit 1; }

command -v node >/dev/null 2>&1 || die "Node.js >= 22.12 is required. Install it from https://nodejs.org and re-run."

node -e 'const [major, minor] = process.versions.node.split(".").map(Number); process.exit(major > 22 || (major === 22 && minor >= 12) ? 0 : 1)' ||
	die "Node.js >= 22.12 required (found $(node -v))."

if [ -f "$ROOT/src/index.ts" ]; then
	EXPECTED_PNPM_VERSION="$(node -p 'require("./package.json").packageManager.split("@")[1].split("+")[0]')"
	if command -v pnpm >/dev/null 2>&1; then
		PNPM_RUNNER="direct"
	elif command -v corepack >/dev/null 2>&1; then
		say "pnpm not found - using the pinned version through corepack"
		PNPM_RUNNER="corepack"
	elif command -v npx >/dev/null 2>&1; then
		say "pnpm and corepack not found - using the pinned version through npx"
		PNPM_RUNNER="npx"
	else
		die "Could not run pnpm $EXPECTED_PNPM_VERSION. Install pnpm, Corepack, or npm: https://pnpm.io/installation"
	fi
	run_pnpm() {
		case "$PNPM_RUNNER" in
			direct) pnpm "$@" ;;
			corepack) corepack pnpm "$@" ;;
			npx) npx --yes "pnpm@$EXPECTED_PNPM_VERSION" "$@" ;;
		esac
	}
	PNPM_VERSION="$(run_pnpm --version)"
	[ "$PNPM_VERSION" = "$EXPECTED_PNPM_VERSION" ] || die "pnpm $EXPECTED_PNPM_VERSION required (found $PNPM_VERSION)."

	say "Installing dependencies"
	run_pnpm install --silent

	say "Building the CLI"
	run_pnpm run build >/dev/null
elif [ ! -f "$ROOT/dist/index.js" ]; then
	die "Could not find the CLI bundle. Reinstall agent-skills and try again."
fi

say "Installing skills"
# Drop a leading `--` if present, then pass the rest to the CLI.
if [ "${1:-}" = "--" ]; then shift; fi
node "$ROOT/dist/index.js" install "$@"

printf '\033[32m✓\033[0m Done. Try: \033[1mnode "%s/dist/index.js" list --targets\033[0m\n' "$ROOT"
