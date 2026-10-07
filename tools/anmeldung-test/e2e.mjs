#!/usr/bin/env node
// Ende-zu-Ende-Test des Anmelde-Assistenten (Arbeitspaket AP-4).
//
// Baut nicht selbst: Zuerst bauen (sh tools/cache/bau-sperre.sh build). Der Test
// startet einen kleinen statischen Server auf docs/ (freier Port, nie 4173,
// siehe testserver.mjs) und steuert Chrome (puppeteer-core, headless).
// Alle Teile sind echt (regeln.js, de-regeln.js, pdf.js, Formulardaten, Übersetzungen).
// Attrappen aus tools/anmeldung-test/attrappen/ gibt es nur noch per Schalter
// (ANM_ATTRAPPEN=pdf,ar,regeln,de-regeln,formulare); fehlt eine echte Datei, bricht
// der Test mit einer klaren Meldung ab.
//
// Geprüft wird:
//   - Einfache Sprache in den Texten (kein Satz über 12 Wörter, keine
//     Abkürzungen), vollständige Textschlüssel, alle 27 Seiten vorhanden
//   - keine Speicherung (localStorage, Cookies …) und keine Anfrage an fremde Hosts
//   - alle 5 Beispiel-Profile per Knopf laden und bis "fertig" durchklicken,
//     mobil (390 x 844) und am Rechner (1440 x 900)
//   - 3 Personen komplett per echter Eingabe (Tippen, Klicken, Unterschrift mit
//     Maus und Touch, Fotos hochladen) – mit Datei, Foto, Unterschriften im PDF
//   - Zurück/Vorwärts, Fehlermeldungen, Sprachwechsel (Arabisch, rechts nach
//     links; fehlende Sprachdatei), Hilfe, Fokus, Tab-Reihenfolge, Tippflächen
//   - axe-core auf jeder Seite (keine Verstöße "critical" und "serious")
//   - Bilder: Verkleinern, EXIF entfernen, Spielerfoto 3:4, Fehlermeldungen
//   - PDF je Beispiel (echtes pdf.js): erzeugt, Seitenzahl, Titel, Dateiname nach dateiname(),
//     Name im Text, Unterschriftsbild auf Seite 2 des Aufnahmeantrags; Läufe mit
//     unterschriftWeg = bildschirm und = papier (poppler: pdfinfo, pdftotext, pdfimages)
//   - Satzung (Haken, Link), getrennt lebende Eltern, Namen in lateinischer Schrift,
//     Sonderzeichen bis ins PDF, Karneval (Abholung, Heimweg), Attest im Unterschriftenplan
//   - Runde 4: lateinische Schrift in allen Freitextfeldern, die ins PDF gehen (Abdeckung aller
//     Textfelder im Quelltext und je Feld ein Fall im Browser), Knopf "Vorführung" im kompakten Kopf
//     (Vereinssicht und Beispiele auf jedem Schritt), ein einziger Kasten für getrennt lebende Eltern,
//     Feldname vor jeder Meldung in der Fehlerliste
//   - N-A2 (07.10.2026): Sprachwahl ganz oben im ersten Bildschirm (vier Sprachen in eigener Schrift, vor Überschrift und Erklärtext),
//     App-Modus ?app=1 bei 390 x 844 (Rahmen der Begleitseite weg, Hinweis und Link „Im Browser öffnen“ ohne ?app=1, dieselben Schritte
//     bis „fertig“, Fehler beim Speichern und Teilen abgefangen), „Diese Unterschrift gilt für:“ als Liste, kein BIC-Feld, Arabisch
//     (Entwurfsband rechts, Rufnummer im Hilfe-Dialog als LTR-Block, Prüfseite ohne <bdi> um den ganzen Wert), Beitragsgruppen und
//     Übungszeiten aus den Texten der Sprache (mit abgefangenen englischen Wörterbüchern)
//   - Screenshots je Seite nach tools/cache/anmeldung-test/e2e/
//
// Aufruf: node tools/anmeldung-test/e2e.mjs [--ohne-desktop] [--nur-sprache] [--nur=pruefeKarnevalUhrzeit,…]
//         (ANM_ATTRAPPEN=pdf erzwingt die Attrappe des PDF-Bausteins, auch wenn assets/js/anmeldung/pdf.js da ist)
// Ausgabe: eine Zeile je Prüfung, am Ende Zusammenfassung; Exit 0 nur, wenn alles bestanden ist.

import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import puppeteer from "puppeteer-core";
import { starteTestserver } from "./testserver.mjs";
import { pruefeEinfacheSprache, fehlendeSchluessel, ladeWoerterbuch } from "./sprache-check.mjs";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const AXE = fs.readFileSync(path.join(ROOT, "node_modules", "axe-core", "axe.min.js"), "utf8");
// Mit --nur=<Name,Name> laufen nur die genannten Einzelprüfungen (siehe einzelpruefungen()), zum Beispiel
// --nur=pruefeKarnevalUhrzeit. Das schnelle Prüfen einer Änderung; die Ausgabe liegt dann in e2e-nur/.
const NUR = (process.argv.find((a) => a.startsWith("--nur=")) || "").slice("--nur=".length).split(",").filter(Boolean);
const AUSGABE = path.join(ROOT, "tools", "cache", "anmeldung-test", NUR.length ? "e2e-nur" : "e2e");
const DATEIEN = path.join(AUSGABE, "dateien");
const HEUTE = "2026-09-29";
const OHNE_DESKTOP = process.argv.includes("--ohne-desktop");
const NUR_SPRACHE = process.argv.includes("--nur-sprache");

// Die 27 Schritte aus SCHNITTSTELLEN Abschnitt 4.
const SCHRITTE = [
  "start", "wer", "name", "geburt", "abteilung", "mannschaft", "spielen", "spielerpass", "alter_verein", "abmeldung",
  "pass", "ausland", "wohnen", "sorge", "besonderes", "karneval", "kontakt", "beitrag", "leistungen", "zahlung",
  "einwilligungen", "notfall", "spielerfoto", "nachweise", "unterschriften", "pruefen", "fertig",
];

const MOBIL = { name: "390x844", breite: 390, hoehe: 844, mobil: true };
const DESKTOP = { name: "1440x900", breite: 1440, hoehe: 900, mobil: false };

// ---------- Ergebnisse ----------

const protokoll = { pruefungen: [], profile: [], axe: [], screenshots: 0, hosts: new Set(), textFehlt: new Set() };
// Bereits fotografierte Seiten je Bildschirmgröße (über alle Läufe hinweg).
const GESEHEN = { "390x844": new Set(), "1440x900": new Set() };
const gesehenFuer = (vp) => GESEHEN[vp.name];
// Schritte, von denen schon ein Bildschirmfoto des ersten Bildschirms (nur sichtbare Fläche) existiert.
const ERSTE_BILDER = new Set();
// Heruntergeladene PDFs der Beispiel-Profile ("<id>|<Größe>"), zum Vergleich mit den Läufen auf Papier.
const PDF_ERGEBNISSE = new Map();
let fehlerAnzahl = 0;

function ok(name, bedingung, detail) {
  protokoll.pruefungen.push({ name, ok: !!bedingung, detail: detail || "" });
  if (!bedingung) fehlerAnzahl++;
  console.log((bedingung ? "OK      " : "FEHLER  ") + name + (detail ? " – " + detail : ""));
  return !!bedingung;
}

function info(text) {
  console.log("        " + text);
}

const warte = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- Hilfen für die Antworten ----------

function hole(objekt, pfad) {
  let x = objekt;
  for (const teil of String(pfad).split(".")) {
    if (x === null || x === undefined) return undefined;
    x = x[teil];
  }
  return x;
}

// ---------- Testdateien ----------

async function erzeugeTestdateien(browser) {
  fs.mkdirSync(DATEIEN, { recursive: true });
  const seite = await browser.newPage();
  const bilderDatei = async (name, breite, hoehe, text) => {
    const daten = await seite.evaluate(
      (b, h, t) => {
        const c = document.createElement("canvas");
        c.width = b;
        c.height = h;
        const x = c.getContext("2d");
        const g = x.createLinearGradient(0, 0, b, h);
        g.addColorStop(0, "#1f2dbe");
        g.addColorStop(1, "#e4e7fa");
        x.fillStyle = g;
        x.fillRect(0, 0, b, h);
        x.fillStyle = "#ffffff";
        x.font = "bold " + Math.round(h / 8) + "px sans-serif";
        x.fillText(t, b / 20, h / 2);
        x.strokeStyle = "#000000";
        x.lineWidth = 6;
        x.strokeRect(3, 3, b - 6, h - 6);
        return c.toDataURL("image/jpeg", 0.92).split(",")[1];
      },
      breite,
      hoehe,
      text
    );
    return Buffer.from(daten, "base64");
  };
  // JPEG mit Kamera-Zusatzdaten (EXIF, angeblicher Standort) – der Assistent muss sie entfernen.
  const mitExif = (jpeg) => {
    const inhalt = Buffer.concat([Buffer.from("Exif\0\0", "binary"), Buffer.from("GPS-TEST-MARKER 48.137 11.575", "binary")]);
    const laenge = Buffer.alloc(2);
    laenge.writeUInt16BE(inhalt.length + 2);
    return Buffer.concat([jpeg.subarray(0, 2), Buffer.from([0xff, 0xe1]), laenge, inhalt, jpeg.subarray(2)]);
  };
  const dateien = {};
  const schreibe = (name, inhalt) => {
    const pfad = path.join(DATEIEN, name);
    fs.writeFileSync(pfad, inhalt);
    dateien[name] = pfad;
  };
  schreibe("foto-1600x1200.jpg", mitExif(await bilderDatei("a", 1600, 1200, "Foto 1600x1200")));
  schreibe("foto-4000x3000.jpg", await bilderDatei("b", 4000, 3000, "Foto 4000x3000"));
  schreibe("foto-300x200.jpg", await bilderDatei("c", 300, 200, "klein"));
  schreibe("foto-500x700.jpg", await bilderDatei("d", 500, 700, "Hoch 500x700"));
  // 376 Pixel breit: kleinster erlaubter Ausschnitt 3:4 (mindestens 375 Pixel breit)
  schreibe("foto-376x502.jpg", await bilderDatei("e", 376, 502, "376x502"));
  await seite.close();
  const { PDFDocument } = require("pdf-lib");
  const pdf = await PDFDocument.create();
  pdf.addPage([595, 842]).drawText("Testunterlage");
  schreibe("unterlage.pdf", Buffer.from(await pdf.save()));
  schreibe("kaputt.jpg", Buffer.from("das ist kein Bild, nur Text"));
  schreibe("bild.heic", Buffer.from("ftypheic-nur-zum-test"));
  schreibe("text.txt", Buffer.from("weder Bild noch PDF"));
  schreibe("gross.pdf", Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(11 * 1024 * 1024, 0x20)]));
  return dateien;
}

// ---------- Seite und Browser ----------

const UHR = `(() => {
  const feste = new Date("2026-09-29T10:00:00").getTime();
  const Echt = Date;
  class Uhr extends Echt {
    constructor(...a) { if (a.length === 0) super(feste); else super(...a); }
    static now() { return feste; }
  }
  window.Date = Uhr;
})();`;

// optionen: Text (Abfrage, zum Beispiel "?app=1") oder { abfrage, vorLaden(page) } – vorLaden läuft vor dem Laden der Seite
async function neueSeite(browser, server, vp, name, optionen) {
  const o = typeof optionen === "string" ? { abfrage: optionen } : optionen || {};
  const page = await browser.newPage();
  await page.setViewport({ width: vp.breite, height: vp.hoehe, deviceScaleFactor: 1, isMobile: vp.mobil, hasTouch: vp.mobil });
  await page.evaluateOnNewDocument(UHR);
  const st = { name, konsole: [], hosts: new Set(), antworten: [], erwartet404: 0, dialoge: 0 };
  page.on("console", (m) => {
    const t = m.text();
    if (m.type() === "error") {
      if (/Failed to load resource.*404/.test(t) && st.erwartet404 > 0) return;
      st.konsole.push("console.error: " + t);
    }
    if (m.type() === "warning" && /Text fehlt/.test(t)) protokoll.textFehlt.add(t);
  });
  page.on("pageerror", (e) => st.konsole.push("pageerror: " + e.message));
  page.on("request", (r) => {
    const u = r.url();
    if (/^https?:/.test(u)) {
      const host = new URL(u).host;
      st.hosts.add(host);
      protokoll.hosts.add(host);
    }
  });
  page.on("response", (r) => {
    if (r.status() >= 400) st.antworten.push(r.status() + " " + r.url());
  });
  page.on("dialog", (d) => {
    st.dialoge++;
    d.accept();
  });
  page.__st = st;
  if (o.vorLaden) await o.vorLaden(page);
  await page.goto(server.basis + "/anmeldung/" + (o.abfrage || ""), { waitUntil: "networkidle0" });
  await page.waitForSelector("#anmeldung[data-bereit]", { timeout: 10000 });
  return page;
}

// Beispiel per Knopf laden. Auf dem Handy ist der Werkzeugkasten zu; er wird zum
// Klicken geöffnet und danach wieder geschlossen (so sehen die Bildschirmfotos aus wie beim Nutzer).
async function ladeBeispielPerKnopf(page, id) {
  await page.$eval("[data-anm-werkzeuge]", (d) => (d.open = true));
  await page.click('[data-beispiel="' + id + '"]');
  await page.waitForFunction((t) => /Beispiel geladen/.test((document.querySelector(".anm-meldung") || {}).textContent || ""), { timeout: 4000 }, id).catch(() => {});
  if (page.viewport().isMobile) await page.$eval("[data-anm-werkzeuge]", (d) => (d.open = false));
}

async function stand(page) {
  return page.$eval("#anmeldung", (e) => ({ schritt: e.dataset.schritt, teil: e.dataset.teil }));
}

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

async function fehlerTexte(page) {
  return page.evaluate(() => {
    const box = document.querySelector("#anmeldung .anm-fehlerbox");
    if (!box || box.hidden) return [];
    return Array.from(box.querySelectorAll("li")).map((li) => li.textContent.trim());
  });
}

// Klickt "Weiter" und wartet auf die nächste Seite. Ergebnis: { gewechselt, fehler[] }
async function klickeWeiter(page, vorher) {
  const knopf = await page.$('#anmeldung [data-aktion="weiter"]');
  if (!knopf) return { gewechselt: false, fehler: ["kein Weiter-Knopf"] };
  await knopf.evaluate((e) => e.scrollIntoView({ block: "center" }));
  await knopf.click();
  await warteAufStand(page, vorher);
  const nachher = await stand(page);
  const fehler = await fehlerTexte(page);
  return { gewechselt: nachher.schritt !== vorher.schritt || nachher.teil !== vorher.teil, fehler };
}

// ---------- Prüfungen je Seite ----------

async function axePruefen(page, kennung) {
  if (await page.evaluate(() => typeof window.axe === "undefined")) await page.evaluate(AXE);
  const verstoesse = await page.evaluate(async () => {
    const r = await window.axe.run(document, { resultTypes: ["violations"] });
    return r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, ziele: v.nodes.slice(0, 3).map((n) => n.target.join(" ")) }));
  });
  const schwer = verstoesse.filter((v) => v.impact === "critical" || v.impact === "serious");
  protokoll.axe.push({ seite: kennung, anzahl: verstoesse.length, schwer: schwer.length });
  if (schwer.length) ok("axe " + kennung, false, schwer.map((v) => v.impact + " " + v.id + " " + v.ziele.join(" | ")).join("; "));
  return schwer.length === 0;
}

async function kleineTippflaechen(page) {
  return page.evaluate(() => {
    const aus = [];
    const waehler = [
      "#anmeldung button", "#anmeldung a[href]", "#anmeldung select", "#anmeldung textarea", "#anmeldung summary",
      "#anmeldung input:not([type=radio]):not([type=checkbox]):not([type=file])", "#anmeldung label.anm-karte", "#anmeldung label.anm-datei",
    ].join(", ");
    for (const el of document.querySelectorAll(waehler)) {
      if (el.closest("[hidden]") || el.closest("dialog:not([open])")) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      if (el.matches("a") && el.closest("p, li")) continue;
      if (r.height < 44 || r.width < 44) aus.push(el.tagName.toLowerCase() + "." + (el.className || "") + " " + Math.round(r.width) + "x" + Math.round(r.height) + " '" + (el.textContent || "").trim().slice(0, 30) + "'");
    }
    return aus;
  });
}

// ---------- Eingabe ----------

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
      let pfad = f.pfad;
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
    // Weitere Staatsangehörigkeiten: Zeilen hinzufügen, solange die Antworten mehr enthalten.
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

// ---------- Unterschrift ----------

function zickzack(box) {
  const punkte = [];
  for (let i = 0; i <= 14; i++) punkte.push({ x: box.x + 24 + (i * (box.width - 48)) / 14, y: box.y + box.height * (0.45 + 0.25 * Math.sin(i * 1.3)) });
  return punkte;
}

async function zeichne(page, canvas, touch) {
  await canvas.evaluate((e) => e.scrollIntoView({ block: "center" }));
  const box = await canvas.boundingBox();
  const p = zickzack(box);
  if (touch) {
    const finger = await page.touchscreen.touchStart(p[0].x, p[0].y);
    for (const q of p.slice(1)) await finger.move(q.x, q.y);
    await finger.end();
  } else {
    await page.mouse.move(p[0].x, p[0].y);
    await page.mouse.down();
    for (const q of p.slice(1)) await page.mouse.move(q.x, q.y, { steps: 2 });
    await page.mouse.up();
  }
}

// Satzung: Am Bildschirm ist der Haken Pflicht. Klick auf die Beschriftung, wie eine Familie es tut.
async function haekchenSatzung(page) {
  const haken = await page.$('#anmeldung input[data-pfad="satzung"]');
  if (haken && !(await haken.evaluate((e) => e.checked))) {
    const id = await haken.evaluate((e) => e.id);
    await page.click('#anmeldung label[for="' + id + '"]');
  }
}

// ctx.papier: "Ich unterschreibe alles auf Papier" wählen und nichts zeichnen (ctx.satzungPapier:
// den freiwilligen Haken trotzdem setzen). ctx.ohneSatzung: den Haken nicht setzen.
async function unterschreiben(page, ctx) {
  if (ctx.papier) {
    const id = await page.$eval('#anmeldung input[data-pfad="unterschriftWeg"][data-wert="papier"]', (e) => e.id);
    await page.click('#anmeldung label[for="' + id + '"]');
    if (ctx.satzungPapier === true) await haekchenSatzung(page);
    ctx.unterschriftFelder = [];
    ctx.unterschriftGezeichnetIn = [];
    return;
  }
  if (!ctx.ohneSatzung) await haekchenSatzung(page);
  const felder = await page.$$eval("#anmeldung .anm-unterschrift", (l) => l.map((e) => e.getAttribute("data-unterschrift")));
  // Die zweite Elternunterschrift ist freiwillig: in einem Profil bleibt sie absichtlich leer.
  const gezeichnet = felder.filter((w) => !(ctx.ohneZweite && w === "sorgeberechtigte_2"));
  for (const wer of gezeichnet) {
    const canvas = await page.$('#anmeldung .anm-unterschrift[data-unterschrift="' + wer + '"] canvas');
    await zeichne(page, canvas, ctx.touch);
  }
  await page.waitForFunction(
    (n) => document.querySelectorAll("#anmeldung .anm-unterschrift--fertig").length >= n,
    { timeout: 5000 },
    gezeichnet.length
  ).catch(() => {});
  ctx.unterschriftenGezeichnet = (ctx.unterschriftenGezeichnet || 0) + gezeichnet.length;
  ctx.unterschriftFelder = felder;
  ctx.unterschriftGezeichnetIn = gezeichnet;
}

// Nachweise: "Habe ich", dann Foto oder PDF hochladen.
async function nachweiseHochladen(page, ctx) {
  const ids = await page.$$eval("#anmeldung section[data-unterlage]", (l) => l.map((e) => e.getAttribute("data-unterlage")));
  let n = 0;
  for (const uid of ids) {
    const abschnitt = '#anmeldung section[data-unterlage="' + uid + '"]';
    const eingabe = await page.$(abschnitt + ' input[data-pfad="nachweise.' + uid + '"][data-wert="habe"]');
    const id = await eingabe.evaluate((e) => e.id);
    await page.click('label[for="' + id + '"]');
    const art = n % 2 === 0 ? "nachweis-foto" : "nachweis-datei";
    const datei = n % 2 === 0 ? ctx.dateien["foto-1600x1200.jpg"] : ctx.dateien["unterlage.pdf"];
    const feld = await page.$(abschnitt + ' input[data-aktion="' + art + '"]');
    await feld.uploadFile(datei);
    await page.waitForSelector(abschnitt + " .anm-dateien__eintrag", { timeout: 8000 });
    n++;
  }
  ctx.nachweiseHochgeladen = ids.length;
}

async function spielerfotoHochladen(page, ctx) {
  const weg = ctx.profil.spielerfoto && ctx.profil.spielerfoto.weg;
  if (weg !== "foto" && weg !== "datei") return;
  const feld = await page.$('#anmeldung input[data-aktion="spielerfoto-' + (weg === "foto" ? "machen" : "waehlen") + '"]');
  await feld.uploadFile(ctx.dateien["foto-1600x1200.jpg"]);
  await page.waitForSelector("#anmeldung .anm-vorschau-foto:not([hidden])", { timeout: 8000 });
  ctx.spielerfotoHochgeladen = true;
}

// ---------- Durchlauf eines Profils ----------

async function laufe(page, ctx) {
  const besucht = [];
  let vorherige = null;
  for (let i = 0; i < 160; i++) {
    const s = await stand(page);
    const kennung = s.schritt + "/" + s.teil;
    besucht.push(kennung);
    await seitenPruefungen(page, ctx, s, kennung, vorherige !== null);
    if (vorherige === null) await kopfPruefen(page, ctx, s); // Anfang des Laufs ("start")
    if (s.schritt === "pruefen") ctx.pruefenDom = await hinweiseImDom(page);
    if (ctx.proSeite) await ctx.proSeite(page, s, kennung);
    if (s.schritt === "fertig") break;
    if (ctx.modus === "eingabe") await fuelleSeite(page, ctx.profil);
    if (s.schritt === "unterschriften") await unterschreiben(page, ctx);
    if (s.schritt === "spielerfoto" && ctx.modus === "eingabe") await spielerfotoHochladen(page, ctx);
    if (s.schritt === "nachweise" && ctx.modus === "eingabe" && ctx.nachweise) await nachweiseHochladen(page, ctx);
    if (ctx.vorWeiter) await ctx.vorWeiter(page, s, ctx); // z. B. Namen mit Sonderzeichen eintippen
    vorherige = kennung;
    const r = await klickeWeiter(page, s);
    if (r.fehler.length) {
      ok(ctx.name + ": Seite " + kennung + " lässt sich verlassen", false, "Fehlermeldung: " + r.fehler.join(" | "));
      await page.screenshot({ path: path.join(AUSGABE, ctx.vp.name, "FEHLER-" + ctx.name + "-" + s.schritt + "-" + s.teil + ".png"), fullPage: true });
      return { besucht, ende: "fehler" };
    }
    if (!r.gewechselt) {
      ok(ctx.name + ": Weiter auf " + kennung + " führt zur nächsten Seite", false, "Seite blieb gleich");
      return { besucht, ende: "haengt" };
    }
    const nachher = await stand(page);
    const fokusOk = await page.evaluate(() => document.activeElement && document.activeElement.id === "anm-titel");
    if (!fokusOk) ctx.fokusFehler.push(kennung + " → " + nachher.schritt + "/" + nachher.teil);
    await kopfPruefen(page, ctx, nachher);
  }
  return { besucht, ende: "fertig" };
}

// Seitenkopf über dem Assistenten: voll auf "start" und "fertig", kompakt bei allen
// Fragen. Bei 390 x 844 liegt die Frage (h2) auf jedem Schritt im ersten Bildschirm.
async function kopfZustand(page) {
  return page.evaluate(() => {
    const sichtbar = (sel) => {
      const e = document.querySelector(sel);
      return !!e && e.getClientRects().length > 0;
    };
    const h1 = document.querySelector("h1");
    const band = document.querySelector("[data-anm-band]");
    return {
      h1Anzahl: document.querySelectorAll("h1").length,
      h1Sichtbar: !!h1 && h1.getClientRects().length > 0,
      h1Hoehe: h1 ? Math.round(h1.getBoundingClientRect().height) : 0,
      h1Schrift: h1 ? parseFloat(getComputedStyle(h1).fontSize) : 0,
      lead: sichtbar(".seitenkopf__lead"),
      werkzeuge: sichtbar(".anm-werkzeugkasten"),
      vorfuehrKnopf: sichtbar("[data-anm-vorfuehrung]"),
      konzeptLink: sichtbar(".anm-vorfuehren .meta a"),
      bandText: band ? band.innerText.replace(/\s+/g, " ").trim() : "",
      bandHoehe: band ? Math.round(band.getBoundingClientRect().height) : 0,
      kompakt: !!document.querySelector("main.anm-kompakt"),
    };
  });
}

async function kopfPruefen(page, ctx, s) {
  const voll = s.schritt === "start" || s.schritt === "fertig";
  if (!ctx.kopfZustand.start && s.schritt === "start") ctx.kopfZustand.start = await kopfZustand(page);
  if (!voll && !ctx.kopfZustand.frage) ctx.kopfZustand.frage = await kopfZustand(page);
  if (s.schritt === "fertig") ctx.kopfZustand.fertig = await kopfZustand(page);
  if (!voll) {
    // Runde 4: Ab der ersten Frage steht der Knopf "Vorführung" im Kopf (zu), auf jeder Seite.
    const knopf = await page.evaluate(() => {
      const b = document.querySelector("[data-anm-vorfuehrung]");
      return { da: !!b && b.getClientRects().length > 0, zu: !!b && b.getAttribute("aria-expanded") === "false", kasten: !!document.querySelector(".anm-werkzeugkasten") && document.querySelector(".anm-werkzeugkasten").getClientRects().length > 0 };
    });
    const v = ctx.vorfuehrSeiten || (ctx.vorfuehrSeiten = { ok: 0, fehlt: [] });
    if (knopf.da && knopf.zu && !knopf.kasten) v.ok++;
    else v.fehlt.push(s.schritt + "/" + s.teil + " " + JSON.stringify(knopf));
    // Und er tut, was er soll: auf dieser Seite auf, Vereinssicht-Schalter und Beispiele sind da, wieder zu.
    // (Der Klick geschieht in der Seite selbst und verschiebt daher nichts im Bild.)
    const zyklus = await page.evaluate(() => {
      const b = document.querySelector("[data-anm-vorfuehrung]");
      const sichtbar = (e) => !!e && e.getClientRects().length > 0;
      const lage = () => ({ kasten: sichtbar(document.querySelector(".anm-werkzeugkasten")), schalter: sichtbar(document.querySelector("[data-anm-vereinssicht]")), beispiel: sichtbar(document.querySelector("[data-beispiel]")), expanded: b.getAttribute("aria-expanded") });
      b.click();
      const offen = lage();
      b.click();
      return { offen, zu: lage() };
    });
    const zy = ctx.vorfuehrZyklus || (ctx.vorfuehrZyklus = { ok: 0, fehlt: [] });
    if (zyklus.offen.kasten && zyklus.offen.schalter && zyklus.offen.beispiel && zyklus.offen.expanded === "true" && !zyklus.zu.kasten && zyklus.zu.expanded === "false") zy.ok++;
    else zy.fehlt.push(s.schritt + "/" + s.teil + " " + JSON.stringify(zyklus));
  }
  if (voll || ctx.vp.name !== MOBIL.name) return;
  const m = await page.evaluate(() => ({
    titel: Math.round(document.getElementById("anm-titel").getBoundingClientRect().top),
    kopf: Math.round(document.querySelector("#anmeldung .anm-kopf").getBoundingClientRect().top),
    hoehe: window.innerHeight,
  }));
  ctx.titelOben.push({ seite: s.schritt + "/" + s.teil, ...m });
  // Bildschirmfoto des ersten Bildschirms (nur die sichtbare Fläche), einmal je Schritt
  if ((s.schritt === "spielerpass" || s.schritt === "unterschriften") && !ERSTE_BILDER.has(s.schritt)) {
    ERSTE_BILDER.add(s.schritt);
    await page.screenshot({ path: path.join(AUSGABE, ctx.vp.name, "erster-bildschirm-" + s.schritt + ".png"), fullPage: false });
    protokoll.screenshots++;
  }
}

// ---------- Hinweis-Kästen: offen sichtbar oder im Aufklapper ----------

let regelnModul = null;
async function ladeRegeln() {
  if (!regelnModul) regelnModul = await import(pathToFileURL(path.join(ROOT, "assets", "js", "anmeldung", "regeln.js")).href);
  return regelnModul;
}

// Was die Seite an Hinweis-Kästen zeigt: offen (außerhalb des Aufklappers) und im Aufklapper.
async function hinweiseImDom(page) {
  return page.evaluate(() => {
    const alle = Array.from(document.querySelectorAll("#anmeldung .anm-hinweiskasten"));
    const imAufklapper = alle.filter((b) => b.closest("details.anm-weitere"));
    const offen = alle.filter((b) => !b.closest("details.anm-weitere"));
    const d = document.querySelector("#anmeldung details.anm-weitere");
    const art = (l) => l.map((b) => b.getAttribute("data-hinweis-art") || "?");
    const schluessel = (l) => l.map((b) => b.getAttribute("data-hinweis-key")).filter(Boolean);
    // Elemente in einem zugeklappten <details> haben in Chrome ein Kästchen, sind aber nicht sichtbar:
    // checkVisibility() unterscheidet das richtig, getClientRects() nicht.
    const zuSehen = (el) => (typeof el.checkVisibility === "function" ? el.checkVisibility() : el.getClientRects().length > 0);
    return {
      offenArten: art(offen),
      offenSchluessel: schluessel(offen),
      offenSichtbar: offen.filter(zuSehen).length,
      aufklapperArten: art(imAufklapper),
      aufklapperSchluessel: schluessel(imAufklapper),
      aufklapperAnzahl: imAufklapper.length,
      aufklapperVorhanden: !!d,
      aufklapperZu: d ? !d.open : null,
      aufklapperTitel: d ? d.querySelector("summary").textContent.replace(/[\u2066-\u2069]/g, "").trim() : null,
      aufklapperZahl: d ? Number(d.getAttribute("data-anzahl")) : null,
      inZuGesehen: imAufklapper.filter(zuSehen).length,
      ueberschriften: d ? Array.from(d.querySelectorAll("h3, h4")).map((x) => x.textContent.replace(/[\u2066-\u2069]/g, "").trim()) : [],
      vereinKaesten: d ? Array.from(d.querySelectorAll(".anm-weitere__gruppe .anm-hinweiskasten")).map((b) => b.getAttribute("data-hinweis-art")) : [],
    };
  });
}

