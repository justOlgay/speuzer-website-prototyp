#!/usr/bin/env node
// Bildschirmfotos für die Nachbesserung N-A2 (07.10.2026): Sprachwahl im ersten Bildschirm, "Diese Unterschrift gilt für:" als Liste,
// Arabisch (Prüfseite mit der Beitragszeile, Hilfe-Dialog), App-Modus (?app=1) sowie Teil A der Datei als Bild.
//
// Zuerst bauen (sh tools/cache/bau-sperre.sh build); der Testserver bedient eine Kopie von docs/. Teil A braucht die PDF-Datei des Profils
// "vollmacht-und-kuendigung" aus node tools/anmeldung-test/pdf-test.mjs (tools/cache/anmeldung-test/pdf/); fehlt sie, sagt das Skript es.
//
// Aufruf: node tools/anmeldung-test/screenshots-n-a2.mjs [Ausgabeordner]
// Standard: tools/cache/orchestrierung-anmeldung/pruefung/n-a2/   (Handy-Fenster 390 x 844)

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";
import { starteTestserver } from "./testserver.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const AUS = path.resolve(process.argv[2] || path.join(ROOT, "tools", "cache", "orchestrierung-anmeldung", "pruefung", "n-a2"));
const VP = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const warte = (ms) => new Promise((r) => setTimeout(r, ms));

async function neueSeite(browser, server, abfrage) {
  const page = await browser.newPage();
  await page.setViewport(VP);
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

async function geheBis(page, schritt, teil) {
  for (let i = 0; i < 90; i++) {
    const s = await stand(page);
    if (s.schritt === schritt && (!teil || s.teil === teil)) return s;
    if (s.schritt === "unterschriften" && schritt !== "unterschriften") await unterschreibe(page);
    const knopf = await page.$('#anmeldung [data-aktion="weiter"]');
    if (!knopf) break;
    await knopf.evaluate((e) => e.scrollIntoView({ block: "center" }));
    await knopf.click();
    await page.waitForFunction((v) => { const w = document.getElementById("anmeldung"); const box = w.querySelector(".anm-fehlerbox"); return w.dataset.schritt !== v.schritt || w.dataset.teil !== v.teil || (box && !box.hidden); }, { timeout: 8000 }, s).catch(() => {});
    const neu = await stand(page);
    if (neu.schritt === s.schritt && neu.teil === s.teil) break;
  }
  return stand(page);
}

async function main() {
  fs.mkdirSync(AUS, { recursive: true });
  const server = await starteTestserver();
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-first-run"] });
  const gemacht = [];
  const foto = async (page, name, optionen) => {
    const datei = path.join(AUS, name);
    await page.screenshot({ path: datei, fullPage: false, ...(optionen || {}) });
    gemacht.push(path.relative(ROOT, datei));
  };
  try {
    // 1. Startseite: Sprachwahl im ersten Bildschirm (Website) und im App-Modus
    let page = await neueSeite(browser, server);
    await foto(page, "start.png");
    await page.close();
    page = await neueSeite(browser, server, "?app=1");
    await foto(page, "app-start.png");
    await page.close();

    // 2. Unterschriften: "Diese Unterschrift gilt für:" als Liste (erstes Unterschriftsfeld)
    page = await neueSeite(browser, server);
    await ladeBeispiel(page, "wechsel-hessen");
    await geheBis(page, "unterschriften");
    await page.$eval("#anmeldung .anm-unterschrift", (e) => {
      e.scrollIntoView({ block: "start" });
      window.scrollBy(0, -16);
    });
    await warte(200);
    await foto(page, "unterschriften-gilt-fuer.png");
    await page.close();

    // 3. Arabisch: Prüfseite (Beitragszeile mit deutschem Gruppennamen und arabischem Text) und Hilfe
    page = await neueSeite(browser, server);
    await ladeBeispiel(page, "kind-neu");
    await page.click('[data-anm-sprachleiste] button[data-sprache="ar"]');
    await page.waitForFunction(() => document.getElementById("anmeldung").getAttribute("dir") === "rtl", { timeout: 6000 });
    await foto(page, "ar-start.png");
    await geheBis(page, "pruefen");
    await page.evaluate(() => {
      const z = Array.from(document.querySelectorAll("#anmeldung .anm-pruefzeile")).find((x) => /\d+/.test(x.querySelector(".anm-pruefzeile__wert").textContent) && /Euro|يورو/.test(x.querySelector(".anm-pruefzeile__wert").textContent));
      z.scrollIntoView({ block: "center" });
    });
    await warte(200);
    await foto(page, "ar-pruefen-beitragszeile.png");
    await page.click('#anmeldung [data-aktion="hilfe"]');
    await page.waitForSelector("dialog.anm-dialog--hilfe[open]", { timeout: 3000 });
    await warte(200);
    await foto(page, "ar-hilfe.png");
    await page.close();

    // 4. App-Modus: Fertig-Seite mit dem Hinweis (Teilen schlägt fehl, Herunterladen schlägt fehl)
    page = await browser.newPage();
    await page.setViewport(VP);
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "canShare", { value: () => true, configurable: true });
      Object.defineProperty(navigator, "share", { value: () => Promise.reject(new DOMException("nicht erlaubt", "NotAllowedError")), configurable: true });
    });
    await page.goto(server.basis + "/anmeldung/?app=1", { waitUntil: "networkidle0" });
    await page.waitForSelector("#anmeldung[data-bereit]", { timeout: 10000 });
    await ladeBeispiel(page, "kind-neu");
    await geheBis(page, "fertig");
    await page.waitForSelector('#anmeldung [data-status="fertig"]', { timeout: 30000 });
    await page.evaluate(() => {
      HTMLAnchorElement.prototype.click = function () {
        throw new Error("Speichern in der App nicht möglich");
      };
    });
    await page.click('#anmeldung [data-aktion="herunterladen"]');
    await page.$eval("#anmeldung .anm-knoepfe", (e) => {
      e.scrollIntoView({ block: "start" });
      window.scrollBy(0, -16);
    });
    await warte(200);
    await foto(page, "app-fertig.png");
    await page.close();
  } finally {
    await browser.close();
    await server.stop();
  }

  // 5. Teil A der Datei (Seiten 1 bis 3) als Bild: aus dem Ergebnis von pdf-test.mjs
  const pdf = path.join(ROOT, "tools", "cache", "anmeldung-test", "pdf", "vollmacht-und-kuendigung.pdf");
  if (fs.existsSync(pdf)) {
    const r = spawnSync("pdftoppm", ["-png", "-r", "90", "-f", "1", "-l", "3", pdf, path.join(AUS, "teil-a-vollmacht-und-kuendigung")], { encoding: "utf8" });
    if (r.status === 0) for (const f of fs.readdirSync(AUS).filter((x) => /^teil-a-vollmacht-und-kuendigung-\d+\.png$/.test(x))) gemacht.push(path.relative(ROOT, path.join(AUS, f)));
    else console.log("pdftoppm fehlgeschlagen: " + r.stderr);
  } else console.log("Teil A: " + path.relative(ROOT, pdf) + " fehlt (zuerst node tools/anmeldung-test/pdf-test.mjs)");
  console.log(gemacht.join("\n"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
