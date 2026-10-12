#!/usr/bin/env node
// Bildschirmfotos für das Paket M11 (12.10.2026): Die Familie schickt die ganze Datei per E-Mail an die Geschäftsstelle, auch Teil C.
//   - Fertig-Seite bei 390 px (Kind neu): ganze Seite und Ausschnitt „So geht es weiter“ (Teil C: „Der Verein bewahrt ihn getrennt auf.“)
//   - Fertig-Seite bei 390 px, alles auf Papier und selbst ausdrucken: Ausschnitt mit dem Satz zum Papierweg
//     („Fotografieren oder scannen Sie die unterschriebenen Blätter. Schicken Sie sie per E-Mail … Oder geben Sie sie im Verein ab.“)
//   - Fertig-Seite bei 390 px, Karneval Kind: Ausschnitt „So geht es weiter“
//   - Seite 1 der Datei (Teil A „So geht es weiter“) und das Trennblatt von Teil C als Bild (aus den Dateien von pdf-test.mjs)
//
// Zuerst bauen (sh tools/cache/bau-sperre.sh build); der Testserver bedient eine Kopie von docs/. Die Bilder aus der Datei brauchen die PDFs aus
// node tools/anmeldung-test/pdf-test.mjs (tools/cache/anmeldung-test/pdf/); fehlt eine, sagt das Skript es.
//
// Aufruf: node tools/anmeldung-test/screenshots-m11.mjs [Ausgabeordner]
// Standard: tools/cache/orchestrierung-anmeldung/pruefung/m11/   (Handy-Fenster 390 x 844)

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";
import { starteTestserver } from "./testserver.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const AUS = path.resolve(process.argv[2] || path.join(ROOT, "tools", "cache", "orchestrierung-anmeldung", "pruefung", "m11"));
const HANDY = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const warte = (ms) => new Promise((r) => setTimeout(r, ms));

// Handy-Browser, die Dateien teilen können: Teilen klappt (die Fertig-Seite zeigt "Datei teilen" und den Weg am Handy)
const MIT_TEILEN = () => {
  Object.defineProperty(navigator, "canShare", { value: () => true, configurable: true });
  Object.defineProperty(navigator, "share", { value: () => Promise.resolve(), configurable: true });
};

async function neueSeite(browser, server, vp, abfrage, vorLaden) {
  const page = await browser.newPage();
  await page.setViewport(vp);
  if (vorLaden) await page.evaluateOnNewDocument(vorLaden);
  await page.goto(server.basis + "/anmeldung/" + (abfrage || ""), { waitUntil: "networkidle0" });
  await page.waitForSelector("#anmeldung[data-bereit]", { timeout: 10000 });
  return page;
}

async function ladeBeispiel(page, id) {
  await page.$eval("[data-anm-werkzeuge]", (d) => (d.open = true));
  await page.click('[data-beispiel="' + id + '"]');
  await warte(300);
  await page.$eval("[data-anm-werkzeuge]", (d) => (d.open = false));
}

const stand = (page) => page.$eval("#anmeldung", (e) => ({ schritt: e.dataset.schritt, teil: e.dataset.teil }));

// Unterschreibt alle Felder der Seite "unterschriften" mit einem einfachen Strich und setzt den Haken bei der Satzung
async function unterschreibe(page) {
  const haken = await page.$('#anmeldung input[data-pfad="satzung"]');
  if (haken && !(await haken.evaluate((e) => e.checked))) await page.click('#anmeldung label[for="' + (await haken.evaluate((e) => e.id)) + '"]');
  for (const c of await page.$$("#anmeldung canvas.anm-unterschrift__leinwand")) {
    await c.evaluate((e) => e.scrollIntoView({ block: "center" }));
    const box = await c.boundingBox();
    await page.mouse.move(box.x + 20, box.y + box.height / 2);
    await page.mouse.down();
    for (let i = 0; i <= 12; i++) await page.mouse.move(box.x + 20 + i * ((box.width - 40) / 12), box.y + box.height / 2 + Math.sin(i) * 14);
    await page.mouse.up();
  }
  await warte(400);
}

// papier: auf der Seite "unterschriften" „Ich unterschreibe alles auf Papier“ und „Selbst ausdrucken“ wählen (nichts am Bildschirm unterschreiben)
async function waehle(page, pfad, wert) {
  const id = await page.$eval('#anmeldung input[data-pfad="' + pfad + '"][data-wert="' + wert + '"]', (e) => e.id);
  await page.click('#anmeldung label[for="' + id + '"]');
  await warte(200);
}

async function geheBisFertig(page, optionen) {
  const o = optionen || {};
  for (let i = 0; i < 120; i++) {
    const s = await stand(page);
    if (s.schritt === "fertig") break;
    if (s.schritt === "unterschriften") {
      if (o.papier) {
        await waehle(page, "unterschriftWeg", "papier");
        await waehle(page, "hfvUnterschrift", "selbst_drucken");
      } else await unterschreibe(page);
    }
    const knopf = await page.$('#anmeldung [data-aktion="weiter"]');
    if (!knopf) break;
    await knopf.evaluate((e) => e.scrollIntoView({ block: "center" }));
    await knopf.click();
    await page.waitForFunction((v) => { const w = document.getElementById("anmeldung"); const box = w.querySelector(".anm-fehlerbox"); return w.dataset.schritt !== v.schritt || w.dataset.teil !== v.teil || (box && !box.hidden); }, { timeout: 8000 }, s).catch(() => {});
    const neu = await stand(page);
    if (neu.schritt === s.schritt && neu.teil === s.teil) break;
  }
  await page.waitForSelector('#anmeldung [data-status="fertig"]', { timeout: 30000 });
  await warte(300);
}

