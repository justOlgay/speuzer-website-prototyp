#!/usr/bin/env node
// Speuzer Website Prototyp – Vorher/Nachher-Screenshots (P10)
// Erzeugt die neun "nachher"-Screenshots für /vorher-nachher/ aus dem
// gebauten Prototyp (docs/) – analog zu tools/screenshots.mjs: puppeteer-core
// mit echtem Viewport (ein reiner Kommandozeilen-Screenshot über Chrome
// ignoriert --window-size unter 500px Breite, siehe dort), startet
// tools/server.mjs selbst, falls unter Port 4173 noch nichts erreichbar ist.
// Schreibt PNGs direkt nach assets/bilder/quelle/ (Quelle für npm run
// bilder). Die neun "vorher"-Screenshots liegen dort bereits fertig (siehe
// Plan-Abschnitt B) – dieses Skript erzeugt ausschließlich die "nachher"-Hälfte.

import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ZIEL = path.join(ROOT, "assets", "bilder", "quelle");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 4173;
const BASIS = `http://localhost:${PORT}`;

function warte(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function serverErreichbar() {
  try {
    const resp = await fetch(BASIS + "/");
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

// Vor jedem Screenshot: Schriften abwarten (document.fonts.ready) und
// Lazy-Bilder im Viewport laden lassen (300ms) – wie im Plan gefordert.
async function bereitMachen(page) {
  await page.evaluate(() => document.fonts.ready);
  await warte(300);
}

const AUFNAHMEN = [
  { datei: "nachher-start-desktop.png", pfad: "/", breite: 1440, hoehe: 900, dpr: 1 },
  { datei: "nachher-start-handy.png", pfad: "/", breite: 390, hoehe: 844, dpr: 2 },
  {
    datei: "nachher-menue-handy.png",
    pfad: "/",
    breite: 390,
    hoehe: 844,
    dpr: 2,
    vorScreenshot: async (page) => {
      await page.click(".kopf__burger");
      await warte(400);
    },
  },
  { datei: "nachher-vorstand-desktop.png", pfad: "/verein/vorstand/", breite: 1440, hoehe: 900, dpr: 1 },
  { datei: "nachher-mannschaft-d3-handy.png", pfad: "/mannschaften/d3/", breite: 390, hoehe: 844, dpr: 2 },
  { datei: "nachher-sponsoren-handy.png", pfad: "/verein/sponsoren/", breite: 390, hoehe: 844, dpr: 2 },
  { datei: "nachher-mitglied-werden-handy.png", pfad: "/mitglied-werden/", breite: 390, hoehe: 844, dpr: 2 },
  { datei: "nachher-downloads-handy.png", pfad: "/verein/downloads/", breite: 390, hoehe: 844, dpr: 2 },
  { datei: "nachher-mannschaften-desktop.png", pfad: "/mannschaften/", breite: 1440, hoehe: 900, dpr: 1 },
];

async function main() {
  mkdirSync(ZIEL, { recursive: true });

  const serverProc = await starteServerFallsNoetig();
  try {
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
    try {
      for (const aufnahme of AUFNAHMEN) {
        const page = await browser.newPage();
        await page.setViewport({ width: aufnahme.breite, height: aufnahme.hoehe, deviceScaleFactor: aufnahme.dpr });
        await page.goto(BASIS + aufnahme.pfad, { waitUntil: "networkidle0", timeout: 30000 });
        await bereitMachen(page);
        await page.evaluate(() => window.scrollTo(0, 0));
        if (aufnahme.vorScreenshot) await aufnahme.vorScreenshot(page);
        const ziel = path.join(ZIEL, aufnahme.datei);
        await page.screenshot({ path: ziel });
        await page.close();
        console.log(
          `Screenshot: ${aufnahme.pfad} @ ${aufnahme.breite}×${aufnahme.hoehe} (DPR ${aufnahme.dpr}) -> ${path.relative(ROOT, ziel)}`
        );
      }
    } finally {
      await browser.close();
    }
  } finally {
    if (serverProc) serverProc.kill();
  }

  console.log(`\nFertig. Nachher-Screenshots liegen in ${path.relative(ROOT, ZIEL)}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
