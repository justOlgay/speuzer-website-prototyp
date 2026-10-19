#!/usr/bin/env node
// Browser-Durchlauf der Übersetzungen des Anmelde-Assistenten (Arbeitspaket AP-5).
//
// Baut nicht selbst: Zuerst bauen (sh tools/cache/bau-sperre.sh build). Der Test startet
// einen kleinen statischen Server auf docs/ (freier Port, siehe testserver.mjs) und
// steuert Chrome (puppeteer-core, headless) auf dem Handy (390 x 844, Touch).
//
// Je Sprache (Englisch, Türkisch, Arabisch) und je Beispiel ("Kind neu", "Wechsel in
// Hessen" und "Karneval Kind") wird der Assistent von der Startseite bis "fertig"
// durchgeklickt, die Datei wird erstellt. Geprüft wird:
//   - Schlüssel-Abgleich mit den deutschen Dateien (wie uebersetzung-pruefen.mjs)
//   - lang und dir am Assistenten (Arabisch: dir="rtl" und Schreibrichtung rtl)
//   - keine Meldung "Ein Teil ist noch nicht übersetzt" und kein "Diese Sprache ist noch
//     nicht da" (weder deutsch noch in der Zielsprache)
//   - kein Text fehlt: keine Konsolenwarnung "Text fehlt", kein sichtbarer Textschlüssel
//     (zum Beispiel "abmeldung.status.titel")
//   - kein deutscher Rückfalltext: kein deutscher Satz aus den Quelldateien steht sichtbar
//     auf der Seite (Vorführung und Daten des Vereins sind ausgenommen)
//   - kein Querscrollen bei 390 px auf jeder Seite; westliche Ziffern
//   - Arabisch: Zurück-Knopf rechts, Hilfe links (Spiegelung)
//   - Fehlermeldung (leeres Feld) und Hilfe-Dialog in jeder Sprache
//   - Sprachwechsel mitten im Ablauf (Auswahl oben) behält Seite und Antworten
//   - keine Fehler in der Konsole, keine fehlgeschlagenen Anfragen, keine fremden Hosts
//   - Nachrunde (30.09.): Satzung-Block auf der Unterschriftenseite (übersetzt, "(Satzung)" in
//     Klammern, Kästchen wird vor dem Unterschreiben angekreuzt); die "Gilt für"-Liste trennt die
//     Namen mit dem Trenner der Sprache (Arabisch: arabisches Komma, sonst Komma und Leerzeichen);
//     die Pflichtfrage zum Heimweg nach dem Training (M1, 11.10.2026; Beispiele "Kind neu" und "Karneval Kind"; solange
//     eine Sprache den Schlüssel heimweg.titel noch nicht kennt, zeigt die Seite den deutschen Rückfall und der Lauf meldet das nur
//     als Hinweis – die Übersetzung liefert Paket M3); alle sechs Meldungen zu "lateinische Buchstaben"
//     (Name, Ort, Verein, Anschrift, Nummer, Text) mit Text in anderer Schrift im Feld; der Kasten für
//     getrennt lebende Eltern auf "sorge" und "unterschriften"
//   - Nachbesserung M9, Runde 2 (11.10.2026, Modus „bildschirm“): Feld des Kindes leer – der Hinweis am Feld ist ein einziger Satz (ohne den Satz zum
//     Ausdruck mit Stift), Weiter geht, die Prüfseite zeigt in der Sprache „Nicht unterschrieben (freiwillig)“, die Fertig-Seite „alles am Bildschirm unterschrieben“
//   - M10 (11.10.2026): Fertig-Seite, Abschnitt „So schicken Sie die Datei an den Verein“ in jeder Sprache (Titel, Schritte am Handy und am
//     Computer mit der Beschriftung der Knöpfe, Adresse von links nach rechts, Knöpfe „Adresse kopieren“ und „E-Mail an die Geschäftsstelle öffnen“, Hinweis
//     zum Anhang); der mailto-Link bleibt deutsch (Betreff „Anmeldung Vorname Nachname“, deutscher Text), auch in Arabisch. Die Seiten des Tests tun, als könne
//     der Handy-Browser Dateien teilen (navigator.share): So steht der Weg am Handy da; ohne „Datei teilen“ (nach dem Neuzeichnen, siehe P3 Teil b) der Weg am Computer.
//   - P3 Teil b (12.10.2026, Kürzungen nach STILREGELN): Der Satzung-Block hat keine eigene Überschrift mehr (Erklärung und Beschriftung stehen in der Sprache);
//     „Diese Unterschrift gilt für {n} Blätter“ ist ab zwei Blättern zugeklappt und trägt den Text unterschriften.giltFuerBlaetter der Sprache mit der Zahl der Blätter (bei einem Blatt steht die Zeile „Titel: Blatt“ direkt da, Runde 2); die Fertig-Seite
//     zeigt keine Liste der Teile mehr (weder die Titel der Sprache noch die deutschen) und im Abschnitt „So schicken Sie die Datei an den Verein“ keinen Satz unter
//     der Überschrift und keine Überschriften der Wege: Es steht nur der Weg, der zum Gerät passt (am Handy mit „Datei teilen“ der Weg über das Teilen, sonst der
//     Weg über das Herunterladen).
//   - M12-ar, Runde 2 (12.10.2026): Prüfseite, Zeile „Geboren“: das Alter steht nach der Vorlage allgemein.alterJahre mit {n} hinter dem Datum, ohne ein an
//     die Zahl gehängtes Wort (Arabisch: „العمر: 8“); allgemein.jahre gibt es nicht mehr
//   - M14 (12.10.2026): Der Verein beantragt für Fußball immer das Spielrecht. Die Seite „spielerpass“ zeigt in jeder Sprache die übersetzte Erklärung zum Spielrecht
//     (drei Absätze, Schlüssel spielerpass.spielrecht); die frühere Frage zu den Spielen (Block spielen) gibt es in keiner Sprache mehr
//   - P1 (12.10.2026): Zugang mit Code vom Probetraining und Übergabe in den Browser in allen vier Sprachen (Deutsch, Englisch, Türkisch, Arabisch):
//     Die Code-Seite zeigt die Texte der Sprache (Titel, zwei Sätze, Beschriftung, Meldungen leer und falsch, die zwei Links darunter mit dem Text in der
//     Sprache), ohne deutschen Rückfalltext; Arabisch von rechts nach links (Beschriftung rechts, Hilfe links, das Feld bleibt von links nach rechts);
//     ein richtiger Code führt zum Startschritt in der Sprache; ?app=1 zeigt nur die Übergabe („Im Browser öffnen“) in der Sprache. Der Testserver setzt
//     die Prüfwerte zur Laufzeit (server.setzeZugang). Fotos code-390-<sprache>.png, code-fehler-390-<sprache>.png, app-uebergabe-390-<sprache>.png.
//   - Bildschirmfotos von start, name, nachweise, unterschriften (auch der Ausschnitt mit Satzung und
//     "Gilt für"), fertig (und Hilfe, Fehlermeldung, Heimweg, getrennte Eltern, lateinische
//     Buchstaben) nach tools/cache/anmeldung-test/sprachen/
//
// Aufruf: node tools/anmeldung-test/e2e-sprachen.mjs [--sprache=ar] [--ein-beispiel] [--mangeltest] [--hfv=stift]
//         --mangeltest: entfernt im Testserver einige Schlüssel aus der englischen Datei und prüft, dass
//         der Durchlauf das bemerkt (Beweis, dass der Test einen fehlenden Text erkennt); Ausgabe nach
//         tools/cache/anmeldung-test/sprachen-mangeltest/
//         (ANM_QUELLE=assets liefert /assets/ direkt aus dem Arbeitsordner, ohne vorher zu bauen)
// Exit 0 nur, wenn alles bestanden ist.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import puppeteer from "puppeteer-core";
import { starteTestserver } from "./testserver.mjs";
import { pruefeSprache, blaetter, SPRACHEN } from "./uebersetzung-pruefen.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const MANGELTEST = process.argv.includes("--mangeltest");
const AUSGABE = path.join(ROOT, "tools", "cache", "anmeldung-test", MANGELTEST ? "sprachen-mangeltest" : "sprachen");
const TEXTE = path.join(ROOT, "assets", "js", "anmeldung", "texte");
const MOBIL = { name: "390x844", breite: 390, hoehe: 844 };

const ARG_SPRACHE = (process.argv.find((a) => a.startsWith("--sprache=")) || "").split("=")[1] || null;
const EIN_BEISPIEL = process.argv.includes("--ein-beispiel");
// Schalter unterschriftHfv (data/anmeldung.json, Jugendleitung 11.10.2026): Standard ist der Stand der Daten („bildschirm“); --hfv=stift legt ihn nur im
// Testserver um (Stand bis 11.10.2026), die Datei bleibt unverändert.
const ARG_HFV = (process.argv.find((a) => a.startsWith("--hfv=")) || "").split("=")[1] || null;

const NAMEN = { en: "Englisch", tr: "Türkisch", ar: "Arabisch" };
const BEISPIELE = [
  { id: "kind-neu", titel: "Kind neu" },
  { id: "wechsel-hessen", titel: "Wechsel Hessen" },
  { id: "karneval-kind", titel: "Karneval Kind" },
];
// Diese Schritte werden je Sprache fotografiert.
const FOTO_SCHRITTE = ["start", "name", "nachweise", "unterschriften", "fertig"];

// ---------- Ergebnisse ----------

let fehlerAnzahl = 0;
const pruefungen = [];
function ok(name, bedingung, detail) {
  pruefungen.push({ name, ok: !!bedingung, detail: detail || "" });
  if (!bedingung) fehlerAnzahl++;
  console.log((bedingung ? "OK      " : "FEHLER  ") + name + (detail ? " – " + detail : ""));
  return !!bedingung;
}
const info = (t) => console.log("        " + t);
const warte = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- Deutsche Muster: erkennen, wenn ein deutscher Satz sichtbar bleibt ----------

async function ladeDe(datei) {
  return (await import(pathToFileURL(path.join(TEXTE, datei)).href + "?z=" + Date.now())).default;
}

const maskiere = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const zuMuster = (zeile) => maskiere(zeile).replace(/\\\{\w+\\\}/g, ".{0,140}?");

