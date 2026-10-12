#!/usr/bin/env node
// Prüft die Texte der Oberfläche auf Einfache Sprache (Arbeitspaket AP-4,
// Akzeptanzkriterium 6): kein Satz mit mehr als 12 Wörtern, keine
// Paragrafenzeichen, keine Abkürzungen wie "z. B.", "ggf.", "bzw.", "inkl.".
// Außerdem: Alle Textschlüssel, die der Quelltext aufruft, gibt es.
//
// Aufruf: node tools/anmeldung-test/sprache-check.mjs
// (Der E2E-Test ruft dieselben Funktionen.) Exit 1 bei Verstößen.

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const JS = path.join(ROOT, "assets", "js", "anmeldung");

export const MAX_WOERTER = 12;

// Abkürzungen, die in Texten für Familien nicht vorkommen sollen.
const VERBOTEN = [
  [/§/, "Paragrafenzeichen"],
  [/\bz\.\s?B\./i, "z. B."],
  [/\bggf\./i, "ggf."],
  [/\bbzw\./i, "bzw."],
  [/\binkl\./i, "inkl."],
  [/\busw\./i, "usw."],
  [/\bu\.\s?a\./i, "u. a."],
  [/\bd\.\s?h\./i, "d. h."],
  [/\bca\./i, "ca."],
  [/\bevtl\./i, "evtl."],
  [/\betc\./i, "etc."],
  [/\bvgl\./i, "vgl."],
  [/\bNr\./, "Nr."],
];

// Alle Textblätter (Strings) eines Wörterbuchs mit ihrem Pfad. Daten, die
// keine Sätze sind (Sprachnamen, Kontaktadressen), fallen weg.
export function alleTexte(wert, pfad = "", aus = []) {
  const ueberspringen = /(^|\.)(sprachen|kontakte)(\.|$)/;
  if (ueberspringen.test(pfad)) return aus;
  if (typeof wert === "string") aus.push({ pfad, text: wert });
  else if (Array.isArray(wert)) wert.forEach((x, i) => alleTexte(x, pfad + "." + i, aus));
  else if (wert && typeof wert === "object") for (const [k, v] of Object.entries(wert)) alleTexte(v, pfad ? pfad + "." + k : k, aus);
  return aus;
}

// Sätze: Trennung an . ! ? : und an Zeilenumbrüchen. Ein Punkt in einer Zahl
// ("3.5") oder einer E-Mail-Adresse trennt nicht (danach folgt kein Leerzeichen).
export function saetze(text) {
  return String(text)
    .split(/\n+/)
    .flatMap((zeile) => zeile.split(/(?<=[.!?:…])\s+/))
    .map((s) => s.trim())
    .filter(Boolean);
}

