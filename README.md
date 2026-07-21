# MedInfo – Entlassungsmanagement

Backend-Prototyp für das Entlassungsmanagement. Die Anwendung stellt einREST-API mit Express bereit und speichert Daten in MongoDB. Für den
Entlassungsworkflow kommuniziert sie außerdem mit einem lokalen HAPI-FHIR-R4-
Server. Der aktuelle Stand enthält System-Endpunkte, die Endpunkte zum
Anlegen, Lesen, Auflisten und Ändern von Patienten sowie den FHIR-Client
(`src/fhir-client.js`) für Patient-, Encounter-, Composition-, DocumentReference-,
AuditEvent- und Provenance-Ressourcen.

## Voraussetzungen

Installiert und startet vor der Einrichtung folgende Anwendungen:

- [Git](https://git-scm.com/) zum Klonen und Versionieren
- [Node.js](https://nodejs.org/) ab Version 20.6 inklusive npm
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) für MongoDB
  und den lokalen FHIR-Server
- eine Entwicklungsumgebung, empfohlen wird [Visual Studio Code](https://code.visualstudio.com/)

Prüft die Installation in einem Terminal:

```powershell
git --version
node --version
npm --version
docker --version
```

Docker Desktop muss vollständig gestartet sein, bevor MongoDB oder der
FHIR-Server ausgeführt werden.

## Projekt einmalig einrichten

Repository klonen und in den Projektordner wechseln:

```powershell
git clone https://github.com/IchHebDieSchere/medInfo-entlassungsmanagement.git
cd medInfo-entlassungsmanagement
```

Abhängigkeiten installieren:

```powershell
npm ci
```

Lokale Konfiguration aus den Vorlagen erzeugen:

```powershell
Copy-Item .env.example .env
Copy-Item .env.test.example .env.test
```

Unter macOS oder Linux lautet der entsprechende Befehl:

```bash
cp .env.example .env
cp .env.test.example .env.test
```

Die beiden lokalen `.env`-Dateien werden von Git ignoriert. Tragt dort keine
Zugangsdaten ein, die mit anderen geteilt oder committed werden sollen. Welche
Variablen es gibt und was sie bedeuten, steht unten unter
[Umgebungsvariablen](#umgebungsvariablen).

## Anwendung starten: zwei bis drei Terminals

Öffnet den Projektordner in VS Code und legt über **Terminal > Neues Terminal**
die benötigten Terminals an. Alle Terminals müssen sich im Projektordner
befinden.

### Terminal 1 – MongoDB

Docker Desktop starten und danach ausführen:

```powershell
npm run mongodb
```

Damit läuft MongoDB auf `mongodb://127.0.0.1:27017`. Die Daten werden lokal im
Ordner `database/` gespeichert; dieser Ordner wird nicht committed. Lasst das
Terminal während der Entwicklung geöffnet.

### Terminal 2 – API

Sobald MongoDB erreichbar ist, den Entwicklungsserver starten:

```powershell
npm run start:dev
```

Die API ist standardmäßig unter `http://localhost:3000` erreichbar. `nodemon`
startet sie automatisch neu, sobald eine Datei unter `src/` geändert wird.

Zum kurzen Funktionstest kann im Browser
<http://localhost:3000/health> geöffnet oder in einem weiteren Terminal
Folgendes ausgeführt werden:

```powershell
Invoke-RestMethod http://localhost:3000/ready
```

Wenn API und Datenbank bereit sind, lautet der Status `ready`.

### Terminal 3 – FHIR-Server (nur für FHIR-Client-Arbeit und Demo-Skripte)

Wer am FHIR-Client arbeitet oder die Demo-Skripte ausführen möchte, startet
zusätzlich einen lokalen HAPI-FHIR-R4-Server:

```powershell
npm run fhir
```

Das lädt `docker-compose.fhir.yml` und startet den Server im Hintergrund
(`-d`). Der **allererste** Start dauert oft 1–2 Minuten, weil das Image groß
ist und die JVM hochfahren muss.

```powershell
docker compose -f docker-compose.fhir.yml logs -f
```

lässt sich der Fortschritt verfolgen; wartet auf `Started Application`.
Danach ist der FHIR-Endpunkt unter `http://localhost:8080/fhir` erreichbar,
ein einfacher Health-Check ist `http://localhost:8080/fhir/metadata` im
Browser.

Die Daten liegen nur im Arbeitsspeicher des Containers (H2) und sind nach
jedem Neustart weg – das ist für lokale Entwicklung und Demos so gewollt.

Stoppen:

```powershell
npm run fhir:down
```

Beendet zuerst die API, dann MongoDB, zuletzt (falls gestartet) den
FHIR-Server, jeweils mit `Strg+C` bzw. `npm run fhir:down`.

## Tests ausführen: optionales weiteres Terminal

Die schnellen API-Tests benötigen keine laufende MongoDB und keinen laufenden
FHIR-Server:

```powershell
npm test
```

Für die Integrationstests der Patienten-API muss MongoDB aus Terminal 1
laufen:

```powershell
npm run test:integration
```

Die Integrationstests verwenden ausschließlich die separate Datenbank
`med-info-fhir-test` und leeren ihre Testdaten selbstständig.

Für den FHIR-Client und die umliegende Infrastruktur (Auth, HTTP-Server,
Rate-Limiting) gibt es ein eigenes Testset, das ohne laufenden FHIR-Server
läuft (der Client wird darin mit einem Fake-`fetch` getestet, siehe
`test/fhir-client.unit.test.js`):

```powershell
npm run fhir:test
```

## Aktuelle Endpunkte

| Methode | Pfad | Zweck |
| --- | --- | --- |
| `GET` | `/ping` | einfacher Erreichbarkeitstest |
| `GET` | `/health` | Status des laufenden Prozesses |
| `GET` | `/ready` | Bereitschaft inklusive MongoDB-Verbindung |
| `POST` | `/api/v1/patients` | Patient anlegen |
| `GET` | `/api/v1/patients` | Patienten seitenweise auflisten |
| `GET` | `/api/v1/patients/:patientId` | einzelnen Patienten lesen |
| `PATCH` | `/api/v1/patients/:patientId` | Patient teilweise ändern |

> **Hinweis:** Der FHIR-Client (`src/fhir-client.js`) sowie ein
> Entlassungsworkflow (`src/modules/discharge/`) existieren bereits im Code,
> sind aber aktuell noch nicht in `src/routes/index.js` eingebunden und daher
> über die API noch nicht erreichbar. Sobald das nachgezogen ist, ergänzen
> `POST /api/v1/discharge` und `GET /api/v1/audit/:transactionId` diese
> Tabelle.

Zum testen der Application kann Swagger verwendet werden **(! Dafür müssen MongoDB und API laufen !)**
```
http://localhost:3000/api-docs
```

Swagger ist zwar entspannter, jedoch kann ein Beispiel-Patient auch folgendermaßen in der Console erstellt werden:

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

Beim Auflisten sind die Query-Parameter `page` und `limit` verfügbar, zum
Beispiel `/api/v1/patients?page=1&limit=20`. `limit` darf höchstens 100 sein.

## Umgebungsvariablen

Alle Variablen werden zentral in `src/config/env.js` gelesen und validiert –
ungültige Werte lassen den Prozess beim Start mit einer Fehlermeldung
abbrechen, statt später unklare Laufzeitfehler zu erzeugen.

| Variable | Pflicht? | Default | Bedeutung |
| --- | --- | --- | --- |
| `NODE_ENV` | nein | `development` | `development`, `test` oder `production` |
| `PORT` | nein | `3000` | Port der Express-API (1–65535) |
| `TRUST_PROXY` | nein | `false` | `true`/`false` oder Anzahl vertrauter Proxy-Hops |
| `MONGODB_URI` | **ja, in Produktion** | `mongodb://127.0.0.1:27017/med-info-fhir` (bzw. `-test` unter `NODE_ENV=test`) | MongoDB-Verbindung |
| `FHIR_BASE_URL` | nein | `http://localhost:8080/fhir` | Basis-URL des HAPI-FHIR-Servers für `src/fhir-client.js` |
| `CORS_ORIGINS` | nein | *(leer)* | Kommagetrennte Liste erlaubter `http(s)://`-Origins |
| `RATE_LIMIT_WINDOW_MS` | nein | `60000` | Zeitfenster für das Rate-Limiting |
| `RATE_LIMIT_MAX_REQUESTS` | nein | `100` | Max. Requests pro Zeitfenster |
| `HTTP_REQUEST_TIMEOUT_MS` | nein | `30000` | Timeout für einzelne Requests (u. a. an den FHIR-Server) |
| `HTTP_HEADERS_TIMEOUT_MS` | nein | `15000` | Muss ≤ `HTTP_REQUEST_TIMEOUT_MS` sein |
| `HTTP_KEEP_ALIVE_TIMEOUT_MS` | nein | `5000` | Keep-Alive-Timeout des HTTP-Servers |
| `HTTP_SHUTDOWN_TIMEOUT_MS` | nein | `10000` | Timeout für den kontrollierten Shutdown |
| `AUTH_ENABLED` | nein | `true` in Produktion, sonst `false` | Schaltet JWT-Prüfung ein/aus |
| `JWT_PUBLIC_KEY` | **ja, wenn Auth aktiv** | – | RS256-Public-Key (PEM, `\n` als Escape in einer Zeile) |
| `JWT_ISSUER` | **ja, wenn Auth aktiv** | – | Erwarteter `iss`-Claim |
| `JWT_AUDIENCE` | **ja, wenn Auth aktiv** | – | Erwarteter `aud`-Claim |

Neue Variable in den Vorlagen ergänzen, falls noch nicht vorhanden:

```
FHIR_BASE_URL=http://localhost:8080/fhir
```

## Projektstruktur

```text
src/
├── config/                 Umgebungsvariablen und Konfiguration (env.js)
├── database/                Aufbau und Abbau der Datenbankverbindung
├── errors/                  anwendungsweite Fehlertypen (AppError)
├── middleware/               Request-ID, 404- und Fehlerbehandlung
├── modules/
│   ├── patients/            fachliches Patientenmodul
│   └── discharge/            Entlassungsworkflow (noch nicht in routes/index.js eingebunden)
├── routes/                   zentrale und technische Routen
├── fhir-client.js            Client für den HAPI-FHIR-Server (Patient, Encounter, Composition, ...)
├── app.js                    Aufbau der Express-Anwendung
└── service.js                Start und kontrolliertes Beenden des Servers
scripts/
├── discharge-flow-demo.js    Demo: kompletter Entlassungsablauf gegen den FHIR-Server
└── patient-lifecycle-demo.js Demo: Patient anlegen/lesen/ändern gegen den FHIR-Server
test/
├── helpers/                  gemeinsame Test-Hilfen
├── integration/               Tests mit echter MongoDB
├── fhir-client.unit.test.js   Unit-Tests für den FHIR-Client (Fake-fetch, kein echter Server nötig)
└── app.test.js                schnelle API-Tests ohne Datenbank
docker-compose.fhir.yml        lokaler HAPI-FHIR-R4-Server für Entwicklung/Demos
```

Ein Fachmodul liegt unter `src/modules/<fachbereich>/` und trennt möglichst
folgende Verantwortlichkeiten:

- `*.model.js`: MongoDB-/Mongoose-Modell
- `*.service.js`: Geschäftslogik und Validierung
- `*.controller.js`: Übersetzung zwischen HTTP und Service
- `*.routes.js`: Endpunkte des Moduls
- optional `*.mapper.js`: Form der API-Antworten

Neue Modul-Router werden zentral in `src/routes/index.js` eingebunden. Dieser
Aufbau soll es ermöglichen, dass jedes Teammitglied seinen Fachbereich in
einem eigenen Modul entwickelt. Sprecht Änderungen an den gemeinsam genutzten
Dateien wie `src/routes/index.js`, `package.json` und Datenmodellen vorher kurz
ab, um Merge-Konflikte zu vermeiden.

## Parallel im Team entwickeln

Vor Beginn der eigenen Arbeit den aktuellen Stand holen und einen eigenen
Branch erstellen:

```powershell
git switch main
git pull
git switch -c feature/kurze-beschreibung
```

Entwickelt den eigenen Bereich möglichst vollständig in einem eigenen Ordner
unter `src/modules/` und ergänzt passende Tests. Vor dem Push sollten mindestens
die schnellen Tests erfolgreich sein:

```powershell
npm test
git status
git add <geänderte-dateien>
git commit -m "feat: kurze Beschreibung"
git push -u origin feature/kurze-beschreibung
```

Erstellt anschließend auf GitHub einen Pull Request und lasst die Änderung von
mindestens einem anderen Teammitglied prüfen. Lokale Dateien wie `.env`,
`database/` und `node_modules/` gehören nicht in einen Commit.

## Verfügbare npm-Befehle

| Befehl | Bedeutung |
| --- | --- |
| `npm run start:dev` | API mit automatischem Neustart entwickeln |
| `npm start` | API einmalig ohne Dateibeobachtung starten |
| `npm run mongodb` | lokale MongoDB in Docker starten |
| `npm run fhir` | lokalen HAPI-FHIR-Server in Docker starten |
| `npm run fhir:down` | lokalen HAPI-FHIR-Server wieder stoppen |
| `npm test` | schnelle Tests ohne Datenbank ausführen |
| `npm run test:integration` | Integrationstests gegen die Testdatenbank ausführen |
| `npm run fhir:test` | Unit-Tests für FHIR-Client, Auth und HTTP-Server ausführen (kein echter FHIR-Server nötig) |
| `npm run demo:discharge` | Demo-Skript: kompletter Entlassungsablauf gegen den lokalen FHIR-Server |
| `npm run demo:patient` | Demo-Skript: Patienten-Lifecycle gegen den lokalen FHIR-Server |

## Geplanter fachlicher Ablauf

1. Eine Krankenhausbehandlung wird abgeschlossen.
2. Ein Arztbrief wird ausgestellt.
3. Der Arztbrief wird validiert und persistiert.
4. Die Informationen stehen für den weiteren Entlassungsprozess bereit.

Schritte 2–4 sind als FHIR-Composition/DocumentReference im Entlassungsworkflow
(`src/modules/discharge/`, `src/fhir-client.js`) bereits umgesetzt und lassen
sich lokal über `npm run demo:discharge` gegen den FHIR-Server durchspielen;
die Anbindung an die laufende Express-API steht noch aus (siehe Hinweis unter
[Aktuelle Endpunkte](#aktuelle-endpunkte)).
