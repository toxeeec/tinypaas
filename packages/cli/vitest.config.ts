import { defineConfig } from "vitest/config"

export default defineConfig({
	ssr: {
		noExternal: ["@effect/vitest"],
	},
	test: {
		include: ["src/**/*.test.ts"],
	},
})
