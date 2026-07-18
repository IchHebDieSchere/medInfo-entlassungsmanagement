import { createApp } from './app.js'
import { config } from './config/env.js'
import {
  connectToDatabase,
  disconnectFromDatabase
} from './database/mongoose.js'
import {
  logger,
  serializeError
} from './observability/logger.js'

const app = createApp()

let server
let shutdownStarted = false

const start = async () => {
  await connectToDatabase()

  server = app.listen(config.port, () => {
    logger.info('HTTP server listening', {
      port: config.port,
      nodeEnv: config.nodeEnv
    })
  })
}

const stopHttpServer = () => {
  return new Promise((resolve, reject) => {
    if (!server) {
      resolve()
      return
    }

    server.close(error => {
      if (error) {
        reject(error)
        return
      }

      resolve()
    })
  })
}

const shutdown = async signal => {
  if (shutdownStarted) {
    return
  }

  shutdownStarted = true

  logger.info('Application shutdown started', {
    signal
  })

  try {
    await stopHttpServer()
    await disconnectFromDatabase()

    logger.info('Application stopped', {
      signal
    })

    process.exitCode = 0
  } catch (error) {
    logger.error('Application shutdown failed', {
      signal,
      error: serializeError(error, {
        includeStack: config.nodeEnv !== 'production'
      })
    })

    process.exitCode = 1
  }
}

process.once('SIGINT', () => {
  void shutdown('SIGINT')
})

process.once('SIGTERM', () => {
  void shutdown('SIGTERM')
})

start().catch(error => {
  logger.error('Application startup failed', {
    error: serializeError(error, {
      includeStack: config.nodeEnv !== 'production'
    })
  })

  process.exitCode = 1
})