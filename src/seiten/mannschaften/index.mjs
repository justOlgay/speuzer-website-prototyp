// Mannschaften-Übersicht (P3) – drei Gruppen (Kinderfußball, Jugend,
// Senioren) als Karten mit Link auf die jeweilige Teamseite, dazu
// Zusatzangebote, Ferienhinweis + Karneval (wie auf der Startseite) und ein
// Aufruf zum Probetraining.

import { mailLink, jahrgangText } from "../../vorlagen/hilfen.mjs";
// P15: gemeinsame Bausteine (ursprünglich Startseite, dort gelöscht – siehe
// src/vorlagen/bausteine.mjs).
import { trainingszeitenAbschnitt, probetrainingAbschnitt } from "../../vorlagen/bausteine.mjs";

// Diese Seite liegt immer unter "/mannschaften/" (Tiefe 1), daher immer "../"
// (siehe pfadZurWurzel() in tools/build.mjs).
const PFAD = "../";

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// Verein-Icon wie im Klick-Prototyp (src/appkonzept/bildschirme.mjs,
// ICON.verein): SVG-Raute.
function liesVereinIcon() {
  return `<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 3 20 12 12 21 4 12z"/></svg>`;
}

// Platzhalter für Seiten, die im aktuellen Paket noch nicht existieren –
// gleiches Muster wie header.mjs/footer.mjs/index.mjs (siehe navigation.mjs).
function baldSpan(titel, { knopf = false } = {}) {
  const klassen = ["nav__bald", knopf ? "knopf" : null].filter(Boolean).join(" ");
  return `<span class="${klassen}" aria-disabled="true" title="Seite folgt">${escapeHtml(titel)}</span>`;
}

// "Jahrgang {jahrgang}" – bei den Herren nur "Senioren" (kein "Jahrgang"-
// Präfix, kein Jahrgangswert; P3, Korrektur A1 abgeleitet aus kategorie
// über jahrgangText() in hilfen.mjs).
function jahrgangPraefix(team) {
  const j = jahrgangText(team);
  return j === "Senioren" ? j : `Jahrgang ${j}`;
}

// W3, Abschnitt 7 (verbindliche Entscheidung): Trainingszeiten stehen nur
// noch in der Tabelle "Trainingszeiten" weiter unten (keine Dopplung mehr) –
// die Karte zeigt nur noch Jahrgang · Liga/Staffel und den Link.
function teamKarte(team) {
  return `<a class="karte karte--link" href="${PFAD}mannschaften/${team.slug}/">
      <span class="karte__titel">${escapeHtml(team.name)}</span>
      <span class="karte__meta">${escapeHtml(jahrgangPraefix(team))} · ${escapeHtml(team.staffel ?? "")}</span>
      <span class="karte__mehr">Zur Mannschaft →</span>
    </a>`;
}

function gruppenAbschnitt({ titel, satz, slugs, teamNachSlug, id }) {
  const karten = slugs
    .map((slug) => teamNachSlug[slug])
    .filter(Boolean)
    .map(teamKarte)
    .join("\n    ");
  const idAttr = id ? ` id="${escapeHtml(id)}"` : "";
  return `<section class="abschnitt"${idAttr}>
  <div class="container fluss">
    <h2>${escapeHtml(titel)}</h2>
    <p class="meta">${escapeHtml(satz)}</p>
    <div class="raster raster--3">
    ${karten}
    </div>
  </div>
</section>`;
}

// ---------- Abteilungen im Kopfbereich (W3, Abschnitt 4) ----------
// Karneval-Karte rückt in den Kopfbereich, als zweite "Abteilung" neben
// einem Verweis auf die Fußball-Mannschaften weiter unten auf derselben
// Seite – kürzerer Weg zu den Schnauzern.
function abteilungenKopfAbschnitt() {
  return `<section class="abschnitt">
  <div class="container fluss">
    <div class="raster raster--2">
      <a class="karte karte--link karte--abteilung" href="#mannschaften-liste">
        ${liesVereinIcon()}
        <span class="karte__titel">Fußball</span>
        <span class="karte__meta">Die Mannschaften unten</span>
      </a>
      <a class="karte karte--link karte--abteilung" href="${PFAD}verein/karneval/">
        ${liesVereinIcon()}
        <span class="karte__titel">Karneval</span>
        <span class="karte__meta">Die Schnauzer · 5 Gruppen</span>
      </a>
    </div>
  </div>
</section>`;
}

