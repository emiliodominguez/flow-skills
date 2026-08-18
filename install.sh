#!/usr/bin/env sh
# Bootstrap installer for agent-skills.
# Ensures Node + pnpm, installs deps, builds the CLI, then runs `install`.
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

command -v node >/dev/null 2>&1 || die "Node.js >= 22 is required. Install it from https://nodejs.org and re-run."

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -ge 22 ] || die "Node.js >= 22 required (found $(node -v))."

if ! command -v pnpm >/dev/null 2>&1; then
	say "pnpm not found - enabling it via corepack"
	corepack enable >/dev/null 2>&1 || npm install -g pnpm >/dev/null 2>&1 || die "Could not install pnpm. Install it manually: https://pnpm.io/installation"
fi

say "Installing dependencies"
pnpm install --silent

say "Building the CLI"
pnpm run build >/dev/null

say "Installing skills"
# Drop a leading `--` if present, then pass the rest to the CLI.
if [ "${1:-}" = "--" ]; then shift; fi
node dist/index.js install "$@"

printf '\033[32m✓\033[0m Done. Try: \033[1mpnpm skills list --targets\033[0m\n'
