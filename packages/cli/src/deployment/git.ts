// @effect-diagnostics-next-line nodeBuiltinImport:off
import * as NodeFileSystem from "node:fs"

import { Context, Effect, FileSystem, Layer, Path } from "effect"
import { Errors, findRoot, isIgnored, listFiles } from "isomorphic-git"

import { collectPaths } from "../collect-paths.ts"
import {
	DeploymentPathCollectionError,
	DeploymentPathCollector,
	GitOperationError,
	RequiredDeploymentFileMissing,
} from "./path-collector.ts"

export class Git extends Context.Service<
	Git,
	{
		readonly findRoot: (path: string) => Effect.Effect<string | undefined, GitOperationError>
		readonly listFiles: (
			directory: string,
		) => Effect.Effect<ReadonlyArray<string>, GitOperationError>
		readonly isIgnored: (
			directory: string,
			path: string,
		) => Effect.Effect<boolean, GitOperationError>
	}
>()("@tinypaas/cli/deployment/git") {
	static readonly layer = Layer.succeed(Git, {
		findRoot: (path) =>
			Effect.tryPromise({
				try: () =>
					findRoot({ fs: NodeFileSystem, filepath: path }).catch((cause: unknown) => {
						if (cause instanceof Errors.NotFoundError) return undefined
						throw cause
					}),
				catch: (cause) => new GitOperationError({ cause }),
			}),
		listFiles: (directory) =>
			Effect.tryPromise({
				try: () => listFiles({ fs: NodeFileSystem, dir: directory }),
				catch: (cause) => new GitOperationError({ cause }),
			}),
		isIgnored: (directory, path) =>
			Effect.tryPromise({
				try: () => isIgnored({ fs: NodeFileSystem, dir: directory, filepath: path }),
				catch: (cause) => new GitOperationError({ cause }),
			}),
	})
}

const collectGitPaths = Effect.fn("collectGitPaths")(function* (root: string, gitRoot: string) {
	const path = yield* Path.Path
	const git = yield* Git

	const trackedPaths = new Set(yield* git.listFiles(gitRoot))
	const trackedDirectories = new Set<string>()
	for (const trackedPath of trackedPaths) {
		let separatorIdx = trackedPath.lastIndexOf("/")
		while (separatorIdx !== -1) {
			trackedDirectories.add(trackedPath.slice(0, separatorIdx))
			separatorIdx = trackedPath.lastIndexOf("/", separatorIdx - 1)
		}
	}

	return yield* collectPaths(root, (entryPath, type) =>
		Effect.gen(function* () {
			const repositoryPath = path
				.relative(gitRoot, path.join(root, entryPath))
				.split(path.sep)
				.join("/")
			if (repositoryPath.split("/").includes(".git")) return false

			if (
				trackedPaths.has(repositoryPath) ||
				(type === "Directory" && trackedDirectories.has(repositoryPath))
			) {
				return true
			}

			return !(yield* git.isIgnored(
				gitRoot,
				type === "Directory" ? `${repositoryPath}/` : repositoryPath,
			))
		}),
	)
})

export const collectDeploymentPaths = Effect.fn("collectDeploymentPaths")(function* (
	directory: string,
) {
	const fs = yield* FileSystem.FileSystem
	const path = yield* Path.Path
	const git = yield* Git
	const root = yield* fs.realPath(path.resolve(directory))
	const gitRoot = yield* git.findRoot(root)
	const paths = yield* gitRoot === undefined ? collectPaths(root) : collectGitPaths(root, gitRoot)
	if (!paths.includes("flake.nix")) {
		return yield* new RequiredDeploymentFileMissing({ path: "flake.nix" })
	}
	return paths
})

export const GitDeploymentPathCollectorLayer = Layer.effect(
	DeploymentPathCollector,
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem
		const path = yield* Path.Path
		const git = yield* Git

		return {
			collect: (directory: string) =>
				collectDeploymentPaths(directory).pipe(
					Effect.provideService(FileSystem.FileSystem, fs),
					Effect.provideService(Path.Path, path),
					Effect.provideService(Git, git),
					Effect.mapError((reason) => new DeploymentPathCollectionError({ reason })),
				),
		}
	}),
)
