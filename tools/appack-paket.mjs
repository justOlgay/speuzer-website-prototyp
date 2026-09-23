#!/usr/bin/env node
// Speuzer Website Prototyp – appack-Upload-Paket (W1)
// Baut aus docs/ws/*.html und docs/assets/css/site.css das Upload-Paket für
// den appack-Workspace-Ordner "web" (dist/appack-paket/web/). Läuft NACH
// `npm run build` (liest ausschließlich aus docs/, schreibt ausschließlich
// nach dist/). Node 24, ohne neue Abhängigkeiten.
//
// Hintergrund (siehe assets/app/LIESMICH.md "Woher die Schriften kommen"):
// im appack-Workspace liegen die 37 Workspace-Seiten künftig als Dateien in
// einem Ordner "web" (ausgeliefert unter
// https://cdn.appack.de/sportfreunde04/workspace/web/<datei>), site.css im
// selben Ordner. Alle anderen Assets (Schriften, Bilder, Logos, Downloads)
// bleiben auf GitHub Pages
// (https://justolgay.github.io/speuzer-website-prototyp/assets/…, CORS *).
// Dieses Skript schreibt genau diese beiden Adressklassen um:
//   - "../assets/css/site.css" -> "site.css" (gleicher Ordner wie die Seite)
//   - alles andere "../assets/…" (in href/src/poster/content/data-*/srcset)
//     -> absolute GitHub-Pages-Adresse
//   - in site.css: url("../fonts/…") -> absolute GitHub-Pages-Adresse
// Alles andere (relative Seitenlinks wie "mannschaften-d3.html", mailto:,
// "#…", externe Links) bleibt unangetastet.

import {
  readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, rmSync, existsSync, cpSync,
} from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DOCS = path.join(ROOT, "docs");
const WS_DIR = path.join(DOCS, "ws");
const SITE_CSS_QUELLE = path.join(DOCS, "assets", "css", "site.css");
const PAKET_DIR = path.join(ROOT, "dist", "appack-paket");
const WEB_DIR = path.join(PAKET_DIR, "web");
const MANIFEST_PFAD = path.join(PAKET_DIR, "manifest.json");
const LIESMICH_PFAD = path.join(PAKET_DIR, "LIESMICH.md");

const GH_PAGES_ASSETS = "https://justolgay.github.io/speuzer-website-prototyp/assets/";
const ZIEL_WORKSPACE_ORDNER = "https://cdn.appack.de/sportfreunde04/workspace/web/";

// W3, Abschnitt 3/7 (Prüfer-Befund, Schwere "blocker"): styleguide.html ist
// eine interne Seite (Übernahmepaket-Anhang, "Interner Anhang für das
// Übernahmepaket", Momentaufnahme-Datum, Beispiel-Kontaktdaten) und darf
// nicht öffentlich im Live-Ordner landen – aus dem Paket ausgeschlossen.
// docs/ws/ enthält jetzt 38 Workspace-Seiten (37 wie zuvor + neu
// verein-ueber-uns.html), das Paket entsprechend 37 (38 minus
// styleguide.html) statt 38.
const AUSGESCHLOSSENE_DATEIEN = new Set(["styleguide.html"]);
const ERWARTETE_WS_DATEIEN = 38;

// canonical/og:url: statt der GitHub-Pages-Prototyp-Adresse zeigt das Paket
// auf die künftige Live-Adresse im appack-Workspace (W3, Abschnitt 7,
// Prüfer-Befund "alle 37 Seiten – canonical/og:url"). og:image bleibt
// GitHub Pages (dieses Muster trifft nur auf "/ws/<datei>"-Adressen zu,
// og:image zeigt auf "/assets/og/…" und bleibt unverändert).
const CANONICAL_MUSTER = /href="https:\/\/justolgay\.github\.io\/speuzer-website-prototyp\/ws\/([a-z0-9-]+\.html)"/g;
const OG_URL_MUSTER = /(<meta property="og:url" content=")https:\/\/justolgay\.github\.io\/speuzer-website-prototyp\/ws\/([a-z0-9-]+\.html)(">)/g;

