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

// W9-Korrektur (QA3 1440-25): Dachzeile "Zweite Abteilung des Vereins"
// entfernt – gibt es auf keiner anderen geprüften Seite, klang wie eine
// Rangfolge und ist für den Seiteninhalt nicht nötig.
// W10-Korrektur (QA4 web-390-verein-und-rest Nr. 13): die Umbruchsperre
// "Sportfreunde&nbsp;1904&nbsp;e.&nbsp;V." hielt auch "Sportfreunde" an
// "1904" fest – auf dem Handy passte "Fußballvereins Sportfreunde 1904 e.
// V." dann nirgends mehr in eine Zeile, "Fußballvereins" stand allein in
// einer eigenen, kurzen Zeile. Die Sperre jetzt nur noch auf "1904 e. V."
// beschränkt (wie überall sonst, siehe mitGeschuetztemVereinsnamen() in
// kontakt.mjs/impressum.mjs) – "Fußballvereins Sportfreunde" darf wieder
// gemeinsam in eine Zeile.
function seitenkopfAbschnitt() {
  return `<section class="abschnitt seitenkopf">
  <div class="container">
    <h1>Karneval – Die Schnauzer</h1>
    <p class="seitenkopf__lead">Fünf Gruppen, eine Bühne: Die Karnevalabteilung des Frankfurter Fußballvereins Sportfreunde 1904&nbsp;e.&nbsp;V.</p>
  </div>
</section>`;
}

// W9-Korrektur (QA3 1440-25): "Co-Trainerin" bricht sonst am Bindestrich um
// (data/karneval.json ist tabu, siehe W9-Auftrag – die Korrektur passiert
// deshalb hier an der Anzeige, nicht am Rohtext) – geschützter Bindestrich
// (U+2011) statt des normalen Bindestrichs.
function mitGeschuetztemBindestrich(text) {
  return String(text ?? "").replaceAll("Co-Trainerin", "Co‑Trainerin");
}

// W9-B-Nachprüfung (Karneval 1440, Dreamboys-Karte): "Mittwoch 19:00–21:00
// Uhr, Turnhalle Fridtjof-Nansen-Schule" (data/karneval.json, tabu) bricht
// sonst mitten in der Zeitspanne ("19:00–"/"21:00 Uhr") und mitten im
// Schulnamen ("Fridtjof-"/"Nansen-Schule") um – Korrektur nur an der Anzeige,
// wie bei mitGeschuetztemBindestrich() oben. Muss NACH escapeHtml() laufen
// (fügt ein <span> ein, das nicht mit-escaped werden darf).
function mitGeschuetzterUebungszeit(text) {
  return escapeHtml(text)
    .replace(/(\d{1,2}:\d{2}–\d{1,2}:\d{2}\s*Uhr)/, '<span style="white-space:nowrap;">$1</span>')
    .replaceAll("Fridtjof-Nansen-Schule", "Fridtjof‑Nansen‑Schule");
}

// Je Gruppe: Titel, Leitung (mit Komma verbunden), Übungszeit – wenn noch
// nicht gepflegt, bleibt die Zeile weg (W3, Abschnitt 7: keine
// "Angabe folgt"-Kästen mehr; stattdessen ein Satz unter den Karten, siehe
// uebungszeitHinweisAbschnitt() unten). W9-Korrektur (Entscheidung 14):
// Beschriftung einheitlich "Übungszeit" (vorher "Übungsstunde", während der
// Satz unter den Karten schon "Übungszeiten" sagte).
function gruppenKarte(gruppe) {
  const leitungText = mitGeschuetztemBindestrich((gruppe.leitung ?? []).join(", "));
  const uebungszeitHtml = gruppe.uebungszeit
    ? `<p class="meta">Übungszeit: ${mitGeschuetzterUebungszeit(gruppe.uebungszeit)}</p>`
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
// dem vorgegebenen Wortlaut und dem Mail-Knopf. W9-Korrektur (QA3 1440-25):
// eigenes Raster ".raster--karneval-gruppen" statt ".raster--3" – bei fünf
// Karten stand die fünfte sonst allein in einer zweiten Reihe mit drei
// leeren Plätzen; das neue Raster zeigt höchstens drei Karten je Zeile, die
// Restkarten zentriert (siehe komponenten.css). Knopf jetzt Primäraktion
// (gefüllt, Entscheidung 15 – gleich wie in der App).
function gruppenAbschnitt(karneval) {
  const karten = (karneval.gruppen ?? []).map(gruppenKarte).join("\n    ");
  return `<section class="abschnitt">
  <div class="container fluss">
    <div class="raster raster--karneval-gruppen">
    ${karten}
    </div>
    <p class="meta">Übungszeiten und Ort erfährst du bei der Karnevalabteilung.</p>
    <p class="knopfzeile">
      <a class="knopf" href="${escapeHtml(`mailto:${karneval.mail ?? "karnevalabteilung@sportfreunde04.de"}`)}">E-Mail an die Karnevalabteilung</a>
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
// hier mit eingezogen. W9-Korrektur (QA3 1440-10/390-4/quer-8): "E-Mail
// schreiben ›" fehlte bisher (mail wurde bewusst auf null gesetzt) – jetzt
// wie auf der Vorstandsseite bei allen dreien vorhanden, gleicher
// Personenbaustein (personKarte()), gleiche Bildgröße/-format (komponenten.css).
function ansprechpartnerAbschnitt(daten) {
  const funktionen = ["Abteilungsleiter Karneval", "Kassiererin Karneval", "Schriftführerin Karneval"];
  const personen = funktionen
    .map((f) => (daten.vorstand ?? []).find((p) => p.funktion === f))
    .filter(Boolean);
  const karten = personen
    .map((p) => personKarte(p, daten, { pfad: PFAD }))
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
