import { createPatient, fhirRequest } from '../src/fhir-client.js'

const localPatientId = process.argv[2]

if (!localPatientId) {
  console.error(
    'Bitte die lokale patientId angeben:\n' +
      'node scripts/seed-discharge-test-data.js <patientId>'
  )

  process.exit(1)
}

const run = async () => {
  console.log('FHIR-Testdaten werden angelegt ...')

  const fhirPatient = await createPatient({
    resourceType: 'Patient',

    identifier: [
      {
        system: 'urn:medinfo:patient-id',
        value: localPatientId
      }
    ],

    name: [
      {
        family: 'Mustermann',
        given: ['Erika']
      }
    ],

    birthDate: '1990-01-01'
  })

  const encounter = await fhirRequest('/Encounter', {
    method: 'POST',

    body: {
      resourceType: 'Encounter',
      status: 'in-progress',

      class: {
        system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
        code: 'IMP',
        display: 'inpatient encounter'
      },

      subject: {
        reference: `Patient/${fhirPatient.id}`
      }
    }
  })

  console.log('\nTestdaten wurden erfolgreich angelegt.\n')

  console.log(`Lokale patientId: ${localPatientId}`)
  console.log(`FHIR Patient:      ${fhirPatient.id}`)
  console.log(`FHIR Encounter:    ${encounter.id}`)

  console.log('\nRequest für Swagger:\n')

  console.log(
    JSON.stringify(
      {
        patient: {
          patientId: localPatientId
        },

        encounter: {
          encounterId: encounter.id
        },

        diagnoses: [
          {
            code: 'J18.9',
            display: 'Pneumonie'
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
          notes: 'Kontrolle des Allgemeinzustands'
        }
      },
      undefined,
      2
    )
  )
}

run().catch(error => {
  console.error('Testdaten konnten nicht angelegt werden:')
  console.error(error.message)
  process.exit(1)
})
