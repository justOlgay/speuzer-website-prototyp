#!/usr/bin/env node
// Zugang zum Anmelde-Assistenten: Code vom Probetraining (Paket P1, 12.10.2026).
//
// Der Assistent startet nur mit einem Code (Entscheidung der 1. Vorsitzenden vom 12.10.2026). In data/anmeldung.json › zugang
// stehen nur Prüfwerte: der SHA-256 (hex, klein) des normalisierten Codes. Der Code selbst steht nie im Repo. Dieses Werkzeug
// setzt und prüft die Prüfwerte und erzeugt das Blatt für die Trainer (A4, PDF) und den QR-Code (PNG).
//
// Aufruf
//   node tools/anmeldung-zugang.mjs --code <CODE> --blatt <Ordner> [--behalten]
//       Normalisiert den Code (Leerzeichen und Bindestriche weg, Großbuchstaben; assets/js/anmeldung/zugang.js), schreibt den
//       Prüfwert in data/anmeldung.json und legt im Ordner „Anmeldung – QR-Code für das Probetraining.pdf“ (A4) und
//       „… .png“ (QR-Code) ab. --behalten: Die bisherigen Prüfwerte bleiben gültig (Wechsel ohne Lücke), sonst ersetzt der neue
//       Prüfwert die Liste. Der Ordner darf nicht im Repo liegen, außer unter tools/cache/ (dort ignoriert Git alles).
//   node tools/anmeldung-zugang.mjs --pruefen <CODE>
//       Sagt, ob der Code zur Konfiguration passt (Exit 0 ja, 1 nein oder keine Abfrage aktiv).
//   node tools/anmeldung-zugang.mjs --leeren
//       Leert die Liste der Prüfwerte: keine Code-Abfrage mehr.
//   node tools/anmeldung-zugang.mjs --hilfe
// Weitere Angaben
//   --code - und --pruefen -   lesen den Code von der Standardeingabe (er steht dann nicht in der Befehlszeile).
//   Länge des Codes: 8 bis 32 Zeichen (nach dem Normalisieren), empfohlen ab 12 (A–Z ohne I und O, 2–9). Der Prüfwert steht öffentlich im
//   Repo; ein kurzer Code ließe sich daraus erraten. Auf dem Blatt steht der Code so groß wie möglich innerhalb der Ränder, ein langer
//   Code in zwei Zeilen.
//   --daten <Datei>            statt data/anmeldung.json (für Tests mit einer Kopie).
//   --zeigen                   zeigt den Code im Link der Ausgabe (sonst steht dort „…?code=***“).
//   Die Ausgabe nennt nie den Code und den Prüfwert, außer mit --zeigen.
//
// Link im QR-Code: https://cdn.appack.de/sportfreunde04/workspace/web/anmeldung.html?code=<CODE>
// Der Code im Link ist der normalisierte Code (nur A–Z und 0–9); auf dem Blatt steht er in Gruppen zu vier Zeichen.
//
// Nur vorhandene Pakete: qrcode und pdf-lib (devDependencies). Der Klartext-Code geht in keine Datei im Repo; das Blatt und das Bild
// liegen im Ordner außerhalb des Repos (oder unter tools/cache/), und data/anmeldung.json bekommt nur den Prüfwert.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import QRCode from "qrcode";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { normalisiereCode, sha256Hex, zugangAusKonfig, PRUEFWERT_MUSTER } from "../assets/js/anmeldung/zugang.js";

const HIER = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HIER, "..");
export const STANDARD_DATEN = path.join(ROOT, "data", "anmeldung.json");
export const LINK_BASIS = "https://cdn.appack.de/sportfreunde04/workspace/web/anmeldung.html";
export const BLATT_NAME = "Anmeldung – QR-Code für das Probetraining";
const WAPPEN = path.join(ROOT, "assets", "logo", "wappen-blau.svg");
// Liberation Sans (SIL OFL 1.1, Lizenztext in assets/fonts/): wie in der PDF-Datei des Assistenten eingebettet, damit das Blatt überall gleich aussieht.
const SCHRIFT = path.join(ROOT, "assets", "fonts", "liberation-sans-regular.ttf");
const MIN_ZEICHEN = 8; // kürzere Codes lassen sich aus dem öffentlichen Prüfwert erraten
const EMPFOHLEN_ZEICHEN = 12;
const MAX_ZEICHEN = 32; // längere Codes tippt keine Familie ab, und auf dem Blatt stünden sie nicht mehr groß und lesbar