// Auf 'pruefen' und 'fertig': offen nur Warnungen und Fristen, alles andere zugeklappt unter
// "Weitere Hinweise (n)", die Summe stimmt mit e.hinweise überein.
// `grenze`: höchste erlaubte Zahl offener Kästen (nur wo die Aufgabe eine nennt).
function hinweiseAuswerten(name, dom, e, grenze) {
  if (!dom || !e) return ok(name + ": Hinweise gemessen", false, "keine Messung");
  const gesamt = e.hinweise.length;
  const nurWichtig = dom.offenArten.every((x) => x === "warnung" || x === "frist");
  const uebrig = gesamt - dom.offenSchluessel.length;
  ok(
    name + ": offen stehen nur Warnungen und Fristen" + (grenze ? ", höchstens " + grenze + " Kästen" : ""),
    nurWichtig && (!grenze || dom.offenSichtbar <= grenze),
    dom.offenSichtbar + " offen: " + (dom.offenArten.join(", ") || "keiner")
  );
  const schluesselOk = new Set([...dom.offenSchluessel, ...dom.aufklapperSchluessel]).size === gesamt;
  ok(
    name + ": Aufklapper 'Weitere Hinweise (" + uebrig + ")' ist zu und enthält alle übrigen (Summe = " + gesamt + " Hinweise)",
    dom.aufklapperVorhanden && dom.aufklapperZu === true && dom.aufklapperTitel === "Weitere Hinweise (" + uebrig + ")" && dom.aufklapperZahl === uebrig && dom.aufklapperAnzahl === uebrig && dom.inZuGesehen === 0 && dom.offenSchluessel.length + dom.aufklapperSchluessel.length === gesamt && schluesselOk,
    "offen (mit Kennung) " + dom.offenSchluessel.length + " + Aufklapper " + dom.aufklapperAnzahl + " = " + (dom.offenSchluessel.length + dom.aufklapperAnzahl) + ", e.hinweise " + gesamt + "; Titel '" + dom.aufklapperTitel + "'"
  );
  const offenArt = e.hinweise.filter((x) => x.art === "offen").length;
  ok(
    name + ": 'offen'-Hinweise im Aufklapper unter der Überschrift 'Das klärt der Verein'",
    offenArt === 0 ? !dom.ueberschriften.includes("Das klärt der Verein") : dom.ueberschriften.includes("Das klärt der Verein") && dom.vereinKaesten.length === offenArt && dom.vereinKaesten.every((x) => x === "offen"),
    offenArt + " Hinweise der Art 'offen'; Überschriften: " + (dom.ueberschriften.join(" | ") || "keine")
  );
}

// Auswertung von kopfPruefen() für einen Lauf (Profil oder Eingabe).
function kopfAuswerten(name, ctx) {
  const z = ctx.kopfZustand;
  if (z.start && z.frage) {
    const st = z.start;
    const fr = z.frage;
    ok(name + ": Seitenkopf voll auf 'start' (Lead, Vorführ-Aufklapper, Konzept-Link, ganzes Band)", st.lead && st.werkzeuge && st.konzeptLink && /Es wird nichts gesendet/.test(st.bandText) && !st.kompakt, JSON.stringify({ lead: st.lead, werkzeuge: st.werkzeuge, konzeptLink: st.konzeptLink, band: st.bandText.slice(0, 40) }));
    ok(
      name + ": Seitenkopf kompakt ab der ersten Frage (h1 im Dokument, klein und einzeilig; ohne Lead, Aufklapper, Konzept-Link; Band als schmale Zeile)",
      fr.kompakt && fr.h1Anzahl === 1 && fr.h1Sichtbar && fr.h1Schrift <= 20 && fr.h1Hoehe <= 32 && !fr.lead && !fr.werkzeuge && !fr.konzeptLink && fr.bandText === "Entwurf – bitte keine echten Daten." && fr.bandHoehe <= 48,
      JSON.stringify({ h1: fr.h1Schrift + " px, " + fr.h1Hoehe + " hoch", lead: fr.lead, werkzeuge: fr.werkzeuge, konzeptLink: fr.konzeptLink, band: fr.bandText, bandHoehe: fr.bandHoehe })
    );
  }
  if (z.start && z.frage) {
    ok(name + ": Knopf 'Vorführung' fehlt auf 'start' (dort steht der Werkzeugkasten selbst) und steht ab der ersten Frage im Kopf", !z.start.vorfuehrKnopf && z.frage.vorfuehrKnopf, JSON.stringify({ start: z.start.vorfuehrKnopf, frage: z.frage.vorfuehrKnopf }));
  }
  if (ctx.vorfuehrSeiten) {
    const v = ctx.vorfuehrSeiten;
    ok(name + ": Knopf 'Vorführung' ist auf jeder der " + (v.ok + v.fehlt.length) + " Frageseiten da (zu, Werkzeugkasten verborgen)", v.fehlt.length === 0 && v.ok > 0, v.fehlt.slice(0, 3).join(" | ") || v.ok + " Seiten");
  }
  if (ctx.vorfuehrZyklus) {
    const y = ctx.vorfuehrZyklus;
    ok(name + ": auf jeder der " + (y.ok + y.fehlt.length) + " Frageseiten öffnet der Knopf 'Vorführung' den Werkzeugkasten (Vereinssicht-Schalter und Beispiele sichtbar) und schließt ihn wieder", y.fehlt.length === 0 && y.ok > 0, y.fehlt.slice(0, 2).join(" | ") || y.ok + " Seiten");
  }
  if (z.fertig) {
    const fe = z.fertig;
    ok(name + ": Seitenkopf auf 'fertig' wieder voll (ohne Knopf 'Vorführung', der Werkzeugkasten steht selbst da)", fe.lead && fe.werkzeuge && fe.konzeptLink && !fe.vorfuehrKnopf && /Es wird nichts gesendet/.test(fe.bandText) && !fe.kompakt, JSON.stringify({ lead: fe.lead, werkzeuge: fe.werkzeuge, konzeptLink: fe.konzeptLink, knopf: fe.vorfuehrKnopf }));
  }
  if (ctx.titelOben.length) {
    const hoechster = ctx.titelOben.reduce((a, b) => (b.titel > a.titel ? b : a));
    const kopfMax = ctx.titelOben.reduce((a, b) => (b.kopf > a.kopf ? b : a));
    ok(
      name + ": Frage (h2#anm-titel) liegt auf jedem Schritt im ersten Bildschirm (Oberkante < 450 px), Leiste Zurück/Sprache/Hilfe oben",
      ctx.titelOben.every((x) => x.titel >= 0 && x.titel < 450 && x.titel < x.hoehe) && ctx.titelOben.every((x) => x.kopf >= -1 && x.kopf < 200),
      ctx.titelOben.length + " Seiten; tiefste Oberkante " + hoechster.titel + " px (" + hoechster.seite + "), Leiste höchstens " + kopfMax.kopf + " px unter dem Rand (" + kopfMax.seite + ")"
    );
  }
}

async function seitenPruefungen(page, ctx, s, kennung, angekommen) {
  // Bildschirmfoto der ersten Ansicht je Seite und Bildschirmgröße
  const schluessel = ctx.vp.name + "|" + kennung;
  if (!ctx.gesehen.has(schluessel)) {
    ctx.gesehen.add(schluessel);
    const nr = String(ctx.gesehen.size).padStart(2, "0");
    fs.mkdirSync(path.join(AUSGABE, ctx.vp.name), { recursive: true });
    await page.screenshot({ path: path.join(AUSGABE, ctx.vp.name, nr + "-" + s.schritt + "-" + s.teil + ".png"), fullPage: true });
    protokoll.screenshots++;
    if (ctx.axeNeu !== false) await axePruefen(page, ctx.vp.name + " " + kennung);
  } else if (ctx.axeImmer) {
    await axePruefen(page, ctx.vp.name + " " + ctx.name + " " + kennung);
  }
  if (ctx.vp.mobil) {
    const breit = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, innen: window.innerWidth }));
    if (breit.scroll > breit.innen) ctx.querScroll.push(kennung + " (" + breit.scroll + " > " + breit.innen + ")");
    const klein = await kleineTippflaechen(page);
    for (const k of klein) ctx.kleineFlaechen.add(kennung + ": " + k);
  }
}

function neuerKontext(o) {
  return { fokusFehler: [], querScroll: [], kleineFlaechen: new Set(), titelOben: [], kopfZustand: {}, gesehen: o.gesehen, ...o };
}

// Ergebnis der Datei prüfen (nach "fertig")
async function ergebnisPruefen(page, ctx, dateien) {
  try {
    await page.waitForFunction(() => document.querySelector('#anmeldung [data-status="fertig"], #anmeldung [data-status="fehler"]'), { timeout: 25000 });
  } catch (e) {
    ok(ctx.name + ": Datei wird erstellt", false, "Zeitüberschreitung");
    return null;
  }
  const status = await page.$eval("#anmeldung [data-status]", (e) => e.getAttribute("data-status"));
  if (status !== "fertig") {
    const text = await page.$eval("#anmeldung", (e) => e.innerText.slice(0, 400));
    ok(ctx.name + ": Datei erstellt", false, text.replace(/\s+/g, " "));
    return null;
  }
  // Bildschirmfoto der fertigen Ergebnisseite (einmal je Bildschirmgröße)
  const zielFoto = path.join(AUSGABE, ctx.vp.name, "fertig-ergebnis.png");
  if (!fs.existsSync(zielFoto)) {
    fs.mkdirSync(path.dirname(zielFoto), { recursive: true });
    await page.screenshot({ path: zielFoto, fullPage: true });
    protokoll.screenshots++;
  }
  const daten = await page.evaluate(() => ({
    dateiname: (document.querySelector("#anmeldung [data-datei]") || {}).textContent || "",
    knoepfe: Array.from(document.querySelectorAll('#anmeldung .anm-ergebnis [data-aktion]')).filter((e) => !e.hidden).map((e) => e.getAttribute("data-aktion")),
    teileAnzeige: document.querySelectorAll("#anmeldung .anm-ergebnis > .anm-block > .anm-liste-punkte > li").length,
    teileTexte: Array.from(document.querySelectorAll("#anmeldung .anm-ergebnis > .anm-block > .anm-liste-punkte > li")).map((li) => li.textContent.replace(/\s+/g, " ").trim()),
    infoZeile: ((document.querySelector("#anmeldung .anm-ergebnis > .anm-hinweis") || {}).textContent || "").trim(),
    attrappe: window.__attrappePdf || null,
  }));
  return daten;
}


// ---------- Runde 3: Satzung, getrennte Eltern, lateinische Namen, Karneval, Attest ----------

// Prüfung, die zu AP-3 gehört und dort noch offen sein darf: sie steht im Bericht, macht den Lauf aber nicht rot.
function weich(name, bedingung, detail) {
  protokoll.pruefungen.push({ name, ok: true, weich: !bedingung, detail: detail || "" });
  console.log((bedingung ? "OK      " : "OFFEN   ") + name + (detail ? " – " + detail : ""));
  return !!bedingung;
}

// Feld leeren und tippen. Nicht per Dreifachklick: Steht eine Fehlerliste da, verschiebt sich die Seite
// zwischen den Klicks und der Klick trifft daneben.
async function tippe(page, selektor, text) {
  await page.$eval(selektor, (e) => {
    e.scrollIntoView({ block: "center" });
    e.focus();
    e.select();
  });
  await page.keyboard.press("Backspace");
  if (text) await page.keyboard.type(text);
}

async function klickeEtikett(page, eingabeSelektor) {
  const id = await page.$eval(eingabeSelektor, (e) => e.id);
  await page.click('#anmeldung label[for="' + id + '"]');
}

const sichtbarIn = (page, selektor) =>
  page.evaluate((s) => {
    const e = document.querySelector(s);
    return !!e && (typeof e.checkVisibility === "function" ? e.checkVisibility() : e.getClientRects().length > 0);
  }, selektor);

// Ohne Browser: Satzungs-Adresse, Zeichenmenge der PDF-Schrift, Regeln für lateinische Schrift.
async function statischeRunde3(server) {
  console.log("\n=== Runde 3: Satzung, lateinische Schrift (ohne Browser) ===");
  const downloads = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "downloads.json"), "utf8"));
  const eintrag = downloads.find((d) => /^satzung\b/i.test(String((d && d.titel) || "")));
  const url = server.konfig.verein.satzungUrl;
  ok("Satzung: konfig.verein.satzungUrl stammt aus data/downloads.json (Eintrag '" + (eintrag && eintrag.titel) + "')", !!eintrag && url === eintrag.datei && /^https:\/\//.test(url), url);
  ok("Satzung: nicht die Adresse aus dem Papier-Vordruck (www.sportfreunde04.de/satzung.pdf)", !/sportfreunde04\.de\/satzung/i.test(url), url);
  const quellen = [
    ...fs.readdirSync(path.join(ROOT, "assets", "js", "anmeldung")).filter((f) => f.endsWith(".js") && !["pdf.js", "regeln.js"].includes(f)).map((f) => path.join("assets", "js", "anmeldung", f)),
    path.join("assets", "js", "anmeldung", "texte", "de-oberflaeche.js"),
    path.join("src", "begleit", "anmeldung.mjs"),
  ];
  const fest = quellen.filter((f) => /Satzung_Aktuell|sportfreunde04\.de\/satzung/i.test(fs.readFileSync(path.join(ROOT, f), "utf8")));
  ok("Satzung: die Adresse steht nirgends fest im Code (" + quellen.length + " Dateien geprüft)", fest.length === 0, fest.join(", "));

  const zeichen = await import(pathToFileURL(path.join(ROOT, "assets", "js", "anmeldung", "zeichen.js")).href);
  const fontkit = require("@pdf-lib/fontkit");
  const font = fontkit.create(fs.readFileSync(path.join(ROOT, "assets", "fonts", "liberation-sans-regular.ttf")));
  const inSchrift = new Set(font.characterSet);
  const fehlt = font.characterSet.filter((c) => !zeichen.inSchrift(c));
  const zuviel = [];
  for (const [von, bis] of zeichen.SCHRIFT_ZEICHEN) for (let c = von; c <= bis; c++) if (!inSchrift.has(c)) zuviel.push(c);
  ok("Zeichen: die Kopie SCHRIFT_ZEICHEN stimmt mit der Zeichentabelle der PDF-Schrift überein (" + inSchrift.size + " Zeichen)", fehlt.length === 0 && zuviel.length === 0, "fehlt in der Kopie: " + fehlt.length + ", zu viel: " + zuviel.length);

  const gut = ["é", "ñ", "ç", "ş", "ğ", "ı", "İ", "ł", "ß", "ă", "ț", "Şükrü Yıldız", "Łukasz Wiśniewski", "José Muñoz-François", "Anne-Marie O'Brien", "D’Angelo", "Nguyễn Văn An", "Ștefan Ionescu", "Straße 12a", "Müller"];
  const schlecht = ["محمد علي", "Иван Петров", "Γιώργος", "王小明", "דוד", "Ali علي", "Ivаn"];
  const zuUnrecht = gut.filter((x) => !zeichen.pruefeLateinisch(x).ok);
  const zuUnrechtErlaubt = schlecht.filter((x) => zeichen.pruefeLateinisch(x).ok);
  ok("Zeichen: europäische Sonderzeichen sind erlaubt (é ñ ç ş ğ ı İ ł ß ă ț und ganze Namen)", zuUnrecht.length === 0, zuUnrecht.join(", ") || gut.length + " Fälle");
  ok("Zeichen: arabische, kyrillische, griechische, chinesische und hebräische Schrift wird abgewiesen", zuUnrechtErlaubt.length === 0, zuUnrechtErlaubt.join(", ") || schlecht.length + " Fälle");
  // Papiernamen: die Oberfläche führt keine eigenen mehr (SCHNITTSTELLEN Abschnitt 9); Begriff "Spielrecht"
  const wb = await ladeWoerterbuch();
  const alteNamen = ["Blatt für Abendauftritte", "Notfallbogen", "Datenschutz-Information", "Einwilligung zum Attest", "Lastschrift-Mandat", "Einwilligung für Fotos", "Liste der Familie\"", "Einverständnis für die Herren", "Einverständnis für das Mädchen"];
  // Ausnahme (Vorgabe des Orchestrators vom 07.10.2026, sprache-20): Der Hinweis zum Notfall-Medikament sagt „Im Notfallbogen in Teil C …“.
  // SCHNITTSTELLEN Abschnitt 9 nennt das Blatt „Notfall- und Gesundheitsbogen“; die Abweichung steht im Bericht von N-A2 als offener Punkt.
  const textOhneAusnahme = JSON.stringify({ ...wb, notfall: { ...wb.notfall, gesundheit: { ...(wb.notfall || {}).gesundheit, medikamenteHinweis: "" } } });
  const text = textOhneAusnahme;
  ok("Papiernamen: de-oberflaeche.js hat keinen Block unterschriften.formulare und keine eigenen Papiernamen mehr", !(wb.unterschriften && wb.unterschriften.formulare) && alteNamen.every((n) => !text.includes(n)), alteNamen.filter((n) => text.includes(n)).join(", "));
  ok("Begriffe: 'Spielrecht' statt 'Spielberechtigung' oder 'Spielerlaubnis' in de-oberflaeche.js", !/Spielberechtigung|Spielerlaubnis/.test(text), (text.match(/Spielberechtigung|Spielerlaubnis/g) || []).length + " Treffer");
  const kyrillischInSchrift = zeichen.inSchrift(0x418);
  info("Hinweis: Die PDF-Schrift kennt Kyrillisch (" + (kyrillischInSchrift ? "ja" : "nein") + "), der Assistent weist es trotzdem ab: keine lateinischen Buchstaben, DFBnet braucht die Schreibweise aus dem Pass.");
}

// Getrennt lebende Eltern ohne Zustimmung: ein Kasten auf 'sorge' und ein Kasten auf 'unterschriften', PDF markiert die Stelle.
// Runde 4: Auf 'sorge/recht' standen zwei "Achtung"-Kästen (dieser und der Hinweis des Regelwerks); jetzt steht dort einer.
async function pruefeGetrennteEltern(browser, server, dateien) {
  console.log("\n=== Runde 3 und 4: getrennt lebende Eltern ===");
  // Wortlaut vom 07.10.2026 (Prüfung Orchestrator, sprache-4): erst fragen, dann sagen, was bei „Nein“ gilt
  const satz = "Hat der andere Elternteil zugestimmt? Dann setzen Sie den Haken. Wenn nicht: Er unterschreibt den Aufnahmeantrag auch. Das geht nur mit Stift. Im PDF ist die Stelle markiert.";
  // Alle sichtbaren Kästen der Seite mit ihrer Beschriftung ("Achtung", "Info" …) und dem Merkmal des Hinweises
  const kaesten = (page) =>
    page.evaluate(() =>
      Array.from(document.querySelectorAll("#anmeldung .anm-hinweiskasten"))
        .filter((e) => e.checkVisibility())
        .map((e) => ({
          label: (e.querySelector(".anm-hinweiskasten__label") || { textContent: "" }).textContent.trim(),
          zweiter: !!e.closest("[data-zweiter-elternteil]"),
          key: e.getAttribute("data-hinweis-key") || "",
          text: e.innerText.replace(/\s+/g, " ").trim(),
        }))
    );
  const page = await seiteMitBeispiel(browser, server, MOBIL, "getrennt", "kind-neu", null);
  const s0 = await geheBis(page, "sorge", "recht");
  ok("Getrennte Eltern: Seite 'sorge/recht' erreicht", s0.schritt === "sorge" && s0.teil === "recht", s0.schritt + "/" + s0.teil);
  ok("Getrennte Eltern: bei 'Beide Eltern' steht kein Hinweis da", !(await sichtbarIn(page, "#anmeldung [data-zweiter-elternteil]")), "");
  await klickeEtikett(page, '#anmeldung input[data-pfad="sorge"][data-wert="getrennt_bei_mir"]');
  const box = await page.evaluate(() => {
    const e = document.querySelector("#anmeldung [data-zweiter-elternteil]");
    return { sichtbar: !!e && e.checkVisibility(), text: e ? e.innerText.replace(/\s+/g, " ").trim() : "" };
  });
  ok("Getrennte Eltern (sorge): ohne Zustimmung erklärt der Kasten in drei kurzen Absätzen: Hat er zugestimmt? Haken setzen; wenn nicht, unterschreibt er auch, nur mit Stift, im PDF markiert", box.sichtbar && box.text === "Achtung " + satz, box.text);
  const auf = await kaesten(page);
  const achtung = auf.filter((x) => x.label === "Achtung");
  ok("Getrennte Eltern (sorge): genau ein Kasten 'Achtung' auf der Seite, und es ist dieser (nicht zwei, die zusammen verwirren)", achtung.length === 1 && achtung[0].zweiter, JSON.stringify(auf.map((x) => x.label + (x.key ? ":" + x.key : "") + (x.zweiter ? " [zweiter Elternteil]" : ""))));
  ok("Getrennte Eltern (sorge): der Satz des Regelwerks 'Sonst unterschreiben beide' steht hier nicht mehr", !auf.some((x) => x.key === "getrennt_zustimmung" || /Sonst unterschreiben beide/.test(x.text)), "");
  const kaestchenText = await page.$eval('#anmeldung input[data-pfad="andererElternteilEinverstanden"]', (e) => ({ sichtbar: e.closest("label").checkVisibility(), text: e.closest("label").innerText.replace(/\s+/g, " ").trim() }));
  ok("Getrennte Eltern (sorge): das Kästchen 'Der andere Elternteil ist einverstanden' bleibt", kaestchenText.sichtbar && kaestchenText.text.startsWith("Der andere Elternteil ist einverstanden."), kaestchenText.text);
  await page.$eval("#anmeldung [data-zweiter-elternteil]", (e) => e.scrollIntoView({ block: "center" }));
  await page.screenshot({ path: path.join(AUSGABE, MOBIL.name, "sorge-getrennt-hinweis.png"), fullPage: false });
  protokoll.screenshots++;
  await klickeEtikett(page, '#anmeldung input[data-pfad="andererElternteilEinverstanden"]');
  ok("Getrennte Eltern (sorge): mit Zustimmung verschwindet der Kasten", !(await sichtbarIn(page, "#anmeldung [data-zweiter-elternteil]")) && (await kaesten(page)).filter((x) => x.label === "Achtung").length === 0, "");
  await klickeEtikett(page, '#anmeldung input[data-pfad="andererElternteilEinverstanden"]');
  ok("Getrennte Eltern (sorge): ohne Zustimmung ist er wieder da", await sichtbarIn(page, "#anmeldung [data-zweiter-elternteil]"), "");
  const su = await geheBis(page, "unterschriften");
  const box2 = await page.evaluate(() => {
    const e = document.querySelector("#anmeldung [data-zweiter-elternteil]");
    return { sichtbar: !!e && e.checkVisibility(), text: e ? e.innerText.replace(/\s+/g, " ").trim() : "" };
  });
  const auf2 = await kaesten(page);
  ok("Getrennte Eltern (unterschriften): ein Kasten mit demselben Text steht vor den Unterschriftsfeldern", su.schritt === "unterschriften" && box2.sichtbar && box2.text === "Achtung " + satz && auf2.filter((x) => x.label === "Achtung").length === 1, box2.text + " | Kästen: " + auf2.length);
  // Bis zum PDF: die Stelle "zweiter Elternteil (nötig)" steht im fertigen Dokument.
  await unterschreiben(page, { touch: false });
  await klickeWeiter(page, su);
  const pr = await kaesten(page);
  ok("Getrennte Eltern (pruefen): der Hinweis des Regelwerks 'Bitte fragen Sie den anderen Elternteil …' steht weiterhin auf der Prüfseite", pr.some((x) => x.key === "getrennt_zustimmung"), JSON.stringify(pr.map((x) => x.key || x.label)));
  await klickeWeiter(page, await stand(page));
  const ctx = { name: "getrennte-eltern", vp: MOBIL };
  const daten = await ergebnisPruefen(page, ctx, dateien);
  if (daten) {
    const a = daten.attrappe && daten.attrappe.a;
    ok("Getrennte Eltern: a.sorge = getrennt_bei_mir und andererElternteilEinverstanden ist nicht wahr", !!a && a.sorge === "getrennt_bei_mir" && a.andererElternteilEinverstanden !== true, a && JSON.stringify({ sorge: a.sorge, einverstanden: a.andererElternteilEinverstanden }));
    const pdf = await pdfHerunterladenUndPruefen(browser, server, page, "Getrennte Eltern", daten, { satzungOffen: false });
    if (pdf) ok("Getrennte Eltern: das PDF markiert die Stelle „zweiter Elternteil (nötig)“", ohneLeer(pdfText(pdf.pfad)).includes("zweiter Elternteil (nötig)"), "");
  }
  await page.close();

  // Mit Zustimmung: kein Hinweis auf 'unterschriften'.
  const p2 = await seiteMitBeispiel(browser, server, MOBIL, "getrennt-einverstanden", "kind-neu", null);
  await geheBis(p2, "sorge", "recht");
  await klickeEtikett(p2, '#anmeldung input[data-pfad="sorge"][data-wert="getrennt_bei_mir"]');
  await klickeEtikett(p2, '#anmeldung input[data-pfad="andererElternteilEinverstanden"]');
  await geheBis(p2, "unterschriften");
  ok("Getrennte Eltern: ist der andere Elternteil einverstanden, steht auch auf 'unterschriften' kein Hinweis", !(await sichtbarIn(p2, "#anmeldung [data-zweiter-elternteil]")), "");
  await p2.close();
}

// Satzung: Kästchen mit Link vor den Unterschriftsfeldern, Pflicht am Bildschirm, freiwillig auf Papier.
async function pruefeSatzung(browser, server, dateien) {
  console.log("\n=== Runde 3: Satzung ===");
  const erwartet = server.konfig.verein.satzungUrl;
  const page = await seiteMitBeispiel(browser, server, MOBIL, "satzung", "kind-neu", null);
  const s = await geheBis(page, "unterschriften");
  ok("Satzung: Schritt 'unterschriften' erreicht", s.schritt === "unterschriften", s.schritt);
  const dom = await page.evaluate(() => {
    const haken = document.querySelector('#anmeldung input[data-pfad="satzung"]');
    const link = document.querySelector('#anmeldung a[data-aktion="satzung-lesen"]');
    const feld = document.querySelector("#anmeldung .anm-unterschrift");
    const vor = (x, y) => !!x && !!y && !!(x.compareDocumentPosition(y) & Node.DOCUMENT_POSITION_FOLLOWING);
    return {
      haken: !!haken,
      an: !!haken && haken.checked,
      pflicht: haken && haken.getAttribute("aria-required"),
      label: haken ? haken.closest("label").innerText.replace(/\s+/g, " ").trim() : "",
      link: link && { href: link.getAttribute("href"), target: link.getAttribute("target"), rel: link.getAttribute("rel"), text: link.textContent.replace(/\s+/g, " ").trim() },
      hakenVorFeld: vor(haken, feld),
      linkVorHaken: vor(link, haken),
    };
  });
  ok("Satzung: Kontrollkästchen 'Ich habe die Satzung gelesen.' steht vor den Unterschriftsfeldern, ist nicht angekreuzt und Pflicht", dom.haken && !dom.an && dom.pflicht === "true" && dom.hakenVorFeld && /^Ich habe die Satzung gelesen\./.test(dom.label), dom.label);
  ok("Satzung: der Link öffnet die Satzung aus konfig.verein.satzungUrl in einem neuen Tab (target=_blank, rel=noopener)", !!dom.link && dom.link.href === erwartet && dom.link.target === "_blank" && /\bnoopener\b/.test(dom.link.rel || "") && dom.linkVorHaken, JSON.stringify(dom.link));
  // Namen der Papiere: alle stammen aus den Regeltexten (formulare, unterschriften)
  const deRegeln = (await import(pathToFileURL(path.join(ROOT, "assets", "js", "anmeldung", "texte", "de-regeln.js")).href)).default;
  const erlaubteNamen = new Set([...Object.values(deRegeln.formulare || {}), ...Object.values(deRegeln.unterschriften || {})]);
  const namen = await page.evaluate(() => ({
    giltTitel: Array.from(document.querySelectorAll("#anmeldung .anm-unterschrift .anm-unterschrift__gilt > p")).map((e) => e.textContent.replace(/\s+/g, " ").trim()),
    giltFelder: document.querySelectorAll("#anmeldung .anm-unterschrift").length,
    gilt: Array.from(document.querySelectorAll("#anmeldung .anm-unterschrift .anm-unterschrift__gilt > ul > li")).map((e) => e.textContent.replace(/\s+/g, " ").trim()),
    stift: Array.from(document.querySelectorAll("#anmeldung .anm-unterschriften ul.anm-liste-punkte li")).map((e) => e.textContent.replace(/\s+/g, " ").trim()),
  }));
  const giltPunkte = namen.gilt;
  const fremd = [...giltPunkte, ...namen.stift].filter((n) => !erlaubteNamen.has(n));
  ok("Papiernamen: 'Diese Unterschrift gilt für:' (Liste, ein Blatt je Zeile) und die Liste der Stift-Blätter nennen nur Namen aus den Regeltexten (" + (giltPunkte.length + namen.stift.length) + " Namen)", giltPunkte.length > 0 && namen.stift.length > 0 && fremd.length === 0, fremd.join(" | ") || namen.stift.join(" | "));
  ok("'Diese Unterschrift gilt für:' steht über einer Liste mit einem Blatt je Zeile, bei jedem Unterschriftsfeld (kein Satz mit Aufzählung, keine Zeile mit mehreren Namen)", namen.giltTitel.length === namen.giltFelder && namen.giltTitel.every((t) => t === "Diese Unterschrift gilt für:") && giltPunkte.every((n) => !/, /.test(n.replace(/\([^)]*\)/g, "")) && n.split(/\s+/).length <= 12), namen.giltTitel.join(" | ") + " – " + giltPunkte.join(" | "));
  await page.$eval(".anm-satzung", (e) => {
    e.scrollIntoView({ block: "start" });
    window.scrollBy(0, -24);
  });
  await page.screenshot({ path: path.join(AUSGABE, MOBIL.name, "unterschriften-satzung.png"), fullPage: false });
  protokoll.screenshots++;
  // Ohne Haken: Unterschrift zeichnen, dann Weiter → freundliche Meldung, Seite bleibt.
  await unterschreiben(page, { touch: true, ohneSatzung: true });
  const r1 = await klickeWeiter(page, s);
  const nach = await page.evaluate(() => {
    const haken = document.querySelector('#anmeldung input[data-pfad="satzung"]');
    const fehler = document.querySelector('#anmeldung [data-feld="satzung"] .anm-fehler');
    return { invalid: haken && haken.getAttribute("aria-invalid"), meldung: fehler ? fehler.textContent : "", sichtbar: !!fehler && !fehler.hidden };
  });
  ok("Satzung: am Bildschirm ohne Haken bleibt die Seite; Meldung 'Bitte lesen Sie die Satzung und setzen Sie den Haken.' am Feld und in der Fehlerliste", !r1.gewechselt && r1.fehler.some((f) => /Satzung/.test(f)) && nach.invalid === "true" && nach.sichtbar && /Satzung/.test(nach.meldung), r1.fehler.join(" | "));
  await page.$eval(".anm-satzung", (e) => e.scrollIntoView({ block: "center" }));
  await page.screenshot({ path: path.join(AUSGABE, MOBIL.name, "unterschriften-satzung-fehler.png"), fullPage: false });
  protokoll.screenshots++;
  await haekchenSatzung(page);
  const weg = await page.evaluate(() => {
    const fehler = document.querySelector('#anmeldung [data-feld="satzung"] .anm-fehler');
    const haken = document.querySelector('#anmeldung input[data-pfad="satzung"]');
    return { versteckt: !fehler || fehler.hidden, invalid: haken.getAttribute("aria-invalid") };
  });
  ok("Satzung: mit dem Haken verschwindet die Meldung sofort", weg.versteckt && !weg.invalid, JSON.stringify(weg));
  const r2 = await klickeWeiter(page, s);
  const p = await stand(page);
  ok("Satzung: mit Haken und Unterschrift geht es zur Prüfseite", r2.gewechselt && p.schritt === "pruefen", p.schritt);
  const zeile = await page.evaluate(() => {
    for (const z of document.querySelectorAll("#anmeldung .anm-pruefzeile")) {
      const dt = z.querySelector("dt");
      if (dt && /Satzung/.test(dt.textContent)) return { label: dt.textContent.trim(), wert: z.querySelector(".anm-pruefzeile__wert").textContent.trim() };
    }
    return null;
  });
  ok("Satzung: die Prüfseite zeigt die Antwort ('Satzung gelesen: Ja')", !!zeile && zeile.wert === "Ja", JSON.stringify(zeile));
  await klickeWeiter(page, p);
  const daten = await ergebnisPruefen(page, { name: "satzung", vp: MOBIL }, dateien);
  ok("Satzung: a.satzung = true erreicht den PDF-Baustein", !!daten && !!daten.attrappe && daten.attrappe.a.satzung === true, daten && daten.attrappe ? String(daten.attrappe.a.satzung) : "keine Aufzeichnung");
  if (daten) await pdfHerunterladenUndPruefen(browser, server, page, "Satzung Bildschirm", daten, { satzungOffen: false });
  await page.close();
}

