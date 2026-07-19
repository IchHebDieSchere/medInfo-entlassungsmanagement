import express from 'express'
import swaggerUi from 'swagger-ui-express'

import { config } from './config/env.js'
import { swaggerSpecification } from './config/swagger.config.js'
import { errorHandler } from './middleware/error-handler.middleware.js'
import { authenticate } from './middleware/authentication.middleware.js'
import { notFoundHandler } from './middleware/not-found.middleware.js'
import { requestIdHandler } from './middleware/request-id.middleware.js'
import { requestLogger } from './middleware/request-logger.middleware.js'
import {
  apiSecurityHeaders,
  corsHandler,
  swaggerSecurityHeaders
} from './middleware/security.middleware.js'
import { apiRateLimiter } from './middleware/rate-limit.middleware.js'
import { router } from './routes/index.js'

export const createApp = ({ rateLimiter = apiRateLimiter } = {}) => {
  const app = express()

  app.disable('x-powered-by')
  app.set('trust proxy', config.trustProxy)

  app.use(requestIdHandler)
  app.use(requestLogger)
  app.use(corsHandler)
  app.use(express.json({ limit: '1mb' }))

  app.use(
    '/api-docs',
    swaggerSecurityHeaders,
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpecification, {
      explorer: true
    })
  )

  app.use(apiSecurityHeaders)

  app.get('/api-docs.json', (req, res) => {
    res.json(swaggerSpecification)
  })

  app.use('/api/v1', rateLimiter)
  app.use('/api/v1', authenticate)

  app.use(router)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
