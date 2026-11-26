// Gemeinsame Testbestellungen der Bestellseite (mailtext-test.mjs ohne Browser, e2e.mjs über die Oberfläche).
//
// Die erwarteten Texte stehen hier als feste Zeichenketten, von Hand aus dem Katalog (data/bestellung.json), den erfundenen Testpreisen
// (testdaten.mjs, Rabatt 40 %) und der Spezifikation nachgerechnet, nicht vom Code erzeugt: Grundpreise, Zuschläge, Stückpreise, Mengen,
// Größen, Herstellernummern und Summen sind je Fall im Kommentar belegt. Namen und Nummern sind erfunden; Telefonnummern nur aus dem freien
// Bereich der Bundesnetzagentur, Mailadressen nur mit der reservierten Endung .example.
//
// Jeder Fall: { titel, jetzt (Date, Ortszeit), bestellung (Eingaben wie im Entwurf auf dem Gerät), ui (nur für den Browser-Test:
// welche Schnellwahl je Person zuerst gedrückt wird), betreff, text }.
// Die Antworten zur Bezahlung stehen als Listen von ids (bezahlung.kleidung, bezahlung.teambedarf), die Angaben zum Sponsor im Block „sponsor“.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { baueKonfig } from "../../src/seiten/bestellung.mjs";
import { leererEntwurf, mitPreisen } from "../../assets/js/bestellung/mailtext.js";
import { TESTCODE, TESTPREISE, kopieTestpreise } from "./testdaten.mjs";

export { TESTCODE, TESTPREISE, kopieTestpreise };

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const lies = (datei) => JSON.parse(readFileSync(path.join(ROOT, "data", datei), "utf8"));

// Dieselben Daten, die der Bau einliest (die Preise sind darin nur das verschlüsselte Paket)
export const DATEN = { bestellung: lies("bestellung.json"), teams: lies("teams.json"), "bestellung-preise.enc": lies("bestellung-preise.enc.json") };
// Die öffentliche Konfiguration (ohne Preise), wie der Bau sie in die Seite einbettet
export const KONFIG_OEFFENTLICH = baueKonfig(DATEN);
// Dazu die erfundenen Testpreise: so rechnet die Seite nach dem Entschlüsseln
export const KONFIG = mitPreisen(KONFIG_OEFFENTLICH, TESTPREISE);

// 25.11.2026 um HH:MM Ortszeit
export const lokal = (stunde, minute) => new Date(2026, 10, 25, stunde, minute);

// Die Artikel der beiden Schnellwahlen, unabhängig von der Datei aufgeschrieben
export const GRUNDAUSSTATTUNG = ["trikot", "shorts", "stutzen", "praesi-jacke", "praesi-hose", "rucksack"];
export const TORWARTSET = ["praesi-jacke", "praesi-hose", "stutzen", "tw-trikot", "tw-hose", "rucksack"];

// Die vorausgewählten Aufdrucke je Artikel (Kürzel in der Reihenfolge der Anzeige), unabhängig von der Datei aufgeschrieben
export const STANDARD = {
  trikot: ["W", "V", "SP", "ZG"],
  shorts: [],
  stutzen: [],
  "praesi-jacke": ["W", "ZK", "V", "N"],
  "praesi-hose": [],
  rucksack: ["W"],
  winterjacke: ["V", "N", "ZK"],
  regenjacke: ["W", "V", "ZK"],
  "tw-trikot": ["W", "V", "SP", "ZG"],
  "tw-hose": [],
};

// Eine Person: artikel = Liste der gewählten Artikel, groessen = abweichende Größen je Artikel, aufdrucke = abweichende Aufdrucke je Artikel
// (sonst die Standard-Aufdrucke). Die Artikel stehen in der Reihenfolge des Katalogs, wie es auch ein geladener Entwurf tut.
export function person(id, name, nummer, groesse, artikel, groessen = {}, initialen = null, aufdrucke = {}) {
  return {
    id,
    name,
    nummer,
    groesse,
    artikel: Object.fromEntries(Object.keys(STANDARD).filter((a) => artikel.includes(a)).map((a) => [a, { groesse: groessen[a] || "", aufdrucke: (aufdrucke[a] || STANDARD[a]).slice() }])),
    initialen,
  };
}

export function bestellung(teil) {
  return { ...leererEntwurf(), ...teil };
}

