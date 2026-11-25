// Gemeinsame Testbestellungen der Bestellseite (mailtext-test.mjs ohne Browser, e2e.mjs über die Oberfläche).
//
// Die erwarteten Texte stehen hier als feste Zeichenketten, von Hand aus dem Katalog (data/bestellung.json) und der
// Spezifikation nachgerechnet, nicht vom Code erzeugt: Preise, Mengen, Größen, Herstellernummern und Summen sind je Fall
// im Kommentar belegt. Namen und Nummern sind erfunden; Telefonnummern nur aus dem freien Bereich der Bundesnetzagentur.
//
// Jeder Fall: { titel, jetzt (Date, Ortszeit), bestellung (Eingaben wie im Entwurf auf dem Gerät), ui (nur für den Browser-Test:
// welche Schnellwahl je Person zuerst gedrückt wird), betreff, text }.
// Die Antworten zur Bezahlung stehen als Listen von ids (bezahlung.kleidung, bezahlung.teambedarf); in diesen Fällen ist je Block
// genau eine Antwort gewählt, die Mailzeile also „Bezahlung Kleidung: Eltern bzw. Spieler“ wie in der ersten Fassung.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { baueKonfig } from "../../src/seiten/bestellung.mjs";
import { leererEntwurf } from "../../assets/js/bestellung/mailtext.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const lies = (datei) => JSON.parse(readFileSync(path.join(ROOT, "data", datei), "utf8"));

// Dieselbe Konfiguration, die der Bau in die Seite einbettet
export const DATEN = { bestellung: lies("bestellung.json"), teams: lies("teams.json") };
export const KONFIG = baueKonfig(DATEN);

// 25.11.2026 um HH:MM Ortszeit
export const lokal = (stunde, minute) => new Date(2026, 10, 25, stunde, minute);

// Die Artikel der beiden Schnellwahlen, unabhängig von der Datei aufgeschrieben
export const GRUNDAUSSTATTUNG = ["trikot", "shorts", "stutzen", "praesi-jacke", "praesi-hose", "rucksack"];
export const TORWARTSET = ["praesi-jacke", "praesi-hose", "stutzen", "tw-trikot", "tw-hose", "rucksack"];

// Eine Person: artikel = Liste der gewählten Artikel, groessen = abweichende Größen je Artikel
export function person(id, name, nummer, groesse, artikel, groessen = {}, initialen = null) {
  return {
    id,
    name,
    nummer,
    groesse,
    artikel: Object.fromEntries(artikel.map((a) => [a, { groesse: groessen[a] || "" }])),
    initialen,
  };
}

export function bestellung(teil) {
  return { ...leererEntwurf(), ...teil };
}

const ZEILE_TRIKOT_DRUCK =
  "Druck: Vereinswappen einfarbig, Vereinsnamen XL (SPEUZER), Werbeaufdruck M 1C (Sponsorlogo), Zahlen 20-26cm (Rückennummer)";
const ZEILE_JACKE_DRUCK = "Druck: Vereinswappen einfarbig, Initialen / Zahlen 2-5cm, Vereinsnamen XL (SPEUZER), Spielernamen S";
const KOPF = ["Hallo,", "", "hier ist eine neue Bestellung über die Bestellseite für Trainer.", "TEST – Prototyp: Bitte nichts beim Lieferanten bestellen.", ""];
const FUSS = ["", "Viele Grüße"];
const SCHLUSS = ["", "Erstellt mit der Bestellseite für Trainer (Prototyp)."];

