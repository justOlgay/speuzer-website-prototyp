# appack-Upload-Paket – Ordner "web" (W1)

Stand: 2026-10-19. Erzeugt von `tools/appack-paket.mjs` (`npm run appack-paket`)
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

## Skripte für den Aufnahmeantrag online (28.09.2026; Stand vor dem Anmelde-Assistenten, siehe den Abschnitt dazu weiter unten)

`aufnahmeantrag.html` lädt ihre Skripte aus demselben Ordner `web`:
`aufnahmeantrag.js` (Formular, Unterschriften, PDF-Erzeugung) sofort,
`aufnahmeantrag-pdf-lib.js` (pdf-lib 1.17.1, MIT) nach dem ersten
Schritt im Hintergrund und `aufnahmeantrag-fontkit.js` (@pdf-lib/fontkit
1.1.1, MIT) nur beim Erstellen des PDF, wenn ein Name Zeichen außerhalb von
Helvetica enthält. Lizenzhinweise stehen jeweils am Dateianfang, Herkunft in
`assets/js/antrag/LIZENZ.txt`. Die Schrift für Namen mit Zeichen
außerhalb von Helvetica (`liberation-sans-regular.ttf`, SIL OFL 1.1) kommt
wie alle Schriften von GitHub Pages. Die Vorlage selbst ist das
Vereins-PDF in der Mediathek
(`cdn.appack.de/sportfreunde04/pdf/Vereinsanmeldung…`); die Seite prüft
Größe und SHA-256 gegen `data/aufnahmeantrag-felder.json` gleich beim
Aufruf; wurde die Datei im CMS ersetzt, blendet sie das Formular aus und
bietet den Papierweg an (dann Vermessung erneuern). Beim Anlegen
der Skripte im Workspace darauf achten, dass cdn.appack.de sie als
JavaScript ausliefert (`curl -I …/web/aufnahmeantrag.js`, Content-Type).

## Anmelde-Assistent (Livegang, M6; Zugang mit Code, P1)

Dieser Abschnitt steht nur im Paket, das mit dem Schalter `ANMELDUNG_LIVE`
(`src/vorlagen/hilfen.mjs`) gebaut wurde. Ohne den Schalter gibt es diese
Dateien nicht, und `mitglied-werden.html` führt nicht auf die Seite.

`anmeldung.html` ist die Live-Seite des Anmelde-Assistenten. Sie startet nur mit dem Code
vom Probetraining (Entscheidung der 1. Vorsitzenden vom 12.10.2026): Link
`anmeldung.html?code=<CODE>` (QR-Code und Blatt für die Trainer: `node tools/anmeldung-zugang.mjs`),
sonst ist die Code-Seite der erste Bildschirm. Im Paket stehen nur die Prüfwerte (SHA-256) aus
`data/anmeldung.json › zugang › pruefwerte` in der Konfiguration der Seite; ist die Liste leer, gibt es
keine Code-Abfrage. Verlinkt ist die Seite von `mitglied-werden.html` („Jetzt anmelden“) und
`verein-downloads.html` aus. In der App öffnet ein Link auf `anmeldung.html` im Browser (`ext://https://…`, das
Skript der Seiten setzt es um); `anmeldung.html?app=1` zeigt nur die Übergabe „Im Browser öffnen“. Auf der Website öffnen
die Links auf `anmeldung.html` in einem neuen Fenster (`target="_blank"`), weil die Hülle die Seiten in einem Rahmen ohne
`allow`-Angaben zeigt; läuft der Assistent doch in einem Rahmen oder im Browser einer anderen App (Facebook, Instagram, WebView),
steht oben ein Hinweis (Modul `anmeldung-umgebung.js`).
Sprachen: de, en, tr, ar (Schalter `ANMELDUNG_SPRACHEN_LIVE`). Alle Dateien liegen flach im
Ordner `web` (keine Unterordner), nur als .html, .css und .js:

- `anmeldung.css` – Stylesheet (ohne Kommentare)
- 21 Module `anmeldung-<name>.js` – Code des Assistenten (ES-Module; Einstieg
  `anmeldung-assistent.js`; ohne Kommentare, Importe auf diese Namen umgeschrieben;
  `anmeldung-beispiele.js` ist ein leerer Ersatz ohne Beispiel-Profile)
- 8 Textmodule `anmeldung-texte-<sprache>-oberflaeche.js` und `…-regeln.js`
- 6 Module mit Base64-Text: `anmeldung-schrift.js` (Liberation Sans, SIL OFL 1.1, Lizenztext im
  Kopf der Datei) und `anmeldung-vorlage-<name>.js` (die HFV-Vordrucke und der Aufnahmeantrag des Vereins; Größe und
  SHA-256 prüft der Assistent beim Laden gegen die Konfiguration). Beide Arten werden erst beim Erstellen der
  PDF-Datei geladen.
