import { Effect, FileSystem, Path } from "effect"
import { CliError } from "effect/unstable/cli"

export const validateDeploymentDirectory = Effect.fn("validateDeploymentDirectory")(function* (
	directory: string,
) {
	const path = yield* Path.Path
	const fs = yield* FileSystem.FileSystem

	const realRoot = yield* fs
		.realPath(path.resolve(directory))
		.pipe(Effect.mapError((cause) => CliError.UserError.make({ cause })))

	const hasFlake = yield* Effect.gen(function* () {
		const realFlakePath = yield* fs.realPath(path.join(realRoot, "flake.nix"))
		const relativeFlakePath = path.relative(realRoot, realFlakePath)

		if (
			relativeFlakePath === ".." ||
			relativeFlakePath.startsWith(`..${path.sep}`) ||
			path.isAbsolute(relativeFlakePath)
		) {
			return false
		}

		return (yield* fs.stat(realFlakePath)).type === "File"
	}).pipe(
		Effect.catchReason("PlatformError", "NotFound", () => Effect.succeed(false)),
		Effect.mapError((cause) => CliError.UserError.make({ cause })),
	)

	if (!hasFlake) {
		return yield* CliError.InvalidValue.make({
			option: "path",
			value: directory,
			expected: "a directory containing flake.nix file",
			kind: "argument",
		})
	}

	return realRoot
})
