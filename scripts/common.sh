# Shared helpers for install.sh and uninstall.sh. POSIX sh; sourced, not executed.

REPO_SOURCE="emiliodominguez/flow-skills"
SKILLS_CLI="skills@1"

say() { printf '\033[36m›\033[0m %s\n' "$1"; }
die() { printf '\033[31m✗\033[0m %s\n' "$1" >&2; exit 1; }

require_node() {
	command -v node >/dev/null 2>&1 || die "Node.js is required for npx skills. Install it from https://nodejs.org and re-run."
	command -v npx >/dev/null 2>&1 || die "npx is required (it ships with npm)."
}

# Print the space-separated skills of a profile from profiles.json.
profile_skills() {
	node -e '
		const [file, name] = process.argv.slice(1);
		const profiles = require(file).profiles ?? {};
		if (!profiles[name]) { console.error("Unknown profile \"" + name + "\". Known: " + Object.keys(profiles).join(", ")); process.exit(1); }
		console.log(profiles[name].join(" "));
	' "$ROOT/profiles.json" "$1"
}

# Print every skill name in this checkout.
all_skills() {
	for dir in "$ROOT"/skills/*/; do
		[ -f "$dir/SKILL.md" ] && basename "$dir"
	done | tr '\n' ' '
}

# Remove installs left by the retired agent-skills CLI (ed-* skills): symlinks into a
# skills/ed-* source directory, and copies carrying its .agent-skills ownership marker.
# Anything else is left alone.
remove_legacy() {
	for dir in "$HOME/.claude/skills" "$HOME/.agents/skills" ".claude/skills" ".agents/skills"; do
		[ -d "$dir" ] || continue
		for entry in "$dir"/ed-*; do
			if [ -L "$entry" ]; then
				case "$(readlink "$entry")" in
					*/skills/ed-*) ;;
					*) continue ;;
				esac
			elif [ -d "$entry" ] && [ -f "$entry/.agent-skills" ]; then
				:
			else
				continue
			fi
			if [ "$DRY_RUN" = 1 ]; then
				say "would remove legacy install $entry"
			else
				rm -rf "$entry"
				say "removed legacy install $entry"
			fi
		done
	done
}
