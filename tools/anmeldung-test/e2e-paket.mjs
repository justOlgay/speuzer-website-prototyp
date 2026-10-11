#!/usr/bin/env node
// Ende-zu-Ende-Test der Live-Fassung des Anmelde-Assistenten im appack-Paket (Livegang, Arbeitspaket M6).
//
// Geprüft wird das Paket, nicht die Begleitseite: dist/appack-paket/web/anmeldung.html mit allen Dateien aus dem Ordner
// web/ (anmeldung-*.js, anmeldung.css, Base64-Module für Schrift und Vordrucke). Der Test liefert das Paket lokal unter
// demselben Pfad aus wie das CDN (/sportfreunde04/workspace/web/…, Content-Type wie bei cdn.appack.de: .html ohne charset,
// .js als application/javascript) und fängt Anfragen an GitHub Pages ab (Schriften, Logos der Seitenköpfe): Sie werden aus
// docs/assets beantwortet; jeder andere fremde Host ist ein Fehler.
//
// Voraussetzung: ein Bau mit eingeschaltetem Schalter ANMELDUNG_LIVE (src/vorlagen/hilfen.mjs):
//   ANMELDUNG_LIVE=1 sh tools/cache/bau-sperre.sh build      (danach zurück: sh tools/cache/bau-sperre.sh build)
// Ohne Schalter hat das Paket keine Seite anmeldung.html, der Test bricht dann mit einer klaren Meldung ab.
// --paket=<Ordner> oder PAKET_WEB_DIR=<Ordner> prüft einen anderen Ordner (zum Beispiel eine Kopie von dist/appack-paket/web).
//
// Abläufe (je 390 x 844, Touch, echte Eingabe wie eine Familie; Beispiel-Knöpfe gibt es auf der Live-Seite nicht):
//   Kind neu, Wechsel Hessen, Karneval Kind, Herren (Erwachsener wechselt) – je auf Deutsch und auf Englisch, bis zum fertigen PDF:
//   Seitenzahl > 0, keine Anfrage mit Status ab 400, keine Fehler und keine fehlenden Texte in der Konsole, Dateiname nach
//   dem Muster, Name im PDF-Text, kein "Entwurf"/"Prototyp"/"Vorführung" im PDF-Text (poppler: pdfinfo, pdftotext).
//   Dazu einmal mit ?app=1 (Klasse app-modus, Hinweis "Im Browser öffnen", Link nach außen als ext://).
//   Die Seite selbst: nur Deutsch und Englisch in der Sprachwahl, kein Entwurfs-Band, kein Werkzeugkasten, kein noindex,
//   kein Rahmen der Begleitseite, kein Knopf "Vorführung", Titel ohne "Entwurf"; axe-core ohne Verstöße "critical" und
//   "serious" auf der Startseite, einer Frage und der Fertig-Seite.
//   "Mitglied werden": Hauptknopf "Schritt für Schritt anmelden" (Web und App), Nebenwege bleiben, der Link führt auf die Seite.
//   Module: Die Module im Paket (ohne Kommentare, umbenannt) liefern dieselben Ergebnisse wie die Quellen
//   (Regelwerk für fünf Beispiele, PDF Byte für Byte, Schrift und Vordrucke aus den Base64-Modulen, Texte).
// Bildschirmfotos (390 px) nach tools/cache/orchestrierung-anmeldung/pruefung/m6/.
//
// Aufruf: node tools/anmeldung-test/e2e-paket.mjs [--paket=<Ordner>] [--schnell] [--ohne-module] [--sprachen=de,en] [--cdn]
//   --schnell: nur "Kind neu" (de) und der Lauf mit ?app=1.
//   --sprachen: Sprachen, die das Paket anbieten soll (Standard de,en); für ein Paket mit weiteren Sprachen (Bau mit
//   ANMELDUNG_SPRACHEN_LIVE=de,en,tr,ar) prüft der Test zusätzlich, dass sich jede davon wählen lässt.
//   --cdn: statt des lokalen Servers die Seiten auf https://cdn.appack.de/sportfreunde04/workspace/web/ prüfen (nach dem
//   Einspielen in das CMS; nur Lesezugriffe, die Eingaben bleiben im Browser). --paket bleibt der Ordner mit dem
//   Soll-Stand (Module und Konfiguration werden damit verglichen).
// Ausgabe: eine Zeile je Prüfung; Exit 0 nur, wenn alles bestanden ist.

import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import puppeteer from "puppeteer-core";
import * as PDFLib from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const AXE = fs.readFileSync(path.join(ROOT, "node_modules", "axe-core", "axe.min.js"), "utf8");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const argWert = (name) => (process.argv.find((a) => a.startsWith("--" + name + "=")) || "").slice(name.length + 3);
const PAKET = path.resolve(argWert("paket") || process.env.PAKET_WEB_DIR || path.join(ROOT, "dist", "appack-paket", "web"));
const SCHNELL = process.argv.includes("--schnell");
const CDN = process.argv.includes("--cdn");
const ERWARTETE_SPRACHEN = (argWert("sprachen") || "de,en").split(",");
const OHNE_MODULE = process.argv.includes("--ohne-module");
const FOTOS = path.join(ROOT, "tools", "cache", "orchestrierung-anmeldung", "pruefung", "m6", process.argv.includes("--cdn") ? "cdn" : ".");
const AUSGABE = path.join(ROOT, "tools", "cache", "anmeldung-test", "e2e-paket");
const DATEIEN = path.join(AUSGABE, "dateien");
const PREFIX = "/sportfreunde04/workspace/web/";
const GH_ASSETS = "https://justolgay.github.io/speuzer-website-prototyp/assets/";
const HEUTE = "2026-09-29";
const MOBIL = { name: "390x844", breite: 390, hoehe: 844, mobil: true };
const VERBOTEN_IM_PDF = /Entwurf|Entw[uü]rfe|Prototyp|Vorf[uü]hr|Testumgebung/;

// ---------- Ergebnisse ----------

let fehlerAnzahl = 0;
let pruefungen = 0;
function ok(name, bedingung, detail) {
  pruefungen++;
  if (!bedingung) fehlerAnzahl++;
  console.log((bedingung ? "OK      " : "FEHLER  ") + name + (detail ? " – " + detail : ""));
  return !!bedingung;
}
const info = (text) => console.log("        " + text);
const warte = (ms) => new Promise((r) => setTimeout(r, ms));
const sha256 = (daten) => createHash("sha256").update(daten).digest("hex");

function hole(objekt, pfad) {
  let x = objekt;
  for (const teil of String(pfad).split(".")) {
    if (x === null || x === undefined) return undefined;
    x = x[teil];
  }
  return x;
}

// ---------- Server (wie das CDN) ----------

const MIME = { ".html": "text/html", ".css": "text/css", ".js": "application/javascript" };
const MIME_ASSETS = { ".woff2": "font/woff2", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".css": "text/css", ".ico": "image/x-icon" };

function starteServer() {
  if (CDN) return Promise.resolve({ server: { close() {} }, port: 443, anfragen: [], basis: "https://cdn.appack.de" });
  const anfragen = []; // { pfad, status }
  const server = createServer((req, res) => {
    const pfad = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    let status = 404;
    let inhalt = null;
    let datei = null;
    if (pfad.startsWith(PREFIX)) {
      const voll = path.join(PAKET, pfad.slice(PREFIX.length));
      if (voll.startsWith(PAKET + path.sep) && fs.existsSync(voll) && fs.statSync(voll).isFile()) {
        datei = voll;
        inhalt = fs.readFileSync(voll);
        status = 200;
      }
    }
    anfragen.push({ pfad, status });
    if (status !== 200) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Nicht gefunden");
      return;
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(datei)] || "application/octet-stream", "Cache-Control": "public,no-cache" });
    res.end(inhalt);
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve({ server, port: server.address().port, anfragen, basis: "http://localhost:" + server.address().port }));
  });
}

