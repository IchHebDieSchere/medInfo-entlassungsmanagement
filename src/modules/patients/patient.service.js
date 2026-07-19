import { AppError } from '../../errors/app-error.js'
import { Patient } from './patient.model.js'

export const createPatient = async payload => {
  const patient = await Patient.create(payload)

  return patient.toObject()
}

export const getPatientById = async patientId => {
  const patient = await Patient.findOne({ patientId }).lean()

  if (!patient) {
    throw new AppError(
      404,
      'PATIENT_NOT_FOUND',
      `Patient ${patientId} not found`
    )
  }

  return patient
}

export const listPatients = async query => {
  const { page, limit } = query
  const skip = (page - 1) * limit

  const [patients, totalItems] = await Promise.all([
    Patient.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),

    Patient.countDocuments()
  ])

  const totalPages = Math.ceil(totalItems / limit)

  return {
    patients,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages,
      hasPreviousPage: page > 1,
      hasNextPage: page < totalPages
    }
  }
}

export const updatePatientById = async (patientId, payload) => {
  const patient = await Patient.findOneAndUpdate(
    { patientId },
    { $set: payload },
    {
      returnDocument: 'after',
      runValidators: true
    }
  ).lean()

  if (!patient) {
    throw new AppError(
      404,
      'PATIENT_NOT_FOUND',
      `Patient ${patientId} not found`
    )
  }

  return patient
}
