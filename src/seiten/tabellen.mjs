// Tabellen /tabellen/ (P4) – eine Sprungliste plus je Team mit Tabelle ein
// Abschnitt mit der aktuellen Tabelle aus data/tabellen.json.

import { datumLang, zeit, fussballdeTeamUrl, FUSSBALLDE_WIDGET_LADER, brotkrume, ruecklinkAbschnitt } from "../vorlagen/hilfen.mjs";

// Diese Seite liegt immer unter "/tabellen/" (Tiefe 1), daher immer "../"
// (siehe pfadZurWurzel() in tools/build.mjs).
const PFAD = "../";

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// W2b (Prüfer-Befund, wichtig): die Kopfzeile "Momentaufnahme vom …" stand
// unconditional über den Live-Widgets. appack-Modus zeigt jetzt einen
// neutralen Hinweis ohne Stand-Datum, der Prototyp weiterhin die
// Momentaufnahme mit Stand-Angabe – dort ergänzt um den Satz, dass Spielplan
// und Tabellen auf der Vereinswebsite live aus dem DFBnet kommen (Kleiner
// Befund, einmal im Seitenkopf statt je Team).
function seitenkopfAbschnitt(daten) {
  const stand = daten.tabellen?.stand ?? daten.stand;
  const uhrzeit = String(stand).slice(11, 16);
  return `<section class="abschnitt seitenkopf">
  <div class="container">
    ${brotkrume([{ text: "Spielplan & Tabellen", href: `${PFAD}spielplan/` }, { text: "Tabellen" }])}
    <h1>Tabellen</h1>
    <p class="seitenkopf__lead">Die aktuellen Tabellen unserer Mannschaften mit Ligabetrieb.</p>
    <div data-nur-appack hidden>
      <p class="meta">Live-Tabellen aus dem DFBnet, laufend aktualisiert von FUSSBALL.DE.</p>
    </div>
    <div data-nur-prototyp>
      <p class="meta">Momentaufnahme vom ${datumLang(stand)}, ${zeit(uhrzeit)} · live auf FUSSBALL.DE</p>
      <p class="meta">Auf der Vereinswebsite kommen Spielplan und Tabellen live aus dem DFBnet.</p>
    </div>
  </div>
</section>`;
}

function sprunglisteAbschnitt(teamsMitTabelle) {
  const pillen = teamsMitTabelle
    .map((team) => `<a class="sprung" href="#${team.slug}">${escapeHtml(team.kurz)}</a>`)
    .join("\n      ");

  return `<nav aria-label="Tabellen">
  <div class="container">
    <div class="knopfzeile">
      ${pillen}
    </div>
  </div>
</nav>`;
}

// Mannschaftszelle: der von fussball.de gelieferte Name trägt bei
// zurueckgezogenen Mannschaften schon die Endung "zg." im Text – hier nur
// abgetrennt und als .meta (gedämpft) dargestellt statt doppelt angehängt.
function mannschaftZelle(zeile) {
  const name = zeile.zurueckgezogen ? zeile.mannschaft.replace(/\s*zg\.$/, "") : zeile.mannschaft;
  const zusatz = zeile.zurueckgezogen ? ` <span class="meta">zg.</span>` : "";
  return `${escapeHtml(name)}${zusatz}`;
}

function tabelleZeile(zeile) {
  return `<tr${zeile.eigene ? ' class="eigene"' : ""}>
        <td class="zahl">${zeile.platz}</td>
        <td class="tabelle__mannschaft">${mannschaftZelle(zeile)}</td>
        <td class="zahl">${zeile.spiele}</td>
        <td class="zahl tabelle__optional">${zeile.g}</td>
        <td class="zahl tabelle__optional">${zeile.u}</td>
        <td class="zahl tabelle__optional">${zeile.v}</td>
        <td class="zahl tabelle__optional">${escapeHtml(zeile.tore)}</td>
        <td class="zahl tabelle__optional-2">${zeile.diff}</td>
        <td class="zahl">${zeile.punkte}</td>
      </tr>`;
}