// ---------- Browser ----------

const UHR = `(() => {
  const feste = new Date("2026-09-29T10:00:00").getTime();
  const Echt = Date;
  class Uhr extends Echt {
    constructor(...a) { if (a.length === 0) super(feste); else super(...a); }
    static now() { return feste; }
  }
  window.Date = Uhr;
})();`;

// Neue Seite im Handy-Format. Alle Anfragen laufen durch den Test: eigener Server weiter, GitHub Pages (Assets) aus docs/assets,
// alles andere abgelehnt und als fremder Host gemeldet.
async function neueSeite(srv, browser, name, datei, abfrage, vorLaden) {
  const page = await browser.newPage();
  await page.setViewport({ width: MOBIL.breite, height: MOBIL.hoehe, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await page.evaluateOnNewDocument(UHR);
  const st = { name, konsole: [], textFehlt: [], fremd: [], fehlerAntworten: [], hosts: new Set(), dialoge: 0 };
  page.__st = st;
  page.on("console", (m) => {
    const t = m.text();
    if (m.type() === "error") st.konsole.push("console.error: " + t);
    if (m.type() === "warning" && /Text fehlt/.test(t)) st.textFehlt.push(t);
  });
  page.on("pageerror", (e) => st.konsole.push("pageerror: " + e.message));
  page.on("response", (r) => {
    if (r.status() >= 400) st.fehlerAntworten.push(r.status() + " " + r.url());
  });
  page.on("dialog", (d) => {
    st.dialoge++;
    d.accept();
  });
  await page.setRequestInterception(true);
  page.on("request", (r) => {
    const u = r.url();
    if (u.startsWith(srv.basis + "/")) {
      st.hosts.add("localhost (Paket)");
      return r.continue();
    }
    if (u.startsWith("data:") || u.startsWith("blob:") || u.startsWith("about:")) return r.continue();
    if (u.startsWith(GH_ASSETS)) {
      st.hosts.add("justolgay.github.io (nur assets, lokal beantwortet)");
      const lokal = path.join(ROOT, "docs", "assets", decodeURIComponent(new URL(u).pathname.replace("/speuzer-website-prototyp/assets/", "")));
      if (fs.existsSync(lokal) && fs.statSync(lokal).isFile()) {
        return r.respond({ status: 200, headers: { "Access-Control-Allow-Origin": "*" }, contentType: MIME_ASSETS[path.extname(lokal)] || "application/octet-stream", body: fs.readFileSync(lokal) });
      }
      st.fehlerAntworten.push("404 (lokal) " + u);
      return r.respond({ status: 404, body: "nicht da" });
    }
    st.fremd.push(u);
    st.hosts.add(new URL(u).host);
    return r.abort("blockedbyclient");
  });
  if (vorLaden) await vorLaden(page);
  const url = srv.basis + PREFIX + datei + (abfrage || "");
  const antwort = await page.goto(url, { waitUntil: "networkidle0" });
  if (!antwort || antwort.status() >= 400) {
    const status = antwort ? antwort.status() : "keine Antwort";
    await page.close();
    throw new Error("HTTP " + status + " für " + url);
  }
  return page;
}

async function amStart(srv, browser, name, abfrage, vorLaden) {
  const page = await neueSeite(srv, browser, name, "anmeldung.html", abfrage, vorLaden);
  await page.waitForSelector("#anmeldung[data-bereit]", { timeout: 15000 });
  return page;
}

// ---------- Eingabe (wie tools/anmeldung-test/e2e.mjs, Modus "eingabe") ----------

const stand = (page) => page.$eval("#anmeldung", (e) => ({ schritt: e.dataset.schritt, teil: e.dataset.teil }));

async function warteAufStand(page, vorher, timeout = 8000) {
  try {
    await page.waitForFunction(
      (v) => {
        const w = document.getElementById("anmeldung");
        const box = w.querySelector(".anm-fehlerbox");
        return w.dataset.schritt !== v.schritt || w.dataset.teil !== v.teil || (box && !box.hidden);
      },
      { timeout },
      vorher
    );
    return true;
  } catch (e) {
    return false;
  }
}

const fehlerTexte = (page) =>
  page.evaluate(() => {
    const box = document.querySelector("#anmeldung .anm-fehlerbox");
    if (!box || box.hidden) return [];
    return Array.from(box.querySelectorAll("li")).map((li) => li.textContent.trim());
  });

async function klickeWeiter(page, vorher) {
  const knopf = await page.$('#anmeldung [data-aktion="weiter"]');
  if (!knopf) return { gewechselt: false, fehler: ["kein Weiter-Knopf"] };
  await knopf.evaluate((e) => e.scrollIntoView({ block: "center" }));
  await knopf.click();
  await warteAufStand(page, vorher);
  const nachher = await stand(page);
  return { gewechselt: nachher.schritt !== vorher.schritt || nachher.teil !== vorher.teil, fehler: await fehlerTexte(page) };
}

async function fuelleSeite(page, profil) {
  for (let runde = 0; runde < 6; runde++) {
    const felder = await page.evaluate(() => {
      const aus = [];
      let n = 0;
      for (const el of document.querySelectorAll("#anmeldung form [data-pfad]")) {
        if (el.closest("[hidden]")) continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        const id = "e2e-" + n++;
        el.setAttribute("data-e2e", id);
        aus.push({ id, tag: el.tagName, typ: el.type, pfad: el.getAttribute("data-pfad"), wert: el.getAttribute("data-wert"), checked: !!el.checked, value: el.value, elId: el.id });
      }
      return aus;
    });
    let geaendert = false;
    for (const f of felder) {
      const sel = '[data-e2e="' + f.id + '"]';
      const pfad = f.pfad;
      let soll;
      const datumTeil = /^(.*)\.(t|m|j)$/.exec(pfad);
      if (datumTeil && f.typ === "text" && typeof hole(profil, datumTeil[1]) === "string" && /^\d{4}-\d{2}-\d{2}$/.test(hole(profil, datumTeil[1]))) {
        const [j, m, t] = hole(profil, datumTeil[1]).split("-");
        soll = { t, m, j }[datumTeil[2]];
      } else soll = hole(profil, pfad);
      if (soll === undefined || soll === null) continue;
      if (f.typ === "radio") {
        if (String(soll) === f.wert && !f.checked) {
          await page.click('label[for="' + f.elId + '"]');
          geaendert = true;
        }
      } else if (f.typ === "checkbox") {
        const gewuenscht = f.wert !== null ? Array.isArray(soll) && soll.includes(f.wert) : soll === true;
        if (gewuenscht !== f.checked) {
          await page.click('label[for="' + f.elId + '"]');
          geaendert = true;
        }
      } else if (f.tag === "SELECT") {
        if (f.value !== String(soll)) {
          await page.select(sel, String(soll));
          geaendert = true;
        }
      } else {
        const gleich = pfad.endsWith("iban") ? f.value.replace(/\s/g, "") === String(soll) : f.value === String(soll);
        if (!gleich) {
          await page.click(sel, { clickCount: 3 });
          await page.keyboard.press("Backspace");
          if (String(soll) !== "") await page.keyboard.type(String(soll));
          geaendert = true;
        }
      }
    }
    if (Array.isArray(profil.staaten) && (await page.$('[data-aktion="staat-hinzu"]'))) {
      const zeilen = await page.$$eval('#anmeldung select[data-pfad^="staaten."]', (l) => l.length);
      if (zeilen < profil.staaten.length) {
        await page.click('[data-aktion="staat-hinzu"]');
        geaendert = true;
      }
    }
    if (!geaendert) break;
  }
}

async function zeichne(page, canvas) {
  await canvas.evaluate((e) => e.scrollIntoView({ block: "center" }));
  const box = await canvas.boundingBox();
  const p = [];
  for (let i = 0; i <= 14; i++) p.push({ x: box.x + 24 + (i * (box.width - 48)) / 14, y: box.y + box.height * (0.45 + 0.25 * Math.sin(i * 1.3)) });
  const finger = await page.touchscreen.touchStart(p[0].x, p[0].y);
  for (const q of p.slice(1)) await finger.move(q.x, q.y);
  await finger.end();
}

async function unterschreiben(page) {
  const haken = await page.$('#anmeldung input[data-pfad="satzung"]');
  if (haken && !(await haken.evaluate((e) => e.checked))) {
    const id = await haken.evaluate((e) => e.id);
    await page.click('#anmeldung label[for="' + id + '"]');
  }
  const felder = await page.$$eval("#anmeldung .anm-unterschrift", (l) => l.map((e) => e.getAttribute("data-unterschrift")));
  for (const wer of felder) await zeichne(page, await page.$('#anmeldung .anm-unterschrift[data-unterschrift="' + wer + '"] canvas'));
  await page.waitForFunction((n) => document.querySelectorAll("#anmeldung .anm-unterschrift--fertig").length >= n, { timeout: 5000 }, felder.length).catch(() => {});
}

async function nachweiseHochladen(page, dateien) {
  const ids = await page.$$eval("#anmeldung section[data-unterlage]", (l) => l.map((e) => e.getAttribute("data-unterlage")));
  let n = 0;
  for (const uid of ids) {
    const abschnitt = '#anmeldung section[data-unterlage="' + uid + '"]';
    const eingabe = await page.$(abschnitt + ' input[data-pfad="nachweise.' + uid + '"][data-wert="habe"]');
    await page.click('label[for="' + (await eingabe.evaluate((e) => e.id)) + '"]');
    const art = n % 2 === 0 ? "nachweis-foto" : "nachweis-datei";
    await (await page.$(abschnitt + ' input[data-aktion="' + art + '"]')).uploadFile(n % 2 === 0 ? dateien.foto : dateien.pdf);
    await page.waitForSelector(abschnitt + " .anm-dateien__eintrag", { timeout: 8000 });
    n++;
  }
}

async function spielerfotoHochladen(page, profil, dateien) {
  const weg = profil.spielerfoto && profil.spielerfoto.weg;
  if (weg !== "foto" && weg !== "datei") return;
  await (await page.$('#anmeldung input[data-aktion="spielerfoto-' + (weg === "foto" ? "machen" : "waehlen") + '"]')).uploadFile(dateien.foto);
  await page.waitForSelector("#anmeldung .anm-vorschau-foto:not([hidden])", { timeout: 8000 });
}

// Alle Seiten bis "fertig". foto(page, schritt): Bildschirmfoto an einem Schritt (optional).
async function laufe(page, profil, dateien, foto) {
  const besucht = [];
  for (let i = 0; i < 90; i++) {
    const s = await stand(page);
    besucht.push(s.schritt + "/" + s.teil);
    if (foto) await foto(page, s);
    if (s.schritt === "fertig") return { besucht, ende: "fertig" };
    await fuelleSeite(page, profil);
    if (s.schritt === "unterschriften") await unterschreiben(page);
    if (s.schritt === "spielerfoto") await spielerfotoHochladen(page, profil, dateien);
    if (s.schritt === "nachweise") await nachweiseHochladen(page, dateien);
    const r = await klickeWeiter(page, s);
    if (r.fehler.length) return { besucht, ende: "fehler", fehler: r.fehler, schritt: s.schritt + "/" + s.teil };
    if (!r.gewechselt) return { besucht, ende: "haengt", schritt: s.schritt + "/" + s.teil };
  }
  return { besucht, ende: "zu lang" };
}

// ---------- Datei und PDF ----------

async function ladeDownload(browser, page, ordner) {
  const ziel = path.join(AUSGABE, ordner);
  fs.rmSync(ziel, { recursive: true, force: true });
  fs.mkdirSync(ziel, { recursive: true });
  const sitzung = await browser.target().createCDPSession();
  await sitzung.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: ziel });
  const knopf = await page.$('#anmeldung [data-aktion="herunterladen"]');
  if (!knopf) {
    await sitzung.detach();
    return null;
  }
  await knopf.evaluate((e) => e.scrollIntoView({ block: "center" }));
  await knopf.click();
  let datei = null;
  for (let i = 0; i < 60 && !datei; i++) {
    const l = fs.readdirSync(ziel).filter((f) => f.endsWith(".pdf"));
    if (l.length) datei = path.join(ziel, l[0]);
    else await warte(250);
  }
  await sitzung.detach();
  return datei;
}

