# Speuzer Website – Prototyp

Dies ist ein **Prototyp / eine Testumgebung** für den Vorstand des F.F.V. Sportfreunde 04
(„Speuzer“). Es handelt sich **nicht um die Live-Seite** – nichts hier wird automatisch
auf sportfreunde04.de oder in appack übernommen.

## Zweck

Der Prototyp zeigt seit P15–P17 (Workspace-Seiten P15, Hülle P16, Begleitseiten P17) die **appack-Fassung**: dieselbe appack-Vorlage
„Microwebseite“ wie die Live-Seite (Hülle, nachgebildet in `docs/index.html`),
aber so gut gebaut, wie die Plattform es zulässt – sechs Menüpunkte,
Inhalt in voller Breite, alle Inhalte des Vereins als Workspace-Seiten
(`docs/ws/`), dazu zwei Begleitseiten (`/vorher-nachher/`, `/app/`) als
Begleitmaterial für den Vorstand. Der Tag `zielbild-2026-09-14` markiert die
frühere Fassung (Stand P14d, vor P15): dort war das Zielbild noch eine eigenständige
Website ohne appack-Hülle, mit eigener Adresse je Seite – diese Fassung wurde
ab P15 durch die appack-Fassung ersetzt, weil eine eigenständige Website
ohne den Anbieter nicht das ist, was appack tatsächlich ausliefert.

Die Inhalte stammen von der Live-Seite sportfreunde04.de sowie aus den öffentlichen
appack- und fussball.de-Schnittstellen, **Stand 11.09.2026**.

Der Prototyp ist indexierbar, damit die Lighthouse-SEO-Prüfung (is-crawlable) bestanden
wird; er kennzeichnet sich auf jeder Seite als Testumgebung. Ausnahme: Die Entwurfsseiten
`/anmeldung/` und `/anmeldung-konzept/` tragen `noindex` und stehen deshalb nicht in der Sitemap
(Lighthouse prüft nur Sitemap-Seiten).

## Aufbau der Ordner

Seit P15 ist der Prototyp auf die appack-Fassung umgebaut: Inhaltsseiten sind
eigenständige Workspace-Seiten ohne Kopf, Menü und Fußbereich; Kopfleiste,
Menü, Startbild und Fußbereich liefert appack selbst – seit P16 als
docs/index.html, die Hülle (siehe eigener Abschnitt unten).

```
src/vorlagen/   Workspace-Vorlage (workspace.html) sowie gemeinsame Bausteine
                (bausteine.mjs, hilfen.mjs, bild.mjs)
src/seiten/     Seitenmodule (*.mjs), erzeugen die Workspace-Seiten
src/huelle/     Quelldateien der Hülle (huelle.html/.css/.js), siehe unten
src/begleit/    Begleitseiten (app.mjs, vorher-nachher.mjs), siehe eigener
                Abschnitt unten – Begleitmaterial für den Vorstand, nicht
                Teil der nachgebildeten appack-Website
data/           Feste und importierte Daten als JSON, inkl. appack-*.json
                (Worksheet-Werte der Hülle, siehe unten)
assets/         Gestaltungs-Tokens (CSS), Schriften (Barlow Condensed/Inter
                für den Prototyp, Open Sans für die Hülle), Logo, Bilder,
                assets/huelle/ (Startbild, Wappen der Hülle, siehe unten)
tools/          Build-, Import- und Prüfwerkzeuge
docs/           Build-Ausgabe (wird committet, Quelle für GitHub Pages):
                docs/ws/ = Workspace-Seiten, docs/index.html = die Hülle,
                docs/vorher-nachher/, docs/app/ und docs/404.html = die
                Begleitseiten
```

## Hülle

`docs/index.html` ist eine getreue Nachbildung der appack-Vorlage
„Microwebseite“, mit der appack die Live-Seite des Vereins ausliefert – sie
lädt die Workspace-Seiten aus `docs/ws/` in ihren Inhaltsrahmen. Ihre
Einstellungen (Menü, Startbild, Farben, Fußbereich) liest sie aus den
`data/appack-*.json`-Dateien, die 1:1 den CMS-Worksheets START, MENU, FOOTER
und SIDEBAR entsprechen; Quelldateien liegen unter `src/huelle/`. Sie bildet
die Vorlage bewusst einschließlich ihrer Schwächen nach (Ladeanimation,
Menüpunkte ohne echte Links, Titel/Favicon erst per JavaScript, kein
`lang`-Attribut) – nichts davon ist hier „verbessert“.

