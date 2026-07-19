import { randomUUID } from 'node:crypto'
import mongoose from 'mongoose'

const patientSchema = new mongoose.Schema(
  {
    patientId: {
      type: String,
      required: true,
      unique: true,
      default: randomUUID
    },

    familyName: {
      type: String,
      required: true,
      trim: true
    },

    givenName: {
      type: [String],
      default: []
    },

    birthDate: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
)

export const Patient =
  mongoose.models.Patient || mongoose.model('Patient', patientSchema)
