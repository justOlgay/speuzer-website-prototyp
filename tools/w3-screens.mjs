#!/usr/bin/env node
// W3 – Sichtprüfung 390/1440 (Einmalskript, nicht Teil der Gates). Screenshots
// nach tools/cache/w3/ (gitignored). Nutzt tools/server.mjs (docs/).

import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ZIEL = path.join(ROOT, "tools", "cache", "w3");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 4173;
const BASIS = `http://localhost:${PORT}`;

const SEITEN = [
  "ws/verein.html",
  "ws/verein-ueber-uns.html",
  "ws/mannschaften.html",
  "ws/spielplan-d3.html",
  "ws/kontakt.html",
];
const BREITEN = [
  { breite: 390, hoehe: 844 },
  { breite: 1440, hoehe: 900 },
];

function warte(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function serverErreichbar() {
  try {
    const resp = await fetch(BASIS + "/");
    return resp.ok || resp.status === 404;
  } catch {
    return false;
  }
}

async function main() {
  mkdirSync(ZIEL, { recursive: true });
  let proc = null;
  if (!(await serverErreichbar())) {
    proc = spawn(process.execPath, [path.join(ROOT, "tools", "server.mjs")], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    for (let i = 0; i < 50; i++) {
      if (await serverErreichbar()) break;
      await warte(100);
    }
  }

  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  try {
    for (const seite of SEITEN) {
      const page = await browser.newPage();
      await page.goto(`${BASIS}/${seite}`, { waitUntil: "networkidle0", timeout: 30000 });
      for (const { breite, hoehe } of BREITEN) {
        await page.setViewport({ width: breite, height: hoehe });
        await warte(150);
        const name = seite.replace(/^ws\//, "").replace(/\.html$/, "");
        const datei = path.join(ZIEL, `${name}-${breite}.png`);
        await page.screenshot({ path: datei, fullPage: true });
        console.log(`  ${datei}`);
      }
      await page.close();
    }
  } finally {
    await browser.close();
    if (proc) proc.kill();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
