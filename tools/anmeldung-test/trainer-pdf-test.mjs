// Tests der PDF-Erzeugung der Seite „Neu im Trainerteam“: assets/js/anmeldung/trainer-pdf.js (Paket T2, Stufe 2)
// Aufruf: node tools/anmeldung-test/trainer-pdf-test.mjs   (Exit-Code 0 bei Erfolg, sonst 1)
//
// Läuft ohne Browser: pdf-lib, fontkit und die Schrift kommen aus node_modules und assets/fonts (werkzeuge, siehe
// trainer-pdf-lader.js). Mit erfundenen Beispieldaten entstehen die Dateien in tools/cache/trainer-pdf-test/ (git-ignoriert),
// dazu Bilder der Seiten (pdftoppm, 100 dpi) in .../bilder/. Geprüft wird (Nummern wie die Akzeptanzkriterien in t2/AUFTRAG.md):
//  K2   Dateien und Namen: beantragen = drei Dateien, vorhanden = zwei; Namen mit Umlauten, Leerzeichen und Sonderzeichen
//  K3   PDF gültig: pdf-lib, pdfinfo (A4, Seitenzahl), pdffonts (Liberation Sans eingebettet), pdftotext (Text auswählbar)
//  K4   Wortlaute: Selbstauskunft (ap3/BERICHT.md 3.3), Brief (ap1/texte.mjs), Deckblatt, Löschfrist, vier Fälle der Einsichtnehmenden
//       (eine Person als Standardfall, zwei, drei, leere Liste; Namensteil nur über trainer-einsicht.js, Sätze pronomenfrei)
//  K5   Antrag ohne Vereinsunterschrift: kein Bild (pdfimages, pdf-lib), Unterzeichner aus der Konfiguration, leere Linie hinter „i.A.“
//  K6   Unterschrift der Person auf genau vier Stellen; ohne Unterschrift oder ohne Foto ein Fehler mit klarer Meldung
//  K7   Karneval („Gruppe“ statt „Mannschaft“) und Rollen (Torwarttrainer)
//  K8   Aussehen: Seiten als PNG; kein Wort über dem Rand (pdftotext -bbox), Schrift mindestens 9 pt außer Fußzeilen (pdftohtml)
//  K9   keine echten Daten: nur die zwei Beispielnummern, keine Rufnummer des Vereins, keine Namen aus dem Umfeld des Auftrags
//       (öffentliche nur als SHA-256, private aus der git-ignorierten Liste tools/cache/pii-namen.txt wie tools/pii-check.py)
//  K10  Vorschau des Antrags = Antrag der Dateien (Text)
//  K11  Größe (höchstens 2 MB bei einem Foto von 600 × 800 Pixeln) und Zeit (höchstens 5 Sekunden)
//  K12  Fristen, Sonderzeichen, sehr lange Angaben, Fehlerfälle, Metadaten, Wiederholbarkeit, Quelltext (kein DOM, keine Uhr, kein Name)
//  K13  (T1b) Schrift im Paket: trainer-pdf-lader.js › leseModulText liest den Base64-Text aus dem Quelltext des Schriftmoduls (der Lader holt
//       ihn per fetch statt per import(), weil Safari ein gescheitertes import() für die ganze Sitzung merkt): Format wie der Paketbau, Bytes
//       gleich dem Import und der Schriftdatei, Abwandlungen, unbekannte Formate (null: dann bleibt der Rückfall auf import()), Zeit
// Werkzeuge: poppler (pdftotext, pdfinfo, pdffonts, pdfimages, pdftoppm, pdftohtml; Homebrew, /opt/homebrew/bin).
// Sollwortlaute: Der Test trägt sie selbst (wörtlich aus ap3/BERICHT.md 3.3 und ap1/texte.mjs). Liegen die Quellen vor
// (Umgebungsvariable TRAINER_QUELLE oder ../speuzer-website-prototyp/tools/cache/orchestrierung-trainer), vergleicht er zusätzlich
// die Quelldateien mit den Texten des Moduls; sonst steht „Quelle nicht gefunden“ in der Ausgabe.

import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import zlib from "node:zlib";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as PDFLib from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { erzeugeDateien, vorschauAntrag, TrainerPdfFehler } from "../../assets/js/anmeldung/trainer-pdf.js";
import { einsichtNamen } from "../../assets/js/anmeldung/trainer-einsicht.js";
import { T } from "../../assets/js/anmeldung/trainer-pdf-texte.js";
import SCREEN_TEXTE from "../../assets/js/anmeldung/texte/trainer-de.js";
import { dateiteil } from "../../assets/js/anmeldung/hilfen.js";
import { LadeFehler } from "../../assets/js/anmeldung/pdf-lader.js";
import { leseModulText } from "../../assets/js/anmeldung/trainer-pdf-lader.js";

const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const MODULE = path.join(WURZEL, "assets", "js", "anmeldung");
const AUSGABE = process.env.TRAINER_PDF_AUSGABE || path.join(WURZEL, "tools", "cache", "trainer-pdf-test");
const RENDER = path.join(AUSGABE, "bilder");
const QUELLE = process.env.TRAINER_QUELLE || path.join(WURZEL, "..", "speuzer-website-prototyp", "tools", "cache", "orchestrierung-trainer");
const ENV = Object.assign({}, process.env, { PATH: "/opt/homebrew/bin:/usr/local/bin:" + (process.env.PATH || "") });
const HEUTE = "2026-11-24";

// ---------------------------------------------------------------------------------------------
// Prüf-Werkzeuge
// ---------------------------------------------------------------------------------------------
const fehler = [];
const statistik = new Map(); // Kontext -> { n, f }
let kontext = "";
let anzahl = 0;
let saetze = 0; // verglichene Sätze und Wortlaute (K4)

function ok(bedingung, meldung) {
  anzahl += 1;
  const s = statistik.get(kontext) || { n: 0, f: 0 };
  s.n += 1;
  if (!bedingung) {
    s.f += 1;
    fehler.push("[" + kontext + "] " + (typeof meldung === "function" ? meldung() : meldung));
  }
  statistik.set(kontext, s);
  return Boolean(bedingung);
}
const norm = (s) => String(s).replace(/\s+/g, " ").trim();
const kurz = (s) => (s.length > 100 ? s.slice(0, 100) + "…" : s);
const enthaelt = (text, teil, meldung) => ok(norm(text).includes(norm(teil)), () => (meldung || "fehlt") + ": „" + kurz(teil) + "“");
const fehltIn = (text, teil, meldung) => ok(!norm(text).includes(norm(teil)), () => (meldung || "darf nicht vorkommen") + ": „" + kurz(teil) + "“");
const wortlaut = (text, soll, meldung) => {
  saetze += 1;
  return enthaelt(text, soll, meldung || "Wortlaut fehlt");
};

async function wirft(fn, art, teilMeldung, was) {
  let f = null;
  try {
    await fn();
  } catch (e) {
    f = e;
  }
  ok(f instanceof TrainerPdfFehler, () => was + ": erwartet TrainerPdfFehler, bekommen " + (f ? f.constructor.name + " " + f.message : "keinen Fehler"));
  if (f instanceof TrainerPdfFehler) {
    ok(f.art === art, () => was + ": Art " + art + " erwartet, ist " + f.art);
    ok(teilMeldung === undefined || f.message.includes(teilMeldung), () => was + ": Meldung soll „" + teilMeldung + "“ nennen: " + f.message);
  }
}

function sh(befehl, argumente) {
  const r = spawnSync(befehl, argumente, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024, env: ENV });
  if (r.error) throw new Error(befehl + ": " + r.error.message + " (poppler installiert? /opt/homebrew/bin)");
  return r;
}
const kopie = (x) => JSON.parse(JSON.stringify(x));

// ---------------------------------------------------------------------------------------------
// poppler
// ---------------------------------------------------------------------------------------------
function seitenText(pfad) {
  const teile = sh("pdftotext", ["-raw", pfad, "-"]).stdout.split("\f");
  if (teile.length && teile[teile.length - 1].trim() === "") teile.pop();
  return teile.map(norm);
}
const gesamtText = (pfad) => seitenText(pfad).join(" ");

function infoSeiten(pfad) {
  const r = sh("pdfinfo", ["-f", "1", "-l", "999", pfad]).stdout;
  const seiten = [...r.matchAll(/^Page\s+(\d+) size:\s+([\d.]+) x ([\d.]+) pts/gm)].map((m) => ({ nr: Number(m[1]), b: Number(m[2]), h: Number(m[3]) }));
  const feld = (name) => ((new RegExp("^" + name + ":\\s*(.*)$", "m").exec(r) || [])[1] || "").trim();
  return { seiten, anzahl: Number(feld("Pages")), titel: feld("Title"), ersteller: feld("Creator"), autor: feld("Author"), betreff: feld("Subject") };
}

function schriften(pfad) {
  const zeilen = sh("pdffonts", [pfad]).stdout.split("\n").slice(2).filter((z) => z.trim());
  return zeilen.map((z) => {
    const teile = z.trim().split(/\s+/);
    return { name: teile[0], emb: /\syes\s+(yes|no)\s+(yes|no)\s+\d+\s+\d+\s*$/.test(z) || / yes /.test(z) };
  });
}

// Bilder der Datei: [{ seite, art }] (art: image oder smask)
function bilder(pfad) {
  const zeilen = sh("pdfimages", ["-list", pfad]).stdout.split("\n").slice(2).filter((z) => z.trim());
  return zeilen.map((z) => {
    const t = z.trim().split(/\s+/);
    return { seite: Number(t[0]), art: t[2] };
  });
}

function woerter(pfad) {
  const x = sh("pdftotext", ["-bbox", pfad, "-"]).stdout;
  const seiten = x.split("<page ").slice(1);
  return seiten.map((blatt, i) => {
    const m = /width="([\d.]+)" height="([\d.]+)"/.exec(blatt);
    const w = [...blatt.matchAll(/<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)<\/word>/g)].map((a) => ({ x0: +a[1], y0: +a[2], x1: +a[3], y1: +a[4], t: a[5] }));
    return { nr: i + 1, breite: +m[1], hoehe: +m[2], woerter: w };
  });
}

// Textstücke mit Schriftgröße in Punkten (pdftohtml -xml -zoom 1)
function groessen(pfad) {
  const x = sh("pdftohtml", ["-xml", "-zoom", "1", "-i", "-stdout", "-nodrm", pfad]).stdout;
  return x
    .split("<page ")
    .slice(1)
    .map((blatt, i) => {
      const spez = {};
      for (const m of blatt.matchAll(/<fontspec id="(\d+)" size="([\d.]+)"/g)) spez[m[1]] = Number(m[2]);
      const texte = [...blatt.matchAll(/<text top="(\d+)" left="(\d+)" width="(\d+)" height="(\d+)" font="(\d+)">([\s\S]*?)<\/text>/g)].map((a) => ({ top: +a[1], size: spez[a[5]], text: a[6].replace(/<[^>]+>/g, "") }));
      return { nr: i + 1, texte };
    });
}

function rendere(pfad, vorname) {
  mkdirSync(RENDER, { recursive: true });
  sh("pdftoppm", ["-r", "100", "-png", pfad, path.join(RENDER, vorname)]);
}

// ---------------------------------------------------------------------------------------------
// Bilder für die Probeläufe: gezeichnete Unterschrift (PNG, transparent) und Foto (JPEG 600 × 800)
// ---------------------------------------------------------------------------------------------
function pngChunk(typ, daten) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(daten.length);
  const td = Buffer.concat([Buffer.from(typ, "ascii"), daten]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(zlib.crc32(td) >>> 0);
  return Buffer.concat([len, td, crc]);
}

