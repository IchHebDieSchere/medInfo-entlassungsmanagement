import { Router } from 'express'
import {
  createPatientHandler,
  getPatientByIdHandler,
  listPatientsHandler,
  updatePatientByIdHandler
} from './patient.controller.js'

export const patientRouter = Router()

patientRouter.post('/', createPatientHandler)
patientRouter.get('/', listPatientsHandler)
patientRouter.get('/:patientId', getPatientByIdHandler)
patientRouter.patch('/:patientId', updatePatientByIdHandler)