#!/usr/bin/env node
// Test des Zugangs mit Code vom Probetraining (Paket P1, 12.10.2026) – ohne Browser.
//
// Geprüft wird:
//   1. SHA-256: die eigene Funktion (assets/js/anmeldung/zugang.js) gleicht node:crypto und crypto.subtle (Testvektoren: leer,
//      „abc“, 1000 Zeichen, Umlaute, Emoji, alle Längen von 0 bis 300 rund um die Blockgrenzen, Zufallstexte); sha256Hex fällt auf die
//      eigene Funktion zurück, wenn crypto.subtle fehlt oder scheitert.
//   2. Normalisierung: Leerzeichen, Bindestriche (auch Gedankenstriche), Groß- und Kleinbuchstaben, türkisches İ und ı, arabisch-
//      indische Ziffern, unsichtbare Richtungszeichen, geschützte Leerzeichen.
//   3. Konfiguration und Prüfung: zugangAusKonfig (leer = aus), pruefeCode mit einem und mit zwei Prüfwerten, leer, falsch.
//   4. Werkzeug tools/anmeldung-zugang.mjs: setzt und prüft Prüfwerte (--code, --behalten, --pruefen, --leeren) auf einer KOPIE der
//      Daten (--daten); schreibt nur die Liste (der Rest der Datei bleibt Zeichen für Zeichen); erzeugt Blatt (PDF) und QR-Code (PNG);
//      verweigert Ordner im Repo außer unter tools/cache/ (auch über einen symbolischen Verweis); der Code steht in keiner Datei der
//      Daten; der Inhalt des QR-Codes wird maschinell gelesen (CoreImage über tools/anmeldung-test/qr-dekodieren.swift) und ist die
//      richtige Adresse, im PNG und im gerenderten PDF (pdftoppm).
//   5. data/anmeldung.json bleibt unberührt (Prüfsumme vorher und nachher); kein Klartext-Code des Testlaufs irgendwo im Repo.
//   6. Umgebung (Zusätze zu P1, 12.10.2026; assets/js/anmeldung/umgebung.js): Erkennung der Browser anderer Apps und der Android-WebView an
//      Kennungen im User-Agent, geprüft mit einer Liste von User-Agent-Zeilen (tools/anmeldung-test/user-agents.mjs: Treffer und kein Treffer),
//      jede Kennung einzeln; Erkennung des Rahmens (window.top !== window.self, auch wenn der Zugriff scheitert); Vorrang von „inapp“.
//
// Aufruf: node tools/anmeldung-test/zugang-test.mjs   (Exit 0 nur, wenn alles bestanden ist)