function poppler(befehl, argumente) {
  const r = spawnSync(befehl, argumente, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  if (r.error) throw new Error(befehl + " lässt sich nicht starten (poppler installiert?): " + r.error.message);
  return r.stdout;
}

// Wartet auf die fertige Datei, lädt sie herunter und prüft sie. Ergebnis: { seiten, text, name } oder null.
async function dateiPruefen(browser, page, name, profil) {
  try {
    await page.waitForFunction(() => document.querySelector('#anmeldung [data-status="fertig"], #anmeldung [data-status="fehler"]'), { timeout: 60000 });
  } catch (e) {
    ok(name + ": Datei wird erstellt", false, "Zeitüberschreitung");
    return null;
  }
  const status = await page.$eval("#anmeldung [data-status]", (e) => e.getAttribute("data-status"));
  if (status !== "fertig") {
    ok(name + ": Datei erstellt", false, (await page.$eval("#anmeldung", (e) => e.innerText.slice(0, 300))).replace(/\s+/g, " "));
    return null;
  }
  const datei = await ladeDownload(browser, page, "download-" + name.replace(/[^a-z0-9]+/gi, "-"));
  if (!ok(name + ": PDF lässt sich herunterladen", !!datei, datei ? path.basename(datei) : "kein Download")) return null;
  const bytes = fs.readFileSync(datei);
  const seiten = Number((/^Pages:\s*(\d+)/m.exec(poppler("pdfinfo", [datei])) || [])[1]);
  const text = poppler("pdftotext", ["-layout", datei, "-"]);
  const norm = text.replace(/\s+/g, " ");
  ok(name + ": PDF erzeugt (Kopf %PDF, Seitenzahl > 0)", bytes.subarray(0, 5).toString() === "%PDF-" && seiten > 0, seiten + " Seiten, " + Math.round(bytes.length / 1024) + " KB");
  const sollName = "Anmeldung_" + profil.nachname + "_" + profil.vorname + ".pdf";
  ok(name + ": Dateiname " + sollName, path.basename(datei) === sollName, path.basename(datei));
  ok(name + ": Name steht im PDF-Text", norm.includes(profil.vorname) && norm.includes(profil.nachname));
  const treffer = norm.match(new RegExp(VERBOTEN_IM_PDF.source, "g")) || [];
  ok(name + ": kein Hinweis auf Entwurf, Prototyp oder Vorführung im PDF-Text", treffer.length === 0, treffer.slice(0, 3).join(", "));
  return { seiten, text, name: path.basename(datei) };
}

// axe-core auf der aktuellen Ansicht: keine Verstöße "critical" und "serious"
async function axePruefen(page, name) {
  if (await page.evaluate(() => typeof window.axe === "undefined")) await page.evaluate(AXE);
  const verstoesse = await page.evaluate(async () => {
    const r = await window.axe.run(document, { resultTypes: ["violations"] });
    return r.violations.map((v) => ({ id: v.id, impact: v.impact, ziele: v.nodes.slice(0, 2).map((n) => n.target.join(" ")) }));
  });
  const schwer = verstoesse.filter((v) => v.impact === "critical" || v.impact === "serious");
  ok(name + ": axe-core ohne Verstöße critical/serious", schwer.length === 0, schwer.map((v) => v.impact + " " + v.id + " " + v.ziele.join(" | ")).join("; "));
}

function seitenFehler(page, name) {
  const st = page.__st;
  ok(name + ": keine Anfrage mit Status ab 400", st.fehlerAntworten.length === 0, st.fehlerAntworten.slice(0, 3).join(" | "));
  ok(name + ": keine Fehler in der Konsole", st.konsole.length === 0, st.konsole.slice(0, 3).join(" | "));
  ok(name + ": keine fehlenden Texte", st.textFehlt.length === 0, st.textFehlt.slice(0, 3).join(" | "));
  ok(name + ": keine Anfrage an fremde Hosts", st.fremd.length === 0, st.fremd.slice(0, 3).join(" | "));
}

// ---------- Prüfungen der Seite ----------

async function pruefeSeite(srv, browser, konfigLive) {
  console.log("\n=== Seite anmeldung.html im Paket (390 x 844) ===");
  const page = await amStart(srv, browser, "seite");
  const d = await page.evaluate(() => {
    const sicht = (e) => !!e && e.checkVisibility();
    const knoepfe = Array.from(document.querySelectorAll("[data-anm-sprachleiste] [data-sprache]")).map((b) => b.getAttribute("data-sprache"));
    const optionen = Array.from(document.querySelectorAll("#anm-sprache option")).map((o) => o.value);
    return {
      titel: document.title,
      beschreibung: (document.querySelector('meta[name="description"]') || {}).content || "",
      robots: document.querySelector('meta[name="robots"]') ? document.querySelector('meta[name="robots"]').content : null,
      h1: Array.from(document.querySelectorAll("h1")).map((h) => h.textContent.trim()),
      knoepfe,
      optionen,
      band: !!document.querySelector("[data-anm-band]"),
      werkzeuge: !!document.querySelector("[data-anm-werkzeuge], [data-anm-vorfuehrung], [data-anm-vereinssicht], [data-beispiel]"),
      kopf: sicht(document.querySelector(".begleit-kopf")) || !!document.querySelector(".begleit-kopf"),
      konzeptLink: !!document.querySelector('a[href*="anmeldung-konzept"]'),
      sprachleiste: sicht(document.querySelector("[data-anm-sprachleiste]")),
      appHinweisSichtbar: sicht(document.querySelector("[data-anm-apphinweis]")),
      querScroll: document.documentElement.scrollWidth > window.innerWidth,
      hoeheH2: Math.round((document.querySelector("#anm-titel") || { getBoundingClientRect: () => ({ height: 0 }) }).getBoundingClientRect().height),
      html: document.documentElement.outerHTML,
    };
  });
  ok("Titel ohne Entwurf", d.titel === "Anmeldung – FFV Sportfreunde 04", d.titel);
  ok("Beschreibung ohne Entwurf, nicht leer", d.beschreibung.length > 50 && !/Entwurf/.test(d.beschreibung), d.beschreibung.length + " Zeichen");
  ok("kein noindex (kein meta robots)", d.robots === null, String(d.robots));
  ok("genau eine Überschrift h1", d.h1.length === 1 && d.h1[0] === "Anmelden beim FFV Sportfreunde 04", JSON.stringify(d.h1));
  const soll = JSON.stringify(ERWARTETE_SPRACHEN);
  ok("Sprachwahl oben: genau die Live-Sprachen " + ERWARTETE_SPRACHEN.join(", ") + (soll === '["de","en"]' ? " (nur Deutsch und Englisch)" : ""), JSON.stringify(d.knoepfe) === JSON.stringify(konfigLive.sprachen) && JSON.stringify(d.knoepfe) === soll, JSON.stringify(d.knoepfe));
  ok("Sprachwahl im Assistenten: dieselben Sprachen", JSON.stringify(d.optionen) === soll, JSON.stringify(d.optionen));
  ok("kein Entwurfs-Band, kein Werkzeugkasten, kein Knopf „Vorführung“, keine Beispiel-Knöpfe, kein Knopf für die Vereinssicht", !d.band && !d.werkzeuge);
  ok("kein Rahmen der Begleitseite und kein Link zum Konzept", !d.kopf && !d.konzeptLink);
  ok("Sprachwahl sichtbar, Hinweis für die App ohne ?app=1 nicht", d.sprachleiste && !d.appHinweisSichtbar);
  ok("kein Querscrollen bei 390 px", !d.querScroll);
  const woerter = d.html.replace(/https:\/\/justolgay\.github\.io\/speuzer-website-prototyp\/assets\/[^"' )]+/g, "");
  const treffer = woerter.match(/Prototyp|Entwurf|Entw[uü]rfe|Vorf[uü]hr|justolgay|github/g) || [];
  ok("im DOM der Seite keine Wörter wie Prototyp, Entwurf, Vorführung, github (Adressen der gemeinsamen Assets ausgenommen)", treffer.length === 0, [...new Set(treffer)].join(", "));
  await page.screenshot({ path: path.join(FOTOS, "start-390.png"), fullPage: true });
  await axePruefen(page, "Startseite");
  // Wechsel auf Englisch: die Seite folgt, Arabisch und Türkisch gibt es nicht
  await page.click('[data-anm-sprachleiste] [data-sprache="en"]');
  await page.waitForFunction(() => document.getElementById("anmeldung").getAttribute("data-sprache") === "en", { timeout: 8000 });
  const en = await page.evaluate(() => ({ h1: document.querySelector("h1").textContent.trim(), lang: document.querySelector("h1").getAttribute("lang") }));
  ok("Englisch: Überschrift übersetzt", en.lang === "en" && en.h1 !== "Anmelden beim FFV Sportfreunde 04", en.h1);
  const sprachenImPaket = ["de", "en", "tr", "ar"].filter((c) => fs.existsSync(path.join(PAKET, "anmeldung-texte-" + c + "-oberflaeche.js")) || fs.existsSync(path.join(PAKET, "anmeldung-texte-" + c + "-regeln.js")));
  ok("Texte im Paket nur für die Live-Sprachen (" + konfigLive.sprachen.join(", ") + ")", JSON.stringify(sprachenImPaket) === JSON.stringify(konfigLive.sprachen), sprachenImPaket.join(", "));
  // Weitere Sprachen (nur in einem Paket, das sie anbietet): wählbar, mit Schreibrichtung, ohne Fehler
  for (const code of konfigLive.sprachen.filter((c) => c !== "de" && c !== "en")) {
    await page.click('[data-anm-sprachleiste] [data-sprache="' + code + '"]');
    await page.waitForFunction((c) => document.getElementById("anmeldung").getAttribute("data-sprache") === c, { timeout: 8000 }, code);
    const w = await page.evaluate(() => ({ dir: document.getElementById("anmeldung").getAttribute("dir"), h1dir: document.querySelector("h1").getAttribute("dir"), h1: document.querySelector("h1").textContent.trim() }));
    ok("Sprache " + code + ": wählbar, Überschrift übersetzt, Schreibrichtung " + w.dir, !!w.h1 && w.h1 !== "Anmelden beim FFV Sportfreunde 04" && w.dir === (code === "ar" ? "rtl" : "ltr") && w.h1dir === w.dir, w.h1);
  }
  ok("Beispiel-Profile nur als leerer Ersatz", fs.statSync(path.join(PAKET, "anmeldung-beispiele.js")).size < 300);
  seitenFehler(page, "Seite");
  await page.close();
}

// ---------- "Mitglied werden" ----------

async function pruefeMitgliedWerden(srv, browser) {
  console.log("\n=== Mitglied werden: Hauptknopf (Web und ?app=1, 390 x 844) ===");
  for (const app of [false, true]) {
    const name = "Mitglied werden " + (app ? "(App, ?app=1)" : "(Web)");
    const page = await neueSeite(srv, browser, name, "mitglied-werden.html", app ? "?app=1" : "");
    await warte(600);
    const d = await page.evaluate(() => {
      const sicht = (e) => !!e && e.checkVisibility();
      const schritt = document.querySelectorAll("ol.schritte > li")[1];
      const links = Array.from(schritt.querySelectorAll("a.knopf")).filter(sicht).map((a) => ({ text: a.textContent.trim(), klasse: a.className, href: a.getAttribute("href"), ziel: a.href }));
      const haupt = links.filter((l) => l.text === "Schritt für Schritt anmelden");
      return { links, haupt, anzahlSichtbar: links.length, querScroll: document.documentElement.scrollWidth > window.innerWidth, text: schritt.innerText.replace(/\s+/g, " ").trim() };
    });
    ok(name + ": genau ein sichtbarer Hauptknopf „Schritt für Schritt anmelden“ (Knopf der ersten Klasse) in Schritt 2", d.haupt.length === 1 && /^knopf$/.test(d.haupt[0].klasse), JSON.stringify(d.haupt));
    ok(name + ": Hauptknopf steht vor den Nebenwegen", d.links[0] && d.links[0].text === "Schritt für Schritt anmelden", d.links.map((l) => l.text).join(" | "));
    const neben = app ? ["Aufnahmeantrag online ausfüllen", "Aufnahmeantrag (PDF)"] : ["Online ausfüllen", "PDF zum Ausdrucken"];
    ok(name + ": Nebenwege bleiben sichtbar und zweitrangig (" + neben.join(", ") + ")", neben.every((t) => d.links.some((l) => l.text === t && /knopf--sekundaer/.test(l.klasse))), d.links.map((l) => l.text + " [" + l.klasse + "]").join(" | "));
    const sollZiel = app ? srv.basis + PREFIX + "anmeldung.html?app=1" : srv.basis + PREFIX + "anmeldung.html";
    ok(name + ": Hauptknopf führt auf anmeldung.html" + (app ? " mit ?app=1" : ""), d.haupt.length === 1 && d.haupt[0].ziel === sollZiel, d.haupt[0] && d.haupt[0].ziel);
    ok(name + ": kein Querscrollen", !d.querScroll);
    const schritte = await page.$("ol.schritte");
    await schritte.screenshot({ path: path.join(FOTOS, "mitglied-werden-" + (app ? "app" : "web") + "-390.png") });
    // Der Link führt auf die Seite, und sie startet
    await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }), page.evaluate(() => Array.from(document.querySelectorAll("ol.schritte > li")[1].querySelectorAll("a.knopf")).find((a) => a.textContent.trim() === "Schritt für Schritt anmelden" && a.checkVisibility()).click())]);
    await page.waitForSelector("#anmeldung[data-bereit]", { timeout: 15000 });
    const erreicht = await page.evaluate(() => ({ pfad: location.pathname + location.search, app: document.documentElement.classList.contains("app-modus") }));
    ok(name + ": Klick öffnet den Assistenten (" + erreicht.pfad + ")", erreicht.pfad === PREFIX + "anmeldung.html" + (app ? "?app=1" : "") && erreicht.app === app, JSON.stringify(erreicht));
    seitenFehler(page, name);
    await page.close();
  }
}

