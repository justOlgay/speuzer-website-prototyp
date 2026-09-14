#!/usr/bin/env node
// Speuzer Website Prototyp – statischer Builder (P0)
// Node 24, ohne Abhängigkeiten. Liest src/ und data/, schreibt nach docs/.

import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, rmSync, cpSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");
const DATA_DIR = path.join(ROOT, "data");
const ASSETS = path.join(ROOT, "assets");
const DOCS = path.join(ROOT, "docs");
const CACHE = path.join(ROOT, "tools", "cache");

const BASIS_URL = "https://justolgay.github.io/speuzer-website-prototyp/";
const VEREINSNAME = "FFV Sportfreunde 04";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const startZeit = Date.now();

// ---------- Daten laden ----------

function ladeDaten() {
  const daten = {};
  if (existsSync(DATA_DIR)) {
    for (const datei of readdirSync(DATA_DIR)) {
      if (datei.endsWith(".json")) {
        const schluessel = datei.slice(0, -".json".length);
        daten[schluessel] = JSON.parse(readFileSync(path.join(DATA_DIR, datei), "utf8"));
      }
    }
  }
  daten.stand = new Date().toISOString();
  return daten;
}

// ---------- Seitenmodule einsammeln ----------

function findeSeitenModule(dir) {
  const treffer = [];
  for (const eintrag of readdirSync(dir)) {
    const voll = path.join(dir, eintrag);
    const info = statSync(voll);
    if (info.isDirectory()) {
      treffer.push(...findeSeitenModule(voll));
    } else if (eintrag.endsWith(".mjs")) {
      treffer.push(voll);
    }
  }
  return treffer;
}

async function sammleSeiten(daten) {
  const seitenDir = path.join(SRC, "seiten");
  const module = existsSync(seitenDir) ? findeSeitenModule(seitenDir) : [];
  const alleSeiten = [];
  for (const modulPfad of module) {
    const modul = await import(pathToFileURL(modulPfad).href);
    if (typeof modul.seite === "function") {
      alleSeiten.push(modul.seite(daten));
    } else if (typeof modul.seiten === "function") {
      alleSeiten.push(...modul.seiten(daten));
    } else {
      console.warn(`  Warnung: ${path.relative(ROOT, modulPfad)} exportiert weder seite() noch seiten()`);
    }
  }
  return alleSeiten;
}

// ---------- Hilfsfunktionen ----------

function normUrl(url) {
  let u = url;
  if (!u.startsWith("/")) u = "/" + u;
  if (!u.endsWith("/")) u = u + "/";
  return u;
}

