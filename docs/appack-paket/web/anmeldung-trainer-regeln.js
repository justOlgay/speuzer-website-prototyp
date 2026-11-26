import T from "./anmeldung-texte-trainer-de.js";
import { sauber, pruefeDatum, zerlegeIso, tageImMonat, ersetzePlatzhalter } from "./anmeldung-hilfen.js";
import { pruefeLateinisch } from "./anmeldung-zeichen.js";
import { normalisiereCode } from "./anmeldung-zugang.js";

export const MIN_ALTER = 18;
export const MAX_MONATE_VORAUS = 3;
export const ABTEILUNGEN = ["fussball", "karneval"];

export function abteilungenFuer(konfig) {
  const liste = Array.isArray(konfig && konfig.abteilungen) ? konfig.abteilungen.filter((a, i, alle) => ABTEILUNGEN.includes(a) && alle.indexOf(a) === i) : [];
  return liste.length ? liste : [...ABTEILUNGEN];
}

export const ROLLEN = {
  fussball: ["trainer", "co-trainer", "betreuer", "torwarttrainer"],
  karneval: ["trainer", "co-trainer", "betreuer"],
};
export const WOCHENTAGE = ["mo", "di", "mi", "do", "fr", "sa", "so"];

export const AUSSTATTUNG_ARTIKEL = ["shirt", "pullover", "anzug", "regenjacke"];
export const GROESSEN = ["S", "M", "L", "XL", "XXL", "3XL"];

export const PRUEF_SEITEN = ["person", "einsatz", "notfall", "erfahrung", "ausstattung", "foto", "kodex", "selbstauskunft", "zeugnis", "unterschriften"];

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
    erfahrung: "",
    ersteHilfeAm: null,
    ausstattung: { shirt: "", pullover: "", anzug: "", regenjacke: "" },
    foto: false,
    kodexGelesen: false,
    selbstauskunft: false,
    zeugnis: null,
    satzung: false,
  };
}

export function datumText(iso) {
  const z = zerlegeIso(iso);
  return z ? String(z.tag).padStart(2, "0") + "." + String(z.monat).padStart(2, "0") + "." + z.jahr : "";
}

export function plusMonate(iso, n) {
  const z = zerlegeIso(iso);
  if (!z) return "";
  const gesamt = z.jahr * 12 + (z.monat - 1) + n;
  const jahr = Math.floor(gesamt / 12);
  const monat = (gesamt % 12) + 1;
  const tag = Math.min(z.tag, tageImMonat(jahr, monat));
  return jahr + "-" + String(monat).padStart(2, "0") + "-" + String(tag).padStart(2, "0");
}

export function alterInJahren(geburt, stichtag) {
  const g = zerlegeIso(geburt);
  const s = zerlegeIso(stichtag);
  if (!g || !s) return null;
  let alter = s.jahr - g.jahr;
  if (s.monat < g.monat || (s.monat === g.monat && s.tag < g.tag)) alter -= 1;
  return alter;
}

export function schnupperMonate(konfig) {
  const n = Number(konfig && konfig.schnupperMonate);
  return Number.isInteger(n) && n >= 1 && n <= 12 ? n : 1;
}

export function fristVon(seit, konfig) {
  return plusMonate(seit, schnupperMonate(konfig));
}

export function schnupperWoerter(konfig) {
  const n = schnupperMonate(konfig);
  const S = T.schnupper;
  return {
    dauer: n === 1 ? S.dauerEins : ersetzePlatzhalter(S.dauerMehr, { n }),
    zeitraum: n === 1 ? S.zeitraumEins : ersetzePlatzhalter(S.zeitraumMehr, { n }),
  };
}

const M = T.fehler;

function fehler(feld, meldung) {
  return { feld, meldung };
}

export function pruefePlz(text) {
  return /^\d{5}$/.test(sauber(text));
}

export function pruefeEmail(text) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(sauber(text));
}

export function nummerProblem(text) {
  const t = sauber(text);
  if (!t) return "leer";
  if (!/^[0-9+\-\/ ]+$/.test(t)) return "zeichen";
  return t.replace(/\D/g, "").length < 6 ? "kurz" : null;
}