// { kurz: [Regex-Quelltexte für ganze Textstücke], lang: [Regex-Quelltexte für Sätze ab 30 Zeichen] }
async function baueDeMuster(code) {
  const deMap = new Map([...blaetter(await ladeDe("de-oberflaeche.js")), ...blaetter(await ladeDe("de-regeln.js"))]);
  const uebersetzt = new Map([...blaetter(await ladeDe(code + "-oberflaeche.js")), ...blaetter(await ladeDe(code + "-regeln.js"))]);
  const kurz = new Set();
  const lang = new Set();
  for (const [pfad, text] of deMap) {
    if (typeof text !== "string" || /^hilfe\.kontakte\./.test(pfad)) continue;
    if (uebersetzt.get(pfad) === text) continue; // in dieser Sprache gleich geschrieben (Eigenname, Kürzel)
    for (const zeile of text.split("\n")) {
      const z = zeile.trim();
      if (z.length < 6 || !/\p{L}{3}/u.test(z.replace(/\{\w+\}/g, ""))) continue;
      kurz.add("^" + zuMuster(z) + "$");
      // einzelne Sätze ab 30 Zeichen zusätzlich als Teilstück
      for (const satz of z.split(/(?<=[.!?:])\s+/)) if (satz.trim().length >= 30) lang.add(zuMuster(satz.trim()));
    }
  }
  return { kurz: [...kurz], lang: [...lang] };
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

async function neueSeite(browser, server, name, abfrage = "") {
  const page = await browser.newPage();
  await page.setViewport({ width: MOBIL.breite, height: MOBIL.hoehe, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await page.evaluateOnNewDocument(UHR);
  // M10: Der Handy-Browser kann Dateien teilen (Web Share): Die Fertig-Seite zeigt „Datei teilen“ und den Weg am Handy (beide Wege des Abschnitts)
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "canShare", { value: () => true, configurable: true });
    Object.defineProperty(navigator, "share", { value: () => Promise.resolve(), configurable: true });
  });
  const st = { name, konsole: [], warnungen: [], hosts: new Set(), antworten: [] };
  page.on("console", (m) => {
    const t = m.text();
    if (m.type() === "error") st.konsole.push("console.error: " + t);
    if (m.type() === "warning" && /Text fehlt/.test(t)) st.warnungen.push(t);
  });
  page.on("pageerror", (e) => st.konsole.push("pageerror: " + e.message));
  page.on("request", (r) => {
    const u = r.url();
    if (/^https?:/.test(u)) st.hosts.add(new URL(u).host);
  });
  page.on("response", (r) => {
    if (r.status() >= 400) st.antworten.push(r.status() + " " + r.url());
  });
  page.on("dialog", (d) => d.accept());
  page.__st = st;
  await page.goto(server.basis + "/anmeldung/" + abfrage, { waitUntil: "networkidle0" });
  await page.waitForSelector("#anmeldung[data-bereit]", { timeout: 10000 });
  return page;
}

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
  } catch (e) {
    /* Seite blieb gleich */
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

// ---------- Unterschrift ----------

function zickzack(box) {
  const punkte = [];
  for (let i = 0; i <= 14; i++) punkte.push({ x: box.x + 24 + (i * (box.width - 48)) / 14, y: box.y + box.height * (0.45 + 0.25 * Math.sin(i * 1.3)) });
  return punkte;
}

async function zeichne(page, canvas) {
  await canvas.evaluate((e) => e.scrollIntoView({ block: "center" }));
  const box = await canvas.boundingBox();
  const p = zickzack(box);
  const finger = await page.touchscreen.touchStart(p[0].x, p[0].y);
  for (const q of p.slice(1)) await finger.move(q.x, q.y);
  await finger.end();
}

// Satzung: Am Bildschirm ist der Haken Pflicht. Klick auf die Beschriftung, wie eine Familie es tut.
async function haekchenSatzung(page) {
  const haken = await page.$('#anmeldung input[data-pfad="satzung"]');
  if (haken && !(await haken.evaluate((e) => e.checked))) {
    const id = await haken.evaluate((e) => e.id);
    await page.click('#anmeldung label[for="' + id + '"]');
  }
}

async function unterschreiben(page) {
  await haekchenSatzung(page);
  const felder = await page.$$eval("#anmeldung .anm-unterschrift", (l) => l.map((e) => e.getAttribute("data-unterschrift")));
  // Ein Elternteil reicht (O26, Jugendleitung 08.10.2026): kein zweites Feld der Eltern, in keiner Sprache
  const gezeichnet = felder;
  for (const wer of gezeichnet) {
    const canvas = await page.$('#anmeldung .anm-unterschrift[data-unterschrift="' + wer + '"] canvas');
    await zeichne(page, canvas);
  }
  await page
    .waitForFunction((n) => document.querySelectorAll("#anmeldung .anm-unterschrift--fertig").length >= n, { timeout: 5000 }, gezeichnet.length)
    .catch(() => {});
}

// ---------- Neue Texte der Nachrunde: Satzung, "Gilt für"-Liste, Karneval, Teiltitel ----------

const ohneSteuer = (t) => String(t).replace(/[\u2060\u2066-\u2069\u200E\u200F\u202A-\u202E]/g, "").replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim();

// Modus des Schalters unterschriftHfv im laufenden Testserver (siehe starteTestserver({ hfv }))
let SERVER_MODUS = "bildschirm";
const serverModus = () => SERVER_MODUS;

// Satzung-Block auf der Seite "unterschriften" und die "Gilt für"-Hinweise der Unterschriftsfelder.
// Vor dem Unterschreiben aufrufen (die Felder sind dann noch leer).
async function pruefeUnterschriftenSeite(page, code, sprache, dict, kennung, beispielId) {
  const erwartet = dict.unterschriften.satzung;
  const dom = await page.evaluate(() => {
    const b = document.querySelector("#anmeldung .anm-satzung");
    if (!b) return null;
    const haken = b.querySelector('input[data-pfad="satzung"]');
    const link = b.querySelector('a[data-aktion="satzung-lesen"]');
    return {
      // P3 Teil b (T70): Der Block hat keine eigene Überschrift mehr; die Erklärung ist der erste Satz darin
      ueberschriften: b.querySelectorAll("h2, h3, h4").length,
      erklaerung: (b.querySelector(":scope > p.anm-hinweis") || {}).textContent || "",
      text: b.innerText,
      linkText: link ? link.childNodes[0].textContent : null,
      linkZusatz: link ? (link.querySelector(".sr-only") || {}).textContent : null,
      label: haken ? (document.querySelector('label[for="' + haken.id + '"]') || {}).innerText || "" : "",
      hakenDa: !!haken,
      angekreuzt: haken ? haken.checked : null,
      pflicht: haken ? haken.getAttribute("aria-required") : null,
      // „Diese Unterschrift gilt für (n)“ (P3 Teil b, S7): ab zwei Blättern ein zugeklappter Bereich; Beschriftung im summary, eine Zeile je Blatt in der Liste
      gilt: Array.from(document.querySelectorAll("#anmeldung .anm-unterschrift details.anm-unterschrift__gilt")).map((d) => ({
        offen: d.open === true,
        beschriftung: (d.querySelector(":scope > summary") || {}).textContent || "",
        punkte: Array.from(d.querySelectorAll(":scope > ul > li")).map((li) => li.textContent),
        beschreibt: !!d.id && (d.closest(".anm-unterschrift").getAttribute("aria-describedby") || "").split(/\s+/).includes(d.id),
      })),
      // Runde 2 (S7): Gilt die Unterschrift nur für ein Blatt (n = 1), steht die Zeile direkt da (Absatz mit dem Titel und dem Blatt)
      eine: Array.from(document.querySelectorAll("#anmeldung .anm-unterschrift p.anm-unterschrift__gilt")).map((e) => ({
        text: e.textContent,
        sichtbar: e.checkVisibility(),
        beschreibt: !!e.id && (e.closest(".anm-unterschrift").getAttribute("aria-describedby") || "").split(/\s+/).includes(e.id),
      })),
      felder: document.querySelectorAll("#anmeldung .anm-unterschrift").length,
    };
  });
  // O26 (Jugendleitung, 08.10.2026): Ein Elternteil reicht. In keiner Sprache gibt es ein zweites Unterschriftsfeld der Eltern.
  const feldNamen = await page.$$eval("#anmeldung .anm-unterschrift", (l) => l.map((e) => e.getAttribute("data-unterschrift")));
  ok(kennung + ": ein Elternteil reicht: höchstens ein Unterschriftsfeld der Eltern, kein zweites Feld", !feldNamen.includes("sorgeberechtigte_2") && feldNamen.filter((w) => /^sorgeberechtigte/.test(w)).length <= 1, feldNamen.join(","));
  ok(kennung + ": Satzung-Block steht auf der Unterschriftenseite (Kästchen, nicht angekreuzt)", !!dom && dom.hakenDa && dom.angekreuzt === false, dom ? "" : "kein Satzung-Block");
  // M9 (11.10.2026): Wahl „Am Bildschirm“ und das freiwillige Feld des Kindes (Modus „bildschirm“) tragen den Text der Sprache; im Modus „stift“ gibt es das Feld nicht
  const bildschirmModus = serverModus() !== "stift";
  const feldDom = await page.evaluate(() => ({
    wahl: Array.from(document.querySelectorAll('#anmeldung input[data-pfad="unterschriftWeg"]')).map((i) => ({ wert: i.getAttribute("data-wert"), text: i.closest("label").innerText })),
    felder: Array.from(document.querySelectorAll("#anmeldung .anm-unterschrift")).map((f) => ({
      wer: f.getAttribute("data-unterschrift"),
      titel: (f.querySelector(".anm-unterschrift__titel") || { textContent: "" }).textContent,
      zusatz: (f.querySelector('[id$="-zusatz"]') || { textContent: "" }).textContent,
    })),
  }));
  const erstesWahl = ohneSteuer(feldDom.wahl.find((w) => w.wert === "bildschirm").text);
  const weg = dict.unterschriften.weg;
  // Der Hinweis nennt die Blätter für den Fußball-Verband nur, wenn die Anmeldung welche hat (nicht bei „Karneval Kind“)
  const mitVerbandsblaettern = beispielId !== "karneval-kind";
  ok(kennung + ": die Wahl „Am Bildschirm“ trägt den Text der Sprache (" + (bildschirmModus ? "alles am Bildschirm" + (mitVerbandsblaettern ? ", auch die Blätter des Verbands" : ", nur Vereinsunterlagen") : "wo es erlaubt ist") + ")", bildschirmModus
    ? erstesWahl.includes(ohneSteuer(weg.bildschirmAlles)) && (mitVerbandsblaettern ? erstesWahl.includes(ohneSteuer(weg.bildschirmAllesHinweis)) && !erstesWahl.includes(ohneSteuer(weg.bildschirmHinweis)) : erstesWahl.includes(ohneSteuer(weg.bildschirmHinweis)) && !erstesWahl.includes(ohneSteuer(weg.bildschirmAllesHinweis)))
    : erstesWahl.includes(ohneSteuer(weg.bildschirm)) && erstesWahl.includes(ohneSteuer(weg.bildschirmHinweis)), erstesWahl.slice(0, 120));
  const kindFeld = feldDom.felder.find((f) => f.wer === "spieler");
  if (bildschirmModus && kindFeld) {
    const vorlage = ohneSteuer(dict.unterschriften.person.spieler.kind).split("{name}");
    const titelKind = ohneSteuer(kindFeld.titel);
    ok(kennung + ": Feld des Kindes (freiwillig): Titel „" + vorlage.join("…") + "“ mit dem Zusatz der Sprache für „freiwillig“", titelKind.startsWith(vorlage[0]) && titelKind.includes(vorlage[1]) && titelKind.includes(ohneSteuer(dict.allgemein.freiwillig)), titelKind);
    ok(kennung + ": Feld des Kindes: Hinweis in der Sprache („Kann Ihr Kind schreiben? …“), ohne deutschen Text", ohneSteuer(kindFeld.zusatz) === ohneSteuer(dict.unterschriften.person.spielerHinweis.kind.replace(/\n/g, " ")), ohneSteuer(kindFeld.zusatz));
  } else if (!bildschirmModus) {
    ok(kennung + ": Modus stift: kein Feld für das Kind", !kindFeld, feldDom.felder.map((f) => f.wer).join(","));
  }
  if (!dom) return;
  ok(kennung + ": Satzung-Block übersetzt (Erklärung und Beschriftung), deutscher Name (Satzung) in Klammern, ohne eigene Überschrift (P3 Teil b)", dom.ueberschriften === 0 && erwartet.titel === undefined && ohneSteuer(dom.erklaerung) === ohneSteuer(erwartet.erklaerung) && ohneSteuer(dom.label).includes(ohneSteuer(erwartet.label)) && /\(Satzung\)/.test(ohneSteuer(dom.text)), dom.ueberschriften + " Überschrift(en) | " + ohneSteuer(dom.erklaerung).slice(0, 60) + " | " + ohneSteuer(dom.label).slice(0, 80));
  if (dom.linkText !== null) ok(kennung + ": Satzung-Link und Zusatz für Screenreader übersetzt", ohneSteuer(dom.linkText).includes(ohneSteuer(erwartet.link)) && ohneSteuer(dom.linkZusatz || "").includes(ohneSteuer(erwartet.linkZusatz)), ohneSteuer(dom.linkText) + " | " + ohneSteuer(dom.linkZusatz || ""));
  // „Diese Unterschrift gilt für {n} Blätter“ mit einer Zeile je Blatt (N-A2; zugeklappt seit P3 Teil b, S7): kein Trenner zwischen Namen in einer Zeile. Die Beschriftung ist
  // der Text unterschriften.giltFuerBlaetter der Sprache mit der Zahl der Blätter (D-07, 12.10.2026; vorher der Titel ohne Doppelpunkt und „(n)“).
  const aussen = (t) => t.replace(/\([^()]*\)/g, "");
  const beschriftungSoll = (n) => ohneSteuer(dict.unterschriften.giltFuerBlaetter.replace("{n}", String(n)));
  const gilt = dom.gilt.map((g) => ({ offen: g.offen, beschriftung: ohneSteuer(g.beschriftung), punkte: g.punkte.map((t) => ohneSteuer(t)), beschreibt: g.beschreibt }));
  ok(kennung + ": „Diese Unterschrift gilt für {n} Blätter“ steht ab zwei Blättern zugeklappt als Liste, ein Blatt je Zeile, ohne Trenner zwischen Namen; die Beschriftung ist der Text der Sprache mit der Zahl der Blätter",
    gilt.length > 0 && gilt.every((g) => !g.offen && g.punkte.length >= 2 && g.beschreibt && g.punkte.every((t) => !/[,\u060C]/.test(aussen(t))) && g.beschriftung === beschriftungSoll(g.punkte.length)),
    gilt.slice(0, 1).map((g) => g.beschriftung + " | " + g.punkte.slice(0, 3).join(" || ")).join("").slice(0, 200));
  // Runde 2 (S7): Bei einem Blatt (n = 1) steht die Zeile direkt da: der vorhandene Titel der Sprache mit Doppelpunkt, dahinter das Blatt; ohne „(1)“ und ohne Aufklappen.
  // B-1 (12.10.2026): Trägt der Blattname selbst einen Doppelpunkt („Titel: Person“), steht dort ein Gedankenstrich: genau ein Doppelpunkt in der Zeile.
  // Das Beispiel „Kind neu“ hat das Feld des Kindes mit einem Blatt; jede Sprache muss diesen Fall zeigen.
  const titelMitDoppelpunkt = ohneSteuer(dict.unterschriften.giltFuer);
  const eine = dom.eine.map((e) => ({ text: ohneSteuer(e.text), sichtbar: e.sichtbar, beschreibt: e.beschreibt }));
  ok(kennung + ": „Diese Unterschrift gilt für: <Blatt>“ steht bei einem Blatt direkt da (Titel der Sprache mit Doppelpunkt und das Blatt, ohne Zahl in Klammern), das Feld verweist mit aria-describedby darauf; jedes Feld hat die Zeile oder den Bereich",
    (beispielId !== "kind-neu" || eine.length > 0) && eine.every((e) => e.sichtbar && e.beschreibt && (e.text.startsWith(titelMitDoppelpunkt + " ") && e.text.length > titelMitDoppelpunkt.length + 1) && !/\(1\)\s*$/.test(e.text) && (e.text.match(/[:\uff1a]/g) || []).length === 1) && gilt.length + eine.length === dom.felder,
    eine.map((e) => e.text).join(" || ").slice(0, 200) + " (Bereiche: " + gilt.length + ", Zeilen: " + eine.length + ", Felder: " + dom.felder + ")");
  // Papierweg (P3 Teil b, T70): Nur dort steht unter dem Kästchen die Zeile „Freiwillig. Ohne Haken …“ (in der Sprache), und der Haken hängt an ihr
  // (aria-describedby). Am Bildschirm steht keine Zeile. Danach wieder „Am Bildschirm“ wählen, damit der Durchlauf unverändert weitergeht.
  const satzungsZeile = () =>
    page.evaluate(() => {
      const haken = document.querySelector('#anmeldung input[data-pfad="satzung"]');
      const zeile = haken ? haken.closest("label").querySelector(".anm-karte__hinweis") : null;
      return { zeile: zeile ? zeile.textContent : null, beschreibt: haken ? haken.getAttribute("aria-describedby") : null };
    });
  const waehleUnterschriftWeg = async (wert) => {
    const id = await page.$eval('#anmeldung input[data-pfad="unterschriftWeg"][data-wert="' + wert + '"]', (e) => e.id);
    await page.click('#anmeldung label[for="' + id + '"]');
    await warte(200);
  };
  const amBildschirm = await satzungsZeile();
  await waehleUnterschriftWeg("papier");
  const aufPapier = await satzungsZeile();
  await waehleUnterschriftWeg("bildschirm");
  const zurueck = await satzungsZeile();
  ok(kennung + ": Satzung-Kästchen: die Zeile „Freiwillig. Ohne Haken …“ steht nur auf dem Papierweg und in der Sprache; am Bildschirm keine Zeile (P3 Teil b)",
    amBildschirm.zeile === null && !amBildschirm.beschreibt && aufPapier.zeile !== null && ohneSteuer(aufPapier.zeile) === ohneSteuer(erwartet.freiwillig) && !!aufPapier.beschreibt && zurueck.zeile === null,
    JSON.stringify({ bildschirm: amBildschirm.zeile, papier: aufPapier.zeile && ohneSteuer(aufPapier.zeile).slice(0, 60), zurueck: zurueck.zeile }));
}

// Ergebnisseite (P3 Teil b, S5): Die Liste „Das steht in der Datei“ mit den Titeln der Teile gibt es nicht mehr (Teil A der Datei nennt die Teile selbst). Weder die
// Titel der Sprache (fertig.teilTitel) noch die deutschen Titel aus dem PDF-Modul stehen auf der Seite, und die Schlüssel der Liste (fertig.teileTitel, fertig.teil)
// gibt es in keiner Sprache mehr. Die Zeile zu Teil C steht nur mit den Gesundheitsdaten da; ob sie in der Sprache steht, sagt der Rückfall-Test der Seite.
async function pruefeKeineTeilListe(page, dict, kennung) {
  const seite = ohneSteuer(await page.$eval("#anmeldung", (e) => e.innerText));
  const titel = ["A", "B", "C"].map((x) => ohneSteuer(dict.fertig.teilTitel[x]));
  const da = titel.filter((t) => seite.includes(t));
  const deutsch = ["Für Sie (", "Für den Verein (", "Vertraulich ("].filter((t) => seite.includes(t));
  const schluessel = ["teileTitel", "teil"].filter((x) => dict.fertig[x] !== undefined);
  ok(kennung + ": Fertig-Seite ohne Liste der Teile (weder die Titel der Sprache noch die deutschen; die Schlüssel fertig.teileTitel und fertig.teil entfallen)", da.length === 0 && deutsch.length === 0 && schluessel.length === 0,
    (da.length ? "Titel der Sprache auf der Seite: " + da.join(", ") : "") + (deutsch.length ? "; deutscher Titel: " + deutsch.join(", ") : "") + (schluessel.length ? "; Schlüssel noch da: " + schluessel.join(", ") : ""));
}

// M10 (11.10.2026): Ergebnisseite – der Abschnitt „So schicken Sie die Datei an den Verein“ trägt die Texte der Sprache: Überschrift, die Schritte (mit der
// Beschriftung der Knöpfe aus dem Wörterbuch der Sprache), die Beschriftung der Knöpfe, den Hinweis zum Anhang. P3 Teil b: kein Satz unter der Überschrift, keine
// Überschriften der Wege; es steht nur der Weg, der zum Gerät passt (am Handy mit „Datei teilen“ der Weg am Handy, sonst der Weg am Computer).
// Die Adresse steht von links nach rechts (auch in Arabisch). Der mailto-Link bleibt in jeder Sprache deutsch: Betreff „Anmeldung Vorname Nachname“ und
// der deutsche Text, richtig kodiert (die Geschäftsstelle liest Deutsch).

// Liest die Wege des Abschnitts: Art, Überschrift (null, wenn es keine gibt) und die Schritte
const leseSendenWege = (page) =>
  page.evaluate(() => {
    const abschnitt = document.querySelector("#anmeldung [data-senden]");
    if (!abschnitt) return null;
    const text = (e) => (e ? e.textContent : null);
    return {
      titel: text(abschnitt.querySelector("h3")),
      einleitung: text(abschnitt.querySelector(":scope > p.anm-text")),
      ueberschriften: abschnitt.querySelectorAll("h4").length,
      wege: Array.from(abschnitt.querySelectorAll("[data-weg]")).map((w) => ({ art: w.getAttribute("data-weg"), titel: text(w.querySelector("h2, h3, h4")), schritte: Array.from(w.querySelectorAll("ol > li")).map((li) => li.textContent) })),
      handy: !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches),
    };
  });

