#!/usr/bin/env sh
# Bootstrap uninstaller for agent-skills.
# Uses the shipped bundle in packages; source checkouts install deps and build first.
# Everything after `--` (or any extra args) is passed through to the CLI.
#
#   ./uninstall.sh                         # remove all managed Claude Code + Codex skills
#   ./uninstall.sh -- -t cursor codex      # remove managed Cursor + Codex skills
#   ./uninstall.sh -- --profile frontend   # remove one configured profile
#   ./uninstall.sh -- --dry-run            # preview target changes without removing skills
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
	if ! command -v pnpm >/dev/null 2>&1; then
		say "pnpm not found - enabling it via corepack"
		corepack enable >/dev/null 2>&1 || die "Could not enable the pinned pnpm version. Install Corepack or pnpm manually: https://pnpm.io/installation"
	fi
	command -v pnpm >/dev/null 2>&1 || die "pnpm is still unavailable after enabling Corepack. Install it manually: https://pnpm.io/installation"
	EXPECTED_PNPM_VERSION="$(node -p 'require("./package.json").packageManager.split("@")[1].split("+")[0]')"
	PNPM_VERSION="$(pnpm --version)"
	[ "$PNPM_VERSION" = "$EXPECTED_PNPM_VERSION" ] || die "pnpm $EXPECTED_PNPM_VERSION required (found $PNPM_VERSION)."

	say "Installing dependencies"
	pnpm install --silent

	say "Building the CLI"
	pnpm run build >/dev/null
elif [ ! -f "$ROOT/dist/index.js" ]; then
	die "Could not find the CLI bundle. Reinstall agent-skills and try again."
fi

say "Uninstalling skills"
# Drop a leading `--` if present, then pass the rest to the CLI.
if [ "${1:-}" = "--" ]; then shift; fi
node "$ROOT/dist/index.js" uninstall "$@"

printf '\033[32m✓\033[0m Done. Check remaining state with: \033[1mnode "%s/dist/index.js" doctor\033[0m\n' "$ROOT"
