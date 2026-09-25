# assets/app/ – appack-Workspace-Dateien (Schritt A1)

Dieser Ordner enthält zwei Dateien, die der Verein 1:1 in den appack-CMS-
Workspace hochladen kann. Sie steuern die Optik der appack-Modulseiten
(Vereins-App iOS/Android + die Microwebsite-Kacheln auf der Website), ohne
dass appack/vmapit die Vorlagen selbst ändern muss.

## Was ist was

- **`styles.css`** → wird zu `workspace/styles.css` im CMS. Enthält die
  Schriften (Barlow Condensed/Inter, selbst gehostet, siehe unten), die
  Gestaltungs-Tokens aus `assets/css/tokens.css` und je einen Abschnitt pro
  appack-Vorlage (Abteilungen, Ansprechpartner/Vorstand, Sponsoren, Mitglied
  werden, Spielplan-Übersicht, Microwebsite-Kacheln).
- **`app-color.css`** → wird zu `workspace/app-color.css` im CMS. Ein
  **Vorschlag**, keine geprüfte Empfehlung: übernimmt die Live-Werte 1:1,
  bis auf `--appack-color-secondary`/`-secondary-highlighted` (Begründung
  im Dateikopf). Ob und wie stark sich das in der nativen App auswirkt, ist
  nicht belegt – vor dem Upload in der echten App gegentesten.

## Wie hochladen

appack-CMS öffnen → Workspace-Bereich des Vereins → Datei `styles.css`
ersetzen (Inhalt dieser Datei einfügen bzw. hochladen) → optional
`app-color.css` ebenso ersetzen. appack liefert beide Dateien danach unter
`https://cdn.appack.de/sportfreunde04/workspace/styles.css` bzw.
`.../app-color.css` aus – exakt die URLs, die jede appack-Modulseite ohnehin
als letzte Stylesheets lädt (siehe Kopf-Kommentar in `styles.css`).

**Test in der echten App ist zwingend nötig.** Diese Vorschau (siehe unten)
läuft offline gegen Kopien der Modulseiten; ob appacks native App-Hülle
(iOS/Android, nicht nur der Chrome-Renderer) alles identisch darstellt, wie
gut Fallback-Schriften greifen und ob die Microwebsite-Kacheln (die
`styles.css` nicht selbst laden, siehe unten) in der echten Website-Hülle
tatsächlich mitgestylt werden, ist damit nicht abschließend geprüft.

„Update anfordern" im CMS ist vermutlich **nicht** nötig: appack lädt beide
Dateien laut Vorlagen-Kopf bei jedem Seitenaufruf frisch vom Server (kein
Bundling erkennbar) – das müsste sich aber mit appack/vmapit bestätigen
lassen, bevor man sich darauf verlässt.

## Woher die Schriften kommen

`styles.css` bindet Barlow Condensed 600/700 und Inter 400–600 über
absolute Adressen von GitHub Pages ein
(`https://justolgay.github.io/speuzer-website-prototyp/assets/fonts/...`).
GitHub Pages sendet `access-control-allow-origin: *`, wodurch die Schriften
von `cdn.appack.de` aus geladen werden dürfen. Ein eigener woff2-Upload in
den appack-Workspace ist damit unnötig – aber auch unbelegt, ob appack das
dauerhaft so vorsieht; falls GitHub Pages künftig nicht mehr erreichbar
wäre, griffe automatisch der CSS-Fallback-Stack (`Arial Narrow`/`system-ui`,
siehe `:root`-Tokens in `styles.css`).

## Microwebsite-Kacheln (Service, Sportangebote, Über uns)

Diese drei Vorlagen referenzieren `workspace/styles.css` in ihrem eigenen
HTML **nicht** (geprüft an den Kopien in `tools/cache/app-optik/module/`).
Laut Spezifikation übernimmt das erst die Website-Hülle, in der sie
eingebettet werden. Die Vorschau (`npm run app-optik`) spielt die Datei für
diese drei deshalb testweise direkt ein (`page.addStyleTag`), nicht über die
echte Anfrage – das ist eine Krücke der Test-Vorschau, keine Änderung an
`styles.css` selbst. Ob die Website-Hülle `workspace/styles.css` tatsächlich
lädt, ist nicht Teil dieses Pakets und separat zu prüfen.

## Rückweg (Rollback)

Falls `styles.css` im Workspace wieder auf den ursprünglichen, praktisch
leeren Zustand zurückgesetzt werden muss: den Inhalt wörtlich durch
folgenden ersetzen (Stand appack-CMS, gesichert am 21.09.2026 in
`tools/cache/app-optik/styles-live.css`, nicht Teil dieses Commits, da
`tools/cache/` ausgeschlossen ist):

```css
/* Globale Style Angaben */
/*
body {
    background-color: green;
}
*/
```

Für `app-color.css` lauten die Live-Werte (Stand 21.09.2026,
`tools/cache/app-optik/app-color-live.css`):

```css
:root {

--appack-color-main: #191793;

--appack-color-title: #FFFFFF;

--appack-color-tint: #191793;

--appack-color-secondary: #333333;

--appack-color-secondary-highlighted: #191793;

}
```

## Vorschau selbst erzeugen

```
npm run app-optik
```

Rendert jede Kopie aus `tools/cache/app-optik/module/*.html` einmal ohne
(„vorher") und einmal mit („nachher") diesen Dateien, schreibt Screenshots
und einen Kontaktbogen nach `tools/cache/app-optik/vorschau/` (gitignored)
und druckt eine Tippziel-Messtabelle. Die Modul-Kopien enthalten private
Telefonnummern der Verantwortlichen – bleiben deshalb im ignorierten
Cache-Ordner und werden nie committet oder zitiert.

## Startseite_v3.tpl (B1)

**`Startseite_v3.tpl`** → wird als **dynamische Seite** im appack-CMS
angelegt, nicht in den Workspace hochgeladen. Sie ergibt die neue
Startseite der Vereins-App, von oben nach unten: blaue Bühne (Begrüßung,
Profil-Knopf bzw. für Gäste die Pille „Anmelden“, Claim), der Terminblock
„Termine“ (nächste drei Spiele/Veranstaltungen), Parkplatzhinweis und
zwei Knöpfe auf dem hellen Blatt, ganz unten die Sponsoren-„Bande“ auf
einem blauen Fußstreifen – ohne Foto, Kacheln und Meldungen („Aktuelles“
entfällt seit 24.09.2026 abends, die News stehen im Menüpunkt „News“).
Kopf und Menü kommen von der App-Hülle (seit 24.09.2026 auf iOS
Seitenmenü statt Tab-Leiste); die Vorlage liefert nur den Inhalt.

