/*
  Prüfregeln der Seite „Neu im Trainerteam“: reine Funktionen ohne DOM, in Node nutzbar (Test: tools/anmeldung-test/trainer-e2e.mjs
  prüft sie einzeln und im Browser). Auch die leeren Antworten und die Datumshilfen (Alter, Frist der Schnupperphase) liegen hier.

  Aufbau
    pruefeSeite(id, a, c)        Fehler einer Seite: [{ feld, meldung }]; feld ist der Pfad des Feldes (data-feld im Dokument),
                                 meldung der Text aus texte/trainer-de.js (fehler.*)
    ersteOffeneSeite(a, c)       die erste Seite mit Fehlern oder null (Sicherung vor „Dateien erstellen“)
  Kontext c: { heute (ISO), roh (Rohtext der Datumsfelder, siehe bausteine.js › datumFelder), medien ({ foto, unterschrift }),
               konfig, zugang ({ eingabe, geprueft, gueltig }, nur Seite „code“) }

  Regeln (Stand 24.11.2026)
    - Pflicht: Vorname, Nachname, Geburtsdatum, Straße, PLZ, Ort, Handynummer, E-Mail, Abteilung, Mannschaft (bei Karneval:
      Gruppe), Rolle, „Seit wann“, Notfallkontakt (Name, Beziehung, Telefon), Beruf, Erste-Hilfe-Kurs mit Datum, Passfoto,
      Verhaltenskodex und Selbstauskunft angekreuzt, Führungszeugnis gewählt, Unterschrift, Satzung angekreuzt.
      Nicht Pflicht: „Wann kannst du?“, Erfahrung, sonstige Qualifikationen.
    - PLZ: genau fünf Ziffern. E-Mail: wie im Anmelde-Assistenten (ein @, dahinter eine Domain mit Punkt). Handynummer und Telefon des Notfallkontakts:
      nur Ziffern, Leerzeichen und + - /, mindestens 6 Ziffern.
    - Geburtsdatum: gültig, nicht in der Zukunft und zum Stichtag (heute) mindestens 18 Jahre alt.
    - „Seit wann“: gültiges Datum, höchstens drei Monate in der Zukunft (in der Vergangenheit ohne Grenze).
    - Erste Hilfe: bei „ja“ ein Datum, das nicht in der Zukunft liegt; bei „nein“ das geplante Datum, nicht in der Vergangenheit.
    - Alles, was in die Dateien geht, muss in lateinischen Buchstaben stehen (zeichen.js; die PDF-Schrift Liberation Sans kennt
      sonst das Zeichen nicht), wie im Anmelde-Assistenten.
*/

import T from "./texte/trainer-de.js";
import { sauber, pruefeDatum, zerlegeIso, tageImMonat, ersetzePlatzhalter } from "./hilfen.js";
import { pruefeLateinisch } from "./zeichen.js";
import { normalisiereCode } from "./zugang.js";

export const MIN_ALTER = 18;
export const MAX_MONATE_VORAUS = 3;
export const ABTEILUNGEN = ["fussball", "karneval"];

// Die Abteilungen, die die Seite anbietet: konfig.abteilungen (ohne Angabe oder ohne gültigen Wert beide). Gibt es nur eine, steht sie fest und die Seite
// fragt nicht danach (24.11.2026: Der Vorstand lässt den Karneval vorerst weg).
export function abteilungenFuer(konfig) {
  const liste = Array.isArray(konfig && konfig.abteilungen) ? konfig.abteilungen.filter((a, i, alle) => ABTEILUNGEN.includes(a) && alle.indexOf(a) === i) : [];
  return liste.length ? liste : [...ABTEILUNGEN];
}

// Torwarttrainer gibt es nur beim Fußball.
export const ROLLEN = {
  fussball: ["trainer", "co-trainer", "betreuer", "torwarttrainer"],
  karneval: ["trainer", "co-trainer", "betreuer"],
};
export const WOCHENTAGE = ["mo", "di", "mi", "do", "fr", "sa", "so"];
// Seiten mit Eingaben in der Reihenfolge des Ablaufs (für die Sicherung vor dem Erstellen der Dateien)
export const PRUEF_SEITEN = ["person", "einsatz", "notfall", "erfahrung", "foto", "kodex", "selbstauskunft", "zeugnis", "unterschriften"];

