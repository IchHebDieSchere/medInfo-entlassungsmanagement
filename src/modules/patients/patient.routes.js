import { Router } from 'express'

import {
  createPatientHandler,
  getPatientByIdHandler,
  listPatientsHandler,
  updatePatientByIdHandler
} from './patient.controller.js'

export const patientRouter = Router()

/**
 * @openapi
 * /api/v1/patients:
 *   post:
 *     tags:
 *       - Patients
 *     summary: Patient anlegen
 *     description: Legt einen neuen Patienten an.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePatientRequest'
 *     responses:
 *       '201':
 *         description: Patient wurde angelegt
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Patient'
 *       '400':
 *         description: Ungültige Patientendaten
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
patientRouter.post('/', createPatientHandler)

/**
 * @openapi
 * /api/v1/patients:
 *   get:
 *     tags:
 *       - Patients
 *     summary: Patienten seitenweise auflisten
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Nummer der gewünschten Seite
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Anzahl der Patienten pro Seite
 *     responses:
 *       '200':
 *         description: Patienten wurden geladen
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: true
 */
patientRouter.get('/', listPatientsHandler)

/**
 * @openapi
 * /api/v1/patients/{patientId}:
 *   get:
 *     tags:
 *       - Patients
 *     summary: Einzelnen Patienten lesen
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID des Patienten
 *     responses:
 *       '200':
 *         description: Patient wurde gefunden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Patient'
 *       '404':
 *         description: Patient wurde nicht gefunden
 */
patientRouter.get('/:patientId', getPatientByIdHandler)

/**
 * @openapi
 * /api/v1/patients/{patientId}:
 *   patch:
 *     tags:
 *       - Patients
 *     summary: Patient teilweise ändern
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID des Patienten
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdatePatientRequest'
 *     responses:
 *       '200':
 *         description: Patient wurde aktualisiert
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Patient'
 *       '400':
 *         description: Ungültige Änderungsdaten
 *       '404':
 *         description: Patient wurde nicht gefunden
 */
patientRouter.patch('/:patientId', updatePatientByIdHandler)