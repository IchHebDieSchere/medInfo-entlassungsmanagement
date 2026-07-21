// src/fhir-client.js
// Wiederverwendbare Funktionen für die Kommunikation mit einem HAPI-FHIR-R4-Server.
// Aufgabenbereich "Person 2: FHIR-Client & Ressourcen-Mapping".
//
// Konfiguration kommt aus src/config/env.js (FHIR_BASE_URL, HTTP_REQUEST_TIMEOUT_MS),
// nicht direkt aus process.env. Standardmäßig zeigt der Client auf den lokalen
// HAPI-FHIR-Server, der über docker-compose.fhir.yml gestartet wird (siehe README).
// Er läuft dann unter http://localhost:8080/fhir und speichert nur im Arbeitsspeicher
// (H2) - alle Daten sind bei jedem Neustart des Containers wieder weg.
//
// Die Netzwerkschicht ist über createFhirClient({ fetchImpl, baseUrl, requestTimeoutMs })
// injizierbar (z.B. für Unit-Tests mit einem Fake-fetch, siehe test/fhir-client.unit.test.js).
// Für den normalen Gebrauch reicht der unten exportierte Default-Client mit denselben
// Funktionsnamen wie bisher (findPatient, getPatient, ...) - bestehende Aufrufer
// (discharge-flow-demo.js, patient-lifecycle-demo.js) funktionieren unverändert weiter.
//
// MVP-Entscheidungen (bitte im Team gegenchecken, bevor ihr das final so lasst):
// - Composition: nur Pflichtfelder + Sections als Freitext (kein Codesystem für
//   Sections, keine strukturierten Beobachtungen).
// - DocumentReference: ein Attachment mit Base64-Inhalt (Text oder PDF-Base64 möglich),
//   kein Multi-Format-Support.
// - AuditEvent/Provenance: minimaler Pflichtfeld-Satz. "who"/"agent" ist standardmäßig
//   ein Platzhalter ("Device/medinfo-system"), solange es keine echte
//   Practitioner-Anmeldung im System gibt - bei Bedarf agentReference übergeben.
//   Der lokale FHIR-Server prüft Referenzen beim Schreiben deshalb bewusst nicht auf
//   Existenz (siehe docker-compose.fhir.yml, enforce_referential_integrity_on_write).
// - Es gibt bewusst keine createEncounter-Funktion: laut Aufgabenliste wird ein
//   Encounter nur "geholt und abgeschlossen", nicht angelegt.
// - Patient: createPatient/updatePatient/getPatient/findPatient arbeiten mit dem
//   internen Patient-Modell (familyName, givenName, birthDate, id) statt rohen
//   FHIR-Resources, siehe toFhirPatient/fromFhirPatient. Composition/DocumentReference/
//   AuditEvent/Provenance bleiben bewusst bei ihren bisherigen build*Resource-Parametern,
//   die schon "intern genug" waren (keine rohen FHIR-Resources als Eingabe).

import { config } from './config/env.js'
import { AppError } from './errors/app-error.js'

const FHIR_BASE_URL = config.fhirBaseUrl

function mapFhirStatusToErrorCode(status) {
  const knownCodes = {
    400: 'FHIR_BAD_REQUEST',
    401: 'FHIR_UNAUTHORIZED',
    403: 'FHIR_FORBIDDEN',
    404: 'FHIR_NOT_FOUND',
    409: 'FHIR_CONFLICT',
    412: 'FHIR_PRECONDITION_FAILED',
    422: 'FHIR_UNPROCESSABLE_ENTITY'
  }

  if (knownCodes[status]) {
    return knownCodes[status]
  }

  if (status >= 500) {
    return 'FHIR_SERVER_ERROR'
  }

  return 'FHIR_REQUEST_FAILED'
}

// Extrahiert nur die technischen issue-Felder aus einem FHIR OperationOutcome.
// Gibt bewusst NICHT die komplette Serverantwort weiter, da diese je nach Endpunkt
// theoretisch Ressourcendaten (z.B. Patientendaten) enthalten könnte.
async function extractOperationOutcomeIssues(response) {
  try {
    const body = await response.json()

    if (body?.resourceType === 'OperationOutcome' && Array.isArray(body.issue)) {
      return body.issue.map(({ severity, code }) => ({
        severity,
        code
      }))
    }
  } catch {
    // Antwort war kein (parsebares) JSON - dann eben keine Details liefern.
  }

  return undefined
}

