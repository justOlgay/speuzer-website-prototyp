#!/usr/bin/env node
// Browser-Test der Bestellseite „Bestellung für dein Team“ (Arbeitspaket AP-1, Kriterium 6 und 7).
//
// Baut nicht selbst: Zuerst bauen (npm run build). Der Test startet einen kleinen statischen Server auf einer Kopie der
// nötigen Dateien aus docs/ (freier Port, nie 4173, siehe testserver.mjs) und steuert Chrome (puppeteer-core, headless).
// Jeder Ablauf läuft in einem eigenen Browser-Kontext (eigener Speicher). Es gehen keine Anfragen ins Netz; ein Klick auf
// den mailto-Link wird abgefangen (nichts öffnet ein Mailprogramm, nichts wird gesendet).
//
// Geprüft wird:
//   - statisch: nicht in der Sitemap, nicht im appack-Paket, noindex, Konfiguration und Verweise im gebauten HTML
//   - 390 x 844: leere Seite, Klick auf „Senden“ ohne Pflichtangaben (Lückenliste, Fokus auf die erste, kein mailto),
//     die Referenzbestellung (a) nur über die Oberfläche (tippen, auswählen, klicken) gegen den erwarteten Text aus faelle.mjs
//     (Betreff, Text in „Mail ansehen“, mailto-Link), Senden (mailto abgefangen, Meldung, Bestell-Nr. bleibt), Text kopieren,
//     Neuladen (Entwurf bleibt), „Neue Bestellung beginnen“ (Rückfrage, Entwurf leer, Absender bleibt), die Fälle (b) und (c)
//   - Größen und Vorauswahl (Winterjacke ab 128, Stutzen, eigene Wahl), Initialen, Teambedarf, Bezahlung, Tastatur
//   - lange Bestellung (Hinweis, mailto nie gekürzt), Zwischenablage mit und ohne Rückfall
//   - localStorage wirft Fehler (setItem, getItem, Zugriff selbst) und kaputte gespeicherte Daten: die Seite funktioniert
//   - kein waagrechtes Scrollen bei 390 px, keine Konsolenfehler, Tippflächen mindestens 44 px, axe-core ohne Verstöße
//   - ein Durchlauf bei 1440 x 900 (Spalte höchstens 720 px)
//   - Bildschirmfotos nach tools/cache/bestellung-test/ (390-leer, 390-ausgefuellt, 390-luecken, 390-gesendet, 1440-ausgefuellt)
//
// Aufruf: node tools/bestellung-test/e2e.mjs
// Ausgabe: eine Zeile je Fehler (sonst nur die Abschnitte), am Ende die Zusammenfassung; Exit 0 nur, wenn alles bestanden ist.

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";
import { DOCS, starteTestserver } from "./testserver.mjs";
import { FAELLE, FALL_A, FALL_B, FALL_C, GRUNDAUSSTATTUNG, KONFIG, bestellung, person } from "./faelle.mjs";
import { kopierText } from "../../assets/js/bestellung/mailtext.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const AXE = readFileSync(path.join(ROOT, "node_modules", "axe-core", "axe.min.js"), "utf8");
const AUSGABE = path.join(ROOT, "tools", "cache", "bestellung-test");
const AUSFUEHRLICH = process.argv.includes("--ausfuehrlich");

const SCHLUESSEL_ENTWURF = "speuzer-bestellung-v1-entwurf";
const SCHLUESSEL_ABSENDER = "speuzer-bestellung-v1-absender";

const TEXT_GESENDET =
  "Dein Mailprogramm öffnet sich mit der fertigen Mail. Tippe dort auf „Senden“. Öffnet sich nichts? Dann „Text kopieren“ und an Bestellungen@sportfreunde04.de schicken.";
const TEXT_LANG = "Die Bestellung ist lang. Falls in der Mail etwas fehlt: „Text kopieren“ und einfügen.";

// ---------- Prüfgerüst ----------

let anzahl = 0;
const fehler = [];

function pruefe(name, bedingung, detail = "") {
  anzahl += 1;
  if (bedingung) {
    if (AUSFUEHRLICH) console.log("  ok      " + name);
    return;
  }
  fehler.push(name);
  console.log("  FEHLER  " + name + (detail ? "\n          " + String(detail).slice(0, 900) : ""));
}

function gleich(name, ist, soll) {
  if (ist === soll) return pruefe(name, true);
  let detail = `ist ${JSON.stringify(ist)}\n          soll ${JSON.stringify(soll)}`;
  if (typeof ist === "string" && typeof soll === "string" && (ist.includes("\n") || soll.includes("\n"))) {
    const a = ist.split("\n");
    const b = soll.split("\n");
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      if (a[i] !== b[i]) {
        detail = `Zeile ${i + 1}:\n          ist  «${a[i] === undefined ? "(fehlt)" : a[i]}»\n          soll «${b[i] === undefined ? "(fehlt)" : b[i]}»`;
        break;
      }
    }
  }
  pruefe(name, false, detail);
}

function abschnitt(titel) {
  console.log("\n" + titel);
}

const warte = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------- Browser, Seite, Protokoll ----------

// Läuft vor jedem Skript der Seite: Klicks auf mailto-Links werden aufgezeichnet und abgefangen. Wurde der Klick von der Seite
// selbst abgebrochen (Lücken), kommt er hier nicht an; sonst wäre es der Klick, der das Mailprogramm öffnet.
function abfangMailto() {
  window.__mailto = [];
  document.addEventListener("click", (e) => {
    const a = e.target instanceof Element ? e.target.closest('a[href^="mailto:"]') : null;
    if (a && !e.defaultPrevented) {
      window.__mailto.push(a.href);
      e.preventDefault();
    }
  });
}

// Feste Uhr: new Date() ohne Angaben und Date.now() liefern immer diesen Zeitpunkt (Ortszeit des Browsers)
function festeUhr(jahr, monat, tag, stunde, minute) {
  const Echt = Date;
  const fest = new Echt(jahr, monat, tag, stunde, minute).getTime();
  class FesteZeit extends Echt {
    constructor(...a) {
      if (a.length === 0) super(fest);
      else super(...a);
    }
    static now() {
      return fest;
    }
  }
  window.Date = FesteZeit;
}

function speicherWirft() {
  const werfen = () => {
    throw new DOMException("Speicher gesperrt", "SecurityError");
  };
  Storage.prototype.setItem = werfen;
  Storage.prototype.getItem = werfen;
  Storage.prototype.removeItem = werfen;
}

function speicherZugriffWirft() {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    get() {
      throw new DOMException("Speicher gesperrt", "SecurityError");
    },
  });
}

// Zwischenablage ohne navigator.clipboard.writeText (lehnt ab); document.execCommand("copy") merkt sich den markierten Text
function zwischenablageRueckfall(erfolg) {
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: () => Promise.reject(new Error("abgelehnt")) } });
  document.execCommand = (befehl) => {
    window.__kopiert = document.activeElement && "value" in document.activeElement ? document.activeElement.value : "";
    return befehl === "copy" && erfolg;
  };
}

async function oeffne(browser, server, opt = {}) {
  const { breite = 390, hoehe = 844, mobil = true, uhr = null, speicher = "normal", zwischenablage = "echt", dialogAntwort = true } = opt;
  const kontext = await browser.createBrowserContext();
  await kontext.overridePermissions(server.basis, ["clipboard-read", "clipboard-write"]);
  const page = await kontext.newPage();
  const p = { konsole: [], seitenfehler: [], anfragen: [], fehlgeschlagen: [], dialoge: [], dialogAntwort };
  page.on("console", (m) => {
    if (m.type() === "error") p.konsole.push(m.text());
  });
  page.on("pageerror", (e) => p.seitenfehler.push(String((e && e.message) || e)));
  page.on("request", (r) => p.anfragen.push(r.url()));
  page.on("requestfailed", (r) => p.fehlgeschlagen.push(r.url() + " " + ((r.failure() || {}).errorText || "")));
  page.on("response", (r) => {
    if (r.status() >= 400) p.fehlgeschlagen.push(r.url() + " HTTP " + r.status());
  });
  page.on("dialog", async (d) => {
    p.dialoge.push({ art: d.type(), text: d.message() });
    if (p.dialogAntwort) await d.accept();
    else await d.dismiss();
  });
  await page.setViewport({ width: breite, height: hoehe, deviceScaleFactor: 1, isMobile: mobil, hasTouch: mobil });
  await page.evaluateOnNewDocument(abfangMailto);
  if (uhr) await page.evaluateOnNewDocument(festeUhr, ...uhr);
  if (speicher === "wirft") await page.evaluateOnNewDocument(speicherWirft);
  if (speicher === "zugriff") await page.evaluateOnNewDocument(speicherZugriffWirft);
  if (zwischenablage === "rueckfall") await page.evaluateOnNewDocument(zwischenablageRueckfall, true);
  if (zwischenablage === "nichts") await page.evaluateOnNewDocument(zwischenablageRueckfall, false);
  await lade(page, server);
  return { page, p, schliessen: () => kontext.close() };
}

async function lade(page, server) {
  await page.goto(server.seite, { waitUntil: "networkidle0" });
  await page.waitForSelector("#bestellung[data-bereit]");
}

// Am Ende jedes Ablaufs: keine Konsolenfehler, keine Fehler im Skript, keine fehlgeschlagenen Anfragen, nichts außerhalb des Testservers
function pruefeProtokoll(name, p, server) {
  gleich(`${name}: keine Konsolenfehler`, p.konsole.join(" | "), "");
  gleich(`${name}: keine Fehler im Skript der Seite`, p.seitenfehler.join(" | "), "");
  gleich(`${name}: keine fehlgeschlagenen Anfragen`, p.fehlgeschlagen.join(" | "), "");
  const fremd = p.anfragen.filter((u) => !u.startsWith(server.basis + "/") && !u.startsWith("data:") && !u.startsWith("about:"));
  gleich(`${name}: keine Anfrage außerhalb des Testservers`, fremd.join(" | "), "");
}

// ---------- Eingaben und Messwerte ----------

const wert = (page, auswahl) => page.$eval(auswahl, (el) => el.value);
const inhalt = (page, auswahl) => page.$eval(auswahl, (el) => el.textContent.trim());
const sichtbar = (page, auswahl) =>
  page.$eval(auswahl, (el) => !el.hidden && el.getClientRects().length > 0).catch(() => false);
const gesendet = (page) => page.evaluate(() => window.__mailto.slice());

// Tippt in ein Feld; mit ersetzen wird der bisherige Inhalt vorher markiert und gelöscht (wie Alles markieren, Entfernen)
async function tippe(page, auswahl, text, ersetzen = false) {
  if (ersetzen) {
    await page.$eval(auswahl, (el) => {
      el.focus();
      el.select();
    });
    await page.keyboard.press("Backspace");
  }
  if (text) await page.type(auswahl, text);
}

