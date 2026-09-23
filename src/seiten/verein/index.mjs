// Verein-Verteiler /verein/ (W3, Abteilungskarten entfernt in W7) – die
// Liste "Der Verein" in exakt der App-Reihenfolge (Verein_v3,
// src/app/Verein_v3.html), plus die zwei Website-Zusätze "Mach mit ·
// Ehrenamt" und "Fanshop & Teamshop" am Ende (W3-Spezifikation Abschnitt 1
// und 7). Der bisherige Seiteninhalt (Wer wir sind, Zahlen, Kinderschutz) ist
// vollständig nach /verein/ueber-uns/ umgezogen
// (src/seiten/verein/ueber-uns.mjs) – hier nichts gelöscht, nur verschoben.
//
// W7 (Entscheidung Olgay 23.09.2026, Abschnitt 2): der frühere Abschnitt
// "Abteilungen" (Karten Fußball/Karneval) ist entfallen – auf der Website
// sind Mannschaften und Karneval eigene Hauptmenüpunkte, die Karten
// verlinkten doppelt auf dieselben Ziele. In der App bleiben die Karten
// unverändert (src/app/Verein_v3.html), weil dort der Tab "Verein" der
// einzige Weg zu Fußball und Karneval ist.

// Diese Seite liegt immer unter "/verein/" (Tiefe 1), daher immer "../"
// (siehe pfadZurWurzel() in tools/build.mjs).
const PFAD = "../";

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// ---------- Seitenkopf ----------

function seitenkopfAbschnitt() {
  return `<section class="abschnitt seitenkopf">
  <div class="container">
    <h1>Verein</h1>
    <p class="seitenkopf__lead">Frankfurter Fußballverein Sportfreunde&nbsp;1904&nbsp;e.&nbsp;V. – im Gallus sagt man einfach „die&nbsp;Speuzer“.</p>
  </div>
</section>`;
}

// ---------- Der Verein (Listenzeilen, App-Reihenfolge) ----------

function zeile(titel, untertitel, ziel) {
  return `<a class="zeile" href="${ziel}">
      <span class="zeile__text">
        <span class="zeile__titel">${escapeHtml(titel)}</span>
        <span class="zeile__untertitel">${escapeHtml(untertitel)}</span>
      </span>
      <svg class="zeile__pfeil" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7"/></svg>
    </a>`;
}

// W9-Korrektur (QA3 quer-33/390-30): Gruppenüberschriften jetzt im normalen
// H2-Stil der Website (vorher kleine graue Kicker-Oberzeile, die in der App
// als fette Überschrift erscheint – "aus einem Guss" verlangt denselben
// Überschriftenstil). ".zeilen-liste__kicker" bleibt als Klasse für den
// Gruppenabstand bestehen, ist aber jetzt ein echtes <h2> statt <span> und
// erbt damit die globale h2-Typografie aus base.css.
function gruppe(titel, zeilen) {
  return `<h2 class="zeilen-liste__kicker">${escapeHtml(titel)}</h2>
    ${zeilen.join("\n    ")}`;
}

// W9-Korrektur (QA3 1440-9/390-30, Entscheidung 14): Einträge auf die
// festgelegten Begriffe umbenannt – "Vorstand" (statt "Vorstand & Kontakt")
// und "Kontakt & Anfahrt" (statt "Geschäftsstelle & Anfahrt"); Dateiname/URL
// (verein/vorstand/, kontakt/) bleiben unverändert. "Mach mit & Ehrenamt"
// statt "Mach mit · Ehrenamt" (390-30: Trenner überall "&", nicht "·").
function derVereinAbschnitt() {
  const inhalt = [
    gruppe("Über den Verein", [
      zeile("Über uns", "Seit 1904 im Gallus", `${PFAD}verein/ueber-uns/`),
      // Die Chronik entsteht aus der Word-Datei des Vereins
      // (tools/chronik-bauen.mjs) und liegt nur im appack-Workspace, nicht im
      // Repo – daher die absolute Adresse.
      zeile("Vereinschronik", "1904 bis 2026, Kapitel für Kapitel", "https://cdn.appack.de/sportfreunde04/workspace/web/chronik.html"),
    ]),
    gruppe("Kontakt", [
      zeile("Vorstand", "Wer den Verein führt", `${PFAD}verein/vorstand/`),
      zeile("Kontakt & Anfahrt", "Adresse, E-Mail, Anfahrt", `${PFAD}kontakt/`),
    ]),
    gruppe("Mitmachen", [
      zeile("Mitglied werden", "Beiträge, Ablauf, Antrag", `${PFAD}mitglied-werden/`),
      // W6 (Entscheidung Olgay 23.09.2026): Spielplan & Tabelle gehören nur
      // noch zur jeweiligen Mannschaftsseite, keine eigene Seite mehr dafür –
      // die Zeile "Spielplan & Tabellen" entfällt hier (führte auf
      // /spielplan/, jetzt eine Weiterleitung, siehe
      // src/seiten/spielplan/index.mjs).
      zeile("Mach mit & Ehrenamt", "Trainer, Betreuer, Vorstand, Helfer", `${PFAD}verein/mach-mit/`),
    ]),
    gruppe("Service", [
      zeile("Downloads & Anträge", "Satzung, Beiträge, Anträge", `${PFAD}verein/downloads/`),
      zeile("Sponsoren & Partner", "Wer uns unterstützt", `${PFAD}verein/sponsoren/`),
      zeile("Fanshop & Teamshop", "Fanartikel und Teamausstattung", `${PFAD}shop/`),
    ]),
  ].join("\n    ");

  // W7: die Überschrift "Der Verein" entfällt – direkt unter dem
  // Seitenkopf-h1 "Verein" wirkte sie redundant (kein Abteilungen-Abschnitt
  // mehr dazwischen, siehe Entfernung oben).
  // W10-Korrektur (QA4 web-1440-verein-und-rest Nr. 16): "Verein" war die
  // einzige Seite, auf der direkt unter dem getönten Seitenkopf ein weißer
  // Abschnitt (abschnitt--hell) begann – auf allen Unterseiten und den
  // übrigen Menüpunkt-Seiten läuft der getönte Grund in den ersten Abschnitt
  // weiter. Modifikator entfernt, damit der Kopf nahtlos übergeht.
  return `<section class="abschnitt">
  <div class="container fluss">
    <div class="zeilen-liste">
    ${inhalt}
    </div>
  </div>
</section>`;
}

export function seite(daten) {
  const inhalt = [seitenkopfAbschnitt(), derVereinAbschnitt()].join("\n");

  return {
    url: "/verein/",
    title: "Verein",
    // W6: "Spielplan & Tabellen" aus der Aufzählung entfernt (Zeile entfällt
    // auf der Seite selbst, siehe derVereinAbschnitt() oben).
    description:
      "Verein-Verteiler des FFV Sportfreunde 04: Fußball, Karneval, Vorstand & Kontakt, Mitglied werden, Downloads, Sponsoren, Über uns, Geschäftsstelle",
    inhalt,
  };
}
