import { NodeHttpClient, NodeRuntime, NodeServices } from "@effect/platform-node"
import { Api } from "@tinypaas/api"
import { Effect, Layer } from "effect"
import { Argument, Command } from "effect/unstable/cli"
import { HttpApiClient } from "effect/unstable/httpapi"

import packageJson from "../package.json" with { type: "json" }
import { createDeploymentArchive } from "./deployment/archive.ts"
import { Git, GitDeploymentPathCollectorLayer } from "./deployment/git.ts"
import { validateDeploymentDirectory } from "./deployment/validation.ts"

const path = Argument.path("path", { pathType: "directory", mustExist: true }).pipe(
	Argument.withDefault(process.cwd()),
	Argument.mapEffect(validateDeploymentDirectory),
)
const deploy = Command.make("deploy", { path }, ({ path }) =>
	Effect.gen(function* () {
		const client = yield* HttpApiClient.make(Api, {
			baseUrl: "http://localhost:3000",
		})
		const archive = yield* createDeploymentArchive(path)
		const result = yield* client.deployments.create({ payload: archive })
		yield* Effect.log(result)
	}),
)

const tps = Command.make("tps").pipe(Command.withSubcommands([deploy]))
const program = Command.run(tps, { version: packageJson.version })

const platformLayer = NodeServices.layer
const deploymentLayer = GitDeploymentPathCollectorLayer.pipe(Layer.provide(Git.layer))
const appLayer = Layer.mergeAll(NodeHttpClient.layerUndici, deploymentLayer).pipe(
	Layer.provideMerge(platformLayer),
)

program.pipe(
	// @effect-diagnostics-next-line strictEffectProvide:off
	Effect.provide(appLayer),
	NodeRuntime.runMain,
)
