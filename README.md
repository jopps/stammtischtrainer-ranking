# Stammtischtrainer Ranking

Tier-Ranking-Tool für den Podcast *Die Stammtischtrainer*.

**Live:** https://claude.ai/code/artifact/8d3a549d-6cd4-48d9-98ca-2fe089457438

## Wie es funktioniert

- **Positionen:** Torwart, Aussenverteidiger, Innenverteidiger, Defensives Mittelfeld,
  Offensives Mittelfeld, Flügelspieler, Stürmer.
- **Tiers:** Auslands ready · Super-League King · Potenzialspieler — innerhalb jedes Tiers
  gilt die Reihenfolge als Rangliste.
- Adi und Fabio ranken pro Position unabhängig. Das **Konsens-Ranking** erscheint, sobald
  beide abgegeben haben; die einzelnen Rankings sind jederzeit über die Tabs einsehbar.
- Jedes Ranking lässt sich jederzeit löschen.
- **Historisierung:** Rankings sind nach Saison und Zeitpunkt abgelegt (nach Transferfenster,
  nach der Hinrunde, Saisonende). Umschalter oben rechts, Verwaltung unter *Rankings*.

## Aufstellung und Präsentationsmodus

Die Übersicht zeigt oben eine **Aufstellung** auf sieben Positionen — Torwart hinten,
Sturm vorne, dazwischen die beiden Aussenbahnen. Jede Karte nennt gross den
Erstplatzierten im Konsens und darunter klein, wen Adi und Fabio je zuoberst haben.
Stimmen sie mit dem Konsens überein, ist ihr Kürzel grün.

Der **Präsentationsmodus** (Knopf neben der Aufstellung) blendet die App aus und zeigt
einen Spieler nach dem anderen — gedacht fürs Aufnehmen:

- von hinten nach vorne: Torwart zuerst, Stürmer zuletzt
- innerhalb einer Position von Potenzialspieler hinauf zu Auslands ready
- innerhalb eines Tiers vom letzten Platz zum ersten, damit sich der Spitzenplatz aufbaut
- eingeblendet werden Tier, Position im Tier („2 von 4"), Rang, Veränderung zum
  vorherigen Ranking, Bild, Klub und Alter

Steuerung mit Pfeiltasten oder Leertaste, Esc schliesst. Die nächsten drei Bilder werden
vorgeladen, damit beim Weiterklicken kein leerer Kasten aufblitzt. Positionen ohne
vollständigen Konsens werden übersprungen.

## Darstellung der Ranglisten

Die Listen in der Ranking- und Konsensansicht sind der Story-Grafik der Sendung
nachgebaut: Rangkachel links (Platz 1 navy, dazwischen zwei Goldtöne im Wechsel, letzter
Platz rot), **darunter die Veränderung** (`+2` grün, `−1` rot, `NEU` navy, `=` grau), daneben
das Spielerbild, dann der Name in Schablonenschrift, darunter Wappen, ausgeschriebener Klub
und Alter.

Diese Ansicht verwendet **feste Farben statt der Themen-Tokens** — Creme und Navy, in hell
wie dunkel gleich. Das ist Absicht: Was hier steht, geht so in die Sendung, und die
Bildsprache soll nicht mit dem Systemthema kippen. Der Editor bleibt davon unberührt und
folgt weiterhin dem App-Thema, damit sich beim Arbeiten nichts aufdrängt.

Schrift: *Big Shoulders Stencil Display* von Google Fonts, mit Barlow Condensed als
Rückfallebene, falls sie nicht lädt.

## Rankings und Veränderung

Jedes Ranking ist ein eigener, vollständiger Stand. Beim Anlegen lassen sich die Eingaben
des vorherigen Rankings als Startpunkt übernehmen — dann wird nur noch angepasst, statt
alles neu aufzubauen.

Die Veränderung wird immer gegen das **direkt vorangehende** Ranking gerechnet (Saison
aufsteigend, darin Transferfenster → Hinrunde → Saisonende). Verglichen wird der Gesamtrang
über alle drei Tiers hinweg, damit auch ein Tier-Wechsel als Veränderung sichtbar wird:

| Anzeige | Bedeutung |
|---|---|
| `▲3` | drei Plätze gutgemacht |
| `▼2` | zwei Plätze verloren |
| `–` | unverändert |
| `NEU` | in diesem Ranking erstmals dabei |

Wer vorher dabei war und jetzt fehlt, steht durchgestrichen unter *Nicht mehr im Ranking*.
Adi, Fabio und der Konsens haben jeweils eigene Veränderungswerte. Das erste Ranking einer
Kette zeigt keine, weil es nichts zu vergleichen gibt.

## Positionen im Spielerpool zuordnen

Weil die Liga nur vier grobe Positionen liefert, geschieht die Feinzuordnung im Tool statt in
der CSV:

- **Filtern** nach Suchbegriff, nach *Neu* / *Ohne Position* / *Nicht mehr dabei* oder per
  Klick auf eine Position rechts.
- **Markieren**: Klick wählt einen, Shift-Klick einen Bereich, Cmd/Ctrl-Klick einzelne dazu.
  *Alle sichtbaren markieren* nimmt den ganzen Filter.
- **Zuordnen**: Auswahl auf ein Positions-Feld rechts ziehen oder die Schnellbuttons
  (`→ TW`, `→ AV`, …) benutzen. *Ersetzen* setzt die Position neu, *Ergänzen* fügt eine
  zweite hinzu (für Spieler, die beides spielen). Einzelne Positionen entfernt das `×` am Chip.
- Zuordnungen sammeln sich und werden mit **Zuordnung speichern** in einem Zug gesichert —
  bewusst nicht einzeln, sonst würde die Seite nach jedem Zug neu laden. Ein Entwurf überlebt
  ein versehentliches Schliessen.

## Konsens-Berechnung

Punkte pro Nennung: `Tier × 100 + (60 − Platz im Tier)`

| Tier | Platz 1 | Platz 2 | … |
|---|---|---|---|
| Auslands ready | 360 | 359 | … |
| Super-League King | 260 | 259 | … |
| Potenzialspieler | 160 | 159 | … |

Beide Wertungen werden addiert. Das Tier im Konsens ist der Durchschnitt der beiden
Tier-Einstufungen (halbe Werte runden nach oben). Nennt nur ein Host einen Spieler,
sammelt dieser auch nur einmal Punkte — Übereinstimmung wird dadurch belohnt.

## Spielerliste (CSV)

Eingelesen werden genau vier Spalten: `Name`, `Position`, `Team`, `Geburtsdatum` — mit oder
ohne Kopfzeile, Trennzeichen Komma oder Semikolon, UTF-8 oder Windows-1252. Mehrere
Positionen mit `/` trennen. Geburtsdatum als `2003-06-13` oder `13.06.2003`:

```
Name;Position;Team;Geburtsdatum
Marvin Keller;Torwart;BSC Young Boys;2002-07-03
Vincent Sierro;Defensives Mittelfeld / Offensives Mittelfeld;FC Sion;1995-06-08
```

**Das Alter wird nicht eingelesen, sondern gerechnet** — bei jedem Aufruf neu aus dem
Geburtsdatum. Die Zahl veraltet damit nicht mit der Datei. Angezeigt wird sie in der Suche,
in den Rankings, im Konsens und im Textexport. Weitere Spalten werden ignoriert.

Positionsbezeichnungen werden tolerant erkannt (`TW`, `Torhüter`, `IV`, `CB`, `ZOM`,
`Flügel`, `LW`, `Stürmer`, `9` …). Nicht erkannte Positionen werden im Spielerpool
rot markiert; solche Spieler tauchen in der Suche auf, sind aber nicht auswählbar.

Ein neuer Upload **gleicht ab**, statt zu überschreiben:

- neue Spieler kommen dazu und sind danach über den Filter *Neu* direkt sichtbar
- bekannte Spieler behalten ihre von Hand gesetzten Positionen; Klub, Alter und Geburtsdatum
  werden aktualisiert
- ein Klubwechsel bleibt derselbe Spieler (die Identität hängt am Namen, nicht am Klub) und
  wird im Abgleich-Dialog als „mit neuem Klub" ausgewiesen
- Spieler, die nicht mehr in der Datei stehen, werden als *nicht mehr im Kader* markiert und
  **nicht gelöscht** — sie bleiben in bestehenden Rankings sichtbar

`spieler-vorlage.csv` ist eine ausfüllbare Vorlage.

### Direktimport statt CSV

In der auf Vercel gehosteten Fassung gibt es im Spielerpool den Knopf **Direkt von sfl.ch
laden**. Er holt Kader und Spielerbilder in einem Zug über `/api/roster` — dieselbe
Abgleich-Logik wie beim CSV-Import, nur ohne Datei. Im Artifact fehlt diese Funktion, weil
die Seite dort keine fremden Server abfragen darf; dort bleibt der CSV-Weg.

### Spielerbilder

Die Bilder liegen bei sfl.ch auf `cdn.scoreplay.io`; gespeichert wird nur die Adresse, nicht
das Bild. **Auf Vercel werden sie geladen, im Artifact nicht** — dort sperrt die
Inhaltsrichtlinie fremde Bilder, und statt des Fotos erscheinen die Initialen. 315 der rund
360 Spieler haben ein Bild.

## Spielerliste von sfl.ch holen

```bash
node scrape-sfl.js spieler-super-league.csv
```

Holt alle Spieler der Brack Super League über die öffentliche tRPC-API, die sfl.ch selbst
verwendet (Cursor-Pagination, max. 99 pro Request, 4 Requests für ~363 Spieler). Sortiert
nach Klub → Positionsgruppe → Rückennummer. Enthält genau die vier Spalten, die das Tool
einliest.

**Positionen müssen nachbearbeitet werden.** sfl.ch kennt nur vier Positionen:

| sfl.ch | in der CSV | zu ersetzen durch |
|---|---|---|
| Goalkeeper | `Torwart` | — bereits fertig |
| Defender | `Verteidiger` | `Innenverteidiger` oder `Aussenverteidiger` |
| Midfielder | `Mittelfeldspieler` | `Defensives Mittelfeld`, `Offensives Mittelfeld` oder `Flügelspieler` |
| Attacker | `Stürmer` | `Stürmer` oder `Flügelspieler` |

Beim Import ohne Nachbearbeitung landet `Verteidiger` stillschweigend als Innenverteidiger,
`Mittelfeldspieler` bleibt ohne Position. Am schnellsten geht die Feinzuordnung im
Spielerpool des Tools per Drag & Drop — die CSV muss dafür nicht angefasst werden.

## Klublogos

```bash
node fetch-logos.js
```

Holt die Wappen der zwölf Super-League-Klubs von der offiziellen sfl.ch-API, verkleinert sie
auf 72 px und schreibt sie als Data-URIs nach `team-logos.json`. Der Inhalt dieser Datei
steckt im `<script id="sst-logos">`-Block des Tools — externe Bilder sind im Artifact durch
die CSP gesperrt, deshalb müssen sie eingebettet sein.

Die Logos sitzen auf einer hellen Kachel, weil Wappen dafür gezeichnet sind. Klubs, die nur
eine weisse Variante liefern (Lausanne-Sport), bekommen automatisch eine dunkle Kachel — das
Skript misst dafür die mittlere Helligkeit. Unbekannte Klubs zeigen ihre Initialen statt
eines Wappens.

Nach einem erneuten Lauf muss der Inhalt von `team-logos.json` wieder in den
`sst-logos`-Block der HTML-Datei kopiert werden.

## Wo die App läuft

Es gibt nur eine `index.html`. Sie erkennt beim Start selbst, wo sie läuft: erst
`claude.use("artifact")`, sonst `/api/state`, sonst schreibgeschützt. Kein Build, keine Varianten.

| | Speicher | Zweck |
|---|---|---|
| **Artifact** (claude.ai) | die Seite veröffentlicht sich selbst als neue Version | der bisherige Arbeitsweg |
| **Vercel** | gemeinsamer Redis-Store hinter `/api/state` | eigene Adresse, beide Hosts, Passwortschutz |
| **GitHub Pages** | keiner | Schaufenster, schreibgeschützt |

### Einrichtung auf Vercel

1. Repo unter [vercel.com/new](https://vercel.com/new) importieren. Framework **Other**, kein Build-Befehl.
2. Im Projekt unter **Storage** einen Redis-Store anlegen und mit dem Projekt verbinden
   (Upstash im Marketplace, Gratis-Kontingent). Vercel setzt dabei `KV_REST_API_URL` und
   `KV_REST_API_TOKEN` automatisch.
3. Unter **Settings → Environment Variables** `SST_KEY` setzen — das gemeinsame Passwort für
   Adi und Fabio. Ohne diese Variable antwortet die API bewusst mit 503, statt offen zu stehen.
4. Neu deployen. Beim ersten Aufruf fragt die Seite nach dem Passwort und merkt es sich im Browser.

Der Zustand liegt in den Redis-Schlüsseln `sst:state` und `sst:version`. Geschrieben wird per
Vergleiche-und-Setze: Wer mit einer veralteten Version speichert, bekommt 409, sieht einen Hinweis
und lädt den neuen Stand — sein Entwurf bleibt lokal erhalten. Alle 15 Sekunden fragt die Seite
nach, ob der andere Host etwas gespeichert hat, aber nur, wenn gerade nichts Offenes ungesichert ist.

### GitHub Pages

Pages hostet nur statische Dateien, ein `/api/state` gibt es dort nicht. Die Seite läuft, zeigt
aber dauerhaft „Schreibgeschützte Ansicht". Als Vorschau taugt das, zum Ranken nicht. Wer sie
doch schreibfähig will, hängt ein `<meta name="sst-api" content="https://…vercel.app">` in die
`index.html` — die API erlaubt Cross-Origin-Zugriffe und prüft ohnehin das Passwort.

## Quelle

Im Artifact speichert die Seite ihren Zustand, indem sie sich selbst als neue Version
veröffentlicht — er liegt dann als JSON im `<script id="sst-state">`-Block der publizierten
Seite. Auf Vercel liegt derselbe Zustand stattdessen im Redis-Store.

Änderungen an der Datei werden über einen erneuten Artifact-Publish auf **dieselbe URL**
ausgerollt. Achtung: Ein Publish von aussen überschreibt den gespeicherten Zustand mit
dem, was in der lokalen Datei steht — vor einem Update also den aktuellen Stand
übernehmen.
