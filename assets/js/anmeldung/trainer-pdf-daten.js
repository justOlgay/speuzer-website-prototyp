/*
  Prüft die Eingaben der PDF-Erzeugung (antworten, medien, konfig, heute) und leitet daraus die Angaben ab, die die Blätter
  brauchen (trainer-pdf.js). Fehlt etwas Wesentliches, bricht die Erzeugung mit einem TrainerPdfFehler und einer klaren Meldung ab:
  Ein Rechtsdokument wird nie mit stillen Lücken oder unbestätigten Erklärungen gebaut.

  Fehlerarten (TrainerPdfFehler.art):
    angaben        Angaben der Person fehlen oder sind ungültig (Detail: die Namen der Felder; auch eine Größe der Trainerausstattung, die keine
                   Größe der Liste ist: „ausstattung.shirt“ …; leer ist erlaubt)
    konfig         Konfiguration unvollständig (Detail: die Namen der Felder)
    unterschrift-fehlt, unterschrift-format   medien.unterschrift fehlt oder ist kein PNG
    foto-format                               medien.foto ist da, aber kein JPEG (das Foto ist freiwillig: ohne Foto entsteht die Datei ohne Fotoseite)
  Die Einsichtnehmenden prüft dieses Modul nicht: Eine leere Liste ergibt „dem Vorstand“ (trainer-einsicht.js).
*/

import { sauber, dateiteil, zerlegeIso, tageImMonat } from "./hilfen.js";
import { einsichtNamen } from "./trainer-einsicht.js";
import { T } from "./trainer-pdf-texte.js";
import { TrainerPdfFehler, istJpeg, istPng } from "./trainer-pdf-hilfen.js";

export function istIso(iso) {
  const z = zerlegeIso(iso);
  return !!z && z.monat >= 1 && z.monat <= 12 && z.tag >= 1 && z.tag <= tageImMonat(z.jahr, z.monat);
}

// "2026-11-23" → "23.11.2026"; ungültig → ""
export function datumDe(iso) {
  return istIso(iso) ? iso.slice(8, 10) + "." + iso.slice(5, 7) + "." + iso.slice(0, 4) : "";
}

// Datum plus n Monate: gleicher Tag im Zielmonat, gibt es ihn nicht, der letzte Tag des Monats
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

// dateiteil streicht Buchstaben ohne Zerlegung (ß, ı, ł, ø …) ersatzlos („Weiß“ würde „Wei“); sie werden vorher umgeschrieben
// (Tabelle wie pdf.js › UMLAUT, ohne die Umlaute: ä, ö, ü behandelt dateiteil wie im Assistenten)
const BUCHSTABEN = { ß: "ss", ẞ: "SS", ı: "i", ł: "l", Ł: "L", đ: "d", Đ: "D", ø: "o", Ø: "O", æ: "ae", Æ: "Ae", œ: "oe", Œ: "Oe", þ: "th", Þ: "Th", ð: "d", Ð: "D" };
export function namensTeil(x) {
  return dateiteil(sauber(x).replace(/[ßẞıłŁđĐøØæÆœŒþÞðÐ]/g, (c) => BUCHSTABEN[c]));
}

const text = (x) => sauber(x);
const objekt = (x) => (x && typeof x === "object" && !Array.isArray(x) ? x : {});

// art: "paket" (Trainerunterlagen) oder "antrag" (nur der Antrag auf Gebührenbefreiung, auch die Vorschau)
// Ergebnis: die Angaben für die Blätter; wirft TrainerPdfFehler bei fehlenden oder ungültigen Eingaben.
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
  // „Torwarttrainer“ gibt es nur bei Fußball (GEMEINSAM.md 4.1)
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
  // Kurzname mit „e.V.“ für „An den Vorstand des …“ (kein Beugen des langen Registernamens) und ohne „e.V.“ für den Fußblock des Briefs
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
    // Erklärungen werden nur in die Datei geschrieben, wenn die Person sie bestätigt hat
    if (a.kodexGelesen !== true) fehlt.push("kodexGelesen");
    if (a.selbstauskunft !== true) fehlt.push("selbstauskunft");
    if (a.satzung !== true) fehlt.push("satzung");
    if (!Number.isInteger(k.schnupperMonate) || k.schnupperMonate < 0) konfigFehlt.push("schnupperMonate");
    // Der Antrag (nur bei „beantragen“) trägt Name und Funktion des Unterzeichners im Fußblock
    d.zeugnisJahre = Number.isInteger(k.zeugnisJahre) && k.zeugnisJahre > 0 ? k.zeugnisJahre : 0;

    const notfall = objekt(a.notfall);
    // Notfallkontakt, Erfahrung und Erste-Hilfe-Kurs sind freiwillig: Fehlt etwas, bleibt das Feld im Blatt leer.
    d.notfall = { name: text(notfall.name), beziehung: text(notfall.beziehung), telefon: text(notfall.telefon) };
    d.erfahrung = text(a.erfahrung);
    d.ersteHilfeAm = istIso(a.ersteHilfeAm) ? datumDe(a.ersteHilfeAm) : "";
    // Größen für die Trainerausstattung (freiwillig, seit 26.11.2026): nur die angegebenen kommen in die Liste (Artikel in der Reihenfolge der Seite).
    // Jede Größe ist leer oder genau eine aus T.ausstattung.groessen; alles andere ist ein veränderter Wert und bricht die Erzeugung ab: Es steht
    // nie etwas anderes als eine Größe der Liste in der Datei.
    const ausstattung = objekt(a.ausstattung);
    d.ausstattung = [];
    for (const [schluessel, artikel] of T.ausstattung.artikel) {
      const wert = ausstattung[schluessel];
      if (wert === undefined || wert === null || wert === "") continue;
      if (typeof wert === "string" && T.ausstattung.groessen.includes(wert)) d.ausstattung.push({ artikel, groesse: wert });
      else fehlt.push("ausstattung." + schluessel);
    }
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
    // Namensteil der Einsichtnehmenden: nur aus trainer-einsicht.js (Quelle konfig.einsicht)
    d.einsichtLang = einsichtNamen(k, "lang");
    d.einsichtKurz = einsichtNamen(k, "kurz");
  }
  // Teile der Dateinamen: dateiteil aus hilfen.js, wie der Assistent (Umlaute und Akzente fallen weg)
  d.dateiteile = { nachname: namensTeil(d.nachname), vorname: namensTeil(d.vorname) };
  return d;
}

// Prüft die Bilder, die die Dateien brauchen (nur für das Paket). Wirft TrainerPdfFehler.
export function pruefeMedien(medien) {
  const m = objekt(medien);
  if (!m.unterschrift) throw new TrainerPdfFehler("unterschrift-fehlt", "Die Unterschrift fehlt: Ohne Unterschrift entsteht keine Datei.");
  if (!istPng(m.unterschrift)) throw new TrainerPdfFehler("unterschrift-format", "Die Unterschrift ist kein PNG.");
  // Das Passfoto ist freiwillig (25.11.2026): Ohne Foto entsteht die Datei ohne die Seite „Passfoto“. Ist eines da, muss es ein JPEG sein.
  if (m.foto && !istJpeg(m.foto)) throw new TrainerPdfFehler("foto-format", "Das Passfoto ist kein JPEG.");
}
