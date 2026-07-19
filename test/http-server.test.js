import assert from 'node:assert/strict'
import { test } from 'node:test'

import { startHttpServer, stopHttpServer } from '../src/http/server.js'

test('HTTP server applies configured timeouts and shuts down', async () => {
  const server = await startHttpServer(
    (request, response) => {
      response.end('ok')
    },
    {
      host: '127.0.0.1',
      port: 0,
      requestTimeoutMs: 30_000,
      headersTimeoutMs: 15_000,
      keepAliveTimeoutMs: 5_000
    }
  )

  try {
    assert.equal(server.requestTimeout, 30_000)
    assert.equal(server.headersTimeout, 15_000)
    assert.equal(server.keepAliveTimeout, 5_000)
  } finally {
    await stopHttpServer(server, 1_000)
  }

  assert.equal(server.listening, false)
})