// Prüft den einen Weg des Abschnitts: Art, keine Überschrift, drei Schritte in der Sprache; die Schritte nennen die Knöpfe mit ihrer Beschriftung aus dem Wörterbuch:
// am Handy Schritt 1 „Adresse kopieren“ und Schritt 2 „Datei teilen“ (U-01, 12.10.2026), am Computer Schritt 1 „Datei herunterladen“
function pruefeSendenWeg(d, dict, kennung, art, zusatz) {
  const F = dict.fertig;
  const S = F.senden;
  const o = ohneSteuer;
  const knoepfe = art === "handy" ? [S.kopieren, F.teilen, ""] : [F.herunterladen, "", ""];
  const w = d.wege[0];
  const soll = (i) => o(S[art + (i + 1)].replace("{knopf}", knoepfe[i]));
  ok(kennung + ": Abschnitt: nur der Weg " + (art === "handy" ? "am Handy" : "am Computer") + zusatz + ", ohne Überschrift, drei Schritte in der Sprache, mit der Beschriftung der Knöpfe „" + knoepfe.filter(Boolean).map(o).join("“, „") + "“",
    d.wege.length === 1 && w.art === art && w.titel === null && d.ueberschriften === 0 && S[art + "Titel"] === undefined && w.schritte.length === 3 &&
      o(w.schritte[0]) === soll(0) && o(w.schritte[1]) === soll(1) && o(w.schritte[2]) === soll(2),
    d.wege.map((x) => x.art + (x.titel ? " „" + x.titel + "“" : "")).join(", ") + ": " + w.schritte.map(o).join(" | "));
}