import { createHash, randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const Z = await import(pathToFileURL(path.join(ROOT, "assets", "js", "anmeldung", "zugang.js")).href);
const W = await import(pathToFileURL(path.join(ROOT, "tools", "anmeldung-zugang.mjs")).href);
const DATEN = path.join(ROOT, "data", "anmeldung.json");
const CACHE = path.join(ROOT, "tools", "cache", "anmeldung-test", "zugang");
const BLATT_ORDNER = process.env.ZUGANG_BLATT_ORDNER ? path.resolve(process.env.ZUGANG_BLATT_ORDNER) : path.join(CACHE, "blatt");

let fehler = 0;
let anzahl = 0;
function ok(name, bedingung, detail) {
  anzahl++;
  if (!bedingung) fehler++;
  console.log((bedingung ? "OK      " : "FEHLER  ") + name + (detail ? " – " + detail : ""));
  return !!bedingung;
}
const sha = (t) => createHash("sha256").update(t, "utf8").digest("hex");
const sha256Datei = (p) => createHash("sha256").update(fs.readFileSync(p)).digest("hex");

const datenVorher = sha256Datei(DATEN);

// ---------- 1. SHA-256 ----------

console.log("\n=== 1. SHA-256: eigene Funktion gegen node:crypto und crypto.subtle ===");
{
  const vektoren = [
    ["leer", ""],
    ["abc", "abc"],
    ["1000 mal a", "a".repeat(1000)],
    ["Umlaute", "Müßiggänger – Übergrößenträger äöüÄÖÜß"],
    ["Emoji und Zeichen außerhalb der Grundebene", "😀 Test 𝒳 𐍈"],
    ["arabisch und türkisch", "الرمز İstanbul ığüşöç"],
  ];
  for (const [name, text] of vektoren) {
    const eigen = Z.sha256HexEigen(text);
    const soll = sha(text);
    const subtle = await Z.sha256Hex(text);
    ok("SHA-256 " + name + ": eigene Funktion = node:crypto = sha256Hex (crypto.subtle)", eigen === soll && subtle === soll, soll.slice(0, 16) + "…");
  }
  ok("SHA-256 leer: bekannter Wert e3b0c442…b855", Z.sha256HexEigen("") === "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  ok("SHA-256 „abc“: bekannter Wert ba7816bf…15ad", Z.sha256HexEigen("abc") === "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  let abweichungen = 0;
  for (let n = 0; n <= 300; n++) if (Z.sha256HexEigen("q".repeat(n)) !== sha("q".repeat(n))) abweichungen++;
  ok("SHA-256: alle Längen von 0 bis 300 Zeichen (Blockgrenzen bei 55, 56, 63, 64, 65, 119, 120, 128)", abweichungen === 0, abweichungen + " Abweichungen");
  abweichungen = 0;
  for (let i = 0; i < 300; i++) {
    const text = randomBytes(1 + (i % 200)).toString("latin1") + String.fromCodePoint(0x20 + (i * 37) % 0xd000);
    if (Z.sha256HexEigen(text) !== sha(text)) abweichungen++;
  }
  ok("SHA-256: 300 Zufallstexte", abweichungen === 0, abweichungen + " Abweichungen");
  const te = new TextEncoder();
  let utf = 0;
  for (const [, text] of vektoren) {
    const a = Z.utf8Bytes(text);
    const b = te.encode(text);
    if (a.length !== b.length || a.some((x, i) => x !== b[i])) utf++;
  }
  ok("UTF-8: utf8Bytes = TextEncoder", utf === 0);

  // ohne crypto.subtle
  const original = Object.getOwnPropertyDescriptor(globalThis.crypto, "subtle");
  Object.defineProperty(globalThis.crypto, "subtle", { get: () => undefined, configurable: true });
  const ohne = await Z.sha256Hex("abc");
  ok("Ohne crypto.subtle: sha256Hex rechnet mit der eigenen Funktion dasselbe", ohne === sha("abc") && globalThis.crypto.subtle === undefined);
  const pc = await Z.pruefeCode("abc", [sha("ABC")]);
  ok("Ohne crypto.subtle: pruefeCode funktioniert", pc.gueltig === true);
  // subtle da, aber digest scheitert
  Object.defineProperty(globalThis.crypto, "subtle", { get: () => ({ digest: () => Promise.reject(new Error("nicht erlaubt")) }), configurable: true });
  const scheitert = await Z.sha256Hex("abc");
  ok("crypto.subtle.digest scheitert: sha256Hex fällt auf die eigene Funktion zurück", scheitert === sha("abc"));
  if (original) Object.defineProperty(globalThis.crypto, "subtle", original);
  else delete globalThis.crypto.subtle;
  ok("crypto.subtle ist wieder da", !!globalThis.crypto.subtle);
}

// ---------- 2. Normalisierung ----------

console.log("\n=== 2. Normalisierung ===");
{
  const faelle = [
    ["ABCD-EFGH-JKLM", "ABCDEFGHJKLM", "Bindestriche weg"],
    ["abcd efgh jklm", "ABCDEFGHJKLM", "Leerzeichen weg, Großbuchstaben"],
    ["  Abcd - Efgh   jklm \n", "ABCDEFGHJKLM", "Ränder und Mischformen"],
    ["abcd efgh jklm", "ABCDEFGHJKLM", "geschützte und schmale Leerzeichen"],
    ["abcd–efgh—jklm−", "ABCDEFGHJKLM", "Gedankenstriche und Minus"],
    ["abcd‐efgh‑jklm", "ABCDEFGHJKLM", "Unicode-Bindestriche"],
    ["‎ABCD‏-EFGH‪⁦JKLM⁩", "ABCDEFGHJKLM", "unsichtbare Richtungszeichen (Kopieren aus Chat-Programmen, Arabisch)"],
    ["﻿abcd​efgh", "ABCDEFGH", "Byte-Reihenfolge-Marke und Nullbreitenzeichen"],
    ["İSTANBUL", "ISTANBUL", "türkisches İ (Großbuchstabe mit Punkt) wird I"],
    ["ıstanbul", "ISTANBUL", "türkisches ı (i ohne Punkt) wird I"],
    ["istanbul", "ISTANBUL", "i wird I"],
    ["ÁÉÍÓÚ", "AEIOU", "Akzente fallen weg"],
    ["٠١٢٣٤٥٦٧٨٩", "0123456789", "arabisch-indische Ziffern"],
    ["۰۱۲۳۴۵۶۷۸۹", "0123456789", "persische Ziffern"],
    ["ＡＢＣ１２３", "ABC123", "breite Formen"],
    ["", "", "leer"],
    ["   - -  ", "", "nur Leerzeichen und Bindestriche"],
    [null, "", "null"],
    [undefined, "", "undefined"],
    ["x_y", "X_Y", "Unterstrich bleibt"],
  ];
  for (const [eingabe, soll, name] of faelle) ok("normalisiereCode: " + name, Z.normalisiereCode(eingabe) === soll, JSON.stringify(eingabe) + " → " + JSON.stringify(Z.normalisiereCode(eingabe)));
  // dieselbe Normalisierung im Werkzeug
  ok("Werkzeug: linkFuer und anzeigeFuer nutzen dieselbe Normalisierung", W.linkFuer("ab cd-ef 12") === W.LINK_BASIS + "?code=ABCDEF12" && W.anzeigeFuer("ab cd-ef 12") === "ABCD-EF12" && W.anzeigeFuer("abcdefghijkl") === "ABCD-EFGH-IJKL" && W.anzeigeFuer("abcde") === "ABCD-E");
  ok("Link: https-Adresse auf cdn.appack.de, Seite anmeldung.html, Parameter code", /^https:\/\/cdn\.appack\.de\/sportfreunde04\/workspace\/web\/anmeldung\.html\?code=[A-Z0-9]+$/.test(W.linkFuer("test-ab23-cd45")));
}

// ---------- 3. Konfiguration und Prüfung ----------

console.log("\n=== 3. Konfiguration und Prüfung ===");
{
  const h1 = sha("TESTAB23CD45");
  const h2 = sha("ZWEITERCODE99");
  ok("zugangAusKonfig: fehlt der Block, ist der Zugang aus", Z.zugangAusKonfig({}).aktiv === false && Z.zugangAusKonfig(undefined).aktiv === false && Z.zugangAusKonfig({ zugang: null }).aktiv === false);
  ok("zugangAusKonfig: leere Liste = aus", Z.zugangAusKonfig({ zugang: { parameter: "code", pruefwerte: [] } }).aktiv === false);
  const z = Z.zugangAusKonfig({ zugang: { parameter: "code", pruefwerte: [h1.toUpperCase(), " " + h2] } });
  ok("zugangAusKonfig: nicht leere Liste = aktiv, Prüfwerte klein und ohne Leerraum", z.aktiv === true && z.pruefwerte.join() === [h1, h2].join() && z.parameter === "code");
  ok("zugangAusKonfig: unbrauchbarer Parameter gilt als „code“", Z.zugangAusKonfig({ zugang: { parameter: "a b", pruefwerte: [h1] } }).parameter === "code");
  ok("zugangAusKonfig: ein Eintrag, der kein Prüfwert ist, lässt den Zugang aktiv (nichts passt: die Seite bleibt zu)", Z.zugangAusKonfig({ zugang: { pruefwerte: ["unsinn"] } }).aktiv === true);
  const p1 = await Z.pruefeCode("test-ab23 cd45", [h1]);
  ok("pruefeCode: richtiger Code in anderer Schreibweise", p1.gueltig === true && p1.leer === false && p1.code === "TESTAB23CD45");
  ok("pruefeCode: falscher Code", (await Z.pruefeCode("test-ab23-cd46", [h1])).gueltig === false);
  ok("pruefeCode: leere Eingabe", (await Z.pruefeCode("  - ", [h1])).leer === true && (await Z.pruefeCode("", [h1])).gueltig === false);
  ok("pruefeCode: zwei Prüfwerte, beide Codes gelten", (await Z.pruefeCode("ZWEITERCODE99", [h1, h2])).gueltig === true && (await Z.pruefeCode("TESTAB23CD45", [h1, h2])).gueltig === true);
  ok("pruefeCode: leere Liste lässt nichts durch", (await Z.pruefeCode("TESTAB23CD45", [])).gueltig === false);
  ok("pruefeCode: ein Prüfwert in Großbuchstaben in der Liste gilt auch", (await Z.pruefeCode("TESTAB23CD45", [h1.toUpperCase()])).gueltig === true);
  ok("Prüfwert-Muster: 64 Kleinbuchstaben und Ziffern (hex)", Z.PRUEFWERT_MUSTER.test(h1) && !Z.PRUEFWERT_MUSTER.test(h1.toUpperCase()) && !Z.PRUEFWERT_MUSTER.test(h1.slice(1)));
}

// ---------- 4. Werkzeug ----------

console.log("\n=== 4. Werkzeug tools/anmeldung-zugang.mjs (auf einer Kopie der Daten) ===");
const TESTCODE = "TEST-" + randomBytes(3).toString("hex").toUpperCase() + "-" + randomBytes(3).toString("hex").toUpperCase() + "-ZK7M";
const TESTNORM = TESTCODE.replace(/-/g, "");
{
  fs.rmSync(CACHE, { recursive: true, force: true });
  fs.mkdirSync(CACHE, { recursive: true });
  const kopie = path.join(CACHE, "anmeldung-kopie.json");
  fs.copyFileSync(DATEN, kopie);
  fs.writeFileSync(kopie, W.setzePruefwerteImText(fs.readFileSync(kopie, "utf8"), [])); // Ausgangslage: leere Liste, unabhängig vom Stand im Repo
  const kopieText0 = fs.readFileSync(kopie, "utf8");
  const cli = (...args) => spawnSync(process.execPath, [path.join(ROOT, "tools", "anmeldung-zugang.mjs"), ...args], { encoding: "utf8", cwd: ROOT });

  // setzen
  const r1 = cli("--code", TESTCODE, "--blatt", BLATT_ORDNER, "--daten", kopie);
  ok("--code --blatt: Exit 0", r1.status === 0, (r1.stderr || "").trim());
  const text1 = fs.readFileSync(kopie, "utf8");
  const liste1 = W.lesePruefwerte(text1);
  ok("--code: die Liste hat genau einen Prüfwert, den SHA-256 des normalisierten Codes", liste1.length === 1 && liste1[0] === sha(TESTNORM), liste1.length + " Prüfwert(e)");
  ok("--code: außer der Liste hat sich in der Datei nichts geändert (Text Zeichen für Zeichen)", text1.replace(/"pruefwerte": \[[^\]]*\]/, '"pruefwerte": []') === kopieText0.replace(/"pruefwerte": \[[^\]]*\]/, '"pruefwerte": []'));
  ok("--code: der Klartext-Code steht nicht in der Datei und nicht in der Ausgabe (nur der Prüfwert)", !text1.includes(TESTCODE) && !text1.includes(TESTNORM) && !(r1.stdout + r1.stderr).includes(TESTNORM) && !(r1.stdout + r1.stderr).includes(TESTCODE));
  ok("--code: die Ausgabe zeigt den Link mit „***“ statt des Codes", /anmeldung\.html\?code=\*\*\*/.test(r1.stdout), r1.stdout.split("\n").find((z) => z.startsWith("Link")) || "");
  const pdf = path.join(BLATT_ORDNER, W.BLATT_NAME + ".pdf");
  const png = path.join(BLATT_ORDNER, W.BLATT_NAME + ".png");
  ok("--blatt: PDF und PNG liegen im Ordner (Dateinamen „Anmeldung – QR-Code für das Probetraining“)", fs.existsSync(pdf) && fs.existsSync(png) && W.BLATT_NAME === "Anmeldung – QR-Code für das Probetraining", BLATT_ORDNER);
  const info = spawnSync("pdfinfo", [pdf], { encoding: "utf8" });
  ok("PDF: genau eine Seite im Format A4 (595 × 842 pt)", /Pages:\s+1\b/.test(info.stdout || "") && /Page size:\s+595\.\d+ x 841\.\d+ pts \(A4\)/.test(info.stdout || ""), (info.stdout || "").split("\n").filter((z) => /Pages|Page size/.test(z)).join("; "));
  const text = spawnSync("pdftotext", ["-layout", pdf, "-"], { encoding: "utf8" }).stdout || "";
  const flach = text.replace(/\s+/g, " ");
  ok("PDF: Titel „Anmeldung nach dem Probetraining“", flach.includes("Anmeldung nach dem Probetraining"));
  ok("PDF: Zeile für die Trainer „Zeigen Sie den QR-Code den Eltern oder schicken Sie ihnen den Link.“", flach.includes("Zeigen Sie den QR-Code den Eltern oder schicken Sie ihnen den Link."));
  ok("PDF: der Code in großen Zeichen (in Gruppen zu vier Zeichen)", flach.includes(W.anzeigeFuer(TESTCODE)), W.anzeigeFuer(TESTCODE));
  ok("PDF: der Link steht darauf", flach.includes(W.linkFuer(TESTCODE)));
  ok("PDF: drei Schritte für die Familie (Code scannen oder Link öffnen · Fragen beantworten · Datei per E-Mail an die Geschäftsstelle schicken)", flach.includes("Code scannen oder Link öffnen.") && flach.includes("Fragen beantworten.") && flach.includes("Datei per E-Mail an die Geschäftsstelle schicken."));
  ok("PDF: Zeile „Auf Deutsch, Englisch, Türkisch und Arabisch.“", flach.includes("Auf Deutsch, Englisch, Türkisch und Arabisch."));
  ok("PDF: kein „Prototyp“, kein „Entwurf“", !/Prototyp|Entwurf/.test(flach));
  const fonts = spawnSync("pdffonts", [pdf], { encoding: "utf8" }).stdout || "";
  ok("PDF: Schrift eingebettet (Liberation Sans), keine Standardschrift ohne Einbettung", /LiberationSans/.test(fonts) && !/\b(Helvetica|Arial|Times)\b/.test(fonts));
  // Farben im Inhalt der Seite: nur Vereinsblau (#191793) und die Neutraltöne der Speuzer-Seiten; weder Rot noch Grün (kein Eintracht-CD)
  {
    const PDFLib = await import("pdf-lib");
    const dok = await PDFLib.PDFDocument.load(fs.readFileSync(pdf));
    const inhalt = dok.getPage(0).node.Contents();
    const stroeme = inhalt instanceof PDFLib.PDFArray ? inhalt.asArray().map((r) => dok.context.lookup(r)) : [inhalt];
    const roh = stroeme.map((s) => Buffer.from(PDFLib.decodePDFRawStream(s).decode()).toString("latin1")).join("\n");
    const hex = (z) => Math.round(Number(z) * 255).toString(16).padStart(2, "0");
    const farben = new Set([...roh.matchAll(/(-?[0-9.]+) (-?[0-9.]+) (-?[0-9.]+) (?:rg|RG)\b/g)].map((m) => "#" + hex(m[1]) + hex(m[2]) + hex(m[3])));
    const ERLAUBT = ["#191793", "#12142b", "#3f4360", "#d8dbea", "#ffffff"]; // Vereinsblau, Tinte, Tinte 2, Linie, Weiß (assets/css/tokens.css)
    const fremd = [...farben].filter((f) => !ERLAUBT.includes(f));
    ok("PDF: nur Vereinsblau #191793 und die Neutraltöne der Seiten (Tinte, Linie, Weiß) – kein Rot, kein Grün, keine Farbe des Eintracht-CD", farben.has("#191793") && fremd.length === 0, [...farben].join(" "));
  }

  // QR-Code maschinell lesen
  const swift = path.join(ROOT, "tools", "anmeldung-test", "qr-dekodieren.swift");
  let leser = null;
  if (process.platform === "darwin" && spawnSync("which", ["swiftc"]).status === 0) {
    const exe = path.join(CACHE, "qr-dekodieren");
    const c = spawnSync("swiftc", ["-O", "-o", exe, swift], { encoding: "utf8" });
    if (c.status === 0) leser = (bild) => spawnSync(exe, [bild], { encoding: "utf8" });
    else console.log("        swiftc scheitert: " + (c.stderr || "").slice(0, 200));
  }
  if (!leser) {
    ok("QR-Code lesen: kein Leser auf diesem Rechner (Swift/CoreImage nur auf dem Mac) – übersprungen", true, "nicht geprüft");
  } else {
    const soll = W.linkFuer(TESTCODE);
    const a = leser(png);
    ok("QR-Code im PNG: maschinell gelesen (CoreImage CIDetector) = richtige Adresse", a.status === 0 && a.stdout.trim() === soll, a.stdout.trim());
    const bildPfad = path.join(CACHE, "blatt-seite");
    spawnSync("pdftoppm", ["-png", "-r", "200", "-singlefile", pdf, bildPfad]);
    const b = leser(bildPfad + ".png");
    ok("QR-Code im PDF (gerendert mit pdftoppm, 200 dpi): maschinell gelesen = richtige Adresse", b.status === 0 && b.stdout.trim() === soll, b.stdout.trim());
    fs.copyFileSync(bildPfad + ".png", path.join(BLATT_ORDNER, "blatt-seite.png"));
    // Probe, dass der Leser nicht alles „bestätigt“: ein anderer Code ergibt eine andere Adresse
    const anderer = path.join(CACHE, "anderer.png");
    fs.writeFileSync(anderer, await W.qrPng(W.linkFuer(TESTCODE + "X")));
    ok("QR-Code lesen: Gegenprobe – ein anderer Code ergibt eine andere Adresse", leser(anderer).stdout.trim() === W.linkFuer(TESTCODE + "X") && leser(anderer).stdout.trim() !== soll);
  }

  // Blatt für Codes verschiedener Länge: alles innerhalb der Ränder, nichts übereinander, der Code groß und vollständig, der QR-Code lesbar
  {
    console.log("\n=== 4b. Blatt für Codes von 8 bis 32 Zeichen: Ränder, keine Überlappung, Code groß und vollständig, QR-Code lesbar ===");
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const zufall = (n) => Array.from(randomBytes(n), (b) => alphabet[b % alphabet.length]).join("");
    const ordner = path.join(CACHE, "laengen");
    fs.rmSync(ordner, { recursive: true, force: true });
    fs.mkdirSync(ordner, { recursive: true });
    const ueberlappen = (a, b) => {
      const h = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
      const v = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
      return h > 1 && v > 0.25 * Math.min(a.y1 - a.y0, b.y1 - b.y0);
    };
    for (const n of [8, 12, 16, 20, 24, 28, 32]) {
      const code = zufall(n);
      const datei = path.join(ordner, "blatt-" + n + ".pdf");
      fs.writeFileSync(datei, await W.baueBlatt(code));
      const bbox = spawnSync("pdftotext", ["-bbox", datei, "-"], { encoding: "utf8" }).stdout || "";
      const woerter = [...bbox.matchAll(/<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)<\/word>/g)].map((m) => ({ x0: +m[1], y0: +m[2], x1: +m[3], y1: +m[4], t: m[5] }));
      const aussen = woerter.filter((w) => w.x0 < 50 || w.x1 > 595.28 - 50 || w.y0 < 20 || w.y1 > 822);
      ok(`Blatt mit Code aus ${n} Zeichen: alle ${woerter.length} Wörter und Zeichen liegen innerhalb der Ränder (mindestens 50 pt von den Seitenkanten)`, woerter.length > 40 && aussen.length === 0, aussen.slice(0, 3).map((w) => `${w.t} x ${w.x0.toFixed(0)}–${w.x1.toFixed(0)}`).join("; "));
      let kollisionen = 0;
      for (let i = 0; i < woerter.length; i++) for (let j = i + 1; j < woerter.length; j++) if (ueberlappen(woerter[i], woerter[j])) kollisionen++;
      ok(`Blatt mit Code aus ${n} Zeichen: kein Text liegt über anderem Text`, kollisionen === 0, kollisionen + " Überlappungen");
      const fussWoerter = woerter.filter((w) => w.y0 > 775);
      const restWoerter = woerter.filter((w) => w.y0 <= 775);
      ok(`Blatt mit Code aus ${n} Zeichen: die drei Schritte enden über der Linie vor der Fußzeile (Fußzeile: ${fussWoerter.map((w) => w.t).join(" ").slice(0, 20)}…)`, fussWoerter.length >= 5 && Math.max(...restWoerter.map((w) => w.y1)) < 841.89 - 74 - 2, "unterste Kante des Textes darüber: " + Math.max(...restWoerter.map((w) => w.y1)).toFixed(0));
      const text = spawnSync("pdftotext", ["-layout", datei, "-"], { encoding: "utf8" }).stdout || "";
      ok(`Blatt mit Code aus ${n} Zeichen: der Code steht vollständig auf dem Blatt (in Gruppen zu vier Zeichen)`, text.replace(/\s+/g, "").includes(W.anzeigeFuer(code)), W.anzeigeFuer(code));
      const codeWoerter = woerter.filter((w) => /^[A-Z2-9-]+$/.test(w.t) && w.y1 - w.y0 > 22);
      const hoehe = codeWoerter.length ? Math.min(...codeWoerter.map((w) => w.y1 - w.y0)) : 0;
      const zeilenY = new Set(codeWoerter.map((w) => Math.round(w.y0 / 4)));
      ok(`Blatt mit Code aus ${n} Zeichen: der Code steht in großen Zeichen (Zeichenhöhe ${hoehe.toFixed(0)} pt, mindestens 28) und in ${zeilenY.size} Zeile${zeilenY.size === 1 ? "" : "n"}`, codeWoerter.length >= 1 && hoehe >= 28 && zeilenY.size <= 2, "");
      if (leser) {
        const bild = path.join(ordner, "blatt-" + n);
        spawnSync("pdftoppm", ["-png", "-r", "200", "-singlefile", datei, bild]);
        const gelesen = leser(bild + ".png");
        ok(`Blatt mit Code aus ${n} Zeichen: der QR-Code lässt sich aus dem gerenderten PDF maschinell lesen = richtige Adresse`, gelesen.status === 0 && gelesen.stdout.trim() === W.linkFuer(code), gelesen.stdout.trim().replace(/code=.*/, "code=…"));
      }
    }
    // Obergrenze
    const textVorher = fs.readFileSync(kopie, "utf8");
    fs.rmSync(path.join(CACHE, "blatt5"), { recursive: true, force: true });
    const zuLang = cli("--code", zufall(33), "--blatt", path.join(CACHE, "blatt5"), "--daten", kopie);
    ok("--code mit zu langem Code (über 32 Zeichen): Exit 2, nichts geschrieben, kein Blatt", zuLang.status === 2 && /höchstens 32/.test(zuLang.stderr) && !fs.existsSync(path.join(CACHE, "blatt5")) && fs.readFileSync(kopie, "utf8") === textVorher, (zuLang.stderr || "").trim().slice(0, 80));
    fs.copyFileSync(path.join(ordner, "blatt-32.pdf"), path.join(BLATT_ORDNER, "blatt-code-32-zeichen.pdf"));
    fs.copyFileSync(path.join(ordner, "blatt-16.pdf"), path.join(BLATT_ORDNER, "blatt-code-16-zeichen.pdf"));
    for (const n of [16, 32]) if (leser) fs.copyFileSync(path.join(ordner, "blatt-" + n + ".png"), path.join(BLATT_ORDNER, "blatt-code-" + n + "-zeichen.png"));
  }

  // prüfen
  ok("--pruefen mit dem Code: Exit 0", cli("--pruefen", TESTCODE, "--daten", kopie).status === 0);
  ok("--pruefen mit dem Code in anderer Schreibweise (klein, Leerzeichen): Exit 0", cli("--pruefen", TESTCODE.toLowerCase().replace(/-/g, " "), "--daten", kopie).status === 0);
  ok("--pruefen mit falschem Code: Exit 1", cli("--pruefen", TESTCODE + "X", "--daten", kopie).status === 1);
  const stdinProbe = spawnSync(process.execPath, [path.join(ROOT, "tools", "anmeldung-zugang.mjs"), "--pruefen", "-", "--daten", kopie], { input: TESTCODE + "\n", encoding: "utf8" });
  ok("--pruefen - liest den Code von der Standardeingabe: Exit 0", stdinProbe.status === 0);

  // behalten
  const ZWEIT = "ZWEI-" + randomBytes(3).toString("hex").toUpperCase() + "-MN4P-QR7S";
  const r2 = cli("--code", ZWEIT, "--behalten", "--blatt", path.join(CACHE, "blatt2"), "--daten", kopie);
  const liste2 = W.lesePruefwerte(fs.readFileSync(kopie, "utf8"));
  ok("--code --behalten: der alte Prüfwert bleibt, der neue kommt dazu (zwei Prüfwerte, beide Codes gelten)", r2.status === 0 && liste2.length === 2 && liste2.includes(sha(TESTNORM)) && liste2.includes(sha(ZWEIT.replace(/-/g, ""))) && cli("--pruefen", TESTCODE, "--daten", kopie).status === 0 && cli("--pruefen", ZWEIT, "--daten", kopie).status === 0);
  const r2b = cli("--code", ZWEIT, "--behalten", "--daten", kopie);
  ok("--code --behalten mit demselben Code noch einmal: kein doppelter Prüfwert", r2b.status === 0 && W.lesePruefwerte(fs.readFileSync(kopie, "utf8")).length === 2 && /Kein Blatt erzeugt/.test(r2b.stdout));
  const r3 = cli("--code", "NEUER-CODE-ZZ98-77XY", "--blatt", path.join(CACHE, "blatt3"), "--daten", kopie);
  const liste3 = W.lesePruefwerte(fs.readFileSync(kopie, "utf8"));
  ok("--code ohne --behalten: die Liste enthält nur den neuen Prüfwert; die alten Codes gelten nicht mehr", r3.status === 0 && liste3.length === 1 && cli("--pruefen", TESTCODE, "--daten", kopie).status === 1 && cli("--pruefen", "NEUER-CODE-ZZ98-77XY", "--daten", kopie).status === 0);

  // leeren
  const r4 = cli("--leeren", "--daten", kopie);
  ok("--leeren: Liste leer, Datei sonst unverändert", r4.status === 0 && W.lesePruefwerte(fs.readFileSync(kopie, "utf8")).length === 0 && fs.readFileSync(kopie, "utf8") === kopieText0);
  ok("--pruefen bei leerer Liste: Exit 1 und der Hinweis „keine Code-Abfrage“", cli("--pruefen", TESTCODE, "--daten", kopie).status === 1 && /keine Code-Abfrage/.test(cli("--pruefen", TESTCODE, "--daten", kopie).stdout));

  // Fehler
  const kurz = cli("--code", "ABC-1234", "--blatt", path.join(CACHE, "blatt4"), "--daten", kopie);
  ok("--code mit zu kurzem Code (unter 8 Zeichen): Exit 2, nichts geschrieben", kurz.status === 2 && !fs.existsSync(path.join(CACHE, "blatt4")) && fs.readFileSync(kopie, "utf8") === kopieText0, (kurz.stderr || "").trim().slice(0, 80));
  ok("--code ohne Wert / unbekannte Angabe / zwei Aufgaben: Exit 2", cli("--code").status === 2 && cli("--unbekannt").status === 2 && cli("--leeren", "--pruefen", "x").status === 2);
  ok("ohne Angaben: Hilfe und Exit 2", cli().status === 2 && /--code <CODE> --blatt/.test(cli().stdout));

  // Ordner im Repo verweigern
  const repoOrdner = [
    ["Wurzel des Repos", ROOT],
    ["docs/", path.join(ROOT, "docs", "x-blatt")],
    ["assets/", path.join(ROOT, "assets", "x-blatt")],
    ["data/", path.join(ROOT, "data")],
    ["tools/ (nicht cache)", path.join(ROOT, "tools", "x-blatt")],
    ["tools/cache-x (nur ein ähnlicher Name)", path.join(ROOT, "tools", "cache-x")],
    ["mit ..", path.join(ROOT, "tools", "cache", "..", "..", "src", "x")],
  ];
  for (const [name, ordner] of repoOrdner) {
    const r = cli("--code", TESTCODE, "--blatt", ordner, "--daten", kopie);
    ok("Ordner im Repo wird verweigert: " + name, r.status === 2 && /liegt im Repo/.test(r.stderr) && !fs.existsSync(path.join(ordner, W.BLATT_NAME + ".pdf")) && fs.readFileSync(kopie, "utf8") === kopieText0, (r.stderr || "").trim().slice(0, 70));
  }
  // relativer Pfad „.“ von der Wurzel aus
  const rel = spawnSync(process.execPath, [path.join(ROOT, "tools", "anmeldung-zugang.mjs"), "--code", TESTCODE, "--blatt", ".", "--daten", kopie], { encoding: "utf8", cwd: ROOT });
  ok("Ordner im Repo wird verweigert: relativer Pfad „.“ (Arbeitsordner = Repo)", rel.status === 2 && /liegt im Repo/.test(rel.stderr));
  // symbolischer Verweis unter tools/cache, der ins Repo zeigt
  const verweis = path.join(CACHE, "verweis-ins-repo");
  try {
    fs.symlinkSync(path.join(ROOT, "docs"), verweis);
    const r = cli("--code", TESTCODE, "--blatt", path.join(verweis, "x"), "--daten", kopie);
    ok("Ordner im Repo wird verweigert: symbolischer Verweis unter tools/cache, der nach docs/ zeigt", r.status === 2 && /liegt im Repo/.test(r.stderr) && !fs.existsSync(path.join(ROOT, "docs", "x")));
  } finally {
    fs.rmSync(verweis, { force: true });
  }
  // erlaubt: unter tools/cache und außerhalb des Repos
  const aussen = fs.mkdtempSync(path.join(os.tmpdir(), "zugang-blatt-"));
  const r5 = cli("--code", TESTCODE, "--blatt", path.join(aussen, "Vereinsordner"), "--daten", kopie);
  ok("Ordner außerhalb des Repos (Systemordner für Temporäres) wird angenommen", r5.status === 0 && fs.existsSync(path.join(aussen, "Vereinsordner", W.BLATT_NAME + ".pdf")) && fs.existsSync(path.join(aussen, "Vereinsordner", W.BLATT_NAME + ".png")));
  fs.rmSync(aussen, { recursive: true, force: true });
  ok("Ordner unter tools/cache/ wird angenommen (oben benutzt)", fs.existsSync(pdf));

  // beschädigte Daten
  const kaputt = path.join(CACHE, "kaputt.json");
  fs.writeFileSync(kaputt, JSON.stringify({ stand: "x" }));
  const r6 = cli("--code", TESTCODE, "--daten", kaputt);
  ok("Daten ohne „zugang › pruefwerte“: Exit 2, nichts geschrieben", r6.status === 2 && fs.readFileSync(kaputt, "utf8") === JSON.stringify({ stand: "x" }));
  const mitUnsinn = path.join(CACHE, "unsinn.json");
  const unsinnText = kopieText0.replace('"pruefwerte": []', '"pruefwerte": ["unsinn"]');
  fs.writeFileSync(mitUnsinn, unsinnText);
  const r7 = cli("--code", TESTCODE, "--behalten", "--daten", mitUnsinn);
  ok("Ein Eintrag in der Liste, der kein SHA-256 ist: Exit 2, nichts geschrieben", r7.status === 2 && fs.readFileSync(mitUnsinn, "utf8") === unsinnText);

  // setzePruefwerteImText: Formatierung
  const drei = [sha("a"), sha("b"), sha("c")];
  const t3 = W.setzePruefwerteImText(kopieText0, drei);
  ok("setzePruefwerteImText: drei Prüfwerte, jede in einer Zeile, Rest unverändert, lesbar", JSON.stringify(W.lesePruefwerte(t3)) === JSON.stringify(drei) && /"pruefwerte": \[\n      "[0-9a-f]{64}",\n      "[0-9a-f]{64}",\n      "[0-9a-f]{64}"\n    \]/.test(t3) && W.setzePruefwerteImText(t3, []) === kopieText0);
  ok("Daten (Repo): die Datei data/anmeldung.json ist mit JSON.stringify(…, null, 2) wieder lesbar (Vorbedingung für das Werkzeug)", (() => { try { return JSON.parse(fs.readFileSync(DATEN, "utf8")).zugang.pruefwerte.every((x) => /^[0-9a-f]{64}$/.test(x)); } catch (e) { return false; } })());
}

