import { DischargeAudit } from './discharge-audit.model.js'

export const createDischargeAudit = async auditData => {
  const auditEntry = await DischargeAudit.create(auditData)

  return auditEntry.toObject()
}

export const listDischargeAuditsByTransactionId = async transactionId => {
  return DischargeAudit.find({
    transactionId
  })
    .sort({
      createdAt: 1
    })
    .lean()
}