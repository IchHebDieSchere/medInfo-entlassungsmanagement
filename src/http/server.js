import { createServer } from 'node:http'

export const startHttpServer = (
  requestListener,
  { port, host, requestTimeoutMs, headersTimeoutMs, keepAliveTimeoutMs }
) => {
  return new Promise((resolve, reject) => {
    const server = createServer(requestListener)

    server.requestTimeout = requestTimeoutMs
    server.headersTimeout = headersTimeoutMs
    server.keepAliveTimeout = keepAliveTimeoutMs

    const handleError = error => {
      server.off('listening', handleListening)
      reject(error)
    }

    const handleListening = () => {
      server.off('error', handleError)
      resolve(server)
    }

    server.once('error', handleError)
    server.once('listening', handleListening)
    server.listen(port, host)
  })
}

export const stopHttpServer = (server, timeoutMs) => {
  if (!server?.listening) {
    return Promise.resolve()
  }

  return new Promise((resolve, reject) => {
    let forced = false

    const timeout = setTimeout(() => {
      forced = true
      server.closeAllConnections()
    }, timeoutMs)

    timeout.unref()

    server.close(error => {
      clearTimeout(timeout)

      if (error && !forced) {
        reject(error)
        return
      }

      resolve()
    })

    server.closeIdleConnections()
  })
}
