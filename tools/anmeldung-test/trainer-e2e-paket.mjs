#!/usr/bin/env node
// Ende-zu-Ende-Test der Seite „Neu im Trainerteam“ im flachen CMS-Paket (Arbeitspaket T3 der Stufe 2).
//
// Geprüft wird das Paket, nicht die Entwicklungsfassung: Der Test kopiert die Quellen des Arbeitsordners in zwei Wegwerf-Ordner (tools/cache/…, ohne
// docs/ und dist/ des Arbeitsordners anzufassen), baut dort ohne und mit dem Schalter TRAINER_LIVE (Testprüfwert über TRAINER_DATEN, nie in
// data/trainer.json; der Schalter kommt aus der Umgebung, TRAINER_LIVE=0 oder 1, nicht aus dem Code: der Test gilt vor und nach dem Livegang) und liefert dist/appack-paket/web wie das CMS aus: ein kleiner Server auf Port 4203 (nur 127.0.0.1), Pfad
// /sportfreunde04/workspace/web/…, Content-Type wie cdn.appack.de (.html ohne charset, .js als application/javascript). Anfragen an GitHub Pages
// (Schriften und Symbole im Seitenkopf, gemeinsame Assets) beantwortet der Test aus dem Bau; jeder andere Host ist ein Fehler. Gesteuert wird Chrome
// (puppeteer-core, headless, 390 x 844, Touch, feste Uhr).
//
// Geprüft wird:
//   [1] Bau ohne Schalter und mit Schalter: Exit 0; mit Schalter entstehen docs/ws/trainerteam.html und die Dateien im Paket; ohne Schalter nichts davon.
//       Der Unterschied zwischen beiden Bauten: nur die neuen Dateien (Seite, trainer.css, anmeldung-trainer*.js, anmeldung-texte-trainer-de.js) und die
//       Listen (manifest.json, LIESMICH.md); jede andere Datei in docs/ und im Paket, auch die des Anmelde-Assistenten, ist Byte für Byte gleich; die
//       Sitemap und robots.txt ändern sich nicht; die Trainerseite steht nicht in der Sitemap.
//   [1b] Bauabbrüche mit Schalter (Testkopien der Konfiguration und der Daten, nie data/trainer.json im Repo): leere Prüfwerteliste, Prüfwert ohne
//       64 Hexzeichen, leere Einsicht, schnupperMonate 0 und 13, leere Mannschaftsliste, fehlender Unterzeichner und weitere Fälle: je Exit 1 mit
//       verständlicher Meldung und ohne Aufrufstapel, docs/ und dist/ danach unverändert; ohne Schalter bricht auch eine kaputte Konfiguration nichts ab.
//   [2] Paketprüfung ohne Browser (appack-paket-pruefen.mjs --statisch) mit und ohne Schalter.
//   [3] Die Seite im Paket: noindex, Konfiguration (Zugang, Einsicht, Mannschaften, Quellen), kein Entwurfsband, Impressum und Datenschutz erreichbar,
//       im Dokument kein Name einer Person im Code der Module (die Einsichtnehmenden kommen aus der Konfiguration).
//   [4] Zugang im Browser: ohne Code nur die Code-Seite (die übrigen Bildschirme sind nicht im Dokument), falscher Code mit Meldung, richtiger Code in
//       anderer Schreibweise, Link mit ?code=richtig (Start ohne Code-Seite), Link mit ?code=falsch, leere Liste der Prüfwerte (bleibt zu).
//   [5] Alle 13 Bildschirme mit den Beispieldaten (Fußball, Antrag auf Gebührenbefreiung) bis zu den fertigen Dateien: Namen, PDF (pdfinfo, pdftotext:
//       „Nr. 2 Buchst. a“, „Einsicht bei <Name aus der Konfiguration>“), JPG, Teilen und Herunterladen, „Antrag ansehen“; dazu ein zweiter Lauf
//       (Karneval, Zeugnis vorhanden: kein Antrag); die Einsichtnehmenden aus einer anderen Konfiguration erscheinen auf dem Bildschirm und in den PDF.
//   [6] Konsole ohne Fehler und Warnungen, keine Anfrage an einen fremden Host, nichts wird gesendet (nur GET von Dateien des Pakets, kein Body), der Code
//       geht weder in eine Anfrage noch in den Referer, kein horizontales Scrollen bei 390 px; ein nicht ladbares Modul zeigt den Text „Ladefehler“.
//   [7] (T1b: Safari merkt sich ein gescheitertes import() für die ganze Sitzung) Das PDF-Modul lädt mit der Seite (Anfrage beim Start, Sec-Fetch-Dest script,
//       danach keine weitere); scheitert es oder einer seiner Teile (503), steht beim Start „Ladefehler“ da. Die Schrift im Paket kommt per fetch (Sec-Fetch-Dest
//       empty) und nicht per import(), byte-gleich zum bisherigen Weg. Nach einem Ladefehler beim Erstellen gelingt „Noch einmal versuchen“: Schrift 503 beim
//       ersten Abruf; falsche Dateien (Status 200) für Schrift und pdf-lib.
//
// Aufruf: node tools/anmeldung-test/trainer-e2e-paket.mjs [--ausgabe=<Ordner>] [--behalten]
//   --ausgabe   Ordner für Bildschirmfotos (bilder/NN-<name>-390.png), die erzeugten Dateien und das Protokoll; Standard: tools/cache/anmeldung-test/
//               trainer-e2e-paket/ausgabe (git-ignoriert)
//   --behalten  die beiden gebauten Wegwerf-Ordner nicht löschen (zum Nachsehen)
// Voraussetzungen: Google Chrome, poppler (pdfinfo, pdftotext; Homebrew), Port 4203 frei. Dauer: etwa zwei Minuten. Exit 0 nur, wenn alles bestanden ist.

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createHash, randomBytes } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import puppeteer from "puppeteer-core";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CHROME = process.env.CHROME_PFAD || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 4203;
const BASIS = "http://127.0.0.1:" + PORT;
const WEB = "/sportfreunde04/workspace/web/";
const GH = "https://justolgay.github.io/speuzer-website-prototyp/assets/";
const ARG = (name) => (process.argv.find((a) => a.startsWith("--" + name + "=")) || "").slice(name.length + 3);
const CACHE = path.join(ROOT, "tools", "cache", "anmeldung-test", "trainer-e2e-paket");
const AUSGABE = path.resolve(ARG("ausgabe") || path.join(CACHE, "ausgabe"));
const BEHALTEN = process.argv.includes("--behalten");
const OHNE_ORDNER = path.join(CACHE, "ohne");
const MIT_ORDNER = path.join(CACHE, "mit");
const TESTBILD = path.join(ROOT, "tools", "anmeldung-test", "testbilder", "foto-3x4.jpg");
const PFAD = ["/opt/homebrew/bin", "/usr/local/bin", process.env.PATH].join(path.delimiter);
const HEUTE = "2026-11-23";

// ---------- Ergebnisse ----------

let fehlerAnzahl = 0;
let pruefungen = 0;
const protokoll = [];
function ok(name, bedingung, detail) {
  pruefungen++;
  if (!bedingung) fehlerAnzahl++;
  const zeile = (bedingung ? "OK      " : "FEHLER  ") + name + (detail ? " – " + detail : "");
  protokoll.push(zeile);
  console.log(zeile);
  return !!bedingung;
}
const info = (text) => {
  protokoll.push("        " + text);
  console.log("        " + text);
};
const abschnitt = (titel) => {
  protokoll.push("", "=== " + titel + " ===");
  console.log("\n=== " + titel + " ===");
};
const warte = (ms) => new Promise((r) => setTimeout(r, ms));
const sha256 = (daten) => createHash("sha256").update(daten).digest("hex");
const norm = (text) => String(text).replace(/[\s ]+/g, " ").trim();
const ausfuehren = (befehl, args, o = {}) => spawnSync(befehl, args, { encoding: "utf8", env: { ...process.env, PATH: PFAD }, ...o });

// ---------- Testdaten (alles erfunden) ----------

// Zugangscode nur für diesen Lauf (zufällig, gilt nirgends); die Konfiguration kennt nur den Prüfwert. Der Code steht in keiner Ausgabe.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const zufall = (n) => Array.from(randomBytes(n), (b) => ALPHABET[b % ALPHABET.length]).join("");
const TESTCODE = zufall(4) + "-" + zufall(4) + "-" + zufall(4);
const PRUEFWERT = sha256(TESTCODE.replace(/-/g, ""));
const FALSCH = zufall(4) + "-" + zufall(4) + "-" + zufall(4);
const maske = (t) => String(t).split(TESTCODE).join("<CODE>").split(TESTCODE.replace(/-/g, "")).join("<CODE>").split(PRUEFWERT).join("<PRUEFWERT>");

const BEISPIEL = {
  vorname: "Max",
  nachname: "Mustermann",
  geburtsdatum: "1988-03-14",
  anschrift: { strasse: "Musterstraße 12", plz: "60326", ort: "Frankfurt am Main" },
  handy: "0170 1234567",
  email: "max.mustermann@example.com",
  abteilung: "fussball",
  mannschaft: "D3-Jugend",
  rolle: "co-trainer",
  seit: "2026-11-02",
  tage: ["di", "do", "sa"],
  notfall: { name: "Erika Mustermann", beziehung: "Partnerin", telefon: "0170 7654321" },
  erfahrung: "Drei Jahre Jugendtrainer bei einem anderen Verein (E-Jugend).",
  ersteHilfeAm: "2025-05-12",
  zeugnis: "beantragen",
};
// zweiter Lauf: Karneval, Zeugnis vorhanden (kein Antrag) und ohne die freiwilligen Angaben Notfallkontakt, Erfahrung, Erste-Hilfe-Kurs und Passfoto (25.11.2026)
const BEISPIEL_KARNEVAL = {
  ...BEISPIEL,
  vorname: "Erika",
  nachname: "Beispielfrau",
  email: "erika.beispielfrau@example.com",
  abteilung: "karneval",
  mannschaft: "Dreamboys",
  rolle: "betreuer",
  tage: ["di"],
  notfall: { name: "", beziehung: "", telefon: "" },
  erfahrung: "",
  ersteHilfeAm: null,
  foto: false,
  zeugnis: "vorhanden",
};
const SCHRITTE = ["code", "start", "person", "einsatz", "notfall", "erfahrung", "foto", "kodex", "selbstauskunft", "zeugnis", "unterschriften", "pruefen", "fertig"];
const nn = (schritt) => String(SCHRITTE.indexOf(schritt) + 1).padStart(2, "0");

// ---------- Bau in Wegwerf-Ordnern ----------

function loescheOrdner(ordner) {
  fs.rmSync(ordner, { recursive: true, force: true });
}

// Kopiert nur, was der Bau braucht (Quellen, Daten, Assets und die drei Werkzeuge); docs/ und dist/ entstehen dort neu.
function kopiereQuellen(ziel) {
  loescheOrdner(ziel);
  fs.mkdirSync(path.join(ziel, "tools"), { recursive: true });
  for (const ordner of ["assets", "data", "src"]) fs.cpSync(path.join(ROOT, ordner), path.join(ziel, ordner), { recursive: true });
  fs.copyFileSync(path.join(ROOT, "package.json"), path.join(ziel, "package.json"));
  for (const datei of ["build.mjs", "appack-paket.mjs", "appack-paket-pruefen.mjs"]) fs.copyFileSync(path.join(ROOT, "tools", datei), path.join(ziel, "tools", datei));
  fs.symlinkSync(fs.realpathSync(path.join(ROOT, "node_modules")), path.join(ziel, "node_modules"));
}

function baue(ziel, mitSchalter, testDatei) {
  kopiereQuellen(ziel);
  // ANMELDUNG_LIVE bleibt an (der Assistent ist live; die Trainerseite teilt seine Dateien), der Schalter der Trainerseite kommt aus dem Test:
  // ohne Schalter TRAINER_LIVE=0, mit Schalter TRAINER_LIVE=1. So läuft der Test mit demselben Ergebnis, ob TRAINER_LIVE_SCHALTER in
  // src/vorlagen/hilfen.mjs auf false (Standard bis zum Livegang) oder auf true (nach dem Livegang) steht.
  const env = { ...process.env, PATH: PFAD, ANMELDUNG_LIVE: "1", TRAINER_LIVE: mitSchalter ? "1" : "0" };
  delete env.TRAINER_DATEN;
  if (mitSchalter) env.TRAINER_DATEN = testDatei;
  const a = spawnSync(process.execPath, ["tools/build.mjs"], { cwd: ziel, env, encoding: "utf8" });
  const b = a.status === 0 ? spawnSync(process.execPath, ["tools/appack-paket.mjs"], { cwd: ziel, env, encoding: "utf8" }) : { status: -1, stdout: "", stderr: "" };
  return { build: a, paket: b, env, ausgabe: (a.stdout || "") + (a.stderr || "") + (b.stdout || "") + (b.stderr || "") };
}

// alle Dateien eines Ordners mit SHA-256 (relative Pfade)
function hashes(ordner) {
  const liste = new Map();
  const gehe = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const voll = path.join(d, e.name);
      if (e.isDirectory()) gehe(voll);
      else liste.set(path.relative(ordner, voll), sha256(fs.readFileSync(voll)));
    }
  };
  gehe(ordner);
  return liste;
}

function unterschied(a, b) {
  const nur = (x, y) => [...x.keys()].filter((k) => !y.has(k)).sort();
  return { nurA: nur(a, b), nurB: nur(b, a), anders: [...a.keys()].filter((k) => b.has(k) && a.get(k) !== b.get(k)).sort() };
}

// ---------- Server (wie das CMS) ----------

