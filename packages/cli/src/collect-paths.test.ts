import { NodeServices } from "@effect/platform-node"
import { expect, layer } from "@effect/vitest"
import { Effect, FileSystem, Path } from "effect"

import { collectPaths } from "./collect-paths.ts"

layer(NodeServices.layer)("collectPaths", (it) => {
	it.effect(
		"returns nested files as normalized relative paths",
		() =>
			Effect.gen(function* () {
				const fs = yield* FileSystem.FileSystem
				const path = yield* Path.Path
				const root = yield* fs.makeTempDirectoryScoped({ prefix: "tps-test-collect-paths-" })

				yield* fs.makeDirectory(path.join(root, "src", "nested"), { recursive: true })
				yield* fs.writeFileString(path.join(root, "flake.nix"), "{}")
				yield* fs.writeFileString(path.join(root, "src", "nested", "app.ts"), "export {}")

				const paths = yield* collectPaths(root)
				expect(paths.toSorted()).toEqual(["flake.nix", "src/nested/app.ts"])
			}),
		{ concurrent: true },
	)

	it.effect(
		"includes a directory symlink without traversing its target",
		() =>
			Effect.gen(function* () {
				const fs = yield* FileSystem.FileSystem
				const path = yield* Path.Path
				const workspace = yield* fs.makeTempDirectoryScoped({ prefix: "tps-test-workspace-" })

				const root = path.join(workspace, "deployment")
				const target = path.join(workspace, "target")
				yield* fs.makeDirectory(root)
				yield* fs.makeDirectory(target)
				yield* fs.writeFileString(path.join(target, "secret.txt"), "secret")
				yield* fs.symlink(target, path.join(root, "linked"))

				expect(yield* collectPaths(root)).toEqual(["linked"])
			}),
		{ concurrent: true },
	)

	it.effect(
		"prunes rejected directories",
		() =>
			Effect.gen(function* () {
				const fs = yield* FileSystem.FileSystem
				const path = yield* Path.Path
				const root = yield* fs.makeTempDirectoryScoped({ prefix: "tps-test-prune-" })

				yield* fs.makeDirectory(path.join(root, "included"))
				yield* fs.makeDirectory(path.join(root, "ignored"))
				yield* fs.writeFileString(path.join(root, "included", "app.ts"), "export {}")
				yield* fs.writeFileString(path.join(root, "ignored", "secret.txt"), "secret")

				const visited: Array<string> = []
				const paths = yield* collectPaths(root, (entryPath) =>
					Effect.sync(() => {
						visited.push(entryPath)
						return entryPath !== "ignored"
					}),
				)

				expect(paths).toEqual(["included/app.ts"])
				expect(visited).not.toContain("ignored/secret.txt")
			}),
		{ concurrent: true },
	)
})
