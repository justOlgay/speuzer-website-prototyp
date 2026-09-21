# appack-Upload-Paket – Ordner "web" (W1)

Stand: 2026-09-21. Erzeugt von `tools/appack-paket.mjs` (`npm run appack-paket`)
aus `docs/ws/*.html` und `docs/assets/css/site.css` (Ergebnis von
`npm run build`). Dieses Paket liegt unter `dist/appack-paket/` und wird
nicht committet.

## Zielordner im appack-Workspace

Der Inhalt von `web/` (37 HTML-Seiten + `site.css`, siehe Dateiliste unten)
wird 1:1 in den appack-Workspace-Ordner **`web`** hochgeladen und dort unter
`https://cdn.appack.de/sportfreunde04/workspace/web/<datei>` ausgeliefert. `site.css` liegt im selben
Ordner wie die Seiten.

## Adressschema

- Seite ↔ Seite (z. B. `mannschaften.html` -> `mannschaften-d3.html`) und
  Sprungmarken (`#…`) bleiben unverändert relativ – beide Dateien liegen im
  selben Workspace-Ordner `web`.
- `<link rel="stylesheet" href="site.css">`: ebenfalls relativ, `site.css`
  liegt im selben Ordner.
- Alle anderen Assets – Schriften, Bilder, Wappen/Favicons, PDF-Downloads –
  sind auf **absolute GitHub-Pages-Adressen** umgeschrieben
  (`https://justolgay.github.io/speuzer-website-prototyp/assets/…`), ebenso die Schriftadressen in `site.css`
  (`url(…)`).

## Abhängigkeit von GitHub Pages

Das Paket funktioniert nur, solange
`https://justolgay.github.io/speuzer-website-prototyp/assets/…` erreichbar
bleibt und CORS `*` setzt (wie heute schon bei den App-Vorlagen, siehe
`assets/app/LIESMICH.md`, Abschnitt „Woher die Schriften kommen"). Wird der
Prototyp unter einer anderen Adresse veröffentlicht, muss das Paket neu
gebaut werden.

## Rückweg

Der Ordner `web` im appack-Workspace ist von der Live-Website unabhängig,
solange die appack-Vorlagen START/MENU/FOOTER nicht auf diesen Ordner
umgestellt sind – bis dahin kann er ohne Wirkung auf die Live-Seite gelöscht
oder neu hochgeladen werden.

## Dateien (38)

- web/datenschutz.html
- web/impressum.html
- web/kontakt.html
- web/mannschaften-a-jugend.html
- web/mannschaften-d1.html
- web/mannschaften-d2.html
- web/mannschaften-d3.html
- web/mannschaften-e1.html
- web/mannschaften-e2.html
- web/mannschaften-e3.html
- web/mannschaften-f1.html
- web/mannschaften-f2.html
- web/mannschaften-g-jugend.html
- web/mannschaften-herren.html
- web/mannschaften.html
- web/mitglied-werden.html
- web/shop.html
- web/spielplan-a-jugend.html
- web/spielplan-d1.html
- web/spielplan-d2.html
- web/spielplan-d3.html
- web/spielplan-e1.html
- web/spielplan-e2.html
- web/spielplan-e3.html
- web/spielplan-f1.html
- web/spielplan-f2.html
- web/spielplan-g-jugend.html
- web/spielplan-herren.html
- web/spielplan.html
- web/styleguide.html
- web/tabellen.html
- web/verein-downloads.html
- web/verein-karneval.html
- web/verein-mach-mit.html
- web/verein-sponsoren.html
- web/verein-vorstand.html
- web/verein.html
- web/site.css
