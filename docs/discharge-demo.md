# Demo des Entlassungsworkflows

## Ziel

Die Demo zeigt:

1. einen erfolgreichen End-to-End-Entlassungsprozess,
2. einen Validierungsfehler,
3. den lokalen Audit-Nachweis,
4. den gespeicherten Workflowstatus,
5. den abgeschlossenen FHIR-Encounter.

## Voraussetzungen

- Node.js 22
- Docker Desktop
- installierte npm-Abhängigkeiten
- vorhandene `.env`- und `.env.test`-Dateien
- freie Ports:
  - `3000` für die Express-API
  - `8080` für HAPI FHIR
  - MongoDB-Port entsprechend der Docker-Konfiguration

## 1. MongoDB starten

In einem eigenen Terminal:

```bash
npm run mongodb
```

MongoDB wird für folgende lokale Daten benötigt:

- Patienten
- Audit-Einträge
- Workflowstatus des Entlassungsvorgangs

## 2. HAPI FHIR starten

In einem zweiten Terminal:

```bash
npm run fhir
```

Nach dem Start kann die Verfügbarkeit des FHIR-Servers über folgenden Endpunkt geprüft werden:

```text
http://localhost:8080/fhir/metadata
```

Beim ersten Start kann es einige Zeit dauern, bis HAPI FHIR vollständig verfügbar ist.

Der Status der Docker-Container kann mit folgendem Befehl geprüft werden:

```bash
docker compose -f docker-compose.fhir.yml ps
```

Die laufenden Logs können mit folgendem Befehl angezeigt werden:

```bash
docker compose -f docker-compose.fhir.yml logs -f
```

Die Logansicht kann mit `Strg + C` verlassen werden. Der FHIR-Container läuft dabei weiter.

## 3. API starten

In einem dritten Terminal:

```bash
npm run start:dev
```

Swagger kann anschließend über folgende Adresse geöffnet werden:

```text
http://localhost:3000/api-docs
```

Die Bereitschaft der API kann über folgenden Endpunkt geprüft werden:

```text
http://localhost:3000/ready
```

## 4. Lokalen Patienten anlegen

In Swagger den Endpunkt verwenden:

```text
POST /api/v1/patients
```

Einen gültigen Patienten anlegen und anschließend die zurückgegebene `patientId` kopieren.

Beispiel einer Patienten-ID:

```text
78749379-515f-4c79-ac90-884979029ffa
```

Diese ID wird im nächsten Schritt benötigt.

## 5. FHIR-Testdaten erzeugen

Das Seed-Skript erzeugt:

- einen passenden FHIR-Patienten,
- einen offenen FHIR-Encounter,
- einen Beispielrequest für den Entlassungsworkflow.

Die lokale Patienten-ID muss am Ende des Befehls als Argument angegeben werden:

```bash
node --env-file=.env scripts/seed-discharge-test-data.js PATIENT-ID
```

Beispiel:

```bash
node --env-file=.env scripts/seed-discharge-test-data.js 78749379-515f-4c79-ac90-884979029ffa
```

Nach erfolgreicher Ausführung gibt das Skript unter anderem aus:

- die FHIR-Patienten-ID,
- die Encounter-ID,
- einen vorbereiteten Request für `POST /api/v1/discharge`.

Falls folgende Meldung erscheint:

```text
fetch failed
```

ist der FHIR-Server unter `http://localhost:8080/fhir` noch nicht erreichbar.

In diesem Fall zuerst prüfen:

```text
http://localhost:8080/fhir/metadata
```

## 6. Erfolgreichen Entlassungsworkflow ausführen

In Swagger den Endpunkt öffnen:

```text
POST /api/v1/discharge
```

Den vom Seed-Skript ausgegebenen Request in das Request-Body-Feld einfügen.

Beispiel:

```json
{
  "patient": {
    "patientId": "78749379-515f-4c79-ac90-884979029ffa"
  },
  "encounter": {
    "encounterId": "FHIR-ENCOUNTER-ID"
  },
  "diagnoses": [
    {
      "code": "I10",
      "display": "Essentielle Hypertonie"
    }
  ],
  "procedures": [
    {
      "code": "1-100",
      "display": "Klinische Untersuchung"
    }
  ],
  "medications": [
    {
      "name": "Ramipril",
      "dosage": "5 mg morgens"
    }
  ],
  "followUp": {
    "type": "Hausärztliche Weiterbehandlung",
    "date": "2026-07-27",
    "notes": "Blutdruckkontrolle innerhalb einer Woche"
  }
}
```

