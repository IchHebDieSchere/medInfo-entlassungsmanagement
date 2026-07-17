# MedInfo – Entlassungsmanagement

Backend-Prototyp für das Entlassungsmanagement. Die Anwendung stellt eine
REST-API mit Express bereit und speichert Daten in MongoDB. Der aktuelle Stand
enthält System-Endpunkte sowie die ersten Endpunkte zum Anlegen, Lesen,
Auflisten und Ändern von Patienten.

## Voraussetzungen

Installiert und startet vor der Einrichtung folgende Anwendungen:

- [Git](https://git-scm.com/) zum Klonen und Versionieren
- [Node.js](https://nodejs.org/) ab Version 20.6 inklusive npm
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) für MongoDB
- eine Entwicklungsumgebung, empfohlen wird [Visual Studio Code](https://code.visualstudio.com/)

Prüft die Installation in einem Terminal:

```powershell
git --version
node --version
npm --version
docker --version
```

Docker Desktop muss vollständig gestartet sein, bevor MongoDB ausgeführt wird.

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
Zugangsdaten ein, die mit anderen geteilt oder committed werden sollen.

## Anwendung starten: zwei Terminals

Öffnet den Projektordner in VS Code und legt über **Terminal > Neues Terminal**
zwei Terminals an. Beide Terminals müssen sich im Projektordner befinden.

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

Beendet zuerst die API und anschließend MongoDB jeweils mit `Strg+C`.

## Tests ausführen: optionales drittes Terminal

Die schnellen API-Tests benötigen keine laufende MongoDB:

```powershell
npm test
```

Für die Integrationstests muss MongoDB aus Terminal 1 laufen:

```powershell
npm run test:integration
```

Die Integrationstests verwenden ausschließlich die separate Datenbank
`med-info-fhir-test` und leeren ihre Testdaten selbstständig.

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

Beispiel zum Anlegen eines Patienten in PowerShell:

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

## Projektstruktur

```text
src/
├── config/                 Umgebungsvariablen und Konfiguration
├── database/               Aufbau und Abbau der Datenbankverbindung
├── errors/                 anwendungsweite Fehlertypen
├── middleware/             Request-ID, 404- und Fehlerbehandlung
├── modules/
│   └── patients/           fachliches Patientenmodul
├── routes/                 zentrale und technische Routen
├── app.js                  Aufbau der Express-Anwendung
└── service.js              Start und kontrolliertes Beenden des Servers
test/
├── helpers/                gemeinsame Test-Hilfen
├── integration/            Tests mit echter MongoDB
└── app.test.js             schnelle API-Tests ohne Datenbank
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
| `npm test` | schnelle Tests ohne Datenbank ausführen |
| `npm run test:integration` | Integrationstests gegen die Testdatenbank ausführen |

## Geplanter fachlicher Ablauf

1. Eine Krankenhausbehandlung wird abgeschlossen.
2. Ein Arztbrief wird ausgestellt.
3. Der Arztbrief wird validiert und persistiert.
4. Die Informationen stehen für den weiteren Entlassungsprozess bereit.
