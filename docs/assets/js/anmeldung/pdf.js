/*
  PDF-Baukasten des Anmelde-Assistenten FFV Sportfreunde 04 (Paket AP-3, 29.09.2026)

  Baut aus den Antworten `a`, dem Ergebnis der Regeln `e`, den Bildern und den
  Formularvorlagen EIN vollständiges PDF (SCHNITTSTELLEN Abschnitt 7):

    Teil A "Für Sie"                         Anleitung in Einfacher Sprache, Unterschriften-Übersicht,
                                             Liste "Das fehlt noch", Wartezeit, Hinweise, Kontakte
    Teil B "Für den Verein"                  Laufzettel, Aufnahmeantrag (4 Seiten), Datenschutzinformation,
                                             HFV-Antrag, Vollmacht/Abmeldung, Einverständnisse,
                                             Spielerfoto, Kopien der Nachweise mit Wasserzeichen
    Teil C "Vertraulich – getrennt abgeben"  Trennblatt, Attest (Vorlage oder Kopie), Einwilligung
                                             zum Attest, Notfall- und Gesundheitsbogen

  Läuft im Browser und in Node ohne DOM: pdf-lib, fontkit, Schrift und Vorlagen kommen von außen
  (opts). Der Baustein liest weder Browser- noch Node-Objekte noch Dateien und kennt keine
  Uhrzeit: das Datum kommt als opts.heute. Gleiche Eingaben ergeben dasselbe PDF.

  Schnittstelle:
    erzeugePdf(opts)          -> { bytes, seiten, teile, dateiname }
    benoetigteVorlagen(e, a)  -> Schlüssel der Vorlagen, die erzeugePdf() braucht
    dateiname(a)              -> "Anmeldung_<Nachname>_<Vorname>.pdf"
    TEXTE_TEIL_A              Sätze von Teil A (Einfache Sprache; der Test prüft die Satzlänge)
    begriffsErklaerer()       Erklärer für "Verband" und "Spielrecht" beim ersten Vorkommen (Teil A; für den Test)

  opts = { PDFLib, fontkit, schrift, vorlagen, konfig, a, e, bilder, heute,
           entwurf?: false   Fußzeile "Entwurf – vom Vorstand zu prüfen" abschalten (Standard: an)
           bericht?: {}      wird mit dem Aufbau gefüllt (Seitenarten, Stellen, Felder, Angaben der Familie, Warnungen) – für Tests }

  Grundsätze:
  - Auf den offiziellen Vordrucken steht nur, was hineingehört: die Felder (data/anmeldung-formulare.json,
    data/aufnahmeantrag-felder.json), die Unterschriftsstellen (Bild oder blaue Markierung) und die
    Zuordnungszeile auf Seite 3 des Aufnahmeantrags.
  - Unterschriften: Vereinsformulare mit digitaleUnterschrift "erlaubt" bekommen bei a.unterschriftWeg
    "bildschirm" das Unterschriftsbild der Person samt Ort und Datum. Alle anderen Stellen bleiben leer
    und tragen die Markierung "Hier mit Stift unterschreiben" (PLAN Annahme A1).
  - Eine Bildschirm-Unterschrift steht nur unter Angaben, die schon dastehen (Runde 2): auf eigenen Seiten steht „–“
    oder ein Satz statt eines leeren Feldes; fehlt auf dem Vordruck des Aufnahmeantrags eine Erklärung (Foto, IBAN,
    Familienmitglieder), wird die Stelle zur Stift-Stelle. Auf dem Papierweg bleiben unbeantwortete Felder frei.
    Die Absprache zur Medikamentengabe hat immer eigene Stift-Zeilen.
  - Keine Unterschriftsstelle wird stumm ausgelassen: kennen die Regeln eine Stelle einer eigenen Seite nicht,
    steht dort eine Stift-Markierung für die Rolle „einer“ des Regelwerks, und der Fall steht in bericht.warnungen.
  - Vor Fehlern schützt der Baustein sich selbst: Zeichen außerhalb der Schrift werden zu "?" (der
    Laufzettel meldet "Name bitte prüfen"), unlesbare Nachweise bekommen eine Ersatzseite, fehlende
    Angaben stehen als Hinweis auf dem Laufzettel. Nur eine geänderte oder fehlende Vorlage bricht ab.
*/

import deRegeln from "./texte/de-regeln.js";
import { auswerten } from "./regeln.js";

// ---------------------------------------------------------------------------
// Konstanten
// ---------------------------------------------------------------------------

const A4 = [595.28, 841.89];
const RAND = 44; // links und rechts
const OBEN = 788; // Oberkante des Inhalts
const UNTEN = 64; // Unterkante des Inhalts
const BREITE = A4[0] - 2 * RAND;
const KOPF_Y = 812;
const FUSS_Y = 30;

// Farben: nur Vereinsblau, Tinte und Grautöne (assets/css/tokens.css); kein Rot.
const rgbHex = (hex) => [parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255];
const FARBE = {
  markierung: rgbHex("#1F2DBE"), // --blau-700: "Hier mit Stift unterschreiben"
  blau: rgbHex("#191793"), // --blau-800: Überschriften
  tinte: rgbHex("#12142B"), // --ink
  tinte2: rgbHex("#3F4360"), // --ink-2
  tinte3: rgbHex("#5B6079"), // --ink-3
  linie: rgbHex("#D8DBEA"), // --line
  hell: rgbHex("#E4E7FA"), // --blau-100
  flaeche: rgbHex("#F3F5FC"), // --blau-50
  wasserzeichen: rgbHex("#3F4360"),
  schwarz: [0, 0, 0],
  weiss: [1, 1, 1],
};

const MAX_PT_JE_PX = 0.55; // größter Maßstab einer Unterschrift (wie im Online-Aufnahmeantrag)
const ENTWURF_TEXT = "Entwurf – vom Vorstand zu prüfen";
const TEIL_TITEL = { A: "Für Sie", B: "Für den Verein", C: "Vertraulich – getrennt abgeben" };
// So heißen die Teile im PDF-Text (SCHNITTSTELLEN Abschnitt 9); TEIL_TITEL bleibt der Wert von teile[].titel
const TEIL_ANZEIGE = { A: "Teil A – Für Sie", B: "Teil B – Für den Verein", C: "Teil C – Vertraulich, getrennt abgeben" };
// Vorlage für die Ärztin oder den Arzt (Abschnitt 9 erlaubt „Ärztliche Bescheinigung (Attest)“ statt „Attest vom Arzt“)
const ATTEST_VORLAGE_NAME = "Ärztliche Bescheinigung (Attest)";
const VORLAGEN = ["aufnahmeantrag", "hfv_antrag", "vollmacht", "abmeldung", "einverstaendnis_senioren"];
// Reihenfolge der Formulare in Teil B (regeln.js: FORMULAR_REIHENFOLGE); attest und notfall gehören in Teil C.
const TEIL_C_FORMULARE = ["attest", "notfall"];

const WER_KLARTEXT = {
  mitglied: "Mitglied (Sie selbst)",
  spieler: "Spielerin oder Spieler",
  sorgeberechtigte: "eine Person mit Sorgerecht",
  sorgeberechtigte_beide: "zweiter Elternteil (nötig)", // nur bei getrennt lebenden Eltern ohne Einverständnis (O26)
  kontoinhaber: "Kontoinhaberin oder Kontoinhaber",
  arzt: "Ärztin oder Arzt (mit Stempel)",
  verein: "Verein (mit Stempel)",
  // Absprache zur Medikamentengabe im Notfallbogen: immer mit Stift, nie unter der Bildschirm-Unterschrift
  absprache_eltern: "eine Person mit Sorgerecht – bei der Absprache",
  absprache_trainer: "Trainerin oder Trainer – bei der Absprache",
};

const ROLLEN = { mutter: "Mutter", vater: "Vater", vormund: "Vormund", pflege: "Pflegeperson", andere: "weitere Person" };

const SORGE_TEXT = {
  beide: "Beide Eltern haben das Sorgerecht",
  getrennt_bei_mir: "Eltern leben getrennt, das Kind lebt bei der ausfüllenden Person",
  allein: "Alleiniges Sorgerecht",
  vormund: "Vormund",
  pflege: "Pflegeperson",
};
const WOHNEN_TEXT = {
  gemeinsam: "Kind und Eltern wohnen in Deutschland zusammen",
  nicht_gemeinsam: "Kind und Eltern wohnen nicht zusammen",
  verwandte: "Kind wohnt bei Verwandten",
  ohne_eltern: "Kind wohnt ohne Eltern",
};
const ABTEILUNG_TEXT = { fussball: "Fußball", karneval: "Karneval", beides: "Fußball und Karneval", passiv: "Passives Mitglied (Förderer)" };
const GESCHLECHT_TEXT = { m: "männlich", w: "weiblich", d: "divers", ohne_angabe: "ohne Angabe" };
const ART_KLARTEXT = { pflicht: "Pflicht", verein: "Vereinsvorgabe", freiwillig: "freiwillig", nur_wenn: "nur wenn zutreffend", offen: "offen (vielleicht nötig)" };
const HINWEIS_ART = { warnung: "Achtung", frist: "Frist", info: "Zur Information", offen: "Der Verein klärt das" };
// Passwesen und Spielausschuss stehen mit ihrer Aufgabe da und mit dem Weg zu ihnen: Beide erreicht die Familie über die
// Geschäftsstelle (Nachbesserung sprache-8). Dieselben Texte stehen in de-oberflaeche.js › pruefen › weiterleitungAn.
const STELLE_KLARTEXT = {
  jugendleitung: "Jugendleitung",
  passwesen: "Passwesen (bearbeitet die Spielerpässe; erreichbar über die Geschäftsstelle)",
  geschaeftsstelle: "Geschäftsstelle",
  karneval: "Karnevalabteilung",
  spielausschuss: "Spielausschuss der Herren (prüft Wechsel und Fristen; erreichbar über die Geschäftsstelle)",
};

// ---------------------------------------------------------------------------
// Texte von Teil A (Einfache Sprache: Sie-Form, aktiv, höchstens 12 Wörter pro Satz).
// Platzhalter stehen in geschweiften Klammern. Der Test prüft jeden Satz.
// ---------------------------------------------------------------------------

export const TEXTE_TEIL_A = {
  titel: "Ihre Anmeldung",
  einleitung: "Hier ist Ihre fertige Anmeldung. Die Datei hat {anzahl} Teile.",
  teilA: "Das lesen Sie jetzt. Sie behalten diesen Teil.",
  teilB: "Sie geben ihn im Verein ab.",
  teilC: "Er enthält Angaben zur Gesundheit. Sie geben ihn getrennt ab.",
  weiterTitel: "So geht es weiter",
  // Unterschriften. Der Verband (der Hessische Fußball-Verband) verlangt für seine Blätter eine Unterschrift mit Stift. Die
  // Sätze stehen so, dass nach der Erklärung beim ersten Vorkommen („Hessischer Fußball-Verband (kurz: der Verband)“,
  // siehe begriffsErklaerer) kein Satz länger als 12 Wörter ist.
  stiftKeine: "Sie haben alles am Bildschirm unterschrieben.",
  stiftTraining: "Der Verband hat eigene Blätter. Diese unterschreiben Sie beim ersten Training mit Stift. Der Verein bringt sie ausgedruckt mit.",
  stiftDrucken: "Der Verband hat eigene Blätter. Unterschreiben Sie diese an den blauen Markierungen mit Stift.",
  stiftAlleTraining: "Alle Blätter unterschreiben Sie beim ersten Training mit Stift. Der Verein druckt sie aus.",
  stiftAlleTrainingOhneAbmeldung: "Alle Blätter außer der Abmeldung unterschreiben Sie beim ersten Training mit Stift. Der Verein druckt sie aus.",
  stiftAlleDrucken: "Drucken Sie die Datei aus. Unterschreiben Sie an allen blauen Markierungen mit Stift.",
  stiftRest: "Einige Vereinsblätter haben noch keine Unterschrift. Unterschreiben Sie dort an den blauen Markierungen mit Stift.",
  // Was auf Papier sein muss (sprache-11): nur die Blätter, die die Familie selbst ausdrucken muss, mit Seite und Namen
  ausdruckenNichts: "Sie müssen nichts ausdrucken.",
  ausdruckenNur: "Ausdrucken müssen Sie nur:",
  satzung: "Kreuzen Sie im Aufnahmeantrag auf Seite {seite} das Kästchen zur Satzung an. Die Satzung steht auf der Internetseite des Vereins.",
  attest: "Das Blatt Ärztliche Bescheinigung (Attest) steht auf Seite {seite}. Gehen Sie damit zum Arzt. Der Arzt unterschreibt und stempelt es.",
  attestKosten: "Fragen Sie den Arzt vorher nach dem Preis.",
  // Das Blatt „Abmeldung beim alten Verein“ (sprache-10): Die Familie unterschreibt es mit Stift und schickt es selbst.
  abmeldung: "Das Blatt {name} steht auf {seiten}. Unterschreiben Sie es mit Stift. Schicken Sie es selbst als Einschreiben an den alten Verein.",
  fehlt: "Besorgen Sie die Unterlagen aus der Liste Das fehlt noch.",
  abgeben: "Geben Sie Teil B im Verein ab. Bringen Sie die Datei auf dem Handy mit. Oder geben Sie sie ausgedruckt ab.",
  // Wer die ganze Datei ausdruckt und mit Stift unterschreibt, gibt Papier ab; die Datei auf dem Handy genügt dann nicht.
  abgebenAusgedruckt: "Geben Sie Teil B im Verein ab. Geben Sie ihn ausgedruckt und unterschrieben ab.",
  // Teil C: Die Übergabe der Unterlagen ist noch offen (O25). Der Text verlangt deshalb keinen Umschlag.
  abgebenC: "Teil C gehört nicht zu den übrigen Unterlagen. Der Verein bewahrt ihn getrennt auf.",
  verband: "Danach stellt der Verein den Antrag beim Verband.",
  verein: "Danach prüft der Verein Ihre Anmeldung.",
  nichtWhatsapp: "Schicken Sie die Datei nicht per WhatsApp. Sie enthält private Daten.",
  unterschriftenTitel: "Wo unterschreiben Sie?",
  unterschriftenEinleitung: "Diese Tabelle zeigt alle Unterschriften. Die Seitenzahl steht in der ersten Spalte.",
  unterschriftenKeine: "Für Ihre Anmeldung gibt es keine Unterschriften.",
  wieBildschirm: "Am Bildschirm erledigt",
  wieStift: "Mit Stift",
  wieStiftTraining: "Mit Stift, beim ersten Training",
  wieStiftDrucken: "Mit Stift, nach dem Ausdrucken",
  wieStiftVerschicken: "Mit Stift, selbst verschicken",
  wieArzt: "Mit Stift, beim Arzt",
  wieVerein: "Mit Stift, durch den Verein",
  fehltTitel: "Das fehlt noch",
  fehltEinleitung: "Diese Unterlagen brauchen wir noch von Ihnen.",
  fehltKeine: "Es fehlt nichts. Alle nötigen Unterlagen liegen bei.",
  // Gibt es Papiere, die vielleicht nötig sind (Laufzettel: „klären“), liegen nicht „alle nötigen Unterlagen“ bei (sprache-9).
  fehltKeineSicher: "Es fehlt nichts, was sicher nötig ist.",
  fehltVielleicht: "Vielleicht kommt noch etwas dazu. Das steht unter „Das klärt der Verein mit Ihnen“.",
  fehltNichtLesbar: "Die Datei ließ sich nicht übernehmen. Bringen Sie das Original oder eine Kopie mit.",
  fehltWie: "So bekommen Sie es:",
  fehltWo: "So geben Sie es ab:",
  wartezeitTitel: "Wann darf gespielt werden?",
  mannschaftTitel: "Die Mannschaft",
  wartezeitSchaetzung: "Das ist eine Schätzung. Der Verein prüft das genau.",
  wartezeitUnsicher: "Die Zeit ist nicht sicher. Der Verein prüft das genau und sagt Ihnen Bescheid.",
  wissenTitel: "Das sollten Sie wissen",
  klaerenTitel: "Das klärt der Verein mit Ihnen",
  vielleichtVerband: "Vielleicht braucht der Verband noch:",
  vielleichtVerein: "Vielleicht braucht der Verein noch:",
  stellenTitel: "Diese Stellen melden sich bei Ihnen",
  kontaktTitel: "So erreichen Sie uns",
  kontaktEinleitung: "Bei Fragen rufen Sie uns an oder schreiben Sie uns.",
};

// ---------------------------------------------------------------------------
// Kleine Hilfen: Text, Datum, Zahlen
// ---------------------------------------------------------------------------

const text = (x) => (x === undefined || x === null ? "" : String(x).trim());
const hatText = (x) => text(x) !== "";
const liste = (x) => (Array.isArray(x) ? x : []);
const objekt = (x) => (x && typeof x === "object" && !Array.isArray(x) ? x : {});

// "JJJJ-MM-TT" -> "TT.MM.JJJJ"; alles andere bleibt unverändert
function datumDe(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text(iso));
  return m ? m[3] + "." + m[2] + "." + m[1] : text(iso);
}

// Datum ohne Uhrzeitzugriff: nur für die Metadaten des PDFs aus opts.heute abgeleitet
function datumObjekt(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text(iso));
  return m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0)) : new Date(0);
}

function ersetzePlatzhalter(vorlage, werte) {
  const w = objekt(werte);
  return String(vorlage === undefined || vorlage === null ? "" : vorlage).replace(/\{(\w+)\}/g, (voll, name) =>
    w[name] === undefined || w[name] === null ? "" : String(w[name])
  );
}

function ibanNormal(x) {
  return text(x).toUpperCase().replace(/[^A-Z0-9]/g, "");
}

// IBAN für den Laufzettel: alle Stellen außer den letzten vier sind verdeckt
function ibanMaskiert(x) {
  const n = ibanNormal(x);
  if (n.length <= 4) return n ? "****" : "";
  const verdeckt = "*".repeat(n.length - 4) + n.slice(-4);
  return verdeckt.replace(/(.{4})/g, "$1 ").trim();
}

function ibanGruppiert(x) {
  return ibanNormal(x).replace(/(.{4})/g, "$1 ").trim();
}

// Länder: ISO-Kürzel -> deutsche Bezeichnung (Intl.DisplayNames gibt es in Browsern und Node)
let regionNamen = null;
const LAENDER_NOTBEHELF = { DE: "Deutschland", TR: "Türkei", SY: "Syrien", RO: "Rumänien", ES: "Spanien", PL: "Polen", IT: "Italien", UA: "Ukraine" };
function landName(code) {
  const c = text(code);
  if (!c) return "";
  if (!/^[A-Za-z]{2}$/.test(c)) return c; // schon Klartext
  const k = c.toUpperCase();
  try {
    if (regionNamen === null) regionNamen = new Intl.DisplayNames(["de"], { type: "region" });
    const n = regionNamen.of(k);
    if (n && n !== k) return n;
  } catch (fehler) {
    // ohne Intl.DisplayNames: kleine Ersatztabelle
  }
  return LAENDER_NOTBEHELF[k] || k;
}

// Staatsangehörigkeiten für das Feld des HFV-Antrags (höchstens `max` Zeichen): alle, Deutschland zuerst;
// passen nicht alle hinein, bleiben die ersten stehen (der Laufzettel nennt immer alle).
function staatenListe(a) {
  let codes = liste(a.staaten).map((s) => text(s).toUpperCase()).filter(Boolean);
  if (a.deutsch === "ja" && !codes.includes("DE")) codes.push("DE"); // deutscher Pass angegeben: Deutschland gehört dazu
  codes = codes.filter((c, i) => codes.indexOf(c) === i);
  const de = codes.filter((c) => c === "DE");
  return de.concat(codes.filter((c) => c !== "DE"));
}

function staatenText(a, max) {
  const namen = staatenListe(a).map(landName);
  let aus = "";
  for (const n of namen) {
    const probe = aus ? aus + ", " + n : n;
    if (max && probe.length > max) {
      if (!aus) aus = n.slice(0, max);
      break;
    }
    aus = probe;
  }
  return aus;
}