// ---------- Abläufe ----------

const ABLAEUFE = [
  { id: "kind-neu", titel: "Kind neu" },
  { id: "wechsel-hessen", titel: "Wechsel Hessen" },
  { id: "karneval-kind", titel: "Karneval Kind" },
  { id: "herren-wechsel", titel: "Herren" },
];

async function pruefeAblauf(srv, browser, beispiele, konfig, dateien, ablauf, sprache, optionen = {}) {
  const profil = beispiele.beispielAntworten(ablauf.id, HEUTE, konfig);
  const name = ablauf.titel + " (" + sprache + (optionen.app ? ", ?app=1" : "") + ")";
  console.log("\n--- " + name + " ---");
  const page = await amStart(srv, browser, name, optionen.app ? "?app=1" : "");
  if (optionen.app) {
    const d = await page.evaluate(() => {
      const sicht = (e) => !!e && e.checkVisibility();
      const hinweis = document.querySelector("[data-anm-apphinweis]");
      const link = hinweis && hinweis.querySelector("a[data-anm-browserlink]");
      return {
        appKlasse: document.documentElement.classList.contains("app-modus"),
        hinweisSichtbar: sicht(hinweis),
        hinweisText: hinweis ? hinweis.textContent.replace(/\s+/g, " ").trim() : "",
        link: link && { href: link.getAttribute("href"), target: link.getAttribute("target"), rel: link.getAttribute("rel") },
        footer: sicht(document.querySelector(".ws-fuss")),
      };
    });
    const ohneApp = srv.basis + PREFIX + "anmeldung.html";
    ok(name + ": Klasse app-modus am <html>, Hinweis für die App sichtbar", d.appKlasse && d.hinweisSichtbar && /Im Browser öffnen/.test(d.hinweisText), d.hinweisText);
    ok(name + ": „Im Browser öffnen“ führt auf dieselbe Seite ohne ?app=1 (neuer Tab, noopener)", !!d.link && d.link.href === ohneApp && d.link.target === "_blank" && /noopener/.test(d.link.rel || ""), JSON.stringify(d.link));
    // Klick: in der App geht der Link über ext:// nach außen (Capture-Phase; die Navigation selbst wird hier verhindert)
    const nachKlick = await page.evaluate(() => {
      const sperre = (e) => e.preventDefault();
      document.addEventListener("click", sperre);
      const a = document.querySelector("a[data-anm-browserlink]");
      a.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      const erster = { href: a.getAttribute("href"), target: a.getAttribute("target") };
      a.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      const zweiter = a.getAttribute("href");
      document.removeEventListener("click", sperre);
      return { erster, zweiter };
    });
    ok(name + ": Klick auf „Im Browser öffnen“ schreibt den Link auf ext://… um, ohne target, und nur einmal", nachKlick.erster.href === "ext://" + ohneApp && nachKlick.erster.target === null && nachKlick.zweiter === nachKlick.erster.href, JSON.stringify(nachKlick));
    // Der Link ist jetzt umgeschrieben; für den Rest des Laufs zurücksetzen ist nicht nötig.
    await page.screenshot({ path: path.join(FOTOS, "app-start-390.png"), fullPage: false });
  }
  if (sprache === "en") {
    await page.click('[data-anm-sprachleiste] [data-sprache="en"]');
    await page.waitForFunction(() => document.getElementById("anmeldung").getAttribute("data-sprache") === "en", { timeout: 8000 });
  }
  let fotoFrage = false;
  // Die Hinweiskästen "Für den Verein" (Vereinssicht der Begleitseite) bleiben im DOM, dürfen aber auf keiner Seite sichtbar sein.
  const vereinsKaesten = { gesamt: 0, sichtbar: [] };
  const foto = async (p, s) => {
    const k = await p.evaluate(() => ({ gesamt: document.querySelectorAll(".anm-vereinshinweis").length, sichtbar: Array.from(document.querySelectorAll(".anm-vereinshinweis")).filter((e) => e.checkVisibility()).length }));
    vereinsKaesten.gesamt += k.gesamt;
    if (k.sichtbar) vereinsKaesten.sichtbar.push(s.schritt + "/" + s.teil);
    if (ablauf.id !== "kind-neu" || sprache !== "de" || optionen.app) return;
    if (s.schritt === "name" && !fotoFrage) {
      fotoFrage = true;
      await p.screenshot({ path: path.join(FOTOS, "frage-390.png"), fullPage: false });
      await axePruefen(p, "Frage (Name)");
    }
  };
  const r = await laufe(page, profil, dateien, foto);
  ok(name + ": alle Seiten bis „fertig“ (" + r.besucht.length + " Seiten)", r.ende === "fertig", r.ende === "fertig" ? "" : r.ende + " bei " + r.schritt + (r.fehler ? ": " + r.fehler.join(" | ") : ""));
  if (r.ende !== "fertig") {
    await page.screenshot({ path: path.join(AUSGABE, "FEHLER-" + ablauf.id + "-" + sprache + ".png"), fullPage: true });
    seitenFehler(page, name);
    await page.close();
    return;
  }
  ok(name + ": Hinweiskästen „Für den Verein“ auf keiner Seite sichtbar", vereinsKaesten.sichtbar.length === 0, vereinsKaesten.sichtbar.slice(0, 3).join(", ") || vereinsKaesten.gesamt + " im DOM, alle ausgeblendet");
  const ergebnis = await dateiPruefen(browser, page, name, profil);
  if (ablauf.id === "kind-neu" && sprache === "de" && !optionen.app && ergebnis) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: path.join(FOTOS, "fertig-390.png"), fullPage: true });
    await axePruefen(page, "Fertig-Seite");
  }
  if (optionen.app && ergebnis) await page.screenshot({ path: path.join(FOTOS, "app-fertig-390.png"), fullPage: false });
  seitenFehler(page, name);
  await page.close();
}