// ---------- Hilfen ----------

export class Eingabefehler extends Error {}

// Link mit dem normalisierten Code. Der Code besteht danach aus A–Z und 0–9 (und ggf. weiteren Zeichen); encodeURIComponent schützt den Rest.
export function linkFuer(code) {
  return LINK_BASIS + "?code=" + encodeURIComponent(normalisiereCode(code));
}

// Anzeige auf dem Blatt: Gruppen zu vier Zeichen, durch Bindestriche getrennt (der Code lässt sich so abtippen).
export function anzeigeFuer(code) {
  return normalisiereCode(code).replace(/(.{4})(?=.)/g, "$1-");
}

// Liegt der Pfad im Repo, aber nicht unter tools/cache/? Symbolische Verweise zählen nicht als Ausweg:
// Maßgeblich ist der echte Pfad des tiefsten vorhandenen Ordners.
function echterPfad(p) {
  let aktuell = path.resolve(p);
  const rest = [];
  while (!fs.existsSync(aktuell)) {
    rest.unshift(path.basename(aktuell));
    const eltern = path.dirname(aktuell);
    if (eltern === aktuell) break;
    aktuell = eltern;
  }
  return path.join(fs.realpathSync(aktuell), ...rest);
}

export function pruefeZielordner(ordner) {
  if (!ordner) throw new Eingabefehler("--blatt braucht einen Ordner.");
  const ziel = echterPfad(ordner);
  const repo = fs.realpathSync(ROOT);
  const cache = path.join(repo, "tools", "cache");
  const imRepo = ziel === repo || ziel.startsWith(repo + path.sep);
  const imCache = ziel === cache || ziel.startsWith(cache + path.sep);
  if (imRepo && !imCache) {
    throw new Eingabefehler(`Der Ordner "${ordner}" liegt im Repo. Das Blatt enthält den Code und darf nicht ins Repo: Nehmen Sie einen Ordner außerhalb (zum Beispiel den Vereinsordner) oder einen unter tools/cache/.`);
  }
  return ziel;
}

export function lesePruefwerte(text) {
  const daten = JSON.parse(text);
  if (!daten || typeof daten !== "object" || !daten.zugang || !Array.isArray(daten.zugang.pruefwerte)) {
    throw new Eingabefehler('In der Datei fehlt "zugang" mit der Liste "pruefwerte".');
  }
  return daten.zugang.pruefwerte.map(String);
}

// Ersetzt nur die Liste „pruefwerte“ im Text der Datei; alles andere bleibt Zeichen für Zeichen, wie es ist. Danach prüft die Funktion,
// dass die Datei lesbar ist, die Liste stimmt und sich sonst nichts geändert hat.
export function setzePruefwerteImText(text, liste) {
  const alt = JSON.parse(text);
  lesePruefwerte(text);
  const muster = /("zugang"\s*:\s*\{[\s\S]*?"pruefwerte"\s*:\s*)\[[^\]]*\]/;
  if (!muster.test(text)) throw new Eingabefehler('"zugang › pruefwerte" lässt sich im Text der Datei nicht finden.');
  const einzug = (text.match(/\n( *)"zugang"/) || ["", "  "])[1];
  const innen = einzug + "    ";
  const neueListe = liste.length ? "[\n" + liste.map((x) => innen + JSON.stringify(x)).join(",\n") + "\n" + einzug + "  ]" : "[]";
  const neu = text.replace(muster, (_t, vor) => vor + neueListe);
  const gelesen = JSON.parse(neu);
  if (JSON.stringify(gelesen.zugang.pruefwerte) !== JSON.stringify(liste)) throw new Error("Die Liste der Prüfwerte steht nach dem Schreiben nicht wie gewollt in der Datei.");
  alt.zugang.pruefwerte = liste;
  if (JSON.stringify(alt) !== JSON.stringify(gelesen)) throw new Error("Beim Schreiben hat sich außer der Liste der Prüfwerte etwas geändert. Abgebrochen, die Datei bleibt, wie sie war.");
  return neu;
}

