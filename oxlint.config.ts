import { defineConfig } from "oxlint"

export default defineConfig({
	categories: {
		correctness: "error",
		perf: "error",
		suspicious: "error",
	},
	env: {
		builtin: true,
	},
	ignorePatterns: ["repos/**"],
	options: {
		typeAware: true,
	},
	plugins: ["typescript", "unicorn", "oxc", "import", "node", "promise"],
	rules: {
		"no-shadow": "off",
		"no-underscore-dangle": "off",
		"sort-imports": [
			"error",
			{
				ignoreDeclarationSort: true,
				ignoreMemberSort: false,
			},
		],
		"typescript/no-explicit-any": "error",
	},
})
