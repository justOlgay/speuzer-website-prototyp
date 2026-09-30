// Tests des PDF-Bausteins des Anmelde-Assistenten (Paket AP-3): assets/js/anmeldung/pdf.js
// Aufruf: node tools/anmeldung-test/pdf-test.mjs   (Exit-Code 0 bei Erfolg, sonst 1)
//
// Für jedes Profil aus profile.mjs entstehen PDFs (mit Bildschirm-Unterschriften, Nachweisen und Foto; ganz auf
// Papier; teils ohne Unterschriftsbilder). Sie werden nach tools/cache/anmeldung-test/pdf/ geschrieben und geprüft:
//  - Aufbau: Teile A/B/C in richtiger Reihenfolge, Seitenzahlen, Kopf und Fuß, enthaltene Vordrucke gegen e.formulare
//  - Inhalt: Pflichtwerte als Text, Laufzettel (Fälle, Unterlagen, Status, Frist, IBAN nur maskiert), Teil A
//  - Vordrucke: HFV-Antrag, Vollmacht, Abmeldung, Einverständnis und Aufnahmeantrag Feld für Feld gegen die Antworten
//    (Text mit Koordinaten aus dem fertigen PDF, Kästchen durch Rendern)
//  - Unterschriften: Regel aus SCHNITTSTELLEN Abschnitt 7 und PLAN Annahme A1 (Bild oder blaue Markierung), Ort und Datum
//  - Nachweise: Wasserzeichen auf jeder Seite, Ersatzseiten, Attest-Kopie nur in Teil C
//  - Metadaten, Farben (kein Rot auf eigenen Seiten), Größe, Wiederholbarkeit, Browser-Tauglichkeit des Quelltexts
//  - Sonderfälle: Sonderzeichen und arabische Schrift im Namen, fehlende Angaben, zu lange Werte, andere Sprache
//  - Runde 2: jede eigene Seite mit Unterschriftsbereich trägt Bild oder Markierung, ein Rückfall (Stelle fehlt in den Regeln)
//    kommt nie vor und wird bei Absicht gemeldet; einheitliche Namen der eigenen Seiten (SCHNITTSTELLEN Abschnitt 9);
//    mehrere mögliche Mannschaften; Name der zweiten Person mit Sorgerecht; Karneval-Abholung; Notfallbogen in drei
//    Fassungen mit Absprache zur Medikamentengabe; unter einer Bildschirm-Unterschrift steht kein leeres Feld
//    (Szenarien: mit und ohne Angaben, Bildschirm und Papier; Nachweise wie in der Oberfläche: „habe“ nur mit Datei)
//  - Runde 3: Erlaubnis für das Attest je nach Art von U10 („pflicht“ oder „offen“); Information zum Datenschutz (Nr. 2, 4, 5 und 8,
//    Tabelle Zeile für Zeile mit Spalten); Einwilligungssatz der Absprache zur Medikamentengabe über den Stift-Zeilen;
//    Satzung nicht bestätigt (Stift-Stelle auf Seite 2 des Aufnahmeantrags, Grund „Satzung nicht bestätigt“ im Laufzettel);
//    neue Sätze der Familientexte mit höchstens 12 Wörtern
//  - Runde 4: Attest-Sätze in drei Fassungen je Art von U10 („pflicht“, „offen“, „verein“): Erlaubnis für das Attest, Hinweis für die Praxis auf
//    der Attest-Vorlage, Information zum Datenschutz Nr. 5 und 8; bei „offen“ und „verein“ steht auf den eigenen Seiten nirgends „der Verband
//    verlangt das Attest“ (Satzsuche); Attest-Vorlage bei „offen“ in allen Profilen (Attest „habe“, aber ohne Datei)
// Aufruf-Optionen: --profil=a,b (nur diese Profile)  --ohne-sonderfaelle  --szenarien (Szenarien auch bei --profil)
// Werkzeuge: pdf-lib und fontkit aus node_modules, dazu poppler (pdftotext, pdfinfo, pdfimages, pdftoppm).
// Testbilder: tools/anmeldung-test/testbilder/ (künstliche Muster, keine echten Dokumente; fehlende Dateien
// erzeugt der Test, soweit möglich, selbst).

import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import * as PDFLib from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { PROFILE, ladeKonfig, profil } from "./profile.mjs";
import { auswerten } from "../../assets/js/anmeldung/regeln.js";
import deRegeln from "../../assets/js/anmeldung/texte/de-regeln.js";
import { erzeugePdf, benoetigteVorlagen, dateiname, TEXTE_TEIL_A } from "../../assets/js/anmeldung/pdf.js";

const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const TESTBILDER = path.join(WURZEL, "tools", "anmeldung-test", "testbilder");
const AUSGABE = path.join(WURZEL, "tools", "cache", "anmeldung-test", "pdf");
const RENDER = path.join(AUSGABE, "bilder");
const RENDER_PROFILE = ["kind-neu-deutsch-f", "vollmacht-und-kuendigung", "kind-neu-nichtdeutsch-12", "karneval-kind-abend"];
const ARGUMENTE = process.argv.slice(2);
const NUR_PROFILE = (ARGUMENTE.find((x) => x.startsWith("--profil=")) || "").replace("--profil=", "").split(",").filter(Boolean);
const OHNE_SONDERFAELLE = ARGUMENTE.includes("--ohne-sonderfaelle");
const MIT_SZENARIEN = ARGUMENTE.includes("--szenarien") || (!NUR_PROFILE.length && !OHNE_SONDERFAELLE);
const konfig = ladeKonfig();
const SCHRIFT = new Uint8Array(readFileSync(path.join(WURZEL, "assets", "fonts", "liberation-sans-regular.ttf")));

// ---------------------------------------------------------------------------------------------
// Prüf-Werkzeuge
// ---------------------------------------------------------------------------------------------
let anzahl = 0;
const fehler = [];
let kontext = "";

function ok(bedingung, meldung) {
  anzahl += 1;
  if (!bedingung) fehler.push((kontext ? "[" + kontext + "] " : "") + (typeof meldung === "function" ? meldung() : meldung));
  return Boolean(bedingung);
}
function gleich(ist, soll, meldung) {
  return ok(JSON.stringify(ist) === JSON.stringify(soll), meldung + " – ist " + JSON.stringify(ist) + ", soll " + JSON.stringify(soll));
}
const norm = (s) => String(s).replace(/\s+/g, " ").trim();
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const zaehle = (text, re) => (text.match(re) || []).length;
const tief = (x) => JSON.parse(JSON.stringify(x));

function sh(befehl, argumente, optionen) {
  const r = spawnSync(befehl, argumente, Object.assign({ encoding: "utf8", maxBuffer: 256 * 1024 * 1024 }, optionen || {}));
  if (r.error) throw new Error(befehl + ": " + r.error.message);
  return r;
}

// ---------------------------------------------------------------------------------------------
// poppler-Werkzeuge
// ---------------------------------------------------------------------------------------------
function textSeiten(pfad) {
  const r = sh("pdftotext", ["-layout", pfad, "-"]);
  const teile = r.stdout.split("\f");
  if (teile.length && teile[teile.length - 1].trim() === "") teile.pop();
  return teile.map((t) => norm(t.replace(/_+/g, " ")));
}

// Zeilen einer Seite im Layout des PDFs (Spalten durch mehrere Leerzeichen getrennt)
function zeilenSeite(pfad, seite) {
  const r = sh("pdftotext", ["-layout", "-f", String(seite), "-l", String(seite), pfad, "-"]);
  return r.stdout.split("\n").map((z) => z.replace(/_+/g, " ").replace(/\s+$/, ""));
}
// Werte (Spalten) der nächsten nicht leeren Zeile über der Zeile, in der `label` steht
function wertUeberLabel(pfad, seite, label) {
  const z = zeilenSeite(pfad, seite);
  const i = z.findIndex((l) => l.includes(label));
  if (i < 0) return null;
  let k = i - 1;
  while (k >= 0 && !z[k].trim()) k -= 1;
  return k < 0 ? [] : z[k].trim().split(/\s{3,}/).map((s) => s.trim()).filter(Boolean);
}

function pdfinfoDaten(pfad) {
  const r = sh("pdfinfo", [pfad]);
  const o = {};
  r.stdout.split("\n").forEach((z) => {
    const i = z.indexOf(":");
    if (i > 0) o[z.slice(0, i).trim()] = z.slice(i + 1).trim();
  });
  return o;
}

// Anzahl gezeichneter Bilder (ohne Masken) je Seite
function bilderJeSeite(pfad) {
  const r = sh("pdfimages", ["-list", pfad]);
  const je = {};
  r.stdout.split("\n").slice(2).forEach((z) => {
    const t = z.trim().split(/\s+/);
    if (t.length > 3 && /^\d+$/.test(t[0]) && t[2] === "image") je[Number(t[0])] = (je[Number(t[0])] || 0) + 1;
  });
  return je;
}

// Wörter mit Koordinaten (PDF-Punkte, Ursprung unten links) einer Seite
function woerterSeite(pfad, seite) {
  const r = sh("pdftotext", ["-bbox", "-f", String(seite), "-l", String(seite), pfad, "-"]);
  const m = /<page width="([\d.]+)" height="([\d.]+)">/.exec(r.stdout);
  const h = m ? Number(m[2]) : 842;
  const woerter = [];
  const re = /<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)<\/word>/g;
  let x;
  while ((x = re.exec(r.stdout)) !== null) {
    woerter.push({ x0: Number(x[1]), x1: Number(x[3]), y0: h - Number(x[4]), y1: h - Number(x[2]), t: x[5].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'") });
  }
  return woerter;
}

// Freistehende „–“ als Wert einer Zelle oder eines Feldes: kein Wort direkt links oder rechts auf derselben Zeile
// (Gedankenstriche in Sätzen, Untertiteln und Markierungen zählen nicht); ohne Kopf- und Fußzeile
function einzelStriche(woerter) {
  return woerter.filter((w) => {
    if (w.t !== "–" || w.y0 <= 60 || w.y1 >= 800) return false;
    return !woerter.some((v) => v !== w && Math.abs(v.y0 - w.y0) < 2.5 && (Math.abs(v.x0 - w.x1) < 9 || Math.abs(w.x0 - v.x1) < 9));
  });
}

// Text im Rechteck [x, y, breite, hoehe] (Mitte des Wortes liegt darin), von links nach rechts
function textImRechteck(woerter, rect, spiel) {
  const s = spiel === undefined ? 2 : spiel;
  const [x, y, b, h] = rect;
  return woerter
    .filter((w) => !/^_/.test(w.t))
    .filter((w) => (w.x0 + w.x1) / 2 >= x - s && (w.x0 + w.x1) / 2 <= x + b + s && (w.y0 + w.y1) / 2 >= y - s && (w.y0 + w.y1) / 2 <= y + h + s)
    .sort((p, q) => p.x0 - q.x0)
    .map((w) => w.t)
    .join(" ")
    .replace(/_+/g, " ")
    .replace(/^[\s,.]+/, "")
    .trim();
}

// Graustufen-Rendering einer Seite (P5) und Anteil dunkler Pixel in einem Rechteck der Seite (PDF-Punkte)
function renderGrau(pfad, seite, dpi) {
  const ziel = path.join(AUSGABE, "_grau");
  const r = sh("pdftoppm", ["-gray", "-r", String(dpi), "-f", String(seite), "-l", String(seite), "-singlefile", pfad, ziel], { encoding: "buffer" });
  if (r.status !== 0) throw new Error("pdftoppm: " + String(r.stderr));
  const d = readFileSync(ziel + ".pgm");
  let pos = 0;
  const token = () => {
    while (d[pos] === 0x20 || d[pos] === 0x0a || d[pos] === 0x0d || d[pos] === 0x09) pos += 1;
    let t = "";
    while (pos < d.length && d[pos] !== 0x20 && d[pos] !== 0x0a && d[pos] !== 0x0d && d[pos] !== 0x09) t += String.fromCharCode(d[pos++]);
    return t;
  };
  token();
  const b = Number(token());
  const h = Number(token());
  token();
  pos += 1;
  return { b: b, h: h, dpi: dpi, px: d.subarray(pos) };
}
function dunkelAnteil(bild, rect, schrumpf) {
  const f = bild.dpi / 72;
  const sc = schrumpf === undefined ? 0.22 : schrumpf;
  const x = rect[0] + rect[2] * sc;
  const y = rect[1] + rect[3] * sc;
  const b = rect[2] * (1 - 2 * sc);
  const h = rect[3] * (1 - 2 * sc);
  const seitenH = bild.h / f;
  const x0 = Math.max(0, Math.floor(x * f));
  const x1 = Math.min(bild.b, Math.ceil((x + b) * f));
  const y0 = Math.max(0, Math.floor((seitenH - (y + h)) * f));
  const y1 = Math.min(bild.h, Math.ceil((seitenH - y) * f));
  let dunkel = 0;
  let n = 0;
  for (let r = y0; r < y1; r++) for (let c = x0; c < x1; c++) {
    n += 1;
    if (bild.px[r * bild.b + c] < 140) dunkel += 1;
  }
  return n ? dunkel / n : 0;
}

// Seiteninhalt (entschlüsselt) einer Seite des fertigen PDFs, mit pdf-lib gelesen
function inhaltSeite(doc, index) {
  const seite = doc.getPage(index);
  const c = seite.node.Contents();
  const teile = c instanceof PDFLib.PDFArray ? c.asArray().map((r) => doc.context.lookup(r)) : c ? [c] : [];
  return teile
    .map((s) => {
      try {
        return Buffer.from(PDFLib.decodePDFRawStream(s).decode()).toString("latin1");
      } catch (e) {
        return "";
      }
    })
    .join("\n");
}

// ---------------------------------------------------------------------------------------------
// Testbilder
// ---------------------------------------------------------------------------------------------
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function pngChunk(typ, daten) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(daten.length);
  const t = Buffer.from(typ, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, daten])));
  return Buffer.concat([len, t, daten, crc]);
}
// Mini-PNG-Encoder (RGBA, 8 Bit): keine neuen Pakete nötig
function pngKodieren(b, h, rgba) {
  const roh = Buffer.alloc((b * 4 + 1) * h);
  for (let y = 0; y < h; y++) Buffer.from(rgba.buffer, rgba.byteOffset + y * b * 4, b * 4).copy(roh, y * (b * 4 + 1) + 1);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(b, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return new Uint8Array(Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), pngChunk("IHDR", ihdr), pngChunk("IDAT", zlib.deflateSync(roh, { level: 9 })), pngChunk("IEND", Buffer.alloc(0))]));
}
// Unterschrift: geschwungene Linie in Kugelschreiberblau auf transparentem Grund (Startwert bestimmt die Form)
function unterschriftPng(startwert) {
  const b = 320;
  const h = 110;
  const px = new Uint8Array(b * h * 4);
  const punkt = (x, y, r) => {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r * r) continue;
      const xx = Math.round(x + dx);
      const yy = Math.round(y + dy);
      if (xx < 0 || yy < 0 || xx >= b || yy >= h) continue;
      const i = (yy * b + xx) * 4;
      px[i] = 0x1b;
      px[i + 1] = 0x2a;
      px[i + 2] = 0x80;
      px[i + 3] = 255;
    }
  };
  let s = startwert;
  const zufall = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  const phase = zufall() * 6;
  const amp = 20 + zufall() * 12;
  for (let t = 0; t <= 1; t += 0.0015) punkt(8 + t * (b - 16), h / 2 + Math.sin(t * 14 + phase) * amp * (1 - 0.5 * t) + Math.sin(t * 5) * 14, 2);
  for (let t = 0; t <= 1; t += 0.003) punkt(10 + t * 200, h - 22 + Math.sin(t * 9) * 3 - t * 10, 1);
  return { bytes: pngKodieren(b, h, px), breitePx: b * 0.75, hoehePx: h * 0.75 };
}

async function musterPdf(seiten, drehung) {
  const doc = await PDFLib.PDFDocument.create();
  doc.registerFontkit(fontkit);
  const f = await doc.embedFont(SCHRIFT, { subset: true });
  for (let i = 0; i < seiten; i++) {
    const p = doc.addPage(drehung ? [842, 595] : [595, 842]);
    p.drawText("MUSTER Nachweis – Seite " + (i + 1), { x: 72, y: p.getHeight() - 100, size: 20, font: f });
    p.drawRectangle({ x: 72, y: p.getHeight() - 300, width: 450, height: 170, borderColor: PDFLib.rgb(0.2, 0.2, 0.4), borderWidth: 1 });
    for (let k = 0; k < 8; k++) p.drawText("Zeile " + (k + 1) + " – erfundener Inhalt, keine echten Daten", { x: 80, y: p.getHeight() - 160 - k * 16, size: 10, font: f });
    if (drehung) p.setRotation(PDFLib.degrees(90));
  }
  return new Uint8Array(await doc.save());
}

const TESTDATEIEN = {};
async function ladeTestbilder() {
  mkdirSync(TESTBILDER, { recursive: true });
  const vorhanden = (n) => existsSync(path.join(TESTBILDER, n));
  const lies = (n) => new Uint8Array(readFileSync(path.join(TESTBILDER, n)));
  const schreibe = (n, daten) => writeFileSync(path.join(TESTBILDER, n), daten);
  for (let i = 1; i <= 4; i++) {
    const n = "unterschrift-" + i + ".png";
    if (!vorhanden(n)) schreibe(n, unterschriftPng(i * 3 + 2).bytes);
    const sig = unterschriftPng(i * 3 + 2);
    TESTDATEIEN["sig" + i] = { bytes: lies(n), breitePx: sig.breitePx, hoehePx: sig.hoehePx };
  }
  if (!vorhanden("muster-2seiten.pdf")) schreibe("muster-2seiten.pdf", await musterPdf(2, false));
  if (!vorhanden("muster-gedreht.pdf")) schreibe("muster-gedreht.pdf", await musterPdf(1, true));
  if (!vorhanden("kaputt.pdf")) schreibe("kaputt.pdf", Buffer.from("%PDF-1.4\nkein gültiges Dokument\n"));
  if (!vorhanden("kaputt.jpg")) schreibe("kaputt.jpg", Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]), Buffer.from("JFIF-kaputt-kaputt-kaputt")]));
  for (const n of ["nachweis-hoch.png", "nachweis-quer.jpg", "foto-3x4.jpg", "verschluesselt.pdf"]) {
    if (!vorhanden(n)) throw new Error("Testbild fehlt: tools/anmeldung-test/testbilder/" + n + " (künstliches Muster, siehe Kopf dieser Datei)");
  }
  TESTDATEIEN.hoch = { bytes: lies("nachweis-hoch.png"), typ: "image/png" };
  TESTDATEIEN.quer = { bytes: lies("nachweis-quer.jpg"), typ: "image/jpeg" };
  TESTDATEIEN.foto = { bytes: lies("foto-3x4.jpg"), typ: "image/jpeg" };
  TESTDATEIEN.zweiSeiten = { bytes: lies("muster-2seiten.pdf"), typ: "application/pdf" };
  TESTDATEIEN.gedreht = { bytes: lies("muster-gedreht.pdf"), typ: "application/pdf" };
  TESTDATEIEN.verschluesselt = { bytes: lies("verschluesselt.pdf"), typ: "application/pdf" };
  TESTDATEIEN.kaputtPdf = { bytes: lies("kaputt.pdf"), typ: "application/pdf" };
  TESTDATEIEN.kaputtJpg = { bytes: lies("kaputt.jpg"), typ: "image/jpeg" };
}

// Dateien für einen Nachweis: Art wechselt nach Nummer, die Attest-Kopie ist ein Foto im Querformat
function nachweisDateien(id) {
  const n = Number(id.slice(1));
  const d = (x, name) => ({ bytes: x.bytes, typ: x.typ, name: name });
  if (id === "U10") return [d(TESTDATEIEN.quer, "attest.jpg")];
  if (n % 3 === 0) return [d(TESTDATEIEN.hoch, "nachweis.png")];
  if (n % 3 === 1) return [d(TESTDATEIEN.quer, "nachweis.jpg"), d(TESTDATEIEN.hoch, "rueckseite.png")];
  return [d(TESTDATEIEN.zweiSeiten, "nachweis.pdf")];
}
function erwarteteNachweisSeiten(id) {
  const n = Number(id.slice(1));
  if (id === "U10") return 1;
  if (n % 3 === 0) return 1;
  if (n % 3 === 1) return 2;
  return 2;
}

// ---------------------------------------------------------------------------------------------
// Erzeugen
// ---------------------------------------------------------------------------------------------
const vorlagenCache = {};
function vorlagenFuer(e, a) {
  const v = {};
  for (const k of benoetigteVorlagen(e, a)) {
    if (!vorlagenCache[k]) vorlagenCache[k] = new Uint8Array(readFileSync(path.join(WURZEL, konfig.formulare.formulare[k].datei)));
    v[k] = vorlagenCache[k];
  }
  return v;
}

const SIGNATUREN = () => ({ mitglied: TESTDATEIEN.sig1, sorgeberechtigte: TESTDATEIEN.sig2, sorgeberechtigte_2: TESTDATEIEN.sig3, kontoinhaber: TESTDATEIEN.sig4 });

// Antworten und Bilder je Variante
//  bild:   Bildschirm-Unterschriften, alle Nachweise als "habe" mit Bildern, Foto
//  papier: alles auf Papier (die Unterschriftsbilder werden trotzdem mitgegeben und müssen ignoriert werden)
//  leer:   Bildschirm gewählt, aber keine Unterschriftsbilder
function bereite(profilId, variante, index, aendern) {
  const p = profil(profilId);
  const a = p.a;
  a.hfvUnterschrift = index % 2 === 0 ? "training" : "selbst_drucken";
  // Oberfläche: „Satzung zur Kenntnis genommen“ ist bei Bildschirm-Unterschrift Pflicht (SCHNITTSTELLEN, Nachtrag 29.09.), auf Papier freiwillig
  a.satzung = variante === "bild" ? true : index % 2 === 0;
  if (variante === "papier") a.unterschriftWeg = "papier";
  else a.unterschriftWeg = "bildschirm";
  const bilder = { spielerfoto: null, nachweise: {}, unterschriften: {} };
  if (variante === "bild" || variante === "papier") bilder.unterschriften = SIGNATUREN();
  if (typeof aendern === "function") aendern(a, p);
  let e = auswerten(a, konfig, p.heute);
  // Wie die Oberfläche (seiten-unterlagen.js, Schritt „nachweise“): jede Nachweis-Unterlage der Liste beginnt mit „fehlt“;
  // wer eine Datei hochlädt, hat „habe“ gewählt; nach jeder Änderung wird das Ergebnis neu berechnet. Bilder gibt es nur
  // für „habe“ (pdf-lader.js: bilderFuerPdf).
  if (!a.nachweise || typeof a.nachweise !== "object") a.nachweise = {};
  for (const u of e.unterlagen) if (u.nachweis && !a.nachweise[u.id]) a.nachweise[u.id] = "fehlt";
  if (variante === "bild" && index % 4 !== 3) {
    for (let runde = 0; runde < 4; runde++) {
      for (const u of e.unterlagen) if (u.nachweis) a.nachweise[u.id] = "habe";
      const neu = auswerten(a, konfig, p.heute);
      const gleich = JSON.stringify(neu.unterlagen.map((u) => u.id + u.nachweis)) === JSON.stringify(e.unterlagen.map((u) => u.id + u.nachweis));
      e = neu;
      if (gleich) break;
    }
    for (const u of e.unterlagen) if (u.nachweis && a.nachweise[u.id] === "habe") bilder.nachweise[u.id] = nachweisDateien(u.id);
    if (e.unterlagen.some((u) => u.id === "U16") && a.spielerfoto && a.spielerfoto.weg && a.spielerfoto.weg !== "verein") bilder.spielerfoto = { bytes: TESTDATEIEN.foto.bytes, typ: TESTDATEIEN.foto.typ };
  }
  return { p: p, a: a, e: e, bilder: bilder, heute: p.heute };
}

async function baue(b, datei) {
  const bericht = {};
  const t0 = Date.now();
  const r = await erzeugePdf({ PDFLib, fontkit, schrift: SCHRIFT, vorlagen: vorlagenFuer(b.e, b.a), konfig, a: b.a, e: b.e, bilder: b.bilder, heute: b.heute, bericht });
  const pfad = path.join(AUSGABE, datei);
  writeFileSync(pfad, r.bytes);
  return { r: r, bericht: bericht, pfad: pfad, ms: Date.now() - t0 };
}