// Eine Unterschrift in vierfacher Auflösung (wie unterschrift.js › holePng): geschwungene Linie mit Schleifen, runde Striche, Vereinsblau
function unterschriftPng(b, h, variante) {
  const px = new Uint8ClampedArray(b * h * 4);
  const r = 4.8;
  const punkte = [];
  for (let i = 0; i <= 400; i++) {
    const t = i / 400;
    punkte.push([45 + t * (b - 120) + 38 * Math.sin(6 * Math.PI * t + variante), h / 2 + 0.36 * h * Math.sin(3.4 * Math.PI * t + 0.5 + variante) * (1 - 0.45 * t)]);
  }
  for (let i = 0; i < punkte.length - 1; i++) {
    const [x0, y0] = punkte[i];
    const [x1, y1] = punkte[i + 1];
    const xa = Math.max(0, Math.floor(Math.min(x0, x1) - r - 1));
    const xb = Math.min(b - 1, Math.ceil(Math.max(x0, x1) + r + 1));
    const ya = Math.max(0, Math.floor(Math.min(y0, y1) - r - 1));
    const yb = Math.min(h - 1, Math.ceil(Math.max(y0, y1) + r + 1));
    const dx = x1 - x0;
    const dy = y1 - y0;
    const l2 = dx * dx + dy * dy || 1;
    for (let y = ya; y <= yb; y++) {
      for (let x = xa; x <= xb; x++) {
        const u = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / l2));
        const a = Math.max(0, Math.min(1, r + 0.5 - Math.hypot(x - (x0 + u * dx), y - (y0 + u * dy)))) * 255;
        const o = (y * b + x) * 4;
        if (a > px[o + 3]) {
          px[o] = 0x19;
          px[o + 1] = 0x17;
          px[o + 2] = 0x93;
          px[o + 3] = a;
        }
      }
    }
  }
  const roh = Buffer.alloc((b * 4 + 1) * h);
  for (let y = 0; y < h; y++) Buffer.from(px.buffer, y * b * 4, b * 4).copy(roh, y * (b * 4 + 1) + 1);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(b, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return new Uint8Array(Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), pngChunk("IHDR", ihdr), pngChunk("IDAT", zlib.deflateSync(roh)), pngChunk("IEND", Buffer.alloc(0))]));
}

// Foto 600 × 800: das künstliche Testbild (testbilder/foto-3x4.jpg) mit sips auf die Größe gebracht; ohne sips das Testbild selbst
function foto600x800() {
  const quelle = path.join(WURZEL, "tools", "anmeldung-test", "testbilder", "foto-3x4.jpg");
  const ziel = path.join(AUSGABE, "foto-600x800.jpg");
  const r = spawnSync("sips", ["-z", "800", "600", quelle, "--out", ziel], { encoding: "utf8" });
  if (!r.error && r.status === 0 && existsSync(ziel)) return { bytes: new Uint8Array(readFileSync(ziel)), maß: "600 × 800" };
  return { bytes: new Uint8Array(readFileSync(quelle)), maß: "375 × 500 (sips fehlt)" };
}

// ---------------------------------------------------------------------------------------------
// Eingaben: alles erfunden (Max Mustermann, 0170 1234567 und 0170 7654321, example.com)
// ---------------------------------------------------------------------------------------------
const BEISPIEL = {
  vorname: "Max",
  nachname: "Mustermann",
  geburtsdatum: "1988-03-14",
  anschrift: { strasse: "Musterstraße 12", plz: "60326", ort: "Frankfurt am Main" },
  handy: "0170 1234567",
  email: "max.mustermann@example.com",
  abteilung: "fussball",
  mannschaft: "D3-Jugend",
  rolle: "co-trainer",
  seit: "2026-11-02",
  tage: ["di", "do", "sa"],
  notfall: { name: "Erika Mustermann", beziehung: "Partnerin", telefon: "0170 7654321" },
  beruf: "Elektriker",
  erfahrung: "Drei Jahre Jugendtrainer bei einem anderen Verein (E-Jugend).",
  ersteHilfe: "ja",
  ersteHilfeAm: "2025-05-12",
  ersteHilfeBis: null,
  sonstiges: "",
  foto: true,
  kodexGelesen: true,
  selbstauskunft: true,
  zeugnis: "beantragen",
  satzung: true,
};

// Standardfall: genau eine einsichtnehmende Person (GEMEINSAM.md 3)
const KONFIG = {
  live: true,
  verein: {
    name: "FFV Sportfreunde 04",
    name_register: "Frankfurter Fußballverein Sportfreunde 1904 e. V.",
    ort: "Frankfurt am Main",
    mail: "geschaeftsstelle@sportfreunde04.de",
    anschrift: { postfach: "Postfach 190442", postfachPlz: "60091", postfachOrt: "Frankfurt am Main", strasse: "Mainzer Landstraße 480", plz: "60326", ort: "Frankfurt am Main" },
    unterzeichner: { name: "Melanie Seipp", funktion: "Vorstand" },
  },
  einsicht: [{ name: "Melanie Seipp", funktion: "1. Vorsitzende" }],
  schnupperMonate: 1,
  zeugnisJahre: 5,
};

// Ausgabeordner zuerst anlegen (sips schreibt sonst eine Datei statt des Ordners)
rmSync(AUSGABE, { recursive: true, force: true });
mkdirSync(RENDER, { recursive: true });

const SIG = unterschriftPng(1000, 360, 0);
const FOTO = foto600x800();
const SCHRIFT = new Uint8Array(readFileSync(path.join(WURZEL, "assets", "fonts", "liberation-sans-regular.ttf")));
const WERKZEUGE = { PDFLib, fontkit, schrift: SCHRIFT };

async function baue(fall, optionen) {
  const o = optionen || {};
  const antworten = o.antworten || kopie(BEISPIEL);
  const konfig = o.konfig || kopie(KONFIG);
  const medien = o.medien || { foto: FOTO.bytes, unterschrift: SIG };
  const t0 = performance.now();
  const r = await erzeugeDateien({ antworten, medien, konfig, heute: o.heute || HEUTE, werkzeuge: WERKZEUGE });
  const ms = performance.now() - t0;
  const ordner = path.join(AUSGABE, fall);
  mkdirSync(ordner, { recursive: true });
  const pfade = {};
  for (const d of r.dateien) {
    writeFileSync(path.join(ordner, d.name), d.bytes);
    pfade[d.name] = path.join(ordner, d.name);
  }
  return { r, pfade, ms, antworten, konfig, ordner };
}

const paketName = (a) => "Trainerunterlagen_" + dateiteil(a.nachname) + "_" + dateiteil(a.vorname) + ".pdf";
const antragName = (a) => "Antrag_Gebuehrenbefreiung_" + dateiteil(a.nachname) + "_" + dateiteil(a.vorname) + ".pdf";
const fotoName = (a) => "Passfoto_" + dateiteil(a.nachname) + "_" + dateiteil(a.vorname) + ".jpg";
const SEITENTITEL = {
  deckblatt: "Trainerunterlagen – Übersicht",
  anmeldung: "Anmeldung als Mitglied (beitragsfrei)",
  kontakt: "Kontaktdatenblatt für Trainer und Betreuer",
  selbstauskunft: "Selbstauskunft und Selbstverpflichtung (Kinder- und Jugendarbeit)",
  kodex: "Verhaltenskodex zum Kindeswohl – Erklärung",
  datenschutz: "Information zum Datenschutz",
};
const seiteMit = (seiten, teil) => seiten.findIndex((t) => t.includes(teil)) + 1;

// ---------------------------------------------------------------------------------------------
// Sollwortlaute, wörtlich aus den Quellen (ap3/BERICHT.md 3.3; ap1/texte.mjs › blaetter.antrag und .deckblatt; ap1/AUFTRAG.md)
// ---------------------------------------------------------------------------------------------
const SOLL_SELBSTAUSKUNFT = [
  "Selbstauskunft und Selbstverpflichtung (Kinder- und Jugendarbeit)",
  "Ich bin nicht wegen einer Straftat nach den §§ 171, 174 bis 174c, 176 bis 180a, 181a, 182 bis 184g, 184i, 184j, 184k, 184l, 201a Absatz 3, 225, 232 bis 233a, 234, 235 oder 236 des Strafgesetzbuchs (Straftaten nach § 72a Absatz 1 Satz 1 SGB VIII) rechtskräftig verurteilt.",
  "Gegen mich läuft wegen einer dieser Straftaten kein Ermittlungs- oder Strafverfahren.",
  "Wird gegen mich ein solches Verfahren eingeleitet oder werde ich verurteilt, teile ich das dem Vorstand des Vereins unverzüglich mit.",
  "Diese Erklärung ersetzt das erweiterte Führungszeugnis nicht.",
];
const SOLL_ANTRAG = [
  "Frankfurt am Main, 24.11.2026",
  "Ort, Datum",
  "AUSSTELLUNG EINES ERWEITERTEN FÜHRUNGSZEUGNISSES FÜR DIE EHRENAMTLICHE UND UNENTGELTLICHE TÄTIGKEIT",
  "ANTRAG AUF GEBÜHRENBEFREIUNG",
  "Sehr geehrte Damen und Herren,",
  "unser Verein bietet Kindern und Jugendlichen die Möglichkeit zur Ausübung des Fußballsports in entsprechenden Altersklassen und hat sich dem Kinderschutz verpflichtet. Wir sind ein als gemeinnützig anerkannter Verein.",
  "Herr/Frau Max Mustermann , geb. am 14.03.1988",
  "wohnhaft Musterstraße 12, 60326 Frankfurt am Main",
  "[vollständige Adresse]",
  "ist bei uns als Co-Trainer Fußball / Jugend ehrenamtlich und unentgeltlich tätig.",
  "Im Rahmen seines/ihres Ehrenamts gehört u.a. die Beaufsichtigung, Betreuung, Erziehung und Ausbildung von Minderjährigen (§ 30a Abs. 1 Nr. 2 Buchst. a BZRG) zu seinem/ihrem Aufgabenbereich.",
  "Wir bestätigen, dass die Voraussetzungen des § 30a Abs. 1 BZRG vorliegen, und bitten mit Bezug auf das Bundeszentralregistergesetz (§ 30a) um Erstellung eines erweiterten Führungszeugnisses zur Vorlage bei uns.",
  "Unter Hinweis auf die Vorbemerkung 1.1.3 zum Kostenverzeichnis des JVKostG beantragen wir zugleich die Gebührenfreiheit.",
  "Wir bedanken uns für Ihre Unterstützung und verbleiben",
  "mit freundlichen Grüßen",
  "FFV Sportfreunde 04 e.V.",
  "Melanie Seipp",
  "Vorstand",
  "i.A.",
];
const SOLL_DECKBLATT = [
  "Trainerunterlagen – Übersicht",
  "Max Mustermann",
  "Mannschaft D3-Jugend",
  "Rolle Co-Trainer",
  "Dabei seit 02.11.2026",
  "Unterlagen fällig am 02.12.2026",
  "Erstellt am 24.11.2026",
  "Stand der Abgabe",
  "Anmeldung (beitragsfrei), unterschrieben",
  "Kontaktdatenblatt",
  "Selbstauskunft, unterschrieben",
  "Verhaltenskodex, unterschrieben",
  "Passfoto (eigene Bilddatei)",
];
const BESCHREIBUNG = {
  paket: "Deckblatt, Anmeldung, Kontaktdatenblatt, Selbstauskunft, Verhaltenskodex, Datenschutzinformation",
  antrag: "Antrag für dein Führungszeugnis",
  foto: "Dein Passfoto",
};
// Pronomenfreie Sätze der Einsicht (GEMEINSAM.md 3), vorn mit dem Namensteil
const EINSICHT_REST = "Das Zeugnis wird nur angeschaut: Es wird nicht mitgenommen und nicht kopiert. Notiert werden nur: Datum der Einsicht, Datum des Zeugnisses und ob eine einschlägige Verurteilung darin steht (ja oder nein).";
const einsichtSatzPerson = (lang) => "Die Person zeigt das Zeugnis persönlich " + lang + ". " + EINSICHT_REST;
const einsichtSatzDu = (lang) => "Du zeigst das Zeugnis persönlich " + lang + ". " + EINSICHT_REST;
// Die Überschriften der Information zum Datenschutz sind Fragen; sonst darf kein „?“ (Ersatz für ein fehlendes Zeichen) im Text stehen
const FRAGEN = ["1. Wer ist verantwortlich?", "2. Welche Daten verarbeiten wir?", "3. Wofür verarbeiten wir die Daten, und auf welcher Rechtsgrundlage?", "4. An wen geben wir Daten weiter?", "5. Wie lange speichern wir die Daten?", "8. Musst du die Daten angeben?"];
const ohneFragen = (text) => FRAGEN.reduce((t, f) => t.split(f).join(""), norm(text));

