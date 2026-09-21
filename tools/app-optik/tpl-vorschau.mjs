#!/usr/bin/env node
// Speuzer Website Prototyp – B1 App-Startseite: lokale Vorschau von
// assets/app/Startseite_v3.tpl ohne appack.
//
// (a) Rendert die appack-FreeMarker-Teilmenge, die diese eine Vorlage
//     tatsächlich benutzt ([#if x?has_content]…[#else]…[/#if], ${…},
//     [#list … as entry]…[/#list], [#assign …]) gegen Mock-Daten aus
//     mock-start.json. Kein allgemeiner FreeMarker-Interpreter – nur die
//     Konstrukte, die in Startseite_v3.tpl vorkommen.
// (b) Ersetzt die drei appack-cdn-Skripte (jquery, graph-api.js,
//     component-news-widget.js) per Puppeteer-Request-Interception durch
//     lokale Stubs: der Kalender liefert zwei feste Mock-Termine, das
//     News-Widget füllt die Karten-Vorlage im Dokument mit zwei festen
//     Mock-Meldungen. `App` bleibt bewusst undefiniert (Browser-Fallback,
//     siehe Vorlage).
//
// Screenshots (390×760, Viewport + fullPage) und ein Kontaktbogen landen
// in tools/cache/app-optik/tpl-vorschau/ (gitignored, siehe .gitignore
// "tools/cache/") – nichts davon wird committet.

import puppeteer from "puppeteer-core";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const TPL_PFAD = path.join(ROOT, "assets", "app", "Startseite_v3.tpl");
const MOCK_PFAD = path.join(ROOT, "tools", "app-optik", "mock-start.json");
const VERGLEICH_PFAD = path.join(ROOT, "docs", "app-konzept", "start.html");
const ZIEL = path.join(ROOT, "tools", "cache", "app-optik", "tpl-vorschau");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const BREITE = 390;
const HOEHE = 760;

// ---------- Mini-FreeMarker-Teilmenge ----------
// Unterstützt genau das, was Startseite_v3.tpl verwendet: ${…}-Ausgabe,
// [#if]/[#elseif]/[#else]/[/#if], [#list … as x]…[/#list],
// [#assign n = "…"] und die Block-Form [#assign n]…[/#assign].

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

async function rendereUndSpeichere(scope, dateiname) {
  const tplText = readFileSync(TPL_PFAD, "utf8");
  const html = rendereVorlage(tplText, scope);
  mkdirSync(ZIEL, { recursive: true });
  const pfad = path.join(ZIEL, dateiname);
  writeFileSync(pfad, html, "utf8");
  return pfad;
}

async function screenshotTpl(browser, htmlPfad, namePräfix) {
  const page = await browser.newPage();
  await page.setViewport({ width: BREITE, height: HOEHE });
  await page.setRequestInterception(true);

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
    // Webfonts (GitHub Pages) dürfen laden oder offline fehlschlagen – Fallback-Stack greift.
    req.continue();
  });

  try {
    await page.goto(pathToFileURL(htmlPfad).href, { waitUntil: "load", timeout: 30000 });
  } catch (err) {
    console.warn(`  (Ladefehler ${namePräfix}: ${err.message})`);
  }
  await warte(800);

  const zielViewport = path.join(ZIEL, `${namePräfix}.png`);
  const zielFull = path.join(ZIEL, `${namePräfix}-full.png`);
  await page.screenshot({ path: zielViewport });
  await page.screenshot({ path: zielFull, fullPage: true });

  // Schritt 3: Tippziele messen.
  const selektoren = [
    "#profil-knopf",
    "#registrieren-pille",
    ".zeile",
    ".termin-karte__knoepfe .knopf",
    ".aktionen .knopf",
    ".aktionen .knopf--leise",
    ".news-karte",
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

  // Kein horizontales Scrollen bei 360/390 prüfen (Schritt 3).
  const breitenErgebnis = [];
  for (const breite of [360, 390]) {
    await page.setViewport({ width: breite, height: HOEHE });
    await warte(150);
    const scrollBreite = await page.evaluate(() => document.documentElement.scrollWidth);
    breitenErgebnis.push({ breite, scrollBreite, scrolltHorizontal: scrollBreite > breite });
  }
  await page.setViewport({ width: BREITE, height: HOEHE });

  await page.close();
  return { namePräfix, messung, breitenErgebnis, zielViewport, zielFull };
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
    body { margin: 0; background: #eee; font-family: sans-serif; display: flex; gap: 16px; padding: 16px; }
    figure { margin: 0; }
    figure img { display: block; width: ${BREITE}px; height: ${HOEHE}px; object-fit: cover; border: 1px solid #999; }
    figcaption { text-align: center; font-size: 12px; padding-top: 4px; }
  </style></head><body>${zeilen}</body></html>`;
  const htmlPfad = path.join(ZIEL, "_vergleich.html");
  writeFileSync(htmlPfad, html, "utf8");
  const page = await browser.newPage();
  await page.setViewport({ width: BREITE * bilder.length + 80, height: HOEHE + 60 });
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
      console.log(`${e.namePräfix} | ${m.selektor} | ${m.anzahl} | ${m.minBreite ?? "-"} | ${m.minHoehe ?? "-"} | ${m.zuKlein}`);
    }
    for (const b of e.breitenErgebnis) {
      console.log(`${e.namePräfix} | (Breite ${b.breite}px) scrollWidth=${b.scrollBreite} horizontal=${b.scrolltHorizontal ? "JA" : "nein"}`);
    }
  }
}

async function main() {
  if (!existsSync(TPL_PFAD)) throw new Error(`Vorlage fehlt: ${TPL_PFAD}`);
  const mock = JSON.parse(readFileSync(MOCK_PFAD, "utf8"));
  mkdirSync(ZIEL, { recursive: true });

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

  const htmlAngemeldet = await rendereUndSpeichere(scopeAngemeldet, "_start-v3-angemeldet.html");
  const htmlGast = await rendereUndSpeichere(scopeGast, "_start-v3-gast.html");

  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  const ergebnisse = [];
  try {
    console.log("Rendere Startseite_v3.tpl (angemeldet) …");
    ergebnisse.push(await screenshotTpl(browser, htmlAngemeldet, "start-v3"));
    console.log("Rendere Startseite_v3.tpl (Gast) …");
    ergebnisse.push(await screenshotTpl(browser, htmlGast, "start-v3-gast"));
    console.log("Screenshot Klick-Prototyp (docs/app-konzept/start.html) …");
    const vergleichBild = await screenshotVergleich(browser);
    await baueKontaktbogen(browser, [
      { beschriftung: "Startseite_v3.tpl (angemeldet)", pfad: ergebnisse[0].zielViewport },
      { beschriftung: "Startseite_v3.tpl (Gast)", pfad: ergebnisse[1].zielViewport },
      { beschriftung: "Klick-Prototyp start.html", pfad: vergleichBild },
    ]);
  } finally {
    await browser.close();
  }

  druckeMesstabelle(ergebnisse);

  const tabellenText = ergebnisse
    .flatMap((e) => e.messung.map((m) => `${e.namePräfix}\t${m.selektor}\t${m.anzahl}\t${m.minBreite ?? "-"}\t${m.minHoehe ?? "-"}\t${m.zuKlein}`))
    .join("\n");
  writeFileSync(path.join(ZIEL, "tippziele.tsv"), `variante\tselektor\tanzahl\tminBreite\tminHoehe\tzuKlein\n${tabellenText}\n`, "utf8");

  console.log(`\nFertig. Screenshots + Kontaktbogen liegen in ${path.relative(ROOT, ZIEL)}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
