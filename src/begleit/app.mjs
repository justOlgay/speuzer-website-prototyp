// App-Ansicht /app/ (P9) – zeigt den Prototyp im schmalen Format der
// Vereins-App: drei Telefonrahmen (Start, Mannschaft D2, Spielplan &
// Tabellen) mit der jeweiligen Seite per <iframe src="…?ansicht=app">
// (siehe App-Modus, Plan-Abschnitt B, in assets/js/nav.js und
// assets/css/app-modus.css). Ersetzt nicht die echte Vereins-App auf appack.

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// Diese Seite liegt immer unter "/app/" (Tiefe 1), daher immer "../"
// (siehe pfadZurWurzel() in tools/build.mjs).
const PFAD = "../";

// ---------- Seitenkopf ----------

function seitenkopfAbschnitt() {
  return `<section class="abschnitt seitenkopf">
  <div class="container">
    <h1>Website und App – ein Auftritt</h1>
    <p class="seitenkopf__lead">Dieselben Inhalte, dieselben Farben, dieselbe Schrift: So sieht der Prototyp im schmalen Format der Vereins-App aus.</p>
  </div>
</section>`;
}

// ---------- Telefonrahmen ----------

// Drei Rahmen nebeneinander ab ausreichender Breite, darunter horizontales
// Scroll-Snapping (.telefone/.telefon-eintrag/.telefon-skaliert in
// komponenten.css) – die Seite selbst scrollt dabei nie horizontal, nur der
// Container (.telefone hat overflow-x:auto).
function telefonEintrag({ titel, pfad, beschriftung }) {
  return `<div class="telefon-eintrag">
      <div class="telefon-skaliert">
        <div class="telefon">
          <iframe loading="lazy" title="${escapeHtml(titel)}" src="${pfad}" width="390" height="844" style="border:0;"></iframe>
        </div>
      </div>
      <p class="meta">${escapeHtml(beschriftung)}</p>
    </div>`;
}

function telefoneAbschnitt() {
  const rahmen = [
    telefonEintrag({
      titel: "Startseite im App-Format",
      pfad: `${PFAD}?ansicht=app`,
      beschriftung: "Start",
    }),
    telefonEintrag({
      titel: "Mannschaft D2 im App-Format",
      pfad: `${PFAD}mannschaften/d2/?ansicht=app`,
      beschriftung: "Mannschaft D2",
    }),
    telefonEintrag({
      titel: "Spielplan und Tabellen im App-Format",
      pfad: `${PFAD}spielplan/?ansicht=app`,
      beschriftung: "Spielplan & Tabellen",
    }),
  ].join("\n    ");

  return `<section class="abschnitt">
  <div class="telefone">
    ${rahmen}
  </div>
</section>`;
}

// ---------- Was gleich ist ----------

function wasGleichKarte(titel, text) {
  return `<div class="karte fluss">
      <span class="karte__titel">${escapeHtml(titel)}</span>
      <p>${escapeHtml(text)}</p>
    </div>`;
}

function wasGleichAbschnitt() {
  const karten = [
    wasGleichKarte(
      "Ein Gestaltungssystem",
      "Farben, Schrift, Abstände und Bausteine sind dieselben – im Browser wie in der App."
    ),
    wasGleichKarte(
      "Eine Datenquelle",
      "Spiele, Tabellen, Trainingszeiten und Meldungen kommen aus denselben Dateien. Nichts wird doppelt gepflegt."
    ),
    wasGleichKarte(
      "Eine Adresse pro Inhalt",
      "Jede Seite hat einen Link, der auch im App-Format funktioniert – teilbar per WhatsApp."
    ),
  ].join("\n    ");

  return `<section class="abschnitt--hell abschnitt">
  <div class="container fluss">
    <h2>Was gleich ist</h2>
    <div class="raster raster--3">
    ${karten}
    </div>
  </div>
</section>`;
}

// ---------- Hinweis appack ----------

function hinweisAbschnitt() {
  return `<section class="abschnitt">
  <div class="container fluss">
    <div class="hinweis hinweis--info">
      <p style="margin:0;">Die echte Vereins-App läuft auf der Plattform appack. Diese Ansicht zeigt, wie die Inhalte des Prototyps dort aussehen würden – sie ersetzt die App nicht.</p>
      <p class="knopfzeile" style="margin-top:var(--sp-3);">
        <a class="knopf knopf--sekundaer" href="${PFAD}?ansicht=app" target="_blank" rel="noopener">App-Ansicht in voller Größe öffnen</a>
      </p>
    </div>
  </div>
</section>`;
}

export function seite() {
  const inhalt = [
    seitenkopfAbschnitt(),
    telefoneAbschnitt(),
    wasGleichAbschnitt(),
    hinweisAbschnitt(),
  ].join("\n");

  return {
    url: "/app/",
    title: "App-Ansicht",
    // Wörtlicher Plan-Text hat 175 Zeichen (Gate in tools/pruefen.mjs: max.
    // 170) – kleinstmögliche Korrektur nach dem Muster von P2/P5/P8 (siehe
    // src/seiten/index.mjs, src/seiten/verein/index.mjs, src/seiten/kontakt.mjs):
    // "des FFV Sportfreunde 04" zu "der Sportfreunde 04" gekürzt (wie schon
    // "die Sportfreunde 04" in src/seiten/verein/index.mjs ohne "FFV") und
    // abschließenden Punkt entfernt (170 Zeichen), Wortlaut sonst unverändert.
    // Siehe Abschlussbericht, Abschnitt „Abweichungen“.
    description:
      "So sieht der Prototyp der Sportfreunde 04 im schmalen Format der Vereins-App aus: Start, Mannschaft und Spielplan in drei Telefonrahmen – Website und App als ein Auftritt",
    inhalt,
    bodyclass: "app",
  };
}