async function codeLesen(wert) {
  if (wert !== "-") return wert;
  const stuecke = [];
  for await (const s of process.stdin) stuecke.push(s);
  return Buffer.concat(stuecke).toString("utf8").replace(/\r?\n$/, "");
}

// ---------- QR-Code ----------

function qrMatrix(link) {
  const qr = QRCode.create(link, { errorCorrectionLevel: "M" });
  // BitMatrix.get(zeile, spalte)
  return { n: qr.modules.size, dunkel: (spalte, zeile) => Boolean(qr.modules.get(zeile, spalte)) };
}

export async function qrPng(link) {
  return QRCode.toBuffer(link, { type: "png", errorCorrectionLevel: "M", margin: 4, scale: 12, color: { dark: "#191793", light: "#FFFFFF" } });
}

// ---------- Blatt (A4) ----------

const BLAU = rgb(0x19 / 255, 0x17 / 255, 0x93 / 255); // Vereinsblau (tokens.css: --blau-800)
const TINTE = rgb(0x12 / 255, 0x14 / 255, 0x2b / 255); // --ink
const TINTE2 = rgb(0x3f / 255, 0x43 / 255, 0x60 / 255); // --ink-2
const LINIE = rgb(0xd8 / 255, 0xdb / 255, 0xea / 255); // --line

function wappenPfade() {
  const svg = fs.readFileSync(WAPPEN, "utf8");
  const box = /viewBox="([-\d.\s]+)"/.exec(svg);
  if (!box) throw new Error("Wappen: viewBox fehlt in " + WAPPEN);
  const [x0, y0, b, h] = box[1].trim().split(/\s+/).map(Number);
  const pfade = [...svg.matchAll(/<path[^>]*\sd="([^"]+)"/g)].map((m) => m[1]);
  if (!pfade.length) throw new Error("Wappen: keine Pfade in " + WAPPEN);
  return { x0, y0, b, h, pfade };
}

