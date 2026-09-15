# Speuzer Website – Prototyp

Dies ist ein **Prototyp / eine Testumgebung** für den Vorstand des F.F.V. Sportfreunde 04
(„Speuzer“). Es handelt sich **nicht um die Live-Seite** – nichts hier wird automatisch
auf sportfreunde04.de oder in appack übernommen.

Die Inhalte stammen von der Live-Seite sportfreunde04.de sowie aus den öffentlichen
appack- und fussball.de-Schnittstellen, **Stand 11.09.2026**.

Der Prototyp ist indexierbar, damit die Lighthouse-SEO-Prüfung (is-crawlable) bestanden
wird; er kennzeichnet sich auf jeder Seite als Testumgebung.

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
src/begleit/    Begleitseiten (app.mjs, vorher-nachher.mjs) – nicht Teil des
                Builds; P17 baut daraus eigene Begleitseiten
data/           Feste und importierte Daten als JSON, inkl. appack-*.json
                (Worksheet-Werte der Hülle, siehe unten)
assets/         Gestaltungs-Tokens (CSS), Schriften (Barlow Condensed/Inter
                für den Prototyp, Open Sans für die Hülle), Logo, Bilder,
                assets/huelle/ (Startbild, Wappen der Hülle, siehe unten)
tools/          Build-, Import- und Prüfwerkzeuge
docs/           Build-Ausgabe (wird committet, Quelle für GitHub Pages):
                docs/ws/ = Workspace-Seiten, docs/index.html = die Hülle
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

## Befehle

```
npm run build     Baut die Seiten nach docs/ (Workspace-Seiten und die Hülle)
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
                  Erzeugt die neun "nachher"-Screenshots für /vorher-nachher/ nach
                  assets/bilder/quelle/ (puppeteer-core, startet den lokalen Server bei
                  Bedarf selbst wie oben). Die neun "vorher"-Screenshots der Live-Seite
                  liegen dort bereits fertig und anonymisiert; anschließend npm run
                  bilder ausführen.
npm run lighthouse
                  Prüft alle Seiten aus docs/sitemap.xml mit Lighthouse (lokal, mobil,
                  `npx --no-install lighthouse` je Seite, startet den lokalen Server bei
                  Bedarf selbst). Bei einer Kategorie unter 90 bis zu zwei Wiederholungen,
                  der beste Lauf zählt. Schreibt data/lighthouse.json und
                  tools/cache/lighthouse.md, bricht mit Exit 1 ab, wenn eine Kategorie im
                  Minimum über alle Seiten unter 90 bleibt. Dauer: 20–40 Minuten.
```
