# Planung des Entlassungsworkflows

## 1. Ziel

Der Entlassungsworkflow stellt einen demonstrierbaren End-to-End-Prozess
für die Entlassung eines Patienten bereit.

Der zentrale Einstiegspunkt ist:

`POST /api/v1/discharge`

Der Workflow validiert die übergebenen Daten, lädt den lokalen Patienten,
verarbeitet die zugehörigen FHIR-Ressourcen, schließt den Encounter ab,
erzeugt einen Entlassungsbrief und protokolliert jeden fachlichen Schritt
lokal in MongoDB.

## 2. Verantwortlichkeiten

### Infrastruktur und API-Grundgerüst

Das bestehende Projekt stellt folgende Komponenten bereit:

- Express-Anwendung
- MongoDB-Verbindung
- zentrale Fehlerbehandlung
- Authentifizierung und Scope-Prüfung
- zentrale Zod-Validierung
- Swagger/OpenAPI
- Patientenmodul

### FHIR-Client

Der FHIR-Client stellt wiederverwendbare Funktionen bereit für:

- Patient suchen
- Patient anlegen
- Encounter laden
- Encounter abschließen
- Composition erzeugen
- DocumentReference erzeugen
- AuditEvent erzeugen
- Provenance erzeugen
- Transaction-Bundle senden

### Entlassungsmodul

Das Entlassungsmodul koordiniert den gesamten Geschäftsablauf und
verbindet Patientenmodul, MongoDB und FHIR-Client.

## 3. Eingabedaten

Der Request enthält folgende Bereiche:

### Patient

- `patient.patientId`
- lokale Patienten-ID im UUID-Format

### Encounter

- `encounter.encounterId`
- ID des bestehenden FHIR-Encounters

### Diagnosen

Mindestens eine Diagnose ist erforderlich.

Jede Diagnose enthält:

- `code`
- `display`

### Prozeduren

Prozeduren werden als Array übergeben und dürfen leer sein.

Jede Prozedur enthält:

- `code`
- `display`

### Medikation

Medikamente werden als Array übergeben und dürfen leer sein.

Jedes Medikament enthält:

- `name`
- `dosage`

### Weiterbehandlung

Die Weiterbehandlung enthält:

- `type`
- `date`
- optional `notes`

Das Datum verwendet das Format `YYYY-MM-DD`.

## 4. Ablauf des Workflows

1. HTTP-Request empfangen
2. Berechtigung und Scope prüfen
3. Request mit Zod validieren
4. neue `transactionId` erzeugen
5. Eingang des Requests lokal protokollieren
6. lokalen Patienten aus MongoDB laden
7. FHIR-Patient anhand des lokalen Identifiers suchen
8. FHIR-Patient bei Bedarf anlegen
9. FHIR-Encounter laden
10. Encounterstatus prüfen
11. Zugehörigkeit von Encounter und Patient prüfen
12. Encounter abschließen
13. FHIR-Composition für den Entlassungsbrief erzeugen
14. FHIR-DocumentReference erzeugen
15. FHIR-AuditEvent und Provenance erzeugen
16. AuditEvent und Provenance als Transaction-Bundle senden
17. erfolgreichen Abschluss lokal protokollieren
18. HTTP-Erfolgsantwort senden

## 5. Erfolgsantwort

Bei erfolgreicher Verarbeitung antwortet der Endpunkt mit:

`201 Created`

Die Antwort enthält:

- `transactionId`
- `status`
- lokale Patienten-ID
- Encounter-ID
- FHIR-Patienten-ID
- Composition-ID
- DocumentReference-ID
- Abschlusszeitpunkt

Beispiel:

```json
{
  "data": {
    "transactionId": "7b45245c-fbfb-4dfd-97e5-5654b8672680",
    "status": "COMPLETED",
    "patientId": "a38e7f0a-69f0-4ab8-b668-e446730bc220",
    "encounterId": "456",
    "fhir": {
      "patientId": "123",
      "compositionId": "789",
      "documentReferenceId": "790"
    },
    "completedAt": "2026-07-20T14:30:00.000Z"
  }
}