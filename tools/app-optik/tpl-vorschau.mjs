#!/usr/bin/env node
// Speuzer Website Prototyp – B1/C1: lokale Vorschau der appack-Vorlagen unter
// assets/app/*_v3.tpl ohne appack.
//
// (a) Rendert die appack-FreeMarker-Teilmenge, die diese Vorlagen tatsächlich
//     benutzen ([#if x?has_content]…[#else]…[/#if], ${…}, [#list … as
//     entry]…[/#list], [#assign …]) gegen Mock-Daten. Startseite_v3.tpl
//     (B1) braucht dafür mock-start.json (Profil, Kachel-Liste); die fünf
//     Vereinsseiten (C1) nutzen ausschließlich ${userTitle} (kein sonstiges
//     FreeMarker, siehe C1-Spezifikation) – derselbe Mini-Renderer wertet
//     das ohne Änderung aus.
// (b) Ersetzt die appack-cdn-Skripte per Puppeteer-Request-Interception durch
//     lokale Stubs: jQuery (leer), graph-api.js (zwei feste Mock-Termine,
//     nur von Startseite_v3.tpl genutzt), component-news-widget.js (zwei
//     feste Mock-Meldungen, dito) und – neu in C1 – appack.workbook-1.4.1.js:
//     Workbook.load(options) beantwortet als Promise mit den Zeilen aus
//     tools/app-optik/mock-worksheets.json (Schlüssel = Workbook-ID),
//     unbekannte ID -> [], `filter` wird per striktem Gleichheitsvergleich
//     aller angegebenen Felder angewendet (deckt insbesondere
//     `{ sponActive: true }` ab, wie es Sponsoren_v3.tpl sendet). `App`
//     bleibt bewusst undefiniert (Browser-Fallback, siehe Vorlagen).
//
// Aufruf ohne Argument: alle assets/app/*_v3.tpl. Mit Argument (z. B.
// "Verein_v3"): nur diese eine Vorlage.
//
// Screenshots (390×760, Viewport + fullPage, zusätzlich 320×760 für die
// Sichtprüfung "kein horizontales Scrollen") und ein Kontaktbogen landen in
// tools/cache/app-optik/tpl-vorschau/ (gitignored, siehe .gitignore
// "tools/cache/") – nichts davon wird committet. pageerror-Ereignisse
// (unbehandelte JS-Fehler in der Seite) werden gezählt und ausgegeben.

