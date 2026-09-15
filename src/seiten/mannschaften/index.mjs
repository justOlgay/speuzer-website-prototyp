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

// Platzhalter für Seiten, die im aktuellen Paket noch nicht existieren –
// gleiches Muster wie header.mjs/footer.mjs/index.mjs (siehe navigation.mjs).
function baldSpan(titel, { knopf = false } = {}) {
  const klassen = ["nav__bald", knopf ? "knopf" : null].filter(Boolean).join(" ");
  return `<span class="${klassen}" aria-disabled="true" title="Seite folgt">${escapeHtml(titel)}</span>`;
}

const TAG_KUERZEL = {
  Montag: "Mo",
  Dienstag: "Di",
  Mittwoch: "Mi",
  Donnerstag: "Do",
  Freitag: "Fr",
  Samstag: "Sa",
  Sonntag: "So",
};

// "Jahrgang {jahrgang}" – bei den Herren nur "Senioren" (kein "Jahrgang"-
// Präfix, kein Jahrgangswert; P3, Korrektur A1 abgeleitet aus kategorie
// über jahrgangText() in hilfen.mjs).
function jahrgangPraefix(team) {
  const j = jahrgangText(team);
  return j === "Senioren" ? j : `Jahrgang ${j}`;
}

// Kompakte Trainingsliste innerhalb einer Team-Karte: "Di 17:30–19:30" je
// Einheit, ohne "Uhr"-Zusatz (Platzgrund in der Karte).
function trainingKompakt(team) {
  return (team.training ?? [])
    .map((t) => `<li>${escapeHtml(TAG_KUERZEL[t.tag] ?? t.tag)} ${escapeHtml(t.von)}–${escapeHtml(t.bis)}</li>`)
    .join("\n      ");
}

function teamKarte(team) {
  return `<a class="karte karte--link" href="${PFAD}mannschaften/${team.slug}/">
      <span class="karte__titel">${escapeHtml(team.name)}</span>
      <span class="karte__meta">${escapeHtml(jahrgangPraefix(team))} · ${escapeHtml(team.staffel ?? "")}</span>
      <ul class="karte__training" role="list">
      ${trainingKompakt(team)}
      </ul>
      <span class="karte__mehr">Zur Mannschaft →</span>
    </a>`;
}

function gruppenAbschnitt({ titel, satz, slugs, teamNachSlug }) {
  const karten = slugs
    .map((slug) => teamNachSlug[slug])
    .filter(Boolean)
    .map(teamKarte)
    .join("\n    ");
  return `<section class="abschnitt">
  <div class="container fluss">
    <h2>${escapeHtml(titel)}</h2>
    <p class="meta">${escapeHtml(satz)}</p>
    <div class="raster raster--3">
    ${karten}
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

// Karneval-Karte wie auf der Startseite (gleicher Text, siehe
// src/seiten/index.mjs#karnevalAbschnitt). P5: /verein/karneval/ existiert
// jetzt – echter Link statt baldSpan(). P16, Schritt 0: der Ferienhinweis
// stand hier zusätzlich zum Trainingszeiten-Abschnitt (Dopplung aus der
// Sichtprüfung von P15) und ist hier entfallen – er bleibt nur noch im
// Trainingszeiten-Abschnitt oben.
function karnevalAbschnitt(daten) {
  const verein = daten.verein ?? {};
  return `<section class="abschnitt">
  <div class="container fluss">
    <article class="karte fluss">
      <h2 class="karte__titel">Karnevalabteilung „Die Schnauzer"</h2>
      <p>Fünf Gruppen von den Little Fruities bis zu den Dreamboys – die zweite Abteilung des Vereins.</p>
      <p class="knopfzeile">
        <a class="knopf" href="${PFAD}verein/karneval/">Zur Karnevalabteilung</a>
        ${mailLink(verein.mails?.karneval ?? "karnevalabteilung@sportfreunde04.de")}
      </p>
    </article>
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

  // P16, Schritt 0: Reihenfolge korrigiert – Mannschaftsübersicht →
  // Trainingszeiten → Probetraining → Karneval-Karte → Zusatzangebote
  // (externe Angebote zuletzt).
  const inhalt = [
    seitenkopf,
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
    karnevalAbschnitt(daten),
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
