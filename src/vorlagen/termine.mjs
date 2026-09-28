// Terminseite – eine Quelle für die Website (src/seiten/termine.mjs ->
// web/termine.html) und die App (tools/app-optik/tpl-bauen.mjs ->
// assets/app/Termine-App.html, Seitenmodul „Termine“). Beide Fassungen haben
// dasselbe Markup, dasselbe Stylesheet (termine/termine.css, auf site.css)
// und dasselbe Skript (termine/termine.js); die App-Kopie schaltet nur den
// App-Modus fest ein (Links als nav:// bzw. ext://, Titel in der
// App-Kopfleiste).
//
// Daten zur Bauzeit: data/termine.json (API, Token, Kalender, trainingsfreie
// Zeiten), data/teams.json (Mannschaften, regelmäßige Zeiten,
// trainingHinweis), data/verein.json (Kalender-Abos, Ferienhinweis).

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { APP_MODULE, platzAufgeteilt } from "./hilfen.mjs";

const HIER = path.dirname(fileURLToPath(import.meta.url));
const TERMINE_CSS = readFileSync(path.join(HIER, "termine", "termine.css"), "utf8").trim();
const TERMINE_JS = readFileSync(path.join(HIER, "termine", "termine.js"), "utf8").trim();

export const TERMINE_WEB_ADRESSE = "https://cdn.appack.de/sportfreunde04/workspace/web/termine.html";
const SITE_CSS_LIVE = "https://cdn.appack.de/sportfreunde04/workspace/web/site.css";
const GH_PAGES_ASSETS = "https://justolgay.github.io/speuzer-website-prototyp/assets/";

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function normName(text) {
  return String(text ?? "").toLowerCase().replace(/[^a-z0-9äöüß]+/g, "");
}

// Kurzform der Pille: „A“/„G“ statt „A-Jugend“/„G-Jugend“ (die Langform steht
// ab 720px sichtbar und immer als aria-label da), sonst team.kurz.
function pille(team) {
  const m = /^([A-G])(-Jugend)$/.exec(team.kurz ?? "");
  return m ? { kurz: m[1], lang: m[2] } : { kurz: team.kurz, lang: "" };
}

// Namen, unter denen der Kalender eine Mannschaft führt („Speuzer A-Jugend ·
// …“, „Speuzer G1 · …“, „Speuzer Herren · …“), normalisiert.
function kalenderNamen(team) {
  const name = String(team.name ?? "");
  const klammer = /\(([^)]+)\)/.exec(name);
  const namen = [
    team.slug, team.kurz, team.csv, name,
    name.replace(/\s*\([^)]*\)/, ""),
    name.replace(/mannschaft$/i, ""),
    klammer ? klammer[1] : "",
  ];
  return [...new Set(namen.map(normName).filter(Boolean))];
}

// Datenblock für termine.js (__TERMINE_DATEN__). Nur öffentliche Angaben:
// kein Trainername, keine Mailadresse.
export function termineDaten(daten) {
  const termine = daten.termine ?? {};
  const verein = daten.verein ?? {};
  const basis = verein.kalender_basis ?? "";
  return {
    api: termine.api,
    token: termine.token,
    komponente: termine.komponente,
    kalender: termine.kalender ?? [],
    frei: termine.trainingsfrei ?? [],
    kalenderansicht: `https://shorturl.appack.de/${termine.komponente}`,
    module: { mannschaften: APP_MODULE.mannschaften },
    abo: { spiele: `${basis}alle.ics`, training: `${basis}training-alle.ics` },
    mannschaften: (daten.teams ?? []).map((team) => {
      const p = pille(team);
      const teil = team.slug === "herren" ? "Rebstock" : platzAufgeteilt(team).teil;
      return {
        slug: team.slug,
        kurz: team.kurz,
        pille: p.kurz,
        pilleLang: p.lang,
        name: team.name,
        namen: kalenderNamen(team),
        kinder: team.tabelle === false,
        kalender: basis + (team.kalender ?? ""),
        trainingsKalender: basis + (team.trainingsKalender ?? ""),
        training: (team.training ?? []).map((t) => ({ tag: t.tag, von: t.von, bis: t.bis, platz: t.platz ?? teil })),
        hinweis: team.trainingHinweis ?? "",
      };
    }),
  };
}

const SVG_KOPF = '<svg viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"';