// Datum eintippen: Die Reihenfolge der Teile (Tag, Monat, Jahr) hängt vom Browser ab, die Ziffern werden in dieser Reihenfolge getippt
async function setzeDatum(page, auswahl, iso) {
  const [jahr, monat, tag] = iso.split("-");
  const reihenfolge = await page.evaluate(() =>
    new Intl.DateTimeFormat(navigator.language, { year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(new Date(2026, 10, 25))
      .filter((t) => t.type !== "literal")
      .map((t) => t.type)
  );
  await page.focus(auswahl);
  await page.keyboard.type(reihenfolge.map((t) => ({ year: jahr, month: monat, day: tag })[t]).join(""));
  gleich(`Datum „${iso}“ getippt`, await wert(page, auswahl), iso);
}

// Die ganze Bestellung eines Falls (faelle.mjs) über die Oberfläche eingeben: tippen, auswählen, klicken
async function fuelleFall(page, fall) {
  const b = fall.bestellung;
  await page.select("#bst-team", b.team);
  await tippe(page, "#bst-name", b.name);
  if (b.tel) await tippe(page, "#bst-tel", b.tel);
  if (b.bis) await setzeDatum(page, "#bst-bis", b.bis);
  for (let i = 0; i < b.personen.length; i++) {
    const p = b.personen[i];
    await page.click("#bst-person-neu");
    const karte = `#bst-personen > article:nth-of-type(${i + 1})`;
    await tippe(page, `${karte} [data-p="name"]`, p.name);
    if (p.nummer) await tippe(page, `${karte} [data-p="nummer"]`, p.nummer);
    await page.select(`${karte} [data-p="groesse"]`, p.groesse);
    const schnell = fall.ui && fall.ui.personen[i] && fall.ui.personen[i].schnellwahl;
    if (schnell) await page.click(`${karte} [data-schnellwahl="${schnell}"]`);
    for (const a of KONFIG.artikel) {
      const haken = `${karte} [data-artikel="${a.id}"] [data-a="an"]`;
      const soll = !!p.artikel[a.id];
      if (soll !== (await page.$eval(haken, (el) => el.checked))) await page.click(haken);
      if (soll && p.artikel[a.id].groesse) await page.select(`${karte} [data-artikel="${a.id}"] [data-a="groesse"]`, p.artikel[a.id].groesse);
    }
    if (p.initialen !== null) await tippe(page, `${karte} [data-a="initialen"]`, p.initialen, true);
  }
  for (const [id, e] of Object.entries(b.teambedarf)) {
    const zeile = `[data-teamposten="${id}"]`;
    if (e.n >= 5) {
      await tippe(page, `${zeile} [data-n]`, String(e.n), true);
    } else {
      for (let k = 0; k < e.n; k++) await page.click(`${zeile} [data-schritt="1"]`);
    }
    if (e.details) await page.type(`${zeile} [data-details]`, e.details);
  }
  if (b.sonstiges) await page.type("#bst-sonstiges", b.sonstiges);
  for (const block of ["kleidung", "teambedarf"]) {
    const wahl = b.bezahlung[block];
    if (!wahl) continue;
    await page.click(`[data-bezahlung="${block}"] input[value="${wahl}"]`);
    const sponsor = b.bezahlung[block + "Sponsor"];
    if (sponsor) await tippe(page, `#bst-sponsor-${block}`, sponsor);
  }
  if (b.hinweisBezahlung) await page.type("#bst-hinweis-bezahlung", b.hinweisBezahlung);
  if (b.hinweis) await page.type("#bst-hinweis", b.hinweis);
}

function dekodiere(mailto) {
  const teile = mailto.slice(mailto.indexOf("?") + 1).split("&");
  const body = decodeURIComponent(teile[1].slice("body=".length));
  return {
    adresse: mailto.slice("mailto:".length, mailto.indexOf("?")),
    betreff: decodeURIComponent(teile[0].slice("subject=".length)),
    roh: body,
    text: body.replace(/\r\n/g, "\n"),
  };
}

// Vergleicht die Seite mit dem erwarteten Fall: Betreff, Text in „Mail ansehen“, mailto-Link im DOM
async function pruefeMail(page, name, fall) {
  gleich(`${name}: Text in „Mail ansehen“`, await wert(page, "[data-bst-vorschau-text]"), fall.text);
  gleich(`${name}: Betreff in „Mail ansehen“`, await inhalt(page, "[data-bst-betreff]"), fall.betreff);
  const mailto = await page.$eval("#bst-senden", (el) => el.dataset.mailto || "");
  pruefe(`${name}: mailto-Link im DOM (data-mailto)`, mailto.startsWith("mailto:"), mailto);
  if (!mailto) return;
  const d = dekodiere(mailto);
  gleich(`${name}: mailto-Link: Adresse`, d.adresse, "Bestellungen@sportfreunde04.de");
  gleich(`${name}: mailto-Link: Betreff`, d.betreff, fall.betreff);
  gleich(`${name}: mailto-Link: Text`, d.text, fall.text);
  pruefe(`${name}: mailto-Link: Zeilenumbrüche als \\r\\n`, !/(?<!\r)\n/.test(d.roh) && mailto.includes("%0D%0A") && !/(?<!%0D)%0A/.test(mailto));
  gleich(`${name}: href des Sendelinks = data-mailto`, await page.$eval("#bst-senden", (el) => el.getAttribute("href")), mailto);
}

// ---------- Messungen: Layout, Tippflächen, axe ----------

async function pruefeLayout(page, name, breite) {
  const w = await page.evaluate(() => ({ scroll: document.scrollingElement.scrollWidth, innen: window.innerWidth }));
  pruefe(`${name}: kein waagrechtes Scrollen (scrollWidth ${w.scroll} ≤ ${breite})`, w.scroll <= breite && w.scroll <= w.innen, `scrollWidth ${w.scroll}, innerWidth ${w.innen}`);
}

async function pruefeTippflaechen(page, name) {
  const klein = await page.evaluate(() => {
    const liste = [];
    for (const el of document.querySelectorAll("a, button, input, select, textarea, summary")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      if (el.tagName === "INPUT" && (el.type === "checkbox" || el.type === "radio")) {
        const label = el.labels && el.labels[0];
        if (label && label.getBoundingClientRect().height >= 44) continue;
      }
      if (r.height < 43.5 || r.width < 43.5) {
        liste.push(`${el.tagName.toLowerCase()} „${(el.textContent || el.getAttribute("aria-label") || el.id || "").trim().slice(0, 30)}“ ${Math.round(r.width)}×${Math.round(r.height)}`);
      }
    }
    return liste;
  });
  gleich(`${name}: alle Tippflächen mindestens 44 px`, klein.join(" | "), "");
}

async function pruefeIds(page, name) {
  const doppelt = await page.evaluate(() => {
    const gesehen = new Set();
    const doppelte = new Set();
    for (const el of document.querySelectorAll("[id]")) (gesehen.has(el.id) ? doppelte : gesehen).add(el.id);
    const ohneZiel = [];
    for (const l of document.querySelectorAll("label[for]")) if (!document.getElementById(l.getAttribute("for"))) ohneZiel.push(l.getAttribute("for"));
    for (const el of document.querySelectorAll("[aria-labelledby], [aria-describedby]")) {
      for (const id of (el.getAttribute("aria-labelledby") || el.getAttribute("aria-describedby")).split(/\s+/)) if (!document.getElementById(id)) ohneZiel.push(id);
    }
    return [...doppelte].map((i) => "doppelt: " + i).concat(ohneZiel.map((i) => "ohne Ziel: " + i));
  });
  gleich(`${name}: keine doppelte id, jede Beschriftung und jeder Verweis (for, aria-…) hat sein Ziel`, doppelt.join(", "), "");
}

async function pruefeBeschriftungen(page, name) {
  const ohne = await page.evaluate(() => {
    const liste = [];
    for (const el of document.querySelectorAll("input:not([type=hidden]), select, textarea")) {
      if (el.getClientRects().length === 0) continue;
      const hatLabel = (el.labels && el.labels.length > 0) || el.getAttribute("aria-label") || el.getAttribute("aria-labelledby");
      if (!hatLabel) liste.push(el.tagName.toLowerCase() + (el.id ? "#" + el.id : ""));
    }
    return liste;
  });
  gleich(`${name}: jedes sichtbare Feld hat eine Beschriftung`, ohne.join(", "), "");
}

async function pruefeAxe(page, name) {
  await page.evaluate(AXE);
  const ergebnis = await page.evaluate(() => window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] } }));
  const text = ergebnis.violations.map((v) => `[${v.id}] ${v.help} (${v.nodes.length}×): ${v.nodes.slice(0, 2).map((n) => n.target.join(" ")).join("; ")}`).join("\n          ");
  gleich(`${name}: axe-core (WCAG 2 A und AA) ohne Verstöße`, text, "");
}

// ---------- Bildschirmfotos ----------

async function foto(page, datei) {
  await page.screenshot({ path: path.join(AUSGABE, datei), fullPage: true });
}

// Dazu Streifen von 1000 px Höhe zum genauen Hinsehen (Unterordner streifen/, …-teil1.png, …)
async function streifen(page, praefix) {
  const hoehe = await page.evaluate(() => document.scrollingElement.scrollHeight);
  const breite = await page.evaluate(() => window.innerWidth);
  mkdirSync(path.join(AUSGABE, "streifen"), { recursive: true });
  for (let i = 0, y = 0; y < hoehe; i++, y += 1000) {
    await page.screenshot({ path: path.join(AUSGABE, "streifen", `${praefix}-teil${i + 1}.png`), clip: { x: 0, y, width: breite, height: Math.min(1000, hoehe - y) }, captureBeyondViewport: true });
  }
}

// ---------- Statische Prüfungen (ohne Browser) ----------

function dateienUnter(ordner) {
  const treffer = [];
  const gehe = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const voll = path.join(d, e.name);
      if (e.isDirectory()) gehe(voll);
      else treffer.push(voll);
    }
  };
  if (existsSync(ordner)) gehe(ordner);
  return treffer;
}

function statisch() {
  abschnitt("Statisch: gebaute Seite, Sitemap, appack-Paket");
  const html = readFileSync(path.join(DOCS, "ws", "bestellung.html"), "utf8");
  pruefe('docs/ws/bestellung.html: <meta name="robots" content="noindex">', html.includes('<meta name="robots" content="noindex">'));
  pruefe("docs/ws/bestellung.html: Verweise auf eigenes CSS und Skript", html.includes('href="../assets/css/bestellung.css"') && html.includes('src="../assets/js/bestellung/seite.js"'));
  const m = /<script type="application\/json" id="bestellung-konfig">([\s\S]*?)<\/script>/.exec(html);
  pruefe("docs/ws/bestellung.html: Konfiguration eingebettet und gleich der Konfiguration aus den Daten (Bau aktuell)", !!m && JSON.stringify(JSON.parse(m[1])) === JSON.stringify(KONFIG), "Bau veraltet? npm run build");
  pruefe("docs/ws/bestellung.html: Titel", /<title>Bestellung für dein Team – FFV Sportfreunde 04<\/title>/.test(html));
  pruefe("docs/ws/bestellung.html: keine Einkaufsdaten, kein Skript von außen", !/Einkaufspreis|Kundenkonto|Angebotsnummer/i.test(html) && !/<script[^>]+src="https?:/.test(html) && !/<link[^>]+href="https?:\/\/(?!justolgay\.github\.io)/.test(html));
  for (const d of ["css/bestellung.css", "js/bestellung/seite.js", "js/bestellung/mailtext.js"]) {
    pruefe(`docs/assets/${d} vorhanden und gleich der Quelle`, existsSync(path.join(DOCS, "assets", d)) && readFileSync(path.join(DOCS, "assets", d), "utf8") === readFileSync(path.join(ROOT, "assets", d), "utf8"));
  }
  const sitemap = readFileSync(path.join(DOCS, "sitemap.xml"), "utf8");
  pruefe("docs/sitemap.xml ohne die Bestellseite", !/bestellung/i.test(sitemap));
  pruefe("docs/sitemap.xml: die übrigen Seiten stehen weiter drin (Platzbelegung, Termine, Mitglied werden)", ["platzbelegung", "termine", "mitglied-werden"].every((n) => sitemap.includes(`/ws/${n}.html`)));
  for (const ordner of [path.join(ROOT, "dist", "appack-paket", "web"), path.join(DOCS, "appack-paket", "web")]) {
    const rel = path.relative(ROOT, ordner);
    if (!existsSync(ordner)) {
      pruefe(`${rel} vorhanden (npm run build)`, false);
      continue;
    }
    const dateien = dateienUnter(ordner);
    pruefe(`${rel}: keine Datei der Bestellseite`, !dateien.some((d) => /bestellung/i.test(path.basename(d))), dateien.filter((d) => /bestellung/i.test(path.basename(d))).join(", "));
    pruefe(`${rel}: keine Seite verweist auf die Bestellseite`, !dateien.filter((d) => /\.(html|js|css)$/.test(d)).some((d) => /bestellung\.html/.test(readFileSync(d, "utf8"))));
  }
  const manifest = readFileSync(path.join(ROOT, "dist", "appack-paket", "manifest.json"), "utf8");
  pruefe("Paket-Manifest ohne die Bestellseite", !/bestellung/i.test(manifest));
  pruefe("docs/ws enthält die Bestellseite (und das Paket zählt sie nicht)", existsSync(path.join(DOCS, "ws", "bestellung.html")));
}

