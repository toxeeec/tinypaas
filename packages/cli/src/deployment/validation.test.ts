import { NodeServices } from "@effect/platform-node"
import { expect, layer } from "@effect/vitest"
import { Effect, FileSystem, Path } from "effect"

import { validateDeploymentDirectory } from "./validation.ts"

layer(NodeServices.layer)("validateDeploymentDirectory", (it) => {
	it.effect(
		"accepts a directory containing a flake",
		() =>
			Effect.gen(function* () {
				const fs = yield* FileSystem.FileSystem
				const path = yield* Path.Path
				const root = yield* fs.makeTempDirectoryScoped({ prefix: "tps-test-validation-" })

				yield* fs.writeFileString(path.join(root, "flake.nix"), "{}")

				expect(yield* validateDeploymentDirectory(root)).toBe(yield* fs.realPath(root))
			}),
		{ concurrent: true },
	)

	it.effect(
		"accepts a flake symlink targeting a file within the deployment",
		() =>
			Effect.gen(function* () {
				const fs = yield* FileSystem.FileSystem
				const path = yield* Path.Path
				const root = yield* fs.makeTempDirectoryScoped({ prefix: "tps-test-symlink-" })

				yield* fs.makeDirectory(path.join(root, "nix"))
				yield* fs.writeFileString(path.join(root, "nix", "app.nix"), "{}")
				yield* fs.symlink("nix/app.nix", path.join(root, "flake.nix"))

				expect(yield* validateDeploymentDirectory(root)).toBe(yield* fs.realPath(root))
			}),
		{ concurrent: true },
	)

	it.effect(
		"returns the canonical deployment directory",
		() =>
			Effect.gen(function* () {
				const fs = yield* FileSystem.FileSystem
				const path = yield* Path.Path
				const workspace = yield* fs.makeTempDirectoryScoped({ prefix: "tps-test-root-symlink-" })

				const root = path.join(workspace, "deployment")
				const alias = path.join(workspace, "alias")
				yield* fs.makeDirectory(root)
				yield* fs.writeFileString(path.join(root, "flake.nix"), "{}")
				yield* fs.symlink(root, alias)

				expect(yield* validateDeploymentDirectory(alias)).toBe(yield* fs.realPath(root))
			}),
		{ concurrent: true },
	)

	it.effect(
		"rejects a flake symlink targeting a file outside the deployment",
		() =>
			Effect.gen(function* () {
				const fs = yield* FileSystem.FileSystem
				const path = yield* Path.Path
				const workspace = yield* fs.makeTempDirectoryScoped({
					prefix: "tps-test-external-symlink-",
				})

				const root = path.join(workspace, "deployment")
				const externalFlake = path.join(workspace, "flake.nix")
				yield* fs.makeDirectory(root)
				yield* fs.writeFileString(externalFlake, "{}")
				yield* fs.symlink(externalFlake, path.join(root, "flake.nix"))

				const error = yield* Effect.flip(validateDeploymentDirectory(root))
				expect(error).toMatchObject({
					_tag: "InvalidValue",
					kind: "argument",
					option: "path",
					value: root,
				})
			}),
		{ concurrent: true },
	)

	it.effect(
		"rejects a missing flake",
		() =>
			Effect.gen(function* () {
				const fs = yield* FileSystem.FileSystem
				const root = yield* fs.makeTempDirectoryScoped({ prefix: "tps-test-missing-" })

				const error = yield* Effect.flip(validateDeploymentDirectory(root))
				expect(error).toMatchObject({
					_tag: "InvalidValue",
					kind: "argument",
					option: "path",
					value: root,
				})
			}),
		{ concurrent: true },
	)

	it.effect(
		"rejects a non-file flake",
		() =>
			Effect.gen(function* () {
				const fs = yield* FileSystem.FileSystem
				const path = yield* Path.Path

				const root = yield* fs.makeTempDirectoryScoped({ prefix: "tps-test-directory-" })
				yield* fs.makeDirectory(path.join(root, "flake.nix"))

				const error = yield* Effect.flip(validateDeploymentDirectory(root))
				expect(error).toMatchObject({
					_tag: "InvalidValue",
					kind: "argument",
					option: "path",
					value: root,
				})
			}),
		{ concurrent: true },
	)
})
