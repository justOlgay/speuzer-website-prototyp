// Verein-Übersicht /verein/ (P5) – "Wer wir sind": Vereinsgeschichte, Zahlen,
// Kinderschutz und ein Raster mit Links auf die weiteren Verein-Unterseiten.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bild } from "../../vorlagen/bild.mjs";
import { mailLink } from "../../vorlagen/hilfen.mjs";

// Diese Seite liegt immer unter "/verein/" (Tiefe 1), daher immer "../"
// (siehe pfadZurWurzel() in tools/build.mjs).
const PFAD = "../";

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

// Platzhalter für Seiten, die im aktuellen Paket noch nicht existieren –
// gleiches Muster wie header.mjs/footer.mjs (siehe navigation.mjs). Hier als
// ganze .karte--link, wie im Styleguide-Beispiel (P1/P2) vorgezeichnet.
function baldKarte(titel, meta) {
  return `<span class="karte karte--link" aria-disabled="true" title="Seite folgt">
      <span class="karte__titel">${escapeHtml(titel)}</span>
      <span class="karte__meta">${escapeHtml(meta)}</span>
    </span>`;
}

function linkKarte(titel, meta, ziel) {
  return `<a class="karte karte--link" href="${ziel}">
      <span class="karte__titel">${escapeHtml(titel)}</span>
      <span class="karte__meta">${escapeHtml(meta)}</span>
    </a>`;
}

// Personen-Karte (Kinderschutzbeauftragter) – mit Foto oder Wappen-Platzhalter
// bei --blau-100 (siehe .person__bild--platzhalter in komponenten.css).
function personKarte(person, daten) {
  const bildHtml = person?.foto
    ? bild({
        pfad: PFAD,
        daten,
        name: person.foto.quelle,
        alt: person.name ? `Porträt ${person.name}` : "",
        sizes: "(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw",
        klasse: "person__bild",
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

// Download-Eintrag per Titel-Teilstring finden (data/downloads.json).
function downloadEintrag(daten, titelTeil) {
  return (daten.downloads ?? []).find((d) => (d.titel ?? "").includes(titelTeil));
}

// Link auf einen Download-Eintrag: intern (Pfad beginnt mit "/") ohne
// target/rel, extern (cdn.appack.de) mit rel="noopener" target="_blank".
function downloadKnopf(eintrag, text) {
  if (!eintrag) return "";
  const istIntern = (eintrag.datei ?? "").startsWith("/");
  const href = istIntern ? PFAD + eintrag.datei.replace(/^\//, "") : eintrag.datei;
  const attrs = istIntern ? "" : ' rel="noopener" target="_blank"';
  return `<a class="knopf knopf--sekundaer" href="${escapeHtml(href)}"${attrs}>${escapeHtml(text)}</a>`;
}

// ---------- Seitenkopf ----------

function seitenkopfAbschnitt() {
  return `<section class="abschnitt seitenkopf">
  <div class="container">
    <h1>Wer wir sind</h1>
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
    <p class="inhalt">Heute stellt der Verein elf Fußballmannschaften – von der G-Jugend bis zur 1. Herrenmannschaft – und die Karnevalabteilung „Die Schnauzer“ mit fünf Gruppen. Trainiert und gespielt wird auf dem eigenen Platz an der Mainzer Landstraße 480; die Herren tragen ihre Heimspiele auf der Anlage am Rebstock aus.</p>
    <p class="inhalt">Unser Leitsatz aus der Vereinsphilosophie: „Wir wollen nicht nur erfolgreiche Mannschaften entwickeln, sondern erfolgreiche Menschen und einen starken Verein für kommende Generationen.“ Unsere Werte sind Gemeinschaft, Respekt, Wertschätzung, Verantwortung, Fairness, Entwicklung und Kinderschutz.</p>
    <p class="knopfzeile">
      ${downloadKnopf(philosophie, "Vereinsphilosophie lesen (PDF, 50 Seiten)")}
      ${downloadKnopf(chronik, "Chronik (PDF, 27 Seiten)")}
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

// ---------- Mehr über den Verein ----------

function mehrAbschnitt() {
  const karten = [
    linkKarte("Vorstand", "Wer den Verein führt – mit Funktion und Vereinsmail.", `${PFAD}verein/vorstand/`),
    linkKarte("Sponsoren & Partner", "Wer uns unterstützt – und wie Sie Sponsor werden.", `${PFAD}verein/sponsoren/`),
    linkKarte("Mach mit", "Trainer, Betreuer, Vorstand, Ehrenamt – wir suchen Verstärkung.", `${PFAD}verein/mach-mit/`),
    linkKarte("Karnevalabteilung", "Die Schnauzer: fünf Gruppen, eine Bühne.", `${PFAD}verein/karneval/`),
    linkKarte("Downloads", "Satzung, Beiträge, Anmeldung, Schutzkonzept.", `${PFAD}verein/downloads/`),
    // P8: /kontakt/ existiert jetzt – echter Link statt baldKarte().
    linkKarte("Kontakt & Anfahrt", "So erreichen Sie uns.", `${PFAD}kontakt/`),
  ].join("\n    ");

  return `<section class="abschnitt">
  <div class="container fluss">
    <h2>Mehr über den Verein</h2>
    <div class="raster raster--3">
    ${karten}
    </div>
  </div>
</section>`;
}

export function seite(daten) {
  const inhalt = [
    seitenkopfAbschnitt(),
    geschichteAbschnitt(daten),
    zahlenAbschnitt(),
    kinderschutzAbschnitt(daten),
    mehrAbschnitt(),
  ].join("\n");

  return {
    url: "/verein/",
    title: "Verein",
    // Wörtlicher Plan-Text hat 184 Zeichen (Gate in tools/pruefen.mjs: max.
    // 170) – kleinstmögliche Korrektur nach dem Muster von P2 (siehe
    // src/seiten/index.mjs): "Wer die Sportfreunde 04 sind:" zu
    // "Sportfreunde 04:" gekürzt und abschließenden Punkt entfernt (170
    // Zeichen), Wortlaut sonst unverändert. Siehe Abschlussbericht,
    // Abschnitt „Abweichungen“.
    description:
      "Sportfreunde 04: seit 1904 im Frankfurter Gallus, elf Fußballmannschaften, Karnevalabteilung Die Schnauzer, Werte und Kinderschutz – mit Vorstand, Sponsoren und Downloads",
    inhalt,
  };
}