async function pruefeSenden(page, dict, kennung, server, beispielId) {
  const adresse = server.konfig.verein.mail;
  const beispiele = await import(pathToFileURL(path.join(ROOT, "assets", "js", "anmeldung", "beispiele.js")).href);
  const a = beispiele.beispielAntworten(beispielId, "2026-09-29", server.konfig);
  const w = await leseSendenWege(page);
  const d = await page.evaluate(() => {
    const abschnitt = document.querySelector("#anmeldung [data-senden]");
    if (!abschnitt) return null;
    const text = (e) => (e ? e.textContent : null);
    const adresseEl = abschnitt.querySelector("[data-mail-adresse]");
    const link = abschnitt.querySelector('a[data-aktion="mail-oeffnen"]');
    return {
      adresse: text(adresseEl),
      adresseDir: adresseEl && adresseEl.getAttribute("dir"),
      adressLabel: text(abschnitt.querySelector(".anm-senden__label")),
      kopieren: text(abschnitt.querySelector('button[data-aktion="adresse-kopieren"]')),
      linkText: text(link),
      href: link && link.getAttribute("href"),
      hinweise: Array.from(abschnitt.querySelectorAll("p.anm-hinweis")).map((p) => p.textContent),
    };
  });
  if (!ok(kennung + ": Fertig-Seite hat den Abschnitt „So schicken Sie die Datei an den Verein“", !!d && !!w, "")) return;
  const F = dict.fertig;
  const S = F.senden;
  const o = ohneSteuer;
  ok(kennung + ": Abschnitt: Überschrift in der Sprache, kein Satz darunter (P3 Teil b)", o(w.titel) === o(S.titel) && w.einleitung === null && S.einleitung === undefined, o(w.titel) + " | " + o(w.einleitung || ""));
  // Die Seiten des Tests tun, als könne der Browser Dateien teilen (navigator.share): Am Handy steht der Weg über das Teilen, am Computer der Weg über das Herunterladen.
  pruefeSendenWeg(w, dict, kennung, w.handy ? "handy" : "computer", " (der Browser kann Dateien teilen; Gerät " + (w.handy ? "mit" : "ohne") + " Touch-Bedienung)");
  ok(kennung + ": Abschnitt: Adresse der Geschäftsstelle aus der Konfiguration, von links nach rechts (dir=ltr), mit der Beschriftung der Sprache", d.adresse === adresse && d.adresseDir === "ltr" && o(d.adressLabel) === o(S.adresseTitel), d.adresse + " (" + d.adresseDir + ")");
  // U-01: Der Hinweis zum Anhang („Bei „…“ hängen Sie die Datei selbst an“) steht nur am Handy; am Computer steht „Datei anhängen“ schon im zweiten Schritt
  const anhangSoll = o(S.anhang.replace("{knopf}", S.oeffnen));
  const anhangDa = d.hinweise.map(o).includes(anhangSoll);
  ok(kennung + ": Abschnitt: Knöpfe „" + o(S.kopieren) + "“ und „" + o(S.oeffnen) + "“ in der Sprache; Hinweis zum Anhang " + (w.handy ? "steht (am Handy)" : "entfällt (am Computer)"), o(d.kopieren) === o(S.kopieren) && o(d.linkText) === o(S.oeffnen) && anhangDa === !!w.handy, o(d.kopieren) + " | " + o(d.linkText) + " | " + d.hinweise.map(o).join(" / "));
  // Der Link bleibt deutsch, in jeder Sprache
  const soll = "mailto:" + adresse + "?subject=" + encodeURIComponent("Anmeldung " + a.vorname + " " + a.nachname) + "&body=Guten%20Tag%2C%0D%0A%0D%0Aanbei%20die%20Anmeldung%20als%20PDF.%0D%0A%0D%0AViele%20Gr%C3%BC%C3%9Fe";
  ok(kennung + ": mailto-Link bleibt deutsch (Betreff „Anmeldung " + a.vorname + " " + a.nachname + "“, deutscher Text, kodiert), ohne Steuerzeichen für die Schreibrichtung", d.href === soll && !/%E2%81|%E2%80/.test(d.href), d.href);
}

// Der Browser kann keine Dateien teilen (kein „Datei teilen“): Nach dem Neuzeichnen der Fertig-Seite (zurück zur Prüfseite und wieder vor; die Datei bleibt) steht der
// Weg über das Herunterladen mit den Texten der Sprache da, auch am Handy. So bleibt der zweite Weg des Abschnitts in jeder Sprache geprüft.
async function pruefeSendenOhneTeilen(page, dict, kennung) {
  await page.evaluate(() => {
    Object.defineProperty(navigator, "canShare", { value: undefined, configurable: true });
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
  });
  await page.click('#anmeldung [data-aktion="zurueck"]');
  await page.waitForFunction(() => document.getElementById("anmeldung").dataset.schritt === "pruefen", { timeout: 8000 });
  await page.click('#anmeldung [data-aktion="weiter"]');
  await page.waitForFunction(() => document.getElementById("anmeldung").dataset.schritt === "fertig" && document.querySelector('#anmeldung [data-status="fertig"]'), { timeout: 30000 });
  const w = await leseSendenWege(page);
  if (!ok(kennung + ": Fertig-Seite ohne „Datei teilen“ hat den Abschnitt „So schicken Sie die Datei an den Verein“", !!w, "")) return;
  pruefeSendenWeg(w, dict, kennung, "computer", " (der Browser kann keine Dateien teilen)");
}

// ---------- Prüfungen je Seite ----------

// Sichtbarer Text des Assistenten ohne Steuerzeichen; Prüfung auf deutschen Rückfalltext.
async function seitenPruefung(page, muster) {
  return page.evaluate((m) => {
    const wurzel = document.getElementById("anmeldung");
    const ohne = (s) => s.replace(/[\u2060\u2066-\u2069\u200E\u200F\u202A-\u202E]/g, "").replace(/\s+/g, " ").trim();
    const seitenText = ohne(wurzel.innerText);
    const kurz = m.kurz.map((q) => new RegExp(q));
    const lang = m.lang.map((q) => new RegExp(q));
    const treffer = [];
    // 1. ganze Textstücke einzelner Elemente (Beschriftungen, Knöpfe, kurze Sätze)
    // Elemente, die ausdrücklich als Deutsch gekennzeichnet sind (zum Beispiel der Sprachname "Deutsch"), zählen nicht.
    // Achtung: closest("[lang='de']") fände auch <html lang="de">; darum nur bis zum Assistenten hinauf suchen.
    const alsDeutsch = (el) => {
      for (let x = el; x && x !== wurzel; x = x.parentElement) if (x.getAttribute && x.getAttribute("lang") === "de") return true;
      return false;
    };
    for (const el of wurzel.querySelectorAll("*")) {
      if (el.closest("bdi, option, script, style, .anm-vereinshinweis") || alsDeutsch(el) || el.getClientRects().length === 0) continue;
      const eigen = ohne(Array.from(el.childNodes).filter((n) => n.nodeType === 3).map((n) => n.nodeValue).join(" "));
      if (eigen.length < 6) continue;
      if (kurz.some((r) => r.test(eigen))) treffer.push("Textstück: " + eigen.slice(0, 80));
      else if (/^[a-z][A-Za-z0-9_]*(\.[A-Za-z0-9_]+)+$/.test(eigen)) treffer.push("Textschlüssel sichtbar: " + eigen);
    }
    // 2. lange deutsche Sätze irgendwo auf der Seite
    for (const r of lang) {
      const t = r.exec(seitenText);
      if (t) treffer.push("Satz: " + t[0].slice(0, 80));
    }
    const meldung = ohne((wurzel.querySelector(".anm-meldung") || { textContent: "" }).textContent);
    const westlich = /[\u0660-\u0669\u06F0-\u06F9]/.test(seitenText);
    return {
      treffer: Array.from(new Set(treffer)),
      meldung,
      westlich: !westlich,
      lang: wurzel.getAttribute("lang"),
      dir: wurzel.getAttribute("dir"),
      css: getComputedStyle(wurzel).direction,
      scrollOk: document.documentElement.scrollWidth <= window.innerWidth,
      scrollBreite: document.documentElement.scrollWidth,
    };
  }, muster);
}

async function foto(page, code, beispiel, schritt, zusatz) {
  fs.mkdirSync(AUSGABE, { recursive: true });
  const datei = path.join(AUSGABE, code + "-" + beispiel + "-" + schritt + (zusatz || "") + ".png");
  await page.screenshot({ path: datei, fullPage: true });
  return datei;
}

// Ausschnitt: Satzung-Block bis zum ersten Unterschriftsfeld (mit "Gilt für"-Liste).
async function fotoSatzung(page, code, beispiel) {
  const clip = await page.evaluate(() => {
    const b = document.querySelector("#anmeldung .anm-satzung");
    if (!b) return null;
    const u = document.querySelector("#anmeldung .anm-unterschrift") || b;
    const rb = b.getBoundingClientRect();
    const ru = u.getBoundingClientRect();
    return { x: 0, y: Math.max(0, rb.top + window.scrollY - 12), width: window.innerWidth, height: ru.bottom - rb.top + 24 };
  });
  if (!clip) return null;
  fs.mkdirSync(AUSGABE, { recursive: true });
  const datei = path.join(AUSGABE, code + "-" + beispiel + "-unterschriften-satzung.png");
  await page.screenshot({ path: datei, clip, captureBeyondViewport: true });
  return datei;
}

async function waehleSpracheAufStart(page, code) {
  await page.click('[data-anm-sprachleiste] button[data-sprache="' + code + '"]');
  await page.waitForFunction((c) => document.getElementById("anmeldung").getAttribute("lang") === c, { timeout: 8000 }, code);
  await warte(150);
}

async function ladeBeispiel(page, id) {
  await page.$eval("[data-anm-werkzeuge]", (d) => (d.open = true));
  await page.click('[data-beispiel="' + id + '"]');
  await page.waitForFunction(() => /Beispiel geladen/.test((document.querySelector(".anm-meldung") || {}).textContent || ""), { timeout: 5000 }).catch(() => {});
  await page.$eval("[data-anm-werkzeuge]", (d) => (d.open = false));
}

// ---------- Durchlauf ----------