// ---------- Module im Paket gegen die Quellen (Node, ohne Browser) ----------

const dekodiere = (text) => Uint8Array.from(Buffer.from(text.replace(/\s+/g, ""), "base64"));
const kopie = (x) => JSON.parse(JSON.stringify(x));
const NUR_BEGLEIT = ["seite.titel", "seite.beschreibung", "band", "demo.werkzeugTitel", "demo.vorfuehrung", "demo.vereinssichtTitel", "demo.vereinssichtText", "demo.vereinssichtAn", "demo.vereinssichtAus", "demo.beispieleTitel", "demo.beispieleText", "demo.konzeptLink", "demo.beispielGeladen"];

function loesche(objekt, pfad) {
  const teile = pfad.split(".");
  let x = objekt;
  for (const t of teile.slice(0, -1)) {
    if (!x || typeof x !== "object") return;
    x = x[t];
  }
  if (x && typeof x === "object") delete x[teile[teile.length - 1]];
}

async function pruefeModule(konfigLive, konfigBegleit, beispiele) {
  console.log("\n=== Module im Paket gegen die Quellen (Node) ===");
  const imp = (pfad) => import(pathToFileURL(pfad).href);
  const quellRegeln = await imp(path.join(ROOT, "assets", "js", "anmeldung", "regeln.js"));
  const quellPdf = await imp(path.join(ROOT, "assets", "js", "anmeldung", "pdf.js"));
  const paketRegeln = await imp(path.join(PAKET, "anmeldung-regeln.js"));
  const paketPdf = await imp(path.join(PAKET, "anmeldung-pdf.js"));

  // Texte: Quelle ohne die Begleit-Schlüssel gleich Paket
  for (const sprache of konfigLive.sprachen) {
    for (const art of ["oberflaeche", "regeln"]) {
      const quelle = kopie((await imp(path.join(ROOT, "assets", "js", "anmeldung", "texte", sprache + "-" + art + ".js"))).default);
      const paket = (await imp(path.join(PAKET, "anmeldung-texte-" + sprache + "-" + art + ".js"))).default;
      if (art === "oberflaeche") NUR_BEGLEIT.forEach((p) => loesche(quelle, p));
      ok("Texte " + sprache + "-" + art + ": Paket = Quelle" + (art === "oberflaeche" ? " ohne die Schlüssel der Begleitseite" : ""), isDeepStrictEqual(quelle, paket));
    }
  }

  // Schrift und Vordrucke aus den Base64-Modulen
  const schriftQuelle = fs.readFileSync(path.join(ROOT, "assets", "fonts", "liberation-sans-regular.ttf"));
  const schriftPaket = dekodiere((await imp(path.join(PAKET, konfigLive.quellen.schriftModul))).default);
  ok("Schrift aus anmeldung-schrift.js ist Byte für Byte die TTF-Datei", Buffer.compare(schriftQuelle, Buffer.from(schriftPaket)) === 0, schriftPaket.length + " Byte");
  const vorlagenQuelle = {};
  const vorlagenPaket = {};
  for (const [schluessel, eintrag] of Object.entries(konfigLive.formulare.formulare)) {
    vorlagenQuelle[schluessel] = new Uint8Array(fs.readFileSync(path.join(ROOT, eintrag.datei)));
    vorlagenPaket[schluessel] = dekodiere((await imp(path.join(PAKET, konfigLive.quellen.vorlagenModule[schluessel]))).default);
    ok("Vordruck " + schluessel + " aus dem Base64-Modul: Größe und SHA-256 wie in der Konfiguration", vorlagenPaket[schluessel].length === eintrag.bytes && sha256(vorlagenPaket[schluessel]) === eintrag.sha256 && Buffer.compare(Buffer.from(vorlagenQuelle[schluessel]), Buffer.from(vorlagenPaket[schluessel])) === 0, vorlagenPaket[schluessel].length + " Byte");
  }

  // Regelwerk und PDF für fünf Beispiele
  for (const id of ["kind-neu", "wechsel-hessen", "ausland-kind", "karneval-kind", "herren-wechsel"]) {
    const a = beispiele.beispielAntworten(id, HEUTE, konfigBegleit);
    const e1 = quellRegeln.auswerten(kopie(a), konfigBegleit, HEUTE);
    const e2 = paketRegeln.auswerten(kopie(a), konfigLive, HEUTE);
    ok("Regelwerk " + id + ": Paket liefert dasselbe Ergebnis wie die Quelle (auch ohne das Kapitel offenePunkte)", isDeepStrictEqual(e1, e2) && isDeepStrictEqual(quellRegeln.schritte(kopie(a), konfigBegleit, HEUTE), paketRegeln.schritte(kopie(a), konfigLive, HEUTE)));
    const schluessel = quellPdf.benoetigteVorlagen(e1, a);
    ok("PDF " + id + ": Paket braucht dieselben Vordrucke", isDeepStrictEqual(schluessel, paketPdf.benoetigteVorlagen(e2, a)), schluessel.join(", "));
    const vorlagen1 = Object.fromEntries(schluessel.map((s) => [s, vorlagenQuelle[s]]));
    const vorlagen2 = Object.fromEntries(schluessel.map((s) => [s, vorlagenPaket[s]]));
    const bilder = () => ({ spielerfoto: null, nachweise: {}, unterschriften: {} });
    const p1 = await quellPdf.erzeugePdf({ PDFLib, fontkit, schrift: new Uint8Array(schriftQuelle), vorlagen: vorlagen1, konfig: konfigBegleit, a: kopie(a), e: e1, bilder: bilder(), heute: HEUTE, entwurf: false });
    const p2 = await paketPdf.erzeugePdf({ PDFLib, fontkit, schrift: schriftPaket, vorlagen: vorlagen2, konfig: konfigLive, a: kopie(a), e: e2, bilder: bilder(), heute: HEUTE, entwurf: false });
    ok("PDF " + id + ": Paket erzeugt Byte für Byte dasselbe PDF wie die Quelle (ohne Entwurfsvermerk)", Buffer.compare(Buffer.from(p1.bytes), Buffer.from(p2.bytes)) === 0 && p1.seiten === p2.seiten && p1.seiten > 0, p2.seiten + " Seiten, " + p2.bytes.length + " Byte");
  }

  // M9 (11.10.2026): Der Schalter unterschriftHfv (data/anmeldung.json, Jugendleitung) steht im Paket auf „bildschirm“, die Konfiguration trägt ihn auch ohne das
  // Kapitel offenePunkte. Mit Unterschriftsbildern (Elternteil, Kind, Mitglied) liefert das Paket dasselbe PDF wie die Quelle, und alle Unterschriften der Familie
  // stehen am Bildschirm (auch auf den Blättern des Verbands).
  {
    ok("Konfiguration des Pakets: unterschriftHfv.wert = bildschirm, ohne das Kapitel offenePunkte", !!konfigLive.anmeldung.unterschriftHfv && konfigLive.anmeldung.unterschriftHfv.wert === "bildschirm" && !("offenePunkte" in konfigLive.anmeldung), JSON.stringify(konfigLive.anmeldung.unterschriftHfv && konfigLive.anmeldung.unterschriftHfv.wert));
    ok("Paket: regeln.unterschriftHfv(konfig) liefert „bildschirm“, wie die Quelle", paketRegeln.unterschriftHfv(konfigLive) === "bildschirm" && quellRegeln.unterschriftHfv(konfigBegleit) === "bildschirm");
    const bildDatei = (i) => {
      const b = new Uint8Array(fs.readFileSync(path.join(ROOT, "tools", "anmeldung-test", "testbilder", "unterschrift-" + i + ".png")));
      const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
      return { bytes: b, breitePx: dv.getUint32(16) * 0.75, hoehePx: dv.getUint32(20) * 0.75 };
    };
    const unterschriften = { mitglied: bildDatei(1), sorgeberechtigte: bildDatei(2), spieler: bildDatei(3), kontoinhaber: bildDatei(4) };
    for (const id of ["kind-neu", "herren-wechsel"]) {
      const a = beispiele.beispielAntworten(id, HEUTE, konfigBegleit);
      a.unterschriftWeg = "bildschirm";
      a.satzung = true;
      const e1 = quellRegeln.auswerten(kopie(a), konfigBegleit, HEUTE);
      const e2 = paketRegeln.auswerten(kopie(a), konfigLive, HEUTE);
      const schluessel = quellPdf.benoetigteVorlagen(e1, a);
      const bilder = () => ({ spielerfoto: null, nachweise: {}, unterschriften: Object.assign({}, unterschriften) }); // flache Kopie: kopie() (JSON) würde die Bytes zerstören
      const p1 = await quellPdf.erzeugePdf({ PDFLib, fontkit, schrift: new Uint8Array(schriftQuelle), vorlagen: Object.fromEntries(schluessel.map((x) => [x, vorlagenQuelle[x]])), konfig: konfigBegleit, a: kopie(a), e: e1, bilder: bilder(), heute: HEUTE, entwurf: false });
      const p2 = await paketPdf.erzeugePdf({ PDFLib, fontkit, schrift: schriftPaket, vorlagen: Object.fromEntries(schluessel.map((x) => [x, vorlagenPaket[x]])), konfig: konfigLive, a: kopie(a), e: e2, bilder: bilder(), heute: HEUTE, entwurf: false });
      ok("PDF mit Unterschriftsbildern " + id + ": Paket erzeugt Byte für Byte dasselbe PDF wie die Quelle", Buffer.compare(Buffer.from(p1.bytes), Buffer.from(p2.bytes)) === 0 && p1.seiten === p2.seiten, p2.seiten + " Seiten");
      const datei = path.join(AUSGABE, "unterschriften-" + id + ".pdf");
      fs.writeFileSync(datei, p2.bytes);
      const text = poppler("pdftotext", ["-layout", datei, "-"]).replace(/\s+/g, " ");
      ok("PDF mit Unterschriftsbildern " + id + ": Teil A „Sie haben alles am Bildschirm unterschrieben.“ und im Laufzettel der Satz zu den Blättern des Verbands", text.includes("Sie haben alles am Bildschirm unterschrieben.") && text.includes("Alle Unterschriften der Familie sind am Bildschirm geleistet, auch auf den Blättern des Verbands (Entscheidung der Jugendleitung vom 11.10.2026)."), "");
    }
    // Nachbesserung Runde 2 (11.10.2026): Das Feld des Kindes bleibt leer. Die Zeile des Kindes im Antrag auf Spielerlaubnis bleibt ohne Markierung (Art „leer“),
    // Teil A nennt das Blatt nicht unter „Ausdrucken müssen Sie nur“, der Laufzettel sagt, dass das Passwesen entscheidet. Das Paket liefert dasselbe PDF wie die Quelle.
    {
      const a = beispiele.beispielAntworten("kind-neu", HEUTE, konfigBegleit);
      a.unterschriftWeg = "bildschirm";
      a.satzung = true;
      const e1 = quellRegeln.auswerten(kopie(a), konfigBegleit, HEUTE);
      const e2 = paketRegeln.auswerten(kopie(a), konfigLive, HEUTE);
      const schluessel = quellPdf.benoetigteVorlagen(e1, a);
      const bilder = () => {
        const u = Object.assign({}, unterschriften); // flache Kopie (siehe oben)
        delete u.spieler;
        return { spielerfoto: null, nachweise: {}, unterschriften: u };
      };
      const p1 = await quellPdf.erzeugePdf({ PDFLib, fontkit, schrift: new Uint8Array(schriftQuelle), vorlagen: Object.fromEntries(schluessel.map((x) => [x, vorlagenQuelle[x]])), konfig: konfigBegleit, a: kopie(a), e: e1, bilder: bilder(), heute: HEUTE, entwurf: false });
      const p2 = await paketPdf.erzeugePdf({ PDFLib, fontkit, schrift: schriftPaket, vorlagen: Object.fromEntries(schluessel.map((x) => [x, vorlagenPaket[x]])), konfig: konfigLive, a: kopie(a), e: e2, bilder: bilder(), heute: HEUTE, entwurf: false });
      ok("PDF mit Unterschriftsbildern kind-neu, Feld des Kindes leer: Paket erzeugt Byte für Byte dasselbe PDF wie die Quelle", Buffer.compare(Buffer.from(p1.bytes), Buffer.from(p2.bytes)) === 0 && p1.seiten === p2.seiten, p2.seiten + " Seiten");
      const datei = path.join(AUSGABE, "unterschriften-kind-neu-kind-leer.pdf");
      fs.writeFileSync(datei, p2.bytes);
      const text = poppler("pdftotext", ["-layout", datei, "-"]).replace(/\s+/g, " ");
      ok("PDF kind-neu, Feld des Kindes leer: Teil A „Sie haben alles am Bildschirm unterschrieben.“, Laufzettel „Das Kind hat den Antrag nicht unterschrieben. Das Passwesen entscheidet, ob das nötig ist.“, kein „Einige Unterschriften fehlen noch“",
        text.includes("Sie haben alles am Bildschirm unterschrieben.") && text.includes("Das Kind hat den Antrag nicht unterschrieben. Das Passwesen entscheidet, ob das nötig ist.") && !text.includes("Einige Unterschriften fehlen noch") && text.includes("Nicht unterschrieben (freiwillig)"), "");
      const seiten = Number(/Pages:\s+(\d+)/.exec(poppler("pdfinfo", [datei]))[1]);
      let antrag = 0;
      for (let i = 1; i <= seiten && !antrag; i++) if (/Antrag auf Spielerlaubnis \/ Vereinswechsel/.test(poppler("pdftotext", ["-layout", "-f", String(i), "-l", String(i), datei, "-"]))) antrag = i;
      const marker = antrag ? (poppler("pdftotext", ["-layout", "-f", String(antrag), "-l", String(antrag), datei, "-"]).match(/Hier mit Stift unterschreiben/g) || []).length : -1;
      ok("PDF kind-neu, Feld des Kindes leer: Antrag auf Spielerlaubnis Seite 1 mit nur einer Markierung (Verein), keine für das Kind", marker === 1, "Seite " + antrag + ", Markierungen " + marker);
    }
  }

  // Gegenprobe: Mit entwurf = true (so läuft die Begleitseite) steht der Vermerk im PDF – die Prüfung auf "Entwurf" im PDF-Text kann also anschlagen
  {
    const a = beispiele.beispielAntworten("kind-neu", HEUTE, konfigBegleit);
    const e = paketRegeln.auswerten(kopie(a), konfigLive, HEUTE);
    const vorlagen = Object.fromEntries(paketPdf.benoetigteVorlagen(e, a).map((s) => [s, vorlagenPaket[s]]));
    const p = await paketPdf.erzeugePdf({ PDFLib, fontkit, schrift: schriftPaket, vorlagen, konfig: konfigLive, a: kopie(a), e, bilder: { spielerfoto: null, nachweise: {}, unterschriften: {} }, heute: HEUTE, entwurf: true });
    const datei = path.join(AUSGABE, "gegenprobe-entwurf.pdf");
    fs.writeFileSync(datei, p.bytes);
    const text = poppler("pdftotext", ["-layout", datei, "-"]).replace(/\s+/g, " ");
    ok("Gegenprobe: mit entwurf = true stehen Fußzeile „Entwurf – vom Vorstand zu prüfen“ und der Satz im Laufzettel im PDF", /Entwurf – vom Vorstand zu prüfen/.test(text) && /sind Entwürfe\. Der Vorstand gibt die Texte frei/.test(text));
  }
}

