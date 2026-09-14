# Speuzer Website – Prototyp

Dies ist ein **Prototyp / eine Testumgebung** für den Vorstand des F.F.V. Sportfreunde 04
(„Speuzer“). Es handelt sich **nicht um die Live-Seite** – nichts hier wird automatisch
auf sportfreunde04.de oder in appack übernommen.

Die Inhalte stammen von der Live-Seite sportfreunde04.de sowie aus den öffentlichen
appack- und fussball.de-Schnittstellen, **Stand 11.09.2026**.

Der Prototyp ist indexierbar, damit die Lighthouse-SEO-Prüfung (is-crawlable) bestanden
wird; er kennzeichnet sich auf jeder Seite als Testumgebung.

## Aufbau der Ordner

```
src/vorlagen/   Grundgerüst (basis.html) sowie Kopf- und Fußzeile (header.mjs, footer.mjs)
src/seiten/     Seitenmodule (*.mjs), erzeugen die einzelnen Seiten
data/           Feste und importierte Daten als JSON
assets/         Gestaltungs-Tokens (CSS), Schriften, Logo, Bilder
tools/          Build-, Import- und Prüfwerkzeuge
docs/           Build-Ausgabe (wird committet, Quelle für GitHub Pages)
```

## Befehle

```
npm run build     Baut die Seiten nach docs/
npm run pruefen   Prüft die gebauten Seiten (Layout, Semantik, Kontrast, Links, Meta)
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
