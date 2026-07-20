# Demo des Entlassungsworkflows

## Ziel

Die Demo zeigt:

1. einen erfolgreichen End-to-End-Entlassungsprozess,
2. einen Validierungsfehler,
3. den lokalen Audit-Nachweis.

## Voraussetzungen

- Node.js 22
- Docker Desktop
- installierte npm-Abhängigkeiten
- `.env` und `.env.test`

## 1. MongoDB starten

```bash
npm run mongodb
```

## 2. HAPI-FHIR starten

```bash
npm run fhir
```

Verfügbarkeit Prüfen --> http://localhost:8080/fhir/metadata

## 3. Api Starten

```bash
npm run start:dev
```

Swagger öffnen --> http://localhost:3000/api-docs

## 4. Setup
1. Patienten anlegen und Id kopieren
2. FHIR Testdaten erzeugen --> PATIENT-ID an das ende anfügen 
```bash
node --env-file=.env scripts/seed-discharge-test-data.js 
```
3. Ausgegebenen Request bei POST discharge einfügen --> Erwartet Status: 201
4. Transaction Id kopieren und bei GET audit einfügen 
5. Erwartete Ergebnisse:
    REQUEST_RECEIVED
    INPUT_VALIDATED
    LOCAL_PATIENT_FOUND
    FHIR_PATIENT_READY
    ENCOUNTER_VALIDATED
    ENCOUNTER_CLOSED
    COMPOSITION_CREATED
    DOCUMENT_REFERENCE_CREATED
    FHIR_AUDIT_RECORDED
    WORKFLOW_COMPLETED
6. Fehlerfall prüfen indem ungültiger Request in POST discharge eingereicht wird

## 5. Encounter kontrollieren
Nach erfolgreicher Entlassung --> http://localhost:8080/fhir/Encounter/ENCOUNTER-ID
Wird {"resourceType": "Encounter", "status": "finished"} erwartet.

## 6. Demo beenden
```bash
npm run fhir:down
```