// ---------- Abläufe ----------

// Leere Seite bei 390 px, Klick auf „Senden“ ohne Pflichtangaben
async function ablaufLeer(browser, server) {
  abschnitt("390 x 844: leere Seite, „Senden“ ohne Pflichtangaben");
  const { page, p, schliessen } = await oeffne(browser, server);
  try {
    gleich("Sprache der Seite", await page.evaluate(() => document.documentElement.lang), "de");
    gleich("Titel", await page.title(), "Bestellung für dein Team – FFV Sportfreunde 04");
    gleich("genau eine Überschrift der Ebene 1", String(await page.$$eval("h1", (l) => l.length)), "1");
    gleich("Überschrift", await inhalt(page, "h1"), "Bestellung für dein Team");
    gleich("Überschriften der fünf Abschnitte in dieser Reihenfolge", (await page.$$eval("h2", (l) => l.map((h) => h.textContent.trim()))).join(" | "), "Wer bestellt? | Kleidung je Person | Teambedarf | Bezahlung | Übersicht und Senden");
    gleich("Hinweis im Prüfmodus (blau, ganz oben)", await inhalt(page, ".bst-pruefmodus"), "Prototyp: Die Mail geht als TEST an die Bestelladresse und löst keine Bestellung aus.");
    pruefe("Hinweis im Prüfmodus: Klasse hinweis--info, nicht der Warnton", await page.$eval(".bst-pruefmodus", (el) => el.classList.contains("hinweis--info") && !el.classList.contains("hinweis--offen")));
    pruefe("Hinweis im Prüfmodus steht über der Überschrift", await page.evaluate(() => document.querySelector(".bst-pruefmodus").getBoundingClientRect().top < document.querySelector("h1").getBoundingClientRect().top));
    gleich("zwei Sätze unter der Überschrift", await inhalt(page, ".bst-lead"), "Hier stellst du zusammen, was dein Team braucht. Am Ende öffnet sich dein Mailprogramm mit der fertigen Bestellung an den Verein – du musst nur noch auf „Senden“ tippen.");
    gleich("zwölf Mannschaften zur Auswahl (und „Bitte wählen“)", String(await page.$$eval("#bst-team option", (l) => l.length)), "13");
    gleich("Mannschaften in der Reihenfolge von data/teams.json", (await page.$$eval("#bst-team option", (l) => l.slice(1).map((o) => o.value))).join(","), "herren,soma,a-jugend,d1,d2,d3,e1,e2,e3,f1,f2,g-jugend");
    gleich("Beschriftungen der Felder zu „Wer bestellt?“", (await page.$$eval("#bst-h-wer ~ .bst-felder label", (l) => l.map((x) => x.textContent.trim()))).join(" | "), "Mannschaft | Dein Name | Telefon (freiwillig) | Gebraucht bis (freiwillig)");
    gleich("sieben Posten im Teambedarf", String(await page.$$eval("[data-teamposten]", (l) => l.length)), "7");
    gleich("Posten im Teambedarf", (await page.$$eval(".bst-posten__name", (l) => l.map((x) => x.textContent.trim()))).join(" | "), "Bälle | Leibchen | Hütchen / Markierungsteller | Ballnetz / Balltasche | Ballpumpe | Erste-Hilfe-Material | Trinkflaschen");
    gleich("Teambedarf: Platzhalter der Details", (await page.$$eval("[data-details]", (l) => l.map((x) => x.placeholder))).join(" | "), "z. B. Größe 4 | z. B. Farbe, Kinder oder Erwachsene | z. B. Satz mit 40 Stück |  |  | z. B. Kühlspray, Tape | ");
    gleich("Erklärzeile zum Druck", await inhalt(page, "#bst-h-kleidung ~ .bst-hinweis"), "Name und Nummer werden auf Trikot, Präsi-Jacke und Winterjacke gedruckt.");
    gleich("Knopf für die erste Person", await inhalt(page, "#bst-person-neu"), "+ Person hinzufügen");
    gleich("Hinweis zu den Preisen im Teambedarf", (await page.$$eval("#bst-h-team ~ .bst-hinweis", (l) => l.map((x) => x.textContent.trim()))).pop(), "Preise klärt der Vorstand.");
    pruefe("Bezahlung: ohne Auswahl keine Frage, nur der Hinweis", !(await sichtbar(page, '[data-bezahlung="kleidung"]')) && !(await sichtbar(page, '[data-bezahlung="teambedarf"]')) && (await sichtbar(page, "[data-bst-bezahlung-leer]")));
    gleich("Fuß der Seite", (await page.$$eval(".bst-fuss p:not([hidden])", (l) => l.map((x) => x.textContent.trim()))).join(" | "), "Die Seite speichert nichts auf einem Server. Deine Eingaben bleiben auf diesem Gerät, bis du sie per Mail verschickst. | Preise für Eltern bzw. Spieler, Stand 11/26.");
    pruefe("Speichern klappt: kein Hinweis zum Speicher", !(await sichtbar(page, "[data-bst-speicher]")));
    pruefe("keine Lücken, keine Meldung, kein „gesendet“ vor dem ersten Klick", !(await sichtbar(page, "[data-bst-luecken]")) && !(await sichtbar(page, "[data-bst-gesendet]")) && (await inhalt(page, "[data-bst-meldung]")) === "");
    gleich("Übersicht leer: Personen 0, Teile 0, Summe 0 €, Teambedarf –", (await page.$$eval("[data-u]", (l) => l.map((x) => x.textContent.trim()))).join(" | "), "0 | 0 | 0 € | –");
    pruefe("Sendelink ohne mailto, solange etwas fehlt", (await page.$eval("#bst-senden", (el) => el.dataset.mailto === undefined && !el.href.startsWith("mailto:"))));
    await pruefeLayout(page, "leere Seite", 390);
    await pruefeBeschriftungen(page, "leere Seite");
    await foto(page, "390-leer.png");

    // Klick auf „Senden“ ohne Pflichtangaben
    await page.click("#bst-senden");
    pruefe("ohne Pflichtangaben: Liste der Lücken sichtbar", await sichtbar(page, "[data-bst-luecken]"));
    gleich("ohne Pflichtangaben: Lücken in Klartext", (await page.$$eval("[data-luecke]", (l) => l.map((x) => x.textContent.trim()))).join(" | "), "Bitte wähle deine Mannschaft aus | Bitte trage deinen Namen ein | Du hast noch nichts ausgewählt: Füge eine Person mit Kleidung hinzu oder wähle Teambedarf");
    gleich("ohne Pflichtangaben: Fokus auf der ersten Lücke", await page.evaluate(() => document.activeElement.getAttribute("data-luecke")), "team");
    gleich("ohne Pflichtangaben: kein mailto ausgelöst", JSON.stringify(await gesendet(page)), "[]");
    pruefe("ohne Pflichtangaben: kein „gesendet“, keine Bestell-Nr. im Speicher", !(await sichtbar(page, "[data-bst-gesendet]")) && (await page.evaluate((k) => (JSON.parse(localStorage.getItem(k)) || {}).bestellNr === "", SCHLUESSEL_ENTWURF)));
    pruefe("ohne Pflichtangaben: Rahmen an Mannschaft und Name (aria-invalid)", await page.evaluate(() => document.getElementById("bst-team").getAttribute("aria-invalid") === "true" && document.getElementById("bst-name").getAttribute("aria-invalid") === "true"));
    // Klick auf eine Lücke springt zum Feld
    await page.click('[data-luecke="name"]');
    gleich("Klick auf eine Lücke: Fokus im Feld „Dein Name“", await page.evaluate(() => document.activeElement.id), "bst-name");
    // Lücken verschwinden, sobald sie behoben sind
    await page.select("#bst-team", "d3");
    gleich("Mannschaft gewählt: erste Lücke weg", (await page.$$eval("[data-luecke]", (l) => l.map((x) => x.getAttribute("data-luecke")))).join(","), "name,leer");
    await page.type("#bst-name", "Lena Beispiel");
    gleich("Name eingetragen: nur „nichts ausgewählt“ bleibt", (await page.$$eval("[data-luecke]", (l) => l.map((x) => x.getAttribute("data-luecke")))).join(","), "leer");
    pruefe("behobene Felder ohne Rahmen", await page.evaluate(() => !document.getElementById("bst-team").hasAttribute("aria-invalid") && !document.getElementById("bst-name").hasAttribute("aria-invalid")));
    await page.click('[data-luecke="leer"]');
    gleich("Klick auf „nichts ausgewählt“: Fokus beim Knopf „+ Person hinzufügen“", await page.evaluate(() => document.activeElement.id), "bst-person-neu");
    // „Text kopieren“ prüft genauso
    await page.click("#bst-kopieren");
    pruefe("„Text kopieren“ ohne Auswahl: Lücke statt Kopie", (await sichtbar(page, "[data-bst-luecken]")) && !(await sichtbar(page, "[data-bst-gesendet]")) && (await page.evaluate(() => document.activeElement.hasAttribute("data-luecke"))));
    await pruefeLayout(page, "Seite mit Lücken", 390);
    pruefeProtokoll("leere Seite", p, server);
  } finally {
    await schliessen();
  }
}