function schreibeCanonicalUndOgUrlUm(html, zaehler) {
  let ergebnis = html.replace(CANONICAL_MUSTER, (_treffer, datei) => {
    zaehler.canonical += 1;
    return `href="${ZIEL_WORKSPACE_ORDNER}${datei}"`;
  });
  ergebnis = ergebnis.replace(OG_URL_MUSTER, (_treffer, vor, datei, nach) => {
    zaehler.ogUrl += 1;
    return `${vor}${ZIEL_WORKSPACE_ORDNER}${datei}${nach}`;
  });
  return ergebnis;
}

// Attribute, in denen "../assets/…" durch die absolute GitHub-Pages-Adresse
// ersetzt wird (srcset wird gesondert behandelt, siehe unten). Das Muster
// verlangt ein Leerzeichen oder "<" direkt vor dem Attributnamen, damit z. B.
// "data-src" nicht versehentlich als "src" erkannt wird (Attributname würde
// sonst beim Zurückschreiben verstümmelt).
const ATTRIBUT_MUSTER = /(?<=[\s<])(href|src|poster|content|data-[a-zA-Z-]+)="(\.\.\/assets\/[^"]*)"/g;
const SRCSET_MUSTER = /(?<=[\s<])srcset="([^"]*)"/g;
const SITE_CSS_LINK_MUSTER = /href="\.\.\/assets\/css\/site\.css"/g;

function sha256(inhalt) {
  return createHash("sha256").update(inhalt).digest("hex");
}

// ---------- Zwei Ausgabemodi: Prototyp (GitHub Pages) und appack (Live), W2 ----------
// Die Seitenvorlagen markieren Inhalt, der nur in einem der beiden Modi
// erscheinen soll:
//   <div data-nur-appack hidden>…</div>   – nur Live-Website (Widgets, Generator)
//   <div data-nur-prototyp>…</div>        – nur Prototyp (eingefrorene Daten)
// Für das appack-Paket (dieses Skript) gilt: "hidden" bei data-nur-appack
// verschwindet (Inhalt wird sichtbar), data-nur-prototyp-Blöcke verschwinden
// vollständig (inklusive verschachtelter <div>, siehe tiefenbewusstes
// Entfernen unten). docs/ws/*.html selbst (der Prototyp) bleibt unangetastet
// – dort bleibt "hidden" stehen und der data-nur-prototyp-Block bleibt drin.

const NUR_APPACK_HIDDEN_MUSTER = /<div data-nur-appack hidden>/g;

// Entfernt jeden "<div data-nur-prototyp>…</div>"-Block vollständig,
// einschließlich beliebig tief verschachtelter <div>-Elemente darin (reines
// String-Matching mit Tiefenzähler statt eines HTML-Parsers, da die Vorlagen
// ausschließlich wohlgeformte <div>-Öffnungs-/Schluss-Tags enthalten).
function entferneNurPrototypBloecke(html) {
  const OEFFNER = "<div data-nur-prototyp>";
  const DIV_TAG_MUSTER = /<div\b[^>]*>|<\/div>/g;
  let ergebnis = "";
  let rest = html;
  let anzahl = 0;
  let start;

  while ((start = rest.indexOf(OEFFNER)) !== -1) {
    ergebnis += rest.slice(0, start);
    DIV_TAG_MUSTER.lastIndex = start + OEFFNER.length;
    let tiefe = 1;
    let treffer;
    let ende = -1;
    while ((treffer = DIV_TAG_MUSTER.exec(rest))) {
      tiefe += treffer[0].startsWith("</div") ? -1 : 1;
      if (tiefe === 0) {
        ende = treffer.index + treffer[0].length;
        break;
      }
    }
    if (ende === -1) {
      throw new Error(`data-nur-prototyp: kein passendes schließendes </div> gefunden (ab Position ${start})`);
    }
    anzahl += 1;
    rest = rest.slice(ende);
  }
  ergebnis += rest;
  return { html: ergebnis, anzahl };
}

