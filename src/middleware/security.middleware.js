import cors from 'cors'
import helmet from 'helmet'

import { config } from '../config/env.js'
import { AppError } from '../errors/app-error.js'

const getRequestOrigin = req => {
  const host = req.get('host')

  if (!host) {
    return null
  }

  return `${req.protocol}://${host}`
}

const corsOptionsDelegate = (req, callback) => {
  const origin = req.get('origin')

  if (!origin) {
    callback(null, {
      origin: false
    })

    return
  }

  const requestOrigin = getRequestOrigin(req)

  const originAllowed =
    origin === requestOrigin || config.corsOrigins.includes(origin)

  if (!originAllowed) {
    callback(
      new AppError(403, 'CORS_ORIGIN_DENIED', 'Request origin is not allowed')
    )

    return
  }

  callback(null, {
    origin: true,
    credentials: false,
    methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['content-type', 'authorization', 'x-request-id'],
    exposedHeaders: ['location', 'x-request-id'],
    maxAge: 600
  })
}

export const corsHandler = cors(corsOptionsDelegate)

export const apiSecurityHeaders = helmet()

export const swaggerSecurityHeaders = helmet({
  contentSecurityPolicy: false
})
