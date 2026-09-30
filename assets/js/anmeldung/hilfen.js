/*
  Kleine Hilfsfunktionen des Anmelde-Assistenten: Zugriff auf Antworten über
  Pfade ("zahlung.iban"), Datum, IBAN und Text. Ohne DOM, in Node nutzbar.
*/

// ---------- Pfade ----------
// Antworten liegen in einem verschachtelten Objekt (SCHNITTSTELLEN Abschnitt
// 3). Ein Pfad wie "sorgeberechtigte.0.vorname" nennt ein Feld; fehlende
// Zwischenstufen legt setze() selbst an (Zahl im Pfad = Liste).

export function hole(objekt, pfad) {
  let x = objekt;
  for (const teil of String(pfad).split(".")) {
    if (x === null || x === undefined) return undefined;
    x = x[teil];
  }
  return x;
}

export function setze(objekt, pfad, wert) {
  const teile = String(pfad).split(".");
  let x = objekt;
  for (let i = 0; i < teile.length - 1; i++) {
    const teil = teile[i];
    if (x[teil] === null || x[teil] === undefined || typeof x[teil] !== "object") {
      x[teil] = /^\d+$/.test(teile[i + 1]) ? [] : {};
    }
    x = x[teil];
  }
  x[teile[teile.length - 1]] = wert;
}

// Tiefe Kopie für reine Daten (Objekte, Listen, Zahlen, Text, Wahrheitswerte).
export function kopiere(x) {
  return x === undefined ? undefined : JSON.parse(JSON.stringify(x));
}

// Führt `quelle` in `ziel` ein: Objekte werden Feld für Feld zusammengeführt,
// Listen und einfache Werte ersetzt.
export function mische(ziel, quelle) {
  for (const [k, v] of Object.entries(quelle || {})) {
    if (v && typeof v === "object" && !Array.isArray(v) && ziel[k] && typeof ziel[k] === "object" && !Array.isArray(ziel[k])) {
      mische(ziel[k], v);
    } else {
      ziel[k] = kopiere(v);
    }
  }
  return ziel;
}

// ---------- Text ----------