// Ausschnitt: von der Überschrift „So geht es weiter“ bis zum Ende der Liste der Schritte
const ausschnittWeiter = (page) =>
  page.evaluate(() => {
    const von = Array.from(document.querySelectorAll("#anmeldung h3")).find((h) => /So geht es weiter/.test(h.textContent));
    const bis = document.querySelector("#anmeldung ol.anm-naechste");
    const rv = von.getBoundingClientRect();
    const rb = bis.getBoundingClientRect();
    return { x: 0, y: Math.max(0, rv.top + window.scrollY - 16), width: window.innerWidth, height: rb.bottom - rv.top + 32 };
  });

async function main() {
  fs.mkdirSync(AUS, { recursive: true });
  const server = await starteTestserver();
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-first-run"] });
  const gemacht = [];
  const foto = async (page, name, optionen) => {
    const datei = path.join(AUS, name);
    await page.screenshot({ path: datei, ...(optionen || {}) });
    gemacht.push(path.relative(ROOT, datei));
  };
  const texte = {};
  try {
    // 1. Kind neu (Fußball, Teil C mit Attest): ganze Fertig-Seite und der Ausschnitt „So geht es weiter“
    let page = await neueSeite(browser, server, HANDY, "", MIT_TEILEN);
    await ladeBeispiel(page, "kind-neu");
    await geheBisFertig(page);
    await foto(page, "fertig-kind-neu-390.png", { fullPage: true });
    await foto(page, "fertig-kind-neu-390-ausschnitt.png", { clip: await ausschnittWeiter(page), captureBeyondViewport: true });
    texte.kindNeu = await page.$eval("#anmeldung ol.anm-naechste", (e) => e.innerText.replace(/\s+/g, " "));
    texte.teile = await page.$$eval("#anmeldung .anm-ergebnis .anm-liste-punkte li", (l) => l.map((x) => x.innerText.replace(/\s+/g, " ")));
    await page.close();

    // 2. Alles auf Papier, selbst ausdrucken: der Satz zum Papierweg
    page = await neueSeite(browser, server, HANDY, "", MIT_TEILEN);
    await ladeBeispiel(page, "kind-neu");
    await geheBisFertig(page, { papier: true });
    await foto(page, "fertig-papier-390-ausschnitt.png", { clip: await ausschnittWeiter(page), captureBeyondViewport: true });
    texte.papier = await page.$eval("#anmeldung ol.anm-naechste", (e) => e.innerText.replace(/\s+/g, " "));
    await page.close();

    // 3. Karneval Kind
    page = await neueSeite(browser, server, HANDY, "", MIT_TEILEN);
    await ladeBeispiel(page, "karneval-kind");
    await geheBisFertig(page);
    await foto(page, "fertig-karneval-390-ausschnitt.png", { clip: await ausschnittWeiter(page), captureBeyondViewport: true });
    texte.karneval = await page.$eval("#anmeldung ol.anm-naechste", (e) => e.innerText.replace(/\s+/g, " "));
    await page.close();
  } finally {
    await browser.close();
    await server.stop();
  }
  fs.writeFileSync(path.join(AUS, "fertig-seite-texte.json"), JSON.stringify(texte, null, 2) + "\n");
  gemacht.push(path.relative(ROOT, path.join(AUS, "fertig-seite-texte.json")));

  // 4. Aus der Datei von pdf-test.mjs: Teil A, Seite mit „So geht es weiter“, und das Trennblatt von Teil C
  const pdfOrdner = path.join(ROOT, "tools", "cache", "anmeldung-test", "pdf");
  const pdf = path.join(pdfOrdner, "kind-neu-deutsch-f.pdf");
  if (!fs.existsSync(pdf)) console.log("PDF-Bilder: " + path.relative(ROOT, pdf) + " fehlt (zuerst node tools/anmeldung-test/pdf-test.mjs)");
  else {
    const seiten = Number((spawnSync("pdfinfo", [pdf], { encoding: "utf8" }).stdout.match(/Pages:\s+(\d+)/) || [])[1] || 0);
    const text = (n) => spawnSync("pdftotext", ["-f", String(n), "-l", String(n), pdf, "-"], { encoding: "utf8" }).stdout.replace(/\s+/g, " ");
    const finde = (muster) => {
      for (let n = 1; n <= seiten; n++) if (muster.test(text(n))) return n;
      return 0;
    };
    const teilA = finde(/So geht es weiter/);
    const trenn = finde(/Was mit Teil C geschieht/);
    for (const [nr, name] of [[teilA, "teil-a-so-geht-es-weiter"], [trenn, "teil-c-trennblatt"]]) {
      if (!nr) {
        console.log("PDF-Bild " + name + ": keine passende Seite in " + path.relative(ROOT, pdf));
        continue;
      }
      const ziel = path.join(AUS, name);
      const r = spawnSync("pdftoppm", ["-png", "-r", "110", "-f", String(nr), "-l", String(nr), "-singlefile", pdf, ziel], { encoding: "utf8" });
      if (r.status === 0) gemacht.push(path.relative(ROOT, ziel + ".png") + " (Seite " + nr + " von " + seiten + ")");
      else console.log("pdftoppm fehlgeschlagen: " + r.stderr);
    }
  }
  console.log(gemacht.join("\n"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
