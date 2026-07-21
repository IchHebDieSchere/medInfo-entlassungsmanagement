import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, before, test } from 'node:test'

import { config } from '../../src/config/env.js'
import {
  connectToDatabase,
  disconnectFromDatabase
} from '../../src/database/mongoose.js'

import { DischargeAudit } from '../../src/modules/discharge/discharge-audit.model.js'

import {
  createDischargeAudit,
  listDischargeAuditsByTransactionId
} from '../../src/modules/discharge/discharge-audit.service.js'

let databaseConnected = false

const assertSafeTestEnvironment = () => {
  const isTestEnvironment = config.nodeEnv === 'test'

  const usesTestDatabase = config.mongodbUri.includes('med-info-fhir-test')

  if (!isTestEnvironment || !usesTestDatabase) {
    throw new Error('Integration tests require the isolated test database')
  }
}

before(async () => {
  assertSafeTestEnvironment()

  await connectToDatabase()
  databaseConnected = true

  await DischargeAudit.deleteMany({})
})

after(async () => {
  if (databaseConnected) {
    await DischargeAudit.deleteMany({})
    await disconnectFromDatabase()
  }
})

test('discharge audit entries are stored and returned chronologically', async () => {
  const transactionId = randomUUID()
  const patientId = randomUUID()
  const encounterId = 'encounter-integration-test'

  await createDischargeAudit({
    transactionId,
    patientId,
    encounterId,
    step: 'REQUEST_RECEIVED',
    status: 'SUCCESS',
    message: 'Discharge request was received'
  })

  await createDischargeAudit({
    transactionId,
    patientId,
    encounterId,
    step: 'INPUT_VALIDATED',
    status: 'SUCCESS',
    message: 'Discharge input was validated',
    metadata: {
      diagnosisCount: 1
    }
  })

  const auditEntries = await listDischargeAuditsByTransactionId(transactionId)

  assert.equal(auditEntries.length, 2)

  assert.equal(auditEntries[0].transactionId, transactionId)

  assert.equal(auditEntries[0].step, 'REQUEST_RECEIVED')

  assert.equal(auditEntries[1].step, 'INPUT_VALIDATED')

  assert.deepEqual(auditEntries[1].metadata, {
    diagnosisCount: 1
  })

  assert.ok(auditEntries[0].createdAt)
  assert.ok(auditEntries[1].createdAt)
})

test('audit query only returns entries for the requested transaction', async () => {
  const requestedTransactionId = randomUUID()
  const otherTransactionId = randomUUID()
  const patientId = randomUUID()
  const encounterId = 'encounter-filter-test'

  await createDischargeAudit({
    transactionId: requestedTransactionId,
    patientId,
    encounterId,
    step: 'WORKFLOW_COMPLETED',
    status: 'SUCCESS',
    message: 'Requested workflow completed'
  })

  await createDischargeAudit({
    transactionId: otherTransactionId,
    patientId,
    encounterId,
    step: 'WORKFLOW_FAILED',
    status: 'FAILED',
    message: 'Other workflow failed'
  })

  const auditEntries = await listDischargeAuditsByTransactionId(
    requestedTransactionId
  )

  assert.equal(auditEntries.length, 1)
  assert.equal(auditEntries[0].transactionId, requestedTransactionId)
  assert.equal(auditEntries[0].step, 'WORKFLOW_COMPLETED')
})
