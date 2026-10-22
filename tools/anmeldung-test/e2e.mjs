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
//     Abkürzungen), vollständige Textschlüssel, alle 26 Seiten vorhanden
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
//     Sonderzeichen bis ins PDF, Heimweg nach dem Training (M1), Attest im Unterschriftenplan
//   - Runde 4: lateinische Schrift in allen Freitextfeldern, die ins PDF gehen (Abdeckung aller
//     Textfelder im Quelltext und je Feld ein Fall im Browser), Knopf "Vorführung" im kompakten Kopf
//     (Vereinssicht und Beispiele auf jedem Schritt), ein einziger Kasten für getrennt lebende Eltern,
//     Feldname vor jeder Meldung in der Fehlerliste
//   - N-A2 (07.10.2026): Sprachwahl ganz oben im ersten Bildschirm (vier Sprachen in eigener Schrift, vor Überschrift und Erklärtext),
//     App-Modus ?app=1 (bis 11.10.2026: Hinweis „Im Browser öffnen“ und dieselben Schritte bis „fertig“; seit P1 nur noch die Übergabe, siehe unten),
//     „Diese Unterschrift gilt für:“ als Liste, kein BIC-Feld, Arabisch
//     (Entwurfsband rechts, Rufnummer im Hilfe-Dialog als LTR-Block, Prüfseite ohne <bdi> um den ganzen Wert), Beitragsgruppen aus den
//     Texten der Sprache (mit abgefangenem englischem Wörterbuch; die Übungszeiten der Karnevalgruppen sind seit M1 entfallen)
//   - M1 (11.10.2026): Heimweg nach dem Training als eigene Pflichtseite für Minderjährige, die trainieren oder tanzen (Texte, Fehlermeldung,
//     Prüfseite mit „Ändern“, nie bei Passiven und Erwachsenen, Antwort im PDF); kein Schritt „karneval“ mehr; kein Zuschlag ohne Lastschrift
//   - M1, Runde 2 (11.10.2026): Satz zur Fahrt je Abteilung (nur Karneval: „… zu Veranstaltungen des Vereins …“, kein „Turnier“ auf den Seiten
//     des Karneval-Kindes; Fußball und „beides“: „… zu Spielen und Turnieren …“); keine karnevalGruppen in der eingebetteten Konfiguration
//   - M9 (11.10.2026): Alles am Bildschirm unterschreiben, auch die Blätter des Verbands (Schalter unterschriftHfv, Jugendleitung). Der Hauptlauf prüft den
//     Stand der Daten („bildschirm“): freiwilliges Feld für das Kind, zweiter Elternteil mit eigenem Feld, Weiter ohne die freiwilligen Felder, Prüfseite und
//     Fertig-Seite, PDF mit den Sätzen in Teil A und im Laufzettel. pruefeUnterschriftenModus legt den Schalter im Testserver um (Test-Option hfv) und prüft
//     dieselben Beispiele (Kind neu, Wechsel in Hessen, Herren) und den Fall „getrennt ohne Einverständnis“ mit dem Verhalten bis 11.10.2026 („stift“).
//   - M9, Runde 2 (11.10.2026): Bleibt das freiwillige Feld des Kindes leer, bleibt die Zeile im Antrag auf Spielerlaubnis ohne Markierung (kein „mit Stift“): Hinweis am
//     Feld ohne den Satz zum Ausdruck, Prüfseite „Nicht unterschrieben (freiwillig)“, Fertig-Seite „Sie haben alles am Bildschirm unterschrieben.“, Teil A ohne den
//     Antrag unter „Ausdrucken müssen Sie nur“ (mit allen Nachweisen: „Sie müssen nichts ausdrucken.“), Laufzettel „Das Kind hat den Antrag nicht unterschrieben. …“
//   - M10 (11.10.2026): Die Familie schickt die Datei per E-Mail an die Geschäftsstelle (Entscheidung der 1. Vorsitzenden, kein Server-Versand). statischeM10:
//     mailto-Link (Betreff „Anmeldung Vorname Nachname“ und deutscher Text richtig kodiert, auch bei Umlauten und Zeichen mit Bedeutung in einer Adresse),
//     Mailtext in Einfacher Sprache, neue Textschlüssel, die Adresse steht nicht fest im Code. pruefeMailAnVerein (390 x 844): Abschnitt „So schicken Sie
//     die Datei an den Verein“ auf der Fertig-Seite (Wege am Handy und am Computer, Adresse groß und richtig, Knopf „Adresse kopieren“ mit Zwischenablage und
//     ohne sie, Link „E-Mail an die Geschäftsstelle öffnen“ mit mailto:, alter Wortlaut weg, Hinweis zu WhatsApp bleibt, axe, Tippflächen) und
//     „Alles auf Papier, selbst ausdrucken“ (Teil B zusätzlich ausgedruckt abgeben). App-Modus: der Link bleibt mailto:.
//   - M14 (12.10.2026): Für Fußball beantragt der Verein immer das Spielrecht (Entscheidung der 1. Vorsitzenden). Es gibt die Frage zu den Spielen und den Schritt
//     „spielen“ nicht mehr (26 Seiten). pruefeSpielrechtImmer (390 x 844): Mannschaft und Spielerpass folgen unmittelbar aufeinander, die Seite „spielerpass“ zeigt die
//     Erklärung zum Spielrecht kurz (Kind und Erwachsene), der Hinweis „ohne Spielrecht kein Spiel“ steht im Aufklapper derselben Seite, nirgends steht die frühere
//     Antwort (Training ohne Spiele), die Prüfseite hat keine Zeile „Spiele“, Karneval und Passive haben weder Mannschaft noch Spielerpass; die Beispiel-Läufe prüfen
//     die besuchten Schritte je Beispiel (Nachweis: schritte-m14-<Beispiel>.json im Ausgabeordner).
//   - P1 (12.10.2026): Zugang mit Code vom Probetraining (pruefeZugang, Prüfungen in zugang-browser.mjs; der Testserver setzt die Prüfwerte zur Laufzeit,
//     Standard: leere Liste): Code-Seite als erster Bildschirm (Sprachwahl oben, vor jeder persönlichen Frage, Feld und Knöpfe, Links darunter), leerer und
//     falscher Code (Meldung am Feld, aria-invalid, Fehlerliste, Fokus), richtiger Code in jeder Schreibweise (Adresse trägt code=, andere Angaben bleiben,
//     Neuladen fragt nicht noch einmal, Zurück führt nie auf die Code-Seite), Link mit gültigem und mit ungültigem Code, ohne crypto.subtle, eigene SHA-256
//     gegen crypto.subtle, mehrere und fremde Prüfwerte, Tastatur, axe, Sprache; die Vorführung ist kein Weg am Code vorbei. pruefeUebergabe: ?app=1 zeigt nur
//     die Übergabe mit dem Knopf „Im Browser öffnen“ (ext:// plus dieselbe Seite ohne app=1, code bleibt). pruefeCodeNichtImPdf: Der Code steht weder in den
//     Antworten noch im PDF noch im Speicher des Browsers.
//   - B1 (19.10.2026): pruefeSeitenZurueck (Prüfungen in zugang-browser.mjs): Der Link „Zurück zu „Mitglied werden““ oben links auf der Code-Seite gilt nur für die Live-Seite
//     (e2e-paket.mjs); auf der Begleitseite gibt es ihn nicht (kein Ziel „zurueck“ in der Konfiguration, nichts sichtbar, am Handy und am Rechner).
//   - P1, Zusätze (12.10.2026): pruefeUmgebungshinweis (Prüfungen in zugang-browser.mjs): Hinweiskasten oben auf dem ersten Bildschirm (Code-Seite oder Start), wenn die Seite
//     in einem Rahmen oder im Browser einer anderen App läuft. Oben im normalen Browser: kein Kasten. Im Rahmen: Testseite auf einem anderen Port mit einem <iframe> ohne allow-Angaben
//     (wie die Hülle der Website), Hinweis mit dem Link „In neuem Fenster öffnen“ (target=_blank, gleiche Adresse, mit code), Sprachwechsel, auf den Fragen kein Kasten mehr.
//     Browser anderer Apps: gesetzter User-Agent (Facebook, Instagram, Android-WebView, Snapchat) zeigt den Hinweis zum Browser, normale Browser (Safari, Chrome, Firefox, Edge,
//     Samsung Internet) nicht; ?app=1 hat Vorrang (nur die Übergabe). Alle vier Sprachen, Arabisch von rechts nach links.
//   - P3 Teil b (12.10.2026, Kürzungen nach STILREGELN; pruefeKuerzungenP3 und die angepassten Prüfungen zu Hinweisen, Beitrag, Unterschriften, Fertig-Seite): Zusatzzeilen und Sätze
//     entfallen (P3_GESTRICHEN, P3_NEU im Wörterbuch); höchstens ein Hinweiskasten je Frage-Seite, die Prüfseite zeigt keine Hinweise, die Fertig-Seite wiederholt nicht, was bei der Frage stand;
//     Beitrag: nur die vorgewählte Gruppe offen, die übrigen unter „Andere Beitragsgruppe“; „Mehr erfahren“ (Spielerpass, Leistungen); „Diese Unterschrift gilt für (n)“ ab zwei Blättern zugeklappt, bei einem Blatt die Zeile „Diese Unterschrift gilt für: Blatt“ direkt (Runde 2);
//     Fertig-Seite: nur der Weg, der zum Gerät passt, ohne Liste der Teile, „Diese Stellen melden sich bei Ihnen“ zugeklappt; Teil A der Datei ohne Tabelle für Blätter am Bildschirm.
//   - Screenshots je Seite nach tools/cache/anmeldung-test/e2e/
//
// Aufruf: node tools/anmeldung-test/e2e.mjs [--ohne-desktop] [--nur-sprache] [--nur=pruefeHeimweg,…]
//         (ANM_ATTRAPPEN=pdf erzwingt die Attrappe des PDF-Bausteins, auch wenn assets/js/anmeldung/pdf.js da ist)
// Ausgabe: eine Zeile je Prüfung, am Ende Zusammenfassung; Exit 0 nur, wenn alles bestanden ist.

import { createRequire } from "node:module";
import { createServer } from "node:http";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import puppeteer from "puppeteer-core";
import { starteTestserver } from "./testserver.mjs";
import { pruefeZugangImBrowser, pruefeUebergabeImBrowser, pruefeSeitenZurueckImBrowser, pruefeUmgebungshinweisImBrowser, pruefeUmgebungshinweisSprachen } from "./zugang-browser.mjs";
import { pruefeEinfacheSprache, fehlendeSchluessel, ladeWoerterbuch, pruefeAbgabeWortlaut, ABGABE_AUSNAHMEN_OBERFLAECHE } from "./sprache-check.mjs";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const AXE = fs.readFileSync(path.join(ROOT, "node_modules", "axe-core", "axe.min.js"), "utf8");
// Mit --nur=<Name,Name> laufen nur die genannten Einzelprüfungen (siehe einzelpruefungen()), zum Beispiel
// --nur=pruefeHeimweg. Das schnelle Prüfen einer Änderung; die Ausgabe liegt dann in e2e-nur/.
const NUR = (process.argv.find((a) => a.startsWith("--nur=")) || "").slice("--nur=".length).split(",").filter(Boolean);
const AUSGABE = path.join(ROOT, "tools", "cache", "anmeldung-test", NUR.length ? "e2e-nur" : "e2e");
const DATEIEN = path.join(AUSGABE, "dateien");
const HEUTE = "2026-09-29";
const OHNE_DESKTOP = process.argv.includes("--ohne-desktop");
const NUR_SPRACHE = process.argv.includes("--nur-sprache");

// Die 26 Schritte aus SCHNITTSTELLEN Abschnitt 4 (seit 12.10.2026 ohne „spielen“: Der Verein beantragt für Fußball immer das Spielrecht).
const SCHRITTE = [
  "start", "wer", "name", "geburt", "abteilung", "mannschaft", "spielerpass", "alter_verein", "abmeldung",
  "pass", "ausland", "wohnen", "sorge", "besonderes", "kontakt", "beitrag", "leistungen", "zahlung",
  "einwilligungen", "heimweg", "notfall", "spielerfoto", "nachweise", "unterschriften", "pruefen", "fertig",
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
  // o.url: eine andere Seite (die Hülle im Test mit dem Rahmen); sie wartet nicht auf den Assistenten.
  await page.goto(o.url || server.basis + "/anmeldung/" + (o.abfrage || ""), { waitUntil: "networkidle0" });
  if (!o.url) await page.waitForSelector("#anmeldung[data-bereit]", { timeout: 10000 });
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
// den freiwilligen Haken trotzdem setzen). ctx.ohneSatzung: den Haken nicht setzen. ctx.nur: nur diese Felder zeichnen.
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
  // Ein Elternteil reicht (O26, Jugendleitung 08.10.2026): Es gibt kein zweites Feld der Eltern, auch nicht bei "Beide Eltern". Im Modus „bildschirm“
  // (M9) kommen zwei freiwillige Felder dazu (spieler, sorgeberechtigte_2); ctx.nur zeichnet nur die genannten Felder.
  const gezeichnet = ctx.nur ? felder.filter((w) => ctx.nur.includes(w)) : felder;
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
    else if (s.schritt !== "fertig") {
      // Kennungen der Hinweise, die auf einer Seite mit einer Frage standen (offen oder im Aufklapper): Auf der Fertig-Seite stehen sie nicht noch einmal.
      const d = await hinweiseImDom(page);
      if (!ctx.hinweiseGesehen) ctx.hinweiseGesehen = new Set();
      // Eine Warnung oder Frist, die hier nur im Aufklapper stand (es stand schon ein Kasten offen), gilt nicht als gesehen (U-07): Die Fertig-Seite zeigt sie offen.
      for (const x of d.offenSchluessel) ctx.hinweiseGesehen.add(x);
      d.aufklapperSchluessel.forEach((x, i) => {
        if (!["warnung", "frist"].includes(d.aufklapperArten[i])) ctx.hinweiseGesehen.add(x);
      });
    }
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
      // "Diese Stellen melden sich bei Ihnen": seit P3 Teil b ein zugeklappter Bereich (details[data-weiterleitung])
      weiterleitung: (() => {
        const w = document.querySelector("#anmeldung details[data-weiterleitung]");
        return { vorhanden: !!w, zu: w ? !w.open : null, titel: w ? w.querySelector("summary").textContent.replace(/[\u2066-\u2069]/g, "").trim() : null, punkte: w ? w.querySelectorAll("li").length : 0, sichtbar: w ? Array.from(w.querySelectorAll("li")).filter(zuSehen).length : 0 };
      })(),
    };
  });
}

// P3 Teil b (STILREGELN Nr. 3 und 5): Auf 'pruefen' stehen keine Hinweise (S2); die Familie prüft nur ihre Angaben.
function hinweiseAufPruefseite(name, dom) {
  if (!dom) return ok(name + ": Hinweise gemessen", false, "keine Messung");
  ok(
    name + ": keine Hinweise, kein 'Weitere Hinweise' und keine Stellen, die sich melden",
    dom.offenArten.length === 0 && !dom.aufklapperVorhanden && dom.aufklapperAnzahl === 0 && !dom.weiterleitung.vorhanden,
    JSON.stringify({ offen: dom.offenArten, aufklapper: dom.aufklapperAnzahl, weiterleitung: dom.weiterleitung.vorhanden })
  );
}

