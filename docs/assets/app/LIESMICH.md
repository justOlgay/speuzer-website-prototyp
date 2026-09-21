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
Startseite der Vereins-App (Begrüßung, „Heute und demnächst" mit echten
Kalenderterminen, „Aktuelles" mit echten Meldungen, Hinweis, zwei Knöpfe) –
ohne Foto, Kacheln oder Sponsorenleiste. Kopf- und Tab-Leiste kommen von
der App-Hülle; die Vorlage liefert nur den Inhalt.

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
- Ob `graphApi.calendar.listUpcomingCalendarEvents` bei 0 sichtbaren
  Kalendern tatsächlich ein leeres Array liefert (und nicht einen Fehler),
  ist nur am echten Kalendermodul zu prüfen.

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

### Umschalten je Modul / Rückweg

Modulverwaltung → jeweiliges Modul (Tabelle oben) → Seitenlink (Stift →
Dateiauswahl → `<Name>_v3.tpl` → „Datei wählen" → „Speichern"). Rückweg:
denselben Weg mit dem in der Tabelle genannten bisherigen Dateinamen als
Seitenlink. Die alten Vorlagen (`Verein.tpl`, `Abteilungen.tpl`,
`Abteilungsliste.tpl`, `Ansprechpartnerliste.tpl`, `Sponsoren.tpl`) bleiben
dafür unverändert im CMS bestehen und müssen nicht gelöscht werden.

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
