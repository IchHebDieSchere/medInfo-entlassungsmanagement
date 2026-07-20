import { z } from 'zod'
import { AppError } from '../../errors/app-error.js'

const diagnosisSchema = z.object({
  code: z.string().trim().min(1, 'diagnosis.code is required'),
  display: z.string().trim().min(1, 'diagnosis.display is required')
})

const procedureSchema = z.object({
  code: z.string().trim().min(1, 'procedure.code is required'),
  display: z.string().trim().min(1, 'procedure.display is required')
})

const medicationSchema = z.object({
  name: z.string().trim().min(1, 'medication.name is required'),
  dosage: z.string().trim().min(1, 'medication.dosage is required')
})

const dischargeInputSchema = z
  .object({
    patient: z.object({
      patientId: z
        .string()
        .trim()
        .uuid('patient.patientId must be a valid UUID')
    }),

    encounter: z.object({
      encounterId: z
        .string()
        .trim()
        .min(1, 'encounter.encounterId is required')
    }),

    diagnoses: z
      .array(diagnosisSchema)
      .min(1, 'At least one diagnosis is required'),

    procedures: z.array(procedureSchema),

    medications: z.array(medicationSchema),

    followUp: z.object({
      type: z.string().trim().min(1, 'followUp.type is required'),
      date: z
        .string()
        .regex(
          /^\d{4}-\d{2}-\d{2}$/,
          'followUp.date must use YYYY-MM-DD'
        )
    })
  })
  .strict()

export const validateDischargeInput = requestBody => {
  const result = dischargeInputSchema.safeParse(requestBody)

  if (!result.success) {
    const message = result.error.issues
      .map(issue => {
        const path = issue.path.join('.')
        return path ? `${path}: ${issue.message}` : issue.message
      })
      .join('; ')

    throw new AppError(
      400,
      'INVALID_DISCHARGE_REQUEST',
      message
    )
  }

  return result.data
}