async function durchlauf(browser, server, sprache, beispiel, muster, txt) {
  const code = sprache.code;
  const kennung = NAMEN[code] + ", " + beispiel.titel;
  const page = await neueSeite(browser, server, code + "-" + beispiel.id);
  const dict = await ladeDe(code + "-oberflaeche.js");
  const problem = { deutsch: [], meldung: [], querscroll: [], ziffern: [], sprache: [], hang: null };
  await waehleSpracheAufStart(page, code);
  await ladeBeispiel(page, beispiel.id);
  const besucht = [];
  let ende = "haengt";
  let gefotografiert = new Set();
  for (let i = 0; i < 160; i++) {
    const s = await stand(page);
    const kenn = s.schritt + "/" + s.teil;
    besucht.push(kenn);
    const p = await seitenPruefung(page, muster);
    if (process.env.ANM_DEBUG) info(kenn + " – Treffer: " + JSON.stringify(p.treffer) + " Titel: " + (await page.$eval("#anm-titel", (e) => e.textContent)));
    if (p.treffer.length) problem.deutsch.push(kenn + ": " + p.treffer.slice(0, 2).join(" | "));
    if (p.meldung && (p.meldung === txt.teilweise || p.meldung === txt.fehlt || /noch nicht übersetzt|noch nicht da/.test(p.meldung) || /^Diese Sprache/.test(p.meldung))) problem.meldung.push(kenn + ": " + p.meldung);
    if (!p.scrollOk) problem.querscroll.push(kenn + " (" + p.scrollBreite + " > " + MOBIL.breite + ")");
    if (!p.westlich) problem.ziffern.push(kenn);
    if (p.lang !== code || p.dir !== (sprache.rtl ? "rtl" : "ltr") || p.css !== (sprache.rtl ? "rtl" : "ltr")) problem.sprache.push(kenn + ": lang=" + p.lang + " dir=" + p.dir + " css=" + p.css);
    if (FOTO_SCHRITTE.includes(s.schritt) && !gefotografiert.has(s.schritt) && s.schritt !== "fertig") {
      gefotografiert.add(s.schritt);
      await foto(page, code, beispiel.id, s.schritt);
    }
    if (s.schritt === "fertig") {
      ende = "fertig";
      break;
    }
    if (s.schritt === "unterschriften") {
      if (!gefotografiert.has("satzung")) {
        gefotografiert.add("satzung");
        await pruefeUnterschriftenSeite(page, code, sprache, dict, kennung, beispiel.id);
        await fotoSatzung(page, code, beispiel.id);
      }
      await unterschreiben(page);
    }
    // Heimweg nach dem Training (M1): die Pflichtfrage trägt den übersetzten Titel; fehlt die Übersetzung noch, ist es nur ein Hinweis
    if (s.schritt === "heimweg") {
      const uebersetzt = dict.heimweg && dict.heimweg.titel;
      const titel = ohneSteuer(await page.$eval("#anm-titel", (e) => e.textContent));
      if (uebersetzt) ok(kennung + ": Heimweg-Frage mit übersetztem Titel", titel === ohneSteuer(uebersetzt), titel);
      else info(kennung + ": Heimweg-Frage noch ohne Übersetzung (deutscher Rückfall, Paket M3): " + titel);
      await foto(page, code, beispiel.id, "heimweg");
    }
    // Spielrecht (M14, 12.10.2026): Der Verein beantragt es immer; die Seite „spielerpass“ trägt die übersetzte Erklärung (drei Absätze) statt der früheren Frage zu den Spielen
    if (s.schritt === "spielerpass") {
      const vorlage = dict.spielerpass && dict.spielerpass.spielrecht;
      const absaetze = (await page.$$eval("#anmeldung p.anm-hinweis", (l) => l.map((x) => x.textContent))).map(ohneSteuer);
      const soll = String(vorlage || "").split("\n").map(ohneSteuer).filter(Boolean); // erst an den Zeilenumbrüchen trennen (ohneSteuer macht aus jedem Umbruch ein Leerzeichen)
      ok(kennung + ": Spielerpass-Seite mit der übersetzten Erklärung zum Spielrecht (3 Absätze, Schlüssel spielerpass.spielrecht), ohne den Block der früheren Frage", !!vorlage && soll.length === 3 && soll.every((t) => absaetze.includes(t)) && dict.spielen === undefined, absaetze.join(" | "));
    }
    // Fahrten und Nachrichten (M11, 12.10.2026): Karneval ohne Fußball sagt „Messenger-Gruppe der Gruppe“, die übrigen „… der Mannschaft“; beide Sätze stehen in der Sprache
    if (s.schritt === "einwilligungen" && s.teil === "fahrten") {
      const schluessel = beispiel.id === "karneval-kind" ? "messengerKarneval" : "messenger";
      const vorlage = dict.einwilligungen && dict.einwilligungen.fahrten && dict.einwilligungen.fahrten[schluessel];
      const messenger = ohneSteuer(await page.evaluate(() => {
        const i = document.querySelector('#anmeldung input[data-pfad="einwilligungen.messenger"]');
        const l = i ? document.querySelector('label[for="' + i.id + '"] .anm-karte__titel') : null;
        return l ? l.textContent : "";
      }));
      const teile = ohneSteuer(vorlage || "").split("{name}").map((t) => t.trim());
      ok(kennung + ": Messenger-Satz in der Sprache (" + (beispiel.id === "karneval-kind" ? "Karneval: Gruppe" : "Fußball: Mannschaft") + ", Schlüssel " + schluessel + ")", !!vorlage && teile.length === 2 && messenger.length > 0 && messenger.includes(teile[1]) && (!teile[0] || messenger.includes(teile[0])), messenger);
    }
    const r = await klickeWeiter(page, s);
    if (r.fehler.length) {
      problem.hang = kenn + ": Fehlermeldung " + r.fehler.join(" | ");
      await foto(page, code, beispiel.id, "FEHLER-" + s.schritt);
      ende = "fehler";
      break;
    }
    if (!r.gewechselt) {
      problem.hang = kenn + ": Seite blieb gleich";
      ende = "haengt";
      break;
    }
  }
  let datei = null;
  if (ende === "fertig") {
    try {
      await page.waitForFunction(() => document.querySelector('#anmeldung [data-status="fertig"], #anmeldung [data-status="fehler"]'), { timeout: 30000 });
      const status = await page.$eval("#anmeldung [data-status]", (e) => e.getAttribute("data-status"));
      datei = status === "fertig" ? await page.$eval("#anmeldung [data-datei]", (e) => e.textContent.trim()) : "FEHLER-SEITE";
      await warte(300);
      await pruefeKeineTeilListe(page, dict, kennung);
      await pruefeSenden(page, dict, kennung, server, beispiel.id);
      const p = await seitenPruefung(page, muster);
      if (p.treffer.length) problem.deutsch.push("fertig/ergebnis: " + p.treffer.slice(0, 2).join(" | "));
      if (!p.scrollOk) problem.querscroll.push("fertig/ergebnis (" + p.scrollBreite + ")");
      await foto(page, code, beispiel.id, "fertig");
      // Zuletzt: ohne „Datei teilen“ (die Seite wird neu gezeichnet) steht der andere Weg da
      await pruefeSendenOhneTeilen(page, dict, kennung);
    } catch (e) {
      datei = null;
    }
  }
  ok(kennung + ": bis 'fertig' durchgeklickt (" + besucht.length + " Seiten), Datei erstellt", ende === "fertig" && !!datei && datei !== "FEHLER-SEITE", (problem.hang || "") + (datei ? " Datei: " + datei : ""));
  ok(kennung + ": lang=\"" + code + "\" und dir=\"" + (sprache.rtl ? "rtl" : "ltr") + "\" auf jeder Seite", problem.sprache.length === 0, problem.sprache.slice(0, 2).join("; "));
  ok(kennung + ": keine Meldung \"Ein Teil ist noch nicht übersetzt\" / \"Sprache noch nicht da\"", problem.meldung.length === 0, problem.meldung.slice(0, 2).join("; "));
  ok(kennung + ": kein deutscher Rückfalltext und kein sichtbarer Textschlüssel", problem.deutsch.length === 0, problem.deutsch.slice(0, 3).join(" || "));
  ok(kennung + ": kein Querscrollen bei " + MOBIL.breite + " px", problem.querscroll.length === 0, problem.querscroll.slice(0, 3).join("; "));
  ok(kennung + ": nur westliche Ziffern 0-9", problem.ziffern.length === 0, problem.ziffern.slice(0, 3).join("; "));
  ok(kennung + ": keine Konsolenwarnung \"Text fehlt\"", page.__st.warnungen.length === 0, page.__st.warnungen.slice(0, 2).join(" | "));
  ok(kennung + ": keine Fehler in der Konsole, keine fehlgeschlagenen Anfragen", page.__st.konsole.length === 0 && page.__st.antworten.length === 0, page.__st.konsole.concat(page.__st.antworten).slice(0, 3).join(" | "));
  const fremde = Array.from(page.__st.hosts).filter((h) => !/^127\.0\.0\.1:\d+$/.test(h));
  ok(kennung + ": keine Anfrage an fremde Hosts", fremde.length === 0, fremde.join(", "));
  const alle = besucht.map((b) => b.split("/")[0]);
  info("Seiten: " + Array.from(new Set(alle)).join(" › "));
  await page.close();
  return { besucht, ende, datei };
}

// Fehlermeldung, Hilfe-Dialog und Sprachwechsel mitten im Ablauf.
async function einzelpruefungen(browser, server, sprache, muster, txt) {
  const code = sprache.code;
  const kennung = NAMEN[code];
  const page = await neueSeite(browser, server, code + "-einzeln");
  await waehleSpracheAufStart(page, code);
  // Start › wer › name (leer weiter: Fehlermeldung)
  await klickeWeiter(page, await stand(page));
  let s = await stand(page);
  ok(kennung + ": Start › Weiter führt zu 'wer'", s.schritt === "wer", s.schritt);
  const kartenId = await page.$eval('#anmeldung input[data-pfad="wer"][data-wert="kind"]', (e) => e.id);
  await page.click('#anmeldung label[for="' + kartenId + '"]');
  await klickeWeiter(page, s);
  s = await stand(page);
  ok(kennung + ": 'wer' › Weiter führt zu 'name'", s.schritt === "name", s.schritt);
  // leer weiter: zwei Fehlermeldungen
  const r = await klickeWeiter(page, s);
  const box = await page.evaluate(() => {
    const b = document.querySelector("#anmeldung .anm-fehlerbox");
    return b && !b.hidden ? { titel: (b.querySelector(".anm-fehlerbox__titel") || {}).textContent, punkte: Array.from(b.querySelectorAll("li")).map((l) => l.textContent.trim()) } : null;
  });
  ok(kennung + ": leeres Namensfeld zeigt übersetzte Fehlermeldungen", !!box && box.punkte.length === 2 && r.fehler.length === 2, box ? box.titel + " | " + box.punkte.join(" | ") : "keine Fehlerbox");
  let p = await seitenPruefung(page, muster);
  ok(kennung + ": Fehlerseite ohne deutschen Text", p.treffer.length === 0, p.treffer.slice(0, 2).join(" | "));
  await foto(page, code, "einzeln", "fehlermeldung");
  // Hilfe
  await page.click('#anmeldung [data-aktion="hilfe"]');
  await page.waitForSelector("dialog.anm-dialog--hilfe[open]", { timeout: 3000 });
  const hilfe = await page.evaluate(() => {
    const d = document.querySelector("dialog.anm-dialog--hilfe");
    return { text: d.innerText, links: Array.from(d.querySelectorAll("a")).map((a) => a.getAttribute("href")) };
  });
  const hilfeMuster = await seitenPruefungText(page, hilfe.text, muster);
  ok(kennung + ": Hilfe-Dialog übersetzt, mit Telefon- und Mail-Knöpfen", hilfeMuster.length === 0 && hilfe.links.some((l) => /^tel:/.test(l)) && hilfe.links.filter((l) => /^mailto:/.test(l)).length === 3, hilfeMuster.slice(0, 2).join(" | ") + " " + hilfe.text.replace(/\s+/g, " ").slice(0, 100));
  await foto(page, code, "einzeln", "hilfe");
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => !document.querySelector("dialog.anm-dialog--hilfe[open]"), { timeout: 3000 });
  // Sprachwechsel mitten im Ablauf: Auswahl oben; Vorname bleibt erhalten
  await page.type('#anmeldung input[data-pfad="vorname"]', "Mila");
  const anderes = SPRACHEN.find((c) => c !== code);
  await page.select("#anm-sprache", anderes);
  await page.waitForFunction((c) => document.getElementById("anmeldung").getAttribute("lang") === c, { timeout: 8000 }, anderes);
  const nachWechsel = await page.evaluate(() => ({ schritt: document.getElementById("anmeldung").dataset.schritt, vorname: (document.querySelector('#anmeldung input[data-pfad="vorname"]') || {}).value }));
  ok(kennung + ": Sprachwechsel mitten im Ablauf (" + anderes + ") behält Seite und Antworten", nachWechsel.schritt === "name" && nachWechsel.vorname === "Mila", JSON.stringify(nachWechsel));
  await page.select("#anm-sprache", code);
  await page.waitForFunction((c) => document.getElementById("anmeldung").getAttribute("lang") === c, { timeout: 8000 }, code);
  p = await seitenPruefung(page, muster);
  ok(kennung + ": Rückwechsel in die Sprache ohne deutschen Text und ohne Rückfall-Meldung", p.treffer.length === 0 && !/noch nicht/.test(p.meldung), p.treffer.slice(0, 2).join(" | ") + p.meldung);
  if (sprache.rtl) {
    const layout = await page.evaluate(() => {
      const w = document.getElementById("anmeldung");
      const zur = w.querySelector('[data-aktion="zurueck"]').getBoundingClientRect();
      const hilfeK = w.querySelector('[data-aktion="hilfe"]').getBoundingClientRect();
      return { zurueckRechts: zur.left > window.innerWidth / 2, hilfeLinks: hilfeK.left < window.innerWidth / 2, scroll: document.documentElement.scrollWidth <= window.innerWidth };
    });
    ok(kennung + ": Zurück-Knopf steht rechts, Hilfe links (Spiegelung), kein Querscrollen", layout.zurueckRechts && layout.hilfeLinks && layout.scroll, JSON.stringify(layout));
  }
  ok(kennung + " (Einzelprüfungen): keine Fehler in der Konsole, keine Warnung \"Text fehlt\"", page.__st.konsole.length === 0 && page.__st.warnungen.length === 0, page.__st.konsole.concat(page.__st.warnungen).slice(0, 3).join(" | "));
  void txt;
  await page.close();
}

// ---------- P1: Code-Seite und Übergabe in jeder Sprache ----------

const AXE = fs.readFileSync(path.join(ROOT, "node_modules", "axe-core", "axe.min.js"), "utf8");

async function axeSchwer(page) {
  if (await page.evaluate(() => typeof window.axe === "undefined")) await page.evaluate(AXE);
  const verstoesse = await page.evaluate(async () => {
    const r = await window.axe.run(document, { resultTypes: ["violations"] });
    return r.violations.map((v) => ({ id: v.id, impact: v.impact, ziele: v.nodes.slice(0, 2).map((n) => n.target.join(" ")) }));
  });
  return verstoesse.filter((v) => v.impact === "critical" || v.impact === "serious");
}

