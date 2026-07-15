import { Readable } from "node:stream"

import { NodeStream } from "@effect/platform-node"
import { Data, Effect } from "effect"
import * as tar from "tar"

import { DeploymentPathCollector } from "./path-collector.ts"

export class ArchiveError extends Data.TaggedError("ArchiveError")<{
	readonly cause: unknown
}> {}

export const createDeploymentArchive = Effect.fn("createDeploymentArchive")(function* (
	directory: string,
) {
	const collector = yield* DeploymentPathCollector
	const entries = yield* collector
		.collect(directory)
		.pipe(Effect.map((entries) => entries.map((entry) => `./${entry}`)))

	return yield* NodeStream.toUint8Array(
		() =>
			Readable.from(
				tar.create(
					{
						cwd: directory,
						filter: (_path, stat) => {
							if (!("isFile" in stat)) throw new TypeError("expected filesystem stats")
							if (stat.isFile()) stat.nlink = 1
							return true
						},
						follow: false,
						noDirRecurse: true,
						noMtime: true,
						portable: true,
						strict: true,
						zstd: true,
					},
					entries,
				),
			),
		{ onError: (cause) => new ArchiveError({ cause }) },
	)
})
