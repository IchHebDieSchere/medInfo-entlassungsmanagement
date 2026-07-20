import mongoose from 'mongoose'

import { DISCHARGE_STATUS } from './discharge-workflow.js'

const dischargeWorkflowSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true
    },

    patientId: {
      type: String,
      required: true,
      index: true
    },

    encounterId: {
      type: String,
      required: true,
      index: true
    },

    status: {
      type: String,
      required: true,
      enum: Object.values(DISCHARGE_STATUS),
      default: DISCHARGE_STATUS.RECEIVED,
      index: true
    },

    startedAt: {
      type: Date,
      required: true,
      default: Date.now
    },

    completedAt: {
      type: Date,
      default: null
    },

    failedAt: {
      type: Date,
      default: null
    },

    failedStep: {
      type: String,
      default: null
    },

    failureCode: {
      type: String,
      default: null
    },

    fhirPatientId: {
      type: String,
      default: null
    },

    compositionId: {
      type: String,
      default: null
    },

    documentReferenceId: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
)

dischargeWorkflowSchema.index({
  patientId: 1,
  createdAt: -1
})

dischargeWorkflowSchema.index({
  encounterId: 1,
  createdAt: -1
})

export const DischargeWorkflow =
  mongoose.models.DischargeWorkflow ||
  mongoose.model('DischargeWorkflow', dischargeWorkflowSchema)