const ZEILE_TRIKOT_DRUCK =
  "Druck: Vereinswappen einfarbig, Vereinsnamen XL (SPEUZER), Werbeaufdruck M 1C (Sponsorlogo), Zahlen 20-26cm (Rückennummer)";
const ZEILE_TRIKOT_DRUCK_OHNE_SP = "Druck: Vereinswappen einfarbig, Vereinsnamen XL (SPEUZER), Zahlen 20-26cm (Rückennummer)";
const ZEILE_JACKE_DRUCK = "Druck: Vereinswappen einfarbig, Initialen / Zahlen 2-5cm, Vereinsnamen XL (SPEUZER), Spielernamen S";
const KOPF = ["Hallo,", "", "hier ist eine neue Bestellung über die Bestellseite für Trainer.", "TEST – Prototyp: Bitte nichts beim Lieferanten bestellen.", ""];
const FUSS = ["", "Viele Grüße"];
const SCHLUSS = ["", "Erstellt mit der Bestellseite für Trainer (Prototyp)."];

// Testpreise (Rabatt 40 %, Zuschläge W 1,05 · V 2,15 · SP 2,95 · ZG 2,45 · N 1,55 · ZK 1,25), von Hand gerechnet:
//   Grundpreis = Listenpreis × 0,6 auf Cent gerundet
//     Trikot Kinder 21,90 › 13,14, Erwachsene 25,40 › 15,24 · Shorts 17,30 › 10,38 / 19,80 › 11,88 · Stutzen 6,70 › 4,02 / 7,90 › 4,74
//     Präsi-Jacke 38,40 › 23,04 / 44,90 › 26,94 · Präsi-Hose 29,98 › 17,988 = 17,99 (aufgerundet) / 33,70 › 20,22 · Rucksack 23,60 › 14,16
//     Winterjacke 58,30 › 34,98 / 68,10 › 40,86 · TW-Trikot 34,70 › 20,82 / 37,20 › 22,32 · TW-Hose 27,99 › 16,794 = 16,79 (abgerundet) / 31,60 › 18,96
//   Aufdrucke je Stück: Trikot und TW-Trikot Standard W+V+SP+ZG = 8,60 (ohne SP 5,65) · Präsi-Jacke W+ZK+V+N = 6,00 · Rucksack W = 1,05 ·
//   Winterjacke V+N+ZK = 4,95 · Regenjacke ohne Listenpreis (Preis auf Anfrage)

