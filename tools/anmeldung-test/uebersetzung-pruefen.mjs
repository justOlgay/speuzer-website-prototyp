#!/usr/bin/env node
// Prüft die Übersetzungen des Anmelde-Assistenten (Arbeitspaket AP-5):
// assets/js/anmeldung/texte/{en,tr,ar}-oberflaeche.js und {en,tr,ar}-regeln.js
// gegen die deutschen Quellen de-oberflaeche.js und de-regeln.js.
//
// Geprüft wird je Sprache und Datei:
//   1. Schlüssel: nichts fehlt, nichts ist überzählig (ohne "demo" und "sprachen").
//   2. Platzhalter: jeder Platzhalter {…} des deutschen Textes steht genau so im
//      übersetzten Text (gleiche Anzahl, keine fremden, keine losen Klammern).
//   3. Aufbau: gleiche Zahl von Zeilenumbrüchen wie im Deutschen (jede Zeile ist ein
//      Absatz auf der Seite), kein leerer Text, gleiche Satzzeichen am Ende (? und :).
//   4. Kein deutscher Text blieb stehen: nichts ist mit dem deutschen Text identisch
//      (Ausnahmen unten, mit Grund), kein deutsches Füllwort außerhalb erlaubter
//      deutscher Dokumentnamen, im Arabischen steht arabische Schrift.
//   5. Keine "§", keine westlichen Abkürzungen (z. B., etc., usw.), keine anderen
//      Ziffern als 0-9 (auch keine arabisch-indischen).
//   6. Deutsche Dokumentnamen in Klammern (Akzeptanzkriterium 4): Kommt im deutschen
//      Text ein Kernbegriff vor (Geburtsurkunde, Meldebescheinigung, Attest,
//      Einschreiben, Vollmacht, Spielerpass, Lastschrift, Bürgeramt, Jobcenter,
//      Bildung und Teilhabe, Vormund, Jugendamt, Aufnahmeantrag …), muss der deutsche
//      Name in der Übersetzung in Klammern stehen. Bei den Unterlagen U01-U40 gilt das
//      für name oder kurz (und für den ganzen Text der Unterlage).
//   6b. Pflichtnamen aus dem Arbeitspaket (Reisepass, Personalausweis, Spielberechtigung …)
//      stehen in jeder Sprache mindestens einmal in Klammern (Liste PFLICHTNAMEN).
//   6d. Ein Papier heißt überall gleich: Namen aus formulare, unterlagen.<U>.name und unterschriften, die im
//      Deutschen gleich lauten, haben in jeder Sprache dieselbe Übersetzung (SCHNITTSTELLEN Abschnitt 9).
//   6e. Arabisch: arabisches Komma und Fragezeichen statt "," und "?"; liste.trenner ist ", " (en, tr)
//      bzw. das arabische Komma mit Leerzeichen (ar).
//   7. Einheitliche Begriffe: Die Begriffe aus der Begriffsliste stehen überall gleich
//      (Tabelle BEGRIFFE unten, je Sprache).
//   8. Begriffsliste: mindestens 40 Begriffe als Kommentar oben in <code>-oberflaeche.js.
//   9. Meldet die längsten Sätze je Sprache (Wörter; nur zur Information).
//
// Aufruf: node tools/anmeldung-test/uebersetzung-pruefen.mjs [--sprache=en] [--ausfuehrlich]
// Exit 0 nur bei 0 Fehlern.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
// ANM_TEXTE: anderer Ordner mit den Sprachdateien (nur für Negativtests mit einer Kopie)
const TEXTE = process.env.ANM_TEXTE ? path.resolve(process.env.ANM_TEXTE) : path.join(ROOT, "assets", "js", "anmeldung", "texte");
export const SPRACHEN = ["en", "tr", "ar"];
const DATEIEN = ["oberflaeche", "regeln"];

// Wurzelschlüssel, die nicht übersetzt werden (Vorführung, Sprachliste).
const NICHT_UEBERSETZT = new Set(["demo", "sprachen"]);
// Daten statt Text (Adressen, Telefonnummern, Kennungen): müssen wie im Deutschen sein.
const DATENPFAD = /^hilfe\.kontakte\./;
// Trenner der Aufzählungen (Assistent: k.liste, Text "liste.trenner"): Komma und Leerzeichen; im Arabischen
// das arabische Komma (U+060C) mit Leerzeichen. Das Leerzeichen am Ende ist gewollt.
const TRENNER = { en: ", ", tr: ", ", ar: "\u060C " };

// Unicode-Isolate und Richtungszeichen (im Arabischen um deutsche Namen und Rufnummern).
const STEUER = /[\u2060\u2066\u2067\u2068\u2069\u200E\u200F\u202A-\u202E]/g;
const ohneSteuer = (s) => String(s).replace(STEUER, "").replace(/\u00A0/g, " "); // geschützte Leerzeichen zählen als Leerzeichen

// ---------------------------------------------------------------------------
// Ausnahmen (mit Grund)
// ---------------------------------------------------------------------------

