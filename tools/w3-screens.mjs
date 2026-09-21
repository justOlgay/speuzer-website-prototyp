#!/usr/bin/env node
// W3 – Sichtprüfung 390/1440 (Einmalskript, nicht Teil der Gates). Screenshots
// nach tools/cache/w3/ (gitignored). Nutzt tools/server.mjs (docs/) für den
// Prototyp-Modus.
//
// W3b, Prüfer-Befund "klein": die Sichtprüfung rendert bislang nur
// docs/ws (Prototyp-Modus) – der appack-Modus (Widgets, entfernte
// Prototyp-Blöcke) wurde dabei nie angesehen, so blieb der leere
// "Nächstes Spiel"-Abschnitt auf den Mannschaftsseiten (Blocker-Befund)
// unentdeckt. Dieses Skript nimmt jetzt zusätzlich Screenshots gegen
// dist/appack-paket/web (eigener kleiner Static-Server, Port 4174) auf –
// "npm run build" muss vorher gelaufen sein.

import puppeteer from "puppeteer-core";
import { mkdirSync, existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ZIEL = path.join(ROOT, "tools", "cache", "w3");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const PROTOTYP_PORT = 4173;
const PROTOTYP_BASIS = `http://localhost:${PROTOTYP_PORT}`;

const APPACK_PORT = 4174;
const APPACK_BASIS = `http://localhost:${APPACK_PORT}`;
const APPACK_WEB_DIR = path.join(ROOT, "dist", "appack-paket", "web");

// Seiten je Dateiname (ohne Ordner-Präfix) – dieselben flachen Namen in
// docs/ws/<datei> und dist/appack-paket/web/<datei>.
const SEITEN = [
  "verein.html",
  "verein-ueber-uns.html",
  "mannschaften.html",
  "mannschaften-d3.html",
  "spielplan-d3.html",
  "kontakt.html",
];
const BREITEN = [
  { breite: 390, hoehe: 844 },
  { breite: 1440, hoehe: 900 },
];

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

function warte(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function serverErreichbar(basis) {
  try {
    const resp = await fetch(basis + "/");
    return resp.ok || resp.status === 404;
  } catch {
    return false;
  }
}

// Kleiner statischer Server für dist/appack-paket/web (gleiches Muster wie
// tools/server.mjs, hier lokal, weil server.mjs fest auf docs/ zeigt).
function starteAppackServer() {
  const server = createServer(async (req, res) => {
    const urlPfad = decodeURIComponent((req.url ?? "/").split("?")[0]);
    let ziel = path.join(APPACK_WEB_DIR, urlPfad === "/" ? "index.html" : urlPfad);
    if (!ziel.startsWith(APPACK_WEB_DIR)) {
      res.writeHead(400).end();
      return;
    }
    try {
      const info = await stat(ziel);
      if (info.isDirectory()) ziel = path.join(ziel, "index.html");
      const inhalt = await readFile(ziel);
      const ext = path.extname(ziel).toLowerCase();
      res.writeHead(200, { "Content-Type": MIME[ext] ?? "application/octet-stream" });
      res.end(inhalt);
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Nicht gefunden");
    }
  });
  server.listen(APPACK_PORT);
  return server;
}

async function screenshots(browser, basis, dateien, suffix) {
  for (const datei of dateien) {
    const page = await browser.newPage();
    await page.goto(`${basis}/${datei}`, { waitUntil: "networkidle0", timeout: 30000 });
    for (const { breite, hoehe } of BREITEN) {
      await page.setViewport({ width: breite, height: hoehe });
      await warte(150);
      const name = datei.replace(/\.html$/, "");
      const ziel = path.join(ZIEL, `${name}-${breite}${suffix}.png`);
      await page.screenshot({ path: ziel, fullPage: true });
      console.log(`  ${ziel}`);
    }
    await page.close();
  }
}

async function main() {
  mkdirSync(ZIEL, { recursive: true });

  // Prototyp-Modus (docs/ws)
  let prototypProc = null;
  if (!(await serverErreichbar(PROTOTYP_BASIS))) {
    prototypProc = spawn(process.execPath, [path.join(ROOT, "tools", "server.mjs")], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    for (let i = 0; i < 50; i++) {
      if (await serverErreichbar(PROTOTYP_BASIS)) break;
      await warte(100);
    }
  }

  // appack-Modus (dist/appack-paket/web) – nur, wenn schon gebaut.
  const appackVerfuegbar = existsSync(APPACK_WEB_DIR);
  let appackServer = null;
  if (appackVerfuegbar) {
    appackServer = starteAppackServer();
    for (let i = 0; i < 50; i++) {
      if (await serverErreichbar(APPACK_BASIS)) break;
      await warte(100);
    }
  } else {
    console.warn(
      `${APPACK_WEB_DIR} nicht gefunden – appack-Modus wird übersprungen. Erst "npm run build" ausführen.`
    );
  }

  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  try {
    console.log("Prototyp-Modus (docs/ws):");
    await screenshots(browser, PROTOTYP_BASIS, SEITEN, "");
    if (appackVerfuegbar) {
      console.log("appack-Modus (dist/appack-paket/web):");
      await screenshots(browser, APPACK_BASIS, SEITEN, "-appack");
    }
  } finally {
    await browser.close();
    if (prototypProc) prototypProc.kill();
    if (appackServer) appackServer.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
