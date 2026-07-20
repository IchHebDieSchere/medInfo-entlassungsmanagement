import { Router } from 'express'

import {
  auditRouter,
  dischargeRouter
} from '../modules/discharge/discharge.routes.js'

import { patientRouter } from '../modules/patients/patient.routes.js'
import { systemRouter } from './system.routes.js'

export const router = Router()

router.use(systemRouter)
router.use('/api/v1/patients', patientRouter)
router.use('/api/v1/discharge', dischargeRouter)
router.use('/api/v1/audit', auditRouter)
