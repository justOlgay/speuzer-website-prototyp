#!/usr/bin/env node
// Speuzer Website Prototyp – Vorher/Nachher-Screenshots aus der Hülle (P17)
// Erzeugt die neun "nachher"-Screenshots für /vorher-nachher/ NICHT mehr aus
// den alten, verschachtelten Seiten-URLs (das gibt es seit P15/P16 nicht mehr),
// sondern aus der appack-Hülle selbst (docs/index.html): Startansicht plus die
// Zustände, die eine Besucherin über Burger-/Leisten-Menü und Links innerhalb
// des Inhaltsrahmens (#showFrame) erreicht. Analog zu tools/screenshots.mjs:
// puppeteer-core mit echtem Viewport (ein reiner Kommandozeilen-Screenshot
// über Chrome ignoriert --window-size unter 500px Breite), startet
// tools/server.mjs selbst, falls unter Port 4173 noch nichts erreichbar ist.
// Schreibt PNGs direkt nach assets/bilder/quelle/ (Quelle für npm run bilder).
// Die neun "vorher"-Screenshots liegen dort bereits fertig und bleiben
// unangetastet.
//
// Ablauf je Bild (P17-Auftrag, Schritt 3): "/index.html" im Viewport laden,
// warten bis #pageLoader entfernt ist, plus 1,6s (Textüberlagerung
// eingeblendet, siehe huelle.js/pruefeHuelle() in tools/pruefen.mjs); dann die
// angegebenen Klicks; nach jedem Rahmenwechsel (jeder Klick, der #showFrame
// auf eine neue Seite umlenkt) 2s warten; Screenshot des Viewports (kein
// fullPage). Handy-Aufnahmen mit deviceScaleFactor 2 (wie die vorher-*-handy-
// Bilder, 780×1688 – siehe assets/bilder/quelle/), Desktop-Aufnahmen mit 1
// (wie die vorher-*-desktop-Bilder, 1440×900) – im Auftrag nicht explizit
// genannt, aber nötig, damit beide Seiten eines Paares in gleicher Auflösung
// nebeneinanderstehen.

import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

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

async function warteBisLoaderWeg(page) {
  await page
    .waitForFunction(() => !document.getElementById("pageLoader"), { timeout: 4000 })
    .catch(() => {});
}

// ---------- Klick-Bausteine ----------

// Leisten-Menü (ab 1024px sichtbar, .barMenu) – ein Klick lenkt #showFrame auf
// eine neue Seite um (Rahmenwechsel).
async function klickBarMenu(page, text) {
  const gefunden = await page.evaluate((text) => {
    const el = Array.from(document.querySelectorAll(".barMenu .menuBarElement")).find(
      (e) => e.textContent.trim() === text
    );
    if (!el) return false;
    el.click();
    return true;
  }, text);
  if (!gefunden) throw new Error(`.barMenu .menuBarElement mit Text "${text}" nicht gefunden`);
}

// Burger öffnen (unter 1024px, .burger) – kein Rahmenwechsel, nur das
// Menü-Panel wird eingeblendet.
async function klickBurgerOeffnen(page) {
  const gefunden = await page.evaluate(() => {
    const el = document.querySelector(".burger");
    if (!el) return false;
    el.click();
    return true;
  });
  if (!gefunden) throw new Error(".burger nicht gefunden");
  await warte(400); // Öffnen-Animation abwarten (wie screenshotHuelle() in tools/screenshots.mjs)
}

// Aufgeklapptes Burger-Menü (.burgerMenu .menuElement) – Klick lenkt
// #showFrame um (Rahmenwechsel) und schließt das Menü nach 150ms selbst
// (siehe huelle.js).
async function klickBurgerMenu(page, text) {
  const gefunden = await page.evaluate((text) => {
    const el = Array.from(document.querySelectorAll(".burgerMenu .menuElement")).find(
      (e) => e.textContent.trim() === text
    );
    if (!el) return false;
    el.click();
    return true;
  }, text);
  if (!gefunden) throw new Error(`.burgerMenu .menuElement mit Text "${text}" nicht gefunden`);
}

