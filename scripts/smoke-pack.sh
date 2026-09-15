#!/usr/bin/env sh
# Exercise the shipped CLI from a clean consumer, including corpus and native installs.
set -eu

PACK_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PACK_TEMP="$(mktemp -d)"
trap 'rm -rf "$PACK_TEMP"' EXIT

if ! (cd "$PACK_ROOT" && pnpm pack --pack-destination "$PACK_TEMP") >"$PACK_TEMP/pack.log" 2>&1; then
	cat "$PACK_TEMP/pack.log"
	exit 1
fi

set -- "$PACK_TEMP"/*.tgz
PACK_TARBALL="$1"
cd "$PACK_TEMP"
npm init -y >"$PACK_TEMP/init.log" 2>&1

if ! npm install "$PACK_TARBALL" >"$PACK_TEMP/install.log" 2>&1; then
	cat "$PACK_TEMP/install.log"
	exit 1
fi

PACK_BIN="$PACK_TEMP/node_modules/.bin/agent-skills"
"$PACK_BIN" list --json >"$PACK_TEMP/list.json"
"$PACK_BIN" validate

node --input-type=commonjs - "$PACK_ROOT" "$PACK_TEMP" <<'NODE'
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const [source, consumer] = process.argv.slice(2);
const sourceSkills = path.join(source, "skills");
const shipped = path.join(consumer, "node_modules/@emiliodominguez/agent-skills");
const expected = fs.readdirSync(sourceSkills).filter(name => fs.existsSync(path.join(sourceSkills, name, "SKILL.md"))).sort();
const listed = JSON.parse(fs.readFileSync(path.join(consumer, "list.json"), "utf8"));
assert(expected.length > 0, "Source corpus is empty");
assert.deepEqual(listed.skills.map(skill => skill.name).sort(), expected);
assert.deepEqual(listed.profiles, JSON.parse(fs.readFileSync(path.join(source, "agent-skills.config.json"), "utf8")).profiles);
for (const name of expected) {
    assert.deepEqual(fs.readFileSync(path.join(shipped, "skills", name, "SKILL.md")), fs.readFileSync(path.join(sourceSkills, name, "SKILL.md")));
}
console.log(`Packaged CLI lists all ${expected.length} skills with exact source bytes and profiles.`);
NODE

for PACK_MODE in copy symlink; do
	mkdir "$PACK_TEMP/$PACK_MODE"
	cd "$PACK_TEMP/$PACK_MODE"
	if [ "$PACK_MODE" = copy ]; then
		set -- --copy
	else
		set --
	fi
	if ! "$PACK_BIN" install -t claude codex --scope project "$@" >"$PACK_TEMP/native-$PACK_MODE.log" 2>&1; then
		cat "$PACK_TEMP/native-$PACK_MODE.log"
		exit 1
	fi
	"$PACK_BIN" doctor -t claude codex --scope project --json >"$PACK_TEMP/doctor-$PACK_MODE.json"
done

node --input-type=commonjs - "$PACK_TEMP" <<'NODE'
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const consumer = process.argv[2];
const count = JSON.parse(fs.readFileSync(path.join(consumer, "list.json"), "utf8")).skills.length;
for (const [mode, state] of [["copy", "copied"], ["symlink", "linked"]]) {
    const report = JSON.parse(fs.readFileSync(path.join(consumer, `doctor-${mode}.json`), "utf8"));
    assert.equal(report.healthy, true);
    assert.equal(report.targets.length, 2);
    for (const target of report.targets) assert.equal(target.counts[state], count);
}
console.log(`Native Claude Code and Codex: ${count} copies and ${count} symlinks each are healthy.`);
NODE
