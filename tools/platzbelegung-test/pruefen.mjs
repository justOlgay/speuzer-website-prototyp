#!/usr/bin/env node
// Test der Seite „Platzbelegung“ – Website (dist/appack-paket/web/platzbelegung.html) und App-Kopie
// (assets/app/Platzbelegung-App.html) in Chrome (puppeteer-core), ganz ohne Netz.
//
//   node tools/platzbelegung-test/pruefen.mjs [--json <Datei>] [--fotos]
//
//   --json <Datei>  die Belegung, die die Seite „aus dem Netz“ bekommt (Standard: fixture.json, eine Kopie der Beispieldatei
//                   der Schnittstelle, Stand 30.10.2026, mit „feld“ je Heimspiel); so läuft der Test auch gegen die echte Datei des
//                   Spielplan-Generators und gegen eine ältere Datei ohne „feld“ (dann ist jedes Spiel ein ganzer Platz)
//   --fotos         schreibt die fünf Fotos nach tools/cache/orchestrierung-platzbelegung/berichte/PB-6/
//
// Vorher bauen: npm run tpl-bauen, dann sh tools/cache/bau-sperre.sh build (erzeugt dist/appack-paket/web/ und docs/).
//
// Wie die Seiten geladen werden: unter ihren echten Adressen (https://cdn.appack.de/sportfreunde04/workspace/web/platzbelegung.html
// und …/workspace/Platzbelegung-App.html) per Anfrageabfang. Beantwortet werden nur die Seite selbst, site.css (aus dem Paket),
// Schriften und Logos (aus docs/assets, unter ihren Adressen auf GitHub Pages) und die Belegung unter der Adresse aus
// data/platzbelegung.json. JEDE andere Anfrage wird abgewiesen und ist ein Fehler.
//
// Erwartungswerte rechnet der Test aus der JSON selbst (zweite, anders geschriebene Rechnung in „baueOrakel“, auch die Wahl der
// Platzhälfte bei halbem Feld und die freien Zeiten danach), nichts davon ist fest eingetragen. Nur mit der mitgelieferten
// fixture.json prüft er zusätzlich feste Werte aus dem Arbeitspaket (18 Trainingsblöcke, Heimspiele 10, 0 und 5; die Hälften am
// Samstag 31.10.2026), und mit erfundenen Spielen („Sonderfälle“) feste Werte für Reihenfolge, Gleichstand, Training und „belegt“,
// damit die eigene Rechnung selbst eine Gegenprobe hat. Mutationsproben verändern die gebaute Seite im Speicher (immer links,
// „feld“ ignorieren, Standard „Woche“, Legende ohne „Feldteil“ und vier weitere, siehe MUTATIONEN) und müssen vom Test erkannt werden.

import puppeteer from "puppeteer-core";
import { readFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HIER = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HIER, "..", "..");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const FOTO_ORDNER = path.join(ROOT, "tools", "cache", "orchestrierung-platzbelegung", "berichte", "PB-6");
const AXE_PFAD = path.join(ROOT, "node_modules", "axe-core", "axe.min.js");
const QUELLE_JS = path.join(ROOT, "src", "vorlagen", "platzbelegung", "platzbelegung.js");

// ---------- Aufruf ----------

const argv = process.argv.slice(2);
const FOTOS = argv.includes("--fotos");
const jIndex = argv.indexOf("--json");
if (jIndex >= 0 && !argv[jIndex + 1]) { console.error("--json braucht eine Datei"); process.exit(2); }
const STANDARD_JSON = jIndex < 0;
const JSON_DATEI = jIndex >= 0 ? path.resolve(argv[jIndex + 1]) : path.join(HIER, "fixture.json");

const CDN = "https://cdn.appack.de/sportfreunde04/workspace/";
const GH_ASSETS = "https://justolgay.github.io/speuzer-website-prototyp/assets/";
const SITE_CSS_URL = `${CDN}web/site.css`;
const SITE_CSS = path.join(ROOT, "dist", "appack-paket", "web", "site.css");
const SEITEN = {
  web: { key: "web", name: "Website", url: `${CDN}web/platzbelegung.html`, datei: path.join(ROOT, "dist", "appack-paket", "web", "platzbelegung.html"), app: false, termineLink: "termine.html" },
  app: { key: "app", name: "App-Kopie", url: `${CDN}Platzbelegung-App.html`, datei: path.join(ROOT, "assets", "app", "Platzbelegung-App.html"), app: true, termineLink: "nav://sportfreunde04_TextImage_1783345459688" },
};

for (const f of [JSON_DATEI, SITE_CSS, SEITEN.web.datei, SEITEN.app.datei, AXE_PFAD, path.join(ROOT, "docs", "assets", "fonts", "inter.woff2")]) {
  if (!existsSync(f)) { console.error(`Fehlt: ${path.relative(ROOT, f)} – zuerst bauen (npm run tpl-bauen, dann sh tools/cache/bau-sperre.sh build).`); process.exit(2); }
}
const KONFIG = JSON.parse(readFileSync(path.join(ROOT, "data", "platzbelegung.json"), "utf8"));
const VEREIN = JSON.parse(readFileSync(path.join(ROOT, "data", "verein.json"), "utf8"));
const JSON_URL = KONFIG.quelle;
const MAIL = VEREIN.mail;
const DATEN = JSON.parse(readFileSync(JSON_DATEI, "utf8"));
const JSON_TEXT = readFileSync(JSON_DATEI, "utf8");
const AXE = readFileSync(AXE_PFAD, "utf8");

// Namen aus den Quellen des Vereins (Fußballschulen, Mieter, Dienstleister, Vorstand): sie stehen nie im Klartext in einer Datei
// des Repos (tools/pii-check.py sucht sie in allen Textdateien), darum aus Teilen zusammengesetzt. Dazu kommen, falls vorhanden,
// die Namen aus der lokalen Liste tools/cache/pii-namen.txt (ganze Wörter, ohne Rücksicht auf Groß- und Kleinschreibung).
const NAMEN = [["Rapha", "ele"], ["Vass", "ili"], ["D", "WS"], ["Beren", "berg"], ["Reg", "ista"], ["Özk", "an"], ["Sei", "pp"]].map((t) => t.join(""));
const PRIVAT_DATEI = path.join(ROOT, "tools", "cache", "pii-namen.txt");
const maskiere = (t) => t.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
const PRIVATE_NAMEN = (existsSync(PRIVAT_DATEI) ? readFileSync(PRIVAT_DATEI, "utf8").split("\n") : [])
  .map((z) => z.trim()).filter((z) => z && !z.startsWith("#"))
  .map((n) => new RegExp(`(?<![\\p{L}\\p{N}_])${maskiere(n)}(?![\\p{L}\\p{N}_])`, "iu"));

// ---------- Ausgabe ----------

const ergebnisse = [];
function ok(bedingung, text, detail) {
  ergebnisse.push([!!bedingung, text]);
  console.log(`   [${bedingung ? "ok" : "FEHLER"}] ${text}`);
  if (!bedingung && detail !== undefined) console.log(`        ${typeof detail === "string" ? detail : JSON.stringify(detail)}`);
}
function abschnitt(t) { console.log(`\n== ${t}`); }
function info(t) { console.log(`   ${t}`); }
const warte = (ms) => new Promise((r) => setTimeout(r, ms));
const gleich = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ---------- Orakel: Erwartungswerte aus der JSON, ohne den Code der Seite ----------

const WOCHENTAGE = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
const WOCHENTAGE_KURZ = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

function baueOrakel(json) {
  const TAG = 864e5;
  const nr = (iso) => Math.round(Date.parse(`${iso}T00:00:00Z`) / TAG);
  const iso = (n) => new Date(n * TAG).toISOString().slice(0, 10);
  const wochentag = (n) => (new Date(n * TAG).getUTCDay() + 6) % 7;            // 0 = Montag
  const montag = (n) => n - wochentag(n);
  const minuten = (z) => { const [h, m] = z.split(":").map(Number); return h * 60 + m; };
  const zeit = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  const deutsch = (i) => `${i.slice(8, 10)}.${i.slice(5, 7)}.${i.slice(0, 4)}`;     // TT.MM.JJJJ
  const kurz = Object.fromEntries(json.mannschaften.map((m) => [m.id, m.kurz]));
  const spur = Object.fromEntries(json.teile.map((t, i) => [t.id, i]));
  const name = Object.fromEntries(json.teile.map((t) => [t.id, t.name]));
  const sortiert = (ids) => [...ids].sort((a, b) => spur[a] - spur[b]);
  const saisonVon = nr(json.regeln.trainingVon), saisonBis = nr(json.regeln.trainingBis);
  const ferien = json.regeln.frei.map((f) => ({ von: nr(f.von), bis: nr(f.bis), name: f.name }));
  const halle = json.halle.map((h) => ({ ...h, abNr: nr(h.ab), bisNr: nr(h.bisDatum) }));
  const ganz = sortiert(json.belegung["ganzer Platz"]);
  const LINKS = sortiert(json.belegung["linke Hälfte"] ?? ["tor1", "tor2"]), RECHTS = sortiert(json.belegung["rechte Hälfte"] ?? ["tor3", "tor4"]);
  const rang = Object.fromEntries(json.mannschaften.map((m, i) => [m.id, i]));         // Stelle der Mannschaft in der Datei
  const text = (x) => String(x ?? "");
  const minFrei = json.regeln.minFrei;

  function status(n) {
    if (n < saisonVon) return { art: "vor" };
    if (n > saisonBis) return { art: "nach" };
    const f = ferien.find((x) => n >= x.von && n <= x.bis);
    return f ? { art: "frei", name: f.name } : { art: "aktiv" };
  }

  // alles, was an diesem Tag auf der Seite stehen soll
  function tag(n) {
    const wt = wochentag(n), tagIso = iso(n), st = status(n);
    const eintraege = [];                // { typ, t, von, bis, teile[] } in Minuten
    const inHalle = [], andere = [];
    if (st.art === "aktiv") {
      const draussen = new Set(halle.filter((h) => n >= h.abNr && n <= h.bisNr).map((h) => h.t));   // Mannschaft im Winter nur in der Halle
      for (const t of json.training) if (t.tag === wt && !draussen.has(t.t)) eintraege.push({ typ: "training", t: t.t, von: minuten(t.von), bis: minuten(t.bis), teile: sortiert(t.teile) });
      for (const h of halle) if (h.tag === wt && n >= h.abNr && n <= h.bisNr) inHalle.push(`${kurz[h.t]} ${h.von}–${h.bis} (${h.ort})`);
      for (const b of json.belegt) if (b.tag === wt) eintraege.push({ typ: "belegt", t: "", von: minuten(b.von), bis: minuten(b.bis), teile: sortiert(b.teile) });
    }
    for (const s of json.spiele) if (s.d === tagIso && s.ort !== "u") andere.push({ z: minuten(s.z), text: `${kurz[s.t]} ${s.z} (${s.ort})` });
    // Heimspiele auf unserem Platz der Reihe nach: Anstoß, Stelle der Mannschaft in der Datei, Spielnummer als Text. Training und
    // „belegt“ sind vorbelegt. Je Spur zählt ein Feld, wie viele Einträge in jeder Minute liegen; die Summe über die Minuten eines
    // Spiels ist die Summe seiner Überlappungen mit Training, „belegt“ und früheren Spielen (jede Spur einzeln, jeder Eintrag für
    // sich). „halb“ kommt auf die Hälfte mit der kleineren Summe, bei Gleichstand links; alles andere (auch ohne „feld“) ist ganz.
    const dichte = Object.fromEntries(json.teile.map((t) => [t.id, new Array(2880).fill(0)]));
    const belege = (e) => { for (const id of e.teile) for (let m = e.von; m < e.bis; m++) dichte[id][m]++; };
    eintraege.forEach(belege);
    const spieleU = json.spiele.filter((s) => s.d === tagIso && s.ort === "u")
      .sort((a, b) => minuten(a.z) - minuten(b.z) || rang[a.t] - rang[b.t] || (text(a.nr) < text(b.nr) ? -1 : text(a.nr) > text(b.nr) ? 1 : 0));
    for (const s of spieleU) {
      const von = minuten(s.z), bis = von + s.dauer, halb = s.feld === "halb";
      const belastung = (ids) => ids.reduce((summe, id) => { let x = 0; for (let m = von; m < bis; m++) x += dichte[id][m]; return summe + x; }, 0);
      const teile = halb ? (belastung(RECHTS) < belastung(LINKS) ? RECHTS : LINKS) : ganz;
      const e = { typ: s.w === "Kinderfestival" ? "festival" : "spiel", t: s.t, von, bis, teile, feld: halb ? "halb" : "ganz" };
      eintraege.push(e); belege(e);
    }
    const fenster = json.regeln.fenster[wt < 5 ? "werktag" : "wochenende"];
    const f0 = minuten(fenster[0]), f1 = minuten(fenster[1]);
    // gezeichnet wird, was in das Öffnungsfenster hineinreicht
    const sichtbar = eintraege.filter((e) => Math.min(e.bis, f1) > Math.max(e.von, f0));
    // freie Zeiten: je Platzteil Minute für Minute belegt oder frei, Lücken ab minFrei
    const frei = [];
    for (const t of json.teile) {
      const belegt = new Array(f1 - f0).fill(false);
      for (const e of eintraege) if (e.teile.includes(t.id)) for (let m = Math.max(e.von, f0); m < Math.min(e.bis, f1); m++) belegt[m - f0] = true;
      let m = 0;
      while (m < belegt.length) {
        if (belegt[m]) { m++; continue; }
        let e = m;
        while (e < belegt.length && !belegt[e]) e++;
        if (e - m >= minFrei) frei.push({ typ: "frei", t: "", von: f0 + m, bis: f0 + e, teile: [t.id] });
        m = e;
      }
    }
    // Schlüssel eines Eintrags; Spiele tragen zusätzlich „halb“ oder „ganz“ (die Seite nennt „halbes Feld“ in der Beschriftung)
    const zeile = (e) => `${e.typ}|${e.t}|${zeit(e.von)}|${zeit(e.bis)}|${e.teile.join(",")}${e.feld ? `|${e.feld}` : ""}`;
    return {
      iso: tagIso, wt, status: st,
      bloecke: sichtbar.map(zeile).sort(),
      frei: frei.map(zeile).sort(),
      halle: inHalle.sort(),
      andere: andere.map((a) => a.text).sort(),
      zahl: {
        training: sichtbar.filter((e) => e.typ === "training").length,
        belegt: sichtbar.filter((e) => e.typ === "belegt").length,
        spiel: sichtbar.filter((e) => e.typ === "spiel" || e.typ === "festival").length,
        halb: sichtbar.filter((e) => e.feld === "halb").length,
        ganz: sichtbar.filter((e) => e.feld === "ganz").length,
        frei: frei.length, halle: inHalle.length, andere: andere.length,
      },
    };
  }

  const erster = montag(nr(json.regeln.navigation[0])), letzter = montag(nr(json.regeln.navigation[1]));
  return { nr, iso, wochentag, montag, tag, deutsch, kurz, name, erster, letzter, saisonVon, saisonBis };
}
const ORAKEL = baueOrakel(DATEN);

function wocheSoll(montagNr) {
  const tage = [];
  for (let i = 0; i < 7; i++) tage.push(ORAKEL.tag(montagNr + i));
  const summe = { training: 0, belegt: 0, spiel: 0, halb: 0, ganz: 0, frei: 0, halle: 0, andere: 0, ferientage: 0 };
  for (const t of tage) {
    for (const k of Object.keys(t.zahl)) summe[k] += t.zahl[k];
    if (t.status.art === "frei") summe.ferientage++;
  }
  return { tage, summe };
}

// ---------- Browser ----------