export function woerter(satz) {
  return satz
    .split(/\s+/)
    .map((w) => w.replace(/^[„“"'»«(]+|[„“"'»«).,;:!?…]+$/g, ""))
    .filter((w) => /[\p{L}\p{N}]/u.test(w));
}

export function pruefeEinfacheSprache(woerterbuch) {
  const verstoesse = [];
  let anzahlSaetze = 0;
  let laengster = { woerter: 0, satz: "", pfad: "" };
  for (const { pfad, text } of alleTexte(woerterbuch)) {
    for (const [muster, name] of VERBOTEN) if (muster.test(text)) verstoesse.push({ pfad, art: "verboten: " + name, text });
    for (const satz of saetze(text)) {
      anzahlSaetze++;
      const n = woerter(satz).length;
      if (n > laengster.woerter) laengster = { woerter: n, satz, pfad };
      if (n > MAX_WOERTER) verstoesse.push({ pfad, art: "Satz mit " + n + " Wörtern", text: satz });
    }
  }
  return { verstoesse, anzahlSaetze, laengster };
}

// ---------- Abgabe der Unterlagen (M11, 12.10.2026) ----------
// Die Familie schickt die ganze Datei per E-Mail an die Geschäftsstelle, auch Teil C; der Verein bewahrt Teil C getrennt auf
// (Entscheidung der 1. Vorsitzenden vom 11.10.2026, O25 und O73). Kein Text für Familien sagt mehr, etwas sei „getrennt abzugeben“,
// gehe „nicht per normaler E-Mail“, sei „im Verein abzugeben oder vorzulegen“ oder „mitzubringen“ – außer an den Ausnahmen unten.
export const ALTE_ABGABE = [
  [/getrennt abgeben|ihn getrennt ab\b|Trennen Sie|abtrennen/, "getrennt abgeben oder abtrennen"],
  [/nicht per normaler|oder normaler E-Mail|normale[rn]? Mail/, "nicht per (normaler) E-Mail"],
  [/im Verein ab\b|im Verein abgeb|im Verein abgegeben|im Verein vorlegen/, "im Verein abgeben oder vorlegen"],
  [/\bBringen Sie\b|\bbringen Sie\b[^.]*\bmit\b|\bmitbringen\b|\bbringen\b[^.]*\bmit\b|\bbringt\b[^.]*\bmit\b/, "mitbringen"],
  // Runde 2 (12.10.2026): Alles kommt per E-Mail. Kein Text verspricht ein „Original“ (außer bei deutschen Ausweisen, siehe unten).
  [/\bOriginal/, "Original (alles kommt per E-Mail)"],
];

// Ausnahmen mit Grund (Pfad im Wörterbuch → Grund). Sie bleiben mit Absicht und stehen im Bericht zu M11. (Runde 2: „Original“ nur noch bei den
// deutschen Ausweisen; „Das Original bleibt im Verein“ bei U07 ist „Die Datei bleibt im Verein.“)
export const ABGABE_AUSNAHMEN_OBERFLAECHE = {
  "fertig.abgebenAusgedruckt": "Papierweg (alles ausgedruckt und mit Stift unterschrieben): Foto oder Scan per E-Mail, oder die Blätter im Verein abgeben (gleichwertig)",
  "hilfe.uebersetzen": "eine Person zum Übersetzen mitbringen, kein Papier",
  "unterschriften.training": "Modus „stift“ (Schalter unterschriftHfv): Der Verein bringt die ausgedruckten Blätter zum ersten Training mit",
};
export const ABGABE_AUSNAHMEN_REGELN = {
  "hinweise.staatsangehoerigkeit_unklar": "deutsche Ausweise darf der Verein nicht weitergeben: Er sieht das Original (PAuswG § 20, PassG § 18)",
  "weiterleitung.staatsangehoerigkeit_unklar": "wie oben: Der Verein schaut in den Pass",
  "hinweise.ausweis_deutsch_original": "wie oben: „Zeigen Sie das Original im Verein.“",
  "unterlagen.U12.wie": "wie oben: „Deutsche Ausweise zeigen Sie im Verein im Original.“",
};

// Findet die alten Sätze zur Abgabe. Rückgabe: { verstoesse: [{ pfad, art, text }], ungenutzt: [Pfade der Ausnahmen, die nichts mehr treffen] }
export function pruefeAbgabeWortlaut(woerterbuch, ausnahmen = {}) {
  const verstoesse = [];
  const genutzt = new Set();
  for (const { pfad, text } of alleTexte(woerterbuch)) {
    const treffer = ALTE_ABGABE.filter(([muster]) => muster.test(text));
    if (!treffer.length) continue;
    if (pfad in ausnahmen) genutzt.add(pfad);
    else for (const [, name] of treffer) verstoesse.push({ pfad, art: "alter Satz zur Abgabe: " + name, text });
  }
  return { verstoesse, ungenutzt: Object.keys(ausnahmen).filter((p) => !genutzt.has(p)) };
}

// Textschlüssel, die im Quelltext als Zeichenkette in t("…"), tl("…"), hatT("…")
// stehen (ohne Verkettung). Verkettete Schlüssel prüft der E2E-Test zur Laufzeit
// (Warnung "Text fehlt").
export function schluesselImQuelltext() {
  const treffer = new Map();
  for (const datei of readdirSync(JS).filter((f) => f.endsWith(".js"))) {
    const quelle = readFileSync(path.join(JS, datei), "utf8");
    // Schlüssel, die auf einen Punkt enden, sind der Anfang eines verketteten
    // Schlüssels ("abschnitte." + id) – die prüft der E2E-Test zur Laufzeit.
    for (const m of quelle.matchAll(/\b(?:t|tl|hatT)\(\s*"([A-Za-z0-9_.]+)"(?!\s*\+)/g)) {
      if (!m[1].endsWith(".") && !treffer.has(m[1])) treffer.set(m[1], datei);
    }
  }
  return treffer;
}

export function fehlendeSchluessel(woerterbuch) {
  const pfade = (wert, pfad = "", aus = new Set()) => {
    aus.add(pfad);
    if (wert && typeof wert === "object") for (const [k, v] of Object.entries(wert)) pfade(v, pfad ? pfad + "." + k : k, aus);
    return aus;
  };
  const vorhanden = pfade(woerterbuch);
  const fehlend = [];
  for (const [schluessel, datei] of schluesselImQuelltext()) if (!vorhanden.has(schluessel)) fehlend.push({ schluessel, datei });
  return fehlend;
}

export async function ladeWoerterbuch() {
  return (await import(pathToFileURL(path.join(JS, "texte", "de-oberflaeche.js")).href)).default;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const w = await ladeWoerterbuch();
  const r = pruefeEinfacheSprache(w);
  const f = fehlendeSchluessel(w);
  const a = pruefeAbgabeWortlaut(w, ABGABE_AUSNAHMEN_OBERFLAECHE);
  console.log("Sätze geprüft: " + r.anzahlSaetze + ", längster Satz: " + r.laengster.woerter + " Wörter (" + r.laengster.pfad + ")");
  for (const v of r.verstoesse) console.log("VERSTOSS " + v.pfad + " – " + v.art + ": " + v.text);
  for (const x of f) console.log("FEHLT " + x.schluessel + " (aufgerufen in " + x.datei + ")");
  for (const v of a.verstoesse) console.log("VERSTOSS " + v.pfad + " – " + v.art + ": " + v.text);
  for (const p of a.ungenutzt) console.log("VERSTOSS " + p + " – Ausnahme zur Abgabe trifft keinen Text mehr (aus ABGABE_AUSNAHMEN_OBERFLAECHE streichen)");
  if (r.verstoesse.length || f.length || a.verstoesse.length || a.ungenutzt.length) process.exit(1);
  console.log("Einfache Sprache: in Ordnung. Textschlüssel: vollständig. Abgabe: kein alter Satz zu „getrennt abgeben“, „nicht per normaler E-Mail“, „im Verein abgeben“ oder „mitbringen“ (" + Object.keys(ABGABE_AUSNAHMEN_OBERFLAECHE).length + " Ausnahmen).");
}
