// Karnevalabteilung /verein/karneval/ (P5) – fünf Gruppen aus
// data/karneval.json plus Ansprechpartner aus data/vorstand.json.

import { personKarte } from "../../vorlagen/bausteine.mjs";

// Diese Seite liegt immer unter "/verein/karneval/" (Tiefe 2), daher immer
// "../../" (siehe pfadZurWurzel() in tools/build.mjs).
const PFAD = "../../";

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
    <span class="seitenkopf__kicker">Zweite Abteilung des Vereins</span>
    <h1>Karneval – Die Schnauzer</h1>
    <p class="seitenkopf__lead">Fünf Gruppen, eine Bühne: Die Karnevalabteilung des Frankfurter Fußballvereins Sportfreunde 1904&nbsp;e.&nbsp;V.</p>
  </div>
</section>`;
}

// Je Gruppe: Titel, Leitung (mit Komma verbunden), Übungsstunde – wenn noch
// nicht gepflegt, bleibt die Zeile weg (W3, Abschnitt 7: keine
// "Angabe folgt"-Kästen mehr; stattdessen ein Satz unter den Karten, siehe
// uebungszeitHinweisAbschnitt() unten).
function gruppenKarte(gruppe) {
  const leitungText = (gruppe.leitung ?? []).join(", ");
  const uebungszeitHtml = gruppe.uebungszeit
    ? `<p class="meta">Übungsstunde: ${escapeHtml(gruppe.uebungszeit)}</p>`
    : "";

  return `<div class="karte fluss">
      <span class="karte__titel">${escapeHtml(gruppe.name)}</span>
      <p class="meta">Leitung: ${escapeHtml(leitungText)}</p>
      ${uebungszeitHtml}
    </div>`;
}

// W8-Korrektur: Der Satz "Übungszeiten der übrigen Gruppen nennt die
// Abteilung auf Anfrage." (unter dem Ansprechpartner-Abschnitt) stand nicht
// bei der Gruppenliste, auf die er sich bezieht – jetzt direkt darunter, mit
// dem vorgegebenen Wortlaut und dem Mail-Knopf.
function gruppenAbschnitt(karneval) {
  const karten = (karneval.gruppen ?? []).map(gruppenKarte).join("\n    ");
  return `<section class="abschnitt">
  <div class="container fluss">
    <div class="raster raster--3">
    ${karten}
    </div>
    <p class="meta">Übungszeiten und Ort erfährst du bei der Karnevalabteilung.</p>
    <p class="knopfzeile">
      <a class="knopf knopf--sekundaer" href="${escapeHtml(`mailto:${karneval.mail ?? "karnevalabteilung@sportfreunde04.de"}`)}">E-Mail an die Karnevalabteilung</a>
    </p>
  </div>
</section>`;
}

// Die drei Karneval-Funktionen aus data/vorstand.json: Abteilungsleiter (mit
// Foto), Kassiererin und Schriftführerin (mit Platzhalter, W8: Initialen
// statt Wappen wie beim Vorstand). Alle drei teilen dieselbe Adresse
// (karnevalabteilung@sportfreunde04.de) wie der Knopf am Seitenende – die
// Adresse steht deshalb bewusst nur einmal (mail:null je Karte), nicht
// zusätzlich viermal auf der Seite.
//
// W3b, Prüfer-Befund "klein": der frühere eigene "Übungszeiten"-
// Hinweisabschnitt hatte einen zweiten, gleichlautenden Knopf direkt über
// diesem Abschnitt mit fest kodierter Mailadresse – entfällt jetzt (siehe
// gruppenAbschnitt() oben). W8-Korrektur: der graue Schlussabschnitt mit dem
// Mitglied-werden-Verweis (vorher ein eigener Abschnitt ganz unten) ist jetzt
// hier mit eingezogen.
function ansprechpartnerAbschnitt(daten) {
  const funktionen = ["Abteilungsleiter Karneval", "Kassiererin Abteilung Karneval", "Schriftführerin Abteilung Karneval"];
  const personen = funktionen
    .map((f) => (daten.vorstand ?? []).find((p) => p.funktion === f))
    .filter(Boolean);
  const karten = personen
    .map((p) => personKarte({ ...p, mail: null }, daten, { pfad: PFAD }))
    .join("\n      ");

  return `<section class="abschnitt--hell abschnitt">
  <div class="container fluss">
    <h2>Ansprechpartner</h2>
    <div class="raster raster--personen">
      ${karten}
    </div>
    <p class="meta">Beiträge der Karnevalabteilung stehen unter „<a href="${PFAD}mitglied-werden/">Mitglied werden</a>“.</p>
  </div>
</section>`;
}

export function seite(daten) {
  const karneval = daten.karneval ?? {};

  const inhalt = [
    seitenkopfAbschnitt(),
    gruppenAbschnitt(karneval),
    ansprechpartnerAbschnitt(daten),
  ].join("\n");

  return {
    url: "/verein/karneval/",
    // W3b, Prüfer-Befund "klein": title an H1 ("Karneval – Die Schnauzer")
    // angeglichen, wie überall sonst einheitlich "Karneval" genannt.
    title: "Karneval",
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
