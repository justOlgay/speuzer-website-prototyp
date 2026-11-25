import { sauber, dateiteil, zerlegeIso, tageImMonat } from "./anmeldung-hilfen.js";
import { einsichtNamen } from "./anmeldung-trainer-einsicht.js";
import { T } from "./anmeldung-trainer-pdf-texte.js";
import { TrainerPdfFehler, istJpeg, istPng } from "./anmeldung-trainer-pdf-hilfen.js";

export function istIso(iso) {
  const z = zerlegeIso(iso);
  return !!z && z.monat >= 1 && z.monat <= 12 && z.tag >= 1 && z.tag <= tageImMonat(z.jahr, z.monat);
}

export function datumDe(iso) {
  return istIso(iso) ? iso.slice(8, 10) + "." + iso.slice(5, 7) + "." + iso.slice(0, 4) : "";
}

export function plusMonate(iso, n) {
  const z = zerlegeIso(iso);
  if (!z) return "";
  const monate = z.jahr * 12 + (z.monat - 1) + n;
  const jahr = Math.floor(monate / 12);
  const monat = (monate % 12) + 1;
  const tag = Math.min(z.tag, tageImMonat(jahr, monat));
  const zwei = (x) => String(x).padStart(2, "0");
  return jahr + "-" + zwei(monat) + "-" + zwei(tag);
}

const BUCHSTABEN = { ß: "ss", ẞ: "SS", ı: "i", ł: "l", Ł: "L", đ: "d", Đ: "D", ø: "o", Ø: "O", æ: "ae", Æ: "Ae", œ: "oe", Œ: "Oe", þ: "th", Þ: "Th", ð: "d", Ð: "D" };
export function namensTeil(x) {
  return dateiteil(sauber(x).replace(/[ßẞıłŁđĐøØæÆœŒþÞðÐ]/g, (c) => BUCHSTABEN[c]));
}

const text = (x) => sauber(x);
const objekt = (x) => (x && typeof x === "object" && !Array.isArray(x) ? x : {});

