#!/usr/bin/env node
// Zugang zur Seite „Neu im Trainerteam“: Code für neue Trainer, Co-Trainer und Betreuer (Stufe 2, 24.11.2026).
//
// Die Seite öffnet sich nur mit einem Code (die 1. Vorsitzende gibt ihn weiter). In data/trainer.json › zugang stehen nur Prüfwerte: der
// SHA-256 (hex, klein) des normalisierten Codes. Der Code selbst steht nie im Repo. Dieses Werkzeug erzeugt oder setzt den Code, schreibt den
// Prüfwert, prüft einen Code gegen die Prüfwerte und legt Blatt (A4, PDF), QR-Code (PNG) und einen Textbaustein für die Mail an. Es folgt
// tools/anmeldung-zugang.mjs (Anmelde-Assistent) und nutzt dessen Hilfen (Normalisierung aus assets/js/anmeldung/zugang.js, Textersetzung in der
// JSON-Datei, QR-Bild, Ordnerprüfung); dessen Verhalten ändert sich nicht. Ein Unterschied: Hier heißt eine leere Liste der Prüfwerte NICHT „keine
// Code-Abfrage“, sondern „die Seite bleibt für jeden Code zu“ (und der Bau mit TRAINER_LIVE bricht ab).
//
// Aufruf
//   node tools/trainer-zugang.mjs --neu --blatt <Ordner> [--behalten] [--zeigen]
//       Erzeugt einen zufälligen Code (12 Zeichen aus A–Z ohne I, O und L sowie 2–9; Zufall aus node:crypto), schreibt den Prüfwert in
//       data/trainer.json und legt im Ordner das Blatt „Neu im Trainerteam – Zugang.pdf“ (A4, mit Wappen, großem Code und Link), den
//       QR-Code „Neu im Trainerteam – Zugang.png“ und den Textbaustein „Mail an Melli – Zugang Trainerseite.txt“ ab. Ohne --blatt und
//       ohne --zeigen verweigert --neu die Arbeit: Der Code ginge verloren (nur sein Prüfwert bliebe).
//   node tools/trainer-zugang.mjs --code <CODE> --blatt <Ordner> [--behalten]
//       Setzt einen vorgegebenen Code (Leerzeichen und Bindestriche weg, Großbuchstaben; 8 bis 32 Zeichen, empfohlen ab 12) statt eines
//       zufälligen; sonst wie --neu.
//   node tools/trainer-zugang.mjs --pruefen <CODE>
//       Sagt, ob der Code zu den Prüfwerten passt (Exit 0 ja, 1 nein oder leere Liste).
//   node tools/trainer-zugang.mjs --leeren
//       Leert die Liste der Prüfwerte: Die Seite bleibt für jeden Code zu, der Bau mit TRAINER_LIVE bricht ab.
//   node tools/trainer-zugang.mjs --hilfe
// Weitere Angaben
//   --behalten                 Die bisherigen Prüfwerte bleiben gültig (Wechsel ohne Lücke), sonst ersetzt der neue Prüfwert die Liste.
//   --daten <Datei>            statt data/trainer.json (für Tests mit einer Kopie).
//   --zeigen                   zeigt den Code im Link der Ausgabe (sonst steht dort „…?code=***“, den Code zeigen dann Blatt und Mail).
//   --code - und --pruefen -   lesen den Code von der Standardeingabe (er steht dann nicht in der Befehlszeile).
//   Die Ausgabe nennt nie den Code und den Prüfwert, außer mit --zeigen. Der Ordner für --blatt darf nicht im Repo liegen, außer unter tools/cache/.
//
// Link im QR-Code: https://cdn.appack.de/sportfreunde04/workspace/web/trainerteam.html?code=<CODE>
// Der Code im Link ist der normalisierte Code (nur A–Z und 0–9); auf dem Blatt steht er in Gruppen zu vier Zeichen.
//
// Der Klartext-Code geht in keine Datei im Repo: Blatt, Bild und Mail liegen im Ordner außerhalb des Repos (oder unter tools/cache/), und
// data/trainer.json bekommt nur den Prüfwert. Nur vorhandene Pakete: qrcode, pdf-lib und fontkit (devDependencies).