// Leerzeichen vereinheitlichen (auch geschützte und schmale), Unicode
// normalisieren, Ränder abschneiden.
export function sauber(text) {
  return String(text === null || text === undefined ? "" : text)
    .normalize("NFC")
    .replace(/[   -​  　]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Ob ein Name, Ort oder eine Anschrift in lateinischen Buchstaben steht,
// prüft zeichen.js (pruefeLateinisch).

// ---------- Datum ----------

function zweistellig(n) {
  return (n < 10 ? "0" : "") + n;
}

// Heutiges Datum (Ortszeit des Geräts) als "JJJJ-MM-TT".
export function heuteIso(d) {
  const x = d || new Date();
  return x.getFullYear() + "-" + zweistellig(x.getMonth() + 1) + "-" + zweistellig(x.getDate());
}

export function zerlegeIso(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
  return m ? { jahr: Number(m[1]), monat: Number(m[2]), tag: Number(m[3]) } : null;
}

export function tageImMonat(jahr, monat) {
  return new Date(Date.UTC(jahr, monat, 0)).getUTCDate();
}

// Prüft Tag, Monat und Jahr (Text aus den drei Feldern). Ergebnis:
// { leer: true } | { fehler: "unvollstaendig"|"ungueltig"|"zukunft"|"zu-alt" } |
// { iso: "JJJJ-MM-TT" }.
//   optionen.ohneTag: nur Monat und Jahr (Tag wird 1)
//   optionen.zukunftErlaubt: Datum nach `heute` erlaubt
//   optionen.frueh: frühestes Jahr (Standard 1900)
export function pruefeDatum(t, m, j, heute, optionen) {
  const o = optionen || {};
  const tag = String(t || "").replace(/\D/g, "");
  const monat = String(m || "").replace(/\D/g, "");
  const jahr = String(j || "").replace(/\D/g, "");
  if (!tag && !monat && !jahr) return { leer: true };
  if ((!o.ohneTag && !tag) || !monat || jahr.length !== 4) return { fehler: "unvollstaendig" };
  const J = Number(jahr);
  const M = Number(monat);
  const T = o.ohneTag ? 1 : Number(tag);
  if (M < 1 || M > 12 || T < 1 || T > tageImMonat(J, M)) return { fehler: "ungueltig" };
  if (J < (o.frueh || 1900)) return { fehler: "zu-alt" };
  const iso = J + "-" + zweistellig(M) + "-" + zweistellig(T);
  if (!o.zukunftErlaubt && heute && iso > heute) return { fehler: "zukunft" };
  return { iso };
}

// ---------- Sorgerecht ----------

// Getrennt lebende Eltern, und der andere Elternteil ist nicht einverstanden
// (oder es ist offen): Dann muss er den Aufnahmeantrag mit Stift unterschreiben.
// Das PDF markiert die Stelle "zweiter Elternteil (nötig)".
export function zweiterElternteilNoetig(a) {
  return !!a && a.sorge === "getrennt_bei_mir" && a.andererElternteilEinverstanden !== true;
}

// ---------- Uhrzeit ----------

// Liest eine Uhrzeit wie "21:30", "21.30", "21 Uhr 30", "2130", "930" oder "21"
// und gibt "HH:MM" zurück, sonst null.
export function normalisiereUhrzeit(text) {
  const s = String(text === null || text === undefined ? "" : text)
    .trim()
    .replace(/\s*uhr\s*/gi, ":")
    .replace(/:+$/, "")
    .replace(/\s+/g, "");
  let m = /^(\d{1,2})[:.,h](\d{2})$/i.exec(s);
  if (!m) m = /^(\d{1,2})(\d{2})$/.exec(s); // "2130", "930"
  if (!m) {
    const nurStunde = /^(\d{1,2})$/.exec(s); // nur die Stunde
    if (nurStunde) m = [null, nurStunde[1], "00"];
  }
  if (!m) return null;
  const stunde = Number(m[1]);
  const minute = Number(m[2]);
  if (stunde > 23 || minute > 59) return null;
  return zweistellig(stunde) + ":" + zweistellig(minute);
}

// ---------- IBAN ----------
// SEPA-Länder mit der Länge ihrer IBAN (European Payments Council). Andere
// Länder (zum Beispiel die Türkei) gelten nicht als SEPA-fähig – der
// Assistent bietet dann die Rechnung an.
const SEPA_LAENGEN = {
  AD: 24, AT: 20, BE: 16, BG: 22, CH: 21, CY: 28, CZ: 24, DE: 22, DK: 18, EE: 20, ES: 24, FI: 18, FR: 27, GB: 22, GI: 23,
  GR: 27, HR: 21, HU: 28, IE: 22, IS: 26, IT: 27, LI: 21, LT: 20, LU: 20, LV: 21, MC: 27, MT: 31, NL: 18, NO: 15, PL: 28,
  PT: 25, RO: 24, SE: 24, SI: 19, SK: 24, SM: 27, VA: 22,
};

// Entfernt Leerzeichen, Bindestriche und eine mitkopierte Vorsilbe "IBAN".
export function bereinigeIban(text) {
  let s = String(text || "").toUpperCase().replace(/[\s\-.]/g, "");
  if (s.startsWith("IBAN")) s = s.slice(4);
  return s;
}

export function gruppiereIban(iban) {
  return String(iban || "").replace(/(.{4})/g, "$1 ").trim();
}

// Ergebnis: { ok: true, iban } | { ok: false, grund: "leer"|"format"|"land"|"laenge"|"pruefziffer" }
export function pruefeIban(text) {
  const s = bereinigeIban(text);
  if (!s) return { ok: false, grund: "leer" };
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(s)) return { ok: false, grund: "format" };
  const land = s.slice(0, 2);
  if (!(land in SEPA_LAENGEN)) return { ok: false, grund: "land" };
  if (s.length !== SEPA_LAENGEN[land]) return { ok: false, grund: "laenge" };
  const umgestellt = s.slice(4) + s.slice(0, 4);
  let rest = 0;
  for (const c of umgestellt) {
    const wert = c >= "A" ? String(c.charCodeAt(0) - 55) : c;
    for (const z of wert) rest = (rest * 10 + Number(z)) % 97;
  }
  return rest === 1 ? { ok: true, iban: s } : { ok: false, grund: "pruefziffer" };
}

// ---------- Sonstiges ----------

export function ersetzePlatzhalter(text, werte) {
  return String(text).replace(/\{(\w+)\}/g, (treffer, name) => (werte && name in werte && werte[name] !== undefined && werte[name] !== null ? String(werte[name]) : treffer));
}

// "Anmeldung_<Nachname>_<Vorname>" für Dateinamen: nur Buchstaben und Ziffern.
export function dateiteil(text) {
  return sauber(text).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "") || "x";
}

export function kbText(bytes) {
  return bytes < 1024 * 1024 ? Math.max(1, Math.round(bytes / 1024)) + " KB" : (bytes / (1024 * 1024)).toFixed(1).replace(".", ",") + " MB";
}