import puppeteer from "puppeteer-core";
import { readFileSync, existsSync, mkdirSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
// Für parallele Entwürfe: Quell- und Zielordner per Umgebung überschreibbar.
const APP_DIR = process.env.TPL_VORSCHAU_APP_DIR ? path.resolve(process.env.TPL_VORSCHAU_APP_DIR) : path.join(ROOT, "assets", "app");
const MOCK_START_PFAD = path.join(ROOT, "tools", "app-optik", "mock-start.json");
const MOCK_WORKSHEETS_PFAD = path.join(ROOT, "tools", "app-optik", "mock-worksheets.json");
const VERGLEICH_PFAD = path.join(ROOT, "docs", "app-konzept", "start.html");
const ZIEL = process.env.TPL_VORSCHAU_ZIEL ? path.resolve(process.env.TPL_VORSCHAU_ZIEL) : path.join(ROOT, "tools", "cache", "app-optik", "tpl-vorschau");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const BREITE = 390;
const HOEHE = 760;
const SCHMAL_BREITE = 320; // Sichtprüfung C1-Gate 5: kein horizontales Scrollen

// userTitle-Werte der fünf C1-Vorlagen (appack setzt das serverseitig aus dem
// Modultitel; für die Vorschau ist der jeweilige sichtbare Seitentitel (h1)
// eine plausible Annahme).
const SEITEN_TITEL = {
  "Verein_v3.tpl": "Verein",
  "Mannschaften_v3.tpl": "Mannschaften",
  "Karneval_v3.tpl": "Karneval",
  "Vorstand_v3.tpl": "Vorstand & Kontakt",
  "Sponsoren_v3.tpl": "Sponsoren & Partner",
  "Geschaeftsstelle_v3.tpl": "Geschäftsstelle & Anfahrt",
  "Ueber-uns_v3.tpl": "Über uns",
};

// ---------- Mini-FreeMarker-Teilmenge ----------
// Unterstützt genau das, was die Vorlagen verwenden: ${…}-Ausgabe,
// [#if]/[#elseif]/[#else]/[/#if], [#list … as x]…[/#list],
// [#assign n = "…"] und die Block-Form [#assign n]…[/#assign]. Die fünf
// C1-Vorlagen nutzen ausschließlich ${userTitle}, also nur den einfachsten
// Zweig (ein einzelnes "output"-Token) – derselbe Renderer wie für
// Startseite_v3.tpl, unverändert.

function tokenisieren(tpl) {
  const tokens = [];
  const re =
    /\[#if\s+([^\]]+)\]|\[#elseif\s+([^\]]+)\]|\[#else\]|\[\/#if\]|\[#list\s+(.+?)\s+as\s+(\w+)\]|\[\/#list\]|\[#assign\s+(\w+)\s*=\s*(.+?)\]|\[#assign\s+(\w+)\]|\[\/#assign\]|\$\{([^}]+)\}/g;
  let letzte = 0;
  let m;
  while ((m = re.exec(tpl)) !== null) {
    if (m.index > letzte) tokens.push({ typ: "text", wert: tpl.slice(letzte, m.index) });
    if (m[1] !== undefined) tokens.push({ typ: "if", bedingung: m[1] });
    else if (m[2] !== undefined) tokens.push({ typ: "elseif", bedingung: m[2] });
    else if (m[0] === "[#else]") tokens.push({ typ: "else" });
    else if (m[0] === "[/#if]") tokens.push({ typ: "endif" });
    else if (m[3] !== undefined) tokens.push({ typ: "list", ausdruck: m[3], variable: m[4] });
    else if (m[0] === "[/#list]") tokens.push({ typ: "endlist" });
    else if (m[5] !== undefined) tokens.push({ typ: "assignEq", name: m[5], ausdruck: m[6] });
    else if (m[7] !== undefined) tokens.push({ typ: "assignBlockStart", name: m[7] });
    else if (m[0] === "[/#assign]") tokens.push({ typ: "assignBlockEnd" });
    else if (m[8] !== undefined) tokens.push({ typ: "output", ausdruck: m[8] });
    letzte = re.lastIndex;
  }
  if (letzte < tpl.length) tokens.push({ typ: "text", wert: tpl.slice(letzte) });
  return tokens;
}

function parsen(tokens) {
  let i = 0;

  function knoten(stopTypen) {
    const liste = [];
    while (i < tokens.length && !stopTypen.includes(tokens[i].typ)) {
      liste.push(einKnoten());
    }
    return liste;
  }

  function einKnoten() {
    const t = tokens[i];
    if (t.typ === "text") { i++; return { typ: "text", wert: t.wert }; }
    if (t.typ === "output") { i++; return { typ: "output", ausdruck: t.ausdruck }; }
    if (t.typ === "if") {
      const zweige = [];
      const bedingung = t.bedingung;
      i++;
      zweige.push({ bedingung, koerper: knoten(["elseif", "else", "endif"]) });
      while (tokens[i] && tokens[i].typ === "elseif") {
        const b = tokens[i].bedingung;
        i++;
        zweige.push({ bedingung: b, koerper: knoten(["elseif", "else", "endif"]) });
      }
      let sonst = null;
      if (tokens[i] && tokens[i].typ === "else") {
        i++;
        sonst = knoten(["endif"]);
      }
      i++; // [/#if]
      return { typ: "if", zweige, sonst };
    }
    if (t.typ === "list") {
      const { ausdruck, variable } = t;
      i++;
      const koerper = knoten(["endlist"]);
      i++; // [/#list]
      return { typ: "list", ausdruck, variable, koerper };
    }
    if (t.typ === "assignEq") { i++; return { typ: "assignEq", name: t.name, ausdruck: t.ausdruck }; }
    if (t.typ === "assignBlockStart") {
      const name = t.name;
      i++;
      const koerper = knoten(["assignBlockEnd"]);
      i++; // [/#assign]
      return { typ: "assignBlock", name, koerper };
    }
    i++;
    return { typ: "text", wert: "" };
  }

  return knoten([]);
}

function hatInhalt(v) {
  if (v === undefined || v === null) return false;
  if (typeof v === "string") return v.length > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return Object.keys(v).length > 0;
  return Boolean(v);
}

function wert(ausdruck, scope) {
  const e = ausdruck.trim();
  if ((e.startsWith('"') && e.endsWith('"')) || (e.startsWith("'") && e.endsWith("'"))) {
    return e.slice(1, -1);
  }
  const listeMatch = e.match(/^db\.loadList\(\s*['"]([^'"]+)['"]\s*\)\.entries$/);
  if (listeMatch) return scope.liste || [];
  let cur = scope;
  for (const teil of e.split(".")) {
    if (cur == null) return undefined;
    cur = cur[teil];
  }
  return cur;
}

function auswerten(ausdruck, scope) {
  const e = ausdruck.trim();
  if (e.startsWith("!")) return !auswerten(e.slice(1), scope);
  const undIdx = e.indexOf("&&");
  if (undIdx !== -1) {
    return Boolean(auswerten(e.slice(0, undIdx), scope)) && Boolean(auswerten(e.slice(undIdx + 2), scope));
  }
  const eqIdx = e.indexOf("==");
  if (eqIdx !== -1) {
    return wert(e.slice(0, eqIdx), scope) === wert(e.slice(eqIdx + 2), scope);
  }
  if (e.endsWith("?has_content")) {
    return hatInhalt(wert(e.slice(0, -"?has_content".length), scope));
  }
  return Boolean(wert(e, scope));
}

function rendern(knoten, scope) {
  let aus = "";
  for (const n of knoten) {
    if (n.typ === "text") { aus += n.wert; continue; }
    if (n.typ === "output") { aus += String(wert(n.ausdruck, scope) ?? ""); continue; }
    if (n.typ === "if") {
      let getroffen = false;
      for (const zweig of n.zweige) {
        if (auswerten(zweig.bedingung, scope)) {
          aus += rendern(zweig.koerper, scope);
          getroffen = true;
          break;
        }
      }
      if (!getroffen && n.sonst) aus += rendern(n.sonst, scope);
      continue;
    }
    if (n.typ === "list") {
      const items = wert(n.ausdruck, scope) || [];
      const hattePrev = Object.prototype.hasOwnProperty.call(scope, n.variable);
      const prev = scope[n.variable];
      for (const item of items) {
        scope[n.variable] = item;
        aus += rendern(n.koerper, scope);
      }
      if (hattePrev) scope[n.variable] = prev; else delete scope[n.variable];
      continue;
    }
    if (n.typ === "assignEq") { scope[n.name] = wert(n.ausdruck, scope); continue; }
    if (n.typ === "assignBlock") { scope[n.name] = rendern(n.koerper, scope).trim(); continue; }
  }
  return aus;
}

function rendereVorlage(tplText, scope) {
  return rendern(parsen(tokenisieren(tplText)), scope);
}

// ---------- Stubs für die appack-cdn-Skripte ----------

function jqueryStub() {
  return `window.jQuery = window.$ = function (sel) { return { slick: function () {} }; };`;
}

function graphApiStub(mockTermine) {
  return `window.graphApi = {
    calendar: {
      listUpcomingCalendarEvents: function (componentId, amount, fields) {
        var termine = ${JSON.stringify(mockTermine)};
        return Promise.resolve({ json: function () { return Promise.resolve({ data: { listUpcomingCalendarEvents: termine } }); } });
      }
    }
  };`;
}

function newsWidgetStub(mockNews) {
  return `document.addEventListener("DOMContentLoaded", function () {
    var news = ${JSON.stringify(mockNews)};
    var widgets = document.querySelectorAll("div[news-widget]");
    for (var w = 0; w < widgets.length; w++) {
      var widget = widgets[w];
      var vorlage = widget.querySelector(".card.mb-3.relative");
      if (!vorlage) continue;
      var limit = Number(widget.getAttribute("limit")) || news.length;
      var maxBodyLength = Number(widget.getAttribute("maxBodyLength"));
      var quelle = widget.getAttribute("sourceTag") === "true";
      var eintraege = news.slice(0, limit);
      var vorlageEltern = vorlage.parentNode;
      vorlage.remove();
      for (var i = 0; i < eintraege.length; i++) {
        var eintrag = eintraege[i];
        var klon = vorlage.cloneNode(true);
        var titel = klon.querySelector(".newsWallTitle");
        var datum = klon.querySelector(".newsWallDate");
        var text = klon.querySelector(".newsWallBody");
        var quelleEl = klon.querySelector(".sourceTag");
        if (titel) titel.textContent = eintrag.title;
        if (datum) datum.textContent = eintrag.datum;
        if (text) {
          var koerper = eintrag.body;
          if (maxBodyLength && koerper.length > maxBodyLength) koerper = koerper.slice(0, maxBodyLength) + " ...";
          text.textContent = koerper;
        }
        if (quelleEl && quelle) {
          quelleEl.textContent = eintrag.quelle;
          quelleEl.style.backgroundColor = "#E4E7FA";
          quelleEl.style.color = "#191793";
        }
        vorlageEltern.appendChild(klon);
      }
    }
  });`;
}

// C1: Workbook.load(options) -> Promise<rows>. mockWorksheets: { [workbookId]: Zeile[] }.
// Unbekannte Workbook-ID -> []. filter: strikter Gleichheitsvergleich je
// angegebenem Feld (deckt { sponActive: true } ab).
function workbookStub(mockWorksheets) {
  return `window.Workbook = {
    load: function (options) {
      var alle = (${JSON.stringify(mockWorksheets)})[(options && options.workbook) || ""] || [];
      var filter = (options && options.filter) || {};
      var schluessel = Object.keys(filter);
      var gefiltert = schluessel.length
        ? alle.filter(function (zeile) {
            for (var i = 0; i < schluessel.length; i++) {
              if (zeile[schluessel[i]] !== filter[schluessel[i]]) return false;
            }
            return true;
          })
        : alle;
      return Promise.resolve(gefiltert);
    }
  };`;
}

// C2: Stub für https://www.fussball.de/widgets.js (Spielplan-App.html, aber
// auch harmlos für alle anderen Vorlagen, falls sie je ein Widget hätten).
// Zeichnet in jeden ".fussballde_widget"-Container eine graue Fläche mit
// Beschriftung des Widget-Typs (data-type) statt das echte iframe zu laden.
function fussballWidgetsStub() {
  return `(function () {
    var els = document.getElementsByClassName("fussballde_widget");
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var typ = el.getAttribute("data-type") || "?";
      el.style.minHeight = "240px";
      el.style.display = "flex";
      el.style.alignItems = "center";
      el.style.justifyContent = "center";
      el.style.background = "#E4E7FA";
      el.style.color = "#191793";
      el.style.fontFamily = "sans-serif";
      el.style.fontSize = "13px";
      el.style.borderRadius = "12px";
      el.textContent = "FUSSBALL.DE-Widget: " + typ;
    }
  })();`;
}

// ---------- Rendern + Screenshot ----------

function warte(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const MOCK_TERMINE = [
  {
    id: "demo-termin-1",
    title: "D3-Jugend · Training",
    dateStart: "2026-09-23T17:30:00+02:00",
    dateEnd: "2026-09-23T19:30:00+02:00",
    subTitle: "Vereinsplatz Mainzer Landstraße 480",
    allDay: false,
    categories: [{ title: "Training", color: "#1F2DBE" }],
  },
  {
    id: "demo-termin-2",
    title: "D2-Jugend bei FC Fortuna Frankfurt",
    dateStart: "2026-09-27T10:30:00+02:00",
    dateEnd: null,
    subTitle: "Gerbermühlstr. 109, 60594 Frankfurt am Main",
    allDay: false,
    categories: [{ title: "Spiel", color: "#1F2DBE" }],
  },
];

const MOCK_NEWS = [
  { title: "Arbeitstag erfolgreich beendet", datum: "19.09.26, 18:00", body: "Der Arbeitseinsatz am Vereinsgelände ist erfolgreich beendet – vielen Dank an alle Helferinnen und Helfer.", quelle: "App-News" },
  { title: "Auswärtssieg der 1. Mannschaft", datum: "13.09.26, 20:00", body: "Die Herren gewinnen ihr Auswärtsspiel und stehen weiter ungeschlagen an der Tabellenspitze.", quelle: "App-News" },
];

async function rendereUndSpeichere(tplPfad, scope, dateiname) {
  const tplText = readFileSync(tplPfad, "utf8");
  const html = rendereVorlage(tplText, scope);
  mkdirSync(ZIEL, { recursive: true });
  const pfad = path.join(ZIEL, dateiname);
  writeFileSync(pfad, html, "utf8");
  return pfad;
}

async function screenshotTpl(browser, htmlPfad, namePräfix, mockWorksheets) {
  const page = await browser.newPage();
  await page.setViewport({ width: BREITE, height: HOEHE });
  await page.setRequestInterception(true);

  const pageErrors = [];
  page.on("pageerror", (err) => pageErrors.push(String(err && err.message ? err.message : err)));
  page.on("console", (msg) => {
    if (msg.type() === "error") pageErrors.push(`console.error: ${msg.text()}`);
  });

  page.on("request", (req) => {
    const url = req.url();
    if (url.includes("cdn.appack.de/modules/common/jquery-3.4.1.min.js")) {
      req.respond({ status: 200, contentType: "application/javascript; charset=utf-8", body: jqueryStub() });
      return;
    }
    if (url.includes("cdn.appack.de/modules/graph-api.js")) {
      req.respond({ status: 200, contentType: "application/javascript; charset=utf-8", body: graphApiStub(MOCK_TERMINE) });
      return;
    }
    if (url.includes("cdn.appack.de/modules/widgets/component-news-widget.js")) {
      req.respond({ status: 200, contentType: "application/javascript; charset=utf-8", body: newsWidgetStub(MOCK_NEWS) });
      return;
    }
    if (url.includes("cdn.appack.de/modules/appack.workbook-1.4.1.js")) {
      req.respond({ status: 200, contentType: "application/javascript; charset=utf-8", body: workbookStub(mockWorksheets) });
      return;
    }
    // 25.09.2026: öffentliche Kalenderabfrage der Startseite (api.appack.de/graphql,
    // listUpcomingCalendarEvents mit dem Embedded-Token). Antwort aus
    // TPL_VORSCHAU_TERMINE=<json> (Form wie die echte Antwort), sonst leer.
    // TPL_VORSCHAU_TERMINE=fehler simuliert einen Ausfall (HTTP 500).
    if (url.startsWith("https://api.appack.de/graphql")) {
      const kopf = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "POST, OPTIONS" };
      if (req.method() === "OPTIONS") { req.respond({ status: 204, headers: kopf, body: "" }); return; }
      const quelle = process.env.TPL_VORSCHAU_TERMINE;
      if (quelle === "fehler") { req.respond({ status: 500, headers: kopf, contentType: "application/json", body: "{}" }); return; }
      const body = quelle && existsSync(quelle) ? readFileSync(quelle, "utf8") : JSON.stringify({ data: { listUpcomingCalendarEvents: [] } });
      req.respond({ status: 200, headers: kopf, contentType: "application/json; charset=utf-8", body });
      return;
    }
    if (url.includes("www.fussball.de/widgets.js")) {
      req.respond({ status: 200, contentType: "application/javascript; charset=utf-8", body: fussballWidgetsStub() });
      return;
    }
    // Webfonts (GitHub Pages) dürfen laden oder offline fehlschlagen – Fallback-Stack greift.
    req.continue();
  });

  try {
    await page.goto(pathToFileURL(htmlPfad).href, { waitUntil: "load", timeout: 30000 });
  } catch (err) {
    console.warn(`  (Ladefehler ${namePräfix}: ${err.message})`);
  }
  // Workbook.load() läuft asynchron (Promise) – etwas länger warten als bei
  // der reinen graph-api/news-widget-Vorschau, damit die DOM-Bausteine der
  // C1-Vorlagen (Karten, Filterpillen) vor dem Screenshot stehen.
  await warte(1200);

  const zielViewport = path.join(ZIEL, `${namePräfix}.png`);
  const zielFull = path.join(ZIEL, `${namePräfix}-full.png`);
  await page.screenshot({ path: zielViewport });
  await page.screenshot({ path: zielFull, fullPage: true });

  // Tippziele messen (generische Auswahl, deckt Bausteine aus v3-basis.css
  // und den seitenspezifischen Stilen ab).
  const selektoren = [
    "#profil-knopf",
    "#registrieren-pille",
    ".zeile",
    ".termin-karte__knoepfe .knopf",
    ".aktionen .knopf",
    ".aktionen .knopf--leise",
    ".news-karte",
    ".icon-knopf",
    ".filter-knopf",
    ".abteilung-karte",
  ];
  const messung = await page.evaluate((sels) => {
    const ergebnis = [];
    for (const sel of sels) {
      const els = Array.from(document.querySelectorAll(sel));
      const sichtbar = els.map((el) => el.getBoundingClientRect()).filter((r) => r.width > 0 && r.height > 0);
      if (sichtbar.length === 0) {
        ergebnis.push({ selektor: sel, anzahl: 0, minBreite: null, minHoehe: null, zuKlein: 0 });
        continue;
      }
      const minBreite = Math.min(...sichtbar.map((r) => r.width));
      const minHoehe = Math.min(...sichtbar.map((r) => r.height));
      const zuKlein = sichtbar.filter((r) => r.width < 44 || r.height < 44).length;
      ergebnis.push({ selektor: sel, anzahl: sichtbar.length, minBreite: Math.round(minBreite), minHoehe: Math.round(minHoehe), zuKlein });
    }
    return ergebnis;
  }, selektoren);

  // Kein horizontales Scrollen bei 320/360/390 prüfen; bei 320 zusätzlich
  // einen Screenshot speichern (C1-Gate 5).
  const breitenErgebnis = [];
  for (const breite of [SCHMAL_BREITE, 360, 390]) {
    await page.setViewport({ width: breite, height: HOEHE });
    await warte(150);
    const scrollBreite = await page.evaluate(() => document.documentElement.scrollWidth);
    breitenErgebnis.push({ breite, scrollBreite, scrolltHorizontal: scrollBreite > breite });
    if (breite === SCHMAL_BREITE) {
      await page.screenshot({ path: path.join(ZIEL, `${namePräfix}-320.png`) });
    }
  }
  await page.setViewport({ width: BREITE, height: HOEHE });

  await page.close();
  return { namePräfix, messung, breitenErgebnis, pageErrors, zielViewport, zielFull };
}

async function screenshotVergleich(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: BREITE, height: HOEHE });
  await page.goto(pathToFileURL(VERGLEICH_PFAD).href, { waitUntil: "load", timeout: 30000 });
  await warte(500);
  const ziel = path.join(ZIEL, "start-konzept-vergleich.png");
  await page.screenshot({ path: ziel });
  await page.close();
  return ziel;
}