// ---------------------------------------------------------------------------------------------
// Erwartungen aus den Antworten (unabhängig von pdf.js gerechnet)
// ---------------------------------------------------------------------------------------------
const LAND = new Intl.DisplayNames(["de"], { type: "region" });
const landName = (c) => (/^[A-Za-z]{2}$/.test(String(c || "")) ? LAND.of(String(c).toUpperCase()) : String(c || ""));
const datumDe = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  return m ? m[3] + "." + m[2] + "." + m[1] : "";
};
function staatenErwartet(a) {
  let s = (a.staaten || []).map((x) => String(x).toUpperCase());
  if (a.deutsch === "ja" && !s.includes("DE")) s.push("DE");
  s = s.filter((c, i) => s.indexOf(c) === i);
  return s.filter((c) => c === "DE").concat(s.filter((c) => c !== "DE")).map(landName);
}

const digitalErlaubtErw = (a, formular) => {
  if (a.unterschriftWeg !== "bildschirm") return false;
  const f = konfig.formulare.formulare[formular];
  return f ? f.digitaleUnterschrift === "erlaubt" : true;
};
function bildFuerWer(b, wer) {
  const u = b.bilder.unterschriften;
  const z = b.a.zahlung || {};
  if (wer === "mitglied") return u.mitglied ? "mitglied" : null;
  if (wer === "sorgeberechtigte") return u.sorgeberechtigte ? "sorgeberechtigte" : null;
  if (wer === "sorgeberechtigte_beide") return u.sorgeberechtigte_2 ? "sorgeberechtigte_2" : null;
  if (wer === "spieler") return u.spieler ? "spieler" : null;
  if (wer === "kontoinhaber") {
    if (z.kontoinhaber === "sorgeberechtigt") return u.sorgeberechtigte ? "sorgeberechtigte" : null;
    if (z.kontoinhaber === "mitglied") return u.mitglied ? "mitglied" : null;
    return u.kontoinhaber ? "kontoinhaber" : null;
  }
  return null;
}
// Fehlt auf dem Vordruck eine Angabe, die erst nach der Unterschrift von Hand dazukäme, wird die Stelle zur Stift-Stelle
// (unabhängig von pdf.js aus den Antworten gerechnet)
function erklaerungFehltErw(b, s) {
  if (s.formular !== "aufnahmeantrag") return false;
  const a = b.a;
  const ew = a.einwilligungen || {};
  if (s.stelleKey === "s3.unterschrift") return !(ew.fotos === "nein" || (ew.fotos === "ja" && (ew.medien || []).some((m) => ["intern", "web", "presse", "dokumentation"].includes(m))));
  if (s.stelleKey === "s4.unterschrift") {
    const z = a.zahlung || {};
    const sb0 = (a.sorgeberechtigte || [])[0] || {};
    const namen = z.kontoinhaber === "andere" ? [z.kiVorname, z.kiNachname] : z.kontoinhaber === "sorgeberechtigt" ? [sb0.vorname, sb0.nachname] : [a.vorname, a.nachname];
    return !String(z.iban || "").replace(/[^A-Za-z0-9]/g, "") || !namen.some(Boolean);
  }
  if (s.stelleKey === "s2.unterschrift" || s.stelleKey === "s2.unterschrift_sorgeberechtigte") {
    // Seite 2 braucht die bestätigte Satzung (Kästchen auf Seite 1) und bei Familienbeitrag die Familienmitglieder
    return a.satzung !== true || (b.e.formulare.includes("familienliste") && !((a.beitrag || {}).familie || []).some((m) => m.vorname || m.nachname));
  }
  return false;
}
function erwarteteArt(b, s) {
  if (s.wer === "arzt" || s.wer === "verein") return "stift";
  if (erklaerungFehltErw(b, s)) return "stift";
  return digitalErlaubtErw(b.a, s.formular) && bildFuerWer(b, s.wer) ? "bild" : "stift";
}
const WER_TEXT = {
  mitglied: "Mitglied (Sie selbst)",
  spieler: "Spielerin oder Spieler",
  sorgeberechtigte: "eine Person mit Sorgerecht",
  sorgeberechtigte_beide: "zweiter Elternteil (empfohlen)",
  kontoinhaber: "Kontoinhaberin oder Kontoinhaber",
  arzt: "Ärztin oder Arzt (mit Stempel)",
  verein: "Verein (mit Stempel)",
};

// Vordruck-Erwartungen: Feldname -> Text (null = leer), Kästchen -> true/false
function erwarteHfvAntrag(b) {
  const a = b.a;
  const e = b.e;
  const wechsel = ["wechsel_hfv", "wechsel_lv", "wechsel_ausland"].includes(e.status);
  const av = a.alterVerein || {};
  const T = {};
  T.AntragVerein = konfig.verein.name_register;
  T.AntragNr = konfig.verein.vereinsnummer;
  T.Familienname = a.nachname;
  T.Vorname = a.vorname;
  T.Strasse = a.anschrift.strasse;
  T.PLZ = a.anschrift.plz;
  T.Ort = a.anschrift.ort;
  T.Geburtsdatum = datumDe(a.geburtsdatum);
  T["Staatsangeh#C3#B6rigkeit"] = staatenErwartet(a);
  T.AntragVerein_2 = konfig.verein.name_register;
  T.Spielername = a.nachname + ", " + a.vorname;
  if (wechsel) {
    T.letzterVerein = av.name;
    T.letzterVerband = av.verband || (av.region === "hessen" ? "Hessischer Fußball-Verband" : av.region === "ausland" ? landName(av.land) : null);
    T.LetztesSpiel = datumDe(a.letztesSpiel);
  }
  if (a.abmeldung && a.abmeldung.status === "einschreiben") T.Abmeldung = datumDe(a.abmeldung.datum);
  if (a.sperre === "ja") T.SperreBis = datumDe(a.sperreBis);
  const K = {
    K1: a.geschlecht === "m",
    K2: a.geschlecht === "w",
    K3: a.geschlecht === "d",
    K4: e.status === "neu",
    K5: wechsel,
    K6: Boolean(a.besonderes && a.besonderes.herrenAushilfe) && e.faelle.includes("F13"),
    K7: (a.geschlecht === "d" || a.geschlecht === "ohne_angabe") && (a.spielrechtFuer === "m" || a.spielrechtFuer === "w"),
    K8: (a.geschlecht === "d" || a.geschlecht === "ohne_angabe") && a.spielrechtFuer === "m",
    K9: (a.geschlecht === "d" || a.geschlecht === "ohne_angabe") && a.spielrechtFuer === "w",
  };
  return { T: T, K: K };
}
const HFV_LEER = ["Antragsdatum", "StammVerein", "StammNr", "Pass-Wechsel", "SperrVon", "Sperre-Spiel", "Pass-Zusatz", "Text1", "Text2", "Text3", "Text4", "Text5", "Text6"];

function erwarteVollmacht(b) {
  const a = b.a;
  return { "Name Vorname SpielerinSpieler": a.nachname + ", " + a.vorname, GebDatum: datumDe(a.geburtsdatum), "Name antragstellender VereinVertreten durch Person": konfig.verein.name_register, "Name Verein": (a.alterVerein || {}).name };
}
function erwarteAbmeldung(b) {
  const a = b.a;
  const av = a.alterVerein || {};
  const T = { 1: a.nachname, 2: a.vorname, 3: datumDe(a.geburtsdatum), "Straße und Hausnummer": a.anschrift.strasse, "Postleitzahl und Wohnort": a.anschrift.plz + " " + a.anschrift.ort, undefined: av.name };
  if (av.empfaenger) T["Empfänger Einschreiben"] = av.empfaenger;
  if (av.strasse) T["Straße und Hausnummer 1"] = av.strasse;
  if (av.plzOrt) T["Straße und Hausnummer 2"] = av.plzOrt;
  const K = {
    "Hiermit melde ich meine Spielberechtigung bei Ihrem Verein ab": (a.abmeldung || {}).weg === "einschreiben",
    "Hiermit melde ich meine Mitgliedschaft bei Ihrem Verein ab": av.mitgliedschaft === "kuendigen",
    "Ich bleibe weiterhin passives Mitglied im Verein": av.mitgliedschaft === "passiv",
  };
  return { T: T, K: K };
}
function erwarteSenioren(b) {
  const a = b.a;
  return { "Name Vorname SpielerSpielerin": a.nachname + ", " + a.vorname, GebDatum: datumDe(a.geburtsdatum), "Name antragstellender Verein": konfig.verein.name_register };
}