// ---------------------------------------------------------------------------------------------
// Läufe
// ---------------------------------------------------------------------------------------------
const quellenGeprueft = [];
const beginn = performance.now();

// ============ K2, K3: Beispiel (beantragen), drei Dateien ============
kontext = "K2 Dateien und Namen";
const bsp = await baue("beispiel");
{
  const dateien = bsp.r.dateien;
  ok(dateien.length === 3, () => "beantragen: drei Dateien, bekommen " + dateien.length);
  ok(JSON.stringify(dateien.map((d) => d.name)) === JSON.stringify(["Trainerunterlagen_Mustermann_Max.pdf", "Antrag_Gebuehrenbefreiung_Mustermann_Max.pdf", "Passfoto_Mustermann_Max.jpg"]), () => "Dateinamen: " + dateien.map((d) => d.name).join(", "));
  ok(JSON.stringify(dateien.map((d) => d.typ)) === JSON.stringify(["application/pdf", "application/pdf", "image/jpeg"]), "Dateitypen");
  ok(JSON.stringify(dateien.map((d) => d.beschreibung)) === JSON.stringify([BESCHREIBUNG.paket, BESCHREIBUNG.antrag, BESCHREIBUNG.foto]), () => "Beschreibungen wie Bildschirm 13: " + dateien.map((d) => d.beschreibung).join(" | "));
  ok(dateien.every((d) => d.bytes instanceof Uint8Array && d.bytes.length > 0), "alle Dateien sind nicht leere Uint8Array");
  ok(Buffer.compare(Buffer.from(dateien[2].bytes), Buffer.from(FOTO.bytes)) === 0, "Passfoto ist medien.foto, unverändert");
  ok(Array.isArray(bsp.r.warnungen) && bsp.r.warnungen.length === 0, () => "keine Warnungen: " + JSON.stringify(bsp.r.warnungen));

  const vorh = await baue("vorhanden", { antworten: Object.assign(kopie(BEISPIEL), { zeugnis: "vorhanden" }) });
  ok(vorh.r.dateien.length === 2 && vorh.r.dateien.map((d) => d.name).join() === "Trainerunterlagen_Mustermann_Max.pdf,Passfoto_Mustermann_Max.jpg", () => "vorhanden: zwei Dateien, kein Antrag: " + vorh.r.dateien.map((d) => d.name).join(", "));
  const vt = gesamtText(vorh.pfade["Trainerunterlagen_Mustermann_Max.pdf"]);
  wortlaut(vt, "Erweitertes Führungszeugnis: liegt der Person vor; Einsicht bei Melanie Seipp steht aus");
  fehltIn(vt, "Antrag auf Gebührenbefreiung liegt bei", "vorhanden: Deckblatt nennt keinen beiliegenden Antrag");
  fehltIn(vt, "Die Unterschrift des Vereins auf dem Antrag auf Gebührenbefreiung fehlt noch.", "vorhanden: kein Hinweis auf die fehlende Vereinsunterschrift");
  ok(infoSeiten(vorh.pfade["Trainerunterlagen_Mustermann_Max.pdf"]).anzahl === 7, "vorhanden: Paket hat ebenfalls 7 Seiten");

  // Namen mit Umlauten, Leerzeichen und Sonderzeichen ergeben gültige Dateinamen (wie der Assistent: dateiteil)
  const namen = [
    ["Müller-Lüdenscheidt", "Hans Jürgen", "Muller-Ludenscheidt", "Hans-Jurgen"],
    ["Ça va", "Zoë", "Ca-va", "Zoe"],
    ["O'Brien", "Seán", "O-Brien", "Sean"],
    ["Özkan", "Éloïse-Marie", "Ozkan", "Eloise-Marie"],
  ];
  for (const [n, v, en, ev] of namen) {
    const a = Object.assign(kopie(BEISPIEL), { nachname: n, vorname: v });
    const r = await baue("namen-" + dateiteil(n), { antworten: a });
    const soll = ["Trainerunterlagen_" + en + "_" + ev + ".pdf", "Antrag_Gebuehrenbefreiung_" + en + "_" + ev + ".pdf", "Passfoto_" + en + "_" + ev + ".jpg"];
    ok(JSON.stringify(r.r.dateien.map((d) => d.name)) === JSON.stringify(soll), () => "Name „" + n + ", " + v + "“: " + r.r.dateien.map((d) => d.name).join(", "));
    ok(r.r.dateien.every((d) => /^[A-Za-z0-9._-]+$/.test(d.name)), () => "gültige Dateinamen (nur Buchstaben, Ziffern, _ . -): " + r.r.dateien.map((d) => d.name).join(", "));
    ok(r.r.warnungen.length === 0, () => "Name „" + n + "“ ohne Warnungen: " + JSON.stringify(r.r.warnungen));
  }
}

kontext = "K3 PDF gültig";
{
  const paket = bsp.pfade["Trainerunterlagen_Mustermann_Max.pdf"];
  const antrag = bsp.pfade["Antrag_Gebuehrenbefreiung_Mustermann_Max.pdf"];
  const erwartet = [
    [paket, 7, "Trainerunterlagen"],
    [antrag, 1, "Antrag"],
  ];
  for (const [pfad, seiten, name] of erwartet) {
    const bytes = readFileSync(pfad);
    ok(bytes.subarray(0, 5).toString("latin1") === "%PDF-", name + ": beginnt mit %PDF-");
    let doc = null;
    try {
      doc = await PDFLib.PDFDocument.load(bytes);
    } catch (e) {
      ok(false, name + ": pdf-lib kann die Datei nicht öffnen: " + e.message);
    }
    if (doc) {
      ok(doc.getPageCount() === seiten, () => name + ": pdf-lib zählt " + doc.getPageCount() + " Seiten, erwartet " + seiten);
      ok(doc.getPages().every((p) => Math.abs(p.getWidth() - 595.28) < 0.1 && Math.abs(p.getHeight() - 841.89) < 0.1), name + ": alle Seiten A4 (595 × 842 pt) nach pdf-lib");
    }
    const info = infoSeiten(pfad);
    ok(info.anzahl === seiten, () => name + ": pdfinfo Seiten " + info.anzahl + ", erwartet " + seiten);
    ok(info.seiten.length === seiten && info.seiten.every((s) => Math.abs(s.b - 595.28) < 0.1 && Math.abs(s.h - 841.89) < 0.1), () => name + ": pdfinfo meldet A4 auf jeder Seite");
    const f = schriften(pfad);
    ok(f.length >= 1 && f.every((x) => /LiberationSans/.test(x.name) && x.emb), () => name + ": nur Liberation Sans, eingebettet: " + JSON.stringify(f));
    const texte = seitenText(pfad);
    ok(texte.length === seiten && texte.every((t) => t.length > 60), () => name + ": auf jeder Seite Text (ausgewählter Text): " + texte.map((t) => t.length).join(","));
    console.log("    " + name + ": " + info.anzahl + " Seiten, " + bytes.length + " Byte, Schrift " + f.map((x) => x.name).join(","));
  }
  // Seitenfolge: Deckblatt, Anmeldung, Kontaktdatenblatt, Selbstauskunft, Kodex, Datenschutz (zwei Seiten)
  const seiten = seitenText(paket);
  const reihenfolge = [SEITENTITEL.deckblatt, SEITENTITEL.anmeldung, SEITENTITEL.kontakt, SEITENTITEL.selbstauskunft, SEITENTITEL.kodex, SEITENTITEL.datenschutz].map((t) => seiteMit(seiten, t));
  ok(JSON.stringify(reihenfolge) === JSON.stringify([1, 2, 3, 4, 5, 6]), () => "Reihenfolge Deckblatt, Anmeldung, Kontaktdatenblatt, Selbstauskunft, Kodex, Datenschutz: Seiten " + reihenfolge.join(","));
  ok(seiten[6].includes("Information zum Datenschutz (Fortsetzung)"), "Seite 7 ist die Fortsetzung der Information zum Datenschutz");
  ok(seiten.every((t, i) => t.includes("Seite " + (i + 1) + " von 7")), "Fußzeile „Seite x von 7“ auf jeder Seite");
}

