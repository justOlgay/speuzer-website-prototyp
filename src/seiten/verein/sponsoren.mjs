// Sponsoren & Partner /verein/sponsoren/ (P5) – zwei Logo-Reihen (Partner,
// App-Projektpartner) aus data/sponsoren.json plus Aufruf "Sponsor werden".

import { bild } from "../../vorlagen/bild.mjs";
import { ruecklink } from "../../vorlagen/hilfen.mjs";

// Diese Seite liegt immer unter "/verein/sponsoren/" (Tiefe 2), daher immer
// "../../" (siehe pfadZurWurzel() in tools/build.mjs).
const PFAD = "../../";

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// Logo (bild(), contain, weiße Kachel über .logo-reihe__kachel in
// komponenten.css), daneben/darunter Firma, ggf. Ort als .meta; Link nur
// wenn vorhanden (extern, rel="noopener", http:// ergänzt, wenn das Feld
// ohne Schema geliefert wurde). W9-Korrektur (Entscheidung "Sponsoren"-
// Raster, w9-b.md): Instagram-Symbol, wenn sponsor.instagram gesetzt ist
// (vorher gar nicht gerendert, obwohl data/sponsoren.json das Feld führt).
const ICON_INSTAGRAM =
  '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none"/></svg>';

function logoEintrag(sponsor, daten) {
  const logoHtml = bild({
    pfad: PFAD,
    daten,
    name: sponsor.logo.quelle,
    alt: sponsor.firma ? `Logo ${sponsor.firma}` : "Sponsor-Logo",
    sizes: "140px",
  });

  const nameText = [sponsor.firma, sponsor.ort].filter(Boolean).join(", ");
  let href = sponsor.link ?? null;
  if (href && !/^https?:\/\//i.test(href)) href = "http://" + href;
  const nameHtml = href
    ? `<a href="${escapeHtml(href)}" rel="noopener" target="_blank">${escapeHtml(nameText)}</a>`
    : escapeHtml(nameText);

  // vmapit: zusätzlicher Satz zur appack-Plattform unter dem Namen. W3,
  // Abschnitt 7: "bisherige Website" irritiert auf der aktuellen Website –
  // durch "Website" ersetzt.
  const vmapitZusatz =
    sponsor.firma === "vmapit GmbH"
      ? `<p class="meta">Die Vereins-App und die Website laufen auf der Plattform appack der vmapit GmbH.</p>`
      : "";

  const instagramHtml = sponsor.instagram
    ? `<p class="meta"><a href="${escapeHtml(`https://instagram.com/${String(sponsor.instagram).replace(/^@/, "")}`)}" rel="noopener" target="_blank" aria-label="Instagram">${ICON_INSTAGRAM} Instagram</a></p>`
    : "";

  return `<li>
      <span class="logo-reihe__kachel">${logoHtml}</span>
      <div class="logo-reihe__info">
        <p class="meta">${nameHtml}</p>
        ${vmapitZusatz}
        ${instagramHtml}
      </div>
    </li>`;
}

function seitenkopfAbschnitt() {
  return `<section class="abschnitt seitenkopf">
  <div class="container">
    ${ruecklink(`${PFAD}verein/`, "Verein")}
    <h1>Sponsoren &amp; Partner</h1>
    <p class="seitenkopf__lead">Ohne Unterstützung kein Vereinsleben. Danke an alle, die die Sportfreunde tragen.</p>
  </div>
</section>`;
}

function partnerAbschnitt(sponsoren, daten) {
  const eintraege = sponsoren
    .filter((s) => s.kategorie === "Partner")
    .map((s) => logoEintrag(s, daten))
    .join("\n    ");

  return `<section class="abschnitt">
  <div class="container fluss">
    <h2>Partner</h2>
    <ul class="logo-reihe" role="list">
    ${eintraege}
    </ul>
  </div>
</section>`;
}

// W3, Abschnitt 7 (Datenkorrektur data/sponsoren.json): VM Elite ist eine
// Fußballschule, kein App-Projektpartner – eigene Kategorie/Abschnitt.
function fussballschuleAbschnitt(sponsoren, daten) {
  const eintraege = sponsoren
    .filter((s) => s.kategorie === "Fußballschule")
    .map((s) => logoEintrag(s, daten))
    .join("\n    ");
  if (!eintraege) return "";

  return `<section class="abschnitt--hell abschnitt">
  <div class="container fluss">
    <h2>Fußballschule</h2>
    <ul class="logo-reihe" role="list">
    ${eintraege}
    </ul>
  </div>
</section>`;
}

function appProjektpartnerAbschnitt(sponsoren, daten) {
  const eintraege = sponsoren
    .filter((s) => s.kategorie === "App-Projektpartner")
    .map((s) => logoEintrag(s, daten))
    .join("\n    ");

  return `<section class="abschnitt">
  <div class="container fluss">
    <h2>App-Projektpartner</h2>
    <ul class="logo-reihe" role="list">
    ${eintraege}
    </ul>
  </div>
</section>`;
}

// W9-Korrektur (QA3 1440-3/390-1/quer-1, Entscheidung w9-gemeinsam.md): Der
// Verein siezt Firmen genau in diesem Abschnitt (sonst duzt die Website) –
// wörtlicher Wortlaut wie in der App (src/app/Sponsoren_v3.html).
function sponsorWerdenAbschnitt() {
  return `<section class="abschnitt--blau abschnitt abschnitt--eng">
  <div class="container fluss">
    <h2>Sponsor werden</h2>
    <p class="inhalt">Sie möchten die Sportfreunde 04 unterstützen&nbsp;– als Trikotsponsor, mit einer Bandenwerbung oder als Partner der Jugendabteilung? Schreiben Sie uns, wir melden uns zeitnah.</p>
    <p class="knopfzeile">
      <a class="knopf knopf--weiss" href="mailto:geschaeftsstelle@sportfreunde04.de?subject=Sponsoring%20FFV%20Sportfreunde%2004">E-Mail an die Geschäftsstelle</a>
    </p>
  </div>
</section>`;
}

export function seite(daten) {
  const sponsoren = daten.sponsoren ?? [];

  const inhalt = [
    seitenkopfAbschnitt(),
    partnerAbschnitt(sponsoren, daten),
    fussballschuleAbschnitt(sponsoren, daten),
    appProjektpartnerAbschnitt(sponsoren, daten),
    sponsorWerdenAbschnitt(),
  ].join("\n");

  return {
    url: "/verein/sponsoren/",
    title: "Sponsoren & Partner",
    description:
      "Partner und Sponsoren des FFV Sportfreunde 04 in Frankfurt – und wie Unternehmen den Verein als Sponsor unterstützen können.",
    inhalt,
  };
}
