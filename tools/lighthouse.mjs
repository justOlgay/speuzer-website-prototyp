#!/usr/bin/env node
// Speuzer Website Prototyp – Lighthouse-Runner (P11)
// Ruft `npx --no-install lighthouse` je Seite aus docs/sitemap.xml per
// child_process auf (mobil, lokaler Chrome, ohne neue Abhängigkeiten – siehe
// package.json: lighthouse/puppeteer-core liegen schon als devDependencies).
// Startet tools/server.mjs selbst, falls unter Port 4173 noch nichts
// erreichbar ist (gleiches Muster wie tools/screenshots.mjs). Schreibt je
// Seite den Rohbericht des besten Laufs nach tools/cache/lh/<name>.json,
// dazu data/lighthouse.json (Zusammenfassung, siehe ladeDaten() in
// tools/build.mjs – wird dort automatisch als daten.lighthouse eingelesen)
// und tools/cache/lighthouse.md (Markdown-Tabelle). Bricht mit Exit 1 ab,
// wenn eine der vier Kategorien im Minimum über alle Seiten unter 90 bleibt.
//
// P13b Schritt 4: Option --basis <url> (oder Umgebungsvariable BASIS) misst
// statt des lokalen Servers die angegebene Basisadresse (z. B. die
// öffentliche GitHub-Pages-Adresse) – die Pfade aus der Sitemap werden auf
// diese Basis gemappt, der lokale Server bleibt dabei aus. Lauf-Politik: ein
// Lauf je Seite; liegt die Performance dabei unter 90, zwei weitere Läufe
// (insgesamt drei) und der nach Performance sortierte mittlere Lauf
// (Median) zählt.

