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
// komponenten.css), daneben/darunter Firma, ggf. Ort; Link/Instagram nur
// wenn vorhanden, als kleine Knöpfe mit Symbol und Text (Entscheidung F,
// w10-gemeinsam.md). W9-Korrektur (Entscheidung "Sponsoren"-Raster,
// w9-b.md): Instagram-Symbol, wenn sponsor.instagram gesetzt ist (vorher gar
// nicht gerendert, obwohl data/sponsoren.json das Feld führt).
const ICON_INSTAGRAM =
  '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none"/></svg>';
const ICON_WEBSITE =
  '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.6 2.4 4 5.4 4 8.5s-1.4 6.1-4 8.5c-2.6-2.4-4-5.4-4-8.5s1.4-6.1 4-8.5Z"/></svg>';

// W10-Korrektur (QA4 web-1440-verein-und-rest Nr. 27/quervergleich Nr. 9):
// der Name war bisher entweder ein blauer Link (mit sponsor.link) oder
// grauer Text – zwei verschiedene Bausteine für dieselbe Angabe. Der Name
// steht jetzt immer gleich; ein vorhandener Link bzw. das Instagram-Profil
// erscheinen stattdessen als eigener kleiner Knopf mit Symbol UND Text
// darunter ("Website"/"Instagram", echtes Instagram-Symbol statt reinem
// Text-Link).
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

  // vmapit: zusätzlicher Satz zur appack-Plattform unter dem Namen. W3,
  // Abschnitt 7: "bisherige Website" irritiert auf der aktuellen Website –
  // durch "Website" ersetzt.
  const vmapitZusatz =
    sponsor.firma === "vmapit GmbH"
      ? `<p class="meta">Die Vereins-App und die Website laufen auf der Plattform appack der vmapit GmbH.</p>`
      : "";

  const websiteKnopf = href
    ? `<a class="knopf--icon" href="${escapeHtml(href)}" rel="noopener" target="_blank">${ICON_WEBSITE}Website</a>`
    : "";
  const instagramKnopf = sponsor.instagram
    ? `<a class="knopf--icon" href="${escapeHtml(`https://instagram.com/${String(sponsor.instagram).replace(/^@/, "")}`)}" rel="noopener" target="_blank">${ICON_INSTAGRAM}Instagram</a>`
    : "";
  const aktionenHtml =
    websiteKnopf || instagramKnopf
      ? `<p class="logo-reihe__aktionen">${websiteKnopf}${instagramKnopf}</p>`
      : "";

  return `<li>
      <span class="logo-reihe__kachel">${logoHtml}</span>
      <div class="logo-reihe__info">
        <p class="meta logo-reihe__name">${escapeHtml(nameText)}</p>
        ${vmapitZusatz}
        ${aktionenHtml}
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
// Fußballschule, kein App-Projektpartner. W10-Korrektur (QA4
// web-1440-verein-und-rest Nr. 2): "Fußballschule" und "App-Projektpartner"
// standen bisher in zwei eigenen Abschnitten mit wechselndem Hintergrund,
// aber jeweils nur einer Karte – auf dem Desktop blieb der Großteil der
// Breite leer. Beide Kategorien (Namen bleiben) stehen jetzt nebeneinander
// in einem gemeinsamen Abschnitt (.sponsor-kategorien, komponenten.css).
// `logo-reihe--einzeln` verhindert, dass eine einzelne Kachel auf einen
// Bruchteil der (jetzt halbierten) Spaltenbreite gestaucht wird.
function kategorieSpalte(titel, sponsoren, kategorie, daten) {
  const eintraege = sponsoren.filter((s) => s.kategorie === kategorie);
  if (!eintraege.length) return "";
  const liste = eintraege.map((s) => logoEintrag(s, daten)).join("\n      ");
  const listenKlasse = eintraege.length === 1 ? "logo-reihe logo-reihe--einzeln" : "logo-reihe";

  return `<div class="sponsor-kategorie fluss">
      <h2>${escapeHtml(titel)}</h2>
      <ul class="${listenKlasse}" role="list">
      ${liste}
      </ul>
    </div>`;
}

function fussballschuleUndPartnerAbschnitt(sponsoren, daten) {
  const spalten = [
    kategorieSpalte("Fußballschule", sponsoren, "Fußballschule", daten),
    kategorieSpalte("App-Projektpartner", sponsoren, "App-Projektpartner", daten),
  ]
    .filter(Boolean)
    .join("\n    ");
  if (!spalten) return "";

  return `<section class="abschnitt--hell abschnitt">
  <div class="container fluss">
    <div class="sponsor-kategorien">
    ${spalten}
    </div>
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
    fussballschuleUndPartnerAbschnitt(sponsoren, daten),
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
