#!/usr/bin/env node
// Speuzer Website Prototyp – Hüllen-Bilder (P16)
// Erzeugt assets/huelle/startbild.jpg und assets/huelle/wappen-512.png per
// headless Chrome (puppeteer-core), reproduzierbar aus den vorhandenen
// SVG-Wappen (assets/logo/). Beide Dateien werden committet – siehe
// README.md, Abschnitt "Hülle".

import puppeteer from "puppeteer-core";
import { existsSync, mkdirSync, readFileSync, statSync, unlinkSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ASSETS = path.join(ROOT, "assets");
const ZIEL = path.join(ASSETS, "huelle");
const CACHE = path.join(ROOT, "tools", "cache");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

// Vereinsblau des Wappens selbst (siehe tokens.css --wappen, dort als "nur
// im Logo selbst" verwendet dokumentiert) – hier für die farbige Fassung
// von wappen-512.png.
const WAPPEN_FARBE = "#0300FD";
const MAX_STARTBILD_BYTES = 200_000;

function seite(innerStyle, innerHtml) {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; background: transparent; }
  svg { display: block; }
</style>
</head>
<body>
  <div style="${innerStyle}">${innerHtml}</div>
</body>
</html>`;
}

function mitSvgStil(svgMarkup, stil) {
  return svgMarkup.replace("<svg ", `<svg style="${stil}" `);
}

async function baueStartbild(browser) {
  const wappenWeiss = readFileSync(path.join(ASSETS, "logo", "wappen-weiss.svg"), "utf8");
  const html = seite(
    "position:relative;width:1920px;height:1080px;overflow:hidden;" +
      "background:linear-gradient(160deg,#0B0E4A 0%,#191793 100%);",
    `<div style="position:absolute;right:-180px;bottom:-180px;opacity:0.10;">${mitSvgStil(
      wappenWeiss,
      "height:1100px;width:auto;"
    )}</div>`
  );

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: "load" });

  mkdirSync(CACHE, { recursive: true });
  const tempPng = path.join(CACHE, "huelle-startbild-temp.png");
  await page.screenshot({ path: tempPng, type: "png" });
  await page.close();

  const zielJpg = path.join(ZIEL, "startbild.jpg");
  let formatOptions = 82;
  let groesse = Infinity;
  while (true) {
    execFileSync("sips", [
      "-s", "format", "jpeg",
      "-s", "formatOptions", String(formatOptions),
      tempPng,
      "--out", zielJpg,
    ], { stdio: "pipe" });
    groesse = statSync(zielJpg).size;
    if (groesse <= MAX_STARTBILD_BYTES || formatOptions <= 6) break;
    formatOptions -= 6;
  }
  unlinkSync(tempPng);
  console.log(`assets/huelle/startbild.jpg: ${groesse} Byte (formatOptions ${formatOptions}, 1920×1080)`);
}

async function baueWappen512(browser) {
  const wappenFarbig = readFileSync(path.join(ASSETS, "logo", "wappen-weiss.svg"), "utf8");
  const html = seite(
    "width:512px;height:512px;padding:8px;display:flex;align-items:center;justify-content:center;" +
      `color:${WAPPEN_FARBE};`,
    mitSvgStil(wappenFarbig, "width:100%;height:100%;")
  );

  const page = await browser.newPage();
  await page.setViewport({ width: 512, height: 512, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: "load" });

  mkdirSync(ZIEL, { recursive: true });
  const ziel = path.join(ZIEL, "wappen-512.png");
  await page.screenshot({ path: ziel, type: "png", omitBackground: true });
  await page.close();

  console.log(`assets/huelle/wappen-512.png: ${statSync(ziel).size} Byte (512×512, transparent)`);
}

async function main() {
  if (!existsSync(CHROME)) {
    console.error(`Chrome nicht gefunden unter ${CHROME}`);
    process.exit(1);
  }
  mkdirSync(ZIEL, { recursive: true });

  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  try {
    await baueStartbild(browser);
    await baueWappen512(browser);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
