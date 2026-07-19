import { z } from 'zod'

const nonEmptyName = z.string().trim().min(1, 'Must not be empty')

const patientFields = {
  familyName: nonEmptyName,
  givenName: z.array(nonEmptyName).default([]),
  birthDate: z.iso.date().nullable().default(null)
}

const integerQueryValue = z
  .union([z.string().regex(/^\d+$/, 'Must be an integer'), z.number().int()])
  .transform(Number)

export const createPatientRequestSchema = z.strictObject(patientFields)

export const updatePatientRequestSchema = z
  .strictObject({
    familyName: patientFields.familyName.optional(),
    givenName: z.array(nonEmptyName).optional(),
    birthDate: z.iso.date().nullable().optional()
  })
  .refine(value => Object.keys(value).length > 0, {
    message: 'At least one patient field must be provided'
  })

export const patientIdParamsSchema = z.strictObject({
  patientId: z.uuid('patientId must be a valid UUID')
})

export const patientListQuerySchema = z.strictObject({
  page: integerQueryValue.pipe(z.number().int().min(1)).default(1),
  limit: integerQueryValue.pipe(z.number().int().min(1).max(100)).default(20)
})
