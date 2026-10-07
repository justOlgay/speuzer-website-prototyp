#!/usr/bin/env node
// Prüfskript für die amtlichen Vordrucke des Anmelde-Assistenten (AP-2, Stand 2026-09-29).
//
//   node tools/anmeldung-test/formulare-pruefen.mjs [--daten <andere-json>] [--originale <ordner>]
//
// Prüft data/anmeldung-formulare.json gegen die PDF-Kopien in assets/pdf/anmeldung/ (Kopien ohne Datei-Metadaten):
//   1. Datei: SHA-256, Größe, Seitenzahl, Seitenformat, Anzahl Formularfelder, keine Waisen im Ordner. Dazu
//      quelle_sha256, quelle_bytes, metadaten_entfernt: Die Kopie enthält weder die Info-Felder Author, Creator,
//      Producer, Title, Subject, Keywords noch einen XMP-Metadatenstrom.
//   1a. Original (nur wenn vorhanden): Das Skript sucht die Originaldatei per SHA-256 in tools/cache/anmeldung-test/originale/,
//      in den mit --originale genannten Ordnern und in $ANMELDUNG_ORIGINALE (Pfadliste) und prüft quelle_sha256 und
//      quelle_bytes dagegen. Dazu: gleiche Seitenzahl, gleiche Formularfelder, gleiche Trailer-ID, kein Wert der
//      entfernten Info-Felder in der Kopie, jede Seite bei 100 dpi pixelgleich. Ohne Original gibt es nur einen Hinweis.
//   2. Felder: Feldliste der PDF (pdf-lib getForm().getFields()) gegen das JSON – Name, Typ, Seite,
//      Rechteck, maximale Länge; keines fehlt, keines ist zu viel.
//   3. Belege: jede gedruckte Beschriftung (beleg) steht wirklich an der angegebenen Stelle der PDF
//      (Textkoordinaten mit pdftotext -bbox-layout) und liegt in der behaupteten Lage zum Feld.
//   4. Quellen: fuellt/quelle/bedingung/leerWennFehlt sind vollständig und nutzen nur Pfade aus den Schnittstellen
//      (Antworten a, Ergebnis e, Konfiguration konfig; SCHNITTSTELLEN Abschnitte 2, 3, 5).
//   5. Stellen: Unterschriften und Handfelder liegen auf gedruckten Linien (Pixelprobe mit 288 dpi),
//      die Fläche darüber ist frei von Druck, Werte des Aufnahmeantrags stimmen mit
//      data/aufnahmeantrag-felder.json überein.
//   6. Sichtprobe: schreibt nach tools/cache/anmeldung-test/formulare/
//        <formular>-felder.pdf    alle Felder mit Testwert (Feldname bzw. Nummer), Kästchen angekreuzt
//        <formular>-stellen.pdf   Rahmen mit Beschriftung an jeder Unterschrifts- und Handfeld-Stelle
//        <formular>-unicode.pdf   Namen/Orte mit „Şükrü Öztürk-Ğündoğdu, Łódź“ (Liberation Sans eingebettet)
//      dazu je Seite eine PNG (pdftoppm, 100 dpi) und zuordnung.txt (Tabelle Feld > Bedeutung > Beleg).
//   7. Beispiellauf: füllt den Abmelde-Vordruck mit Beispielwerten, ausgewertet aus den quelle-Pfaden der JSON
//      (Weg Einschreiben und Weg Vollmacht), prüft jedes Feld und jedes Kästchen und schreibt
//      abmeldung-beispiel-s1.png und abmeldung-beispiel-vollmacht-s1.png.
//
// Voraussetzungen: Node 20+, pdf-lib und @pdf-lib/fontkit in node_modules, poppler (pdftotext, pdftoppm).
// Rückgabewert 0 = keine Abweichung, 1 = Abweichungen (werden am Ende aufgelistet).
// Ändert nichts außer dem Ordner tools/cache/anmeldung-test/formulare/ (in .gitignore).

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const HIER = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HIER, "../..");
const require = createRequire(path.join(REPO, "package.json"));
const { PDFDocument, PDFName, PDFDict, PDFStream, PDFRawStream, PDFString, PDFHexString, StandardFonts, rgb, decodePDFRawStream } = require("pdf-lib");
const fontkit = require("@pdf-lib/fontkit");

const argDaten = process.argv.indexOf("--daten");   // nur für Gegenproben mit veränderten Kopien der JSON
const DATEN = argDaten > 0 ? path.resolve(process.argv[argDaten + 1]) : path.join(REPO, "data/anmeldung-formulare.json");
const argOrdner = process.argv.flatMap((a, i, alle) => (a === "--originale" && alle[i + 1] ? [path.resolve(alle[i + 1])] : []));
// Ordner, in denen nach den Originaldateien gesucht wird (gefunden wird per SHA-256, nicht per Name)
const ORIGINAL_ORDNER = [
  ...argOrdner,
  ...(process.env.ANMELDUNG_ORIGINALE ?? "").split(path.delimiter).filter(Boolean).map((p) => path.resolve(p)),
  path.join(REPO, "tools/cache/anmeldung-test/originale"),
];
const AUFNAHME_FELDER = path.join(REPO, "data/aufnahmeantrag-felder.json");
const PDF_ORDNER = path.join(REPO, "assets/pdf/anmeldung");
const SCHRIFT = path.join(REPO, "assets/fonts/liberation-sans-regular.ttf");
const AUSGABE = path.join(REPO, "tools/cache/anmeldung-test/formulare");

const FORMULARE = ["aufnahmeantrag", "hfv_antrag", "vollmacht", "abmeldung", "einverstaendnis_senioren"];
const DIGITAL_VORGABE = {
  aufnahmeantrag: "erlaubt", hfv_antrag: "nicht_erlaubt", vollmacht: "nicht_erlaubt",
  abmeldung: "nicht_erlaubt", einverstaendnis_senioren: "nicht_erlaubt",
};
const UNICODE_TEXT = "Şükrü Öztürk-Ğündoğdu, Łódź";
const MESS_DPI = 288;   // Pixelproben
const BILD_DPI = 100;   // Sichtprobe (PNG)

// Vereinsblau aus assets/css/tokens.css (--blau-700, --blau-500)
const BLAU = rgb(0x1f / 255, 0x2d / 255, 0xbe / 255);
const BLAU_HELL = rgb(0x3d / 255, 0x4f / 255, 0xea / 255);

// ---------------------------------------------------------------------------------------------
// Buchführung
// ---------------------------------------------------------------------------------------------
let pruefungen = 0;
const abweichungen = [];
function ok(bedingung, meldung) {
  pruefungen++;
  if (!bedingung) abweichungen.push(meldung);
  return Boolean(bedingung);
}
function abbruch(text) {
  console.error("FEHLER: " + text);
  process.exit(2);
}
const r2 = (n) => Math.round(n * 100) / 100;
const fast = (a, b, tol = 0.02) => Math.abs(a - b) <= tol;
const norm = (s) => String(s).replace(/\s+/g, "");
const kurz = (s, n) => (String(s).length > n ? String(s).slice(0, n - 1) + "…" : String(s));

// ---------------------------------------------------------------------------------------------
// Werkzeuge (poppler)
// ---------------------------------------------------------------------------------------------
for (const t of ["pdftotext", "pdftoppm"]) {
  const r = spawnSync(t, ["-v"], { encoding: "utf8" });
  if (r.error) abbruch(`${t} (poppler) nicht gefunden – bitte installieren (brew install poppler).`);
}

