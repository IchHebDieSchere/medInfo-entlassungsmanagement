import { Router } from 'express'

import { requireScopes } from '../../middleware/authorization.middleware.js'
import { validateRequest } from '../../middleware/validation.middleware.js'

import {
  getDischargeAuditHandler,
  startDischargeHandler
} from './discharge.controller.js'

import {
  auditTransactionIdParamsSchema,
  dischargeRequestSchema
} from './discharge.validation.js'

export const dischargeRouter = Router()
export const auditRouter = Router()

/**
 * @openapi
 * /api/v1/discharge:
 *   post:
 *     tags:
 *       - Discharge
 *     summary: Entlassungsworkflow ausführen
 *     description: >
 *       Prüft Patient, Encounter, Diagnosen, Prozeduren,
 *       Medikation und Weiterbehandlung. Anschließend werden
 *       der Encounter abgeschlossen, der Arztbrief erzeugt
 *       und alle Schritte lokal protokolliert.
 *     security:
 *       - BearerAuth: []
 *     x-required-scopes:
 *       - discharge:write
 *     parameters:
 *       - $ref: '#/components/parameters/RequestId'
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
 *                 additionalProperties: false
 *                 required:
 *                   - patientId
 *                 properties:
 *                   patientId:
 *                     type: string
 *                     format: uuid
 *               encounter:
 *                 type: object
 *                 additionalProperties: false
 *                 required:
 *                   - encounterId
 *                 properties:
 *                   encounterId:
 *                     type: string
 *                     example: "123"
 *               diagnoses:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   additionalProperties: false
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
 *                   additionalProperties: false
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
 *                   additionalProperties: false
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
 *                 additionalProperties: false
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
 *                   notes:
 *                     type: string
 *                     example: Kontrolle des Allgemeinzustands
 *           example:
 *             patient:
 *               patientId: a38e7f0a-69f0-4ab8-b668-e446730bc220
 *             encounter:
 *               encounterId: "123"
 *             diagnoses:
 *               - code: J18.9
 *                 display: Pneumonie
 *             procedures: []
 *             medications:
 *               - name: Amoxicillin
 *                 dosage: 500 mg dreimal täglich
 *             followUp:
 *               type: Hausarztkontrolle
 *               date: 2026-07-27
 *               notes: Kontrolle des Allgemeinzustands
 *     responses:
 *       '201':
 *         description: Entlassungsworkflow wurde erfolgreich abgeschlossen
 *       '400':
 *         description: Eingabedaten sind ungültig
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '404':
 *         description: Patient oder Encounter wurde nicht gefunden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '409':
 *         description: Encounter ist bereits beendet oder gehört zu einem anderen Patienten
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '502':
 *         description: Fehler bei der Kommunikation mit dem FHIR-Server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '403':
 *         $ref: '#/components/responses/Forbidden'
 *       '429':
 *         $ref: '#/components/responses/RateLimitExceeded'
 */
dischargeRouter.post(
  '/',
  requireScopes('discharge:write'),
  validateRequest({
    body: dischargeRequestSchema
  }),
  startDischargeHandler
)

/**
 * @openapi
 * /api/v1/audit/{transactionId}:
 *   get:
 *     tags:
 *       - Discharge
 *     summary: Audit-Nachweis eines Entlassungsvorgangs abrufen
 *     security:
 *       - BearerAuth: []
 *     x-required-scopes:
 *       - audit:read
 *     parameters:
 *       - $ref: '#/components/parameters/RequestId'
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       '200':
 *         description: Audit-Einträge wurden geladen
 *       '400':
 *         description: transactionId ist ungültig
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '404':
 *         description: Keine Audit-Einträge gefunden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '403':
 *         $ref: '#/components/responses/Forbidden'
 */
auditRouter.get(
  '/:transactionId',
  requireScopes('audit:read'),
  validateRequest({
    params: auditTransactionIdParamsSchema
  }),
  getDischargeAuditHandler
)