// ---------- Leere Antworten ----------

// Alle Felder sind da und leer (Felder wie ap1/daten.mjs › BEISPIEL). foto steht für „es gibt ein Foto“ (das Bild selbst liegt in medien.foto).
export function neueAntworten() {
  return {
    vorname: "",
    nachname: "",
    geburtsdatum: null,
    anschrift: { strasse: "", plz: "", ort: "" },
    handy: "",
    email: "",
    abteilung: null,
    mannschaft: "",
    rolle: null,
    seit: null,
    tage: [],
    notfall: { name: "", beziehung: "", telefon: "" },
    beruf: "",
    erfahrung: "",
    ersteHilfe: null,
    ersteHilfeAm: null,
    ersteHilfeBis: null,
    sonstiges: "",
    foto: false,
    kodexGelesen: false,
    selbstauskunft: false,
    zeugnis: null,
    satzung: false,
  };
}

// ---------- Datum ----------

// "2026-11-23" -> "23.11.2026"
export function datumText(iso) {
  const z = zerlegeIso(iso);
  return z ? String(z.tag).padStart(2, "0") + "." + String(z.monat).padStart(2, "0") + "." + z.jahr : "";
}

// Datum plus n Monate (gleicher Tag; gibt es ihn im Zielmonat nicht, der letzte Tag des Monats). Leer, wenn iso kein Datum ist.
export function plusMonate(iso, n) {
  const z = zerlegeIso(iso);
  if (!z) return "";
  const gesamt = z.jahr * 12 + (z.monat - 1) + n;
  const jahr = Math.floor(gesamt / 12);
  const monat = (gesamt % 12) + 1;
  const tag = Math.min(z.tag, tageImMonat(jahr, monat));
  return jahr + "-" + String(monat).padStart(2, "0") + "-" + String(tag).padStart(2, "0");
}

// Alter in vollen Jahren am Stichtag; null, wenn eines der Daten fehlt.
export function alterInJahren(geburt, stichtag) {
  const g = zerlegeIso(geburt);
  const s = zerlegeIso(stichtag);
  if (!g || !s) return null;
  let alter = s.jahr - g.jahr;
  if (s.monat < g.monat || (s.monat === g.monat && s.tag < g.tag)) alter -= 1;
  return alter;
}

// Dauer der Schnupperphase in Monaten (konfig.schnupperMonate; ohne gültigen Wert ein Monat).
export function schnupperMonate(konfig) {
  const n = Number(konfig && konfig.schnupperMonate);
  return Number.isInteger(n) && n >= 1 && n <= 12 ? n : 1;
}

// „Unterlagen fällig am“: Beginn plus Schnupperphase (ISO), leer ohne gültiges Datum.
export function fristVon(seit, konfig) {
  return plusMonate(seit, schnupperMonate(konfig));
}

// Wörter der Schnupperphase für die Texte: { dauer: "einen Monat", zeitraum: "Im ersten Monat" }
export function schnupperWoerter(konfig) {
  const n = schnupperMonate(konfig);
  const S = T.schnupper;
  return {
    dauer: n === 1 ? S.dauerEins : ersetzePlatzhalter(S.dauerMehr, { n }),
    zeitraum: n === 1 ? S.zeitraumEins : ersetzePlatzhalter(S.zeitraumMehr, { n }),
  };
}

// ---------- Einzelne Prüfungen ----------

const M = T.fehler;

function fehler(feld, meldung) {
  return { feld, meldung };
}

export function pruefePlz(text) {
  return /^\d{5}$/.test(sauber(text));
}

// Wie im Anmelde-Assistenten (seiten-verein.js, Seite „kontakt“)
export function pruefeEmail(text) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(sauber(text));
}

// Ergebnis: null (in Ordnung) | "leer" | "zeichen" (andere Zeichen als Ziffern, Leerzeichen, + - /) | "kurz" (weniger als 6 Ziffern)
export function nummerProblem(text) {
  const t = sauber(text);
  if (!t) return "leer";
  if (!/^[0-9+\-\/ ]+$/.test(t)) return "zeichen";
  return t.replace(/\D/g, "").length < 6 ? "kurz" : null;
}

