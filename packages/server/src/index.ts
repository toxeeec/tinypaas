// @effect-diagnostics-next-line nodeBuiltinImport:off
import { createServer } from "node:http"

import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Effect, Layer, Schema } from "effect"
import { HttpRouter } from "effect/unstable/http"
import { HttpApi, HttpApiBuilder, HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi"

const DeploymentsApiGroup = HttpApiGroup.make("deployments")
	.add(HttpApiEndpoint.post("create", "/", { success: Schema.String }))
	.prefix("/deployments")

const Api = HttpApi.make("tinypaas").add(DeploymentsApiGroup)

const DeploymentsHandlers = HttpApiBuilder.group(Api, "deployments", (handlers) =>
	handlers.handle("create", () => Effect.succeed("Hello, world!")),
)

const ApiRoutes = HttpApiBuilder.layer(Api, { openapiPath: "/openapi.json" }).pipe(
	Layer.provide(DeploymentsHandlers),
)

HttpRouter.serve(ApiRoutes).pipe(
	Layer.provide(NodeHttpServer.layer(createServer, { port: 3000 })),
	Layer.launch,
	NodeRuntime.runMain,
)
