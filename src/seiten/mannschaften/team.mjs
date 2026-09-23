// Teamseiten /mannschaften/<slug>/ (P3) – eine Seite je Mannschaft aus
// data/teams.json: Training, nächste Spiele, Ansprechpartner, Heimspiele,
// Kalender-Abos, Verweis auf weitere Mannschaften derselben Gruppe.

import {
  mailLink,
  jahrgangText,
  naechsteSpiele,
  spielZeile,
  trainingsZeilen,
  ruecklink,
  FUSSBALLDE_WIDGET_LADER,
  spieleKastenHtml,
  SPIELE_KASTEN_SKRIPT,
  trainerZeileHtml,
  trainerRolleText,
  trainerFotosSkript,
} from "../../vorlagen/hilfen.mjs";

// W6 (Entscheidung Olgay 23.09.2026): "Spielplan der Saison" und "Tabelle"
// gehören nur noch auf die Mannschaftsseite, keine eigene Seite/Sammelseite
// mehr dafür (/spielplan/<slug>/ und /tabellen/ wurden zu Weiterleitungen,
// siehe src/seiten/spielplan/team.mjs, src/seiten/tabellen.mjs und
// src/vorlagen/weiterleitung.mjs). Die Abschnittslogik unten ist 1:1 aus dem
// ehemaligen src/seiten/spielplan/team.mjs hierher verschoben (keine doppelte
// Logik mehr an zwei Stellen) – nur die vormalige "Zur Tabelle"/"Mannschaft"-
// Karte der Seitenspalte entfällt, weil sie auf genau diese (jetzt schon
// geöffnete) Seite zurückverlinkt hätte.

