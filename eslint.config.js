// @ts-check
const eslint = require("@eslint/js");
const tseslint = require("typescript-eslint");
const angular = require("angular-eslint");
const prettier = require("eslint-config-prettier/flat");

// Migrated from .eslintrc.json (eslintrc format, unreadable by ESLint v9+).
//
// Stylistic rules that used to live here -- quotes, semi, indent -- are now
// Prettier's job and are deliberately absent: eslint-config-prettier is
// applied last to switch off any rule that would disagree with the formatter,
// so the editor's prettier-eslint chain cannot fight itself. Formatting is
// configured in .prettierrc (tabs, double quotes, semicolons), which is the
// same contract CLAUDE.md states.
module.exports = tseslint.config(
	{
		ignores: [
			"sessions/**",
			"public_html/**",
			// Build output. Linting generated bundles reports thousands of
			// no-undef hits against webpack's own runtime and tells us nothing.
			"dist/**",
			"coverage/**",
			"node_modules/**",
			".vscode/**",
			".idea/**",
			".github/**",
			".angular/**",
		],
	},
	{
		files: ["**/*.ts"],
		extends: [
			eslint.configs.recommended,
			...tseslint.configs.recommended,
			...angular.configs.tsRecommended,
			prettier,
		],
		processor: angular.processInlineTemplates,
		rules: {
			"@typescript-eslint/no-unused-expressions": "warn",
			"@typescript-eslint/no-empty-object-type": "warn",
			"@typescript-eslint/no-explicit-any": "warn",
			"@typescript-eslint/no-unused-vars": "warn",
			"@typescript-eslint/no-non-null-assertion": "off",
			"@angular-eslint/directive-selector": ["error", { type: "attribute", prefix: "app", style: "camelCase" }],
			"@angular-eslint/component-selector": ["error", { type: "element", style: "kebab-case" }],
			"no-console": "off",
		},
	},
	{
		files: ["**/*.html"],
		extends: [...angular.configs.templateRecommended, prettier],
		rules: {},
	},
	{
		// Karma/Jasmine specs: the test globals are injected by the runner.
		files: ["**/*.spec.ts"],
		languageOptions: {
			globals: {
				describe: "readonly",
				it: "readonly",
				expect: "readonly",
				beforeEach: "readonly",
				afterEach: "readonly",
				beforeAll: "readonly",
				afterAll: "readonly",
				jasmine: "readonly",
				spyOn: "readonly",
				fail: "readonly",
				pending: "readonly",
			},
		},
	},
	{
		// server.js and other CommonJS Node scripts.
		files: ["**/*.js"],
		extends: [eslint.configs.recommended, prettier],
		languageOptions: {
			sourceType: "commonjs",
			globals: {
				require: "readonly",
				module: "writable",
				process: "readonly",
				__dirname: "readonly",
				__filename: "readonly",
				Buffer: "readonly",
				setTimeout: "readonly",
				clearTimeout: "readonly",
				setInterval: "readonly",
				clearInterval: "readonly",
				console: "readonly",
			},
		},
		rules: {},
	},
);
