// Teamseiten /mannschaften/<slug>/ (P3) – eine Seite je Mannschaft aus
// data/teams.json: Training, nächste Spiele, Ansprechpartner, Heimspiele,
// Kalender-Abos, Verweis auf weitere Mannschaften derselben Gruppe.

import { mailLink, jahrgangText, naechsteSpiele, spielZeile, trainingsZeilen } from "../../vorlagen/hilfen.mjs";

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

// ---------- Seitenkopf ----------

function seitenkopfAbschnitt(team) {
  return `<section class="abschnitt">
  <div class="container">
    <div class="seitenkopf">
      <p class="meta">Mannschaft · ${escapeHtml(team.gruppe ?? "")}</p>
      <h1>${escapeHtml(team.name)}</h1>
      <p class="seitenkopf__lead">${escapeHtml(jahrgangPraefix(team))} · ${escapeHtml(team.staffel ?? "")}</p>
      <p class="inhalt">Spielbetrieb: ${escapeHtml(team.spielbetrieb ?? "")}.</p>
    </div>
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

  const tabelleTeil = team.tabelle
    ? baldSpan("Tabelle", { knopf: true, sekundaer: true })
    : `<span class="meta">Im Kinderfußball gibt es keine Tabellen.</span>`;

  return `<div class="fluss">
    <h2>Training</h2>
    ${sonderHinweis}
    <ul class="trainings" role="list">
    ${trainingsZeilen(team)}
    </ul>
    <div class="hinweis hinweis--info">
      <p style="margin:0;">${escapeHtml(verein.hinweise?.ferien ?? "")}</p>
    </div>
    <h2>Nächste Spiele</h2>
    ${spieleHtml}
    <p class="knopfzeile">
      ${baldSpan(`Spielplan ${team.kurz}`, { knopf: true })}
      ${tabelleTeil}
    </p>
  </div>`;
}

// ---------- Seitenspalte: Ansprechpartner, Heimspiele, Kalender ----------

function seitenspalte(team, daten) {
  const verein = daten.verein ?? {};
  const trainerZeilen = (team.trainer ?? [])
    .map((name) => `<li>${escapeHtml(name)}</li>`)
    .join("\n        ");

  const ansprechpartnerKarte = `<div class="karte fluss">
      <h2 class="karte__titel">Ansprechpartner</h2>
      <p class="meta" style="margin:0;">Trainerteam</p>
      <ul role="list">
        ${trainerZeilen}
      </ul>
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

// ---------- Weitere Mannschaften derselben Gruppe + Zurück-Link ----------

function weitereMannschaftenAbschnitt(team, daten) {
  const andere = (daten.teams ?? [])
    .filter((t) => t.gruppe === team.gruppe && t.slug !== team.slug)
    .slice(0, 4);

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
    <p><a href="${PFAD}mannschaften/">← Alle Mannschaften</a></p>
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