// Dateiname: "Anmeldung_<Nachname>_<Vorname>.pdf", nur Buchstaben, Ziffern und Bindestrich
const UMLAUT = { ä: "ae", ö: "oe", ü: "ue", Ä: "Ae", Ö: "Oe", Ü: "Ue", ß: "ss", ı: "i", İ: "I", ł: "l", Ł: "L", đ: "d", Đ: "D", ø: "o", Ø: "O", æ: "ae", Æ: "Ae", œ: "oe", Œ: "Oe", þ: "th", ð: "d" };
function dateiTeil(x) {
  const s = text(x).replace(/[äöüÄÖÜßıİłŁđĐøØæÆœŒþð]/g, (c) => UMLAUT[c] || c);
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function dateiname(a) {
  const n = dateiTeil(objekt(a).nachname);
  const v = dateiTeil(objekt(a).vorname);
  return "Anmeldung_" + (n && v ? n + "_" + v : n || v || "Person") + ".pdf";
}

// ---------------------------------------------------------------------------
// Ausdrücke aus data/anmeldung-formulare.json (quelle, bedingung)
// Wert: Teile mit + verbunden, je Teil "Text" oder Pfad mit optionalem |Format (TT.MM.JJJJ, STAATEN).
// Bedingung: oder > und > nicht > Vergleich (=, !=, <, in [..], enthält) oder ein Pfad allein.
// ---------------------------------------------------------------------------

function zerlegeWert(ausdruck) {
  const teile = [];
  let cur = "";
  let inStr = false;
  for (const ch of ausdruck) {
    if (ch === '"') inStr = !inStr;
    if (!inStr && ch === "+") {
      teile.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  teile.push(cur);
  return teile.map((t) => {
    const s = t.trim();
    if (/^".*"$/.test(s)) return { typ: "text", wert: s.slice(1, -1) };
    const [pfad, format] = s.split("|");
    return { typ: "pfad", pfad: pfad, format: format };
  });
}

function holePfad(ctx, pfad) {
  const [wurzel, ...rest] = pfad.split(".");
  let v = ctx[wurzel];
  for (const k of rest) {
    if (v === undefined || v === null) return undefined;
    v = v[k];
  }
  return v;
}

const fehltWert = (v) => v === undefined || v === null || v === "";

// null, wenn ein Wert fehlt; sonst der zusammengesetzte Text
function bewerteWert(ausdruck, ctx, max) {
  let aus = "";
  for (const t of zerlegeWert(ausdruck)) {
    if (t.typ === "text") {
      aus += t.wert;
      continue;
    }
    if (t.format === "STAATEN") {
      const s = staatenText(ctx.a, max || 0);
      if (!s) return null;
      aus += s;
      continue;
    }
    const v = holePfad(ctx, t.pfad);
    if (fehltWert(v)) return null;
    aus += t.format === "TT.MM.JJJJ" ? datumDe(v) : String(v);
  }
  return aus;
}

function parseBedingung(ausdruck) {
  const tokens = [];
  const re = /\s*(?:(\()|(\))|(\[)|(\])|(,)|(!=|=|<)|("[^"]*")|(\d+)|([A-Za-zÄÖÜäöüß_][\wÄÖÜäöüß.]*))/gy;
  let m;
  let ende = 0;
  while ((m = re.exec(ausdruck)) !== null) {
    ende = re.lastIndex;
    tokens.push({ t: m[1] ? "(" : m[2] ? ")" : m[3] ? "[" : m[4] ? "]" : m[5] ? "," : m[6] ? m[6] : m[7] ? "str" : m[8] ? "num" : "id", v: m[0].trim() });
    if (ende >= ausdruck.length) break;
  }
  if (!(ende >= ausdruck.trimEnd().length && tokens.length > 0)) throw new Error("Bedingung nicht lesbar: " + ausdruck);
  let i = 0;
  const peek = () => tokens[i];
  const next = () => tokens[i++];
  const wert = () => {
    const t = next();
    if (!t || !["id", "num"].includes(t.t)) throw new Error("Wert erwartet in: " + ausdruck);
    return t.v;
  };
  const atom = () => {
    const t = next();
    if (!t) throw new Error("Ausdruck endet zu früh: " + ausdruck);
    if (t.t === "(") {
      const x = oder();
      next();
      return x;
    }
    if (t.t !== "id") throw new Error("unerwartet " + t.v + " in: " + ausdruck);
    if (t.v === "nicht") return { k: "nicht", x: atom() };
    const n = peek();
    if (n && (n.t === "=" || n.t === "!=")) {
      next();
      return { k: n.t === "=" ? "eq" : "neq", pfad: t.v, wert: wert() };
    }
    if (n && n.t === "<") {
      next();
      const z = next();
      return { k: "lt", pfad: t.v, n: Number(z && z.v) };
    }
    if (n && n.t === "id" && n.v === "in") {
      next();
      next();
      const werte = [];
      do {
        werte.push(wert());
      } while (peek() && peek().t === "," && next());
      next();
      return { k: "in", pfad: t.v, werte: werte };
    }
    if (n && n.t === "id" && n.v === "enthält") {
      next();
      return { k: "has", pfad: t.v, wert: wert() };
    }
    return { k: "pfad", pfad: t.v };
  };
  const und = () => {
    let l = atom();
    while (peek() && peek().t === "id" && peek().v === "und") {
      next();
      l = { k: "und", l: l, r: atom() };
    }
    return l;
  };
  const oder = () => {
    let l = und();
    while (peek() && peek().t === "id" && peek().v === "oder") {
      next();
      l = { k: "oder", l: l, r: und() };
    }
    return l;
  };
  return oder();
}

function bewerteBedingungKnoten(ast, ctx) {
  const v = ast.pfad ? holePfad(ctx, ast.pfad) : undefined;
  switch (ast.k) {
    case "pfad":
      return v === true;
    case "eq":
      return !fehltWert(v) && String(v) === ast.wert;
    case "neq":
      return fehltWert(v) || String(v) !== ast.wert;
    case "lt":
      return typeof v === "number" && v < ast.n;
    case "in":
      return !fehltWert(v) && ast.werte.includes(String(v));
    case "has":
      return Array.isArray(v) && v.includes(ast.wert);
    case "nicht":
      return !bewerteBedingungKnoten(ast.x, ctx);
    case "und":
      return bewerteBedingungKnoten(ast.l, ctx) && bewerteBedingungKnoten(ast.r, ctx);
    case "oder":
      return bewerteBedingungKnoten(ast.l, ctx) || bewerteBedingungKnoten(ast.r, ctx);
    default:
      throw new Error("unbekannter Knoten " + ast.k);
  }
}

const bedingungCache = new Map();
function bewerteBedingung(ausdruck, ctx) {
  let ast = bedingungCache.get(ausdruck);
  if (!ast) {
    ast = parseBedingung(ausdruck);
    bedingungCache.set(ausdruck, ast);
  }
  return bewerteBedingungKnoten(ast, ctx);
}

// ---------------------------------------------------------------------------
// Bilder: Maße aus dem Dateikopf lesen (ohne Dekodieren), Art an den Anfangsbytes erkennen
// ---------------------------------------------------------------------------

function bildArt(bytes) {
  if (!bytes || bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return "pdf"; // %PDF
  return null;
}

// { breite, hoehe } oder null bei unlesbarem Kopf
function bildMasse(bytes, art) {
  try {
    if (art === "png") {
      const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      const b = dv.getUint32(16);
      const h = dv.getUint32(20);
      return b > 0 && h > 0 ? { breite: b, hoehe: h } : null;
    }
    if (art === "jpeg") {
      let i = 2;
      while (i + 9 < bytes.length) {
        if (bytes[i] !== 0xff) {
          i += 1;
          continue;
        }
        const marker = bytes[i + 1];
        if (marker === 0xff) {
          i += 1;
          continue;
        }
        if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
          i += 2;
          continue;
        }
        const laenge = (bytes[i + 2] << 8) | bytes[i + 3];
        // SOF0 bis SOF15 außer DHT (C4), JPG (C8), DAC (CC)
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
          const h = (bytes[i + 5] << 8) | bytes[i + 6];
          const b = (bytes[i + 7] << 8) | bytes[i + 8];
          return b > 0 && h > 0 ? { breite: b, hoehe: h } : null;
        }
        i += 2 + laenge;
      }
    }
  } catch (fehler) {
    return null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Kontext: alles, was während des Baus gebraucht wird
// ---------------------------------------------------------------------------

function baueKontext(opts) {
  const { PDFLib, fontkit, schrift, konfig } = opts;
  if (!PDFLib || !PDFLib.PDFDocument) throw new Error("opts.PDFLib fehlt");
  if (!fontkit) throw new Error("opts.fontkit fehlt");
  if (!schrift || !schrift.length) throw new Error("opts.schrift fehlt");
  if (!konfig || !konfig.anmeldung) throw new Error("opts.konfig.anmeldung fehlt");
  const a = objekt(opts.a);
  const heute = text(opts.heute);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(heute)) throw new Error("opts.heute muss JJJJ-MM-TT sein");
  const bilder = objekt(opts.bilder);
  const K = {
    L: PDFLib,
    opts: opts,
    konfig: konfig,
    cfg: konfig.anmeldung,
    formulare: objekt(objekt(konfig.formulare).formulare),
    a: a,
    e: opts.e,
    eText: opts.e, // Ergebnis für die Texte (Deutsch), siehe erzeugePdf()
    heute: heute,
    heuteDe: datumDe(heute),
    bilder: {
      spielerfoto: bilder.spielerfoto || null,
      nachweise: objekt(bilder.nachweise),
      unterschriften: objekt(bilder.unterschriften),
    },
    vorlagen: objekt(opts.vorlagen),
    verein: objekt(konfig.verein),
    entwurf: opts.entwurf !== false,
    bericht: opts.bericht && typeof opts.bericht === "object" ? opts.bericht : null,
    doc: null,
    font: null,
    zeichen: null,
    seiten: [], // { page, teil, eigen, entwurf, art, schluessel }
    ersetzt: false, // ein Zeichen der Eingaben fehlte in der Schrift ("Name bitte prüfen")
    fehlendeAngaben: [], // Felder der Vordrucke, die ohne Wert blieben
    hinweiseIntern: [], // Hinweise für den Laufzettel (gekürzte Werte, kleine Fotos ...)
    stellen: [], // Ergebnis: alle Unterschriftsstellen mit Seite und Art
    flaechen: [], // Ergebnis: Flächen, die pdf.js auf Vordrucke schreibt (Prüfung auf verdeckte Vordrucktexte)
    felder: [], // Ergebnis: alle gesetzten Felder der Vordrucke
    eingaben: [], // Ergebnis: Felder für Erklärungen und Angaben der Familie (leer oder gefüllt), je Seite
    texte: [], // Ergebnis (nur mit opts.bericht): gedruckte Texte der eigenen Seiten mit Seite, Art und Kennung (Test der Satzlänge)
    warnungen: [], // Fälle, die nie vorkommen sollen (Stelle fehlt in den Regeln, Stelle nicht vermessen); der Test wertet sie als Fehler
    rueckfall: [], // Unterschriftsstellen, die die Regeln nicht kennen und die pdf.js als Stift-Markierung ergänzt hat
  };
  K.person = {
    vorname: text(a.vorname),
    nachname: text(a.nachname),
    name: [text(a.vorname), text(a.nachname)].filter(Boolean).join(" ") || "Person",
  };
  K.minderjaehrig = K.e && K.e.minderjaehrig === true;
  return K;
}

// Zeichen außerhalb der Schrift werden zu "?"; Nutzereingaben merken sich das (Laufzettel: Name prüfen)
function sicher(K, x, nutzer) {
  let s = String(x === undefined || x === null ? "" : x);
  if (!K.zeichen) return s;
  let aus = "";
  let ersetzt = false;
  for (const ch of s.normalize("NFC")) {
    const c = ch.codePointAt(0);
    if (c === 9 || c === 10 || c === 13 || c === 0xa0) {
      aus += " ";
    } else if (c < 32 || (c >= 0x200b && c <= 0x200f) || (c >= 0x202a && c <= 0x202e) || c === 0xfeff || c === 0xad) {
      // Steuer- und Formatzeichen entfallen
    } else if (K.zeichen.has(c)) {
      aus += ch;
    } else {
      aus += "?";
      ersetzt = true;
    }
  }
  if (ersetzt && nutzer) K.ersetzt = true;
  return aus;
}

const mess = (K, s, size) => K.font.widthOfTextAtSize(s, size);
// Fläche merken, die auf einen Vordruck geschrieben wird (x, y unten links; Prüfung im Test)
function merkeFlaeche(K, page, art, x, y, b, h) {
  K.flaechen.push({ pageRef: page, art: art, x: x, y: y, b: b, h: h });
}

// Text auf einen Vordruck schreiben (Schrift der Einträge, schwarz oder Vereinsblau) und die Fläche merken
function schreibeAufVorlage(K, page, art, s, x, y, size, farbe) {
  page.drawText(s, { x: x, y: y, size: size, font: K.font, color: rgbF(K, farbe || FARBE.schwarz) });
  merkeFlaeche(K, page, art, x, y - 0.22 * size, K.font.widthOfTextAtSize(s, size), 0.99 * size);
}
const rgbF = (K, f) => K.L.rgb(f[0], f[1], f[2]);

// Text zeichnen. fett = Füllung plus dünner Rand (ein einziger Text, keine Doppelung beim Kopieren);
// drehung in Grad gegen den Uhrzeigersinn, deckkraft 0 bis 1 (Wasserzeichen).
function zeichneText(K, page, s, x, y, size, o) {
  if (!s) return;
  const opt = o || {};
  const f = opt.farbe || FARBE.tinte;
  const L = K.L;
  if (opt.fett) {
    page.setFont(K.font);
    const [, fontKey] = page.getFont();
    const w = ((opt.drehung || 0) * Math.PI) / 180;
    const cos = Math.cos(w);
    const sin = Math.sin(w);
    page.pushOperators(
      L.pushGraphicsState(),
      L.setFillingColor(rgbF(K, f)),
      L.setStrokingColor(rgbF(K, f)),
      L.setLineWidth(size * 0.028),
      L.beginText(),
      L.setFontAndSize(fontKey, size),
      L.setTextRenderingMode(L.TextRenderingMode.FillAndOutline),
      L.setTextMatrix(cos, sin, -sin, cos, x, y),
      L.showText(K.font.encodeText(s)),
      L.endText(),
      L.popGraphicsState()
    );
    return;
  }
  const a = { x: x, y: y, size: size, font: K.font, color: rgbF(K, f) };
  if (opt.drehung) a.rotate = L.degrees(opt.drehung);
  if (opt.deckkraft !== undefined) a.opacity = opt.deckkraft;
  page.drawText(s, a);
}

function zeichneLinie(K, page, x0, y0, x1, y1, staerke, farbe, gestrichelt) {
  const o = { start: { x: x0, y: y0 }, end: { x: x1, y: y1 }, thickness: staerke || 0.5, color: rgbF(K, farbe || FARBE.tinte3) };
  if (gestrichelt) o.dashArray = gestrichelt;
  page.drawLine(o);
}

function zeichneRechteck(K, page, x, y, b, h, o) {
  const opt = o || {};
  const a = { x: x, y: y, width: b, height: h };
  if (opt.fuellung) a.color = rgbF(K, opt.fuellung);
  if (opt.rand) {
    a.borderColor = rgbF(K, opt.rand);
    a.borderWidth = opt.randBreite || 0.5;
  }
  if (opt.gestrichelt) a.borderDashArray = opt.gestrichelt;
  page.drawRectangle(a);
}

// Kästchen für eigene Seiten (die Schrift hat kein ☐): Quadrat, angekreuzt mit zwei Diagonalen
function zeichneKaestchen(K, page, x, y, seite, gesetzt) {
  zeichneRechteck(K, page, x, y, seite, seite, { rand: FARBE.tinte, randBreite: 0.8, fuellung: FARBE.weiss });
  if (gesetzt) {
    const e = seite * 0.2;
    zeichneLinie(K, page, x + e, y + e, x + seite - e, y + seite - e, 1.1, FARBE.tinte);
    zeichneLinie(K, page, x + e, y + seite - e, x + seite - e, y + e, 1.1, FARBE.tinte);
  }
}

// Wert in eine Breite einpassen: erst verkleinern (bis gmin), zuletzt mit Auslassungspunkten kürzen
function passeWertAn(K, s, breite, g0, gmin) {
  let g = g0;
  while (mess(K, s, g) > breite && g > gmin) g -= 0.25;
  if (mess(K, s, g) <= breite) return { text: s, groesse: g };
  const punkte = K.zeichen && K.zeichen.has(0x2026) ? "…" : "...";
  let t = s;
  while (t.length > 1 && mess(K, t + punkte, g) > breite) t = t.slice(0, -1);
  return { text: t + punkte, groesse: g };
}

// ---------------------------------------------------------------------------
// Schreiber: Textfluss für die eigenen Seiten (Absätze, Listen, Tabellen, Unterschriftszeilen)
// Im Probelauf (trocken) läuft dieselbe Rechnung ohne zu zeichnen; so sind Seitenzahlen vorab bekannt.
// ---------------------------------------------------------------------------

class Schreiber {
  constructor(K, o) {
    this.K = K;
    this.teil = o.teil;
    this.art = o.art || "eigen";
    this.schluessel = o.schluessel || null;
    this.formular = o.formular || null;
    this.entwurf = o.entwurf === true && K.entwurf;
    this.trocken = o.trocken === true;
    this.seitenAnzahl = 0;
    this.page = null;
    this.y = OBEN;
    this.stellen = {}; // stelleKey -> Seitenindex (0-basiert) innerhalb dieses Schreibers
    this.titel = o.titel || "";
    this.einfuegenAb = o.einfuegenAb;
  }

  neueSeite() {
    this.seitenAnzahl += 1;
    this.y = OBEN;
    if (this.trocken) return;
    const K = this.K;
    let page;
    let index = K.seiten.length;
    if (this.einfuegenAb !== undefined) {
      index = this.einfuegenAb + this.seitenAnzahl - 1;
      page = K.doc.insertPage(index, A4);
    } else {
      page = K.doc.addPage(A4);
    }
    this.page = page;
    const eintrag = { page: page, teil: this.teil, eigen: true, entwurf: this.entwurf, art: this.art, schluessel: this.schluessel, titel: this.titel };
    K.seiten.splice(index, 0, eintrag);
    const kopf = "FFV Sportfreunde 04 · Anmeldung " + sicher(K, K.person.name, true) + " · Teil " + this.teil;
    zeichneText(K, page, kopf, RAND, KOPF_Y, 8, { farbe: FARBE.tinte3 });
    zeichneLinie(K, page, RAND, KOPF_Y - 5, A4[0] - RAND, KOPF_Y - 5, 0.5, FARBE.linie);
  }

  // sorgt dafür, dass `h` Punkte Platz sind; sonst neue Seite
  platz(h) {
    if (this.seitenAnzahl === 0 || this.y - h < UNTEN) this.neueSeite();
  }

  abstand(h) {
    this.y -= h;
  }

  // Merkt ein Feld für eine Erklärung oder Angabe der Familie auf der aktuellen Seite (für den Test:
  // unter einer Bildschirm-Unterschrift darf kein leeres Feld stehen). leer: das Feld bleibt zum Ausfüllen frei.
  // ausnahme: eigene Stift-Zeile (Absprache zur Medikamentengabe).
  eingabe(info) {
    if (this.trocken || !this.page) return;
    this.K.eingaben.push(Object.assign({ pageRef: this.page, formular: this.formular, ausnahme: false }, info));
  }

  // Für Tests (opts.bericht): gedruckter Text mit Seite, Art (absatz, liste, kaestchen, ueberschrift) und Kennung
  // ("untertitel", "rechtsgrundlage" oder nichts). Die Läufe stehen mit Leerzeichen zusammen, wie auf dem Blatt.
  merkeText(inhalt, art, kennung) {
    if (this.trocken || !this.K.bericht || !this.page) return;
    const laeufe = typeof inhalt === "string" ? [{ t: inhalt }] : inhalt;
    this.K.texte.push({ pageRef: this.page, art: art, kennung: kennung || null, text: laeufe.map((l) => String(l.t)).join(" ") });
  }

  // Wörter mit Stil aus Text oder Läufen ([{ t, fett, farbe, nutzer }]). Zwischen zwei Läufen steht ein Leerzeichen.
  // nutzer: Eingabe der Familie; Zeichen außerhalb der Schrift werden gemeldet ("Name bitte prüfen").
  woerter(inhalt, o) {
    const K = this.K;
    const laeufe = typeof inhalt === "string" ? [{ t: inhalt }] : inhalt;
    const worte = [];
    for (const lauf of laeufe) {
      const roh = sicher(K, lauf.t, !!lauf.nutzer);
      for (const w of roh.split(/ +/)) {
        if (w) worte.push({ t: w, fett: !!(lauf.fett || o.fett), farbe: lauf.farbe || o.farbe });
      }
    }
    return worte;
  }

  // Zeilen für eine Breite umbrechen. Überlange Wörter werden nach Zeichen getrennt.
  umbruch(inhalt, breite, size, o) {
    const K = this.K;
    const opt = o || {};
    const worte = this.woerter(inhalt, opt);
    const leer = mess(K, " ", size);
    const zeilen = [];
    let zeile = [];
    let w0 = 0;
    const abschliessen = () => {
      if (zeile.length) zeilen.push(zeile);
      zeile = [];
      w0 = 0;
    };
    for (const w of worte) {
      const b = mess(K, w.t, size);
      if (b > breite) {
        abschliessen();
        let rest = w.t;
        while (rest.length) {
          let n = rest.length;
          while (n > 1 && mess(K, rest.slice(0, n), size) > breite) n -= 1;
          zeilen.push([{ t: rest.slice(0, n), fett: w.fett, farbe: w.farbe, breite: mess(K, rest.slice(0, n), size), vorLuecke: 0 }]);
          rest = rest.slice(n);
        }
        continue;
      }
      if (zeile.length && w0 + leer + b > breite) abschliessen();
      const vor = zeile.length ? leer : 0;
      zeile.push({ t: w.t, fett: w.fett, farbe: w.farbe, breite: b, vorLuecke: vor });
      w0 += vor + b;
    }
    abschliessen();
    return zeilen.length ? zeilen : [[]];
  }

  zeichneZeile(zeile, x, yBasis, size, o) {
    if (this.trocken) return;
    const K = this.K;
    let cx = x;
    for (const w of zeile) {
      cx += w.vorLuecke || 0;
      zeichneText(K, this.page, w.t, cx, yBasis, size, { farbe: w.farbe || (o && o.farbe) || FARBE.tinte, fett: w.fett });
      cx += w.breite;
    }
  }

  // Absatz mit Umbruch; gibt die Höhe zurück
  absatz(inhalt, o) {
    const opt = Object.assign({ size: 10, zeilenhoehe: 1.32, einzug: 0, nach: 4, breite: BREITE }, o || {});
    const x = (opt.x === undefined ? RAND : opt.x) + opt.einzug;
    const breite = opt.breite - opt.einzug;
    const zeilen = this.umbruch(inhalt, breite, opt.size, opt);
    const zh = opt.size * opt.zeilenhoehe;
    let hoehe = 0;
    for (let i = 0; i < zeilen.length; i++) {
      if (this.seitenAnzahl === 0 || this.y - zh < UNTEN) this.neueSeite();
      this.zeichneZeile(zeilen[i], x, this.y - opt.size * 0.92, opt.size, opt);
      this.y -= zh;
      hoehe += zh;
    }
    this.y -= opt.nach;
    this.merkeText(inhalt, "absatz", opt.kennung);
    return hoehe + opt.nach;
  }

  ueberschrift(s, stufe, dahinter) {
    const K = this.K;
    const groessen = { 1: 19, 2: 13, 3: 10.5 };
    const size = groessen[stufe || 2];
    const vor = stufe === 1 ? 0 : stufe === 3 ? 6 : 12;
    const zeilen = this.umbruch(s, BREITE, size, { fett: true });
    const hoehe = zeilen.length * size * 1.25;
    this.platz(vor + hoehe + (stufe === 3 ? 4 : 8) + (dahinter || 26)); // mindestens ein paar Zeilen dahinter
    this.y -= vor;
    for (const z of zeilen) {
      this.zeichneZeile(z, RAND, this.y - size * 0.92, size, { farbe: FARBE.blau });
      this.y -= size * 1.25;
    }
    if (stufe === 2 && !this.trocken) zeichneLinie(K, this.page, RAND, this.y - 1, A4[0] - RAND, this.y - 1, 0.6, FARBE.linie);
    this.y -= stufe === 3 ? 3 : 7;
    this.merkeText(s, "ueberschrift");
  }

  // Liste mit Aufzählungszeichen oder Nummern; items: Text oder Läufe, oder { inhalt, unter: [Punkt, …] } mit Unterpunkten
  // (kleiner Strich, eingerückt; die Nummern zählen nur die Hauptpunkte)
  liste(items, o) {
    const opt = Object.assign({ size: 10, marker: "•", nach: 3, einzug: 0 }, o || {});
    const abstandMarker = opt.markerBreite || (opt.marker === "nummer" ? 16 : 11);
    items.forEach((eintrag, i) => {
      const it = eintrag && eintrag.unter ? eintrag.inhalt : eintrag;
      const zeilen = this.umbruch(it, BREITE - opt.einzug - abstandMarker, opt.size, opt);
      const zh = opt.size * 1.32;
      if (this.seitenAnzahl === 0 || this.y - zh * Math.min(2, zeilen.length) < UNTEN) this.neueSeite();
      // Ein Punkt mit Unterpunkten bleibt zusammen: Die Unterpunkte stehen nicht allein oben auf der nächsten Seite.
      if (eintrag && eintrag.unter) this.platz(zeilen.length * zh + eintrag.unter.length * (zh + 1) + 6);
      const marker = opt.marker === "nummer" ? String(i + 1) + "." : opt.marker;
      if (!this.trocken) zeichneText(this.K, this.page, marker, RAND + opt.einzug, this.y - opt.size * 0.92, opt.size, { farbe: FARBE.blau, fett: opt.marker === "nummer" });
      zeilen.forEach((z, k) => {
        if (k > 0 && this.y - zh < UNTEN) this.neueSeite();
        this.zeichneZeile(z, RAND + opt.einzug + abstandMarker, this.y - opt.size * 0.92, opt.size, opt);
        this.y -= zh;
      });
      this.y -= eintrag && eintrag.unter ? 1 : opt.nach;
      this.merkeText(it, "liste");
      if (eintrag && eintrag.unter) {
        this.liste(eintrag.unter, { size: opt.size, marker: "–", markerBreite: 11, nach: 1, einzug: opt.einzug + abstandMarker, farbe: opt.farbe });
        this.y -= opt.nach - 2;
      }
    });
    this.y -= 2;
  }

  // Tabelle. spalten: [{ w (Anteil), titel }]; zeilen: Zellen als Text oder Läufe.
  tabelle(spalten, zeilen, o) {
    const K = this.K;
    const opt = Object.assign({ size: 8.5, polster: 3, kopf: true, zebra: false }, o || {});
    const summe = spalten.reduce((s, c) => s + c.w, 0);
    const breiten = spalten.map((c) => (c.w / summe) * BREITE);
    const xs = [];
    let cx = RAND;
    for (const b of breiten) {
      xs.push(cx);
      cx += b;
    }
    const zh = opt.size * 1.3;
    const messeZeile = (zellen, fett) => {
      const umb = zellen.map((z, i) => this.umbruch(z, breiten[i] - 2 * opt.polster, opt.size, { fett: fett }));
      const n = Math.max(1, ...umb.map((u) => u.length));
      return { umb: umb, hoehe: n * zh + 2 * opt.polster - 1 };
    };
    const zeichneKopf = () => {
      if (!opt.kopf) return;
      const m = messeZeile(spalten.map((c) => c.titel || ""), true);
      this.platz(m.hoehe + 2);
      if (!this.trocken) zeichneRechteck(K, this.page, RAND, this.y - m.hoehe, BREITE, m.hoehe, { fuellung: FARBE.hell });
      m.umb.forEach((u, i) => u.forEach((z, k) => this.zeichneZeile(z, xs[i] + opt.polster, this.y - opt.polster - opt.size * 0.92 - k * zh + 0.5, opt.size, { farbe: FARBE.blau })));
      this.y -= m.hoehe;
    };
    zeichneKopf();
    zeilen.forEach((zellen, ri) => {
      const m = messeZeile(zellen, false);
      if (this.y - m.hoehe < UNTEN) {
        this.neueSeite();
        zeichneKopf();
      }
      if (!this.trocken) {
        if (opt.zebra && ri % 2 === 1) zeichneRechteck(K, this.page, RAND, this.y - m.hoehe, BREITE, m.hoehe, { fuellung: FARBE.flaeche });
        zeichneLinie(K, this.page, RAND, this.y - m.hoehe, A4[0] - RAND, this.y - m.hoehe, 0.4, FARBE.linie);
      }
      m.umb.forEach((u, i) => u.forEach((z, k) => this.zeichneZeile(z, xs[i] + opt.polster, this.y - opt.polster - opt.size * 0.92 - k * zh + 0.5, opt.size, {})));
      this.y -= m.hoehe;
    });
    this.y -= 6;
  }

  // waagerechte Trennlinie über die Textbreite
  trenner() {
    this.platz(8);
    if (!this.trocken) zeichneLinie(this.K, this.page, RAND, this.y - 2, A4[0] - RAND, this.y - 2, 0.5, FARBE.linie);
    this.y -= 8;
  }

  // Kasten mit Angaben (hellblau): paare = [[Beschriftung, Wert], ...] in zwei Spalten; leere Werte entfallen
  // (paare mit dritter Stelle true bleiben auch leer stehen).
  // Ein Wert, der in seiner Spalte nicht mit mindestens 8 pt passt (zum Beispiel „D1-Jugend oder D3-Jugend (teilt die
  // Jugendleitung ein)“), bekommt eine eigene Reihe über die volle Breite.
  angabenKasten(paare0, o) {
    const K = this.K;
    const opt = Object.assign({ size: 9.5 }, o || {});
    const paare = paare0.filter((p) => hatText(p[1]) || p[2] === true);
    if (!paare.length) return;
    const spaltenB = (BREITE - 24) / 2;
    const zeilenHoehe = opt.size * 1.5;
    const labelSize = opt.size - 1.5;
    const labelBreite = (p) => mess(K, sicher(K, p[0] + ":", false), labelSize) + 6;
    const zuBreit = (p) => mess(K, sicher(K, p[1], false), 8) > spaltenB - labelBreite(p) - 2;
    // Reihen bilden: zwei Einträge nebeneinander, breite Einträge allein
    const reihen = [];
    let offen = null;
    paare.forEach((p) => {
      if (zuBreit(p)) {
        if (offen) reihen.push(offen);
        offen = null;
        reihen.push([p]);
        reihen[reihen.length - 1].breit = true;
      } else if (offen) {
        offen.push(p);
        reihen.push(offen);
        offen = null;
      } else {
        offen = [p];
      }
    });
    if (offen) reihen.push(offen);
    const h = reihen.length * zeilenHoehe + 12;
    // Beschriftungen je Spalte gleich breit (breite Einträge ausgenommen)
    const labelB = [0, 0];
    reihen.forEach((r) => {
      if (r.breit) return;
      r.forEach((p, sp) => {
        labelB[sp] = Math.max(labelB[sp], labelBreite(p));
      });
    });
    this.platz(h + 6);
    if (!this.trocken) zeichneRechteck(K, this.page, RAND, this.y - h, BREITE, h, { fuellung: FARBE.flaeche, rand: FARBE.linie, randBreite: 0.5 });
    reihen.forEach((r, re) => {
      r.forEach((p, sp) => {
        const x = RAND + 8 + sp * (spaltenB + 8);
        const yb = this.y - 6 - re * zeilenHoehe - opt.size;
        if (this.trocken) return;
        zeichneText(K, this.page, sicher(K, p[0] + ":", false), x, yb, labelSize, { farbe: FARBE.tinte3 });
        const lb = r.breit ? labelBreite(p) : labelB[sp];
        const platzWert = (r.breit ? BREITE - 16 : spaltenB) - lb;
        const pass = passeWertAn(K, sicher(K, p[1], true), platzWert, opt.size, 6);
        zeichneText(K, this.page, pass.text, x + lb, yb, pass.groesse, { farbe: FARBE.tinte, fett: true });
      });
    });
    this.y -= h + 8;
  }

  // Kästchen mit Text daneben; gesetzt: angekreuzt, null: leer
  kaestchenZeile(gesetzt, inhalt, o) {
    const opt = Object.assign({ size: 10, seite: 9 }, o || {});
    const zeilen = this.umbruch(inhalt, BREITE - 18, opt.size, opt);
    const zh = opt.size * 1.32;
    this.platz(zeilen.length * zh + 4);
    if (!this.trocken) zeichneKaestchen(this.K, this.page, RAND + 1, this.y - opt.seite - 0.5, opt.seite, gesetzt === true);
    zeilen.forEach((z) => {
      this.zeichneZeile(z, RAND + 18, this.y - opt.size * 0.92, opt.size, opt);
      this.y -= zh;
    });
    this.y -= opt.nach === undefined ? 3 : opt.nach;
    this.merkeText(inhalt, "kaestchen");
  }

  // Zeile mit Schreiblinien: felder = [{ label, wert, w, name, wer, ausnahme }] (w als Anteil). Ein Wert steht über der
  // Linie, die Beschriftung darunter. hoehe: Abstand der Linie von der Oberkante der Zeile. wer: "familie" (Standard),
  // "verein" oder "arzt"; Felder der Familie werden für die Prüfung gemerkt (siehe eingabe).
  feldZeile(felder, o) {
    const K = this.K;
    const opt = Object.assign({ hoehe: 24, size: 10 }, o || {});
    const summe = felder.reduce((s, f) => s + (f.w || 1), 0);
    const luecke = 10;
    const nutz = BREITE - luecke * (felder.length - 1);
    this.platz(opt.hoehe + 16);
    let x = RAND;
    const yLinie = this.y - opt.hoehe;
    felder.forEach((f) => {
      const b = ((f.w || 1) / summe) * nutz;
      if (!this.trocken) {
        if ((f.wer || "familie") === "familie") this.eingabe({ name: f.name || f.label, leer: !hatText(f.wert), ausnahme: f.ausnahme === true, wert: text(f.wert) });
        zeichneLinie(K, this.page, x, yLinie, x + b, yLinie, 0.5, FARBE.tinte3);
        zeichneText(K, this.page, sicher(K, f.label, false), x, yLinie - 8.5, 7.5, { farbe: FARBE.tinte3 });
        if (hatText(f.wert)) {
          // zu lange Werte werden erst kleiner (bis 6 pt) und dann mit „…“ gekürzt; der Laufzettel nennt das
          const pass = passeWertAn(K, sicher(K, f.wert, true), b - 2, opt.size, 6);
          if (pass.text !== sicher(K, f.wert, false)) K.hinweiseIntern.push("Feld „" + f.label + "“ wurde gekürzt, weil der Platz nicht reicht");
          zeichneText(K, this.page, pass.text, x + 1, yLinie + 3, pass.groesse, { farbe: FARBE.tinte });
        }
      }
      x += b + luecke;
    });
    this.y = yLinie - 16;
  }

  // Unterschriftsblock: links "Ort, Datum", rechts "Unterschrift" mit Bild oder Markierung.
  // o: { formular, stelleKey, wer, name (Klartext der Person, optional) }
  unterschriftBlock(o) {
    const K = this.K;
    const h = 84;
    this.platz(h);
    const yLinie = this.y - 58;
    const xOD = RAND;
    const wOD = 170;
    const xU = RAND + 200;
    const wU = BREITE - 200;
    const st = { x: xU, y: yLinie - 2, breite: wU, hoehe: 40 };
    this.stellen[o.stelleKey] = this.seitenAnzahl - 1;
    if (!this.trocken) {
      zeichneLinie(K, this.page, xOD, yLinie, xOD + wOD, yLinie, 0.5, FARBE.tinte3);
      zeichneText(K, this.page, "Ort, Datum", xOD, yLinie - 8.5, 7.5, { farbe: FARBE.tinte3 });
      zeichneLinie(K, this.page, xU, yLinie, xU + wU, yLinie, 0.5, FARBE.tinte3);
      const bes = "Unterschrift" + (o.name ? ": " + sicher(K, o.name, true) : "") + " (" + werKlartext(o.wer) + ")";
      let g = 7.5;
      while (mess(K, bes, g) > wU && g > 5.5) g -= 0.2;
      zeichneText(K, this.page, bes, xU, yLinie - 8.5, g, { farbe: FARBE.tinte3 });
      const r = zeichneStelle(K, this.page, st, { formular: o.formular, stelleKey: o.stelleKey, wer: o.wer, stift: o.stift === true, rueckfall: o.rueckfall === true });
      if (r.art === "bild") {
        const t = ortDatumText(K);
        let g2 = 10;
        while (mess(K, t, g2) > wOD - 2 && g2 > 6) g2 -= 0.25;
        zeichneText(K, this.page, t, xOD + 1, yLinie + 3, g2, { farbe: FARBE.tinte });
      }
    }
    this.y -= h;
  }

  // Stift-Zeilen nebeneinander (nie am Bildschirm), zum Beispiel für die Absprache zur Medikamentengabe:
  // zeilen = [{ stelleKey, wer, label }]. Sie sind Zusatz-Stellen und gehören nicht zu den Stellen der Regeln.
  stiftZeilen(formular, zeilen) {
    const K = this.K;
    const h = 62;
    this.platz(h);
    const luecke = 14;
    const b = (BREITE - luecke * (zeilen.length - 1)) / zeilen.length;
    const yLinie = this.y - 44;
    let x = RAND;
    zeilen.forEach((z) => {
      this.stellen[z.stelleKey] = this.seitenAnzahl - 1;
      if (!this.trocken) {
        zeichneLinie(K, this.page, x, yLinie, x + b, yLinie, 0.5, FARBE.tinte3);
        zeichneText(K, this.page, sicher(K, z.label, false), x, yLinie - 8.5, 7.5, { farbe: FARBE.tinte3 });
        zeichneStelle(K, this.page, { x: x, y: yLinie - 2, breite: b, hoehe: 40 }, { formular: formular, stelleKey: z.stelleKey, wer: z.wer, stift: true, zusatz: true });
      }
      x += b + luecke;
    });
    this.y -= h;
  }
}

// ---------------------------------------------------------------------------
// Unterschriften
// ---------------------------------------------------------------------------

// Wer unterschreibt in Klartext für Markierungen und Übersichten (kurz)
function werKlartext(wer) {
  return WER_KLARTEXT[wer] || wer;
}

// Name einer unterschreibenden Person (aus den Antworten) oder ""
function personName(K, wer) {
  const sb = liste(K.a.sorgeberechtigte);
  const voll = (p) => [text(objekt(p).vorname), text(objekt(p).nachname)].filter(Boolean).join(" ");
  if (wer === "mitglied") return K.minderjaehrig ? "" : K.person.name;
  if (wer === "sorgeberechtigte") return voll(sb[0]);
  if (wer === "sorgeberechtigte_beide") return voll(sb[1]);
  if (wer === "kontoinhaber") {
    const ki = text(objekt(K.a.zahlung).kontoinhaber);
    if (ki === "andere") return [text(K.a.zahlung.kiVorname), text(K.a.zahlung.kiNachname)].filter(Boolean).join(" ");
    if (ki === "sorgeberechtigt") return voll(sb[0]);
    return K.minderjaehrig ? "" : K.person.name;
  }
  return "";
}

// Schlüssel in bilder.unterschriften für eine Rolle. Die Oberfläche fragt den Kontoinhaber nur dann eigens
// nach einer Unterschrift, wenn er eine andere Person ist (kontoinhaber = "andere"); ist es das Mitglied
// oder die Person mit Sorgerecht, gilt deren Unterschrift auch für das SEPA-Mandat. Fehlt das passende
// Bild, bleibt die Stelle leer und bekommt die Markierung.
function bildSchluessel(K, wer) {
  const u = K.bilder.unterschriften;
  const hat = (k) => u[k] && u[k].bytes && u[k].bytes.length;
  if (wer === "mitglied") return hat("mitglied") ? "mitglied" : null;
  if (wer === "sorgeberechtigte") return hat("sorgeberechtigte") ? "sorgeberechtigte" : null;
  // Ein Elternteil reicht (Jugendleitung, 08.10.2026). Nur getrennt lebende Eltern ohne Einverständnis brauchen den zweiten Elternteil,
  // und er unterschreibt mit Stift: Die Oberfläche kennt dafür kein Bild, die Stelle bekommt immer die Markierung.
  if (wer === "sorgeberechtigte_beide") return null;
  if (wer === "spieler") return hat("spieler") ? "spieler" : null;
  if (wer === "kontoinhaber") {
    const ki = text(objekt(K.a.zahlung).kontoinhaber);
    if (ki === "sorgeberechtigt") return hat("sorgeberechtigte") ? "sorgeberechtigte" : null;
    if (ki === "mitglied") return hat("mitglied") ? "mitglied" : null;
    return hat("kontoinhaber") ? "kontoinhaber" : null; // "andere" (oder noch nicht angegeben)
  }
  return null; // arzt und verein unterschreiben nie am Bildschirm
}

// Darf an dieser Stelle des Formulars am Bildschirm unterschrieben werden?
function digitalErlaubt(K, formular) {
  if (K.a.unterschriftWeg !== "bildschirm") return false;
  const eintrag = K.formulare[formular];
  if (eintrag && eintrag.digitaleUnterschrift) return eintrag.digitaleUnterschrift === "erlaubt";
  return true; // eigene Blätter des Vereins
}

// Unterschriftsbilder, die tatsächlich gebraucht werden, im Dokument einbetten
async function betteUnterschriften(K) {
  K.sig = {};
  if (K.a.unterschriftWeg !== "bildschirm") return;
  for (const u of liste(K.e.unterschriften)) {
    if (!digitalErlaubt(K, u.formular)) continue;
    const key = bildSchluessel(K, u.wer);
    if (!key || K.sig[key]) continue;
    const b = K.bilder.unterschriften[key];
    try {
      if (bildArt(b.bytes) !== "png") continue;
      const img = await K.doc.embedPng(b.bytes);
      K.sig[key] = { img: img, breitePx: Number(b.breitePx) > 0 ? Number(b.breitePx) : img.width, hoehePx: Number(b.hoehePx) > 0 ? Number(b.hoehePx) : img.height };
    } catch (fehler) {
      // unlesbares Bild: wie "kein Bild", die Stelle bekommt die Markierung
    }
  }
}

function ortDatumText(K) {
  const ort = text(objekt(K.a.anschrift).ort);
  return (ort ? sicher(K, ort, true) + ", " : "") + K.heuteDe;
}

// Markierung "Hier mit Stift unterschreiben" in Vereinsblau: kurze Schrift oben im Kasten,
// unten bleibt Platz zum Unterschreiben. Ein kleines Dreieck zeigt zur Linie.
function zeichneMarkierung(K, page, st, wer) {
  const size = 6.6;
  const x = st.x + 3;
  const ziel = "Hier mit Stift unterschreiben:";
  const wt = sicher(K, werKlartext(wer), false);
  const einzeilig = ziel + " " + wt;
  const oben = st.y + st.hoehe;
  const fit = mess(K, einzeilig, size) <= st.breite - 6;
  if (fit) {
    zeichneText(K, page, ziel, x, oben - 8, size, { farbe: FARBE.markierung });
    zeichneText(K, page, wt, x + mess(K, ziel + " ", size), oben - 8, size, { farbe: FARBE.markierung, fett: true });
    merkeFlaeche(K, page, "markierung", x, oben - 10, mess(K, einzeilig, size), 9);
  } else {
    zeichneText(K, page, ziel, x, oben - 8, size, { farbe: FARBE.markierung });
    // zweite Zeile: bei Bedarf kleiner, damit sie in den Kasten passt
    let zeile2 = wt;
    let s2 = size;
    while (mess(K, zeile2, s2) > st.breite - 6 && s2 > 5.2) s2 -= 0.2;
    zeichneText(K, page, zeile2, x, oben - 16, s2, { farbe: FARBE.markierung, fett: true });
    merkeFlaeche(K, page, "markierung", x, oben - 18, Math.max(mess(K, ziel, size), mess(K, zeile2, s2)), 17);
  }
  // Pfeil (Dreieck) links unten auf der Linie
  if (st.hoehe >= 20) {
    page.drawSvgPath("M 0 0 L 5 0 L 2.5 4.2 Z", { x: st.x + 1, y: st.y + 6.5, color: rgbF(K, FARBE.markierung) });
  }
}

// Entscheidung für eine Stelle: "bild" (Unterschriftsbild vorhanden, erlaubt und alle Erklärungen auf der Seite
// beantwortet) oder "stift". grund: warum ein mögliches Bild nicht gesetzt wird (unbeantwortete Erklärung).
function stelleEntscheidung(K, formular, wer, stelleKey) {
  if (wer === "arzt" || wer === "verein") return { art: "stift", grund: "" };
  const key = bildSchluessel(K, wer);
  if (!(key && digitalErlaubt(K, formular) && K.sig && K.sig[key])) return { art: "stift", grund: "" };
  const grund = stelleKey ? erklaerungFehlt(K, formular, stelleKey) : "";
  return grund ? { art: "stift", grund: grund } : { art: "bild", grund: "" };
}

function stelleArt(K, formular, wer, stelleKey) {
  return stelleEntscheidung(K, formular, wer, stelleKey).art;
}

const MEDIEN_FOTO = ["intern", "web", "presse", "dokumentation"];

function familienMitglieder(K) {
  return liste(objekt(K.a.beitrag).familie).filter((m) => hatText(objekt(m).vorname) || hatText(objekt(m).nachname));
}

// Eine Bildschirm-Unterschrift steht nur unter beantworteten Erklärungen. Fehlt auf dem Vordruck eine Angabe, die
// erst nach der Unterschrift von Hand dazukäme, gilt die Stelle als Stift-Stelle. Leer, wenn alles beantwortet ist.
// Die eigenen Seiten des Vereins lösen das anders: dort steht „–“ statt eines leeren Feldes.
function erklaerungFehlt(K, formular, stelleKey) {
  if (formular !== "aufnahmeantrag") return "";
  const a = K.a;
  if (stelleKey === "s3.unterschrift") {
    const ein = objekt(a.einwilligungen);
    if (ein.fotos !== "ja" && ein.fotos !== "nein") return "Die " + unterlageName(K, "U04") + " ist nicht beantwortet.";
    if (ein.fotos === "ja" && !liste(ein.medien).some((m) => MEDIEN_FOTO.includes(m))) return "Bei der " + unterlageName(K, "U04") + " ist kein Medium gewählt.";
    return "";
  }
  if (stelleKey === "s4.unterschrift") {
    if (!ibanNormal(objekt(a.zahlung).iban)) return "Bei der " + unterlageName(K, "U05") + " fehlt die IBAN.";
    const p = kontoinhaber(K).person;
    if (!p.nachname && !p.vorname) return "Bei der " + unterlageName(K, "U05") + " fehlt der Name des Kontoinhabers.";
    return "";
  }
  if (stelleKey === "s2.unterschrift" || stelleKey === "s2.unterschrift_sorgeberechtigte") {
    // Seite 2 unterschreibt den Aufnahmeantrag mit dem Kästchen zur Satzung auf Seite 1 (die Oberfläche verlangt es
    // bei Bildschirm-Unterschrift; fehlt es doch, käme das Kreuz erst nach der Unterschrift von Hand dazu)
    const gruende = [];
    if (a.satzung !== true) gruende.push("Satzung nicht bestätigt.");
    if (liste(K.e.formulare).includes("familienliste") && !familienMitglieder(K).length) gruende.push("Die " + unterlageName(K, "U02") + " ist leer, obwohl der Familienbeitrag gewählt ist.");
    return gruende.join(" ");
  }
  return "";
}

// Eine Unterschriftsstelle zeichnen: Bild (digital) oder Markierung (Stift).
// st: { x, y, breite, hoehe }; spec: { formular, stelleKey, wer, stift, zusatz, rueckfall }.
// stift: immer Markierung (Zusatz-Stellen und Rückfälle); zusatz: keine Stelle der Regeln; rueckfall: die Regeln kennen die Stelle nicht.
// Gibt { art: "bild" | "stift" } zurück und trägt die Stelle in K.stellen ein.
function zeichneStelle(K, page, st, spec) {
  const ent = spec.stift ? { art: "stift", grund: "" } : stelleEntscheidung(K, spec.formular, spec.wer, spec.stelleKey);
  const art = ent.art;
  const key = art === "bild" ? bildSchluessel(K, spec.wer) : null;
  if (ent.grund) {
    const js = stelleAusJson(K, spec.formular, spec.stelleKey);
    const meldung = eintragName(spec.formular) + (js ? " Seite " + js.seite : "") + ": " + ent.grund + " Die Unterschrift steht deshalb als Stift-Markierung im Formular.";
    if (!K.hinweiseIntern.includes(meldung)) K.hinweiseIntern.push(meldung);
  }
  if (art === "bild") {
    const sig = K.sig[key];
    const m = Math.min(st.breite / sig.breitePx, st.hoehe / sig.hoehePx, MAX_PT_JE_PX);
    page.drawImage(sig.img, { x: st.x, y: st.y, width: sig.breitePx * m, height: sig.hoehePx * m });
  } else {
    zeichneMarkierung(K, page, st, spec.wer);
  }
  K.stellen.push({ formular: spec.formular, stelleKey: spec.stelleKey, wer: spec.wer, pageRef: page, art: art, bild: key, zusatz: spec.zusatz === true, rueckfall: spec.rueckfall === true, x: st.x, y: st.y, breite: st.breite, hoehe: st.hoehe });
  return { art: art };
}

// ---------------------------------------------------------------------------
// Vordrucke mit Formularfeldern (HFV): füllen, glätten
// ---------------------------------------------------------------------------

function passendeGroesse(font, s, breite, hoehe) {
  let g = Math.max(6, Math.min(11, hoehe - 5));
  const w = font.widthOfTextAtSize(s, g);
  if (w > breite) g = Math.max(5.5, (g * breite) / w);
  return Math.floor(g * 10) / 10;
}

// erste Bezeichnung in Anführungszeichen aus "bedeutung" (z. B. „Familienname:“), sonst der Feldname
function feldBezeichnung(name, jf) {
  const m = /„([^“]+)“/.exec(text(jf.bedeutung));
  return m ? m[1].replace(/[:\s]+$/, "") : name;
}

const LETZTER_VERBAND_HESSEN = "Hessischer Fußball-Verband";

// Zusätzliche Schutzregeln zu den Ausdrücken in der JSON: Kästchen nur, wenn die Angabe zum Fall passt
// (veraltete Antworten sollen nichts ankreuzen), und der Landesverband des alten Vereins.
function feldWert(K, formular, name, jf, ctx) {
  const e = K.e;
  if (jf.typ === "checkbox") {
    if (!bewerteBedingung(jf.quelle, ctx)) return { gesetzt: false };
    if (formular === "hfv_antrag") {
      if (name === "K6" && !liste(e.faelle).includes("F13")) return { gesetzt: false };
      if (["K7", "K8", "K9"].includes(name) && !(K.a.geschlecht === "d" || K.a.geschlecht === "ohne_angabe")) return { gesetzt: false };
    }
    return { gesetzt: true };
  }
  if (jf.bedingung && !bewerteBedingung(jf.bedingung, ctx)) return { wert: null, uebersprungen: true };
  let wert = bewerteWert(jf.quelle, ctx, jf.maxLaenge);
  if (formular === "hfv_antrag" && name === "letzterVerband" && fehltWert(wert)) {
    const av = objekt(K.a.alterVerein);
    if (av.region === "hessen") wert = LETZTER_VERBAND_HESSEN;
    else if (av.region === "ausland" && hatText(av.land)) wert = landName(av.land);
  }
  return { wert: wert };
}

// Füllt einen Vordruck mit Formularfeldern und gibt ein eigenes Dokument mit geglätteten Seiten zurück.
async function fuelleVorlage(K, key) {
  const L = K.L;
  const eintrag = K.formulare[key];
  const bytes = K.vorlagen[key];
  if (!eintrag) throw new Error("konfig.formulare." + key + " fehlt");
  if (!bytes || !bytes.length) throw new Error("Vorlage fehlt: " + key);
  const d = await L.PDFDocument.load(bytes, { updateMetadata: false });
  if (eintrag.seiten && d.getPageCount() !== eintrag.seiten) {
    throw new Error("Vorlage " + key + " hat " + d.getPageCount() + " statt " + eintrag.seiten + " Seiten (Vordruck geändert)");
  }
  d.registerFontkit(K.opts.fontkit);
  const font = await d.embedFont(K.opts.schrift, { subset: true });
  const form = d.getForm();
  const ctx = { a: K.a, e: K.e, konfig: K.konfig };
  const beruehrt = new Set();
  const felder = objekt(eintrag.felder);
  for (const [name, jf] of Object.entries(felder)) {
    if (jf.fuellt !== "assistent") continue;
    let r;
    try {
      r = feldWert(K, key, name, jf, ctx);
    } catch (fehler) {
      throw new Error("Ausdruck in " + key + "." + name + ": " + fehler.message);
    }
    if (jf.typ === "checkbox") {
      let cb;
      try {
        cb = form.getCheckBox(name);
      } catch (fehler) {
        throw new Error("Vordruck " + key + " geändert: Kästchen " + name + " fehlt");
      }
      if (r.gesetzt) {
        cb.check();
        beruehrt.add(name);
      }
      K.felder.push({ formular: key, feld: name, typ: "checkbox", wert: !!r.gesetzt, seite: jf.seite });
      continue;
    }
    if (r.uebersprungen) continue;
    if (fehltWert(r.wert)) {
      if (!jf.leerWennFehlt) K.fehlendeAngaben.push(eintragName(key) + ": " + feldBezeichnung(name, jf));
      continue;
    }
    let s = sicher(K, r.wert, true);
    if (jf.maxLaenge && s.length > jf.maxLaenge) {
      s = s.slice(0, jf.maxLaenge);
      K.hinweiseIntern.push(eintragName(key) + ": " + feldBezeichnung(name, jf) + " wurde auf " + jf.maxLaenge + " Zeichen gekürzt");
    }
    let tf;
    try {
      tf = form.getTextField(name);
    } catch (fehler) {
      throw new Error("Vordruck " + key + " geändert: Feld " + name + " fehlt");
    }
    tf.setText(s);
    try {
      tf.setFontSize(passendeGroesse(font, s, jf.rect[2] - 6, jf.rect[3]));
    } catch (fehler) {
      // Feld ohne Schriftvorgabe: Standardgröße
    }
    beruehrt.add(name);
    K.felder.push({ formular: key, feld: name, typ: "text", wert: s, seite: jf.seite, rect: jf.rect });
  }
  form.updateFieldAppearances(font);
  // Unberührte Felder entfernen: ihre leeren Erscheinungsbilder sind keine gültigen Formulare und die
  // gedruckten Rahmen liegen ohnehin im Seiteninhalt.
  for (const f of form.getFields()) {
    if (beruehrt.has(f.getName())) continue;
    try {
      form.removeField(f);
    } catch (fehler) {
      // lässt sich ein Feld nicht entfernen, bleibt es; flatten() meldet dann den Fehler
    }
  }
  form.flatten({ updateFieldAppearances: false });
  return d;
}

// Einheitlicher Name eines Papiers (SCHNITTSTELLEN Abschnitt 9): Quelle ist de-regeln.js › formulare
function eintragName(key) {
  return (deRegeln.formulare && deRegeln.formulare[key]) || key;
}

// Erlaubnis für das Attest (U11): Eintrag in formulare, sonst der Name der Unterlage
function attestEinwilligungName() {
  return (deRegeln.formulare && deRegeln.formulare.attest_einwilligung) || objekt(objekt(deRegeln.unterlagen).U11).name || "Erlaubnis für das Attest";
}

// ---------------------------------------------------------------------------
// Aufnahmeantrag des Vereins (ohne Formularfelder): Texte, Kreuze, Zellen, Familie, Zusatzzeilen
// Vermessung: konfig.aufnahmeantragFelder (data/aufnahmeantrag-felder.json), Muster: assets/js/antrag/aufnahmeantrag.js
// ---------------------------------------------------------------------------

// Zusatzzeilen, die die Vermessung nicht enthält (wie ZUSAETZE in src/seiten/aufnahmeantrag.mjs)
const ZUSAETZE = {
  "s2.zusatz_unterzeichner": { typ: "text", seite: 2, x: 312.0, y: 115.2, breite: 232.0, schriftgroesse: 8, min_schriftgroesse: 6, ausrichtung: "links" },
  "s3.zusatz_unterzeichner": { typ: "text", seite: 3, x: 313.5, y: 117.0, breite: 188.0, schriftgroesse: 8, min_schriftgroesse: 6, ausrichtung: "links", zeilen_max: 2, zeilenabstand: 1.2 },
  // Name der zweiten Person mit Sorgerecht: links neben der zusätzlich gezeichneten zweiten Unterschriftslinie
  // (Linie ab x 310,9 bei y 74; die Fläche links davon ist im Vordruck frei), rechtsbündig bis kurz vor die Linie
  "s2.zusatz_zweite_person": { typ: "text", seite: 2, x: 33.2, y: 76.6, breite: 271.7, schriftgroesse: 8, min_schriftgroesse: 6, ausrichtung: "rechts" },
};

const UNTERGRENZE = 6;
const EINZEILIG_AB = 7;

// Schriftgröße nach der Regel der Vermessung: erst auf die Linie einpassen; würde die Schrift dabei kleiner
// als 9 pt, den freien Platz daneben (breite_max) nutzen; sonst bis min_schriftgroesse verkleinern.
function feldGroesse(V, feld, s, messen) {
  const g0 = feld.schriftgroesse || V.schriftgroesse;
  const w1 = messen(s, 1);
  if (!w1) return g0;
  const gmin = feld.min_schriftgroesse || V.min_schriftgroesse;
  let g = Math.min(g0, feld.breite / w1);
  if (g < 9 && feld.breite_max) g = Math.min(g0, Math.max(g, feld.breite_max / w1));
  if (g < gmin) g = (feld.breite_max || feld.breite) / w1;
  return Math.floor(g * 100) / 100;
}

function feldUmbruch(s, breite, groesse, messen) {
  const zeilen = [];
  let zeile = "";
  for (const wort of s.split(" ")) {
    const probe = zeile ? zeile + " " + wort : wort;
    if (messen(probe, groesse) <= breite) {
      zeile = probe;
      continue;
    }
    if (!zeile || messen(wort, groesse) > breite) return null;
    zeilen.push(zeile);
    zeile = wort;
  }
  if (zeile) zeilen.push(zeile);
  return zeilen;
}

function feldSatz(V, feld, s, messen) {
  const einzeilig = feldGroesse(V, feld, s, messen);
  const g0 = feld.schriftgroesse || V.schriftgroesse;
  const max = feld.zeilen_max || 1;
  if (max > 1 && einzeilig < Math.min(g0, EINZEILIG_AB)) {
    for (let g = g0; g >= UNTERGRENZE; g -= 0.25) {
      const zeilen = feldUmbruch(s, feld.breite, g, messen);
      if (zeilen && zeilen.length <= max) return { groesse: g, zeilen: zeilen };
    }
  }
  return { groesse: einzeilig, zeilen: [s] };
}

// Angaben des Kontoinhabers für das SEPA-Mandat
function kontoinhaber(K) {
  const a = K.a;
  const z = objekt(a.zahlung);
  const sb = liste(a.sorgeberechtigte);
  const ki = text(z.kontoinhaber);
  const anschrift = objekt(a.anschrift);
  let person;
  if (ki === "andere") person = { nachname: text(z.kiNachname), vorname: text(z.kiVorname) };
  else if (ki === "sorgeberechtigt") person = { nachname: text(objekt(sb[0]).nachname), vorname: text(objekt(sb[0]).vorname) };
  else person = { nachname: K.person.nachname, vorname: K.person.vorname };
  const eigene = ki === "andere" && z.kiAnschriftGleich === false;
  return {
    person: person,
    strasse: eigene ? text(z.kiStrasse) : text(anschrift.strasse),
    plzOrt: eigene ? [text(z.kiPlz), text(z.kiOrt)].filter(Boolean).join(" ") : [text(anschrift.plz), text(anschrift.ort)].filter(Boolean).join(" "),
    mitgliedNennen: ki === "andere" || ki === "sorgeberechtigt",
  };
}

// Zeichnet alle Einträge des Aufnahmeantrags auf die vier (kopierten) Seiten.
// stellenFuer: Stellen, an denen ein Bild sitzt (für Ort und Datum)
function fuelleAufnahmeantrag(K, seiten, stellenBild) {
  const FD = objekt(K.konfig.aufnahmeantragFelder);
  const F = Object.assign({}, objekt(FD.felder), ZUSAETZE);
  const V = objekt(FD.vorgaben);
  if (!FD.felder || !V.schriftgroesse) throw new Error("konfig.aufnahmeantragFelder fehlt oder ist unvollständig");
  const a = K.a;
  const e = K.e;
  const schwarz = rgbF(K, FARBE.schwarz);
  const messen = (s, g) => K.font.widthOfTextAtSize(s, g);
  const seite = (feld) => seiten[feld.seite - 1];

  const T = {};
  const kreuze = [];
  const zellen = {};

  // Seite 1
  liste(objekt(e.beitrag).felder).forEach((k) => kreuze.push(k));
  T["s1.nachname"] = K.person.nachname;
  T["s1.vorname"] = K.person.vorname;
  T["s1.strasse"] = text(objekt(a.anschrift).strasse);
  T["s1.plz_ort"] = [text(objekt(a.anschrift).plz), text(objekt(a.anschrift).ort)].filter(Boolean).join(" ");
  const g = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text(a.geburtsdatum));
  if (g) {
    T["s1.geburtsdatum.tag"] = g[3];
    T["s1.geburtsdatum.monat"] = g[2];
    T["s1.geburtsdatum.jahr"] = g[1];
  }
  T["s1.telefon"] = text(a.telefon);
  T["s1.mobil"] = text(a.mobil);
  T["s1.email"] = text(a.email);
  if (a.satzung === true) kreuze.push("s1.satzung");

  // Seite 3: Zuordnungszeile und Foto-Einwilligung
  T["s3.zusatz_mitglied"] = "Mitglied: " + K.person.name + (g ? ", geb. " + datumDe(a.geburtsdatum) : "");
  const einw = objekt(a.einwilligungen);
  if (einw.fotos === "ja") {
    kreuze.push("s3.einwilligung.ja");
    liste(einw.medien).forEach((m) => {
      if (MEDIEN_FOTO.includes(m)) kreuze.push("s3.medien." + m);
    });
  } else if (einw.fotos === "nein") {
    kreuze.push("s3.einwilligung.nein");
  }
  // Name der unterschreibenden Person unter der Unterschrift (nur bei Minderjährigen)
  const erste = personName(K, "sorgeberechtigte");
  if (K.minderjaehrig && erste) {
    T["s2.zusatz_unterzeichner"] = "Erziehungsberechtigte/r: " + erste;
    T["s3.zusatz_unterzeichner"] = "Erziehungsberechtigte/r: " + erste;
  }
  // Name der zweiten Person mit Sorgerecht neben der zweiten Unterschriftslinie (nur wo die Regeln sie verlangen)
  const zweite = personName(K, "sorgeberechtigte_beide");
  if (K.minderjaehrig && zweite && liste(e.unterschriften).some((u) => u.formular === "aufnahmeantrag" && u.stelleKey === "s2.unterschrift_sorgeberechtigte")) {
    T["s2.zusatz_zweite_person"] = "Erziehungsberechtigte/r: " + zweite;
  }

  // Ort und Datum nur dort, wo eine Unterschrift am Bildschirm sitzt
  const ortDatum = ortDatumText(K);
  const bildSeiten = new Set(stellenBild);
  if (["s2.unterschrift", "s2.unterschrift_sorgeberechtigte"].some((k) => bildSeiten.has(k))) T["s2.ort_datum"] = ortDatum;
  if (bildSeiten.has("s3.unterschrift")) T["s3.ort_datum"] = ortDatum;

  // Seite 4: SEPA-Lastschriftmandat (nur bei Lastschrift)
  const z = objekt(a.zahlung);
  let auslandIban = "";
  if (z.art === "sepa") {
    const ki = kontoinhaber(K);
    T["s4.kontoinhaber.name"] = ki.person.nachname;
    T["s4.kontoinhaber.vorname"] = ki.person.vorname;
    T["s4.strasse"] = ki.strasse;
    T["s4.plz_ort"] = ki.plzOrt;
    if (ki.mitgliedNennen) T["s4.mitglied"] = K.person.name;
    T["s4.kreditinstitut"] = text(z.bank);
    const iban = ibanNormal(z.iban);
    if (iban.startsWith("DE")) zellen["s4.iban"] = iban.slice(2); // "DE" ist vorgedruckt
    else if (iban) auslandIban = iban;
    const bic = ibanNormal(z.bic);
    if (bic) zellen["s4.bic"] = bic;
    if (bildSeiten.has("s4.unterschrift")) T["s4.ort_datum"] = ortDatum;
    if (!ki.person.nachname && !ki.person.vorname) K.hinweiseIntern.push(unterlageName(K, "U05") + ": Name des Kontoinhabers fehlt");
  }

  const zeichneEintrag = (feldKey, s) => {
    const feld = F[feldKey];
    if (!feld) throw new Error("Feld fehlt in der Vermessung: " + feldKey);
    const t = sicher(K, s, true);
    if (!t) return;
    const satz = feldSatz(V, feld, t, messen);
    satz.zeilen.forEach((zeile, i) => {
      const b = messen(zeile, satz.groesse);
      const x = feld.ausrichtung === "mitte" ? feld.x - b / 2 : feld.ausrichtung === "rechts" ? feld.x + feld.breite - b : feld.x;
      const y = feld.y - i * satz.groesse * (feld.zeilenabstand || 1.2);
      schreibeAufVorlage(K, seite(feld), "feld:" + feldKey, zeile, x, y, satz.groesse);
    });
    K.felder.push({ formular: "aufnahmeantrag", feld: feldKey, typ: "text", wert: t, seite: feld.seite });
  };

  Object.keys(T).forEach((k) => {
    if (T[k]) zeichneEintrag(k, T[k]);
  });

  kreuze.forEach((k) => {
    const feld = F[k];
    if (!feld) throw new Error("Feld fehlt in der Vermessung: " + k);
    const ein = V.kreuz.einzug;
    const opt = { thickness: V.kreuz.strichstaerke, color: schwarz, lineCap: K.L.LineCapStyle.Round };
    seite(feld).drawLine(Object.assign({ start: { x: feld.x + ein, y: feld.y + ein }, end: { x: feld.x + feld.breite - ein, y: feld.y + feld.hoehe - ein } }, opt));
    seite(feld).drawLine(Object.assign({ start: { x: feld.x + ein, y: feld.y + feld.hoehe - ein }, end: { x: feld.x + feld.breite - ein, y: feld.y + ein } }, opt));
    K.felder.push({ formular: "aufnahmeantrag", feld: k, typ: "kreuz", wert: true, seite: feld.seite });
  });

  Object.keys(zellen).forEach((k) => {
    const feld = F[k];
    Array.from(sicher(K, zellen[k], true))
      .slice(0, feld.anzahl)
      .forEach((zeichen, i) => {
        const zelle = feld.zellen[i];
        const b = messen(zeichen, feld.schriftgroesse);
        schreibeAufVorlage(K, seite(feld), "zelle:" + k, zeichen, zelle.x - b / 2, feld.y, feld.schriftgroesse);
      });
    K.felder.push({ formular: "aufnahmeantrag", feld: k, typ: "zellen", wert: zellen[k], seite: feld.seite });
  });

  // IBAN außerhalb Deutschlands: die Zellen tragen ein vorgedrucktes "DE", deshalb steht die Nummer darunter
  if (auslandIban) {
    const feld = F["s4.iban"];
    const t = "IBAN (nicht aus Deutschland): " + ibanGruppiert(auslandIban);
    const groesse = Math.min(9, feldGroesse(V, { breite: 320, schriftgroesse: 9, min_schriftgroesse: 6 }, t, messen));
    schreibeAufVorlage(K, seite(feld), "ausland-iban", sicher(K, t, true), 33.2, feld.y - 15, groesse);
    K.felder.push({ formular: "aufnahmeantrag", feld: "s4.iban_ausland", typ: "text", wert: t, seite: feld.seite });
  }
  if (z.art !== "sepa") {
    // Zahlung auf Rechnung: Seite 4 bleibt frei, ein Hinweis erspart Rückfragen
    const hinweis = "Nicht ausgefüllt: Zahlung auf Rechnung, keine Lastschrift.";
    schreibeAufVorlage(K, seiten[3], "hinweis-rechnung", hinweis, 33.2, 84, 8.5, FARBE.markierung);
  }

  // Familienmitglieder (Seite 2): drei im Kasten, drei darunter
  const familie = liste(objekt(a.beitrag).familie)
    .filter((m) => hatText(objekt(m).vorname) || hatText(objekt(m).nachname))
    .map((m) => ({
      name: [text(m.nachname), text(m.vorname)].filter(Boolean).join(", "),
      geburtsdatum: datumDe(m.geburtsdatum),
    }));
  if (familie.length) {
    const feld = F["s2.familie"];
    const E = feld.erweiterung;
    const spaltenFeld = (spalte, y) => ({ seite: feld.seite, x: spalte.x, y: y, breite: spalte.breite, ausrichtung: "links", schriftgroesse: feld.schriftgroesse, min_schriftgroesse: feld.min_schriftgroesse });
    const einheitlich = Math.min(...familie.map((m) => feldGroesse(V, spaltenFeld(feld.spalten[0], 0), sicher(K, m.name, true), messen)));
    const eintrag = (spalte, y, inhalt, istName) => {
      const f = spaltenFeld(spalte, y);
      if (istName) {
        f.schriftgroesse = einheitlich;
        f.min_schriftgroesse = Math.min(einheitlich, f.min_schriftgroesse);
      }
      const t = sicher(K, inhalt, true);
      const satz = feldSatz(V, f, t, messen);
      schreibeAufVorlage(K, seite(feld), "familie", satz.zeilen[0], f.x, f.y, satz.groesse);
    };
    familie.slice(0, feld.max_im_kasten).forEach((m, i) => {
      eintrag(feld.spalten[i], feld.zeilen.name.y, m.name, true);
      eintrag(feld.spalten[i], feld.zeilen.geburtsdatum.y, m.geburtsdatum, false);
    });
    const rest = familie.slice(feld.max_im_kasten, feld.max_im_kasten + E.max);
    if (rest.length) {
      const s = seite(feld);
      schreibeAufVorlage(K, s, "familie-beschriftung", E.beschriftung_name, E.beschriftung_x, E.zeilen.name.y, E.beschriftung_groesse);
      schreibeAufVorlage(K, s, "familie-beschriftung", E.beschriftung_geburtsdatum, E.beschriftung_x, E.zeilen.geburtsdatum.y, E.beschriftung_groesse);
      rest.forEach((m, i) => {
        eintrag(feld.spalten[i], E.zeilen.name.y, m.name, true);
        eintrag(feld.spalten[i], E.zeilen.geburtsdatum.y, m.geburtsdatum, false);
      });
    }
    K.felder.push({ formular: "aufnahmeantrag", feld: "s2.familie", typ: "familie", wert: familie.length, seite: 2 });
    if (familie.length > feld.max_im_kasten + E.max) K.hinweiseIntern.push("Familienliste: nur " + (feld.max_im_kasten + E.max) + " von " + familie.length + " Personen passen auf das Blatt");
  }

  // Erklärungen und Angaben der Familie auf dem Vordruck merken (Prüfung: ein leeres Feld steht nie auf einer Seite
  // mit Bildschirm-Unterschrift; die Stellen s2 bis s4 werden dann zu Stift-Stellen, siehe erklaerungFehlt)
  const regEingabe = (seiteNr, name, leer) => K.eingaben.push({ pageRef: seiten[seiteNr - 1], formular: "aufnahmeantrag", name: name, leer: leer, ausnahme: false });
  regEingabe(1, "satzung", a.satzung !== true);
  regEingabe(3, "fotos", Boolean(erklaerungFehlt(K, "aufnahmeantrag", "s3.unterschrift")));
  if (liste(e.formulare).includes("familienliste")) regEingabe(2, "familie", !familie.length);
  if (z.art === "sepa") regEingabe(4, "sepa", Boolean(erklaerungFehlt(K, "aufnahmeantrag", "s4.unterschrift")));
}

// ---------------------------------------------------------------------------
// Unterschriftsstellen auf den Vordrucken (Aufnahmeantrag, HFV)
// ---------------------------------------------------------------------------

// Stelle laut Vermessung: Kasten über der Linie
function stelleAusJson(K, formular, stelleKey) {
  const eintrag = K.formulare[formular];
  return liste(eintrag && eintrag.unterschriften).find((s) => s.stelleKey === stelleKey) || null;
}

// Zeichnet alle Stellen, die die Regeln für dieses Formular verlangen, und die Hinweise des HFV-Antrags.
// seiten: die kopierten Seiten im Hauptdokument; startNr: Seitennummer der ersten Seite im PDF.
// Gibt die stelleKeys zurück, an denen ein Bild sitzt.
function zeichneVorlagenStellen(K, formular, seiten) {
  const bilder = [];
  const verlangt = liste(K.e.unterschriften).filter((u) => u.formular === formular);
  for (const u of verlangt) {
    const st = stelleAusJson(K, formular, u.stelleKey);
    if (!st) {
      // Die Regeln verlangen eine Stelle, die der Vordruck nicht kennt: sollte nie vorkommen (der Test wertet es als Fehler)
      K.warnungen.push("Unterschriftsstelle " + formular + "." + u.stelleKey + " ist im Vordruck nicht vermessen");
      continue;
    }
    const page = seiten[st.seite - 1];
    // Stellen, die der Vordruck nicht enthält (gedruckt: false): Linie und Beschriftung mitzeichnen
    if (st.gedruckt === false && st.linie) {
      zeichneLinie(K, page, st.linie.x0, st.linie.y, st.linie.x1, st.linie.y, 0.5, FARBE.schwarz);
      zeichneText(K, page, sicher(K, st.beschriftung, false), st.linie.x0, st.linie.y - 8.5, 7, { farbe: FARBE.tinte });
      merkeFlaeche(K, page, "linie", st.linie.x0, st.linie.y - 10.5, st.linie.x1 - st.linie.x0, 12);
    }
    const r = zeichneStelle(K, page, st, { formular: formular, stelleKey: u.stelleKey, wer: u.wer });
    if (r.art === "bild") bilder.push(u.stelleKey);
  }
  if (formular === "hfv_antrag") zeichneHfvHinweise(K, seiten);
  return bilder;
}

// HFV-Antrag Seite 3: Wer bei den Einwilligungen a oder b Nein gewählt hat, soll dort nicht unterschreiben.
function zeichneHfvHinweise(K, seiten) {
  const verlangt = (key) => liste(K.e.unterschriften).some((u) => u.formular === "hfv_antrag" && u.stelleKey === key);
  const alter = K.e.alter;
  const meldungen = [
    { key: "einwilligung_a", text: typeof alter === "number" && alter >= 16 ? "Nicht nötig: gilt nur für Kinder unter 16 Jahren" : "Nicht unterschreiben – Sie haben Nein gewählt" },
    { key: "einwilligung_b", text: "Nicht unterschreiben – Sie haben Nein gewählt" },
  ];
  for (const m of meldungen) {
    if (verlangt(m.key)) continue;
    const st = stelleAusJson(K, "hfv_antrag", m.key);
    if (!st) continue;
    schreibeAufVorlage(K, seiten[st.seite - 1], "hinweis", sicher(K, m.text, false), st.x + 3, st.y + st.hoehe - 9, 7, FARBE.markierung);
    K.stellen.push({ formular: "hfv_antrag", stelleKey: m.key, wer: null, pageRef: seiten[st.seite - 1], art: "nein-hinweis", text: m.text });
  }
}

// ---------------------------------------------------------------------------
// Vordrucke ins Hauptdokument übernehmen
// ---------------------------------------------------------------------------

async function uebernehmeVorlage(K, key, teil) {
  const L = K.L;
  let quelle;
  if (key === "aufnahmeantrag") {
    const eintrag = K.formulare.aufnahmeantrag;
    const bytes = K.vorlagen.aufnahmeantrag;
    if (!eintrag || !bytes || !bytes.length) throw new Error("Vorlage fehlt: aufnahmeantrag");
    quelle = await L.PDFDocument.load(bytes, { updateMetadata: false });
    if (eintrag.seiten && quelle.getPageCount() !== eintrag.seiten) throw new Error("Vorlage aufnahmeantrag hat " + quelle.getPageCount() + " statt " + eintrag.seiten + " Seiten (Vordruck geändert)");
  } else {
    quelle = await fuelleVorlage(K, key);
  }
  const seiten = await K.doc.copyPages(quelle, quelle.getPageIndices());
  seiten.forEach((p) => {
    K.doc.addPage(p);
    K.seiten.push({ page: p, teil: teil, eigen: false, entwurf: false, art: "vorlage", schluessel: key, titel: eintragName(key) });
  });
  const bilder = zeichneVorlagenStellen(K, key, seiten);
  if (key === "aufnahmeantrag") fuelleAufnahmeantrag(K, seiten, bilder);
  return seiten.length;
}

// ---------------------------------------------------------------------------
// Eigene Seiten des Vereins (Teil B und C)
// ---------------------------------------------------------------------------

function vereinsName(K) {
  return K.verein.name_register || K.verein.name || "FFV Sportfreunde 04";
}

function vereinKurz(K) {
  return K.verein.name || "FFV Sportfreunde 04";
}

// Der Name des Vereins am Ende eines Satzes: "… e. V." trägt den Punkt schon, es folgt kein zweiter ("e. V..").
const vereinsNameAmSatzende = (K) => vereinsName(K).replace(/\.+$/, "") + ".";

// Anschriftszeilen des Vereins aus konfig.verein.anschrift (Besuchsadresse, wenn vorhanden auch Postfach)
function vereinAnschrift(K) {
  const an = objekt(K.verein.anschrift);
  const zeilen = [];
  if (hatText(an.postfach)) zeilen.push("Postanschrift: " + [text(an.postfach), [text(an.postfachPlz), text(an.postfachOrt)].filter(Boolean).join(" ")].filter(Boolean).join(", "));
  if (hatText(an.strasse)) zeilen.push("Besuchsadresse: " + [text(an.strasse), [text(an.plz), text(an.ort)].filter(Boolean).join(" ")].filter(Boolean).join(", "));
  return zeilen;
}

function kontaktText(K) {
  const k = objekt(K.cfg.kontakte);
  const mail = text(K.verein.mail) || text(objekt(k.geschaeftsstelle).mail);
  const tel = text(K.verein.tel_geschaeftsstelle) || text(k.telefon);
  return [mail ? "E-Mail: " + mail : "", tel ? "Telefon: " + tel : ""].filter(Boolean).join(" · ");
}

// Wer unterschreibt die Stelle? null, wenn die Regeln sie nicht verlangen
function stelleWer(K, formular, stelleKey) {
  const u = liste(K.e.unterschriften).find((x) => x.formular === formular && x.stelleKey === stelleKey);
  return u ? u.wer : null;
}

// Wer unterschreibt die Stelle einer eigenen Seite? Laut Regeln; kennen sie die Stelle nicht, gilt die Rolle „einer“
// des Regelwerks (minderjährig: eine Person mit Sorgerecht, sonst das Mitglied) als Rückfall mit Stift-Markierung.
function stelleRolle(K, formular, stelleKey) {
  const wer = stelleWer(K, formular, stelleKey);
  if (wer) return { wer: wer, rueckfall: false };
  return { wer: K.minderjaehrig ? "sorgeberechtigte" : "mitglied", rueckfall: true };
}

// Wird die Stelle einer eigenen Seite am Bildschirm unterschrieben? Dann darf auf der Seite kein leeres Feld stehen.
function seiteAmBildschirm(K, formular, stelleKey) {
  const r = stelleRolle(K, formular, stelleKey);
  return !r.rueckfall && stelleArt(K, formular, r.wer, stelleKey) === "bild";
}

// Alle Stellen, die gezeichnet werden: die der Regeln und die Rückfälle (siehe unterschriftFuer)
function alleStellen(K) {
  return liste(K.e.unterschriften).concat(K.rueckfall);
}

function geburtsText(K) {
  return hatText(K.a.geburtsdatum) ? datumDe(K.a.geburtsdatum) : "";
}

// Mannschaft: mit mehreren möglichen Mannschaften „D1-Jugend oder D3-Jugend (teilt die Jugendleitung ein)“,
// damit es sich nicht liest, als spiele das Kind in mehreren Teams
function mannschaftText(K) {
  const m = objekt(K.e.mannschaft);
  const namen = liste(m.namen).map(text).filter(Boolean);
  if (namen.length > 1) return namen.slice(0, -1).join(", ") + " oder " + namen[namen.length - 1] + " (teilt die Jugendleitung ein)";
  if (namen.length) return namen[0];
  const g = text(objekt(K.a.karneval).gruppe);
  return g && g !== "weiss_nicht" ? g : "";
}

// Titelblock einer Seite: Überschrift, Untertitel und Angaben zur Person
function titelBlock(K, S, titel, untertitel, extra) {
  S.ueberschrift(titel, 1);
  if (untertitel) S.absatz(untertitel, { size: 9.5, farbe: FARBE.tinte2, nach: 8, kennung: "untertitel" });
  const paare = [
    ["Name", K.person.name],
    ["Geburtsdatum", geburtsText(K)],
  ].concat(extra || []);
  S.angabenKasten(paare);
}

// Kleine Zeile am Ende einer eigenen Seite (Nachbesserung sprache-12): Paragraphen und Artikel stehen nicht im Fließtext der
// Seiten, die die Familie unterschreibt, sondern hier. Der Test prüft die Satzlänge der Seiten ohne diese Zeile.
function rechtsgrundlage(S, zeile) {
  S.absatz("Rechtsgrundlage: " + zeile, { size: 7.5, farbe: FARBE.tinte3, nach: 0, kennung: "rechtsgrundlage" });
}

// Unterschriftsblock am Ende einer eigenen Seite. Die Stelle wird nie stumm ausgelassen: kennen die Regeln sie nicht,
// steht dort eine Stift-Markierung für die Rolle „einer“, und der Fall wird als Warnung gemerkt (der Test wertet ihn
// als Fehler, der Laufzettel nennt ihn).
function unterschriftFuer(K, S, formular, stelleKey) {
  const r = stelleRolle(K, formular, stelleKey);
  if (r.rueckfall) {
    K.rueckfall.push({ formular: formular, stelleKey: stelleKey, wer: r.wer });
    K.warnungen.push("Unterschriftsstelle " + formular + "." + stelleKey + " fehlt in den Regeln: Stift-Markierung für " + werKlartext(r.wer) + " ergänzt");
  }
  S.unterschriftBlock({ formular: formular, stelleKey: stelleKey, wer: r.wer, name: personName(K, r.wer), stift: r.rueckfall, rueckfall: r.rueckfall });
}

// --- Datenschutzinformation nach Art. 13 DSGVO -----------------------------------------------------------------

function seiteDatenschutz(K, S) {
  const V = vereinsName(K);
  const g = { size: 9, nach: 3.5 };
  S.ueberschrift(eintragName("datenschutz"), 1);
  S.absatz("nach Artikel 13 der Datenschutz-Grundverordnung (DSGVO) für Mitglieder, Eltern und Personen mit Sorgerecht", { size: 9.5, farbe: FARBE.tinte2, nach: 6 });
  S.absatz([{ t: "Mitglied:", fett: true }, { t: K.person.name + (geburtsText(K) ? ", geboren am " + geburtsText(K) : ""), nutzer: true }], { size: 9, nach: 4 });

  S.ueberschrift("1. Wer ist verantwortlich?", 3);
  S.absatz("Verantwortlich für die Verarbeitung Ihrer Daten ist der " + V + ", vertreten durch den Vorstand.", g);
  vereinAnschrift(K).forEach((z) => S.absatz(z, Object.assign({}, g, { nach: 1.5 })));
  S.absatz(kontaktText(K) + ". Bei Fragen zum Datenschutz wenden Sie sich an die Geschäftsstelle.", g);

  S.ueberschrift("2. Welche Daten verarbeiten wir?", 3);
  S.liste(
    [
      "Stammdaten: Name, Anschrift, Geburtsdatum, Geburtsort, Geschlecht, Staatsangehörigkeit, E-Mail-Adresse und Telefonnummer.",
      "Bei Minderjährigen: Name und Kontaktdaten der Personen mit Sorgerecht.",
      "Notfallkontakte: Name, Beziehung und Telefonnummer.",
      "Angaben zum Spielrecht im Fußball: früherer Verein, Abmeldung, letztes Spiel und Sperren.",
      "Zahlungsdaten: IBAN und Kreditinstitut, wenn Sie am Lastschriftverfahren teilnehmen.",
      "Nachweise, die der Verband verlangt: Kopien von Geburtsurkunde, Ausweis oder Meldebescheinigung.",
      "Ein Spielerfoto für den digitalen Spielerpass.",
      "Gesundheitsdaten: das Attest vom Arzt und, freiwillig, die Angaben im Notfall- und Gesundheitsbogen und die Absprache zur Medikamentengabe.",
      "Fotos und Videos aus dem Vereinsleben, wenn Sie eingewilligt haben.",
    ],
    { size: 9, nach: 1.5 }
  );

  S.ueberschrift("3. Wofür verarbeiten wir die Daten, und auf welcher Rechtsgrundlage?", 3);
  S.tabelle(
    [{ w: 62, titel: "Zweck" }, { w: 38, titel: "Rechtsgrundlage" }],
    [
      ["Mitgliederverwaltung, Beitragseinzug, Organisation von Training und Spielbetrieb", "Art. 6 Abs. 1 lit. b DSGVO (Mitgliedschaft)"],
      ["Antrag auf Spielerlaubnis beim Hessischen Fußball-Verband, Spielerpass, Spielerfoto in DFBnet", "Art. 6 Abs. 1 lit. b DSGVO"],
      ["Spielerfoto, das der Verein selbst aufnimmt", "Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse, Widerspruch möglich)"],
      ["Kopien von Ausweis oder Pass, wenn der Verband sie verlangt", "Art. 6 Abs. 1 lit. a und b DSGVO (Ihre Zustimmung zur Kopie)"],
      ["Fotos, Videos und Namen in den Vereinsmedien (Internetseite, App, Presse, Chronik)", "Art. 6 Abs. 1 lit. a DSGVO (Einwilligung)"],
      ["Fahrten und Messenger-Gruppe der Mannschaft", "Art. 6 Abs. 1 lit. a DSGVO (Einwilligung)"],
      ["Attest vom Arzt (Gesundheitsdatum)", "Art. 9 Abs. 2 lit. a DSGVO (ausdrückliche Einwilligung)"],
      ["Notfallkontakte (Name, Beziehung, Telefon)", "Art. 6 Abs. 1 lit. b DSGVO (Mitgliedschaft, Fürsorge im Training) und lit. f DSGVO (weitere Kontaktpersonen)"],
      ["Angaben zur Gesundheit im Notfall- und Gesundheitsbogen (freiwillig)", "Art. 9 Abs. 2 lit. a DSGVO (ausdrückliche Einwilligung)"],
      ["Absprache zur Medikamentengabe (freiwillig, mit Stift)", "Art. 9 Abs. 2 lit. a DSGVO (ausdrückliche Einwilligung)"],
    ],
    { size: 8.5 }
  );

  S.ueberschrift("4. An wen geben wir Daten weiter?", 3);
  S.liste(
    [
      "Hessischer Fußball-Verband (HFV) und Deutscher Fußball-Bund (DFB) über das System DFBnet: für das Spielrecht und den Spielbetrieb. Der HFV ist dafür selbst verantwortlich. Seine Datenschutzinformation steht auf Seite 3 des Antrags auf Spielerlaubnis und unter hfv-online.de. Fragen dazu richten Sie an datenschutz@hfv-online.de. Bei einem Wechsel aus dem Ausland gibt der Verband Angaben über den DFB an den ausländischen Verband weiter.",
      "Landessportbund Hessen und Sportversicherung: Wir melden jährlich den Mitgliederbestand (Bestandsmeldung). Darüber besteht der Versicherungsschutz.",
      "Kreditinstitut: beim Einzug des Beitrags per SEPA-Lastschrift.",
      "Trainerinnen, Trainer und Betreuer: nur die Angaben, die sie für Training und Spiele brauchen. Die Gesundheitsangaben aus dem Notfall- und Gesundheitsbogen und aus der Absprache zur Medikamentengabe sehen nur die Trainer und Betreuer der Mannschaft.",
      "Eine Weitergabe an weitere Empfänger oder in Länder außerhalb der Europäischen Union ist nicht vorgesehen.",
    ],
    { size: 9, nach: 2 }
  );

  S.ueberschrift("5. Wie lange speichern wir die Daten?", 3);
  // Das Attest gehört nur dann in die Unterlagen, die der Verband verlangt, wenn er es verlangt (U10 „pflicht“). Beim Wechsel
  // („offen“) klärt der Verein das noch; bei Erwachsenen („verein“) verlangt es nur der Verein.
  const fassungDs = attestFassung(K);
  const antragsUnterlagen =
    "Unterlagen zum Antrag auf Spielerlaubnis (unterschriebener Antrag, Nachweise" + (fassungDs === "pflicht" ? ", Attest" : "") + "): mindestens zwei Jahre ab Antragstellung, weil der Verband das verlangt (Spielordnung § 92). Danach vernichten wir sie. Auf Anforderung legen wir sie dem Verband binnen 14 Tagen im Original vor." +
    (fassungDs === "offen" ? " Ob der Verband beim Wechsel ein Attest verlangt, klärt der Verein noch. Braucht der Verband es, gilt dieselbe Frist." : "");
  S.liste(
    [
      antragsUnterlagen,
      "Ein Attest, das der Verband nicht verlangt, vernichtet der Verein sofort.",
      "Notfallkontakte, Notfall- und Gesundheitsbogen und Absprache zur Medikamentengabe: bis zum Austritt oder bis zum Widerruf.",
      "Mitgliederdaten: bis zwei Jahre nach dem Ende der Mitgliedschaft. Beitrags- und Zahlungsdaten: so lange, wie Aufbewahrungsfristen der Buchführung es verlangen (bis zu zehn Jahre).",
      "Fotos und Videos in den Vereinsmedien: bis Sie Ihre Einwilligung widerrufen.",
      "Beim Verband löscht DFBnet Spielerdaten erst, wenn kein Spielrecht mehr besteht, frühestens zum Ende des fünften Kalenderjahres nach der letzten Einsatzsaison.",
    ],
    { size: 9, nach: 2 }
  );

  S.ueberschrift("6. Ihre Rechte", 3);
  S.absatz(
    "Sie haben das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18) und Datenübertragbarkeit (Art. 20). Sie können der Verarbeitung aus berechtigtem Interesse widersprechen (Art. 21). Eine Einwilligung können Sie jederzeit mit Wirkung für die Zukunft widerrufen (Art. 7 Abs. 3). Die Verarbeitung bis zum Widerruf bleibt rechtmäßig. Eine E-Mail an die Geschäftsstelle genügt.",
    g
  );

  S.ueberschrift("7. Beschwerde bei der Aufsichtsbehörde", 3);
  S.absatz("Sie können sich bei der Datenschutzaufsicht beschweren: Der Hessische Beauftragte für Datenschutz und Informationsfreiheit, Gustav-Stresemann-Ring 1, 65189 Wiesbaden, datenschutz.hessen.de.", g);

  S.ueberschrift("8. Müssen Sie die Daten angeben?", 3);
  S.absatz(
    "Ohne Name, Anschrift und Geburtsdatum können wir Sie nicht aufnehmen. Ohne die Angaben zum Spielrecht kann der Verein keinen Antrag beim Verband stellen. Die Einwilligungen für Fotos, Messenger-Gruppe, Notfall- und Gesundheitsbogen und Absprache zur Medikamentengabe sind freiwillig. " +
      {
        pflicht: "Für Minderjährige verlangt der Verband ein Attest vom Arzt. Ohne die Erlaubnis für das Attest kann der Verein deshalb kein Spielrecht beantragen.",
        offen: "Ob der Verband beim Wechsel ein Attest verlangt, klärt der Verein noch. Braucht der Verband es nicht, vernichtet der Verein es.",
        verein: "Für Erwachsene verlangt der Verein ein Attest vom Arzt. Ohne die Erlaubnis für das Attest kann der Verein deshalb kein Spielrecht beantragen.",
      }[fassungDs] +
      " Eine automatisierte Entscheidung einschließlich Profiling findet nicht statt.",
    g
  );

  S.ueberschrift("9. So entsteht Ihre Anmeldedatei", 3);
  S.absatz("Der Anmelde-Assistent arbeitet nur in Ihrem Browser. Ihre Angaben und Fotos werden nicht an einen Server übertragen. Der Verein erhält die Datei erst, wenn Sie sie abgeben.", g);

  S.trenner();
  S.absatz([{ t: "Kenntnisnahme:", fett: true }, { t: "Ich habe die Information zum Datenschutz erhalten und zur Kenntnis genommen." }], { size: 9.5, nach: 2 });
  unterschriftFuer(K, S, "datenschutz", "kenntnisnahme");
}

// --- Einverständnis: Mädchen in einer Jungenmannschaft (JO § 14 Nr. 6) ------------------------------------------
// Texte in Einfacher Sprache (höchstens 12 Wörter je Satz); Paragraphen stehen nur in der Zeile "Rechtsgrundlage".

function seiteMaedchen(K, S) {
  const klasse = text(K.e.altersklasse);
  titelBlock(K, S, eintragName("einverstaendnis_maedchen"), "Mädchen in einer Jungenmannschaft", [
    ["Altersklasse", klasse ? klasse + "-Jugend" : ""],
    ["Mannschaft", mannschaftText(K)],
  ]);
  const g = { size: 10, nach: 6 };
  S.absatz([{ t: "Ich bin damit einverstanden. Meine Tochter" }, { t: K.person.name, fett: true, nutzer: true }, { t: "nimmt am Spielbetrieb einer Jungenmannschaft teil." }], { size: 10, nach: 2 });
  S.absatz("Sie spielt für den " + vereinsNameAmSatzende(K), g);
  S.ueberschrift("Das gilt dafür", 3);
  S.liste(
    [
      "Der Verein hat keine eigene Mädchenmannschaft. Mädchen dürfen deshalb bei den Jungen spielen.",
      "Nach der Jugendordnung dürfen Mädchen bis einschließlich B-Jugend in Jungenmannschaften spielen. Bis einschließlich C-Jugend darf ein Mädchen ein Jahr älter sein. Es darf also älter sein als die Jungen der Altersklasse.",
      "Für B- und C-Jugend verlangt der Verband das schriftliche Einverständnis der Eltern. Diese Erklärung ersetzt es.",
      "Das Einverständnis gilt, bis Sie es widerrufen. Dafür genügt eine Nachricht an die Jugendleitung.",
    ],
    { size: 10, nach: 4 }
  );
  S.abstand(6);
  S.platz(84 + 16); // Unterschrift und Zeile "Rechtsgrundlage" bleiben zusammen
  unterschriftFuer(K, S, "einverstaendnis_maedchen", "unterschrift");
  rechtsgrundlage(S, "Jugendordnung des Hessischen Fußball-Verbandes, § 14 Nr. 6.");
}

// --- Einverständnis: Fahrten und Messenger-Gruppe (Schutzkonzept 6.4 und 6.11) ----------------------------------
// Texte in Einfacher Sprache (höchstens 12 Wörter je Satz); Nummern und Artikel stehen nur in der Zeile "Rechtsgrundlage".

function seiteFahrten(K, S) {
  const ew = objekt(K.a.einwilligungen);
  // Unter einer Bildschirm-Unterschrift bleibt kein Kästchen offen: ohne Antwort steht ein Satz statt der Kästchen
  const amBildschirm = seiteAmBildschirm(K, "einverstaendnis_fahrten", "unterschrift");
  titelBlock(K, S, eintragName("einverstaendnis_fahrten"), "Schutzkonzept des Vereins (Stand Mai 2025)", [["Mannschaft", mannschaftText(K)]]);
  const g = { size: 10, nach: 5 };
  const frage = (name, antwort, ja, nein, ohneAntwort) => {
    const beantwortet = typeof antwort === "boolean";
    if (!beantwortet && amBildschirm) {
      S.absatz(ohneAntwort, { size: 10, nach: 3 });
    } else {
      S.kaestchenZeile(antwort === true, ja);
      S.kaestchenZeile(antwort === false, nein);
    }
    S.eingabe({ name: name, leer: !beantwortet && !amBildschirm });
  };
  S.ueberschrift("Fahrten zu Spielen und Veranstaltungen", 2);
  S.absatz("Das steht im Schutzkonzept des Vereins. Trainer, Betreuer und andere Erwachsene dürfen Kinder im privaten Auto fahren. Dann müssen mindestens zwei Kinder mitfahren. Die Fahrt läuft über vereinbarte Treffpunkte. Ausnahmen gibt es nur mit Ihrer dokumentierten Zustimmung.", g);
  frage(
    "fahrten",
    ew.fahrten,
    "Ja, mein Kind darf zu Spielen und Veranstaltungen in Fahrgemeinschaften mitfahren.",
    "Nein, mein Kind fährt nicht in Fahrgemeinschaften mit.",
    "Sie haben dazu nichts angegeben. Ihr Kind fährt dann nicht in Fahrgemeinschaften mit."
  );
  S.abstand(4);
  S.absatz("Bei Übernachtungen informiert der Verein die Eltern vorher.", { size: 9.5, farbe: FARBE.tinte2, nach: 6 });
  S.ueberschrift("Messenger-Gruppe", 2);
  S.absatz("Trainer und Betreuer schreiben Kindern keine Einzelnachrichten. Die Verständigung läuft nur über offizielle Gruppen. Die Eltern sind dort dabei.", g);
  frage(
    "messenger",
    ew.messenger,
    "Ja, meine Telefonnummer darf in die Messenger-Gruppe der Mannschaft. Alle Mitglieder der Gruppe können sie sehen.",
    "Nein, ich möchte nicht in die Messenger-Gruppe.",
    "Sie haben dazu nichts angegeben. Ihre Telefonnummer kommt dann nicht in die Messenger-Gruppe."
  );
  if (ew.messenger === true && hatText(K.a.mobil)) S.feldZeile([{ label: "Telefonnummer für die Gruppe", wert: text(K.a.mobil), w: 1, name: "messengerTelefon" }], { hoehe: 22 });
  S.abstand(2);
  S.absatz("Diese Einwilligungen sind freiwillig. Sie können sie jederzeit mit Wirkung für die Zukunft widerrufen. Eine Nachricht an die Jugendleitung genügt.", { size: 9, farbe: FARBE.tinte2, nach: 8 });
  S.platz(84 + 16); // Unterschrift und Zeile "Rechtsgrundlage" bleiben zusammen
  unterschriftFuer(K, S, "einverstaendnis_fahrten", "unterschrift");
  rechtsgrundlage(S, "Präventions- und Schutzkonzept des Vereins, Nr. 6.4, 6.6 und 6.11; Art. 6 Abs. 1 lit. a DSGVO (Einwilligung).");
}

// --- Karneval: Erlaubnis für Auftritte am Abend (Erziehungsbeauftragung, JuSchG §§ 1, 2, 5) ---------------------

// Uhrzeit „HH:MM“ (auch „9:30“); leer, wenn es keine gültige Uhrzeit ist
function zeitText(x) {
  const m = /^\s*(\d{1,2}):(\d{2})\s*$/.exec(text(x));
  if (!m) return "";
  const h = Number(m[1]);
  return h <= 23 && Number(m[2]) <= 59 ? String(h).padStart(2, "0") + ":" + m[2] : "";
}

function seiteKarnevalAuftritte(K, S) {
  const k = objekt(K.a.karneval);
  const gruppe = text(k.gruppe) && k.gruppe !== "weiss_nicht" ? k.gruppe : "";
  // Eine Bildschirm-Unterschrift gilt nur für Angaben, die schon dastehen: ohne Antwort steht „–“, auf dem Papierweg
  // bleibt das Feld zum Ausfüllen frei. Die Abholung und der Heimweg stehen als Sätze, die die Familie im Assistenten gewählt hat.
  const amBildschirm = seiteAmBildschirm(K, "karneval_auftritte", "unterschrift");
  const KEINE = "–";
  const zeit = zeitText(k.alleinAb);
  let allein = "";
  if (k.alleinNachHause === "ja" && zeit) allein = "Mein Kind darf die Veranstaltung um " + zeit + " Uhr allein verlassen.";
  else if (k.alleinNachHause === "nein") allein = "Mein Kind darf die Veranstaltung nicht allein verlassen.";
  if (!hatText(k.abholung) || !allein) K.hinweiseIntern.push(eintragName("karneval_auftritte") + ": Abholung oder Heimweg sind nicht angegeben – vor dem ersten Abendauftritt klären.");
  // Texte in Einfacher Sprache (höchstens 12 Wörter je Satz); die Paragraphen stehen nur in der Zeile "Rechtsgrundlage".
  titelBlock(K, S, eintragName("karneval_auftritte"), "Erziehungsbeauftragung nach dem Jugendschutzgesetz", [
    ["Abteilung", "Karneval"],
    ["Gruppe", gruppe],
  ]);
  const g = { size: 10, nach: 6 };
  S.absatz("Auftritte und Veranstaltungen der Karnevalskampagne finden oft am Abend statt. Unter 16 Jahren darf man bei öffentlichen Tanzveranstaltungen nur mit Begleitung bleiben. Das ist eine Person mit Sorgerecht oder eine Person mit Erziehungsauftrag. Für Auftritte der Brauchtumspflege oder der künstlerischen Betätigung gelten Ausnahmen. Kinder dürfen bis 22 Uhr auch ohne Begleitung bleiben. Jugendliche unter 16 Jahren dürfen bis 24 Uhr auch ohne Begleitung bleiben.", g);
  S.absatz([{ t: "Ich beauftrage die Trainerinnen und Betreuer der Karnevalabteilung. Die Abteilung gehört zum " + vereinsNameAmSatzende(K) + " Sie begleiten mein Kind" }, { t: K.person.name, fett: true, nutzer: true }, { t: "bei den Auftritten. Das gilt für die Kampagne " + text(K.cfg.saison) + ". Für diese Zeit übernehmen sie die Erziehungsaufgaben. Sie sind dann erziehungsbeauftragte Personen." }], g);
  S.ueberschrift("Erreichbarkeit und Abholung", 3);
  S.absatz("Im Notfall und für die Abholung bin ich unter dieser Nummer erreichbar:", { size: 10, nach: 2 });
  const ohneAntwort = amBildschirm ? KEINE : "";
  S.feldZeile(
    [
      { name: "telefon", label: "Telefonnummer der Person mit Sorgerecht", wert: text(K.a.mobil) || text(K.a.telefon) || ohneAntwort, w: 1.4 },
      { name: "abholung", label: "Mein Kind wird abgeholt von (Name)", wert: text(k.abholung) || ohneAntwort, w: 1.6 },
    ],
    { hoehe: 24 }
  );
  S.feldZeile([{ name: "alleinNachHause", label: (allein || amBildschirm) ? "Allein nach Hause" : "Mein Kind darf die Veranstaltung um ___ Uhr allein verlassen", wert: allein || ohneAntwort, w: 1 }], { hoehe: 22 });
  S.ueberschrift("Das sollten Sie wissen", 3);
  S.liste(
    [
      "Ihr Kind trägt einen Ausweis bei sich. Auf Verlangen muss es sein Alter nachweisen.",
      "Die Erlaubnis gilt für die Kampagne " + text(K.cfg.saison) + ". Sie können sie jederzeit widerrufen.",
      "Die Karnevalabteilung sagt Ihnen rechtzeitig, wann und wo die Auftritte sind.",
    ],
    { size: 10, nach: 3 }
  );
  S.abstand(6);
  S.platz(84 + 16); // Unterschrift und Zeile "Rechtsgrundlage" bleiben zusammen
  unterschriftFuer(K, S, "karneval_auftritte", "unterschrift");
  rechtsgrundlage(S, "Jugendschutzgesetz (JuSchG): § 1 Abs. 1 Nr. 4 (Erziehungsbeauftragung), § 2 (Ausweis), § 5 (Ausnahmen für Auftritte).");
}

// --- Teil C: Trennblatt, Attest, Einwilligung zum Attest, Notfallbogen -----------------------------------------

function seiteTrennblatt(K, S, plan) {
  S.ueberschrift(TEIL_ANZEIGE.C, 1);
  S.absatz("Diese Seiten enthalten Angaben zur Gesundheit. Sie gehören nicht zu den übrigen Unterlagen. Trennen Sie Teil C von Teil A und Teil B ab.", { size: 11, nach: 8 });
  S.ueberschrift("Das steht in Teil C", 2);
  const zeilen = liste(plan.teilCListe).map((z) => [{ t: "Seite " + z.seite + ":", fett: true }, { t: z.titel + " – " + z.wer }]);
  S.liste(zeilen, { size: 11, nach: 5 });
  S.ueberschrift("So geben Sie Teil C ab", 2);
  S.liste(
    [
      "Teil C gehört nicht zu den übrigen Unterlagen.",
      "Der Verein bewahrt ihn getrennt auf.",
      "Schicken Sie Teil C nicht per WhatsApp oder normaler E-Mail.",
    ],
    { size: 11, nach: 5 }
  );
  S.abstand(8);
  const liste2 = liste(plan.teilCListe);
  const hatAttest = liste2.some((z) => /Bescheinigung|Attest/.test(z.titel));
  const hatNotfall = liste2.some((z) => /Notfall/.test(z.titel));
  const schluss = ["Der Verein bewahrt Teil C getrennt von den übrigen Unterlagen auf."];
  if (hatAttest) schluss.push("Das " + unterlageName(K, "U10") + " bleibt im Passwesen.");
  if (hatNotfall) schluss.push("Der " + eintragName("notfall") + " ist nur für die Trainer und Betreuer der Mannschaft.");
  S.absatz(schluss.join(" "), { size: 9.5, farbe: FARBE.tinte2 });
}

// Sätze der Ärztlichen Bescheinigung (Grundsatz, Zusatz für Herren-Aushilfe und Juniorinnen)
function attestSaetze(K) {
  const e = K.e;
  const u10 = liste(e.unterlagen).find((u) => u.id === "U10");
  const saetze = ["Gegen die Teilnahme am Fußballtraining und am Spielbetrieb bestehen aus ärztlicher Sicht keine Bedenken."];
  if (liste(e.faelle).includes("F13") || (u10 && u10.grund === "herren_aushilfe")) {
    saetze.push("Die Bescheinigung gilt auch für den Einsatz in einer Herrenmannschaft (Seniorenspielrecht nach § 29 der Jugendordnung).");
  }
  if (u10 && u10.grund === "juniorin_unter_18") {
    saetze.push("Die Sporttauglichkeit im Sinne von § 110 der Spielordnung ist ärztlich festgestellt.");
  }
  return saetze;
}

function seiteAttestVorlage(K, S) {
  S.ueberschrift(ATTEST_VORLAGE_NAME, 1);
  S.absatz("Unbedenklichkeitsbescheinigung für den Fußballverein – bitte von der Ärztin oder dem Arzt ausfüllen lassen", { size: 10, farbe: FARBE.tinte2, nach: 8 });
  S.angabenKasten([["Name", K.person.name], ["Geburtsdatum", geburtsText(K)]], { size: 11 });
  S.abstand(6);
  attestSaetze(K).forEach((t) => S.absatz(t, { size: 12, zeilenhoehe: 1.45, nach: 8 }));
  S.abstand(10);
  S.feldZeile([{ label: "Datum", w: 1, wer: "arzt" }, { label: "Ort", w: 1.4, wer: "arzt" }], { hoehe: 26 });
  S.abstand(6);
  // Stempel und Unterschrift der Praxis
  S.platz(120);
  const y0 = S.y;
  const wer = stelleWer(K, "attest", "arzt") || "arzt";
  if (!S.trocken && !stelleWer(K, "attest", "arzt")) K.warnungen.push("Unterschriftsstelle attest.arzt fehlt in den Regeln, obwohl die Vorlage für die Ärztin oder den Arzt gezeichnet wird");
  if (!S.trocken) {
    zeichneRechteck(K, S.page, RAND, y0 - 86, 200, 86, { rand: FARBE.tinte3, randBreite: 0.6, gestrichelt: [3, 2] });
    zeichneText(K, S.page, "Praxisstempel", RAND + 6, y0 - 12, 8, { farbe: FARBE.tinte3 });
    const xU = RAND + 240;
    const wU = BREITE - 240;
    zeichneLinie(K, S.page, xU, y0 - 66, xU + wU, y0 - 66, 0.5, FARBE.tinte3);
    zeichneText(K, S.page, "Unterschrift der Ärztin oder des Arztes", xU, y0 - 75, 7.5, { farbe: FARBE.tinte3 });
    zeichneStelle(K, S.page, { x: xU, y: y0 - 68, breite: wU, hoehe: 44 }, { formular: "attest", stelleKey: "arzt", wer: wer });
  }
  S.stellen.arzt = S.seitenAnzahl - 1;
  S.y = y0 - 104;
  const bestimmt = {
    pflicht: "Die Bescheinigung ist für den Fußballverein und den Hessischen Fußball-Verband bestimmt (Jugendordnung § 9 Nr. 1).",
    offen: "Die Bescheinigung ist für den Fußballverein bestimmt. Ob der Hessische Fußball-Verband sie beim Wechsel verlangt, klärt der Verein. Braucht der Verband sie nicht, vernichtet der Verein sie.",
    verein: "Die Bescheinigung ist für den Fußballverein bestimmt.",
  }[attestFassung(K)];
  S.absatz("Hinweis für die Praxis: " + bestimmt + " Bitte tragen Sie keine Diagnosen ein. Die Aussage oben genügt.", { size: 9, farbe: FARBE.tinte2, nach: 2 });
}

function seiteAttestEinwilligung(K, S) {
  const minder = K.minderjaehrig;
  // Ist offen, ob der Verband das Attest beim Wechsel überhaupt verlangt (U10 „offen“), steht das nicht als Tatsache da:
  // Braucht der Verband es nicht, vernichtet der Verein es (Datensparsamkeit). Bei Erwachsenen (U10 „verein“) verlangt der
  // Verein das Attest selbst, der Verband nicht. Bei „pflicht“ bleibt der Text wie er war.
  // Texte in Einfacher Sprache (höchstens 12 Wörter je Satz); Paragraphen stehen nur in der Zeile "Rechtsgrundlage".
  const fassung = attestFassung(K);
  titelBlock(K, S, attestEinwilligungName(), "Einwilligung zur Verarbeitung der ärztlichen Bescheinigung (Art. 9 DSGVO)");
  const g = { size: 10, nach: 6 };
  S.absatz("Die ärztliche Bescheinigung ist ein Gesundheitsdatum. Der Verein darf sie nur mit Ihrer ausdrücklichen Einwilligung verarbeiten.", g);
  // Erwachsene: „meine ärztliche Bescheinigung“ (der Name steht im Kasten oben); bei Kindern folgt der Name des Kindes.
  const verantwortlich = "Ich willige ein. Verantwortlich ist der " + vereinsNameAmSatzende(K) + " ";
  S.absatz(
    minder
      ? [{ t: verantwortlich + "Der Verein verarbeitet die ärztliche Bescheinigung meines Kindes" }, { t: K.person.name, fett: true, nutzer: true }, { t: "so:" }]
      : verantwortlich + "Der Verein verarbeitet meine ärztliche Bescheinigung so:",
    g
  );
  S.liste(
    [
      fassung === "verein"
        ? "Der Verein nimmt die Bescheinigung entgegen und prüft sie."
        : "Der Verein nimmt die Bescheinigung entgegen. Er prüft damit eine Voraussetzung für das Spielrecht.",
      "Der Verein bewahrt sie nur im Passwesen auf. Trainer und Betreuer erhalten sie nicht. Sie steht in keiner App.",
      // Erwachsene: Der Verband bekommt die Bescheinigung nicht, der Punkt entfällt.
      fassung === "verein" ? null : "Der Verein legt sie dem Hessischen Fußball-Verband nur auf Anforderung vor.",
      {
        pflicht: "Der Verein bewahrt sie mindestens zwei Jahre ab dem Antrag auf. Danach vernichtet er sie.",
        offen: "Braucht der Verband sie, bewahrt der Verein sie mindestens zwei Jahre. Die Frist läuft ab dem Antrag. Danach vernichtet er sie.",
        verein: "Der Verband braucht sie nicht. Der Verein vernichtet sie nach der Prüfung.",
      }[fassung],
    ].filter(Boolean),
    { size: 10, nach: 4 }
  );
  S.ueberschrift("Wichtig", 3);
  S.liste(
    [
      "Die Einwilligung ist freiwillig. Sie können sie jederzeit mit Wirkung für die Zukunft widerrufen. Eine E-Mail an die Geschäftsstelle genügt.",
      {
        pflicht: "Ohne diese Einwilligung kann der Verein keinen Antrag auf Spielerlaubnis stellen. Denn der Verband verlangt die Bescheinigung.",
        offen: "Ob der Verband die Bescheinigung beim Wechsel verlangt, klärt der Verein noch. Braucht der Verband sie nicht, vernichtet der Verein sie.",
        verein: "Ohne diese Einwilligung kann der Verein keinen Antrag auf Spielerlaubnis stellen. Denn der Verein verlangt die Bescheinigung selbst.",
      }[fassung],
      "Auf der Bescheinigung stehen keine Diagnosen. Dort steht nur die Aussage der Ärztin oder des Arztes.",
    ],
    { size: 10, nach: 4 }
  );
  S.abstand(8);
  S.platz(84 + 16); // Unterschrift und Zeile "Rechtsgrundlage" bleiben zusammen
  unterschriftFuer(K, S, "attest", "einwilligung");
  // Bei Erwachsenen (U10 „verein“) beruft sich die Seite nicht auf die Ordnungen des Verbands.
  rechtsgrundlage(S, fassung === "verein" ? "Art. 9 Abs. 2 lit. a DSGVO (ausdrückliche Einwilligung)." : "Art. 9 Abs. 2 lit. a DSGVO (ausdrückliche Einwilligung); Jugendordnung des Hessischen Fußball-Verbandes, § 9 Nr. 1; Spielordnung, § 92.");
}

// Der Notfallbogen in drei Fassungen:
//  - mit Gesundheitsbogen (a.gesundheitsbogen = true): Kontakte, Gesundheitsangaben aus dem Assistenten, Einwilligung
//    nach Art. 9; leere Angaben stehen unter einer Bildschirm-Unterschrift als „–“
//  - ohne Gesundheitsbogen, Unterschrift am Bildschirm: nur die Notfallkontakte. Es stehen keine leeren Gesundheitsfelder da,
//    die erst nach der Unterschrift von Hand gefüllt würden; die Einwilligung nach Art. 9 entfällt
//  - ohne Gesundheitsbogen, Unterschrift mit Stift: wie bisher, die Gesundheitsfelder bleiben zum Ausfüllen frei
// Die Absprache zur Medikamentengabe steht in jeder Fassung unter der Unterschrift und hat ihre eigenen Stift-Zeilen.
function seiteNotfall(K, S) {
  const a = K.a;
  const n = objekt(a.notfall);
  const ges = objekt(a.gesundheit);
  const mit = a.gesundheitsbogen === true;
  const amBildschirm = seiteAmBildschirm(K, "notfall", "unterschrift");
  const nurKontakte = amBildschirm && !mit;
  const KEINE = "–";
  titelBlock(K, S, eintragName("notfall"), nurKontakte ? "Notfallkontakte – ohne Angaben zur Gesundheit" : "Freiwillig – füllen Sie nur aus, was Sie möchten", [["Mannschaft", mannschaftText(K)], ["Vertraulich", "nur für Trainer und Betreuer"]]);
  S.ueberschrift("Im Notfall erreichen wir", 2);
  const sb = liste(a.sorgeberechtigte);
  const zeilenNotfall = [];
  sb.forEach((p) => {
    const q = objekt(p);
    zeilenNotfall.push([[q.vorname, q.nachname].filter(hatText).map(text).join(" "), ROLLEN[q.rolle] || "Person mit Sorgerecht", text(q.telefon) || text(a.mobil)]);
  });
  if (hatText(n.name) || hatText(n.telefon)) zeilenNotfall.push([text(n.name), text(n.beziehung) || "Notfallkontakt", text(n.telefon)]);
  if (!zeilenNotfall.length && amBildschirm) {
    S.absatz("Sie haben keine Notfallnummer angegeben.", { size: 10, nach: 4 });
    K.hinweiseIntern.push(eintragName("notfall") + ": Es ist keine Notfallnummer angegeben.");
    S.eingabe({ name: "kontakte", leer: false });
  } else {
    if (!zeilenNotfall.length) zeilenNotfall.push(["", "", ""], ["", "", ""]);
    S.tabelle([{ w: 40, titel: "Name" }, { w: 30, titel: "Beziehung" }, { w: 30, titel: "Telefon" }], zeilenNotfall.map((z) => z.map((t) => [{ t: t || (amBildschirm ? KEINE : " "), nutzer: true }])), { size: 10 });
    S.eingabe({ name: "kontakte", leer: !amBildschirm && zeilenNotfall.every((z) => z.every((t) => !t)) });
  }
  if (nurKontakte) {
    S.ueberschrift("Angaben zur Gesundheit", 2);
    S.absatz("Sie haben keine Angaben zur Gesundheit gemacht. Soll der Trainer etwas wissen? Sprechen Sie ihn an.", { size: 10, nach: 4 });
  } else {
    S.ueberschrift("Wichtig zur Gesundheit", 2);
    S.absatz(mit ? "Diese Angaben haben Sie im Assistenten gemacht." : "Tragen Sie hier nur ein, was die Trainer im Notfall wissen sollen.", { size: 9.5, farbe: FARBE.tinte2, nach: 3 });
    const feldGesundheit = [
      ["allergien", "Allergien", ges.allergien],
      ["erkrankungen", "Erkrankungen (zum Beispiel Asthma, Epilepsie, Diabetes)", ges.erkrankungen],
      ["medikamente", "Medikamente", ges.medikamente],
      ["sonstiges", "Sonstiges", ges.sonstiges],
    ];
    feldGesundheit.forEach(([name, label, wert]) => {
      const t = mit ? text(wert) : "";
      S.feldZeile([{ name: name, label: label, wert: t || (amBildschirm ? KEINE : ""), w: 1 }], { hoehe: 22 });
    });
  }
  S.platz(150); // Text und Unterschrift bleiben zusammen
  if (nurKontakte) {
    S.ueberschrift("Ihre Unterschrift", 3);
    S.absatz("Mit Ihrer Unterschrift bestätigen Sie die Notfallkontakte. Die Trainerinnen, Trainer und Betreuer der Mannschaft nutzen sie nur im Notfall. Ohne die Absprache unten stehen auf diesem Blatt keine Angaben zur Gesundheit. Der Verein bewahrt den Bogen getrennt von den übrigen Unterlagen auf. Er löscht ihn beim Austritt.", { size: 9, nach: 4 });
  } else {
    S.ueberschrift("Einwilligung in die Angaben zur Gesundheit", 3);
    S.absatz("Ich willige ausdrücklich ein. Die Trainerinnen, Trainer und Betreuer der Mannschaft dürfen diese Angaben nutzen. Das gilt im Notfall und zur Vorsorge. Der Verein bewahrt den Bogen getrennt von den übrigen Unterlagen auf. Er löscht ihn beim Austritt oder auf Widerruf. Die Einwilligung ist freiwillig und jederzeit für die Zukunft widerrufbar.", { size: 9, nach: 4 });
  }
  unterschriftFuer(K, S, "notfall", "unterschrift");
  // Absprache zur Medikamentengabe: immer mit Stift, getrennt von der Unterschrift oben. Mit der Absprache kommen
  // Gesundheitsdaten auf das Blatt; die Stift-Unterschrift dort ist die Einwilligung dafür (Art. 9 Abs. 2 lit. a DSGVO, siehe
  // die Zeile "Rechtsgrundlage" am Ende der Seite).
  S.platz(255 + 16);
  S.ueberschrift("Absprache zur Medikamentengabe – nur mit Stift", 2);
  S.absatz("Nur ausfüllen, wenn Ihr Kind im Training oder Spiel ein Medikament braucht. Sprechen Sie das mit dem Trainer ab. Diese Absprache unterschreiben eine Person mit Sorgerecht und der Trainer. Beide unterschreiben getrennt mit Stift. Die Unterschrift oben gilt dafür nicht.", { size: 9.5, farbe: FARBE.tinte2, nach: 2 });
  S.feldZeile([{ name: "medikament", label: "Medikament", w: 1.2, ausnahme: true }, { name: "wannWieViel", label: "Wann und wie viel", w: 1.2, ausnahme: true }, { name: "werGibtEs", label: "Wer gibt es?", w: 1, ausnahme: true }], { hoehe: 22 });
  S.feldZeile([{ name: "abgesprochenAm", label: "Abgesprochen am", w: 1, ausnahme: true }, { name: "abgesprochenMit", label: "mit (Trainerin oder Trainer)", w: 1.6, ausnahme: true }], { hoehe: 22 });
  S.abstand(5);
  S.absatz("Mit dieser Unterschrift erlauben Sie den Trainern, die Angaben zu nutzen.", { size: 9.5, nach: 4 });
  S.stiftZeilen("notfall", [
    { stelleKey: "absprache_eltern", wer: "absprache_eltern", label: "Unterschrift (eine Person mit Sorgerecht)" },
    { stelleKey: "absprache_trainer", wer: "absprache_trainer", label: "Unterschrift (Trainerin oder Trainer)" },
  ]);
  rechtsgrundlage(
    S,
    nurKontakte
      ? "Art. 9 Abs. 2 lit. a DSGVO (ausdrückliche Einwilligung, nur für die Absprache zur Medikamentengabe)."
      : "Art. 9 Abs. 2 lit. a DSGVO (ausdrückliche Einwilligung in die Angaben zur Gesundheit und in die Absprache zur Medikamentengabe)."
  );
}

// ---------------------------------------------------------------------------
// Teil A: Anleitung für die Familie (Einfache Sprache)
// ---------------------------------------------------------------------------

const ZAHLWORT = { 2: "zwei", 3: "drei" };
const FAMILIE_WER = ["mitglied", "spieler", "sorgeberechtigte", "sorgeberechtigte_beide", "kontoinhaber"];
const HFV_FORMULARE = ["hfv_antrag", "vollmacht", "abmeldung", "einverstaendnis_senioren"];

const unterlageName = (K, id) => (deRegeln.unterlagen[id] && deRegeln.unterlagen[id].name) || id;
const unterlageText = (K, u, feld) => ersetzePlatzhalter(objekt(deRegeln.unterlagen[u.id])[feld], u.werte);
const hinweisText = (h) => ersetzePlatzhalter(deRegeln.hinweise[h.key], h.werte);
const werLabel = (wer) => (wer === "sorgeberechtigte_beide" ? "Der zweite Elternteil (nötig)" : deRegeln.wer[wer] || werKlartext(wer));

// Wie unterschreibt die Familie an dieser Stelle? (Text der Tabelle in Teil A)
function wieText(K, u) {
  const T = TEXTE_TEIL_A;
  if (u.wer === "arzt") return T.wieArzt;
  if (u.wer === "verein") return T.wieVerein;
  if (stelleArt(K, u.formular, u.wer, u.stelleKey) === "bild") return T.wieBildschirm;
  // Die Abmeldung beim alten Verein bringt der Verein nicht zum Verband: Die Familie schickt sie selbst (sprache-10).
  if (u.formular === "abmeldung") return T.wieStiftVerschicken;
  return K.a.hfvUnterschrift === "selbst_drucken" ? T.wieStiftDrucken : T.wieStiftTraining;
}

// "Seite 16" oder "Seite 16 bis 18"
const seitenText = (von, bis) => (von === bis || bis === undefined ? "Seite " + von : "Seite " + von + " bis " + bis);

// Begriffe, die Teil A beim ersten Vorkommen erklärt (sprache-17): Teil A muss ohne die Oberfläche lesbar sein, und dort stehen
// "Verband" und "Spielrecht" ohne Erklärung. Jeder Text von Teil A läuft in der Reihenfolge, in der er auf dem Blatt steht,
// durch denselben Erklärer. Die erste Nennung des Verbands wird zu "Hessischer Fußball-Verband (kurz: der Verband)" (mit der
// Endung, die der Satz verlangt), die erste Nennung von "Spielrecht" zu "Spielrecht (Erlaubnis zum Spielen)". Spätere
// Nennungen bleiben kurz. Der Erklärer gehört zu einem Aufbau von Teil A (er merkt sich, was erklärt ist).
const VERBAND_MUSTER = /(?:\b(Der|der|Den|den|Dem|dem|Des|des|Beim|beim|Vom|vom|Zum|zum)\s+)?(Hessische[nrms]?\s+Fußball-Verbands?|(?<!Fußball-)\bVerbands?)\b/;
const SPIELRECHT_MUSTER = /\bSpielrecht\b/;
const VERBAND_KURZ = " (kurz: der Verband)";
const SPIELRECHT_ERKLAERUNG = " (Erlaubnis zum Spielen)";

export function begriffsErklaerer() {
  let verband = false;
  let spielrecht = false;
  return (roh) => {
    let t = roh === undefined || roh === null ? "" : String(roh);
    if (!verband) {
      const m = VERBAND_MUSTER.exec(t);
      if (m) {
        verband = true;
        const artikel = m[1] || "";
        const nomen = m[2];
        let name = nomen;
        if (!/^Hessische/.test(nomen)) {
          const endung = { der: "e", den: "en", dem: "en", des: "en", beim: "en", vom: "en", zum: "en" }[artikel.toLowerCase()];
          name = "Hessisch" + (endung === undefined ? "er" : endung) + " Fußball-" + nomen;
        }
        const vorn = artikel ? m[0].slice(0, m[0].length - nomen.length) : "";
        t = t.slice(0, m.index) + vorn + name + VERBAND_KURZ + t.slice(m.index + m[0].length);
      }
    }
    if (!spielrecht) {
      const m = SPIELRECHT_MUSTER.exec(t);
      if (m) {
        spielrecht = true;
        t = t.slice(0, m.index + m[0].length) + SPIELRECHT_ERKLAERUNG + t.slice(m.index + m[0].length);
      }
    }
    return t;
  };
}

// Papiere, die vielleicht nötig sind und noch nicht vorliegen: Der Laufzettel führt sie mit "klären" (sprache-9). Teil A nennt
// sie mit Namen, damit Teil A nicht "alles liegt bei" sagt, solange der Laufzettel etwas klärt.
const VERBAND_UNTERLAGEN = new Set(["U07", "U08", "U09", "U10", "U11", "U12", "U13", "U14", "U17", "U18", "U20", "U21", "U22", "U23", "U26", "U27", "U36", "U37", "U38", "U39", "U40"]);

function unterlagenZuKlaeren(K, plan) {
  return liste(K.e.unterlagen).filter((u) => u.art === "offen" && unterlageStatus(K, plan, u) === "klären");
}

// Blätter, die die Familie selbst ausdrucken muss (sprache-11): nur die, die wirklich auf Papier müssen.
//  - Attest-Vorlage für die Ärztin oder den Arzt und Abmeldung beim alten Verein: immer (Arzt und Post brauchen Papier)
//  - Blätter mit einer Stift-Stelle der Familie: beim Weg "alles auf Papier" und dem ersten Training druckt der Verein sie aus,
//    sonst die Familie. Bei "selbst ausdrucken" gehört dazu die ganze Datei (dann gibt es keine Liste).
//  - Blätter des Verbands (HFV): am Bildschirm unterschrieben druckt sie der Verein zum ersten Training, wenn die Familie
//    "beim ersten Training" wählt; sonst druckt sie die Familie.
// Rückgabe: { alles: true } wenn die ganze Datei auszudrucken ist, sonst { blaetter: [{ name, von, bis }] }.
function druckListe(K, plan, stifte) {
  const papierWeg = K.a.unterschriftWeg !== "bildschirm";
  const training = K.a.hfvUnterschrift !== "selbst_drucken";
  if (papierWeg && !training) return { alles: true, blaetter: [] };
  const blaetter = [];
  const merke = (name, r) => r && blaetter.push({ name: name, von: r.von, bis: r.bis });
  if (!papierWeg) {
    const formulare = [];
    stifte.forEach((u) => {
      if (u.formular === "abmeldung" || formulare.includes(u.formular)) return;
      if (HFV_FORMULARE.includes(u.formular) && training) return; // druckt der Verein zum ersten Training
      formulare.push(u.formular);
    });
    formulare.forEach((f) => merke(deRegeln.formulare[f] || f, plan.formulare[f]));
  }
  if (plan.attestVorlage) merke(ATTEST_VORLAGE_NAME, plan.attestVorlage);
  if (plan.formulare.abmeldung) merke(deRegeln.formulare.abmeldung, plan.formulare.abmeldung);
  blaetter.sort((p, q) => p.von - q.von);
  return { alles: false, blaetter: blaetter };
}

function seiteTeilA(K, S, plan) {
  const T = TEXTE_TEIL_A;
  const e = K.e;
  const et = K.eText;
  const E = begriffsErklaerer();
  // Läufe ([{ t, fett, … }]): jeder Text läuft durch den Erklärer, Eingaben der Familie (nutzer) nicht
  const ER = (laeufe) => laeufe.map((l) => (l.nutzer ? l : Object.assign({}, l, { t: E(l.t) })));
  const zwischen = { size: 10.5, nach: 4 };
  const hatC = !!plan.teile.C;
  const von = (t) => plan.teile[t].von;
  const bis = (t) => plan.teile[t].bis;
  const seiten = (t) => seitenText(von(t), bis(t));

  S.ueberschrift(T.titel, 1);
  S.absatz([{ t: K.person.name, fett: true, nutzer: true }, { t: "· " + vereinKurz(K) }], { size: 12, nach: 8 });
  S.absatz(ersetzePlatzhalter(T.einleitung, { anzahl: ZAHLWORT[hatC ? 3 : 2] }), { size: 11, nach: 4 });
  const teile = [
    [{ t: TEIL_ANZEIGE.A + " (" + seiten("A") + "):", fett: true }, { t: T.teilA }],
    [{ t: TEIL_ANZEIGE.B + " (" + seiten("B") + "):", fett: true }, { t: T.teilB }],
  ];
  if (hatC) teile.push([{ t: TEIL_ANZEIGE.C + " (" + seiten("C") + "):", fett: true }, { t: T.teilC }]);
  S.liste(teile, { size: 10.5, nach: 3 });

  // --- So geht es weiter ---
  S.ueberschrift(T.weiterTitel, 2);
  const schritte = [];
  const gezeichnet = alleStellen(K).filter((u) => plan.stelleSeite(u.formular, u.stelleKey) != null);
  const stifte = gezeichnet.filter((u) => FAMILIE_WER.includes(u.wer) && stelleArt(K, u.formular, u.wer, u.stelleKey) === "stift");
  const hatAbmeldung = !!plan.formulare.abmeldung;
  const stifteAndere = stifte.filter((u) => u.formular !== "abmeldung");
  const stifteHfv = stifteAndere.filter((u) => HFV_FORMULARE.includes(u.formular));
  const training = K.a.hfvUnterschrift !== "selbst_drucken";
  // 1. Unterschriften. Die Abmeldung beim alten Verein hat einen eigenen Schritt weiter unten.
  const erster = [];
  if (!stifte.length) erster.push(T.stiftKeine);
  else if (K.a.unterschriftWeg !== "bildschirm") erster.push(training ? (hatAbmeldung ? T.stiftAlleTrainingOhneAbmeldung : T.stiftAlleTraining) : T.stiftAlleDrucken);
  else {
    if (stifteHfv.length) erster.push(training ? T.stiftTraining : T.stiftDrucken);
    if (stifteAndere.length > stifteHfv.length) erster.push(T.stiftRest);
  }
  // 2. Was auf Papier muss: ein Satz mit den Blättern, oder "Sie müssen nichts ausdrucken."
  const druck = druckListe(K, plan, stifteAndere);
  if (!druck.alles && !druck.blaetter.length) erster.push(T.ausdruckenNichts);
  if (erster.length) schritte.push(E(erster.join(" ")));
  if (!druck.alles && druck.blaetter.length) {
    schritte.push({ inhalt: E(T.ausdruckenNur), unter: druck.blaetter.map((b) => E(seitenText(b.von, b.bis) + ": " + b.name)) });
  }
  if (K.a.satzung !== true && plan.formulare.aufnahmeantrag) schritte.push(E(ersetzePlatzhalter(T.satzung, { seite: plan.formulare.aufnahmeantrag.von })));
  if (plan.attestVorlage) {
    schritte.push(E(ersetzePlatzhalter(T.attest, { seite: plan.attestVorlage.von }) + " " + T.attestKosten));
  }
  if (hatAbmeldung) {
    schritte.push(E(ersetzePlatzhalter(T.abmeldung, { name: deRegeln.formulare.abmeldung, seiten: seitenText(plan.formulare.abmeldung.von, plan.formulare.abmeldung.bis) })));
  }
  const fehlend = liste(e.fehlend);
  if (fehlend.length) schritte.push(E(T.fehlt));
  schritte.push(E(druck.alles ? T.abgebenAusgedruckt : T.abgeben));
  if (hatC) schritte.push(E(T.abgebenC));
  schritte.push(E(K.a.spielen === true && e.status ? T.verband : T.verein));
  schritte.push(E(T.nichtWhatsapp));
  S.liste(schritte, { size: 10.5, marker: "nummer", nach: 4 });

  // --- Wo unterschreiben Sie? ---
  S.ueberschrift(T.unterschriftenTitel, 2);
  const verlangt = gezeichnet;
  if (!verlangt.length) S.absatz(T.unterschriftenKeine, zwischen);
  else {
    S.absatz(T.unterschriftenEinleitung, { size: 10, nach: 4 });
    S.tabelle(
      [{ w: 9, titel: "Seite" }, { w: 35, titel: "Blatt" }, { w: 27, titel: "Wer unterschreibt?" }, { w: 29, titel: "Wie?" }],
      verlangt.map((u) => [
        String(plan.stelleSeite(u.formular, u.stelleKey) || ""),
        deRegeln.unterschriften[u.formular + "." + u.stelleKey] || u.formular + " " + u.stelleKey,
        werLabel(u.wer),
        wieText(K, u),
      ]),
      { size: 9 }
    );
  }

  // --- Das fehlt noch ---
  S.ueberschrift(T.fehltTitel, 2);
  const nichtLesbar = Object.keys(plan.nachweise).filter((id) => plan.nachweise[id].nichtLesbar >= plan.nachweise[id].dateien && !fehlend.includes(id));
  const klaeren = unterlagenZuKlaeren(K, plan);
  if (!fehlend.length && !nichtLesbar.length) {
    S.absatz(E(klaeren.length ? T.fehltKeineSicher : T.fehltKeine), zwischen);
  } else {
    S.absatz(T.fehltEinleitung, { size: 10, nach: 4 });
    nichtLesbar.forEach((id) => {
      S.kaestchenZeile(false, [{ t: unterlageName(K, id), fett: true }], { size: 10.5, nach: 1 });
      S.absatz(E(T.fehltNichtLesbar), { size: 10, einzug: 18, nach: 5 });
    });
    fehlend.forEach((id) => {
      const u = liste(et.unterlagen).find((x) => x.id === id) || { id: id, werte: {} };
      S.kaestchenZeile(false, [{ t: unterlageName(K, id), fett: true }], { size: 10.5, nach: 1 });
      S.absatz(ER([{ t: T.fehltWie, fett: true }, { t: unterlageText(K, u, "wie") }]), { size: 10, einzug: 18, nach: 1 });
      S.absatz(ER([{ t: T.fehltWo, fett: true }, { t: unterlageText(K, u, "wo") }]), { size: 10, einzug: 18, nach: 5 });
    });
  }
  if (klaeren.length) S.absatz(E(T.fehltVielleicht), { size: 10, farbe: FARBE.tinte2, nach: 4 });

  // --- Wann darf gespielt werden? ---
  if (K.a.spielen === true && e.status) {
    S.ueberschrift(T.wartezeitTitel, 2);
    const fr = et.frist;
    const satz = ersetzePlatzhalter(deRegeln.frist[fr.key], fr.werte);
    S.absatz(E(satz), { size: 10.5, nach: 3 });
    S.absatz(E(fr.unsicher ? T.wartezeitUnsicher : T.wartezeitSchaetzung), { size: 10, farbe: FARBE.tinte2, nach: 4 });
    const m = objekt(et.mannschaft);
    if (m.hinweisKey && deRegeln.mannschaft[m.hinweisKey]) {
      S.ueberschrift(T.mannschaftTitel, 2);
      S.absatz(E(ersetzePlatzhalter(deRegeln.mannschaft[m.hinweisKey], m.werte)), { size: 10.5, nach: 4 });
    }
  }

  // --- Beitrag ---
  const b = objekt(et.beitrag);
  if (b.hinweisKey && b.hinweisKey !== "beitrag_offen" && deRegeln.beitrag[b.hinweisKey]) {
    S.ueberschrift("Der Beitrag", 2);
    S.absatz(E(ersetzePlatzhalter(deRegeln.beitrag[b.hinweisKey], b.werte)), zwischen);
    const gebuehr = liste(et.unterlagen).find((u) => u.id === "U35");
    if (gebuehr && deRegeln.unterlagen.U35) S.absatz(E(unterlageText(K, gebuehr, "kurz")), zwischen);
  }

  // --- Das sollten Sie wissen ---
  const hw = liste(et.hinweise);
  const wichtig = hw.filter((h) => h.art === "warnung" || h.art === "frist");
  const info = hw.filter((h) => h.art === "info");
  const offen = hw.filter((h) => h.art === "offen");
  if (wichtig.length || info.length) {
    S.ueberschrift(T.wissenTitel, 2);
    if (wichtig.length) S.liste(wichtig.map((h) => ER([{ t: HINWEIS_ART[h.art] + ":", fett: true, farbe: FARBE.blau }, { t: hinweisText(h) }])), { size: 10, nach: 2 });
    if (info.length) S.liste(info.map((h) => E(hinweisText(h))), { size: 10, nach: 2 });
  }
  if (offen.length || klaeren.length || liste(et.weiterleitung).length) {
    S.ueberschrift(T.klaerenTitel, 2);
    // Papiere, die vielleicht nötig sind (Laufzettel: "klären"), mit Namen. Was der Verband verlangen kann, steht für sich.
    if (klaeren.length) {
      const verbandListe = klaeren.filter((u) => VERBAND_UNTERLAGEN.has(u.id));
      const vereinListe = klaeren.filter((u) => !VERBAND_UNTERLAGEN.has(u.id));
      const gruppen = [];
      if (verbandListe.length) gruppen.push({ inhalt: E(T.vielleichtVerband), unter: verbandListe.map((u) => E(unterlageName(K, u.id))) });
      if (vereinListe.length) gruppen.push({ inhalt: E(T.vielleichtVerein), unter: vereinListe.map((u) => E(unterlageName(K, u.id))) });
      S.liste(gruppen, { size: 10, nach: 3 });
    }
    if (offen.length) S.liste(offen.map((h) => E(hinweisText(h))), { size: 10, nach: 3 });
    const wl = liste(et.weiterleitung);
    if (wl.length) {
      S.ueberschrift(T.stellenTitel, 3);
      S.liste(wl.map((w) => ER([{ t: (STELLE_KLARTEXT[w.an] || w.an) + ":", fett: true }, { t: deRegeln.weiterleitung[w.key] || "" }])), { size: 10, nach: 3 });
    }
  }

  // --- Kontakt ---
  S.ueberschrift(T.kontaktTitel, 2);
  S.absatz(T.kontaktEinleitung, zwischen);
  const kt = objekt(K.cfg.kontakte);
  const kontakte = [];
  const tel = text(K.verein.tel_geschaeftsstelle) || text(kt.telefon);
  const gsMail = text(K.verein.mail) || text(objekt(kt.geschaeftsstelle).mail);
  kontakte.push([{ t: "Geschäftsstelle:", fett: true }, { t: [tel ? "Telefon " + tel : "", gsMail].filter(Boolean).join(" · ") }]);
  const stellen = new Set(liste(et.weiterleitung).map((w) => w.an));
  const abteilung = text(K.a.abteilung);
  if (text(objekt(kt.jugendleitung).mail) && (stellen.has("jugendleitung") || ((abteilung === "fussball" || abteilung === "beides") && K.minderjaehrig))) kontakte.push([{ t: "Jugendleitung:", fett: true }, { t: kt.jugendleitung.mail }]);
  if (text(objekt(kt.karneval).mail) && (stellen.has("karneval") || abteilung === "karneval" || abteilung === "beides")) kontakte.push([{ t: "Karnevalabteilung:", fett: true }, { t: kt.karneval.mail }]);
  if (text(objekt(kt.spielausschuss).mail) && stellen.has("spielausschuss")) kontakte.push([{ t: "Spielausschuss Herren:", fett: true }, { t: kt.spielausschuss.mail }]);
  S.liste(kontakte, { size: 10.5, nach: 3 });
}

// ---------------------------------------------------------------------------
// Teil B, erste Seite: Laufzettel für den Verein
// ---------------------------------------------------------------------------

// Status einer Unterlage auf dem Laufzettel
function unterlageStatus(K, plan, u) {
  const nw = plan.nachweise[u.id];
  const seiteBis = (r) => (r.von === r.bis ? String(r.von) : r.von + "–" + r.bis);
  if (nw) {
    if (nw.nichtLesbar >= nw.dateien) return "Datei nicht lesbar, bitte im Verein vorlegen";
    if (nw.nichtLesbar > 0) return "liegt bei (Seite " + seiteBis(nw) + "), eine Datei nicht lesbar";
    return "liegt bei (Seite " + seiteBis(nw) + ")";
  }
  if (u.id === "U16") {
    if (plan.foto) return "liegt bei (Seite " + plan.foto.von + ")";
    if (text(objekt(K.a.spielerfoto).weg) === "verein") return "Verein macht das Foto";
    return "fehlt";
  }
  const f = u.formular;
  const seg = f ? plan.formulare[f] : null;
  let seite = seg ? seg.von : null;
  if (f === "aufnahmeantrag" && seg) seite = seg.von + ({ U02: 1, U04: 2, U05: 3, U34: 0 }[u.id] || 0);
  if (f === "hfv_antrag" && seg && u.id === "U08") seite = seg.von + 2;
  if (f === "familienliste" && plan.formulare.aufnahmeantrag) seite = plan.formulare.aufnahmeantrag.von + 1;
  if (f === "attest") seite = u.id === "U11" ? (plan.attestEinwilligung && plan.attestEinwilligung.von) : plan.attestVorlage && plan.attestVorlage.von;
  const vorlage = seite ? " (Vordruck: Seite " + seite + ")" : "";
  if (u.nachweis && ["pflicht", "verein", "nur_wenn"].includes(u.art)) return "fehlt" + (f === "attest" || f === "abmeldung" ? vorlage : "");
  if (seite) return "liegt bei (Seite " + seite + ")";
  if (u.art === "offen") return "klären";
  if (u.id === "U15") return "siehe unten (Angaben für DFBnet)";
  if (u.id === "U35") return "Verein erhebt";
  if (u.wer === "verein" || u.wer === "alter_verein") return "Verein klärt";
  if (u.form === "original_mitbringen") return "Original zeigen";
  return "klären";
}

// Erklärung zum Status "offen"/"klären" für den Verein (Grund der Unterlage)
function seiteLaufzettel(K, S, plan) {
  const e = K.e;
  const et = K.eText;
  const a = K.a;
  const g = { size: 8.5, nach: 2.5, zeilenhoehe: 1.3 };
  S.ueberschrift("Laufzettel für den Verein", 1);
  S.absatz("Interne Übersicht zur Anmeldung. Bitte vor dem Antrag beim Verband prüfen.", { size: 9, farbe: FARBE.tinte2, nach: 5 });

  // Kopfdaten
  const alterText = typeof e.alter === "number" ? e.alter + " Jahre" : "";
  const klasse = text(e.altersklasse) ? text(e.altersklasse) === "Herren" ? "Herren" : e.altersklasse + "-Jugend" : "";
  const statusText = e.status ? deRegeln.status[e.status] : "kein Spielrecht beantragt";
  S.angabenKasten(
    [
      ["Name", K.person.name],
      ["Geburtsdatum", geburtsText(K) + (alterText ? " (" + alterText + ")" : "")],
      ["Abteilung", ABTEILUNG_TEXT[a.abteilung] || ""],
      ["Altersklasse", [klasse, mannschaftText(K)].filter(Boolean).join(" · ")],
      ["Art", statusText],
      ["International", e.international ? "ja (Freigabe über den DFB)" : "nein"],
      ["Erstellt am", K.heuteDe],
      ["Regelwerk", "Version " + e.version + ", Stand " + text(K.konfig.stand || K.cfg.stand)],
    ],
    { size: 9, labelBreite: 66 }
  );
  if (K.ersetzt) S.absatz([{ t: "Name bitte prüfen:", fett: true, farbe: FARBE.blau }, { t: "Die Eingabe enthält Zeichen, die im PDF nicht darstellbar sind. Sie stehen als ? im Text. Bitte mit dem Ausweis vergleichen." }], g);

  // Fälle
  if (liste(e.faelle).length) {
    S.ueberschrift("Fälle", 3);
    S.liste(liste(e.faelle).map((f) => [{ t: f, fett: true }, { t: "– " + (deRegeln.faelle[f] || "") }]), { size: 8.5, nach: 1.5 });
  }

  // Frist
  if (a.spielen === true && e.status) {
    S.ueberschrift("Wartefrist (Schätzung, der Verein prüft genau)", 3);
    const fr = e.frist;
    const regel = fr.regel ? objekt(objekt(K.cfg.fristen).regeln)[fr.regel] : null;
    const zeilen = [];
    const basis = fr.basisRegel && fr.basisRegel !== fr.regel ? objekt(objekt(K.cfg.fristen).regeln)[fr.basisRegel] : null;
    zeilen.push([{ t: "Regel:", fett: true }, { t: (fr.regel || "–") + (regel ? " – " + regel.titel : "") + (basis ? " (Fristen nach " + fr.basisRegel + " – " + basis.titel + ")" : "") + (fr.unsicher ? " · unsicher" : "") }]);
    zeilen.push([{ t: "Pflichtspiele ab:", fett: true }, { t: fr.pflichtspieleAb ? datumDe(fr.pflichtspieleAb) : "offen" }, { t: "Freundschaftsspiele ab:", fett: true }, { t: fr.freundschaftsspieleAb ? datumDe(fr.freundschaftsspieleAb) : "offen" }]);
    if (fr.abmeldedatum) zeilen.push([{ t: "Abmeldetag für die Berechnung:", fett: true }, { t: datumDe(fr.abmeldedatum) + (fr.basis === "heute" ? " (angenommen: heute)" : " (angegeben)") }]);
    if (fr.alternativ && fr.alternativ.pflichtspieleAb) zeilen.push([{ t: "Mit Freigabe schon ab:", fett: true }, { t: datumDe(fr.alternativ.pflichtspieleAb) }]);
    if (fr.antragBis) zeilen.push([{ t: "Antrag beim Verband bis:", fett: true }, { t: datumDe(fr.antragBis) + (fr.zuSpaet ? " – Frist ist vorbei" : "") }]);
    zeilen.forEach((z) => S.absatz(z, Object.assign({}, g, { nach: 1 })));
    S.absatz(ersetzePlatzhalter(deRegeln.frist[et.frist.key], et.frist.werte), Object.assign({}, g, { farbe: FARBE.tinte2 }));
  }

  // Unterlagen
  S.ueberschrift("Unterlagen", 3, 50);
  const unterlagen = liste(e.unterlagen);
  S.tabelle(
    [{ w: 7, titel: "Nr." }, { w: 45, titel: "Unterlage" }, { w: 20, titel: "Art" }, { w: 28, titel: "Status" }],
    unterlagen.map((u) => [u.id, unterlageName(K, u.id), ART_KLARTEXT[u.art] || u.art, unterlageStatus(K, plan, u)]),
    { size: 8, polster: 2.0 }
  );

  // Inhalt der Datei
  S.ueberschrift("Inhalt dieser Datei", 3, 60);
  S.tabelle(
    [{ w: 14, titel: "Seite" }, { w: 86, titel: "Inhalt" }],
    plan.inhalt.map((z) => [z.von === z.bis ? String(z.von) : z.von + "–" + z.bis, z.titel]),
    { size: 8, polster: 1.8 }
  );

  // Angaben für das Verbandssystem (DFBnet)
  if (a.spielen === true) {
    S.ueberschrift("Angaben für DFBnet (fehlen im HFV-Formular)", 3, 90);
    const av = objekt(a.alterVerein);
    const staaten = staatenListe(a).map(landName).join(", ");
    const paare = [
      ["Geburtsort", text(a.geburtsort)],
      ["Geburtsland", landName(a.geburtsland)],
      ["Staatsangehörigkeit", staaten || "nicht angegeben"],
      ["Deutscher Pass", { ja: "ja", nein: "nein", weiss_nicht: "weiß nicht" }[a.deutsch] || ""],
      ["Geschlecht", (GESCHLECHT_TEXT[a.geschlecht] || "") + (a.spielrechtFuer ? ", Spielrecht für " + (a.spielrechtFuer === "m" ? "Herren" : "Frauen") : "")],
      ["Zuletzt im Ausland", a.auslandGewohnt === "ja" ? [text(a.auslandStadt), landName(a.auslandLand)].filter(Boolean).join(", ") || "ja" : a.auslandGewohnt === "nein" ? "nein" : ""],
    ];
    if (K.minderjaehrig) paare.push(["Wohnsituation", (WOHNEN_TEXT[a.wohnen] || "") + (a.wohnenSeit ? ", seit " + datumDe(a.wohnenSeit) : "")]);
    if (e.status && e.status !== "neu") {
      paare.push(["Alter Verein", [text(av.name), text(av.ort), landName(av.land)].filter(Boolean).join(", ")]);
      paare.push(["Verband", text(av.verband) || (av.region === "hessen" ? LETZTER_VERBAND_HESSEN : "")]);
    }
    S.angabenKasten(paare, { size: 8.5, labelBreite: 78 });
    if (e.status && e.status !== "neu") {
      const ab = objekt(a.abmeldung);
      const abText = { einschreiben: "per Einschreiben" + (ab.datum ? " am " + datumDe(ab.datum) : ""), formlos: "nur formlos (zählt nicht)", noch_nicht: "noch nicht abgemeldet", weiss_nicht: "unklar" }[ab.status] || "";
      const zeilen = [
        [{ t: "Abmeldung:", fett: true }, { t: [abText, ab.weg === "vollmacht" ? "Weg: Vollmacht" : ab.weg === "einschreiben" ? "Weg: Einschreiben" : ""].filter(Boolean).join(", ") }],
        [{ t: "Letztes Spiel:", fett: true }, { t: a.letztesSpiel ? datumDe(a.letztesSpiel) : "–" }, { t: "Letztes Pflichtspiel:", fett: true }, { t: a.letztesPflichtspiel ? datumDe(a.letztesPflichtspiel) : "–" }],
        [{ t: "Sperre:", fett: true }, { t: { ja: "ja" + (a.sperreBis ? ", bis " + datumDe(a.sperreBis) : ""), nein: "nein", weiss_nicht: "unklar" }[a.sperre] || "–" }, { t: "Freigabe des alten Vereins:", fett: true }, { t: { ja: "ja", nein: "nein", weiss_nicht: "unklar" }[a.freigabe] || "–" }],
        [{ t: "Wechsel in den letzten 6 Monaten:", fett: true }, { t: { ja: "ja", nein: "nein" }[a.wechselLetzte6Monate] || "–" }, { t: "Mitgliedschaft dort:", fett: true }, { t: { kuendigen: "wird gekündigt", passiv: "bleibt passiv", weiss_nicht: "unklar" }[av.mitgliedschaft] || "–" }],
      ];
      zeilen.forEach((z) => S.absatz(z, Object.assign({}, g, { nach: 1 })));
    }
  }
  // Sorgeberechtigte
  if (K.minderjaehrig) {
    S.ueberschrift("Personen mit Sorgerecht", 3);
    S.absatz([{ t: "Sorgerecht:", fett: true }, { t: (SORGE_TEXT[a.sorge] || "nicht angegeben") + (a.sorge === "getrennt_bei_mir" ? (a.andererElternteilEinverstanden === true ? " – anderer Elternteil ist einverstanden" : " – Einverständnis des anderen Elternteils offen") : "") }], g);
    const sb = liste(a.sorgeberechtigte);
    if (!sb.length) S.absatz("Keine Person angegeben.", g);
    sb.forEach((p) => {
      const q = objekt(p);
      S.absatz([{ t: (ROLLEN[q.rolle] || "Person") + ":", fett: true }, { t: [[q.vorname, q.nachname].filter(hatText).map(text).join(" "), text(q.telefon), text(q.email)].filter(Boolean).join(" · "), nutzer: true }], Object.assign({}, g, { nach: 1 }));
    });
    S.absatz([{ t: "Kontakt der Familie:", fett: true }, { t: [text(a.mobil), text(a.telefon), text(a.email)].filter(Boolean).join(" · "), nutzer: true }], g);
  }
  // Beitrag und Zahlung
  S.ueberschrift("Beitrag und Zahlung", 3);
  const b = objekt(e.beitrag);
  const gruppenNamen = liste(b.gruppen).map((k) => objekt(objekt(K.cfg.beitragsgruppen)[k]).bezeichnung || k);
  const beitragText = b.doppel ? "Beitrag nennt die Geschäftsstelle (zwei Abteilungen)" : b.jahr != null ? b.jahr + " Euro im Jahr" + (b.monat != null ? " (" + b.monat + " Euro im Monat)" : "") : "offen";
  S.absatz([{ t: "Beitragsgruppe:", fett: true }, { t: (gruppenNamen.join(" und ") || "–") + " – " + beitragText + "; Aufnahmegebühr " + (b.aufnahmegebuehr != null ? b.aufnahmegebuehr + " Euro" : "offen") }], g);
  const z = objekt(a.zahlung);
  if (z.art === "sepa") {
    const ki = { mitglied: "Mitglied selbst", sorgeberechtigt: "Person mit Sorgerecht", andere: "andere Person: " + [text(z.kiVorname), text(z.kiNachname)].filter(Boolean).join(" ") }[z.kontoinhaber] || "";
    S.absatz([{ t: "Zahlung:", fett: true }, { t: "SEPA-Lastschrift" + (ki ? ", Konto von: " + ki : "") + ", IBAN " + ibanMaskiert(z.iban) + " (volle IBAN nur auf Seite " + plan.mandatSeite + ")", nutzer: true }], g);
  } else if (z.art === "rechnung") {
    S.absatz([{ t: "Zahlung:", fett: true }, { t: "Rechnung" + (b.zuschlagOhneSepa != null ? " (Zuschlag ohne Lastschrift möglich: " + b.zuschlagOhneSepa + " Euro, Vorstand klärt)" : "") }], g);
  } else {
    S.absatz([{ t: "Zahlung:", fett: true }, { t: "nicht angegeben" }], g);
  }

  // Hinweise, Weiterleitung
  const hw = liste(et.hinweise).filter((h) => h.art === "warnung" || h.art === "frist" || h.art === "offen");
  if (hw.length) {
    S.ueberschrift("Hinweise und offene Punkte", 3);
    S.liste(hw.map((h) => [{ t: HINWEIS_ART[h.art] + ":", fett: true }, { t: hinweisText(h) }]), { size: 8.5, nach: 1.5 });
  }
  const wl = liste(et.weiterleitung);
  if (wl.length) {
    S.ueberschrift("Weiterleitung", 3);
    S.liste(wl.map((w) => [{ t: (STELLE_KLARTEXT[w.an] || w.an) + ":", fett: true }, { t: deRegeln.weiterleitung[w.key] || "" }]), { size: 8.5, nach: 1.5 });
  }

  // Für den Verein zu klären
  const pruef = [];
  if (z.art === "sepa") {
    pruef.push(unterlageName(K, "U05") + " (SEPA-Lastschriftmandat): Alle Mandate tragen dieselbe gedruckte Mandatsreferenz („Beitrag Sportfreunde 04“). Eine eigene Referenz je Mitglied vergeben.");
    pruef.push(unterlageName(K, "U05") + " (SEPA-Lastschriftmandat): Seite 1 des Aufnahmeantrags nennt als Abbuchung das erste Kalendervierteljahr, Seite 4 den Februar. Termin klären.");
  }
  const digital = alleStellen(K).some((u) => stelleArt(K, u.formular, u.wer, u.stelleKey) === "bild");
  if (digital) pruef.push("Unterschriften am Bildschirm gezeichnet (einfache elektronische Signatur) auf Vereinsunterlagen. Der Vorstand bestätigt, dass die Satzung (Schriftform, § 127 BGB) das zulässt.");
  if (a.satzung !== true) pruef.push("Aufnahmeantrag Seite 1: Das Kästchen „Satzung zur Kenntnis genommen“ ist offen. Die Familie kreuzt es von Hand an.");
  if (plan.formulare.datenschutz) pruef.push("Die " + eintragName("datenschutz") + ", alle Einverständnisse und Erlaubnisse sowie der " + eintragName("notfall") + " sind Entwürfe. Der Vorstand gibt die Texte frei (Fußzeile „Entwurf“).");
  if (pruef.length) {
    S.ueberschrift("Für den Verein zu klären", 3);
    S.liste(pruef.map((t) => [{ t: "klären:", fett: true }, { t: t }]), { size: 8.5, nach: 1.5 });
  }
  const meldungen = K.fehlendeAngaben.map((m) => "Angabe fehlt im Vordruck – " + m).concat(K.hinweiseIntern, K.warnungen);
  if (K.fotoHinweis) meldungen.push(K.fotoHinweis);
  if (meldungen.length) {
    S.ueberschrift("Hinweise zur Datei", 3);
    S.liste(meldungen.map((t) => [{ t: "klären:", fett: true }, { t: t }]), { size: 8.5, nach: 1.5 });
  }

  // Bearbeitungsfelder
  S.ueberschrift("Bearbeitung durch den Verein", 3, 82); // der Block (zwei Reihen und die Schlusszeile) bleibt zusammen
  S.feldZeile([{ label: "Eingang am", w: 1, wer: "verein" }, { label: "geprüft von", w: 1.3, wer: "verein" }, { label: "DFBnet-Antrag gestellt am", w: 1.2, wer: "verein" }], { hoehe: 20 });
  S.feldZeile([{ label: "Spielberechtigung erteilt am", w: 1.2, wer: "verein" }, { label: "Originale abgelegt am", w: 1.1, wer: "verein" }, { label: "Löschung am", w: 1, wer: "verein" }], { hoehe: 20 });
  S.absatz("Regelwerk Version " + e.version + " · Stand " + text(K.konfig.stand || K.cfg.stand) + " · Aufbewahrung der Originale mindestens " + text(objekt(objekt(K.cfg.fristen).aufbewahrungJahre).wert || 2) + " Jahre ab Antrag.", { size: 7.5, farbe: FARBE.tinte3, nach: 0 });
}

// ---------------------------------------------------------------------------
// Spielerfoto, Kopien der Nachweise, Wasserzeichen
// ---------------------------------------------------------------------------

const WASSERZEICHEN_TEXT = (K) => "KOPIE – nur für die Spielberechtigung beim HFV – " + vereinKurz(K) + " – " + K.heuteDe;
const MAX_NACHWEIS_SEITEN = 12;

// Prüft und bettet die Bilder ein, die ins PDF kommen: Spielerfoto und Nachweise (Bilder, PDFs).
async function bereiteBilder(K) {
  const L = K.L;
  K.foto = null;
  K.nachweisDateien = [];
  // Spielerfoto (nur wenn es den Verein nicht selbst macht)
  const f = K.bilder.spielerfoto;
  const u16 = liste(K.e.unterlagen).some((u) => u.id === "U16");
  if (u16 && f && f.bytes && f.bytes.length && text(objekt(K.a.spielerfoto).weg) !== "verein") {
    const art = bildArt(f.bytes);
    const masse = art === "jpeg" || art === "png" ? bildMasse(f.bytes, art) : null;
    if (masse) {
      try {
        const img = art === "png" ? await K.doc.embedPng(f.bytes) : await K.doc.embedJpg(f.bytes);
        K.foto = { img: img, breite: masse.breite, hoehe: masse.hoehe };
        const verhaeltnis = masse.breite / masse.hoehe;
        if (masse.breite < 375) K.fotoHinweis = unterlageName(K, "U16") + " ist zu klein (" + masse.breite + " × " + masse.hoehe + " Pixel, nötig sind mindestens 375 Pixel Breite).";
        else if (Math.abs(verhaeltnis - 0.75) > 0.03) K.fotoHinweis = unterlageName(K, "U16") + " hat nicht das Format 3:4 (" + masse.breite + " × " + masse.hoehe + " Pixel).";
      } catch (fehler) {
        K.fotoHinweis = unterlageName(K, "U16") + " ließ sich nicht einlesen.";
      }
    } else {
      K.fotoHinweis = unterlageName(K, "U16") + " ließ sich nicht einlesen.";
    }
  }
  // Nachweise in der Reihenfolge der Unterlagen
  const ids = liste(K.e.unterlagen).map((u) => u.id);
  for (const id of ids) {
    const dateien = liste(K.bilder.nachweise[id]);
    let nr = 0;
    for (const d of dateien) {
      if (!d || !d.bytes || !d.bytes.length) continue;
      nr += 1;
      const eintrag = { id: id, nr: nr, von: dateien.length, teil: id === "U10" ? "C" : "B", bytes: d.bytes, art: bildArt(d.bytes), fehler: null, seiten: 1 };
      if (eintrag.art === "jpeg" || eintrag.art === "png") {
        const masse = bildMasse(d.bytes, eintrag.art);
        if (!masse) eintrag.fehler = "Bild nicht lesbar";
        else {
          try {
            eintrag.img = eintrag.art === "png" ? await K.doc.embedPng(d.bytes) : await K.doc.embedJpg(d.bytes);
            eintrag.breite = masse.breite;
            eintrag.hoehe = masse.hoehe;
          } catch (fehler) {
            eintrag.fehler = "Bild nicht lesbar";
          }
        }
      } else if (eintrag.art === "pdf") {
        try {
          eintrag.quelle = await L.PDFDocument.load(d.bytes, { updateMetadata: false });
          eintrag.seiten = Math.min(MAX_NACHWEIS_SEITEN, Math.max(1, eintrag.quelle.getPageCount()));
          if (eintrag.quelle.getPageCount() > MAX_NACHWEIS_SEITEN) K.hinweiseIntern.push("Nachweis " + id + ": nur die ersten " + MAX_NACHWEIS_SEITEN + " von " + eintrag.quelle.getPageCount() + " Seiten übernommen");
        } catch (fehler) {
          eintrag.fehler = istVerschluesselt(d.bytes, fehler) ? "PDF verschlüsselt" : "PDF nicht lesbar";
        }
      } else {
        eintrag.fehler = "Dateityp nicht unterstützt";
      }
      K.nachweisDateien.push(eintrag);
    }
  }
}

// Erkennt verschlüsselte PDFs an der Fehlermeldung von pdf-lib oder am Eintrag /Encrypt im Dateiende
function istVerschluesselt(bytes, fehler) {
  if (/encrypt/i.test(String(fehler && fehler.name) + " " + String(fehler && fehler.message))) return true;
  const ende = bytes.subarray(Math.max(0, bytes.length - 4096));
  let s = "";
  for (let i = 0; i < ende.length; i++) s += String.fromCharCode(ende[i]);
  return s.indexOf("/Encrypt") >= 0;
}

// Diagonales, halbtransparentes Wasserzeichen (drei parallele Zeilen) und Zeile am unteren Rand
function zeichneWasserzeichen(K, page, box, drehung) {
  const t = sicher(K, WASSERZEICHEN_TEXT(K), false);
  const w1 = mess(K, t, 1);
  const rot = drehung || 0;
  const winkel = 45 + rot;
  const laenge = Math.min(0.78 * Math.hypot(box.width, box.height), 0.92 * Math.min(box.width, box.height) * Math.SQRT2);
  const size = Math.max(8, Math.min(26, laenge / w1));
  const l = w1 * size;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const rad = (winkel * Math.PI) / 180;
  const nx = -Math.sin(rad);
  const ny = Math.cos(rad);
  const abstand = size * 6.5;
  [-1, 0, 1].forEach((k) => {
    const mx = cx + nx * abstand * k;
    const my = cy + ny * abstand * k;
    // Startpunkt: Mitte minus halbe Länge entlang der Schreibrichtung, Grundlinie leicht versetzt
    const x = mx - Math.cos(rad) * (l / 2) - nx * (size * 0.3);
    const y = my - Math.sin(rad) * (l / 2) - ny * (size * 0.3);
    zeichneText(K, page, t, x, y, size, { farbe: FARBE.wasserzeichen, drehung: winkel, deckkraft: k === 0 ? 0.28 : 0.18 });
  });
}

// Spielerfoto-Seite
function seiteFoto(K, S) {
  S.ueberschrift(unterlageName(K, "U16"), 1);
  S.absatz(K.person.name, { size: 10, farbe: FARBE.tinte2, nach: 10 });
  S.platz(320);
  const f = K.foto;
  const b = 225;
  const h = 300;
  if (!S.trocken) {
    const x = RAND;
    const y = S.y - h;
    zeichneRechteck(K, S.page, x - 3, y - 3, b + 6, h + 6, { rand: FARBE.linie, randBreite: 0.8, fuellung: FARBE.weiss });
    const m = Math.min(b / f.breite, h / f.hoehe);
    S.page.drawImage(f.img, { x: x + (b - f.breite * m) / 2, y: y + (h - f.hoehe * m) / 2, width: f.breite * m, height: f.hoehe * m });
  }
  S.y -= h + 16;
  S.absatz("Das Foto zeigt Gesicht und Schultern. Der Verein lädt es beim Verband hoch. Ohne Foto darf niemand spielen.", { size: 10, nach: 4 });
  S.absatz("Größe: " + f.breite + " × " + f.hoehe + " Pixel. Nötig sind mindestens 375 Pixel Breite im Format 3:4. In der Jugend erneuert der Verein das Foto nach " + text(objekt(objekt(K.cfg.fristen).spielerfotoErneuernJahre).kreisFrankfurt || 2) + " Jahren.", { size: 9, farbe: FARBE.tinte2 });
}

// Art der Unterlage U10 (Attest) in diesem Fall: "pflicht", "offen" (beim Wechsel ist unklar, ob der Verband es verlangt), "verein" ...
function attestArt(K) {
  return text(objekt(liste(K.e.unterlagen).find((u) => u.id === "U10")).art);
}

// Fassung der Attest-Sätze (Erlaubnis für das Attest, Vorlage für die Praxis, Information zum Datenschutz Nr. 5 und 8):
//  pflicht  der Verband verlangt das Attest (Erstanmeldung Minderjähriger, Juniorinnen, Aushilfe): Text wie bisher
//  offen    Wechsel Minderjähriger: ob der Verband es verlangt, klärt der Verein noch; braucht er es nicht, wird es vernichtet
//  verein   Erwachsene: nur die Vereinsregel, der Verein verlangt das Attest selbst; „der Verband verlangt“ steht dort nirgends
function attestFassung(K) {
  const art = attestArt(K);
  return art === "offen" || art === "verein" ? art : "pflicht";
}

// Titel einer Nachweis-Seite: "Kopie: Attest vom Arzt", aber nicht "Kopie: Kopie der Geburtsurkunde"
function kopieTitel(name) {
  return /^Kopie\b/.test(name) ? name : "Kopie: " + name;
}
function kopieKopf(name) {
  return /^Kopie\b/.test(name) ? name : "Kopie · " + name;
}

// Nachweis als Bild: eine Seite mit Beschriftung, Bild und Wasserzeichen
function seiteNachweisBild(K, S, d) {
  const name = unterlageName(K, d.id);
  S.ueberschrift(kopieTitel(name), 2);
  S.absatz("Nachweis " + d.id + " · Datei " + d.nr + " von " + d.von + " · " + K.person.name, { size: 9, farbe: FARBE.tinte2, nach: 4 });
  const unten = UNTEN + 22;
  const oben = S.y - 4;
  const bx = A4[0] - 2 * RAND;
  const by = oben - unten;
  const m = Math.min(bx / d.breite, by / d.hoehe);
  const w = d.breite * m;
  const h = d.hoehe * m;
  S.page.drawImage(d.img, { x: RAND + (bx - w) / 2, y: oben - h, width: w, height: h });
  zeichneText(K, S.page, sicher(K, WASSERZEICHEN_TEXT(K), false), RAND, UNTEN + 6, 8, { farbe: FARBE.tinte2 });
  zeichneWasserzeichen(K, S.page, { x: 0, y: 0, width: A4[0], height: A4[1] }, 0);
  S.y = UNTEN;
}

// Ersatzseite für eine Datei, die nicht übernommen werden konnte
function seiteNachweisErsatz(K, S, d) {
  S.ueberschrift(kopieTitel(unterlageName(K, d.id)), 2);
  S.absatz("Nachweis " + d.id + " · Datei " + d.nr + " von " + d.von, { size: 9, farbe: FARBE.tinte2, nach: 12 });
  S.absatz("Datei konnte nicht übernommen werden – bitte im Verein vorlegen", { size: 14, fett: true, farbe: FARBE.blau, nach: 8 });
  S.absatz("Grund: " + (d.fehler || "unbekannt") + ". Bringen Sie das Original oder eine Kopie mit.", { size: 10.5, nach: 4 });
}

// Abbildung von Koordinaten der sichtbaren Seite (Ursprung unten links) auf den Seitenraum einer gedrehten Seite
function seitenAbbildung(box, rot) {
  const w = box.width;
  const h = box.height;
  const quer = rot === 90 || rot === 270;
  const abb = {
    breite: quer ? h : w,
    hoehe: quer ? w : h,
    rot: rot,
    zuSeite(vx, vy) {
      if (rot === 90) return { x: box.x + w - vy, y: box.y + vx };
      if (rot === 180) return { x: box.x + w - vx, y: box.y + h - vy };
      if (rot === 270) return { x: box.x + vy, y: box.y + h - vx };
      return { x: box.x + vx, y: box.y + vy };
    },
  };
  return abb;
}

// Text an sichtbaren Koordinaten einer (möglicherweise gedrehten) Seite
function zeichneSichtbar(K, page, abb, s, vx, vy, size, farbe) {
  const p = abb.zuSeite(vx, vy);
  zeichneText(K, page, s, p.x, p.y, size, { farbe: farbe, drehung: abb.rot });
}

// Heller Kasten an sichtbaren Koordinaten (achsenparallel, also auch bei Drehung ein Rechteck)
function zeichneSichtbarKasten(K, page, abb, vx, vy, b, h, deckkraft) {
  const p1 = abb.zuSeite(vx, vy);
  const p2 = abb.zuSeite(vx + b, vy + h);
  page.drawRectangle({ x: Math.min(p1.x, p2.x), y: Math.min(p1.y, p2.y), width: Math.abs(p2.x - p1.x), height: Math.abs(p2.y - p1.y), color: rgbF(K, FARBE.weiss), opacity: deckkraft });
}

// Nachweis als PDF: Seiten übernehmen, Beschriftung und Wasserzeichen darüberlegen
async function uebernehmeNachweisPdf(K, d, teil) {
  const seiten = await K.doc.copyPages(d.quelle, Array.from({ length: d.seiten }, (_, i) => i));
  const name = unterlageName(K, d.id);
  seiten.forEach((p, i) => {
    K.doc.addPage(p);
    K.seiten.push({ page: p, teil: teil, eigen: false, entwurf: false, art: "nachweis", schluessel: d.id, titel: kopieTitel(name), nachweisPdf: true });
    const box = p.getCropBox();
    const rot = ((p.getRotation().angle % 360) + 360) % 360;
    const abb = seitenAbbildung(box, rot);
    // Beschriftung oben links, Hinweis unten links, jeweils auf hellem Grund
    const kopf = sicher(K, kopieKopf(name) + " (" + d.id + ") · Datei " + d.nr + " von " + d.von + " · Seite " + (i + 1) + " von " + d.seiten, false);
    const bk = Math.min(abb.breite - 16, mess(K, kopf, 7.5) + 10);
    zeichneSichtbarKasten(K, p, abb, 8, abb.hoehe - 20, bk, 13, 0.88);
    zeichneSichtbar(K, p, abb, kopf, 13, abb.hoehe - 16.5, 7.5, FARBE.tinte);
    const fuss = sicher(K, WASSERZEICHEN_TEXT(K), false);
    const bf = Math.min(abb.breite - 16, mess(K, fuss, 7.5) + 10);
    zeichneSichtbarKasten(K, p, abb, 8, 6, bf, 13, 0.88);
    zeichneSichtbar(K, p, abb, fuss, 13, 9.5, 7.5, FARBE.tinte);
    zeichneWasserzeichen(K, p, box, rot);
    K.seiten[K.seiten.length - 1].abb = abb;
  });
  return seiten.length;
}

// ---------------------------------------------------------------------------
// Ablauf: Segmente, Plan mit Seitenzahlen, Zeichnen
// ---------------------------------------------------------------------------

export function benoetigteVorlagen(e, a) {
  const menge = new Set();
  liste(e && e.formulare).forEach((f) => {
    if (VORLAGEN.includes(f)) menge.add(f);
    if (f === "familienliste") menge.add("aufnahmeantrag");
  });
  return VORLAGEN.filter((v) => menge.has(v));
}

// Eigene Seiten eines Formulars: Bauanleitung und Titel
function eigeneSeiten(key) {
  switch (key) {
    case "datenschutz": return { bauen: seiteDatenschutz, titel: eintragName(key) };
    case "einverstaendnis_maedchen": return { bauen: seiteMaedchen, titel: eintragName(key) };
    case "einverstaendnis_fahrten": return { bauen: seiteFahrten, titel: eintragName(key) };
    case "karneval_auftritte": return { bauen: seiteKarnevalAuftritte, titel: eintragName(key) };
    default: return null;
  }
}

// Alle Seiten nach dem Laufzettel in ihrer Reihenfolge (ohne das Trennblatt von Teil C, das später eingefügt wird)
function baueSegmente(K) {
  const e = K.e;
  const segs = [];
  const formulare = liste(e.formulare);
  for (const key of formulare) {
    if (TEIL_C_FORMULARE.includes(key) || key === "familienliste") continue;
    if (VORLAGEN.includes(key)) {
      segs.push({ teil: "B", art: "vorlage", schluessel: key, formular: key, titel: eintragName(key) });
      continue;
    }
    const es = eigeneSeiten(key);
    if (es) segs.push({ teil: "B", art: "eigen", schluessel: key, formular: key, titel: es.titel, bauen: es.bauen, entwurf: true });
  }
  if (K.foto) segs.push({ teil: "B", art: "foto", schluessel: "foto", titel: unterlageName(K, "U16"), bauen: seiteFoto });
  const nachweiseB = K.nachweisDateien.filter((d) => d.teil === "B");
  nachweiseB.forEach((d) => segs.push({ teil: "B", art: "nachweis", schluessel: d.id, datei: d, titel: kopieTitel(unterlageName(K, d.id)) + " (" + d.id + ")" }));
  // Teil C
  const attestKopien = K.nachweisDateien.filter((d) => d.teil === "C");
  const attestNoetig = formulare.includes("attest") || attestKopien.length > 0;
  K.attestVorlage = attestNoetig && attestKopien.length === 0;
  if (K.attestVorlage) segs.push({ teil: "C", art: "eigen", schluessel: "attest_vorlage", formular: "attest", titel: ATTEST_VORLAGE_NAME, bauen: seiteAttestVorlage, entwurf: true });
  if (attestNoetig) segs.push({ teil: "C", art: "eigen", schluessel: "attest_einwilligung", formular: "attest", titel: attestEinwilligungName(), bauen: seiteAttestEinwilligung, entwurf: true });
  attestKopien.forEach((d) => segs.push({ teil: "C", art: "nachweis", schluessel: d.id, datei: d, titel: kopieTitel(unterlageName(K, d.id)) + " (" + d.id + ")" }));
  if (formulare.includes("notfall")) segs.push({ teil: "C", art: "eigen", schluessel: "notfall", formular: "notfall", titel: eintragName("notfall"), bauen: seiteNotfall, entwurf: true });
  return segs;
}

async function fuehreSegmentAus(K, seg) {
  const vorher = K.seiten.length;
  if (seg.art === "vorlage") {
    await uebernehmeVorlage(K, seg.schluessel, seg.teil);
    const eintrag = K.formulare[seg.schluessel];
    seg.stellen = Object.fromEntries(liste(eintrag && eintrag.unterschriften).map((st) => [st.stelleKey, st.seite - 1]));
  } else if (seg.art === "nachweis") {
    const d = seg.datei;
    if (d.fehler) {
      const S = new Schreiber(K, { teil: seg.teil, art: "nachweis-ersatz", schluessel: seg.schluessel, titel: seg.titel });
      seiteNachweisErsatz(K, S, d);
    } else if (d.art === "pdf") {
      await uebernehmeNachweisPdf(K, d, seg.teil);
    } else {
      const S = new Schreiber(K, { teil: seg.teil, art: "nachweis", schluessel: seg.schluessel, titel: seg.titel });
      seiteNachweisBild(K, S, d);
    }
  } else {
    const S = new Schreiber(K, { teil: seg.teil, art: seg.art, schluessel: seg.schluessel, titel: seg.titel, entwurf: seg.entwurf === true, formular: seg.formular });
    seg.bauen(K, S);
    seg.stellen = S.stellen;
  }
  seg.rel = vorher; // Index (0-basiert) der ersten Seite unter allen Seiten nach dem Laufzettel
  seg.seiten = K.seiten.length - vorher;
}

// Plan mit endgültigen Seitenzahlen. nA, nL, nT: Seiten von Teil A, Laufzettel und Trennblatt.
function berechnePlan(K, segs, nA, nL, nT) {
  const plan = { formulare: {}, nachweise: {}, foto: null, teile: {}, inhalt: [], attestVorlage: null, attestEinwilligung: null, mandatSeite: null, teilCListe: [], segs: segs };
  const basis = nA + nL;
  const hatC = segs.some((s) => s.teil === "C");
  let letzteB = basis;
  let ersteC = null;
  let letzteC = null;
  segs.forEach((seg) => {
    const von = basis + seg.rel + (seg.teil === "C" ? nT : 0) + 1;
    const bis = von + seg.seiten - 1;
    seg.von = von;
    seg.bis = bis;
    if (seg.teil === "B") letzteB = Math.max(letzteB, bis);
    else {
      if (ersteC === null) ersteC = von;
      letzteC = bis;
    }
    if (seg.art === "vorlage" || seg.art === "eigen") {
      if (seg.schluessel === "attest_vorlage") plan.attestVorlage = { von: von, bis: bis };
      else if (seg.schluessel === "attest_einwilligung") plan.attestEinwilligung = { von: von, bis: bis };
      if (seg.formular && !plan.formulare[seg.formular]) plan.formulare[seg.formular] = { von: von, bis: bis };
    } else if (seg.art === "foto") plan.foto = { von: von, bis: bis };
    else if (seg.art === "nachweis") {
      const alt = plan.nachweise[seg.schluessel];
      plan.nachweise[seg.schluessel] = { von: alt ? alt.von : von, bis: bis, dateien: (alt ? alt.dateien : 0) + 1, nichtLesbar: (alt ? alt.nichtLesbar : 0) + (seg.datei.fehler ? 1 : 0) };
    }
    // Der Laufzettel darf den Aufnahmeantrag um seinen Inhalt ergänzen (Abschnitt 9)
    const zusatz = seg.schluessel === "aufnahmeantrag" && !/Foto/.test(seg.titel) ? " (mit Erlaubnis für Fotos und Lastschrift)" : "";
    plan.inhalt.push({ von: von, bis: bis, titel: (seg.teil === "C" ? "Teil C: " : "") + seg.titel + zusatz });
  });
  plan.teile.A = { von: 1, bis: nA };
  plan.teile.B = { von: nA + 1, bis: letzteB };
  if (hatC) plan.teile.C = { von: ersteC - nT, bis: letzteC };
  // Vorne im Inhaltsverzeichnis: Teil A, Laufzettel; Teil C beginnt mit dem Trennblatt
  plan.inhalt.unshift({ von: nA + 1, bis: nA + nL, titel: "Laufzettel für den Verein" });
  plan.inhalt.unshift({ von: 1, bis: nA, titel: TEIL_ANZEIGE.A + ": Anleitung" });
  if (hatC) plan.inhalt.splice(plan.inhalt.findIndex((z) => z.titel.startsWith("Teil C: ")), 0, { von: ersteC - nT, bis: ersteC - 1, titel: TEIL_ANZEIGE.C + ": Trennblatt" });
  plan.mandatSeite = plan.formulare.aufnahmeantrag ? plan.formulare.aufnahmeantrag.von + 3 : "";
  plan.trennblattAb = hatC ? ersteC - nT : null;
  // Liste für das Trennblatt
  // Die Namen sind dieselben wie in Teil A, im Laufzettel und auf den Seiten selbst (Abschnitt 9)
  if (plan.attestVorlage) plan.teilCListe.push({ titel: ATTEST_VORLAGE_NAME, seite: plan.attestVorlage.von, wer: "Vorlage für die Ärztin oder den Arzt, nur für das Passwesen des Vereins" });
  if (plan.attestEinwilligung) plan.teilCListe.push({ titel: attestEinwilligungName(), seite: plan.attestEinwilligung.von, wer: "nur für das Passwesen des Vereins" });
  const kopie = plan.nachweise.U10;
  if (kopie) plan.teilCListe.push({ titel: kopieTitel(unterlageName(K, "U10")), seite: kopie.von, wer: "nur für das Passwesen des Vereins" });
  const notfall = segs.find((s) => s.schluessel === "notfall");
  if (notfall) plan.teilCListe.push({ titel: eintragName("notfall"), seite: notfall.von, wer: "nur für Trainerinnen, Trainer und Betreuer" });
  plan.stelleSeite = (formular, stelleKey) => {
    const seg = segs.find((s) => s.formular === formular && s.stellen && Object.prototype.hasOwnProperty.call(s.stellen, stelleKey));
    return seg ? seg.von + seg.stellen[stelleKey] : null;
  };
  return plan;
}

function trocken(K, bauen, teil, art, plan) {
  const S = new Schreiber(K, { teil: teil, trocken: true, art: art });
  bauen(K, S, plan);
  return Math.max(1, S.seitenAnzahl);
}

// Fußzeilen: "Seite x von y" auf allen eigenen Seiten, Entwurfsvermerk dort, wo er gilt
function zeichneFusszeilen(K) {
  const gesamt = K.seiten.length;
  K.seiten.forEach((eintrag, i) => {
    const page = eintrag.page;
    const nr = i + 1;
    const t = "Seite " + nr + " von " + gesamt;
    if (eintrag.eigen) {
      const b = mess(K, t, 8);
      zeichneText(K, page, t, A4[0] - RAND - b, FUSS_Y, 8, { farbe: FARBE.tinte3 });
      if (eintrag.entwurf) zeichneText(K, page, ENTWURF_TEXT, RAND, FUSS_Y, 8, { farbe: FARBE.tinte3 });
    } else if (eintrag.nachweisPdf) {
      const abb = eintrag.abb;
      const b = mess(K, t, 7.5);
      zeichneSichtbarKasten(K, page, abb, abb.breite - b - 16, 6, b + 10, 13, 0.88);
      zeichneSichtbar(K, page, abb, t, abb.breite - b - 11, 9.5, 7.5, FARBE.tinte);
    }
  });
}

function setzeMetadaten(K) {
  const doc = K.doc;
  const sb = liste(K.a.sorgeberechtigte);
  const unterzeichner = K.minderjaehrig && sb.length ? [text(objekt(sb[0]).vorname), text(objekt(sb[0]).nachname)].filter(Boolean).join(" ") : K.person.name;
  doc.setTitle("Anmeldung " + vereinKurz(K) + " – " + sicher(K, K.person.name, false));
  doc.setAuthor(sicher(K, unterzeichner || K.person.name, false));
  doc.setSubject("Anmeldung mit Aufnahmeantrag, Antrag auf Spielerlaubnis und Einverständnissen");
  doc.setKeywords([]);
  doc.setCreator("Anmelde-Assistent " + vereinKurz(K));
  doc.setProducer("Anmelde-Assistent " + vereinKurz(K) + " (pdf-lib)");
  doc.setLanguage("de-DE");
  const d = datumObjekt(K.heute);
  doc.setCreationDate(d);
  doc.setModificationDate(d);
  doc.catalog.delete(K.L.PDFName.of("Metadata")); // kein XMP aus den Vorlagen
}

export async function erzeugePdf(opts) {
  const K = baueKontext(opts);
  const L = K.L;
  if (K.a.sprache && K.a.sprache !== "de") K.eText = auswerten(Object.assign({}, K.a, { sprache: "de" }), K.konfig, K.heute);
  K.doc = await L.PDFDocument.create({ updateMetadata: false });
  K.doc.registerFontkit(opts.fontkit);
  K.font = await K.doc.embedFont(opts.schrift, { subset: true });
  K.zeichen = new Set(K.font.getCharacterSet());
  await betteUnterschriften(K);
  await bereiteBilder(K);

  // 1. Seiten nach dem Laufzettel zeichnen (Vordrucke, Einverständnisse, Foto, Nachweise, Teil C)
  const segs = baueSegmente(K);
  for (const seg of segs) await fuehreSegmentAus(K, seg);
  const hatC = segs.some((s) => s.teil === "C");

  // 2. Seitenzahlen von Teil A, Laufzettel und Trennblatt bestimmen (sie hängen voneinander ab)
  let nA = 3;
  let nL = 2;
  let nT = hatC ? 1 : 0;
  let plan;
  for (let i = 0; i < 8; i++) {
    plan = berechnePlan(K, segs, nA, nL, nT);
    const a2 = trocken(K, seiteTeilA, "A", "teil-a", plan);
    const l2 = trocken(K, seiteLaufzettel, "B", "laufzettel", plan);
    const t2 = hatC ? trocken(K, seiteTrennblatt, "C", "trennblatt", plan) : 0;
    if (a2 === nA && l2 === nL && t2 === nT) break;
    nA = a2;
    nL = l2;
    nT = t2;
  }
  plan = berechnePlan(K, segs, nA, nL, nT);

  // 3. Diese Seiten an ihre Stelle einfügen: Teil A und Laufzettel vorn, das Trennblatt vor Teil C
  const SA = new Schreiber(K, { teil: "A", art: "teil-a", titel: "Teil A: Anleitung für Sie", einfuegenAb: 0 });
  seiteTeilA(K, SA, plan);
  const SL = new Schreiber(K, { teil: "B", art: "laufzettel", titel: "Laufzettel für den Verein", einfuegenAb: nA });
  seiteLaufzettel(K, SL, plan);
  if (hatC) {
    const ST = new Schreiber(K, { teil: "C", art: "trennblatt", titel: "Trennblatt Teil C", einfuegenAb: plan.trennblattAb - 1 });
    seiteTrennblatt(K, ST, plan);
  }
  zeichneFusszeilen(K);
  setzeMetadaten(K);

  // 4. Ergebnis
  const teile = [];
  ["A", "B", "C"].forEach((t) => {
    if (plan.teile[t]) teile.push({ teil: t, titel: TEIL_TITEL[t], vonSeite: plan.teile[t].von, bisSeite: plan.teile[t].bis });
  });
  if (K.bericht) fuelleBericht(K, plan, teile);
  const bytes = await K.doc.save({ updateFieldAppearances: false });
  return { bytes: bytes, seiten: K.seiten.length, teile: teile, dateiname: dateiname(K.a) };
}

// Aufbau des PDFs für Tests: Seitenarten, Stellen, Felder, Meldungen
function fuelleBericht(K, plan, teile) {
  const nr = (page) => K.seiten.findIndex((x) => x.page === page) + 1;
  const b = K.bericht;
  b.teile = teile;
  b.seiten = K.seiten.map((x, i) => ({ nr: i + 1, teil: x.teil, art: x.art, schluessel: x.schluessel || null, titel: x.titel || "", eigen: x.eigen, entwurf: !!x.entwurf }));
  b.stellen = K.stellen.map((st) => ({ formular: st.formular, stelleKey: st.stelleKey, wer: st.wer, seite: nr(st.pageRef), art: st.art, bild: st.bild || null, text: st.text || null, zusatz: st.zusatz === true, rueckfall: st.rueckfall === true, y: st.y }));
  b.eingaben = K.eingaben.map((x) => ({ seite: nr(x.pageRef), formular: x.formular || null, name: x.name, leer: x.leer === true, ausnahme: x.ausnahme === true, wert: x.wert === undefined ? null : x.wert }));
  b.texte = K.texte.map((x) => ({ seite: nr(x.pageRef), art: x.art, kennung: x.kennung, text: x.text }));
  b.warnungen = K.warnungen.slice();
  b.felder = K.felder.slice();
  b.flaechen = K.flaechen.map((f) => ({ seite: nr(f.pageRef), art: f.art, x: f.x, y: f.y, b: f.b, h: f.h }));
  b.fehlendeAngaben = K.fehlendeAngaben.slice();
  b.hinweise = K.hinweiseIntern.slice();
  b.namePruefen = K.ersetzt;
  b.plan = { formulare: plan.formulare, nachweise: plan.nachweise, foto: plan.foto, attestVorlage: plan.attestVorlage, attestEinwilligung: plan.attestEinwilligung, teile: plan.teile };
  b.nachweise = K.nachweisDateien.map((d) => ({ id: d.id, nr: d.nr, art: d.art, fehler: d.fehler, seiten: d.seiten }));
}