const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json; charset=utf-8" };
function dateiAntwort(f) {
  return { status: 200, headers: { "access-control-allow-origin": "*" }, contentType: MIME[path.extname(f)] ?? "application/octet-stream", body: readFileSync(f) };
}
// Antwort auf eine Adresse oder null (= fremde Anfrage). json: undefined (Datei des Tests) | { status } | { body } | { daten } | { abbruch } | { spaet: ms }
// seite.html (nur Mutationsproben): die Seite kommt aus diesem Text statt aus der gebauten Datei
function antwortFuer(url, seite, json) {
  if (url === seite.url) return seite.html !== undefined ? { status: 200, headers: { "access-control-allow-origin": "*" }, contentType: MIME[".html"], body: seite.html } : dateiAntwort(seite.datei);
  if (url === SITE_CSS_URL) return dateiAntwort(SITE_CSS);
  if (url.startsWith(GH_ASSETS)) {
    const f = path.join(ROOT, "docs", "assets", url.slice(GH_ASSETS.length));
    if (f.startsWith(path.join(ROOT, "docs", "assets") + path.sep) && existsSync(f)) return dateiAntwort(f);
    return null;
  }
  if (url === JSON_URL) {
    const j = json ?? {};
    if (j.abbruch) return { abbruch: true };
    const kopf = { "access-control-allow-origin": "*" };
    if (j.status && j.status !== 200) return { status: j.status, headers: kopf, contentType: "text/plain; charset=utf-8", body: "Nicht gefunden" };
    const body = j.body !== undefined ? j.body : (j.daten !== undefined ? JSON.stringify(j.daten) : JSON_TEXT);
    return { status: 200, headers: kopf, contentType: MIME[".json"], body, spaet: j.spaet };
  }
  return null;
}

async function oeffne(browser, seite, { breite = 1280, hoehe = 800, hash = "", json, dpr = 1, dunkel = false, warteAuf = true } = {}) {
  const p = await browser.newPage();
  const mobil = breite < 700;
  await p.setViewport({ width: breite, height: hoehe, deviceScaleFactor: dpr, isMobile: mobil, hasTouch: mobil });
  if (dunkel) await p.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "dark" }]);
  const log = { anfragen: [], fremd: [], fehler: [], konsole: [] };
  await p.setRequestInterception(true);
  p.on("request", (r) => {
    const u = r.url().split("#")[0];
    log.anfragen.push(u);
    const a = antwortFuer(u, seite, json);
    if (!a) { log.fremd.push(u); r.abort("blockedbyclient").catch(() => {}); return; }
    if (a.abbruch) { r.abort("failed").catch(() => {}); return; }
    const senden = () => r.respond({ status: a.status, headers: a.headers, contentType: a.contentType, body: a.body }).catch(() => {});
    if (a.spaet) setTimeout(senden, a.spaet); else senden();
  });
  p.on("pageerror", (e) => log.fehler.push(String(e.message)));
  p.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") log.konsole.push(`${m.type()}: ${m.text()}`); });
  await p.goto(seite.url + (hash ? `#${hash}` : ""), { waitUntil: "load" });
  if (warteAuf) await p.waitForSelector("#pb-inhalt:not([hidden]), #pb-fehler:not([hidden])", { timeout: 15000 });
  await p.evaluate(() => document.fonts.ready);
  return { p, log };
}

// Was die Seite gerade zeigt (Wochengitter oder ein Tag), nur aus dem DOM
function liesAnsicht() {
  const t = (e) => (e ? e.textContent : "");
  const abschnitte = [...document.querySelectorAll("#pb-ansicht section.pb-tag")];
  // Wochengitter: Zeilen und Hinweis liegen im Abschnitt des Tages; Tagesansicht: Zeilen und Hinweis stehen über der Zeitleiste
  const einzel = abschnitte.length === 1;
  return {
    titel: [...document.querySelectorAll("#pb-titel > *")].map(t).join(" · "),
    tage: abschnitte.map((s) => {
      const w = einzel ? document.querySelector("#pb-ansicht") : s;
      return {
        datum: s.dataset.datum,
        bloecke: [...s.querySelectorAll(".pb-bl")].filter((b) => !b.classList.contains("aus")).map((b) => ({
          typ: b.dataset.typ, t: b.dataset.t || "", von: b.dataset.von, bis: b.dataset.bis, teile: b.dataset.teile,
          label: b.getAttribute("aria-label") || "", titel: b.title || "",
        })),
        halle: [...w.querySelectorAll('.pb-zeile[data-art="halle"] .pb-eintrag')].map(t),
        andere: [...w.querySelectorAll('.pb-zeile[data-art="andere"] .pb-eintrag')].map(t),
        kopf: einzel ? t(w.querySelector(".pb-tag-titel")) : t(s.querySelector(".pb-tkopf")),
        notiz: t(w.querySelector(".pb-notiz")),
      };
    }),
    hinweise: [...document.querySelectorAll("#pb-hinweise li")].map((li) => ({ art: li.dataset.art || "", text: li.textContent })),
  };
}

// Adresse #JJJJ-MM-TT setzen und warten, bis die Seite den Tag zeigt
async function gehZu(p, iso) {
  await p.evaluate((d) => { location.hash = "#" + d; }, iso);
  await p.waitForFunction((d) => !!document.querySelector(`#pb-ansicht section.pb-tag[data-datum="${d}"]`), { timeout: 5000 }, iso);
}

// Schlüssel eines gezeigten Eintrags wie im Orakel; bei Spielen „halb“, wenn die Beschriftung „halbes Feld“ nennt, sonst „ganz“
const istSpiel = (b) => b.typ === "spiel" || b.typ === "festival";
const schluesselDom = (b) => `${b.typ}|${b.t}|${b.von}|${b.bis}|${b.teile}${istSpiel(b) ? `|${/\(halbes Feld\)/.test(b.label) ? "halb" : "ganz"}` : ""}`;
// Beschriftung (aria-label und title) eines Spiels: nennt den Feldteil passend zu den gezeigten Spuren
function pruefeSpielBeschriftung(b) {
  const abw = [];
  const halb = /\(halbes Feld\)/.test(b.label);
  const teile = String(b.teile);
  if (b.titel !== b.label) abw.push(`Spiel ${b.t} ${b.von}: title „${b.titel}“ ist nicht gleich aria-label „${b.label}“`);
  if (halb) {
    const hälfte = teile === "tor1,tor2" ? "linke Hälfte" : teile === "tor3,tor4" ? "rechte Hälfte" : "?";
    if (!b.label.includes(`${hälfte} (halbes Feld)`) || !b.label.endsWith("Dauer und Feldteil geschätzt")) abw.push(`Spiel ${b.t} ${b.von}: Beschriftung „${b.label}“ passt nicht zu ${teile}`);
  } else if (teile !== "tor1,tor2,tor3,tor4" || !b.label.includes("ganzer Platz") || !b.label.endsWith("Dauer geschätzt")) abw.push(`Spiel ${b.t} ${b.von}: Beschriftung „${b.label}“ passt nicht zum ganzen Platz (${teile})`);
  return abw;
}

// Vergleich eines Tages (DOM gegen Orakel); liefert Abweichungen als Text
function vergleicheTag(dom, soll) {
  const abw = [];
  const dBlock = dom.bloecke.filter((b) => b.typ !== "frei").map(schluesselDom).sort();
  const dFrei = dom.bloecke.filter((b) => b.typ === "frei").map(schluesselDom).sort();
  for (const b of dom.bloecke.filter(istSpiel)) abw.push(...pruefeSpielBeschriftung(b).map((x) => `${soll.iso} ${x}`));
  if (!gleich(dBlock, soll.bloecke)) abw.push(`${soll.iso} Einträge: erwartet ${JSON.stringify(soll.bloecke)}, gezeigt ${JSON.stringify(dBlock)}`);
  if (!gleich(dFrei, soll.frei)) abw.push(`${soll.iso} freie Zeiten: erwartet ${JSON.stringify(soll.frei)}, gezeigt ${JSON.stringify(dFrei)}`);
  if (!gleich([...dom.halle].sort(), soll.halle)) abw.push(`${soll.iso} Halle: erwartet ${JSON.stringify(soll.halle)}, gezeigt ${JSON.stringify(dom.halle)}`);
  if (!gleich([...dom.andere].sort(), soll.andere)) abw.push(`${soll.iso} andere Anlage: erwartet ${JSON.stringify(soll.andere)}, gezeigt ${JSON.stringify(dom.andere)}`);
  if (soll.status.art === "frei" && !(dom.notiz.includes(soll.status.name) || dom.kopf.includes(soll.status.name))) abw.push(`${soll.iso} Ferienhinweis fehlt (${soll.status.name})`);
  if (soll.status.art !== "aktiv" && dom.bloecke.some((b) => b.typ === "training" || b.typ === "belegt")) abw.push(`${soll.iso} Training oder belegt trotz ${soll.status.art === "frei" ? soll.status.name : "Zeit außerhalb der Saison"}`);
  return abw;
}

// Hinweise der Woche: Ferien- und Feiertagsläufe und Halle
function vergleicheHinweise(dom, tage) {
  const abw = [];
  const label = (n) => `${WOCHENTAGE_KURZ[ORAKEL.wochentag(n)]} ${ORAKEL.deutsch(ORAKEL.iso(n)).slice(0, 6)}`;
  const laeufe = [];
  tage.forEach((t, i) => {
    const key = t.status.art === "aktiv" ? null : t.status.art + (t.status.name ?? "");
    const letzter = laeufe[laeufe.length - 1];
    if (key && letzter && letzter.key === key && letzter.bis === i - 1) letzter.bis = i; else if (key) laeufe.push({ key, von: i, bis: i, status: t.status });
  });
  const statusHinweise = dom.hinweise.filter((h) => h.art === "status");
  if (statusHinweise.length !== laeufe.length) abw.push(`Hinweise (Ferien/Saison): erwartet ${laeufe.length}, gezeigt ${statusHinweise.length}`);
  for (const l of laeufe) {
    const montagNr = ORAKEL.nr(tage[0].iso);
    const kopf = l.von === l.bis ? label(montagNr + l.von) : `${label(montagNr + l.von)}–${label(montagNr + l.bis)}`;
    const treffer = statusHinweise.find((h) => h.text.startsWith(`${kopf}: `));
    if (!treffer) { abw.push(`Hinweis „${kopf}: …“ fehlt`); continue; }
    if (l.status.art === "frei" && !treffer.text.includes(l.status.name)) abw.push(`Hinweis „${kopf}“ nennt ${l.status.name} nicht`);
  }
  const halle = tage.flatMap((t) => t.halle);
  const halleHinweis = dom.hinweise.find((h) => h.art === "halle");
  if (halle.length && !halleHinweis) abw.push("Hinweis zur Halle fehlt");
  if (!halle.length && halleHinweis) abw.push("Hinweis zur Halle ohne Hallenzeit");
  return abw;
}

const heuteBerlin = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const bereit = (p) => p.waitForFunction(() => !document.getElementById("pb-inhalt").hidden);

// Umschalter „Tag | Woche“ (echter Mausklick; nur ab 1100 px sichtbar)
async function zuWoche(p) { await p.click('.pb-umschalt[data-ansicht="woche"]'); await p.waitForSelector("#pb-ansicht .pb-woche", { timeout: 5000 }); }
async function zuTag(p) { await p.click('.pb-umschalt[data-ansicht="tag"]'); await p.waitForFunction(() => !document.querySelector("#pb-ansicht .pb-woche") && !!document.querySelector("#pb-ansicht .pb-tag-titel"), { timeout: 5000 }); }

// Welchen Tag zeigt die Seite ohne Adresse: heute (Europe/Berlin), liegt heute vor oder nach dem Plan, den Montag der ersten bzw. letzten Woche
function erwarteterStartTag() {
  const n = ORAKEL.nr(heuteBerlin());
  if (n < ORAKEL.erster) return { iso: ORAKEL.iso(ORAKEL.erster), hinweis: true };
  if (n > ORAKEL.letzter + 6) return { iso: ORAKEL.iso(ORAKEL.letzter), hinweis: true };
  return { iso: ORAKEL.iso(n), hinweis: false };
}

// Was zeigt die Seite jetzt (Ansicht, Umschalter, Tagwahl, Überlauf)? Läuft in der Seite.
function messeAnsicht() {
  const css = (e) => getComputedStyle(e);
  const sichtbar = (e) => { if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && css(e).visibility !== "hidden" && css(e).display !== "none"; };
  const tagwahl = document.getElementById("pb-tagwahl");
  return {
    woche: !!document.querySelector("#pb-ansicht .pb-woche"),
    tage: [...document.querySelectorAll("#pb-ansicht section.pb-tag")].map((s) => s.dataset.datum),
    titel: document.querySelector("#pb-ansicht .pb-tag-titel")?.textContent ?? "",
    tagwahlSichtbar: sichtbar(tagwahl),
    tagwahlTage: [...document.querySelectorAll(".pb-tab")].findIndex((t) => t.getAttribute("aria-selected") === "true"),
    umschalterSichtbar: sichtbar(document.getElementById("pb-ansichtwahl")),
    umschalter: [...document.querySelectorAll(".pb-umschalt")].map((b) => { const r = b.getBoundingClientRect(); return { text: b.textContent, gedrueckt: b.getAttribute("aria-pressed"), w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 }; }),
    hash: location.hash, sw: document.documentElement.scrollWidth, iw: window.innerWidth,
  };
}

// Lesbarkeit und Maße der Tagesansicht (läuft in der Seite): Spurbreite, Schriftgrößen, gedrehter Text, Text in den Blöcken,
// Achse und Spuren fluchten, Breite der Ansicht
function messeTagesansicht() {
  const css = (e) => getComputedStyle(e);
  const num = (x) => parseFloat(x);
  const wurzel = document.querySelector("#pb-ansicht");
  const gedreht = [], zuGross = [], schriftBlock = [];
  // gedreht = senkrechte Schreibrichtung oder eine Drehung/Scherung (Matrix mit b oder c ungleich 0); eine reine Verschiebung
  // (translateY der Zeitachse) ist keine Drehung
  const gedrehtes = (c) => {
    if (c.writingMode !== "horizontal-tb" || (c.rotate && c.rotate !== "none")) return true;
    const m = /^matrix\(([^)]*)\)$/.exec(c.transform || "");
    if (m) { const v = m[1].split(",").map(Number); return Math.abs(v[1]) > 1e-6 || Math.abs(v[2]) > 1e-6; }
    return !!c.transform && c.transform !== "none";    // matrix3d und anderes: vorsichtshalber melden
  };
  for (const e of wurzel.querySelectorAll("*")) {
    const c = css(e);
    if (gedrehtes(c)) gedreht.push(`${e.className || e.tagName}: ${c.writingMode} ${c.transform}`);
  }
  const bloecke = [...wurzel.querySelectorAll(".pb-bl")];
  for (const b of bloecke) {
    const tx = b.querySelector(".tx");
    if (!tx) { zuGross.push(`${b.dataset.typ} ${b.dataset.von}: ohne Text`); continue; }
    for (const k of tx.children) {
      schriftBlock.push(num(css(k).fontSize));
      if (!k.classList.contains("ty") && k.scrollWidth > k.clientWidth + 1) zuGross.push(`${b.dataset.typ} ${b.dataset.von}: „${k.textContent}“ breiter als der Block (${k.scrollWidth} > ${k.clientWidth})`);
    }
    if (tx.scrollHeight > tx.clientHeight + 1) zuGross.push(`${b.dataset.typ} ${b.dataset.von}–${b.dataset.bis}: Text höher als der Block (${tx.scrollHeight} > ${tx.clientHeight})`);
  }
  const lanes = wurzel.querySelector(".pb-lanes"), achseKoerper = wurzel.querySelector(".pb-achse > div");
  const minAus = (sel) => { const w = [...wurzel.querySelectorAll(sel)].map((e) => num(css(e).fontSize)); return w.length ? Math.min(...w) : null; };
  const spuren = [...wurzel.querySelectorAll(".pb-lk span")].map((s) => s.getBoundingClientRect().width);
  const lr = lanes.getBoundingClientRect(), ar = achseKoerper.getBoundingClientRect();
  return {
    bloecke: bloecke.length, gedreht, zuGross,
    schriftBlockMin: schriftBlock.length ? Math.min(...schriftBlock) : null,
    schriftSpur: minAus(".pb-lk span"), schriftGruppe: minAus(".pb-gruppen span"), schriftAchse: minAus(".pb-zl"),
    spurMin: Math.min(...spuren), spuren: spuren.length,
    breite: wurzel.firstElementChild.getBoundingClientRect().width,
    achseVersatz: Math.round((ar.top - lr.top) * 10) / 10,     // erwartet 1 (Rand der Spuren)
    sw: document.documentElement.scrollWidth, iw: window.innerWidth,
  };
}