// Meldung zu einer Telefonnummer; leerMeldung gilt für ein leeres Feld.
function nummerFehler(text, feld, leerMeldung) {
  const p = nummerProblem(text);
  if (!p) return [];
  return [fehler(feld, { leer: leerMeldung, zeichen: M.nummerZeichen, kurz: M.nummerKurz }[p])];
}

// Text, der in die Dateien geht: lateinische Buchstaben. art: "name" | "ort" | "anschrift" | "text". Ein leeres Feld meldet hier nichts.
function lateinFehler(text, feld, art) {
  if (!sauber(text) || pruefeLateinisch(text).ok) return [];
  const schluessel = { name: "lateinisch", ort: "lateinischOrt", anschrift: "lateinischAnschrift", text: "lateinischText" }[art || "name"];
  return [fehler(feld, M[schluessel])];
}

// Pflichttext: leer meldet leerMeldung, sonst prüft die Schrift.
function pflichtText(text, feld, leerMeldung, art) {
  return sauber(text) ? lateinFehler(text, feld, art) : [fehler(feld, leerMeldung)];
}

// Prüft ein Datumsfeld anhand des Rohtextes (roh = { t, m, j } oder nichts) und des gespeicherten Wertes. Ergebnis: null | Schlüssel in fehler.*.
// Gleiche Logik wie bausteine.js › pruefeDatumsfeld, aber ohne den Kontext der Oberfläche.
export function datumProblem(roh, iso, heute, optionen) {
  const o = optionen || {};
  if (!roh && iso) return null;
  const r = roh ? pruefeDatum(roh.t, roh.m, roh.j, heute, { zukunftErlaubt: !!o.zukunftErlaubt, frueh: o.frueh }) : { leer: true };
  if (r.leer) return "datumLeer";
  if (r.fehler === "unvollstaendig") return "datumUnvollstaendig";
  if (r.fehler === "ungueltig") return "datumUngueltig";
  if (r.fehler === "zukunft") return "datumZukunft";
  if (r.fehler === "zu-alt") return "datumZuAlt";
  return null;
}

// Die Namen der Mannschaften (Abteilung Fußball) oder Gruppen (Karneval) aus konfig.mannschaften, in der Reihenfolge der Konfiguration.
export function mannschaftenFuer(konfig, abteilung) {
  const liste = Array.isArray(konfig && konfig.mannschaften) ? konfig.mannschaften : [];
  const namen = [];
  for (const m of liste) {
    const name = sauber(m && m.name);
    if (m && m.abteilung === abteilung && name && !namen.includes(name)) namen.push(name);
  }
  return namen;
}

// ---------- Regeln je Seite ----------

function geburtsdatumFehler(a, c) {
  const p = datumProblem(c.roh && c.roh.geburtsdatum, a.geburtsdatum, c.heute, { zukunftErlaubt: false });
  if (p) return [fehler("geburtsdatum", M[p])];
  return alterInJahren(a.geburtsdatum, c.heute) < MIN_ALTER ? [fehler("geburtsdatum", M.unter18)] : [];
}

