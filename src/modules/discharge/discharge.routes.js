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
 *     description: >
 *       Validiert Patient, Encounter, Diagnosen, Prozeduren,
 *       Medikation und Weiterbehandlung und startet den Entlassungsprozess.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: false
 *             required:
 *               - patient
 *               - encounter
 *               - diagnoses
 *               - procedures
 *               - medications
 *               - followUp
 *             properties:
 *               patient:
 *                 type: object
 *                 required:
 *                   - patientId
 *                 properties:
 *                   patientId:
 *                     type: string
 *                     format: uuid
 *                     example: a38e7f0a-69f0-4ab8-b668-e446730bc220
 *               encounter:
 *                 type: object
 *                 required:
 *                   - encounterId
 *                 properties:
 *                   encounterId:
 *                     type: string
 *                     example: encounter-1001
 *               diagnoses:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - code
 *                     - display
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: J18.9
 *                     display:
 *                       type: string
 *                       example: Pneumonie
 *               procedures:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - code
 *                     - display
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: 8-800
 *                     display:
 *                       type: string
 *                       example: Transfusion
 *               medications:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - name
 *                     - dosage
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: Amoxicillin
 *                     dosage:
 *                       type: string
 *                       example: 500 mg dreimal täglich
 *               followUp:
 *                 type: object
 *                 required:
 *                   - type
 *                   - date
 *                 properties:
 *                   type:
 *                     type: string
 *                     example: Hausarztkontrolle
 *                   date:
 *                     type: string
 *                     format: date
 *                     example: 2026-07-27
 *           example:
 *             patient:
 *               patientId: a38e7f0a-69f0-4ab8-b668-e446730bc220
 *             encounter:
 *               encounterId: encounter-1001
 *             diagnoses:
 *               - code: J18.9
 *                 display: Pneumonie
 *             procedures:
 *               - code: 8-800
 *                 display: Transfusion
 *             medications:
 *               - name: Amoxicillin
 *                 dosage: 500 mg dreimal täglich
 *             followUp:
 *               type: Hausarztkontrolle
 *               date: 2026-07-27
 *     responses:
 *       '201':
 *         description: Eingabe wurde validiert und der Entlassungsprozess gestartet
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     transactionId:
 *                       type: string
 *                       format: uuid
 *                     status:
 *                       type: string
 *                       example: VALIDATED
 *                     patientId:
 *                       type: string
 *                       format: uuid
 *                     encounterId:
 *                       type: string
 *                       example: encounter-1001
 *                     summary:
 *                       type: object
 *                       properties:
 *                         diagnoses:
 *                           type: integer
 *                           example: 1
 *                         procedures:
 *                           type: integer
 *                           example: 1
 *                         medications:
 *                           type: integer
 *                           example: 1
 *                         followUp:
 *                           type: object
 *                           properties:
 *                             type:
 *                               type: string
 *                               example: Hausarztkontrolle
 *                             date:
 *                               type: string
 *                               format: date
 *                               example: 2026-07-27
 *       '400':
 *         description: Ungültige oder unvollständige Eingabedaten
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: INVALID_DISCHARGE_REQUEST
 *                     message:
 *                       type: string
 *                       example: encounter is required
 *                     requestId:
 *                       type: string
 *                       example: 3ec20ccb-43fa-4635-bf78-f2bc42cd2022
 */
dischargeRouter.post('/', startDischargeHandler)