import { spawnSync, spawn } from "node:child_process";
import { readFileSync, existsSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DOCS = path.join(ROOT, "docs");
const DATA_DIR = path.join(ROOT, "data");
const CACHE = path.join(ROOT, "tools", "cache");
const LH_CACHE = path.join(CACHE, "lh");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 4173;
const LOKAL_BASIS = `http://localhost:${PORT}`;
const BASIS_URL = "https://justolgay.github.io/speuzer-website-prototyp/";

const SCHWELLE = 90;
const MAX_LAEUFE = 3; // 1 Lauf + bis zu 2 weitere bei Performance < 90, Median zählt (P13b Schritt 4)
const LIGHTHOUSE_VERSION = "13"; // siehe package.json (^13.4.1) und Auftrag ("Lighthouse 13")

// --basis <url> oder --basis=<url> auf der Kommandozeile, sonst Umgebungs-
// variable BASIS. Ohne beides: lokaler Server (LOKAL_BASIS).
function leseBasisArgument() {
  const argv = process.argv.slice(2);
  const idx = argv.indexOf("--basis");
  if (idx !== -1 && argv[idx + 1]) return argv[idx + 1];
  const mitGleichheitszeichen = argv.find((a) => a.startsWith("--basis="));
  if (mitGleichheitszeichen) return mitGleichheitszeichen.slice("--basis=".length);
  if (process.env.BASIS) return process.env.BASIS;
  return null;
}

function warte(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function serverErreichbar() {
  try {
    const resp = await fetch(LOKAL_BASIS + "/");
    return resp.ok || resp.status === 404;
  } catch {
    return false;
  }
}

async function starteServerFallsNoetig() {
  if (await serverErreichbar()) return null;

  const proc = spawn(process.execPath, [path.join(ROOT, "tools", "server.mjs")], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  for (let i = 0; i < 50; i++) {
    if (await serverErreichbar()) return proc;
    await warte(100);
  }
  throw new Error("Server ist nach 5s nicht erreichbar");
}

function leseSitemapPfade() {
  const sitemap = readFileSync(path.join(DOCS, "sitemap.xml"), "utf8");
  const treffer = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
  return treffer.map((loc) => {
    const pfad = loc.replace(BASIS_URL.replace(/\/$/, ""), "");
    return pfad || "/";
  });
}

function pfadname(seitenPfad) {
  const bereinigt = seitenPfad.replace(/^\//, "").replace(/\/$/, "").replaceAll("/", "-");
  return bereinigt || "start";
}

// ---------- Ein Lighthouse-Lauf ----------

function fuehreLighthouseAus(url, ausgabeDatei) {
  const args = [
    "--no-install",
    "lighthouse",
    url,
    "--form-factor=mobile",
    "--screenEmulation.mobile",
    "--only-categories=performance,accessibility,best-practices,seo",
    "--output=json",
    `--output-path=${ausgabeDatei}`,
    `--chrome-flags=--headless=new --no-sandbox`,
    "--quiet",
  ];
  const ergebnis = spawnSync("npx", args, {
    cwd: ROOT,
    env: { ...process.env, CHROME_PATH: CHROME },
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
    timeout: 120_000,
  });
  if (ergebnis.status !== 0 || !existsSync(ausgabeDatei)) {
    throw new Error(
      `lighthouse für ${url} fehlgeschlagen (exit ${ergebnis.status}):\n${ergebnis.stderr ?? ""}`
    );
  }
  return JSON.parse(readFileSync(ausgabeDatei, "utf8"));
}

// Kategorie-Scores (0–1 -> 0–100, gerundet) und die drei CWV-Kennzahlen aus
// dem Rohbericht herausziehen.
function werteAus(lhJson) {
  const kat = lhJson.categories ?? {};
  const audits = lhJson.audits ?? {};
  const scoreProzent = (c) => Math.round((c?.score ?? 0) * 100);
  return {
    performance: scoreProzent(kat.performance),
    accessibility: scoreProzent(kat.accessibility),
    bestPractices: scoreProzent(kat["best-practices"]),
    seo: scoreProzent(kat.seo),
    lcp_ms: Math.round(audits["largest-contentful-paint"]?.numericValue ?? 0),
    cls: Math.round((audits["cumulative-layout-shift"]?.numericValue ?? 0) * 1000) / 1000,
    tbt_ms: Math.round(audits["total-blocking-time"]?.numericValue ?? 0),
  };
}

// ---------- Eine Seite: 1 Lauf, bei Performance < 90 zwei weitere, Median zählt ----------

async function pruefeSeite(seitenPfad, basisUrl) {
  const url = basisUrl + seitenPfad;
  const name = pfadname(seitenPfad);
  const tempDatei = path.join(LH_CACHE, `${name}.tmp.json`);
  const zielDatei = path.join(LH_CACHE, `${name}.json`);

  const laeufeErgebnisse = [];

  const ersterRoh = fuehreLighthouseAus(url, tempDatei);
  laeufeErgebnisse.push({ werte: werteAus(ersterRoh), roh: ersterRoh });

  if (laeufeErgebnisse[0].werte.performance < SCHWELLE) {
    for (let i = 0; i < MAX_LAEUFE - 1; i++) {
      const roh = fuehreLighthouseAus(url, tempDatei);
      laeufeErgebnisse.push({ werte: werteAus(roh), roh });
    }
  }

  // Nach Performance sortieren, mittleren Lauf (Median) nehmen.
  laeufeErgebnisse.sort((a, b) => a.werte.performance - b.werte.performance);
  const median = laeufeErgebnisse[Math.floor(laeufeErgebnisse.length / 2)];
  const laeufe = laeufeErgebnisse.length;

  writeFileSync(zielDatei, JSON.stringify(median.roh, null, 2), "utf8");
  rmSync(tempDatei, { force: true });

  console.log(
    `${seitenPfad}: performance=${median.werte.performance} accessibility=${median.werte.accessibility} bestPractices=${median.werte.bestPractices} seo=${median.werte.seo} · LCP=${median.werte.lcp_ms}ms CLS=${median.werte.cls} TBT=${median.werte.tbt_ms}ms (Läufe: ${laeufe})`
  );

  return { url: seitenPfad, ...median.werte, laeufe };
}

// ---------- Markdown-Tabelle ----------

function baueMarkdown(seiten, minimum, stand, basisText) {
  const zeile = (s) =>
    `| ${s.url} | ${s.performance} | ${s.accessibility} | ${s.bestPractices} | ${s.seo} | ${s.lcp_ms} | ${s.cls} | ${s.tbt_ms} | ${s.laeufe} |`;
  const kopf = [
    "| Seite | Performance | Accessibility | Best Practices | SEO | LCP (ms) | CLS | TBT (ms) | Läufe |",
    "|---|---|---|---|---|---|---|---|---|",
  ];
  const zeilen = seiten.map(zeile);
  const minZeile = `| **Minimum** | **${minimum.performance}** | **${minimum.accessibility}** | **${minimum.bestPractices}** | **${minimum.seo}** | | | | |`;
  return [
    `# Lighthouse-Bericht`,
    ``,
    `${basisText}. Stand: ${stand}.`,
    ``,
    ...kopf,
    ...zeilen,
    minZeile,
    ``,
  ].join("\n");
}

// ---------- Hauptablauf ----------

async function main() {
  mkdirSync(LH_CACHE, { recursive: true });
  mkdirSync(DATA_DIR, { recursive: true });

  if (!existsSync(path.join(DOCS, "sitemap.xml"))) {
    console.error("docs/sitemap.xml nicht gefunden – zuerst `npm run build` ausführen.");
    process.exit(1);
  }

  const externeBasis = leseBasisArgument();
  const istOeffentlich = Boolean(externeBasis);
  const zielBasis = istOeffentlich ? externeBasis.replace(/\/$/, "") : LOKAL_BASIS;

  const serverProc = istOeffentlich ? null : await starteServerFallsNoetig();
  const seiten = [];

  try {
    const pfade = leseSitemapPfade();
    console.log(
      `Lighthouse (mobil) für ${pfade.length} Seiten gegen ${zielBasis} – das kann 20–40 Minuten dauern.\n`
    );
    for (const seitenPfad of pfade) {
      const ergebnis = await pruefeSeite(seitenPfad, zielBasis);
      seiten.push(ergebnis);
    }
  } finally {
    if (serverProc) serverProc.kill();
  }

  const minimum = {
    performance: Math.min(...seiten.map((s) => s.performance)),
    accessibility: Math.min(...seiten.map((s) => s.accessibility)),
    bestPractices: Math.min(...seiten.map((s) => s.bestPractices)),
    seo: Math.min(...seiten.map((s) => s.seo)),
  };

  const stand = new Date().toISOString();
  const bericht = {
    stand,
    basis: istOeffentlich
      ? `öffentlich (GitHub Pages), mobil, Lighthouse ${LIGHTHOUSE_VERSION}`
      : `lokal, mobil, Lighthouse ${LIGHTHOUSE_VERSION}`,
    seiten,
    minimum,
  };

  writeFileSync(path.join(DATA_DIR, "lighthouse.json"), JSON.stringify(bericht, null, 2) + "\n", "utf8");
  writeFileSync(path.join(CACHE, "lighthouse.md"), baueMarkdown(seiten, minimum, stand, bericht.basis), "utf8");

  console.log(`\n=== Minimum über alle ${seiten.length} Seiten ===`);
  console.log(
    `Performance=${minimum.performance} Accessibility=${minimum.accessibility} Best Practices=${minimum.bestPractices} SEO=${minimum.seo}`
  );
  console.log(`\ndata/lighthouse.json und tools/cache/lighthouse.md geschrieben.`);

  const allesOk =
    minimum.performance >= SCHWELLE &&
    minimum.accessibility >= SCHWELLE &&
    minimum.bestPractices >= SCHWELLE &&
    minimum.seo >= SCHWELLE;

  if (!allesOk) {
    console.error("\nlighthouse.mjs: FEHLGESCHLAGEN – mindestens eine Kategorie unter 90.");
    process.exit(1);
  } else {
    console.log("\nlighthouse.mjs: alle Kategorien im Minimum ≥ 90.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