function zusatzangeboteAbschnitt(daten) {
  const angebote = daten.zusatzangebote ?? [];
  const karten = angebote
    .map((a) => {
      const kontakt = a.mail
        ? mailLink(a.mail)
        : mailLink("geschaeftsstelle@sportfreunde04.de", "Kontakt über die Geschäftsstelle");
      return `<article class="karte fluss">
      <span class="tag">Externes Angebot · kostenpflichtig</span>
      <h3 class="karte__titel">${escapeHtml(a.name)}</h3>
      <p>${escapeHtml(a.text ?? "")}</p>
      <p class="meta">Leitung: ${escapeHtml(a.leitung ?? "")}</p>
      <p>${kontakt}</p>
    </article>`;
    })
    .join("\n    ");

  return `<section class="abschnitt--hell abschnitt">
  <div class="container fluss">
    <h2>Zusatzangebote</h2>
    <p class="inhalt">Zwei Fußballschulen nutzen unseren Platz. Sie sind kostenpflichtige Angebote externer Anbieter und stehen auch Spielerinnen und Spielern anderer Vereine offen.</p>
    <div class="raster raster--2">
    ${karten}
    </div>
  </div>
</section>`;
}

export function seite(daten) {
  const teamNachSlug = Object.fromEntries((daten.teams ?? []).map((t) => [t.slug, t]));

  const seitenkopf = `<section class="abschnitt seitenkopf">
  <div class="container">
    <h1>Mannschaften</h1>
    <p class="seitenkopf__lead">Elf Fußballmannschaften von den Herren bis zur G-Jugend. Für jedes Team findest du hier Jahrgang, Trainingszeiten, Ansprechpartner und den Weg zum Spielplan.</p>
  </div>
</section>`;

  // P10, Korrektur A2 (Olgay, 14.09.2026): Reihenfolge überall, wo alle
  // Mannschaften dargestellt werden, beginnt bei den ältesten (Herren) und
  // geht absteigend zu den jüngsten (G-Jugend) – Gruppenreihenfolge Senioren
  // → Jugend → Kinderfußball, innerhalb der Gruppen wie in data/teams.json
  // (a-jugend, d1, d2, d3, e1, e2, e3; f1, f2, g-jugend). Vorher stand hier
  // Kinderfußball → Jugend → Senioren mit jeweils nach Alter aufsteigender
  // slugs-Reihenfolge (jüngste zuerst) – exakt umgekehrt.
  const gruppen = [
    {
      titel: "Senioren",
      satz: "Kreisliga A, Heimspiele auf der Anlage von SW Griesheim am Rebstock.",
      slugs: ["herren"],
      // W3, Abschnitt 4: Sprungziel der Fußball-Abteilungskarte im Kopfbereich.
      id: "mannschaften-liste",
    },
    {
      titel: "Jugend",
      satz: "Ligabetrieb im Kreis Frankfurt, Spielpläne und Tabellen aus dem DFBnet.",
      slugs: ["a-jugend", "d1", "d2", "d3", "e1", "e2", "e3"],
    },
    {
      titel: "Kinderfußball",
      satz: "Kinderfestivals statt Ligabetrieb, keine Tabellen.",
      slugs: ["f1", "f2", "g-jugend"],
    },
  ].map((g) => gruppenAbschnitt({ ...g, teamNachSlug }));

  // W3, Abschnitt 4: die Karneval-Karte ist in den Kopfbereich gewandert
  // (abteilungenKopfAbschnitt(), direkt unter dem Lead) – die vorherige
  // Karneval-Karte weiter unten entfällt, kein doppelter Weg zu den
  // Schnauzern. Reihenfolge sonst wie zuvor: Mannschaftsübersicht →
  // Trainingszeiten → Probetraining → Zusatzangebote.
  const inhalt = [
    seitenkopf,
    abteilungenKopfAbschnitt(),
    ...gruppen,
    // P15: Trainingszeiten-Baustein (ursprünglich Startseite) nach der
    // Mannschaftsübersicht eingefügt (siehe src/vorlagen/bausteine.mjs). Der
    // Knopf „Zu den Mannschaften“ entfällt hier (mitKnopf=false) – er würde
    // auf diese Seite selbst verweisen.
    trainingszeitenAbschnitt(daten, PFAD, false),
    // P15: ersetzt den vorherigen eigenen Aufruf ("Lust mitzuspielen?") durch
    // denselben Probetraining-Baustein wie auf den anderen Seiten (siehe
    // src/vorlagen/bausteine.mjs).
    probetrainingAbschnitt(PFAD),
    zusatzangeboteAbschnitt(daten),
  ].join("\n");

  return {
    url: "/mannschaften/",
    title: "Mannschaften",
    description:
      "Alle elf Fußballmannschaften des FFV Sportfreunde 04 in Frankfurt-Gallus: Jahrgänge, Trainingszeiten, Ansprechpartner und Spielpläne von den Herren bis zur G-Jugend.",
    inhalt,
  };
}
