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
  readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, rmSync, existsSync,
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

// ---------- HTML-Seiten umschreiben ----------

function schreibeSeiteUm(html, dateiname, zaehler) {
  let ergebnis = html;

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

  return ergebnis;
}

// ---------- Prüfung im Skript selbst (Schritt 2 der Spezifikation) ----------

function pruefeAusgabe(dateiname, html, paketDateien) {
  if (html.includes("../assets/") || html.includes("../fonts/")) {
    throw new Error(`${dateiname}: enthält noch '../assets/' oder '../fonts/' nach dem Umschreiben`);
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

## Rückweg

Der Ordner \`web\` im appack-Workspace ist von der Live-Website unabhängig,
solange die appack-Vorlagen START/MENU/FOOTER nicht auf diesen Ordner
umgestellt sind – bis dahin kann er ohne Wirkung auf die Live-Seite gelöscht
oder neu hochgeladen werden.

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

  const htmlDateien = readdirSync(WS_DIR)
    .filter((d) => d.endsWith(".html"))
    .sort();
  if (htmlDateien.length !== 37) {
    console.error(`Erwartet 37 Workspace-Seiten in docs/ws/, gefunden ${htmlDateien.length}.`);
    process.exit(1);
  }

  rmSync(PAKET_DIR, { recursive: true, force: true });
  mkdirSync(WEB_DIR, { recursive: true });

  const paketDateien = new Set([...htmlDateien, "site.css"]);
  const zaehler = { cssLink: 0, href: 0, src: 0, srcset: 0, content: 0, poster: 0, dataStern: 0, cssUrl: 0 };
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

  const manifest = {
    erzeugt: new Date().toISOString(),
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
  console.log("Ersetzte Verweise je Typ:");
  console.log(`  site.css-Verweis (href) auf "site.css" umgeschrieben: ${zaehler.cssLink}`);
  console.log(`  href="../assets/…" -> absolute Adresse: ${zaehler.href}`);
  console.log(`  src="../assets/…" -> absolute Adresse: ${zaehler.src}`);
  console.log(`  srcset-Einträge "../assets/…" -> absolute Adresse: ${zaehler.srcset}`);
  console.log(`  content="../assets/…" -> absolute Adresse: ${zaehler.content}`);
  console.log(`  poster="../assets/…" -> absolute Adresse: ${zaehler.poster}`);
  console.log(`  data-*="../assets/…" -> absolute Adresse: ${zaehler.dataStern}`);
  console.log(`  site.css: url("../fonts/…") -> absolute Adresse: ${zaehler.cssUrl}`);
  console.log(`Paket: ${path.relative(ROOT, PAKET_DIR)}/`);
  console.log(`Manifest: ${path.relative(ROOT, MANIFEST_PFAD)}`);
  console.log(`LIESMICH: ${path.relative(ROOT, LIESMICH_PFAD)}`);
}

main();