// ---------- 5. Das Repo bleibt sauber ----------

console.log("\n=== 5. data/anmeldung.json unberührt, kein Klartext-Code im Repo ===");
{
  ok("data/anmeldung.json: Prüfsumme vor und nach dem Test gleich (der Test fasst die echte Datei nicht an)", sha256Datei(DATEN) === datenVorher);
  // Suche im Repo (ohne node_modules, .git, tools/cache): kein Vorkommen des Testcodes in irgendeiner Textdatei
  const treffer = [];
  const suche = (ordner) => {
    for (const e of fs.readdirSync(ordner, { withFileTypes: true })) {
      if (e.name === "node_modules" || e.name === ".git") continue;
      const p = path.join(ordner, e.name);
      if (p === path.join(ROOT, "tools", "cache")) continue;
      if (e.isDirectory()) suche(p);
      else if (e.isFile() && fs.statSync(p).size < 5 * 1024 * 1024 && /\.(js|mjs|json|html|css|md|txt|csv|svg|py|sh)$/.test(e.name)) {
        const text = fs.readFileSync(p, "utf8");
        if (text.includes(TESTCODE) || text.includes(TESTNORM)) treffer.push(path.relative(ROOT, p));
      }
    }
  };
  suche(ROOT);
  ok("Repo (ohne node_modules, .git und tools/cache): der Testcode dieses Laufs steht in keiner Textdatei", treffer.length === 0, treffer.slice(0, 3).join(", "));
}

