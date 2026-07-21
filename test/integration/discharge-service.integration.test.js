import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import { after, before, test } from 'node:test'

let connectToDatabase
let disconnectFromDatabase
let createPatient
let startDischarge
let getDischargeWorkflowByTransactionId
let listDischargeAuditsByTransactionId
let Patient
let DischargeAudit
let DischargeWorkflow

let databaseConnected = false
let fhirServer
let fhirBaseUrl

const fhirRequests = []
const patientId = randomUUID()
const encounterId = `encounter-${randomUUID()}`
let transactionId

const readJsonBody = async request => {
  const chunks = []

  for await (const chunk of request) {
    chunks.push(chunk)
  }

  if (chunks.length === 0) {
    return undefined
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

const sendFhirJson = (response, statusCode, body) => {
  response.writeHead(statusCode, {
    'content-type': 'application/fhir+json'
  })
  response.end(JSON.stringify(body))
}

const handleFhirRequest = async (request, response) => {
  try {
    const requestUrl = new URL(request.url, fhirBaseUrl)
    const body = await readJsonBody(request)

    fhirRequests.push({
      method: request.method,
      pathname: requestUrl.pathname,
      searchParams: Object.fromEntries(requestUrl.searchParams),
      body
    })

    if (request.method === 'GET' && requestUrl.pathname === '/fhir/Patient') {
      sendFhirJson(response, 200, {
        resourceType: 'Bundle',
        type: 'searchset',
        total: 0
      })
      return
    }

    if (request.method === 'POST' && requestUrl.pathname === '/fhir/Patient') {
      sendFhirJson(response, 201, {
        ...body,
        id: 'fhir-patient-integration'
      })
      return
    }

    if (
      request.method === 'GET' &&
      requestUrl.pathname === `/fhir/Encounter/${encounterId}`
    ) {
      sendFhirJson(response, 200, {
        resourceType: 'Encounter',
        id: encounterId,
        status: 'in-progress',
        subject: {
          reference: 'Patient/fhir-patient-integration'
        },
        period: {
          start: '2026-07-20T08:00:00.000Z'
        }
      })
      return
    }

    if (
      request.method === 'PUT' &&
      requestUrl.pathname === `/fhir/Encounter/${encounterId}`
    ) {
      sendFhirJson(response, 200, body)
      return
    }

    if (
      request.method === 'POST' &&
      requestUrl.pathname === '/fhir/Composition'
    ) {
      sendFhirJson(response, 201, {
        ...body,
        id: 'composition-integration'
      })
      return
    }

    if (
      request.method === 'POST' &&
      requestUrl.pathname === '/fhir/DocumentReference'
    ) {
      sendFhirJson(response, 201, {
        ...body,
        id: 'document-reference-integration'
      })
      return
    }

    if (request.method === 'POST' && requestUrl.pathname === '/fhir') {
      sendFhirJson(response, 200, {
        resourceType: 'Bundle',
        type: 'transaction-response'
      })
      return
    }

    sendFhirJson(response, 404, {
      resourceType: 'OperationOutcome',
      issue: [
        {
          severity: 'error',
          code: 'not-found'
        }
      ]
    })
  } catch {
    sendFhirJson(response, 500, {
      resourceType: 'OperationOutcome',
      issue: [
        {
          severity: 'error',
          code: 'exception'
        }
      ]
    })
  }
}

const listen = server => {
  return new Promise((resolve, reject) => {
    const onError = error => {
      reject(error)
    }

    server.once('error', onError)
    server.listen(0, '127.0.0.1', () => {
      server.off('error', onError)
      resolve()
    })
  })
}

const close = server => {
  return new Promise((resolve, reject) => {
    server.close(error => {
      if (error) {
        reject(error)
        return
      }

      resolve()
    })
  })
}

before(async () => {
  fhirServer = createServer(handleFhirRequest)
  await listen(fhirServer)

  const address = fhirServer.address()
  fhirBaseUrl = `http://127.0.0.1:${address.port}`
  process.env.FHIR_BASE_URL = `${fhirBaseUrl}/fhir`

  const configModule = await import('../../src/config/env.js')

  assert.equal(configModule.config.nodeEnv, 'test')
  assert.ok(configModule.config.mongodbUri.includes('med-info-fhir-test'))

  ;({ connectToDatabase, disconnectFromDatabase } =
    await import('../../src/database/mongoose.js'))
  ;({ createPatient } =
    await import('../../src/modules/patients/patient.service.js'))
  ;({ Patient } = await import('../../src/modules/patients/patient.model.js'))
  ;({ startDischarge } =
    await import('../../src/modules/discharge/discharge.service.js'))
  ;({ getDischargeWorkflowByTransactionId } =
    await import('../../src/modules/discharge/discharge-workflow.service.js'))
  ;({ listDischargeAuditsByTransactionId } =
    await import('../../src/modules/discharge/discharge-audit.service.js'))
  ;({ DischargeAudit } =
    await import('../../src/modules/discharge/discharge-audit.model.js'))
  ;({ DischargeWorkflow } =
    await import('../../src/modules/discharge/discharge-workflow.model.js'))

  await connectToDatabase()
  databaseConnected = true
})

after(async () => {
  if (databaseConnected) {
    await Promise.all([
      Patient.deleteMany({ patientId }),
      DischargeAudit.deleteMany({ patientId }),
      DischargeWorkflow.deleteMany({ patientId })
    ])
    await disconnectFromDatabase()
  }

  if (fhirServer?.listening) {
    await close(fhirServer)
  }
})

test('complete discharge workflow persists state, audit trail and FHIR resources', async () => {
  await createPatient({
    patientId,
    familyName: 'Mustermann',
    givenName: ['Erika'],
    birthDate: '1990-01-01'
  })

  const result = await startDischarge({
    patient: {
      patientId
    },
    encounter: {
      encounterId
    },
    diagnoses: [
      {
        code: 'J18.9',
        display: 'Pneumonie <viral>'
      }
    ],
    procedures: [],
    medications: [
      {
        name: 'Amoxicillin',
        dosage: '500 mg dreimal täglich'
      }
    ],
    followUp: {
      type: 'Hausarztkontrolle',
      date: '2026-07-27',
      notes: 'Allgemeinzustand kontrollieren'
    }
  })

  transactionId = result.transactionId

  assert.equal(result.status, 'COMPLETED')
  assert.equal(result.patientId, patientId)
  assert.equal(result.encounterId, encounterId)
  assert.deepEqual(result.fhir, {
    patientId: 'fhir-patient-integration',
    compositionId: 'composition-integration',
    documentReferenceId: 'document-reference-integration'
  })
  assert.ok(Date.parse(result.completedAt))

  const workflow = await getDischargeWorkflowByTransactionId(transactionId)

  assert.equal(workflow.status, 'COMPLETED')
  assert.equal(workflow.fhirPatientId, result.fhir.patientId)
  assert.equal(workflow.compositionId, result.fhir.compositionId)
  assert.equal(workflow.documentReferenceId, result.fhir.documentReferenceId)
  assert.ok(workflow.completedAt)

  const auditEntries = await listDischargeAuditsByTransactionId(transactionId)

  assert.deepEqual(
    auditEntries.map(entry => entry.step),
    [
      'REQUEST_RECEIVED',
      'INPUT_VALIDATED',
      'LOCAL_PATIENT_FOUND',
      'FHIR_PATIENT_READY',
      'ENCOUNTER_VALIDATED',
      'ENCOUNTER_CLOSED',
      'COMPOSITION_CREATED',
      'DOCUMENT_REFERENCE_CREATED',
      'FHIR_AUDIT_RECORDED',
      'WORKFLOW_COMPLETED'
    ]
  )
  assert.ok(auditEntries.every(entry => entry.status === 'SUCCESS'))

  const patientSearchRequest = fhirRequests.find(
    request => request.method === 'GET' && request.pathname === '/fhir/Patient'
  )
  assert.equal(
    patientSearchRequest.searchParams.identifier,
    `urn:medinfo:patient-id|${patientId}`
  )

  const patientCreateRequest = fhirRequests.find(
    request => request.method === 'POST' && request.pathname === '/fhir/Patient'
  )
  assert.equal(patientCreateRequest.body.identifier[0].value, patientId)
  assert.equal(patientCreateRequest.body.name[0].family, 'Mustermann')

  const encounterUpdateRequest = fhirRequests.find(
    request =>
      request.method === 'PUT' &&
      request.pathname === `/fhir/Encounter/${encounterId}`
  )
  assert.equal(encounterUpdateRequest.body.status, 'finished')
  assert.ok(Date.parse(encounterUpdateRequest.body.period.end))

  const compositionRequest = fhirRequests.find(
    request =>
      request.method === 'POST' && request.pathname === '/fhir/Composition'
  )
  assert.equal(
    compositionRequest.body.subject.reference,
    'Patient/fhir-patient-integration'
  )
  assert.match(
    compositionRequest.body.section[0].text.div,
    /Pneumonie &lt;viral&gt;/
  )

  const documentRequest = fhirRequests.find(
    request =>
      request.method === 'POST' &&
      request.pathname === '/fhir/DocumentReference'
  )
  const documentText = Buffer.from(
    documentRequest.body.content[0].attachment.data,
    'base64'
  ).toString('utf8')
  assert.match(documentText, /Diagnosen: J18\.9 - Pneumonie <viral>/)
  assert.equal(
    documentRequest.body.context.related[0].reference,
    'Composition/composition-integration'
  )

  const transactionRequest = fhirRequests.find(
    request => request.method === 'POST' && request.pathname === '/fhir'
  )
  assert.equal(transactionRequest.body.type, 'transaction')
  assert.deepEqual(
    transactionRequest.body.entry.map(entry => entry.resource.resourceType),
    ['AuditEvent', 'Provenance']
  )
})
