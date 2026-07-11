import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		include: ["test/**/*.test.ts"],
		environment: "node",
		globals: false,
		coverage: {
			provider: "v8",
			include: ["src/**/*.ts"],
			// index.ts is CLI wiring exercised by the packaging smoke test, not unit tests.
			exclude: ["src/index.ts", "src/core/logger.ts"],
			thresholds: {
				lines: 70,
				functions: 70,
				branches: 70,
				statements: 70,
			},
		},
	},
});
