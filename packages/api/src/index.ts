import { Schema } from "effect"
import { HttpApi, HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "effect/unstable/httpapi"

export const DeploymentsApiGroup = HttpApiGroup.make("deployments")
	.add(
		HttpApiEndpoint.post("create", "/", {
			payload: Schema.Uint8Array.pipe(
				HttpApiSchema.asUint8Array({ contentType: "application/zstd" }),
			),
			success: Schema.String,
		}),
	)
	.prefix("/deployments")

export const Api = HttpApi.make("tinypaas").add(DeploymentsApiGroup)