// code: "de", "en", "tr" oder "ar". muster: deutsche Muster (nur für die übersetzten Sprachen).
async function einzelZugang(browser, server, code, rtl, muster) {
  const kennung = (NAMEN[code] || "Deutsch") + " (Code-Seite)";
  const dict = await ladeDe(code + "-oberflaeche.js");
  const T = dict.code;
  const norm = server.testCode.replace(/-/g, "");
  const wahl = async (page) => {
    if (code !== "de") await waehleSpracheAufStart(page, code);
  };
  server.setzeZugang([server.testPruefwert]);
  try {
    const page = await neueSeite(browser, server, code + "-code");
    await wahl(page);
    const d = await page.evaluate(() => {
      const w = document.getElementById("anmeldung");
      const ohne = (s) => s.replace(/[\u2060\u2066-\u2069\u200E\u200F\u202A-\u202E]/g, "").replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim();
      const eingabe = w.querySelector('[data-pfad="zugang.code"]');
      const label = w.querySelector('[data-feld="code"] label');
      const hilfeK = w.querySelector('[data-aktion="hilfe"]').getBoundingClientRect();
      const rl = label.getBoundingClientRect();
      return {
        schritt: w.dataset.schritt,
        lang: w.getAttribute("lang"),
        dir: w.getAttribute("dir"),
        css: getComputedStyle(w).direction,
        titel: ohne(w.querySelector(".anm-titel").textContent),
        absaetze: Array.from(w.querySelectorAll(".anm-absaetze p")).map((p) => ohne(p.textContent)),
        label: ohne(label.textContent),
        weiter: ohne(w.querySelector('[data-aktion="weiter"]').textContent),
        links: Array.from(w.querySelectorAll(".anm-code-hilfen p")).map((p) => ({ text: ohne(p.textContent), link: ohne(p.querySelector("a").textContent), aktion: p.querySelector("a").getAttribute("data-aktion") })),
        eingabeDir: eingabe.getAttribute("dir"),
        eingabeLang: eingabe.getAttribute("lang"),
        labelRechts: rl.right > window.innerWidth / 2,
        hilfeLinks: hilfeK.left < window.innerWidth / 2,
        scroll: document.documentElement.scrollWidth <= window.innerWidth,
        uebersetzungsHinweis: !!w.querySelector(".anm-meldung") && ohne((document.querySelector(".anm-uebersetzung") || { textContent: "" }).textContent),
      };
    });
    ok(kennung + ": erster Bildschirm ist die Code-Seite, Sprache " + code + (rtl ? " von rechts nach links" : ""), d.schritt === "code" && d.lang === code && d.dir === (rtl ? "rtl" : "ltr") && d.css === (rtl ? "rtl" : "ltr"), JSON.stringify({ schritt: d.schritt, lang: d.lang, dir: d.dir, css: d.css }));
    const einleitung = T.einleitung.split("\n").map(ohneSteuer);
    ok(kennung + ": Titel, zwei Sätze und Beschriftung stehen in der Sprache (aus dem Wörterbuch)", d.titel === ohneSteuer(T.titel) && JSON.stringify(d.absaetze) === JSON.stringify(einleitung) && d.label === ohneSteuer(T.label) && d.weiter === ohneSteuer(dict.nav.weiter), JSON.stringify([d.titel, d.absaetze, d.label, d.weiter]));
    const sollKein = ohneSteuer(T.kein.replace("{link}", T.keinLink));
    const sollPassiv = ohneSteuer(T.passiv.replace("{link}", T.passivLink));
    ok(kennung + ": die zwei Zeilen darunter (Probetraining vereinbaren, Code von der Geschäftsstelle) stehen in der Sprache, der Link trägt den Text aus dem Wörterbuch", d.links.length === 2 && d.links[0].text === sollKein && d.links[0].link === ohneSteuer(T.keinLink) && d.links[0].aktion === "probetraining" && d.links[1].text === sollPassiv && d.links[1].link === ohneSteuer(T.passivLink) && d.links[1].aktion === "code-anfragen", JSON.stringify(d.links));
    ok(kennung + ": das Feld bleibt von links nach rechts (dir=ltr, lang=en), kein Querscrollen" + (rtl ? "; Beschriftung rechts, Hilfe links (Spiegelung)" : ""), d.eingabeDir === "ltr" && d.eingabeLang === "en" && d.scroll && (!rtl || (d.labelRechts && d.hilfeLinks)), JSON.stringify({ dir: d.eingabeDir, scroll: d.scroll, labelRechts: d.labelRechts, hilfeLinks: d.hilfeLinks }));
    ok(kennung + ": " + (code === "de" ? "kein Hinweis „Übersetzungshilfe“ auf Deutsch" : "Hinweis „Übersetzungshilfe“ in der Sprache"), code === "de" ? !d.uebersetzungsHinweis : d.uebersetzungsHinweis === ohneSteuer(dict.sprache.uebersetzungshilfe), String(d.uebersetzungsHinweis));
    if (muster) {
      const p = await seitenPruefung(page, muster);
      ok(kennung + ": kein deutscher Rückfalltext, kein sichtbarer Textschlüssel, westliche Ziffern", p.treffer.length === 0 && p.westlich, p.treffer.slice(0, 3).join(" | "));
    }
    fs.mkdirSync(AUSGABE, { recursive: true });
    await page.screenshot({ path: path.join(AUSGABE, "code-390-" + code + ".png"), fullPage: false });
    const schwer = await axeSchwer(page);
    ok(kennung + ": axe-core ohne Verstöße critical/serious", schwer.length === 0, schwer.map((v) => v.impact + " " + v.id + " " + v.ziele.join(" | ")).join("; "));
    // leer: Meldung in der Sprache
    await page.click('#anmeldung [data-aktion="weiter"]');
    await warte(300);
    const leer = await page.evaluate(() => {
      const w = document.getElementById("anmeldung");
      const ohne = (s) => s.replace(/[\u2060\u2066-\u2069\u200E\u200F\u202A-\u202E]/g, "").replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim();
      const f = w.querySelector('[data-feld="code"] .anm-fehler');
      const box = w.querySelector(".anm-fehlerbox");
      return { feld: f && !f.hidden ? ohne(f.textContent) : "", titel: box && !box.hidden ? ohne(box.querySelector(".anm-fehlerbox__titel").textContent) : "", liste: box && !box.hidden ? Array.from(box.querySelectorAll("li")).map((li) => ohne(li.textContent)) : [], schritt: w.dataset.schritt };
    });
    ok(kennung + ": leerer Code: Meldung am Feld und in der Fehlerliste in der Sprache, kein Weiter", leer.schritt === "code" && leer.feld === ohneSteuer(T.fehlerLeer) && leer.titel === ohneSteuer(dict.fehler.titelEins) && leer.liste.length === 1 && leer.liste[0] === ohneSteuer(T.label + ": " + T.fehlerLeer), JSON.stringify(leer));
    // falsch
    await page.type('[data-pfad="zugang.code"]', "FALSCH-" + norm.slice(-4));
    await page.click('#anmeldung [data-aktion="weiter"]');
    await warte(300);
    const falsch = await page.evaluate(() => {
      const f = document.querySelector('#anmeldung [data-feld="code"] .anm-fehler');
      return f && !f.hidden ? f.textContent.replace(/[\u2060\u2066-\u2069\u200E\u200F\u202A-\u202E]/g, "").replace(/\s+/g, " ").trim() : "";
    });
    ok(kennung + ": falscher Code: Meldung am Feld in der Sprache", falsch === ohneSteuer(T.fehlerFalsch), falsch);
    await page.screenshot({ path: path.join(AUSGABE, "code-fehler-390-" + code + ".png"), fullPage: false });
    if (muster) {
      const p = await seitenPruefung(page, muster);
      ok(kennung + ": Seite mit Fehlermeldung ohne deutschen Text", p.treffer.length === 0, p.treffer.slice(0, 3).join(" | "));
    }
    // Hilfe-Dialog auf der Code-Seite
    await page.click('#anmeldung [data-aktion="hilfe"]');
    await page.waitForSelector("dialog.anm-dialog--hilfe[open]", { timeout: 3000 });
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector("dialog.anm-dialog--hilfe[open]"), { timeout: 3000 });
    // richtig
    await page.$eval('[data-pfad="zugang.code"]', (e) => { e.focus(); e.select(); });
    await page.keyboard.press("Backspace");
    await page.keyboard.type(server.testCode.toLowerCase());
    await page.click('#anmeldung [data-aktion="weiter"]');
    await page.waitForFunction(() => document.getElementById("anmeldung").dataset.schritt === "start", { timeout: 8000 }).catch(() => {});
    const start = await page.evaluate(() => ({ schritt: document.getElementById("anmeldung").dataset.schritt, titel: document.querySelector(".anm-titel").textContent.replace(/[\u2060\u2066-\u2069\u200E\u200F\u202A-\u202E]/g, "").trim(), lang: document.getElementById("anmeldung").getAttribute("lang"), suche: location.search }));
    ok(kennung + ": richtiger Code (klein getippt): Startschritt in der Sprache, Adresse trägt code=", start.schritt === "start" && start.titel === ohneSteuer(dict.start.titel) && start.lang === code && start.suche === "?code=" + norm, JSON.stringify(start));
    ok(kennung + ": keine Fehler in der Konsole, keine Warnung „Text fehlt“", page.__st.konsole.length === 0 && page.__st.warnungen.length === 0, page.__st.konsole.concat(page.__st.warnungen).slice(0, 3).join(" | "));
    await page.close();

    // Übergabe
    server.setzeZugang([]);
    const app = await neueSeite(browser, server, code + "-uebergabe", "?app=1");
    await wahl(app);
    const u = await app.evaluate(() => {
      const w = document.getElementById("anmeldung");
      const ohne = (s) => s.replace(/[\u2060\u2066-\u2069\u200E\u200F\u202A-\u202E]/g, "").replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim();
      const a = w.querySelector('a[data-aktion="im-browser-oeffnen"]');
      return { schritt: w.dataset.schritt, lang: w.getAttribute("lang"), dir: w.getAttribute("dir"), titel: ohne(w.querySelector(".anm-titel").textContent), knopf: a ? ohne(a.textContent) : null, href: a ? a.getAttribute("href") : null, felder: w.querySelectorAll("input:not([type=hidden]), select, textarea").length, scroll: document.documentElement.scrollWidth <= window.innerWidth };
    });
    ok(kennung.replace("Code-Seite", "Übergabe") + ": ?app=1 zeigt nur die Übergabe: Titel und Knopf in der Sprache, Link ext://http… ohne app=1", u.schritt === "uebergabe" && u.lang === code && u.dir === (rtl ? "rtl" : "ltr") && u.titel === ohneSteuer(dict.app.uebergabe) && u.knopf === ohneSteuer(dict.app.browser) && /^ext:\/\/http/.test(u.href) && !/app=1/.test(u.href) && u.scroll, JSON.stringify(u));
    if (muster) {
      const p = await seitenPruefung(app, muster);
      ok(kennung.replace("Code-Seite", "Übergabe") + ": kein deutscher Rückfalltext", p.treffer.length === 0, p.treffer.slice(0, 3).join(" | "));
    }
    await app.screenshot({ path: path.join(AUSGABE, "app-uebergabe-390-" + code + ".png"), fullPage: false });
    const schwerU = await axeSchwer(app);
    ok(kennung.replace("Code-Seite", "Übergabe") + ": axe-core ohne Verstöße critical/serious", schwerU.length === 0, schwerU.map((v) => v.impact + " " + v.id + " " + v.ziele.join(" | ")).join("; "));
    ok(kennung.replace("Code-Seite", "Übergabe") + ": keine Fehler in der Konsole", app.__st.konsole.length === 0 && app.__st.warnungen.length === 0, app.__st.konsole.slice(0, 3).join(" | "));
    await app.close();
  } finally {
    server.setzeZugang([]);
  }
}

