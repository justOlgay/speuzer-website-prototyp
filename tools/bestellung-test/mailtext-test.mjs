#!/usr/bin/env node
// Tests der reinen Funktionen der Bestellseite (assets/js/bestellung/mailtext.js), ohne Browser.
//
// Geprüft wird (Nummern wie im Arbeitspaket AP-1, Kriterium 5):
//   (a) Referenzbestellung D3 (zwei Kinder, eine erwachsene Person, Teambedarf): Betreff und kompletter Text Zeichen für Zeichen
//   (b) nur Teambedarf   (c) Torwartset in Erwachsenengröße (150 €, Erwachsenen-Bezeichnungen, Nr. 8936 bei der TW-Hose)
//   (d) 116 + Winterjacke › Lieferant „Gr. 128“   (e) Regenjacke mit Initialen in den Druckdaten   (f) Bezahlung „Sponsor“ mit Name
//   (g) pruefmodus false: kein [TEST], keine Testzeile   (h) mailto-Hin- und Rückweg, Zeilenumbrüche \r\n
//   (i) Lückenliste (Mannschaft, Name, Nummer, Initialen, Bezahlung, Sponsorname)   (j) Bestell-Nr. aus fester Uhrzeit
// dazu der Katalog gegen die Spezifikation (Preise, Bezeichnungen, Druck, Größen, Schnellwahl), Formatierung, Sortierung,
// Entwurf auf dem Gerät (bereinigeEntwurf), lange Bestellungen (nie gekürzt) und das Gerüst der Seite (src/seiten/bestellung.mjs).
//
// Aufruf: node tools/bestellung-test/mailtext-test.mjs [--ausfuehrlich]
// Ausgabe: eine Zeile je Fehler, am Ende die Zusammenfassung; Exit 0 nur, wenn alles bestanden ist.

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  FEHLT,
  GRENZEN,
  MAILTO_LAENGE_MAX,
  SCHLUSSZEILE,
  artikelGroesse,
  baueMail,
  bereinigeEntwurf,
  bestellNr,
  datumDe,
  effektiveInitialen,
  formatEuro,
  ganzzahl,
  initialenVorschlag,
  katalogVon,
  kopierText,
  leererEntwurf,
  mailtoLink,
  mehrzeilig,
  einzeilig,
  preisCent,
  preisText,
  pruefeBestellung,
  pruefeKonfig,
  pruefeNummer,
  schnellwahlAnwenden,
  vorauswahlGroesse,
  vorauswahlHinweis,
  waehleBestellNr,
  zahlwort,
  zusammenfassung,
} from "../../assets/js/bestellung/mailtext.js";
import { seite } from "../../src/seiten/bestellung.mjs";
import { DATEN, FAELLE, FALL_A, GRUNDAUSSTATTUNG, KONFIG, TORWARTSET, bestellung, lokal, person } from "./faelle.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const AUSFUEHRLICH = process.argv.includes("--ausfuehrlich");

// ---------- kleines Prüfgerüst ----------

let anzahl = 0;
const fehler = [];

function pruefe(name, bedingung, detail = "") {
  anzahl += 1;
  if (bedingung) {
    if (AUSFUEHRLICH) console.log("  ok      " + name);
    return;
  }
  fehler.push(name);
  console.log("  FEHLER  " + name + (detail ? "\n          " + detail : ""));
}

// Erste abweichende Zeile zweier Texte (mit sichtbaren Zeilenenden, damit auch Leerzeichen am Ende auffallen)
function ersteAbweichung(ist, soll) {
  const a = String(ist).split("\n");
  const b = String(soll).split("\n");
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] !== b[i]) return `Zeile ${i + 1}:\n          ist  «${a[i] === undefined ? "(fehlt)" : a[i]}»\n          soll «${b[i] === undefined ? "(fehlt)" : b[i]}»`;
  }
  return "";
}

function gleich(name, ist, soll) {
  pruefe(name, ist === soll, typeof ist === "string" && typeof soll === "string" ? ersteAbweichung(ist, soll) : `ist ${JSON.stringify(ist)}, soll ${JSON.stringify(soll)}`);
}

function gleichJson(name, ist, soll) {
  const a = JSON.stringify(ist);
  const b = JSON.stringify(soll);
  pruefe(name, a === b, `ist ${a}, soll ${b}`);
}

function wirft(name, funktion, teilText) {
  let meldung = null;
  try {
    funktion();
  } catch (e) {
    meldung = String(e && e.message);
  }
  pruefe(name, meldung !== null && meldung.includes(teilText), `Meldung: ${meldung}`);
}

function abschnitt(titel) {
  if (AUSFUEHRLICH) console.log("\n" + titel);
}

const zeilen = (text) => text.split("\n");
const mail = (b, jetzt = lokal(12, 0), konfig = KONFIG) => baueMail(konfig, b, jetzt);
const live = { ...KONFIG, einstellungen: { ...KONFIG.einstellungen, pruefmodus: false } };

// Ein kleiner Auftrag für gezielte Prüfungen
function klein(teil) {
  return bestellung({
    team: "e2",
    name: "Tina Beispiel",
    bezahlung: { kleidung: "eltern", kleidungSponsor: "", teambedarf: "", teambedarfSponsor: "" },
    ...teil,
  });
}

// ---------- Katalog gegen die Spezifikation ----------