// ---------- (a) Referenzbestellung D3 ----------
// Mia (Kind, 140, Nr. 7): Grundausstattung, Präsi-Hose abweichend in 152, alles mit Standard-Aufdrucken
//   Trikot 13,14 + 8,60 = 21,74 · Shorts 10,38 · Stutzen (M Junior) 4,02 · Präsi-Jacke 23,04 + 6,00 = 29,04 · Präsi-Hose 17,99 · Rucksack 14,16 + 1,05 = 15,21
//   Summe 98,38 €, 6 Teile
// Emil (Kind, 140, Nr. 10): Trikot ohne Sponsorlogo (13,14 + 1,05 + 2,15 + 2,45 = 18,79), Shorts 10,38, Stutzen 4,02 = 33,19 €, 3 Teile
// Ben Kuhn (Erwachsener, M, Nr. 9): Trikot 15,24 + 8,60 = 23,84, Regenjacke (Preis auf Anfrage) = 23,84 € ohne Regenjacke, 2 Teile
// Summe 98,38 + 33,19 + 23,84 = 155,41 € (ohne Regenjacke), 6 + 3 + 2 = 11 Teile
// Sponsorlogo: Mia und Ben (Emils Trikot trägt es nicht) = 2 Stück × 2,95 = 5,90 €
// Trikot 140: zwei Blöcke (mit Sponsorlogo zuerst: mehr Aufdrucke), Shorts 140: Mia und Emil = 2 Stück, Stutzen Kinder › M (Junior).
// Druckdaten nach Größe und Nummer (7 vor 10, dann Erwachsene); Lieferanschrift auf den Namen des Bestellers (lieferName null).
export const FALL_A = {
  titel: "Referenzbestellung D3",
  jetzt: lokal(14, 32),
  bestellung: bestellung({
    team: "d3",
    name: "Lena Beispiel",
    tel: "030 23125 123",
    bis: "2027-01-15",
    lieferName: null,
    lieferStrasse: "Beispielweg 12",
    lieferOrt: "60439 Frankfurt",
    personen: [
      person("p1", "Mia", "7", "140", GRUNDAUSSTATTUNG, { "praesi-hose": "152" }),
      person("p2", "Emil", "10", "140", ["trikot", "shorts", "stutzen"], {}, null, { trikot: ["W", "V", "ZG"] }),
      person("p3", "Ben Kuhn", "9", "M", ["trikot", "regenjacke"]),
    ],
    zaehler: 3,
    teambedarf: { baelle: { n: 10, details: "Größe 4" }, ballpumpe: { n: 1, details: "" } },
    sonstiges: "Ersatznetz für das kleine Tor",
    bezahlung: { kleidung: ["eltern", "sponsor"], teambedarf: ["vereinskasse"] },
    sponsor: {
      firma: "Autohaus Beispiel",
      ansprechpartner: "Frau Beispiel",
      email: "info@autohaus-beispiel.example",
      telefon: "030 23125 456",
      anschrift: "Beispielstraße 5\n60439 Frankfurt",
    },
    hinweisBezahlung: "Eltern zahlen bar bei mir",
  }),
  ui: { personen: [{ schnellwahl: "grundausstattung" }, {}, {}] },
  betreff: "[TEST] Bestellung D3-Jugend – 11 Teile, Teambedarf (D3-261125-1432)",
  text: [
    ...KOPF,
    "Mannschaft: D3-Jugend",
    "Bestellt von: Lena Beispiel, Tel. 030 23125 123",
    "Lieferung an: Lena Beispiel, Beispielweg 12, 60439 Frankfurt",
    "Gebraucht bis: 15.01.2027",
    "Bezahlung Kleidung: Eltern bzw. Spieler und Sponsor (Autohaus Beispiel)",
    "Bezahlung Teambedarf: Vereinskasse",
    "Hinweis zur Bezahlung: Eltern zahlen bar bei mir",
    "Bestell-Nr.: D3-261125-1432",
    "",
    "== 1. KLEIDUNG FÜR DEN LIEFERANTEN (11Teamsport) ==",
    "Dieser Teil kann so weitergeleitet werden.",
    "",
    "Lieferanschrift:",
    "Lena Beispiel",
    "Beispielweg 12",
    "60439 Frankfurt",
    "",
    "JAKO Team Trikot kurzarm Kids Weiß F00 (4233)",
    ZEILE_TRIKOT_DRUCK,
    "- Gr. 140: 1 Stück",
    "",
    "JAKO Team Trikot kurzarm Kids Weiß F00 (4233)",
    ZEILE_TRIKOT_DRUCK_OHNE_SP,
    "- Gr. 140: 1 Stück",
    "",
    "JAKO Team Trikot kurzarm Weiß F00 (4233)",
    ZEILE_TRIKOT_DRUCK,
    "- Gr. M: 1 Stück",
    "",
    "JAKO One Trainingshose Kids Blau F400 (4420)",
    "- Gr. 140: 2 Stück",
    "",
    "JAKO Tube Stutzen Blau F04 (3401)",
    "- Gr. M (Junior): 2 Stück",
    "",
    "JAKO One Trainingsjacke Kids Blau F400 (9300)",
    ZEILE_JACKE_DRUCK,
    "- Gr. 140: 1 Stück",
    "",
    "JAKO One Trainingshose Kids Schwarz F880 (9200)",
    "- Gr. 152: 1 Stück",
    "",
    "JAKO Striker Rucksack Blau F04 (1816)",
    "Druck: Vereinswappen einfarbig",
    "- Einheitsgröße: 1 Stück",
    "",
    "JAKO Rainzip Team Royal F400 (Regenjacke, nicht im Angebot) (7302)",
    "Druck: Vereinswappen einfarbig, Vereinsnamen XL (SPEUZER), Initialen / Zahlen 2-5cm",
    "- Gr. M: 1 Stück",
    "",
    "Druckdaten je Stück:",
    "- Trikot 4233, Gr. 140: Nr. 7",
    "- Trikot 4233, Gr. 140: Nr. 10",
    "- Trikot 4233, Gr. M: Nr. 9",
    "- Präsi-Jacke 9300, Gr. 140: Name „Mia“, Nr. 7",
    "- Regenjacke 7302, Gr. M: Initialen „BK“",
    "",
    "Summe: 11 Teile",
    "",
    "== 2. TEAMBEDARF (Preis bitte beim Lieferanten erfragen) ==",
    "- 10 × Bälle: Größe 4",
    "- 1 × Ballpumpe",
    "- Sonstiges: Ersatznetz für das kleine Tor",
    "",
    "== 3. NUR INTERN – NICHT WEITERLEITEN ==",
    "Sponsor (für die Geschäftsstelle):",
    "Firma: Autohaus Beispiel",
    "Ansprechpartner: Frau Beispiel",
    "E-Mail: info@autohaus-beispiel.example",
    "Telefon: 030 23125 456",
    "Anschrift: Beispielstraße 5",
    "  60439 Frankfurt",
    "Sponsorlogo: 2 Stück × 2,95 € = 5,90 €",
    "",
    "Zuordnung je Person (Preise laut Angebot 11Teamsport vom 24.11.2026):",
    "- Mia, Nr. 7, Gr. 140: Trikot 21,74 €, Shorts 10,38 €, Stutzen 4,02 €, Präsi-Jacke 29,04 €, Präsi-Hose (Gr. 152) 17,99 €, Rucksack 15,21 € = 98,38 €",
    "- Emil, Nr. 10, Gr. 140: Trikot 18,79 €, Shorts 10,38 €, Stutzen 4,02 € = 33,19 €",
    "- Ben Kuhn, Nr. 9, Gr. M: Trikot 23,84 €, Regenjacke (Preis auf Anfrage) = 23,84 € (ohne Regenjacke, Preis auf Anfrage)",
    "Summe Kleidung: 155,41 € (ohne Regenjacke, Preis auf Anfrage)",
    ...FUSS,
    "Lena Beispiel",
    ...SCHLUSS,
  ].join("\n"),
};