// Auf 'fertig': Was die Familie schon bei ihrer Frage gesehen hat (`gesehen`), steht nicht noch einmal da; was zu keiner Frage gehört, steht
// hier: offen nur Warnungen und Fristen, alles andere zugeklappt unter "Weitere Hinweise (n)". Kein Hinweis geht verloren: Jeder steht bei seiner
// Frage oder hier. `grenze`: höchste erlaubte Zahl offener Kästen (nur wo die Aufgabe eine nennt).
function hinweiseAufFertigseite(name, dom, e, grenze, gesehen) {
  if (!dom || !e || !gesehen) return ok(name + ": Hinweise gemessen", false, "keine Messung");
  const gesamt = e.hinweise.map((x) => x.key);
  const hier = [...dom.offenSchluessel, ...dom.aufklapperSchluessel];
  const nurWichtig = dom.offenArten.every((x) => x === "warnung" || x === "frist");
  ok(
    name + ": offen stehen nur Warnungen und Fristen" + (grenze ? ", höchstens " + grenze + " Kästen" : ""),
    nurWichtig && (!grenze || dom.offenSichtbar <= grenze),
    dom.offenSichtbar + " offen: " + (dom.offenArten.join(", ") || "keiner")
  );
  const doppelt = hier.filter((x) => gesehen.has(x));
  ok(name + ": kein Hinweis steht noch einmal da, der schon bei seiner Frage stand", doppelt.length === 0, doppelt.join(", ") || hier.length + " Hinweise hier, " + gesehen.size + " bei den Fragen");
  const verloren = gesamt.filter((x) => !gesehen.has(x) && !hier.includes(x));
  ok(name + ": kein Hinweis geht verloren (jeder steht bei seiner Frage oder hier)", verloren.length === 0, verloren.join(", ") || gesamt.length + " Hinweise: " + (gesamt.length - hier.length) + " bei den Fragen, " + hier.length + " hier");
  const uebrig = dom.aufklapperAnzahl;
  ok(
    name + ": Aufklapper 'Weitere Hinweise (n)' ist zu, die Zahl im Titel stimmt mit den Kästen darin überein" + (uebrig ? " (n = " + uebrig + ")" : " (keiner nötig)"),
    uebrig === 0 ? !dom.aufklapperVorhanden : dom.aufklapperVorhanden && dom.aufklapperZu === true && dom.aufklapperTitel === "Weitere Hinweise (" + uebrig + ")" && dom.aufklapperZahl === uebrig && dom.inZuGesehen === 0,
    "Aufklapper " + dom.aufklapperAnzahl + ", Titel '" + dom.aufklapperTitel + "', zu: " + dom.aufklapperZu
  );
  const offenArt = e.hinweise.filter((x) => x.art === "offen" && hier.includes(x.key)).length;
  ok(
    name + ": 'offen'-Hinweise im Aufklapper unter der Überschrift 'Das klärt der Verein'",
    offenArt === 0 ? !dom.ueberschriften.includes("Das klärt der Verein") : dom.ueberschriften.includes("Das klärt der Verein") && dom.vereinKaesten.length === offenArt && dom.vereinKaesten.every((x) => x === "offen"),
    offenArt + " Hinweise der Art 'offen' hier; Überschriften: " + (dom.ueberschriften.join(" | ") || "keine")
  );
  const w = e.weiterleitung || [];
  ok(
    name + ": 'Diese Stellen melden sich bei Ihnen' steht zugeklappt (" + w.length + " Zeilen)",
    w.length === 0 ? !dom.weiterleitung.vorhanden : dom.weiterleitung.vorhanden && dom.weiterleitung.zu === true && dom.weiterleitung.punkte === w.length && dom.weiterleitung.sichtbar === 0 && !/[:\uff1a]$/.test(dom.weiterleitung.titel),
    JSON.stringify(dom.weiterleitung)
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
    seitenText: (document.getElementById("anmeldung") || {}).innerText || "",
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

// Getrennt lebende Eltern ohne Zustimmung: ein Kasten auf 'sorge' und ein Kasten auf 'unterschriften'. Modus „stift“ (Stand bis 11.10.2026): das PDF
// markiert die Stelle. Modus „bildschirm“ (M9): der andere Elternteil hat ein eigenes Feld; unterschreibt er dort, steht sein Bild im PDF, sonst die Markierung.
// Runde 4: Auf 'sorge/recht' standen zwei "Achtung"-Kästen (dieser und der Hinweis des Regelwerks); jetzt steht dort einer.
async function pruefeGetrennteEltern(browser, server, dateien) {
  const bildschirm = server.hfv !== "stift";
  const modus = bildschirm ? "Modus bildschirm" : "Modus stift";
  console.log("\n=== Runde 3 und 4: getrennt lebende Eltern (" + modus + ") ===");
  // Wortlaut vom 07.10.2026 (Prüfung Orchestrator, sprache-4): erst fragen, dann sagen, was bei „Nein“ gilt; seit M9 im Modus „bildschirm“: am Bildschirm oder mit Stift
  const satz = bildschirm
    ? "Hat der andere Elternteil zugestimmt? Dann setzen Sie den Haken. Wenn nicht: Er unterschreibt den Aufnahmeantrag auch. Das geht am Bildschirm. Oder mit Stift im Ausdruck."
    : "Hat der andere Elternteil zugestimmt? Dann setzen Sie den Haken. Wenn nicht: Er unterschreibt den Aufnahmeantrag auch. Das geht nur mit Stift. Im PDF ist die Stelle markiert.";
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
  ok("Getrennte Eltern (" + modus + "): Seite 'sorge/recht' erreicht", s0.schritt === "sorge" && s0.teil === "recht", s0.schritt + "/" + s0.teil);
  ok("Getrennte Eltern (" + modus + "): bei 'Beide Eltern' steht kein Hinweis da", !(await sichtbarIn(page, "#anmeldung [data-zweiter-elternteil]")), "");
  await klickeEtikett(page, '#anmeldung input[data-pfad="sorge"][data-wert="getrennt_bei_mir"]');
  const box = await page.evaluate(() => {
    const e = document.querySelector("#anmeldung [data-zweiter-elternteil]");
    return { sichtbar: !!e && e.checkVisibility(), text: e ? e.innerText.replace(/\s+/g, " ").trim() : "" };
  });
  ok("Getrennte Eltern (sorge, " + modus + "): ohne Zustimmung erklärt der Kasten in drei kurzen Absätzen: Hat er zugestimmt? Haken setzen; wenn nicht, unterschreibt er auch, " + (bildschirm ? "am Bildschirm oder mit Stift im Ausdruck" : "nur mit Stift, im PDF markiert"), box.sichtbar && box.text === "Achtung " + satz, box.text);
  const auf = await kaesten(page);
  const achtung = auf.filter((x) => x.label === "Achtung");
  ok("Getrennte Eltern (sorge, " + modus + "): genau ein Kasten 'Achtung' auf der Seite, und es ist dieser (nicht zwei, die zusammen verwirren)", achtung.length === 1 && achtung[0].zweiter, JSON.stringify(auf.map((x) => x.label + (x.key ? ":" + x.key : "") + (x.zweiter ? " [zweiter Elternteil]" : ""))));
  ok("Getrennte Eltern (sorge, " + modus + "): der Satz des Regelwerks 'Sonst unterschreiben beide' steht hier nicht mehr", !auf.some((x) => x.key === "getrennt_zustimmung" || /Sonst unterschreiben beide/.test(x.text)), "");
  const kaestchenText = await page.$eval('#anmeldung input[data-pfad="andererElternteilEinverstanden"]', (e) => ({ sichtbar: e.closest("label").checkVisibility(), text: e.closest("label").innerText.replace(/\s+/g, " ").trim() }));
  ok("Getrennte Eltern (sorge, " + modus + "): das Kästchen 'Der andere Elternteil ist einverstanden' bleibt", kaestchenText.sichtbar && kaestchenText.text.startsWith("Der andere Elternteil ist einverstanden."), kaestchenText.text);
  await page.$eval("#anmeldung [data-zweiter-elternteil]", (e) => e.scrollIntoView({ block: "center" }));
  await page.screenshot({ path: path.join(AUSGABE, MOBIL.name, "sorge-getrennt-hinweis" + (bildschirm ? "" : "-stift") + ".png"), fullPage: false });
  protokoll.screenshots++;
  await klickeEtikett(page, '#anmeldung input[data-pfad="andererElternteilEinverstanden"]');
  ok("Getrennte Eltern (sorge, " + modus + "): mit Zustimmung verschwindet der Kasten", !(await sichtbarIn(page, "#anmeldung [data-zweiter-elternteil]")) && (await kaesten(page)).filter((x) => x.label === "Achtung").length === 0, "");
  await klickeEtikett(page, '#anmeldung input[data-pfad="andererElternteilEinverstanden"]');
  ok("Getrennte Eltern (sorge, " + modus + "): ohne Zustimmung ist er wieder da", await sichtbarIn(page, "#anmeldung [data-zweiter-elternteil]"), "");
  const su = await geheBis(page, "unterschriften");
  const box2 = await page.evaluate(() => {
    const e = document.querySelector("#anmeldung [data-zweiter-elternteil]");
    return { sichtbar: !!e && e.checkVisibility(), text: e ? e.innerText.replace(/\s+/g, " ").trim() : "" };
  });
  const auf2 = await kaesten(page);
  ok("Getrennte Eltern (unterschriften, " + modus + "): ein Kasten mit demselben Text steht vor den Unterschriftsfeldern", su.schritt === "unterschriften" && box2.sichtbar && box2.text === "Achtung " + satz && auf2.filter((x) => x.label === "Achtung").length === 1, box2.text + " | Kästen: " + auf2.length);
  // Die Felder der Seite: Modus „bildschirm“: Elternteil, anderer Elternteil, Kind (die letzten beiden freiwillig); Modus „stift“: nur der Elternteil
  const felderGetrennt = await page.$$eval("#anmeldung .anm-unterschrift", (l) => l.map((e) => ({ wer: e.getAttribute("data-unterschrift"), titel: (e.querySelector(".anm-unterschrift__titel") || { textContent: "" }).textContent.replace(/\s+/g, " ").trim(), zusatz: ((e.querySelector('[id$="-zusatz"]') || { textContent: "" }).textContent || "").replace(/\s+/g, " ").trim() })));
  if (bildschirm) {
    ok("Getrennte Eltern (unterschriften, Modus bildschirm): drei Felder: Elternteil, anderer Elternteil und Kind (in dieser Reihenfolge)", felderGetrennt.map((f) => f.wer).join(",") === "sorgeberechtigte,sorgeberechtigte_2,spieler", felderGetrennt.map((f) => f.wer).join(","));
    const zweites = felderGetrennt.find((f) => f.wer === "sorgeberechtigte_2") || {};
    ok("Getrennte Eltern (unterschriften, Modus bildschirm): Feld des anderen Elternteils heißt „Unterschrift: der andere Elternteil“, mit Hinweis ohne „freiwillig“ im Titel", zweites.titel === "Unterschrift: der andere Elternteil" && zweites.zusatz === "Der andere Elternteil unterschreibt hier selbst. Oder später mit Stift im Ausdruck.", JSON.stringify(zweites));
  } else {
    ok("Getrennte Eltern (unterschriften, Modus stift): nur ein Unterschriftsfeld (der Elternteil), kein Feld für den anderen Elternteil und das Kind", felderGetrennt.map((f) => f.wer).join(",") === "sorgeberechtigte", felderGetrennt.map((f) => f.wer).join(","));
  }
  // Bis zum PDF: die Stelle "zweiter Elternteil (nötig)" steht im fertigen Dokument (Stift-Markierung oder, mit seiner Unterschrift, sein Bild).
  await unterschreiben(page, { touch: false });
  await klickeWeiter(page, su);
  const pr = await kaesten(page);
  // P3 Teil b (S2): Die Prüfseite zeigt keine Hinweise. Der Hinweis des Regelwerks hat keine Seite mit einer Frage (der Kasten auf 'sorge/recht' und
  // 'unterschriften' sagt dasselbe); er steht offen auf der Fertig-Seite.
  ok("Getrennte Eltern (pruefen, " + modus + "): die Prüfseite zeigt keinen Hinweiskasten (P3 Teil b)", pr.length === 0, JSON.stringify(pr.map((x) => x.key || x.label)));
  await klickeWeiter(page, await stand(page));
  const ctx = { name: "getrennte-eltern" + (bildschirm ? "" : "-stift"), vp: MOBIL };
  const daten = await ergebnisPruefen(page, ctx, dateien);
  const fertigKaesten = daten ? await kaesten(page) : [];
  ok("Getrennte Eltern (fertig, " + modus + "): der Hinweis des Regelwerks 'Bitte fragen Sie den anderen Elternteil …' steht offen auf der Fertig-Seite", fertigKaesten.some((x) => x.key === "getrennt_zustimmung" && x.label === "Achtung"), JSON.stringify(fertigKaesten.map((x) => x.key || x.label)));
  if (daten) {
    const a = daten.attrappe && daten.attrappe.a;
    ok("Getrennte Eltern (" + modus + "): a.sorge = getrennt_bei_mir und andererElternteilEinverstanden ist nicht wahr", !!a && a.sorge === "getrennt_bei_mir" && a.andererElternteilEinverstanden !== true, a && JSON.stringify({ sorge: a.sorge, einverstanden: a.andererElternteilEinverstanden }));
    const bilderAn = daten.attrappe ? Object.keys(daten.attrappe.unterschriften || {}).sort().join(",") : "";
    if (daten.attrappe) ok("Getrennte Eltern (" + modus + "): an den PDF-Baustein gehen die Bilder der Felder (" + (bildschirm ? "sorgeberechtigte, sorgeberechtigte_2, spieler" : "sorgeberechtigte") + ")", bilderAn === (bildschirm ? "sorgeberechtigte,sorgeberechtigte_2,spieler" : "sorgeberechtigte"), bilderAn);
    const pdf = await pdfHerunterladenUndPruefen(browser, server, page, "Getrennte Eltern (" + modus + ")", daten, { satzungOffen: false });
    if (pdf) {
      const t = ohneLeer(pdfText(pdf.pfad));
      if (bildschirm) {
        ok("Getrennte Eltern (Modus bildschirm): der andere Elternteil hat unterschrieben, im PDF steht keine Stift-Markierung „zweiter Elternteil (nötig)“; Teil A nennt die Zeile nicht mehr (nur noch Blätter mit Stift, D1)", !t.includes("zweiter Elternteil (nötig)") && !t.includes("Der zweite Elternteil (nötig)"), "");
        ok("Getrennte Eltern (Modus bildschirm): Teil A: alles am Bildschirm unterschrieben, Laufzettel: Satz zu den Blättern des Verbands ohne Ausnahme", t.includes("Sie haben alles am Bildschirm unterschrieben.") && t.includes("Alle Unterschriften der Familie sind am Bildschirm geleistet, auch auf den Blättern des Verbands (Entscheidung der Jugendleitung vom 11.10.2026)."), "");
      } else {
        ok("Getrennte Eltern (Modus stift): das PDF markiert die Stelle „zweiter Elternteil (nötig)“", t.includes("zweiter Elternteil (nötig)"), "");
      }
    }
  }
  await page.close();

  // Modus „bildschirm“: Der andere Elternteil lässt sein Feld leer. Weiter geht trotzdem; im PDF steht die Markierung, der Laufzettel nennt es.
  if (bildschirm) {
    const p3 = await seiteMitBeispiel(browser, server, MOBIL, "getrennt-ohne-zweite-unterschrift", "kind-neu", null);
    await geheBis(p3, "sorge", "recht");
    await klickeEtikett(p3, '#anmeldung input[data-pfad="sorge"][data-wert="getrennt_bei_mir"]');
    const su3 = await geheBis(p3, "unterschriften");
    await unterschreiben(p3, { touch: false, nur: ["sorgeberechtigte"] });
    const r3 = await klickeWeiter(p3, su3);
    ok("Getrennte Eltern (Modus bildschirm): ohne die freiwilligen Felder (anderer Elternteil, Kind) geht es weiter, keine Fehlermeldung", r3.gewechselt && r3.fehler.length === 0, JSON.stringify(r3));
    const zeilen3 = await pruefZeilen(p3);
    const zeile = (name) => zeilen3.find((z) => z.label === name) || {};
    ok("Getrennte Eltern (Modus bildschirm): die Prüfseite sagt beim anderen Elternteil „Nicht am Bildschirm – mit Stift im Ausdruck“, beim Kind „Nicht unterschrieben (freiwillig)“", zeile("Unterschrift: der andere Elternteil").wert === "Nicht am Bildschirm – mit Stift im Ausdruck" && zeile("Unterschrift von Mila").wert === "Nicht unterschrieben (freiwillig)", JSON.stringify(zeilen3.filter((z) => /Unterschrift/.test(z.label))));
    await klickeWeiter(p3, await stand(p3));
    const ctx3 = { name: "getrennte-eltern-ohne-zweite", vp: MOBIL };
    const daten3 = await ergebnisPruefen(p3, ctx3, dateien);
    if (daten3) {
      const fertigText = await p3.$eval("#anmeldung", (e) => e.innerText.replace(/\s+/g, " "));
      ok("Getrennte Eltern (Modus bildschirm): die Fertig-Seite sagt „Einige Unterschriften fehlen noch.“ (nicht „alles am Bildschirm unterschrieben“)", fertigText.includes("Einige Unterschriften fehlen noch. Das sind die blauen Markierungen im PDF.") && !fertigText.includes("Sie haben alles am Bildschirm unterschrieben."), fertigText.slice(fertigText.indexOf("So geht es weiter"), fertigText.indexOf("So geht es weiter") + 200));
      // U-16: Die offene Stelle liegt im Aufnahmeantrag, der mit der Datei geht: Foto oder Scan in derselben E-Mail (Fertig-Seite und Teil A)
      ok("Getrennte Eltern (Modus bildschirm, U-16): die Fertig-Seite sagt hinter „Einige Unterschriften fehlen noch.“: „Fotografieren oder scannen Sie die unterschriebenen Blätter. Schicken Sie sie in derselben E-Mail mit.“", fertigText.includes("Einige Unterschriften fehlen noch. Das sind die blauen Markierungen im PDF. Unterschreiben Sie dort mit Stift. Was Sie ausdrucken müssen, steht in Teil A der Datei. Fotografieren oder scannen Sie die unterschriebenen Blätter. Schicken Sie sie in derselben E-Mail mit."), fertigText.slice(fertigText.indexOf("So geht es weiter"), fertigText.indexOf("So geht es weiter") + 420));
      const pdf3 = await pdfHerunterladenUndPruefen(browser, server, p3, "Getrennte Eltern (ohne Unterschrift des anderen Elternteils)", daten3, { satzungOffen: false });
      if (pdf3) {
        const t3 = ohneLeer(pdfText(pdf3.pfad));
        ok("Getrennte Eltern (Modus bildschirm): im PDF steht die Markierung „zweiter Elternteil (nötig)“ und der Laufzettel nennt das leere Feld", t3.includes("zweiter Elternteil (nötig)") && t3.includes("Die Unterschrift des zweiten Elternteils wurde am Bildschirm nicht geleistet. Die Unterschrift steht deshalb als Stift-Markierung im Formular."), "");
        ok("Getrennte Eltern (Modus bildschirm): Teil A: „Einige Unterschriften fehlen noch.“ und der Aufnahmeantrag steht unter „Ausdrucken müssen Sie nur:“", t3.includes("Einige Unterschriften fehlen noch. Unterschreiben Sie diese an den blauen Markierungen mit Stift.") && /Ausdrucken müssen Sie nur:.*Aufnahmeantrag/.test(t3), "");
        // Das Feld des Kindes blieb auch leer: Der Antrag auf Spielerlaubnis bleibt ohne Markierung für das Kind und steht nicht unter „Ausdrucken müssen Sie nur:“; der Laufzettel nennt beides
        const druck3 = (t3.match(/Ausdrucken müssen Sie nur:(.*?)Schicken Sie die Datei per E-Mail/) || [])[1] || "";
        ok("Getrennte Eltern (Modus bildschirm, U-16): Teil A: nach „Ausdrucken müssen Sie nur:“ und vor dem Schritt zur E-Mail steht „Fotografieren oder scannen Sie die unterschriebenen Blätter. Schicken Sie sie in derselben E-Mail mit.“", druck3.includes("Fotografieren oder scannen Sie die unterschriebenen Blätter. Schicken Sie sie in derselben E-Mail mit.") && t3.indexOf("Fotografieren oder scannen Sie die unterschriebenen Blätter. Schicken Sie sie in derselben E-Mail mit.") < t3.indexOf("Schicken Sie die Datei per E-Mail"), druck3.slice(-160));
        ok("Getrennte Eltern (Modus bildschirm): der Antrag auf Spielerlaubnis steht nicht unter „Ausdrucken müssen Sie nur:“, das leere Feld des Kindes bekommt keine Markierung", !/Antrag auf Spielerlaubnis/.test(druck3) && (pdfText(pdf3.pfad, pdfAntragSeite(pdf3.pfad)).match(/Hier mit Stift unterschreiben/g) || []).length === 1, druck3.slice(0, 200));
        ok("Getrennte Eltern (Modus bildschirm): der Laufzettel sagt „… außer an den Stift-Stellen … und an der Unterschriftszeile des Kindes …“ und „Das Kind hat den Antrag nicht unterschrieben. …“", t3.includes(LAUFZETTEL_HFV_REST_KIND) && t3.includes(LAUFZETTEL_KIND_LEER), "");
      }
    }
    await p3.close();
  }

  // Mit Zustimmung: kein Hinweis auf 'unterschriften'.
  const p2 = await seiteMitBeispiel(browser, server, MOBIL, "getrennt-einverstanden", "kind-neu", null);
  await geheBis(p2, "sorge", "recht");
  await klickeEtikett(p2, '#anmeldung input[data-pfad="sorge"][data-wert="getrennt_bei_mir"]');
  await klickeEtikett(p2, '#anmeldung input[data-pfad="andererElternteilEinverstanden"]');
  await geheBis(p2, "unterschriften");
  ok("Getrennte Eltern (" + modus + "): ist der andere Elternteil einverstanden, steht auch auf 'unterschriften' kein Hinweis und kein Feld für ihn", !(await sichtbarIn(p2, "#anmeldung [data-zweiter-elternteil]")) && !(await sichtbarIn(p2, '#anmeldung .anm-unterschrift[data-unterschrift="sorgeberechtigte_2"]')), "");
  await p2.close();
}

// ---------- M9 (11.10.2026): Schalter unterschriftHfv ----------

const LAUFZETTEL_HFV_ALLE = "Alle Unterschriften der Familie sind am Bildschirm geleistet, auch auf den Blättern des Verbands (Entscheidung der Jugendleitung vom 11.10.2026). Verlangt der Verband ein Original mit Stift, das Blatt ausdrucken und unterschreiben lassen.";
// Runde 2: leeres Feld des Kindes: Der Antrag auf Spielerlaubnis bleibt ohne Markierung, das Passwesen entscheidet
const LAUFZETTEL_KIND_LEER = "Das Kind hat den Antrag nicht unterschrieben. Das Passwesen entscheidet, ob das nötig ist.";
const LAUFZETTEL_HFV_KIND = "Die Unterschriften der Familie sind am Bildschirm geleistet, auch auf den Blättern des Verbands (Entscheidung der Jugendleitung vom 11.10.2026), außer an der Unterschriftszeile des Kindes im Antrag auf Spielerlaubnis. Verlangt der Verband ein Original mit Stift, das Blatt ausdrucken und unterschreiben lassen.";
const LAUFZETTEL_HFV_REST_KIND = "Die Unterschriften der Familie sind am Bildschirm geleistet, auch auf den Blättern des Verbands (Entscheidung der Jugendleitung vom 11.10.2026), außer an den Stift-Stellen (siehe „Hinweise zur Datei“) und an der Unterschriftszeile des Kindes im Antrag auf Spielerlaubnis. Verlangt der Verband ein Original mit Stift, das Blatt ausdrucken und unterschreiben lassen.";

// Der Schritt „Unterschriften“ im Browser: Wahl, Felder (Kennung, Titel, Zusatz), Stift-Block, Frage zu den Blättern des Verbands
const unterschriftenDom = (page) =>
  page.evaluate(() => ({
    felder: Array.from(document.querySelectorAll("#anmeldung .anm-unterschrift")).map((f) => ({
      wer: f.getAttribute("data-unterschrift"),
      titel: (f.querySelector(".anm-unterschrift__titel") || { textContent: "" }).textContent.replace(/\s+/g, " ").trim(),
      zusatz: ((f.querySelector('[id$="-zusatz"]') || { textContent: "" }).textContent || "").replace(/\s+/g, " ").trim(),
    })),
    wahl: Array.from(document.querySelectorAll('#anmeldung input[data-pfad="unterschriftWeg"]')).map((i) => ({ wert: i.getAttribute("data-wert"), text: i.closest("label").innerText.replace(/\s+/g, " ").trim() })),
    stiftTitel: Array.from(document.querySelectorAll("#anmeldung h3")).some((h) => h.textContent.trim() === "Diese Seiten unterschreiben Sie mit Stift"),
    hfvFrage: !!document.querySelector('#anmeldung input[data-pfad="hfvUnterschrift"]'),
    vereinssicht: Array.from(document.querySelectorAll("#anmeldung .anm-vereinshinweis li")).map((li) => li.textContent.replace(/\s+/g, " ").trim()),
  }));

// Läuft ein Beispiel bis „fertig“, lädt das PDF herunter und gibt Text, Seitenzahl und die Bilder auf der Seite des Antrags auf Spielerlaubnis zurück
// optionen.nachweise: im Schritt „nachweise“ für jede Unterlage eine Datei hochladen (dann gibt es keine Attest-Vorlage im PDF); optionen.name: Zusatz im Namen
async function modusLauf(browser, server, dateien, id, nur, optionen) {
  const opt = optionen || {};
  const zusatz = opt.name ? "-" + opt.name : "";
  const page = await neueSeite(browser, server, MOBIL, "modus-" + (server.hfv || "bildschirm") + "-" + id + zusatz);
  const ctx = neuerKontext({ name: "modus-" + id + zusatz, vp: MOBIL, modus: "beispiel", gesehen: gesehenFuer(MOBIL), touch: true, axeNeu: false, dateien });
  ctx.nur = nur;
  await ladeBeispielPerKnopf(page, id);
  const dom = {};
  ctx.vorWeiter = async (p, st) => {
    if (st.schritt === "nachweise" && opt.nachweise) await nachweiseHochladen(p, ctx);
    if (st.schritt === "unterschriften") dom.unterschriften = await unterschriftenDom(p);
    if (st.schritt === "pruefen") dom.pruefen = await pruefZeilen(p);
  };
  const r = await laufe(page, ctx);
  const erreicht = r.besucht[r.besucht.length - 1].startsWith("fertig");
  const daten = erreicht ? await ergebnisPruefen(page, ctx, dateien) : null;
  const modus = "Modus " + (server.hfv || "bildschirm") + ", " + id + (opt.name ? " (" + opt.name + ")" : "");
  ok(modus + ": bis 'fertig' durchgeklickt, Datei erstellt", erreicht && !!daten, r.besucht.length + " Seiten");
  let pdf = null;
  let fertigText = "";
  if (daten) {
    fertigText = await page.$eval("#anmeldung", (e) => e.innerText.replace(/\s+/g, " "));
    pdf = await pdfHerunterladenUndPruefen(browser, server, page, modus, daten, { satzungOffen: false });
  }
  ok(modus + ": keine Fehler in der Konsole", page.__st.konsole.length === 0, page.__st.konsole.slice(0, 3).join(" | "));
  await page.close();
  return { daten, pdf, dom, fertigText, text: pdf ? ohneLeer(pdfText(pdf.pfad)) : "" };
}

// Schalter unterschriftHfv in beiden Modi. Hauptserver: Stand der Daten („bildschirm“); zweiter Server: Test-Option hfv = "stift".
async function pruefeUnterschriftenModus(browser, server, dateien) {
  console.log("\n=== M9: Schalter unterschriftHfv – alles am Bildschirm, auch die Blätter des Verbands ===");
  const wb = await ladeWoerterbuch();
  const T = (pfad) => pfad.split(".").reduce((x, sch) => (x === undefined || x === null ? undefined : x[sch]), wb);
  ok("Schalter: der Testserver liefert den Stand der Daten (data/anmeldung.json › unterschriftHfv.wert = bildschirm)", server.hfv === "bildschirm" && server.konfig.anmeldung.unterschriftHfv.wert === "bildschirm", String(server.hfv));
  const serverStift = await starteTestserver({ hfv: "stift" });
  try {
    ok("Schalter: der zweite Testserver legt ihn per Test-Option auf „stift“ um (die Datei bleibt unverändert)", serverStift.hfv === "stift" && server.konfig.anmeldung.unterschriftHfv.wert === "bildschirm", String(serverStift.hfv));

    // ---------- Modus bildschirm, Kind neu: Felder, Texte, Weiter ohne das freiwillige Feld ----------
    {
      const page = await seiteMitBeispiel(browser, server, MOBIL, "modus-bildschirm-felder", "kind-neu", null);
      const su = await geheBis(page, "unterschriften");
      ok("Modus bildschirm: Schritt 'unterschriften' erreicht", su.schritt === "unterschriften", su.schritt);
      const d = await unterschriftenDom(page);
      ok("Modus bildschirm: zwei Felder: Elternteil und Kind (Spielerin oder Spieler), in dieser Reihenfolge", d.felder.map((f) => f.wer).join(",") === "sorgeberechtigte,spieler", d.felder.map((f) => f.wer).join(","));
      const kind = d.felder.find((f) => f.wer === "spieler") || {};
      ok("Modus bildschirm: das Feld des Kindes heißt „Unterschrift von Mila (freiwillig)“", kind.titel === "Unterschrift von Mila (freiwillig)", kind.titel);
      ok("Modus bildschirm: Hinweis am Feld nur noch „Kann Ihr Kind schreiben? Dann unterschreibt es selbst.“ (ohne den Satz zum Ausdruck mit Stift)", kind.zusatz === "Kann Ihr Kind schreiben? Dann unterschreibt es selbst." && !/Stift|Ausdruck/.test(kind.zusatz), kind.zusatz);
      ok("Modus bildschirm: die Wahl heißt „Am Bildschirm“ (ohne „wo es erlaubt ist“), der Hinweis nennt auch die Blätter für den Fußball-Verband", d.wahl[0] && d.wahl[0].wert === "bildschirm" && d.wahl[0].text === "Am Bildschirm Mit dem Finger, auch für den Fußball-Verband." && !/wo es erlaubt ist/.test(d.wahl.map((w) => w.text).join(" ")), JSON.stringify(d.wahl));
      ok("Modus bildschirm: kein Block „Diese Seiten unterschreiben Sie mit Stift“ und keine Frage „Wann unterschreiben Sie diese Blätter?“", !d.stiftTitel && !d.hfvFrage, JSON.stringify({ stiftTitel: d.stiftTitel, hfvFrage: d.hfvFrage }));
      ok("Modus bildschirm: Sicht des Vereins nennt den Schalter bei den Blättern des Verbands", d.vereinssicht.some((z) => /^hfv_antrag: nicht_erlaubt \(Schalter unterschriftHfv: bildschirm\)/.test(z)) && d.vereinssicht.some((z) => /^aufnahmeantrag: erlaubt – /.test(z)), d.vereinssicht.map((z) => z.slice(0, 60)).join(" | "));
      // Nur der Elternteil unterschreibt: Weiter geht trotzdem (das Feld des Kindes ist freiwillig)
      await unterschreiben(page, { touch: false, nur: ["sorgeberechtigte"] });
      const r = await klickeWeiter(page, su);
      ok("Modus bildschirm: nur der Elternteil unterschrieben – Weiter geht, das Feld des Kindes ist freiwillig", r.gewechselt && r.fehler.length === 0, JSON.stringify(r));
      // Ganz ohne Unterschrift des Elternteils bleibt es eine Pflicht
      const p2 = await seiteMitBeispiel(browser, server, MOBIL, "modus-bildschirm-pflicht", "kind-neu", null);
      const su2 = await geheBis(p2, "unterschriften");
      await haekchenSatzung(p2);
      await unterschreiben(p2, { touch: false, nur: ["spieler"] });
      const r2 = await klickeWeiter(p2, su2);
      ok("Modus bildschirm: nur das Kind unterschrieben – Weiter geht nicht, die Unterschrift des Elternteils ist Pflicht", !r2.gewechselt && r2.fehler.some((f) => /unterschreiben/.test(f)), JSON.stringify(r2));
      await p2.close();
      const zeilen = await pruefZeilen(page);
      const zeile = (name) => zeilen.find((z) => z.label === name) || {};
      ok("Modus bildschirm: Prüfseite: Wahl „Am Bildschirm“, das Kind „Nicht unterschrieben (freiwillig)“ (nicht „mit Stift“), keine Zeile „Blätter für den Fußball-Verband“", zeile("Unterschrift").wert === "Am Bildschirm" && zeile("Unterschrift von Mila").wert === "Nicht unterschrieben (freiwillig)" && !/Stift/.test(zeile("Unterschrift von Mila").wert) && !zeilen.some((z) => z.label === "Blätter für den Fußball-Verband"), JSON.stringify(zeilen.filter((z) => /Unterschrift|Blätter/.test(z.label))));
      await page.screenshot({ path: path.join(AUSGABE, MOBIL.name, "pruefen-unterschriften-kind-leer.png"), fullPage: true });
      protokoll.screenshots++;
      await klickeWeiter(page, await stand(page));
      const ctx = { name: "modus-bildschirm-kind-leer", vp: MOBIL };
      const daten = await ergebnisPruefen(page, ctx, dateien);
      if (daten) {
        const text = await page.$eval("#anmeldung", (e) => e.innerText.replace(/\s+/g, " "));
        ok("Modus bildschirm: Fertig-Seite (Kind ohne Unterschrift): „Sie haben alles am Bildschirm unterschrieben.“, nicht „Einige Unterschriften fehlen noch“ (die Zeile des Kindes bleibt ohne Markierung)", text.includes("Sie haben alles am Bildschirm unterschrieben. Was Sie ausdrucken müssen, steht in Teil A der Datei.") && !text.includes("Einige Unterschriften fehlen noch") && !text.includes("blauen Markierungen") && !text.includes("beim ersten Training"), text.slice(text.indexOf("So geht es weiter"), text.indexOf("So geht es weiter") + 220));
        const pdfOhne = await pdfHerunterladenUndPruefen(browser, server, page, "Modus bildschirm, Kind ohne Unterschrift", daten, { satzungOffen: false });
        if (pdfOhne) {
          const t = ohneLeer(pdfText(pdfOhne.pfad));
          const antrag = pdfBilderAntrag(pdfOhne.pfad);
          // Die Nachweise fehlen in diesem Lauf: Die Attest-Vorlage steht unter „Ausdrucken müssen Sie nur:“, der Antrag auf Spielerlaubnis nie.
          const druckListe = (t.match(/Ausdrucken müssen Sie nur:(.*?)Schicken Sie die Datei per E-Mail/) || [])[1] || "";
          ok("Modus bildschirm, Kind ohne Unterschrift: Teil A „Sie haben alles am Bildschirm unterschrieben.“, unter „Ausdrucken müssen Sie nur:“ nur die Attest-Vorlage, nie der Antrag auf Spielerlaubnis", t.includes("Sie haben alles am Bildschirm unterschrieben.") && !t.includes("Einige Unterschriften fehlen noch") && /Ärztliche Bescheinigung \(Attest\)/.test(druckListe) && !/Antrag auf Spielerlaubnis/.test(druckListe), druckListe.slice(0, 160));
          ok("Modus bildschirm, Kind ohne Unterschrift: Laufzettel „Das Kind hat den Antrag nicht unterschrieben. Das Passwesen entscheidet, ob das nötig ist.“, kein Hinweis „Stift-Markierung“ zum Antrag", t.includes(LAUFZETTEL_KIND_LEER) && !t.includes("Antrag auf Spielerlaubnis Seite 1: Die Unterschrift der Spielerin oder des Spielers wurde am Bildschirm nicht geleistet"), "");
          ok("Modus bildschirm, Kind ohne Unterschrift: Laufzettel sagt „… außer an der Unterschriftszeile des Kindes im Antrag auf Spielerlaubnis“, nicht „Alle Unterschriften … geleistet“", t.includes(LAUFZETTEL_HFV_KIND) && !t.includes("Alle Unterschriften der Familie sind am Bildschirm geleistet") && !t.includes("außer an den Stift-Stellen"), "");
          const antragNr = pdfAntragSeite(pdfOhne.pfad);
          ok("Modus bildschirm, Kind ohne Unterschrift: Antrag auf Spielerlaubnis Seite 1 trägt nur die Markierung des Vereins, keine für das Kind", antragNr > 0 && (pdfText(pdfOhne.pfad, antragNr).match(/Hier mit Stift unterschreiben/g) || []).length === 1, "Seite " + antragNr);
          // P3 Teil b (D1): Teil A nennt unter „Wo unterschreiben Sie?“ nur noch Blätter mit Stift. Die leere, freiwillige Zeile des Kindes braucht keine Zeile
          // (nichts zu tun; der Laufzettel sagt es dem Verein); ist alles am Bildschirm erledigt, entfällt der ganze Abschnitt.
          ok("Modus bildschirm, Kind ohne Unterschrift: Teil A ohne Abschnitt „Wo unterschreiben Sie?“ (alles am Bildschirm erledigt, die Zeile des Kindes ist freiwillig und braucht keine Zeile)", !t.includes("Wo unterschreiben Sie?") && !/Nicht unterschrieben \(freiwillig\)/.test(t) && !/Mit Stift, nach dem Ausdrucken/.test(t), "");
          PDF_ERGEBNISSE.set("modus-bildschirm-kind-leer", Object.assign({}, pdfOhne, { antrag }));
        }
      }
      await page.close();
    }

    // ---------- Karneval Kind (keine Blätter des Verbands): die Wahl nennt nur Vereinsunterlagen, kein Feld für das Kind ----------
    {
      const page = await seiteMitBeispiel(browser, server, MOBIL, "modus-bildschirm-karneval", "karneval-kind", null);
      const su = await geheBis(page, "unterschriften");
      const d = await unterschriftenDom(page);
      ok("Modus bildschirm, Karneval Kind (keine Blätter des Verbands): ein Feld (Elternteil), die Wahl „Am Bildschirm“ sagt nur „mit dem Finger“, nennt nicht den Fußball-Verband", su.schritt === "unterschriften" && d.felder.map((f) => f.wer).join(",") === "sorgeberechtigte" && d.wahl[0].text === "Am Bildschirm Sie unterschreiben hier mit dem Finger." && !/Fußball-Verband/.test(d.wahl[0].text), JSON.stringify({ felder: d.felder.map((f) => f.wer), wahl: d.wahl[0] && d.wahl[0].text }));
      await page.close();
    }

    // ---------- Beispiele durchlaufen: Modus bildschirm (Stand der Daten) und Modus stift (Test-Option) ----------
    const lauf = {};
    for (const [name, srv] of [["bildschirm", server], ["stift", serverStift]]) {
      for (const id of ["kind-neu", "wechsel-hessen", "herren-wechsel"]) lauf[name + "|" + id] = await modusLauf(browser, srv, dateien, id);
    }
    for (const id of ["kind-neu", "wechsel-hessen", "herren-wechsel"]) {
      const b = lauf["bildschirm|" + id];
      const st = lauf["stift|" + id];
      const kind = id !== "herren-wechsel";
      // Modus bildschirm: alles am Bildschirm
      if (b.pdf) {
        ok("Modus bildschirm, " + id + ": Teil A „Sie haben alles am Bildschirm unterschrieben.“, Laufzettel: Satz zu den Blättern des Verbands, nichts zum ersten Training", b.text.includes("Sie haben alles am Bildschirm unterschrieben.") && b.text.includes(LAUFZETTEL_HFV_ALLE) && !b.text.includes("beim ersten Training mit Stift") && !b.text.includes("Der Verein bringt sie ausgedruckt mit"), "");
        ok("Modus bildschirm, " + id + ": Fertig-Seite „Sie haben alles am Bildschirm unterschrieben. Was Sie ausdrucken müssen, steht in Teil A der Datei.“", b.fertigText.includes("Sie haben alles am Bildschirm unterschrieben. Was Sie ausdrucken müssen, steht in Teil A der Datei.") && !b.fertigText.includes("beim ersten Training"), "");
        const felder = b.dom.unterschriften ? b.dom.unterschriften.felder.map((f) => f.wer).join(",") : "";
        ok("Modus bildschirm, " + id + ": Felder im Schritt „Unterschriften“: " + (kind ? "Elternteil und Kind" : "nur das Mitglied"), felder === (kind ? "sorgeberechtigte,spieler" : "mitglied"), felder);
        ok("Modus bildschirm, " + id + ": das PDF zählt mehr Bilder auf dem Antrag auf Spielerlaubnis als im Modus stift (Unterschriften der Familie statt Markierungen)", st.pdf ? pdfBilderAntrag(b.pdf.pfad).length > pdfBilderAntrag(st.pdf.pfad).length : false, st.pdf ? pdfBilderAntrag(b.pdf.pfad).length + " gegen " + pdfBilderAntrag(st.pdf.pfad).length : "");
      }
      // Modus stift: wie bis 11.10.2026
      if (st.pdf) {
        ok("Modus stift, " + id + ": Teil A nennt die Blätter des Verbands mit Stift beim ersten Training (Wahl der Familie „training“), kein Satz des Modus bildschirm", /Diese unterschreiben Sie beim ersten Training mit Stift/.test(st.text) && !st.text.includes("Sie haben alles am Bildschirm unterschrieben.") && !st.text.includes("Alle Unterschriften der Familie sind am Bildschirm geleistet"), "");
        ok("Modus stift, " + id + ": Fertig-Seite „Die Blätter für den Fußball-Verband unterschreiben Sie beim ersten Training mit Stift.“", st.fertigText.includes("Die Blätter für den Fußball-Verband unterschreiben Sie beim ersten Training mit Stift."), "");
        const d = st.dom.unterschriften;
        ok("Modus stift, " + id + ": Felder im Schritt „Unterschriften“: nur " + (kind ? "der Elternteil" : "das Mitglied") + ", Wahl „Am Bildschirm, wo es erlaubt ist“, Stift-Block mit Frage „Wann unterschreiben Sie diese Blätter?“",
          !!d && d.felder.map((f) => f.wer).join(",") === (kind ? "sorgeberechtigte" : "mitglied") && d.wahl[0].text.startsWith("Am Bildschirm, wo es erlaubt ist") && d.stiftTitel && d.hfvFrage, d ? JSON.stringify({ felder: d.felder.map((f) => f.wer), wahl: d.wahl[0].text, stift: d.stiftTitel, frage: d.hfvFrage }) : "");
        ok("Modus stift, " + id + ": Prüfseite zeigt die Zeile „Blätter für den Fußball-Verband: Beim ersten Training“", (st.dom.pruefen || []).some((z) => z.label === "Blätter für den Fußball-Verband" && z.wert === "Beim ersten Training") && (st.dom.pruefen || []).some((z) => z.label === "Unterschrift" && z.wert === "Am Bildschirm, wo es erlaubt ist"), JSON.stringify((st.dom.pruefen || []).filter((z) => /Unterschrift|Blätter/.test(z.label))));
        ok("Modus stift, " + id + ": Sicht des Vereins nennt den Schalter bei den Blättern des Verbands", !!d && d.vereinssicht.some((z) => /^hfv_antrag: nicht_erlaubt \(Schalter unterschriftHfv: stift\)/.test(z)), d ? d.vereinssicht.map((z) => z.slice(0, 60)).join(" | ") : "");
      }
    }
    // ---------- Modus bildschirm, Kind neu, Feld des Kindes leer, alle Nachweise hochgeladen: Teil A „Sie müssen nichts ausdrucken.“ (Nachbesserung Runde 2) ----------
    {
      const ganz = lauf["bildschirm|kind-neu"];
      const leer = await modusLauf(browser, server, dateien, "kind-neu", ["sorgeberechtigte"], { nachweise: true, name: "leer-nachweise" });
      const feld = leer.dom.unterschriften ? leer.dom.unterschriften.felder.map((f) => f.wer).join(",") : "";
      ok("Modus bildschirm, Kind neu (Feld des Kindes leer, Nachweise hochgeladen): beide Felder da, nur das des Elternteils gezeichnet", feld === "sorgeberechtigte,spieler", feld);
      if (leer.pdf) {
        const t = leer.text;
        ok("Modus bildschirm, Kind neu (leer, Nachweise hochgeladen): Teil A „Sie haben alles am Bildschirm unterschrieben. Sie müssen nichts ausdrucken.“, kein „Ausdrucken müssen Sie nur“", t.includes("Sie haben alles am Bildschirm unterschrieben. Sie müssen nichts ausdrucken.") && !t.includes("Ausdrucken müssen Sie nur") && !t.includes("Einige Unterschriften fehlen noch"), "");
        ok("Modus bildschirm, Kind neu (leer, Nachweise hochgeladen): keine Attest-Vorlage im PDF, der Antrag steht nicht in einer Liste zum Ausdrucken", !t.includes("Ärztliche Bescheinigung (Attest) steht auf Seite") && !/Ausdrucken müssen Sie nur/.test(t), "");
        ok("Modus bildschirm, Kind neu (leer, Nachweise hochgeladen): Laufzettel „Das Kind hat den Antrag nicht unterschrieben. Das Passwesen entscheidet, ob das nötig ist.“ und der Satz zu den Blättern des Verbands „… außer an der Unterschriftszeile des Kindes …“", t.includes(LAUFZETTEL_KIND_LEER) && t.includes(LAUFZETTEL_HFV_KIND) && !t.includes("Alle Unterschriften der Familie sind am Bildschirm geleistet"), "");
        ok("Modus bildschirm, Kind neu (leer, Nachweise hochgeladen): Fertig-Seite „Sie haben alles am Bildschirm unterschrieben.“", leer.fertigText.includes("Sie haben alles am Bildschirm unterschrieben. Was Sie ausdrucken müssen, steht in Teil A der Datei.") && !leer.fertigText.includes("Einige Unterschriften fehlen noch"), "");
        const nr = pdfAntragSeite(leer.pdf.pfad);
        // Ein Unterschriftsbild zählt bei pdfimages doppelt (Bild und Maske für die Durchsichtigkeit): hier nur die Bilder
        const nurBilder = (liste) => liste.filter((b) => b.typ === "image").length;
        const bilderLeer = nurBilder(pdfBilderAntrag(leer.pdf.pfad));
        const bilderGanz = ganz && ganz.pdf ? nurBilder(pdfBilderAntrag(ganz.pdf.pfad)) : -1;
        ok("Modus bildschirm, Kind neu (leer): Antrag auf Spielerlaubnis Seite 1 mit einem Bild weniger als mit Unterschrift des Kindes, nur die Markierung des Vereins, keine für das Kind", nr > 0 && bilderGanz > 0 && bilderLeer === bilderGanz - 1 && (pdfText(leer.pdf.pfad, nr).match(/Hier mit Stift unterschreiben/g) || []).length === 1, "Seite " + nr + ", Bilder " + bilderLeer + " gegen " + bilderGanz);
        PDF_ERGEBNISSE.set("modus-bildschirm-kind-leer-nachweise", Object.assign({}, leer.pdf, { antrag: pdfBilderAntrag(leer.pdf.pfad) }));
      }
    }
    // ---------- Modus bildschirm, Wechsel in Hessen (mit Abmeldung beim alten Verein), Feld des Kindes leer: Antrag ohne Markierung, Abmeldung mit Stift-Markierung ----------
    {
      const w = await modusLauf(browser, server, dateien, "wechsel-hessen", ["sorgeberechtigte"], { name: "kind-leer" });
      if (w.pdf) {
        const t = w.text;
        const antragNr = pdfAntragSeite(w.pdf.pfad);
        const abmeldungNr = pdfSeiteMit(w.pdf.pfad, /Formular zur Abmeldung der Spielberechtigung/);
        ok("Modus bildschirm, Wechsel Hessen (Feld des Kindes leer): das PDF hat den Antrag auf Spielerlaubnis und die Abmeldung beim alten Verein", antragNr > 0 && abmeldungNr > 0, "Antrag Seite " + antragNr + ", Abmeldung Seite " + abmeldungNr);
        ok("Modus bildschirm, Wechsel Hessen (Feld des Kindes leer): im Antrag nur die Markierung des Vereins, bei der Abmeldung die Markierung für das Kind", antragNr > 0 && abmeldungNr > 0 && markierungen(w.pdf.pfad, antragNr) === 1 && markierungen(w.pdf.pfad, abmeldungNr) === 1, "Antrag " + (antragNr ? markierungen(w.pdf.pfad, antragNr) : "?") + ", Abmeldung " + (abmeldungNr ? markierungen(w.pdf.pfad, abmeldungNr) : "?"));
        ok("Modus bildschirm, Wechsel Hessen (Feld des Kindes leer): Fertig-Seite „Einige Unterschriften fehlen noch.“ (wegen der Abmeldung), nicht „alles am Bildschirm unterschrieben“", w.fertigText.includes("Einige Unterschriften fehlen noch. Das sind die blauen Markierungen im PDF.") && !w.fertigText.includes("Sie haben alles am Bildschirm unterschrieben."), "");
        ok("Modus bildschirm, Wechsel Hessen (Feld des Kindes leer, U-16): kein Satz zu Foto oder Scan in derselben E-Mail, weder auf der Fertig-Seite noch in Teil A (die Abmeldung geht per Einschreiben an den alten Verein)", !w.fertigText.includes("Fotografieren oder scannen Sie die unterschriebenen Blätter") && !t.includes("Schicken Sie sie in derselben E-Mail mit"), "");
        const druckListe = (t.match(/Ausdrucken müssen Sie nur:(.*?)Schicken Sie die Datei per E-Mail/) || [])[1] || "";
        ok("Modus bildschirm, Wechsel Hessen (Feld des Kindes leer): Teil A „Einige Unterschriften fehlen noch.“, die Abmeldung mit Stift und Einschreiben, der Antrag nicht unter „Ausdrucken müssen Sie nur:“", t.includes("Einige Unterschriften fehlen noch. Unterschreiben Sie diese an den blauen Markierungen mit Stift.") && t.includes("Unterschreiben Sie es mit Stift. Schicken Sie es selbst als Einschreiben an den alten Verein.") && !/Antrag auf Spielerlaubnis/.test(druckListe), druckListe.slice(0, 160));
        ok("Modus bildschirm, Wechsel Hessen (Feld des Kindes leer): Laufzettel „… außer an den Stift-Stellen … und an der Unterschriftszeile des Kindes …“, „Das Kind hat den Antrag nicht unterschrieben. …“ und die Meldung zur Abmeldung", t.includes(LAUFZETTEL_HFV_REST_KIND) && t.includes(LAUFZETTEL_KIND_LEER) && t.includes("Abmeldung beim alten Verein Seite 1: Die Unterschrift der Spielerin oder des Spielers wurde am Bildschirm nicht geleistet (freiwillig)."), "");
      }
    }
    // Getrennt lebende Eltern ohne Einverständnis im Modus „stift“ (der Modus „bildschirm“ läuft in pruefeGetrennteEltern)
    await pruefeGetrennteEltern(browser, serverStift, dateien);
  } finally {
    await serverStift.stop();
  }
}

// Bilder auf der ersten Seite des Antrags auf Spielerlaubnis im fertigen PDF (Seite mit „Antrag auf Spielerlaubnis / Vereinswechsel“)
function pdfSeiteMit(pfad, muster) {
  const n = Number(pdfInfo(pfad).Pages);
  for (let i = 1; i <= n; i++) if (muster.test(pdfText(pfad, i))) return i;
  return 0;
}
const pdfAntragSeite = (pfad) => pdfSeiteMit(pfad, /Antrag auf Spielerlaubnis \/ Vereinswechsel/);
const markierungen = (pfad, seite) => (pdfText(pfad, seite).match(/Hier mit Stift unterschreiben/g) || []).length;
function pdfBilderAntrag(pfad) {
  const nr = pdfAntragSeite(pfad);
  return nr ? pdfBilder(pfad, nr) : [];
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
  // P3 Runde 2 (S7): Gilt eine Unterschrift nur für ein Blatt (n = 1), steht die Zeile direkt da („Diese Unterschrift gilt für: <Blatt>“, ein Absatz); ab zwei Blättern
  // (n ≥ 2) ist es der zugeklappte Bereich „Diese Unterschrift gilt für (n)“ mit einer Zeile je Blatt.
  const namen = await page.evaluate(() => {
    const norm = (e) => e.textContent.replace(/\s+/g, " ").trim();
    const felder = Array.from(document.querySelectorAll("#anmeldung .anm-unterschrift")).map((f) => {
      const g = f.querySelector(".anm-unterschrift__gilt");
      const liste = !!g && g.tagName === "DETAILS";
      const lis = liste ? Array.from(g.querySelectorAll(":scope > ul > li")) : [];
      return {
        wer: f.getAttribute("data-unterschrift"),
        art: g ? g.tagName.toLowerCase() : null,
        zu: liste && !g.open,
        summary: liste ? norm(g.querySelector(":scope > summary")) : null,
        punkte: lis.map(norm),
        sichtbarePunkte: lis.filter((e) => e.checkVisibility()).length,
        text: g ? norm(g) : "",
        sichtbar: !!g && g.checkVisibility(),
        kennzeichen: g ? g.getAttribute("data-gilt-fuer") : null,
        beschreibtGilt: !!g && !!g.id && (f.getAttribute("aria-describedby") || "").split(/\s+/).includes(g.id),
      };
    });
    return {
      felder,
      stift: Array.from(document.querySelectorAll("#anmeldung .anm-unterschriften ul.anm-liste-punkte li")).map((e) => e.textContent.replace(/\s+/g, " ").trim()),
    };
  });
  const GILT = "Diese Unterschrift gilt für";
  const mehrere = namen.felder.filter((f) => f.art === "details");
  const eines = namen.felder.filter((f) => f.art === "p");
  // der Blattname der Zeile mit einem Blatt: der Text hinter „Diese Unterschrift gilt für: “
  const einBlatt = (f) => f.text.slice((GILT + ": ").length);
  // B-1: Bei einem Blatt steht statt des Doppelpunkts im Blattnamen („Titel: Person“) ein Gedankenstrich; erlaubt sind beide Schreibweisen des Namens.
  const giltPunkte = [...mehrere.flatMap((f) => f.punkte), ...eines.map(einBlatt)];
  const fremd = [...giltPunkte, ...namen.stift].filter((n) => !erlaubteNamen.has(n) && ![...erlaubteNamen].some((e) => e.replace(": ", " \u2013 ") === n));
  ok("Papiernamen: 'Diese Unterschrift gilt für' (eine Zeile je Blatt) und die Liste der Stift-Blätter nennen nur Namen aus den Regeltexten (" + (giltPunkte.length + namen.stift.length) + " Namen)", giltPunkte.length > 0 && namen.stift.length > 0 && fremd.length === 0, fremd.join(" | ") || namen.stift.join(" | "));
  ok("'Diese Unterschrift gilt für {n} Blätter' (D-07) steht ab zwei Blättern zugeklappt über einer Liste mit einem Blatt je Zeile (n = Zahl der Zeilen), bei jedem Unterschriftsfeld mit mehreren Blättern (kein Satz mit Aufzählung, keine Zeile mit mehreren Namen)",
    mehrere.length > 0 && mehrere.every((f) => f.punkte.length >= 2 && f.summary === GILT + " " + f.punkte.length + " Blätter" && f.kennzeichen === String(f.punkte.length) && f.zu && f.sichtbarePunkte === 0 && f.beschreibtGilt) &&
      giltPunkte.every((n) => !/, /.test(n.replace(/\([^)]*\)/g, "")) && n.split(/\s+/).length <= 12), mehrere.map((f) => f.summary).join(" | "));
  ok("'Diese Unterschrift gilt für: <Blatt>' steht bei einem Blatt (n = 1) direkt da, ohne Aufklappen, ohne „(1)“ und mit nur einem Doppelpunkt (B-1: „Antrag auf Spielerlaubnis – Spielerin oder Spieler“); das Feld verweist mit aria-describedby auf diese Zeile (Feld des Kindes)",
    eines.length > 0 && eines.every((f) => f.wer === "spieler" && f.sichtbar && f.text.startsWith(GILT + ": ") && einBlatt(f).length > 0 && !/\(\d+\)/.test(f.text) && (f.text.match(/:/g) || []).length === 1 && f.kennzeichen === "1" && f.beschreibtGilt), eines.map((f) => f.wer + ": " + f.text).join(" | "));
  ok("'Diese Unterschrift gilt für': jedes Unterschriftsfeld hat die Zeile (n = 1) oder den Bereich (n ≥ 2), nie beides", namen.felder.length > 0 && namen.felder.every((f) => f.art === "p" || f.art === "details") && mehrere.length + eines.length === namen.felder.length, namen.felder.map((f) => f.wer + ":" + f.art).join(", "));
  // Der Klick auf die Beschriftung öffnet die Liste; ein zweiter Klick schließt sie (Tastatur: Eingabetaste und Leertaste öffnen ein <details> von selbst)
  const ersteGilt = "#anmeldung .anm-unterschrift details.anm-unterschrift__gilt > summary";
  await page.click(ersteGilt);
  const offenGilt = await page.$eval("#anmeldung .anm-unterschrift details.anm-unterschrift__gilt", (d) => ({ offen: d.open, sichtbar: Array.from(d.querySelectorAll("li")).filter((e) => e.checkVisibility()).length, punkte: d.querySelectorAll("li").length }));
  ok("'Diese Unterschrift gilt für (n)': ein Klick öffnet die Liste, alle Blätter sind zu lesen", offenGilt.offen && offenGilt.sichtbar === offenGilt.punkte && offenGilt.punkte > 0, JSON.stringify(offenGilt));
  await page.click(ersteGilt);
  // Foto des Feldes des Kindes mit der Zeile für ein Blatt (n = 1)
  const kindFeld = await page.$('#anmeldung .anm-unterschrift[data-unterschrift="spieler"]');
  if (kindFeld) {
    await kindFeld.evaluate((e) => e.scrollIntoView({ block: "center" }));
    await kindFeld.screenshot({ path: path.join(AUSGABE, MOBIL.name, "unterschriften-kinderfeld-gilt-fuer-eins.png") });
    protokoll.screenshots++;
  }
  // O26 (Jugendleitung, 08.10.2026): Ein Elternteil reicht. Das Beispiel "kind-neu" hat "Beide Eltern": trotzdem nur ein Feld für die Eltern,
  // kein zweites, freiwilliges, und kein Text dazu.
  const eltern = await page.evaluate(() => ({
    felder: Array.from(document.querySelectorAll("#anmeldung .anm-unterschrift")).map((e) => e.getAttribute("data-unterschrift")),
    titel: Array.from(document.querySelectorAll("#anmeldung .anm-unterschrift")).map((f) => ({ wer: f.getAttribute("data-unterschrift"), text: (f.querySelector(".anm-unterschrift__titel") || { textContent: "" }).textContent.replace(/\s+/g, " ").trim() })),
    text: document.getElementById("anmeldung").innerText.replace(/\s+/g, " "),
  }));
  ok("O26: bei 'Beide Eltern' genau ein Unterschriftsfeld für die Eltern (sorgeberechtigte), kein zweites Feld", eltern.felder.filter((w) => /^sorgeberechtigte/.test(w)).join(",") === "sorgeberechtigte", eltern.felder.join(","));
  // Seit M9 (Modus „bildschirm“) trägt das freiwillige Feld des Kindes den Zusatz „(freiwillig)“; kein Titel der Eltern sagt „freiwillig“ oder „zweite“.
  ok("O26: kein Text zur zweiten, freiwilligen Unterschrift der Eltern ('zweiter Elternteil', 'Beide Eltern unterschreiben', 'freiwillig' oder 'zweite' im Titel eines Elternfelds) auf der Unterschriften-Seite; „freiwillig“ trägt nur das Feld des Kindes",
    !/zweiter Elternteil|Diese Unterschrift ist freiwillig|Beide Eltern unterschreiben/.test(eltern.text) && eltern.titel.every((t) => !/zweite/i.test(t.text) && (!/freiwillig/i.test(t.text) || t.wer === "spieler")), eltern.titel.map((t) => t.wer + ": " + t.text).join(" | "));
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
  await feld("anschrift.strasse", "die Adresse mit lateinischen Buchstaben", "Anschrift, Straße");
  await feld("anschrift.ort", "die Adresse mit lateinischen Buchstaben", "Anschrift, Ort");
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
  await feld("zahlung.kiStrasse", "die Adresse mit lateinischen Buchstaben", "Kontoinhaber, Straße");
  await feld("zahlung.kiOrt", "die Adresse mit lateinischen Buchstaben", "Kontoinhaber, Ort");
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

// ---------- M1 (11.10.2026): Heimweg nach dem Training, Karneval ohne eigenen Schritt ----------

// Zeilen der Prüfseite: { label, wert }
async function pruefZeilen(page) {
  return page.$$eval("#anmeldung .anm-pruefzeile", (l) =>
    l.map((z) => ({
      label: (z.querySelector("dt") || {}).textContent.replace(/[⁦-⁩]/g, "").trim(),
      wert: ((z.querySelector(".anm-pruefzeile__wert") || {}).textContent || "").replace(/[⁦-⁩]/g, "").replace(/\s+/g, " ").trim(),
    }))
  );
}

// Tippt alle Seiten bis zur genannten aus dem Profil ein (wie laufe() im Modus "eingabe", aber mit Ziel). Die Unterschrift
// am Bildschirm zeichnet unterschreiben().
async function tippeBis(page, profil, schritt, teil) {
  for (let i = 0; i < 90; i++) {
    const s = await stand(page);
    if (s.schritt === schritt && (!teil || s.teil === teil)) return s;
    await fuelleSeite(page, profil);
    if (s.schritt === "unterschriften") await unterschreiben(page, { touch: false });
    const r = await klickeWeiter(page, s);
    if (r.fehler.length || !r.gewechselt) break;
  }
  return stand(page);
}

// Aufsichtspflicht (Entscheidung der 1. Vorsitzenden vom 11.10.2026): Darf das Kind nach dem Training allein nach Hause?
// Eine Pflichtfrage auf einer eigenen Seite, nur für Minderjährige, die trainieren oder tanzen (Fußball, Karneval, beides),
// nie für Passive und Erwachsene. Der Schritt "karneval" (Gruppe, Turnier, Abendauftritte) gibt es nicht mehr.
async function pruefeHeimweg(browser, server, dateien, beispiele) {
  console.log("\n=== M1: Heimweg nach dem Training, Karneval ohne eigenen Schritt ===");
  const wb = await ladeWoerterbuch();
  const T = (pfad) => pfad.split(".").reduce((x, sch) => (x === undefined || x === null ? undefined : x[sch]), wb);
  const seitenModul = await import(pathToFileURL(path.join(ROOT, "assets", "js", "anmeldung", "seiten.js")).href);
  const reihenfolge = seitenModul.REIHENFOLGE;
  ok("Heimweg: eigener Schritt im Abschnitt 'unterlagen', gleich nach 'einwilligungen' und vor 'notfall'", seitenModul.ABSCHNITT_VON.heimweg === "unterlagen" && reihenfolge.indexOf("heimweg") === reihenfolge.indexOf("einwilligungen") + 1 && reihenfolge.indexOf("notfall") === reihenfolge.indexOf("heimweg") + 1, reihenfolge.join(" › "));
  ok("Karneval: den Schritt 'karneval' gibt es nicht mehr (keine Seite, kein Abschnitt, keine Reihenfolge)", !("karneval" in seitenModul.SEITEN) && !("karneval" in seitenModul.ABSCHNITT_VON) && !reihenfolge.includes("karneval") && Object.keys(seitenModul.SEITEN).length === 26, Object.keys(seitenModul.SEITEN).length + " Seiten");
  ok("Heimweg: die Seite hat genau eine Teilseite und die Pflichtprüfung meldet ohne Antwort 'Bitte wählen Sie eine Antwort.'", JSON.stringify(seitenModul.SEITEN.heimweg.teile({ a: {} })) === JSON.stringify(["haupt"]) && seitenModul.SEITEN.heimweg.pruefe({ a: { heimweg: null }, t: (p) => T(p) }, "haupt").length === 1 && seitenModul.SEITEN.heimweg.pruefe({ a: { heimweg: "allein" }, t: (p) => T(p) }, "haupt").length === 0 && seitenModul.SEITEN.heimweg.pruefe({ a: { heimweg: "abholen" }, t: (p) => T(p) }, "haupt").length === 0 && seitenModul.SEITEN.heimweg.pruefe({ a: { heimweg: "egal" }, t: (p) => T(p) }, "haupt")[0].meldung === "Bitte wählen Sie eine Antwort.", "");
  // M1 (11.10.2026) gab die Texte vor („genau so oder gleichwertig kurz“); P3 Teil b (12.10.2026, freigegeben) kürzt sie: Der Titel sagt die Frage, die
  // zwei Antworten brauchen keine Zusatzzeile, der Satz zum Ändern steht auf dem Blatt in der Datei (Unterlage U41: „Ich kann diese Erklärung
  // jederzeit ändern. Dann sage ich dem Trainer Bescheid.“, der Wortlaut dort bleibt unverändert).
  const SOLL = {
    titel: "Darf Ihr Kind allein nach Hause gehen?",
    absaetze: ["Während des Trainings passt der Verein auf Ihr Kind auf."],
    karten: [
      { wert: "allein", titel: "Allein nach Hause", hinweis: "" },
      { wert: "abholen", titel: "Wird abgeholt", hinweis: "" },
    ],
  };
  ok("Heimweg: die Texte im Wörterbuch (Titel, Hinweis, beide Optionen) stimmen wörtlich; Zusatzzeilen und Satz zum Ändern sind entfallen",
    T("heimweg.titel") === SOLL.titel && T("heimweg.hinweis") === SOLL.absaetze[0] && T("heimweg.aendern") === undefined &&
    T("heimweg.allein") === SOLL.karten[0].titel && T("heimweg.alleinHinweis") === undefined && T("heimweg.abholen") === SOLL.karten[1].titel && T("heimweg.abholenHinweis") === undefined &&
    T("pruefen.zeilen.heimweg") === "Heimweg" && T("pruefen.werte.heimweg.allein") === "Allein nach Hause" && T("pruefen.werte.heimweg.abholen") === "Wird abgeholt",
    "");
  ok("Karneval: die Texte der entfallenen Fragen (Gruppe, Turnier, Abendauftritte, Abholung, Uhrzeit, Zuschlag) stehen nicht mehr im Wörterbuch",
    T("karneval") === undefined && T("fehler.uhrzeit") === undefined && T("zahlung.art.zuschlag") === undefined && T("allgemein.wochentag") === undefined &&
    T("pruefen.zeilen.karneval") === undefined && T("pruefen.zeilen.abendauftritte") === undefined && T("pruefen.zeilen.abholung") === undefined && T("pruefen.zeilen.alleinNachHause") === undefined && T("pruefen.werte.alleinAb") === undefined,
    "");

  // ---- A: die Seite (390 px), Fußball-Kind aus dem Beispiel "Kind neu" (Antwort: abgeholt) ----
  {
    const page = await seiteMitBeispiel(browser, server, MOBIL, "heimweg-seite", "kind-neu", null);
    const s0 = await geheBis(page, "heimweg", "haupt");
    ok("Heimweg: Seite erreicht (Fußball-Kind, gleich nach den Einwilligungen)", s0.schritt === "heimweg" && s0.teil === "haupt", s0.schritt + "/" + s0.teil);
    const inhalt = await page.evaluate(() => {
      const w = document.getElementById("anmeldung");
      const gruppe = w.querySelector('fieldset[data-feld="heimweg"]');
      return {
        titel: (w.querySelector("#anm-titel") || {}).textContent.trim(),
        absaetze: Array.from(w.querySelectorAll(".anm-absaetze p")).map((p) => p.textContent.trim()),
        karten: Array.from(w.querySelectorAll('input[data-pfad="heimweg"]')).map((i) => {
          const l = w.querySelector('label[for="' + i.id + '"]');
          return { wert: i.getAttribute("data-wert"), titel: (l.querySelector(".anm-karte__titel") || {}).textContent.trim(), hinweis: ((l.querySelector(".anm-karte__hinweis") || {}).textContent || "").trim(), gewaehlt: i.checked };
        }),
        pflicht: gruppe ? gruppe.getAttribute("aria-required") : null,
        rolle: gruppe ? gruppe.getAttribute("role") : null,
        abschnitt: (w.ownerDocument.querySelector('.anm-abschnitte__punkt[aria-current="step"]') || { getAttribute: () => null }).getAttribute("data-abschnitt"),
        weiter: (w.querySelector('[data-aktion="weiter"]') || {}).textContent,
      };
    });
    ok("Heimweg: Frage und Hinweis wie vorgegeben (kein Satz zum Ändern mehr)", inhalt.titel === SOLL.titel && JSON.stringify(inhalt.absaetze) === JSON.stringify(SOLL.absaetze), JSON.stringify(inhalt.absaetze));
    ok("Heimweg: zwei Antworten 'Allein nach Hause' und 'Wird abgeholt' ohne Zusatzzeile; die Antwort aus dem Beispiel ist gewählt", JSON.stringify(inhalt.karten.map((x) => ({ wert: x.wert, titel: x.titel, hinweis: x.hinweis }))) === JSON.stringify(SOLL.karten) && inhalt.karten.map((x) => x.gewaehlt).join() === "false,true", JSON.stringify(inhalt.karten));
    ok("Heimweg: Pflichtfrage (Auswahlgruppe mit aria-required), Abschnitt 'Unterlagen' ist markiert, Knopf 'Weiter'", inhalt.pflicht === "true" && inhalt.rolle === "radiogroup" && inhalt.abschnitt === "unterlagen" && inhalt.weiter === "Weiter", JSON.stringify({ pflicht: inhalt.pflicht, rolle: inhalt.rolle, abschnitt: inhalt.abschnitt, weiter: inhalt.weiter }));
    ok("Heimweg: keine Uhrzeit und kein Feld für einen Namen auf der Seite", (await page.$$('#anmeldung input[type="text"], #anmeldung textarea')).length === 0, "");
    fs.mkdirSync(path.join(AUSGABE, MOBIL.name), { recursive: true });
    await page.screenshot({ path: path.join(AUSGABE, MOBIL.name, "heimweg.png"), fullPage: false });
    protokoll.screenshots++;
    await axePruefen(page, "390x844 heimweg/haupt (M1)");
    const breit = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, innen: window.innerWidth }));
    ok("Heimweg: kein Querscrollen bei 390 px", breit.scroll <= breit.innen, breit.scroll + " gegen " + breit.innen);
    const klein = await kleineTippflaechen(page);
    ok("Heimweg: Tippflächen mindestens 44 px", klein.length === 0, klein.slice(0, 3).join(" | "));
    // Unterschrift am Bildschirm wie bei den übrigen Vereinsunterlagen: „Diese Unterschrift gilt für:“ nennt das Blatt zum Heimweg
    const su = await geheBis(page, "unterschriften", "haupt");
    const gilt = await page.$$eval("#anmeldung .anm-unterschrift__gilt li", (l) => l.map((x) => x.textContent.trim()));
    ok("Heimweg: die Unterschriftenseite nennt das Blatt 'Heimweg nach dem Training' unter 'Diese Unterschrift gilt für:' (am Bildschirm, wie die übrigen Vereinsunterlagen)", su.schritt === "unterschriften" && gilt.includes("Heimweg nach dem Training") && gilt.includes("Einverständnis für Fahrten und Messenger-Gruppe"), gilt.join(" | "));
    await page.close();
  }

  // ---- B: Pflichtfrage, Prüfseite, Ändern, Passiv und die Datei (Kind neu, eingetippt, ohne Antwort aus dem Beispiel) ----
  {
    const profil = profilKindNeu(beispiele, server);
    delete profil.heimweg;
    const eingabe = await neueSeite(browser, server, MOBIL, "heimweg-pflicht-eingabe");
    const s1 = await tippeBis(eingabe, profil, "heimweg", "haupt");
    ok("Heimweg ohne Antwort: Seite erreicht (alles davor ist eingetippt)", s1.schritt === "heimweg", s1.schritt + "/" + s1.teil);
    const gewaehlt0 = await eingabe.$$eval('#anmeldung input[data-pfad="heimweg"]', (l) => l.filter((e) => e.checked).length);
    const r1 = await klickeWeiter(eingabe, s1);
    ok("Heimweg ohne Antwort: Weiter bleibt auf der Seite und meldet 'Bitte wählen Sie eine Antwort.'", gewaehlt0 === 0 && !r1.gewechselt && r1.fehler.some((f) => f.includes("Bitte wählen Sie eine Antwort.")), "gewählt: " + gewaehlt0 + "; " + r1.fehler.join(" | "));
    const kasten = await eingabe.$eval('fieldset[data-feld="heimweg"]', (e) => ({ invalid: e.getAttribute("aria-invalid"), sichtbar: !!e.querySelector(".anm-fehler:not([hidden])") }));
    ok("Heimweg ohne Antwort: die Auswahl ist als fehlerhaft markiert und die Fehlerzeile sichtbar", kasten.invalid === "true" || kasten.sichtbar, JSON.stringify(kasten));
    await eingabe.screenshot({ path: path.join(AUSGABE, MOBIL.name, "heimweg-pflicht.png"), fullPage: false });
    await axePruefen(eingabe, "390x844 heimweg/haupt ohne Antwort (Fehlerliste)");
    await klickeEtikett(eingabe, '#anmeldung input[data-pfad="heimweg"][data-wert="allein"]');
    await warte(150);
    const boxWeg = await eingabe.evaluate(() => { const b = document.querySelector("#anmeldung .anm-fehlerbox"); return !b || b.hidden; });
    ok("Heimweg: nach der Wahl verschwindet die Fehlermeldung sofort", boxWeg, "");
    const r2 = await klickeWeiter(eingabe, s1);
    const s2 = await stand(eingabe);
    ok("Heimweg: mit Antwort geht es weiter zum Notfallkontakt", r2.gewechselt && r2.fehler.length === 0 && s2.schritt === "notfall", s2.schritt + "/" + s2.teil);

    // Prüfseite: Zeile 'Heimweg' mit der gewählten Antwort
    const sp = await tippeBis(eingabe, profil, "pruefen", "haupt");
    ok("Heimweg: Prüfseite erreicht", sp.schritt === "pruefen", sp.schritt);
    let zeilen = await pruefZeilen(eingabe);
    let z = zeilen.find((x) => x.label === "Heimweg");
    ok("Heimweg: die Prüfseite zeigt die Zeile 'Heimweg' mit 'Allein nach Hause'", !!z && z.wert === "Allein nach Hause", JSON.stringify(zeilen.filter((x) => /Heimweg|Notfall|Fahrten/.test(x.label))));
    ok("Heimweg: die Prüfseite hat keine Zeilen mehr zu Karneval-Gruppe, Abendauftritten, Abholung und Zuschlag", !zeilen.some((x) => /Karneval-Gruppe|Abendauftritte|Wer holt ab|Zuschlag/.test(x.label + " " + x.wert)), "");
    await eingabe.$eval('#anmeldung button[aria-label="Heimweg ändern"]', (b) => b.scrollIntoView({ block: "center" }));
    await eingabe.screenshot({ path: path.join(AUSGABE, MOBIL.name, "pruefen-heimweg.png"), fullPage: false });
    protokoll.screenshots++;
    // Ändern: zurück zur Seite, andere Antwort, zurück zur Prüfung
    await eingabe.click('#anmeldung button[aria-label="Heimweg ändern"]');
    await eingabe.waitForFunction(() => document.getElementById("anmeldung").dataset.schritt === "heimweg", { timeout: 4000 });
    const vorGewaehlt = await eingabe.$eval('#anmeldung input[data-pfad="heimweg"][data-wert="allein"]', (e) => e.checked);
    const weiterText = await eingabe.$eval('#anmeldung [data-aktion="weiter"]', (e) => e.textContent);
    ok("Heimweg ändern: die Seite zeigt die bisherige Antwort, der Knopf heißt 'Speichern und zurück zur Prüfung'", vorGewaehlt && weiterText === "Speichern und zurück zur Prüfung", weiterText);
    await klickeEtikett(eingabe, '#anmeldung input[data-pfad="heimweg"][data-wert="abholen"]');
    const sa = await stand(eingabe);
    await klickeWeiter(eingabe, sa);
    const nachAenderung = await stand(eingabe);
    zeilen = await pruefZeilen(eingabe);
    z = zeilen.find((x) => x.label === "Heimweg");
    ok("Heimweg ändern: zurück auf der Prüfseite, dort steht jetzt 'Wird abgeholt'", nachAenderung.schritt === "pruefen" && !!z && z.wert === "Wird abgeholt", nachAenderung.schritt + "; " + JSON.stringify(z));

    // Passive Mitglieder haben keinen Heimweg: Abteilung ändern auf 'Nur unterstützen'
    await eingabe.click('#anmeldung button[aria-label="Abteilung ändern"]');
    await eingabe.waitForFunction(() => document.getElementById("anmeldung").dataset.schritt === "abteilung", { timeout: 4000 });
    await klickeEtikett(eingabe, '#anmeldung input[data-pfad="abteilung"][data-wert="passiv"]');
    const sb = await stand(eingabe);
    await klickeWeiter(eingabe, sb);
    let nachPassiv = await stand(eingabe);
    if (nachPassiv.schritt !== "pruefen") nachPassiv = await tippeBis(eingabe, profil, "pruefen", "haupt");
    zeilen = await pruefZeilen(eingabe);
    ok("Passiv: ohne Heimweg und ohne Notfallkontakt auf der Prüfseite", nachPassiv.schritt === "pruefen" && !zeilen.some((x) => x.label === "Heimweg" || x.label === "Notfallkontakt"), nachPassiv.schritt + "; " + zeilen.map((x) => x.label).join(", "));
    // Zurück zu Fußball: die Antwort zum Heimweg ist noch da
    await eingabe.click('#anmeldung button[aria-label="Abteilung ändern"]');
    await eingabe.waitForFunction(() => document.getElementById("anmeldung").dataset.schritt === "abteilung", { timeout: 4000 });
    await klickeEtikett(eingabe, '#anmeldung input[data-pfad="abteilung"][data-wert="fussball"]');
    const sc = await stand(eingabe);
    await klickeWeiter(eingabe, sc);
    let nachFussball = await stand(eingabe);
    if (nachFussball.schritt !== "pruefen") nachFussball = await tippeBis(eingabe, profil, "pruefen", "haupt");
    zeilen = await pruefZeilen(eingabe);
    z = zeilen.find((x) => x.label === "Heimweg");
    ok("Passiv und zurück zu Fußball: die Zeile 'Heimweg' ist wieder da, mit der Antwort 'Wird abgeholt'", nachFussball.schritt === "pruefen" && !!z && z.wert === "Wird abgeholt", nachFussball.schritt + "; " + JSON.stringify(z));

    // Datei: die Antwort erreicht den PDF-Baustein und steht im PDF
    await klickeWeiter(eingabe, nachFussball);
    const daten = await ergebnisPruefen(eingabe, { name: "heimweg-pflicht", vp: MOBIL }, dateien);
    ok("Heimweg: Datei erstellt", !!daten, "");
    if (daten && daten.attrappe) {
      ok("Heimweg: a.heimweg = 'abholen' erreicht den PDF-Baustein; keine Karneval-Antworten mehr in a", daten.attrappe.a.heimweg === "abholen" && !("karneval" in daten.attrappe.a), JSON.stringify({ heimweg: daten.attrappe.a.heimweg, karneval: daten.attrappe.a.karneval }));
    }
    if (daten) {
      const pdf = await pdfHerunterladenUndPruefen(browser, server, eingabe, "Heimweg Kind neu", daten, { satzungOffen: false });
      if (pdf) {
        const text = ohneLeer(pdfText(pdf.pfad));
        ok("Heimweg: das PDF hat das Blatt 'Heimweg nach dem Training' mit beiden Sätzen", text.includes("Heimweg nach dem Training") && text.includes("Mein Kind darf nach dem Training allein nach Hause gehen.") && text.includes("Mein Kind wird nach dem Training abgeholt. Es wartet am Trainingsort."), "");
        ok("Heimweg: das PDF nennt auf dem Laufzettel die Kopie an das Trainerteam; Teil A nennt die Zeile des Blatts nicht mehr unter „Wo unterschreiben Sie?“ (am Bildschirm erledigt; P3 Teil b, D1)", text.includes("Heimweg nach dem Training: Kopie an das Trainerteam.") && !/Heimweg nach dem Training\s+Eine Person mit Sorgerecht\s+Am Bildschirm erledigt/.test(ohneLeer(pdfText(pdf.pfad, 1)) + " " + ohneLeer(pdfText(pdf.pfad, 2))), "");
        ok("Heimweg: kein Blatt zu Auftritten am Abend im PDF", !/Auftritte am Abend|Erziehungsbeauftragung/.test(text), "");
      }
    }
    ok("Heimweg: keine Fehler in der Konsole", eingabe.__st.konsole.length === 0, eingabe.__st.konsole.slice(0, 3).join(" | "));
    await eingabe.close();
  }

  // ---- C: alle Beispiele auf der Prüfseite: Zeile 'Heimweg' nur bei Kindern, die trainieren oder tanzen ----
  for (const [id, soll] of [["kind-neu", "Wird abgeholt"], ["wechsel-hessen", "Allein nach Hause"], ["ausland-kind", "Allein nach Hause"], ["karneval-kind", "Wird abgeholt"], ["herren-wechsel", null]]) {
    const page = await seiteMitBeispiel(browser, server, MOBIL, "heimweg-beispiel-" + id, id, null);
    const besucht = [];
    for (let i = 0; i < 90; i++) {
      const s = await stand(page);
      besucht.push(s.schritt);
      if (s.schritt === "pruefen") break;
      if (s.schritt === "unterschriften") await unterschreiben(page, { touch: false });
      const r = await klickeWeiter(page, s);
      if (r.fehler.length || !r.gewechselt) break;
    }
    const zeilen = await pruefZeilen(page);
    const z = zeilen.find((x) => x.label === "Heimweg");
    ok("Beispiel " + id + ": " + (soll ? "Seite 'heimweg' kommt vor, die Prüfseite zeigt 'Heimweg: " + soll + "'" : "keine Seite 'heimweg' und keine Zeile 'Heimweg' (Erwachsene)"), (besucht.includes("heimweg") === (soll !== null)) && (soll === null ? !z : !!z && z.wert === soll), besucht.join(" › ") + "; " + JSON.stringify(z));
    ok("Beispiel " + id + ": nie ein Schritt 'karneval'", !besucht.includes("karneval"), "");
    if (id === "karneval-kind") {
      const reihe = Array.from(new Set(besucht)); // je Schritt einmal (die Teilseiten zählen nicht doppelt)
      const iE = reihe.indexOf("einwilligungen");
      ok("Beispiel Karneval-Kind: Abteilung › Sorge › Kontakt › Beitrag › … › Einwilligungen › Heimweg › Notfall (ohne Gruppe, Turnier, Abendauftritte)", reihe.indexOf("abteilung") < reihe.indexOf("sorge") && reihe.indexOf("sorge") < reihe.indexOf("kontakt") && reihe[iE + 1] === "heimweg" && reihe[iE + 2] === "notfall" && !reihe.includes("mannschaft") && !reihe.includes("spielerfoto"), reihe.join(" › "));
      ok("Beispiel Karneval-Kind: Prüfseite ohne Zeilen zu Karneval-Gruppe, Abendauftritten, Abholung und 'Allein nach Hause' (so hieß früher die Frage zum Abend)", !zeilen.some((x) => /^(Karneval-Gruppe|Abendauftritte|Wer holt ab|Allein nach Hause)$/.test(x.label)), zeilen.map((x) => x.label).join(", "));
    }
    await page.close();
  }

  // ---- D: der Hinweis 'kein Attest' (früher auf der Gruppenseite) steht jetzt auf der Seite 'abteilung' ----
  {
    const page = await seiteMitBeispiel(browser, server, MOBIL, "karneval-hinweis", "karneval-kind", "abteilung");
    const dom = await hinweiseImDom(page);
    ok("Karneval: der Hinweis 'Für Karneval brauchen Sie kein Attest' steht auf der Seite 'abteilung' (zugeklappt unter 'Weitere Hinweise')", dom.aufklapperSchluessel.includes("karneval_kein_attest") && dom.offenSchluessel.length === 0 && dom.aufklapperAnzahl === 1, JSON.stringify({ offen: dom.offenSchluessel, aufklapper: dom.aufklapperSchluessel }));
    await page.close();
  }
}

