#!/usr/bin/env node
// Ende-zu-Ende-Test der Live-Fassung des Anmelde-Assistenten im appack-Paket (Livegang, Arbeitspaket M6; Zugang mit Code vom Probetraining, Paket P1).
//
// Geprüft wird das Paket, nicht die Begleitseite: dist/appack-paket/web/anmeldung.html mit allen Dateien aus dem Ordner
// web/ (anmeldung-*.js, anmeldung.css, Base64-Module für Schrift und Vordrucke). Der Test beantwortet die Anfragen an das CDN selbst
// (Request-Abfangen im Browser): Die Seiten stehen unter https://cdn.appack.de/sportfreunde04/workspace/web/… und die App-Datei
// Mitglied-werden-App.html unter https://cdn.appack.de/sportfreunde04/workspace/ – mit derselben Adresse und Herkunft wie im echten CDN. So
// führen die Knöpfe der App auf ext://https://cdn.appack.de/… wie im Betrieb. Content-Type wie bei cdn.appack.de: .html ohne charset, .js als
// application/javascript. Anfragen an GitHub Pages (Schriften, Logos der Seitenköpfe) werden aus docs/assets beantwortet; jeder andere
// fremde Host ist ein Fehler.
//
// Voraussetzung: ein Bau mit eingeschaltetem Schalter ANMELDUNG_LIVE (src/vorlagen/hilfen.mjs):
//   ANMELDUNG_LIVE=1 sh tools/cache/bau-sperre.sh build      (danach zurück: sh tools/cache/bau-sperre.sh build)
// Ohne Schalter hat das Paket keine Seite anmeldung.html, der Test bricht dann mit einer klaren Meldung ab.
// --paket=<Ordner> oder PAKET_WEB_DIR=<Ordner> prüft einen anderen Ordner (zum Beispiel eine Kopie von dist/appack-paket/web).
// --app=<Ordner> nimmt die App-Dateien (Mitglied-werden-App.html) aus einem anderen Ordner als assets/app.
//
// Zugang (P1, 12.10.2026): Die Prüfwerte in der Konfiguration der Seite (data/anmeldung.json › zugang › pruefwerte) setzt der Test zur Laufzeit: Er schreibt sie
// beim Ausliefern von anmeldung.html in die Konfiguration (Standard: leere Liste = keine Code-Abfrage). Er nimmt dafür einen Zufallscode dieses Laufs; der
// echte Code kommt nirgends vor, und im Paket gibt es keine Hintertür. Darum läuft der Test unabhängig davon, was im Repo steht (leer, ein fremder oder der
// echte Prüfwert).
//
// Abläufe (je 390 x 844, Touch, echte Eingabe wie eine Familie; Beispiel-Knöpfe gibt es auf der Live-Seite nicht):
//   Kind neu, Wechsel Hessen, Karneval Kind, Herren (Erwachsener wechselt) – je auf Deutsch und auf Englisch, bis zum fertigen PDF:
//   Seitenzahl > 0, keine Anfrage mit Status ab 400, keine Fehler und keine fehlenden Texte in der Konsole, Dateiname nach
//   dem Muster, Name im PDF-Text, kein "Entwurf"/"Prototyp"/"Vorführung" im PDF-Text (poppler: pdfinfo, pdftotext).
//   Dazu einmal mit eingeschaltetem Zugang über einen Link mit ?code=…: dieselbe Datei, der Code steht weder im Text noch in den Bytes des PDF.
//   Die Seite selbst: nur die Live-Sprachen in der Sprachwahl (seit 12.10.2026 Deutsch, Englisch, Türkisch, Arabisch), kein Entwurfs-Band, kein Werkzeugkasten, kein noindex,
//   kein Rahmen der Begleitseite, kein Knopf "Vorführung", Titel ohne "Entwurf"; axe-core ohne Verstöße "critical" und
//   "serious" auf der Startseite, einer Frage und der Fertig-Seite.
//   P1 – die Prüfungen von Code-Seite und Übergabe stehen in zugang-browser.mjs (dieselben wie für die Begleitseite in e2e.mjs):
//     pruefeZugangImBrowser: ohne Prüfwerte keine Code-Abfrage; mit Prüfwert ist die Code-Seite der erste Bildschirm (Sprachwahl oben, Feld „Code“, Meldungen leer
//     und falsch, richtig auch klein, mit Leerzeichen oder Bindestrich), Link mit ?code= (gültig: Startschritt ohne Code-Seite, ungültig: Code-Seite mit Meldung),
//     Neuladen, ohne crypto.subtle, eigene SHA-256-Funktion gegen crypto.subtle im Browser, mehrere und fremde Prüfwerte, Tastatur, axe.
//     pruefeUebergabeImBrowser: anmeldung.html?app=1 zeigt nur die Übergabe „Im Browser öffnen“; der Knopf führt auf ext://https://cdn.appack.de/…/anmeldung.html
//     (ohne app=1, mit code, falls einer in der Adresse steht).
//     pruefeCodeSprachen: Code-Seite und Übergabe in jeder Sprache des Pakets (Arabisch von rechts nach links), Texte = Texte im Paket.
//     pruefeUmgebungshinweisImBrowser / …Sprachen (Zusätze zu P1): Hinweis oben auf dem ersten Bildschirm, wenn die Seite in einem Rahmen (Testseite auf anderer Herkunft mit
//     <iframe> ohne allow-Angaben, wie die Hülle der Website) oder im Browser einer anderen App (gesetzter User-Agent) läuft; Fotos rahmen-hinweis-390-de.png und inapp-hinweis-390-de.png.
//   „Mitglied werden“ (P1): nur noch der Weg über den Assistenten. Schritt 2 sagt „Nach dem Probetraining bekommen Sie einen Code. Damit melden Sie sich hier an.“ und
//   hat genau einen Knopf „Jetzt anmelden“. Er führt auf anmeldung.html; in der App (web/mitglied-werden.html?app=1 und die App-Datei Mitglied-werden-App.html) auf
//   ext://https://cdn.appack.de/sportfreunde04/workspace/web/anmeldung.html. Kein Link mehr auf die alten Wege (Seite „Aufnahmeantrag online“, Vordruck, Antrag per
//   E-Mail, Formular der App); Fotos der Seite am Handy, am Rechner und in der App. Auf der Website öffnet der Knopf ein neues Fenster (target="_blank" rel="noopener": Die Hülle zeigt die
//   Seite in einem Rahmen); in der App führt er ohne target auf ext://… (die Weiche nimmt target weg). Ein Link auf anmeldung.html?code=…&app=1 wird zu ext://…?code=… (app weg, code bleibt).
//   Runde 2 (12.10.2026): Schritt 1 sagt „Probetraining vereinbaren: E-Mail an die Jugendleitung mit Jahrgang und Vorerfahrung.“ (ohne „(nur Fußball)“; die Zeilen für
//   die Herren und für Karneval bleiben), Schritt 3 „Datei schicken: Am Ende schicken Sie die Datei per E-Mail an die Geschäftsstelle.“. Die drei Unterlagenlisten stehen in einem
//   zugeklappten Bereich „Welche Unterlagen brauche ich?“ (<details>, davor der Satz „Die Anmeldung sagt Ihnen genau, was Sie brauchen.“): zu, Listen unsichtbar; mit der
//   Tastatur erreichbar (Tab), mit Eingabetaste und Leertaste auf- und zuklappbar, Fokusring sichtbar, axe auch im aufgeklappten Zustand. „Zum Herunterladen“ ohne „Info-Blatt zur
//   Anmeldung“ und „Wichtige Unterlagen, die mitzubringen sind“ (nur Zusatzerklärung und Satzung; die Beitragsübersicht steht bei den Beiträgen). aufnahmeantrag.html ist eine
//   Weiterleitung auf mitglied-werden.html (<meta refresh>, Satz, Link; Foto mit angehaltener Weiterleitung; in der App führt der Link auf nav://).
//   M10 (11.10.2026): Die Familie schickt die Datei per E-Mail an die Geschäftsstelle (kein Server-Versand). In jedem Lauf (auch Englisch): die Fertig-Seite zeigt
//   den Abschnitt „So schicken Sie die Datei an den Verein“ mit der Adresse aus der Konfiguration des Pakets und einem mailto:-Link (Betreff „Anmeldung Vorname Nachname“,
//   deutscher Text, kodiert); Teil A der Datei nennt den Schritt „Schicken Sie die Datei per E-Mail an die Geschäftsstelle: <Adresse>“.
//   M14 (12.10.2026): Für Fußball beantragt der Verein immer das Spielrecht. In jedem Lauf: kein Schritt „spielen“; Fußball (Kind neu, Wechsel Hessen, Herren) geht von der
//   Mannschaft gleich zum Spielerpass, Karneval Kind kennt weder Mannschaft noch Spielerpass; die Seite „spielerpass“ trägt die Erklärung zum Spielrecht (Deutsch und Englisch).
//   Module: Die Module im Paket (ohne Kommentare, umbenannt) liefern dieselben Ergebnisse wie die Quellen
//   (Regelwerk für fünf Beispiele, PDF Byte für Byte, Schrift und Vordrucke aus den Base64-Modulen, Texte, Zugang mit Normalisierung und SHA-256).
// Bildschirmfotos nach tools/cache/orchestrierung-anmeldung/pruefung/p1/ (390 px; code-1440-de.png und mitglied-werden-1440.png am Rechner).
//
// Aufruf: node tools/anmeldung-test/e2e-paket.mjs [--paket=<Ordner>] [--app=<Ordner>] [--schnell] [--ohne-module] [--sprachen=de,en,tr,ar] [--cdn [--code=<CODE>]] [--chrome-arg=<Argument>]...
//   --schnell: nur "Kind neu" (de) und der Lauf mit Code im Link statt der acht Abläufe.
//   --sprachen: Sprachen, die das Paket anbieten soll (Standard de,en,tr,ar wie ANMELDUNG_SPRACHEN_LIVE seit 12.10.2026, M12; vorher de,en); für ein Paket mit
//   mehr oder weniger Sprachen (Bau mit ANMELDUNG_SPRACHEN_LIVE=de,en) prüft der Test zusätzlich, dass sich jede weitere davon wählen lässt.
//   --cdn: statt der Dateien aus dem Paket die Seiten auf https://cdn.appack.de/sportfreunde04/workspace/ prüfen (nach dem Einspielen in das CMS;
//   nur Lesezugriffe, die Eingaben bleiben im Browser). Nur die Konfiguration von anmeldung.html ersetzt der Test auch dort (Prüfwerte des Test-Codes), damit die
//   Prüfungen vom Zustand des Zugangs unabhängig sind; ein eigener Abschnitt prüft die Seite danach unverändert, so wie sie dort eingestellt ist (mit --code=<CODE>
//   oder der Umgebungsvariable ANMELDUNG_CODE auch mit dem richtigen Code; der Code wird nirgends gespeichert oder ausgegeben). --paket bleibt der Ordner mit dem
//   Soll-Stand (Module und Konfiguration werden damit verglichen).
// Ausgabe: eine Zeile je Prüfung; Exit 0 nur, wenn alles bestanden ist.

import { spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import puppeteer from "puppeteer-core";
import * as PDFLib from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { MOBIL, DESKTOP, pruefeZugangImBrowser, pruefeUebergabeImBrowser, pruefeUmgebungshinweisImBrowser, pruefeUmgebungshinweisSprachen } from "./zugang-browser.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const AXE = fs.readFileSync(path.join(ROOT, "node_modules", "axe-core", "axe.min.js"), "utf8");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const argWert = (name) => (process.argv.find((a) => a.startsWith("--" + name + "=")) || "").slice(name.length + 3);
const PAKET = path.resolve(argWert("paket") || process.env.PAKET_WEB_DIR || path.join(ROOT, "dist", "appack-paket", "web"));
const APP_DIR = path.resolve(argWert("app") || path.join(ROOT, "assets", "app"));
const SCHNELL = process.argv.includes("--schnell");
const CDN = process.argv.includes("--cdn");
const ECHTER_CODE = argWert("code") || process.env.ANMELDUNG_CODE || "";
// --chrome-arg=<Argument> (mehrfach): zusätzliche Argumente für Chrome, zum Beispiel --chrome-arg=--host-resolver-rules="MAP cdn.appack.de 127.0.0.1:8443" und
// --chrome-arg=--ignore-certificate-errors, um mit --cdn gegen eine Attrappe des CDN zu laufen (Test des Tests, ohne das echte CDN).
const CHROME_ARGUMENTE = process.argv.filter((a) => a.startsWith("--chrome-arg=")).map((a) => a.slice("--chrome-arg=".length));
const ERWARTETE_SPRACHEN = (argWert("sprachen") || "de,en,tr,ar").split(",");
const OHNE_MODULE = process.argv.includes("--ohne-module");
const FOTOS = path.join(ROOT, "tools", "cache", "orchestrierung-anmeldung", "pruefung", "p1", CDN ? "cdn" : ".");
const AUSGABE = path.join(ROOT, "tools", "cache", "anmeldung-test", "e2e-paket");
const DATEIEN = path.join(AUSGABE, "dateien");
const CDN_HOST = "https://cdn.appack.de";
const WS = "/sportfreunde04/workspace/";
const PREFIX = WS + "web/";
const ZIEL_ANMELDUNG = CDN_HOST + PREFIX + "anmeldung.html";
// Die Hülle der Website im Kleinen: eine Testseite auf einer anderen Herkunft mit einem <iframe> ohne allow-Angaben auf die Seite des Assistenten (wie
// src/huelle/huelle.html, #showFrame). Der Test beantwortet sie selbst.
const HUELLE_HOST = "https://huelle.test";
const GH_ASSETS = "https://justolgay.github.io/speuzer-website-prototyp/assets/";
const HEUTE = "2026-09-29";
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

// Datei im Paket (Pfad unter .../workspace/web/) oder unter den App-Dateien (Pfad .../workspace/<Name>) zu einem Pfad auf dem CDN; null, wenn es sie nicht gibt.
function dateiZuPfad(pfad) {
  let ordner;
  let rest;
  if (pfad.startsWith(PREFIX)) {
    ordner = PAKET;
    rest = pfad.slice(PREFIX.length);
  } else if (pfad.startsWith(WS) && !pfad.slice(WS.length).includes("/")) {
    ordner = APP_DIR;
    rest = pfad.slice(WS.length);
  } else return null;
  const voll = path.join(ordner, rest);
  if (!voll.startsWith(ordner + path.sep) || !fs.existsSync(voll) || !fs.statSync(voll).isFile()) return null;
  return voll;
}

// Die Konfiguration der Seite steht als JSON im Dokument. Der Test setzt darin die Prüfwerte des Zugangs (so, wie assistent.js sie liest).
const KONFIG_MUSTER = /(<script type="application\/json" id="anmeldung-konfig">)([\s\S]*?)(<\/script>)/;

function mitZugang(html, liste) {
  const m = KONFIG_MUSTER.exec(html);
  if (!m) throw new Error("anmeldung.html: keine Konfiguration");
  const konfig = JSON.parse(m[2]);
  konfig.anmeldung = konfig.anmeldung || {};
  konfig.anmeldung.zugang = { parameter: "code", pruefwerte: liste.slice() };
  const json = JSON.stringify(konfig).replace(/</g, "\\u003c");
  return html.replace(KONFIG_MUSTER, (x, auf, inhalt, zu) => auf + json + zu);
}

// Zufallscode dieses Laufs (A–Z ohne I und O, 2–9 und "-": sein Prüfwert ist unabhängig vom Code des Assistenten zu rechnen), sein Prüfwert und ein
// fremder Prüfwert. Alles nur im Speicher dieses Laufs.
function starteServer() {
  const anfragen = []; // { pfad, status }
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const zufallsTeil = () => Array.from(randomBytes(4), (b) => alphabet[b % alphabet.length]).join("");
  const testCode = "TEST-" + zufallsTeil() + "-" + zufallsTeil();
  let zugangListe = [];
  let htmlZwischenspeicher = null;
  const srv = {
    server: { close() {} },
    basis: CDN_HOST,
    browser: null, // main setzt ihn; mit --cdn holt der Test anmeldung.html über den Browser (dieselbe Netzwerkschicht wie die Seiten)
    anfragen,
    testCode,
    testPruefwert: sha256(testCode.replace(/[\s-]/g, "").toUpperCase()),
    fremderPruefwert: sha256("FREMD-" + zufallsTeil() + zufallsTeil() + zufallsTeil()),
    setzeZugang: (liste) => {
      zugangListe = Array.isArray(liste) ? liste.slice() : [];
    },
    liste: () => zugangListe.slice(),
    // Rohtext einer Datei des CDN (nur mit --cdn), geholt vom Browser selbst (dieselbe Netzwerkschicht wie die Seiten, also auch mit Host-Zuordnung und eigenem Zertifikat
    // einer Attrappe); null, wenn das CDN die Datei nicht liefert. Eine Weiterleitung per <meta refresh> stört dabei nicht: Es ist ein fetch, keine Navigation.
    holeText: async (url) => {
      const seite = await srv.browser.newPage();
      try {
        await seite.goto(CDN_HOST + "/favicon.ico").catch(() => {}); // nur um auf der Herkunft des CDN zu stehen (same-origin fetch)
        return await seite.evaluate(async (u) => {
          const antwort = await fetch(u, { cache: "no-store" });
          return antwort.ok ? await antwort.text() : null;
        }, url);
      } finally {
        await seite.close();
      }
    },
    // anmeldung.html im Paket (oder, mit --cdn, vom echten CDN: Rohtext der Antwort, ohne Skripte auszuführen)
    anmeldungHtml: async () => {
      if (htmlZwischenspeicher === null) {
        if (CDN) {
          const seite = await srv.browser.newPage();
          try {
            await seite.setJavaScriptEnabled(false);
            const antwort = await seite.goto(ZIEL_ANMELDUNG, { waitUntil: "domcontentloaded" });
            if (!antwort || !antwort.ok()) throw new Error("HTTP " + (antwort ? antwort.status() : "keine Antwort") + " für " + ZIEL_ANMELDUNG);
            htmlZwischenspeicher = await antwort.text();
          } finally {
            await seite.close();
          }
        } else htmlZwischenspeicher = fs.readFileSync(path.join(PAKET, "anmeldung.html"), "utf8");
      }
      return htmlZwischenspeicher;
    },
  };
  return Promise.resolve(srv);
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

// Neue Seite im Handy-Format (vp = MOBIL) oder am Rechner (vp = DESKTOP). Alle Anfragen laufen durch den Test:
//   cdn.appack.de          aus dem Paket und den App-Dateien beantwortet (mit --cdn: vom echten CDN; nur anmeldung.html bekommt die Prüfwerte des Tests)
//   GitHub Pages (Assets)  aus docs/assets beantwortet
//   alles andere           abgelehnt und als fremder Host gemeldet.
// o: { name, datei (Standard anmeldung.html, relativ zu .../workspace/web/), pfad (ganzer Pfad auf dem CDN, statt datei), abfrage, vorLaden, vp,
//      echt (anmeldung.html unverändert, mit den Prüfwerten der Konfiguration),
//      bodyAendern (Funktion (pfad, html) => html für das Dokument der Seite, auch mit --cdn: der Test ändert die Antwort nur für diese Seite; gedacht für das Foto einer
//      Weiterleitung, deren <meta refresh> der Test anhält) }
async function neueSeite(srv, browser, o) {
  const { name, datei = "anmeldung.html", pfad: ganzerPfad = null, abfrage = "", vorLaden = null, vp = MOBIL, echt = false, huelleAbfrage = null, bodyAendern = null } = o;
  const page = await browser.newPage();
  await page.setViewport({ width: vp.breite, height: vp.hoehe, deviceScaleFactor: 1, isMobile: !!vp.mobil, hasTouch: !!vp.mobil });
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
  page.on("request", async (r) => {
    const u = r.url();
    try {
      if (u.startsWith(srv.basis + "/")) {
        st.hosts.add(CDN ? "cdn.appack.de (echtes CDN)" : "cdn.appack.de (vom Test beantwortet, Inhalt aus dem Paket)");
        const pfad = decodeURIComponent(new URL(u).pathname);
        // Seiten ohne <link rel="icon"> (die App-Dateien) lassen Chrome /favicon.ico anfragen; das gehört nicht zu den Seiten: keine Antwort mit Fehlerstatus.
        if (pfad === "/favicon.ico") return r.respond({ status: 204, body: "" });
        if (pfad === PREFIX + "anmeldung.html" && r.resourceType() === "document" && !echt) {
          srv.anfragen.push({ pfad, status: 200 });
          return r.respond({ status: 200, contentType: "text/html", headers: { "Cache-Control": "no-store" }, body: mitZugang(await srv.anmeldungHtml(), srv.liste()) });
        }
        if (bodyAendern && r.resourceType() === "document") {
          // Dokument der Seite mit geänderter Antwort (Quelle: das Paket, mit --cdn das echte CDN; nur Lesezugriff)
          let quelle = null;
          if (CDN) quelle = await srv.holeText(u);
          else {
            const datei = dateiZuPfad(pfad);
            if (datei) quelle = fs.readFileSync(datei, "utf8");
          }
          if (quelle !== null) {
            srv.anfragen.push({ pfad, status: 200 });
            return r.respond({ status: 200, contentType: "text/html", headers: { "Cache-Control": "no-store" }, body: bodyAendern(pfad, quelle) });
          }
        }
        if (CDN) return r.continue();
        const lokal = dateiZuPfad(pfad);
        srv.anfragen.push({ pfad, status: lokal ? 200 : 404 });
        if (!lokal) return r.respond({ status: 404, contentType: "text/plain", body: "Nicht gefunden" });
        return r.respond({ status: 200, contentType: MIME[path.extname(lokal)] || "application/octet-stream", headers: { "Cache-Control": "public,no-cache" }, body: fs.readFileSync(lokal) });
      }
      if (u.startsWith(HUELLE_HOST + "/")) {
        st.hosts.add("huelle.test (Testseite der Hülle, vom Test beantwortet)");
        const innen = new URL(u).searchParams.get("src") || "";
        const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Hülle (Test)</title></head><body style="margin:0"><iframe id="showFrame" title="Inhalt" src="${innen.replace(/&/g, "&amp;")}" style="display:block;border:0;width:100%;height:${vp.hoehe}px"></iframe></body></html>`;
        return r.respond({ status: 200, contentType: "text/html", headers: { "Cache-Control": "no-store" }, body: html });
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
    } catch (fehler) {
      st.konsole.push("Test: Anfrage " + u + " nicht beantwortet: " + fehler.message);
      return r.abort("failed").catch(() => {});
    }
  });
  if (vorLaden) await vorLaden(page);
  // huelleAbfrage (Zeichenkette, auch leer): die Testseite der Hülle mit dem Assistenten im Rahmen (der Aufrufer wartet auf den Assistenten im Frame)
  const url = huelleAbfrage !== null ? HUELLE_HOST + "/?src=" + encodeURIComponent(srv.basis + PREFIX + "anmeldung.html" + huelleAbfrage) : srv.basis + (ganzerPfad || PREFIX + datei) + abfrage;
  const antwort = await page.goto(url, { waitUntil: "networkidle0" });
  if (!antwort || antwort.status() >= 400) {
    const status = antwort ? antwort.status() : "keine Antwort";
    await page.close();
    throw new Error("HTTP " + status + " für " + url);
  }
  return page;
}

async function amStart(srv, browser, name, abfrage, vorLaden) {
  const page = await neueSeite(srv, browser, { name, abfrage, vorLaden });
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
  return { seiten, text, name: path.basename(datei), datei, bytes };
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

// U-18: Die Zeile „Impressum · Datenschutz“ am Ende der Live-Seite: je ein Link, relativ, im neuen Fenster, nach dem Assistenten, sichtbar, Vereinsblau
const leseRechtliches = (page) =>
  page.evaluate(() => {
    const wurzel = document.getElementById("anmeldung");
    const links = (h) =>
      Array.from(document.querySelectorAll('a[href="' + h + '"]')).map((e) => ({
        text: e.textContent.trim(),
        sichtbar: e.checkVisibility(),
        ziel: e.getAttribute("target"),
        rel: e.getAttribute("rel") || "",
        farbe: getComputedStyle(e).color,
        groesse: parseFloat(getComputedStyle(e).fontSize),
        nachAssistent: !!(wurzel.compareDocumentPosition(e) & Node.DOCUMENT_POSITION_FOLLOWING),
        imAssistent: wurzel.contains(e),
      }));
    return { impressum: links("impressum.html"), datenschutz: links("datenschutz.html") };
  });
const rechtlichesOk = (r) =>
  [[r.impressum, "Impressum"], [r.datenschutz, "Datenschutz"]].every(([l, text]) =>
    l.length === 1 && l[0].text === text && l[0].sichtbar && l[0].ziel === "_blank" && /noopener/.test(l[0].rel) && l[0].nachAssistent && !l[0].imAssistent && l[0].farbe === "rgb(31, 45, 190)" && l[0].groesse <= 15);

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
      appHinweis: !!document.querySelector("[data-anm-apphinweis], [data-anm-browserlink], .anm-apphinweis"),
      querScroll: document.documentElement.scrollWidth > window.innerWidth,
      hoeheH2: Math.round((document.querySelector("#anm-titel") || { getBoundingClientRect: () => ({ height: 0 }) }).getBoundingClientRect().height),
      html: document.documentElement.outerHTML,
    };
  });
  ok("Titel ohne Entwurf", d.titel === "Anmeldung – FFV Sportfreunde 04", d.titel);
  ok("Beschreibung ohne Entwurf, nicht leer, nennt das Probetraining (Zugang mit Code)", d.beschreibung.length > 50 && !/Entwurf/.test(d.beschreibung) && /Probetraining/.test(d.beschreibung), d.beschreibung.length + " Zeichen");
  ok("kein noindex (kein meta robots)", d.robots === null, String(d.robots));
  ok("genau eine Überschrift h1", d.h1.length === 1 && d.h1[0] === "Anmelden beim FFV Sportfreunde 04", JSON.stringify(d.h1));
  const soll = JSON.stringify(ERWARTETE_SPRACHEN);
  ok("Sprachwahl oben: genau die Live-Sprachen " + ERWARTETE_SPRACHEN.join(", ") + (soll === '["de","en"]' ? " (nur Deutsch und Englisch)" : ""), JSON.stringify(d.knoepfe) === JSON.stringify(konfigLive.sprachen) && JSON.stringify(d.knoepfe) === soll, JSON.stringify(d.knoepfe));
  ok("Sprachwahl im Assistenten: dieselben Sprachen", JSON.stringify(d.optionen) === soll, JSON.stringify(d.optionen));
  ok("kein Entwurfs-Band, kein Werkzeugkasten, kein Knopf „Vorführung“, keine Beispiel-Knöpfe, kein Knopf für die Vereinssicht", !d.band && !d.werkzeuge);
  ok("kein Rahmen der Begleitseite und kein Link zum Konzept", !d.kopf && !d.konzeptLink);
  ok("Sprachwahl sichtbar; keine Reste der früheren Hinweise für die App („Im Browser öffnen“ im Kopf der Seite) im DOM", d.sprachleiste && !d.appHinweis);
  ok("kein Querscrollen bei 390 px", !d.querScroll);
  // U-18: Impressum und Datenschutz stehen auf dem ersten Bildschirm (Code-Seite oder Start), am Ende der Seite, und die Zielseiten liegen im Paket
  const recht = await leseRechtliches(page);
  ok("Impressum und Datenschutz (U-18): je ein Link „Impressum“ und „Datenschutz“ auf dem ersten Bildschirm, relativ (impressum.html, datenschutz.html), in neuem Fenster mit noopener, nach dem Assistenten, Vereinsblau, kleine Schrift", rechtlichesOk(recht), JSON.stringify(recht));
  ok("Impressum und Datenschutz (U-18): die Zielseiten impressum.html und datenschutz.html liegen im Paket neben anmeldung.html", fs.existsSync(path.join(PAKET, "impressum.html")) && fs.existsSync(path.join(PAKET, "datenschutz.html")), PAKET);
  const begleit = path.join(ROOT, "docs", "anmeldung", "index.html");
  if (fs.existsSync(begleit)) ok("Impressum und Datenschutz (U-18): nicht auf der Begleitseite doppelt (docs/anmeldung/index.html hat die Zeile nicht)", !/anm-rechtliches|href="impressum\.html"/.test(fs.readFileSync(begleit, "utf8")));
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

// ---------- Zugang und Übergabe (P1) ----------

// Die Umgebung für die gemeinsamen Prüfungen in zugang-browser.mjs (dieselben wie für die Begleitseite in e2e.mjs).
function zugangUmgebung(srv, browser, konfigLive) {
  return {
    name: "Live-Seite",
    oeffne: async (vp, name, o = {}) => {
      const page = await neueSeite(srv, browser, { name, vp, abfrage: o.abfrage || "", vorLaden: o.vorLaden || null });
      await page.waitForSelector("#anmeldung[data-bereit]", { timeout: 15000 });
      return page;
    },
    setzeZugang: (liste) => srv.setzeZugang(liste),
    testCode: srv.testCode,
    testPruefwert: srv.testPruefwert,
    fremderPruefwert: srv.fremderPruefwert,
    ok,
    axe: (page, name) => axePruefen(page, name),
    foto: async (page, dateiname, o) => {
      await page.screenshot({ path: path.join(FOTOS, dateiname), ...(o || {}) });
    },
    zugangModul: srv.basis + PREFIX + "anmeldung-zugang.js",
    probetrainingZiel: "mitglied-werden.html#probetraining",
    geschaeftsstelle: konfigLive.verein.mail,
    beispiele: false,
    weiterImErstenBildschirm: true,
    browserBasis: ZIEL_ANMELDUNG,
    uebergabePraefix: "ext://https://",
    huelle: async (vp, name, o = {}) => {
      const page = await neueSeite(srv, browser, { name, vp, huelleAbfrage: o.abfrage || "", vorLaden: o.vorLaden || null });
      const rahmen = page.frames().find((f) => f !== page.mainFrame());
      await rahmen.waitForSelector("#anmeldung[data-bereit]", { timeout: 15000 });
      return { aussen: page, rahmen, schliessen: () => page.close() };
    },
    woerterbuch: async (code) => (await import(pathToFileURL(path.join(PAKET, "anmeldung-texte-" + code + "-oberflaeche.js")).href)).default,
    sprachen: konfigLive.sprachen,
  };
}

const ohneSteuer = (s) => String(s).replace(/[⁠⁦-⁩‎‏‪-‮]/g, "").replace(/ /g, " ").replace(/\s+/g, " ").trim();

// Code-Seite und Übergabe in jeder Sprache des Pakets: die Texte der Sprache aus den Modulen im Paket, Schreibrichtung, Fotos.
async function pruefeCodeSprachen(srv, browser, konfigLive) {
  console.log("\n=== Code-Seite und Übergabe in jeder Sprache der Live-Seite (390 x 844) ===");
  srv.setzeZugang([srv.testPruefwert]);
  try {
    for (const code of konfigLive.sprachen) {
      const rtl = code === "ar";
      const kennung = "Sprache " + code;
      const dict = (await import(pathToFileURL(path.join(PAKET, "anmeldung-texte-" + code + "-oberflaeche.js")).href)).default;
      const T = dict.code;
      const wechsle = async (page) => {
        if (code === "de") return;
        await page.click('[data-anm-sprachleiste] [data-sprache="' + code + '"]');
        await page.waitForFunction((c) => document.getElementById("anmeldung").getAttribute("data-sprache") === c, { timeout: 8000 }, code);
      };
      const page = await amStart(srv, browser, "code-" + code);
      await wechsle(page);
      const d = await page.evaluate(() => {
        const w = document.getElementById("anmeldung");
        const ohne = (s) => s.replace(/[⁠⁦-⁩‎‏‪-‮]/g, "").replace(/ /g, " ").replace(/\s+/g, " ").trim();
        const eingabe = w.querySelector('[data-pfad="zugang.code"]');
        const label = w.querySelector('[data-feld="code"] label');
        return {
          schritt: w.dataset.schritt,
          lang: w.getAttribute("lang"),
          dir: w.getAttribute("dir"),
          titel: ohne(w.querySelector(".anm-titel").textContent),
          absaetze: Array.from(w.querySelectorAll(".anm-absaetze p")).map((p) => ohne(p.textContent)),
          label: ohne(label.textContent),
          weiter: ohne(w.querySelector('[data-aktion="weiter"]').textContent),
          links: Array.from(w.querySelectorAll(".anm-code-hilfen p")).map((p) => ({ text: ohne(p.textContent), link: ohne(p.querySelector("a").textContent) })),
          eingabeDir: eingabe.getAttribute("dir"),
          eingabeLang: eingabe.getAttribute("lang"),
          scroll: document.documentElement.scrollWidth <= window.innerWidth,
        };
      });
      ok(kennung + ": Code-Seite ist der erste Bildschirm, Schreibrichtung " + (rtl ? "rtl" : "ltr"), d.schritt === "code" && d.lang === code && d.dir === (rtl ? "rtl" : "ltr"), JSON.stringify({ schritt: d.schritt, lang: d.lang, dir: d.dir }));
      ok(kennung + ": Titel, zwei Sätze, Beschriftung und Knopf stehen in der Sprache (Texte aus dem Paket)", d.titel === ohneSteuer(T.titel) && JSON.stringify(d.absaetze) === JSON.stringify(T.einleitung.split("\n").map(ohneSteuer)) && d.label === ohneSteuer(T.label) && d.weiter === ohneSteuer(dict.nav.weiter), JSON.stringify([d.titel, d.absaetze, d.label, d.weiter]));
      ok(kennung + ": die zwei Zeilen darunter (Probetraining vereinbaren, Code von der Geschäftsstelle) stehen in der Sprache", d.links.length === 2 && d.links[0].text === ohneSteuer(T.kein.replace("{link}", T.keinLink)) && d.links[0].link === ohneSteuer(T.keinLink) && d.links[1].text === ohneSteuer(T.passiv.replace("{link}", T.passivLink)) && d.links[1].link === ohneSteuer(T.passivLink), JSON.stringify(d.links));
      ok(kennung + ": das Feld bleibt von links nach rechts (dir=ltr, lang=en), kein Querscrollen", d.eingabeDir === "ltr" && d.eingabeLang === "en" && d.scroll);
      const rechtCode = await leseRechtliches(page);
      ok(kennung + ": auf der Code-Seite stehen „Impressum“ und „Datenschutz“ (U-18, in jeder Sprache deutsch beschriftet, die Zielseiten sind deutsch)", rechtlichesOk(rechtCode), JSON.stringify(rechtCode));
      if (code !== "de") ok(kennung + ": die Texte sind übersetzt (Titel anders als auf Deutsch)", d.titel !== "Anmeldung nach dem Probetraining");
      await page.screenshot({ path: path.join(FOTOS, "code-390-" + code + ".png"), fullPage: false });
      // leer und falsch: Meldungen in der Sprache; richtig: Startschritt in der Sprache
      await page.click('#anmeldung [data-aktion="weiter"]');
      await warte(300);
      const leer = await page.evaluate(() => {
        const f = document.querySelector('#anmeldung [data-feld="code"] .anm-fehler');
        return f && !f.hidden ? f.textContent.replace(/[⁠⁦-⁩‎‏‪-‮]/g, "").replace(/\s+/g, " ").trim() : "";
      });
      ok(kennung + ": leerer Code: Meldung am Feld in der Sprache", leer === ohneSteuer(T.fehlerLeer), leer);
      await page.type('[data-pfad="zugang.code"]', "FALSCH-" + srv.testCode.slice(-4));
      await page.click('#anmeldung [data-aktion="weiter"]');
      await warte(300);
      const falsch = await page.evaluate(() => {
        const f = document.querySelector('#anmeldung [data-feld="code"] .anm-fehler');
        return f && !f.hidden ? f.textContent.replace(/[⁠⁦-⁩‎‏‪-‮]/g, "").replace(/\s+/g, " ").trim() : "";
      });
      ok(kennung + ": falscher Code: Meldung am Feld in der Sprache", falsch === ohneSteuer(T.fehlerFalsch), falsch);
      await page.screenshot({ path: path.join(FOTOS, "code-fehler-390-" + code + ".png"), fullPage: false });
      await page.$eval('[data-pfad="zugang.code"]', (e) => {
        e.focus();
        e.select();
      });
      await page.keyboard.press("Backspace");
      await page.keyboard.type(srv.testCode.toLowerCase());
      await page.click('#anmeldung [data-aktion="weiter"]');
      await page.waitForFunction(() => document.getElementById("anmeldung").dataset.schritt === "start", { timeout: 8000 }).catch(() => {});
      const start = await page.evaluate(() => ({ schritt: document.getElementById("anmeldung").dataset.schritt, lang: document.getElementById("anmeldung").getAttribute("lang"), titel: document.querySelector(".anm-titel").textContent.replace(/[⁠⁦-⁩‎‏‪-‮]/g, "").trim() }));
      ok(kennung + ": richtiger Code: Startschritt in der Sprache", start.schritt === "start" && start.lang === code && start.titel === ohneSteuer(dict.start.titel), JSON.stringify(start));
      seitenFehler(page, kennung + " (Code-Seite)");
      await page.close();

      // Übergabe (?app=1): ohne Prüfwerte wie mit Prüfwert dasselbe
      const app = await amStart(srv, browser, "uebergabe-" + code, "?app=1");
      await wechsle(app);
      const u = await app.evaluate(() => {
        const w = document.getElementById("anmeldung");
        const ohne = (s) => s.replace(/[⁠⁦-⁩‎‏‪-‮]/g, "").replace(/ /g, " ").replace(/\s+/g, " ").trim();
        const a = w.querySelector('a[data-aktion="im-browser-oeffnen"]');
        return { schritt: w.dataset.schritt, lang: w.getAttribute("lang"), dir: w.getAttribute("dir"), titel: ohne(w.querySelector(".anm-titel").textContent), knopf: a ? ohne(a.textContent) : null, href: a ? a.getAttribute("href") : null, scroll: document.documentElement.scrollWidth <= window.innerWidth };
      });
      ok(kennung + ": ?app=1 zeigt nur die Übergabe: Titel und Knopf in der Sprache, Adresse ext://https://…/anmeldung.html ohne app=1", u.schritt === "uebergabe" && u.lang === code && u.dir === (rtl ? "rtl" : "ltr") && u.titel === ohneSteuer(dict.app.uebergabe) && u.knopf === ohneSteuer(dict.app.browser) && u.href === "ext://" + ZIEL_ANMELDUNG && u.scroll, JSON.stringify(u));
      const rechtApp = await leseRechtliches(app);
      ok(kennung + ": auf der Übergabe (?app=1) stehen „Impressum“ und „Datenschutz“ (U-18)", rechtlichesOk(rechtApp), JSON.stringify(rechtApp));
      await app.screenshot({ path: path.join(FOTOS, "app-uebergabe-390-" + code + ".png"), fullPage: false });
      seitenFehler(app, kennung + " (Übergabe)");
      await app.close();
    }
  } finally {
    srv.setzeZugang([]);
  }
}

// Nur mit --cdn: die Seite auf dem CDN unverändert (mit den Prüfwerten der Konfiguration dort).
async function pruefeEchteKonfiguration(srv, browser) {
  console.log("\n=== Seite auf dem CDN unverändert: Zugang so, wie er dort eingestellt ist ===");
  const page = await neueSeite(srv, browser, { name: "echt", echt: true });
  await page.waitForSelector("#anmeldung[data-bereit]", { timeout: 15000 });
  const k = await page.evaluate(() => JSON.parse(document.getElementById("anmeldung-konfig").textContent));
  const liste = (k.anmeldung && k.anmeldung.zugang && k.anmeldung.zugang.pruefwerte) || [];
  ok("Konfiguration auf dem CDN: jeder Prüfwert ist ein SHA-256 (64 Hexzeichen, klein), " + liste.length + " Eintrag(e)", liste.every((x) => /^[0-9a-f]{64}$/.test(x)));
  const schritt = () => page.$eval("#anmeldung", (e) => e.dataset.schritt);
  if (liste.length === 0) {
    ok("keine Prüfwerte auf dem CDN: der Startschritt ist der erste Bildschirm (keine Code-Abfrage)", (await schritt()) === "start");
  } else {
    ok("Prüfwerte auf dem CDN: die Code-Seite ist der erste Bildschirm", (await schritt()) === "code");
    await page.type('[data-pfad="zugang.code"]', "FALSCH-" + srv.testCode.slice(-4));
    await page.click('#anmeldung [data-aktion="weiter"]');
    await warte(500);
    ok("Prüfwerte auf dem CDN: ein falscher Code wird abgewiesen", (await schritt()) === "code" && (await page.$eval('#anmeldung [data-feld="code"] .anm-fehler', (e) => !e.hidden)));
    if (ECHTER_CODE) {
      await page.close();
      const mitCode = await neueSeite(srv, browser, { name: "echt-mit-code", echt: true, abfrage: "?code=" + encodeURIComponent(ECHTER_CODE) });
      await mitCode.waitForSelector("#anmeldung[data-bereit]", { timeout: 15000 });
      ok("Prüfwerte auf dem CDN: ein Link mit dem richtigen Code führt zum Startschritt, ohne Code-Seite", (await mitCode.$eval("#anmeldung", (e) => e.dataset.schritt)) === "start");
      await mitCode.close();
      return;
    }
    info("Mit --code=<CODE> (oder ANMELDUNG_CODE) prüft der Test auch den richtigen Code; er wird nirgends gespeichert oder ausgegeben.");
  }
  await page.close();
}

// ---------- "Mitglied werden" (P1) ----------

// Die alten Wege zur Anmeldung: von keiner Seite mehr verlinkt.
const ALTE_WEGE = [
  [/aufnahmeantrag\.html/i, "Seite „Aufnahmeantrag online“"],
  [/Vereinsanmeldung/i, "Aufnahmeantrag-Vordruck (PDF)"],
  [/subject=Aufnahmeantrag/i, "Antrag per E-Mail"],
  [/6a903758/, "Formular der App (drender)"],
];
const ALTE_KNOEPFE = ["Schritt für Schritt anmelden", "Online ausfüllen", "PDF zum Ausdrucken", "Aufnahmeantrag online ausfüllen", "Aufnahmeantrag (PDF)", "Aufnahmeantrag per E-Mail"];

async function pruefeMitgliedWerden(srv, browser, konfigLive) {
  console.log("\n=== Mitglied werden: nur der Weg über den Assistenten (Web, Web mit ?app=1, App-Datei) ===");
  const VARIANTEN = [
    { name: "Mitglied werden (Web, 390)", datei: "mitglied-werden.html", vp: MOBIL, app: false, appKlasse: false, foto: "mitglied-werden-390.png", fotoOffen: "mitglied-werden-offen-390.png" },
    { name: "Mitglied werden (Web, 1440)", datei: "mitglied-werden.html", vp: DESKTOP, app: false, appKlasse: false, foto: "mitglied-werden-1440.png", fotoOffen: "mitglied-werden-offen-1440.png" },
    // Mit ?app=1 schreibt das Skript der Seite die Links für die App um; die Klasse app-modus setzt diese Seite (anders als die Terminseite) nicht.
    { name: "Mitglied werden (Web mit ?app=1, 390)", datei: "mitglied-werden.html", abfrage: "?app=1", vp: MOBIL, app: true, appKlasse: false, foto: "mitglied-werden-appmodus-390.png" },
    { name: "Mitglied-werden-App.html (App, 390)", pfad: WS + "Mitglied-werden-App.html", vp: MOBIL, app: true, appKlasse: true, appDatei: true, foto: "mitglied-werden-app-390.png", fotoOffen: "mitglied-werden-app-offen-390.png" },
  ];
  const mail = konfigLive.verein.mail;
  for (const v of VARIANTEN) {
    // In den App-Fassungen legt der Test vor dem Skript der Seite (DOMContentLoaded, zuerst eingetragen) einen Link mit ?code= und ?app=1 an: Die Weiche muss
    // app=1 weglassen und code behalten (die Familie öffnet den Link aus dem Chat: ext://https://…/anmeldung.html?code=…).
    const vorLaden = v.app
      ? async (p) =>
          p.evaluateOnNewDocument((ziel) => {
            document.addEventListener("DOMContentLoaded", () => {
              const a = document.createElement("a");
              a.id = "test-codelink";
              a.href = ziel;
              a.textContent = "Test";
              a.style.cssText = "position:fixed;left:-9999px;top:0"; // außerhalb des Bildes: stört weder die Prüfungen noch die Fotos
              document.body.appendChild(a);
            });
          }, ZIEL_ANMELDUNG + "?code=" + encodeURIComponent(srv.testCode) + "&app=1")
      : null;
    const page = await neueSeite(srv, browser, { name: v.name, datei: v.datei, pfad: v.pfad, abfrage: v.abfrage || "", vp: v.vp, vorLaden });
    await warte(600);
    const d = await page.evaluate(() => {
      const sicht = (e) => !!e && e.checkVisibility();
      const schritte = Array.from(document.querySelectorAll("ol.schritte > li"));
      const schritt2 = schritte[1];
      const links = schritt2 ? Array.from(schritt2.querySelectorAll("a")).filter(sicht).map((a) => ({ text: a.textContent.trim(), klasse: a.className, href: a.getAttribute("href"), ziel: a.href, target: a.getAttribute("target"), rel: a.getAttribute("rel") })) : [];
      const hilfe = Array.from(document.querySelectorAll("h2")).find((h) => h.textContent.trim() === "Fragen?");
      const hilfeAbschnitt = hilfe ? hilfe.closest("section") : null;
      const norm = (e) => (e ? e.innerText.replace(/\s+/g, " ").trim() : "");
      // Runde 2: der zugeklappte Bereich „Welche Unterlagen brauche ich?“ und die Liste „Zum Herunterladen“
      const bereich = document.querySelector("details.aufklapper");
      const zusammenfassung = bereich ? bereich.querySelector(":scope > summary") : null;
      const bereichInhalt = bereich ? bereich.querySelector(".aufklapper__inhalt") : null;
      const davor = bereich ? bereich.previousElementSibling : null;
      const ueberschriftDownloads = Array.from(document.querySelectorAll("h3")).find((h) => h.textContent.trim() === "Zum Herunterladen");
      const downloadListe = ueberschriftDownloads ? ueberschriftDownloads.nextElementSibling : null;
      return {
        anzahlSchritte: schritte.length,
        schritt1Anker: !!(schritte[0] && schritte[0].id === "probetraining"),
        schritt1Text: norm(schritte[0]),
        schritt3Text: norm(schritte[2]),
        bereich: {
          anzahlDetails: document.querySelectorAll("details").length,
          anzahl: document.querySelectorAll("details.aufklapper").length,
          offen: bereich ? bereich.open : null,
          beschriftung: zusammenfassung ? zusammenfassung.textContent.trim() : "",
          davor: davor ? davor.textContent.trim() : "",
          karten: bereichInhalt ? Array.from(bereichInhalt.querySelectorAll(".karte__titel")).map((x) => x.textContent.trim()) : [],
          punkte: bereichInhalt ? bereichInhalt.querySelectorAll("li").length : 0,
          inhaltSichtbar: bereichInhalt ? bereichInhalt.checkVisibility() : null,
          nachSumme: !!(bereich && ueberschriftDownloads && (bereich.compareDocumentPosition(ueberschriftDownloads) & Node.DOCUMENT_POSITION_FOLLOWING)),
        },
        downloads: { vorhanden: !!downloadListe, zeilen: downloadListe ? Array.from(downloadListe.children).map((li) => norm(li)) : [] },
        seitentext: document.body.textContent.replace(/\s+/g, " "),
        schritt2Text: schritt2 ? schritt2.innerText.replace(/\s+/g, " ").trim() : "",
        links,
        alleLinks: Array.from(document.querySelectorAll("a[href]")).map((a) => ({ text: a.textContent.trim(), href: a.getAttribute("href") })),
        hilfeText: hilfeAbschnitt ? hilfeAbschnitt.innerText.replace(/\s+/g, " ").trim() : "",
        hilfeMail: hilfeAbschnitt ? Array.from(hilfeAbschnitt.querySelectorAll('a[href^="mailto:"]')).map((a) => a.getAttribute("href")) : [],
        teileNurWebApp: document.querySelectorAll("[data-nur-web], [data-nur-app]").length,
        appKlasse: document.documentElement.classList.contains("app-modus"),
        querScroll: document.documentElement.scrollWidth > window.innerWidth,
        sichtbarerText: document.body.innerText.replace(/\s+/g, " "),
      };
    });
    const haupt = d.links.filter((l) => l.text === "Jetzt anmelden");
    ok(v.name + ": Schritt 2 sagt „Nach dem Probetraining bekommen Sie einen Code. Damit melden Sie sich hier an.“", d.anzahlSchritte === 4 && d.schritt2Text.includes("Nach dem Probetraining bekommen Sie einen Code. Damit melden Sie sich hier an."), d.schritt2Text.slice(0, 160));
    ok(v.name + ": in Schritt 2 genau ein sichtbarer Knopf „Jetzt anmelden“ (Knopf der ersten Klasse), sonst kein Knopf und kein Link", d.links.length === 1 && haupt.length === 1 && haupt[0].klasse === "knopf", JSON.stringify(d.links));
    const sollHref = v.app ? "ext://" + ZIEL_ANMELDUNG : "anmeldung.html";
    ok(v.name + ": „Jetzt anmelden“ führt auf " + sollHref + (v.app ? " (Browser der App, ohne app=1)" : ""), haupt.length === 1 && haupt[0].href === sollHref && (v.app || haupt[0].ziel === ZIEL_ANMELDUNG), haupt[0] && haupt[0].href);
    // Auf der Website zeigt die Hülle die Seiten in einem Rahmen ohne allow-Angaben (src/huelle/huelle.html): Teilen, Kopieren und Herunterladen sind dort nicht
    // verlässlich. Darum öffnet „Jetzt anmelden“ in einem neuen Fenster. In der App gilt die Weiche (ext://, ohne target).
    ok(v.name + ": „Jetzt anmelden“ " + (v.app ? "öffnet in der App den Browser: ext://, ohne target (die Weiche nimmt target weg)" : "öffnet ein neues Fenster: target=\"_blank\" rel=\"noopener\" (die Hülle zeigt die Seite in einem Rahmen)"),
      haupt.length === 1 && (v.app ? haupt[0].target === null : haupt[0].target === "_blank" && /noopener/.test(haupt[0].rel || "")), JSON.stringify({ target: haupt[0] && haupt[0].target, rel: haupt[0] && haupt[0].rel }));
    ok(v.name + ": Schritt 1 (Probetraining) trägt den Anker #probetraining für die Code-Seite", d.schritt1Anker);
    // Runde 2, Punkt 1 und 2 (Schritt 3): „(nur Fußball)“ entfällt in Schritt 1 (der Code gilt für alle), Herren- und Karneval-Zeile bleiben; Schritt 3 sagt nur noch, wie die Datei kommt.
    ok(v.name + ": Schritt 1 sagt „Probetraining vereinbaren: E-Mail an die Jugendleitung mit Jahrgang und Vorerfahrung.“ ohne „(nur Fußball)“; die Zeilen für die Herren und für Karneval bleiben",
      d.schritt1Text.startsWith("Probetraining vereinbaren: E-Mail an die Jugendleitung mit Jahrgang und Vorerfahrung.") && !/nur Fußball/.test(d.schritt1Text) && d.schritt1Text.includes("Für die Herren: E-Mail an das Trainerteam der Herren") && d.schritt1Text.includes("Karneval: E-Mail an die Karnevalabteilung"), d.schritt1Text.slice(0, 280));
    ok(v.name + ": Schritt 3 sagt „Datei schicken: Am Ende schicken Sie die Datei per E-Mail an die Geschäftsstelle.“ (nichts mehr von „steht unten“)", d.schritt3Text === "Datei schicken: Am Ende schicken Sie die Datei per E-Mail an die Geschäftsstelle." && !/steht unten/.test(d.seitentext), d.schritt3Text);
    // Runde 2, Punkt 2: die drei Listen in einem zugeklappten Bereich, davor ein Satz
    const b = d.bereich;
    ok(v.name + ": „Unterlagen (Fußball)“: davor der Satz „Die Anmeldung sagt Ihnen genau, was Sie brauchen.“, dann genau ein Bereich „Welche Unterlagen brauche ich?“ (<details>), zugeklappt; „Zum Herunterladen“ folgt danach",
      b.anzahlDetails === 1 && b.anzahl === 1 && b.offen === false && b.beschriftung === "Welche Unterlagen brauche ich?" && b.davor === "Die Anmeldung sagt Ihnen genau, was Sie brauchen." && b.nachSumme, JSON.stringify({ ...b, karten: undefined }));
    ok(v.name + ": im Bereich stehen die drei Listen unverändert (Neuanmeldung, Vereinswechsel, Ohne deutschen Pass); zugeklappt sind sie nicht zu sehen",
      b.karten.join("|") === "Neuanmeldung|Vereinswechsel|Ohne deutschen Pass" && b.punkte > 0 && b.inhaltSichtbar === false, JSON.stringify({ karten: b.karten, punkte: b.punkte, sichtbar: b.inhaltSichtbar }));
    // Runde 2, Punkt 3: „Zum Herunterladen“ ohne Info-Blatt und „Wichtige Unterlagen“; die Beitragsübersicht steht bei den Beiträgen (einmal auf der Seite)
    const nurDownloadSeite = ["Info-Blatt zur Anmeldung", "Wichtige Unterlagen, die mitzubringen sind"].filter((titel) => d.seitentext.includes(titel));
    ok(v.name + ": „Zum Herunterladen“ führt nur noch die Zusatzerklärung (12 bis 18 Jahre) und die Satzung; weder „Info-Blatt zur Anmeldung“ noch „Wichtige Unterlagen, die mitzubringen sind“ stehen auf der Seite; die Beitragsübersicht steht (einmal) bei den Beiträgen",
      d.downloads.vorhanden && d.downloads.zeilen.length === 2 && /^Zusatzerklärung für Spieler zwischen 12 und 18 Jahren ohne deutsche Staatsangehörigkeit/.test(d.downloads.zeilen[0]) && /^Satzung/.test(d.downloads.zeilen[1]) && nurDownloadSeite.length === 0 && d.alleLinks.filter((l) => l.text === "Beitragsübersicht").length === 1,
      nurDownloadSeite.length ? "noch da: " + nurDownloadSeite.join(", ") : JSON.stringify(d.downloads.zeilen.map((z) => z.slice(0, 50))));
    if (v.app) {
      const codeLink = await page.$eval("#test-codelink", (a) => ({ href: a.getAttribute("href"), target: a.getAttribute("target") }));
      ok(v.name + ": ein Link auf anmeldung.html?code=…&app=1 wird zu ext://https://…/anmeldung.html?code=… (app=1 weg, code bleibt, ohne target)", codeLink.href === "ext://" + ZIEL_ANMELDUNG + "?code=" + encodeURIComponent(srv.testCode) && codeLink.target === null, codeLink.href.replace(/code=.*/, "code=…"));
    }
    ok(v.name + ": Hilfe-Zeile „Fragen? Die Geschäftsstelle hilft.“ mit E-Mail an die Geschäftsstelle", d.hilfeText.includes("Die Geschäftsstelle hilft.") && d.hilfeMail.includes("mailto:" + mail + "?subject=Mitgliedschaft"), d.hilfeText.slice(0, 80) + " / " + d.hilfeMail.join(" "));
    const treffer = [];
    for (const l of d.alleLinks) for (const [muster, wer] of ALTE_WEGE) if (muster.test(l.href)) treffer.push(wer + ": " + l.href.slice(0, 80));
    ok(v.name + ": kein Link auf die alten Wege (Seite „Aufnahmeantrag online“, Vordruck, Antrag per E-Mail, Formular der App)", treffer.length === 0, treffer.slice(0, 3).join(" | "));
    const knoepfe = ALTE_KNOEPFE.filter((k) => d.alleLinks.some((l) => l.text === k) || d.sichtbarerText.includes(k));
    ok(v.name + ": keine Knöpfe der alten Wege mehr (" + ALTE_KNOEPFE.join(", ") + ")", knoepfe.length === 0, knoepfe.join(", "));
    ok(v.name + ": keine Teile „nur Web“ oder „nur App“ mehr, Klasse app-modus " + (v.appKlasse ? "an (feste App-Datei)" : "aus") + ", kein Querscrollen", d.teileNurWebApp === 0 && d.appKlasse === v.appKlasse && !d.querScroll, JSON.stringify({ teile: d.teileNurWebApp, app: d.appKlasse, scroll: d.querScroll }));
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: path.join(FOTOS, v.foto), fullPage: true });
    if (v.vp === MOBIL) await axePruefen(page, v.name);
    // Tastatur (Runde 2): Tab erreicht „Welche Unterlagen brauche ich?“ (vom bedienbaren Element davor), der Fokusring ist zu sehen; Eingabetaste und Leertaste klappen
    // den Bereich auf und zu; aufgeklappt ist der Inhalt zu sehen, zugeklappt nicht.
    {
      const vorher = await page.evaluate(() => {
        const bedienbar = Array.from(document.querySelectorAll('a[href], button, summary, input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter((e) => e.checkVisibility());
        const i = bedienbar.indexOf(document.querySelector("details.aufklapper > summary"));
        if (i < 1) return null;
        bedienbar[i - 1].focus();
        return bedienbar[i - 1].textContent.trim().slice(0, 40);
      });
      await page.keyboard.press("Tab");
      const fokus = await page.evaluate(() => {
        const s = document.querySelector("details.aufklapper > summary");
        const c = getComputedStyle(s);
        return { aufZusammenfassung: document.activeElement === s, ring: s.matches(":focus-visible") && c.outlineStyle !== "none" && parseFloat(c.outlineWidth) >= 2, hoehe: Math.round(s.getBoundingClientRect().height) };
      });
      ok(v.name + ": Tab vom Element davor („" + vorher + "“) erreicht die Zusammenfassung „Welche Unterlagen brauche ich?“, der Fokusring ist zu sehen, die Zeile ist mindestens 44 px hoch", vorher !== null && fokus.aufZusammenfassung && fokus.ring && fokus.hoehe >= 44, JSON.stringify(fokus));
      const zustand = () => page.evaluate(() => {
        const b = document.querySelector("details.aufklapper");
        return { offen: b.open, sichtbar: b.querySelector(".aufklapper__inhalt").checkVisibility(), fokusBleibt: document.activeElement === b.querySelector(":scope > summary") };
      });
      const folge = [];
      let stimmig = true;
      for (const taste of ["Enter", "Enter", "Space", "Space"]) {
        await page.keyboard.press(taste);
        const z = await zustand();
        folge.push(taste + ": " + (z.offen ? "offen" : "zu"));
        stimmig = stimmig && z.offen === z.sichtbar && z.fokusBleibt;
      }
      ok(v.name + ": per Tastatur auf- und zuklappbar (Eingabetaste auf, Eingabetaste zu, Leertaste auf, Leertaste zu); der Inhalt ist nur aufgeklappt zu sehen, der Fokus bleibt auf der Zusammenfassung", folge.join(", ") === "Enter: offen, Enter: zu, Space: offen, Space: zu" && stimmig, folge.join(", "));
      await page.keyboard.press("Enter"); // aufgeklappt lassen: Foto und axe im aufgeklappten Zustand
      await warte(300); // der Pfeil dreht sich in 160 ms: erst danach fotografieren
      const querOffen = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      ok(v.name + ": auch aufgeklappt kein Querscrollen", !querOffen);
      await page.evaluate(() => window.scrollTo(0, 0));
      if (v.fotoOffen) await page.screenshot({ path: path.join(FOTOS, v.fotoOffen), fullPage: true });
      if (v.vp === MOBIL) await axePruefen(page, v.name + " (Bereich aufgeklappt)");
    }
    if (v.appDatei) {
      const kopf = await page.evaluate(() => ({ titel: document.title, htmlKlasse: document.documentElement.className, appSeite: document.documentElement.hasAttribute("data-app-seite") }));
      ok(v.name + ": <html class=\"app-modus\" data-app-seite>, Titel „Mitglied werden“", /\bapp-modus\b/.test(kopf.htmlKlasse) && kopf.appSeite && kopf.titel === "Mitglied werden", JSON.stringify(kopf));
    }
    seitenFehler(page, v.name);
    await page.close();
  }

  // Der Knopf auf der Website führt zum Assistenten, und der verlangt den Code. Er öffnet ein neues Fenster; der Test öffnet dessen Adresse selbst in einer
  // neuen Seite (ein Fenster, das der Browser öffnet, hätte keine Umleitung der Anfragen).
  srv.setzeZugang([srv.testPruefwert]);
  try {
    const page = await neueSeite(srv, browser, { name: "Mitglied werden (Knopf „Jetzt anmelden“)", datei: "mitglied-werden.html" });
    const ziel = await page.evaluate(() => Array.from(document.querySelectorAll("ol.schritte > li")[1].querySelectorAll("a.knopf")).find((a) => a.textContent.trim() === "Jetzt anmelden").href);
    seitenFehler(page, "Mitglied werden (Knopf)");
    await page.close();
    const neu = await neueSeite(srv, browser, { name: "Mitglied werden (Ziel des Knopfes)", pfad: new URL(ziel).pathname });
    await neu.waitForSelector("#anmeldung[data-bereit]", { timeout: 15000 });
    const erreicht = await neu.evaluate(() => ({ pfad: location.pathname + location.search, schritt: document.getElementById("anmeldung").dataset.schritt, app: document.documentElement.classList.contains("app-modus") }));
    ok("Mitglied werden (Web): das Ziel des Knopfes „Jetzt anmelden“ ist der Assistent, und der beginnt mit der Code-Seite (" + erreicht.pfad + ")", ziel === ZIEL_ANMELDUNG && erreicht.pfad === PREFIX + "anmeldung.html" && erreicht.schritt === "code" && !erreicht.app, JSON.stringify(erreicht));
    seitenFehler(neu, "Mitglied werden (Ziel des Knopfes)");
    await neu.close();
  } finally {
    srv.setzeZugang([]);
  }
}

// ---------- aufnahmeantrag.html: Weiterleitung auf „Mitglied werden“ (P1, Runde 2) ----------

// Die alte Seite „Aufnahmeantrag online“ bleibt unter ihrer Adresse (Lesezeichen, alte Links, im CMS wird nichts gelöscht), ist aber seit Runde 2 eine Weiterleitung auf
// mitglied-werden.html (Muster der alten Seiten spielplan* und tabellen aus W6): kurzer Satz, Link, <meta http-equiv="refresh">, noindex. Der Test prüft zuerst die echte
// Weiterleitung (der Browser folgt dem <meta refresh>) und dann die Seite selbst: Dafür hält er die Weiterleitung an (er nimmt das <meta refresh> aus der Antwort, auch das
// geschieht nur im Browser des Tests) und macht die Fotos. In der App führt der Link über die Weiche auf nav:// (Seitenmodul „Mitglied werden“).
async function pruefeWeiterleitung(srv, browser) {
  console.log("\n=== aufnahmeantrag.html: Weiterleitung auf „Mitglied werden“ ===");
  const MODUL_MITGLIED_WERDEN = "nav://sportfreunde04_TextImage_1780401660329";
  // 1. Die echte Weiterleitung
  {
    const page = await neueSeite(srv, browser, { name: "aufnahmeantrag.html (Weiterleitung folgen)", datei: "aufnahmeantrag.html" });
    await page.waitForFunction(() => /\/mitglied-werden\.html$/.test(location.pathname), { timeout: 8000 }).catch(() => {});
    const z = await page.evaluate(() => ({ pfad: location.pathname, h1: (document.querySelector("h1") || {}).textContent, formulare: document.querySelectorAll("form").length, antrag: document.querySelectorAll("#antrag-formular").length }));
    ok("aufnahmeantrag.html: der Browser folgt dem <meta refresh> und landet auf mitglied-werden.html („Mitglied werden“, ohne Formular)", z.pfad === PREFIX + "mitglied-werden.html" && z.h1 && z.h1.trim() === "Mitglied werden" && z.formulare === 0 && z.antrag === 0, JSON.stringify(z));
    seitenFehler(page, "aufnahmeantrag.html (Weiterleitung folgen)");
    await page.close();
  }
  // 2. Die Seite selbst (Weiterleitung angehalten): Web am Handy und am Rechner, App-Modus (?app=1)
  const VARIANTEN = [
    { name: "aufnahmeantrag.html (Web, 390)", vp: MOBIL, app: false, foto: "aufnahmeantrag-weiterleitung-390.png" },
    { name: "aufnahmeantrag.html (Web, 1440)", vp: DESKTOP, app: false, foto: "aufnahmeantrag-weiterleitung-1440.png" },
    { name: "aufnahmeantrag.html (Web mit ?app=1, 390)", vp: MOBIL, app: true, abfrage: "?app=1", foto: "aufnahmeantrag-weiterleitung-app-390.png" },
  ];
  for (const v of VARIANTEN) {
    const gesehen = { refresh: false, noindex: false };
    const bodyAendern = (pfad, html) => {
      if (!pfad.endsWith("/aufnahmeantrag.html")) return html;
      gesehen.refresh = html.includes('<meta http-equiv="refresh" content="0; url=mitglied-werden.html">');
      gesehen.noindex = html.includes('<meta name="robots" content="noindex">');
      return html.replace(/<meta http-equiv="refresh"[^>]*>\s*/, "");
    };
    const page = await neueSeite(srv, browser, { name: v.name, datei: "aufnahmeantrag.html", abfrage: v.abfrage || "", vp: v.vp, bodyAendern });
    await warte(400);
    const d = await page.evaluate(() => {
      const sicht = (e) => !!e && e.checkVisibility();
      const hauptLinks = Array.from(document.querySelectorAll("main a[href]")).filter(sicht).map((a) => ({ text: a.textContent.trim(), href: a.getAttribute("href"), target: a.getAttribute("target") }));
      return {
        pfad: location.pathname,
        titel: document.title,
        h1: (document.querySelector("h1") || {}).textContent,
        lead: (document.querySelector(".seitenkopf__lead") || {}).textContent,
        hauptLinks,
        kanonisch: (document.querySelector('link[rel="canonical"]') || {}).href,
        robots: (document.querySelector('meta[name="robots"]') || {}).content,
        refreshNachher: !!document.querySelector('meta[http-equiv="refresh"]'),
        formulare: document.querySelectorAll("form, input, textarea, select, button").length,
        skripteDesAlten: Array.from(document.querySelectorAll("script[src]")).map((s) => s.getAttribute("src")),
        querScroll: document.documentElement.scrollWidth > window.innerWidth,
        text: document.body.innerText.replace(/\s+/g, " ").trim(),
      };
    });
    ok(v.name + ": <meta http-equiv=\"refresh\" content=\"0; url=mitglied-werden.html\"> und <meta name=\"robots\" content=\"noindex\"> stehen in der Seite (der Test hält die Weiterleitung für das Foto an)", gesehen.refresh && gesehen.noindex && !d.refreshNachher, JSON.stringify(gesehen));
    ok(v.name + ": Überschrift „Diese Seite ist umgezogen“, Satz „Die Anmeldung finden Sie jetzt bei „Mitglied werden“.“, genau ein Link „Weiter zu „Mitglied werden““", d.h1.trim() === "Diese Seite ist umgezogen" && d.lead.trim() === "Die Anmeldung finden Sie jetzt bei „Mitglied werden“." && d.hauptLinks.length === 1 && d.hauptLinks[0].text === "Weiter zu „Mitglied werden“", JSON.stringify({ h1: d.h1.trim(), lead: d.lead.trim(), links: d.hauptLinks }));
    const sollHref = v.app ? MODUL_MITGLIED_WERDEN : "mitglied-werden.html";
    ok(v.name + ": der Link führt auf " + sollHref + (v.app ? " (die Weiche der App: Seitenmodul „Mitglied werden“, ohne target)" : ""), d.hauptLinks.length === 1 && d.hauptLinks[0].href === sollHref && d.hauptLinks[0].target === null, JSON.stringify(d.hauptLinks));
    ok(v.name + ": noindex, canonical zeigt auf mitglied-werden.html, kein Formular und kein Skript des alten Formulars (aufnahmeantrag.js), nichts vom alten Antrag im Text, kein Querscrollen",
      d.robots === "noindex" && d.kanonisch === CDN_HOST + PREFIX + "mitglied-werden.html" && d.formulare === 0 && d.skripteDesAlten.length === 0 && !/Unterschrift|Aufnahmeantrag online|Vereinsanmeldung|PDF/.test(d.text) && !d.querScroll, JSON.stringify({ robots: d.robots, kanonisch: d.kanonisch, formulare: d.formulare, skripte: d.skripteDesAlten, scroll: d.querScroll }));
    await page.screenshot({ path: path.join(FOTOS, v.foto), fullPage: true });
    if (v.vp === MOBIL) await axePruefen(page, v.name);
    seitenFehler(page, v.name);
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
  const name = ablauf.titel + " (" + sprache + (optionen.code ? ", mit Code im Link" : "") + ")";
  console.log("\n--- " + name + " ---");
  // Mit optionen.code ist der Zugang eingeschaltet (Prüfwert des Test-Codes) und der Link trägt den Code: Der Assistent startet ohne Code-Seite.
  if (optionen.code) srv.setzeZugang([srv.testPruefwert]);
  try {
    await pruefeAblaufInnen(srv, browser, profil, konfig, dateien, ablauf, sprache, optionen, name);
  } finally {
    srv.setzeZugang([]);
  }
}

async function pruefeAblaufInnen(srv, browser, profil, konfig, dateien, ablauf, sprache, optionen, name) {
  const page = await amStart(srv, browser, name, optionen.code ? "?code=" + encodeURIComponent(srv.testCode) : "");
  if (optionen.code) {
    const z = await page.evaluate(() => ({ schritt: document.getElementById("anmeldung").dataset.schritt, suche: location.search }));
    ok(name + ": der Link mit gültigem Code startet den Assistenten ohne Code-Seite (Startschritt)", z.schritt === "start" && z.suche === "?code=" + encodeURIComponent(srv.testCode), JSON.stringify(z));
  }
  if (sprache === "en") {
    await page.click('[data-anm-sprachleiste] [data-sprache="en"]');
    await page.waitForFunction(() => document.getElementById("anmeldung").getAttribute("data-sprache") === "en", { timeout: 8000 });
  }
  let fotoFrage = false;
  let spielrechtHinweis = null; // M14: die Absätze der Seite „spielerpass“ (Erklärung zum Spielrecht)
  // Die Hinweiskästen "Für den Verein" (Vereinssicht der Begleitseite) bleiben im DOM, dürfen aber auf keiner Seite sichtbar sein.
  const vereinsKaesten = { gesamt: 0, sichtbar: [] };
  const foto = async (p, s) => {
    const k = await p.evaluate(() => ({ gesamt: document.querySelectorAll(".anm-vereinshinweis").length, sichtbar: Array.from(document.querySelectorAll(".anm-vereinshinweis")).filter((e) => e.checkVisibility()).length }));
    vereinsKaesten.gesamt += k.gesamt;
    if (k.sichtbar) vereinsKaesten.sichtbar.push(s.schritt + "/" + s.teil);
    if (s.schritt === "spielerpass" && spielrechtHinweis === null) spielrechtHinweis = await p.$$eval("#anmeldung p.anm-hinweis", (l) => l.map((x) => x.textContent.trim()));
    if (ablauf.id !== "kind-neu" || sprache !== "de" || optionen.code) return;
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
  {
    // M14 (12.10.2026): Im Paket gibt es keinen Schritt „spielen“ mehr. Fußball: Mannschaft, dann gleich der Spielerpass; Karneval: weder Mannschaft noch Spielerpass.
    const reihe = Array.from(new Set(r.besucht.map((x) => x.split("/")[0])));
    const fussball = ablauf.id !== "karneval-kind";
    ok(name + ": kein Schritt „spielen“; " + (fussball ? "Mannschaft und Spielerpass folgen unmittelbar aufeinander" : "weder Mannschaft noch Spielerpass"),
      !reihe.includes("spielen") && (fussball ? reihe.indexOf("mannschaft") >= 0 && reihe.indexOf("spielerpass") === reihe.indexOf("mannschaft") + 1 : !reihe.includes("mannschaft") && !reihe.includes("spielerpass")), reihe.join(" › "));
  }
  {
    const SPIELRECHT = sprache === "en"
      ? ["Anyone who plays football needs permission to play (Spielrecht) from the Hessian Football Association (Hessischer Fußball-Verband, HFV).", "The club applies for this for you.", "This sometimes takes a few weeks."]
      : ["Wer Fußball spielt, braucht ein Spielrecht vom Fußball-Verband.", "Das beantragt der Verein für Sie.", "Das dauert manchmal einige Wochen."];
    const fussball = ablauf.id !== "karneval-kind";
    ok(name + ": " + (fussball ? "die Seite „spielerpass“ trägt die Erklärung zum Spielrecht (3 Absätze, " + sprache + ")" : "Karneval: keine Seite „spielerpass“"),
      fussball ? !!spielrechtHinweis && SPIELRECHT.every((t) => spielrechtHinweis.includes(t)) : spielrechtHinweis === null, (spielrechtHinweis || []).join(" | "));
  }
  ok(name + ": Hinweiskästen „Für den Verein“ auf keiner Seite sichtbar", vereinsKaesten.sichtbar.length === 0, vereinsKaesten.sichtbar.slice(0, 3).join(", ") || vereinsKaesten.gesamt + " im DOM, alle ausgeblendet");
  const ergebnis = await dateiPruefen(browser, page, name, profil);
  if (ergebnis) {
    // M10: Teil A nennt den Schritt zur E-Mail mit der Adresse der Konfiguration; die Fertig-Seite zeigt den Abschnitt mit dem mailto:-Link
    const adresse = konfig.verein.mail;
    ok(name + ": Teil A der Datei nennt „Schicken Sie die Datei per E-Mail an die Geschäftsstelle: " + adresse + "“, den alten Satz zum Abgeben im Verein nicht mehr", ergebnis.text.replace(/\s+/g, " ").includes("Schicken Sie die Datei per E-Mail an die Geschäftsstelle: " + adresse) && !/Geben Sie Teil B im Verein ab|auf dem Handy mit/.test(ergebnis.text.replace(/\s+/g, " ")), "");
    const mail = await page.evaluate(() => {
      const abschnitt = document.querySelector("#anmeldung [data-senden]");
      const a = abschnitt && abschnitt.querySelector('a[data-aktion="mail-oeffnen"]');
      if (!a) return null;
      const vorher = a.getAttribute("href");
      const sperre = (e) => e.preventDefault(); // die Navigation selbst verhindern: Der Test prüft nur, ob der Link umgeschrieben würde
      document.addEventListener("click", sperre);
      a.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      document.removeEventListener("click", sperre);
      const adr = abschnitt.querySelector("[data-mail-adresse]");
      const kopieren = abschnitt.querySelector('button[data-aktion="adresse-kopieren"]');
      return { vorher, nachher: a.getAttribute("href"), target: a.getAttribute("target"), sichtbar: a.checkVisibility(), adresse: adr && adr.textContent, kopieren: !!kopieren && kopieren.checkVisibility() };
    });
    const erwBetreff = "Anmeldung " + profil.vorname + " " + profil.nachname;
    const soll = "mailto:" + adresse + "?subject=" + encodeURIComponent(erwBetreff) + "&body=Guten%20Tag%2C%0D%0A%0D%0Aanbei%20die%20Anmeldung%20als%20PDF.%0D%0A%0D%0AViele%20Gr%C3%BC%C3%9Fe";
    ok(name + ": Fertig-Seite zeigt den Abschnitt zum Schicken per E-Mail: Adresse " + adresse + ", Knopf „Adresse kopieren“, mailto-Link mit Betreff „" + erwBetreff + "“ und deutschem Text", !!mail && mail.adresse === adresse && mail.kopieren && mail.sichtbar && mail.vorher === soll, JSON.stringify(mail));
    // Der Link bleibt auch nach einem Klick ein mailto:-Link (kein ext://, kein ?app=1, ohne target)
    ok(name + ": der Link bleibt auch nach einem Klick ein mailto:-Link (kein ext://, kein ?app=1, ohne target)", !!mail && mail.nachher === mail.vorher && /^mailto:/.test(mail.nachher) && mail.target === null && !/ext:|app=1/.test(mail.nachher), JSON.stringify(mail));
  }
  if (optionen.code && ergebnis) {
    // Der Code ist keine Angabe zur Person: Er steht weder im Text noch in den Bytes des PDF noch im Speicher des Browsers
    const norm = srv.testCode.replace(/-/g, "");
    ok(name + ": der Code steht nicht im Text des PDF", !ergebnis.text.includes(srv.testCode) && !ergebnis.text.replace(/\s+/g, "").includes(norm));
    ok(name + ": der Code steht nirgends in den Bytes des PDF (auch nicht in den Metadaten)", ergebnis.bytes.length > 0 && !ergebnis.bytes.includes(Buffer.from(norm)) && !ergebnis.bytes.includes(Buffer.from(srv.testCode)));
    const speicher = await page.evaluate(() => ({ ls: localStorage.length, ss: sessionStorage.length, cookie: document.cookie }));
    ok(name + ": im Speicher des Browsers steht nichts (localStorage, sessionStorage, Cookies)", speicher.ls === 0 && speicher.ss === 0 && speicher.cookie === "", JSON.stringify(speicher));
  }
  if (ablauf.id === "kind-neu" && sprache === "de" && !optionen.code && ergebnis) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: path.join(FOTOS, "fertig-390.png"), fullPage: true });
    await axePruefen(page, "Fertig-Seite");
  }
  seitenFehler(page, name);
  await page.close();
}

// ---------- Module im Paket gegen die Quellen (Node, ohne Browser) ----------

const dekodiere = (text) => Uint8Array.from(Buffer.from(text.replace(/\s+/g, ""), "base64"));
const kopie = (x) => JSON.parse(JSON.stringify(x));
const NUR_BEGLEIT = ["seite.titel", "seite.beschreibung", "band", "demo.werkzeugTitel", "demo.vorfuehrung", "demo.vereinssichtTitel", "demo.vereinssichtText", "demo.vereinssichtAn", "demo.vereinssichtAus", "demo.beispieleTitel", "demo.beispieleText", "demo.konzeptLink", "demo.beispielGeladen", "demo.codeZuerst"];

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

  // Zugang (P1): anmeldung-zugang.js im Paket (ohne Kommentare, umbenannt) rechnet wie die Quelle zugang.js
  {
    const quelle = await imp(path.join(ROOT, "assets", "js", "anmeldung", "zugang.js"));
    const paket = await imp(path.join(PAKET, "anmeldung-zugang.js"));
    const proben = ["abc", "ab-cd ef", "  test-1234  ", "İstanbul ı", "ÁÉÍ ÖÜ", "٠١٢٣٤٥٦٧٨٩ ۰۱۲", "ＡＢＣ－１２３", "a\u00a0b\u2013c\u2212d", "\u200eCODE\u200f", "x\ny\tz", "", "   ", "---"];
    ok("Zugang im Paket: normalisiereCode liefert für " + proben.length + " Eingaben dasselbe wie die Quelle", proben.every((x) => quelle.normalisiereCode(x) === paket.normalisiereCode(x)));
    ok("Zugang im Paket: normalisiereCode (Leerzeichen und Bindestriche weg, Großbuchstaben): „ab-cd ef“ wird ABCDEF", paket.normalisiereCode("ab-cd ef") === "ABCDEF" && paket.normalisiereCode(" - ") === "");
    const vektoren = ["", "abc", "a".repeat(1000), "Müßiggänger äöüÄÖÜß", "😀 𝒳", "الرمز İstanbul", "x".repeat(55), "x".repeat(56), "x".repeat(64)];
    const knoten = (x) => createHash("sha256").update(x, "utf8").digest("hex");
    ok("Zugang im Paket: eigene SHA-256-Funktion = Node crypto für " + vektoren.length + " Testvektoren (leer, „abc“, 1000 Zeichen, Umlaute, Emoji, Arabisch, Blockgrenzen)", vektoren.every((x) => paket.sha256HexEigen(x) === knoten(x) && quelle.sha256HexEigen(x) === knoten(x)));
    const liste = [knoten("ABC"), " " + knoten("XYZ").toUpperCase() + " ", "kein-pruefwert"];
    const konf = { zugang: { parameter: "code", pruefwerte: liste } };
    ok("Zugang im Paket: zugangAusKonfig wie die Quelle (aktiv, Parameter, Prüfwerte klein und ohne Leerraum); leere Liste = nicht aktiv", isDeepStrictEqual(quelle.zugangAusKonfig(konf), paket.zugangAusKonfig(konf)) && paket.zugangAusKonfig(konf).aktiv === true && paket.zugangAusKonfig({ zugang: { pruefwerte: [] } }).aktiv === false && paket.zugangAusKonfig({}).aktiv === false);
    const eingaben = ["abc", "a-b c", "ABD", "", "xyz", " X-Y Z "];
    const r1 = [];
    const r2 = [];
    for (const e of eingaben) {
      r1.push(await quelle.pruefeCode(e, paket.zugangAusKonfig(konf).pruefwerte));
      r2.push(await paket.pruefeCode(e, paket.zugangAusKonfig(konf).pruefwerte));
    }
    ok("Zugang im Paket: pruefeCode wie die Quelle (richtig: abc, a-b c, xyz; falsch: ABD; leer: Leereingabe)", isDeepStrictEqual(r1, r2) && r2.map((r) => (r.leer ? "leer" : r.gueltig ? "ja" : "nein")).join(",") === "ja,ja,nein,leer,ja,ja", JSON.stringify(r2.map((r) => (r.leer ? "leer" : r.gueltig))));
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
      // P3 Teil b (D1): Teil A hat die Tabelle „Wo unterschreiben Sie?“ nur, wenn noch etwas mit Stift zu unterschreiben ist; die leere Zeile des Kindes steht dort nicht mehr (der Laufzettel nennt sie)
      ok("PDF kind-neu, Feld des Kindes leer: Teil A „Sie haben alles am Bildschirm unterschrieben.“ ohne Tabelle „Wo unterschreiben Sie?“ und ohne Zeile „Nicht unterschrieben (freiwillig)“, Laufzettel „Das Kind hat den Antrag nicht unterschrieben. Das Passwesen entscheidet, ob das nötig ist.“, kein „Einige Unterschriften fehlen noch“",
        text.includes("Sie haben alles am Bildschirm unterschrieben.") && text.includes("Das Kind hat den Antrag nicht unterschrieben. Das Passwesen entscheidet, ob das nötig ist.") && !text.includes("Einige Unterschriften fehlen noch") && !text.includes("Nicht unterschrieben (freiwillig)") && !text.includes("Wo unterschreiben Sie?"), "");
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

  const zugangKonfig = konfigLive.anmeldung.zugang;
  ok("Konfiguration der Seite: Zugang mit Parameter „code“ und einer Liste von Prüfwerten (jeder ein SHA-256, 64 Hexzeichen klein; leer = keine Code-Abfrage), seiten.probetraining zeigt auf „Mitglied werden“", !!zugangKonfig && zugangKonfig.parameter === "code" && Array.isArray(zugangKonfig.pruefwerte) && zugangKonfig.pruefwerte.every((x) => /^[0-9a-f]{64}$/.test(x)) && konfigLive.seiten && konfigLive.seiten.probetraining === "mitglied-werden.html#probetraining", JSON.stringify({ zugang: zugangKonfig && { parameter: zugangKonfig.parameter, anzahl: (zugangKonfig.pruefwerte || []).length }, probetraining: konfigLive.seiten && konfigLive.seiten.probetraining }));

  const srv = await starteServer();
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: CHROME_ARGUMENTE });
  srv.browser = browser;
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
    const umgebung = zugangUmgebung(srv, browser, konfigLive);
    await abschnitt("Seite", () => pruefeSeite(srv, browser, konfigLive));
    await abschnitt("Zugang mit Code", () => pruefeZugangImBrowser(umgebung));
    await abschnitt("Übergabe in den Browser", () => pruefeUebergabeImBrowser(umgebung));
    await abschnitt("Code-Seite und Übergabe in allen Sprachen", () => pruefeCodeSprachen(srv, browser, konfigLive));
    await abschnitt("Hinweis zur Umgebung (Rahmen, Browser anderer Apps)", () => pruefeUmgebungshinweisImBrowser(umgebung));
    await abschnitt("Hinweis zur Umgebung in allen Sprachen", () => pruefeUmgebungshinweisSprachen(umgebung));
    await abschnitt("Mitglied werden", () => pruefeMitgliedWerden(srv, browser, konfigLive));
    await abschnitt("Weiterleitung aufnahmeantrag.html", () => pruefeWeiterleitung(srv, browser));
    const abl = SCHNELL ? [ABLAEUFE[0]] : ABLAEUFE;
    for (const sprache of SCHNELL ? ["de"] : ["de", "en"]) {
      for (const a of abl) await abschnitt(a.titel + " (" + sprache + ")", () => pruefeAblauf(srv, browser, beispiele, konfigLive, dateien, a, sprache));
    }
    await abschnitt("Kind neu (de, mit Code im Link)", () => pruefeAblauf(srv, browser, beispiele, konfigLive, dateien, ABLAEUFE[0], "de", { code: true }));
    if (CDN) await abschnitt("Seite auf dem CDN unverändert", () => pruefeEchteKonfiguration(srv, browser));
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