// Aufnahmeantrag: erwartete Texte (Feldschlüssel der Vermessung) und Kreuze
function erwarteAufnahmeantrag(b) {
  const a = b.a;
  const e = b.e;
  const T = {};
  const kreuze = [];
  const g = /^(\d{4})-(\d{2})-(\d{2})$/.exec(a.geburtsdatum || "");
  (e.beitrag.felder || []).forEach((k) => kreuze.push(k));
  T["s1.nachname"] = a.nachname;
  T["s1.vorname"] = a.vorname;
  T["s1.strasse"] = a.anschrift.strasse;
  T["s1.plz_ort"] = a.anschrift.plz + " " + a.anschrift.ort;
  if (g) {
    T["s1.geburtsdatum.tag"] = g[3];
    T["s1.geburtsdatum.monat"] = g[2];
    T["s1.geburtsdatum.jahr"] = g[1];
  }
  if (a.telefon) T["s1.telefon"] = a.telefon;
  if (a.mobil) T["s1.mobil"] = a.mobil;
  if (a.email) T["s1.email"] = a.email;
  if (a.satzung === true) kreuze.push("s1.satzung");
  T["s3.zusatz_mitglied"] = "Mitglied: " + a.vorname + " " + a.nachname + ", geb. " + datumDe(a.geburtsdatum);
  const ew = a.einwilligungen || {};
  if (ew.fotos === "ja") {
    kreuze.push("s3.einwilligung.ja");
    (ew.medien || []).forEach((m) => kreuze.push("s3.medien." + m));
  } else if (ew.fotos === "nein") kreuze.push("s3.einwilligung.nein");
  const minor = e.minderjaehrig === true;
  const sb = a.sorgeberechtigte || [];
  if (minor && sb[0] && (sb[0].vorname || sb[0].nachname)) {
    const n = [sb[0].vorname, sb[0].nachname].filter(Boolean).join(" ");
    T["s2.zusatz_unterzeichner"] = "Erziehungsberechtigte/r: " + n;
    T["s3.zusatz_unterzeichner"] = "Erziehungsberechtigte/r: " + n;
  }
  const z = a.zahlung || {};
  let iban = null;
  if (z.art === "sepa") {
    const ki = z.kontoinhaber;
    let p;
    if (ki === "andere") p = { n: z.kiNachname, v: z.kiVorname };
    else if (ki === "sorgeberechtigt") p = { n: (sb[0] || {}).nachname, v: (sb[0] || {}).vorname };
    else p = { n: a.nachname, v: a.vorname };
    T["s4.kontoinhaber.name"] = p.n;
    T["s4.kontoinhaber.vorname"] = p.v;
    const eigene = ki === "andere" && z.kiAnschriftGleich === false;
    T["s4.strasse"] = eigene ? z.kiStrasse : a.anschrift.strasse;
    T["s4.plz_ort"] = eigene ? z.kiPlz + " " + z.kiOrt : a.anschrift.plz + " " + a.anschrift.ort;
    if (ki === "andere" || ki === "sorgeberechtigt") T["s4.mitglied"] = a.vorname + " " + a.nachname;
    if (z.bank) T["s4.kreditinstitut"] = z.bank;
    const nr = String(z.iban || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    iban = nr;
  }
  return { T: T, kreuze: kreuze, iban: iban };
}

// ---------------------------------------------------------------------------------------------
// Prüfungen eines fertigen PDFs
// ---------------------------------------------------------------------------------------------
const BASIS_BILDER = {}; // Bilder je Vorlagenseite (gezählt einmal aus den Vordrucken)
function basisBilder() {
  for (const [k, f] of Object.entries(konfig.formulare.formulare)) BASIS_BILDER[k] = bilderJeSeite(path.join(WURZEL, f.datei));
}

// Einheitliche Namen (SCHNITTSTELLEN Abschnitt 9): Titel der eigenen Seiten = de-regeln.js › formulare, soweit dort nichts anderes steht
const ATTEST_VORLAGE_TITEL = "Ärztliche Bescheinigung (Attest)";
const attestErlaubnisTitel = () => deRegeln.formulare.attest_einwilligung || deRegeln.unterlagen.U11.name;
const EIGENER_TITEL = {
  datenschutz: () => deRegeln.formulare.datenschutz,
  einverstaendnis_maedchen: () => deRegeln.formulare.einverstaendnis_maedchen,
  einverstaendnis_fahrten: () => deRegeln.formulare.einverstaendnis_fahrten,
  karneval_auftritte: () => deRegeln.formulare.karneval_auftritte,
  notfall: () => deRegeln.formulare.notfall,
  attest_einwilligung: attestErlaubnisTitel,
  attest_vorlage: () => ATTEST_VORLAGE_TITEL,
};
// Teile des PDF (Abschnitt 9)
const TEIL_NAME = { A: "Teil A – Für Sie", B: "Teil B – Für den Verein", C: "Teil C – Vertraulich, getrennt abgeben" };
// Eine eigene Seite beginnt nach dem Kopf („… · Teil X“) mit ihrem Titel
const eigenerMarker = (schluessel) => new RegExp("· Teil [ABC] " + esc(norm(EIGENER_TITEL[schluessel]())) + "( |$)");
const FORM_MARKER = {
  aufnahmeantrag: /AUFNAHMEANTRAG - VEREINSANMELDUNG/,
  datenschutz: eigenerMarker("datenschutz"),
  hfv_antrag: /Antrag auf Spielerlaubnis \/ Vereinswechsel/,
  vollmacht: /VOLLMACHT Zur Nutzung der stellvertretenden Abmeldung/,
  abmeldung: /Formular zur Abmeldung der Spielberechtigung/,
  einverstaendnis_senioren: /Vorgangsdokument für die schriftliche Einverständniserklärung/,
  einverstaendnis_maedchen: eigenerMarker("einverstaendnis_maedchen"),
  einverstaendnis_fahrten: eigenerMarker("einverstaendnis_fahrten"),
  karneval_auftritte: eigenerMarker("karneval_auftritte"),
  notfall: eigenerMarker("notfall"),
};
const WASSERZEICHEN = (heuteDe) => "KOPIE – nur für die Spielberechtigung beim HFV – FFV Sportfreunde 04 – " + heuteDe;

// Kästchen-Erwartung für HFV/Abmeldung: Vergleich der Felder (Bericht) mit der Erwartung, beide Richtungen
function vergleicheFelder(bericht, formular, erwartet, leer) {
  const felder = bericht.felder.filter((f) => f.formular === formular);
  const texte = felder.filter((f) => f.typ === "text");
  const haken = felder.filter((f) => f.typ === "checkbox");
  for (const [name, soll] of Object.entries(erwartet.T)) {
    const f = texte.find((x) => x.feld === name);
    if (soll === null || soll === undefined || soll === "" || (Array.isArray(soll) && soll.length === 0 && name !== "Staatsangeh#C3#B6rigkeit")) ok(!f, formular + "." + name + " muss leer bleiben, enthält aber " + (f && f.wert));
    else if (name === "Staatsangeh#C3#B6rigkeit" && soll.length === 0) ok(!f, formular + "." + name + " muss leer bleiben, wenn keine Staatsangehörigkeit bekannt ist");
    else if (name === "Staatsangeh#C3#B6rigkeit") {
      ok(Boolean(f) && f.wert.length <= 30 && f.wert.startsWith(soll[0].slice(0, 30)), formular + "." + name + ": " + JSON.stringify(f && f.wert) + " soll mit " + soll[0] + " beginnen und höchstens 30 Zeichen lang sein");
      if (f && soll.join(", ").length <= 30) ok(f.wert === soll.join(", "), formular + "." + name + ": alle Staatsangehörigkeiten " + soll.join(", ") + " erwartet, gefunden " + f.wert);
    } else ok(Boolean(f) && norm(f.wert) === norm(String(soll)), () => formular + "." + name + ": erwartet " + JSON.stringify(soll) + ", gefunden " + JSON.stringify(f && f.wert));
  }
  texte.forEach((f) => ok(Object.prototype.hasOwnProperty.call(erwartet.T, f.feld), formular + "." + f.feld + " wurde gesetzt, ist aber nicht vorgesehen (" + f.wert + ")"));
  for (const [name, soll] of Object.entries(erwartet.K || {})) {
    const f = haken.find((x) => x.feld === name);
    ok(Boolean(f) && f.wert === Boolean(soll), formular + " Kästchen " + name + ": erwartet " + Boolean(soll) + ", gefunden " + (f ? f.wert : "nicht behandelt"));
  }
  (leer || []).forEach((name) => ok(!felder.some((x) => x.feld === name && (x.typ === "text" || x.wert === true)), formular + "." + name + " (Feld des Vereins oder der Hand) muss leer bleiben"));
}

// Text im fertigen PDF an den Koordinaten des Feldes
function pruefeFeldTexte(pfad, seitenNr, formular, erwartetT, woerterCache) {
  const eintrag = konfig.formulare.formulare[formular];
  for (const [name, soll] of Object.entries(erwartetT)) {
    const jf = eintrag.felder[name];
    if (!jf || soll === null || soll === undefined || soll === "" || name === "Staatsangeh#C3#B6rigkeit") continue;
    const key = seitenNr + jf.seite - 1;
    if (!woerterCache[key]) woerterCache[key] = woerterSeite(pfad, key);
    const ist = norm(textImRechteck(woerterCache[key], jf.rect, 2));
    ok(ist === norm(soll), formular + "." + name + " im PDF an Position: erwartet „" + soll + "“, gelesen „" + ist + "“");
  }
}

function pruefeKaestchen(pfad, seitenNr, formular, erwartetK, grauCache) {
  const eintrag = konfig.formulare.formulare[formular];
  for (const [name, soll] of Object.entries(erwartetK || {})) {
    const jf = eintrag.felder[name];
    const key = seitenNr + jf.seite - 1;
    if (!grauCache[key]) grauCache[key] = renderGrau(pfad, key, 110);
    const anteil = dunkelAnteil(grauCache[key], jf.rect, 0.2);
    if (soll) ok(anteil > 0.12, formular + " Kästchen " + name + " sollte angekreuzt sein, dunkler Anteil " + anteil.toFixed(3));
    else ok(anteil < 0.06, formular + " Kästchen " + name + " sollte leer sein, dunkler Anteil " + anteil.toFixed(3));
  }
}


// Wörter der Originalvorlage (ohne Felder), je Vordruck und Seite einmal gelesen. Wörter, die mit Unterstrichen beginnen
// (gedruckte Schreiblinien, oft mit dem Beschriftungswort verklebt), werden auf den Teil nach den Unterstrichen gekürzt.
const VORLAGEN_WOERTER = {};
function vorlagenWoerter(key, index) {
  const k = key + ":" + index;
  if (!VORLAGEN_WOERTER[k]) {
    const roh = woerterSeite(path.join(WURZEL, konfig.formulare.formulare[key].datei), index + 1);
    VORLAGEN_WOERTER[k] = roh
      .map((w) => {
        if (/^[._,:;\-]+$/.test(w.t)) return null; // gedruckte Linien und Punkte
        const m = /^(_+)(.*)$/.exec(w.t);
        if (!m) return w;
        if (!m[2]) return null;
        // Unterstrich = 0,5 em; die Höhe des Wortkastens ist 1,107 em (Times New Roman im Vereinsformular)
        const em = (w.y1 - w.y0) / 1.107;
        return Object.assign({}, w, { x0: w.x0 + m[1].length * 0.5 * em, t: m[2] });
      })
      .filter(Boolean);
  }
  return VORLAGEN_WOERTER[k];
}


// ---------------------------------------------------------------------------------------------
// Eigene Seiten des Vereins: Stellen, Titel, Angaben der Familie (Runde 2)
// ---------------------------------------------------------------------------------------------
// Eigene Seiten mit Unterschriftsbereich: [Schlüssel der Seite in bericht.seiten, Formular der Regeln, Stelle]
const EIGENE_MIT_STELLE = [
  ["datenschutz", "datenschutz", "kenntnisnahme"],
  ["einverstaendnis_maedchen", "einverstaendnis_maedchen", "unterschrift"],
  ["einverstaendnis_fahrten", "einverstaendnis_fahrten", "unterschrift"],
  ["karneval_auftritte", "karneval_auftritte", "unterschrift"],
  ["attest_einwilligung", "attest", "einwilligung"],
  ["notfall", "notfall", "unterschrift"],
];
const TEXT_FAHRTEN = {
  fahrten: { ja: "Ja, mein Kind darf zu Spielen und Veranstaltungen in Fahrgemeinschaften mitfahren.", nein: "Nein, mein Kind fährt nicht in Fahrgemeinschaften mit.", ohne: "Sie haben dazu nichts angegeben. Ihr Kind fährt dann nicht in Fahrgemeinschaften mit." },
  messenger: { ja: "Ja, meine Telefonnummer darf in die Messenger-Gruppe der Mannschaft. Alle Mitglieder der Gruppe können sie sehen.", nein: "Nein, ich möchte nicht in die Messenger-Gruppe.", ohne: "Sie haben dazu nichts angegeben. Ihre Telefonnummer kommt dann nicht in die Messenger-Gruppe." },
};
const TEXT_KEINE_GESUNDHEIT = "Sie haben keine Angaben zur Gesundheit gemacht. Soll der Trainer etwas wissen? Sprechen Sie ihn an.";
const GESUNDHEIT_FELDER = [["allergien", "Allergien"], ["erkrankungen", "Erkrankungen"], ["medikamente", "Medikamente"], ["sonstiges", "Sonstiges"]];

// Mannschaft wie im PDF: bei mehreren möglichen Mannschaften „D1-Jugend oder D3-Jugend (teilt die Jugendleitung ein)“
function mannschaftErwartet(b) {
  const namen = ((b.e.mannschaft || {}).namen || []).filter(Boolean);
  if (namen.length > 1) return namen.slice(0, -1).join(", ") + " oder " + namen[namen.length - 1] + " (teilt die Jugendleitung ein)";
  if (namen.length) return namen[0];
  const g = (b.a.karneval || {}).gruppe;
  return g && g !== "weiss_nicht" ? g : "";
}

// Uhrzeit wie im PDF: „HH:MM“ (auch „9:30“), sonst leer
function zeitErwartet(x) {
  const m = /^\s*(\d{1,2}):(\d{2})\s*$/.exec(String(x || ""));
  return m && Number(m[1]) <= 23 && Number(m[2]) <= 59 ? String(Number(m[1])).padStart(2, "0") + ":" + m[2] : "";
}

function pruefeEigeneSeiten(c) {
  const { b, texte, S, bericht, e, a, pfad, bilderSeite, bereich, teilC } = c;
  const seitenVon = (schluessel) => S.map((s, i) => ({ s: s, nr: i + 1 })).filter((x) => x.s.schluessel === schluessel && x.s.art === "eigen");
  const eingabe = (seite, name) => bericht.eingaben.find((x) => x.seite === seite && x.name === name);
  const stelleVon = (formular, key) => bericht.stellen.find((st) => st.formular === formular && st.stelleKey === key) || {};
  const lz = S.map((s, i) => ({ s: s, t: texte[i] })).filter((x) => x.s.art === "laufzettel").map((x) => x.t).join(" ");

  // --- Punkt 1: keine stumme Stelle, kein Rückfall; jede eigene Seite mit Unterschriftsbereich trägt Bild oder Markierung ---
  ok(bericht.warnungen.length === 0, () => "pdf.js meldet Warnungen: " + JSON.stringify(bericht.warnungen));
  ok(!bericht.stellen.some((s) => s.rueckfall), "kein Rückfall auf eine Stift-Markierung: die Regeln kennen alle Stellen der eigenen Seiten");
  for (const [schluessel, formular, stelleKey] of EIGENE_MIT_STELLE) {
    const seiten = seitenVon(schluessel);
    if (!seiten.length) continue;
    ok(e.unterschriften.some((u) => u.formular === formular && u.stelleKey === stelleKey), "Regeln: " + formular + "." + stelleKey + " gehört zur Seite " + schluessel);
    const z = bericht.stellen.filter((st) => st.formular === formular && st.stelleKey === stelleKey);
    if (!ok(z.length === 1, () => "Seite " + schluessel + ": " + z.length + " statt 1 Unterschriftsstelle " + formular + "." + stelleKey)) continue;
    const st = z[0];
    ok(seiten.some((x) => x.nr === st.seite), () => "Unterschriftsstelle " + formular + "." + stelleKey + " steht auf Seite " + st.seite + ", nicht auf den Seiten von " + schluessel);
    ok(st.art === "bild" || st.art === "stift", "Unterschriftsstelle " + formular + "." + stelleKey + " ist Bild oder Markierung");
    ok(texte[st.seite - 1].includes("Ort, Datum") && /Unterschrift/.test(texte[st.seite - 1]), () => "Seite " + st.seite + " (" + schluessel + "): Unterschriftsbereich mit „Ort, Datum“ und „Unterschrift“ fehlt");
    if (st.art === "stift") ok(zaehle(texte[st.seite - 1], /Hier mit Stift unterschreiben/g) >= 1, () => "Seite " + st.seite + " (" + schluessel + "): Stift-Markierung fehlt im Text");
    else if (bilderSeite) ok((bilderSeite[st.seite] || 0) >= 1, () => "Seite " + st.seite + " (" + schluessel + "): kein Unterschriftsbild");
  }

  // --- Punkt 7: einheitliche Namen (Abschnitt 9) ---
  for (const [schluessel, titel] of Object.entries(EIGENER_TITEL)) {
    const seiten = seitenVon(schluessel);
    if (!seiten.length) continue;
    ok(eigenerMarker(schluessel).test(texte[seiten[0].nr - 1]), () => "Seite " + seiten[0].nr + " (" + schluessel + "): Titel „" + titel() + "“ fehlt am Anfang: " + texte[seiten[0].nr - 1].slice(0, 130));
    ok(norm(S[seiten[0].nr - 1].titel) === norm(titel()), () => "Bericht: Titel von " + schluessel + " ist „" + S[seiten[0].nr - 1].titel + "“, erwartet „" + titel() + "“");
  }
  const attestErlaubnis = seitenVon("attest_einwilligung");
  if (attestErlaubnis.length) ok(texte[attestErlaubnis[0].nr - 1].includes("Einwilligung zur Verarbeitung der ärztlichen Bescheinigung · Gesundheitsdaten nach Art. 9 Abs. 2 lit. a DSGVO"), "Erlaubnis für das Attest trägt den Rechtsbegriff als Untertitel");
  const eigeneTexte = S.map((s, i) => ({ s: s, t: texte[i] })).filter((x) => x.s.art === "eigen" || x.s.art === "trennblatt").map((x) => x.t).join(" ");
  ok(!/Einwilligung zum ärztlichen Attest|Einverständnis zu Fahrten|Kopie der ärztlichen Bescheinigung|Notfallbogen|[Ää]rztliche[sn]? Attest/.test(eigeneTexte), "auf den eigenen Seiten und im Trennblatt stehen die alten Namen nicht mehr");
  // Laufzettel, soweit pdf.js ihn schreibt (Inhalt der Datei, „Für den Verein zu klären“, „Hinweise zur Datei“; die Texte der Regeln stammen von AP-1)
  const ab = (s, marker, bis) => {
    const i = s.indexOf(marker);
    if (i < 0) return "";
    const j = Math.min(...(bis || []).map((m) => s.indexOf(m, i + 1)).filter((k) => k > 0), s.length);
    return s.slice(i, j);
  };
  const lzEigen = [ab(lz, "Inhalt dieser Datei", ["Angaben für DFBnet", "Personen mit Sorgerecht", "Beitrag und Zahlung"]), ab(lz, "Für den Verein zu klären", ["Hinweise zur Datei", "Bearbeitung durch den Verein"]), ab(lz, "Hinweise zur Datei", ["Bearbeitung durch den Verein"])].join(" ");
  ok(!/SEPA-Mandat|Foto-Einwilligung|Notfallbogen|Spielerfoto/.test(lzEigen), () => "im Laufzettel stehen die einheitlichen Namen („Erlaubnis für die Lastschrift“, „Erlaubnis für Fotos“, „Notfall- und Gesundheitsbogen“, „Foto für den Spielerpass“): " + (lzEigen.match(/.{30}(SEPA-Mandat|Foto-Einwilligung|Notfallbogen|Spielerfoto).{20}/) || [""])[0]);
  ok(!/Spielberechtigung/.test(eigeneTexte.replace(/Spielberechtigung erteilt am/g, "")), "auf den eigenen Seiten für die Familie steht „Spielrecht“, nicht „Spielberechtigung“");
  ok(!/Spielerlaubnis/.test(eigeneTexte.replace(/Antrags? auf Spielerlaubnis/g, "")), "„Spielerlaubnis“ steht nur im Namen „Antrag auf Spielerlaubnis“");
  const trenn = S.map((s, i) => ({ s: s, nr: i + 1 })).filter((x) => x.s.art === "trennblatt");
  if (trenn.length) {
    const t = texte[trenn[0].nr - 1];
    ok(t.includes(TEIL_NAME.C), "Trennblatt trägt den Namen des Teils C");
    const zeilen = [];
    if (bericht.plan.attestVorlage) zeilen.push([bericht.plan.attestVorlage.von, ATTEST_VORLAGE_TITEL]);
    if (bericht.plan.attestEinwilligung) zeilen.push([bericht.plan.attestEinwilligung.von, attestErlaubnisTitel()]);
    if (bericht.plan.nachweise.U10) zeilen.push([bericht.plan.nachweise.U10.von, "Kopie: " + deRegeln.unterlagen.U10.name]);
    const nf = bereich("notfall");
    if (nf.length) zeilen.push([nf[0].nr, deRegeln.formulare.notfall]);
    zeilen.forEach(([seite, titel]) => ok(t.includes("Seite " + seite + ": " + titel), () => "Trennblatt nennt „Seite " + seite + ": " + titel + "“ nicht (" + t.slice(0, 400) + ")"));
    ok(zeilen.length === (t.match(/Seite \d+:/g) || []).length, "Trennblatt nennt genau die Seiten von Teil C ohne Trennblatt: " + zeilen.length);
  }
  const inhaltUeberschrift = lz.indexOf("Inhalt dieser Datei");
  if (bericht.plan.attestVorlage) ok(lz.indexOf(ATTEST_VORLAGE_TITEL, inhaltUeberschrift) > 0, "Laufzettel „Inhalt dieser Datei“ nennt „" + ATTEST_VORLAGE_TITEL + "“");
  if (bericht.plan.attestEinwilligung) ok(lz.indexOf(attestErlaubnisTitel(), inhaltUeberschrift) > 0, "Laufzettel „Inhalt dieser Datei“ nennt „" + attestErlaubnisTitel() + "“");
  if (bericht.plan.foto) ok(lz.indexOf(deRegeln.unterlagen.U16.name, inhaltUeberschrift) > 0 && texte[bericht.plan.foto.von - 1].includes(deRegeln.unterlagen.U16.name), "Foto-Seite heißt „" + deRegeln.unterlagen.U16.name + "“");

  // --- Punkt 2: mehrere mögliche Mannschaften ---
  const mannschaft = mannschaftErwartet(b);
  const namenAnzahl = ((e.mannschaft || {}).namen || []).length;
  for (const schluessel of ["einverstaendnis_maedchen", "einverstaendnis_fahrten", "notfall"]) {
    const seiten = seitenVon(schluessel);
    if (!seiten.length) continue;
    const t = texte[seiten[0].nr - 1];
    if (mannschaft) ok(t.includes("Mannschaft: " + mannschaft), () => "Seite " + seiten[0].nr + " (" + schluessel + "): „Mannschaft: " + mannschaft + "“ fehlt");
    else ok(!t.includes("Mannschaft:"), "Seite " + seiten[0].nr + " (" + schluessel + "): keine Mannschaft bekannt, also keine Zeile");
  }
  if (namenAnzahl > 1) {
    ok(lz.includes(mannschaft), () => "Laufzettel nennt „" + mannschaft + "“");
    ok(!lz.includes(e.mannschaft.namen.join(", ")), "Laufzettel schreibt die Mannschaften nicht mit Komma hintereinander");
    ok(!eigeneTexte.includes(e.mannschaft.namen.join(", ")), "die eigenen Seiten schreiben die Mannschaften nicht mit Komma hintereinander");
  } else ok(!lz.includes("teilt die Jugendleitung ein") && !eigeneTexte.includes("teilt die Jugendleitung ein"), "bei höchstens einer Mannschaft steht nirgends „teilt die Jugendleitung ein“");

  // --- Punkt 3: Name der zweiten Person mit Sorgerecht neben der zweiten Unterschriftslinie ---
  const aa = bereich("aufnahmeantrag");
  if (aa.length) {
    const zweiteStelle = e.unterschriften.some((u) => u.formular === "aufnahmeantrag" && u.stelleKey === "s2.unterschrift_sorgeberechtigte");
    const sb1 = (a.sorgeberechtigte || [])[1] || {};
    const n2 = [sb1.vorname, sb1.nachname].filter(Boolean).join(" ");
    const w = woerterSeite(pfad, aa[1].nr);
    const links = norm(textImRechteck(w, [30, 66, 276, 30], 0));
    if (e.minderjaehrig && zweiteStelle && n2) {
      ok(links === "Erziehungsberechtigte/r: " + n2, () => "Aufnahmeantrag Seite 2: neben der zweiten Unterschriftslinie soll „Erziehungsberechtigte/r: " + n2 + "“ stehen, gelesen „" + links + "“");
      const wort = w.filter((x) => x.t === n2.split(" ").slice(-1)[0] && x.y0 > 66 && x.y1 < 96);
      ok(wort.length === 1 && wort[0].x1 <= 305.5, () => "der Name der zweiten Person endet vor der Linie (x " + (wort[0] && wort[0].x1) + ")");
      ok(bericht.stellen.some((st) => st.stelleKey === "s2.unterschrift_sorgeberechtigte"), "zweite Unterschriftsstelle vorhanden");
    } else ok(links === "", () => "Aufnahmeantrag Seite 2: ohne zweite Person mit Sorgerecht (oder ohne zweite Linie) steht links neben der Linie nichts, gelesen „" + links + "“");
  }

  // --- Punkt 4: Erlaubnis für Auftritte am Abend ---
  const ka = seitenVon("karneval_auftritte");
  if (ka.length) {
    const seite = ka[0].nr;
    const digital = stelleVon("karneval_auftritte", "unterschrift").art === "bild";
    const k = a.karneval || {};
    const zeit = zeitErwartet(k.alleinAb);
    const allein = k.alleinNachHause === "ja" && zeit ? "Mein Kind darf die Veranstaltung um " + zeit + " Uhr allein verlassen." : k.alleinNachHause === "nein" ? "Mein Kind darf die Veranstaltung nicht allein verlassen." : "";
    const ohne = digital ? "–" : "";
    const tel = a.mobil || a.telefon || "";
    const wertVon = (name) => (eingabe(seite, name) || {}).wert;
    gleich(wertVon("abholung"), k.abholung || ohne, "Karneval: Feld „Mein Kind wird abgeholt von“");
    gleich(wertVon("alleinNachHause"), allein || ohne, "Karneval: Feld „Allein nach Hause“");
    gleich(wertVon("telefon"), tel || ohne, "Karneval: Feld „Telefonnummer“");
    if (k.abholung) ok(texte[seite - 1].includes(norm(k.abholung)), "Karneval: die Abholung steht im Text");
    if (allein) ok(texte[seite - 1].includes(allein), () => "Karneval: Satz „" + allein + "“ fehlt");
    else ok(!/Mein Kind darf die Veranstaltung (um \d\d:\d\d Uhr|nicht) allein verlassen\./.test(texte[seite - 1]), "Karneval: ohne Antwort steht kein Satz zum Heimweg");
    const striche = einzelStriche(woerterSeite(pfad, seite)).length;
    const erwStriche = digital ? [k.abholung, allein, tel].filter((v) => !v).length : 0;
    ok(striche === erwStriche, () => "Karneval: " + striche + " Striche „–“ im PDF, erwartet " + erwStriche + (digital ? " (Bildschirm-Unterschrift, unbeantwortete Felder)" : " (Unterschrift mit Stift: Felder bleiben zum Ausfüllen leer)"));
    if (!digital && !allein) ok(texte[seite - 1].includes("um Uhr allein verlassen"), "Karneval: auf dem Papierweg bleibt die Beschriftung „um ___ Uhr allein verlassen“ zum Ausfüllen");
    if (digital || allein) ok(texte[seite - 1].includes("Allein nach Hause"), "Karneval: Beschriftung „Allein nach Hause“");
  }

  // --- Fahrten und Messenger ---
  const fa = seitenVon("einverstaendnis_fahrten");
  if (fa.length) {
    const seite = fa[0].nr;
    const digital = stelleVon("einverstaendnis_fahrten", "unterschrift").art === "bild";
    const ew = a.einwilligungen || {};
    for (const name of ["fahrten", "messenger"]) {
      const T = TEXT_FAHRTEN[name];
      const beantwortet = typeof ew[name] === "boolean";
      const t = texte[seite - 1];
      if (!beantwortet && digital) ok(t.includes(T.ohne) && !t.includes(T.ja.slice(0, 25)) && !t.includes(T.nein.slice(0, 25)), () => "Fahrten/" + name + ": ohne Antwort und mit Bildschirm-Unterschrift steht ein Satz statt der Kästchen");
      else ok(t.includes(T.ja) && t.includes(T.nein) && !t.includes(T.ohne), () => "Fahrten/" + name + ": beide Kästchen stehen da");
      gleich((eingabe(seite, name) || {}).leer, !beantwortet && !digital, "Fahrten/" + name + ": Feld leer");
    }
  }

  // --- Punkt 5: Notfall- und Gesundheitsbogen ---
  const nf = seitenVon("notfall");
  if (nf.length) {
    const nrn = nf.map((x) => x.nr);
    const t = nrn.map((n) => texte[n - 1]).join(" ");
    const w = nrn.flatMap((n) => woerterSeite(pfad, n));
    const haupt = stelleVon("notfall", "unterschrift");
    const digital = haupt.art === "bild";
    const mit = a.gesundheitsbogen === true;
    const nurKontakte = digital && !mit;
    const ges = a.gesundheit || {};
    const hatWort = (wort) => w.some((x) => x.t === wort);
    if (nurKontakte) {
      GESUNDHEIT_FELDER.forEach(([, label]) => ok(!hatWort(label), "Notfallbogen mit Bildschirm-Unterschrift und ohne Gesundheitsbogen: kein leeres Feld „" + label + "“"));
      ok(t.includes(TEXT_KEINE_GESUNDHEIT), "Notfallbogen: Satz „Sie haben keine Angaben zur Gesundheit gemacht …“");
      ok(!/Ich willige ausdrücklich ein/.test(t) && zaehle(t, /Art\. 9 Abs\. 2 lit\. a DSGVO/g) === 1, "Notfallbogen ohne Gesundheitsangaben und mit Bildschirm-Unterschrift: die Einwilligung nach Art. 9 für Gesundheitsangaben entfällt (Art. 9 steht nur bei der Absprache)");
      ok(t.includes("Ohne die Absprache unten stehen auf diesem Blatt keine Angaben zur Gesundheit."), "Notfallbogen: die Fassung nur mit Kontakten sagt, dass ohne die Absprache keine Gesundheitsangaben auf dem Blatt stehen");
      ok(t.includes("nutzen sie nur im Notfall") && t.includes("Ihre Unterschrift") && t.includes("Notfallkontakte"), "Notfallbogen: kurzer Text, dass die Unterschrift nur für die Notfallkontakte gilt");
      ok(nf[0].s.entwurf && t.includes("Notfallkontakte – ohne Angaben zur Gesundheit"), "Notfallbogen: Untertitel für die Fassung nur mit Kontakten");
    } else {
      GESUNDHEIT_FELDER.forEach(([, label]) => ok(hatWort(label), "Notfallbogen: Feld „" + label + "“ steht da"));
      ok(!t.includes(TEXT_KEINE_GESUNDHEIT), "Notfallbogen: der Satz für die Fassung nur mit Kontakten steht hier nicht");
      ok(/Ich willige ausdrücklich ein/.test(t) && zaehle(t, /Art\. 9 Abs\. 2 lit\. a DSGVO/g) === 2, "Notfallbogen mit Gesundheitsfeldern: Einwilligung nach Art. 9 (und einmal bei der Absprache)");
      GESUNDHEIT_FELDER.forEach(([name]) => {
        const wert = mit ? String(ges[name] || "").trim() : "";
        const ist = bericht.eingaben.find((x) => x.formular === "notfall" && x.name === name);
        gleich(ist && ist.wert, wert || (digital ? "–" : ""), "Notfallbogen: Gesundheitsfeld " + name);
      });
    }
    // „–“ nur dort, wo am Bildschirm eine Angabe fehlt: leere Zellen der Kontakte und leere Gesundheitsangaben (ohne Kopf und Fuß)
    const zeilenKontakt = (a.sorgeberechtigte || []).map((p) => [[p.vorname, p.nachname].filter(Boolean).join(" "), p.rolle || "x", p.telefon || a.mobil || ""]);
    const nk = a.notfall || {};
    if (nk.name || nk.telefon) zeilenKontakt.push([nk.name || "", nk.beziehung || "Notfallkontakt", nk.telefon || ""]);
    const leereZellen = zeilenKontakt.reduce((s, z) => s + z.filter((v) => !v).length, 0);
    const leereGesundheit = mit ? GESUNDHEIT_FELDER.filter(([n]) => !String(ges[n] || "").trim()).length : 0;
    const strichNotfall = nrn.reduce((s, n) => s + einzelStriche(woerterSeite(pfad, n)).length, 0);
    const erwStrichNotfall = digital ? (zeilenKontakt.length ? leereZellen : 0) + leereGesundheit : 0;
    ok(strichNotfall === erwStrichNotfall, () => "Notfallbogen: " + strichNotfall + " Striche „–“, erwartet " + erwStrichNotfall + (digital ? " (leere Zellen der Kontakte plus leere Gesundheitsangaben)" : " (Unterschrift mit Stift: Felder bleiben frei)"));
    if (digital && !zeilenKontakt.length) ok(t.includes("Sie haben keine Notfallnummer angegeben."), "Notfallbogen: ohne Kontakte am Bildschirm steht ein Satz statt leerer Zeilen");
    // Absprache zur Medikamentengabe: eigene Stift-Zeilen, unterhalb der Unterschrift
    ok(t.includes("Absprache zur Medikamentengabe – nur mit Stift"), "Notfallbogen: Abschnitt „Absprache zur Medikamentengabe“");
    const zusatz = bericht.stellen.filter((s) => s.zusatz && s.formular === "notfall");
    gleich(zusatz.map((s) => s.stelleKey).sort(), ["absprache_eltern", "absprache_trainer"], "Notfallbogen: zwei Stift-Zeilen für die Absprache");
    ok(zusatz.every((s) => s.art === "stift" && nrn.includes(s.seite)), "Notfallbogen: die Stift-Zeilen der Absprache sind Markierungen auf den Seiten des Bogens");
    ok(zusatz.length === 2 && zusatz[0].seite === zusatz[1].seite, "Notfallbogen: beide Stift-Zeilen der Absprache stehen auf einer Seite");
    ok(t.includes("Hier mit Stift unterschreiben: eine Person mit Sorgerecht – bei der Absprache") || (t.includes("eine Person mit Sorgerecht – bei der Absprache") && t.includes("Hier mit Stift unterschreiben")), "Notfallbogen: Markierung „eine Person mit Sorgerecht – bei der Absprache“");
    ok(t.includes("Trainerin oder Trainer – bei der Absprache"), "Notfallbogen: Markierung für die Trainerin oder den Trainer");
    ok(t.includes("Die Unterschrift oben gilt dafür nicht."), "Notfallbogen: Hinweis, dass die Unterschrift oben nicht für die Absprache gilt");
    ok(t.includes(ABSPRACHE_EINWILLIGUNG), "Notfallbogen: Satz, dass die Stift-Unterschrift bei der Absprache die Einwilligung nach Art. 9 ist");
    {
      // der Satz steht über den beiden Stift-Zeilen (Kasten: 40 pt hoch), auf derselben Seite
      const seiteStift = zusatz.length ? zusatz[0].seite : null;
      const satzWort = seiteStift ? woerterSeite(pfad, seiteStift).find((x) => x.t === "erlauben") : null;
      ok(Boolean(satzWort) && zusatz.every((s) => satzWort.y0 >= s.y + 40 - 1), () => "Notfallbogen: der Einwilligungssatz steht über den Stift-Zeilen der Absprache (Satz y " + (satzWort && satzWort.y0.toFixed(1)) + ", Zeilen bis y " + zusatz.map((s) => (s.y + 40).toFixed(1)).join("/") + ")");
    }
    const kopfAbsprache = w.find((x) => x.t === "Absprache");
    const ortDatum = nrn.map((n) => ({ n: n, wort: woerterSeite(pfad, n).find((x) => x.t === "Ort," && x.y0 !== undefined) })).find((x) => x.wort);
    if (kopfAbsprache && ortDatum && zusatz.length) {
      const seiteAbsprache = zusatz[0].seite;
      ok(seiteAbsprache > haupt.seite || (seiteAbsprache === haupt.seite && zusatz[0].y < haupt.y), "Notfallbogen: die Absprache steht unterhalb der Unterschrift");
    }
  }

  // --- Punkt 6: unter einer Bildschirm-Unterschrift bleibt kein leeres Feld für eine Erklärung oder Angabe der Familie ---
  const bildSeiten = new Set(bericht.stellen.filter((s) => s.art === "bild").map((s) => s.seite));
  bericht.eingaben.forEach((f) => {
    if (f.leer && !f.ausnahme) ok(!bildSeiten.has(f.seite), () => "Seite " + f.seite + " (" + f.formular + "): das Feld „" + f.name + "“ ist leer, obwohl die Seite am Bildschirm unterschrieben ist");
  });
  bericht.eingaben.filter((f) => f.ausnahme).forEach((f) => ok(bericht.stellen.some((s) => s.zusatz && s.art === "stift" && s.seite === f.seite), () => "Seite " + f.seite + ": das Feld „" + f.name + "“ ist eine Ausnahme und braucht eigene Stift-Zeilen"));
  const hat = (formular, name) => bericht.eingaben.some((x) => x.formular === formular && x.name === name);
  const erwartet = [];
  if (fa.length) erwartet.push(["einverstaendnis_fahrten", "fahrten"], ["einverstaendnis_fahrten", "messenger"]);
  if (ka.length) ["telefon", "abholung", "alleinNachHause"].forEach((n) => erwartet.push(["karneval_auftritte", n]));
  if (nf.length) {
    ["kontakte", "medikament", "wannWieViel", "werGibtEs", "abgesprochenAm", "abgesprochenMit"].forEach((n) => erwartet.push(["notfall", n]));
    if (!(stelleVon("notfall", "unterschrift").art === "bild" && a.gesundheitsbogen !== true)) GESUNDHEIT_FELDER.forEach(([n]) => erwartet.push(["notfall", n]));
  }
  if (aa.length) {
    erwartet.push(["aufnahmeantrag", "satzung"], ["aufnahmeantrag", "fotos"]);
    if ((a.zahlung || {}).art === "sepa") erwartet.push(["aufnahmeantrag", "sepa"]);
    if (e.formulare.includes("familienliste")) erwartet.push(["aufnahmeantrag", "familie"]);
  }
  erwartet.forEach(([formular, name]) => ok(hat(formular, name), "Feld " + formular + "." + name + " wird für die Prüfung gemerkt"));
}


// ---------------------------------------------------------------------------------------------
// Runde 3: Erlaubnis für das Attest je nach Art von U10, Information zum Datenschutz, Einwilligungssatz der Absprache
// ---------------------------------------------------------------------------------------------
// Fassungen der Attest-Sätze (Runde 3 und 4), je nach Art der Unterlage U10 des Falls:
//  pflicht  der Verband verlangt das Attest (Erstanmeldung Minderjähriger, Juniorinnen, Aushilfe): Text wie bisher
//  offen    Wechsel Minderjähriger: ob der Verband es verlangt, klärt der Verein noch; braucht er es nicht, wird es vernichtet
//  verein   Erwachsene: nur die Vereinsregel, der Verein verlangt das Attest selbst; „der Verband verlangt“ steht nirgends
// Die Schlüssel: pruefung, aufbewahrung und wichtig (Erlaubnis für das Attest), vorlage (Hinweis für die Praxis auf der Attest-Vorlage),
// ds5 (Information zum Datenschutz Nr. 5, erster Punkt) und ds8 (Nr. 8)
const FASSUNGEN = ["pflicht", "offen", "verein"];
const fassungVon = (art) => (art === "offen" || art === "verein" ? art : "pflicht");
const DS5_ANTRAG = "mindestens zwei Jahre ab Antragstellung, weil der Verband das verlangt (Spielordnung § 92). Danach vernichten wir sie. Auf Anforderung legen wir sie dem Verband binnen 14 Tagen im Original vor.";
const ATTEST_TEXT = {
  pflicht: {
    pruefung: "Der Verein nimmt die Bescheinigung entgegen und prüft, ob die Voraussetzung für das Spielrecht erfüllt ist (Jugendordnung § 9 Nr. 1).",
    aufbewahrung: "Der Verein bewahrt sie mindestens zwei Jahre ab dem Antrag auf (Spielordnung § 92). Danach vernichtet er sie.",
    wichtig: "Ohne diese Einwilligung kann der Verein keinen Antrag auf Spielerlaubnis stellen, weil der Verband die Bescheinigung verlangt.",
    vorlage: "Hinweis für die Praxis: Die Bescheinigung ist für den Fußballverein und den Hessischen Fußball-Verband bestimmt (Jugendordnung § 9 Nr. 1). Bitte tragen Sie keine Diagnosen ein. Die Aussage oben genügt.",
    ds5: "Unterlagen zum Antrag auf Spielerlaubnis (unterschriebener Antrag, Nachweise, Attest): " + DS5_ANTRAG,
    ds8: "Für Minderjährige verlangt der Verband ein Attest vom Arzt. Ohne die Erlaubnis für das Attest kann der Verein deshalb kein Spielrecht beantragen.",
  },
  offen: {
    pruefung: "Der Verein nimmt die Bescheinigung entgegen und prüft, ob die Voraussetzung für das Spielrecht erfüllt ist (Jugendordnung § 9 Nr. 1).",
    aufbewahrung: "Braucht der Verband sie, bewahrt der Verein sie mindestens zwei Jahre. Die Frist läuft ab dem Antrag (Spielordnung § 92). Danach vernichtet er sie.",
    wichtig: "Ob der Verband die Bescheinigung beim Wechsel verlangt, klärt der Verein noch. Braucht der Verband sie nicht, vernichtet der Verein sie.",
    vorlage: "Hinweis für die Praxis: Die Bescheinigung ist für den Fußballverein bestimmt. Ob der Hessische Fußball-Verband sie beim Wechsel verlangt, klärt der Verein. Braucht der Verband sie nicht, vernichtet der Verein sie. Bitte tragen Sie keine Diagnosen ein. Die Aussage oben genügt.",
    ds5: "Unterlagen zum Antrag auf Spielerlaubnis (unterschriebener Antrag, Nachweise): " + DS5_ANTRAG + " Ob der Verband beim Wechsel ein Attest verlangt, klärt der Verein noch. Braucht der Verband es, gilt dieselbe Frist.",
    ds8: "Ob der Verband beim Wechsel ein Attest verlangt, klärt der Verein noch. Braucht der Verband es nicht, vernichtet der Verein es.",
  },
  verein: {
    pruefung: "Der Verein nimmt die Bescheinigung entgegen und prüft sie.",
    aufbewahrung: "Der Verband braucht sie nicht. Der Verein vernichtet sie nach der Prüfung.",
    wichtig: "Ohne diese Einwilligung kann der Verein keinen Antrag auf Spielerlaubnis stellen. Denn der Verein verlangt die Bescheinigung selbst.",
    vorlage: "Hinweis für die Praxis: Die Bescheinigung ist für den Fußballverein bestimmt. Bitte tragen Sie keine Diagnosen ein. Die Aussage oben genügt.",
    ds5: "Unterlagen zum Antrag auf Spielerlaubnis (unterschriebener Antrag, Nachweise): " + DS5_ANTRAG,
    ds8: "Für Erwachsene verlangt der Verein ein Attest vom Arzt. Ohne die Erlaubnis für das Attest kann der Verein deshalb kein Spielrecht beantragen.",
  },
};
const ABSPRACHE_EINWILLIGUNG = "Mit dieser Unterschrift erlauben Sie den Trainern, die Angaben zu nutzen. Grundlage ist Art. 9 Abs. 2 lit. a DSGVO.";
const DATENSCHUTZ_TEXT = {
  attestSofort: "Ein Attest, das der Verband nicht verlangt, vernichtet der Verein sofort.",
  kontakteDaten: "Notfallkontakte: Name, Beziehung und Telefonnummer.",
  gesundheitsdaten: "Gesundheitsdaten: das Attest vom Arzt und, freiwillig, die Angaben im Notfall- und Gesundheitsbogen und die Absprache zur Medikamentengabe.",
  weitergabe: "Die Gesundheitsangaben aus dem Notfall- und Gesundheitsbogen und aus der Absprache zur Medikamentengabe sehen nur die Trainer und Betreuer der Mannschaft.",
  speicherdauer: "Notfallkontakte, Notfall- und Gesundheitsbogen und Absprache zur Medikamentengabe: bis zum Austritt oder bis zum Widerruf.",
  freiwillig: "Die Einwilligungen für Fotos, Messenger-Gruppe, Notfall- und Gesundheitsbogen und Absprache zur Medikamentengabe sind freiwillig.",
};
// Tabelle „Wofür verarbeiten wir die Daten“: neue Zeilen (links Zweck, rechts Rechtsgrundlage), in dieser Reihenfolge
const DATENSCHUTZ_ZEILEN = [
  ["Attest vom Arzt (Gesundheitsdatum)", "Art. 9 Abs. 2 lit. a DSGVO (ausdrückliche Einwilligung)"],
  ["Notfallkontakte (Name, Beziehung, Telefon)", "Art. 6 Abs. 1 lit. b DSGVO (Mitgliedschaft, Fürsorge im Training) und lit. f DSGVO (weitere Kontaktpersonen)"],
  ["Angaben zur Gesundheit im Notfall- und Gesundheitsbogen (freiwillig)", "Art. 9 Abs. 2 lit. a DSGVO (ausdrückliche Einwilligung)"],
  ["Absprache zur Medikamentengabe (freiwillig, mit Stift)", "Art. 9 Abs. 2 lit. a DSGVO (ausdrückliche Einwilligung)"],
];
// Neue Sätze in Einfacher Sprache: höchstens 12 Wörter je Satz („§“ zählt nicht, „Art.“, „Abs.“, „Nr.“ und „lit.“ beenden keinen Satz)
const NEUE_SAETZE = [
  // Runde 3
  ATTEST_TEXT.offen.wichtig, ATTEST_TEXT.offen.aufbewahrung, ABSPRACHE_EINWILLIGUNG, DATENSCHUTZ_TEXT.attestSofort, ATTEST_TEXT.offen.ds8,
  "Ohne die Absprache unten stehen auf diesem Blatt keine Angaben zur Gesundheit.", "Satzung nicht bestätigt.",
  // Runde 4: Erwachsene (verein), Restsätze bei „offen“
  ATTEST_TEXT.verein.pruefung, ATTEST_TEXT.verein.aufbewahrung, ATTEST_TEXT.verein.wichtig, "Für Erwachsene verlangt der Verein ein Attest vom Arzt.",
  "Ob der Verband beim Wechsel ein Attest verlangt, klärt der Verein noch. Braucht der Verband es, gilt dieselbe Frist.",
  ATTEST_TEXT.verein.vorlage.replace(/ Bitte tragen.*$/, ""), ATTEST_TEXT.offen.vorlage.replace(/ Bitte tragen.*$/, ""),
];
function saetzeVon(s) {
  return String(s)
    .replace(/\b(Art|Abs|Nr|lit|bzw|ggf)\./g, "$1\u0001")
    .split(/(?<=[.!?])\s+/)
    .map((z) => z.replace(/\u0001/g, ".").trim())
    .filter(Boolean);
}
const woerterVon = (satz) => satz.replace(/[.!?]$/, "").split(/\s+/).filter((w) => w && w !== "§").length;

// Seitenrahmen (Kopf- und Fußzeile) aus einem zusammengesetzten Seitentext entfernen, damit Sätze über einen Seitenumbruch passen
const ohneRahmen = (s) => s.replace(/Entwurf – vom Vorstand zu prüfen Seite \d+ von \d+/g, " ").replace(/FFV Sportfreunde 04 · Anmeldung .*? · Teil [ABC]/g, " ").replace(/\s+/g, " ");

// Alle Fundstellen einer Wortfolge in einer Wortliste (Wörter mit Koordinaten, nach Zeilen von oben nach unten sortiert);
// zurückgegeben wird jeweils das erste Wort der Folge
function fundstellen(woerter, text) {
  const tok = norm(text).split(" ");
  const sortiert = woerter.slice().sort((p, q) => q.y1 - p.y1 || p.x0 - q.x0);
  const treffer = [];
  for (let i = 0; i < sortiert.length; i++) if (tok.every((t, k) => sortiert[i + k] && sortiert[i + k].t === t)) treffer.push(sortiert[i]);
  return treffer;
}

// Sätze, die behaupten, der Verband verlange das Attest (die ärztliche Bescheinigung). Erlaubt sind die Verneinung („nicht verlangt“)
// und der offene Fall („Ob der Verband … verlangt“, „wenn der Verband es verlangt“). Meldebescheinigung zählt nicht.
function verbandVerlangtAttest(satz) {
  if (!/Attest|Bescheinigung|ärztlich/.test(satz) || !/Verband|HFV/.test(satz) || !/verlang/.test(satz)) return false;
  return !/nicht verlang|Ob der|ob der|wenn der Verband|falls der Verband|soweit der Verband/.test(satz);
}
// Text der eigenen Seiten des Vereins (Anleitung, Laufzettel, eigene Formulare, Trennblatt; nicht die Vordrucke des Verbands)
function eigenerText(texte, S) {
  return ohneRahmen(S.map((s, i) => ({ s: s, t: texte[i] })).filter((x) => ["eigen", "teil-a", "laufzettel", "trennblatt"].includes(x.s.art)).map((x) => x.t).join(" "));
}

function pruefeRunde3(c) {
  const { texte, S, e, pfad } = c;
  const u10 = e.unterlagen.find((u) => u.id === "U10");
  const art = u10 ? u10.art : "";
  const fassung = fassungVon(art);
  const andere = FASSUNGEN.filter((f) => f !== fassung);
  const seitenVon = (schluessel) => S.map((s, i) => ({ s: s, nr: i + 1 })).filter((x) => x.s.schluessel === schluessel && x.s.art === "eigen");
  const seitenText = (seiten) => ohneRahmen(seiten.map((x) => texte[x.nr - 1]).join(" "));
  // Sätze der eigenen Fassung müssen da sein, die Sätze der anderen Fassungen dürfen nicht da sein, soweit sie sich unterscheiden
  const pruefeFassung = (t, ort, schluessel) => {
    const soll = ATTEST_TEXT[fassung][schluessel];
    ok(t.includes(soll), () => ort + " (U10 „" + art + "“, Fassung „" + fassung + "“): Text „" + schluessel + "“ fehlt: " + soll);
    for (const f of andere) {
      const fremd = ATTEST_TEXT[f][schluessel];
      if (fremd !== soll && !soll.includes(fremd)) ok(!t.includes(fremd), () => ort + " (U10 „" + art + "“): Text „" + schluessel + "“ der Fassung „" + f + "“ steht da: " + fremd);
    }
  };

  // --- Runde 3 und 4: Erlaubnis für das Attest ---
  const ae = seitenVon("attest_einwilligung");
  if (ae.length) {
    const t = seitenText(ae);
    for (const k of ["pruefung", "aufbewahrung", "wichtig"]) pruefeFassung(t, "Erlaubnis für das Attest", k);
    if (fassung !== "pflicht") ok(!/weil der Verband die Bescheinigung verlangt/.test(t) && !/mindestens zwei Jahre ab dem Antrag auf/.test(t), "Erlaubnis für das Attest bei U10 „" + art + "“: keine Behauptung, dass der Verband die Bescheinigung verlangt");
    if (fassung === "verein") ok(!/Jugendordnung|Spielordnung/.test(t), "Erlaubnis für das Attest bei Erwachsenen: keine Berufung auf Jugend- oder Spielordnung des Verbands");
  }

  // --- Runde 4: Hinweis für die Praxis auf der Attest-Vorlage ---
  const av = seitenVon("attest_vorlage");
  if (av.length) {
    const t = seitenText(av);
    pruefeFassung(t, "Attest-Vorlage", "vorlage");
    if (fassung !== "pflicht") ok(!/Jugendordnung/.test(t) && !/Hessischen Fußball-Verband bestimmt/.test(t), "Attest-Vorlage bei U10 „" + art + "“: keine Berufung auf die Jugendordnung, nicht als Verbandsunterlage bezeichnet");
  }

  // --- Runde 4: keine Behauptung „der Verband verlangt das Attest“ auf den eigenen Seiten bei „offen“ und „verein“ (auch nicht in Anleitung,
  //     Laufzettel oder Trennblatt); bei „pflicht“ gibt es sie (Gegenprobe, damit die Suche nicht ins Leere läuft) ---
  const dsSeiten = seitenVon("datenschutz");
  if (u10) {
    const eigeneSaetze = saetzeVon(eigenerText(texte, S));
    const behauptungen = eigeneSaetze.filter(verbandVerlangtAttest);
    if (fassung === "pflicht") {
      if (dsSeiten.length) ok(behauptungen.length >= 1, "Gegenprobe: bei U10 „" + art + "“ erkennt die Suche die Sätze „der Verband verlangt das Attest“");
    } else {
      ok(behauptungen.length === 0, () => "U10 „" + art + "“: Sätze, die behaupten, der Verband verlange das Attest: " + JSON.stringify(behauptungen));
    }
    if (fassung === "verein") {
      const berufung = eigeneSaetze.filter((s) => /Attest|Bescheinigung/.test(s) && /Jugendordnung|Spielordnung/.test(s));
      ok(berufung.length === 0, () => "U10 „verein“: Attest-Sätze mit Berufung auf Jugend- oder Spielordnung: " + JSON.stringify(berufung));
    }
  }

  // --- Runde 3 und 4: Information zum Datenschutz ---
  const ds = dsSeiten;
  if (ds.length) {
    const t = seitenText(ds);
    Object.entries(DATENSCHUTZ_TEXT).forEach(([schluessel, satz]) => {
      ok(t.includes(satz), () => "Information zum Datenschutz: Text „" + schluessel + "“ fehlt: " + satz);
    });
    // Nr. 8: Fassung passend zur Art von U10
    pruefeFassung(t, "Information zum Datenschutz Nr. 8", "ds8");
    // Nr. 5, erster Punkt: das Attest steht nur bei „pflicht“ in den Unterlagen, die der Verband verlangt; bei „offen“ folgt der offene Satz;
    // danach kommt in allen Fassungen der Punkt zum Attest, das der Verband nicht verlangt
    const punkt5 = ATTEST_TEXT[fassung].ds5 + " • " + DATENSCHUTZ_TEXT.attestSofort;
    ok(t.includes(punkt5), () => "Information zum Datenschutz Nr. 5 (Fassung „" + fassung + "“): erster Punkt und Attest-Punkt fehlen oder weichen ab: " + punkt5);
    ok(t.includes("Nachweise, Attest)") === (fassung === "pflicht"), "Information zum Datenschutz Nr. 5: das Attest steht nur bei „pflicht“ in der Liste der Unterlagen zum Antrag (Fassung „" + fassung + "“)");
    ok(t.includes("gilt dieselbe Frist") === (fassung === "offen"), "Information zum Datenschutz Nr. 5: der Satz zur Frist beim Wechsel steht nur bei „offen“ (Fassung „" + fassung + "“)");
    // Reihenfolge in Nr. 5: erst die Unterlagen zum Antrag, dann das Attest, das der Verband nicht verlangt, dann die Notfalldaten
    const iA = t.indexOf("Unterlagen zum Antrag auf Spielerlaubnis");
    const iB = t.indexOf(DATENSCHUTZ_TEXT.attestSofort);
    const iC = t.indexOf(DATENSCHUTZ_TEXT.speicherdauer);
    ok(iA >= 0 && iA < iB && iB < iC, "Information zum Datenschutz Nr. 5: Reihenfolge der Speicherfristen");
    // Tabelle: Zweck links, Rechtsgrundlage rechts, in derselben Zeile und in der vorgegebenen Reihenfolge
    // Trennlinie der Spalten: links von der Überschrift „Rechtsgrundlage“ der Tabelle (Spalten 62 zu 38 der Textbreite)
    const kopf = ds.map((s) => woerterSeite(pfad, s.nr).find((w) => w.t === "Rechtsgrundlage")).find(Boolean);
    ok(Boolean(kopf), "Information zum Datenschutz, Tabelle: Spaltenüberschrift „Rechtsgrundlage“ vorhanden");
    const TRENN = kopf ? kopf.x0 - 1 : 358;
    const ys = [];
    let alle = true;
    for (const [links, rechts] of DATENSCHUTZ_ZEILEN) {
      // links und rechts können mehrfach vorkommen (gleiche Rechtsgrundlage in mehreren Zeilen): das Paar mit dem kleinsten Zeilenversatz zählt
      let gefunden = null;
      for (const s of ds) {
        const w = woerterSeite(pfad, s.nr);
        const ls = fundstellen(w.filter((x) => x.x0 < TRENN - 1), links);
        const rs = fundstellen(w.filter((x) => x.x0 >= TRENN), rechts);
        for (const l of ls) for (const r of rs) {
          const dy = Math.abs(l.y1 - r.y1);
          if (!gefunden || dy < gefunden.dy) gefunden = { seite: s.nr, y: l.y1, dy: dy };
        }
      }
      ok(gefunden !== null && gefunden.dy < 3, () => "Information zum Datenschutz, Tabelle: Zeile „" + links + " | " + rechts + "“ " + (gefunden ? "steht in verschiedenen Zeilen (Versatz " + gefunden.dy.toFixed(1) + " pt)" : "fehlt"));
      if (!gefunden) alle = false;
      else ys.push(gefunden.seite * 10000 - gefunden.y);
    }
    if (alle) ok(ys.every((y, i) => i === 0 || y > ys[i - 1]), "Information zum Datenschutz, Tabelle: Reihenfolge der Zeilen Attest, Notfallkontakte, Angaben zur Gesundheit, Absprache");
    // die alte Zeile „Notfall- und Gesundheitsbogen (freiwillig)“ gibt es nicht mehr
    ok(!ds.some((s) => zeilenSeite(pfad, s.nr).some((z) => /^\s*Notfall- und Gesundheitsbogen \(freiwillig\)/.test(z))), "Information zum Datenschutz, Tabelle: die alte Zeile „Notfall- und Gesundheitsbogen (freiwillig)“ ist ersetzt");
  }
}

// Alle Prüfungen für ein PDF
async function pruefePdf(b, g, opt) {
  const { r, bericht, pfad } = g;
  const a = b.a;
  const e = b.e;
  const heuteDe = datumDe(b.heute);
  const bytes = r.bytes;
  const info = pdfinfoDaten(pfad);
  const texte = textSeiten(pfad);
  const S = bericht.seiten;
  const name = a.vorname + " " + a.nachname;
  const ortDatum = a.anschrift.ort + ", " + heuteDe;

  // --- Aufbau ---
  ok(r.seiten === Number(info.Pages), "Seitenzahl " + r.seiten + " ≠ pdfinfo " + info.Pages);
  ok(texte.length === r.seiten && S.length === r.seiten, "Text, Bericht und Ergebnis haben unterschiedlich viele Seiten (" + texte.length + "/" + S.length + "/" + r.seiten + ")");
  ok(bytes.length < 15 * 1024 * 1024, "Datei ist " + bytes.length + " Byte groß (Grenze 15 MB)");
  ok(r.dateiname === dateiname(a) && /^Anmeldung_[A-Za-z0-9-]+_[A-Za-z0-9-]+\.pdf$/.test(r.dateiname), "Dateiname " + r.dateiname);
  const teile = r.teile;
  ok(teile.length >= 2 && teile[0].teil === "A" && teile[1].teil === "B", "Teile müssen mit A und B beginnen: " + JSON.stringify(teile.map((t) => t.teil)));
  ok(teile.map((t) => t.teil).join("") === S.map((s) => s.teil).filter((t, i, arr) => arr.indexOf(t) === i).join(""), "Reihenfolge der Teile weicht vom Bericht ab");
  ok(teile[0].vonSeite === 1 && teile.every((t, i) => t.vonSeite <= t.bisSeite && (i === 0 || t.vonSeite === teile[i - 1].bisSeite + 1)) && teile[teile.length - 1].bisSeite === r.seiten, "Teile schließen nicht lückenlos an: " + JSON.stringify(teile));
  ok(teile.every((t) => S.slice(t.vonSeite - 1, t.bisSeite).every((s) => s.teil === t.teil)), "Seiten gehören nicht zum Teil, dem sie zugeordnet sind");
  ok(teile.find((t) => t.teil === "A").titel === "Für Sie" && teile.find((t) => t.teil === "B").titel === "Für den Verein", "Titel von Teil A und B");
  const teilC = teile.find((t) => t.teil === "C");
  const brauchtC = e.formulare.includes("attest") || e.formulare.includes("notfall") || Boolean(b.bilder.nachweise.U10);
  ok(Boolean(teilC) === brauchtC, "Teil C nur bei Attest, Notfallbogen oder Attest-Kopie: erwartet " + brauchtC + ", vorhanden " + Boolean(teilC));
  if (teilC) {
    ok(teilC.titel === "Vertraulich – getrennt abgeben", "Titel von Teil C");
    ok(/Teil C – Vertraulich/.test(texte[teilC.vonSeite - 1]) && S[teilC.vonSeite - 1].art === "trennblatt", "Teil C beginnt mit dem Trennblatt");
    ok(S.slice(teilC.vonSeite).every((s) => s.art !== "vorlage"), "in Teil C liegen keine Vordrucke des Verbands");
  }
  ok(S.filter((s) => s.teil === "A").every((s) => s.art === "teil-a"), "Teil A besteht nur aus der Anleitung");
  ok(S[teile[1].vonSeite - 1].art === "laufzettel", "Teil B beginnt mit dem Laufzettel");

  // --- Kopf und Fuß aller eigenen Seiten ---
  S.forEach((s, i) => {
    if (!s.eigen) return;
    const kopf = "FFV Sportfreunde 04 · Anmeldung " + name + " · Teil " + s.teil;
    ok(texte[i].includes(kopf) && texte[i].includes("Seite " + (i + 1) + " von " + r.seiten), () => "Seite " + (i + 1) + ": Kopf „" + kopf + "“ oder Fuß „Seite " + (i + 1) + " von " + r.seiten + "“ fehlt");
    if (s.entwurf) ok(texte[i].includes("Entwurf – vom Vorstand zu prüfen"), () => "Seite " + (i + 1) + " (" + s.schluessel + "): Vermerk „Entwurf – vom Vorstand zu prüfen“ fehlt");
  });
  const datenschutzSeiten = S.filter((s) => s.schluessel === "datenschutz");
  ok(datenschutzSeiten.length > 0 && datenschutzSeiten.every((s) => s.entwurf), "Datenschutzinformation trägt den Entwurfsvermerk in der Fußzeile");

  // --- enthaltene Vordrucke gegen e.formulare ---
  const formulare = e.formulare.filter((f) => f !== "familienliste");
  const bereich = (schluessel) => S.map((s, i) => ({ s: s, nr: i + 1 })).filter((x) => x.s.schluessel === schluessel);
  const ohneVorlage = e.formulare.includes("attest") && Boolean(b.bilder.nachweise.U10);
  let letzteNr = teile[1].vonSeite;
  for (const f of formulare) {
    if (f === "attest") continue;
    const seg = bereich(f);
    if (!ok(seg.length > 0, "Formular " + f + " fehlt im PDF")) continue;
    const marker = FORM_MARKER[f];
    ok(marker.test(texte[seg[0].nr - 1]), "Formular " + f + ": Kennzeichen auf Seite " + seg[0].nr + " nicht gefunden");
    ok(seg.every((x, i) => i === 0 || x.nr === seg[i - 1].nr + 1), "Formular " + f + " liegt nicht zusammenhängend");
    const erwSeiten = konfig.formulare.formulare[f] ? konfig.formulare.formulare[f].seiten : null;
    if (erwSeiten) ok(seg.length === erwSeiten, "Formular " + f + ": " + seg.length + " statt " + erwSeiten + " Seiten");
    if (f !== "notfall") ok(seg[0].nr > letzteNr - 1, "Reihenfolge der Formulare: " + f + " steht zu früh");
    if (f !== "notfall") letzteNr = seg[seg.length - 1].nr;
    const ausserhalb = S.some((s, i) => s.schluessel !== f && ["vorlage", "eigen", "nachweis", "foto"].includes(s.art) && marker.test(texte[i]));
    ok(!ausserhalb, "Formular " + f + " kommt auf einer fremden Seite vor");
  }
  for (const f of ["aufnahmeantrag", "datenschutz", "hfv_antrag", "vollmacht", "abmeldung", "einverstaendnis_senioren", "einverstaendnis_maedchen", "einverstaendnis_fahrten", "karneval_auftritte", "notfall"]) {
    if (!formulare.includes(f)) ok(bereich(f).length === 0, "Formular " + f + " gehört nicht zu diesem Fall, steht aber im PDF");
  }
  const attestPflicht = e.formulare.includes("attest") || Boolean(b.bilder.nachweise.U10);
  ok(bereich("attest_vorlage").length === (e.formulare.includes("attest") && !b.bilder.nachweise.U10 ? 1 : 0), "Attest-Vorlage: nur ohne Attest-Kopie");
  ok(bereich("attest_einwilligung").length === (attestPflicht ? 1 : 0), "Einwilligung zum Attest gehört zu jedem Attest");
  ok(!ohneVorlage || bereich("U10").every((x) => x.s.teil === "C"), "Attest-Kopie gehört nach Teil C");
  ok(S.filter((s) => s.teil === "B" && s.schluessel === "U10").length === 0, "Attest-Kopie darf nicht in Teil B stehen");

  // --- Pflichtwerte ---
  const gesamt = texte.join("\n");
  ok(gesamt.includes(a.nachname) && gesamt.includes(a.vorname), "Nachname und Vorname stehen im Text");
  ok(gesamt.includes(datumDe(a.geburtsdatum)), "Geburtsdatum " + datumDe(a.geburtsdatum) + " steht im Text");
  ok(gesamt.includes(konfig.verein.name_register) || gesamt.includes("Sportfreunde"), "Vereinsname steht im Text");
  const lz = S.map((s, i) => ({ s: s, t: texte[i] })).filter((x) => x.s.art === "laufzettel").map((x) => x.t).join(" ");
  ok(lz.length > 200, "Laufzettel ist vorhanden");

  // --- Laufzettel ---
  e.faelle.forEach((f) => ok(lz.includes(f + " – "), "Laufzettel nennt Fall " + f));
  e.faelle.forEach((f) => ok(lz.includes(norm(deRegeln.faelle[f]).slice(0, 40)), "Laufzettel nennt den Klartext zu " + f));
  e.unterlagen.forEach((u) => ok(new RegExp("\\b" + u.id + "\\b").test(lz), "Laufzettel nennt Unterlage " + u.id));
  const statusMuster = /liegt bei \(Seite \d+(–\d+)?\)|fehlt|klären|Verein klärt|Verein erhebt|Verein macht das Foto|Original zeigen|siehe unten|Datei nicht lesbar/;
  ok(statusMuster.test(lz), "Laufzettel nennt Status der Unterlagen");
  ok(lz.includes("Version " + e.version) && lz.includes("Stand " + konfig.anmeldung.stand), "Laufzettel nennt Regelwerk-Version und Stand");
  ["Eingang am", "geprüft von", "DFBnet-Antrag gestellt am", "Spielberechtigung erteilt am", "Originale abgelegt am", "Löschung am"].forEach((w) => ok(lz.includes(w), "Laufzettel hat das Bearbeitungsfeld „" + w + "“"));
  {
    const lzSeiten = S.map((s, i) => ({ s: s, t: texte[i] })).filter((x) => x.s.art === "laufzettel");
    const seiteMit = (w) => lzSeiten.findIndex((x) => x.t.includes(w));
    ok(seiteMit("Bearbeitung durch den Verein") >= 0 && seiteMit("Bearbeitung durch den Verein") === seiteMit("Eingang am") && seiteMit("Eingang am") === seiteMit("Löschung am"), "Laufzettel: der Block „Bearbeitung durch den Verein“ steht zusammen auf einer Seite");
  }
  ok(lz.includes(e.international ? "ja (Freigabe über den DFB)" : "International: nein"), "Laufzettel zeigt, ob das internationale Verfahren nötig ist");
  ok(lz.includes(deRegeln.status[e.status] || "kein Spielrecht beantragt"), "Laufzettel nennt die Art der Anmeldung");
  if (a.spielen === true && e.status) {
    ok(lz.includes("Regel: " + e.frist.regel), "Laufzettel nennt die Regel der Frist (" + e.frist.regel + ")");
    if (e.frist.unsicher) ok(lz.includes("unsicher"), "Laufzettel zeigt eine unsichere Frist");
    if (e.frist.pflichtspieleAb) ok(lz.includes(datumDe(e.frist.pflichtspieleAb)), "Laufzettel nennt den Tag, ab dem Pflichtspiele möglich sind");
  }
  const iban = String((a.zahlung || {}).iban || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (iban) {
    ok(!lz.replace(/\s/g, "").includes(iban), "Laufzettel darf die volle IBAN nicht enthalten");
    ok(lz.replace(/\s/g, "").includes("*" + iban.slice(-4)) || lz.replace(/\s/g, "").includes(iban.slice(-4)), "Laufzettel zeigt die letzten vier Stellen der IBAN");
    ok(lz.replace(/\s/g, "").includes("****"), "Laufzettel verdeckt die übrigen Stellen der IBAN");
    const teileText = S.map((s, i) => ({ s: s, t: texte[i] })).filter((x) => x.s.art !== "vorlage" || x.s.schluessel !== "aufnahmeantrag");
    ok(teileText.every((x) => !x.t.replace(/\s/g, "").includes(iban)), "die volle IBAN steht nur im SEPA-Mandat des Aufnahmeantrags");
  }
  liste(e.weiterleitung).forEach((w) => ok(lz.includes(norm(deRegeln.weiterleitung[w.key]).slice(0, 30)), "Laufzettel nennt die Weiterleitung " + w.an + ":" + w.key));
  if (a.geburtsort) ok(lz.includes(a.geburtsort) || a.spielen !== true, "Laufzettel nennt den Geburtsort für DFBnet");
  if (a.spielen === true) {
    ok(lz.includes("Angaben für DFBnet"), "Laufzettel enthält die DFBnet-Zusatzangaben");
    staatenErwartet(a).forEach((s) => ok(lz.includes(s), "Laufzettel nennt die Staatsangehörigkeit " + s));
    if (a.auslandGewohnt === "ja" && a.auslandLand) ok(lz.includes(landName(a.auslandLand)), "Laufzettel nennt das Land des letzten Wohnorts im Ausland");
  }
  if (e.minderjaehrig) (a.sorgeberechtigte || []).forEach((p) => ok(lz.includes(p.vorname + " " + p.nachname), "Laufzettel nennt die Person mit Sorgerecht " + p.vorname));
  ok(lz.includes("Beitrag und Zahlung") && (a.zahlung.art !== "sepa" || lz.includes("SEPA-Lastschrift")), "Laufzettel nennt Beitrag und Zahlungsart");
  if (a.satzung !== true) ok(lz.includes("Aufnahmeantrag Seite 1") && lz.includes("Satzung zur Kenntnis genommen"), "Laufzettel nennt das offene Kästchen zur Satzung");
  else ok(!lz.includes("Satzung zur Kenntnis genommen"), "Laufzettel nennt kein offenes Kästchen zur Satzung, wenn es angekreuzt ist");
  if (a.zahlung.art === "sepa") ok(lz.includes("Mandatsreferenz"), "Laufzettel weist auf die gleiche Mandatsreferenz aller Mitglieder hin");
  ok(norm(lz).includes("Regelwerk Version " + e.version), "Laufzettel nennt am Ende Version und Stand des Regelwerks");

  // --- Teil A ---
  const ta = S.map((s, i) => ({ s: s, t: texte[i] })).filter((x) => x.s.art === "teil-a").map((x) => x.t).join(" ");
  ["Ihre Anmeldung", "So geht es weiter", "Wo unterschreiben Sie?", "Das fehlt noch", "So erreichen Sie uns"].forEach((w) => ok(ta.includes(w), "Teil A hat den Abschnitt „" + w + "“"));
  ok(ta.includes("069 736868") && ta.includes("geschaeftsstelle@sportfreunde04.de"), "Teil A nennt die Kontakte des Vereins");
  if (a.spielen === true && e.status) {
    ok(ta.includes("Wann darf gespielt werden?") && ta.includes("Der Verein prüft das genau"), "Teil A nennt die geschätzte Wartezeit mit dem Hinweis „Der Verein prüft das genau“");
    ok(ta.includes(norm(TEXTE_TEIL_A[e.frist.unsicher ? "wartezeitUnsicher" : "wartezeitSchaetzung"])), "Teil A trennt sichere und unsichere Fristen");
  }
  e.fehlend.forEach((id) => ok(ta.includes(norm(deRegeln.unterlagen[id].name)), "Teil A nennt die fehlende Unterlage " + id));
  if (!e.fehlend.length) ok(ta.includes("Es fehlt nichts"), "Teil A sagt, dass nichts fehlt");
  ok(ta.includes(TEIL_NAME.A + " (Seite 1 bis " + teile[0].bisSeite + ")") && ta.includes(TEIL_NAME.B + " (Seite " + teile[1].vonSeite + " bis " + teile[1].bisSeite + ")"), "Teil A nennt die Teile mit ihren Namen und Seiten");
  if (teilC) ok(ta.includes(TEIL_NAME.C + " (Seite " + teilC.vonSeite + " bis " + teilC.bisSeite + ")") && ta.includes("Geben Sie Teil C getrennt ab"), "Teil A erklärt Teil C");
  ok(ta.includes("Schicken Sie die Datei nicht per WhatsApp"), "Teil A warnt vor WhatsApp");
  const stiftFamilie = e.unterschriften.filter((u) => u.wer !== "arzt" && u.wer !== "verein" && erwarteteArt(b, u) === "stift");
  const hfvStift = stiftFamilie.filter((u) => ["hfv_antrag", "vollmacht", "abmeldung", "einverstaendnis_senioren"].includes(u.formular));
  if (!stiftFamilie.length) ok(ta.includes(norm(TEXTE_TEIL_A.stiftKeine)), "Teil A: alles am Bildschirm unterschrieben");
  else if (a.unterschriftWeg === "papier") ok(ta.includes(norm(a.hfvUnterschrift === "training" ? TEXTE_TEIL_A.stiftAlleTraining : TEXTE_TEIL_A.stiftAlleDrucken)), "Teil A: alles auf Papier");
  else if (hfvStift.length) ok(ta.includes(norm(a.hfvUnterschrift === "training" ? TEXTE_TEIL_A.stiftTraining : TEXTE_TEIL_A.stiftDrucken)), "Teil A: Blätter des Verbands mit Stift (" + a.hfvUnterschrift + ")");
  e.unterschriften.filter((u) => u.wer !== "arzt" || bereich("attest_vorlage").length).forEach((u) => {
    const zeile = deRegeln.unterschriften[u.formular + "." + u.stelleKey];
    ok(ta.includes(norm(zeile).slice(0, 30)), "Teil A führt die Unterschrift " + u.formular + "." + u.stelleKey + " auf");
  });
  if (a.satzung !== true) ok(ta.includes("das Kästchen zur Satzung an"), "Teil A bittet, das Kästchen zur Satzung anzukreuzen");
  else ok(!ta.includes("das Kästchen zur Satzung an"), "Teil A verlangt kein Kästchen zur Satzung, wenn es schon angekreuzt ist");

  // Seitenzahlen in Teil A und im Laufzettel stimmen mit dem fertigen PDF überein
  for (const z of bericht.stellen.filter((s) => (s.art === "bild" || s.art === "stift") && !s.zusatz)) {
    const label = deRegeln.unterschriften[z.formular + "." + z.stelleKey];
    ok(new RegExp("\\b" + z.seite + " " + norm(label).slice(0, 18).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).test(ta), () => "Teil A nennt für " + z.formular + "." + z.stelleKey + " nicht die Seite " + z.seite);
  }
  const pl = bericht.plan.formulare;
  const zeilenNummer = (id) => {
    const m = new RegExp("\\b" + id + " .*?liegt bei \\(Seite (\\d+)").exec(lz);
    return m ? Number(m[1]) : null;
  };
  const erwStatus = { U01: pl.aufnahmeantrag && pl.aufnahmeantrag.von, U04: pl.aufnahmeantrag && pl.aufnahmeantrag.von + 2, U05: pl.aufnahmeantrag && pl.aufnahmeantrag.von + 3, U06: pl.datenschutz && pl.datenschutz.von, U07: pl.hfv_antrag && pl.hfv_antrag.von, U08: pl.hfv_antrag && pl.hfv_antrag.von + 2, U28: pl.notfall && pl.notfall.von, U29: pl.einverstaendnis_fahrten && pl.einverstaendnis_fahrten.von };
  for (const [id, seite] of Object.entries(erwStatus)) {
    if (!seite || !e.unterlagen.some((u) => u.id === id)) continue;
    ok(zeilenNummer(id) === seite, () => "Laufzettel: " + id + " liegt laut Status auf Seite " + zeilenNummer(id) + ", tatsächlich auf Seite " + seite);
  }
  for (const [key, r] of Object.entries(pl)) {
    if (key === "attest" || !r) continue;
    const titel = deRegeln.formulare[key] || key;
    ok(new RegExp("\\b" + (r.von === r.bis ? r.von : r.von + "–" + r.bis) + " (?:Teil C: )?" + norm(titel).slice(0, 20).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).test(lz), () => "Laufzettel „Inhalt dieser Datei“ nennt für " + key + " nicht die Seiten " + r.von + "–" + r.bis);
  }
  if (bericht.plan.attestVorlage) ok(ta.includes(ATTEST_VORLAGE_TITEL + " steht auf Seite " + bericht.plan.attestVorlage.von), "Teil A nennt die Seite des Blatts „" + ATTEST_VORLAGE_TITEL + "“");
  if (a.satzung !== true && pl.aufnahmeantrag) ok(ta.includes("Aufnahmeantrag auf Seite " + pl.aufnahmeantrag.von + " das Kästchen zur Satzung an"), "Teil A nennt die Seite mit dem Kästchen zur Satzung");

  // --- Metadaten ---
  ok(info.Title === "Anmeldung FFV Sportfreunde 04 – " + name, "Titel: " + info.Title);
  const sb = a.sorgeberechtigte || [];
  const unterzeichner = e.minderjaehrig && sb[0] ? sb[0].vorname + " " + sb[0].nachname : name;
  ok(info.Author === unterzeichner, "Autor: " + info.Author + ", erwartet " + unterzeichner);
  ok(/^Anmelde-Assistent/.test(info.Creator || "") && /^Anmelde-Assistent/.test(info.Producer || ""), "Ersteller und Erzeuger sind der Assistent: " + info.Creator + " / " + info.Producer);
  ok(info["Metadata Stream"] === "no" && info.Form === "none" && info.Encrypted === "no", "kein XMP, keine Formularfelder, nicht verschlüsselt");
  ok(!/Adobe|Microsoft|Word|Acrobat|LibreOffice|Quartz|InDesign|Distiller|PScript/i.test(Object.values(info).join(" ")), "Metadaten enthalten keine Namen aus den Vorlagen");
  const doc = await PDFLib.PDFDocument.load(bytes, { updateMetadata: false });
  ok(doc.catalog.get(PDFLib.PDFName.of("Lang")) && String(doc.catalog.get(PDFLib.PDFName.of("Lang")).decodeText()) === "de-DE", "Sprache de-DE gesetzt");
  ok(doc.catalog.get(PDFLib.PDFName.of("Metadata")) === undefined, "kein XMP-Strom im Katalog");
  let infoWoerterbuecher = 0;
  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    if (obj instanceof PDFLib.PDFDict && (obj.has(PDFLib.PDFName.of("Producer")) || obj.has(PDFLib.PDFName.of("Author")))) infoWoerterbuecher += 1;
    if (obj instanceof PDFLib.PDFStream && obj.dict.get(PDFLib.PDFName.of("Type")) === PDFLib.PDFName.of("Metadata")) ok(false, "ein Metadaten-Strom (XMP) ist im PDF geblieben");
  }
  ok(infoWoerterbuecher === 1, "es gibt genau ein Info-Wörterbuch (gefunden: " + infoWoerterbuecher + ")");

  // --- Farben: kein Rot auf eigenen Seiten ---
  let rot = 0;
  S.forEach((s, i) => {
    if (!s.eigen) return;
    const inhalt = inhaltSeite(doc, i);
    for (const m of inhalt.matchAll(/(-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (rg|RG)\b/g)) {
      const [rr, gg, bb] = [Number(m[1]), Number(m[2]), Number(m[3])];
      if (rr > 0.55 && gg < 0.35 && bb < 0.35) rot += 1;
    }
  });
  ok(rot === 0, "auf den eigenen Seiten kommt eine rote Farbe vor (" + rot + ")");

  // --- Unterschriften ---
  const woerter = {};
  const grau = {};
  const stellenAlle = bericht.stellen.filter((s) => s.art === "bild" || s.art === "stift");
  const stellen = stellenAlle.filter((s) => !s.zusatz); // Stellen der Regeln (und Rückfälle, die es nie geben soll)
  const zusatzStellen = stellenAlle.filter((s) => s.zusatz); // Stift-Zeilen der Medikamenten-Absprache
  const bilderSeite = opt.bilder === false ? null : bilderJeSeite(pfad);
  for (const u of e.unterschriften) {
    const z = stellen.find((s) => s.formular === u.formular && s.stelleKey === u.stelleKey);
    if (u.formular === "attest" && u.stelleKey === "arzt" && !bereich("attest_vorlage").length) {
      ok(!z, "attest.arzt wird ohne Vorlage nicht gezeichnet");
      continue;
    }
    if (!ok(Boolean(z), "Unterschriftsstelle " + u.formular + "." + u.stelleKey + " fehlt im PDF")) continue;
    const art = erwarteteArt(b, u);
    ok(z.art === art, "Unterschrift " + u.formular + "." + u.stelleKey + " (" + u.wer + ") ist „" + z.art + "“, erwartet „" + art + "“");
    ok(z.wer === u.wer, "Unterschrift " + u.formular + "." + u.stelleKey + ": wer " + z.wer + " ≠ " + u.wer);
    const seg = S[z.seite - 1];
    ok(seg && (seg.schluessel === u.formular || (u.formular === "attest" && /^attest_/.test(seg.schluessel))), "Unterschrift " + u.formular + "." + u.stelleKey + " steht auf Seite " + z.seite + " (" + (seg && seg.schluessel) + ")");
    if (art === "stift") {
      const werText = u.wer === "sorgeberechtigte_beide" && a.sorge === "getrennt_bei_mir" ? "zweiter Elternteil (nötig)" : WER_TEXT[u.wer];
      ok(texte[z.seite - 1].includes(werText) || texte[z.seite - 1].includes(werText.split(" ").slice(0, 3).join(" ")), () => "Markierung mit „" + werText + "“ fehlt auf Seite " + z.seite);
    }
    if (art === "bild" && u.formular === "aufnahmeantrag") {
      const hf = konfig.formulare.formulare.aufnahmeantrag.handfelder.find((h) => h.key === { "s2.unterschrift": "s2.ort_datum", "s2.unterschrift_sorgeberechtigte": "s2.ort_datum", "s3.unterschrift": "s3.ort_datum", "s4.unterschrift": "s4.ort_datum" }[u.stelleKey]);
      const nr = S.findIndex((x) => x.schluessel === "aufnahmeantrag") + hf.seite;
      if (!woerter[nr]) woerter[nr] = woerterSeite(pfad, nr);
      ok(norm(textImRechteck(woerter[nr], [hf.x - 1, hf.y - 3, hf.breite + 2, 13], 0)) === ortDatum, () => "Ort und Datum „" + ortDatum + "“ fehlen neben der Unterschrift " + u.stelleKey + " (Seite " + nr + "), gelesen „" + textImRechteck(woerter[nr], [hf.x - 1, hf.y - 3, hf.breite + 2, 13], 0) + "“");
    }
    if (art === "bild" && ["datenschutz", "einverstaendnis_fahrten", "einverstaendnis_maedchen", "karneval_auftritte", "notfall", "attest"].includes(u.formular)) ok(texte[z.seite - 1].includes(ortDatum), "Ort und Datum fehlen bei " + u.formular + " auf Seite " + z.seite);
    if (["hfv_antrag", "vollmacht", "abmeldung", "einverstaendnis_senioren"].includes(u.formular)) ok(art === "stift", "HFV-Vordruck " + u.formular + "." + u.stelleKey + " wird nie am Bildschirm unterschrieben");
    if (u.wer === "arzt" || u.wer === "verein") ok(art === "stift", u.wer + " unterschreibt nie am Bildschirm");
  }
  ok(stellenAlle.length === bericht.stellen.filter((s) => s.art !== "nein-hinweis").length, "alle gezeichneten Stellen sind bekannt");
  ok(stellen.every((s) => e.unterschriften.some((u) => u.formular === s.formular && u.stelleKey === s.stelleKey)), () => "es werden nur Stellen gezeichnet, die die Regeln verlangen: " + stellen.filter((s) => !e.unterschriften.some((u) => u.formular === s.formular && u.stelleKey === s.stelleKey)).map((s) => s.formular + "." + s.stelleKey).join(", "));
  ok(zusatzStellen.every((s) => s.art === "stift" && s.formular === "notfall" && ["absprache_eltern", "absprache_trainer"].includes(s.stelleKey)), "Zusatz-Stellen sind nur die Stift-Zeilen der Medikamenten-Absprache im Notfallbogen");
  // Markierungen je Seite zählen
  const stiftJeSeite = {};
  stellenAlle.filter((s) => s.art === "stift").forEach((s) => (stiftJeSeite[s.seite] = (stiftJeSeite[s.seite] || 0) + 1));
  S.forEach((s, i) => {
    const n = zaehle(texte[i], /Hier mit Stift unterschreiben/g);
    ok(n === (stiftJeSeite[i + 1] || 0), () => "Seite " + (i + 1) + " hat " + n + " Markierungen „Hier mit Stift unterschreiben“, erwartet " + (stiftJeSeite[i + 1] || 0));
  });
  // Bilder je Seite: Unterschriften, Foto, Nachweise
  if (bilderSeite) {
    const bildStellen = {};
    stellen.filter((s) => s.art === "bild").forEach((s) => (bildStellen[s.seite] = (bildStellen[s.seite] || 0) + 1));
    S.forEach((s, i) => {
      const nr = i + 1;
      let basis = 0;
      if (s.art === "vorlage") basis = (BASIS_BILDER[s.schluessel] || {})[nr - bereich(s.schluessel)[0].nr + 1] || 0;
      else if (s.art === "foto") basis = 1;
      else if (s.art === "nachweis") {
        const dateien = bericht.nachweise.filter((n) => n.id === s.schluessel);
        if (dateien.some((n) => n.art === "pdf")) return; // Seiten aus PDFs bringen eigene Bilder mit
        basis = 1;
      }
      const ist = bilderSeite[nr] || 0;
      const soll = basis + (bildStellen[nr] || 0);
      ok(ist === soll, () => "Seite " + nr + " (" + s.art + " " + (s.schluessel || "") + ") zeigt " + ist + " Bilder, erwartet " + soll + " (" + basis + " Vordruck oder Foto, " + (bildStellen[nr] || 0) + " Unterschriften)");
    });
  }
  // HFV: kein vorausgefülltes Datum, Einwilligungen a und b
  const hfv = bereich("hfv_antrag");
  if (hfv.length) {
    hfv.forEach((x) => ok(!texte[x.nr - 1].includes(ortDatum), "HFV-Antrag Seite " + x.nr + " trägt kein vorausgefülltes Ort und Datum"));
    const s3 = texte[hfv[2].nr - 1];
    const verlangt = (k) => e.unterschriften.some((u) => u.formular === "hfv_antrag" && u.stelleKey === k);
    const erwHinweise = (verlangt("einwilligung_a") ? 0 : 1) + (verlangt("einwilligung_b") ? 0 : 1);
    ok(zaehle(s3, /Nicht unterschreiben – Sie haben Nein gewählt|Nicht nötig: gilt nur für Kinder unter 16 Jahren/g) === erwHinweise, "HFV-Antrag Seite 3: Hinweise bei Nein („Nicht unterschreiben“): erwartet " + erwHinweise);
    ok(verlangt("einwilligung_a") === Boolean(a.einwilligungen.hfvName && e.alter < 16), "Einwilligung a nur bei Zustimmung und unter 16 Jahren");
    ok(verlangt("einwilligung_b") === Boolean(a.einwilligungen.hfvFoto), "Einwilligung b nur bei Zustimmung");
    const felder = bericht.felder.filter((f) => f.formular === "hfv_antrag");
    ok(!felder.some((f) => ["Text2", "Text6", "Antragsdatum"].includes(f.feld)), "Datumsfelder der HFV-Einwilligungen und Antragsdatum bleiben leer");
  }

  // --- Nichts aus den Vordrucken verdecken: Flächen, die pdf.js beschreibt, gegen die Wörter der Originalvorlage ---
  if (opt.tief) {
    const flaechen = liste(bericht.flaechen).filter((f) => S[f.seite - 1].art === "vorlage");
    ok(flaechen.length > 0, "auf den Vordrucken gibt es Einträge, die geprüft werden");
    for (const f of flaechen) {
      const key = S[f.seite - 1].schluessel;
      const rel = f.seite - bereich(key)[0].nr;
      const kollisionen = vorlagenWoerter(key, rel).filter((w) => Math.min(w.x1, f.x + f.b) - Math.max(w.x0, f.x) > 0.6 && Math.min(w.y1, f.y + f.h) - Math.max(w.y0, f.y) > 1.2);
      ok(kollisionen.length === 0, () => "Eintrag „" + f.art + "“ auf Seite " + f.seite + " (" + key + ") überdeckt Text des Vordrucks: " + kollisionen.map((w) => w.t).join(" "));
    }
  }

  // --- Vordrucke Feld für Feld ---
  if (hfv.length) {
    const erw = erwarteHfvAntrag(b);
    vergleicheFelder(bericht, "hfv_antrag", erw, HFV_LEER);
    if (opt.tief) {
      pruefeFeldTexte(pfad, hfv[0].nr, "hfv_antrag", erw.T, woerter);
      pruefeKaestchen(pfad, hfv[0].nr, "hfv_antrag", erw.K, grau);
    }
  }
  if (hfv.length && opt.tief) {
    // Felder des Vereins, des HFV und der Hand bleiben im fertigen PDF ohne Text
    for (const formular of ["hfv_antrag"]) {
      for (const [feldName, jf] of Object.entries(konfig.formulare.formulare[formular].felder)) {
        if (jf.fuellt === "assistent") continue;
        const nr = hfv[0].nr + jf.seite - 1;
        if (!woerter[nr]) woerter[nr] = woerterSeite(pfad, nr);
        ok(textImRechteck(woerter[nr], jf.rect, 1) === "", () => "HFV-Antrag: Feld " + feldName + " (" + jf.fuellt + ") muss leer bleiben, enthält „" + textImRechteck(woerter[nr], jf.rect, 1) + "“");
      }
    }
  }
  const voll = bereich("vollmacht");
  if (voll.length) {
    const erw = erwarteVollmacht(b);
    vergleicheFelder(bericht, "vollmacht", { T: erw, K: {} }, ["Ort Datum", "Unterschrift SpielerinSpielerbei Minderjährigen Unterschrift der gesetzlichen Vertreter"]);
    if (opt.tief) pruefeFeldTexte(pfad, voll[0].nr, "vollmacht", erw, woerter);
  }
  const abm = bereich("abmeldung");
  if (abm.length) {
    const erw = erwarteAbmeldung(b);
    vergleicheFelder(bericht, "abmeldung", erw, ["Datum und Unterschrift SpielerSpielerin", "Bei Minderjährigen der gesetzliche Vertreter"]);
    if (opt.tief) {
      pruefeFeldTexte(pfad, abm[0].nr, "abmeldung", erw.T, woerter);
      pruefeKaestchen(pfad, abm[0].nr, "abmeldung", erw.K, grau);
    }
  }
  const sen = bereich("einverstaendnis_senioren");
  if (sen.length) {
    const erw = erwarteSenioren(b);
    vergleicheFelder(bericht, "einverstaendnis_senioren", { T: erw, K: {} }, ["Ort Datum", "Unterschrift des gesetzlichen Vertreters"]);
    if (opt.tief) pruefeFeldTexte(pfad, sen[0].nr, "einverstaendnis_senioren", erw, woerter);
  }
  // Aufnahmeantrag
  const aa = bereich("aufnahmeantrag");
  if (aa.length) {
    const erw = erwarteAufnahmeantrag(b);
    const F = konfig.aufnahmeantragFelder.felder;
    const felderAA = bericht.felder.filter((f) => f.formular === "aufnahmeantrag");
    for (const [k, soll] of Object.entries(erw.T)) {
      if (!soll) continue;
      const f = felderAA.find((x) => x.feld === k);
      ok(Boolean(f) && norm(f.wert) === norm(soll), () => "Aufnahmeantrag " + k + ": erwartet „" + soll + "“, gefunden „" + (f && f.wert) + "“");
    }
    const kreuzeIst = felderAA.filter((f) => f.typ === "kreuz").map((f) => f.feld).sort();
    gleich(kreuzeIst, erw.kreuze.slice().sort(), "Aufnahmeantrag: gesetzte Kreuze");
    if (erw.iban) {
      const ibanFeld = felderAA.find((f) => f.feld === "s4.iban");
      if (erw.iban.startsWith("DE")) {
        ok(Boolean(ibanFeld) && ibanFeld.wert === erw.iban.slice(2), "SEPA: IBAN-Zellen enthalten die IBAN ohne das vorgedruckte DE");
        const seite4 = texte[aa[3].nr - 1].replace(/[^0-9A-Z]/g, "");
        ok(seite4.includes(erw.iban.slice(2)), "SEPA: die Ziffern der IBAN stehen auf Seite 4");
        ok(!/D\s*E\s*D\s*E/.test(texte[aa[3].nr - 1]), "SEPA: das vorgedruckte DE wird nicht doppelt gesetzt");
      } else {
        ok(!ibanFeld, "SEPA: eine IBAN aus dem Ausland kommt nicht in die Zellen mit vorgedrucktem DE");
        ok(texte[aa[3].nr - 1].replace(/\s/g, "").includes(erw.iban), "SEPA: die IBAN aus dem Ausland steht unter den Zellen");
      }
    }
    if (a.zahlung.art !== "sepa") ok(texte[aa[3].nr - 1].includes("Nicht ausgefüllt: Zahlung auf Rechnung"), "Seite 4 nennt, dass nicht auf Lastschrift gezahlt wird");
    if (opt.tief) {
      const seitenNr = aa[0].nr;
      for (const [k, soll] of Object.entries(erw.T)) {
        const feld = F[k] || { "s2.zusatz_unterzeichner": { seite: 2, x: 312, y: 115.2, breite: 232 }, "s3.zusatz_unterzeichner": { seite: 3, x: 313.5, y: 117, breite: 188 } }[k];
        if (!soll || !feld || /zusatz|s4.mitglied/.test(k)) continue;
        const key = seitenNr + feld.seite - 1;
        if (!woerter[key]) woerter[key] = woerterSeite(pfad, key);
        const breite = feld.breite_max || feld.breite;
        const ist = norm(textImRechteck(woerter[key], [feld.x - 1, feld.y - 3, breite + 2, 11], 1));
        ok(ist === norm(soll) || (feld.ausrichtung === "mitte" && ist === norm(soll)), "Aufnahmeantrag " + k + " im PDF an Position: erwartet „" + soll + "“, gelesen „" + ist + "“");
      }
      for (const [k, feld] of Object.entries(F).filter(([, f]) => f.typ === "kreuz")) {
        const key = seitenNr + feld.seite - 1;
        if (!grau[key]) grau[key] = renderGrau(pfad, key, 110);
        const anteil = dunkelAnteil(grau[key], [feld.x, feld.y, feld.breite, feld.hoehe], 0.15);
        const soll = erw.kreuze.includes(k);
        if (soll) ok(anteil > 0.35, "Aufnahmeantrag Kreuz " + k + " sollte gesetzt sein, dunkler Anteil " + anteil.toFixed(3));
        else ok(anteil < 0.2, "Aufnahmeantrag Kreuz " + k + " sollte leer sein, dunkler Anteil " + anteil.toFixed(3));
      }
    }
    // Familienliste
    const familie = ((a.beitrag || {}).familie || []).filter((m) => m.vorname || m.nachname);
    familie.slice(0, 6).forEach((m) => ok(texte[aa[1].nr - 1].includes(m.nachname + ", " + m.vorname), "Familienliste nennt " + m.vorname));
    if (e.minderjaehrig && a.sorgeberechtigte && a.sorgeberechtigte[0]) {
      const n = a.sorgeberechtigte[0].vorname + " " + a.sorgeberechtigte[0].nachname;
      ok(texte[aa[1].nr - 1].includes("Erziehungsberechtigte/r: " + n) && texte[aa[2].nr - 1].includes("Erziehungsberechtigte/r: " + n), "Zusatzzeile der erziehungsberechtigten Person auf Seite 2 und 3");
    } else ok(!texte[aa[1].nr - 1].includes("Erziehungsberechtigte/r:"), "keine Zusatzzeile bei Erwachsenen");
    ok(texte[aa[2].nr - 1].includes("Mitglied: " + name + ", geb. " + datumDe(a.geburtsdatum)), "Zuordnungszeile (Name, Geburtsdatum) auf Seite 3");
  }

  // --- Nachweise, Foto ---
  const nachweisSeiten = S.map((s, i) => ({ s: s, nr: i + 1 })).filter((x) => x.s.art === "nachweis" || x.s.art === "nachweis-ersatz");
  const erwartetNachweise = Object.keys(b.bilder.nachweise).filter((id) => e.unterlagen.some((u) => u.id === id));
  const erwSeiten = erwartetNachweise.reduce((s, id) => s + b.bilder.nachweise[id].length * 0 + erwarteteNachweisSeiten(id), 0);
  if (opt.nachweise !== false) ok(nachweisSeiten.length === erwSeiten, "Anzahl der Seiten mit Nachweisen: " + nachweisSeiten.length + ", erwartet " + erwSeiten);
  for (const x of nachweisSeiten) {
    ok(texte[x.nr - 1].includes(WASSERZEICHEN(heuteDe)), "Wasserzeichen-Satz steht auf Nachweisseite " + x.nr + " (" + x.s.schluessel + ")");
    ok(texte[x.nr - 1].includes(x.s.schluessel) || x.s.art === "nachweis-ersatz", "Nachweisseite " + x.nr + " nennt die Unterlagen-ID " + x.s.schluessel);
    ok(texte[x.nr - 1].includes(deRegeln.unterlagen[x.s.schluessel].name.slice(0, 20)) || x.s.art === "nachweis-ersatz", "Nachweisseite " + x.nr + " nennt den Namen der Unterlage");
    const inhalt = inhaltSeite(doc, x.nr - 1);
    const gedreht = [...inhalt.matchAll(/(-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) Tm/g)].some((m) => Math.abs(Number(m[2])) > 0.3 && Math.abs(Number(m[3])) > 0.3);
    ok(gedreht, "diagonales Wasserzeichen auf Nachweisseite " + x.nr);
    ok(/\bgs\b/.test(inhalt), "halbtransparentes Wasserzeichen auf Nachweisseite " + x.nr);
    ok(x.s.teil === (x.s.schluessel === "U10" ? "C" : "B"), "Nachweis " + x.s.schluessel + " steht im richtigen Teil");
    ok(!/Kopie(?::| ·) Kopie/.test(texte[x.nr - 1]), "Nachweisseite " + x.nr + ": keine doppelte Bezeichnung „Kopie: Kopie …“");
  }
  ok(!/Kopie(?::| ·) Kopie/.test(texte.join("\n")), "Nirgends im PDF (auch nicht im Laufzettel) steht „Kopie: Kopie …“");
  // Nachweise wie in der Oberfläche: wer eine Datei hochlädt, hat „habe“ gewählt (und umgekehrt)
  Object.keys(b.bilder.nachweise).forEach((id) => ok(a.nachweise && a.nachweise[id] === "habe", "Nachweis " + id + ": Bilder nur bei a.nachweise." + id + " = „habe“"));
  // (Ausnahme nur im Sonderfall „Attest-Vorlage bei U10 offen“: dort fehlt die Datei mit Absicht, opt.habeOhneDatei)
  if (!(opt && opt.habeOhneDatei)) Object.entries(a.nachweise || {}).filter(([, v]) => v === "habe").forEach(([id]) => ok((b.bilder.nachweise[id] || []).length > 0, "a.nachweise." + id + " = „habe“ nur mit hochgeladener Datei"));
  pruefeEigeneSeiten({ b: b, g: g, texte: texte, S: S, bericht: bericht, e: e, a: a, pfad: pfad, bilderSeite: bilderSeite, bereich: bereich, teilC: teilC });
  pruefeRunde3({ b: b, texte: texte, S: S, bericht: bericht, e: e, a: a, pfad: pfad });
  const fotoSeiten = S.filter((s) => s.art === "foto");
  ok(fotoSeiten.length === (b.bilder.spielerfoto ? 1 : 0), "Spielerfoto-Seite genau dann, wenn ein Foto mitgegeben wurde");
  const ersatz = S.filter((s) => s.art === "nachweis-ersatz");
  ersatz.forEach((s) => ok(norm(texte[S.indexOf(s)]).includes("Datei konnte nicht übernommen werden – bitte im Verein vorlegen"), "Ersatzseite trägt den Hinweis"));
  return { info: info, texte: texte };
}
const liste = (x) => (Array.isArray(x) ? x : []);

// ---------------------------------------------------------------------------------------------
// Sonderfälle
// ---------------------------------------------------------------------------------------------
async function sonderfaelle() {
  const basis = "kind-neu-deutsch-f";

  // 1. Sonderzeichen im Namen (in der Schrift vorhanden): kein Ersatzzeichen, Dateiname ohne Sonderzeichen
  kontext = "Sonderzeichen";
  {
    const b = bereite(basis, "bild", 0, (a) => {
      a.vorname = "Şükrü";
      a.nachname = "Öztürk-Ğündoğdu";
      a.sorgeberechtigte[0].vorname = "Şule";
      a.sorgeberechtigte[0].nachname = "Öztürk-Ğündoğdu";
      a.anschrift.ort = "Frankfurt am Main";
    });
    const g = await baue(b, "sonderzeichen.pdf");
    const texte = textSeiten(g.pfad);
    ok(g.r.dateiname === "Anmeldung_Oeztuerk-Guendogdu_Suekrue.pdf", "Dateiname bei Sonderzeichen: " + g.r.dateiname);
    ok(texte.join("\n").includes("Şükrü") && texte.join("\n").includes("Öztürk-Ğündoğdu"), "Sonderzeichen stehen im PDF");
    ok(g.bericht.namePruefen === false, "Zeichen der Schrift lösen kein „Name bitte prüfen“ aus");
    const hfvName = g.bericht.felder.find((f) => f.formular === "hfv_antrag" && f.feld === "Vorname");
    ok(hfvName && hfvName.wert === "Şükrü", "HFV-Antrag trägt Şükrü ein (eingebettete Schrift)");
    ok(pdfinfoDaten(g.pfad).Title === "Anmeldung FFV Sportfreunde 04 – Şükrü Öztürk-Ğündoğdu", "Titel mit Sonderzeichen");
    const w = woerterSeite(g.pfad, g.bericht.plan.formulare.hfv_antrag.von);
    ok(textImRechteck(w, konfig.formulare.formulare.hfv_antrag.felder.Vorname.rect).includes("Şükrü"), "Şükrü steht im Feld des HFV-Antrags");
  }

  // 2. Arabische Schrift im Namen: keine Abstürze, "?" und Hinweis auf dem Laufzettel
  kontext = "arabischer Name";
  {
    const b = bereite(basis, "bild", 0, (a) => {
      a.vorname = "محمد";
      a.nachname = "الأحمد";
      a.sorgeberechtigte[0].vorname = "فاطمة";
      a.anschrift.ort = "Frankfurt am Main";
    });
    const g = await baue(b, "arabischer-name.pdf");
    const texte = textSeiten(g.pfad);
    const laufzettel = g.bericht.seiten.map((s, i) => ({ s: s, t: texte[i] })).filter((x) => x.s.art === "laufzettel").map((x) => x.t).join(" ");
    ok(g.bericht.namePruefen === true, "Zeichen außerhalb der Schrift werden gemeldet");
    ok(laufzettel.includes("Name bitte prüfen"), "Laufzettel nennt „Name bitte prüfen“");
    ok(g.r.dateiname === "Anmeldung_Person.pdf", "Dateiname ohne lateinische Buchstaben: " + g.r.dateiname);
    ok(texte.join("\n").includes("????"), "nicht darstellbare Zeichen erscheinen als ?");
    const f = g.bericht.felder.find((x) => x.formular === "hfv_antrag" && x.feld === "Familienname");
    ok(f && /^\?+$/.test(f.wert), "HFV-Antrag trägt Fragezeichen statt arabischer Buchstaben ein: " + (f && f.wert));
    ok(g.r.seiten > 5 && g.r.teile.length === 3, "PDF ist vollständig trotz arabischem Namen");
  }

  // 3. Zu lange Werte: kürzen und melden
  kontext = "lange Werte";
  {
    const lang = "Sehr" + "langer".repeat(15);
    const b = bereite(basis, "bild", 0, (a) => {
      a.nachname = lang;
      a.anschrift.strasse = "Musterstraße " + "Weg".repeat(30);
      a.anschrift.plz = "60326-12";
    });
    const g = await baue(b, "lange-werte.pdf");
    const nn = g.bericht.felder.find((x) => x.formular === "hfv_antrag" && x.feld === "Familienname");
    ok(nn && nn.wert.length === 70, "Familienname im HFV-Antrag auf 70 Zeichen gekürzt: " + (nn && nn.wert.length));
    const plz = g.bericht.felder.find((x) => x.formular === "hfv_antrag" && x.feld === "PLZ");
    ok(plz && plz.wert.length === 5, "PLZ auf 5 Zeichen gekürzt");
    ok(g.bericht.hinweise.some((h) => /gekürzt/.test(h)), "Kürzungen werden gemeldet");
    const texte = textSeiten(g.pfad);
    ok(texte.join("\n").includes("gekürzt"), "Laufzettel nennt gekürzte Werte");
    ok(g.r.seiten > 5, "PDF ist vollständig trotz langer Werte");
  }

  // 4. Fehlende Angaben: kein Absturz, Hinweise auf dem Laufzettel
  kontext = "fehlende Angaben";
  {
    const b = bereite(basis, "bild", 0, (a) => {
      a.anschrift = {};
      a.geburtsort = "";
      a.email = "";
      a.mobil = "";
      a.sorgeberechtigte = [];
      a.zahlung = { art: "sepa", kontoinhaber: null, iban: "" };
    });
    const g = await baue(b, "fehlende-angaben.pdf");
    ok(g.bericht.fehlendeAngaben.length > 0, "fehlende Pflichtangaben werden gemeldet: " + JSON.stringify(g.bericht.fehlendeAngaben));
    const texte = textSeiten(g.pfad).join("\n");
    ok(texte.includes("Angabe fehlt im Vordruck"), "Laufzettel nennt fehlende Angaben im Vordruck");
    ok(g.r.teile.length >= 2, "PDF trotzdem vollständig");
  }
  {
    const p = profil(basis);
    delete p.a.geburtsdatum;
    delete p.a.zahlung;
    delete p.a.einwilligungen;
    delete p.a.anschrift;
    const e = auswerten(p.a, konfig, p.heute);
    let fehlerText = null;
    let g = null;
    try {
      g = await baue({ p: p, a: p.a, e: e, bilder: {}, heute: p.heute }, "leere-antworten.pdf");
    } catch (x) {
      fehlerText = x.message;
    }
    ok(fehlerText === null, "fast leere Antworten führen nicht zum Absturz: " + fehlerText);
    ok(g && g.r.seiten >= 3, "fast leere Antworten ergeben trotzdem ein PDF");
  }

  // 5. Nachweise: Bilder, mehrseitiges und gedrehtes PDF, verschlüsselte und kaputte Dateien
  kontext = "Nachweise";
  {
    const b = bereite("kind-neu-nichtdeutsch-12", "bild", 0, (a) => {
      a.nachweise = { U09: "habe", U10: "habe", U12: "habe", U13: "habe" };
      a.spielerfoto = { weg: "foto" };
    });
    const d = (x, n) => ({ bytes: x.bytes, typ: x.typ, name: n });
    b.bilder.nachweise = {
      U09: [d(TESTDATEIEN.hoch, "urkunde.png")],
      U10: [d(TESTDATEIEN.quer, "attest.jpg")],
      U12: [d(TESTDATEIEN.zweiSeiten, "pass.pdf"), d(TESTDATEIEN.gedreht, "gedreht.pdf")],
      U13: [d(TESTDATEIEN.verschluesselt, "melde.pdf"), d(TESTDATEIEN.kaputtPdf, "kaputt.pdf"), d(TESTDATEIEN.kaputtJpg, "kaputt.jpg"), { bytes: new Uint8Array([71, 73, 70, 56, 57, 97, 1, 0, 1, 0, 0, 0, 0, 59]), typ: "image/gif", name: "bild.gif" }],
    };
    b.bilder.spielerfoto = { bytes: TESTDATEIEN.foto.bytes, typ: TESTDATEIEN.foto.typ };
    const g = await baue(b, "nachweise-sonderfaelle.pdf");
    const S = g.bericht.seiten;
    const texte = textSeiten(g.pfad);
    const doc = await PDFLib.PDFDocument.load(g.r.bytes, { updateMetadata: false });
    const von = (id) => S.map((s, i) => ({ s: s, nr: i + 1 })).filter((x) => x.s.schluessel === id && /^nachweis/.test(x.s.art));
    ok(von("U09").length === 1 && von("U10").length === 1 && von("U12").length === 3 && von("U13").length === 4, "Seiten je Nachweis: " + ["U09", "U10", "U12", "U13"].map((i) => von(i).length).join("/") + " (erwartet 1/1/3/4)");
    ok(von("U13").every((x) => x.s.art === "nachweis-ersatz"), "verschlüsselte, kaputte und unbekannte Dateien bekommen Ersatzseiten");
    ok(texte[von("U13")[0].nr - 1].includes("Grund: PDF verschlüsselt"), "verschlüsseltes PDF wird als verschlüsselt erkannt");
    ok(texte[von("U13")[1].nr - 1].includes("Grund: PDF nicht lesbar"), "kaputtes PDF: Ersatzseite mit Grund");
    ok(texte[von("U13")[2].nr - 1].includes("Grund: Bild nicht lesbar"), "kaputtes Bild: Ersatzseite mit Grund");
    ok(texte[von("U13")[3].nr - 1].includes("Grund: Dateityp nicht unterstützt"), "unbekannter Dateityp (GIF): Ersatzseite mit Grund");
    von("U13").forEach((x) => ok(texte[x.nr - 1].includes("Datei konnte nicht übernommen werden – bitte im Verein vorlegen"), "Ersatzseite " + x.nr + " trägt den Hinweis"));
    const lz = S.map((s, i) => ({ s: s, t: texte[i] })).filter((x) => x.s.art === "laufzettel").map((x) => x.t).join(" ");
    ok(/U13 .*Datei nicht lesbar, bitte im Verein vorlegen/.test(lz), "Laufzettel: U13 – Datei nicht lesbar");
    const teilA = S.map((s, i) => ({ s: s, t: texte[i] })).filter((x) => x.s.art === "teil-a").map((x) => x.t).join(" ");
    ok(teilA.includes("Meldebescheinigung") && teilA.includes("Die Datei ließ sich nicht übernehmen. Bringen Sie das Original oder eine Kopie mit."), "Teil A: nicht übernommene Datei steht in der Liste „Das fehlt noch“");
    ok(/U12 .*liegt bei \(Seite \d+–\d+\)/.test(lz), "Laufzettel: U12 liegt bei mit Seitenbereich");
    ok(/U10 .*liegt bei \(Seite \d+\)/.test(lz), "Laufzettel: U10 (Attest-Kopie) liegt bei");
    const gedreht = von("U12")[2];
    const seiteGedreht = doc.getPage(gedreht.nr - 1);
    ok(seiteGedreht.getRotation().angle === 90, "die Drehung des übernommenen PDFs bleibt erhalten");
    ok(texte[gedreht.nr - 1].includes(WASSERZEICHEN(datumDe(b.heute))) && texte[gedreht.nr - 1].includes("(U12)"), "gedrehte Seite trägt Wasserzeichen-Satz und Beschriftung");
    ok(von("U10")[0].s.teil === "C", "Attest-Kopie steht in Teil C");
    ok(g.bericht.plan.attestVorlage === null && g.bericht.plan.attestEinwilligung !== null, "mit Attest-Kopie keine Vorlage, aber die Einwilligung");
    const foto = S.map((s, i) => ({ s: s, nr: i + 1 })).filter((x) => x.s.art === "foto");
    ok(foto.length === 1 && foto[0].s.teil === "B" && texte[foto[0].nr - 1].includes(deRegeln.unterlagen.U16.name), "Foto-Seite („" + deRegeln.unterlagen.U16.name + "“) in Teil B");
    ok(zaehle(texte[foto[0].nr - 1], /KOPIE/g) === 0, "das Spielerfoto trägt kein Kopie-Wasserzeichen");
  }

  // 6. Foto zu klein oder falsches Format
  kontext = "Spielerfoto";
  {
    const b = bereite(basis, "bild", 0);
    const klein = TESTDATEIEN.hoch; // 450 x 600: Breite genügt, Format 3:4 stimmt
    b.bilder.spielerfoto = { bytes: klein.bytes, typ: klein.typ };
    const g = await baue(b, "foto-png.pdf");
    ok(g.bericht.seiten.filter((s) => s.art === "foto").length === 1, "auch ein PNG-Foto wird übernommen");
    const quer = TESTDATEIEN.quer; // 400 x 280: falsches Format
    b.bilder.spielerfoto = { bytes: quer.bytes, typ: quer.typ };
    const g2 = await baue(b, "foto-quer.pdf");
    ok(textSeiten(g2.pfad).join("\n").includes("nicht das Format 3:4"), "Foto im falschen Format wird auf dem Laufzettel gemeldet");
    b.bilder.spielerfoto = { bytes: new Uint8Array([9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9]), typ: "image/jpeg" };
    const g3 = await baue(b, "foto-kaputt.pdf");
    ok(g3.bericht.seiten.filter((s) => s.art === "foto").length === 0 && textSeiten(g3.pfad).join("\n").includes("ließ sich nicht einlesen"), "unlesbares Foto: keine Seite, Hinweis auf dem Laufzettel");
  }

  // 7. Unterschriftsregel im Einzelnen
  kontext = "Unterschriftsregel";
  {
    // nur ein Bild für das Mitglied: alle Stellen für Eltern bleiben Stift
    const b = bereite("kind-neu-deutsch-f", "bild", 0);
    b.bilder.unterschriften = { mitglied: TESTDATEIEN.sig1 };
    const g = await baue(b, "regel-nur-mitglied.pdf");
    ok(g.bericht.stellen.filter((s) => s.art === "bild").length === 0, "ohne Bild der Eltern bleiben alle Stellen der Eltern Stift-Stellen");
    // beide Eltern, aber ohne zweites Bild: nur die zweite Stelle bleibt Stift
    const b2 = bereite("kind-neu-deutsch-f", "bild", 0);
    delete b2.bilder.unterschriften.sorgeberechtigte_2;
    const g2 = await baue(b2, "regel-ohne-zweites-bild.pdf");
    const zweite = g2.bericht.stellen.find((s) => s.stelleKey === "s2.unterschrift_sorgeberechtigte");
    const erste = g2.bericht.stellen.find((s) => s.stelleKey === "s2.unterschrift");
    ok(zweite && zweite.art === "stift" && erste && erste.art === "bild", "fehlt nur das zweite Bild, bleibt nur die zweite Stelle leer");
    // kein Wert für unterschriftWeg: wie Papier
    const b3 = bereite("kind-neu-deutsch-f", "bild", 0, (a) => {
      delete a.unterschriftWeg;
    });
    b3.a.unterschriftWeg = undefined;
    const g3 = await baue(b3, "regel-ohne-weg.pdf");
    ok(g3.bericht.stellen.every((s) => s.art !== "bild"), "ohne Angabe zum Weg wird nichts am Bildschirm unterschrieben");
    // Kontoinhaber ist die Person mit Sorgerecht: deren Bild gilt für das Mandat
    const b4 = bereite("kind-neu-deutsch-f", "bild", 0);
    delete b4.bilder.unterschriften.kontoinhaber;
    const g4 = await baue(b4, "regel-kontoinhaber-alias.pdf");
    const sepa = g4.bericht.stellen.find((s) => s.stelleKey === "s4.unterschrift");
    ok(sepa && sepa.art === "bild" && sepa.bild === "sorgeberechtigte", "Kontoinhaber = Person mit Sorgerecht: deren Unterschrift gilt auch für das Mandat");
    // Erwachsene: Bild "mitglied"
    const b5 = bereite("herren-neu-deutsch", "bild", 0);
    delete b5.bilder.unterschriften.kontoinhaber;
    const g5 = await baue(b5, "regel-erwachsen.pdf");
    ok(g5.bericht.stellen.filter((s) => s.art === "bild").every((s) => s.bild === "mitglied"), "Erwachsene unterschreiben mit ihrem eigenen Bild");
    ok(g5.bericht.stellen.filter((s) => s.formular === "hfv_antrag").every((s) => s.art === "stift" || s.art === "nein-hinweis"), "HFV-Antrag von Erwachsenen bleibt Stift");
  }

  // 7b. Satzung nicht bestätigt (Runde 3, Punkt 4): Seite 2 des Aufnahmeantrags braucht das Kästchen zur Satzung auf Seite 1.
  //     Fehlt es bei einer Bildschirm-Unterschrift, wird die Unterschrift dort zur Stift-Stelle; der Laufzettel nennt den Grund.
  for (const profilId of ["kind-neu-deutsch-f", "herren-neu-deutsch", "vormund-kind", "familie-drei-mitglieder"]) {
    kontext = "Satzung nicht bestätigt (" + profilId + ")";
    const mit = bereite(profilId, "bild", 0, (a) => {
      a.satzung = true;
    });
    const ohne = bereite(profilId, "bild", 0, (a) => {
      a.satzung = false;
    });
    const gMit = await baue(mit, "satzung-mit-" + profilId + ".pdf");
    const gOhne = await baue(ohne, "satzung-ohne-" + profilId + ".pdf");
    await pruefePdf(mit, gMit, { tief: false, bilder: true, nachweise: true });
    await pruefePdf(ohne, gOhne, { tief: true, bilder: true, nachweise: true });
    const s2 = (g) => g.bericht.stellen.filter((st) => st.formular === "aufnahmeantrag" && st.stelleKey.startsWith("s2."));
    const sMit = s2(gMit);
    const sOhne = s2(gOhne);
    ok(sMit.length >= 1 && sMit.every((st) => st.art === "bild"), "Satzung bestätigt: Seite 2 des Aufnahmeantrags wird am Bildschirm unterschrieben");
    ok(sOhne.length === sMit.length && sOhne.every((st) => st.art === "stift" && !st.rueckfall && !st.zusatz), () => "Satzung nicht bestätigt: Seite 2 des Aufnahmeantrags wird mit Stift unterschrieben (" + sOhne.map((st) => st.stelleKey + ":" + st.art).join(", ") + ")");
    const rest = (g) => g.bericht.stellen.filter((st) => !(st.formular === "aufnahmeantrag" && st.stelleKey.startsWith("s2."))).map((st) => st.formular + "." + st.stelleKey + ":" + st.art);
    gleich(rest(gOhne), rest(gMit), "Satzung nicht bestätigt: alle anderen Unterschriftsstellen bleiben, wie sie sind");
    gleich(gOhne.r.seiten, gMit.r.seiten, "Satzung nicht bestätigt: Seitenzahl bleibt gleich");
    const lzText = (g) => textSeiten(g.pfad).filter((tx, i) => g.bericht.seiten[i].art === "laufzettel").join(" ");
    const lzOhne = lzText(gOhne);
    ok(/Seite 2: Satzung nicht bestätigt\./.test(lzOhne), () => "Laufzettel nennt den Grund „Satzung nicht bestätigt“ mit der Seite: " + (lzOhne.match(/.{60}Satzung.{40}/) || [lzOhne.slice(0, 80)])[0]);
    ok(/Satzung nicht bestätigt\. Die Unterschrift steht deshalb als Stift-Markierung im Formular\./.test(lzOhne), "Laufzettel: der Grund steht mit dem Satz zur Stift-Markierung");
    gleich(gOhne.bericht.hinweise.filter((h) => h.includes("Satzung nicht bestätigt")).length, 1, "Der Grund „Satzung nicht bestätigt“ steht nur einmal im Bericht (zwei Stellen, eine Meldung)");
    ok(!/Satzung nicht bestätigt/.test(lzText(gMit)), "Laufzettel bei bestätigter Satzung: kein Hinweis auf die Satzung");
    // Seite 2 des Aufnahmeantrags: Markierungen statt Bilder
    const seite2 = sOhne[0].seite;
    ok(sOhne.every((st) => st.seite === seite2), "Satzung: alle Stellen von Seite 2 stehen auf derselben PDF-Seite");
    const markierungen = zaehle(textSeiten(gOhne.pfad)[seite2 - 1], /Hier mit Stift unterschreiben/g);
    ok(markierungen >= sOhne.length, () => "Aufnahmeantrag Seite 2 (PDF-Seite " + seite2 + "): " + markierungen + " Stift-Markierungen für " + sOhne.length + " Stellen");
    const bMit = bilderJeSeite(gMit.pfad)[seite2] || 0;
    const bOhne = bilderJeSeite(gOhne.pfad)[seite2] || 0;
    gleich(bMit - bOhne, sMit.length, "Aufnahmeantrag Seite 2: ohne bestätigte Satzung fehlen genau die Unterschriftsbilder (" + bMit + " gegen " + bOhne + ")");
    // Teil A weist auf die Stift-Stellen hin (Kontrolle in pruefePdf); hier zusätzlich: nicht mehr „alles am Bildschirm unterschrieben“
    const teilA = (g) => textSeiten(g.pfad).filter((tx, i) => g.bericht.seiten[i].art === "teil-a").join(" ");
    ok(!teilA(gOhne).includes(norm(TEXTE_TEIL_A.stiftKeine)), "Teil A: bei nicht bestätigter Satzung steht nicht „alles am Bildschirm unterschrieben“");
  }
  {
    // Familienbeitrag gewählt, aber keine Familienmitglieder eingetragen: zweiter Grund für Seite 2, allein und zusammen mit
    // der nicht bestätigten Satzung (beide Gründe stehen in einer Meldung)
    for (const satzung of [true, false]) {
      kontext = "Familienliste leer" + (satzung ? "" : " und Satzung nicht bestätigt");
      const b = bereite("familie-drei-mitglieder", "bild", 0, (a) => {
        a.satzung = satzung;
        a.beitrag.gruppe = "fussball_familie";
        a.beitrag.familie = [];
      });
      ok(b.e.formulare.includes("familienliste"), "Vorbedingung: die Familienliste gehört zum Fall, obwohl sie leer ist");
      const g = await baue(b, "satzung-familienliste-" + (satzung ? "bestaetigt" : "offen") + ".pdf");
      await pruefePdf(b, g, { tief: false, bilder: true, nachweise: true });
      const s2 = g.bericht.stellen.filter((st) => st.formular === "aufnahmeantrag" && st.stelleKey.startsWith("s2."));
      ok(s2.length >= 1 && s2.every((st) => st.art === "stift"), "Familienliste leer: Seite 2 des Aufnahmeantrags wird mit Stift unterschrieben");
      const leerSatz = "Die " + deRegeln.unterlagen.U02.name + " ist leer, obwohl der Familienbeitrag gewählt ist.";
      const meldungen = g.bericht.hinweise.filter((h) => h.includes(leerSatz));
      if (ok(meldungen.length === 1, () => "Familienliste leer: genau eine Meldung im Bericht (" + meldungen.length + ")")) {
        ok(meldungen[0].includes("Seite 2: " + (satzung ? "" : "Satzung nicht bestätigt. ") + leerSatz), () => "Familienliste leer: Meldung mit " + (satzung ? "einem Grund" : "beiden Gründen") + ": " + meldungen[0]);
      }
      const lz = textSeiten(g.pfad).filter((tx, i) => g.bericht.seiten[i].art === "laufzettel").join(" ");
      ok(lz.includes(leerSatz) && /Satzung nicht bestätigt/.test(lz) === !satzung, "Laufzettel nennt " + (satzung ? "nur die leere Familienliste" : "beide Gründe"));
    }
  }
  {
    // Keine Wirkung, wenn ohnehin nichts am Bildschirm unterschrieben wird: Papier und Bildschirm ohne Unterschriftsbilder
    kontext = "Satzung nicht bestätigt (ohne Bildschirm-Unterschrift)";
    const papier = bereite("kind-neu-deutsch-f", "papier", 0, (a) => {
      a.satzung = false;
    });
    const gp = await baue(papier, "satzung-papier.pdf");
    await pruefePdf(papier, gp, { tief: false, bilder: true, nachweise: false });
    ok(!gp.bericht.hinweise.some((h) => /Satzung nicht bestätigt/.test(h)), "Papier: die Satzung ist freiwillig, der Laufzettel nennt sie nicht als Grund");
    ok(gp.bericht.stellen.every((st) => st.art === "stift"), "Papier: alle Stellen bleiben Stift-Stellen");
    const leer = bereite("kind-neu-deutsch-f", "leer", 0, (a) => {
      a.satzung = false;
    });
    const gl = await baue(leer, "satzung-ohne-bilder.pdf");
    await pruefePdf(leer, gl, { tief: false, bilder: true, nachweise: false });
    ok(!gl.bericht.hinweise.some((h) => /Satzung nicht bestätigt/.test(h)), "Bildschirm ohne Unterschriftsbilder: kein Grund „Satzung nicht bestätigt“ (es gibt kein Bild, das zurückgehalten wird)");
  }

  // 7c. Attest-Vorlage bei U10 „offen“ (Runde 4): Die Vorlage für die Praxis gehört zum Fall, wenn die Familie angibt, ein Attest zu haben
  //     („habe“), aber keine Datei mitgibt. Ihr Hinweis für die Praxis nennt dann die offene Aussage, nicht „vom Verband verlangt“.
  {
    let anzahlOffen = 0;
    for (const p of PROFILE) {
      const b = bereite(p.id, "bild", 0);
      const u10 = b.e.unterlagen.find((u) => u.id === "U10");
      if (!u10 || u10.art !== "offen") continue;
      kontext = "Attest-Vorlage bei U10 offen (" + p.id + ")";
      ok(b.a.nachweise.U10 === "habe" && b.e.formulare.includes("attest"), "Vorbedingung: Attest ist vorhanden („habe“), das Formular „attest“ gehört zum Fall");
      delete b.bilder.nachweise.U10;
      const g = await baue(b, "attest-vorlage-offen-" + p.id + ".pdf");
      anzahlOffen += 1;
      const av = g.bericht.seiten.map((s, i) => ({ s: s, nr: i + 1 })).filter((x) => x.s.schluessel === "attest_vorlage");
      if (!ok(av.length === 1, () => "Attest ohne Datei: genau eine Attest-Vorlage (" + av.length + ")")) continue;
      const seite = ohneRahmen(textSeiten(g.pfad)[av[0].nr - 1]);
      ok(seite.includes(ATTEST_TEXT.offen.vorlage), () => "Attest-Vorlage bei U10 „offen“: Hinweis für die Praxis fehlt oder weicht ab: " + seite.slice(-500));
      ok(!seite.includes("Hessischen Fußball-Verband bestimmt") && !seite.includes("Jugendordnung"), "Attest-Vorlage bei U10 „offen“: nicht als Unterlage des Verbands bezeichnet");
      await pruefePdf(b, g, { tief: false, bilder: true, nachweise: true, habeOhneDatei: true });
    }
    kontext = "Attest-Vorlage bei U10 offen";
    ok(anzahlOffen > 0, "Attest-Vorlage bei U10 „offen“: mindestens ein Profil geprüft");
    console.log("Attest-Vorlage bei U10 „offen“ ohne Datei: " + anzahlOffen + " Profile geprüft");
  }

  // 8. Andere Sprache der Antworten: das PDF bleibt deutsch, Daten in deutscher Schreibweise
  kontext = "Sprache";
  {
    const b = bereite(basis, "bild", 0, (a) => {
      a.sprache = "en";
    });
    const g = await baue(b, "sprache-en.pdf");
    const t = textSeiten(g.pfad).join("\n");
    ok(t.includes("29. September 2026"), "Datum im Text bleibt deutsch (29. September 2026)");
    ok(!/29 September 2026/.test(t), "kein englisches Datum im deutschen PDF");
    ok(t.includes("Ihre Anmeldung") && !/Your registration/.test(t), "das PDF bleibt deutsch");
  }

  // 9. Wiederholbarkeit
  kontext = "Wiederholbarkeit";
  {
    const b = bereite(basis, "bild", 0);
    const g1 = await baue(b, "wiederholung-1.pdf");
    const g2 = await baue(b, "wiederholung-2.pdf");
    ok(Buffer.compare(Buffer.from(g1.r.bytes), Buffer.from(g2.r.bytes)) === 0, "gleiche Eingaben ergeben dasselbe PDF");
    const b2 = tief({ a: b.a });
    ok(JSON.stringify(b2.a) === JSON.stringify(b.a), "die Antworten wurden nicht verändert");
  }

  // 11. Mehrere mögliche Mannschaften (Punkt 2): zwei, drei und eine
  kontext = "Mannschaften";
  {
    const b3 = bereite("kind-neu-nichtdeutsch-12", "bild", 0);
    b3.e = tief(b3.e);
    b3.e.mannschaft.namen = ["D1-Jugend", "D2-Jugend", "D3-Jugend"];
    const g3 = await baue(b3, "drei-mannschaften.pdf");
    const t3 = textSeiten(g3.pfad).join("\n");
    ok(t3.includes("Mannschaft: D1-Jugend, D2-Jugend oder D3-Jugend (teilt die Jugendleitung ein)"), "drei mögliche Mannschaften: „D1-Jugend, D2-Jugend oder D3-Jugend (teilt die Jugendleitung ein)“");
    ok(!t3.includes("D1-Jugend, D2-Jugend, D3-Jugend"), "drei mögliche Mannschaften werden nicht nur mit Komma aufgezählt");
    const b1 = bereite("kind-neu-nichtdeutsch-12", "bild", 0);
    b1.e = tief(b1.e);
    b1.e.mannschaft.namen = ["D3-Jugend"];
    const g1 = await baue(b1, "eine-mannschaft.pdf");
    const t1 = textSeiten(g1.pfad).join("\n");
    ok(t1.includes("Mannschaft: D3-Jugend") && !t1.includes("teilt die Jugendleitung ein"), "eine Mannschaft steht ohne Zusatz da");
    const b0 = bereite("kind-neu-nichtdeutsch-12", "bild", 0);
    b0.e = tief(b0.e);
    b0.e.mannschaft.namen = [];
    const g0 = await baue(b0, "keine-mannschaft.pdf");
    ok(!textSeiten(g0.pfad).join("\n").includes("Mannschaft:"), "ohne Mannschaft gibt es keine Zeile „Mannschaft“");
  }

  // 12. Karneval: Uhrzeit für den Heimweg (Punkt 4)
  kontext = "Karneval-Uhrzeit";
  {
    const probe = async (alleinAb, erwartet, name) => {
      const b = bereite("karneval-kind-abend", "bild", 0, (a) => {
        a.karneval.abholung = "Oma Erika Beispiel";
        a.karneval.alleinNachHause = "ja";
        a.karneval.alleinAb = alleinAb;
      });
      const g = await baue(b, "karneval-uhrzeit-" + name + ".pdf");
      const ein = g.bericht.eingaben.find((x) => x.name === "alleinNachHause");
      gleich(ein && ein.wert, erwartet, "Karneval: alleinAb „" + alleinAb + "“");
      const kaNr = g.bericht.seiten.findIndex((s) => s.schluessel === "karneval_auftritte") + 1;
      const t = textSeiten(g.pfad)[kaNr - 1];
      if (erwartet === "–") ok(g.bericht.hinweise.some((h) => /Abholung oder Heimweg sind nicht angegeben/.test(h)), "Karneval: fehlende Uhrzeit steht als Hinweis auf dem Laufzettel");
      else ok(t.includes(erwartet) && !g.bericht.hinweise.some((h) => /Abholung oder Heimweg/.test(h)), "Karneval: Satz mit Uhrzeit steht im PDF");
    };
    await probe("21:30", "Mein Kind darf die Veranstaltung um 21:30 Uhr allein verlassen.", "2130");
    await probe("9:05", "Mein Kind darf die Veranstaltung um 09:05 Uhr allein verlassen.", "905");
    await probe("", "–", "leer");
    await probe("25:99", "–", "ungueltig");
    await probe("abends", "–", "text");
  }

  // 13. Karneval: eine sehr lange Angabe zur Abholung wird gekürzt und auf dem Laufzettel gemeldet
  kontext = "Karneval-Abholung";
  {
    const lang = "Oma Erika Beispiel, Opa Hans Beispiel, Tante Petra Beispiel, Onkel Karl Beispiel, Nachbarin Frau Muster und Herr Muster ".repeat(3);
    const b = bereite("karneval-kind-abend", "bild", 0, (a) => {
      a.karneval.abholung = lang;
      a.karneval.alleinNachHause = "nein";
    });
    const g = await baue(b, "karneval-lange-abholung.pdf");
    const kaNr = g.bericht.seiten.findIndex((s) => s.schluessel === "karneval_auftritte") + 1;
    const t = textSeiten(g.pfad)[kaNr - 1];
    ok(t.includes("…") && t.includes("Oma Erika Beispiel"), "Karneval: die lange Abholung steht gekürzt mit „…“ im Feld");
    ok(g.bericht.hinweise.some((h) => /Feld „Mein Kind wird abgeholt von \(Name\)“ wurde gekürzt/.test(h)), "Karneval: die Kürzung steht auf dem Laufzettel");
    const w = woerterSeite(g.pfad, kaNr);
    ok(w.every((x) => x.x1 <= 596 - 40), "Karneval: nichts ragt über den rechten Rand hinaus");
  }

  // 14. Laufzettel: der Block „Bearbeitung durch den Verein“ wird nie vom Seitenumbruch zerrissen, auch wenn der Laufzettel
  //     durch weitere Personen mit Sorgerecht Zeile für Zeile länger wird (die Grenze der Seite wird dabei überschritten)
  kontext = "Laufzettel-Umbruch";
  {
    let zweiSeitigMitBlockAmEnde = 0;
    let dreiSeitig = 0;
    for (let n = 0; n <= 12; n++) {
      const b = bereite("vollmacht-und-kuendigung", "bild", 0, (a) => {
        for (let i = 0; i < n; i++) a.sorgeberechtigte.push({ rolle: "andere", vorname: "Weitere" + i, nachname: "Mustermann", telefon: "0160 55501" + (10 + i), email: "" });
      });
      const g = await baue(b, "laufzettel-umbruch-" + n + ".pdf");
      const texte = textSeiten(g.pfad);
      const lz = g.bericht.seiten.map((s, i) => ({ s: s, t: texte[i] })).filter((x) => x.s.art === "laufzettel");
      const seiteMit = (w) => lz.findIndex((x) => x.t.includes(w));
      ok(seiteMit("Bearbeitung durch den Verein") >= 0 && seiteMit("Bearbeitung durch den Verein") === seiteMit("Eingang am") && seiteMit("Eingang am") === seiteMit("Löschung am"), "Laufzettel mit " + (n + 2) + " Personen mit Sorgerecht: der Block „Bearbeitung durch den Verein“ steht zusammen auf einer Seite");
      if (lz.length === 2 && seiteMit("Bearbeitung durch den Verein") === 1) zweiSeitigMitBlockAmEnde += 1;
      if (lz.length >= 3) dreiSeitig += 1;
    }
    ok(zweiSeitigMitBlockAmEnde > 0 && dreiSeitig > 0, "die Reihe überschreitet die Seitengrenze des Laufzettels (zwei Seiten: " + zweiSeitigMitBlockAmEnde + ", drei Seiten: " + dreiSeitig + ")");
  }

  // 10. Fehler bei Vorlagen: klare Meldung statt falscher Felder
  kontext = "Vorlagen";
  {
    const b = bereite(basis, "bild", 0);
    const opts = () => ({ PDFLib, fontkit, schrift: SCHRIFT, vorlagen: vorlagenFuer(b.e, b.a), konfig, a: b.a, e: b.e, bilder: b.bilder, heute: b.heute });
    const ohne = opts();
    delete ohne.vorlagen.hfv_antrag;
    let msg = "";
    try {
      await erzeugePdf(ohne);
    } catch (x) {
      msg = x.message;
    }
    ok(/Vorlage fehlt: hfv_antrag/.test(msg), "fehlende Vorlage: klare Meldung – " + msg);
    const falsch = opts();
    falsch.vorlagen.hfv_antrag = falsch.vorlagen.vollmacht || vorlagenFuer({ formulare: ["vollmacht"] }, {}).vollmacht;
    msg = "";
    try {
      await erzeugePdf(falsch);
    } catch (x) {
      msg = x.message;
    }
    ok(/Vordruck geändert|Seiten/.test(msg), "vertauschte Vorlage wird erkannt – " + msg);
  }
}


// ---------------------------------------------------------------------------------------------
// Antworten mit und ohne Angaben der Familie, am Bildschirm und auf Papier (Punkte 4 bis 6)
// ---------------------------------------------------------------------------------------------
// Profile, die Karneval, Fahrten, Notfallbogen, Foto-Einwilligung, Lastschrift und Familienliste abdecken
const SZENARIO_PROFILE = ["karneval-kind-abend", "kind-neu-deutsch-f", "familie-drei-mitglieder", "maedchen-c-jugend-jungenteam", "a-jugend-aushilfe-herren", "getrennt-lebende-eltern", "herren-neu-deutsch"];

function szenarioAendern(szenario, lauf) {
  return (a) => {
    a.einwilligungen = a.einwilligungen || {};
    if (szenario === "mit") {
      a.einwilligungen.fahrten = lauf % 2 === 0;
      a.einwilligungen.messenger = lauf % 2 === 1;
      a.einwilligungen.fotos = "ja";
      a.einwilligungen.medien = ["intern", "presse"];
      if (a.karneval) Object.assign(a.karneval, lauf % 2 === 0 ? { abholung: "Oma Erika Beispiel", alleinNachHause: "ja", alleinAb: "21:30" } : { abholung: "Onkel Jonas Beispiel", alleinNachHause: "nein" });
      a.gesundheitsbogen = true;
      a.gesundheit = { allergien: "Nüsse", erkrankungen: "Asthma", medikamente: "", sonstiges: "" };
    } else {
      delete a.einwilligungen.fahrten;
      delete a.einwilligungen.messenger;
      delete a.einwilligungen.fotos;
      delete a.einwilligungen.medien;
      if (a.karneval) {
        delete a.karneval.abholung;
        delete a.karneval.alleinNachHause;
        delete a.karneval.alleinAb;
      }
      a.gesundheitsbogen = false;
      delete a.gesundheit;
      a.notfall = null;
      a.mobil = "";
      a.telefon = "";
      (a.sorgeberechtigte || []).forEach((p) => {
        p.telefon = "";
      });
      if (a.zahlung && a.zahlung.art === "sepa") a.zahlung.iban = "";
      if (a.beitrag) a.beitrag.familie = [];
    }
  };
}

async function szenarien() {
  console.log("\nAntwort-Szenarien (mit und ohne Angaben der Familie, Bildschirm und Papier):");
  const zeilen = [];
  for (const id of SZENARIO_PROFILE) {
    const lauf = PROFILE.findIndex((p) => p.id === id);
    for (const szenario of ["mit", "ohne"]) {
      for (const variante of ["bild", "papier"]) {
        kontext = "Szenario " + id + " (" + szenario + " Antworten, " + (variante === "bild" ? "Bildschirm" : "Papier") + ")";
        const vor = anzahl;
        const vorFehler = fehler.length;
        const b = bereite(id, variante, lauf, szenarioAendern(szenario, lauf));
        let g;
        try {
          g = await baue(b, "szenario-" + id + "-" + szenario + "-" + variante + ".pdf");
        } catch (x) {
          ok(false, "PDF konnte nicht erzeugt werden: " + (x.stack || x.message).split("\n").slice(0, 3).join(" | "));
          continue;
        }
        await pruefePdf(b, g, { tief: variante === "bild", bilder: true, nachweise: variante === "bild" });
        // Renderings des Karneval-Profils in allen vier Fassungen zur Sichtprüfung (Karneval- und Notfall-Seiten)
        if (id === "karneval-kind-abend") ok(sh("pdftoppm", ["-png", "-r", "70", g.pfad, path.join(RENDER, "szenario-" + id + "-" + szenario + "-" + variante)]).status === 0, "Rendering des Szenarios fehlgeschlagen");
        const S = g.bericht.seiten;
        const digital = (formular, key) => (g.bericht.stellen.find((st) => st.formular === formular && st.stelleKey === key) || {}).art === "bild";
        const eing = (formular, name) => g.bericht.eingaben.find((x) => x.formular === formular && x.name === name);
        const hat = (schluessel) => S.some((s) => s.schluessel === schluessel && s.art === "eigen");
        // Erwartung je Fassung: am Bildschirm sind alle Angaben gefüllt („–“ statt leerer Felder), auf Papier bleiben unbeantwortete Felder frei
        if (hat("karneval_auftritte")) {
          const dig = digital("karneval_auftritte", "unterschrift");
          gleich(dig, variante === "bild", "Karneval: Unterschrift " + (dig ? "am Bildschirm" : "mit Stift") + " passend zur Variante");
          if (szenario === "mit") {
            ok(!eing("karneval_auftritte", "abholung").leer && !eing("karneval_auftritte", "alleinNachHause").leer, "Karneval mit Antworten: beide Felder gefüllt");
            const k = b.a.karneval;
            ok(eing("karneval_auftritte", "abholung").wert === k.abholung, "Karneval mit Antworten: Abholung im Feld");
            ok(eing("karneval_auftritte", "alleinNachHause").wert === (k.alleinNachHause === "ja" ? "Mein Kind darf die Veranstaltung um 21:30 Uhr allein verlassen." : "Mein Kind darf die Veranstaltung nicht allein verlassen."), "Karneval mit Antworten: Satz zum Heimweg im Feld");
          } else {
            ok(eing("karneval_auftritte", "abholung").leer === !dig && eing("karneval_auftritte", "alleinNachHause").leer === !dig, "Karneval ohne Antworten: " + (dig ? "„–“ in beiden Feldern" : "beide Felder bleiben zum Ausfüllen frei"));
          }
        }
        if (hat("notfall")) {
          const dig = digital("notfall", "unterschrift");
          if (szenario === "mit") {
            ok(g.bericht.eingaben.filter((x) => x.formular === "notfall" && ["allergien", "erkrankungen", "medikamente", "sonstiges"].includes(x.name)).length === 4, "Notfallbogen mit Gesundheitsbogen: vier Gesundheitsfelder");
            gleich(g.bericht.eingaben.filter((x) => x.formular === "notfall" && ["allergien", "erkrankungen", "medikamente", "sonstiges"].includes(x.name)).map((x) => x.wert), ["Nüsse", "Asthma", dig ? "–" : "", dig ? "–" : ""], "Notfallbogen: Gesundheitsangaben und „–“ für leere Angaben");
          } else if (dig) {
            ok(!g.bericht.eingaben.some((x) => x.formular === "notfall" && ["allergien", "erkrankungen", "medikamente", "sonstiges"].includes(x.name)), "Notfallbogen ohne Gesundheitsbogen am Bildschirm: gar keine Gesundheitsfelder");
          } else {
            ok(["allergien", "erkrankungen", "medikamente", "sonstiges"].every((n) => eing("notfall", n) && eing("notfall", n).leer), "Notfallbogen ohne Gesundheitsbogen auf Papier: vier leere Gesundheitsfelder zum Ausfüllen");
          }
        }
        if (hat("einverstaendnis_fahrten")) {
          const dig = digital("einverstaendnis_fahrten", "unterschrift");
          const beantwortet = szenario === "mit";
          ok(eing("einverstaendnis_fahrten", "fahrten").leer === (!beantwortet && !dig), "Fahrten " + szenario + " Antworten: Kästchen " + (beantwortet ? "gesetzt" : dig ? "durch einen Satz ersetzt" : "frei zum Ankreuzen"));
        }
        // Aufnahmeantrag: unbeantwortete Erklärungen (Foto, Lastschrift, Familie) machen die Unterschrift zur Stift-Stelle
        if (szenario === "ohne" && variante === "bild") {
          const aaStellen = g.bericht.stellen.filter((st) => st.formular === "aufnahmeantrag");
          ok(aaStellen.find((st) => st.stelleKey === "s3.unterschrift").art === "stift", "Aufnahmeantrag: ohne Antwort zur Foto-Einwilligung wird Seite 3 mit Stift unterschrieben");
          if ((b.a.zahlung || {}).art === "sepa") ok(aaStellen.find((st) => st.stelleKey === "s4.unterschrift").art === "stift", "Aufnahmeantrag: ohne IBAN wird das Lastschriftmandat mit Stift unterschrieben");
          if (b.e.formulare.includes("familienliste")) ok(aaStellen.find((st) => st.stelleKey === "s2.unterschrift").art === "stift", "Aufnahmeantrag: ohne Familienmitglieder wird Seite 2 mit Stift unterschrieben");
          ok(g.bericht.hinweise.some((h) => h.includes(deRegeln.unterlagen.U04.name + " ist nicht beantwortet") && /Stift-Markierung/.test(h)), "Laufzettel: Hinweis, dass die „" + deRegeln.unterlagen.U04.name + "“ fehlt und mit Stift unterschrieben wird");
        }
        if (szenario === "mit" && variante === "bild") {
          const s3 = g.bericht.stellen.find((st) => st.formular === "aufnahmeantrag" && st.stelleKey === "s3.unterschrift");
          if (s3) ok(s3.art === "bild", "Aufnahmeantrag mit beantworteter " + deRegeln.unterlagen.U04.name + ": Seite 3 am Bildschirm");
        }
        const seitenMit = ["karneval_auftritte", "einverstaendnis_fahrten", "notfall"].filter((k) => S.some((s) => s.schluessel === k && s.art === "eigen")).map((k) => ({ karneval_auftritte: "Karneval", einverstaendnis_fahrten: "Fahrten", notfall: "Notfall" })[k]).join("+");
        zeilen.push(id.padEnd(32) + (szenario + " Antworten, " + (variante === "bild" ? "Bildschirm" : "Papier")).padEnd(30) + (g.r.seiten + " S").padEnd(7) + ("Stifte " + g.bericht.stellen.filter((st) => st.art === "stift").length + "/Bilder " + g.bericht.stellen.filter((st) => st.art === "bild").length).padEnd(20) + (seitenMit || "-").padEnd(28) + String(anzahl - vor).padStart(5) + " Prüfungen  " + (fehler.length - vorFehler ? fehler.length - vorFehler + " FEHLER" : "ok"));
      }
    }
  }
  console.log(zeilen.join("\n"));
}

// Rückfall: fehlt einer eigenen Seite die Stelle in den Regeln, steht dort eine Stift-Markierung und der Fall wird gemeldet
async function rueckfaelle() {
  kontext = "Rückfall";
  const ohneStelle = (b, formular, stelleKey) => {
    b.e = tief(b.e);
    b.e.unterschriften = b.e.unterschriften.filter((u) => !(u.formular === formular && u.stelleKey === stelleKey));
  };
  const pruefe = async (name, b, formular, stelleKey, erwWer, erwSeitenSchluessel) => {
    ohneStelle(b, formular, stelleKey);
    const g = await baue(b, "rueckfall-" + name + ".pdf");
    const texte = textSeiten(g.pfad);
    const st = g.bericht.stellen.find((s) => s.formular === formular && s.stelleKey === stelleKey);
    ok(Boolean(st) && st.art === "stift" && st.rueckfall === true && st.wer === erwWer, () => name + ": Rückfall als Stift-Stelle für " + erwWer + ", gefunden " + JSON.stringify(st));
    ok(g.bericht.warnungen.length === 1 && g.bericht.warnungen[0].includes(formular + "." + stelleKey) && /fehlt in den Regeln/.test(g.bericht.warnungen[0]), () => name + ": genau eine Warnung: " + JSON.stringify(g.bericht.warnungen));
    ok(st && g.bericht.seiten[st.seite - 1].schluessel === erwSeitenSchluessel, name + ": die Markierung steht auf der Seite " + erwSeitenSchluessel);
    ok(st && texte[st.seite - 1].includes("Hier mit Stift unterschreiben") && texte[st.seite - 1].includes(WER_TEXT[erwWer]), name + ": die Markierung nennt die Rolle");
    ok(st && (bilderJeSeite(g.pfad)[st.seite] || 0) === 0, name + ": trotz vorhandenem Unterschriftsbild steht dort kein Bild");
    const lz = g.bericht.seiten.map((s, i) => ({ s: s, t: texte[i] })).filter((x) => x.s.art === "laufzettel").map((x) => x.t).join(" ");
    ok(lz.includes("fehlt in den Regeln"), name + ": der Laufzettel nennt den Fall");
    const ta = g.bericht.seiten.map((s, i) => ({ s: s, t: texte[i] })).filter((x) => x.s.art === "teil-a").map((x) => x.t).join(" ");
    ok(st && new RegExp("\\b" + st.seite + " " + esc(norm(deRegeln.unterschriften[formular + "." + stelleKey]).slice(0, 18))).test(ta), name + ": Teil A nennt die Stelle mit ihrer Seite");
    return g;
  };
  // Kinder: die Person mit Sorgerecht unterschreibt
  await pruefe("attest-kind", bereite("kind-neu-deutsch-f", "bild", 0), "attest", "einwilligung", "sorgeberechtigte", "attest_einwilligung");
  await pruefe("datenschutz-kind", bereite("kind-neu-deutsch-f", "bild", 0), "datenschutz", "kenntnisnahme", "sorgeberechtigte", "datenschutz");
  await pruefe("notfall-kind", bereite("kind-neu-deutsch-f", "papier", 0), "notfall", "unterschrift", "sorgeberechtigte", "notfall");
  await pruefe("fahrten-kind", bereite("kind-neu-deutsch-f", "bild", 0), "einverstaendnis_fahrten", "unterschrift", "sorgeberechtigte", "einverstaendnis_fahrten");
  await pruefe("karneval-kind", bereite("karneval-kind-abend", "bild", 0), "karneval_auftritte", "unterschrift", "sorgeberechtigte", "karneval_auftritte");
  await pruefe("maedchen-kind", bereite("maedchen-c-jugend-jungenteam", "bild", 0), "einverstaendnis_maedchen", "unterschrift", "sorgeberechtigte", "einverstaendnis_maedchen");
  // Erwachsene: das Mitglied unterschreibt
  await pruefe("attest-erwachsen", bereite("herren-neu-deutsch", "bild", 0), "attest", "einwilligung", "mitglied", "attest_einwilligung");
  await pruefe("datenschutz-erwachsen", bereite("herren-neu-deutsch", "bild", 0), "datenschutz", "kenntnisnahme", "mitglied", "datenschutz");
  // Der Rückfall am Bildschirm-Fall zeigt: die Seite unterscheidet sich vom Regelfall nur durch die Markierung
  const b = bereite("kind-neu-deutsch-f", "bild", 0);
  const g0 = await baue(b, "rueckfall-vergleich-regelfall.pdf");
  ok(g0.bericht.warnungen.length === 0 && g0.bericht.stellen.every((s) => !s.rueckfall), "Regelfall: keine Warnung, kein Rückfall");
  // Stelle, die der Vordruck nicht kennt: Warnung statt stillem Auslassen
  const b2 = bereite("kind-neu-deutsch-f", "bild", 0);
  b2.e = tief(b2.e);
  b2.e.unterschriften.push({ formular: "aufnahmeantrag", stelleKey: "s9.unbekannt", wer: "mitglied" });
  const g2 = await baue(b2, "rueckfall-unbekannte-stelle.pdf");
  ok(g2.bericht.warnungen.length === 1 && /aufnahmeantrag\.s9\.unbekannt.*nicht vermessen/.test(g2.bericht.warnungen[0]), () => "Stelle ohne Vermessung im Vordruck wird als Warnung gemeldet: " + JSON.stringify(g2.bericht.warnungen));
}

// ---------------------------------------------------------------------------------------------
// Schnittstelle und Quelltext
// ---------------------------------------------------------------------------------------------
function schnittstelle() {
  kontext = "Schnittstelle";
  const quelle = readFileSync(path.join(WURZEL, "assets", "js", "anmeldung", "pdf.js"), "utf8");
  const ohneKommentare = quelle.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'])\/\/.*$/gm, "$1");
  ok(!/from\s+['"]node:|require\(|process\.|Buffer/.test(quelle), "pdf.js importiert keine Node-Module (grep node:, require(, process., Buffer)");
  ok(!/\bwindow\b|\bdocument\b|\blocalStorage\b|\bsessionStorage\b|\bfetch\(|XMLHttpRequest|navigator\./.test(ohneKommentare), "pdf.js greift nicht auf window, document, Speicher oder Netz zu");
  ok(!/Date\.now\(|new Date\(\)|Math\.random\(/.test(ohneKommentare), "pdf.js liest weder Uhrzeit noch Zufall");
  const importe = [...quelle.matchAll(/^import\s.*from\s+["']([^"']+)["']/gm)].map((m) => m[1]);
  gleich(importe.sort(), ["./regeln.js", "./texte/de-regeln.js"], "pdf.js importiert nur regeln.js und de-regeln.js");
  ok(!/^export default|\bawait import\(/m.test(ohneKommentare), "keine dynamischen Importe");
  gleich(typeof erzeugePdf + typeof benoetigteVorlagen + typeof dateiname, "functionfunctionfunction", "Exporte erzeugePdf, benoetigteVorlagen und dateiname");
  // dateiname
  gleich(dateiname({ vorname: "Mia", nachname: "Mustermann" }), "Anmeldung_Mustermann_Mia.pdf", "Dateiname Muster");
  gleich(dateiname({ vorname: "Jörg", nachname: "Müller" }), "Anmeldung_Mueller_Joerg.pdf", "Dateiname mit Umlauten");
  gleich(dateiname({ vorname: "Anna Lena", nachname: "de la Cruz" }), "Anmeldung_de-la-Cruz_Anna-Lena.pdf", "Dateiname mit Leerzeichen");
  gleich(dateiname({ vorname: "", nachname: "" }), "Anmeldung_Person.pdf", "Dateiname ohne Namen");
  gleich(dateiname({ vorname: "Max/../x", nachname: "A:B*C" }), "Anmeldung_A-B-C_Max-x.pdf", "Dateiname ohne Pfadzeichen");
  gleich(dateiname(undefined), "Anmeldung_Person.pdf", "Dateiname ohne Antworten");
  // benoetigteVorlagen
  const alleVorlagen = new Set(Object.keys(konfig.formulare.formulare));
  const gesehen = new Set();
  for (const p of PROFILE) {
    const e = auswerten(p.a, konfig, p.heute);
    const v = benoetigteVorlagen(e, p.a);
    ok(v.every((k) => alleVorlagen.has(k)) && v.length === new Set(v).size, "benoetigteVorlagen(" + p.id + ") nennt nur bekannte, verschiedene Vordrucke: " + v.join(","));
    ok(!e.formulare.includes("aufnahmeantrag") || v.includes("aufnahmeantrag"), "Aufnahmeantrag gehört zu den benötigten Vordrucken (" + p.id + ")");
    ok(["hfv_antrag", "vollmacht", "abmeldung", "einverstaendnis_senioren"].every((k) => v.includes(k) === e.formulare.includes(k)), "benoetigteVorlagen(" + p.id + ") stimmt mit e.formulare überein");
    ok(JSON.stringify(v) === JSON.stringify(benoetigteVorlagen(e)), "benoetigteVorlagen(" + p.id + ") braucht die Antworten nicht");
    v.forEach((k) => gesehen.add(k));
  }
  gleich([...gesehen].sort(), [...alleVorlagen].sort(), "alle fünf Vordrucke werden von irgendeinem Profil gebraucht");
  // Einfache Sprache in Teil A: höchstens 12 Wörter pro Satz
  for (const [schluessel, wert] of Object.entries(TEXTE_TEIL_A)) {
    const saetze = String(wert).split(/(?<=[.!?])\s+/).map((z) => z.trim()).filter(Boolean);
    saetze.forEach((satz) => ok(satz.replace(/[.!?]$/, "").split(/\s+/).length <= 12, () => "Teil A, " + schluessel + ": mehr als 12 Wörter: „" + satz + "“"));
    ok(!/\b(HFV|DFB|bzw\.|ggf\.|z\. ?B\.)|§/.test(wert), "Teil A, " + schluessel + ": keine Abkürzungen oder Paragraphen");
    ok(!/\bDu\b|\bdein/i.test(wert), "Teil A, " + schluessel + ": Sie-Form");
  }
  // Runde 3: die neuen Sätze der Familientexte (Erlaubnis für das Attest, Absprache, Datenschutz Nr. 5 und 8, Notfall) in Einfacher Sprache
  for (const text of NEUE_SAETZE) {
    const saetze = saetzeVon(text);
    ok(saetze.length >= 1, "Neue Sätze: „" + text + "“ enthält Sätze");
    saetze.forEach((satz) => ok(woerterVon(satz) <= 12, () => "Neuer Satz mit " + woerterVon(satz) + " Wörtern (höchstens 12): „" + satz + "“"));
  }
  gleich(saetzeVon(ABSPRACHE_EINWILLIGUNG).length, 2, "Satzzähler: „Art. 9 Abs. 2 lit. a DSGVO“ beendet keinen Satz");
}

// ---------------------------------------------------------------------------------------------
// Ablauf
// ---------------------------------------------------------------------------------------------
async function haupt() {
  const start = Date.now();
  for (const w of ["pdftotext", "pdfinfo", "pdfimages", "pdftoppm"]) {
    const r = spawnSync(w, ["-v"], { encoding: "utf8" });
    if (r.error) {
      console.error("Werkzeug fehlt: " + w + " (poppler). " + r.error.message);
      process.exit(2);
    }
  }
  rmSync(AUSGABE, { recursive: true, force: true });
  mkdirSync(RENDER, { recursive: true });
  await ladeTestbilder();
  basisBilder();
  console.log("PDF-Test: " + PROFILE.length + " Profile, Ausgabe nach " + path.relative(WURZEL, AUSGABE));
  const zeilen = [];
  let index = 0;
  for (const p of PROFILE) {
    if (NUR_PROFILE.length && !NUR_PROFILE.includes(p.id)) {
      index += 1;
      continue;
    }
    const vor = anzahl;
    const vorFehler = fehler.length;
    kontext = p.id;
    const varianten = ["bild", "papier"];
    if (index % 3 === 0) varianten.push("leer");
    const beschr = [];
    for (const v of varianten) {
      kontext = p.id + " (" + v + ")";
      const b = bereite(p.id, v, index);
      const datei = v === "bild" ? p.id + ".pdf" : p.id + "-" + (v === "papier" ? "papier" : "ohne-bilder") + ".pdf";
      let g;
      try {
        g = await baue(b, datei);
      } catch (x) {
        ok(false, "PDF konnte nicht erzeugt werden: " + (x.stack || x.message).split("\n").slice(0, 3).join(" | "));
        continue;
      }
      await pruefePdf(b, g, { tief: v === "bild", bilder: true, nachweise: v === "bild" });
      beschr.push(v + ":" + g.r.seiten + "S/" + Math.round(g.r.bytes.length / 1024) + "KB/" + g.r.teile.map((t) => t.teil).join(""));
      if (v === "bild" && RENDER_PROFILE.includes(p.id)) {
        const r = sh("pdftoppm", ["-png", "-r", "70", g.pfad, path.join(RENDER, p.id)]);
        ok(r.status === 0, "Rendering von " + p.id + " fehlgeschlagen");
      }
    }
    zeilen.push(p.id.padEnd(40) + beschr.join("  ").padEnd(56) + String(anzahl - vor).padStart(5) + " Prüfungen  " + (fehler.length - vorFehler ? fehler.length - vorFehler + " FEHLER" : "ok"));
    index += 1;
  }
  console.log(zeilen.join("\n"));
  kontext = "";
  if (MIT_SZENARIEN) await szenarien();
  kontext = "";
  if (!OHNE_SONDERFAELLE) {
    await sonderfaelle();
    await rueckfaelle();
  }
  schnittstelle();
  kontext = "";
  const renderDateien = readdirSync(RENDER).filter((f) => f.endsWith(".png"));
  if (!NUR_PROFILE.length) ok(renderDateien.length >= 4 * 12, "Renderings der vier ausgewählten Profile liegen vor (" + renderDateien.length + " Bilder)");
  rmSync(path.join(AUSGABE, "_grau.pgm"), { force: true });
  console.log("\n" + anzahl + " Einzelprüfungen in " + ((Date.now() - start) / 1000).toFixed(0) + " s, " + fehler.length + " Fehler");
  writeFileSync(path.join(AUSGABE, "fehler.txt"), fehler.join("\n") + "\n");
  if (fehler.length) {
    console.log(fehler.slice(0, 80).map((f) => " - " + f).join("\n"));
    if (fehler.length > 80) console.log(" … und " + (fehler.length - 80) + " weitere");
    process.exit(1);
  }
  console.log("PDF-Test bestanden. Renderings: " + path.relative(WURZEL, RENDER));
}

haupt().catch((x) => {
  console.error("Abbruch:", x.stack || x);
  process.exit(1);
});