// Texte, die in der Übersetzung wie im Deutschen aussehen dürfen: Eigennamen,
// internationale Kürzel und Wörter, die in der Zielsprache gleich geschrieben werden.
const GLEICH_ERLAUBT = {
  // Kürzel der Zahlungswelt: in allen Sprachen gleich
  "zahlung.iban.iban": "IBAN ist ein internationales Kürzel",
  "zahlung.iban.bic": "BIC ist ein internationales Kürzel",
  "pruefen.zeilen.iban": "IBAN ist ein internationales Kürzel",
  // Wörter, die im Englischen gleich geschrieben werden
  "abschnitte.person": { en: "Wort ist im Englischen gleich" },
  "pruefen.bereiche.person": { en: "Wort ist im Englischen gleich" },
  "notfall.kontakt.name": { en: "Wort ist im Englischen gleich" },
  "pruefen.zeilen.name": { en: "Wort ist im Englischen gleich" },
  // Türkisch schreibt Telefon wie das Deutsche
  "pruefen.zeilen.telefon": { tr: "Wort ist im Türkischen gleich" },
};

// Deutsche Wendungen, die in Klammern stehen dürfen (deutsche Dokumentnamen und Namen).
// Alles andere Deutsche in Klammern gilt als Fehler, wenn es Füllwörter enthält.
const DEUTSCHE_WENDUNGEN = [
  "Hessischer Fußball-Verband", "Bildung und Teilhabe", "Antrag auf Spielerlaubnis", "Liste der Familienmitglieder",
  "Notfall- und Gesundheitsbogen", "Abmeldung bei Verein", "Antrag auf Erteilung einer Spielberechtigung",
  "Einwurf-Einschreiben", "Einverständnis für Spiele bei den Herren",
];

// Deutsche Füllwörter (nur solche, die es in en, tr, ar nicht gibt).
const DE_FUELLWOERTER = /(^|[^\p{L}’'])(der|die|das|und|nicht|ist|sind|eine|einen|einem|einer|mit|für|wird|werden|bitte|oder|dem|den|des|zum|zur|vom|beim|kein|keine|nur|auch|wenn|dann|sich|haben|kann|können|müssen|muss|Sie|Ihr|Ihre|Ihren|Ihrem)(?=$|[^\p{L}’'])/u;

// Abkürzungen, die in Texten für Familien nicht vorkommen sollen (auch in den Zielsprachen).
const ABKUERZUNGEN = [
  [/§/, "Paragrafenzeichen"],
  [/\b(e\.g|i\.e|etc|approx|vs|cf|incl)\.|\bno\.\s?\d/i, "englische Abkürzung"],
  [/\bz\.\s?B\./i, "z. B."],
  [/\b(ggf|bzw|usw|inkl|evtl|vgl|ca)\./i, "deutsche Abkürzung"],
  [/\bNr\./, "Nr."],
  [/\b(vb|vs|örn|yak|bkz|sf)\./i, "türkische Abkürzung"],
  [/إلخ|الخ\b/, "arabische Abkürzung (usw.)"],
];

// ---------------------------------------------------------------------------
// Begriffe: einheitliche Übersetzung (Tabelle je Sprache). Kommt im deutschen Text der
// Begriff vor (de), muss die Übersetzung die Entsprechung (Muster der Sprache) enthalten.
// Die Muster lassen Beugungsformen zu. Ausnahmen mit Grund stehen in BEGRIFF_AUSNAHMEN.
// ---------------------------------------------------------------------------