// Platzhalter in Höhe echter Zeilen (ruhig, ohne Animation)
function platzhalterHighlights() {
  const breiten = [[86, 52], [74, 44], [80, 48], [66, 40]];
  const zeilen = breiten
    .map(([a, b]) => `<div class="ts-platzhalter-zeile"><span class="ts-platzhalter" style="height:14px;width:80%"></span><span><span class="ts-platzhalter" style="height:14px;width:${a}%"></span><span class="ts-platzhalter" style="height:11px;width:${b}%;margin-top:9px"></span></span></div>`)
    .join("\n              ");
  return `<div class="ts-tage" aria-hidden="true">
            <div class="ts-liste">
              ${zeilen}
            </div>
          </div>
          <p class="sr-only">Termine werden geladen</p>`;
}

function platzhalterTraining() {
  const zeilen = [100, 84, 92, 76]
    .map((b) => `<div class="ts-platzhalter-zeile"><span class="ts-platzhalter" style="height:12px"></span><span class="ts-platzhalter" style="height:12px;width:${b}%"></span></div>`)
    .join("\n            ");
  return `<div class="ts-plan-rahmen" aria-hidden="true">
            ${zeilen}
          </div>
          <p class="sr-only">Trainingszeiten werden geladen</p>`;
}

function pillenHtml(daten) {
  const knoepfe = (daten.teams ?? []).map((team) => {
    const p = pille(team);
    return `<button type="button" class="ts-pille" data-team="${escapeHtml(team.slug)}" aria-pressed="false" aria-label="${escapeHtml(team.name)}" title="${escapeHtml(team.name)}">${escapeHtml(p.kurz)}${p.lang ? `<span class="ts-lang">${escapeHtml(p.lang)}</span>` : ""}</button>`;
  });
  return [`<button type="button" class="ts-pille" data-team="" aria-pressed="true">Alle</button>`, ...knoepfe].join("\n        ");
}

// Seiteninhalt (innerhalb von <main>), identisch für Website und App
export function termineInhalt(daten) {
  const verein = daten.verein ?? {};
  const datenJson = JSON.stringify(termineDaten(daten)).replaceAll("</", "<\\/");
  const platzhalter = "var DATEN = __TERMINE_DATEN__;";
  if (TERMINE_JS.split(platzhalter).length !== 2) throw new Error("termine.js: Platzhalter für DATEN fehlt oder steht mehrfach");
  const skript = TERMINE_JS.replace(platzhalter, () => `var DATEN = ${datenJson};`);
  return `<section class="abschnitt seitenkopf">
  <div class="container">
    <h1>Termine</h1>
    <p class="seitenkopf__lead">Spiele, Kinderfestivals und Veranstaltungen des Vereins auf einen Blick – dazu die Trainingswoche aller&nbsp;Mannschaften.</p>
  </div>
</section>

<section class="abschnitt ts-abschnitt">
  <div class="container">

    <!-- MANNSCHAFTSWAHL: „Alle“ + elf Mannschaften in der Reihenfolge von
         data/teams.json; die Wahl merkt sich das Gerät und steht in der
         Adresse (#d3, auch ?team=d3). -->
    <div class="ts-wahl" role="group" aria-labelledby="wahl-titel">
      <p id="wahl-titel" class="ts-wahl__titel">Mannschaft</p>
      <div id="wahl-knoepfe" class="ts-wahl__knoepfe">
        ${pillenHtml(daten)}
      </div>
    </div>
    <p id="termine-status" class="sr-only" role="status" aria-live="polite"></p>

    <!-- ALS NÄCHSTES: nur mit gewählter Mannschaft – nächstes Spiel,
         nächstes Training, nächste Veranstaltung; Tippen springt zum Eintrag. -->
    <section id="als-naechstes" class="ts-naechstes" aria-labelledby="an-titel" hidden>
      <div class="ts-naechstes__kopf">
        <h2 id="an-titel">Als Nächstes</h2>
        <span id="an-team" class="ts-naechstes__team"></span>
      </div>
      <ul id="an-liste" class="ts-naechstes__liste"></ul>
    </section>

    <div class="ts-ebenen">

      <!-- EBENE 1: Spiele, Kinderfestivals, Veranstaltungen -->
      <section id="spiele" aria-labelledby="hl-titel">
        <div class="ts-ebene__kopf">
          <h2 id="hl-titel">Spiele &amp; Veranstaltungen</h2>
          <a id="sprung-training" class="ts-sprung" href="#training">Training${SVG_KOPF} stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></a>
        </div>
        <p id="hl-lead" class="ts-ebene__lead">Die nächsten Spiele, Kinderfestivals und Veranstaltungen.</p>
        <div id="hl-inhalt" aria-busy="true">
          ${platzhalterHighlights()}
        </div>
        <button id="hl-mehr" type="button" class="knopf knopf--sekundaer ts-mehr" hidden>Weitere Termine anzeigen</button>
        <div id="spaeter" class="ts-spaeter" hidden>
          <h3 class="ts-tag__kopf">Später im Verein</h3>
          <ul id="spaeter-liste" class="ts-liste"></ul>
        </div>
      </section>

      <!-- EBENE 2: Trainingswoche (Mannschaften × Tage); ohne lesbaren
           Trainingskalender die regelmäßigen Zeiten aus data/teams.json -->
      <section id="training" aria-labelledby="tr-titel">
        <div class="ts-ebene__kopf">
          <h2 id="tr-titel">Trainingswoche</h2>
        </div>
        <p id="tr-lead" class="ts-ebene__lead" hidden>Die regelmäßigen Zeiten der Saison.</p>
        <div id="woche-nav" class="ts-woche-nav">
          <button id="woche-zurueck" type="button" class="ts-woche-nav__knopf" aria-label="Vorige Woche" disabled>${SVG_KOPF} stroke-width="2"><path d="M15 6l-6 6 6 6"/></svg></button>
          <p id="woche-titel" class="ts-woche-nav__titel" aria-live="polite"><strong>Diese Woche</strong><span>&nbsp;</span></p>
          <button id="woche-vor" type="button" class="ts-woche-nav__knopf" aria-label="Nächste Woche" disabled>${SVG_KOPF} stroke-width="2"><path d="M9 6l6 6-6 6"/></svg></button>
        </div>
        <div id="tr-inhalt" class="ts-tr-inhalt" aria-busy="true">
          ${platzhalterTraining()}
        </div>
        <p class="ts-tr-hinweis">${escapeHtml(verein.hinweise?.ferien ?? "")}</p>
      </section>
    </div>

    <div class="ts-fuss">
      <h2>Kalender abonnieren</h2>
      <div id="abo-liste" class="zeilen-liste"></div>
      <p class="meta">Einmal abonnieren – Verlegungen kommen automatisch&nbsp;an.</p>
      <div class="zeilen-liste ts-fuss__ansicht">
        <a id="kalender-link" class="zeile" href="https://shorturl.appack.de/${escapeHtml(daten.termine?.komponente ?? "")}">
          <span class="zeile__text">
            <span class="zeile__titel">Kalenderansicht</span>
            <span class="zeile__untertitel">Alle Termine nach Monaten, mit Suche</span>
          </span>
          <span class="zeile__pfeil" aria-hidden="true">›</span>
        </a>
      </div>
    </div>
    <noscript><p class="meta">Die Termine brauchen JavaScript. Spielpläne und Trainingszeiten stehen auch auf den Mannschaftsseiten.</p></noscript>
  </div>
</section>
<script>
${skript}
</script>`;
}

