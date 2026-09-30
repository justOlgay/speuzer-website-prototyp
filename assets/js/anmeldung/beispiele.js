/*
  Beispiel-Profile für die Vorführung des Anmelde-Assistenten (29.09.2026).

  Jedes Profil ist eine Funktion, die die Antworten `a` (SCHNITTSTELLEN
  Abschnitt 3) für einen Beispielfall liefert. Alle Angaben sind erfunden
  (Mustermann, Musterhausen, Beispiel-Adressen). Geburtsdaten und Fristen
  hängen vom heutigen Datum ab: Der Jahrgang richtet sich nach dem Spieljahr
  (es beginnt am 1. Juli), damit die Altersklasse stimmt – F-Jugend 2026/27
  sind die Jahrgänge 2018 und 2019, D-Jugend 2014 und 2015.

  Das Modul braucht keinen Browser: src/begleit/anmeldung.mjs liest beim Bauen
  die Titel für die Knöpfe. Kontaktdaten sind ganze Zeichenketten, die nur aus
  reservierten Bereichen stammen: Handynummern 0176 04069000 bis 0176 04069099
  (Bundesnetzagentur, Nummern für Medien, Mitteilung 148/2021), E-Mail-Adressen
  bei example.org. Die IBAN wird aus der Beispiel-Kontonummer der Bundesbank
  berechnet (Prüfziffern). npm run pii prüft den Quelltext wie jeden anderen.
*/

// ---------- Hilfen ----------

function zweistellig(n) {
  return (n < 10 ? "0" : "") + n;
}

// "JJJJ-MM-TT" für ein Datum in UTC (kein Zeitzonenfehler bei Tagesrechnung).
function iso(d) {
  return d.getUTCFullYear() + "-" + zweistellig(d.getUTCMonth() + 1) + "-" + zweistellig(d.getUTCDate());
}

function teile(heute) {
  const [j, m, t] = heute.split("-").map(Number);
  return { jahr: j, monat: m, tag: t };
}

// Anfang des laufenden Spieljahres: ab 1. Juli gilt das neue Jahr.
export function spieljahrStart(heute) {
  const { jahr, monat } = teile(heute);
  return monat >= 7 ? jahr : jahr - 1;
}

function tageVor(heute, tage) {
  const { jahr, monat, tag } = teile(heute);
  const d = new Date(Date.UTC(jahr, monat - 1, tag));
  d.setUTCDate(d.getUTCDate() - tage);
  return iso(d);
}

// Geburtsdatum einer Person, die heute `jahre` Jahre alt ist und vor zwei
// Monaten Geburtstag hatte (so bleibt das Alter auch bei kleinen
// Abweichungen des Stichtags gleich).
function geburtsdatumFuerAlter(heute, jahre) {
  const d = teile(tageVor(heute, 60));
  const tag = d.monat === 2 && d.tag === 29 ? 28 : d.tag;
  return d.jahr - jahre + "-" + zweistellig(d.monat) + "-" + zweistellig(tag);
}

// Geburtsdatum im Jahrgang `jahrgang`.
function imJahrgang(jahrgang, monat, tag) {
  return jahrgang + "-" + zweistellig(monat) + "-" + zweistellig(tag);
}

// IBAN mit Prüfziffern nach ISO 13616 (Rest 98 minus Rest von Ziffernfolge mod 97).
function iban(land, bban) {
  const umgestellt = bban + land.split("").map((c) => c.charCodeAt(0) - 55).join("") + "00";
  let rest = 0;
  for (const z of umgestellt) rest = (rest * 10 + Number(z)) % 97;
  return land + zweistellig(98 - rest) + bban;
}

// Bankleitzahl und Konto aus dem Beispiel der Bundesbank-Dokumentation.
const BEISPIEL_KONTO = "370400440532013000";

const ANSCHRIFT = { strasse: "Musterweg 12", plz: "60326", ort: "Frankfurt am Main" };

// Grundgerüst für Familien mit zwei Sorgeberechtigten.
function eltern() {
  return [
    { rolle: "mutter", vorname: "Lena", nachname: "Mustermann", telefon: "0176 04069042", email: "lena.mustermann@example.org" },
    { rolle: "vater", vorname: "Jonas", nachname: "Mustermann", telefon: "", email: "" },
  ];
}

// ---------- Profile ----------

