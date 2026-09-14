// Fußbereich (P1) – Kontakt, Adresse, drei Linkgruppen, Schlusszeile.
// Einträge, deren Ziel-URL im aktuellen Build noch nicht existiert, werden
// als <span class="nav__bald"> statt als Link ausgegeben (siehe navigation.mjs).
//
// App-Modus (P9, Plan-Abschnitt B2): die drei Linkgruppen stecken jetzt in
// einem Wrapper <div class="fuss__spalten"> (display:contents in
// komponenten.css – ändert am normalen Grid-Layout nichts, siehe dort), damit
// sie sich unter .ansicht-app mit einer Regel ausblenden lassen. Zusätzlich
// ein kompakter Block <div class="fuss__app"> (Kontaktzeile + Impressum/
// Datenschutz), der immer mitgerendert, aber nur unter .ansicht-app sichtbar
// ist (Basis-CSS blendet ihn aus, siehe .fuss__app in komponenten.css) – so
// bleibt im App-Modus "nur Kontaktzeile (Mail, Telefon) und Impressum/
// Datenschutz-Links" übrig, ohne die drei Linkspalten.

import { FUSS } from "./navigation.mjs";
import { mailLink } from "./hilfen.mjs";

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function telHref(nummer) {
  return "tel:" + String(nummer ?? "").replace(/[^\d+]/g, "");
}

function fussLink({ titel, url }, { pfad, seitenUrls }) {
  const existiert = seitenUrls.has(url);
  if (!existiert) {
    return `<li><span class="nav__bald" aria-disabled="true" title="Seite folgt">${escapeHtml(titel)}</span></li>`;
  }
  const ziel = pfad + url.replace(/^\//, "");
  return `<li><a href="${ziel}">${escapeHtml(titel)}</a></li>`;
}

function fussGruppe(gruppe, kontext) {
  const eintraege = gruppe.links.map((link) => fussLink(link, kontext)).join("\n        ");
  return `<div class="fuss__gruppe">
        <h2>${escapeHtml(gruppe.gruppe)}</h2>
        <ul>
        ${eintraege}
        </ul>
      </div>`;
}

export function footer({ pfad, daten, seitenUrls }) {
  const urls = seitenUrls ?? new Set();
  const verein = daten.verein ?? {};
  const name = verein.name_register ?? verein.name_kurz ?? "FFV Sportfreunde 04";
  const sportstaette = verein.sportstaette ?? {};
  const post = verein.post ?? {};
  const jahr = new Date().getFullYear();

  const gruppen = FUSS.map((gruppe) => fussGruppe(gruppe, { pfad, seitenUrls: urls })).join("\n      ");

  return `<footer class="fuss">
  <div class="container fuss__raster">
    <div class="fuss__gruppe fuss__marke">
      <img class="fuss__wappen" src="${pfad}assets/logo/wappen-weiss.svg" width="56" height="56" alt="" aria-hidden="true">
      <p class="fuss__registername">${escapeHtml(name)}</p>
      <address class="fuss__adresse">
        <p>${escapeHtml(sportstaette.strasse ?? "")}</p>
        <p>${escapeHtml(sportstaette.plz ?? "")} ${escapeHtml(sportstaette.ort ?? "")}</p>
        <p>${escapeHtml(post.postfach ?? "")}, ${escapeHtml(post.plz ?? "")} ${escapeHtml(post.ort ?? "")}</p>
      </address>
      <ul class="fuss__kontakt" role="list">
        <li>${mailLink(verein.mail ?? "geschaeftsstelle@sportfreunde04.de")}</li>
        <li><a href="${telHref(verein.tel_geschaeftsstelle)}">Geschäftsstelle ${escapeHtml(verein.tel_geschaeftsstelle ?? "")}</a></li>
        <li><a href="${telHref(verein.tel_platzwart)}">Platzwart ${escapeHtml(verein.tel_platzwart ?? "")}</a></li>
        <li><a href="${escapeHtml(verein.instagram ?? "https://www.instagram.com/speuzer_ffm/")}" rel="noopener" target="_blank">Instagram @speuzer_ffm</a></li>
      </ul>
    </div>
    <div class="fuss__spalten">
    ${gruppen}
    </div>
  </div>
  <div class="container fuss__app">
    <ul class="fuss__app-kontakt" role="list">
      <li>${mailLink(verein.mail ?? "geschaeftsstelle@sportfreunde04.de")}</li>
      <li><a href="${telHref(verein.tel_geschaeftsstelle)}">Geschäftsstelle ${escapeHtml(verein.tel_geschaeftsstelle ?? "")}</a></li>
    </ul>
    <ul class="fuss__app-links" role="list">
      <li><a href="${pfad}impressum/">Impressum</a></li>
      <li><a href="${pfad}datenschutz/">Datenschutz</a></li>
    </ul>
  </div>
  <div class="container fuss__schluss">
    <p>© ${jahr} Frankfurter Fußballverein Sportfreunde 1904 e.V.</p>
    <p>Prototyp · Testumgebung, keine Live-Seite</p>
  </div>
</footer>`;
}
