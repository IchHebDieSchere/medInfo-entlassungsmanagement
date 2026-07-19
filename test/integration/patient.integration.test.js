import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createApp } from '../../src/app.js'
import { config } from '../../src/config/env.js'
import {
  connectToDatabase,
  disconnectFromDatabase
} from '../../src/database/mongoose.js'
import { Patient } from '../../src/modules/patients/patient.model.js'
import {
  getTestServerUrl,
  startTestServer,
  stopTestServer
} from '../helpers/test-server.js'

let server
let baseUrl
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

  await Patient.deleteMany({})

  const app = createApp()
  server = await startTestServer(app)
  baseUrl = getTestServerUrl(server)
})

after(async () => {
  if (server) {
    await stopTestServer(server)
  }

  if (databaseConnected) {
    await Patient.deleteMany({})
    await disconnectFromDatabase()
  }
})

test('patient can be created, retrieved, updated and listed', async () => {
  const createResponse = await fetch(`${baseUrl}/api/v1/patients`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      familyName: 'Integrationstest',
      givenName: ['Test'],
      birthDate: '1990-01-01'
    })
  })

  const createBody = await createResponse.json()

  assert.equal(createResponse.status, 201)
  assert.equal(createBody.data.familyName, 'Integrationstest')
  assert.ok(createBody.data.patientId)

  const getResponse = await fetch(
    `${baseUrl}/api/v1/patients/${createBody.data.patientId}`
  )

  const getBody = await getResponse.json()

  assert.equal(getResponse.status, 200)
  assert.equal(getBody.data.patientId, createBody.data.patientId)
  assert.equal(getBody.data.familyName, 'Integrationstest')

  const updateResponse = await fetch(
    `${baseUrl}/api/v1/patients/${createBody.data.patientId}`,
    {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        familyName: 'Aktualisiert'
      })
    }
  )

  const updateBody = await updateResponse.json()

  assert.equal(updateResponse.status, 200)
  assert.equal(updateBody.data.familyName, 'Aktualisiert')

  const listResponse = await fetch(`${baseUrl}/api/v1/patients?page=1&limit=10`)

  const listBody = await listResponse.json()

  assert.equal(listResponse.status, 200)
  assert.equal(listBody.data.length, 1)
  assert.equal(listBody.data[0].patientId, createBody.data.patientId)
  assert.deepEqual(listBody.meta.pagination, {
    page: 1,
    limit: 10,
    totalItems: 1,
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false
  })
})
