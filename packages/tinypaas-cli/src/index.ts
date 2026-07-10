import { NodeServices, NodeRuntime } from "@effect/platform-node"
import { Effect, FileSystem, Path } from "effect"
import { Argument, CliError, Command } from "effect/unstable/cli"

import packageJson from "../package.json" with { type: "json" }

const path = Argument.path("path", { pathType: "directory", mustExist: true }).pipe(
	Argument.withDefault(process.cwd()),
	Argument.mapEffect((directory) =>
		Effect.gen(function* () {
			const path = yield* Path.Path
			const fs = yield* FileSystem.FileSystem

			const flakePath = path.join(directory, "flake.nix")
			const hasFlake = yield* fs.stat(flakePath).pipe(
				Effect.match({
					onSuccess: (stat) => stat.type === "File",
					onFailure: () => false,
				}),
			)
			if (!hasFlake) {
				return yield* CliError.InvalidValue.make({
					option: "path",
					value: directory,
					expected: "a directory containing flake.nix file",
					kind: "argument",
				})
			}

			return directory
		}),
	),
)
const deploy = Command.make("deploy", { path }, () => Effect.void)

const tps = Command.make("tps").pipe(Command.withSubcommands([deploy]))
const program = Command.run(tps, { version: packageJson.version })
program.pipe(Effect.provide(NodeServices.layer), NodeRuntime.runMain)
