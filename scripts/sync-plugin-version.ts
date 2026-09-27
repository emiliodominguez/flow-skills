import fs from "node:fs";
import path from "node:path";
import { findRepoRoot } from "../src/core/repo.js";

/**
 * Copy package.json's version into the plugin manifest after `changeset version`, so plugin
 * installs update in step with the changelog. `pnpm validate` fails if they drift.
 */
const root = findRepoRoot();
const version = (JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")) as { version: string }).version;
const manifest = path.join(root, ".claude-plugin", "plugin.json");
const plugin = JSON.parse(fs.readFileSync(manifest, "utf8")) as Record<string, unknown>;

if (plugin.version !== version) {
	plugin.version = version;
	fs.writeFileSync(manifest, JSON.stringify(plugin, null, "\t") + "\n", "utf8");
}

console.log(`Plugin manifest at version ${version}.`);