// ---------- (a) Referenzbestellung D3 ----------
// Mia (Kind, 140, Nr. 7): Grundausstattung, Präsi-Hose abweichend in 152 = 30 + 10 + 5 + 35 + 20 + 20 = 120 €
// Emil (Kind, 140, Nr. 10): Trikot, Shorts, Stutzen = 30 + 10 + 5 = 45 €
// Ben Kuhn (Erwachsener, M, Nr. 9): Trikot, Regenjacke = 35 + 30 = 65 €   Summe 230 €, 6 + 3 + 2 = 11 Teile
// Stutzen: Kinder › M (Junior). Trikot 140: Mia und Emil = 2 Stück; Druckdaten nach Größe und Nummer (7 vor 10, dann Erwachsene).
export const FALL_A = {
  titel: "Referenzbestellung D3",
  jetzt: lokal(14, 32),
  bestellung: bestellung({
    team: "d3",
    name: "Lena Beispiel",
    tel: "030 23125 123",
    bis: "2027-01-15",
    personen: [
      person("p1", "Mia", "7", "140", GRUNDAUSSTATTUNG, { "praesi-hose": "152" }),
      person("p2", "Emil", "10", "140", ["trikot", "shorts", "stutzen"]),
      person("p3", "Ben Kuhn", "9", "M", ["trikot", "regenjacke"]),
    ],
    zaehler: 3,
    teambedarf: { baelle: { n: 10, details: "Größe 4" }, ballpumpe: { n: 1, details: "" } },
    sonstiges: "Ersatznetz für das kleine Tor",
    bezahlung: { kleidung: ["eltern"], kleidungSponsor: "", teambedarf: ["vereinskasse"], teambedarfSponsor: "" },
    hinweisBezahlung: "Eltern zahlen bar bei mir",
  }),
  ui: { personen: [{ schnellwahl: "grundausstattung" }, {}, {}] },
  betreff: "[TEST] Bestellung D3-Jugend – 11 Teile, Teambedarf (D3-261125-1432)",
  text: [
    ...KOPF,
    "Mannschaft: D3-Jugend",
    "Bestellt von: Lena Beispiel, Tel. 030 23125 123",
    "Gebraucht bis: 15.01.2027",
    "Bezahlung Kleidung: Eltern bzw. Spieler",
    "Bezahlung Teambedarf: Vereinskasse",
    "Hinweis zur Bezahlung: Eltern zahlen bar bei mir",
    "Bestell-Nr.: D3-261125-1432",
    "",
    "== 1. KLEIDUNG FÜR DEN LIEFERANTEN (11Teamsport) ==",
    "Dieser Teil kann so weitergeleitet werden.",
    "",
    "JAKO One T-Shirt Kids Weiß F0 (6101)",
    ZEILE_TRIKOT_DRUCK,
    "- Gr. 140: 2 Stück",
    "",
    "JAKO One T-Shirt Weiß F0 (6101)",
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
    "- Trikot 6101, Gr. 140: Nr. 7",
    "- Trikot 6101, Gr. 140: Nr. 10",
    "- Trikot 6101, Gr. M: Nr. 9",
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
    "Zuordnung je Person (Preise für Eltern bzw. Spieler, Stand 11/26):",
    "- Mia, Nr. 7, Gr. 140: Trikot, Shorts, Stutzen, Präsi-Jacke, Präsi-Hose (Gr. 152), Rucksack = 120 €",
    "- Emil, Nr. 10, Gr. 140: Trikot, Shorts, Stutzen = 45 €",
    "- Ben Kuhn, Nr. 9, Gr. M: Trikot, Regenjacke = 65 €",
    "Summe Kleidung: 230 €",
    ...FUSS,
    "Lena Beispiel",
    ...SCHLUSS,
  ].join("\n"),
};

// ---------- (b) nur Teambedarf ----------
// Kein Teil für den Lieferanten, kein interner Teil: nur „== 2. TEAMBEDARF …“ (die Nummern der Teile sind fest).
// Bestell-Nr. mit Kürzel mit Bindestrich und Uhrzeit mit führender Null: G-JUGEND-261125-0905
export const FALL_B = {
  titel: "nur Teambedarf",
  jetzt: lokal(9, 5),
  bestellung: bestellung({
    team: "g-jugend",
    name: "Karim Beispiel",
    teambedarf: { huetchen: { n: 3, details: "Satz mit 40 Stück" }, trinkflaschen: { n: 1, details: "" } },
    sonstiges: "Zwei Ersatzbälle\nin Größe 3",
    bezahlung: { kleidung: [], kleidungSponsor: "", teambedarf: ["spenden"], teambedarfSponsor: "" },
    hinweis: "Bitte bis zum Turnier",
  }),
  ui: { personen: [] },
  betreff: "[TEST] Bestellung G-Jugend (Bambinis) – Teambedarf (G-JUGEND-261125-0905)",
  text: [
    ...KOPF,
    "Mannschaft: G-Jugend (Bambinis)",
    "Bestellt von: Karim Beispiel",
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
// Jan Hüter (Erwachsener, L, Nr. 1): Stutzen 5 + Präsi-Jacke 40 + Präsi-Hose 20 + Rucksack 20 + TW-Trikot 40 + TW-Hose lang 25 = 150 €
// Stutzen: Erwachsene › L (Senior). TW-Hose Erwachsene: Striker 8936. Nur Kleidung: Teil 1 und Teil 3 (Teil 2 entfällt).
export const FALL_C = {
  titel: "Torwartset Erwachsene",
  jetzt: lokal(18, 7),
  bestellung: bestellung({
    team: "herren",
    name: "Sven Beispiel",
    personen: [person("p1", "Jan Hüter", "1", "L", TORWARTSET)],
    zaehler: 1,
    bezahlung: { kleidung: ["vereinskasse"], kleidungSponsor: "", teambedarf: [], teambedarfSponsor: "" },
  }),
  ui: { personen: [{ schnellwahl: "torwartset" }] },
  betreff: "[TEST] Bestellung 1. Herrenmannschaft – 6 Teile (HERREN-261125-1807)",
  text: [
    ...KOPF,
    "Mannschaft: 1. Herrenmannschaft",
    "Bestellt von: Sven Beispiel",
    "Bezahlung Kleidung: Vereinskasse",
    "Bestell-Nr.: HERREN-261125-1807",
    "",
    "== 1. KLEIDUNG FÜR DEN LIEFERANTEN (11Teamsport) ==",
    "Dieser Teil kann so weitergeleitet werden.",
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
    "Zuordnung je Person (Preise für Eltern bzw. Spieler, Stand 11/26):",
    "- Jan Hüter, Nr. 1, Gr. L: Stutzen, Präsi-Jacke, Präsi-Hose, Rucksack, TW-Trikot, TW-Hose lang = 150 €",
    "Summe Kleidung: 150 €",
    ...FUSS,
    "Sven Beispiel",
    ...SCHLUSS,
  ].join("\n"),
};

export const FAELLE = { a: FALL_A, b: FALL_B, c: FALL_C };