abschnitt("Katalog");
{
  const k = katalogVon(KONFIG);
  gleichJson("Artikel in Katalogreihenfolge", k.artikel.map((a) => a.id), ["trikot", "shorts", "stutzen", "praesi-jacke", "praesi-hose", "rucksack", "winterjacke", "regenjacke", "tw-trikot", "tw-hose"]);
  gleichJson("Größen Kinder", KONFIG.groessen.kinder, ["116", "128", "140", "152", "164"]);
  gleichJson("Größen Erwachsene", KONFIG.groessen.erwachsene, ["S", "M", "L", "XL", "XXL", "3XL"]);
  gleichJson("zwölf Mannschaften in der Reihenfolge von data/teams.json", KONFIG.mannschaften.map((m) => m.slug), ["herren", "soma", "a-jugend", "d1", "d2", "d3", "e1", "e2", "e3", "f1", "f2", "g-jugend"]);
  gleich("Mannschaft: angezeigt wird der Name", KONFIG.mannschaften.find((m) => m.slug === "d3").name, "D3-Jugend");
  gleichJson("Einstellungen", KONFIG.einstellungen, { empfaenger: "Bestellungen@sportfreunde04.de", pruefmodus: true, preisstand: "11/26", lieferant: "11Teamsport" });
  gleich("Stand der Daten", KONFIG.stand, "2026-11-25");

  // Preise Kinder / Erwachsene in Euro, wie in der Spezifikation (Größe 140 = Kind, M = Erwachsener)
  const preise = {
    trikot: [30, 35], shorts: [10, 10], stutzen: [5, 5], "praesi-jacke": [35, 40], "praesi-hose": [20, 20], rucksack: [20, 20],
    winterjacke: [65, 65], regenjacke: [30, 30], "tw-trikot": [40, 40], "tw-hose": [25, 25],
  };
  for (const [id, [kind, erw]] of Object.entries(preise)) {
    const kindGroesse = id === "stutzen" ? "M (Junior)" : id === "rucksack" ? "Einheitsgröße" : "140";
    const erwGroesse = id === "stutzen" ? "L (Senior)" : id === "rucksack" ? "Einheitsgröße" : "M";
    gleich(`Preis ${id} Kinder`, String(preisCent(KONFIG, id, kindGroesse)), String(kind * 100));
    gleich(`Preis ${id} Erwachsene`, String(preisCent(KONFIG, id, erwGroesse)), String(erw * 100));
  }
  gleich("Preis Stutzen S (Bambini)", String(preisCent(KONFIG, "stutzen", "S (Bambini)")), "500");
  pruefe("Preis ohne Größe ist null", preisCent(KONFIG, "trikot", "") === null && preisCent(KONFIG, "trikot", "999") === null);
  gleich("Preisanzeige ohne Größe: verschiedene Preise", preisText(KONFIG, "trikot", ""), "ab 30 €");
  gleich("Preisanzeige ohne Größe: gleicher Preis", preisText(KONFIG, "shorts", ""), "10 €");
  gleich("Preisanzeige mit Größe", preisText(KONFIG, "trikot", "M"), "35 €");

  // Angebotsbezeichnung (Herstellernummer) je Artikel, Kinder / Erwachsene, wörtlich aus der Spezifikation
  const lieferant = {
    trikot: ["JAKO One T-Shirt Kids Weiß F0 (6101)", "JAKO One T-Shirt Weiß F0 (6101)"],
    shorts: ["JAKO One Trainingshose Kids Blau F400 (4420)", "JAKO One Trainingshose Blau F400 (4420)"],
    stutzen: ["JAKO Tube Stutzen Blau F04 (3401)", "JAKO Tube Stutzen Blau F04 (3401)"],
    "praesi-jacke": ["JAKO One Trainingsjacke Kids Blau F400 (9300)", "JAKO One Trainingsjacke Blau F400 (9300)"],
    "praesi-hose": ["JAKO One Trainingshose Kids Schwarz F880 (9200)", "JAKO One Trainingshose Schwarz, NORMALE Länge (nicht Kurzgröße 9200S) (9200)"],
    rucksack: ["JAKO Striker Rucksack Blau F04 (1816)", "JAKO Striker Rucksack Blau F04 (1816)"],
    winterjacke: ["JAKO Team Coach Kapuzenjacke Kids Blau F400 (7103)", "JAKO Team Coach Kapuzenjacke Blau F400 (7103)"],
    regenjacke: ["JAKO Rainzip Team Royal F400 (Regenjacke, nicht im Angebot) (7302)", "JAKO Rainzip Team Royal F400 (Regenjacke, nicht im Angebot) (7302)"],
    "tw-trikot": ["JAKO Power Torwarttrikot Kids Rot F100 (8923)", "JAKO Power Torwarttrikot Rot F100 (8923)"],
    "tw-hose": ["JAKO Inter Torwarthose Kids Schwarz F08 (ISP8936)", "JAKO Striker Torwarthose Schwarz F08 (8936)"],
  };
  const gruppeLieferant = (a, gruppe) => a.lieferant.find((v) => v.fuer === gruppe || v.fuer === "alle");
  for (const a of k.artikel) {
    const [kind, erw] = lieferant[a.id];
    const v1 = gruppeLieferant(a, "kinder");
    const v2 = gruppeLieferant(a, "erwachsene");
    gleich(`Bezeichnung ${a.id} Kinder`, `${v1.bezeichnung} (${v1.nr})`, kind);
    gleich(`Bezeichnung ${a.id} Erwachsene`, `${v2.bezeichnung} (${v2.nr})`, erw);
  }
  for (const id of ["stutzen", "rucksack", "regenjacke"]) {
    pruefe(`${id}: eine Bezeichnung für alle Größen`, k.nachId.get(id).lieferant.length === 1 && k.nachId.get(id).lieferant[0].fuer === "alle");
  }

  // Veredelungen und Einzeldruck je Artikel
  const W = "Vereinswappen einfarbig";
  const V = "Vereinsnamen XL (SPEUZER)";
  const SP = "Werbeaufdruck M 1C (Sponsorlogo)";
  const ZG = "Zahlen 20-26cm (Rückennummer)";
  const ZK = "Initialen / Zahlen 2-5cm";
  const N = "Spielernamen S";
  const druck = {
    trikot: [[W, V, SP, ZG], "nummer"], shorts: [[], null], stutzen: [[], null], "praesi-jacke": [[W, ZK, V, N], "name-nummer"], "praesi-hose": [[], null],
    rucksack: [[W], null], winterjacke: [[V, N, ZK], "name-nummer"], regenjacke: [[W, V, ZK], "initialen"], "tw-trikot": [[W, V, SP, ZG], "nummer"], "tw-hose": [[], null],
  };
  for (const a of k.artikel) {
    gleichJson(`Druck ${a.id}`, a.druck, druck[a.id][0]);
    gleich(`Einzeldruck ${a.id}`, String(a.einzeldruck), String(druck[a.id][1]));
  }

  // Größen je Artikel
  gleichJson("Stutzen: Größen", k.nachId.get("stutzen").groessen.map((g) => g.wert), ["S (Bambini)", "M (Junior)", "L (Senior)"]);
  gleichJson("Rucksack: Einheitsgröße", k.nachId.get("rucksack").groessen.map((g) => g.wert), ["Einheitsgröße"]);
  gleichJson("Winterjacke: Kinder ab 128", k.nachId.get("winterjacke").groessen.map((g) => g.wert), ["128", "140", "152", "164", "S", "M", "L", "XL", "XXL", "3XL"]);
  gleichJson("Trikot: alle Größen", k.nachId.get("trikot").groessen.map((g) => g.wert), ["116", "128", "140", "152", "164", "S", "M", "L", "XL", "XXL", "3XL"]);
  gleichJson("Beschreibung Trikot für Trainer", [k.nachId.get("trikot").beschreibung, k.nachId.get("tw-trikot").beschreibung], ["JAKO T-Shirt One, weiß", "JAKO Torwarttrikot Power, rot"]);

  // Schnellwahl: Inhalt und Summen (Kinder 120 / 130, Torwartset 145 / 150)
  const set = (id) => KONFIG.schnellwahl.find((s) => s.id === id);
  gleichJson("Schnellwahl Grundausstattung", [...set("grundausstattung").artikel].sort(), [...GRUNDAUSSTATTUNG].sort());
  gleichJson("Schnellwahl Torwartset", [...set("torwartset").artikel].sort(), [...TORWARTSET].sort());
  gleich("Titel der Schnellwahlen", KONFIG.schnellwahl.map((s) => s.titel).join("|"), "Grundausstattung|Torwartset");
  const summeSet = (id, groesse) => {
    const p = schnellwahlAnwenden(KONFIG, person("p1", "X", "1", groesse, []), id);
    return zusammenfassung(KONFIG, klein({ personen: [p] })).summeCent;
  };
  gleich("Grundausstattung Kinder 120 €", formatEuro(summeSet("grundausstattung", "140")), "120 €");
  gleich("Grundausstattung Erwachsene 130 €", formatEuro(summeSet("grundausstattung", "M")), "130 €");
  gleich("Torwartset Kinder 145 €", formatEuro(summeSet("torwartset", "140")), "145 €");
  gleich("Torwartset Erwachsene 150 €", formatEuro(summeSet("torwartset", "M")), "150 €");
  {
    const p = person("p1", "X", "1", "140", ["winterjacke"]);
    schnellwahlAnwenden(KONFIG, p, "grundausstattung");
    pruefe("Schnellwahl schaltet nur ein, nichts wird abgewählt", Object.keys(p.artikel).length === 7 && !!p.artikel.winterjacke);
    schnellwahlAnwenden(KONFIG, p, "gibt-es-nicht");
    pruefe("unbekannte Schnellwahl ändert nichts", Object.keys(p.artikel).length === 7);
  }

  // Teambedarf, Bezahlung
  gleichJson("Teambedarf", KONFIG.teambedarf.map((t) => [t.id, t.anzeige, t.platzhalter]), [
    ["baelle", "Bälle", "z. B. Größe 4"], ["leibchen", "Leibchen", "z. B. Farbe, Kinder oder Erwachsene"], ["huetchen", "Hütchen / Markierungsteller", "z. B. Satz mit 40 Stück"],
    ["ballnetz", "Ballnetz / Balltasche", ""], ["ballpumpe", "Ballpumpe", ""], ["erste-hilfe", "Erste-Hilfe-Material", "z. B. Kühlspray, Tape"], ["trinkflaschen", "Trinkflaschen", ""],
  ]);
  gleichJson("Bezahlung", KONFIG.bezahlung.map((b) => [b.id, b.text, !!b.mitName]), [["eltern", "Eltern bzw. Spieler", false], ["vereinskasse", "Vereinskasse", false], ["sponsor", "Sponsor", true], ["spenden", "Spenden / Mannschaftskasse", false]]);

  // Vorauswahl der Größen
  gleich("Vorauswahl Trikot = Größe der Person", vorauswahlGroesse(KONFIG, "trikot", "152"), "152");
  gleich("Vorauswahl Stutzen Kind = M (Junior)", vorauswahlGroesse(KONFIG, "stutzen", "164"), "M (Junior)");
  gleich("Vorauswahl Stutzen Erwachsener = L (Senior)", vorauswahlGroesse(KONFIG, "stutzen", "S"), "L (Senior)");
  gleich("Vorauswahl Rucksack = Einheitsgröße", vorauswahlGroesse(KONFIG, "rucksack", "116"), "Einheitsgröße");
  gleich("Vorauswahl Rucksack auch ohne Größe der Person", vorauswahlGroesse(KONFIG, "rucksack", ""), "Einheitsgröße");
  gleich("Vorauswahl Winterjacke 116 = 128", vorauswahlGroesse(KONFIG, "winterjacke", "116"), "128");
  gleich("Vorauswahl Winterjacke 140 = 140", vorauswahlGroesse(KONFIG, "winterjacke", "140"), "140");
  gleich("Vorauswahl ohne Größe der Person ist leer", vorauswahlGroesse(KONFIG, "trikot", ""), "");
  gleich("Hinweis Winterjacke bei 116", vorauswahlHinweis(KONFIG, "winterjacke", "116"), "Winterjacke gibt es für Kinder erst ab 128");
  gleich("kein Hinweis bei 128", vorauswahlHinweis(KONFIG, "winterjacke", "128"), "");
  gleich("kein Hinweis beim Trikot", vorauswahlHinweis(KONFIG, "trikot", "116"), "");
  gleich("eigene Wahl gilt vor der Vorauswahl", artikelGroesse(KONFIG, person("p1", "X", "1", "140", ["shorts"], { shorts: "152" }), "shorts"), "152");
  gleich("ungültige eigene Wahl fällt auf die Vorauswahl zurück", artikelGroesse(KONFIG, person("p1", "X", "1", "140", ["winterjacke"], { winterjacke: "116" }), "winterjacke"), "140");

  // Fehler in der Datei brechen den Bau ab
  const kaputt = (aendere) => {
    const kopie = JSON.parse(JSON.stringify(KONFIG));
    aendere(kopie);
    return kopie;
  };
  wirft("Konfiguration: fehlender Preis", () => pruefeKonfig(kaputt((c) => (c.artikel[0].preis = { kinder: 30 }))), "Preis für „erwachsene“ fehlt");
  wirft("Konfiguration: unbekannte Veredelung", () => pruefeKonfig(kaputt((c) => c.artikel[0].veredelung.push("XX"))), "Veredelung „XX“");
  wirft("Konfiguration: Schnellwahl mit unbekanntem Artikel", () => pruefeKonfig(kaputt((c) => c.schnellwahl[0].artikel.push("mantel"))), "Artikel „mantel“");
  wirft("Konfiguration: Artikel doppelt", () => pruefeKonfig(kaputt((c) => (c.artikel[1].id = "trikot"))), "kommt doppelt vor");
  wirft("Konfiguration: Empfänger ohne Mailadresse", () => pruefeKonfig(kaputt((c) => (c.einstellungen.empfaenger = "bestellungen"))), "keine Mailadresse");
  wirft("Konfiguration: pruefmodus kein Wahrheitswert", () => pruefeKonfig(kaputt((c) => (c.einstellungen.pruefmodus = "ja"))), "pruefmodus");
  wirft("Konfiguration: Lieferantenbezeichnung fehlt", () => pruefeKonfig(kaputt((c) => delete c.artikel[0].lieferant.erwachsene)), "Lieferantenbezeichnung für „erwachsene“ fehlt");
  wirft("Konfiguration: Vorauswahl ist keine Größe", () => pruefeKonfig(kaputt((c) => (c.artikel[2].vorauswahl.kinder = "XXS"))), "Vorauswahl „XXS“");
  pruefe("gültige Konfiguration besteht die Prüfung", pruefeKonfig(KONFIG) === true);
}