## Begleitseiten

`/vorher-nachher/`, `/app/` und `404.html` sind Begleitmaterial für den
Vorstand außerhalb der nachgebildeten appack-Website und der
Workspace-Seiten, mit eigener schmaler Kopfleiste statt der Hülle. Die
Module liegen unter `src/begleit/` (Vorlage `src/vorlagen/begleit.html`) und
werden nach `docs/vorher-nachher/`, `docs/app/` sowie `docs/404.html` gebaut.

### Anmelde-Assistent (Entwurf)

`/anmeldung/` führt eine Familie in Einfacher Sprache (Übersetzungshilfe Englisch, Türkisch, Arabisch)
durch die Anmeldung und erzeugt im Browser ein PDF mit allen Unterlagen (Teil A für die Familie, Teil B
für den Verein, Teil C vertraulich). Es wird nichts gesendet und nichts gespeichert. `/anmeldung-konzept/`
erklärt das Konzept und listet die offenen Entscheidungen (O-Nummern) für Vorstand, Kasse und Passstelle.
Beide Seiten sind `noindex` und nicht Teil des appack-Pakets.

Livegang (seit 19.10.2026 an; `ANMELDUNG_LIVE_SCHALTER` und `ORGANIGRAMM_LIVE_SCHALTER` stehen auf `true`, ein normaler Bau ist der Live-Bau;
Rückweg: auf `false` setzen und neu bauen, dazu im CMS das Modul „Mitglied werden“ wieder auf `Mitglied werden_2.tpl`): `ANMELDUNG_LIVE_SCHALTER` in `src/vorlagen/hilfen.mjs` nimmt den Assistenten als
`web/anmeldung.html` (37 Dateien `anmeldung*` im Ordner `web`, flach) ins appack-Paket. „Mitglied werden“ (Website `web/mitglied-werden.html` und
die App-Datei `assets/app/Mitglied-werden-App.html`) und „Downloads“ führen dann nur noch über den Knopf
„Jetzt anmelden“ zur Anmeldung; die alten Wege (Seite „Aufnahmeantrag online“, Vordruck zum Ausfüllen, Antrag per
E-Mail, Formular der App) sind von keiner Seite mehr verlinkt. Die alte Seite `web/aufnahmeantrag.html` ist dann eine Weiterleitung auf
`web/mitglied-werden.html` (Satz, Link, `<meta http-equiv="refresh">`, `noindex`; Muster der alten Seiten `spielplan*` und `tabellen`,
`src/vorlagen/weiterleitung.mjs`); ihr Skript `aufnahmeantrag.js` kommt nicht mehr ins Paket. Auf „Mitglied werden“ stehen die drei
Unterlagenlisten in einem zugeklappten Bereich „Welche Unterlagen brauche ich?“ (`<details>`, mit der Tastatur bedienbar, Stil nur auf dieser
Seite); „Zum Herunterladen“ führt dort nur die Zusatzerklärung und die Satzung (die Beitragsübersicht steht bei den Beiträgen); das
Info-Blatt und „Wichtige Unterlagen, die mitzubringen sind“ bleiben auf „Downloads“. `ANMELDUNG_SPRACHEN_LIVE` legt die Sprachen fest
(Deutsch, Englisch, Türkisch, Arabisch). Für einen einzelnen Bau: `ANMELDUNG_LIVE=1`. Paket-Test: `npm run test:anmeldung-paket`
(nach einem Bau mit `ANMELDUNG_LIVE=1`; er liefert das Paket unter der Adresse des CDN aus und setzt den Zugang selbst).

Zugang mit Code vom Probetraining (Paket P1, Entscheidung der 1. Vorsitzenden vom 12.10.2026): Neue Mitglieder melden
sich nur nach einem Probetraining an. Wer dort war, bekommt einen Code, einen Link
(`https://cdn.appack.de/sportfreunde04/workspace/web/anmeldung.html?code=<CODE>`) oder einen QR-Code; nur damit startet der
Assistent, auf der Website und aus der App.

