// Downloads /verein/downloads/ (P5) – Gruppen aus data/downloads.json in
// fester Reihenfolge (Anmeldung, Verein, Kinder- und Jugendschutz).

import { ruecklink } from "../../vorlagen/hilfen.mjs";
import { downloadZeile } from "../../vorlagen/bausteine.mjs";

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

function seitenkopfAbschnitt() {
  return `<section class="abschnitt seitenkopf">
  <div class="container">
    ${ruecklink(`${PFAD}verein/`, "Verein")}
    <h1>Downloads &amp; Anträge</h1>
    <p class="seitenkopf__lead">Satzung, Beiträge, Anmeldung und Schutzkonzept als PDF.</p>
  </div>
</section>`;
}

function gruppenAbschnitt(gruppe, downloads, index) {
  const eintraege = downloads.filter((d) => d.gruppe === gruppe);
  if (!eintraege.length) return "";
  const zeilen = eintraege.map((d) => downloadZeile(d, PFAD)).join("\n      ");
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

export function seite(daten) {
  const downloads = daten.downloads ?? [];

  // W8-Korrektur: Hinweis "Alle Dokumente öffnen sich als PDF in einem neuen
  // Fenster." entfernt (Prüfer-Befund) – die Links selbst öffnen weiterhin in
  // einem neuen Fenster (target="_blank", siehe downloadZeile() in
  // bausteine.mjs), nur der erklärende Satz dazu entfällt.
  const inhalt = [
    seitenkopfAbschnitt(),
    ...GRUPPEN_REIHENFOLGE.map((g, i) => gruppenAbschnitt(g, downloads, i)),
  ].join("\n");

  return {
    url: "/verein/downloads/",
    title: "Downloads & Anträge",
    description:
      "Downloads & Anträge des FFV Sportfreunde 04: Aufnahmeantrag, Beitragsübersicht, Satzung 2025, Präventions- und Schutzkonzept, Vereinsphilosophie und Chronik als PDF.",
    inhalt,
  };
}
