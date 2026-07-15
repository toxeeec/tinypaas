import { NodeServices } from "@effect/platform-node"
import { expect, layer } from "@effect/vitest"
import { Effect, FileSystem, Layer, Path } from "effect"
import * as tar from "tar"

import { createDeploymentArchive } from "./archive.ts"
import { DeploymentPathCollector } from "./path-collector.ts"

const readArchiveEntries = (archive: Uint8Array) =>
	Effect.callback<tar.ReadEntry[], Error>((resume) => {
		const entries: tar.ReadEntry[] = []
		const parser = tar.list({
			onReadEntry: (entry) => {
				entries.push(entry)
				entry.resume()
			},
		})
		parser.once("error", (error: Error) => resume(Effect.fail(error)))
		parser.once("end", () => resume(Effect.succeed(entries)))
		parser.end(Buffer.from(archive))
	})

const collectorLayer = Layer.succeed(DeploymentPathCollector, {
	collect: () => Effect.succeed(["flake.nix", "linked"]),
})

layer(Layer.merge(NodeServices.layer, collectorLayer))("createDeploymentArchive", (it) => {
	it.effect(
		"archives only collected paths without following symlinks",
		() =>
			Effect.gen(function* () {
				const fs = yield* FileSystem.FileSystem
				const path = yield* Path.Path
				const fixture = yield* fs.makeTempDirectoryScoped({ prefix: "tps-test-archive-" })

				const root = path.join(fixture, "deployment")
				const target = path.join(fixture, "target")
				yield* fs.makeDirectory(root)
				yield* fs.makeDirectory(target)
				yield* fs.writeFileString(path.join(root, "flake.nix"), "{}")
				yield* fs.writeFileString(path.join(root, "excluded.txt"), "excluded")
				yield* fs.writeFileString(path.join(target, "secret.txt"), "secret")
				yield* fs.symlink(target, path.join(root, "linked"))

				const archive = yield* createDeploymentArchive(root)
				const entries = yield* readArchiveEntries(archive)
				expect(entries).toMatchObject([
					{ path: "./flake.nix", type: "File" },
					{ path: "./linked", type: "SymbolicLink" },
				])
			}),
		{ concurrent: true },
	)
})
