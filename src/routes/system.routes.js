import { Router } from 'express'
import { isDatabaseReady } from '../database/mongoose.js'

export const systemRouter = Router()

systemRouter.get('/ping', (req, res) => {
  res.status(200).json({
    status: 'ok'
  })
})

systemRouter.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok'
  })
})

systemRouter.get('/ready', (req, res) => {
  const databaseReady = isDatabaseReady()

  res.status(databaseReady ? 200 : 503).json({
    status: databaseReady ? 'ready' : 'not_ready',
    checks: {
      database: databaseReady ? 'up' : 'down'
    }
  })
})