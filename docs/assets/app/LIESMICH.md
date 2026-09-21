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
