import { AppError } from '../../errors/app-error.js'

import { DischargeWorkflow } from './discharge-workflow.model.js'

import {
  canTransitionDischarge,
  DISCHARGE_STATUS
} from './discharge-workflow.js'

export const createDischargeWorkflow = async ({
  transactionId,
  patientId,
  encounterId
}) => {
  const workflow = await DischargeWorkflow.create({
    transactionId,
    patientId,
    encounterId,
    status: DISCHARGE_STATUS.RECEIVED
  })

  return workflow.toObject()
}

export const transitionDischargeWorkflow = async (
  transactionId,
  nextStatus,
  {
    completedAt,
    failedStep,
    failureCode,
    fhirPatientId,
    compositionId,
    documentReferenceId
  } = {}
) => {
  const workflow = await DischargeWorkflow.findOne({
    transactionId
  })

  if (!workflow) {
    throw new AppError(
      404,
      'DISCHARGE_WORKFLOW_NOT_FOUND',
      `Discharge workflow ${transactionId} was not found`
    )
  }

  if (!canTransitionDischarge(workflow.status, nextStatus)) {
    throw new AppError(
      409,
      'INVALID_DISCHARGE_TRANSITION',
      `Cannot transition discharge workflow from ${workflow.status} to ${nextStatus}`
    )
  }

  workflow.status = nextStatus

  if (fhirPatientId !== undefined) {
    workflow.fhirPatientId = fhirPatientId
  }

  if (compositionId !== undefined) {
    workflow.compositionId = compositionId
  }

  if (documentReferenceId !== undefined) {
    workflow.documentReferenceId = documentReferenceId
  }

  if (nextStatus === DISCHARGE_STATUS.COMPLETED) {
    workflow.completedAt = completedAt ?? new Date()

    workflow.failedAt = null
    workflow.failedStep = null
    workflow.failureCode = null
  }

  if (nextStatus === DISCHARGE_STATUS.FAILED) {
    workflow.failedAt = new Date()
    workflow.failedStep = failedStep ?? null
    workflow.failureCode = failureCode ?? null
  }

  await workflow.save()

  return workflow.toObject()
}

export const getDischargeWorkflowByTransactionId = async transactionId => {
  const workflow = await DischargeWorkflow.findOne({
    transactionId
  }).lean()

  if (!workflow) {
    throw new AppError(
      404,
      'DISCHARGE_WORKFLOW_NOT_FOUND',
      `Discharge workflow ${transactionId} was not found`
    )
  }

  return workflow
}