// Diese Seiten liegen immer unter "/mannschaften/<slug>/" (Tiefe 2), daher
// immer "../../" (siehe pfadZurWurzel() in tools/build.mjs).
const PFAD = "../../";

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// Platzhalter für Seiten, die im aktuellen Paket noch nicht existieren –
// gleiches Muster wie header.mjs/footer.mjs/index.mjs (siehe navigation.mjs),
// hier zusätzlich mit optionaler Sekundär-Variante (Knopf "Tabelle").
function baldSpan(titel, { knopf = false, sekundaer = false } = {}) {
  const klassen = ["nav__bald", knopf ? "knopf" : null, sekundaer ? "knopf--sekundaer" : null]
    .filter(Boolean)
    .join(" ");
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

// "Jahrgang {jahrgang}" – bei den Herren nur "Senioren" (P3, Korrektur A1
// abgeleitet aus kategorie über jahrgangText() in hilfen.mjs).
function jahrgangPraefix(team) {
  const j = jahrgangText(team);
  return j === "Senioren" ? j : `Jahrgang ${j}`;
}

function googleMapsUrl(adresse) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresse)}`;
}

// Herren und A-Jugend spielen ihre Heimspiele am Römerhof (Anlage SW
// Griesheim), alle anderen auf dem Vereinsplatz Mainzer Landstraße 480.
function routeUrl(team, verein) {
  if ((team.heimspiele ?? "").includes("Römerhof")) {
    return googleMapsUrl("Am Römerhof 9, 60486 Frankfurt am Main");
  }
  const s = verein.sportstaette ?? {};
  return googleMapsUrl(`${s.strasse ?? ""}, ${s.plz ?? ""} ${s.ort ?? ""}`.trim());
}

function trainerMailtoHref(team) {
  return `mailto:${team.mail}?subject=${team.kurz}%3A%20Anfrage%20%C3%BCber%20die%20Website`;
}

function trainingVollListe(team) {
  return (team.training ?? [])
    .map((t) => `${TAG_KUERZEL[t.tag] ?? t.tag} ${t.von}–${t.bis}`)
    .join(", ");
}

// Meta-description: voller Trainingsteil, sonst (wenn > 170 Zeichen) auf
// "Training n-mal pro Woche" gekürzt (P3). Herren: "Senioren" statt Jahrgang.
function beschreibung(team) {
  const jahrgangTeil = jahrgangPraefix(team);
  const bauen = (trainingTeil) =>
    `${team.name} des FFV Sportfreunde 04 (Frankfurt-Gallus): ${jahrgangTeil}, Training ${trainingTeil}, Ansprechpartner per Vereinsmail, Spielplan und Tabelle.`;
  let text = bauen(trainingVollListe(team));
  if (text.length > 170) {
    const n = (team.training ?? []).length;
    text = bauen(`${n}-mal pro Woche`);
  }
  return text;
}

// ---------- Spielplan der Saison (Generator-iframe, W2/W6, aus dem
// ehemaligen src/seiten/spielplan/team.mjs übernommen) ----------

// Team -> Gruppe des Spielplan-Generators (https://justolgay.github.io/
// speuzer-spielplan/app-<gruppe>.html). Der Generator bietet keine
// Team-Vorauswahl per URL (kein #<Team>/?team=<Team> im Quelltext, "aktiv"
// ist dort fest auf den ersten Tab der Gruppe gesetzt) – deshalb wird immer
// die ganze Gruppen-Seite eingebettet, siehe spielplanDerSaisonInhalt() unten.
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

// Im appack-Modus (Live-Website) zeigt "Spielplan der Saison" bei Teams mit
// FUSSBALL.DE-Widget (alle außer F1, F2, G-Jugend – Kinderfußball, dort gibt
// es kein Widget) das Widget "team-matches" (vergangene Spiele mit Ergebnis,
// kommende Spiele, live) statt des Generator-iframes; im Prototyp-Modus
// bleibt für alle Teams der Generator-iframe (Widgets laden auf GitHub Pages
// nicht). Ohne Team-Vorauswahl im Generator nennt der Hinweistext die
// anderen Teams der Gruppe als Geschwister, statt "Tab X wählen" zu
// schreiben.
function generatorIframe(team, daten) {
  const gruppe = GRUPPE_JE_TEAM[team.slug];
  // Team-Vorauswahl des Generators: #<Reiter> öffnet den Reiter des Teams.
  const reiter = daten.widgets?.[team.slug]?.reiter ?? "";
  const generatorUrl = `${GENERATOR_BASIS}app-${gruppe}.html${reiter ? "#" + encodeURIComponent(reiter) : ""}`;

  const gruppenTeams = (daten.teams ?? []).filter((t) => GRUPPE_JE_TEAM[t.slug] === gruppe);
  const geschwisterHinweis =
    gruppenTeams.length > 1
      ? `<p class="meta">Die Übersicht öffnet auf ${escapeHtml(team.kurz)}; die Reiter zeigen die ganze Gruppe (${escapeHtml(
          gruppenTeams.map((t) => t.kurz).join(", ")
        )}). Das nächste Spiel ist hervorgehoben.</p>`
      : `<p class="meta">Das nächste Spiel ist hervorgehoben.</p>`;

  return `<iframe src="${escapeHtml(generatorUrl)}" title="${escapeHtml(`Spielplan ${team.name} (Generator, DFBnet)`)}" loading="lazy" data-generator-iframe style="width:100%;height:640px;border:0;border-radius:var(--r-lg);display:block;"></iframe>
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
    </script>`;
}

// h2 + Inhalt (kein eigener .fluss-Wrapper): reiht sich als weiterer
// Abschnitt in denselben .fluss der Hauptspalte ein wie "Training" und
// "Nächste Spiele" (siehe hauptspalte() unten, CSS-Regeln ".fluss > * + h2"
// / ".fluss > h2 + *" in komponenten.css sind genau für mehrere
// h2-Abschnitte in einem gemeinsamen .fluss gedacht).
//
// W7 (Entscheidung Olgay 23.09.2026, Abschnitt 4): der frühere eigene
// "Nächstes Spiel"-Abschnitt (next-match-Widget) entfällt – der Kasten hier
// (team-matches) beginnt ohnehin mit den nächsten Spielen. Deshalb heißt der
// Abschnitt jetzt "Spiele" statt "Spielplan der Saison" und ist auf rund
// fünf Spiele begrenzt (spieleKastenHtml(), kein inneres Scrollen). Für
// Teams ohne Widget (Kinderfußball F1, F2, G-Jugend) bleibt der
// Generator-Spielplan unter der alten Überschrift unverändert.
function spielplanDerSaisonInhalt(team, daten) {
  const spieleWidgetId = daten.widgets?.[team.slug]?.spiele ?? "";
  const iframeHtml = generatorIframe(team, daten);

  if (!spieleWidgetId) {
    // Kinderfußball (F1, F2, G-Jugend): kein FUSSBALL.DE-Widget, Generator in
    // beiden Modi – bleibt wie bisher (W7-Spezifikation Abschnitt 4).
    return `<h2>Spielplan der Saison</h2>
    ${iframeHtml}`;
  }

  const widgetHtml = `<div class="fussballde-wrap">
        <div class="fussballde_widget" data-id="${escapeHtml(spieleWidgetId)}" data-type="team-matches"></div>
      </div>`;

  return `<h2>Spiele</h2>
    <div data-nur-appack hidden>
      <p class="meta">Nächste Spiele zuerst, frühere Ergebnisse über die Pfeile im Kasten.</p>
      ${spieleKastenHtml(widgetHtml)}
      <p class="meta fussballde-hinweis">Spiele seitlich wischbar</p>
      <p class="meta">Live von FUSSBALL.DE (DFBnet). Tippen öffnet die Spielseite.</p>
    </div>
    <div data-nur-prototyp>
      ${iframeHtml}
    </div>`;
}

// ---------- Tabelle (W2/W6, aus dem ehemaligen src/seiten/spielplan/team.mjs
// übernommen; die dortige "Zur Tabelle"/"Mannschaft"-Karte entfällt, weil sie
// auf genau diese Seite zurückverlinkt hätte) ----------

const KINDERFESTIVAL_SPIELFORM = {
  f1: "4 gegen 4 plus Torwart",
  f2: "4 gegen 4",
  "g-jugend": "3 gegen 3",
};

// Bei F1/F2/G-Jugend ersetzt die Karte "Kinderfestivals" die Tabelle ("Im
// Kinderfußball gibt es keine Tabellen.") – Spielform je Team, keine
// Tabellen, keine Ergebnisse, Spaß und Ballkontakte zählen.
function tabelleInhalt(team, daten) {
  if (!team.tabelle) {
    return `<h2>Kinderfestivals</h2>
    <p>${escapeHtml(KINDERFESTIVAL_SPIELFORM[team.slug] ?? "")} – Kinderfestivals statt Ligabetrieb.</p>
    <p class="meta">Keine Tabellen, keine Ergebnisse: Spaß und Ballkontakte zählen.</p>`;
  }

  const tabelleEintrag = daten.tabellen?.teams?.[team.slug];
  const eigene = tabelleEintrag?.zeilen?.find((z) => z.eigene);
  const tabelleWidgetId = daten.widgets?.[team.slug]?.tabelle ?? "";

  // W7, Abschnitt 4: die Tabelle bleibt vollständig (eigene Platzierung darf
  // nie abgeschnitten sein) und ohne zusätzliche Karte/Schatten um das
  // Widget herum – nur die Beschriftungszeile ist wie bei "Spiele" klein und
  // einheitlich ("Live von FUSSBALL.DE …").
  return `<h2>Tabelle</h2>
    <div data-nur-appack hidden>
      <div class="fussballde-wrap">
        <div class="fussballde_widget" data-id="${escapeHtml(tabelleWidgetId)}" data-type="table"></div>
      </div>
      <p class="meta fussballde-hinweis">Tabelle seitlich wischbar</p>
      <p class="meta">Live von FUSSBALL.DE (DFBnet).</p>
    </div>
    <div data-nur-prototyp>
      ${eigene ? `<p class="meta">Platz ${eigene.platz} von ${tabelleEintrag.zeilen.length} · ${eigene.punkte} Punkte</p>` : ""}
      <p class="meta">Auf der Vereinswebsite kommen Spielplan und Tabellen live aus dem DFBnet.</p>
    </div>`;
}

// ---------- Seitenkopf ----------

function seitenkopfAbschnitt(team) {
  return `<section class="abschnitt seitenkopf">
  <div class="container">
    ${ruecklink(`${PFAD}mannschaften/`, "Mannschaften")}
    <p class="meta">Mannschaft · ${escapeHtml(team.gruppe ?? "")}</p>
    <h1>${escapeHtml(team.name)}</h1>
    <p class="seitenkopf__lead">${escapeHtml(jahrgangPraefix(team))} · ${escapeHtml(team.staffel ?? "")}</p>
    <p class="inhalt">Spielbetrieb: ${escapeHtml(team.spielbetrieb ?? "")}.</p>
  </div>
