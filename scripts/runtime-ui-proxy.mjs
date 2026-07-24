import http from "node:http"

const backendPort = Number(process.env.BACKEND_PORT)
const frontendPort = Number(process.env.FRONTEND_PORT)
if (!Number.isInteger(backendPort) || !Number.isInteger(frontendPort) || backendPort === frontendPort) {
  throw new Error("Distinct BACKEND_PORT and FRONTEND_PORT values are required")
}

const server = http.createServer((request, response) => {
  const upstream = http.request({
    hostname: "127.0.0.1",
    port: backendPort,
    method: request.method,
    path: request.url,
    headers: { ...request.headers, host: `127.0.0.1:${backendPort}` },
  }, (upstreamResponse) => {
    response.writeHead(upstreamResponse.statusCode || 502, upstreamResponse.headers)
    upstreamResponse.pipe(response)
  })
  upstream.on("error", () => {
    if (!response.headersSent) response.writeHead(502, { "content-type": "application/json" })
    response.end(JSON.stringify({ error: "Application is not ready" }))
  })
  request.pipe(upstream)
})

server.listen(frontendPort, "127.0.0.1", () => {
  console.log(`UI proxy listening on 127.0.0.1:${frontendPort}`)
})

const shutdown = () => server.close(() => process.exit(0))
process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)
