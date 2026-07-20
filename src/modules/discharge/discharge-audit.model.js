import mongoose from 'mongoose'

const AUDIT_STEPS = [
  'REQUEST_RECEIVED',
  'INPUT_VALIDATED',
  'LOCAL_PATIENT_FOUND',
  'FHIR_PATIENT_READY',
  'ENCOUNTER_VALIDATED',
  'ENCOUNTER_CLOSED',
  'COMPOSITION_CREATED',
  'DOCUMENT_REFERENCE_CREATED',
  'FHIR_AUDIT_RECORDED',
  'WORKFLOW_COMPLETED',
  'WORKFLOW_FAILED'
]

const dischargeAuditSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: true,
      index: true
    },

    patientId: {
      type: String,
      required: true
    },

    encounterId: {
      type: String,
      required: true
    },

    step: {
      type: String,
      required: true,
      enum: AUDIT_STEPS
    },

    status: {
      type: String,
      required: true,
      enum: ['SUCCESS', 'FAILED']
    },

    message: {
      type: String,
      required: true,
      trim: true
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: undefined
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
)

dischargeAuditSchema.index({
  transactionId: 1,
  createdAt: 1
})

export const DischargeAudit =
  mongoose.models.DischargeAudit ||
  mongoose.model('DischargeAudit', dischargeAuditSchema)
