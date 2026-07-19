# MedInfo – Entlassungsmanagement

Backend-Grundgerüst für das Entlassungsmanagement. Die Anwendung stellt eine
versionierte REST-API mit Express bereit, persistiert Daten in MongoDB und
dokumentiert die Schnittstelle mit OpenAPI/Swagger.

Der aktuelle Infrastrukturstand umfasst:

- ES Modules mit klarer Trennung von App-Aufbau und Prozessstart
- MongoDB-Verbindung mit Readiness-Prüfung und Graceful Shutdown
- zentrale Fehlerbehandlung, Request-IDs und strukturierte JSON-Logs
- Helmet, CORS, Rate Limiting und optionale JWT-/Scope-Prüfung
- zentrale Request-Validierung mit Zod
- Swagger UI und maschinenlesbare OpenAPI-Spezifikation
- schnelle Tests und MongoDB-Integrationstests
- ESLint, Prettier, Docker Compose und GitHub-Actions-CI

## Voraussetzungen

- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/) 22 inklusive npm
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

```powershell
git --version
node --version
npm --version
docker --version
```

## Lokale Einrichtung

```powershell
git clone https://github.com/IchHebDieSchere/medInfo-entlassungsmanagement.git
cd medInfo-entlassungsmanagement
npm ci
Copy-Item .env.example .env
Copy-Item .env.test.example .env.test
```

Unter macOS oder Linux werden die beiden Dateien mit `cp` kopiert. `.env` und
`.env.test` sind lokal und dürfen keine echten Zugangsdaten enthalten oder
committed werden.

## Lokal starten

MongoDB in Terminal 1:

```powershell
npm run mongodb
```

API in Terminal 2:

```powershell
npm run start:dev
```

Danach stehen die folgenden URLs bereit:

- API: <http://localhost:3000>
- Swagger UI: <http://localhost:3000/api-docs>
- OpenAPI JSON: <http://localhost:3000/api-docs.json>
- Readiness: <http://localhost:3000/ready>

```powershell
Invoke-RestMethod http://localhost:3000/health
Invoke-RestMethod http://localhost:3000/ready
```

`/health` prüft, ob der Prozess lebt. `/ready` liefert nur dann HTTP 200 und
`status: ready`, wenn auch MongoDB verbunden ist.

## Komplett mit Docker Compose starten

```powershell
npm run compose:up
```

Der Befehl baut das API-Image, startet MongoDB, wartet auf deren Healthcheck und
startet anschließend die API. Beenden:

```powershell
npm run compose:down
```

Die MongoDB-Daten liegen in einem benannten Docker-Volume. Mit
`docker compose down -v` wird dieses Volume bewusst mit entfernt.

## Tests und Qualitätsprüfungen

```powershell
npm test
npm run test:integration
npm run lint
npm run format:check
npm run check
```

`npm test` benötigt keine Datenbank. Für `npm run test:integration` muss eine
MongoDB auf Port 27017 erreichbar sein. Die Integrationstests verwenden nur
`med-info-fhir-test` und räumen ihre Testdaten selbst auf.

`npm run check` führt Linting, Formatprüfung und die schnellen Tests aus. Vor
jedem Push sollten zusätzlich die Integrationstests laufen.

## Aktuelle Endpunkte

| Methode | Pfad                          | Scope           | Zweck                                     |
| ------- | ----------------------------- | --------------- | ----------------------------------------- |
| `GET`   | `/ping`                       | öffentlich      | einfacher Erreichbarkeitstest             |
| `GET`   | `/health`                     | öffentlich      | Status des laufenden Prozesses            |
| `GET`   | `/ready`                      | öffentlich      | Bereitschaft inklusive MongoDB-Verbindung |
| `POST`  | `/api/v1/patients`            | `patient:write` | Patient anlegen                           |
| `GET`   | `/api/v1/patients`            | `patient:read`  | Patienten seitenweise auflisten           |
| `GET`   | `/api/v1/patients/:patientId` | `patient:read`  | einzelnen Patienten lesen                 |
| `PATCH` | `/api/v1/patients/:patientId` | `patient:write` | Patient teilweise ändern                  |

Die Scopes werden nur erzwungen, wenn `AUTH_ENABLED=true` gesetzt ist. Die
Swagger-Dokumentation zeigt sie unabhängig davon als Vertrag der Schnittstelle.

Ein Beispielpatient lässt sich über Swagger oder PowerShell anlegen:

```powershell
$body = @{
  familyName = "Mustermann"
  givenName = @("Erika")
  birthDate = "1990-01-01"
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:3000/api/v1/patients `
  -ContentType "application/json" `
  -Body $body
```

Beim Auflisten stehen `page` und `limit` zur Verfügung, beispielsweise
`/api/v1/patients?page=1&limit=20`. `limit` darf höchstens 100 sein.

## Authentifizierung

In Entwicklung und Tests ist die Authentifizierung standardmäßig deaktiviert.
In Produktion ist sie standardmäßig aktiv und benötigt:

- `JWT_PUBLIC_KEY`: öffentlicher RSA-Schlüssel des Identity Providers
- `JWT_ISSUER`: erwarteter `iss`-Claim
- `JWT_AUDIENCE`: erwarteter `aud`-Claim

