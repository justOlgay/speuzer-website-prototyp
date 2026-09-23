// Mannschaften-Übersicht (P3) – drei Gruppen (Kinderfußball, Jugend,
// Senioren) als Karten mit Link auf die jeweilige Teamseite, dazu
// Zusatzangebote, Ferienhinweis + Karneval (wie auf der Startseite) und ein
// Aufruf zum Probetraining.

import {
  mailLink,
  jahrgangText,
  datumLang,
  naechsteSpiele,
  spielZeile,
  FUSSBALLDE_WIDGET_LADER,
} from "../../vorlagen/hilfen.mjs";
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
      <span class="karte__mehr">Zur Mannschaft ›</span>
    </a>`;
}

function gruppenAbschnitt({ titel, satz, slugs, teamNachSlug, id }) {
  const karten = slugs
    .map((slug) => teamNachSlug[slug])
    .filter(Boolean)
    .map(teamKarte)
    .join("\n    ");
  const idAttr = id ? ` id="${escapeHtml(id)}"` : "";
  return `<section class="abschnitt abschnitt--gruppe"${idAttr}>
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

// ---------- Nächste Spiele des Vereins (W6, ganz unten: Zusatzinformation,
// keine Kerninfo) ----------
// Aus dem ehemaligen src/seiten/spielplan/index.mjs übernommen (dort
// "Nächste Spiele", jetzt hier "Nächste Spiele des Vereins" – Entscheidung
// Olgay 23.09.2026: Tabellen und Spielpläne nur noch je Mannschaftsseite,
// die vereinsweite Spielübersicht wandert ganz nach unten auf die Seite
// "Mannschaften"). appack-Modus zeigt das FUSSBALL.DE-Widget "club-matches"
// (alle Teams, live aus dem DFBnet, siehe data/widgets.json "verein.spiele"),
// der Prototyp weiterhin die eingefrorene, nach Tag gruppierte Liste.
function naechsteSpieleDesVereinsAbschnitt(daten) {
  const spiele = naechsteSpiele(daten, { anzahl: 12 });

  const gruppen = [];
  for (const s of spiele) {
    let gruppe = gruppen.find((g) => g.datum === s.datum);
    if (!gruppe) {
      gruppe = { datum: s.datum, spiele: [] };
      gruppen.push(gruppe);
    }
    gruppe.spiele.push(s);
  }

  const inhalt = gruppen
    .map((gruppe, gi) => {
      const zeilen = gruppe.spiele
        .map((s, i) => spielZeile(s, { pfad: PFAD, mitTeam: true, naechstes: gi === 0 && i === 0, ohneDatum: true }))
        .join("\n      ");
      return `<h3>${datumLang(gruppe.datum)}</h3>
    <ul class="spiele" role="list">
      ${zeilen}
    </ul>`;
    })
    .join("\n    ");

  const vereinSpieleWidgetId = daten.widgets?.verein?.spiele ?? "";

  return `<section class="abschnitt">
  <div class="container fluss">
    <h2>Nächste Spiele des Vereins</h2>
    <p class="meta">Alle Spiele unserer Mannschaften der nächsten Tage. Spielplan und Tabelle je Team findest du auf der jeweiligen Mannschaftsseite.</p>
    <div data-nur-appack hidden>
      <div class="fussballde-wrap fussballde-wrap--hoch">
        <div class="fussballde_widget" data-id="${escapeHtml(vereinSpieleWidgetId)}" data-type="club-matches"></div>
      </div>
      <p class="meta fussballde-hinweis">Spiele seitlich wischbar</p>
    </div>
    <div data-nur-prototyp>
      ${inhalt || `<p class="meta">Keine kommenden Spiele ab dem Build-Datum in data/spiele.json gefunden.</p>`}
      <p class="meta">Auf der Vereinswebsite kommen die Spiele live aus dem DFBnet.</p>
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
      satz: "Ligabetrieb im Kreis Frankfurt, Spielplan & Tabellen aus dem DFBnet.",
      slugs: ["a-jugend", "d1", "d2", "d3", "e1", "e2", "e3"],
    },
    {
      titel: "Kinderfußball",
      satz: "Kinderfestivals statt Ligabetrieb, keine Tabellen.",
      slugs: ["f1", "f2", "g-jugend"],
    },
  ].map((g) => gruppenAbschnitt({ ...g, teamNachSlug }));

  // Olgay 23.09.2026: Karten „Fußball“/„Karneval“ gehören nicht auf die
  // Fußballseite. Karneval hat einen eigenen Menüpunkt, die Abteilungen
  // stehen im Verein-Verteiler (wie in der App). Reihenfolge:
  // Mannschaftsübersicht → Trainingszeiten → Probetraining → Zusatzangebote.
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
    zusatzangeboteAbschnitt(daten),
    // W6, ganz unten (Zusatzinformation, keine Kerninfo): vereinsweite
    // "Nächste Spiele" (ehemals eigener Abschnitt auf /spielplan/, siehe
    // naechsteSpieleDesVereinsAbschnitt() oben).
    naechsteSpieleDesVereinsAbschnitt(daten),
    FUSSBALLDE_WIDGET_LADER,
  ].join("\n");

  return {
    url: "/mannschaften/",
    title: "Mannschaften",
    // W3b, Prüfer-Befund "klein": "Spielpläne" -> "Spielplan & Tabellen"
    // (einheitlicher Begriff) machte den Satz mit 175 Zeichen zu lang (Gate
    // in tools/pruefen.mjs: max. 170) – kleinstmögliche Korrektur nach dem
    // Muster von P2/verein/karneval.mjs: "von den Herren bis zur G-Jugend"
    // zu "von Herren bis G-Jugend" gekürzt (167 Zeichen), Wortlaut sonst
    // unverändert.
    description:
      "Alle elf Fußballmannschaften des FFV Sportfreunde 04 in Frankfurt-Gallus: Jahrgänge, Trainingszeiten, Ansprechpartner und Spielplan & Tabellen von Herren bis G-Jugend.",
    inhalt,
  };
}