### Stand 25.09.2026: Terminblock unter der Bühne, Sponsoren unten

Wunsch der 1. Vorsitzenden (Reihenfolge verbindlich): Bühne › Termine
(„zumindest kleiner als vorher“) › Probetraining/Mitglied werden ›
Sponsoren „eher unten“. Umgesetzt ist Entwurf C („Info-Panel“) aus dem
Entwurfsvergleich, mit den Nachbesserungen der Jury.

- **Terminblock:** weiße Karte, die über die gerundete Oberkante des Blatts
  in die Bühne ragt; Kopf „Termine“ mit „Alle ›“, darunter bis zu drei
  kompakte Zeilen (Datumskachel, Titel höchstens zweizeilig, „Morgen ·
  09:00 Uhr“; 56–71 px je Termin statt gut 95 px bei der alten Karte „Als
  Nächstes“). Mehrere Termine am selben Tag: Kachel nur beim ersten.
  Termin von heute: Kachel blau gefüllt. Mehrtägig: „Fr bis So 04.10.“
  bzw. „Noch bis morgen“. Jede Zeile und „Alle“ öffnen den Kalender
  (`nav://sportfreunde04_Application_1780401660369`, nur das Modul, nicht
  den einzelnen Termin). Mit drei Terminen ist der Block als Ganzes höher
  als die alte Karte mit einem Termin (etwa 215–260 px); weniger Zeilen
  wären eine Zeile im Skript (`TERMINE_ANZAHL`).
- **Auswahl:** die nächsten drei Spiele und Veranstaltungen, keine
  Trainings (Kategorie oder Titelwort „Training“, „…training“ wie
  Torwarttraining; Probetraining, Schnuppertraining und Trainingslager
  bleiben stehen, Kategorie „Veranstaltung“ hat immer Vorrang), keine
  vergangenen Termine (ganztägige zählen bis Tagesende), jeder Termin nur
  einmal. Titel behutsam aufgeräumt: „ (26/27)“, „ (D-Junioren)“,
  „ (Herren)“ u. ä. am Ende weg, „ - “ als „ – “; sonst nichts geändert.
  Der Untertitel (`subTitle`) wird bewusst nicht gezeigt (keine
  Personendaten). Datum und Uhrzeit immer in Frankfurter Zeit.
- **Daten:** `POST https://api.appack.de/graphql`,
  `listUpcomingCalendarEvents(componentId: "sportfreunde04_Application_1780401660369", amount: 20)`,
  mit dem **öffentlichen Embedded-Token** als Konstante `TERMINE_TOKEN`.
  Herkunft: appack schreibt ihn beim Aufruf der öffentlichen
  Kalenderansicht `https://shorturl.appack.de/sportfreunde04_Application_1780401660369`
  selbst in die Weiterleitungsadresse (`…&jwt=eyJ…`; Scope „embedded“,
  technischer Nutzer, liefert nur öffentliche Kalender). Für alle, auch
  Gäste. CORS am 25.09.2026 geprüft: Vorabfrage und Antwort erlauben die
  Herkunft `https://appack.de` mit Kopfzeile `Authorization`.
- **Token gültig bis 21.08.2027.** Erneuern: Kurzadresse im Browser
  öffnen, aus der Adresse nach der Weiterleitung den Teil nach `jwt=`
  (bis zum nächsten `&`) bei `TERMINE_TOKEN` einsetzen, Ablaufdatum im
  Kommentar und hier nachziehen, Vorlage im CMS neu einspielen. Läuft er
  ab oder sperrt appack ihn, zeigt die Karte still nur „Alle Termine im
  Kalender ›“.
- **Robust:** Beim Laden drei ruhige Platzhalter-Zeilen in Höhe echter
  Zeilen (kein Sprung). Fehler, leere oder unpassende Liste, kein `fetch`
  oder keine Antwort nach 6 s: statt der Liste nur die Zeile „Alle Termine
  im Kalender ›“. Das Termine-Skript steht direkt im Abschnitt und wartet
  nicht auf die cdn-Skripte.
- **Sponsoren unten:** die Bande sitzt jetzt auf einem vollbreiten blauen
  Fußstreifen am Seitenende (bis in den Safe-Area-Bereich); das helle
  Blatt liegt oben auf der Bühne und unten auf dem Streifen gleich
  gerundet. Logik der Bande unverändert, einzige Änderung:
  `bandeAusblenden` setzt `inhalt--ohne-bande` statt `buehne--ohne-bande`.
  Ohne Sponsoren klappt der Streifen weg, das Blatt schließt die Seite
  unten gerade ab.
- **Bildschirm füllen** gilt weiter (Bühne wächst, nie leere helle Fläche
  unter dem letzten Element); der Zuwachs wird geteilt (zwei Teile über,
  ein Teil unter dem Satz). Grund hinter der Seite (iOS-Überziehen) ist
  Vereinsblau.
- Maße (Chrome, Mobil-Emulation): bei 393×749 endet das Blatt genau am
  Bildschirmrand, vom Fußstreifen ist nur der Anfang zu sehen; bei
  390×844 und 430×932 sind Sponsoren-Kopf und Tafeln angeschnitten zu
  sehen. Ohne Sponsoren passt die Seite bei 393×749 ohne Scrollen.
- Entwürfe, Bilder und Prüfskripte liegen in
  `tools/cache/app-optik/termine-entwurf-{A,B,C}/` und
  `tools/cache/app-optik/termine-final/` (nicht im Repo).

### Stand 24.09.2026: „Als Nächstes“ entfällt, Sponsoren-Bande

- Termin-Block „Als Nächstes“ samt Kalender-Abruf entfernt (Wunsch Olgay,
  Rückmeldung der Vorsitzenden). Der Anmelde-Einstieg für Gäste steckte
  bisher in der Termin-Karte und ist jetzt die Pille „Anmelden“ in der
  Bühne.
- Die Bande liest das Sponsoren-Worksheet `6a1ec5fcf68a05bf129cdbac`
  (`sponActive` und Häkchen `showSlider`, sortiert nach `sponSort`) –
  welche Sponsoren durchlaufen, steuert der Verein also selbst im CMS.
  Logos bevorzugt von GitHub Pages (`assets/bilder/erzeugt/<quelle>-480.jpg`,
  Zuordnung über den Namen), sonst `sponImg`. Tippen öffnet „Sponsoren &
  Partner“ (`nav://sportfreunde04_TextImage_1780401660337`). Leere Liste
  oder Fehler: Bande klappt weg. Bewegung reduzieren: wischbare Reihe.