// ---------- (a) bis (c): ganze Texte ----------

abschnitt("(a) bis (c) Betreff und Text Zeichen für Zeichen");
for (const [id, fall] of Object.entries(FAELLE)) {
  const m = mail(fall.bestellung, fall.jetzt);
  gleich(`(${id}) ${fall.titel}: Betreff`, m.betreff, fall.betreff);
  gleich(`(${id}) ${fall.titel}: Text`, m.text, fall.text);
  gleichJson(`(${id}) ${fall.titel}: keine Lücken`, pruefeBestellung(KONFIG, fall.bestellung), []);
  pruefe(`(${id}) ${fall.titel}: kein Platzhalter „${FEHLT}“`, !m.text.includes(FEHLT) && !m.betreff.includes(FEHLT));
  pruefe(`(${id}) ${fall.titel}: Text endet mit der Schlusszeile ohne Leerzeile`, m.text.endsWith("\n" + SCHLUSSZEILE));
  pruefe(`(${id}) ${fall.titel}: keine Zeile mit Leerzeichen am Ende`, !zeilen(m.text).some((z) => z !== z.trimEnd()));
}
{
  const z = zusammenfassung(KONFIG, FALL_A.bestellung);
  gleich("(a) Teile", String(z.teile), "11");
  gleich("(a) Summe", formatEuro(z.summeCent), "230 €");
  gleich("(a) Personen", String(z.personen.length), "3");
  gleich("(a) Blöcke für den Lieferanten", String(z.bloecke.length), "8");
  gleichJson("(a) Menge je Block", z.bloecke.map((b) => [b.artikel.id, b.variante.fuer, b.menge]), [
    ["trikot", "kinder", 2], ["trikot", "erwachsene", 1], ["shorts", "kinder", 2], ["stutzen", "alle", 2],
    ["praesi-jacke", "kinder", 1], ["praesi-hose", "kinder", 1], ["rucksack", "alle", 1], ["regenjacke", "alle", 1],
  ]);
  gleich("(a) Betrag je Person", z.personen.map((p) => formatEuro(p.summeCent)).join(" | "), "120 € | 45 € | 65 €");
  // Die Liste je Person geht nie an den Lieferanten: Namen stehen nur in Druckdaten und im internen Teil, die Zuordnung nur im internen Teil
  const m = mail(FALL_A.bestellung, FALL_A.jetzt).text;
  const teil1 = m.slice(m.indexOf("== 1."), m.indexOf("== 2."));
  const teil3 = m.slice(m.indexOf("== 3."));
  pruefe("(a) Teil 1 für den Lieferanten enthält keine Preise und kein „Zuordnung“", !/€|Zuordnung|Eltern|Sponsor:/.test(teil1.replace("Werbeaufdruck M 1C (Sponsorlogo)", "")));
  pruefe("(a) Teil 1 nennt Emil und Ben Kuhn nicht (nur Stücke mit Einzeldruck tragen einen Namen)", !teil1.includes("Emil") && !teil1.includes("Ben Kuhn"));
  pruefe("(a) Teil 3 steht ganz unten mit „NICHT WEITERLEITEN“", teil3.startsWith("== 3. NUR INTERN – NICHT WEITERLEITEN =="));
}

// ---------- (d) 116 und Winterjacke ----------

abschnitt("(d) Winterjacke bei Größe 116");
{
  const b = klein({ personen: [person("p1", "Leo", "5", "116", ["winterjacke"])], zaehler: 1 });
  const text = mail(b).text;
  pruefe("(d) Lieferant: Gr. 128", text.includes("JAKO Team Coach Kapuzenjacke Kids Blau F400 (7103)\nDruck: Vereinsnamen XL (SPEUZER), Spielernamen S, Initialen / Zahlen 2-5cm\n- Gr. 128: 1 Stück\n"), text);
  pruefe("(d) kein Gr. 116 beim Lieferanten", !text.includes("- Gr. 116"));
  pruefe("(d) Druckdaten mit Gr. 128", text.includes("- Winterjacke 7103, Gr. 128: Name „Leo“, Nr. 5\n"));
  pruefe("(d) intern ohne Zusatz (128 ist die Vorauswahl), Größe der Person 116", text.includes("- Leo, Nr. 5, Gr. 116: Winterjacke = 65 €\n"));
  const eigen = klein({ personen: [person("p1", "Leo", "5", "116", ["winterjacke"], { winterjacke: "140" })], zaehler: 1 });
  const text2 = mail(eigen).text;
  pruefe("(d) eigene Wahl 140: Lieferant Gr. 140, intern mit Zusatz", text2.includes("- Gr. 140: 1 Stück") && text2.includes("- Leo, Nr. 5, Gr. 116: Winterjacke (Gr. 140) = 65 €"));
  pruefe("(d) Winterjacke hat keine Größe 116", !katalogVon(KONFIG).nachId.get("winterjacke").groessenNachWert.has("116"));
  const gross = klein({ personen: [person("p1", "Uwe", "12", "XL", ["winterjacke"])], zaehler: 1 });
  pruefe("(d) Erwachsene: Bezeichnung ohne Kids, Gr. XL", mail(gross).text.includes("JAKO Team Coach Kapuzenjacke Blau F400 (7103)\n") && mail(gross).text.includes("- Gr. XL: 1 Stück"));
}

// ---------- (e) Regenjacke und Initialen ----------