// Alle sechs Meldungen zu "lateinische Buchstaben" im Browser: In ein Feld wird Text in anderer Schrift getippt,
// die Seite bleibt stehen und nennt die Meldung der Sprache. Danach steht der alte Wert wieder im Feld.
const LATEIN_FAELLE = [
  { feld: "vorname", schluessel: "lateinisch", text: "Ахмед" },
  { feld: "geburtsort", schluessel: "lateinischOrt", text: "Москва" },
  { feld: "alterVerein.name", schluessel: "lateinischVerein", text: "Спартак" },
  { feld: "anschrift.strasse", schluessel: "lateinischAnschrift", text: "Улица 5" },
  { feld: "mobil", schluessel: "lateinischNummer", text: "٠١٧٦ ٤٠٦٩٠٤٢" },
  { feld: "notfall.beziehung", schluessel: "lateinischText", text: "Бабушка" },
];

// Ersetzt den Inhalt eines Feldes durch Tippen (Fokus, alles auswählen, tippen). Ein Dreifachklick wählt auf dem
// emulierten Handy nichts aus.
async function ersetzeWert(page, eingabe, text) {
  await eingabe.evaluate((e) => {
    e.scrollIntoView({ block: "center" });
    e.focus();
    e.select();
  });
  await page.keyboard.type(text);
}

async function einzelLateinisch(browser, server, sprache, dict) {
  const code = sprache.code;
  const kennung = NAMEN[code] + ", nicht lateinische Buchstaben";
  const page = await neueSeite(browser, server, code + "-lateinisch");
  await waehleSpracheAufStart(page, code);
  await ladeBeispiel(page, "wechsel-hessen");
  const erledigt = new Set();
  let hinweisBeimTippen = null;
  for (let i = 0; i < 90 && erledigt.size < LATEIN_FAELLE.length; i++) {
    const s = await stand(page);
    if (s.schritt === "fertig") break;
    for (const f of LATEIN_FAELLE) {
      if (erledigt.has(f.feld)) continue;
      const eingabe = await page.$('#anmeldung input[data-pfad="' + f.feld + '"]');
      if (!eingabe) continue;
      erledigt.add(f.feld);
      const alt = await eingabe.evaluate((e) => e.value);
      await ersetzeWert(page, eingabe, f.text);
      if (f.feld === "vorname") {
        hinweisBeimTippen = await page.evaluate(() => {
          const w = document.querySelector("#anmeldung p.anm-hinweis--achtung[role=status]");
          return w && w.getClientRects().length ? w.textContent : null;
        });
      }
      const r = await klickeWeiter(page, s);
      const erwartet = ohneSteuer(dict.fehler[f.schluessel]);
      const gefunden = r.fehler.map(ohneSteuer);
      // Die Liste nennt vor der Meldung den Namen des Feldes ("Vorname: Meldung").
      ok(kennung + ": Meldung fehler." + f.schluessel + " am Feld '" + f.feld + "' in der Sprache", !r.gewechselt && gefunden.some((g) => g.endsWith(erwartet)), gefunden.join(" | ") || "keine Meldung");
      if (f.feld === "vorname") await foto(page, code, "einzeln", "lateinische-buchstaben");
      await ersetzeWert(page, await page.$('#anmeldung input[data-pfad="' + f.feld + '"]'), alt);
    }
    const r = await klickeWeiter(page, await stand(page));
    if (!r.gewechselt) {
      if (process.env.ANM_DEBUG || erledigt.size < LATEIN_FAELLE.length) info("Seite " + s.schritt + "/" + s.teil + " blieb stehen: " + r.fehler.join(" | "));
      break;
    }
  }
  ok(kennung + ": alle sechs Meldungen (Name, Ort, Verein, Anschrift, Nummer, Text) geprüft", erledigt.size === LATEIN_FAELLE.length, Array.from(erledigt).join(", "));
  ok(kennung + ": Hinweis schon beim Tippen des Namens in der Sprache", hinweisBeimTippen !== null && ohneSteuer(hinweisBeimTippen) === ohneSteuer(dict.fehler.lateinisch), hinweisBeimTippen || "kein Hinweis");
  ok(kennung + ": keine Fehler in der Konsole, keine Warnung \"Text fehlt\"", page.__st.konsole.length === 0 && page.__st.warnungen.length === 0, page.__st.konsole.concat(page.__st.warnungen).slice(0, 3).join(" | "));
  await page.close();
}

// Getrennt lebende Eltern ohne Zustimmung: der Kasten mit dem Stift-Hinweis auf "sorge" und später auf "unterschriften".
async function einzelSorge(browser, server, sprache, muster, dict) {
  const code = sprache.code;
  const kennung = NAMEN[code] + ", getrennt lebende Eltern";
  const page = await neueSeite(browser, server, code + "-sorge");
  await waehleSpracheAufStart(page, code);
  await ladeBeispiel(page, "kind-neu");
  let s = await stand(page);
  for (let i = 0; i < 60 && !(s.schritt === "sorge" && s.teil === "recht"); i++) {
    const r = await klickeWeiter(page, s);
    if (!r.gewechselt) break;
    s = await stand(page);
  }
  ok(kennung + ": Seite 'sorge' erreicht", s.schritt === "sorge" && s.teil === "recht", s.schritt + "/" + s.teil);
  const kastenText = () =>
    page.evaluate(() => {
      const b = document.querySelector("#anmeldung [data-zweiter-elternteil]");
      return b && b.getClientRects().length ? b.innerText : null;
    });
  // Modus „bildschirm“ (M9): Kasten „Das geht am Bildschirm. Oder mit Stift im Ausdruck.“; Modus „stift“: „Das geht nur mit Stift.“
  const zeilen = String(serverModus() === "stift" ? dict.sorge.zweiterMitStift : dict.sorge.zweiterAmBildschirm).split("\n").map(ohneSteuer);
  ok(kennung + ": bei 'beide Eltern' steht der Kasten nicht da", (await kastenText()) === null);
  const getrennt = await page.$eval('#anmeldung input[data-pfad="sorge"][data-wert="getrennt_bei_mir"]', (e) => e.id);
  await page.click('#anmeldung label[for="' + getrennt + '"]');
  await warte(200);
  const t1 = await kastenText();
  ok(kennung + ": Kasten zum anderen Elternteil (" + (serverModus() === "stift" ? "nur mit Stift" : "am Bildschirm oder mit Stift im Ausdruck") + ") erscheint, in der Sprache", t1 !== null && zeilen.every((z) => ohneSteuer(t1).includes(z)), t1 ? ohneSteuer(t1).slice(0, 160) : "kein Kasten");
  const p1 = await seitenPruefung(page, muster);
  ok(kennung + ": Seite 'sorge' ohne deutschen Text und ohne Textschlüssel", p1.treffer.length === 0, p1.treffer.slice(0, 2).join(" | "));
  await foto(page, code, "einzeln", "getrennte-eltern");
  // Mit Zustimmung des anderen Elternteils verschwindet der Kasten.
  const zust = await page.$('#anmeldung input[data-pfad="andererElternteilEinverstanden"]');
  if (zust) {
    await page.click('#anmeldung label[for="' + (await zust.evaluate((e) => e.id)) + '"]');
    await warte(200);
    ok(kennung + ": mit Zustimmung des anderen Elternteils verschwindet der Kasten", (await kastenText()) === null);
    await page.click('#anmeldung label[for="' + (await zust.evaluate((e) => e.id)) + '"]');
    await warte(200);
  }
  // Weiter bis zur Unterschriftenseite: dort steht derselbe Kasten noch einmal.
  s = await stand(page);
  for (let i = 0; i < 60 && s.schritt !== "unterschriften"; i++) {
    const r = await klickeWeiter(page, s);
    if (!r.gewechselt) break;
    s = await stand(page);
  }
  const t2 = s.schritt === "unterschriften" ? await kastenText() : null;
  ok(kennung + ": derselbe Kasten steht auf der Unterschriftenseite", t2 !== null && zeilen.every((z) => ohneSteuer(t2).includes(z)), s.schritt + (t2 ? " | " + ohneSteuer(t2).slice(0, 100) : ""));
  ok(kennung + ": keine Fehler in der Konsole, keine Warnung \"Text fehlt\"", page.__st.konsole.length === 0 && page.__st.warnungen.length === 0, page.__st.konsole.concat(page.__st.warnungen).slice(0, 3).join(" | "));
  await page.close();
}

