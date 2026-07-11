const mongoose = require('mongoose')

const { nanoid } = require('nanoid')

const PatientSchema = new mongoose.Schema({
  patientId: {
    type: String,
    unique: true,
    index: true,
    default: nanoid
  },
  timestamp: { type: Number, default: Date.now },
  familyName: { type: String, required: true },
  givenName: [String],
  birthDate: String
})

module.exports = mongoose.model('Patient', PatientSchema)