export async function baueBlatt(code) {
  const link = linkFuer(code);
  const anzeige = anzeigeFuer(code);
  const doc = await PDFDocument.create();
  doc.setTitle("Anmeldung nach dem Probetraining – QR-Code");
  doc.setAuthor("FFV Sportfreunde 04");
  doc.setSubject("Blatt für die Trainer");
  doc.setCreator("tools/anmeldung-zugang.mjs");
  doc.setProducer("pdf-lib");
  const seite = doc.addPage([595.28, 841.89]);
  doc.registerFontkit(fontkit);
  const normal = await doc.embedFont(fs.readFileSync(SCHRIFT), { subset: true });
  const fett = normal; // nur ein Schnitt: Titel und Code heben sich durch Größe und Vereinsblau ab
  const B = seite.getWidth();
  const rand = 56;
  const innen = B - 2 * rand;
  const mitte = (text, font, groesse) => (B - font.widthOfTextAtSize(text, groesse)) / 2;

  // Kopf: Wappen links, Vereinsname daneben, darunter eine feine Linie
  const w = wappenPfade();
  const wappenHoehe = 62;
  const massstab = wappenHoehe / w.h;
  let y = 841.89 - 50;
  for (const d of w.pfade) {
    seite.drawSvgPath(d, { x: rand - w.x0 * massstab, y: y + w.y0 * massstab, scale: massstab, color: BLAU, borderWidth: 0 });
  }
  seite.drawText("FFV Sportfreunde 04", { x: rand + w.b * massstab + 14, y: y - wappenHoehe / 2 - 6, size: 17, font: fett, color: BLAU });
  y -= wappenHoehe + 16;
  seite.drawLine({ start: { x: rand, y }, end: { x: B - rand, y }, thickness: 1, color: LINIE });

  // Titel und Zeile für die Trainer
  y -= 46;
  const titel = "Anmeldung nach dem Probetraining";
  seite.drawText(titel, { x: rand, y, size: 28, font: fett, color: BLAU });
  y -= 30;
  const zeile = "Zeigen Sie den QR-Code den Eltern oder schicken Sie ihnen den Link.";
  seite.drawText(zeile, { x: rand, y, size: 13, font: normal, color: TINTE2, maxWidth: innen });

  // Der Code in großen Zeichen: so groß wie möglich (höchstens 38 pt), nie breiter als der Satzspiegel. Reicht eine Zeile nicht für mindestens
  // 28 pt, steht er in zwei Zeilen an einer Gruppengrenze (die erste endet auf „-“); dann wird der QR-Code etwas kleiner, damit alles auf die Seite passt.
  const abstandFuer = (groesse) => groesse * 0.08; // Zeichenabstand
  const zeilenBreite = (text, groesse) => [...text].reduce((s, z) => s + fett.widthOfTextAtSize(z, groesse) + abstandFuer(groesse), -abstandFuer(groesse));
  const groessteGroesse = (zeilen) => {
    for (let g = 38; g >= 20; g--) if (zeilen.every((z) => zeilenBreite(z, g) <= innen)) return g;
    return 0;
  };
  let codeZeilen = [anzeige];
  let codeGroesse = groessteGroesse(codeZeilen);
  if (codeGroesse < 28) {
    const gruppen = anzeige.split("-");
    const h = Math.ceil(gruppen.length / 2);
    codeZeilen = [gruppen.slice(0, h).join("-") + "-", gruppen.slice(h).join("-")];
    codeGroesse = groessteGroesse(codeZeilen);
  }
  if (!codeGroesse) throw new Eingabefehler(`Der Code hat ${normalisiereCode(code).length} Zeichen und passt nicht groß genug auf das Blatt (höchstens ${MAX_ZEICHEN}).`);

  // QR-Code groß, in der Mitte, Vereinsblau auf Weiß (Ruhezone vier Module)
  const qr = qrMatrix(link);
  const ruhe = 4;
  const kante = codeZeilen.length > 1 ? 222 : 262;
  const m = kante / (qr.n + 2 * ruhe);
  const qx = (B - kante) / 2;
  y -= 40;
  const qy = y - kante;
  seite.drawRectangle({ x: qx, y: qy, width: kante, height: kante, color: rgb(1, 1, 1), borderColor: LINIE, borderWidth: 1 });
  for (let zeileNr = 0; zeileNr < qr.n; zeileNr++) {
    for (let spalte = 0; spalte < qr.n; spalte++) {
      if (!qr.dunkel(spalte, zeileNr)) continue;
      // etwas überlappend gezeichnet, damit zwischen Modulen keine hellen Linien entstehen
      seite.drawRectangle({ x: qx + (ruhe + spalte) * m, y: qy + kante - (ruhe + zeileNr + 1) * m, width: m + 0.15, height: m + 0.15, color: BLAU });
    }
  }
  y = qy - 38;

  // Code in großen Zeichen (Zeichen für Zeichen mit festem Abstand gesetzt, damit er sich abtippen lässt)
  seite.drawText("Code", { x: mitte("Code", normal, 13), y, size: 13, font: normal, color: TINTE2 });
  y -= 36;
  const abstand = abstandFuer(codeGroesse);
  codeZeilen.forEach((text, i) => {
    if (i > 0) y -= codeGroesse * 1.12;
    let cx = (B - zeilenBreite(text, codeGroesse)) / 2;
    for (const zeichen of text) {
      seite.drawText(zeichen, { x: cx, y, size: codeGroesse, font: fett, color: TINTE });
      cx += fett.widthOfTextAtSize(zeichen, codeGroesse) + abstand;
    }
  });

  // Link (in einer Zeile, sonst kleiner)
  y -= 28;
  let linkGroesse = 10.5;
  while (normal.widthOfTextAtSize(link, linkGroesse) > innen && linkGroesse > 7) linkGroesse -= 0.25;
  seite.drawText(link, { x: mitte(link, normal, linkGroesse), y, size: linkGroesse, font: normal, color: BLAU });

  // Drei Schritte für die Familie
  y -= 44;
  seite.drawText("So geht es für die Familie", { x: rand, y, size: 15, font: fett, color: BLAU });
  const schritte = ["Code scannen oder Link öffnen.", "Fragen beantworten.", "Datei per E-Mail an die Geschäftsstelle schicken."];
  schritte.forEach((text, i) => {
    y -= 30;
    seite.drawCircle({ x: rand + 11, y: y + 4.5, size: 11, color: BLAU });
    seite.drawText(String(i + 1), { x: rand + 11 - fett.widthOfTextAtSize(String(i + 1), 13) / 2, y: y, size: 13, font: fett, color: rgb(1, 1, 1) });
    seite.drawText(text, { x: rand + 32, y, size: 14, font: normal, color: TINTE });
  });

  // Fuß
  const fuss = "Auf Deutsch, Englisch, Türkisch und Arabisch.";
  seite.drawLine({ start: { x: rand, y: 74 }, end: { x: B - rand, y: 74 }, thickness: 1, color: LINIE });
  seite.drawText(fuss, { x: rand, y: 52, size: 12, font: normal, color: TINTE2 });

  return Buffer.from(await doc.save());
}

