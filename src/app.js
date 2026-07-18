import express from 'express'
import swaggerUi from 'swagger-ui-express'

import { swaggerSpecification } from './config/swagger.config.js'
import { router } from './routes/index.js'
import { errorHandler } from './middleware/error-handler.middleware.js'
import { notFoundHandler } from './middleware/not-found.middleware.js'
import { requestIdHandler } from './middleware/request-id.middleware.js'

export const createApp = () => {
  const app = express()

  app.disable('x-powered-by')

  app.use(requestIdHandler)
  app.use(express.json({ limit: '1mb' }))

  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpecification, {
      explorer: true
    })
  )

  app.get('/api-docs.json', (request, response) => {
    response.json(swaggerSpecification)
  })

  app.use(router)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}