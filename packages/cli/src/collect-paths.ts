// @effect-diagnostics-next-line nodeBuiltinImport:off
import * as NodeFileSystem from "node:fs"

import { Data, Effect, FileSystem, Path } from "effect"

export class EntryMetadataError extends Data.TaggedError("EntryMetadataError")<{
	readonly path: string
	readonly cause: unknown
}> {}

const getEntryType = (path: string) =>
	Effect.tryPromise({
		try: () => NodeFileSystem.promises.lstat(path),
		catch: (cause) => new EntryMetadataError({ path, cause }),
	}).pipe(
		Effect.map((info) => {
			if (info.isDirectory()) return "Directory"
			if (info.isFile()) return "File"
			if (info.isSymbolicLink()) return "SymbolicLink"
			return undefined
		}),
	)

export const collectPaths = Effect.fn("collectPaths")(function* <E = never>(
	root: string,
	shouldInclude?: (
		entryPath: string,
		type: NonNullable<Effect.Success<ReturnType<typeof getEntryType>>>,
	) => Effect.Effect<boolean, E>,
) {
	const fs = yield* FileSystem.FileSystem
	const path = yield* Path.Path
	const paths: Array<string> = []
	const pending = [root]

	while (pending.length > 0) {
		const directory = pending.pop()!

		for (const name of yield* fs.readDirectory(directory)) {
			const absolutePath = path.join(directory, name)
			const type = yield* getEntryType(absolutePath)
			if (type === undefined) continue

			const entryPath = path.relative(root, absolutePath).split(path.sep).join("/")
			if (shouldInclude !== undefined && !(yield* shouldInclude(entryPath, type))) continue

			if (type === "Directory") {
				pending.push(absolutePath)
			} else {
				paths.push(entryPath)
			}
		}
	}

	return paths
})
