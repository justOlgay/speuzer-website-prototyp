// Verein-Verteiler /verein/ (W3) – "aus einem Guss" mit der App: zwei
// Abteilungskarten (Fußball, Karneval) und darunter die Liste "Der Verein" in
// exakt der App-Reihenfolge (Verein_v3, src/app/Verein_v3.html), plus die
// zwei Website-Zusätze "Mach mit · Ehrenamt" und "Fanshop & Teamshop" am
// Ende (W3-Spezifikation Abschnitt 1 und 7). Der bisherige Seiteninhalt
// (Wer wir sind, Zahlen, Kinderschutz) ist vollständig nach
// /verein/ueber-uns/ umgezogen (src/seiten/verein/ueber-uns.mjs) – hier
// nichts gelöscht, nur verschoben.

// Diese Seite liegt immer unter "/verein/" (Tiefe 1), daher immer "../"
// (siehe pfadZurWurzel() in tools/build.mjs).
const PFAD = "../";

function liesVereinIcon() {
  // Verein-Icon wie im Klick-Prototyp (src/appkonzept/bildschirme.mjs,
  // ICON.verein): SVG-Raute, viewBox 0 0 24 24, stroke currentColor.
  return `<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 3 20 12 12 21 4 12z"/></svg>`;
}

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
    <p class="seitenkopf__lead">Frankfurter Fußballverein Sportfreunde 1904 e.V. – im Gallus sagt man einfach „die Speuzer“.</p>
  </div>
</section>`;
}

// ---------- Abteilungen (zwei Karten, wie im App-Konzept) ----------

function abteilungKarte(titel, untertitel, ziel) {
  return `<a class="karte karte--link karte--abteilung" href="${ziel}">
      ${liesVereinIcon()}
      <span class="karte__titel">${escapeHtml(titel)}</span>
      <span class="karte__meta">${escapeHtml(untertitel)}</span>
    </a>`;
}

// W3b, Prüfer-Befund "klein": Untertitel aus den Daten statt fest kodiert
// (daten.teams.length bzw. daten.karneval.gruppen.length).
function abteilungenAbschnitt(daten) {
  const teamAnzahl = daten.teams?.length ?? 0;
  const gruppenAnzahl = daten.karneval?.gruppen?.length ?? 0;
  const karten = [
    abteilungKarte("Fußball", `${teamAnzahl} Mannschaften, Herren bis G-Jugend`, `${PFAD}mannschaften/`),
    abteilungKarte("Karneval", `Die Schnauzer · ${gruppenAnzahl} Gruppen`, `${PFAD}verein/karneval/`),
  ].join("\n    ");

  return `<section class="abschnitt">
  <div class="container fluss">
    <h2>Abteilungen</h2>
    <div class="raster raster--2">
    ${karten}
    </div>
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

function derVereinAbschnitt() {
  // Reihenfolge und Wortlaut exakt wie in der App (Verein_v3,
  // src/app/Verein_v3.html), siehe W3-Spezifikation Abschnitt 1. Die beiden
  // Website-Zusätze am Ende (Abschnitt 7, verbindliche Entscheidung) sind in
  // der App noch nicht vorhanden.
  const zeilen = [
    zeile("Vorstand & Kontakt", "Wer den Verein führt, wen du erreichst", `${PFAD}verein/vorstand/`),
    zeile("Mitglied werden", "Beiträge, Ablauf, Antrag", `${PFAD}mitglied-werden/`),
    zeile("Sponsoren & Partner", "Wer uns unterstützt", `${PFAD}verein/sponsoren/`),
    zeile("Downloads & Anträge", "Satzung, Beiträge, Bescheinigungen", `${PFAD}verein/downloads/`),
    zeile("Spielplan & Tabellen", "Alle Mannschaften auf einen Blick", `${PFAD}spielplan/`),
    zeile("Über uns", "Seit 1904 im Gallus", `${PFAD}verein/ueber-uns/`),
    // Die Chronik entsteht aus der Word-Datei des Vereins (tools/chronik-bauen.mjs)
    // und liegt nur im appack-Workspace, nicht im Repo – daher die absolute Adresse.
    zeile("Vereinschronik", "1904 bis 2026, Kapitel für Kapitel", "https://cdn.appack.de/sportfreunde04/workspace/web/chronik.html"),
    zeile("Geschäftsstelle & Anfahrt", "Adresse, Zugang, Kontakt", `${PFAD}kontakt/`),
    zeile("Mach mit · Ehrenamt", "Trainer, Betreuer, Vorstand, Helfer", `${PFAD}verein/mach-mit/`),
    zeile("Fanshop & Teamshop", "Fanartikel und Teamausstattung", `${PFAD}shop/`),
  ].join("\n    ");

  return `<section class="abschnitt--hell abschnitt">
  <div class="container fluss">
    <h2>Der Verein</h2>
    <div class="zeilen-liste">
    ${zeilen}
    </div>
  </div>
</section>`;
}

export function seite(daten) {
  const inhalt = [seitenkopfAbschnitt(), abteilungenAbschnitt(daten), derVereinAbschnitt()].join("\n");

  return {
    url: "/verein/",
    title: "Verein",
    description:
      "Verein-Verteiler des FFV Sportfreunde 04: Fußball, Karneval, Vorstand & Kontakt, Mitglied werden, Sponsoren, Downloads, Spielplan & Tabellen, Über uns, Geschäftsstelle",
    inhalt,
  };
}