// ---------- M1, Runde 2 (11.10.2026): Satz zur Fahrt je Abteilung, keine Karnevalgruppen in der Konfiguration ----------

// Fußball und "beides" lesen "<Name> darf zu Spielen und Turnieren mitfahren.", wer nur im Karneval ist, liest "<Name> darf zu
// Veranstaltungen des Vereins mitfahren." (Entscheidung der 1. Vorsitzenden: keine Turniere und Auftritte in der Karneval-Anmeldung).
// Die Prüfseite zeigt nur die Zeile "Fahrten" mit Ja oder Nein, keinen Satz. Das PDF-Blatt prüft der pdf-test (Fahrten je Abteilung).
async function pruefeFahrtenSatz(browser, server, beispiele) {
  console.log("\n=== M1 Runde 2: Satz zur Fahrt je Abteilung, keine Karnevalgruppen in der Konfiguration ===");
  const wb = await ladeWoerterbuch();
  const T = (pfad) => pfad.split(".").reduce((x, sch) => (x === undefined || x === null ? undefined : x[sch]), wb);
  ok("Fahrten: das Wörterbuch hat den neuen Satz 'fahrtenKarneval' und behält den bisherigen Satz", T("einwilligungen.fahrten.fahrtenKarneval") === "{name} darf zu Veranstaltungen des Vereins mitfahren." && T("einwilligungen.fahrten.fahrten") === "{name} darf zu Spielen und Turnieren mitfahren.", "");
  // M11 (12.10.2026): Beim Karneval gibt es Gruppen, keine Mannschaften: eigener Satz zur Messenger-Gruppe für Karneval ohne Fußball
  ok("Messenger: das Wörterbuch hat den Satz 'messengerKarneval' („… der Gruppe“) und behält den bisherigen Satz („… der Mannschaft“)", T("einwilligungen.fahrten.messengerKarneval") === "{name} darf in die Messenger-Gruppe der Gruppe." && T("einwilligungen.fahrten.messenger") === "{name} darf in die Messenger-Gruppe der Mannschaft.", "");
  ok("Konfiguration: die in die gebaute Seite eingebettete Konfiguration enthält keine karnevalGruppen mehr", !("karnevalGruppen" in server.konfig), Object.keys(server.konfig).join(", "));
  const vorname = (id) => beispiele.beispielAntworten(id, HEUTE, server.konfig).vorname;
  const VERBOTEN = /Turnier|Auftritt|Kostüm/;
  // Satz des Kästchens "Fahrten" und der sichtbare Text der Seite
  const lesen = (page) =>
    page.evaluate(() => {
      const w = document.getElementById("anmeldung");
      const i = w.querySelector('input[data-pfad="einwilligungen.fahrten"]');
      const l = i ? w.querySelector('label[for="' + i.id + '"]') : null;
      const im = w.querySelector('input[data-pfad="einwilligungen.messenger"]');
      const lm = im ? w.querySelector('label[for="' + im.id + '"]') : null;
      return {
        satz: l ? ((l.querySelector(".anm-karte__titel") || {}).textContent || "").trim() : null,
        messenger: lm ? ((lm.querySelector(".anm-karte__titel") || {}).textContent || "").trim() : null,
        seite: w.innerText.replace(/\s+/g, " "),
      };
    });

  // ---- A: Karneval-Kind: der neue Satz; auf keiner Seite bis zur Prüfung steht etwas zu Turnieren, Auftritten oder Kostümen ----
  {
    const page = await seiteMitBeispiel(browser, server, MOBIL, "fahrten-karneval", "karneval-kind", null);
    const besucht = [];
    let fahrten = null;
    for (let i = 0; i < 90; i++) {
      const s = await stand(page);
      const l = await lesen(page);
      besucht.push({ ort: s.schritt + "/" + s.teil, seite: l.seite });
      if (s.schritt === "einwilligungen" && s.teil === "fahrten") {
        fahrten = l;
        await page.screenshot({ path: path.join(AUSGABE, MOBIL.name, "fahrten-karneval.png"), fullPage: false });
        protokoll.screenshots++;
      }
      if (s.schritt === "pruefen") break;
      if (s.schritt === "unterschriften") await unterschreiben(page, { touch: false });
      const r = await klickeWeiter(page, s);
      if (r.fehler.length || !r.gewechselt) break;
    }
    const soll = vorname("karneval-kind") + " darf zu Veranstaltungen des Vereins mitfahren.";
    ok("Fahrten Karneval-Kind: die Seite 'Fahrten und Nachrichten' zeigt '" + soll + "'", !!fahrten && fahrten.satz === soll, fahrten ? fahrten.satz : "Seite nicht erreicht: " + besucht.map((x) => x.ort).join(" › "));
    ok("Fahrten Karneval-Kind: der Satz nennt weder Spiele noch Turniere, und auf der Seite steht nichts zu Turnieren, Auftritten oder Kostümen", !!fahrten && !/Spiel|Turnier/.test(fahrten.satz) && !VERBOTEN.test(fahrten.seite), fahrten ? fahrten.satz : "");
    const sollMessengerK = vorname("karneval-kind") + " darf in die Messenger-Gruppe der Gruppe.";
    ok("Messenger Karneval-Kind: die Seite zeigt '" + sollMessengerK + "', auf der Seite steht kein „Mannschaft“ (M11)", !!fahrten && fahrten.messenger === sollMessengerK && !/Mannschaft/.test(fahrten.seite), fahrten ? fahrten.messenger : "Seite nicht erreicht");
    const treffer = besucht.filter((x) => VERBOTEN.test(x.seite)).map((x) => x.ort);
    ok("Karneval-Kind: auf keiner der " + besucht.length + " Seiten bis zur Prüfung steht 'Turnier', 'Auftritt' oder 'Kostüm'", besucht.length > 10 && treffer.length === 0, treffer.join(", "));
    const letzte = besucht[besucht.length - 1];
    ok("Karneval-Kind: die Prüfseite ist erreicht", !!letzte && letzte.ort === "pruefen/haupt", letzte ? letzte.ort : "");
    const zeilen = await pruefZeilen(page);
    const z = zeilen.find((x) => x.label === "Fahrten");
    ok("Karneval-Kind: die Prüfseite zeigt die Zeile 'Fahrten' mit 'Ja', ohne Satz", !!z && z.wert === "Ja", JSON.stringify(z));
    ok("Karneval-Kind: keine Fehler in der Konsole", page.__st.konsole.length === 0, page.__st.konsole.slice(0, 3).join(" | "));
    await page.close();
  }

  // ---- B: Fußball-Kind (Beispiel 'Kind neu'): der bisherige Satz ----
  {
    const page = await seiteMitBeispiel(browser, server, MOBIL, "fahrten-fussball", "kind-neu", null);
    const s = await geheBis(page, "einwilligungen", "fahrten");
    const l = await lesen(page);
    const soll = vorname("kind-neu") + " darf zu Spielen und Turnieren mitfahren.";
    ok("Fahrten Fußball-Kind: die Seite 'Fahrten und Nachrichten' zeigt '" + soll + "'", s.schritt === "einwilligungen" && s.teil === "fahrten" && l.satz === soll, s.schritt + "/" + s.teil + "; " + l.satz);
    ok("Messenger Fußball-Kind: der bisherige Satz '" + vorname("kind-neu") + " darf in die Messenger-Gruppe der Mannschaft.' (M11: unverändert)", l.messenger === vorname("kind-neu") + " darf in die Messenger-Gruppe der Mannschaft.", String(l.messenger));
    await page.screenshot({ path: path.join(AUSGABE, MOBIL.name, "fahrten-fussball.png"), fullPage: false });
    protokoll.screenshots++;
    await page.close();
  }

  // ---- C: Kind in Fußball und Karneval ("beides"): der bisherige Satz ----
  {
    const page = await seiteMitBeispiel(browser, server, MOBIL, "fahrten-beides", "kind-neu", "abteilung");
    await klickeEtikett(page, '#anmeldung input[data-pfad="abteilung"][data-wert="beides"]');
    const s = await geheBis(page, "einwilligungen", "fahrten");
    const l = await lesen(page);
    const soll = vorname("kind-neu") + " darf zu Spielen und Turnieren mitfahren.";
    ok("Fahrten Kind in Fußball und Karneval: der bisherige Satz '" + soll + "'", s.schritt === "einwilligungen" && s.teil === "fahrten" && l.satz === soll, s.schritt + "/" + s.teil + "; " + l.satz);
    ok("Messenger Kind in Fußball und Karneval: der bisherige Satz '… der Mannschaft.' (M11: unverändert)", l.messenger === vorname("kind-neu") + " darf in die Messenger-Gruppe der Mannschaft.", String(l.messenger));
    await page.close();
  }

  // ---- D: Abteilung in derselben Sitzung von Fußball auf Karneval gewechselt: der Satz folgt der Abteilung ----
  {
    const page = await seiteMitBeispiel(browser, server, MOBIL, "fahrten-wechsel", "kind-neu", "abteilung");
    await klickeEtikett(page, '#anmeldung input[data-pfad="abteilung"][data-wert="karneval"]');
    const s = await geheBis(page, "einwilligungen", "fahrten");
    const l = await lesen(page);
    const name = vorname("kind-neu");
    ok("Fahrten, Abteilung auf Karneval gewechselt: der Satz heißt jetzt '… zu Veranstaltungen des Vereins …'", s.schritt === "einwilligungen" && s.teil === "fahrten" && l.satz === name + " darf zu Veranstaltungen des Vereins mitfahren.", s.schritt + "/" + s.teil + "; " + l.satz);
    ok("Messenger, Abteilung auf Karneval gewechselt: der Satz heißt jetzt '… der Gruppe.' (M11)", l.messenger === name + " darf in die Messenger-Gruppe der Gruppe.", String(l.messenger));
    await page.close();
  }
}

