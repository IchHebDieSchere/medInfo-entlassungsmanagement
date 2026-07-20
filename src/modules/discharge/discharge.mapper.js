export const toDischargeResponse = result => {
  return {
    transactionId: result.transactionId,
    status: result.status,
    patientId: result.patientId,
    encounterId: result.encounterId,
    fhir: {
      patientId: result.fhir.patientId,
      compositionId: result.fhir.compositionId,
      documentReferenceId: result.fhir.documentReferenceId
    },
    completedAt: result.completedAt
  }
}

export const toDischargeAuditResponse = auditEntry => {
  return {
    transactionId: auditEntry.transactionId,
    patientId: auditEntry.patientId,
    encounterId: auditEntry.encounterId,
    step: auditEntry.step,
    status: auditEntry.status,
    message: auditEntry.message,
    ...(auditEntry.metadata
      ? {
          metadata: auditEntry.metadata
        }
      : {}),
    createdAt: auditEntry.createdAt
  }
}
