import { NodeServices, NodeRuntime } from "@effect/platform-node"
import { Console, Effect } from "effect"
import { Argument, Command } from "effect/unstable/cli"

import packageJson from "../package.json" with { type: "json" }

const path = Argument.path("path", { pathType: "directory", mustExist: true }).pipe(
	Argument.withDefault(process.cwd()),
)
const deploy = Command.make("deploy", { path }, ({ path }) => Console.log(path))

const tps = Command.make("tps").pipe(Command.withSubcommands([deploy]))
const program = Command.run(tps, { version: packageJson.version })
program.pipe(Effect.provide(NodeServices.layer), NodeRuntime.runMain)
