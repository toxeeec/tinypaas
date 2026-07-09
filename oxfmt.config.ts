import { defineConfig } from "oxfmt"

export default defineConfig({
	printWidth: 100,
	semi: false,
	sortImports: true,
	useTabs: true,
	overrides: [
		{
			files: ["**/package.json"],
			options: {
				tabWidth: 2,
				useTabs: false,
			},
		},
	],
})