abschnitt("(e) Regenjacke mit Initialen");
{
  gleich("Initialen-Vorschlag „Ben Kuhn“", initialenVorschlag("Ben Kuhn"), "BK");
  gleich("Initialen-Vorschlag ein Name", initialenVorschlag("Mia"), "M");
  gleich("Initialen-Vorschlag klein geschrieben und mit Bindestrich", initialenVorschlag("  anna-lena   müller "), "AM");
  gleich("Initialen-Vorschlag höchstens drei Buchstaben", initialenVorschlag("Hans Peter Maria Müller"), "HPM");
  gleich("Initialen-Vorschlag mit Umlaut am Anfang", initialenVorschlag("Östen Ärlig"), "ÖÄ");
  gleich("Initialen-Vorschlag leer", initialenVorschlag("  "), "");
  gleich("gedruckte Initialen ohne eigene Eingabe = Vorschlag", effektiveInitialen({ name: "Ben Kuhn", initialen: null }), "BK");
  gleich("gedruckte Initialen: eigene Eingabe gilt", effektiveInitialen({ name: "Ben Kuhn", initialen: "BeK" }), "BeK");
  gleich("gedruckte Initialen: leer gelassen bleibt leer", effektiveInitialen({ name: "Ben Kuhn", initialen: "" }), "");

  const b = klein({ personen: [person("p1", "Ben Kuhn", "", "152", ["regenjacke"])], zaehler: 1 });
  const text = mail(b).text;
  pruefe("(e) Druckdaten: Initialen „BK“ ohne Nummer", text.includes("Druckdaten je Stück:\n- Regenjacke 7302, Gr. 152: Initialen „BK“\n"), text);
  pruefe("(e) keine Rückennummer nötig", pruefeBestellung(KONFIG, b).length === 0);
  pruefe("(e) Lieferant: eine Bezeichnung, Druck mit Initialen", text.includes("JAKO Rainzip Team Royal F400 (Regenjacke, nicht im Angebot) (7302)\nDruck: Vereinswappen einfarbig, Vereinsnamen XL (SPEUZER), Initialen / Zahlen 2-5cm\n- Gr. 152: 1 Stück"));
  const eigen = klein({ personen: [person("p1", "Ben Kuhn", "", "152", ["regenjacke"], {}, "bk")], zaehler: 1 });
  pruefe("(e) eigene Initialen genau wie eingegeben („bk“, ohne Großschreibung)", mail(eigen).text.includes("- Regenjacke 7302, Gr. 152: Initialen „bk“\n"));
  // Kinder und Erwachsene in einem Block („eine Bezeichnung“), Größen in Leiterreihenfolge
  const gemischt = klein({ personen: [person("p1", "Ada", "", "M", ["regenjacke"]), person("p2", "Bo", "", "152", ["regenjacke"])], zaehler: 2 });
  pruefe("(e) Kinder- und Erwachsenengrößen im selben Block, Kinder zuerst", mail(gemischt).text.includes("(7302)\nDruck: Vereinswappen einfarbig, Vereinsnamen XL (SPEUZER), Initialen / Zahlen 2-5cm\n- Gr. 152: 1 Stück\n- Gr. M: 1 Stück\n"));
}

// ---------- (f) Bezahlung ----------

abschnitt("(f) Bezahlung");
{
  const b = klein({
    personen: [person("p1", "Mia", "7", "140", ["trikot"])],
    zaehler: 1,
    teambedarf: { baelle: { n: 2, details: "" } },
    bezahlung: { kleidung: "sponsor", kleidungSponsor: "Autohaus Beispiel", teambedarf: "sponsor", teambedarfSponsor: "  Bäckerei\nBeispiel " },
  });
  const m = mail(b);
  pruefe("(f) Bezahlung Kleidung: Sponsor mit Name", zeilen(m.text).includes("Bezahlung Kleidung: Sponsor: Autohaus Beispiel"), m.text);
  pruefe("(f) Bezahlung Teambedarf: Sponsorname in einer Zeile", zeilen(m.text).includes("Bezahlung Teambedarf: Sponsor: Bäckerei Beispiel"));
  gleichJson("(f) mit Sponsorname keine Lücken", pruefeBestellung(KONFIG, b), []);
  for (const [id, text] of [["eltern", "Eltern bzw. Spieler"], ["vereinskasse", "Vereinskasse"], ["spenden", "Spenden / Mannschaftskasse"]]) {
    const x = mail(klein({ personen: [person("p1", "Mia", "7", "140", ["trikot"])], zaehler: 1, bezahlung: { kleidung: id, kleidungSponsor: "", teambedarf: "", teambedarfSponsor: "" } }));
    pruefe(`(f) Bezahlung ${id}`, zeilen(x.text).includes("Bezahlung Kleidung: " + text));
  }
  const ohneName = mail(klein({ personen: [person("p1", "Mia", "7", "140", ["trikot"])], zaehler: 1, bezahlung: { kleidung: "sponsor", kleidungSponsor: "", teambedarf: "", teambedarfSponsor: "" } }));
  pruefe("(f) Sponsor ohne Name: Zeile nur „Sponsor“ (die Prüfung lässt es nicht zu)", zeilen(ohneName.text).includes("Bezahlung Kleidung: Sponsor"));
  // Die Zeile „Bezahlung Teambedarf“ gibt es nur mit Teambedarf, „Bezahlung Kleidung“ nur mit Kleidung
  const nurKleidung = mail(klein({ personen: [person("p1", "Mia", "7", "140", ["trikot"])], zaehler: 1, bezahlung: { kleidung: "eltern", kleidungSponsor: "", teambedarf: "vereinskasse", teambedarfSponsor: "" } }));
  pruefe("(f) ohne Teambedarf keine Zeile „Bezahlung Teambedarf“", !nurKleidung.text.includes("Bezahlung Teambedarf"));
  const nurTeam = mail(klein({ teambedarf: { baelle: { n: 2, details: "" } }, bezahlung: { kleidung: "eltern", kleidungSponsor: "", teambedarf: "vereinskasse", teambedarfSponsor: "" } }));
  pruefe("(f) ohne Kleidung keine Zeile „Bezahlung Kleidung“", !nurTeam.text.includes("Bezahlung Kleidung") && nurTeam.text.includes("Bezahlung Teambedarf: Vereinskasse"));
}

// ---------- (g) Prüfmodus aus ----------

abschnitt("(g) pruefmodus false");
{
  const m = baueMail(live, FALL_A.bestellung, FALL_A.jetzt);
  pruefe("(g) kein [TEST] im Betreff", !m.betreff.includes("TEST") && m.betreff.startsWith("Bestellung D3-Jugend"));
  pruefe("(g) keine Testzeile im Text", !m.text.includes("TEST") && !m.text.includes("Prototyp: Bitte"));
  gleich("(g) Betreff = Betreff von (a) ohne „[TEST] “", m.betreff, FALL_A.betreff.replace("[TEST] ", ""));
  gleich("(g) Text = Text von (a) ohne die Testzeile", m.text, FALL_A.text.replace("TEST – Prototyp: Bitte nichts beim Lieferanten bestellen.\n", ""));
  pruefe("(g) die Schlusszeile bleibt (sie ändert sich erst beim Livegang)", m.text.endsWith(SCHLUSSZEILE));
  const html = seite({ ...DATEN, bestellung: { ...DATEN.bestellung, einstellungen: { ...DATEN.bestellung.einstellungen, pruefmodus: false } } }).inhalt;
  pruefe("(g) Seite ohne Hinweis „Prototyp“ im Kopf", !html.includes("Prototyp:") && !html.includes("bst-pruefmodus"));
  const mitHinweis = seite(DATEN).inhalt;
  pruefe("(g) Seite im Prüfmodus mit Hinweis „Prototyp“ (blau, nicht rot)", mitHinweis.includes('<div class="hinweis hinweis--info bst-pruefmodus" role="note">') && mitHinweis.includes("<strong>Prototyp:</strong> Die Mail geht als TEST an die Bestelladresse und löst keine Bestellung aus."));
}

// ---------- (h) mailto hin und zurück ----------

