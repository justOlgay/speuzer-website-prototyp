#!/usr/bin/env node
// Browser-Test der Bestellseite „Bestellung für dein Team“ (Arbeitspakete AP-1 und AP-2: Code-Schutz, Angebotspreise, Aufdrucke, Sponsor, Lieferung).
//
// Baut selbst, aber nicht im Arbeitsordner: Die Seite wird in einem Wegwerf-Ordner unter tools/cache/ mit einem Paket aus erfundenen Testpreisen
// und einem Testcode neu gebaut (Umgebungsvariable BESTELLUNG_PREISE_ENC, testbau.mjs). So hängt der Test nicht an der mitgelieferten Datei
// data/bestellung-preise.enc.json. docs/ und dist/ des Arbeitsordners werden nur gelesen (statische Prüfungen: Sitemap, appack-Paket, Verweise;
// dafür muss vorher gebaut sein: npm run build). Ein kleiner statischer Server liefert eine Kopie der nötigen Dateien des Wegwerf-Baus aus (freier
// Port, nie 4173, siehe testserver.mjs); gesteuert wird Chrome (puppeteer-core, headless). Jeder Ablauf läuft in einem eigenen Browser-Kontext
// (eigener Speicher). Es gehen keine Anfragen ins Netz; ein Klick auf den mailto-Link wird abgefangen (nichts öffnet ein Mailprogramm).
//
// Geprüft wird:
//   - statisch: nicht in der Sitemap, nicht im appack-Paket, noindex, Konfiguration (ohne Preise, mit dem verschlüsselten Paket) und Verweise im
//     gebauten HTML; im ausgelieferten HTML und JS steht kein Testpreis, kein Listenpreis, kein Rabattsatz
//   - Zugang: ohne Code nur Kopf, Prototyp-Hinweis und Zugangsbox (kein Formular im DOM); falscher Code, „Einen Moment …“ mit gesperrtem Knopf,
//     richtiger Code (auch in anderer Schreibweise, mit Enter), ?code= im Link (der Parameter verschwindet aus der Adresse), Neuladen öffnet ohne
//     Eingabe, „Code auf diesem Gerät vergessen“, ein ausgetauschter Code, beschädigte oder unvollständige Preisdaten, fehlendes Web Crypto
//   - 390 x 844: das leere Formular, Klick auf „Senden“ ohne Pflichtangaben (Lückenliste, Fokus auf die erste, kein mailto), die Referenzbestellung (a)
//     nur über die Oberfläche (tippen, auswählen, klicken) gegen den erwarteten Text aus faelle.mjs (Betreff, Text in „Mail ansehen“, mailto-Link),
//     Senden (mailto abgefangen, Meldung, Bestell-Nr. bleibt), Text kopieren, Neuladen (Entwurf bleibt), „Neue Bestellung beginnen“ (Rückfrage, Entwurf
//     leer, Absender samt Lieferanschrift bleibt), die Fälle (b) und (c)
//   - Aufdrucke je Artikel (Kästchen, Zuschläge, Preiszeile, Preis und Teil 1 ändern sich), Sponsor-Block, Lieferanschrift (gemerkt), doppelte Nummern
//   - Größen und Vorauswahl, Initialen, Teambedarf, Bezahlung als Mehrfachauswahl, Tastatur; alte Entwürfe mit Text statt Liste, ohne Aufdrucke und ohne
//     Lieferanschrift laden ohne Fehler
//   - lange Bestellung (Hinweis, mailto nie gekürzt), Zwischenablage mit und ohne Rückfall, localStorage wirft Fehler und kaputte gespeicherte Daten
//   - kein waagrechtes Scrollen ab 320 px, die Auswahl der Größe ist nie abgeschnitten, keine Konsolenfehler, keine Anfragen nach außen,
//     Tippflächen mindestens 44 px, axe-core ohne Verstöße; ein Durchlauf bei 1440 x 900 (Spalte höchstens 720 px)
//   - Produktbilder (AP-3): die zehn Kacheln im Bau (WebP, 144 x 144, gleich den Quellen); in jeder Artikelzeile ein geladenes Bild (naturalWidth 144),
//     Klick aufs Bild hakt an, Kästchen, Bild, Text und Preis in einer Zeile ohne Überlappung (360 bis 414 px, 1440 px; auch mit „ab“-Preisen und
//     „Preis auf Anfrage“), kein waagrechtes Scrollen, der Hinweis „Produktbilder: JAKO“, leere Kachel ohne bild in den Daten, Ladefehler eines Bildes,
//     Adressen auch unter einem Unterordner (GitHub Pages)
//   - Bildschirmfotos nach tools/cache/bestellung-test/ (390-zugang, 390-ausgefuellt, 390-aufdrucke, 390-sponsor-lieferung, 390-luecken, 1440-ausgefuellt,
//     390-bilder, 1440-bilder, …)
//
// Aufruf: node tools/bestellung-test/e2e.mjs [--ausfuehrlich] [--nur=zugang,leer,…]   (--nur nur zum Entwickeln: einzelne Abläufe)
// Chrome-Tests nie über eine Pipe laufen lassen (der Chrome-Updater hält den Ausgabekanal offen): die Ausgabe in eine Datei umleiten.
// Ausgabe: eine Zeile je Fehler (sonst nur die Abschnitte), am Ende die Zusammenfassung; Exit 0 nur, wenn alles bestanden ist.

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";
import { DOCS, starteTestserver } from "./testserver.mjs";
import { baueMitTestdaten } from "./testbau.mjs";
import { DATEN, FAELLE, FALL_A, FALL_B, FALL_C, GRUNDAUSSTATTUNG, KONFIG, STANDARD, TESTCODE, TESTPREISE, bestellung, kopieTestpreise, person } from "./faelle.mjs";
import { kopierText, stueckpreis } from "../../assets/js/bestellung/mailtext.js";
import { TEXT_HINWEIS_SPONSOR, TEXT_LEAD } from "../../assets/js/bestellung/formular.js";
import { verschluessele } from "../../assets/js/bestellung/zugang.js";
import { baueKonfig } from "../../src/seiten/bestellung.mjs";
import { BILDER_ORDNER, BILD_KANTE, BILD_MAX_BYTES, webpMasse } from "./bilder.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const AXE = readFileSync(path.join(ROOT, "node_modules", "axe-core", "axe.min.js"), "utf8");
const AUSGABE = path.join(ROOT, "tools", "cache", "bestellung-test");
const AUSFUEHRLICH = process.argv.includes("--ausfuehrlich");
const NUR = (process.argv.find((a) => a.startsWith("--nur=")) || "").slice("--nur=".length).split(",").filter(Boolean);

const SCHLUESSEL_ENTWURF = "speuzer-bestellung-v1-entwurf";
const SCHLUESSEL_ABSENDER = "speuzer-bestellung-v1-absender";
const SCHLUESSEL_CODE = "speuzer-bestellung-v1-code";

const TEXT_GESENDET =
  "Dein Mailprogramm öffnet sich mit der fertigen Mail. Tippe dort auf „Senden“. Öffnet sich nichts? Dann „Text kopieren“ und an Bestellungen@sportfreunde04.de schicken.";
const TEXT_LANG = "Die Bestellung ist lang. Falls in der Mail etwas fehlt: „Text kopieren“ und einfügen.";
const TEXT_ZUGANG = "Diese Seite ist für Trainerinnen und Trainer. Gib den Code ein, den du vom Verein bekommen hast.";
const TEXT_CODE_FALSCH = "Der Code stimmt nicht. Bitte prüf ihn oder frag im Vorstand nach.";
const TEXT_DEFEKT = "Die Preisdaten dieser Seite sind beschädigt oder unvollständig. Bitte sag im Vorstand Bescheid.";
const TEXT_LUECKE_ORT = "Bitte PLZ und Ort angeben (z. B. 60439 Frankfurt)";
const ANSCHRIFT_TEXT = "Lieferung an: Lena Beispiel, Beispielweg 12, 60439 Frankfurt\n";

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

function gleichJson(name, ist, soll) {
  const a = JSON.stringify(ist);
  const b = JSON.stringify(soll);
  pruefe(name, a === b, `ist ${a}\n          soll ${b}`);
}

function abschnitt(titel) {
  console.log("\n" + titel);
}

const warte = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------- Vorbereitungen in der Seite (laufen vor jedem Skript der Seite) ----------

// Klicks auf mailto-Links werden aufgezeichnet und abgefangen. Wurde der Klick von der Seite selbst abgebrochen (Lücken), kommt er hier nicht an;
// sonst wäre es der Klick, der das Mailprogramm öffnet.
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

// Verzögert die Ableitung des Schlüssels (PBKDF2), damit der Test den Zustand „Einen Moment …“ sicher sieht; window.__ableitungen zählt sie
function verzoegereSchluessel(ms) {
  const echt = SubtleCrypto.prototype.deriveKey;
  window.__ableitungen = 0;
  SubtleCrypto.prototype.deriveKey = function (...a) {
    window.__ableitungen += 1;
    return new Promise((fertig) => setTimeout(fertig, ms)).then(() => echt.apply(this, a));
  };
}

// Web Crypto fehlt (Seite nicht über https, alter Browser)
function ohneWebCrypto() {
  Object.defineProperty(window.crypto, "subtle", { configurable: true, value: undefined });
}

// ---------- Browser, Seite, Protokoll ----------

// opt.zugang: "gemerkt" (Standard: erst gesperrt laden, den Code auf dem Gerät ablegen, neu laden: wie ein zweiter Besuch ohne Eingabe),
//             "manuell" (Code im Feld eintippen), "keiner" (gesperrt lassen)
// opt.aendereHtml: Funktion, die das ausgelieferte HTML der Seite verändert (beschädigte Preisdaten …)
async function oeffne(browser, server, opt = {}) {
  const {
    breite = 390, hoehe = 844, mobil = true, uhr = null, speicher = "normal", zwischenablage = "echt", dialogAntwort = true,
    zugang = "gemerkt", aendereHtml = null, langsam = 0, ohneSubtle = false, url = server.seite,
  } = opt;
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
  if (langsam) await page.evaluateOnNewDocument(verzoegereSchluessel, langsam);
  if (ohneSubtle) await page.evaluateOnNewDocument(ohneWebCrypto);
  if (aendereHtml) {
    await page.setRequestInterception(true);
    page.on("request", async (req) => {
      if (req.resourceType() === "document" && req.url().split("?")[0] === server.seite) {
        const original = await (await fetch(req.url())).text();
        req.respond({ status: 200, contentType: "text/html; charset=utf-8", body: aendereHtml(original) });
      } else {
        req.continue();
      }
    });
  }
  const r = { page, p, schliessen: () => kontext.close() };
  const hatSpeicher = speicher === "normal";
  if (zugang === "gemerkt" && hatSpeicher) {
    await lade(page, server, url);
    await page.evaluate((k, c) => localStorage.setItem(k, c), SCHLUESSEL_CODE, TESTCODE);
    await page.reload({ waitUntil: "networkidle0" });
    await page.waitForSelector('#bestellung[data-bereit][data-zustand="offen"]', { timeout: 30000 });
  } else if (zugang === "gemerkt" || zugang === "manuell") {
    await lade(page, server, url);
    await entsperre(page);
  } else {
    await lade(page, server, url);
  }
  return r;
}

async function lade(page, server, url = server.seite) {
  await page.goto(url, { waitUntil: "networkidle0" });
  await page.waitForSelector("#bestellung[data-bereit]", { timeout: 30000 });
}

// Lädt neu und wartet, bis die Seite wieder bereit ist (offen oder gesperrt)
async function neuLaden(page) {
  await page.reload({ waitUntil: "networkidle0" });
  await page.waitForSelector("#bestellung[data-bereit]", { timeout: 30000 });
}