// ============ K4: Wortlaute ============
kontext = "K4 Wortlaute";
const paketPfad = bsp.pfade["Trainerunterlagen_Mustermann_Max.pdf"];
const antragPfad = bsp.pfade["Antrag_Gebuehrenbefreiung_Mustermann_Max.pdf"];
const paketSeiten = seitenText(paketPfad);
const paketText = paketSeiten.join(" ");
const antragText = gesamtText(antragPfad);
{
  // Selbstauskunft Satz für Satz (ap3/BERICHT.md 3.3)
  const sa = paketSeiten[seiteMit(paketSeiten, SEITENTITEL.selbstauskunft) - 1];
  for (const s of SOLL_SELBSTAUSKUNFT) wortlaut(sa, s, "Selbstauskunft");
  wortlaut(sa, "An den Vorstand des FFV Sportfreunde 04 e.V.", "Selbstauskunft: Adressat Vorstand");
  wortlaut(sa, "Name Max Mustermann Geburtsdatum 14.03.1988", "Selbstauskunft: Name und Geburtsdatum");
  wortlaut(sa, "Frankfurt am Main, 24.11.2026 Ort, Datum", "Selbstauskunft: Ort, Datum");
  ok(/Unterschrift/.test(sa), "Selbstauskunft: Beschriftung „Unterschrift“");
  // Brief Satz für Satz (ap1/texte.mjs › blaetter.antrag), mit der einen zulässigen Abweichung „Nr. 2 Buchst. a“
  for (const s of SOLL_ANTRAG) wortlaut(antragText, s, "Antrag");
  enthaelt(antragText, "§ 30a Abs. 1 Nr. 2 Buchst. a BZRG", "Antrag: Fundstelle");
  fehltIn(antragText, "Nr. 2b", "Antrag: veraltete Zählung „Nr. 2b“");
  fehltIn(antragText, "2b BZRG", "Antrag: veraltete Zählung „2b BZRG“");
  // Deckblatt
  const db = paketSeiten[0];
  for (const s of SOLL_DECKBLATT) wortlaut(db, s, "Deckblatt");
  wortlaut(db, "Erweitertes Führungszeugnis: Antrag auf Gebührenbefreiung liegt bei; Einsicht bei Melanie Seipp steht aus", "Deckblatt: Zeile Führungszeugnis (beantragen)");
  wortlaut(db, "Die Unterschrift des Vereins auf dem Antrag auf Gebührenbefreiung fehlt noch.", "Deckblatt: Hinweis zur Vereinsunterschrift");
  ok((db.match(/erledigt/g) || []).length === 5 && (db.match(/\boffen\b/g) || []).length === 1, "Deckblatt: Symbol und Wort: fünfmal „erledigt“, einmal „offen“");
  // Löschfrist, Frist, Alter des Zeugnisses
  wortlaut(db, "Das Zeugnis darf bei der Einsicht höchstens drei Monate alt sein. Nach fünf Jahren zeigt die Person ein neues.", "Deckblatt: Alter und Wiedervorlage");
  wortlaut(db, "Der Verein löscht die Vermerke unverzüglich, wenn die Tätigkeit nicht aufgenommen wird, sonst spätestens sechs Monate nach der letzten Ausübung der Tätigkeit.", "Deckblatt: Löschfrist");
  const ds = paketSeiten.slice(5).join(" ");
  wortlaut(ds, "spätestens sechs Monate nach der letzten Ausübung deiner Tätigkeit (§ 30a Abs. 3 BZRG, § 72a Abs. 5 SGB VIII)", "Information zum Datenschutz: Löschfrist der Vermerke");
  wortlaut(ds, "Art. 6 Abs. 1 lit. f in Verbindung mit Art. 10 DSGVO", "Information zum Datenschutz: Art. 10 DSGVO bei Selbstauskunft und Einsicht");
  wortlaut(ds, "Pflicht sind: Name, Anschrift, Geburtsdatum, Handynummer, E-Mail-Adresse, die Angaben zum Einsatz, der Notfallkontakt, dein Beruf, die Angabe zum Erste-Hilfe-Kurs und das Passfoto.", "Information zum Datenschutz: Pflichtangaben");
  // Information nach Art. 13: Bestandteile
  for (const s of ["Information zum Datenschutz", "nach Artikel 13 der Datenschutz-Grundverordnung (DSGVO)", "1. Wer ist verantwortlich?", "2. Welche Daten verarbeiten wir?", "3. Wofür verarbeiten wir die Daten, und auf welcher Rechtsgrundlage?", "4. An wen geben wir Daten weiter?", "5. Wie lange speichern wir die Daten?", "6. Deine Rechte", "7. Beschwerde bei der Aufsichtsbehörde", "8. Musst du die Daten angeben?", "9. Daten deines Notfallkontakts", "10. So entsteht deine Datei", "Art. 6 Abs. 1 lit. f DSGVO", "Art. 14 DSGVO", "Zweck Rechtsgrundlage"]) enthaelt(ds, s, "Art. 13");
  wortlaut(ds, "Die Person, die du als Notfallkontakt nennst, informierst du bitte darüber, dass der Verein ihren Namen, ihre Beziehung zu dir und ihre Telefonnummer speichert (Art. 14 DSGVO).", "Information zum Datenschutz: Notfallkontakt als Daten Dritter");
  wortlaut(ds, "Dein erweitertes Führungszeugnis lädst du nirgends hoch und schickst es nicht per E-Mail.", "Information zum Datenschutz: Zeugnis wird nicht hochgeladen");
  wortlaut(ds, "Verantwortlich für die Verarbeitung deiner Daten ist der Frankfurter Fußballverein Sportfreunde 1904 e. V., vertreten durch den Vorstand.", "Information zum Datenschutz: Verantwortlicher aus der Konfiguration");
  wortlaut(ds, "Postanschrift: Postfach 190442, 60091 Frankfurt am Main", "Information zum Datenschutz: Anschrift aus der Konfiguration");
  wortlaut(ds, "E-Mail: geschaeftsstelle@sportfreunde04.de", "Information zum Datenschutz: E-Mail aus der Konfiguration");
  // Anmeldung, Kontaktdatenblatt, Kodex-Erklärung
  const an = paketSeiten[seiteMit(paketSeiten, SEITENTITEL.anmeldung) - 1];
  for (const s of ["Beitragsgruppe Trainer/Betreuer, beitragsfrei", "Mannschaft D3-Jugend", "Rolle Co-Trainer", "Ich habe die Satzung des Vereins (einsehbar unter www.sportfreunde04.de, Verein, Downloads) zur Kenntnis genommen.", "Information nach Artikel 13 DSGVO am Ende dieser Datei", "Frankfurt am Main, 24.11.2026 Ort, Datum"]) wortlaut(an, s, "Anmeldung");
  const ko = paketSeiten[seiteMit(paketSeiten, SEITENTITEL.kontakt) - 1];
  for (const s of ["Persönliche Angaben", "Adresse", "Notfallkontakt", "Berufliche/Trainerische Qualifikationen", "Erfahrungen als Trainer/Betreuer (falls vorhanden)", "Erste-Hilfe-Kurs", "Ja, absolviert am: 12.05.2025", "Nein, geplant bis:", "Sonstige Qualifikationen oder Fortbildungen", "Verfügbarkeit (bitte ankreuzen)", "Montags", "Dienstags", "Mittwochs", "Donnerstags", "Freitags", "Samstags", "Sonntags", "Zusätzliche Informationen / Anmerkungen", "Unterschrift Trainer/Betreuer", "Datum 24.11.2026", "Max", "Mustermann", "14.03.1988", "Musterstraße 12", "60326", "0170 1234567", "max.mustermann@example.com", "Erika Mustermann", "Partnerin", "0170 7654321", "Elektriker", "Drei Jahre Jugendtrainer bei einem anderen Verein (E-Jugend)."]) wortlaut(ko, s, "Kontaktdatenblatt");
  const kx = paketSeiten[seiteMit(paketSeiten, SEITENTITEL.kodex) - 1];
  for (const s of ["Der Verhaltenskodex gilt für alle, die im Verein mit Kindern und Jugendlichen arbeiten.", "Landessportbund Hessen und Sportjugend Hessen (aktuelle Fassung)", "Der vollständige Text ist nicht Teil dieser Datei.", "Ich habe den Verhaltenskodex gelesen und halte mich daran.", "Name Max Mustermann", "Frankfurt am Main, 24.11.2026 Ort, Datum"]) wortlaut(kx, s, "Kodex-Erklärung");
  // keine Behauptung zum Versicherungsschutz der Anmeldung (ap3/BERICHT.md A12)
  ok(!/versicher/i.test(paketText + " " + antragText), "kein Satz zu Versicherung oder Versicherungsschutz in den Dateien");
  ok(!/\{|\}|undefined|\bnull\b|NaN/.test(paketText + " " + antragText), "keine offenen Platzhalter und keine undefined/null/NaN im Text");
  ok(!/\?/.test(ohneFragen(paketText + " " + antragText)), "kein „?“ als Ersatz für fehlende Zeichen (außer in den Fragen der Überschriften)");
  ok(FRAGEN.every((f) => paketText.includes(f)), "die sechs Fragen der Überschriften stehen im Text");

  // Quellen (nur wenn vorhanden): BERICHT 3.3 und ap1/texte.mjs gegen die Texte des Moduls
  const bericht = path.join(QUELLE, "ap3", "BERICHT.md");
  if (existsSync(bericht)) {
    const md = readFileSync(bericht, "utf8");
    const block = /### 3\.3[\s\S]*?```\n([\s\S]*?)```/.exec(md);
    ok(!!block, "BERICHT.md Abschnitt 3.3: Wortlaut gefunden");
    if (block) {
      const zeilen = block[1].split("\n");
      const punkte = [];
      for (const z of zeilen) {
        if (/^\d\.\s/.test(z)) punkte.push(z.replace(/^\d\.\s+/, ""));
        else if (/^\s+\S/.test(z) && punkte.length) punkte[punkte.length - 1] += " " + z.trim();
      }
      const quellePunkte = punkte.map((p) => norm(p.replace(/ Diese Erklärung[\s\S]*$/, "")));
      ok(quellePunkte.length === 3, () => "BERICHT.md 3.3 hat drei Punkte: " + quellePunkte.length);
      T.selbstauskunft.punkte.forEach((p, i) => {
        saetze += 1;
        ok(norm(p) === quellePunkte[i], () => "Selbstauskunft Punkt " + (i + 1) + " stimmt nicht mit BERICHT.md 3.3 überein");
      });
      saetze += 1;
      ok(block[1].includes(T.selbstauskunft.hinweis), "Hinweis „ersetzt das erweiterte Führungszeugnis nicht“ steht in BERICHT.md 3.3");
      ok(norm(block[1]).includes(T.selbstauskunft.titel), "Titel der Selbstauskunft steht in BERICHT.md 3.3");
    }
    quellenGeprueft.push("ap3/BERICHT.md 3.3");
  } else {
    console.log("    Quelle nicht gefunden: " + bericht + " (Sollwortlaut des Tests gilt allein)");
  }
  // Bildschirm 09 und Datei: derselbe Wortlaut der Selbstauskunft (Gegenprüfung F4, 24.11.2026): Die Person bestätigt, was sie unterschreibt
  ok(SCREEN_TEXTE.selbstauskunft.punkte.length === T.selbstauskunft.punkte.length, "Selbstauskunft: Bildschirm 09 und Datei haben gleich viele Punkte");
  SCREEN_TEXTE.selbstauskunft.punkte.forEach((p, i) => {
    saetze += 1;
    ok(p === T.selbstauskunft.punkte[i], () => "Selbstauskunft Punkt " + (i + 1) + ": Bildschirm 09 und Datei haben nicht denselben Wortlaut");
  });
  saetze += 1;
  ok(SCREEN_TEXTE.selbstauskunft.hinweis === T.selbstauskunft.hinweis, "Selbstauskunft: Hinweis „ersetzt das erweiterte Führungszeugnis nicht“ auf Bildschirm 09 und in der Datei gleich");
  const texteDatei = path.join(QUELLE, "ap1", "texte.mjs");
  if (existsSync(texteDatei)) {
    const quelle = (await import(pathToFileURL(texteDatei).href)).blaetter;
    const A = quelle.antrag;
    // absatz3 und absatz4 weichen seit 24.11.2026 bewusst vom Entwurf ab (Gegenprüfung F1 und F10: Bestätigung nach § 30a Abs. 2 BZRG,
    // Vorbemerkung 1.1.3 statt „Richtlinien“); ihr Wortlaut steht in SOLL_ANTRAG und wird an der erzeugten Datei geprüft.
    for (const k of ["ueberschrift1", "ueberschrift2", "anrede", "absatz1", "herrFrau", "gebAm", "wohnhaft", "adresseLabel", "istBeiUnsAls", "taetig", "funktion", "absatz2", "dank", "gruss", "eV", "iA", "ortDatumLabel", "ortDatum"]) {
      saetze += 1;
      // Einzige technische Abweichung: Der Ort steht nicht fest im Text, sondern kommt aus konfig.verein.ort ({ort})
      const modul = k === "ortDatum" ? String(T.antrag[k]).replace("{ort}", KONFIG.verein.ort) : T.antrag[k];
      ok(A[k] === modul, () => "Brief „" + k + "“ weicht von ap1/texte.mjs ab: „" + kurz(String(modul)) + "“ statt „" + kurz(String(A[k])) + "“");
    }
    const D = quelle.deckblatt;
    for (const [k, v] of [["titel", T.deckblatt.titel], ["daBeiSeit", T.deckblatt.daBeiSeit], ["faelligAm", T.deckblatt.faelligAm], ["erstelltAm", T.deckblatt.erstelltAm], ["tabelleTitel", T.deckblatt.tabelleTitel], ["markeErledigt", T.deckblatt.markeErledigt], ["markeOffen", T.deckblatt.markeOffen], ["hinweis", T.deckblatt.hinweis]]) {
      saetze += 1;
      ok(D[k] === v, () => "Deckblatt „" + k + "“ weicht von ap1/texte.mjs ab");
    }
    D.zeilen.slice(0, 5).forEach((z, i) => {
      saetze += 1;
      ok(z.text === [T.deckblatt.anmeldung, T.deckblatt.kontakt, T.deckblatt.selbstauskunft, T.deckblatt.kodex, T.deckblatt.foto][i], () => "Deckblatt Zeile " + (i + 1) + " weicht von ap1/texte.mjs ab");
    });
    const K = quelle.kontaktdatenblatt;
    for (const k of Object.keys(T.kontakt)) {
      if (k === "ersteHilfeJa" || k === "ersteHilfeNein") continue; // der Test fügt den Doppelpunkt an (Datumsfeld)
      saetze += 1;
      ok(K[k] === T.kontakt[k], () => "Kontaktdatenblatt „" + k + "“ weicht von ap1/texte.mjs ab");
    }
    quellenGeprueft.push("ap1/texte.mjs (Brief, Deckblatt, Kontaktdatenblatt)");
  } else {
    console.log("    Quelle nicht gefunden: " + texteDatei + " (Sollwortlaut des Tests gilt allein)");
  }
}