// Alles auf Papier: der Haken ist freiwillig; ohne Haken bittet Teil A im PDF um die Markierung von Hand.
async function papierLaeufe(browser, server, dateien, beispiele, alleSchritte) {
  console.log("\n=== Runde 3: alles auf Papier (unterschriftWeg = papier) ===");
  const faelle = [
    { id: "kind-neu", vp: MOBIL, satzungPapier: false },
    { id: "herren-wechsel", vp: DESKTOP, satzungPapier: true },
  ];
  for (const f of faelle) {
    if (OHNE_DESKTOP && f.vp === DESKTOP) continue;
    const name = "Papier " + f.id + " (" + f.vp.name + (f.satzungPapier ? ", mit Haken" : ", ohne Haken") + ")";
    const page = await neueSeite(browser, server, f.vp, "papier-" + f.id);
    const ctx = neuerKontext({ name: "papier-" + f.id, vp: f.vp, modus: "beispiel", gesehen: gesehenFuer(f.vp), touch: f.vp.mobil, axeNeu: false, dateien, papier: true, satzungPapier: f.satzungPapier });
    await ladeBeispielPerKnopf(page, f.id);
    // Auf 'unterschriften' vor dem Weiterklicken den Hinweistext am Haken merken.
    ctx.vorWeiter = async (p, s) => {
      if (s.schritt === "unterschriften") ctx.hinweisSatzung = await p.$eval('#anmeldung [data-feld="satzung"] .anm-karte__hinweis', (e) => e.textContent.trim()).catch(() => "");
    };
    const r = await laufe(page, ctx);
    r.besucht.forEach((b) => alleSchritte.add(b.split("/")[0]));
    const erreicht = r.besucht[r.besucht.length - 1].startsWith("fertig");
    const daten = erreicht ? await ergebnisPruefen(page, ctx, dateien) : null;
    ok(name + ": bis 'fertig' durchgeklickt, Datei erstellt", erreicht && !!daten, r.besucht.length + " Seiten");
    ok(name + ": der Haken bei der Satzung ist freiwillig ('Freiwillig. …')", /^Freiwillig\./.test(ctx.hinweisSatzung || ""), ctx.hinweisSatzung);
    ok(name + ": keine Unterschriftsfelder am Bildschirm", (ctx.unterschriftGezeichnetIn || []).length === 0, "");
    if (daten) {
      const a = daten.attrappe && daten.attrappe.a;
      ok(name + ": a.unterschriftWeg = papier, a.satzung = " + f.satzungPapier, !!a && a.unterschriftWeg === "papier" && a.satzung === f.satzungPapier, a && JSON.stringify({ weg: a.unterschriftWeg, satzung: a.satzung }));
      ok(name + ": es gehen keine Unterschriftsbilder an den PDF-Baustein", daten.attrappe && Object.keys(daten.attrappe.unterschriften || {}).length === 0, daten.attrappe ? Object.keys(daten.attrappe.unterschriften || {}).join(", ") : "");
      const pdf = await pdfHerunterladenUndPruefen(browser, server, page, name, daten, { satzungOffen: !f.satzungPapier });
      const bild = PDF_ERGEBNISSE.get(f.id + "|" + f.vp.name);
      if (pdf && pdf.bilderS2 && bild && bild.bilderS2) ok(name + ": Aufnahmeantrag Seite 2 hat weniger Bilder als mit Bildschirm-Unterschrift", pdf.bilderS2.length < bild.bilderS2.length, pdf.bilderS2.length + " gegen " + bild.bilderS2.length);
    }
    ok(name + ": keine Fehler in der Konsole", page.__st.konsole.length === 0, page.__st.konsole.slice(0, 3).join(" | "));
    await page.close();
  }
}

// Namen, Orte und Anschriften nur in lateinischer Schrift (Zeichenmenge der PDF-Schrift, siehe zeichen.js).
async function pruefeNamenLatein(browser, server, dateien, beispiele) {
  console.log("\n=== Runde 3: Namen in lateinischer Schrift ===");
  const MELDUNG_NAME = "Bitte schreiben Sie den Namen mit lateinischen Buchstaben, so wie im Pass.";
  const page = await neueSeite(browser, server, MOBIL, "namen-latein");
  await page.click('#anmeldung [data-aktion="weiter"]');
  await page.waitForFunction(() => document.getElementById("anmeldung").dataset.schritt === "wer", { timeout: 4000 });
  await klickeEtikett(page, '#anmeldung input[data-pfad="wer"][data-wert="kind"]');
  await page.click('#anmeldung [data-aktion="weiter"]');
  await page.waitForFunction(() => document.getElementById("anmeldung").dataset.schritt === "name", { timeout: 4000 });
  const vorname = '#anmeldung input[data-pfad="vorname"]';
  const nachname = '#anmeldung input[data-pfad="nachname"]';
  const versuch = async (v, n) => {
    await tippe(page, vorname, v);
    await tippe(page, nachname, n);
    const vorher = await stand(page);
    const live = await sichtbarIn(page, "#anmeldung .anm-hinweis--achtung");
    const r = await klickeWeiter(page, vorher);
    const invalid = await page.evaluate(() => ["vorname", "nachname"].map((p) => document.querySelector('#anmeldung input[data-pfad="' + p + '"]')?.getAttribute("aria-invalid")));
    const liveDanach = await sichtbarIn(page, "#anmeldung .anm-hinweis--achtung");
    const amFeld = await page.evaluate(() => Array.from(document.querySelectorAll("#anmeldung .anm-fehler:not([hidden])")).map((e) => e.textContent.trim()));
    return { r, live, liveDanach, invalid, amFeld };
  };
  // Arabisch: Fehler
  const ar = await versuch("محمد", "العلي");
  ok("Namen: arabischer Name wird abgewiesen – Meldung '" + MELDUNG_NAME + "'", !ar.r.gewechselt && ar.r.fehler.length === 2 && ar.r.fehler.every((f) => f.endsWith(MELDUNG_NAME)) && ar.invalid.every((x) => x === "true"), ar.r.fehler.join(" | "));
  ok("Fehlerliste: die zwei gleichen Meldungen tragen den Feldnamen davor ('Vorname: …', 'Nachname: …'); am Feld steht die Meldung allein", ar.r.fehler[0] === "Vorname: " + MELDUNG_NAME && ar.r.fehler[1] === "Nachname: " + MELDUNG_NAME && ar.amFeld.length === 2 && ar.amFeld.every((t) => t === MELDUNG_NAME), "Liste: " + ar.r.fehler.join(" | ") + "; am Feld: " + ar.amFeld.join(" | "));
  ok("Namen: schon beim Tippen steht ein Hinweis da; nach der Fehlerliste steht er nicht doppelt", ar.live === true && ar.liveDanach === false, "vorher " + ar.live + ", danach " + ar.liveDanach);
  await page.screenshot({ path: path.join(AUSGABE, MOBIL.name, "fehler-name-arabisch.png"), fullPage: false });
  protokoll.screenshots++;
  // Kyrillisch: Fehler (die PDF-Schrift kennt es, aber es sind keine lateinischen Buchstaben)
  const ky = await versuch("Иван", "Петров");
  ok("Namen: kyrillischer Name wird abgewiesen", !ky.r.gewechselt && ky.r.fehler.length === 2 && ky.r.fehler.every((f) => f.endsWith(MELDUNG_NAME)), ky.r.fehler.join(" | "));
  // Gemischt: ein arabischer Buchstabe in einem lateinischen Namen
  const gm = await versuch("Ali علي", "Beispiel");
  ok("Namen: ein Name mit einem arabischen Zusatz wird abgewiesen (nur das betroffene Feld)", !gm.r.gewechselt && gm.r.fehler.length === 1 && gm.invalid[0] === "true" && gm.invalid[1] !== "true", gm.r.fehler.join(" | "));
  // Türkisch und Polnisch: in Ordnung
  const tr = await versuch("Şükrü", "Yıldız");
  const trStand = await stand(page);
  ok("Namen: türkischer Name (Şükrü Yıldız) geht durch", tr.r.gewechselt && trStand.schritt === "geburt" && tr.r.fehler.length === 0, trStand.schritt + "/" + trStand.teil);
  await page.click('#anmeldung [data-aktion="zurueck"]');
  await page.waitForFunction(() => document.getElementById("anmeldung").dataset.schritt === "name", { timeout: 4000 });
  const pl = await versuch("Łukasz", "Wiśniewski");
  const plStand = await stand(page);
  ok("Namen: polnischer Name (Łukasz Wiśniewski) geht durch", pl.r.gewechselt && plStand.schritt === "geburt" && pl.r.fehler.length === 0, plStand.schritt + "/" + plStand.teil);
  await page.close();

  // Weitere Felder: Geburtsort, Sorgeberechtigte, Anschrift, Kontoinhaber, Notfallkontakt.
  const seite = await seiteMitBeispiel(browser, server, MOBIL, "namen-felder", "kind-neu", null);
  const feld = async (pfad, meldungTeil, kennung) => {
    const sel = '#anmeldung input[data-pfad="' + pfad + '"]';
    const alt = await seite.$eval(sel, (e) => e.value);
    await tippe(seite, sel, "محمد");
    const vorher = await stand(seite);
    const r = await klickeWeiter(seite, vorher);
    const invalid = await seite.$eval(sel, (e) => e.getAttribute("aria-invalid")).catch(() => null);
    ok("Namen: " + kennung + " – arabische Schrift wird abgewiesen ('" + meldungTeil + "')", !r.gewechselt && r.fehler.some((f) => f.includes(meldungTeil)) && invalid === "true", r.fehler.join(" | "));
    await tippe(seite, sel, alt);
  };
  await geheBis(seite, "geburt", "datum");
  await feld("geburtsort", "den Ort mit lateinischen Buchstaben", "Geburtsort");
  await geheBis(seite, "sorge", "personen");
  await feld("sorgeberechtigte.0.vorname", "den Namen mit lateinischen Buchstaben", "Sorgeberechtigte, Vorname");
  await feld("sorgeberechtigte.0.nachname", "den Namen mit lateinischen Buchstaben", "Sorgeberechtigte, Nachname");
  await geheBis(seite, "kontakt", "anschrift");
  await feld("anschrift.strasse", "die Anschrift mit lateinischen Buchstaben", "Anschrift, Straße");
  await feld("anschrift.ort", "die Anschrift mit lateinischen Buchstaben", "Anschrift, Ort");
  await geheBis(seite, "zahlung", "inhaber");
  await klickeEtikett(seite, '#anmeldung input[data-pfad="zahlung.kontoinhaber"][data-wert="andere"]');
  await tippe(seite, '#anmeldung input[data-pfad="zahlung.kiVorname"]', "Anna");
  await tippe(seite, '#anmeldung input[data-pfad="zahlung.kiNachname"]', "Beispiel");
  await klickeEtikett(seite, '#anmeldung input[data-pfad="zahlung.kiAnschriftGleich"]'); // Anschrift des Kontoinhabers eingeben
  await tippe(seite, '#anmeldung input[data-pfad="zahlung.kiStrasse"]', "Musterweg 1");
  await tippe(seite, '#anmeldung input[data-pfad="zahlung.kiPlz"]', "60326");
  await tippe(seite, '#anmeldung input[data-pfad="zahlung.kiOrt"]', "Frankfurt am Main");
  await feld("zahlung.kiVorname", "den Namen mit lateinischen Buchstaben", "Kontoinhaber, Vorname");
  await feld("zahlung.kiNachname", "den Namen mit lateinischen Buchstaben", "Kontoinhaber, Nachname");
  await feld("zahlung.kiStrasse", "die Anschrift mit lateinischen Buchstaben", "Kontoinhaber, Straße");
  await feld("zahlung.kiOrt", "die Anschrift mit lateinischen Buchstaben", "Kontoinhaber, Ort");
  await geheBis(seite, "notfall", "kontakt");
  await feld("notfall.name", "den Namen mit lateinischen Buchstaben", "Notfallkontakt");
  await seite.close();
}

// Ein Durchlauf mit Sonderzeichen in Namen (türkisch, polnisch, spanisch/französisch) bis zum PDF.
async function pruefeSonderzeichenPdf(browser, server, dateien) {
  console.log("\n=== Runde 3: Sonderzeichen in Namen bis ins PDF ===");
  const page = await neueSeite(browser, server, DESKTOP, "sonderzeichen");
  const namen = { vorname: "Şükrü", nachname: "Yıldız-Öztürk", elternVor: "Łucja", elternNach: "Wiśniewska", notfall: "José Muñoz-François" };
  const ctx = neuerKontext({ name: "sonderzeichen", vp: DESKTOP, modus: "beispiel", gesehen: gesehenFuer(DESKTOP), touch: false, axeNeu: false, dateien });
  ctx.vorWeiter = async (p, s) => {
    if (s.schritt === "name") {
      await tippe(p, '#anmeldung input[data-pfad="vorname"]', namen.vorname);
      await tippe(p, '#anmeldung input[data-pfad="nachname"]', namen.nachname);
    }
    if (s.schritt === "sorge" && s.teil === "personen") {
      await tippe(p, '#anmeldung input[data-pfad="sorgeberechtigte.0.vorname"]', namen.elternVor);
      await tippe(p, '#anmeldung input[data-pfad="sorgeberechtigte.0.nachname"]', namen.elternNach);
    }
    if (s.schritt === "notfall" && s.teil === "kontakt") await tippe(p, '#anmeldung input[data-pfad="notfall.name"]', namen.notfall);
  };
  await ladeBeispielPerKnopf(page, "kind-neu");
  const r = await laufe(page, ctx);
  const erreicht = r.besucht[r.besucht.length - 1].startsWith("fertig");
  const daten = erreicht ? await ergebnisPruefen(page, ctx, dateien) : null;
  ok("Sonderzeichen: Durchlauf mit türkischem, polnischem und spanischem Namen bis 'fertig'", erreicht && !!daten, r.besucht.length + " Seiten");
  if (daten) {
    const pdf = await pdfHerunterladenUndPruefen(browser, server, page, "Sonderzeichen", daten, { satzungOffen: false });
    if (pdf) {
      const norm = ohneLeer(pdfText(pdf.pfad));
      const fehlen = Object.values(namen).filter((n) => !norm.includes(nfc(n)));
      ok("Sonderzeichen: alle Namen stehen richtig im PDF-Text (" + Object.values(namen).join("; ") + ")", fehlen.length === 0, fehlen.length ? "fehlen: " + fehlen.join("; ") : "");
      ok("Sonderzeichen: der Laufzettel meldet keinen 'Name bitte prüfen', der Dateiname hat kein '?'", !/Name bitte prüfen/.test(norm) && !path.basename(pdf.pfad).includes("?"), path.basename(pdf.pfad));
    }
  }
  ok("Sonderzeichen: keine Fehler in der Konsole", page.__st.konsole.length === 0, page.__st.konsole.slice(0, 3).join(" | "));
  await page.close();
}

// Karneval: zwei freiwillige Fragen (Abholung, allein nach Hause), nur bei Minderjährigen mit Abendauftritten.
async function pruefeKarnevalFragen(browser, server, dateien) {
  console.log("\n=== Runde 3: Karneval, Abholung und Heimweg ===");
  // Reihenfolge der Teilseiten an der Seite selbst (ohne Browser-Ablauf)
  const p0 = await neueSeite(browser, server, MOBIL, "karneval-teile");
  const teile = await p0.evaluate(async () => {
    const { karneval } = await import("/assets/js/anmeldung/seiten-fussball.js");
    const k = (minor, abend) => ({ minderjaehrig: () => minor, a: { karneval: { abendOhneEltern: abend } } });
    return { kindJa: karneval.teile(k(true, "ja")), kindNein: karneval.teile(k(true, "nein")), kindOffen: karneval.teile(k(true, null)), erwachsenJa: karneval.teile(k(false, "ja")) };
  });
  ok("Karneval: die Fragen kommen nur bei minderjährig und abendOhneEltern = ja", JSON.stringify(teile.kindJa) === JSON.stringify(["gruppe", "woanders", "turnier", "abend", "abholung", "allein"]) && JSON.stringify(teile.kindNein) === JSON.stringify(["gruppe", "woanders", "turnier", "abend"]) && JSON.stringify(teile.kindOffen) === JSON.stringify(["gruppe", "woanders", "turnier", "abend"]) && JSON.stringify(teile.erwachsenJa) === JSON.stringify(["gruppe", "woanders", "turnier"]), JSON.stringify(teile));
  await p0.close();

  const page = await seiteMitBeispiel(browser, server, MOBIL, "karneval-fragen", "karneval-kind", null);
  const a0 = await geheBis(page, "karneval", "abend");
  ok("Karneval: Seite 'abend' erreicht (Abendauftritte: ja)", a0.schritt === "karneval" && a0.teil === "abend", a0.schritt + "/" + a0.teil);
  const r1 = await klickeWeiter(page, a0);
  const s1 = await stand(page);
  ok("Karneval: nach 'Ja' folgt die Frage 'Wer holt Ihr Kind ab?'", r1.gewechselt && s1.teil === "abholung", s1.schritt + "/" + s1.teil);
  const titel1 = await page.$eval("#anm-titel", (e) => e.textContent.trim());
  const feld1 = await page.$eval('#anmeldung input[data-pfad="karneval.abholung"]', (e) => ({ wert: e.value, max: e.getAttribute("maxlength"), pflicht: e.getAttribute("aria-required") }));
  ok("Karneval: Überschrift 'Wer holt Ihr Kind ab?', Namensfeld höchstens 80 Zeichen, freiwillig", titel1 === "Wer holt Ihr Kind ab?" && feld1.max === "80" && !feld1.pflicht, JSON.stringify({ titel1, ...feld1 }));
  await page.screenshot({ path: path.join(AUSGABE, MOBIL.name, "karneval-abholung.png"), fullPage: false });
  protokoll.screenshots++;
  // freiwillig: leer lassen geht
  await tippe(page, '#anmeldung input[data-pfad="karneval.abholung"]', "");
  const r2 = await klickeWeiter(page, s1);
  const s2 = await stand(page);
  ok("Karneval: die Frage nach der Abholung ist freiwillig (leer geht weiter zu 'allein nach Hause')", r2.gewechselt && s2.teil === "allein" && r2.fehler.length === 0, s2.schritt + "/" + s2.teil);
  const titel2 = await page.$eval("#anm-titel", (e) => e.textContent.trim());
  ok("Karneval: Überschrift 'Darf Ihr Kind allein nach Hause gehen?', Ja ist vorgewählt, 'Ab wie viel Uhr?' erscheint", titel2 === "Darf Ihr Kind allein nach Hause gehen?" && (await sichtbarIn(page, '#anmeldung input[data-pfad="karneval.alleinAb"]')), titel2);
  await page.screenshot({ path: path.join(AUSGABE, MOBIL.name, "karneval-allein.png"), fullPage: false });
  protokoll.screenshots++;
  // ungültige Uhrzeit
  await tippe(page, '#anmeldung input[data-pfad="karneval.alleinAb"]', "25:99");
  const r3 = await klickeWeiter(page, s2);
  ok("Karneval: eine ungültige Uhrzeit (25:99) wird mit einem Beispiel abgewiesen", !r3.gewechselt && r3.fehler.some((f) => f === "Bitte schreiben Sie die Uhrzeit so: 21:30."), r3.fehler.join(" | "));
  // gültige Uhrzeit ohne Doppelpunkt wird zu HH:MM
  await tippe(page, '#anmeldung input[data-pfad="karneval.alleinAb"]', "2145");
  const r4 = await klickeWeiter(page, s2);
  const s4 = await stand(page);
  ok("Karneval: '2145' wird als 21:45 angenommen, es geht weiter zu 'kontakt'", r4.gewechselt && s4.schritt === "kontakt", s4.schritt + "/" + s4.teil);
  // Prüfseite
  const p = await geheBis(page, "pruefen");
  const zeilen = await page.evaluate(() => Array.from(document.querySelectorAll("#anmeldung .anm-pruefzeile")).map((z) => ({ label: (z.querySelector("dt") || {}).textContent, wert: (z.querySelector(".anm-pruefzeile__wert") || {}).textContent })));
  const allein = zeilen.find((z) => /Allein nach Hause/.test(z.label || ""));
  const abholung = zeilen.find((z) => /Wer holt ab/.test(z.label || ""));
  ok("Karneval: die Prüfseite zeigt 'Allein nach Hause: Ja, ab 21:45 Uhr'; die leere Abholung fehlt in der Liste", p.schritt === "pruefen" && !!allein && allein.wert.trim() === "Ja, ab 21:45 Uhr" && !abholung, JSON.stringify(zeilen.filter((z) => /Allein|holt|Abend/.test(z.label || ""))));
  await klickeWeiter(page, p);
  const daten = await ergebnisPruefen(page, { name: "karneval-fragen", vp: MOBIL }, dateien);
  if (daten && daten.attrappe) {
    const kv = daten.attrappe.a.karneval;
    ok("Karneval: a.karneval.{abholung, alleinNachHause, alleinAb} erreichen den PDF-Baustein", kv.abholung === "" && kv.alleinNachHause === "ja" && kv.alleinAb === "21:45", JSON.stringify(kv));
    const pdf = await pdfHerunterladenUndPruefen(browser, server, page, "Karneval-Fragen", daten, { satzungOffen: false });
    if (pdf) weich("Karneval: die Erlaubnisseite im PDF nennt die Uhrzeit 21:45 (füllt AP-3)", ohneLeer(pdfText(pdf.pfad)).includes("21:45"), "");
  }
  await page.close();

  // Mit Abholung ausgefüllt, und "Nein" bei den Abendauftritten: keine Zusatzfragen, Felder leer.
  const q = await seiteMitBeispiel(browser, server, MOBIL, "karneval-nein", "karneval-kind", null);
  const b0 = await geheBis(q, "karneval", "abend");
  await klickeEtikett(q, '#anmeldung input[data-pfad="karneval.abendOhneEltern"][data-wert="nein"]');
  const rb = await klickeWeiter(q, b0);
  const sb = await stand(q);
  ok("Karneval: bei 'Nein' zu den Abendauftritten kommen die Fragen nicht", rb.gewechselt && sb.schritt === "kontakt", sb.schritt + "/" + sb.teil);
  await q.close();
}

// Karneval, "Darf Ihr Kind allein nach Hause gehen?": Bei "Ja" ist die Uhrzeit Pflicht, sonst stünde auf der Erlaubnis im PDF
// nur "–" (Runde 4, Punkt 7). "Nein" und keine Antwort gehen weiter; die Frage bleibt freiwillig.
async function pruefeKarnevalUhrzeit(browser, server, dateien) {
  console.log("\n=== Runde 4: Karneval, bei 'Ja' ist die Uhrzeit Pflicht ===");
  const MELDUNG = "Bitte schreiben Sie die Uhrzeit so: 21:30.";
  const feld = '#anmeldung input[data-pfad="karneval.alleinAb"]';
  const wahlSel = (wert) => '#anmeldung input[data-pfad="karneval.alleinNachHause"][data-wert="' + wert + '"]';
  const zustandFeld = () =>
    page0.$eval(feld, (e) => {
      const f = e.closest("[data-feld]").querySelector(":scope > .anm-fehler");
      return { invalid: e.getAttribute("aria-invalid"), pflicht: e.getAttribute("aria-required"), amFeld: f && !f.hidden ? f.textContent.trim() : "", etikett: e.closest("[data-feld]").querySelector("label").textContent.trim() };
    });

  // ---- A: "Ja" ohne gültige Uhrzeit bleibt auf der Seite ----
  const page0 = await seiteMitBeispiel(browser, server, MOBIL, "karneval-uhrzeit", "karneval-kind", null);
  const s0 = await geheBis(page0, "karneval", "allein");
  ok("Karneval-Uhrzeit: Seite 'karneval/allein' erreicht (im Beispiel 'Ja' und 21:30)", s0.schritt === "karneval" && s0.teil === "allein", s0.schritt + "/" + s0.teil);
  const z0 = await zustandFeld();
  ok("Karneval-Uhrzeit: das Feld 'Ab wie viel Uhr?' ist ein Pflichtfeld (aria-required), ohne den Zusatz 'freiwillig'", z0.pflicht === "true" && !/freiwillig/.test(z0.etikett), JSON.stringify(z0));
  const falle = [
    ["leer", ""],
    ["nur Leerzeichen", "   "],
    ["einem Wort", "abends"],
    ["einer ungültigen Uhrzeit", "25:99"],
  ];
  for (const [was, wert] of falle) {
    await tippe(page0, feld, wert);
    const r = await klickeWeiter(page0, s0);
    const z = r.gewechselt ? { invalid: null, amFeld: "(Seite gewechselt)" } : await zustandFeld();
    ok("Karneval-Uhrzeit: 'Ja' mit " + was + " bleibt auf der Seite; Liste und Feld nennen '" + MELDUNG + "'", !r.gewechselt && JSON.stringify(r.fehler) === JSON.stringify([MELDUNG]) && z.invalid === "true" && z.amFeld === MELDUNG, "Liste: " + r.fehler.join(" | ") + "; am Feld: " + z.amFeld);
    if (r.gewechselt) {
      await page0.close(); // die Seite hat die Eingabe angenommen: der Rest dieser Prüfung hätte kein Ziel mehr
      return;
    }
    if (was === "leer") {
      await page0.screenshot({ path: path.join(AUSGABE, MOBIL.name, "karneval-uhrzeit-fehlt.png"), fullPage: false });
      protokoll.screenshots++;
      await axePruefen(page0, "Karneval-Uhrzeit fehlt (Fehlerliste, aria-invalid, aria-required)");
    }
  }
  // Eine gültige Uhrzeit in anderer Schreibweise geht weiter und wird auf der Prüfseite als HH:MM gezeigt.
  await tippe(page0, feld, "21 Uhr 30");
  const rA = await klickeWeiter(page0, s0);
  const sA = await stand(page0);
  ok("Karneval-Uhrzeit: '21 Uhr 30' wird angenommen, es geht weiter zu 'kontakt'", rA.gewechselt && rA.fehler.length === 0 && sA.schritt === "kontakt", sA.schritt + "/" + sA.teil);
  const pA = await geheBis(page0, "pruefen");
  const zeileA = await page0.evaluate(() => Array.from(document.querySelectorAll("#anmeldung .anm-pruefzeile")).filter((z) => /Allein nach Hause/.test((z.querySelector("dt") || {}).textContent || "")).map((z) => (z.querySelector(".anm-pruefzeile__wert") || {}).textContent.trim()));
  ok("Karneval-Uhrzeit: die Prüfseite zeigt 'Allein nach Hause: Ja, ab 21:30 Uhr'", pA.schritt === "pruefen" && zeileA.length === 1 && zeileA[0] === "Ja, ab 21:30 Uhr", JSON.stringify(zeileA));
  await page0.close();

  // ---- B: "Nein" geht ohne Uhrzeit; die Meldung verschwindet sofort, wenn man von "Ja" auf "Nein" wechselt ----
  const pageB = await seiteMitBeispiel(browser, server, MOBIL, "karneval-uhrzeit-nein", "karneval-kind", null);
  const sB = await geheBis(pageB, "karneval", "allein");
  await tippe(pageB, feld, "");
  const rB1 = await klickeWeiter(pageB, sB);
  const boxDa = await pageB.$eval("#anmeldung .anm-fehlerbox", (e) => !e.hidden);
  await klickeEtikett(pageB, wahlSel("nein"));
  const boxWeg = await pageB.evaluate(() => ({ box: !document.querySelector("#anmeldung .anm-fehlerbox").hidden, feld: !!document.querySelector('#anmeldung input[data-pfad="karneval.alleinAb"]').closest(".anm-block") && document.querySelector('#anmeldung input[data-pfad="karneval.alleinAb"]').closest(".anm-block").checkVisibility() }));
  ok("Karneval-Uhrzeit: wechselt man von 'Ja' (Meldung sichtbar) auf 'Nein', verschwinden Meldung und Uhrzeit-Feld sofort", !rB1.gewechselt && boxDa && !boxWeg.box && !boxWeg.feld, JSON.stringify({ meldungVorher: boxDa, nachher: boxWeg }));
  const rB2 = await klickeWeiter(pageB, sB);
  const sB2 = await stand(pageB);
  ok("Karneval-Uhrzeit: 'Nein' geht ohne Uhrzeit weiter zu 'kontakt'", rB2.gewechselt && rB2.fehler.length === 0 && sB2.schritt === "kontakt", sB2.schritt + "/" + sB2.teil);
  const pB = await geheBis(pageB, "pruefen");
  const zeileB = await pageB.evaluate(() => Array.from(document.querySelectorAll("#anmeldung .anm-pruefzeile")).filter((z) => /Allein nach Hause/.test((z.querySelector("dt") || {}).textContent || "")).map((z) => (z.querySelector(".anm-pruefzeile__wert") || {}).textContent.trim()));
  ok("Karneval-Uhrzeit: die Prüfseite zeigt 'Allein nach Hause: Nein'", pB.schritt === "pruefen" && zeileB.length === 1 && zeileB[0] === "Nein", JSON.stringify(zeileB));
  await klickeWeiter(pageB, pB);
  const datenB = await ergebnisPruefen(pageB, { name: "karneval-uhrzeit-nein", vp: MOBIL }, dateien);
  if (datenB && datenB.attrappe) {
    const kv = datenB.attrappe.a.karneval;
    ok("Karneval-Uhrzeit: beim PDF-Baustein kommt 'Nein' ohne Uhrzeit an (alleinNachHause = nein, alleinAb leer)", kv.alleinNachHause === "nein" && kv.alleinAb === "", JSON.stringify(kv));
  }
  await pageB.close();

  // ---- C: keine Antwort geht ebenfalls (die Frage ist freiwillig) ----
  // Der Weg zu einer unbeantworteten Frage: bei den Abendauftritten erst 'Nein' (leert die Antworten), zurück, dann 'Ja'.
  const pageC = await seiteMitBeispiel(browser, server, MOBIL, "karneval-uhrzeit-keine", "karneval-kind", null);
  const abend = await geheBis(pageC, "karneval", "abend");
  await klickeEtikett(pageC, '#anmeldung input[data-pfad="karneval.abendOhneEltern"][data-wert="nein"]');
  await klickeWeiter(pageC, abend);
  await pageC.click('#anmeldung [data-aktion="zurueck"]');
  await pageC.waitForFunction(() => document.getElementById("anmeldung").dataset.teil === "abend", { timeout: 4000 });
  await klickeEtikett(pageC, '#anmeldung input[data-pfad="karneval.abendOhneEltern"][data-wert="ja"]');
  await klickeWeiter(pageC, await stand(pageC)); // abholung (leer)
  const sC = await klickeWeiter(pageC, await stand(pageC)); // allein
  const sC1 = await stand(pageC);
  const unbeantwortet = await pageC.$$eval('#anmeldung input[data-pfad="karneval.alleinNachHause"]', (l) => ({ anzahl: l.length, gewaehlt: l.filter((e) => e.checked).length }));
  ok("Karneval-Uhrzeit: Seite 'allein' ohne Antwort erreicht (weder Ja noch Nein gewählt, Uhrzeit-Feld verborgen)", sC1.teil === "allein" && unbeantwortet.anzahl === 2 && unbeantwortet.gewaehlt === 0 && !(await sichtbarIn(pageC, feld)), JSON.stringify({ stand: sC1, unbeantwortet }));
  const rC = await klickeWeiter(pageC, sC1);
  const sC2 = await stand(pageC);
  ok("Karneval-Uhrzeit: ohne Antwort geht es weiter zu 'kontakt' (die Frage ist freiwillig)", rC.gewechselt && rC.fehler.length === 0 && sC2.schritt === "kontakt", sC2.schritt + "/" + sC2.teil);
  const pC = await geheBis(pageC, "pruefen");
  const zeileC = await pageC.evaluate(() => Array.from(document.querySelectorAll("#anmeldung .anm-pruefzeile")).filter((z) => /Allein nach Hause/.test((z.querySelector("dt") || {}).textContent || "")).length);
  ok("Karneval-Uhrzeit: ohne Antwort fehlt die Zeile 'Allein nach Hause' auf der Prüfseite", pC.schritt === "pruefen" && zeileC === 0, String(zeileC));
  await klickeWeiter(pageC, pC);
  const datenC = await ergebnisPruefen(pageC, { name: "karneval-uhrzeit-keine", vp: MOBIL }, dateien);
  if (datenC && datenC.attrappe) {
    const kv = datenC.attrappe.a.karneval;
    ok("Karneval-Uhrzeit: beim PDF-Baustein kommt keine Antwort an (alleinNachHause = null, alleinAb leer)", kv.alleinNachHause === null && kv.alleinAb === "", JSON.stringify(kv));
  }
  await pageC.close();
}