</section>`;
}

// ---------- Hauptspalte: Training + Nächste Spiele ----------

function hauptspalte(team, daten) {
  const verein = daten.verein ?? {};

  const sonderHinweis =
    team.slug === "herren"
      ? `<div class="hinweis hinweis--info">
      <p style="margin:0;">Die Herren trainieren und spielen extern auf der Bezirkssportanlage am Rebstock (Anlage von SW Griesheim), Am Römerhof 9, 60486 Frankfurt.</p>
    </div>`
      : team.slug === "a-jugend"
        ? `<div class="hinweis hinweis--info">
      <p style="margin:0;">Training auf dem Vereinsplatz, Heimspiele auf der Anlage von SW Griesheim am Rebstock (Am Römerhof 9).</p>
    </div>`
        : "";

  const spiele = naechsteSpiele(daten, { team: team.slug, anzahl: 3 });
  const spieleHtml = spiele.length
    ? `<ul class="spiele" role="list">
    ${spiele.map((s, i) => spielZeile(s, { pfad: PFAD, mitTeam: false, naechstes: i === 0 })).join("\n    ")}
  </ul>`
    : `<div class="hinweis hinweis--info">
      <p style="margin:0;">Zurzeit sind keine Spiele angesetzt.</p>
    </div>`;

  // W7 (Entscheidung Olgay 23.09.2026, Abschnitt 4): der frühere eigene
  // Appack-Abschnitt "Nächstes Spiel" (next-match-Widget) entfällt – der
  // "Spiele"-Kasten weiter unten (team-matches) beginnt ohnehin mit den
  // nächsten Spielen, der Abschnitt war doppelt und machte die Seite
  // widgetlastig. Die eingefrorene Liste bleibt wie bisher nur im Prototyp
  // (dort gibt es keine Widgets); auf der Live-Website übernimmt allein der
  // "Spiele"-Kasten (siehe spielplanDerSaisonInhalt()).
  const naechsteSpieleAbschnitt = `<div data-nur-prototyp>
      <h2>Nächste Spiele</h2>
      ${spieleHtml}
    </div>`;

  return `<div class="fluss">
    <h2>Training</h2>
    ${sonderHinweis}
    <ul class="trainings" role="list">
    ${trainingsZeilen(team)}
    </ul>
    <div class="hinweis hinweis--info">
      <p style="margin:0;">${escapeHtml(verein.hinweise?.ferien ?? "")}</p>
    </div>
    ${naechsteSpieleAbschnitt}
    ${spielplanDerSaisonInhalt(team, daten)}
    ${tabelleInhalt(team, daten)}
  </div>`;
}

// ---------- Seitenspalte: Ansprechpartner, Heimspiele, Kalender ----------

function seitenspalte(team, daten) {
  const verein = daten.verein ?? {};
  // W7, Abschnitt 3: Trainer als Zeilen mit Porträt (Initialen statisch
  // gebaut, echte Fotos lädt trainerFotosSkript() zur Laufzeit nach – siehe
  // hilfen.mjs). Die frühere feste Überschrift "Trainerteam" über der Liste
  // entfällt, weil jede Zeile jetzt ihre eigene (statisch ermittelte) Rolle
  // zeigt.
  const rolleText = trainerRolleText((team.trainer ?? []).length);
  const trainerZeilen = (team.trainer ?? [])
    .map((name, i) => trainerZeileHtml(name, i, rolleText))
    .join("\n        ");

  const ansprechpartnerKarte = `<div class="karte fluss">
      <h2 class="karte__titel">Ansprechpartner</h2>
      <div class="person-mini-liste">
        ${trainerZeilen}
      </div>
      <p>${mailLink(team.mail)}</p>
      <p class="knopfzeile">
        <a class="knopf" href="${escapeHtml(trainerMailtoHref(team))}">E-Mail an das Trainerteam</a>
      </p>
      <p class="meta">Der Kontakt läuft über die Vereinsadresse – keine privaten Handynummern.</p>
    </div>`;

  const heimspieleKarte = `<div class="karte fluss">
      <h2 class="karte__titel">Heimspiele</h2>
      <p>${escapeHtml(team.heimspiele ?? "")}</p>
      <p class="knopfzeile">
        <a class="knopf knopf--sekundaer" href="${escapeHtml(routeUrl(team, verein))}" rel="noopener" target="_blank">Route</a>
      </p>
    </div>`;

  const kalenderBasis = verein.kalender_basis ?? "";
  const kalenderKarte = `<div class="karte fluss">
      <h2 class="karte__titel">Kalender abonnieren</h2>
      <p><a href="${escapeHtml(kalenderBasis + (team.kalender ?? ""))}">Spielplan ${escapeHtml(team.kurz)} (ICS)</a></p>
      <p><a href="${escapeHtml(kalenderBasis + (team.trainingsKalender ?? ""))}">Trainingszeiten ${escapeHtml(team.kurz)} (ICS)</a></p>
      <p class="meta">Einmal abonnieren – Verlegungen kommen automatisch an.</p>
    </div>`;

  return `<aside class="fluss">
    ${ansprechpartnerKarte}
    ${heimspieleKarte}
    ${kalenderKarte}
  </aside>`;
}

// ---------- Weitere Mannschaften derselben Gruppe (W7: bleibt als natürliche
// Navigation unten auf der Seite; der frühere zusätzliche "‹ Zurück zu
// Mannschaften"-Link direkt darunter entfällt – der Rücklink oben im
// Seitenkopf reicht, siehe ruecklink() und W7-Spezifikation Abschnitt 1)
// ----------

// P4, Korrektur A2: Reihenfolge nach Nähe im Alter statt Dateireihenfolge –
// sortiert nach Abstand des Index in teams.json zum aktuellen Team
// (aufsteigend), dann die ersten vier.
function weitereMannschaftenAbschnitt(team, daten) {
  const alleTeams = daten.teams ?? [];
  const aktuellerIndex = alleTeams.findIndex((t) => t.slug === team.slug);
  const andere = alleTeams
    .map((t, index) => ({ t, abstand: Math.abs(index - aktuellerIndex) }))
    .filter(({ t }) => t.gruppe === team.gruppe && t.slug !== team.slug)
    .sort((a, b) => a.abstand - b.abstand)
    .slice(0, 4)
    .map(({ t }) => t);

  const karten = andere
    .map(
      (t) => `<a class="karte karte--link" href="${PFAD}mannschaften/${t.slug}/">
      <span class="karte__titel">${escapeHtml(t.name)}</span>
      <span class="karte__meta">${escapeHtml(jahrgangPraefix(t))}</span>
    </a>`
    )
    .join("\n    ");

  const weitereBlock = andere.length
    ? `<h2>Weitere Mannschaften</h2>
    <div class="raster raster--4">
    ${karten}
    </div>`
    : "";

  return `<section class="abschnitt">
  <div class="container fluss">
    ${weitereBlock}
  </div>
