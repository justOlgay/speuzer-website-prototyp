// Downloads /verein/downloads/ (P5) – Gruppen aus data/downloads.json in
// fester Reihenfolge (Anmeldung, Verein, Kinder- und Jugendschutz).

import { brotkrume, ruecklinkAbschnitt } from "../../vorlagen/hilfen.mjs";

// Diese Seite liegt immer unter "/verein/downloads/" (Tiefe 2), daher immer
// "../../" (siehe pfadZurWurzel() in tools/build.mjs).
const PFAD = "../../";

const GRUPPEN_REIHENFOLGE = ["Anmeldung", "Verein", "Kinder- und Jugendschutz"];

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// Titel als Link, darunter .meta "PDF · {seiten} Seiten · {kb} KB" (fehlende
// Werte weggelassen; das Feld "hinweis" wird nie ausgegeben). W3, Abschnitt
// 7: alle PDF-Links öffnen in einem neuen Fenster (target="_blank"
// rel="noopener"), unabhängig davon, ob intern oder auf cdn.appack.de – die
// bisherige Extra-Zeile "öffnet cdn.appack.de" entfällt (Serverkunde für
// Besucher, siehe hinweisAbschnitt() unten für den ersetzenden Hinweis).
function downloadZeile(eintrag) {
  const istIntern = (eintrag.datei ?? "").startsWith("/");
  const href = istIntern ? PFAD + eintrag.datei.replace(/^\//, "") : eintrag.datei;

  const teile = ["PDF"];
  // Singular/Plural (P5-Korrektur A2): "1 Seite" statt "1 Seiten".
  if (eintrag.seiten) teile.push(`${eintrag.seiten} ${eintrag.seiten === 1 ? "Seite" : "Seiten"}`);
  if (eintrag.kb) teile.push(`${eintrag.kb} KB`);
  const metaText = teile.join(" · ");

  return `<li class="download">
      <a href="${escapeHtml(href)}" target="_blank" rel="noopener">${escapeHtml(eintrag.titel)}</a>
      <span class="meta">${escapeHtml(metaText)}</span>
    </li>`;
}

function seitenkopfAbschnitt() {
  return `<section class="abschnitt seitenkopf">
  <div class="container">
    ${brotkrume([{ text: "Verein", href: `${PFAD}verein/` }, { text: "Downloads & Anträge" }])}
    <h1>Downloads &amp; Anträge</h1>
    <p class="seitenkopf__lead">Satzung, Beiträge, Anmeldung und Schutzkonzept als PDF.</p>
  </div>
</section>`;
}

function gruppenAbschnitt(gruppe, downloads, index) {
  const eintraege = downloads.filter((d) => d.gruppe === gruppe);
  if (!eintraege.length) return "";
  const zeilen = eintraege.map(downloadZeile).join("\n      ");
  const hellKlasse = index % 2 === 1 ? " abschnitt--hell" : "";

  return `<section class="abschnitt${hellKlasse}">
  <div class="container fluss">
    <h2>${escapeHtml(gruppe)}</h2>
    <ul class="downloads" role="list">
      ${zeilen}
    </ul>
  </div>
</section>`;
}

function hinweisAbschnitt() {
  return `<section class="abschnitt">
  <div class="container">
    <div class="hinweis hinweis--info">
      <p style="margin:0;">Alle Dokumente öffnen sich als PDF in einem neuen Fenster.</p>
    </div>
  </div>
</section>`;
}

export function seite(daten) {
  const downloads = daten.downloads ?? [];

  const inhalt = [
    seitenkopfAbschnitt(),
    ...GRUPPEN_REIHENFOLGE.map((g, i) => gruppenAbschnitt(g, downloads, i)),
    hinweisAbschnitt(),
    ruecklinkAbschnitt(`${PFAD}verein/`, "Verein"),
  ].join("\n");

  return {
    url: "/verein/downloads/",
    title: "Downloads & Anträge",
    description:
      "Downloads & Anträge des FFV Sportfreunde 04: Aufnahmeantrag, Beitragsübersicht, Satzung 2025, Präventions- und Schutzkonzept, Vereinsphilosophie und Chronik als PDF.",
    inhalt,
  };
}