abschnitt("(h) mailto");
{
  // Sonderzeichen, die in einer Adresse etwas bedeuten (& = ? # % +), Umlaute, Anführungszeichen, mehrere Zeilen
  const b = bestellung({
    ...FALL_A.bestellung,
    name: "Lena Beispiel",
    hinweis: "Rechnung & Lieferung: bitte bis 15.01.?=# 100% sicher + pünktlich\n  zweite Zeile mit „Anführungszeichen“ und ß",
    sonstiges: "Zeile 1\n\n\nZeile 3 (nach Leerzeilen)",
  });
  const m = mail(b, FALL_A.jetzt);
  const mt = m.mailto;
  pruefe("(h) beginnt mit mailto:Adresse?subject=", mt.startsWith("mailto:Bestellungen@sportfreunde04.de?subject="));
  const teile = mt.slice(mt.indexOf("?") + 1).split("&");
  pruefe("(h) genau zwei Teile: subject und body", teile.length === 2 && teile[0].startsWith("subject=") && teile[1].startsWith("body="), JSON.stringify(teile.map((t) => t.slice(0, 20))));
  const betreff = decodeURIComponent(teile[0].slice("subject=".length));
  const body = decodeURIComponent(teile[1].slice("body=".length));
  gleich("(h) Rückweg Betreff", betreff, m.betreff);
  gleich("(h) Rückweg Text (mit \\r\\n)", body, m.text.replace(/\n/g, "\r\n"));
  pruefe("(h) Zeilenumbrüche im Text nur als \\r\\n", !/(?<!\r)\n/.test(body) && body.includes("\r\n"));
  pruefe("(h) im Link jeder Zeilenumbruch als %0D%0A", (mt.match(/%0D%0A/g) || []).length === m.text.split("\n").length - 1 && !/(?<!%0D)%0A/.test(mt));
  pruefe("(h) Betreff und Text mit encodeURIComponent kodiert (Link enthält nur erlaubte Zeichen)", /^mailto:[^?\s]+\?subject=[A-Za-z0-9\-_.!~*'()%]*&body=[A-Za-z0-9\-_.!~*'()%]*$/.test(mt));
  pruefe("(h) mehrzeiliger Hinweis eingerückt, Leerzeilen im Text zu einer", body.includes("\r\nHinweis: Rechnung & Lieferung: bitte bis 15.01.?=# 100% sicher + pünktlich\r\n  zweite Zeile mit „Anführungszeichen“ und ß\r\n") && body.includes("- Sonstiges: Zeile 1\r\n\r\n  Zeile 3 (nach Leerzeilen)\r\n"));
  gleich("(h) mailtoLaenge = Länge des Links", String(m.mailtoLaenge), String(mt.length));
  gleich("(h) mailtoLink() direkt", mailtoLink("a@b.de", "Be treff", "x\ny"), "mailto:a@b.de?subject=Be%20treff&body=x%0D%0Ay");
  gleich("(h) mailtoLink() mit \\r\\n bleibt ein Umbruch", mailtoLink("a@b.de", "s", "x\r\ny"), "mailto:a@b.de?subject=s&body=x%0D%0Ay");
  gleich("(h) Text kopieren: Betreff, Leerzeile, Text", kopierText(m), "Betreff: " + m.betreff + "\n\n" + m.text);
}

// ---------- (i) Lückenliste ----------

abschnitt("(i) Lückenliste");
{
  const leer = leererEntwurf();
  gleichJson("(i) leere Eingaben", pruefeBestellung(KONFIG, leer), [
    { feld: "team", text: "Bitte wähle deine Mannschaft aus" },
    { feld: "name", text: "Bitte trage deinen Namen ein" },
    { feld: "leer", text: "Du hast noch nichts ausgewählt: Füge eine Person mit Kleidung hinzu oder wähle Teambedarf" },
  ]);

  const b = bestellung({
    team: "",
    name: "   ",
    personen: [
      person("p1", "Mia", "", "140", ["trikot", "praesi-jacke", "shorts"]),
      person("p2", "Ben", "9", "M", ["regenjacke"], {}, ""),
      person("p3", "", "5", "152", ["shorts"]),
      person("p4", "Cem", "", "", ["rucksack"]),
      person("p5", "Dora", "100", "L", ["shorts"]),
      person("p6", "Leer", "", "", []),
    ],
    zaehler: 6,
    teambedarf: { baelle: { n: 3, details: "" } },
  });
  gleichJson("(i) alle Lücken in der Reihenfolge der Seite", pruefeBestellung(KONFIG, b), [
    { feld: "team", text: "Bitte wähle deine Mannschaft aus" },
    { feld: "name", text: "Bitte trage deinen Namen ein" },
    { feld: "p:p1:nummer", text: "Bei Mia fehlt die Rückennummer (Trikot, Präsi-Jacke)" },
    { feld: "p:p2:initialen", text: "Bei Ben fehlen die Initialen (Regenjacke)" },
    { feld: "p:p3:name", text: "Bei Person 3 fehlt der Name" },
    { feld: "p:p4:groesse", text: "Bei Cem fehlt die Größe" },
    { feld: "p:p5:nummer", text: "Bei Dora ist die Rückennummer ungültig (nur 1 bis 99)" },
    { feld: "bezahlung:kleidung", text: "Bitte wähle, wer die Kleidung zahlt" },
    { feld: "bezahlung:teambedarf", text: "Bitte wähle, wer den Teambedarf zahlt" },
  ]);

  // Sponsor ohne Namen
  const s = bestellung({
    team: "d1",
    name: "Tina Beispiel",
    personen: [person("p1", "Mia", "7", "140", ["trikot"])],
    zaehler: 1,
    teambedarf: { ballpumpe: { n: 1, details: "" } },
    bezahlung: { kleidung: "sponsor", kleidungSponsor: " ", teambedarf: "sponsor", teambedarfSponsor: "" },
  });
  gleichJson("(i) Sponsor ohne Namen", pruefeBestellung(KONFIG, s), [
    { feld: "sponsor:kleidung", text: "Bitte trage den Namen des Sponsors ein (Kleidung)" },
    { feld: "sponsor:teambedarf", text: "Bitte trage den Namen des Sponsors ein (Teambedarf)" },
  ]);
  // Nummer: nur eine Lücke je Person, auch wenn mehrere Artikel sie brauchen; keine Nummer nötig ohne Trikot, Jacken
  gleichJson("(i) Shorts und Stutzen brauchen weder Nummer noch Initialen", pruefeBestellung(KONFIG, klein({ personen: [person("p1", "Mia", "", "140", ["shorts", "stutzen", "praesi-hose", "rucksack", "tw-hose"])], zaehler: 1 })), []);
  gleichJson("(i) Winterjacke und TW-Trikot brauchen eine Nummer", pruefeBestellung(KONFIG, klein({ personen: [person("p1", "Mia", "", "140", ["winterjacke", "tw-trikot"])], zaehler: 1 })).map((l) => l.text), ["Bei Mia fehlt die Rückennummer (Winterjacke, TW-Trikot)"]);
  // Teambedarf: nur Sonstiges reicht, aber dann ist die Bezahlung Pflicht
  gleichJson("(i) nur Sonstiges: Bezahlung des Teambedarfs ist Pflicht", pruefeBestellung(KONFIG, bestellung({ team: "d1", name: "Tina", sonstiges: "Pumpe" })).map((l) => l.feld), ["bezahlung:teambedarf"]);
  gleichJson("(i) Teambedarf mit Anzahl 0 und Details zählt nicht", pruefeBestellung(KONFIG, bestellung({ team: "d1", name: "Tina", teambedarf: { baelle: { n: 0, details: "Größe 4" } } })).map((l) => l.feld), ["leer"]);
  // Personen ohne Artikel zählen nicht und erzeugen keinen Fehler
  gleichJson("(i) Person ohne Artikel: kein Fehler, zählt nicht", pruefeBestellung(KONFIG, bestellung({ ...FALL_A.bestellung, personen: [...FALL_A.bestellung.personen, person("p4", "", "", "", [])] })), []);
  gleich("(i) Person ohne Artikel ändert den Text nicht", mail(bestellung({ ...FALL_A.bestellung, personen: [...FALL_A.bestellung.personen, person("p4", "", "", "", [])] }), FALL_A.jetzt).text, FALL_A.text);
  // Größe eines Artikels fehlt, obwohl die Größe der Person da ist: eigene Wahl ungültig und keine Vorauswahl
  pruefe("(i) Person ohne Mannschaft: die Vorschau bleibt lesbar", mail(bestellung({ team: "", name: "", personen: [person("p1", "", "", "", ["trikot"])], zaehler: 1 })).text.includes("Mannschaft: " + FEHLT));
}

// ---------- (j) Bestell-Nr. ----------

abschnitt("(j) Bestell-Nr.");
{
  gleich("(j) D3 am 25.11.2026 um 14:32", bestellNr("d3", lokal(14, 32)), "D3-261125-1432");
  gleich("(j) G-Jugend um 09:05 (führende Nullen)", bestellNr("g-jugend", lokal(9, 5)), "G-JUGEND-261125-0905");
  gleich("(j) Jahreswechsel, Mitternacht", bestellNr("herren", new Date(2027, 0, 3, 0, 0)), "HERREN-270103-0000");
  gleich("(j) Ende des Tages", bestellNr("a-jugend", new Date(2026, 11, 31, 23, 59)), "A-JUGEND-261231-2359");
  gleich("(j) Soma", bestellNr("soma", lokal(7, 41)), "SOMA-261125-0741");
  const m = mail(FALL_A.bestellung, lokal(14, 32));
  gleich("(j) Bestell-Nr. im Text", zeilen(m.text).find((z) => z.startsWith("Bestell-Nr.")), "Bestell-Nr.: D3-261125-1432");
  pruefe("(j) Bestell-Nr. am Ende des Betreffs", m.betreff.endsWith("(D3-261125-1432)"));
  // Die Nummer bleibt, sobald sie vergeben ist (auch Stunden später); eine andere Mannschaft bekommt eine neue
  const spaeter = lokal(18, 0);
  gleich("(j) vergebene Nummer bleibt", waehleBestellNr("D3-261125-1432", "d3", spaeter), "D3-261125-1432");
  gleich("(j) ohne Nummer entsteht eine neue", waehleBestellNr("", "d3", spaeter), "D3-261125-1800");
  gleich("(j) Nummer einer anderen Mannschaft wird ersetzt", waehleBestellNr("D3-261125-1432", "e1", spaeter), "E1-261125-1800");
  gleich("(j) ungültige Nummer wird ersetzt", waehleBestellNr("D3-1432", "d3", spaeter), "D3-261125-1800");
  const mitNr = baueMail(KONFIG, { ...FALL_A.bestellung, bestellNr: "D3-261125-1432" }, spaeter);
  gleich("(j) Mail mit vergebener Nummer: Text wie (a), auch zu einer anderen Uhrzeit", mitNr.text, FALL_A.text);
  gleich("(j) Mail mit vergebener Nummer: Betreff wie (a)", mitNr.betreff, FALL_A.betreff);
  const ohneNr = baueMail(KONFIG, FALL_A.bestellung, spaeter);
  pruefe("(j) ohne vergebene Nummer zählt die übergebene Uhrzeit", ohneNr.bestellNr === "D3-261125-1800" && ohneNr.text.includes("Bestell-Nr.: D3-261125-1800"));
}