// Einsichtnehmende: vier Fälle (eine Person, zwei, drei, leere Liste); der Namensteil kommt nur aus trainer-einsicht.js
kontext = "K4 Einsicht";
{
  const A = { name: "Melanie Seipp", funktion: "1. Vorsitzende" };
  const B = { name: "Anna Beispiel", funktion: "Vertretung" };
  const C = { name: "Bernd Probe", funktion: "Schriftführer" };
  const D = { name: "Carla Muster", funktion: "Kassiererin" };
  const faelle = [
    { titel: "eine Person (Standardfall)", einsicht: [A], lang: "Melanie Seipp (1. Vorsitzende)", kurz: "Melanie Seipp" },
    { titel: "zwei Personen", einsicht: [B, C], lang: "Anna Beispiel (Vertretung) oder Bernd Probe (Schriftführer)", kurz: "Anna Beispiel oder Bernd Probe" },
    { titel: "drei Personen", einsicht: [B, C, D], lang: "Anna Beispiel (Vertretung), Bernd Probe (Schriftführer) oder Carla Muster (Kassiererin)", kurz: "Anna Beispiel, Bernd Probe oder Carla Muster" },
    { titel: "leere Liste", einsicht: [], lang: "dem Vorstand", kurz: "dem Vorstand" },
  ];
  for (const f of faelle) {
    for (const zeugnis of ["beantragen", "vorhanden"]) {
      const konfig = Object.assign(kopie(KONFIG), { einsicht: kopie(f.einsicht) });
      const a = Object.assign(kopie(BEISPIEL), { zeugnis });
      const r = await baue("einsicht-" + f.titel.replace(/\W+/g, "-") + "-" + zeugnis, { konfig, antworten: a });
      const seiten = seitenText(r.pfade["Trainerunterlagen_Mustermann_Max.pdf"]);
      const text = seiten.join(" ");
      const mit = f.titel + " / " + zeugnis;
      // Der Namensteil der Konfiguration kommt aus trainer-einsicht.js und stimmt mit dem erwarteten Wortlaut überein
      ok(einsichtNamen(konfig, "lang") === f.lang && einsichtNamen(konfig, "kurz") === f.kurz, () => mit + ": einsichtNamen liefert nicht den erwarteten Namensteil");
      wortlaut(seiten[0], zeugnis === "beantragen" ? "Erweitertes Führungszeugnis: Antrag auf Gebührenbefreiung liegt bei; Einsicht bei " + f.kurz + " steht aus" : "Erweitertes Führungszeugnis: liegt der Person vor; Einsicht bei " + f.kurz + " steht aus", "Deckblatt (" + mit + ")");
      wortlaut(seiten[0], einsichtSatzPerson(f.lang), "Deckblatt, Begleitsatz Einsicht (" + mit + ")");
      wortlaut(seiten.slice(5).join(" "), einsichtSatzDu(f.lang), "Information zum Datenschutz, Satz Einsicht (" + mit + ")");
      // Namen: genau die der Konfiguration, sonst keine
      for (const p of faelle.flatMap((x) => x.einsicht)) {
        const vorhanden = f.einsicht.some((q) => q.name === p.name);
        if (p.name === "Melanie Seipp" && zeugnis) continue; // Melanie Seipp steht zusätzlich als Unterzeichnerin im Brief und in der Konfiguration des Vereins
        ok(text.includes(p.name) === vorhanden, () => mit + ": „" + p.name + "“ " + (vorhanden ? "fehlt" : "steht, obwohl nicht in konfig.einsicht"));
      }
      if (f.einsicht.length === 0) ok(!text.includes("Melanie Seipp"), () => mit + ": leere Liste, aber „Melanie Seipp“ steht in den Trainerunterlagen");
      ok(!/Florian|Kindeswohlbeauftragt/.test(text), () => mit + ": „Florian“ oder „Kindeswohlbeauftragte“ darf nicht vorkommen");
      // pronomenfrei: keine geratene Anrede („Er schaut …“, „Sie schauen …“) im Zusammenhang mit der Einsicht
      ok(!/\b(Er|Sie|er|sie)\s+(schaut|schauen|notiert|notieren|nimmt|nehmen|macht|machen)\b/.test(text), () => mit + ": Satz zur Einsicht ist nicht pronomenfrei");
      if (zeugnis === "beantragen") {
        const antragsText = gesamtText(r.pfade["Antrag_Gebuehrenbefreiung_Mustermann_Max.pdf"]);
        // Der Brief bleibt von den Einsichtnehmenden unberührt: Absender ist konfig.verein.unterzeichner
        ok(antragsText.includes("Melanie Seipp") && antragsText.includes("Vorstand"), mit + ": Brief nennt den Unterzeichner der Konfiguration");
        ok(!f.einsicht.some((q) => q.name !== "Melanie Seipp" && antragsText.includes(q.name)), mit + ": Brief nennt keine Einsichtnehmenden");
      }
    }
  }
  // Ein Wechsel des Unterzeichners wirkt nur im Brief
  const k2 = kopie(KONFIG);
  k2.verein.unterzeichner = { name: "Doris Beispiel", funktion: "Schatzmeisterin" };
  const r2 = await baue("unterzeichner", { konfig: k2 });
  const t2 = gesamtText(r2.pfade["Antrag_Gebuehrenbefreiung_Mustermann_Max.pdf"]);
  ok(t2.includes("Doris Beispiel") && t2.includes("Schatzmeisterin") && !t2.includes("Melanie Seipp"), "Brief: Name und Funktion des Unterzeichners aus konfig.verein.unterzeichner");
  ok(gesamtText(r2.pfade["Trainerunterlagen_Mustermann_Max.pdf"]).includes("Einsicht bei Melanie Seipp steht aus"), "Einsichtnehmende bleiben bei geändertem Unterzeichner unverändert");
}

// ============ K5: Antrag ohne Vereinsunterschrift ============
kontext = "K5 Antrag ohne Vereinsunterschrift";
{
  ok(bilder(antragPfad).length === 0, () => "pdfimages -list des Antrags ist leer: " + JSON.stringify(bilder(antragPfad)));
  const doc = await PDFLib.PDFDocument.load(readFileSync(antragPfad));
  const xobjekte = doc.getPages().map((p) => {
    const res = p.node.Resources();
    const xo = res ? res.lookup(PDFLib.PDFName.of("XObject")) : undefined;
    return xo && xo.keys ? xo.keys().length : 0;
  });
  ok(xobjekte.every((n) => n === 0), () => "pdf-lib: kein XObject (Bild) im Antrag: " + xobjekte.join(","));
  ok(doc.getPageCount() === 1, "Antrag hat eine Seite");
  wortlaut(antragText, "FFV Sportfreunde 04 e.V. Melanie Seipp Vorstand i.A.", "Antrag: Fußblock mit Unterzeichner aus der Konfiguration, leere Linie hinter „i.A.“");
  ok(norm(antragText).endsWith("i.A."), "Antrag: nach „i.A.“ steht nichts mehr (leere Unterschriftszeile)");
  // Wappen ist Vektor: Pfadoperatoren im Inhalt, kein Bild; die Datei hat keine Unterschrift der Person
  ok(!/Unterschrift/.test(antragText), "Antrag: nirgends das Wort „Unterschrift“ (keine Unterschrift der Person, keine des Vereins)");
}

// ============ K6: Unterschrift der Person ============
kontext = "K6 Unterschrift der Person";
{
  const liste = bilder(paketPfad);
  const bildSeiten = liste.filter((x) => x.art === "image").map((x) => x.seite);
  const soll = [SEITENTITEL.anmeldung, SEITENTITEL.kontakt, SEITENTITEL.selbstauskunft, SEITENTITEL.kodex].map((t) => seiteMit(paketSeiten, t));
  ok(JSON.stringify(bildSeiten) === JSON.stringify(soll), () => "Unterschrift auf den Seiten " + bildSeiten.join(",") + ", erwartet (Anmeldung, Kontaktdatenblatt, Selbstauskunft, Kodex) " + soll.join(","));
  ok(liste.filter((x) => x.art === "image").length === 4, "pdfimages -list: genau vier Bilder (je Unterschriftsstelle eines)");
  ok(!bildSeiten.includes(1) && !bildSeiten.includes(6) && !bildSeiten.includes(7), "kein Bild auf Deckblatt und Datenschutzseiten");
  console.log("    pdfimages -list (Paket): " + liste.map((x) => "Seite " + x.seite + " " + x.art).join(", "));
  // Fehler statt stillem Weglassen
  const ohne = (ueberschreibe) => () => erzeugeDateien({ antworten: kopie(BEISPIEL), medien: Object.assign({ foto: FOTO.bytes, unterschrift: SIG }, ueberschreibe), konfig: kopie(KONFIG), heute: HEUTE, werkzeuge: WERKZEUGE });
  await wirft(ohne({ unterschrift: null }), "unterschrift-fehlt", "Unterschrift", "ohne Unterschrift (null)");
  await wirft(ohne({ unterschrift: undefined }), "unterschrift-fehlt", "Unterschrift", "ohne Unterschrift (undefined)");
  await wirft(ohne({ unterschrift: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25]) }), "unterschrift-format", "PNG", "Unterschrift kein PNG");
  await wirft(ohne({ foto: null }), "foto-fehlt", "Foto", "ohne Foto");
  await wirft(ohne({ foto: SIG }), "foto-format", "JPEG", "Foto kein JPEG");
}

// ============ K7: Karneval und Rollen ============
kontext = "K7 Karneval und Rollen";
{
  const karneval = Object.assign(kopie(BEISPIEL), { abteilung: "karneval", mannschaft: "Mini-Garde", rolle: "betreuer" });
  const k = await baue("karneval", { antworten: karneval });
  const kt = seitenText(k.pfade["Trainerunterlagen_Mustermann_Max.pdf"]);
  ok(/Gruppe Mini-Garde/.test(kt[0]) && !/Mannschaft/.test(kt[0]), "Karneval: Deckblatt sagt „Gruppe Mini-Garde“, nicht „Mannschaft“");
  ok(/Gruppe Mini-Garde/.test(kt[1]) && !/Mannschaft/.test(kt[1]), "Karneval: Anmeldung sagt „Gruppe“, nicht „Mannschaft“");
  ok(/Abteilung Karneval/.test(kt[1]), "Karneval: Anmeldung nennt die Abteilung Karneval");
  ok(!/Mannschaft/.test(kt[2]) && !/Mannschaft/.test(kt[3]) && !/Mannschaft/.test(kt[4]), "Karneval: Kontaktdatenblatt, Selbstauskunft und Kodex-Erklärung haben kein Feld „Mannschaft“");
  const ka = gesamtText(k.pfade["Antrag_Gebuehrenbefreiung_Mustermann_Max.pdf"]);
  wortlaut(ka, "ist bei uns als Betreuer Karneval / Jugend ehrenamtlich und unentgeltlich tätig.", "Karneval: Funktion im Antrag");
  ok(!/Mannschaft/.test(ka), "Karneval: Antrag ohne „Mannschaft“");
  // Fußball: Mannschaft; Torwarttrainer
  ok(/Mannschaft D3-Jugend/.test(paketSeiten[0]) && /Mannschaft D3-Jugend/.test(paketSeiten[1]), "Fußball: „Mannschaft“ auf Deckblatt und Anmeldung");
  const tw = Object.assign(kopie(BEISPIEL), { rolle: "torwarttrainer" });
  const t = await baue("torwarttrainer", { antworten: tw });
  wortlaut(gesamtText(t.pfade["Antrag_Gebuehrenbefreiung_Mustermann_Max.pdf"]), "ist bei uns als Torwarttrainer Fußball / Jugend ehrenamtlich und unentgeltlich tätig.", "Torwarttrainer: Funktion im Antrag");
  ok(/Rolle Torwarttrainer/.test(seitenText(t.pfade["Trainerunterlagen_Mustermann_Max.pdf"])[0]), "Torwarttrainer: Rolle auf dem Deckblatt");
  for (const [rolle, text] of [["trainer", "Trainer"], ["co-trainer", "Co-Trainer"], ["betreuer", "Betreuer"]]) {
    const r = await baue("rolle-" + rolle, { antworten: Object.assign(kopie(BEISPIEL), { rolle }) });
    wortlaut(gesamtText(r.pfade["Antrag_Gebuehrenbefreiung_Mustermann_Max.pdf"]), "ist bei uns als " + text + " Fußball / Jugend ehrenamtlich und unentgeltlich tätig.", "Rolle " + rolle + ": Funktion im Antrag");
  }
  await wirft(() => erzeugeDateien({ antworten: Object.assign(kopie(BEISPIEL), { abteilung: "karneval", rolle: "torwarttrainer" }), medien: { foto: FOTO.bytes, unterschrift: SIG }, konfig: kopie(KONFIG), heute: HEUTE, werkzeuge: WERKZEUGE }), "angaben", "Torwarttrainer", "Torwarttrainer bei Karneval");
}