// Schaltet eine Seite von "Prototyp" auf "appack" (Live) um: hidden weg bei
// data-nur-appack, data-nur-prototyp-Blöcke ganz weg. Zählt beide Typen in
// zaehler.nurAppackHidden / zaehler.nurPrototyp.
function wandleAusgabemodusUm(html, zaehler) {
  const nurAppackTreffer = html.match(NUR_APPACK_HIDDEN_MUSTER) ?? [];
  const ergebnisAppack = html.replace(NUR_APPACK_HIDDEN_MUSTER, "<div data-nur-appack>");
  const { html: ergebnis, anzahl: nurPrototypAnzahl } = entferneNurPrototypBloecke(ergebnisAppack);

  zaehler.nurAppackHidden += nurAppackTreffer.length;
  zaehler.nurPrototyp += nurPrototypAnzahl;

  return ergebnis;
}

// ---------- HTML-Seiten umschreiben ----------

function schreibeSeiteUm(html, dateiname, zaehler) {
  // 0) Ausgabemodus umschalten: data-nur-appack sichtbar machen,
  // data-nur-prototyp-Blöcke entfernen (W2, siehe oben).
  let ergebnis = wandleAusgabemodusUm(html, zaehler);

  // 1) site.css: gleicher Ordner wie die Seite selbst, kein "../assets/" mehr.
  const cssTreffer = ergebnis.match(SITE_CSS_LINK_MUSTER) ?? [];
  if (cssTreffer.length !== 1) {
    throw new Error(
      `${dateiname}: erwartet genau 1× href="../assets/css/site.css", gefunden ${cssTreffer.length}×`
    );
  }
  ergebnis = ergebnis.replace(SITE_CSS_LINK_MUSTER, 'href="site.css"');
  zaehler.cssLink += 1;

  // 2) srcset zuerst (sonst würde das allgemeine Attribut-Muster unten den
  // Wert als Ganzes fälschlich als einzelne Adresse behandeln).
  ergebnis = ergebnis.replace(SRCSET_MUSTER, (_treffer, wert) => {
    const neu = wert
      .split(",")
      .map((teil) => {
        const t = teil.trim();
        if (!t.startsWith("../assets/")) return t;
        const [pfadTeil, ...deskriptor] = t.split(/\s+/);
        zaehler.srcset += 1;
        const neuerPfad = GH_PAGES_ASSETS + pfadTeil.slice("../assets/".length);
        return deskriptor.length ? `${neuerPfad} ${deskriptor.join(" ")}` : neuerPfad;
      })
      .join(", ");
    return `srcset="${neu}"`;
  });

  // 3) href/src/poster/content/data-* -> absolute GitHub-Pages-Adresse.
  ergebnis = ergebnis.replace(ATTRIBUT_MUSTER, (_treffer, attribut, wert) => {
    const rest = wert.slice("../assets/".length);
    const schluessel = attribut.startsWith("data-") ? "dataStern" : attribut;
    zaehler[schluessel] = (zaehler[schluessel] ?? 0) + 1;
    return `${attribut}="${GH_PAGES_ASSETS}${rest}"`;
  });

  // 4) canonical/og:url -> Live-Adresse im appack-Workspace (W3, siehe oben).
  ergebnis = schreibeCanonicalUndOgUrlUm(ergebnis, zaehler);

  return ergebnis;
}

// ---------- Prüfung im Skript selbst (Schritt 2 der Spezifikation) ----------

function pruefeAusgabe(dateiname, html, paketDateien) {
  if (html.includes("../assets/") || html.includes("../fonts/")) {
    throw new Error(`${dateiname}: enthält noch '../assets/' oder '../fonts/' nach dem Umschreiben`);
  }
  // W2: Selbstprüfung des Ausgabemodus – im Paket darf kein Marker des
  // Prototyp-Modus mehr vorkommen.
  if (html.includes("data-nur-prototyp")) {
    throw new Error(`${dateiname}: enthält noch 'data-nur-prototyp' nach dem Umschreiben`);
  }
  if (html.includes("data-nur-appack hidden")) {
    throw new Error(`${dateiname}: enthält noch 'data-nur-appack hidden' nach dem Umschreiben`);
  }
  const stylesheetTreffer = [...html.matchAll(/<link\s+rel="stylesheet"\s+href="site\.css">/g)];
  if (stylesheetTreffer.length !== 1) {
    throw new Error(
      `${dateiname}: erwartet genau 1× <link rel="stylesheet" href="site.css">, gefunden ${stylesheetTreffer.length}×`
    );
  }
  const seitenLinks = [...html.matchAll(/href="([a-z][a-z0-9-]*\.html)(?:[?#][^"]*)?"/g)].map((m) => m[1]);
  for (const ziel of seitenLinks) {
    if (!paketDateien.has(ziel)) {
      throw new Error(`${dateiname}: relativer Seitenlink 'href=\"${ziel}\"' zeigt auf keine Datei im Paket`);
    }
  }
}