export const BEGRIFFE = [
  // { name, de, en, tr, ar }
  { name: "Wartezeit", de: /Wartezeit|Wartefrist/, en: /waiting period/i, tr: /bekleme sür/i, ar: /فتر(?:ة|ات)\s+(?:ال)?انتظار/ },
  { name: "Pflichtspiel", de: /Pflichtspiel/, en: /league or cup match/i, tr: /lig veya kupa maç/i, ar: /(?:مباراة|مباريات) (?:في )?(?:ال)?دوري/ },
  { name: "Freundschaftsspiel", de: /Freundschaftsspiel/, en: /friendly match/i, tr: /hazırlık maç/i, ar: /مباراة ودية|مباريات ودية|المباريات الودية|المباراة الودية/ },
  { name: "Freigabe", de: /Freigabe/, en: /releas/i, tr: /serbest bırak/i, ar: /إخلاء الطرف/ },
  { name: "Sperre", de: /Sperre/, en: /suspension/i, tr: /oynama yasağı/i, ar: /إيقاف|الإيقاف/ },
  { name: "Spielerpass", de: /Spielerpass/, en: /player pass/i, tr: /oyuncu lisans/i, ar: /بطاقة اللاعب|بطاقة لاعب/ },
  { name: "Spielrecht", de: /Spielrecht|Spielberechtigung|Spielerlaubnis/, en: /permission to play/i, tr: /oynama izni/i, ar: /إذن اللعب/ },
  { name: "Einschreiben", de: /Einschreiben/, en: /registered letter/i, tr: /taahhütlü mektu[pb]/i, ar: /رسالة مسجّلة|رسالة مسجلة|الرسالة المسجّلة|الرسالة المسجلة/ },
  { name: "Vollmacht", de: /Vollmacht/, en: /authorisation/i, tr: /vekâletname|vekaletname/i, ar: /توكيل/ },
  { name: "Lastschrift", de: /Lastschrift/, en: /direct debit/i, tr: /otomatik çekim/i, ar: /الخصم المباشر|لخصم المباشر/ },
  { name: "Kontoinhaber", de: /Kontoinhaber/, en: /account holder/i, tr: /hesap sahib/i, ar: /صاحب الحساب|صاحبة الحساب/ },
  { name: "Sorgerecht", de: /Sorgerecht|Sorgeberechtigte/, en: /custody/i, tr: /velayet/i, ar: /حق الحضانة|الحضانة/ },
  { name: "Vormund", de: /Vormund/, en: /guardian/i, tr: /vasi/i, ar: /الوصي|وصي|الوصاية/ },
  { name: "Attest", de: /Attest/, en: /medical certificate/i, tr: /sağlık rapor/i, ar: /شهاد(?:ة|ات)\s+(?:ال)?طبية/ },
  { name: "Meldebescheinigung", de: /Meldebescheinigung/, en: /residence certificate/i, tr: /ikametg[âa]h belgesi/i, ar: /شهادة تسجيل السكن|شهادة السكن/ },
  { name: "Geburtsurkunde", de: /Geburtsurkunde/, en: /birth certificate/i, tr: /doğum belgesi/i, ar: /شهادة الميلاد/ },
  { name: "Aufnahmegebühr", de: /Aufnahmegebühr/, en: /joining fee/i, tr: /kayıt ücret/i, ar: /رسوم (?:ال)?قبول/ },
  { name: "Aufnahmeantrag", de: /Aufnahmeantrag/, en: /membership application/i, tr: /üyelik başvuru/i, ar: /طلب الانضمام/ },
  { name: "passives Mitglied", de: /passive[sn]? Mitglied/, en: /passive member/i, tr: /pasif üye/i, ar: /عضو داعم|عضوًا داعمًا|عضوا داعما/ },
  { name: "Kündigung", de: /Kündigung|kündigen|kündigt|Kündigen/, en: /cancel/i, tr: /üyeli(?:kten|ğ\w*)(?:\s+\S+)?\s+çık/i, ar: /إنهاء العضوية|تنهي العضوية|أنهي العضوية|تنهوا العضوية|تنهون العضوية/ },
  { name: "Abmeldung", de: /Abmeldung|abmelden|abgemeldet|[Mm]eld\w+ [^.]*\bab\b/, en: /deregist/i, tr: /kay(?:ıt|d\S*)(?:\s+\S+){0,6}?\s+sil/i, ar: /إلغاء (?:ال)?تسجيل|(?:تلغي|ألغ\S*|يلغي|تلغون)\s+(?:\S+\s+){0,2}(?:ال)?تسجيل/ },
  { name: "Jugendleitung", de: /Jugendleitung/, en: /youth department/i, tr: /gençlik birimi/i, ar: /إدارة الشباب/ },
  { name: "Geschäftsstelle", de: /Geschäftsstelle/, en: /club office/i, tr: /kulüp ofisi/i, ar: /مكتب النادي/ },
  { name: "Karnevalabteilung", de: /Karnevalabteilung/, en: /carnival department/i, tr: /karnaval bölümü/i, ar: /قسم الكرنفال/ },
  { name: "Beitragsgruppe", de: /Beitragsgruppe/, en: /fee group/i, tr: /aidat grubu/i, ar: /فئة الاشتراك|فئة الرسوم/ },
  { name: "Gesundheitsbogen", de: /Gesundheitsbogen/, en: /health form/i, tr: /sağlık formu/i, ar: /استمارة صحية|الاستمارة الصحية|استمارة الطوارئ والصحة/ },
  { name: "Staatsangehörigkeit", de: /Staatsangehörigkeit/, en: /nationalit/i, tr: /vatandaşl[ıi][kğ]/i, ar: /جنسي/ },
  { name: "Datei", de: /\bDatei\b|Dateien/, en: /\bfiles?\b/i, tr: /dosya/i, ar: /ملف/ },
  { name: "Foto", de: /\bFotos?\b/, en: /photo/i, tr: /fotoğraf/i, ar: /صورة|صور|صوّر/ },
  { name: "Unterschrift", de: /Unterschrift|unterschreib/, en: /sign/i, tr: /[İi]mza/, ar: /توقيع|وقّع|توقّع|أوقّع|وقع|توقع/ },
  { name: "Mannschaft", de: /Mannschaft/, en: /team/i, tr: /takım/i, ar: /فريق|الفرق|فرق/ },
  { name: "Verband", de: /Verband/, en: /association/i, tr: /federasyon/i, ar: /الاتحاد|اتحاد/ },
  { name: "Verein", de: /Verein(?!barung)/, en: /club/i, tr: /kulüp|kulüb/i, ar: /النادي|نادي|نادٍ|الأندية|أندية/ },
  { name: "Training", de: /Training|trainier/, en: /train/i, tr: /antrenman/i, ar: /التدريب|تدريب|يتدرب|التدرب|تتدرب|تدربت|تدرّب/ },
  { name: "Mitgliedschaft", de: /Mitgliedschaft/, en: /membership/i, tr: /üyeli/i, ar: /عضوي/ },
  { name: "Erlaubnis", de: /Erlaubnis/, en: /permission/i, tr: /izi?n/i, ar: /إذن|الإذن/ },
  { name: "Einverständnis", de: /Einverständnis|Einwilligung|einverstanden/, en: /consent|agree/i, tr: /onay|izi?n|razı|uygun/i, ar: /موافقة|يوافق|موافق|توافق|ووافق/ },
  { name: "Notfall", de: /Notfall/, en: /emergency/i, tr: /acil/i, ar: /الطوارئ|طارئ/ },
  { name: "Spielausschuss", de: /Spielausschuss/, en: /match committee/i, tr: /maç komitesi/i, ar: /لجنة المباريات/ },
  { name: "Satzung", de: /Satzung/, en: /statutes/i, tr: /tüzü[kğ]/i, ar: /النظام الأساسي/ },
];