// Den Code im Feld eintippen und öffnen
async function entsperre(page, code = TESTCODE) {
  await page.type("#bst-code", code);
  await page.click("[data-bst-oeffnen]");
  await page.waitForSelector('#bestellung[data-zustand="offen"]', { timeout: 30000 });
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
const texte = (page, auswahl) => page.$$eval(auswahl, (l) => l.map((x) => x.textContent.trim()));
const luecken = (page) => texte(page, "[data-luecke]");
const lueckenFelder = async (page) => (await page.$$eval("[data-luecke]", (l) => l.map((x) => x.getAttribute("data-luecke")))).join(",");
const fokus = (page) => page.evaluate(() => document.activeElement && (document.activeElement.id || document.activeElement.getAttribute("data-luecke") || document.activeElement.tagName));
const zustandVon = (page) => page.$eval("#bestellung", (el) => el.dataset.zustand);
const imSpeicher = (page, schluessel) => page.evaluate((k) => localStorage.getItem(k), schluessel);
const entwurfImSpeicher = async (page) => JSON.parse(await imSpeicher(page, SCHLUESSEL_ENTWURF));

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
  // Lieferanschrift: Der Name folgt „Dein Name“, solange man ihn nicht ändert
  if (b.lieferName !== null && b.lieferName !== undefined) await tippe(page, "#bst-liefer-name", b.lieferName, true);
  if (b.lieferStrasse) await tippe(page, "#bst-liefer-strasse", b.lieferStrasse);
  if (b.lieferOrt) await tippe(page, "#bst-liefer-ort", b.lieferOrt);
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
      if (!soll) continue;
      if (p.artikel[a.id].groesse) await page.select(`${karte} [data-artikel="${a.id}"] [data-a="groesse"]`, p.artikel[a.id].groesse);
      // Aufdrucke: nur was vom Standard abweicht, wird angeklickt
      const gewollt = p.artikel[a.id].aufdrucke;
      for (const code of a.aufdrucke.moeglich) {
        if (gewollt.includes(code) !== STANDARD[a.id].includes(code)) await page.click(`${karte} [data-artikel="${a.id}"] [data-a="druck"][data-code="${code}"]`);
      }
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
    if (!wahl || wahl.length === 0) continue;
    for (const id of wahl) await page.click(`[data-bezahlung="${block}"] input[value="${id}"]`);
  }
  // Der Block „Sponsor“ erscheint erst jetzt (Antwort „Sponsor“ oder Stücke mit Sponsorlogo): dann gehören seine Felder dazu
  if (await sichtbar(page, "[data-bst-sponsorblock]")) {
    const s = b.sponsor;
    for (const [feld, auswahl] of [["firma", "#bst-sponsor-firma"], ["ansprechpartner", "#bst-sponsor-ansprech"], ["email", "#bst-sponsor-email"], ["telefon", "#bst-sponsor-tel"], ["anschrift", "#bst-sponsor-anschrift"]]) {
      if (s[feld]) await page.type(auswahl, s[feld]);
    }
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

// Die Auswahl einer Größe darf nicht abgeschnitten wirken: Der gewählte Text samt Platz für den Pfeil passt in das Feld
async function pruefeAuswahlfelder(page, name) {
  const zuSchmal = await page.evaluate(() => {
    const liste = [];
    const leinwand = document.createElement("canvas").getContext("2d");
    for (const s of document.querySelectorAll("select")) {
      if (s.getClientRects().length === 0) continue;
      const stil = getComputedStyle(s);
      leinwand.font = `${stil.fontStyle} ${stil.fontWeight} ${stil.fontSize} ${stil.fontFamily}`;
      const text = s.options[s.selectedIndex] ? s.options[s.selectedIndex].text : "";
      const innen = s.getBoundingClientRect().width - parseFloat(stil.paddingLeft) - parseFloat(stil.paddingRight) - parseFloat(stil.borderLeftWidth) - parseFloat(stil.borderRightWidth);
      const noetig = leinwand.measureText(text).width + 26; // 26 px: Platz für den Pfeil des Browsers
      if (noetig > innen + 0.5) liste.push(`„${text}“ braucht ${Math.ceil(noetig)} px, Feld innen ${Math.floor(innen)} px`);
    }
    return liste;
  });
  gleich(`${name}: keine Auswahl ist zu schmal für ihren Text (nichts abgeschnitten)`, zuSchmal.join(" | "), "");
}

// ---------- Produktbilder in den Artikelzeilen ----------

// Wartet, bis die Bilder der Zeilen einer Person geladen sind. Sie laden erst, wenn ihre Zeile nahe am sichtbaren Bereich ist (loading="lazy"): Darum
// wird eine Zeile nach der anderen in die Mitte geholt. Eine Zeile ohne Bild oder mit einem Bild, das nicht lädt (die Seite blendet es aus), ist sofort fertig.
async function ladeBilder(page, karte) {
  const anzahl = await page.$$eval(`${karte} [data-artikel]`, (l) => l.length);
  for (let i = 0; i < anzahl; i++) {
    await page.evaluate((k, n) => document.querySelectorAll(`${k} [data-artikel]`)[n].scrollIntoView({ block: "center" }), karte, i);
    await page.waitForFunction(
      (k, n) => {
        const img = document.querySelectorAll(`${k} [data-artikel]`)[n].querySelector(".bst-check__bild img");
        return !img || img.hidden || (img.complete && img.naturalWidth > 0);
      },
      { timeout: 15000 },
      karte,
      i
    );
  }
  await page.evaluate(() => window.scrollTo(0, 0));
}

// Maße (Rechtecke im Fenster, alle in einer Messung, also bei derselben Bildlaufposition) und Zustand der Zeilen einer Person
function messeZeilen(page, karte) {
  return page.$$eval(`${karte} [data-artikel]`, (zeilen) =>
    zeilen.map((z) => {
      const rechteck = (s) => {
        const e = z.querySelector(s);
        if (!e || e.getClientRects().length === 0) return null;
        const b = e.getBoundingClientRect();
        return { l: b.left, t: b.top, r: b.right, b: b.bottom, w: b.width, h: b.height };
      };
      const kachel = z.querySelector(".bst-check__bild");
      const img = kachel && kachel.querySelector("img");
      const text = z.querySelector(".bst-check__text");
      const stil = kachel ? getComputedStyle(kachel) : null;
      return {
        id: z.dataset.artikel,
        angehakt: z.querySelector('[data-a="an"]').checked,
        zeile: rechteck(".bst-check"),
        haken: rechteck('input[data-a="an"]'),
        kachel: rechteck(".bst-check__bild"),
        text: rechteck(".bst-check__text"),
        preis: rechteck("[data-a-preis]"),
        preisText: z.querySelector("[data-a-preis]").textContent,
        textUeberlauf: text ? text.scrollWidth - text.clientWidth : 0,
        kachelAriaHidden: kachel ? kachel.getAttribute("aria-hidden") : null,
        kachelLeer: kachel ? kachel.classList.contains("bst-check__bild--leer") : null,
        kachelGrund: stil ? stil.backgroundColor : null,
        kachelRand: stil ? stil.borderTopWidth + " " + stil.borderTopStyle : null,
        zeilenGrund: getComputedStyle(z).backgroundColor,
        imLabel: !!(kachel && kachel.closest("label.bst-check")),
        img: img
          ? { src: img.currentSrc || img.src, alt: img.getAttribute("alt"), breite: img.getAttribute("width"), hoehe: img.getAttribute("height"), loading: img.getAttribute("loading"), decoding: img.getAttribute("decoding"), fertig: img.complete, nat: img.naturalWidth, natH: img.naturalHeight, hidden: img.hidden, anzeige: getComputedStyle(img).display }
          : null,
      };
    })
  );
}

const schneiden = (a, b) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
const kurz = (z) => JSON.stringify({ haken: z.haken, kachel: z.kachel, text: z.text, preis: z.preis, ueberlauf: z.textUeberlauf });

// Die Regeln für das Aussehen jeder Zeile. nebeneinander: Kästchen, Kachel, Text und Preis stehen in einer Zeile (ab 360 px); sonst (320 px) darf der
// Preis unter den Text rutschen, überlappen darf nichts. bildAdresse: wohin die Bilder zeigen müssen (Anfang der Adresse); ohneBild: Artikel ohne bild in den Daten.
function pruefeBildzeilen(name, zeilen, { nebeneinander = true, bildAdresse = null, ohneBild = [] } = {}) {
  gleich(`${name}: zehn Zeilen`, String(zeilen.length), "10");
  for (const z of zeilen) {
    const n = `${name}: ${z.id}`;
    pruefe(`${n}: die Kachel ist 48 x 48 Pixel groß, weiß, mit 1 Pixel Rand, vor Hilfstechnik verborgen und liegt im Label (ein Tipp aufs Bild gilt der Zeile)`, !!z.kachel && Math.abs(z.kachel.w - 48) < 0.5 && Math.abs(z.kachel.h - 48) < 0.5 && z.kachelGrund === "rgb(255, 255, 255)" && z.kachelRand === "1px solid" && z.kachelAriaHidden === "true" && z.imLabel, kurz(z));
    pruefe(`${n}: nichts überlappt (Kästchen, Kachel, Text, Preis)`, !schneiden(z.haken, z.kachel) && !schneiden(z.kachel, z.text) && !schneiden(z.text, z.preis) && !schneiden(z.kachel, z.preis) && !schneiden(z.haken, z.text), kurz(z));
    pruefe(`${n}: der Text läuft nicht über seinen Platz hinaus (kein Wort ragt in den Preis)`, z.textUeberlauf <= 0.5, kurz(z));
    pruefe(`${n}: Preis und Kachel liegen innerhalb der Zeile`, z.preis.r <= z.zeile.r + 0.5 && z.kachel.l >= z.zeile.l && z.haken.l >= z.zeile.l, kurz(z));
    pruefe(`${n}: die Kachel steht oben bündig mit dem Text, das Kästchen auf der Höhe seiner ersten Zeile`, Math.abs(z.kachel.t - z.text.t) <= 1.5 && z.haken.t - z.text.t >= -0.5 && z.haken.t - z.text.t <= 3, kurz(z));
    if (nebeneinander) {
      pruefe(`${n}: Kästchen, Kachel, Text und Preis stehen von links nach rechts in einer Zeile`, z.haken.r <= z.kachel.l + 0.5 && z.kachel.r <= z.text.l + 0.5 && z.text.r <= z.preis.l + 0.5, kurz(z));
      pruefe(`${n}: der Preis liegt in derselben Zeile wie die Kachel (Rechteck-Vergleich) und steht oben auf der Höhe des Namens`, z.preis.t < z.kachel.b && z.preis.b > z.kachel.t && Math.abs(z.preis.t - z.text.t) <= 1.5, kurz(z));
    }
    if (z.angehakt) pruefe(`${n}: in der angehakten Zeile (${z.zeilenGrund}) bleibt die Kachel weiß`, z.zeilenGrund !== "rgb(255, 255, 255)" && z.kachelGrund === "rgb(255, 255, 255)");
    if (ohneBild.includes(z.id)) {
      pruefe(`${n}: ohne bild in den Daten: dieselbe Kachel leer (Klasse bst-check__bild--leer), kein img darin`, z.kachelLeer === true && z.img === null);
    } else {
      const i = z.img;
      pruefe(`${n}: das Bild ist geladen (complete, naturalWidth ${BILD_KANTE}, naturalHeight ${BILD_KANTE}), nicht ausgeblendet`, !!i && i.fertig && i.nat === BILD_KANTE && i.natH === BILD_KANTE && !i.hidden && i.anzeige !== "none", JSON.stringify(i));
      pruefe(`${n}: img mit leerem alt, width und height 48, loading lazy, decoding async`, !!i && i.alt === "" && i.breite === "48" && i.hoehe === "48" && i.loading === "lazy" && i.decoding === "async" && z.kachelLeer === false, JSON.stringify(i));
      if (bildAdresse) pruefe(`${n}: das Bild kommt von ${bildAdresse}${z.id}.webp`, !!i && i.src === bildAdresse + z.id + ".webp", i && i.src);
    }
  }
  // Alle Texte stehen bündig: Die Kachel ist immer da (auch leer), also beginnt der Text in jeder Zeile an derselben Stelle
  gleich(`${name}: alle Texte beginnen an derselben Stelle (bündig)`, [...new Set(zeilen.map((z) => Math.round(z.text.l - z.zeile.l)))].join(","), String(Math.round(zeilen[0].text.l - zeilen[0].zeile.l)));
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

// Alle Schreibweisen der erfundenen Testpreise (Listenpreise, Grundpreise, Zuschläge, Stückpreise mit Standard-Aufdrucken), je mit Punkt und Komma
function preisSchreibweisen() {
  const cent = new Set();
  const sammle = (v) => {
    if (typeof v === "number") cent.add(Math.round(v * 100));
    else if (v && typeof v === "object") Object.values(v).forEach(sammle);
  };
  sammle(TESTPREISE.uvp);
  sammle(TESTPREISE.veredelungPreis);
  for (const a of KONFIG.artikel) {
    for (const g of ["kinder", "erwachsene", "alle"]) {
      const e = a.groessen.find((x) => x.gruppe === g);
      const s = e && stueckpreis(KONFIG, a.id, e.wert, a.aufdrucke.standard);
      if (s && !s.anfrage) {
        cent.add(s.cent);
        cent.add(s.grundCent);
      }
    }
  }
  const nadeln = [];
  for (const c of cent) {
    const euro = Math.floor(c / 100);
    const cc = String(c % 100).padStart(2, "0");
    for (const trenner of [".", ","]) {
      nadeln.push(`${euro}${trenner}${cc}`);
      if (cc[1] === "0") nadeln.push(`${euro}${trenner}${cc[0]}`);
    }
  }
  return nadeln;
}

// Steht eine der Zahlen als ganze Zahl im Text (nicht innerhalb längerer Ziffernfolgen, nicht vor „.<Ziffer>“)?
function findePreise(text, nadeln) {
  const maske = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(?<![0-9])(?:${nadeln.map(maske).join("|")})(?![0-9])(?!\\.[0-9])`, "g");
  return [...new Set(text.match(re) || [])];
}

// euro: Das Zeichen „€“ gehört nicht ins HTML und in den sichtbaren Text vor dem Öffnen; in den Skripten steht es als Einheit im Formatierer.
function keinPreis(name, text, { euro = true } = {}) {
  const nadeln = preisSchreibweisen();
  const gefunden = findePreise(text, nadeln);
  pruefe(`${name}: kein Testpreis (${nadeln.length} Schreibweisen von Listenpreisen, Grundpreisen, Zuschlägen und Stückpreisen geprüft)`, gefunden.length === 0, "Preis im Text: " + gefunden.join(", "));
  pruefe(`${name}: kein Rabattsatz („40 %“, rabattProzent mit Wert)`, !/(?<![0-9.,])40\s?%/.test(text) && !/rabattProzent\W{0,6}40(?![0-9])/.test(text));
  if (euro) pruefe(`${name}: kein „€“`, !text.includes("€"));
}

function statisch(bau) {
  abschnitt("Statisch: gebaute Seite, Sitemap, appack-Paket, keine Preise in HTML und JS");
  const html = readFileSync(path.join(DOCS, "ws", "bestellung.html"), "utf8");
  pruefe('docs/ws/bestellung.html: <meta name="robots" content="noindex">', html.includes('<meta name="robots" content="noindex">'));
  pruefe("docs/ws/bestellung.html: Verweise auf eigenes CSS und Skript", html.includes('href="../assets/css/bestellung.css"') && html.includes('src="../assets/js/bestellung/seite.js"'));
  const m = /<script type="application\/json" id="bestellung-konfig">([\s\S]*?)<\/script>/.exec(html);
  // Die Konfiguration mit dem mitgelieferten Paket (nicht mit einem aus der Testvariable, falls jemand sie in seiner Umgebung gesetzt hat)
  const alteVariable = process.env.BESTELLUNG_PREISE_ENC;
  delete process.env.BESTELLUNG_PREISE_ENC;
  let konfigRepo;
  try {
    konfigRepo = baueKonfig(DATEN);
  } finally {
    if (alteVariable !== undefined) process.env.BESTELLUNG_PREISE_ENC = alteVariable;
  }
  pruefe("docs/ws/bestellung.html: Konfiguration eingebettet und gleich der Konfiguration aus den Daten (Bau aktuell, mit dem verschlüsselten Paket aus data/)", !!m && JSON.stringify(JSON.parse(m[1])) === JSON.stringify(konfigRepo), "Bau veraltet? npm run build");
  pruefe("docs/ws/bestellung.html: Titel", /<title>Bestellung für dein Team – FFV Sportfreunde 04<\/title>/.test(html));
  pruefe("docs/ws/bestellung.html: keine Einkaufsdaten, kein Skript von außen", !/Einkaufspreis|Kundenkonto|Angebotsnummer/i.test(html) && !/<script[^>]+src="https?:/.test(html) && !/<link[^>]+href="https?:\/\/(?!justolgay\.github\.io)/.test(html));
  for (const d of ["css/bestellung.css", "js/bestellung/seite.js", "js/bestellung/mailtext.js", "js/bestellung/zugang.js", "js/bestellung/formular.js"]) {
    pruefe(`docs/assets/${d} vorhanden und gleich der Quelle`, existsSync(path.join(DOCS, "assets", d)) && readFileSync(path.join(DOCS, "assets", d), "utf8") === readFileSync(path.join(ROOT, "assets", d), "utf8"), "Bau veraltet? npm run build");
  }
  // Produktbilder: Die zehn Kacheln liegen im Bau (docs/ des Arbeitsordners und Wegwerf-Bau), gleich den Quellen, als WebP von 144 x 144 und höchstens 12 KB
  const bildNamen = KONFIG.artikel.map((a) => a.bild);
  const bildDaten = bildNamen.map((b) => readFileSync(path.join(BILDER_ORDNER, b)));
  for (const [name, docs] of [["docs/ des Arbeitsordners", DOCS], ["Bau mit Testpreisen", bau.docs]]) {
    const ordner = path.join(docs, "assets", "bilder", "bestellung");
    gleichJson(`${name}: assets/bilder/bestellung enthält genau die zehn Bilder aus den Daten`, existsSync(ordner) ? readdirSync(ordner).sort() : [], [...bildNamen].sort());
    for (const b of bildNamen) {
      const daten = existsSync(path.join(ordner, b)) ? readFileSync(path.join(ordner, b)) : Buffer.alloc(0);
      const m = webpMasse(daten);
      pruefe(`${name}: ${b} ist gleich der Quelle in assets/bilder/bestellung, ein WebP von ${BILD_KANTE} x ${BILD_KANTE} und höchstens ${BILD_MAX_BYTES} Byte`, daten.length > 0 && daten.equals(readFileSync(path.join(BILDER_ORDNER, b))) && !!m && m.breite === BILD_KANTE && m.hoehe === BILD_KANTE && daten.length <= BILD_MAX_BYTES, "Bau veraltet? npm run build");
    }
  }
  pruefe("docs/ws/bestellung.html: ohne Code kein Bild im HTML (die Kacheln entstehen erst nach dem Öffnen)", !/<img\b/.test(html));
  pruefe("assets/js/bestellung: keine weiteren Dateien als die geprüften (seite, mailtext, zugang, formular)", readdirSync(path.join(ROOT, "assets", "js", "bestellung")).sort().join(",") === "formular.js,mailtext.js,seite.js,zugang.js");
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
    pruefe(`${rel}: keines der Produktbilder der Bestellseite (keine .webp-Datei gleich einer Kachel)`, !dateien.filter((d) => /\.webp$/i.test(d)).some((d) => { const x = readFileSync(d); return bildDaten.some((b) => b.equals(x)); }));
    pruefe(`${rel}: keine Seite verweist auf die Bestellseite`, !dateien.filter((d) => /\.(html|js|css)$/.test(d)).some((d) => /bestellung\.html/.test(readFileSync(d, "utf8"))));
    pruefe(`${rel}: weder die Module der Bestellseite (zugang.js, formular.js) noch das verschlüsselte Paket der Preise`, !dateien.some((d) => /(^|[\\/])(zugang|formular)\.js$/.test(d)) && !dateien.filter((d) => /\.(html|js|json)$/.test(d)).some((d) => /preiseVerschluesselt|speuzer-bestellung-preise/.test(readFileSync(d, "utf8"))));
  }
  const manifest = readFileSync(path.join(ROOT, "dist", "appack-paket", "manifest.json"), "utf8");
  pruefe("Paket-Manifest ohne die Bestellseite", !/bestellung/i.test(manifest));
  pruefe("docs/ws enthält die Bestellseite (und das Paket zählt sie nicht)", existsSync(path.join(DOCS, "ws", "bestellung.html")));

  // Keine Preise im ausgelieferten HTML und JS: im Bau mit Testpreisen (dort steckt das Paket der Testpreise) und im mitgelieferten docs/
  for (const [name, docs] of [["Bau mit Testpreisen", bau.docs], ["docs/ des Arbeitsordners", DOCS]]) {
    keinPreis(`${name}: docs/ws/bestellung.html`, readFileSync(path.join(docs, "ws", "bestellung.html"), "utf8"));
    for (const d of ["mailtext.js", "seite.js", "zugang.js", "formular.js"]) keinPreis(`${name}: assets/js/bestellung/${d}`, readFileSync(path.join(docs, "assets", "js", "bestellung", d), "utf8"), { euro: false });
    keinPreis(`${name}: assets/css/bestellung.css`, readFileSync(path.join(docs, "assets", "css", "bestellung.css"), "utf8"));
  }
  const htmlTest = readFileSync(path.join(bau.docs, "ws", "bestellung.html"), "utf8");
  const mt = /"preiseVerschluesselt":(\{[^}]*\})/.exec(htmlTest);
  pruefe("Bau mit Testpreisen: das Testpaket (BESTELLUNG_PREISE_ENC) steckt in der Seite, nicht das Paket aus data/", !!mt && JSON.parse(mt[1]).ct === bau.paket.ct && JSON.parse(mt[1]).ct !== konfigRepo.preiseVerschluesselt.ct);
  gleichJson("Bau mit Testpreisen: das Paket hat genau die Felder des Formats", Object.keys(JSON.parse(mt[1])), ["format", "kdf", "iter", "salt", "iv", "ct"]);
}

// ---------- Abläufe ----------

// Ohne Code: nur Kopf, Prototyp-Hinweis und Zugangsbox. Falscher Code, richtiger Code, Code vergessen.
async function ablaufZugang(browser, server) {
  abschnitt("390 x 844: Zugang (ohne Code nur die Zugangsbox, falscher und richtiger Code, vergessen)");
  const { page, p, schliessen } = await oeffne(browser, server, { zugang: "keiner", langsam: 800 });
  try {
    gleich("Zustand: zu (gesperrt)", await zustandVon(page), "zu");
    gleich("Sprache der Seite", await page.evaluate(() => document.documentElement.lang), "de");
    gleich("Titel", await page.title(), "Bestellung für dein Team – FFV Sportfreunde 04");
    gleich("genau eine Überschrift der Ebene 1: „Bestellung für dein Team“", (await texte(page, "h1")).join("|"), "Bestellung für dein Team");
    gleich("Hinweis im Prüfmodus (blau, ganz oben)", await inhalt(page, ".bst-pruefmodus"), "Prototyp: Die Mail geht als TEST an die Bestelladresse und löst keine Bestellung aus.");
    pruefe("Hinweis im Prüfmodus steht über der Überschrift", await page.evaluate(() => document.querySelector(".bst-pruefmodus").getBoundingClientRect().top < document.querySelector("h1").getBoundingClientRect().top));
    gleich("Text der Zugangsbox", await inhalt(page, "[data-bst-zugang] .bst-lead"), TEXT_ZUGANG);
    gleich("Beschriftung des Feldes", await inhalt(page, "[data-bst-zugang] label"), "Code");
    gleich("Knopf", await inhalt(page, "[data-bst-oeffnen]"), "Öffnen");
    pruefe("Feld „Code“ und Knopf „Öffnen“ sichtbar, die Zugangsbox ist da", (await sichtbar(page, "#bst-code")) && (await sichtbar(page, "[data-bst-oeffnen]")) && (await sichtbar(page, "[data-bst-zugang]")));
    pruefe("Feld „Code“: ohne Autofill, Großbuchstaben, keine Rechtschreibprüfung, Beschriftung verbunden", await page.$eval("#bst-code", (el) => el.autocomplete === "off" && el.getAttribute("autocapitalize") === "characters" && el.spellcheck === false && el.labels.length === 1 && el.labels[0].textContent === "Code"));
    pruefe("ohne Code kein Formular im DOM: kein #bst-form, keine Überschrift der Ebene 2, kein Abschnitt, nur ein Eingabefeld", await page.evaluate(() => !document.getElementById("bst-form") && document.querySelectorAll("h2, section.bst-abschnitt, textarea, select").length === 0 && document.querySelectorAll("input").length === 1));
    pruefe("der Platz für das Formular ist leer und verborgen", await page.$eval("[data-bst-app]", (el) => el.hidden && el.childElementCount === 0));
    pruefe("ohne Code kein „€“ und kein Preistext auf der Seite", await page.evaluate(() => !/€|Listenpreis|Rabatt|Preise laut/.test(document.body.innerText)));
    keinPreis("ohne Code: die ganze Seite im Browser (HTML mit dem eingebetteten Paket)", await page.content());
    pruefe("ohne Code wurde nichts gemerkt", (await imSpeicher(page, SCHLUESSEL_CODE)) === null && (await imSpeicher(page, SCHLUESSEL_ENTWURF)) === null);
    pruefe("gesperrt: kein Hinweis auf kaputte Daten, keine Meldung", !(await sichtbar(page, "[data-bst-zugang-meldung]")));
    await pruefeLayout(page, "Zugangsbox", 390);
    await pruefeBeschriftungen(page, "Zugangsbox");
    await pruefeIds(page, "Zugangsbox");
    await pruefeTippflaechen(page, "Zugangsbox");
    await pruefeAxe(page, "Zugangsbox");
    await foto(page, "390-zugang.png");

    // Nichts eingegeben
    await page.click("[data-bst-oeffnen]");
    gleich("leeres Feld: Meldung", await inhalt(page, "[data-bst-zugang-meldung]"), "Bitte gib den Code ein.");
    gleich("leeres Feld: der Fokus bleibt im Feld", await fokus(page), "bst-code");
    gleich("leeres Feld: Zustand bleibt zu", await zustandVon(page), "zu");

    // Falscher Code: erst „Einen Moment …“ mit gesperrtem Knopf, dann die Meldung
    await page.type("#bst-code", "falsch");
    await page.click("[data-bst-oeffnen]");
    await page.waitForFunction(() => document.querySelector("[data-bst-oeffnen]").disabled, { timeout: 5000 });
    gleich("während der Prüfung: Meldung „Einen Moment …“", await inhalt(page, "[data-bst-zugang-meldung]"), "Einen Moment …");
    pruefe("während der Prüfung: der Knopf ist gesperrt, das Feld schreibgeschützt, Zustand „pruefe“", await page.evaluate(() => document.querySelector("[data-bst-oeffnen]").disabled && document.getElementById("bst-code").readOnly && document.getElementById("bestellung").dataset.zustand === "pruefe"));
    await page.focus("#bst-code");
    await page.keyboard.press("Enter");
    pruefe("während der Prüfung: Enter im Feld startet keine zweite Prüfung", (await zustandVon(page)) === "pruefe");
    await page.waitForFunction(() => document.querySelector("[data-bst-zugang-meldung]").textContent.includes("stimmt nicht"), { timeout: 20000 });
    gleich("falscher Code: der Schlüssel wurde genau einmal abgeleitet (die leere Eingabe vorher und das zweite Enter lösen nichts aus)", String(await page.evaluate(() => window.__ableitungen)), "1");
    gleich("falscher Code: Meldung wörtlich", await inhalt(page, "[data-bst-zugang-meldung]"), TEXT_CODE_FALSCH);
    pruefe("falscher Code: der Knopf ist wieder frei, das Feld bearbeitbar, Zustand zu, die Meldung hebt sich ab (Warnton, nicht rot)", await page.evaluate(() => !document.querySelector("[data-bst-oeffnen]").disabled && !document.getElementById("bst-code").readOnly && document.getElementById("bestellung").dataset.zustand === "zu" && document.querySelector("[data-bst-zugang-meldung]").classList.contains("bst-zugang__meldung--fehler")));
    pruefe("falscher Code: kein Formular, nichts gemerkt", !(await page.$("#bst-form")) && (await imSpeicher(page, SCHLUESSEL_CODE)) === null);
    pruefe("falscher Code: der Rahmen der Meldung ist der Warnton der Seite (--warn), kein Rot", await page.$eval("[data-bst-zugang-meldung]", (el) => getComputedStyle(el).borderLeftColor === "rgb(138, 75, 0)"));
    await pruefeLayout(page, "Zugangsbox mit Meldung", 390);
    await pruefeAxe(page, "Zugangsbox mit Meldung");

    // Richtiger Code, andere Schreibweise (Kleinbuchstaben, Bindestrich), mit Enter
    await tippe(page, "#bst-code", "baumhaus-23", true);
    await page.keyboard.press("Enter");
    await page.waitForSelector('#bestellung[data-zustand="offen"]', { timeout: 30000 });
    pruefe("richtiger Code: das Formular steht da (Ebene-2-Überschriften), die Zugangsbox ist weg", (await texte(page, "h2")).length === 5 && !(await sichtbar(page, "[data-bst-zugang]")) && (await sichtbar(page, "#bst-form")));
    gleich("richtiger Code: Einleitung statt Zugangstext", await inhalt(page, "[data-bst-app] .bst-lead"), TEXT_LEAD);
    gleich("richtiger Code: der Fokus liegt oben auf der Überschrift", await fokus(page), "bst-titel");
    gleich("richtiger Code: auf dem Gerät gemerkt (normalisiert)", await imSpeicher(page, SCHLUESSEL_CODE), "BAUMHAUS23");
    gleich("richtiger Code: das Feld ist geleert (der Code bleibt nicht im Feld stehen)", await wert(page, "#bst-code"), "");
    pruefe("richtiger Code: die Preisanzeige arbeitet (die Preise sind entschlüsselt)", (await page.evaluate(() => document.body.innerText)).includes("Preise laut Angebot 11Teamsport vom 24.11.2026 (Listenpreis − 40 %, Aufdrucke einzeln)."));

    // Code vergessen: wieder zu, der Entwurf bleibt
    await page.type("#bst-name", "Lena Beispiel");
    pruefe("Entwurf liegt auf dem Gerät", (await entwurfImSpeicher(page)).name === "Lena Beispiel");
    await page.click("[data-bst-vergessen]");
    gleich("Code vergessen: Zustand zu", await zustandVon(page), "zu");
    pruefe("Code vergessen: die Zugangsbox ist wieder da, das Formular ist weg (nicht mehr im DOM)", (await sichtbar(page, "[data-bst-zugang]")) && !(await page.$("#bst-form")) && !(await sichtbar(page, "[data-bst-app]")));
    pruefe("Code vergessen: der gemerkte Code ist gelöscht, der Entwurf bleibt", (await imSpeicher(page, SCHLUESSEL_CODE)) === null && (await entwurfImSpeicher(page)).name === "Lena Beispiel");
    gleich("Code vergessen: der Fokus liegt im Feld „Code“, es ist leer, keine Meldung", [await fokus(page), await wert(page, "#bst-code"), await inhalt(page, "[data-bst-zugang-meldung]")].join("|"), "bst-code||");
    pruefe("Code vergessen: wieder keine Preise im sichtbaren Text", await page.evaluate(() => !/€|Listenpreis|Rabatt/.test(document.body.innerText)));
    await neuLaden(page);
    gleich("Neuladen nach „Code vergessen“: die Seite bleibt zu", await zustandVon(page), "zu");
    // Wieder öffnen: Der Entwurf ist da
    await entsperre(page, "BAUMHAUS23");
    gleich("wieder geöffnet: der Entwurf ist noch da (Name)", await wert(page, "#bst-name"), "Lena Beispiel");
    pruefeProtokoll("Zugang", p, server);
  } finally {
    await schliessen();
  }

  // ?code= im Link: öffnet direkt, der Parameter verschwindet aus der Adresse
  {
    const { page, p, schliessen } = await oeffne(browser, server, { zugang: "keiner", url: server.seite + "?code=baumhaus23" });
    try {
      gleich("?code=: öffnet direkt (Zustand offen)", await zustandVon(page), "offen");
      pruefe("?code=: der Parameter ist aus der Adresse entfernt (history.replaceState), der Pfad bleibt", (await page.evaluate(() => location.search)) === "" && page.url() === server.seite, page.url());
      gleich("?code=: der Code ist gemerkt", await imSpeicher(page, SCHLUESSEL_CODE), "BAUMHAUS23");
      pruefe("?code=: das Formular steht da, ohne dass etwas eingegeben wurde", (await sichtbar(page, "#bst-form")) && !(await sichtbar(page, "[data-bst-zugang]")));
      gleich("?code=: Neuladen öffnet ohne Eingabe", await (async () => { await neuLaden(page); return zustandVon(page); })(), "offen");
      gleich("Neuladen: der Code steht weiter nicht in der Adresse", await page.evaluate(() => location.href), server.seite);
      pruefeProtokoll("?code= im Link", p, server);
    } finally {
      await schliessen();
    }
  }
  // ?code= mit falschem Code: gesperrt, Meldung, Parameter trotzdem aus der Adresse
  {
    const { page, p, schliessen } = await oeffne(browser, server, { zugang: "keiner", url: server.seite + "?code=falsch&x=1" });
    try {
      gleich("?code=falsch: bleibt zu", await zustandVon(page), "zu");
      gleich("?code=falsch: Meldung", await inhalt(page, "[data-bst-zugang-meldung]"), TEXT_CODE_FALSCH);
      pruefe("?code=falsch: der Parameter „code“ ist aus der Adresse, andere Parameter bleiben", (await page.evaluate(() => location.search)) === "?x=1", page.url());
      pruefe("?code=falsch: nichts gemerkt, kein Formular", (await imSpeicher(page, SCHLUESSEL_CODE)) === null && !(await page.$("#bst-form")));
      pruefe("?code=falsch: der Knopf ist frei, man kann es noch einmal versuchen", await page.$eval("[data-bst-oeffnen]", (el) => !el.disabled));
      await entsperre(page);
      gleich("danach mit dem richtigen Code öffnen klappt", await zustandVon(page), "offen");
      pruefeProtokoll("?code=falsch", p, server);
    } finally {
      await schliessen();
    }
  }
  // Ein ausgetauschter Code: Der gemerkte Code passt nicht mehr
  {
    const { page, p, schliessen } = await oeffne(browser, server, { zugang: "keiner" });
    try {
      await page.evaluate((k) => localStorage.setItem(k, "ABCDEFGHJK"), SCHLUESSEL_CODE);
      await neuLaden(page);
      gleich("gemerkter Code passt nicht mehr: bleibt zu", await zustandVon(page), "zu");
      gleich("gemerkter Code passt nicht mehr: Meldung mit Hinweis", await inhalt(page, "[data-bst-zugang-meldung]"), "Der gemerkte Code passt nicht mehr. Bitte gib den Code ein, den du vom Verein bekommen hast.");
      pruefe("gemerkter Code passt nicht mehr: der alte Code ist gelöscht (es wird nicht bei jedem Besuch noch einmal versucht)", (await imSpeicher(page, SCHLUESSEL_CODE)) === null);
      await entsperre(page);
      gleich("danach: Eingabe des neuen Codes öffnet", await zustandVon(page), "offen");
      pruefeProtokoll("gemerkter Code passt nicht mehr", p, server);
    } finally {
      await schliessen();
    }
  }
  // Beschädigtes oder fehlendes Paket: klarer Hinweis, kein Absturz, kein Formular
  for (const [name, aendere] of [
    ["Paket beschädigt (iv zu kurz)", (html) => html.replace(/("preiseVerschluesselt":\{[^}]*"iv":")[^"]*"/, '$1zu kurz"')],
    ["Paket beschädigt (ct zu kurz)", (html) => html.replace(/("preiseVerschluesselt":\{[^}]*"ct":")[^"]*"/, '$1AAAA"')],
    ["Paket mit unbekanntem Format", (html) => html.replace('"format":"speuzer-bestellung-preise-v1"', '"format":"speuzer-bestellung-preise-v9"')],
    ["Paket fehlt (null)", (html) => html.replace(/"preiseVerschluesselt":\{[^}]*\}/, '"preiseVerschluesselt":null')],
  ]) {
    const { page, p, schliessen } = await oeffne(browser, server, { zugang: "keiner", aendereHtml: aendere });
    try {
      pruefe(`${name}: die Änderung ist angekommen (die Seite liefert sonst das heile Paket)`, (await page.content()).length > 1000);
      gleich(`${name}: Zustand defekt`, await zustandVon(page), "defekt");
      gleich(`${name}: klarer Hinweis auf der Seite`, await inhalt(page, "[data-bst-zugang-meldung]"), TEXT_DEFEKT);
      pruefe(`${name}: Feld und Knopf gesperrt, kein Formular, kein Absturz`, await page.evaluate(() => document.getElementById("bst-code").disabled && document.querySelector("[data-bst-oeffnen]").disabled && !document.getElementById("bst-form")));
      pruefe(`${name}: der Hinweis ist sichtbar`, await sichtbar(page, "[data-bst-zugang-meldung]"));
      await pruefeAxe(page, name);
      pruefeProtokoll(name, p, server);
    } finally {
      await schliessen();
    }
  }
  // Das Paket ist heil, enthält aber unvollständige Preise: Hinweis, nichts gemerkt
  {
    const unvollstaendig = kopieTestpreise();
    delete unvollstaendig.uvp.trikot;
    const kaputtPaket = await verschluessele(unvollstaendig, TESTCODE, { iter: 1000 });
    const { page, p, schliessen } = await oeffne(browser, server, { zugang: "keiner", aendereHtml: (html) => html.replace(/"preiseVerschluesselt":\{[^}]*\}/, `"preiseVerschluesselt":${JSON.stringify(kaputtPaket)}`) });
    try {
      await page.type("#bst-code", TESTCODE);
      await page.click("[data-bst-oeffnen]");
      await page.waitForFunction(() => document.querySelector("[data-bst-zugang-meldung]").textContent !== "" && document.querySelector("[data-bst-zugang-meldung]").textContent !== "Einen Moment …", { timeout: 20000 });
      gleich("unvollständige Preise: Hinweis wie bei beschädigten Daten", await inhalt(page, "[data-bst-zugang-meldung]"), TEXT_DEFEKT);
      pruefe("unvollständige Preise: bleibt zu, kein Formular, der Code wird nicht gemerkt", (await zustandVon(page)) === "zu" && !(await page.$("#bst-form")) && (await imSpeicher(page, SCHLUESSEL_CODE)) === null);
      pruefeProtokoll("unvollständige Preise", p, server);
    } finally {
      await schliessen();
    }
  }
  // Web Crypto fehlt
  {
    const { page, p, schliessen } = await oeffne(browser, server, { zugang: "keiner", ohneSubtle: true });
    try {
      await page.type("#bst-code", TESTCODE);
      await page.click("[data-bst-oeffnen]");
      await page.waitForFunction(() => document.querySelector("[data-bst-zugang-meldung]").textContent.includes("Browser"), { timeout: 20000 });
      pruefe("ohne Web Crypto: eigene Meldung mit Hinweis auf eine sichere Verbindung, bleibt zu", (await inhalt(page, "[data-bst-zugang-meldung]")).includes("https") && (await zustandVon(page)) === "zu");
      pruefeProtokoll("ohne Web Crypto", p, server);
    } finally {
      await schliessen();
    }
  }
}

// Das leere Formular bei 390 px, Klick auf „Senden“ ohne Pflichtangaben
async function ablaufLeer(browser, server) {
  abschnitt("390 x 844: leeres Formular, „Senden“ ohne Pflichtangaben");
  const { page, p, schliessen } = await oeffne(browser, server);
  try {
    gleich("Zustand offen", await zustandVon(page), "offen");
    gleich("Sprache der Seite", await page.evaluate(() => document.documentElement.lang), "de");
    gleich("Titel", await page.title(), "Bestellung für dein Team – FFV Sportfreunde 04");
    gleich("genau eine Überschrift der Ebene 1", String(await page.$$eval("h1", (l) => l.length)), "1");
    gleich("Überschrift", await inhalt(page, "h1"), "Bestellung für dein Team");
    gleich("Überschriften der fünf Abschnitte in dieser Reihenfolge", (await texte(page, "h2")).join(" | "), "Wer bestellt? | Kleidung je Person | Teambedarf | Bezahlung | Übersicht und Senden");
    gleich("Hinweis im Prüfmodus (blau, ganz oben)", await inhalt(page, ".bst-pruefmodus"), "Prototyp: Die Mail geht als TEST an die Bestelladresse und löst keine Bestellung aus.");
    pruefe("Hinweis im Prüfmodus: Klasse hinweis--info, nicht der Warnton", await page.$eval(".bst-pruefmodus", (el) => el.classList.contains("hinweis--info") && !el.classList.contains("hinweis--offen")));
    gleich("zwei Sätze unter der Überschrift", await inhalt(page, "[data-bst-app] .bst-lead"), "Hier stellst du zusammen, was dein Team braucht. Am Ende öffnet sich dein Mailprogramm mit der fertigen Bestellung an den Verein – du musst nur noch auf „Senden“ tippen.");
    gleich("zwölf Mannschaften zur Auswahl (und „Bitte wählen“)", String(await page.$$eval("#bst-team option", (l) => l.length)), "13");
    gleich("Mannschaften in der Reihenfolge von data/teams.json", (await page.$$eval("#bst-team option", (l) => l.slice(1).map((o) => o.value))).join(","), "herren,soma,a-jugend,d1,d2,d3,e1,e2,e3,f1,f2,g-jugend");
    gleich("Beschriftungen der Felder zu „Wer bestellt?“", (await texte(page, "#bst-h-wer ~ .bst-felder label")).join(" | "), "Mannschaft | Dein Name | Telefon (freiwillig) | Gebraucht bis (freiwillig)");
    gleich("Lieferanschrift: Legende", await inhalt(page, ".bst-lieferung legend"), "Lieferanschrift (die Bestellung kommt zu dir)");
    gleich("Lieferanschrift: drei Felder mit Beschriftung", (await texte(page, ".bst-lieferung label")).join(" | "), "Name | Straße und Hausnummer | PLZ und Ort");
    gleich("Lieferanschrift: Beispiel im Feld „PLZ und Ort“", await page.$eval("#bst-liefer-ort", (el) => el.placeholder), "z. B. 60439 Frankfurt");
    gleich("sieben Posten im Teambedarf", String(await page.$$eval("[data-teamposten]", (l) => l.length)), "7");
    gleich("Posten im Teambedarf", (await texte(page, ".bst-posten__name")).join(" | "), "Bälle | Leibchen | Hütchen / Markierungsteller | Ballnetz / Balltasche | Ballpumpe | Erste-Hilfe-Material | Trinkflaschen");
    gleich("Teambedarf: Platzhalter der Details", (await page.$$eval("[data-details]", (l) => l.map((x) => x.placeholder))).join(" | "), "z. B. Größe 4 | z. B. Farbe, Kinder oder Erwachsene | z. B. Satz mit 40 Stück |  |  | z. B. Kühlspray, Tape | ");
    gleich("Erklärzeile zum Druck", await inhalt(page, "#bst-h-kleidung ~ .bst-hinweis"), "Name und Nummer werden nur gedruckt, wo du es anhakst.");
    gleich("Knopf für die erste Person", await inhalt(page, "#bst-person-neu"), "+ Person hinzufügen");
    gleich("Hinweis zu den Preisen im Teambedarf", (await texte(page, "#bst-h-team ~ .bst-hinweis")).pop(), "Preise klärt der Vorstand.");
    pruefe("Bezahlung: ohne Auswahl keine Frage, nur der Hinweis, auch kein Block „Sponsor“", !(await sichtbar(page, '[data-bezahlung="kleidung"]')) && !(await sichtbar(page, '[data-bezahlung="teambedarf"]')) && !(await sichtbar(page, "[data-bst-sponsorblock]")) && (await sichtbar(page, "[data-bst-bezahlung-leer]")));
    gleich("Fuß der Seite", (await texte(page, ".bst-fuss p:not([hidden])")).join(" | "), "Die Seite speichert nichts auf einem Server. Deine Eingaben bleiben auf diesem Gerät, bis du sie per Mail verschickst. | Preise laut Angebot 11Teamsport vom 24.11.2026 (Listenpreis − 40 %, Aufdrucke einzeln). | Code auf diesem Gerät vergessen");
    pruefe("Speichern klappt: kein Hinweis zum Speicher", !(await sichtbar(page, "[data-bst-speicher]")));
    pruefe("keine Lücken, keine Meldung, kein „gesendet“ vor dem ersten Klick", !(await sichtbar(page, "[data-bst-luecken]")) && !(await sichtbar(page, "[data-bst-gesendet]")) && (await inhalt(page, "[data-bst-meldung]")) === "");
    gleich("Übersicht leer: Personen 0, Teile 0, Summe 0,00 €, Teambedarf –", (await texte(page, "[data-u]")).join(" | "), "0 | 0 | 0,00 € | –");
    gleich("Übersicht: Beschriftung der Summe", await inhalt(page, '[data-u="summe"]').then(() => page.$eval('[data-u="summe"]', (el) => el.previousElementSibling.textContent.trim())), "Summe (Preise laut Angebot)");
    pruefe("Sendelink ohne mailto, solange etwas fehlt", await page.$eval("#bst-senden", (el) => el.dataset.mailto === undefined && !el.href.startsWith("mailto:")));
    await pruefeLayout(page, "leere Seite", 390);
    await pruefeBeschriftungen(page, "leere Seite");
    await pruefeIds(page, "leere Seite");
    await pruefeTippflaechen(page, "leere Seite");
    await foto(page, "390-leer.png");

    // Klick auf „Senden“ ohne Pflichtangaben
    await page.click("#bst-senden");
    pruefe("ohne Pflichtangaben: Liste der Lücken sichtbar", await sichtbar(page, "[data-bst-luecken]"));
    gleich("ohne Pflichtangaben: Lücken in Klartext (Lieferanschrift gehört dazu, der Name der Lieferung folgt „Dein Name“)", (await luecken(page)).join(" | "), ["Bitte wähle deine Mannschaft aus", "Bitte trage deinen Namen ein", "Bitte gib Straße und Hausnummer für die Lieferung an", TEXT_LUECKE_ORT, "Du hast noch nichts ausgewählt: Füge eine Person mit Kleidung hinzu oder wähle Teambedarf"].join(" | "));
    gleich("ohne Pflichtangaben: Fokus auf der ersten Lücke", await page.evaluate(() => document.activeElement.getAttribute("data-luecke")), "team");
    gleich("ohne Pflichtangaben: kein mailto ausgelöst", JSON.stringify(await gesendet(page)), "[]");
    pruefe("ohne Pflichtangaben: kein „gesendet“, keine Bestell-Nr. im Speicher", !(await sichtbar(page, "[data-bst-gesendet]")) && (await entwurfImSpeicher(page)).bestellNr === "");
    pruefe("ohne Pflichtangaben: Rahmen an Mannschaft, Name und der Lieferanschrift (aria-invalid)", await page.evaluate(() => ["bst-team", "bst-name", "bst-liefer-strasse", "bst-liefer-ort"].every((i) => document.getElementById(i).getAttribute("aria-invalid") === "true") && !document.getElementById("bst-liefer-name").hasAttribute("aria-invalid")));
    // Klick auf eine Lücke springt zum Feld
    await page.click('[data-luecke="name"]');
    gleich("Klick auf eine Lücke: Fokus im Feld „Dein Name“", await fokus(page), "bst-name");
    // Lücken verschwinden, sobald sie behoben sind
    await page.select("#bst-team", "d3");
    gleich("Mannschaft gewählt: erste Lücke weg", await lueckenFelder(page), "name,lieferStrasse,lieferOrt,leer");
    await page.type("#bst-name", "Lena Beispiel");
    gleich("Name eingetragen: der Name der Lieferung folgt ihm (Feld „Name“ der Lieferanschrift)", await wert(page, "#bst-liefer-name"), "Lena Beispiel");
    gleich("Name eingetragen: nur Anschrift und „nichts ausgewählt“ bleiben", await lueckenFelder(page), "lieferStrasse,lieferOrt,leer");
    await page.click('[data-luecke="lieferStrasse"]');
    gleich("Klick auf die Lücke: Fokus in „Straße und Hausnummer“", await fokus(page), "bst-liefer-strasse");
    await page.type("#bst-liefer-strasse", "Beispielweg 12");
    await page.type("#bst-liefer-ort", "6043 Frankfurt");
    gleich("PLZ mit vier Ziffern: die Lücke bleibt, mit dem Beispiel", (await luecken(page)).join(" | "), [TEXT_LUECKE_ORT, "Du hast noch nichts ausgewählt: Füge eine Person mit Kleidung hinzu oder wähle Teambedarf"].join(" | "));
    await tippe(page, "#bst-liefer-ort", "60439 Frankfurt", true);
    gleich("PLZ in Ordnung: nur „nichts ausgewählt“ bleibt", await lueckenFelder(page), "leer");
    pruefe("behobene Felder ohne Rahmen", await page.evaluate(() => ["bst-team", "bst-name", "bst-liefer-strasse", "bst-liefer-ort"].every((i) => !document.getElementById(i).hasAttribute("aria-invalid"))));
    await page.click('[data-luecke="leer"]');
    gleich("Klick auf „nichts ausgewählt“: Fokus beim Knopf „+ Person hinzufügen“", await fokus(page), "bst-person-neu");
    // „Text kopieren“ prüft genauso
    await page.click("#bst-kopieren");
    pruefe("„Text kopieren“ ohne Auswahl: Lücke statt Kopie", (await sichtbar(page, "[data-bst-luecken]")) && !(await sichtbar(page, "[data-bst-gesendet]")) && (await page.evaluate(() => document.activeElement.hasAttribute("data-luecke"))));
    await pruefeLayout(page, "Seite mit Lücken", 390);
    pruefeProtokoll("leeres Formular", p, server);
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
    gleich("Übersicht: Personen, Teile, Summe, Teambedarf", (await texte(page, "[data-u]")).join(" | "), "3 | 11 | 155,41 € (ohne Regenjacke, Preis auf Anfrage) | 3 Posten");
    gleich("Zwischensummen der drei Personen", (await texte(page, "[data-p-summe]")).join(" | "), "Zwischensumme: 98,38 € · 6 Teile | Zwischensumme: 33,19 € · 3 Teile | Zwischensumme: 23,84 € (ohne Regenjacke, Preis auf Anfrage) · 2 Teile");
    gleich("Titel der Karten", (await texte(page, ".bst-person__titel")).join(" | "), "Person 1 | Person 2 | Person 3");
    gleich("Initialen der Regenjacke (Vorschlag aus dem Namen)", await wert(page, '[data-person="p3"] [data-a="initialen"]'), "BK");
    gleich("Größe Stutzen von Mia (Vorauswahl für Kinder)", await wert(page, '[data-person="p1"] [data-artikel="stutzen"] [data-a="groesse"]'), "M (Junior)");
    gleich("Größe Präsi-Hose von Mia (eigene Wahl)", await wert(page, '[data-person="p1"] [data-artikel="praesi-hose"] [data-a="groesse"]'), "152");
    const preise = (karte) => page.$$eval(`${karte} [data-artikel]`, (l) => l.map((x) => x.querySelector("[data-a-preis]").textContent.trim()));
    gleich("Preise in Mias Karte (Trikot, Shorts, Stutzen, Präsi-Jacke, Präsi-Hose, Rucksack, Winterjacke, Regenjacke, TW-Trikot, TW-Hose)", (await preise('[data-person="p1"]')).join(" | "), "21,74 € | 10,38 € | 4,02 € | 29,04 € | 17,99 € | 15,21 € | 39,93 € | Preis auf Anfrage | 29,42 € | 16,79 €");
    gleich("Preise in Emils Karte (Trikot ohne Sponsorlogo 18,79 €, die übrigen Zeilen mit Standard-Aufdrucken)", (await preise('[data-person="p2"]')).slice(0, 4).join(" | "), "18,79 € | 10,38 € | 4,02 € | 29,04 €");
    gleich("Preise in Bens Karte: Erwachsenenpreise", (await preise('[data-person="p3"]')).join(" | "), "23,84 € | 11,88 € | 4,74 € | 32,94 € | 20,22 € | 15,21 € | 45,81 € | Preis auf Anfrage | 30,92 € | 18,96 €");
    gleich("Preiszeile von Mias Trikot", await inhalt(page, '[data-person="p1"] [data-artikel="trikot"] [data-a-preiszeile]'), "Listenpreis 21,90 € − 40 % = 13,14 € · Aufdrucke + 8,60 €");
    gleich("Preiszeile von Emils Trikot (ohne Sponsorlogo)", await inhalt(page, '[data-person="p2"] [data-artikel="trikot"] [data-a-preiszeile]'), "Listenpreis 21,90 € − 40 % = 13,14 € · Aufdrucke + 5,65 €");
    gleich("Preiszeile von Bens Regenjacke", await inhalt(page, '[data-person="p3"] [data-artikel="regenjacke"] [data-a-preiszeile]'), "Preis auf Anfrage");
    pruefe("Bezahlung: beide Fragen sichtbar, dazu der Block „Sponsor“ mit der Firma und den übrigen Angaben aus dem Fall", (await sichtbar(page, '[data-bezahlung="kleidung"]')) && (await sichtbar(page, '[data-bezahlung="teambedarf"]')) && (await sichtbar(page, "[data-bst-sponsorblock]")) && [await wert(page, "#bst-sponsor-firma"), await wert(page, "#bst-sponsor-ansprech"), await wert(page, "#bst-sponsor-email"), await wert(page, "#bst-sponsor-tel"), await wert(page, "#bst-sponsor-anschrift")].join("|") === "Autohaus Beispiel|Frau Beispiel|info@autohaus-beispiel.example|030 23125 456|Beispielstraße 5\n60439 Frankfurt");
    gleich("Bezahlung: Fragen", (await texte(page, ".bst-gruppe:not([hidden]) legend")).join(" | "), "Lieferanschrift (die Bestellung kommt zu dir) | Wer zahlt die Kleidung? | Wer zahlt den Teambedarf? | Sponsor");
    gleich("Bezahlung: Antworten zur Auswahl", (await texte(page, '[data-bezahlung="kleidung"] .bst-option')).join(" | "), "Eltern bzw. Spieler | Vereinskasse | Sponsor | Spenden / Mannschaftskasse");
    pruefe("keine Lücken", !(await sichtbar(page, "[data-bst-luecken]")));
    gleich("noch nicht gesendet: keine Bestell-Nr. gespeichert", (await entwurfImSpeicher(page)).bestellNr, "");
    pruefe("noch nicht gesendet: kein Kasten „gesendet“, kein mailto ausgelöst", !(await sichtbar(page, "[data-bst-gesendet]")) && (await gesendet(page)).length === 0);
    pruefe("Hinweis „Die Bestellung ist lang“ erscheint bei dieser Bestellung nicht", !(await sichtbar(page, "[data-bst-lang]")));
    await pruefeLayout(page, "ausgefüllte Seite", 390);
    for (const breite of [320, 360, 375, 414, 600, 768]) {
      await page.setViewport({ width: breite, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true }); // Handy-Modus bleibt: sonst lädt Puppeteer die Seite neu
      await pruefeLayout(page, `ausgefüllte Seite bei ${breite} px`, breite);
      if (breite <= 414) await pruefeAuswahlfelder(page, `ausgefüllte Seite bei ${breite} px`);
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

    // Neuladen: der Entwurf ist noch da, die Seite öffnet ohne Eingabe des Codes
    await neuLaden(page);
    gleich("Neuladen: die Seite ist offen (der Code ist gemerkt)", await zustandVon(page), "offen");
    gleich("Neuladen: Mannschaft", await wert(page, "#bst-team"), "d3");
    gleich("Neuladen: Name", await wert(page, "#bst-name"), "Lena Beispiel");
    gleich("Neuladen: Telefon", await wert(page, "#bst-tel"), "030 23125 123");
    gleich("Neuladen: Gebraucht bis", await wert(page, "#bst-bis"), "2027-01-15");
    gleich("Neuladen: Lieferanschrift (Name folgt dem Besteller, Straße, Ort)", [await wert(page, "#bst-liefer-name"), await wert(page, "#bst-liefer-strasse"), await wert(page, "#bst-liefer-ort")].join("|"), "Lena Beispiel|Beispielweg 12|60439 Frankfurt");
    gleich("Neuladen: drei Personen", String(await page.$$eval(".bst-person", (l) => l.length)), "3");
    gleich("Neuladen: Namen der Personen", (await page.$$eval('[data-p="name"]', (l) => l.map((x) => x.value))).join(","), "Mia,Emil,Ben Kuhn");
    gleich("Neuladen: Bälle", await wert(page, '[data-teamposten="baelle"] [data-n]'), "10");
    gleich("Neuladen: Details der Bälle", await wert(page, '[data-teamposten="baelle"] [data-details]'), "Größe 4");
    gleich("Neuladen: Sonstiges", await wert(page, "#bst-sonstiges"), "Ersatznetz für das kleine Tor");
    gleich("Neuladen: Bezahlung Kleidung", (await page.$$eval('[data-bezahlung="kleidung"] input:checked', (l) => l.map((x) => x.value))).join(","), "eltern,sponsor");
    gleich("Neuladen: Bezahlung Teambedarf", await page.$eval('[data-bezahlung="teambedarf"] input:checked', (el) => el.value), "vereinskasse");
    gleich("Neuladen: Sponsor (Firma)", await wert(page, "#bst-sponsor-firma"), "Autohaus Beispiel");
    gleich("Neuladen: Hinweis zur Bezahlung", await wert(page, "#bst-hinweis-bezahlung"), "Eltern zahlen bar bei mir");
    gleich("Neuladen: Emils Trikot ohne Sponsorlogo (Aufdrucke bleiben)", (await page.$$eval('[data-person="p2"] [data-artikel="trikot"] [data-a="druck"]', (l) => l.map((x) => x.dataset.code + ":" + x.checked))).join(","), "W:true,V:true,SP:false,ZG:true");
    await pruefeMail(page, "nach dem Neuladen", FALL_A);
    pruefe("Neuladen: „gesendet“ und Bestell-Nr. sind noch da", (await sichtbar(page, "[data-bst-gesendet]")) && (await inhalt(page, "[data-bst-nr]")) === "D3-261125-1432");
    gleich("Neuladen: nichts davon liegt im Netz (Anfragen gehen nur an den Testserver)", String(p.anfragen.filter((u) => !u.startsWith(server.basis + "/") && !u.startsWith("data:")).length), "0");
    // Der Speicher: Schlüssel und Inhalt des Absenders
    const gespeichert = await page.evaluate((k1, k2) => ({ entwurf: localStorage.getItem(k1), absender: localStorage.getItem(k2) }), SCHLUESSEL_ENTWURF, SCHLUESSEL_ABSENDER);
    gleich("Speicher: Absender (Mannschaft, Name, Telefon, Lieferanschrift)", gespeichert.absender, JSON.stringify({ team: "d3", name: "Lena Beispiel", tel: "030 23125 123", lieferName: null, lieferStrasse: "Beispielweg 12", lieferOrt: "60439 Frankfurt" }));
    pruefe("Speicher: Entwurf ist gültiges JSON mit drei Personen, Aufdrucken je Artikel und dem Block Sponsor", (() => { const e = JSON.parse(gespeichert.entwurf); return e.personen.length === 3 && e.personen[1].artikel.trikot.aufdrucke.join() === "W,V,ZG" && e.sponsor.firma === "Autohaus Beispiel" && !("kleidungSponsor" in e.bezahlung); })());

    // Neue Bestellung: erst „Abbrechen“ in der Rückfrage, dann „OK“
    p.dialogAntwort = false;
    await page.click("[data-bst-neu]");
    pruefe("Neue Bestellung: Rückfrage erschien (confirm)", p.dialoge.filter((d) => d.art === "confirm").length === 1 && p.dialoge[p.dialoge.length - 1].text.startsWith("Neue Bestellung beginnen?"), JSON.stringify(p.dialoge));
    gleich("Neue Bestellung: die Rückfrage nennt, was bleibt (Mannschaft, Name, Telefon und Lieferanschrift)", p.dialoge[p.dialoge.length - 1].text, "Neue Bestellung beginnen? Deine Eingaben für diese Bestellung werden gelöscht. Mannschaft, Name, Telefon und Lieferanschrift bleiben erhalten.");
    gleich("Neue Bestellung: nach „Abbrechen“ ist alles noch da", String(await page.$$eval(".bst-person", (l) => l.length)) + "|" + (await inhalt(page, "[data-bst-nr]")), "3|D3-261125-1432");
    p.dialogAntwort = true;
    await page.click("[data-bst-neu]");
    gleich("Neue Bestellung: Rückfrage zum zweiten Mal", String(p.dialoge.filter((d) => d.art === "confirm").length), "2");
    gleich("Neue Bestellung: keine Personen mehr", String(await page.$$eval(".bst-person", (l) => l.length)), "0");
    gleich("Neue Bestellung: Teambedarf leer", (await page.$$eval("[data-n]", (l) => l.map((x) => x.value))).join(","), "0,0,0,0,0,0,0");
    gleich("Neue Bestellung: Sonstiges, Hinweise, Datum und Sponsor leer", [await wert(page, "#bst-sonstiges"), await wert(page, "#bst-hinweis-bezahlung"), await wert(page, "#bst-hinweis"), await wert(page, "#bst-bis"), await wert(page, "#bst-sponsor-firma"), await wert(page, "#bst-sponsor-anschrift")].join("|"), "|||||");
    gleich("Neue Bestellung: Mannschaft, Name, Telefon bleiben", [await wert(page, "#bst-team"), await wert(page, "#bst-name"), await wert(page, "#bst-tel")].join("|"), "d3|Lena Beispiel|030 23125 123");
    gleich("Neue Bestellung: die Lieferanschrift bleibt erhalten (Name, Straße, PLZ und Ort)", [await wert(page, "#bst-liefer-name"), await wert(page, "#bst-liefer-strasse"), await wert(page, "#bst-liefer-ort")].join("|"), "Lena Beispiel|Beispielweg 12|60439 Frankfurt");
    pruefe("Neue Bestellung: Kasten „gesendet“ weg, keine Bezahlfragen, kein Block „Sponsor“, Übersicht leer", !(await sichtbar(page, "[data-bst-gesendet]")) && !(await sichtbar(page, '[data-bezahlung="kleidung"]')) && !(await sichtbar(page, "[data-bst-sponsorblock]")) && (await page.$$eval("[data-u]", (l) => l.map((x) => x.textContent.trim()).join("|"))) === "0|0|0,00 €|–");
    gleich("Neue Bestellung: Fokus oben bei der Überschrift", await fokus(page), "bst-titel");
    const nachNeu = await page.evaluate((k1, k2) => ({ entwurf: JSON.parse(localStorage.getItem(k1)), absender: JSON.parse(localStorage.getItem(k2)) }), SCHLUESSEL_ENTWURF, SCHLUESSEL_ABSENDER);
    gleich("Neue Bestellung: Speicher – Entwurf ohne Personen, ohne Bestell-Nr., ohne Sponsor, Lieferanschrift bleibt", `${nachNeu.entwurf.personen.length}|${nachNeu.entwurf.bestellNr}|${nachNeu.entwurf.status}|${nachNeu.entwurf.sponsor.firma}|${nachNeu.entwurf.lieferStrasse}|${nachNeu.entwurf.lieferOrt}`, "0||||Beispielweg 12|60439 Frankfurt");
    gleich("Neue Bestellung: Speicher – Absender bleibt (mit Lieferanschrift)", JSON.stringify(nachNeu.absender), JSON.stringify({ team: "d3", name: "Lena Beispiel", tel: "030 23125 123", lieferName: null, lieferStrasse: "Beispielweg 12", lieferOrt: "60439 Frankfurt" }));
    await neuLaden(page);
    gleich("Neuladen nach „Neue Bestellung“: leer, der Absender samt Lieferanschrift bleibt", [String(await page.$$eval(".bst-person", (l) => l.length)), await wert(page, "#bst-team"), await wert(page, "#bst-name"), await wert(page, "#bst-tel"), await wert(page, "#bst-liefer-strasse"), await wert(page, "#bst-liefer-ort")].join("|"), "0|d3|Lena Beispiel|030 23125 123|Beispielweg 12|60439 Frankfurt");
    // Eine neue Bestellung bekommt eine neue Bestell-Nr. (später am Tag, gleiche Mannschaft); Mannschaft, Name, Telefon und Anschrift sind schon da
    await page.evaluate(festeUhr, 2026, 10, 25, 16, 5);
    await page.click("#bst-person-neu");
    await page.type('[data-person="p1"] [data-p="name"]', "Noah");
    await page.type('[data-person="p1"] [data-p="nummer"]', "4");
    await page.select('[data-person="p1"] [data-p="groesse"]', "128");
    await page.click('[data-person="p1"] [data-artikel="trikot"] [data-a="an"]');
    await page.click('[data-person="p1"] [data-artikel="trikot"] [data-a="druck"][data-code="SP"]'); // ohne Sponsorlogo: kein Block „Sponsor“, keine Firma nötig
    await page.click('[data-bezahlung="kleidung"] input[value="eltern"]');
    await page.click("#bst-senden");
    gleich("zweite Bestellung: neue Bestell-Nr. (16:05)", await inhalt(page, "[data-bst-nr]"), "D3-261125-1605");
    const zweite = dekodiere((await gesendet(page))[0]);
    pruefe("zweite Bestellung: Mail mit dem Absender von vorher, der Lieferanschrift und der neuen Nummer", zweite.text.includes("Bestellt von: Lena Beispiel, Tel. 030 23125 123\n" + ANSCHRIFT_TEXT) && zweite.betreff === "[TEST] Bestellung D3-Jugend – 1 Teil (D3-261125-1605)", zweite.betreff);
    pruefe("zweite Bestellung: ohne Sponsorlogo kein Block „Sponsor“ in der Mail", !zweite.text.includes("Sponsor"), zweite.text);
    pruefeProtokoll("Referenzbestellung", p, server);
  } finally {
    await schliessen();
  }
}

// Fälle (b) und (c) ebenfalls über die Oberfläche
async function ablaufFaelleBC(browser, server) {
  abschnitt("390 x 844: Fall (b) nur Teambedarf, Fall (c) Torwartset in Erwachsenengröße mit Sponsorlogo");
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
        pruefe("Fall (b): nur Teambedarf: keine Frage zur Kleidung, kein Block „Sponsor“, keine Personen in der Übersicht", !(await sichtbar(page, '[data-bezahlung="kleidung"]')) && !(await sichtbar(page, "[data-bst-sponsorblock]")) && (await inhalt(page, '[data-u="personen"]')) === "0" && (await inhalt(page, '[data-u="teambedarf"]')) === "3 Posten");
        gleich("Fall (b): Bestell-Nr. mit Kürzel mit Bindestrich und führender Null", await inhalt(page, "[data-bst-nr]"), "G-JUGEND-261125-0905");
        gleich("Fall (b): der Name der Lieferung ist die eigene Eingabe (nicht „Dein Name“)", [await wert(page, "#bst-name"), await wert(page, "#bst-liefer-name")].join("|"), "Karim Beispiel|Platzwart Beispiel");
      } else {
        gleich("Fall (c): Torwartset 122,99 €", await inhalt(page, '[data-u="summe"]'), "122,99 €");
        gleich("Fall (c): Stutzen für Erwachsene L (Senior)", await wert(page, '[data-artikel="stutzen"] [data-a="groesse"]'), "L (Senior)");
        gleich("Fall (c): Schnellwahl wählt genau sechs Artikel", String(await page.$$eval('[data-a="an"]:checked', (l) => l.length)), "6");
        pruefe("Fall (c): das Torwarttrikot trägt das Sponsorlogo, der Block „Sponsor“ ist da (ohne Antwort „Sponsor“), nur die Firma ist eingetragen", (await sichtbar(page, "[data-bst-sponsorblock]")) && (await wert(page, "#bst-sponsor-firma")) === "Bäckerei Beispiel" && (await page.$eval('[data-artikel="tw-trikot"] [data-a="druck"][data-code="SP"]', (el) => el.checked)));
      }
      pruefeProtokoll(`Fall (${id})`, p, server);
    } finally {
      await schliessen();
    }
  }
}

// Aufdrucke je Artikel: Kästchen mit Namen und Zuschlägen, Preiszeile, Preis und Teil 1 der Mail ändern sich mit dem Haken
async function ablaufAufdrucke(browser, server) {
  abschnitt("390 x 844: Aufdrucke je Artikel (Kästchen, Zuschläge, Preiszeile; Preis und Teil 1 ändern sich)");
  const { page, p, schliessen } = await oeffne(browser, server, { uhr: [2026, 10, 25, 14, 32] });
  const karte = '[data-person="p1"]';
  const zeile = (a) => `${karte} [data-artikel="${a}"]`;
  const druck = (a, code) => `${zeile(a)} [data-a="druck"][data-code="${code}"]`;
  const haken = (a) => page.$$eval(`${zeile(a)} [data-a="druck"]`, (l) => l.map((x) => x.dataset.code + ":" + (x.checked ? "1" : "0")).join(","));
  const preis = (a) => inhalt(page, `${zeile(a)} [data-a-preis]`);
  const preiszeile = (a) => inhalt(page, `${zeile(a)} [data-a-preiszeile]`);
  const vorschau = () => wert(page, "[data-bst-vorschau-text]");
  const summe = () => inhalt(page, `${karte} [data-p-summe]`);
  try {
    await page.select("#bst-team", "d3");
    await page.type("#bst-name", "Lena Beispiel");
    await page.type("#bst-liefer-strasse", "Beispielweg 12");
    await page.type("#bst-liefer-ort", "60439 Frankfurt");
    await page.click("#bst-person-neu");
    await page.type(`${karte} [data-p="name"]`, "Mia");
    await page.type(`${karte} [data-p="nummer"]`, "7");
    await page.select(`${karte} [data-p="groesse"]`, "140");
    for (const a of ["trikot", "shorts", "praesi-jacke", "rucksack", "regenjacke"]) await page.click(`${zeile(a)} [data-a="an"]`);

    // Trikot: vier Kästchen mit Namen und Zuschlag, alle vorausgewählt
    gleich("Trikot: Legende der Aufdrucke", (await inhalt(page, `${zeile("trikot")} [data-a-aufdrucke] legend`)).startsWith("Was soll drauf?") ? "ja" : "nein", "ja");
    gleich("Trikot: Namen der Kästchen", (await texte(page, `${zeile("trikot")} .bst-aufdruck__name`)).join(" | "), "Vereinswappen | Schriftzug SPEUZER | Sponsorlogo | Rückennummer groß");
    gleich("Trikot: Zuschläge hinter den Kästchen", (await texte(page, `${zeile("trikot")} .bst-aufdruck__preis`)).join(" | "), "+ 1,05 € | + 2,15 € | + 2,95 € | + 2,45 €");
    gleich("Trikot: alle vier vorausgewählt (der heutige Standard)", await haken("trikot"), "W:1,V:1,SP:1,ZG:1");
    pruefe("Shorts: kein Aufdruck möglich, keine Auswahl „Was soll drauf?“", !(await page.$(`${zeile("shorts")} [data-a-aufdrucke]`)));
    gleich("Trikot: Stückpreis (Grundpreis 13,14 € + 8,60 € Aufdrucke)", await preis("trikot"), "21,74 €");
    gleich("Trikot: Preiszeile mit Listenpreis, Rabatt, Grundpreis und Aufdrucken", await preiszeile("trikot"), "Listenpreis 21,90 € − 40 % = 13,14 € · Aufdrucke + 8,60 €");
    gleich("Shorts: Preiszeile ohne Aufdrucke", await preiszeile("shorts"), "Listenpreis 17,30 € − 40 % = 10,38 €");
    gleich("Zwischensumme mit allen Standard-Aufdrucken (21,74 + 10,38 + 29,04 + 15,21)", await summe(), "Zwischensumme: 76,37 € (ohne Regenjacke, Preis auf Anfrage) · 5 Teile");
    pruefe("Sponsorlogo angehakt: der Block „Sponsor“ ist da, Teil 1 und Teil 3 nennen es", (await sichtbar(page, "[data-bst-sponsorblock]")) && (await vorschau()).includes("Druck: Vereinswappen einfarbig, Vereinsnamen XL (SPEUZER), Werbeaufdruck M 1C (Sponsorlogo), Zahlen 20-26cm (Rückennummer)\n- Gr. 140: 1 Stück\n") && (await vorschau()).includes("Sponsorlogo: 1 Stück × 2,95 € = 2,95 €\n"));

    // Sponsorlogo abwählen: Preis, Preiszeile, Teil 1, Summe ändern sich; der Block „Sponsor“ verschwindet (kein Stück trägt es mehr)
    await page.click(druck("trikot", "SP"));
    gleich("Sponsorlogo abgewählt: Kästchen", await haken("trikot"), "W:1,V:1,SP:0,ZG:1");
    gleich("Sponsorlogo abgewählt: Preis 18,79 € (13,14 + 1,05 + 2,15 + 2,45)", await preis("trikot"), "18,79 €");
    gleich("Sponsorlogo abgewählt: Preiszeile mit 5,65 € für die Aufdrucke", await preiszeile("trikot"), "Listenpreis 21,90 € − 40 % = 13,14 € · Aufdrucke + 5,65 €");
    gleich("Sponsorlogo abgewählt: Zwischensumme", await summe(), "Zwischensumme: 73,42 € (ohne Regenjacke, Preis auf Anfrage) · 5 Teile");
    pruefe("Sponsorlogo abgewählt: Teil 1 ohne „Werbeaufdruck“, der Block „Sponsor“ ist weg, nichts vom Sponsor in der Mail", (await vorschau()).includes("JAKO Team Trikot kurzarm Kids Weiß F00 (4233)\nDruck: Vereinswappen einfarbig, Vereinsnamen XL (SPEUZER), Zahlen 20-26cm (Rückennummer)\n- Gr. 140: 1 Stück\n") && !(await vorschau()).includes("Werbeaufdruck") && !(await sichtbar(page, "[data-bst-sponsorblock]")) && !(await vorschau()).includes("Sponsor"));
    await page.click(druck("trikot", "SP"));
    pruefe("Sponsorlogo wieder angehakt: Preis wie vorher, der Block „Sponsor“ ist wieder da", (await preis("trikot")) === "21,74 €" && (await sichtbar(page, "[data-bst-sponsorblock]")));

    // Alle Aufdrucke abwählen: nur der Grundpreis, keine „Druck:“-Zeile, keine Druckdaten für das Trikot, die Nummer wird für das Trikot nicht mehr gebraucht
    for (const code of ["W", "V", "SP", "ZG"]) await page.click(druck("trikot", code));
    gleich("Trikot ohne Aufdrucke: Kästchen", await haken("trikot"), "W:0,V:0,SP:0,ZG:0");
    gleich("Trikot ohne Aufdrucke: Preis = Grundpreis", await preis("trikot"), "13,14 €");
    gleich("Trikot ohne Aufdrucke: Preiszeile ohne „Aufdrucke“", await preiszeile("trikot"), "Listenpreis 21,90 € − 40 % = 13,14 €");
    pruefe("Trikot ohne Aufdrucke: im Text keine „Druck:“-Zeile beim Trikot und keine Druckdaten dafür", (await vorschau()).includes("JAKO Team Trikot kurzarm Kids Weiß F00 (4233)\n- Gr. 140: 1 Stück\n") && !(await vorschau()).includes("- Trikot 4233"));
    await tippe(page, `${karte} [data-p="nummer"]`, "", true);
    await page.click("#bst-senden");
    pruefe("Nummer gelöscht: die Lücke nennt nur noch die Präsi-Jacke (das Trikot braucht keine Nummer mehr)", (await luecken(page)).includes("Bei Mia fehlt die Rückennummer (Präsi-Jacke)"), (await luecken(page)).join(" | "));
    await page.click('[data-luecke="p:p1:nummer"]');
    await page.type(`${karte} [data-p="nummer"]`, "7");

    // Artikel abwählen und wieder wählen: wieder die Standard-Aufdrucke
    await page.click(`${zeile("trikot")} [data-a="an"]`);
    await page.click(`${zeile("trikot")} [data-a="an"]`);
    gleich("Trikot abgewählt und wieder gewählt: wieder die Standard-Aufdrucke", await haken("trikot"), "W:1,V:1,SP:1,ZG:1");

    // Präsi-Jacke: „kleine Nummer vorne“ und „Name“; ohne „Name“ ist kein Name nötig
    gleich("Präsi-Jacke: Namen der Kästchen", (await texte(page, `${zeile("praesi-jacke")} .bst-aufdruck__name`)).join(" | "), "Vereinswappen | kleine Nummer vorne | Schriftzug SPEUZER | Name");
    gleich("Präsi-Jacke: Zuschläge", (await texte(page, `${zeile("praesi-jacke")} .bst-aufdruck__preis`)).join(" | "), "+ 1,05 € | + 1,25 € | + 2,15 € | + 1,55 €");
    gleich("Präsi-Jacke: Preis mit allen vier", await preis("praesi-jacke"), "29,04 €");
    await page.click(druck("praesi-jacke", "N"));
    gleich("Präsi-Jacke ohne Name: Kästchen", await haken("praesi-jacke"), "W:1,ZK:1,V:1,N:0");
    gleich("Präsi-Jacke ohne Name: Preis 27,49 € (23,04 + 1,05 + 1,25 + 2,15)", await preis("praesi-jacke"), "27,49 €");
    gleich("Präsi-Jacke ohne Name: Preiszeile", await preiszeile("praesi-jacke"), "Listenpreis 38,40 € − 40 % = 23,04 € · Aufdrucke + 4,45 €");
    pruefe("Präsi-Jacke ohne Name: Teil 1 ohne „Spielernamen S“, Druckdaten nur mit Nummer", (await vorschau()).includes("Druck: Vereinswappen einfarbig, Initialen / Zahlen 2-5cm, Vereinsnamen XL (SPEUZER)\n- Gr. 140: 1 Stück\n") && (await vorschau()).includes("- Präsi-Jacke 9300, Gr. 140: Nr. 7\n") && !(await vorschau()).includes("Spielernamen"));
    await tippe(page, `${karte} [data-p="name"]`, "", true);
    await page.click("#bst-senden");
    pruefe("ohne Name und ohne Name-Aufdruck: keine Lücke „fehlt der Name“", !(await luecken(page)).some((t) => t.includes("fehlt der Name")), (await luecken(page)).join(" | "));
    await page.click(druck("praesi-jacke", "N"));
    await page.click("#bst-senden");
    pruefe("Name-Aufdruck wieder angehakt, kein Name: die Lücke nennt den Artikel", (await luecken(page)).includes("Bei Person 1 fehlt der Name (Präsi-Jacke)"), (await luecken(page)).join(" | "));
    await page.click('[data-luecke="p:p1:name"]');
    await page.type(`${karte} [data-p="name"]`, "Mia");
    await page.click(druck("praesi-jacke", "N"));

    // Regenjacke: Preis auf Anfrage, „Initialen“ nur, solange das Kästchen angehakt ist
    gleich("Regenjacke: Namen der Kästchen (kleine Nummer heißt hier „Initialen“)", (await texte(page, `${zeile("regenjacke")} .bst-aufdruck__name`)).join(" | "), "Vereinswappen | Schriftzug SPEUZER | Initialen");
    gleich("Regenjacke: in der Zeile „Preis auf Anfrage“, auch in der Preiszeile", (await preis("regenjacke")) + "|" + (await preiszeile("regenjacke")), "Preis auf Anfrage|Preis auf Anfrage");
    gleich("Regenjacke: die Zuschläge der Aufdrucke stehen trotzdem dran", (await texte(page, `${zeile("regenjacke")} .bst-aufdruck__preis`)).join(" | "), "+ 1,05 € | + 2,15 € | + 1,25 €");
    pruefe("Regenjacke: das Feld „Initialen“ ist da (mit dem Vorschlag M), solange „Initialen“ angehakt ist", (await sichtbar(page, `${zeile("regenjacke")} [data-a="initialen"]`)) && (await wert(page, `${zeile("regenjacke")} [data-a="initialen"]`)) === "M");
    await page.click(druck("regenjacke", "ZK"));
    pruefe("Regenjacke: „Initialen“ abgewählt: das Feld ist weg, Teil 1 ohne Initialen, keine Druckdaten für die Regenjacke", !(await sichtbar(page, `${zeile("regenjacke")} [data-a="initialen"]`)) && (await vorschau()).includes("(7302)\nDruck: Vereinswappen einfarbig, Vereinsnamen XL (SPEUZER)\n- Gr. 140: 1 Stück\n") && !(await vorschau()).includes("- Regenjacke 7302"));
    await page.click(druck("regenjacke", "ZK"));
    pruefe("Regenjacke: „Initialen“ wieder angehakt: das Feld ist wieder da", await sichtbar(page, `${zeile("regenjacke")} [data-a="initialen"]`));

    // Rucksack: nur das Wappen vorausgewählt, der Schriftzug lässt sich dazuwählen
    gleich("Rucksack: Kästchen (nur das Wappen)", await haken("rucksack"), "W:1,V:0");
    gleich("Rucksack: Preis mit Wappen", await preis("rucksack"), "15,21 €");
    await page.click(druck("rucksack", "V"));
    gleich("Rucksack mit Schriftzug: Preis 17,36 € (14,16 + 1,05 + 2,15)", await preis("rucksack"), "17,36 €");
    gleich("Rucksack mit Schriftzug: Preiszeile", await preiszeile("rucksack"), "Listenpreis 23,60 € − 40 % = 14,16 € · Aufdrucke + 3,20 €");
    pruefe("Rucksack mit Schriftzug: Teil 1 nennt beide", (await vorschau()).includes("JAKO Striker Rucksack Blau F04 (1816)\nDruck: Vereinswappen einfarbig, Vereinsnamen XL (SPEUZER)\n- Einheitsgröße: 1 Stück\n"));

    // Schnellwahl: neue Artikel mit Standard-Aufdrucken, schon gewählte Artikel behalten ihre Aufdrucke
    await page.click(`${karte} [data-schnellwahl="grundausstattung"]`);
    gleich("Schnellwahl: der Rucksack behält den dazugewählten Schriftzug", await haken("rucksack"), "W:1,V:1");
    gleich("Schnellwahl: der Stutzen kommt dazu (kein Aufdruck möglich), Präsi-Hose ebenso", String(await page.$$eval(`${karte} [data-a="an"]:checked`, (l) => l.length)), "7");
    await page.click("#bst-person-neu");
    await page.click('[data-person="p2"] [data-schnellwahl="torwartset"]');
    gleich("Schnellwahl Torwartset: das TW-Trikot mit allen vier Standard-Aufdrucken", await page.$$eval('[data-person="p2"] [data-artikel="tw-trikot"] [data-a="druck"]', (l) => l.map((x) => x.dataset.code + ":" + (x.checked ? "1" : "0")).join(",")), "W:1,V:1,SP:1,ZG:1");
    gleich("Schnellwahl Torwartset: der Rucksack nur mit dem Wappen", await page.$$eval('[data-person="p2"] [data-artikel="rucksack"] [data-a="druck"]', (l) => l.map((x) => x.dataset.code + ":" + (x.checked ? "1" : "0")).join(",")), "W:1,V:0");
    // Der Zustand für das Bildschirmfoto: Trikot ohne Sponsorlogo; die Präsi-Jacke ist (von oben) schon ohne Name
    await page.click(druck("trikot", "SP"));
    gleich("Bildschirmfoto-Zustand: Trikot ohne Sponsorlogo (18,79 €), Präsi-Jacke ohne Name (27,49 €)", (await preis("trikot")) + "|" + (await preis("praesi-jacke")), "18,79 €|27,49 €");
    await pruefeLayout(page, "Aufdrucke", 390);
    for (const breite of [320, 375]) {
      await page.setViewport({ width: breite, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
      await pruefeLayout(page, `Aufdrucke bei ${breite} px`, breite);
      await pruefeAuswahlfelder(page, `Aufdrucke bei ${breite} px`);
    }
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    await pruefeBeschriftungen(page, "Aufdrucke");
    await pruefeIds(page, "Aufdrucke");
    await pruefeTippflaechen(page, "Aufdrucke");
    await pruefeAxe(page, "Aufdrucke");
    await foto(page, "390-aufdrucke.png");
    pruefeProtokoll("Aufdrucke", p, server);
  } finally {
    await schliessen();
  }
}

// Sponsor-Block und Lieferanschrift
async function ablaufSponsorLieferung(browser, server) {
  abschnitt("390 x 844: Block „Sponsor“ (wann er erscheint) und Lieferanschrift (folgt dem Namen, wird gemerkt)");
  const { page, p, schliessen } = await oeffne(browser, server, { uhr: [2026, 10, 25, 14, 32] });
  const karte = '[data-person="p1"]';
  const block = "[data-bst-sponsorblock]";
  try {
    // Der Name der Lieferung folgt „Dein Name“, bis man ihn selbst ändert
    await page.select("#bst-team", "d3");
    await page.type("#bst-name", "Lena Beispiel");
    gleich("Lieferung: der Name folgt „Dein Name“", await wert(page, "#bst-liefer-name"), "Lena Beispiel");
    await page.type("#bst-name", " B.");
    gleich("Lieferung: … und folgt weiter, solange man ihn nicht ändert", await wert(page, "#bst-liefer-name"), "Lena Beispiel B.");
    gleich("Lieferung: noch nicht geändert (null im Entwurf)", String((await entwurfImSpeicher(page)).lieferName), "null");
    await tippe(page, "#bst-liefer-name", "Platzwart Beispiel", true);
    gleich("Lieferung: eigener Name im Entwurf", (await entwurfImSpeicher(page)).lieferName, "Platzwart Beispiel");
    await tippe(page, "#bst-name", "Lena Beispiel", true);
    gleich("Lieferung: nach der eigenen Eingabe folgt der Name nicht mehr", await wert(page, "#bst-liefer-name"), "Platzwart Beispiel");
    await tippe(page, "#bst-liefer-name", "", true);
    await page.click("#bst-senden");
    pruefe("Lieferung: Name leer gelassen: die Lücke nennt die Lieferung (nicht „Dein Name“)", (await luecken(page)).includes("Bitte gib den Namen für die Lieferung an") && !(await luecken(page)).includes("Bitte trage deinen Namen ein") && (await page.$eval("#bst-liefer-name", (el) => el.getAttribute("aria-invalid"))) === "true", (await luecken(page)).join(" | "));
    await tippe(page, "#bst-liefer-name", "Platzwart Beispiel");
    await page.type("#bst-liefer-strasse", "Beispielweg 12");
    await page.type("#bst-liefer-ort", "60439Frankfurt");
    await page.click("#bst-person-neu");
    await page.type(`${karte} [data-p="name"]`, "Mia");
    await page.select(`${karte} [data-p="groesse"]`, "140");
    await page.click(`${karte} [data-artikel="shorts"] [data-a="an"]`);
    await page.click('[data-bezahlung="kleidung"] input[value="eltern"]');
    pruefe("Lieferung: „60439Frankfurt“ ohne Leerzeichen ist in Ordnung, in der Mail steht „60439 Frankfurt“", !(await sichtbar(page, "[data-bst-luecken]")) && (await wert(page, "[data-bst-vorschau-text]")).includes("Lieferung an: Platzwart Beispiel, Beispielweg 12, 60439 Frankfurt\n") && (await wert(page, "[data-bst-vorschau-text]")).includes("Lieferanschrift:\nPlatzwart Beispiel\nBeispielweg 12\n60439 Frankfurt\n"));
    for (const falsch of ["Frankfurt", "604390 Frankfurt", "60439"]) {
      await tippe(page, "#bst-liefer-ort", falsch, true);
      await page.click("#bst-senden");
      pruefe(`Lieferung: PLZ und Ort „${falsch}“: Lücke mit dem Beispiel, Rahmen am Feld, kein mailto`, (await luecken(page)).join(" | ") === TEXT_LUECKE_ORT && (await page.$eval("#bst-liefer-ort", (el) => el.getAttribute("aria-invalid"))) === "true" && (await gesendet(page)).length === 0);
    }
    await tippe(page, "#bst-liefer-ort", "60439 Frankfurt", true);

    // Der Block „Sponsor“: nur bei „Sponsor“ in der Bezahlung oder einem Stück mit Sponsorlogo
    pruefe("Sponsor: Shorts und Antwort „Eltern“: kein Block", !(await sichtbar(page, block)));
    await page.click('[data-bezahlung="kleidung"] input[value="sponsor"]');
    pruefe("Sponsor: Antwort „Sponsor“ bei der Kleidung: der Block erscheint", await sichtbar(page, block));
    gleich("Sponsor: Legende des Blocks", await inhalt(page, `${block} legend`), "Sponsor");
    gleich("Sponsor: Hinweis für die Geschäftsstelle wörtlich", await inhalt(page, `${block} .bst-hinweis`), TEXT_HINWEIS_SPONSOR);
    gleich("Sponsor: Felder des Blocks", (await texte(page, `${block} label`)).join(" | "), "Firma | Ansprechpartner (freiwillig) | E-Mail (freiwillig) | Telefon (freiwillig) | Anschrift für die Rechnung (freiwillig)");
    pruefe("Sponsor: der Block steht im Abschnitt „Bezahlung“, nach den beiden Fragen und vor den Hinweisen", await page.evaluate(() => { const s = document.querySelector('section[aria-labelledby="bst-h-bezahlung"]'); const b = s.querySelector("[data-bst-sponsorblock]"); return !!b && b.compareDocumentPosition(s.querySelector("#bst-hinweis-bezahlung")) & Node.DOCUMENT_POSITION_FOLLOWING && s.querySelector('[data-bezahlung="teambedarf"]').compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING; }));
    await page.click("#bst-senden");
    gleich("Sponsor: ohne Firma die Lücke „Bitte trage die Firma des Sponsors ein“, Rahmen am Feld, nur diese", (await luecken(page)).join(" | ") + "|" + (await page.$eval("#bst-sponsor-firma", (el) => el.getAttribute("aria-invalid"))), "Bitte trage die Firma des Sponsors ein|true");
    await page.click('[data-luecke="sponsor:firma"]');
    gleich("Sponsor: Sprung aus der Lücke ins Feld „Firma“", await fokus(page), "bst-sponsor-firma");
    await page.type("#bst-sponsor-firma", "Autohaus Beispiel");
    pruefe("Sponsor: Firma eingetragen: keine Lücke mehr", !(await sichtbar(page, "[data-bst-luecken]")));
    await page.click('[data-bezahlung="kleidung"] input[value="sponsor"]');
    pruefe("Sponsor: Antwort „Sponsor“ wieder abgehakt: der Block ist weg, die Firma bleibt im Entwurf, steht aber nicht in der Mail", !(await sichtbar(page, block)) && (await entwurfImSpeicher(page)).sponsor.firma === "Autohaus Beispiel" && !(await wert(page, "[data-bst-vorschau-text]")).includes("Autohaus"));
    await page.click(`${karte} [data-artikel="trikot"] [data-a="an"]`);
    pruefe("Sponsor: ein Trikot mit Sponsorlogo (Standard): der Block erscheint, ohne dass „Sponsor“ angehakt wäre", (await sichtbar(page, block)) && (await page.$$eval('[data-bezahlung="kleidung"] input:checked', (l) => l.map((x) => x.value).join())) === "eltern");
    await page.click(`${karte} [data-artikel="trikot"] [data-a="druck"][data-code="SP"]`);
    pruefe("Sponsor: Sponsorlogo abgewählt: der Block ist wieder weg", !(await sichtbar(page, block)));
    await page.click(`${karte} [data-artikel="trikot"] [data-a="an"]`); // Trikot wieder abwählen
    // Nur Teambedarf mit „Sponsor“: der Block erscheint auch dann
    await page.click(`${karte} [data-artikel="shorts"] [data-a="an"]`);
    await page.click('[data-teamposten="ballpumpe"] [data-schritt="1"]');
    pruefe("Sponsor: nur Teambedarf, noch keine Antwort „Sponsor“: kein Block", !(await sichtbar(page, block)));
    await page.click('[data-bezahlung="teambedarf"] input[value="sponsor"]');
    pruefe("Sponsor: Antwort „Sponsor“ beim Teambedarf: der Block erscheint (Firma noch aus dem Entwurf)", (await sichtbar(page, block)) && (await wert(page, "#bst-sponsor-firma")) === "Autohaus Beispiel");
    const nurTeam = await wert(page, "[data-bst-vorschau-text]");
    pruefe("Sponsor: nur Teambedarf: Teil 3 enthält nur den Block „Sponsor“", nurTeam.includes("- 1 × Ballpumpe\n\n== 3. NUR INTERN – NICHT WEITERLEITEN ==\nSponsor (für die Geschäftsstelle):\nFirma: Autohaus Beispiel\n\nViele Grüße\n") && !nurTeam.includes("Zuordnung"), nurTeam);
    await page.click('[data-bezahlung="teambedarf"] input[value="sponsor"]');
    await page.click('[data-bezahlung="teambedarf"] input[value="vereinskasse"]');

    // Alle Felder des Blocks: so kommen sie in Teil 3 an
    await page.click(`${karte} [data-artikel="shorts"] [data-a="an"]`);
    await page.click(`${karte} [data-artikel="trikot"] [data-a="an"]`);
    await page.type(`${karte} [data-p="nummer"]`, "7");
    await page.type("#bst-sponsor-ansprech", "Frau Beispiel");
    await page.type("#bst-sponsor-email", "info@autohaus-beispiel.example");
    await page.type("#bst-sponsor-tel", "030 23125 456");
    await page.type("#bst-sponsor-anschrift", "Beispielstraße 5\n60439 Frankfurt");
    const m = await wert(page, "[data-bst-vorschau-text]");
    pruefe("Sponsor: alle Felder in Teil 3, die Anschrift mit eingerückter Folgezeile, Sponsorlogo 1 Stück", m.includes("== 3. NUR INTERN – NICHT WEITERLEITEN ==\nSponsor (für die Geschäftsstelle):\nFirma: Autohaus Beispiel\nAnsprechpartner: Frau Beispiel\nE-Mail: info@autohaus-beispiel.example\nTelefon: 030 23125 456\nAnschrift: Beispielstraße 5\n  60439 Frankfurt\nSponsorlogo: 1 Stück × 2,95 € = 2,95 €\n\nZuordnung je Person"), m);
    pruefe("Sponsor: der Sponsor steht nicht in Teil 1 für den Lieferanten", !m.slice(m.indexOf("== 1."), m.indexOf("== 2.") > 0 ? m.indexOf("== 2.") : m.indexOf("== 3.")).includes("Autohaus"));
    pruefe("Sponsor: Telefon und E-Mail haben die passenden Feldarten (tel, email)", await page.evaluate(() => document.getElementById("bst-sponsor-tel").type === "tel" && document.getElementById("bst-sponsor-email").type === "email" && document.getElementById("bst-sponsor-anschrift").tagName === "TEXTAREA"));

    // Gemerkt: Neuladen und „Neue Bestellung beginnen“
    await neuLaden(page);
    gleich("Neuladen: Lieferanschrift (eigener Name, Straße, Ort)", [await wert(page, "#bst-liefer-name"), await wert(page, "#bst-liefer-strasse"), await wert(page, "#bst-liefer-ort")].join("|"), "Platzwart Beispiel|Beispielweg 12|60439 Frankfurt");
    gleich("Neuladen: die Felder des Blocks „Sponsor“", [await wert(page, "#bst-sponsor-firma"), await wert(page, "#bst-sponsor-ansprech"), await wert(page, "#bst-sponsor-email"), await wert(page, "#bst-sponsor-tel"), await wert(page, "#bst-sponsor-anschrift")].join("|"), "Autohaus Beispiel|Frau Beispiel|info@autohaus-beispiel.example|030 23125 456|Beispielstraße 5\n60439 Frankfurt");
    await foto(page, "390-sponsor-lieferung.png");
    await pruefeLayout(page, "Sponsor und Lieferanschrift", 390);
    await pruefeBeschriftungen(page, "Sponsor und Lieferanschrift");
    await pruefeIds(page, "Sponsor und Lieferanschrift");
    await pruefeTippflaechen(page, "Sponsor und Lieferanschrift");
    await pruefeAxe(page, "Sponsor und Lieferanschrift");
    await page.click("#bst-senden");
    pruefe("Sponsor und Lieferanschrift: die vollständige Bestellung lässt sich senden (genau ein mailto)", (await gesendet(page)).length === 1 && dekodiere((await gesendet(page))[0]).text.includes("Lieferung an: Platzwart Beispiel, Beispielweg 12, 60439 Frankfurt\n"));
    await page.click("[data-bst-neu]");
    gleich("Neue Bestellung: die Lieferanschrift bleibt (eigener Name, Straße, Ort), der Block „Sponsor“ ist weg und leer", [await wert(page, "#bst-liefer-name"), await wert(page, "#bst-liefer-strasse"), await wert(page, "#bst-liefer-ort"), String(await sichtbar(page, block)), await wert(page, "#bst-sponsor-firma")].join("|"), "Platzwart Beispiel|Beispielweg 12|60439 Frankfurt|false|");
    gleich("Neue Bestellung: im Speicher des Absenders", await imSpeicher(page, SCHLUESSEL_ABSENDER), JSON.stringify({ team: "d3", name: "Lena Beispiel", tel: "", lieferName: "Platzwart Beispiel", lieferStrasse: "Beispielweg 12", lieferOrt: "60439 Frankfurt" }));
    pruefeProtokoll("Sponsor und Lieferanschrift", p, server);
  } finally {
    await schliessen();
  }
}

// Lückenliste mit mehreren Fehlern (Bildschirmfoto) und der Weg zu den Feldern
async function ablaufLuecken(browser, server) {
  abschnitt("390 x 844: Lückenliste mit mehreren Fehlern (auch doppelte Rückennummer und Sponsor)");
  const { page, p, schliessen } = await oeffne(browser, server);
  try {
    await page.select("#bst-team", "d3");
    await page.type("#bst-name", "Lena Beispiel");
    await page.type("#bst-liefer-strasse", "Beispielweg 12");
    await page.type("#bst-liefer-ort", "60439 Frankfurt");
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
    // dritte Person ohne Namen: Präsi-Jacke (braucht Namen und Nummer), Nummer 9
    await page.click("#bst-person-neu");
    await page.select('[data-person="p3"] [data-p="groesse"]', "152");
    await page.type('[data-person="p3"] [data-p="nummer"]', "9");
    await page.click('[data-person="p3"] [data-artikel="praesi-jacke"] [data-a="an"]');
    // vierte Person: Trikot mit derselben Nummer 9
    await page.click("#bst-person-neu");
    await page.type('[data-person="p4"] [data-p="name"]', "Cem");
    await page.type('[data-person="p4"] [data-p="nummer"]', "9");
    await page.select('[data-person="p4"] [data-p="groesse"]', "152");
    await page.click('[data-person="p4"] [data-artikel="trikot"] [data-a="an"]');
    // Teambedarf ohne Bezahlung
    await page.click('[data-teamposten="baelle"] [data-schritt="1"]');
    await page.click("#bst-senden");
    gleich("Lücken: Liste in Klartext, in der Reihenfolge der Seite", (await luecken(page)).join(" | "), [
      "Bei Mia fehlt die Rückennummer (Trikot, Präsi-Jacke)",
      "Bei Ben Kuhn fehlen die Initialen (Regenjacke)",
      "Bei Person 3 fehlt der Name (Präsi-Jacke)",
      "Die Rückennummer 9 ist doppelt (Person 3 und Cem)",
      "Bitte wähle, wer die Kleidung zahlt",
      "Bitte wähle, wer den Teambedarf zahlt",
      "Bitte trage die Firma des Sponsors ein",
    ].join(" | "));
    gleich("Lücken: Überschrift der Liste", await inhalt(page, ".bst-luecken__titel"), "Bitte ergänze noch:");
    gleich("Lücken: Fokus auf der ersten Lücke", await page.evaluate(() => document.activeElement.textContent.trim()), "Bei Mia fehlt die Rückennummer (Trikot, Präsi-Jacke)");
    gleich("Lücken: kein mailto ausgelöst, kein Kasten „gesendet“", String((await gesendet(page)).length) + "|" + String(await sichtbar(page, "[data-bst-gesendet]")), "0|false");
    pruefe("Lücken: Felder mit Lücke tragen aria-invalid (auch beide Felder der doppelten Nummer, die Firma, beide Bezahlgruppen)", await page.evaluate(() => ["p:p1:nummer", "p:p2:initialen", "p:p3:name", "p:p3:nummer", "p:p4:nummer", "sponsor:firma"].every((s) => document.querySelector(`[data-schluessel="${s}"]`).getAttribute("aria-invalid") === "true") && document.querySelector('[data-schluessel="bezahlung:kleidung"]').classList.contains("bst-gruppe--luecke") && [...document.querySelectorAll('[data-bezahlung="kleidung"] input[type="checkbox"]')].every((c) => c.getAttribute("aria-invalid") === "true") && document.querySelector('[data-bezahlung="teambedarf"]').classList.contains("bst-gruppe--luecke") && [...document.querySelectorAll('[data-bezahlung="teambedarf"] input[type="checkbox"]')].every((c) => c.getAttribute("aria-invalid") === "true")));
    pruefe("Lücken: Felder ohne Lücke tragen es nicht (Mannschaft, Lieferanschrift, Namen von Mia und Cem, Nummer ist nicht betroffen bei Ben)", await page.evaluate(() => !document.getElementById("bst-team").hasAttribute("aria-invalid") && !document.getElementById("bst-liefer-strasse").hasAttribute("aria-invalid") && !document.querySelector('[data-schluessel="p:p1:name"]').hasAttribute("aria-invalid") && !document.querySelector('[data-schluessel="p:p4:name"]').hasAttribute("aria-invalid")));
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
    await page.type('[data-person="p3"] [data-p="name"]', "Dora");
    gleich("Doppelte Nummer: mit dem Namen ändert sich die Lücke (Dora und Cem)", (await luecken(page)).filter((t) => t.includes("doppelt")).join("|"), "Die Rückennummer 9 ist doppelt (Dora und Cem)");
    await page.click('[data-luecke="p:p4:nummer"]');
    gleich("Sprung: bei der doppelten Nummer das zweite Feld (Cem)", await page.evaluate(() => document.activeElement.closest("[data-person]").dataset.person + ":" + document.activeElement.dataset.p), "p4:nummer");
    await tippe(page, '[data-person="p4"] [data-p="nummer"]', "10", true);
    pruefe("Doppelte Nummer behoben: Lücke und Rahmen an beiden Feldern weg", !(await luecken(page)).some((t) => t.includes("doppelt")) && (await page.evaluate(() => !document.querySelector('[data-schluessel="p:p3:nummer"]').hasAttribute("aria-invalid") && !document.querySelector('[data-schluessel="p:p4:nummer"]').hasAttribute("aria-invalid"))));
    await page.click('[data-luecke="bezahlung:kleidung"]');
    gleich("Sprung: Bezahlung der Kleidung (erste Antwort)", await page.evaluate(() => document.activeElement.name + ":" + document.activeElement.value), "bez-kleidung:eltern");
    await page.keyboard.press("Space");
    gleich("Bezahlung per Tastatur gewählt (Leertaste)", await page.$eval('[data-bezahlung="kleidung"] input:checked', (el) => el.value), "eltern");
    gleich("Lücken: es bleiben Teambedarf und Firma", (await luecken(page)).join(" | "), "Bitte wähle, wer den Teambedarf zahlt | Bitte trage die Firma des Sponsors ein");
    await page.click('[data-bezahlung="teambedarf"] input[value="vereinskasse"]');
    gleich("Lücken: es bleibt die Firma", (await luecken(page)).join(" | "), "Bitte trage die Firma des Sponsors ein");
    await page.click('[data-luecke="sponsor:firma"]');
    gleich("Sprung: Firma des Sponsors", await fokus(page), "bst-sponsor-firma");
    await page.type("#bst-sponsor-firma", "Autohaus Beispiel");
    pruefe("alles behoben: Liste der Lücken weg", !(await sichtbar(page, "[data-bst-luecken]")));
    const mailto = await page.$eval("#bst-senden", (el) => el.dataset.mailto || "");
    pruefe("alles behoben: Sendelink trägt jetzt den mailto", mailto.startsWith("mailto:") && dekodiere(mailto).text.includes("Bezahlung Teambedarf: Vereinskasse\n") && dekodiere(mailto).text.includes("Firma: Autohaus Beispiel\n"));
    pruefe("alles behoben: Name der Mannschaft und Zahl der Teile im Betreff (Mia 2, Ben 1, Dora 1, Cem 1)", dekodiere(mailto).betreff.startsWith("[TEST] Bestellung D3-Jugend – 5 Teile, Teambedarf ("));
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
    // Die Aufdrucke lassen sich per Tastatur wählen: Tab geht vom Artikel zur Größe, dann in die Kästchen
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    gleich("Tastatur: Tab › Tab vom Trikot: erst die Größe, dann das erste Kästchen „Vereinswappen“", await page.evaluate(() => document.activeElement.dataset.code || document.activeElement.dataset.a), "W");
    await page.keyboard.press("Space");
    gleich("Tastatur: Leertaste wählt das Wappen ab", await page.$$eval(artikel("p1", "trikot", '[data-a="druck"]'), (l) => l.map((x) => x.dataset.code + ":" + (x.checked ? "1" : "0")).join(",")), "W:0,V:1,SP:1,ZG:1");
    await page.keyboard.press("Space");

    // Größen: Preis zur Größe, Vorauswahl folgt der Person, eigene Wahl bleibt
    gleich("Preis Trikot bei Größe 116 (Kind)", await inhalt(page, artikel("p1", "trikot", "[data-a-preis]")), "21,74 €");
    await page.select(`${karte("p1")} [data-p="groesse"]`, "M");
    gleich("Größe der Person M: Trikot folgt (M)", await wert(page, artikel("p1", "trikot", '[data-a="groesse"]')), "M");
    gleich("Größe der Person M: Preis Trikot Erwachsene", await inhalt(page, artikel("p1", "trikot", "[data-a-preis]")), "23,84 €");
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
    gleich("Größenauswahl: der Platzhalter ist kurz („wählen“), damit nichts abgeschnitten wirkt", (await page.$eval(`${karte("p1")} [data-p="groesse"] option`, (o) => o.textContent)) + "|" + (await page.$eval(artikel("p1", "trikot", '[data-a="groesse"] option'), (o) => o.textContent)), "wählen|wählen");
    gleich("Größenauswahl: Winterjacke ohne 116", (await page.$$eval(artikel("p1", "winterjacke", '[data-a="groesse"] option'), (l) => l.map((o) => o.value).filter(Boolean))).join(" "), "128 140 152 164 S M L XL XXL 3XL");
    gleich("Größenauswahl: Stutzen S (Bambini), M (Junior), L (Senior)", (await page.$$eval(artikel("p1", "stutzen", '[data-a="groesse"] option'), (l) => l.map((o) => o.value).filter(Boolean))).join(" | "), "S (Bambini) | M (Junior) | L (Senior)");

    // Winterjacke bei Größe 116: Vorauswahl 128 mit Hinweis
    await page.select(`${karte("p1")} [data-p="groesse"]`, "116");
    await page.click(artikel("p1", "winterjacke", '[data-a="an"]'));
    gleich("Winterjacke bei 116: Vorauswahl 128", await wert(page, artikel("p1", "winterjacke", '[data-a="groesse"]')), "128");
    gleich("Winterjacke bei 116: Hinweis", await inhalt(page, artikel("p1", "winterjacke", "[data-a-hinweis]")), "Winterjacke gibt es für Kinder erst ab 128");
    gleich("Winterjacke bei 116: Preis (Kinder, V + N + ZK)", await inhalt(page, artikel("p1", "winterjacke", "[data-a-preis]")), "39,93 €");
    await page.select(artikel("p1", "winterjacke", '[data-a="groesse"]'), "140");
    pruefe("Winterjacke: eigene Wahl 140, Hinweis weg", (await wert(page, artikel("p1", "winterjacke", '[data-a="groesse"]'))) === "140" && !(await sichtbar(page, artikel("p1", "winterjacke", "[data-a-hinweis]"))));
    await page.select(`${karte("p1")} [data-p="groesse"]`, "140");
    gleich("Winterjacke bei Größe 140: ohne Hinweis", String(await sichtbar(page, artikel("p1", "winterjacke", "[data-a-hinweis]"))), "false");
    const lieferant = await page.$eval("[data-bst-vorschau-text]", (el) => el.value);
    pruefe("Winterjacke 116 mit eigener Wahl 140: im Text Gr. 140", lieferant.includes("- Gr. 140:"));
    // Preis ohne Größe der Person
    await page.click("#bst-person-neu");
    gleich("zweite Person ohne Größe: „ab“-Preise beim Trikot und bei den Shorts, ein Preis beim Rucksack, „Preis auf Anfrage“ bei der Regenjacke", [await inhalt(page, artikel("p2", "trikot", "[data-a-preis]")), await inhalt(page, artikel("p2", "shorts", "[data-a-preis]")), await inhalt(page, artikel("p2", "rucksack", "[data-a-preis]")), await inhalt(page, artikel("p2", "regenjacke", "[data-a-preis]"))].join("|"), "ab 21,74 €|ab 10,38 €|15,21 €|Preis auf Anfrage");

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
    pruefe("Initialen geleert: Lücke „fehlen die Initialen“", (await luecken(page)).includes("Bei Benedikt Kuhn fehlen die Initialen (Regenjacke)"));

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
    await page.click(`${baelle} [data-schritt="-1"]`); // einmal, damit der Entwurf sicher gespeichert ist
    await neuLaden(page);
    pruefe("Neuladen: Bezahlfragen für beides sichtbar (Kleidung und Teambedarf sind im Entwurf)", (await sichtbar(page, '[data-bezahlung="kleidung"]')) && (await sichtbar(page, '[data-bezahlung="teambedarf"]')));
    await page.click(artikel("p1", "trikot", '[data-a="an"]'));
    pruefe("Bezahlung bleibt sichtbar, solange noch ein Artikel gewählt ist", await sichtbar(page, '[data-bezahlung="kleidung"]'));
    for (const a of ["shorts", "stutzen", "praesi-jacke", "praesi-hose", "rucksack", "winterjacke"]) {
      if (await page.$eval(artikel("p1", a, '[data-a="an"]'), (el) => el.checked)) await page.click(artikel("p1", a, '[data-a="an"]'));
    }
    await page.click(artikel("p2", "regenjacke", '[data-a="an"]'));
    pruefe("keine Kleidung mehr gewählt: Frage zur Kleidung weg, Teambedarf bleibt", !(await sichtbar(page, '[data-bezahlung="kleidung"]')) && (await sichtbar(page, '[data-bezahlung="teambedarf"]')));
    gleich("keine Kleidung mehr: Personen zählen nicht (0)", await inhalt(page, '[data-u="personen"]'), "0");
    pruefe("keine Kleidung mehr: kein Block „Sponsor“ (kein Stück trägt ein Sponsorlogo)", !(await sichtbar(page, "[data-bst-sponsorblock]")));
    await page.click('[data-bezahlung="teambedarf"] input[value="sponsor"]');
    pruefe("Sponsor beim Teambedarf: der Block erscheint, das Feld „Firma“ ist beschriftet", (await sichtbar(page, "[data-bst-sponsorblock]")) && (await inhalt(page, '[data-bst-sponsorblock] label[for="bst-sponsor-firma"]')) === "Firma");
    await page.click('[data-bezahlung="teambedarf"] input[value="sponsor"]');
    pruefe("Haken weg: der Block ist weg", !(await sichtbar(page, "[data-bst-sponsorblock]")));
    await page.click('[data-bezahlung="teambedarf"] input[value="vereinskasse"]');
    pruefe("andere Antwort angehakt: der Block bleibt weg", !(await sichtbar(page, "[data-bst-sponsorblock]")));
    pruefe("Personen ohne Artikel erzeugen keine Lücke (nur Bezahlung gewählt; Mannschaft, Name und Lieferanschrift fehlen)", await page.evaluate(async () => { document.getElementById("bst-senden").click(); return [...document.querySelectorAll("[data-luecke]")].every((b) => ["team", "name", "lieferStrasse", "lieferOrt"].includes(b.dataset.luecke)); }));
    await pruefeLayout(page, "Felder", 390);
    pruefeProtokoll("Felder und Tastatur", p, server);
  } finally {
    await schliessen();
  }
}

// Die Auswahl der Größe ist bei 320, 360 und 375 px nie abgeschnitten (auch nicht mit dem längsten Text „S (Bambini)“)
async function ablaufAuswahlbreiten(browser, server) {
  abschnitt("320 bis 414 px: die Auswahl der Größe ist nie abgeschnitten, kein waagrechtes Scrollen");
  const { page, p, schliessen } = await oeffne(browser, server, { breite: 320 });
  try {
    await page.click("#bst-person-neu");
    await page.select('[data-person="p1"] [data-p="groesse"]', "140");
    await page.click('[data-person="p1"] [data-schnellwahl="grundausstattung"]');
    await page.click('[data-person="p1"] [data-artikel="winterjacke"] [data-a="an"]');
    await page.click('[data-person="p1"] [data-artikel="regenjacke"] [data-a="an"]');
    await page.select('[data-person="p1"] [data-artikel="stutzen"] [data-a="groesse"]', "S (Bambini)");
    await page.select('[data-person="p1"] [data-artikel="trikot"] [data-a="groesse"]', "164");
    await page.select('[data-person="p1"] [data-artikel="praesi-hose"] [data-a="groesse"]', "152");
    for (const breite of [320, 360, 375, 390, 414]) {
      await page.setViewport({ width: breite, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
      await pruefeLayout(page, `Größenauswahl bei ${breite} px`, breite);
      await pruefeAuswahlfelder(page, `Größenauswahl bei ${breite} px (mit „S (Bambini)“, 164, 152)`);
      pruefe(`Größenauswahl bei ${breite} px: die Größe steht neben oder unter ihrer Beschriftung, nichts ragt aus der Karte`, await page.evaluate(() => { const k = document.querySelector('[data-person="p1"]').getBoundingClientRect(); return [...document.querySelectorAll('[data-person="p1"] select, [data-person="p1"] .bst-aufdruck, [data-person="p1"] .bst-preiszeile')].every((e) => e.getClientRects().length === 0 || (e.getBoundingClientRect().right <= k.right + 0.5 && e.getBoundingClientRect().left >= k.left - 0.5)); }));
    }
    await pruefeTippflaechen(page, "Größenauswahl bei 414 px");
    pruefeProtokoll("Größenauswahl", p, server);
  } finally {
    await schliessen();
  }
}

// Bezahlung als Mehrfachauswahl: Kontrollkästchen, Sponsor mit Firma, Katalogreihenfolge, Lücke ohne Haken
async function ablaufBezahlung(browser, server) {
  abschnitt("390 x 844: Bezahlung als Mehrfachauswahl (Kontrollkästchen, Sponsor mit Firma, Reihenfolge, Lücke ohne Haken)");
  const { page, p, schliessen } = await oeffne(browser, server, { uhr: [2026, 10, 25, 14, 32] });
  const haken = (block, id) => `[data-bezahlung="${block}"] input[value="${id}"]`;
  const angehakt = (block) => page.$$eval(`[data-bezahlung="${block}"] input:checked`, (l) => l.map((x) => x.value).join(","));
  const imEntwurf = (block) => page.evaluate((k, b) => JSON.parse(localStorage.getItem(k)).bezahlung[b], SCHLUESSEL_ENTWURF, block);
  const vorschau = () => wert(page, "[data-bst-vorschau-text]");
  const zeileMit = async (anfang) => (await vorschau()).split("\n").find((z) => z.startsWith(anfang));
  // Die Referenzbestellung (a) mit anderen Antworten: nur die beiden Zeilen zur Bezahlung ändern sich (der Block „Sponsor“ bleibt, weil Stücke das Sponsorlogo tragen)
  const fall = (kleidung, teambedarf = "Vereinskasse") => ({
    betreff: FALL_A.betreff,
    text: FALL_A.text.replace("Bezahlung Kleidung: Eltern bzw. Spieler und Sponsor (Autohaus Beispiel)\n", `Bezahlung Kleidung: ${kleidung}\n`).replace("Bezahlung Teambedarf: Vereinskasse\n", `Bezahlung Teambedarf: ${teambedarf}\n`),
  });
  const firma = "Autohaus Beispiel";
  const ausgang = { ...FALL_A, bestellung: bestellung({ ...FALL_A.bestellung, bezahlung: { kleidung: ["eltern"], teambedarf: ["vereinskasse"] } }) };
  try {
    await fuelleFall(page, ausgang);

    // Aufbau: Kontrollkästchen, vier Antworten in der Reihenfolge der Datei, Satz unter der Legende
    for (const [block, frage] of [["kleidung", "Wer zahlt die Kleidung?"], ["teambedarf", "Wer zahlt den Teambedarf?"]]) {
      const g = `[data-bezahlung="${block}"]`;
      gleich(`Bezahlung ${block}: Fieldset mit Legende`, await inhalt(page, `${g} legend`), frage);
      gleich(`Bezahlung ${block}: vier Kontrollkästchen, keine Auswahlknöpfe, kein Textfeld mehr in der Gruppe`, `${await page.$$eval(`${g} input[type="checkbox"]`, (l) => l.length)}|${await page.$$eval(`${g} input[type="radio"]`, (l) => l.length)}|${await page.$$eval(`${g} input[type="text"]`, (l) => l.length)}`, "4|0|0");
      gleich(`Bezahlung ${block}: Antworten in der Reihenfolge der Datei`, (await texte(page, `${g} .bst-option`)).join(" | "), "Eltern bzw. Spieler | Vereinskasse | Sponsor | Spenden / Mannschaftskasse");
      gleich(`Bezahlung ${block}: Satz direkt unter der Legende`, await page.$eval(`${g} legend`, (l) => l.nextElementSibling.textContent.trim()), "Mehrere möglich. Wie geteilt wird, kannst du unten bei „Hinweis zur Bezahlung“ schreiben.");
      gleich(`Bezahlung ${block}: der Satz gehört zur Gruppe (aria-describedby)`, await page.$eval(g, (f) => document.getElementById(f.getAttribute("aria-describedby")).textContent.trim().slice(0, 15)), "Mehrere möglich");
      pruefe(`Bezahlung ${block}: jede Antwort ist als Ganzes tippbar (mindestens 44 px hoch)`, await page.$$eval(`${g} .bst-option`, (l) => l.every((x) => x.getBoundingClientRect().height >= 44)));
    }
    gleich("Bezahlung: der Satz verweist auf „Hinweis zur Bezahlung“, das Feld steht darunter", String(await page.evaluate(() => (document.querySelector('[data-bezahlung="teambedarf"]').compareDocumentPosition(document.getElementById("bst-hinweis-bezahlung")) & Node.DOCUMENT_POSITION_FOLLOWING ? true : false))), "true");
    gleich("Ausgangslage: eine Antwort je Block", `${await angehakt("kleidung")}|${await angehakt("teambedarf")}`, "eltern|vereinskasse");
    await pruefeMail(page, "Bezahlung: nur Eltern", fall("Eltern bzw. Spieler"));

    // Zwei Haken: Eltern + Sponsor (die Firma steht schon im Block „Sponsor“)
    await page.click(haken("kleidung", "sponsor"));
    gleich("Eltern + Sponsor: beide angehakt", await angehakt("kleidung"), "eltern,sponsor");
    await pruefeMail(page, "Bezahlung: Eltern + Sponsor (Autohaus Beispiel) = Referenzbestellung", FALL_A);
    // Firma gelöscht: die Zeile nennt „Sponsor“ ohne Klammer, die Lücke fordert die Firma
    await tippe(page, "#bst-sponsor-firma", "", true);
    gleich("Sponsor ohne Firma: die Vorschau nennt „Sponsor“ ohne Klammer", await zeileMit("Bezahlung Kleidung: "), "Bezahlung Kleidung: Eltern bzw. Spieler und Sponsor");
    await page.click("#bst-senden");
    gleich("Sponsor ohne Firma: Lücke in Klartext", (await luecken(page)).join(" | "), "Bitte trage die Firma des Sponsors ein");
    gleich("Sponsor ohne Firma: kein mailto ausgelöst", String((await gesendet(page)).length), "0");
    await page.click('[data-luecke="sponsor:firma"]');
    gleich("Sprung aus der Lücke: Feld „Firma“", await fokus(page), "bst-sponsor-firma");
    await page.type("#bst-sponsor-firma", firma);
    pruefe("Firma eingetragen: Lücke weg", !(await sichtbar(page, "[data-bst-luecken]")));
    await pruefeMail(page, "Bezahlung: Eltern + Sponsor (Autohaus Beispiel)", fall(`Eltern bzw. Spieler und Sponsor (${firma})`));
    await pruefeLayout(page, "Bezahlung mit zwei Haken", 390);
    await pruefeTippflaechen(page, "Bezahlung mit zwei Haken");
    await pruefeBeschriftungen(page, "Bezahlung mit zwei Haken");
    await pruefeIds(page, "Bezahlung mit zwei Haken");
    await pruefeAxe(page, "Bezahlung mit zwei Haken");
    const abschnittBezahlung = await page.$('section[aria-labelledby="bst-h-bezahlung"]');
    await abschnittBezahlung.screenshot({ path: path.join(AUSGABE, "390-bezahlung-mehrfach.png") });
    await page.click("#bst-senden");
    const geklickt = await gesendet(page);
    pruefe("Eltern + Sponsor: Senden löst genau diese Mail aus", geklickt.length === 1 && dekodiere(geklickt[0]).text === FALL_A.text, geklickt[0]);

    // Sponsor wieder abhaken: die Zeile ändert sich, die Firma bleibt im Entwurf und im Block (die Sponsorlogos stehen weiter in der Bestellung)
    await page.click(haken("kleidung", "sponsor"));
    gleich("Sponsor abgehakt: nur Eltern", await angehakt("kleidung"), "eltern");
    await pruefeMail(page, "Bezahlung: Sponsor wieder abgehakt (Block „Sponsor“ bleibt wegen der Sponsorlogos)", fall("Eltern bzw. Spieler"));
    pruefe("Sponsor abgehakt: die Zeile „Bezahlung Kleidung“ nennt die Firma nicht", !(await zeileMit("Bezahlung Kleidung: ")).includes("Autohaus"));
    gleichJson("Sponsor abgehakt: Entwurf behält die Firma, die Liste hat nur noch Eltern", { liste: await imEntwurf("kleidung"), firma: (await entwurfImSpeicher(page)).sponsor.firma }, { liste: ["eltern"], firma });

    // Drei und vier Antworten, Reihenfolge nach dem Katalog (nicht nach den Klicks)
    await page.click(haken("kleidung", "eltern"));
    gleich("alle abgehakt", await angehakt("kleidung"), "");
    gleichJson("alle abgehakt: leere Liste im Entwurf", await imEntwurf("kleidung"), []);
    for (const id of ["spenden", "sponsor", "vereinskasse", "eltern"]) await page.click(haken("kleidung", id));
    gleich("alle vier angehakt", await angehakt("kleidung"), "eltern,vereinskasse,sponsor,spenden");
    gleichJson("Entwurf: Katalogreihenfolge, nicht die Reihenfolge der Klicks", await imEntwurf("kleidung"), ["eltern", "vereinskasse", "sponsor", "spenden"]);
    await pruefeMail(page, "Bezahlung: vier Antworten", fall(`Eltern bzw. Spieler, Vereinskasse, Sponsor (${firma}) und Spenden / Mannschaftskasse`));
    await page.click(haken("kleidung", "vereinskasse"));
    await pruefeMail(page, "Bezahlung: drei Antworten (A, B und C)", fall(`Eltern bzw. Spieler, Sponsor (${firma}) und Spenden / Mannschaftskasse`));
    await page.click(haken("kleidung", "sponsor"));
    await pruefeMail(page, "Bezahlung: zwei Antworten ohne Sponsor (die Firma im Entwurf zählt nicht)", fall("Eltern bzw. Spieler und Spenden / Mannschaftskasse"));

    // Teambedarf: eigene Antworten; die Firma kommt aus dem einen Block „Sponsor“
    await page.click(haken("teambedarf", "spenden"));
    gleich("Teambedarf: Vereinskasse + Spenden", await zeileMit("Bezahlung Teambedarf: "), "Bezahlung Teambedarf: Vereinskasse und Spenden / Mannschaftskasse");
    await page.click(haken("teambedarf", "sponsor"));
    gleich("Teambedarf: drei Antworten mit der Firma aus dem Block „Sponsor“", await zeileMit("Bezahlung Teambedarf: "), `Bezahlung Teambedarf: Vereinskasse, Sponsor (${firma}) und Spenden / Mannschaftskasse`);
    gleich("Kleidung: Zeile bleibt", await zeileMit("Bezahlung Kleidung: "), "Bezahlung Kleidung: Eltern bzw. Spieler und Spenden / Mannschaftskasse");
    await page.click(haken("teambedarf", "sponsor"));
    await page.click(haken("teambedarf", "spenden"));
    gleich("Teambedarf zurück auf Vereinskasse", await zeileMit("Bezahlung Teambedarf: "), "Bezahlung Teambedarf: Vereinskasse");

    // Kein Haken: Lücke, Rahmen um die Gruppe, Sprung zum ersten Kästchen
    for (const id of ["eltern", "spenden"]) await page.click(haken("kleidung", id));
    gleich("Kleidung: nichts mehr angehakt", await angehakt("kleidung"), "");
    pruefe("Kleidung ohne Haken: die Vorschau hat keine Zeile „Bezahlung Kleidung“, der Sendelink keinen mailto", !(await vorschau()).includes("Bezahlung Kleidung") && (await page.$eval("#bst-senden", (el) => el.dataset.mailto === undefined)));
    await page.click("#bst-senden");
    gleich("Kleidung ohne Haken: Lücke in Klartext", (await luecken(page)).join(" | "), "Bitte wähle, wer die Kleidung zahlt");
    gleich("Kleidung ohne Haken: Fokus auf der Lücke", await page.evaluate(() => document.activeElement.getAttribute("data-luecke")), "bezahlung:kleidung");
    pruefe("Kleidung ohne Haken: Rahmen um die Gruppe, aria-invalid an den Kästchen (nicht an der Gruppe)", await page.evaluate(() => {
      const g = document.querySelector('[data-bezahlung="kleidung"]');
      return g.classList.contains("bst-gruppe--luecke") && !g.hasAttribute("aria-invalid") && [...g.querySelectorAll('input[type="checkbox"]')].every((c) => c.getAttribute("aria-invalid") === "true");
    }));
    pruefe("Kleidung ohne Haken: der andere Block ist nicht markiert", await page.evaluate(() => !document.querySelector('[data-bezahlung="teambedarf"]').classList.contains("bst-gruppe--luecke")));
    gleich("Kleidung ohne Haken: kein mailto ausgelöst (außer dem ersten Senden von vorhin)", String((await gesendet(page)).length), "1");
    await pruefeAxe(page, "Bezahlung mit Lücke");
    await pruefeTippflaechen(page, "Bezahlung mit Lücke");
    await page.click('[data-luecke="bezahlung:kleidung"]');
    gleich("Sprung aus der Lücke: das erste Kästchen (Eltern bzw. Spieler)", await page.evaluate(() => `${document.activeElement.type}:${document.activeElement.name}:${document.activeElement.value}`), "checkbox:bez-kleidung:eltern");
    await page.keyboard.press("Space");
    gleich("Leertaste hakt es an", await angehakt("kleidung"), "eltern");
    pruefe("ein Haken genügt: Lücke und Rahmen weg", !(await sichtbar(page, "[data-bst-luecken]")) && (await page.evaluate(() => !document.querySelector('[data-bezahlung="kleidung"]').classList.contains("bst-gruppe--luecke") && document.querySelectorAll('[data-bezahlung="kleidung"] [aria-invalid]').length === 0)));
    await pruefeLayout(page, "Bezahlung Ende", 390);
    pruefeProtokoll("Bezahlung als Mehrfachauswahl", p, server);
  } finally {
    await schliessen();
  }
}

// Alte Entwürfe auf den Geräten (Text statt Liste, ein Name je Block, keine Aufdrucke, keine Lieferanschrift) laden ohne Fehler
async function ablaufAlterEntwurf(browser, server) {
  abschnitt("390 x 844: alter Entwurf aus den ersten Fassungen (Text bei der Bezahlung, kleidungSponsor, ohne Aufdrucke, ohne Lieferanschrift)");
  // So lag der Entwurf in localStorage: ein Text je Block, ein Name je Block, keine Aufdrucke je Artikel, kein Block „sponsor“, keine Lieferanschrift
  const alt = (bezahlung) => {
    const e = JSON.parse(JSON.stringify(FALL_A.bestellung));
    delete e.lieferName;
    delete e.lieferStrasse;
    delete e.lieferOrt;
    delete e.sponsor;
    for (const pe of e.personen) for (const a of Object.values(pe.artikel)) delete a.aufdrucke;
    if (bezahlung === undefined) delete e.bezahlung;
    else e.bezahlung = bezahlung;
    return e;
  };
  const alte = [
    { name: "Text eltern / vereinskasse", bezahlung: { kleidung: "eltern", kleidungSponsor: "", teambedarf: "vereinskasse", teambedarfSponsor: "" }, kleidung: "eltern", teambedarf: "vereinskasse", firma: "", zeile: "Bezahlung Kleidung: Eltern bzw. Spieler" },
    { name: "Text sponsor mit Namen, spenden", bezahlung: { kleidung: "sponsor", kleidungSponsor: "Autohaus Beispiel", teambedarf: "spenden", teambedarfSponsor: "" }, kleidung: "sponsor", teambedarf: "spenden", firma: "Autohaus Beispiel", zeile: "Bezahlung Kleidung: Sponsor (Autohaus Beispiel)" },
    { name: "zwei Namen (die Kleidung gewinnt), beide Sponsor", bezahlung: { kleidung: "sponsor", kleidungSponsor: "Autohaus Beispiel", teambedarf: "sponsor", teambedarfSponsor: "Bäckerei Beispiel" }, kleidung: "sponsor", teambedarf: "sponsor", firma: "Autohaus Beispiel", zeile: "Bezahlung Teambedarf: Sponsor (Autohaus Beispiel)" },
    { name: "nur der Name beim Teambedarf", bezahlung: { kleidung: "eltern", kleidungSponsor: "", teambedarf: "sponsor", teambedarfSponsor: "Bäckerei Beispiel" }, kleidung: "eltern", teambedarf: "sponsor", firma: "Bäckerei Beispiel", zeile: "Bezahlung Teambedarf: Sponsor (Bäckerei Beispiel)" },
    { name: "leere Texte", bezahlung: { kleidung: "", kleidungSponsor: "", teambedarf: "", teambedarfSponsor: "" }, kleidung: "", teambedarf: "", firma: "", zeile: null },
    { name: "unbekannte Einträge", bezahlung: { kleidung: ["spenden", "gibt-es-nicht", "eltern"], kleidungSponsor: "", teambedarf: "bar", teambedarfSponsor: "" }, kleidung: "eltern,spenden", teambedarf: "", firma: "", zeile: "Bezahlung Kleidung: Eltern bzw. Spieler und Spenden / Mannschaftskasse" },
    { name: "Schlüssel bezahlung fehlt ganz", bezahlung: undefined, kleidung: "", teambedarf: "", firma: "", zeile: null },
  ];
  for (const a of alte) {
    const { page, p, schliessen } = await oeffne(browser, server, { uhr: [2026, 10, 25, 14, 32] });
    try {
      await page.evaluate((k, daten) => localStorage.setItem(k, daten), SCHLUESSEL_ENTWURF, JSON.stringify(alt(a.bezahlung)));
      await neuLaden(page);
      const angehakt = (block) => page.$$eval(`[data-bezahlung="${block}"] input:checked`, (l) => l.map((x) => x.value).join(","));
      gleich(`alter Entwurf (${a.name}): Seite lädt, Kleidung angehakt`, await angehakt("kleidung"), a.kleidung);
      gleich(`alter Entwurf (${a.name}): Teambedarf angehakt`, await angehakt("teambedarf"), a.teambedarf);
      gleich(`alter Entwurf (${a.name}): der Name aus der ersten Fassung steht im Block „Sponsor“ als Firma`, await wert(page, "#bst-sponsor-firma"), a.firma);
      pruefe(`alter Entwurf (${a.name}): der Block „Sponsor“ ist da (die Trikots tragen jetzt das Sponsorlogo als Standard)`, await sichtbar(page, "[data-bst-sponsorblock]"));
      gleich(`alter Entwurf (${a.name}): Personen und Teambedarf bleiben`, `${await page.$$eval(".bst-person", (l) => l.length)}|${await wert(page, '[data-teamposten="baelle"] [data-n]')}`, "3|10");
      gleich(`alter Entwurf (${a.name}): alle Aufdrucke stehen auf dem Standard (auch Emils Trikot trägt das Sponsorlogo)`, (await page.$$eval('[data-person="p2"] [data-artikel="trikot"] [data-a="druck"]', (l) => l.map((x) => x.dataset.code + ":" + x.checked))).join(","), "W:true,V:true,SP:true,ZG:true");
      gleich(`alter Entwurf (${a.name}): Präsi-Jacke von Mia mit allen vier, Rucksack nur mit dem Wappen`, (await page.$$eval('[data-person="p1"] [data-artikel="praesi-jacke"] [data-a="druck"]', (l) => l.map((x) => x.dataset.code + ":" + x.checked))).join(",") + "|" + (await page.$$eval('[data-person="p1"] [data-artikel="rucksack"] [data-a="druck"]', (l) => l.map((x) => x.dataset.code + ":" + x.checked))).join(","), "W:true,ZK:true,V:true,N:true|W:true,V:false");
      gleich(`alter Entwurf (${a.name}): die Lieferanschrift ist leer, der Name der Lieferung folgt „Dein Name“`, [await wert(page, "#bst-liefer-name"), await wert(page, "#bst-liefer-strasse"), await wert(page, "#bst-liefer-ort")].join("|"), "Lena Beispiel||");
      if (a.zeile) pruefe(`alter Entwurf (${a.name}): die Zeile der Bezahlung in „Mail ansehen“`, (await wert(page, "[data-bst-vorschau-text]")).split("\n").includes(a.zeile), (await wert(page, "[data-bst-vorschau-text]")).slice(0, 700));
      await page.click("#bst-senden");
      pruefe(`alter Entwurf (${a.name}): ohne Lieferanschrift meldet „Senden“ die Lücken (Straße, PLZ und Ort), kein mailto`, (await lueckenFelder(page)).split(",").slice(0, 2).join(",") === "lieferStrasse,lieferOrt" && (await gesendet(page)).length === 0, await lueckenFelder(page));
      // Beim Laden wird der Entwurf in der neuen Form zurückgeschrieben: Listen, Aufdrucke, Block „sponsor“, derselbe Schlüssel
      const gespeichert = await entwurfImSpeicher(page);
      pruefe(`alter Entwurf (${a.name}): gespeichert als Listen, mit Aufdrucken und Block „sponsor“, ohne die alten Felder`, Array.isArray(gespeichert.bezahlung.kleidung) && Array.isArray(gespeichert.bezahlung.teambedarf) && gespeichert.bezahlung.kleidung.join(",") === a.kleidung && gespeichert.bezahlung.teambedarf.join(",") === a.teambedarf && !("kleidungSponsor" in gespeichert.bezahlung) && gespeichert.sponsor.firma === a.firma && gespeichert.personen.every((x) => Object.values(x.artikel).every((art) => Array.isArray(art.aufdrucke))) && gespeichert.lieferName === null, JSON.stringify(gespeichert.bezahlung));
      if (a.kleidung === "") pruefe(`alter Entwurf (${a.name}): ohne Haken meldet „Senden“ die Lücke`, (await lueckenFelder(page)).includes("bezahlung:kleidung"));
      pruefeProtokoll(`alter Entwurf (${a.name})`, p, server);
    } finally {
      await schliessen();
    }
  }
}

// Sonderzeichen in Namen und Texten: nichts wird als HTML gelesen, alles kommt unverändert in die Mail
async function ablaufZeichen(browser, server) {
  abschnitt("390 x 844: Sonderzeichen in Namen und Texten (HTML-Zeichen, Umlaute, Akzente; auch in Lieferanschrift und Sponsor)");
  const { page, p, schliessen } = await oeffne(browser, server, { uhr: [2026, 10, 25, 14, 32] });
  try {
    const name = `<img src=x onerror=__xss=1>Zoë&"Ç"`; // höchstens 40 Zeichen: so viel nimmt das Feld an
    await page.select("#bst-team", "f1");
    await page.type("#bst-name", `Anna <b>Beispiel</b> & Söhne`);
    await tippe(page, "#bst-liefer-name", `Lager <i>Süd</i> & "Co"`, true);
    await page.type("#bst-liefer-strasse", `Hauptstr. <u>1</u> & 2`);
    await page.type("#bst-liefer-ort", `60439 Frankfurt <b>(Oder)</b>`);
    await page.click("#bst-person-neu");
    await page.type('[data-person="p1"] [data-p="name"]', name);
    await page.select('[data-person="p1"] [data-p="groesse"]', "140");
    await page.click('[data-person="p1"] [data-artikel="trikot"] [data-a="an"]');
    await page.type("#bst-sonstiges", `Tor <script>window.__xss=2</script> & Ersatz "Netz" 50% sicher?=#`);
    await page.click("#bst-senden");
    gleich("Sonderzeichen: Lücke zeigt den Namen als Text", (await luecken(page)).filter((t) => t.includes("Rückennummer")).join("|"), `Bei ${name} fehlt die Rückennummer (Trikot)`);
    // Bilder in den Kacheln der Artikelzeilen (.bst-check__bild, je Zeile eines) sind gewollt; ein Bild außerhalb davon käme aus dem Namen
    gleich("Sonderzeichen: kein Element aus den Namen entstanden", String(await page.$$eval("[data-bst-luecken] img, [data-bst-luecken] b, .bst-person :not(.bst-check__bild) > img, form b, form i, form u, form script", (l) => l.length)), "0");
    gleich("Sonderzeichen: die zehn Kacheln der Zeilen tragen weiter genau ihr Produktbild (kein Bild mehr, keines weniger)", String(await page.$$eval(".bst-person .bst-check__bild > img", (l) => l.length)), "10");
    gleich("Sonderzeichen: nichts ausgeführt", String(await page.evaluate(() => window.__xss)), "undefined");
    await page.type('[data-person="p1"] [data-p="nummer"]', "7");
    await page.click('[data-bezahlung="kleidung"] input[value="eltern"]');
    await page.click('[data-bezahlung="teambedarf"] input[value="vereinskasse"]');
    await page.type("#bst-sponsor-firma", `Firma <u>X</u> & "Y" <img src=x onerror=__xss=3>`);
    await page.type("#bst-sponsor-anschrift", `Weg <b>1</b>\n60439 <script>window.__xss=4</script>`);
    const text = await wert(page, "[data-bst-vorschau-text]");
    pruefe("Sonderzeichen: Name unverändert im Text (Druckdaten gibt es beim Trikot nur mit Nummer; intern mit Namen und Preis)", text.includes(`- ${name}, Nr. 7, Gr. 140: Trikot 21,74 € = 21,74 €\n`) && text.includes("Bestellt von: Anna <b>Beispiel</b> & Söhne\n"), text);
    pruefe("Sonderzeichen: Lieferanschrift unverändert im Kopf und in Teil 1", text.includes(`Lieferung an: Lager <i>Süd</i> & "Co", Hauptstr. <u>1</u> & 2, 60439 Frankfurt <b>(Oder)</b>\n`) && text.includes(`Lieferanschrift:\nLager <i>Süd</i> & "Co"\nHauptstr. <u>1</u> & 2\n60439 Frankfurt <b>(Oder)</b>\n`), text);
    pruefe("Sonderzeichen: Sponsor unverändert (Firma in der Bezahlzeile ist nicht nötig, im Block steht sie)", text.includes(`Firma: Firma <u>X</u> & "Y" <img src=x onerror=__xss=3>\nAnschrift: Weg <b>1</b>\n  60439 <script>window.__xss=4</script>\n`), text);
    pruefe("Sonderzeichen: Sonstiges unverändert", text.includes(`- Sonstiges: Tor <script>window.__xss=2</script> & Ersatz "Netz" 50% sicher?=#\n`));
    await page.click("#bst-senden");
    const d = dekodiere((await gesendet(page))[0]);
    gleich("Sonderzeichen: mailto hin und zurück (Text)", d.text, text);
    pruefe("Sonderzeichen: der Link enthält keine rohen Sonderzeichen (< > \" & # ? nur kodiert)", (await gesendet(page))[0].slice((await gesendet(page))[0].indexOf("?") + 1).split("&").length === 2 && !/[<>"# ]/.test((await gesendet(page))[0]));
    await neuLaden(page);
    gleich("Sonderzeichen: nach dem Neuladen derselbe Name im Feld", await wert(page, '[data-p="name"]'), name);
    gleich("Sonderzeichen: nach dem Neuladen dieselbe Firma und Anschrift", (await wert(page, "#bst-sponsor-firma")) + "|" + (await wert(page, "#bst-liefer-strasse")), `Firma <u>X</u> & "Y" <img src=x onerror=__xss=3>|Hauptstr. <u>1</u> & 2`);
    gleich("Sonderzeichen: nach dem Neuladen nichts ausgeführt", String(await page.evaluate(() => window.__xss)), "undefined");
    pruefeProtokoll("Sonderzeichen", p, server);
  } finally {
    await schliessen();
  }
}

// Lange Bestellung (Hinweis, nie gekürzt)
async function ablaufLang(browser, server) {
  abschnitt("390 x 844: lange Bestellung (mailto über 7.500 Zeichen)");
  const { page, p, schliessen } = await oeffne(browser, server, { uhr: [2026, 10, 25, 14, 32] });
  try {
    const viele = [];
    for (let i = 1; i <= 45; i++) viele.push(person("p" + i, "Spieler " + i, String((i % 98) + 1), i % 2 ? "140" : "M", GRUNDAUSSTATTUNG));
    const entwurf = bestellung({
      team: "e2",
      name: "Tina Beispiel",
      lieferStrasse: "Beispielweg 12",
      lieferOrt: "60439 Frankfurt",
      personen: viele,
      zaehler: 45,
      bezahlung: { kleidung: ["eltern"], teambedarf: [] },
      sponsor: { firma: "Autohaus Beispiel", ansprechpartner: "", email: "", telefon: "", anschrift: "" },
    });
    await page.evaluate((k, daten) => localStorage.setItem(k, daten), SCHLUESSEL_ENTWURF, JSON.stringify(entwurf));
    await neuLaden(page);
    gleich("45 Personen aus dem Speicher geladen", String(await page.$$eval(".bst-person", (l) => l.length)), "45");
    pruefe("lange Bestellung: Hinweis beim Knopf sichtbar", await sichtbar(page, "[data-bst-lang]"));
    gleich("lange Bestellung: Wortlaut des Hinweises", await inhalt(page, "[data-bst-lang]"), TEXT_LANG);
    const mailto = await page.$eval("#bst-senden", (el) => el.dataset.mailto || "");
    pruefe("lange Bestellung: mailto länger als 7.500 Zeichen", mailto.length > 7500, String(mailto.length));
    gleich("lange Bestellung: nichts gekürzt (Text im Link = Text in „Mail ansehen“)", dekodiere(mailto).text, await wert(page, "[data-bst-vorschau-text]"));
    pruefe("lange Bestellung: alle 45 Personen im Text", (dekodiere(mailto).text.match(/^- Spieler \d+, Nr\. /gm) || []).length === 45);
    pruefe("lange Bestellung: Sponsorlogo 45 Stück (45 × 2,95 € = 132,75 €)", dekodiere(mailto).text.split("\n").includes("Sponsorlogo: 45 Stück × 2,95 € = 132,75 €"));
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
    // Ohne Speicher lässt sich der Code nicht merken: Er wird jedes Mal eingegeben
    const { page, p, schliessen } = await oeffne(browser, server, { uhr: [2026, 10, 25, 9, 5], speicher: art, zugang: "manuell" });
    try {
      pruefe(`${name}: die Seite startet und öffnet mit dem eingetippten Code (bereit, offen)`, (await page.$eval("#bestellung", (el) => el.hasAttribute("data-bereit"))) && (await zustandVon(page)) === "offen");
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
      gleich(`${name}: Person entfernen`, String(await page.$$eval(".bst-person", (l) => l.length)) + "|" + (await fokus(page)), "1|bst-person-neu");
      await page.click("[data-bst-neu]");
      gleich(`${name}: Neue Bestellung ohne Speicher: leer`, String(await page.$$eval(".bst-person", (l) => l.length)) + "|" + String(await sichtbar(page, "[data-bst-gesendet]")), "0|false");
      await neuLaden(page);
      gleich(`${name}: nach dem Neuladen ist die Seite wieder zu (der Code wurde nicht gemerkt)`, await zustandVon(page), "zu");
      await entsperre(page);
      gleich(`${name}: nach dem erneuten Öffnen ist nichts gespeichert`, [await wert(page, "#bst-name"), await wert(page, "#bst-liefer-strasse"), String(await page.$$eval(".bst-person", (l) => l.length))].join("|"), "||0");
      pruefe(`${name}: Absender nicht gespeichert, Seite leer, aber nutzbar`, (await wert(page, "#bst-team")) === "" && (await sichtbar(page, "#bst-person-neu")));
      pruefeProtokoll(name, p, server);
    } finally {
      await schliessen();
    }
  }
  // Kaputte Daten im Speicher (der gemerkte Code bleibt, die Seite öffnet)
  const { page, p, schliessen } = await oeffne(browser, server);
  try {
    for (const [name, roh] of [["kein JSON", "{kaputt"], ["JSON der falschen Art", "[1,2,3]"], ["Zahl", "42"]]) {
      await page.evaluate((k1, k2, r) => { localStorage.setItem(k1, r); localStorage.setItem(k2, r); }, SCHLUESSEL_ENTWURF, SCHLUESSEL_ABSENDER, roh);
      await neuLaden(page);
      gleich(`kaputter Speicher (${name}): leere Seite, offen`, [await zustandVon(page), await wert(page, "#bst-team"), await wert(page, "#bst-name"), String(await page.$$eval(".bst-person", (l) => l.length))].join("|"), "offen|||0");
    }
    // Verändert und halb gültig: nur das Gültige bleibt
    await page.evaluate((k) => localStorage.setItem(k, JSON.stringify({ team: "d3", name: "Lena", personen: [{ id: "p1", name: "Mia", groesse: "999", artikel: { trikot: {}, mantel: {} } }], teambedarf: { baelle: { n: 7 } }, sponsor: { firma: 5 }, lieferOrt: ["x"] })), SCHLUESSEL_ENTWURF);
    await neuLaden(page);
    gleich("halb gültiger Speicher: Mannschaft, Name, Person, Bälle, Firma, Ort der Lieferung", [await wert(page, "#bst-team"), await wert(page, "#bst-name"), await wert(page, '[data-p="name"]'), await wert(page, '[data-p="groesse"]'), String(await page.$$eval('[data-a="an"]:checked', (l) => l.length)), await wert(page, '[data-teamposten="baelle"] [data-n]'), await wert(page, "#bst-sponsor-firma"), await wert(page, "#bst-liefer-ort")].join("|"), "d3|Lena|Mia||1|7||");
    gleich("halb gültiger Speicher: das Trikot hat die Standard-Aufdrucke", (await page.$$eval('[data-artikel="trikot"] [data-a="druck"]', (l) => l.map((x) => x.checked))).join(","), "true,true,true,true");
    // Ein kaputter gemerkter Code: die Seite bleibt zu, ohne Absturz
    await page.evaluate((k) => localStorage.setItem(k, "{kein code}"), SCHLUESSEL_CODE);
    await neuLaden(page);
    gleich("kaputter gemerkter Code: bleibt zu (Meldung, dass er nicht mehr passt), kein Absturz", (await zustandVon(page)) + "|" + (await inhalt(page, "[data-bst-zugang-meldung]")).startsWith("Der gemerkte Code passt nicht mehr"), "zu|true");
    pruefeProtokoll("kaputte Daten im Speicher", p, server);
  } finally {
    await schliessen();
  }
}

// Die Produktbilder in den Artikelzeilen (AP-3): 390 x 844 und 1440 x 900, dazu 360, 375, 414 und 320 px, der Hinweis zur Herkunft, die leere Kachel
// (ein Artikel ohne bild in den Daten), der Ladefehler eines Bildes und die Adressen unter einem Unterordner (wie auf GitHub Pages)
async function ablaufBilder(browser, server) {
  abschnitt("Produktbilder: 390 x 844 und 1440 x 900 (geladen, Klick, Zeilen), weitere Breiten, leere Kachel, Ladefehler, Unterordner");
  const karte = '[data-person="p1"]';
  const ids = KONFIG.artikel.map((a) => a.id);
  const wurzel = server.basis + "/assets/bilder/bestellung/";
  const mobil = (breite, dichte = 1) => ({ width: breite, height: 844, deviceScaleFactor: dichte, isMobile: true, hasTouch: true });
  // Eine Person mit vielen angehakten Artikeln (Grundausstattung und Winterjacke); Regenjacke, TW-Trikot und TW-Hose bleiben unangehakt
  async function fuellePerson(page, groesse) {
    await page.click("#bst-person-neu");
    if (groesse) await page.select(`${karte} [data-p="groesse"]`, groesse);
    await page.click(`${karte} [data-schnellwahl="grundausstattung"]`);
    await page.click(`${karte} [data-artikel="winterjacke"] [data-a="an"]`);
  }
  const angehakt = (page, auswahl) => page.$eval(`${auswahl} [data-a="an"]`, (el) => el.checked);
  // Der Zustand für die Bildschirmfotos: mehrere angehakte Artikel mit kurzer Auswahl darunter (so bleibt das Foto überschaubar), dazwischen unangehakte.
  // Die weiße Trikot-Kachel steht in einer angehakten (hellblauen) Zeile; Regenjacke und Winterjacke stehen unangehakt nebeneinander.
  async function fotoZustand(page) {
    const soll = { trikot: true, shorts: true, stutzen: true, "praesi-jacke": false, "praesi-hose": true, rucksack: true, winterjacke: false, regenjacke: false, "tw-trikot": false, "tw-hose": true };
    for (const [id, an] of Object.entries(soll)) {
      if ((await angehakt(page, `${karte} [data-artikel="${id}"]`)) !== an) await page.click(`${karte} [data-artikel="${id}"] [data-a="an"]`);
    }
  }
  // Foto vom Ausschnitt einer Person: von der Überschrift „Was braucht die Person?“ bis zum Ende der Liste, mit dem Rand der Karte (so sieht man, wie die Liste
  // in der Karte sitzt)
  async function fotoListe(page, kartenAuswahl, datei) {
    const r = await page.evaluate((k) => {
      const kar = document.querySelector(k).getBoundingClientRect();
      const legende = document.querySelector(`${k} .bst-artikelgruppe legend`).getBoundingClientRect();
      const liste = document.querySelector(`${k} .bst-artikelliste`).getBoundingClientRect();
      return { x: kar.left + window.scrollX, y: legende.top + window.scrollY - 12, breite: kar.width, hoehe: liste.bottom - legende.top + 24 };
    }, kartenAuswahl);
    await page.screenshot({ path: path.join(AUSGABE, datei), clip: { x: r.x, y: r.y, width: r.breite, height: r.hoehe }, captureBeyondViewport: true });
  }

  // ----- 390 x 844 -----
  {
    const { page, p, schliessen } = await oeffne(browser, server);
    try {
      pruefe("Hinweis „Produktbilder: JAKO“: ohne Person nicht zu sehen (es gibt noch kein Bild)", !(await sichtbar(page, ".bst-bildnachweis")));
      await fuellePerson(page, "140");
      await ladeBilder(page, karte);
      gleich("Person mit Grundausstattung und Winterjacke: sieben Artikel angehakt, drei nicht (Regenjacke, TW-Trikot, TW-Hose)", (await page.$$eval(`${karte} [data-a="an"]`, (l) => l.map((x) => (x.checked ? "1" : "0")))).join(""), "1111111000");
      const zeilen = await messeZeilen(page, karte);
      pruefeBildzeilen("390 px", zeilen, { bildAdresse: wurzel });
      gleich("390 px: die Preise stehen unverändert da (Text wie vor den Bildern)", zeilen.map((z) => z.preisText).join(" | "), "21,74 € | 10,38 € | 4,02 € | 29,04 € | 17,99 € | 15,21 € | 39,93 € | Preis auf Anfrage | 29,42 € | 16,79 €");
      pruefe("390 px: „Preis auf Anfrage“ (Regenjacke) steht in der Zeile des Bildes, in zwei Zeilen, ohne den Namen zu überlappen", (() => { const z = zeilen.find((x) => x.id === "regenjacke"); return z.preis.h > 30 && z.preis.t < z.kachel.b && !schneiden(z.text, z.preis); })());
      pruefe("390 px: die aufgeklappte Auswahl beginnt unter der Zeile (keine Überschneidung mit Bild, Text und Preis)", await page.evaluate((k) => [...document.querySelectorAll(`${k} [data-artikel]`)].every((z) => { const l = z.querySelector(".bst-check").getBoundingClientRect(); const o = z.querySelector("[data-a-optionen]"); return o.hidden || o.getBoundingClientRect().top >= l.bottom - 0.5; }), karte));
      await pruefeLayout(page, "Bildzeilen 390", 390);
      await pruefeBeschriftungen(page, "Bildzeilen 390");
      await pruefeIds(page, "Bildzeilen 390");
      await pruefeTippflaechen(page, "Bildzeilen 390");
      await pruefeAxe(page, "Bildzeilen 390");
      pruefe("alle Bilder wurden vom Testserver geladen (zehn Adressen angefragt, keine fremde)", ids.every((id) => p.anfragen.includes(wurzel + id + ".webp")) && !p.anfragen.some((u) => u.includes("/bilder/") && !u.startsWith(wurzel)));

      // Ein Tipp aufs Bild gilt der Zeile: Haken an, Auswahl da, Entwurf auf dem Gerät; ein zweiter Tipp nimmt ihn wieder weg
      const zeile = `${karte} [data-artikel="tw-hose"]`;
      await page.$eval(`${zeile} .bst-check__bild img`, (el) => el.scrollIntoView({ block: "center" }));
      pruefe("TW-Hose ist anfangs nicht angehakt", !(await angehakt(page, zeile)));
      pruefe("ein Tipp aufs Bild trifft die Kachel, nicht das Bild selbst (pointer-events: none, kein Bildmenü beim langen Drücken)", await page.evaluate((s) => { const k = document.querySelector(s + " .bst-check__bild").getBoundingClientRect(); const e = document.elementFromPoint(k.left + k.width / 2, k.top + k.height / 2); return !!e && e.tagName !== "IMG" && e.classList.contains("bst-check__bild"); }, zeile));
      await page.click(`${zeile} .bst-check__bild img`);
      pruefe("Klick aufs Bild hakt den Artikel an (Label-Verhalten): Haken, Auswahl darunter und Entwurf auf dem Gerät", (await angehakt(page, zeile)) && (await sichtbar(page, `${zeile} [data-a-optionen]`)) && !!(await entwurfImSpeicher(page)).personen[0].artikel["tw-hose"]);
      await page.click(`${zeile} .bst-check__bild img`);
      pruefe("zweiter Klick aufs Bild nimmt den Haken wieder weg", !(await angehakt(page, zeile)) && !(await sichtbar(page, `${zeile} [data-a-optionen]`)));
      await page.click(`${zeile} .bst-check__name`);
      pruefe("Klick auf den Namen wirkt weiter wie vorher (hakt an)", await angehakt(page, zeile));
      await page.click(`${zeile} [data-a="an"]`);
      pruefe("Klick aufs Kästchen wirkt weiter wie vorher (nimmt den Haken weg)", !(await angehakt(page, zeile)));
      await page.focus(`${zeile} [data-a="an"]`);
      await page.keyboard.press("Space");
      pruefe("Leertaste auf dem fokussierten Kästchen wirkt weiter wie vorher (hakt an)", await angehakt(page, zeile));
      await page.keyboard.press("Space");
      pruefe("Leertaste noch einmal: Haken wieder weg", !(await angehakt(page, zeile)));

      // Dunkles Farbschema des Geräts: Die Seite hat keines, die Kachel bleibt hell (die Produktbilder haben weißen Grund)
      await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "dark" }]);
      pruefe("dunkles Farbschema: die Kacheln bleiben weiß", (await messeZeilen(page, karte)).every((z) => z.kachelGrund === "rgb(255, 255, 255)"));
      await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);

      // Bildschirmfoto: eine Person mit mehreren angehakten Artikeln (doppelt scharf, damit man die Kacheln beurteilen kann)
      await fotoZustand(page);
      await page.setViewport(mobil(390, 2));
      await ladeBilder(page, karte);
      await fotoListe(page, karte, "390-bilder.png");

      // Hinweis zur Herkunft: genau einmal, klein und gedämpft, im Abschnitt „Kleidung je Person“ unter der Liste der Personen
      gleich("Hinweis „Produktbilder: JAKO“: genau ein Hinweis, Wortlaut", String(await page.$$eval(".bst-bildnachweis", (l) => l.length)) + "|" + (await inhalt(page, ".bst-bildnachweis")), "1|Produktbilder: JAKO");
      pruefe("Hinweis: sichtbar, im Abschnitt „Kleidung je Person“, unter der Liste der Personen und dem Knopf „+ Person hinzufügen“", (await sichtbar(page, ".bst-bildnachweis")) && (await page.evaluate(() => { const h = document.querySelector(".bst-bildnachweis"); const knopf = document.getElementById("bst-person-neu"); const liste = document.getElementById("bst-personen"); return h.closest("section").querySelector("h2").textContent === "Kleidung je Person" && !!(liste.compareDocumentPosition(h) & Node.DOCUMENT_POSITION_FOLLOWING) && h.getBoundingClientRect().top >= knopf.getBoundingClientRect().bottom; })));
      pruefe("Hinweis: klein und gedämpft (kleiner als der Fließtext, Farbe wie die Nebentexte, kein Rot)", await page.evaluate(() => { const h = getComputedStyle(document.querySelector(".bst-bildnachweis")); const b = getComputedStyle(document.body); return parseFloat(h.fontSize) < parseFloat(b.fontSize) && h.color === "rgb(91, 96, 121)"; }));
      await page.setViewport(mobil(390, 1));
      await page.click("#bst-person-neu");
      gleich("Hinweis: auch mit zwei Personen nur einmal", String(await page.$$eval(".bst-bildnachweis", (l) => l.length)), "1");
      await page.click('[data-person="p2"] [data-person-entfernen]');
      await page.click(`${karte} [data-person-entfernen]`);
      pruefe("Hinweis: ohne Person wieder verborgen", !(await sichtbar(page, ".bst-bildnachweis")) && (await page.$$eval(".bst-bildnachweis", (l) => l.length)) === 1);
      pruefeProtokoll("Produktbilder 390", p, server);
    } finally {
      await schliessen();
    }
  }

  // ----- weitere Breiten: der Preis bleibt neben Kästchen, Bild und Text; eine zweite Person ohne Größe zeigt die „ab“-Preise -----
  {
    const { page, p, schliessen } = await oeffne(browser, server);
    try {
      await fuellePerson(page, "140");
      await page.click("#bst-person-neu");
      await ladeBilder(page, karte);
      await ladeBilder(page, '[data-person="p2"]');
      gleich("zweite Person ohne Größe: „ab“-Preise (Trikot, Shorts) und ein Preis (Rucksack), Text wie vor den Bildern", [await inhalt(page, '[data-person="p2"] [data-artikel="trikot"] [data-a-preis]'), await inhalt(page, '[data-person="p2"] [data-artikel="shorts"] [data-a-preis]'), await inhalt(page, '[data-person="p2"] [data-artikel="rucksack"] [data-a-preis]')].join(" | "), "ab 21,74 € | ab 10,38 € | 15,21 €");
      for (const breite of [360, 375, 390, 414, 320]) {
        await page.setViewport(mobil(breite));
        const nebeneinander = breite >= 360;
        pruefeBildzeilen(`${breite} px, Person mit Größe`, await messeZeilen(page, karte), { nebeneinander });
        const ohneGroesse = await messeZeilen(page, '[data-person="p2"]');
        pruefeBildzeilen(`${breite} px, Person ohne Größe („ab“-Preise)`, ohneGroesse, { nebeneinander });
        gleich(`${breite} px: bei „ab“-Preisen steht das „ab“ als eigenes Element im Preis, der Text bleibt „ab 21,74 €“`, await page.$eval('[data-person="p2"] [data-artikel="trikot"] [data-a-preis]', (el) => `${el.textContent}|${el.querySelector(".bst-check__vor") ? el.querySelector(".bst-check__vor").textContent : "-"}`), "ab 21,74 €|ab ");
        await pruefeLayout(page, `Bildzeilen bei ${breite} px`, breite);
        if (breite === 360 || breite === 390) {
          // Bildschirmfotos (doppelt scharf): Person mit angehakten Artikeln und Person ohne Größe („ab“-Preise); 360 px ist die engste Breite, bei der der Preis
          // noch neben dem Text stehen soll
          await fotoZustand(page);
          await page.setViewport(mobil(breite, 2));
          await ladeBilder(page, karte);
          if (breite === 360) await fotoListe(page, karte, "360-bilder-mehrere.png"); // bei 390 px ist das 390-bilder.png aus dem ersten Ablauf
          await fotoListe(page, '[data-person="p2"]', `${breite}-bilder-ab.png`);
          await page.setViewport(mobil(breite, 1));
        }
      }
      pruefeProtokoll("Produktbilder weitere Breiten", p, server);
    } finally {
      await schliessen();
    }
  }

  // ----- 1440 x 900 -----
  {
    const { page, p, schliessen } = await oeffne(browser, server, { breite: 1440, hoehe: 900, mobil: false });
    try {
      await fuellePerson(page, "140");
      await page.click("#bst-person-neu");
      await ladeBilder(page, karte);
      await ladeBilder(page, '[data-person="p2"]');
      pruefeBildzeilen("1440 px", await messeZeilen(page, karte), { bildAdresse: wurzel });
      pruefeBildzeilen("1440 px, Person ohne Größe („ab“-Preise)", await messeZeilen(page, '[data-person="p2"]'), { bildAdresse: wurzel });
      pruefe("1440 px: das „ab“ steht vor dem Betrag in derselben Zeile (kein Block wie am Handy)", await page.$eval('[data-person="p2"] [data-artikel="trikot"] .bst-check__vor', (el) => getComputedStyle(el).display === "inline"));
      await pruefeLayout(page, "Bildzeilen 1440", 1440);
      await pruefeBeschriftungen(page, "Bildzeilen 1440");
      await pruefeTippflaechen(page, "Bildzeilen 1440");
      await pruefeAxe(page, "Bildzeilen 1440");
      const zeile = `${karte} [data-artikel="tw-trikot"]`;
      await page.$eval(`${zeile} .bst-check__bild img`, (el) => el.scrollIntoView({ block: "center" }));
      await page.click(`${zeile} .bst-check__bild img`);
      pruefe("1440 px: Klick aufs Bild hakt den Artikel an", await angehakt(page, zeile));
      await page.click(`${zeile} .bst-check__bild img`);
      pruefe("1440 px: zweiter Klick nimmt den Haken weg", !(await angehakt(page, zeile)));
      await page.click('[data-person="p2"] [data-person-entfernen]');
      await fotoZustand(page);
      await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2, isMobile: false, hasTouch: false });
      await ladeBilder(page, karte);
      await fotoListe(page, karte, "1440-bilder.png");
      pruefeProtokoll("Produktbilder 1440", p, server);
    } finally {
      await schliessen();
    }
  }

  // ----- ein Artikel ohne bild in den Daten: dieselbe Kachel leer, alle Texte bündig -----
  {
    let geaendert = false;
    const { page, p, schliessen } = await oeffne(browser, server, {
      aendereHtml: (html) => {
        geaendert = html.includes(',"bild":"shorts.webp"');
        return html.replace(',"bild":"shorts.webp"', "");
      },
    });
    try {
      pruefe("Testkonfiguration: das Bild der Shorts wurde aus der eingebetteten Konfiguration entfernt (sonst gilt der Test nichts)", geaendert);
      await fuellePerson(page, "140");
      await ladeBilder(page, karte);
      const zeilen = await messeZeilen(page, karte);
      pruefeBildzeilen("Shorts ohne bild", zeilen, { ohneBild: ["shorts"], bildAdresse: wurzel });
      const shorts = zeilen.find((z) => z.id === "shorts");
      const trikot = zeilen.find((z) => z.id === "trikot");
      pruefe("Shorts ohne bild: die leere Kachel ist so groß und liegt an derselben Stelle wie die Kachel mit Bild (Text bündig)", Math.abs(shorts.kachel.w - trikot.kachel.w) < 0.5 && Math.abs(shorts.kachel.h - trikot.kachel.h) < 0.5 && Math.abs(shorts.kachel.l - shorts.zeile.l - (trikot.kachel.l - trikot.zeile.l)) < 0.5 && Math.abs(shorts.text.l - shorts.zeile.l - (trikot.text.l - trikot.zeile.l)) < 0.5);
      pruefe("Shorts ohne bild: es wurde kein Bild der Shorts angefragt, die anderen neun schon", !p.anfragen.some((u) => u.endsWith("/shorts.webp")) && ids.filter((id) => id !== "shorts").every((id) => p.anfragen.includes(wurzel + id + ".webp")));
      await page.$eval(`${karte} [data-artikel="shorts"] .bst-check__bild`, (el) => el.scrollIntoView({ block: "center" }));
      await page.click(`${karte} [data-artikel="shorts"] .bst-check__bild`);
      pruefe("Shorts ohne bild: ein Tipp auf die leere Kachel wirkt wie auf ein Bild (Haken weg)", !(await angehakt(page, `${karte} [data-artikel="shorts"]`)));
      await page.click(`${karte} [data-artikel="shorts"] .bst-check__bild`);
      pruefe("Shorts ohne bild: noch einmal getippt, Haken wieder da", await angehakt(page, `${karte} [data-artikel="shorts"]`));
      await pruefeAxe(page, "Kachel ohne Bild");
      pruefeProtokoll("Kachel ohne Bild", p, server);
    } finally {
      await schliessen();
    }
  }

  // ----- ein Bild lädt nicht: kein Zeichen für ein kaputtes Bild, die Kachel bleibt leer, alles andere funktioniert -----
  {
    const { page, p, schliessen } = await oeffne(browser, server);
    try {
      await page.setRequestInterception(true);
      page.on("request", (req) => (req.url().endsWith("/stutzen.webp") ? req.abort("failed") : req.continue()));
      await fuellePerson(page, "140");
      await ladeBilder(page, karte);
      const zeilen = await messeZeilen(page, karte);
      const st = zeilen.find((z) => z.id === "stutzen");
      pruefe("Ladefehler: das Bild der Stutzen ist ausgeblendet (hidden, display none), die Kachel steht leer da (48 x 48, weiß, mit Rand)", !!st.img && st.img.hidden && st.img.anzeige === "none" && Math.abs(st.kachel.w - 48) < 0.5 && Math.abs(st.kachel.h - 48) < 0.5 && st.kachelGrund === "rgb(255, 255, 255)" && st.kachelRand === "1px solid", JSON.stringify(st));
      pruefe("Ladefehler: die übrigen neun Bilder sind geladen und sichtbar", zeilen.filter((z) => z.id !== "stutzen").every((z) => z.img && z.img.fertig && z.img.nat === BILD_KANTE && !z.img.hidden));
      gleich("Ladefehler: genau ein Aufruf ist fehlgeschlagen (das Bild), kein Fehler im Skript der Seite", String(p.fehlgeschlagen.length) + "|" + String(p.fehlgeschlagen[0] || "").includes("/stutzen.webp") + "|" + p.seitenfehler.join(","), "1|true|");
      pruefe("Ladefehler: Preis, Text und Haken der Zeile funktionieren weiter", await page.evaluate((k) => { const z = document.querySelector(`${k} [data-artikel="stutzen"]`); return z.querySelector("[data-a-preis]").textContent === "4,02 €" && z.querySelector(".bst-check__name").textContent === "Stutzen" && z.querySelector('[data-a="an"]').checked; }, karte));
    } finally {
      await schliessen();
    }
  }

  // ----- unter einem Unterordner (GitHub Pages): CSS, Skripte und Bilder werden dort gefunden -----
  {
    const unter = server.basis + "/speuzer-website-prototyp/assets/bilder/bestellung/";
    const { page, p, schliessen } = await oeffne(browser, server, { url: server.seiteImUnterordner });
    try {
      gleich("Unterordner: die Seite liegt unter /speuzer-website-prototyp/ws/ und ist offen", await page.evaluate(() => location.pathname + "|" + document.getElementById("bestellung").dataset.zustand), "/speuzer-website-prototyp/ws/bestellung.html|offen");
      await fuellePerson(page, "140");
      await ladeBilder(page, karte);
      pruefeBildzeilen("Unterordner", await messeZeilen(page, karte), { bildAdresse: unter });
      pruefe("Unterordner: alle zehn Bilder wurden unter dem Unterordner angefragt, keines an der Wurzel", ids.every((id) => p.anfragen.includes(unter + id + ".webp")) && !p.anfragen.some((u) => u.startsWith(wurzel)));
      pruefeProtokoll("Produktbilder im Unterordner", p, server);
    } finally {
      await schliessen();
    }
  }
}