- Konfiguration: `data/anmeldung.json › zugang › pruefwerte` = SHA-256 (hex, klein) des normalisierten Codes (Leerzeichen und
  Bindestriche weg, Großbuchstaben); mehrere Prüfwerte gelten nebeneinander (Wechsel ohne Lücke). **Leere Liste = keine
  Code-Abfrage** (bis zum Livegang steht sie leer; den echten Prüfwert setzt das Werkzeug). Der Klartext-Code steht nie im Repo, in `docs/` oder im Paket, nur sein Prüfwert.
- Prüfung im Browser: `assets/js/anmeldung/zugang.js` (`crypto.subtle`, sonst eine eigene SHA-256-Funktion), Seiten
  `assets/js/anmeldung/seiten-zugang.js`. Ohne gültigen Code ist die Code-Seite der erste Bildschirm (Sprachwahl oben, vor jeder
  persönlichen Frage). Ein Link mit gültigem `?code=` startet ohne Code-Seite; ein richtiger Code setzt `code=` in die Adresse
  (Neuladen braucht ihn nicht noch einmal). Der Code gehört nicht zu den Antworten und steht nie im PDF.
- Werkzeug `tools/anmeldung-zugang.mjs`: `--code <CODE> --blatt <Ordner> [--behalten]` setzt den Prüfwert und legt „Anmeldung –
  QR-Code für das Probetraining.pdf“ (A4, für die Trainer) und `.png` (QR-Code) im Ordner ab; der Ordner darf nicht im Repo liegen
  (außer unter `tools/cache/`). Der Code hat 8 bis 32 Zeichen, empfohlen ab 12 (A–Z ohne I und O, 2–9), weil der Prüfwert
  öffentlich ist. `--pruefen <CODE>` sagt, ob ein Code passt; `--leeren` schaltet die Abfrage ab. Danach bauen
  (`sh tools/cache/bau-sperre.sh build`), damit `docs/` und das Paket den Prüfwert tragen.
- App-Weiche: Der Assistent läuft nie in der Webansicht der App. `APP_MODUS_SKRIPT` (`src/vorlagen/hilfen.mjs`) öffnet Links auf
  `…/workspace/web/anmeldung.html` per `ext://` im Browser (ohne `app=1`, `code` bleibt); `anmeldung.html?app=1` zeigt nur
  den Bildschirm „Bitte öffnen Sie die Anmeldung im Browser.“ mit dem Knopf „Im Browser öffnen“.
- Rahmen der Website: Die Hülle zeigt die Workspace-Seiten in einem `<iframe id="showFrame">` ohne `allow`-Angaben (`src/huelle/huelle.html`);
  Teilen, Kopieren und Herunterladen sind dort nicht verlässlich. Darum öffnen alle Links auf `anmeldung.html` in den Seiten der Website
  („Mitglied werden“, „Downloads“) in einem neuen Fenster (`target="_blank" rel="noopener"`; die Weiche der App nimmt `target` weg).
- Hinweis zur Umgebung (`assets/js/anmeldung/umgebung.js`): Läuft der Assistent trotzdem in einem Rahmen (`window.top !== window.self`, Zugriff
  mit `try/catch`) oder im Browser einer anderen App (Erkennung nur an Kennungen im User-Agent: `; wv)`, `FBAN`, `FBAV`, `FB_IAB`, `Instagram`,
  `LinkedInApp`, `Line/`, `MicroMessenger`, `musical_ly`, `Bytedance`, `Snapchat`), steht auf dem ersten Bildschirm (Code-Seite oder Start) oben
  ein Hinweiskasten: im Rahmen „Hier klappt das Speichern vielleicht nicht.“ mit dem Link „In neuem Fenster öffnen“ (dieselbe Adresse, mit `code`),
  im Browser einer anderen App die Bitte, in Safari oder Chrome zu öffnen, mit der Anleitung („Tippen Sie oben auf ⋯ …“). Der Assistent bleibt
  bedienbar; oben im normalen Browser und in der App (dort gilt die Übergabe) gibt es den Kasten nicht.
