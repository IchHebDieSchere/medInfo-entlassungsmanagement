// Demonstriert den kompletten FHIR-Teil des Entlassungsprozesses aus der README:
// 0. Test-Patient + Encounter werden angelegt
// 1. Encounter wird abgeschlossen
// 2. Arztbrief wird ausgestellt
// 3. Arztbrief wird als DocumentReference "persistiert"
// 4. AuditEvent + Provenance werden als Bundle-Transaction gesendet
//
// Voraussetzung: lokaler FHIR-Server läuft --> docker compose -f docker-compose.fhir.yml up -d
// Ausführen mit --> node scripts/discharge-flow-demo.js
// Speichert alle Antworten des FHIR-Servers unter demo-output/

import fs from 'node:fs/promises';
import {
  fhirRequest,
  getPatient,
  findEncountersForPatient,
  closeEncounter,
  createDischargeComposition,
  createDocumentReference,
  buildAuditEventResource,
  buildProvenanceResource,
  buildTransactionBundle,
  sendTransactionBundle,
  toBase64,
} from '../src/fhir-client.js';

const OUTPUT_DIR = 'demo-output';

/**
 * Legt für die Demo einen frischen Test-Patienten samt offenem Encounter an.
 * Nur für diese Demo gedacht - fhir-client.js bekommt bewusst keine 
 * createEncounter-Funktion (siehe Kommentar dort), das hier ist reines Test-Setup.
 */
const seedPatientAndEncounter = async () => {
  const patient = await fhirRequest('/Patient', {
    method: 'POST',
    body: {
      resourceType: 'Patient',
      name: [{ family: 'Mustermann', given: ['Erika'] }],
      birthDate: '1990-01-01',
    },
  });

  const encounter = await fhirRequest('/Encounter', {
    method: 'POST',
    body: {
      resourceType: 'Encounter',
      status: 'in-progress',
      class: {
        system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
        code: 'IMP',
        display: 'inpatient encounter',
      },
      subject: { reference: `Patient/${patient.id}` },
    },
  });

  return { patient, encounter };
};

const saveJson = async (filename, data) => {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(`${OUTPUT_DIR}/${filename}`, JSON.stringify(data, undefined, 2));
};

const run = async () => {
  console.log('0) Test-Patient + Encounter im FHIR-Server anlegen...');
  const seed = await seedPatientAndEncounter();
  await saveJson('00-seed-patient.json', seed.patient);
  await saveJson('00-seed-encounter.json', seed.encounter);

  console.log('1) Patient laden...');
  const patient = await getPatient(seed.patient.id);
  await saveJson('01-patient.json', patient);

  console.log('2) Encounter des Patienten suchen...');
  const encounterBundle = await findEncountersForPatient(patient.id);
  await saveJson('02-encounters.json', encounterBundle);
  const encounterId = encounterBundle.entry?.[0]?.resource?.id ?? seed.encounter.id;

  console.log('3) Encounter abschließen...');
  const closedEncounter = await closeEncounter(encounterId);
  await saveJson('03-encounter-closed.json', closedEncounter);

  console.log('4) Arztbrief erzeugen...');
  const composition = await createDischargeComposition({
    patientId: patient.id,
    encounterId,
    sections: [
      { sectionTitle: 'Zusammenfassung', text: 'Patient wurde entlassen.' },
      { sectionTitle: 'Empfehlung', text: 'Wiedervorstellung bei Beschwerden, Kontrolle beim Hausarzt in 2 Wochen.' },
    ],
  });
  await saveJson('04-composition.json', composition);

  console.log('5) Arztbrief als DocumentReference speichern...');
  const documentReference = await createDocumentReference({
    patientId: patient.id,
    encounterId,
    compositionId: composition.id,
    contentType: 'text/plain',
    data: toBase64('Entlassungsbrief: Patient wurde entlassen.'),
  });
  await saveJson('05-document-reference.json', documentReference);

  console.log('6) AuditEvent + Provenance als Bundle-Transaction senden...');
  const auditEvent = buildAuditEventResource({
    entityReference: `Composition/${composition.id}`,
    patientId: patient.id,
  });
  const provenance = buildProvenanceResource({
    targetReference: `Composition/${composition.id}`,
  });
  const bundle = buildTransactionBundle([
    { resource: auditEvent },
    { resource: provenance },
  ]);
  await saveJson('06-bundle-request.json', bundle);

  const bundleResponse = await sendTransactionBundle(bundle);
  await saveJson('07-bundle-response.json', bundleResponse);

  console.log(`Fertig. Alle Antworten liegen in ./${OUTPUT_DIR}/`);
};

run().catch((error) => {
  console.error('Demo fehlgeschlagen:', error.message);
  process.exit(1);
});