function pfadZurWurzel(url) {
  const tiefe = url.split("/").filter(Boolean).length;
  return tiefe === 0 ? "./" : "../".repeat(tiefe);
}

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function baueOgBlock({ title, description, canonical, ogImageAbs, ogType }) {
  const volltitel = `${title} – ${VEREINSNAME}`;
  return [
    `<meta property="og:type" content="${escapeHtml(ogType ?? "website")}">`,
    `<meta property="og:site_name" content="${escapeHtml(VEREINSNAME)}">`,
    `<meta property="og:title" content="${escapeHtml(volltitel)}">`,
    `<meta property="og:description" content="${escapeHtml(description)}">`,
    `<meta property="og:url" content="${escapeHtml(canonical)}">`,
    `<meta property="og:image" content="${escapeHtml(ogImageAbs)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
  ].join("\n");
}

function fuelleVorlage(basis, werte) {
  let html = basis;
  for (const [schluessel, wert] of Object.entries(werte)) {
    html = html.replaceAll(`{{${schluessel}}}`, wert ?? "");
  }
  return html;
}

// ---------- OG-Standardbild erzeugen (nur wenn nötig) ----------

function stelleOgStandardbildSicher() {
  const ziel = path.join(ASSETS, "og", "standard.png");
  if (existsSync(ziel)) return;

  mkdirSync(path.dirname(ziel), { recursive: true });
  mkdirSync(CACHE, { recursive: true });

  const vorlage = readFileSync(path.join(ROOT, "tools", "og-standard.html"), "utf8");
  const wappen = readFileSync(path.join(ASSETS, "logo", "wappen-weiss.svg"), "utf8");
  const html = vorlage.replace("<!--WAPPEN-->", wappen);
  const tempHtml = path.join(CACHE, "og-standard-render.html");
  writeFileSync(tempHtml, html, "utf8");

  const tempPng = path.join(CACHE, "og-standard-render.png");
  execFileSync(CHROME, [
    "--headless",
    "--disable-gpu",
    `--screenshot=${tempPng}`,
    "--window-size=1200,630",
    "--force-device-scale-factor=1",
    pathToFileURL(tempHtml).href,
  ], { stdio: "pipe" });

  cpSync(tempPng, ziel);
  console.log("  assets/og/standard.png erzeugt (1200×630)");
}

// ---------- CSS-Bündel (P11, Plan-Abschnitt B2) ----------
// tokens.css + fonts.css + base.css + komponenten.css + app-modus.css in
// dieser Reihenfolge zu docs/assets/css/site.css zusammenfügen und einfach
// minifizieren (Kommentare entfernen, Zeilenumbrüche/Mehrfach-Leerzeichen
// zusammenziehen, Leerzeichen um { } : ; , entfernen – keine
// Wert-Umschreibung). basis.html lädt nur noch site.css als render-blockendes
// Stylesheet; die Einzeldateien liegen unverändert weiter unter
// docs/assets/css/ (kopiereAssets() kopiert den ganzen assets/-Ordner), der
// Styleguide verweist weiterhin auf sie als Quelltext. url("../fonts/…")
// bleibt gültig, weil site.css im selben Ordner liegt wie die Einzeldateien.
const CSS_BUENDEL_DATEIEN = ["tokens.css", "fonts.css", "base.css", "komponenten.css", "app-modus.css"];

function minifiziereCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "") // Kommentare entfernen
    .replace(/\s+/g, " ") // Zeilenumbrüche/Mehrfach-Leerzeichen zusammenziehen
    .replace(/\s*([{}:;,])\s*/g, "$1") // Leerzeichen um { } : ; , entfernen
    .trim();
}

function baueCssBuendel() {
  const teile = CSS_BUENDEL_DATEIEN.map((datei) =>
    minifiziereCss(readFileSync(path.join(ASSETS, "css", datei), "utf8"))
  );
  const zielDir = path.join(DOCS, "assets", "css");
  mkdirSync(zielDir, { recursive: true });
  writeFileSync(path.join(zielDir, "site.css"), teile.join("\n"), "utf8");
}

// ---------- Assets kopieren ----------

function kopiereAssets() {
  const zielAssets = path.join(DOCS, "assets");
  rmSync(zielAssets, { recursive: true, force: true });
  mkdirSync(zielAssets, { recursive: true });
  for (const eintrag of readdirSync(ASSETS)) {
    if (eintrag === "bilder") {
      // bilder/quelle nicht mitkopieren, andere bilder-Unterordner (falls vorhanden) schon
      const bilderQuelle = path.join(ASSETS, "bilder");
      const bilderZiel = path.join(zielAssets, "bilder");
      mkdirSync(bilderZiel, { recursive: true });
      for (const unterordner of readdirSync(bilderQuelle)) {
        if (unterordner === "quelle") continue;
        cpSync(path.join(bilderQuelle, unterordner), path.join(bilderZiel, unterordner), { recursive: true });
      }
      continue;
    }
    cpSync(path.join(ASSETS, eintrag), path.join(zielAssets, eintrag), { recursive: true });
  }
}

// ---------- Hauptablauf ----------

async function main() {
  const daten = ladeDaten();

  stelleOgStandardbildSicher();

  const basisVorlage = readFileSync(path.join(SRC, "vorlagen", "basis.html"), "utf8");
  const { header } = await import(pathToFileURL(path.join(SRC, "vorlagen", "header.mjs")).href);
  const { footer } = await import(pathToFileURL(path.join(SRC, "vorlagen", "footer.mjs")).href);

  const seiten = await sammleSeiten(daten);
  const seitenUrls = new Set(seiten.map((seite) => normUrl(seite.url)));

  mkdirSync(DOCS, { recursive: true });
  const geschrieben = [];

  for (const seite of seiten) {
    const url = normUrl(seite.url);
    const pfad = pfadZurWurzel(url);
    const canonical = BASIS_URL.replace(/\/$/, "") + url;
    const ogImageAbs = seite.ogImage
      ? (seite.ogImage.startsWith("http") ? seite.ogImage : BASIS_URL.replace(/\/$/, "") + "/" + seite.ogImage.replace(/^\//, ""))
      : BASIS_URL + "assets/og/standard.png";

    const titelVoll = `${seite.title} – ${VEREINSNAME}`;
    const og = baueOgBlock({ title: seite.title, description: seite.description, canonical, ogImageAbs, ogType: seite.ogType });

    const html = fuelleVorlage(basisVorlage, {
      lang: "de",
      title: escapeHtml(titelVoll),
      description: escapeHtml(seite.description),
      canonical,
      og,
      pfad,
      header: header({ pfad, daten, aktuelleUrl: url, seitenUrls }),
      inhalt: seite.inhalt,
      footer: footer({ pfad, daten, seitenUrls }),
      bodyclass: seite.bodyclass ?? "",
    });

    const zielDatei = path.join(DOCS, url.slice(1), "index.html");
    mkdirSync(path.dirname(zielDatei), { recursive: true });
    writeFileSync(zielDatei, html, "utf8");
    geschrieben.push(url);
  }

  // 404-Seite (kein Verzeichnis, liegt direkt in docs/)
  {
    const pfad = "./";
    const canonical = BASIS_URL.replace(/\/$/, "") + "/404.html";
    const title = "Seite nicht gefunden";
    const description = "Diese Seite gibt es im Prototyp nicht. Zurück zur Startseite.";
    const og = baueOgBlock({ title, description, canonical, ogImageAbs: BASIS_URL + "assets/og/standard.png" });
    const inhalt = `<section class="abschnitt seitenkopf">
  <div class="container">
    <p class="seitenkopf__kicker">Fehler 404</p>
    <h1>Seite nicht gefunden</h1>
    <p class="seitenkopf__lead">Diese Adresse gibt es im Prototyp nicht. Vielleicht steckt ein Tippfehler im Link, oder die Seite ist umgezogen.</p>
  </div>
</section>
<section class="abschnitt">
  <div class="container fluss">
    <p><a class="knopf" href="${pfad}">Zur Startseite</a></p>
    <h2>Wohin möchtest du?</h2>
    <div class="raster raster--3">
    <a class="karte karte--link" href="${pfad}mannschaften/">
      <span class="karte__titel">Mannschaften</span>
      <span class="karte__meta">Training, Ansprechpartner, Spielplan je Team</span>
    </a>
    <a class="karte karte--link" href="${pfad}spielplan/">
      <span class="karte__titel">Spielplan &amp; Tabellen</span>
      <span class="karte__meta">Alle Spiele und Tabellen</span>
    </a>
    <a class="karte karte--link" href="${pfad}news/">
      <span class="karte__titel">News</span>
      <span class="karte__meta">Meldungen aus dem Verein</span>
    </a>
    <a class="karte karte--link" href="${pfad}verein/">
      <span class="karte__titel">Verein</span>
      <span class="karte__meta">Wer wir sind, Vorstand, Sponsoren</span>
    </a>
    <a class="karte karte--link" href="${pfad}mitglied-werden/">
      <span class="karte__titel">Mitglied werden</span>
      <span class="karte__meta">Beiträge, Ablauf, Antrag</span>
    </a>
    <a class="karte karte--link" href="${pfad}kontakt/">
      <span class="karte__titel">Kontakt &amp; Anfahrt</span>
      <span class="karte__meta">Adressen, Platz, Anfahrt</span>
    </a>
    </div>
  </div>
</section>`;
    let html = fuelleVorlage(basisVorlage, {
      lang: "de",
      title: escapeHtml(`${title} – ${VEREINSNAME}`),
      description: escapeHtml(description),
      canonical,
      og,
      pfad,
      header: header({ pfad, daten, aktuelleUrl: null, seitenUrls }),
      inhalt,
      footer: footer({ pfad, daten, seitenUrls }),
      bodyclass: "",
    });

    // Befund 1 (P13, Sichtprüfung): GitHub Pages liefert docs/404.html für
    // JEDEN nicht existierenden Pfad aus, auch verschachtelte (z. B.
    // /gibt-es-nicht/x/). Die relativen "./"-Referenzen der Seite (aus
    // pfadZurWurzel(), hier "./") lösen dann falsch relativ zum
    // nicht-existierenden Verzeichnis auf. Deshalb hier – nur für 404.html,
    // pfadZurWurzel/die allgemeine Pfadlogik bleibt unangetastet – jede
    // href="./…", src="./…" sowie jeden srcset-Eintrag auf eine absolute
    // BASIS_URL-Adresse umschreiben. <link rel="canonical"> ist bereits
    // absolut, der Skip-Link href="#inhalt" beginnt nicht mit "./" und bleibt
    // unverändert.
    html = html.replace(/(href|src)="\.\//g, `$1="${BASIS_URL}`);
    html = html.replace(/srcset="([^"]*)"/g, (_treffer, wert) => {
      const neu = wert
        .split(",")
        .map((teil) => {
          const t = teil.trim();
          if (!t.startsWith("./")) return t;
          const [url, ...deskriptor] = t.split(/\s+/);
          return BASIS_URL + url.slice(2) + (deskriptor.length ? " " + deskriptor.join(" ") : "");
        })
        .join(", ");
      return `srcset="${neu}"`;
    });

    writeFileSync(path.join(DOCS, "404.html"), html, "utf8");
  }

  kopiereAssets();
  baueCssBuendel();

  writeFileSync(path.join(DOCS, ".nojekyll"), "", "utf8");
  // P11, Plan-Abschnitt B4: indexierbar statt komplett gesperrt, damit die
  // Lighthouse-SEO-Prüfung (is-crawlable) besteht – der Prototyp kennzeichnet
  // sich stattdessen auf jeder Seite als Testumgebung (siehe README.md).
  writeFileSync(
    path.join(DOCS, "robots.txt"),
    `User-agent: *\nAllow: /\nSitemap: ${BASIS_URL.replace(/\/$/, "")}/sitemap.xml\n`,
    "utf8"
  );

  const sitemapEintraege = geschrieben
    .map((url) => `  <url><loc>${BASIS_URL.replace(/\/$/, "") + url}</loc></url>`)
    .join("\n");
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEintraege}\n</urlset>\n`;
  writeFileSync(path.join(DOCS, "sitemap.xml"), sitemap, "utf8");

  const dauer = ((Date.now() - startZeit) / 1000).toFixed(2);
  console.log(`Gebaute Seiten (${geschrieben.length}):`);
  for (const url of geschrieben) console.log(`  ${url}`);
  console.log(`404.html, robots.txt, sitemap.xml, .nojekyll geschrieben.`);
  console.log(`Fertig in ${dauer}s.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