// Link innerhalb des Inhaltsrahmens (#showFrame, Frame-URL enthält "/ws/")
// anklicken – Rahmenwechsel auf eine andere Workspace-Seite.
async function klickImRahmen(page, datei) {
  let frame = null;
  for (let versuch = 0; versuch < 30 && !frame; versuch++) {
    frame = page.frames().find((f) => f.url().includes("/ws/"));
    if (!frame) await warte(100);
  }
  if (!frame) throw new Error(`Kein Rahmen mit URL ".../ws/..." gefunden (Ziel: ${datei})`);

  const selektor = `a[href="${datei}"]`;
  await frame.waitForSelector(selektor, { timeout: 5000 });
  const gefunden = await frame.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    el.click();
    return true;
  }, selektor);
  if (!gefunden) throw new Error(`Link '${selektor}' im Rahmen nicht gefunden`);
}

// ---------- Die neun Bilder ----------

const BILDER = [
  { datei: "nachher-start-desktop.png", breite: 1440, hoehe: 900, klicks: [] },
  { datei: "nachher-start-handy.png", breite: 390, hoehe: 844, klicks: [] },
  { datei: "nachher-menue-handy.png", breite: 390, hoehe: 844, klicks: [{ art: "burger" }] },
  {
    datei: "nachher-mannschaften-desktop.png",
    breite: 1440,
    hoehe: 900,
    klicks: [{ art: "barMenu", text: "Mannschaften" }],
  },
  {
    datei: "nachher-mannschaften-handy.png",
    breite: 390,
    hoehe: 844,
    klicks: [{ art: "burger" }, { art: "burgerMenu", text: "Mannschaften" }],
  },
  {
    datei: "nachher-vorstand-desktop.png",
    breite: 1440,
    hoehe: 900,
    klicks: [
      { art: "barMenu", text: "Verein" },
      { art: "rahmen", datei: "verein-vorstand.html" },
    ],
  },
  {
    datei: "nachher-sponsoren-handy.png",
    breite: 390,
    hoehe: 844,
    klicks: [
      { art: "burger" },
      { art: "burgerMenu", text: "Verein" },
      { art: "rahmen", datei: "verein-sponsoren.html" },
    ],
  },
  {
    datei: "nachher-mitglied-werden-handy.png",
    breite: 390,
    hoehe: 844,
    klicks: [{ art: "burger" }, { art: "burgerMenu", text: "Mitglied werden" }],
  },
  {
    datei: "nachher-downloads-handy.png",
    breite: 390,
    hoehe: 844,
    klicks: [
      { art: "burger" },
      { art: "burgerMenu", text: "Verein" },
      { art: "rahmen", datei: "verein-downloads.html" },
    ],
  },
];

async function fuehreKlickAus(page, klick) {
  switch (klick.art) {
    case "burger":
      return klickBurgerOeffnen(page); // kein Rahmenwechsel, wartet selbst
    case "barMenu":
      await klickBarMenu(page, klick.text);
      await warte(2000); // Rahmenwechsel
      return;
    case "burgerMenu":
      await klickBurgerMenu(page, klick.text);
      await warte(2000); // Rahmenwechsel
      return;
    case "rahmen":
      await klickImRahmen(page, klick.datei);
      await warte(2000); // Rahmenwechsel
      return;
    default:
      throw new Error(`Unbekannte Klick-Art: ${klick.art}`);
  }
}

async function main() {
  mkdirSync(ZIEL, { recursive: true });

  const serverProc = await starteServerFallsNoetig();
  try {
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
    try {
      for (const bild of BILDER) {
        const page = await browser.newPage();
        const dpr = bild.breite === 390 ? 2 : 1; // siehe Kommentar oben
        await page.setViewport({ width: bild.breite, height: bild.hoehe, deviceScaleFactor: dpr });
        await page.goto(BASIS + "/index.html", { waitUntil: "domcontentloaded", timeout: 30000 });
        await warteBisLoaderWeg(page);
        await warte(1600);

        for (const klick of bild.klicks) {
          await fuehreKlickAus(page, klick);
        }

        const ziel = path.join(ZIEL, bild.datei);
        await page.screenshot({ path: ziel });
        await page.close();
        console.log(`Nachher-Bild: ${bild.datei} (${bild.breite}×${bild.hoehe}, DPR ${dpr})`);
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
