import { Router } from 'express'
import { startDischargeHandler } from './discharge.controller.js'

export const dischargeRouter = Router()

dischargeRouter.post('/', startDischargeHandler)