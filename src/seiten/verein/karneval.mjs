// Karnevalabteilung /verein/karneval/ (P5) – fünf Gruppen aus
// data/karneval.json plus Ansprechpartner aus data/vorstand.json.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bild } from "../../vorlagen/bild.mjs";
import { mailLink } from "../../vorlagen/hilfen.mjs";

// Diese Seite liegt immer unter "/verein/karneval/" (Tiefe 2), daher immer
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

// Platzhalter für Seiten, die im aktuellen Paket noch nicht existieren –
// gleiches Muster wie header.mjs/footer.mjs (siehe navigation.mjs).
function baldSpan(titel) {
  return `<span class="nav__bald" aria-disabled="true" title="Seite folgt">${escapeHtml(titel)}</span>`;
}

// Personen-Karte – mit Foto oder Wappen-Platzhalter bei --blau-100 (siehe
// .person__bild--platzhalter in komponenten.css).
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

  return `<div class="person">
      ${bildHtml}
      <p class="person__name">${nameHtml}</p>
      <p class="person__funktion">${escapeHtml(person?.funktion ?? "")}</p>
      ${mailHtml}
    </div>`;
}

function seitenkopfAbschnitt() {
  return `<section class="abschnitt seitenkopf">
  <div class="container">
    <span class="seitenkopf__kicker">Zweite Abteilung des Vereins</span>
    <h1>Karnevalabteilung „Die Schnauzer“</h1>
    <p class="seitenkopf__lead">Fünf Gruppen, eine Bühne: Die Karnevalabteilung des Frankfurter Fußballvereins Sportfreunde 1904 e.V.</p>
  </div>
</section>`;
}

// Je Gruppe: Titel, Leitung (mit Komma verbunden), Übungsstunde – oder ein
// kleiner .hinweis--offen, wenn die Übungszeit noch nicht feststeht.
function gruppenKarte(gruppe) {
  const leitungText = (gruppe.leitung ?? []).join(", ");
  const uebungszeitHtml = gruppe.uebungszeit
    ? `<p class="meta">Übungsstunde: ${escapeHtml(gruppe.uebungszeit)}</p>`
    : `<div class="hinweis hinweis--offen"><p style="margin:0;">Übungszeit: Angabe folgt.</p></div>`;

  return `<div class="karte fluss">
      <span class="karte__titel">${escapeHtml(gruppe.name)}</span>
      <p class="meta">Leitung: ${escapeHtml(leitungText)}</p>
      ${uebungszeitHtml}
    </div>`;
}

function gruppenAbschnitt(karneval) {
  const karten = (karneval.gruppen ?? []).map(gruppenKarte).join("\n    ");
  return `<section class="abschnitt">
  <div class="container fluss">
    <div class="raster raster--3">
    ${karten}
    </div>
  </div>
</section>`;
}

// Die drei Karneval-Funktionen aus data/vorstand.json: Abteilungsleiter (mit
// Foto), Kassiererin und Schriftführerin (mit Platzhalter).
function ansprechpartnerAbschnitt(daten) {
  const funktionen = ["Abteilungsleiter Karneval", "Kassiererin Abteilung Karneval", "Schriftführerin Abteilung Karneval"];
  const personen = funktionen
    .map((f) => (daten.vorstand ?? []).find((p) => p.funktion === f))
    .filter(Boolean);
  const karten = personen.map((p) => personKarte(p, daten)).join("\n      ");

  return `<section class="abschnitt--hell abschnitt">
  <div class="container fluss">
    <h2>Ansprechpartner</h2>
    <div class="raster raster--3">
      ${karten}
    </div>
    <p class="knopfzeile">
      <a class="knopf" href="mailto:karnevalabteilung@sportfreunde04.de">E-Mail an die Karnevalabteilung</a>
    </p>
  </div>
</section>`;
}

function hinweisAbschnitt() {
  return `<section class="abschnitt">
  <div class="container">
    <p class="meta">Beiträge der Karnevalabteilung stehen unter „${baldSpan("Mitglied werden")}“.</p>
  </div>
</section>`;
}

export function seite(daten) {
  const karneval = daten.karneval ?? {};

  const inhalt = [
    seitenkopfAbschnitt(),
    gruppenAbschnitt(karneval),
    ansprechpartnerAbschnitt(daten),
    hinweisAbschnitt(),
  ].join("\n");

  return {
    url: "/verein/karneval/",
    title: "Karnevalabteilung",
    // Wörtlicher Plan-Text hat 173 Zeichen (Gate in tools/pruefen.mjs: max.
    // 170) – kleinstmögliche Korrektur nach dem Muster von P2 (siehe
    // src/seiten/index.mjs): "Karnevalabteilung des FFV" zu
    // "Karnevalabteilung FFV" gekürzt und abschließenden Punkt entfernt (168
    // Zeichen), Wortlaut sonst unverändert. Siehe Abschlussbericht,
    // Abschnitt „Abweichungen“.
    description:
      "Die Schnauzer – Karnevalabteilung FFV Sportfreunde 04: Dreamboys, Little Fruities, Freaky Fruities, Flying Fruities und Pfläumchen mit Übungszeiten und Ansprechpartnern",
    inhalt,
  };
}