const MIME = { ".html": "text/html", ".css": "text/css", ".js": "application/javascript" };
// gesperrt: Dateien, die der Server mit 404 beantwortet. ausfall: Pfad › { status, rest, getroffen, typ?, inhalt? }: Die nächsten `rest` Anfragen an die Datei
// beantwortet der Server mit `status` (und `inhalt`), danach wieder mit der Datei (T1b: Wiederholung nach einem Ladefehler). anfragen: jede Anfrage mit
// Methode, Pfad, Kopfzeile Sec-Fetch-Dest (script für Module und <script>, empty für fetch) und Antwortstatus.
const srv = { http: null, ordner: null, konfigAenderung: null, gesperrt: new Set(), ausfall: new Map(), anfragen: [] };

const KONFIG_MUSTER = /(<script type="application\/json" id="trainer-konfig">)([\s\S]*?)(<\/script>)/;

function starteServer(ordner) {
  srv.ordner = ordner;
  srv.http = http.createServer((req, res) => {
    try {
      const pfad = decodeURIComponent(new URL(req.url, BASIS).pathname);
      const aufzeichnung = { methode: req.method, pfad, dest: req.headers["sec-fetch-dest"] || "", status: null };
      srv.anfragen.push(aufzeichnung);
      res.on("finish", () => {
        aufzeichnung.status = res.statusCode;
      });
      const aus = srv.ausfall.get(pfad);
      if (aus && aus.rest > 0) {
        aus.rest -= 1;
        aus.getroffen += 1;
        res.writeHead(aus.status, { "Content-Type": aus.typ || "text/plain", "Cache-Control": "no-store" }).end(aus.inhalt || "nicht erreichbar");
        return;
      }
      if (!pfad.startsWith(WEB) || srv.gesperrt.has(pfad)) {
        res.writeHead(404, { "Content-Type": "text/plain" }).end("nicht gefunden");
        return;
      }
      const datei = path.join(ordner, pfad.slice(WEB.length));
      if (!datei.startsWith(ordner + path.sep) || !fs.existsSync(datei) || !fs.statSync(datei).isFile()) {
        res.writeHead(404, { "Content-Type": "text/plain" }).end("nicht gefunden");
        return;
      }
      let inhalt = fs.readFileSync(datei);
      if (pfad === WEB + "trainerteam.html" && srv.konfigAenderung) {
        const html = inhalt.toString("utf8");
        const m = KONFIG_MUSTER.exec(html);
        const konfig = JSON.parse(m[2]);
        srv.konfigAenderung(konfig);
        inhalt = Buffer.from(html.replace(KONFIG_MUSTER, (x, auf, alt, zu) => auf + JSON.stringify(konfig).replace(/</g, "\\u003c") + zu), "utf8");
      }
      res.writeHead(200, { "Content-Type": MIME[path.extname(datei)] || "application/octet-stream", "Cache-Control": "no-store" }).end(inhalt);
    } catch (fehler) {
      res.writeHead(500).end(String(fehler));
    }
  });
  return new Promise((ok, fehler) => {
    srv.http.once("error", fehler);
    srv.http.listen(PORT, "127.0.0.1", ok);
  });
}

// ---------- Browser und Seite ----------

const UHR = `(() => {
  const feste = new Date("${HEUTE}T10:00:00").getTime();
  const Echt = Date;
  class Uhr extends Echt {
    constructor(...a) { if (a.length === 0) super(feste); else super(...a); }
    static now() { return feste; }
  }
  window.Date = Uhr;
})();`;

// Teilen, Zwischenablage und neue Fenster als Stellvertreter, die ihre Aufrufe aufzeichnen (window.__stub); die geteilten Dateien bleiben in
// window.__geteilt, damit der Test ihre Bytes lesen kann.
const STUBS = `(() => {
  const s = (window.__stub = { share: [], schreibe: [], oeffne: [] });
  navigator.canShare = (d) => !!(d && d.files && d.files.length);
  navigator.share = async (d) => {
    window.__geteilt = Array.from(d.files || []);
    s.share.push({ dateien: (d.files || []).map((f) => ({ name: f.name, typ: f.type, groesse: f.size })), title: d.title, text: d.text });
  };
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (t) => { s.schreibe.push(t); } } });
  window.open = (url, ziel) => {
    const f = { closed: false, close() { f.closed = true; }, location: { set href(v) { s.oeffne.push({ url: v, ziel }); }, get href() { return ""; } } };
    s.oeffne.push({ url, ziel, fenster: true });
    return f;
  };
})();`;

const geoeffnet = [];
const MIME_ASSETS = { ".woff2": "font/woff2", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".css": "text/css", ".ico": "image/x-icon" };

async function neueSeite(browser, name, abfrage, o = {}) {
  const page = await browser.newPage();
  geoeffnet.push(page);
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await page.evaluateOnNewDocument(UHR);
  await page.evaluateOnNewDocument(STUBS);
  const st = { name, konsole: [], eigene: [], fremd: [], gh: [], antwortenFehler: [], referer: [], dialoge: 0 };
  page.__st = st;
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") st.konsole.push(m.type() + ": " + maske(m.text()));
  });
  page.on("pageerror", (e) => st.konsole.push("pageerror: " + maske(e.message)));
  page.on("response", (r) => {
    if (r.status() >= 400) st.antwortenFehler.push(r.status() + " " + maske(r.url()));
  });
  page.on("dialog", (d) => {
    st.dialoge++;
    d.accept();
  });
  await page.setRequestInterception(true);
  page.on("request", (r) => {
    const u = r.url();
    try {
      if (u.startsWith(BASIS + "/")) {
        const url = new URL(u);
        st.eigene.push({ methode: r.method(), pfad: url.pathname, abfrage: url.search, body: !!r.postData(), art: r.resourceType() });
        return r.continue();
      }
      if (u.startsWith(GH)) {
        const referer = r.headers().referer || "";
        st.referer.push(referer);
        const lokal = path.join(MIT_ORDNER, "docs", "assets", decodeURIComponent(new URL(u).pathname.replace("/speuzer-website-prototyp/assets/", "")));
        st.gh.push(u.slice(GH.length));
        if (fs.existsSync(lokal) && fs.statSync(lokal).isFile()) {
          return r.respond({ status: 200, headers: { "Access-Control-Allow-Origin": "*" }, contentType: MIME_ASSETS[path.extname(lokal)] || "application/octet-stream", body: fs.readFileSync(lokal) });
        }
        st.antwortenFehler.push("404 (lokal) " + u);
        return r.respond({ status: 404, body: "nicht da" });
      }
      if (/^(?:data|blob|about):/.test(u)) return r.continue();
      st.fremd.push(maske(u));
      return r.abort("blockedbyclient");
    } catch (fehler) {
      st.konsole.push("Test: Anfrage nicht beantwortet: " + fehler.message);
      return r.abort("failed").catch(() => {});
    }
  });
  const antwort = await page.goto(`${BASIS}${WEB}trainerteam.html${abfrage || ""}`, { waitUntil: "networkidle0" });
  if (o.ohneBereit) return page;
  await page.waitForSelector("#anmeldung[data-bereit]", { timeout: 10000 });
  page.__antwort = antwort;
  return page;
}

async function schliesseSeite(page) {
  try {
    await page.close();
  } catch {
    /* schon zu */
  }
}

// ---------- Eingabe-Helfer (wie ein Mensch: klicken und tippen; wie tools/anmeldung-test/trainer-e2e.mjs) ----------

const feldSel = (pfad) => `#anmeldung [data-pfad="${pfad}"]`;
const schritt = (page) => page.$eval("#anmeldung", (e) => e.getAttribute("data-schritt"));

async function warteSchritt(page, id, timeout = 6000) {
  try {
    await page.waitForFunction((x) => document.getElementById("anmeldung").getAttribute("data-schritt") === x, { timeout }, id);
  } catch {
    /* unten gemeldet */
  }
  return schritt(page);
}

async function text(page, pfad, wert) {
  const sel = feldSel(pfad);
  await page.click(sel);
  await page.$eval(sel, (e) => e.select());
  await page.keyboard.press("Backspace");
  if (wert) await page.keyboard.type(wert);
}

async function datum(page, pfad, iso) {
  const teile = iso ? iso.split("-") : ["", "", ""];
  for (const [i, teil] of [[2, "t"], [1, "m"], [0, "j"]]) await text(page, pfad + "." + teil, teile[i]);
}

async function karte(page, pfad, wert) {
  const id = await page.$eval(`${feldSel(pfad)}[data-wert="${wert}"]`, (e) => e.id);
  await page.click(`#anmeldung label[for="${id}"]`);
}

async function kreuze(page, pfad, wert) {
  const sel = wert ? `${feldSel(pfad)}[data-wert="${wert}"]` : feldSel(pfad);
  const id = await page.$eval(sel, (e) => e.id);
  await page.click(`#anmeldung label[for="${id}"]`);
}

async function weiter(page, erwartet) {
  await page.click('#anmeldung [data-aktion="weiter"]');
  return erwartet ? warteSchritt(page, erwartet) : null;
}

async function unterschreibe(page) {
  const canvas = await page.$("#anmeldung canvas.anm-unterschrift__leinwand");
  await canvas.evaluate((e) => e.scrollIntoView({ block: "center" }));
  const box = await canvas.boundingBox();
  const p = [];
  for (let i = 0; i <= 14; i++) p.push({ x: box.x + 24 + (i * (box.width - 48)) / 14, y: box.y + box.height * (0.45 + 0.25 * Math.sin(i * 1.3)) });
  const finger = await page.touchscreen.touchStart(p[0].x, p[0].y);
  for (const q of p.slice(1)) await finger.move(q.x, q.y);
  await finger.end();
  await page.waitForSelector("#anmeldung .anm-unterschrift--fertig", { timeout: 5000 }).catch(() => {});
  await warte(300);
}

async function fuelle(page, s, d) {
  if (s === "person") {
    await text(page, "vorname", d.vorname);
    await text(page, "nachname", d.nachname);
    await datum(page, "geburtsdatum", d.geburtsdatum);
    await text(page, "anschrift.strasse", d.anschrift.strasse);
    await text(page, "anschrift.plz", d.anschrift.plz);
    await text(page, "anschrift.ort", d.anschrift.ort);
    await text(page, "handy", d.handy);
    await text(page, "email", d.email);
  } else if (s === "einsatz") {
    // Bietet die Seite nur eine Abteilung an (Karneval vorerst außen vor), gibt es die Frage nach der Abteilung nicht
    if (await page.$(feldSel("abteilung"))) await karte(page, "abteilung", d.abteilung);
    await page.select(feldSel("mannschaft"), d.mannschaft);
    await karte(page, "rolle", d.rolle);
    await datum(page, "seit", d.seit);
    for (const t of d.tage) await kreuze(page, "tage", t);
  } else if (s === "notfall") {
    // freiwillig: nur, was in d steht
    for (const f of ["name", "beziehung", "telefon"]) if (d.notfall && d.notfall[f]) await text(page, "notfall." + f, d.notfall[f]);
  } else if (s === "erfahrung") {
    if (d.erfahrung) await text(page, "erfahrung", d.erfahrung);
    if (d.ersteHilfeAm) await datum(page, "ersteHilfeAm", d.ersteHilfeAm);
  } else if (s === "foto") {
    // freiwillig: ohne d.foto === false gibt es ein Foto
    if (d.foto !== false) {
      const eingabe = await page.$('#anmeldung input[data-aktion="foto-galerie"]');
      await eingabe.uploadFile(TESTBILD);
      await page.waitForSelector("#anmeldung .anm-vorschau-foto", { visible: true, timeout: 8000 });
    }
  } else if (s === "kodex") {
    await kreuze(page, "kodexGelesen");
  } else if (s === "selbstauskunft") {
    await kreuze(page, "selbstauskunft");
  } else if (s === "zeugnis") {
    await karte(page, "zeugnis", d.zeugnis);
  } else if (s === "unterschriften") {
    await unterschreibe(page);
    await kreuze(page, "satzung");
  }
}

// sichtbarer Text der Seite und Werte der Eingabefelder (wie trainer-e2e.mjs)
async function sichtbarerText(page) {
  return norm(await page.evaluate(() => {
    const teile = [];
    const sichtbar = (el) => {
      try {
        if (!el.checkVisibility({ checkVisibilityCSS: true })) return false;
      } catch {
        /* ältere Browser */
      }
      return !el.closest(".sr-only") && !el.closest(".tr-nur-vorlesen");
    };
    const geh = (k) => {
      if (k.nodeType === 3) return void teile.push(k.nodeValue);
      if (k.nodeType !== 1) return;
      const tag = k.tagName.toLowerCase();
      if (["script", "style", "svg", "canvas", "noscript", "template"].includes(tag) || !sichtbar(k)) return;
      if (tag === "input" || tag === "textarea") return void (k.value && teile.push(k.value));
      if (tag === "select") return void (k.selectedOptions[0] && k.selectedOptions[0].value && teile.push(k.selectedOptions[0].textContent));
      const block = !getComputedStyle(k).display.startsWith("inline");
      if (block) teile.push("\n");
      for (const kind of k.childNodes) geh(kind);
      if (block) teile.push("\n");
    };
    geh(document.body);
    return teile.join("");
  }));
}

async function liesDateienAusSeite(page) {
  // die per navigator.share (Stellvertreter) geteilten Dateien mit ihren Bytes
  return page.evaluate(async () => {
    const lies = (f) => new Promise((ok) => {
      const r = new FileReader();
      r.onload = () => ok(String(r.result).split(",")[1] || "");
      r.readAsDataURL(f);
    });
    return Promise.all((window.__geteilt || []).map(async (f) => ({ name: f.name, typ: f.type, b64: await lies(f) })));
  });
}

// Bildschirmfoto der ganzen Seite (ohne Fokusrahmen)
async function foto(page, datei) {
  await page.evaluate(() => {
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    window.scrollTo(0, 0);
  });
  fs.mkdirSync(path.dirname(datei), { recursive: true });
  await page.screenshot({ path: datei, fullPage: true });
}