// ---------- Prüfungen ----------

async function pruefeLaden(browser, seite) {
  abschnitt(`1. ${seite.name}: Laden, Anfragen, Fehler`);
  const { p, log } = await oeffne(browser, seite, { hash: "2026-11-02" });
  ok(await p.evaluate(() => !document.getElementById("pb-inhalt").hidden && document.getElementById("pb-fehler").hidden && document.getElementById("pb-laden").hidden), "Belegung geladen: Inhalt sichtbar, Fehlerhinweis und „wird geladen“ weg");
  const stand = await p.evaluate(() => document.getElementById("pb-stand").textContent);
  const standSoll = `Plan vom ${DATEN.stand.plan} · Spielplan vom ${DATEN.stand.spiele} · Spieldauer und Feldteil geschätzt`;
  ok(stand === standSoll, `Stand aus der Datei: „${stand}“ („geschätzt“ gilt für Spieldauer und Feldteil)`, { erwartet: standSoll });
  const kopf = await p.evaluate(() => ({ h1: [...document.querySelectorAll("h1")].map((h) => h.textContent), titel: document.title, lead: document.querySelector(".seitenkopf__lead")?.textContent, fussnote: document.querySelector(".pb-fussnote")?.textContent, appModus: document.documentElement.classList.contains("app-modus"), platz: typeof window.__platz }));
  if (seite.app) ok(kopf.h1.length === 0, "App-Kopie: kein h1", kopf.h1); else ok(gleich(kopf.h1, ["Platzbelegung"]), "Website: genau ein h1 „Platzbelegung“", kopf.h1);
  ok(kopf.lead === "Wann welcher Platzteil auf unserer Anlage in der Mainzer Landstraße belegt ist.", `Einleitungssatz: „${kopf.lead}“`);
  ok(kopf.fussnote === "Änderungen vorbehalten.", "Fußnote „Änderungen vorbehalten.“");
  ok(kopf.appModus === seite.app, `App-Modus ${seite.app ? "fest an" : "aus (ohne ?app=1)"}`);
  ok(kopf.platz === "undefined", "keine Prüfhilfe window.__platz");
  ok(await p.evaluate(() => /^Platzbelegung/.test(document.title)), "Titel beginnt mit „Platzbelegung“", await p.title());

  // alles einmal bedienen: Wochen, Filter, Tag, Dialog (Netzanfragen zählen)
  await p.click("#pb-vor"); await p.click("#pb-zurueck");
  for (const f of ["frei", "training", "spiele", "d1", "alle"]) await p.evaluate((x) => document.querySelector(`.pb-chip[data-f="${x}"]`).click(), f);
  await p.evaluate(() => document.querySelector(".pb-bl[data-typ=frei]")?.click());
  await p.waitForFunction(() => document.getElementById("pb-dialog").open);
  await p.keyboard.press("Escape");
  await p.waitForFunction(() => !document.getElementById("pb-dialog").open);
  await warte(150);
  const erwartet = [seite.url, SITE_CSS_URL, JSON_URL];
  const andere = log.anfragen.filter((u) => !erwartet.includes(u) && !u.startsWith(GH_ASSETS));
  ok(log.fremd.length === 0 && andere.length === 0, `keine Anfrage außer Seite, Stylesheet, Schriften/Logos und der Belegung (${log.anfragen.length} Anfragen, davon ${log.anfragen.filter((u) => u.startsWith(GH_ASSETS)).length} Schriften/Logos)`, { fremd: log.fremd, andere });
  ok(log.anfragen.filter((u) => u === JSON_URL).length === 1, "die Belegung wird genau einmal geladen");
  ok(log.fehler.length === 0, "keine JavaScript-Fehler", log.fehler);
  ok(log.konsole.length === 0, "nichts in der Konsole (Fehler, Warnungen)", log.konsole);
  // Gegenprobe des Abfangs selbst: eine absichtliche fremde Anfrage muss gezählt werden
  await p.evaluate(() => fetch("https://example.invalid/probe").catch(() => {}));
  await warte(200);
  ok(log.fremd.includes("https://example.invalid/probe"), "Negativprobe: der Abfang zählt eine absichtliche fremde Anfrage");
  await p.close();
}