import fs from "node:fs";
import path from "node:path";
import { randomInt } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import QRCode from "qrcode";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { normalisiereCode, sha256Hex, zugangAusKonfig, PRUEFWERT_MUSTER } from "../assets/js/anmeldung/zugang.js";
import { Eingabefehler, anzeigeFuer, pruefeZielordner, lesePruefwerte, setzePruefwerteImText, qrPng } from "./anmeldung-zugang.mjs";

export { Eingabefehler, anzeigeFuer, lesePruefwerte, setzePruefwerteImText, qrPng };

const HIER = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HIER, "..");
export const STANDARD_DATEN = path.join(ROOT, "data", "trainer.json");
export const LINK_BASIS = "https://cdn.appack.de/sportfreunde04/workspace/web/trainerteam.html";
export const BLATT_NAME = "Neu im Trainerteam – Zugang";
export const MAIL_NAME = "Mail an Melli – Zugang Trainerseite.txt";
const WAPPEN = path.join(ROOT, "assets", "logo", "wappen-blau.svg");
// Liberation Sans (SIL OFL 1.1, Lizenztext in assets/fonts/): wie in den PDF-Dateien der Seiten eingebettet, damit das Blatt überall gleich aussieht.
const SCHRIFT = path.join(ROOT, "assets", "fonts", "liberation-sans-regular.ttf");
export const MIN_ZEICHEN = 8; // kürzere Codes lassen sich aus dem öffentlichen Prüfwert erraten
export const EMPFOHLEN_ZEICHEN = 12;
export const MAX_ZEICHEN = 32; // längere Codes tippt keiner ab, und auf dem Blatt stünden sie nicht mehr groß und lesbar
// Zeichen eines neuen Codes: A–Z ohne I, O und L, dazu 2–9 (ohne 0 und 1): nichts, was sich auf dem Blatt oder am Handy verwechseln lässt.
export const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

// ---------- Hilfen ----------

// Link mit dem normalisierten Code. Der Code besteht danach aus A–Z und 0–9 (und ggf. weiteren Zeichen); encodeURIComponent schützt den Rest.
export function linkFuer(code) {
  return LINK_BASIS + "?code=" + encodeURIComponent(normalisiereCode(code));
}

// Ein zufälliger Code aus ALPHABET (gleichverteilt: node:crypto randomInt, kein Modulo-Rest).
export function neuerCode(laenge = EMPFOHLEN_ZEICHEN) {
  let code = "";
  for (let i = 0; i < laenge; i++) code += ALPHABET[randomInt(ALPHABET.length)];
  return code;
}

