# appack-Upload-Paket – Ordner "web" (W1)

Stand: 2026-09-23. Erzeugt von `tools/appack-paket.mjs` (`npm run appack-paket`)
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

## Zwei Ausgabemodi (W2)

Die Seitenvorlagen (`src/vorlagen/workspace.html`,
`src/seiten/mannschaften/index.mjs`, `src/seiten/mannschaften/team.mjs`)
markieren Inhalt, der nur in einem der beiden Ausgabemodi erscheinen soll:

- `data-nur-appack` – nur für die Live-Website. Dieses Skript macht den
  Inhalt sichtbar (entfernt das Sichtbarkeits-Attribut `hidden`).
- Prototyp-Markierung (der genaue Attributname dafür steht in
  `tools/appack-paket.mjs`, Abschnitt "Zwei Ausgabemodi", und wird hier
  bewusst nicht wörtlich wiederholt, damit er nach dem Umschreiben nicht
  fälschlich als stehengebliebene Markierung erscheint) – nur für den
  GitHub-Pages-Prototyp (eingefrorene Daten mit Stand-Angabe). Dieses Skript
  entfernt den ganzen Block.

Seit W6 (Entscheidung Olgay 23.09.2026: Tabellen und Spielpläne nur noch je
Mannschaftsseite, keine eigene Seite/Sammelseite dafür) enthält `web/`
ausschließlich Live-Inhalt: FUSSBALL.DE-Widgets für die Vereinsspiele
(`mannschaften.html`, ganz unten, Typ `club-matches`), das nächste Spiel
und die Spiele der Saison je Team (`mannschaften-<team>.html`, Typen
`next-match`/`team-matches`, IDs aus `data/widgets.json`) sowie die
Tabellen (ebenfalls `mannschaften-<team>.html`, Typ `table`). Das betrifft
acht der elf Mannschaften; nur die drei Teams ohne FUSSBALL.DE-Widget (F1,
F2, G-Jugend – Kinderfußball, kein Ligabetrieb) behalten die
`<iframe>`-Einbettung der Gruppen-Seite des Spielplan-Generators
(`https://justolgay.github.io/speuzer-spielplan/app-<gruppe>.html`) auch im
Live-Paket, auf `mannschaften-<team>.html` wie bisher auf
`spielplan-<team>.html`. Die früheren Seiten `spielplan.html`,
`spielplan-<team>.html` und `tabellen.html` sind seit W6 schlanke
Weiterleitungen (`<meta http-equiv="refresh">`) auf die jeweilige
Mannschaftsseite (siehe `src/vorlagen/weiterleitung.mjs`) – sie bleiben unter
demselben Workspace-Namen bestehen, damit alte Verweise nicht ins Leere
laufen, tragen aber keine Widgets mehr und stehen nicht in `docs/sitemap.xml`.
Das FUSSBALL.DE-Skript `widgets.js` wird clientseitig nur nachgeladen, wenn
ein sichtbares FUSSBALL.DE-Widget – gleich welchen Typs (`next-match`,
`team-matches`, `table`, `club-matches`) – im Dokument steht (siehe
`FUSSBALLDE_WIDGET_LADER` in `src/vorlagen/hilfen.mjs`). Die FUSSBALL.DE-
Widgets sind bei FUSSBALL.DE nur für die Domain `cdn.appack.de` freigegeben –
lokal oder auf GitHub Pages zeigen sie eine Fehlermeldung von FUSSBALL.DE, das
ist kein Seitenfehler (siehe `tools/appack-paket-pruefen.mjs`).

## Datenschutz

`datenschutz.html` nennt seit W3b die FUSSBALL.DE-Widgets als Drittanbieter
(eigener Absatz, Rechtsgrundlage Art. 6 Abs. 1 lit. f DSGVO). Der Wortlaut
ist redaktionell übernommen (W3-Spezifikation Abschnitt 7) – eine
juristische Prüfung des Datenschutztexts ist offen, bevor die Seite live
geht.

## Rückweg

Der Ordner `web` im appack-Workspace ist von der Live-Website unabhängig,
solange die appack-Vorlagen START/MENU/FOOTER nicht auf diesen Ordner
umgestellt sind – bis dahin kann er ohne Wirkung auf die Live-Seite gelöscht
oder neu hochgeladen werden.

## Ausgeschlossen (W3)

`styleguide.html` (interne Seite, "Interner Anhang für das
Übernahmepaket", Momentaufnahme-Datum, Beispiel-Kontaktdaten) ist NICHT im
Paket – `docs/ws/styleguide.html` bleibt nur lokal/auf GitHub Pages
(Gestaltungssystem), `tools/appack-paket.mjs` nimmt sie aus der
Dateiliste. Die gleichnamige Live-Datei im appack-Workspace (falls aus
einem früheren Upload noch vorhanden) sollte geleert bzw. gelöscht werden –
das macht der Verein im CMS.

## Nur vmapit

Diese Befunde betreffen die Hülle (appack-Vorlage "Microwebseite",
vmapit/appack) selbst, nicht die hier gebauten Workspace-Seiten – sie sind
hier nur dokumentiert (W3-Spezifikation Abschnitt 5), nicht umgesetzt:

- Startseite der Hülle ohne Inhalt (nur Claim + Fußbereich).
- Fester Rahmen 92`vh` für Inhaltsseiten (`#showFrame`), darunter sofort
  der Hüllen-Fußbereich – kein Rahmen, der die Inhaltshöhe übernimmt.
- Fußzeile: Impressum/Datenschutz öffnen in einem 40`vw`-Rahmen (1440px),
  anderes Layout als alle Menüseiten.
- Nicht ladende Stylesheets des appack-Terminmoduls
  (`application.appack.de/appointment-module/…/preloading.css`,
  `theme-light.css`, `layout.css`, HTTP 404) – appack melden.
- Facebook-Link der Fußzeile zeigt auf eine andere Adresse als
  `kontakt.html` (Worksheet-Pflege, macht der Auftraggeber im CMS).

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
- web/tabellen.html
- web/verein-downloads.html
- web/verein-karneval.html
- web/verein-mach-mit.html
- web/verein-sponsoren.html
- web/verein-ueber-uns.html
- web/verein-vorstand.html
- web/verein.html
- web/site.css