function textKoordinaten(pdfPfad) {
  const res = spawnSync("pdftotext", ["-bbox-layout", pdfPfad, "-"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (res.status !== 0) abbruch("pdftotext: " + res.stderr);
  return res.stdout.split("<page ").slice(1).map((s) => {
    const h = Number(/height="([\d.]+)"/.exec(s)[1]);
    const zeilen = [...s.matchAll(/<line [^>]*>([\s\S]*?)<\/line>/g)].map((z) =>
      [...z[1].matchAll(/<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([\s\S]*?)<\/word>/g)].map((k) => ({
        x0: +k[1], x1: +k[3], y0: h - +k[4], y1: h - +k[2],
        t: k[5].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'"),
      })));
    return { h, zeilen };
  });
}

// Lage einer Beschriftung (Kasten k) zu einem Rechteck r; Abstand oder null (siehe _beschreibung.lagen).
const ueberlappV = (a, b) => Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
const ueberlappH = (a, b) => Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
function lageAbstand(lage, k, r) {
  switch (lage) {
    case "rechts": return k.x0 >= r.x1 - 1.5 && k.x0 - r.x1 <= 20 && ueberlappV(k, r) >= 3 ? k.x0 - r.x1 : null;
    case "links": return k.x1 <= r.x0 + 1.5 && r.x0 - k.x1 <= 60 && ueberlappV(k, r) >= 3 ? r.x0 - k.x1 : null;
    case "zeile": return k.x1 <= r.x0 + 1.5 && ueberlappV(k, r) >= 3 ? r.x0 - k.x1 : null;
    case "oben": return k.y0 >= r.y1 - 2 && k.y0 - r.y1 <= 80 && ueberlappH(k, r) >= 3 ? k.y0 - r.y1 : null;
    case "unten": return k.y1 <= r.y0 + 2 && r.y0 - k.y1 <= 40 && ueberlappH(k, r) >= 3 ? r.y0 - k.y1 : null;
    case "bereich": return k.y0 >= r.y1 - 2 && k.y0 - r.y1 <= 130 ? k.y0 - r.y1 : null;
    default: return null;
  }
}

// Liest den Text im Kasten [x0, y0, x1, y1] wieder aus der PDF (Wörter, deren Mitte im Kasten liegt).
function textImKasten(seiteText, box) {
  const tol = 0.6;
  let best = null;
  for (const zeile of seiteText.zeilen) {
    const drin = zeile.filter((w) => {
      const cx = (w.x0 + w.x1) / 2, cy = (w.y0 + w.y1) / 2;
      return cx >= box[0] - tol && cx <= box[2] + tol && cy >= box[1] - tol && cy <= box[3] + tol;
    });
    if (drin.length && (!best || drin.length > best.length)) best = drin;
  }
  return best ? best.map((w) => w.t).join(" ") : "";
}

function pruefeBeleg(kontext, b, seiteText, rechteck) {
  const ok1 = ok(Array.isArray(b.box) && b.box.length === 4 && b.box.every(Number.isFinite), `${kontext}: beleg ohne gültigen Kasten`);
  if (!ok1) return;
  const gelesen = textImKasten(seiteText, b.box);
  ok(norm(gelesen) === norm(b.text), `${kontext}: Beschriftung „${b.text}“ nicht an ${JSON.stringify(b.box)} – dort steht „${gelesen}“`);
  const k = { x0: b.box[0], y0: b.box[1], x1: b.box[2], y1: b.box[3] };
  ok(lageAbstand(b.lage, k, rechteck) !== null, `${kontext}: Beschriftung „${kurz(b.text, 40)}“ liegt nicht in der Lage „${b.lage}“ zum Feld`);
}

// ---------------------------------------------------------------------------------------------
// Pixelproben
// ---------------------------------------------------------------------------------------------
function graustufen(pdfPfad, seite) {
  fs.mkdirSync(AUSGABE, { recursive: true });
  const stamm = path.join(AUSGABE, `_mess-${process.pid}`);
  const r = spawnSync("pdftoppm", ["-gray", "-r", String(MESS_DPI), "-f", String(seite), "-l", String(seite), "-singlefile", pdfPfad, stamm]);
  if (r.status !== 0) abbruch("pdftoppm (Messung): " + r.stderr);
  const buf = fs.readFileSync(stamm + ".pgm");
  fs.unlinkSync(stamm + ".pgm");
  let pos = 0; const tok = [];
  while (tok.length < 4) {
    while ([10, 13, 32, 9].includes(buf[pos])) pos++;
    let t = ""; while (buf[pos] > 32) t += String.fromCharCode(buf[pos++]);
    tok.push(t);
  }
  pos++;
  const W = Number(tok[1]), H = Number(tok[2]), skala = MESS_DPI / 72;
  return { W, H, skala, seitenH: H / skala, px: (c, r2_) => buf[pos + r2_ * W + c] };
}
const zeileVon = (pg, y) => Math.round((pg.seitenH - y) * pg.skala);

// Sucht ein waagerechtes dunkles Band nahe y über [x0, x1]; liefert die Mitte oder null.
function findeLinie(pg, y, x0, x1) {
  const c0 = Math.max(0, Math.floor((x0 + 1) * pg.skala)), c1 = Math.min(pg.W - 1, Math.ceil((x1 - 1) * pg.skala));
  if (c1 <= c0) return null;
  const rA = Math.max(0, zeileVon(pg, y + 3)), rB = Math.min(pg.H - 1, zeileVon(pg, y - 3));
  const baender = []; let cur = null;
  for (let r = rA; r <= rB; r++) {
    let dunkel = 0;
    for (let c = c0; c <= c1; c++) if (pg.px(c, r) < 215) dunkel++;
    if (dunkel / (c1 - c0 + 1) >= 0.6) { if (!cur) cur = { r0: r, r1: r }; else cur.r1 = r; }
    else if (cur) { baender.push(cur); cur = null; }
  }
  if (cur) baender.push(cur);
  const mitten = baender.map((b) => pg.seitenH - (b.r0 + b.r1 + 1) / 2 / pg.skala);
  mitten.sort((a, b) => Math.abs(a - y) - Math.abs(b - y));
  return mitten.length ? mitten[0] : null;
}

// Anteil dunkler Pixel im Rechteck (x, y = Unterkante, b, h)
function tintenAnteil(pg, x, y, b, h) {
  if (h <= 0 || b <= 0) return 0;
  const c0 = Math.max(0, Math.floor(x * pg.skala)), c1 = Math.min(pg.W - 1, Math.ceil((x + b) * pg.skala));
  const rA = Math.max(0, zeileVon(pg, y + h)), rB = Math.min(pg.H - 1, zeileVon(pg, y));
  let dunkel = 0, n = 0;
  for (let r = rA; r <= rB; r++) for (let c = c0; c <= c1; c++) { n++; if (pg.px(c, r) < 200) dunkel++; }
  return n ? dunkel / n : 0;
}

// ---------------------------------------------------------------------------------------------
// Ausdrücke in quelle / bedingung prüfen (kleine Sprache, siehe _beschreibung.quelle)
// ---------------------------------------------------------------------------------------------
const PFADE = new Set([
  // a: Antworten (SCHNITTSTELLEN Abschnitt 3)
  ...["schema", "sprache", "wer", "vorname", "nachname", "geburtsdatum", "geburtsort", "geburtsland", "geschlecht", "spielrechtFuer", "geborenInDe", "jahreInDe",
    "abteilung", "spielen", "spielerpass", "letztesSpiel", "letztesPflichtspiel", "sperre", "sperreBis", "freigabe", "wechselLetzte6Monate", "deutsch", "staaten",
    "auslandGewohnt", "auslandLand", "auslandStadt", "wohnen", "wohnenSeit", "ohneElternGrund", "sorge", "andererElternteilEinverstanden", "sorgeberechtigte",
    "email", "telefon", "mobil", "leistungen", "gesundheitsbogen", "nachweise", "unterschriftWeg", "hfvUnterschrift",
    "alterVerein.region", "alterVerein.name", "alterVerein.ort", "alterVerein.land", "alterVerein.verband",
    "alterVerein.mitgliedschaft", "alterVerein.empfaenger", "alterVerein.strasse", "alterVerein.plzOrt",
    "abmeldung.status", "abmeldung.datum", "abmeldung.weg",
    "besonderes.maedchenJungenteam", "besonderes.herrenAushilfe", "besonderes.sonderspielrecht", "besonderes.frauHerren",
    "karneval.gruppe", "karneval.tanztWoanders", "karneval.turnier", "karneval.abendOhneEltern",
    "anschrift.strasse", "anschrift.plz", "anschrift.ort",
    "beitrag.gruppe", "beitrag.familie", "beitrag.senator", "beitrag.doppel",
    "zahlung.art", "zahlung.kontoinhaber", "zahlung.kiVorname", "zahlung.kiNachname", "zahlung.kiAnschriftGleich", "zahlung.kiStrasse", "zahlung.kiPlz", "zahlung.kiOrt",
    "zahlung.iban", "zahlung.bic", "zahlung.bank",
    "einwilligungen.fotos", "einwilligungen.medien", "einwilligungen.hfvName", "einwilligungen.hfvFoto", "einwilligungen.fahrten", "einwilligungen.messenger",
    "notfall.name", "notfall.telefon", "notfall.beziehung",
    "gesundheit.allergien", "gesundheit.erkrankungen", "gesundheit.medikamente", "gesundheit.sonstiges",
    "spielerfoto.weg"].map((p) => "a." + p),
  // e: Ergebnis der Regeln (Abschnitt 5)
  ...["version", "alter", "minderjaehrig", "jahrgang", "altersklasse", "faelle", "status", "international", "unterlagen", "formulare", "unterschriften", "hinweise",
    "weiterleitung", "fehlend", "mannschaft.vorhanden", "mannschaft.namen", "mannschaft.hinweisKey",
    "frist.pflichtspieleAb", "frist.freundschaftsspieleAb", "frist.regel", "frist.unsicher", "frist.key",
    "beitrag.gruppe", "beitrag.jahr", "beitrag.monat", "beitrag.aufnahmegebuehr", "beitrag.zuschlagOhneSepa", "beitrag.hinweisKey"].map((p) => "e." + p),
  // konfig (Abschnitt 2)
  ...["anmeldung", "formulare", "aufnahmeantragFelder", "beitraege", "karnevalGruppen", "stand",
    "verein.name", "verein.name_register", "verein.mail", "verein.tel_geschaeftsstelle", "verein.vereinsnummer", "verein.vereinsnummerHfv", "verein.anschrift"].map((p) => "konfig." + p),
]);
const FORMULAR_SCHLUESSEL = ["aufnahmeantrag", "hfv_antrag", "vollmacht", "abmeldung", "einverstaendnis_senioren", "attest", "datenschutz", "notfall",
  "einverstaendnis_fahrten", "einverstaendnis_maedchen", "karneval_auftritte", "familienliste"];
const ENUMS = {
  "a.wer": ["kind", "selbst"],
  "a.geschlecht": ["m", "w", "d", "ohne_angabe"],
  "a.spielrechtFuer": ["m", "w"],
  "a.abteilung": ["fussball", "karneval", "beides", "passiv"],
  "a.alterVerein.region": ["hessen", "bundesland", "ausland"],
  "a.alterVerein.mitgliedschaft": ["kuendigen", "passiv", "weiss_nicht"],
  "a.abmeldung.status": ["einschreiben", "formlos", "noch_nicht", "weiss_nicht"],
  "a.abmeldung.weg": ["vollmacht", "einschreiben"],
  "a.sperre": ["ja", "nein", "weiss_nicht"],
  "e.status": ["neu", "wechsel_hfv", "wechsel_lv", "wechsel_ausland", "ausland_unbekannt"],
  "e.formulare": FORMULAR_SCHLUESSEL,
};
const FORMATE = ["TT.MM.JJJJ", "STAATEN"];
const WER = ["mitglied", "spieler", "sorgeberechtigte", "sorgeberechtigte_beide", "kontoinhaber", "arzt", "verein"];

// Wertausdruck: Teile mit " + ", je Teil "Text" oder Pfad[|Format]
function zerlegeWert(text) {
  const teile = []; let cur = ""; let inStr = false;
  for (const ch of text) {
    if (ch === '"') inStr = !inStr;
    if (!inStr && ch === "+") { teile.push(cur); cur = ""; continue; }
    cur += ch;
  }
  teile.push(cur);
  if (inStr) return { fehler: "Anführungszeichen nicht geschlossen" };
  const terme = [];
  for (let t of teile) {
    t = t.trim();
    if (/^".*"$/.test(t)) { terme.push({ typ: "text", wert: t.slice(1, -1) }); continue; }
    const [pfad, format, rest] = t.split("|");
    if (!PFADE.has(pfad) || rest !== undefined) return { fehler: `unbekannter Pfad „${pfad}“` };
    if (format !== undefined && !FORMATE.includes(format)) return { fehler: `unbekanntes Format „${format}“` };
    terme.push({ typ: "pfad", pfad, format });
  }
  return { terme };
}

function pruefeWert(kontext, text) {
  const z = zerlegeWert(text);
  ok(!z.fehler, `${kontext}: ${z.fehler} in „${text}“`);
}

// Bedingung: oder > und > nicht > Vergleich; liefert einen Syntaxbaum oder einen Fehlertext
function parseBedingung(text) {
  const tokens = [];
  const re = /\s*(?:(\()|(\))|(\[)|(\])|(,)|(!=|=|<)|("[^"]*")|(\d+)|([A-Za-zÄÖÜäöüß_][\wÄÖÜäöüß.]*))/gy;
  let m; let ende = 0;
  while ((m = re.exec(text)) !== null) {
    ende = re.lastIndex;
    tokens.push({ t: m[1] ? "(" : m[2] ? ")" : m[3] ? "[" : m[4] ? "]" : m[5] ? "," : m[6] ? m[6] : m[7] ? "str" : m[8] ? "num" : "id", v: m[0].trim() });
    if (ende >= text.length) break;
  }
  if (!(ende >= text.trimEnd().length && tokens.length > 0)) return { fehler: "nicht lesbar" };
  let i = 0; let fehler = null;
  const peek = () => tokens[i];
  const next = () => tokens[i++];
  const fail = (meldung) => { fehler = fehler ?? meldung; return null; };
  const wert = (pfad) => {
    const t = next();
    if (!t || !["id", "num"].includes(t.t)) return fail(`Wert nach „${pfad}“ fehlt`);
    if (ENUMS[pfad] && !ENUMS[pfad].includes(t.v)) fail(`„${t.v}“ ist kein gültiger Wert für ${pfad}`);
    return t.v;
  };
  const atom = () => {
    const t = next();
    if (!t) return fail("Ausdruck endet zu früh");
    if (t.t === "(") { const x = oder(); if (next()?.t !== ")") fail("Klammer nicht geschlossen"); return x; }
    if (t.t !== "id") return fail(`unerwartet „${t.v}“`);
    if (t.v === "nicht") return { k: "nicht", x: atom() };
    if (!PFADE.has(t.v)) return fail(`unbekannter Pfad „${t.v}“`);
    const n = peek();
    if (n && (n.t === "=" || n.t === "!=")) { next(); return { k: n.t === "=" ? "eq" : "neq", pfad: t.v, wert: wert(t.v) }; }
    if (n && n.t === "<") { next(); const z = next(); if (z?.t !== "num") return fail("Zahl nach < fehlt"); return { k: "lt", pfad: t.v, n: Number(z.v) }; }
    if (n && n.t === "id" && n.v === "in") {
      next();
      if (next()?.t !== "[") return fail("„[“ nach in fehlt");
      const werte = [];
      do { werte.push(wert(t.v)); } while (peek()?.t === "," && next());
      if (next()?.t !== "]") return fail("„]“ fehlt");
      return { k: "in", pfad: t.v, werte };
    }
    if (n && n.t === "id" && n.v === "enthält") { next(); return { k: "has", pfad: t.v, wert: wert(t.v) }; }
    return { k: "pfad", pfad: t.v };
  };
  const und = () => { let l = atom(); while (peek()?.t === "id" && peek().v === "und") { next(); l = { k: "und", l, r: atom() }; } return l; };
  const oder = () => { let l = und(); while (peek()?.t === "id" && peek().v === "oder") { next(); l = { k: "oder", l, r: und() }; } return l; };
  const ast = oder();
  if (i < tokens.length && !fehler) fail(`überzähliges „${tokens[i].v}“`);
  return fehler ? { fehler } : { ast };
}

function pruefeBedingung(kontext, text) {
  const { fehler } = parseBedingung(text);
  ok(!fehler, `${kontext}: Bedingung „${text}“ – ${fehler}`);
}

// ---- Auswertung (nur für den Beispiellauf des Abmelde-Vordrucks) ----
function holePfad(ctx, pfad) {
  const [wurzel, ...rest] = pfad.split(".");
  let v = ctx[wurzel];
  for (const k of rest) { if (v === undefined || v === null) return undefined; v = v[k]; }
  return v;
}
const fehltWert = (v) => v === undefined || v === null || v === "";
function bewerteBedingung(ast, ctx) {
  const v = ast.pfad ? holePfad(ctx, ast.pfad) : undefined;
  switch (ast.k) {
    case "pfad": return v === true;
    case "eq": return !fehltWert(v) && String(v) === ast.wert;
    case "neq": return fehltWert(v) || String(v) !== ast.wert;
    case "lt": return typeof v === "number" && v < ast.n;
    case "in": return !fehltWert(v) && ast.werte.includes(String(v));
    case "has": return Array.isArray(v) && v.includes(ast.wert);
    case "nicht": return !bewerteBedingung(ast.x, ctx);
    case "und": return bewerteBedingung(ast.l, ctx) && bewerteBedingung(ast.r, ctx);
    case "oder": return bewerteBedingung(ast.l, ctx) || bewerteBedingung(ast.r, ctx);
    default: throw new Error("unbekannter Knoten " + ast.k);
  }
}
// null, wenn ein Wert fehlt; sonst der zusammengesetzte Text
function bewerteWert(text, ctx) {
  const z = zerlegeWert(text);
  if (z.fehler) throw new Error(z.fehler);
  let aus = "";
  for (const t of z.terme) {
    if (t.typ === "text") { aus += t.wert; continue; }
    const v = holePfad(ctx, t.pfad);
    if (fehltWert(v)) return null;
    if (t.format === "TT.MM.JJJJ") { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v)); aus += m ? `${m[3]}.${m[2]}.${m[1]}` : String(v); }
    else if (t.format === "STAATEN") throw new Error("Format STAATEN wird im Beispiellauf nicht ausgewertet");
    else aus += String(v);
  }
  return aus;
}

// ---------------------------------------------------------------------------------------------
// Ausgabe-Helfer
// ---------------------------------------------------------------------------------------------
function rendereSeiten(pdfPfad, praefix, seiten) {
  const png = [];
  for (const s of [...new Set(seiten)].sort((a, b) => a - b)) {
    const ziel = path.join(AUSGABE, `${praefix}-s${s}`);
    const r = spawnSync("pdftoppm", ["-r", String(BILD_DPI), "-png", "-f", String(s), "-l", String(s), "-singlefile", pdfPfad, ziel]);
    ok(r.status === 0, `${praefix}: pdftoppm Seite ${s} fehlgeschlagen: ${r.stderr}`);
    png.push(ziel + ".png");
  }
  return png;
}

// ---------------------------------------------------------------------------------------------
// Datei-Metadaten, Originale, Felder lesen
// ---------------------------------------------------------------------------------------------
const INFO_SCHLUESSEL = ["Author", "Creator", "Producer", "Title", "Subject", "Keywords"];
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const beschreibePfad = (p) => (p.startsWith(REPO + path.sep) ? path.relative(REPO, p) : ".../" + path.basename(p));

// Was an Datei-Metadaten noch in der PDF steht (eigene, vom Erzeuger unabhängige Prüfung)
function metadatenBefunde(doc) {
  const ctx = doc.context;
  const befunde = [];
  const info = ctx.trailerInfo.Info ? ctx.lookup(ctx.trailerInfo.Info, PDFDict) : undefined;
  if (info) for (const k of INFO_SCHLUESSEL) if (info.has(PDFName.of(k))) befunde.push(`Info-Feld ${k}`);
  if (doc.catalog.has(PDFName.of("Metadata"))) befunde.push("XMP-Verweis im Katalog");
  for (const [ref, o] of ctx.enumerateIndirectObjects()) {
    const d = o instanceof PDFStream ? o.dict : o instanceof PDFDict ? o : null;
    if (d?.get(PDFName.of("Type"))?.toString() === "/Metadata") befunde.push(`Objekt ${ref} vom Typ /Metadata`);
    if (o instanceof PDFRawStream) {   // XMP irgendwo versteckt?
      let text = "";
      try { text = Buffer.from(decodePDFRawStream(o).decode()).subarray(0, 4096).toString("latin1"); } catch { /* binärer oder unlesbarer Stream */ }
      if (/<\?xpacket|<x:xmpmeta/.test(text)) befunde.push(`Objekt ${ref} enthält XMP`);
    }
  }
  return befunde;
}

// Sucht die Originaldatei: zuerst unter dem Dateinamen der Kopie in den Ordnern (so fällt ein falsches quelle_sha256 auf),
// dann per SHA-256 in den Ordnern und ihren Unterordnern (nur Dateien gleicher Größe werden gelesen).
// Ergebnis: { pfad, stimmt } oder null; stimmt=false heißt: Datei gleichen Namens gefunden, aber anderer Inhalt.
function sucheOriginal(sha, groesse, dateiname) {
  let nachName = null;
  for (const ordner of ORIGINAL_ORDNER) {
    const p = path.join(ordner, dateiname);
    try { if (fs.statSync(p).isFile()) { if (sha256(fs.readFileSync(p)) === sha) return { pfad: p, stimmt: true }; nachName = nachName ?? p; } } catch { /* nicht vorhanden */ }
  }
  const gehe = (dir, tiefe) => {
    let eintraege;
    try { eintraege = fs.readdirSync(dir, { withFileTypes: true }); } catch { return null; }
    for (const e of eintraege) {
      const p = path.join(dir, e.name);
      if (e.isDirectory() && tiefe < 5) { const r = gehe(p, tiefe + 1); if (r) return r; }
      else if (e.isFile() && /\.pdf$/i.test(e.name)) {
        try { if (fs.statSync(p).size === groesse && sha256(fs.readFileSync(p)) === sha) return p; } catch { /* nicht lesbar */ }
      }
    }
    return null;
  };
  for (const ordner of ORIGINAL_ORDNER) { const r = gehe(ordner, 0); if (r) return { pfad: r, stimmt: true }; }
  return nachName ? { pfad: nachName, stimmt: false } : null;
}

// Formularfelder einer geladenen PDF (Name, Typ, Seite, Rechteck, maximale Länge, Anzahl Widgets)
function liesFelder(doc) {
  const seiten = doc.getPages();
  const seitenRefs = seiten.map((p) => p.ref.toString());
  return doc.getForm().getFields().map((f) => {
    const w = f.acroField.getWidgets();
    const rc = w[0].getRectangle();
    let seite = w[0].P() ? seitenRefs.indexOf(w[0].P().toString()) + 1 : 0;
    if (!seite) seiten.forEach((p, i) => { const an = p.node.Annots(); if (an) for (let k = 0; k < an.size(); k++) if (an.lookup(k) === w[0].dict) seite = i + 1; });
    const typ = f.constructor.name === "PDFCheckBox" ? "checkbox" : f.constructor.name === "PDFTextField" ? "text" : f.constructor.name;
    return { name: f.getName(), typ, seite, rect: [r2(rc.x), r2(rc.y), r2(rc.width), r2(rc.height)], maxLaenge: typ === "text" ? f.getMaxLength() : undefined, widgets: w.length };
  });
}

function ppmSeite(pdfPfad, seite) {
  const stamm = path.join(AUSGABE, `_ppm-${process.pid}`);
  const r = spawnSync("pdftoppm", ["-r", String(BILD_DPI), "-f", String(seite), "-l", String(seite), "-singlefile", pdfPfad, stamm]);
  if (r.status !== 0) abbruch("pdftoppm (Vergleich): " + r.stderr);
  const b = fs.readFileSync(stamm + ".ppm");
  fs.unlinkSync(stamm + ".ppm");
  return b;
}

// Kopie gegen Original: Seiten, Felder, Trailer-ID, entfernte Werte, Rendering
async function vergleicheMitOriginal(K, form, kopieDoc, kopieBytes, kopiePfad, originalPfad) {
  const original = fs.readFileSync(originalPfad);
  ok(original.length === form.quelle_bytes, `${K}: quelle_bytes ${form.quelle_bytes} ≠ Größe des Originals ${original.length}`);
  ok(sha256(original) === form.quelle_sha256, `${K}: quelle_sha256 ≠ SHA-256 des Originals`);
  const dO = await PDFDocument.load(original, { updateMetadata: false });
  ok(dO.getPageCount() === kopieDoc.getPageCount(), `${K}: Seitenzahl der Kopie weicht vom Original ab`);
  const beschr = (f) => [f.name, f.typ, f.seite, f.rect.join(","), f.maxLaenge ?? "-"].join("|");
  ok(JSON.stringify(liesFelder(dO).map(beschr)) === JSON.stringify(liesFelder(kopieDoc).map(beschr)), `${K}: Formularfelder der Kopie weichen vom Original ab`);
  ok(String(dO.context.trailerInfo.ID) === String(kopieDoc.context.trailerInfo.ID), `${K}: Trailer-ID der Kopie weicht vom Original ab`);
  // Kein Wert der entfernten Info-Felder (auch nicht Teile eines Namens) darf in der Kopie stehen – roh, als UTF-16BE oder dekodiert
  const infoO = dO.context.trailerInfo.Info ? dO.context.lookup(dO.context.trailerInfo.Info, PDFDict) : undefined;
  const suchen = [];
  for (const k of INFO_SCHLUESSEL) {
    const v = infoO?.get(PDFName.of(k));
    if (v instanceof PDFString || v instanceof PDFHexString) {
      const t = v.decodeText();
      suchen.push([k, t]);
      if (k === "Author") for (const teil of t.split(/\s+/)) if (teil.length > 2) suchen.push([k, teil]);
    }
  }
  const roh = kopieBytes.toString("latin1");
  let dekodiert = "";
  for (const [, o] of kopieDoc.context.enumerateIndirectObjects()) {
    if (o instanceof PDFRawStream) { try { dekodiert += Buffer.from(decodePDFRawStream(o).decode()).toString("latin1") + "\n"; } catch { /* unlesbar */ } }
  }
  const utf16 = (t) => Buffer.from(t, "utf16le").swap16().toString("latin1");
  for (const [k, t] of suchen) {
    ok(!roh.includes(t) && !roh.includes(utf16(t)) && !dekodiert.includes(t) && !dekodiert.includes(utf16(t)), `${K}: ein Wert des entfernten Info-Felds ${k} steht noch in der Kopie`);
  }
  // Rendering jeder Seite bei 100 dpi pixelgleich
  let gleich = 0;
  for (let p = 1; p <= dO.getPageCount(); p++) {
    const gl = ppmSeite(originalPfad, p).equals(ppmSeite(kopiePfad, p));
    ok(gl, `${K}: Seite ${p} weicht bei ${BILD_DPI} dpi vom Original ab`);
    if (gl) gleich++;
  }
  console.log(`  Original verglichen: Seiten ${dO.getPageCount()}, Felder ${liesFelder(kopieDoc).length}, Trailer-ID gleich, ${suchen.length} Werte der Info-Felder nicht in der Kopie, ${gleich} von ${dO.getPageCount()} Seiten pixelgleich`);
}

// ---------------------------------------------------------------------------------------------
// Beispiellauf Abmelde-Vordruck: Werte aus den quelle-Pfaden der JSON
// ---------------------------------------------------------------------------------------------
const KAESTCHEN_SPIEL = "Hiermit melde ich meine Spielberechtigung bei Ihrem Verein ab";
const KAESTCHEN_MITGLIED = "Hiermit melde ich meine Mitgliedschaft bei Ihrem Verein ab";
const KAESTCHEN_PASSIV = "Ich bleibe weiterhin passives Mitglied im Verein";
const BEISPIEL_KONFIG = { verein: { name: "FFV Sportfreunde 04", name_register: "Frankfurter Fußballverein Sportfreunde 1904 e. V.", vereinsnummer: "24053", vereinsnummerHfv: "34024108" } };
const BEISPIEL_PERSON = { nachname: "Mustermann", vorname: "Mia", geburtsdatum: "2014-03-27", anschrift: { strasse: "Beispielweg 12", plz: "60000", ort: "Beispielstadt" } };
const ABMELDUNG_BEISPIELE = [
  {
    name: "abmeldung-beispiel", titel: "Weg Einschreiben, Mitgliedschaft kündigen, Anschrift des Vereins bekannt",
    ctx: {
      a: { ...BEISPIEL_PERSON, abmeldung: { status: "noch_nicht", weg: "einschreiben" },
        alterVerein: { region: "hessen", name: "SV Beispieldorf 1910 e. V.", empfaenger: "Vorstand", strasse: "Vereinsweg 1", plzOrt: "12345 Beispieldorf", mitgliedschaft: "kuendigen" } },
      e: { formulare: ["aufnahmeantrag", "hfv_antrag", "abmeldung"], minderjaehrig: true }, konfig: BEISPIEL_KONFIG,
    },
    texte: { 1: "Mustermann", 2: "Mia", 3: "27.03.2014", "Straße und Hausnummer": "Beispielweg 12", "Postleitzahl und Wohnort": "60000 Beispielstadt",
      undefined: "SV Beispieldorf 1910 e. V.", "Empfänger Einschreiben": "Vorstand", "Straße und Hausnummer 1": "Vereinsweg 1", "Straße und Hausnummer 2": "12345 Beispieldorf" },
    kaestchen: { [KAESTCHEN_SPIEL]: true, [KAESTCHEN_MITGLIED]: true, [KAESTCHEN_PASSIV]: false },
  },
  {
    name: "abmeldung-beispiel-vollmacht", titel: "Weg Vollmacht, passives Mitglied, keine Anschrift des Vereins (Felder bleiben für die Hand leer)",
    ctx: {
      a: { ...BEISPIEL_PERSON, abmeldung: { status: "noch_nicht", weg: "vollmacht" },
        alterVerein: { region: "hessen", name: "SV Beispieldorf 1910 e. V.", mitgliedschaft: "passiv" } },
      e: { formulare: ["aufnahmeantrag", "hfv_antrag", "vollmacht", "abmeldung"], minderjaehrig: true }, konfig: BEISPIEL_KONFIG,
    },
    texte: { 1: "Mustermann", 2: "Mia", 3: "27.03.2014", "Straße und Hausnummer": "Beispielweg 12", "Postleitzahl und Wohnort": "60000 Beispielstadt", undefined: "SV Beispieldorf 1910 e. V." },
    kaestchen: { [KAESTCHEN_SPIEL]: false, [KAESTCHEN_MITGLIED]: false, [KAESTCHEN_PASSIV]: true },
  },
];

async function abmeldungBeispiel(K, form, bytes, bsp) {
  const d = await PDFDocument.load(bytes, { updateMetadata: false });
  d.registerFontkit(fontkit);
  const font = await d.embedFont(schrift, { subset: true });
  const fm = d.getForm();
  for (const [name, jf] of Object.entries(form.felder)) {
    if (jf.fuellt !== "assistent") continue;
    const c = `${K}.beispiel.${bsp.name}.${name}`;
    if (jf.typ === "checkbox") {
      const { ast, fehler } = parseBedingung(jf.quelle);
      if (!ok(!fehler, `${c}: ${fehler}`)) continue;
      if (bewerteBedingung(ast, bsp.ctx)) fm.getCheckBox(name).check();
    } else {
      if (jf.bedingung) {
        const p = parseBedingung(jf.bedingung);
        if (!ok(!p.fehler, `${c}: ${p.fehler}`) || !bewerteBedingung(p.ast, bsp.ctx)) continue;
      }
      let wert = null;
      try { wert = bewerteWert(jf.quelle, bsp.ctx); } catch (e) { ok(false, `${c}: ${e.message}`); continue; }
      if (fehltWert(wert)) { ok(jf.leerWennFehlt === true, `${c}: der Wert fehlt, aber leerWennFehlt ist nicht gesetzt`); continue; }
      fm.getTextField(name).setText(wert);
    }
  }
  fm.updateFieldAppearances(font);
  const helv = await d.embedFont(StandardFonts.Helvetica);
  d.getPage(0).drawText(`Prüflauf mit Beispielwerten aus den quelle-Pfaden: ${bsp.titel}`, { x: 36, y: 20, size: 7, font: helv, color: BLAU });
  const gespeichert = await d.save({ updateFieldAppearances: false });
  const ausgabe = path.join(AUSGABE, `${bsp.name}.pdf`);
  fs.writeFileSync(ausgabe, gespeichert);
  // Ergebnis zurücklesen: jedes Feld und jedes Kästchen muss genau den erwarteten Wert haben (Unterschriftsfelder leer)
  const z = await PDFDocument.load(gespeichert, { updateMetadata: false });
  for (const f of z.getForm().getFields()) {
    const name = f.getName();
    const c = `${K}.beispiel.${bsp.name}.${name}`;
    if (f.constructor.name === "PDFCheckBox") ok(f.isChecked() === (bsp.kaestchen[name] ?? false), `${c}: Kästchen ist ${f.isChecked() ? "angekreuzt" : "leer"}, erwartet ${bsp.kaestchen[name] ? "angekreuzt" : "leer"}`);
    else ok((f.getText() ?? "") === (bsp.texte[name] ?? ""), `${c}: enthält „${f.getText() ?? ""}“, erwartet „${bsp.texte[name] ?? ""}“`);
  }
  erzeugt.push(ausgabe, ...rendereSeiten(ausgabe, bsp.name, [1]));
  console.log(`  Beispiellauf ${bsp.name}: ${bsp.titel}`);
}

// ---------------------------------------------------------------------------------------------
// Hauptteil
// ---------------------------------------------------------------------------------------------
if (!fs.existsSync(DATEN)) abbruch(`${DATEN} fehlt.`);
let daten;
try { daten = JSON.parse(fs.readFileSync(DATEN, "utf8")); } catch (e) { abbruch(`${DATEN} ist kein gültiges JSON: ${e.message}`); }

fs.mkdirSync(AUSGABE, { recursive: true });
for (const f of fs.readdirSync(AUSGABE)) if (/\.(png|pdf|pgm|txt)$/.test(f)) fs.rmSync(path.join(AUSGABE, f)); // nur eigene Ausgaben

const tabelle = [];       // Zeilen der Zuordnungstabelle
const erzeugt = [];       // geschriebene Dateien
const dateiUebersicht = [];
let originaleGefunden = 0;

ok(typeof daten.stand === "string" && /^\d{4}-\d{2}-\d{2}$/.test(daten.stand), "stand fehlt oder ist kein Datum (JJJJ-MM-TT)");
ok(daten.formulare && FORMULARE.every((k) => daten.formulare[k]), `formulare muss genau ${FORMULARE.join(", ")} enthalten`);
ok(Object.keys(daten.formulare ?? {}).every((k) => FORMULARE.includes(k)), "formulare enthält unbekannte Schlüssel: " + Object.keys(daten.formulare ?? {}).filter((k) => !FORMULARE.includes(k)).join(", "));

// Waisen im PDF-Ordner
const dateienImOrdner = fs.readdirSync(PDF_ORDNER).filter((f) => f.endsWith(".pdf"));
const dateienImJson = FORMULARE.map((k) => daten.formulare?.[k]?.datei).filter(Boolean).map((d) => path.basename(d));
for (const f of dateienImOrdner) ok(dateienImJson.includes(f), `assets/pdf/anmeldung/${f} kommt in keinem Formular des JSON vor`);

const schrift = fs.readFileSync(SCHRIFT);

for (const key of FORMULARE) {
  const form = daten.formulare?.[key];
  if (!form) continue;
  const K = key;   // Kontext für Meldungen
  console.log(`\n=== ${key}: ${form.titel}`);

  // ---- 1. Datei ---------------------------------------------------------------------------
  const pdfPfad = path.join(REPO, form.datei);
  if (!ok(fs.existsSync(pdfPfad), `${K}: Datei ${form.datei} fehlt`)) continue;
  const bytes = fs.readFileSync(pdfPfad);
  const sha = crypto.createHash("sha256").update(bytes).digest("hex");
  dateiUebersicht.push(`${sha}  ${form.datei}  (${bytes.length} Byte)`);
  ok(sha === form.sha256, `${K}: SHA-256 der Datei ${sha} weicht vom JSON (${form.sha256}) ab`);
  ok(bytes.length === form.bytes, `${K}: Größe ${bytes.length} weicht vom JSON (${form.bytes}) ab`);
  ok(/^[0-9a-f]{64}$/.test(form.quelle_sha256 ?? ""), `${K}: quelle_sha256 fehlt oder ist kein SHA-256`);
  ok(Number.isInteger(form.quelle_bytes) && form.quelle_bytes > 0, `${K}: quelle_bytes fehlt`);
  ok(form.metadaten_entfernt === true, `${K}: metadaten_entfernt muss true sein`);
  ok(form.quelle_sha256 !== form.sha256, `${K}: sha256 und quelle_sha256 sind gleich – die Kopie wäre nicht bereinigt`);
  ok(/^https:\/\//.test(form.quelle_url ?? ""), `${K}: quelle_url fehlt oder ist kein https-Link`);
  ok(typeof form.quelle_stand === "string" && form.quelle_stand.length > 5, `${K}: quelle_stand fehlt`);
  ok(typeof form.titel === "string" && form.titel.length > 5, `${K}: titel fehlt`);
  ok(form.digitaleUnterschrift === DIGITAL_VORGABE[key], `${K}: digitaleUnterschrift ist „${form.digitaleUnterschrift}“, Vorgabe „${DIGITAL_VORGABE[key]}“`);
  ok(typeof form.digitaleUnterschriftGrund === "string" && form.digitaleUnterschriftGrund.length > 20, `${K}: digitaleUnterschriftGrund fehlt`);
  if (key !== "aufnahmeantrag") ok(/JO § 37|SpO § 9[23]|JO § 29/.test(form.digitaleUnterschriftGrund ?? ""), `${K}: digitaleUnterschriftGrund nennt keine Regel (JO/SpO)`);
  else ok(/§ 127 BGB/.test(form.digitaleUnterschriftGrund ?? ""), `${K}: digitaleUnterschriftGrund nennt § 127 BGB nicht`);

  const doc = await PDFDocument.load(bytes, { updateMetadata: false });
  const seiten = doc.getPages();
  ok(seiten.length === form.seiten, `${K}: ${seiten.length} Seiten im PDF, JSON sagt ${form.seiten}`);
  const s0 = seiten[0].getSize();
  ok(fast(s0.width, form.seitenformat?.breite) && fast(s0.height, form.seitenformat?.hoehe), `${K}: Seitenformat ${r2(s0.width)} x ${r2(s0.height)} weicht vom JSON ab`);
  const seitenMasse = seiten.map((p) => p.getSize());

  // ---- 1a. Metadaten der Kopie, Original ----------------------------------------------------
  const befunde = metadatenBefunde(doc);
  ok(befunde.length === 0, `${K}: die Kopie enthält Datei-Metadaten: ${befunde.join(", ")}`);
  const original = sucheOriginal(form.quelle_sha256, form.quelle_bytes, path.basename(form.datei ?? ""));
  if (original?.stimmt) {
    originaleGefunden++;
    console.log(`  Original gefunden (${beschreibePfad(original.pfad)}): SHA-256 entspricht quelle_sha256`);
    await vergleicheMitOriginal(K, form, doc, bytes, pdfPfad, original.pfad);
  } else if (original) {
    ok(false, `${K}: das Original ${beschreibePfad(original.pfad)} hat einen anderen SHA-256 als quelle_sha256 (${form.quelle_sha256})`);
  } else console.log("  Original nicht gefunden (Ordner siehe Kopf des Skripts) – quelle_sha256/quelle_bytes nur formal geprüft");

  // ---- 2. Felder --------------------------------------------------------------------------
  const pdfFelder = liesFelder(doc);
  const jsonFelder = form.felder ?? {};
  ok(form.formularfelder === pdfFelder.length, `${K}: formularfelder=${form.formularfelder}, im PDF ${pdfFelder.length}`);
  if (key === "aufnahmeantrag") {
    ok(form.felder === undefined && pdfFelder.length === 0, `${K}: der Aufnahmeantrag hat keine Formularfelder (Vermessung in ${form.vermessung})`);
    ok(form.vermessung === "data/aufnahmeantrag-felder.json", `${K}: vermessung muss auf data/aufnahmeantrag-felder.json zeigen`);
  } else {
    const nurPdf = pdfFelder.filter((f) => !(f.name in jsonFelder)).map((f) => f.name);
    const nurJson = Object.keys(jsonFelder).filter((n) => !pdfFelder.some((f) => f.name === n));
    ok(nurPdf.length === 0, `${K}: Felder im PDF, aber nicht im JSON: ${JSON.stringify(nurPdf)}`);
    ok(nurJson.length === 0, `${K}: Felder im JSON, aber nicht im PDF: ${JSON.stringify(nurJson)}`);
    console.log(`  Felder: PDF ${pdfFelder.length}, JSON ${Object.keys(jsonFelder).length}, nur im PDF ${nurPdf.length}, nur im JSON ${nurJson.length}`);
  }

  const textSeiten = textKoordinaten(pdfPfad);
  ok(textSeiten.length === seiten.length, `${K}: pdftotext liefert ${textSeiten.length} Seiten`);
  let nr = 0;
  for (const pf of pdfFelder) {
    nr++;
    const jf = jsonFelder[pf.name];
    if (!jf) continue;
    const c = `${K}.${pf.name}`;
    ok(pf.widgets === 1, `${c}: ${pf.widgets} Widgets (erwartet 1)`);
    ok(jf.typ === pf.typ, `${c}: typ ${jf.typ} ≠ PDF ${pf.typ}`);
    ok(jf.seite === pf.seite, `${c}: seite ${jf.seite} ≠ PDF ${pf.seite}`);
    ok(Array.isArray(jf.rect) && jf.rect.length === 4 && jf.rect.every((v, i) => fast(v, pf.rect[i])), `${c}: rect ${JSON.stringify(jf.rect)} ≠ PDF ${JSON.stringify(pf.rect)}`);
    ok(jf.maxLaenge === (pf.maxLaenge ?? undefined), `${c}: maxLaenge ${jf.maxLaenge} ≠ PDF ${pf.maxLaenge}`);
    ok(typeof jf.bedeutung === "string" && jf.bedeutung.length > 3, `${c}: bedeutung fehlt`);
    ok(["assistent", "verein", "familie_hand"].includes(jf.fuellt), `${c}: fuellt „${jf.fuellt}“ ungültig`);
    if (jf.fuellt === "assistent") {
      if (ok(typeof jf.quelle === "string" && jf.quelle.length > 0, `${c}: fuellt=assistent braucht eine quelle`)) {
        if (pf.typ === "checkbox") pruefeBedingung(`${c}.quelle`, jf.quelle); else pruefeWert(`${c}.quelle`, jf.quelle);
      }
    } else ok(jf.quelle === null, `${c}: bei fuellt=${jf.fuellt} muss quelle null sein`);
    if (jf.bedingung !== undefined) { ok(pf.typ === "text", `${c}: bedingung nur bei Textfeldern`); pruefeBedingung(`${c}.bedingung`, jf.bedingung); }
    if (jf.leerWennFehlt !== undefined) ok(jf.leerWennFehlt === true && jf.fuellt === "assistent", `${c}: leerWennFehlt ist nur als true bei fuellt=assistent erlaubt`);
    ok(Array.isArray(jf.beleg) && jf.beleg.length > 0, `${c}: mindestens ein beleg (gedruckte Beschriftung) nötig`);
    const rechteck = { x0: pf.rect[0], y0: pf.rect[1], x1: pf.rect[0] + pf.rect[2], y1: pf.rect[1] + pf.rect[3] };
    for (const b of jf.beleg ?? []) pruefeBeleg(c, b, textSeiten[pf.seite - 1], rechteck);
    tabelle.push({ form: key, nr, name: pf.name, typ: pf.typ, seite: pf.seite, rect: pf.rect, fuellt: jf.fuellt, quelle: jf.quelle, bedingung: jf.bedingung, leerWennFehlt: jf.leerWennFehlt, bedeutung: jf.bedeutung, beleg: jf.beleg ?? [], hinweis: jf.hinweis });
  }

  // ---- 3. Stellen (Unterschriften, Handfelder) ---------------------------------------------
  const stellen = [
    ...(form.unterschriften ?? []).map((s) => ({ ...s, kind: "unterschrift", id: s.stelleKey })),
    ...(form.handfelder ?? []).map((s) => ({ ...s, kind: "handfeld", id: s.key })),
  ];
  ok(Array.isArray(form.unterschriften) && form.unterschriften.length > 0, `${K}: unterschriften fehlen`);
  ok(Array.isArray(form.handfelder), `${K}: handfelder fehlt`);
  const ids = stellen.filter((s) => s.kind === "unterschrift").map((s) => s.id);
  ok(new Set(ids).size === ids.length, `${K}: stelleKey doppelt vergeben`);
  const keys = stellen.filter((s) => s.kind === "handfeld").map((s) => s.id);
  ok(new Set(keys).size === keys.length, `${K}: handfeld-key doppelt vergeben`);

  const pgCache = new Map();
  const messSeite = (s) => { if (!pgCache.has(s)) pgCache.set(s, graustufen(pdfPfad, s)); return pgCache.get(s); };

  for (const st of stellen) {
    const c = `${K}.${st.kind}.${st.id}`;
    ok(Number.isInteger(st.seite) && st.seite >= 1 && st.seite <= seiten.length, `${c}: seite ungültig`);
    if (!(st.seite >= 1 && st.seite <= seiten.length)) continue;
    const { width: bw, height: bh } = seitenMasse[st.seite - 1];
    const zahlen = [st.x, st.y, st.breite, st.hoehe].every(Number.isFinite);
    ok(zahlen && st.breite > 0 && st.hoehe > 0, `${c}: x, y, breite, hoehe müssen Zahlen sein`);
    if (!zahlen) continue;
    ok(st.x >= 0 && st.y >= 0 && st.x + st.breite <= bw + 0.01 && st.y + st.hoehe <= bh + 0.01, `${c}: Kasten liegt nicht auf der Seite`);
    if (st.kind === "unterschrift") {
      ok(WER.includes(st.wer), `${c}: wer „${st.wer}“ ungültig`);
      if (st.wennMinderjaehrig !== undefined) ok(WER.includes(st.wennMinderjaehrig), `${c}: wennMinderjaehrig „${st.wennMinderjaehrig}“ ungültig`);
      if (st.bedingung !== undefined) pruefeBedingung(`${c}.bedingung`, st.bedingung);
      ok(typeof st.beschriftung === "string" && st.beschriftung.length > 3, `${c}: beschriftung fehlt`);
    } else {
      ok(["text", "kreuz"].includes(st.typ), `${c}: typ „${st.typ}“ ungültig`);
      ok(["kasten", "grundlinie"].includes(st.art), `${c}: art „${st.art}“ ungültig`);
      ok(typeof st.bedeutung === "string" && st.bedeutung.length > 3, `${c}: bedeutung fehlt`);
    }
    const grundlinie = st.kind === "handfeld" && st.art === "grundlinie";
    const kasten = grundlinie ? { x0: st.x, y0: st.y - 3, x1: st.x + st.breite, y1: st.y - 3 + st.hoehe } : { x0: st.x, y0: st.y, x1: st.x + st.breite, y1: st.y + st.hoehe };

    // zugehöriges Formularfeld
    if (st.feld !== undefined) {
      const jf = jsonFelder[st.feld];
      if (ok(jf, `${c}: feld „${st.feld}“ gibt es im JSON nicht`)) {
        ok(jf.seite === st.seite, `${c}: Seite ≠ Seite des Feldes ${st.feld}`);
        ok(fast(jf.rect[0], st.x) && fast(jf.rect[2], st.breite), `${c}: x/breite weichen vom Feld ${st.feld} ab`);
        if (st.kind === "handfeld") ok(fast(jf.rect[1], st.y) && fast(jf.rect[3], st.hoehe), `${c}: y/hoehe weichen vom Feld ${st.feld} ab`);
        else ok(st.y <= jf.rect[1] + 0.02 && st.y + st.hoehe >= jf.rect[1] + jf.rect[3] - 0.02, `${c}: die Unterschriftsfläche deckt das Feld ${st.feld} nicht ab`);
        if (st.kind === "unterschrift") ok(jf.fuellt === "familie_hand", `${c}: das Feld ${st.feld} (Unterschriftsfläche) müsste fuellt=familie_hand haben`);
        else ok(jf.fuellt === "familie_hand" || (jf.fuellt === "assistent" && jf.leerWennFehlt === true), `${c}: das Feld ${st.feld} müsste fuellt=familie_hand (oder assistent mit leerWennFehlt) haben`);
      }
    }
    for (const b of st.beleg ?? []) pruefeBeleg(c, b, textSeiten[st.seite - 1], kasten);
    if (st.feld === undefined && st.gedruckt !== false && st.kind === "unterschrift") ok((st.beleg ?? []).length > 0, `${c}: ohne feld braucht die Stelle mindestens einen beleg`);

    // Linie
    if (st.linie) {
      const L = st.linie;
      ok([L.x0, L.x1, L.y].every(Number.isFinite) && L.x1 > L.x0, `${c}: linie ungültig`);
      const pg = messSeite(st.seite);
      const von = Math.max(L.x0, st.x), bis = Math.min(L.x1, st.x + st.breite);
      const [a, b] = bis - von > 10 ? [von, bis] : [L.x0, L.x1];
      if (st.gedruckt === false) {
        // Linie fehlt im Vordruck: dort und darunter (Beschriftung) darf nichts gedruckt sein
        const anteil = tintenAnteil(pg, st.x, L.y - 13, st.breite, st.y + st.hoehe - (L.y - 13));
        ok(anteil <= 0.0005, `${c}: die vorgesehene Fläche ist nicht frei (Tinte ${(anteil * 100).toFixed(3)} %)`);
        ok(findeLinie(pg, L.y, a, b) === null, `${c}: gedruckt=false, aber dort ist eine Linie`);
      } else {
        const mitte = findeLinie(pg, L.y, a, b);
        if (ok(mitte !== null, `${c}: keine gedruckte Linie bei y ${L.y} zwischen x ${r2(a)} und ${r2(b)} gefunden`)) {
          ok(Math.abs(mitte - L.y) <= 1.0, `${c}: gedruckte Linie liegt bei y ${r2(mitte)}, im JSON ${L.y}`);
          ok(Math.abs(st.y - mitte) <= (grundlinie ? 4 : 3) || (st.kind === "handfeld" && st.feld !== undefined), `${c}: Unterkante y ${st.y} weit entfernt von der Linie y ${r2(mitte)}`);
        }
      }
      // Fläche über der Linie frei (nur Unterschriften)
      if (st.kind === "unterschrift" && st.gedruckt !== false) {
        const unten = Math.max(st.y, L.y) + 1.6;
        const anteil = tintenAnteil(pg, st.x, unten, st.breite, st.y + st.hoehe - unten);
        ok(anteil <= 0.0005, `${c}: die Fläche über der Linie ist nicht frei (Tinte ${(anteil * 100).toFixed(3)} %)`);
      }
    } else ok(st.typ === "kreuz", `${c}: linie fehlt`);
  }

  // Aufnahmeantrag: Werte müssen mit der bestehenden Vermessung übereinstimmen
  if (key === "aufnahmeantrag") {
    const V = JSON.parse(fs.readFileSync(AUFNAHME_FELDER, "utf8")).felder;
    ok(form.quelle_sha256 === JSON.parse(fs.readFileSync(AUFNAHME_FELDER, "utf8")).quelle.sha256, `${K}: quelle_sha256 weicht von data/aufnahmeantrag-felder.json ab`);
    for (const st of stellen) {
      if (!st.bezug) continue;
      const kk = st.bezug.split("#")[1];
      const v = V[kk];
      if (!ok(v, `${K}.${st.id}: bezug ${st.bezug} gibt es nicht`)) continue;
      ok(st.seite === v.seite && fast(st.x, v.x) && fast(st.y, v.y) && fast(st.breite, v.breite), `${K}.${st.id}: x/y/breite/seite weichen von ${kk} der Vermessung ab`);
      if (v.hoehe !== undefined && st.kind === "unterschrift") ok(fast(st.hoehe, v.hoehe), `${K}.${st.id}: hoehe weicht von ${kk} ab`);
      if (v.linie) ok(st.linie && fast(st.linie.x0, v.linie.x0) && fast(st.linie.x1, v.linie.x1) && fast(st.linie.y, v.linie.y), `${K}.${st.id}: linie weicht von ${kk} ab`);
    }
    for (const kk of ["s2.unterschrift", "s3.unterschrift", "s4.unterschrift"]) ok(form.unterschriften.some((s) => s.stelleKey === kk), `${K}: Stelle ${kk} fehlt`);
    for (const kk of ["s2.ort_datum", "s3.ort_datum", "s4.ort_datum"]) ok(form.handfelder.some((s) => s.key === kk), `${K}: Handfeld ${kk} fehlt`);
    ok(form.unterschriften.some((s) => s.stelleKey === "s2.unterschrift_sorgeberechtigte" && s.seite === 2 && s.gedruckt === false), `${K}: Stelle s2.unterschrift_sorgeberechtigte fehlt`);
  }
  for (const st of stellen) {
    tabelle.push({ form: key, nr: null, name: `${st.kind === "unterschrift" ? "Unterschrift" : "Handfeld"} ${st.id}`, typ: st.kind === "unterschrift" ? "stelle" : (st.typ ?? "stelle"), seite: st.seite,
      rect: [st.x, st.y, st.breite, st.hoehe], fuellt: st.kind === "unterschrift" ? `wer=${st.wer}` : "familie_hand", quelle: st.feld ? `Feld ${st.feld}` : (st.gedruckt === false ? "ergänzt (nicht im Vordruck)" : "gedruckte Linie"),
      bedingung: st.bedingung, bedeutung: st.beschriftung ?? st.bedeutung, beleg: st.beleg ?? [], hinweis: st.hinweis });
  }

  // ---- 4. Sichtprobe: Felder --------------------------------------------------------------
  if (pdfFelder.length) {
    const d = await PDFDocument.load(bytes, { updateMetadata: false });
    const helv = await d.embedFont(StandardFonts.Helvetica);
    const fm = d.getForm();
    let n = 0;
    for (const f of fm.getFields()) {
      n++;
      const name = f.getName();
      const info = pdfFelder.find((x) => x.name === name);
      const seite = d.getPage(info.seite - 1);
      if (info.typ === "text") {
        let wert = name;
        const gekuerzt = info.maxLaenge !== undefined && wert.length > info.maxLaenge;
        if (gekuerzt) wert = String(n).slice(0, info.maxLaenge);
        f.setText(wert);
        const groesse = Math.max(4, Math.min(9, Math.floor(Math.min((info.rect[2] - 3) / helv.widthOfTextAtSize(wert, 1), (info.rect[3] - 2) * 0.72) * 2) / 2));
        try { f.setFontSize(groesse); } catch { f.acroField.setDefaultAppearance(`/Helv ${groesse} Tf 0 g`); } // Text1 bis Text6 des Antrags haben kein /DA
        if (gekuerzt) seite.drawText(name, { x: info.rect[0], y: info.rect[1] + info.rect[3] + 1, size: 5.5, font: helv, color: BLAU });
      } else {
        f.check();
        // Kennzeichnung links vom Kästchen (Feldname, bei langen Namen die laufende Nummer aus zuordnung.txt)
        const marke = name.length <= 4 ? name : String(n);
        seite.drawText(marke, { x: info.rect[0] - helv.widthOfTextAtSize(marke, 6) - 1.5, y: info.rect[1] + info.rect[3] / 2 - 2, size: 6, font: helv, color: BLAU });
      }
    }
    fm.updateFieldAppearances(helv);
    const ausgabe = path.join(AUSGABE, `${key}-felder.pdf`);
    fs.writeFileSync(ausgabe, await d.save({ updateFieldAppearances: false }));
    erzeugt.push(ausgabe, ...rendereSeiten(ausgabe, `${key}-felder`, pdfFelder.map((x) => x.seite)));
  }

  // ---- 5. Sichtprobe: Stellen ---------------------------------------------------------------
  {
    const d = await PDFDocument.load(bytes, { updateMetadata: false });
    const helv = await d.embedFont(StandardFonts.Helvetica);
    for (const st of stellen) {
      const seite = d.getPage(st.seite - 1);
      const hand = st.kind === "handfeld";
      const farbe = hand ? BLAU_HELL : BLAU;
      const grundlinie = hand && st.art === "grundlinie";
      const yU = grundlinie ? st.y - 3 : st.y;
      seite.drawRectangle({ x: st.x, y: yU, width: st.breite, height: st.hoehe, borderColor: farbe, borderWidth: hand ? 0.6 : 0.9, opacity: 0, borderOpacity: 1 });
      const text = hand ? `Hand: ${st.id}` : `${st.id} · ${st.wer}${st.wennMinderjaehrig ? "/" + st.wennMinderjaehrig : ""}`;
      if (st.typ === "kreuz") {
        const marke = st.id.slice(0, 8);
        seite.drawText(marke, { x: st.x - helv.widthOfTextAtSize(marke, 5.5) - 1.5, y: yU + st.hoehe / 2 - 2, size: 5.5, font: helv, color: farbe });
      } else seite.drawText(text, { x: st.x + 1.5, y: yU + st.hoehe - 6.2, size: 5.5, font: helv, color: farbe });
      if (st.linie) {
        const { x0, x1, y } = st.linie;
        if (st.gedruckt === false) seite.drawLine({ start: { x: x0, y }, end: { x: x1, y }, thickness: 0.6, color: BLAU, dashArray: [3, 2] });
        seite.drawLine({ start: { x: x0, y: y - 4 }, end: { x: x0, y: y + 4 }, thickness: 0.7, color: farbe });
        seite.drawLine({ start: { x: x1, y: y - 4 }, end: { x: x1, y: y + 4 }, thickness: 0.7, color: farbe });
        if (st.gedruckt === false) seite.drawText(st.beschriftung, { x: x0 + 1, y: y - 8.5, size: 6, font: helv, color: BLAU });
      }
    }
    const ausgabe = path.join(AUSGABE, `${key}-stellen.pdf`);
    fs.writeFileSync(ausgabe, await d.save());
    erzeugt.push(ausgabe, ...rendereSeiten(ausgabe, `${key}-stellen`, stellen.map((x) => x.seite)));
  }

  // ---- 6. Sichtprobe: Unicode ---------------------------------------------------------------
  if (pdfFelder.length) {
    const d = await PDFDocument.load(bytes, { updateMetadata: false });
    d.registerFontkit(fontkit);
    const font = await d.embedFont(schrift, { subset: true });
    const fm = d.getForm();
    const gefuellt = [];
    for (const [name, jf] of Object.entries(jsonFelder)) {
      const q = jf.quelle ?? "";
      const istName = jf.typ === "text" && jf.fuellt === "assistent" && /(^|[ (])a\.(nachname|vorname|anschrift\.ort|anschrift\.strasse|alterVerein\.name)($|[ |])/.test(q);
      if (!istName) continue;
      const f = fm.getTextField(name);
      const max = f.getMaxLength();
      if (max !== undefined && max < UNICODE_TEXT.length) continue;
      f.setText(UNICODE_TEXT);
      gefuellt.push(name);
    }
    ok(gefuellt.length > 0, `${K}: kein Feld für den Unicode-Lauf gefunden`);
    let fehler = null;
    try { fm.updateFieldAppearances(font); } catch (e) { fehler = e.message; }
    ok(!fehler, `${K}: Unicode-Lauf schlägt fehl: ${fehler}`);
    if (!fehler) {
      const ausgabe = path.join(AUSGABE, `${key}-unicode.pdf`);
      const gespeichert = await d.save({ updateFieldAppearances: false });
      fs.writeFileSync(ausgabe, gespeichert);
      // Wert nach dem Speichern wieder lesen
      const zurueck = await PDFDocument.load(gespeichert, { updateMetadata: false });
      for (const n of gefuellt) ok(zurueck.getForm().getTextField(n).getText() === UNICODE_TEXT, `${K}.${n}: Unicode-Wert geht beim Speichern verloren`);
      erzeugt.push(ausgabe, ...rendereSeiten(ausgabe, `${key}-unicode`, gefuellt.map((n) => jsonFelder[n].seite)));
      console.log(`  Unicode-Lauf: ${gefuellt.length} Felder mit „${UNICODE_TEXT}“ gefüllt (${gefuellt.join(", ")})`);
    }
  }

  // ---- 7. Beispiellauf Abmelde-Vordruck ------------------------------------------------------
  if (key === "abmeldung") for (const bsp of ABMELDUNG_BEISPIELE) await abmeldungBeispiel(K, form, bytes, bsp);
}

// ---------------------------------------------------------------------------------------------
// Ausgabe: Tabelle, Dateien, Ergebnis
// ---------------------------------------------------------------------------------------------
const zeilenText = [];
for (const key of FORMULARE) {
  const zeilen = tabelle.filter((z) => z.form === key);
  if (!zeilen.length) continue;
  zeilenText.push("", `=== ${key} – ${daten.formulare[key].titel}`, `    Datei ${daten.formulare[key].datei}`, `    SHA-256 ${daten.formulare[key].sha256}`);
  for (const z of zeilen) {
    zeilenText.push(
      `${z.nr !== null ? String(z.nr).padStart(2) : " –"} | ${z.name} | ${z.typ} | S${z.seite} | rect ${JSON.stringify(z.rect)} | ${z.fuellt} | ${z.quelle === null ? "–" : z.quelle}${z.bedingung ? "  [nur wenn " + z.bedingung + "]" : ""}${z.leerWennFehlt ? "  [leer, wenn der Wert fehlt]" : ""}`,
      `      Bedeutung: ${z.bedeutung}`,
      ...z.beleg.map((b) => `      Beleg: ${b.lage} „${b.text}“ bei ${JSON.stringify(b.box)}`),
      ...(z.hinweis ? [`      Hinweis: ${z.hinweis}`] : []),
    );
  }
}
fs.writeFileSync(path.join(AUSGABE, "zuordnung.txt"), zeilenText.join("\n") + "\n");

console.log("\nZuordnung Feld > Bedeutung > Beleg (Kurzfassung; vollständig in zuordnung.txt):");
for (const key of FORMULARE) {
  const zeilen = tabelle.filter((z) => z.form === key && z.nr !== null);
  if (!zeilen.length) continue;
  console.log(`\n${key}`);
  console.log("  Nr | Feld                              | Typ      | S | füllt        | Quelle                              | Beschriftung (Lage)");
  for (const z of zeilen) {
    const b = z.beleg[0];
    console.log(`  ${String(z.nr).padStart(2)} | ${kurz(z.name, 33).padEnd(33)} | ${z.typ.padEnd(8)} | ${z.seite} | ${z.fuellt.padEnd(12)} | ${kurz(z.quelle ?? "–", 35).padEnd(35)} | ${b ? `${kurz(b.text, 38)} (${b.lage})` : "–"}`);
  }
}
console.log("\nStellen (Unterschriften und Handfelder):");
for (const z of tabelle.filter((t) => t.nr === null)) {
  console.log(`  ${z.form.padEnd(24)} S${z.seite} ${kurz(z.name, 46).padEnd(46)} ${JSON.stringify(z.rect)}  ${z.fuellt}`);
}

console.log("\nDateien (shasum -a 256):");
for (const l of dateiUebersicht) console.log("  " + l);
console.log(`\nSichtproben in ${path.relative(REPO, AUSGABE)}/ (${erzeugt.length} Dateien: PDF und PNG mit ${BILD_DPI} dpi, dazu zuordnung.txt)`);
console.log(`Originale gefunden: ${originaleGefunden} von ${FORMULARE.length}${originaleGefunden < FORMULARE.length ? " (fehlende: Ordner mit --originale angeben oder in tools/cache/anmeldung-test/originale/ ablegen)" : ""}`);
console.log(`Prüfungen: ${pruefungen}`);
if (abweichungen.length) {
  console.log(`\nAbweichungen: ${abweichungen.length}`);
  for (const a of abweichungen) console.log("  - " + a);
  process.exitCode = 1;
} else {
  console.log("Abweichungen: 0");
}