async function pruefeWochen(browser, seite) {
  abschnitt(`2. ${seite.name}: Zählproben aus der Datei (Wochengitter nach dem Umschalten auf „Woche“, 1280 px, alle Wochen der Saison)`);
  const { p, log } = await oeffne(browser, seite, { hash: ORAKEL.iso(ORAKEL.erster) });
  await zuWoche(p);
  const anzahl = (ORAKEL.letzter - ORAKEL.erster) / 7 + 1;
  const abweichungen = [];
  const proWoche = [];
  let ersterTitel = null;
  for (let w = 0; w < anzahl; w++) {
    const montagNr = ORAKEL.erster + 7 * w;
    const dom = await p.evaluate(liesAnsicht);
    if (w === 0) ersterTitel = dom.titel;
    const soll = wocheSoll(montagNr);
    if (dom.tage.length !== 7) abweichungen.push(`Woche ${w}: ${dom.tage.length} Tage statt 7`);
    dom.tage.forEach((tag, i) => abweichungen.push(...vergleicheTag(tag, soll.tage[i])));
    abweichungen.push(...vergleicheHinweise(dom, soll.tage).map((x) => `Woche ab ${ORAKEL.iso(montagNr)}: ${x}`));
    const z = { training: 0, belegt: 0, spiel: 0, halb: 0, ganz: 0, frei: 0, halle: 0, andere: 0 };
    for (const tag of dom.tage) {
      z.training += tag.bloecke.filter((b) => b.typ === "training").length;
      z.belegt += tag.bloecke.filter((b) => b.typ === "belegt").length;
      z.spiel += tag.bloecke.filter(istSpiel).length;
      z.halb += tag.bloecke.filter((b) => istSpiel(b) && /\(halbes Feld\)/.test(b.label)).length;
      z.ganz += tag.bloecke.filter((b) => istSpiel(b) && !/\(halbes Feld\)/.test(b.label)).length;
      z.frei += tag.bloecke.filter((b) => b.typ === "frei").length;
      z.halle += tag.halle.length; z.andere += tag.andere.length;
    }
    proWoche.push({ montag: ORAKEL.iso(montagNr), titel: dom.titel, soll: soll.summe, ist: z, tage: dom.tage });
    if (w < anzahl - 1) await p.click("#pb-vor");
  }
  ok(abweichungen.length === 0, `${anzahl} Wochen (${ORAKEL.iso(ORAKEL.erster)} bis ${ORAKEL.iso(ORAKEL.letzter + 6)}): Einträge, freie Zeiten, Halle, andere Anlage, Ferien und Hinweise stimmen mit der eigenen Rechnung des Tests überein`, abweichungen.slice(0, 6));
  ok(await p.evaluate(() => document.getElementById("pb-vor").disabled), "in der letzten Woche ist „Nächste Woche“ gesperrt");
  for (let w = anzahl - 1; w > 0; w--) await p.click("#pb-zurueck");
  const dom0 = await p.evaluate(liesAnsicht);
  ok(dom0.titel === ersterTitel, `zurückgeblättert bis zur ersten Woche: „${dom0.titel}“`, { erwartet: ersterTitel });
  ok(await p.evaluate(() => document.getElementById("pb-zurueck").disabled), "in der ersten Woche ist „Vorherige Woche“ gesperrt");
  // außerhalb der Saison: Hinweis mit ausgeschriebenem Datum (Stilregel: im Satz „31. August 2026“)
  const langDatum = (iso) => `${Number(iso.slice(8, 10))}. ${["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"][Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
  const ersteTage = ORAKEL.tag(ORAKEL.erster);
  if (ersteTage.status.art === "vor") {
    const h = (await p.evaluate(liesAnsicht)).hinweise.find((x) => x.art === "status");
    ok(!!h && h.text.endsWith(`Vor dem ${langDatum(DATEN.regeln.trainingVon)} steht kein Training im Plan.`), `erste Woche (vor der Saison): Hinweis „${h?.text ?? "fehlt"}“`);
  }

  // die Wochen aus dem Arbeitspaket: erwartet / gezeigt
  const ausgewaehlt = [["2026-10-05", "KW 41, Herbstferien"], ["2026-10-26", "KW 44"], ["2026-11-02", "KW 45"], ["2026-11-09", "KW 46"]];
  for (const [von, bez] of ausgewaehlt) {
    const w = proWoche.find((x) => x.montag === von);
    if (!w) { info(`${bez} (${von}): nicht in der Datei`); continue; }
    const s = w.soll, i = w.ist;
    const jeTeam = {};
    for (const tag of w.tage) for (const b of tag.bloecke) if (b.typ === "training") jeTeam[ORAKEL.kurz[b.t]] = (jeTeam[ORAKEL.kurz[b.t]] ?? 0) + 1;
    const halleDom = w.tage.flatMap((tag) => tag.halle);
    info(`${w.titel}: Training erwartet ${s.training} / gezeigt ${i.training}; Heimspiele auf unserem Platz erwartet ${s.spiel} / gezeigt ${i.spiel} (davon halbes Feld erwartet ${s.halb} / gezeigt ${i.halb}, ganzer Platz erwartet ${s.ganz} / gezeigt ${i.ganz}); „auf anderer Anlage“ erwartet ${s.andere} / gezeigt ${i.andere}; Halle erwartet ${s.halle} / gezeigt ${i.halle}; belegt erwartet ${s.belegt} / gezeigt ${i.belegt}; freie Zeiten erwartet ${s.frei} / gezeigt ${i.frei}; Ferientage erwartet ${s.ferientage}`);
    ok(s.training === i.training && s.spiel === i.spiel && s.halb === i.halb && s.ganz === i.ganz && s.andere === i.andere && s.halle === i.halle && s.belegt === i.belegt && s.frei === i.frei, `${bez} (${von}): alle Zahlen erwartet = gezeigt (auch halbes Feld und ganzer Platz)`);
    if (bez === "KW 45") info(`   Training je Mannschaft (gezeigt): ${Object.entries(jeTeam).map(([k, v]) => `${k} ${v}`).join(", ")}; Halle: ${halleDom.join(" · ")}`);
  }
  const w41 = proWoche.find((x) => x.montag === "2026-10-05");
  if (w41) {
    await gehZu(p, "2026-10-05");
    const hinweis = (await p.evaluate(liesAnsicht)).hinweise.find((h) => h.art === "status");
    ok(w41.ist.training === 0, "Woche 05.–11.10.2026 (Herbstferien): 0 Trainingsblöcke");
    ok(!!hinweis && /Herbstferien/.test(hinweis.text), `Woche 05.–11.10.2026: Ferienhinweis „${hinweis?.text ?? "fehlt"}“`);
    ok(w41.tage.every((t) => t.kopf.includes("Herbstferien") && t.notiz.includes("Herbstferien")), "alle sieben Tage tragen den Ferienhinweis");
  }
  if (STANDARD_JSON) {
    const g = (v) => proWoche.find((x) => x.montag === v);
    ok(g("2026-11-02").ist.training === 18, "fixture.json, 02.–08.11.2026: 18 Trainingsblöcke (Herren fehlen; G-Jugend, F1, F2 in der Halle)");
    const halleKw45 = g("2026-11-02").tage.flatMap((t) => t.halle).join(" ");
    ok(["G-Jugend", "F1", "F2"].every((k) => halleKw45.includes(k)) && g("2026-11-02").ist.halle === 3, "fixture.json, KW 45: Halle für G-Jugend, F1 und F2", halleKw45);
    ok(g("2026-10-26").ist.spiel === 10 && g("2026-11-02").ist.spiel === 0 && g("2026-11-09").ist.spiel === 5, "fixture.json: Heimspiele auf unserem Platz KW 44: 10, KW 45: 0, KW 46: 5", [g("2026-10-26").ist.spiel, g("2026-11-02").ist.spiel, g("2026-11-09").ist.spiel]);
    ok(g("2026-10-26").ist.andere === 1 && g("2026-11-02").ist.andere === 1 && g("2026-11-09").ist.andere === 1, "fixture.json: „auf anderer Anlage“ je Woche 1 Spiel (KW 44, 45, 46)", [g("2026-10-26").ist.andere, g("2026-11-02").ist.andere, g("2026-11-09").ist.andere]);
    ok(g("2026-10-26").ist.halb === 6 && g("2026-10-26").ist.ganz === 4 && g("2026-11-09").ist.halb === 4 && g("2026-11-09").ist.ganz === 1, "fixture.json: Heimspiele KW 44: 6 halbes Feld und 4 ganzer Platz, KW 46: 4 halbes Feld und 1 ganzer Platz", [g("2026-10-26").ist, g("2026-11-09").ist]);
    const gesamt = proWoche.reduce((a, w) => ({ halb: a.halb + w.ist.halb, ganz: a.ganz + w.ist.ganz }), { halb: 0, ganz: 0 });
    ok(gesamt.halb === 45 && gesamt.ganz === 36, `fixture.json: über alle ${anzahl} Wochen 45 Spiele mit halbem Feld und 36 mit ganzem Platz gezeigt (81 Heimspiele auf unserem Platz)`, gesamt);
  }
  if (!DATEN.spiele.some((s) => Object.hasOwn(s, "feld"))) {
    // ältere Datei ohne „feld“: jedes Heimspiel auf unserem Platz belegt den ganzen Platz
    const gesamt = proWoche.reduce((a, w) => ({ halb: a.halb + w.ist.halb, ganz: a.ganz + w.ist.ganz, alle: a.alle + w.ist.spiel }), { halb: 0, ganz: 0, alle: 0 });
    ok(gesamt.halb === 0 && gesamt.ganz === gesamt.alle && gesamt.alle > 0, `Datei ohne „feld“: alle ${gesamt.alle} Heimspiele auf unserem Platz zeigen den ganzen Platz, keines das halbe Feld`, gesamt);
  }
  ok(log.fehler.length === 0 && log.konsole.length === 0 && log.fremd.length === 0, "dabei keine Fehler, keine Konsolenmeldung, keine fremde Anfrage", { fehler: log.fehler, konsole: log.konsole, fremd: log.fremd });
  await p.close();
}

async function pruefeTagesansicht(browser, seite, breite = 390, alleWochen = false) {
  const handy = breite < 700;
  const anzahl = (ORAKEL.letzter - ORAKEL.erster) / 7 + 1;
  abschnitt(`3${handy ? "" : "b"}. ${seite.name}: Tagesansicht ${handy ? "am Handy" : "am Desktop"} (${breite} px, ${alleWochen ? "alle Wochen" : "einige Wochen"}) stimmt mit der Rechnung überein`);
  const woechen = alleWochen ? Array.from({ length: anzahl }, (_, i) => ORAKEL.iso(ORAKEL.erster + 7 * i))
    : ["2026-10-05", "2026-11-02", "2026-12-21", "2027-05-03", ORAKEL.iso(ORAKEL.erster), ORAKEL.iso(ORAKEL.letzter)];
  const abw = [];
  const layout = { bloecke: 0, gross: [], gedreht: [], schrift: Infinity, versatz: [], ueberlauf: [] };
  let tage = 0;
  const { p, log } = await oeffne(browser, seite, { breite, hoehe: handy ? 844 : 900, hash: ORAKEL.iso(ORAKEL.erster) });
  for (const w of woechen) {
    const mNr = ORAKEL.nr(w);
    if (mNr < ORAKEL.erster || mNr > ORAKEL.letzter) continue;
    await gehZu(p, w);
    const soll = wocheSoll(mNr);
    for (let i = 0; i < 7; i++) {
      await p.evaluate((k) => document.querySelectorAll(".pb-tab")[k].click(), i);
      const dom = await p.evaluate(liesAnsicht);
      if (dom.tage.length !== 1) { abw.push(`${w} Tag ${i}: ${dom.tage.length} Tage`); continue; }
      tage++;
      abw.push(...vergleicheTag(dom.tage[0], soll.tage[i]));
      if (i === 0) abw.push(...vergleicheHinweise(dom, soll.tage).map((x) => `${w}: ${x}`));
      if (!handy) {
        // Desktop: Text passt in die Blöcke, nichts gedreht, Schrift mindestens 13 px, Achse fluchtet mit den Spuren
        const m = await p.evaluate(messeTagesansicht);
        layout.bloecke += m.bloecke;
        layout.gross.push(...m.zuGross.map((x) => `${soll.tage[i].iso} ${x}`));
        layout.gedreht.push(...m.gedreht.map((x) => `${soll.tage[i].iso} ${x}`));
        if (m.schriftBlockMin !== null) layout.schrift = Math.min(layout.schrift, m.schriftBlockMin);
        if (Math.abs(m.achseVersatz - 1) > 0.6) layout.versatz.push(`${soll.tage[i].iso}: ${m.achseVersatz}`);
        if (m.sw > m.iw) layout.ueberlauf.push(`${soll.tage[i].iso}: ${m.sw} > ${m.iw}`);
      }
    }
  }
  ok(abw.length === 0, `${tage} Tage in ${woechen.length} Wochen einzeln angesehen: gleiche Einträge (mit Platzhälfte), freie Zeiten, Halle und andere Anlage wie die Rechnung`, abw.slice(0, 5));
  if (!handy) {
    ok(layout.gross.length === 0, `${breite} px: der Text passt in jeden der ${layout.bloecke} Blöcke (nichts abgeschnitten, kein Wort breiter als der Block)`, layout.gross.slice(0, 5));
    ok(layout.gedreht.length === 0, `${breite} px: in keiner der ${tage} Tagesansichten steht gedrehter Text`, layout.gedreht.slice(0, 3));
    ok(layout.schrift >= 13, `${breite} px: Schrift in den Blöcken aller ${tage} Tage mindestens 13 px (kleinste ${layout.schrift.toFixed(1)} px)`, layout.schrift);
    ok(layout.versatz.length === 0, `${breite} px: die Zeitachse beginnt auf der Höhe der Spuren (Versatz = Rand der Spuren, ${tage} Tage)`, layout.versatz.slice(0, 3));
    ok(layout.ueberlauf.length === 0, `${breite} px: kein seitlicher Überlauf in ${tage} Tagesansichten`, layout.ueberlauf.slice(0, 3));
  }
  ok(log.fehler.length === 0 && log.konsole.length === 0 && log.fremd.length === 0, "dabei keine Fehler und keine fremden Anfragen", { fehler: log.fehler, konsole: log.konsole, fremd: log.fremd });
  await p.close();
}

async function pruefeOeffentlich(browser, seite) {
  abschnitt(`4. ${seite.name}: öffentliche Fassung (Wortliste, belegt, kein HTML aus Daten)`);
  const VERBOTEN = ["Überschneidung", "gleichzeitig", "Prototyp", "Zeit offen", "Datenlage", "Excel", "Fußballschule", "Extern", "Zelle", "Raster",
    ...NAMEN, "teams.json", "spiele.csv", "Quelle"];
  const sammle = async (p) => p.evaluate(() => {
    const attr = [...document.querySelectorAll("[aria-label], [title]")].map((e) => `${e.getAttribute("aria-label") ?? ""} ${e.getAttribute("title") ?? ""}`).join(" ");
    return { text: document.body.innerText, attr };
  });
  const gefunden = (s) => [
    ...VERBOTEN.filter((w) => s.toLowerCase().includes(w.toLowerCase())),
    ...(PRIVATE_NAMEN.some((n) => n.test(s)) ? ["(privater Name aus pii-namen.txt)"] : []),   // der Name selbst steht nie in der Ausgabe
  ];
  const { p } = await oeffne(browser, seite, { hash: "2026-11-02" });
  let alles = await sammle(p);
  ok(gefunden(alles.text).length === 0, "Tagesansicht (Standard) mit Umschalter: sichtbarer Text ohne Überschneidung, gleichzeitig, Prototyp, Zeit offen, Datenlage, Excel, Fußballschule, Extern, Zelle, Raster und ohne Namen", gefunden(alles.text));
  ok(gefunden(alles.attr).length === 0, "auch Beschriftungen (aria-label, title) ohne diese Wörter und Namen", gefunden(alles.attr));
  await zuWoche(p);
  alles = await sammle(p);
  ok(gefunden(alles.text + " " + alles.attr).length === 0, "Wochengitter (nach „Woche“): sichtbarer Text und Beschriftungen ohne diese Wörter und Namen", gefunden(alles.text + " " + alles.attr));
  await zuTag(p);
  // jeder Filter, jeder Tag am Handy und der Dialog
  for (const f of ["frei", "training", "spiele", "d2", "alle"]) {
    await p.evaluate((x) => document.querySelector(`.pb-chip[data-f="${x}"]`).click(), f);
    const s = await sammle(p);
    if (gefunden(s.text + " " + s.attr).length) { ok(false, `Filter ${f}: verbotenes Wort`, gefunden(s.text + " " + s.attr)); }
  }
  await p.evaluate(() => document.querySelector(".pb-bl[data-typ=frei]").click());
  await p.waitForFunction(() => document.getElementById("pb-dialog").open);
  alles = await sammle(p);
  ok(gefunden(alles.text + " " + alles.attr).length === 0, "Dialog „Platz anfragen“ ohne diese Wörter und Namen", gefunden(alles.text));
  await p.close();
  const m = await oeffne(browser, seite, { breite: 390, hoehe: 844, hash: "2026-11-02" });
  let verboten = [];
  for (let i = 0; i < 7; i++) {
    await m.p.evaluate((k) => document.querySelectorAll(".pb-tab")[k].click(), i);
    const s = await sammle(m.p);
    verboten.push(...gefunden(s.text + " " + s.attr));
  }
  ok(verboten.length === 0, "Handy: alle sieben Tage ohne diese Wörter und Namen", verboten);
  // belegt: eigene Art, nur „belegt“, ohne Angabe, wer
  const montagBelegt = DATEN.belegt.filter((b) => b.tag === 0);
  const belegtDom = await m.p.evaluate(() => {
    document.querySelectorAll(".pb-tab")[0].click();
    return [...document.querySelectorAll('#pb-ansicht section.pb-tag[data-datum="2026-11-02"] .pb-bl[data-typ="belegt"]')].map((b) => ({ von: b.dataset.von, bis: b.dataset.bis, teile: b.dataset.teile, text: b.textContent, label: b.getAttribute("aria-label"), rolle: b.getAttribute("role"), tabindex: b.getAttribute("tabindex") }));
  });
  ok(montagBelegt.length === belegtDom.length && montagBelegt.every((b) => belegtDom.some((d) => d.von === b.von && d.bis === b.bis && d.teile === b.teile.join(","))), `Mo 02.11.2026: alle ${montagBelegt.length} „belegt“-Einträge der Datei stehen als belegt da`, belegtDom);
  ok(belegtDom.every((d) => d.text.includes("belegt") && /^belegt, /.test(d.label) && d.rolle === "img" && d.tabindex === null), "belegt trägt die Beschriftung „belegt“, ist kein Knopf und nicht anklickbar");
  if (STANDARD_JSON) ok(belegtDom.some((d) => d.teile === "kaefig" && d.von === "20:00" && d.bis === "21:30" && d.text.startsWith("belegt")), "fixture.json: Mo 02.11., Käfig 20:00–21:30 erscheint als „belegt“", belegtDom);
  const muster = await m.p.evaluate(() => {
    const css = (t) => { const e = document.createElement("div"); e.className = "pb-sw"; e.dataset.typ = t; document.querySelector(".pb").appendChild(e); const s = getComputedStyle(e); const r = { bild: s.backgroundImage, rand: `${s.borderTopStyle} ${s.borderTopWidth}`, farbe: s.backgroundColor }; e.remove(); return r; };
    return { belegt: css("belegt"), frei: css("frei"), training: css("training"), spiel: css("spiel"), festival: css("festival") };
  });
  const einmalig = new Set(Object.values(muster).map((x) => JSON.stringify(x)));
  ok(einmalig.size === 5, "alle fünf Arten haben ein eigenes Muster (Hintergrundbild, Rand, Farbe); belegt weder wie frei noch wie Training", muster);
  const legende = await m.p.evaluate(() => [...document.querySelectorAll("#pb-legende li")].map((li) => li.textContent));
  ok(legende.some((x) => x === "belegt (andere Nutzung)"), "Legende nennt „belegt (andere Nutzung)“", legende);
  await m.p.close();

  // kein HTML aus Daten: Quelltext und Gegenprobe mit Schadtext in der Datei
  const quelle = readFileSync(QUELLE_JS, "utf8");
  const gebaut = readFileSync(seite.datei, "utf8");
  const GEFAHR = /\binnerHTML\b|\binsertAdjacentHTML\b|\bouterHTML\b|document\.write\b|\beval\s*\(|new Function\s*\(|\bsrcdoc\b/;
  ok(!GEFAHR.test(quelle) && !GEFAHR.test(gebaut), "Quelltext und gebaute Seite: kein innerHTML, insertAdjacentHTML, outerHTML, document.write, eval");
  ok(!/__platz/.test(quelle + gebaut) && !/&f=/.test(quelle + gebaut), "keine Prüfhilfe __platz und keine Test-Adresse mit &f= im Code");
  const erste = quelle.indexOf("HALBFELD_ZUERST");
  ok(/^\s*var HALBFELD_ZUERST = "links";$/m.test(quelle) && erste >= 0 && erste < quelle.indexOf("var WARTEZEIT") && (quelle.match(/var HALBFELD_ZUERST/g) || []).length === 1 && gebaut.includes('var HALBFELD_ZUERST = "links";'), "Vorliebe „links zuerst“: eine benannte Konstante HALBFELD_ZUERST = \"links\" am Anfang des Skripts (in der gebauten Seite enthalten; ändert man sie, müssen das Orakel und die festen Werte des Tests mitgezogen werden)");
  ok(!/Prototyp/.test(gebaut), "gebaute Seite enthält das Wort „Prototyp“ nirgends");
  const gift = JSON.parse(JSON_TEXT);
  const schad = (n) => `<img src=x onerror="window.__pwn=${n}">`;
  gift.mannschaften[0].kurz = schad(1);
  gift.teile[0].name = `<b id=pwn-teil>${"Tor"}</b>`;
  gift.halle[0].ort = schad(2);
  const anderer = gift.spiele.find((s) => s.d === "2026-11-08" && s.ort !== "u");
  if (anderer) anderer.ort = "<script>window.__pwn=3</script>";
  gift.regeln.frei[0].name = '<svg onload="window.__pwn=4">Ferien</svg>';
  gift.saison = "<i>x</i>"; gift.stand.plan = "<u>1</u>"; gift.stand.spiele = "<u>2</u>";
  const g = await oeffne(browser, seite, { hash: "2026-11-02", json: { daten: gift } });
  await warte(300);
  const lies = () => g.p.evaluate(() => ({
    pwn: window.__pwn,
    fremdes: document.querySelectorAll("#pb img, #pb svg[onload], #pb b#pwn-teil, #pb u, #pb script, #pb [onerror]").length,
    img: document.getElementById("pb").textContent.includes("<img src=x"), svg: document.getElementById("pb").textContent.includes("<svg onload"),
    stand: document.getElementById("pb-stand").textContent,
  }));
  const r1 = await lies();
  await gehZu(g.p, "2026-10-06");
  const r2 = await lies();
  ok(r1.pwn === undefined && r2.pwn === undefined && r1.fremdes === 0 && r2.fremdes === 0, "Schadtext in Namen, Orten, Ferienname, Stand und Saison wird nicht ausgeführt und nicht als Element eingefügt", { r1, r2 });
  ok(r1.img && r2.svg && r1.stand.includes("<u>1</u>"), "der Schadtext erscheint stattdessen wörtlich als Text (Mannschaft, Halle, Ferienname, Stand)", { r1, r2 });
  ok(g.log.fremd.length === 0, "und löst keine Anfrage aus (img src=x)", g.log.fremd);
  await g.p.close();
}

async function pruefeDialog(browser, seite, breite) {
  const handy = breite < 700;
  abschnitt(`5. ${seite.name}: Dialog „Platz anfragen“ (${breite} px, ${handy ? "Antippen" : "Mausklick"})`);
  const wochenStart = ORAKEL.nr("2026-11-02");
  let testTag = -1;
  for (let i = 0; i < 7 && testTag < 0; i++) if (ORAKEL.tag(wochenStart + i).frei.length) testTag = i;
  if (testTag < 0) { ok(false, "Dialog: in der Woche ab 02.11.2026 gibt es kein freies Stück zum Anklicken"); return; }
  const testIso = ORAKEL.iso(wochenStart + testTag);
  const { p, log } = await oeffne(browser, seite, { breite, hoehe: handy ? 844 : 800, hash: testIso });
  const klick = async (sel) => (handy ? p.tap(sel) : p.click(sel));
  const geschlossen = () => p.waitForFunction(() => !document.getElementById("pb-dialog").open, { timeout: 3000 }).then(() => true, () => false);
  const offen = () => p.waitForFunction(() => document.getElementById("pb-dialog").open, { timeout: 3000 }).then(() => true, () => false);
  // ein freies Stück am ersten Tag der Woche, an dem es eines gibt (Standard: Montag, 02.11.2026)
  await warte(300);
  const vorlage = await p.evaluate((d) => {
    const b = document.querySelector(`section.pb-tag[data-datum="${d}"] .pb-bl[data-typ="frei"]`);
    b.id = "pb-test-frei";
    return { teile: b.dataset.teile, von: b.dataset.von, bis: b.dataset.bis, rolle: b.getAttribute("role"), tab: b.tabIndex, label: b.getAttribute("aria-label") };
  }, testIso);
  ok(vorlage.rolle === "button" && vorlage.tab === 0 && /^Frei: /.test(vorlage.label), "freies Stück ist per Tastatur erreichbar (role=button, tabindex 0) mit Beschriftung „Frei: …“", vorlage);
  const teilName = ORAKEL.name[vorlage.teile];
  const tagText = `${WOCHENTAGE[testTag]} ${ORAKEL.deutsch(testIso)}`;
  const zeitText = `${vorlage.von}–${vorlage.bis}`;
  const anzahlVorher = log.anfragen.length;
  await klick("#pb-test-frei");
  ok(await offen(), "Antippen bzw. Anklicken des freien Stücks öffnet den Dialog");
  const d = await p.evaluate(() => {
    const dlg = document.getElementById("pb-dialog");
    const a = dlg.querySelector("a");
    return {
      titel: dlg.querySelector("h2").textContent,
      paare: [...dlg.querySelectorAll("dt")].map((dt) => [dt.textContent, dt.nextElementSibling.textContent]),
      text: dlg.innerText.replace(/\s+/g, " "),
      href: a ? a.getAttribute("href") : null,
      linkText: a ? a.textContent : null,
      modal: dlg.matches(":modal"),
    };
  });
  ok(d.titel === "Platz anfragen" && d.modal, "Dialog „Platz anfragen“ ist offen (modal)", d);
  ok(gleich(d.paare, [["Platzteil", teilName], ["Tag", tagText], ["Zeit", `${zeitText} Uhr`]]), `Dialog nennt Platzteil, Tag und Zeit: ${teilName}, ${tagText}, ${zeitText} Uhr`, d.paare);
  ok(d.text.includes("Frei heißt: kein Eintrag im Plan. Ob der Platz genutzt werden kann, entscheidet die Geschäftsstelle. Es wird nichts gebucht."), "Satz „Frei heißt: kein Eintrag im Plan. Ob der Platz genutzt werden kann, entscheidet die Geschäftsstelle. Es wird nichts gebucht.“", d.text);
  ok(d.text.includes(MAIL), `Adresse der Geschäftsstelle als sichtbarer Text (${MAIL})`);
  const betreff = `Platzanfrage ${teilName}, ${tagText}, ${zeitText} Uhr`;
  const koerper = `Guten Tag,\r\n\r\nwir möchten diese Zeit anfragen:\r\nPlatzteil: ${teilName}\r\nTag: ${tagText}\r\nZeit: ${zeitText} Uhr (laut Plan frei)\r\nWofür:\r\nKontakt (Name, Telefon):\r\n\r\nViele Grüße`;
  const m = /^mailto:([^?]+)\?subject=([^&]*)&body=(.*)$/s.exec(d.href ?? "");
  ok(!!m && m[1] === MAIL, "Link ist ein mailto: an die Geschäftsstelle", d.href);
  ok(!!m && decodeURIComponent(m[2]) === betreff, `Betreff (dekodiert): „${m ? decodeURIComponent(m[2]) : "?"}“`, { erwartet: betreff });
  ok(!!m && decodeURIComponent(m[3]) === koerper, "Text (dekodiert) wie vorgegeben, Zeilenwechsel als CRLF, nichts vorbelegt", m ? JSON.stringify(decodeURIComponent(m[3])) : "?");
  ok(!!m && !/[\s"<>]/.test(m[2] + m[3]) && m[3].includes("%0D%0A") && m[2] === encodeURIComponent(betreff) && m[3] === encodeURIComponent(koerper), "Betreff und Text sind mit encodeURIComponent kodiert (RFC 6068: %0D%0A)");
  ok(log.anfragen.length === anzahlVorher, "Öffnen des Dialogs löst keine Netzanfrage aus", log.anfragen.slice(anzahlVorher));
  // Schließen: Knopf, Escape, Klick daneben
  await klick(".pb-dialog button");
  ok(await geschlossen(), "schließt per Knopf „Schließen“");
  await klick("#pb-test-frei"); await offen();
  await p.keyboard.press("Escape");
  ok(await geschlossen(), "schließt per Escape");
  await klick("#pb-test-frei"); await offen();
  if (handy) await p.touchscreen.tap(6, 6); else await p.mouse.click(6, 6);
  ok(await geschlossen(), "schließt per Klick neben das Fenster");
  if (await p.evaluate(() => document.getElementById("pb-dialog").open)) await p.evaluate(() => document.getElementById("pb-dialog").close());
  await klick("#pb-test-frei"); await offen();
  const innen = await p.evaluate(() => { const r = document.querySelector(".pb-dialog h2").getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
  if (handy) await p.touchscreen.tap(innen[0], innen[1]); else await p.mouse.click(innen[0], innen[1]);
  await warte(150);
  ok(await p.evaluate(() => document.getElementById("pb-dialog").open), "ein Klick in das Fenster selbst schließt nicht");
  await p.keyboard.press("Escape"); await geschlossen();
  if (await p.evaluate(() => document.getElementById("pb-dialog").open)) await p.evaluate(() => document.getElementById("pb-dialog").close());
  // das Schließen ruft dialog.close() selbst auf (nicht nur ein Formular mit method=dialog)
  const quelleText = readFileSync(QUELLE_JS, "utf8");
  ok(/dlg\.close\(\)/.test(quelleText) && !/method="?dialog/.test(quelleText) && !(await p.evaluate(() => !!document.querySelector("dialog form"))), "Schließen läuft über dialog.close() im Skript, kein form method=dialog");
  // Tastatur: Enter und Leertaste öffnen, Fokus kehrt zurück
  await p.evaluate(() => document.getElementById("pb-test-frei").focus());
  await p.keyboard.press("Enter");
  ok(await offen(), "Enter auf dem fokussierten freien Stück öffnet den Dialog");
  await p.keyboard.press("Escape"); await geschlossen();
  ok(await p.evaluate(() => document.activeElement.id === "pb-test-frei"), "nach dem Schließen steht der Fokus wieder auf dem freien Stück");
  await p.keyboard.press("Space");
  ok(await offen(), "die Leertaste öffnet ebenfalls");
  await p.keyboard.press("Escape"); await geschlossen();
  ok(log.fehler.length === 0 && log.konsole.length === 0 && log.fremd.length === 0, "dabei keine Fehler, Konsolenmeldungen oder fremden Anfragen", { fehler: log.fehler, konsole: log.konsole, fremd: log.fremd });
  await p.close();
}

async function pruefeFehlerfaelle(browser, seite) {
  abschnitt(`6. ${seite.name}: Fehlerfälle (Datei nicht ladbar, ungültig, andere Version)`);
  const fall = (j) => ({ ...JSON.parse(JSON_TEXT), ...j });
  const faelle = [
    ["Datei antwortet 404", { status: 404 }],
    ["Datei antwortet 500", { status: 500 }],
    ["version 2", { daten: fall({ version: 2 }) }],
    ["version fehlt", { daten: (() => { const d = JSON.parse(JSON_TEXT); delete d.version; return d; })() }],
    ["kein gültiges JSON", { body: "{ das ist kein JSON" }],
    ["Antwort ist kein Objekt", { body: "[]" }],
    ["Teile fehlen (training)", { daten: (() => { const d = JSON.parse(JSON_TEXT); delete d.training; return d; })() }],
    ["Anfrage abgebrochen (kein Netz)", { abbruch: true }],
  ];
  for (const [bez, json] of faelle) {
    const { p, log } = await oeffne(browser, seite, { breite: 1280, hash: "2026-11-02", json });
    const z = await p.evaluate(() => {
      const f = document.getElementById("pb-fehler"), l = document.getElementById("pb-fehler-link");
      const sichtbar = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== "hidden"; };
      return {
        fehler: sichtbar(f), text: f.innerText.replace(/\s+/g, " "), link: l.getAttribute("href"), linkText: l.textContent, linkSichtbar: sichtbar(l),
        inhalt: sichtbar(document.getElementById("pb-inhalt")), laden: sichtbar(document.getElementById("pb-laden")),
        stand: sichtbar(document.getElementById("pb-stand")), h1: document.querySelectorAll("h1").length, bloecke: document.querySelectorAll(".pb-bl").length,
      };
    });
    const richtig = z.fehler && z.text.includes("Die Belegung ist gerade nicht erreichbar. Bitte versuchen Sie es später noch einmal.") && z.link === seite.termineLink && z.linkSichtbar && !z.inhalt && !z.laden && !z.stand && z.bloecke === 0 && log.fehler.length === 0 && log.konsole.length <= 1 && log.fremd.length === 0;
    ok(richtig, `${bez}: Hinweis „nicht erreichbar“ mit Link „${z.linkText}“ (${z.link}); Inhalt weg; kein Absturz; Konsole ${log.konsole.length} Eintrag${log.konsole.length === 1 ? "" : "e"}`, { z, fehler: log.fehler, konsole: log.konsole, fremd: log.fremd });
    await p.close();
  }
  // Ladezustand und der Weg danach
  const spaet = await oeffne(browser, seite, { hash: "2026-11-02", json: { spaet: 700 }, warteAuf: false });
  await warte(250);
  const waehrend = await spaet.p.evaluate(() => ({ laden: !document.getElementById("pb-laden").hidden, inhalt: !document.getElementById("pb-inhalt").hidden, text: document.getElementById("pb-laden").textContent }));
  await spaet.p.waitForFunction(() => !document.getElementById("pb-inhalt").hidden, { timeout: 5000 });
  ok(waehrend.laden && !waehrend.inhalt && waehrend.text === "Die Belegung wird geladen.", "während des Ladens steht „Die Belegung wird geladen.“, danach der Inhalt", waehrend);
  await spaet.p.close();
  // Link zur Terminseite in der Website mit ?app=1 (App-Modus ohne App-Kopie): nav://, kein h1
  if (!seite.app) {
    const a = await oeffne(browser, { ...seite, url: seite.url + "?app=1" }, { hash: "2026-11-02", json: { status: 404 } });
    // die Seite wird unter der Adresse mit ?app=1 beantwortet
    const z = await a.p.evaluate(() => ({ link: document.getElementById("pb-fehler-link").getAttribute("href"), h1: document.querySelectorAll("h1").length, modus: document.documentElement.classList.contains("app-modus") }));
    ok(z.modus && z.h1 === 0 && z.link === SEITEN.app.termineLink, "Website mit ?app=1: App-Modus, kein h1, Link zu den Terminen als App-Seite (nav://)", z);
    await a.p.close();
  }
}

async function pruefeGroessen(browser, seite) {
  abschnitt(`7. ${seite.name}: Handy (390 × 844, Touch) und Desktop (1280 × 800)`);
  const messen = (p, selektoren) => p.evaluate((sel) => sel.flatMap((s) => [...document.querySelectorAll(s)].map((e) => { const r = e.getBoundingClientRect(); return { s, w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10, name: (e.getAttribute("aria-label") || e.textContent || "").trim().slice(0, 24) }; })), selektoren);
  const zuKlein = (liste) => liste.filter((x) => x.w < 43.99 || x.h < 43.99);
  const ueberlauf = (p) => p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  const AUSWAHL = ["#pb-zurueck", "#pb-vor", "#pb-heute", ".pb-tab", ".pb-chip"];

  // Handy 390: jeder Tag einiger Wochen ohne seitlichen Überlauf, Touch-Ziele
  const h = await oeffne(browser, seite, { breite: 390, hoehe: 844, hash: "2026-11-02" });
  const m390 = await h.p.evaluate(messeAnsicht);
  ok(!m390.woche && m390.tage.length === 1 && m390.tagwahlSichtbar && !m390.umschalterSichtbar, "390 px: Standard ist die Tagesansicht mit Tagwahl, es gibt keinen Umschalter „Tag | Woche“", m390);
  let schlimmster = 0, gezaehlt = 0;
  for (const w of ["2026-10-05", "2026-11-02", "2026-11-09", "2026-12-21"]) {
    await gehZu(h.p, w);
    for (let i = 0; i < 7; i++) {
      await h.p.evaluate((k) => document.querySelectorAll(".pb-tab")[k].click(), i);
      const u = await ueberlauf(h.p);
      schlimmster = Math.max(schlimmster, u.sw - u.iw); gezaehlt++;
    }
  }
  ok(schlimmster <= 0, `390 px: kein seitlicher Überlauf an ${gezaehlt} Tagesansichten (scrollWidth ≤ innerWidth, größter Überstand ${Math.max(0, schlimmster)} px)`);
  const g390 = await messen(h.p, AUSWAHL);
  const zk = zuKlein(g390);
  ok(zk.length === 0, `390 px: Touch-Ziele mindestens 44 px an Wochenwahl, Tagwahl und Filtern (${g390.length} Bedienelemente, kleinste Breite ${Math.min(...g390.map((x) => x.w))} px, kleinste Höhe ${Math.min(...g390.map((x) => x.h))} px)`, zk);
  await gehZu(h.p, "2026-11-02");
  await h.p.evaluate(() => document.querySelectorAll(".pb-tab")[0].click());
  const touchFlaechen = await h.p.evaluate(() => { const frei = [...document.querySelectorAll('.pb-bl[data-typ="frei"]')].map((b) => b.getBoundingClientRect()); return { n: frei.length, w: Math.min(...frei.map((r) => r.width)), h: Math.min(...frei.map((r) => r.height)) }; });
  info(`freie Stücke am Handy (Tag Montag): ${touchFlaechen.n}, kleinste Breite ${touchFlaechen.w.toFixed(1)} px, kleinste Höhe ${touchFlaechen.h.toFixed(1)} px`);
  await h.p.evaluate(() => { document.querySelectorAll(".pb-tab")[0].click(); document.querySelector(".pb-bl[data-typ=frei]").click(); });
  await h.p.waitForFunction(() => document.getElementById("pb-dialog").open);
  const dlg = await messen(h.p, [".pb-dialog button", ".pb-dialog a"]);
  ok(dlg.length >= 2 && zuKlein(dlg).length === 0, `390 px: Knöpfe im Dialog mindestens 44 px (${dlg.map((x) => `${x.name} ${x.w}×${x.h}`).join("; ")})`, dlg);
  const dbreite = await h.p.evaluate(() => { const r = document.getElementById("pb-dialog").getBoundingClientRect(); return { l: r.left, r: r.right, iw: window.innerWidth }; });
  ok(dbreite.l >= 0 && dbreite.r <= dbreite.iw, "390 px: der Dialog liegt ganz im Fenster", dbreite);
  const u390 = await ueberlauf(h.p);
  ok(u390.sw <= u390.iw, "390 px: auch mit offenem Dialog kein Überlauf");
  await h.p.close();

  // weitere Handybreiten: Überlauf und Touch-Ziele
  for (const b of [320, 360, 375, 414]) {
    const x = await oeffne(browser, seite, { breite: b, hoehe: 800, hash: "2026-11-02" });
    let schl = 0;
    for (const w of ["2026-10-05", "2026-11-02", "2026-11-09"]) {
      await gehZu(x.p, w);
      for (let i = 0; i < 7; i++) { await x.p.evaluate((k) => document.querySelectorAll(".pb-tab")[k].click(), i); const u = await ueberlauf(x.p); schl = Math.max(schl, u.sw - u.iw); }
    }
    const kl = zuKlein(await messen(x.p, AUSWAHL));
    ok(schl <= 0, `${b} px: kein seitlicher Überlauf (21 Tagesansichten)`);
    if (b !== 320) ok(kl.length === 0, `${b} px: Touch-Ziele mindestens 44 px`, kl); else info(`320 px: Touch-Ziele unter 44 px: ${kl.length}${kl.length ? " (" + kl.map((k) => `${k.name} ${k.w}×${k.h}`).join("; ") + ")" : ""}`);
    await x.p.close();
  }

  // Desktop 1280: Standard ist die Tagesansicht (mit Umschalter), das Wochengitter erscheint nach „Woche“
  const d = await oeffne(browser, seite, { breite: 1280, hoehe: 800, hash: "2026-11-02" });
  const m0 = await d.p.evaluate(messeAnsicht);
  ok(!m0.woche && m0.tage.length === 1 && m0.tagwahlSichtbar && m0.umschalterSichtbar, "1280 px: Standard ist die Tagesansicht (ein Tag, Tagwahl und Umschalter „Tag | Woche“ sichtbar)", m0);
  ok(m0.sw <= m0.iw, `1280 px: kein seitlicher Überlauf (scrollWidth ${m0.sw} ≤ innerWidth ${m0.iw})`);
  const gd = await messen(d.p, ["#pb-zurueck", "#pb-vor", "#pb-heute", ".pb-chip", ".pb-umschalt", ".pb-tab"]);
  ok(zuKlein(gd).length === 0, `1280 px: Wochenwahl, Umschalter, Tagwahl und Filter mindestens 44 px (${gd.length} Bedienelemente)`, zuKlein(gd));
  await zuWoche(d.p);
  const m1 = await d.p.evaluate(messeAnsicht);
  ok(m1.woche && m1.tage.length === 7 && !m1.tagwahlSichtbar && m1.umschalter[1].gedrueckt === "true" && m1.umschalter[0].gedrueckt === "false", "1280 px: nach „Woche“ das Wochengitter mit sieben Tagen, Tagwahl ausgeblendet", m1);
  ok(m1.sw <= m1.iw, "1280 px, Wochengitter: kein seitlicher Überlauf");
  // Umschalten bei 1100 px und beim Ändern der Fenstergröße (die Wahl „Woche“ bleibt bestehen)
  await d.p.setViewport({ width: 1099, height: 800 }); await warte(400);
  const u1 = await d.p.evaluate(messeAnsicht);
  await d.p.setViewport({ width: 1100, height: 800 }); await warte(400);
  const u2 = await d.p.evaluate(messeAnsicht);
  ok(!u1.woche && u1.tage.length === 1 && !u1.umschalterSichtbar && u1.tagwahlSichtbar && u2.woche && u2.umschalterSichtbar && !u2.tagwahlSichtbar, "unter 1100 px nur die Tagesansicht ohne Umschalter, ab 1100 px mit Umschalter (auch beim Ändern der Fenstergröße; die Wahl „Woche“ bleibt)", { u1, u2 });
  // 1100 und 1440: kein Überlauf (Wochengitter)
  for (const b of [1100, 1440]) { await d.p.setViewport({ width: b, height: 800 }); await warte(300); const u = await ueberlauf(d.p); ok(u.sw <= u.iw, `${b} px: kein seitlicher Überlauf (Wochengitter)`); }
  await d.p.close();
  // Tagesansicht beim Ändern der Fenstergröße über 1100 px: ab 1100 px die größere Fassung (Schrift mindestens 13 px), darunter die
  // kompakte; Zeitachse und Spuren fluchten in beiden
  const w = await oeffne(browser, seite, { breite: 1099, hoehe: 800, hash: "2026-10-31" });
  const k0 = await w.p.evaluate(messeTagesansicht);
  await w.p.setViewport({ width: 1100, height: 800 }); await warte(400);
  const k1 = await w.p.evaluate(messeTagesansicht);
  await w.p.setViewport({ width: 1099, height: 800 }); await warte(400);
  const k2 = await w.p.evaluate(messeTagesansicht);
  const fluchtet = (m) => Math.abs(m.achseVersatz - 1) <= 0.6 && m.sw <= m.iw;
  ok(fluchtet(k0) && fluchtet(k1) && fluchtet(k2) && k1.schriftBlockMin >= 13 && k1.spurMin >= 120 && k1.zuGross.length === 0 && k0.zuGross.length === 0 && k2.zuGross.length === 0, `Tagesansicht 1099 › 1100 › 1099 px: Zeitachse und Spuren fluchten, Text passt in die Blöcke, ab 1100 px Schrift mindestens 13 px (${k1.schriftBlockMin?.toFixed(1)} px) und Spuren mindestens 120 px (${k1.spurMin.toFixed(0)} px)`, { k0, k1, k2 });
  await w.p.close();
}

async function pruefeBedienung(browser, seite) {
  abschnitt(`8. ${seite.name}: Bedienung (Heute, Adresse, Filter, Tastatur, ARIA)`);
  const { p, log } = await oeffne(browser, seite, { breite: 390, hoehe: 844 });
  // ohne Adresse: heutige Woche (oder Hinweis, wenn heute nicht im Plan liegt)
  const heute = heuteBerlin();
  const heuteNr = ORAKEL.nr(heute);
  const dom0 = await p.evaluate(() => ({ titel: document.getElementById("pb-titel").textContent, hinweis: document.getElementById("pb-heute-hinweis").hidden ? "" : document.getElementById("pb-heute-hinweis").textContent, gewaehlt: [...document.querySelectorAll(".pb-tab")].findIndex((t) => t.getAttribute("aria-selected") === "true") }));
  if (heuteNr >= ORAKEL.erster && heuteNr <= ORAKEL.letzter + 6) {
    const soll = wocheSoll(ORAKEL.montag(heuteNr));
    ok(dom0.gewaehlt === ORAKEL.wochentag(heuteNr) && dom0.hinweis === "", `ohne Adresse zeigt die Seite heute (${heute}): ${dom0.titel}, Tag ${WOCHENTAGE_KURZ[dom0.gewaehlt]}`, dom0);
    ok(await p.evaluate(() => !!document.querySelector(".pb-tab.pb-heute-tag")), "der heutige Tag ist in der Tagwahl markiert (und im Titel „heute“)");
    void soll;
  } else {
    ok(dom0.hinweis.startsWith("Heute liegt "), `heute (${heute}) liegt nicht im Plan: Hinweis „${dom0.hinweis}“`, dom0);
  }
  // „Heute“ führt zurück
  await gehZu(p, "2027-02-10");
  await p.click("#pb-heute");
  const d1 = await p.evaluate(() => document.getElementById("pb-titel").textContent);
  ok(d1 === dom0.titel || dom0.hinweis !== "", "„Heute“ springt zurück in die heutige Woche", { d1, dom0 });
  // Adresse #JJJJ-MM-TT und Wechsel der Adresse
  await gehZu(p, "2026-12-24");
  const d2 = await p.evaluate(() => ({ titel: document.getElementById("pb-titel").textContent, tag: [...document.querySelectorAll(".pb-tab")].findIndex((t) => t.getAttribute("aria-selected") === "true"), h2: document.querySelector(".pb-tag-titel").textContent }));
  ok(d2.titel.startsWith("KW 52") && d2.tag === 3 && d2.h2.startsWith("Donnerstag, 24.12.2026"), "Adresse #2026-12-24 öffnet Donnerstag, 24.12.2026 in KW 52 (auch bei Änderung der Adresse)", d2);
  await p.evaluate(() => { location.hash = "#2026-02-30"; });
  await warte(100);
  ok(await p.evaluate(() => !document.getElementById("pb-inhalt").hidden && !!document.querySelector(".pb-tag-titel")), "eine ungültige Adresse (#2026-02-30) stört nicht");
  // Filter
  await gehZu(p, "2026-11-04");
  const sichtbar = () => p.evaluate(() => { const b = [...document.querySelectorAll("#pb-ansicht .pb-bl")]; const s = b.filter((x) => !x.classList.contains("aus")); return { alle: b.length, sichtbar: s.length, typen: [...new Set(s.map((x) => x.dataset.typ))].sort(), teams: [...new Set(s.map((x) => x.dataset.t).filter(Boolean))].sort(), versteckt: b.filter((x) => x.classList.contains("aus")).every((x) => x.getAttribute("aria-hidden") === "true" && x.tabIndex === -1), halle: document.querySelectorAll('.pb-zeile[data-art="halle"]').length }; });
  const chip = (f) => p.evaluate((x) => document.querySelector(`.pb-chip[data-f="${x}"]`).click(), f);
  const alleF = await sichtbar();
  await chip("frei"); const nurFrei = await sichtbar();
  await chip("training"); const nurTraining = await sichtbar();
  await chip("spiele"); const nurSpiele = await sichtbar();
  const team = ORAKEL.kurz[DATEN.mannschaften[2].id] ? DATEN.mannschaften[2].id : DATEN.mannschaften[0].id;
  await chip(team); const nurTeam = await sichtbar();
  const gedrueckt = await p.evaluate(() => [...document.querySelectorAll(".pb-chip[aria-pressed=true]")].map((c) => c.dataset.f));
  await chip("alle"); const wieder = await sichtbar();
  const nurDiese = (typen, erlaubt) => typen.every((t) => erlaubt.includes(t));
  ok(nurFrei.typen.length > 0 && nurDiese(nurFrei.typen, ["frei"]) && nurTraining.typen.length > 0 && nurDiese(nurTraining.typen, ["training"]) && nurDiese(nurSpiele.typen, ["spiel", "festival"]) && nurFrei.versteckt && nurTraining.versteckt && nurSpiele.versteckt, "Filter „Frei“, „Training“, „Spiele“ zeigen nur ihre Art; verdeckte Einträge sind nicht erreichbar", { nurFrei: nurFrei.typen, nurTraining: nurTraining.typen, nurSpiele: nurSpiele.typen });
  ok(nurTeam.teams.every((t) => t === team) && nurTeam.typen.every((t) => t !== "frei" && t !== "belegt") && gleich(gedrueckt, [team]) && nurTeam.versteckt, `Filter Mannschaft ${ORAKEL.kurz[team]}: nur ihre Einträge, Filter gedrückt, verdeckte Einträge nicht erreichbar`, { nurTeam, gedrueckt });
  ok(wieder.sichtbar === alleF.sichtbar && wieder.sichtbar > 0, "„Alle“ zeigt wieder alles", { alleF, wieder });
  // Tastatur in der Tagwahl
  await gehZu(p, "2026-11-02");
  await p.evaluate(() => document.querySelectorAll(".pb-tab")[0].focus());
  await p.keyboard.press("ArrowRight"); await p.keyboard.press("ArrowRight");
  const k1 = await p.evaluate(() => ({ g: [...document.querySelectorAll(".pb-tab")].findIndex((t) => t.getAttribute("aria-selected") === "true"), fokus: document.activeElement.id, rolle: document.querySelector("#pb-ansicht").getAttribute("role"), labelled: document.querySelector("#pb-ansicht").getAttribute("aria-labelledby") }));
  await p.keyboard.press("End"); const k2 = await p.evaluate(() => [...document.querySelectorAll(".pb-tab")].findIndex((t) => t.getAttribute("aria-selected") === "true"));
  await p.keyboard.press("Home"); await p.keyboard.press("ArrowLeft"); const k3 = await p.evaluate(() => [...document.querySelectorAll(".pb-tab")].findIndex((t) => t.getAttribute("aria-selected") === "true"));
  ok(k1.g === 2 && k1.fokus === "pb-tab-2" && k1.rolle === "tabpanel" && k1.labelled === "pb-tab-2" && k2 === 6 && k3 === 6, "Tagwahl per Pfeiltasten, Pos1 und Ende; Anzeige ist ein Tabpanel, beschriftet vom gewählten Tag", { k1, k2, k3 });
  // Bezeichnungen
  const b = await p.evaluate(() => ({ nav: document.querySelector(".pb-wnav").getAttribute("aria-label"), tabliste: document.getElementById("pb-tagwahl").getAttribute("role"), tabs: [...document.querySelectorAll(".pb-tab")].map((t) => t.getAttribute("aria-label")), live: document.getElementById("pb-titel").getAttribute("aria-live"), chips: document.querySelectorAll(".pb-chip").length }));
  ok(b.nav === "Wochenwahl" && b.tabliste === "tablist" && b.tabs.every((t) => /^(Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag), \d\d\.\d\d\.\d{4}/.test(t)) && b.live === "polite" && b.chips === 4 + DATEN.mannschaften.length, "Wochenwahl, Tagwahl und Filter sind beschriftet (aria-label, aria-live), 4 + Mannschaften Filter", b);
  ok(log.fehler.length === 0 && log.konsole.length === 0 && log.fremd.length === 0, "dabei keine Fehler und keine fremden Anfragen", { fehler: log.fehler, konsole: log.konsole, fremd: log.fremd });
  await p.close();
}

async function pruefeLinks(browser) {
  abschnitt("9. Links nach den Regeln aus hilfen.mjs (Website ohne und mit ?app=1, App-Kopie)");
  const seite = SEITEN.web;
  const web = await oeffne(browser, seite, { hash: "2026-11-02", json: { status: 404 } });
  const w = await web.p.evaluate(() => ({ link: document.getElementById("pb-fehler-link").getAttribute("href"), target: document.getElementById("pb-fehler-link").getAttribute("target") }));
  ok(w.link === "termine.html" && !w.target, "Website: Link zur Terminseite ist termine.html im selben Ordner (kein neuer Tab)", w);
  await web.p.close();
  const app = await oeffne(browser, SEITEN.app, { hash: "2026-11-02", json: { status: 404 } });
  const a = await app.p.evaluate(() => ({ link: document.getElementById("pb-fehler-link").getAttribute("href") }));
  ok(a.link === SEITEN.app.termineLink, "App-Kopie: Link zur Terminseite ist das Seitenmodul „Termine“ (nav://)", a);
  await app.p.close();
  // mailto bleibt in beiden Fassungen unverändert
  for (const s of [SEITEN.web, SEITEN.app]) {
    const x = await oeffne(browser, s, { breite: 390, hoehe: 844, hash: "2026-11-02" });
    await x.p.evaluate(() => document.querySelector(".pb-bl[data-typ=frei]").click());
    await x.p.waitForFunction(() => document.getElementById("pb-dialog").open);
    const href = await x.p.evaluate(() => document.querySelector(".pb-dialog a").getAttribute("href"));
    ok(href.startsWith(`mailto:${MAIL}?subject=`), `${s.name}: der mailto:-Link bleibt ein mailto: (nicht zu nav:// oder ext:// umgeschrieben)`);
    const alle = await x.p.evaluate(() => [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")));
    ok(alle.every((h) => /^(mailto:|nav:\/\/|termine\.html$)/.test(h)), `${s.name}: alle Links der Seite sind mailto:, nav:// oder die Terminseite`, alle);
    await x.p.close();
  }
}

async function pruefeAxe(browser, seite) {
  abschnitt(`10. ${seite.name}: Barrierefreiheit (axe-core)`);
  const regeln = ["color-contrast", "image-alt", "label", "link-name", "button-name", "landmark-one-main", "aria-allowed-attr", "aria-allowed-role", "aria-hidden-focus",
    "aria-required-attr", "aria-required-children", "aria-required-parent", "aria-valid-attr", "aria-valid-attr-value", "nested-interactive", "role-img-alt", "tabindex",
    "duplicate-id", "duplicate-id-aria", "aria-dialog-name", "html-has-lang", "document-title", "empty-heading", "heading-order", ...(seite.app ? [] : ["page-has-heading-one"])];
  const lauf = async (p, bez) => {
    await warte(400);                 // Übergänge der Knopffarben (160 ms) abwarten: axe soll fertige Farben messen
    await p.evaluate(AXE);
    const r = await p.evaluate((rs) => {
      const da = new Set(window.axe.getRules().map((x) => x.ruleId));
      return window.axe.run(document, { runOnly: { type: "rule", values: rs.filter((x) => da.has(x)) } });
    }, regeln);
    const v = r.violations.map((x) => `${x.id} (${x.nodes.length}×): ${x.nodes.slice(0, 2).map((n) => n.target.join(" ")).join(" | ")}`);
    ok(v.length === 0, `${bez}: keine Verstöße (${r.passes.length} Regeln bestanden${r.incomplete.length ? `, ${r.incomplete.length} nicht entscheidbar: ${r.incomplete.map((x) => x.id).join(", ")}` : ""})`, v);
  };
  for (const b of [1280, 390]) {
    const { p } = await oeffne(browser, seite, { breite: b, hoehe: 844, hash: "2026-11-02" });
    await lauf(p, `${b} px, Belegung`);
    await p.evaluate(() => document.querySelector(".pb-bl[data-typ=frei]").click());
    await p.waitForFunction(() => document.getElementById("pb-dialog").open);
    await lauf(p, `${b} px, Dialog offen`);
    await p.close();
  }
  const w = await oeffne(browser, seite, { breite: 1280, hoehe: 844, hash: "2026-11-02" });
  await zuWoche(w.p);
  await lauf(w.p, "1280 px, Wochengitter nach „Woche“");
  await w.p.close();
  const g = await oeffne(browser, seite, { breite: 1440, hoehe: 900, hash: "2026-10-31" });
  await lauf(g.p, "1440 px, Tagesansicht Samstag 31.10.2026");
  await g.p.close();
  const f = await oeffne(browser, seite, { breite: 1280, hash: "2026-11-02", json: { status: 404 } });
  await lauf(f.p, "Fehlerhinweis");
  await f.p.close();
}

async function fotos(browser) {
  abschnitt(`11. Fotos nach ${path.relative(ROOT, FOTO_ORDNER)}/`);
  mkdirSync(FOTO_ORDNER, { recursive: true });
  const machen = async (datei, seite, opt, vorher) => {
    const { p } = await oeffne(browser, seite, opt);
    if (vorher) await vorher(p);
    await warte(200);
    await p.screenshot({ path: path.join(FOTO_ORDNER, datei), fullPage: !opt.nurFenster });
    await p.close();
    info(datei);
  };
  // Samstag 31.10.2026: Kinderfestival F1, E2, E3 und E1 auf den Platzhälften
  await machen("desktop-tag-1440.png", SEITEN.web, { breite: 1440, hoehe: 900, hash: "2026-10-31" });
  await machen("desktop-tag-2000.png", SEITEN.web, { breite: 2000, hoehe: 1000, hash: "2026-10-31" });
  await machen("desktop-woche.png", SEITEN.web, { breite: 1280, hoehe: 800, hash: "2026-10-31" }, async (p) => { await zuWoche(p); });
  await machen("handy-tag.png", SEITEN.web, { breite: 390, hoehe: 844, dpr: 2, hash: "2026-10-31" });
  await machen("app-handy.png", SEITEN.app, { breite: 390, hoehe: 844, dpr: 2, hash: "2026-10-31" });
  const dateien = readdirSync(FOTO_ORDNER).sort();
  ok(gleich(dateien, ["app-handy.png", "desktop-tag-1440.png", "desktop-tag-2000.png", "desktop-woche.png", "handy-tag.png"]), "im Ordner liegen genau die fünf Fotos", dateien);
}

// ---------- Ansicht am Desktop, Halbfeld, Mutationsproben ----------

// Standardansicht: Tagesansicht bei jeder Breite (mit Adresse der Tag der Adresse, ohne Adresse heute); Umschalter „Tag“ gedrückt.
// Liefert die Abweichungen (leer = in Ordnung); auch die Mutationsprobe „Standard Woche“ benutzt diese Funktion.
async function standardAbweichungen(browser, seite, breiten) {
  const abw = [];
  const start = erwarteterStartTag();
  for (const breite of breiten) {
    for (const hash of ["2026-10-31", ""]) {
      const { p } = await oeffne(browser, seite, { breite, hoehe: 900, hash });
      const m = await p.evaluate(messeAnsicht);
      await p.close();
      const soll = hash || start.iso, wo = `${breite} px ${hash ? "mit Adresse" : "ohne Adresse"}`;
      if (m.woche) abw.push(`${wo}: Wochengitter statt Tagesansicht`);
      else if (!gleich(m.tage, [soll])) abw.push(`${wo}: gezeigt ${JSON.stringify(m.tage)}, erwartet ["${soll}"]`);
      if (!m.umschalterSichtbar || m.umschalter[0]?.text !== "Tag" || m.umschalter[0]?.gedrueckt !== "true" || m.umschalter[1]?.gedrueckt !== "false") abw.push(`${wo}: Umschalter nicht auf „Tag“`);
    }
  }
  return abw;
}

// Legende und Stand nennen den Feldteil
const LEGENDE_SOLL = ["Training einer Mannschaft", "Heimspiel auf unserem Platz (Dauer und Feldteil geschätzt)", "Kinderfestival", "belegt (andere Nutzung)", "frei (anklicken oder antippen: Platz anfragen)"];
async function legendeAbweichungen(browser, seite) {
  const { p } = await oeffne(browser, seite, { breite: 1280, hash: "2026-11-02" });
  const l = await p.evaluate(() => [...document.querySelectorAll("#pb-legende li")].map((li) => li.textContent));
  const stand = await p.evaluate(() => document.getElementById("pb-stand").textContent);
  await p.close();
  const abw = [];
  if (!gleich(l, LEGENDE_SOLL)) abw.push(`Legende: erwartet ${JSON.stringify(LEGENDE_SOLL)}, gezeigt ${JSON.stringify(l)}`);
  if (!stand.endsWith("Spieldauer und Feldteil geschätzt")) abw.push(`Stand: „${stand}“ nennt den Feldteil nicht`);
  return abw;
}

// Sonderfälle: erfundene Spiele auf einem Samstag und dem Montag danach, dazu feste Regeln und ein kleiner Trainingsplan (Mo: E3 rechts
// 16:00–17:30, E1 links 17:30–19:00, belegt links 20:00–21:30). Erwartet sind feste Werte, von Hand gerechnet (nicht das Orakel):
// Gleichstand → links, Spiele nicht in der Reihenfolge der Datei, gleicher Anstoß (Mannschaft vor Spielnummer), Spielnummer als Text
// (906 vor 95), Spiel ohne „feld“ = ganzer Platz, ganzer Platz neben halbem Feld, Training und „belegt“ vorbelegt.
function baueSonderfaelle(json) {
  const o = baueOrakel(json);
  if (!["d1", "d2", "e1", "e2", "e3", "f1", "f2"].every((id) => json.mannschaften.some((m) => m.id === id))) return null;
  let sa = null;
  for (let n = o.nr("2026-12-01"); n < o.saisonBis - 3 && sa === null; n++) {
    if (o.wochentag(n) === 5 && n >= o.erster && n + 2 <= o.letzter + 6 && o.tag(n).status.art === "aktiv" && o.tag(n + 2).status.art === "aktiv") sa = n;
  }
  if (sa === null) return null;
  const mo = sa + 2;
  const kopie = JSON.parse(JSON.stringify(json));
  kopie.regeln.fenster = { werktag: ["15:30", "21:30"], wochenende: ["09:00", "18:00"] };
  kopie.regeln.minFrei = 60;
  kopie.halle = [];
  kopie.training = [
    { t: "e3", tag: 0, von: "16:00", bis: "17:30", platz: "rechte Hälfte", teile: ["tor3", "tor4"] },
    { t: "e1", tag: 0, von: "17:30", bis: "19:00", platz: "linke Hälfte", teile: ["tor1", "tor2"] },
  ];
  kopie.belegt = [{ tag: 0, von: "20:00", bis: "21:30", teile: ["tor1", "tor2"] }];
  const g = (n, z, t, dauer, nr, feld) => { const x = { d: o.iso(n), z, t, w: "Meisterschaft", g: "Testverein", nr, dauer, ort: "u" }; if (feld !== undefined) x.feld = feld; return x; };
  kopie.spiele = [   // absichtlich nicht nach Anstoß geordnet
    g(sa, "15:00", "f2", 60, "95", "halb"), g(sa, "11:00", "e3", 90, "950", "halb"), g(sa, "10:00", "d1", 105, "930", "ganz"), g(sa, "11:00", "f1", 75, "940"),
    g(sa, "13:00", "f2", 75, "907", "halb"), g(sa, "15:00", "f2", 75, "906", "halb"), g(sa, "11:00", "e2", 90, "960", "halb"), g(sa, "10:30", "e1", 90, "920", "halb"),
    g(mo, "20:30", "e3", 60, "903", "halb"), g(mo, "18:00", "d2", 105, "904", "ganz"), g(mo, "17:45", "e1", 90, "902", "halb"), g(mo, "17:00", "e2", 90, "901", "halb"),
  ];
  const GANZ = "tor1,tor2,tor3,tor4", L = "tor1,tor2", R = "tor3,tor4";
  const tage = [
    { iso: o.iso(sa), name: `Sa ${o.deutsch(o.iso(sa))}`, spiele: [
      ["D1 10:00 (ganzer Platz)", "d1", "10:00", "11:45", GANZ],
      ["E1 10:30 (D1 belegt links und rechts gleich: Gleichstand, links)", "e1", "10:30", "12:00", L],
      ["E2 11:00 (links D1 und E1, rechts nur D1: rechts)", "e2", "11:00", "12:30", R],
      ["E3 11:00 (E2 steht in der Datei vor E3 und liegt rechts: links)", "e3", "11:00", "12:30", L],
      ["F1 11:00 (ohne feld: ganzer Platz)", "f1", "11:00", "12:15", GANZ],
      ["F2 13:00 (davor nichts mehr belegt: Gleichstand, links)", "f2", "13:00", "14:15", L],
      ["F2 15:00 Nr. 906 (Spielnummer als Text: 906 vor 95, Gleichstand: links)", "f2", "15:00", "16:15", L],
      ["F2 15:00 Nr. 95 (danach: links belegt, rechts frei: rechts)", "f2", "15:00", "16:00", R],
    ], frei: { tor1: ["09:00–10:00", "16:15–18:00"], tor2: ["09:00–10:00", "16:15–18:00"], tor3: ["09:00–10:00", "12:30–15:00", "16:00–18:00"], tor4: ["09:00–10:00", "12:30–15:00", "16:00–18:00"], kaefig: ["09:00–18:00"], court: ["09:00–18:00"] } },
    { iso: o.iso(mo), name: `Mo ${o.deutsch(o.iso(mo))}`, spiele: [
      ["E2 17:00 (Training E1 links 120, Training E3 rechts 60 Minuten Überlappung: rechts)", "e2", "17:00", "18:30", R],
      ["E1 17:45 (links Training E1 150, rechts E2 90: rechts)", "e1", "17:45", "19:15", R],
      ["D2 18:00 (ganzer Platz neben den halben Spielen)", "d2", "18:00", "19:45", GANZ],
      ["E3 20:30 (links „belegt“ 120, rechts 0: rechts)", "e3", "20:30", "21:30", R],
    ], frei: { tor1: ["15:30–17:30"], tor2: ["15:30–17:30"], tor3: [], tor4: [], kaefig: ["15:30–21:30"], court: ["15:30–21:30"] } },
  ];
  return { json: kopie, orakel: baueOrakel(kopie), tage };
}

// Sonderfälle in der Seite ansehen: feste Werte und zusätzlich die Rechnung des Orakels für beide Tage.
// Liefert { zeilen: [{ ok, text }], abw: [Text] }; auch die Mutationsproben benutzen diese Funktion.
async function sonderfaelleAnsehen(browser, seite, sz) {
  const zeilen = [], abw = [];
  const { p, log } = await oeffne(browser, seite, { breite: 1440, hoehe: 900, hash: sz.tage[0].iso, json: { daten: sz.json } });
  for (const tag of sz.tage) {
    await gehZu(p, tag.iso);
    const dom = (await p.evaluate(liesAnsicht)).tage[0];
    abw.push(...vergleicheTag(dom, sz.orakel.tag(sz.orakel.nr(tag.iso))).map((x) => `Orakel: ${x}`));
    for (const [name, t, von, bis, teile] of tag.spiele) {
      const b = dom.bloecke.find((x) => istSpiel(x) && x.t === t && x.von === von && x.bis === bis);
      const gezeigt = b ? b.teile : "nicht gezeigt";
      zeilen.push({ ok: gezeigt === teile, text: `${tag.name}, ${name}: erwartet ${teile} / gezeigt ${gezeigt}` });
    }
    for (const [spur, liste] of Object.entries(tag.frei)) {
      const gezeigt = dom.bloecke.filter((x) => x.typ === "frei" && x.teile === spur).map((x) => `${x.von}–${x.bis}`).sort();
      zeilen.push({ ok: gleich(gezeigt, liste), text: `${tag.name}, frei auf ${spur}: erwartet ${liste.join(", ") || "nichts"} / gezeigt ${gezeigt.join(", ") || "nichts"}` });
    }
  }
  await p.close();
  for (const z of zeilen) if (!z.ok) abw.push(z.text);
  if (log.fehler.length || log.fremd.length) abw.push(`Fehler oder fremde Anfragen: ${JSON.stringify({ fehler: log.fehler, fremd: log.fremd })}`);
  return { zeilen, abw };
}

// Lesbarkeit und Ruhe der Tagesansicht bei 1440 px (Samstag 31.10.2026): Spuren mindestens 120 px, Ansicht höchstens 1100 px breit, nichts
// gedreht, Schrift in den Blöcken mindestens 13 px, Text passt in die Blöcke, freie Flächen ohne Schraffur mit feiner durchgezogener Linie
async function lesbarkeitAbweichungen(browser, seite) {
  const { p } = await oeffne(browser, seite, { breite: 1440, hoehe: 900, hash: "2026-10-31" });
  const l = await p.evaluate(messeTagesansicht);
  const stil = await p.evaluate(() => { const s = getComputedStyle(document.querySelector('#pb-ansicht .pb-bl[data-typ="frei"]')); return { bild: s.backgroundImage, rand: `${s.borderTopStyle} ${s.borderTopWidth}` }; });
  await p.close();
  const abw = [];
  if (!(l.spurMin >= 120)) abw.push(`Spur nur ${l.spurMin.toFixed(1)} px breit (mindestens 120)`);
  if (!(l.breite <= 1100)) abw.push(`Tagesansicht ${Math.round(l.breite)} px breit (höchstens 1100)`);
  if (l.gedreht.length) abw.push(`gedrehter Text: ${l.gedreht[0]}`);
  if (!(l.schriftBlockMin >= 13)) abw.push(`Schrift in den Blöcken ${l.schriftBlockMin} px (mindestens 13)`);
  if (l.zuGross.length) abw.push(`Text passt nicht in den Block: ${l.zuGross[0]}`);
  if (stil.bild !== "none" || stil.rand !== "solid 1px") abw.push(`freie Fläche nicht ruhig: ${JSON.stringify(stil)}`);
  return abw;
}

async function pruefeDesktop(browser, seite) {
  abschnitt(`12. ${seite.name}: Tagesansicht als Standard und Lesbarkeit am Desktop (1280, 1440, 2000 px)`);
  const start = erwarteterStartTag();
  const standard = await standardAbweichungen(browser, seite, [1280, 1440, 2000]);
  ok(standard.length === 0, `Standard bei 1280, 1440 und 2000 px ist die Tagesansicht: mit Adresse #2026-10-31 der 31.10.2026, ohne Adresse heute (${start.iso}${start.hinweis ? ", heute liegt nicht im Plan" : ""}); Umschalter steht auf „Tag“`, standard);
  const lesbar = await lesbarkeitAbweichungen(browser, seite);
  ok(lesbar.length === 0, "Lesbarkeit bei 1440 px (dieselbe Probe wie bei den Mutationen): Spuren mindestens 120 px, Ansicht höchstens 1100 px breit, nichts gedreht, Schrift in den Blöcken mindestens 13 px, Text passt, freie Flächen ruhig", lesbar);
  for (const breite of [1280, 1440, 2000]) {
    const { p, log } = await oeffne(browser, seite, { breite, hoehe: 900, hash: "2026-10-31" });
    const m = await p.evaluate(messeAnsicht);
    ok(!m.woche && m.titel.startsWith("Samstag, 31.10.2026") && m.tagwahlSichtbar && m.tagwahlTage === 5, `${breite} px: Tagesansicht „${m.titel}“ mit sichtbarer Tagwahl (Samstag gewählt)`, m);
    ok(m.umschalterSichtbar && m.umschalter.length === 2 && m.umschalter[0].text === "Tag" && m.umschalter[1].text === "Woche" && m.umschalter.every((u) => u.w >= 44 && u.h >= 44), `${breite} px: Umschalter „Tag | Woche“ sichtbar, jedes Ziel mindestens 44 px (${m.umschalter.map((u) => `${u.text} ${u.w}×${u.h}`).join("; ")})`, m.umschalter);
    const l = await p.evaluate(messeTagesansicht);
    ok(l.spuren === 6 && l.spurMin >= 120, `${breite} px: sechs Spuren, jede mindestens 120 px breit (kleinste ${l.spurMin.toFixed(1)} px)`, l);
    ok(l.breite <= 1100, `${breite} px: die Tagesansicht ist höchstens 1100 px breit (${Math.round(l.breite)} px), die Spuren zerfließen nicht`, l.breite);
    ok(l.gedreht.length === 0, `${breite} px: kein gedrehter Text in der Tagesansicht (Spurnamen, Zeiten, Blöcke waagerecht)`, l.gedreht.slice(0, 3));
    ok(l.schriftBlockMin >= 13, `${breite} px: Schrift in den ${l.bloecke} Blöcken mindestens 13 px (kleinste ${l.schriftBlockMin?.toFixed(1)} px)`, l.schriftBlockMin);
    ok(l.schriftSpur >= 15 && l.schriftGruppe >= 13 && l.schriftAchse >= 12, `${breite} px: Spurnamen ${l.schriftSpur?.toFixed(1)} px, Hälften ${l.schriftGruppe?.toFixed(1)} px, Zeitachse ${l.schriftAchse?.toFixed(1)} px (mindestens 15, 13, 12)`, l);
    ok(l.zuGross.length === 0, `${breite} px: der Text passt in alle ${l.bloecke} Blöcke`, l.zuGross.slice(0, 3));
    ok(Math.abs(l.achseVersatz - 1) <= 0.6 && m.sw <= m.iw, `${breite} px: Zeitachse und Spuren fluchten, kein seitlicher Überlauf (scrollWidth ${m.sw} ≤ ${m.iw})`, { l, m });
    // Umschalten: Woche zeigt das Gitter und lässt die Adresse unberührt, Tag kommt auf denselben Tag zurück
    const hash0 = await p.evaluate(() => location.hash);
    await zuWoche(p);
    const w = await p.evaluate(messeAnsicht);
    ok(w.woche && w.tage.length === 7 && !w.tagwahlSichtbar && w.umschalter[1].gedrueckt === "true" && w.umschalter[0].gedrueckt === "false" && w.hash === hash0 && w.sw <= w.iw, `${breite} px: „Woche“ zeigt das Wochengitter (7 Tage, Tagwahl weg), „Woche“ gedrückt, Adresse unverändert (${w.hash}), kein Überlauf`, w);
    await zuTag(p);
    const t = await p.evaluate(messeAnsicht);
    ok(!t.woche && gleich(t.tage, ["2026-10-31"]) && t.hash === hash0, `${breite} px: „Tag“ zeigt wieder den Samstag 31.10.2026, Adresse unverändert`, t);
    // eine neue Adresse öffnet aus dem Wochengitter die Tagesansicht dieses Tages; „Heute“ lässt die Ansicht, wie sie ist
    await zuWoche(p);
    await p.click("#pb-heute");
    ok((await p.evaluate(messeAnsicht)).woche, `${breite} px: „Heute“ bleibt im Wochengitter`);
    await p.evaluate(() => { location.hash = "#2026-11-04"; });
    await p.waitForFunction(() => !!document.querySelector('#pb-ansicht section.pb-tag[data-datum="2026-11-04"]') && !document.querySelector("#pb-ansicht .pb-woche"), { timeout: 5000 });
    const a = await p.evaluate(messeAnsicht);
    ok(!a.woche && gleich(a.tage, ["2026-11-04"]) && a.umschalter[0].gedrueckt === "true", `${breite} px: die Adresse #2026-11-04 öffnet aus dem Wochengitter die Tagesansicht dieses Tages („Tag“ gedrückt)`, a);
    ok(log.fehler.length === 0 && log.konsole.length === 0 && log.fremd.length === 0, `${breite} px: dabei keine Fehler und keine fremden Anfragen`, { fehler: log.fehler, konsole: log.konsole, fremd: log.fremd });
    await p.close();
  }
  // die freien Flächen sind ruhig: keine Schraffur (Hintergrundbild), durchgezogene feine Linie; Training und Spiele fallen auf
  const { p } = await oeffne(browser, seite, { breite: 1440, hoehe: 900, hash: "2026-11-02" });
  const stil = await p.evaluate(() => {
    const freie = [...document.querySelectorAll('#pb-ansicht .pb-bl[data-typ="frei"]')], t = document.querySelector('#pb-ansicht .pb-bl[data-typ="training"]');
    const c = (e) => { const s = getComputedStyle(e); return { bild: s.backgroundImage, rand: `${s.borderTopStyle} ${s.borderTopWidth}` }; };
    // die Beschriftung „frei“ und „von–bis“ steht in jeder freien Fläche
    const beschriftet = freie.filter((b) => b.querySelector(".nm")?.textContent === "frei" && b.querySelector(".zt")?.textContent === `${b.dataset.von}–${b.dataset.bis}`).length;
    return { frei: c(freie[0]), training: c(t), anzahl: freie.length, beschriftet, beispiel: freie[0].innerText.replace(/\s+/g, " ") };
  });
  ok(stil.frei.bild === "none" && /^solid 1px$/.test(stil.frei.rand) && /^solid/.test(stil.training.rand), "freie Flächen: ohne Schraffur (kein Hintergrundbild), feine durchgezogene Linie (1 px); Training kräftiger", stil);
  ok(stil.anzahl > 0 && stil.beschriftet === stil.anzahl, `alle ${stil.anzahl} freien Flächen tragen die Beschriftung „frei“ und die Zeit (zum Beispiel „${stil.beispiel}“)`, stil);
  await p.close();
}

async function pruefeHalbfeld(browser, seite) {
  abschnitt(`13. ${seite.name}: halbes Feld (E, F, G) und ganzer Platz (D, A, Herren)`);
  const lesen = async (opt) => {
    const { p, log } = await oeffne(browser, seite, { breite: 1440, hoehe: 900, ...opt });
    return { p, log, tag: async (iso) => { await gehZu(p, iso); return (await p.evaluate(liesAnsicht)).tage[0]; } };
  };
  const spiele = (dom) => dom.bloecke.filter(istSpiel);
  const freie = (dom, spur) => dom.bloecke.filter((x) => x.typ === "frei" && x.teile === spur).map((x) => `${x.von}–${x.bis}`).sort();
  const zeigen = (text, gezeigt, erwartet, abw = []) => ok(gezeigt === erwartet && abw.length === 0, `${text}: erwartet ${erwartet} / gezeigt ${gezeigt}`, abw);

  if (STANDARD_JSON) {
    const x = await lesen({ hash: "2026-10-31" });
    const sa = await x.tag("2026-10-31");
    const finde = (t, von) => spiele(sa).find((b) => b.t === t && b.von === von);
    zeigen("Sa 31.10.2026, F1-Kinderfestival 10:00 (links)", finde("f1", "10:00")?.teile, "tor1,tor2");
    zeigen("Sa 31.10.2026, E2 11:30 (zuerst: links)", finde("e2", "11:30")?.teile, "tor1,tor2");
    zeigen("Sa 31.10.2026, E3 11:30 (E2 liegt links: rechts)", finde("e3", "11:30")?.teile, "tor3,tor4");
    zeigen("Sa 31.10.2026, E1 12:30 (Gleichstand: links)", finde("e1", "12:30")?.teile, "tor1,tor2");
    zeigen("Sa 31.10.2026, freie Zeiten Tor 3 (andere Hälfte)", freie(sa, "tor3").join(", "), "09:00–11:30, 13:00–18:00");
    zeigen("Sa 31.10.2026, freie Zeiten Tor 4 (andere Hälfte)", freie(sa, "tor4").join(", "), "09:00–11:30, 13:00–18:00");
    zeigen("Sa 31.10.2026, freie Zeiten Tor 1", freie(sa, "tor1").join(", "), "09:00–10:00, 14:00–18:00");
    zeigen("Sa 31.10.2026, freie Zeiten Tor 2", freie(sa, "tor2").join(", "), "09:00–10:00, 14:00–18:00");
    zeigen("Sa 31.10.2026, Käfig und Court", `${freie(sa, "kaefig")} ${freie(sa, "court")}`, "09:00–18:00 09:00–18:00");
    ok(spiele(sa).filter((b) => /\(halbes Feld\)/.test(b.label)).length === 4 && spiele(sa).every((b) => /halbes Feld/.test(b.titel)), "Sa 31.10.2026: aria-label und title der vier Spiele nennen „halbes Feld“ (z. B. „" + (finde("e3", "11:30")?.label ?? "?") + "“)");
    const so = await x.tag("2026-11-01");
    const ganzSo = ["d3 10:00", "d2 11:30", "d1 13:00", "d2 14:30"].map((k) => { const [t, von] = k.split(" "); return spiele(so).find((b) => b.t === t && b.von === von)?.teile; });
    zeigen("So 01.11.2026, D3 10:00, D2 11:30, D1 13:00, D2 14:30 (ganzer Platz)", ganzSo.join(" "), Array(4).fill("tor1,tor2,tor3,tor4").join(" "));
    zeigen("So 01.11.2026, E2 16:00 neben dem ganzen Platz (D2 bis 16:15 belegt beide Hälften gleich: links)", spiele(so).find((b) => b.t === "e2")?.teile, "tor1,tor2");
    zeigen("So 01.11.2026, freie Zeiten Tor 3 und Tor 4 (rechts frei ab 16:15)", `${freie(so, "tor3")} ${freie(so, "tor4")}`, "09:00–10:00,16:15–18:00 09:00–10:00,16:15–18:00");
    ok(spiele(so).filter((b) => b.teile === "tor1,tor2,tor3,tor4").every((b) => !/halbes Feld/.test(b.label)), "So 01.11.2026: ganze Plätze nennen kein „halbes Feld“ in der Beschriftung");
    await x.p.close();
    // ein Spiel ohne „feld“ (E2 am 31.10.) verhält sich wie „ganz“, die anderen rechnen mit ihm
    const kopie = JSON.parse(JSON_TEXT);
    const e2 = kopie.spiele.find((s) => s.d === "2026-10-31" && s.t === "e2");
    delete e2.feld;
    const y = await lesen({ hash: "2026-10-31", json: { daten: kopie } });
    const sa2 = await y.tag("2026-10-31");
    const f2 = (t, von) => spiele(sa2).find((b) => b.t === t && b.von === von)?.teile;
    zeigen("Sa 31.10.2026 mit E2 ohne feld: E2 11:30 (ganzer Platz)", f2("e2", "11:30"), "tor1,tor2,tor3,tor4");
    zeigen("… E3 11:30 (E2 belegt beide Hälften gleich: Gleichstand, links)", f2("e3", "11:30"), "tor1,tor2");
    zeigen("… E1 12:30 (links E2 und E3, rechts nur E2: rechts)", f2("e1", "12:30"), "tor3,tor4");
    ok(vergleicheTag(sa2, baueOrakel(kopie).tag(baueOrakel(kopie).nr("2026-10-31"))).length === 0, "… und alles wie im Orakel (Einträge, freie Zeiten)");
    await y.p.close();
  }

  // Datei ohne „feld“ (ältere Datei): jedes Heimspiel auf unserem Platz ist ein ganzer Platz
  const alt = JSON.parse(JSON_TEXT);
  for (const s of alt.spiele) delete s.feld;
  const tageMitSpielen = [...new Set(alt.spiele.filter((s) => s.ort === "u").map((s) => s.d))].slice(0, 12);
  const z = await lesen({ hash: tageMitSpielen[0], json: { daten: alt } });
  const orAlt = baueOrakel(alt), abwAlt = [];
  let anzahlSpiele = 0;
  for (const iso of tageMitSpielen) {
    const dom = await z.tag(iso);
    anzahlSpiele += spiele(dom).length;
    abwAlt.push(...vergleicheTag(dom, orAlt.tag(orAlt.nr(iso))));
    for (const b of spiele(dom)) if (b.teile !== "tor1,tor2,tor3,tor4" || /halbes Feld/.test(b.label)) abwAlt.push(`${iso} ${b.t} ${b.von}: ${b.teile}`);
  }
  ok(abwAlt.length === 0 && anzahlSpiele > 0, `Datei ohne „feld“: alle ${anzahlSpiele} Heimspiele an ${tageMitSpielen.length} Tagen zeigen den ganzen Platz (tor1–tor4), keines „halbes Feld“`, abwAlt.slice(0, 4));
  await z.p.close();

  // Sonderfälle mit erfundenen Spielen (feste Werte, von Hand gerechnet)
  const sz = baueSonderfaelle(DATEN);
  if (!sz) { ok(false, "Sonderfälle: kein geeigneter Samstag mit Montag in der Datei oder Mannschaften fehlen"); return; }
  const r = await sonderfaelleAnsehen(browser, seite, sz);
  for (const zeile of r.zeilen) ok(zeile.ok, zeile.text);
  ok(r.abw.length === 0, `Sonderfälle ${sz.tage[0].name} und ${sz.tage[1].name}: feste Werte und Rechnung des Orakels stimmen überein, keine Fehler`, r.abw.slice(0, 4));
}

// Mutationsproben: die gebaute Seite wird im Speicher verändert; die genannte Probe muss rot werden (Sonderfälle: Platzhälfte und Reihenfolge,
// Standardansicht, Legende, Lesbarkeit). Die Anker müssen genau einmal im Text der Seite stehen, sonst gilt die Probe als nicht anwendbar (Fehler).
const MUTATIONEN = [
  { name: "immer links", probe: "Sonderfälle", anker: 'return l < r ? "links" : "rechts";', ersatz: 'return "links";' },
  { name: "feld ignorieren", probe: "Sonderfälle", anker: 's.feld === "halb"', ersatz: "false" },
  { name: "Standard Woche", probe: "Standardansicht", anker: 'ansicht: "tag" }', ersatz: 'ansicht: "woche" }' },
  { name: "Legende ohne Feldteil", probe: "Legende", anker: "Heimspiel auf unserem Platz (Dauer und Feldteil geschätzt)", ersatz: "Heimspiel auf unserem Platz (Dauer geschätzt)" },
  { name: "Gleichstand rechts statt links", probe: "Sonderfälle", anker: 'var HALBFELD_ZUERST = "links";', ersatz: 'var HALBFELD_ZUERST = "rechts";' },
  { name: "Spielnummer als Zahl sortieren", probe: "Sonderfälle", anker: "return x < y ? -1 : (x > y ? 1 : 0);", ersatz: "return (parseFloat(x) || 0) - (parseFloat(y) || 0);" },
  { name: "Mannschaft nicht berücksichtigen", probe: "Sonderfälle", anker: "d = MA[a.t].rang - MA[b.t].rang;", ersatz: "d = 0;" },
  { name: "Training und belegt nicht mitzählen", probe: "Sonderfälle", anker: "if (b.lanes.indexOf(sp) >= 0) summe +=", ersatz: 'if (b.lanes.indexOf(sp) >= 0 && (b.typ === "spiel" || b.typ === "festival")) summe +=' },
  { name: "kleine Schrift in den Blöcken (11 px)", probe: "Lesbarkeit", anker: ".pb-tagansicht .pb-bl .nm { font-size: .9375rem; }", ersatz: ".pb-tagansicht .pb-bl .nm { font-size: .6875rem; }" },
  { name: "Tagesansicht ohne Breitenbegrenzung", probe: "Lesbarkeit", anker: ".pb-tagansicht { max-width: 1040px; }", ersatz: ".pb-tagansicht { max-width: none; }" },
  { name: "gedrehte Spurnamen", probe: "Lesbarkeit", anker: ".pb-tagansicht .pb-lk { font-size: 1rem; }", ersatz: ".pb-tagansicht .pb-lk { font-size: 1rem; } .pb-tagansicht .pb-lk span { writing-mode: vertical-lr; }" },
  { name: "freie Flächen wieder schraffiert und gestrichelt", probe: "Lesbarkeit", anker: "border: 1px solid var(--pb-fr-rand);", ersatz: "border: 1.5px dashed var(--pb-fr-rand); background-image: repeating-linear-gradient(-45deg, transparent 0 6px, rgba(42, 59, 221, .16) 6px 7px);" },
];
async function pruefeMutationen(browser) {
  abschnitt("14. Mutationsproben (die gebaute Seite wird im Speicher verändert, der Test muss rot werden)");
  const seite = SEITEN.web;
  const original = readFileSync(seite.datei, "utf8");
  const sz = baueSonderfaelle(DATEN);
  if (!sz) { ok(false, "Mutationsproben: keine Sonderfälle möglich"); return; }
  const proben = {
    "Sonderfälle": async (x) => (await sonderfaelleAnsehen(browser, x, sz)).abw,
    "Standardansicht": (x) => standardAbweichungen(browser, x, [1440]),
    "Legende": (x) => legendeAbweichungen(browser, x),
    "Lesbarkeit": (x) => lesbarkeitAbweichungen(browser, x),
  };
  for (const [name, f] of Object.entries(proben)) {
    const abw = await f(seite);
    ok(abw.length === 0, `Kontrolle: die unveränderte Seite besteht die Probe „${name}“`, abw.slice(0, 3));
  }
  for (const m of MUTATIONEN) {
    const vorkommen = original.split(m.anker).length - 1;
    if (vorkommen !== 1) { ok(false, `Mutation „${m.name}“ nicht anwendbar: der Anker steht ${vorkommen}× in der Seite (erwartet genau 1×)`, m.anker); continue; }
    const abw = await proben[m.probe]({ ...seite, html: original.replace(m.anker, () => m.ersatz) });
    ok(abw.length > 0, `Mutation „${m.name}“ wird erkannt: Probe „${m.probe}“ ist rot (${abw.length} Abweichung${abw.length === 1 ? "" : "en"})`, "der Test hat die Veränderung nicht bemerkt");
    if (abw.length) info(`   zum Beispiel: ${abw[0].slice(0, 150)}`);
  }
}

// ---------- Ablauf ----------

console.log(`Test „Platzbelegung“ – Belegung aus ${path.relative(ROOT, JSON_DATEI)}${STANDARD_JSON ? " (Standard)" : ""}, erzeugt ${DATEN.erzeugt}, Plan ${DATEN.stand.plan}, Spiele ${DATEN.stand.spiele}`);
console.log(`Seiten: ${path.relative(ROOT, SEITEN.web.datei)} und ${path.relative(ROOT, SEITEN.app.datei)}; Belegung unter ${JSON_URL}`);
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--hide-scrollbars", "--force-device-scale-factor=1"] });
try {
  for (const key of ["web", "app"]) {
    const s = SEITEN[key];
    console.log(`\n######## ${s.name} (${s.url})`);
    await pruefeLaden(browser, s);
    await pruefeWochen(browser, s);
    await pruefeTagesansicht(browser, s, 390);
    await pruefeTagesansicht(browser, s, 1440, true);
    await pruefeOeffentlich(browser, s);
    await pruefeDialog(browser, s, 390);
    await pruefeDialog(browser, s, 1280);
    await pruefeFehlerfaelle(browser, s);
    await pruefeGroessen(browser, s);
    await pruefeDesktop(browser, s);
    await pruefeHalbfeld(browser, s);
    await pruefeBedienung(browser, s);
    await pruefeAxe(browser, s);
  }
  await pruefeLinks(browser);
  await pruefeMutationen(browser);
  if (FOTOS) await fotos(browser);
} finally {
  await browser.close();
}

const fehler = ergebnisse.filter((e) => !e[0]);
console.log(`\n${ergebnisse.length} Prüfungen, ${fehler.length} Fehler`);
if (fehler.length) { for (const f of fehler) console.log(` - ${f[1]}`); process.exit(1); }
console.log("platzbelegung-test: alle Prüfungen bestanden.");
