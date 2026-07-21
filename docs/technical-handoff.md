# Technische Übergabe des API-Grundgerüsts

## Verantwortungsgrenzen

Person 1 stellt Infrastruktur und API-Grundgerüst bereit. Dazu gehören
Konfiguration, Server- und Datenbanklebenszyklus, Security-Middleware,
Authentifizierung, Validierung, Fehlerformat, Logging, OpenAPI, Tests, Docker
und CI.

Person 2 verantwortet den FHIR-Client und das Mapping zwischen internen Daten
und FHIR-Ressourcen. Person 3 verantwortet Entlassungsworkflow, Demo und
fachliche Dokumentation. Das Patientenmodul ist ein Referenzmodul für die
technische Struktur, kein Ersatz für deren fachliche Arbeit.

## Request-Pipeline

Requests durchlaufen in `src/app.js` diese Reihenfolge:

1. Request-ID und Request-Logging
2. CORS und JSON-Parser
3. Swagger beziehungsweise allgemeine Security-Header
4. Rate Limiting für `/api/v1`
5. JWT-Authentifizierung für `/api/v1`
6. Router mit Scope-Prüfung und Zod-Validierung
7. 404- und zentrale Fehlerbehandlung

Diese Reihenfolge sollte bei Erweiterungen erhalten bleiben. Insbesondere muss
Validierung vor Controller, Service und Datenbankzugriff stattfinden.

## Stabiler HTTP-Vertrag

Erfolgreiche Einzelantwort:

```json
{
  "data": {}
}
```

Listen ergänzen Metadaten:

```json
{
  "data": [],
  "meta": {}
}
```

Fehler verwenden immer:

```json
{
  "error": {
    "code": "STABLE_MACHINE_CODE",
    "message": "Readable message",
    "requestId": "correlation-id"
  }
}
```

Validierungsfehler dürfen zusätzlich `error.details` enthalten. Interne
Fehlerdetails und Stacktraces werden in Produktion nicht an Clients gesendet.

## Neues API-Modul ergänzen

Ein neues Modul sollte unter `src/modules/<name>/` angelegt werden:

1. Zod-Schemas in `<name>.validation.js` definieren.
2. Geschäftslogik und externe Zugriffe in `<name>.service.js` kapseln.
3. Responses über einen Mapper stabil halten.
4. Controller ausschließlich mit `req.validated` arbeiten lassen.
5. Router mit `requireScopes(...)` und `validateRequest(...)` absichern.
6. OpenAPI-Kommentare direkt an den Routen ergänzen.
7. Router einmalig in `src/routes/index.js` mounten.
8. schnelle Negativtests und mindestens einen Integrationstest ergänzen.

Asynchrone Express-5-Handler können Fehler direkt werfen. Die zentrale
Fehlerbehandlung übernimmt die Antwort; lokale `try/catch`-Blöcke sind nur
nötig, wenn ein Fehler fachlich übersetzt oder bereinigt werden muss.

## Übergabe an Person 2: FHIR

Der finale FHIR-Client sollte:

- importierbar sein und beim Import keine Requests oder Dateischreibvorgänge
  ausführen,
- Basis-URL, Timeout und gegebenenfalls Zugangsdaten aus der Konfiguration
  beziehen,
- Netzwerk- und FHIR-Fehler in stabile `AppError`-Codes übersetzen,
- interne Patientenobjekte und FHIR-Ressourcen über explizite Mapper trennen,
- in Tests mit injizierbarem `fetch` oder einem lokalen HTTP-Testserver arbeiten,
- niemals echte Patientendaten oder Zugangstoken loggen.

`src/fhir-client.js` enthält den final integrierten Client. Seine
Netzwerkschicht ist über `createFhirClient(...)` injizierbar; die schnellen
Tests verwenden deshalb keinen externen FHIR-Server. Der Entlassungsservice
nutzt den Default-Client mit der zentral validierten Konfiguration.

## Übergabe an Person 3: Entlassungsworkflow

Der Workflow sollte ein eigenes Modul erhalten und vorhandene Modul-Services
verwenden. Direkte Zugriffe auf fremde Mongoose-Modelle erzeugen enge Kopplung
und sollten vermieden werden. Für Statuswechsel empfiehlt sich:

- erlaubte Zustände und Übergänge zentral definieren,
- ungültige Übergänge mit stabilen 409-Fehlercodes ablehnen,
- fachliche Zeitpunkte serverseitig setzen,
- Demo-Daten ausschließlich in einem separaten Seed-/Demo-Skript halten,
- Ablauf und Beispielrequests in Swagger ergänzen.

## Authentifizierung und Scopes

Produktion erwartet RS256-Tokens mit passendem `iss`, `aud`, `sub` und `exp`.
Routen deklarieren ihre Berechtigung explizit. Neue Scopes sollten nach dem
Schema `<ressource>:read` oder `<ressource>:write` benannt und in OpenAPI über
`x-required-scopes` dokumentiert werden.

Für lokale Entwicklung kann `AUTH_ENABLED=false` bleiben. Diese Einstellung
darf nicht ungeprüft für eine echte Bereitstellung übernommen werden.

## Gemeinsame Definition of Done

Vor einem Merge müssen mindestens diese Befehle erfolgreich sein:

```powershell
npm run check
npm run test:integration
docker compose config --quiet
```

Zusätzlich sollte der jeweilige Endpunkt in Swagger geprüft werden. Neue
Umgebungsvariablen benötigen einen validierten Eintrag in `src/config/env.js`,
beide `.env`-Vorlagen und eine Beschreibung im README. Geheimnisse gehören
weder in Git noch in Swagger-Beispiele oder Logs.
