import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { AppError } from '../../errors/app-error.js'

const validateDischargeInput = requestBody => {
  if (
    !requestBody ||
    typeof requestBody !== 'object' ||
    Array.isArray(requestBody)
  ) {
    throw new AppError(
      400,
      'INVALID_REQUEST_BODY',
      'The request body must be a JSON object'
    )
  }

  const patient = requestBody.patient

  if (
    !patient ||
    typeof patient !== 'object' ||
    Array.isArray(patient)
  ) {
    throw new AppError(
      400,
      'INVALID_PATIENT',
      'patient must be a JSON object'
    )
  }

  const patientId = patient.patientId

  if (typeof patientId !== 'string' || patientId.trim() === '') {
    throw new AppError(
      400,
      'INVALID_PATIENT_ID',
      'patient.patientId is required'
    )
  }

  const patientIdResult = z
    .string()
    .uuid('patient.patientId must be a valid UUID')
    .safeParse(patientId.trim())

  if (!patientIdResult.success) {
    throw new AppError(
      400,
      'INVALID_PATIENT_ID',
      'patient.patientId must be a valid UUID'
    )
  }

  return patientIdResult.data
}

export const startDischarge = requestBody => {
  const patientId = validateDischargeInput(requestBody)

  return {
    transactionId: randomUUID(),
    status: 'STARTED',
    patientId
  }
}