// Mannschaften-Übersicht (P3) – drei Gruppen (Kinderfußball, Jugend,
// Senioren) als Karten mit Link auf die jeweilige Teamseite, dazu
// Zusatzangebote, Ferienhinweis + Karneval (wie auf der Startseite) und ein
// Aufruf zum Probetraining.

import { mailLink, jahrgangText, PROBETRAINING_MAILTO } from "../../vorlagen/hilfen.mjs";

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

// Ferienhinweis + Karneval-Karte wie auf der Startseite (gleicher Text,
// siehe src/seiten/index.mjs#karnevalAbschnitt).
function ferienUndKarnevalAbschnitt(daten) {
  const verein = daten.verein ?? {};
  return `<section class="abschnitt">
  <div class="container fluss">
    <div class="hinweis hinweis--info">
      <p style="margin:0;">${escapeHtml(verein.hinweise?.ferien ?? "")}</p>
    </div>
    <article class="karte fluss">
      <h2 class="karte__titel">Karnevalabteilung „Die Schnauzer"</h2>
      <p>Fünf Gruppen von den Little Fruities bis zu den Dreamboys – die zweite Abteilung des Vereins.</p>
      <p class="knopfzeile">
        ${baldSpan("Zur Karnevalabteilung")}
        ${mailLink(verein.mails?.karneval ?? "karnevalabteilung@sportfreunde04.de")}
      </p>
    </article>
  </div>
</section>`;
}

function aufrufAbschnitt() {
  return `<section class="abschnitt--blau abschnitt abschnitt--eng">
  <div class="container fluss">
    <h2>Lust mitzuspielen?</h2>
    <p>Ein- bis zweimal mittrainieren geht ohne Anmeldung. Schreib der Jugendleitung, in welchem Jahrgang dein Kind spielt.</p>
    <p class="knopfzeile">
      <a class="knopf knopf--weiss" href="${escapeHtml(PROBETRAINING_MAILTO)}">Probetraining vereinbaren</a>
    </p>
  </div>
</section>`;
}

export function seite(daten) {
  const teamNachSlug = Object.fromEntries((daten.teams ?? []).map((t) => [t.slug, t]));

  const seitenkopf = `<section class="abschnitt seitenkopf">
  <div class="container">
    <h1>Mannschaften</h1>
    <p class="seitenkopf__lead">Elf Fußballmannschaften von der G-Jugend bis zu den Herren. Für jedes Team findest du hier Jahrgang, Trainingszeiten, Ansprechpartner und den Weg zum Spielplan.</p>
  </div>
</section>`;

  const gruppen = [
    {
      titel: "Kinderfußball",
      satz: "Kinderfestivals statt Ligabetrieb, keine Tabellen.",
      slugs: ["g-jugend", "f2", "f1"],
    },
    {
      titel: "Jugend",
      satz: "Ligabetrieb im Kreis Frankfurt, Spielpläne und Tabellen aus dem DFBnet.",
      slugs: ["e3", "e2", "e1", "d3", "d2", "d1", "a-jugend"],
    },
    {
      titel: "Senioren",
      satz: "Kreisliga A, Heimspiele auf der Anlage von SW Griesheim am Rebstock.",
      slugs: ["herren"],
    },
  ].map((g) => gruppenAbschnitt({ ...g, teamNachSlug }));

  const inhalt = [
    seitenkopf,
    ...gruppen,
    zusatzangeboteAbschnitt(daten),
    ferienUndKarnevalAbschnitt(daten),
    aufrufAbschnitt(),
  ].join("\n");

  return {
    url: "/mannschaften/",
    title: "Mannschaften",
    description:
      "Alle elf Fußballmannschaften des FFV Sportfreunde 04 in Frankfurt-Gallus: Jahrgänge, Trainingszeiten, Ansprechpartner und Spielpläne von der G-Jugend bis zu den Herren.",
    inhalt,
  };
}