// Attest: Hochladen heißt "habe"; danach nennt der Schritt 'unterschriften' die Erlaubnis für das Attest.
async function pruefeAttestImPlan(browser, server, dateien) {
  console.log("\n=== Runde 3: Attest im Unterschriftenplan ===");
  const gilt = (page) => page.evaluate(() => Array.from(document.querySelectorAll("#anmeldung .anm-unterschrift")).map((e) => e.innerText.replace(/\s+/g, " ")).join(" || "));
  // ohne Attest
  const ohne = await seiteMitBeispiel(browser, server, MOBIL, "attest-ohne", "wechsel-hessen", null);
  await geheBis(ohne, "unterschriften");
  const textOhne = await gilt(ohne);
  ok("Attest: Wechsel ohne hochgeladenes Attest – 'Erlaubnis für das Attest' steht nicht in der Unterschriftenliste", !/Attest/.test(textOhne), textOhne.slice(0, 200));
  await ohne.close();
  // mit Attest
  const page = await seiteMitBeispiel(browser, server, MOBIL, "attest-mit", "wechsel-hessen", null);
  const s = await geheBis(page, "nachweise");
  ok("Attest: Seite 'nachweise' erreicht", s.schritt === "nachweise", s.schritt);
  const u10 = '#anmeldung section[data-unterlage="U10"]';
  ok("Attest: die Unterlage U10 (Attest vom Arzt) ist im Wechsel als 'offen' dabei", !!(await page.$(u10)), "");
  await klickeEtikett(page, u10 + ' input[data-pfad="nachweise.U10"][data-wert="habe"]');
  const feld = await page.$(u10 + ' input[data-aktion="nachweis-foto"]');
  await feld.uploadFile(dateien["foto-1600x1200.jpg"]);
  await page.waitForSelector(u10 + " .anm-dateien__eintrag", { timeout: 8000 });
  const status = await page.evaluate(() => ({ habe: document.querySelector('#anmeldung section[data-unterlage="U10"] input[data-wert="habe"]').checked }));
  ok("Attest: Hochladen bedeutet 'Habe ich' (a.nachweise.U10 = habe, Auswahl steht auf 'Habe ich')", status.habe, "");
  const su = await geheBis(page, "unterschriften");
  const textMit = await gilt(page);
  ok("Attest: nach dem Hochladen nennt der Schritt 'unterschriften' die Erlaubnis für das Attest", su.schritt === "unterschriften" && /Erlaubnis für das Attest/.test(textMit), textMit.slice(0, 260));
  await unterschreiben(page, { touch: false });
  await klickeWeiter(page, su);
  await klickeWeiter(page, await stand(page));
  const daten = await ergebnisPruefen(page, { name: "attest", vp: MOBIL }, dateien);
  if (daten && daten.attrappe) {
    ok("Attest: e.formulare enthält 'attest', a.nachweise.U10 = habe erreicht den PDF-Baustein", daten.attrappe.formulare.includes("attest") && daten.attrappe.a.nachweise.U10 === "habe" && (daten.attrappe.nachweise.U10 || []).length === 1, JSON.stringify({ formulare: daten.attrappe.formulare, U10: daten.attrappe.a.nachweise.U10, dateien: (daten.attrappe.nachweise.U10 || []).length }));
  }
  await page.close();
}

// ---------- Hauptablauf ----------

// ---------- Runde 4 ----------

// Arabische Buchstaben und arabisch-indische Ziffern, als Escapes geschrieben.
const ARABISCH_TEXT = "محمد";
const ARABISCH_ZIFFERN = "٠١٧٦٠٤٠٦٩٠٤٢";
const ARABISCH_MAIL = "محمد@example.org";

// Argumente eines Aufrufs im Quelltext: `ab` zeigt auf die öffnende Klammer; getrennt wird an den obersten Kommas.
function argumenteVon(text, ab) {
  let tiefe = 0;
  let aktuell = "";
  let zeichenkette = null;
  const liste = [];
  for (let i = ab; i < text.length; i++) {
    const c = text[i];
    if (zeichenkette) {
      aktuell += c;
      if (c === "\\") aktuell += text[++i];
      else if (c === zeichenkette) zeichenkette = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      zeichenkette = c;
      aktuell += c;
    } else if (c === "(" || c === "[" || c === "{") {
      if (++tiefe > 1) aktuell += c;
    } else if (c === ")" || c === "]" || c === "}") {
      if (--tiefe === 0) {
        liste.push(aktuell.trim());
        return liste;
      }
      aktuell += c;
    } else if (c === "," && tiefe === 1) {
      liste.push(aktuell.trim());
      aktuell = "";
    } else aktuell += c;
  }
  return liste;
}

// Ohne Browser: Jedes Textfeld der Seiten hat eine Latein-Prüfung in pruefe() oder steht auf der Liste der
// Ausnahmen (Felder, die nur Ziffern annehmen). So fällt ein neues Freitextfeld ohne Prüfung sofort auf.
async function statischeRunde4() {
  console.log("\n=== Runde 4: Freitextfelder und neue Texte (ohne Browser) ===");
  const dir = path.join(ROOT, "assets", "js", "anmeldung");
  const AUSNAHMEN = {
    "anschrift.plz": "nur fünf Ziffern (Prüfung /^\\d{5}$/)",
    "zahlung.kiPlz": "nur fünf Ziffern (Prüfung /^\\d{5}$/)",
    "zahlung.iban": "IBAN-Prüfung (A bis Z und 0 bis 9); pdf.js lässt alles andere weg",
    jahreInDe: "Zahl von 0 bis 18",
    "karneval.alleinAb": "Uhrzeit HH:MM (normalisiereUhrzeit)",
  };
  const normal = (x) => x.replace(/\s+/g, " ").trim();
  let felder = 0;
  let geprueft = 0;
  let ausgenommen = 0;
  const ohne = [];
  for (const f of fs.readdirSync(dir).filter((x) => x.startsWith("seiten-") && x.endsWith(".js"))) {
    const text = fs.readFileSync(path.join(dir, f), "utf8");
    const exakt = new Set();
    const praefixe = new Set();
    const ausdruecke = new Set();
    for (const m of text.matchAll(/lateinFehler\(/g)) {
      const dritte = argumenteVon(text, m.index + "lateinFehler".length)[2];
      if (!dritte) continue;
      ausdruecke.add(normal(dritte));
      const einzeln = /^"([^"]*)"$/.exec(dritte);
      if (einzeln) exakt.add(einzeln[1]);
      const anfang = /^"([^"]*)"\s*\+/.exec(dritte);
      if (anfang) praefixe.add(anfang[1]);
    }
    for (const m of text.matchAll(/textfeld\(k,\s*\{\s*pfad:\s*([^,]+),/g)) {
      felder++;
      const ausdruck = normal(m[1]);
      const einzeln = /^"([^"]*)"$/.exec(ausdruck);
      if (einzeln && AUSNAHMEN[einzeln[1]]) ausgenommen++;
      else if (einzeln ? exakt.has(einzeln[1]) || Array.from(praefixe).some((pre) => einzeln[1].startsWith(pre)) : ausdruecke.has(ausdruck)) geprueft++;
      else ohne.push(f + ": " + ausdruck);
    }
  }
  ok("Textfelder: jedes der " + felder + " Felder hat eine Latein-Prüfung in pruefe() (" + geprueft + ") oder steht auf der Liste der Ausnahmen mit nur Ziffern (" + ausgenommen + ")", felder >= 35 && ohne.length === 0, ohne.join(" | ") || felder + " Felder");
  const wb = await ladeWoerterbuch();
  const T = (pfad) => pfad.split(".").reduce((x, sch) => (x === undefined || x === null ? undefined : x[sch]), wb);
  ok("Neue Texte (Runde 4) stehen im Wörterbuch: drei Meldungen zur Schrift und der Knopf 'Vorführung' im Namensraum demo", ["fehler.lateinischVerein", "fehler.lateinischText", "fehler.lateinischNummer", "demo.vorfuehrung"].every((x) => typeof T(x) === "string" && T(x).length > 0) && T("demo.vorfuehrung") === "Vorführung", "");
  ok("Getrennte Eltern: der Text des einen Kastens ist der vom Orchestrator festgelegte (drei kurze Absätze, Stand 07.10.2026)", T("sorge.zweiterMitStift") === "Hat der andere Elternteil zugestimmt? Dann setzen Sie den Haken.\nWenn nicht: Er unterschreibt den Aufnahmeantrag auch.\nDas geht nur mit Stift. Im PDF ist die Stelle markiert.", JSON.stringify(T("sorge.zweiterMitStift")));
}

// Latein-Prüfung für alle Freitextfelder, die ins PDF gehen: je Feldgruppe ein Fall (hier jedes Feld einzeln).
async function pruefeFreitextLatein(browser, server) {
  console.log("\n=== Runde 4: lateinische Schrift in allen Freitextfeldern, die ins PDF gehen ===");
  const MELDUNG = {
    verein: "Bitte schreiben Sie die Angaben zum Verein mit lateinischen Buchstaben.",
    anschrift: "Bitte schreiben Sie die Anschrift mit lateinischen Buchstaben.",
    text: "Bitte schreiben Sie mit lateinischen Buchstaben.",
    nummer: "Bitte schreiben Sie die Nummer mit den Ziffern 0 bis 9.",
  };
  const wb = await ladeWoerterbuch();
  ok("Meldungen im Wörterbuch (fehler.lateinischVerein, …Anschrift, …Text, …Nummer) wie erwartet", wb.fehler.lateinischVerein === MELDUNG.verein && wb.fehler.lateinischAnschrift === MELDUNG.anschrift && wb.fehler.lateinischText === MELDUNG.text && wb.fehler.lateinischNummer === MELDUNG.nummer, "");
  // Ein Fall: arabische Schrift (oder Ziffern) in das Feld tippen, Weiter. Erwartet: die Seite bleibt, das Feld ist ungültig,
  // die Fehlerliste nennt Feldname und Meldung, am Feld steht die Meldung allein. Danach ein gültiger Text mit Sonderzeichen.
  const fall = async (page, gruppe, o) => {
    const sel = '#anmeldung [data-pfad="' + o.pfad + '"]';
    await tippe(page, sel, o.wert || ARABISCH_TEXT);
    const r = await klickeWeiter(page, await stand(page));
    const z = await page.$eval(sel, (e) => {
      const f = e.closest("[data-feld]").querySelector(":scope > .anm-fehler");
      return { invalid: e.getAttribute("aria-invalid"), amFeld: f && !f.hidden ? f.textContent.trim() : "" };
    });
    const erwartet = (o.vorsatz ? o.vorsatz + ": " : "") + MELDUNG[o.art];
    ok(gruppe + ": " + o.pfad + " – Eingabe mit " + (o.wert && /^[٠-٩]+$/.test(o.wert) ? "arabischen Ziffern" : "arabischer Schrift") + " wird abgewiesen ('" + erwartet + "')", !r.gewechselt && r.fehler.includes(erwartet) && z.invalid === "true" && z.amFeld === MELDUNG[o.art], "Liste: " + r.fehler.join(" | ") + "; am Feld: " + z.amFeld);
    await tippe(page, sel, o.gut);
  };
  const weiterOk = async (page, gruppe) => {
    const r = await klickeWeiter(page, await stand(page));
    ok(gruppe + ": mit gültigem Text (Ł, ü, ç, Ş, ’, „ “, –) geht es weiter", r.gewechselt && r.fehler.length === 0, r.fehler.join(" | "));
    return r;
  };
  const wahl = (page, pfad, wert) => klickeEtikett(page, '#anmeldung input[data-pfad="' + pfad + '"][data-wert="' + wert + '"]');

  // ---- Wechsel in Hessen: alter Verein, Anschrift des alten Vereins, Kontakt, Notfallkontakt ----
  const p1 = await seiteMitBeispiel(browser, server, MOBIL, "freitext-wechsel", "wechsel-hessen", null);
  let s = await geheBis(p1, "alter_verein");
  ok("Alter Verein: Seite erreicht", s.schritt === "alter_verein", s.schritt + "/" + s.teil);
  const G1 = "Alter Verein";
  await fall(p1, G1, { pfad: "alterVerein.name", art: "verein", vorsatz: wb.alterVerein.name, gut: "Türkgücü Şişli e. V." });
  await fall(p1, G1, { pfad: "alterVerein.ort", art: "verein", vorsatz: wb.alterVerein.ort, gut: "Łódź" });
  // Der Verband wird nur gefragt, wenn der alte Verein nicht in Hessen war.
  await wahl(p1, "alterVerein.region", "bundesland");
  await fall(p1, G1, { pfad: "alterVerein.verband", art: "verein", vorsatz: wb.alterVerein.verband, gut: "Fußball-Verband Mittelrhein" });
  // Ein Verband aus der früheren Wahl darf nichts blockieren und nicht im PDF landen, wenn der Verein doch in Hessen war.
  await tippe(p1, '#anmeldung [data-pfad="alterVerein.verband"]', ARABISCH_TEXT);
  await wahl(p1, "alterVerein.region", "hessen");
  const weg = await weiterOk(p1, G1 + " (Region wieder Hessen, Verband mit arabischer Schrift ist ausgeblendet)");
  await p1.click('#anmeldung [data-aktion="zurueck"]');
  await p1.waitForFunction(() => document.getElementById("anmeldung").dataset.schritt === "alter_verein", { timeout: 4000 });
  await wahl(p1, "alterVerein.region", "bundesland");
  const verband = await p1.$eval('#anmeldung [data-pfad="alterVerein.verband"]', (e) => e.value);
  ok("Alter Verein: der ausgeblendete Verband wurde beim Verlassen geleert (kein '?' im PDF, das niemand sieht)", weg.gewechselt && verband === "", "Verband: '" + verband + "'");
  await wahl(p1, "alterVerein.region", "hessen");

  s = await geheBis(p1, "abmeldung", "anschrift");
  ok("Anschrift des alten Vereins: Seite 'abmeldung/anschrift' erreicht", s.schritt === "abmeldung" && s.teil === "anschrift", s.schritt + "/" + s.teil);
  const G2 = "Anschrift des alten Vereins";
  await fall(p1, G2, { pfad: "alterVerein.empfaenger", art: "anschrift", vorsatz: wb.abmeldung.anschrift.empfaenger, gut: "Vorstand des SV Café Çelik" });
  await fall(p1, G2, { pfad: "alterVerein.strasse", art: "anschrift", vorsatz: wb.abmeldung.anschrift.strasse, gut: "Rue de l’Église 5" });
  await fall(p1, G2, { pfad: "alterVerein.plzOrt", art: "anschrift", vorsatz: wb.abmeldung.anschrift.plzOrt, gut: "75005 Paris" });
  await weiterOk(p1, G2);

  s = await geheBis(p1, "kontakt", "erreichen");
  ok("Kontakt: Seite 'kontakt/erreichen' erreicht", s.schritt === "kontakt" && s.teil === "erreichen", s.schritt + "/" + s.teil);
  const G3 = "Kontakt";
  await fall(p1, G3, { pfad: "email", art: "text", vorsatz: wb.kontakt.erreichen.email, wert: ARABISCH_MAIL, gut: "josé.muñoz@example.org" });
  await fall(p1, G3, { pfad: "mobil", art: "nummer", vorsatz: wb.kontakt.erreichen.mobil, wert: ARABISCH_ZIFFERN, gut: "+49 176 04069063" });
  await fall(p1, G3, { pfad: "telefon", art: "nummer", vorsatz: wb.kontakt.erreichen.telefon, wert: ARABISCH_ZIFFERN, gut: "069 90009001" });
  await weiterOk(p1, G3);

  s = await geheBis(p1, "notfall", "kontakt");
  ok("Notfallkontakt: Seite 'notfall/kontakt' erreicht", s.schritt === "notfall" && s.teil === "kontakt", s.schritt + "/" + s.teil);
  const G4 = "Notfallkontakt";
  // 'Wer ist das?' ist eine Frage und taugt nicht als Vorsatz: Der Eintrag steht ohne Feldnamen da (die Meldung ist auf der Seite einmalig).
  await fall(p1, G4, { pfad: "notfall.beziehung", art: "text", vorsatz: "", gut: "Großmutter (Oma)" });
  await fall(p1, G4, { pfad: "notfall.telefon", art: "nummer", vorsatz: wb.notfall.kontakt.telefon, wert: ARABISCH_ZIFFERN, gut: "0176 04069099" });
  await weiterOk(p1, G4);
  await p1.close();

  // ---- Kind neu: Bank (ohne BIC), Gesundheitsangaben ----
  const p2 = await seiteMitBeispiel(browser, server, MOBIL, "freitext-kind", "kind-neu", null);
  s = await geheBis(p2, "zahlung", "iban");
  ok("Bank: Seite 'zahlung/iban' erreicht", s.schritt === "zahlung" && s.teil === "iban", s.schritt + "/" + s.teil);
  const G5 = "Bank";
  ok("Bank: das Feld BIC entfällt (SEPA-Lastschrift in Euro braucht nur die IBAN); IBAN und Name der Bank bleiben", (await p2.$('[data-pfad="zahlung.bic"]')) === null && (await p2.$('[data-pfad="zahlung.iban"]')) !== null && (await p2.$('[data-pfad="zahlung.bank"]')) !== null, "");
  await fall(p2, G5, { pfad: "zahlung.bank", art: "text", vorsatz: wb.zahlung.iban.bank, gut: "Sparkasse Köln/Bonn" });
  await weiterOk(p2, G5);
  s = await geheBis(p2, "notfall", "bogen");
  await wahl(p2, "gesundheitsbogen", "true");
  const b = await klickeWeiter(p2, await stand(p2));
  s = await stand(p2);
  ok("Gesundheitsangaben: Seite 'notfall/gesundheit' erreicht (Bogen mit Ja)", b.gewechselt && s.schritt === "notfall" && s.teil === "gesundheit", s.schritt + "/" + s.teil);
  const G6 = "Gesundheitsangaben";
  const g = wb.notfall.gesundheit;
  await fall(p2, G6, { pfad: "gesundheit.allergien", art: "text", vorsatz: g.allergien, gut: "Nüsse, Pollen (Birke) – Spray bei Bedarf" });
  await fall(p2, G6, { pfad: "gesundheit.erkrankungen", art: "text", vorsatz: g.erkrankungen, gut: "Asthma; İbuprofen 400 mg nur nach Absprache" });
  await fall(p2, G6, { pfad: "gesundheit.medikamente", art: "text", vorsatz: g.medikamente, gut: "Ventolin® Spray, „eine Hübe morgens“" });
  await fall(p2, G6, { pfad: "gesundheit.sonstiges", art: "text", vorsatz: g.sonstiges, gut: "Größe 1,20 m — häufig müde" });
  // Alle vier Felder zugleich: vier Einträge mit gleicher Meldung, aber je eigenem Feldnamen davor.
  const gute = { allergien: "Nüsse, Pollen (Birke) – Spray bei Bedarf", erkrankungen: "Asthma; İbuprofen 400 mg nur nach Absprache", medikamente: "Ventolin® Spray, „eine Hübe morgens“", sonstiges: "Größe 1,20 m — häufig müde" };
  for (const name of Object.keys(gute)) await tippe(p2, '#anmeldung [data-pfad="gesundheit.' + name + '"]', ARABISCH_TEXT);
  const alle = await klickeWeiter(p2, await stand(p2));
  const erwarteteAlle = [g.allergien, g.erkrankungen, g.medikamente, g.sonstiges].map((n) => n + ": " + MELDUNG.text);
  ok(G6 + ": alle vier Felder mit arabischer Schrift ergeben vier Einträge, jeder mit seinem Feldnamen davor", !alle.gewechselt && JSON.stringify(alle.fehler) === JSON.stringify(erwarteteAlle), alle.fehler.join(" | "));
  await p2.screenshot({ path: path.join(AUSGABE, MOBIL.name, "fehler-gesundheit.png"), fullPage: false });
  protokoll.screenshots++;
  for (const [name, wert] of Object.entries(gute)) await tippe(p2, '#anmeldung [data-pfad="gesundheit.' + name + '"]', wert);
  await weiterOk(p2, G6);
  await p2.close();

  // ---- Kind ohne deutschen Pass: Stadt im Ausland ----
  const p3 = await seiteMitBeispiel(browser, server, MOBIL, "freitext-ausland", "ausland-kind", null);
  s = await geheBis(p3, "ausland");
  ok("Ausland: Seite 'ausland' erreicht", s.schritt === "ausland", s.schritt + "/" + s.teil);
  await fall(p3, "Stadt im Ausland", { pfad: "auslandStadt", art: "text", vorsatz: wb.ausland.stadt, gut: "Kraków" });
  await weiterOk(p3, "Stadt im Ausland");
  await p3.close();

  // ---- Fehlerliste bei mehreren Personen: der Gruppenname steht mit vor dem Feldnamen ----
  const p4 = await seiteMitBeispiel(browser, server, MOBIL, "freitext-personen", "kind-neu", null);
  s = await geheBis(p4, "sorge", "personen");
  await tippe(p4, '#anmeldung [data-pfad="sorgeberechtigte.0.vorname"]', ARABISCH_TEXT);
  await tippe(p4, '#anmeldung [data-pfad="sorgeberechtigte.1.vorname"]', ARABISCH_TEXT);
  const r4 = await klickeWeiter(p4, await stand(p4));
  const M = wb.fehler.lateinisch;
  ok("Fehlerliste (Sorgeberechtigte): gleiche Felder zweier Personen sind unterscheidbar ('Ihre Angaben – Vorname: …', 'Zweite Person – Vorname: …')", !r4.gewechselt && r4.fehler.length === 2 && r4.fehler[0] === "Ihre Angaben – Vorname: " + M && r4.fehler[1] === "Zweite Person – Vorname: " + M, r4.fehler.join(" | "));
  // Die Beschriftung der Rolle ist eine Frage ('Wer ist das?') und taugt nicht als Vorsatz: Es gilt der Gruppenname.
  await tippe(p4, '#anmeldung [data-pfad="sorgeberechtigte.0.vorname"]', "Lena");
  await tippe(p4, '#anmeldung [data-pfad="sorgeberechtigte.1.vorname"]', "Jonas");
  await p4.select('#anmeldung [data-pfad="sorgeberechtigte.0.rolle"]', "");
  await p4.select('#anmeldung [data-pfad="sorgeberechtigte.1.rolle"]', "");
  const r5 = await klickeWeiter(p4, await stand(p4));
  ok("Fehlerliste (Sorgeberechtigte): zwei gleiche Meldungen zur Rolle tragen den Gruppennamen ('Ihre Angaben: …', 'Zweite Person: …'), weil 'Wer ist das?' eine Frage ist", !r5.gewechselt && r5.fehler.length === 2 && r5.fehler[0] === "Ihre Angaben: " + wb.fehler.rolle && r5.fehler[1] === "Zweite Person: " + wb.fehler.rolle, r5.fehler.join(" | "));
  await p4.close();
}

// Ganz schmale Bildschirme (320 und 360 Punkte): Der Kopf mit Knopf 'Vorführung' läuft nicht über, die h1 wird nicht abgeschnitten.
async function pruefeKopfSchmal(browser, server) {
  console.log("\n=== Runde 4: Kopf mit Knopf 'Vorführung' auf schmalen Bildschirmen ===");
  for (const breite of [320, 360]) {
    const vp = { name: breite + "x640", breite, hoehe: 640, mobil: true };
    const page = await seiteMitBeispiel(browser, server, vp, "kopf-schmal-" + breite, "kind-neu", "name");
    const m = await page.evaluate(() => {
      const h = document.querySelector("h1");
      const k = document.querySelector("[data-anm-vorfuehrung]");
      const hr = h.getBoundingClientRect();
      const kr = k.getBoundingClientRect();
      return { scroll: document.documentElement.scrollWidth, innen: window.innerWidth, h1Abgeschnitten: h.scrollWidth > h.clientWidth + 1, h1Hoehe: Math.round(hr.height), knopfHoehe: Math.round(kr.height), knopfRechts: Math.round(kr.right), knopfSichtbar: kr.width > 0, ueberlappt: hr.right > kr.left + 1 && hr.bottom > kr.top && hr.top < kr.bottom };
    });
    ok("Schmaler Bildschirm " + vp.name + ": kein Querscrollen, Knopf 'Vorführung' ganz im Bild, h1 nicht abgeschnitten und nicht über dem Knopf", m.knopfSichtbar && m.scroll <= m.innen && m.knopfRechts <= m.innen && !m.h1Abgeschnitten && !m.ueberlappt && m.knopfHoehe >= 44, JSON.stringify(m));
    await page.close();
  }
}