// Ausnahmen: Pfad (oder Muster) -> Begriffsname -> Grund
export const BEGRIFF_AUSNAHMEN = {
  // Die Zuordnung deutscher Wörter zu einem Begriff ist nicht überall eins zu eins;
  // Ausnahmen werden hier mit Grund eingetragen.
};

// ---------------------------------------------------------------------------
// Deutsche Dokumentnamen in Klammern
// ---------------------------------------------------------------------------

// Kernbegriffe: Kommen sie im deutschen Text vor, steht der deutsche Name in der
// Übersetzung in Klammern (in allen Texten von Oberfläche und Regeln).
export const KERNBEGRIFFE = [
  ["Geburtsurkunde", /Geburtsurkunde/],
  ["Meldebescheinigung", /Meldebescheinigung/],
  ["Attest", /Attest/],
  ["Einschreiben", /Einschreiben/],
  ["Vollmacht", /Vollmacht/],
  ["Spielerpass", /Spielerpass/],
  ["Lastschrift", /Lastschrift/],
  ["Bürgeramt", /Bürgeramt/],
  ["Jobcenter", /Jobcenter/],
  ["Sozialamt", /Sozialamt/],
  ["Bildung und Teilhabe", /Bildung und Teilhabe/],
  ["Vormund", /Vormund/],
  ["Jugendamt", /Jugendamt/],
  ["Aufnahmeantrag", /Aufnahmeantrag/],
  ["Aufenthaltstitel", /Aufenthaltstitel/],
  ["Spielberechtigung", /Spielberechtigung/],
  ["Kinderreisepass", /Kinderreisepass/],
  ["Satzung", /Satzung/],
  ["Hessischer Fußball-Verband", /Hessische[nrs]? Fußball-Verband/],
];

// Nur in der Oberfläche streng: "Spielrecht" (im Fließtext für Familien) trägt den deutschen Namen in Klammern.
// In den Regeltexten gilt "Spielrecht" für die Unterlagen (name/kurz) und als Pflichtname.
export const KERNBEGRIFFE_OBERFLAECHE = [["Spielrecht", /(^|[^a-zA-Z])Spielrecht/]];

// Bei den Unterlagen (name oder kurz) kommen weitere Namen dazu.
export const UNTERLAGEN_BEGRIFFE = [
  ...KERNBEGRIFFE,
  ["Freigabe", /Freigabe/],
  ["Kündigung", /Kündigung/],
  ["Abmeldung", /Abmeldung/],
  ["Datenschutz", /Datenschutz/],
  ["Notfall- und Gesundheitsbogen", /Notfall- und Gesundheitsbogen/],
  ["Sonderspielrecht", /Sonderspielrecht/],
  ["Spielrecht", /(^|[^a-z])Spielrecht/],
  ["Spielerlaubnis", /Spielerlaubnis/],
  ["Aufnahmegebühr", /Aufnahmegebühr/],
  ["Ausweis", /Ausweis/],
  ["Einwurf-Einschreiben", /Einwurf-Einschreiben/],
];

// Zusätzlich verlangte deutsche Namen einzelner Unterlagen (das Deutsche nennt sie
// allgemeiner, die Stelle kennt sie unter diesen Namen).
export const UNTERLAGEN_ZUSATZ = {
  U12: ["Reisepass", "Personalausweis", "Aufenthaltstitel"],
};

// Deutsche Dokument- und Stellennamen, die laut Arbeitspaket mindestens vorkommen müssen:
// Jeder dieser Namen steht in jeder Sprache an mindestens einer Stelle in Klammern hinter der
// Übersetzung (zusätzlich zur Regel für jeden einzelnen Text oben).
export const PFLICHTNAMEN = [
  "Geburtsurkunde", "Meldebescheinigung", "Attest", "Reisepass", "Personalausweis", "Aufenthaltstitel",
  "Einschreiben", "Einwurf-Einschreiben", "Vollmacht", "Spielerpass", "Spielrecht", "Lastschrift", "Kinderreisepass", "Satzung",
  "Bürgeramt", "Jobcenter", "Bildung und Teilhabe", "Vormund", "Jugendamt", "Aufnahmeantrag", "Hessischer Fußball-Verband",
];

// Eigennamen und Kürzel, die unverändert bleiben müssen, wenn sie im Deutschen stehen.
export const EIGENNAMEN = [
  { muster: /\b[A-G]-Jugend/g },
  { muster: /(?:den|der|die) Herren\b|Herren-Mannschaft/g, token: "Herren" },
  { muster: /Schnauzer/g },
  { muster: /FUSSBALL\.DE/g },
  { muster: /WhatsApp/g },
  { muster: /\bPDF\b/g },
  { muster: /\bIBAN\b/g },
  { muster: /\bBIC\b/g },
];

