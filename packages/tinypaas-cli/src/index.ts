import { NodeServices, NodeRuntime } from "@effect/platform-node"
import { Console, Effect } from "effect"
import { Command } from "effect/unstable/cli"

import packageJson from "../package.json" with { type: "json" }

const hello = Command.make("hello", {}, () => Console.log("Hello, world!"))
const program = Command.run(hello, { version: packageJson.version })
program.pipe(Effect.provide(NodeServices.layer), NodeRuntime.runMain)