// Nachbesserung M9, Runde 2 (11.10.2026): Das Feld des Kindes bleibt leer (Modus „bildschirm“). Der Hinweis am Feld ist ein einziger Satz, Weiter geht, die
// Prüfseite zeigt das leere Feld in der Sprache neutral („Nicht unterschrieben (freiwillig)“, nicht „mit Stift“), die Fertig-Seite sagt, dass alles am
// Bildschirm unterschrieben ist (die Zeile des Kindes im Antrag auf Spielerlaubnis bleibt ohne Markierung).
async function einzelKindLeer(browser, server, sprache, muster, dict) {
  if (serverModus() === "stift") return;
  const code = sprache.code;
  const kennung = NAMEN[code] + ", Feld des Kindes leer";
  const page = await neueSeite(browser, server, code + "-kind-leer");
  await waehleSpracheAufStart(page, code);
  await ladeBeispiel(page, "kind-neu");
  let s = await stand(page);
  for (let i = 0; i < 60 && s.schritt !== "unterschriften"; i++) {
    const r = await klickeWeiter(page, s);
    if (!r.gewechselt) break;
    s = await stand(page);
  }
  ok(kennung + ": Schritt 'unterschriften' erreicht", s.schritt === "unterschriften", s.schritt);
  const hinweis = dict.unterschriften.person.spielerHinweis;
  ok(kennung + ": Hinweis am Feld des Kindes ist ein einziger Satz, ohne den Satz zum Ausdruck mit Stift", !String(hinweis.kind).includes("\n") && !String(hinweis.selbst).includes("\n"), String(hinweis.kind));
  await haekchenSatzung(page);
  const canvas = await page.$('#anmeldung .anm-unterschrift[data-unterschrift="sorgeberechtigte"] canvas');
  await zeichne(page, canvas);
  await page.waitForFunction(() => document.querySelectorAll("#anmeldung .anm-unterschrift--fertig").length >= 1, { timeout: 5000 }).catch(() => {});
  const zusatz = await page.$eval('#anmeldung .anm-unterschrift[data-unterschrift="spieler"] [id$="-zusatz"]', (e) => e.textContent).catch(() => "");
  ok(kennung + ": Hinweis am Feld des Kindes steht in der Sprache und ist der Satz ohne den zum Ausdruck", ohneSteuer(zusatz) === ohneSteuer(String(hinweis.kind).replace(/\n/g, " ")), ohneSteuer(zusatz));
  const r = await klickeWeiter(page, s);
  ok(kennung + ": Weiter geht ohne die Unterschrift des Kindes", r.gewechselt && r.fehler.length === 0, JSON.stringify(r));
  s = await stand(page);
  ok(kennung + ": Prüfseite erreicht", s.schritt === "pruefen", s.schritt);
  if (s.schritt === "pruefen") {
    const zeilen = await page.$$eval("#anmeldung .anm-pruefzeile", (l) => l.map((z) => ({ label: (z.querySelector("dt") || { textContent: "" }).textContent, wert: (z.querySelector(".anm-pruefzeile__wert") || { textContent: "" }).textContent })));
    const vorlage = ohneSteuer(dict.unterschriften.person.spieler.kind).split("{name}");
    // Die Zeile des Kindes trägt den Vornamen (Beispiel „Kind neu“: Mila); „İmza: {name}“ im Türkischen beginnt wie die Zeile der Eltern
    const kind = zeilen.find((z) => ohneSteuer(z.label).startsWith(vorlage[0]) && ohneSteuer(z.label).includes(vorlage[1]) && ohneSteuer(z.label).includes("Mila")) || { label: "", wert: "" };
    ok(kennung + ": Prüfseite: das leere Feld des Kindes steht in der Sprache als „" + ohneSteuer(dict.pruefen.werte.nichtUnterschriebenFreiwillig) + "“ (nicht „mit Stift“)", ohneSteuer(kind.wert) === ohneSteuer(dict.pruefen.werte.nichtUnterschriebenFreiwillig) && ohneSteuer(kind.wert) !== ohneSteuer(dict.pruefen.werte.mitStift), ohneSteuer(kind.label) + " = " + ohneSteuer(kind.wert));
    // M12-ar, Runde 2 (12.10.2026): Das Alter steht hinter dem Geburtsdatum nach der Vorlage allgemein.alterJahre mit {n}, ohne ein an die Zahl gehängtes Wort
    // (Arabisch beugt die Einheit nach der Zahl: „العمر: 8“, nicht „8 سنة“; allgemein.jahre gibt es nicht mehr).
    const alterVorlage = ohneSteuer(dict.allgemein.alterJahre);
    const alterMuster = new RegExp("\\(" + alterVorlage.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace("\\{n\\}", "\\d+") + "\\)$");
    const geboren = zeilen.find((z) => ohneSteuer(z.label) === ohneSteuer(dict.pruefen.zeilen.geboren)) || { label: "", wert: "" };
    ok(kennung + ": Prüfseite: Alter nach der Vorlage „" + alterVorlage + "“ (kein an die Zahl gehängtes Wort)", alterMuster.test(ohneSteuer(geboren.wert)) && !dict.allgemein.jahre, ohneSteuer(geboren.label) + " = " + ohneSteuer(geboren.wert));
    // U-11 (12.10.2026): Das Datum steht in der Schreibweise der Sprache wie auf der Fertig-Seite: Englisch britisch (Tag zuerst), Arabisch mit westlichen Ziffern
    const datumText = ohneSteuer(geboren.wert);
    const datumMuster = { en: /^\d{1,2} [A-Z][a-z]+ \d{4}/, ar: /^\d{1,2} \S+ \d{4}/, tr: /^\d{1,2} \S+ \d{4}/, de: /^\d{1,2}\. \S+ \d{4}/ }[code];
    ok(kennung + ": Prüfseite: Geburtsdatum in der Schreibweise der Sprache (en: „14 May 2018“, nicht „May 14, 2018“; ar: westliche Ziffern)", !!datumMuster && datumMuster.test(datumText) && (code !== "ar" || !/[\u0660-\u0669]/.test(datumText)), datumText);
    const p = await seitenPruefung(page, muster);
    ok(kennung + ": Prüfseite ohne deutschen Text und ohne Textschlüssel", p.treffer.length === 0, p.treffer.slice(0, 2).join(" | "));
    await foto(page, code, "kind-leer", "pruefen");
    const r2 = await klickeWeiter(page, s);
    ok(kennung + ": Weiter zur Fertig-Seite", r2.gewechselt && r2.fehler.length === 0, JSON.stringify(r2));
    await page.waitForFunction(() => document.querySelector('#anmeldung [data-status="fertig"], #anmeldung [data-status="fehler"]'), { timeout: 30000 }).catch(() => {});
    const schritte = await page.$eval("#anmeldung .anm-naechste", (e) => e.innerText).catch(() => "");
    const zeilenFertig = String(dict.fertig.unterschriftFertig).split("\n").map(ohneSteuer).filter(Boolean);
    const rest = String(dict.fertig.unterschriftRest).split("\n").map(ohneSteuer).filter(Boolean);
    ok(kennung + ": Fertig-Seite: „alles am Bildschirm unterschrieben“ in der Sprache, nicht „Einige Unterschriften fehlen noch“", zeilenFertig.every((z) => ohneSteuer(schritte).includes(z)) && !rest.some((z) => ohneSteuer(schritte).includes(z)), ohneSteuer(schritte).slice(0, 160));
  }
  ok(kennung + ": keine Fehler in der Konsole, keine Warnung \"Text fehlt\"", page.__st.konsole.length === 0 && page.__st.warnungen.length === 0, page.__st.konsole.concat(page.__st.warnungen).slice(0, 3).join(" | "));
  await page.close();
}

// Text eines Dialogs gegen die deutschen Muster prüfen: jede Zeile und jedes Stück zwischen " – " einzeln.
async function seitenPruefungText(page, text, muster) {
  return page.evaluate(
    (t, m) => {
      const ohne = (x) => x.replace(/[\u2060\u2066-\u2069\u200e\u200f\u202a-\u202e]/g, "").replace(/\s+/g, " ").trim();
      const stuecke = t.split(/\n| – /).map(ohne).filter((x) => x.length >= 6);
      const kurz = m.kurz.map((q) => new RegExp(q));
      const lang = m.lang.map((q) => new RegExp(q));
      const aus = [];
      for (const x of stuecke) {
        if (kurz.some((r) => r.test(x))) aus.push(x.slice(0, 60));
        for (const r of lang) if (r.test(x)) aus.push(x.slice(0, 60));
      }
      return Array.from(new Set(aus));
    },
    text,
    muster
  );
}

// ---------- Mängeltest ----------

// Entfernt im Schnappschuss von docs/ (nur dort, nie in assets/) einige Schlüssel aus den
// englischen Dateien, damit der Durchlauf den Rückfall auf Deutsch bemerken muss.
const MANGEL = {
  // P3 Teil b: Was die Seiten nicht mehr zeigen (fertig.senden.einleitung, unterschriften.satzung.titel, die Liste der Teile), taugt nicht mehr als Beispiel; dafür
  // fehlen jetzt die Erklärung im Satzung-Block (unterschriften.satzung.erklaerung) und die Überschrift des Abschnitts „So schicken Sie die Datei“ (fertig.senden.titel)
  oberflaeche: ["wer.titel", "abmeldung.status.hinweis", "fertig.senden.titel", "unterschriften.stiftTitel", "unterschriften.satzung.erklaerung", "notfall.kontakt.hinweis"],
  regeln: ["unterlagen.U09.warum", "hinweise.abmeldung_formlos"],
};
async function erzeugeMangel() {
  const ordner = path.join(ROOT, "tools", "cache", "anmeldung-test", "docs-schnappschuss", "assets", "js", "anmeldung", "texte");
  for (const [datei, pfade] of Object.entries(MANGEL)) {
    const ziel = path.join(ordner, "en-" + datei + ".js");
    const dict = JSON.parse(JSON.stringify(await ladeDe("en-" + datei + ".js")));
    for (const pfad of pfade) {
      const teile = pfad.split(".");
      let x = dict;
      for (const t of teile.slice(0, -1)) x = x[t];
      delete x[teile[teile.length - 1]];
    }
    fs.writeFileSync(ziel, "export default " + JSON.stringify(dict) + ";\n");
    info("Mängeltest: aus en-" + datei + ".js entfernt (nur im Schnappschuss): " + pfade.join(", "));
  }
}

// ---------- Hauptablauf ----------

async function main() {
  console.log("Sprach-Durchlauf Anmelde-Assistent (AP-5) – " + new Date().toISOString().slice(0, 19) + "\n");
  fs.rmSync(AUSGABE, { recursive: true, force: true });
  fs.mkdirSync(AUSGABE, { recursive: true });

  const sprachen = [
    { code: "en", rtl: false },
    { code: "tr", rtl: false },
    { code: "ar", rtl: true },
  ].filter((s) => !ARG_SPRACHE || s.code === ARG_SPRACHE);

  // 1. Schlüssel-Abgleich ohne Browser
  for (const s of sprachen) {
    const r = await pruefeSprache(s.code);
    ok(NAMEN[s.code] + ": Übersetzung vollständig und stimmig (Schlüssel, Platzhalter, Dokumentnamen)", r.fehler.length === 0, r.fehler.length + " Fehler; " + r.zaehler.texte + " Texte");
    for (const f of r.fehler.slice(0, 5)) info(f.datei + " " + f.pfad + " – " + f.art);
  }

  // 2. Server und Browser
  const server = await starteTestserver(ARG_HFV ? { hfv: ARG_HFV } : {});
  SERVER_MODUS = server.hfv;
  console.log("\nServer: " + server.basis + " (docs/), Schalter unterschriftHfv: " + server.hfv);
  if (MANGELTEST) await erzeugeMangel();
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-first-run"] });
  try {
    // Selbsttest der Erkennung: Die deutsche Seite muss als deutscher Text erkannt werden.
    {
      const muster = await baueDeMuster(sprachen[0].code);
      const page = await neueSeite(browser, server, "selbsttest");
      await klickeWeiter(page, await stand(page));
      const p = await seitenPruefung(page, muster);
      ok("Selbsttest: die Erkennung findet deutschen Text auf der deutschen Seite", p.treffer.length >= 2, p.treffer.length + " Treffer, zum Beispiel: " + p.treffer.slice(0, 2).join(" | "));
      await page.close();
    }
    for (const s of sprachen) {
      console.log("\n=== " + NAMEN[s.code] + " (" + s.code + ") ===");
      const muster = await baueDeMuster(s.code);
      info("deutsche Muster: " + muster.kurz.length + " Textstücke, " + muster.lang.length + " Sätze");
      const dict = await ladeDe(s.code + "-oberflaeche.js");
      const txt = { teilweise: dict.sprache.teilweise, fehlt: dict.sprache.fehlt };
      for (const b of EIN_BEISPIEL ? BEISPIELE.slice(0, 1) : BEISPIELE) await durchlauf(browser, server, s, b, muster, txt);
      await einzelpruefungen(browser, server, s, muster, txt);
      await einzelLateinisch(browser, server, s, dict);
      await einzelSorge(browser, server, s, muster, dict);
      await einzelKindLeer(browser, server, s, muster, dict);
      await einzelZugang(browser, server, s.code, s.rtl, muster);
    }
    if (!ARG_SPRACHE) {
      console.log("\n=== Deutsch (de): Code-Seite und Übergabe ===");
      await einzelZugang(browser, server, "de", false, null);
    }
  } finally {
    await browser.close();
    await server.stop();
  }

  console.log("\n=== Zusammenfassung ===");
  console.log("Prüfungen: " + pruefungen.length + ", Fehler: " + fehlerAnzahl);
  const dateien = fs.existsSync(AUSGABE) ? fs.readdirSync(AUSGABE).filter((f) => f.endsWith(".png")).sort() : [];
  console.log("Bildschirmfotos: " + dateien.length + " in " + path.relative(ROOT, AUSGABE));
  for (const d of dateien) console.log("  " + path.join(path.relative(ROOT, AUSGABE), d));
  for (const p of pruefungen.filter((x) => !x.ok)) console.log("  FEHLER: " + p.name + (p.detail ? " – " + p.detail : ""));
  fs.writeFileSync(path.join(AUSGABE, "bericht.json"), JSON.stringify({ pruefungen, fehler: fehlerAnzahl, bilder: dateien }, null, 2));
  if (MANGELTEST) {
    // Der Rückfall auf Deutsch muss bemerkt werden, ebenso eine fehlende Erklärung im Satzung-Block und eine fehlende Überschrift im Abschnitt zum Schicken der Datei.
    const gefangen =
      pruefungen.some((p) => !p.ok && /Rückfalltext/.test(p.name)) &&
      pruefungen.some((p) => !p.ok && /Satzung-Block übersetzt/.test(p.name)) &&
      pruefungen.some((p) => !p.ok && /Abschnitt: Überschrift in der Sprache/.test(p.name));
    console.log(gefangen ? "\nMängeltest bestanden: Der Durchlauf hat die fehlenden Texte bemerkt (die Fehler oben sind gewollt)." : "\nMängeltest FEHLGESCHLAGEN: Der Durchlauf hat die fehlenden Texte NICHT alle bemerkt.");
    process.exit(gefangen ? 0 : 1);
  }
  if (fehlerAnzahl) {
    console.log("\ne2e-sprachen.mjs: FEHLGESCHLAGEN");
    process.exit(1);
  }
  console.log("\ne2e-sprachen.mjs: alle Prüfungen bestanden.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