// PDF: pdfinfo und Text (layout)
function pdfPruefen(bytes, name) {
  const datei = path.join(AUSGABE, "dateien", "_pruefen-" + name);
  fs.writeFileSync(datei, bytes);
  const i = ausfuehren("pdfinfo", [datei]);
  const t = ausfuehren("pdftotext", [datei, "-"]); // Lesefluss (ohne -layout): Sätze brechen nicht an Spaltengrenzen
  const f = ausfuehren("pdffonts", [datei]);
  fs.rmSync(datei, { force: true });
  return { info: i.stdout || "", gueltig: i.status === 0, seiten: Number(((/Pages:\s+(\d+)/.exec(i.stdout || "")) || [])[1] || 0), text: norm(t.stdout || ""), schriften: f.stdout || "" };
}

// Läuft alle Bildschirme von „start“ bis „fertig“ durch; macht ein Foto je Bildschirm, wenn bilder gesetzt ist.
async function geheDurch(page, d, bilder) {
  const reihenfolge = [];
  for (const s of SCHRITTE.slice(1)) {
    const ist = await warteSchritt(page, s);
    reihenfolge.push(ist);
    if (ist !== s) break;
    if (s !== "fertig") await fuelle(page, s, d);
    if (s === "unterschriften") await page.waitForSelector("#anmeldung .anm-unterschrift--fertig", { timeout: 5000 });
    if (s === "fertig") await page.waitForSelector('#anmeldung [data-status="fertig"]', { timeout: 20000 });
    await warte(200);
    if (bilder) await foto(page, path.join(bilder, `${nn(s)}-${s}-390.png`));
    if (s === "fertig") break;
    const naechster = SCHRITTE[SCHRITTE.indexOf(s) + 1];
    const nach = await weiter(page, naechster);
    if (nach !== naechster) {
      reihenfolge.push("FEHLT: " + naechster + " (ist " + nach + ")");
      break;
    }
  }
  return reihenfolge;
}

// Läuft von „start“ bis „pruefen“ und drückt dort „Alles stimmt – Datei erstellen“; wartet nicht auf das Ergebnis. Rückgabe: null oder die Meldung,
// wo es hakt.
async function geheBisErstellen(page, d) {
  for (const s of SCHRITTE.slice(1, SCHRITTE.indexOf("pruefen"))) {
    const ist = await warteSchritt(page, s);
    if (ist !== s) return "FEHLT: " + s + " (ist " + ist + ")";
    await fuelle(page, s, d);
    if (s === "unterschriften") await page.waitForSelector("#anmeldung .anm-unterschrift--fertig", { timeout: 5000 });
    await warte(200);
    const naechster = SCHRITTE[SCHRITTE.indexOf(s) + 1];
    const nach = await weiter(page, naechster);
    if (nach !== naechster) return "FEHLT: " + naechster + " (ist " + nach + ")";
  }
  const nachErstellen = await weiter(page, "fertig");
  return nachErstellen === "fertig" ? null : "FEHLT: fertig (ist " + nachErstellen + ")";
}

// ---------- Hauptprogramm ----------