// ---------- Aufgaben ----------

function maskiert(link, zeigen) {
  return zeigen ? link : link.replace(/(\?code=).*$/, "$1***");
}

async function aufgabeCodeSetzen(o) {
  const code = normalisiereCode(await codeLesen(o.code));
  if (!code) throw new Eingabefehler("Der Code ist leer.");
  if (code.length < MIN_ZEICHEN) throw new Eingabefehler(`Der Code hat nur ${code.length} Zeichen. Der Prüfwert steht öffentlich im Repo, ein kurzer Code ließe sich daraus erraten. Nehmen Sie mindestens ${MIN_ZEICHEN}, besser ${EMPFOHLEN_ZEICHEN} Zeichen.`);
  if (code.length > MAX_ZEICHEN) throw new Eingabefehler(`Der Code hat ${code.length} Zeichen. Nehmen Sie höchstens ${MAX_ZEICHEN}: Eine Familie muss ihn abtippen können, und auf dem Blatt soll er groß und lesbar stehen.`);
  const ziel = o.blatt ? pruefeZielordner(o.blatt) : null;
  const datei = o.daten;
  const text = fs.readFileSync(datei, "utf8");
  const alt = lesePruefwerte(text);
  const neu = (await sha256Hex(code)).toLowerCase();
  const liste = o.behalten ? [...alt.filter((x) => x !== neu), neu] : [neu];
  if (!liste.every((x) => PRUEFWERT_MUSTER.test(x))) throw new Eingabefehler("In der Datei steht ein Prüfwert, der kein SHA-256 in Hexschreibweise ist. Abgebrochen.");
  const neuerText = setzePruefwerteImText(text, liste); // prüft alles, bevor etwas geschrieben wird
  const meldungen = [];
  if (code.length < EMPFOHLEN_ZEICHEN) meldungen.push(`Hinweis: Der Code hat ${code.length} Zeichen. Ab ${EMPFOHLEN_ZEICHEN} Zeichen (A–Z ohne I und O, 2–9) lässt er sich aus dem öffentlichen Prüfwert nicht erraten.`);
  if (/[IO01L]/.test(code)) meldungen.push("Hinweis: Der Code enthält Zeichen, die sich verwechseln lassen (I, O, L, 0, 1). Auf dem Blatt und am Handy ist das eine Fehlerquelle.");

  let pdfPfad = null;
  let pngPfad = null;
  if (ziel) {
    const pdf = await baueBlatt(code);
    const png = await qrPng(linkFuer(code));
    fs.mkdirSync(ziel, { recursive: true });
    pdfPfad = path.join(ziel, BLATT_NAME + ".pdf");
    pngPfad = path.join(ziel, BLATT_NAME + ".png");
    fs.writeFileSync(pdfPfad, pdf);
    fs.writeFileSync(pngPfad, png);
  }
  fs.writeFileSync(datei, neuerText, "utf8");
  console.log(`${path.relative(process.cwd(), datei) || datei}: ${liste.length} Prüfwert${liste.length === 1 ? "" : "e"} (vorher ${alt.length})${o.behalten ? ", die bisherigen bleiben gültig" : ""}.`);
  if (pdfPfad) {
    console.log("Blatt:    " + pdfPfad);
    console.log("QR-Code:  " + pngPfad);
  } else console.log('Kein Blatt erzeugt (mit --blatt <Ordner> entstehen Blatt und QR-Code).');
  console.log("Link:     " + maskiert(linkFuer(code), o.zeigen) + (o.zeigen ? "" : "  (den Code zeigt das Blatt)"));
  meldungen.forEach((m) => console.log(m));
  console.log("Nächster Schritt: bauen (sh tools/cache/bau-sperre.sh build), damit docs/ und das Paket den Prüfwert tragen.");
  return 0;
}

