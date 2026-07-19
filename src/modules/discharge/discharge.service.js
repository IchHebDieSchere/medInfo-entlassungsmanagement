import { randomUUID } from 'node:crypto'
import { AppError } from '../../errors/app-error.js'

const validateDischargeInput = requestBody => {
  if (!requestBody || typeof requestBody !== 'object' || Array.isArray(requestBody)) {
    throw new AppError(
        400,
        'INVALID_REQUEST_BODY',
        'The RequestBody must be a Json object'
    )
  }

  const patient = requestBody.patient

  if (!patient || typeof patient !== 'object' || Array.isArray(patient)) {
    throw new AppError(
        400,
        'INVALID_PATIENT',
        'The patient is unknown')
  }
  
  const patientId = patient.patientId
  
  if (typeof patientId !== 'string' || patientId.trim() === '') {
    throw new AppError(
        400,
        'INVALID_PATIENT_ID',
        'The Id is unknown'
    )
  }

  return patientId.trim()
}

export const startDischarge = (requestBody) => {
    const patientId = validateDischargeInput(requestBody)
    return {
        transactionId: randomUUID(),
        status: "STARTED",
        patientId
    }
}