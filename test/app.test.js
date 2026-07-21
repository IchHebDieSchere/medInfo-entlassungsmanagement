import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createApp } from '../src/app.js'
import {
  getTestServerUrl,
  startTestServer,
  stopTestServer
} from './helpers/test-server.js'
import { createApiRateLimiter } from '../src/middleware/rate-limit.middleware.js'

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

  assert.equal(response.headers.get('x-request-id'), 'test-request-123')
})

test('Swagger specification exposes all current endpoints', async () => {
  const response = await fetch(`${baseUrl}/api-docs.json`)
  const specification = await response.json()

  assert.equal(response.status, 200)
  assert.equal(specification.openapi, '3.0.3')
  assert.equal(
    specification.components.securitySchemes.BearerAuth.scheme,
    'bearer'
  )

  assert.ok(specification.paths['/ping']?.get)
  assert.ok(specification.paths['/health']?.get)
  assert.ok(specification.paths['/ready']?.get)
  assert.ok(specification.paths['/api/v1/patients']?.get)
  assert.ok(specification.paths['/api/v1/patients']?.post)
  assert.ok(specification.paths['/api/v1/patients/{patientId}']?.get)
  assert.ok(specification.paths['/api/v1/patients/{patientId}']?.patch)

  assert.ok(specification.paths['/api/v1/discharge']?.post)
  assert.ok(specification.paths['/api/v1/audit/{transactionId}']?.get)

  assert.equal(
    specification.paths['/api/v1/discharge'].post['x-required-scopes'][0],
    'discharge:write'
  )

  assert.equal(
    specification.paths['/api/v1/audit/{transactionId}'].get[
      'x-required-scopes'
    ][0],
    'audit:read'
  )

  assert.equal(
    specification.paths['/api/v1/patients'].post['x-required-scopes'][0],
    'patient:write'
  )
})

test('API responses contain security headers', async () => {
  const response = await fetch(`${baseUrl}/health`)

  assert.equal(response.headers.get('x-content-type-options'), 'nosniff')

  assert.equal(response.headers.get('x-frame-options'), 'SAMEORIGIN')
})

test('same-origin browser request is allowed', async () => {
  const response = await fetch(`${baseUrl}/ping`, {
    headers: {
      origin: baseUrl
    }
  })

  assert.equal(response.status, 200)

  assert.equal(response.headers.get('access-control-allow-origin'), baseUrl)
})

test('unknown cross-origin request is rejected', async () => {
  const response = await fetch(`${baseUrl}/ping`, {
    headers: {
      origin: 'https://not-allowed.example'
    }
  })

  const body = await response.json()

  assert.equal(response.status, 403)
  assert.equal(body.error.code, 'CORS_ORIGIN_DENIED')
  assert.ok(body.error.requestId)
})

test('API rate limiter returns standardized error', async () => {
  const limitedApp = createApp({
    rateLimiter: createApiRateLimiter({
      windowMs: 60_000,
      limit: 1
    })
  })

  const limitedServer = await startTestServer(limitedApp)

  const limitedBaseUrl = getTestServerUrl(limitedServer)

  try {
    const firstResponse = await fetch(`${limitedBaseUrl}/api/v1/not-found`)

    assert.equal(firstResponse.status, 404)

    const secondResponse = await fetch(`${limitedBaseUrl}/api/v1/not-found`)

    const body = await secondResponse.json()

    assert.equal(secondResponse.status, 429)
    assert.equal(body.error.code, 'RATE_LIMIT_EXCEEDED')
    assert.ok(body.error.requestId)

    assert.ok(secondResponse.headers.get('ratelimit'))

    assert.ok(secondResponse.headers.get('retry-after'))
  } finally {
    await stopTestServer(limitedServer)
  }
})

test('invalid JSON returns a standardized client error', async () => {
  const response = await fetch(`${baseUrl}/api/v1/patients`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: '{"familyName":'
  })

  const body = await response.json()

  assert.equal(response.status, 400)
  assert.equal(body.error.code, 'INVALID_JSON')
  assert.ok(body.error.requestId)
})

test('unknown patient fields are rejected before database access', async () => {
  const response = await fetch(`${baseUrl}/api/v1/patients`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      familyName: 'Mustermann',
      unsupportedField: true
    })
  })

  const body = await response.json()

  assert.equal(response.status, 400)
  assert.equal(body.error.code, 'VALIDATION_ERROR')
  assert.ok(body.error.requestId)
  assert.ok(Array.isArray(body.error.details))
  assert.equal(body.error.details[0].location, 'body')
})

test('invalid patient IDs are rejected before database access', async () => {
  const response = await fetch(`${baseUrl}/api/v1/patients/not-a-uuid`)

  const body = await response.json()

  assert.equal(response.status, 400)
  assert.equal(body.error.code, 'VALIDATION_ERROR')
  assert.equal(body.error.details[0].path, 'patientId')
})

test('invalid discharge input is rejected before workflow execution', async () => {
  const response = await fetch(`${baseUrl}/api/v1/discharge`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      patient: {
        patientId: 'not-a-uuid'
      },
      encounter: {
        encounterId: 'encounter-1'
      },
      diagnoses: [],
      procedures: [],
      medications: [],
      followUp: {
        type: 'Hausarztkontrolle',
        date: '27.07.2026'
      }
    })
  })

  const body = await response.json()

  assert.equal(response.status, 400)
  assert.equal(body.error.code, 'VALIDATION_ERROR')
  assert.ok(body.error.requestId)
  assert.ok(Array.isArray(body.error.details))

  const paths = body.error.details.map(detail => detail.path)

  assert.ok(paths.includes('patient.patientId'))
  assert.ok(paths.includes('diagnoses'))
  assert.ok(paths.includes('followUp.date'))
})

test('unknown discharge fields are rejected', async () => {
  const response = await fetch(`${baseUrl}/api/v1/discharge`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      patient: {
        patientId: 'a38e7f0a-69f0-4ab8-b668-e446730bc220'
      },
      encounter: {
        encounterId: 'encounter-1'
      },
      diagnoses: [
        {
          code: 'J18.9',
          display: 'Pneumonie'
        }
      ],
      procedures: [],
      medications: [],
      followUp: {
        type: 'Hausarztkontrolle',
        date: '2026-07-27'
      },
      unsupportedField: true
    })
  })

  const body = await response.json()

  assert.equal(response.status, 400)
  assert.equal(body.error.code, 'VALIDATION_ERROR')
  assert.ok(body.error.requestId)
})

test('invalid audit transaction IDs are rejected', async () => {
  const response = await fetch(`${baseUrl}/api/v1/audit/not-a-uuid`)

  const body = await response.json()

  assert.equal(response.status, 400)
  assert.equal(body.error.code, 'VALIDATION_ERROR')
  assert.equal(body.error.details[0].path, 'transactionId')
})
