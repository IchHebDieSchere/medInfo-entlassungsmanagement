import mongoose from "mongoose"

console.log("hi");

const PatientSchema = new mongoose.Schema({
    //patientID, bundleID von großer Relevanz --> Rest egal
    patientId: {type: String, required: true, unique: true, index: true},
    name: {type: String, required: true},
    familyName: {type: String, required: true},
    age: {type: String, required: true},
    birthDate: {type: String, required: true},
    bundleId: {type: String, required: true, unique: true, index: true},
    iban: {type: String, required: true},
    encounterId: {type: String, required: true, unique: true, index: true},
    contactInformation: {type: String, required: true}
})

export default mongoose.model('Patient', PatientSchema)

const Patient = mongoose.model('Patient', PatientSchema)

const main = async() => {
    const db = await mongoose.connect('mongodb://127.0.0.1:27017/test')
    console.log('Connected')

    const silence = new Patient ({
        patientId: '001',
        familyName: 'Heide',
        givenName: 'Mannfred',
        birthDate: '16-03-2008'

    })

    const manny = new Patient ({
        patientId: '002',
        familyName: 'Mann',
        givenName: 'Manny',
        birthDate: '16-03-1979'

    })

    const nil = new Patient ({
        patientId: '003',
        familyName: 'Apfel',
        givenName: 'Nil',
        birthDate: '16-03-1999'

    })

    await silence.save();
    await manny.save();
    await nil.save();

    console.log("Patient created!")
}

try{
    main()
} catch {
    console.log('Minsconfigured...')
}