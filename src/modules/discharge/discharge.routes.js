import { Router } from 'express'
import { startDischargeHandler } from './discharge.controller.js'

export const dischargeRouter = Router()

/**
 * @openapi
 * /api/v1/discharge:
 *   post:
 *     tags:
 *       - Discharge
 *     summary: Entlassungsprozess starten
 *     responses:
 *       '201':
 *         description: Entlassungsprozess wurde gestartet
 */
dischargeRouter.post('/', startDischargeHandler)