// ============ K8: Aussehen ============
kontext = "K8 Aussehen";
{
  const dateien = [
    ["paket-beispiel", paketPfad, "paket"],
    ["antrag-beispiel", antragPfad, "antrag"],
  ];
  for (const [bildName, pfad, art] of dateien) {
    rendere(pfad, bildName);
    const bilderListe = readdirSync(RENDER).filter((n) => n.startsWith(bildName + "-") && n.endsWith(".png"));
    ok(bilderListe.length === (art === "paket" ? 7 : 1), () => bildName + ": " + bilderListe.length + " PNG");
  }
  // Rand: kein Wort außerhalb der Ränder (18 mm links und rechts) und der Seite
  for (const [name, pfad] of [["Paket", paketPfad], ["Antrag", antragPfad]]) {
    for (const s of woerter(pfad)) {
      const draussen = s.woerter.filter((w) => w.x0 < 50 || w.x1 > s.breite - 50 || w.y0 < 0 || w.y1 > s.hoehe);
      ok(draussen.length === 0, () => name + " Seite " + s.nr + ": Wörter über dem Rand: " + draussen.slice(0, 4).map((w) => w.t + "@" + w.x0.toFixed(0) + "-" + w.x1.toFixed(0)).join(", "));
    }
    // Schrift mindestens 9 pt, Fußzeilen (ganz unten auf der Seite) ausgenommen
    for (const s of groessen(pfad)) {
      const klein = s.texte.filter((x) => x.size < 9 && x.top < 790);
      ok(klein.length === 0, () => name + " Seite " + s.nr + ": Schrift unter 9 pt: " + klein.slice(0, 3).map((x) => x.size + " pt „" + kurz(x.text) + "“").join("; "));
      const fuss = s.texte.filter((x) => x.size < 9);
      ok(fuss.every((x) => x.top >= 790), () => name + " Seite " + s.nr + ": nur Fußzeilen sind kleiner als 9 pt");
    }
  }
  // Der Baustein meldet Mängel selbst (Rand, Schrift unter 9 pt, Zeichen außerhalb der Schrift)
  ok(bsp.r.warnungen.length === 0, "keine Warnung des Bausteins (Rand, 9 pt, Zeichen) im Beispiel");
  console.log("    Bilder: " + RENDER);
}

// ============ K9: keine echten Daten ============
kontext = "K9 keine echten Daten";
{
  const alles = paketText + " " + antragText;
  const muster = /\b0\d{2,5}[ /-]?\d{3,}\b|\+49[\d /()-]{6,}/g;
  const gefunden = [...new Set(alles.match(muster) || [])].sort();
  ok(JSON.stringify(gefunden) === JSON.stringify(["0170 1234567", "0170 7654321"]), () => "Ziffernfolgen wie Telefonnummern: " + JSON.stringify(gefunden));
  for (const nummer of ["736868", "732193", "069 7", "+49 69"]) ok(!alles.includes(nummer), "keine Rufnummer des Vereins: " + nummer);
  // Namen aus dem Umfeld des Auftrags: Die Prüfung enthält keinen Namen im Klartext, und keine Meldung nennt einen. Verglichen
  // wird ohne Groß-/Kleinschreibung (NFC) als Teilzeichenfolge, also mindestens so streng wie ein festes Muster mit den Namen.
  const kleinNfc = (s) => s.normalize("NFC").toLowerCase();
  const allesKlein = kleinNfc(alles);
  // a) Öffentliche Namen (Vor- und Nachname der auftraggebenden Person, Projektname aus dem Repo-Namen) stehen gewollt im
  //    Repo und deshalb nicht in der privaten Liste. Hier stehen nur Länge und SHA-256 ihrer Kleinschreibung (NFC, UTF-8);
  //    der Hash schützt öffentliche Namen nicht, er hält nur den Quelltext frei. Geprüft wird jede gleich lange Zeichenfolge.
  const OEFFENTLICHE_NAMEN = [
    { laenge: 5, sha256: "791c6c29192b81334fa4316fb86ddc5bde91d6d6f53ed410274200b8357d87d7" },
    { laenge: 5, sha256: "7a89f9ed1c14d1806b69b2c0d2e82d28237e917924b39e2d549edb3449d0df44" },
    { laenge: 7, sha256: "32c2c68bb69be4650b556171430b065b98fbed6dd169707a2d0ebbf958c62a06" },
  ];
  const nachHash = new Map(OEFFENTLICHE_NAMEN.map((n, i) => [n.sha256, i + 1]));
  const oeffentlich = new Set();
  for (const laenge of new Set(OEFFENTLICHE_NAMEN.map((n) => n.laenge))) {
    for (let i = 0; i + laenge <= allesKlein.length; i++) {
      const nr = nachHash.get(createHash("sha256").update(allesKlein.slice(i, i + laenge), "utf8").digest("hex"));
      if (nr) oeffentlich.add(nr);
    }
  }
  ok(oeffentlich.size === 0, () => "kein öffentlicher Name aus dem Umfeld des Auftrags in den Dateien (Nr. " + [...oeffentlich].sort().join(", ") + ")");
  // b) Private Namen stehen nur in der git-ignorierten Liste tools/cache/pii-namen.txt (eine Zeile je Name, # = Kommentar),
  //    wie bei tools/pii-check.py; in einem git-worktree liegt sie im Haupt-Checkout. Ein Hash würde kurze Vornamen nicht
  //    schützen. Fehlt die Liste, wird nur dieser Teil mit Hinweis übersprungen.
  const listen = [path.join(WURZEL, "tools", "cache", "pii-namen.txt")];
  const gemeinsam = spawnSync("git", ["rev-parse", "--git-common-dir"], { cwd: WURZEL, encoding: "utf8" });
  if (!gemeinsam.error && gemeinsam.status === 0 && gemeinsam.stdout.trim()) {
    listen.push(path.join(path.resolve(WURZEL, gemeinsam.stdout.trim()), "..", "tools", "cache", "pii-namen.txt"));
  }
  const liste = listen.find((p) => existsSync(p));
  const privat = liste
    ? readFileSync(liste, "utf8").split(/\r?\n/).map((z, i) => ({ zeile: i + 1, name: z.trim() })).filter((e) => e.name && !e.name.startsWith("#"))
    : [];
  if (privat.length) {
    const treffer = privat.filter((e) => allesKlein.includes(kleinNfc(e.name))).map((e) => e.zeile);
    ok(treffer.length === 0, () => "kein privater Name aus der Namensliste in den Dateien (Zeile " + treffer.join(", ") + " der Liste)");
    console.log("    private Namensliste: " + privat.length + " Namen geprüft (" + path.relative(WURZEL, liste) + ")");
  } else {
    console.log("    Hinweis: keine private Namensliste (tools/cache/pii-namen.txt), Prüfung der privaten Namen übersprungen.");
  }
  // Es gibt keine Unterschrift des Vereins („i.A.“ als Bild): die Antrags-PDF hat kein Bild (K5); das Paket nur die vier eigenen
  ok(bilder(paketPfad).filter((x) => x.art === "image").length === 4 && bilder(antragPfad).length === 0, "kein fremdes Unterschriftsbild: vier eigene Bilder im Paket, keines im Antrag");
}

// ============ K10: Vorschau ============
kontext = "K10 Vorschau";
{
  const bytes = await vorschauAntrag({ antworten: kopie(BEISPIEL), konfig: kopie(KONFIG), heute: HEUTE, werkzeuge: WERKZEUGE });
  ok(bytes instanceof Uint8Array && bytes.length > 1000, "Vorschau ist eine Uint8Array");
  const pfad = path.join(AUSGABE, "vorschau-antrag.pdf");
  writeFileSync(pfad, bytes);
  const doc = await PDFLib.PDFDocument.load(bytes);
  ok(doc.getPageCount() === 1, "Vorschau: eine Seite");
  const info = infoSeiten(pfad);
  ok(info.seiten.length === 1 && Math.abs(info.seiten[0].b - 595.28) < 0.1, "Vorschau: A4 (pdfinfo)");
  ok(gesamtText(pfad) === antragText, "Vorschau: Text gleich dem Antrag aus erzeugeDateien");
  ok(bilder(pfad).length === 0, "Vorschau ohne Bild");
  ok(Buffer.compare(Buffer.from(bytes), readFileSync(antragPfad)) === 0, "Vorschau ist byteweise gleich der Antragsdatei (gleiche Eingaben, gleiche Datei)");
  const ohneMedien = await vorschauAntrag({ antworten: kopie(BEISPIEL), konfig: Object.assign(kopie(KONFIG), { einsicht: [], schnupperMonate: undefined }), heute: HEUTE, werkzeuge: WERKZEUGE });
  ok(ohneMedien.length > 1000, "Vorschau braucht weder Medien noch Einsichtnehmende noch Frist");
  await wirft(() => vorschauAntrag({ antworten: Object.assign(kopie(BEISPIEL), { vorname: "" }), konfig: kopie(KONFIG), heute: HEUTE, werkzeuge: WERKZEUGE }), "angaben", "vorname", "Vorschau ohne Vornamen");
  const k3 = kopie(KONFIG);
  delete k3.verein.unterzeichner;
  await wirft(() => vorschauAntrag({ antworten: kopie(BEISPIEL), konfig: k3, heute: HEUTE, werkzeuge: WERKZEUGE }), "konfig", "verein.unterzeichner", "Vorschau ohne Unterzeichner");
}

// ============ K11: Größe und Zeit ============
kontext = "K11 Größe und Zeit";
{
  const groesse = readFileSync(paketPfad).length;
  ok(groesse <= 2 * 1024 * 1024, () => "Paket-PDF " + groesse + " Byte (höchstens 2 MB)");
  ok(FOTO.bytes.length > 5000 && /600 × 800/.test(FOTO.maß), () => "Foto der Probeläufe: " + FOTO.maß + ", " + FOTO.bytes.length + " Byte");
  const zeiten = [];
  for (let i = 0; i < 3; i++) {
    const t0 = performance.now();
    await erzeugeDateien({ antworten: kopie(BEISPIEL), medien: { foto: FOTO.bytes, unterschrift: SIG }, konfig: kopie(KONFIG), heute: HEUTE, werkzeuge: WERKZEUGE });
    zeiten.push(performance.now() - t0);
  }
  ok(Math.max(...zeiten) <= 5000, () => "Erzeugung höchstens 5 s: " + zeiten.map((z) => Math.round(z)).join(", ") + " ms");
  console.log("    Paket-PDF " + groesse + " Byte (" + (groesse / 1024).toFixed(0) + " KB), Antrag " + readFileSync(antragPfad).length + " Byte; Erzeugung aller drei Dateien: " + zeiten.map((z) => Math.round(z)).join(", ") + " ms; Foto " + FOTO.maß);
}