export function bereiteVor(eingabe, art) {
  const a = objekt(eingabe.antworten);
  const k = objekt(eingabe.konfig);
  const heute = eingabe.heute;
  const paket = art === "paket";
  const fehlt = [];
  const konfigFehlt = [];

  const pflicht = (wert, name) => {
    const t = text(wert);
    if (!t) fehlt.push(name);
    return t;
  };
  const pflichtDatum = (wert, name) => {
    if (!istIso(wert)) fehlt.push(name);
    return istIso(wert) ? wert : "";
  };

  const anschrift = objekt(a.anschrift);
  const d = {
    vorname: pflicht(a.vorname, "vorname"),
    nachname: pflicht(a.nachname, "nachname"),
    geburtsdatum: pflichtDatum(a.geburtsdatum, "geburtsdatum"),
    strasse: pflicht(anschrift.strasse, "anschrift.strasse"),
    plz: pflicht(anschrift.plz, "anschrift.plz"),
    ort: pflicht(anschrift.ort, "anschrift.ort"),
    handy: text(a.handy),
    email: text(a.email),
    abteilung: text(a.abteilung),
    rolle: text(a.rolle),
  };
  if (!Object.prototype.hasOwnProperty.call(T.abteilungen, d.abteilung)) {
    fehlt.push("abteilung");
    d.abteilung = "";
  }
  if (!Object.prototype.hasOwnProperty.call(T.rollen, d.rolle)) {
    fehlt.push("rolle");
    d.rolle = "";
  }

  if (d.rolle === "torwarttrainer" && d.abteilung === "karneval") fehlt.push("rolle (Torwarttrainer nur bei Fußball)");
  if (!istIso(heute)) fehlt.push("heute");

  const verein = objekt(k.verein);
  const unterzeichner = objekt(verein.unterzeichner);
  d.verein = {
    name: text(verein.name),
    nameRegister: text(verein.name_register) || text(verein.name),
    ort: text(verein.ort),
    mail: text(verein.mail),
    anschrift: objekt(verein.anschrift),
    unterzeichner: { name: text(unterzeichner.name), funktion: text(unterzeichner.funktion) },
  };

  const eV = /\s*e\.\s?V\.?$/i;
  d.verein.ohneEV = d.verein.name.replace(eV, "");
  d.verein.kurzEV = d.verein.ohneEV + " e.V.";
  if (!d.verein.name) konfigFehlt.push("verein.name");
  if (!d.verein.ort) konfigFehlt.push("verein.ort");

  if (paket) {
    d.mannschaft = pflicht(a.mannschaft, "mannschaft");
    d.seit = pflichtDatum(a.seit, "seit");
    d.zeugnis = text(a.zeugnis);
    if (d.zeugnis !== "beantragen" && d.zeugnis !== "vorhanden") fehlt.push("zeugnis");

    if (a.kodexGelesen !== true) fehlt.push("kodexGelesen");
    if (a.selbstauskunft !== true) fehlt.push("selbstauskunft");
    if (a.satzung !== true) fehlt.push("satzung");
    if (!Number.isInteger(k.schnupperMonate) || k.schnupperMonate < 0) konfigFehlt.push("schnupperMonate");

    d.zeugnisJahre = Number.isInteger(k.zeugnisJahre) && k.zeugnisJahre > 0 ? k.zeugnisJahre : 0;

    const notfall = objekt(a.notfall);

    d.notfall = { name: text(notfall.name), beziehung: text(notfall.beziehung), telefon: text(notfall.telefon) };
    d.erfahrung = text(a.erfahrung);
    d.ersteHilfeAm = istIso(a.ersteHilfeAm) ? datumDe(a.ersteHilfeAm) : "";
    const tage = Array.isArray(a.tage) ? a.tage : [];
    d.tage = T.tage.map((x) => x[0]).filter((code) => tage.includes(code));
  }

  if (art === "antrag" || (paket && d.zeugnis === "beantragen")) {
    if (!d.verein.unterzeichner.name) konfigFehlt.push("verein.unterzeichner.name");
    if (!d.verein.unterzeichner.funktion) konfigFehlt.push("verein.unterzeichner.funktion");
  }
  if (konfigFehlt.length) throw new TrainerPdfFehler("konfig", "Konfiguration unvollständig: " + konfigFehlt.join(", "));
  if (fehlt.length) throw new TrainerPdfFehler("angaben", "Angaben fehlen oder sind ungültig: " + fehlt.join(", "));

  d.name = d.vorname + " " + d.nachname;
  d.geburt = datumDe(d.geburtsdatum);
  d.adresse = d.strasse + ", " + d.plz + " " + d.ort;
  d.heute = heute;
  d.heuteDe = datumDe(heute);
  d.abteilungText = T.abteilungen[d.abteilung];
  d.rolleText = T.rollen[d.rolle];
  d.teamLabel = T.teamLabel[d.abteilung];
  if (paket) {
    d.seitDe = datumDe(d.seit);
    d.faelligDe = datumDe(plusMonate(d.seit, k.schnupperMonate));

    d.einsichtLang = einsichtNamen(k, "lang");
    d.einsichtKurz = einsichtNamen(k, "kurz");
  }

  d.dateiteile = { nachname: namensTeil(d.nachname), vorname: namensTeil(d.vorname) };
  return d;
}

export function pruefeMedien(medien) {
  const m = objekt(medien);
  if (!m.unterschrift) throw new TrainerPdfFehler("unterschrift-fehlt", "Die Unterschrift fehlt: Ohne Unterschrift entsteht keine Datei.");
  if (!istPng(m.unterschrift)) throw new TrainerPdfFehler("unterschrift-format", "Die Unterschrift ist kein PNG.");

  if (m.foto && !istJpeg(m.foto)) throw new TrainerPdfFehler("foto-format", "Das Passfoto ist kein JPEG.");
}