function nummerFehler(text, feld, leerMeldung) {
  const p = nummerProblem(text);
  if (!p) return [];
  return [fehler(feld, { leer: leerMeldung, zeichen: M.nummerZeichen, kurz: M.nummerKurz }[p])];
}

function lateinFehler(text, feld, art) {
  if (!sauber(text) || pruefeLateinisch(text).ok) return [];
  const schluessel = { name: "lateinisch", ort: "lateinischOrt", anschrift: "lateinischAnschrift", text: "lateinischText" }[art || "name"];
  return [fehler(feld, M[schluessel])];
}

function pflichtText(text, feld, leerMeldung, art) {
  return sauber(text) ? lateinFehler(text, feld, art) : [fehler(feld, leerMeldung)];
}

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

export function groesseGueltig(wert) {
  return wert === undefined || wert === null || wert === "" || GROESSEN.includes(wert);
}

export function mannschaftenFuer(konfig, abteilung) {
  const liste = Array.isArray(konfig && konfig.mannschaften) ? konfig.mannschaften : [];
  const namen = [];
  for (const m of liste) {
    const name = sauber(m && m.name);
    if (m && m.abteilung === abteilung && name && !namen.includes(name)) namen.push(name);
  }
  return namen;
}

function geburtsdatumFehler(a, c) {
  const p = datumProblem(c.roh && c.roh.geburtsdatum, a.geburtsdatum, c.heute, { zukunftErlaubt: false });
  if (p) return [fehler("geburtsdatum", M[p])];
  return alterInJahren(a.geburtsdatum, c.heute) < MIN_ALTER ? [fehler("geburtsdatum", M.unter18)] : [];
}

const REGELN = {

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
    if (!sauber(n.name) && !sauber(n.beziehung) && !sauber(n.telefon)) return [];
    return [
      ...pflichtText(n.name, "notfall.name", M.notfallName, "name"),
      ...pflichtText(n.beziehung, "notfall.beziehung", M.notfallBeziehung, "text"),
      ...nummerFehler(n.telefon, "notfall.telefon", M.notfallTelefon),
    ];
  },

  erfahrung(a, c) {
    const f = [...lateinFehler(a.erfahrung, "erfahrung", "text")];
    const p = datumProblem(c.roh && c.roh.ersteHilfeAm, a.ersteHilfeAm, c.heute, { zukunftErlaubt: false });
    if (p && p !== "datumLeer") f.push(fehler("ersteHilfeAm", M[p]));
    return f;
  },

  ausstattung(a) {
    const g = a.ausstattung && typeof a.ausstattung === "object" ? a.ausstattung : {};
    return AUSSTATTUNG_ARTIKEL.filter((artikel) => !groesseGueltig(g[artikel])).map((artikel) => fehler("ausstattung." + artikel, M.ausstattungGroesse));
  },

  foto: () => [],

  kodex(a) {
    return a.kodexGelesen === true ? [] : [fehler("kodexGelesen", M.kodex)];
  },

  selbstauskunft(a) {
    return a.selbstauskunft === true ? [] : [fehler("selbstauskunft", M.selbstauskunft)];
  },

  zeugnis(a) {
    return a.zeugnis === "beantragen" || a.zeugnis === "vorhanden" ? [] : [fehler("zeugnis", M.zeugnis)];
  },

  unterschriften(a, c) {
    const f = [];
    if (!(c.medien && c.medien.unterschrift && c.medien.unterschrift.length)) f.push(fehler("unterschrift", M.unterschrift));
    if (a.satzung !== true) f.push(fehler("satzung", M.satzung));
    return f;
  },

  pruefen: () => [],
  fertig: () => [],
};

export function pruefeSeite(id, a, c) {
  const regel = REGELN[id];
  if (!regel) throw new Error("Trainerseite: keine Regel für die Seite " + id);
  return regel(a, c || {});
}

export function ersteOffeneSeite(a, c) {
  for (const id of PRUEF_SEITEN) {
    const f = pruefeSeite(id, a, c);
    if (f.length) return { seite: id, fehler: f };
  }
  return null;
}
