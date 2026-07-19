import assert from 'node:assert/strict'
import { generateKeyPairSync } from 'node:crypto'
import { after, before, test } from 'node:test'

import express from 'express'
import jwt from 'jsonwebtoken'

import { errorHandler } from '../src/middleware/error-handler.middleware.js'
import { requestIdHandler } from '../src/middleware/request-id.middleware.js'
import { createAuthenticationHandler } from '../src/middleware/authentication.middleware.js'
import { createScopeAuthorizer } from '../src/middleware/authorization.middleware.js'
import {
  getTestServerUrl,
  startTestServer,
  stopTestServer
} from './helpers/test-server.js'

const issuer = 'https://identity.test/'
const audience = 'med-info-api-test'

const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem'
  }
})

const authenticate = createAuthenticationHandler({
  enabled: true,
  publicKey,
  issuer,
  audience,
  algorithm: 'RS256'
})

const requireScopes = createScopeAuthorizer({
  enabled: true
})

const createToken = ({
  scope = 'patient:read',
  tokenAudience = audience,
  expiresIn = '5m'
} = {}) => {
  return jwt.sign({ scope }, privateKey, {
    algorithm: 'RS256',
    issuer,
    audience: tokenAudience,
    subject: 'test-user',
    expiresIn
  })
}

let server
let baseUrl

before(async () => {
  const app = express()

  app.use(requestIdHandler)

  app.get(
    '/protected',
    authenticate,
    requireScopes('patient:read'),
    (req, res) => {
      res.status(200).json({
        subject: req.user.subject,
        scopes: req.user.scopes
      })
    }
  )

  app.use(errorHandler)

  server = await startTestServer(app)
  baseUrl = getTestServerUrl(server)
})

after(async () => {
  if (server) {
    await stopTestServer(server)
  }
})

test('protected route requires a Bearer token', async () => {
  const response = await fetch(`${baseUrl}/protected`)
  const body = await response.json()

  assert.equal(response.status, 401)
  assert.equal(body.error.code, 'AUTHENTICATION_REQUIRED')
  assert.ok(body.error.requestId)
})

test('valid token authenticates user and scopes', async () => {
  const response = await fetch(`${baseUrl}/protected`, {
    headers: {
      authorization: `Bearer ${createToken()}`
    }
  })

  const body = await response.json()

  assert.equal(response.status, 200)
  assert.equal(body.subject, 'test-user')
  assert.deepEqual(body.scopes, ['patient:read'])
})

test('missing required scope returns forbidden', async () => {
  const response = await fetch(`${baseUrl}/protected`, {
    headers: {
      authorization: `Bearer ${createToken({
        scope: 'patient:write'
      })}`
    }
  })

  const body = await response.json()

  assert.equal(response.status, 403)
  assert.equal(body.error.code, 'INSUFFICIENT_SCOPE')
})

test('token with invalid audience is rejected', async () => {
  const response = await fetch(`${baseUrl}/protected`, {
    headers: {
      authorization: `Bearer ${createToken({
        tokenAudience: 'different-api'
      })}`
    }
  })

  const body = await response.json()

  assert.equal(response.status, 401)
  assert.equal(body.error.code, 'INVALID_ACCESS_TOKEN')
})

test('expired token is rejected', async () => {
  const response = await fetch(`${baseUrl}/protected`, {
    headers: {
      authorization: `Bearer ${createToken({
        expiresIn: -1
      })}`
    }
  })

  const body = await response.json()

  assert.equal(response.status, 401)
  assert.equal(body.error.code, 'INVALID_ACCESS_TOKEN')
})
