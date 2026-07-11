import { Schema } from "effect"
import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi"

export const DeploymentsApiGroup = HttpApiGroup.make("deployments")
	.add(HttpApiEndpoint.post("create", "/", { success: Schema.String }))
	.prefix("/deployments")

export const Api = HttpApi.make("tinypaas").add(DeploymentsApiGroup)
