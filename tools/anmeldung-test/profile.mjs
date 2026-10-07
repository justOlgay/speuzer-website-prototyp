// Profile und Konfiguration für die Tests des Regelwerks (AP-1). Auch AP-3 (PDF) und AP-4 (Oberfläche) nutzen sie.
//
// ladeKonfig()  baut `konfig` wie SCHNITTSTELLEN Abschnitt 2 aus den data-Dateien (ohne Personennamen).
//               `formulare` fehlt, solange data/anmeldung-formulare.json (AP-2) nicht existiert.
// PROFILE       benannte Beispielfälle: { id, name, beschreibung, heute, a, erwartet }.
//               Alle Angaben sind erfunden (Mustermann, example.org, Musterweg). Telefonnummern, E-Mail-Adressen
//               und die IBAN entstehen erst beim Laden aus Teilen, damit im Quelltext nichts Echtes steht.
//               Alle Telefonnummern liegen im Bereich 0176 04069000 bis 0176 04069099, den die Bundesnetzagentur
//               für Medien dauerhaft freihält (Mitteilung 148/2021). Sie gehören keiner echten Person.
// profil(id)    liefert ein Profil (tief kopiert), damit Tests es gefahrlos ändern können.
//
// `erwartet` nennt nur die Kernergebnisse; regeln-test.mjs prüft genau die Felder, die dort stehen:
//   faelle (enthalten), keineFaelle, status, international, altersklasse, mannschaft { vorhanden, namen, hinweisKey },
//   unterlagen { U09: "pflicht" | ... }, keineUnterlagen [ids], nachweis [ids], formulare (enthalten), keineFormulare,
//   frist { regel, pflichtspieleAb, freundschaftsspieleAb, unsicher, key, basisRegel },
//   hinweise [keys], keineHinweise [keys], weiterleitung ["an:key"], beitrag { gruppe, jahr, monat, zuschlagOhneSepa, hinweisKey },
//   unterschriften [ { formular, stelleKey, wer } ], schritteMit [ids], schritteOhne [ids], fehlend [ids].

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function lies(relativ) {
  return JSON.parse(readFileSync(path.join(WURZEL, relativ), "utf8"));
}

export function ladeKonfig() {
  const anmeldung = lies("data/anmeldung.json");
  const verein = lies("data/verein.json");
  const karneval = lies("data/karneval.json");
  const konfig = {
    anmeldung: anmeldung,
    aufnahmeantragFelder: lies("data/aufnahmeantrag-felder.json"),
    beitraege: lies("data/beitraege.json"),
    verein: {
      name: verein.name_kurz,
      name_register: verein.name_register,
      mail: verein.mail,
      tel_geschaeftsstelle: verein.tel_geschaeftsstelle,
      vereinsnummer: verein.vereinsnummer,
      vereinsnummerHfv: verein.vereinsnummer_hfv,
      anschrift: {
        strasse: verein.sportstaette.strasse,
        plz: verein.sportstaette.plz,
        ort: verein.sportstaette.ort,
        postfach: verein.post.postfach,
        postfachPlz: verein.post.plz,
        postfachOrt: verein.post.ort,
      },
    },
    // Nur Name und Übungszeit: keine Trainerinnen und Trainer (Personennamen)
    karnevalGruppen: karneval.gruppen.map((g) => ({ name: g.name, uebungszeit: g.uebungszeit })),
    stand: anmeldung.stand,
  };
  const formulare = path.join(WURZEL, "data", "anmeldung-formulare.json");
  if (existsSync(formulare)) konfig.formulare = JSON.parse(readFileSync(formulare, "utf8"));
  return konfig;
}

// ---------- Bausteine für erfundene Antworten ----------

const tel = (vorwahl, nummer) => vorwahl + " " + nummer;
const mail = (name) => name + "@" + "example" + ".org";
const IBAN_MUSTER = ["DE", "89", "3704", "0044", "0532", "0130", "00"].join("");
const IBAN_AUSLAND = ["TR", "33", "0006", "1005", "1978", "6457", "8413", "26"].join("");
const ANSCHRIFT = { strasse: "Musterweg 12", plz: "60326", ort: "Frankfurt am Main" };

function elternBeide() {
  return [
    { rolle: "mutter", vorname: "Lena", nachname: "Mustermann", telefon: tel("0176", "04069042"), email: mail("lena.mustermann") },
    { rolle: "vater", vorname: "Jonas", nachname: "Mustermann", telefon: "", email: "" },
  ];
}

// tiefes Zusammenführen: Objekte werden verschmolzen, Listen und einfache Werte ersetzt
function tief(basis, zusatz) {
  const aus = Array.isArray(basis) ? basis.slice() : Object.assign({}, basis);
  Object.keys(zusatz || {}).forEach((k) => {
    const v = zusatz[k];
    if (v && typeof v === "object" && !Array.isArray(v) && basis && typeof basis[k] === "object" && basis[k] && !Array.isArray(basis[k])) aus[k] = tief(basis[k], v);
    else aus[k] = v;
  });
  return aus;
}

// Grundgerüst: deutsches Kind, Fußball, neu, Eltern beide, Lastschrift
function kind(zusatz) {
  const grund = {
    schema: 1, sprache: "de", wer: "kind",
    vorname: "Mia", nachname: "Mustermann", geburtsdatum: "2018-04-12", geburtsort: "Frankfurt am Main", geburtsland: "DE", geschlecht: "w",
    abteilung: "fussball", spielen: true, spielerpass: "nein",
    deutsch: "ja", staaten: ["DE"], auslandGewohnt: "nein",
    sorge: "beide", sorgeberechtigte: elternBeide(),
    anschrift: Object.assign({}, ANSCHRIFT), email: mail("lena.mustermann"), mobil: tel("0176", "04069042"), telefon: "",
    beitrag: { gruppe: null, familie: [], senator: false, doppel: false },
    leistungen: "nein",
    zahlung: { art: "sepa", kontoinhaber: "sorgeberechtigt", iban: IBAN_MUSTER, bic: "", bank: "", kiVorname: "", kiNachname: "", kiAnschriftGleich: true },
    einwilligungen: { fotos: "ja", medien: ["intern", "web"], hfvName: true, hfvFoto: true, fahrten: true, messenger: true },
    notfall: { name: "Erika Beispiel", telefon: tel("0176", "04069087"), beziehung: "Oma" },
    gesundheitsbogen: false, spielerfoto: { weg: "foto" }, nachweise: {},
    unterschriftWeg: "bildschirm", hfvUnterschrift: "training",
  };
  return tief(grund, zusatz);
}

// Grundgerüst: Erwachsene, die sich selbst anmelden
function erwachsen(zusatz) {
  const grund = {
    schema: 1, sprache: "de", wer: "selbst",
    vorname: "Tim", nachname: "Mustermann", geburtsdatum: "1997-03-14", geburtsort: "Wiesbaden", geburtsland: "DE", geschlecht: "m",
    abteilung: "fussball", spielen: true, spielerpass: "nein",
    deutsch: "ja", staaten: ["DE"], auslandGewohnt: "nein",
    sorge: null, sorgeberechtigte: [],
    anschrift: Object.assign({}, ANSCHRIFT), email: mail("tim.mustermann"), mobil: tel("0176", "04069075"), telefon: "",
    beitrag: { gruppe: null, familie: [], senator: false, doppel: false },
    zahlung: { art: "sepa", kontoinhaber: "mitglied", iban: IBAN_MUSTER, bic: "", bank: "", kiVorname: "", kiNachname: "", kiAnschriftGleich: true },
    einwilligungen: { fotos: "ja", medien: ["intern"], hfvName: false, hfvFoto: true },
    gesundheitsbogen: false, spielerfoto: { weg: "verein" }, nachweise: {},
    unterschriftWeg: "bildschirm", hfvUnterschrift: "training",
  };
  return tief(grund, zusatz);
}

const HEUTE = "2026-09-29";

function profilEintrag(id, name, beschreibung, heute, a, erwartet) {
  return { id: id, name: name, beschreibung: beschreibung, heute: heute, a: a, erwartet: erwartet || {} };
}

// Wechsel innerhalb Hessens, D-Jugend (Jahrgang 2014), noch nicht abgemeldet, Einschreiben
function wechselD(zusatz) {
  return kind(tief({
    vorname: "Noah", geburtsdatum: "2014-05-10", geschlecht: "m",
    spielerpass: "ja", alterVerein: { region: "hessen", name: "SG Musterhausen", ort: "Musterhausen", land: "DE", verband: "", mitgliedschaft: "kuendigen",
      empfaenger: "Vorstand der SG Musterhausen", strasse: "Musterweg 3", plzOrt: "12345 Musterhausen" },
    abmeldung: { status: "noch_nicht", datum: null, weg: "einschreiben" },
    letztesSpiel: "2026-09-20", letztesPflichtspiel: "2026-09-20", sperre: "nein", freigabe: "ja", wechselLetzte6Monate: "nein",
  }, zusatz));
}

// ---------- Profile ----------