async function haupt() {
  console.log("Ende-zu-Ende-Test „Neu im Trainerteam“ im flachen Paket (T3)");
  fs.mkdirSync(AUSGABE, { recursive: true });
  fs.mkdirSync(path.join(AUSGABE, "dateien"), { recursive: true });
  fs.mkdirSync(CACHE, { recursive: true });

  // Port frei?
  try {
    await starteServer(path.join(CACHE, "leer"));
    await new Promise((r) => srv.http.close(r));
  } catch (fehler) {
    console.error(`Port ${PORT} ist nicht frei (${fehler.code || fehler.message}). Abbruch.`);
    process.exit(2);
  }

  // ---------- [1] Bau ohne und mit Schalter ----------
  abschnitt("[1] Bau ohne und mit Schalter TRAINER_LIVE (Wegwerf-Ordner unter tools/cache/, Testprüfwert über TRAINER_DATEN)");
  const trainerJson = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "trainer.json"), "utf8"));
  const testDatei = path.join(CACHE, "trainer-test.json");
  fs.writeFileSync(testDatei, JSON.stringify({ ...trainerJson, zugang: { ...trainerJson.zugang, pruefwerte: [PRUEFWERT] } }, null, 2));
  const ohne = baue(OHNE_ORDNER, false);
  ok("Bau ohne Schalter: Exit 0 (build.mjs und appack-paket.mjs)", ohne.build.status === 0 && ohne.paket.status === 0, ohne.build.status !== 0 ? maske(ohne.ausgabe).slice(-300) : "");
  const mit = baue(MIT_ORDNER, true, testDatei);
  ok("Bau mit Schalter und Testprüfwert: Exit 0", mit.build.status === 0 && mit.paket.status === 0, mit.build.status !== 0 || mit.paket.status !== 0 ? maske(mit.ausgabe).slice(-400) : "");
  if (mit.build.status !== 0 || mit.paket.status !== 0 || ohne.build.status !== 0 || ohne.paket.status !== 0) return abschluss();
  ok("Bau mit Schalter: weder Code noch Prüfwert in der Ausgabe", !mit.ausgabe.includes(TESTCODE) && !mit.ausgabe.includes(TESTCODE.replace(/-/g, "")) && !mit.ausgabe.includes(PRUEFWERT));
  ok("Bau mit Schalter: die Ausgabe nennt die Seite und die Quelle der Konfiguration (nur für Tests)", /ws\/trainerteam\.html/.test(mit.ausgabe) && /Konfiguration aus TRAINER_DATEN/.test(mit.ausgabe) && /Neu im Trainerteam“ \(TRAINER_LIVE\): \d+ eigene Dateien/.test(mit.ausgabe), (mit.ausgabe.match(/Seite „Neu im Trainerteam“ \(TRAINER_LIVE\)[^\n]*/) || [""])[0].slice(0, 160));
  ok("Bau ohne Schalter: keine Seite trainerteam.html in docs/ws und im Paket, keine Datei der Trainerseite im Paket", !fs.existsSync(path.join(OHNE_ORDNER, "docs", "ws", "trainerteam.html")) && fs.readdirSync(path.join(OHNE_ORDNER, "dist", "appack-paket", "web")).every((n) => !/^(?:trainerteam\.html|trainer\.css|anmeldung-(?:texte-)?trainer[.-])/.test(n)));
  ok("Bau ohne Schalter: keine Meldung und keine Warnung zur Trainerseite (die Datei in src/begleit/ wird still übersprungen)", !/trainerteam|Trainerteam|Warnung/.test(ohne.ausgabe), (ohne.ausgabe.match(/.*(?:trainerteam|Warnung).*/) || [""])[0]);

  // Unterschied beider Baue: nur die neuen Dateien und die Listen
  const docsOhne = hashes(path.join(OHNE_ORDNER, "docs"));
  const docsMit = hashes(path.join(MIT_ORDNER, "docs"));
  const distOhne = hashes(path.join(OHNE_ORDNER, "dist"));
  const distMit = hashes(path.join(MIT_ORDNER, "dist"));
  const trainerAssets = fs.readdirSync(path.join(ROOT, "assets", "js", "anmeldung")).filter((n) => /^trainer.*\.js$/.test(n)).map((n) => "anmeldung-" + n);
  const erwartetNeu = [...trainerAssets, "anmeldung-texte-trainer-de.js", "trainer.css", "trainerteam.html"].sort();
  const dd = unterschied(docsOhne, docsMit);
  const di = unterschied(distOhne, distMit);
  const neuImPaket = (l) => l.filter((p) => p.startsWith(path.join("appack-paket", "web") + path.sep) || p.startsWith(path.join("web") + path.sep)).map((p) => path.basename(p)).sort();
  ok("docs/: mit Schalter kommt nur ws/trainerteam.html und die Kopie des Pakets dazu (die Dateien der Trainerseite unter appack-paket/web); keine Datei fehlt",
    dd.nurA.length === 0 && JSON.stringify(dd.nurB.filter((p) => !p.startsWith("appack-paket" + path.sep))) === JSON.stringify(["ws/trainerteam.html"]) && JSON.stringify(neuImPaket(dd.nurB)) === JSON.stringify(erwartetNeu), `neu: ${dd.nurB.length}, anders: ${dd.anders.join(", ")}`);
  // Datenschutzerklärung (T4, 24.11.2026): Mit dem Schalter kommt der Abschnitt „14a“ dazu (Stand und Quelle im Kopf nehmen die Werte der Trainerseite). Darum weichen genau diese
  // Dateien ab: die Website-Seite ws/datenschutz.html und ihre Kopie des Pakets unter docs/, die Seite im Paket unter dist/. Alles andere bleibt Byte für Byte gleich.
  const LISTEN = [path.join("appack-paket", "LIESMICH.md"), path.join("appack-paket", "manifest.json")];
  const DS_DOCS = [path.join("appack-paket", "web", "datenschutz.html"), path.join("ws", "datenschutz.html")];
  const DS_DIST = [path.join("appack-paket", "web", "datenschutz.html")];
  ok("docs/: jede andere Datei ist Byte für Byte gleich, außer den Listen (manifest.json, LIESMICH.md der Kopie) und der Datenschutzerklärung (ws/datenschutz.html und ihre Kopie im Paket: Abschnitt 14a nur mit Schalter)", JSON.stringify(dd.anders) === JSON.stringify([...LISTEN, ...DS_DOCS].sort()), `${docsOhne.size} Dateien ohne Schalter, ${docsMit.size} mit; anders: ${dd.anders.join(", ")}`);
  ok("dist/appack-paket: mit Schalter genau die 16 neuen Dateien (trainerteam.html, trainer.css, 13 Module anmeldung-trainer*.js, anmeldung-texte-trainer-de.js); jede andere Datei gleich, außer manifest.json, LIESMICH.md und web/datenschutz.html (Abschnitt 14a nur mit Schalter)",
    di.nurA.length === 0 && JSON.stringify(neuImPaket(di.nurB)) === JSON.stringify(erwartetNeu) && di.nurB.length === erwartetNeu.length && JSON.stringify(di.anders) === JSON.stringify([...LISTEN, ...DS_DIST].sort()), `neu: ${di.nurB.length} (erwartet ${erwartetNeu.length}), anders: ${di.anders.join(", ")}`);
  // Abschnitt 14a: mit Schalter in allen drei Dateien der Datenschutzerklärung (genau einmal, hinter 14 und vor 15), ohne Schalter in keiner; Stand und Quelle im Kopf; sonst ändert sich nur das Verzeichnis
  {
    const dsDaten = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "datenschutz.json"), "utf8"));
    const ueberschrift14a = "14a. Seite für neue Trainerinnen, Trainer und Betreuer";
    const lies = (ordner, rel) => fs.readFileSync(path.join(ordner, rel), "utf8");
    const ueberschriften = (html) => [...html.matchAll(/<h2>([^<]+)<\/h2>/g)].map((m) => m[1]);
    const abschnittBlock = /<section id="abschnitt-\d+" class="abschnitt">\s*<div class="container fluss">\s*<div class="inhalt prosa fluss">\s*<h2>14a\.[\s\S]*?<\/section>\n?/;
    const verzeichnisZeile = /\n\s*<li><a href="#abschnitt-\d+">14a\.[^\n]*<\/li>/;
    const kopfNeutral = (h) => h.replace(/Stand: [0-9.]+ –/, "Stand: # –").replace(/Quelle: [^\n]*<\/p>/, "Quelle: #</p>").replace(/abschnitt-\d+/g, "abschnitt-#");
    const orte = [
      ["docs/ws/datenschutz.html", path.join("docs", "ws", "datenschutz.html")],
      ["docs/appack-paket/web/datenschutz.html (Kopie des Pakets)", path.join("docs", "appack-paket", "web", "datenschutz.html")],
      ["dist/appack-paket/web/datenschutz.html (Paket)", path.join("dist", "appack-paket", "web", "datenschutz.html")],
    ];
    for (const [name, rel] of orte) {
      const o = lies(OHNE_ORDNER, rel);
      const m = lies(MIT_ORDNER, rel);
      const folge = ueberschriften(m);
      const i14 = folge.findIndex((t) => t.startsWith("14. "));
      ok(`${name}: Abschnitt „14a“ steht mit Schalter genau einmal (hinter 14, vor 15), ohne Schalter nirgends`, (m.match(/<h2>14a\./g) || []).length === 1 && i14 >= 0 && folge[i14 + 1] === ueberschrift14a && /^15\. /.test(folge[i14 + 2] || "") && !/14a\./.test(o), `Überschriften ab 14: ${folge.slice(i14, i14 + 3).join(" | ")}`);
      ok(`${name}: Stand und Quelle im Kopf: mit Schalter stand_trainer_live und quelle_trainer_live, ohne Schalter die bisherigen Werte (stand_live, quelle_live)`, m.includes(`Stand: ${dsDaten.stand_trainer_live} –`) && m.includes(`Quelle: ${dsDaten.quelle_trainer_live}</p>`) && o.includes(`Stand: ${dsDaten.stand_live} –`) && o.includes(`Quelle: ${dsDaten.quelle_live}</p>`), `mit Schalter Stand ${dsDaten.stand_trainer_live}, ohne ${dsDaten.stand_live}`);
      ok(`${name}: ohne den Abschnitt 14a, seinen Verzeichniseintrag, Stand, Quelle und die Nummern der Sprungmarken ist die Seite mit Schalter Zeichen für Zeichen die ohne Schalter`, abschnittBlock.test(m) && kopfNeutral(m.replace(abschnittBlock, "").replace(verzeichnisZeile, "")) === kopfNeutral(o));
    }
    ok("Datenschutzerklärung: die Kopie im Paket (docs/appack-paket/web) ist Byte für Byte die Seite in dist/appack-paket/web, mit und ohne Schalter", docsMit.get(DS_DOCS[0]) === distMit.get(DS_DIST[0]) && docsOhne.get(DS_DOCS[0]) === distOhne.get(DS_DIST[0]));
  }
  const dateienAssistent = [...distOhne.keys()].filter((p) => /web[\\/](?:anmeldung[.-]|aufnahmeantrag-)/.test(p));
  ok(`die ${dateienAssistent.length} Dateien des Assistenten und die geteilten (anmeldung*, aufnahmeantrag-pdf-lib.js, aufnahmeantrag-fontkit.js) sind im Paket mit Schalter Byte für Byte wie ohne`, dateienAssistent.length >= 36 && dateienAssistent.every((p) => distMit.get(p) === distOhne.get(p)));
  const manifestOhne = JSON.parse(fs.readFileSync(path.join(OHNE_ORDNER, "dist", "appack-paket", "manifest.json"), "utf8")).dateien.map((e) => e.datei);
  const manifestMit = JSON.parse(fs.readFileSync(path.join(MIT_ORDNER, "dist", "appack-paket", "manifest.json"), "utf8")).dateien.map((e) => e.datei);
  const ohneNeue = manifestMit.filter((d) => !manifestOhne.includes(d));
  ok("manifest.json: Reihenfolge der bisherigen Einträge unverändert, die 16 neuen kommen dazu (Seite unter den Seiten, Dateien der Trainerseite hinter denen des Assistenten)", JSON.stringify(manifestMit.filter((d) => manifestOhne.includes(d))) === JSON.stringify(manifestOhne) && ohneNeue.length === 16, `${manifestOhne.length} → ${manifestMit.length} Einträge`);
  ok("Sitemap und robots.txt: mit Schalter Byte für Byte wie ohne; die Trainerseite steht nicht in der Sitemap", docsOhne.get("sitemap.xml") === docsMit.get("sitemap.xml") && docsOhne.get("robots.txt") === docsMit.get("robots.txt") && !fs.readFileSync(path.join(MIT_ORDNER, "docs", "sitemap.xml"), "utf8").includes("trainerteam"));
  const wsHtml = fs.readFileSync(path.join(MIT_ORDNER, "docs", "ws", "trainerteam.html"), "utf8");
  ok("docs/ws/trainerteam.html: noindex, Titel wie in den Texten (ohne doppelten Vereinsnamen), kein Entwurfsband, keine Begleitelemente, keine „quellen“ in der Konfiguration (läuft auf GitHub Pages mit den Standardpfaden)", /<meta name="robots" content="noindex">/.test(wsHtml) && /<title>Neu im Trainerteam – FFV Sportfreunde 04<\/title>/.test(wsHtml) && !/data-anm-band|begleit-kopf|data-beispiel/.test(wsHtml) && !("quellen" in JSON.parse(KONFIG_MUSTER.exec(wsHtml)[2])));
  ok("Es gibt keine Begleitseite /trainerteam/ (docs/trainerteam/ fehlt) und keinen Eintrag im Menü der Hülle", !fs.existsSync(path.join(MIT_ORDNER, "docs", "trainerteam")) && !fs.readFileSync(path.join(MIT_ORDNER, "docs", "index.html"), "utf8").includes("trainerteam"));

  // ---------- [1b] Bauabbrüche ----------
  abschnitt("[1b] Bauabbrüche mit Schalter (Testkopien der Konfiguration und der Daten im Wegwerf-Ordner; data/trainer.json im Repo bleibt unberührt)");
  {
    const docsVorher = hashes(path.join(MIT_ORDNER, "docs"));
    const distVorher = hashes(path.join(MIT_ORDNER, "dist"));
    const FAELLE = [
      { titel: "leere Liste der Prüfwerte", konfig: (k) => { k.zugang.pruefwerte = []; }, regel: /zugang › pruefwerte ist leer: Die Seite bliebe für jeden Code zu/ },
      { titel: "Prüfwert ohne 64 Hexzeichen", konfig: (k) => { k.zugang.pruefwerte = ["abc123"]; }, regel: /pruefwerte: Eintrag 1 ist kein SHA-256 in Hexschreibweise/ },
      { titel: "Prüfwert aus 64 Hexzeichen in Großbuchstaben", konfig: (k) => { k.zugang.pruefwerte = [PRUEFWERT.toUpperCase()]; }, regel: /Eintrag 1 ist kein SHA-256/ },
      { titel: "leere Liste der Einsichtnehmenden", konfig: (k) => { k.einsicht = []; }, regel: /einsicht ist leer oder fehlt/ },
      { titel: "Einsichtnehmende ohne Namen", konfig: (k) => { k.einsicht = [{ funktion: "1. Vorsitzende" }]; }, regel: /einsicht: Eintrag 1 hat keinen Namen/ },
      { titel: "schnupperMonate 0", konfig: (k) => { k.schnupperMonate = 0; }, regel: /schnupperMonate muss eine ganze Zahl von 1 bis 12 sein \(gefunden: 0\)/ },
      { titel: "schnupperMonate 13", konfig: (k) => { k.schnupperMonate = 13; }, regel: /schnupperMonate muss eine ganze Zahl von 1 bis 12 sein \(gefunden: 13\)/ },
      { titel: "schnupperMonate keine Zahl (Text „1“)", konfig: (k) => { k.schnupperMonate = "1"; }, regel: /schnupperMonate muss eine ganze Zahl/ },
      { titel: "fehlender Unterzeichner", konfig: (k) => { delete k.verein.unterzeichner; }, regel: /verein › unterzeichner fehlt oder ist unvollständig/ },
      { titel: "leere Liste der Mannschaften (data/teams.json und data/karneval.json der Kopie ohne Einträge)", daten: { "data/teams.json": () => [], "data/karneval.json": (d) => ({ ...d, gruppen: [] }) }, regel: /Die Liste der Mannschaften ist leer/ },
      { titel: "Registername des Vereins fehlt (data/verein.json der Kopie)", daten: { "data/verein.json": (d) => { const { name_register, ...rest } = d; return rest; } }, regel: /data\/verein\.json › name_register fehlt/ },
      { titel: "Anschrift unvollständig, kein Postfach (data/verein.json der Kopie)", daten: { "data/verein.json": (d) => ({ ...d, post: { plz: "60091", ort: "Frankfurt am Main" } }) }, regel: /Es fehlt postfach/ },
      { titel: "Besuchsadresse unvollständig, keine Straße (data/verein.json der Kopie)", daten: { "data/verein.json": (d) => ({ ...d, sportstaette: { plz: d.sportstaette.plz, ort: d.sportstaette.ort } }) }, regel: /Es fehlt strasse/ },
      { titel: "Adresse des Kodex ohne https", konfig: (k) => { k.verein.kodexUrl = "http://example.com/kodex.pdf"; }, regel: /kodexUrl muss eine https-Adresse sein/ },
      { titel: "Auswahl der Mannschaften fehlt in der Konfiguration (mannschaften)", konfig: (k) => { delete k.mannschaften; }, regel: /mannschaften fehlt: abteilungen/ },
      { titel: "Abteilungen der Seite fehlen", konfig: (k) => { delete k.mannschaften.abteilungen; }, regel: /mannschaften › abteilungen muss eine nicht leere Liste/ },
      { titel: "Abteilungen der Seite leer", konfig: (k) => { k.mannschaften.abteilungen = []; }, regel: /mannschaften › abteilungen muss eine nicht leere Liste/ },
      { titel: "Abteilung unbekannt (Handball)", konfig: (k) => { k.mannschaften.abteilungen = ["fussball", "handball"]; }, regel: /mannschaften › abteilungen muss eine nicht leere Liste/ },
      { titel: "Abteilung doppelt", konfig: (k) => { k.mannschaften.abteilungen = ["fussball", "fussball"]; }, regel: /mannschaften › abteilungen muss eine nicht leere Liste/ },
      { titel: "Kategorien der Mannschaften leer", konfig: (k) => { k.mannschaften.kategorien = []; }, regel: /mannschaften › kategorien muss eine nicht leere Liste/ },
      { titel: "Ausnahme mit unbekanntem Namen", konfig: (k) => { k.mannschaften.ausgenommen = ["Gibt es nicht"]; }, regel: /ausgenommen: „Gibt es nicht“ gibt es weder in data\/teams\.json noch in data\/karneval\.json/ },
      { titel: "mehrere Fehler zugleich (alle werden genannt)", konfig: (k) => { k.zugang.pruefwerte = []; k.einsicht = []; k.schnupperMonate = 99; delete k.verein.unterzeichner; }, regel: /\(4 Fehler\)[\s\S]*pruefwerte ist leer[\s\S]*einsicht ist leer[\s\S]*schnupperMonate muss[\s\S]*unterzeichner fehlt/ },
    ];
    const baseKonfig = JSON.parse(fs.readFileSync(testDatei, "utf8"));
    const laufe = (nr, name, { datei, env: zusatz, daten }) => {
      const sicherungen = [];
      try {
        for (const [rel, fn] of Object.entries(daten || {})) {
          const pfad = path.join(MIT_ORDNER, rel);
          const text = fs.readFileSync(pfad, "utf8");
          sicherungen.push([pfad, text]);
          fs.writeFileSync(pfad, JSON.stringify(fn(JSON.parse(text)), null, 2));
        }
        const env = { ...process.env, PATH: PFAD, ANMELDUNG_LIVE: "1", TRAINER_LIVE: "1", TRAINER_DATEN: datei, ...(zusatz || {}) };
        const r = spawnSync(process.execPath, ["tools/build.mjs"], { cwd: MIT_ORDNER, env, encoding: "utf8" });
        return { status: r.status, aus: (r.stdout || "") + (r.stderr || ""), stderr: r.stderr || "" };
      } finally {
        for (const [pfad, text] of sicherungen) fs.writeFileSync(pfad, text);
      }
    };
    let nr = 0;
    for (const f of FAELLE) {
      nr++;
      const k = JSON.parse(JSON.stringify(baseKonfig));
      if (f.konfig) f.konfig(k);
      const datei = path.join(CACHE, `abbruch-${nr}.json`);
      fs.writeFileSync(datei, JSON.stringify(k, null, 2));
      const r = laufe(nr, f.titel, { datei, daten: f.daten });
      const meldung = (r.stderr.split("\n").find((z) => /Bau abgebrochen/.test(z)) || "").slice(0, 110);
      ok(`Abbruch ${nr}: ${f.titel} › Exit 1 mit verständlicher Meldung, ohne Aufrufstapel`, r.status === 1 && /^Bau abgebrochen \(TRAINER_LIVE\): Die Konfiguration der Seite „Neu im Trainerteam“ stimmt nicht/m.test(r.stderr) && f.regel.test(r.stderr) && !/\n\s+at /.test(r.stderr) && !r.aus.includes(PRUEFWERT), `Exit ${r.status}; ${(f.regel.exec(r.stderr) || [r.stderr.slice(0, 80)])[0].replace(/\s+/g, " ").slice(0, 120)}`);
      fs.rmSync(datei, { force: true });
    }
    // Aufrufe ohne gültige Quelle
    const r1 = laufe(0, "", { datei: path.join(CACHE, "gibt-es-nicht.json") });
    ok("Abbruch: TRAINER_DATEN zeigt auf eine Datei, die es nicht gibt › Exit 1, Meldung „lässt sich nicht lesen“", r1.status === 1 && /Bau abgebrochen \(TRAINER_LIVE\)[\s\S]*lässt sich nicht lesen/.test(r1.stderr) && !/\n\s+at /.test(r1.stderr), `Exit ${r1.status}`);
    const kaputt = path.join(CACHE, "abbruch-kein-json.json");
    fs.writeFileSync(kaputt, "{ kein JSON");
    const r2 = laufe(0, "", { datei: kaputt });
    ok("Abbruch: TRAINER_DATEN ist kein JSON › Exit 1, Meldung „kein gültiges JSON“", r2.status === 1 && /Bau abgebrochen \(TRAINER_LIVE\)[\s\S]*kein gültiges JSON/.test(r2.stderr) && !/\n\s+at /.test(r2.stderr), `Exit ${r2.status}`);
    fs.rmSync(kaputt, { force: true });
    const r3 = laufe(0, "", { datei: testDatei, env: { ANMELDUNG_LIVE: "0" } });
    // Die Meldung kommt vom ersten Modul, das den Fall bemerkt: src/seiten/datenschutz.mjs (T4; die Seiten laufen vor dem Block der Trainerseite in tools/build.mjs: „datenschutz.mjs: TRAINER_LIVE
    // verlangt ANMELDUNG_LIVE …“) oder tools/build.mjs („Bau abgebrochen: TRAINER_LIVE verlangt ANMELDUNG_LIVE …“); verlangt ist, dass sie klar sagt, dass TRAINER_LIVE den Schalter ANMELDUNG_LIVE verlangt.
    ok("Abbruch: TRAINER_LIVE ohne ANMELDUNG_LIVE › Exit 1, Meldung „TRAINER_LIVE verlangt ANMELDUNG_LIVE“ (aus src/seiten/datenschutz.mjs oder tools/build.mjs)", r3.status === 1 && /(?:Bau abgebrochen: |datenschutz\.mjs: )TRAINER_LIVE verlangt ANMELDUNG_LIVE/.test(r3.stderr), `Exit ${r3.status}; ${(r3.stderr.match(/.*TRAINER_LIVE verlangt ANMELDUNG_LIVE.*/) || [""])[0].trim().slice(0, 120)}`);
    // nach allen Abbrüchen: nichts geschrieben (der Bau bricht vor dem Schreiben von docs/ ab), Daten der Kopie wiederhergestellt
    const docsNachher = hashes(path.join(MIT_ORDNER, "docs"));
    const distNachher = hashes(path.join(MIT_ORDNER, "dist"));
    const d1 = unterschied(docsVorher, docsNachher);
    const d2 = unterschied(distVorher, distNachher);
    ok("nach allen Abbrüchen: docs/ und dist/ sind unverändert (der Bau bricht ab, bevor etwas geschrieben wird)", d1.nurA.length + d1.nurB.length + d1.anders.length + d2.nurA.length + d2.nurB.length + d2.anders.length === 0, `${docsVorher.size} Dateien in docs/, ${distVorher.size} in dist/`);
    const ohneKaputt = path.join(CACHE, "ohne-schalter-kaputt.json");
    fs.writeFileSync(ohneKaputt, JSON.stringify({ ...baseKonfig, zugang: { parameter: "code", pruefwerte: [] }, einsicht: [], schnupperMonate: 99 }, null, 2));
    // Ohne Schalter bricht nichts ab: auch mit einer kaputten Konfiguration (sie wird nicht einmal gelesen), mit Standard und mit TRAINER_LIVE=0
    const vorherOhne = hashes(path.join(OHNE_ORDNER, "docs"));
    // „Standard“ (die Umgebungsvariable fehlt) heißt nur „aus“, solange TRAINER_LIVE_SCHALTER im Code auf false steht (bis zum Livegang); danach gilt allein TRAINER_LIVE=0.
    const schalterImCodeAus = /^const TRAINER_LIVE_SCHALTER = false;/m.test(fs.readFileSync(path.join(ROOT, "src", "vorlagen", "hilfen.mjs"), "utf8"));
    for (const [name, zusatz] of [...(schalterImCodeAus ? [["Standard (Umgebungsvariable fehlt)", {}]] : []), ["TRAINER_LIVE=0", { TRAINER_LIVE: "0" }]]) {
      const env = { ...process.env, PATH: PFAD, ANMELDUNG_LIVE: "1", TRAINER_DATEN: ohneKaputt, ...zusatz };
      delete env.TRAINER_LIVE;
      Object.assign(env, zusatz);
      // wie npm run build: erst build.mjs, dann appack-paket.mjs (build.mjs räumt docs/ auf, auch die Kopie des Pakets)
      const r = spawnSync(process.execPath, ["tools/build.mjs"], { cwd: OHNE_ORDNER, env, encoding: "utf8" });
      const r2 = r.status === 0 ? spawnSync(process.execPath, ["tools/appack-paket.mjs"], { cwd: OHNE_ORDNER, env, encoding: "utf8" }) : { status: -1, stdout: "", stderr: "" };
      const aus = (r.stdout || "") + (r.stderr || "") + (r2.stdout || "") + (r2.stderr || "");
      const dd2 = unterschied(vorherOhne, hashes(path.join(OHNE_ORDNER, "docs")));
      const di2 = unterschied(distOhne, hashes(path.join(OHNE_ORDNER, "dist")));
      ok(`ohne Schalter (${name}) und mit kaputter Konfiguration in TRAINER_DATEN: der Bau läuft durch (Exit 0), nichts davon wird gelesen, docs/ und dist/ bleiben Byte für Byte gleich`, r.status === 0 && r2.status === 0 && !/Bau abgebrochen|Trainerseite|trainerteam/.test(aus) && dd2.nurA.length + dd2.nurB.length + dd2.anders.length + di2.nurA.length + di2.nurB.length + di2.anders.length === 0, `Exit ${r.status}/${r2.status}`);
    }
    fs.rmSync(ohneKaputt, { force: true });
    // „kategorien“ und „ausgenommen“ wirken (direkt über baueKonfig, ohne Bau; Gegenprüfung F2, 24.11.2026)
    {
      const { baueKonfig } = await import("../../src/begleit/trainerteam.mjs");
      const lies = (n) => JSON.parse(fs.readFileSync(path.join(ROOT, "data", n), "utf8"));
      const daten = (m) => ({ trainer: { ...baseKonfig, mannschaften: m }, verein: lies("verein.json"), teams: lies("teams.json"), karneval: lies("karneval.json"), downloads: lies("downloads.json") });
      const namen = (k, abt) => k.mannschaften.filter((x) => x.abteilung === abt).map((x) => x.name);
      const standard = baueKonfig(daten({ abteilungen: ["fussball", "karneval"], kategorien: ["Jugend"], ausgenommen: [] }));
      const mitSenioren = baueKonfig(daten({ abteilungen: ["fussball", "karneval"], kategorien: ["Jugend", "Senioren"], ausgenommen: [] }));
      const ohneGruppe = baueKonfig(daten({ abteilungen: ["fussball", "karneval"], kategorien: ["Jugend"], ausgenommen: ["Dreamboys", "Soma (Sondermannschaft)"] }));
      const nurFussball = baueKonfig(daten({ abteilungen: ["fussball"], kategorien: ["Jugend"], ausgenommen: [] }));
      const nurKarneval = baueKonfig(daten({ abteilungen: ["karneval"], kategorien: ["Jugend"], ausgenommen: [] }));
      ok("Mannschaften: mit der Kategorie „Jugend“ fehlen Herren und Soma, die Jugend-Mannschaften und alle Karneval-Gruppen stehen drin (beide Abteilungen)",
        !namen(standard, "fussball").includes("1. Herrenmannschaft") && !namen(standard, "fussball").includes("Soma (Sondermannschaft)") && namen(standard, "fussball").includes("D3-Jugend") && namen(standard, "karneval").includes("Dreamboys") && JSON.stringify(standard.abteilungen) === JSON.stringify(["fussball", "karneval"]),
        `${namen(standard, "fussball").length} Mannschaften, ${namen(standard, "karneval").length} Gruppen`);
      ok("Mannschaften: mit der Kategorie „Senioren“ dazu stehen Herren und Soma wieder in der Auswahl", namen(mitSenioren, "fussball").includes("1. Herrenmannschaft") && namen(mitSenioren, "fussball").includes("Soma (Sondermannschaft)"));
      ok("Mannschaften: „ausgenommen“ nimmt eine Karneval-Gruppe heraus, die übrigen Gruppen bleiben", !namen(ohneGruppe, "karneval").includes("Dreamboys") && namen(ohneGruppe, "karneval").length === namen(standard, "karneval").length - 1);
      ok("Abteilungen: nur „fussball“ › keine Karneval-Gruppe in der Konfiguration, die Jugend-Mannschaften bleiben (Melli 24.11.2026: Karneval vorerst außen vor)",
        namen(nurFussball, "karneval").length === 0 && namen(nurFussball, "fussball").length === namen(standard, "fussball").length && JSON.stringify(nurFussball.abteilungen) === JSON.stringify(["fussball"]));
      ok("Abteilungen: nur „karneval“ › keine Fußball-Mannschaft, alle Gruppen", namen(nurKarneval, "fussball").length === 0 && namen(nurKarneval, "karneval").length === namen(standard, "karneval").length && JSON.stringify(nurKarneval.abteilungen) === JSON.stringify(["karneval"]));
    }
  }

  // ---------- [2] Paketprüfung ohne Browser ----------
  abschnitt("[2] Paketprüfung ohne Browser (appack-paket-pruefen.mjs --statisch)");
  for (const [name, ordner, schalter] of [["ohne Schalter", OHNE_ORDNER, "0"], ["mit Schalter", MIT_ORDNER, "1"]]) {
    const r = spawnSync(process.execPath, ["tools/appack-paket-pruefen.mjs", "--statisch"], { cwd: ordner, env: { ...process.env, PATH: PFAD, ANMELDUNG_LIVE: "1", TRAINER_LIVE: schalter }, encoding: "utf8" });
    const ausgabe = (r.stdout || "") + (r.stderr || "");
    const meldungen = (ausgabe.match(/^OK   /gm) || []).length;
    ok(`Paketprüfung ${name}: alle Prüfungen ohne Browser bestanden`, r.status === 0, `${meldungen} Prüfungen OK` + (r.status === 0 ? "" : "; " + ausgabe.split("\n").filter((z) => /FEHLER/.test(z)).slice(0, 2).join(" | ").slice(0, 300)));
    if (schalter === "1") {
      const abschnittTrainer = ausgabe.slice(ausgabe.indexOf("=== Seite „Neu im Trainerteam“ im Paket"));
      const zeilenTrainer = (abschnittTrainer.match(/^OK   /gm) || []).length;
      ok("Paketprüfung mit Schalter: der Abschnitt zur Trainerseite läuft (Konfiguration, Namen, Größe, node --check, Verweise, keine Doppelung, noindex, Hosts, …), alle OK, keine FEHLER-Zeile", zeilenTrainer >= 17 && !/^FEHLER/m.test(abschnittTrainer), zeilenTrainer + " Prüfungen OK");
    }
  }

  // ---------- [3] Die Seite im Paket ----------
  abschnitt("[3] Die Seite im Paket (dist/appack-paket/web)");
  const web = path.join(MIT_ORDNER, "dist", "appack-paket", "web");
  const paketHtml = fs.readFileSync(path.join(web, "trainerteam.html"), "utf8");
  const konfig = JSON.parse(KONFIG_MUSTER.exec(paketHtml)[2]);
  ok("Konfiguration im Paket: Zugang mit dem Testprüfwert, eine Person zur Einsicht (aus data/trainer.json), Mannschaften, Quellen im Ordner", konfig.zugang.pruefwerte.length === 1 && konfig.zugang.pruefwerte[0] === PRUEFWERT && konfig.einsicht.length === 1 && konfig.einsicht[0].name === trainerJson.einsicht[0].name && konfig.mannschaften.length >= 1 && ["pdfLib", "fontkit", "schriftModul"].every((k) => fs.existsSync(path.join(web, konfig.quellen[k]))), `${konfig.mannschaften.length} Mannschaften und Gruppen`);
  {
    // Auswahl im Paket: nur Jugend-Mannschaften (kein Herren- oder Soma-Team; Gegenprüfung F2) und alle Karneval-Gruppen außer den ausgenommenen
    const teamsJson = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "teams.json"), "utf8"));
    const karnevalJson = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "karneval.json"), "utf8"));
    const ausgenommen = trainerJson.mannschaften.ausgenommen;
    const abteilungenSoll = trainerJson.mannschaften.abteilungen;
    const soll = (abt) => (!abteilungenSoll.includes(abt) ? [] : abt === "fussball" ? teamsJson.filter((t) => trainerJson.mannschaften.kategorien.includes(t.kategorie)).map((t) => t.name) : karnevalJson.gruppen.map((g) => g.name)).filter((n) => !ausgenommen.includes(n));
    const ist = (abt) => konfig.mannschaften.filter((m) => m.abteilung === abt).map((m) => m.name);
    ok("Mannschaften im Paket: genau die Mannschaften der Abteilungen und Kategorien aus data/trainer.json (Standard: nur Fußball, nur Jugend, ohne Herren und Soma, ohne Karneval)",
      JSON.stringify(ist("fussball")) === JSON.stringify(soll("fussball")) && JSON.stringify(ist("karneval")) === JSON.stringify(soll("karneval")) && !ist("fussball").includes("1. Herrenmannschaft") && JSON.stringify(konfig.abteilungen) === JSON.stringify(abteilungenSoll),
      `${ist("fussball").length} Mannschaften, ${ist("karneval").length} Gruppen, Abteilungen ${JSON.stringify(konfig.abteilungen)}`);
  }
  ok("Seite im Paket: Stylesheets und Start im Ordner der Seite (anmeldung.css, trainer.css, import(\"./anmeldung-trainer.js\")), kein ../assets/", /href="anmeldung\.css"/.test(paketHtml) && /href="trainer\.css"/.test(paketHtml) && /import\("\.\/anmeldung-trainer\.js"\)/.test(paketHtml) && !paketHtml.includes("../assets/"));
  ok("Seite im Paket: Impressum und Datenschutz verlinkt (impressum.html, datenschutz.html im selben Ordner)", /href="impressum\.html"/.test(paketHtml) && /href="datenschutz\.html"/.test(paketHtml) && fs.existsSync(path.join(web, "impressum.html")) && fs.existsSync(path.join(web, "datenschutz.html")));
  ok("Seite im Paket: <noscript>-Hinweis für Browser ohne JavaScript (mit der Adresse der Geschäftsstelle)", /<noscript>[\s\S]*Diese Seite braucht JavaScript[\s\S]*geschaeftsstelle@sportfreunde04\.de[\s\S]*<\/noscript>/.test(paketHtml));
  const namensfund = fs.readdirSync(web).filter((n) => /^anmeldung-(?:texte-)?trainer[.-]/.test(n)).filter((n) => /Seipp|Melanie/.test(fs.readFileSync(path.join(web, n), "utf8")));
  ok("Kein Name der Einsichtnehmenden fest im Code und in den Texten der Trainerseite (anmeldung-trainer*.js, anmeldung-texte-trainer-de.js): er kommt aus der Konfiguration", namensfund.length === 0, namensfund.join(", "));
  // Schrift im Paket (T1b): Der Lader liest den Base64-Text aus dem Quelltext des Moduls (fetch) statt das Modul zu importieren; das Ergebnis
  // ist Byte für Byte dasselbe wie beim bisherigen Weg (import() des Moduls, dann atob) und wie die Schriftdatei selbst.
  {
    const modulText = fs.readFileSync(path.join(web, "anmeldung-schrift.js"), "utf8");
    const lader = await import(pathToFileURL(path.join(ROOT, "assets", "js", "anmeldung", "trainer-pdf-lader.js")).href);
    const text = lader.leseModulText(modulText);
    const neuBytes = typeof text === "string" ? Buffer.from(text, "base64") : Buffer.alloc(0);
    const altText = (await import("data:text/javascript;base64," + Buffer.from(modulText, "utf8").toString("base64"))).default;
    const altBytes = Buffer.from(altText, "base64");
    const ttf = fs.readFileSync(path.join(ROOT, "assets", "fonts", "liberation-sans-regular.ttf"));
    ok("Schrift im Paket (anmeldung-schrift.js): der Lader erkennt das Format („export default“ mit Base64-Text), sonst bliebe nur der Rückfall auf import()", typeof text === "string" && text.length > 100000, typeof text === "string" ? text.length + " Zeichen Base64" : "Format nicht erkannt");
    ok("Schrift im Paket: die Bytes nach dem neuen Weg (Text lesen, dekodieren) sind Byte für Byte gleich denen nach dem bisherigen Weg (import() des Moduls) und der Schriftdatei (Liberation Sans Regular)", neuBytes.length > 0 && sha256(neuBytes) === sha256(altBytes) && sha256(neuBytes) === sha256(ttf), `${neuBytes.length} Byte, SHA-256 ${sha256(neuBytes)}`);
  }

  // ---------- Server und Browser ----------
  await starteServer(web);
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });
  const bilder = path.join(AUSGABE, "bilder");
  let fehlschlag = null;
  try {
    // ---------- [4] Zugang ----------
    abschnitt("[4] Zugang im Browser");
    {
      const page = await neueSeite(browser, "ohne Code", "");
      const st = page.__st;
      const s0 = await schritt(page);
      const dom = await page.evaluate(() => ({
        felder: Array.from(document.querySelectorAll("#anmeldung [data-pfad]")).map((e) => e.getAttribute("data-pfad")),
        formulare: document.querySelectorAll("#anmeldung form").length,
        text: document.getElementById("anmeldung").innerText,
        h2: Array.from(document.querySelectorAll("#anmeldung h2")).map((e) => e.textContent.trim()),
      }));
      ok("ohne Code: der erste Bildschirm ist die Code-Seite („Dein Zugangscode“), nur das Feld für den Code, sonst nichts aus den Angaben im Dokument", s0 === "code" && JSON.stringify(dom.felder) === JSON.stringify(["zugang.code"]) && dom.formulare === 1 && dom.h2.join() === "Dein Zugangscode" && !/Wer bist du\?|Schön, dass du dabei bist|Verhaltenskodex zum Kindeswohl|Dein Passfoto/.test(dom.text), `Schritt ${s0}, Felder ${dom.felder.join(",")}, Überschrift ${dom.h2.join("|")}`);
      ok("ohne Code: kein weiterer Bildschirm ist über die Adresse erreichbar (keine Adresse außer ?code=…; die Seite hat keine Unterseiten)", (await page.evaluate(() => location.search === "" && location.hash === "")) === true);
      await foto(page, path.join(bilder, "01-code-390.png"));
      ok("ohne Code: Hilfe und „Code anfragen“ nennen die Adresse der Geschäftsstelle", /geschaeftsstelle@sportfreunde04\.de/.test(await page.evaluate(() => document.getElementById("anmeldung").innerHTML)));
      // falscher Code
      await text(page, "zugang.code", FALSCH);
      await weiter(page);
      await warte(400);
      const nachFalsch = await page.evaluate(() => ({ schritt: document.getElementById("anmeldung").dataset.schritt, fehler: Array.from(document.querySelectorAll("#anmeldung .anm-fehler")).filter((e) => e.getClientRects().length && e.textContent.trim()).map((e) => e.textContent.trim()), box: !!document.querySelector("#anmeldung .anm-fehlerbox:not([hidden])") }));
      ok("falscher Code: die Seite bleibt auf der Code-Seite, eine Fehlermeldung am Feld und in der Liste", nachFalsch.schritt === "code" && nachFalsch.fehler.length >= 1 && nachFalsch.box, nachFalsch.fehler.join(" | ").slice(0, 120));
      await foto(page, path.join(bilder, "01-code-falsch-390.png"));
      // richtiger Code in anderer Schreibweise: klein, mit Leerzeichen
      await text(page, "zugang.code", TESTCODE.toLowerCase().replace(/-/g, " "));
      await weiter(page, "start");
      ok("richtiger Code (klein, mit Leerzeichen statt Bindestrichen): weiter zu „start“", (await schritt(page)) === "start");
      ok("richtiger Code: die Adresse trägt jetzt ?code=… (Neuladen fragt nicht noch einmal), der Verlauf bleibt derselbe", await page.evaluate(() => /[?&]code=[A-Z0-9]+$/.test(location.search)));
      ok("Code-Seite: Konsole ohne Fehler und Warnungen, keine Anfrage an einen fremden Host", st.konsole.length === 0 && st.fremd.length === 0 && st.antwortenFehler.length === 0, [...st.konsole, ...st.fremd, ...st.antwortenFehler].slice(0, 3).join(" | "));
      await schliesseSeite(page);

      // Link mit richtigem Code: Start ohne Code-Seite
      const p2 = await neueSeite(browser, "Link richtig", "?code=" + TESTCODE);
      ok("Link mit ?code=richtig: die Seite beginnt auf „start“, die Code-Seite erscheint nie", (await schritt(p2)) === "start" && !(await p2.evaluate(() => !!document.querySelector('#anmeldung [data-pfad="zugang.code"]'))));
      await schliesseSeite(p2);
      // Link mit falschem Code: Code-Seite, Code im Feld, Meldung darunter
      const p3 = await neueSeite(browser, "Link falsch", "?code=" + FALSCH);
      const d3 = await p3.evaluate(() => ({ schritt: document.getElementById("anmeldung").dataset.schritt, wert: document.querySelector('#anmeldung [data-pfad="zugang.code"]').value, fehler: Array.from(document.querySelectorAll("#anmeldung .anm-fehler")).filter((e) => e.getClientRects().length && e.textContent.trim()).length }));
      ok("Link mit ?code=falsch: Code-Seite mit dem Code im Feld und der Meldung", d3.schritt === "code" && d3.wert === FALSCH && d3.fehler >= 1);
      await schliesseSeite(p3);
      // leere Liste der Prüfwerte im Paket: die Seite bleibt für jeden Code zu (auch mit dem Link, der sonst passen würde)
      srv.konfigAenderung = (k) => {
        k.zugang.pruefwerte = [];
      };
      const p4 = await neueSeite(browser, "leere Liste", "?code=" + TESTCODE);
      const d4 = await p4.evaluate(() => ({ schritt: document.getElementById("anmeldung").dataset.schritt, felder: Array.from(document.querySelectorAll("#anmeldung [data-pfad]")).map((e) => e.getAttribute("data-pfad")) }));
      ok("leere Liste der Prüfwerte (Paketseite mit geänderter Konfiguration): auch mit einem Code im Link bleibt die Seite zu", d4.schritt === "code" && d4.felder.join() === "zugang.code");
      await text(p4, "zugang.code", TESTCODE);
      await weiter(p4);
      await warte(300);
      ok("leere Liste: auch der eingegebene Code öffnet nichts", (await schritt(p4)) === "code");
      await schliesseSeite(p4);
      srv.konfigAenderung = null;
      // Modul nicht ladbar: Text „Ladefehler“ statt einer leeren Seite
      srv.gesperrt.add(WEB + "anmeldung-trainer.js");
      const p5 = await neueSeite(browser, "Modul fehlt", "?code=" + TESTCODE, { ohneBereit: true });
      await warte(500);
      const d5 = await p5.evaluate(() => document.getElementById("anmeldung").innerText);
      ok("Modul nicht ladbar (404): die Seite zeigt den Text „Die Seite lässt sich nicht laden. Bitte schreib an …“ mit der Adresse, nicht einen leeren Bildschirm", /Die Seite lässt sich nicht laden\. Bitte schreib an geschaeftsstelle@sportfreunde04\.de\./.test(d5), d5.slice(0, 100));
      await foto(p5, path.join(bilder, "00-ladefehler-390.png"));
      await schliesseSeite(p5);
      srv.gesperrt.delete(WEB + "anmeldung-trainer.js");
      // Das PDF-Modul und seine Teile hängen statisch an anmeldung-trainer.js und laden mit der Seite (T1b: Safari merkt sich ein gescheitertes
      // import() für die ganze Sitzung, ein Laden erst beim Erstellen hülfe nach einem Fehler nie mehr): Scheitert eine dieser Dateien (503),
      // steht beim Start ebenfalls „Ladefehler“ da, wenn noch nichts eingegeben ist. Je eine Datei aus drei Ebenen des Graphen.
      for (const datei of ["anmeldung-trainer-pdf.js", "anmeldung-trainer-pdf-texte.js", "anmeldung-trainer-pdf-wappen.js"]) {
        srv.ausfall.set(WEB + datei, { status: 503, rest: Infinity, getroffen: 0 });
        const pAus = await neueSeite(browser, "PDF-Teil fehlt: " + datei, "?code=" + TESTCODE, { ohneBereit: true });
        await warte(300);
        const dAus = await pAus.evaluate(() => {
          const w = document.getElementById("anmeldung");
          return { text: w.innerText.trim(), bereit: w.hasAttribute("data-bereit"), schritt: w.getAttribute("data-schritt"), formulare: w.querySelectorAll("form").length, knoepfe: w.querySelectorAll("button").length };
        });
        ok(`${datei} nicht erreichbar (503): beim Start steht „Die Seite lässt sich nicht laden. Bitte schreib an geschaeftsstelle@sportfreunde04.de.“ (kein leerer Bildschirm, kein Formular, keine Knöpfe, Seite nicht „bereit“)`, dAus.text === "Die Seite lässt sich nicht laden. Bitte schreib an geschaeftsstelle@sportfreunde04.de." && !dAus.bereit && !dAus.schritt && dAus.formulare === 0 && dAus.knoepfe === 0 && srv.ausfall.get(WEB + datei).getroffen >= 1, `${dAus.text.slice(0, 60)}…; Server hat ${srv.ausfall.get(WEB + datei).getroffen}× mit 503 geantwortet`);
        if (datei === "anmeldung-trainer-pdf.js") await foto(pAus, path.join(bilder, "00-ladefehler-pdf-390.png"));
        await schliesseSeite(pAus);
        srv.ausfall.delete(WEB + datei);
      }
      const pNach = await neueSeite(browser, "nach dem Ausfall", "?code=" + TESTCODE);
      ok("PDF-Teile wieder erreichbar: Neuladen startet die Seite normal (Bildschirm „start“, es war noch nichts eingegeben)", (await schritt(pNach)) === "start" && pNach.__st.konsole.length === 0, `Schritt ${await schritt(pNach)}`);
      await schliesseSeite(pNach);
    }

    // ---------- [5] Alle 13 Bildschirme ----------
    abschnitt("[5] Alle 13 Bildschirme mit den Beispieldaten (Fußball, Antrag auf Gebührenbefreiung) bis zu den fertigen Dateien");
    const einsichtDefault = `${trainerJson.einsicht[0].name} (${trainerJson.einsicht[0].funktion})`;
    const einsichtKurz = trainerJson.einsicht[0].name;
    let dateienHaupt = null;
    {
      srv.anfragen.length = 0;
      const page = await neueSeite(browser, "Hauptlauf", "?code=" + TESTCODE);
      const st = page.__st;
      const anfragenVorStart = st.eigene.length;
      const reihenfolge = await geheDurch(page, BEISPIEL, bilder);
      ok("alle Bildschirme in der Reihenfolge start › person › einsatz › notfall › erfahrung › foto › kodex › selbstauskunft › zeugnis › unterschriften › pruefen › fertig", JSON.stringify(reihenfolge) === JSON.stringify(SCHRITTE.slice(1)), reihenfolge.join(" › "));
      const korpus = await sichtbarerText(page);
      ok("Bildschirm „fertig“: Titel, die eine Datei mit ihrem Namen (kein Brief und kein Passfoto als eigene Datei), die Wege zum Verein mit der Adresse der Geschäftsstelle", /Dein Paket ist fertig/.test(korpus) && korpus.includes("Trainerunterlagen_Mustermann_Max.pdf") && !korpus.includes("Antrag_Gebuehrenbefreiung") && !korpus.includes("Passfoto_Mustermann") && korpus.includes("geschaeftsstelle@sportfreunde04.de"));
      ok("Bildschirm „fertig“: Einsicht bei der Person aus der Konfiguration (pronomenfrei): „Du: Zeigst es persönlich " + einsichtKurz + ".“", korpus.includes(`Du: Zeigst es persönlich ${einsichtKurz}.`) && !/\bEr\b|\bSie schaut/.test(korpus), "");
      // Teilen: die Dateien holen
      await page.click('#anmeldung [data-aktion="teilen"]');
      await warte(500);
      const geteilt = await liesDateienAusSeite(page);
      dateienHaupt = geteilt;
      const namen = geteilt.map((d) => d.name).sort();
      ok("Teilen: genau eine Datei mit dem Namen Trainerunterlagen_Mustermann_Max.pdf (Typ application/pdf)", JSON.stringify(namen) === JSON.stringify(["Trainerunterlagen_Mustermann_Max.pdf"]) && geteilt.every((d) => d.typ === "application/pdf"), namen.join(", "));
      for (const d of geteilt) fs.writeFileSync(path.join(AUSGABE, "dateien", d.name), Buffer.from(d.b64, "base64"));
      const paket = geteilt.find((d) => d.name.startsWith("Trainerunterlagen"));
      const pp = paket ? pdfPruefen(Buffer.from(paket.b64, "base64"), "paket.pdf") : null;
      // Der Brief (Seite 8) und das Passfoto (Seite 9) stecken in derselben Datei: Text der Seite 8 und Bilder je Seite
      const dateiPfad = path.join(AUSGABE, "dateien", paket ? paket.name : "fehlt.pdf");
      const briefText = paket ? norm(ausfuehren("pdftotext", ["-f", "8", "-l", "8", dateiPfad, "-"]).stdout || "") : "";
      const bildListe = paket ? (ausfuehren("pdfimages", ["-list", dateiPfad]).stdout || "").trim().split("\n").slice(2).map((z) => z.trim().split(/\s+/)) : [];
      const bildSeiten = bildListe.filter((t) => t[2] === "image").map((t) => Number(t[0]));
      ok("Datei: gültig (pdfinfo), neun Seiten (sieben Paket, Brief, Passfoto), Schrift eingebettet (Liberation Sans)", !!pp && pp.gueltig && pp.seiten === 9 && /LiberationSans/.test(pp.schriften) && !/\b(Helvetica|Arial|Times)\b/.test(pp.schriften), pp ? pp.seiten + " Seiten" : "fehlt");
      ok(`Paket-PDF (pdftotext): „Einsicht bei ${einsichtKurz}“ – der Name stammt aus der Konfiguration, nicht aus dem Code`, !!pp && pp.text.includes(`Einsicht bei ${einsichtKurz}`));
      ok("Paket-PDF: Name, Mannschaft, Verhaltenskodex, Selbstauskunft, Information nach Art. 13 DSGVO und die Anschrift des Vereins (Postfach) aus den Vereinsdaten", !!pp && /Max Mustermann/.test(pp.text) && /D3-Jugend/.test(pp.text) && /Verhaltenskodex/.test(pp.text) && /Selbstauskunft/.test(pp.text) && /Artikel 13/.test(pp.text) && /Postfach 190442/.test(pp.text) && /Frankfurter Fußballverein Sportfreunde 1904 e\. V\./.test(pp.text.replace(/\s+/g, " ")));
      ok("Paket-PDF: Fälligkeit nach der Schnupperphase aus der Konfiguration (Beginn 02.11.2026 + 1 Monat = 02.12.2026) und Datum der Unterschrift (heute des Tests)", !!pp && /02\.12\.2026/.test(pp.text) && /23\.11\.2026/.test(pp.text));
      ok("Brief (Seite 8, pdftotext): enthält „Nr. 2 Buchst. a“ (§ 30a Abs. 1 Nr. 2 Buchst. a BZRG) und den Namen der antragstellenden Person", /ANTRAG AUF GEBÜHRENBEFREIUNG/.test(briefText) && /Nr\. 2 Buchst\. a/.test(briefText) && /Mustermann/.test(briefText), (/Nr\. 2 Buchst\. a/.exec(briefText) || [""])[0]);
      ok("Brief (Seite 8): trägt den Unterzeichner aus der Konfiguration (Name und Funktion), kein Unterschriftsbild des Vereins (kein Bild auf Seite 8), keine Fußzeile", briefText.includes(`${trainerJson.verein.unterzeichner.name}`) && briefText.includes(trainerJson.verein.unterzeichner.funktion) && !bildListe.some((t) => Number(t[0]) === 8) && !/Seite \d+ von/.test(briefText), "");
      const fotoZeile = bildListe.find((t) => t[2] === "image" && Number(t[0]) === 9);
      ok("Passfoto: Seite 9 („Passfoto von Max Mustermann“) trägt genau ein Bild, ein JPEG (pdfimages: Seite 9, Kodierung jpeg); Bilder sonst nur die vier Unterschriften auf den Seiten 2 bis 5", !!fotoZeile && fotoZeile[8] === "jpeg" && JSON.stringify(bildSeiten) === JSON.stringify([2, 3, 4, 5, 9]) && !!pp && /Passfoto von Max Mustermann/.test(pp.text), fotoZeile ? "Seite " + fotoZeile[0] + " " + fotoZeile[8] + " " + fotoZeile[3] + "×" + fotoZeile[4] : "fehlt");
      ok("Datei: weder der Zugangscode noch sein Prüfwert steht im PDF-Text", !!pp && ![pp.text].some((t) => t.includes(TESTCODE) || t.includes(TESTCODE.replace(/-/g, "")) || t.includes(PRUEFWERT)));
      // Herunterladen (echte Downloads über Chrome)
      const dl = path.join(AUSGABE, "dateien", "herunterladen");
      fs.rmSync(dl, { recursive: true, force: true });
      fs.mkdirSync(dl, { recursive: true });
      let dlOk = false;
      let dlDetail = "";
      try {
        const cdp = await browser.target().createCDPSession();
        await cdp.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: dl });
        await page.click('#anmeldung [data-aktion="herunterladen"]');
        for (let i = 0; i < 40 && fs.readdirSync(dl).filter((n) => !n.endsWith(".crdownload")).length < 1; i++) await warte(300);
        const geladen = fs.readdirSync(dl).filter((n) => !n.endsWith(".crdownload")).sort();
        const gleich = geteilt.every((d) => fs.existsSync(path.join(dl, d.name)) && sha256(fs.readFileSync(path.join(dl, d.name))) === sha256(Buffer.from(d.b64, "base64")));
        await warte(1200); // nach einer Weile kommt keine weitere Datei dazu
        dlOk = fs.readdirSync(dl).filter((n) => !n.endsWith(".crdownload")).length === 1 && geladen.length === 1 && gleich;
        dlDetail = geladen.join(", ");
      } catch (fehler) {
        dlDetail = "Herunterladen nicht prüfbar: " + fehler.message;
      }
      ok("Herunterladen („Datei herunterladen“, echter Download in Chrome): genau eine Datei, Byte für Byte wie beim Teilen", dlOk, dlDetail);
      fs.rmSync(dl, { recursive: true, force: true });
      // Netz und Konsole
      const eigeneNachStart = st.eigene.slice(anfragenVorStart);
      const postOderBody = st.eigene.filter((a) => a.methode !== "GET" || a.body);
      const personenbezug = st.eigene.filter((a) => /Mustermann|example\.com|1234567|Musterstra/i.test(a.pfad + a.abfrage));
      const codeInAnfrage = st.eigene.filter((a) => a.art !== "document" && (maske(a.pfad + a.abfrage) !== a.pfad + a.abfrage));
      ok("Netz: nichts wird gesendet – alle Anfragen sind GET ohne Body an Dateien des Pakets (kein POST, kein fetch mit Daten, keine Angaben in einer Adresse)", postOderBody.length === 0 && personenbezug.length === 0, `${st.eigene.length} Anfragen an die eigene Seite, ${st.gh.length} an gemeinsame Assets (lokal beantwortet)`);
      ok("Netz: der Code steht in keiner Anfrage außer in der Adresse der Seite selbst und geht nicht im Referer an GitHub Pages mit", codeInAnfrage.length === 0 && st.referer.every((r) => !/code=/.test(r)), st.referer.length + " Anfragen an GitHub Pages geprüft");
      ok("Netz: keine Anfrage an einen fremden Host, keine Antwort mit Status ab 400", st.fremd.length === 0 && st.antwortenFehler.length === 0, [...st.fremd, ...st.antwortenFehler].slice(0, 3).join(" | "));
      const geladenNachStart = eigeneNachStart.map((a) => path.basename(a.pfad)).filter((n) => /pdf|schrift|aufnahmeantrag/.test(n));
      const geladenVorStart = st.eigene.slice(0, anfragenVorStart).map((a) => path.basename(a.pfad));
      const serverPdf = srv.anfragen.filter((a) => a.pfad === WEB + "anmeldung-trainer-pdf.js").map((a) => `${a.methode} ${a.dest} ${a.status}`);
      const serverSchrift = srv.anfragen.filter((a) => a.pfad === WEB + "anmeldung-schrift.js").map((a) => `${a.methode} ${a.dest} ${a.status}`);
      const serverWerkzeuge = srv.anfragen.filter((a) => a.pfad === WEB + "aufnahmeantrag-pdf-lib.js" || a.pfad === WEB + "aufnahmeantrag-fontkit.js").map((a) => `${path.basename(a.pfad)} ${a.dest} ${a.status}`);
      ok("Netz: das PDF-Modul (anmeldung-trainer-pdf.js) wird beim Start der Seite geladen, vor jeder Eingabe, einmal und als Skript (Sec-Fetch-Dest script); danach nie wieder", geladenVorStart.includes("anmeldung-trainer-pdf.js") && !geladenNachStart.includes("anmeldung-trainer-pdf.js") && JSON.stringify(serverPdf) === JSON.stringify(["GET script 200"]), `Server: ${serverPdf.join("; ")}; im Start: ${geladenVorStart.includes("anmeldung-trainer-pdf.js") ? "ja" : "nein"}`);
      ok("Netz: pdf-lib, fontkit und die Schrift werden erst beim Erstellen oder bei „Antrag ansehen“ geladen (aus dem Ordner der Seite): pdf-lib und fontkit als Skript, die Schrift per fetch (Sec-Fetch-Dest empty, nicht script)", !geladenVorStart.includes("aufnahmeantrag-pdf-lib.js") && geladenNachStart.some((n) => n === "aufnahmeantrag-pdf-lib.js") && geladenNachStart.some((n) => n === "anmeldung-schrift.js") && JSON.stringify(serverSchrift) === JSON.stringify(["GET empty 200"]) && serverWerkzeuge.length === 2 && serverWerkzeuge.every((x) => /\bscript 200$/.test(x)), `Schrift: ${serverSchrift.join("; ")}; ${serverWerkzeuge.join("; ")}`);
      ok("Konsole: keine Fehler, keine Warnungen (auch kein „Text fehlt“), kein pageerror, keine Dialoge", st.konsole.length === 0 && st.dialoge === 0, st.konsole.slice(0, 3).join(" | "));
      ok("Handy 390 px: kein horizontales Scrollen auf „fertig“; Schriften der gemeinsamen Assets geladen", await page.evaluate(() => document.documentElement.scrollWidth <= 390 && document.fonts.check("16px Inter") && document.fonts.check('700 20px "Barlow Condensed"')));
      await schliesseSeite(page);
    }

    // „Antrag ansehen“ im Paket: erstes dynamisches Laden von anmeldung-trainer-pdf.js und der Werkzeuge
    {
      const page = await neueSeite(browser, "Antrag ansehen", "?code=" + TESTCODE);
      let ist = "start";
      for (const s of SCHRITTE.slice(1)) {
        ist = await warteSchritt(page, s);
        if (s === "zeugnis") break;
        await fuelle(page, s, BEISPIEL);
        await weiter(page, SCHRITTE[SCHRITTE.indexOf(s) + 1]);
      }
      await fuelle(page, "zeugnis", BEISPIEL);
      const vorher = await page.evaluate(() => window.__stub.oeffne.length);
      await page.click('#anmeldung [data-aktion="antrag-ansehen"]');
      await page.waitForFunction((n) => window.__stub.oeffne.length > n && window.__stub.oeffne.some((o) => /^blob:/.test(o.url || "")), { timeout: 15000 }, vorher).catch(() => {});
      const blob = await page.evaluate(async () => {
        const o = window.__stub.oeffne.find((x) => /^blob:/.test(x.url || ""));
        if (!o) return null;
        const r = await fetch(o.url);
        const b = new Uint8Array(await r.arrayBuffer());
        return { kopf: String.fromCharCode(...b.slice(0, 5)), laenge: b.length, b64: await new Promise((ok) => { const f = new FileReader(); f.onload = () => ok(String(f.result).split(",")[1]); f.readAsDataURL(new Blob([b])); }) };
      });
      const vp = blob ? pdfPruefen(Buffer.from(blob.b64, "base64"), "vorschau.pdf") : null;
      ok("„Antrag ansehen“ im Paket: ein PDF (Dateikopf %PDF-) mit „Nr. 2 Buchst. a“ öffnet im neuen Fenster, ohne Fehler in der Konsole", !!blob && blob.kopf === "%PDF-" && !!vp && vp.gueltig && /Nr\. 2 Buchst\. a/.test(vp.text) && page.__st.konsole.length === 0, blob ? blob.laenge + " Byte, " + (vp ? vp.seiten : 0) + " Seite(n)" : "keine Vorschau");
      await schliesseSeite(page);
    }

    // Wiederholung nach einem Ladefehler beim Erstellen (T1b): Jeder Versuch ist eine neue Anfrage. Safari merkt sich ein gescheitertes import() für
    // die ganze Sitzung (Messung am 24.11.2026, Safari 26.5); darum holt der Lader die Schrift im Paket per fetch (Sec-Fetch-Dest empty) und liest den
    // Text aus dem Modul, statt es zu importieren, und pdf-lib und fontkit kommen als <script>. Chrome wiederholt auch ein import() richtig und zeigt
    // den Unterschied nicht: Der Test belegt darum die Art der Anfragen selbst (Sec-Fetch-Dest) und dass die Wiederholung gelingt.
    {
      const SCHRIFT = WEB + "anmeldung-schrift.js";
      const PDFLIB = WEB + "aufnahmeantrag-pdf-lib.js";
      const sollText = "Ein Programmteil lässt sich nicht laden. Bitte prüfe die Internetverbindung.";
      const abrufe = (pfad) => srv.anfragen.filter((a) => a.pfad === pfad).map((a) => `${a.dest} ${a.status}`);
      const fehlerAnsicht = (page) =>
        page.waitForSelector('#anmeldung [data-status="fehler"]', { timeout: 15000 }).then(
          () => page.evaluate(() => ({ titel: document.querySelector("#anmeldung h2").textContent, text: document.querySelector('#anmeldung [data-status="fehler"] .hinweis p:last-child').textContent.replace(/\s+/g, " ").trim(), knoepfe: Array.from(document.querySelectorAll('#anmeldung [data-status="fehler"] button')).map((b) => b.textContent), dateien: document.querySelectorAll("#anmeldung [data-dateien] li").length })),
          () => null
        );
      const erwarteteKonsole = (m) => /Failed to load resource|Trainerseite: Dateien nicht erstellt|Failed to load module script|Failed to fetch dynamically imported module/.test(m);

      // (1) Der erste Abruf der Schrift scheitert (Server antwortet 503) › Meldung der Art „bibliothek“ › Server wieder gesund › „Noch einmal versuchen“ gelingt
      srv.anfragen.length = 0;
      srv.ausfall.set(SCHRIFT, { status: 503, rest: 1, getroffen: 0 });
      const p1 = await neueSeite(browser, "Schrift 503", "?code=" + TESTCODE);
      const haken1 = await geheBisErstellen(p1, BEISPIEL);
      const a1 = await fehlerAnsicht(p1);
      ok("Schrift im Paket, erster Abruf 503: beim Erstellen erscheint „Das hat nicht geklappt“ mit der Meldung der Art „bibliothek“, „Noch einmal versuchen“ und „Hilfe“, ohne Dateiliste (kein leerer Bildschirm)", !haken1 && !!a1 && a1.titel === "Das hat nicht geklappt" && a1.text.endsWith(sollText) && a1.knoepfe.includes("Noch einmal versuchen") && a1.knoepfe.includes("Hilfe") && a1.dateien === 0, haken1 || JSON.stringify(a1));
      ok("Schrift im Paket: der Server hat genau diesen einen Abruf mit 503 beantwortet (Sec-Fetch-Dest empty, also fetch und nicht ein Modulimport)", srv.ausfall.get(SCHRIFT).getroffen === 1 && JSON.stringify(abrufe(SCHRIFT)) === JSON.stringify(["empty 503"]), abrufe(SCHRIFT).join("; "));
      await foto(p1, path.join(bilder, "14-fertig-schrift-503-390.png"));
      // Die Störung ist vorbei (rest 1 verbraucht): zweiter Versuch mit „Noch einmal versuchen“
      await p1.click('#anmeldung [data-aktion="nochmal"]');
      const erholt1 = await p1.waitForSelector('#anmeldung [data-status="fertig"]', { timeout: 20000 }).then(() => true, () => false);
      const korpus1 = erholt1 ? await sichtbarerText(p1) : "";
      ok("Schrift im Paket, zweiter Versuch („Noch einmal versuchen“): „Dein Paket ist fertig“ mit der Datei", erholt1 && /Dein Paket ist fertig/.test(korpus1) && korpus1.includes("Trainerunterlagen_Mustermann_Max.pdf"), erholt1 ? "" : "nicht erholt");
      ok("Schrift im Paket: zwei Abrufe, erst 503, dann 200, beide mit Sec-Fetch-Dest empty (fetch), keiner als script (kein import())", JSON.stringify(abrufe(SCHRIFT)) === JSON.stringify(["empty 503", "empty 200"]), abrufe(SCHRIFT).join("; "));
      await p1.click('#anmeldung [data-aktion="teilen"]');
      await warte(500);
      const geteilt1 = await liesDateienAusSeite(p1);
      const paket1 = geteilt1.find((d) => d.name.startsWith("Trainerunterlagen"));
      const pp1 = paket1 ? pdfPruefen(Buffer.from(paket1.b64, "base64"), "schrift503.pdf") : null;
      ok("Schrift im Paket nach der Wiederholung: das Paket-PDF ist gültig, mehrere Seiten, Liberation Sans eingebettet (die Schrift kam über den neuen Weg an)", !!pp1 && pp1.gueltig && pp1.seiten >= 5 && /LiberationSans/.test(pp1.schriften) && /Max Mustermann/.test(pp1.text), pp1 ? pp1.seiten + " Seiten" : "keine Datei");
      const unerwartet1 = p1.__st.konsole.filter((m) => !erwarteteKonsole(m));
      ok("Schrift im Paket (503): in der Konsole nur die erwarteten Meldungen (Antwort 503, „Dateien nicht erstellt“), nichts Weiteres, kein fremder Host", unerwartet1.length === 0 && p1.__st.fremd.length === 0, unerwartet1.slice(0, 2).join(" | "));
      await schliesseSeite(p1);
      srv.ausfall.clear();

      // (2) Die Dateien kommen an, sind aber nicht, was gebraucht wird (zum Beispiel die Anmeldeseite eines WLANs mit Status 200): die Schrift als HTML,
      // pdf-lib leer. Der Lader versucht bei der Schrift den Rückfall import() (scheitert ebenfalls), bei pdf-lib fehlt der Name PDFLib. Dann Wiederholung.
      srv.anfragen.length = 0;
      srv.ausfall.set(SCHRIFT, { status: 200, rest: 2, getroffen: 0, typ: "text/html", inhalt: "<!doctype html><title>WLAN</title><p>Bitte melde dich an.</p>" });
      srv.ausfall.set(PDFLIB, { status: 200, rest: 1, getroffen: 0, typ: "application/javascript", inhalt: "/* leer */" });
      const p2 = await neueSeite(browser, "Schrift und pdf-lib falsch", "?code=" + TESTCODE);
      const haken2 = await geheBisErstellen(p2, BEISPIEL);
      const a2 = await fehlerAnsicht(p2);
      ok("Falsche Dateien (Status 200: Schrift als HTML, pdf-lib leer): beim Erstellen die Meldung der Art „bibliothek“ mit „Noch einmal versuchen“, keine Dateiliste", !haken2 && !!a2 && a2.titel === "Das hat nicht geklappt" && a2.text.endsWith(sollText) && a2.knoepfe.includes("Noch einmal versuchen") && a2.dateien === 0, haken2 || JSON.stringify(a2));
      ok("Falsche Dateien: die Schrift wurde erst per fetch geholt (empty) und, weil das Format nicht erkannt wurde, mit dem Rückfall als Modul (script); pdf-lib einmal als Skript", JSON.stringify(abrufe(SCHRIFT)) === JSON.stringify(["empty 200", "script 200"]) && JSON.stringify(abrufe(PDFLIB)) === JSON.stringify(["script 200"]), `Schrift: ${abrufe(SCHRIFT).join("; ")}; pdf-lib: ${abrufe(PDFLIB).join("; ")}`);
      await p2.click('#anmeldung [data-aktion="nochmal"]');
      const erholt2 = await p2.waitForSelector('#anmeldung [data-status="fertig"]', { timeout: 20000 }).then(() => true, () => false);
      ok("Falsche Dateien, zweiter Versuch: die Dateien werden erstellt (pdf-lib wurde neu angefragt: der Fehler blieb nicht im Speicher stehen)", erholt2 && /Dein Paket ist fertig/.test(await sichtbarerText(p2)), erholt2 ? "" : "nicht erholt");
      ok("Falsche Dateien: der zweite Versuch holte die Schrift nur per fetch (empty 200), ohne Modulimport (kein weiteres script), und pdf-lib ein zweites Mal", JSON.stringify(abrufe(SCHRIFT)) === JSON.stringify(["empty 200", "script 200", "empty 200"]) && JSON.stringify(abrufe(PDFLIB)) === JSON.stringify(["script 200", "script 200"]), `Schrift: ${abrufe(SCHRIFT).join("; ")}; pdf-lib: ${abrufe(PDFLIB).join("; ")}`);
      const unerwartet2 = p2.__st.konsole.filter((m) => !erwarteteKonsole(m));
      ok("Falsche Dateien: in der Konsole nur die erwarteten Meldungen, kein fremder Host", unerwartet2.length === 0 && p2.__st.fremd.length === 0, unerwartet2.slice(0, 2).join(" | "));
      await schliesseSeite(p2);
      srv.ausfall.clear();
    }

    // Zweiter Lauf: Karneval, Zeugnis vorhanden
    {
      // Der Karneval fehlt in der Konfiguration des Pakets (vorerst außen vor, Melli 24.11.2026): Für diesen Lauf stellt der Test ihn mit den Gruppen aus data/karneval.json wieder her
      const karnevalDaten = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "karneval.json"), "utf8"));
      srv.konfigAenderung = (k) => {
        k.abteilungen = ["fussball", "karneval"];
        k.mannschaften = [...k.mannschaften.filter((m) => m.abteilung === "fussball"), ...karnevalDaten.gruppen.map((g) => ({ abteilung: "karneval", name: g.name }))];
      };
      const page = await neueSeite(browser, "Karneval", "?code=" + TESTCODE);
      const st = page.__st;
      const reihenfolge = await geheDurch(page, BEISPIEL_KARNEVAL, null);
      ok("zweiter Lauf (Karneval, Gruppe Dreamboys, Rolle Betreuer, Zeugnis vorhanden): alle Bildschirme bis „fertig“", JSON.stringify(reihenfolge) === JSON.stringify(SCHRITTE.slice(1)), reihenfolge.join(" › "));
      const korpus = await sichtbarerText(page);
      ok("zweiter Lauf: „Dein Paket ist fertig“ mit der einen Datei, ohne Brief in der Beschreibung, Einsicht bei der Person aus der Konfiguration", /Dein Paket ist fertig/.test(korpus) && korpus.includes("Trainerunterlagen_Beispielfrau_Erika.pdf") && !korpus.includes("Antrag für dein Führungszeugnis") && !korpus.includes("Antrag_Gebuehrenbefreiung") && !/Passfoto/.test(korpus), "");
      await page.click('#anmeldung [data-aktion="teilen"]');
      await warte(500);
      const geteilt = await liesDateienAusSeite(page);
      ok("zweiter Lauf: genau eine Datei (Trainerunterlagen_Beispielfrau_Erika.pdf), kein Brief", JSON.stringify(geteilt.map((d) => d.name).sort()) === JSON.stringify(["Trainerunterlagen_Beispielfrau_Erika.pdf"]));
      for (const d of geteilt) fs.writeFileSync(path.join(AUSGABE, "dateien", d.name), Buffer.from(d.b64, "base64"));
      const pp = pdfPruefen(Buffer.from(geteilt.find((d) => d.name.startsWith("Trainerunterlagen")).b64, "base64"), "karneval.pdf");
      ok(`zweiter Lauf: Paket-PDF gültig; „Einsicht bei ${einsichtKurz}“ steht auf dem Deckblatt; Gruppe Dreamboys, kein Antrag auf Gebührenbefreiung angekündigt`, pp.gueltig && pp.text.includes(`Einsicht bei ${einsichtKurz}`) && /Dreamboys/.test(pp.text), "");
      ok("zweiter Lauf ohne freiwillige Angaben: sieben Seiten (kein Brief, keine Seite „Passfoto“), Deckblatt „Passfoto: nicht abgegeben (freiwillig)“, kein Notfallkontakt im Blatt", pp.seiten === 7 && /Passfoto: nicht abgegeben \(freiwillig\)/.test(pp.text) && !/Passfoto von/.test(pp.text) && !/Erika Mustermann|Partnerin|0170 7654321/.test(pp.text), pp.seiten + " Seiten");
      ok("zweiter Lauf: Konsole und Netz sauber (keine Fehler, kein POST, kein fremder Host)", st.konsole.length === 0 && st.fremd.length === 0 && st.eigene.every((a) => a.methode === "GET" && !a.body), st.konsole.slice(0, 2).join(" | "));
      await schliesseSeite(page);
      srv.konfigAenderung = null;
    }

    // Einsichtnehmende aus einer anderen Konfiguration: Bildschirm und PDF folgen der Konfiguration
    {
      srv.konfigAenderung = (k) => {
        k.einsicht = [{ name: "Testperson Eins", funktion: "Vertretung" }, { name: "Testperson Zwei", funktion: "Schriftführung" }];
      };
      const page = await neueSeite(browser, "andere Einsicht", "?code=" + TESTCODE);
      let ist = "";
      for (const s of SCHRITTE.slice(1)) {
        ist = await warteSchritt(page, s);
        if (s === "zeugnis") break;
        await fuelle(page, s, BEISPIEL);
        await weiter(page, SCHRITTE[SCHRITTE.indexOf(s) + 1]);
      }
      await fuelle(page, "zeugnis", BEISPIEL);
      const zeugnisText = await sichtbarerText(page);
      ok("andere Konfiguration (zwei Personen): Bildschirm „Führungszeugnis“ nennt „Testperson Eins (Vertretung) oder Testperson Zwei (Schriftführung)“, nicht die Standardperson", zeugnisText.includes("Du zeigst das Zeugnis persönlich Testperson Eins (Vertretung) oder Testperson Zwei (Schriftführung).") && !zeugnisText.includes(einsichtDefault), "");
      await weiter(page, "unterschriften");
      await fuelle(page, "unterschriften", BEISPIEL);
      await weiter(page, "pruefen");
      await weiter(page, "fertig");
      await page.waitForSelector('#anmeldung [data-status="fertig"]', { timeout: 20000 });
      const fertigText = await sichtbarerText(page);
      ok("andere Konfiguration: Bildschirm „fertig“ sagt „Du: Zeigst es persönlich Testperson Eins oder Testperson Zwei.“", fertigText.includes("Du: Zeigst es persönlich Testperson Eins oder Testperson Zwei."));
      await page.click('#anmeldung [data-aktion="teilen"]');
      await warte(500);
      const geteilt = await liesDateienAusSeite(page);
      const paket = geteilt.find((d) => d.name.startsWith("Trainerunterlagen"));
      const pp = paket ? pdfPruefen(Buffer.from(paket.b64, "base64"), "paket2.pdf") : null;
      ok("andere Konfiguration: Paket-PDF nennt „Einsicht bei Testperson Eins oder Testperson Zwei“ und nicht die Standardperson (die Namen stehen nur in der Konfiguration)", !!pp && pp.text.includes("Einsicht bei Testperson Eins oder Testperson Zwei") && !pp.text.includes(`Einsicht bei ${einsichtKurz}`), "");
      await schliesseSeite(page);
      srv.konfigAenderung = null;
    }
  } catch (fehler) {
    fehlschlag = fehler;
    ok("Ablauf im Browser ohne Ausnahme", false, maske(fehler && fehler.stack ? fehler.stack.split("\n").slice(0, 4).join(" / ") : String(fehler)));
  } finally {
    await browser.close().catch(() => {});
    await new Promise((r) => srv.http.close(r));
  }
  return abschluss();
}