// ---------- (b) nur Teambedarf ----------
// Kein Teil für den Lieferanten, kein interner Teil (kein Sponsor): nur „== 2. TEAMBEDARF …“ (die Nummern der Teile sind fest).
// Die Lieferanschrift steht trotzdem im Kopf, hier mit eigenem Namen (lieferName) und einem Ort aus mehreren Wörtern.
// Bestell-Nr. mit Kürzel mit Bindestrich und Uhrzeit mit führender Null: G-JUGEND-261125-0905
export const FALL_B = {
  titel: "nur Teambedarf",
  jetzt: lokal(9, 5),
  bestellung: bestellung({
    team: "g-jugend",
    name: "Karim Beispiel",
    lieferName: "Platzwart Beispiel",
    lieferStrasse: "Beispielgasse 3",
    lieferOrt: "60311 Frankfurt am Main",
    teambedarf: { huetchen: { n: 3, details: "Satz mit 40 Stück" }, trinkflaschen: { n: 1, details: "" } },
    sonstiges: "Zwei Ersatzbälle\nin Größe 3",
    bezahlung: { kleidung: [], teambedarf: ["spenden"] },
    hinweis: "Bitte bis zum Turnier",
  }),
  ui: { personen: [] },
  betreff: "[TEST] Bestellung G-Jugend (Bambinis) – Teambedarf (G-JUGEND-261125-0905)",
  text: [
    ...KOPF,
    "Mannschaft: G-Jugend (Bambinis)",
    "Bestellt von: Karim Beispiel",
    "Lieferung an: Platzwart Beispiel, Beispielgasse 3, 60311 Frankfurt am Main",
    "Bezahlung Teambedarf: Spenden / Mannschaftskasse",
    "Hinweis: Bitte bis zum Turnier",
    "Bestell-Nr.: G-JUGEND-261125-0905",
    "",
    "== 2. TEAMBEDARF (Preis bitte beim Lieferanten erfragen) ==",
    "- 3 × Hütchen / Markierungsteller: Satz mit 40 Stück",
    "- 1 × Trinkflaschen",
    "- Sonstiges: Zwei Ersatzbälle",
    "  in Größe 3",
    ...FUSS,
    "Karim Beispiel",
    ...SCHLUSS,
  ].join("\n"),
};