// ---------- Zahlen, Euro, Datum ----------

abschnitt("Formatierung");
{
  gleich("Euro ganz", formatEuro(12000), "120 €");
  gleich("Euro mit Cent", formatEuro(1250), "12,50 €");
  gleich("Euro mit einstelligen Cent", formatEuro(1205), "12,05 €");
  gleich("Euro unter einem Euro", formatEuro(5), "0,05 €");
  gleich("Euro Null", formatEuro(0), "0 €");
  gleich("Euro mit Tausenderpunkt", formatEuro(185000), "1.850 €");
  gleich("Euro mit Tausenderpunkt und Cent", formatEuro(123456), "1.234,56 €");
  gleich("Euro Rundung", formatEuro(1999.6), "20 €");
  gleich("1 Teil", zahlwort(1, "Teil", "Teile"), "1 Teil");
  gleich("13 Teile", zahlwort(13, "Teil", "Teile"), "13 Teile");
  gleich("0 Teile", zahlwort(0, "Teil", "Teile"), "0 Teile");
  gleich("1 Stück", zahlwort(1, "Stück", "Stück"), "1 Stück");
  gleich("Datum", datumDe("2027-01-15"), "15.01.2027");
  gleich("Datum: Schaltjahr", datumDe("2028-02-29"), "29.02.2028");
  gleich("Datum: ungültig (30. Februar)", datumDe("2027-02-30"), "");
  gleich("Datum: leer", datumDe(""), "");
  gleich("Datum: kein ISO-Format", datumDe("15.01.2027"), "");
  gleichJson("Nummer 7", pruefeNummer("7"), { art: "ok", wert: "7" });
  gleichJson("Nummer 07 wird 7", pruefeNummer("07"), { art: "ok", wert: "7" });
  gleichJson("Nummer 99", pruefeNummer(" 99 "), { art: "ok", wert: "99" });
  gleichJson("Nummer 0 ungültig", pruefeNummer("0"), { art: "ungueltig", wert: "" });
  gleichJson("Nummer 100 ungültig", pruefeNummer("100"), { art: "ungueltig", wert: "" });
  gleichJson("Nummer mit Buchstaben ungültig", pruefeNummer("7a"), { art: "ungueltig", wert: "" });
  gleichJson("Nummer leer", pruefeNummer(""), { art: "leer", wert: "" });
  gleichJson("Nummer undefined", pruefeNummer(undefined), { art: "leer", wert: "" });
  gleich("einzeilig", einzeilig("  a \n b\t\tc  "), "a b c");
  gleich("mehrzeilig: Ränder, Leerzeilen, Zeilenenden", mehrzeilig("\n\n a  b \r\n\r\n\r\n c d \n\n"), "a b\n\nc d");
  gleich("Anzahl: Text wird Zahl", String(ganzzahl("12")), "12");
  gleich("Anzahl: negativ wird 0", String(ganzzahl(-3)), "0");
  gleich("Anzahl: unsinnig wird 0", String(ganzzahl("abc")), "0");
  gleich("Anzahl: höchstens 999", String(ganzzahl(5000)), String(GRENZEN.anzahl));
}

// ---------- Texte, Reihenfolge, Sonderfälle ----------