const REGELN = {
  // Der Code gilt nur, wenn er für genau diesen Text als gültig geprüft ist (die Prüfung rechnet die Seite vorher, asynchron).
  code(a, c) {
    const z = c.zugang || {};
    const norm = normalisiereCode(z.eingabe);
    if (!norm) return [fehler("code", T.code.fehlerLeer)];
    return z.gueltig && z.geprueft === norm ? [] : [fehler("code", T.code.fehlerFalsch)];
  },

  start: () => [],

  person(a, c) {
    const an = a.anschrift || {};
    const f = [
      ...pflichtText(a.vorname, "vorname", M.vorname, "name"),
      ...pflichtText(a.nachname, "nachname", M.nachname, "name"),
      ...geburtsdatumFehler(a, c),
      ...pflichtText(an.strasse, "anschrift.strasse", M.strasse, "anschrift"),
    ];
    if (!pruefePlz(an.plz)) f.push(fehler("anschrift.plz", M.plz));
    f.push(...pflichtText(an.ort, "anschrift.ort", M.ort, "anschrift"));
    f.push(...nummerFehler(a.handy, "handy", M.handy));
    if (!pruefeEmail(a.email)) f.push(fehler("email", M.email));
    else f.push(...lateinFehler(a.email, "email", "text"));
    return f;
  },

  einsatz(a, c) {
    const f = [];
    if (!abteilungenFuer(c.konfig).includes(a.abteilung)) f.push(fehler("abteilung", M.abteilung));
    else {
      // Mannschaft (Karneval: Gruppe) und Rolle gibt es erst mit der Abteilung. Ohne Namen in der Konfiguration ist die Mannschaft ein freier Text.
      const liste = mannschaftenFuer(c.konfig, a.abteilung);
      const meldung = a.abteilung === "karneval" ? M.gruppe : M.mannschaft;
      if (liste.length ? !liste.includes(a.mannschaft) : !sauber(a.mannschaft)) f.push(fehler("mannschaft", meldung));
      else if (!liste.length) f.push(...lateinFehler(a.mannschaft, "mannschaft", "text"));
      if (!ROLLEN[a.abteilung].includes(a.rolle)) f.push(fehler("rolle", M.rolle));
    }
    const p = datumProblem(c.roh && c.roh.seit, a.seit, c.heute, { zukunftErlaubt: true });
    if (p) f.push(fehler("seit", M[p]));
    else if (a.seit > plusMonate(c.heute, MAX_MONATE_VORAUS)) f.push(fehler("seit", M.seitZuSpaet));
    return f;
  },

  notfall(a) {
    const n = a.notfall || {};
    return [
      ...pflichtText(n.name, "notfall.name", M.notfallName, "name"),
      ...pflichtText(n.beziehung, "notfall.beziehung", M.notfallBeziehung, "text"),
      ...nummerFehler(n.telefon, "notfall.telefon", M.notfallTelefon),
    ];
  },

  erfahrung(a, c) {
    const f = [...pflichtText(a.beruf, "beruf", M.beruf, "text"), ...lateinFehler(a.erfahrung, "erfahrung", "text")];
    if (a.ersteHilfe !== "ja" && a.ersteHilfe !== "nein") f.push(fehler("ersteHilfe", M.ersteHilfe));
    else if (a.ersteHilfe === "ja") {
      const p = datumProblem(c.roh && c.roh.ersteHilfeAm, a.ersteHilfeAm, c.heute, { zukunftErlaubt: false });
      if (p) f.push(fehler("ersteHilfeAm", M[p]));
    } else {
      const p = datumProblem(c.roh && c.roh.ersteHilfeBis, a.ersteHilfeBis, c.heute, { zukunftErlaubt: true });
      if (p) f.push(fehler("ersteHilfeBis", M[p]));
      else if (a.ersteHilfeBis < c.heute) f.push(fehler("ersteHilfeBis", M.datumVergangenheit));
    }
    f.push(...lateinFehler(a.sonstiges, "sonstiges", "text"));
    return f;
  },

  foto(a, c) {
    return c.medien && c.medien.foto && c.medien.foto.length ? [] : [fehler("foto", M.foto)];
  },

  kodex(a) {
    return a.kodexGelesen === true ? [] : [fehler("kodexGelesen", M.kodex)];
  },

  selbstauskunft(a) {
    return a.selbstauskunft === true ? [] : [fehler("selbstauskunft", M.selbstauskunft)];
  },

  zeugnis(a) {
    return a.zeugnis === "beantragen" || a.zeugnis === "vorhanden" ? [] : [fehler("zeugnis", M.zeugnis)];
  },

  // Reihenfolge wie im Dokument: erst das Unterschriftsfeld, dann die Satzung
  unterschriften(a, c) {
    const f = [];
    if (!(c.medien && c.medien.unterschrift && c.medien.unterschrift.length)) f.push(fehler("unterschrift", M.unterschrift));
    if (a.satzung !== true) f.push(fehler("satzung", M.satzung));
    return f;
  },

  pruefen: () => [],
  fertig: () => [],
};

// Fehler einer Seite ([{ feld, meldung }], leer = in Ordnung). Eine unbekannte Seite ist ein Fehler im Programm.
export function pruefeSeite(id, a, c) {
  const regel = REGELN[id];
  if (!regel) throw new Error("Trainerseite: keine Regel für die Seite " + id);
  return regel(a, c || {});
}

// Die erste Seite (in der Reihenfolge des Ablaufs) mit Fehlern: { seite, fehler } oder null.
export function ersteOffeneSeite(a, c) {
  for (const id of PRUEF_SEITEN) {
    const f = pruefeSeite(id, a, c);
    if (f.length) return { seite: id, fehler: f };
  }
  return null;
}
