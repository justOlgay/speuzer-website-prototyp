// Downloads /verein/downloads/ (P5) – Gruppen aus data/downloads.json in
// fester Reihenfolge (Anmeldung, Verein, Kinder- und Jugendschutz).

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
// Werte weggelassen; das Feld "hinweis" wird nie ausgegeben). Interne Ziele
// (Pfad beginnt mit "/") ohne target/rel; externe (cdn.appack.de) mit
// target="_blank" rel="noopener" und zusätzlicher .meta-Zeile.
function downloadZeile(eintrag) {
  const istIntern = (eintrag.datei ?? "").startsWith("/");
  const href = istIntern ? PFAD + eintrag.datei.replace(/^\//, "") : eintrag.datei;
  const attrs = istIntern ? "" : ' rel="noopener" target="_blank"';

  const teile = ["PDF"];
  // Singular/Plural (P5-Korrektur A2): "1 Seite" statt "1 Seiten".
  if (eintrag.seiten) teile.push(`${eintrag.seiten} ${eintrag.seiten === 1 ? "Seite" : "Seiten"}`);
  if (eintrag.kb) teile.push(`${eintrag.kb} KB`);
  const metaText = teile.join(" · ");

  const externMeta = istIntern ? "" : `<span class="meta">öffnet cdn.appack.de</span>`;

  return `<li class="download">
      <a href="${escapeHtml(href)}"${attrs}>${escapeHtml(eintrag.titel)}</a>
      <span class="meta">${escapeHtml(metaText)}</span>
      ${externMeta}
    </li>`;
}

function seitenkopfAbschnitt() {
  return `<section class="abschnitt seitenkopf">
  <div class="container">
    <h1>Downloads</h1>
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
      <p style="margin:0;">Die Dokumente liegen derzeit auf dem Server der Vereins-App (cdn.appack.de). Im Prototyp werden sie von dort verlinkt.</p>
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
  ].join("\n");

  return {
    url: "/verein/downloads/",
    title: "Downloads",
    description:
      "Downloads des FFV Sportfreunde 04: Aufnahmeantrag, Beitragsübersicht, Satzung 2025, Präventions- und Schutzkonzept, Vereinsphilosophie und Chronik als PDF.",
    inhalt,
  };
}