// ---------- 6. Umgebung ----------

console.log("\n=== 6. Umgebung: In-App-Browser (User-Agent) und Rahmen ===");
{
  const U = await import(pathToFileURL(path.join(ROOT, "assets", "js", "anmeldung", "umgebung.js")).href);
  const { UA_ZEILEN } = await import(pathToFileURL(path.join(ROOT, "tools", "anmeldung-test", "user-agents.mjs")).href);
  const treffer = UA_ZEILEN.filter((z) => z.inApp);
  const keine = UA_ZEILEN.filter((z) => !z.inApp);
  ok("Kennungen genau wie vorgegeben: „; wv)“, FBAN, FBAV, FB_IAB, Instagram, LinkedInApp, „Line/“, MicroMessenger, musical_ly, Bytedance, Snapchat",
    JSON.stringify(U.IN_APP_KENNUNGEN) === JSON.stringify(["; wv)", "FBAN", "FBAV", "FB_IAB", "Instagram", "LinkedInApp", "Line/", "MicroMessenger", "musical_ly", "Bytedance", "Snapchat"]));
  ok("User-Agent-Zeilen zum Prüfen: " + treffer.length + " Treffer und " + keine.length + " normale Browser (mindestens 12 insgesamt)", UA_ZEILEN.length >= 12 && treffer.length >= 6 && keine.length >= 6, UA_ZEILEN.length + " Zeilen");
  for (const z of treffer) {
    const gefunden = U.erkenneInAppBrowser(z.ua);
    ok("Treffer: " + z.name + " – Kennung „" + z.kennung + "“ steht im User-Agent, die Erkennung trifft", z.ua.includes(z.kennung) && gefunden !== null, "gefunden: " + gefunden);
  }
  for (const z of keine) ok("Kein Treffer: " + z.name, U.erkenneInAppBrowser(z.ua) === null && U.umgebungshinweis(z.ua, { top: 1, self: 1 }) === null, String(U.erkenneInAppBrowser(z.ua)));
  ok("jede Kennung kommt in den Zeilen als auslösende Kennung vor (alle 11)", U.IN_APP_KENNUNGEN.every((k) => treffer.some((z) => z.kennung === k)), U.IN_APP_KENNUNGEN.filter((k) => !treffer.some((z) => z.kennung === k)).join(", "));
  // Jede Kennung einzeln: Sie allein genügt, und ohne sie trifft ein sonst normaler User-Agent nicht
  const normal = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.6478.71 Mobile Safari/537.36";
  const einzeln = U.IN_APP_KENNUNGEN.map((k) => [k, U.erkenneInAppBrowser(normal + " " + k + "1.0") === k && U.erkenneInAppBrowser(normal) === null]);
  ok("jede Kennung einzeln: allein genügt sie (an einen normalen Chrome-User-Agent gehängt), der normale trifft nicht", einzeln.every(([, richtig]) => richtig), einzeln.filter(([, r]) => !r).map(([k]) => k).join(", "));
  ok("die Kennung „; wv)“ trifft nur mit Strichpunkt, Leerzeichen und Klammer (nicht „wv“ in einem anderen Wort)", U.erkenneInAppBrowser("Mozilla/5.0 (X11; Linux x86_64) wvx Chrome/126.0") === null && U.erkenneInAppBrowser("Mozilla/5.0 (Linux; Android 11; K; wv) Chrome/126.0") === "; wv)");
  ok("Groß- und Kleinschreibung zählt (wie die Programme sie senden): „instagram“ klein und „line/“ klein treffen nicht", U.erkenneInAppBrowser("Mozilla/5.0 instagram line/1") === null);
  ok("leerer, fehlender und fremder Wert: kein Treffer, kein Fehler", U.erkenneInAppBrowser("") === null && U.erkenneInAppBrowser(undefined) === null && U.erkenneInAppBrowser(null) === null && U.erkenneInAppBrowser(42) === null);

  // Rahmen: window.top !== window.self; Zugriff mit try/catch
  const oben = { top: null, self: null };
  oben.top = oben;
  oben.self = oben;
  const rahmen = { top: { name: "aussen" }, self: { name: "innen" } };
  const wirft = {
    get top() {
      throw new Error("SecurityError");
    },
    self: {},
  };
  ok("Rahmen: oben (top gleich self) – nein", U.imRahmen(oben) === false);
  ok("Rahmen: im Rahmen (top ungleich self) – ja", U.imRahmen(rahmen) === true);
  ok("Rahmen: scheitert der Zugriff auf window.top, gilt die Seite als eingerahmt", U.imRahmen(wirft) === true);
  ok("Rahmen: ohne Fenster (Node) – nein", U.imRahmen(undefined) === false && U.imRahmen(null) === false);
  // Vorrang
  const fb = treffer.find((z) => z.name === "Facebook (iPhone)").ua;
  const safari = keine.find((z) => z.name === "Safari (iPhone)").ua;
  ok("Hinweis: Browser einer anderen App gewinnt gegen den Rahmen („inapp“), auch eingerahmt", U.umgebungshinweis(fb, oben) === "inapp" && U.umgebungshinweis(fb, rahmen) === "inapp");
  ok("Hinweis: normaler Browser im Rahmen = „rahmen“, oben = kein Hinweis", U.umgebungshinweis(safari, rahmen) === "rahmen" && U.umgebungshinweis(safari, oben) === null && U.umgebungshinweis(safari, wirft) === "rahmen");
}

console.log("\n=== Zusammenfassung ===");
console.log(anzahl + " Prüfungen, " + fehler + " Fehler.");
console.log(fehler ? "zugang-test.mjs: FEHLER" : "zugang-test.mjs: alles bestanden.");
process.exit(fehler ? 1 : 0);