// Ein Durchlauf bei 1440 x 900
async function ablaufDesktop(browser, server) {
  abschnitt("1440 x 900: Zugang, Referenzbestellung und Torwartset am Rechner");
  {
    const { page, p, schliessen } = await oeffne(browser, server, { breite: 1440, hoehe: 900, mobil: false, zugang: "keiner" });
    try {
      await pruefeLayout(page, "1440 Zugangsbox", 1440);
      pruefe("1440: die Zugangsbox steht in der schmalen Spalte (höchstens 720 px)", (await page.$eval(".bst", (el) => Math.round(el.getBoundingClientRect().width))) <= 720);
      await pruefeAxe(page, "1440 Zugangsbox");
      await page.type("#bst-code", TESTCODE);
      await page.keyboard.press("Enter");
      await page.waitForSelector('#bestellung[data-zustand="offen"]', { timeout: 30000 });
      pruefe("1440: Enter im Feld „Code“ öffnet", await sichtbar(page, "#bst-form"));
      pruefeProtokoll("1440 Zugang", p, server);
    } finally {
      await schliessen();
    }
  }
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
    await pruefeAuswahlfelder(page, "1440 ausgefüllt");
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
  // Bau mit Testpreisen in einem Wegwerf-Ordner (BESTELLUNG_PREISE_ENC); der Arbeitsordner bleibt unberührt
  const bau = await baueMitTestdaten();
  console.log(`Bau mit Testpreisen: ${path.relative(ROOT, bau.docs)} (Paket der erfundenen Testpreise, Testcode im Test)`);
  statisch(bau);
  const server = await starteTestserver(bau.docs);
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-first-run"] });
  const laeufe = [
    ["zugang", ablaufZugang], ["leer", ablaufLeer], ["referenz", ablaufReferenz], ["faelle", ablaufFaelleBC], ["aufdrucke", ablaufAufdrucke],
    ["sponsor", ablaufSponsorLieferung], ["luecken", ablaufLuecken], ["felder", ablaufFelder], ["breiten", ablaufAuswahlbreiten],
    ["bilder", ablaufBilder], ["bezahlung", ablaufBezahlung], ["alt", ablaufAlterEntwurf], ["zeichen", ablaufZeichen], ["lang", ablaufLang], ["kopieren", ablaufKopieren],
    ["speicher", ablaufSpeicher], ["desktop", ablaufDesktop],
  ];
  try {
    for (const [name, lauf] of laeufe) if (NUR.length === 0 || NUR.includes(name)) await lauf(browser, server);
    if (NUR.length === 0) {
      abschnitt("Bildschirmfotos");
      for (const n of ["390-zugang.png", "390-ausgefuellt.png", "390-aufdrucke.png", "390-sponsor-lieferung.png", "390-luecken.png", "1440-ausgefuellt.png", "390-leer.png", "390-gesendet.png", "390-bezahlung-mehrfach.png", "1440-torwartset.png", "390-bilder.png", "1440-bilder.png"]) {
        const voll = path.join(AUSGABE, n);
        pruefe(`Bildschirmfoto ${n}`, existsSync(voll) && statSync(voll).size > 5000, voll);
      }
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
