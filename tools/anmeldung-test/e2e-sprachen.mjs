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
//     als Hinweis – die Übersetzung liefert Paket M3); die Teile der Datei tragen
//     die übersetzten Titel (fertig.teilTitel); alle sechs Meldungen zu "lateinische Buchstaben"
//     (Name, Ort, Verein, Anschrift, Nummer, Text) mit Text in anderer Schrift im Feld; der Kasten für
//     getrennt lebende Eltern auf "sorge" und "unterschriften"
//   - Nachbesserung M9, Runde 2 (11.10.2026, Modus „bildschirm“): Feld des Kindes leer – der Hinweis am Feld ist ein einziger Satz (ohne den Satz zum
//     Ausdruck mit Stift), Weiter geht, die Prüfseite zeigt in der Sprache „Nicht unterschrieben (freiwillig)“, die Fertig-Seite „alles am Bildschirm unterschrieben“
//   - M10 (11.10.2026): Fertig-Seite, Abschnitt „So schicken Sie die Datei an den Verein“ in jeder Sprache (Titel, Einleitung, Schritte am Handy und am
//     Computer mit der Beschriftung der Knöpfe, Adresse von links nach rechts, Knöpfe „Adresse kopieren“ und „E-Mail an die Geschäftsstelle öffnen“, Hinweis
//     zum Anhang); der mailto-Link bleibt deutsch (Betreff „Anmeldung Vorname Nachname“, deutscher Text), auch in Arabisch. Die Seiten des Tests tun, als könne
//     der Handy-Browser Dateien teilen (navigator.share): So steht auch der Weg am Handy da.
//   - M12-ar, Runde 2 (12.10.2026): Prüfseite, Zeile „Geboren“: das Alter steht nach der Vorlage allgemein.alterJahre mit {n} hinter dem Datum, ohne ein an
//     die Zahl gehängtes Wort (Arabisch: „العمر: 8“); allgemein.jahre gibt es nicht mehr
//   - M14 (12.10.2026): Der Verein beantragt für Fußball immer das Spielrecht. Die Seite „spielerpass“ zeigt in jeder Sprache die übersetzte Erklärung zum Spielrecht
//     (drei Absätze, Schlüssel spielerpass.spielrecht); die frühere Frage zu den Spielen (Block spielen) gibt es in keiner Sprache mehr
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

async function neueSeite(browser, server, name) {
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
  await page.goto(server.basis + "/anmeldung/", { waitUntil: "networkidle0" });
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
      titel: (b.querySelector("h3") || {}).textContent || "",
      text: b.innerText,
      linkText: link ? link.childNodes[0].textContent : null,
      linkZusatz: link ? (link.querySelector(".sr-only") || {}).textContent : null,
      label: haken ? (document.querySelector('label[for="' + haken.id + '"]') || {}).innerText || "" : "",
      hakenDa: !!haken,
      angekreuzt: haken ? haken.checked : null,
      pflicht: haken ? haken.getAttribute("aria-required") : null,
      giltTitel: Array.from(document.querySelectorAll("#anmeldung .anm-unterschrift .anm-unterschrift__gilt > p")).map((p) => p.textContent),
      gilt: Array.from(document.querySelectorAll("#anmeldung .anm-unterschrift .anm-unterschrift__gilt > ul > li")).map((li) => li.textContent),
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
    ok(kennung + ": Feld des Kindes: Hinweis in der Sprache („Kann Ihr Kind schon schreiben? …“), ohne deutschen Text", ohneSteuer(kindFeld.zusatz) === ohneSteuer(dict.unterschriften.person.spielerHinweis.kind.replace(/\n/g, " ")), ohneSteuer(kindFeld.zusatz));
  } else if (!bildschirmModus) {
    ok(kennung + ": Modus stift: kein Feld für das Kind", !kindFeld, feldDom.felder.map((f) => f.wer).join(","));
  }
  if (!dom) return;
  ok(kennung + ": Satzung-Block übersetzt, deutscher Name (Satzung) in Klammern", ohneSteuer(dom.titel) === ohneSteuer(erwartet.titel) && ohneSteuer(dom.label).includes(ohneSteuer(erwartet.label)) && /\(Satzung\)/.test(ohneSteuer(dom.text)), ohneSteuer(dom.titel) + " | " + ohneSteuer(dom.label).slice(0, 80));
  if (dom.linkText !== null) ok(kennung + ": Satzung-Link und Zusatz für Screenreader übersetzt", ohneSteuer(dom.linkText).includes(ohneSteuer(erwartet.link)) && ohneSteuer(dom.linkZusatz || "").includes(ohneSteuer(erwartet.linkZusatz)), ohneSteuer(dom.linkText) + " | " + ohneSteuer(dom.linkZusatz || ""));
  // "Diese Unterschrift gilt für:" mit einer Zeile je Blatt (N-A2): kein Trenner zwischen Namen in einer Zeile. Die Überschrift der Liste
  // steht im Wörterbuch der Sprache (unterschriften.giltFuer); solange die Übersetzung fehlt, steht der deutsche Text in Isolaten.
  const aussen = (t) => t.replace(/\([^()]*\)/g, "");
  const punkte = dom.gilt.map((t) => ohneSteuer(t));
  const titel = dom.giltTitel.map((t) => ohneSteuer(t));
  const titelSoll = dict.unterschriften.giltFuer ? ohneSteuer(dict.unterschriften.giltFuer) : null;
  ok(kennung + ": \"Diese Unterschrift gilt für:\" steht als Liste, ein Blatt je Zeile, ohne Trenner zwischen Namen", punkte.length > 0 && titel.length > 0 && punkte.every((t) => !/[,\u060C]/.test(aussen(t))) && (titelSoll === null || titel.every((t) => t === titelSoll)), titel.slice(0, 1).join("") + " | " + punkte.slice(0, 3).join(" || ").slice(0, 200));
}