// Knopf "Vorführung" im kompakten Kopf: Vereinssicht und Beispiele sind auf jedem Schritt erreichbar.
async function pruefeVorfuehrungKnopf(browser, server) {
  console.log("\n=== Runde 4: Knopf 'Vorführung' im kompakten Kopf ===");
  for (const vp of OHNE_DESKTOP ? [MOBIL] : [MOBIL, DESKTOP]) {
    const n = "Vorführung (" + vp.name + ")";
    const page = await seiteMitBeispiel(browser, server, vp, "vorfuehrung-" + vp.name, "wechsel-hessen", null);
    const zustand = () =>
      page.evaluate(() => {
        const sichtbar = (e) => !!e && e.getClientRects().length > 0;
        const knopf = document.querySelector("[data-anm-vorfuehrung]");
        const schalter = document.querySelector("[data-anm-vereinssicht]");
        return {
          schritt: document.getElementById("anmeldung").dataset.schritt,
          knopf: sichtbar(knopf),
          text: knopf.textContent.trim(),
          expanded: knopf.getAttribute("aria-expanded"),
          ziel: !!document.getElementById(knopf.getAttribute("aria-controls")),
          kasten: sichtbar(document.querySelector(".anm-werkzeugkasten")),
          schalter: sichtbar(schalter),
          schalterText: schalter.textContent.trim(),
          gedrueckt: schalter.getAttribute("aria-pressed"),
          beispiele: Array.from(document.querySelectorAll("[data-beispiel]")).filter(sichtbar).length,
          verein: document.getElementById("anmeldung").classList.contains("anm--verein"),
          hinweise: Array.from(document.querySelectorAll("#anmeldung .anm-vereinshinweis")).filter(sichtbar).length,
          meldung: (document.querySelector(".anm-meldung") || {}).textContent || "",
        };
      });
    const z0 = await zustand();
    ok(n + ": auf 'start' gibt es den Knopf nicht (der Werkzeugkasten steht selbst da)", z0.schritt === "start" && !z0.knopf && z0.kasten, JSON.stringify({ knopf: z0.knopf, kasten: z0.kasten }));
    await geheBis(page, "nachweise");
    const z1 = await zustand();
    ok(n + ": auf 'nachweise' steht der Knopf 'Vorführung' im Kopf; er ist zu, der Werkzeugkasten verborgen, das Ziel von aria-controls gibt es", z1.schritt === "nachweise" && z1.knopf && z1.text === "Vorführung" && z1.expanded === "false" && z1.ziel && !z1.kasten && z1.hinweise === 0 && !z1.verein, JSON.stringify(z1));
    if (vp.mobil) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: path.join(AUSGABE, vp.name, "vorfuehrung-zu.png"), fullPage: false });
      protokoll.screenshots++;
    }
    await page.click("[data-anm-vorfuehrung]");
    const z2 = await zustand();
    ok(n + ": ein Klick öffnet den Werkzeugkasten mit Vereinssicht und den 5 Beispielen (aria-expanded=true)", z2.expanded === "true" && z2.kasten && z2.schalter && z2.beispiele === 5 && z2.schalterText === "Hinweise für den Verein einblenden", JSON.stringify(z2));
    if (vp.mobil) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: path.join(AUSGABE, vp.name, "vorfuehrung-offen.png"), fullPage: false });
      protokoll.screenshots++;
    }
    await axePruefen(page, vp.name + " Vorführung offen (nachweise)");
    // Vereinssicht einschalten, Werkzeugkasten wieder schließen: Auf dieser Seite sind jetzt die Kästen für den Verein zu sehen.
    await page.click("[data-anm-vereinssicht]");
    const z3 = await zustand();
    ok(n + ": die Vereinssicht lässt sich auf diesem Schritt einschalten (Schalter gedrückt, Beschriftung wechselt)", z3.verein && z3.gedrueckt === "true" && /ausblenden/.test(z3.schalterText), z3.schalterText);
    await page.click("[data-anm-vorfuehrung]");
    const z4 = await zustand();
    ok(n + ": ein zweiter Klick schließt den Werkzeugkasten; die Kästen für den Verein stehen auf 'nachweise' da", z4.expanded === "false" && !z4.kasten && z4.verein && z4.hinweise > 0, "Kästen für den Verein: " + z4.hinweise);
    // Tastatur: Enter am Knopf
    await page.focus("[data-anm-vorfuehrung]");
    await page.keyboard.press("Enter");
    const zt1 = await zustand();
    await page.keyboard.press("Enter");
    const zt2 = await zustand();
    ok(n + ": mit der Tastatur bedienbar (Enter öffnet, Enter schließt)", zt1.expanded === "true" && zt1.kasten && zt2.expanded === "false" && !zt2.kasten, zt1.expanded + " / " + zt2.expanded);
    // Seitenwechsel schließt den Werkzeugkasten, die Vereinssicht bleibt.
    await page.click("[data-anm-vorfuehrung]");
    const r = await klickeWeiter(page, await stand(page));
    const z5 = await zustand();
    ok(n + ": nach dem Weiter ist der Werkzeugkasten zu, die Vereinssicht bleibt an", r.gewechselt && z5.expanded === "false" && !z5.kasten && z5.verein && z5.knopf, JSON.stringify({ schritt: z5.schritt, expanded: z5.expanded, verein: z5.verein }));
    // Auf der Prüfseite ausschalten
    await geheBis(page, "pruefen");
    const z6 = await zustand();
    ok(n + ": auf 'pruefen' steht der Knopf ebenfalls da; die Kästen für den Verein sind sichtbar", z6.schritt === "pruefen" && z6.knopf && z6.hinweise > 0, "Kästen für den Verein: " + z6.hinweise);
    await page.click("[data-anm-vorfuehrung]");
    await page.click("[data-anm-vereinssicht]");
    const z7 = await zustand();
    ok(n + ": auf 'pruefen' lässt sich die Vereinssicht wieder ausschalten", !z7.verein && z7.gedrueckt === "false" && /einblenden/.test(z7.schalterText) && z7.hinweise === 0, z7.schalterText);
    // Beispiel laden aus dem kompakten Kopf: zurück auf 'start', Knopf weg, Werkzeugkasten da.
    await page.click('[data-beispiel="kind-neu"]');
    await page.waitForFunction(() => document.getElementById("anmeldung").dataset.schritt === "start", { timeout: 4000 });
    const z8 = await zustand();
    ok(n + ": ein Beispiel aus dem Werkzeugkasten laden führt zurück auf 'start' ('Beispiel geladen: Kind neu (F-Jugend).')", z8.schritt === "start" && !z8.knopf && z8.kasten && /Beispiel geladen: Kind neu/.test(z8.meldung), z8.meldung);
    if (vp.mobil) {
      // Sprachwechsel: Der Knopf gehört zur Vorführung und bleibt deutsch.
      await geheBis(page, "name");
      await page.select("#anm-sprache", "ar");
      await page.waitForFunction(() => document.getElementById("anmeldung").getAttribute("dir") === "rtl", { timeout: 5000 });
      const za = await zustand();
      await page.click("[data-anm-vorfuehrung]");
      const zb = await zustand();
      ok(n + ": auch in der Sprache Arabisch bleibt der Knopf deutsch ('Vorführung') und funktioniert", za.knopf && za.text === "Vorführung" && zb.expanded === "true" && zb.kasten, za.text + " / " + zb.expanded);
    }
    await page.close();
  }
}

async function main() {
  console.log("Ende-zu-Ende-Test Anmelde-Assistent – " + new Date().toISOString().slice(0, 19) + "\n");
  fs.rmSync(AUSGABE, { recursive: true, force: true });
  fs.mkdirSync(AUSGABE, { recursive: true });
  for (const vp of [MOBIL, DESKTOP]) fs.mkdirSync(path.join(AUSGABE, vp.name), { recursive: true }); // auch bei --nur=… für die Bildschirmfotos

  // ---- 1. Texte und Bausteine ohne Browser ----
  const woerterbuch = await ladeWoerterbuch();
  const sprache = pruefeEinfacheSprache(woerterbuch);
  ok("Einfache Sprache: kein Satz über 12 Wörter, keine Abkürzungen", sprache.verstoesse.length === 0, sprache.anzahlSaetze + " Sätze, längster Satz " + sprache.laengster.woerter + " Wörter (" + sprache.laengster.pfad + ")");
  for (const v of sprache.verstoesse.slice(0, 10)) info(v.pfad + ": " + v.art + " – " + v.text);
  const fehlendeTexte = fehlendeSchluessel(woerterbuch);
  ok("Textschlüssel im Quelltext sind alle vorhanden", fehlendeTexte.length === 0, fehlendeTexte.map((f) => f.schluessel).join(", "));
  const seitenModul = await import(pathToFileURL(path.join(ROOT, "assets", "js", "anmeldung", "seiten.js")).href);
  const schluesselSeiten = Object.keys(seitenModul.SEITEN);
  const fehlendeSeiten = SCHRITTE.filter((id) => !schluesselSeiten.includes(id) || typeof seitenModul.SEITEN[id].render !== "function" || typeof seitenModul.SEITEN[id].pruefe !== "function");
  ok("Alle 27 Schritte haben eine Seite (render und pruefe)", fehlendeSeiten.length === 0 && schluesselSeiten.length === 27, fehlendeSeiten.join(", ") || schluesselSeiten.length + " Seiten");
  const quellen = fs.readdirSync(path.join(ROOT, "assets", "js", "anmeldung")).filter((f) => f.endsWith(".js"));
  const verboten = [];
  const fetchStellen = [];
  for (const f of quellen) {
    const text = fs.readFileSync(path.join(ROOT, "assets", "js", "anmeldung", f), "utf8");
    if (/localStorage|sessionStorage|indexedDB|document\.cookie|XMLHttpRequest|sendBeacon/.test(text)) verboten.push(f);
    for (const m of text.matchAll(/fetch\(([^)]*)\)/g)) fetchStellen.push(f + ": fetch(" + m[1].slice(0, 60) + ")");
  }
  ok("Keine Speicher- und Sende-Schnittstellen im Quelltext", verboten.length === 0, verboten.join(", "));
  ok("fetch nur mit Adressen der eigenen Seite", fetchStellen.every((s) => !/https?:\/\//.test(s)), fetchStellen.length + " Stelle(n)");
  if (NUR_SPRACHE) return;

  // ---- 2. Server und Browser ----
  const server = await starteTestserver();
  console.log("\nServer: " + server.basis + " (docs/)");
  const st = server.status;
  info("Regelwerk regeln.js + data/anmeldung.json: " + (st.regeln ? "echt" : "ATTRAPPE"));
  info("Regeltexte de-regeln.js: " + (st.deRegeln ? "echt" : "ATTRAPPE"));
  info("PDF-Baustein pdf.js: " + (st.pdf ? "echt (der Testserver zeichnet die Aufrufe auf)" : "ATTRAPPE"));
  info("Formulardaten und Vorlagen-PDF: " + (st.formulare ? "echt" : "ATTRAPPE"));
  info("Übersetzung Arabisch: " + (st.ar ? "echt" : "ATTRAPPE") + ", Englisch: " + (st.en ? "echt" : "fehlt (nicht getestet)"));
  protokoll.echt = st;

  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-first-run"] });
  try {
    const dateien = await erzeugeTestdateien(browser);
    const beispiele = await import(pathToFileURL(path.join(ROOT, "assets", "js", "anmeldung", "beispiele.js")).href);

    const ids = beispiele.BEISPIELE.map((b) => b.id);
    const alleSchritte = new Set();
    if (!NUR.length) {
      // ---- 3. Beispiel-Profile per Knopf ----
      for (const vp of OHNE_DESKTOP ? [MOBIL] : [MOBIL, DESKTOP]) {
        console.log("\n=== Beispiel-Profile, " + vp.name + " ===");
        const gesehen = gesehenFuer(vp);
        for (const id of ids) {
          const page = await neueSeite(browser, server, vp, "beispiel-" + id + "-" + vp.name);
          const ctx = neuerKontext({ name: id, vp, modus: "beispiel", gesehen, touch: vp.mobil, axeImmer: vp.mobil, dateien, ohneZweite: id === "kind-neu" });
          await ladeBeispielPerKnopf(page, id);
          const r = await laufe(page, ctx);
          const ende = r.besucht[r.besucht.length - 1];
          const erreicht = ende.startsWith("fertig");
          const daten = erreicht ? await ergebnisPruefen(page, ctx, dateien) : null;
          ok("Profil " + id + " (" + vp.name + ") bis 'fertig' durchgeklickt, Datei erstellt", erreicht && !!daten, r.besucht.length + " Seiten: " + Array.from(new Set(r.besucht.map((x) => x.split("/")[0]))).join(" › "));
          r.besucht.forEach((b) => alleSchritte.add(b.split("/")[0]));
          protokoll.profile.push({ name: id, viewport: vp.name, modus: "beispiel", seiten: r.besucht, datei: daten && daten.dateiname });
          if (daten) {
            const nachweis = await unterschriftenNachweisen(page, ctx, daten);
            const uKeys = daten.attrappe ? Object.keys(daten.attrappe.unterschriften || {}).join(", ") : "";
            ok("Profil " + id + " (" + vp.name + "): Unterschriften (" + (vp.mobil ? "Maus im Handy-Fenster" : "Maus") + ") liegen in bilder.unterschriften und erreichen den PDF-Baustein", nachweis.ok && (ctx.unterschriftenGezeichnet || 0) > 0, "angeboten: " + (ctx.unterschriftFelder || []).join(", ") + "; gezeichnet: " + (ctx.unterschriftGezeichnetIn || []).join(", ") + (uKeys ? "; an den PDF-Baustein übergeben: " + uKeys : "") + (nachweis.ok ? "" : " – " + nachweis.detail));
          }
          if (daten && daten.attrappe && daten.attrappe.ergebnis) {
            // Zeigt die Ergebnisseite, was der PDF-Baustein geliefert hat (Teile, Seitenzahl)?
            const erg = daten.attrappe.ergebnis;
            const teile = Array.isArray(erg.teile) ? erg.teile : [];
            ok("Profil " + id + " (" + vp.name + "): Ergebnisseite nennt die Teile der Datei und die Seitenzahl", daten.teileAnzeige === teile.length && new RegExp("^" + erg.seiten + " Seiten").test(daten.infoZeile), "angezeigt: " + daten.teileAnzeige + " Teil(e), '" + daten.infoZeile + "'; geliefert: " + (teile.map((x) => x.teil).join("") || "keine") + ", " + erg.seiten + " Seiten");
            // Die Titel stehen im Wörterbuch (fertig.teilTitel.A/B/C), mit Buchstaben; die Seitenbereiche kommen aus erzeugePdf().
            const titel = { A: "Teil A – Für Sie", B: "Teil B – Für den Verein", C: "Teil C – Vertraulich, getrennt abgeben" };
            ok("Profil " + id + " (" + vp.name + "): Teile heißen 'Teil A – Für Sie', 'Teil B – Für den Verein', 'Teil C – Vertraulich, getrennt abgeben', dazu die Seiten aus pdf.js", teile.length > 0 && daten.teileTexte.length === teile.length && teile.every((x, i) => daten.teileTexte[i] === titel[x.teil] + " (Seite " + x.vonSeite + " bis " + x.bisSeite + ")"), daten.teileTexte.join(" | "));
          }
          if (daten) {
            // Hinweis-Kästen auf 'pruefen' und 'fertig': offen nur Warnungen und Fristen, alles andere zugeklappt.
            // Für das Beispiel kind-neu gilt zusätzlich: höchstens 4 offene Kästen.
            const regeln = await ladeRegeln();
            const befund = (daten.attrappe && daten.attrappe.a) || beispiele.beispielAntworten(id, HEUTE, server.konfig);
            const e = regeln.auswerten(befund, server.konfig, HEUTE);
            const grenze = id === "kind-neu" ? 4 : 0;
            const pdf = await pdfHerunterladenUndPruefen(browser, server, page, "Profil " + id + " (" + vp.name + ")", daten, { satzungOffen: false });
            if (pdf) PDF_ERGEBNISSE.set(id + "|" + vp.name, pdf);
            const domFertig = await hinweiseImDom(page);
            hinweiseAuswerten("Profil " + id + " (" + vp.name + ") auf 'fertig'", domFertig, e, grenze);
            hinweiseAuswerten("Profil " + id + " (" + vp.name + ") auf 'pruefen'", ctx.pruefenDom, e, grenze);
            if (id === "kind-neu") {
              // Der Aufklapper öffnet sich per Klick: alle übrigen Kästen werden sichtbar.
              await page.click("#anmeldung details.anm-weitere > summary");
              const offenDom = await hinweiseImDom(page);
              ok("Profil " + id + " (" + vp.name + "): Klick auf 'Weitere Hinweise' zeigt alle " + domFertig.aufklapperAnzahl + " übrigen Kästen", offenDom.aufklapperZu === false && offenDom.inZuGesehen === domFertig.aufklapperAnzahl, offenDom.inZuGesehen + " sichtbar");
              await page.screenshot({ path: path.join(AUSGABE, vp.name, "fertig-hinweise-offen.png"), fullPage: true });
              protokoll.screenshots++;
              await page.click("#anmeldung details.anm-weitere > summary");
            }
          }
          ok("Profil " + id + " (" + vp.name + "): Fokus liegt nach jedem Weiter auf der Überschrift", ctx.fokusFehler.length === 0, ctx.fokusFehler.slice(0, 3).join("; "));
          kopfAuswerten("Profil " + id + " (" + vp.name + ")", ctx);
          if (vp.mobil) {
            ok("Profil " + id + " (" + vp.name + "): kein Querscrollen", ctx.querScroll.length === 0, ctx.querScroll.slice(0, 3).join("; "));
            ok("Profil " + id + " (" + vp.name + "): Tippflächen mindestens 44 px", ctx.kleineFlaechen.size === 0, Array.from(ctx.kleineFlaechen).slice(0, 4).join(" | "));
          }
          await speicherPruefung(page, "Profil " + id + " (" + vp.name + ")");
          ok("Profil " + id + " (" + vp.name + "): keine Fehler in der Konsole", page.__st.konsole.length === 0, page.__st.konsole.slice(0, 3).join(" | "));
          ok("Profil " + id + " (" + vp.name + "): keine fehlgeschlagenen Anfragen", page.__st.antworten.length === 0, page.__st.antworten.slice(0, 3).join(" | "));
          await page.close();
        }
      }

      // ---- 3b. Alles auf Papier (unterschriftWeg = papier) ----
      await papierLaeufe(browser, server, dateien, beispiele, alleSchritte);

      // ---- 4. Echte Eingabe ----
      await eingabeLaeufe(browser, server, dateien, beispiele, alleSchritte);
    }

    // ---- 5. Einzelprüfungen ----
    await einzelpruefungen(browser, server, dateien, beispiele);

    // ---- 6. Gesamtauswertung (nur beim vollen Lauf) ----
    if (!NUR.length) {
      const fehlendeAbdeckung = SCHRITTE.filter((id) => !alleSchritte.has(id));
      ok("Alle 27 Schritte wurden im Browser besucht", fehlendeAbdeckung.length === 0, fehlendeAbdeckung.length ? "fehlen: " + fehlendeAbdeckung.join(", ") : Array.from(alleSchritte).length + " Schritte");
      const fremde = Array.from(protokoll.hosts).filter((h) => !/^127\.0\.0\.1:\d+$/.test(h));
      ok("Keine Anfrage an fremde Hosts", fremde.length === 0, "Hosts: " + Array.from(protokoll.hosts).join(", "));
      ok("Keine fehlenden Texte (Warnung 'Text fehlt') zur Laufzeit", protokoll.textFehlt.size === 0, Array.from(protokoll.textFehlt).slice(0, 5).join(" | "));
      const schwer = protokoll.axe.filter((a) => a.schwer > 0);
      ok("axe-core: keine Verstöße critical/serious auf " + protokoll.axe.length + " geprüften Ansichten", schwer.length === 0, schwer.map((a) => a.seite).slice(0, 5).join(", "));
    }
  } finally {
    await browser.close();
    await server.stop();
  }

  fs.writeFileSync(path.join(AUSGABE, "bericht.json"), JSON.stringify({ ...protokoll, hosts: Array.from(protokoll.hosts), textFehlt: Array.from(protokoll.textFehlt) }, null, 2));
  console.log("\n=== Zusammenfassung ===");
  console.log("Prüfungen: " + protokoll.pruefungen.length + ", Fehler: " + fehlerAnzahl);
  console.log("Bildschirmfotos: " + protokoll.screenshots + " in " + path.relative(ROOT, AUSGABE));
  console.log("Bericht: " + path.relative(ROOT, path.join(AUSGABE, "bericht.json")));
  for (const p of protokoll.pruefungen.filter((x) => !x.ok)) console.log("  FEHLER: " + p.name + (p.detail ? " – " + p.detail : ""));
  const offen = protokoll.pruefungen.filter((x) => x.weich);
  console.log("Offen bei anderen Paketen (zählt nicht als Fehler): " + offen.length);
  for (const p of offen) console.log("  OFFEN: " + p.name + (p.detail ? " – " + p.detail : ""));
  if (fehlerAnzahl) {
    console.log("\ne2e.mjs: FEHLGESCHLAGEN");
    process.exit(1);
  }
  console.log("\ne2e.mjs: alle Prüfungen bestanden.");
}

// Nach dem Durchlauf: Prüfseite und PDF – kommen die Unterschriften an?
async function unterschriftenNachweisen(page, ctx, daten) {
  const feldNamen = ctx.unterschriftFelder || [];
  if (!feldNamen.length) return { ok: true, detail: "keine Felder" };
  const a = daten.attrappe;
  if (a) {
    const unterschriften = a.unterschriften || {};
    const erwartet = feldNamen.filter((w) => !(ctx.ohneZweite && w === "sorgeberechtigte_2"));
    const fehlt = erwartet.filter((w) => !unterschriften[w] || !unterschriften[w].png);
    const zuviel = ctx.ohneZweite ? Object.keys(unterschriften).filter((w) => w === "sorgeberechtigte_2") : [];
    return { ok: fehlt.length === 0 && zuviel.length === 0, detail: "fehlt in bilder.unterschriften: " + fehlt.join(",") + (zuviel.length ? "; unerwartet: " + zuviel.join(",") : "") };
  }
  return { ok: true, detail: "Attrappe nicht aktiv" };
}

async function speicherPruefung(page, name) {
  const r = await page.evaluate(async () => {
    const dbs = indexedDB.databases ? await indexedDB.databases() : [];
    return { local: localStorage.length, session: sessionStorage.length, cookie: document.cookie, dbs: dbs.length };
  });
  const cookies = await page.cookies();
  ok(name + ": nichts gespeichert (localStorage, sessionStorage, Cookies, IndexedDB)", r.local === 0 && r.session === 0 && r.cookie === "" && cookies.length === 0 && r.dbs === 0, JSON.stringify({ ...r, cookies: cookies.length }));
}

// ---------- Echte Eingabe ----------

function profilKindNeu(beispiele, server) {
  return beispiele.beispielAntworten("kind-neu", HEUTE, server.konfig);
}

// Zweite Person derselben Familie: ohne Adresse, Kontakt, Eltern, Zahlung –
// die übernimmt "Weitere Person anmelden".
function profilGeschwister(beispiele) {
  const s = beispiele.spieljahrStart(HEUTE);
  return {
    wer: "kind",
    vorname: "Ben",
    nachname: "Mustermann",
    geburtsdatum: s - 10 + "-11-02",
    geburtsort: "Frankfurt am Main",
    geburtsland: "DE",
    geschlecht: "m",
    abteilung: "fussball",
    spielen: true,
    spielerpass: "nein",
    deutsch: "ja",
    staaten: ["DE"],
    auslandGewohnt: "nein",
    einwilligungen: { fotos: "nein", medien: [], hfvName: true, hfvFoto: false, fahrten: true, messenger: true },
    notfall: { name: "Erika Beispiel", telefon: "0176 04069087", beziehung: "Oma" },
    gesundheitsbogen: false,
    spielerfoto: { weg: "verein" },
    leistungen: "nein",
  };
}

// Mädchen in der C-Jugend, nicht deutsch, Eltern getrennt: zeigt "wohnen", "besonderes",
// Foto, Nachweise, Gesundheitsbogen, Rechnung.
function profilMaedchenC(beispiele) {
  const s = beispiele.spieljahrStart(HEUTE);
  return {
    wer: "kind",
    vorname: "Nele",
    nachname: "Mustermann",
    geburtsdatum: s - 14 + "-06-05",
    geburtsort: "Musterstadt",
    geburtsland: "UA",
    geschlecht: "w",
    abteilung: "fussball",
    spielen: true,
    spielerpass: "nein",
    deutsch: "nein",
    staaten: ["UA"],
    auslandGewohnt: "ja",
    auslandLand: "UA",
    auslandStadt: "Musterstadt",
    wohnen: "gemeinsam",
    wohnenSeit: "2023-03-01",
    sorge: "getrennt_bei_mir",
    andererElternteilEinverstanden: true,
    sorgeberechtigte: [{ rolle: "mutter", vorname: "Olena", nachname: "Mustermann" }],
    besonderes: { maedchenJungenteam: true, herrenAushilfe: false, sonderspielrecht: false, frauHerren: false },
    anschrift: { strasse: "Musterweg 7", plz: "60326", ort: "Frankfurt am Main" },
    email: "olena.mustermann@example.org",
    mobil: "0176 04069021",
    telefon: "",
    leistungen: "ja",
    zahlung: { art: "rechnung" },
    einwilligungen: { fotos: "ja", medien: ["intern", "presse"], hfvName: true, hfvFoto: true, fahrten: true, messenger: false },
    notfall: { name: "Iryna Beispiel", telefon: "0176 04069033", beziehung: "Tante" },
    gesundheitsbogen: true,
    gesundheit: { allergien: "Pollen", erkrankungen: "", medikamente: "Asthmaspray", sonstiges: "" },
    spielerfoto: { weg: "foto" },
    unterschriftWeg: "bildschirm",
    hfvUnterschrift: "selbst_drucken",
  };
}

async function eingabeLaeufe(browser, server, dateien, beispiele, alleSchritte) {
  console.log("\n=== Echte Eingabe (Tippen, Klicken, Unterschrift, Fotos) ===");
  const konfig = server.konfig;

  // ---- Person 1: Kind neu, Rechner, Maus, dann Geschwister mit "Weitere Person anmelden" ----
  {
    const vp = DESKTOP;
    const page = await neueSeite(browser, server, vp, "eingabe-kind-neu");
    const profil = profilKindNeu(beispiele, server);
    const ctx = neuerKontext({ name: "eingabe-kind-neu", vp, modus: "eingabe", profil, gesehen: gesehenFuer(vp), touch: false, axeNeu: false, dateien });
    const r = await laufe(page, ctx);
    const erreicht = r.besucht[r.besucht.length - 1].startsWith("fertig");
    const daten = erreicht ? await ergebnisPruefen(page, ctx, dateien) : null;
    ok("Eingabe Kind neu (Rechner, Maus): bis 'fertig' und Datei erstellt", erreicht && !!daten, r.besucht.length + " Seiten");
    r.besucht.forEach((b) => alleSchritte.add(b.split("/")[0]));
    protokoll.profile.push({ name: "eingabe-kind-neu", viewport: vp.name, modus: "eingabe", seiten: r.besucht, datei: daten && daten.dateiname });
    ok("Eingabe Kind neu: Fokus auf der Überschrift nach jedem Weiter", ctx.fokusFehler.length === 0, ctx.fokusFehler.slice(0, 3).join("; "));
    if (daten) {
      ok("Eingabe Kind neu: Dateiname nach Muster Anmeldung_<Nachname>_<Vorname>.pdf", /^Datei:\s*Anmeldung_Mustermann_Mila\.pdf$/.test(daten.dateiname.trim()), daten.dateiname.trim());
      const nachweis = await unterschriftenNachweisen(page, ctx, daten);
      ok("Eingabe Kind neu: Unterschriften (Maus) stehen in bilder.unterschriften", nachweis.ok, nachweis.detail);
      if (daten.attrappe) {
        const a = daten.attrappe;
        ok("Eingabe Kind neu: PDF-Baustein bekommt Antworten und Vorlagen", a.a.vorname === "Mila" && a.a.zahlung.iban === "DE89370400440532013000" && Object.keys(a.vorlagen).length > 0, "Vorlagen: " + Object.keys(a.vorlagen).join(", "));
      }
      await downloadPruefen(browser, page, "Eingabe Kind neu");
      await prueflistePruefen(page);
    }
    await speicherPruefung(page, "Eingabe Kind neu");

    // Weitere Person: Adresse, Kontakt, Eltern und Zahlung bleiben.
    const neu = profilGeschwister(beispiele);
    await page.click('#anmeldung [data-aktion="weitere-person"]');
    await page.waitForFunction(() => document.getElementById("anmeldung").dataset.schritt === "wer", { timeout: 5000 });
    const ctx2 = neuerKontext({ name: "eingabe-geschwister", vp, modus: "eingabe", profil: neu, gesehen: gesehenFuer(vp), touch: false, axeNeu: false, dateien });
    const r2 = await laufe(page, ctx2);
    const erreicht2 = r2.besucht[r2.besucht.length - 1].startsWith("fertig");
    const daten2 = erreicht2 ? await ergebnisPruefen(page, ctx2, dateien) : null;
    ok("Weitere Person anmelden: übernimmt Adresse, Kontakt, Eltern und Zahlung (bis 'fertig' ohne diese Angaben)", erreicht2 && !!daten2 && /Ben/.test(daten2.dateiname), daten2 ? daten2.dateiname.trim() : "nicht fertig");
    if (daten2 && daten2.attrappe) {
      const a2 = daten2.attrappe.a;
      ok("Weitere Person: Anschrift, E-Mail und IBAN der Familie sind übernommen", a2.anschrift.strasse === profil.anschrift.strasse && a2.email === profil.email && a2.zahlung.iban === profil.zahlung.iban, a2.anschrift.strasse + " | " + a2.email);
    }
    r2.besucht.forEach((b) => alleSchritte.add(b.split("/")[0]));
    protokoll.profile.push({ name: "eingabe-geschwister", viewport: vp.name, modus: "eingabe", seiten: r2.besucht, datei: daten2 && daten2.dateiname });

    // Alle Angaben löschen
    await page.click('#anmeldung [data-aktion="loeschen"]');
    await page.waitForSelector("dialog.anm-dialog--loeschen[open]", { timeout: 3000 });
    await page.click('[data-aktion="loeschen-ja"]');
    await page.waitForFunction(() => document.getElementById("anmeldung").dataset.schritt === "start", { timeout: 5000 });
    const leer = await leerNachLoeschen(page);
    ok("Alle Angaben löschen: zurück am Anfang, Name und Adresse sind weg", leer.ok, leer.detail);
    ok("Eingabe Kind neu: keine Fehler in der Konsole", page.__st.konsole.length === 0, page.__st.konsole.slice(0, 3).join(" | "));
    await page.close();
  }

  // ---- Person 3: Mädchen C-Jugend, Fotos und Nachweise – am Handy mit Touch, am Rechner mit Maus ----
  for (const vp of OHNE_DESKTOP ? [MOBIL] : [MOBIL, DESKTOP]) {
    const art = vp.mobil ? "Handy, Touch" : "Rechner, Maus";
    const page = await neueSeite(browser, server, vp, "eingabe-maedchen-c-" + vp.name);
    const profil = profilMaedchenC(beispiele);
    const ctx = neuerKontext({ name: "eingabe-maedchen-c", vp, modus: "eingabe", profil, gesehen: gesehenFuer(vp), touch: vp.mobil, axeNeu: true, dateien, nachweise: true, axeImmer: false });
    const r = await laufe(page, ctx);
    const erreicht = r.besucht[r.besucht.length - 1].startsWith("fertig");
    const daten = erreicht ? await ergebnisPruefen(page, ctx, dateien) : null;
    ok("Eingabe Mädchen C-Jugend (" + art + ", Fotos): bis 'fertig' und Datei erstellt", erreicht && !!daten, r.besucht.length + " Seiten: " + Array.from(new Set(r.besucht.map((x) => x.split("/")[0]))).join(" › "));
    r.besucht.forEach((b) => alleSchritte.add(b.split("/")[0]));
    protokoll.profile.push({ name: "eingabe-maedchen-c", viewport: vp.name, modus: "eingabe", seiten: r.besucht, datei: daten && daten.dateiname });
    ok("Eingabe Mädchen C-Jugend (" + vp.name + "): Seite 'besonderes' war dabei", r.besucht.some((b) => b.startsWith("besonderes")), "");
    ok("Eingabe Mädchen C-Jugend (" + vp.name + "): Fokus auf der Überschrift", ctx.fokusFehler.length === 0, ctx.fokusFehler.slice(0, 3).join("; "));
    if (vp.mobil) {
      ok("Eingabe Mädchen C-Jugend (" + vp.name + "): kein Querscrollen", ctx.querScroll.length === 0, ctx.querScroll.slice(0, 3).join("; "));
      kopfAuswerten("Eingabe Mädchen C-Jugend (" + vp.name + ")", ctx);
      ok("Eingabe Mädchen C-Jugend (" + vp.name + "): Tippflächen mindestens 44 px", ctx.kleineFlaechen.size === 0, Array.from(ctx.kleineFlaechen).slice(0, 4).join(" | "));
    }
    if (daten) {
      const nachweis = await unterschriftenNachweisen(page, ctx, daten);
      ok("Eingabe Mädchen C-Jugend (" + vp.name + "): Unterschrift (" + (vp.mobil ? "Touch" : "Maus") + ") steht in bilder.unterschriften", nachweis.ok && (ctx.unterschriftenGezeichnet || 0) > 0, nachweis.detail);
      if (daten.attrappe) {
        const a = daten.attrappe;
        const nachweise = a.nachweise || {};
        const anzahl = Object.values(nachweise).reduce((n, l) => n + l.length, 0);
        ok("Eingabe Mädchen C-Jugend (" + vp.name + "): Nachweise (Foto und PDF) kommen im PDF-Baustein an", anzahl >= 1 && anzahl === (ctx.nachweiseHochgeladen || 0), anzahl + " Datei(en) für " + Object.keys(nachweise).join(", "));
        const typen = Object.values(nachweise).flat().map((x) => x.typ);
        ok("Eingabe Mädchen C-Jugend (" + vp.name + "): Foto als JPEG, PDF unverändert", typen.every((t) => t === "image/jpeg" || t === "application/pdf") && typen.includes("application/pdf") && typen.includes("image/jpeg"), typen.join(", "));
        ok("Eingabe Mädchen C-Jugend (" + vp.name + "): Spielerfoto kommt als JPEG an", !!a.spielerfoto && a.spielerfoto.typ === "image/jpeg", JSON.stringify(a.spielerfoto));
      }
      await fotoDownloadPruefen(browser, page);
    }
    await speicherPruefung(page, "Eingabe Mädchen C-Jugend (" + vp.name + ")");
    ok("Eingabe Mädchen C-Jugend (" + vp.name + "): keine Fehler in der Konsole", page.__st.konsole.length === 0, page.__st.konsole.slice(0, 3).join(" | "));
    await page.close();
  }
}

async function leerNachLoeschen(page) {
  // Weiter bis zum Namen und prüfen, dass die Felder leer sind
  await page.click('#anmeldung [data-aktion="weiter"]');
  await page.waitForFunction(() => document.getElementById("anmeldung").dataset.schritt === "wer", { timeout: 5000 });
  const gewaehlt = await page.$$eval('#anmeldung input[data-pfad="wer"]', (l) => l.filter((e) => e.checked).length);
  await page.click('#anmeldung label[for="' + (await page.$eval('#anmeldung input[data-pfad="wer"][data-wert="kind"]', (e) => e.id)) + '"]');
  await page.click('#anmeldung [data-aktion="weiter"]');
  await page.waitForFunction(() => document.getElementById("anmeldung").dataset.schritt === "name", { timeout: 5000 });
  const werte = await page.$$eval('#anmeldung input[data-pfad="vorname"], #anmeldung input[data-pfad="nachname"]', (l) => l.map((e) => e.value));
  return { ok: gewaehlt === 0 && werte.every((w) => w === ""), detail: "vorher gewählt: " + gewaehlt + ", Namensfelder: " + JSON.stringify(werte) };
}

// PDF herunterladen (echter Download in einen Ordner) und mit pdf-lib öffnen.
// Klickt einen Herunterladen-Knopf und wartet auf die Datei. Ergebnis: Pfad oder null.
async function ladeDownload(browser, page, aktion, endung, ordner) {
  const ziel = path.join(AUSGABE, ordner);
  fs.rmSync(ziel, { recursive: true, force: true });
  fs.mkdirSync(ziel, { recursive: true });
  const sitzung = await browser.target().createCDPSession();
  await sitzung.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: ziel });
  const knopf = await page.$('#anmeldung [data-aktion="' + aktion + '"]');
  if (!knopf) {
    await sitzung.detach();
    return null;
  }
  await knopf.evaluate((e) => e.scrollIntoView({ block: "center" }));
  await knopf.click();
  let datei = null;
  for (let i = 0; i < 60; i++) {
    const l = fs.readdirSync(ziel).filter((f) => f.endsWith(endung));
    if (l.length) {
      datei = path.join(ziel, l[0]);
      break;
    }
    await warte(250);
  }
  await sitzung.detach();
  return datei;
}

