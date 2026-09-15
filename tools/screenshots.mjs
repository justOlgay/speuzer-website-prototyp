#!/usr/bin/env node
// Speuzer Website Prototyp – Screenshots (P1)
// Ersetzt tools/screenshots.sh: headless Chrome ignoriert --window-size unter
// 500px Breite, Kommandozeilen-Screenshots bei 390px sind damit unbrauchbar.
// puppeteer-core mit echtem Viewport löst das. Startet tools/server.mjs
// selbst, falls unter Port 4173 noch nichts erreichbar ist.

import puppeteer from "puppeteer-core";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DOCS = path.join(ROOT, "docs");
const ZIEL = path.join(ROOT, "tools", "cache", "screens");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 4173;
const BASIS = `http://localhost:${PORT}`;
const BASIS_URL = "https://justolgay.github.io/speuzer-website-prototyp/";

const ANSICHTEN = [
  { breite: 390, hoehe: 844 },
  { breite: 1440, hoehe: 900 },
];

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

function leseSitemapPfade() {
  const sitemap = readFileSync(path.join(DOCS, "sitemap.xml"), "utf8");
  const treffer = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
  return treffer.map((loc) => {
    const pfad = loc.replace(BASIS_URL.replace(/\/$/, ""), "");
    return pfad || "/";
  });
}

// P15: Sitemap-Pfade sind jetzt "/ws/<wsName>.html" – Dateiname direkt aus
// wsName ableiten statt aus den (jetzt nicht mehr vorhandenen) Segmenten der
// alten, verschachtelten URL.
function pfadname(seitenPfad) {
  const treffer = seitenPfad.match(/^\/ws\/(.+)\.html$/);
  if (treffer) return treffer[1];
  return seitenPfad.replace(/^\//, "").replace(/\/$/, "").replaceAll("/", "-") || "start";
}

// ---------- Hülle (P16, Schritt 5) ----------
// Zusätzlich zu den Workspace-Seiten-Screenshots oben: die Hülle
// (docs/index.html) selbst, bei 390 und 1440 je Zustand (Start, danach
// jeder Menüpunkt, Impressum, bei 390 zusätzlich das offene Burger-Menü).
// "/" steht zwar als erster Eintrag in der Sitemap (siehe oben), wird von
// der allgemeinen Schleife oben aber weiterhin mitgenommen (ohne extra
// Behandlung, anders als in tools/pruefen.mjs/tools/lighthouse.mjs) – das
// ergibt dort lediglich einen zusätzlichen, nicht besonders aussagekräftigen
// Schnappschuss (meist die Ladeanimation, da networkidle0 hier fast sofort
// erreicht ist), die eigentlichen Hüllen-Screenshots kommen aus dieser
// Funktion.

// { zustand, klick } – klick liefert (bei Bedarf) den anzuklickenden Text im
// jeweiligen Menü; "start" und "impressum" haben eine eigene Sonderbehandlung
// unten.
const HUELLE_MENUPUNKTE = [
  { zustand: "mannschaften", text: "Mannschaften" },
  { zustand: "spielplan", text: "Spielplan & Tabellen" },
  { zustand: "news", text: "News" },
  { zustand: "verein", text: "Verein" },
  { zustand: "mitglied-werden", text: "Mitglied werden" },
];

async function wartetBisLoaderWeg(page) {
  await page.waitForFunction(() => !document.getElementById("pageLoader"), { timeout: 4000 }).catch(() => {});
}

async function screenshotHuelle(browser) {
  for (const { breite, hoehe } of ANSICHTEN) {
    const page = await browser.newPage();
    await page.setViewport({ width: breite, height: hoehe });
    await page.goto(BASIS + "/index.html", { waitUntil: "domcontentloaded", timeout: 30000 });
    await wartetBisLoaderWeg(page);

    // --- start ---
    await page.screenshot({ path: path.join(ZIEL, `huelle-start-${breite}.png`) });
    await page.screenshot({ path: path.join(ZIEL, `huelle-start-full-${breite}.png`), fullPage: true });
    console.log(`Hülle-Screenshot: start @ ${breite}px`);

    // --- Burger-Menü offen (nur 390) ---
    if (breite === 390) {
      await page.evaluate(() => document.querySelector(".burger").click());
      await warte(400);
      await page.screenshot({ path: path.join(ZIEL, `huelle-burger-${breite}.png`) });
      console.log(`Hülle-Screenshot: burger @ ${breite}px`);
    }

    // --- je Menüpunkt ---
    const menuSelektor = breite === 390 ? ".menuElement" : ".menuBarElement";
    for (const { zustand, text } of HUELLE_MENUPUNKTE) {
      const geklickt = await page.evaluate((sel, text) => {
        const el = Array.from(document.querySelectorAll(sel)).find((e) => e.textContent.trim() === text);
        if (!el) return false;
        el.click();
        return true;
      }, menuSelektor, text);
      if (!geklickt) {
        console.warn(`  (Hülle-Screenshot: Menüpunkt '${text}' bei ${breite}px nicht gefunden)`);
        continue;
      }
      await warte(2500);
      await page.screenshot({ path: path.join(ZIEL, `huelle-${zustand}-${breite}.png`) });
      if (zustand === "verein") {
        await page.screenshot({ path: path.join(ZIEL, `huelle-verein-full-${breite}.png`), fullPage: true });
      }
      console.log(`Hülle-Screenshot: ${zustand} @ ${breite}px`);
    }

    // --- Impressum (Klick im Fuß) ---
    const impressumGeklickt = await page.evaluate(() => {
      const el = document.querySelector(".footerImprint");
      if (!el) return false;
      el.click();
      return true;
    });
    if (impressumGeklickt) {
      await warte(2500);
      await page.screenshot({ path: path.join(ZIEL, `huelle-impressum-${breite}.png`) });
      console.log(`Hülle-Screenshot: impressum @ ${breite}px`);
    } else {
      console.warn(`  (Hülle-Screenshot: .footerImprint bei ${breite}px nicht gefunden)`);
    }

    await page.close();
  }
}

async function main() {
  mkdirSync(ZIEL, { recursive: true });

  const serverProc = await starteServerFallsNoetig();
  try {
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
    try {
      const pfade = leseSitemapPfade();
      for (const seitenPfad of pfade) {
        const name = pfadname(seitenPfad);
        for (const { breite, hoehe } of ANSICHTEN) {
          const page = await browser.newPage();
          await page.setViewport({ width: breite, height: hoehe });
          await page.goto(BASIS + seitenPfad, { waitUntil: "networkidle0", timeout: 30000 });
          const ziel = path.join(ZIEL, `${name}-${breite}.png`);
          await page.screenshot({ path: ziel, fullPage: true });
          await page.close();
          console.log(`Screenshot: ${seitenPfad} @ ${breite}px -> ${path.relative(ROOT, ziel)}`);
        }
      }

      await screenshotHuelle(browser);
    } finally {
      await browser.close();
    }
  } finally {
    if (serverProc) serverProc.kill();
  }

  console.log(`\nFertig. Screenshots liegen in ${path.relative(ROOT, ZIEL)}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
