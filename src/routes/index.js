import { Router } from 'express'
import { patientRouter } from '../modules/patients/patient.routes.js'
import { systemRouter } from './system.routes.js'

export const router = Router()

router.use(systemRouter)
router.use('/api/v1/patients', patientRouter)