// Die Referenzbestellung (a) nur über die Oberfläche, dann Senden, Kopieren, Neuladen, Neue Bestellung
async function ablaufReferenz(browser, server) {
  abschnitt("390 x 844: Referenzbestellung D3 über die Oberfläche, Senden, Kopieren, Neuladen, Neue Bestellung");
  const { page, p, schliessen } = await oeffne(browser, server, { uhr: [2026, 10, 25, 14, 32] });
  try {
    await fuelleFall(page, FALL_A);
    await pruefeMail(page, "Referenzbestellung (a)", FALL_A);
    gleich("Übersicht: Personen, Teile, Summe, Teambedarf", (await page.$$eval("[data-u]", (l) => l.map((x) => x.textContent.trim()))).join(" | "), "3 | 11 | 230 € | 3 Posten");
    gleich("Zwischensummen der drei Personen", (await page.$$eval("[data-p-summe]", (l) => l.map((x) => x.textContent.trim()))).join(" | "), "Zwischensumme: 120 € (6 Teile) | Zwischensumme: 45 € (3 Teile) | Zwischensumme: 65 € (2 Teile)");
    gleich("Titel der Karten", (await page.$$eval(".bst-person__titel", (l) => l.map((x) => x.textContent.trim()))).join(" | "), "Person 1 | Person 2 | Person 3");
    gleich("Initialen der Regenjacke (Vorschlag aus dem Namen)", await wert(page, '[data-person="p3"] [data-a="initialen"]'), "BK");
    gleich("Größe Stutzen von Mia (Vorauswahl für Kinder)", await wert(page, '[data-person="p1"] [data-artikel="stutzen"] [data-a="groesse"]'), "M (Junior)");
    gleich("Größe Präsi-Hose von Mia (eigene Wahl)", await wert(page, '[data-person="p1"] [data-artikel="praesi-hose"] [data-a="groesse"]'), "152");
    gleich("Preise in Mias Karte (Trikot, Shorts, Stutzen, Präsi-Jacke, Präsi-Hose, Rucksack)", (await page.$$eval('[data-person="p1"] [data-artikel]', (l) => l.slice(0, 6).map((x) => x.querySelector("[data-a-preis]").textContent.trim()))).join(" | "), "30 € | 10 € | 5 € | 35 € | 20 € | 20 €");
    gleich("Preise in Bens Karte: Erwachsenenpreise", (await page.$$eval('[data-person="p3"] [data-artikel]', (l) => l.slice(0, 6).map((x) => x.querySelector("[data-a-preis]").textContent.trim()))).join(" | "), "35 € | 10 € | 5 € | 40 € | 20 € | 20 €");
    pruefe("Bezahlung: beide Fragen sichtbar, nichts davon ist Sponsor (kein Feld für den Namen)", (await sichtbar(page, '[data-bezahlung="kleidung"]')) && (await sichtbar(page, '[data-bezahlung="teambedarf"]')) && !(await sichtbar(page, '[data-bezahlung="kleidung"] [data-sponsor-feld]')));
    gleich("Bezahlung: Fragen", (await page.$$eval(".bst-gruppe:not([hidden]) legend", (l) => l.map((x) => x.textContent.trim()))).join(" | "), "Wer zahlt die Kleidung? | Wer zahlt den Teambedarf?");
    gleich("Bezahlung: Antworten zur Auswahl", (await page.$$eval('[data-bezahlung="kleidung"] .bst-option', (l) => l.map((x) => x.textContent.trim()))).join(" | "), "Eltern bzw. Spieler | Vereinskasse | Sponsor | Spenden / Mannschaftskasse");
    pruefe("keine Lücken", !(await sichtbar(page, "[data-bst-luecken]")));
    gleich("noch nicht gesendet: keine Bestell-Nr. gespeichert", await page.evaluate((k) => JSON.parse(localStorage.getItem(k)).bestellNr, SCHLUESSEL_ENTWURF), "");
    pruefe("noch nicht gesendet: kein Kasten „gesendet“, kein mailto ausgelöst", !(await sichtbar(page, "[data-bst-gesendet]")) && (await gesendet(page)).length === 0);
    pruefe("Hinweis „Die Bestellung ist lang“ erscheint bei dieser Bestellung nicht", !(await sichtbar(page, "[data-bst-lang]")));
    await pruefeLayout(page, "ausgefüllte Seite", 390);
    for (const breite of [320, 360, 414, 600, 768]) {
      await page.setViewport({ width: breite, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true }); // Handy-Modus bleibt: sonst lädt Puppeteer die Seite neu
      await pruefeLayout(page, `ausgefüllte Seite bei ${breite} px`, breite);
    }
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    await pruefeBeschriftungen(page, "ausgefüllte Seite");
    await pruefeIds(page, "ausgefüllte Seite");
    await pruefeTippflaechen(page, "ausgefüllte Seite");
    await pruefeAxe(page, "ausgefüllte Seite");
    await foto(page, "390-ausgefuellt.png");
    await streifen(page, "390-ausgefuellt");

    // „Mail ansehen“ aufklappen
    await page.click("[data-bst-vorschau] summary");
    pruefe("„Mail ansehen“ klappt auf, das Feld ist schreibgeschützt", (await sichtbar(page, "[data-bst-vorschau-text]")) && (await page.$eval("[data-bst-vorschau-text]", (el) => el.readOnly)));
    gleich("„Mail ansehen“: Text nach dem Aufklappen", await wert(page, "[data-bst-vorschau-text]"), FALL_A.text);
    gleich("„Mail ansehen“: Empfänger", await inhalt(page, ".bst-vorschau__kopf span:first-child"), "An: Bestellungen@sportfreunde04.de");
    await pruefeLayout(page, "„Mail ansehen“ offen", 390);
    await page.click("[data-bst-vorschau] summary");

    // Senden
    await page.click("#bst-senden");
    const geklickt = await gesendet(page);
    gleich("Senden: genau ein mailto ausgelöst", String(geklickt.length), "1");
    pruefe("Senden: der ausgelöste Link ist der erwartete", geklickt.length === 1 && dekodiere(geklickt[0]).text === FALL_A.text && dekodiere(geklickt[0]).betreff === FALL_A.betreff, geklickt[0]);
    pruefe("Senden: Kasten „gesendet“ sichtbar", await sichtbar(page, "[data-bst-gesendet]"));
    gleich("Senden: Meldung wörtlich", await inhalt(page, "[data-bst-gesendet-text]"), TEXT_GESENDET);
    gleich("Senden: Bestell-Nr. aus der festen Uhr", await inhalt(page, "[data-bst-nr]"), "D3-261125-1432");
    gleich("Senden: Knopf „Neue Bestellung beginnen“", await inhalt(page, "[data-bst-neu]"), "Neue Bestellung beginnen");
    gleich("Senden: Bestell-Nr. im Speicher", await page.evaluate((k) => JSON.parse(localStorage.getItem(k)).bestellNr + "|" + JSON.parse(localStorage.getItem(k)).status, SCHLUESSEL_ENTWURF), "D3-261125-1432|mail");
    await pruefeLayout(page, "gesendet", 390);
    await foto(page, "390-gesendet.png");
    await streifen(page, "390-gesendet");
    pruefe("Senden: Lücken-Liste bleibt zu", !(await sichtbar(page, "[data-bst-luecken]")));

    // Text kopieren (Zwischenablage erlaubt)
    await page.click("#bst-kopieren");
    gleich("Text kopieren: Zwischenablage = Betreff, Leerzeile, Text", await page.evaluate(() => navigator.clipboard.readText()), kopierText({ betreff: FALL_A.betreff, text: FALL_A.text }));
    gleich("Text kopieren: Meldung", await inhalt(page, "[data-bst-meldung]"), "Kopiert.");
    gleich("Text kopieren: Hinweis nennt die Adresse", await inhalt(page, "[data-bst-gesendet-text]"), "Der Text ist kopiert. Füge ihn in eine neue Mail an Bestellungen@sportfreunde04.de ein und tippe dort auf „Senden“.");
    gleich("Text kopieren: Bestell-Nr. bleibt", await inhalt(page, "[data-bst-nr]"), "D3-261125-1432");
    pruefe("Text kopieren: öffnet kein Mailprogramm", (await gesendet(page)).length === 1);
    // Noch einmal senden, Stunden später: dieselbe Bestell-Nr. (sie entsteht nur beim ersten Senden)
    await page.evaluate(festeUhr, 2026, 10, 25, 16, 0);
    await page.click("#bst-senden");
    gleich("zweites Senden: zwei mailto, derselbe Text", String((await gesendet(page)).length) + "|" + String(dekodiere((await gesendet(page))[1]).text === FALL_A.text), "2|true");
    gleich("zweites Senden: Meldung wieder wörtlich", await inhalt(page, "[data-bst-gesendet-text]"), TEXT_GESENDET);
    gleich("zweites Senden: Meldung „Kopiert.“ ist weg", await inhalt(page, "[data-bst-meldung]"), "");

    // Eine Änderung nach dem Senden: die Bestell-Nr. bleibt, der Text folgt
    await page.type("#bst-hinweis", "Bitte bis Freitag");
    const mailtoNachher = await page.$eval("#bst-senden", (el) => el.dataset.mailto || "");
    pruefe("Änderung nach dem Senden: Bestell-Nr. bleibt, der Hinweis steht im Text", dekodiere(mailtoNachher).betreff.endsWith("(D3-261125-1432)") && dekodiere(mailtoNachher).text.includes("\nHinweis: Bitte bis Freitag\nBestell-Nr.: D3-261125-1432\n"), mailtoNachher.slice(0, 200));
    await tippe(page, "#bst-hinweis", "", true);

    // Neuladen: der Entwurf ist noch da
    await page.reload({ waitUntil: "networkidle0" });
    await page.waitForSelector("#bestellung[data-bereit]");
    gleich("Neuladen: Mannschaft", await wert(page, "#bst-team"), "d3");
    gleich("Neuladen: Name", await wert(page, "#bst-name"), "Lena Beispiel");
    gleich("Neuladen: Telefon", await wert(page, "#bst-tel"), "030 23125 123");
    gleich("Neuladen: Gebraucht bis", await wert(page, "#bst-bis"), "2027-01-15");
    gleich("Neuladen: drei Personen", String(await page.$$eval(".bst-person", (l) => l.length)), "3");
    gleich("Neuladen: Namen der Personen", (await page.$$eval('[data-p="name"]', (l) => l.map((x) => x.value))).join(","), "Mia,Emil,Ben Kuhn");
    gleich("Neuladen: Bälle", await wert(page, '[data-teamposten="baelle"] [data-n]'), "10");
    gleich("Neuladen: Details der Bälle", await wert(page, '[data-teamposten="baelle"] [data-details]'), "Größe 4");
    gleich("Neuladen: Sonstiges", await wert(page, "#bst-sonstiges"), "Ersatznetz für das kleine Tor");
    gleich("Neuladen: Bezahlung Kleidung", await page.$eval('[data-bezahlung="kleidung"] input:checked', (el) => el.value), "eltern");
    gleich("Neuladen: Bezahlung Teambedarf", await page.$eval('[data-bezahlung="teambedarf"] input:checked', (el) => el.value), "vereinskasse");
    gleich("Neuladen: Hinweis zur Bezahlung", await wert(page, "#bst-hinweis-bezahlung"), "Eltern zahlen bar bei mir");
    await pruefeMail(page, "nach dem Neuladen", FALL_A);
    pruefe("Neuladen: „gesendet“ und Bestell-Nr. sind noch da", (await sichtbar(page, "[data-bst-gesendet]")) && (await inhalt(page, "[data-bst-nr]")) === "D3-261125-1432");
    gleich("Neuladen: nichts davon liegt im Netz (Anfragen gehen nur an den Testserver)", String(p.anfragen.filter((u) => !u.startsWith(server.basis + "/") && !u.startsWith("data:")).length), "0");
    // Der Speicher: Schlüssel und Inhalt des Absenders
    const gespeichert = await page.evaluate((k1, k2) => ({ entwurf: localStorage.getItem(k1), absender: localStorage.getItem(k2) }), SCHLUESSEL_ENTWURF, SCHLUESSEL_ABSENDER);
    gleich("Speicher: Absender (Mannschaft, Name, Telefon)", gespeichert.absender, JSON.stringify({ team: "d3", name: "Lena Beispiel", tel: "030 23125 123" }));
    pruefe("Speicher: Entwurf ist gültiges JSON mit drei Personen", JSON.parse(gespeichert.entwurf).personen.length === 3);

    // Neue Bestellung: erst „Abbrechen“ in der Rückfrage, dann „OK“
    p.dialogAntwort = false;
    await page.click("[data-bst-neu]");
    pruefe("Neue Bestellung: Rückfrage erschien (confirm)", p.dialoge.filter((d) => d.art === "confirm").length === 1 && p.dialoge[p.dialoge.length - 1].text.startsWith("Neue Bestellung beginnen?"), JSON.stringify(p.dialoge));
    gleich("Neue Bestellung: nach „Abbrechen“ ist alles noch da", String(await page.$$eval(".bst-person", (l) => l.length)) + "|" + (await inhalt(page, "[data-bst-nr]")), "3|D3-261125-1432");
    p.dialogAntwort = true;
    await page.click("[data-bst-neu]");
    gleich("Neue Bestellung: Rückfrage zum zweiten Mal", String(p.dialoge.filter((d) => d.art === "confirm").length), "2");
    gleich("Neue Bestellung: keine Personen mehr", String(await page.$$eval(".bst-person", (l) => l.length)), "0");
    gleich("Neue Bestellung: Teambedarf leer", (await page.$$eval("[data-n]", (l) => l.map((x) => x.value))).join(","), "0,0,0,0,0,0,0");
    gleich("Neue Bestellung: Sonstiges und Hinweise leer", [await wert(page, "#bst-sonstiges"), await wert(page, "#bst-hinweis-bezahlung"), await wert(page, "#bst-hinweis"), await wert(page, "#bst-bis")].join("|"), "|||");
    gleich("Neue Bestellung: Mannschaft, Name und Telefon bleiben", [await wert(page, "#bst-team"), await wert(page, "#bst-name"), await wert(page, "#bst-tel")].join("|"), "d3|Lena Beispiel|030 23125 123");
    pruefe("Neue Bestellung: Kasten „gesendet“ weg, keine Bezahlfragen, Übersicht leer", !(await sichtbar(page, "[data-bst-gesendet]")) && !(await sichtbar(page, '[data-bezahlung="kleidung"]')) && (await page.$$eval("[data-u]", (l) => l.map((x) => x.textContent.trim()).join("|"))) === "0|0|0 €|–");
    gleich("Neue Bestellung: Fokus oben bei der Überschrift", await page.evaluate(() => document.activeElement.id), "bst-titel");
    const nachNeu = await page.evaluate((k1, k2) => ({ entwurf: JSON.parse(localStorage.getItem(k1)), absender: JSON.parse(localStorage.getItem(k2)) }), SCHLUESSEL_ENTWURF, SCHLUESSEL_ABSENDER);
    gleich("Neue Bestellung: Speicher – Entwurf ohne Personen, ohne Bestell-Nr.", `${nachNeu.entwurf.personen.length}|${nachNeu.entwurf.bestellNr}|${nachNeu.entwurf.status}`, "0||");
    gleich("Neue Bestellung: Speicher – Absender bleibt", JSON.stringify(nachNeu.absender), JSON.stringify({ team: "d3", name: "Lena Beispiel", tel: "030 23125 123" }));
    await page.reload({ waitUntil: "networkidle0" });
    await page.waitForSelector("#bestellung[data-bereit]");
    gleich("Neuladen nach „Neue Bestellung“: leer, der Absender bleibt", [String(await page.$$eval(".bst-person", (l) => l.length)), await wert(page, "#bst-team"), await wert(page, "#bst-name"), await wert(page, "#bst-tel")].join("|"), "0|d3|Lena Beispiel|030 23125 123");
    // Eine neue Bestellung bekommt eine neue Bestell-Nr. (später am Tag, gleiche Mannschaft); Mannschaft, Name und Telefon sind schon da
    await page.evaluate(festeUhr, 2026, 10, 25, 16, 5);
    await page.click("#bst-person-neu");
    await page.type('[data-person="p1"] [data-p="name"]', "Noah");
    await page.type('[data-person="p1"] [data-p="nummer"]', "4");
    await page.select('[data-person="p1"] [data-p="groesse"]', "128");
    await page.click('[data-person="p1"] [data-artikel="trikot"] [data-a="an"]');
    await page.click('[data-bezahlung="kleidung"] input[value="eltern"]');
    await page.click("#bst-senden");
    gleich("zweite Bestellung: neue Bestell-Nr. (16:05)", await inhalt(page, "[data-bst-nr]"), "D3-261125-1605");
    const zweite = dekodiere((await gesendet(page))[0]);
    pruefe("zweite Bestellung: Mail mit dem Absender von vorher und der neuen Nummer", zweite.text.includes("Bestellt von: Lena Beispiel, Tel. 030 23125 123\n") && zweite.betreff === "[TEST] Bestellung D3-Jugend – 1 Teil (D3-261125-1605)", zweite.betreff);
    pruefeProtokoll("Referenzbestellung", p, server);
  } finally {
    await schliessen();
  }
}

