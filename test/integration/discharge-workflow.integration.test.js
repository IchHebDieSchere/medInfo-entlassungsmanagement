import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, before, test } from 'node:test'

import { config } from '../../src/config/env.js'
import {
  connectToDatabase,
  disconnectFromDatabase
} from '../../src/database/mongoose.js'

import { DischargeWorkflow } from '../../src/modules/discharge/discharge-workflow.model.js'

import {
  createDischargeWorkflow,
  getDischargeWorkflowByTransactionId,
  transitionDischargeWorkflow
} from '../../src/modules/discharge/discharge-workflow.service.js'

import { DISCHARGE_STATUS } from '../../src/modules/discharge/discharge-workflow.js'

let databaseConnected = false

const assertSafeTestEnvironment = () => {
  const isTestEnvironment = config.nodeEnv === 'test'
  const usesTestDatabase = config.mongodbUri.includes('med-info-fhir-test')

  if (!isTestEnvironment || !usesTestDatabase) {
    throw new Error('Integration tests require the isolated test database')
  }
}

const createTestWorkflow = async () => {
  const transactionId = randomUUID()
  const patientId = randomUUID()
  const encounterId = `encounter-${randomUUID()}`

  const workflow = await createDischargeWorkflow({
    transactionId,
    patientId,
    encounterId
  })

  return {
    workflow,
    transactionId,
    patientId,
    encounterId
  }
}

before(async () => {
  assertSafeTestEnvironment()

  await connectToDatabase()
  databaseConnected = true

  await DischargeWorkflow.deleteMany({})
})

after(async () => {
  if (databaseConnected) {
    await DischargeWorkflow.deleteMany({})
    await disconnectFromDatabase()
  }
})

test('discharge workflow starts with RECEIVED and can transition to VALIDATED', async () => {
  const { workflow, transactionId, patientId, encounterId } =
    await createTestWorkflow()

  assert.equal(workflow.transactionId, transactionId)
  assert.equal(workflow.patientId, patientId)
  assert.equal(workflow.encounterId, encounterId)
  assert.equal(workflow.status, DISCHARGE_STATUS.RECEIVED)

  assert.ok(workflow.startedAt)
  assert.equal(workflow.completedAt, null)
  assert.equal(workflow.failedAt, null)

  const validatedWorkflow = await transitionDischargeWorkflow(
    transactionId,
    DISCHARGE_STATUS.VALIDATED
  )

  assert.equal(validatedWorkflow.status, DISCHARGE_STATUS.VALIDATED)

  const storedWorkflow =
    await getDischargeWorkflowByTransactionId(transactionId)

  assert.equal(storedWorkflow.status, DISCHARGE_STATUS.VALIDATED)
})

test('invalid discharge workflow transition is rejected with HTTP 409 error', async () => {
  const { transactionId } = await createTestWorkflow()

  await assert.rejects(
    () =>
      transitionDischargeWorkflow(transactionId, DISCHARGE_STATUS.COMPLETED),
    error => {
      assert.equal(error.statusCode, 409)
      assert.equal(error.code, 'INVALID_DISCHARGE_TRANSITION')

      return true
    }
  )

  const storedWorkflow =
    await getDischargeWorkflowByTransactionId(transactionId)

  assert.equal(storedWorkflow.status, DISCHARGE_STATUS.RECEIVED)
})

test('completed workflow stores generated FHIR IDs and completion time', async () => {
  const { transactionId } = await createTestWorkflow()

  const fhirPatientId = `patient-${randomUUID()}`
  const compositionId = `composition-${randomUUID()}`
  const documentReferenceId = `document-${randomUUID()}`
  const completedAt = new Date('2026-07-21T12:00:00.000Z')

  await transitionDischargeWorkflow(transactionId, DISCHARGE_STATUS.VALIDATED)

  await transitionDischargeWorkflow(
    transactionId,
    DISCHARGE_STATUS.PATIENT_SYNCHRONIZED,
    {
      fhirPatientId
    }
  )

  await transitionDischargeWorkflow(
    transactionId,
    DISCHARGE_STATUS.ENCOUNTER_VALIDATED
  )

  await transitionDischargeWorkflow(
    transactionId,
    DISCHARGE_STATUS.ENCOUNTER_CLOSED
  )

  await transitionDischargeWorkflow(
    transactionId,
    DISCHARGE_STATUS.COMPOSITION_CREATED,
    {
      compositionId
    }
  )

  await transitionDischargeWorkflow(
    transactionId,
    DISCHARGE_STATUS.DOCUMENT_REFERENCE_CREATED,
    {
      documentReferenceId
    }
  )

  await transitionDischargeWorkflow(
    transactionId,
    DISCHARGE_STATUS.FHIR_AUDIT_RECORDED
  )

  const completedWorkflow = await transitionDischargeWorkflow(
    transactionId,
    DISCHARGE_STATUS.COMPLETED,
    {
      completedAt
    }
  )

  assert.equal(completedWorkflow.status, DISCHARGE_STATUS.COMPLETED)
  assert.equal(completedWorkflow.fhirPatientId, fhirPatientId)
  assert.equal(completedWorkflow.compositionId, compositionId)
  assert.equal(completedWorkflow.documentReferenceId, documentReferenceId)

  assert.equal(
    completedWorkflow.completedAt.toISOString(),
    completedAt.toISOString()
  )

  assert.equal(completedWorkflow.failedAt, null)
  assert.equal(completedWorkflow.failedStep, null)
  assert.equal(completedWorkflow.failureCode, null)
})

test('failed workflow stores failure time, step and error code', async () => {
  const { transactionId } = await createTestWorkflow()

  const failedWorkflow = await transitionDischargeWorkflow(
    transactionId,
    DISCHARGE_STATUS.FAILED,
    {
      failedStep: 'FHIR_ENCOUNTER_LOOKUP',
      failureCode: 'ENCOUNTER_NOT_FOUND'
    }
  )

  assert.equal(failedWorkflow.status, DISCHARGE_STATUS.FAILED)
  assert.ok(failedWorkflow.failedAt)
  assert.equal(failedWorkflow.failedStep, 'FHIR_ENCOUNTER_LOOKUP')
  assert.equal(failedWorkflow.failureCode, 'ENCOUNTER_NOT_FOUND')
  assert.equal(failedWorkflow.completedAt, null)

  const storedWorkflow =
    await getDischargeWorkflowByTransactionId(transactionId)

  assert.equal(storedWorkflow.status, DISCHARGE_STATUS.FAILED)
  assert.equal(storedWorkflow.failedStep, 'FHIR_ENCOUNTER_LOOKUP')
  assert.equal(storedWorkflow.failureCode, 'ENCOUNTER_NOT_FOUND')
})
