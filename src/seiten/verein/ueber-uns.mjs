// Über uns /verein/ueber-uns/ (W3) – Vereinsgeschichte, Zahlen und
// Kinderschutz. Bis W3 war das der Inhalt von /verein/ selbst (siehe
// git-history von src/seiten/verein/index.mjs); die Seite ist jetzt
// eigenständig, weil /verein/ zum Verteiler wie in der App wurde
// (W3-Spezifikation Abschnitt 1). Inhalt unverändert übernommen, nur der
// Seitenkopf (Brotkrume statt Verteiler-Lead) und der Rücklink sind neu.

import { ruecklink } from "../../vorlagen/hilfen.mjs";
import { personKarte, downloadZeile } from "../../vorlagen/bausteine.mjs";

// Diese Seite liegt immer unter "/verein/ueber-uns/" (Tiefe 2), daher immer
// "../../" (siehe pfadZurWurzel() in tools/build.mjs).
const PFAD = "../../";

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function downloadEintrag(daten, titelTeil) {
  return (daten.downloads ?? []).find((d) => (d.titel ?? "").includes(titelTeil));
}

// ---------- Seitenkopf ----------

function seitenkopfAbschnitt() {
  return `<section class="abschnitt seitenkopf">
  <div class="container">
    ${ruecklink(`${PFAD}verein/`, "Verein")}
    <h1>Über uns</h1>
    <p class="seitenkopf__lead">Seit 1904 im Frankfurter Gallus zu Hause: unsere Geschichte, unsere Werte und der Verein in Zahlen.</p>
  </div>
</section>`;
}

// ---------- Geschichte/Werte (drei Absätze) ----------

function geschichteAbschnitt(daten) {
  const philosophie = downloadEintrag(daten, "Vereinsphilosophie");
  const chronik = downloadEintrag(daten, "Vereinschronik");

  return `<section class="abschnitt">
  <div class="container fluss">
    <p class="inhalt">Gegründet wurde der Verein am 15.&nbsp;Mai 1904 als Frankfurter FC Britannia. Nach dem Ersten Weltkrieg erhielt er 1919 seinen heutigen Namen. Der sportliche Höhepunkt war die Saison 1955/56 in der 1.&nbsp;Amateurliga Hessen; seit den 1960er Jahren spielen die Sportfreunde in den Klassen des Fußballkreises Frankfurt.</p>
    <p class="inhalt">Heute stellt der Verein elf Fußballmannschaften – von der 1.&nbsp;Herrenmannschaft bis zur G‑Jugend – und die Karnevalabteilung „Die Schnauzer“ mit fünf Gruppen. Trainiert und gespielt wird auf dem eigenen Platz an der Mainzer Landstraße 480. Die Herren und die A‑Jugend tragen ihre Heimspiele auf der Bezirkssportanlage am Rebstock (SW Griesheim), Am Römerhof 9, 60486&nbsp;Frankfurt am&nbsp;Main aus.</p>
    <p class="inhalt">Unser Leitsatz aus der Vereinsphilosophie: „Wir wollen nicht nur erfolgreiche Mannschaften entwickeln, sondern erfolgreiche Menschen und einen starken Verein für kommende Generationen.“ Unsere Werte sind Gemeinschaft, Respekt, Wertschätzung, Verantwortung, Fairness, Entwicklung und Kinderschutz.</p>
    <p class="knopfzeile">
      <a class="knopf" href="https://cdn.appack.de/sportfreunde04/workspace/web/chronik.html">Vereinschronik lesen</a>
    </p>
    <ul class="downloads" role="list">
      ${downloadZeile(chronik, PFAD)}
      ${downloadZeile(philosophie, PFAD)}
    </ul>
  </div>
</section>`;
}

// ---------- Zahlen ----------

function zahlenAbschnitt() {
  const zahlen = [
    ["1904", "gegründet"],
    ["11", "Fußballmannschaften"],
    ["5", "Karnevalgruppen"],
    ["2", "Abteilungen"],
  ];
  const kacheln = zahlen
    .map(
      ([wert, label]) => `<div class="zahl">
        <span class="zahl__wert">${escapeHtml(wert)}</span>
        <span class="zahl__label">${escapeHtml(label)}</span>
      </div>`
    )
    .join("\n      ");

  return `<section class="abschnitt--blau abschnitt">
  <div class="container fluss">
    <h2>Der Verein in Zahlen</h2>
    <div class="raster raster--4 raster--2-mobil">
      ${kacheln}
    </div>
  </div>
</section>`;
}

// ---------- Kinderschutz ----------

// W8-Korrektur: dieselbe Personen-Karte wie Vorstand/Karneval
// (personKarte() aus bausteine.mjs) statt eines einzelnen großen Porträts
// mit viel Leerraum daneben. W9-Korrektur (QA3 1440-14, w9-b.md): Download
// jetzt als derselbe Download-Baustein (downloadZeile()) wie die übrigen
// PDFs auf dieser Seite und auf "Downloads & Anträge" – vorher ein
// Umrandungsknopf mit "(PDF)" im Text, während die Chronik/Vereinsphilosophie
// direkt darüber schon als Linkliste standen (zwei verschiedene Formen für
// dieselbe Aufgabe auf einer Seite).
function kinderschutzAbschnitt(daten) {
  const beauftragter = (daten.vorstand ?? []).find((p) => p.funktion === "Kinderschutzbeauftragter");
  const konzept = downloadEintrag(daten, "Präventions- und Schutzkonzept");

  return `<section class="abschnitt--hell abschnitt">
  <div class="container fluss">
    <h2>Kinder- und Jugendschutz</h2>
    <p class="inhalt">Das Wohl von Kindern und Jugendlichen steht für uns über allem. Unser Präventions- und Schutzkonzept sowie die Vorgaben von HFV und DFB bilden den verbindlichen Rahmen.</p>
    ${personKarte(beauftragter, daten, { pfad: PFAD, prioritaet: true, einzeln: true })}
    <ul class="downloads" role="list">
      ${downloadZeile(konzept, PFAD)}
    </ul>
  </div>
</section>`;
}

export function seite(daten) {
  const inhalt = [
    seitenkopfAbschnitt(),
    geschichteAbschnitt(daten),
    zahlenAbschnitt(),
    kinderschutzAbschnitt(daten),
  ].join("\n");

  return {
    url: "/verein/ueber-uns/",
    title: "Über uns",
    description:
      "Über uns: seit 1904 im Frankfurter Gallus, elf Fußballmannschaften, Karnevalabteilung Die Schnauzer, Werte und Kinderschutz des FFV Sportfreunde 04",
    inhalt,
  };
}
