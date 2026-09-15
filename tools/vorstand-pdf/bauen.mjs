#!/usr/bin/env node
// Speuzer Website Prototyp – Vorstandsdokument „Website-Vergleich“ (P14,
// appack-Fassung seit P18)
//
// Erzeugt aus den Daten des Repositories (data/*.json), den wörtlichen Texten
// aus tools/vorstand-pdf/texte.mjs und den Bildern in assets/bilder/quelle/
// sowie neuen Screenshots aus der appack-Hülle (docs/index.html) und den
// Begleitseiten ein gedrucktes A4-PDF für den Vorstand. Ablauf:
//   1. Daten laden (teams/spiele/tabellen/news/downloads/lighthouse/
//      appack-*), Sitemap lesen (Titel je Seite für Anhang C).
//   2. Zwölf neue Screenshots aufnehmen (puppeteer-core) nach
//      tools/cache/vorstand-pdf/bilder/: die meisten über die Hülle des
//      lokalen Servers (tools/huelle-aufnahme.mjs, wie tools/vergleich.mjs),
//      zwei direkt von den Begleitseiten /app/ und /vorher-nachher/ des
//      lokalen Servers. Die Live-Website/appack wird dabei NICHT aufgerufen.
//   3. Die neun vorhandenen Vorher/Nachher-Bildpaare aus
//      assets/bilder/quelle/ dorthin kopieren.
//   4. Alle Bilder auf höchstens 1200 px Breite verkleinern (sips).
//   5. QR-Code (SVG) für die Prototyp-Adresse erzeugen.
//   6. Titelseite und Hauptinhalt als zwei getrennte HTML-Dokumente bauen
//      (siehe tools/cache/vorstand-pdf/vergleich.html für den Hauptinhalt),
//      getrennt rendern (Titelseite ohne Fußzeile, Hauptinhalt mit
//      Fußzeile über displayHeaderFooter) und mit pdfunite zusammenführen.
//   7. PDF-Metadaten setzen (Titel, Autor).
//   8. Kopie in den Verein-Ordner ablegen (die alte PDF-Datei dort bleibt
//      zusätzlich stehen, Stand 14.09.2026).
//
// Nichts an appack, der Live-Website oder der App wird verändert; die
// Live-Seite (sportfreunde04.de) wird nicht aufgerufen.

import puppeteer from "puppeteer-core";
import QRCode from "qrcode";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  copyFileSync,
  existsSync,
  statSync,
  readdirSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { spawn } from "node:child_process";

import * as T from "./texte.mjs";
import { aufnahmeAusHuelle } from "../huelle-aufnahme.mjs";

const HIER = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HIER, "..", "..");
const CACHE = path.join(ROOT, "tools", "cache", "vorstand-pdf");
const BILDER = path.join(CACHE, "bilder");
const SEITEN_PNG = path.join(CACHE, "seiten");
const DATA_DIR = path.join(ROOT, "data");
const DOCS = path.join(ROOT, "docs");

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PUBLIC_URL = "https://justolgay.github.io/speuzer-website-prototyp/";
const PORT = 4173;
const LOKAL_BASIS = `http://localhost:${PORT}`;

const DATEINAME = "Speuzer Website - Vergleich Live-Seite und appack-Fassung 15.09.2026.pdf";
const PDF_PFAD = path.join(CACHE, DATEINAME);
const VEREIN_ORDNER =
  "/Users/olgayozkan/Library/CloudStorage/SynologyDrive-Drive/Eigene Dokumente/08_Privat & Familie/Personen/Ilay Özkan/Speuzer/Verein";
const VEREIN_PDF_PFAD = path.join(VEREIN_ORDNER, DATEINAME);

const PDF_TITEL = "Website-Vergleich Live-Seite und appack-Fassung – FFV Sportfreunde 04";
const PDF_AUTOR = "Olgay Özkan";

