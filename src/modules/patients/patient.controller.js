import { toPatientResponse } from './patient.mapper.js'
import {
  createPatient,
  getPatientById,
  listPatients,
  updatePatientById
} from './patient.service.js'

export const createPatientHandler = async (req, res) => {
  const patient = await createPatient(req.body)

  res
    .location(`/api/v1/patients/${patient.patientId}`)
    .status(201)
    .json({
      data: toPatientResponse(patient)
    })
}

export const getPatientByIdHandler = async (req, res) => {
  const patient = await getPatientById(req.params.patientId)

  res.status(200).json({
    data: toPatientResponse(patient)
  })
}

export const listPatientsHandler = async (req, res) => {
  const result = await listPatients(req.query)

  res.status(200).json({
    data: result.patients.map(toPatientResponse),
    meta: {
      pagination: result.pagination
    }
  })
}

export const updatePatientByIdHandler = async (req, res) => {
  const patient = await updatePatientById(
    req.params.patientId,
    req.body
  )

  res.status(200).json({
    data: toPatientResponse(patient)
  })
}