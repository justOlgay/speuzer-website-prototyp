// Über uns /verein/ueber-uns/ (W3) – Vereinsgeschichte, Zahlen und
// Kinderschutz. Bis W3 war das der Inhalt von /verein/ selbst (siehe
// git-history von src/seiten/verein/index.mjs); die Seite ist jetzt
// eigenständig, weil /verein/ zum Verteiler wie in der App wurde
// (W3-Spezifikation Abschnitt 1). Inhalt unverändert übernommen, nur der
// Seitenkopf (Brotkrume statt Verteiler-Lead) und der Rücklink sind neu.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bild } from "../../vorlagen/bild.mjs";
import { mailLink, brotkrume, ruecklinkAbschnitt } from "../../vorlagen/hilfen.mjs";

// Diese Seite liegt immer unter "/verein/ueber-uns/" (Tiefe 2), daher immer
// "../../" (siehe pfadZurWurzel() in tools/build.mjs).
const PFAD = "../../";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

function liesWappenBlau() {
  return readFileSync(path.join(ROOT, "assets", "logo", "wappen-blau.svg"), "utf8");
}

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function personKarte(person, daten) {
  const bildHtml = person?.foto
    ? bild({
        pfad: PFAD,
        daten,
        name: person.foto.quelle,
        alt: person.name ? `Porträt ${person.name}` : "",
        sizes: "(min-width: 640px) 260px, 50vw",
        klasse: "person__bild",
        prioritaet: true,
      })
    : `<span class="person__bild person__bild--platzhalter" aria-hidden="true">${liesWappenBlau()}</span>`;
  const nameHtml = person?.name ? escapeHtml(person.name) : "derzeit nicht besetzt";
  const mailHtml = person?.mail ? `<p class="person__mail">${mailLink(person.mail)}</p>` : "";

  return `<div class="person" style="max-width:260px;">
      ${bildHtml}
      <p class="person__name">${nameHtml}</p>
      <p class="person__funktion">${escapeHtml(person?.funktion ?? "")}</p>
      ${mailHtml}
    </div>`;
}

function downloadEintrag(daten, titelTeil) {
  return (daten.downloads ?? []).find((d) => (d.titel ?? "").includes(titelTeil));
}

// Download-Knopf: alle PDF-Links öffnen in einem neuen Fenster
// (target="_blank" rel="noopener"), unabhängig davon, ob die Datei intern
// oder auf cdn.appack.de liegt (W3-Spezifikation Abschnitt 7, Befund
// verein-downloads.html: "auch Vereinsphilosophie/Chronik auf
// verein-ueber-uns.html").
function downloadKnopf(eintrag, text) {
  if (!eintrag) return "";
  const istIntern = (eintrag.datei ?? "").startsWith("/");
  const href = istIntern ? PFAD + eintrag.datei.replace(/^\//, "") : eintrag.datei;
  return `<a class="knopf knopf--sekundaer" href="${escapeHtml(href)}" target="_blank" rel="noopener">${escapeHtml(text)}</a>`;
}

// ---------- Seitenkopf ----------

function seitenkopfAbschnitt() {
  return `<section class="abschnitt seitenkopf">
  <div class="container">
    ${brotkrume([{ text: "Verein", href: `${PFAD}verein/` }, { text: "Über uns" }])}
    <h1>Über uns</h1>
    <p class="seitenkopf__lead">Frankfurter Fußballverein Sportfreunde 1904 e.V. – im Gallus sagt man einfach „die Speuzer“.</p>
  </div>
</section>`;
}

// ---------- Geschichte/Werte (drei Absätze) ----------

function geschichteAbschnitt(daten) {
  const philosophie = downloadEintrag(daten, "Vereinsphilosophie");
  const chronik = downloadEintrag(daten, "Chronik");

  return `<section class="abschnitt">
  <div class="container fluss">
    <p class="inhalt">Gegründet wurde der Verein am 15. Mai 1904 als Frankfurter FC Britannia. Nach dem Ersten Weltkrieg erhielt er 1919 seinen heutigen Namen. Der sportliche Höhepunkt war die Saison 1955/56 in der 1. Amateurliga Hessen; seit den 1960er Jahren spielen die Sportfreunde in den Klassen des Fußballkreises Frankfurt.</p>
    <p class="inhalt">Heute stellt der Verein elf Fußballmannschaften – von der 1. Herrenmannschaft bis zur G-Jugend – und die Karnevalabteilung „Die Schnauzer“ mit fünf Gruppen. Trainiert und gespielt wird auf dem eigenen Platz an der Mainzer Landstraße 480; die Herren tragen ihre Heimspiele auf der Anlage am Rebstock aus.</p>
    <p class="inhalt">Unser Leitsatz aus der Vereinsphilosophie: „Wir wollen nicht nur erfolgreiche Mannschaften entwickeln, sondern erfolgreiche Menschen und einen starken Verein für kommende Generationen.“ Unsere Werte sind Gemeinschaft, Respekt, Wertschätzung, Verantwortung, Fairness, Entwicklung und Kinderschutz.</p>
    <p class="knopfzeile">
      <a class="knopf" href="https://cdn.appack.de/sportfreunde04/workspace/web/chronik.html">Vereinschronik lesen</a>
      ${downloadKnopf(philosophie, "Vereinsphilosophie lesen (PDF, 50 Seiten)")}
      ${downloadKnopf(chronik, "Chronik als PDF (53 Seiten)")}
    </p>
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
    <div class="raster raster--4">
      ${kacheln}
    </div>
  </div>
</section>`;
}

// ---------- Kinderschutz ----------

function kinderschutzAbschnitt(daten) {
  const beauftragter = (daten.vorstand ?? []).find((p) => p.funktion === "Kinderschutzbeauftragter");
  const konzept = downloadEintrag(daten, "Präventions- und Schutzkonzept");

  return `<section class="abschnitt--hell abschnitt">
  <div class="container fluss">
    <h2>Kinderschutz</h2>
    <p class="inhalt">Das Wohl von Kindern und Jugendlichen steht für uns über allem. Unser Präventions- und Schutzkonzept sowie die Vorgaben von HFV und DFB bilden den verbindlichen Rahmen.</p>
    ${personKarte(beauftragter, daten)}
    <p class="knopfzeile">
      ${downloadKnopf(konzept, "Präventions- und Schutzkonzept (PDF)")}
    </p>
  </div>
</section>`;
}

export function seite(daten) {
  const inhalt = [
    seitenkopfAbschnitt(),
    geschichteAbschnitt(daten),
    zahlenAbschnitt(),
    kinderschutzAbschnitt(daten),
    ruecklinkAbschnitt(`${PFAD}verein/`, "Verein"),
  ].join("\n");

  return {
    url: "/verein/ueber-uns/",
    title: "Über uns",
    description:
      "Über uns: seit 1904 im Frankfurter Gallus, elf Fußballmannschaften, Karnevalabteilung Die Schnauzer, Werte und Kinderschutz des FFV Sportfreunde 04",
    inhalt,
  };
}