async function downloadPruefen(browser, page, name) {
  const datei = await ladeDownload(browser, page, "herunterladen", ".pdf", "downloads");
  if (!datei) return ok(name + ": Datei lässt sich herunterladen", false, "kein Download");
  const bytes = fs.readFileSync(datei);
  const { PDFDocument } = require("pdf-lib");
  let seiten = 0;
  try {
    seiten = (await PDFDocument.load(bytes)).getPageCount();
  } catch (e) {
    return ok(name + ": heruntergeladene Datei ist ein gültiges PDF", false, e.message);
  }
  const angezeigt = await page.$eval("#anmeldung .anm-ergebnis", (e) => e.innerText);
  ok(name + ": Datei lässt sich herunterladen und als PDF öffnen", bytes.subarray(0, 5).toString() === "%PDF-" && seiten > 0, path.basename(datei) + ", " + seiten + " Seiten, " + bytes.length + " Byte; Anzeige nennt " + (/(\d+) Seiten/.exec(angezeigt) || [])[1] + " Seiten");
}

// ---------- PDF prüfen (poppler: pdfinfo, pdftotext, pdfimages) ----------

function poppler(befehl, argumente) {
  const r = spawnSync(befehl, argumente, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  if (r.error) throw new Error(befehl + " lässt sich nicht starten (poppler installiert?): " + r.error.message);
  return r.stdout;
}

function pdfInfo(pfad) {
  const o = {};
  for (const zeile of poppler("pdfinfo", [pfad]).split("\n")) {
    const m = /^([^:]+):\s*(.*)$/.exec(zeile);
    if (m) o[m[1]] = m[2];
  }
  return o;
}

const pdfText = (pfad, seite) => poppler("pdftotext", ["-layout", ...(seite ? ["-f", String(seite), "-l", String(seite)] : []), pfad, "-"]);

// Bilder einer Seite: [{ typ, breite, hoehe }]
function pdfBilder(pfad, seite) {
  return poppler("pdfimages", ["-list", "-f", String(seite), "-l", String(seite), pfad])
    .split("\n")
    .slice(2)
    .filter((z) => z.trim())
    .map((z) => {
      const s = z.trim().split(/\s+/);
      return { typ: s[2], breite: Number(s[3]), hoehe: Number(s[4]) };
    });
}

// Seite 2 des Aufnahmeantrags im fertigen PDF: die Seite nach der ersten mit der Überschrift des Vordrucks.
function aufnahmeantragSeite2(pfad, seiten) {
  for (let i = 1; i <= seiten; i++) if (/AUFNAHMEANTRAG/.test(pdfText(pfad, i))) return i + 1;
  return null;
}

let pdfModul; // echtes pdf.js in Node (null bei Attrappe)
async function ladePdfModul(server) {
  if (pdfModul === undefined) pdfModul = server.status.pdf ? await import(pathToFileURL(path.join(ROOT, "assets", "js", "anmeldung", "pdf.js")).href) : null;
  return pdfModul;
}

const nfc = (s) => String(s || "").normalize("NFC");
const ohneLeer = (s) => nfc(s).replace(/\s+/g, " ");

// Lädt das PDF herunter und prüft es: erzeugt, Seitenzahl, Titel, Dateiname nach dateiname(), Name im Text,
// bei Bildschirm-Unterschrift ein Bild in der Größe der Unterschrift auf Seite 2 des Aufnahmeantrags.
// `erwartet`: { satzungOffen: true|false } – ob Teil A um den Haken bei der Satzung bittet.
async function pdfHerunterladenUndPruefen(browser, server, page, name, daten, erwartet) {
  const heruntergeladen = await ladeDownload(browser, page, "herunterladen", ".pdf", "downloads");
  if (!ok(name + ": PDF lässt sich herunterladen", !!heruntergeladen, heruntergeladen ? path.basename(heruntergeladen) : "kein Download")) return null;
  fs.mkdirSync(path.join(AUSGABE, "pdf"), { recursive: true });
  const ablage = path.join(AUSGABE, "pdf", name.replace(/[^A-Za-z0-9._-]+/g, "_") + ".pdf");
  fs.copyFileSync(heruntergeladen, ablage);
  const bytes = fs.readFileSync(ablage);
  const info = pdfInfo(ablage);
  const seiten = Number(info.Pages);
  const auf = daten.attrappe || {};
  const a = auf.a || {};
  const modul = await ladePdfModul(server);
  let bilderS2 = null;
  ok(name + ": PDF erzeugt (Kopf %PDF, Seitenzahl > 0)", bytes.subarray(0, 5).toString() === "%PDF-" && seiten > 0, seiten + " Seiten, " + Math.round(bytes.length / 1024) + " KB");
  if (auf.ergebnis) ok(name + ": Seitenzahl der Anzeige und der Datei stimmen überein", auf.ergebnis.seiten === seiten, "pdf.js meldet " + auf.ergebnis.seiten + ", pdfinfo " + seiten);
  const dateiName = path.basename(heruntergeladen);
  if (modul && modul.dateiname && auf.a) {
    const soll = modul.dateiname(auf.a);
    ok(name + ": Dateiname nach dateiname() – " + soll, dateiName === soll && ohneLeer(daten.dateiname).endsWith(nfc(soll)), "heruntergeladen '" + dateiName + "', angezeigt '" + ohneLeer(daten.dateiname).replace(/[\u2066-\u2069]/g, "") + "'");
    ok(name + ": Titel-Metadaten gesetzt", !!info.Title && ohneLeer(info.Title).includes(nfc(a.nachname)), "Titel: '" + (info.Title || "") + "'");
    const text = pdfText(ablage);
    const norm = ohneLeer(text);
    ok(name + ": PDF-Text enthält den Namen", !!a.vorname && !!a.nachname && norm.includes(nfc(a.vorname)) && norm.includes(nfc(a.nachname)), a.vorname + " " + a.nachname);
    // Teil A bittet um den Haken bei der Satzung, wenn er fehlt (Papier ohne Haken).
    const bittet = /Kästchen zur Satzung/.test(text);
    if (erwartet && typeof erwartet.satzungOffen === "boolean") ok(name + ": Teil A " + (erwartet.satzungOffen ? "bittet" : "bittet nicht") + " darum, die Satzung von Hand anzukreuzen", bittet === erwartet.satzungOffen, "Satz " + (bittet ? "steht" : "fehlt") + "; a.satzung = " + a.satzung);
    // Unterschrift am Bildschirm: Bild in der Größe der gezeichneten Unterschrift auf Seite 2 des Aufnahmeantrags
    const s2 = aufnahmeantragSeite2(ablage, seiten);
    const unt = Object.values(auf.unterschriften || {}).find((u) => u && u.pixelBreite);
    if (!s2) ok(name + ": Seite 2 des Aufnahmeantrags im PDF gefunden", false, "keine Seite mit der Überschrift AUFNAHMEANTRAG");
    else {
      bilderS2 = pdfBilder(ablage, s2);
      if (a.unterschriftWeg === "bildschirm" && unt) {
        ok(name + ": Aufnahmeantrag Seite 2 (PDF-Seite " + s2 + ") enthält das Unterschriftsbild", bilderS2.some((b) => b.breite === unt.pixelBreite && b.hoehe === unt.pixelHoehe), "gesucht " + unt.pixelBreite + "x" + unt.pixelHoehe + " (PNG-Maße; breitePx/hoehePx sind CSS-Pixel: " + unt.breitePx + "x" + unt.hoehePx + "); auf der Seite: " + (bilderS2.map((b) => b.breite + "x" + b.hoehe).join(", ") || "keine Bilder"));
      }
    }
  }
  return { pfad: ablage, info, seiten, bilderS2 };
}

async function prueflistePruefen(page) {
  // Die Prüfseite ist Teil des Durchlaufs; hier nur die Bedienelemente am Ende.
  const knoepfe = await page.$$eval("#anmeldung .anm-ergebnis [data-aktion]", (l) => l.map((e) => e.getAttribute("data-aktion")));
  ok("Ergebnisseite: Herunterladen, Ansehen, weitere Person und Löschen sind da", ["herunterladen", "ansehen", "weitere-person", "loeschen"].every((a) => knoepfe.includes(a)), knoepfe.join(", "));
}

async function fotoDownloadPruefen(browser, page) {
  const knopf = await page.$('#anmeldung [data-aktion="foto-speichern"]');
  if (!knopf) return ok("Spielerfoto lässt sich als Bild speichern", false, "Knopf fehlt");
  const ziel = path.join(AUSGABE, "downloads-foto");
  fs.rmSync(ziel, { recursive: true, force: true });
  fs.mkdirSync(ziel, { recursive: true });
  const sitzung = await browser.target().createCDPSession();
  await sitzung.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: ziel });
  await knopf.evaluate((e) => e.scrollIntoView({ block: "center" }));
  await knopf.click();
  let datei = null;
  for (let i = 0; i < 40; i++) {
    const l = fs.readdirSync(ziel).filter((f) => f.endsWith(".jpg"));
    if (l.length) {
      datei = path.join(ziel, l[0]);
      break;
    }
    await warte(250);
  }
  await sitzung.detach();
  if (!datei) return ok("Spielerfoto lässt sich als Bild speichern", false, "kein Download");
  const bytes = fs.readFileSync(datei);
  const masse = jpegMasse(bytes);
  ok("Spielerfoto als JPG: Format 3:4, mindestens 375 Pixel breit, ohne EXIF", bytes[0] === 0xff && bytes[1] === 0xd8 && masse && Math.abs(masse.breite / masse.hoehe - 0.75) < 0.01 && masse.breite >= 375 && masse.breite <= 750 && !bytes.includes(Buffer.from("GPS-TEST-MARKER")) && !bytes.includes(Buffer.from("Exif")), path.basename(datei) + " " + (masse ? masse.breite + "x" + masse.hoehe : "?"));
}

// Breite und Höhe aus dem JPEG-Kopf (Marker SOF0 bis SOF3).
function jpegMasse(bytes) {
  let i = 2;
  while (i < bytes.length - 9) {
    if (bytes[i] !== 0xff) return null;
    const marker = bytes[i + 1];
    const laenge = bytes.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xc3) return { hoehe: bytes.readUInt16BE(i + 5), breite: bytes.readUInt16BE(i + 7) };
    i += 2 + laenge;
  }
  return null;
}

// ---------- Einzelprüfungen ----------

async function einzelpruefungen(browser, server, dateien, beispiele) {
  console.log("\n=== Einzelprüfungen ===");
  const alle = [
    ["pruefeFehlerfall", () => pruefeFehlerfall(browser, server)],
    ["pruefeVerlauf", () => pruefeVerlauf(browser, server, beispiele)],
    ["pruefeTastatur", () => pruefeTastatur(browser, server)],
    ["pruefeHilfe", () => pruefeHilfe(browser, server)],
    ["pruefeSprachwahlOben", () => pruefeSprachwahlOben(browser, server)],
    ["pruefeAppModus", () => pruefeAppModus(browser, server, dateien)],
    ["pruefeUebersetzbareDaten", () => pruefeUebersetzbareDaten(browser, server)],
    ["pruefeHinweiseAufSeiten", () => pruefeHinweiseAufSeiten(browser, server, beispiele)],
    ["statischeRunde3", () => statischeRunde3(server)],
    ["pruefeSatzung", () => pruefeSatzung(browser, server, dateien)],
    ["pruefeGetrennteEltern", () => pruefeGetrennteEltern(browser, server, dateien)],
    ["pruefeNamenLatein", () => pruefeNamenLatein(browser, server, dateien, beispiele)],
    ["statischeRunde4", () => statischeRunde4()],
    ["pruefeFreitextLatein", () => pruefeFreitextLatein(browser, server)],
    ["pruefeSonderzeichenPdf", () => pruefeSonderzeichenPdf(browser, server, dateien)],
    ["pruefeKarnevalFragen", () => pruefeKarnevalFragen(browser, server, dateien)],
    ["pruefeKarnevalUhrzeit", () => pruefeKarnevalUhrzeit(browser, server, dateien)],
    ["pruefeAttestImPlan", () => pruefeAttestImPlan(browser, server, dateien)],
    ["pruefeSprache", () => pruefeSprache(browser, server)],
    ["pruefeArabischDurchlauf", () => pruefeArabischDurchlauf(browser, server, dateien)],
    ["pruefeUeberschriftSprachen", () => pruefeUeberschriftSprachen(browser, server)],
    ["pruefeVereinssicht", () => pruefeVereinssicht(browser, server, beispiele)],
    ["pruefeVorfuehrungKnopf", () => pruefeVorfuehrungKnopf(browser, server)],
    ["pruefeKopfSchmal", () => pruefeKopfSchmal(browser, server)],
    ["pruefeBilder", () => pruefeBilder(browser, server, dateien, beispiele)],
    ["pruefeBerichtsseite", () => pruefeBerichtsseite(browser, server, beispiele)],
  ];
  const unbekannt = NUR.filter((n) => !alle.some(([name]) => name === n));
  if (unbekannt.length) throw new Error("--nur: unbekannte Einzelprüfung(en) " + unbekannt.join(", ") + " – möglich: " + alle.map(([name]) => name).join(", "));
  for (const [name, lauf] of alle) if (!NUR.length || NUR.includes(name)) await lauf();
}

async function seiteMitBeispiel(browser, server, vp, name, id, bisSchritt) {
  const page = await neueSeite(browser, server, vp, name);
  if (id) await ladeBeispielPerKnopf(page, id);
  if (bisSchritt) {
    for (let i = 0; i < 80; i++) {
      const s = await stand(page);
      if (s.schritt === bisSchritt) break;
      if (s.schritt === "unterschriften") await unterschreiben(page, { touch: false });
      const r = await klickeWeiter(page, s);
      if (r.fehler.length || !r.gewechselt) break;
    }
  }
  return page;
}

async function pruefeFehlerfall(browser, server) {
  const page = await neueSeite(browser, server, MOBIL, "fehlerfall");
  // Seite "wer": nichts gewählt
  await page.click('#anmeldung [data-aktion="weiter"]');
  await page.waitForFunction(() => document.getElementById("anmeldung").dataset.schritt === "wer", { timeout: 5000 });
  await page.click('#anmeldung [data-aktion="weiter"]');
  await page.waitForSelector("#anmeldung .anm-fehlerbox:not([hidden])", { timeout: 3000 });
  const w = await page.evaluate(() => ({
    text: document.querySelector(".anm-fehlerbox").innerText,
    fokus: document.activeElement.classList.contains("anm-fehlerbox"),
    invalid: !!document.querySelector('#anmeldung [role="radiogroup"][aria-invalid="true"]'),
    beschrieben: (document.querySelector('#anmeldung [role="radiogroup"][aria-invalid="true"]') || { getAttribute: () => "" }).getAttribute("aria-describedby") || "",
  }));
  ok("Pflichtfeld leer (Seite 'wer'): Meldung in Worten", /Bitte wählen Sie, wer Mitglied werden möchte/.test(w.text), w.text.replace(/\s+/g, " "));
  ok("Pflichtfeld leer: Fokus auf der Fehlerliste, Feld ist aria-invalid und verweist auf die Meldung", w.fokus && w.invalid && w.beschrieben.length > 0, JSON.stringify(w));
  await page.screenshot({ path: path.join(AUSGABE, MOBIL.name, "fehler-wer.png"), fullPage: true });
  // Auswahl behebt den Fehler sofort
  await page.click('#anmeldung label[for="' + (await page.$eval('#anmeldung input[data-pfad="wer"][data-wert="kind"]', (e) => e.id)) + '"]');
  await page.waitForFunction(() => document.querySelector("#anmeldung .anm-fehlerbox").hidden, { timeout: 3000 });
  ok("Pflichtfeld: Meldung verschwindet nach der Auswahl", true, "");
  // Seite "name": zwei Fehler
  await page.click('#anmeldung [data-aktion="weiter"]');
  await page.waitForFunction(() => document.getElementById("anmeldung").dataset.schritt === "name", { timeout: 5000 });
  await page.click('#anmeldung [data-aktion="weiter"]');
  await page.waitForSelector("#anmeldung .anm-fehlerbox:not([hidden])", { timeout: 3000 });
  const n = await page.evaluate(() => ({
    eintraege: Array.from(document.querySelectorAll(".anm-fehlerbox li")).map((l) => l.textContent),
    inline: Array.from(document.querySelectorAll("#anmeldung .anm-fehler:not([hidden])")).map((l) => l.textContent),
    invalid: document.querySelectorAll('#anmeldung input[aria-invalid="true"]').length,
  }));
  ok("Zwei Pflichtfelder leer (Seite 'name'): Fehlerliste mit 2 Einträgen, Meldungen am Feld, aria-invalid", n.eintraege.length === 2 && n.inline.length === 2 && n.invalid === 2, JSON.stringify(n));
  ok("Fehlerliste (Seite 'name'): jeder Eintrag beginnt mit dem Namen des Feldes ('Vorname: …', 'Nachname: …'), am Feld steht die Meldung ohne Vorsatz", /^Vorname: Bitte /.test(n.eintraege[0]) && /^Nachname: Bitte /.test(n.eintraege[1]) && n.inline.every((t) => /^Bitte /.test(t)) && n.eintraege.every((t, i) => t.endsWith(n.inline[i])), JSON.stringify(n));
  await page.click('#anmeldung .anm-fehlerbox li a');
  const fokus = await page.evaluate(() => document.activeElement && document.activeElement.getAttribute("data-pfad"));
  ok("Link in der Fehlerliste springt in das Feld", fokus === "vorname", "Fokus: " + fokus);
  await page.keyboard.type("Mila");
  await page.type('#anmeldung input[data-pfad="nachname"]', "Mustermann");
  await page.waitForFunction(() => document.querySelector("#anmeldung .anm-fehlerbox").hidden, { timeout: 3000 });
  ok("Fehlerliste verschwindet, sobald beide Felder gefüllt sind", true, "");
  // Ungültiges Datum
  await page.click('#anmeldung [data-aktion="weiter"]');
  await page.waitForFunction(() => document.getElementById("anmeldung").dataset.teil === "datum", { timeout: 5000 });
  await page.type('#anmeldung input[data-pfad="geburtsdatum.t"]', "31");
  await page.type('#anmeldung input[data-pfad="geburtsdatum.m"]', "2");
  await page.type('#anmeldung input[data-pfad="geburtsdatum.j"]', "2015");
  await page.click('#anmeldung [data-aktion="weiter"]');
  await page.waitForSelector("#anmeldung .anm-fehlerbox:not([hidden])", { timeout: 3000 });
  const d = await page.evaluate(() => document.querySelector(".anm-fehlerbox").innerText);
  ok("Ungültiges Datum (31.2.): Meldung 'Dieses Datum gibt es nicht'", /Dieses Datum gibt es nicht/.test(d), d.replace(/\s+/g, " ").slice(0, 200));
  ok("Fehlerfall: keine Fehler in der Konsole", page.__st.konsole.length === 0, page.__st.konsole.slice(0, 3).join(" | "));
  await page.close();
}

async function pruefeVerlauf(browser, server, beispiele) {
  const page = await seiteMitBeispiel(browser, server, MOBIL, "verlauf", "kind-neu", "geburt");
  const a = await stand(page);
  ok("Verlauf: Beispiel geladen, 4. Seite erreicht", a.schritt === "geburt" && a.teil === "datum", a.schritt + "/" + a.teil);
  // Zurück des Browsers
  await page.evaluate(() => history.back());
  await page.waitForFunction(() => document.getElementById("anmeldung").dataset.schritt === "name", { timeout: 4000 }).catch(() => {});
  const b = await stand(page);
  ok("Zurück-Taste des Browsers geht eine Seite zurück (name)", b.schritt === "name", b.schritt + "/" + b.teil);
  const fokusB = await page.evaluate(() => document.activeElement && document.activeElement.id);
  ok("Nach Zurück steht der Fokus auf der Überschrift", fokusB === "anm-titel", fokusB);
  await page.evaluate(() => history.forward());
  await page.waitForFunction(() => document.getElementById("anmeldung").dataset.schritt === "geburt", { timeout: 4000 }).catch(() => {});
  const c = await stand(page);
  ok("Vorwärts-Taste des Browsers geht wieder zur nächsten Seite (geburt)", c.schritt === "geburt", c.schritt + "/" + c.teil);
  // Knopf "Zurück" oben
  await page.click('#anmeldung [data-aktion="zurueck"]');
  await page.waitForFunction(() => document.getElementById("anmeldung").dataset.schritt === "name", { timeout: 4000 }).catch(() => {});
  const d = await stand(page);
  ok("Knopf 'Zurück' oben geht eine Seite zurück (name)", d.schritt === "name", d.schritt + "/" + d.teil);
  // Erste Seite: kein Zurück-Knopf
  for (let i = 0; i < 3; i++) await page.evaluate(() => history.back());
  await page.waitForFunction(() => document.getElementById("anmeldung").dataset.schritt === "start", { timeout: 4000 }).catch(() => {});
  const versteckt = await page.$eval('#anmeldung [data-aktion="zurueck"]', (e) => e.hidden);
  ok("Auf der ersten Seite gibt es keinen Zurück-Knopf", versteckt, "");
  // Verlassen-Warnung: nach einer Eingabe meldet die Seite beforeunload
  await page.click('#anmeldung [data-aktion="weiter"]');
  await page.waitForFunction(() => document.getElementById("anmeldung").dataset.schritt === "wer", { timeout: 4000 });
  // Das Beispiel hat "Mein Kind" schon gewählt; erst eine andere Antwort ist eine Eingabe.
  await page.click('#anmeldung label[for="' + (await page.$eval('#anmeldung input[data-pfad="wer"][data-wert="selbst"]', (e) => e.id)) + '"]');
  const warnt = await page.evaluate(() => {
    const e = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(e);
    return e.defaultPrevented;
  });
  ok("Verlassen-Warnung: nach einer Eingabe fragt die Seite nach", warnt === true, "");
  await page.close();
  // Ohne Eingabe keine Warnung; nach Beispiel-Laden auch nicht
  const leer = await neueSeite(browser, server, MOBIL, "verlassen-leer");
  const warnt2 = await leer.evaluate(() => {
    const e = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(e);
    return e.defaultPrevented;
  });
  ok("Verlassen-Warnung: ohne Eingaben keine Warnung", warnt2 === false, "");
  await leer.close();
}

async function pruefeTastatur(browser, server) {
  const page = await seiteMitBeispiel(browser, server, DESKTOP, "tastatur", "kind-neu", "name");
  const kandidaten = await page.evaluate(() => {
    const w = document.getElementById("anmeldung");
    const titel = document.getElementById("anm-titel");
    const liste = Array.from(w.querySelectorAll("a[href], button, input:not([type=hidden]), select, textarea, summary, [tabindex]:not([tabindex='-1'])")).filter(
      (el) => !el.closest("[hidden]") && !el.disabled && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden" && !el.closest("dialog:not([open])")
    );
    liste.forEach((el, i) => el.setAttribute("data-e2e-tab", String(i)));
    return liste.map((el, i) => ({ i, nach: !!(titel.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING), name: el.getAttribute("data-aktion") || el.getAttribute("data-pfad") || el.id || el.tagName }));
  });
  const erwartet = kandidaten.filter((k) => k.nach);
  await page.evaluate(() => document.getElementById("anm-titel").focus());
  const besucht = [];
  for (let i = 0; i < erwartet.length; i++) {
    await page.keyboard.press("Tab");
    besucht.push(await page.evaluate(() => document.activeElement.getAttribute("data-e2e-tab")));
  }
  ok("Tab-Reihenfolge auf der Seite 'name': alle " + erwartet.length + " Bedienelemente nach der Überschrift in Dokumentreihenfolge erreichbar", JSON.stringify(besucht) === JSON.stringify(erwartet.map((k) => String(k.i))), "erwartet " + erwartet.map((k) => k.name).join(" › ") + " | erreicht " + besucht.join(","));
  // Elemente vor der Überschrift (Zurück, Sprache, Hilfe) mit Umschalt+Tab
  const davor = kandidaten.filter((k) => !k.nach);
  await page.evaluate(() => document.getElementById("anm-titel").focus());
  const rueck = [];
  for (let i = 0; i < davor.length; i++) {
    await page.keyboard.down("Shift");
    await page.keyboard.press("Tab");
    await page.keyboard.up("Shift");
    rueck.push(await page.evaluate(() => document.activeElement.getAttribute("data-e2e-tab")));
  }
  ok("Umschalt+Tab erreicht Zurück, Sprache und Hilfe vor der Überschrift", JSON.stringify(rueck) === JSON.stringify(davor.map((k) => String(k.i)).reverse()), davor.map((k) => k.name).join(", "));
  // Sichtbarer Fokus
  const fokusSichtbar = await page.evaluate(() => {
    const el = document.querySelector('#anmeldung input[data-pfad="vorname"]');
    el.focus();
    const s = getComputedStyle(el);
    return s.outlineStyle !== "none" || s.boxShadow !== "none";
  });
  ok("Fokus ist sichtbar (Eingabefeld)", fokusSichtbar, "");
  // Enter im Feld geht weiter
  await page.focus('#anmeldung input[data-pfad="nachname"]');
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => document.getElementById("anmeldung").dataset.schritt === "geburt", { timeout: 4000 }).catch(() => {});
  const s = await stand(page);
  ok("Enter in einem Feld geht zur nächsten Seite", s.schritt === "geburt", s.schritt);
  await page.close();
}

// Hinweise auf den Seiten mit einer Frage: höchstens 2 Kästen offen (nur Warnungen und Fristen),
// alles andere unter "Weitere Hinweise (n)". Einmal an der echten Seite (Wechsel in Hessen,
// Frage nach der Mitgliedschaft), einmal an regelHinweise() selbst mit erfundenen Hinweisen,
// damit auch der Fall "mehr als 2 Warnungen" vorkommt.
async function pruefeHinweiseAufSeiten(browser, server, beispiele) {
  // (a) echte Seite
  const seite = await seiteMitBeispiel(browser, server, MOBIL, "hinweise-seite", "wechsel-hessen", null);
  const s = await geheBis(seite, "abmeldung", "mitgliedschaft");
  ok("Hinweise auf einer Frageseite: Seite 'abmeldung/mitgliedschaft' erreicht", s.schritt === "abmeldung" && s.teil === "mitgliedschaft", s.schritt + "/" + s.teil);
  const dom = await hinweiseImDom(seite);
  const alleArten = [...dom.offenArten, ...dom.aufklapperArten];
  ok(
    "Hinweise auf einer Frageseite: höchstens 2 Kästen offen, nur Warnungen und Fristen; Infos im Aufklapper",
    dom.offenSichtbar <= 2 && dom.offenArten.every((x) => x === "warnung" || x === "frist") && dom.aufklapperArten.includes("info") && dom.aufklapperZu === true && dom.aufklapperTitel === "Weitere Hinweise (" + dom.aufklapperAnzahl + ")" && alleArten.length >= 2,
    "offen: " + (dom.offenArten.join(", ") || "keiner") + "; Aufklapper (" + dom.aufklapperAnzahl + "): " + dom.aufklapperArten.join(", ")
  );
  await seite.screenshot({ path: path.join(AUSGABE, MOBIL.name, "hinweise-frageseite.png"), fullPage: false });
  await seite.close();

  // (b) regelHinweise() mit erfundenen Hinweisen: drei Warnungen, eine Info und ein 'offen' für eine Seite
  const page = await neueSeite(browser, server, MOBIL, "hinweise-kappung");
  const r = await page.evaluate(async () => {
    const basis = "/assets/js/anmeldung/";
    const [ende, wb, hilfen] = await Promise.all([import(basis + "seiten-ende.js"), import(basis + "texte/de-oberflaeche.js"), import(basis + "hilfen.js")]);
    const get = (o, p) => p.split(".").reduce((x, s) => (x === undefined ? undefined : x[s]), o);
    const k = { t: (p, w) => hilfen.ersetzePlatzhalter(get(wb.default, p), w || {}), rt: (bereich, key) => "Text zu " + key, formatDatum: (x) => x, weitereOffen: new Map() };
    const e = {
      hinweise: [
        { art: "info", key: "abmeldung_unklar" },
        { art: "warnung", key: "abmeldung_nach_letztem_spiel" },
        { art: "offen", key: "abmeldung_formlos" },
        { art: "warnung", key: "nie_zwei_vereine" },
        { art: "warnung", key: "abmeldung_vor_letztem_spiel" },
        { art: "warnung", key: "ohne_ort_auf_dieser_seite" },
      ],
    };
    const beschreibe = (knoten) => ({
      offen: knoten.filter((x) => x.matches && x.matches(".anm-hinweiskasten")).map((x) => x.getAttribute("data-hinweis-art") + ":" + x.getAttribute("data-hinweis-key")),
      aufklapper: knoten.filter((x) => x.tagName === "DETAILS").map((x) => ({ titel: x.querySelector("summary").textContent, kaesten: x.querySelectorAll(".anm-hinweiskasten").length, zu: !x.open })),
    });
    const voll = ende.regelHinweise(k, e, "abmeldung/status");
    const nurInfo = ende.regelHinweise(k, { hinweise: [{ art: "info", key: "abmeldung_unklar" }, { art: "offen", key: "abmeldung_formlos" }] }, "abmeldung/status");
    const keine = ende.regelHinweise(k, { hinweise: [{ art: "warnung", key: "ohne_ort_auf_dieser_seite" }] }, "abmeldung/status");
    return { voll: beschreibe(voll), nurInfo: beschreibe(nurInfo), keine: keine.length };
  });
  ok(
    "regelHinweise(): bei 3 Warnungen, 1 Info und 1 'offen' zwei Kästen offen, die anderen drei im Aufklapper",
    r.voll.offen.length === 2 && r.voll.offen.every((x) => x.startsWith("warnung:")) && r.voll.aufklapper.length === 1 && r.voll.aufklapper[0].kaesten === 3 && r.voll.aufklapper[0].zu && /Weitere Hinweise \(3\)/.test(r.voll.aufklapper[0].titel),
    JSON.stringify(r.voll)
  );
  ok(
    "regelHinweise(): nur Infos und 'offen' – kein Kasten offen, beide im Aufklapper",
    r.nurInfo.offen.length === 0 && r.nurInfo.aufklapper.length === 1 && r.nurInfo.aufklapper[0].kaesten === 2 && /Weitere Hinweise \(2\)/.test(r.nurInfo.aufklapper[0].titel),
    JSON.stringify(r.nurInfo)
  );
  ok("regelHinweise(): ohne passenden Hinweis bleibt die Seite leer (kein Aufklapper)", r.keine === 0, String(r.keine));
  await page.close();
}

