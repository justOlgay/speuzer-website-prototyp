// Spielplan-Übersicht /spielplan/ (P4) – nächste Spiele aller Mannschaften
// gruppiert nach Tag, Spielpläne je Mannschaft, Tabellen-Kurzübersicht,
// Kalender-Abo.

import { datumLang, datumKurz, zeit, naechsteSpiele, spielZeile } from "../../vorlagen/hilfen.mjs";

// Diese Seite liegt immer unter "/spielplan/" (Tiefe 1), daher immer "../"
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

function seitenkopfAbschnitt(daten) {
  return `<section class="abschnitt seitenkopf">
  <div class="container">
    <h1>${escapeHtml("Spielplan & Tabellen")}</h1>
    <p class="seitenkopf__lead">Alle Spiele unserer elf Mannschaften aus dem DFBnet – Liga, Pokal, Freundschaftsspiele und Kinderfestivals. Dazu die aktuellen Tabellen.</p>
    <p class="meta">Stand ${datumLang(daten.stand)} · Quelle: DFBnet, täglich aktualisiert</p>
  </div>
</section>`;
}

// ---------- Nächste Spiele, gruppiert nach Tag ----------

function naechsteSpieleAbschnitt(daten) {
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

  return `<section class="abschnitt">
  <div class="container fluss">
    <h2>Nächste Spiele</h2>
    ${inhalt || `<p class="meta">Keine kommenden Spiele ab dem Build-Datum in data/spiele.json gefunden.</p>`}
  </div>
</section>`;
}

// ---------- Spielpläne je Mannschaft ----------

function naechstesSpielText(daten, team) {
  const [spiel] = naechsteSpiele(daten, { team: team.slug, anzahl: 1 });
  if (!spiel) return "Kein Spiel angesetzt";

  const istKinderfestivalOhneGegner = !spiel.gegner && spiel.wettbewerb === "Kinderfestival";
  const gegnerText = istKinderfestivalOhneGegner
    ? spiel.heimspiel
      ? "Kinderfestival – Heimspieltag"
      : `Kinderfestival bei ${spiel.heim ?? ""}`
    : spiel.gegner ?? "";
  const heimAuswaerts = spiel.heimspiel ? "Heim" : "Auswärts";

  return `Nächstes Spiel: ${datumKurz(spiel.datum)} ${zeit(spiel.zeit)} · ${escapeHtml(gegnerText)} (${heimAuswaerts})`;
}

function spielplaeneAbschnitt(daten) {
  const teams = daten.teams ?? [];
  const karten = teams
    .map(
      (team) => `<a class="karte karte--link" href="${PFAD}spielplan/${team.slug}/">
      <span class="karte__titel">${escapeHtml(team.name)}</span>
      <span class="karte__meta">${escapeHtml(team.staffel ?? "")}</span>
      <span class="meta">${naechstesSpielText(daten, team)}</span>
      <span class="karte__mehr">Zum Spielplan →</span>
    </a>`
    )
    .join("\n    ");

  return `<section class="abschnitt--hell abschnitt">
  <div class="container fluss">
    <h2>Spielpläne je Mannschaft</h2>
    <div class="raster raster--3">
    ${karten}
    </div>
  </div>
</section>`;
}

// ---------- Tabellen (Kurzübersicht) ----------

function tabellenAbschnitt(daten) {
  const teams = (daten.teams ?? []).filter((t) => t.tabelle);
  const karten = teams
    .map((team) => {
      const eintrag = daten.tabellen?.teams?.[team.slug];
      const eigene = eintrag?.zeilen?.find((z) => z.eigene);
      const zeile = eigene
        ? `<span class="meta">Platz ${eigene.platz} von ${eintrag.zeilen.length} · ${eigene.punkte} Punkte</span>`
        : `<span class="meta">Tabelle ansehen</span>`;
      return `<a class="karte karte--link" href="${PFAD}tabellen/#${team.slug}">
      <span class="karte__titel">${escapeHtml(team.kurz)}</span>
      ${zeile}
    </a>`;
    })
    .join("\n    ");

  return `<section class="abschnitt">
  <div class="container fluss">
    <h2>Tabellen</h2>
    <p class="inhalt">Tabellen gibt es für Herren, A-Jugend, D- und E-Jugend. Im Kinderfußball (F- und G-Jugend) wird ohne Tabelle gespielt.</p>
    <div class="raster raster--4">
    ${karten}
    </div>
  </div>
</section>`;
}

// ---------- Kalender-Abo ----------

function kalenderAboAbschnitt(daten) {
  const verein = daten.verein ?? {};
  return `<section class="abschnitt--blau abschnitt abschnitt--eng">
  <div class="container fluss">
    <h2>Spielplan im Handy-Kalender</h2>
    <p>Einmal abonnieren – Spiele, Verlegungen und Trainingszeiten deiner Mannschaft landen automatisch im Kalender.</p>
    <p class="knopfzeile">
      <a class="knopf knopf--weiss" href="${escapeHtml(verein.kalender_basis ?? "")}" rel="noopener" target="_blank">Kalender abonnieren</a>
    </p>
    <p class="meta" style="color:var(--blau-100);">Der Kalender wird jede Nacht aus dem DFBnet neu erzeugt. Kurzfristige Absagen kommen weiterhin vom Trainerteam.</p>
  </div>
</section>`;
}

export function seite(daten) {
  const inhalt = [
    seitenkopfAbschnitt(daten),
    naechsteSpieleAbschnitt(daten),
    spielplaeneAbschnitt(daten),
    tabellenAbschnitt(daten),
    kalenderAboAbschnitt(daten),
  ].join("\n");

  return {
    url: "/spielplan/",
    title: "Spielplan & Tabellen",
    description:
      "Spielpläne und Tabellen aller Mannschaften des FFV Sportfreunde 04: nächste Spiele, ganze Saison je Team und Kalender-Abo – direkt aus dem DFBnet, täglich aktualisiert.",
    inhalt,
  };
}
