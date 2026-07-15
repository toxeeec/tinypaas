import { NodeServices } from "@effect/platform-node"
import { expect, layer } from "@effect/vitest"
import { Effect, FileSystem, Layer, Path } from "effect"

import { Git, collectDeploymentPaths } from "./git.ts"
import { RequiredDeploymentFileMissing } from "./path-collector.ts"

layer(NodeServices.layer)("collectDeploymentPaths", (it) => {
	it.effect(
		"applies tracked and ignored path policy",
		() => {
			const gitLayer = Layer.succeed(Git, {
				findRoot: (root) => Effect.succeed(root),
				listFiles: () => Effect.succeed(["tracked-ignored.txt"]),
				isIgnored: (_root, path) =>
					Effect.succeed(
						path === "tracked-ignored.txt" || path === "ignored.txt" || path === "ignored/",
					),
			})

			return Effect.gen(function* () {
				const fs = yield* FileSystem.FileSystem
				const path = yield* Path.Path
				const root = yield* fs.makeTempDirectoryScoped({ prefix: "tps-test-git-policy-" })

				yield* fs.makeDirectory(path.join(root, ".git"))
				yield* fs.makeDirectory(path.join(root, "ignored"))
				yield* fs.writeFileString(path.join(root, ".git", "config"), "secret")
				yield* fs.writeFileString(path.join(root, "flake.nix"), "{}")
				yield* fs.writeFileString(path.join(root, "tracked-ignored.txt"), "tracked")
				yield* fs.writeFileString(path.join(root, "source.txt"), "source")
				yield* fs.writeFileString(path.join(root, "ignored.txt"), "ignored")
				yield* fs.writeFileString(path.join(root, "ignored", "secret.txt"), "ignored")

				expect((yield* collectDeploymentPaths(root)).toSorted()).toEqual([
					"flake.nix",
					"source.txt",
					"tracked-ignored.txt",
				])
			}).pipe(Effect.provide(gitLayer))
		},
		{ concurrent: true },
	)

	it.effect(
		"fails when Git excludes the required flake",
		() => {
			const gitLayer = Layer.succeed(Git, {
				findRoot: (root) => Effect.succeed(root),
				listFiles: () => Effect.succeed([]),
				isIgnored: (_root, path) => Effect.succeed(path === "flake.nix"),
			})

			return Effect.gen(function* () {
				const fs = yield* FileSystem.FileSystem
				const path = yield* Path.Path
				const root = yield* fs.makeTempDirectoryScoped({ prefix: "tps-test-missing-flake-" })

				yield* fs.writeFileString(path.join(root, "flake.nix"), "{}")

				const error = yield* Effect.flip(collectDeploymentPaths(root))
				expect(error).toEqual(new RequiredDeploymentFileMissing({ path: "flake.nix" }))
			}).pipe(Effect.provide(gitLayer))
		},
		{ concurrent: true },
	)

	it.effect(
		"returns paths relative to a deployment subdirectory",
		() => {
			let repositoryRoot = ""
			const ignoredLookups: Array<string> = []
			const gitLayer = Layer.succeed(Git, {
				findRoot: () => Effect.sync(() => repositoryRoot),
				listFiles: () => Effect.succeed(["apps/demo/nested/app.ts", "sibling.txt"]),
				isIgnored: (_root, path) =>
					Effect.sync(() => {
						ignoredLookups.push(path)
						return path === "apps/demo/ignored.txt" || path === "apps/demo/ignored/"
					}),
			})

			return Effect.gen(function* () {
				const fs = yield* FileSystem.FileSystem
				const path = yield* Path.Path
				const repository = yield* fs.makeTempDirectoryScoped({
					prefix: "tps-test-git-subdirectory-",
				})
				repositoryRoot = yield* fs.realPath(repository)
				const root = path.join(repository, "apps", "demo")
				yield* fs.makeDirectory(path.join(root, "nested"), { recursive: true })
				yield* fs.makeDirectory(path.join(root, "ignored"))
				yield* fs.writeFileString(path.join(root, "flake.nix"), "{}")
				yield* fs.writeFileString(path.join(root, "nested", "app.ts"), "export {}")
				yield* fs.writeFileString(path.join(root, "source.txt"), "source")
				yield* fs.writeFileString(path.join(root, "ignored.txt"), "ignored")
				yield* fs.writeFileString(path.join(root, "ignored", "secret.txt"), "ignored")
				yield* fs.writeFileString(path.join(repository, "sibling.txt"), "sibling")

				expect((yield* collectDeploymentPaths(root)).toSorted()).toEqual([
					"flake.nix",
					"nested/app.ts",
					"source.txt",
				])
				expect(ignoredLookups.toSorted()).toEqual([
					"apps/demo/flake.nix",
					"apps/demo/ignored.txt",
					"apps/demo/ignored/",
					"apps/demo/source.txt",
				])
			}).pipe(Effect.provide(gitLayer))
		},
		{ concurrent: true },
	)

	it.effect(
		"falls back to all files outside a Git repository",
		() => {
			const gitLayer = Layer.succeed(Git, {
				findRoot: () => Effect.sync((): string | undefined => undefined),
				listFiles: () => Effect.die("unexpected listFiles call"),
				isIgnored: () => Effect.die("unexpected isIgnored call"),
			})

			return Effect.gen(function* () {
				const fs = yield* FileSystem.FileSystem
				const path = yield* Path.Path
				const root = yield* fs.makeTempDirectoryScoped({ prefix: "tps-test-no-git-" })
				yield* fs.makeDirectory(path.join(root, "src"))
				yield* fs.writeFileString(path.join(root, "flake.nix"), "{}")
				yield* fs.writeFileString(path.join(root, "src", "app.ts"), "export {}")

				expect((yield* collectDeploymentPaths(root)).toSorted()).toEqual([
					"flake.nix",
					"src/app.ts",
				])
			}).pipe(Effect.provide(gitLayer))
		},
		{ concurrent: true },
	)
})