// ---------- Hauptablauf ----------

function liesKonfig(htmlPfad) {
  const s = fs.readFileSync(htmlPfad, "utf8");
  const m = /<script type="application\/json" id="anmeldung-konfig">([\s\S]*?)<\/script>/.exec(s);
  if (!m) throw new Error(htmlPfad + ": keine Konfiguration");
  return JSON.parse(m[1]);
}

async function erzeugeTestdateien(browser) {
  fs.mkdirSync(DATEIEN, { recursive: true });
  const seite = await browser.newPage();
  const jpeg = await seite.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 1600;
    c.height = 1200;
    const x = c.getContext("2d");
    const g = x.createLinearGradient(0, 0, 1600, 1200);
    g.addColorStop(0, "#1f2dbe");
    g.addColorStop(1, "#e4e7fa");
    x.fillStyle = g;
    x.fillRect(0, 0, 1600, 1200);
    x.fillStyle = "#ffffff";
    x.font = "bold 150px sans-serif";
    x.fillText("Testfoto", 80, 600);
    return c.toDataURL("image/jpeg", 0.9).split(",")[1];
  });
  await seite.close();
  const foto = path.join(DATEIEN, "foto-1600x1200.jpg");
  fs.writeFileSync(foto, Buffer.from(jpeg, "base64"));
  const pdf = await PDFLib.PDFDocument.create();
  pdf.addPage([595, 842]).drawText("Testunterlage");
  const pdfDatei = path.join(DATEIEN, "unterlage.pdf");
  fs.writeFileSync(pdfDatei, Buffer.from(await pdf.save()));
  return { foto, pdf: pdfDatei };
}

