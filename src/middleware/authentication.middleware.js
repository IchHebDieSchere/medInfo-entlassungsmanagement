import jwt from 'jsonwebtoken'

import { config } from '../config/env.js'
import { AppError } from '../errors/app-error.js'

const getBearerToken = req => {
  const authorization = req.get('authorization')

  if (!authorization) {
    throw new AppError(
      401,
      'AUTHENTICATION_REQUIRED',
      'Bearer access token is required'
    )
  }

  const [scheme, token, unexpectedPart] = authorization.trim().split(/\s+/)

  if (scheme?.toLowerCase() !== 'bearer' || !token || unexpectedPart) {
    throw new AppError(
      401,
      'INVALID_AUTHORIZATION_HEADER',
      'Authorization header must use the Bearer scheme'
    )
  }

  return token
}

const getScopes = payload => {
  const scopes = new Set()

  if (typeof payload.scope === 'string') {
    for (const scope of payload.scope.split(/\s+/)) {
      if (scope) {
        scopes.add(scope)
      }
    }
  }

  for (const claimName of ['scope', 'scp']) {
    const claim = payload[claimName]

    if (Array.isArray(claim)) {
      for (const scope of claim) {
        if (typeof scope === 'string' && scope) {
          scopes.add(scope)
        }
      }
    }
  }

  return Object.freeze([...scopes])
}

export const createAuthenticationHandler = ({
  enabled = config.auth.enabled,
  publicKey = config.auth.publicKey,
  issuer = config.auth.issuer,
  audience = config.auth.audience,
  algorithm = config.auth.algorithm
} = {}) => {
  if (!enabled) {
    return (req, res, next) => next()
  }

  if (!publicKey || !issuer || !audience) {
    throw new Error('JWT public key, issuer and audience are required')
  }

  return (req, res, next) => {
    try {
      const token = getBearerToken(req)

      const payload = jwt.verify(token, publicKey, {
        algorithms: [algorithm],
        issuer,
        audience
      })

      if (
        typeof payload !== 'object' ||
        typeof payload.sub !== 'string' ||
        payload.sub.length === 0 ||
        typeof payload.exp !== 'number'
      ) {
        throw new Error('Required JWT claims are missing')
      }

      req.user = Object.freeze({
        subject: payload.sub,
        scopes: getScopes(payload),
        claims: payload
      })

      next()
    } catch (error) {
      if (error instanceof AppError) {
        next(error)
        return
      }

      next(
        new AppError(
          401,
          'INVALID_ACCESS_TOKEN',
          'Access token is invalid or expired'
        )
      )
    }
  }
}

export const authenticate = createAuthenticationHandler()