Akzeptiert werden ausschließlich RS256-signierte Bearer-Tokens. Zusätzlich
müssen `sub` und `exp` vorhanden sein. Scopes können als leerzeichengetrennter
`scope`-String oder als Array in `scope` beziehungsweise `scp` geliefert werden.
In Swagger wird ein Token über **Authorize** ohne das Wort `Bearer` eingetragen.

## Konfiguration

| Variable                     | Standard lokal                            | Bedeutung                                      |
| ---------------------------- | ----------------------------------------- | ---------------------------------------------- |
| `NODE_ENV`                   | `development`                             | `development`, `test` oder `production`        |
| `PORT`                       | `3000`                                    | HTTP-Port                                      |
| `TRUST_PROXY`                | `false`                                   | Express Proxy-Vertrauen, boolesch oder Hopzahl |
| `MONGODB_URI`                | `mongodb://127.0.0.1:27017/med-info-fhir` | MongoDB-Verbindungsstring                      |
| `CORS_ORIGINS`               | leer                                      | kommaseparierte erlaubte Browser-Origins       |
| `RATE_LIMIT_WINDOW_MS`       | `60000`                                   | Zeitfenster des API-Limits                     |
| `RATE_LIMIT_MAX_REQUESTS`    | `100`                                     | Requests je Zeitfenster                        |
| `HTTP_REQUEST_TIMEOUT_MS`    | `30000`                                   | maximales Request-Zeitfenster                  |
| `HTTP_HEADERS_TIMEOUT_MS`    | `15000`                                   | maximales Header-Zeitfenster                   |
| `HTTP_KEEP_ALIVE_TIMEOUT_MS` | `5000`                                    | Keep-Alive-Zeit                                |
| `HTTP_SHUTDOWN_TIMEOUT_MS`   | `10000`                                   | Frist für Graceful Shutdown                    |
| `AUTH_ENABLED`               | `false`, in Produktion `true`             | JWT-Prüfung aktivieren                         |
| `JWT_ISSUER`                 | –                                         | erwarteter Token-Aussteller                    |
| `JWT_AUDIENCE`               | –                                         | erwartete Token-Zielgruppe                     |
| `JWT_PUBLIC_KEY`             | –                                         | öffentlicher RS256-Schlüssel                   |

## Projektstruktur

```text
.
├── .github/workflows/ci.yml     automatische Qualitäts- und Build-Prüfung
├── docs/                        technische Übergabe und Team-Verträge
├── src/
│   ├── config/                  Umgebung und OpenAPI
│   ├── database/                MongoDB-Lebenszyklus
│   ├── errors/                  anwendungsweite Fehlertypen
│   ├── http/                    HTTP-Server-Lebenszyklus
│   ├── middleware/              Security, Auth, Validierung und Logging
│   ├── modules/patients/        Referenzmodul für einen Fachbereich
│   ├── observability/           strukturierte Logs
│   ├── routes/                  zentrale und technische Routen
│   ├── app.js                   Express-Anwendung ohne Listen-Port
│   └── service.js               Prozessstart und kontrolliertes Beenden
├── test/                        schnelle und datenbankgestützte Tests
├── Dockerfile
└── compose.yaml
```

Ein Fachmodul trennt möglichst folgende Verantwortlichkeiten:

- `*.validation.js`: Request-Schemas
- `*.routes.js`: HTTP-Pfade, Scopes und OpenAPI-Kommentare
- `*.controller.js`: Übersetzung zwischen HTTP und Service
- `*.service.js`: Anwendungs-/Geschäftslogik
- `*.model.js`: Persistenzmodell
- `*.mapper.js`: stabile Form der API-Antworten

Neue Router werden zentral in `src/routes/index.js` eingebunden. Weitere
Details und die Übergabepunkte für Person 2 und 3 stehen in
[docs/technical-handoff.md](docs/technical-handoff.md).

## Zusammenarbeit

```powershell
git switch main
git pull
git switch -c feature/kurze-beschreibung
```

Vor dem Pull Request:

```powershell
npm run check
npm run test:integration
git status
```

Entwickelt neue Fachbereiche möglichst in eigenen Modulordnern. Änderungen an
`src/routes/index.js`, `src/config/swagger.config.js`, `package.json` und
gemeinsam genutzten Datenmodellen sollten klein bleiben und im Team abgestimmt
werden. Die CI wiederholt alle Prüfungen und baut zusätzlich das Docker-Image.

## npm-Befehle

| Befehl                     | Bedeutung                                 |
| -------------------------- | ----------------------------------------- |
| `npm run start:dev`        | API mit automatischem Neustart            |
| `npm start`                | API einmalig starten                      |
| `npm run mongodb`          | nur MongoDB lokal in Docker starten       |
| `npm run compose:up`       | API und MongoDB gemeinsam starten         |
| `npm run compose:down`     | Compose-Stack beenden                     |
| `npm test`                 | schnelle Tests ohne Datenbank             |
| `npm run test:integration` | Integrationstests gegen MongoDB           |
| `npm run lint`             | statische Codeprüfung                     |
| `npm run format`           | unterstützte Dateien formatieren          |
| `npm run format:check`     | Formatierung nur prüfen                   |
| `npm run check`            | Linting, Formatprüfung und schnelle Tests |

`src/fhir-client.js` ist ein bestehender experimenteller Prototyp und wird
bewusst nicht als Teil des API-Grundgerüsts ausgeführt oder gelintet. Person 2
sollte den finalen FHIR-Client in eine importierbare, nebenwirkungsfreie
Modulstruktur überführen.