Die tatsächlich vom Seed-Skript ausgegebenen IDs müssen übernommen werden.

### Erwartete Antwort

Erwarteter HTTP-Status:

```text
201 Created
```

Die Antwort enthält unter anderem:

```json
{
  "transactionId": "TRANSACTION-ID",
  "status": "COMPLETED",
  "patientId": "LOKALE-PATIENTEN-ID",
  "encounterId": "FHIR-ENCOUNTER-ID",
  "fhir": {
    "patientId": "FHIR-PATIENTEN-ID",
    "compositionId": "FHIR-COMPOSITION-ID",
    "documentReferenceId": "FHIR-DOCUMENT-REFERENCE-ID"
  },
  "completedAt": "2026-07-21T12:00:00.000Z"
}
```

Die genaue Uhrzeit und die IDs unterscheiden sich bei jeder Ausführung.

Die zurückgegebene `transactionId` wird für die Audit-Abfrage benötigt.

## 7. Audit-Trail kontrollieren

In Swagger den Endpunkt öffnen:

```text
GET /api/v1/audit/{transactionId}
```

Die zuvor kopierte `transactionId` als Pfadparameter einsetzen.

Erwarteter HTTP-Status:

```text
200 OK
```

Bei einem erfolgreichen Ablauf werden die Audit-Einträge chronologisch zurückgegeben.

Erwartete Verarbeitungsschritte:

1. `REQUEST_RECEIVED`
2. `INPUT_VALIDATED`
3. `LOCAL_PATIENT_FOUND`
4. `FHIR_PATIENT_READY`
5. `ENCOUNTER_VALIDATED`
6. `ENCOUNTER_CLOSED`
7. `COMPOSITION_CREATED`
8. `DOCUMENT_REFERENCE_CREATED`
9. `FHIR_AUDIT_RECORDED`
10. `WORKFLOW_COMPLETED`

Die Audit-Einträge dokumentieren:

- die Transaktions-ID,
- den Patienten,
- den Encounter,
- den ausgeführten Schritt,
- den Status des Schrittes,
- eine Beschreibung,
- optionale Metadaten,
- den Erstellungszeitpunkt.

## 8. Workflowstatus in MongoDB kontrollieren

Für jeden Entlassungsvorgang wird zusätzlich ein Workflowdokument gespeichert.

Die MongoDB-Collection lautet üblicherweise:

```text
dischargeworkflows
```

Nach einem erfolgreichen Ablauf wird ungefähr folgender Zustand erwartet:

```json
{
  "transactionId": "TRANSACTION-ID",
  "patientId": "LOKALE-PATIENTEN-ID",
  "encounterId": "FHIR-ENCOUNTER-ID",
  "status": "COMPLETED",
  "fhirPatientId": "FHIR-PATIENTEN-ID",
  "compositionId": "FHIR-COMPOSITION-ID",
  "documentReferenceId": "FHIR-DOCUMENT-REFERENCE-ID",
  "completedAt": "2026-07-21T12:00:00.000Z"
}
```

Der Workflowstatus beschreibt den aktuellen Gesamtzustand des Vorgangs.

Die Collection:

```text
dischargeaudits
```

enthält dagegen die einzelnen Verarbeitungsschritte des Vorgangs.

## 9. Encounter kontrollieren

Nach erfolgreicher Entlassung kann der Encounter direkt auf dem FHIR-Server geprüft werden:

```text
http://localhost:8080/fhir/Encounter/ENCOUNTER-ID
```

`ENCOUNTER-ID` muss durch die vom Seed-Skript ausgegebene ID ersetzt werden.

Beispiel:

```text
http://localhost:8080/fhir/Encounter/123
```

Im zurückgegebenen FHIR-Encounter wird folgender Status erwartet:

```json
{
  "resourceType": "Encounter",
  "status": "finished"
}
```

Der Encounter wurde damit durch den Entlassungsworkflow erfolgreich abgeschlossen.

## 10. Validierungsfehler demonstrieren

In Swagger erneut den Endpunkt verwenden:

```text
POST /api/v1/discharge
```

Einen ungültigen Request absenden, zum Beispiel ohne Diagnosen:

```json
{
  "patient": {
    "patientId": "78749379-515f-4c79-ac90-884979029ffa"
  },
  "encounter": {
    "encounterId": "FHIR-ENCOUNTER-ID"
  },
  "diagnoses": [],
  "procedures": [],
  "medications": [],
  "followUp": {
    "type": "Hausärztliche Weiterbehandlung",
    "date": "2026-07-27"
  }
}
```

Erwarteter HTTP-Status:

```text
400 Bad Request
```

Erwarteter Fehlercode:

```text
VALIDATION_ERROR
```

Die Fehlerantwort enthält außerdem die Request-ID und Informationen zum ungültigen Feld.

Da die zentrale Request-Validierung vor dem eigentlichen Entlassungsservice ausgeführt wird, wird für einen vollständig abgelehnten Request noch kein Entlassungsworkflow gestartet.

## 11. Fachlichen Fehler demonstrieren

Für einen Fehler innerhalb des bereits gestarteten Workflows kann beispielsweise ein Encounter verwendet werden, der nicht zum angegebenen Patienten gehört.

Erwarteter HTTP-Status:

```text
409 Conflict
```

Möglicher Fehlercode:

```text
ENCOUNTER_PATIENT_MISMATCH
```

Die Fehlerantwort enthält zusätzlich:

- die `requestId`,
- die `transactionId`,
- den fehlgeschlagenen Verarbeitungsschritt.

Beispiel:

```json
{
  "error": {
    "code": "ENCOUNTER_PATIENT_MISMATCH",
    "message": "Encounter does not belong to the specified patient",
    "requestId": "REQUEST-ID",
    "details": {
      "transactionId": "TRANSACTION-ID",
      "failedStep": "FHIR_ENCOUNTER_LOOKUP"
    }
  }
}
```

Mit der zurückgegebenen `transactionId` kann anschließend der Audit-Trail des fehlgeschlagenen Vorgangs abgerufen werden:

```text
GET /api/v1/audit/{transactionId}
```

Im Audit-Trail wird dabei ein Eintrag mit folgendem Schritt erwartet:

```text
WORKFLOW_FAILED
```

Im Workflowdokument wird folgender Status erwartet:

```text
FAILED
```

Zusätzlich werden gespeichert:

- `failedAt`,
- `failedStep`,
- `failureCode`.

## 12. Automatisierte Tests ausführen

Die normalen Tests werden mit folgendem Befehl ausgeführt:

```bash
npm test
```

Die Integrationstests benötigen eine laufende Testdatenbank:

```bash
npm run test:integration
```

Alle Qualitätsprüfungen können gemeinsam ausgeführt werden:

```bash
npm run check
```

Dabei werden abhängig von der Projektkonfiguration unter anderem ausgeführt:

- ESLint,
- Prettier-Prüfung,
- automatisierte Tests.

## 13. Demo beenden

Den HAPI-FHIR-Server beenden:

```bash
npm run fhir:down
```

Die Express-API kann im zugehörigen Terminal mit folgendem Tastenkürzel beendet werden:

```text
Strg + C
```

Dasselbe gilt für einen im Vordergrund laufenden Node-Prozess.

MongoDB kann entsprechend dem dafür vorhandenen npm- oder Docker-Compose-Befehl beendet werden.

## Ergebnis

Die Demo ist erfolgreich, wenn folgende Punkte nachgewiesen wurden:

- Der lokale Patient kann angelegt werden.
- Das Seed-Skript erzeugt einen FHIR-Patienten und einen offenen Encounter.
- `POST /api/v1/discharge` liefert `201 Created`.
- Der Workflow liefert den Status `COMPLETED`.
- Der Encounter besitzt anschließend den Status `finished`.
- Composition und DocumentReference wurden erstellt.
- AuditEvent und Provenance wurden an den FHIR-Server übertragen.
- Der lokale Audit-Trail enthält alle erwarteten Schritte.
- Der Workflowstatus wurde in MongoDB gespeichert.
- Ungültige Requests liefern einen standardisierten Validierungsfehler.
- Fachliche Workflowfehler liefern eine `transactionId`.
- Fehlgeschlagene Workflows werden als `FAILED` gespeichert.

Damit ist der Entlassungsworkflow als vollständiger End-to-End-Prozess demonstrierbar und nachvollziehbar.