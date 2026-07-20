const FHIR_BASE_URL = process.env.FHIR_BASE_URL || 'http://localhost:8080/fhir';
/**
 * Generischer Request-Wrapper für den FHIR-Server.
 * Wirft einen Fehler mit Status + Response-Body, wenn die Antwort nicht ok ist.
 * path === '' ruft die Basis-URL selbst auf (nötig für Transaction-Bundles).
 */
async function fhirRequest(path, { method = 'GET', body } = {}) {
  const response = await fetch(`${FHIR_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/fhir+json',
      Accept: 'application/fhir+json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(`FHIR request failed: ${method} ${path || '/'} -> ${response.status} ${details}`);
  }

  if (response.status === 204) return null;

  return response.json();
}

function toBase64(text) {
  return Buffer.from(text, 'utf-8').toString('base64');
}

// ---------- Patient ----------

async function findPatient(searchParams = {}) {
  const query = new URLSearchParams(searchParams).toString();
  return fhirRequest(`/Patient?${query}`);
}

async function getPatient(patientId) {
  return fhirRequest(`/Patient/${patientId}`);
}

async function createPatient(patientResource) {
  return fhirRequest('/Patient', { method: 'POST', body: patientResource });
}

async function updatePatient(patientId, patientResource) {
  return fhirRequest(`/Patient/${patientId}`, {
    method: 'PUT',
    body: { ...patientResource, id: patientId },
  });
}

// ---------- Encounter ----------

async function findEncountersForPatient(patientId) {
  return fhirRequest(`/Encounter?patient=${patientId}`);
}

async function getEncounter(encounterId) {
  return fhirRequest(`/Encounter/${encounterId}`);
}

/**
 * Setzt den Status eines Encounters auf "finished" und trägt ein Enddatum ein.
 * Holt dafür zuerst die aktuelle Ressource, damit keine Felder überschrieben werden.
 */
async function closeEncounter(encounterId) {
  const encounter = await getEncounter(encounterId);

  const updatedEncounter = {
    ...encounter,
    status: 'finished',
    period: {
      ...encounter.period,
      end: new Date().toISOString(),
    },
  };

  return fhirRequest(`/Encounter/${encounterId}`, {
    method: 'PUT',
    body: updatedEncounter,
  });
}

// ---------- Arztbrief ----------

const DISCHARGE_SUMMARY_TYPE = {
  coding: [
    { system: 'http://loinc.org', code: '18842-5', display: 'Discharge summary' },
  ],
};

/**
 * Baut die JSON-Struktur für einen Arztbrief
 */
function buildCompositionResource({
  patientId,
  encounterId,
  title = 'Entlassungsbrief',
  sections = [],
  authorReference = 'Device/medinfo-system',
  date = new Date().toISOString(),
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
        div: `<div xmlns="http://www.w3.org/1999/xhtml">${text}</div>`,
      },
    })),
  };
}

async function createDischargeComposition(params) {
  const composition = buildCompositionResource(params);
  return fhirRequest('/Composition', { method: 'POST', body: composition });
}

// ---------- DocumentReference ----------

function buildDocumentReferenceResource({
  patientId,
  encounterId,
  compositionId,
  contentType = 'text/plain',
  data,
  title = 'Entlassungsbrief',
  date = new Date().toISOString(),
} = {}) {
  const documentReference = {
    resourceType: 'DocumentReference',
    status: 'current',
    type: DISCHARGE_SUMMARY_TYPE,
    subject: { reference: `Patient/${patientId}` },
    date,
    content: [{ attachment: { contentType, data, title } }],
    context: {
      encounter: [{ reference: `Encounter/${encounterId}` }],
    },
  };

  if (compositionId) {
    documentReference.context.related = [{ reference: `Composition/${compositionId}` }];
  }

  return documentReference;
}

async function createDocumentReference(params) {
  const documentReference = buildDocumentReferenceResource(params);
  return fhirRequest('/DocumentReference', { method: 'POST', body: documentReference });
}

// ---------- AuditEvent ----------

function buildAuditEventResource({
  entityReference,
  patientId,
  action = 'C',
  outcome = '0',
  agentReference = 'Device/medinfo-system',
  recorded = new Date().toISOString(),
} = {}) {
  return {
    resourceType: 'AuditEvent',
    type: {
      system: 'http://terminology.hl7.org/CodeSystem/audit-event-type',
      code: 'rest',
      display: 'RESTful Operation',
    },
    subtype: [{ system: 'http://hl7.org/fhir/restful-interaction', code: 'create' }],
    action,
    recorded,
    outcome,
    agent: [{ who: { reference: agentReference }, requestor: true }],
    source: { observer: { display: 'MedInfo Entlassungsmanagement' } },
    entity: [
      ...(entityReference ? [{ what: { reference: entityReference } }] : []),
      ...(patientId ? [{ what: { reference: `Patient/${patientId}` } }] : []),
    ],
  };
}

async function createAuditEvent(params) {
  const auditEvent = buildAuditEventResource(params);
  return fhirRequest('/AuditEvent', { method: 'POST', body: auditEvent });
}

// ---------- Provenance ----------

function buildProvenanceResource({
  targetReference,
  agentReference = 'Device/medinfo-system',
  recorded = new Date().toISOString(),
} = {}) {
  return {
    resourceType: 'Provenance',
    target: [{ reference: targetReference }],
    recorded,
    agent: [{ who: { reference: agentReference } }],
  };
}

async function createProvenance(params) {
  const provenance = buildProvenanceResource(params);
  return fhirRequest('/Provenance', { method: 'POST', body: provenance });
}

// ---------- Bundle-Transaction ----------

/**
 * Baut eine FHIR-Transaction-Bundle
 */
function buildTransactionBundle(entries) {
  return {
    resourceType: 'Bundle',
    type: 'transaction',
    entry: entries.map(({ resource, method = 'POST', url, fullUrl }) => ({
      ...(fullUrl ? { fullUrl } : {}),
      resource,
      request: { method, url: url ?? resource.resourceType },
    })),
  };
}

async function sendTransactionBundle(bundle) {
  return fhirRequest('', { method: 'POST', body: bundle });
}

export {
  FHIR_BASE_URL,
  fhirRequest,
  toBase64,
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
  sendTransactionBundle,
};