async function pruefeHilfe(browser, server) {
  const page = await neueSeite(browser, server, MOBIL, "hilfe");
  const konfig = server.konfig;
  await page.click('#anmeldung [data-aktion="hilfe"]');
  await page.waitForSelector("dialog.anm-dialog--hilfe[open]", { timeout: 3000 });
  const h = await page.evaluate(() => {
    const d = document.querySelector("dialog.anm-dialog--hilfe");
    return {
      tel: Array.from(d.querySelectorAll('a[href^="tel:"]')).map((a) => a.getAttribute("href")),
      mails: Array.from(d.querySelectorAll('a[href^="mailto:"]')).map((a) => a.getAttribute("href").replace("mailto:", "")),
      text: d.innerText,
      titelFokus: !!document.activeElement && d.contains(document.activeElement),
    };
  });
  ok("Hilfe: Telefon der Geschäftsstelle stimmt mit der Vereinskonfiguration", h.tel.includes("tel:" + konfig.verein.tel_geschaeftsstelle.replace(/\D/g, "")), h.tel.join(","));
  ok("Hilfe: Mail der Geschäftsstelle stimmt mit der Vereinskonfiguration; Jugendleitung und Karneval sind da", h.mails.includes(konfig.verein.mail) && h.mails.includes("jugendleitung@sportfreunde04.de") && h.mails.includes("karnevalabteilung@sportfreunde04.de"), h.mails.join(", "));
  ok("Hilfe: Satz zum Übersetzen mitbringen", /Übersetzen mitbringen/.test(h.text), "");
  ok("Hilfe: Fokus liegt im Dialog", h.titelFokus, "");
  await page.screenshot({ path: path.join(AUSGABE, MOBIL.name, "hilfe.png"), fullPage: false });
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => !document.querySelector("dialog.anm-dialog--hilfe[open]"), { timeout: 3000 });
  const zurueck = await page.evaluate(() => document.activeElement && document.activeElement.getAttribute("data-aktion"));
  ok("Hilfe schließt mit Escape, Fokus kehrt zum Hilfe-Knopf zurück", zurueck === "hilfe", "Fokus: " + zurueck);
  await page.close();
}

// Deutscher Ersatztext in einer Sprache von rechts nach links steht in Unicode-Isolaten
// (U+2066 ... U+2069, je Zeile), sonst wandern Satzzeichen an den falschen Rand.
// Liefert die sichtbaren Textstücke, die weder Arabisch enthalten noch eingefasst sind.
async function ungeschuetzterErsatztext(page) {
  return page.evaluate(() => {
    const w = document.getElementById("anmeldung");
    const aus = [];
    const tw = document.createTreeWalker(w, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = tw.nextNode())) {
      const t = n.nodeValue;
      const el = n.parentElement;
      // <bdi> und Eingabefelder: Angaben der Familie, nicht Ersatztext der Oberfläche
      if (!el || el.getClientRects().length === 0 || el.closest("[hidden],script,style,noscript,option,textarea,input,bdi")) continue;
      const lateinisch = (t.match(/[A-Za-zÄÖÜäöüß]/g) || []).length;
      const arabisch = (t.match(/[\u0600-\u06FF]/g) || []).length;
      if (lateinisch < 4 || arabisch > 0) continue;
      const eigen = el.closest("[lang]");
      if (eigen && eigen !== w && eigen.getAttribute("lang") !== "ar") continue; // z. B. Sprachnamen "Deutsch", "English"
      const s = t.trim();
      // Was in Isolaten steht, ist geschützt; bleibt darüber hinaus Deutsch übrig, ist das ein Fehler.
      const rest = (s.replace(/\u2066[^\u2069]*\u2069/g, "").match(/[A-Za-zÄÖÜäöüß]/g) || []).length;
      if (rest < 4) continue;
      aus.push(el.tagName.toLowerCase() + ": " + s.slice(0, 60));
    }
    return aus;
  });
}

async function pruefeSprache(browser, server) {
  const page = await neueSeite(browser, server, MOBIL, "sprache-ar");
  // Fehlende Sprachdateien (ar-regeln.js, tr-*.js) melden 404 – das ist hier gewollt.
  page.__st.erwartet404 = 20;
  // Arabisch über die Sprachwahl ganz oben im Seitenkopf (Startschritt)
  await page.click('[data-anm-sprachleiste] button[data-sprache="ar"]');
  await page.waitForFunction(() => document.getElementById("anmeldung").getAttribute("dir") === "rtl", { timeout: 5000 }).catch(() => {});
  const ar = await page.evaluate(() => {
    const w = document.getElementById("anmeldung");
    return {
      dir: w.getAttribute("dir"),
      lang: w.getAttribute("lang"),
      berechnet: getComputedStyle(w).direction,
      hinweis: (document.querySelector(".anm-uebersetzung") || {}).textContent || "",
      hinweisSichtbar: document.querySelector(".anm-uebersetzung") ? !document.querySelector(".anm-uebersetzung").hidden : false,
      titel: document.getElementById("anm-titel").textContent,
      band: (document.querySelector("[data-anm-band]") || { textContent: "" }).textContent.trim(),
      scroll: document.documentElement.scrollWidth <= window.innerWidth,
    };
  });
  ok("Sprachwechsel auf Arabisch: dir=\"rtl\" und lang=\"ar\" am Assistenten", ar.dir === "rtl" && ar.lang === "ar" && ar.berechnet === "rtl", JSON.stringify({ dir: ar.dir, lang: ar.lang, css: ar.berechnet }));
  ok("Arabisch: Hinweis 'Übersetzungshilfe, verbindlich ist Deutsch' steht da", ar.hinweisSichtbar && ar.hinweis.length > 10, ar.hinweis);
  // Entwurfsband (sprache-26): dir folgt der Sprache, der Balken steht rechts, der Text beginnt rechts
  const band = await page.evaluate(() => {
    const b = document.querySelector("[data-anm-band]");
    const z = getComputedStyle(b);
    return { dir: b.getAttribute("dir"), lang: b.getAttribute("lang"), balkenRechts: z.borderRightWidth, balkenLinks: z.borderLeftWidth, ausrichtung: z.direction };
  });
  ok("Arabisch: das Entwurfsband trägt dir=\"rtl\" und lang=\"ar\", der Balken steht rechts (nicht links)", band.dir === "rtl" && band.lang === "ar" && band.ausrichtung === "rtl" && band.balkenRechts === "4px" && band.balkenLinks === "0px", JSON.stringify(band));
  // Hilfe auf Arabisch (sprache-14): die Rufnummer ist ein eigener Block von links nach rechts
  await page.click('#anmeldung [data-aktion="hilfe"]');
  await page.waitForSelector("dialog.anm-dialog--hilfe[open]", { timeout: 3000 });
  const tel = await page.evaluate(() => {
    const a = document.querySelector('dialog.anm-dialog--hilfe a[href^="tel:"]');
    const nr = a.querySelector(".anm-tel");
    const z = getComputedStyle(nr);
    // sichtbare Reihenfolge der Ziffernblöcke: "069" links von "736868"
    const t = nr.firstChild;
    const rect = (i) => { const r = document.createRange(); r.setStart(t, i); r.setEnd(t, i + 1); return r.getBoundingClientRect(); };
    return { text: nr.textContent, dir: nr.getAttribute("dir"), css: z.direction, bidi: z.unicodeBidi, vorneLinks: rect(0).left < rect(t.length - 1).left, textKnopf: a.textContent.replace(/\s+/g, " ").trim() };
  });
  ok("Arabisch (Hilfe): die Rufnummer steht als eigener Block von links nach rechts und liest sich sichtbar „069 736868“", tel.text === "069 736868" && tel.dir === "ltr" && tel.css === "ltr" && tel.bidi === "isolate" && tel.vorneLinks, JSON.stringify(tel));
  await page.screenshot({ path: path.join(AUSGABE, MOBIL.name, "arabisch-hilfe.png"), fullPage: false });
  protokoll.screenshots++;
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => !document.querySelector("dialog.anm-dialog--hilfe[open]"), { timeout: 3000 });
  ok("Arabisch: kein Querscrollen", ar.scroll, "");
  const ungeschuetzt1 = await ungeschuetzterErsatztext(page);
  ok("Arabisch (Start): deutscher Ersatztext steht zeilenweise in Unicode-Isolaten", ungeschuetzt1.length === 0, ungeschuetzt1.slice(0, 3).join(" | "));
  await page.screenshot({ path: path.join(AUSGABE, MOBIL.name, "arabisch-start.png"), fullPage: true });
  await axePruefen(page, "Arabisch start");
  // Weiter zu "wer" und "name" in Arabisch
  await page.click('#anmeldung [data-aktion="weiter"]');
  await page.waitForFunction(() => document.getElementById("anmeldung").dataset.schritt === "wer", { timeout: 4000 });
  await page.click('#anmeldung label[for="' + (await page.$eval('#anmeldung input[data-pfad="wer"][data-wert="kind"]', (e) => e.id)) + '"]');
  await page.click('#anmeldung [data-aktion="weiter"]');
  await page.waitForFunction(() => document.getElementById("anmeldung").dataset.schritt === "name", { timeout: 4000 });
  const layout = await page.evaluate(() => {
    const w = document.getElementById("anmeldung");
    const zur = w.querySelector('[data-aktion="zurueck"]').getBoundingClientRect();
    const hilfe = w.querySelector('[data-aktion="hilfe"]').getBoundingClientRect();
    const karte = w.querySelector(".anm-eingabe");
    return { zurueckRechts: zur.left > window.innerWidth / 2, hilfeLinks: hilfe.left < window.innerWidth / 2, scroll: document.documentElement.scrollWidth <= window.innerWidth, eingabeRechts: karte ? getComputedStyle(karte).direction : "" };
  });
  ok("Arabisch: Zurück-Knopf steht rechts, Hilfe links (Spiegelung), kein Querscrollen", layout.zurueckRechts && layout.hilfeLinks && layout.scroll, JSON.stringify(layout));
  await axePruefen(page, "Arabisch name");
  const ungeschuetzt2 = await ungeschuetzterErsatztext(page);
  ok("Arabisch (Name): deutscher Ersatztext steht zeilenweise in Unicode-Isolaten", ungeschuetzt2.length === 0, ungeschuetzt2.slice(0, 3).join(" | "));
  await page.screenshot({ path: path.join(AUSGABE, MOBIL.name, "arabisch-name.png"), fullPage: true });
  // Zurück zu Deutsch über die Auswahl oben
  await page.select("#anm-sprache", "de");
  await page.waitForFunction(() => document.getElementById("anmeldung").getAttribute("dir") === "ltr", { timeout: 4000 });
  ok("Sprachwechsel zurück auf Deutsch: dir=\"ltr\"", true, "");
  // Fehlende Sprachdatei: Türkisch sperren
  server.sperre("/assets/js/anmeldung/texte/tr-oberflaeche.js");
  await page.select("#anm-sprache", "tr");
  await page.waitForFunction(() => /noch nicht da/.test((document.querySelector(".anm-meldung") || {}).textContent || ""), { timeout: 5000 }).catch(() => {});
  const tr = await page.evaluate(() => ({
    meldung: (document.querySelector(".anm-meldung") || {}).textContent || "",
    lang: document.getElementById("anmeldung").getAttribute("lang"),
    dir: document.getElementById("anmeldung").getAttribute("dir"),
    auswahl: document.getElementById("anm-sprache").value,
  }));
  ok("Fehlende Sprachdatei: kurze Meldung, es bleibt bei Deutsch", /Es bleibt bei Deutsch/.test(tr.meldung) && tr.lang === "de" && tr.dir === "ltr", JSON.stringify(tr));
  server.freigabe("/assets/js/anmeldung/texte/tr-oberflaeche.js");
  ok("Sprachtests: keine Fehler in der Konsole", page.__st.konsole.length === 0, page.__st.konsole.slice(0, 3).join(" | "));
  await page.close();
}

// Die große Überschrift der Seite folgt der Sprache des Assistenten (seite.h1 aus der Sprachdatei);
// Begleitseiten-Navigation und Fußbereich bleiben deutsch.
async function pruefeUeberschriftSprachen(browser, server) {
  console.log("\n=== Runde 3: Überschrift folgt der Sprache ===");
  const page = await neueSeite(browser, server, MOBIL, "ueberschrift");
  page.__st.erwartet404 = 30; // manche Sprachen haben (noch) keine Regeltexte
  const h1 = () => page.evaluate(() => {
    const e = document.querySelector("h1");
    return { anzahl: document.querySelectorAll("h1").length, text: e.textContent.trim(), lang: e.getAttribute("lang"), dir: e.getAttribute("dir") };
  });
  const de0 = await h1();
  ok("Überschrift: auf Deutsch 'Anmelden beim FFV Sportfreunde 04', genau eine h1", de0.anzahl === 1 && de0.text === "Anmelden beim FFV Sportfreunde 04", de0.text);
  for (const code of ["en", "tr", "ar", "de"]) {
    await page.click('[data-anm-sprachleiste] button[data-sprache="' + code + '"]');
    await page.waitForFunction((c) => document.getElementById("anmeldung").getAttribute("lang") === c, { timeout: 6000 }, code);
    const ist = await h1();
    const datei = (await import(pathToFileURL(path.join(ROOT, "assets", "js", "anmeldung", "texte", code + "-oberflaeche.js")).href)).default;
    const soll = datei.seite.h1;
    const ohneIsolate = (x) => nfc(x).replace(/[\u2066-\u2069]/g, "");
    ok("Überschrift: in '" + code + "' steht die Überschrift der Sprachdatei da – " + ohneIsolate(soll), ist.anzahl === 1 && ohneIsolate(ist.text) === ohneIsolate(soll), "gefunden: " + ist.text);
    ok("Überschrift: in '" + code + "' trägt sie lang und dir der Sprache", ist.lang === code && ist.dir === (code === "ar" ? "rtl" : "ltr"), JSON.stringify({ lang: ist.lang, dir: ist.dir }));
  }
  const rest = await page.evaluate(() => ({
    nav: Array.from(document.querySelectorAll(".begleit-kopf nav a")).map((a) => a.textContent.trim()),
    fuss: (document.querySelector(".ws-fuss") || { textContent: "" }).textContent.replace(/\s+/g, " ").trim(),
  }));
  ok("Überschrift: Navigation der Begleitseiten und Fußbereich bleiben deutsch", rest.nav.includes("Anmeldung (Entwurf)") && rest.nav.includes("Anmeldung: Konzept") && /^Begleitmaterial für den Vorstand/.test(rest.fuss), rest.nav.join(" | ") + " – " + rest.fuss.slice(0, 50));
  await page.close();
}

// Ein Beispiel komplett auf Arabisch durchklicken: auf jeder Seite steht der deutsche
// Ersatztext in Isolaten, es gibt kein Querscrollen, die Datei wird erstellt.
async function pruefeArabischDurchlauf(browser, server, dateien) {
  const page = await neueSeite(browser, server, MOBIL, "arabisch-durchlauf");
  page.__st.erwartet404 = 60; // ar-regeln.js gibt es (noch) nicht
  await ladeBeispielPerKnopf(page, "wechsel-hessen");
  await klickeWeiter(page, await stand(page));
  await page.select("#anm-sprache", "ar");
  await page.waitForFunction(() => document.getElementById("anmeldung").getAttribute("dir") === "rtl", { timeout: 5000 });
  const roh = [];
  const sammel = { gilt: "", giltPunkte: 0, pruefzeilen: [], pruefDom: [] };
  const ctx = neuerKontext({
    name: "arabisch-durchlauf", vp: MOBIL, modus: "beispiel", gesehen: gesehenFuer(MOBIL), touch: true, axeNeu: false, dateien,
    proSeite: async (p, s, kennung) => {
      const liste = await ungeschuetzterErsatztext(p);
      if (liste.length) roh.push(kennung + ": " + liste.slice(0, 2).join(" | "));
      if (s.schritt === "unterschriften") {
        sammel.gilt = await p.$eval("#anmeldung .anm-unterschrift", (e) => e.innerText.replace(/\s+/g, " "));
        sammel.giltPunkte = await p.$eval("#anmeldung .anm-unterschrift", (e) => e.querySelectorAll(".anm-unterschrift__gilt li").length);
      }
      if (s.schritt === "pruefen") {
        sammel.pruefzeilen = await p.$$eval("#anmeldung .anm-pruefzeile__wert", (l) => l.map((e) => e.textContent.replace(/\s+/g, " ").trim()));
        // sprache-13: das <dd> trägt die Richtung der Sprache; kein <bdi> um den ganzen Wert (sonst bestimmt das erste Zeichen die Richtung)
        sammel.pruefDom = await p.$$eval("#anmeldung .anm-pruefzeile__wert", (l) => l.map((e) => ({ dir: e.getAttribute("dir"), css: getComputedStyle(e).direction, ganzesBdi: e.children.length === 1 && e.firstElementChild.tagName === "BDI" && e.firstElementChild.textContent.trim() === e.textContent.trim() && /[\u0600-\u06FF]/.test(e.textContent), text: e.textContent.replace(/\s+/g, " ").trim() })));
      }
    },
  });
  const r = await laufe(page, ctx);
  ok("Arabisch-Durchlauf (Wechsel in Hessen) bis 'fertig' – " + r.besucht.length + " Seiten", r.besucht[r.besucht.length - 1].startsWith("fertig"), r.ende);
  ok("Arabisch-Durchlauf: auf allen Seiten steht der deutsche Ersatztext in Unicode-Isolaten", roh.length === 0, roh.slice(0, 3).join(" || "));
  ok("Arabisch-Durchlauf: kein Querscrollen auf allen Seiten", ctx.querScroll.length === 0, ctx.querScroll.slice(0, 3).join("; "));
  // Papiernamen: in jeder Sprache aus den Regeltexten dieser Sprache (arabisch, mit dem deutschen Namen in Klammern)
  const arRegeln = (await import(pathToFileURL(path.join(ROOT, "assets", "js", "anmeldung", "texte", "ar-regeln.js")).href)).default;
  const ohneIso = (x) => nfc(x).replace(/[\u2066-\u2069]/g, "");
  const fotoName = (arRegeln.unterschriften || {})["aufnahmeantrag.s3.unterschrift"];
  ok("Arabisch-Durchlauf: 'Gilt für' nennt die Papiere mit den arabischen Namen aus ar-regeln.js (zum Beispiel '" + fotoName + "')", !!fotoName && ohneIso(sammel.gilt).includes(ohneIso(fotoName)), ohneIso(sammel.gilt).slice(0, 200));
  // Aufzählungen: Trenner der Sprache (liste.trenner = "، "). Das steht in ar-oberflaeche.js erst nach der Nachrunde von AP-5.
  ok("Arabisch-Durchlauf: 'Diese Unterschrift gilt für:' steht als Liste (ein Blatt je Zeile), keine Aufzählung in einer Zeile", sammel.giltPunkte >= 2 && !/, /.test(ohneIso(sammel.gilt).replace(/\([^)]*\)/g, "")), sammel.giltPunkte + " Zeilen; " + ohneIso(sammel.gilt).slice(0, 120));
  ok("Arabisch-Durchlauf: auf der Prüfseite trägt jeder Wert die Richtung der Sprache (dir=rtl) und kein <bdi> umschließt einen arabischen Wert ganz", sammel.pruefDom.length > 0 && sammel.pruefDom.every((z) => z.dir === "rtl" && z.css === "rtl" && !z.ganzesBdi), JSON.stringify(sammel.pruefDom.filter((z) => z.dir !== "rtl" || z.ganzesBdi).slice(0, 2)));
  weich("Arabisch-Durchlauf: auf der Prüfseite trennt das arabische Komma die Teile einer Aufzählung (zum Beispiel Geburtsort und Land), kein deutsches Ersatz-Komma", sammel.pruefzeilen.some((z) => z.includes("،")) && !sammel.pruefzeilen.some((z) => /\u2066,\s*\u2069/.test(z)), sammel.pruefzeilen.filter((z) => /,|،/.test(z)).slice(0, 2).join(" | "));
  const daten = await ergebnisPruefen(page, ctx, dateien);
  ok("Arabisch-Durchlauf: die Datei wird auch auf Arabisch erstellt", !!daten, daten ? daten.dateiname : "");
  ok("Arabisch-Durchlauf: keine Fehler in der Konsole", page.__st.konsole.length === 0, page.__st.konsole.slice(0, 3).join(" | "));
  await page.close();
}

// Bis zu einer Seite weiterklicken (ab der ersten Frage ist der Werkzeugkasten der Vorführung
// weg, der Schalter der Vereinssicht muss also vorher auf "start" gedrückt werden).
async function geheBis(page, schritt, teil) {
  for (let i = 0; i < 90; i++) {
    const s = await stand(page);
    if (s.schritt === schritt && (!teil || s.teil === teil)) return s;
    if (s.schritt === "unterschriften") await unterschreiben(page, { touch: false });
    const r = await klickeWeiter(page, s);
    if (r.fehler.length || !r.gewechselt) break;
  }
  return stand(page);
}

// ---------- N-A2 (07.10.2026): Sprachwahl ganz oben, App-Modus, übersetzbare Daten ----------

// Sprachwahl im ersten Bildschirm (390 x 844): ganz oben im Seitenkopf, vor der Überschrift und vor dem deutschen Erklärtext des
// Startschritts, die vier Sprachen in ihrer eigenen Schrift. Nur der Startschritt zeigt sie.
async function pruefeSprachwahlOben(browser, server) {
  console.log("\n=== N-A2: Sprachwahl ganz oben im ersten Bildschirm ===");
  const page = await neueSeite(browser, server, MOBIL, "sprachwahl-oben");
  const d = await page.evaluate(() => {
    const leiste = document.querySelector("[data-anm-sprachleiste]");
    const r = (e) => e.getBoundingClientRect();
    const sichtbar = (e) => e.checkVisibility();
    const text = document.querySelector("#anmeldung .anm-absaetze p");
    return {
      leisteDa: !!leiste,
      leisteSichtbar: leiste ? sichtbar(leiste) : false,
      knoepfe: leiste ? Array.from(leiste.querySelectorAll("button[data-sprache]")).map((b) => ({ code: b.dataset.sprache, text: b.textContent.trim(), lang: b.lang, dir: b.dir, unten: Math.round(r(b).bottom), sichtbar: sichtbar(b), gewaehlt: b.getAttribute("aria-pressed") })) : [],
      vorUeberschrift: leiste ? r(leiste).bottom <= r(document.querySelector("h1")).top + 1 : false,
      vorErklaertext: leiste && text ? r(leiste).bottom <= r(text).top : false,
      hoehe: window.innerHeight,
    };
  });
  ok("Sprachwahl: ganz oben im Seitenkopf, sichtbar", d.leisteDa && d.leisteSichtbar, "");
  ok("Sprachwahl: die vier Sprachen in eigener Schrift (Deutsch, English, Türkçe, العربية)", d.knoepfe.map((k) => k.text).join(",") === "Deutsch,English,Türkçe,العربية" && d.knoepfe.map((k) => k.lang).join(",") === "de,en,tr,ar" && d.knoepfe.find((k) => k.code === "ar").dir === "rtl", d.knoepfe.map((k) => k.text).join(" | "));
  ok("Sprachwahl: im ersten Bildschirm (390 x 844), alle vier Knöpfe ganz zu sehen", d.knoepfe.length === 4 && d.knoepfe.every((k) => k.sichtbar && k.unten <= d.hoehe), "unterste Kante: " + Math.max(...d.knoepfe.map((k) => k.unten)) + " von " + d.hoehe);
  ok("Sprachwahl: steht vor der Überschrift und vor dem deutschen Erklärtext des Startschritts", d.vorUeberschrift && d.vorErklaertext, "");
  ok("Sprachwahl: Deutsch ist gewählt (aria-pressed)", d.knoepfe.find((k) => k.code === "de").gewaehlt === "true" && d.knoepfe.filter((k) => k.gewaehlt === "true").length === 1, "");
  ok("Startschritt: keine zweite Sprachwahl in der Seite (keine Sprachkarten mehr im Assistenten)", (await page.$('#anmeldung input[data-pfad="sprache"]')) === null, "");
  await page.screenshot({ path: path.join(AUSGABE, MOBIL.name, "start-sprachwahl.png"), fullPage: false });
  protokoll.screenshots++;
  await page.click('[data-anm-sprachleiste] button[data-sprache="en"]');
  await page.waitForFunction(() => document.getElementById("anmeldung").getAttribute("lang") === "en", { timeout: 6000 });
  const en = await page.evaluate(() => ({ gewaehlt: Array.from(document.querySelectorAll("[data-anm-sprachleiste] button")).filter((b) => b.getAttribute("aria-pressed") === "true").map((b) => b.dataset.sprache), titel: (document.querySelector("[data-anm-sprachleiste] .anm-sprachleiste__titel") || {}).lang }));
  ok("Sprachwahl: nach der Wahl von English ist English markiert, die Beschriftung folgt der Sprache", en.gewaehlt.join(",") === "en" && en.titel === "en", JSON.stringify(en));
  await page.click('#anmeldung [data-aktion="weiter"]');
  await page.waitForFunction(() => document.getElementById("anmeldung").dataset.schritt === "wer", { timeout: 5000 });
  const weiter = await page.evaluate(() => ({ leiste: document.querySelector("[data-anm-sprachleiste]").checkVisibility(), auswahl: document.getElementById("anm-sprache").checkVisibility(), wert: document.getElementById("anm-sprache").value }));
  ok("Sprachwahl: nach dem Startschritt ist die Leiste oben weg, die Auswahl in der Leiste des Assistenten zeigt die Sprache", !weiter.leiste && weiter.auswahl && weiter.wert === "en", JSON.stringify(weiter));
  await page.select("#anm-sprache", "de");
  ok("Sprachwahl: keine Fehler in der Konsole", page.__st.konsole.length === 0, page.__st.konsole.slice(0, 3).join(" | "));
  await page.close();
}