- Tests: `npm run test:anmeldung-zugang` (ohne Browser: SHA-256, Normalisierung, Werkzeug, Blatt, QR-Code, Erkennung der Umgebung mit
  den User-Agent-Zeilen aus `tools/anmeldung-test/user-agents.mjs`); die Browser-Prüfungen stehen in `tools/anmeldung-test/zugang-browser.mjs`
  und laufen in `e2e.mjs` (Begleitseite), `e2e-sprachen.mjs` und `e2e-paket.mjs` (Live-Seite; dort mit einer Testseite als Hülle und einem
  Rahmen auf anderer Herkunft). Die Tests setzen ihren Prüfwert zur Laufzeit ein; im ausgelieferten Code gibt es keine Hintertür.

- Regelwerk: `data/anmeldung.json` (Fälle, Unterlagen, Fristen, offene Punkte), `assets/js/anmeldung/regeln.js`
- PDF: `assets/js/anmeldung/pdf.js`, Vordrucke in `assets/pdf/anmeldung/`, Zuordnung `data/anmeldung-formulare.json`
  (erzeugt mit `tools/anmeldung-test/formulare-erzeugen.mjs`)
- Oberfläche und Texte: `assets/js/anmeldung/`, `assets/js/anmeldung/texte/` (de, en, tr, ar)
- Zugang mit Code: `assets/js/anmeldung/zugang.js`, `seiten-zugang.js`, Werkzeug `tools/anmeldung-zugang.mjs`
- Seiten: `src/begleit/anmeldung.mjs`, `src/begleit/anmeldung-konzept.mjs`
- Textmenge: `node tools/anmeldung-test/textmenge.mjs` zählt je Bildschirm und Beispielfall die sichtbaren Wörter des Assistenten und der Begleittexte der PDF-Datei und prüft sie
  gegen die Stilregeln „einfach und wenig Text“ (Startschritt höchstens 40 Wörter); `--vergleich vorher,nachher` legt zwei Messungen nebeneinander (Ausgabe unter `tools/cache/orchestrierung-anmeldung/pruefung/p3/`).
- Tests: `tools/anmeldung-test/` (siehe Befehle `test:anmeldung…`)

## Befehle

