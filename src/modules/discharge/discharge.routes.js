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
 *     description: Startet den Entlassungsprozess für einen Patienten.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: false
 *             required:
 *               - patient
 *             properties:
 *               patient:
 *                 type: object
 *                 additionalProperties: false
 *                 required:
 *                   - patientId
 *                 properties:
 *                   patientId:
 *                     type: string
 *                     format: uuid
 *                     example: a38e7f0a-69f0-4ab8-b668-e446730bc220
 *     responses:
 *       '201':
 *         description: Entlassungsprozess wurde gestartet
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - data
 *               properties:
 *                 data:
 *                   type: object
 *                   required:
 *                     - transactionId
 *                     - status
 *                     - patientId
 *                   properties:
 *                     transactionId:
 *                       type: string
 *                       format: uuid
 *                     status:
 *                       type: string
 *                       example: STARTED
 *                     patientId:
 *                       type: string
 *                       format: uuid
 *       '400':
 *         description: Ungültige Eingabedaten
 */
dischargeRouter.post('/', startDischargeHandler)