// Ergebnisseite: Die Teile der Datei tragen die übersetzten Titel (fertig.teilTitel), nicht die deutschen aus dem PDF-Modul.
async function pruefeTeilTitel(page, dict, kennung) {
  const seite = ohneSteuer(await page.$eval("#anmeldung", (e) => e.innerText));
  const titel = ["A", "B", "C"].map((x) => ohneSteuer(dict.fertig.teilTitel[x]));
  const da = titel.filter((t) => seite.includes(t));
  const deutsch = ["Für Sie (", "Für den Verein (", "Vertraulich ("].filter((t) => seite.includes(t));
  ok(kennung + ": Teile der Datei mit übersetzten Titeln (A und B immer, C bei Gesundheitsdaten)", da.includes(titel[0]) && da.includes(titel[1]) && deutsch.length === 0, da.length + " von 3 gefunden" + (deutsch.length ? "; deutscher Titel: " + deutsch.join(", ") : ""));
}

// M10 (11.10.2026): Ergebnisseite – der Abschnitt „So schicken Sie die Datei an den Verein“ trägt die Texte der Sprache: Überschrift, Einleitung, die Schritte
// am Handy und am Computer (mit der Beschriftung der Knöpfe aus dem Wörterbuch der Sprache), die Beschriftung der Knöpfe, den Hinweis zum Anhang.
// Die Adresse steht von links nach rechts (auch in Arabisch). Der mailto-Link bleibt in jeder Sprache deutsch: Betreff „Anmeldung Vorname Nachname“ und
// der deutsche Text, richtig kodiert (die Geschäftsstelle liest Deutsch).
async function pruefeSenden(page, dict, kennung, server, beispielId) {
  const adresse = server.konfig.verein.mail;
  const beispiele = await import(pathToFileURL(path.join(ROOT, "assets", "js", "anmeldung", "beispiele.js")).href);
  const a = beispiele.beispielAntworten(beispielId, "2026-09-29", server.konfig);
  const d = await page.evaluate(() => {
    const abschnitt = document.querySelector("#anmeldung [data-senden]");
    if (!abschnitt) return null;
    const text = (e) => (e ? e.textContent : null);
    const adresseEl = abschnitt.querySelector("[data-mail-adresse]");
    const link = abschnitt.querySelector('a[data-aktion="mail-oeffnen"]');
    return {
      titel: text(abschnitt.querySelector("h3")),
      einleitung: text(abschnitt.querySelector(":scope > p.anm-text")),
      wege: Array.from(abschnitt.querySelectorAll("[data-weg]")).map((w) => ({ art: w.getAttribute("data-weg"), titel: text(w.querySelector("h4")), schritte: Array.from(w.querySelectorAll("ol > li")).map((li) => li.textContent) })),
      adresse: text(adresseEl),
      adresseDir: adresseEl && adresseEl.getAttribute("dir"),
      adressLabel: text(abschnitt.querySelector(".anm-senden__label")),
      kopieren: text(abschnitt.querySelector('button[data-aktion="adresse-kopieren"]')),
      linkText: text(link),
      href: link && link.getAttribute("href"),
      hinweise: Array.from(abschnitt.querySelectorAll("p.anm-hinweis")).map((p) => p.textContent),
    };
  });
  if (!ok(kennung + ": Fertig-Seite hat den Abschnitt „So schicken Sie die Datei an den Verein“", !!d, "")) return;
  const F = dict.fertig;
  const S = F.senden;
  const o = ohneSteuer;
  ok(kennung + ": Abschnitt: Überschrift und Einleitung in der Sprache", o(d.titel) === o(S.titel) && o(d.einleitung) === o(S.einleitung), o(d.titel) + " | " + o(d.einleitung));
  const handy = d.wege.find((w) => w.art === "handy");
  const computer = d.wege.find((w) => w.art === "computer");
  const schritte = (vorlage, knopf) => o(vorlage.replace("{knopf}", knopf));
  ok(kennung + ": Abschnitt: Weg am Handy – Überschrift und drei Schritte in der Sprache, Schritt 1 mit der Beschriftung des Knopfes „" + o(F.teilen) + "“", !!handy && o(handy.titel) === o(S.handyTitel) && handy.schritte.length === 3 && o(handy.schritte[0]) === schritte(S.handy1, F.teilen) && o(handy.schritte[1]) === o(S.handy2) && o(handy.schritte[2]) === o(S.handy3), handy ? handy.schritte.map(o).join(" | ") : "kein Weg am Handy");
  ok(kennung + ": Abschnitt: Weg am Computer – Überschrift und drei Schritte in der Sprache, Schritt 1 mit der Beschriftung des Knopfes „" + o(F.herunterladen) + "“", !!computer && o(computer.titel) === o(S.computerTitel) && computer.schritte.length === 3 && o(computer.schritte[0]) === schritte(S.computer1, F.herunterladen) && o(computer.schritte[1]) === o(S.computer2) && o(computer.schritte[2]) === o(S.computer3), computer ? computer.schritte.map(o).join(" | ") : "kein Weg am Computer");
  ok(kennung + ": Abschnitt: Adresse der Geschäftsstelle aus der Konfiguration, von links nach rechts (dir=ltr), mit der Beschriftung der Sprache", d.adresse === adresse && d.adresseDir === "ltr" && o(d.adressLabel) === o(S.adresseTitel), d.adresse + " (" + d.adresseDir + ")");
  ok(kennung + ": Abschnitt: Knöpfe „" + o(S.kopieren) + "“ und „" + o(S.oeffnen) + "“ und Hinweis zum Anhang in der Sprache", o(d.kopieren) === o(S.kopieren) && o(d.linkText) === o(S.oeffnen) && d.hinweise.map(o).includes(o(S.anhang)), o(d.kopieren) + " | " + o(d.linkText) + " | " + d.hinweise.map(o).join(" / "));
  // Der Link bleibt deutsch, in jeder Sprache
  const soll = "mailto:" + adresse + "?subject=" + encodeURIComponent("Anmeldung " + a.vorname + " " + a.nachname) + "&body=Guten%20Tag%2C%0D%0A%0D%0Aanbei%20die%20Anmeldung%20als%20PDF.%0D%0A%0D%0AViele%20Gr%C3%BC%C3%9Fe";
  ok(kennung + ": mailto-Link bleibt deutsch (Betreff „Anmeldung " + a.vorname + " " + a.nachname + "“, deutscher Text, kodiert), ohne Steuerzeichen für die Schreibrichtung", d.href === soll && !/%E2%81|%E2%80/.test(d.href), d.href);
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
      await pruefeTeilTitel(page, dict, kennung);
      await pruefeSenden(page, dict, kennung, server, beispiel.id);
      const p = await seitenPruefung(page, muster);
      if (p.treffer.length) problem.deutsch.push("fertig/ergebnis: " + p.treffer.slice(0, 2).join(" | "));
      if (!p.scrollOk) problem.querscroll.push("fertig/ergebnis (" + p.scrollBreite + ")");
      await foto(page, code, beispiel.id, "fertig");
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
  oberflaeche: ["wer.titel", "abmeldung.status.hinweis", "fertig.senden.einleitung", "unterschriften.stiftTitel", "unterschriften.satzung.titel", "fertig.teilTitel.A", "notfall.kontakt.hinweis"],
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
    // Der Rückfall auf Deutsch muss bemerkt werden, ebenso ein fehlender Titel im Satzung-Block und im Teil A der Datei.
    const gefangen =
      pruefungen.some((p) => !p.ok && /Rückfalltext/.test(p.name)) &&
      pruefungen.some((p) => !p.ok && /Satzung-Block übersetzt/.test(p.name)) &&
      pruefungen.some((p) => !p.ok && /Teile der Datei mit übersetzten Titeln/.test(p.name));
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
