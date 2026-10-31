// Seite „Platzbelegung“ – eine Quelle für die Website (src/seiten/platzbelegung.mjs
// -> web/platzbelegung.html) und die App (tools/app-optik/tpl-bauen.mjs ->
// assets/app/Platzbelegung-App.html, erreichbar über die Zeile „Platzbelegung“ der
// App-Seite Verein). Beide Fassungen haben dasselbe Markup, dasselbe Stylesheet
// (platzbelegung/platzbelegung.css, auf site.css) und dasselbe Skript
// (platzbelegung/platzbelegung.js); die App-Kopie schaltet nur den App-Modus fest
// ein (kein eigener Titel, Titel in der App-Kopfleiste, Link zu den Terminen als
// App-Seite).
//
// Was die Seite zeigt: wann welcher Platzteil auf unserer Anlage (Tor 1 bis 4,
// Käfig, Court) belegt oder frei ist – Training, Heimspiele, andere Nutzung
// („belegt“, ohne Angabe, wer), Halle, Ferien. Gebucht wird nichts: „frei“ öffnet
// eine Anfrage per E-Mail an die Geschäftsstelle.
//
// Daten zur Laufzeit: platzbelegung.json des Spielplan-Generators (GitHub Pages,
// Schnittstelle Version 1, tools/cache/orchestrierung-platzbelegung/SCHNITTSTELLE.md).
// Daten zur Bauzeit: data/platzbelegung.json (Adresse der Quelle, Vorlage der
// Anfrage) und data/verein.json › mail (Adresse der Geschäftsstelle).
//
// Der Prototyp (nur intern, mit Überschneidungen, Datenlage und Quellenangaben)
// liegt in tools/cache/orchestrierung-melli-22-10/platzbelegung/; die öffentliche
// Fassung rechnet wie er, zeigt aber nichts davon.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PLATZBELEGUNG_APP_MODUL } from "./hilfen.mjs";

const HIER = path.dirname(fileURLToPath(import.meta.url));
const PLATZBELEGUNG_CSS = readFileSync(path.join(HIER, "platzbelegung", "platzbelegung.css"), "utf8").trim();
const PLATZBELEGUNG_JS = readFileSync(path.join(HIER, "platzbelegung", "platzbelegung.js"), "utf8").trim();

export const PLATZBELEGUNG_WEB_ADRESSE = "https://cdn.appack.de/sportfreunde04/workspace/web/platzbelegung.html";
export const PLATZBELEGUNG_APP_ADRESSE = "https://cdn.appack.de/sportfreunde04/workspace/Platzbelegung-App.html";
const SITE_CSS_LIVE = "https://cdn.appack.de/sportfreunde04/workspace/web/site.css";
const GH_PAGES_ASSETS = "https://justolgay.github.io/speuzer-website-prototyp/assets/";

// Seitenmodul „Termine“ der App (wie TERMINE_SEITE_MODUL in assets/app/Startseite_v3.tpl): Ziel des Links
// bei nicht erreichbarer Belegung
const TERMINE_SEITE_MODUL = "sportfreunde04_TextImage_1783345459688";