export const PROFILE = [
  profilEintrag("karneval-kind-abend", "Karneval-Kind mit Abendauftritten", "Mädchen, 10 Jahre, tanzt in der Karnevalabteilung, auch abends ohne Eltern, mit Turnier.", HEUTE,
    kind({ vorname: "Sophie", geburtsdatum: "2016-03-22", abteilung: "karneval", spielen: null, spielerpass: null,
      karneval: { gruppe: "Freaky Fruities", tanztWoanders: "nein", turnier: "ja", abendOhneEltern: "ja" } }),
    {
      faelle: ["F01"], keineFaelle: ["F03"], status: null, international: false, altersklasse: "E",
      mannschaft: { vorhanden: false, namen: [] },
      unterlagen: { U01: "pflicht", U04: "freiwillig", U05: "verein", U06: "pflicht", U28: "freiwillig", U29: "verein", U30: "verein", U31: "offen", U32: "offen", U35: "offen" },
      keineUnterlagen: ["U07", "U09", "U10", "U11", "U12", "U13", "U15", "U16", "U19"],
      formulare: ["aufnahmeantrag", "datenschutz", "einverstaendnis_fahrten", "karneval_auftritte", "notfall"], keineFormulare: ["hfv_antrag", "attest", "vollmacht", "abmeldung"],
      frist: { key: "frist_kein_spiel", regel: null, pflichtspieleAb: null },
      hinweise: ["karneval_kein_attest", "karneval_abend", "karneval_turnier_offen", "karneval_gruppe_vorschlag", "kostueme_offen", "probetraining_versicherung"],
      keineHinweise: ["attest_aktuell", "spielerfoto_hinweis"],
      weiterleitung: ["karneval:gruppe_einteilung", "karneval:turnier", "karneval:kostueme"],
      beitrag: { gruppe: "karneval_kinder", jahr: 108, monat: 9, hinweisKey: "beitrag_standard" },
      unterschriften: [{ formular: "karneval_auftritte", stelleKey: "unterschrift", wer: "sorgeberechtigte" }, { formular: "aufnahmeantrag", stelleKey: "s2.unterschrift", wer: "sorgeberechtigte" }, { formular: "aufnahmeantrag", stelleKey: "s2.unterschrift_sorgeberechtigte", wer: "sorgeberechtigte_beide" }],
      schritteMit: ["karneval", "sorge", "leistungen", "notfall", "unterschriften"], schritteOhne: ["mannschaft", "spielen", "spielerpass", "pass", "ausland", "wohnen", "spielerfoto", "abmeldung"],
    }),

  profilEintrag("passiv-foerderer", "Passives Mitglied (Förderer)", "Erwachsener, 45 Jahre, möchte den Verein nur unterstützen, zahlt auf Rechnung.", HEUTE,
    erwachsen({ vorname: "Peter", geburtsdatum: "1981-06-15", abteilung: "passiv", spielen: null, spielerpass: null, deutsch: null, staaten: [], auslandGewohnt: null,
      zahlung: { art: "rechnung", kontoinhaber: null, iban: "" } }),
    {
      faelle: ["F02"], status: null, altersklasse: "Herren",
      unterlagen: { U01: "pflicht", U04: "freiwillig", U06: "pflicht", U35: "offen" }, keineUnterlagen: ["U05", "U07", "U28", "U29", "U10"],
      formulare: ["aufnahmeantrag", "datenschutz"], keineFormulare: ["hfv_antrag", "notfall", "attest"],
      hinweise: ["passiv_hinweis", "zuschlag_ohne_sepa", "aufnahmegebuehr_offen"], keineHinweise: ["probetraining_versicherung"],
      beitrag: { gruppe: "fussball_passiv", jahr: 84, monat: 7, zuschlagOhneSepa: 3, hinweisKey: "beitrag_standard" },
      unterschriften: [{ formular: "aufnahmeantrag", stelleKey: "s2.unterschrift", wer: "mitglied" }],
      schritteOhne: ["sorge", "leistungen", "notfall", "mannschaft", "pass"],
    }),

  profilEintrag("kind-neu-deutsch-f", "Kind neu im Fußball (F-Jugend, deutsch)", "Mädchen, 8 Jahre, deutsch, war noch nie in einem Verein.", HEUTE,
    kind({}),
    {
      faelle: ["F03"], keineFaelle: ["F04", "F05", "F14"], status: "neu", international: false, altersklasse: "F",
      mannschaft: { vorhanden: true, namen: ["F1-Jugend"], hinweisKey: "mannschaft_gefunden" },
      unterlagen: { U01: "pflicht", U07: "pflicht", U08: "freiwillig", U09: "pflicht", U10: "pflicht", U11: "verein", U15: "pflicht", U16: "pflicht" },
      keineUnterlagen: ["U12", "U13", "U17", "U18", "U19", "U26"], nachweis: ["U09", "U10"],
      formulare: ["aufnahmeantrag", "datenschutz", "hfv_antrag", "attest", "einverstaendnis_fahrten", "notfall"], keineFormulare: ["abmeldung", "vollmacht"],
      frist: { regel: "R1", pflichtspieleAb: HEUTE, freundschaftsspieleAb: HEUTE, unsicher: false, key: "frist_neu" },
      hinweise: ["ohne_spielrecht_kein_spiel", "mitgliedschaft_zuerst", "attest_aktuell", "spielerfoto_hinweis", "mitgliedschaft_beginn", "beide_unterschreiben_empfohlen", "maedchen_jungenteam"],
      weiterleitung: [],
      beitrag: { gruppe: "fussball_jugend", jahr: 108, hinweisKey: "beitrag_standard" },
      unterschriften: [
        { formular: "aufnahmeantrag", stelleKey: "s2.unterschrift", wer: "sorgeberechtigte" },
        { formular: "aufnahmeantrag", stelleKey: "s2.unterschrift_sorgeberechtigte", wer: "sorgeberechtigte_beide" },
        { formular: "aufnahmeantrag", stelleKey: "s3.unterschrift", wer: "sorgeberechtigte" },
        { formular: "aufnahmeantrag", stelleKey: "s4.unterschrift", wer: "kontoinhaber" },
        { formular: "hfv_antrag", stelleKey: "spieler", wer: "spieler" },
        { formular: "hfv_antrag", stelleKey: "erziehungsberechtigte", wer: "sorgeberechtigte" },
        { formular: "hfv_antrag", stelleKey: "einwilligung_a", wer: "sorgeberechtigte" },
        { formular: "attest", stelleKey: "arzt", wer: "arzt" },
      ],
      schritteMit: ["mannschaft", "spielen", "spielerpass", "pass", "ausland", "sorge", "leistungen", "zahlung", "notfall", "spielerfoto", "nachweise", "pruefen", "fertig"],
      schritteOhne: ["alter_verein", "abmeldung", "wohnen", "karneval", "besonderes"],
      fehlend: ["U09", "U10"],
    }),

  profilEintrag("kind-neu-nichtdeutsch-unter10", "Kind neu, ohne deutschen Pass, unter 10 Jahren", "Junge, 8 Jahre, türkischer Pass, in Deutschland geboren.", HEUTE,
    kind({ vorname: "Yusuf", geburtsdatum: "2018-01-05", geschlecht: "m", geburtsland: "DE", deutsch: "nein", staaten: ["TR"], geborenInDe: "ja", wohnen: "gemeinsam", wohnenSeit: "2018-01-05" }),
    {
      faelle: ["F04"], keineFaelle: ["F03", "F05"], status: "neu", international: false, altersklasse: "F",
      unterlagen: { U09: "pflicht", U10: "pflicht", U12: "offen", U13: "offen" }, keineUnterlagen: ["U26", "U14"],
      frist: { regel: "R1", unsicher: true, key: "frist_neu_pruefung", pflichtspieleAb: HEUTE },
      hinweise: ["international_unter10", "meldebescheinigung_elternteil"], weiterleitung: ["passwesen:unter10_pruefung", "passwesen:offene_fragen_verband"],
      schritteMit: ["pass", "wohnen", "sorge"], keineHinweise: ["international_dauer"],
    }),

  profilEintrag("kind-neu-nichtdeutsch-12", "Kind neu, ohne deutschen Pass, 12 Jahre (internationale Erstausstellung)", "Junge, 12 Jahre, syrischer Pass, vor Kurzem mit den Eltern zugezogen.", HEUTE,
    kind({ vorname: "Omar", geburtsdatum: "2014-08-03", geschlecht: "m", geburtsland: "SY", deutsch: "nein", staaten: ["SY"], auslandGewohnt: "ja", auslandLand: "TR", auslandStadt: "Musterstadt",
      geborenInDe: "nein", jahreInDe: 1, wohnen: "gemeinsam", wohnenSeit: "2025-08-01" }),
    {
      faelle: ["F05"], keineFaelle: ["F03", "F04", "F14", "F15"], status: "neu", international: true, altersklasse: "D",
      unterlagen: { U09: "pflicht", U10: "pflicht", U12: "pflicht", U13: "pflicht", U26: "offen", U16: "pflicht" }, keineUnterlagen: ["U14", "U36", "U25"],
      nachweis: ["U09", "U10", "U12", "U13"],
      frist: { regel: "R2", unsicher: true, key: "frist_international", pflichtspieleAb: null, freundschaftsspieleAb: null },
      hinweise: ["international_dauer", "meldebescheinigung_elternteil"], weiterleitung: ["passwesen:international_klaeren"],
      schritteMit: ["wohnen", "ausland"], fehlend: ["U09", "U10", "U12", "U13"],
    }),

  profilEintrag("wechsel-d-mit-freigabe", "Wechsel in Hessen, D-Jugend, mit Freigabe", "Junge, 12 Jahre, Jahrgang 2014, noch nicht abgemeldet, Freigabe liegt vor. Abmeldung heute: Pflichtspiele ab 30. Dezember 2026.", HEUTE,
    wechselD({}),
    {
      faelle: ["F06"], keineFaelle: ["F03", "F08"], status: "wechsel_hfv", international: false, altersklasse: "D",
      mannschaft: { vorhanden: true, namen: ["D1-Jugend", "D3-Jugend"], hinweisKey: "mannschaft_mehrere" },
      unterlagen: { U07: "pflicht", U09: "offen", U10: "offen", U11: "offen", U17: "pflicht", U19: "nur_wenn" }, keineUnterlagen: ["U12", "U13", "U18", "U20", "U21", "U22"],
      formulare: ["hfv_antrag", "abmeldung"], keineFormulare: ["vollmacht", "attest"],
      frist: { regel: "R5", basisRegel: "R5", pflichtspieleAb: "2026-12-30", freundschaftsspieleAb: HEUTE, unsicher: false, key: "frist_wechsel_3monate" },
      hinweise: ["abmeldung_nach_letztem_spiel", "nie_zwei_vereine", "kuendigung_extra", "sonderwege_jugend", "juni_wechselzeit", "wechselgebuehr", "frist_annahme_heute"],
      weiterleitung: ["jugendleitung:sonderwege"], keineHinweise: ["abmeldung_formlos", "vollmacht_eingabe_zeitnah"],
      unterschriften: [{ formular: "abmeldung", stelleKey: "unterschrift", wer: "spieler" }, { formular: "abmeldung", stelleKey: "unterschrift_vertreter", wer: "sorgeberechtigte" }],
      schritteMit: ["alter_verein", "abmeldung"], schritteOhne: ["wohnen", "besonderes"], fehlend: ["U17"],
    }),

  profilEintrag("wechsel-d-ohne-freigabe", "Wechsel in Hessen, D-Jugend (älterer Jahrgang), ohne Freigabe", "Junge, Jahrgang 2014, alter Verein gibt nicht frei. Abmeldung heute: Pflichtspiele ab 30. März 2027.", HEUTE,
    wechselD({ freigabe: "nein" }),
    {
      faelle: ["F06"], status: "wechsel_hfv", altersklasse: "D",
      unterlagen: { U20: "nur_wenn", U17: "pflicht" }, keineUnterlagen: ["U21"],
      frist: { regel: "R5", pflichtspieleAb: "2027-03-30", freundschaftsspieleAb: HEUTE, unsicher: false, key: "frist_wechsel_6monate" },
      hinweise: ["nachtraegliche_freigabe"], keineHinweise: ["d_jahrgang_wartefrist_offen", "entschaedigung_hinweis"],
    }),

  profilEintrag("wechsel-d-jung-ohne-freigabe", "Wechsel in Hessen, D-Jugend (jüngerer Jahrgang), ohne Freigabe", "Junge, Jahrgang 2015: HFV nennt 6 Monate, DFB höchstens 3 Monate. Die Frist ist unsicher.", HEUTE,
    wechselD({ geburtsdatum: "2015-02-11", freigabe: "nein" }),
    {
      faelle: ["F06"], altersklasse: "D",
      frist: { regel: "R5", pflichtspieleAb: "2027-03-30", unsicher: true, key: "frist_d_jung_offen" },
      hinweise: ["d_jahrgang_wartefrist_offen", "nachtraegliche_freigabe"],
    }),

  profilEintrag("wechsel-nichtdeutsch-11", "Wechsel in Hessen, Kind ohne deutschen Pass, 11 Jahre", "Junge, rumänischer Pass, bereits per Einschreiben abgemeldet (1. September 2026).", HEUTE,
    wechselD({ vorname: "Andrei", geburtsdatum: "2015-02-11", geburtsland: "RO", deutsch: "nein", staaten: ["RO"], geborenInDe: "nein", jahreInDe: 6, wohnen: "gemeinsam",
      abmeldung: { status: "einschreiben", datum: "2026-09-01", weg: "einschreiben" }, letztesSpiel: "2026-08-30", letztesPflichtspiel: "2026-08-30" }),
    {
      faelle: ["F07"], keineFaelle: ["F06", "F05"], status: "wechsel_hfv", international: false, altersklasse: "D",
      unterlagen: { U12: "pflicht", U13: "offen", U09: "offen", U10: "offen", U17: "pflicht", U19: "nur_wenn" }, nachweis: ["U12", "U17"],
      frist: { regel: "R5", pflichtspieleAb: "2026-12-02", freundschaftsspieleAb: HEUTE, unsicher: false, key: "frist_wechsel_3monate" },
      hinweise: ["meldebescheinigung_elternteil"], schritteMit: ["pass", "wohnen"],
    }),

  profilEintrag("wechsel-lv-e-jugend", "Wechsel aus einem anderen Bundesland, E-Jugend", "Junge, 10 Jahre, kommt von einem Verein in Bayern, noch nicht abgemeldet.", HEUTE,
    wechselD({ vorname: "Felix", geburtsdatum: "2016-03-05", alterVerein: { region: "bundesland", name: "TSV Beispieldorf", ort: "Beispieldorf", land: "DE", verband: "Bayerischer Fußball-Verband" } }),
    {
      faelle: ["F08"], keineFaelle: ["F06", "F12"], status: "wechsel_lv", altersklasse: "E",
      mannschaft: { vorhanden: true, namen: ["E1-Jugend", "E3-Jugend"] },
      unterlagen: { U17: "pflicht", U19: "nur_wenn", U09: "offen" }, keineUnterlagen: ["U18", "U20"],
      frist: { regel: "R4", pflichtspieleAb: "2026-12-30", freundschaftsspieleAb: HEUTE, unsicher: false, key: "frist_wechsel_e" },
      hinweise: ["wechsel_lv_anfrage", "juni_wechselzeit"], weiterleitung: ["jugendleitung:sonderwege"],
    }),

  profilEintrag("wechsel-ausland-kind-11", "Wechsel aus dem Ausland (USA), 11 Jahre", "Junge, US-Pass, spielte zuletzt bei einem Verein in den USA. Internationale Freigabe.", HEUTE,
    kind({ vorname: "Liam", geburtsdatum: "2015-05-20", geschlecht: "m", geburtsland: "US", deutsch: "nein", staaten: ["US"], auslandGewohnt: "ja", auslandLand: "US", auslandStadt: "Musterstadt",
      geborenInDe: "nein", jahreInDe: 1, wohnen: "gemeinsam", spielerpass: "ja",
      alterVerein: { region: "ausland", name: "FC Beispiel", ort: "Musterstadt", land: "US", verband: "US Soccer" }, letztesSpiel: "2026-06-30" }),
    {
      faelle: ["F09"], keineFaelle: ["F05", "F06", "F07"], status: "wechsel_ausland", international: true, altersklasse: "D",
      unterlagen: { U14: "pflicht", U27: "offen", U09: "pflicht", U10: "pflicht", U12: "pflicht", U13: "pflicht" }, keineUnterlagen: ["U17", "U18", "U19"],
      frist: { regel: "R2", unsicher: true, key: "frist_international", pflichtspieleAb: null },
      hinweise: ["international_dauer", "laenderformulare_offen"], weiterleitung: ["passwesen:international_klaeren", "passwesen:laenderformulare"],
      keineHinweise: ["kuendigung_extra", "abmeldung_nach_letztem_spiel"], schritteOhne: ["abmeldung"],
    }),

  profilEintrag("herren-neu-deutsch", "Herren neu, deutsch", "Erwachsener, 29 Jahre, spielte noch nie in einem Verein.", HEUTE,
    erwachsen({}),
    {
      faelle: ["F10"], keineFaelle: ["F11", "F12"], status: "neu", international: false, altersklasse: "Herren",
      mannschaft: { vorhanden: true, namen: ["1. Herrenmannschaft"], hinweisKey: "mannschaft_herren" },
      unterlagen: { U07: "pflicht", U10: "verein", U11: "verein", U16: "pflicht", U15: "pflicht" }, keineUnterlagen: ["U09", "U12", "U13", "U28", "U29"],
      formulare: ["hfv_antrag", "attest"], frist: { regel: "R1", pflichtspieleAb: HEUTE, key: "frist_neu" },
      beitrag: { gruppe: "fussball_erwachsene", jahr: 120, monat: 10 },
      unterschriften: [{ formular: "hfv_antrag", stelleKey: "spieler", wer: "mitglied" }, { formular: "attest", stelleKey: "einwilligung", wer: "mitglied" }],
      schritteOhne: ["sorge", "leistungen", "notfall", "wohnen", "besonderes"], schritteMit: ["spielerfoto"],
    }),

  profilEintrag("herren-neu-nichtdeutsch", "Herren neu, ohne deutschen Pass, aus dem Ausland", "Erwachsener, 24 Jahre, ghanaischer Pass, Verein im Ausland unbekannt.", HEUTE,
    erwachsen({ vorname: "Kofi", geburtsdatum: "2002-02-02", geburtsland: "GH", deutsch: "nein", staaten: ["GH"], auslandGewohnt: "ja", auslandLand: "GH", auslandStadt: "Musterstadt",
      spielerpass: "ja", alterVerein: { region: "ausland", name: "", ort: "", land: "GH", verband: "" } }),
    {
      faelle: ["F11"], keineFaelle: ["F10", "F12", "F09"], status: "ausland_unbekannt", international: true,
      unterlagen: { U12: "pflicht", U10: "verein" }, keineUnterlagen: ["U13", "U14", "U09"],
      frist: { regel: "R2", unsicher: true, key: "frist_international" }, hinweise: ["international_dauer", "ausland_erwachsen_wechselperiode"],
    }),

  profilEintrag("herren-wechsel-wp2-zustimmung", "Herren-Wechsel im September (Wechselperiode II), mit Zustimmung", "Erwachsener, 27 Jahre, per Einschreiben am 25. September abgemeldet, alter Verein stimmt zu.", HEUTE,
    erwachsen({ vorname: "Jan", geburtsdatum: "1998-11-03", spielerpass: "ja", alterVerein: { region: "hessen", name: "SV Beispieldorf", ort: "Beispieldorf", land: "DE", verband: "", mitgliedschaft: "kuendigen" },
      abmeldung: { status: "einschreiben", datum: "2026-09-25", weg: null }, freigabe: "ja", letztesSpiel: "2026-09-20", letztesPflichtspiel: "2026-09-20", sperre: "nein", wechselLetzte6Monate: "nein" }),
    {
      faelle: ["F12"], keineFaelle: ["F10", "F06"], status: "wechsel_hfv", altersklasse: "Herren",
      unterlagen: { U17: "pflicht", U19: "nur_wenn", U07: "pflicht" }, keineUnterlagen: ["U10", "U20", "U21", "U09"], nachweis: ["U17"],
      frist: { regel: "R7", pflichtspieleAb: "2027-01-01", freundschaftsspieleAb: HEUTE, unsicher: false, key: "frist_herren_wp2_zustimmung" },
      hinweise: ["antrag_bis", "kuendigung_extra", "wechselgebuehr"], keineHinweise: ["sonderwege_jugend", "juni_wechselzeit", "entschaedigung_hinweis", "frist_annahme_heute"],
      unterschriften: [{ formular: "abmeldung", stelleKey: "unterschrift", wer: "mitglied" }, { formular: "aufnahmeantrag", stelleKey: "s2.unterschrift", wer: "mitglied" }],
      keineUnterschriften: [{ formular: "abmeldung", stelleKey: "unterschrift_vertreter" }, { formular: "aufnahmeantrag", stelleKey: "s2.unterschrift_sorgeberechtigte" }],
      weiterleitung: ["spielausschuss:herren_wechsel"], fehlend: ["U17"],
    }),

  profilEintrag("herren-wechsel-wp1-ohne-zustimmung", "Herren-Wechsel im Juni (Wechselperiode I), ohne Zustimmung", "Erwachsener, 31 Jahre, am 8. Juni 2027 abgemeldet, alter Verein gibt nicht frei: Pflichtspiele ab 1. November, sonst Entschädigung.", "2027-06-10",
    erwachsen({ vorname: "Ben", geburtsdatum: "1995-01-20", spielerpass: "ja", alterVerein: { region: "hessen", name: "FC Beispielstadt", ort: "Beispielstadt", land: "DE", verband: "", mitgliedschaft: "kuendigen" },
      abmeldung: { status: "einschreiben", datum: "2027-06-08", weg: null }, freigabe: "nein", letztesSpiel: "2027-05-30", letztesPflichtspiel: "2027-05-30", sperre: "nein", wechselLetzte6Monate: "nein" }),
    {
      faelle: ["F12"], status: "wechsel_hfv",
      unterlagen: { U20: "nur_wenn", U21: "nur_wenn", U17: "pflicht" },
      frist: { regel: "R7", pflichtspieleAb: "2027-11-01", freundschaftsspieleAb: "2027-06-10", unsicher: false, key: "frist_herren_wp1_ohne", antragBis: "2027-08-31", entschaedigungMoeglich: true },
      hinweise: ["antrag_bis", "entschaedigung_hinweis", "nachtraegliche_freigabe"], keineHinweise: ["regelwerk_saison"],
    }),

  profilEintrag("a-jugend-aushilfe-herren", "A-Jugend (17 Jahre) hilft bei den Herren aus", "Junge, Jahrgang 2008, noch 17, neu im Verein, soll auch bei den Herren spielen.", HEUTE,
    kind({ vorname: "Emre", geburtsdatum: "2008-10-15", geschlecht: "m", besonderes: { herrenAushilfe: true, maedchenJungenteam: false, sonderspielrecht: false, frauHerren: false } }),
    {
      faelle: ["F03", "F13"], status: "neu", altersklasse: "A", international: false,
      mannschaft: { vorhanden: true, namen: ["A-Jugend"], hinweisKey: "mannschaft_gefunden" },
      unterlagen: { U23: "pflicht", U10: "pflicht", U07: "pflicht", U09: "pflicht" }, formulare: ["einverstaendnis_senioren", "attest", "hfv_antrag"],
      hinweise: ["herren_aushilfe", "sportarzt_offen"], weiterleitung: ["jugendleitung:aushilfe"],
      unterschriften: [{ formular: "einverstaendnis_senioren", stelleKey: "unterschrift", wer: "sorgeberechtigte" }],
      schritteMit: ["besonderes"], besonderesOptionen: ["herrenAushilfe", "sonderspielrecht"], beitrag: { gruppe: "fussball_jugend" },
    }),

  profilEintrag("vormund-kind", "Kind mit Vormund", "Mädchen, 9 Jahre, deutsch, das Jugendamt hat einen Vormund bestellt.", HEUTE,
    kind({ vorname: "Lea", geburtsdatum: "2017-06-06", sorge: "vormund", sorgeberechtigte: [{ rolle: "vormund", vorname: "Karl", nachname: "Beispiel", telefon: tel("0176", "04069099"), email: mail("karl.beispiel") }] }),
    {
      faelle: ["F03", "F14"], keineFaelle: ["F15", "F16", "F17", "F18"], status: "neu", altersklasse: "E",
      unterlagen: { U25: "pflicht", U09: "pflicht", U10: "pflicht" }, nachweis: ["U25", "U09", "U10"],
      hinweise: ["vormund_hinweis"], keineHinweise: ["beide_unterschreiben_empfohlen", "ohne_zusage_spielen"], weiterleitung: ["jugendleitung:sonderfall_kind"],
      unterschriften: [{ formular: "aufnahmeantrag", stelleKey: "s2.unterschrift", wer: "sorgeberechtigte" }],
      keineUnterschriften: [{ formular: "aufnahmeantrag", stelleKey: "s2.unterschrift_sorgeberechtigte" }],
      frist: { regel: "R1", pflichtspieleAb: HEUTE }, fehlend: ["U09", "U10", "U25"],
    }),

  profilEintrag("gefluechtet-ohne-eltern", "Geflüchtetes Kind ohne Eltern", "Junge, 12 Jahre, aus Afghanistan, ohne Eltern in Deutschland, Vormund bestellt.", HEUTE,
    kind({ vorname: "Rahim", geburtsdatum: "2014-02-02", geschlecht: "m", geburtsland: "AF", deutsch: "nein", staaten: ["AF"], auslandGewohnt: "ja", auslandLand: "TR", auslandStadt: "Musterstadt",
      geborenInDe: "nein", jahreInDe: 1, wohnen: "ohne_eltern", ohneElternGrund: "gefluechtet", sorge: "vormund",
      sorgeberechtigte: [{ rolle: "vormund", vorname: "Karl", nachname: "Beispiel", telefon: tel("0176", "04069099"), email: mail("karl.beispiel") }] }),
    {
      faelle: ["F05", "F14", "F15"], keineFaelle: ["F16", "F17", "F18"], status: "neu", international: true,
      unterlagen: { U25: "pflicht", U36: "pflicht", U12: "pflicht", U13: "pflicht", U09: "pflicht", U10: "pflicht" }, keineUnterlagen: ["U37", "U38"],
      frist: { regel: "R14", unsicher: true, key: "frist_ohne_zusage", pflichtspieleAb: null },
      hinweise: ["ohne_zusage_spielen", "unterlagen_liste_offen", "vormund_hinweis"], weiterleitung: ["jugendleitung:sonderfall_kind", "passwesen:international_klaeren"],
      schritteMit: ["wohnen", "sorge"], fehlend: ["U09", "U10", "U12", "U13", "U25", "U36"],
    }),

  profilEintrag("austauschschueler", "Austauschschüler ohne Eltern", "Mädchen, 16 Jahre, aus Brasilien, Gastfamilie, Austauschprogramm der Schule.", HEUTE,
    kind({ vorname: "Ana", geburtsdatum: "2010-08-08", geburtsland: "BR", deutsch: "nein", staaten: ["BR"], auslandGewohnt: "ja", auslandLand: "BR", auslandStadt: "Musterstadt",
      geborenInDe: "nein", jahreInDe: 0, wohnen: "ohne_eltern", ohneElternGrund: "austausch", sorge: "pflege",
      sorgeberechtigte: [{ rolle: "pflege", vorname: "Gabi", nachname: "Beispiel", telefon: tel("0176", "04069066"), email: mail("gabi.beispiel") }] }),
    {
      faelle: ["F05", "F14", "F16"], keineFaelle: ["F15", "F17", "F18"], altersklasse: "B", status: "neu", international: true,
      mannschaft: { vorhanden: false, hinweisKey: "keine_mannschaft" },
      unterlagen: { U37: "pflicht", U25: "pflicht" }, keineUnterlagen: ["U36", "U38"],
      frist: { regel: "R14", unsicher: true, pflichtspieleAb: null },
      hinweise: ["austausch_ein_jahr", "ohne_zusage_spielen", "pflege_hinweis"], weiterleitung: ["jugendleitung:keine_mannschaft", "jugendleitung:sonderfall_kind"],
    }),

  profilEintrag("verwandte-fuenf-jahre", "Kind bei Verwandten, seit 5 Jahren in Deutschland", "Junge, 11 Jahre, syrischer Pass, in Deutschland geboren, lebt bei der Tante, kein Schutzstatus.", HEUTE,
    kind({ vorname: "Hamza", geburtsdatum: "2015-07-01", geschlecht: "m", geburtsland: "DE", deutsch: "nein", staaten: ["SY"], geborenInDe: "ja", jahreInDe: null,
      wohnen: "verwandte", ohneElternGrund: "verwandte", sorge: "vormund",
      sorgeberechtigte: [{ rolle: "vormund", vorname: "Amal", nachname: "Beispiel", telefon: tel("0176", "04069055"), email: mail("amal.beispiel") }] }),
    {
      faelle: ["F05", "F14", "F17"], keineFaelle: ["F15", "F16", "F18"], status: "neu", international: true,
      unterlagen: { U38: "pflicht", U25: "pflicht" }, keineUnterlagen: ["U36", "U37"],
      frist: { regel: "R14", unsicher: true, pflichtspieleAb: null },
      hinweise: ["f17_moeglich_5_jahre", "ohne_zusage_spielen", "unterlagen_liste_offen"], keineHinweise: ["f17_wahrscheinlich_nicht"],
    }),

  profilEintrag("verwandte-ohne-fuenf-jahre", "Kind bei Verwandten, erst seit 2 Jahren in Deutschland", "Mädchen, 11 Jahre, afghanischer Pass, lebt bei Verwandten, kein Schutzstatus: Spiele wahrscheinlich erst mit 18.", HEUTE,
    kind({ vorname: "Zahra", geburtsdatum: "2015-01-01", geburtsland: "AF", deutsch: "nein", staaten: ["AF"], auslandGewohnt: "ja", auslandLand: "AF", geborenInDe: "nein", jahreInDe: 2,
      wohnen: "verwandte", ohneElternGrund: "verwandte", sorge: "pflege",
      sorgeberechtigte: [{ rolle: "pflege", vorname: "Amal", nachname: "Beispiel", telefon: tel("0176", "04069055"), email: mail("amal.beispiel") }] }),
    {
      faelle: ["F14", "F17"], unterlagen: { U38: "offen", U25: "pflicht" }, frist: { regel: "R14", pflichtspieleAb: null, unsicher: true },
      hinweise: ["f17_wahrscheinlich_nicht", "ohne_zusage_spielen"], keineHinweise: ["f17_moeglich_5_jahre"],
    }),

  profilEintrag("eu-jugendlicher-16-ohne-eltern", "EU-Jugendlicher, 16 Jahre, ohne Eltern", "Junge, rumänischer Pass, lebt allein in Deutschland (Ausbildung).", HEUTE,
    kind({ vorname: "Mihai", geburtsdatum: "2010-05-01", geschlecht: "m", geburtsland: "RO", deutsch: "nein", staaten: ["RO"], auslandGewohnt: "ja", auslandLand: "RO", auslandStadt: "Musterstadt",
      geborenInDe: "nein", jahreInDe: 1, wohnen: "ohne_eltern", ohneElternGrund: null, sorge: "vormund",
      sorgeberechtigte: [{ rolle: "vormund", vorname: "Karl", nachname: "Beispiel", telefon: tel("0176", "04069099"), email: mail("karl.beispiel") }] }),
    {
      faelle: ["F05", "F14", "F18"], keineFaelle: ["F15", "F16"], status: "neu", international: true, altersklasse: "B",
      frist: { regel: "R14", pflichtspieleAb: null, unsicher: true }, hinweise: ["ohne_zusage_spielen", "f17_wahrscheinlich_nicht"], unterlagen: { U38: "offen", U25: "pflicht" },
    }),

  profilEintrag("e-jugend-wechsel-juni", "E-Jugend-Wechsel im Juni", "Junge, 10 Jahre (älterer E-Jahrgang), Abmeldung am 9. Juni 2027: Pflichtspiele ab 1. Juli.", "2027-06-10",
    wechselD({ vorname: "Paul", geburtsdatum: "2016-09-01", abmeldung: { status: "einschreiben", datum: "2027-06-09", weg: null }, freigabe: "weiss_nicht", letztesSpiel: "2027-06-06", letztesPflichtspiel: "2027-06-06" }),
    {
      faelle: ["F06"], altersklasse: "E", status: "wechsel_hfv",
      frist: { regel: "R4", pflichtspieleAb: "2027-07-01", freundschaftsspieleAb: "2027-06-10", unsicher: false, key: "frist_wechsel_e_juni" },
      hinweise: ["e_aelter_juni"], keineHinweise: ["juni_wechselzeit", "freigabe_unklar"],
    }),

  profilEintrag("e-jugend-wechsel-september", "E-Jugend-Wechsel im September", "Junge, 9 Jahre, Jahrgang 2017, Abmeldung heute: 3 Monate, Pflichtspiele ab 30. Dezember 2026.", HEUTE,
    wechselD({ vorname: "Leo", geburtsdatum: "2017-03-30", freigabe: "nein" }),
    {
      faelle: ["F06"], altersklasse: "E", frist: { regel: "R4", pflichtspieleAb: "2026-12-30", unsicher: false, key: "frist_wechsel_e" },
      keineUnterlagen: ["U20", "U21"], hinweise: ["juni_wechselzeit"], keineHinweise: ["e_aelter_juni", "d_jahrgang_wartefrist_offen"],
    }),

  profilEintrag("geschlecht-ohne-angabe", "Geschlecht 'ohne Angabe'", "Kind, 9 Jahre, Eintrag 'ohne Angabe', soll in den Jungenteams spielen (Zustimmung der Eltern).", HEUTE,
    kind({ vorname: "Alex", geburtsdatum: "2017-02-14", geschlecht: "ohne_angabe", spielrechtFuer: "m" }),
    {
      faelle: ["F03"], altersklasse: "E", mannschaft: { vorhanden: true },
      unterlagen: { U40: "pflicht", U07: "pflicht" }, formulare: ["hfv_antrag"],
      hinweise: ["vertrauensperson"], weiterleitung: ["jugendleitung:vertrauensperson"], keineHinweise: ["maedchen_jungenteam"],
    }),

  profilEintrag("getrennt-lebende-eltern", "Getrennt lebende Eltern (der andere Elternteil ist nicht gefragt)", "Junge, 9 Jahre, lebt bei der Mutter, der Vater weiß noch nichts von der Anmeldung.", HEUTE,
    kind({ vorname: "Ben", geburtsdatum: "2017-02-14", geschlecht: "m", sorge: "getrennt_bei_mir", andererElternteilEinverstanden: false, sorgeberechtigte: [elternBeide()[0]] }),
    {
      faelle: ["F03"], hinweise: ["getrennt_zustimmung"], keineHinweise: ["getrennt_einverstanden", "beide_unterschreiben_empfohlen"], weiterleitung: ["jugendleitung:getrennte_eltern"],
      unterschriften: [{ formular: "aufnahmeantrag", stelleKey: "s2.unterschrift", wer: "sorgeberechtigte" }, { formular: "aufnahmeantrag", stelleKey: "s2.unterschrift_sorgeberechtigte", wer: "sorgeberechtigte_beide" }, { formular: "hfv_antrag", stelleKey: "erziehungsberechtigte", wer: "sorgeberechtigte" }],
    }),

  profilEintrag("wechsel-innerhalb-6-monate", "Wechsel innerhalb von 6 Monaten", "Junge, D-Jugend, hat vor Kurzem schon einmal gewechselt: Die Wartefrist kann länger sein.", HEUTE,
    wechselD({ wechselLetzte6Monate: "ja" }),
    {
      faelle: ["F06"], frist: { regel: "R5", pflichtspieleAb: "2026-12-30", unsicher: true, key: "frist_wechsel_3monate" },
      hinweise: ["wiederholter_wechsel"], weiterleitung: ["passwesen:wiederholter_wechsel"],
    }),

  profilEintrag("weiss-nicht-antworten", "Antworten 'weiß nicht'", "Junge, 10 Jahre: Spielerpass unklar, Pass unklar. Der Verein prüft im Verbandssystem.", HEUTE,
    kind({ vorname: "Kai", geburtsdatum: "2016-04-04", geschlecht: "m", spielerpass: "weiss_nicht", deutsch: "weiss_nicht", staaten: [], auslandGewohnt: "nein" }),
    {
      faelle: ["F03"], status: "neu", international: false, keineUnterlagen: ["U12", "U13", "U17"],
      frist: { regel: "R1", unsicher: true, key: "frist_neu_unklar" },
      hinweise: ["spielerpass_unklar", "staatsangehoerigkeit_unklar"], weiterleitung: ["passwesen:spielerpass_unklar", "passwesen:staatsangehoerigkeit_unklar"],
      schritteOhne: ["alter_verein", "abmeldung"],
    }),

  profilEintrag("weiss-nicht-im-ausland-gewohnt", "Antwort 'weiß nicht', Kind hat im Ausland gewohnt", "Junge, 10 Jahre, war vor dem Umzug im Ausland: ausland_unbekannt, internationale Erstausstellung.", HEUTE,
    kind({ vorname: "Emil", geburtsdatum: "2016-04-04", geschlecht: "m", spielerpass: "weiss_nicht", deutsch: "ja", staaten: ["DE"], auslandGewohnt: "ja", auslandLand: "ES", auslandStadt: "Musterstadt", wohnen: "gemeinsam" }),
    {
      faelle: ["F05"], status: "ausland_unbekannt", international: true, frist: { regel: "R2", unsicher: true },
      unterlagen: { U12: "offen", U13: "pflicht", U09: "pflicht", U10: "pflicht" }, hinweise: ["spielerpass_unklar", "ausweis_deutsch_original"], weiterleitung: ["passwesen:international_klaeren"],
    }),

  profilEintrag("doppelstaatler-deutscher-pass", "Doppelstaatler mit deutschem Pass", "Junge, 11 Jahre, deutscher und türkischer Pass: zählt wie ein deutsches Kind.", HEUTE,
    kind({ vorname: "Can", geburtsdatum: "2015-09-09", geschlecht: "m", deutsch: "ja", staaten: ["DE", "TR"] }),
    {
      faelle: ["F03"], keineFaelle: ["F04", "F05", "F07"], status: "neu", international: false, keineUnterlagen: ["U12", "U13", "U26"],
      frist: { regel: "R1", pflichtspieleAb: HEUTE, unsicher: false }, hinweise: ["doppelstaatler"], weiterleitung: ["passwesen:doppelstaatler"], schritteOhne: ["wohnen"],
    }),

  profilEintrag("maedchen-d-jugend-mit-bonus", "Mädchen (Jahrgang 2013) in der D-Jugend der Jungen", "Mädchen, 13 Jahre: ein Jahr älter als die Jungen der D-Jugend, das ist erlaubt.", HEUTE,
    kind({ vorname: "Nele", geburtsdatum: "2013-03-03", geschlecht: "w" }),
    {
      faelle: ["F03"], altersklasse: "C", mannschaft: { vorhanden: true, namen: ["D1-Jugend", "D3-Jugend"], hinweisKey: "mannschaft_maedchen_bonus" },
      unterlagen: { U10: "pflicht", U09: "pflicht" }, keineUnterlagen: ["U24"], hinweise: ["maedchen_jungenteam"], schritteMit: ["besonderes"],
      besonderesOptionen: ["maedchenJungenteam", "sonderspielrecht"],
    }),

  profilEintrag("maedchen-c-jugend-jungenteam", "Mädchen in der C-Jugend der Jungen", "Mädchen, 14 Jahre (Jahrgang 2012), soll in einem Jungenteam der C-Jugend spielen: Einverständnis der Eltern.", HEUTE,
    kind({ vorname: "Lina", geburtsdatum: "2012-06-06", geschlecht: "w", besonderes: { maedchenJungenteam: true, herrenAushilfe: false, sonderspielrecht: false, frauHerren: false } }),
    {
      faelle: ["F03"], altersklasse: "C", mannschaft: { vorhanden: false, namen: [], hinweisKey: "keine_mannschaft" },
      unterlagen: { U24: "pflicht", U10: "pflicht" }, formulare: ["einverstaendnis_maedchen", "attest"], weiterleitung: ["jugendleitung:keine_mannschaft"],
      unterschriften: [{ formular: "einverstaendnis_maedchen", stelleKey: "unterschrift", wer: "sorgeberechtigte" }], schritteMit: ["besonderes"],
    }),

  profilEintrag("jahrgang-2011-ohne-mannschaft", "Jahrgang 2011: keine Mannschaft", "Junge, 15 Jahre: Für die B-Jugend hat der Verein 2026/27 keine Mannschaft.", HEUTE,
    kind({ vorname: "Jonas", geburtsdatum: "2011-01-20", geschlecht: "m" }),
    {
      faelle: ["F03"], altersklasse: "B", mannschaft: { vorhanden: false, namen: [], hinweisKey: "keine_mannschaft" }, weiterleitung: ["jugendleitung:keine_mannschaft"],
      unterlagen: { U07: "pflicht" },
    }),

  profilEintrag("familie-drei-mitglieder", "Familie mit zwei weiteren Mitgliedern", "Junge, 11 Jahre, mit Schwester und Mutter im Familienbeitrag.", HEUTE,
    kind({ vorname: "Tom", geburtsdatum: "2015-08-08", geschlecht: "m", beitrag: { gruppe: null, senator: false, doppel: false,
      familie: [{ vorname: "Mia", nachname: "Mustermann", geburtsdatum: "2018-04-12" }, { vorname: "Lena", nachname: "Mustermann", geburtsdatum: "1988-05-02" }] } }),
    {
      faelle: ["F03"], unterlagen: { U02: "verein" }, formulare: ["familienliste"], beitrag: { gruppe: "fussball_familie", jahr: 180, monat: 15, hinweisKey: "beitrag_familie" },
      hinweise: ["beitrag_familie_offen"], weiterleitung: ["geschaeftsstelle:beitrag_familie"],
    }),

  profilEintrag("sepa-anderer-kontoinhaber", "Lastschrift, das Konto gehört einer anderen Person", "Junge, 9 Jahre, die Großmutter zahlt den Beitrag mit ihrem Konto.", HEUTE,
    kind({ vorname: "Nils", geburtsdatum: "2017-05-05", geschlecht: "m", zahlung: { art: "sepa", kontoinhaber: "andere", kiVorname: "Ute", kiNachname: "Beispiel", kiAnschriftGleich: false, kiStrasse: "Beispielallee 3", kiPlz: "60311", kiOrt: "Frankfurt am Main", iban: IBAN_MUSTER } }),
    {
      faelle: ["F03"], unterlagen: { U05: "verein" }, hinweise: ["kontoinhaber_andere"],
      unterschriften: [{ formular: "aufnahmeantrag", stelleKey: "s4.unterschrift", wer: "kontoinhaber" }],
    }),

  profilEintrag("rechnung-statt-lastschrift", "Rechnung statt Lastschrift", "Junge, 9 Jahre, zahlt auf Rechnung: Zuschlag offen, kein SEPA-Mandat.", HEUTE,
    kind({ vorname: "Max", geburtsdatum: "2017-05-05", geschlecht: "m", zahlung: { art: "rechnung", kontoinhaber: null, iban: "" } }),
    {
      faelle: ["F03"], keineUnterlagen: ["U05"], beitrag: { gruppe: "fussball_jugend", jahr: 108, zuschlagOhneSepa: 3 }, hinweise: ["zuschlag_ohne_sepa"],
      keineHinweise: ["kontoinhaber_andere", "iban_ausland_pruefen"],
    }),

  profilEintrag("konto-im-ausland", "Lastschrift mit Konto im Ausland", "Junge, 9 Jahre, das Konto liegt in der Türkei: Der Verein prüft, ob abgebucht werden kann.", HEUTE,
    kind({ vorname: "Deniz", geburtsdatum: "2017-05-05", geschlecht: "m", zahlung: { art: "sepa", kontoinhaber: "sorgeberechtigt", iban: IBAN_AUSLAND } }),
    { faelle: ["F03"], hinweise: ["iban_ausland_pruefen"] }),

  profilEintrag("vollmacht-wechsel", "Wechsel mit Vollmacht zur Abmeldung", "Junge, D-Jugend: Der neue Verein meldet online ab (Vollmacht). Der Abmeldetag ist der Tag der Eingabe.", HEUTE,
    wechselD({ abmeldung: { status: "noch_nicht", datum: null, weg: "vollmacht" } }),
    {
      faelle: ["F06"], frist: { regel: "R13", basisRegel: "R5", pflichtspieleAb: "2026-12-30", unsicher: false, basis: "heute", abmeldedatum: HEUTE },
      unterlagen: { U18: "nur_wenn", U19: "nur_wenn" }, keineUnterlagen: ["U17"], formulare: ["vollmacht", "abmeldung", "hfv_antrag"],
      hinweise: ["vollmacht_eingabe_zeitnah", "vollmacht_ohne_kurze_frist", "kuendigung_extra"],
      unterschriften: [{ formular: "vollmacht", stelleKey: "unterschrift", wer: "sorgeberechtigte" }],
    }),

  profilEintrag("vollmacht-anderer-landesverband", "Vollmacht beim Wechsel aus einem anderen Bundesland", "Junge, E-Jugend: Die Familie möchte die Vollmacht nutzen. Beim Wechsel aus einem anderen Landesverband bleibt das Einschreiben der Standard.", HEUTE,
    wechselD({ vorname: "Jan", geburtsdatum: "2016-03-05", alterVerein: { region: "bundesland", name: "TSV Beispieldorf", ort: "Beispieldorf", land: "DE", verband: "" }, abmeldung: { status: "noch_nicht", datum: null, weg: "vollmacht" } }),
    {
      faelle: ["F08"], unterlagen: { U17: "pflicht", U18: "offen" }, formulare: ["abmeldung"], keineFormulare: ["vollmacht"],
      frist: { regel: "R13", basisRegel: "R4", pflichtspieleAb: "2026-12-30" }, hinweise: ["vollmacht_anderer_verband", "vollmacht_eingabe_zeitnah"], weiterleitung: ["passwesen:vollmacht_anderer_verband"],
    }),

  profilEintrag("wechsel-passiv-im-alten-verein", "Wechsel, im alten Verein passives Mitglied bleiben", "Junge, D-Jugend: Die Familie meldet den Jungen als Spieler ab und bleibt im alten Verein passives Mitglied (Einschreiben).", HEUTE,
    wechselD({ alterVerein: { mitgliedschaft: "passiv" } }),
    {
      faelle: ["F06"], unterlagen: { U17: "pflicht", U19: "nur_wenn" }, formulare: ["abmeldung"],
      hinweise: ["passiv_alter_verein"], keineHinweise: ["kuendigung_extra", "mitgliedschaft_alter_verein_unklar"],
    }),

  profilEintrag("vollmacht-und-kuendigung", "Vollmacht für das Spielrecht, Kündigung der Mitgliedschaft extra", "Junge, D-Jugend: Der neue Verein meldet das Spielrecht per Vollmacht ab. Für die Mitgliedschaft schickt die Familie das Formular Abmeldung als Einschreiben.", HEUTE,
    wechselD({ abmeldung: { status: "noch_nicht", datum: null, weg: "vollmacht" }, alterVerein: { mitgliedschaft: "kuendigen" } }),
    {
      faelle: ["F06"], unterlagen: { U18: "nur_wenn", U19: "nur_wenn" }, keineUnterlagen: ["U17"], formulare: ["vollmacht", "abmeldung"],
      unterschriften: [{ formular: "vollmacht", stelleKey: "unterschrift", wer: "sorgeberechtigte" }, { formular: "abmeldung", stelleKey: "unterschrift", wer: "spieler" }, { formular: "abmeldung", stelleKey: "unterschrift_vertreter", wer: "sorgeberechtigte" }],
      hinweise: ["kuendigung_extra", "vollmacht_eingabe_zeitnah"],
    }),

  profilEintrag("vollmacht-mitgliedschaft-unklar", "Vollmacht, Mitgliedschaft im alten Verein unklar", "Junge, D-Jugend: Die Familie weiß nicht, ob sie im alten Verein kündigen will. Das Formular Abmeldung entfällt vorerst.", HEUTE,
    wechselD({ abmeldung: { status: "noch_nicht", datum: null, weg: "vollmacht" }, alterVerein: { mitgliedschaft: "weiss_nicht" } }),
    {
      faelle: ["F06"], unterlagen: { U18: "nur_wenn", U19: "offen" }, keineUnterlagen: ["U17"], formulare: ["vollmacht"], keineFormulare: ["abmeldung"],
      hinweise: ["mitgliedschaft_alter_verein_unklar", "kuendigung_extra"], keineHinweise: ["passiv_alter_verein"],
    }),

  profilEintrag("einschreiben-erledigt-kuendigung-offen", "Schon per Einschreiben abgemeldet, Kündigung noch nicht beantwortet", "Junge, D-Jugend: Die Abmeldung des Spielrechts ist erledigt (Beleg). Ob die Mitgliedschaft enden soll, ist unklar.", HEUTE,
    wechselD({ abmeldung: { status: "einschreiben", datum: "2026-09-10", weg: null }, alterVerein: { mitgliedschaft: null }, letztesSpiel: "2026-09-06", letztesPflichtspiel: "2026-09-06" }),
    {
      faelle: ["F06"], unterlagen: { U17: "pflicht", U19: "offen" }, formulare: ["hfv_antrag"], keineFormulare: ["abmeldung", "vollmacht"],
      nachweis: ["U17"], hinweise: ["mitgliedschaft_alter_verein_unklar"], frist: { basis: "angegeben", abmeldedatum: "2026-09-10", pflichtspieleAb: "2026-12-11" },
    }),

  profilEintrag("f-jugend-wechsel", "Wechsel in der F-Jugend", "Mädchen, 8 Jahre: In der F-Jugend gibt es keine Freigabe und keine Wartefrist.", HEUTE,
    wechselD({ vorname: "Emma", geburtsdatum: "2018-06-06", geschlecht: "w", freigabe: "nein" }),
    {
      faelle: ["F06"], altersklasse: "F", frist: { regel: "R3", pflichtspieleAb: HEUTE, freundschaftsspieleAb: HEUTE, unsicher: false, key: "frist_wechsel_fg" },
      keineUnterlagen: ["U20", "U21", "U22"], keineHinweise: ["juni_wechselzeit", "freigabe_unklar", "nachtraegliche_freigabe"],
    }),

  profilEintrag("d-jugend-juni-ohne-freigabe", "D-Jugend-Wechsel im Juni ohne Freigabe", "Junge, Abmeldung am 10. Juni 2027, alter Verein gibt nicht frei: Pflichtspiele ab 1. November, oder mit Entschädigung.", "2027-06-12",
    wechselD({ abmeldung: { status: "einschreiben", datum: "2027-06-10", weg: null }, freigabe: "nein", letztesSpiel: "2027-06-06", letztesPflichtspiel: "2027-06-06" }),
    {
      faelle: ["F06"], frist: { regel: "R5", pflichtspieleAb: "2027-11-01", freundschaftsspieleAb: "2027-06-12", unsicher: false, key: "frist_wechsel_juni_ohne" },
      unterlagen: { U20: "nur_wenn", U21: "nur_wenn" }, hinweise: ["entschaedigung_hinweis", "nachtraegliche_freigabe"], keineHinweise: ["juni_wechselzeit"],
    }),

  profilEintrag("d-jugend-juni-mit-freigabe", "D-Jugend-Wechsel im Juni mit Freigabe", "Junge, Abmeldung am 3. Juni 2027, alter Verein gibt frei: Pflichtspiele ab 1. Juli.", "2027-06-05",
    wechselD({ abmeldung: { status: "einschreiben", datum: "2027-06-03", weg: null }, freigabe: "ja", letztesSpiel: "2027-05-29", letztesPflichtspiel: "2027-05-29" }),
    { frist: { regel: "R5", pflichtspieleAb: "2027-07-01", freundschaftsspieleAb: "2027-06-05", key: "frist_wechsel_juni_freigabe" }, keineUnterlagen: ["U20", "U21"] }),

  profilEintrag("letztes-pflichtspiel-ueber-6-monate", "Letztes Pflichtspiel vor mehr als 6 Monaten", "Junge, D-Jugend, ohne Freigabe: Die Wartefrist entfällt, weil das letzte Pflichtspiel am 1. März war.", HEUTE,
    wechselD({ freigabe: "nein", letztesSpiel: "2026-03-01", letztesPflichtspiel: "2026-03-01" }),
    {
      frist: { regel: "R5", pflichtspieleAb: HEUTE, unsicher: false, key: "frist_entfaellt", wegfall: true }, unterlagen: { U22: "nur_wenn" }, keineUnterlagen: ["U20", "U21"], keineHinweise: ["nachtraegliche_freigabe", "freigabe_unklar"],
    }),

  profilEintrag("frau-bei-herren", "Frau ab 18 bei den Herren", "Frau, 30 Jahre, neu im Verein, möchte bei den Herren mitspielen (Sonderspielrecht).", HEUTE,
    erwachsen({ vorname: "Sara", geburtsdatum: "1996-01-15", geschlecht: "w", besonderes: { frauHerren: true, maedchenJungenteam: false, herrenAushilfe: false, sonderspielrecht: false } }),
    {
      faelle: ["F10"], mannschaft: { vorhanden: true, namen: ["1. Herrenmannschaft"], hinweisKey: "mannschaft_frau_herren" },
      unterlagen: { U39: "pflicht" }, keineUnterlagen: ["U24", "U23"], hinweise: ["frau_herren", "frau_herren_offen"], weiterleitung: ["spielausschuss:frau_herren"],
      beitrag: { gruppe: "fussball_passiv", jahr: 84 }, schritteMit: ["besonderes"], besonderesOptionen: ["frauHerren"],
    }),

  profilEintrag("rueckkehrer-deutsch-11", "Deutsches Kind kommt aus dem Ausland zurück (11 Jahre)", "Junge, 11 Jahre, deutscher Pass, lebte zuletzt in Spanien, war noch nie in einem Verein: internationales Verfahren.", HEUTE,
    kind({ vorname: "Mateo", geburtsdatum: "2015-05-05", geschlecht: "m", auslandGewohnt: "ja", auslandLand: "ES", auslandStadt: "Musterstadt", wohnen: "gemeinsam" }),
    {
      faelle: ["F05"], keineFaelle: ["F03"], international: true, status: "neu", frist: { regel: "R2", unsicher: true },
      unterlagen: { U12: "offen", U13: "pflicht" }, hinweise: ["zuzug_pruefen", "ausweis_deutsch_original", "international_dauer"], schritteMit: ["wohnen"],
    }),

  profilEintrag("leistungen-bildung-teilhabe", "Familie bezieht Leistungen", "Junge, 9 Jahre: Hinweis auf Bildung und Teilhabe und Beitragserlass.", HEUTE,
    kind({ vorname: "Ali", geburtsdatum: "2017-05-05", geschlecht: "m", leistungen: "ja" }),
    {
      faelle: ["F03"], unterlagen: { U33: "nur_wenn" }, hinweise: ["bildung_teilhabe", "beitragserlass"], weiterleitung: ["geschaeftsstelle:beitragserlass"], schritteMit: ["leistungen"],
    }),

  profilEintrag("senator-karneval", "Senatorenmitgliedschaft im Karneval", "Erwachsener, 55 Jahre, möchte Senator werden. Der Vorstand entscheidet.", HEUTE,
    erwachsen({ vorname: "Georg", geburtsdatum: "1971-04-04", abteilung: "karneval", spielen: null, spielerpass: null, deutsch: null, staaten: [], auslandGewohnt: null,
      karneval: { gruppe: null, tanztWoanders: "nein", turnier: "nein", abendOhneEltern: "nein" }, beitrag: { gruppe: null, familie: [], senator: true, doppel: false } }),
    {
      faelle: ["F01"], unterlagen: { U34: "verein" }, beitrag: { gruppe: "karneval_senator", jahr: 144, monat: null, hinweisKey: "beitrag_senator" },
      hinweise: ["senator_vorstand"], weiterleitung: ["geschaeftsstelle:senator"], keineUnterlagen: ["U30"],
    }),

  profilEintrag("azubi-karneval", "Auszubildende im Karneval", "Erwachsene, 20 Jahre, Beitragsgruppe Auszubildende: Nachweis nötig.", HEUTE,
    erwachsen({ vorname: "Nadine", geburtsdatum: "2006-10-10", geschlecht: "w", abteilung: "karneval", spielen: null, spielerpass: null, deutsch: null, staaten: [], auslandGewohnt: null,
      karneval: { gruppe: "Flying Fruities", tanztWoanders: "nein", turnier: "nein", abendOhneEltern: "nein" }, beitrag: { gruppe: "karneval_azubi", familie: [], senator: false, doppel: false } }),
    {
      faelle: ["F01"], unterlagen: { U03: "verein" }, nachweis: ["U03"], beitrag: { gruppe: "karneval_azubi", jahr: 108, hinweisKey: "beitrag_azubi" }, fehlend: ["U03"],
      hinweise: ["karneval_gruppe_vorschlag"],
    }),

  profilEintrag("doppelmitgliedschaft", "Fußball und Karneval", "Erwachsener, 35 Jahre, in beiden Abteilungen: Der Verein nennt den Beitrag.", HEUTE,
    erwachsen({ vorname: "Sven", geburtsdatum: "1991-07-07", abteilung: "beides", karneval: { gruppe: "Dreamboys", tanztWoanders: "nein", turnier: "nein", abendOhneEltern: "nein" } }),
    {
      faelle: ["F10"], keineFaelle: ["F01"], beitrag: { gruppe: "fussball_erwachsene", jahr: null, monat: null, hinweisKey: "beitrag_doppel" }, hinweise: ["beitrag_doppel", "karneval_kein_attest"],
      weiterleitung: ["geschaeftsstelle:beitrag_doppel", "karneval:gruppe_einteilung"], schritteMit: ["karneval", "spielerpass", "mannschaft"],
    }),

  profilEintrag("kind-nur-training", "Kind nur zum Training", "Junge, 7 Jahre: soll nicht bei Spielen mitmachen, deshalb kein Antrag beim Verband.", HEUTE,
    kind({ vorname: "Finn", geburtsdatum: "2019-11-11", geschlecht: "m", spielen: false, spielerpass: null, deutsch: null, staaten: [], auslandGewohnt: null }),
    {
      faelle: [], keineFaelle: ["F03"], status: null, altersklasse: "F", frist: { key: "frist_kein_spiel", pflichtspieleAb: null },
      keineUnterlagen: ["U07", "U09", "U10", "U16"], keineFormulare: ["hfv_antrag", "attest"], schritteMit: ["mannschaft", "spielen", "sorge", "notfall"], schritteOhne: ["spielerpass", "pass", "ausland", "spielerfoto"],
    }),

  profilEintrag("abmeldung-nur-per-mail", "Abmeldung nur per Mail oder WhatsApp", "Junge, D-Jugend: Die Familie hat dem alten Verein nur geschrieben. Das zählt nicht als Abmeldung.", HEUTE,
    wechselD({ abmeldung: { status: "formlos", datum: null, weg: "einschreiben" } }),
    { faelle: ["F06"], hinweise: ["abmeldung_formlos", "abmeldung_nach_letztem_spiel"], unterlagen: { U17: "pflicht" }, frist: { basis: "heute", abmeldedatum: HEUTE } }),

  profilEintrag("abmeldung-unklar", "Nicht sicher, ob abgemeldet", "Junge, D-Jugend: Die Familie weiß nicht, ob abgemeldet wurde. Der Verein prüft im Verbandssystem.", HEUTE,
    wechselD({ abmeldung: { status: "weiss_nicht", datum: null, weg: "einschreiben" }, freigabe: "weiss_nicht", sperre: "ja", sperreBis: "2026-11-30" }),
    {
      faelle: ["F06"], hinweise: ["abmeldung_unklar", "freigabe_unklar", "sperre_laeuft"], weiterleitung: ["passwesen:abmeldung_unklar"],
      frist: { unsicher: true, key: "frist_freigabe_unklar", pflichtspieleAb: "2027-03-30" },
    }),

  profilEintrag("a-jugend-18-wechsel", "A-Jugend, 18 Jahre, Wechsel (älterer Jahrgang)", "Junge, Jahrgang 2008, 18 Jahre: Für ihn gelten die Regeln der Senioren mit Wechselperioden.", HEUTE,
    kind({ vorname: "Luca", geburtsdatum: "2008-01-10", geschlecht: "m", spielerpass: "ja", alterVerein: { region: "hessen", name: "SV Beispieldorf", ort: "Beispieldorf", land: "DE", verband: "", mitgliedschaft: "kuendigen" },
      abmeldung: { status: "einschreiben", datum: "2026-09-25", weg: null }, freigabe: "ja", letztesSpiel: "2026-09-20", letztesPflichtspiel: "2026-09-20", sorge: null, sorgeberechtigte: [] }),
    {
      faelle: ["F12"], keineFaelle: ["F06", "F13"], altersklasse: "A", frist: { regel: "R7", pflichtspieleAb: "2027-01-01", key: "frist_herren_wp2_zustimmung" },
      hinweise: ["herren_ohne_antrag", "antrag_bis"], beitrag: { gruppe: "fussball_jugend", jahr: 108 }, schritteOhne: ["sorge", "besonderes"],
    }),
];

// Profil nach Kennung (tief kopiert, damit Tests es ändern dürfen)
export function profil(id) {
  const p = PROFILE.find((x) => x.id === id);
  if (!p) throw new Error("Profil unbekannt: " + id);
  return JSON.parse(JSON.stringify(p));
}

export const HEUTE_STANDARD = HEUTE;
export const BAUSTEINE = { kind, erwachsen, wechselD, tief };