// App-Modus (?app=1, wie bei den übrigen Seiten): Rahmen der Begleitseite weg, Hinweis "Im Browser öffnen" oben auf dem Startschritt und auf
// der Fertig-Seite, Fehler beim Speichern oder Teilen werden abgefangen. Der Assistent selbst bleibt gleich: dieselben Schritte bis "fertig".
async function pruefeAppModus(browser, server, dateien) {
  console.log("\n=== N-A2: App-Modus (?app=1) bei 390 x 844 ===");
  const vorher = async (page) => {
    // Teilen schlägt fehl (Browser der App erlaubt es nicht); das Speichern prüft der Test weiter unten gezielt
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "canShare", { value: () => true, configurable: true });
      Object.defineProperty(navigator, "share", { value: () => Promise.reject(new DOMException("nicht erlaubt", "NotAllowedError")), configurable: true });
    });
  };
  const normal = await neueSeite(browser, server, MOBIL, "app-modus-kontrolle", { vorLaden: vorher });
  const kontrolle = await normal.evaluate(() => {
    const sicht = (e) => !!e && e.checkVisibility();
    return { appKlasse: document.documentElement.classList.contains("app-modus"), kopf: sicht(document.querySelector(".begleit-kopf")), fuss: sicht(document.querySelector(".ws-fuss")), hinweis: sicht(document.querySelector("[data-anm-apphinweis]")) };
  });
  ok("Ohne ?app=1: Rahmen der Begleitseite sichtbar, kein Hinweis für die App", !kontrolle.appKlasse && kontrolle.kopf && kontrolle.fuss && !kontrolle.hinweis, JSON.stringify(kontrolle));
  await normal.close();

  const page = await neueSeite(browser, server, MOBIL, "app-modus", { abfrage: "?app=1", vorLaden: vorher });
  const d = await page.evaluate(() => {
    const sicht = (e) => !!e && e.checkVisibility();
    const r = (e) => e.getBoundingClientRect();
    const hinweis = document.querySelector("[data-anm-apphinweis]");
    const link = hinweis && hinweis.querySelector("a[data-anm-browserlink]");
    const leiste = document.querySelector("[data-anm-sprachleiste]");
    return {
      appKlasse: document.documentElement.classList.contains("app-modus"),
      kopf: sicht(document.querySelector(".begleit-kopf")),
      fuss: sicht(document.querySelector(".ws-fuss")),
      marke: (document.querySelector(".begleit-kopf__marke") || {}).textContent || "",
      assistent: sicht(document.getElementById("anmeldung")),
      h1: sicht(document.querySelector("h1")),
      hinweisSichtbar: sicht(hinweis),
      hinweisText: hinweis ? hinweis.textContent.replace(/\s+/g, " ").trim() : "",
      hinweisUnten: hinweis ? Math.round(r(hinweis).bottom) : null,
      hinweisVorAssistent: hinweis ? r(hinweis).bottom <= r(document.getElementById("anmeldung")).top : false,
      link: link && { href: link.getAttribute("href"), target: link.getAttribute("target"), rel: link.getAttribute("rel"), text: link.textContent.trim() },
      leisteSichtbar: sicht(leiste),
      hoehe: window.innerHeight,
      breite: document.documentElement.scrollWidth <= window.innerWidth,
    };
  });
  const ohneApp = server.basis + "/anmeldung/";
  ok("App-Modus: Klasse app-modus am <html>, Kopfleiste „Begleitseite zum Prototyp“ mit Navigation und Fußnote „Begleitmaterial“ sind weg", d.appKlasse && !d.kopf && !d.fuss, JSON.stringify({ kopf: d.kopf, fuss: d.fuss }));
  ok("App-Modus: der Assistent bleibt (Überschrift, Assistent, Sprachwahl) und es gibt kein Querscrollen", d.assistent && d.h1 && d.leisteSichtbar && d.breite, "");
  ok("App-Modus: auf dem Startschritt oben der Hinweis zum Speichern der Datei (Einfache Sprache), sichtbar im ersten Bildschirm", d.hinweisSichtbar && /^In der App kann das Speichern der PDF-Datei manchmal nicht klappen\. Dann öffnen Sie die Anmeldung im Browser\./.test(d.hinweisText) && d.hinweisUnten <= d.hoehe && d.hinweisVorAssistent, d.hinweisText + " (unten " + d.hinweisUnten + ")");
  ok("App-Modus: Link „Im Browser öffnen“ führt auf dieselbe Seite ohne ?app=1, neuer Tab, rel=noopener", !!d.link && d.link.href === ohneApp && !/app=1/.test(d.link.href) && d.link.target === "_blank" && /\bnoopener\b/.test(d.link.rel || "") && d.link.text === "Im Browser öffnen", JSON.stringify(d.link));
  await page.screenshot({ path: path.join(AUSGABE, MOBIL.name, "app-start.png"), fullPage: false });
  protokoll.screenshots++;

  // Der Assistent selbst bleibt gleich: dieselben Schritte bis "fertig" wie ohne ?app=1
  await ladeBeispielPerKnopf(page, "wechsel-hessen");
  const ctxApp = neuerKontext({ name: "app-modus", vp: MOBIL, modus: "beispiel", gesehen: new Set(), touch: true, axeImmer: false, dateien });
  const rApp = await laufe(page, ctxApp);
  const pageN = await neueSeite(browser, server, MOBIL, "app-modus-normal", { vorLaden: vorher });
  await ladeBeispielPerKnopf(pageN, "wechsel-hessen");
  const ctxN = neuerKontext({ name: "app-modus-normal", vp: MOBIL, modus: "beispiel", gesehen: new Set(), touch: true, axeImmer: false, dateien });
  const rN = await laufe(pageN, ctxN);
  await pageN.close();
  ok("App-Modus: bis „fertig“ dieselben Schritte wie ohne ?app=1 (" + rApp.besucht.length + " Seiten)", rApp.besucht[rApp.besucht.length - 1].startsWith("fertig") && JSON.stringify(rApp.besucht) === JSON.stringify(rN.besucht), rApp.besucht.length + " gegen " + rN.besucht.length);
  const daten = await ergebnisPruefen(page, ctxApp, dateien);
  ok("App-Modus: die Datei wird erstellt", !!daten, daten ? daten.dateiname : "");
  const f = await page.evaluate(() => {
    const h = document.querySelector("#anmeldung [data-app-hinweis]");
    const link = h && h.querySelector("a");
    return { da: !!h && h.checkVisibility(), text: h ? h.textContent.replace(/\s+/g, " ").trim() : "", href: link && link.getAttribute("href"), target: link && link.getAttribute("target"), rel: link && link.getAttribute("rel") };
  });
  ok("App-Modus (Fertig-Seite): knapper Hinweis „Klappt das Speichern nicht?“ mit Link „Im Browser öffnen“ ohne ?app=1", f.da && /^Klappt das Speichern nicht\? Dann öffnen Sie die Anmeldung im Browser\. Im Browser öffnen$/.test(f.text) && f.href === ohneApp && f.target === "_blank" && /\bnoopener\b/.test(f.rel || ""), JSON.stringify(f));
  // Teilen schlägt fehl und Herunterladen schlägt fehl: Statt still nichts zu tun, kommt eine Meldung mit dem Link
  const knoepfe = await page.evaluate(() => Array.from(document.querySelectorAll('#anmeldung .anm-ergebnis [data-aktion]')).filter((e) => !e.hidden).map((e) => e.getAttribute("data-aktion")));
  ok("App-Modus (Fertig-Seite): Knöpfe zum Herunterladen und Teilen sind da (Teilen ist hier erlaubt gestellt)", knoepfe.includes("herunterladen") && knoepfe.includes("teilen"), knoepfe.join(","));
  await page.evaluate(() => {
    window.__anklickSperre = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () { throw new Error("Speichern in der App nicht möglich"); };
  });
  const meldung = () => page.evaluate(() => { const st = document.querySelector("#anmeldung .anm-status"); const a = st && st.querySelector("a"); return { text: st ? st.textContent.replace(/\s+/g, " ").trim() : "", href: a && a.getAttribute("href"), target: a && a.getAttribute("target"), rel: a && a.getAttribute("rel") }; });
  await page.click('#anmeldung [data-aktion="herunterladen"]');
  const m1 = await meldung();
  const hinweis1 = await page.evaluate(() => { const h = document.querySelector("#anmeldung [data-app-hinweis]"); return !!h && h.checkVisibility(); });
  ok("App-Modus: Herunterladen schlägt fehl – Meldung „Das Speichern hat nicht geklappt“ mit Link „Im Browser öffnen“ (kein stilles Nichts); der kurze Hinweis darunter entfällt dann", /^Das Speichern hat nicht geklappt\. Öffnen Sie die Anmeldung im Browser\. Im Browser öffnen$/.test(m1.text) && m1.href === ohneApp && m1.target === "_blank" && /\bnoopener\b/.test(m1.rel || "") && !hinweis1, JSON.stringify(m1));
  await page.evaluate(() => { document.querySelector("#anmeldung .anm-status").textContent = ""; });
  await page.click('#anmeldung [data-aktion="teilen"]');
  await page.waitForFunction(() => /nicht geklappt/.test((document.querySelector("#anmeldung .anm-status") || {}).textContent || ""), { timeout: 4000 }).catch(() => {});
  const m2 = await meldung();
  ok("App-Modus: Teilen und danach Speichern schlagen fehl – Meldung mit Link", /^Das Speichern hat nicht geklappt\./.test(m2.text) && m2.href === ohneApp, JSON.stringify(m2));
  await page.evaluate(() => { HTMLAnchorElement.prototype.click = window.__anklickSperre; document.querySelector("#anmeldung .anm-status").textContent = ""; });
  await page.click('#anmeldung [data-aktion="teilen"]');
  await page.waitForFunction(() => /Teilen geht hier nicht/.test((document.querySelector("#anmeldung .anm-status") || {}).textContent || ""), { timeout: 4000 }).catch(() => {});
  const m3 = await meldung();
  const hinweis3 = await page.evaluate(() => { const h = document.querySelector("#anmeldung [data-app-hinweis]"); const a = h && h.querySelector("a"); return { sichtbar: !!h && h.checkVisibility(), href: a && a.getAttribute("href") }; });
  ok("App-Modus: Teilen geht nicht, Speichern klappt – der Status nennt das, der kurze Hinweis mit dem Link zum Browser steht darunter", /^Teilen geht hier nicht\. Die Datei wurde stattdessen gespeichert\.$/.test(m3.text) && hinweis3.sichtbar && hinweis3.href === ohneApp, JSON.stringify({ m3, hinweis3 }));
  await page.screenshot({ path: path.join(AUSGABE, MOBIL.name, "app-fertig.png"), fullPage: false });
  protokoll.screenshots++;
  ok("App-Modus: keine Fehler in der Konsole (außer dem gewollten Fehler beim Speichern)", page.__st.konsole.filter((t) => !/Datei nicht gespeichert|Speichern in der App nicht möglich/.test(t)).length === 0, page.__st.konsole.slice(0, 3).join(" | "));
  await page.close();
}

// Beitragsgruppen und Übungszeiten der Karnevalgruppen kommen aus den Texten der Sprache (Nachbesserung sprache-16 und sprache-24):
// Auf Deutsch stehen sie wie in den Daten; mit abgefangenen englischen Wörterbüchern erscheinen die englischen Namen, Wochentage und "Uhr"-Muster.
async function pruefeUebersetzbareDaten(browser, server) {
  console.log("\n=== N-A2: Beitragsgruppen und Übungszeiten übersetzbar ===");
  const gruppen = server.konfig.anmeldung.beitragsgruppen;
  const karnevalGruppen = server.konfig.karnevalGruppen;
  // Deutsch: wie in den Daten
  const de = await seiteMitBeispiel(browser, server, MOBIL, "daten-de", "karneval-kind", "karneval");
  const kartenDe = await de.$$eval("#anmeldung .anm-karte", (l) => l.map((k) => ({ titel: (k.querySelector(".anm-karte__titel") || {}).textContent, hinweis: ((k.querySelector(".anm-karte__hinweis") || {}).textContent || "").replace(/\s+/g, " ").trim() })));
  const sollDe = karnevalGruppen.map((g) => ({ titel: g.name, hinweis: "Übungszeit: " + g.uebungszeit }));
  ok("Karneval-Gruppen (Deutsch): Übungszeit steht wie in den Daten (Wochentag, Uhrzeit, Uhr, Ort)", sollDe.every((x) => kartenDe.some((k) => k.titel === x.titel && k.hinweis.startsWith(x.hinweis))), JSON.stringify(kartenDe.slice(0, 2)));
  const nachBeitragDe = await geheBis(de, "beitrag", "gruppe");
  const kartenBeitragDe = await de.$$eval("#anmeldung .anm-karte .anm-karte__titel", (l) => l.map((k) => k.textContent.trim()));
  ok("Beitragsgruppen (Deutsch): Namen wie in data/anmeldung.json", nachBeitragDe.schritt === "beitrag" && kartenBeitragDe.length > 0 && kartenBeitragDe.every((t) => Object.values(gruppen).some((g) => t.startsWith(g.bezeichnung))), kartenBeitragDe.join(" | "));
  await de.close();

  // Englisch mit abgefangenen Wörterbüchern: Wochentage, Muster der Übungszeit, Namen der Beitragsgruppen
  const wochentage = { montag: "Monday", dienstag: "Tuesday", mittwoch: "Wednesday", donnerstag: "Thursday", freitag: "Friday", samstag: "Saturday", sonntag: "Sunday" };
  const grNamen = { fussball_jugend: "Children and youth (football, with U19)", karneval_kinder: "Children and youth (carnival)" };
  const abfangen = async (page) => {
    await page.setRequestInterception(true);
    page.on("request", async (req) => {
      const u = req.url();
      const eins = /\/texte\/en-(oberflaeche|regeln)\.js$/.exec(u);
      if (!eins) return req.continue();
      const original = await (await fetch(u)).text();
      const zusatz =
        eins[1] === "oberflaeche"
          ? `;export default { ...__orig, allgemein: { ...__orig.allgemein, wochentag: ${JSON.stringify(wochentage)} }, karneval: { ...__orig.karneval, gruppe: { ...__orig.karneval.gruppe, uebungszeit: "{tag}, {zeit}, {ort}", uebungszeitOhneOrt: "{tag}, {zeit}" } } };`
          : `;export default { ...__orig, beitrag: { ...__orig.beitrag, gruppen: ${JSON.stringify(grNamen)} } };`;
      req.respond({ status: 200, contentType: "text/javascript; charset=utf-8", body: original.replace(/export default \{/, "const __orig = {") + "\n" + zusatz });
    });
  };
  const en = await neueSeite(browser, server, MOBIL, "daten-en", { vorLaden: abfangen });
  await ladeBeispielPerKnopf(en, "karneval-kind");
  await en.click('[data-anm-sprachleiste] button[data-sprache="en"]');
  await en.waitForFunction(() => document.getElementById("anmeldung").getAttribute("lang") === "en", { timeout: 6000 });
  await geheBis(en, "karneval", "gruppe");
  const kartenEn = await en.$$eval("#anmeldung .anm-karte", (l) => l.map((k) => ({ titel: (k.querySelector(".anm-karte__titel") || {}).textContent, hinweis: ((k.querySelector(".anm-karte__hinweis") || {}).textContent || "").replace(/\s+/g, " ").trim() })));
  const dreamboys = kartenEn.find((k) => k.titel === "Dreamboys");
  const mittwoch = karnevalGruppen.find((g) => g.name === "Dreamboys").uebungszeit; // "Mittwoch 19:00–21:00 Uhr, Turnhalle Fridtjof-Nansen-Schule"
  const m = /^(\S+) (\S+) Uhr, (.+)$/.exec(mittwoch);
  ok("Karneval-Gruppen (Englisch): Wochentag und „Uhr“ stehen nach den Texten der Sprache, der Ort bleibt", !!dreamboys && !!m && dreamboys.hinweis.includes("Wednesday, " + m[2] + ", " + m[3]) && !/Mittwoch|Uhr/.test(dreamboys.hinweis), dreamboys ? dreamboys.hinweis : JSON.stringify(kartenEn));
  const nachBeitragEn = await geheBis(en, "beitrag", "gruppe");
  const kartenBeitragEn = await en.$$eval("#anmeldung .anm-karte .anm-karte__titel", (l) => l.map((k) => k.textContent.replace(/[⁦-⁩]/g, "").trim()));
  const vorschlagEn = await en.$$eval("#anmeldung .anm-text--gross", (l) => l.map((k) => k.textContent.replace(/[⁦-⁩]/g, "").trim()));
  const beitragSeite = nachBeitragEn.schritt === "beitrag";
  ok("Beitragsgruppen (Englisch): die Auswahl nennt die Namen aus den Texten der Sprache; fehlt ein Name dort, gilt der Name aus den Daten", beitragSeite && kartenBeitragEn.some((t) => t.startsWith(grNamen.karneval_kinder)) && kartenBeitragEn.every((t) => Object.keys(grNamen).some((k) => t.startsWith(grNamen[k])) || Object.values(gruppen).some((g) => t.startsWith(g.bezeichnung))), kartenBeitragEn.join(" | "));
  ok("Beitragsgruppen (Englisch): der Vorschlag oben nennt den Namen aus den Texten der Sprache", vorschlagEn.some((t) => t.includes(grNamen.karneval_kinder)), vorschlagEn.join(" | "));
  await geheBis(en, "pruefen", "haupt");
  const zeileEn = await en.$$eval("#anmeldung .anm-pruefzeile", (l) => l.filter((z) => /fee|Fee|contribution/i.test(z.querySelector("dt").textContent)).map((z) => z.querySelector(".anm-pruefzeile__wert").textContent.replace(/[⁦-⁩]/g, "").replace(/\s+/g, " ").trim()));
  ok("Beitragsgruppen (Englisch): die Prüfseite nennt den Namen aus den Texten der Sprache", zeileEn.length > 0 && zeileEn.some((t) => t.includes(grNamen.karneval_kinder)), zeileEn.join(" | "));
  await en.close();
}

async function pruefeVereinssicht(browser, server, beispiele) {
  const sichtbar = (page) =>
    page.evaluate(() =>
      Array.from(document.querySelectorAll("#anmeldung .anm-vereinshinweis"))
        .filter((e) => e.getClientRects().length > 0)
        .map((e) => e.innerText.replace(/\s+/g, " "))
    );
  // Ohne Schalter: bei den Unterlagen ist nichts für den Verein zu sehen.
  const ohne = await seiteMitBeispiel(browser, server, DESKTOP, "vereinssicht-aus", "wechsel-hessen", null);
  const s0 = await geheBis(ohne, "nachweise");
  const vorher = await sichtbar(ohne);
  ok("Vereinssicht: ohne Schalter zeigen die Unterlagen nichts für den Verein", s0.schritt === "nachweise" && vorher.length === 0, s0.schritt + ", " + vorher.length + " Kästen");
  await ohne.close();

  // Mit Schalter: auf "start" drücken (dort steht der Werkzeugkasten), dann durchklicken.
  const page = await seiteMitBeispiel(browser, server, DESKTOP, "vereinssicht", "wechsel-hessen", null);
  await page.click("[data-anm-vereinssicht]");
  const an = await page.evaluate(() => ({ gedrueckt: document.querySelector("[data-anm-vereinssicht]").getAttribute("aria-pressed"), an: document.getElementById("anmeldung").classList.contains("anm--verein"), text: document.querySelector("[data-anm-vereinssicht]").textContent }));
  const s1 = await geheBis(page, "nachweise");
  ok("Vereinssicht: Seite 'nachweise' erreicht", s1.schritt === "nachweise", s1.schritt);
  const nachher = await sichtbar(page);
  ok("Vereinssicht bei den Unterlagen: nach dem Schalter (gedrückt auf 'start') mit Kennung und Quelle sichtbar", an.an && an.gedrueckt === "true" && nachher.length > 0 && nachher.every((t) => /U\d\d/.test(t)), nachher.slice(0, 2).join(" || ").slice(0, 300));
  ok("Vereinssicht: Schalter wechselt seine Beschriftung", /ausblenden/.test(an.text), an.text);
  const mitQuelle = nachher.filter((t) => !/keine Quelle hinterlegt/.test(t)).length;
  ok("Vereinssicht: Unterlagen nennen ihre Quelle aus data/anmeldung.json", mitQuelle > 0, mitQuelle + " von " + nachher.length + " mit Quelle");
  await page.screenshot({ path: path.join(AUSGABE, DESKTOP.name, "vereinssicht-nachweise.png"), fullPage: true });
  // Weiter zur Prüfseite (Fälle, Status, Frist-Regel)
  const s3 = await geheBis(page, "pruefen");
  ok("Vereinssicht: Prüfseite erreicht", s3.schritt === "pruefen", s3.schritt);
  const pruef = await sichtbar(page);
  ok("Vereinssicht auf der Prüfseite: Regelwerk-Version, Fälle, Status und Frist-Regel mit Quelle", pruef.some((t) => /Regelwerk/.test(t) && /Fälle/.test(t) && /Status/.test(t)), pruef.join(" || ").slice(0, 400));
  await page.screenshot({ path: path.join(AUSGABE, DESKTOP.name, "vereinssicht-pruefen.png"), fullPage: true });
  // Entwurfs-Band auf einer Frageseite: schmale Zeile mit dem kurzen Satz
  const kurz = await page.$eval("[data-anm-band]", (e) => ({ text: e.innerText.replace(/\s+/g, " ").trim(), sichtbar: e.getClientRects().length > 0 }));
  ok("Entwurfs-Band auf der Prüfseite: schmale Zeile 'Entwurf – bitte keine echten Daten.'", kurz.sichtbar && kurz.text === "Entwurf – bitte keine echten Daten.", kurz.text);
  // Auf "fertig" steht der Werkzeugkasten wieder da: Schalter aus.
  await klickeWeiter(page, await stand(page));
  await page.waitForFunction(() => document.getElementById("anmeldung").dataset.schritt === "fertig", { timeout: 5000 });
  await page.click("[data-anm-vereinssicht]");
  const aus = await sichtbar(page);
  ok("Vereinssicht: wieder ausgeschaltet (auf 'fertig')", aus.length === 0, "");
  // Entwurfs-Band auf "fertig": der ganze Satz
  const band = await page.$eval("[data-anm-band]", (e) => ({ text: e.innerText.replace(/\s+/g, " ").trim(), sichtbar: e.getClientRects().length > 0 }));
  ok("Entwurfs-Band mit Hinweis 'nichts wird gesendet' ist auf 'fertig' voll sichtbar", band.sichtbar && /Entwurf zum Anschauen\. Bitte keine echten Daten eingeben\. Es wird nichts gesendet\./.test(band.text), band.text);
  await page.close();
}

async function pruefeBilder(browser, server, dateien, beispiele) {
  // ---- Nachweise: Foto verkleinern, EXIF entfernen, PDF, Fehlerfälle ----
  const page = await seiteMitBeispiel(browser, server, MOBIL, "bilder", "kind-neu", "nachweise");
  const s = await stand(page);
  if (s.schritt !== "nachweise") {
    ok("Bilder: Seite 'nachweise' erreicht", false, s.schritt);
    await page.close();
    return;
  }
  const abschnitt = '#anmeldung section[data-unterlage]';
  const uid = await page.$eval(abschnitt, (e) => e.getAttribute("data-unterlage"));
  const sel = abschnitt + '[data-unterlage="' + uid + '"]';
  await page.click(sel + ' label[for="' + (await page.$eval(sel + ' input[data-wert="habe"]', (e) => e.id)) + '"]');
  const foto = await page.$(sel + ' input[data-aktion="nachweis-foto"]');
  // Gültiges Foto mit EXIF
  await foto.uploadFile(dateien["foto-1600x1200.jpg"]);
  await page.waitForSelector(sel + " .anm-dateien__bild", { timeout: 8000 });
  await page.waitForFunction((q) => { const i = document.querySelector(q); return i && i.complete && i.naturalWidth > 0; }, { timeout: 5000 }, sel + " .anm-dateien__bild");
  const v1 = await bildDaten(page, sel + " .anm-dateien__bild");
  ok("Nachweis-Foto (Testbild 1600x1200 mit EXIF): erscheint als Vorschau", v1.breite > 0, v1.breite + "x" + v1.hoehe);
  ok("Nachweis-Foto: als JPEG neu kodiert, EXIF/Standort entfernt", v1.jpeg && !v1.exif && !v1.marker, "Kopf " + v1.kopf + ", Exif " + v1.exif + ", Marker " + v1.marker + ", " + v1.bytes + " Byte");
  ok("Nachweis-Foto: lange Seite höchstens 2000 Pixel", Math.max(v1.breite, v1.hoehe) <= 2000, v1.breite + "x" + v1.hoehe);
  await page.screenshot({ path: path.join(AUSGABE, MOBIL.name, "nachweis-vorschau.png"), fullPage: true });
  // Sehr großes Foto wird verkleinert
  await foto.uploadFile(dateien["foto-4000x3000.jpg"]);
  await page.waitForFunction((q) => document.querySelectorAll(q).length >= 2, { timeout: 15000 }, sel + " .anm-dateien__eintrag");
  const bilder = await page.$$eval(sel + " .anm-dateien__bild", (l) => l.map((i) => ({ b: i.naturalWidth, h: i.naturalHeight })));
  ok("Großes Foto (4000x3000) wird auf höchstens 2000 Pixel verkleinert", bilder.length === 2 && Math.max(bilder[1].b, bilder[1].h) === 2000, JSON.stringify(bilder[1]));
  // PDF
  const pdfFeld = await page.$(sel + ' input[data-aktion="nachweis-datei"]');
  await pdfFeld.uploadFile(dateien["unterlage.pdf"]);
  await page.waitForFunction((q) => document.querySelectorAll(q).length >= 3, { timeout: 8000 }, sel + " .anm-dateien__eintrag");
  const hatPdf = await page.$$eval(sel + " .anm-dateien__pdf", (l) => l.length);
  ok("PDF-Datei wird angenommen (unverändert, ohne Bildvorschau)", hatPdf === 1, "PDF-Einträge: " + hatPdf);
  // Fehlerfälle
  const faelle = [
    ["kaputt.jpg", /lässt sich nicht öffnen/, "Kaputtes Bild"],
    ["bild.heic", /Bildformat kann der Browser nicht lesen/, "HEIC-Datei"],
    ["text.txt", /kein Foto und kein PDF/, "Textdatei"],
    ["gross.pdf", /zu groß/, "PDF über 10 MB"],
  ];
  for (const [datei, muster, name] of faelle) {
    const eingabe = datei.endsWith(".pdf") || datei.endsWith(".txt") ? pdfFeld : foto;
    await eingabe.uploadFile(dateien[datei]);
    await page.waitForFunction((q) => { const e = document.querySelector(q); return e && !e.hidden && e.textContent.length > 3; }, { timeout: 8000 }, sel + " .anm-fehler[role=alert]").catch(() => {});
    const text = await page.$eval(sel + " .anm-fehler[role=alert]", (e) => (e.hidden ? "" : e.textContent)).catch(() => "");
    ok(name + ": verständliche Fehlermeldung", muster.test(text), text);
  }
  // Ohne Datei "Habe ich" abweisen
  await page.close();

  // ---- Spielerfoto: Zuschnitt 3:4 ----
  const p2 = await seiteMitBeispiel(browser, server, MOBIL, "spielerfoto", "kind-neu", "spielerfoto");
  const s2 = await stand(p2);
  if (s2.schritt !== "spielerfoto") {
    ok("Spielerfoto: Seite erreicht", false, s2.schritt);
    await p2.close();
    return;
  }
  await p2.click('#anmeldung label[for="' + (await p2.$eval('#anmeldung input[data-pfad="spielerfoto.weg"][data-wert="datei"]', (e) => e.id)) + '"]');
  const feld = await p2.$('#anmeldung input[data-aktion="spielerfoto-waehlen"]');
  await feld.uploadFile(dateien["foto-1600x1200.jpg"]);
  await p2.waitForFunction(() => { const i = document.querySelector("#anmeldung .anm-vorschau-foto"); return i && !i.hidden && i.complete && i.naturalWidth > 0; }, { timeout: 8000 });
  const f1 = await bildDaten(p2, "#anmeldung .anm-vorschau-foto");
  ok("Spielerfoto (1600x1200): mittig auf 3:4 zugeschnitten, 750x1000", f1.breite === 750 && f1.hoehe === 1000, f1.breite + "x" + f1.hoehe);
  ok("Spielerfoto: JPEG ohne EXIF", f1.jpeg && !f1.exif, "");
  await p2.screenshot({ path: path.join(AUSGABE, MOBIL.name, "spielerfoto-vorschau.png"), fullPage: true });
  await feld.evaluate((e) => e).catch(() => {});
  const anderes = await p2.$('#anmeldung input[data-aktion="spielerfoto-anderes"]');
  await anderes.uploadFile(dateien["foto-376x502.jpg"]);
  await p2.waitForFunction(() => { const i = document.querySelector("#anmeldung .anm-vorschau-foto"); return i && i.naturalWidth === 376 || (i && i.naturalWidth > 0 && i.naturalWidth !== 750); }, { timeout: 8000 });
  const f2 = await bildDaten(p2, "#anmeldung .anm-vorschau-foto");
  ok("Spielerfoto (376x502): kleinster erlaubter Ausschnitt 3:4, mindestens 375 Pixel breit", f2.breite >= 375 && Math.abs(f2.breite / f2.hoehe - 0.75) < 0.01, f2.breite + "x" + f2.hoehe);
  await anderes.uploadFile(dateien["foto-300x200.jpg"]);
  await p2.waitForFunction(() => { const e = document.querySelector("#anmeldung [role=alert].anm-fehler"); return e && !e.hidden && e.textContent.length > 3; }, { timeout: 8000 }).catch(() => {});
  const zuKlein = await p2.$eval("#anmeldung [role=alert].anm-fehler", (e) => (e.hidden ? "" : e.textContent)).catch(() => "");
  ok("Spielerfoto (300x200): Meldung 'Das Bild ist zu klein'", /zu klein/.test(zuKlein), zuKlein);
  await p2.close();
}

// Liest ein Bild (blob-Adresse) in der Seite: Maße, JPEG-Kopf, EXIF-Marker.
async function bildDaten(page, selektor) {
  return page.evaluate(async (q) => {
    const img = document.querySelector(q);
    const antwort = await fetch(img.src);
    const bytes = new Uint8Array(await antwort.arrayBuffer());
    const text = new TextDecoder("latin1").decode(bytes);
    return {
      breite: img.naturalWidth,
      hoehe: img.naturalHeight,
      jpeg: bytes[0] === 0xff && bytes[1] === 0xd8,
      kopf: bytes[0].toString(16) + bytes[1].toString(16),
      exif: text.includes("Exif"),
      marker: text.includes("GPS-TEST-MARKER"),
      bytes: bytes.length,
    };
  }, selektor);
}

async function pruefeBerichtsseite(browser, server, beispiele) {
  // Prüfseite: Ändern-Links führen zur Seite und danach zurück zur Prüfung; Unterschrift als Vorschau.
  const page = await seiteMitBeispiel(browser, server, DESKTOP, "pruefseite", "kind-neu", "unterschriften");
  const ctx = neuerKontext({ name: "pruefseite", vp: DESKTOP, modus: "beispiel", gesehen: new Set(), touch: false, dateien: {} });
  await unterschreiben(page, ctx);
  await klickeWeiter(page, await stand(page));
  const s = await stand(page);
  ok("Prüfseite erreicht", s.schritt === "pruefen", s.schritt);
  const vorschau = await page.evaluate(async () => {
    const bilder = Array.from(document.querySelectorAll("#anmeldung .anm-vorschau-unterschrift"));
    const aus = [];
    for (const img of bilder) {
      const b = new Uint8Array(await (await fetch(img.src)).arrayBuffer());
      aus.push({ png: b[0] === 0x89 && b[1] === 0x50, farbtyp: b[25], breite: img.naturalWidth, alt: img.alt });
    }
    return aus;
  });
  ok("Prüfseite zeigt die Unterschriften als kleine Vorschau (transparentes PNG)", vorschau.length >= 1 && vorschau.every((v) => v.png && v.farbtyp === 6 && v.breite > 0), JSON.stringify(vorschau.map((v) => v.alt)));
  // Ändern: Adresse
  const aendern = await page.$$('#anmeldung [data-aktion="aendern"]');
  ok("Prüfseite hat Ändern-Knöpfe mit erklärendem Namen", aendern.length >= 5, aendern.length + " Knöpfe");
  const label = await page.$eval('#anmeldung [data-aktion="aendern"]', (e) => e.getAttribute("aria-label"));
  ok("Ändern-Knopf nennt das Feld für Screenreader", /Ändern|ändern/.test(label) && label.length > 8, label);
  await page.evaluate(() => {
    const z = Array.from(document.querySelectorAll("#anmeldung .anm-pruefzeile")).find((r) => /Adresse/.test(r.querySelector("dt").textContent));
    z.querySelector("button").click();
  });
  await page.waitForFunction(() => document.getElementById("anmeldung").dataset.schritt === "kontakt", { timeout: 4000 });
  const weiterText = await page.$eval('#anmeldung [data-aktion="weiter"]', (e) => e.textContent);
  ok("Ändern führt zur Seite, der Knopf heißt 'Speichern und zurück zur Prüfung'", /zurück zur Prüfung/.test(weiterText), weiterText);
  await page.click('#anmeldung [data-aktion="weiter"]');
  await page.waitForFunction(() => document.getElementById("anmeldung").dataset.schritt === "pruefen" || document.getElementById("anmeldung").dataset.teil === "erreichen", { timeout: 4000 });
  let st = await stand(page);
  if (st.schritt === "kontakt") {
    await page.click('#anmeldung [data-aktion="weiter"]');
    await page.waitForFunction(() => document.getElementById("anmeldung").dataset.schritt === "pruefen", { timeout: 4000 });
    st = await stand(page);
  }
  ok("Nach dem Ändern geht es zurück zur Prüfseite", st.schritt === "pruefen", st.schritt + "/" + st.teil);
  await page.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
