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
 *     parameters:
 *       - $ref: '#/components/parameters/RequestId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePatientRequest'
 *     responses:
 *       '201':
 *         description: Patient wurde erfolgreich angelegt
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PatientResponse'
 *       '400':
 *         description: Ungültige Patientendaten
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '429':
 *         $ref: '#/components/responses/RateLimitExceeded'
 */
patientRouter.post('/', createPatientHandler)

/**
 * @openapi
 * /api/v1/patients:
 *   get:
 *     tags:
 *       - Patients
 *     summary: Patienten seitenweise auflisten
 *     description: Gibt eine paginierte Liste der Patienten zurück.
 *     parameters:
 *       - $ref: '#/components/parameters/RequestId'
 *       - in: query
 *         name: page
 *         required: false
 *         description: Nummer der gewünschten Seite
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         required: false
 *         description: Anzahl der Patienten pro Seite
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *     responses:
 *       '200':
 *         description: Patienten wurden erfolgreich geladen
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PatientListResponse'
 *       '400':
 *         description: Ungültige Pagination
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '429':
 *         $ref: '#/components/responses/RateLimitExceeded'
 */
patientRouter.get('/', listPatientsHandler)

/**
 * @openapi
 * /api/v1/patients/{patientId}:
 *   get:
 *     tags:
 *       - Patients
 *     summary: Einzelnen Patienten lesen
 *     description: Gibt einen Patienten anhand seiner patientId zurück.
 *     parameters:
 *       - $ref: '#/components/parameters/RequestId'
 *       - in: path
 *         name: patientId
 *         required: true
 *         description: Öffentliche ID des Patienten
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       '200':
 *         description: Patient wurde gefunden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PatientResponse'
 *       '404':
 *         description: Patient wurde nicht gefunden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '429':
 *         $ref: '#/components/responses/RateLimitExceeded'
 */
patientRouter.get('/:patientId', getPatientByIdHandler)

/**
 * @openapi
 * /api/v1/patients/{patientId}:
 *   patch:
 *     tags:
 *       - Patients
 *     summary: Patient teilweise ändern
 *     description:
 *       Aktualisiert ausschließlich die im Request-Body angegebenen Felder.
 *     parameters:
 *       - $ref: '#/components/parameters/RequestId'
 *       - in: path
 *         name: patientId
 *         required: true
 *         description: Öffentliche ID des Patienten
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdatePatientRequest'
 *     responses:
 *       '200':
 *         description: Patient wurde erfolgreich aktualisiert
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PatientResponse'
 *       '400':
 *         description: Ungültige Änderungsdaten
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '404':
 *         description: Patient wurde nicht gefunden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '429':
 *         $ref: '#/components/responses/RateLimitExceeded'
 */
patientRouter.patch('/:patientId', updatePatientByIdHandler)