// Ziel der Zeile „Platzbelegung“ auf der App-Seite Verein (Verein_v3.html, Platzhalter __PLATZBELEGUNG_ZIEL__):
// mit eingetragenem Seitenmodul (PLATZBELEGUNG_APP_MODUL in hilfen.mjs) die Seite in der App (nav://),
// solange der Wert leer ist die App-Kopie im Browser (ext://).
export function platzbelegungAppZiel() {
  const modul = String(PLATZBELEGUNG_APP_MODUL ?? "").trim();
  if (!modul) return `ext://${PLATZBELEGUNG_APP_ADRESSE}`;
  return `nav://${modul.startsWith("sportfreunde04_") ? modul : `sportfreunde04_TextImage_${modul}`}`;
}

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// Datenblock für platzbelegung.js (__PLATZBELEGUNG_DATEN__). Nur öffentliche Angaben.
export function platzbelegungDaten(daten) {
  const pb = daten.platzbelegung ?? {};
  const mail = daten.verein?.mail;
  const pflicht = {
    "data/platzbelegung.json › quelle": pb.quelle,
    "data/platzbelegung.json › anzeigeAdresse": pb.anzeigeAdresse,
    "data/platzbelegung.json › anfrage.betreff": pb.anfrage?.betreff,
    "data/platzbelegung.json › anfrage.text": pb.anfrage?.text,
    "data/verein.json › mail": mail,
  };
  for (const [name, wert] of Object.entries(pflicht)) {
    if (typeof wert !== "string" || !wert.trim()) throw new Error(`Platzbelegung: ${name} fehlt`);
  }
  if (!/^https:\/\//.test(pb.quelle)) throw new Error("Platzbelegung: quelle muss eine https-Adresse sein");
  if (!/^[^\s@?&]+@[^\s@?&]+\.[^\s@?&]+$/.test(mail)) throw new Error("Platzbelegung: ungültige Adresse der Geschäftsstelle");
  return {
    quelle: pb.quelle,
    anzeigeAdresse: pb.anzeigeAdresse,
    betreff: pb.anfrage.betreff,
    text: pb.anfrage.text,
    mail,
    termineModul: TERMINE_SEITE_MODUL,
  };
}

const SVG_KOPF = '<svg viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"';

// Seiteninhalt (innerhalb von <main>), für Website und App gleich bis auf den Titel:
// in der App steht er in der Kopfleiste, die Seite hat dort keine eigene h1.
export function platzbelegungInhalt(daten, { app = false } = {}) {
  const pb = platzbelegungDaten(daten);
  const datenJson = JSON.stringify(pb).replaceAll("</", "<\\/");
  const platzhalter = "var DATEN = __PLATZBELEGUNG_DATEN__;";
  if (PLATZBELEGUNG_JS.split(platzhalter).length !== 2) throw new Error("platzbelegung.js: Platzhalter für DATEN fehlt oder steht mehrfach");
  const skript = PLATZBELEGUNG_JS.replace(platzhalter, () => `var DATEN = ${datenJson};`);
  // Link zur Terminseite: auf der Website relativ (der Bau schreibt „../termine/“ auf web/termine.html um),
  // in der App das Seitenmodul „Termine“
  const termineLink = app ? `nav://${TERMINE_SEITE_MODUL}` : "../termine/";
  const titel = app ? "" : "\n    <h1>Platzbelegung</h1>";
  return `<section class="abschnitt seitenkopf">
  <div class="container pb-breit">${titel}
    <p class="seitenkopf__lead">Wann welcher Platzteil auf unserer Anlage in der ${escapeHtml(pb.anzeigeAdresse)} belegt ist.</p>
    <p id="pb-stand" class="meta pb-stand" hidden></p>
  </div>
</section>

<section class="abschnitt pb-abschnitt">
  <div class="container pb-breit">
    <div class="pb" id="pb">
      <p id="pb-laden" class="meta pb-laden" role="status" hidden>Die Belegung wird geladen.</p>

      <!-- Fehlerfall: Datei nicht ladbar, ungültig oder andere Version -->
      <div id="pb-fehler" class="hinweis hinweis--info pb-kasten" role="status" hidden>
        <p>Die Belegung ist gerade nicht erreichbar. Bitte versuchen Sie es später noch einmal.</p>
        <p><a id="pb-fehler-link" class="knopf knopf--sekundaer" href="${escapeHtml(termineLink)}">Zu den Terminen</a></p>
      </div>

      <div id="pb-inhalt" hidden>
        <nav class="pb-wnav" aria-label="Wochenwahl">
          <button id="pb-zurueck" type="button" class="pb-wnav__knopf" aria-label="Vorherige Woche">${SVG_KOPF} stroke-width="2"><path d="M15 6l-6 6 6 6"/></svg></button>
          <p id="pb-titel" class="pb-wnav__titel" aria-live="polite"><strong>Diese Woche</strong><span>&nbsp;</span></p>
          <button id="pb-vor" type="button" class="pb-wnav__knopf" aria-label="Nächste Woche">${SVG_KOPF} stroke-width="2"><path d="M9 6l6 6-6 6"/></svg></button>
          <button id="pb-heute" type="button" class="pb-heute" aria-label="Zur heutigen Woche">Heute</button>
        </nav>
        <p id="pb-heute-hinweis" class="pb-heute-hinweis" hidden></p>
        <div id="pb-tagwahl" class="pb-tagwahl" role="tablist" aria-label="Wochentag"></div>

        <div class="pb-filter">
          <div>
            <p id="pb-k-art" class="pb-kicker">Anzeigen</p>
            <div id="pb-chips-art" class="pb-chips" role="group" aria-labelledby="pb-k-art"></div>
          </div>
          <div>
            <p id="pb-k-team" class="pb-kicker">Mannschaft</p>
            <div id="pb-chips-team" class="pb-chips" role="group" aria-labelledby="pb-k-team"></div>
          </div>
        </div>

        <div id="pb-ansicht" class="pb-ansicht"></div>

        <section class="pb-bereich" aria-labelledby="pb-h-hinweise">
          <h2 id="pb-h-hinweise">Hinweise der Woche</h2>
          <ul id="pb-hinweise" class="pb-hinweise"></ul>
        </section>
        <section class="pb-bereich" aria-labelledby="pb-h-legende">
          <h2 id="pb-h-legende">Legende</h2>
          <ul id="pb-legende" class="pb-legende"></ul>
        </section>
        <p class="meta pb-fussnote">Änderungen vorbehalten.</p>
      </div>
    </div>
    <noscript><p class="meta">Die Platzbelegung braucht JavaScript.</p></noscript>
  </div>
</section>

<dialog id="pb-dialog" class="pb-dialog" aria-labelledby="pb-dialog-titel">
  <div class="pb-dialog__innen">
    <h2 id="pb-dialog-titel" class="pb-dialog__titel">Platz anfragen</h2>
    <div id="pb-dialog-text" class="pb-dialog__text"></div>
  </div>
</dialog>
<script>
${skript}
</script>`;
}

// App-Modus vor dem ersten Zeichnen setzen (kein Sprung): ?app=1 auf der
// Website, die App-Kopie (data-app-seite) oder notfalls eine drender-Seite
// unter appack.de (wie bei der Terminseite).
const APP_MODUS_KOPF = `<script>
(function () {
  var w = document.documentElement;
  if (/(^|[?&])app=1(&|$)/.test(location.search) || w.hasAttribute("data-app-seite") || location.hostname === "appack.de") w.classList.add("app-modus");
})();
</script>`;

// Kopfzusatz der Website-Seite (nach site.css, siehe workspace.html)
export function platzbelegungKopf() {
  return `\n<style>\n${PLATZBELEGUNG_CSS}\n</style>\n${APP_MODUS_KOPF}`;
}

// App-Kopie für die Workspace-Wurzel (Platzbelegung-App.html): dasselbe
// Stylesheet wie die Website (site.css aus dem Ordner web, absolut), App-Modus
// fest eingeschaltet, Adresse der Website als canonical.
export function platzbelegungAppSeite(daten) {
  // Das leere Symbol (data:,) verhindert den Abruf von favicon.ico an der Wurzel des CDN: die Seite fragt außer
  // Stylesheet, Schriften und Belegung nichts an.
  const schrift = (datei) => `<link rel="preload" href="${GH_PAGES_ASSETS}fonts/${datei}" as="font" type="font/woff2" crossorigin>`;
  return `<!DOCTYPE html>
<html lang="de" class="app-modus" data-app-seite>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
<meta name="format-detection" content="telephone=no">
<meta name="format-detection" content="address=no">
<meta name="format-detection" content="email=no">
<meta name="format-detection" content="date=no">
<title>Platzbelegung</title>
<!-- Speuzer Blau-Weiß – Platzbelegung-App.html
     Statische Workspace-Seite für ein Seitenmodul der App (Seitenlink
     Platzbelegung-App.html an der Workspace-Wurzel, ausgeliefert unter
     ${PLATZBELEGUNG_APP_ADRESSE}).
     Gleicher Inhalt wie web/platzbelegung.html (Quelle
     src/vorlagen/platzbelegung.mjs), braucht dessen site.css im Ordner web.
     Erzeugt durch tools/app-optik/tpl-bauen.mjs (npm run tpl-bauen) – NICHT
     von Hand bearbeiten. Details: assets/app/LIESMICH.md, Tabelle
     „Dateien → Module → Rückweg“. -->
<link rel="canonical" href="${PLATZBELEGUNG_WEB_ADRESSE}">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#191793">
<link rel="icon" href="data:,">
${schrift("inter.woff2")}
${schrift("barlow-condensed-600.woff2")}
${schrift("barlow-condensed-700.woff2")}
<link rel="stylesheet" href="${SITE_CSS_LIVE}">
<style>
${PLATZBELEGUNG_CSS}
</style>
${APP_MODUS_KOPF}
</head>
<body class="ws">
<main id="inhalt">
${platzbelegungInhalt(daten, { app: true })}
</main>
</body>
</html>
`;
}
