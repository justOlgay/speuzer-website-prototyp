#!/usr/bin/env node
// Bildschirmfotos für das Paket M10 (11.10.2026): Die Familie schickt die Datei per E-Mail an die Geschäftsstelle.
//   - Fertig-Seite bei 390 px auf Deutsch und auf Arabisch (Handy mit "Datei teilen": beide Wege, Adresse, Knöpfe)
//   - Fertig-Seite im App-Modus (?app=1)
//   - Fertig-Seite am Computer ohne "Datei teilen" (nur der Weg über das Herunterladen)
//   - Teil A der Datei mit "So geht es weiter" als Bild (aus dem Ergebnis von pdf-test.mjs)
//
// Zuerst bauen (sh tools/cache/bau-sperre.sh build); der Testserver bedient eine Kopie von docs/. Teil A braucht die PDF-Dateien aus
// node tools/anmeldung-test/pdf-test.mjs (tools/cache/anmeldung-test/pdf/); fehlt eine, sagt das Skript es.
//
// Aufruf: node tools/anmeldung-test/screenshots-m10.mjs [Ausgabeordner]
// Standard: tools/cache/orchestrierung-anmeldung/pruefung/m10/   (Handy-Fenster 390 x 844)

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";
import { starteTestserver } from "./testserver.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const AUS = path.resolve(process.argv[2] || path.join(ROOT, "tools", "cache", "orchestrierung-anmeldung", "pruefung", "m10"));
const HANDY = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const COMPUTER = { width: 1100, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false };
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

async function geheBisFertig(page) {
  for (let i = 0; i < 120; i++) {
    const s = await stand(page);
    if (s.schritt === "fertig") break;
    if (s.schritt === "unterschriften") await unterschreibe(page);
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
  // Ausschnitt: vom Knopf "Datei teilen" bis zum Ende des Abschnitts "So schicken Sie die Datei an den Verein"
  const ausschnitt = (page) =>
    page.evaluate(() => {
      const von = document.querySelector('#anmeldung .anm-ergebnis > .anm-knoepfe');
      const bis = document.querySelector("#anmeldung [data-senden]");
      const rv = von.getBoundingClientRect();
      const rb = bis.getBoundingClientRect();
      return { x: 0, y: Math.max(0, rv.top + window.scrollY - 16), width: window.innerWidth, height: rb.bottom - rv.top + 32 };
    });
  try {
    // 1. Fertig-Seite auf dem Handy, Deutsch und Arabisch (mit "Datei teilen": beide Wege)
    for (const sprache of ["de", "ar"]) {
      const page = await neueSeite(browser, server, HANDY, "", MIT_TEILEN);
      await ladeBeispiel(page, "kind-neu");
      if (sprache !== "de") {
        await page.click('[data-anm-sprachleiste] button[data-sprache="' + sprache + '"]');
        await page.waitForFunction((c) => document.getElementById("anmeldung").getAttribute("lang") === c, { timeout: 6000 }, sprache);
      }
      await geheBisFertig(page);
      await foto(page, "fertig-" + sprache + "-390.png", { fullPage: true });
      await foto(page, "fertig-" + sprache + "-390-ausschnitt.png", { clip: await ausschnitt(page), captureBeyondViewport: true });
      await page.close();
    }

    // 2. App-Modus: dieselbe Fertig-Seite mit dem Hinweis "Im Browser öffnen" und dem Link, der das Mail-Programm öffnet
    let page = await neueSeite(browser, server, HANDY, "?app=1", MIT_TEILEN);
    await ladeBeispiel(page, "kind-neu");
    await geheBisFertig(page);
    await foto(page, "fertig-app-modus-390.png", { fullPage: true });
    await foto(page, "fertig-app-modus-390-ausschnitt.png", { clip: await ausschnitt(page), captureBeyondViewport: true });
    const link = await page.$eval('#anmeldung a[data-aktion="mail-oeffnen"]', (a) => ({ href: a.getAttribute("href"), target: a.getAttribute("target") }));
    console.log("App-Modus, Link: " + JSON.stringify(link));
    await page.close();

    // 3. Computer: ohne "Datei teilen" nur der Weg über das Herunterladen
    page = await neueSeite(browser, server, COMPUTER, "");
    await ladeBeispiel(page, "kind-neu");
    await geheBisFertig(page);
    await foto(page, "fertig-computer-1100.png", { clip: await ausschnitt(page), captureBeyondViewport: true });
    await page.close();
  } finally {
    await browser.close();
    await server.stop();
  }

  // 4. Teil A der Datei als Bild: aus dem Ergebnis von pdf-test.mjs (Seite 1 mit "So geht es weiter").
  // Erstes Bild: Kind neu, alles am Bildschirm. Zweites Bild: ein Lauf „alles auf Papier, selbst ausdrucken“ (seit M11: Foto oder Scan per E-Mail, oder im Verein abgeben).
  const pdfOrdner = path.join(ROOT, "tools", "cache", "anmeldung-test", "pdf");
  const textSeite1 = (pdf) => spawnSync("pdftotext", ["-f", "1", "-l", "1", pdf, "-"], { encoding: "utf8" }).stdout.replace(/\s+/g, " ");
  const papier = fs.existsSync(pdfOrdner)
    ? fs.readdirSync(pdfOrdner).filter((f) => f.endsWith("-papier.pdf")).sort().find((f) => textSeite1(path.join(pdfOrdner, f)).includes("Fotografieren oder scannen Sie die unterschriebenen Blätter."))
    : null;
  const quellen = [["kind-neu-deutsch-f.pdf", "teil-a-kind-neu"]];
  if (papier) quellen.push([papier, "teil-a-papier-selbst-drucken"]);
  else console.log("Teil A: kein Lauf „alles auf Papier, selbst ausdrucken“ in " + path.relative(ROOT, pdfOrdner) + " (zuerst node tools/anmeldung-test/pdf-test.mjs)");
  for (const [datei, name] of quellen) {
    const pdf = path.join(pdfOrdner, datei);
    if (!fs.existsSync(pdf)) {
      console.log("Teil A: " + path.relative(ROOT, pdf) + " fehlt (zuerst node tools/anmeldung-test/pdf-test.mjs)");
      continue;
    }
    const r = spawnSync("pdftoppm", ["-png", "-r", "100", "-f", "1", "-l", "1", pdf, path.join(AUS, name)], { encoding: "utf8" });
    if (r.status === 0) for (const f of fs.readdirSync(AUS).filter((x) => x.startsWith(name + "-") && x.endsWith(".png"))) gemacht.push(path.relative(ROOT, path.join(AUS, f)));
    else console.log("pdftoppm fehlgeschlagen: " + r.stderr);
  }
  console.log(gemacht.join("\n"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