// Fälle (b) und (c) ebenfalls über die Oberfläche
async function ablaufFaelleBC(browser, server) {
  abschnitt("390 x 844: Fall (b) nur Teambedarf, Fall (c) Torwartset in Erwachsenengröße");
  for (const [id, fall, uhr] of [["b", FALL_B, [2026, 10, 25, 9, 5]], ["c", FALL_C, [2026, 10, 25, 18, 7]]]) {
    const { page, p, schliessen } = await oeffne(browser, server, { uhr });
    try {
      await fuelleFall(page, fall);
      await pruefeMail(page, `Fall (${id}) ${fall.titel}`, fall);
      pruefe(`Fall (${id}): keine Lücken`, !(await sichtbar(page, "[data-bst-luecken]")));
      await page.click("#bst-senden");
      const geklickt = await gesendet(page);
      pruefe(`Fall (${id}): Senden löst genau den erwarteten mailto aus`, geklickt.length === 1 && dekodiere(geklickt[0]).text === fall.text, geklickt[0]);
      if (id === "b") {
        pruefe("Fall (b): nur Teambedarf: keine Frage zur Kleidung, keine Personen in der Übersicht", !(await sichtbar(page, '[data-bezahlung="kleidung"]')) && (await inhalt(page, '[data-u="personen"]')) === "0" && (await inhalt(page, '[data-u="teambedarf"]')) === "3 Posten");
        gleich("Fall (b): Bestell-Nr. mit Kürzel mit Bindestrich und führender Null", await inhalt(page, "[data-bst-nr]"), "G-JUGEND-261125-0905");
      } else {
        gleich("Fall (c): Torwartset 150 €", await inhalt(page, '[data-u="summe"]'), "150 €");
        gleich("Fall (c): Stutzen für Erwachsene L (Senior)", await wert(page, '[data-artikel="stutzen"] [data-a="groesse"]'), "L (Senior)");
        gleich("Fall (c): Schnellwahl wählt genau sechs Artikel", String(await page.$$eval('[data-a="an"]:checked', (l) => l.length)), "6");
      }
      pruefeProtokoll(`Fall (${id})`, p, server);
    } finally {
      await schliessen();
    }
  }
}

// Lückenliste mit mehreren Fehlern (Bildschirmfoto) und der Weg zu den Feldern
async function ablaufLuecken(browser, server) {
  abschnitt("390 x 844: Lückenliste mit mehreren Fehlern");
  const { page, p, schliessen } = await oeffne(browser, server);
  try {
    await page.select("#bst-team", "d3");
    await page.type("#bst-name", "Lena Beispiel");
    // Mia: Trikot und Präsi-Jacke ohne Rückennummer
    await page.click("#bst-person-neu");
    await page.type('[data-person="p1"] [data-p="name"]', "Mia");
    await page.select('[data-person="p1"] [data-p="groesse"]', "140");
    await page.click('[data-person="p1"] [data-artikel="trikot"] [data-a="an"]');
    await page.click('[data-person="p1"] [data-artikel="praesi-jacke"] [data-a="an"]');
    // Ben: Regenjacke, Initialen geleert
    await page.click("#bst-person-neu");
    await page.type('[data-person="p2"] [data-p="name"]', "Ben Kuhn");
    await page.select('[data-person="p2"] [data-p="groesse"]', "M");
    await page.click('[data-person="p2"] [data-artikel="regenjacke"] [data-a="an"]');
    await tippe(page, '[data-person="p2"] [data-a="initialen"]', "", true);
    // dritte Person ohne Namen
    await page.click("#bst-person-neu");
    await page.select('[data-person="p3"] [data-p="groesse"]', "152");
    await page.click('[data-person="p3"] [data-artikel="shorts"] [data-a="an"]');
    // Teambedarf ohne Bezahlung
    await page.click('[data-teamposten="baelle"] [data-schritt="1"]');
    await page.click("#bst-senden");
    gleich("Lücken: Liste in Klartext, in der Reihenfolge der Seite", (await page.$$eval("[data-luecke]", (l) => l.map((x) => x.textContent.trim()))).join(" | "), [
      "Bei Mia fehlt die Rückennummer (Trikot, Präsi-Jacke)",
      "Bei Ben Kuhn fehlen die Initialen (Regenjacke)",
      "Bei Person 3 fehlt der Name",
      "Bitte wähle, wer die Kleidung zahlt",
      "Bitte wähle, wer den Teambedarf zahlt",
    ].join(" | "));
    gleich("Lücken: Überschrift der Liste", await inhalt(page, ".bst-luecken__titel"), "Bitte ergänze noch:");
    gleich("Lücken: Fokus auf der ersten Lücke", await page.evaluate(() => document.activeElement.textContent.trim()), "Bei Mia fehlt die Rückennummer (Trikot, Präsi-Jacke)");
    gleich("Lücken: kein mailto ausgelöst, kein Kasten „gesendet“", String((await gesendet(page)).length) + "|" + String(await sichtbar(page, "[data-bst-gesendet]")), "0|false");
    pruefe("Lücken: Felder mit Lücke tragen aria-invalid", await page.evaluate(() => ["p:p1:nummer", "p:p2:initialen", "p:p3:name"].every((s) => document.querySelector(`[data-schluessel="${s}"]`).getAttribute("aria-invalid") === "true") && document.querySelector('[data-schluessel="bezahlung:kleidung"]').getAttribute("aria-invalid") === "true"));
    pruefe("Lücken: Felder ohne Lücke tragen es nicht", await page.evaluate(() => !document.getElementById("bst-team").hasAttribute("aria-invalid") && !document.querySelector('[data-schluessel="p:p1:name"]').hasAttribute("aria-invalid")));
    await pruefeLayout(page, "Lückenliste", 390);
    await pruefeTippflaechen(page, "Lückenliste");
    await pruefeAxe(page, "Lückenliste");
    await foto(page, "390-luecken.png");
    await streifen(page, "390-luecken");
    // Sprung zu den Feldern
    await page.click('[data-luecke="p:p1:nummer"]');
    gleich("Sprung: Rückennummer von Mia", await page.evaluate(() => document.activeElement.closest("[data-person]").dataset.person + ":" + document.activeElement.dataset.p), "p1:nummer");
    await page.type('[data-person="p1"] [data-p="nummer"]', "7");
    await page.click('[data-luecke="p:p2:initialen"]');
    gleich("Sprung: Initialen von Ben", await page.evaluate(() => document.activeElement.dataset.a + ":" + document.activeElement.closest("[data-person]").dataset.person), "initialen:p2");
    await page.type('[data-person="p2"] [data-a="initialen"]', "BK");
    await page.click('[data-luecke="p:p3:name"]');
    await page.type('[data-person="p3"] [data-p="name"]', "Cem");
    await page.click('[data-luecke="bezahlung:kleidung"]');
    gleich("Sprung: Bezahlung der Kleidung (erste Antwort)", await page.evaluate(() => document.activeElement.name + ":" + document.activeElement.value), "bez-kleidung:eltern");
    await page.keyboard.press("Space");
    gleich("Bezahlung per Tastatur gewählt (Leertaste)", await page.$eval('[data-bezahlung="kleidung"] input:checked', (el) => el.value), "eltern");
    gleich("Lücken: es bleibt nur der Teambedarf", (await page.$$eval("[data-luecke]", (l) => l.map((x) => x.textContent.trim()))).join(" | "), "Bitte wähle, wer den Teambedarf zahlt");
    await page.click('[data-bezahlung="teambedarf"] input[value="sponsor"]');
    gleich("Sponsor gewählt: Feld „Name des Sponsors“ erscheint", String(await sichtbar(page, '[data-bezahlung="teambedarf"] [data-sponsor-feld]')), "true");
    gleich("Sponsor gewählt: Lücke nennt den Sponsor", (await page.$$eval("[data-luecke]", (l) => l.map((x) => x.textContent.trim()))).join(" | "), "Bitte trage den Namen des Sponsors ein (Teambedarf)");
    await page.click('[data-luecke="sponsor:teambedarf"]');
    gleich("Sprung: Name des Sponsors", await page.evaluate(() => document.activeElement.id), "bst-sponsor-teambedarf");
    await page.type("#bst-sponsor-teambedarf", "Autohaus Beispiel");
    pruefe("alles behoben: Liste der Lücken weg", !(await sichtbar(page, "[data-bst-luecken]")));
    const mailto = await page.$eval("#bst-senden", (el) => el.dataset.mailto || "");
    pruefe("alles behoben: Sendelink trägt jetzt den mailto", mailto.startsWith("mailto:") && dekodiere(mailto).text.includes("Bezahlung Teambedarf: Sponsor: Autohaus Beispiel\n"));
    pruefe("alles behoben: Name der Mannschaft im Betreff", dekodiere(mailto).betreff.startsWith("[TEST] Bestellung D3-Jugend – 4 Teile, Teambedarf ("));
    pruefeProtokoll("Lückenliste", p, server);
  } finally {
    await schliessen();
  }
}

