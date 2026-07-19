import { randomUUID } from 'node:crypto'
import { AppError } from '../../errors/app-error'
import { type } from 'node:os'

const validateDischargeInput = requestBody => {
    const patient = requestBody.patient
    const patientId = patient.patientId

  if (!requestBody || typeof requestBody !== 'object' || Array.isArray(requestBody)) {
    throw new AppError(
        400,
        'INVALID_REQUEST_BODY',
        'The RequestBody must be a Json object'
    )
  } else if (!patient || typeof patient !== 'object' || Array.isArray(patient)) {
    throw new AppError(
        400,
        'INVALID_PATIENT',
        'The patient is unknown')
  } else if (typeof patientId !== 'stirng' || patientId.trim() !== '') {
    throw new AppError(
        400,
        'INVALID_PATIENT_ID',
        'The Id is unknown'
    )
  }

  return patientId.trim()
}

export const startDischarge = (requestBody) => {
    return {
        transactionId: randomUUID(),
        status: "STARTED",
        patientId: requestBody.patient.patientId
    }
}