// Liest die Datei mit den Prüfwerten; eine fehlende oder kaputte Datei ist ein Fehler der Eingabe (Exit 2), kein unerwarteter.
function liesDatei(datei) {
  let text;
  try {
    text = fs.readFileSync(datei, "utf8");
  } catch (fehler) {
    throw new Eingabefehler(`Die Datei ${datei} lässt sich nicht lesen (${fehler.code ?? fehler.message}).`);
  }
  try {
    JSON.parse(text);
  } catch {
    throw new Eingabefehler(`Die Datei ${datei} ist kein gültiges JSON.`);
  }
  return text;
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

// ---------- Blatt (A4) ----------

const BLAU = rgb(0x19 / 255, 0x17 / 255, 0x93 / 255); // Vereinsblau (tokens.css: --blau-800)
const TINTE = rgb(0x12 / 255, 0x14 / 255, 0x2b / 255); // --ink
const TINTE2 = rgb(0x3f / 255, 0x43 / 255, 0x60 / 255); // --ink-2
const LINIE = rgb(0xd8 / 255, 0xdb / 255, 0xea / 255); // --line

// wie tools/anmeldung-zugang.mjs › wappenPfade (dort nicht exportiert)
function wappenPfade() {
  const svg = fs.readFileSync(WAPPEN, "utf8");
  const box = /viewBox="([-\d.\s]+)"/.exec(svg);
  if (!box) throw new Error("Wappen: viewBox fehlt in " + WAPPEN);
  const [x0, y0, b, h] = box[1].trim().split(/\s+/).map(Number);
  const pfade = [...svg.matchAll(/<path[^>]*\sd="([^"]+)"/g)].map((m) => m[1]);
  if (!pfade.length) throw new Error("Wappen: keine Pfade in " + WAPPEN);
  return { x0, y0, b, h, pfade };
}

// Texte des Blattes (alle auf einen Blick; keine Namen von Personen, damit das Blatt auch nach einem Wechsel der Einsichtnehmenden stimmt)
export const BLATT_TEXTE = {
  titel: "Neu im Trainerteam",
  zeile: "Zugang für neue Trainer, Co-Trainer und Betreuer. Bitte nur an sie weitergeben.",
  schritteTitel: "So geht es",
  schritte: ["Code scannen oder Link öffnen.", "Angaben machen und am Bildschirm unterschreiben.", "Dateien per E-Mail an die Geschäftsstelle schicken."],
  fuss: "Das Führungszeugnis wird nie hochgeladen oder gemailt. Es wird persönlich gezeigt.",
};

export async function baueBlatt(code) {
  const link = linkFuer(code);
  const anzeige = anzeigeFuer(code);
  const doc = await PDFDocument.create();
  doc.setTitle("Neu im Trainerteam – Zugang");
  doc.setAuthor("FFV Sportfreunde 04");
  doc.setSubject("Blatt mit Code und QR-Code");
  doc.setCreator("tools/trainer-zugang.mjs");
  doc.setProducer("pdf-lib");
  const seite = doc.addPage([595.28, 841.89]);
  doc.registerFontkit(fontkit);
  const normal = await doc.embedFont(fs.readFileSync(SCHRIFT), { subset: true });
  const fett = normal; // nur ein Schnitt: Titel und Code heben sich durch Größe und Vereinsblau ab
  const B = seite.getWidth();
  const rand = 56;
  const innen = B - 2 * rand;
  const mitte = (text, font, groesse) => (B - font.widthOfTextAtSize(text, groesse)) / 2;
  // Text, der bei zu großer Schrift schrumpft, bis er in die Breite passt (nie unter 8 pt)
  const passend = (text, font, groesse, breite) => {
    let g = groesse;
    while (font.widthOfTextAtSize(text, g) > breite && g > 8) g -= 0.25;
    return g;
  };

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

  // Titel und Zeile für die Weitergabe
  y -= 46;
  seite.drawText(BLATT_TEXTE.titel, { x: rand, y, size: 28, font: fett, color: BLAU });
  y -= 30;
  seite.drawText(BLATT_TEXTE.zeile, { x: rand, y, size: passend(BLATT_TEXTE.zeile, normal, 13, innen), font: normal, color: TINTE2 });

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

  // Drei Schritte
  y -= 44;
  seite.drawText(BLATT_TEXTE.schritteTitel, { x: rand, y, size: 15, font: fett, color: BLAU });
  BLATT_TEXTE.schritte.forEach((text, i) => {
    y -= 30;
    seite.drawCircle({ x: rand + 11, y: y + 4.5, size: 11, color: BLAU });
    seite.drawText(String(i + 1), { x: rand + 11 - fett.widthOfTextAtSize(String(i + 1), 13) / 2, y: y, size: 13, font: fett, color: rgb(1, 1, 1) });
    seite.drawText(text, { x: rand + 32, y, size: passend(text, normal, 14, innen - 32), font: normal, color: TINTE });
  });

  // Fuß
  seite.drawLine({ start: { x: rand, y: 74 }, end: { x: B - rand, y: 74 }, thickness: 1, color: LINIE });
  seite.drawText(BLATT_TEXTE.fuss, { x: rand, y: 52, size: passend(BLATT_TEXTE.fuss, normal, 12, innen), font: normal, color: TINTE2 });

  return Buffer.from(await doc.save());
}

// ---------- Textbaustein für die Mail ----------

// Kurzer Baustein für die Mail an die 1. Vorsitzende (ohne Anrede und Gruß, der Absender setzt sie selbst): der Link mit dem Code und drei Sätze (Zweck,
// Weitergabe, Wechsel des Codes). Der Link enthält den Code; die Datei liegt nur im Ordner außerhalb des Repos.
export function mailText(code) {
  return `Betreff: Zugang zur Seite „Neu im Trainerteam“

${linkFuer(code)}

Das ist der Zugang zur Seite „Neu im Trainerteam“: Neue Trainer, Co-Trainer und Betreuer erledigen darauf alle Unterlagen am Handy und schicken die fertigen Dateien selbst per E-Mail an die Geschäftsstelle; die Seite sendet und speichert nichts.
Der Code steckt im Link und gilt wie ein Passwort: Bitte gib den Link nur an neue Trainer und Betreuer weiter, nicht in Gruppen und nicht öffentlich.
Kommt der Link in falsche Hände, sag mir Bescheid, dann tausche ich den Code aus.
`;
}

// ---------- Aufgaben ----------

function maskiert(link, zeigen) {
  return zeigen ? link : link.replace(/(\?code=).*$/, "$1***");
}

async function aufgabeCodeSetzen(o) {
  let code;
  if (o.neu) {
    // Ohne Blatt und ohne --zeigen ginge der Code verloren: Nur sein Prüfwert bliebe in der Datei, und der Code ließe sich daraus nicht zurückholen.
    if (!o.blatt && !o.zeigen) throw new Eingabefehler("--neu braucht --blatt <Ordner> (dort liegen Blatt, QR-Code und Mail mit dem Code) oder --zeigen: Sonst ginge der neue Code verloren.");
    code = neuerCode(EMPFOHLEN_ZEICHEN);
  } else {
    code = normalisiereCode(await codeLesen(o.code));
    if (!code) throw new Eingabefehler("Der Code ist leer.");
    if (code.length < MIN_ZEICHEN) throw new Eingabefehler(`Der Code hat nur ${code.length} Zeichen. Der Prüfwert steht öffentlich im Repo, ein kurzer Code ließe sich daraus erraten. Nehmen Sie mindestens ${MIN_ZEICHEN}, besser ${EMPFOHLEN_ZEICHEN} Zeichen.`);
    if (code.length > MAX_ZEICHEN) throw new Eingabefehler(`Der Code hat ${code.length} Zeichen. Nehmen Sie höchstens ${MAX_ZEICHEN}: Er muss sich abtippen lassen, und auf dem Blatt soll er groß und lesbar stehen.`);
  }
  const ziel = o.blatt ? pruefeZielordner(o.blatt) : null;
  const datei = o.daten;
  const text = liesDatei(datei);
  const alt = lesePruefwerte(text);
  const neu = (await sha256Hex(code)).toLowerCase();
  const liste = o.behalten ? [...alt.filter((x) => x !== neu), neu] : [neu];
  if (!liste.every((x) => PRUEFWERT_MUSTER.test(x))) throw new Eingabefehler("In der Datei steht ein Prüfwert, der kein SHA-256 in Hexschreibweise ist. Abgebrochen.");
  const neuerText = setzePruefwerteImText(text, liste); // prüft alles, bevor etwas geschrieben wird
  const meldungen = [];
  if (!o.neu && code.length < EMPFOHLEN_ZEICHEN) meldungen.push(`Hinweis: Der Code hat ${code.length} Zeichen. Ab ${EMPFOHLEN_ZEICHEN} Zeichen (A–Z ohne I, O und L, 2–9) lässt er sich aus dem öffentlichen Prüfwert nicht erraten.`);
  if (!o.neu && /[IO01L]/.test(code)) meldungen.push("Hinweis: Der Code enthält Zeichen, die sich verwechseln lassen (I, O, L, 0, 1). Auf dem Blatt und am Handy ist das eine Fehlerquelle.");

  // Erst alles erzeugen, dann schreiben: Scheitert das Blatt, bleibt die Datei, wie sie war.
  let pdfPfad = null;
  let pngPfad = null;
  let mailPfad = null;
  if (ziel) {
    const pdf = await baueBlatt(code);
    const png = await qrPng(linkFuer(code));
    fs.mkdirSync(ziel, { recursive: true });
    pdfPfad = path.join(ziel, BLATT_NAME + ".pdf");
    pngPfad = path.join(ziel, BLATT_NAME + ".png");
    mailPfad = path.join(ziel, MAIL_NAME);
    fs.writeFileSync(pdfPfad, pdf);
    fs.writeFileSync(pngPfad, png);
    fs.writeFileSync(mailPfad, mailText(code), "utf8");
  }
  fs.writeFileSync(datei, neuerText, "utf8");
  console.log(`${path.relative(process.cwd(), datei) || datei}: ${liste.length} Prüfwert${liste.length === 1 ? "" : "e"} (vorher ${alt.length})${o.behalten ? ", die bisherigen bleiben gültig" : ""}.`);
  if (pdfPfad) {
    console.log("Blatt:    " + pdfPfad);
    console.log("QR-Code:  " + pngPfad);
    console.log("Mail:     " + mailPfad);
  } else console.log("Kein Blatt erzeugt (mit --blatt <Ordner> entstehen Blatt, QR-Code und Mail).");
  console.log("Link:     " + maskiert(linkFuer(code), o.zeigen) + (o.zeigen ? "" : "  (den Code zeigen Blatt und Mail)"));
  meldungen.forEach((m) => console.log(m));
  console.log("Nächster Schritt: bauen mit dem Schalter TRAINER_LIVE (src/vorlagen/hilfen.mjs), damit docs/ und das Paket den Prüfwert tragen.");
  return 0;
}

async function aufgabePruefen(o) {
  const code = await codeLesen(o.pruefen);
  const z = zugangAusKonfig(JSON.parse(liesDatei(o.daten)));
  if (!z.aktiv) {
    console.log("Die Liste der Prüfwerte ist leer: Die Seite bleibt für jeden Code zu. Ein Code wird nicht geprüft.");
    return 1;
  }
  const norm = normalisiereCode(code);
  const hash = norm ? (await sha256Hex(norm)).toLowerCase() : "";
  const passt = !!norm && z.pruefwerte.includes(hash);
  console.log(passt ? `Der Code passt zur Konfiguration (einer von ${z.pruefwerte.length} Prüfwert${z.pruefwerte.length === 1 ? "" : "en"}).` : `Der Code passt nicht zur Konfiguration (${z.pruefwerte.length} Prüfwert${z.pruefwerte.length === 1 ? "" : "e"}).`);
  return passt ? 0 : 1;
}

async function aufgabeLeeren(o) {
  const text = liesDatei(o.daten);
  const alt = lesePruefwerte(text);
  fs.writeFileSync(o.daten, setzePruefwerteImText(text, []), "utf8");
  console.log(`${path.relative(process.cwd(), o.daten) || o.daten}: Liste der Prüfwerte geleert (vorher ${alt.length}). Die Seite bleibt für jeden Code zu, der Bau mit TRAINER_LIVE bricht ab.`);
  return 0;
}

export const HILFE = `Zugang zur Seite „Neu im Trainerteam“ (Code für neue Trainer und Betreuer)

  node tools/trainer-zugang.mjs --neu --blatt <Ordner> [--behalten]
  node tools/trainer-zugang.mjs --code <CODE> --blatt <Ordner> [--behalten]
  node tools/trainer-zugang.mjs --pruefen <CODE>
  node tools/trainer-zugang.mjs --leeren
  Weitere Angaben: --daten <Datei>, --zeigen, --code - (Code von der Standardeingabe)

Siehe den Kopf der Datei tools/trainer-zugang.mjs.`;

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
    else if (a === "--neu") o.neu = true;
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
    const wahl = [o.neu === true, o.code !== undefined, o.pruefen !== undefined, !!o.leeren, !!o.hilfe].filter(Boolean).length;
    if (o.hilfe || argv.length === 0) {
      console.log(HILFE);
      return argv.length === 0 ? 2 : 0;
    }
    if (wahl !== 1) throw new Eingabefehler("Genau eine Aufgabe: --neu, --code, --pruefen oder --leeren.");
    if (o.behalten && !o.neu && o.code === undefined) throw new Eingabefehler("--behalten gehört zu --neu oder --code.");
    if (o.neu || o.code !== undefined) return await aufgabeCodeSetzen(o);
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