// Größen, Vorauswahl, Initialen, Teambedarf, Bezahlung, Tastatur
async function ablaufFelder(browser, server) {
  abschnitt("390 x 844: Größen und Vorauswahl, Initialen, Teambedarf, Bezahlung, Tastatur");
  const { page, p, schliessen } = await oeffne(browser, server);
  const karte = (id) => `[data-person="${id}"]`;
  const artikel = (id, a, teil) => `${karte(id)} [data-artikel="${a}"] ${teil}`;
  try {
    // Personenkarte per Tastatur: „+ Person hinzufügen“ mit Enter, Name tippen, mit Tab weiter
    await page.focus("#bst-person-neu");
    await page.keyboard.press("Enter");
    gleich("Tastatur: Enter auf „+ Person hinzufügen“ legt eine Karte an und setzt den Fokus in „Name“", String(await page.$$eval(".bst-person", (l) => l.length)) + "|" + (await page.evaluate(() => document.activeElement.dataset.p)), "1|name");
    await page.keyboard.type("Leo");
    await page.keyboard.press("Tab");
    gleich("Tastatur: Tab › Rückennummer", await page.evaluate(() => document.activeElement.dataset.p), "nummer");
    await page.keyboard.type("5");
    await page.keyboard.press("Tab");
    gleich("Tastatur: Tab › Größe", await page.evaluate(() => document.activeElement.dataset.p), "groesse");
    await page.select(`${karte("p1")} [data-p="groesse"]`, "116");
    await page.focus(`${karte("p1")} [data-p="groesse"]`);
    await page.keyboard.press("Tab");
    gleich("Tastatur: Tab › Schnellwahl Grundausstattung", await page.evaluate(() => document.activeElement.dataset.schnellwahl), "grundausstattung");
    await page.keyboard.press("Space");
    gleich("Tastatur: Leertaste auf der Schnellwahl wählt sechs Artikel", String(await page.$$eval('[data-a="an"]:checked', (l) => l.length)), "6");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    gleich("Tastatur: Tab › Tab › erster Artikel (Trikot)", await page.evaluate(() => document.activeElement.closest("[data-artikel]").dataset.artikel), "trikot");
    await page.keyboard.press("Space");
    gleich("Tastatur: Leertaste wählt das Trikot wieder ab", String(await page.$eval(artikel("p1", "trikot", '[data-a="an"]'), (el) => el.checked)) + "|" + (await inhalt(page, '[data-u="teile"]')), "false|5");
    await page.keyboard.press("Space");
    gleich("Tastatur: noch einmal Leertaste wählt es wieder an", String(await page.$eval(artikel("p1", "trikot", '[data-a="an"]'), (el) => el.checked)) + "|" + (await inhalt(page, '[data-u="teile"]')), "true|6");

    // Größen: Preis zur Größe, Vorauswahl folgt der Person, eigene Wahl bleibt
    gleich("Preis Trikot bei Größe 116 (Kind)", await inhalt(page, artikel("p1", "trikot", "[data-a-preis]")), "30 €");
    await page.select(`${karte("p1")} [data-p="groesse"]`, "M");
    gleich("Größe der Person M: Trikot folgt (M)", await wert(page, artikel("p1", "trikot", '[data-a="groesse"]')), "M");
    gleich("Größe der Person M: Preis Trikot Erwachsene", await inhalt(page, artikel("p1", "trikot", "[data-a-preis]")), "35 €");
    gleich("Größe der Person M: Stutzen folgt (L (Senior))", await wert(page, artikel("p1", "stutzen", '[data-a="groesse"]')), "L (Senior)");
    gleich("Größe der Person M: Rucksack bleibt Einheitsgröße (keine Auswahl)", (await inhalt(page, artikel("p1", "rucksack", ".bst-einheit"))) + "|" + String((await page.$(artikel("p1", "rucksack", '[data-a="groesse"]'))) === null), "Einheitsgröße|true");
    await page.select(`${karte("p1")} [data-p="groesse"]`, "116");
    gleich("zurück auf 116: Stutzen folgt (M (Junior))", await wert(page, artikel("p1", "stutzen", '[data-a="groesse"]')), "M (Junior)");
    await page.select(artikel("p1", "shorts", '[data-a="groesse"]'), "140");
    gleich("eigene Wahl bei Shorts: 140", await wert(page, artikel("p1", "shorts", '[data-a="groesse"]')), "140");
    await page.select(`${karte("p1")} [data-p="groesse"]`, "164");
    gleich("Größe der Person 164: Shorts bleibt bei der eigenen Wahl (140)", await wert(page, artikel("p1", "shorts", '[data-a="groesse"]')), "140");
    gleich("Größe der Person 164: Trikot folgt (164)", await wert(page, artikel("p1", "trikot", '[data-a="groesse"]')), "164");
    await page.select(artikel("p1", "shorts", '[data-a="groesse"]'), "164");
    await page.select(`${karte("p1")} [data-p="groesse"]`, "128");
    gleich("eigene Wahl gleich der Vorauswahl: Shorts geht wieder mit der Person (128)", await wert(page, artikel("p1", "shorts", '[data-a="groesse"]')), "128");
    gleich("Größenauswahl: Kinder- und Erwachsenengrößen getrennt beschriftet (Person)", (await page.$$eval(`${karte("p1")} [data-p="groesse"] optgroup`, (l) => l.map((g) => g.label + ": " + [...g.children].map((o) => o.value).join(" ")))).join(" | "), "Kindergrößen: 116 128 140 152 164 | Erwachsenengrößen: S M L XL XXL 3XL");
    gleich("Größenauswahl: Winterjacke ohne 116", (await page.$$eval(artikel("p1", "winterjacke", '[data-a="groesse"] option'), (l) => l.map((o) => o.value).filter(Boolean))).join(" "), "128 140 152 164 S M L XL XXL 3XL");
    gleich("Größenauswahl: Stutzen S (Bambini), M (Junior), L (Senior)", (await page.$$eval(artikel("p1", "stutzen", '[data-a="groesse"] option'), (l) => l.map((o) => o.value).filter(Boolean))).join(" | "), "S (Bambini) | M (Junior) | L (Senior)");

    // Winterjacke bei Größe 116: Vorauswahl 128 mit Hinweis
    await page.select(`${karte("p1")} [data-p="groesse"]`, "116");
    await page.click(artikel("p1", "winterjacke", '[data-a="an"]'));
    gleich("Winterjacke bei 116: Vorauswahl 128", await wert(page, artikel("p1", "winterjacke", '[data-a="groesse"]')), "128");
    gleich("Winterjacke bei 116: Hinweis", await inhalt(page, artikel("p1", "winterjacke", "[data-a-hinweis]")), "Winterjacke gibt es für Kinder erst ab 128");
    gleich("Winterjacke bei 116: Preis", await inhalt(page, artikel("p1", "winterjacke", "[data-a-preis]")), "65 €");
    await page.select(artikel("p1", "winterjacke", '[data-a="groesse"]'), "140");
    pruefe("Winterjacke: eigene Wahl 140, Hinweis weg", (await wert(page, artikel("p1", "winterjacke", '[data-a="groesse"]'))) === "140" && !(await sichtbar(page, artikel("p1", "winterjacke", "[data-a-hinweis]"))));
    await page.select(`${karte("p1")} [data-p="groesse"]`, "140");
    gleich("Winterjacke bei Größe 140: ohne Hinweis", String(await sichtbar(page, artikel("p1", "winterjacke", "[data-a-hinweis]"))), "false");
    const lieferant = await page.$eval("[data-bst-vorschau-text]", (el) => el.value);
    pruefe("Winterjacke 116 mit eigener Wahl 140: im Text Gr. 140", lieferant.includes("- Gr. 140:"));
    // Preis ohne Größe der Person
    await page.click("#bst-person-neu");
    gleich("zweite Person ohne Größe: Preis „ab 30 €“ beim Trikot, „10 €“ bei Shorts", (await inhalt(page, artikel("p2", "trikot", "[data-a-preis]"))) + "|" + (await inhalt(page, artikel("p2", "shorts", "[data-a-preis]"))), "ab 30 €|10 €");

    // Initialen
    await page.type(`${karte("p2")} [data-p="name"]`, "Ben Kuhn");
    await page.select(`${karte("p2")} [data-p="groesse"]`, "M");
    pruefe("Initialen: Feld erst nach Wahl der Regenjacke", !(await sichtbar(page, `${karte("p2")} [data-a="initialen"]`)));
    await page.click(artikel("p2", "regenjacke", '[data-a="an"]'));
    gleich("Initialen: Vorschlag „BK“", await wert(page, `${karte("p2")} [data-a="initialen"]`), "BK");
    await tippe(page, `${karte("p2")} [data-a="initialen"]`, "BeK", true);
    await tippe(page, `${karte("p2")} [data-p="name"]`, "Benedikt Kuhn", true);
    gleich("Initialen: eigene Eingabe bleibt, auch wenn sich der Name ändert", await wert(page, `${karte("p2")} [data-a="initialen"]`), "BeK");
    await tippe(page, `${karte("p2")} [data-a="initialen"]`, "", true);
    await page.click("#bst-senden");
    pruefe("Initialen geleert: Lücke „fehlen die Initialen“", (await page.$$eval("[data-luecke]", (l) => l.map((x) => x.textContent.trim()))).includes("Bei Benedikt Kuhn fehlen die Initialen (Regenjacke)"));

    // Teambedarf: Stepper, Eingabe, Grenzen, Details
    const baelle = '[data-teamposten="baelle"]';
    pruefe("Teambedarf: Details erst bei Anzahl über 0", !(await sichtbar(page, `${baelle} [data-details-feld]`)));
    await page.click(`${baelle} [data-schritt="1"]`);
    await page.click(`${baelle} [data-schritt="1"]`);
    gleich("Teambedarf: zweimal „+“ ergibt 2", await wert(page, `${baelle} [data-n]`), "2");
    pruefe("Teambedarf: Details erscheinen", await sichtbar(page, `${baelle} [data-details-feld]`));
    gleich("Teambedarf: Beschriftung „Details“", await inhalt(page, `${baelle} [data-details-feld] label`), "Details");
    await page.type(`${baelle} [data-details]`, "Größe 4");
    for (let i = 0; i < 4; i++) await page.click(`${baelle} [data-schritt="-1"]`);
    gleich("Teambedarf: „−“ geht nicht unter 0", await wert(page, `${baelle} [data-n]`), "0");
    pruefe("Teambedarf: bei 0 sind die Details wieder weg", !(await sichtbar(page, `${baelle} [data-details-feld]`)));
    await page.click(`${baelle} [data-schritt="1"]`);
    gleich("Teambedarf: die Details sind noch da, wenn man wieder erhöht", await wert(page, `${baelle} [data-details]`), "Größe 4");
    await tippe(page, `${baelle} [data-n]`, "5000", true);
    await page.keyboard.press("Tab");
    gleich("Teambedarf: höchstens 999", await wert(page, `${baelle} [data-n]`), "999");
    await tippe(page, `${baelle} [data-n]`, "12", true);
    gleich("Teambedarf: Anzahl getippt", await wert(page, `${baelle} [data-n]`), "12");
    gleich("Teambedarf: Anzahl im Text", (await wert(page, "[data-bst-vorschau-text]")).split("\n").filter((z) => z.startsWith("- 12 × ")).join("|"), "- 12 × Bälle: Größe 4");
    gleich("Teambedarf: Beschriftung der Knöpfe", (await page.$$eval(`${baelle} button`, (l) => l.map((b) => b.getAttribute("aria-label")))).join(" | "), "Bälle: eine weniger | Bälle: eine mehr");

    // Bezahlung: Fragen erscheinen mit dem Inhalt
    await page.reload({ waitUntil: "networkidle0" });
    await page.waitForSelector("#bestellung[data-bereit]");
    pruefe("Neuladen: Bezahlfragen für beides sichtbar (Kleidung und Teambedarf sind im Entwurf)", (await sichtbar(page, '[data-bezahlung="kleidung"]')) && (await sichtbar(page, '[data-bezahlung="teambedarf"]')));
    await page.click(artikel("p1", "trikot", '[data-a="an"]'));
    pruefe("Bezahlung bleibt sichtbar, solange noch ein Artikel gewählt ist", await sichtbar(page, '[data-bezahlung="kleidung"]'));
    for (const a of ["shorts", "stutzen", "praesi-jacke", "praesi-hose", "rucksack", "winterjacke"]) {
      if (await page.$eval(artikel("p1", a, '[data-a="an"]'), (el) => el.checked)) await page.click(artikel("p1", a, '[data-a="an"]'));
    }
    await page.click(artikel("p2", "regenjacke", '[data-a="an"]'));
    pruefe("keine Kleidung mehr gewählt: Frage zur Kleidung weg, Teambedarf bleibt", !(await sichtbar(page, '[data-bezahlung="kleidung"]')) && (await sichtbar(page, '[data-bezahlung="teambedarf"]')));
    gleich("keine Kleidung mehr: Personen zählen nicht (0)", await inhalt(page, '[data-u="personen"]'), "0");
    await page.click('[data-bezahlung="teambedarf"] input[value="sponsor"]');
    pruefe("Sponsor: Feld für den Namen erscheint und ist beschriftet", (await inhalt(page, '[data-bezahlung="teambedarf"] [data-sponsor-feld] label')) === "Name des Sponsors");
    await page.click('[data-bezahlung="teambedarf"] input[value="vereinskasse"]');
    pruefe("andere Antwort: Feld für den Namen weg", !(await sichtbar(page, '[data-bezahlung="teambedarf"] [data-sponsor-feld]')));
    pruefe("Personen ohne Artikel erzeugen keine Lücke (nur die Bezahlung ist gewählt, Mannschaft und Name fehlen)", await page.evaluate(async () => { document.getElementById("bst-senden").click(); return [...document.querySelectorAll("[data-luecke]")].every((b) => ["team", "name"].includes(b.dataset.luecke)); }));
    await pruefeLayout(page, "Felder", 390);
    pruefeProtokoll("Felder und Tastatur", p, server);
  } finally {
    await schliessen();
  }
}

