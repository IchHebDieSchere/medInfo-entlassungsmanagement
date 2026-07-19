// src/fhir-client.js
// Wiederverwendbare Funktionen für die Kommunikation mit dem HAPI-FHIR-R4-Testserver.
// Basis-URL kann per .env überschrieben werden (z.B. FHIR_BASE_URL=https://hapi.fhir.org/baseR4)

const FHIR_BASE_URL = process.env.FHIR_BASE_URL || 'https://hapi.fhir.org/baseR4';

/**
 * Generischer Request-Wrapper für den FHIR-Server.
 * Wirft einen Fehler mit Status + Response-Body, wenn die Antwort nicht ok ist.
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
    throw new Error(`FHIR request failed: ${method} ${path} -> ${response.status} ${details}`);
  }

  if (response.status === 204) return null; // z.B. bei DELETE

  return response.json();
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

export {
  FHIR_BASE_URL,
  fhirRequest,
  findPatient,
  getPatient,
  createPatient,
  updatePatient,
  findEncountersForPatient,
  getEncounter,
  closeEncounter,
};