// ============ K12: Fristen, Sonderzeichen, lange Angaben, Fehlerfälle, Metadaten, Wiederholbarkeit, Quelltext ============
kontext = "K12 Fristen";
{
  const faelle = [
    ["2026-11-02", 1, "02.12.2026"],
    ["2026-11-02", 2, "02.01.2027"],
    ["2026-12-15", 1, "15.01.2027"],
    ["2026-01-31", 1, "28.02.2026"],
    ["2028-01-31", 1, "29.02.2028"],
    ["2026-11-02", 0, "02.11.2026"],
  ];
  for (const [seit, monate, soll] of faelle) {
    const konfig = Object.assign(kopie(KONFIG), { schnupperMonate: monate });
    const r = await baue("frist-" + seit + "-" + monate, { konfig, antworten: Object.assign(kopie(BEISPIEL), { seit }) });
    const t = seitenText(r.pfade["Trainerunterlagen_Mustermann_Max.pdf"])[0];
    wortlaut(t, "Unterlagen fällig am " + soll, "Beginn " + seit + " plus " + monate + " Monat(e)");
  }
  const r5 = await baue("frist-zeugnisjahre", { konfig: Object.assign(kopie(KONFIG), { zeugnisJahre: 1 }) });
  wortlaut(seitenText(r5.pfade["Trainerunterlagen_Mustermann_Max.pdf"])[0], "Nach einem Jahr zeigt die Person ein neues.", "Wiedervorlage nach einem Jahr");
  const r6 = await baue("frist-ohne-zeugnisjahre", { konfig: Object.assign(kopie(KONFIG), { zeugnisJahre: undefined }) });
  fehltIn(seitenText(r6.pfade["Trainerunterlagen_Mustermann_Max.pdf"])[0], "zeigt die Person ein neues", "ohne zeugnisJahre entfällt der Satz zur Wiedervorlage");
}

kontext = "K12 Sonderzeichen und lange Angaben";
{
  const turk = await baue("sonderzeichen-tuerkisch", { antworten: Object.assign(kopie(BEISPIEL), { vorname: "İsmail Çağrı", nachname: "Şahin-Öztürk", anschrift: { strasse: "Gülhane Cd. 5", plz: "60326", ort: "Frankfurt am Main" }, erfahrung: "Łukasz Wiśniewski, Dvořák: 5 Jahre – „Jugendtrainer“ © ½" }) });
  ok(turk.r.warnungen.length === 0, () => "türkische und polnische Zeichen ohne Warnung: " + JSON.stringify(turk.r.warnungen));
  const tt = gesamtText(turk.pfade[Object.keys(turk.pfade)[0]]);
  ok(tt.includes("İsmail Çağrı Şahin-Öztürk") && !/\?/.test(ohneFragen(tt)), "türkische Zeichen im Text unverändert");
  // Buchstaben ohne Zerlegung (ß, ł, ø, æ) fallen in den Dateinamen nicht weg (dateiteil allein würde sie streichen)
  const buchst = await baue("sonderzeichen-buchstaben", { antworten: Object.assign(kopie(BEISPIEL), { vorname: "Łukasz", nachname: "Weiß-Øverland Ærø" }) });
  ok(buchst.r.dateien[0].name === "Trainerunterlagen_Weiss-Overland-Aero_Lukasz.pdf", () => "ß, Ø, Æ, Ł in Dateinamen: " + buchst.r.dateien[0].name);
  ok(buchst.r.warnungen.length === 0, () => "ß, Ø, Æ, Ł ohne Warnung: " + JSON.stringify(buchst.r.warnungen));
  ok(JSON.stringify(turk.r.dateien.map((d) => d.name)) === JSON.stringify(["Trainerunterlagen_Sahin-Ozturk_Ismail-Cagri.pdf", "Antrag_Gebuehrenbefreiung_Sahin-Ozturk_Ismail-Cagri.pdf", "Passfoto_Sahin-Ozturk_Ismail-Cagri.jpg"]), () => "Dateinamen: " + turk.r.dateien.map((d) => d.name).join(", "));
  // Zeichen, die die Schrift nicht kennt (Arabisch): Warnung, Datei bleibt gültig, kein Absturz
  const arab = await baue("sonderzeichen-arabisch", { antworten: Object.assign(kopie(BEISPIEL), { vorname: "محمد", nachname: "Mustermann" }) });
  ok(arab.r.warnungen.some((w) => /Angabe/.test(w)) && arab.r.warnungen.every((w) => /Angabe/.test(w)), () => "arabischer Vorname: Warnung zu einer Angabe: " + JSON.stringify(arab.r.warnungen));
  ok(arab.r.dateien.map((d) => d.name).join() === "Trainerunterlagen_Mustermann_x.pdf,Antrag_Gebuehrenbefreiung_Mustermann_x.pdf,Passfoto_Mustermann_x.jpg", () => "Dateinamen bei nicht lateinischem Vornamen: " + arab.r.dateien.map((d) => d.name).join(", "));
  await PDFLib.PDFDocument.load(arab.r.dateien[0].bytes);
  ok(true, "Datei mit nicht darstellbarem Vornamen bleibt ein gültiges PDF");

  // sehr lange Angaben: nichts läuft über den Rand, nichts wird stillschweigend abgeschnitten
  const lang = Object.assign(kopie(BEISPIEL), {
    vorname: "Maximilian Alexander Friedrich",
    nachname: "Müller-Lüdenscheidt-Hohenlohe-Langenburg",
    anschrift: { strasse: "Sehr-langer-Straßenname-der-Gemeinde-Oberursel 123 b", plz: "61440", ort: "Oberursel (Taunus) Stierstadt Hochtaunuskreis" },
    email: "maximilian.alexander.mueller-luedenscheidt-hohenlohe@sehr-lange-domain-der-firma.example.com",
    mannschaft: "1. Herrenmannschaft (Kreisliga A) Spielgemeinschaft Nord",
    erfahrung: "Zehn Jahre Jugendtrainer in verschiedenen Vereinen, Lizenz C und B, Fortbildungen zur Torwartschule, Koordination und Athletik. ".repeat(6).trim(),
    sonstiges: "Schiedsrichterschein, Kinderschutz-Schulung, Erste-Hilfe-Ausbilder. ".repeat(4).trim(),
    beruf: "Diplom-Ingenieur für Elektrotechnik und Informationstechnik mit Schwerpunkt Gebäudeautomation",
    notfall: { name: "Erika Mustermann-Müller-Lüdenscheidt", beziehung: "Lebenspartnerin und Mutter der gemeinsamen Kinder", telefon: "0170 7654321" },
    ersteHilfe: "nein",
    ersteHilfeAm: null,
    ersteHilfeBis: "2027-03-31",
  });
  const lg = await baue("lange-angaben", { antworten: lang });
  ok(lg.r.warnungen.length === 0, () => "lange Angaben ohne Warnung (Rand, 9 pt): " + JSON.stringify(lg.r.warnungen));
  const lp = lg.pfade[Object.keys(lg.pfade)[0]];
  const la = lg.pfade[Object.keys(lg.pfade)[1]];
  for (const s of woerter(lp).concat(woerter(la))) {
    const draussen = s.woerter.filter((w) => w.x0 < 50 || w.x1 > s.breite - 50 || w.y1 > s.hoehe);
    ok(draussen.length === 0, () => "lange Angaben, Seite " + s.nr + ": Wörter über dem Rand: " + draussen.slice(0, 3).map((w) => w.t).join(", "));
  }
  const lat = gesamtText(la).replace(/\s/g, "");
  ok(lat.includes((lang.vorname + " " + lang.nachname).replace(/\s/g, "")) && lat.includes((lang.anschrift.strasse + ", " + lang.anschrift.plz + " " + lang.anschrift.ort).replace(/\s/g, "")), "lange Namen und Anschrift stehen im Brief vollständig (umgebrochen, nicht abgeschnitten)");
  ok(lat.endsWith("i.A."), "Brief mit langen Angaben endet weiter mit „i.A.“ (alles auf einer Seite)");
  const lt = gesamtText(lp);
  ok(lt.includes("maximilian.alexander.mueller-luedenscheidt-hohenlohe@sehr-lange-domain-der-firma.example.com") || lt.replace(/\s/g, "").includes("maximilian.alexander.mueller-luedenscheidt-hohenlohe@sehr-lange-domain-der-firma.example.com"), "lange E-Mail-Adresse vollständig im Text");
  ok(lt.replace(/\s/g, "").includes("Zehn Jahre Jugendtrainer in verschiedenen Vereinen".replace(/\s/g, "")) && lt.replace(/\s/g, "").includes(lang.erfahrung.replace(/\s/g, "")), "lange Erfahrung vollständig im Text");
  ok(lt.replace(/\s/g, "").includes(lang.sonstiges.replace(/\s/g, "")), "lange „Sonstige Qualifikationen“ vollständig im Text");
  ok(lt.includes("Nein, geplant bis: 31.03.2027"), "Erste-Hilfe-Kurs „Nein, geplant bis“ mit Datum");
  const seitenAnzahl = infoSeiten(lp).anzahl;
  ok(seitenAnzahl >= 7 && seitenAnzahl <= 9, () => "lange Angaben: " + seitenAnzahl + " Seiten (7 bis 9 erwartet)");
  ok(infoSeiten(la).anzahl === 1, "lange Angaben: Antrag bleibt eine Seite");
  const lbilder = bilder(lp).filter((x) => x.art === "image");
  ok(lbilder.length === 4, () => "lange Angaben: vier Unterschriften: " + lbilder.length);
  rendere(lp, "paket-lange-angaben");
  rendere(la, "antrag-lange-angaben");
  rendere(turk.pfade[Object.keys(turk.pfade)[0]], "paket-tuerkisch");
}