// ---------------------------------------------------------------------------
// Hilfen
// ---------------------------------------------------------------------------

async function lade(datei) {
  const url = pathToFileURL(datei).href + "?z=" + Date.now();
  return (await import(url)).default;
}

// Blätter (Texte) mit Pfad; Zahlen und Wahrheitswerte gelten auch als Blatt.
export function blaetter(wert, pfad = "", aus = new Map()) {
  if (typeof wert === "string") aus.set(pfad, wert);
  else if (Array.isArray(wert)) wert.forEach((x, i) => blaetter(x, pfad ? pfad + "." + i : String(i), aus));
  else if (wert && typeof wert === "object") {
    for (const [k, v] of Object.entries(wert)) {
      if (!pfad && NICHT_UEBERSETZT.has(k)) continue;
      blaetter(v, pfad ? pfad + "." + k : k, aus);
    }
  } else if (wert !== undefined && wert !== null) aus.set(pfad, wert);
  return aus;
}

const platzhalter = (s) => (String(s).match(/\{[A-Za-z0-9_]+\}/g) || []).sort();
const zeilen = (s) => String(s).split("\n").length - 1;

export function saetze(text) {
  return ohneSteuer(text)
    .split(/\n+/)
    .flatMap((zeile) => zeile.split(/(?<=[.!?:…؟])\s+/))
    .map((s) => s.trim())
    .filter(Boolean);
}