```
npm run build     Baut die Seiten nach docs/ (Workspace-Seiten und die Hülle), danach
                  automatisch npm run appack-paket
npm run appack-paket
                  Baut aus docs/ws/*.html und docs/assets/css/site.css das
                  appack-Upload-Paket nach dist/appack-paket/web/ (Teil von npm run
                  build, siehe tools/appack-paket.mjs)
npm run appack-paket-pruefen
                  Prüft dist/appack-paket/web/ über einen lokalen Static-Server bei
                  390/1440px (siehe tools/appack-paket-pruefen.mjs)
npm run huelle-bilder
                  Erzeugt assets/huelle/startbild.jpg und assets/huelle/wappen-512.png
                  aus den SVG-Wappen (assets/logo/) per headless Chrome (puppeteer-core).
                  Reproduzierbar, beide Dateien werden committet.
npm run pruefen   Prüft die gebauten Seiten (Layout, Semantik, Kontrast, Links, Meta) sowie
                  gesondert die Hülle (Menü, Rahmenmaße, Fußbereich, kein horizontales
                  Scrollen – siehe pruefeHuelle() in tools/pruefen.mjs)
npm run pii       Prüft data/, src/ und docs/ auf personenbezogene Daten
npm run daten     Lädt Spielplan und Tabellen neu ein (spiele.csv, fussball.de)
npm run bilder    Erzeugt responsive Bildvarianten (AVIF/WebP/JPEG) aus assets/bilder/quelle/
npm run serve     Startet einen lokalen Server für docs/ (Port 4173)
npm run screenshots
                  Screenshots aller Seiten aus docs/sitemap.xml bei 390×844 und 1440×900
                  nach tools/cache/screens/ (puppeteer-core, startet den lokalen Server
                  bei Bedarf selbst). Ein reiner Kommandozeilen-Screenshot über Chrome
                  (`--window-size`) wird unter 500px Breite ignoriert und ist deshalb bei
                  390px unbrauchbar – daher ein echter Browser-Viewport statt eines
                  Shell-Skripts.
npm run vergleich
                  Erzeugt die neun "nachher"-Screenshots für /vorher-nachher/ aus der
                  Hülle (docs/index.html): lädt sie im jeweiligen Viewport, klickt sich
                  wie eine Besucherin durch Leisten-/Burger-Menü und Links im
                  Inhaltsrahmen und schreibt Screenshots des Viewports nach
                  assets/bilder/quelle/ (puppeteer-core, startet den lokalen Server bei
                  Bedarf selbst wie oben). Die neun "vorher"-Screenshots der Live-Seite
                  liegen dort bereits fertig und anonymisiert; anschließend npm run
                  bilder ausführen.
npm run lighthouse
                  Prüft alle Seiten aus docs/sitemap.xml mit Lighthouse (mobil,
                  `npx --no-install lighthouse` je Seite; ohne `--basis` gegen den
                  lokalen Server, mit `--basis <url>` z. B. gegen die öffentliche
                  GitHub-Pages-Adresse). Bei einer Kategorie unter 90 bis zu zwei
                  Wiederholungen, der Median über die Läufe zählt. Schreibt
                  data/lighthouse.json und tools/cache/lighthouse.md, bricht mit Exit 1
                  ab, wenn eine Kategorie im Minimum über alle Seiten unter 90 bleibt.
                  Dauer: 20–40 Minuten.
npm run antrag-bibliotheken
                  Kopiert pdf-lib und @pdf-lib/fontkit (devDependencies, MIT) mit
                  vorangestelltem Lizenzhinweis nach assets/js/antrag/ und prüft die
                  Schrift assets/fonts/liberation-sans-regular.ttf (SIL OFL 1.1) gegen
                  ihre Prüfsumme; schreibt außerdem die Zeichenbreiten für die
                  Längenprüfung im Formular (data/aufnahmeantrag-schriftbreiten.json).
                  Nur nach einem Versionswechsel nötig; das Ergebnis wird committet. Gebraucht von der Seite „Aufnahmeantrag online“
                  (src/seiten/aufnahmeantrag.mjs, Skript assets/js/antrag/
                  aufnahmeantrag.js, Feldpositionen data/aufnahmeantrag-felder.json):
                  Sie füllt das Vereins-PDF im Browser aus, ohne Daten zu übertragen;
                  tools/appack-paket.mjs legt die Skripte mit in den Ordner web/. Mit dem Anmelde-Assistenten
                  (ANMELDUNG_LIVE) ist aufnahmeantrag.html nur noch eine Weiterleitung: aufnahmeantrag.js
                  kommt dann nicht mehr ins Paket, pdf-lib und fontkit bleiben (der Assistent braucht sie).
npm run vorstand-pdf   (Kopie in den Vereinsordner nur mit Umgebungsvariable VEREIN_ORDNER)
                  Baut das Vorstandsdokument „Website-Vergleich Live-Seite und
                  appack-Fassung“ als A4-PDF (tools/vorstand-pdf/bauen.mjs, Texte aus
                  tools/vorstand-pdf/texte.mjs). Nimmt zwölf neue Screenshots auf – die
                  meisten über die Hülle des lokalen Servers (tools/huelle-aufnahme.mjs,
                  startet den Server bei Bedarf selbst), zwei direkt von den
                  Begleitseiten –, kombiniert sie mit den neun vorhandenen
                  Vorher/Nachher-Bildpaaren aus assets/bilder/quelle/ und den Daten aus
                  data/*.json (u. a. data/lighthouse.json). Ergebnis:
                  tools/cache/vorstand-pdf/Speuzer Website - Vergleich Live-Seite und
                  appack-Fassung <Datum>.pdf, zusätzlich als Kopie im Verein-Ordner
                  (ältere Stände bleiben dort erhalten).
```

## Übernahmedokument

Der ausführliche Umbauplan für die Umsetzung der appack-Fassung im appack-CMS
(Menü, Farben, Startbild, Fußbereich, Workspace-Upload, Anfrage an den
Anbieter) liegt außerhalb dieses Repositories im Verein-Ordner:
„Speuzer Website – Umbauplan appack-Fassung 15.09.2026“.
