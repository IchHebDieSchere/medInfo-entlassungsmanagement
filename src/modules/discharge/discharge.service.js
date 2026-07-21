import { randomUUID } from 'node:crypto'

import { AppError } from '../../errors/app-error.js'

import {
  buildAuditEventResource,
  buildProvenanceResource,
  buildTransactionBundle,
  closeEncounter,
  createDischargeComposition,
  createDocumentReference,
  createPatient as createFhirPatient,
  findPatient,
  getEncounter,
  sendTransactionBundle,
  toBase64
} from '../../fhir-client.js'

import { getPatientById } from '../patients/patient.service.js'

import {
  createDischargeAudit,
  listDischargeAuditsByTransactionId
} from './discharge-audit.service.js'

import {
  createDischargeWorkflow,
  transitionDischargeWorkflow
} from './discharge-workflow.service.js'

import { DISCHARGE_STATUS } from './discharge-workflow.js'

const FHIR_PATIENT_IDENTIFIER_SYSTEM = 'urn:medinfo:patient-id'

const callFhir = async (
  operationName,
  operation,
  { notFoundCode, notFoundMessage } = {}
) => {
  try {
    return await operation()
  } catch (error) {
    const isNotFound =
      error.statusCode === 404 || error.code === 'FHIR_NOT_FOUND'

    if (isNotFound && notFoundCode) {
      throw new AppError(404, notFoundCode, notFoundMessage)
    }

    throw new AppError(
      502,
      'FHIR_SERVICE_ERROR',
      `FHIR operation failed: ${operationName}`
    )
  }
}

const createAuditWriter = ({ transactionId, patientId, encounterId }) => {
  return async ({ step, status = 'SUCCESS', message, metadata }) => {
    await createDischargeAudit({
      transactionId,
      patientId,
      encounterId,
      step,
      status,
      message,
      metadata
    })
  }
}

const findOrCreateFhirPatient = async localPatient => {
  const identifierSearchValue = `${FHIR_PATIENT_IDENTIFIER_SYSTEM}|${localPatient.patientId}`

  const searchBundle = await callFhir('find patient', () =>
    findPatient({
      identifier: identifierSearchValue
    })
  )

  const existingPatient = searchBundle.entry?.find(
    entry => entry.resource?.resourceType === 'Patient'
  )?.resource

  if (existingPatient) {
    return {
      patient: existingPatient,
      created: false
    }
  }

  const createdPatient = await callFhir('create patient', () =>
    createFhirPatient({
      identifier: {
        system: FHIR_PATIENT_IDENTIFIER_SYSTEM,
        value: localPatient.patientId
      },
      familyName: localPatient.familyName,
      givenName: localPatient.givenName,
      birthDate: localPatient.birthDate
    })
  )

  return {
    patient: createdPatient,
    created: true
  }
}

const patientReferenceMatches = (encounterPatientReference, fhirPatientId) => {
  if (!encounterPatientReference) {
    return false
  }

  const expectedReference = `Patient/${fhirPatientId}`

  return (
    encounterPatientReference === expectedReference ||
    encounterPatientReference.endsWith(`/${expectedReference}`)
  )
}