export function woerter(satz) {
  return satz
    .split(/\s+/)
    .map((w) => w.replace(/^[„“”"'’‘»«(\[]+|[„“”"'’‘»«).,;:!?…،؛؟\]]+$/g, ""))
    .filter((w) => /[\p{L}\p{N}]/u.test(w));
}

// Text ohne Klammerinhalt mit deutschen Wendungen und ohne Platzhalter.
function ohneDeutscheNamen(text) {
  let t = ohneSteuer(text).replace(/\{[A-Za-z0-9_]+\}/g, " ");
  for (const w of DEUTSCHE_WENDUNGEN) t = t.split(w).join(" ");
  // Inhalte in Klammern, die ein deutsches Dokumentwort enthalten, sind Absicht
  t = t.replace(/\(([^()]*)\)/g, (m, inhalt) => (/[A-ZÄÖÜ][a-zäöüß]+/.test(inhalt) && /[\p{Script=Latin}]/u.test(inhalt) ? " " : m));
  return t;
}

function inKlammern(text, begriff) {
  const t = ohneSteuer(text);
  return new RegExp("\\([^()]*" + begriff.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[^()]*\\)").test(t);
}

// Begriffsliste aus dem Kopfkommentar von <code>-oberflaeche.js
export function leseBegriffsliste(quelltext) {
  const m = /^\s*\/\*([\s\S]*?)\*\//.exec(quelltext);
  if (!m) return [];
  const teil = m[1].split(/Begriffsliste[^\n]*\n/)[1] || "";
  const liste = [];
  for (const zeile of teil.split("\n")) {
    const z = /^\s{2}([^=\n]+?) = (.+?)\s*$/.exec(zeile);
    if (z) liste.push([z[1], z[2]]);
  }
  return liste;
}

// ---------------------------------------------------------------------------
// Prüfung einer Sprache
// ---------------------------------------------------------------------------

export async function pruefeSprache(code, optionen = {}) {
  const fehler = [];
  const hinweise = [];
  const zaehler = { texte: 0, oberflaeche: 0, regeln: 0, unterlagen: 0, dokumentnamen: 0, pflichtnamen: 0, papiernamen: 0 };
  const alleSaetze = [];
  const de = {};
  const uebersetzt = {};
  const rohText = {};
  for (const d of DATEIEN) {
    de[d] = blaetter(await lade(path.join(TEXTE, "de-" + d + ".js")));
    const datei = path.join(TEXTE, code + "-" + d + ".js");
    if (!fs.existsSync(datei)) {
      fehler.push({ datei: code + "-" + d + ".js", pfad: "", art: "Datei fehlt" });
      continue;
    }
    rohText[d] = fs.readFileSync(datei, "utf8");
    try {
      uebersetzt[d] = blaetter(await lade(datei));
    } catch (e) {
      fehler.push({ datei: code + "-" + d + ".js", pfad: "", art: "Datei lässt sich nicht laden: " + e.message });
    }
  }
  const F = (datei, pfad, art, detail) => fehler.push({ datei: code + "-" + datei + ".js", pfad, art, detail });

  for (const d of DATEIEN) {
    const quelle = de[d];
    const ziel = uebersetzt[d];
    if (!ziel) continue;
    zaehler[d] = ziel.size;

    // 1. Schlüssel
    const fehlend = [...quelle.keys()].filter((p) => !ziel.has(p));
    const zuviel = [...ziel.keys()].filter((p) => !quelle.has(p));
    for (const p of fehlend) F(d, p, "Schlüssel fehlt");
    for (const p of zuviel) F(d, p, "Schlüssel überzählig");

    for (const [pfad, deText] of quelle) {
      if (!ziel.has(pfad)) continue;
      const text = ziel.get(pfad);
      if (typeof deText !== "string") continue;
      if (typeof text !== "string") {
        F(d, pfad, "kein Text", typeof text);
        continue;
      }
      zaehler.texte++;
      if (DATENPFAD.test(pfad)) {
        if (text !== deText) F(d, pfad, "Datenfeld weicht vom Deutschen ab", text);
        continue;
      }
      if (pfad === "liste.trenner") {
        if (text !== TRENNER[code]) F(d, pfad, "Trenner falsch (erwartet " + JSON.stringify(TRENNER[code]) + ")", JSON.stringify(text));
        continue;
      }
      const sichtbar = ohneSteuer(text);

      // 2. Platzhalter
      const pd = platzhalter(deText);
      const pz = platzhalter(sichtbar);
      if (pd.join(",") !== pz.join(",")) F(d, pfad, "Platzhalter weichen ab", "deutsch: " + (pd.join(" ") || "-") + " | Übersetzung: " + (pz.join(" ") || "-"));
      const rest = sichtbar.replace(/\{[A-Za-z0-9_]+\}/g, "");
      if (/[{}]/.test(rest)) F(d, pfad, "lose geschweifte Klammer", text);

      // 3. Aufbau
      if (zeilen(deText) !== zeilen(text)) F(d, pfad, "Zeilenumbrüche weichen ab", zeilen(deText) + " deutsch, " + zeilen(text) + " Übersetzung");
      if (!sichtbar.trim()) F(d, pfad, "leerer Text");
      if (sichtbar !== sichtbar.trim() || /\n\s|\s\n/.test(sichtbar)) F(d, pfad, "Leerraum am Rand oder vor/nach Zeilenumbruch", JSON.stringify(text));
      if (/\s{2,}/.test(sichtbar.replace(/\n/g, " "))) F(d, pfad, "doppelte Leerzeichen", JSON.stringify(text));
      const endeDe = deText.trim().slice(-1);
      const endeZ = sichtbar.trim().slice(-1);
      if (endeDe === "?" && !["?", "؟"].includes(endeZ)) F(d, pfad, "Fragezeichen fehlt am Ende", text);
      if (endeDe === ":" && endeZ !== ":") F(d, pfad, "Doppelpunkt fehlt am Ende", text);
      if (endeDe !== ":" && endeDe !== "?" && endeZ === ":" ) F(d, pfad, "Doppelpunkt am Ende, im Deutschen nicht", text);

      // 4. nicht deutsch geblieben
      const erlaubtGleich = GLEICH_ERLAUBT[pfad];
      const gleichOk = erlaubtGleich && (typeof erlaubtGleich === "string" || erlaubtGleich[code]);
      if (sichtbar.trim() === deText.trim() && !gleichOk) F(d, pfad, "identisch mit dem deutschen Text", text);
      if (!DATENPFAD.test(pfad)) {
        const geprueft = ohneDeutscheNamen(text);
        const m = DE_FUELLWOERTER.exec(geprueft);
        if (m && !(code === "tr" && /^(bir|ile)$/.test(m[2]))) F(d, pfad, "deutsches Füllwort \"" + m[2] + "\" im Text", text);
      }
      if (code === "ar" && !/[\u0600-\u06FF]/.test(sichtbar) && !gleichOk) F(d, pfad, "keine arabische Schrift", text);
      if (code === "ar") {
        // Deutsche Namen und Rufnummern im Arabischen gehören in Isolate, damit Klammern und Ziffern richtig stehen.
        const roh = /\(([^()]*[A-Za-zÄÖÜäöüß][^()]*)\)/g;
        const ohnePlatzhalter = (x) => x.replace(/\{[A-Za-z0-9_]+\}/g, "");
        let mm;
        while ((mm = roh.exec(text))) {
          if (!/\u2066/.test(mm[1]) && /[\u0600-\u06FF]/.test(text) && /[A-Za-zÄÖÜäöüß]{4,}/.test(ohnePlatzhalter(mm[1]))) {
            F(d, pfad, "deutscher Name in Klammern ohne Isolat (LRI/PDI)", mm[0]);
            break;
          }
        }
        if (/\b069 736868/.test(text.replace(/\u2066069 736868\u2069/g, "")) && /[\u0600-\u06FF]/.test(text)) F(d, pfad, "Rufnummer ohne Isolat (LRI/PDI)", text);
      }

      // 5. Zeichen
      for (const [muster, name] of ABKUERZUNGEN) if (muster.test(sichtbar)) F(d, pfad, "verboten: " + name, text);
      if (/[\u0660-\u0669\u06F0-\u06F9]/.test(sichtbar)) F(d, pfad, "keine westlichen Ziffern (0-9)", text);
      if (/[–—]\s*$/.test(sichtbar)) F(d, pfad, "Text endet mit Gedankenstrich", text);

      // 5b. Eigennamen bleiben
      for (const { muster, token } of EIGENNAMEN) {
        muster.lastIndex = 0;
        const treffer = deText.match(muster) || [];
        for (const t of new Set(treffer.map((x) => token || x))) if (!sichtbar.includes(t)) F(d, pfad, "Eigenname \"" + t + "\" fehlt", text);
      }

      // 6. Kernbegriffe in Klammern
      for (const [begriff, muster] of d === "oberflaeche" ? [...KERNBEGRIFFE, ...KERNBEGRIFFE_OBERFLAECHE] : KERNBEGRIFFE) {
        if (muster.test(deText) && !inKlammern(text, begriff)) F(d, pfad, "deutscher Name \"" + begriff + "\" nicht in Klammern", text);
      }

      // 7. einheitliche Begriffe
      const pruefText = code === "tr" ? sichtbar.replace(/İ/g, "i") : sichtbar; // İ (mit Punkt) gleich i
      for (const b of BEGRIFFE) {
        if (!b[code]) continue;
        if (b.de.test(deText) && !b[code].test(pruefText)) {
          const ausnahme = BEGRIFF_AUSNAHMEN[pfad] && BEGRIFF_AUSNAHMEN[pfad][b.name];
          if (!ausnahme) F(d, pfad, "Begriff \"" + b.name + "\" fehlt oder anders übersetzt", text);
        }
      }

      for (const s of saetze(text)) alleSaetze.push({ pfad: d[0] + ":" + pfad, satz: s, woerter: woerter(s).length });
    }
  }

  // 6b. Unterlagen U01-U40
  if (uebersetzt.regeln) {
    const deU = {};
    const zU = {};
    for (const [pfad, t] of de.regeln) {
      const m = /^unterlagen\.(U\d\d)\.(name|kurz|warum|wie|wo)$/.exec(pfad);
      if (m) (deU[m[1]] = deU[m[1]] || {})[m[2]] = t;
    }
    for (const [pfad, t] of uebersetzt.regeln) {
      const m = /^unterlagen\.(U\d\d)\.(name|kurz|warum|wie|wo)$/.exec(pfad);
      if (m) (zU[m[1]] = zU[m[1]] || {})[m[2]] = t;
    }
    for (const id of Object.keys(deU)) {
      zaehler.unterlagen++;
      const g = deU[id];
      const z = zU[id] || {};
      const deKopf = (g.name || "") + " " + (g.kurz || "");
      const zKopf = (z.name || "") + " " + (z.kurz || "");
      const deGanz = [g.name, g.kurz, g.warum, g.wie, g.wo].filter(Boolean).join(" ");
      const zGanz = [z.name, z.kurz, z.warum, z.wie, z.wo].filter(Boolean).join(" ");
      for (const [begriff, muster] of UNTERLAGEN_BEGRIFFE) {
        if (muster.test(deKopf) && inKlammern(zKopf, begriff)) zaehler.dokumentnamen++;
        if (muster.test(deKopf) && !inKlammern(zKopf, begriff) && !ohneSteuer(zKopf).toLowerCase().includes(begriff.toLowerCase())) F("regeln", "unterlagen." + id, "Dokumentname \"" + begriff + "\" fehlt in name oder kurz", zKopf.trim());
        else if (muster.test(deGanz) && !ohneSteuer(zGanz).toLowerCase().includes(begriff.toLowerCase())) F("regeln", "unterlagen." + id, "Dokumentname \"" + begriff + "\" fehlt im Text der Unterlage", zGanz.slice(0, 120));
      }
      for (const begriff of UNTERLAGEN_ZUSATZ[id] || []) {
        if (inKlammern(zKopf, begriff) || inKlammern(zGanz, begriff)) zaehler.dokumentnamen++;
        if (!inKlammern(zKopf, begriff) && !inKlammern(zGanz, begriff)) F("regeln", "unterlagen." + id, "Dokumentname \"" + begriff + "\" fehlt in Klammern", zKopf.trim());
      }
    }
  }

  // 6c. Pflichtnamen kommen mindestens einmal in Klammern vor
  {
    const alleTexte = [...(uebersetzt.oberflaeche || new Map()).values(), ...(uebersetzt.regeln || new Map()).values()].filter((t) => typeof t === "string");
    for (const name of PFLICHTNAMEN) {
      if (alleTexte.some((t) => inKlammern(t, name))) zaehler.pflichtnamen++;
      else F("regeln", "(alle Texte)", "Pflichtname \"" + name + "\" steht nirgends in Klammern");
    }
  }

  // 6d. Ein Papier heißt überall gleich (SCHNITTSTELLEN Abschnitt 9): Haben zwei Stellen der Regeltexte, die ein
  // Papier benennen (formulare, unterlagen.<U>.name, unterschriften), im Deutschen denselben Namen, hat er in
  // der Übersetzung auch überall dieselbe Übersetzung.
  if (uebersetzt.regeln) {
    const gruppen = new Map();
    for (const [pfad, t] of de.regeln) {
      if (!/^(formulare\.|unterlagen\.U\d\d\.name$|unterschriften\.)/.test(pfad) || typeof t !== "string") continue;
      if (!gruppen.has(t)) gruppen.set(t, []);
      gruppen.get(t).push(pfad);
    }
    for (const [deutsch, pfade] of gruppen) {
      if (pfade.length < 2) continue;
      const varianten = new Map();
      for (const p of pfade) {
        const z = uebersetzt.regeln.get(p);
        if (typeof z !== "string") continue;
        const k = ohneSteuer(z);
        if (!varianten.has(k)) varianten.set(k, []);
        varianten.get(k).push(p);
      }
      zaehler.papiernamen++;
      if (varianten.size > 1) F("regeln", pfade.join(" = "), "Papier \"" + deutsch + "\" heißt nicht überall gleich", [...varianten.keys()].join(" | "));
    }
  }

  // 6e. Arabisch: Satzzeichen der Schrift. Im arabischen Text steht das arabische Komma und das arabische
  // Fragezeichen, nicht "," und "?" (Klammern mit deutschen Namen und Platzhalter zählen nicht mit).
  if (code === "ar") {
    for (const d of DATEIEN) {
      for (const [pfad, t] of uebersetzt[d] || []) {
        if (typeof t !== "string" || DATENPFAD.test(pfad) || pfad === "liste.trenner") continue;
        const rest = ohneSteuer(t).replace(/\{[A-Za-z0-9_]+\}/g, "").replace(/\([^()]*[A-Za-zÄÖÜäöüß][^()]*\)/g, " ");
        if (!/[\u0600-\u06FF]/.test(rest)) continue;
        if (/,/.test(rest.replace(/\d,\d/g, ""))) F(d, pfad, "ASCII-Komma im arabischen Text (arabisches Komma \u060C verwenden)", t);
        if (/\?/.test(rest)) F(d, pfad, "ASCII-Fragezeichen im arabischen Text (arabisches \u061F verwenden)", t);
      }
    }
  }

  // 8. Begriffsliste
  let begriffsliste = [];
  if (rohText.oberflaeche) {
    begriffsliste = leseBegriffsliste(rohText.oberflaeche);
    if (begriffsliste.length < 40) F("oberflaeche", "(Kommentar)", "Begriffsliste hat nur " + begriffsliste.length + " Begriffe (mindestens 40)");
    for (const pflicht of ["Erlaubnis für Fotos", "Erlaubnis für die Lastschrift", "Satzung"]) {
      if (!begriffsliste.some(([g]) => g.trim() === pflicht)) F("oberflaeche", "(Kommentar)", "Begriffsliste ohne \"" + pflicht + "\"");
    }
  }

  alleSaetze.sort((a, b) => b.woerter - a.woerter);
  return { code, fehler, hinweise, zaehler, laengste: alleSaetze.slice(0, 5), begriffsliste, saetze: alleSaetze.length };
}

// ---------------------------------------------------------------------------
// Aufruf
// ---------------------------------------------------------------------------

export async function pruefeAlle(nurSprache) {
  const ergebnisse = [];
  for (const code of SPRACHEN) {
    if (nurSprache && nurSprache !== code) continue;
    ergebnisse.push(await pruefeSprache(code));
  }
  return ergebnisse;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = process.argv.find((a) => a.startsWith("--sprache="));
  const nur = arg ? arg.split("=")[1] : null;
  const ausfuehrlich = process.argv.includes("--ausfuehrlich");
  const ergebnisse = await pruefeAlle(nur);
  let gesamt = 0;
  for (const r of ergebnisse) {
    console.log("== " + r.code + " ==");
    console.log("  Texte geprüft: " + r.zaehler.texte + " (Oberfläche " + r.zaehler.oberflaeche + " Blätter, Regeln " + r.zaehler.regeln + " Blätter), Sätze: " + r.saetze);
    const nachArt = {};
    for (const f of r.fehler) nachArt[f.art.replace(/ ".*"/, "")] = (nachArt[f.art.replace(/ ".*"/, "")] || 0) + 1;
    const fehlend = r.fehler.filter((f) => f.art === "Schlüssel fehlt").length;
    const zuviel = r.fehler.filter((f) => f.art === "Schlüssel überzählig").length;
    const platz = r.fehler.filter((f) => f.art === "Platzhalter weichen ab").length;
    console.log("  fehlende Schlüssel: " + fehlend + ", überzählige Schlüssel: " + zuviel + ", Platzhalter-Abweichungen: " + platz);
    console.log("  Dokumentnamen U01-U40: " + r.zaehler.unterlagen + " Unterlagen geprüft, " + r.zaehler.dokumentnamen + " deutsche Namen in Klammern gefunden (name/kurz, U12: Text)");
    console.log("  Papiernamen einheitlich: " + r.zaehler.papiernamen + " Gruppen gleichlautender deutscher Namen mit je einer Übersetzung geprüft");
    console.log("  Pflichtnamen in Klammern: " + r.zaehler.pflichtnamen + " von " + PFLICHTNAMEN.length + " (" + PFLICHTNAMEN.join(", ") + ")");
    console.log("  Begriffsliste: " + r.begriffsliste.length + " Begriffe");
    console.log("  Fehler gesamt: " + r.fehler.length + (r.fehler.length ? "  (" + Object.entries(nachArt).map(([a, n]) => a + ": " + n).join("; ") + ")" : ""));
    const zeigen = ausfuehrlich ? r.fehler : r.fehler.slice(0, 40);
    for (const f of zeigen) console.log("    FEHLER " + f.datei + " " + f.pfad + " – " + f.art + (f.detail ? ": " + f.detail : ""));
    if (!ausfuehrlich && r.fehler.length > 40) console.log("    … und " + (r.fehler.length - 40) + " weitere (mit --ausfuehrlich alle)");
    console.log("  Längste Sätze (Wörter):");
    for (const l of r.laengste) console.log("    " + String(l.woerter).padStart(2) + "  " + l.pfad + "  " + l.satz.slice(0, 110));
    gesamt += r.fehler.length;
  }
  console.log("\nÜbersetzungen: " + (gesamt ? gesamt + " Fehler" : "0 Fehler"));
  process.exit(gesamt ? 1 : 0);
}
