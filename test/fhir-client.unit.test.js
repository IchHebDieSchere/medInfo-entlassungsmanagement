import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  createFhirClient,
  buildCompositionResource,
  toFhirPatient,
  fromFhirPatient
} from '../src/fhir-client.js'

const jsonResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body
})

test('getPatient sendet ein GET an /Patient/:id und liefert das interne Patient-Modell', async () => {
  const calls = []

  const fetchImpl = async (url, options) => {
    calls.push({ url, options })
    return jsonResponse(200, {
      resourceType: 'Patient',
      id: '596',
      name: [{ family: 'Mustermann', given: ['Erika'] }],
      birthDate: '1990-01-01'
    })
  }

  const client = createFhirClient({
    baseUrl: 'http://test.local/fhir',
    fetchImpl
  })
  const patient = await client.getPatient('596')

  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, 'http://test.local/fhir/Patient/596')
  assert.equal(calls[0].options.method, 'GET')
  assert.deepEqual(patient, {
    resourceType: 'Patient',
    id: '596',
    identifier: null,
    familyName: 'Mustermann',
    givenName: ['Erika'],
    birthDate: '1990-01-01'
  })
})

test('createPatient übersetzt das interne Modell in eine FHIR-Resource und zurück', async () => {
  let sentBody

  const fetchImpl = async (url, options) => {
    sentBody = JSON.parse(options.body)
    return jsonResponse(201, {
      resourceType: 'Patient',
      id: 'abc-123',
      ...sentBody
    })
  }

  const client = createFhirClient({
    baseUrl: 'http://test.local/fhir',
    fetchImpl
  })

  const created = await client.createPatient({
    identifier: { system: 'urn:medinfo:patient-id', value: 'local-42' },
    familyName: 'Testfrau',
    givenName: ['Petra'],
    birthDate: '1985-05-15'
  })

  assert.equal(sentBody.resourceType, 'Patient')
  assert.equal(
    sentBody.id,
    undefined,
    'id darf beim Anlegen nicht mitgeschickt werden'
  )
  assert.equal(sentBody.name[0].family, 'Testfrau')
  assert.deepEqual(sentBody.identifier, [
    { system: 'urn:medinfo:patient-id', value: 'local-42' }
  ])
  assert.deepEqual(created, {
    resourceType: 'Patient',
    id: 'abc-123',
    identifier: { system: 'urn:medinfo:patient-id', value: 'local-42' },
    familyName: 'Testfrau',
    givenName: ['Petra'],
    birthDate: '1985-05-15'
  })
})

test('toFhirPatient und fromFhirPatient sind zueinander inverse, reine Funktionen', () => {
  const internal = {
    resourceType: 'Patient',
    id: '596',
    identifier: { system: 'urn:medinfo:patient-id', value: 'local-596' },
    familyName: 'Mustermann',
    givenName: ['Erika'],
    birthDate: '1990-01-01'
  }
  const fhirPatient = toFhirPatient(internal)

  assert.equal(fhirPatient.resourceType, 'Patient')
  assert.equal(fhirPatient.id, '596')
  assert.deepEqual(fhirPatient.identifier, [
    { system: 'urn:medinfo:patient-id', value: 'local-596' }
  ])
  assert.deepEqual(fromFhirPatient(fhirPatient), internal)
})

test('createDischargeComposition sendet ein POST mit der gebauten Composition-Resource', async () => {
  let sentBody

  const fetchImpl = async (url, options) => {
    sentBody = JSON.parse(options.body)
    return jsonResponse(201, {
      resourceType: 'Composition',
      id: '789',
      ...sentBody
    })
  }

  const client = createFhirClient({
    baseUrl: 'http://test.local/fhir',
    fetchImpl
  })

  await client.createDischargeComposition({
    patientId: '596',
    encounterId: '1201',
    sections: [{ sectionTitle: 'Zusammenfassung', text: 'Alles gut.' }]
  })

  assert.equal(sentBody.resourceType, 'Composition')
  assert.equal(sentBody.subject.reference, 'Patient/596')
  assert.equal(sentBody.section[0].title, 'Zusammenfassung')
})

test('eine 404-Antwort wird als AppError mit Code FHIR_NOT_FOUND geworfen', async () => {
  const operationOutcome = {
    resourceType: 'OperationOutcome',
    issue: [
      {
        severity: 'error',
        code: 'not-found',
        diagnostics: 'Patient/999 not found'
      }
    ]
  }

  const fetchImpl = async () => jsonResponse(404, operationOutcome)

  const client = createFhirClient({
    baseUrl: 'http://test.local/fhir',
    fetchImpl
  })

  await assert.rejects(
    () => client.getPatient('999'),
    error => {
      assert.equal(error.name, 'AppError')
      assert.equal(error.statusCode, 404)
      assert.equal(error.code, 'FHIR_NOT_FOUND')
      assert.deepEqual(error.details, [
        {
          severity: 'error',
          code: 'not-found'
        }
      ])
      return true
    }
  )
})

test('eine 500-Antwort ohne OperationOutcome leakt keine rohe Serverantwort', async () => {
  const fetchImpl = async () => ({
    ok: false,
    status: 500,
    json: async () => {
      throw new Error('kein valides JSON')
    }
  })

  const client = createFhirClient({
    baseUrl: 'http://test.local/fhir',
    fetchImpl
  })

  await assert.rejects(
    () => client.getPatient('1'),
    error => {
      assert.equal(error.code, 'FHIR_SERVER_ERROR')
      assert.equal(error.statusCode, 500)
      assert.equal(error.details, undefined)
      return true
    }
  )
})

test('ein abgebrochener Request wirft AppError mit Code FHIR_TIMEOUT', async () => {
  const neverRespondingFetch = (url, { signal }) =>
    new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => {
        const abortError = new Error('The operation was aborted')
        abortError.name = 'AbortError'
        reject(abortError)
      })
    })

  const client = createFhirClient({
    baseUrl: 'http://test.local/fhir',
    fetchImpl: neverRespondingFetch,
    requestTimeoutMs: 10
  })

  await assert.rejects(
    () => client.getPatient('596'),
    error => {
      assert.equal(error.code, 'FHIR_TIMEOUT')
      assert.equal(error.statusCode, 504)
      return true
    }
  )
})

test('ein Netzwerkfehler (Server nicht erreichbar) wirft AppError mit Code FHIR_UNAVAILABLE', async () => {
  const fetchImpl = async () => {
    throw new Error('connect ECONNREFUSED 127.0.0.1:8080')
  }

  const client = createFhirClient({
    baseUrl: 'http://test.local/fhir',
    fetchImpl
  })

  await assert.rejects(
    () => client.getPatient('596'),
    error => {
      assert.equal(error.code, 'FHIR_UNAVAILABLE')
      assert.equal(error.statusCode, 502)
      return true
    }
  )
})

test('buildCompositionResource ist eine reine Funktion ohne Netzwerkzugriff', () => {
  const composition = buildCompositionResource({
    patientId: '596',
    encounterId: '1201',
    sections: [{ sectionTitle: 'Empfehlung', text: 'Kontrolle in 2 Wochen.' }]
  })

  assert.equal(composition.resourceType, 'Composition')
  assert.equal(composition.status, 'final')
  assert.equal(composition.section.length, 1)
})