function warte(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------- Lokaler Server (wie tools/vergleich.mjs) ----------

async function serverErreichbar() {
  try {
    const resp = await fetch(LOKAL_BASIS + "/");
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

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// Dekodiert die paar HTML-Entitäten, die in den <title>-Texten aus docs/
// vorkommen (z. B. "&amp;" in "Spielplan &amp; Tabellen"), bevor der Text neu
// escaped wird – verhindert doppeltes Escaping ("&amp;amp;").
function dekodiereEntities(text) {
  return String(text ?? "")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'");
}

function formatSekunden(ms, nachkomma = 1) {
  // Geschütztes Leerzeichen zwischen Zahl und Einheit (P14b Punkt 7), damit
  // die Zahlenspalten (z. B. Anhang A) nicht zwischen "1,2" und "s" umbrechen.
  return (ms / 1000).toFixed(nachkomma).replace(".", ",") + " s";
}

function formatDatumLang(iso) {
  const MONATE = [
    "Januar", "Februar", "März", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Dezember",
  ];
  const d = new Date(iso);
  return `${d.getDate()}. ${MONATE[d.getMonth()]} ${d.getFullYear()}`;
}

// P18 Anhang B: Datum im selben kurzen Format wie die übrigen Prüfdaten des
// Absatzes ("04.09.2026").
function formatDatumKurz(iso) {
  const d = new Date(iso);
  const tag = String(d.getDate()).padStart(2, "0");
  const monat = String(d.getMonth() + 1).padStart(2, "0");
  return `${tag}.${monat}.${d.getFullYear()}`;
}

// Median einer Zahlenliste (P18 Kapitel 3: Median Performance über alle
// gemessenen Seiten aus data/lighthouse.json).
function median(zahlen) {
  const sortiert = [...zahlen].sort((a, b) => a - b);
  const mitte = Math.floor(sortiert.length / 2);
  return sortiert.length % 2 === 0
    ? (sortiert[mitte - 1] + sortiert[mitte]) / 2
    : sortiert[mitte];
}

// ---------- 1. Daten laden ----------

function ladeJSON(name) {
  return JSON.parse(readFileSync(path.join(DATA_DIR, `${name}.json`), "utf8"));
}

function ladeDaten() {
  return {
    teams: ladeJSON("teams"),
    spiele: ladeJSON("spiele"),
    tabellen: ladeJSON("tabellen"),
    downloads: ladeJSON("downloads"),
    lighthouse: ladeJSON("lighthouse"),
    appackStart: ladeJSON("appack-start"),
    appackMenu: ladeJSON("appack-menu"),
    appackFooter: ladeJSON("appack-footer"),
  };
}

function leseSitemapSeiten() {
  const sitemap = readFileSync(path.join(DOCS, "sitemap.xml"), "utf8");
  const basis = "https://justolgay.github.io/speuzer-website-prototyp";
  const locs = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
  return locs.map((loc) => {
    const pfad = loc.replace(basis, "") || "/";
    // P18b: Pfade, die auf ".html" enden (z. B. "/ws/datenschutz.html"),
    // zeigen direkt auf die Datei; nur Verzeichnispfade ("/…/", auch "/")
    // bekommen "index.html" angehängt.
    const dateiPfad = pfad.endsWith(".html")
      ? path.join(DOCS, pfad.replace(/^\//, ""))
      : path.join(DOCS, pfad.replace(/^\//, "").replace(/\/$/, ""), "index.html");
    let titel = "";
    if (existsSync(dateiPfad)) {
      const html = readFileSync(dateiPfad, "utf8");
      const m = html.match(/<title>(.*?)<\/title>/);
      titel = m ? dekodiereEntities(m[1]) : "";
    }
    return { pfad, titel };
  });
}

// P18 Anhang C: Titel der 404-Seite (eigene Vorlage begleit.html, aber nicht
// Teil der Sitemap, siehe tools/build.mjs).
function leseTitel404() {
  const html = readFileSync(path.join(DOCS, "404.html"), "utf8");
  const m = html.match(/<title>(.*?)<\/title>/);
  return m ? dekodiereEntities(m[1]) : "";
}

// ---------- 2.–4. Bilder vorbereiten ----------

function bildBreite(datei) {
  const out = execFileSync("sips", ["-g", "pixelWidth", datei], { encoding: "utf8" });
  const m = out.match(/pixelWidth:\s*(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

function verkleinereFallsNoetig(datei, maxBreite = 1200) {
  const breite = bildBreite(datei);
  if (breite && breite > maxBreite) {
    execFileSync("sips", ["--resampleWidth", String(maxBreite), datei], { stdio: "ignore" });
  }
}

// P14b Punkt 3: Handy-Screenshots auf das erste Sichtfenster (390 : 844) und
// Rechner-Screenshots auf 16 : 10 beschneiden (von oben, d. h. der obere
// Bildausschnitt bleibt erhalten), bevor sie verkleinert werden. Bei den
// vorhandenen Bildern entspricht das Seitenverhältnis bereits der Vorgabe
// (Screenshots wurden im jeweiligen Sichtfenster aufgenommen, nicht als
// vollständige Seite) – die Funktion ist damit in der Regel ein No-Op, greift
// aber zuverlässig, sobald ein Bild von der Vorgabe abweicht.
function schneideAufVerhaeltnisZu(datei, zielBreite, zielHoehe) {
  const script = `
from PIL import Image
pfad = ${JSON.stringify(datei)}
img = Image.open(pfad)
w, h = img.size
ziel = ${zielBreite} / ${zielHoehe}
ist = w / h
if abs(ist - ziel) > 0.002:
    if ist > ziel:
        neue_breite = round(h * ziel)
        img = img.crop((0, 0, neue_breite, h))
    else:
        neue_hoehe = round(w / ziel)
        img = img.crop((0, 0, w, neue_hoehe))
    img.save(pfad)
`;
  execFileSync("python3", ["-c", script], { stdio: "inherit" });
}

function istHandyBild(datei) {
  return /-handy\.png$/.test(datei) || /-390\.png$/.test(datei);
}

function istRechnerBild(datei) {
  return /-desktop\.png$/.test(datei) || /-1440\.png$/.test(datei);
}

function beschneideAlleBilder() {
  for (const datei of readdirSync(BILDER)) {
    if (!datei.endsWith(".png") || datei === "standard.png") continue;
    const voller = path.join(BILDER, datei);
    if (istHandyBild(datei)) {
      schneideAufVerhaeltnisZu(voller, 390, 844);
    } else if (istRechnerBild(datei)) {
      schneideAufVerhaeltnisZu(voller, 16, 10);
    }
  }
}

async function bereitMachen(page) {
  await page.evaluate(() => document.fonts.ready);
}

// Die zwölf laut Spezifikation (P18, Schritt 2) neu aufzunehmenden
// Screenshots. Die meisten kommen aus der Hülle des lokalen Servers
// (tools/huelle-aufnahme.mjs, wie tools/vergleich.mjs); zwei (App,
// Vorher/Nachher) sind Begleitseiten, die ohne Hülle direkt aufgerufen
// werden (kein Menüklick nötig).
const NEUE_SCREENSHOTS_HUELLE = [
  { datei: "neu-start-1440.png", opts: { breite: 1440, hoehe: 900 } },
  { datei: "neu-mannschaften-1440.png", opts: { breite: 1440, hoehe: 900, menue: "Mannschaften" } },
  {
    datei: "neu-spielplan-herren-1440.png",
    opts: { breite: 1440, hoehe: 900, menue: "Spielplan & Tabellen", imRahmen: "spielplan-herren.html" },
  },
  {
    datei: "neu-tabellen-1440.png",
    opts: { breite: 1440, hoehe: 900, menue: "Spielplan & Tabellen", imRahmen: "tabellen.html" },
  },
  {
    datei: "neu-mitglied-werden-1440.png",
    opts: { breite: 1440, hoehe: 900, menue: "Mitglied werden" },
  },
  { datei: "neu-start-390.png", opts: { breite: 390, hoehe: 844 } },
  { datei: "neu-start-menue-390.png", opts: { breite: 390, hoehe: 844, burger: true } },
  {
    datei: "neu-mannschaften-d3-390.png",
    opts: { breite: 390, hoehe: 844, burger: true, menue: "Mannschaften", imRahmen: "mannschaften-d3.html" },
  },
  {
    datei: "neu-mitglied-werden-390.png",
    opts: { breite: 390, hoehe: 844, burger: true, menue: "Mitglied werden" },
  },
  {
    datei: "neu-kontakt-390.png",
    opts: { breite: 390, hoehe: 844, burger: true, menue: "Verein", imRahmen: "kontakt.html" },
  },
];

// Begleitseiten: direkter Aufruf ohne Hülle, ein Screenshot bei 1440×900.
const NEUE_SCREENSHOTS_BEGLEIT = [
  { datei: "neu-app-1440.png", pfad: "/app/" },
  { datei: "neu-vorher-nachher-1440.png", pfad: "/vorher-nachher/" },
];

async function nimmNeueScreenshotsAuf(browser) {
  for (const a of NEUE_SCREENSHOTS_HUELLE) {
    const ziel = path.join(BILDER, a.datei);
    const page = await browser.newPage();
    await aufnahmeAusHuelle(page, a.opts);
    await bereitMachen(page);
    await page.screenshot({ path: ziel });
    await page.close();
    console.log(`Screenshot (Hülle): ${a.datei} @ ${a.opts.breite}×${a.opts.hoehe} -> ${path.relative(ROOT, ziel)}`);
  }

  for (const a of NEUE_SCREENSHOTS_BEGLEIT) {
    const ziel = path.join(BILDER, a.datei);
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.goto(LOKAL_BASIS + a.pfad, { waitUntil: "networkidle0", timeout: 30000 });
    await bereitMachen(page);
    await page.screenshot({ path: ziel });
    await page.close();
    console.log(`Screenshot (Begleitseite): ${a.datei} @ 1440×900 -> ${path.relative(ROOT, ziel)}`);
  }
}

function kopiereVorhandeneBilder() {
  const benoetigt = new Set();
  for (const paar of Object.values(T.PAARE_BILDER)) {
    benoetigt.add(paar.vorher.name);
    benoetigt.add(paar.nachher.name);
  }
  for (const name of benoetigt) {
    const quelle = path.join(ROOT, "assets", "bilder", "quelle", `${name}.png`);
    const ziel = path.join(BILDER, `${name}.png`);
    copyFileSync(quelle, ziel);
  }
  // Bild für die schematische WhatsApp-Vorschau (Situation 4)
  copyFileSync(path.join(ROOT, "assets", "og", "standard.png"), path.join(BILDER, "standard.png"));
  return benoetigt;
}

function verkleinereAlleBilder() {
  for (const datei of readdirSync(BILDER)) {
    if (datei.endsWith(".png")) {
      verkleinereFallsNoetig(path.join(BILDER, datei));
    }
  }
}

// ---------- 5. QR-Code ----------

async function qrSvg(url, klasse) {
  const svg = await QRCode.toString(url, { type: "svg", margin: 1 });
  // Klasse statt fixer Breite/Höhe einsetzen, damit die Größe per CSS
  // (32mm laut Spezifikation) gesteuert wird, nicht per SVG-Attribut.
  return svg.replace("<svg ", `<svg class="${klasse}" `);
}

// ---------- Bausteine ----------

function bild(name, alt, klasse = "bild-rahmen") {
  return `<img src="bilder/${name}.png" alt="${escapeHtml(alt)}" class="${klasse}">`;
}

function kachel({ wert, label, vorher, jetzt }) {
  return `<div class="kachel">
    <div class="kachel__wert">${escapeHtml(wert)}</div>
    <div class="kachel__label">${escapeHtml(label)}</div>
    <div class="kachel__vergleich">
      <span class="kachel__vorher">vorher ${escapeHtml(vorher)}</span>
      <span class="kachel__jetzt">jetzt ${escapeHtml(jetzt)}</span>
    </div>
  </div>`;
}

function tabelle({ kopf, zeilen, klasse = "" }) {
  const th = kopf.map((k) => `<th>${escapeHtml(k)}</th>`).join("");
  const rows = zeilen
    .map((zeile) => `<tr>${zeile.map((z) => `<td>${z}</td>`).join("")}</tr>`)
    .join("\n");
  return `<table class="tabelle ${klasse}">
    <thead><tr>${th}</tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

// Zweispaltiger Satz für lange Listen (Anhang A, C): eine einzige <table>,
// deren Zeilen je zwei Datenzeilen nebeneinander zeigen (mit schmaler
// Trennspalte), damit die Tabelle wie jede normale Tabelle über mehrere
// Seiten bricht (mit wiederholter Kopfzeile) – siehe vergleich.css für den
// Hintergrund, warum kein CSS-Mehrspalten-Container verwendet wird.
//
// P14c Punkt 1: restzeileEinzeln (nur von Anhang A gesetzt) – bei einer
// ungeraden Zeilenzahl steht die letzte Zeile in einer eigenen, einhälftigen
// Tabelle direkt darunter, statt als rechte Hälfte mit leeren Zellen in der
// zweispaltigen Tabelle zu stehen. So wiederholt sich bei einem
// Seitenumbruch nur der Tabellenkopf der Hälfte, die auch Zeilen hat.
function tabelleZweispaltigVerbunden({
  kopf,
  zeilen,
  klasse = "",
  spaltenbreiten = null,
  restzeileEinzeln = false,
}) {
  const ungerade = restzeileEinzeln && zeilen.length % 2 === 1;
  const hauptZeilen = ungerade ? zeilen.slice(0, -1) : zeilen;
  const restZeile = ungerade ? zeilen[zeilen.length - 1] : null;

  const half = Math.ceil(hauptZeilen.length / 2);
  const links = hauptZeilen.slice(0, half);
  const rechts = hauptZeilen.slice(half);
  const leer = kopf.map(() => "");

  const kopfHtml =
    kopf.map((k) => `<th>${escapeHtml(k)}</th>`).join("") +
    `<th class="spalte-luecke"></th>` +
    kopf.map((k) => `<th>${escapeHtml(k)}</th>`).join("");

  const rows = [];
  for (let i = 0; i < half; i++) {
    const l = links[i] ?? leer;
    const r = rechts[i] ?? leer;
    const cells =
      l.map((c) => `<td>${c}</td>`).join("") +
      `<td class="spalte-luecke"></td>` +
      r.map((c) => `<td>${c}</td>`).join("");
    rows.push(`<tr>${cells}</tr>`);
  }

  // Feste Spaltenbreiten (P14b Punkt 7: Pfad-/Seitenspalte schmaler) über
  // <colgroup>, damit table-layout: fixed die restlichen Spalten gleichmäßig
  // aufteilt, statt sich am Inhalt zu orientieren.
  const colgroup = spaltenbreiten
    ? `<colgroup>${spaltenbreiten.map((b) => `<col style="width:${b}">`).join("")}<col class="spalte-luecke">${spaltenbreiten.map((b) => `<col style="width:${b}">`).join("")}</colgroup>`
    : "";

  const hauptTabelle = `<table class="tabelle ${klasse}">
    ${colgroup}
    <thead><tr>${kopfHtml}</tr></thead>
    <tbody>${rows.join("\n")}</tbody>
  </table>`;

  if (!restZeile) {
    return hauptTabelle;
  }

  const restKopfHtml = kopf.map((k) => `<th>${escapeHtml(k)}</th>`).join("");
  const restColgroup = spaltenbreiten
    ? `<colgroup>${spaltenbreiten.map((b) => `<col style="width:${b}">`).join("")}</colgroup>`
    : "";
  const restBreite = spaltenbreiten
    ? `${spaltenbreiten.reduce((summe, b) => summe + parseFloat(b), 0)}mm`
    : "50%";
  const restCells = restZeile.map((c) => `<td>${c}</td>`).join("");
  const restTabelle = `<table class="tabelle ${klasse}" style="width:${restBreite}; margin-top:0;">
    ${restColgroup}
    <thead><tr>${restKopfHtml}</tr></thead>
    <tbody><tr>${restCells}</tr></tbody>
  </table>`;

  return `${hauptTabelle}\n${restTabelle}`;
}

function paarFigur(paarKey, handyUeberschreiben) {
  const paar = T.PAARE_BILDER[paarKey];
  const handy = handyUeberschreiben ?? paar.handy;
  return `<figure class="paar">
    <div class="paar__raster ${handy ? "paar__raster--handy" : "paar__raster--desktop"}">
      <div>
        <span class="etikett etikett--warn">Live-Seite</span>
        ${bild(paar.vorher.name, paar.vorher.alt)}
      </div>
      <div>
        <span class="etikett etikett--ok">Prototyp</span>
        ${bild(paar.nachher.name, paar.nachher.alt)}
      </div>
    </div>
    <figcaption class="paar__satz">${escapeHtml(paar.satz)}</figcaption>
  </figure>`;
}

// ---------- Titelseite ----------

async function baueTitelHtml() {
  const qr = await qrSvg(PUBLIC_URL, "titelseite__qr");
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<title>${escapeHtml(PDF_TITEL)}</title>
<link rel="stylesheet" href="../../../assets/css/tokens.css">
<link rel="stylesheet" href="../../../assets/css/fonts.css">
<link rel="stylesheet" href="../../vorstand-pdf/vergleich.css">
</head>
<body>
<div class="titelseite">
  <div class="titelseite__kopf">
    <img src="../../../assets/logo/wappen-blau.svg" alt="Wappen FFV Sportfreunde 04" class="titelseite__wappen">
    <h1 class="titelseite__titel">${escapeHtml(T.TITEL.titel)}</h1>
    <p class="titelseite__untertitel">${escapeHtml(T.TITEL.untertitel)}</p>
    <p class="titelseite__zeile">${escapeHtml(T.TITEL.zeile)}</p>
    <p class="titelseite__vorgelegt">${escapeHtml(T.TITEL.vorgelegt)}</p>
  </div>
  <div class="titelseite__fuss">
    ${qr}
    <div class="titelseite__fuss-text">
      <strong>${escapeHtml(T.TITEL.qrText)}</strong>
      <span>${escapeHtml(T.TITEL.hinweis)}</span>
    </div>
  </div>
</div>
</body>
</html>`;
}

// ---------- Seite 2 – Auf einen Blick ----------

function baueBlickAbschnitt() {
  const kacheln = [
    kachel({ wert: "6", label: "Menüpunkte", vorher: "12", jetzt: "6" }),
    kachel({
      wert: "11",
      label: "Mannschaften mit Trainingszeiten",
      vorher: "0",
      jetzt: "11",
    }),
    kachel({
      wert: "100 %",
      label: "Inhaltsbreite am Rechner",
      vorher: "40 %",
      jetzt: "100 %",
    }),
    kachel({
      wert: "0",
      label: "Private Telefonnummern",
      vorher: "19",
      jetzt: "0",
    }),
    kachel({
      wert: "44 × 44 px",
      label: "Kleinste Tippziele",
      vorher: "26 × 17 px",
      jetzt: "44 × 44 px",
    }),
    kachel({
      wert: "12,3:1",
      label: "Kontrast aktiver Menüpunkt",
      vorher: "2,3:1",
      jetzt: "12,3:1",
    }),
  ];

  const toc = [...T.KAPITEL_NAMEN.map((n) => `<li>${escapeHtml(n)}</li>`)].join("\n");
  const anhangToc = T.ANHANG_NAMEN.map(
    (n, i) => `<li class="anhang-eintrag">Anhang ${String.fromCharCode(65 + i)} – ${escapeHtml(n)}</li>`
  ).join("\n");

  return `<section class="kapitel">
  <h2>Auf einen Blick</h2>
  <p>${escapeHtml(T.BLICK_ABSATZ)}</p>
  <div class="kacheln">${kacheln.join("\n")}</div>
  <div class="kasten kasten--empfehlung">
    <div class="kasten__titel">Empfehlung</div>
    <p>${escapeHtml(T.BLICK_EMPFEHLUNG)}</p>
  </div>
  <div class="inhaltsverzeichnis">
    <h3>Inhalt</h3>
    <ol>${toc}</ol>
    <ol style="margin-top:6px;">${anhangToc}</ol>
  </div>
</section>`;
}

// ---------- Kapitel 1 ----------

function baueKapitel1() {
  const folgen = T.K1_FOLGEN.map((f) => `<li>${f}</li>`).join("\n");
  return `<section class="kapitel">
  <div class="kapitelnummer">Kapitel 1</div>
  <h2>${escapeHtml(T.KAPITEL_NAMEN[0])}</h2>
  <p>${escapeHtml(T.K1_TEXT)}</p>
  <h3>Was daraus folgt</h3>
  <ul class="liste">${folgen}</ul>
  <div class="kapitel1-bilder">
    <figure class="kapitel1-bild">
      <span class="etikett etikett--warn">Live-Seite</span>
      ${bild("vorher-vorstand-rahmen-desktop", "Live-Unterseite am Rechner: schmaler Inhaltsrahmen in der Seitenmitte mit eigenem Scrollbalken, daneben leere Fläche")}
      <figcaption>${escapeHtml(T.K1_BILD_VORHER)}</figcaption>
    </figure>
    <figure class="kapitel1-bild">
      <span class="etikett etikett--ok">appack-Fassung</span>
      ${bild("nachher-mannschaften-desktop", "appack-Fassung, Mannschaften am Rechner: Menüpunkt mit Vollbild-Einstellung, Inhalt über die Fensterbreite")}
      <figcaption>${escapeHtml(T.K1_BILD_NACHHER)}</figcaption>
    </figure>
  </div>
  <p>${escapeHtml(T.K1_SCHLUSS)}</p>
</section>`;
}

// ---------- Kapitel 2 ----------

function baueWhatsappVorschau(situation) {
  return `<div class="whatsapp-vorschau">
    <img src="bilder/standard.png" alt="Vorschaubild (Standardbild)">
    <div class="whatsapp-vorschau__text">
      <div class="whatsapp-vorschau__titel">${escapeHtml(situation.vorschauBildTitel)}</div>
      <div class="whatsapp-vorschau__beschreibung">${escapeHtml(situation.vorschauBeschreibung)}</div>
    </div>
    <div class="whatsapp-vorschau__domain">justolgay.github.io</div>
  </div>`;
}

function baueSituation(situation, index) {
  const nr = index + 1;
  if (situation.kastenAdresse) {
    // Situation 4: Sonderfall ohne Vorher-Bild. Kein zweites Bildpaar, daher
    // bleibt der gesamte Inhalt ein einziger, nicht trennbarer Block.
    return `<div class="situation">
      <div class="situation-block">
        <h3>${nr}. „${escapeHtml(situation.titel)}“</h3>
        <div class="adresse-kasten">${escapeHtml(situation.kastenAdresse)}</div>
        <p>${escapeHtml(situation.kastenSatz)}</p>
        <div class="situation__spalten">
          <div>
            <div class="situation__spalte-titel">Neuer Screenshot – Workspace-Seite mannschaften-d3.html im Rahmen (Handy)</div>
            ${bild("neu-mannschaften-d3-390", "appack-Fassung, Mannschaftsseite D3 im Inhaltsrahmen am Handy (neu aufgenommen am 15.09.2026)")}
          </div>
          <div>
            <div class="situation__spalte-titel">Schematische Link-Vorschau</div>
            ${baueWhatsappVorschau(situation)}
            <figcaption>${escapeHtml(situation.vorschauUnterschrift)}</figcaption>
          </div>
        </div>
        <p>${escapeHtml(situation.satz)}</p>
        <p><strong>Bleibt:</strong> ${escapeHtml(situation.bleibt)}</p>
      </div>
    </div>`;
  }

  // P14b Punkt 3: Überschrift, die zwei Textspalten und das ERSTE Bildpaar
  // (mit Unterschrift) bilden einen Block, der nicht getrennt wird
  // (break-inside: avoid auf .situation-block). Ein zweites Bildpaar (nur
  // Situation 2 und 3) folgt danach als eigenes, für sich nicht trennbares
  // Element (.paar hat bereits break-inside: avoid) – es darf auf die
  // nächste Seite rutschen, ohne dass zwischen seinen beiden Bildern
  // umbrochen wird.
  const ersteFigur = paarFigur(situation.paarKey);
  const zweiteFigur = situation.zweitesPaarKey ? paarFigur(situation.zweitesPaarKey) : "";

  return `<div class="situation">
    <div class="situation-block">
      <h3>${nr}. „${escapeHtml(situation.titel)}“</h3>
      <div class="situation__spalten">
        <div>
          <div class="situation__spalte-titel">Heute</div>
          <p>${escapeHtml(situation.heute)}</p>
        </div>
        <div>
          <div class="situation__spalte-titel">appack-Fassung</div>
          <p>${escapeHtml(situation.prototyp)}</p>
        </div>
      </div>
      <p><strong>Bleibt:</strong> ${escapeHtml(situation.bleibt)}</p>
      ${ersteFigur}
    </div>
    ${zweiteFigur}
  </div>`;
}

function baueKapitel2() {
  const situationen = T.SITUATIONEN.map((s, i) => baueSituation(s, i)).join("\n");
  return `<section class="kapitel">
  <div class="kapitelnummer">Kapitel 2</div>
  <h2>${escapeHtml(T.KAPITEL_NAMEN[1])}</h2>
  ${situationen}
</section>`;
}

// ---------- Kapitel 3 – Messbar ----------

// P18: Lighthouse-Block mit genau zwei Zeilen (Spezifikation Schritt 3) statt
// der bisherigen fünf Kopfzeilen der Tabelle – die sportfreunde04.de-Werte
// bleiben fest (Vorlage des Anbieters, siehe MESSBAR_FUSSNOTE), die
// Workspace-/Begleitseiten-Werte kommen aus data/lighthouse.json (Schritt 1).
function baueLighthouseBlock(lh) {
  const min = lh.minimum;
  const medianPerformance = median(lh.seiten.map((s) => s.performance));
  return `<div class="kasten">
    <p>sportfreunde04.de (Vorlage des Anbieters): 33 / 50 / 78 / 82, bleibt unverändert</p>
    <p>Workspace-Seiten per Direktlink: Minimum ${min.performance} / ${min.accessibility} / ${min.bestPractices} / ${min.seo}, Median Performance ${medianPerformance}</p>
  </div>`;
}

function baueKapitel3(lh) {
  const messbarZeilen = T.K3_MESSBAR_ZEILEN.map((z) => [
    z.merkmal,
    z.live,
    z.appackFn ? z.appackFn({ lighthouse: lh }) : z.appack,
    z.wer,
  ]);
  const zusatzZeilen = T.K3_ZUSATZ_ZEILEN.map((z) => [z.merkmal, z.live, z.appack, z.wer]);

  const alleZeilen = [...messbarZeilen, ...zusatzZeilen].map(
    ([merkmal, live, appack, wer]) => [escapeHtml(merkmal), escapeHtml(live), escapeHtml(appack), escapeHtml(wer)]
  );

  const table = tabelle({
    kopf: ["Merkmal", "Live heute", "appack-Fassung", "Wer kann es ändern"],
    zeilen: alleZeilen,
    klasse: "tabelle--messbar",
  });

  return `<section class="kapitel">
  <div class="kapitelnummer">Kapitel 3</div>
  <h2>${escapeHtml(T.KAPITEL_NAMEN[2])}</h2>
  <div class="kasten">
    <div class="kasten__titel">${escapeHtml(T.MESSBAR_ERKLAERKASTEN_TITEL)}</div>
    <p>${escapeHtml(T.MESSBAR_ERKLAERKASTEN)}</p>
  </div>
  ${baueLighthouseBlock(lh)}
  ${table}
  <p class="meta">${escapeHtml(T.MESSBAR_FUSSNOTE)}</p>
</section>`;
}

// ---------- Kapitel 4 ----------

function baueKapitel4() {
  const heute = T.K4_HEUTE.map((t) => `<li>${escapeHtml(t)}</li>`).join("\n");
  const proto = T.K4_PROTOTYP.map((t) => `<li>${escapeHtml(t)}</li>`).join("\n");
  return `<section class="kapitel">
  <div class="kapitelnummer">Kapitel 4</div>
  <h2>${escapeHtml(T.KAPITEL_NAMEN[3])}</h2>
  <div class="zwei-spalten-listen">
    <div>
      <h4>Heute</h4>
      <ul>${heute}</ul>
    </div>
    <div>
      <h4>Im Prototyp</h4>
      <ul>${proto}</ul>
    </div>
  </div>
  <div class="kasten kasten--warn">
    <p>${escapeHtml(T.K4_KASTEN)}</p>
  </div>
</section>`;
}

// ---------- Kapitel 5 ----------

function baueKapitel5() {
  const offen = T.K5_OFFEN.map((o) => `<li>${escapeHtml(o)}</li>`).join("\n");
  const nichtPunkte = T.K6_PUNKTE.map((p) => `<li>${escapeHtml(p)}</li>`).join("\n");
  return `<section class="kapitel">
  <div class="kapitelnummer">Kapitel 5</div>
  <h2>${escapeHtml(T.KAPITEL_NAMEN[4])}</h2>
  <p>${escapeHtml(T.K5_ABSATZ)}</p>
  <ul class="liste">${offen}</ul>
  <figure class="figur-einzeln figur-einzeln--gross">
    ${bild("neu-app-1440", "appack-Fassung: App-Ansicht bei 1440 px (neu aufgenommen am 15.09.2026)")}
    <figcaption>${escapeHtml(T.K5_BILD_UNTERSCHRIFT)}</figcaption>
  </figure>
  <div class="kasten">
    <div class="kasten__titel">Was der Prototyp nicht ist</div>
    <ul class="liste">${nichtPunkte}</ul>
  </div>
</section>`;
}

// ---------- Kapitel 6 – Was nur der Anbieter ändern kann ----------

function baueKapitel6() {
  const zeilen = T.K6_TABELLE_ZEILEN.map((z) => [
    escapeHtml(z.punkt),
    escapeHtml(z.problem),
    escapeHtml(z.wunsch),
  ]);
  const table = tabelle({ kopf: ["Punkt", "Problem heute", "Wunsch"], zeilen });
  return `<section class="kapitel">
  <div class="kapitelnummer">Kapitel 6</div>
  <h2>${escapeHtml(T.KAPITEL_NAMEN[5])}</h2>
  ${table}
  <p>${escapeHtml(T.K6_SATZ)}</p>
</section>`;
}

// ---------- Kapitel 7 – Der Weg: in appack umsetzen ----------

function baueKapitel7() {
  const a = T.K7_BLOCK_A.map((t) => `<li>${escapeHtml(t)}</li>`).join("\n");
  const b = T.K7_BLOCK_B.map((t) => `<li>${escapeHtml(t)}</li>`).join("\n");

  return `<section class="kapitel">
  <div class="kapitelnummer">Kapitel 7</div>
  <h2>${escapeHtml(T.KAPITEL_NAMEN[6])}</h2>
  <h3>A. ${escapeHtml(T.K7_BLOCK_A_TITEL)}</h3>
  <ul class="liste">${a}</ul>
  <h3>B. ${escapeHtml(T.K7_BLOCK_B_TITEL)}</h3>
  <ul class="liste">${b}</ul>
  <div class="k7-schluss">
    <h3>C. ${escapeHtml(T.K7_BLOCK_C_TITEL)}</h3>
    <p>${escapeHtml(T.K7_BLOCK_C_SATZ)}</p>
    <div class="kasten kasten--empfehlung">
      <div class="kasten__titel">Empfehlung</div>
      <p>${escapeHtml(T.K7_EMPFEHLUNG)}</p>
    </div>
  </div>
</section>`;
}

// ---------- Kapitel 8 ----------

// P14b Punkt 5: leeres Ankreuzkästchen (CSS-Rahmen 4×4mm) vor jedem Punkt,
// damit die Liste als Beschlussvorlage in der Sitzung dient. Bei Punkt 2
// (Index 1) zusätzlich "☐ ja ☐ nein" als zwei Kästchen unter dem Text (P18:
// der frühere Sonderfall "☐ Weg 1 ☐ Weg 2" bei Punkt 6 entfällt mit K8_ENTSCHEIDUNGEN).
function ankreuzOption(text) {
  return `<span class="ankreuz-inline"><span class="ankreuz"></span>${escapeHtml(text)}</span>`;
}

function baueKapitel8() {
  // P14c Punkt 2: Antwortkästchen stehen in eigener Zeile unter dem Text des
  // Punkts, eingerückt auf die Texteinzug-Kante (siehe .beschluss-antwort in
  // vergleich.css) – vorher standen sie am Zeilenende und brachen ungünstig
  // um.
  const zusatzJeIndex = {
    1: `<div class="beschluss-antwort">${ankreuzOption("ja")}${ankreuzOption("nein")}</div>`,
  };
  const items = T.K8_ENTSCHEIDUNGEN.map(
    (t, i) =>
      `<li><span class="ankreuz"></span>${escapeHtml(t)}${zusatzJeIndex[i] ?? ""}</li>`
  ).join("\n");
  // P18b: kein erzwungener Seitenumbruch vor Kapitel 8 (wie Anhang B/D) –
  // Block C samt Empfehlung aus Kapitel 7 und die acht Ankreuzpunkte bilden
  // zusammen eine gut gefüllte Seite statt einer fast leeren Folgeseite.
  return `<section class="kapitel kapitel--fortlaufend">
  <div class="kapitelnummer">Kapitel 8</div>
  <h2>${escapeHtml(T.KAPITEL_NAMEN[7])}</h2>
  <ol class="liste liste--beschluss">${items}</ol>
</section>`;
}

// ---------- Kapitel 9 ----------

// P14b Punkt 6: Bildergalerie "Der Prototyp in Bildern" nach der Liste der
// sechs Menüpunkte – ausschließlich Prototyp-Screenshots, sechs Rechner-
// Bilder im Raster 2×3, darunter eine Reihe mit vier Handy-Bildern.
const K9_GALERIE_RECHNER = [
  { datei: "neu-start-1440", beschriftung: "Startseite, 1 440 px", alt: "appack-Fassung, Startseite am Rechner, 1 440 px" },
  { datei: "neu-mannschaften-1440", beschriftung: "Mannschaften, 1 440 px", alt: "appack-Fassung, Mannschaftsübersicht am Rechner, 1 440 px" },
  { datei: "neu-spielplan-herren-1440", beschriftung: "Spielplan 1. Herrenmannschaft, 1 440 px", alt: "appack-Fassung, Spielplan der 1. Herrenmannschaft am Rechner, 1 440 px" },
  { datei: "neu-tabellen-1440", beschriftung: "Tabellen, 1 440 px", alt: "appack-Fassung, Tabellenübersicht am Rechner, 1 440 px" },
  { datei: "neu-mitglied-werden-1440", beschriftung: "Mitglied werden, 1 440 px", alt: "appack-Fassung, Seite Mitglied werden am Rechner, 1 440 px" },
  { datei: "neu-vorher-nachher-1440", beschriftung: "Begleitseite Vorher / Nachher, 1 440 px", alt: "Begleitseite Vorher / Nachher am Rechner, 1 440 px" },
];

const K9_GALERIE_HANDY = [
  { datei: "neu-start-390", beschriftung: "Startseite, 390 px", alt: "appack-Fassung, Startseite am Handy, 390 px" },
  { datei: "neu-start-menue-390", beschriftung: "Startseite mit geöffnetem Menü, 390 px", alt: "appack-Fassung, Startseite mit geöffnetem Menü am Handy, 390 px" },
  { datei: "neu-mannschaften-d3-390", beschriftung: "Mannschaft D3, 390 px", alt: "appack-Fassung, Mannschaftsseite D3 am Handy, 390 px" },
  { datei: "neu-kontakt-390", beschriftung: "Kontakt & Anfahrt, 390 px", alt: "appack-Fassung, Seite Kontakt und Anfahrt am Handy, 390 px" },
];

function galerieElement(eintrag) {
  return `<figure class="galerie-element">
    ${bild(eintrag.datei, eintrag.alt)}
    <figcaption>${escapeHtml(eintrag.beschriftung)}</figcaption>
  </figure>`;
}

function baueGalerie() {
  const rechner = K9_GALERIE_RECHNER.map(galerieElement).join("\n");
  const handy = K9_GALERIE_HANDY.map(galerieElement).join("\n");
  return `<h3>Der Prototyp in Bildern</h3>
  <div class="galerie-raster galerie-raster--rechner">${rechner}</div>
  <div class="galerie-raster galerie-raster--handy">${handy}</div>`;
}

async function baueKapitel9() {
  const qr = await qrSvg(PUBLIC_URL, "titelseite__qr");
  const menue = T.K9_MENUEPUNKTE.map(
    (m) => `<li><strong>${escapeHtml(m.name)}</strong> – ${escapeHtml(m.satz)}</li>`
  ).join("\n");
  return `<section class="kapitel">
  <div class="kapitelnummer">Kapitel 9</div>
  <h2>${escapeHtml(T.KAPITEL_NAMEN[8])}</h2>
  <div style="display:flex; gap:8mm; align-items:flex-start; margin-bottom:10px;">
    ${qr}
    <div>
      <p style="margin-top:0;"><strong>${escapeHtml(PUBLIC_URL.replace(/^https:\/\//, ""))}</strong></p>
      <p>${escapeHtml(T.K9_HINWEIS)}</p>
    </div>
  </div>
  <ul class="liste">${menue}</ul>
  ${baueGalerie()}
</section>`;
}

// ---------- Anhang ----------

// P14c Punkt 1: kurze Spaltenköpfe ohne Umbruch mitten im Wort ("Seite",
// "Perf.", "Barr.", "BP", "SEO", "LCP", "CLS") – siehe th { white-space:
// nowrap; } in vergleich.css.
const ANHANG_A_KOPF = ["Seite", "Perf.", "Barr.", "BP", "SEO", "LCP", "CLS"];

// P14d: Spaltenbreiten für die Anhang-A-Tabelle (Inhaltsbreite 174 mm, zwei
// Hälften mit 4 mm Trennspalte → je 85 mm): Seite 32, Perf. 10, Barr. 10,
// BP 8, SEO 8, LCP 9, CLS 8 (Summe je Hälfte 85 mm). Breiter als zuvor
// (Perf./Barr./BP), damit zwischen den Spaltenköpfen sichtbar Luft bleibt
// und sie sich nicht mehr berühren.
const ANHANG_A_SPALTENBREITEN = ["32mm", "10mm", "10mm", "8mm", "8mm", "9mm", "8mm"];

// P14c Punkt 1: Pfade brechen nur noch an Schrägstrichen um (<wbr> nach
// jedem "/" im HTML), nicht mehr mitten im Wort (siehe overflow-wrap: normal
// für die Pfadzelle in vergleich.css). Lange Pfade ohne weiteren "/" dürfen
// weiterhin an Bindestrichen umbrechen (Browser-Standardverhalten).
function pfadMitWbr(text) {
  return escapeHtml(text).replaceAll("/", "/<wbr>");
}

function baueAnhangA(lh) {
  const zeilen = lh.seiten.map((s) => [
    pfadMitWbr(s.url),
    `<span class="zahl">${s.performance}</span>`,
    `<span class="zahl">${s.accessibility}</span>`,
    `<span class="zahl">${s.bestPractices}</span>`,
    `<span class="zahl">${s.seo}</span>`,
    `<span class="zahl">${formatSekunden(s.lcp_ms)}</span>`,
    `<span class="zahl">${s.cls.toFixed(2).replace(".", ",")}</span>`,
  ]);
  const table = tabelleZweispaltigVerbunden({
    kopf: ANHANG_A_KOPF,
    zeilen,
    klasse: "tabelle--klein tabelle--anhangA",
    spaltenbreiten: ANHANG_A_SPALTENBREITEN,
    restzeileEinzeln: true,
  });
  return `<section class="kapitel">
  <div class="kapitelnummer">Anhang A</div>
  <h2>${escapeHtml(T.ANHANG_NAMEN[0])}</h2>
  <p class="meta">Stand: ${formatDatumLang(lh.stand)}, Messbasis: ${escapeHtml(lh.basis)}.</p>
  ${table}
</section>`;
}

// P14b Punkt 8: Anhang B folgt direkt unter Anhang A (kein Seitenumbruch, 12
// mm Abstand) – daher kein eigener .kapitel-Seitenumbruch, sondern die
// Fortsetzungs-Variante (.kapitel--fortlaufend, siehe vergleich.css).
function baueAnhangB(lh) {
  const absaetze = T.ANHANG_B_ABSAETZE.map((a) =>
    a.replace("<Datum aus data/lighthouse.json>", formatDatumKurz(lh.stand))
  )
    .map((a) => `<p>${escapeHtml(a)}</p>`)
    .join("\n");
  return `<section class="kapitel kapitel--fortlaufend">
  <div class="kapitelnummer">Anhang B</div>
  <h2>${escapeHtml(T.ANHANG_NAMEN[1])}</h2>
  ${absaetze}
</section>`;
}

// P18 Anhang C: kurze Tabelle der Hülle (Worksheets START, MENU, FOOTER aus
// data/appack-*.json, ohne _hinweis – siehe ANHANG_D_QUELLEN). SIDEBAR bleibt
// außen vor (laut data/appack-sidebar.json ungenutzt), APP_COLOR ebenso (kein
// CMS-Worksheet, sondern app-color.css des Workspace).
function formatWert(wert) {
  if (wert === true) return "ja";
  if (wert === false) return "nein";
  if (wert === null || wert === undefined || wert === "") return "–";
  return String(wert).replaceAll("<br>\n", ", ");
}

function baueHuelleZeilen(daten) {
  const zeilen = [];
  const { _hinweis: _s, ...startFelder } = daten.appackStart;
  for (const [feld, wert] of Object.entries(startFelder)) {
    zeilen.push(["START", feld, formatWert(wert)]);
  }
  daten.appackMenu.forEach((eintrag, i) => {
    zeilen.push([
      "MENU",
      `Menüpunkt ${i + 1}`,
      `${eintrag.menuTitle} → ${eintrag.menuLink}${eintrag.menuFullscreen ? " (Vollbild)" : ""}`,
    ]);
  });
  const { _hinweis: _f, ...footerFelder } = daten.appackFooter;
  for (const [feld, wert] of Object.entries(footerFelder)) {
    zeilen.push(["FOOTER", feld, formatWert(wert)]);
  }
  return zeilen;
}

function baueAnhangC(daten, sitemapSeiten, seite404Titel) {
  const huelleZeilen = baueHuelleZeilen(daten).map((z) => z.map((c) => escapeHtml(c)));
  const huelleTabelle = tabelle({ kopf: ["Worksheet", "Feld", "Wert"], zeilen: huelleZeilen, klasse: "tabelle--klein tabelle--anhangC" });

  // 36 Inhaltsseiten: alle Workspace-Seiten außer der Gestaltungsreferenz
  // styleguide.html (siehe K7_BLOCK_B: „36 Inhaltsseiten“).
  const wsSeiten = sitemapSeiten.filter(
    (s) => s.pfad.startsWith("/ws/") && s.pfad !== "/ws/styleguide.html"
  );
  const wsZeilen = wsSeiten.map((s) => [escapeHtml(s.pfad), escapeHtml(s.titel)]);
  const wsTabelle = tabelleZweispaltigVerbunden({
    kopf: ["Pfad", "Titel"],
    zeilen: wsZeilen,
    klasse: "tabelle--klein tabelle--anhangC",
  });

  // Drei Begleitseiten: /app/, /vorher-nachher/ (aus der Sitemap) und 404.html
  // (eigene Vorlage begleit.html, aber nicht in der Sitemap – siehe
  // tools/build.mjs).
  const appSeite = sitemapSeiten.find((s) => s.pfad === "/app/");
  const vorherNachherSeite = sitemapSeiten.find((s) => s.pfad === "/vorher-nachher/");
  const begleitZeilen = [
    [appSeite.pfad, appSeite.titel],
    [vorherNachherSeite.pfad, vorherNachherSeite.titel],
    ["/404.html", seite404Titel],
  ].map(([pfad, titel]) => [escapeHtml(pfad), escapeHtml(titel)]);
  const begleitTabelle = tabelle({ kopf: ["Pfad", "Titel"], zeilen: begleitZeilen, klasse: "tabelle--klein tabelle--anhangC" });

  return `<section class="kapitel">
  <div class="kapitelnummer">Anhang C</div>
  <h2>${escapeHtml(T.ANHANG_NAMEN[2])}</h2>
  <h3>Hülle</h3>
  ${huelleTabelle}
  <h3>Workspace-Seiten</h3>
  ${wsTabelle}
  <h3>Begleitseiten</h3>
  ${begleitTabelle}
</section>`;
}

// P14b Punkt 8: Anhang D folgt direkt unter Anhang C (kein Seitenumbruch, 12
// mm Abstand) – auch wenn Anhang C mit Überlauf auf einer neuen Seite endet
// (Punkt 9), schließt Anhang D unmittelbar dort an.
function baueAnhangD() {
  const items = T.ANHANG_D_QUELLEN.map((q) => `<li>${escapeHtml(q)}</li>`).join("\n");
  return `<section class="kapitel kapitel--fortlaufend">
  <div class="kapitelnummer">Anhang D</div>
  <h2>${escapeHtml(T.ANHANG_NAMEN[3])}</h2>
  <ul class="liste">${items}</ul>
</section>`;
}

// ---------- Hauptinhalt (alles außer Titelseite) ----------

async function baueInhaltHtml(daten, sitemapSeiten, seite404Titel) {
  const lh = daten.lighthouse;

  const teile = [
    baueBlickAbschnitt(),
    baueKapitel1(),
    baueKapitel2(),
    baueKapitel3(lh),
    baueKapitel4(),
    baueKapitel5(),
    baueKapitel6(),
    baueKapitel7(),
    baueKapitel8(),
    await baueKapitel9(),
    baueAnhangA(lh),
    baueAnhangB(lh),
    baueAnhangC(daten, sitemapSeiten, seite404Titel),
    baueAnhangD(),
  ];

  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<title>${escapeHtml(PDF_TITEL)}</title>
<link rel="stylesheet" href="../../../assets/css/tokens.css">
<link rel="stylesheet" href="../../../assets/css/fonts.css">
<link rel="stylesheet" href="../../vorstand-pdf/vergleich.css">
</head>
<body>
${teile.join("\n")}
</body>
</html>`;
}

// ---------- Rendern ----------

async function renderPdf(browser, htmlDateiPfad, ausgabePdf, { footer = false } = {}) {
  const page = await browser.newPage();
  await page.goto("file://" + htmlDateiPfad, { waitUntil: "networkidle0" });
  await page.evaluate(() => document.fonts.ready);

  const optionen = {
    path: ausgabePdf,
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: "22mm", bottom: "20mm", left: "18mm", right: "18mm" },
  };

  if (footer) {
    optionen.displayHeaderFooter = true;
    optionen.headerTemplate = `<span></span>`;
    optionen.footerTemplate = `<div style="width:100%; font-size:8pt; color:#5B6079; font-family:Arial, Helvetica, sans-serif; padding:0 18mm; display:flex; justify-content:space-between; -webkit-box-sizing:border-box; box-sizing:border-box;">
      <span>Website-Vergleich · FFV Sportfreunde 04 · 15. September 2026</span>
      <span>Seite <span class="pageNumber"></span> von <span class="totalPages"></span></span>
    </div>`;
  } else {
    optionen.displayHeaderFooter = false;
  }

  await page.pdf(optionen);
  await page.close();
}

function setzePdfMetadaten(pdfPfad, titel, autor) {
  const script = `
import fitz
doc = fitz.open(${JSON.stringify(pdfPfad)})
meta = doc.metadata
meta["title"] = ${JSON.stringify(titel)}
meta["author"] = ${JSON.stringify(autor)}
doc.set_metadata(meta)
tmp = ${JSON.stringify(pdfPfad)} + ".tmp"
doc.save(tmp)
doc.close()
import os
os.replace(tmp, ${JSON.stringify(pdfPfad)})
`;
  execFileSync("python3", ["-c", script], { stdio: "inherit" });
}

// ---------- main ----------

async function main() {
  mkdirSync(BILDER, { recursive: true });
  mkdirSync(SEITEN_PNG, { recursive: true });

  console.log("Daten laden …");
  const daten = ladeDaten();
  const sitemapSeiten = leseSitemapSeiten();
  console.log(`  ${sitemapSeiten.length} Seiten aus der Sitemap gelesen.`);

  console.log("Vorhandene Vorher/Nachher-Bilder kopieren …");
  kopiereVorhandeneBilder();

  console.log("Lokalen Server starten, falls nötig …");
  const serverProc = await starteServerFallsNoetig();

  console.log("Browser starten (puppeteer-core, lokales Chrome) …");
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });

  try {
    console.log("Neue Screenshots aus der Hülle und den Begleitseiten des lokalen Servers aufnehmen …");
    await nimmNeueScreenshotsAuf(browser);

    console.log("Handy-Bilder auf 390 : 844, Rechner-Bilder auf 16 : 10 beschneiden (von oben) …");
    beschneideAlleBilder();

    console.log("Bilder auf höchstens 1200 px Breite verkleinern …");
    verkleinereAlleBilder();

    console.log("HTML bauen …");
    const seite404Titel = leseTitel404();
    const titelHtml = await baueTitelHtml();
    const inhaltHtml = await baueInhaltHtml(daten, sitemapSeiten, seite404Titel);

    const titelHtmlPfad = path.join(CACHE, "titelseite.html");
    const inhaltHtmlPfad = path.join(CACHE, "vergleich.html");
    writeFileSync(titelHtmlPfad, titelHtml, "utf8");
    writeFileSync(inhaltHtmlPfad, inhaltHtml, "utf8");

    console.log("Titelseite rendern (ohne Fußzeile) …");
    const titelPdfPfad = path.join(CACHE, "titelseite.pdf");
    await renderPdf(browser, titelHtmlPfad, titelPdfPfad, { footer: false });

    console.log("Hauptinhalt rendern (mit Fußzeile) …");
    const inhaltPdfPfad = path.join(CACHE, "inhalt.pdf");
    await renderPdf(browser, inhaltHtmlPfad, inhaltPdfPfad, { footer: true });

    console.log("Titelseite und Hauptinhalt zusammenführen (pdfunite) …");
    execFileSync("pdfunite", [titelPdfPfad, inhaltPdfPfad, PDF_PFAD]);

    console.log("PDF-Metadaten setzen …");
    setzePdfMetadaten(PDF_PFAD, PDF_TITEL, PDF_AUTOR);

    console.log(`Kopie ablegen: ${VEREIN_PDF_PFAD}`);
    copyFileSync(PDF_PFAD, VEREIN_PDF_PFAD);

    const groesse = statSync(PDF_PFAD).size;
    console.log(`\nFertig. PDF: ${PDF_PFAD} (${(groesse / 1024 / 1024).toFixed(2)} MB)`);
  } finally {
    await browser.close();
    if (serverProc) serverProc.kill();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