// Attest: Hochladen heißt "habe"; danach nennt der Schritt 'unterschriften' die Erlaubnis für das Attest.
async function pruefeAttestImPlan(browser, server, dateien) {
  console.log("\n=== Runde 3: Attest im Unterschriftenplan ===");
  // textContent: Die Liste "Diese Unterschrift gilt für (n)" ist zugeklappt (P3 Teil b); innerText ließe sie weg.
  const gilt = (page) => page.evaluate(() => Array.from(document.querySelectorAll("#anmeldung .anm-unterschrift")).map((e) => e.textContent.replace(/\s+/g, " ")).join(" || "));
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
  ok("Getrennte Eltern: der Text des einen Kastens ist der vom Orchestrator festgelegte (drei kurze Absätze, Stand 07.10.2026; Modus „stift“)", T("sorge.zweiterMitStift") === "Hat der andere Elternteil zugestimmt? Dann setzen Sie den Haken.\nWenn nicht: Er unterschreibt den Aufnahmeantrag auch.\nDas geht nur mit Stift. Im PDF ist die Stelle markiert.", JSON.stringify(T("sorge.zweiterMitStift")));
  ok("Getrennte Eltern: der Text des Kastens im Modus „bildschirm“ (M9, 11.10.2026): drei kurze Absätze, am Bildschirm oder mit Stift im Ausdruck", T("sorge.zweiterAmBildschirm") === "Hat der andere Elternteil zugestimmt? Dann setzen Sie den Haken.\nWenn nicht: Er unterschreibt den Aufnahmeantrag auch.\nDas geht am Bildschirm. Oder mit Stift im Ausdruck.", JSON.stringify(T("sorge.zweiterAmBildschirm")));
  ok("M9: neue Texte zum Schalter stehen im Wörterbuch (Wahl, Feld des Kindes und des anderen Elternteils, Prüfseite, Fertig-Seite)", ["unterschriften.weg.bildschirmAlles", "unterschriften.weg.bildschirmAllesHinweis", "unterschriften.person.spielerHinweis", "unterschriften.person.zweiteEltern", "unterschriften.person.zweiteHinweis", "pruefen.werte.mitStift", "pruefen.werte.nichtUnterschriebenFreiwillig", "pruefen.werte.unterschriftWeg.bildschirmAlles", "fertig.unterschriftRest"].every((x) => T(x) !== undefined) && T("unterschriften.person.spieler").kind === "Unterschrift von {name}" && T("unterschriften.person.spielerHinweis").kind === "Kann Ihr Kind schreiben? Dann unterschreibt es selbst." && T("unterschriften.person.spielerHinweis").selbst === "Sie sind unter 18? Unterschreiben Sie auch selbst." && T("pruefen.werte.nichtUnterschriebenFreiwillig") === "Nicht unterschrieben (freiwillig)" && !/Stift|Ausdruck/.test(JSON.stringify(T("unterschriften.person.spielerHinweis"))), "");
}

