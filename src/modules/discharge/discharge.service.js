import { randomUUID } from 'node:crypto'
import { validateDischargeInput } from './discharge.validation.js'

export const startDischarge = async requestBody => {
  const input = validateDischargeInput(requestBody)
  const transactionId = randomUUID()

  return {
    transactionId,
    status: 'VALIDATED',
    patientId: input.patient.patientId,
    encounterId: input.encounter.encounterId,
    summary: {
      diagnoses: input.diagnoses.length,
      procedures: input.procedures.length,
      medications: input.medications.length,
      followUp: input.followUp 
    }
  }
}