import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm"],
	target: "node22",
	clean: true,
	minify: false,
	sourcemap: true,
	// Keep the shebang and mark the output as a runnable bin.
	banner: { js: "#!/usr/bin/env node" },
});
