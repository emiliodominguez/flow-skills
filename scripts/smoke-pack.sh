#!/usr/bin/env sh
# Packaging smoke test: pack the package, install the tarball into a clean throwaway
# project, and confirm the shipped bin resolves and lists the skills. Guards against
# missing `files`, a broken bin, or a root-resolution regression that only shows up
# once the package is actually installed elsewhere.
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "› packing"
(cd "$ROOT" && pnpm pack --pack-destination "$TMP" >/dev/null 2>&1)
TARBALL="$(ls "$TMP"/*.tgz | head -1)"

echo "› installing the tarball into a clean project"
cd "$TMP"
npm init -y >/dev/null 2>&1
npm install "$TARBALL" >/dev/null 2>&1

COUNT="$(./node_modules/.bin/agent-skills list | grep -oE 'Skills \([0-9]+\)' | grep -oE '[0-9]+' | head -1)"
if [ "${COUNT:-0}" -ge 16 ]; then
	printf '\033[32m✓\033[0m packaged bin works from a clean install (%s skills)\n' "$COUNT"
else
	printf '\033[31m✗\033[0m packaged bin found %s skills (expected >= 16)\n' "${COUNT:-0}"
	exit 1
fi
