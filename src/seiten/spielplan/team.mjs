// Team-Spielpläne /spielplan/<slug>/ (P4) – eine Seite je Mannschaft aus
// data/teams.json: nächstes Spiel groß, alle Spiele der Saison gruppiert nach
// Monat, Kalender-Abo, Tabellenplatz, Link zur Mannschaftsseite.

import {
  datumLang,
  zeit,
  wettbewerbTag,
  naechsteSpiele,
  FUSSBALLDE_WIDGET_LADER,
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

// W2b (Prüfer-Befund, wichtig): die Karte "Nächstes Spiel" zeigte
// eingefrorenes Datum/Gegner ohne Ausgabemodus-Split. appack-Modus zeigt
// jetzt einen neutralen Hinweis (das Generator-iframe "Ganze Saison" weiter
// unten auf derselben Seite zeigt das nächste Spiel live), der Prototyp
// weiterhin die eingefrorene Spielkarte wie bisher.
function naechstesSpielAbschnitt(team, daten) {
  const [spiel] = naechsteSpiele(daten, { team: team.slug, anzahl: 1 });

  let prototypInhalt;
  if (!spiel) {
    const qualiHinweis = ["e1", "e2", "e3"].includes(team.slug)
      ? `<p style="margin:var(--sp-2) 0 0;">Die Hauptrunde wird vom Kreis nach der Qualifikationsrunde eingeteilt.</p>`
      : "";
    prototypInhalt = `<div class="hinweis hinweis--info">
      <p style="margin:0;">Zurzeit ist kein Spiel angesetzt.</p>
      ${qualiHinweis}
    </div>`;
  } else {
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

    prototypInhalt = `<div class="karte karte--spiel">
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
    </div>`;
  }

  return `<section class="abschnitt">
  <div class="container fluss">
    <h2>Nächstes Spiel</h2>
    <div data-nur-appack hidden>
      <div class="hinweis hinweis--info">
        <p style="margin:0;">Das nächste Spiel steht live im Spielplan unten (Quelle: DFBnet).</p>
      </div>
    </div>
    <div data-nur-prototyp>
      ${prototypInhalt}
    </div>
  </div>
</section>`;
}

// ---------- Hauptspalte: Ganze Saison (W2: Generator-iframe, beide Modi) ----------

// Team -> Gruppe des Spielplan-Generators (https://justolgay.github.io/
// speuzer-spielplan/app-<gruppe>.html). Der Generator bietet keine
// Team-Vorauswahl per URL (kein #<Team>/?team=<Team> im Quelltext, "aktiv"
// ist dort fest auf den ersten Tab der Gruppe gesetzt) – deshalb wird immer
// die ganze Gruppen-Seite eingebettet, siehe ganzeSaisonAbschnitt() unten.
const GRUPPE_JE_TEAM = {
  herren: "herren",
  "a-jugend": "a-jugend",
  d1: "d-jugend",
  d2: "d-jugend",
  d3: "d-jugend",
  e1: "e-jugend",
  e2: "e-jugend",
  e3: "e-jugend",
  f1: "f-jugend",
  f2: "f-jugend",
  "g-jugend": "g-jugend",
};

const GENERATOR_BASIS = "https://justolgay.github.io/speuzer-spielplan/";

// W2: "Ganze Saison" ist in BEIDEN Ausgabemodi (Prototyp und appack) ein
// <iframe> auf die Gruppen-Seite des Spielplan-Generators – keine
// eingefrorenen Daten mehr, daher kein data-nur-appack/data-nur-prototyp an
// dieser Stelle. Ohne Team-Vorauswahl im Generator (siehe oben) nennt der
// Hinweistext die anderen Teams der Gruppe als Geschwister, statt "Tab X
// wählen" zu schreiben.
function ganzeSaisonAbschnitt(team, daten) {
  const gruppe = GRUPPE_JE_TEAM[team.slug];
  const generatorUrl = `${GENERATOR_BASIS}app-${gruppe}.html`;

  const gruppenTeams = (daten.teams ?? []).filter((t) => GRUPPE_JE_TEAM[t.slug] === gruppe);
  const geschwisterHinweis =
    gruppenTeams.length > 1
      ? `<p class="meta">Diese Übersicht zeigt die ganze Gruppe: ${escapeHtml(
          gruppenTeams.map((t) => t.kurz).join(", ")
        )}.</p>`
      : "";

  return `<div class="fluss">
    <h2>Ganze Saison</h2>
    <iframe src="${escapeHtml(generatorUrl)}" title="${escapeHtml(`Spielplan ${team.name} (Generator, DFBnet)`)}" loading="lazy" data-generator-iframe style="width:100%;height:640px;border:0;border-radius:var(--r-lg);display:block;"></iframe>
    ${geschwisterHinweis}
    <p class="meta">Quelle: DFBnet, täglich aktualisiert. Tippen auf ein Spiel öffnet FUSSBALL.DE.</p>
    <script>
    (function () {
      var iframe = document.querySelector('[data-generator-iframe]');
      if (!iframe) return;
      window.addEventListener('message', function (event) {
        if (event.origin !== 'https://justolgay.github.io') return;
        if (event.source !== iframe.contentWindow) return;
        var h = event.data && event.data.speuzerHeight;
        if (typeof h !== 'number' || h < 200 || h > 20000) return;
        iframe.style.height = h + 'px';
      });
    })();
    </script>
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

  // W2: appack-Modus zeigt das FUSSBALL.DE-Tabellen-Widget des Teams (aus
  // data/widgets.json), der Prototyp weiterhin die eingefrorene Platzangabe
  // wie bisher. Teams ohne Tabelle (Kinderfußball F/G) behalten ihren
  // Hinweistext unverändert in beiden Modi.
  const tabelleEintrag = daten.tabellen?.teams?.[team.slug];
  const eigene = tabelleEintrag?.zeilen?.find((z) => z.eigene);
  const tabelleWidgetId = daten.widgets?.[team.slug]?.tabelle ?? "";
  const tabelleKarte = team.tabelle
    ? `<div class="karte fluss">
      <h2 class="karte__titel">Tabelle</h2>
      <div data-nur-appack hidden>
        <div class="fussballde_widget" data-id="${escapeHtml(tabelleWidgetId)}" data-type="table"></div>
      </div>
      <div data-nur-prototyp>
        ${eigene ? `<p class="meta">Platz ${eigene.platz} von ${tabelleEintrag.zeilen.length} · ${eigene.punkte} Punkte</p>` : ""}
        <p class="knopfzeile">
          <a class="knopf knopf--sekundaer" href="${PFAD}tabellen/#${team.slug}">Zur Tabelle</a>
        </p>
        <p class="meta">Auf der Vereinswebsite kommen Spielplan und Tabellen live aus dem DFBnet.</p>
      </div>
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
      ${ganzeSaisonAbschnitt(team, daten)}
      ${seitenspalte(team, daten)}
    </div>
  </div>
</section>`,
    zurueckAbschnitt(),
    team.tabelle ? FUSSBALLDE_WIDGET_LADER : "",
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
