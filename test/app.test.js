import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createApp } from '../src/app.js'
import {
  getTestServerUrl,
  startTestServer,
  stopTestServer
} from './helpers/test-server.js'

let server
let baseUrl

before(async () => {
  const app = createApp()

  server = await startTestServer(app)
  baseUrl = getTestServerUrl(server)
})

after(async () => {
  if (server) {
    await stopTestServer(server)
  }
})

test('GET /ping returns API status', async () => {
  const response = await fetch(`${baseUrl}/ping`)
  const body = await response.json()

  assert.equal(response.status, 200)
  assert.deepEqual(body, {
    status: 'ok'
  })
})

test('GET /health returns liveness status', async () => {
  const response = await fetch(`${baseUrl}/health`)
  const body = await response.json()

  assert.equal(response.status, 200)
  assert.deepEqual(body, {
    status: 'ok'
  })
})

test('GET /ready reports unavailable database', async () => {
  const response = await fetch(`${baseUrl}/ready`)
  const body = await response.json()

  assert.equal(response.status, 503)
  assert.deepEqual(body, {
    status: 'not_ready',
    checks: {
      database: 'down'
    }
  })
})

test('response contains generated request ID', async () => {
  const response = await fetch(`${baseUrl}/ping`)
  const requestId = response.headers.get('x-request-id')

  assert.ok(requestId)
  assert.match(
    requestId,
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  )
})

test('valid incoming request ID is preserved', async () => {
  const response = await fetch(`${baseUrl}/ping`, {
    headers: {
      'x-request-id': 'test-request-123'
    }
  })

  assert.equal(
    response.headers.get('x-request-id'),
    'test-request-123'
  )
})