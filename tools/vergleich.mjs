#!/usr/bin/env node
// Speuzer Website Prototyp – Vorher/Nachher-Screenshots aus der Hülle (P17,
// P18 Schritt 2: Klick-Hilfslogik nach tools/huelle-aufnahme.mjs ausgelagert)
// Erzeugt die neun "nachher"-Screenshots für /vorher-nachher/ NICHT mehr aus
// den alten, verschachtelten Seiten-URLs (das gibt es seit P15/P16 nicht mehr),
// sondern aus der appack-Hülle selbst (docs/index.html) über
// aufnahmeAusHuelle() aus tools/huelle-aufnahme.mjs: Startansicht plus die
// Zustände, die eine Besucherin über Burger-/Leisten-Menü und Links innerhalb
// des Inhaltsrahmens (#showFrame) erreicht. Analog zu tools/screenshots.mjs:
// puppeteer-core mit echtem Viewport (ein reiner Kommandozeilen-Screenshot
// über Chrome ignoriert --window-size unter 500px Breite), startet
// tools/server.mjs selbst, falls unter Port 4173 noch nichts erreichbar ist.
// Schreibt PNGs direkt nach assets/bilder/quelle/ (Quelle für npm run bilder).
// Die neun "vorher"-Screenshots liegen dort bereits fertig und bleiben
// unangetastet.

import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { aufnahmeAusHuelle } from "./huelle-aufnahme.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ZIEL = path.join(ROOT, "assets", "bilder", "quelle");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"; // wie tools/screenshots.mjs
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

// ---------- Die neun Bilder ----------
// Optionen je Bild wie aufnahmeAusHuelle() sie erwartet (breite/hoehe/
// burger/menue/imRahmen).

const BILDER = [
  { datei: "nachher-start-desktop.png", opts: { breite: 1440, hoehe: 900 } },
  { datei: "nachher-start-handy.png", opts: { breite: 390, hoehe: 844 } },
  { datei: "nachher-menue-handy.png", opts: { breite: 390, hoehe: 844, burger: true } },
  {
    datei: "nachher-mannschaften-desktop.png",
    opts: { breite: 1440, hoehe: 900, menue: "Mannschaften" },
  },
  {
    datei: "nachher-mannschaften-handy.png",
    opts: { breite: 390, hoehe: 844, burger: true, menue: "Mannschaften" },
  },
  {
    datei: "nachher-vorstand-desktop.png",
    opts: { breite: 1440, hoehe: 900, menue: "Verein", imRahmen: "verein-vorstand.html" },
  },
  {
    datei: "nachher-sponsoren-handy.png",
    opts: { breite: 390, hoehe: 844, burger: true, menue: "Verein", imRahmen: "verein-sponsoren.html" },
  },
  {
    datei: "nachher-mitglied-werden-handy.png",
    opts: { breite: 390, hoehe: 844, burger: true, menue: "Mitglied werden" },
  },
  {
    datei: "nachher-downloads-handy.png",
    opts: { breite: 390, hoehe: 844, burger: true, menue: "Verein", imRahmen: "verein-downloads.html" },
  },
];

async function main() {
  mkdirSync(ZIEL, { recursive: true });

  const serverProc = await starteServerFallsNoetig();
  try {
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
    try {
      for (const bild of BILDER) {
        const page = await browser.newPage();
        await aufnahmeAusHuelle(page, bild.opts);

        const ziel = path.join(ZIEL, bild.datei);
        await page.screenshot({ path: ziel });
        await page.close();
        console.log(`Nachher-Bild: ${bild.datei} (${bild.opts.breite}×${bild.opts.hoehe})`);
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