// W2: appack-Modus zeigt das FUSSBALL.DE-Tabellen-Widget des Teams (aus
// data/widgets.json, in derselben Reihenfolge wie bisher: Herren, A, D1, D2,
// D3, E1, E2, E3), der Prototyp weiterhin die eingefrorene Tabelle wie
// heute. Überschrift, Staffel-Angabe und der Link zum Spielplan bleiben in
// beiden Modi sichtbar.
function teamAbschnitt(team, daten, index) {
  const eintrag = daten.tabellen?.teams?.[team.slug];
  const zeilen = eintrag?.zeilen ?? [];
  const hatZurueckgezogene = zeilen.some((z) => z.zurueckgezogen);
  const hellKlasse = index % 2 === 1 ? " abschnitt--hell" : "";

  const zeilenHtml = zeilen.map(tabelleZeile).join("\n      ");

  const fussballdeUrl = fussballdeTeamUrl(team);
  const fussballdeLink = fussballdeUrl
    ? `<p><a href="${escapeHtml(fussballdeUrl)}" rel="noopener" target="_blank">Tabelle auf FUSSBALL.DE</a></p>`
    : "";

  const fussnote = hatZurueckgezogene
    ? `<p class="meta">zg. = zurückgezogen, Ergebnisse werden eingerechnet</p>`
    : "";

  const widgetId = daten.widgets?.[team.slug]?.tabelle ?? "";

  return `<section class="abschnitt abschnitt--kompakt${hellKlasse}">
  <div class="container fluss">
    <h2 id="${team.slug}">${escapeHtml(team.name)}</h2>
    <p class="meta">${escapeHtml(eintrag?.staffel ?? team.staffel ?? "")}</p>
    <div data-nur-appack hidden>
      <div class="fussballde-wrap">
        <div class="fussballde_widget" data-id="${escapeHtml(widgetId)}" data-type="table"></div>
      </div>
      <p class="meta fussballde-hinweis">Tabelle seitlich wischbar</p>
    </div>
    <div data-nur-prototyp>
      <div class="tabelle-wrap">
        <table>
          <thead>
            <tr>
              <th class="zahl">Platz</th>
              <th class="tabelle__mannschaft">Mannschaft</th>
              <th class="zahl">Sp</th>
              <th class="zahl tabelle__optional">G</th>
              <th class="zahl tabelle__optional">U</th>
              <th class="zahl tabelle__optional">V</th>
              <th class="zahl tabelle__optional">Tore</th>
              <th class="zahl tabelle__optional-2">Diff</th>
              <th class="zahl">Pkt</th>
            </tr>
          </thead>
          <tbody>
        ${zeilenHtml}
          </tbody>
        </table>
      </div>
      ${fussnote}
      ${fussballdeLink}
    </div>
    <p><a href="${PFAD}spielplan/${team.slug}/">Spielplan ${escapeHtml(team.kurz)}</a></p>
  </div>
</section>`;
}

function kinderfussballHinweisAbschnitt() {
  return `<section class="abschnitt">
  <div class="container">
    <div class="hinweis hinweis--info">
      <p style="margin:0;">F- und G-Jugend spielen im Kinderfußball Festivals ohne Tabellen.</p>
    </div>
  </div>
</section>`;
}

export function seite(daten) {
  const teamsMitTabelle = (daten.teams ?? []).filter((t) => t.tabelle);

  const inhalt = [
    seitenkopfAbschnitt(daten),
    sprunglisteAbschnitt(teamsMitTabelle),
    ...teamsMitTabelle.map((team, index) => teamAbschnitt(team, daten, index)),
    kinderfussballHinweisAbschnitt(),
    ruecklinkAbschnitt(`${PFAD}spielplan/`, "Spielplan & Tabellen"),
    FUSSBALLDE_WIDGET_LADER,
  ].join("\n");

  return {
    url: "/tabellen/",
    title: "Tabellen",
    description:
      "Aktuelle Tabellen der Herren, A-Jugend, D- und E-Jugend des FFV Sportfreunde 04 – Platz, Spiele, Tore und Punkte live aus dem DFBnet.",
    inhalt,
    bodyclass: "tabellen",
  };
}
