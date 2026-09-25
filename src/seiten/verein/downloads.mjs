// Downloads /verein/downloads/ (P5) – Gruppen aus data/downloads.json in
// fester Reihenfolge (Anmeldung, Verein, Kinder- und Jugendschutz).

import { ruecklink, APP_MODUS_SKRIPT } from "../../vorlagen/hilfen.mjs";
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

// W9-Korrektur (QA3 1440-32): Die Seite heißt "Downloads & Anträge", verlinkt
// aber bisher nirgends den Online-Antrag aus /mitglied-werden/ (dort als
// APPACK_FORMULAR_URL). Gleicher Link, hier lokal (kein Helfer in
// hilfen.mjs, da außerhalb Mail/Telefon/Download/Personen).
const APPACK_FORMULAR_URL = "https://appack.de/rest-api/drender/6a903758337cdc97f94f2655";

// W10-Korrektur (QA4 web-1440-verein-und-rest Nr. 29): die Zeile hatte als
// einzige in der Liste keine graue Metazeile ("PDF · Seiten · Größe") und
// wirkte dadurch niedriger als ihre Nachbarn – jetzt mit "Online-Formular"
// im selben Baustein, wie die übrigen Einträge.
function aufnahmeantragOnlineZeile() {
  return `<li class="download">
      <a href="${escapeHtml(APPACK_FORMULAR_URL)}" target="_blank" rel="noopener">Aufnahmeantrag online ausfüllen ›</a>
      <span class="meta">Online-Formular</span>
    </li>`;
}

// W10-Nachprüfung (offen 12): die Liste lief bisher über die volle
// .container-Breite (bis 1304px), während derselbe Baustein auf
// /verein/ueber-uns/ auf die Lesebreite (.inhalt, 720px) begrenzt ist – ein
// Download-Baustein für die ganze Website soll überall gleich breit sein.
function gruppenAbschnitt(gruppe, downloads, index) {
  const eintraege = downloads.filter((d) => d.gruppe === gruppe);
  if (!eintraege.length) return "";
  const zeilenListe = eintraege.map((d) => downloadZeile(d, PFAD));
  // Direkt nach dem PDF-Aufnahmeantrag, in derselben Gruppe "Anmeldung".
  if (gruppe === "Anmeldung") {
    const pdfIndex = eintraege.findIndex((d) => d.titel.startsWith("Aufnahmeantrag"));
    zeilenListe.splice(pdfIndex === -1 ? 0 : pdfIndex + 1, 0, aufnahmeantragOnlineZeile());
  }
  const zeilen = zeilenListe.join("\n      ");
  const hellKlasse = index % 2 === 1 ? " abschnitt--hell" : "";

  return `<section class="abschnitt${hellKlasse}">
  <div class="container fluss">
    <h2>${escapeHtml(gruppe)}</h2>
    <ul class="downloads inhalt" role="list">
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
    // App-Modus (?app=1): Links führen in die App-Seiten, siehe hilfen.mjs
    kopfZusatz: APP_MODUS_SKRIPT,
    title: "Downloads & Anträge",
    description:
      "Downloads & Anträge des FFV Sportfreunde 04: Aufnahmeantrag, Beitragsübersicht, Satzung 2025, Präventions- und Schutzkonzept, Vereinsphilosophie und Chronik als PDF.",
    inhalt,
  };
}
