// Kopfzeile (P1) – Wappen + Wortmarke, Hauptnavigation (6 Punkte) mit
// Burger-Menü als Vollflächen-Panel unter 1024 px. Einträge, deren Ziel-URL
// im aktuellen Build noch nicht existiert, werden als <span class="nav__bald">
// statt als Link ausgegeben (siehe navigation.mjs).
//
// App-Modus (P9, Plan-Abschnitt B2): dieses Modul rendert zusätzlich immer
// eine untere Tab-Leiste (<nav class="tabbar">) – auf jeder Seite, in jedem
// Build. Sie ist nur unter der Klasse .ansicht-app sichtbar (siehe
// assets/css/app-modus.css); ohne die Klasse bleibt sie per Basis-CSS
// verborgen. So bleiben Kopfzeile und Tab-Leiste unabhängig vom
// Seitenaufruf (mit oder ohne ?ansicht=app) immer im HTML vorhanden.

import { HAUPT } from "./navigation.mjs";

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// ---------- Tab-Leiste (App-Modus, P9) ----------

// Fünf Ziele, eigene schlichte Strich-Icons (24px, stroke currentColor) –
// keine externe Icon-Bibliothek, jeweils ein einfacher, selbst gezeichneter
// Pfad passend zur textlichen Vorgabe aus dem Plan.
const TABS = [
  { titel: "Start", url: "/", icon: "haus" },
  { titel: "Teams", url: "/mannschaften/", icon: "gruppe" },
  { titel: "Spiele", url: "/spielplan/", icon: "ball" },
  { titel: "News", url: "/news/", icon: "zeitung" },
  { titel: "Verein", url: "/verein/", icon: "raute" },
];

const TAB_ICON_INNEN = {
  // Haus: Dach + Grundriss.
  haus: `<path d="M4 11 12 4l8 7"/><path d="M6 10v10h12V10"/>`,
  // Gruppe: zwei Kreise.
  gruppe: `<circle cx="9" cy="12" r="5"/><circle cx="15" cy="12" r="5"/>`,
  // Ball: Kreis mit Fünfeck.
  ball: `<circle cx="12" cy="12" r="9"/><path d="M12 7l4.8 3.5-1.8 5.6H9l-1.8-5.6z"/>`,
  // Zeitung: Rechteck mit Linien.
  zeitung: `<rect x="4" y="5" width="16" height="14" rx="1"/><path d="M7 9h10M7 12.5h10M7 16h6"/>`,
  // Wappen-Raute.
  raute: `<path d="M12 3 20 12 12 21 4 12z"/>`,
};

function tabIcon(name) {
  return `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${TAB_ICON_INNEN[name] ?? ""}</svg>`;
}

// "Teams"/"Spiele"/"News"/"Verein" gelten auch auf ihren Unterseiten (z. B.
// /mannschaften/d2/) als aktiv – anders als navEintrag() oben (exakter
// Treffer), sonst gäbe es dort keinen aktiven Tab. "Start" bleibt exakt "/".
function tabAktiv(tab, aktuelleUrl) {
  if (!aktuelleUrl) return false;
  if (tab.url === "/") return aktuelleUrl === "/";
  return aktuelleUrl === tab.url || aktuelleUrl.startsWith(tab.url);
}

function tabEintrag(tab, { pfad, aktuelleUrl }) {
  const ziel = tab.url === "/" ? pfad : pfad + tab.url.replace(/^\//, "");
  const aktiv = tabAktiv(tab, aktuelleUrl);
  const klasse = ["tabbar__tab", aktiv ? "tabbar__tab--aktiv" : null].filter(Boolean).join(" ");
  const attrAktuell = aktiv ? ` aria-current="page"` : "";
  return `<li><a class="${klasse}" href="${ziel}"${attrAktuell}>${tabIcon(tab.icon)}<span class="tabbar__label">${escapeHtml(tab.titel)}</span></a></li>`;
}

// Exportiert für den Styleguide (Plan-Abschnitt D): dort dieselbe Funktion
// wiederverwendet statt der Icons/Tabs eine zweite Kopie.
export function tabbar({ pfad, aktuelleUrl }) {
  const eintraege = TABS.map((tab) => tabEintrag(tab, { pfad, aktuelleUrl })).join("\n      ");
  return `<nav class="tabbar" aria-label="App-Navigation">
  <ul>
      ${eintraege}
  </ul>
</nav>`;
}

function navEintrag({ titel, url, knopf }, { pfad, aktuelleUrl, seitenUrls }) {
  const existiert = seitenUrls.has(url);
  const ziel = existiert ? pfad + url.replace(/^\//, "") : null;
  const istAktuell = existiert && url === aktuelleUrl;
  const klassen = [knopf ? "knopf" : null].filter(Boolean).join(" ");

  if (!existiert) {
    const spanKlassen = ["nav__bald", knopf ? "knopf" : null].filter(Boolean).join(" ");
    return `<li><span class="${spanKlassen}" aria-disabled="true" title="Seite folgt">${escapeHtml(titel)}</span></li>`;
  }

  const attrKlasse = klassen ? ` class="${klassen}"` : "";
  const attrAktuell = istAktuell ? ` aria-current="page"` : "";
  return `<li><a href="${ziel}"${attrKlasse}${attrAktuell}>${escapeHtml(titel)}</a></li>`;
}

export function header({ pfad, daten, aktuelleUrl, seitenUrls }) {
  const urls = seitenUrls ?? new Set();
  const nameLang = daten.verein?.name_kurz ?? "FFV Sportfreunde 04";
  const nameKurz = "Sportfreunde 04";

  const eintraege = HAUPT.map((eintrag) => navEintrag(eintrag, { pfad, aktuelleUrl, seitenUrls: urls })).join("\n      ");

  return `<header class="kopf">
  <div class="container kopf__zeile">
    <a class="kopf__marke" href="${pfad}">
      <img class="kopf__wappen" src="${pfad}assets/logo/wappen-blau.svg" width="44" height="44" alt="" aria-hidden="true">
      <span class="kopf__name">
        <span class="kopf__name-lang">${escapeHtml(nameLang)}</span>
        <span class="kopf__name-kurz">${escapeHtml(nameKurz)}</span>
      </span>
    </a>
    <button type="button" class="kopf__burger" aria-expanded="false" aria-controls="hauptmenue" aria-label="Menü öffnen">
      <span class="kopf__burger-balken" aria-hidden="true"></span>
      <span class="kopf__burger-text">Menü</span>
    </button>
    <nav class="kopf__nav" id="hauptmenue" aria-label="Hauptnavigation">
      <button type="button" class="kopf__schliessen" aria-label="Menü schließen">
        <span aria-hidden="true">&times;</span>
      </button>
      <ul>
      ${eintraege}
      </ul>
    </nav>
  </div>
</header>
${tabbar({ pfad, aktuelleUrl })}`;
}
