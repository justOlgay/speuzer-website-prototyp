// Sponsoren & Partner /verein/sponsoren/ (P5) – zwei Logo-Reihen (Partner,
// App-Projektpartner) aus data/sponsoren.json plus Aufruf "Sponsor werden".

import { bild } from "../../vorlagen/bild.mjs";

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

// Logo (bild(), contain, max-height 72px und weiße Kachel bereits über
// .logo-reihe__kachel in komponenten.css), darunter Firma, ggf. Ort als
// .meta; Link nur wenn vorhanden (extern, rel="noopener", http:// ergänzt,
// wenn das Feld ohne Schema geliefert wurde).
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

  // vmapit: zusätzlicher Satz zur appack-Plattform unter dem Namen.
  const vmapitZusatz =
    sponsor.firma === "vmapit GmbH"
      ? `<p class="meta">Die Vereins-App und die bisherige Website laufen auf der Plattform appack der vmapit GmbH.</p>`
      : "";

  return `<li>
      <span class="logo-reihe__kachel">${logoHtml}</span>
      <p class="meta" style="margin-top:var(--sp-2);text-align:center;">${nameHtml}</p>
      ${vmapitZusatz}
    </li>`;
}

function seitenkopfAbschnitt() {
  return `<section class="abschnitt seitenkopf">
  <div class="container">
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

function appProjektpartnerAbschnitt(sponsoren, daten) {
  const eintraege = sponsoren
    .filter((s) => s.kategorie === "App-Projektpartner")
    .map((s) => logoEintrag(s, daten))
    .join("\n    ");

  return `<section class="abschnitt--hell abschnitt">
  <div class="container fluss">
    <h2>App-Projektpartner</h2>
    <ul class="logo-reihe" role="list">
    ${eintraege}
    </ul>
  </div>
</section>`;
}

function sponsorWerdenAbschnitt() {
  return `<section class="abschnitt--blau abschnitt abschnitt--eng">
  <div class="container fluss">
    <h2>Sponsor werden</h2>
    <p>Sie möchten die Sportfreunde 04 unterstützen – als Trikotsponsor, mit einer Bandenwerbung oder als Partner der Jugendabteilung? Schreiben Sie uns, wir melden uns zeitnah.</p>
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