async function baueKontaktbogen(browser, bilder) {
  const zeilen = bilder
    .map(({ beschriftung, pfad }) => `
      <figure><img src="${pathToFileURL(pfad).href}" width="${BREITE}" height="${HOEHE}"><figcaption>${beschriftung}</figcaption></figure>`)
    .join("\n");
  const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #eee; font-family: sans-serif; display: flex; flex-wrap: wrap; gap: 16px; padding: 16px; }
    figure { margin: 0; }
    figure img { display: block; width: ${BREITE}px; height: ${HOEHE}px; object-fit: cover; border: 1px solid #999; }
    figcaption { text-align: center; font-size: 12px; padding-top: 4px; }
  </style></head><body>${zeilen}</body></html>`;
  const htmlPfad = path.join(ZIEL, "_vergleich.html");
  writeFileSync(htmlPfad, html, "utf8");
  const page = await browser.newPage();
  const spaltenBreite = BREITE + 24;
  const reihen = Math.ceil(bilder.length / 3);
  await page.setViewport({ width: Math.min(bilder.length, 3) * spaltenBreite + 40, height: reihen * (HOEHE + 60) + 40 });
  await page.goto(pathToFileURL(htmlPfad).href, { waitUntil: "load" });
  await warte(300);
  const ziel = path.join(ZIEL, "vergleich.png");
  await page.screenshot({ path: ziel, fullPage: true });
  await page.close();
  console.log(`Kontaktbogen: ${path.relative(ROOT, ziel)}`);
  return ziel;
}

function druckeMesstabelle(ergebnisse) {
  console.log("\nTippziele (Breite/Höhe in px, Ziel ≥44):");
  console.log("Variante | Selektor | Anzahl | min. Breite | min. Höhe | zu klein");
  for (const e of ergebnisse) {
    for (const m of e.messung) {
      if (m.anzahl === 0) continue;
      console.log(`${e.namePräfix} | ${m.selektor} | ${m.anzahl} | ${m.minBreite ?? "-"} | ${m.minHoehe ?? "-"} | ${m.zuKlein}`);
    }
    for (const b of e.breitenErgebnis) {
      console.log(`${e.namePräfix} | (Breite ${b.breite}px) scrollWidth=${b.scrollBreite} horizontal=${b.scrolltHorizontal ? "JA" : "nein"}`);
    }
    console.log(`${e.namePräfix} | pageerror=${e.pageErrors.length}${e.pageErrors.length ? " -> " + e.pageErrors.join(" | ") : ""}`);
  }
}

// ---------- Startseite_v3.tpl (B1) – bestehendes Verhalten, unverändert ----------

async function renderStartseite(browser, ergebnisse, bilderFuerKontaktbogen, mockWorksheets) {
  const tplPfad = path.join(APP_DIR, "Startseite_v3.tpl");
  if (!existsSync(tplPfad)) {
    console.warn("  Startseite_v3.tpl fehlt, übersprungen.");
    return;
  }
  const mock = JSON.parse(readFileSync(MOCK_START_PFAD, "utf8"));

  const scopeAngemeldet = {
    userTitle: mock.userTitle,
    profile_json: JSON.stringify(mock.profile),
    liste: mock.liste,
  };
  const scopeGast = {
    userTitle: mock.userTitle,
    profile_json: "",
    liste: mock.liste,
  };

  const htmlAngemeldet = await rendereUndSpeichere(tplPfad, scopeAngemeldet, "_start-v3-angemeldet.html");
  const htmlGast = await rendereUndSpeichere(tplPfad, scopeGast, "_start-v3-gast.html");

  console.log("Rendere Startseite_v3.tpl (angemeldet) …");
  const eAngemeldet = await screenshotTpl(browser, htmlAngemeldet, "start-v3", mockWorksheets || {});
  ergebnisse.push(eAngemeldet);
  bilderFuerKontaktbogen.push({ beschriftung: "Startseite_v3.tpl (angemeldet)", pfad: eAngemeldet.zielViewport });

  console.log("Rendere Startseite_v3.tpl (Gast) …");
  const eGast = await screenshotTpl(browser, htmlGast, "start-v3-gast", mockWorksheets || {});
  ergebnisse.push(eGast);
  bilderFuerKontaktbogen.push({ beschriftung: "Startseite_v3.tpl (Gast)", pfad: eGast.zielViewport });

  if (existsSync(VERGLEICH_PFAD)) {
    console.log("Screenshot Klick-Prototyp (docs/app-konzept/start.html) …");
    const vergleichBild = await screenshotVergleich(browser);
    bilderFuerKontaktbogen.push({ beschriftung: "Klick-Prototyp start.html", pfad: vergleichBild });
  }
}

// ---------- C1: die fünf Vereinsseiten ----------

async function renderVereinsseite(browser, dateiname, mockWorksheets, ergebnisse, bilderFuerKontaktbogen) {
  const tplPfad = path.join(APP_DIR, dateiname);
  const namePräfix = dateiname.replace(/\.tpl$/, "").toLowerCase();
  const scope = { userTitle: SEITEN_TITEL[dateiname] || dateiname };

  const htmlPfad = await rendereUndSpeichere(tplPfad, scope, `_${namePräfix}.html`);
  console.log(`Rendere ${dateiname} …`);
  const ergebnis = await screenshotTpl(browser, htmlPfad, namePräfix, mockWorksheets);
  ergebnisse.push(ergebnis);
  bilderFuerKontaktbogen.push({ beschriftung: dateiname, pfad: ergebnis.zielViewport });
}

// ---------- C2: Spielplan-App.html (statisch, kein FreeMarker) ----------

async function renderSpielplanApp(browser, ergebnisse, bilderFuerKontaktbogen) {
  const quellPfad = path.join(APP_DIR, "Spielplan-App.html");
  if (!existsSync(quellPfad)) {
    console.warn("  Spielplan-App.html fehlt, übersprungen.");
    return;
  }
  mkdirSync(ZIEL, { recursive: true });
  // Kein FreeMarker in dieser Datei (statische Seite) – 1:1 kopieren.
  const inhalt = readFileSync(quellPfad, "utf8");
  const htmlPfad = path.join(ZIEL, "_spielplan-app.html");
  writeFileSync(htmlPfad, inhalt, "utf8");

  console.log("Rendere Spielplan-App.html …");
  const ergebnis = await screenshotTpl(browser, htmlPfad, "spielplan-app", {});
  ergebnisse.push(ergebnis);
  bilderFuerKontaktbogen.push({ beschriftung: "Spielplan-App.html (Herren)", pfad: ergebnis.zielViewport });
}

// ---------- Hauptablauf ----------

async function main() {
  if (!existsSync(APP_DIR)) throw new Error(`Ordner fehlt: ${APP_DIR}`);
  const mockWorksheets = existsSync(MOCK_WORKSHEETS_PFAD) ? JSON.parse(readFileSync(MOCK_WORKSHEETS_PFAD, "utf8")) : {};
  // 24.09.2026: echte Worksheet-Zeilen (z. B. Sponsoren fürs Laufband der
  // Startseite) per TPL_VORSCHAU_WORKSHEETS=<json> über die Mocks legen
  // (gleiche Schlüssel = Workbook-ID ersetzen). Datei liegt in tools/cache/.
  if (process.env.TPL_VORSCHAU_WORKSHEETS) {
    Object.assign(mockWorksheets, JSON.parse(readFileSync(path.resolve(process.env.TPL_VORSCHAU_WORKSHEETS), "utf8")));
  }
  mkdirSync(ZIEL, { recursive: true });

  const arg = process.argv[2];
  const alleTplDateien = readdirSync(APP_DIR).filter((d) => d.endsWith("_v3.tpl")).sort();
  const tplDateien = arg ? alleTplDateien.filter((d) => d === `${arg}.tpl`) : alleTplDateien;
  const spielplanAppMitrendern = !arg || arg === "Spielplan-App";
  if (!tplDateien.length && !spielplanAppMitrendern) {
    throw new Error(`Keine Vorlage gefunden für Argument "${arg}" (erwartet z. B. "Verein_v3")`);
  }

  const ergebnisse = [];
  const bilderFuerKontaktbogen = [];

  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  try {
    for (const dateiname of tplDateien) {
      if (dateiname === "Startseite_v3.tpl") {
        await renderStartseite(browser, ergebnisse, bilderFuerKontaktbogen, mockWorksheets);
      } else {
        await renderVereinsseite(browser, dateiname, mockWorksheets, ergebnisse, bilderFuerKontaktbogen);
      }
    }
    if (spielplanAppMitrendern) {
      await renderSpielplanApp(browser, ergebnisse, bilderFuerKontaktbogen);
    }
    await baueKontaktbogen(browser, bilderFuerKontaktbogen);
  } finally {
    await browser.close();
  }

  druckeMesstabelle(ergebnisse);

  const tabellenText = ergebnisse
    .flatMap((e) => e.messung.filter((m) => m.anzahl > 0).map((m) => `${e.namePräfix}\t${m.selektor}\t${m.anzahl}\t${m.minBreite ?? "-"}\t${m.minHoehe ?? "-"}\t${m.zuKlein}`))
    .join("\n");
  writeFileSync(path.join(ZIEL, "tippziele.tsv"), `variante\tselektor\tanzahl\tminBreite\tminHoehe\tzuKlein\n${tabellenText}\n`, "utf8");

  const gesamtFehler = ergebnisse.reduce((summe, e) => summe + e.pageErrors.length, 0);
  console.log(`\nFertig. ${ergebnisse.length} Vorlage(n) gerendert, pageerror gesamt: ${gesamtFehler}.`);
  console.log(`Screenshots + Kontaktbogen liegen in ${path.relative(ROOT, ZIEL)}/`);
  if (gesamtFehler > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
