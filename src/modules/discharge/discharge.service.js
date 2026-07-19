import { randomUUID } from 'node:crypto'

export const startDischarge = (requestBody) => {
    return {
        transactionId: randomUUID(),
        status: "STARTED",
        patientId: requestBody.patient.patientId
    }
}