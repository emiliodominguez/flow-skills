import js from "@eslint/js";
import tseslint from "typescript-eslint";
import stylistic from "@stylistic/eslint-plugin";
import jsdoc from "eslint-plugin-jsdoc";

// Blank-line discipline: keep declarations, statements, and blocks from stacking with no
// breathing room. Auto-fixable, and Prettier preserves the single blank lines it inserts.
const padding = [
	"error",
	{ blankLine: "always", prev: "directive", next: "*" },
	{ blankLine: "always", prev: "import", next: "*" },
	{ blankLine: "any", prev: "import", next: "import" },
	{ blankLine: "always", prev: "*", next: "return" },
	{ blankLine: "always", prev: ["const", "let"], next: "*" },
	{ blankLine: "any", prev: ["const", "let"], next: ["const", "let"] },
	{ blankLine: "always", prev: "*", next: ["function", "class"] },
	{ blankLine: "always", prev: ["function", "class"], next: "*" },
	{ blankLine: "always", prev: "*", next: ["if", "for", "while", "switch", "try"] },
	{ blankLine: "always", prev: ["if", "for", "while", "switch", "try"], next: "*" },
];

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
		plugins: { "@stylistic": stylistic },
		rules: {
			// The type-aware async footguns worth the extra pass.
			"@typescript-eslint/no-floating-promises": "error",
			"@typescript-eslint/no-misused-promises": "error",
			"@typescript-eslint/await-thenable": "error",
			// Vertical spacing - proper separation between statements and declarations.
			"@stylistic/padding-line-between-statements": padding,
			"@stylistic/lines-between-class-members": ["error", "always", { exceptAfterSingleLine: true }],
		},
	},
	// JSDoc on the source's functions (the house rule: @param + @returns where non-void).
	{
		files: ["src/**/*.ts"],
		plugins: { jsdoc },
		rules: {
			"jsdoc/require-jsdoc": [
				"error",
				{
					require: { FunctionDeclaration: true, MethodDefinition: true, ClassDeclaration: true },
					publicOnly: false,
				},
			],
			"jsdoc/require-param": ["error", { checkDestructured: false }],
			"jsdoc/require-param-description": "error",
			"jsdoc/check-param-names": ["error", { checkDestructured: false }],
			"jsdoc/require-returns": "error",
			"jsdoc/require-returns-description": "error",
			"jsdoc/require-hyphen-before-param-description": ["error", "always"],
			"jsdoc/check-alignment": "error",
			"jsdoc/no-types": "off",
		},
	},
);