// Latein-Prüfung für alle Freitextfelder, die ins PDF gehen: je Feldgruppe ein Fall (hier jedes Feld einzeln).
async function pruefeFreitextLatein(browser, server) {
  console.log("\n=== Runde 4: lateinische Schrift in allen Freitextfeldern, die ins PDF gehen ===");
  const MELDUNG = {
    verein: "Bitte schreiben Sie die Angaben zum Verein mit lateinischen Buchstaben.",
    anschrift: "Bitte schreiben Sie die Adresse mit lateinischen Buchstaben.",
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
  // M11 (12.10.2026): Die ganze Datei geht per E-Mail an die Geschäftsstelle, auch Teil C; der Verein bewahrt Teil C getrennt auf. Kein Text der
  // Oberfläche sagt mehr „getrennt abgeben“, „nicht per normaler E-Mail“, „im Verein abgeben“ oder „mitbringen“ – außer an den Ausnahmen.
  const abgabeWort = pruefeAbgabeWortlaut(woerterbuch, ABGABE_AUSNAHMEN_OBERFLAECHE);
  ok("Abgabe (M11): kein Text der Oberfläche sagt mehr „getrennt abgeben“, „nicht per normaler E-Mail“, „im Verein abgeben“ oder „mitbringen“ (außer den " + Object.keys(ABGABE_AUSNAHMEN_OBERFLAECHE).length + " Ausnahmen)",
    abgabeWort.verstoesse.length === 0 && abgabeWort.ungenutzt.length === 0, abgabeWort.verstoesse.map((v) => v.pfad + ": " + v.text).concat(abgabeWort.ungenutzt.map((u) => "Ausnahme ohne Treffer: " + u)).join(" | "));
  ok("Abgabe (M11): Teil C heißt „Teil C – Vertraulich“; Fertig-Seite: „Der Verein bewahrt ihn getrennt auf.“, „Schicken Sie sie per E-Mail nach, …“ und der Satz zum Papierweg",
    woerterbuch.fertig.teilTitel.C === "Teil C – Vertraulich" && woerterbuch.fertig.teilC === "Teil C enthält Gesundheitsdaten. Der Verein bewahrt ihn getrennt auf." &&
      woerterbuch.fertig.fehltHinweis === "Schicken Sie sie per E-Mail nach, sobald Sie sie haben." &&
      woerterbuch.fertig.abgebenAusgedruckt === "Fotografieren oder scannen Sie die unterschriebenen Blätter. Schicken Sie sie per E-Mail an die Geschäftsstelle. Oder geben Sie sie im Verein ab.",
    [woerterbuch.fertig.teilTitel.C, woerterbuch.fertig.teilC, woerterbuch.fertig.fehltHinweis, woerterbuch.fertig.abgebenAusgedruckt].join(" | "));
  const seitenModul = await import(pathToFileURL(path.join(ROOT, "assets", "js", "anmeldung", "seiten.js")).href);
  const schluesselSeiten = Object.keys(seitenModul.SEITEN);
  const fehlendeSeiten = SCHRITTE.filter((id) => !schluesselSeiten.includes(id) || typeof seitenModul.SEITEN[id].render !== "function" || typeof seitenModul.SEITEN[id].pruefe !== "function");
  ok("Alle 26 Schritte haben eine Seite (render und pruefe)", fehlendeSeiten.length === 0 && schluesselSeiten.length === 26, fehlendeSeiten.join(", ") || schluesselSeiten.length + " Seiten");
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
          const ctx = neuerKontext({ name: id, vp, modus: "beispiel", gesehen, touch: vp.mobil, axeImmer: vp.mobil, dateien });
          await ladeBeispielPerKnopf(page, id);
          const r = await laufe(page, ctx);
          const ende = r.besucht[r.besucht.length - 1];
          const erreicht = ende.startsWith("fertig");
          const daten = erreicht ? await ergebnisPruefen(page, ctx, dateien) : null;
          ok("Profil " + id + " (" + vp.name + ") bis 'fertig' durchgeklickt, Datei erstellt", erreicht && !!daten, r.besucht.length + " Seiten: " + Array.from(new Set(r.besucht.map((x) => x.split("/")[0]))).join(" › "));
          r.besucht.forEach((b) => alleSchritte.add(b.split("/")[0]));
          protokoll.profile.push({ name: id, viewport: vp.name, modus: "beispiel", seiten: r.besucht, datei: daten && daten.dateiname });
          // M1 (11.10.2026): Heimweg nur bei Minderjährigen, die trainieren oder tanzen; den Schritt "karneval" gibt es nicht mehr
          const besuchteSchritte = r.besucht.map((x) => x.split("/")[0]);
          const mitHeimweg = ["kind-neu", "wechsel-hessen", "ausland-kind", "karneval-kind"].includes(id);
          ok("Profil " + id + " (" + vp.name + "): Seite 'heimweg' " + (mitHeimweg ? "kommt vor (Minderjährige, die trainieren oder tanzen)" : "kommt nicht vor (Erwachsene)") + ", nie ein Schritt 'karneval'", besuchteSchritte.includes("heimweg") === mitHeimweg && !besuchteSchritte.includes("karneval"), besuchteSchritte.join(" › "));
          // M14 (12.10.2026): Den Schritt 'spielen' gibt es nicht mehr. Fußball: Mannschaft, dann gleich der Spielerpass; Karneval: weder Mannschaft noch Spielerpass.
          {
            const reihe = Array.from(new Set(besuchteSchritte)); // je Schritt einmal (Teilseiten zählen nicht doppelt)
            const fussball = id !== "karneval-kind";
            ok("Profil " + id + " (" + vp.name + "): nie ein Schritt 'spielen'; " + (fussball ? "Mannschaft und Spielerpass folgen unmittelbar aufeinander" : "weder Mannschaft noch Spielerpass (Karneval)"),
              !besuchteSchritte.includes("spielen") && (fussball ? reihe.indexOf("mannschaft") >= 0 && reihe.indexOf("spielerpass") === reihe.indexOf("mannschaft") + 1 : !reihe.includes("mannschaft") && !reihe.includes("spielerpass")), reihe.join(" › "));
            fs.writeFileSync(path.join(AUSGABE, "schritte-m14-" + id + (vp.mobil ? "" : "-desktop") + ".json"), JSON.stringify({ beispiel: id, bildschirm: vp.name, schritte: reihe, seiten: r.besucht }, null, 2) + "\n");
          }
          if (daten) {
            const nachweis = await unterschriftenNachweisen(page, ctx, daten);
            const uKeys = daten.attrappe ? Object.keys(daten.attrappe.unterschriften || {}).join(", ") : "";
            ok("Profil " + id + " (" + vp.name + "): Unterschriften (" + (vp.mobil ? "Maus im Handy-Fenster" : "Maus") + ") liegen in bilder.unterschriften und erreichen den PDF-Baustein", nachweis.ok && (ctx.unterschriftenGezeichnet || 0) > 0, "angeboten: " + (ctx.unterschriftFelder || []).join(", ") + "; gezeichnet: " + (ctx.unterschriftGezeichnetIn || []).join(", ") + (uKeys ? "; an den PDF-Baustein übergeben: " + uKeys : "") + (nachweis.ok ? "" : " – " + nachweis.detail));
          }
          if (daten && daten.attrappe && daten.attrappe.ergebnis) {
            // Zeigt die Ergebnisseite, was der PDF-Baustein geliefert hat (Teile, Seitenzahl)?
            const erg = daten.attrappe.ergebnis;
            const teile = Array.isArray(erg.teile) ? erg.teile : [];
            // P3 Teil b (S5): Die Fertig-Seite zeigt die Seitenzahl (und die Größe), aber keine Liste der Teile mehr („Das steht in der Datei“):
            // Teil A der Datei beginnt mit derselben Übersicht. Welche Teile die Datei hat, prüft der PDF-Test (Teil A, Laufzettel, Trennblatt).
            ok("Profil " + id + " (" + vp.name + "): Ergebnisseite nennt die Seitenzahl und zeigt keine Liste der Teile (S5)", daten.teileAnzeige === 0 && new RegExp("^" + erg.seiten + " Seiten").test(daten.infoZeile) && !/Das steht in der Datei/.test(daten.seitenText || ""), "angezeigt: " + daten.teileAnzeige + " Teil(e), '" + daten.infoZeile + "'; geliefert: " + (teile.map((x) => x.teil).join("") || "keine") + ", " + erg.seiten + " Seiten");
          }
          if (daten) {
            // Hinweis-Kästen: 'pruefen' ohne Hinweise; 'fertig' ohne Wiederholung (offen nur Warnungen und Fristen, alles andere zugeklappt).
            // Für das Beispiel kind-neu gilt zusätzlich: höchstens 4 offene Kästen.
            const regeln = await ladeRegeln();
            const befund = (daten.attrappe && daten.attrappe.a) || beispiele.beispielAntworten(id, HEUTE, server.konfig);
            const e = regeln.auswerten(befund, server.konfig, HEUTE);
            const grenze = id === "kind-neu" ? 4 : 0;
            const pdf = await pdfHerunterladenUndPruefen(browser, server, page, "Profil " + id + " (" + vp.name + ")", daten, { satzungOffen: false });
            if (pdf) PDF_ERGEBNISSE.set(id + "|" + vp.name, pdf);
            const domFertig = await hinweiseImDom(page);
            hinweiseAufFertigseite("Profil " + id + " (" + vp.name + ") auf 'fertig'", domFertig, e, grenze, ctx.hinweiseGesehen);
            hinweiseAufPruefseite("Profil " + id + " (" + vp.name + ") auf 'pruefen'", ctx.pruefenDom);
            if (id === "kind-neu" && domFertig.aufklapperVorhanden) {
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
      ok("Alle 26 Schritte wurden im Browser besucht", fehlendeAbdeckung.length === 0, fehlendeAbdeckung.length ? "fehlen: " + fehlendeAbdeckung.join(", ") : Array.from(alleSchritte).length + " Schritte");
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
    const erwartet = feldNamen;
    const fehlt = erwartet.filter((w) => !unterschriften[w] || !unterschriften[w].png);
    // Es gehen nur Bilder aus den Feldern der Seite an den PDF-Baustein; bei „Beide Eltern“ gibt es kein Bild einer zweiten Elternunterschrift (O26).
    const zuviel = Object.keys(unterschriften).filter((w) => !feldNamen.includes(w));
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
    spielerpass: "nein",
    deutsch: "ja",
    staaten: ["DE"],
    auslandGewohnt: "nein",
    einwilligungen: { fotos: "nein", medien: [], hfvName: true, hfvFoto: false, fahrten: true, messenger: true },
    heimweg: "allein",
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
    heimweg: "abholen",
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
      // M10: Am Rechner zeigt die Fertig-Seite den Abschnitt zum Schicken der Datei per E-Mail; ohne „Datei teilen“ nur den Weg über das Herunterladen, ohne Überschrift
      const senden = await leseSenden(page);
      const teilenDa = !!(await page.$('#anmeldung [data-aktion="teilen"]:not([hidden])'));
      ok("Eingabe Kind neu (Rechner): die Fertig-Seite zeigt den Abschnitt „So schicken Sie die Datei an den Verein“ mit der Adresse der Geschäftsstelle und nur dem Weg über das Herunterladen (ohne Überschrift; P3 Teil b)", !!senden && senden.titel === "So schicken Sie die Datei an den Verein" && senden.adresse === konfig.verein.mail && senden.wege.length === 1 && senden.wege[0].art === "computer" && senden.wege[0].titel === null, senden && senden.wege.map((w) => w.art + ":" + w.titel).join(", "));
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
    if (daten2) {
      // M10: Der E-Mail-Link der Fertig-Seite nennt die zweite Person, nicht die erste
      const mail2 = await page.$eval('#anmeldung [data-senden] a[data-aktion="mail-oeffnen"]', (a) => a.getAttribute("href")).catch(() => "");
      ok("Weitere Person anmelden: der E-Mail-Link der Fertig-Seite trägt den Betreff „Anmeldung Ben Mustermann“ (die zweite Person)", decodeURIComponent((/[?&]subject=([^&]*)/.exec(mail2) || [])[1] || "") === "Anmeldung Ben Mustermann", mail2);
    }
    r2.besucht.forEach((b) => alleSchritte.add(b.split("/")[0]));
    protokoll.profile.push({ name: "eingabe-geschwister", viewport: vp.name, modus: "eingabe", seiten: r2.besucht, datei: daten2 && daten2.dateiname });

    // Alle Angaben löschen
    await page.click('#anmeldung .anm-fuss [data-aktion="loeschen-alles"]');
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
  ok("Ergebnisseite: Herunterladen, Ansehen und weitere Person sind da; „Alle Angaben löschen“ steht nicht noch einmal im Block (B-2), sondern nur in der Fußzeile", ["herunterladen", "ansehen", "weitere-person"].every((a) => knoepfe.includes(a)) && !knoepfe.includes("loeschen"), knoepfe.join(", "));
  const fussLoeschen = await page.$eval('#anmeldung .anm-fuss [data-aktion="loeschen-alles"]', (e) => e.checkVisibility()).catch(() => false);
  const weitere = await page.$eval("#anmeldung .anm-block:has([data-aktion='weitere-person'])", (b) => ({ knoepfe: b.querySelectorAll("button, a").length, hinweis: (b.querySelector(".anm-knoepfe + .anm-hinweis") || { textContent: "" }).textContent.trim() })).catch(() => null);
  ok("Ergebnisseite (B-2): die Fußzeile bietet „Alle Angaben löschen“ an; im Block steht unter dem einen Knopf „Weitere Person anmelden“ der Satz „Wir übernehmen Adresse, Kontakt, Eltern und Zahlung.“", fussLoeschen && !!weitere && weitere.knoepfe === 1 && weitere.hinweis === "Wir übernehmen Adresse, Kontakt, Eltern und Zahlung.", JSON.stringify(weitere));
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

// ---------- M14 (12.10.2026): Das Spielrecht beantragt der Verein immer ----------

// Die Frage „Soll Ihr Kind bei Spielen mitmachen?“ und der Schritt „spielen“ entfallen (Entscheidung der 1. Vorsitzenden). Auf der Seite „spielerpass“ steht
// dafür ein kurzer Hinweis. Der Hinweis „Ohne Spielrecht darf ein Kind nicht bei Spielen mitmachen“ gehört ebenfalls zu dieser Seite (im Aufklapper).
async function pruefeSpielrechtImmer(browser, server, dateien, beispiele) {
  console.log("\n=== M14: Das Spielrecht beantragt der Verein immer (kein Schritt 'spielen') ===");
  const wb = await ladeWoerterbuch();
  const T = (pfad) => pfad.split(".").reduce((x, sch) => (x === undefined || x === null ? undefined : x[sch]), wb);
  const seitenModul = await import(pathToFileURL(path.join(ROOT, "assets", "js", "anmeldung", "seiten.js")).href);
  ok("Spielrecht immer: keine Seite, kein Abschnitt und keine Stelle der Reihenfolge für den Schritt 'spielen'; 26 Seiten",
    !("spielen" in seitenModul.SEITEN) && !("spielen" in seitenModul.ABSCHNITT_VON) && !seitenModul.REIHENFOLGE.includes("spielen") && Object.keys(seitenModul.SEITEN).length === 26 && seitenModul.REIHENFOLGE.length === 26,
    Object.keys(seitenModul.SEITEN).length + " Seiten");
  const SOLL = ["Wer Fußball spielt, braucht ein Spielrecht vom Fußball-Verband.", "Das beantragt der Verein für Sie.", "Das dauert manchmal einige Wochen."];
  ok("Spielrecht immer: das Wörterbuch hat die Erklärung beim Spielerpass (drei kurze Sätze) und nichts mehr von der früheren Frage",
    T("spielerpass.spielrecht") === SOLL.join("\n") && T("spielen") === undefined && T("fehler.spielen") === undefined && T("pruefen.zeilen.spielen") === undefined && T("pruefen.zeilen.spielenJa") === undefined && T("pruefen.zeilen.spielenNein") === undefined,
    String(T("spielerpass.spielrecht")));
  const ALT = new RegExp("Soll Ihr Kind bei Spielen mitmachen|Möchten Sie bei Spielen mitmachen|nur\\s+(beim\\s+|zum\\s+)?Training\\b", "i");

  // ---- A: Kind neu (390 px): Abteilung › Mannschaft › Spielerpass, die Seite mit dem Hinweis ----
  {
    const page = await seiteMitBeispiel(browser, server, MOBIL, "spielrecht-kind", "kind-neu", null);
    let s = await geheBis(page, "abteilung", "haupt");
    const besucht = [s.schritt];
    for (let i = 0; i < 4 && s.schritt !== "spielerpass"; i++) {
      const r = await klickeWeiter(page, s);
      if (r.fehler.length || !r.gewechselt) break;
      s = await stand(page);
      besucht.push(s.schritt);
    }
    ok("Spielrecht immer (Kind): von der Abteilung geht es über die Mannschaft gleich zum Spielerpass (keine Frage zu den Spielen dazwischen)", besucht.join(" › ") === "abteilung › mannschaft › spielerpass", besucht.join(" › "));
    const inhalt = await page.evaluate(() => {
      const w = document.getElementById("anmeldung");
      return {
        titel: (w.querySelector("#anm-titel") || {}).textContent.trim(),
        hinweise: Array.from(w.querySelectorAll("p.anm-hinweis")).map((p) => p.textContent.trim()),
        hinweiseSichtbar: Array.from(w.querySelectorAll("p.anm-hinweis")).filter((p) => p.checkVisibility()).map((p) => p.textContent.trim()),
        karten: Array.from(w.querySelectorAll('input[data-pfad="spielerpass"]')).map((i) => i.getAttribute("data-wert")),
        jaZusatz: ((w.querySelector('label[for="' + ((w.querySelector('input[data-pfad="spielerpass"][data-wert="ja"]') || {}).id || "") + '"] .anm-karte__hinweis') || {}).textContent || "").trim(),
        mehr: (() => {
          const d = w.querySelector("details[data-mehr]");
          const gruppe = w.querySelector('fieldset[data-feld="spielerpass"]');
          return d ? { zu: !d.open, titel: d.querySelector("summary").textContent.trim(), saetze: Array.from(d.querySelectorAll("p")).map((p) => p.textContent.trim()), sichtbar: Array.from(d.querySelectorAll("p")).filter((p) => p.checkVisibility()).length, nachAntworten: !!gruppe && !!(gruppe.compareDocumentPosition(d) & Node.DOCUMENT_POSITION_FOLLOWING) } : null;
        })(),
        text: w.textContent,
        abschnitt: (document.querySelector('.anm-abschnitte__punkt[aria-current="step"]') || { getAttribute: () => null }).getAttribute("data-abschnitt"),
      };
    });
    // P3 Teil b (S8, S9): Vor den Antworten steht nur die Erklärung des Spielerpasses; „Auch ein Spielerpass aus dem Ausland zählt.“ steht als Zusatzzeile unter „Ja“; die drei
    // Sätze zum Spielrecht stehen zugeklappt unter „Mehr erfahren“ (unter den Antworten).
    ok("Spielrecht immer (Kind): die Seite 'spielerpass' zeigt die Frage und die Erklärung; die drei Sätze zum Spielrecht stehen zugeklappt unter 'Mehr erfahren' (unter den Antworten)",
      inhalt.titel === "Hatte Ihr Kind schon einmal einen Spielerpass?" && inhalt.hinweiseSichtbar.includes("Ein Spielerpass ist der Ausweis für Spiele in einem Verein.") && SOLL.every((satz) => !inhalt.hinweiseSichtbar.includes(satz)) &&
        !!inhalt.mehr && inhalt.mehr.zu && inhalt.mehr.titel === "Mehr erfahren" && JSON.stringify(inhalt.mehr.saetze) === JSON.stringify(SOLL) && inhalt.mehr.sichtbar === 0 && inhalt.mehr.nachAntworten, JSON.stringify({ sichtbar: inhalt.hinweiseSichtbar, mehr: inhalt.mehr }));
    ok("Spielrecht immer (Kind): unter „Ja“ steht die Zusatzzeile „Auch ein Spielerpass aus dem Ausland zählt.“ (statt des Absatzes vor der Frage)", inhalt.jaZusatz === "Auch ein Spielerpass aus dem Ausland zählt." && !inhalt.hinweise.includes("Auch wenn es nur trainiert hat. Auch im Ausland."), inhalt.jaZusatz);
    await page.click("#anmeldung details[data-mehr] > summary");
    const mehrOffen = await page.$eval("#anmeldung details[data-mehr]", (d) => ({ offen: d.open, sichtbar: Array.from(d.querySelectorAll("p")).filter((p) => p.checkVisibility()).length }));
    ok("Spielrecht immer (Kind): ein Klick auf 'Mehr erfahren' zeigt die drei Sätze zum Spielrecht", mehrOffen.offen && mehrOffen.sichtbar === 3, JSON.stringify(mehrOffen));
    await page.click("#anmeldung details[data-mehr] > summary");
    ok("Spielrecht immer (Kind): drei Antworten (Ja, Nein, Weiß nicht), Abschnitt 'Fußball oder Karneval' markiert", JSON.stringify(inhalt.karten) === JSON.stringify(["ja", "nein", "weiss_nicht"]) && inhalt.abschnitt === "fussballKarneval", JSON.stringify(inhalt.karten) + " " + inhalt.abschnitt);
    ok("Spielrecht immer (Kind): auf der Seite steht nichts mehr von der früheren Frage und Antwort", !ALT.test(inhalt.text), ALT.test(inhalt.text) ? inhalt.text.slice(0, 300) : "");
    const dom = await hinweiseImDom(page);
    ok("Spielrecht immer (Kind): der Hinweis 'ohne Spielrecht kein Spiel' steht im Aufklapper dieser Seite (Information, nicht offen)", dom.aufklapperSchluessel.includes("ohne_spielrecht_kein_spiel") && !dom.offenSchluessel.includes("ohne_spielrecht_kein_spiel"), JSON.stringify({ offen: dom.offenSchluessel, aufklapper: dom.aufklapperSchluessel }));
    fs.mkdirSync(path.join(AUSGABE, MOBIL.name), { recursive: true });
    await page.screenshot({ path: path.join(AUSGABE, MOBIL.name, "spielerpass-spielrecht.png"), fullPage: false });
    protokoll.screenshots++;
    await axePruefen(page, "390x844 spielerpass/haupt mit Hinweis zum Spielrecht (M14)");
    const breit = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, innen: window.innerWidth }));
    ok("Spielrecht immer (Kind): kein Querscrollen bei 390 px", breit.scroll <= breit.innen, breit.scroll + " gegen " + breit.innen);
    const klein = await kleineTippflaechen(page);
    ok("Spielrecht immer (Kind): Tippflächen mindestens 44 px", klein.length === 0, klein.slice(0, 3).join(" | "));
    // Prüfseite: keine Zeile 'Spiele'
    const sp = await geheBis(page, "pruefen", "haupt");
    const zeilen = sp.schritt === "pruefen" ? await pruefZeilen(page) : [];
    ok("Spielrecht immer (Kind): die Prüfseite hat keine Zeile 'Spiele' und keine Zeile zur früheren Antwort (Training ohne Spiele)", sp.schritt === "pruefen" && zeilen.length > 5 && !zeilen.some((x) => /^Spiele$/.test(x.label) || /^(Ja, mit Spielrecht|Nur\sTraining)$/.test(x.wert)), zeilen.map((x) => x.label).join(", "));
    await page.close();
  }

  // ---- B: Erwachsene (Herren): dieselbe Seite mit der Anrede 'Hatten Sie ...' ----
  {
    const page = await seiteMitBeispiel(browser, server, MOBIL, "spielrecht-erwachsen", "herren-wechsel", null);
    const s = await geheBis(page, "spielerpass", "haupt");
    const hinweise = s.schritt === "spielerpass" ? await page.$$eval("#anmeldung p.anm-hinweis", (l) => l.map((x) => x.textContent.trim())) : [];
    const titel = s.schritt === "spielerpass" ? await page.$eval("#anm-titel", (e) => e.textContent.trim()) : "";
    ok("Spielrecht immer (Erwachsene): die Seite 'spielerpass' hat dieselben drei Sätze zum Spielrecht (zugeklappt unter 'Mehr erfahren')", s.schritt === "spielerpass" && titel === "Hatten Sie schon einmal einen Spielerpass?" && SOLL.every((satz) => hinweise.includes(satz)), titel + " | " + hinweise.join(" | "));
    const dom = await hinweiseImDom(page);
    ok("Spielrecht immer (Erwachsene): der Hinweis für Kinder 'ohne Spielrecht kein Spiel' fehlt", !dom.offenSchluessel.includes("ohne_spielrecht_kein_spiel") && !dom.aufklapperSchluessel.includes("ohne_spielrecht_kein_spiel"), JSON.stringify({ offen: dom.offenSchluessel, aufklapper: dom.aufklapperSchluessel }));
    await page.close();
  }

  // ---- C: Karneval-Kind: kein Spielerpass, keine Mannschaft, nichts zum Spielrecht ----
  {
    const page = await seiteMitBeispiel(browser, server, MOBIL, "spielrecht-karneval", "karneval-kind", null);
    const besucht = [];
    for (let i = 0; i < 90; i++) {
      const s = await stand(page);
      besucht.push(s.schritt);
      if (s.schritt === "pruefen") break;
      if (s.schritt === "unterschriften") await unterschreiben(page, { touch: false });
      const r = await klickeWeiter(page, s);
      if (r.fehler.length || !r.gewechselt) break;
    }
    const reihe = Array.from(new Set(besucht));
    ok("Spielrecht immer (Karneval-Kind): weder 'spielen' noch 'mannschaft', 'spielerpass', 'pass', 'ausland' oder 'spielerfoto'", !["spielen", "mannschaft", "spielerpass", "pass", "ausland", "spielerfoto"].some((x) => reihe.includes(x)), reihe.join(" › "));
    await page.close();
  }
}

// ---------- P3 Teil b (12.10.2026): weniger Text, einfachere Wörter ----------

// Olgay (12.10.2026): „achte … auf einfache Wortwahl und nicht zu viel Text, teilweise wirkt es ganz schön überladen.“ Freigegeben ist der Vorschlag
// aus pruefung/p3/VORSCHLAG.md (Stand 12.10.2026, mit den Änderungen aus pakete/P3b-freigabe.md). Diese Prüfung hält fest, was dort entschieden ist:
// gestrichene Texte fehlen in allen vier Sprachen, neue stehen in allen vier, „Mehr erfahren“, „Andere Beitragsgruppe“ und die Seiten ohne Kasten.
const P3_GESTRICHEN = [
  "wer.kindHinweis", "wer.selbstHinweis", "wer.mehrere", "name.vornameHinweis", "geburt.datum.ortHinweis", "abteilung.fussballHinweis", "abteilung.beidesHinweis",
  "mannschaft.alter", "mannschaft.klasse", "mannschaft.klasseHerren", "spielerpass.hinweis", "abmeldung.mitgliedschaft.hinweis", "abmeldung.mitgliedschaft.kuendigenHinweis",
  "abmeldung.spiele.hinweis", "abmeldung.freigabe.jaHinweis", "beitrag.gruppe.vorschlagKopf", "beitrag.gruppe.andere", "einwilligungen.fotos.jaHinweis",
  "einwilligungen.fotos.medienHinweis", "heimweg.alleinHinweis", "heimweg.abholenHinweis", "heimweg.aendern", "unterschriften.satzung.pflicht", "unterschriften.hierTitel",
  "unterschriften.satzung.titel", "fertig.senden.einleitung", "fertig.senden.handyTitel", "fertig.senden.computerTitel", "fertig.teileTitel", "fertig.teil", "pruefen.hinweiseTitel",
  "ausland.hinweis", "kontakt.erreichen.emailHinweis", "sorge.personen.hinweis", "spielerfoto.fotoHinweis", "spielerfoto.dateiHinweis", "alterVerein.verbandHinweis", "nachweise.art.pflicht",
];
const P3_NEU = ["allgemein.mehrErfahren", "spielerpass.jaHinweis", "beitrag.gruppe.andereGruppe"];

async function pruefeKuerzungenP3(browser, server, dateien, beispiele) {
  console.log("\n=== P3 Teil b: weniger Text (Kürzungen, „Mehr erfahren“, „Andere Beitragsgruppe“) ===");
  const hole = (o, pfad) => pfad.split(".").reduce((x, sch) => (x === undefined || x === null ? undefined : x[sch]), o);
  const woerter = {};
  for (const sprache of ["de", "en", "tr", "ar"]) woerter[sprache] = (await import(pathToFileURL(path.join(ROOT, "assets", "js", "anmeldung", "texte", sprache + "-oberflaeche.js")).href)).default;
  for (const sprache of ["de", "en", "tr", "ar"]) {
    const uebrig = P3_GESTRICHEN.filter((x) => hole(woerter[sprache], x) !== undefined);
    ok("Kürzungen (" + sprache + "): die " + P3_GESTRICHEN.length + " gestrichenen Texte stehen nicht mehr im Wörterbuch", uebrig.length === 0, uebrig.join(", "));
    const fehlt = P3_NEU.filter((x) => typeof hole(woerter[sprache], x) !== "string" || !hole(woerter[sprache], x).trim());
    ok("Kürzungen (" + sprache + "): die neuen Texte (Mehr erfahren, Zusatzzeile unter „Ja“ beim Spielerpass, Andere Beitragsgruppe) stehen im Wörterbuch", fehlt.length === 0, fehlt.join(", "));
  }
  const T = (pfad) => hole(woerter.de, pfad);
  ok("Kürzungen: die deutschen Texte der neuen Schlüssel und der geänderten Titel (freigegeben am 12.10.2026)",
    T("allgemein.mehrErfahren") === "Mehr erfahren" && T("spielerpass.jaHinweis") === "Auch ein Spielerpass aus dem Ausland zählt." && T("beitrag.gruppe.andereGruppe") === "Andere Beitragsgruppe" &&
      T("heimweg.titel") === "Darf Ihr Kind allein nach Hause gehen?" && T("zahlung.inhaber.anschriftGleich") === "Wohnt an derselben Adresse" && T("spielerfoto.datei") === "Ich wähle ein Foto aus" &&
      T("notfall.bogen.hinweis") === "Er ist freiwillig.\nEr hilft bei Allergien und Krankheiten.\nNur Trainer und Betreuer sehen ihn.",
    "");
  ok("Kürzungen: der Wortlaut der Datenschutz-Texte und der Einwilligungen bleibt (Titel der Frage zu den Fotos und zum Verband, Sätze zu Freiwilligkeit)",
    T("einwilligungen.fotos.hinweis") === "Sie entscheiden frei. Sie können das später ändern." && T("einwilligungen.hfv.hinweis") === "Beides ist freiwillig. Sie können das später ändern." && T("einwilligungen.fahrten.hinweis") === "Beides ist freiwillig. Sie können das später ändern." &&
      T("einwilligungen.hfv.titel") === "Was darf der Fußball-Verband veröffentlichen?" && T("fertig.teilC") === "Teil C enthält Gesundheitsdaten. Der Verein bewahrt ihn getrennt auf.",
    "");

  // ---- A: Beitrag (O1): nur der Vorschlag steht offen, die anderen Gruppen unter „Andere Beitragsgruppe“ ----
  {
    const page = await seiteMitBeispiel(browser, server, MOBIL, "p3-beitrag", "kind-neu", null);
    const s = await geheBis(page, "beitrag", "gruppe");
    ok("Beitrag (O1): Seite 'beitrag/gruppe' erreicht", s.schritt === "beitrag" && s.teil === "gruppe", s.schritt + "/" + s.teil);
    const lesen = () => page.evaluate(() => {
      const w = document.getElementById("anmeldung");
      const gruppe = w.querySelector('fieldset[data-feld="beitrag.gruppe"]');
      const karten = (wurzel) => Array.from(wurzel.querySelectorAll("label.anm-karte")).map((l) => ({ wert: l.querySelector("input").getAttribute("data-wert"), titel: l.querySelector(".anm-karte__titel").textContent.replace(/\s+/g, " ").trim(), zusatz: ((l.querySelector(".anm-karte__hinweis") || {}).textContent || "").trim(), gewaehlt: l.querySelector("input").checked, sichtbar: l.checkVisibility() }));
      const d = gruppe.querySelector("details[data-weitere-karten]");
      return {
        offen: karten(gruppe.querySelector(":scope > .anm-karten")),
        weitere: d ? { zu: !d.open, titel: d.querySelector("summary").textContent.trim(), karten: karten(d) } : null,
        gruppen: gruppe.querySelectorAll('input[type="radio"]').length,
        namen: new Set(Array.from(gruppe.querySelectorAll('input[type="radio"]')).map((i) => i.name)).size,
        text: w.textContent.replace(/\s+/g, " "),
        scroll: [document.documentElement.scrollWidth, window.innerWidth],
      };
    });
    let d = await lesen();
    const vorschlagWert = d.offen[0] && d.offen[0].wert;
    ok("Beitrag (O1): genau eine Gruppe steht offen da, vorgewählt und mit dem Zusatz „Vorschlag“", d.offen.length === 1 && d.offen[0].gewaehlt && d.offen[0].sichtbar && d.offen[0].zusatz === "Vorschlag", JSON.stringify(d.offen));
    ok("Beitrag (O1): die anderen Gruppen stehen in einem zugeklappten Bereich „Andere Beitragsgruppe“ und sind nicht zu sehen", !!d.weitere && d.weitere.zu && d.weitere.titel === "Andere Beitragsgruppe" && d.weitere.karten.length >= 2 && d.weitere.karten.every((x) => !x.sichtbar && !x.gewaehlt), JSON.stringify(d.weitere && { zu: d.weitere.zu, titel: d.weitere.titel, n: d.weitere.karten.length }));
    ok("Beitrag (O1): alle Karten bilden eine Auswahl (ein Name, höchstens eine gewählt) und die Seite hat die Zeilen „Wir schlagen vor“ und „Sie können eine andere Gruppe wählen.“ nicht mehr", d.namen === 1 && d.gruppen === d.offen.length + d.weitere.karten.length && !/Wir schlagen vor|andere Gruppe wählen/.test(d.text), d.gruppen + " Karten; " + d.namen + " Name(n)");
    // Tastatur: Fokus auf die Beschriftung, Eingabetaste öffnet, noch einmal schließt
    const summary = "#anmeldung details[data-weitere-karten] > summary";
    await page.focus(summary);
    await page.keyboard.press("Enter");
    d = await lesen();
    ok("Beitrag (O1): die Eingabetaste auf „Andere Beitragsgruppe“ öffnet den Bereich, alle anderen Gruppen sind zu sehen", d.weitere.zu === false && d.weitere.karten.every((x) => x.sichtbar), JSON.stringify(d.weitere.karten.map((x) => x.sichtbar)));
    const klein = await kleineTippflaechen(page);
    ok("Beitrag (O1): Tippflächen mindestens 44 px, kein Querscrollen bei 390 px", klein.length === 0 && d.scroll[0] <= d.scroll[1], klein.slice(0, 3).join(" | ") + " " + d.scroll.join(" gegen "));
    await axePruefen(page, "390x844 beitrag/gruppe mit geöffnetem „Andere Beitragsgruppe“ (P3 Teil b)");
    fs.mkdirSync(path.join(AUSGABE, MOBIL.name), { recursive: true });
    await page.screenshot({ path: path.join(AUSGABE, MOBIL.name, "beitrag-andere-gruppe-offen.png"), fullPage: false });
    protokoll.screenshots++;
    // eine andere Gruppe wählen: Die Wahl gilt für die ganze Auswahl (die Vorschlags-Karte ist danach nicht mehr gewählt)
    const andere = d.weitere.karten[0];
    await klickeEtikett(page, '#anmeldung input[data-pfad="beitrag.gruppe"][data-wert="' + andere.wert + '"]');
    d = await lesen();
    const gewaehlt = [...d.offen, ...d.weitere.karten].filter((x) => x.gewaehlt);
    ok("Beitrag (O1): wer eine andere Gruppe antippt, wählt sie; die bisherige ist nicht mehr gewählt", gewaehlt.length === 1 && gewaehlt[0].wert === andere.wert, JSON.stringify(gewaehlt.map((x) => x.titel)));
    // Prüfseite zeigt die gewählte Gruppe; „Ändern“ führt zurück: Die gewählte Gruppe steht jetzt offen da, der Vorschlag im zugeklappten Bereich
    const sp = await geheBis(page, "pruefen", "haupt");
    const zeilen = sp.schritt === "pruefen" ? await pruefZeilen(page) : [];
    const beitragsZeile = zeilen.find((z) => z.label === "Beitrag");
    const bezeichnung = (server.konfig.anmeldung.beitragsgruppen[andere.wert] || {}).bezeichnung || "";
    ok("Beitrag (O1): die Prüfseite nennt die gewählte Gruppe", !!bezeichnung && !!beitragsZeile && beitragsZeile.wert.includes(bezeichnung), JSON.stringify(beitragsZeile) + " – gewählt: " + andere.wert + " (" + bezeichnung + ")");
    await page.click('#anmeldung button[aria-label="Beitrag ändern"]');
    await page.waitForFunction(() => document.getElementById("anmeldung").dataset.schritt === "beitrag", { timeout: 5000 });
    d = await lesen();
    // (Der Zusatz „Vorschlag“ steht nur, solange die Familie nicht selbst gewählt hat; das war schon vorher so.)
    ok("Beitrag (O1): nach „Ändern“ steht die gewählte Gruppe offen da; der frühere Vorschlag steht im zugeklappten Bereich", d.offen.length === 1 && d.offen[0].wert === andere.wert && d.offen[0].gewaehlt && !!d.weitere && d.weitere.zu && d.weitere.karten.some((x) => x.wert === vorschlagWert && !x.sichtbar && !x.gewaehlt), JSON.stringify({ offen: d.offen.map((x) => x.titel), imBereich: d.weitere && d.weitere.karten.map((x) => x.wert), vorschlagWert }));
    ok("Beitrag (O1): keine Fehler in der Konsole", page.__st.konsole.length === 0, page.__st.konsole.slice(0, 3).join(" | "));
    await page.close();
  }

  // ---- B: Leistungen (S9): die Beispiele stehen offen, die Begründung zugeklappt unter „Mehr erfahren“ ----
  {
    const page = await seiteMitBeispiel(browser, server, MOBIL, "p3-leistungen", "kind-neu", null);
    const s = await geheBis(page, "leistungen", "haupt");
    const d = await page.evaluate(() => {
      const w = document.getElementById("anmeldung");
      const mehr = w.querySelector("details[data-mehr]");
      const gruppe = w.querySelector('fieldset[data-feld="leistungen"]');
      return {
        sichtbar: Array.from(w.querySelectorAll("p.anm-hinweis")).filter((p) => p.checkVisibility()).map((p) => p.textContent.trim()),
        mehr: mehr ? { zu: !mehr.open, titel: mehr.querySelector("summary").textContent.trim(), saetze: Array.from(mehr.querySelectorAll("p")).map((p) => p.textContent.trim()), nachAntworten: !!(gruppe.compareDocumentPosition(mehr) & Node.DOCUMENT_POSITION_FOLLOWING) } : null,
      };
    });
    ok("Leistungen (S9): die Beispiele („Zum Beispiel Grundsicherungsgeld, …“) stehen offen; die Begründung („Dann zahlt das Amt oft den Beitrag. Das heißt Bildung und Teilhabe.“) steht zugeklappt unter „Mehr erfahren“",
      s.schritt === "leistungen" && d.sichtbar.some((x) => /^Zum Beispiel Grundsicherungsgeld/.test(x)) && !d.sichtbar.some((x) => /Dann zahlt das Amt oft den Beitrag/.test(x)) && !!d.mehr && d.mehr.zu && d.mehr.titel === "Mehr erfahren" &&
        JSON.stringify(d.mehr.saetze) === JSON.stringify(["Dann zahlt das Amt oft den Beitrag.", "Das heißt Bildung und Teilhabe."]) && d.mehr.nachAntworten, JSON.stringify(d));
    await page.close();
  }

  // ---- C: Mannschaft (S6): der Satz des Regelwerks steht als Absatz, kein Kasten, keine Zeilen zu Alter und Altersklasse ----
  {
    const page = await seiteMitBeispiel(browser, server, MOBIL, "p3-mannschaft", "kind-neu", null);
    const s = await geheBis(page, "mannschaft", "haupt");
    const d = await page.evaluate(() => {
      const w = document.getElementById("anmeldung");
      return { kaesten: w.querySelectorAll(".anm-hinweiskasten").length, gross: Array.from(w.querySelectorAll("p.anm-text--gross")).map((p) => p.textContent.trim()), text: w.textContent.replace(/\s+/g, " ") };
    });
    ok("Mannschaft (S6): ein Satz als großer Absatz („Das Kind passt zur Mannschaft …“), kein Kasten, nichts zu Alter, Jahrgang und Altersklasse", s.schritt === "mannschaft" && d.kaesten === 0 && d.gross.length === 1 && /^Das Kind passt zur Mannschaft /.test(d.gross[0]) && !/Jahre alt|Jahrgang|passt zur [A-Z]-Jugend/.test(d.text), JSON.stringify(d.gross) + " | Kästen: " + d.kaesten);
    await page.close();
  }

  // ---- D: Abteilung und Spielerfoto: Zusatzzeilen nur, wo sie etwas erklären ----
  {
    const page = await seiteMitBeispiel(browser, server, MOBIL, "p3-abteilung", "kind-neu", null);
    const s = await geheBis(page, "abteilung", "haupt");
    const zusatz = await page.$$eval('#anmeldung input[data-pfad="abteilung"]', (l) => l.map((i) => ({ wert: i.getAttribute("data-wert"), zusatz: ((document.querySelector('label[for="' + i.id + '"] .anm-karte__hinweis') || {}).textContent || "").trim() })));
    ok("Abteilung (T06, T07): nur „Karneval“ und „Nur unterstützen“ tragen eine Zusatzzeile", s.schritt === "abteilung" && JSON.stringify(zusatz) === JSON.stringify([{ wert: "fussball", zusatz: "" }, { wert: "karneval", zusatz: "Tanzen bei den Schnauzern" }, { wert: "beides", zusatz: "" }, { wert: "passiv", zusatz: "Ihr Kind ist Mitglied. Es macht keinen Sport." }]), JSON.stringify(zusatz)); // U-02: Beispiel „kind-neu“ = „Mein Kind“ (bei „Ich selbst“ steht „Sie sind Mitglied …“, geprüft in pruefeSeitenP6)
    const sf = await geheBis(page, "spielerfoto", "haupt");
    const foto = await page.$$eval('#anmeldung input[data-pfad="spielerfoto.weg"]', (l) => l.map((i) => ({ wert: i.getAttribute("data-wert"), titel: document.querySelector('label[for="' + i.id + '"] .anm-karte__titel').textContent.trim(), zusatz: ((document.querySelector('label[for="' + i.id + '"] .anm-karte__hinweis') || {}).textContent || "").trim() })));
    ok("Spielerfoto (T67 bis T69): „Ich mache jetzt ein Foto“, „Ich wähle ein Foto aus“, „Der Verein macht das Foto“ (nur diese mit der Zusatzzeile „Beim ersten Training.“)", sf.schritt === "spielerfoto" && JSON.stringify(foto) === JSON.stringify([{ wert: "foto", titel: "Ich mache jetzt ein Foto", zusatz: "" }, { wert: "datei", titel: "Ich wähle ein Foto aus", zusatz: "" }, { wert: "verein", titel: "Der Verein macht das Foto", zusatz: "Beim ersten Training." }]), JSON.stringify(foto));
    await page.close();
  }

  // ---- E: Unterschriften: Satzung ohne Überschrift und ohne Zusatzzeile am Bildschirm; keine Überschrift „Diese Unterschriften geben Sie hier ab“ ----
  {
    const page = await seiteMitBeispiel(browser, server, MOBIL, "p3-satzung", "kind-neu", null);
    const s = await geheBis(page, "unterschriften", "haupt");
    const lesen = () => page.evaluate(() => {
      const w = document.getElementById("anmeldung");
      const haken = w.querySelector('input[data-pfad="satzung"]');
      const zeile = haken.closest("label").querySelector(".anm-karte__hinweis");
      return { ueberschriften: Array.from(w.querySelectorAll("h3")).map((h) => h.textContent.trim()), beschreibt: haken.getAttribute("aria-describedby"), zeile: zeile ? zeile.textContent.trim() : null, erklaerung: (w.querySelector(".anm-satzung > p.anm-hinweis") || {}).textContent };
    });
    let d = await lesen();
    ok("Unterschriften (T56, T57, T70): am Bildschirm keine Überschrift „Die Satzung des Vereins“ und keine „Diese Unterschriften geben Sie hier ab“, kein Zusatz am Haken (die Fehlerzeile sagt, was fehlt)", s.schritt === "unterschriften" && !d.ueberschriften.includes("Die Satzung des Vereins") && !d.ueberschriften.includes("Diese Unterschriften geben Sie hier ab") && d.zeile === null && d.beschreibt === null && d.erklaerung === "Die Satzung sind die Regeln des Vereins.", JSON.stringify(d));
    await klickeEtikett(page, '#anmeldung input[data-pfad="unterschriftWeg"][data-wert="papier"]');
    d = await lesen();
    ok("Unterschriften (T56): auf dem Papierweg sagt die Zusatzzeile am Haken, was zu tun ist, und der Haken hängt an ihr (aria-describedby)", d.zeile === "Freiwillig. Ohne Haken kreuzen Sie es im Ausdruck von Hand an." && !!d.beschreibt, JSON.stringify(d));
    await page.close();
  }
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
    ["pruefeZugang", () => pruefeZugang(browser, server)],
    ["pruefeUebergabe", () => pruefeUebergabe(browser, server)],
    ["pruefeSeitenZurueck", () => pruefeSeitenZurueck(browser, server)],
    ["pruefeUmgebungshinweis", () => pruefeUmgebungshinweis(browser, server)],
    ["pruefeCodeNichtImPdf", () => pruefeCodeNichtImPdf(browser, server, dateien)],
    ["pruefeUebersetzbareDaten", () => pruefeUebersetzbareDaten(browser, server)],
    ["pruefeHinweiseAufSeiten", () => pruefeHinweiseAufSeiten(browser, server, beispiele)],
    ["statischeRunde3", () => statischeRunde3(server)],
    ["pruefeSatzung", () => pruefeSatzung(browser, server, dateien)],
    ["pruefeGetrennteEltern", () => pruefeGetrennteEltern(browser, server, dateien)],
    ["pruefeUnterschriftenModus", () => pruefeUnterschriftenModus(browser, server, dateien)],
    ["pruefeNamenLatein", () => pruefeNamenLatein(browser, server, dateien, beispiele)],
    ["statischeRunde4", () => statischeRunde4()],
    ["pruefeFreitextLatein", () => pruefeFreitextLatein(browser, server)],
    ["pruefeSonderzeichenPdf", () => pruefeSonderzeichenPdf(browser, server, dateien)],
    ["pruefeHeimweg", () => pruefeHeimweg(browser, server, dateien, beispiele)],
    ["pruefeSpielrechtImmer", () => pruefeSpielrechtImmer(browser, server, dateien, beispiele)],
    ["pruefeKuerzungenP3", () => pruefeKuerzungenP3(browser, server, dateien, beispiele)],
    ["pruefeFahrtenSatz", () => pruefeFahrtenSatz(browser, server, beispiele)],
    ["pruefeAttestImPlan", () => pruefeAttestImPlan(browser, server, dateien)],
    ["pruefeSprache", () => pruefeSprache(browser, server)],
    ["pruefeArabischDurchlauf", () => pruefeArabischDurchlauf(browser, server, dateien)],
    ["pruefeUeberschriftSprachen", () => pruefeUeberschriftSprachen(browser, server)],
    ["pruefeVereinssicht", () => pruefeVereinssicht(browser, server, beispiele)],
    ["pruefeVorfuehrungKnopf", () => pruefeVorfuehrungKnopf(browser, server)],
    ["pruefeKopfSchmal", () => pruefeKopfSchmal(browser, server)],
    ["pruefeBilder", () => pruefeBilder(browser, server, dateien, beispiele)],
    ["pruefeBerichtsseite", () => pruefeBerichtsseite(browser, server, beispiele)],
    ["statischeM10", () => statischeM10(server)],
    ["pruefeMailAnVerein", () => pruefeMailAnVerein(browser, server, dateien, beispiele)],
    ["pruefeSeitenP6", () => pruefeSeitenP6(browser, server, dateien, beispiele)],
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

// Hinweise auf den Seiten mit einer Frage: höchstens 1 Kasten offen (nur Warnungen und Fristen),
// alles andere unter "Weitere Hinweise (n)". Einmal an den echten Seiten (Wechsel in Hessen: die Fragen nach dem
// Stand der Abmeldung, nach dem Weg und nach der Mitgliedschaft), einmal an regelHinweise() selbst mit erfundenen
// Hinweisen, damit auch der Fall "mehr als 2 Warnungen" vorkommt.
async function pruefeHinweiseAufSeiten(browser, server, beispiele) {
  // (a) echte Seiten
  const seite = await seiteMitBeispiel(browser, server, MOBIL, "hinweise-seite", "wechsel-hessen", null);
  // U-07: Auf „Ist Ihr Kind beim alten Verein abgemeldet?“ stehen zwei Warnungen: eine offen, die zweite zugeklappt (sie steht danach offen auf der Fertig-Seite)
  const sSt = await geheBis(seite, "abmeldung", "status");
  const domSt = await hinweiseImDom(seite);
  ok("Hinweise auf der Frageseite 'abmeldung/status' (U-07): zwei Warnungen, die erste offen, die zweite zugeklappt unter „Weitere Hinweise (1)“", sSt.schritt === "abmeldung" && sSt.teil === "status" && domSt.offenArten.join() === "warnung" && domSt.aufklapperArten.join() === "warnung" && domSt.aufklapperTitel === "Weitere Hinweise (1)" && domSt.aufklapperZu === true, JSON.stringify({ offen: domSt.offenSchluessel, aufklapper: domSt.aufklapperSchluessel, titel: domSt.aufklapperTitel }));
  const s = await geheBis(seite, "abmeldung", "weg");
  ok("Hinweise auf einer Frageseite: Seite 'abmeldung/weg' erreicht", s.schritt === "abmeldung" && s.teil === "weg", s.schritt + "/" + s.teil);
  const dom = await hinweiseImDom(seite);
  const alleArten = [...dom.offenArten, ...dom.aufklapperArten];
  ok(
    "Hinweise auf einer Frageseite: höchstens 1 Kasten offen (P3 Teil b, STILREGELN Nr. 3), nur Warnungen und Fristen; Infos im Aufklapper",
    dom.offenSichtbar <= 1 && dom.offenArten.every((x) => x === "warnung" || x === "frist") && dom.aufklapperArten.includes("info") && dom.aufklapperZu === true && dom.aufklapperTitel === "Weitere Hinweise (" + dom.aufklapperAnzahl + ")" && alleArten.length >= 2,
    "offen: " + (dom.offenArten.join(", ") || "keiner") + "; Aufklapper (" + dom.aufklapperAnzahl + "): " + dom.aufklapperArten.join(", ")
  );
  await seite.screenshot({ path: path.join(AUSGABE, MOBIL.name, "hinweise-frageseite.png"), fullPage: false });
  // U-06: Der Hinweis „In unserem Verein können Sie nur zum Jahresende kündigen“ (kuendigung_jahresende) meint den eigenen Verein und steht nicht bei der Frage zum alten Verein
  const sMg = await geheBis(seite, "abmeldung", "mitgliedschaft");
  const domMg = await hinweiseImDom(seite);
  ok("Hinweise auf der Frageseite 'abmeldung/mitgliedschaft' (U-06): nur der Kasten „kuendigung_extra“ steht da, der Hinweis zur Kündigung zum Jahresende nicht", sMg.teil === "mitgliedschaft" && domMg.offenSchluessel.join() === "kuendigung_extra" && !domMg.aufklapperVorhanden && !domMg.aufklapperSchluessel.includes("kuendigung_jahresende"), JSON.stringify({ offen: domMg.offenSchluessel, aufklapper: domMg.aufklapperSchluessel }));
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
    "regelHinweise(): bei 3 Warnungen, 1 Info und 1 'offen' ein Kasten offen (die erste Warnung), die anderen vier im Aufklapper",
    r.voll.offen.length === 1 && r.voll.offen.every((x) => x.startsWith("warnung:")) && r.voll.aufklapper.length === 1 && r.voll.aufklapper[0].kaesten === 4 && r.voll.aufklapper[0].zu && /Weitere Hinweise \(4\)/.test(r.voll.aufklapper[0].titel),
    JSON.stringify(r.voll)
  );
  ok(
    "regelHinweise(): nur Infos und 'offen' – kein Kasten offen, beide im Aufklapper",
    r.nurInfo.offen.length === 0 && r.nurInfo.aufklapper.length === 1 && r.nurInfo.aufklapper[0].kaesten === 2 && /Weitere Hinweise \(2\)/.test(r.nurInfo.aufklapper[0].titel),
    JSON.stringify(r.nurInfo)
  );
  ok("regelHinweise(): ohne passenden Hinweis bleibt die Seite leer (kein Aufklapper)", r.keine === 0, String(r.keine));

  // (c) U-06, U-07, U-08 (12.10.2026): Was auf der Frageseite nur zugeklappt stand, geht für die Fertig-Seite nicht verloren; der Hinweis zur Kündigung zum Jahresende
  // gehört nicht zur Frage beim alten Verein; die Fertig-Seite zeigt keinen Kasten „Frist“ ohne Frist
  const u = await page.evaluate(async () => {
    const basis = "/assets/js/anmeldung/";
    const [ende, wb, hilfen] = await Promise.all([import(basis + "seiten-ende.js"), import(basis + "texte/de-oberflaeche.js"), import(basis + "hilfen.js")]);
    const get = (o, p) => p.split(".").reduce((x, s) => (x === undefined ? undefined : x[s]), o);
    const neuK = () => ({ t: (p, w) => hilfen.ersetzePlatzhalter(get(wb.default, p), w || {}), rt: (bereich, key) => "Text zu " + key, formatDatum: (x) => x, weitereOffen: new Map() });
    const beschreibe = (knoten) => ({
      offen: knoten.filter((x) => x.matches && x.matches(".anm-hinweiskasten")).map((x) => x.getAttribute("data-hinweis-art") + ":" + x.getAttribute("data-hinweis-key")),
      zu: knoten.filter((x) => x.tagName === "DETAILS").flatMap((x) => Array.from(x.querySelectorAll(".anm-hinweiskasten")).map((b) => b.getAttribute("data-hinweis-key"))),
    });
    const k7 = neuK();
    const e7 = { hinweise: [{ art: "warnung", key: "abmeldung_nach_letztem_spiel" }, { art: "warnung", key: "nie_zwei_vereine" }, { art: "info", key: "abmeldung_unklar" }] };
    const frage = beschreibe(ende.regelHinweise(k7, e7, "abmeldung/status"));
    const gezeigt = Array.from(k7.gezeigteHinweise).sort();
    const fertig7 = beschreibe(ende.regelHinweise(k7, e7));
    const k6 = neuK();
    const e6 = { hinweise: [{ art: "info", key: "kuendigung_extra" }, { art: "info", key: "kuendigung_jahresende" }] };
    const bei6 = beschreibe(ende.regelHinweise(k6, e6, "abmeldung/mitgliedschaft"));
    const fertig6 = beschreibe(ende.regelHinweise(k6, e6));
    const fristKaesten = (key, extra) => ende.regelHinweise(neuK(), { hinweise: [], frist: { key, werte: {}, unsicher: false, ...(extra || {}) } }).filter((x) => x.getAttribute && x.getAttribute("data-hinweis-art") === "frist").length;
    return { frage, gezeigt, fertig7, bei6, fertig6, kein: fristKaesten("frist_kein_spiel"), ohne: fristKaesten("frist_ohne_zusage"), neu: fristKaesten("frist_neu", { pflichtspieleAb: "2026-10-12" }) };
  });
  ok("regelHinweise() (U-07): bei zwei Warnungen auf einer Frageseite steht die erste offen, die zweite zugeklappt; nur die offene und die Info gelten als gesehen",
    JSON.stringify(u.frage.offen) === '["warnung:abmeldung_nach_letztem_spiel"]' && u.frage.zu.sort().join() === "abmeldung_unklar,nie_zwei_vereine" && u.gezeigt.join() === "abmeldung_nach_letztem_spiel,abmeldung_unklar", JSON.stringify({ frage: u.frage, gezeigt: u.gezeigt }));
  ok("regelHinweise() (U-07): die Fertig-Seite zeigt die zugeklappte Warnung („nie_zwei_vereine“) offen, die offene Warnung und die Info stehen dort nicht noch einmal",
    JSON.stringify(u.fertig7.offen) === '["warnung:nie_zwei_vereine"]' && u.fertig7.zu.length === 0, JSON.stringify(u.fertig7));
  ok("regelHinweise() (U-06): „kuendigung_jahresende“ steht nicht bei der Frage zum alten Verein („abmeldung/mitgliedschaft“), sondern erscheint auf der Fertig-Seite unter „Weitere Hinweise“",
    u.bei6.zu.join() === "kuendigung_extra" && u.fertig6.zu.join() === "kuendigung_jahresende" && u.fertig6.offen.length === 0, JSON.stringify({ bei: u.bei6, fertig: u.fertig6 }));
  ok("regelHinweise() (U-08): auf der Fertig-Seite kein Kasten „Frist“ für „frist_kein_spiel“ und „frist_ohne_zusage“, aber für eine Frist mit Datum („frist_neu“)", u.kein === 0 && u.ohne === 0 && u.neu === 1, JSON.stringify({ kein: u.kein, ohne: u.ohne, neu: u.neu }));
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
      // U-12: Zwischen „Anrufen:“ und der Nummer steht ein festes Leerzeichen; im Knopf (Flex) fällt ein gewöhnliches am Ende des Textes weg
      telAbstand: (() => {
        const a = d.querySelector('a[href^="tel:"]');
        const nr = a && a.querySelector(".anm-tel");
        const text = a && Array.from(a.childNodes).find((n) => n.nodeType === 3);
        if (!nr || !text) return null;
        // Lücke zwischen dem Doppelpunkt (ohne das letzte Zeichen, das Leerzeichen) und der Nummer
        const r = document.createRange();
        r.setStart(text, 0);
        r.setEnd(text, Math.max(0, text.textContent.length - 1));
        return { zeichen: text.textContent.slice(-2), luecke: Math.round(nr.getBoundingClientRect().left - r.getBoundingClientRect().right) };
      })(),
      mails: Array.from(d.querySelectorAll('a[href^="mailto:"]')).map((a) => a.getAttribute("href").replace("mailto:", "")),
      text: d.innerText,
      titelFokus: !!document.activeElement && d.contains(document.activeElement),
    };
  });
  ok("Hilfe (U-12): im Knopf „Anrufen“ steht hinter dem Doppelpunkt ein festes Leerzeichen, zwischen Wort und Nummer ist eine sichtbare Lücke (mindestens 3 px)", !!h.telAbstand && h.telAbstand.zeichen === ":\u00a0" && h.telAbstand.luecke >= 3, JSON.stringify(h.telAbstand));
  // 20.10.2026 (S-8): Der Link trägt die internationale Form (+49 …) wie die Seiten der Website; sichtbar bleibt "069 736868".
  const telInternational = (nr) => { const z = String(nr).replace(/[^\d+]/g, ""); return "tel:" + (/^0[1-9]/.test(z) ? "+49" + z.slice(1) : z); };
  ok("Hilfe: Telefon der Geschäftsstelle stimmt mit der Vereinskonfiguration (Link in der Form +49 …)", h.tel.includes(telInternational(konfig.verein.tel_geschaeftsstelle)) && h.tel.every((t) => /^tel:\+49\d+$/.test(t)), h.tel.join(","));
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
  const sammel = { gilt: "", giltPunkte: 0, giltTitel: "", pruefzeilen: [], pruefDom: [] };
  const ctx = neuerKontext({
    name: "arabisch-durchlauf", vp: MOBIL, modus: "beispiel", gesehen: gesehenFuer(MOBIL), touch: true, axeNeu: false, dateien,
    proSeite: async (p, s, kennung) => {
      const liste = await ungeschuetzterErsatztext(p);
      if (liste.length) roh.push(kennung + ": " + liste.slice(0, 2).join(" | "));
      if (s.schritt === "unterschriften") {
        // textContent: Die Liste steht seit P3 Teil b zugeklappt unter "Diese Unterschrift gilt für (n)"
        sammel.gilt = await p.$eval("#anmeldung .anm-unterschrift", (e) => e.textContent.replace(/\s+/g, " "));
        sammel.giltPunkte = await p.$eval("#anmeldung .anm-unterschrift", (e) => e.querySelectorAll(".anm-unterschrift__gilt li").length);
        sammel.giltTitel = await p.$eval("#anmeldung .anm-unterschrift .anm-unterschrift__gilt > summary", (e) => e.textContent.replace(/\s+/g, " ").trim());
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
  ok("Arabisch-Durchlauf: 'Diese Unterschrift gilt für (n)' steht als Liste (ein Blatt je Zeile), keine Aufzählung in einer Zeile", sammel.giltPunkte >= 2 && !/, /.test(ohneIso(sammel.gilt).replace(/\([^)]*\)/g, "")), sammel.giltPunkte + " Zeilen; " + ohneIso(sammel.gilt).slice(0, 120));
  // D-07: Die Beschriftung ist der arabische Text giltFuerBlaetter mit der Zahl der Blätter (westliche Ziffern)
  const arOb = (await import(pathToFileURL(path.join(ROOT, "assets", "js", "anmeldung", "texte", "ar-oberflaeche.js")).href)).default;
  const arBeschriftung = ohneIso(arOb.unterschriften.giltFuerBlaetter).replace("{n}", String(sammel.giltPunkte));
  ok("Arabisch-Durchlauf: die Beschriftung des zugeklappten Bereichs heißt „" + arBeschriftung + "“ (Text giltFuerBlaetter mit der Zahl der Blätter, D-07)", ohneIso(sammel.giltTitel) === arBeschriftung, sammel.giltTitel);
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

// ---------- P1 (12.10.2026): Zugang mit Code vom Probetraining, Übergabe in den Browser ----------
// Die Prüfungen selbst stehen in zugang-browser.mjs (dieselben für die Begleitseite hier und für die Live-Seite im Paket, e2e-paket.mjs).
// Der Testserver setzt die Prüfwerte zur Laufzeit (server.setzeZugang): Standard ist eine leere Liste, so hängt kein anderer Test an dem,
// was in data/anmeldung.json steht. Im ausgelieferten Code gibt es dafür keine Hintertür.

function zugangUmgebung(browser, server) {
  return {
    name: "Begleitseite",
    oeffne: (vp, name, o) => neueSeite(browser, server, vp, name, o || {}),
    setzeZugang: (liste) => server.setzeZugang(liste),
    testCode: server.testCode,
    testPruefwert: server.testPruefwert,
    fremderPruefwert: server.fremderPruefwert,
    ok,
    axe: async (page, name) => {
      const sauber = await axePruefen(page, name);
      if (sauber) ok(name + ": axe-core ohne Verstöße critical/serious", true);
      return sauber;
    },
    foto: async (page, dateiname, o) => {
      const vp = page.viewport().width >= 1000 ? DESKTOP : MOBIL;
      await page.screenshot({ path: path.join(AUSGABE, vp.name, "p1-" + dateiname), ...(o || {}) });
      protokoll.screenshots++;
    },
    zugangModul: server.basis + "/assets/js/anmeldung/zugang.js",
    probetrainingZiel: "../ws/mitglied-werden.html#probetraining",
    geschaeftsstelle: server.konfig.verein.mail,
    beispiele: true,
    weiterImErstenBildschirm: false,
    browserBasis: server.basis + "/anmeldung/",
    huelle: (vp, name, o) => huelleOeffnen(browser, server, vp, name, o || {}),
    neuesFensterOeffnen: true,
    woerterbuch: async (code) => (await import(pathToFileURL(path.join(ROOT, "assets", "js", "anmeldung", "texte", code + "-oberflaeche.js")).href)).default,
    sprachen: ["de", "en", "tr", "ar"],
  };
}

// Die Hülle der Website im Kleinen (Zusätze zu P1): eine Seite auf einem anderen Port (also eine andere Herkunft) mit einem <iframe> ohne allow-Angaben
// auf die Seite des Assistenten, wie src/huelle/huelle.html es mit #showFrame macht. Ergebnis: { aussen: Seite, rahmen: Frame, schliessen() }.
async function huelleOeffnen(browser, server, vp, name, o) {
  const innen = server.basis + "/anmeldung/" + (o.abfrage || "");
  const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Hülle (Test)</title></head><body style="margin:0"><iframe id="showFrame" title="Inhalt" src="${innen.replace(/&/g, "&amp;")}" style="display:block;border:0;width:100%;height:${vp.hoehe}px"></iframe></body></html>`;
  const aussenServer = createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
    res.end(html);
  });
  await new Promise((fertig) => aussenServer.listen(0, "127.0.0.1", fertig));
  const aussenBasis = "http://127.0.0.1:" + aussenServer.address().port + "/";
  const page = await neueSeite(browser, server, vp, name, { url: aussenBasis, vorLaden: o.vorLaden });
  const rahmen = page.frames().find((f) => f !== page.mainFrame());
  await rahmen.waitForSelector("#anmeldung[data-bereit]", { timeout: 10000 });
  return {
    aussen: page,
    rahmen,
    aussenBasis,
    schliessen: async () => {
      await page.close();
      // Chrome hält Verbindungen offen: erst alle schließen, sonst wartet close() ewig
      if (typeof aussenServer.closeAllConnections === "function") aussenServer.closeAllConnections();
      await new Promise((fertig) => aussenServer.close(fertig));
    },
  };
}

async function pruefeZugang(browser, server) {
  await pruefeZugangImBrowser(zugangUmgebung(browser, server));
}

// Übergabe in den Browser (?app=1): Der Assistent läuft in der App nie. Dazu die Kontrolle ohne ?app=1 (Rahmen der Begleitseite sichtbar,
// der Assistent läuft) und: Mit ?app=1 fehlen Kopfleiste und Fußnote der Begleitseite.
async function pruefeUebergabe(browser, server) {
  await pruefeUebergabeImBrowser(zugangUmgebung(browser, server));
  console.log("\n=== P1: App-Modus der Begleitseite: Rahmen und Kontrolle ohne ?app=1 ===");
  const normal = await neueSeite(browser, server, MOBIL, "app-modus-kontrolle");
  const kontrolle = await normal.evaluate(() => {
    const sicht = (e) => !!e && e.checkVisibility();
    return { appKlasse: document.documentElement.classList.contains("app-modus"), kopf: sicht(document.querySelector(".begleit-kopf")), fuss: sicht(document.querySelector(".ws-fuss")), schritt: document.getElementById("anmeldung").dataset.schritt, uebergabe: !!document.querySelector('[data-aktion="im-browser-oeffnen"]') };
  });
  ok("Ohne ?app=1: Rahmen der Begleitseite sichtbar, der Assistent läuft (Startschritt), keine Übergabe", !kontrolle.appKlasse && kontrolle.kopf && kontrolle.fuss && kontrolle.schritt === "start" && !kontrolle.uebergabe, JSON.stringify(kontrolle));
  await normal.close();
  const app = await neueSeite(browser, server, MOBIL, "app-modus-rahmen", { abfrage: "?app=1" });
  const d = await app.evaluate(() => {
    const sicht = (e) => !!e && e.checkVisibility();
    return { appKlasse: document.documentElement.classList.contains("app-modus"), kopf: sicht(document.querySelector(".begleit-kopf")), fuss: sicht(document.querySelector(".ws-fuss")), h1: sicht(document.querySelector("h1")) };
  });
  ok("Mit ?app=1: Klasse app-modus am <html>; Kopfleiste „Begleitseite zum Prototyp“ mit Navigation und Fußnote „Begleitmaterial“ sind weg; die Überschrift bleibt", d.appKlasse && !d.kopf && !d.fuss && d.h1, JSON.stringify(d));
  await app.close();
}

// B1 (19.10.2026): Der Link „Zurück zu „Mitglied werden““ oben links auf der Code-Seite gilt nur für die Live-Seite (Paket, e2e-paket.mjs). Auf der Begleitseite gibt es ihn
// nicht (kein Ziel „zurueck“ in der Konfiguration, nichts sichtbar); die Prüfung steht in zugang-browser.mjs (ohne c.seitenZurueck).
async function pruefeSeitenZurueck(browser, server) {
  await pruefeSeitenZurueckImBrowser(zugangUmgebung(browser, server));
}

// Hinweis oben auf dem ersten Bildschirm, wenn die Seite in einem Rahmen oder im Browser einer anderen App läuft (Zusätze zu P1, 12.10.2026): Rahmen auf einem
// anderen Port, User-Agent-Zeilen, Vorrang der App-Weiche, alle vier Sprachen. Die Prüfungen stehen in zugang-browser.mjs.
async function pruefeUmgebungshinweis(browser, server) {
  await pruefeUmgebungshinweisImBrowser(zugangUmgebung(browser, server));
  await pruefeUmgebungshinweisSprachen(zugangUmgebung(browser, server));
}

// Der Code ist keine Angabe zur Person: Er steht nicht in den Antworten, die der PDF-Baustein bekommt, nicht im PDF und nicht im Speicher des Browsers.
async function pruefeCodeNichtImPdf(browser, server, dateien) {
  console.log("\n=== P1: der Code erreicht weder die Antworten noch das PDF ===");
  server.setzeZugang([server.testPruefwert]);
  try {
    const page = await neueSeite(browser, server, MOBIL, "code-nicht-im-pdf", { abfrage: "?code=" + encodeURIComponent(server.testCode) });
    ok("Link mit gültigem Code: Startschritt", (await stand(page)).schritt === "start");
    await ladeBeispielPerKnopf(page, "kind-neu");
    const ctx = neuerKontext({ name: "code-nicht-im-pdf", vp: MOBIL, modus: "beispiel", gesehen: new Set(), touch: true, axeImmer: false, dateien });
    const r = await laufe(page, ctx);
    ok("Mit Code im Link: das Beispiel „Kind neu“ läuft bis „fertig“ durch (" + r.besucht.length + " Seiten)", r.besucht[r.besucht.length - 1].startsWith("fertig"));
    const daten = await ergebnisPruefen(page, ctx, dateien);
    ok("Mit Code im Link: die Datei wird erstellt", !!daten);
    if (daten) {
      const norm = server.testCode.replace(/-/g, "");
      const antworten = JSON.stringify(daten.attrappe && daten.attrappe.a);
      ok("Der Code steht nicht in den Antworten, die der PDF-Baustein bekommt", !!antworten && !antworten.includes(server.testCode) && !antworten.includes(norm));
      const pdf = await pdfHerunterladenUndPruefen(browser, server, page, "Code im Link", daten, { satzungOffen: false });
      const text = pdf ? pdfText(pdf.pfad) : "";
      ok("Der Code steht nicht im Text des PDF", !!pdf && text.length > 1000 && !text.includes(server.testCode) && !text.replace(/\s+/g, "").includes(norm), pdf ? pdf.seiten + " Seiten" : "kein PDF");
      const rohBytes = pdf ? fs.readFileSync(pdf.pfad) : Buffer.alloc(0);
      ok("Der Code steht nirgends in den Bytes des PDF (auch nicht in den Metadaten)", rohBytes.length > 0 && !rohBytes.includes(Buffer.from(norm)) && !rohBytes.includes(Buffer.from(server.testCode)));
    }
    const speicher = await page.evaluate(() => ({ ls: localStorage.length, ss: sessionStorage.length, cookie: document.cookie }));
    ok("Im Speicher des Browsers steht nichts (localStorage, sessionStorage, Cookies)", speicher.ls === 0 && speicher.ss === 0 && speicher.cookie === "", JSON.stringify(speicher));
    await page.close();
  } finally {
    server.setzeZugang([]);
  }
}

// ---------- M10: Datei per E-Mail an die Geschäftsstelle (11.10.2026) ----------
// Entscheidung der 1. Vorsitzenden: Es gibt keinen Versand über einen Server. Die Familie schickt die fertige Datei selbst per E-Mail an die
// Geschäftsstelle. Die Fertig-Seite zeigt dafür den Abschnitt „So schicken Sie die Datei an den Verein“ (Wege am Handy und am Computer, die Adresse groß,
// „Adresse kopieren“, Link „E-Mail an die Geschäftsstelle öffnen“); Betreff und Text der E-Mail stehen auf Deutsch (hilfen.js, mailtoAnVerein).

// Ohne Browser: der mailto-Link (Betreff und Text kodiert), der Mailtext in Einfacher Sprache, die neuen Textschlüssel, die Adresse steht nicht fest im Code.
async function statischeM10(server) {
  console.log("\n=== M10: Datei per E-Mail an die Geschäftsstelle (ohne Browser) ===");
  const hilfen = await import(pathToFileURL(path.join(ROOT, "assets", "js", "anmeldung", "hilfen.js")).href);
  const adresse = server.konfig.verein.mail;
  ok("Konfiguration: konfig.verein.mail ist eine E-Mail-Adresse (die der Geschäftsstelle)", /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adresse), adresse);

  // Der einfache Fall, Zeichen für Zeichen: so sieht der Link aus, den die Familie bekommt
  const soll = "mailto:" + adresse + "?subject=Anmeldung%20Mila%20Mustermann&body=Guten%20Tag%2C%0D%0A%0D%0Aanbei%20die%20Anmeldung%20als%20PDF.%0D%0A%0D%0AViele%20Gr%C3%BC%C3%9Fe";
  const einfach = hilfen.mailtoAnVerein(adresse, "Mila", "Mustermann");
  ok("mailto (Mila Mustermann): Betreff „Anmeldung Mila Mustermann“ und Text genau so kodiert (Leerzeichen %20, Umlaut %C3%BC, Zeilenumbrüche %0D%0A)", einfach === soll, einfach);

  // Dekodiert stimmen An, Betreff und Text auch bei Umlauten und bei Zeichen, die in einer Adresse etwas bedeuten
  const MAIL_TEXT = "Guten Tag,\r\n\r\nanbei die Anmeldung als PDF.\r\n\r\nViele Grüße";
  const zerlege = (href) => {
    const m = /^mailto:([^?]*)\?subject=([^&]*)&body=([^&]*)$/.exec(href);
    return m ? { an: m[1], betreff: m[2], text: m[3] } : null;
  };
  const faelle = [
    ["Umlaute und ß", "Jörg", "Weiß-Mustermann", "Anmeldung Jörg Weiß-Mustermann"],
    ["Apostroph, Leerzeichen im Namen", "Ömer Faruk", "D'Mustermann", "Anmeldung Ömer Faruk D'Mustermann"],
    ["Zeichen mit Bedeutung in einer Adresse (& # ? % + =)", "A&B", "C#D?E%F+G=H", "Anmeldung A&B C#D?E%F+G=H"],
    ["Leerzeichen am Rand und doppelte Leerzeichen", "  Mila ", "Muster  mann", "Anmeldung Mila Muster mann"],
    ["ohne Namen", "", "", "Anmeldung"],
    ["Namen fehlen ganz", undefined, null, "Anmeldung"],
  ];
  for (const [name, vorname, nachname, erwBetreff] of faelle) {
    const href = hilfen.mailtoAnVerein(adresse, vorname, nachname);
    const z = zerlege(href);
    const dekodiert = z ? { an: z.an, betreff: decodeURIComponent(z.betreff), text: decodeURIComponent(z.text) } : null;
    ok("mailto (" + name + "): An, Betreff und Text stimmen nach dem Dekodieren, genau die drei Teile (kein eingeschmuggelter Zusatz)", !!dekodiert && dekodiert.an === adresse && dekodiert.betreff === erwBetreff && dekodiert.text === MAIL_TEXT, href);
    ok("mailto (" + name + "): nur ASCII ohne Leerzeichen, kein „+“ und kein weiteres „&“ oder „?“ im Betreff und Text", /^[\x21-\x7e]+$/.test(href) && !!z && !/[+&?#]/.test(z.betreff + z.text), href);
  }

  // Der Mailtext ist deutsch und in Einfacher Sprache (höchstens 12 Wörter je Satz, keine Abkürzungen)
  ok("Mailtext: deutsch und gleich für jede Sprache des Assistenten (hilfen.js), nicht im Wörterbuch", hilfen.MAIL_BETREFF === "Anmeldung" && hilfen.MAIL_TEXT.replace(/\n/g, "\r\n") === MAIL_TEXT, hilfen.MAIL_TEXT.replace(/\n/g, " | "));
  const einfachMail = pruefeEinfacheSprache({ betreff: hilfen.MAIL_BETREFF, text: hilfen.MAIL_TEXT });
  ok("Mailtext: Einfache Sprache (kein Satz über 12 Wörter, keine Abkürzungen)", einfachMail.verstoesse.length === 0 && einfachMail.anzahlSaetze >= 3, einfachMail.anzahlSaetze + " Sätze, längster " + einfachMail.laengster.woerter + " Wörter");

  // Die Textschlüssel
  const de = await ladeWoerterbuch();
  const senden = (de.fertig && de.fertig.senden) || {};
  // P3 Teil b: Es gibt keinen Satz unter der Überschrift (einleitung) und keine Überschriften der Wege (handyTitel, computerTitel) mehr
  const schluessel = ["titel", "handy1", "handy2", "handy3", "computer1", "computer2", "computer3", "adresseTitel", "kopieren", "kopiert", "kopierenFehler", "oeffnen", "anhang"];
  const entfallen = ["einleitung", "handyTitel", "computerTitel"].filter((k) => k in senden);
  ok("Wörterbuch: fertig.senden hat keinen Satz unter der Überschrift und keine Überschriften der Wege mehr (einleitung, handyTitel, computerTitel entfallen)", entfallen.length === 0, entfallen.join(", "));
  const fehlt = schluessel.filter((k) => typeof senden[k] !== "string" || !senden[k].trim());
  ok("Wörterbuch: fertig.senden hat alle " + schluessel.length + " Texte", fehlt.length === 0, fehlt.join(", "));
  ok("Wörterbuch: die Schritte 1 nennen den Knopf als {knopf} (so passen sie immer zu den Knöpfen)", /\{knopf\}/.test(senden.handy1) && /\{knopf\}/.test(senden.computer1) && !/Datei teilen|Datei herunterladen/.test(senden.handy1 + senden.computer1), senden.handy1 + " | " + senden.computer1);
  ok("Wörterbuch: Titel „So schicken Sie die Datei an den Verein“, Knöpfe „Adresse kopieren“ und „E-Mail an die Geschäftsstelle öffnen“", senden.titel === "So schicken Sie die Datei an den Verein" && senden.kopieren === "Adresse kopieren" && senden.oeffnen === "E-Mail an die Geschäftsstelle öffnen", senden.titel + " | " + senden.kopieren + " | " + senden.oeffnen);
  ok("Wörterbuch: der Weg am Handy nennt das Mail-Programm, der Weg am Computer den Anhang", /Mail-Programm/.test(senden.handy2) && /Hängen Sie die Datei an/.test(senden.computer2) && /hängen Sie die Datei selbst an/.test(senden.anhang), senden.handy2 + " | " + senden.computer2 + " | " + senden.anhang);
  // U-01 (12.10.2026): Am Handy zuerst die Adresse kopieren, dann die Datei teilen (die Datei hängt das Teilen schon an), dann die Adresse bei „An“ einfügen
  ok("Wörterbuch (U-01): Weg am Handy: 1. Adresse kopieren, 2. Datei teilen, Mail-Programm wählen, Datei ist schon angehängt, 3. Adresse bei „An“ einfügen und senden",
    senden.handy1 === "Tippen Sie unten auf „{knopf}“." && senden.handy2 === "Tippen Sie oben auf „{knopf}“. Wählen Sie Ihr Mail-Programm. Die Datei ist schon angehängt." && senden.handy3 === "Fügen Sie die Adresse bei „An“ ein. Senden Sie die E-Mail.", senden.handy1 + " | " + senden.handy2 + " | " + senden.handy3);
  ok("Wörterbuch (U-01): der Hinweis beim Link nennt den Knopf als {knopf} und sagt, dass die Datei dort selbst angehängt wird („Bei „E-Mail an die Geschäftsstelle öffnen“ hängen Sie die Datei selbst an.“)", senden.anhang === "Bei „{knopf}“ hängen Sie die Datei selbst an." && senden.anhang.replace("{knopf}", senden.oeffnen).split(/\s+/).length <= 12, senden.anhang);
  ok("Wörterbuch (D-06): letzter Punkt von „So geht es weiter“: „Danach prüft der Verein Ihre Anmeldung.“", de.fertig.danach === "Danach prüft der Verein Ihre Anmeldung.", String(de.fertig.danach));
  ok("Wörterbuch: der alte Text zum Abgeben im Verein (fertig.abgeben) ist entfallen, der Hinweis zu WhatsApp bleibt", de.fertig.abgeben === undefined && de.fertig.nichtWhatsapp === "Bitte schicken Sie die Datei nicht per WhatsApp. Sie enthält private Daten." && !/auf dem Handy mit/.test(JSON.stringify(de.fertig)), String(de.fertig.nichtWhatsapp));
  ok("Wörterbuch: ohne eingebauten Mailtext und ohne feste Adresse (beides steht in hilfen.js bzw. der Konfiguration)", !/Guten Tag|@sportfreunde04/.test(JSON.stringify(de.fertig)), "");

  // Die Adresse kommt aus der Konfiguration und steht nirgends fest im Code der Fertig-Seite
  const fest = ["hilfen.js", "seiten-ende.js"].filter((f) => /sportfreunde04\.de/i.test(fs.readFileSync(path.join(ROOT, "assets", "js", "anmeldung", f), "utf8")));
  ok("Adresse der Geschäftsstelle: steht nicht fest in hilfen.js und seiten-ende.js (sie kommt aus konfig.verein.mail)", fest.length === 0, fest.join(", "));
}

// Liest den Abschnitt „So schicken Sie die Datei an den Verein“ von der Fertig-Seite
const leseSenden = (page) =>
  page.evaluate(() => {
    const sicht = (e) => !!e && e.checkVisibility();
    const gross = (e) => (e ? parseFloat(getComputedStyle(e).fontSize) : 0);
    const a = document.querySelector("#anmeldung [data-senden]");
    if (!a) return null;
    const adresse = a.querySelector("[data-mail-adresse]");
    const kopieren = a.querySelector('button[data-aktion="adresse-kopieren"]');
    const link = a.querySelector('a[data-aktion="mail-oeffnen"]');
    const status = a.querySelector("[data-mail-status]");
    const rb = (e) => (e ? e.getBoundingClientRect() : null);
    return {
      sichtbar: sicht(a),
      titel: (a.querySelector("h3") || {}).textContent || "",
      einleitung: ((a.querySelector(":scope > p.anm-text") || {}).textContent || "").trim(),
      wege: Array.from(a.querySelectorAll("[data-weg]")).map((w) => ({
        art: w.getAttribute("data-weg"),
        titel: w.querySelector("h4") ? w.querySelector("h4").textContent : null,
        schritte: Array.from(w.querySelectorAll("ol > li")).map((li) => li.textContent.trim()),
        nummeriert: !!w.querySelector("ol"),
      })),
      adresse: adresse ? adresse.textContent : null,
      adresseDir: adresse ? adresse.getAttribute("dir") : null,
      adresseSchrift: gross(adresse),
      adresseMarkierbar: adresse ? getComputedStyle(adresse).userSelect : null,
      kopieren: kopieren && { text: kopieren.textContent.trim(), sichtbar: sicht(kopieren), breite: Math.round(rb(kopieren).width), hoehe: Math.round(rb(kopieren).height), typ: kopieren.getAttribute("type") },
      link: link && { text: link.textContent.trim(), href: link.getAttribute("href"), target: link.getAttribute("target"), rel: link.getAttribute("rel"), sichtbar: sicht(link), hoehe: Math.round(rb(link).height), breite: Math.round(rb(link).width) },
      status: status ? status.textContent : null,
      statusRolle: status ? status.getAttribute("role") : null,
      hinweise: Array.from(a.querySelectorAll("p.anm-hinweis")).map((p) => p.textContent.trim()),
      auswahl: String(window.getSelection()),
      querScroll: document.documentElement.scrollWidth > window.innerWidth,
      seitenText: document.getElementById("anmeldung").innerText.replace(/\s+/g, " "),
      naechste: ((document.querySelector("#anmeldung .anm-naechste") || {}).textContent || "").replace(/\s+/g, " ").trim(),
    };
  });

// Zurück zur Prüfseite und wieder vor: Die Fertig-Seite wird neu gezeichnet (die Datei bleibt, nur die Ansicht entsteht neu)
async function zeichneFertigNeu(page) {
  await page.click('#anmeldung [data-aktion="zurueck"]');
  await page.waitForFunction(() => document.getElementById("anmeldung").dataset.schritt === "pruefen", { timeout: 5000 });
  await page.click('#anmeldung [data-aktion="weiter"]');
  await page.waitForFunction(() => document.getElementById("anmeldung").dataset.schritt === "fertig" && document.querySelector('#anmeldung [data-status="fertig"]'), { timeout: 20000 });
}

// Paket P6 (12.10.2026): Texte und Hinweise auf einzelnen Seiten, im Durchlauf je Beispiel gemessen: „Nur unterstützen“ (U-02), der Hinweis zum Kinderreisepass (U-09),
// der Aufklapper „Mehr erfahren“ unter den Nachweisen (U-10), „Sie haben wenig Geld?“ nicht doppelt (B-3)
async function pruefeSeitenP6(browser, server, dateien, beispiele) {
  console.log("\n=== Paket P6: einzelne Seiten (390 x 844) ===");
  const de = await ladeWoerterbuch();
  const sicht = (page) =>
    page.evaluate(() => {
      const wenig = Array.from(document.querySelectorAll("#anmeldung .anm-hinweis")).filter((p) => /wenig Geld/.test(p.textContent) && !p.closest("details"));
      return wenig.length === 1 && wenig[0].checkVisibility();
    });
  const m = {};
  for (const id of ["kind-neu", "herren-wechsel"]) {
    const page = await neueSeite(browser, server, MOBIL, "p6-" + id);
    await ladeBeispielPerKnopf(page, id);
    const ctx = neuerKontext({ name: "p6-" + id, vp: MOBIL, modus: "beispiel", gesehen: new Set(), touch: true, axeImmer: false, dateien });
    const d = (m[id] = { seiten: [] });
    ctx.proSeite = async (p, s, kennung) => {
      d.seiten.push(kennung);
      if (kennung === "abteilung/haupt") d.abteilung = await p.$$eval("#anmeldung .anm-karte__hinweis", (l) => l.map((e) => e.textContent.trim()));
      if (kennung === "pass/deutsch") d.pass = await p.$$eval("#anmeldung .anm-hinweis", (l) => l.map((e) => e.textContent.trim()));
      if (kennung.startsWith("nachweise/")) d.nachweise = [...(d.nachweise || []), ...(await p.$$eval("#anmeldung section.anm-nachweis details > summary", (l) => l.map((e) => e.textContent.trim())))];
      if (kennung === "leistungen/haupt") {
        // B-3: bei „Nein“ steht die Zeile, bei „Ja“ steht sie nicht noch einmal (der Hinweis zum Beitragserlass beginnt mit demselben Satz); danach wieder die Antwort des Beispiels
        const waehle = (wert) => p.evaluate((w) => document.querySelector('#anmeldung input[data-pfad="leistungen"][value="' + w + '"]').closest("label").click(), wert);
        const vorher = await p.$eval('#anmeldung input[data-pfad="leistungen"]:checked', (e) => e.value).catch(() => "nein");
        await waehle("nein");
        const beiNein = await sicht(p);
        await waehle("ja");
        const beiJa = await sicht(p);
        await waehle(vorher);
        d.leistungen = { beiNein, beiJa };
      }
    };
    await laufe(page, ctx);
    await page.close();
  }
  const kind = m["kind-neu"];
  const selbst = m["herren-wechsel"];
  ok("Abteilung (U-02): „Nur unterstützen“ sagt bei „Mein Kind“ „" + de.abteilung.passivHinweis.kind + "“, bei „Ich selbst“ „" + de.abteilung.passivHinweis.selbst + "“", !!kind.abteilung && kind.abteilung.includes("Ihr Kind ist Mitglied. Es macht keinen Sport.") && !kind.abteilung.includes("Sie sind Mitglied. Sie machen keinen Sport.") && !!selbst.abteilung && selbst.abteilung.includes("Sie sind Mitglied. Sie machen keinen Sport.") && !selbst.abteilung.includes("Ihr Kind ist Mitglied. Es macht keinen Sport."), JSON.stringify({ kind: kind.abteilung, selbst: selbst.abteilung }));
  ok("Pass (U-09): „Ein deutscher Kinderreisepass zählt auch.“ steht bei „Mein Kind“, nicht bei „Ich selbst“ (Seite „Haben Sie einen deutschen Pass oder Ausweis?“ erreicht)", !!kind.pass && !!selbst.pass && kind.pass.includes(de.pass.deutsch.hinweis) && !selbst.pass.includes(de.pass.deutsch.hinweis), JSON.stringify({ kind: kind.pass, selbst: selbst.pass }));
  const nachweise = [...(kind.nachweise || []), ...(selbst.nachweise || [])];
  ok("Nachweise (U-10): der Aufklapper unter den Unterlagen heißt „Mehr erfahren“ (nicht „Warum?“), er enthält auch „So bekommen Sie sie“ und „Wo?“", nachweise.length > 0 && nachweise.every((t) => t === de.allgemein.mehrErfahren) && de.nachweise.warum === undefined, JSON.stringify(nachweise));
  // Wortlaut (U-03, U-04, U-05): „davor schon einmal“ statt „in den letzten 6 Monaten“; der Hinweis zum Trainer am Feld für Medikamente; im Englischen „the authorities“ für das Amt
  const en = (await import(pathToFileURL(path.join(ROOT, "assets", "js", "anmeldung", "texte", "en-oberflaeche.js")).href)).default;
  const w = de.abmeldung.wechsel;
  ok("Texte (U-03, U-04, U-05): „Wechselte Ihr Kind davor schon einmal?“ (Hinweis: früherer Wechsel in den letzten 6 Monaten); Medikamente: „Sprechen Sie mit dem Trainer.“; Englisch „the authorities“ statt „the office“",
    w.titel.kind === "Wechselte Ihr Kind davor schon einmal?" && w.titel.selbst === "Wechselten Sie davor schon einmal?" && w.hinweis === "Gemeint ist ein früherer Wechsel in den letzten 6 Monaten, nicht dieser." && w.hinweis.split(/\s+/).length <= 12 &&
      de.notfall.gesundheit.medikamenteHinweis === "Zum Beispiel Asthmaspray oder Adrenalin-Pen. Sprechen Sie mit dem Trainer." && /Then the authorities often pay the membership fee\./.test(en.leistungen.hinweis) && !/the office often pays/.test(en.leistungen.hinweis),
    JSON.stringify({ wechsel: w, medikamente: de.notfall.gesundheit.medikamenteHinweis }));
  const leist = [kind.leistungen, selbst.leistungen].filter(Boolean);
  ok("Leistungen (B-3): „Sie haben wenig Geld? Sprechen Sie mit uns.“ steht bei „Nein“ einmal da und bei „Ja“ nicht noch einmal neben dem Hinweis zum Beitragserlass", leist.length > 0 && leist.every((x) => x.beiNein === true && x.beiJa === false), JSON.stringify(leist));
}

// Fertig-Seite am Handy: der Abschnitt, die Adresse, Kopieren (mit und ohne Zwischenablage), der mailto-Link, die Reihenfolge der Wege, der Papierweg
async function pruefeMailAnVerein(browser, server, dateien, beispiele) {
  console.log("\n=== M10: Fertig-Seite – Datei per E-Mail an die Geschäftsstelle (390 x 844) ===");
  const de = await ladeWoerterbuch();
  const T = de.fertig;
  const adresse = server.konfig.verein.mail;
  const profil = profilKindNeu(beispiele, server);
  const schritt = (vorlage, knopf) => vorlage.replace("{knopf}", knopf);
  const anhangHinweis = T.senden.anhang.replace("{knopf}", T.senden.oeffnen);
  // Ein Handy-Browser, der Dateien teilen kann: Der Knopf „Datei teilen“ ist da, und der Abschnitt zeigt den Weg am Handy
  const mitTeilen = async (page) => {
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "canShare", { value: () => true, configurable: true });
      Object.defineProperty(navigator, "share", { value: () => Promise.resolve(), configurable: true });
    });
  };
  await browser.defaultBrowserContext().overridePermissions(server.basis, ["clipboard-read", "clipboard-write"]);
  const page = await neueSeite(browser, server, MOBIL, "mail-an-verein", { vorLaden: mitTeilen });
  await ladeBeispielPerKnopf(page, "kind-neu");
  const ctx = neuerKontext({ name: "mail-an-verein", vp: MOBIL, modus: "beispiel", gesehen: new Set(), touch: true, axeImmer: false, dateien });
  const r = await laufe(page, ctx);
  const erreicht = r.besucht[r.besucht.length - 1].startsWith("fertig");
  const daten = erreicht ? await ergebnisPruefen(page, ctx, dateien) : null;
  ok("Fertig-Seite am Handy: bis „fertig“ durchgeklickt, Datei erstellt", erreicht && !!daten, r.besucht.length + " Seiten");
  if (!daten) {
    await page.close();
    return;
  }

  // 1. Der Abschnitt mit „Datei teilen“ und am Handy: beide Wege, der Weg am Handy zuerst
  let d = await leseSenden(page);
  ok("Fertig-Seite: der Abschnitt „So schicken Sie die Datei an den Verein“ ist da und sichtbar (Überschrift h3)", !!d && d.sichtbar && d.titel === "So schicken Sie die Datei an den Verein", d && d.titel);
  ok("Fertig-Seite: kein Satz unter der Überschrift (die Überschrift „So schicken Sie die Datei an den Verein“ sagt schon, was zu tun ist; P3 Teil b)", !!d && d.einleitung === "", d && d.einleitung);
  const coarse = await page.evaluate(() => window.matchMedia("(pointer: coarse)").matches);
  ok("Fertig-Seite: mit „Datei teilen“ am Handy nur ein Weg (der Weg am Handy), nummeriert, drei Schritte, ohne Überschrift (P3 Teil b)", !!d && d.wege.length === 1 && d.wege[0].art === (coarse ? "handy" : "computer") && d.wege[0].titel === null && d.wege[0].nummeriert && d.wege[0].schritte.length === 3, d && d.wege.map((w) => w.art + ":" + w.titel).join(",") + " (pointer coarse: " + coarse + ")");
  const handy = d && d.wege.find((w) => w.art === "handy");
  ok("Weg am Handy (U-01): Adresse kopieren, Datei teilen und Mail-Programm wählen (Datei schon angehängt), Adresse bei „An“ einfügen (drei Schritte, Knöpfe „Adresse kopieren“ und „Datei teilen“, ohne Überschrift „Am Handy“)",
    !!handy && handy.titel === null && handy.schritte.length === 3 && handy.schritte[0] === schritt(T.senden.handy1, T.senden.kopieren) && handy.schritte[0] === "Tippen Sie unten auf „Adresse kopieren“." && handy.schritte[1] === schritt(T.senden.handy2, T.teilen) && handy.schritte[1] === "Tippen Sie oben auf „Datei teilen“. Wählen Sie Ihr Mail-Programm. Die Datei ist schon angehängt." && handy.schritte[2] === "Fügen Sie die Adresse bei „An“ ein. Senden Sie die E-Mail.", handy && handy.schritte.join(" | "));
  // Die Knöpfe, auf die die Schritte zeigen, gibt es wirklich und heißen so
  const knoepfe = await page.$$eval('#anmeldung .anm-ergebnis > .anm-knoepfe [data-aktion]', (l) => l.filter((e) => !e.hidden).map((e) => ({ aktion: e.getAttribute("data-aktion"), text: e.textContent.trim() })));
  ok("Die Knöpfe „Datei teilen“ und „Datei herunterladen“ stehen über dem Abschnitt, mit der Beschriftung aus den Schritten", knoepfe.some((k) => k.aktion === "teilen" && k.text === "Datei teilen") && knoepfe.some((k) => k.aktion === "herunterladen" && k.text === "Datei herunterladen"), JSON.stringify(knoepfe));

  // 2. Die Adresse: sichtbar, groß, richtig, ein Tipp markiert sie
  ok("Adresse der Geschäftsstelle: steht groß im Abschnitt und ist die Adresse aus der Konfiguration (" + adresse + ")", !!d && d.adresse === adresse && d.adresseSchrift >= 18, d && d.adresse + " (" + (d && d.adresseSchrift) + " px)");
  ok("Adresse: von links nach rechts (dir=ltr) und mit einem Tipp ganz zu markieren (user-select: all)", !!d && d.adresseDir === "ltr" && d.adresseMarkierbar === "all", d && d.adresseDir + ", " + d.adresseMarkierbar);
  // 3. Knopf „Adresse kopieren“ und Link „E-Mail an die Geschäftsstelle öffnen“
  ok("Knopf „Adresse kopieren“ ist da (Button, sichtbar, mindestens 44 px hoch)", !!d && !!d.kopieren && d.kopieren.text === "Adresse kopieren" && d.kopieren.sichtbar && d.kopieren.typ === "button" && d.kopieren.hoehe >= 44 && d.kopieren.breite >= 44, JSON.stringify(d && d.kopieren));
  ok("Link „E-Mail an die Geschäftsstelle öffnen“ ist da (sichtbar, mindestens 44 px hoch), ohne target und ohne ext://", !!d && !!d.link && d.link.text === "E-Mail an die Geschäftsstelle öffnen" && d.link.sichtbar && d.link.hoehe >= 44 && d.link.target === null && /^mailto:/.test(d.link.href), JSON.stringify(d && d.link));
  // mailto: An, Betreff „Anmeldung Vorname Nachname“ und der deutsche Text, richtig kodiert
  const soll = "mailto:" + adresse + "?subject=" + encodeURIComponent("Anmeldung " + profil.vorname + " " + profil.nachname) + "&body=Guten%20Tag%2C%0D%0A%0D%0Aanbei%20die%20Anmeldung%20als%20PDF.%0D%0A%0D%0AViele%20Gr%C3%BC%C3%9Fe";
  const z = d && d.link && /^mailto:([^?]*)\?subject=([^&]*)&body=([^&]*)$/.exec(d.link.href);
  ok("mailto-Link: An die Adresse der Geschäftsstelle, Betreff „Anmeldung " + profil.vorname + " " + profil.nachname + "“, Text „Guten Tag, anbei die Anmeldung als PDF. Viele Grüße“ (kodiert)", !!z && d.link.href === soll && z[1] === adresse && decodeURIComponent(z[2]) === "Anmeldung " + profil.vorname + " " + profil.nachname && decodeURIComponent(z[3]) === "Guten Tag,\r\n\r\nanbei die Anmeldung als PDF.\r\n\r\nViele Grüße", d && d.link && d.link.href);
  ok("Hinweis zum Anhang (U-01): „Bei „E-Mail an die Geschäftsstelle öffnen“ hängen Sie die Datei selbst an.“ steht beim Link (am Handy); der Hinweis zu WhatsApp bleibt im Abschnitt", !!d && d.hinweise.includes(anhangHinweis) && anhangHinweis === "Bei „E-Mail an die Geschäftsstelle öffnen“ hängen Sie die Datei selbst an." && d.hinweise.includes("Bitte schicken Sie die Datei nicht per WhatsApp. Sie enthält private Daten."), d && d.hinweise.join(" | "));
  // D-06: „So geht es weiter“ endet mit „Danach prüft der Verein Ihre Anmeldung.“
  ok("Fertig-Seite (D-06): „So geht es weiter“ endet mit „Danach prüft der Verein Ihre Anmeldung.“ (genau einmal)", !!d && d.naechste.endsWith("Danach prüft der Verein Ihre Anmeldung.") && (d.naechste.match(/Danach prüft der Verein/g) || []).length === 1, d && d.naechste.slice(-120));
  // Alter Wortlaut weg, WhatsApp-Satz genau einmal
  ok("Der alte Wortlaut zum Abgeben im Verein ist von der Fertig-Seite verschwunden (auch „Geben Sie ihn getrennt ab“ und „Bringen Sie sie mit“; M11)", !!d && !/Bringen Sie die Datei auf dem Handy mit|Geben Sie die Unterlagen im Verein ab|Oder geben Sie sie ausgedruckt ab|getrennt ab\b|getrennt abgeben|Bringen Sie sie mit|im Verein ab\b/.test(d.seitenText), d ? (d.seitenText.match(/.{0,40}(getrennt ab|Bringen Sie sie mit|im Verein ab).{0,30}/) || [""])[0] : "");
  ok("Der Hinweis zu WhatsApp steht genau einmal auf der Fertig-Seite (im Abschnitt, nicht noch einmal unter „So geht es weiter“)", !!d && (d.seitenText.match(/nicht per WhatsApp/g) || []).length === 1 && !/WhatsApp/.test(d.naechste), d && String((d.seitenText.match(/nicht per WhatsApp/g) || []).length));
  ok("„So geht es weiter“ bleibt mit den übrigen Schritten (Unterschriften, Teil C: „Der Verein bewahrt ihn getrennt auf.“), ohne Schritt zum Abgeben", !!d && /Sie haben alles am Bildschirm unterschrieben/.test(d.naechste) && /Teil C enthält Gesundheitsdaten\. Der Verein bewahrt ihn getrennt auf\./.test(d.naechste) && !/ab\.$|im Verein ab|getrennt ab\b/.test(d.naechste), d && d.naechste.slice(0, 200));
  ok("Fertig-Seite: kein Querscrollen", !!d && !d.querScroll, "");

  // 4. Zwischenablage: Kopieren legt die Adresse in die Zwischenablage, der Status meldet es
  await page.bringToFront();
  await page.evaluate(() => window.getSelection().removeAllRanges());
  await page.click('#anmeldung [data-aktion="adresse-kopieren"]');
  await page.waitForFunction(() => (document.querySelector("[data-mail-status]") || {}).textContent !== "", { timeout: 4000 }).catch(() => {});
  d = await leseSenden(page);
  const zwischenablage = await page.evaluate(() => navigator.clipboard.readText().catch((e) => "FEHLER " + e.message));
  ok("Kopieren (mit Zwischenablage): die Adresse liegt in der Zwischenablage, der Status sagt „" + T.senden.kopiert + "“ (role=status)", zwischenablage === adresse && d.status === T.senden.kopiert && d.statusRolle === "status", "Zwischenablage: " + zwischenablage + "; Status: " + d.status);

  // Ohne Zwischenablage (zum Beispiel in der App): die Adresse wird markiert, Meldung „Kopieren geht hier nicht …“; klappt der ältere Weg, steht „kopiert“
  const stelle = (clipboardWert, kopierenKlappt) =>
    page.evaluate((cw, klappt) => {
      Object.defineProperty(navigator, "clipboard", { value: cw === "weg" ? undefined : { writeText: () => Promise.reject(new Error("verweigert")) }, configurable: true });
      document.execCommand = () => klappt;
      document.querySelector("[data-mail-status]").textContent = "";
      window.getSelection().removeAllRanges();
    }, clipboardWert, kopierenKlappt);
  await stelle("weg", false);
  await page.click('#anmeldung [data-aktion="adresse-kopieren"]');
  d = await leseSenden(page);
  ok("Kopieren (ohne Zwischenablage, ohne älteren Weg): die Adresse ist markiert (Text markierbar), der Status sagt „" + T.senden.kopierenFehler + "“", d.status === T.senden.kopierenFehler && d.auswahl === adresse, "Status: " + d.status + "; markiert: " + d.auswahl);
  await stelle("verweigert", false);
  await page.click('#anmeldung [data-aktion="adresse-kopieren"]');
  await page.waitForFunction(() => (document.querySelector("[data-mail-status]") || {}).textContent !== "", { timeout: 4000 }).catch(() => {});
  d = await leseSenden(page);
  ok("Kopieren (Zwischenablage verweigert, älterer Weg klappt nicht): Meldung „Kopieren geht hier nicht …“, Adresse markiert", d.status === T.senden.kopierenFehler && d.auswahl === adresse, "Status: " + d.status + "; markiert: " + d.auswahl);
  await stelle("verweigert", true);
  await page.click('#anmeldung [data-aktion="adresse-kopieren"]');
  await page.waitForFunction(() => (document.querySelector("[data-mail-status]") || {}).textContent !== "", { timeout: 4000 }).catch(() => {});
  d = await leseSenden(page);
  ok("Kopieren (Zwischenablage verweigert, älterer Weg klappt): die Adresse ist markiert und kopiert, Status „" + T.senden.kopiert + "“", d.status === T.senden.kopiert && d.auswahl === adresse, "Status: " + d.status + "; markiert: " + d.auswahl);
  await page.screenshot({ path: path.join(AUSGABE, MOBIL.name, "fertig-mail-an-verein.png"), fullPage: true });
  protokoll.screenshots++;
  // Tippflächen, axe-core, Konsole
  const klein = (await kleineTippflaechen(page)).filter((k) => /Adresse kopieren|E-Mail an die Geschäftsstelle/.test(k));
  ok("Tippflächen des Abschnitts mindestens 44 px", klein.length === 0, klein.join(" | "));
  const axeOk = await axePruefen(page, "M10 Fertig-Seite mit E-Mail-Abschnitt (390 px)");
  ok("axe-core: keine Verstöße critical/serious auf der Fertig-Seite mit dem Abschnitt", axeOk, "");

  // 5. Reihenfolge der Wege: am Computer mit „Datei teilen“ steht der Weg am Computer vorn; ohne „Datei teilen“ nur ein Weg, ohne Überschrift
  await page.evaluate(() => {
    const echt = window.matchMedia.bind(window);
    window.matchMedia = (q) => (/\(pointer:\s*coarse\)/.test(q) ? { matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} } : echt(q));
  });
  await zeichneFertigNeu(page);
  d = await leseSenden(page);
  const computer = d && d.wege.find((w) => w.art === "computer");
  ok("Am Computer mit „Datei teilen“: nur der Weg über das Herunterladen, ohne Überschrift (P3 Teil b)", !!d && d.wege.length === 1 && !!computer && computer.titel === null, d && d.wege.map((w) => w.art + ":" + w.titel).join(", "));
  ok("Weg am Computer: Datei herunterladen, E-Mail mit Anhang, an die Adresse schicken (drei Schritte, Knopf als „Datei herunterladen“)", !!computer && computer.schritte[0] === schritt(T.senden.computer1, T.herunterladen) && computer.schritte[0] === "Klicken Sie oben auf „Datei herunterladen“." && /Hängen Sie die Datei an\./.test(computer.schritte[1]) && computer.schritte[2] === "Schicken Sie die E-Mail an die Adresse unten.", computer && computer.schritte.join(" | "));
  ok("Am Computer (U-01): „Hängen Sie die Datei an“ steht nur einmal im Abschnitt (im zweiten Schritt); der Hinweis beim Link entfällt, der zu WhatsApp bleibt", !!d && !d.hinweise.includes(anhangHinweis) && !d.hinweise.some((x) => /hängen Sie die Datei/i.test(x)) && d.hinweise.includes("Bitte schicken Sie die Datei nicht per WhatsApp. Sie enthält private Daten."), d && d.hinweise.join(" | "));
  await page.evaluate(() => {
    Object.defineProperty(navigator, "canShare", { value: undefined, configurable: true });
  });
  await zeichneFertigNeu(page);
  d = await leseSenden(page);
  const knopfTeilen = await page.$('#anmeldung [data-aktion="teilen"]:not([hidden])');
  ok("Ohne „Datei teilen“ (Knopf fehlt): nur der Weg über das Herunterladen, ohne Überschrift „Am Computer“ (er gilt auch am Handy)", !knopfTeilen && !!d && d.wege.length === 1 && d.wege[0].art === "computer" && d.wege[0].titel === null && d.wege[0].schritte.length === 3 && !/Datei teilen|Am Handy/.test(d.seitenText.slice(d.seitenText.indexOf("So schicken Sie die Datei an den Verein"))), d && d.wege.map((w) => w.art + ":" + w.titel).join(", "));
  ok("Ohne „Datei teilen“ bleiben Adresse, Kopieren und mailto-Link", !!d && d.adresse === adresse && !!d.kopieren && !!d.link && d.link.href === soll, d && d.link && d.link.href);
  ok("keine Fehler in der Konsole", page.__st.konsole.length === 0, page.__st.konsole.slice(0, 3).join(" | "));
  await page.close();

  // 6. Alles auf Papier, selbst ausdrucken: Foto oder Scan der unterschriebenen Blätter per E-Mail, oder die Blätter im Verein abgeben (M11); beim ersten Training („training“) nicht
  console.log("--- Alles auf Papier ---");
  for (const wahl of ["selbst_drucken", "training"]) {
    const seite = await neueSeite(browser, server, MOBIL, "mail-an-verein-papier-" + wahl);
    await ladeBeispielPerKnopf(seite, "kind-neu");
    const c = neuerKontext({ name: "mail-an-verein-papier-" + wahl, vp: MOBIL, modus: "beispiel", gesehen: new Set(), touch: true, axeImmer: false, dateien, papier: true });
    c.vorWeiter = async (p, s) => {
      if (s.schritt !== "unterschriften") return;
      const id = await p.$eval('#anmeldung input[data-pfad="hfvUnterschrift"][data-wert="' + wahl + '"]', (e) => e.id);
      await p.click('#anmeldung label[for="' + id + '"]');
    };
    const lauf = await laufe(seite, c);
    const fertig = lauf.besucht[lauf.besucht.length - 1].startsWith("fertig");
    const ergebnis = fertig ? await ergebnisPruefen(seite, c, dateien) : null;
    const dd = ergebnis ? await leseSenden(seite) : null;
    ok("Papier (" + wahl + "): bis „fertig“, Datei erstellt, der Abschnitt zum Schicken per E-Mail steht da", fertig && !!ergebnis && !!dd && dd.titel === "So schicken Sie die Datei an den Verein" && dd.adresse === adresse, lauf.besucht.length + " Seiten");
    if (dd) {
      const abgeben = T.abgebenAusgedruckt;
      ok("Papier (" + wahl + "): " + (wahl === "selbst_drucken" ? "„So geht es weiter“ nennt den Ausdruck und dazu „" + abgeben + "“" : "„So geht es weiter“: Alle Blätter beim ersten Training, kein Satz zum ausgedruckten Teil B"), wahl === "selbst_drucken" ? dd.naechste.includes(T.unterschriftDrucken) && dd.naechste.includes(abgeben) : dd.naechste.includes(T.unterschriftTrainingAlle) && !dd.naechste.includes(abgeben), dd.naechste.slice(0, 220));
    }
    ok("Papier (" + wahl + "): keine Fehler in der Konsole", seite.__st.konsole.length === 0, seite.__st.konsole.slice(0, 3).join(" | "));
    await seite.close();
  }
}

// Die Namen der Beitragsgruppen kommen aus den Texten der Sprache (Nachbesserung sprache-16): Auf Deutsch stehen sie wie in den Daten;
// mit einem abgefangenen englischen Wörterbuch erscheinen die englischen Namen. (Die Übungszeiten der Karnevalgruppen sind mit dem Schritt
// "karneval" entfallen, Entscheidung der 1. Vorsitzenden vom 11.10.2026.)
async function pruefeUebersetzbareDaten(browser, server) {
  console.log("\n=== N-A2: Beitragsgruppen übersetzbar ===");
  const gruppen = server.konfig.anmeldung.beitragsgruppen;
  // Deutsch: wie in den Daten
  const de = await seiteMitBeispiel(browser, server, MOBIL, "daten-de", "karneval-kind", "beitrag");
  const nachBeitragDe = await stand(de);
  const kartenBeitragDe = await de.$$eval("#anmeldung .anm-karte .anm-karte__titel", (l) => l.map((k) => k.textContent.trim()));
  ok("Beitragsgruppen (Deutsch): Namen wie in data/anmeldung.json", nachBeitragDe.schritt === "beitrag" && kartenBeitragDe.length > 0 && kartenBeitragDe.every((t) => Object.values(gruppen).some((g) => t.startsWith(g.bezeichnung))), kartenBeitragDe.join(" | "));
  await de.close();

  // Englisch mit abgefangenem Wörterbuch: Namen der Beitragsgruppen
  const grNamen = { fussball_jugend: "Children and youth (football, with U19)", karneval_kinder: "Children and youth (carnival)" };
  const abfangen = async (page) => {
    await page.setRequestInterception(true);
    page.on("request", async (req) => {
      const u = req.url();
      const eins = /\/texte\/en-regeln\.js$/.exec(u);
      if (!eins) return req.continue();
      const original = await (await fetch(u)).text();
      const zusatz = `;export default { ...__orig, beitrag: { ...__orig.beitrag, gruppen: ${JSON.stringify(grNamen)} } };`;
      req.respond({ status: 200, contentType: "text/javascript; charset=utf-8", body: original.replace(/export default \{/, "const __orig = {") + "\n" + zusatz });
    });
  };
  const en = await neueSeite(browser, server, MOBIL, "daten-en", { vorLaden: abfangen });
  await ladeBeispielPerKnopf(en, "karneval-kind");
  await en.click('[data-anm-sprachleiste] button[data-sprache="en"]');
  await en.waitForFunction(() => document.getElementById("anmeldung").getAttribute("lang") === "en", { timeout: 6000 });
  const nachBeitragEn = await geheBis(en, "beitrag", "gruppe");
  const kartenBeitragEn = await en.$$eval("#anmeldung .anm-karte .anm-karte__titel", (l) => l.map((k) => k.textContent.replace(/[⁦-⁩]/g, "").trim()));
  const vorschlagEn = await en.$$eval("#anmeldung .anm-text--gross", (l) => l.map((k) => k.textContent.replace(/[⁦-⁩]/g, "").trim()));
  const beitragSeite = nachBeitragEn.schritt === "beitrag";
  ok("Beitragsgruppen (Englisch): die Auswahl nennt die Namen aus den Texten der Sprache; fehlt ein Name dort, gilt der Name aus den Daten", beitragSeite && kartenBeitragEn.some((t) => t.startsWith(grNamen.karneval_kinder)) && kartenBeitragEn.every((t) => Object.keys(grNamen).some((k) => t.startsWith(grNamen[k])) || Object.values(gruppen).some((g) => t.startsWith(g.bezeichnung))), kartenBeitragEn.join(" | "));
  // Seit P3 Teil b gibt es die Zeile „Wir schlagen vor: …“ nicht mehr (O1); der Vorschlag ist die vorgewählte, offen sichtbare Karte.
  const vorgewaehltEn = await en.$eval('#anmeldung input[data-pfad="beitrag.gruppe"]:checked', (e) => e.closest("label").querySelector(".anm-karte__titel").textContent.replace(/[⁦-⁩]/g, "").trim()).catch(() => "");
  ok("Beitragsgruppen (Englisch): die vorgewählte Gruppe (der Vorschlag, offen sichtbar) trägt den Namen aus den Texten der Sprache", vorgewaehltEn.startsWith(grNamen.karneval_kinder), vorgewaehltEn + (vorschlagEn.length ? " | " + vorschlagEn.join(" | ") : ""));
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