</section>`;
}

function seiteFuerTeam(team, daten) {
  const inhalt = [
    seitenkopfAbschnitt(team),
    `<section class="abschnitt">
  <div class="container">
    <div class="zweispaltig">
      ${hauptspalte(team, daten)}
      ${seitenspalte(team, daten)}
    </div>
  </div>
</section>`,
    weitereMannschaftenAbschnitt(team, daten),
    // W6: jetzt auch die Tabelle (team.tabelle) auf dieser Seite – Lader wie
    // im ehemaligen src/seiten/spielplan/team.mjs bei Spiel- ODER
    // Tabellen-Widget einbinden.
    team.tabelle || daten.widgets?.[team.slug]?.spiele ? FUSSBALLDE_WIDGET_LADER : "",
    // W7: der Spiele-Kasten-Knopf braucht sein Skript nur bei Teams mit
    // Spiele-Widget (spieleKastenHtml() wird nur dort verwendet).
    daten.widgets?.[team.slug]?.spiele ? SPIELE_KASTEN_SKRIPT : "",
    // W7, Abschnitt 3: lädt bei Bedarf echte Trainerporträts nach (Initialen
    // sind schon statisch gebaut, siehe seitenspalte()).
    trainerFotosSkript(team),
  ].join("\n");

  return {
    url: `/mannschaften/${team.slug}/`,
    title: team.name,
    description: beschreibung(team),
    inhalt,
  };
}

export function seiten(daten) {
  return (daten.teams ?? []).map((team) => seiteFuerTeam(team, daten));
}