// App-Modus vor dem ersten Zeichnen setzen (kein Sprung): ?app=1 auf der
// Website, die App-Kopie (data-app-seite) oder notfalls eine drender-Seite
// unter appack.de.
const APP_MODUS_KOPF = `<script>
(function () {
  var w = document.documentElement;
  if (/(^|[?&])app=1(&|$)/.test(location.search) || w.hasAttribute("data-app-seite") || location.hostname === "appack.de") w.classList.add("app-modus");
})();
</script>`;

// Kopfzusatz der Website-Seite (nach site.css, siehe workspace.html)
export function termineKopf() {
  return `\n<style>\n${TERMINE_CSS}\n</style>\n${APP_MODUS_KOPF}`;
}

// App-Kopie für die Workspace-Wurzel (Termine-App.html): dasselbe
// Stylesheet wie die Website (site.css aus dem Ordner web, absolut), App-Modus
// fest eingeschaltet, Adresse der Website als canonical.
export function termineAppSeite(daten) {
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
<title>Termine</title>
<!-- Speuzer Blau-Weiß – Termine-App.html
     Statische Workspace-Seite für das Seitenmodul „Termine“ der App
     (Seitenlink Termine-App.html an der Workspace-Wurzel, ausgeliefert unter
     https://cdn.appack.de/sportfreunde04/workspace/Termine-App.html).
     Gleicher Inhalt wie web/termine.html (Quelle src/vorlagen/termine.mjs),
     braucht dessen site.css im Ordner web. Erzeugt durch
     tools/app-optik/tpl-bauen.mjs (npm run tpl-bauen) – NICHT von Hand
     bearbeiten. Details: assets/app/LIESMICH.md, Abschnitt „Termine“. -->
<link rel="canonical" href="${TERMINE_WEB_ADRESSE}">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#191793">
${schrift("inter.woff2")}
${schrift("barlow-condensed-600.woff2")}
${schrift("barlow-condensed-700.woff2")}
<link rel="stylesheet" href="${SITE_CSS_LIVE}">
<style>
${TERMINE_CSS}
</style>
${APP_MODUS_KOPF}
</head>
<body class="ws">
<main id="inhalt">
${termineInhalt(daten)}
</main>
</body>
</html>
`;
}