async function main() {
  if (!fs.existsSync(path.join(PAKET, "anmeldung.html"))) {
    console.error("Im Paket " + PAKET + " fehlt anmeldung.html.\nDas Paket entsteht nur mit eingeschaltetem Schalter:\n  ANMELDUNG_LIVE=1 sh tools/cache/bau-sperre.sh build\n(danach zurück: sh tools/cache/bau-sperre.sh build). Siehe src/vorlagen/hilfen.mjs.");
    process.exit(1);
  }
  fs.mkdirSync(FOTOS, { recursive: true });
  fs.mkdirSync(AUSGABE, { recursive: true });
  const konfigLive = liesKonfig(path.join(PAKET, "anmeldung.html"));
  const beispiele = await import(pathToFileURL(path.join(ROOT, "assets", "js", "anmeldung", "beispiele.js")).href);
  console.log("Paket: " + path.relative(ROOT, PAKET) + "  (Sprachen " + konfigLive.sprachen.join(", ") + ", live = " + konfigLive.live + ")");
  ok("Konfiguration der Seite: live = true, Quellen für Schrift und Vordrucke als Module, kein Kapitel offenePunkte", konfigLive.live === true && !!konfigLive.quellen && !!konfigLive.quellen.schriftModul && Object.keys(konfigLive.quellen.vorlagenModule).length === 5 && !("offenePunkte" in konfigLive.anmeldung));

  const srv = await starteServer();
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  try {
    const dateien = await erzeugeTestdateien(browser);
    // Jeder Abschnitt läuft für sich: Eine Ausnahme (zum Beispiel HTTP 404 für die Seite) wird ein Fehler, der Rest läuft weiter.
    const abschnitt = async (name, f) => {
      try {
        await f();
      } catch (e) {
        ok(name + ": läuft ohne Ausnahme durch", false, String((e && e.message) || e).split("\n")[0]);
      }
    };
    await abschnitt("Seite", () => pruefeSeite(srv, browser, konfigLive));
    await abschnitt("Mitglied werden", () => pruefeMitgliedWerden(srv, browser));
    const abl = SCHNELL ? [ABLAEUFE[0]] : ABLAEUFE;
    for (const sprache of SCHNELL ? ["de"] : ["de", "en"]) {
      for (const a of abl) await abschnitt(a.titel + " (" + sprache + ")", () => pruefeAblauf(srv, browser, beispiele, konfigLive, dateien, a, sprache));
    }
    await abschnitt("Kind neu (de, ?app=1)", () => pruefeAblauf(srv, browser, beispiele, konfigLive, dateien, ABLAEUFE[0], "de", { app: true }));
  } finally {
    await browser.close();
    srv.server.close();
  }
  const fremd404 = srv.anfragen.filter((a) => a.status === 404);
  ok("Server: keine Anfrage an eine Datei, die im Paket fehlt", fremd404.length === 0, fremd404.slice(0, 5).map((a) => a.pfad).join(", "));
  const geladen = new Set(srv.anfragen.filter((a) => a.status === 200).map((a) => path.basename(a.pfad)));
  info("Aus dem Paket geladen: " + geladen.size + " Dateien (" + [...geladen].filter((n) => /^anmeldung/.test(n)).length + " vom Assistenten)");

  if (!OHNE_MODULE) {
    const konfigBegleit = liesKonfig(path.join(ROOT, "docs", "anmeldung", "index.html"));
    await pruefeModule(konfigLive, konfigBegleit, beispiele);
  }

  console.log("\n=== Zusammenfassung ===");
  console.log(pruefungen + " Prüfungen, " + fehlerAnzahl + " Fehler. Bildschirmfotos: " + path.relative(ROOT, FOTOS) + "/");
  if (fehlerAnzahl) {
    console.error("e2e-paket.mjs: FEHLGESCHLAGEN");
    process.exit(1);
  }
  console.log("e2e-paket.mjs: alles bestanden.");
}

main().catch((fehler) => {
  console.error(fehler);
  process.exit(1);
});
