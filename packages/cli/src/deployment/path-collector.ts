import { Context, Data, Effect } from "effect"
import type { PlatformError } from "effect/PlatformError"

import type { EntryMetadataError } from "../collect-paths.ts"

export class GitOperationError extends Data.TaggedError("GitOperationError")<{
	readonly cause: unknown
}> {}

export class RequiredDeploymentFileMissing extends Data.TaggedError(
	"RequiredDeploymentFileMissing",
)<{
	readonly path: string
}> {}

export class DeploymentPathCollectionError extends Data.TaggedError(
	"DeploymentPathCollectionError",
)<{
	readonly reason:
		| PlatformError
		| EntryMetadataError
		| GitOperationError
		| RequiredDeploymentFileMissing
}> {}

export class DeploymentPathCollector extends Context.Service<
	DeploymentPathCollector,
	{
		readonly collect: (
			directory: string,
		) => Effect.Effect<Array<string>, DeploymentPathCollectionError>
	}
>()("@tinypaas/cli/deployment/path-collector/DeploymentPathCollector") {}
