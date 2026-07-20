
import { startDischarge } from './discharge.service.js'

export const startDischargeHandler = async (req, res) => {
  const result = await startDischarge(req.body)

  return res.status(201).json({
    data: result
  })
}