// Sonderzeichen in Namen und Texten: nichts wird als HTML gelesen, alles kommt unverändert in die Mail
async function ablaufZeichen(browser, server) {
  abschnitt("390 x 844: Sonderzeichen in Namen und Texten (HTML-Zeichen, Umlaute, Akzente)");
  const { page, p, schliessen } = await oeffne(browser, server, { uhr: [2026, 10, 25, 14, 32] });
  try {
    const name = `<img src=x onerror=__xss=1>Zoë&"Ç"`; // höchstens 40 Zeichen: so viel nimmt das Feld an
    await page.select("#bst-team", "f1");
    await page.type("#bst-name", `Anna <b>Beispiel</b> & Söhne`);
    await page.click("#bst-person-neu");
    await page.type('[data-person="p1"] [data-p="name"]', name);
    await page.select('[data-person="p1"] [data-p="groesse"]', "140");
    await page.click('[data-person="p1"] [data-artikel="trikot"] [data-a="an"]');
    await page.type("#bst-sonstiges", `Tor <script>window.__xss=2</script> & Ersatz "Netz" 50% sicher?=#`);
    await page.click("#bst-senden");
    gleich("Sonderzeichen: Lücke zeigt den Namen als Text", (await page.$$eval("[data-luecke]", (l) => l.map((x) => x.textContent.trim()))).filter((t) => t.includes("Rückennummer")).join("|"), `Bei ${name} fehlt die Rückennummer (Trikot)`);
    gleich("Sonderzeichen: kein Element aus dem Namen entstanden", String(await page.$$eval("[data-bst-luecken] img, [data-bst-luecken] b, .bst-person img, form b, form script", (l) => l.length)), "0");
    gleich("Sonderzeichen: nichts ausgeführt", String(await page.evaluate(() => window.__xss)), "undefined");
    await page.type('[data-person="p1"] [data-p="nummer"]', "7");
    await page.click('[data-bezahlung="kleidung"] input[value="eltern"]');
    await page.click('[data-bezahlung="teambedarf"] input[value="vereinskasse"]');
    const text = await wert(page, "[data-bst-vorschau-text]");
    pruefe("Sonderzeichen: Name unverändert im Text (Druckdaten gibt es beim Trikot nur mit Nummer; intern mit Namen)", text.includes(`- ${name}, Nr. 7, Gr. 140: Trikot = 30 €\n`) && text.includes("Bestellt von: Anna <b>Beispiel</b> & Söhne\n"), text);
    pruefe("Sonderzeichen: Sonstiges unverändert", text.includes(`- Sonstiges: Tor <script>window.__xss=2</script> & Ersatz "Netz" 50% sicher?=#\n`));
    await page.click("#bst-senden");
    const d = dekodiere((await gesendet(page))[0]);
    gleich("Sonderzeichen: mailto hin und zurück (Text)", d.text, text);
    pruefe("Sonderzeichen: der Link enthält keine rohen Sonderzeichen (< > \" & # ? nur kodiert)", (await gesendet(page))[0].slice((await gesendet(page))[0].indexOf("?") + 1).split("&").length === 2 && !/[<>"# ]/.test((await gesendet(page))[0]));
    await page.reload({ waitUntil: "networkidle0" });
    await page.waitForSelector("#bestellung[data-bereit]");
    gleich("Sonderzeichen: nach dem Neuladen derselbe Name im Feld", await wert(page, '[data-p="name"]'), name);
    gleich("Sonderzeichen: nach dem Neuladen nichts ausgeführt", String(await page.evaluate(() => window.__xss)), "undefined");
    pruefeProtokoll("Sonderzeichen", p, server);
  } finally {
    await schliessen();
  }
}

// Lange Bestellung (Hinweis, nie gekürzt), Zwischenablage, Speicher, kaputte Daten
async function ablaufLang(browser, server) {
  abschnitt("390 x 844: lange Bestellung (mailto über 7.500 Zeichen)");
  const { page, p, schliessen } = await oeffne(browser, server, { uhr: [2026, 10, 25, 14, 32] });
  try {
    const viele = [];
    for (let i = 1; i <= 45; i++) viele.push(person("p" + i, "Spieler " + i, String((i % 98) + 1), i % 2 ? "140" : "M", GRUNDAUSSTATTUNG));
    const entwurf = bestellung({ team: "e2", name: "Tina Beispiel", personen: viele, zaehler: 45, bezahlung: { kleidung: "eltern", kleidungSponsor: "", teambedarf: "", teambedarfSponsor: "" } });
    await page.evaluate((k, daten) => localStorage.setItem(k, daten), SCHLUESSEL_ENTWURF, JSON.stringify(entwurf));
    await page.reload({ waitUntil: "networkidle0" });
    await page.waitForSelector("#bestellung[data-bereit]");
    gleich("45 Personen aus dem Speicher geladen", String(await page.$$eval(".bst-person", (l) => l.length)), "45");
    pruefe("lange Bestellung: Hinweis beim Knopf sichtbar", await sichtbar(page, "[data-bst-lang]"));
    gleich("lange Bestellung: Wortlaut des Hinweises", await inhalt(page, "[data-bst-lang]"), TEXT_LANG);
    const mailto = await page.$eval("#bst-senden", (el) => el.dataset.mailto || "");
    pruefe("lange Bestellung: mailto länger als 7.500 Zeichen", mailto.length > 7500, String(mailto.length));
    gleich("lange Bestellung: nichts gekürzt (Text im Link = Text in „Mail ansehen“)", dekodiere(mailto).text, await wert(page, "[data-bst-vorschau-text]"));
    pruefe("lange Bestellung: alle 45 Personen im Text", (dekodiere(mailto).text.match(/^- Spieler \d+, Nr\. /gm) || []).length === 45);
    await page.click("#bst-senden");
    gleich("lange Bestellung: Senden löst den vollständigen mailto aus", String((await gesendet(page))[0] === mailto), "true");
    await pruefeLayout(page, "lange Bestellung", 390);
    pruefeProtokoll("lange Bestellung", p, server);
  } finally {
    await schliessen();
  }
}

async function ablaufKopieren(browser, server) {
  abschnitt("390 x 844: Zwischenablage ohne und mit Rückfall");
  // Rückfall: navigator.clipboard lehnt ab, document.execCommand("copy") klappt
  {
    const { page, p, schliessen } = await oeffne(browser, server, { uhr: [2026, 10, 25, 14, 32], zwischenablage: "rueckfall" });
    try {
      await fuelleFall(page, FALL_A);
      await page.click("#bst-kopieren");
      gleich("Rückfall: markierter Text = Betreff, Leerzeile, Text", await page.evaluate(() => window.__kopiert), kopierText({ betreff: FALL_A.betreff, text: FALL_A.text }));
      gleich("Rückfall: Meldung", await inhalt(page, "[data-bst-meldung]"), "Kopiert.");
      pruefe("Rückfall: kein Rest im Dokument (das unsichtbare Feld ist wieder weg)", await page.evaluate(() => document.querySelectorAll("body > textarea").length === 0));
      pruefeProtokoll("Zwischenablage mit Rückfall", p, server);
    } finally {
      await schliessen();
    }
  }
  // Nichts geht: Meldung, „Mail ansehen“ geht auf, der Text ist markiert
  {
    const { page, p, schliessen } = await oeffne(browser, server, { uhr: [2026, 10, 25, 14, 32], zwischenablage: "nichts" });
    try {
      await fuelleFall(page, FALL_A);
      await page.click("#bst-kopieren");
      gleich("ohne Zwischenablage: Meldung", await inhalt(page, "[data-bst-meldung]"), "Kopieren hat nicht geklappt. Kopiere den Text unter „Mail ansehen“ von Hand.");
      pruefe("ohne Zwischenablage: „Mail ansehen“ ist offen", await page.$eval("[data-bst-vorschau]", (el) => el.open));
      pruefe("ohne Zwischenablage: Fokus im Feld, der ganze Text ist markiert", await page.evaluate(() => { const t = document.querySelector("[data-bst-vorschau-text]"); return document.activeElement === t && t.selectionStart === 0 && t.selectionEnd === t.value.length && t.value.length > 100; }));
      pruefe("ohne Zwischenablage: der Text steht trotzdem unter „Mail ansehen“", (await wert(page, "[data-bst-vorschau-text]")) === FALL_A.text);
      pruefe("ohne Zwischenablage: kein „gesendet“ (es wurde nichts kopiert)", !(await sichtbar(page, "[data-bst-gesendet]")));
      pruefeProtokoll("Zwischenablage ohne alles", p, server);
    } finally {
      await schliessen();
    }
  }
}

async function ablaufSpeicher(browser, server) {
  abschnitt("390 x 844: localStorage wirft Fehler, kaputte gespeicherte Daten");
  for (const [art, name] of [["wirft", "setItem und getItem werfen"], ["zugriff", "der Zugriff auf localStorage wirft"]]) {
    const { page, p, schliessen } = await oeffne(browser, server, { uhr: [2026, 10, 25, 9, 5], speicher: art });
    try {
      pruefe(`${name}: die Seite startet (bereit)`, await page.$eval("#bestellung", (el) => el.hasAttribute("data-bereit")));
      pruefe(`${name}: Hinweis, dass nichts gespeichert wird`, await sichtbar(page, "[data-bst-speicher]"));
      gleich(`${name}: Wortlaut des Hinweises`, await inhalt(page, "[data-bst-speicher]"), "Dein Browser speichert deine Eingaben gerade nicht. Bleib auf dieser Seite, bis du die Mail gesendet hast.");
      await fuelleFall(page, FALL_B);
      await pruefeMail(page, `${name}: Fall (b)`, FALL_B);
      await page.click("#bst-senden");
      const geklickt = await gesendet(page);
      pruefe(`${name}: Senden löst den erwarteten mailto aus`, geklickt.length === 1 && dekodiere(geklickt[0]).text === FALL_B.text);
      pruefe(`${name}: Kasten „gesendet“ und Bestell-Nr.`, (await sichtbar(page, "[data-bst-gesendet]")) && (await inhalt(page, "[data-bst-nr]")) === "G-JUGEND-261125-0905");
      // Personen anlegen, entfernen, Neue Bestellung: alles ohne Speicher
      await page.click("#bst-person-neu");
      await page.click("#bst-person-neu");
      await page.click(`${"[data-person=\"p1\"]"} [data-person-entfernen]`);
      gleich(`${name}: Person entfernen`, String(await page.$$eval(".bst-person", (l) => l.length)) + "|" + (await page.evaluate(() => document.activeElement.id)), "1|bst-person-neu");
      await page.click("[data-bst-neu]");
      gleich(`${name}: Neue Bestellung ohne Speicher: leer`, String(await page.$$eval(".bst-person", (l) => l.length)) + "|" + String(await sichtbar(page, "[data-bst-gesendet]")), "0|false");
      await page.reload({ waitUntil: "networkidle0" });
      await page.waitForSelector("#bestellung[data-bereit]");
      gleich(`${name}: nach dem Neuladen ist nichts gespeichert`, [await wert(page, "#bst-name"), String(await page.$$eval(".bst-person", (l) => l.length))].join("|"), "|0");
      pruefe(`${name}: Absender nicht gespeichert, Seite leer, aber nutzbar`, (await wert(page, "#bst-team")) === "" && (await sichtbar(page, "#bst-person-neu")));
      pruefeProtokoll(name, p, server);
    } finally {
      await schliessen();
    }
  }
  // Kaputte Daten im Speicher
  const { page, p, schliessen } = await oeffne(browser, server);
  try {
    for (const [name, roh] of [["kein JSON", "{kaputt"], ["JSON der falschen Art", "[1,2,3]"], ["Zahl", "42"]]) {
      await page.evaluate((k1, k2, r) => { localStorage.setItem(k1, r); localStorage.setItem(k2, r); }, SCHLUESSEL_ENTWURF, SCHLUESSEL_ABSENDER, roh);
      await page.reload({ waitUntil: "networkidle0" });
      await page.waitForSelector("#bestellung[data-bereit]");
      gleich(`kaputter Speicher (${name}): leere Seite`, [await wert(page, "#bst-team"), await wert(page, "#bst-name"), String(await page.$$eval(".bst-person", (l) => l.length))].join("|"), "||0");
    }
    // Verändert und halb gültig: nur das Gültige bleibt
    await page.evaluate((k) => localStorage.setItem(k, JSON.stringify({ team: "d3", name: "Lena", personen: [{ id: "p1", name: "Mia", groesse: "999", artikel: { trikot: {}, mantel: {} } }], teambedarf: { baelle: { n: 7 } } })), SCHLUESSEL_ENTWURF);
    await page.reload({ waitUntil: "networkidle0" });
    await page.waitForSelector("#bestellung[data-bereit]");
    gleich("halb gültiger Speicher: Mannschaft, Name, Person, Bälle", [await wert(page, "#bst-team"), await wert(page, "#bst-name"), await wert(page, '[data-p="name"]'), await wert(page, '[data-p="groesse"]'), String(await page.$$eval('[data-a="an"]:checked', (l) => l.length)), await wert(page, '[data-teamposten="baelle"] [data-n]')].join("|"), "d3|Lena|Mia||1|7");
    pruefeProtokoll("kaputte Daten im Speicher", p, server);
  } finally {
    await schliessen();
  }
}

// Ein Durchlauf bei 1440 x 900
async function ablaufDesktop(browser, server) {
  abschnitt("1440 x 900: Referenzbestellung und Torwartset am Rechner");
  const { page, p, schliessen } = await oeffne(browser, server, { breite: 1440, hoehe: 900, mobil: false, uhr: [2026, 10, 25, 14, 32] });
  try {
    await pruefeLayout(page, "1440 leer", 1440);
    await fuelleFall(page, FALL_A);
    await pruefeMail(page, "1440: Referenzbestellung (a)", FALL_A);
    const breite = await page.$eval(".bst", (el) => Math.round(el.getBoundingClientRect().width));
    pruefe(`1440: schmale Spalte (${breite} px, höchstens 720)`, breite <= 720 && breite >= 600, String(breite));
    pruefe("1440: die Spalte steht mittig", await page.evaluate(() => { const r = document.querySelector(".bst").getBoundingClientRect(); return Math.abs(r.left - (window.innerWidth - r.right)) <= 2; }));
    await pruefeLayout(page, "1440 ausgefüllt", 1440);
    await pruefeBeschriftungen(page, "1440 ausgefüllt");
    await pruefeAxe(page, "1440 ausgefüllt");
    await foto(page, "1440-ausgefuellt.png");
    await page.click("#bst-senden");
    pruefe("1440: Senden löst den erwarteten mailto aus", (await gesendet(page)).length === 1 && dekodiere((await gesendet(page))[0]).text === FALL_A.text);
    // Tastatur am Rechner: Enter in einem Textfeld lädt die Seite nicht neu
    await page.focus("#bst-name");
    await page.keyboard.press("Enter");
    pruefe("1440: Enter in einem Textfeld ändert nichts (kein Neuladen, kein Absenden)", (await wert(page, "#bst-name")) === "Lena Beispiel" && (await page.url()) === server.seite && (await gesendet(page)).length === 1);
    await pruefeTippflaechen(page, "1440 ausgefüllt");
    pruefeProtokoll("1440", p, server);
  } finally {
    await schliessen();
  }
  // Torwartset am Rechner, in einem neuen Kontext
  const zweiter = await oeffne(browser, server, { breite: 1440, hoehe: 900, mobil: false, uhr: [2026, 10, 25, 18, 7] });
  try {
    await fuelleFall(zweiter.page, FALL_C);
    await pruefeMail(zweiter.page, "1440: Torwartset (c)", FALL_C);
    await foto(zweiter.page, "1440-torwartset.png");
    pruefeProtokoll("1440 Torwartset", zweiter.p, server);
  } finally {
    await zweiter.schliessen();
  }
}

// ---------- Start ----------

async function main() {
  mkdirSync(AUSGABE, { recursive: true });
  for (const n of readdirSync(AUSGABE)) {
    if (n.endsWith(".png")) rmSync(path.join(AUSGABE, n));
  }
  rmSync(path.join(AUSGABE, "streifen"), { recursive: true, force: true });
  if (!existsSync(path.join(DOCS, "ws", "bestellung.html"))) {
    console.error("docs/ws/bestellung.html fehlt – zuerst bauen: npm run build");
    process.exit(1);
  }
  statisch();
  const server = await starteTestserver();
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-first-run"] });
  try {
    await ablaufLeer(browser, server);
    await ablaufReferenz(browser, server);
    await ablaufFaelleBC(browser, server);
    await ablaufLuecken(browser, server);
    await ablaufFelder(browser, server);
    await ablaufZeichen(browser, server);
    await ablaufLang(browser, server);
    await ablaufKopieren(browser, server);
    await ablaufSpeicher(browser, server);
    await ablaufDesktop(browser, server);
    abschnitt("Bildschirmfotos");
    for (const n of ["390-leer.png", "390-ausgefuellt.png", "390-luecken.png", "390-gesendet.png", "1440-ausgefuellt.png"]) {
      const voll = path.join(AUSGABE, n);
      pruefe(`Bildschirmfoto ${n}`, existsSync(voll) && statSync(voll).size > 5000, voll);
    }
  } finally {
    await browser.close();
    await server.schliessen();
  }
  console.log("");
  if (fehler.length) {
    console.log(`e2e: ${anzahl} Prüfungen, ${fehler.length} FEHLER`);
    process.exit(1);
  }
  console.log(`e2e: ${anzahl} Prüfungen, alle bestanden (Bildschirmfotos: ${path.relative(ROOT, AUSGABE)}/)`);
  // Ausdrücklich beenden: Chrome startet unter macOS manchmal den Google-Updater, der die Ausgabekanäle des Tests geerbt hat und
  // den Node-Prozess sonst minutenlang am Leben hält, obwohl alles fertig ist.
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
