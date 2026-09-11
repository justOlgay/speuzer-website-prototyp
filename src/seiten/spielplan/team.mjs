// Team-Spielpläne /spielplan/<slug>/ (P4) – eine Seite je Mannschaft aus
// data/teams.json: nächstes Spiel groß, alle Spiele der Saison gruppiert nach
// Monat, Kalender-Abo, Tabellenplatz, Link zur Mannschaftsseite.

import {
  datumLang,
  zeit,
  monatName,
  istVergangen,
  wettbewerbTag,
  naechsteSpiele,
  spielZeile,
} from "../../vorlagen/hilfen.mjs";

// Diese Seiten liegen immer unter "/spielplan/<slug>/" (Tiefe 2), daher immer
// "../../" (siehe pfadZurWurzel() in tools/build.mjs).
const PFAD = "../../";

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
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

function googleMapsUrl(adresse) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresse)}`;
}

// Kompakte Trainingsliste innerhalb einer Karte (wie mannschaften/index.mjs).
function trainingKompakt(team) {
  return (team.training ?? [])
    .map((t) => `<li>${escapeHtml(TAG_KUERZEL[t.tag] ?? t.tag)} ${escapeHtml(t.von)}–${escapeHtml(t.bis)}</li>`)
    .join("\n      ");
}

// Meta-description: voller Satzteil, sonst (wenn > 170 Zeichen) auf "alle
// Termine" gekürzt (P4, wie Vorbild in mannschaften/team.mjs).
function beschreibung(team) {
  const bauen = (spielterminTeil) =>
    `Spielplan der ${team.name} des FFV Sportfreunde 04 in der Saison 2026/27: ${team.staffel ?? ""}, ${spielterminTeil}, Kalender-Abo und Tabelle.`;
  let text = bauen("alle Spieltermine mit Anstoß und Spielstätte");
  if (text.length > 170) {
    text = bauen("alle Termine");
  }
  return text;
}

// ---------- Seitenkopf ----------

function seitenkopfAbschnitt(team) {
  return `<section class="abschnitt seitenkopf">
  <div class="container">
    <p class="meta">Spielplan · Saison 2026/27</p>
    <h1>Spielplan ${escapeHtml(team.name)}</h1>
    <p class="seitenkopf__lead">${escapeHtml(team.staffel ?? "")} · ${escapeHtml(team.spielbetrieb ?? "")}</p>
  </div>
</section>`;
}

// ---------- Nächstes Spiel ----------

function naechstesSpielAbschnitt(team, daten) {
  const [spiel] = naechsteSpiele(daten, { team: team.slug, anzahl: 1 });

  if (!spiel) {
    const qualiHinweis = ["e1", "e2", "e3"].includes(team.slug)
      ? `<p style="margin:var(--sp-2) 0 0;">Die Hauptrunde wird vom Kreis nach der Qualifikationsrunde eingeteilt.</p>`
      : "";
    return `<section class="abschnitt">
  <div class="container fluss">
    <h2>Nächstes Spiel</h2>
    <div class="hinweis hinweis--info">
      <p style="margin:0;">Zurzeit ist kein Spiel angesetzt.</p>
      ${qualiHinweis}
    </div>
  </div>
</section>`;
  }

  const istKinderfestivalOhneGegner = !spiel.gegner && spiel.wettbewerb === "Kinderfestival";
  const gegnerText = istKinderfestivalOhneGegner
    ? spiel.heimspiel
      ? "Kinderfestival – Heimspieltag"
      : `Kinderfestival bei ${spiel.heim ?? ""}`
    : spiel.gegner ?? "";

  const tagKlasse = spiel.heimspiel ? "tag--heim" : "tag--auswaerts";
  const tagText = spiel.heimspiel ? "Heim" : "Auswärts";
  const wtag = wettbewerbTag(spiel);

  const routeTeil = spiel.spielstaette
    ? `<a class="knopf knopf--sekundaer" href="${escapeHtml(googleMapsUrl(spiel.spielstaette))}" rel="noopener" target="_blank">Route</a>`
    : "";

  const fussballdeTeil = spiel.fussballde_link
    ? `<p><a href="${escapeHtml(spiel.fussballde_link)}" rel="noopener" target="_blank">Spiel auf FUSSBALL.DE</a></p>`
    : "";

  return `<section class="abschnitt">
  <div class="container fluss">
    <h2>Nächstes Spiel</h2>
    <div class="karte karte--spiel">
      <p class="karte__spiel-datum">${datumLang(spiel.datum)} · ${zeit(spiel.zeit)}</p>
      <p class="knopfzeile" style="margin:0;">
        <span class="tag ${tagKlasse}">${tagText}</span>
        ${wtag ? `<span class="tag">${escapeHtml(wtag)}</span>` : ""}
      </p>
      <p class="karte__spiel-gegner">${escapeHtml(gegnerText)}</p>
      <p class="karte__spiel-ort">
        <span>${spiel.spielstaette ? escapeHtml(spiel.spielstaette) : "Ort folgt"}</span>
        ${routeTeil}
      </p>
      ${fussballdeTeil}
    </div>
  </div>
