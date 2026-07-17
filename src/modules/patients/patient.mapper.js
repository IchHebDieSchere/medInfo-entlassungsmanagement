export const toPatientResponse = patient => ({
  patientId: patient.patientId,
  familyName: patient.familyName,
  givenName: patient.givenName,
  birthDate: patient.birthDate,
  createdAt: patient.createdAt,
  updatedAt: patient.updatedAt
})