abschnitt("Sonderfälle");
{
  // Ein Teil: „1 Teil“ im Betreff und in der Summe
  const eins = mail(klein({ personen: [person("p1", "Mia", "7", "140", ["trikot"])], zaehler: 1 }));
  gleich("ein Teil: Betreff", eins.betreff, "[TEST] Bestellung E2-Jugend – 1 Teil (E2-261125-1200)");
  pruefe("ein Teil: „Summe: 1 Teil“", zeilen(eins.text).includes("Summe: 1 Teil"));
  const einsMitTeam = mail(klein({ personen: [person("p1", "Mia", "7", "140", ["trikot"])], zaehler: 1, teambedarf: { ballpumpe: { n: 1, details: "" } }, bezahlung: { kleidung: "eltern", kleidungSponsor: "", teambedarf: "eltern", teambedarfSponsor: "" } }));
  gleich("ein Teil und Teambedarf: Betreff", einsMitTeam.betreff, "[TEST] Bestellung E2-Jugend – 1 Teil, Teambedarf (E2-261125-1200)");

  // Stutzen: eigene Größe, Reihenfolge S vor M, Zusatz bei der Person
  const stutzen = mail(klein({ personen: [person("p1", "Mia", "", "140", ["stutzen"], { stutzen: "S (Bambini)" }), person("p2", "Bo", "", "140", ["stutzen"]), person("p3", "Ada", "", "S", ["stutzen"])], zaehler: 3 }));
  pruefe("Stutzen: Größen S, M, L mit Klammer, in dieser Reihenfolge", stutzen.text.includes("JAKO Tube Stutzen Blau F04 (3401)\n- Gr. S (Bambini): 1 Stück\n- Gr. M (Junior): 1 Stück\n- Gr. L (Senior): 1 Stück\n"), stutzen.text);
  pruefe("Stutzen: Zusatz bei abweichender Größe, nicht bei der Vorauswahl", stutzen.text.includes("- Mia, Gr. 140: Stutzen (Gr. S (Bambini)) = 5 €\n") && stutzen.text.includes("- Bo, Gr. 140: Stutzen = 5 €\n") && stutzen.text.includes("- Ada, Gr. S: Stutzen = 5 €\n"));
  pruefe("Stutzen: Summe 15 €", stutzen.text.includes("Summe Kleidung: 15 €\n"));

  // Druckdaten: Sortierung nach Katalog, Größe, Nummer (numerisch), Name
  const druck = mail(klein({
    personen: [
      person("p1", "Zoe", "5", "152", ["trikot"]),
      person("p2", "Anna", "5", "152", ["trikot"]),
      person("p3", "Max", "10", "152", ["trikot", "praesi-jacke"]),
      person("p4", "Lea", "9", "152", ["trikot"]),
      person("p5", "Tim", "2", "128", ["trikot"]),
      person("p6", "Uwe", "1", "XL", ["trikot"]),
      person("p7", "Ina", "3", "152", ["tw-trikot", "praesi-jacke"]),
    ],
    zaehler: 7,
  })).text;
  const druckZeilen = zeilen(druck.slice(druck.indexOf("Druckdaten je Stück:"), druck.indexOf("Summe:"))).filter(Boolean);
  gleichJson("Druckdaten sortiert (Katalog › Größe › Nummer numerisch › Name)", druckZeilen, [
    "Druckdaten je Stück:",
    "- Trikot 6101, Gr. 128: Nr. 2",
    "- Trikot 6101, Gr. 152: Nr. 5",
    "- Trikot 6101, Gr. 152: Nr. 5",
    "- Trikot 6101, Gr. 152: Nr. 9",
    "- Trikot 6101, Gr. 152: Nr. 10",
    "- Trikot 6101, Gr. XL: Nr. 1",
    "- Präsi-Jacke 9300, Gr. 152: Name „Ina“, Nr. 3",
    "- Präsi-Jacke 9300, Gr. 152: Name „Max“, Nr. 10",
    "- TW-Trikot 8923, Gr. 152: Nr. 3",
  ]);
  const gleicheNr = mail(klein({ personen: [person("p1", "Zoe", "5", "152", ["praesi-jacke"]), person("p2", "Anna", "5", "152", ["praesi-jacke"])], zaehler: 2 })).text;
  pruefe("Druckdaten: bei gleicher Nummer entscheidet der Name", gleicheNr.indexOf("Name „Anna“") < gleicheNr.indexOf("Name „Zoe“") && gleicheNr.includes("Name „Anna“"));
  // Namen genau wie eingegeben
  const klein_ = mail(klein({ personen: [person("p1", "mia  müller", "7", "140", ["praesi-jacke"])], zaehler: 1 })).text;
  pruefe("Namen genau wie eingegeben (keine Großschreibung), Leerzeichen zusammengezogen", klein_.includes("Name „mia müller“, Nr. 7") && klein_.includes("- mia müller, Nr. 7, Gr. 140: Präsi-Jacke = 35 €"));
  // Nummer „07“ wird „7“
  pruefe("Nummer 07 wird als 7 gedruckt", mail(klein({ personen: [person("p1", "Mia", "07", "140", ["trikot"])], zaehler: 1 })).text.includes("Gr. 140: Nr. 7\n"));
  // Nummer ohne Einzeldruck: steht intern trotzdem, wenn eingegeben
  pruefe("intern: „, Nr. N“ nur mit eingegebener Nummer", mail(klein({ personen: [person("p1", "Mia", "", "140", ["shorts"]), person("p2", "Bo", "8", "140", ["shorts"])], zaehler: 2 })).text.includes("- Mia, Gr. 140: Shorts = 10 €\n- Bo, Nr. 8, Gr. 140: Shorts = 10 €\n"));
  // Person ohne Namen: „Person n“ in der Vorschau
  pruefe("Person ohne Namen heißt in der Vorschau „Person 2“", mail(klein({ personen: [person("p1", "Mia", "", "140", ["shorts"]), person("p2", "", "", "140", ["shorts"])], zaehler: 2 })).text.includes("- Person 2, Gr. 140: Shorts = 10 €"));
  // Teambedarf: Details in einer Zeile, nur mit Anzahl > 0, Katalogreihenfolge, danach Sonstiges
  const tb = mail(klein({
    teambedarf: {
      trinkflaschen: { n: 12, details: "" },
      leibchen: { n: 2, details: "gelb,\n  Kinder " },
      baelle: { n: 0, details: "wird nicht gedruckt" },
      erste_hilfe: { n: 5, details: "unbekannter Posten" },
    },
    sonstiges: "  Tor aufbauen\n\n\n  Netz  ",
    bezahlung: { kleidung: "", kleidungSponsor: "", teambedarf: "eltern", teambedarfSponsor: "" },
  })).text;
  pruefe("Teambedarf: Katalogreihenfolge, Details in einer Zeile, Anzahl 0 und unbekannte Posten fehlen", tb.includes("== 2. TEAMBEDARF (Preis bitte beim Lieferanten erfragen) ==\n- 2 × Leibchen: gelb, Kinder\n- 12 × Trinkflaschen\n- Sonstiges: Tor aufbauen\n\n  Netz\n\nViele Grüße"), tb);
  // Datum
  pruefe("Gebraucht bis: ungültiges Datum erscheint nicht", !mail(klein({ bis: "2027-02-30", personen: [person("p1", "Mia", "", "140", ["shorts"])], zaehler: 1 })).text.includes("Gebraucht bis"));
  // Telefon
  pruefe("Telefon in einer Zeile mit dem Namen", mail(klein({ tel: " 030 23125\n456 ", personen: [person("p1", "Mia", "", "140", ["shorts"])], zaehler: 1 })).text.includes("Bestellt von: Tina Beispiel, Tel. 030 23125 456\n"));
  // Hinweise
  const hin = mail(klein({ hinweisBezahlung: "bar", hinweis: "Eile", personen: [person("p1", "Mia", "", "140", ["shorts"])], zaehler: 1 })).text;
  pruefe("Hinweise: Reihenfolge Bezahlung, Hinweis, Bestell-Nr.", hin.includes("Bezahlung Kleidung: Eltern bzw. Spieler\nHinweis zur Bezahlung: bar\nHinweis: Eile\nBestell-Nr.: E2-261125-1200\n"));
  // Nur Teambedarf: keine Teile 1 und 3
  const nurTb = mail(FAELLE.b.bestellung, FAELLE.b.jetzt).text;
  pruefe("nur Teambedarf: weder Teil 1 noch Teil 3, keine Summe, keine Druckdaten", !nurTb.includes("== 1.") && !nurTb.includes("== 3.") && !nurTb.includes("Summe") && !nurTb.includes("Druckdaten") && nurTb.includes("== 2."));
  pruefe("nur Kleidung: kein Teil 2", !mail(FAELLE.c.bestellung, FAELLE.c.jetzt).text.includes("TEAMBEDARF"));
  // Die Vorschau bei halb ausgefüllten Eingaben wirft nicht
  const halb = mail(bestellung({ personen: [person("p1", "", "", "", ["trikot", "regenjacke", "praesi-jacke"])], zaehler: 1 }));
  pruefe("halb ausgefüllt: Vorschau mit Platzhaltern statt Fehler", halb.text.includes(FEHLT) && halb.betreff.includes(FEHLT));
  // Lange Aufträge werden nie gekürzt
  const viele = [];
  for (let i = 1; i <= 45; i++) viele.push(person("p" + i, "Spieler " + i, String((i % 98) + 1), i % 2 ? "140" : "M", GRUNDAUSSTATTUNG));
  const lang = mail(klein({ personen: viele, zaehler: 45 }));
  pruefe(`lange Bestellung: mailto länger als ${MAILTO_LAENGE_MAX} Zeichen`, lang.mailtoLaenge > MAILTO_LAENGE_MAX, String(lang.mailtoLaenge));
  gleich("lange Bestellung: der Text im Link ist vollständig (nicht gekürzt)", decodeURIComponent(lang.mailto.split("&body=")[1]).replace(/\r\n/g, "\n"), lang.text);
  pruefe("lange Bestellung: alle 45 Personen im internen Teil", (lang.text.match(/^- Spieler \d+, Nr\. /gm) || []).length === 45);
  pruefe("kurze Bestellung bleibt unter der Grenze", mail(FALL_A.bestellung, FALL_A.jetzt).mailtoLaenge < MAILTO_LAENGE_MAX);
}

// ---------- Entwurf auf dem Gerät ----------

abschnitt("Entwurf");
{
  // Hin und zurück über JSON (so liegt er in localStorage): derselbe Text
  const zurueck = bereinigeEntwurf(JSON.parse(JSON.stringify(FALL_A.bestellung)), KONFIG);
  gleich("Entwurf: nach JSON und Bereinigung derselbe Text wie (a)", mail(zurueck, FALL_A.jetzt).text, FALL_A.text);
  gleichJson("Entwurf: Bereinigung ändert einen gültigen Entwurf nicht", zurueck, FALL_A.bestellung);
  // Müll
  for (const [name, roh] of [["null", null], ["Text", "x"], ["Zahl", 5], ["Liste", []], ["leeres Objekt", {}]]) {
    gleichJson(`Entwurf: ${name} ergibt einen leeren Entwurf`, bereinigeEntwurf(roh, KONFIG), leererEntwurf());
  }
  const muell = bereinigeEntwurf({
    team: "gibt-es-nicht", name: 5, tel: "x".repeat(500), bis: "kein Datum", sonstiges: "y".repeat(5000),
    personen: [
      { id: "p1", name: "Mia", nummer: "7", groesse: "999", artikel: { trikot: { groesse: "999" }, mantel: {}, shorts: true, stutzen: { groesse: "L (Senior)" }, winterjacke: { groesse: "116" } }, initialen: 5 },
      { id: "p1", name: "Doppelt", nummer: 7, groesse: "140", artikel: "kaputt" },
      "kein Objekt",
      null,
    ],
    zaehler: "viele",
    teambedarf: { baelle: { n: "12", details: "z".repeat(500) }, mantel: { n: 3 }, ballpumpe: { n: -4, details: "" }, leibchen: { n: 100000 } },
    bezahlung: { kleidung: "bar", kleidungSponsor: 7, teambedarf: "sponsor", teambedarfSponsor: "Bäcker" },
    bestellNr: "x", status: "mail",
  }, KONFIG);
  gleich("Entwurf: unbekannte Mannschaft wird leer", muell.team, "");
  gleich("Entwurf: Name kein Text wird leer", muell.name, "");
  gleich("Entwurf: Telefon wird gekürzt", String(muell.tel.length), String(GRENZEN.tel));
  gleich("Entwurf: ungültiges Datum wird leer", muell.bis, "");
  gleich("Entwurf: Sonstiges wird gekürzt", String(muell.sonstiges.length), String(GRENZEN.sonstiges));
  gleich("Entwurf: vier Einträge, zwei davon keine Personen", String(muell.personen.length), "4");
  pruefe("Entwurf: Personen-Nummern sind eindeutig", new Set(muell.personen.map((p) => p.id)).size === muell.personen.length && muell.personen.every((p) => /^p\d+$/.test(p.id)));
  pruefe("Entwurf: der Zähler liegt über allen Nummern", muell.personen.every((p) => Number(p.id.slice(1)) <= muell.zaehler));
  gleich("Entwurf: ungültige Größe der Person wird leer", muell.personen[0].groesse, "");
  gleichJson("Entwurf: Artikel nur aus dem Katalog, eigene Größe nur wenn gültig", muell.personen[0].artikel, { trikot: { groesse: "" }, shorts: { groesse: "" }, stutzen: { groesse: "L (Senior)" }, winterjacke: { groesse: "" } });
  gleich("Entwurf: Initialen kein Text werden „keine eigene Eingabe“", String(muell.personen[0].initialen), "null");
  gleichJson("Entwurf: Teambedarf bereinigt", muell.teambedarf, { baelle: { n: 12, details: "z".repeat(GRENZEN.details) }, leibchen: { n: GRENZEN.anzahl, details: "" } });
  gleichJson("Entwurf: Bezahlung bereinigt", muell.bezahlung, { kleidung: "", kleidungSponsor: "", teambedarf: "sponsor", teambedarfSponsor: "Bäcker" });
  gleich("Entwurf: ungültige Bestell-Nr. wird leer, Status damit auch", muell.bestellNr + "|" + muell.status, "|");
  const mitNr = bereinigeEntwurf({ bestellNr: "G-JUGEND-261125-0905", status: "kopiert" }, KONFIG);
  gleich("Entwurf: gültige Bestell-Nr. und Status bleiben", mitNr.bestellNr + "|" + mitNr.status, "G-JUGEND-261125-0905|kopiert");
  gleich("Entwurf: Status ohne Bestell-Nr. wird leer", bereinigeEntwurf({ status: "mail" }, KONFIG).status, "");
  gleich("Entwurf: mehr als 60 Personen werden abgeschnitten", String(bereinigeEntwurf({ personen: Array.from({ length: 200 }, (_, i) => ({ id: "p" + (i + 1), name: "x" })) }, KONFIG).personen.length), String(GRENZEN.personen));
  pruefe("Entwurf: ein bereinigter Müll-Entwurf lässt sich prüfen und in eine Mail verwandeln", Array.isArray(pruefeBestellung(KONFIG, muell)) && typeof mail(muell).text === "string");
  // Neue Bestellung: der Absender bleibt, alles andere ist leer
  const absender = { team: "d3", name: "Lena Beispiel", tel: "030 23125 123" };
  const neu = Object.assign(leererEntwurf(), absender);
  gleichJson("Entwurf: leer außer Mannschaft, Name und Telefon", neu, { ...leererEntwurf(), ...absender });
}

