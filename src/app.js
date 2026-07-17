import express from 'express'
import { router } from './routes/index.js'
import { errorHandler } from './middleware/error-handler.middleware.js'
import { notFoundHandler } from './middleware/not-found.middleware.js'
import { requestIdHandler } from './middleware/request-id.middleware.js'

export const createApp = () => {
  const app = express()

  app.disable('x-powered-by')

  app.use(requestIdHandler)
  app.use(express.json({ limit: '1mb' }))

  app.use(router)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}