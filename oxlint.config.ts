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
	options: {
		typeAware: true,
		typeCheck: true,
	},
	plugins: ["typescript", "unicorn", "oxc", "import", "node", "promise"],
	rules: {
		"no-shadow": "off",
		"typescript/no-explicit-any": "error",
	},
})
