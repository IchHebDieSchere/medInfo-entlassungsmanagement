// scripts/patient-lifecycle-demo.js
// Testet die Funktionen aus fhir-client.js, die discharge-flow-demo.js NICHT abdeckt:
// - createPatient
// - findPatient
// - updatePatient
// - createAuditEvent
// - createProvenance
//
// Läuft unabhängig von discharge-flow-demo.js - legt sich seinen eigenen Test-Patienten an.
//
// Voraussetzung: lokaler FHIR-Server läuft
// (docker compose -f docker-compose.fhir.yml up -d)
//
// Ausführen mit:
// node --env-file-if-exists=.env scripts/patient-lifecycle-demo.js
//
// Speichert alle Antworten unter demo-output-patient/

import fs from 'node:fs/promises'

import {
  createAuditEvent,
  createPatient,
  createProvenance,
  findPatient,
  updatePatient
} from '../src/fhir-client.js'

const OUTPUT_DIR = 'demo-output-patient'

const saveJson = async (filename, data) => {
  await fs.mkdir(OUTPUT_DIR, { recursive: true })
  await fs.writeFile(
    `${OUTPUT_DIR}/${filename}`,
    JSON.stringify(data, undefined, 2)
  )
}

const run = async () => {
  console.log('1) createPatient...')

  const newPatient = await createPatient({
    familyName: 'Reinhold',
    givenName: ['Gordian'],
    birthDate: '2000-01-01'
  })

  await saveJson('01-created-patient.json', newPatient)

  console.log(`   Angelegt: Patient/${newPatient.id}`)

  console.log('2) findPatient...')

  const searchResult = await findPatient({
    family: 'Reinhold'
  })

  await saveJson('02-found-patients.json', searchResult)

  const wasFound = searchResult.entry?.some(
    entry => entry.resource?.id === newPatient.id
  )

  console.log(
    `   Im Suchergebnis: ${
      wasFound ? 'ja' : 'NEIN - bitte Suchparameter/Server prüfen'
    }`
  )

  console.log('3) updatePatient...')

  const updatedPatient = await updatePatient(newPatient.id, {
    ...newPatient,
    familyName: 'Reinhold',
    givenName: ['Gordian', 'Lennart']
  })

  await saveJson('03-updated-patient.json', updatedPatient)

  console.log(
    `   Neuer Vorname enthalten: ${
      updatedPatient.givenName?.includes('Lennart') ? 'ja' : 'NEIN'
    }`
  )

  console.log('4) createAuditEvent...')

  const auditEvent = await createAuditEvent({
    entityReference: `Patient/${newPatient.id}`,
    action: 'U'
  })

  await saveJson('04-audit-event.json', auditEvent)

  console.log('5) createProvenance...')

  const provenance = await createProvenance({
    targetReference: `Patient/${newPatient.id}`
  })

  await saveJson('05-provenance.json', provenance)

  console.log(`Fertig. Alle Antworten liegen in ./${OUTPUT_DIR}/`)
}

run().catch(error => {
  console.error('Test fehlgeschlagen:', error.message)
  process.exit(1)
})
