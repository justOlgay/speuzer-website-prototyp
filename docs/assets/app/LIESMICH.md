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

### Rückweg (Rollback)

`Startseite_v2.tpl` bleibt währenddessen unverändert im CMS bestehen –
im Fehlerfall den Start-Tab einfach wieder auf `Startseite_v2.tpl` zeigen
lassen. `Startseite_v3.tpl` selbst muss dafür nicht gelöscht werden.

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