- `aufnahmeantrag-pdf-lib.js` und `aufnahmeantrag-fontkit.js` (schon im Ordner, bisher Teil des Aufnahmeantrags) werden vom Assistenten mitbenutzt. `aufnahmeantrag.js`
  (Formular und PDF-Erzeugung der alten Seite „Aufnahmeantrag online“) gehört nicht mehr ins Paket, weil keine Seite es lädt; der Abschnitt „Skripte für den
  Aufnahmeantrag online“ weiter oben beschreibt den Stand davor. Die alte Datei im CMS kann liegen bleiben.

Reihenfolge beim Einspielen: erst alle `anmeldung-*.js` (Base64-Module, Texte, Code) und `anmeldung.css`, dann
`anmeldung.html`, zuletzt `mitglied-werden.html` und `verein-downloads.html` (erst sie verlinken die neue Seite) und alle übrigen Seiten
(ihr Skript für die App kennt jetzt den Weg in den Browser). Dazu gehört `aufnahmeantrag.html`: Sie ist jetzt eine Weiterleitung auf
`mitglied-werden.html` (kurzer Satz, Link, `<meta http-equiv="refresh">`); die Datei im CMS wird beim Einspielen ersetzt, gelöscht wird nichts.
So ist nie eine Seite sichtbar, deren Dateien noch fehlen.
Für die App kommt `assets/app/Mitglied-werden-App.html` an die Workspace-Wurzel (nicht in diesen Ordner; Schritte in
`assets/app/LIESMICH.md`). Prüfen nach dem Einspielen: `node tools/appack-paket-pruefen.mjs` für das
Paket und der Abgleich der SHA-256 aus `manifest.json` mit den Dateien im CMS.

Im CMS zu prüfen: Dateien dieser Größe (bis 545 KB; Schrift und Vordrucke in
Zeilen zu 100 Zeichen) im Quellcode-Editor; `cdn.appack.de` muss `.js` als JavaScript ausliefern (ES-Module verlangen
das; bei der schon eingespielten `aufnahmeantrag.js` ist es `application/javascript`). Rückweg: die `anmeldung*`-Dateien löschen und die
vorherigen `mitglied-werden.html`, `verein-downloads.html` und `aufnahmeantrag.html` (die alte Seite „Aufnahmeantrag online“) wieder einspielen
(das Modul „Mitglied werden“ der App wieder auf den bisherigen Seitenlink stellen; `aufnahmeantrag.js` im CMS nicht löschen, solange der Rückweg offen ist).

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

## Dateien (81)

- web/anmeldung.html
- web/aufnahmeantrag.html
- web/datenschutz.html
- web/formular-gesendet.html
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
- web/termine.html
- web/verein-downloads.html
- web/verein-karneval.html
- web/verein-mach-mit.html
- web/verein-organigramm.html
- web/verein-sponsoren.html
- web/verein-ueber-uns.html
- web/verein-vorstand.html
- web/verein.html
- web/aufnahmeantrag-fontkit.js
- web/aufnahmeantrag-pdf-lib.js
- web/site.css
- web/anmeldung-antworten.js
- web/anmeldung-assistent.js
- web/anmeldung-bausteine.js
- web/anmeldung-beispiele.js
- web/anmeldung-bilder.js
- web/anmeldung-hilfen.js
- web/anmeldung-laender.js
- web/anmeldung-pdf-lader.js
- web/anmeldung-pdf.js
- web/anmeldung-regeln.js
- web/anmeldung-schrift.js
- web/anmeldung-seiten-ende.js
- web/anmeldung-seiten-fussball.js
- web/anmeldung-seiten-person.js
- web/anmeldung-seiten-unterlagen.js
- web/anmeldung-seiten-verein.js
- web/anmeldung-seiten-zugang.js
- web/anmeldung-seiten.js
- web/anmeldung-texte-ar-oberflaeche.js
- web/anmeldung-texte-ar-regeln.js
- web/anmeldung-texte-de-oberflaeche.js
- web/anmeldung-texte-de-regeln.js
- web/anmeldung-texte-en-oberflaeche.js
- web/anmeldung-texte-en-regeln.js
- web/anmeldung-texte-tr-oberflaeche.js
- web/anmeldung-texte-tr-regeln.js
- web/anmeldung-umgebung.js
- web/anmeldung-unterschrift.js
- web/anmeldung-vorlage-abmeldung.js
- web/anmeldung-vorlage-aufnahmeantrag.js
- web/anmeldung-vorlage-einverstaendnis-senioren.js
- web/anmeldung-vorlage-hfv-antrag.js
- web/anmeldung-vorlage-vollmacht.js
- web/anmeldung-zeichen.js
- web/anmeldung-zugang.js
- web/anmeldung.css