- Gewählt im Entwurfsvergleich (A Band unter der Bühne, B eigener
  Abschnitt im Blatt, C Bande am Fuß der Bühne; Sieger C). Entwurf B
  bleibt als ruhigere Alternative in `tools/cache/app-optik/startseite-entwurf-B/`
  (nicht im Repo).

### Anlegen im CMS

1. appack-CMS → **Seiten** → **„+"** → **dynamische Seite**.
2. Name: `Startseite_v3.tpl`.
3. Datenquelle: **„Start"** (dieselbe wie bei der heutigen Startseite).
4. Quelltext von `assets/app/Startseite_v3.tpl` vollständig einfügen bzw.
   die Datei hochladen.

### Erst testen, dann umschalten

**Wichtig:** die neue Seite zunächst nur über einen **zusätzlichen
Menüpunkt/Tab** in der App verlinken, **ohne** die heutige Startseite zu
ändern. Erst wenn der Test in der echten App (iOS und Android) überzeugt,
den bisherigen Start-Tab auf `Startseite_v3.tpl` umstellen.

### Stand 21.09.2026: umgeschaltet

- `Startseite_v3.tpl` ist im CMS als dynamische Seite angelegt
  (Id `6ab10e248db70284fa1153c8`, Datenquelle „Start").
- Test über einen vorübergehenden Menüeintrag (Modul „Interner Bereich",
  Sichtbarkeit „Nach Rolle: App-Administrator") in der echten Mac-App
  bestanden; Olgay: „sieht ok aus". Der Testeintrag ist wieder
  zurückgebaut: Modul „Interner Bereich" zeigt wieder auf
  `Interner Bereich.tpl`, der Menüeintrag ist über „Aus dem Menü
  entfernen" (Zeile markieren, Knopf oben rechts) gelöscht.
- Der Start-Tab (Modul „Start", `sportfreunde04_TextImage_1780401660314`)
  zeigt seit 21.09.2026 auf `Startseite_v3.tpl`. Die App zeigt die neue
  Startseite nach einem Neustart.
- Im CMS eingespielte Nacharbeiten: Details-Knopf als `nav://`-Link
  (B1e) und `padding-bottom: 96px` gegen die schwebende Tab-Leiste (B1f).

### Rückweg (Rollback)

`Startseite_v2.tpl` bleibt unverändert im CMS bestehen – im Fehlerfall
Modulverwaltung → Modul „Start" → Seitenlink (Stift → Dateiauswahl →
`Startseite_v2.tpl` → „Datei wählen" → „Speichern"). Achtung: das ⓧ neben
dem Feld leert den Seitenlink, nicht benutzen. `Startseite_v3.tpl` selbst
muss dafür nicht gelöscht werden.

### Lokale Vorschau

```
npm run tpl-vorschau
```

Mit `TPL_VORSCHAU_WORKSHEETS=<json>` lassen sich echte Worksheet-Zeilen
(z. B. die Sponsoren für die Bande) über die Mocks legen.
`TPL_VORSCHAU_TERMINE=<json>` beantwortet die Kalenderabfrage des
Terminblocks mit einer gespeicherten Antwort (Form wie die echte),
`TPL_VORSCHAU_TERMINE=fehler` simuliert einen Ausfall (HTTP 500; die
Vorschau zählt die Browser-Meldung dazu als pageerror=1 je Seite), ohne
Variable kommt eine leere Liste.

Rendert `Startseite_v3.tpl` lokal ohne appack: ersetzt die appack-
FreeMarker-Konstrukte der Vorlage gegen Mock-Daten aus
`tools/app-optik/mock-start.json` (angemeldeter Test-Nutzer ohne echten
Namen, eine Kachel „Mitglied werden") und die drei appack-cdn-Skripte
(jQuery, `graph-api.js`, `component-news-widget.js`) durch lokale Stubs
(zwei feste Mock-Termine, zwei feste Mock-Meldungen; `App` bleibt
undefiniert, wie im Browser-Fallback). Schreibt Screenshots (390×760,
Viewport + fullPage), einen Kontaktbogen (`vergleich.png`, Vergleich mit
`docs/app-konzept/start.html`) und eine Tippziel-Messtabelle nach
`tools/cache/app-optik/tpl-vorschau/` (gitignored, nie committet).

### Offene Punkte (nur in der echten App/CMS prüfbar)

- **Terminblock in der echten App:** CORS ist am Server geprüft, der
  Abruf aus der drender-Seite im iOS-/Android-WebView noch nicht; ebenso
  `line-clamp`, `dvh` und `env(safe-area-inset-bottom)` dort. Schlägt der
  Abruf fehl, steht dauerhaft nur „Alle Termine im Kalender ›“.
- **Token-Ablauf 21.08.2027:** rechtzeitig vorher erneuern (siehe oben).
- **Webfonts vom GitHub-Pages-Host** (`justolgay.github.io`) in der
  nativen WebView: die lokale Vorschau lief offline, Barlow
  Condensed/Inter luden dort nicht – ob appacks WebView (iOS/Android)
  die absoluten Adressen zulässt und die Schriften tatsächlich lädt, ist
  ungeprüft (Fallback-Stack greift andernfalls automatisch).
- **Verhalten von `nav://…`-Links** außerhalb der App (Browser-Test): im
  echten appack-Kontext navigiert das die native App; in einem reinen
  Browser-Tab (z. B. appack-Vorschau im CMS) passiert vermutlich nichts
  Sichtbares – ungeprüft.
- **Weitere Felder in `profile_json`** (z. B. Gruppen/Kategorien des
  Nutzers): laut `API-NOTIZ.md` sind nur `id`, `firstname`, `imageId`
  belegt; ob zusätzliche Felder (etwa Team-/Gruppenzugehörigkeit)
  existieren, ist ungeprüft – die Vorlage zeigt deshalb bewusst keine
  Gruppen-Tags (anders als der Klick-Prototyp `docs/app-konzept/start.html`).

## Stufe C – Vereinsseiten (C1)

Fünf weitere appack-Vorlagen, im selben System wie `Startseite_v3.tpl`
(gleicher Kopf, gleiche Tokens/Bausteine): der appack-CMS-Verteiler
„Verein" sowie die vier Abteilungs-/Kontaktseiten dahinter. Anders als
`Startseite_v3.tpl` (Datenquelle „Start") laden diese fünf Seiten ihre
Inhalte **zur Laufzeit selbst** über die Workbook-API – dieselben
Worksheets, die heute schon die appack-Modulseiten (`Abteilungen.tpl`,
`Ansprechpartner.tpl`, `Sponsoren.tpl`) anzeigen. Eine Datenquelle, keine
Doppelpflege.

### Dateien → Module → Rückweg

| Datei | Zweck | Ersetzt im CMS (Modul) | Heutiger Seitenlink | Rückweg |
|---|---|---|---|---|
| `Verein_v3.tpl` | Verteiler „Verein" (Tab 4 der neuen App) | `sportfreunde04_TextImage_1783060935192` („Verein") | `Verein.tpl` | Seitenlink zurück auf `Verein.tpl` |
| `Mannschaften_v3.tpl` | Fußball: alle aktiven Mannschaften | `sportfreunde04_TextImage_1783343147611` („Mannschaften") | Seite „Abteilungen Fußball" (`Abteilungen.tpl`) | Seitenlink zurück auf die bisherige Fußball-Seite |
| `Karneval_v3.tpl` | Karnevalabteilung mit ihren Gruppen | `sportfreunde04_TextImage_1780401660343` („Sportangebote", wird zu „Karneval") | `Abteilungsliste.tpl` | Seitenlink zurück auf `Abteilungsliste.tpl` |
| `Vorstand_v3.tpl` | Vorstand & Ansprechpartner | `sportfreunde04_TextImage_1780401660340` („Ansprechpartner") | `Ansprechpartnerliste.tpl` | Seitenlink zurück auf `Ansprechpartnerliste.tpl` |
| `Sponsoren_v3.tpl` | Sponsoren & Partner | `sportfreunde04_TextImage_1780401660337` („Sponsoren") | `Sponsoren.tpl` | Seitenlink zurück auf `Sponsoren.tpl` |

Jede Vorlage beginnt mit `<h1 class="visually-hidden">` (Seitentitel, die
Hülle zeigt den Modultitel bereits als Kopfzeile) und sichtbaren
`<h2 class="abschnittstitel">`-Zwischenüberschriften.

### Datenquellen (Workbook-API, zur Laufzeit)

Abteilungen (Mannschaften, Karneval), wie `Abteilungen.tpl` sie lädt:

| Worksheet | Workbook-ID | Genutzt von |
|---|---|---|
| Übersicht | `6a1ec5fcf68a05bf129cdb7a` | Verein_v3 (Zählung), Mannschaften_v3, Karneval_v3 |
| Trainingszeiten | `6a1ec5fcf68a05bf129cdb7e` | Mannschaften_v3 |
| Buttons | `6a1ec5fcf68a05bf129cdb82` | Mannschaften_v3, Karneval_v3 |
| Kategorien | `6a1ec5fcf68a05bf129cdb85` | geladen, nicht für Farben verwendet (Vereinsblau-System) |
| Einstellungen | `6a1ec5fcf68a05bf129cdb89` | Mannschaften_v3 (`showContent`) |

Ansprechpartner (Vorstand), wie `Ansprechpartner.tpl`:

| Worksheet | Workbook-ID |
|---|---|
| Kontakte | `6a1ec5fcf68a05bf129cdb8b` |
| Kategorien | `6a1ec5fcf68a05bf129cdb90` |
| Einstellungen | `6a1ec5fcf68a05bf129cdb95` (nicht geladen, optional laut Spezifikation) |

Sponsoren, wie `Sponsoren.tpl`:

| Worksheet | Workbook-ID |
|---|---|
| Sponsoren | `6a1ec5fcf68a05bf129cdbac` (Filter `{ sponActive: true }`) |
| Einstellungen | `6a1ec5fcf68a05bf129cdbb0` (`setGroupByCategory`) |

Alle Felder gelten als optional (können fehlen, `null` oder `""` sein) –
die Vorlagen blenden fehlende Angaben aus, statt „undefined"/„null"
anzuzeigen. HTML-Felder (`description`, `sponBeschreibung`, `ansInfo`)
werden vor dem Einsetzen von `<script>`-Tags befreit; alle anderen Felder
laufen über `textContent`.

### Anlegen im CMS

1. appack-CMS → **Seiten** → **„+"** → **dynamische Seite**.
2. Name: z. B. `Verein_v3.tpl` (entsprechend für die anderen vier).
3. Datenquelle: **nicht nötig** – anders als bei `Startseite_v3.tpl` laden
   diese fünf Seiten alles selbst per Workbook-API.
4. Quelltext der jeweiligen Datei aus `assets/app/` vollständig einfügen
   bzw. die Datei hochladen.
5. **Erst testen, dann umschalten**: die neue Seite zunächst über einen
   zusätzlichen Menüpunkt/Tab verlinken, ohne das bestehende Modul zu
   ändern (siehe Vorgehen bei `Startseite_v3.tpl`). Erst nach bestandenem
   Test in der echten App (iOS und Android) den jeweiligen Seitenlink in
   der Modulverwaltung umstellen.

### Stand 21.09.2026: angelegt, umgeschaltet, Tab-Leiste umgebaut

Alle fünf Seiten sind im CMS als dynamische Seiten angelegt und
byteidentisch mit `assets/app/*_v3.tpl` (Stand C1c):

| Seite | CMS-Id | Datenquelle im CMS |
|---|---|---|
| `Verein_v3.tpl` | `6ab12e907c926dc3ed235ed4` | Verein |
| `Mannschaften_v3.tpl` | `6ab130532c5834b857aedb76` | Mannschaften |
| `Karneval_v3.tpl` | `6ab1309a8db70284fa135c83` | Sportangebote (heute „Karneval") |
| `Vorstand_v3.tpl` | `6ab130c82c5834b857aedbe9` | Ansprechpartner (heute „Vorstand & Kontakt") |
| `Sponsoren_v3.tpl` | `6ab130f57c926dc3ed23b683` | Sponsoren |

**Datenquelle ist doch nötig:** ohne Datenquelle meldet das CMS „nicht
vollständig konfiguriert" und `rest-api/drender/<Id>` antwortet mit
HTTP 500. Die Seiten lesen daraus nichts, die Zuordnung ist nur formal.
Öffentlich abrufbar unter `https://appack.de/rest-api/drender/<CMS-Id>`
(Prüfung mit echten Worksheet-Daten in Chrome: keine Skriptfehler, kein
horizontales Scrollen bei 390 px).

**Module umgestellt (Seitenlink):** alle fünf Module aus der Tabelle
oben zeigen seit 21.09.2026 auf die `_v3`-Seiten. Zwei Module wurden
dabei umbenannt (Modulverwaltung → Zeile bearbeiten → Titel): „Sportangebote"
→ „Karneval", „Ansprechpartner" → „Vorstand & Kontakt". Rückweg für den
Titel: derselbe Weg.

**App-Menü (Tab-Leiste) umgebaut:** Modulverwaltung → App Menü. Neu
hinzugefügt über „Modul hinzufügen" + „+": Termine (Terminmodul), News,
Verein – neue Einträge sind zunächst „Nach Rolle: App-Administrator",
also für Mitglieder unsichtbar; danach Sichtbarkeit auf „Öffentlich"
gestellt und Icons gesetzt (Zeile bearbeiten → Stift in der Icon-Spalte →
Reiter „Fontawesome - light": `calendar-alt`, `newspaper`; Verein hatte
`futbol`). Reihenfolge per Ziehen am ≡-Griff; aus dem Menü entfernt
(Zeile markieren → „Aus dem Menü entfernen", entfernt nur den Eintrag,
nicht das Modul): Karneval (ehem. Sportangebote) und Mannschaften – beide
sind über den Verteiler „Verein" erreichbar.

Menü seit 21.09.2026: **Start · Termine · News · Verein** · Mehr (Allgemeine
Infos, Medien, Profil, Impressum, Push-Versand nur für Rollen). Die App
zeigt die neue Tab-Leiste nach einem Neustart.

**Rückweg Tab-Leiste:** App Menü → „Modul hinzufügen" Sportangebote/Karneval
und Mannschaften wieder hinzufügen, Sichtbarkeit „Öffentlich", per ≡ an
Position 2 und 3 ziehen; Termine, News, Verein markieren und „Aus dem Menü
entfernen". Nichts davon löscht Inhalte.

### Umschalten je Modul / Rückweg

Modulverwaltung → jeweiliges Modul (Tabelle oben) → Seitenlink (Stift →
Dateiauswahl → `<Name>_v3.tpl` → „Datei wählen" → „Speichern"). Rückweg:
denselben Weg mit dem in der Tabelle genannten bisherigen Dateinamen als
Seitenlink. Die alten Vorlagen (`Verein.tpl`, `Abteilungen.tpl`,
`Abteilungsliste.tpl`, `Ansprechpartnerliste.tpl`, `Sponsoren.tpl`) bleiben
dafür unverändert im CMS bestehen und müssen nicht gelöscht werden.

### Stand 21.09.2026, 22:55 Uhr: C2 live

Alle drei Seiten sind im CMS angelegt, byteidentisch mit `assets/app/`
(Stand C2b/C2c) und die Module umgestellt:

| Datei | CMS-Id / Adresse | Datenquelle im CMS | Modul zeigt jetzt auf |
|---|---|---|---|
| `Geschaeftsstelle_v3.tpl` | `6ab1974d7c926dc3ed2a3021` (`appack.de/rest-api/drender/…`) | Geschäftsstelle | `Geschaeftsstelle_v3.tpl` |
| `Ueber-uns_v3.tpl` | `6ab197527c926dc3ed2a3022` | Über uns | `Ueber-uns_v3.tpl` |
| `Spielplan-App.html` | statisch an der Workspace-Wurzel, `cdn.appack.de/sportfreunde04/workspace/Spielplan-App.html` | – (HTML) | `Spielplan-App.html` |

Das Modul „Übersicht aller Spiele" (`sportfreunde04_TextImage_1783345459688`)
heißt seit 21.09.2026 **„Spielplan & Tabellen"** (Modulverwaltung → Zeile
bearbeiten → Titel). Rückweg für den Titel: derselbe Weg. Die sechs
Stufe-C-Seiten (`Startseite_v3` … `Sponsoren_v3`) wurden am selben Abend
mit dem C2-Stand neu eingespielt (u. a. Fußballschulen als eigener
Abschnitt, Verein-Verteiler mit „Spielplan & Tabellen", Gast-Fix Startseite).

## Vereinschronik (Stand 22.09.2026)

Die Chronik wird vom Verein **in Word gepflegt**
(`Chronik_FFV_Sportfreunde_04_2026.docx` im Vereinsordner, nicht im Repo).
Daraus erzeugt `node tools/chronik-bauen.mjs --quelle <datei.docx> --ziel <verzeichnis>`
alle Seiten: eine Quelle, keine Doppelpflege. Nach jeder Änderung in Word das
Werkzeug erneut laufen lassen und die geänderten Seiten einspielen.

Das Werkzeug liest die Formatvorlagen der Word-Datei und übersetzt sie in die
Bausteine des Gestaltungssystems:

| Word-Formatvorlage | Website | App |
|---|---|---|
| `Heading1` | neue Kapitelseite, `h1` | Kapitel in der Kapitelwahl, `.abschnittstitel` |
| `Eyebrow` | Kicker über dem Kapitel | entfällt (Titel reicht) |
| `Lead` | `.seitenkopf__lead` bzw. Zitat | `.kapitel-lead` bzw. `.chronik-zitat` |
| `Heading2` | `h2` | `h2.abschnittstitel`, beginnt eine neue `.karte` |
| Standard | `p.inhalt` | `p` in der `.karte` |
| `Caption` | `figcaption` der Abbildung | dito |
| `Source` | `p.chronik-quelle` mit Sprungmarke `#quelle-<n>` | `p.chronik-quelle` |
| Tabelle | `table.chronik-tabelle` | dito in `.tabelle-wrapper` |
| Bild | JPEG in der Mediathek, `figure.chronik-bild` | dito |

Quellenverweise im Fließtext (`[13]`) werden auf der Website automatisch auf
das Kapitel „Quellen und Anmerkungen" verlinkt.

**Ausgabe liegt bewusst nicht im Repo.** Die Chronik nennt Namen aus
Mannschaftsfotos, auch von damals Jugendlichen. Sie wird über appack
veröffentlicht; im Repo steht nur das Werkzeug. Deshalb verlinken
`verein.html` und `verein-ueber-uns.html` die Chronik über die absolute
Adresse `cdn.appack.de/sportfreunde04/workspace/web/chronik.html` – eine
relative Verknüpfung würde der Verweis-Gate des Builds zu Recht bemängeln,
weil die Seite im Repo nicht existiert.

**Ergebnis:** 15 Seiten für die Website (Übersicht mit Vorwort und Zeitleiste,
12 Zeitabschnitte, Mannschaften und Ehrenamt, Quellen und Anmerkungen),
`Chronik-App.html` für die App (eine Seite, Kapitelwahl über `.filterleiste`
wie die Teamwahl auf `Spielplan-App.html`, Verlauf über `#<slug>`) und neun
Bilder für die Mediathek.

### Chronik live (23.09.2026)

- **Website:** 15 Seiten im Ordner `web` (`chronik.html`, `chronik-<slug>.html`),
  verlinkt aus `verein.html` (Zeile „Vereinschronik") und `verein-ueber-uns.html`
  (Knopf „Vereinschronik lesen" und PDF).
- **App:** `Chronik-App.html` an der Workspace-Wurzel. Angezeigt über das Modul
  `sportfreunde04_TextImage_1789020275334`, bisher „Mircowebsite Über uns" mit
  Seitenlink `Liste - Microwebsite Über uns.tpl`, seit 23.09.2026 Titel
  **„Vereinschronik"** und Seitenlink `Chronik-App.html`. Neue Module lassen sich
  im CMS nicht anlegen; dieses gehörte zur alten Website und wurde seit dem
  Umschalten nicht mehr angezeigt. Verlinkt aus `Verein_v3` und `Ueber-uns_v3`
  per `nav://sportfreunde04_TextImage_1789020275334`.
- **Mediathek:** `Chronik-FFV-Sportfreunde-04-2026.pdf` (cdn …/pdf/) und
  `chronik-image2.jpg` bis `chronik-image10.jpg` (cdn …/images/). Die alte
  `Chronik Sportfreunde.pdf` bleibt als Archiv liegen, verlinkt ist sie nicht mehr.
- **Rückweg:** Modul 1789020275334 → Seitenlink `Liste - Microwebsite Über uns.tpl`,
  Titel „Mircowebsite Über uns". Wichtig bei einem Rückbau der Website auf den
  alten Stand: ohne diesen Schritt zeigt der alte Menüpunkt „Über uns" die Chronik.
- **Upload-Weg:** Die Chronik liegt nicht auf GitHub Pages, deshalb geht das
  Einspielen nicht per `fetch`. Der eingebettete Browser lässt keine lokalen
  Dateien zu; hochgeladen wurde über Chrome (Claude in Chrome, `file_upload` in
  das Upload-Feld der Mediathek bzw. in ein selbst angelegtes Dateifeld im
  Workspace, von dort in den Monaco-Editor). Aktualisierung: Word ändern,
  `tools/chronik-bauen.mjs` laufen lassen, geänderte Dateien genauso einspielen.

### Bauweise

Gemeinsame Grundlage `src/app/v3-basis.css` (Schriften, Tokens,
Grundregeln, gemeinsame Bausteine – wörtlich aus `Startseite_v3.tpl`
extrahiert) plus je Seite `src/app/<Name>_v3.html` (Body-Markup,
seitenspezifisches `<style>`, `<script>`). `tools/app-optik/tpl-bauen.mjs`
(`npm run tpl-bauen`) setzt daraus die fünf `assets/app/<Name>_v3.tpl`
zusammen (derselbe `<head>` wie `Startseite_v3.tpl`). **`Startseite_v3.tpl`
bleibt unverändert** und wird von diesem Bauskript nicht angefasst. Die
gebauten `.tpl`-Dateien werden committet – sie sind das, was ins CMS
kopiert wird, nicht die `src/app/`-Quellen. `npm run build` kopiert
`assets/` unverändert nach `docs/assets/`, die fünf `.tpl` kommen dabei
automatisch mit (wie `Startseite_v3.tpl`).

Lokale Vorschau: `npm run tpl-vorschau` (ohne Argument: alle sechs
Vorlagen; mit Argument, z. B. `Verein_v3`, nur diese eine) rendert gegen
Mock-Daten aus `tools/app-optik/mock-start.json` (nur `Startseite_v3.tpl`)
bzw. `tools/app-optik/mock-worksheets.json` (die fünf C1-Vorlagen,
Schlüssel = Workbook-ID) und stubbt die appack-cdn-Skripte (jQuery,
graph-api, News-Widget, **neu:** `appack.workbook-1.4.1.js`). Screenshots
(390×760 und 320×760, Viewport + fullPage) und ein Kontaktbogen landen in
`tools/cache/app-optik/tpl-vorschau/` (gitignored, nie committet).

### Offene Punkte (nur in der echten App/CMS prüfbar)

- **`nav://…`-Ziele** (Tabelle „Navigationsziele" in der C1-Spezifikation):
  außerhalb der App führen sie ins Leere, wie bei `Startseite_v3.tpl` – im
  echten appack-Kontext ungeprüft.
- **Bild-URLs aus den Worksheets** (`sliderImage*`, `categoryImage`,
  `ansImg`, `sponImg`): ob sie ohne Zugriffsschutz/Login von appacks
  WebView aus erreichbar sind, ist ungeprüft.
- **`<details>`/`<summary>`** (Beschreibungen, aufklappbar) in älteren
  WebViews (ältere Android-Systemwebviews): Darstellung/Bedienbarkeit
  ungeprüft, moderne iOS-/Android-WebViews unterstützen es.
- **`assets/img/`** (in der C1-Spezifikation als Bildquelle für die Mocks
  vorgesehen) existiert im Repo nicht – die Mocks in
  `tools/app-optik/mock-worksheets.json` lassen Bild-Felder deshalb leer
  (Fallback laut Spezifikation).
- **Reihenfolge/Priorität bei zwei Telefonnummern** (`firstContactPhone`
  **und** `firstContactHandy` gleichzeitig gefüllt): die Vorlagen zeigen
  dafür einen einzigen „Anrufen"-Knopf und bevorzugen die Handynummer –
  keine Vorgabe dazu in der Spezifikation, am echten Datenbestand zu
  prüfen.
- **`sponButton`/`sponButtonLink`** (Sponsoren-Worksheet): werden geladen,
  aber nicht separat dargestellt (in der C1-Spezifikation nicht als
  eigene Aktion vorgesehen, anders als `sponLink`/`sponMail`/`sponInst`/
  `sponFace`).

## Stufe C2 – Spielplan & Tabellen, Geschäftsstelle & Anfahrt, Über uns

Drei weitere Seiten, dieselbe Familie wie Stufe C: zwei dynamische
`_v3.tpl`-Vorlagen (Workbook-API zur Laufzeit, wie C1) und eine **statische**
Workspace-Seite. Grund für die Ausnahme: die FUSSBALL.DE-Widgets
(`fussballde_widget`, `https://www.fussball.de/widgets.js`) sind laut
Freigabe nur für die Domain **cdn.appack.de** eingerichtet. Eine dynamische
`.tpl`-Seite liefert appack unter `appack.de/rest-api/drender/…` aus – eine
andere Domain, auf der die Widgets vermutlich nicht laufen. Die neue Seite
„Spielplan & Tabellen" ist deshalb `assets/app/Spielplan-App.html`, wird 1:1
in den appack-Workspace hochgeladen (wie `styles.css`/`app-color.css`, siehe
oben) und landet dort unter
`https://cdn.appack.de/sportfreunde04/workspace/Spielplan-App.html`.

### Dateien → Module → Rückweg

| Datei | Zweck | Ersetzt im CMS (Modul) | Heutiger Seitenlink | Rückweg |
|---|---|---|---|---|
| `Spielplan-App.html` | Spielplan &amp; Tabellen je Mannschaft, FUSSBALL.DE-Widgets live | „Übersicht aller Spiele" (`sportfreunde04_TextImage_1783345459688`) | `Tabelle-Spielplan-Uebersicht.tpl` (bzw. je nach Verlinkung `Spiele-Alle-Mannschaften.html`/`Spielplan-D-Jugend.html`/`Tabellen-D-Jugend.html`, siehe QA-Befund unten) | Seitenlink zurück auf `Tabelle-Spielplan-Uebersicht.tpl` |
| `Geschaeftsstelle_v3.tpl` | Öffnungszeiten, Adresse/Anfahrt, Kontakt, Ansprechpartner | `sportfreunde04_TextImage_1780401660324` („Geschäftsstelle & Anfahrt") | `Geschäftsstelle.tpl` | Seitenlink zurück auf `Geschäftsstelle.tpl` |
| `Ueber-uns_v3.tpl` | Vereinsgeschichte, Zahlen, Werte, Downloads | `sportfreunde04_TextImage_1784295208452` („Über uns") | `Über uns.html` | Seitenlink zurück auf `Über uns.html` |

Wie bei Stufe C1: erst über einen zusätzlichen Menüpunkt/Tab testen, dann
den jeweiligen Seitenlink in der Modulverwaltung umstellen (siehe „Erst
testen, dann umschalten" oben). `Spielplan-App.html` zusätzlich in den
Workspace hochladen (CMS → Workspace-Bereich → Datei hinzufügen/ersetzen),
**bevor** das Modul umgestellt wird.

### Bauweise

`Geschaeftsstelle_v3.tpl` und `Ueber-uns_v3.tpl` laufen über dieselbe
`tools/app-optik/tpl-bauen.mjs`-Pipeline wie die fünf C1-Vorlagen
(`src/app/<Name>.html` → `assets/app/<Name>.tpl`, gleicher Kopf/Tokens/
Bausteine aus `v3-basis.css`). `Ueber-uns_v3.tpl` lädt zur Laufzeit keine
Worksheets (statischer Inhalt); die Zahlen „11 Mannschaften"/„5
Karnevalgruppen" ersetzt `tpl-bauen.mjs` beim Bauen selbst aus
`data/verein.json` (`anzahl_mannschaften`) und `data/karneval.json`
(Anzahl `gruppen`) – Platzhalter `__ANZAHL_MANNSCHAFTEN__`/
`__ANZAHL_KARNEVALGRUPPEN__` in `src/app/Ueber-uns_v3.html`, kein
appack-FreeMarker-Ausdruck an dieser Stelle.

`Spielplan-App.html` läuft über eine zweite, **statische** Ausgabeart
desselben Bauskripts (`STATISCHE_SEITEN` in `tpl-bauen.mjs`): kein
appack-Titelausdruck (fester `<title>Spielplan &amp; Tabellen</title>`),
dieselbe `v3-basis.css` inline, aber kein appack-Fußskript (jQuery/
Workbook) – die Seite braucht keines. Die Widget-IDs aus
`data/widgets.json` (`spiele`, `tabelle`) setzt `tpl-bauen.mjs` beim Bauen
über den Platzhalter `__WIDGETS_JSON__` in `src/app/Spielplan-App.html`
ein (`JSON.stringify`, ohne das Dokumentationsfeld `_hinweis`).

### Geschäftsstelle & Anfahrt: Worksheet-Felder

Feldnamen (Wochentage englisch, Kleinschreibung) am heutigen
`Geschäftsstelle.tpl` verifiziert (`https://appack.de/rest-api/drender/
6a1ec5fcf68a05bf129cdbb7`, öffentlich abrufbar, Stand 21.09.2026):

| Worksheet | Workbook-ID | Genutzt für |
|---|---|---|
| Beschreibung | `6a1ec5fcf68a05bf129cdb97` | Kopfkarte „Geschäftsstelle" (`description`) |
| Kontakt | `6a1ec5fcf68a05bf129cdb9b` | Adresse, Anfahrt, Kontakt-Icon-Knöpfe |
| Öffnungszeiten | `6a1ec5fcf68a05bf129cdb9d` | Tabelle Montag–Sonntag (`<tag>open/close/midstart/midend`, `saturdayhider`/`sundayhider`, `openingtext`) |
| Ansprechpartner | `6a1ec5fcf68a05bf129cdb9f` | Kompakte Kontaktzeilen (`ansName`, `ansATitle`, `ansImg`, `ansMail`, `ansSortNumber`) |
| Einstellungen | `6a1ec5fcf68a05bf129cdba2` | Abschnitte ein-/ausblenden (`descriptionActive`, `openingActive`, `contactActive`, `ansActive`) |

Die live gepflegten Felder `holidayopen/close/midstart/midend`,
`holidayhider`, `seasonstart`, `seasonend`, `state`, `closeInactive`
(Sonderöffnungszeiten/Saison-Override der alten `Geschäftsstelle.tpl`)
werden von `Geschaeftsstelle_v3.tpl` **nicht** ausgewertet – die
Spezifikation verlangt nur die Wochentabelle Montag–Sonntag mit
`hider`/`geschlossen`-Fallback und den `openingtext`-Hinweis. Eine
saisonale Sonderregelung müsste bei Bedarf nachgezogen werden.

### Spielplan-App.html: Teamwechsel der Widgets

`https://www.fussball.de/widgets.js` (Quelltext geprüft, Stand
21.09.2026) initialisiert beim eigenen `DOMContentLoaded` einmalig alle
zu diesem Zeitpunkt im DOM stehenden `.fussballde_widget`-Container und
bietet **keine** Funktion, neu eingefügte Container nachträglich zu
initialisieren. Der Teamwechsel (Pille antippen) speichert das gewählte
Team deshalb in `localStorage` (`speuzer.spielplan.team`) **und** im
`location.hash` (z. B. `#D3`) und lädt die Seite anschließend per
`location.reload()` neu – der Hash hält den Zustand über den Reload
hinweg, `widgets.js` initialisiert beim Neuladen die (neuen) Container
des gewählten Teams frisch.

### Datenpflege durch den Verein

Befunde aus der Qualitätsprüfung, die reine Worksheet-/Live-Daten
betreffen (nicht die Vorlagen) – zu klären im appack-CMS des Vereins:

- **Sponsoren-Worksheet**: Eintrag „Fußballschule VM Elite" verlinkt auf
  `instagram.com/bundeswehrkarriere` (falscher Insta-Handle); zwei
  Karten (Bundeswehr-, Köhler-Logo) haben kein `sponFirma` (Name fehlt,
  dadurch Leerflächen in der 2-Spalten-Kachel); „Köhler" fehlt auf der
  Website ganz (dort heißt der Bundeswehr-Eintrag „Bundeswehr").
- **Vorstand/Ansprechpartner-Worksheet** (`6a1ec5fcf68a05bf129cdb8b`):
  Kategorien-Worksheet (`…cdb90`) enthält nur eine belegte Kategorie,
  dadurch keine Gruppierung nach den vier Website-Gruppen
  (Geschäftsführender Vorstand, Jugendleitung, Senioren,
  Karnevalabteilung). Unbesetzter Schriftführer steht als Name „n.B.";
  Website schreibt „derzeit nicht besetzt". Eine Mailadresse beginnt mit
  einem Tabulator, eine endet mit einem Leerzeichen (`mailto:`-Link kann
  in manchen Mail-Clients scheitern).
- **Mannschaften/Trainingszeiten-Worksheet** (`…cdb7e`): bei nahezu allen
  Teams keine Trainingszeiten hinterlegt (nur ein Testwert „test" bei
  E1-Jugend); die echten Zeiten stehen nur im Beschreibungstext. Namen
  uneinheitlich: „Bambinis" (App) vs. „G-Jugend (Bambinis)" (Website),
  „Fußballschule- Athletik" (Tippfehler mit Leerzeichen) vs.
  „Fußballschule-Athletik VM Elite" (Website).
- **Karneval-Worksheet**: vier der fünf Gruppen ohne Übungszeit (nur
  Dreamboys gepflegt); Website zeigt dafür „Übungszeit: Angabe folgt."
  Gruppenbilder von Little Fruities/Flying Fruities zeigen ein Porträt
  der Trainerin statt der Gruppe; Freaky Fruities zeigt ein Foto mit
  erkennbaren Kindern (Einwilligungsfrage). Schreibweise
  „Fridjof-Nansen-Schule" korrekt „Fridtjof-Nansen-Schule".
- **Sponsoren-Kategorie „Hauptsponsoren"**: enthielt bislang nur die
  Platzhalterkarte „Hier könnte Ihre Werbung stehen" – `Sponsoren_v3`
  blendet Karten mit diesem Namen jetzt aus (C2 Abschnitt 7), die
  Kategorie bleibt aber leer, bis echte Hauptsponsoren gepflegt sind.

Aus dem Prüfbericht ebenfalls gemeldet, aber **nicht Teil des
C2-Auftrags** (weder Aufgabe 1–5 noch Abschnitt 7 verlangen es) und daher
hier nur vermerkt statt umgesetzt: eine `Mitglied-werden_v3`-Seite
(Beitragstabellen/Ablauf/Unterlagen statt des alten appack-Formulars)
und ein Umbau des Mehr-Menüs (Allgemeine Infos/Medien) – beides
CMS-Tableiste bzw. neue Seiten außerhalb des zugewiesenen Umfangs.

## W6 – Spielplan und Tabelle gehören zur Mannschaft (23.09.2026)

Entscheidung Olgay: Tabellen und Spielpläne stehen nur noch auf der
jeweiligen Mannschaftsseite, keine eigene Seite und keine Sammelseite mehr
dafür. Website und App wurden aus einem Guss umgebaut (Website: siehe
`src/seiten/mannschaften/team.mjs`, `src/seiten/mannschaften/index.mjs`,
Weiterleitungen über `src/vorlagen/weiterleitung.mjs`).

### Neue statische Seite `Mannschaften-App.html`

`src/app/Mannschaften-App.html` → `assets/app/Mannschaften-App.html`
(`npm run tpl-bauen`, `STATISCHE_SEITEN` in
`tools/app-optik/tpl-bauen.mjs`, wie `Spielplan-App.html`: FUSSBALL.DE-
Widgets laufen nur auf `cdn.appack.de`, keine dynamische `.tpl`-Seite).
Ersetzt den heutigen Inhalt von `Mannschaften_v3.tpl` (Teamkarten aus dem
Abteilungen-Worksheet) UND von `Spielplan-App.html` in einer Seite:
Listenansicht mit Teamkarten (Knopf „Spiele & Tabelle" je Mannschaft) und
eine Detailansicht je Team (Nächstes Spiel, Spielplan der Saison, Tabelle
bzw. Kinderfestival-iframe, Kalender abonnieren) über `location.hash` +
`location.reload()`. Ganz unten in der Listenansicht: „Nächste Spiele des
Vereins" mit dem `club-matches`-Widget.

**Modulumstellung (CMS):**

| Modul | Bisheriger Seitenlink | Neuer Seitenlink | Rückweg |
|---|---|---|---|
| „Mannschaften" (`sportfreunde04_TextImage_1783343147611`) | `Mannschaften_v3.tpl` | `Mannschaften-App.html` | Seitenlink zurück auf `Mannschaften_v3.tpl` |

Das Modul „Spielplan & Tabellen" (`sportfreunde04_TextImage_1783345459688`,
bisher `Spielplan-App.html`) ist seit W6 **nicht mehr verlinkt** – die
Zeile „Spielplan & Tabellen" ist in `Verein_v3.tpl` entfernt (siehe
`src/app/Verein_v3.html`). `Spielplan-App.html` bleibt unverändert als
Rückweg im Repo und wird weiterhin mitgebaut, verweist aber von nirgends
mehr her. `Mannschaften_v3.tpl` bleibt ebenfalls unverändert als Rückweg
bestehen (Modulverwaltung → Modul „Mannschaften" → Seitenlink → Stift →
Dateiauswahl → `Mannschaften_v3.tpl` → „Datei wählen" → „Speichern").

### Website: Weiterleitungen

`spielplan.html`, `spielplan-<team>.html` und `tabellen.html` sind seit W6
schlanke Weiterleitungsseiten (`<meta http-equiv="refresh">`) auf die
jeweilige Mannschaftsseite (`src/vorlagen/weiterleitung.mjs`) – sie bleiben
unter demselben Workspace-Namen bestehen (keine toten Links für alte
Verweise), tragen aber keine Widgets mehr und stehen nicht in
`docs/sitemap.xml`.
