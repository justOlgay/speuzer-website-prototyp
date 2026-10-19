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

export function kopiere(x) {
  return x === undefined ? undefined : JSON.parse(JSON.stringify(x));
}

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

export function sauber(text) {
  return String(text === null || text === undefined ? "" : text)
    .normalize("NFC")
    .replace(/[   -​  　]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function zweistellig(n) {
  return (n < 10 ? "0" : "") + n;
}

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

export function zweiterElternteilNoetig(a) {
  return !!a && a.sorge === "getrennt_bei_mir" && a.andererElternteilEinverstanden !== true;
}

const SEPA_LAENGEN = {
  AD: 24, AT: 20, BE: 16, BG: 22, CH: 21, CY: 28, CZ: 24, DE: 22, DK: 18, EE: 20, ES: 24, FI: 18, FR: 27, GB: 22, GI: 23,
  GR: 27, HR: 21, HU: 28, IE: 22, IS: 26, IT: 27, LI: 21, LT: 20, LU: 20, LV: 21, MC: 27, MT: 31, NL: 18, NO: 15, PL: 28,
  PT: 25, RO: 24, SE: 24, SI: 19, SK: 24, SM: 27, VA: 22,
};

export function bereinigeIban(text) {
  let s = String(text || "").toUpperCase().replace(/[\s\-.]/g, "");
  if (s.startsWith("IBAN")) s = s.slice(4);
  return s;
}

export function gruppiereIban(iban) {
  return String(iban || "").replace(/(.{4})/g, "$1 ").trim();
}

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

export function ersetzePlatzhalter(text, werte) {
  return String(text).replace(/\{(\w+)\}/g, (treffer, name) => (werte && name in werte && werte[name] !== undefined && werte[name] !== null ? String(werte[name]) : treffer));
}

export function dateiteil(text) {
  return sauber(text).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "") || "x";
}

export function kbText(bytes) {
  return bytes < 1024 * 1024 ? Math.max(1, Math.round(bytes / 1024)) + " KB" : (bytes / (1024 * 1024)).toFixed(1).replace(".", ",") + " MB";
}

export const MAIL_BETREFF = "Anmeldung";
export const MAIL_TEXT = "Guten Tag,\n\nanbei die Anmeldung als PDF.\n\nViele Grüße";

export function mailBetreff(vorname, nachname) {
  return [MAIL_BETREFF, sauber(vorname), sauber(nachname)].filter(Boolean).join(" ");
}

export function mailtoAnVerein(adresse, vorname, nachname) {
  const kodiere = (text) => encodeURIComponent(String(text).replace(/\n/g, "\r\n"));
  return "mailto:" + sauber(adresse) + "?subject=" + kodiere(mailBetreff(vorname, nachname)) + "&body=" + kodiere(MAIL_TEXT);
}

export const MAIL_BETREFF_CODE = "Code für die Anmeldung";

export function mailtoCode(adresse) {
  return "mailto:" + sauber(adresse) + "?subject=" + encodeURIComponent(MAIL_BETREFF_CODE);
}
