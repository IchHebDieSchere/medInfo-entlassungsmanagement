import { Router } from 'express'
import { isDatabaseReady } from '../database/mongoose.js'

export const systemRouter = Router()

/**
 * @openapi
 * /ping:
 *   get:
 *     tags:
 *       - System
 *     summary: API-Erreichbarkeit prüfen
 *     parameters:
 *       - $ref: '#/components/parameters/RequestId'
 *     responses:
 *       '200':
 *         description: API ist erreichbar
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StatusResponse'
 */
systemRouter.get('/ping', (req, res) => {
  res.status(200).json({
    status: 'ok'
  })
})

/**
 * @openapi
 * /health:
 *   get:
 *     tags:
 *       - System
 *     summary: Prozesszustand prüfen
 *     parameters:
 *       - $ref: '#/components/parameters/RequestId'
 *     responses:
 *       '200':
 *         description: Prozess ist funktionsfähig
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StatusResponse'
 */
systemRouter.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok'
  })
})

/**
 * @openapi
 * /ready:
 *   get:
 *     tags:
 *       - System
 *     summary: Betriebsbereitschaft prüfen
 *     parameters:
 *       - $ref: '#/components/parameters/RequestId'
 *     responses:
 *       '200':
 *         description: API und Datenbank sind bereit
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReadinessResponse'
 *       '503':
 *         description: Eine benötigte Abhängigkeit ist nicht bereit
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReadinessResponse'
 */
systemRouter.get('/ready', (req, res) => {
  const databaseReady = isDatabaseReady()

  res.status(databaseReady ? 200 : 503).json({
    status: databaseReady ? 'ready' : 'not_ready',
    checks: {
      database: databaseReady ? 'up' : 'down'
    }
  })
})