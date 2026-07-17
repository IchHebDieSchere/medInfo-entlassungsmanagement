import { createApp } from './app.js'
import { config } from './config/env.js'
import {
  connectToDatabase,
  disconnectFromDatabase
} from './database/mongoose.js'

const app = createApp()

let server
let shutdownStarted = false

const start = async () => {
  await connectToDatabase()

  server = app.listen(config.port, () => {
    console.log(
      `API listening on http://localhost:${config.port} (${config.nodeEnv})`
    )
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
  console.log(`${signal} received, shutting down`)

  try {
    await stopHttpServer()
    await disconnectFromDatabase()

    console.log('Application stopped')
    process.exitCode = 0
  } catch (error) {
    console.error('Application shutdown failed:', error)
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
  console.error('Application startup failed:', error)
  process.exitCode = 1
})