function abschluss() {
  abschnitt("Zusammenfassung");
  console.log(`${pruefungen} Prüfungen, ${fehlerAnzahl} Fehler.`);
  const ende = fehlerAnzahl ? "trainer-e2e-paket.mjs: FEHLER" : "trainer-e2e-paket.mjs: alles bestanden.";
  console.log(ende);
  protokoll.push(`${pruefungen} Prüfungen, ${fehlerAnzahl} Fehler.`, ende);
  try {
    fs.mkdirSync(AUSGABE, { recursive: true });
    fs.writeFileSync(path.join(AUSGABE, "ergebnis.txt"), protokoll.join("\n") + "\n", "utf8");
  } catch {
    /* Protokoll ist nur eine Beigabe */
  }
  if (!BEHALTEN) {
    loescheOrdner(OHNE_ORDNER);
    loescheOrdner(MIT_ORDNER);
    fs.rmSync(path.join(CACHE, "leer"), { recursive: true, force: true });
    fs.rmSync(path.join(CACHE, "trainer-test.json"), { force: true });
  }
  return fehlerAnzahl ? 1 : 0;
}

haupt().then(
  (code) => process.exit(code),
  (fehler) => {
    console.error("Abbruch:", maske(fehler && fehler.stack ? fehler.stack : String(fehler)));
    process.exit(1);
  }
);
