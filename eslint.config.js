import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
	{ ignores: ["dist/", "node_modules/", "skills/", "templates/", "coverage/", "*.config.ts", "eslint.config.js"] },
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		languageOptions: {
			parserOptions: {
				project: "./tsconfig.check.json",
				tsconfigRootDir: import.meta.dirname,
			},
		},
		rules: {
			// The type-aware async footguns worth the extra pass.
			"@typescript-eslint/no-floating-promises": "error",
			"@typescript-eslint/no-misused-promises": "error",
			"@typescript-eslint/await-thenable": "error",
		},
	},
);
