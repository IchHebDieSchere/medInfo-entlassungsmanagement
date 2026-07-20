import {
  toDischargeAuditResponse,
  toDischargeResponse
} from './discharge.mapper.js'

import { getDischargeAuditTrail, startDischarge } from './discharge.service.js'

export const startDischargeHandler = async (req, res) => {
  const result = await startDischarge(req.validated.body)

  res.status(201).json({
    data: toDischargeResponse(result)
  })
}

export const getDischargeAuditHandler = async (req, res) => {
  const auditEntries = await getDischargeAuditTrail(
    req.validated.params.transactionId
  )

  res.status(200).json({
    data: auditEntries.map(toDischargeAuditResponse)
  })
}
