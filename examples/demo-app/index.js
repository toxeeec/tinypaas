import http from "node:http"

const server = http.createServer((_, res) => {
	res.writeHead(200, { "Content-Type": "text/plain" })
	res.end("Hello, World!\n")
})

server.listen(3000, "0.0.0.0", () => {
	console.log("Listening on http://0.0.0.0:3000")
})
