import { AppError } from '../../errors/app-error.js'
import { Patient } from './patient.model.js'

const validateCreatePatientInput = payload => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new AppError(
      400,
      'INVALID_REQUEST_BODY',
      'Request body must be a JSON object'
    )
  }

  if (
    typeof payload.familyName !== 'string' ||
    payload.familyName.trim() === ''
  ) {
    throw new AppError(
      400,
      'INVALID_FAMILY_NAME',
      'familyName is required'
    )
  }

  const givenName = payload.givenName ?? []

  if (
    !Array.isArray(givenName) ||
    givenName.some(name => typeof name !== 'string' || name.trim() === '')
  ) {
    throw new AppError(
      400,
      'INVALID_GIVEN_NAME',
      'givenName must be an array of non-empty strings'
    )
  }

  if (
    payload.birthDate !== undefined &&
    payload.birthDate !== null &&
    (
      typeof payload.birthDate !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(payload.birthDate)
    )
  ) {
    throw new AppError(
      400,
      'INVALID_BIRTH_DATE',
      'birthDate must use the format YYYY-MM-DD'
    )
  }

  return {
    familyName: payload.familyName.trim(),
    givenName: givenName.map(name => name.trim()),
    birthDate: payload.birthDate ?? null
  }
}

const normalizePatientId = patientId => {
  const normalizedPatientId = patientId?.trim()

  if (!normalizedPatientId) {
    throw new AppError(
      400,
      'INVALID_PATIENT_ID',
      'patientId is required'
    )
  }

  return normalizedPatientId
}

export const createPatient = async payload => {
  const patientData = validateCreatePatientInput(payload)
  const patient = await Patient.create(patientData)

  return patient.toObject()
}

export const getPatientById = async patientId => {
  const normalizedPatientId = normalizePatientId(patientId)

  const patient = await Patient
    .findOne({ patientId: normalizedPatientId })
    .lean()

  if (!patient) {
    throw new AppError(
      404,
      'PATIENT_NOT_FOUND',
      `Patient ${normalizedPatientId} not found`
    )
  }

  return patient
}

const parsePage = value => {
  const page = value === undefined ? 1 : Number(value)

  if (!Number.isInteger(page) || page < 1) {
    throw new AppError(
      400,
      'INVALID_PAGE',
      'page must be a positive integer'
    )
  }

  return page
}

const parseLimit = value => {
  const limit = value === undefined ? 20 : Number(value)

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new AppError(
      400,
      'INVALID_LIMIT',
      'limit must be an integer between 1 and 100'
    )
  }

  return limit
}

export const listPatients = async query => {
  const page = parsePage(query.page)
  const limit = parseLimit(query.limit)
  const skip = (page - 1) * limit

  const [patients, totalItems] = await Promise.all([
    Patient
      .find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

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

const validateUpdatePatientInput = payload => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new AppError(
      400,
      'INVALID_REQUEST_BODY',
      'Request body must be a JSON object'
    )
  }

  const allowedFields = new Set([
    'familyName',
    'givenName',
    'birthDate'
  ])

  const unknownFields = Object
    .keys(payload)
    .filter(field => !allowedFields.has(field))

  if (unknownFields.length > 0) {
    throw new AppError(
      400,
      'UNKNOWN_PATIENT_FIELDS',
      `Unknown fields: ${unknownFields.join(', ')}`
    )
  }

  const update = {}

  if (Object.hasOwn(payload, 'familyName')) {
    if (
      typeof payload.familyName !== 'string' ||
      payload.familyName.trim() === ''
    ) {
      throw new AppError(
        400,
        'INVALID_FAMILY_NAME',
        'familyName must be a non-empty string'
      )
    }

    update.familyName = payload.familyName.trim()
  }

  if (Object.hasOwn(payload, 'givenName')) {
    if (
      !Array.isArray(payload.givenName) ||
      payload.givenName.some(
        name => typeof name !== 'string' || name.trim() === ''
      )
    ) {
      throw new AppError(
        400,
        'INVALID_GIVEN_NAME',
        'givenName must be an array of non-empty strings'
      )
    }

    update.givenName = payload.givenName.map(name => name.trim())
  }

  if (Object.hasOwn(payload, 'birthDate')) {
    if (
      payload.birthDate !== null &&
      (
        typeof payload.birthDate !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(payload.birthDate)
      )
    ) {
      throw new AppError(
        400,
        'INVALID_BIRTH_DATE',
        'birthDate must use the format YYYY-MM-DD or be null'
      )
    }

    update.birthDate = payload.birthDate
  }

  if (Object.keys(update).length === 0) {
    throw new AppError(
      400,
      'EMPTY_UPDATE',
      'At least one patient field must be provided'
    )
  }

  return update
}

export const updatePatientById = async (patientId, payload) => {
  const normalizedPatientId = normalizePatientId(patientId)
  const update = validateUpdatePatientInput(payload)

  const patient = await Patient
    .findOneAndUpdate(
      { patientId: normalizedPatientId },
      { $set: update },
      {
        new: true,
        runValidators: true
      }
    )
    .lean()

  if (!patient) {
    throw new AppError(
      404,
      'PATIENT_NOT_FOUND',
      `Patient ${normalizedPatientId} not found`
    )
  }

  return patient
}