// ---------- site.css umschreiben ----------

function schreibeCssUm(css, zaehler) {
  return css.replace(/url\("\.\.\/fonts\/([^"]*)"\)/g, (_treffer, dateiname) => {
    zaehler.cssUrl += 1;
    return `url("${GH_PAGES_ASSETS}fonts/${dateiname}")`;
  });
}

// ---------- LIESMICH.md ----------

function baueLiesmich(dateiliste) {
  const heute = new Date().toISOString().slice(0, 10);
  return `# appack-Upload-Paket – Ordner "web" (W1)

Stand: ${heute}. Erzeugt von \`tools/appack-paket.mjs\` (\`npm run appack-paket\`)
aus \`docs/ws/*.html\` und \`docs/assets/css/site.css\` (Ergebnis von
\`npm run build\`). Dieses Paket liegt unter \`dist/appack-paket/\` und wird
nicht committet.

## Zielordner im appack-Workspace

Der Inhalt von \`web/\` (37 HTML-Seiten + \`site.css\`, siehe Dateiliste unten)
wird 1:1 in den appack-Workspace-Ordner **\`web\`** hochgeladen und dort unter
\`${ZIEL_WORKSPACE_ORDNER}<datei>\` ausgeliefert. \`site.css\` liegt im selben
Ordner wie die Seiten.

## Adressschema

- Seite ↔ Seite (z. B. \`mannschaften.html\` -> \`mannschaften-d3.html\`) und
  Sprungmarken (\`#…\`) bleiben unverändert relativ – beide Dateien liegen im
  selben Workspace-Ordner \`web\`.
- \`<link rel="stylesheet" href="site.css">\`: ebenfalls relativ, \`site.css\`
  liegt im selben Ordner.
- Alle anderen Assets – Schriften, Bilder, Wappen/Favicons, PDF-Downloads –
  sind auf **absolute GitHub-Pages-Adressen** umgeschrieben
  (\`${GH_PAGES_ASSETS}…\`), ebenso die Schriftadressen in \`site.css\`
  (\`url(…)\`).

## Abhängigkeit von GitHub Pages

Das Paket funktioniert nur, solange
\`https://justolgay.github.io/speuzer-website-prototyp/assets/…\` erreichbar
bleibt und CORS \`*\` setzt (wie heute schon bei den App-Vorlagen, siehe
\`assets/app/LIESMICH.md\`, Abschnitt „Woher die Schriften kommen"). Wird der
Prototyp unter einer anderen Adresse veröffentlicht, muss das Paket neu
gebaut werden.

## Zwei Ausgabemodi (W2)

Die Seitenvorlagen (\`src/vorlagen/workspace.html\`,
\`src/seiten/mannschaften/index.mjs\`, \`src/seiten/mannschaften/team.mjs\`)
markieren Inhalt, der nur in einem der beiden Ausgabemodi erscheinen soll:

- \`data-nur-appack\` – nur für die Live-Website. Dieses Skript macht den
  Inhalt sichtbar (entfernt das Sichtbarkeits-Attribut \`hidden\`).
- Prototyp-Markierung (der genaue Attributname dafür steht in
  \`tools/appack-paket.mjs\`, Abschnitt "Zwei Ausgabemodi", und wird hier
  bewusst nicht wörtlich wiederholt, damit er nach dem Umschreiben nicht
  fälschlich als stehengebliebene Markierung erscheint) – nur für den
  GitHub-Pages-Prototyp (eingefrorene Daten mit Stand-Angabe). Dieses Skript
  entfernt den ganzen Block.

Seit W6 (Entscheidung Olgay 23.09.2026: Tabellen und Spielpläne nur noch je
Mannschaftsseite, keine eigene Seite/Sammelseite dafür) enthält \`web/\`
ausschließlich Live-Inhalt: FUSSBALL.DE-Widgets für die Vereinsspiele
(\`mannschaften.html\`, ganz unten, Typ \`club-matches\`), das nächste Spiel
und die Spiele der Saison je Team (\`mannschaften-<team>.html\`, Typen
\`next-match\`/\`team-matches\`, IDs aus \`data/widgets.json\`) sowie die
Tabellen (ebenfalls \`mannschaften-<team>.html\`, Typ \`table\`). Das betrifft
acht der elf Mannschaften; nur die drei Teams ohne FUSSBALL.DE-Widget (F1,
F2, G-Jugend – Kinderfußball, kein Ligabetrieb) behalten die
\`<iframe>\`-Einbettung der Gruppen-Seite des Spielplan-Generators
(\`https://justolgay.github.io/speuzer-spielplan/app-<gruppe>.html\`) auch im
Live-Paket, auf \`mannschaften-<team>.html\` wie bisher auf
\`spielplan-<team>.html\`. Die früheren Seiten \`spielplan.html\`,
\`spielplan-<team>.html\` und \`tabellen.html\` sind seit W6 schlanke
Weiterleitungen (\`<meta http-equiv="refresh">\`) auf die jeweilige
Mannschaftsseite (siehe \`src/vorlagen/weiterleitung.mjs\`) – sie bleiben unter
demselben Workspace-Namen bestehen, damit alte Verweise nicht ins Leere
laufen, tragen aber keine Widgets mehr und stehen nicht in \`docs/sitemap.xml\`.
Das FUSSBALL.DE-Skript \`widgets.js\` wird clientseitig nur nachgeladen, wenn
ein sichtbares FUSSBALL.DE-Widget – gleich welchen Typs (\`next-match\`,
\`team-matches\`, \`table\`, \`club-matches\`) – im Dokument steht (siehe
\`FUSSBALLDE_WIDGET_LADER\` in \`src/vorlagen/hilfen.mjs\`). Die FUSSBALL.DE-
Widgets sind bei FUSSBALL.DE nur für die Domain \`cdn.appack.de\` freigegeben –
lokal oder auf GitHub Pages zeigen sie eine Fehlermeldung von FUSSBALL.DE, das
ist kein Seitenfehler (siehe \`tools/appack-paket-pruefen.mjs\`).

## Datenschutz

\`datenschutz.html\` nennt seit W3b die FUSSBALL.DE-Widgets als Drittanbieter
(eigener Absatz, Rechtsgrundlage Art. 6 Abs. 1 lit. f DSGVO). Der Wortlaut
ist redaktionell übernommen (W3-Spezifikation Abschnitt 7) – eine
juristische Prüfung des Datenschutztexts ist offen, bevor die Seite live
geht.

## Rückweg

Der Ordner \`web\` im appack-Workspace ist von der Live-Website unabhängig,
solange die appack-Vorlagen START/MENU/FOOTER nicht auf diesen Ordner
umgestellt sind – bis dahin kann er ohne Wirkung auf die Live-Seite gelöscht
oder neu hochgeladen werden.

## Ausgeschlossen (W3)

\`styleguide.html\` (interne Seite, "Interner Anhang für das
Übernahmepaket", Momentaufnahme-Datum, Beispiel-Kontaktdaten) ist NICHT im
Paket – \`docs/ws/styleguide.html\` bleibt nur lokal/auf GitHub Pages
(Gestaltungssystem), \`tools/appack-paket.mjs\` nimmt sie aus der
Dateiliste. Die gleichnamige Live-Datei im appack-Workspace (falls aus
einem früheren Upload noch vorhanden) sollte geleert bzw. gelöscht werden –
das macht der Verein im CMS.

## Nur vmapit

Diese Befunde betreffen die Hülle (appack-Vorlage "Microwebseite",
vmapit/appack) selbst, nicht die hier gebauten Workspace-Seiten – sie sind
hier nur dokumentiert (W3-Spezifikation Abschnitt 5), nicht umgesetzt:

- Startseite der Hülle ohne Inhalt (nur Claim + Fußbereich).
- Fester Rahmen 92\`vh\` für Inhaltsseiten (\`#showFrame\`), darunter sofort
  der Hüllen-Fußbereich – kein Rahmen, der die Inhaltshöhe übernimmt.
- Fußzeile: Impressum/Datenschutz öffnen in einem 40\`vw\`-Rahmen (1440px),
  anderes Layout als alle Menüseiten.
- Nicht ladende Stylesheets des appack-Terminmoduls
  (\`application.appack.de/appointment-module/…/preloading.css\`,
  \`theme-light.css\`, \`layout.css\`, HTTP 404) – appack melden.
- Facebook-Link der Fußzeile zeigt auf eine andere Adresse als
  \`kontakt.html\` (Worksheet-Pflege, macht der Auftraggeber im CMS).

## Dateien (${dateiliste.length})

${dateiliste.map((d) => `- ${d}`).join("\n")}
`;
}