</section>`;
}

// ---------- Hauptspalte: Alle Spiele ----------

function hauptspalte(team, daten) {
  const stand = daten.stand;
  const alle = (daten.spiele ?? [])
    .filter((s) => s.team === team.slug)
    .slice()
    .sort((a, b) => (a.datum + a.zeit).localeCompare(b.datum + b.zeit));

  const hatOffeneVergangene = alle.some(
    (s) => !s.entfaellt && !s.ergebnis && istVergangen(s, stand)
  );

  const gruppen = [];
  for (const s of alle) {
    const monat = monatName(s.datum);
    let gruppe = gruppen.find((g) => g.monat === monat);
    if (!gruppe) {
      gruppe = { monat, spiele: [] };
      gruppen.push(gruppe);
    }
    gruppe.spiele.push(s);
  }

  const gruppenHtml = gruppen
    .map((gruppe) => {
      const zeilen = gruppe.spiele
        .map((s) => spielZeile(s, { pfad: PFAD, mitTeam: false, vergangen: istVergangen(s, stand) }))
        .join("\n      ");
      return `<h3>${escapeHtml(gruppe.monat)}</h3>
    <ul class="spiele" role="list">
      ${zeilen}
    </ul>`;
    })
    .join("\n    ");

  const hinweisHtml = hatOffeneVergangene
    ? `<div class="hinweis hinweis--info">
      <p style="margin:0;">Ergebnisse stehen im Prototyp noch nicht in der Datenquelle. In der App und auf FUSSBALL.DE sind sie aktuell.</p>
    </div>`
    : "";

  return `<div class="fluss">
    <h2>Alle Spiele</h2>
    <p class="meta">${alle.length} Spiele · Stand ${datumLang(stand)}</p>
    ${hinweisHtml}
    ${gruppenHtml || `<p class="meta">Keine Spiele in data/spiele.json gefunden.</p>`}
  </div>`;
}

// ---------- Seitenspalte: Kalender, Tabelle, Mannschaft ----------

function seitenspalte(team, daten) {
  const verein = daten.verein ?? {};

  const kalenderBasis = verein.kalender_basis ?? "";
  const kalenderKarte = `<div class="karte fluss">
      <h2 class="karte__titel">Kalender abonnieren</h2>
      <p><a href="${escapeHtml(kalenderBasis + (team.kalender ?? ""))}">Spielplan ${escapeHtml(team.kurz)} (ICS)</a></p>
      <p><a href="${escapeHtml(kalenderBasis + (team.trainingsKalender ?? ""))}">Trainingszeiten ${escapeHtml(team.kurz)} (ICS)</a></p>
      <p class="meta">Einmal abonnieren – Verlegungen kommen automatisch an.</p>
    </div>`;

  const tabelleEintrag = daten.tabellen?.teams?.[team.slug];
  const eigene = tabelleEintrag?.zeilen?.find((z) => z.eigene);
  const tabelleKarte = team.tabelle
    ? `<div class="karte fluss">
      <h2 class="karte__titel">Tabelle</h2>
      ${eigene ? `<p class="meta">Platz ${eigene.platz} von ${tabelleEintrag.zeilen.length} · ${eigene.punkte} Punkte</p>` : ""}
      <p class="knopfzeile">
        <a class="knopf knopf--sekundaer" href="${PFAD}tabellen/#${team.slug}">Zur Tabelle</a>
      </p>
    </div>`
    : `<div class="karte fluss">
      <h2 class="karte__titel">Tabelle</h2>
      <p class="meta">Im Kinderfußball gibt es keine Tabellen.</p>
    </div>`;

  const mannschaftKarte = `<div class="karte fluss">
      <h2 class="karte__titel">Mannschaft</h2>
      <p class="knopfzeile">
        <a class="knopf knopf--sekundaer" href="${PFAD}mannschaften/${team.slug}/">Zur Mannschaftsseite</a>
      </p>
      <ul class="karte__training" role="list">
      ${trainingKompakt(team)}
      </ul>
    </div>`;

  return `<aside class="fluss">
    ${kalenderKarte}
    ${tabelleKarte}
    ${mannschaftKarte}
  </aside>`;
}

// ---------- Zurück-Link ----------

function zurueckAbschnitt() {
  return `<section class="abschnitt">
  <div class="container fluss">
    <p><a href="${PFAD}spielplan/">← Alle Spielpläne</a></p>
  </div>
</section>`;
}

function seiteFuerTeam(team, daten) {
  const inhalt = [
    seitenkopfAbschnitt(team),
    naechstesSpielAbschnitt(team, daten),
    `<section class="abschnitt">
  <div class="container">
    <div class="zweispaltig">
      ${hauptspalte(team, daten)}
      ${seitenspalte(team, daten)}
    </div>
  </div>
</section>`,
    zurueckAbschnitt(),
  ].join("\n");

  return {
    url: `/spielplan/${team.slug}/`,
    title: `Spielplan ${team.name}`,
    description: beschreibung(team),
    inhalt,
  };
}

export function seiten(daten) {
  return (daten.teams ?? []).map((team) => seiteFuerTeam(team, daten));
}