export const BEISPIELE = [
  {
    id: "kind-neu",
    titel: "Kind neu (F-Jugend)",
    beschreibung: "Ein deutsches Kind, acht Jahre alt, war noch nie in einem Fußballverein.",
    antworten(heute) {
      const s = spieljahrStart(heute);
      return {
        wer: "kind",
        vorname: "Mila",
        nachname: "Mustermann",
        geburtsdatum: imJahrgang(s - 8, 5, 14),
        geburtsort: "Frankfurt am Main",
        geburtsland: "DE",
        geschlecht: "w",
        abteilung: "fussball",
        spielen: true,
        spielerpass: "nein",
        deutsch: "ja",
        staaten: ["DE"],
        auslandGewohnt: "nein",
        sorge: "beide",
        sorgeberechtigte: eltern(),
        anschrift: { ...ANSCHRIFT },
        email: "lena.mustermann@example.org",
        mobil: "0176 04069042",
        telefon: "",
        beitrag: { gruppe: null, familie: [], senator: false, doppel: false },
        leistungen: "nein",
        zahlung: {
          art: "sepa", kontoinhaber: "sorgeberechtigt", iban: iban("DE", BEISPIEL_KONTO), bic: "", bank: "",
          kiVorname: "", kiNachname: "", kiAnschriftGleich: true,
        },
        einwilligungen: { fotos: "ja", medien: ["intern", "web"], hfvName: true, hfvFoto: true, fahrten: true, messenger: true },
        notfall: { name: "Erika Beispiel", telefon: "0176 04069087", beziehung: "Oma" },
        gesundheitsbogen: false,
        spielerfoto: { weg: "verein" },
        unterschriftWeg: "bildschirm",
        hfvUnterschrift: "training",
      };
    },
  },
  {
    id: "wechsel-hessen",
    titel: "Wechsel in Hessen (D-Jugend)",
    beschreibung: "Ein Kind wechselt von einem anderen Verein in Hessen. Es ist noch nicht abgemeldet.",
    antworten(heute) {
      const s = spieljahrStart(heute);
      const letztes = tageVor(heute, 21);
      return {
        wer: "kind",
        vorname: "Noah",
        nachname: "Mustermann",
        geburtsdatum: imJahrgang(s - 11, 8, 3),
        geburtsort: "Offenbach am Main",
        geburtsland: "DE",
        geschlecht: "m",
        abteilung: "fussball",
        spielen: true,
        spielerpass: "ja",
        alterVerein: {
          region: "hessen", name: "SG Musterhausen", ort: "Musterhausen", land: "DE", verband: "",
          mitgliedschaft: "kuendigen", empfaenger: "Vorstand der SG Musterhausen", strasse: "Vereinsweg 3", plzOrt: "63450 Musterhausen",
        },
        abmeldung: { status: "noch_nicht", datum: null, weg: "vollmacht" },
        letztesSpiel: letztes,
        letztesPflichtspiel: letztes,
        sperre: "nein",
        freigabe: "weiss_nicht",
        wechselLetzte6Monate: "nein",
        deutsch: "ja",
        staaten: ["DE"],
        auslandGewohnt: "nein",
        sorge: "getrennt_bei_mir",
        andererElternteilEinverstanden: true,
        sorgeberechtigte: [
          { rolle: "vater", vorname: "Jonas", nachname: "Mustermann", telefon: "0176 04069063", email: "jonas.mustermann@example.org" },
        ],
        anschrift: { ...ANSCHRIFT },
        email: "jonas.mustermann@example.org",
        mobil: "0176 04069063",
        telefon: "",
        beitrag: { gruppe: null, familie: [], senator: false, doppel: false },
        leistungen: "nein",
        zahlung: { art: "rechnung", kontoinhaber: null, iban: "", bic: "", bank: "", kiVorname: "", kiNachname: "", kiAnschriftGleich: true },
        einwilligungen: { fotos: "nein", medien: [], hfvName: false, hfvFoto: false, fahrten: true, messenger: false },
        notfall: { name: "Sabine Beispiel", telefon: "0176 04069099", beziehung: "Tante" },
        gesundheitsbogen: false,
        spielerfoto: { weg: "verein" },
        unterschriftWeg: "bildschirm",
        hfvUnterschrift: "training",
      };
    },
  },
  {
    id: "ausland-kind",
    titel: "Kind ohne deutschen Pass (12 Jahre)",
    beschreibung: "Ein Kind aus dem Ausland ist zwölf Jahre alt und war noch nie in einem Verein.",
    antworten(heute) {
      return {
        wer: "kind",
        vorname: "Yusuf",
        nachname: "Mustermann",
        geburtsdatum: geburtsdatumFuerAlter(heute, 12),
        geburtsort: "Musterstadt",
        geburtsland: "TR",
        geschlecht: "m",
        abteilung: "fussball",
        spielen: true,
        spielerpass: "nein",
        deutsch: "nein",
        staaten: ["TR"],
        auslandGewohnt: "ja",
        auslandLand: "TR",
        auslandStadt: "Musterstadt",
        wohnen: "gemeinsam",
        wohnenSeit: tageVor(heute, 800).slice(0, 8) + "01",
        sorge: "beide",
        sorgeberechtigte: [
          { rolle: "mutter", vorname: "Aylin", nachname: "Mustermann", telefon: "0176 04069021", email: "aylin.mustermann@example.org" },
          { rolle: "vater", vorname: "Emre", nachname: "Mustermann", telefon: "", email: "" },
        ],
        anschrift: { ...ANSCHRIFT },
        email: "aylin.mustermann@example.org",
        mobil: "0176 04069021",
        telefon: "",
        beitrag: { gruppe: null, familie: [], senator: false, doppel: false },
        leistungen: "ja",
        zahlung: {
          art: "sepa", kontoinhaber: "sorgeberechtigt", iban: iban("DE", BEISPIEL_KONTO), bic: "", bank: "",
          kiVorname: "", kiNachname: "", kiAnschriftGleich: true,
        },
        einwilligungen: { fotos: "ja", medien: ["intern"], hfvName: false, hfvFoto: true, fahrten: true, messenger: true },
        notfall: { name: "Elif Beispiel", telefon: "0176 04069033", beziehung: "Tante" },
        gesundheitsbogen: false,
        spielerfoto: { weg: "verein" },
        unterschriftWeg: "bildschirm",
        hfvUnterschrift: "training",
      };
    },
  },
  {
    id: "karneval-kind",
    titel: "Karneval-Kind (Abendauftritte)",
    beschreibung: "Ein Mädchen möchte in der Karnevalabteilung tanzen, auch abends bei Auftritten.",
    antworten(heute, konfig) {
      const s = spieljahrStart(heute);
      const gruppen = (konfig && konfig.karnevalGruppen) || [];
      return {
        wer: "kind",
        vorname: "Sophie",
        nachname: "Mustermann",
        geburtsdatum: imJahrgang(s - 10, 3, 22),
        geburtsort: "Frankfurt am Main",
        geburtsland: "DE",
        geschlecht: "w",
        abteilung: "karneval",
        deutsch: "ja",
        staaten: ["DE"],
        sorge: "beide",
        sorgeberechtigte: eltern(),
        karneval: {
          gruppe: (gruppen.find((g) => g.name === "Freaky Fruities") || gruppen[0] || { name: "weiss_nicht" }).name,
          tanztWoanders: "nein",
          turnier: "ja",
          abendOhneEltern: "ja",
          // Freiwillige Angaben zu den Abendauftritten (nur bei "ja" oben).
          abholung: "Lena Mustermann",
          alleinNachHause: "ja",
          alleinAb: "21:30",
        },
        anschrift: { ...ANSCHRIFT },
        email: "lena.mustermann@example.org",
        mobil: "0176 04069042",
        telefon: "",
        beitrag: { gruppe: null, familie: [], senator: false, doppel: false },
        leistungen: "ja",
        zahlung: {
          art: "sepa", kontoinhaber: "sorgeberechtigt", iban: iban("DE", BEISPIEL_KONTO), bic: "", bank: "",
          kiVorname: "", kiNachname: "", kiAnschriftGleich: true,
        },
        einwilligungen: { fotos: "ja", medien: ["intern", "web", "presse"], fahrten: true, messenger: true },
        notfall: { name: "Erika Beispiel", telefon: "0176 04069087", beziehung: "Oma" },
        gesundheitsbogen: false,
        unterschriftWeg: "bildschirm",
        hfvUnterschrift: "training",
      };
    },
  },
  {
    id: "herren-wechsel",
    titel: "Erwachsener wechselt zu den Herren",
    beschreibung: "Ein Erwachsener spielt seit Jahren in Hessen und wechselt zum Verein.",
    antworten(heute) {
      const letztes = tageVor(heute, 200);
      return {
        wer: "selbst",
        vorname: "Tim",
        nachname: "Mustermann",
        geburtsdatum: geburtsdatumFuerAlter(heute, 29),
        geburtsort: "Wiesbaden",
        geburtsland: "DE",
        geschlecht: "m",
        abteilung: "fussball",
        spielen: true,
        spielerpass: "ja",
        alterVerein: { region: "hessen", name: "SV Beispieldorf", ort: "Beispieldorf", land: "DE", verband: "", mitgliedschaft: "kuendigen" },
        abmeldung: { status: "einschreiben", datum: tageVor(heute, 30), weg: null },
        letztesSpiel: letztes,
        letztesPflichtspiel: letztes,
        sperre: "nein",
        freigabe: "ja",
        wechselLetzte6Monate: "nein",
        deutsch: "ja",
        staaten: ["DE"],
        auslandGewohnt: "nein",
        anschrift: { ...ANSCHRIFT },
        email: "tim.mustermann@example.org",
        mobil: "0176 04069075",
        telefon: "",
        beitrag: { gruppe: null, familie: [], senator: false, doppel: false },
        zahlung: {
          art: "sepa", kontoinhaber: "mitglied", iban: iban("DE", BEISPIEL_KONTO), bic: "", bank: "",
          kiVorname: "", kiNachname: "", kiAnschriftGleich: true,
        },
        einwilligungen: { fotos: "ja", medien: ["intern", "web"], hfvName: false, hfvFoto: true },
        spielerfoto: { weg: "verein" },
        unterschriftWeg: "bildschirm",
        hfvUnterschrift: "training",
      };
    },
  },
];

// Antworten eines Beispiels, oder null für eine unbekannte Kennung.
export function beispielAntworten(id, heute, konfig) {
  const b = BEISPIELE.find((x) => x.id === id);
  return b ? b.antworten(heute, konfig) : null;
}