// ---------- Gerüst der Seite (Bau) ----------

abschnitt("Seite");
{
  const s = seite(DATEN);
  gleich("Seite: URL", s.url, "/bestellung/");
  gleich("Seite: Titel", s.title, "Bestellung für dein Team");
  pruefe("Seite: noindex im Kopf (dadurch nicht in der Sitemap)", /<meta name="robots" content="noindex">/.test(s.kopfZusatz));
  pruefe("Seite: bindet CSS und Skript ein (Pfade für docs/ws/)", s.kopfZusatz.includes('href="../assets/css/bestellung.css"') && s.kopfZusatz.includes('<script type="module" src="../assets/js/bestellung/seite.js"></script>'));
  pruefe("Seite: Beschreibung 50 bis 170 Zeichen (Prüfung der Website)", s.description.length >= 50 && s.description.length <= 170, String(s.description.length));
  const m = /<script type="application\/json" id="bestellung-konfig">([\s\S]*?)<\/script>/.exec(s.inhalt);
  pruefe("Seite: Konfiguration eingebettet", !!m);
  gleichJson("Seite: eingebettete Konfiguration = Konfiguration der Tests", JSON.parse(m[1]), KONFIG);
  pruefe("Seite: Pflegehinweis der Datei nicht in der Seite", !s.inhalt.includes("_hinweis") && !s.inhalt.includes("Pflegedatei"));
  pruefe("Seite: kein „<“ und keine Skript-Ende-Marke in der eingebetteten Konfiguration", !m[1].includes("<"));
  pruefe("Seite: nur Namen und Kürzel der Mannschaften (keine Trainer, Mails, Plätze)", JSON.parse(m[1]).mannschaften.every((x) => Object.keys(x).sort().join() === "name,slug"));
  for (const text of [
    "Bestellung für dein Team", "Wer bestellt?", "Kleidung je Person", "Teambedarf", "Bezahlung", "Übersicht und Senden",
    "Hier stellst du zusammen, was dein Team braucht. Am Ende öffnet sich dein Mailprogramm mit der fertigen Bestellung an den Verein – du musst nur noch auf „Senden“ tippen.",
    "Name und Nummer werden auf Trikot, Präsi-Jacke und Winterjacke gedruckt.", "+ Person hinzufügen", "Preise klärt der Vorstand.",
    "Wer zahlt die Kleidung?", "Wer zahlt den Teambedarf?", "Name des Sponsors", "Hinweis zur Bezahlung (freiwillig)", "Sonstiger Hinweis (freiwillig)",
    "Dein Name", "Telefon (freiwillig)", "Gebraucht bis (freiwillig)", "Bestellung per Mail senden", "Text kopieren", "Mail ansehen", "Neue Bestellung beginnen", "Sonstiges",
    "Die Seite speichert nichts auf einem Server. Deine Eingaben bleiben auf diesem Gerät, bis du sie per Mail verschickst.", "Preise für Eltern bzw. Spieler, Stand 11/26.",
    "Die Bestellung ist lang. Falls in der Mail etwas fehlt: „Text kopieren“ und einfügen.",
  ]) {
    pruefe(`Seite: Text „${text.slice(0, 50)}${text.length > 50 ? "…" : ""}“`, s.inhalt.includes(text));
  }
  for (const t of KONFIG.teambedarf) pruefe(`Seite: Teambedarf ${t.anzeige}`, s.inhalt.includes(`>${t.anzeige.replaceAll("&", "&amp;")}<`) || s.inhalt.includes(`${t.anzeige}</span>`));
  for (const m2 of KONFIG.mannschaften) pruefe(`Seite: Mannschaft ${m2.name}`, s.inhalt.includes(`<option value="${m2.slug}">${m2.name}</option>`));
  gleichJson("Seite: genau ein h1", [(s.inhalt.match(/<h1[ >]/g) || []).length], [1]);
  pruefe("Seite: keine TODO-Reste und kein console.log", !/TODO|FIXME|console\.log/.test(s.inhalt));
  wirft("Seite: ohne data/bestellung.json bricht der Bau ab", () => seite({ teams: DATEN.teams }), "data/bestellung.json fehlt");
}

// ---------- öffentliche Ausgabe: keine internen Daten, kein Grün, keine fremden Adressen ----------

abschnitt("Dateien");
{
  const dateien = [
    "data/bestellung.json",
    "src/seiten/bestellung.mjs",
    "assets/css/bestellung.css",
    ...readdirSync(path.join(ROOT, "assets", "js", "bestellung")).map((n) => "assets/js/bestellung/" + n),
  ];
  const text = (d) => readFileSync(path.join(ROOT, d), "utf8");
  for (const d of dateien) {
    const t = text(d);
    pruefe(`${d}: keine Einkaufsdaten (Einkaufspreis, Kundenkonto, Angebot)`, !/Einkaufspreis|Kundenkonto|Kundennummer|Angebotsnummer|Angebotsnr/i.test(t.replace("Einkaufspreise, Kundenkonto und Angebotsnummern des Lieferanten gehören nie in diese Datei.", "")));
    pruefe(`${d}: keine TODO/FIXME`, !/TODO|FIXME/.test(t));
    pruefe(`${d}: keine fremden Adressen (https://)`, !/https?:\/\//.test(t));
  }
  for (const d of dateien.filter((x) => x.startsWith("assets/js/"))) {
    const t = text(d);
    pruefe(`${d}: kein console.log`, !/console\.log/.test(t));
    pruefe(`${d}: kein dynamisches import()`, !/\bimport\s*\(/.test(t));
  }
  const css = text("assets/css/bestellung.css");
  pruefe("bestellung.css: keine Farbnamen (kein Grün, kein Rot)", !/\b(?:red|green|lime|crimson|orange|gold|silver)\b/i.test(css));
  pruefe("bestellung.css: Farben nur über Tokens (var(--…)) und ein Rahmengrau", (css.match(/#[0-9a-fA-F]{3,8}\b/g) || []).join(",") === "#858bae");
}

// ---------- Zusammenfassung ----------

console.log("");
if (fehler.length) {
  console.log(`mailtext-test: ${anzahl} Prüfungen, ${fehler.length} FEHLER`);
  process.exit(1);
}
console.log(`mailtext-test: ${anzahl} Prüfungen, alle bestanden`);
