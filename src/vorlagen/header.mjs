// Kopfzeile (P1) – Wappen + Wortmarke, Hauptnavigation (6 Punkte) mit
// Burger-Menü als Vollflächen-Panel unter 1024 px. Einträge, deren Ziel-URL
// im aktuellen Build noch nicht existiert, werden als <span class="nav__bald">
// statt als Link ausgegeben (siehe navigation.mjs).

import { HAUPT } from "./navigation.mjs";

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
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
</header>`;
}
