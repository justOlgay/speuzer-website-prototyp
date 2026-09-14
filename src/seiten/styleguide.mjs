// Gestaltungssystem „Speuzer Blau-Weiß“ – interner Anhang für das Übernahmepaket.
// Zeigt alle Tokens aus assets/css/tokens.css: Farben mit Hex und gemessenem
// Kontrast (Werte aus dem Plan, Abschnitt 2.1), Schriftskala, Abstände, Radien,
// Schatten, Knöpfe, Fokuszustand, Wappen in drei Varianten auf hell/dunkel.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mailLink, datumLang } from "../vorlagen/hilfen.mjs";
import { bild } from "../vorlagen/bild.mjs";
import { tabbar } from "../vorlagen/header.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// Diese Seite liegt immer unter "/styleguide/" (Tiefe 1), daher immer "../"
// (siehe pfadZurWurzel() in tools/build.mjs).
const PFAD = "../";

function liesWappen(datei) {
  return readFileSync(path.join(ROOT, "assets", "logo", datei), "utf8");
}

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const WOCHENTAGE = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

function formatDatum(datumIso) {
  const d = new Date(`${datumIso}T00:00:00`);
  const tag = WOCHENTAGE[d.getDay()];
  const tt = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${tag} ${tt}.${mm}.`;
}

const FARBEN = [
  { token: "--blau-950", hex: "#0B0E4A", verwendung: "Fußbereich, dunkle Flächen", kontrast: "Weiß darauf 17,2:1", textHell: true },
  { token: "--blau-900", hex: "#151A7A", verwendung: "Kopfleiste, Überschriften auf Weiß", kontrast: "auf Weiß 14,4:1", textHell: true },
  { token: "--blau-800", hex: "#191793", verwendung: "Primärflächen (App-Hauptfarbe)", kontrast: "Weiß darauf 13,3:1", textHell: true },
  { token: "--blau-700", hex: "#1F2DBE", verwendung: "Primärknopf, Links", kontrast: "auf Weiß 9,7:1, auf --bg 8,9:1", textHell: true },
  { token: "--blau-600", hex: "#2A3BDD", verwendung: "Hover Knopf/Link", kontrast: "auf Weiß 7,6:1", textHell: true },
  { token: "--blau-500", hex: "#3D4FEA", verwendung: "Fokusrahmen, Akzentlinien", kontrast: "auf Weiß 6,0:1 (nur Rahmen/Grafik, nicht Fließtext)", textHell: true },
  { token: "--blau-100", hex: "#E4E7FA", verwendung: "helle Kacheln, Tags", kontrast: "Tinte darauf 14,7:1", textHell: false },
  { token: "--blau-50", hex: "#F3F5FC", verwendung: "Sektionshintergrund", kontrast: "–", textHell: false },
  { token: "--ink", hex: "#12142B", verwendung: "Fließtext", kontrast: "auf Weiß 18,1:1", textHell: true },
  { token: "--ink-2", hex: "#3F4360", verwendung: "Nebentext", kontrast: "auf Weiß 9,6:1", textHell: true },
  { token: "--ink-3", hex: "#5B6079", verwendung: "Meta (Datum, Quelle)", kontrast: "auf Weiß 6,2:1, auf --bg 5,7:1", textHell: true },
  { token: "--line", hex: "#D8DBEA", verwendung: "Trennlinien, Tabellenlinien", kontrast: "–", textHell: false },
  { token: "--bg", hex: "#F5F6FB", verwendung: "Seitenhintergrund", kontrast: "–", textHell: false },
  { token: "--surface / --weiss", hex: "#FFFFFF", verwendung: "Karten / Text auf Blau", kontrast: "–", textHell: false },
  { token: "--ok", hex: "#1E6B3A", verwendung: "Heimspiel-Tag (nur Text)", kontrast: "auf Weiß 6,5:1", textHell: true },
  { token: "--warn", hex: "#8A4B00", verwendung: "offene Angabe (nur Text)", kontrast: "auf Weiß 6,9:1", textHell: true },
  { token: "--wappen", hex: "#0300FD", verwendung: "nur im Logo selbst", kontrast: "–", textHell: true },
];

const SCHRIFTGROESSEN = [
  { token: "--fs-xs", wert: ".8rem" },
  { token: "--fs-sm", wert: ".9rem" },
  { token: "--fs-md", wert: "1rem" },
  { token: "--fs-lg", wert: "1.25rem" },
  { token: "--fs-xl", wert: "1.5625rem" },
  { token: "--fs-2xl", wert: "1.953rem" },
  { token: "--fs-3xl", wert: "2.441rem" },
  { token: "--fs-4xl", wert: "clamp(2.4rem, 5vw, 3.6rem)" },
];

const ABSTAENDE = [
  ["--sp-1", "4px"], ["--sp-2", "8px"], ["--sp-3", "12px"], ["--sp-4", "16px"],
  ["--sp-5", "24px"], ["--sp-6", "32px"], ["--sp-7", "48px"], ["--sp-8", "64px"], ["--sp-9", "96px"],
];

const RADIEN = [
  ["--r-sm", "6px"], ["--r-md", "12px"], ["--r-lg", "20px"], ["--r-pill", "999px"],
];

function seiteFarben() {
  return `<h2>Farben</h2>
<p class="inhalt">Ein Blauklang aus dem Wappen (Hue 240) plus neutrale Tinte. Kein Rot, kein Gelb, kein dekoratives Grau. Kontrastwerte nach WCAG-Formel, siehe Plan Abschnitt 2.1.</p>
<div class="sg-farbraster" role="list">
${FARBEN.map((f) => `  <div class="sg-farbe" role="listitem" style="background:${f.hex};color:${f.textHell ? "#FFFFFF" : "#12142B"}">
    <strong>${f.token}</strong>
    <span>${f.hex}</span>
    <span class="sg-klein">${f.verwendung}</span>
    <span class="sg-klein">${f.kontrast}</span>
  </div>`).join("\n")}
</div>`;
}

function seiteSchrift() {
  return `<h2>Schrift</h2>
<p class="inhalt">Überschriften, Zahlen und Ergebnisse in Barlow Condensed (600/700), Fließtext und Bedienung in Inter (400/600). Beide Schriften selbst gehostet als woff2.</p>
<div class="sg-schriftskala">
${SCHRIFTGROESSEN.map((s) => `  <p style="font-size:var(${s.token});font-family:var(--font-head);line-height:var(--lh-head);margin:0;">${s.token} — ${s.wert}</p>`).join("\n")}
</div>
<p style="font-family:var(--font-text);font-size:var(--fs-md);max-width:var(--measure);">Fließtext-Beispiel in Inter: Zeilenlänge maximal 65 Zeichen (--measure), Zeilenhöhe 1,55 für gute Lesbarkeit auf allen Bildschirmgrößen.</p>`;
}

function seiteAbstaendeRadienSchatten() {
  return `<h2>Abstände, Radien, Schatten</h2>
<div class="sg-abstaende">
${ABSTAENDE.map(([tok, wert]) => `  <div class="sg-abstand"><div class="sg-abstand__balken" style="width:var(${tok})"></div><span>${tok} (${wert})</span></div>`).join("\n")}
</div>
<div class="sg-radien">
${RADIEN.map(([tok, wert]) => `  <div class="sg-radius" style="border-radius:var(${tok})"><span>${tok} ${wert}</span></div>`).join("\n")}
</div>
<div class="sg-schatten">
  <div class="sg-schatten__box" style="box-shadow:var(--sh-1)"><span>--sh-1</span></div>
  <div class="sg-schatten__box" style="box-shadow:var(--sh-2)"><span>--sh-2</span></div>
</div>`;
}

function seiteKnoepfeFokus() {
  return `<h2>Knöpfe und Fokuszustand</h2>
<p class="inhalt">Mindesthöhe 44 px. Mit der Tabulatortaste erreichbar; der sichtbare Fokusrahmen (3 px, --blau-500) erscheint beim Draufspringen.</p>
<p>
  <a class="knopf" href="#inhalt">Primärknopf</a>
  <a class="knopf knopf--sekundaer" href="#inhalt">Sekundärknopf</a>
</p>
<p>Zum Testen des Fokusrahmens mit der Tabulatortaste zu diesem Link springen: <a href="#inhalt">Beispiellink</a></p>`;
}

function seiteWappen() {
  const wappenCurrentColor = liesWappen("wappen.svg");
  const wappenBlau = liesWappen("wappen-blau.svg");
  const wappenWeiss = liesWappen("wappen-weiss.svg");
  return `<h2>Wappen</h2>
<p class="inhalt">Aus der Vektorquelle (CorelDRAW-EPS) neu aufgerichtet: die Raute steht mit der Spitze nach oben, der Schriftzug „F.F.V. SPORTFREUNDE E.V. 1904“ ist waagerecht lesbar. Drei Varianten: einfärbbar (currentColor), fest Blau, fest Weiß.</p>
<div class="sg-wappen-raster">
  <div class="sg-wappen-zelle sg-wappen-zelle--hell" style="color:#0300FD">
    ${wappenCurrentColor}
    <span>wappen.svg (currentColor) auf hell</span>
  </div>
  <div class="sg-wappen-zelle sg-wappen-zelle--dunkel" style="color:#FFFFFF">
    ${wappenCurrentColor}
    <span>wappen.svg (currentColor) auf dunkel</span>
  </div>
  <div class="sg-wappen-zelle sg-wappen-zelle--hell">
    ${wappenBlau}
    <span>wappen-blau.svg</span>
  </div>
  <div class="sg-wappen-zelle sg-wappen-zelle--dunkel">
    ${wappenWeiss}
    <span>wappen-weiss.svg</span>
  </div>
</div>`;
}

function seiteKopfFuss() {
  return `<h2>Kopf und Fuß</h2>
<p class="inhalt">Die Kopfzeile mit Hauptnavigation (sechs Punkte, ab 1024px als Leiste, darunter als Burger-Menü) und der Fußbereich sind auf dieser Seite bereits live zu sehen – oben und unten. Ziele, deren Seite im aktuellen Paket noch nicht existiert, erscheinen gedämpft und ohne Link (<code>.nav__bald</code>); sobald die Seite gebaut ist, wird automatisch ein Link daraus.</p>`;
}

function seiteBausteine(daten) {
  const teams = daten.teams ?? [];
  const teamNachSlug = Object.fromEntries(teams.map((t) => [t.slug, t]));
  const d3 = teamNachSlug.d3;

  const seitenkopfBeispiel = `<div class="seitenkopf">
    <h2 style="font-family:var(--font-head);text-transform:uppercase;font-size:var(--fs-3xl);line-height:var(--lh-head);color:var(--blau-900);margin:0;">Mannschaften</h2>
    <p class="seitenkopf__lead">Alle Fußballmannschaften des F.F.V. Sportfreunde 04 mit Training, Spielplan und Ansprechpartner.</p>
  </div>`;

  const kartenTeams = ["d1", "d2", "d3"].map((slug) => teamNachSlug[slug]).filter(Boolean);
  const karten = kartenTeams
    .map(
      (team) => `<span class="karte karte--link" aria-disabled="true" title="Seite folgt">
      <span class="karte__titel">${escapeHtml(team.name)}</span>
      <span class="karte__meta">${escapeHtml(team.jahrgang ?? "")} · ${escapeHtml(team.staffel)}</span>
    </span>`
    )
    .join("\n    ");
  const rasterBeispiel = `<div class="raster raster--3">
    ${karten}
  </div>`;

  const heute = daten.stand.slice(0, 10);
  const kommendeSpiele = (daten.spiele ?? [])
    // nicht abgesagt, mit bekanntem Gegner (Kinderfestivals ohne festen Gegner
    // hier ausgelassen – die brauchen eine eigene Darstellung, kommt mit P3/P4)
    .filter((s) => !s.entfaellt && s.gegner && s.datum >= heute)
    .sort((a, b) => (a.datum + a.zeit).localeCompare(b.datum + b.zeit))
    .slice(0, 3);
  const spieleZeilen = kommendeSpiele
    .map((s, i) => {
      const team = teamNachSlug[s.team];
      const tagKlasse = s.heimspiel ? "tag--heim" : "tag--auswaerts";
      const tagText = s.heimspiel ? "Heim" : "Auswärts";
      const naechstesKlasse = i === 0 ? " spiel--naechstes" : "";
      return `<li class="spiel${naechstesKlasse}">
      <span class="spiel__datum">${formatDatum(s.datum)} · ${escapeHtml(s.zeit)}</span>
      <span class="tag ${tagKlasse}">${tagText}</span>
      <span class="spiel__gegner-block">
        <span class="spiel__gegner">${escapeHtml(s.gegner)} <span class="meta">(${escapeHtml(team?.kurz ?? s.team)})</span></span>
        <span class="spiel__ort">${escapeHtml(s.spielstaette)}</span>
      </span>
      <span class="spiel__ergebnis">${escapeHtml(s.ergebnis) || "–"}</span>
    </li>`;
    })
    .join("\n    ");
  const spieleBeispiel = kommendeSpiele.length
    ? `<ul class="spiele" role="list">
    ${spieleZeilen}
  </ul>`
    : `<p class="meta">Keine kommenden Spiele ab dem Build-Datum in data/spiele.json gefunden.</p>`;

  const trainingsZeilen = (d3?.training ?? [])
    .map(
      (t) => `<li class="training">
      <span class="training__tag">${escapeHtml(t.tag)}</span>
      <span class="training__zeit">${escapeHtml(t.von)}–${escapeHtml(t.bis)} Uhr</span>
      <span class="training__platz">${escapeHtml(d3.platz)}</span>
    </li>`
    )
    .join("\n    ");
  const trainingsBeispiel = `<ul class="trainings" role="list">
    ${trainingsZeilen}
  </ul>`;

  const wappenPlatzhalter = liesWappen("wappen-blau.svg");
  const personBeispiel = `<div class="person" style="max-width:220px;">
    <span class="person__bild person__bild--platzhalter" aria-hidden="true">${wappenPlatzhalter}</span>
    <p class="person__name">Florian Müller</p>
    <p class="person__funktion">Kinderschutzbeauftragter</p>
    <p class="person__mail">${mailLink("kinderschutzbeauftragter@sportfreunde04.de")}</p>
  </div>`;

  const tagsBeispiel = `<p class="knopfzeile">
    <span class="tag">Neutral</span>
    <span class="tag tag--heim">Heim</span>
    <span class="tag tag--auswaerts">Auswärts</span>
    <span class="tag tag--ok">Bestätigt</span>
    <span class="tag tag--warn">Offen</span>
  </p>`;

  const hinweisBeispiel = `<div class="hinweis hinweis--offen">
    <span class="tag tag--warn hinweis__label">Offen</span>
    <p style="margin:0;">Anfahrt und Parken: Angabe folgt</p>
  </div>`;

  const d3Tabelle = daten.tabellen?.teams?.d3;
  const tabelleZeilen = (d3Tabelle?.zeilen ?? [])
    .map(
      (z) => `<tr${z.eigene ? ' class="eigene"' : ""}>
        <td class="zahl">${z.platz}</td>
        <td class="tabelle__mannschaft">${escapeHtml(z.mannschaft)}</td>
        <td class="zahl">${z.spiele}</td>
        <td class="zahl tabelle__optional">${z.g}</td>
        <td class="zahl tabelle__optional">${z.u}</td>
        <td class="zahl tabelle__optional">${z.v}</td>
        <td class="zahl tabelle__optional">${escapeHtml(z.tore)}</td>
        <td class="zahl tabelle__optional-2">${z.diff}</td>
        <td class="zahl">${z.punkte}</td>
      </tr>`
    )
    .join("\n      ");
  const tabelleBeispiel = `<div class="tabelle-wrap">
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
          <th class="zahl">Punkte</th>
        </tr>
      </thead>
      <tbody>
      ${tabelleZeilen}
      </tbody>
    </table>
  </div>
  <p class="meta">Staffel D3: ${escapeHtml(d3Tabelle?.staffel ?? "")} · Momentaufnahme vom ${escapeHtml(daten.tabellen?.stand ?? "")} · unter 640px werden G/U/V/Tore (Klasse <code>tabelle__optional</code>) und Diff (Klasse <code>tabelle__optional-2</code>) ausgeblendet und Mannschaft (Klasse <code>tabelle__mannschaft</code>) gekürzt</p>`;

  const knoepfeBeispiel = `<p class="knopfzeile">
    <a class="knopf" href="#inhalt">Primärknopf</a>
    <a class="knopf knopf--sekundaer" href="#inhalt">Sekundärknopf</a>
    <a class="knopf knopf--gross" href="#inhalt">Großer Knopf</a>
  </p>`;

  const verein = daten.verein ?? {};

  const heroBeispiel = `<div class="abschnitt--blau" style="border-radius:var(--r-lg);padding:var(--sp-6);">
    <p class="hero__kicker">Frankfurter Fußballverein Sportfreunde 1904 e.V. · Gallus</p>
    <p class="hero__titel">Fußball im Gallus – seit 1904.</p>
    <p class="hero__lead">Elf Fußballmannschaften von der G-Jugend bis zu den Herren, eine Karnevalabteilung und ein eigener Platz an der Mainzer Landstraße. Wir sind ein Verein für Menschen: Gemeinschaft, Respekt und Freude am Spiel.</p>
  </div>`;

  const heroFaktenBeispiel = `<div class="abschnitt--blau" style="border-radius:var(--r-lg);padding:var(--sp-5);">
    <ul class="hero__fakten" role="list">
      <li>Gegründet ${escapeHtml(String(verein.gruendung_jahr ?? ""))}</li>
      <li>${escapeHtml(String(verein.anzahl_mannschaften ?? ""))} Mannschaften</li>
      <li>${escapeHtml(verein.sportstaette?.strasse ?? "")}</li>
    </ul>
  </div>`;

  const schritteBeispiel = `<ol class="schritte">
    <li><p>E-Mail an die Jugendleitung mit Jahrgang und Vorerfahrung</p></li>
    <li><p>Termin fürs Probetraining bekommen und ein- bis zweimal mitmachen</p></li>
    <li><p>Aufnahmeantrag ausfüllen – Beiträge und Unterlagen stehen unter „Mitglied werden“</p></li>
  </ol>`;

  const addressBeispiel = `<address>
    <p>${escapeHtml(verein.name_register ?? "")}</p>
    <p>${escapeHtml(verein.sportstaette?.strasse ?? "")}</p>
    <p>${escapeHtml(verein.sportstaette?.plz ?? "")} ${escapeHtml(verein.sportstaette?.ort ?? "")}</p>
  </address>`;

  const trainingsrasterTeams = ["d1", "d2", "d3"].map((slug) => teamNachSlug[slug]).filter(Boolean);
  const trainingsrasterZeilen = trainingsrasterTeams
    .map((team) => {
      const einheiten = (team.training ?? [])
        .map((t) => `<span>${escapeHtml(t.tag.slice(0, 2))} ${escapeHtml(t.von)}–${escapeHtml(t.bis)}</span>`)
        .join("\n        ");
      return `<li class="trainingsraster__zeile">
        <span class="trainingsraster__name">${escapeHtml(team.name)}</span>
        <span class="trainingsraster__jahrgang meta">${escapeHtml(team.jahrgang ?? "–")}</span>
        <span class="trainingsraster__einheiten">
        ${einheiten}
        </span>
      </li>`;
    })
    .join("\n      ");
  const trainingsrasterBeispiel = `<ul class="trainingsraster" role="list">
    <li class="trainingsraster__kopf" aria-hidden="true">
      <span>Mannschaft</span><span>Jahrgang</span><span>Training</span>
    </li>
    ${trainingsrasterZeilen}
  </ul>`;

  // P3: kompakte Team-Karte (.karte__training, .karte__mehr) – echter Link,
  // da /mannschaften/d3/ inzwischen existiert.
  const teamKarteBeispiel = d3
    ? `<a class="karte karte--link" href="${PFAD}mannschaften/${d3.slug}/" style="max-width:280px;">
    <span class="karte__titel">${escapeHtml(d3.name)}</span>
    <span class="karte__meta">Jahrgang ${escapeHtml(d3.jahrgang ?? "")} · ${escapeHtml(d3.staffel)}</span>
    <ul class="karte__training" role="list">
      ${(d3.training ?? [])
        .map((t) => `<li>${escapeHtml(t.tag.slice(0, 2))} ${escapeHtml(t.von)}–${escapeHtml(t.bis)}</li>`)
        .join("\n      ")}
    </ul>
    <span class="karte__mehr">Zur Mannschaft →</span>
  </a>`
    : `<p class="meta">Kein Team "d3" in data/teams.json gefunden.</p>`;

  // P3: zweispaltiges Layout (Teamseiten) – ab 1024px 7/12 + 5/12, darunter
  // (Hauptspalte zuerst) untereinander.
  const zweispaltigBeispiel = `<div class="zweispaltig">
    <div class="karte">Hauptspalte (7/12 ab 1024px)</div>
    <div class="karte">Seitenspalte (5/12 ab 1024px)</div>
  </div>`;

  // P4: Karte „Nächstes Spiel" (.karte--spiel) – erstes kommendes Spiel mit
  // bekanntem Gegner, wie auf den Team-Spielplanseiten.
  const karteSpielBeispiel = kommendeSpiele.length
    ? (() => {
        const s = kommendeSpiele[0];
        const tagKlasse = s.heimspiel ? "tag--heim" : "tag--auswaerts";
        const tagText = s.heimspiel ? "Heim" : "Auswärts";
        return `<div class="karte karte--spiel" style="max-width:360px;">
    <p class="karte__spiel-datum">${escapeHtml(datumLang(s.datum))} · ${escapeHtml(s.zeit)} Uhr</p>
    <p class="knopfzeile" style="margin:0;">
      <span class="tag ${tagKlasse}">${tagText}</span>
    </p>
    <p class="karte__spiel-gegner">${escapeHtml(s.gegner)}</p>
    <p class="karte__spiel-ort">
      <span>${escapeHtml(s.spielstaette ?? "")}</span>
    </p>
  </div>`;
      })()
    : `<p class="meta">Kein kommendes Spiel mit bekanntem Gegner in data/spiele.json gefunden.</p>`;

  // P4: Sprunglink-Pille (.sprung) – wie auf /tabellen/.
  const sprungBeispiel = `<p class="knopfzeile">
    <a class="sprung" href="#inhalt">D1</a>
    <a class="sprung" href="#inhalt">D2</a>
    <a class="sprung" href="#inhalt">D3</a>
  </p>`;

  // P4: Vergangenes Spiel (.spiel--vergangen) – letztes Spiel vor dem
  // Build-Datum, wie in „Alle Spiele" auf den Team-Spielplanseiten.
  const vergangenesSpiel = (daten.spiele ?? [])
    .filter((s) => !s.entfaellt && s.datum < heute)
    .sort((a, b) => (b.datum + b.zeit).localeCompare(a.datum + a.zeit))[0];
  const spielVergangenBeispiel = vergangenesSpiel
    ? (() => {
        const s = vergangenesSpiel;
        const team = teamNachSlug[s.team];
        const tagKlasse = s.heimspiel ? "tag--heim" : "tag--auswaerts";
        const tagText = s.heimspiel ? "Heim" : "Auswärts";
        const ergebnisInhalt = s.ergebnis
          ? escapeHtml(s.ergebnis)
          : s.fussballde_link
            ? `<a href="${escapeHtml(s.fussballde_link)}" rel="noopener" target="_blank">Ergebnis auf FUSSBALL.DE</a>`
            : "";
        return `<ul class="spiele" role="list">
    <li class="spiel spiel--vergangen">
      <span class="spiel__datum">${formatDatum(s.datum)} · ${escapeHtml(s.zeit)}</span>
      <span class="tag ${tagKlasse}">${tagText}</span>
      <span class="spiel__gegner-block">
        <span class="spiel__gegner">${escapeHtml(s.gegner)} <span class="meta">(${escapeHtml(team?.kurz ?? s.team)})</span></span>
        <span class="spiel__ort meta">${escapeHtml(s.spielstaette ?? "")}</span>
      </span>
      <span class="spiel__ergebnis">${ergebnisInhalt}</span>
    </li>
  </ul>`;
      })()
    : `<p class="meta">Kein vergangenes Spiel vor dem Build-Datum in data/spiele.json gefunden.</p>`;

  // P5: Zahlen-Kachel (.zahl) – wie im Abschnitt "Zahlen" auf /verein/.
  const zahlenBeispiel = `<div class="abschnitt--blau" style="border-radius:var(--r-lg);padding:var(--sp-6);">
    <div class="raster raster--4">
      <div class="zahl"><span class="zahl__wert">${escapeHtml(String(verein.gruendung_jahr ?? ""))}</span><span class="zahl__label">gegründet</span></div>
      <div class="zahl"><span class="zahl__wert">${escapeHtml(String(verein.anzahl_mannschaften ?? ""))}</span><span class="zahl__label">Fußballmannschaften</span></div>
      <div class="zahl"><span class="zahl__wert">${escapeHtml(String((daten.karneval?.gruppen ?? []).length || 5))}</span><span class="zahl__label">Karnevalgruppen</span></div>
      <div class="zahl"><span class="zahl__wert">2</span><span class="zahl__label">Abteilungen</span></div>
    </div>
  </div>`;

  // P5: Download-Zeile (.download) – wie auf /verein/downloads/.
  const beispielDownload = (daten.downloads ?? [])[0];
  const downloadBeispiel = beispielDownload
    ? `<ul class="downloads" role="list">
    <li class="download">
      <a href="${escapeHtml(beispielDownload.datei ?? "")}" rel="noopener" target="_blank">${escapeHtml(beispielDownload.titel ?? "")}</a>
      <span class="meta">PDF${beispielDownload.seiten ? ` · ${escapeHtml(String(beispielDownload.seiten))} ${beispielDownload.seiten === 1 ? "Seite" : "Seiten"}` : ""}${beispielDownload.kb ? ` · ${escapeHtml(String(beispielDownload.kb))} KB` : ""}</span>
      <span class="meta">öffnet cdn.appack.de</span>
    </li>
  </ul>`
    : `<p class="meta">Kein Eintrag in data/downloads.json gefunden.</p>`;

  const beispielNewsContain = (daten.news ?? []).find((n) => n.bild_passung === "contain" && n.bild);
  const karteContainBeispiel = beispielNewsContain
    ? `<article class="karte" style="max-width:320px;">
    ${bild({
      pfad: PFAD,
      daten,
      name: beispielNewsContain.bild.replace(/\.[^./]+$/, ""),
      alt: beispielNewsContain.alt ?? "",
      sizes: "320px",
      klasse: "karte__bild karte__bild--contain",
    })}
    <p class="karte__meta">${escapeHtml(beispielNewsContain.quelle)}</p>
    <h4 class="karte__titel" style="font-size:var(--fs-lg);">${escapeHtml(beispielNewsContain.titel)}</h4>
  </article>`
    : `<p class="meta">Kein Eintrag mit bild_passung "contain" in data/news.json gefunden.</p>`;

  // P6: News-Karte ohne Bild (.karte__bild--leer) – /news/, wenn "bild" in
  // data/news.json fehlt (z. B. der App-Start-Eintrag).
  const wappenBlauFuerKarte = liesWappen("wappen-blau.svg");
  const beispielNewsOhneBild = (daten.news ?? []).find((n) => !n.bild);
  const karteLeerBeispiel = beispielNewsOhneBild
    ? `<a class="karte karte--link" href="${PFAD}news/" style="max-width:280px;">
    <span class="karte__bild--leer" aria-hidden="true">${wappenBlauFuerKarte}</span>
    <p class="karte__meta">${escapeHtml(beispielNewsOhneBild.quelle)}</p>
    <h4 class="karte__titel" style="font-size:var(--fs-lg);">${escapeHtml(beispielNewsOhneBild.titel)}</h4>
  </a>`
    : `<p class="meta">Kein Eintrag ohne Bild in data/news.json gefunden.</p>`;

  // P6-Korrektur A1: Personen-Raster (.raster--personen) – ersetzt
  // raster--3/raster--4 bei Personen-Karten (Vorstand, Karnevalabteilung).
  // Beispiel bewusst mit der Senioren-Gruppe (nur zwei Einträge): genau der
  // Fall, in dem die Karten vorher auf halbe Containerbreite gestreckt wurden.
  const seniorenPersonen = (daten.vorstand ?? []).filter((p) =>
    ["Sportliche Leitung Senioren", "Spielausschuss Senioren"].includes(p.funktion)
  );
  const rasterPersonenBeispiel = seniorenPersonen.length
    ? `<div class="raster raster--personen">
    ${seniorenPersonen
      .map(
        (p) => `<div class="person">
      <span class="person__bild person__bild--platzhalter" aria-hidden="true">${wappenBlauFuerKarte}</span>
      <p class="person__name">${escapeHtml(p.name ?? "derzeit nicht besetzt")}</p>
      <p class="person__funktion">${escapeHtml(p.funktion ?? "")}</p>
    </div>`
      )
      .join("\n    ")}
  </div>`
    : `<p class="meta">Keine Senioren-Funktionen in data/vorstand.json gefunden.</p>`;

  // P6: Tore-Liste (.tore) – Artikelseiten /news/<slug>/.
  const beispielTore = (daten.news ?? []).find((n) => n.tore?.length);
  const toreBeispiel = beispielTore
    ? `<ul class="tore" role="list">
    ${beispielTore.tore
      .map(
        (t) =>
          `<li><span class="tore__minute">${escapeHtml(String(t.minute))}'</span> ${escapeHtml(t.name)}${t.stand ? ` · ${escapeHtml(t.stand)}` : ""}</li>`
      )
      .join("\n    ")}
  </ul>`
    : `<p class="meta">Kein Eintrag mit Toren in data/news.json gefunden.</p>`;

  // P6: Fakten-Liste (.fakten) – Artikelseiten /news/<slug>/.
  const beispielFakten = (daten.news ?? []).find((n) => n.fakten?.length);
  const faktenBeispiel = beispielFakten
    ? `<ul class="fakten" role="list">
    ${beispielFakten.fakten.map((f) => `<li>${escapeHtml(f)}</li>`).join("\n    ")}
  </ul>`
    : `<p class="meta">Kein Eintrag mit Fakten in data/news.json gefunden.</p>`;

  // P7-Korrektur A2: Ergebniszeile (.ergebnis) – Artikelseiten /news/<slug>/.
  const beispielErgebnis = (daten.news ?? []).find((n) => n.ergebnis);
  const ergebnisBeispiel = beispielErgebnis
    ? `<div class="ergebnis" aria-label="Endstand" style="max-width:480px;">
    <span class="ergebnis__team">FFV Sportfreunde 04</span>
    <span class="ergebnis__resultat">${escapeHtml(beispielErgebnis.ergebnis)}</span>
    <span class="ergebnis__team">${escapeHtml(beispielErgebnis.gegner ?? "")}</span>
  </div>`
    : `<p class="meta">Kein Eintrag mit Ergebnis in data/news.json gefunden.</p>`;

  // P7: Formular (.formular) – /mitglied-werden/: zwei Felder, eine
  // Checkbox, ein Fehlerzustand (PLZ-Feld mit sichtbarer Fehlermeldung, wie
  // sie assets/js/formular.js nach einem ungültigen Absenden einblendet).
  // Checkbox ab P8-Korrektur A2: 24×24px-Kasten, .formular__checkzeile ist
  // das <label> selbst (Eingabe und Text darin) und damit das ≥44px hohe
  // Tippziel (siehe komponenten.css und mitglied-werden.mjs).
  const formularBeispiel = `<form class="formular inhalt" novalidate style="max-width:420px;">
    <div class="formular__feld">
      <label for="sg-vorname">Vorname <span class="formular__pflicht">*</span></label>
      <input type="text" id="sg-vorname" name="sg-vorname" required aria-describedby="sg-vorname-fehler">
      <p class="formular__fehler" id="sg-vorname-fehler" hidden></p>
    </div>
    <div class="formular__feld">
      <label for="sg-plz">PLZ <span class="formular__pflicht">*</span></label>
      <input type="text" id="sg-plz" name="sg-plz" inputmode="numeric" pattern="\\d{5}" maxlength="5" required aria-describedby="sg-plz-fehler">
      <p class="formular__fehler" id="sg-plz-fehler">Bitte eine gültige Postleitzahl eingeben (5 Ziffern)</p>
    </div>
    <div class="formular__checkzeile-block">
      <label class="formular__checkzeile">
        <input type="checkbox" id="sg-check" name="sg-check" required>
        <span>Ich erteile das SEPA-Lastschriftmandat. <span class="formular__pflicht">*</span></span>
      </label>
    </div>
  </form>`;

  // P8: Angaben-Liste (.angaben) – /impressum/: Definitionsliste mit
  // Beschriftung (dt) und Wert (dd), hier mit echten Daten aus verein.json.
  const angabenBeispiel = `<dl class="angaben" style="max-width:420px;">
    <dt>Anbieter</dt>
    <dd>${escapeHtml(verein.name_register ?? "")}</dd>
    <dt>Vertretungsberechtigter Vorstand</dt>
    <dd>
      <ul>
        ${(verein.vertretung ?? []).map((v) => `<li>${escapeHtml(v)}</li>`).join("\n        ")}
      </ul>
    </dd>
    <dt>Registergericht / Registernummer</dt>
    <dd>${escapeHtml(verein.register ?? "")}</dd>
  </dl>`;

  // P9: Tab-Leiste (.tabbar) – App-Modus (?ansicht=app, siehe assets/js/nav.js
  // und assets/css/app-modus.css). Dieselbe tabbar()-Funktion wie im
  // Header-Modul (src/vorlagen/header.mjs), hier nur statisch dargestellt:
  // position:static statt fixed und display erzwungen, weil .tabbar
  // außerhalb von .ansicht-app per Default verborgen ist (siehe
  // komponenten.css).
  const tabbarBeispiel = `<div style="max-width:420px;border:1px solid var(--line);border-radius:var(--r-md);overflow:hidden;">
    ${tabbar({ pfad: PFAD, aktuelleUrl: "/" }).replace(
      '<nav class="tabbar" aria-label="App-Navigation">',
      '<nav class="tabbar" aria-label="App-Navigation" style="display:block;position:static;">'
    )}
  </div>`;

  // P9: Telefonrahmen (.telefon) – /app/, hier verkleinert (transform:scale)
  // und ohne iframe: eine Platzhalterfläche in --blau-50 statt der echten
  // Seite, damit das Beispiel ohne zusätzliche Netzwerklast auskommt.
  const telefonBeispiel = `<div style="width:${Math.round(414 * 0.5)}px;height:${Math.round(868 * 0.5)}px;overflow:hidden;">
    <div class="telefon" style="transform:scale(.5);transform-origin:top left;">
      <div style="width:100%;height:100%;border-radius:32px;background:var(--blau-50);display:flex;align-items:center;justify-content:center;color:var(--ink-3);font-size:var(--fs-sm);text-align:center;padding:var(--sp-4);box-sizing:border-box;">Platzhalter statt &lt;iframe&gt;</div>
    </div>
  </div>`;

  return `<h2>Bausteine</h2>
<p class="inhalt">Alle Bausteine mit echten Daten aus data/, wie sie später auf den Inhaltsseiten verwendet werden. Ziele, deren Seite im aktuellen Paket noch nicht existiert, sind als Karten mit &lt;span&gt; statt &lt;a&gt; ausgegeben.</p>

<h3>Seitenkopf</h3>
${seitenkopfBeispiel}

<h3>Raster und Karte</h3>
${rasterBeispiel}

<h3>Spiel-Zeile</h3>
${spieleBeispiel}

<h3>Trainings-Zeile</h3>
${trainingsBeispiel}

<h3>Personen-Karte (mit Platzhalter ohne Foto)</h3>
${personBeispiel}

<h3>Tags</h3>
${tagsBeispiel}

<h3>Hinweiskasten</h3>
${hinweisBeispiel}

<h3>Tabelle</h3>
${tabelleBeispiel}

<h3>Knöpfe</h3>
${knoepfeBeispiel}

<h3>Hero</h3>
${heroBeispiel}

<h3>Fakten-Zeile (.hero__fakten)</h3>
${heroFaktenBeispiel}

<h3>Schritte</h3>
${schritteBeispiel}

<h3>Adresse</h3>
${addressBeispiel}

<h3>Trainingsraster</h3>
${trainingsrasterBeispiel}

<h3>Karte mit Bild „contain” (.karte__bild--contain)</h3>
${karteContainBeispiel}

<h3>Team-Karte (.karte__training, .karte__mehr)</h3>
<p class=”inhalt”>Mannschaften-Übersicht (P3): kompakte Trainingsliste und Pfeil-Hinweis unten rechts, die ganze Karte ist der Link.</p>
${teamKarteBeispiel}

<h3>Zweispaltiges Layout (.zweispaltig)</h3>
<p class=”inhalt”>Teamseiten (P3): Hauptspalte 7/12 + Seitenspalte 5/12 ab 1024px, darunter (< 1024px) beide Spalten untereinander, Hauptspalte zuerst.</p>
${zweispaltigBeispiel}

<h3>Karte „Nächstes Spiel" (.karte--spiel)</h3>
<p class="inhalt">Team-Spielplanseiten (P4): große Einzelkarte für das nächste Spiel, Datum/Zeit groß in Barlow Condensed.</p>
${karteSpielBeispiel}

<h3>Sprunglink-Pille (.sprung)</h3>
<p class="inhalt">Sprungliste auf /tabellen/ (P4): optisch wie .tag, aber mit Tippziel 44px.</p>
${sprungBeispiel}

<h3>Vergangenes Spiel (.spiel--vergangen)</h3>
<p class="inhalt">„Alle Spiele" auf den Team-Spielplanseiten (P4): gedämpfter Text statt der sonstigen Akzentfarben.</p>
${spielVergangenBeispiel}

<h3>Zahlen-Kachel (.zahl)</h3>
<p class="inhalt">Abschnitt "Zahlen" auf /verein/ (P5): Wert groß in Barlow Condensed/Weiß, Beschriftung in --blau-100, im vierspaltigen Raster auf --abschnitt--blau.</p>
${zahlenBeispiel}

<h3>Download-Zeile (.download)</h3>
<p class="inhalt">/verein/downloads/ (P5): Titel als Link, darunter Format/Umfang und Hinweis auf das externe Ziel als .meta-Zeilen.</p>
${downloadBeispiel}

<h3>News-Karte ohne Bild (.karte__bild--leer)</h3>
<p class="inhalt">/news/ (P6): Kopfzeile in --blau-100 mit zentriertem Wappen (64px) statt Foto, wenn das Feld "bild" in data/news.json fehlt.</p>
${karteLeerBeispiel}

<h3>Personen-Raster (.raster--personen)</h3>
<p class="inhalt">Vorstand und Karnevalabteilung (P5-Korrektur A1): ersetzt raster--3/raster--4 bei Personen-Karten. Ab 640px maximal 260px Kartenbreite (auto-fill statt auto-fit, dadurch kein Strecken auf halbe Containerbreite bei wenigen Einträgen), darunter zwei bzw. eine Spalte.</p>
${rasterPersonenBeispiel}

<h3>Tore (.tore)</h3>
<p class="inhalt">Artikelseiten /news/&lt;slug&gt;/ (P6): je Tor Minute (tabular-nums, in var(--font-head)), Torschütze und optional der Spielstand.</p>
${toreBeispiel}

<h3>Fakten (.fakten)</h3>
<p class="inhalt">Artikelseiten /news/&lt;slug&gt;/ (P6): Eckdaten (Termin, Uhrzeit, Ort) als Tags/Zeilen vor dem Fließtext.</p>
${faktenBeispiel}

<h3>Ergebniszeile (.ergebnis)</h3>
<p class="inhalt">Artikelseiten /news/&lt;slug&gt;/ (P7-Korrektur A2): dreiteilige Zeile statt Überschrift – Vereinsname links, Ergebnis mittig auf --blau-50-Fläche, Gegner rechts. Grid 1fr auto 1fr, unter 480px untereinander (Ergebnis mittig). Kein h2 (das Ergebnis ist keine Überschrift), stattdessen aria-label="Endstand" auf dem Container.</p>
${ergebnisBeispiel}

<h3>Formular (.formular)</h3>
<p class="inhalt">/mitglied-werden/ (P7; Checkbox ab P8-Korrektur A2): Eingabefelder 48px hoch, Fehlertext in --warn unter dem Feld (hier am PLZ-Feld sichtbar, wie assets/js/formular.js ihn nach einem ungültigen Absenden einblendet). Checkbox nur noch 24×24px, das Tippziel ist die umschließende Beschriftungszeile (.formular__checkzeile als <label>, mindestens 44px hoch).</p>
${formularBeispiel}

<h3>Angaben-Liste (.angaben)</h3>
<p class="inhalt">/impressum/ (P8): Definitionsliste mit Beschriftung (dt, --fs-sm/600/--ink-3) und Wert (dd, --fs-md).</p>
${angabenBeispiel}

<h3>Tab-Leiste (.tabbar)</h3>
<p class="inhalt">App-Modus (P9, ?ansicht=app): untere Navigation mit fünf Zielen (Start, Teams, Spiele, News, Verein), eigenen Strich-Icons und aktivem Zustand in --blau-700. Auf echten Seiten position:fixed am unteren Bildschirmrand und nur unter der Klasse .ansicht-app sichtbar – hier zur Anschauung statisch dargestellt (position:static).</p>
${tabbarBeispiel}

<h3>Telefonrahmen (.telefon)</h3>
<p class="inhalt">/app/ (P9): gezeichnetes Gerätefenster (390×844 Innenmaß, 12px Rand, Notch) für die drei Vorschau-Rahmen; dort mit echtem &lt;iframe src="…?ansicht=app"&gt;. Hier zur Anschauung verkleinert (transform:scale(.5)) und mit einer Platzhalterfläche statt des iframes.</p>
${telefonBeispiel}`;
}

export function seite(daten) {
  const inhalt = `
<section class="container abschnitt sg">
  <h1>Gestaltungssystem „Speuzer Blau-Weiß“</h1>
  <div class="fluss">
  <p class="inhalt">Interner Anhang für das Übernahmepaket: alle Tokens aus assets/css/tokens.css und alle Bausteine aus assets/css/komponenten.css, sichtbar gemacht. Stand des Builds: ${daten.stand}.</p>
  ${seiteFarben()}
  ${seiteSchrift()}
  ${seiteAbstaendeRadienSchatten()}
  ${seiteKnoepfeFokus()}
  ${seiteWappen()}
  ${seiteKopfFuss()}
  ${seiteBausteine(daten)}
  </div>
</section>
<style>
  .sg-farbraster { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: var(--sp-3); margin-block: var(--sp-4); }
  .sg-farbe { padding: var(--sp-4); border-radius: var(--r-md); display: flex; flex-direction: column; gap: var(--sp-1); }
  .sg-klein { font-size: var(--fs-xs); opacity: .9; }
  .sg-schriftskala { display: flex; flex-direction: column; gap: var(--sp-3); margin-block: var(--sp-4); }
  .sg-abstaende { display: flex; flex-direction: column; gap: var(--sp-2); margin-block: var(--sp-4); }
  .sg-abstand { display: flex; align-items: center; gap: var(--sp-3); }
  .sg-abstand__balken { height: var(--sp-3); background: var(--blau-500); }
  .sg-radien { display: flex; flex-wrap: wrap; gap: var(--sp-4); margin-block: var(--sp-4); }
  .sg-radius { width: 96px; height: 64px; background: var(--blau-100); display: flex; align-items: center; justify-content: center; text-align: center; font-size: var(--fs-xs); }
  .sg-schatten { display: flex; gap: var(--sp-6); margin-block: var(--sp-4); }
  .sg-schatten__box { width: 140px; height: 90px; background: var(--surface); display: flex; align-items: center; justify-content: center; border-radius: var(--r-md); }
  .sg-wappen-raster { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: var(--sp-4); margin-block: var(--sp-4); }
  .sg-wappen-zelle { padding: var(--sp-4); border-radius: var(--r-md); display: flex; flex-direction: column; align-items: center; gap: var(--sp-2); text-align: center; font-size: var(--fs-xs); }
  .sg-wappen-zelle svg { width: 96px; height: auto; }
  .sg-wappen-zelle--hell { background: var(--surface); border: 1px solid var(--line); color: var(--ink); }
  .sg-wappen-zelle--dunkel { background: var(--blau-900); color: var(--weiss); }
</style>
`;

  return {
    url: "/styleguide/",
    title: "Gestaltungssystem",
    description:
      "Interner Anhang: alle Gestaltungs-Tokens des Prototyps – Farben, Schrift, Abstände, Radien, Schatten, Knöpfe, Fokuszustand und Wappen.",
    inhalt,
  };
}
