import { z } from 'zod'

const nonEmptyText = z.string().trim().min(1, 'Must not be empty')

const clinicalItemSchema = z.strictObject({
  code: nonEmptyText,
  display: nonEmptyText
})

const medicationSchema = z.strictObject({
  name: nonEmptyText,
  dosage: nonEmptyText
})

export const dischargeRequestSchema = z.strictObject({
  patient: z.strictObject({
    patientId: z.uuid('patient.patientId must be a valid UUID')
  }),

  encounter: z.strictObject({
    encounterId: z
      .string()
      .trim()
      .min(1, 'encounter.encounterId must not be empty')
      .max(64, 'encounter.encounterId must not exceed 64 characters')
      .regex(
        /^[A-Za-z0-9.-]+$/,
        'encounter.encounterId contains invalid characters'
      )
  }),

  diagnoses: z
    .array(clinicalItemSchema)
    .min(1, 'At least one diagnosis is required'),

  procedures: z.array(clinicalItemSchema),

  medications: z.array(medicationSchema),

  followUp: z.strictObject({
    type: nonEmptyText,
    date: z.iso.date('followUp.date must use YYYY-MM-DD'),
    notes: z.string().trim().max(1000).optional()
  })
})

export const auditTransactionIdParamsSchema = z.strictObject({
  transactionId: z.uuid('transactionId must be a valid UUID')
})