/**
 * Baut einen FHIR-Client mit austauschbarer Netzwerkschicht.
 * Nützlich für Unit-Tests (fetchImpl durch ein Fake ersetzen) oder um gegen einen
 * anderen FHIR-Server als den Standard zu sprechen.
 */
function createFhirClient({
  baseUrl = FHIR_BASE_URL,
  fetchImpl = fetch,
  requestTimeoutMs = config.http.requestTimeoutMs
} = {}) {
  /**
   * Generischer Request-Wrapper für den FHIR-Server.
   * Bricht die Anfrage nach requestTimeoutMs ab (AppError FHIR_TIMEOUT) und wirft bei
   * einer Fehlerantwort des Servers einen AppError mit stabilem FHIR_*-Code statt
   * eines allgemeinen Error inklusive kompletter Serverantwort.
   * path === '' ruft die Basis-URL selbst auf (nötig für Transaction-Bundles).
   */
  async function fhirRequest(path, { method = 'GET', body } = {}) {
  const controller = new AbortController()

  const timeoutHandle = setTimeout(() => {
    controller.abort()
  }, requestTimeoutMs)

  try {
    const response = await fetchImpl(`${baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/fhir+json',
        Accept: 'application/fhir+json'
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    })

    if (!response.ok) {
      const issues = await extractOperationOutcomeIssues(response)

      throw new AppError(
        response.status,
        mapFhirStatusToErrorCode(response.status),
        `FHIR-Server-Anfrage fehlgeschlagen: ${method} ${path || '/'}`,
        { details: issues }
      )
    }

    if (response.status === 204) {
      return null
    }

    return await response.json()
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new AppError(
        504,
        'FHIR_TIMEOUT',
        `FHIR-Anfrage nach ${requestTimeoutMs}ms abgebrochen: ${method} ${path || '/'}`
      )
    }

    if (error instanceof AppError) {
      throw error
    }

    throw new AppError(
      502,
      'FHIR_UNAVAILABLE',
      `FHIR-Server nicht erreichbar: ${method} ${path || '/'}`,
      {
        details: {
          cause: error.message
        }
      }
    )
  } finally {
    clearTimeout(timeoutHandle)
  }
}

  // ---------- Patient ----------
  // Nimmt/liefert das interne Patient-Modell (familyName, givenName, birthDate, id),
  // nicht mehr rohe FHIR-Patient-Resources - Übersetzung über toFhirPatient/fromFhirPatient.

  async function findPatient(searchParams = {}) {
    const query = new URLSearchParams(searchParams).toString()
    const bundle = await fhirRequest(`/Patient?${query}`)

    return {
      ...bundle,
      entry: bundle.entry?.map(entry => ({
        ...entry,
        resource: fromFhirPatient(entry.resource)
      }))
    }
  }

  async function getPatient(id) {
    const fhirPatient = await fhirRequest(`/Patient/${id}`)
    return fromFhirPatient(fhirPatient)
  }

  async function createPatient(patient) {
    const created = await fhirRequest('/Patient', {
      method: 'POST',
      body: toFhirPatient(patient)
    })

    return fromFhirPatient(created)
  }

  async function updatePatient(id, patient) {
    const updated = await fhirRequest(`/Patient/${id}`, {
      method: 'PUT',
      body: toFhirPatient({ ...patient, id })
    })

    return fromFhirPatient(updated)
  }

  // ---------- Encounter ----------

  async function findEncountersForPatient(patientId) {
    return fhirRequest(`/Encounter?patient=${patientId}`)
  }

  async function getEncounter(encounterId) {
    return fhirRequest(`/Encounter/${encounterId}`)
  }

  /**
   * Setzt den Status eines Encounters auf "finished" und trägt ein Enddatum ein.
   * Holt dafür zuerst die aktuelle Ressource, damit keine Felder überschrieben werden.
   */
  async function closeEncounter(encounterId) {
    const encounter = await getEncounter(encounterId)

    const updatedEncounter = {
      ...encounter,
      status: 'finished',
      period: {
        ...encounter.period,
        end: new Date().toISOString()
      }
    }

    return fhirRequest(`/Encounter/${encounterId}`, {
      method: 'PUT',
      body: updatedEncounter
    })
  }

  // ---------- Composition (Arztbrief) ----------

  async function createDischargeComposition(params) {
    const composition = buildCompositionResource(params)
    return fhirRequest('/Composition', { method: 'POST', body: composition })
  }

  // ---------- DocumentReference ----------

  async function createDocumentReference(params) {
    const documentReference = buildDocumentReferenceResource(params)
    return fhirRequest('/DocumentReference', { method: 'POST', body: documentReference })
  }

  // ---------- AuditEvent ----------

  async function createAuditEvent(params) {
    const auditEvent = buildAuditEventResource(params)
    return fhirRequest('/AuditEvent', { method: 'POST', body: auditEvent })
  }

  // ---------- Provenance ----------

  async function createProvenance(params) {
    const provenance = buildProvenanceResource(params)
    return fhirRequest('/Provenance', { method: 'POST', body: provenance })
  }

  // ---------- Bundle-Transaction ----------

  async function sendTransactionBundle(bundle) {
    return fhirRequest('', { method: 'POST', body: bundle })
  }

  return {
    fhirRequest,
    findPatient,
    getPatient,
    createPatient,
    updatePatient,
    findEncountersForPatient,
    getEncounter,
    closeEncounter,
    createDischargeComposition,
    createDocumentReference,
    createAuditEvent,
    createProvenance,
    sendTransactionBundle
  }
}

// ---------- reine Builder-Funktionen (kein Netzwerk, keine Injection nötig) ----------

function toBase64(text) {
  return Buffer.from(text, 'utf-8').toString('base64')
}

/**
 * Übersetzt das interne Patient-Modell (familyName, givenName, birthDate, id,
 * optional identifier: { system, value }) in eine FHIR-Patient-Resource. id ist
 * optional - wird beim Anlegen weggelassen (der Server vergibt sie), beim
 * Aktualisieren mitgegeben. identifier wird nur gesetzt, wenn system UND value
 * vorhanden sind - er dient dazu, einen Patienten später über findPatient()
 * anhand einer externen ID (z.B. der internen MongoDB-patientId) wiederzufinden,
 * statt bei jedem Aufruf einen Duplikat-Patienten anzulegen.
 */
function toFhirPatient({ id, identifier, familyName, givenName, birthDate } = {}) {
  return {
    resourceType: 'Patient',
    ...(id ? { id } : {}),
    ...(identifier?.system && identifier?.value
      ? { identifier: [{ system: identifier.system, value: identifier.value }] }
      : {}),
    name: [
      {
        family: familyName,
        ...(givenName?.length ? { given: givenName } : {})
      }
    ],
    ...(birthDate ? { birthDate } : {})
  }
}

/**
 * Übersetzt eine FHIR-Patient-Resource zurück ins interne Modell. id ist hier die
 * FHIR-Resource-ID (Patient.id) - NICHT die interne MongoDB-patientId aus
 * patient.mapper.js (die steckt ggf. in identifier.value, falls beim Anlegen ein
 * identifier mitgegeben wurde). resourceType wird bewusst mitgeliefert, damit
 * aufrufender Code (z.B. beim Iterieren über ein Suchergebnis-Bundle) den Resource-
 * Typ prüfen kann, ohne auf die rohe FHIR-Resource zurückgreifen zu müssen.
 */
function fromFhirPatient(fhirPatient) {
  const primaryName = fhirPatient?.name?.[0]
  const primaryIdentifier = fhirPatient?.identifier?.[0]

  return {
    resourceType: 'Patient',
    id: fhirPatient?.id ?? null,
    identifier: primaryIdentifier
      ? { system: primaryIdentifier.system ?? null, value: primaryIdentifier.value ?? null }
      : null,
    familyName: primaryName?.family ?? null,
    givenName: primaryName?.given ?? [],
    birthDate: fhirPatient?.birthDate ?? null
  }
}

const DISCHARGE_SUMMARY_TYPE = {
  coding: [{ system: 'http://loinc.org', code: '18842-5', display: 'Discharge summary' }]
}

/**
 * Baut die JSON-Struktur für einen Arztbrief (Composition), ohne sie zu senden.
 * sections: Array aus { sectionTitle, text } (text = Klartext, wird in XHTML gewrappt)
 */
function buildCompositionResource({
  patientId,
  encounterId,
  title = 'Entlassungsbrief',
  sections = [],
  authorReference = 'Device/medinfo-system',
  date = new Date().toISOString()
} = {}) {
  return {
    resourceType: 'Composition',
    status: 'final',
    type: DISCHARGE_SUMMARY_TYPE,
    subject: { reference: `Patient/${patientId}` },
    encounter: { reference: `Encounter/${encounterId}` },
    date,
    author: [{ reference: authorReference }],
    title,
    section: sections.map(({ sectionTitle, text }) => ({
      title: sectionTitle,
      text: {
        status: 'generated',
        div: `<div xmlns="http://www.w3.org/1999/xhtml">${text}</div>`
      }
    }))
  }
}

/**
 * data: Base64-kodierter Inhalt des Dokuments (z.B. mit toBase64() erzeugt).
 * compositionId ist optional - wenn gesetzt, wird eine Referenz auf die Composition gesetzt.
 */
function buildDocumentReferenceResource({
  patientId,
  encounterId,
  compositionId,
  contentType = 'text/plain',
  data,
  title = 'Entlassungsbrief',
  date = new Date().toISOString()
} = {}) {
  const documentReference = {
    resourceType: 'DocumentReference',
    status: 'current',
    type: DISCHARGE_SUMMARY_TYPE,
    subject: { reference: `Patient/${patientId}` },
    date,
    content: [{ attachment: { contentType, data, title } }],
    context: {
      encounter: [{ reference: `Encounter/${encounterId}` }]
    }
  }

  if (compositionId) {
    documentReference.context.related = [{ reference: `Composition/${compositionId}` }]
  }

  return documentReference
}

/**
 * entityReference: worauf sich das Audit-Ereignis bezieht, z.B. "Composition/123".
 * action: 'C' (Create) | 'R' (Read) | 'U' (Update) | 'D' (Delete)
 */
function buildAuditEventResource({
  entityReference,
  patientId,
  action = 'C',
  outcome = '0',
  agentReference = 'Device/medinfo-system',
  recorded = new Date().toISOString()
} = {}) {
  return {
    resourceType: 'AuditEvent',
    type: {
      system: 'http://terminology.hl7.org/CodeSystem/audit-event-type',
      code: 'rest',
      display: 'RESTful Operation'
    },
    subtype: [{ system: 'http://hl7.org/fhir/restful-interaction', code: 'create' }],
    action,
    recorded,
    outcome,
    agent: [{ who: { reference: agentReference }, requestor: true }],
    source: { observer: { display: 'MedInfo Entlassungsmanagement' } },
    entity: [
      ...(entityReference ? [{ what: { reference: entityReference } }] : []),
      ...(patientId ? [{ what: { reference: `Patient/${patientId}` } }] : [])
    ]
  }
}

function buildProvenanceResource({
  targetReference,
  agentReference = 'Device/medinfo-system',
  recorded = new Date().toISOString()
} = {}) {
  return {
    resourceType: 'Provenance',
    target: [{ reference: targetReference }],
    recorded,
    agent: [{ who: { reference: agentReference } }]
  }
}

/**
 * Baut eine FHIR-Transaction-Bundle aus mehreren Ressourcen.
 * entries: Array aus { resource, method, url, fullUrl }
 * - method: 'POST' | 'PUT' (Standard: 'POST')
 * - url: Ziel-Endpunkt für den Eintrag (Standard: resource.resourceType, z.B. "Composition")
 * - fullUrl: optionale "urn:uuid:..." falls sich Einträge im Bundle gegenseitig referenzieren
 */
function buildTransactionBundle(entries) {
  return {
    resourceType: 'Bundle',
    type: 'transaction',
    entry: entries.map(({ resource, method = 'POST', url, fullUrl }) => ({
      ...(fullUrl ? { fullUrl } : {}),
      resource,
      request: { method, url: url ?? resource.resourceType }
    }))
  }
}

// ---------- Default-Client (Rückwärtskompatibilität zu den bisherigen Imports) ----------

const defaultFhirClient = createFhirClient()

const {
  fhirRequest,
  findPatient,
  getPatient,
  createPatient,
  updatePatient,
  findEncountersForPatient,
  getEncounter,
  closeEncounter,
  createDischargeComposition,
  createDocumentReference,
  createAuditEvent,
  createProvenance,
  sendTransactionBundle
} = defaultFhirClient

export {
  FHIR_BASE_URL,
  createFhirClient,
  fhirRequest,
  toBase64,
  toFhirPatient,
  fromFhirPatient,
  findPatient,
  getPatient,
  createPatient,
  updatePatient,
  findEncountersForPatient,
  getEncounter,
  closeEncounter,
  buildCompositionResource,
  createDischargeComposition,
  buildDocumentReferenceResource,
  createDocumentReference,
  buildAuditEventResource,
  createAuditEvent,
  buildProvenanceResource,
  createProvenance,
  buildTransactionBundle,
  sendTransactionBundle
}