const escapeHtml = value => {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

const formatClinicalItems = items => {
  if (items.length === 0) {
    return 'Keine Angaben'
  }

  return items
    .map(item => {
      return `${escapeHtml(item.code)} – ${escapeHtml(item.display)}`
    })
    .join('; ')
}

const formatMedications = medications => {
  if (medications.length === 0) {
    return 'Keine Medikation angegeben'
  }

  return medications
    .map(medication => {
      return `${escapeHtml(medication.name)}: ${escapeHtml(medication.dosage)}`
    })
    .join('; ')
}

const buildCompositionSections = input => {
  return [
    {
      sectionTitle: 'Diagnosen',
      text: formatClinicalItems(input.diagnoses)
    },
    {
      sectionTitle: 'Prozeduren',
      text: formatClinicalItems(input.procedures)
    },
    {
      sectionTitle: 'Medikation',
      text: formatMedications(input.medications)
    },
    {
      sectionTitle: 'Weiterbehandlung',
      text: [
        `Art: ${escapeHtml(input.followUp.type)}`,
        `Datum: ${escapeHtml(input.followUp.date)}`,
        ...(input.followUp.notes
          ? [`Hinweise: ${escapeHtml(input.followUp.notes)}`]
          : [])
      ].join('; ')
    }
  ]
}

const buildDischargeDocumentText = input => {
  const diagnoses = input.diagnoses
    .map(item => `${item.code} - ${item.display}`)
    .join(', ')

  const procedures =
    input.procedures.length > 0
      ? input.procedures
          .map(item => `${item.code} - ${item.display}`)
          .join(', ')
      : 'Keine'

  const medications =
    input.medications.length > 0
      ? input.medications.map(item => `${item.name}: ${item.dosage}`).join(', ')
      : 'Keine'

  return [
    'Entlassungsbrief',
    '',
    `Diagnosen: ${diagnoses}`,
    `Prozeduren: ${procedures}`,
    `Medikation: ${medications}`,
    `Weiterbehandlung: ${input.followUp.type}`,
    `Termin: ${input.followUp.date}`,
    ...(input.followUp.notes ? [`Hinweise: ${input.followUp.notes}`] : [])
  ].join('\n')
}

export const startDischarge = async input => {
  const transactionId = randomUUID()
  const patientId = input.patient.patientId
  const encounterId = input.encounter.encounterId

  const writeAudit = createAuditWriter({
    transactionId,
    patientId,
    encounterId
  })

  let workflowCreated = false
  let currentStep = 'REQUEST_RECEIVED'

  try {
    await createDischargeWorkflow({
      transactionId,
      patientId,
      encounterId
    })

    workflowCreated = true

    await writeAudit({
      step: 'REQUEST_RECEIVED',
      message: 'Discharge request was received'
    })

    currentStep = 'INPUT_VALIDATED'

    await writeAudit({
      step: 'INPUT_VALIDATED',
      message: 'Discharge input was validated',
      metadata: {
        diagnosisCount: input.diagnoses.length,
        procedureCount: input.procedures.length,
        medicationCount: input.medications.length
      }
    })

    await transitionDischargeWorkflow(transactionId, DISCHARGE_STATUS.VALIDATED)

    currentStep = 'LOCAL_PATIENT_LOOKUP'

    const localPatient = await getPatientById(patientId)

    await writeAudit({
      step: 'LOCAL_PATIENT_FOUND',
      message: 'Local patient was found'
    })

    currentStep = 'FHIR_PATIENT_SYNCHRONIZATION'

    const fhirPatientResult = await findOrCreateFhirPatient(localPatient)

    const fhirPatient = fhirPatientResult.patient

    await writeAudit({
      step: 'FHIR_PATIENT_READY',
      message: fhirPatientResult.created
        ? 'FHIR patient was created'
        : 'Existing FHIR patient was found',
      metadata: {
        fhirPatientId: fhirPatient.id,
        created: fhirPatientResult.created
      }
    })

    await transitionDischargeWorkflow(
      transactionId,
      DISCHARGE_STATUS.PATIENT_SYNCHRONIZED,
      {
        fhirPatientId: fhirPatient.id
      }
    )

    currentStep = 'FHIR_ENCOUNTER_LOOKUP'

    const encounter = await callFhir(
      'get encounter',
      () => getEncounter(encounterId),
      {
        notFoundCode: 'ENCOUNTER_NOT_FOUND',
        notFoundMessage: `Encounter ${encounterId} not found`
      }
    )

    if (encounter.status === 'finished') {
      throw new AppError(
        409,
        'ENCOUNTER_ALREADY_FINISHED',
        `Encounter ${encounterId} is already finished`
      )
    }

    if (
      !patientReferenceMatches(encounter.subject?.reference, fhirPatient.id)
    ) {
      throw new AppError(
        409,
        'ENCOUNTER_PATIENT_MISMATCH',
        'Encounter does not belong to the specified patient'
      )
    }

    await writeAudit({
      step: 'ENCOUNTER_VALIDATED',
      message: 'FHIR encounter was validated',
      metadata: {
        previousStatus: encounter.status
      }
    })

    await transitionDischargeWorkflow(
      transactionId,
      DISCHARGE_STATUS.ENCOUNTER_VALIDATED
    )

    currentStep = 'ENCOUNTER_CLOSING'

    await callFhir('close encounter', () => closeEncounter(encounterId))

    await writeAudit({
      step: 'ENCOUNTER_CLOSED',
      message: 'FHIR encounter was closed'
    })

    await transitionDischargeWorkflow(
      transactionId,
      DISCHARGE_STATUS.ENCOUNTER_CLOSED
    )

    currentStep = 'COMPOSITION_CREATION'

    const composition = await callFhir('create discharge composition', () =>
      createDischargeComposition({
        patientId: fhirPatient.id,
        encounterId,
        title: 'Entlassungsbrief',
        sections: buildCompositionSections(input)
      })
    )

    await writeAudit({
      step: 'COMPOSITION_CREATED',
      message: 'FHIR Composition was created',
      metadata: {
        compositionId: composition.id
      }
    })

    await transitionDischargeWorkflow(
      transactionId,
      DISCHARGE_STATUS.COMPOSITION_CREATED,
      {
        compositionId: composition.id
      }
    )

    currentStep = 'DOCUMENT_REFERENCE_CREATION'

    const documentText = buildDischargeDocumentText(input)

    const documentReference = await callFhir('create document reference', () =>
      createDocumentReference({
        patientId: fhirPatient.id,
        encounterId,
        compositionId: composition.id,
        contentType: 'text/plain',
        data: toBase64(documentText),
        title: 'Entlassungsbrief'
      })
    )

    await writeAudit({
      step: 'DOCUMENT_REFERENCE_CREATED',
      message: 'FHIR DocumentReference was created',
      metadata: {
        documentReferenceId: documentReference.id
      }
    })

    await transitionDischargeWorkflow(
      transactionId,
      DISCHARGE_STATUS.DOCUMENT_REFERENCE_CREATED,
      {
        documentReferenceId: documentReference.id
      }
    )

    currentStep = 'FHIR_AUDIT_CREATION'

    const fhirAuditEvent = buildAuditEventResource({
      entityReference: `DocumentReference/${documentReference.id}`,
      patientId: fhirPatient.id
    })

    const provenance = buildProvenanceResource({
      targetReference: `DocumentReference/${documentReference.id}`
    })

    const auditBundle = buildTransactionBundle([
      {
        resource: fhirAuditEvent
      },
      {
        resource: provenance
      }
    ])

    await callFhir('send AuditEvent and Provenance transaction', () =>
      sendTransactionBundle(auditBundle)
    )

    await writeAudit({
      step: 'FHIR_AUDIT_RECORDED',
      message: 'FHIR AuditEvent and Provenance were recorded'
    })

    await transitionDischargeWorkflow(
      transactionId,
      DISCHARGE_STATUS.FHIR_AUDIT_RECORDED
    )

    currentStep = 'WORKFLOW_COMPLETION'

    const completedAt = new Date()

    await writeAudit({
      step: 'WORKFLOW_COMPLETED',
      message: 'Discharge workflow was completed successfully',
      metadata: {
        completedAt: completedAt.toISOString()
      }
    })

    await transitionDischargeWorkflow(
      transactionId,
      DISCHARGE_STATUS.COMPLETED,
      {
        completedAt
      }
    )

    return {
      transactionId,
      status: DISCHARGE_STATUS.COMPLETED,
      patientId,
      encounterId,
      fhir: {
        patientId: fhirPatient.id,
        compositionId: composition.id,
        documentReferenceId: documentReference.id
      },
      completedAt: completedAt.toISOString()
    }
  } catch (error) {
    const applicationError =
      error instanceof AppError
        ? error
        : new AppError(
            500,
            'DISCHARGE_WORKFLOW_FAILED',
            'Discharge workflow failed'
          )

    if (workflowCreated) {
      try {
        await transitionDischargeWorkflow(
          transactionId,
          DISCHARGE_STATUS.FAILED,
          {
            failedStep: currentStep,
            failureCode: applicationError.code
          }
        )
      } catch {
        // Der ursprüngliche Workflowfehler
        // soll nicht überschrieben werden.
      }
    }

    try {
      await writeAudit({
        step: 'WORKFLOW_FAILED',
        status: 'FAILED',
        message: 'Discharge workflow failed',
        metadata: {
          failedStep: currentStep,
          errorCode: applicationError.code
        }
      })
    } catch {
      // Der ursprüngliche Workflowfehler
      // soll nicht überschrieben werden.
    }

    applicationError.details = {
      transactionId,
      failedStep: currentStep
    }

    throw applicationError
  }
}

export const getDischargeAuditTrail = async transactionId => {
  const auditEntries = await listDischargeAuditsByTransactionId(transactionId)

  if (auditEntries.length === 0) {
    throw new AppError(
      404,
      'AUDIT_TRAIL_NOT_FOUND',
      `No audit trail found for transaction ${transactionId}`
    )
  }

  return auditEntries
}