async function aufgabePruefen(o) {
  const code = await codeLesen(o.pruefen);
  const z = zugangAusKonfig(JSON.parse(fs.readFileSync(o.daten, "utf8")));
  if (!z.aktiv) {
    console.log("Die Liste der Prüfwerte ist leer: Es gibt keine Code-Abfrage. Ein Code wird nicht geprüft.");
    return 1;
  }
  const norm = normalisiereCode(code);
  const hash = norm ? (await sha256Hex(norm)).toLowerCase() : "";
  const passt = !!norm && z.pruefwerte.includes(hash);
  console.log(passt ? `Der Code passt zur Konfiguration (einer von ${z.pruefwerte.length} Prüfwert${z.pruefwerte.length === 1 ? "" : "en"}).` : `Der Code passt nicht zur Konfiguration (${z.pruefwerte.length} Prüfwert${z.pruefwerte.length === 1 ? "" : "e"}).`);
  return passt ? 0 : 1;
}

async function aufgabeLeeren(o) {
  const text = fs.readFileSync(o.daten, "utf8");
  const alt = lesePruefwerte(text);
  fs.writeFileSync(o.daten, setzePruefwerteImText(text, []), "utf8");
  console.log(`${path.relative(process.cwd(), o.daten) || o.daten}: Liste der Prüfwerte geleert (vorher ${alt.length}). Es gibt keine Code-Abfrage mehr.`);
  return 0;
}

const HILFE = `Zugang zum Anmelde-Assistenten (Code vom Probetraining)

  node tools/anmeldung-zugang.mjs --code <CODE> --blatt <Ordner> [--behalten]
  node tools/anmeldung-zugang.mjs --pruefen <CODE>
  node tools/anmeldung-zugang.mjs --leeren
  Weitere Angaben: --daten <Datei>, --zeigen, --code - (Code von der Standardeingabe)

Siehe den Kopf der Datei tools/anmeldung-zugang.mjs.`;

export function liesAufruf(argv) {
  const o = { daten: STANDARD_DATEN };
  const wert = (i, name) => {
    if (i + 1 >= argv.length) throw new Eingabefehler(`${name} braucht einen Wert.`);
    return argv[i + 1];
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--code") (o.code = wert(i, a)), i++;
    else if (a === "--blatt") (o.blatt = wert(i, a)), i++;
    else if (a === "--pruefen") (o.pruefen = wert(i, a)), i++;
    else if (a === "--daten") (o.daten = path.resolve(wert(i, a))), i++;
    else if (a === "--behalten") o.behalten = true;
    else if (a === "--leeren") o.leeren = true;
    else if (a === "--zeigen") o.zeigen = true;
    else if (a === "--hilfe" || a === "-h") o.hilfe = true;
    else throw new Eingabefehler(`Unbekannte Angabe: ${a}`);
  }
  return o;
}

export async function main(argv) {
  let o;
  try {
    o = liesAufruf(argv);
    const wahl = [o.code !== undefined, o.pruefen !== undefined, !!o.leeren, !!o.hilfe].filter(Boolean).length;
    if (o.hilfe || argv.length === 0) {
      console.log(HILFE);
      return argv.length === 0 ? 2 : 0;
    }
    if (wahl !== 1) throw new Eingabefehler("Genau eine Aufgabe: --code, --pruefen oder --leeren.");
    if (o.behalten && o.code === undefined) throw new Eingabefehler("--behalten gehört zu --code.");
    if (o.code !== undefined) return await aufgabeCodeSetzen(o);
    if (o.pruefen !== undefined) return await aufgabePruefen(o);
    return await aufgabeLeeren(o);
  } catch (fehler) {
    console.error((fehler instanceof Eingabefehler ? "Fehler: " : "Fehler (unerwartet): ") + fehler.message);
    return fehler instanceof Eingabefehler ? 2 : 1;
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  process.exitCode = await main(process.argv.slice(2));
}