// ---------- Hauptablauf ----------

function main() {
  if (!existsSync(WS_DIR)) {
    console.error(`${WS_DIR} nicht gefunden – zuerst 'npm run build' ausführen.`);
    process.exit(1);
  }
  if (!existsSync(SITE_CSS_QUELLE)) {
    console.error(`${SITE_CSS_QUELLE} nicht gefunden – zuerst 'npm run build' ausführen.`);
    process.exit(1);
  }

  const alleHtmlDateien = readdirSync(WS_DIR)
    .filter((d) => d.endsWith(".html"))
    .sort();
  if (alleHtmlDateien.length !== ERWARTETE_WS_DATEIEN) {
    console.error(`Erwartet ${ERWARTETE_WS_DATEIEN} Workspace-Seiten in docs/ws/, gefunden ${alleHtmlDateien.length}.`);
    process.exit(1);
  }
  // styleguide.html bleibt draußen (siehe AUSGESCHLOSSENE_DATEIEN oben).
  const htmlDateien = alleHtmlDateien.filter((d) => !AUSGESCHLOSSENE_DATEIEN.has(d));

  rmSync(PAKET_DIR, { recursive: true, force: true });
  mkdirSync(WEB_DIR, { recursive: true });

  const paketDateien = new Set([...htmlDateien, "site.css"]);
  const zaehler = {
    cssLink: 0, href: 0, src: 0, srcset: 0, content: 0, poster: 0, dataStern: 0, cssUrl: 0,
    nurAppackHidden: 0, nurPrototyp: 0, canonical: 0, ogUrl: 0,
  };
  const manifestEintraege = [];
  let gesamtBytes = 0;

  for (const dateiname of htmlDateien) {
    const quellPfad = path.join(WS_DIR, dateiname);
    const html = readFileSync(quellPfad, "utf8");
    const umgeschrieben = schreibeSeiteUm(html, dateiname, zaehler);
    pruefeAusgabe(dateiname, umgeschrieben, paketDateien);

    const zielPfad = path.join(WEB_DIR, dateiname);
    writeFileSync(zielPfad, umgeschrieben, "utf8");

    const bytes = Buffer.byteLength(umgeschrieben, "utf8");
    gesamtBytes += bytes;
    manifestEintraege.push({ datei: `web/${dateiname}`, bytes, sha256: sha256(umgeschrieben) });
  }

  const css = readFileSync(SITE_CSS_QUELLE, "utf8");
  const cssUmgeschrieben = schreibeCssUm(css, zaehler);
  if (cssUmgeschrieben.includes("../fonts/") || cssUmgeschrieben.includes("../assets/")) {
    throw new Error("site.css: enthält noch '../fonts/' oder '../assets/' nach dem Umschreiben");
  }
  writeFileSync(path.join(WEB_DIR, "site.css"), cssUmgeschrieben, "utf8");
  const cssBytes = Buffer.byteLength(cssUmgeschrieben, "utf8");
  gesamtBytes += cssBytes;
  manifestEintraege.push({ datei: "web/site.css", bytes: cssBytes, sha256: sha256(cssUmgeschrieben) });

  // W3b, Prüfer-Befund "klein": kein Zeitstempel im Manifest – die
  // committete Kopie docs/appack-paket/manifest.json (DOCS_KOPIE unten)
  // änderte sich sonst bei jedem "npm run build", ohne dass sich am Inhalt
  // etwas geändert hätte (git status nach dem Build nicht leer).
  const manifest = {
    zielOrdner: "web",
    quelle: { build: "npm run build", stand: "docs/ws/*.html + docs/assets/css/site.css" },
    dateien: manifestEintraege,
  };
  writeFileSync(MANIFEST_PFAD, JSON.stringify(manifest, null, 2), "utf8");

  const liesmich = baueLiesmich(manifestEintraege.map((e) => e.datei));
  writeFileSync(LIESMICH_PFAD, liesmich, "utf8");

  console.log("=== appack-paket.mjs: Zusammenfassung ===");
  console.log(`Dateien: ${manifestEintraege.length} (${htmlDateien.length} HTML + 1 site.css)`);
  console.log(`Bytes gesamt: ${gesamtBytes}`);
  console.log("Ausgabemodus (W2):");
  console.log(`  data-nur-appack: "hidden" entfernt (jetzt sichtbar): ${zaehler.nurAppackHidden}×`);
  console.log(`  data-nur-prototyp: Blöcke vollständig entfernt: ${zaehler.nurPrototyp}×`);
  console.log("Ersetzte Verweise je Typ:");
  console.log(`  site.css-Verweis (href) auf "site.css" umgeschrieben: ${zaehler.cssLink}`);
  console.log(`  href="../assets/…" -> absolute Adresse: ${zaehler.href}`);
  console.log(`  src="../assets/…" -> absolute Adresse: ${zaehler.src}`);
  console.log(`  srcset-Einträge "../assets/…" -> absolute Adresse: ${zaehler.srcset}`);
  console.log(`  content="../assets/…" -> absolute Adresse: ${zaehler.content}`);
  console.log(`  poster="../assets/…" -> absolute Adresse: ${zaehler.poster}`);
  console.log(`  data-*="../assets/…" -> absolute Adresse: ${zaehler.dataStern}`);
  console.log(`  site.css: url("../fonts/…") -> absolute Adresse: ${zaehler.cssUrl}`);
  console.log(`  canonical -> ${ZIEL_WORKSPACE_ORDNER}<datei>: ${zaehler.canonical}`);
  console.log(`  og:url -> ${ZIEL_WORKSPACE_ORDNER}<datei>: ${zaehler.ogUrl}`);
  console.log(`Ausgeschlossen: ${[...AUSGESCHLOSSENE_DATEIEN].join(", ")} (${AUSGESCHLOSSENE_DATEIEN.size} Datei(en), nicht im Paket)`);
  console.log(`Paket: ${path.relative(ROOT, PAKET_DIR)}/`);
  console.log(`Manifest: ${path.relative(ROOT, MANIFEST_PFAD)}`);
  console.log(`LIESMICH: ${path.relative(ROOT, LIESMICH_PFAD)}`);
  // Öffentliche Kopie unter docs/appack-paket/ (GitHub Pages): von dort holt
  // sich der CMS-Import (fetch aus dem eingebauten Browser, CORS *) die Dateien.
  // Inhalt = docs/ws/ mit umgeschriebenen Adressen, also nichts Neues öffentlich.
  const DOCS_KOPIE = path.join(ROOT, "docs", "appack-paket");
  rmSync(DOCS_KOPIE, { recursive: true, force: true });
  cpSync(PAKET_DIR, DOCS_KOPIE, { recursive: true });
  console.log(`Öffentliche Kopie: ${path.relative(ROOT, DOCS_KOPIE)}/`);
}

main();