kontext = "K12 Fehlerfälle";
{
  const lauf = (antworten, konfig, heute) => () => erzeugeDateien({ antworten, medien: { foto: FOTO.bytes, unterschrift: SIG }, konfig: konfig || kopie(KONFIG), heute: heute || HEUTE, werkzeuge: WERKZEUGE });
  await wirft(lauf(Object.assign(kopie(BEISPIEL), { vorname: "" })), "angaben", "vorname", "ohne Vornamen");
  await wirft(lauf(Object.assign(kopie(BEISPIEL), { nachname: "   " })), "angaben", "nachname", "Nachname nur Leerzeichen");
  await wirft(lauf(Object.assign(kopie(BEISPIEL), { geburtsdatum: "1988-02-30" })), "angaben", "geburtsdatum", "ungültiges Geburtsdatum");
  await wirft(lauf(Object.assign(kopie(BEISPIEL), { anschrift: { strasse: "", plz: "60326", ort: "Frankfurt" } })), "angaben", "anschrift.strasse", "ohne Straße");
  await wirft(lauf(Object.assign(kopie(BEISPIEL), { abteilung: "tennis" })), "angaben", "abteilung", "unbekannte Abteilung");
  await wirft(lauf(Object.assign(kopie(BEISPIEL), { rolle: "chef" })), "angaben", "rolle", "unbekannte Rolle");
  await wirft(lauf(Object.assign(kopie(BEISPIEL), { zeugnis: "" })), "angaben", "zeugnis", "ohne Wahl zum Zeugnis");
  await wirft(lauf(Object.assign(kopie(BEISPIEL), { kodexGelesen: false })), "angaben", "kodexGelesen", "Verhaltenskodex nicht bestätigt");
  await wirft(lauf(Object.assign(kopie(BEISPIEL), { selbstauskunft: false })), "angaben", "selbstauskunft", "Selbstauskunft nicht bestätigt");
  await wirft(lauf(Object.assign(kopie(BEISPIEL), { satzung: undefined })), "angaben", "satzung", "Satzung nicht bestätigt");
  await wirft(lauf(Object.assign(kopie(BEISPIEL), { seit: "" })), "angaben", "seit", "ohne Beginn");
  await wirft(lauf(Object.assign(kopie(BEISPIEL), { mannschaft: "" })), "angaben", "mannschaft", "ohne Mannschaft");
  await wirft(lauf(kopie(BEISPIEL), kopie(KONFIG), "24.11.2026"), "angaben", "heute", "Datum nicht als JJJJ-MM-TT");
  const k1 = kopie(KONFIG);
  delete k1.schnupperMonate;
  await wirft(lauf(kopie(BEISPIEL), k1), "konfig", "schnupperMonate", "ohne schnupperMonate");
  const k2 = kopie(KONFIG);
  k2.verein.ort = "";
  await wirft(lauf(kopie(BEISPIEL), k2), "konfig", "verein.ort", "ohne Ort des Vereins");
  const k4 = kopie(KONFIG);
  k4.verein.unterzeichner.name = "";
  await wirft(lauf(kopie(BEISPIEL), k4), "konfig", "verein.unterzeichner.name", "ohne Unterzeichner");
  // Fehlende Werkzeuge im Node-Test: Ladefehler mit Art „bibliothek“
  let lf = null;
  try {
    await erzeugeDateien({ antworten: kopie(BEISPIEL), medien: { foto: FOTO.bytes, unterschrift: SIG }, konfig: kopie(KONFIG), heute: HEUTE });
  } catch (e) {
    lf = e;
  }
  ok(lf instanceof LadeFehler && lf.art === "bibliothek", () => "ohne Browser und ohne werkzeuge: LadeFehler „bibliothek“, bekommen " + (lf && lf.message));
  // Die Antworten werden nicht verändert
  const a = kopie(BEISPIEL);
  const vorher = JSON.stringify(a);
  await erzeugeDateien({ antworten: a, medien: { foto: FOTO.bytes, unterschrift: SIG }, konfig: kopie(KONFIG), heute: HEUTE, werkzeuge: WERKZEUGE });
  ok(JSON.stringify(a) === vorher, "die Antworten wurden nicht verändert");
}

kontext = "K12 Metadaten und Wiederholbarkeit";
{
  for (const [name, pfad, titel] of [["Paket", paketPfad, "Trainerunterlagen"], ["Antrag", antragPfad, "Antrag auf Gebührenbefreiung"]]) {
    const doc = await PDFLib.PDFDocument.load(readFileSync(pfad));
    ok(doc.getTitle() === titel, () => name + ": Titel „" + doc.getTitle() + "“");
    ok(doc.getCreator() === "FFV Sportfreunde 04", () => name + ": Ersteller „" + doc.getCreator() + "“");
    ok(doc.getAuthor() === undefined || doc.getAuthor() === "", () => name + ": kein Autor in den Metadaten: " + doc.getAuthor());
    ok(!doc.getKeywords(), () => name + ": keine Schlagwörter");
    const meta = [doc.getTitle(), doc.getSubject(), doc.getCreator(), doc.getProducer()].join(" ");
    ok(!/Mustermann|Max\b|Erika|1988|example/.test(meta), () => name + ": keine personenbezogenen Daten in den Metadaten: " + meta);
    const info = infoSeiten(pfad);
    ok(!/Mustermann/.test(info.titel + info.betreff + info.autor + info.ersteller), name + ": pdfinfo ohne Namen der Person");
  }
  const g1 = await baue("wiederholung-1");
  const g2 = await baue("wiederholung-2");
  ok(g1.r.dateien.every((d, i) => Buffer.compare(Buffer.from(d.bytes), Buffer.from(g2.r.dateien[i].bytes)) === 0), "gleiche Eingaben ergeben dieselben Dateien (byteweise)");
}

kontext = "K12 Quelltext";
{
  const dateien = readdirSync(MODULE).filter((n) => /^trainer-pdf(-[a-z]+)?\.js$/.test(n));
  ok(dateien.length >= 8, () => "Module trainer-pdf*.js: " + dateien.join(", "));
  const nameImCode = /Florian|Müller|Melanie|Seipp|Kindeswohlbeauftragt|Mustermann|Teststraße/;
  for (const n of dateien) {
    const q = readFileSync(path.join(MODULE, n), "utf8");
    ok(!/Date\.now|new Date\(\s*\)|Math\.random|performance\.now/.test(q), n + ": keine Uhr und kein Zufall");
    ok(!/localStorage|sessionStorage|XMLHttpRequest|navigator\.|eval\(|new Function|require\(|from "node:|process\.|__dirname/.test(q), n + ": keine Browser-Speicher, kein Node, kein eval");
    ok(n === "trainer-pdf-lader.js" || !/\bdocument\.|\bwindow\b|\bfetch\(|\bimport\(/.test(q), n + ": DOM, Netz und dynamischer Import nur im Lader");
    ok(!nameImCode.test(q), () => n + ": kein fester Name oder Beispielname im Code");
    ok(!/versicher/i.test(q), n + ": kein Wort zu Versicherung im Code");
    for (const m of q.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(["'`])(\.\/[^"'`\n]+)\1/g)) {
      ok(existsSync(path.join(MODULE, m[2])), () => n + ": Import " + m[2] + " existiert nicht");
    }
    ok(!/from\s+["'](?!\.\/)/.test(q), n + ": nur relative Importe im Ordner (flaches Packaging)");
  }
}

kontext = "K13 Schrift im Modul lesen";
{
  const ttf = readFileSync(path.join(WURZEL, "assets", "fonts", "liberation-sans-regular.ttf"));
  const sha = (b) => createHash("sha256").update(b).digest("hex");
  // so schreibt tools/appack-paket.mjs › anmBaueBase64Modul die Datei (Urheberrechtsvermerk und Lizenz als Blockkommentar, Base64 in Zeilen zu 100 Zeichen)
  const zeilen = ttf.toString("base64").match(/.{1,100}/g);
  const kopf = "/*\n  Liberation Sans Regular 2.1.5 als Base64-Text (" + ttf.length + " Byte).\n\n  Digitized data copyright (c) 2010 Google Corporation. This license is copied below.\n*/\n";
  const modul = kopf + "export default `\n" + zeilen.join("\n") + "\n`;\n";
  const text = leseModulText(modul);
  ok(typeof text === "string" && text.length > 100000, "Format des Paketbaus wird erkannt");
  const neuBytes = typeof text === "string" ? Buffer.from(text, "base64") : Buffer.alloc(0);
  ok(Buffer.compare(neuBytes, ttf) === 0, "die Bytes aus dem gelesenen Text sind die der Schriftdatei (" + neuBytes.length + " von " + ttf.length + " Byte)");
  const altText = (await import("data:text/javascript;base64," + Buffer.from(modul, "utf8").toString("base64"))).default;
  ok(Buffer.compare(Buffer.from(altText, "base64"), neuBytes) === 0, "Byte für Byte gleich dem bisherigen Weg (import() des Moduls)");
  ok(text.replace(/\s+/g, "") === altText.replace(/\s+/g, ""), "derselbe Base64-Text wie der Wert von export default");
  ok(sha(neuBytes) === sha(ttf), () => "SHA-256 der Bytes gleich dem der Schriftdatei: " + sha(neuBytes));
  // Abwandlungen, die der Lader noch erkennt (der Text zwischen den Anführungszeichen, mit Leerraum, den atob überspringt)
  const erkannt = {
    "Zeichenkette in Anführungszeichen": ['export default "QUJD";', "QUJD"],
    "Zeichenkette in Hochkommas, ohne Semikolon": ["export default 'QUJD'\n", "QUJD"],
    "mehrere Blockkommentare davor": ["/* a */\n/* b */ export default `\nQUJD\n`;\n", "\nQUJD\n"],
    "Zeilenende CRLF": ["export default `\r\nQUJD\r\nREVG\r\n`;\r\n", "\r\nQUJD\r\nREVG\r\n"],
    "Byte-Order-Mark am Anfang": ["﻿export default `QUJD`;", "QUJD"],
    "Auffüllzeichen =": ["export default `QUI=`;", "QUI="],
  };
  for (const [name, [quelle, soll]] of Object.entries(erkannt)) ok(leseModulText(quelle) === soll, () => name + ": " + JSON.stringify(leseModulText(quelle)) + " statt " + JSON.stringify(soll));
  // Alles andere liefert null: dann lädt der Lader das Modul wie bisher (import(), erst nach einem erfolgreichen fetch)
  const unbekannt = {
    "weiterer Code danach": "export default `QUJD`;\nconsole.log(1);",
    "Schablone mit Ausdruck": "export default `QU${1}JD`;",
    "Funktion statt Text": "export default function () {}",
    "Anmeldeseite eines WLANs (HTML)": "<!doctype html><title>WLAN</title><p>Bitte melde dich an.</p>",
    "leere Antwort": "",
    "Zeichen außerhalb von Base64 (Maskierung)": "export default `QU\\nJD`;",
    "Zeichen außerhalb von Base64 (Unterstrich)": "export default `QU_JD`;",
    "Zeichenkette nicht beendet": "export default `QUJD",
    "andere Anführungszeichen am Ende": "export default `QUJD';",
    "zwei Exporte": "export const a = 1;\nexport default `QUJD`;",
    "kein Text": undefined,
  };
  for (const [name, quelle] of Object.entries(unbekannt)) ok(leseModulText(quelle) === null, () => name + ": " + JSON.stringify(leseModulText(quelle)) + " statt null");
  // Zeit: auch ein Fehlschlag auf einer großen fremden Datei bleibt schnell (keine ausufernde Suche im Regulären Ausdruck)
  const t0 = performance.now();
  for (let i = 0; i < 20; i++) leseModulText(modul);
  const dauerTreffer = (performance.now() - t0) / 20;
  const lang = "export default `" + "A".repeat(600000) + "\\`;";
  const t1 = performance.now();
  const fremd = leseModulText(lang);
  const dauerFehlschlag = performance.now() - t1;
  ok(dauerTreffer < 50, () => "Lesen des Moduls dauert " + dauerTreffer.toFixed(2) + " ms");
  ok(fremd === null && dauerFehlschlag < 500, () => "Fehlschlag auf 600000 Zeichen: " + dauerFehlschlag.toFixed(1) + " ms");
}

// ---------------------------------------------------------------------------------------------
// Ergebnis
// ---------------------------------------------------------------------------------------------
console.log("\nErgebnis je Kriterium:");
for (const [name, s] of statistik) console.log("  " + (s.f ? "FEHLER " : "ok     ") + name + ": " + s.n + " Prüfungen" + (s.f ? ", " + s.f + " Fehler" : ""));
console.log("\nverglichene Sätze und Wortlaute (K4): " + saetze + (quellenGeprueft.length ? "; Quellen geprüft: " + quellenGeprueft.join(", ") : "; Quellen nicht gefunden"));
console.log("Prüfungen: " + anzahl + ", Fehler: " + fehler.length + ", Dauer: " + ((performance.now() - beginn) / 1000).toFixed(1) + " s");
console.log("Dateien und Bilder: " + AUSGABE);
if (fehler.length) {
  console.log("\nFEHLER:");
  for (const f of fehler) console.log("  - " + f);
  process.exit(1);
}
console.log("trainer-pdf-test: alles in Ordnung");