// ---------- (c) Torwartset in Erwachsenengröße ----------
// Jan Hüter (Erwachsener, L, Nr. 1), Erwachsenenpreise mit Standard-Aufdrucken:
//   Stutzen (L Senior) 4,74 · Präsi-Jacke 26,94 + 6,00 = 32,94 · Präsi-Hose 20,22 · Rucksack 14,16 + 1,05 = 15,21 · TW-Trikot 22,32 + 8,60 = 30,92 · TW-Hose lang 18,96
//   Summe 4,74 + 32,94 + 20,22 + 15,21 + 30,92 + 18,96 = 122,99 €
// Stutzen: Erwachsene › L (Senior). TW-Hose Erwachsene: Striker 8936. Nur Kleidung: Teil 1 und Teil 3 (Teil 2 entfällt).
// Das Torwarttrikot trägt das Sponsorlogo: Der Block „Sponsor“ erscheint, obwohl „Sponsor“ bei der Bezahlung nicht angehakt ist; nur die Firma
// ist eingetragen (die übrigen Zeilen entfallen), das Sponsorlogo zählt 1 Stück × 2,95 = 2,95 €.
export const FALL_C = {
  titel: "Torwartset Erwachsene",
  jetzt: lokal(18, 7),
  bestellung: bestellung({
    team: "herren",
    name: "Sven Beispiel",
    lieferStrasse: "Sportplatzweg 1",
    lieferOrt: "60385 Frankfurt",
    personen: [person("p1", "Jan Hüter", "1", "L", TORWARTSET)],
    zaehler: 1,
    bezahlung: { kleidung: ["vereinskasse"], teambedarf: [] },
    sponsor: { firma: "Bäckerei Beispiel", ansprechpartner: "", email: "", telefon: "", anschrift: "" },
  }),
  ui: { personen: [{ schnellwahl: "torwartset" }] },
  betreff: "[TEST] Bestellung 1. Herrenmannschaft – 6 Teile (HERREN-261125-1807)",
  text: [
    ...KOPF,
    "Mannschaft: 1. Herrenmannschaft",
    "Bestellt von: Sven Beispiel",
    "Lieferung an: Sven Beispiel, Sportplatzweg 1, 60385 Frankfurt",
    "Bezahlung Kleidung: Vereinskasse",
    "Bestell-Nr.: HERREN-261125-1807",
    "",
    "== 1. KLEIDUNG FÜR DEN LIEFERANTEN (11Teamsport) ==",
    "Dieser Teil kann so weitergeleitet werden.",
    "",
    "Lieferanschrift:",
    "Sven Beispiel",
    "Sportplatzweg 1",
    "60385 Frankfurt",
    "",
    "JAKO Tube Stutzen Blau F04 (3401)",
    "- Gr. L (Senior): 1 Stück",
    "",
    "JAKO One Trainingsjacke Blau F400 (9300)",
    ZEILE_JACKE_DRUCK,
    "- Gr. L: 1 Stück",
    "",
    "JAKO One Trainingshose Schwarz, NORMALE Länge (nicht Kurzgröße 9200S) (9200)",
    "- Gr. L: 1 Stück",
    "",
    "JAKO Striker Rucksack Blau F04 (1816)",
    "Druck: Vereinswappen einfarbig",
    "- Einheitsgröße: 1 Stück",
    "",
    "JAKO Power Torwarttrikot Rot F100 (8923)",
    ZEILE_TRIKOT_DRUCK,
    "- Gr. L: 1 Stück",
    "",
    "JAKO Striker Torwarthose Schwarz F08 (8936)",
    "- Gr. L: 1 Stück",
    "",
    "Druckdaten je Stück:",
    "- Präsi-Jacke 9300, Gr. L: Name „Jan Hüter“, Nr. 1",
    "- TW-Trikot 8923, Gr. L: Nr. 1",
    "",
    "Summe: 6 Teile",
    "",
    "== 3. NUR INTERN – NICHT WEITERLEITEN ==",
    "Sponsor (für die Geschäftsstelle):",
    "Firma: Bäckerei Beispiel",
    "Sponsorlogo: 1 Stück × 2,95 € = 2,95 €",
    "",
    "Zuordnung je Person (Preise laut Angebot 11Teamsport vom 24.11.2026):",
    "- Jan Hüter, Nr. 1, Gr. L: Stutzen 4,74 €, Präsi-Jacke 32,94 €, Präsi-Hose 20,22 €, Rucksack 15,21 €, TW-Trikot 30,92 €, TW-Hose lang 18,96 € = 122,99 €",
    "Summe Kleidung: 122,99 €",
    ...FUSS,
    "Sven Beispiel",
    ...SCHLUSS,
  ].join("\n"),
};

export const FAELLE = { a: FALL_A, b: FALL_B, c: FALL_C };
