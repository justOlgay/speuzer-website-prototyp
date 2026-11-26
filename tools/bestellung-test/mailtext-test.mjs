#!/usr/bin/env node
// Tests der reinen Funktionen der Bestellseite (assets/js/bestellung/mailtext.js, formular.js), ohne Browser.
//
// Gerechnet wird mit erfundenen Testpreisen (testdaten.mjs, Rabatt 40 %, bewusst nicht der echte Rabattsatz). Die erwarteten Beträge und Texte
// stehen als feste Zeichenketten da, von Hand nachgerechnet (Herleitung in faelle.mjs), nicht vom Code erzeugt.
//
// Geprüft wird:
//   Katalog gegen die Spezifikation (Aufdrucke je Artikel, Namen, Größen, Bezeichnungen), keine Preise in den öffentlichen Daten
//   Preise: Prüfung der Preisdaten, Rechnung in Cent (Rundung), Stückpreise, „Preis auf Anfrage“, Preiszeile, Summen
//   (a) Referenzbestellung D3 (zwei Kinder, eines mit abgewähltem Sponsorlogo, ein Erwachsener mit Regenjacke, Teambedarf, Sponsor, Lieferanschrift)
//   (b) nur Teambedarf   (c) Torwartset in Erwachsenengröße mit Sponsorlogo   (d) 116 + Winterjacke › Lieferant „Gr. 128“
//   (e) Regenjacke mit Initialen   (f) Bezahlung, Sponsor als „Sponsor (Firma)“   (g) pruefmodus false   (h) mailto hin und zurück
//   (i) Lückenliste   (j) Bestell-Nr.   (k) bis (n) Bezahlung als Mehrfachauswahl, alte Entwürfe
//   (o) Aufdruck-Kombinationen: eigene Blöcke, Reihenfolge, Druckdaten   (p) Name, Nummer und Initialen nur, wenn ein gewählter Aufdruck sie braucht
//   (q) doppelte Rückennummern   (r) Lieferanschrift   (s) Block „Sponsor“   (t) Schnellwahl mit Standard-Aufdrucken
// dazu Formatierung, Sortierung, Entwurf auf dem Gerät (bereinigeEntwurf), lange Bestellungen (nie gekürzt), die Hülle der Seite
// (src/seiten/bestellung.mjs) und das Formular nach dem Entschlüsseln (formular.js).
//
// Aufruf: node tools/bestellung-test/mailtext-test.mjs [--ausfuehrlich]
// Ausgabe: eine Zeile je Fehler, am Ende die Zusammenfassung; Exit 0 nur, wenn alles bestanden ist.

import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  FEHLT,
  GRENZEN,
  MAILTO_LAENGE_MAX,
  PREIS_AUF_ANFRAGE,
  SCHLUSSZEILE,
  artikelAufdrucke,
  artikelGroesse,
  baueMail,
  bereinigeEntwurf,
  bestellNr,
  bezahlungIds,
  datumDe,
  druckBedarf,
  effektiveInitialen,
  einzeilig,
  formatEuro,
  ganzzahl,
  grundpreisCent,
  initialenVorschlag,
  istAufAnfrage,
  katalogVon,
  kopierText,
  leererEntwurf,
  lieferAnschrift,
  listenpreisCent,
  mailtoLink,
  mehrzeilig,
  mitPreisen,
  parseOrt,
  preisQuelle,
  preisText,
  preisZeile,
  pruefeBestellung,
  pruefeKonfig,
  pruefeNummer,
  pruefePreise,
  schnellwahlAnwenden,
  sponsorAktiv,
  sponsorDaten,
  stueckpreis,
  summeText,
  verbindeDeutsch,
  vorauswahlGroesse,
  vorauswahlHinweis,
  waehleBestellNr,
  zahlDe,
  zahlwort,
  zusammenfassung,
  zuschlagSumme,
  zuschlagText,
} from "../../assets/js/bestellung/mailtext.js";
import { TEXT_HINWEIS_SPONSOR, TEXT_LEAD, baueFormular, preisFussText } from "../../assets/js/bestellung/formular.js";
import { baueKonfig, seite } from "../../src/seiten/bestellung.mjs";
import {
  DATEN,
  FAELLE,
  FALL_A,
  FALL_B,
  FALL_C,
  GRUNDAUSSTATTUNG,
  KONFIG,
  KONFIG_OEFFENTLICH,
  STANDARD,
  TESTPREISE,
  TORWARTSET,
  bestellung,
  kopieTestpreise,
  lokal,
  person,
} from "./faelle.mjs";

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

// Eine Zeile des Textes, die mit „anfang“ beginnt
const zeileMit = (text, anfang) => zeilen(text).find((z) => z.startsWith(anfang));

const ANSCHRIFT = { lieferStrasse: "Beispielweg 12", lieferOrt: "60439 Frankfurt" };
const FIRMA = { firma: "Autohaus Beispiel", ansprechpartner: "", email: "", telefon: "", anschrift: "" };

// Ein kleiner Auftrag für gezielte Prüfungen: Lieferanschrift da, Kleidung zahlen die Eltern, kein Sponsor eingetragen
function klein(teil) {
  return bestellung({
    team: "e2",
    name: "Tina Beispiel",
    ...ANSCHRIFT,
    bezahlung: { kleidung: ["eltern"], teambedarf: [] },
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
  gleichJson("Einstellungen (ohne Preisstand: Stand und Quelle kommen aus den verschlüsselten Preisdaten)", KONFIG.einstellungen, { empfaenger: "Bestellungen@sportfreunde04.de", pruefmodus: true, lieferant: "11Teamsport" });
  gleich("Stand der Daten", KONFIG.stand, "2026-11-25");

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

  // Veredelungstexte (für den Lieferanten) bleiben wörtlich, dazu die Namen der Kästchen
  gleichJson("Veredelungstexte wörtlich", KONFIG.veredelungen, {
    W: "Vereinswappen einfarbig",
    V: "Vereinsnamen XL (SPEUZER)",
    SP: "Werbeaufdruck M 1C (Sponsorlogo)",
    ZG: "Zahlen 20-26cm (Rückennummer)",
    ZK: "Initialen / Zahlen 2-5cm",
    N: "Spielernamen S",
  });
  gleichJson("Namen der Aufdrucke für die Auswahl", KONFIG.aufdruckNamen, {
    W: "Vereinswappen",
    V: "Schriftzug SPEUZER",
    SP: "Sponsorlogo",
    ZG: "Rückennummer groß",
    N: "Name",
    ZK: "kleine Nummer vorne",
    "ZK:initialen": "Initialen",
  });

  // Aufdrucke je Artikel: möglich (Reihenfolge der Anzeige), vorausgewählt, was ein Aufdruck von der Person braucht
  const leer = { moeglich: [], standard: [], daten: {} };
  const AUFDRUCKE = {
    trikot: { moeglich: ["W", "V", "SP", "ZG"], standard: ["W", "V", "SP", "ZG"], daten: { ZG: "nummer" } },
    shorts: leer,
    stutzen: leer,
    "praesi-jacke": { moeglich: ["W", "ZK", "V", "N"], standard: ["W", "ZK", "V", "N"], daten: { ZK: "nummer", N: "name" } },
    "praesi-hose": leer,
    rucksack: { moeglich: ["W", "V"], standard: ["W"], daten: {} },
    winterjacke: { moeglich: ["V", "N", "ZK"], standard: ["V", "N", "ZK"], daten: { ZK: "nummer", N: "name" } },
    regenjacke: { moeglich: ["W", "V", "ZK"], standard: ["W", "V", "ZK"], daten: { ZK: "initialen" } },
    "tw-trikot": { moeglich: ["W", "V", "SP", "ZG"], standard: ["W", "V", "SP", "ZG"], daten: { ZG: "nummer" } },
    "tw-hose": leer,
  };
  for (const a of k.artikel) {
    gleichJson(`Aufdrucke möglich ${a.id}`, a.aufdrucke.moeglich, AUFDRUCKE[a.id].moeglich);
    gleichJson(`Aufdrucke vorausgewählt ${a.id}`, a.aufdrucke.standard, AUFDRUCKE[a.id].standard);
    gleichJson(`Druckdaten ${a.id}`, a.druckdaten, AUFDRUCKE[a.id].daten);
    gleichJson(`Vorauswahl der Tests (faelle.mjs) = Katalog ${a.id}`, STANDARD[a.id], a.aufdrucke.standard);
  }
  gleichJson("Namen der Kästchen: Trikot", Object.values(k.nachId.get("trikot").aufdruckNamen), ["Vereinswappen", "Schriftzug SPEUZER", "Sponsorlogo", "Rückennummer groß"]);
  gleichJson("Namen der Kästchen: Präsi-Jacke (ZK mit Nummer: „kleine Nummer vorne“)", Object.values(k.nachId.get("praesi-jacke").aufdruckNamen), ["Vereinswappen", "kleine Nummer vorne", "Schriftzug SPEUZER", "Name"]);
  gleichJson("Namen der Kästchen: Regenjacke (ZK mit Initialen: „Initialen“)", Object.values(k.nachId.get("regenjacke").aufdruckNamen), ["Vereinswappen", "Schriftzug SPEUZER", "Initialen"]);
  gleichJson("Namen der Kästchen: Rucksack", Object.values(k.nachId.get("rucksack").aufdruckNamen), ["Vereinswappen", "Schriftzug SPEUZER"]);
  gleichJson("Texte für den Lieferanten: Präsi-Jacke in Reihenfolge der Aufdrucke", Object.values(k.nachId.get("praesi-jacke").druckTexte), ["Vereinswappen einfarbig", "Initialen / Zahlen 2-5cm", "Vereinsnamen XL (SPEUZER)", "Spielernamen S"]);

  // Größen je Artikel
  gleichJson("Stutzen: Größen", k.nachId.get("stutzen").groessen.map((g) => g.wert), ["S (Bambini)", "M (Junior)", "L (Senior)"]);
  gleichJson("Rucksack: Einheitsgröße", k.nachId.get("rucksack").groessen.map((g) => g.wert), ["Einheitsgröße"]);
  gleichJson("Winterjacke: Kinder ab 128", k.nachId.get("winterjacke").groessen.map((g) => g.wert), ["128", "140", "152", "164", "S", "M", "L", "XL", "XXL", "3XL"]);
  gleichJson("Trikot: alle Größen", k.nachId.get("trikot").groessen.map((g) => g.wert), ["116", "128", "140", "152", "164", "S", "M", "L", "XL", "XXL", "3XL"]);
  gleichJson("Beschreibung Trikot für Trainer", [k.nachId.get("trikot").beschreibung, k.nachId.get("tw-trikot").beschreibung], ["JAKO T-Shirt One, weiß", "JAKO Torwarttrikot Power, rot"]);

  // Schnellwahl: Inhalt
  const set = (id) => KONFIG.schnellwahl.find((s) => s.id === id);
  gleichJson("Schnellwahl Grundausstattung", [...set("grundausstattung").artikel].sort(), [...GRUNDAUSSTATTUNG].sort());
  gleichJson("Schnellwahl Torwartset", [...set("torwartset").artikel].sort(), [...TORWARTSET].sort());
  gleich("Titel der Schnellwahlen", KONFIG.schnellwahl.map((s) => s.titel).join("|"), "Grundausstattung|Torwartset");

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
    const kopie = JSON.parse(JSON.stringify(KONFIG_OEFFENTLICH));
    aendere(kopie);
    return kopie;
  };
  wirft("Konfiguration: unbekannte Veredelung", () => pruefeKonfig(kaputt((c) => c.artikel[0].aufdrucke.moeglich.push("XX"))), "Aufdruck „XX“");
  wirft("Konfiguration: Standard-Aufdruck nicht möglich", () => pruefeKonfig(kaputt((c) => (c.artikel[0].aufdrucke.standard = ["W", "N"]))), "Standard-Aufdruck „N“");
  wirft("Konfiguration: Aufdruck doppelt", () => pruefeKonfig(kaputt((c) => (c.artikel[0].aufdrucke.moeglich = ["W", "W"]))), "doppelt");
  wirft("Konfiguration: Druckdaten für einen Aufdruck, den es am Artikel nicht gibt", () => pruefeKonfig(kaputt((c) => (c.artikel[1].druckdaten = { ZG: "nummer" }))), "druckdaten „ZG“");
  wirft("Konfiguration: Druckdaten mit unbekannter Art", () => pruefeKonfig(kaputt((c) => (c.artikel[0].druckdaten.ZG = "alter"))), "„alter“ unbekannt");
  wirft("Konfiguration: Aufdruck ohne Namen für die Auswahl", () => pruefeKonfig(kaputt((c) => delete c.aufdruckNamen.ZG)), "aufdruckNamen");
  wirft("Konfiguration: ohne Sponsorlogo SP", () => pruefeKonfig(kaputt((c) => { delete c.veredelungen.SP; for (const a of c.artikel) { a.aufdrucke.moeglich = a.aufdrucke.moeglich.filter((x) => x !== "SP"); a.aufdrucke.standard = a.aufdrucke.standard.filter((x) => x !== "SP"); } })), "veredelungen.SP");
  wirft("Konfiguration: Schnellwahl mit unbekanntem Artikel", () => pruefeKonfig(kaputt((c) => c.schnellwahl[0].artikel.push("mantel"))), "Artikel „mantel“");
  wirft("Konfiguration: Artikel doppelt", () => pruefeKonfig(kaputt((c) => (c.artikel[1].id = "trikot"))), "kommt doppelt vor");
  wirft("Konfiguration: Empfänger ohne Mailadresse", () => pruefeKonfig(kaputt((c) => (c.einstellungen.empfaenger = "bestellungen"))), "keine Mailadresse");
  wirft("Konfiguration: pruefmodus kein Wahrheitswert", () => pruefeKonfig(kaputt((c) => (c.einstellungen.pruefmodus = "ja"))), "pruefmodus");
  wirft("Konfiguration: Lieferantenbezeichnung fehlt", () => pruefeKonfig(kaputt((c) => delete c.artikel[0].lieferant.erwachsene)), "Lieferantenbezeichnung für „erwachsene“ fehlt");
  wirft("Konfiguration: Vorauswahl ist keine Größe", () => pruefeKonfig(kaputt((c) => (c.artikel[2].vorauswahl.kinder = "XXS"))), "Vorauswahl „XXS“");
  pruefe("gültige Konfiguration besteht die Prüfung", pruefeKonfig(KONFIG_OEFFENTLICH) === true);

  // Die öffentlichen Daten tragen keine Preise: keine Schlüssel dafür, keine Beträge mit Nachkommastellen
  const schluessel = new Set();
  const sammle = (v) => {
    if (Array.isArray(v)) v.forEach(sammle);
    else if (v && typeof v === "object") for (const [s, w] of Object.entries(v)) (schluessel.add(s), sammle(w));
  };
  sammle(KONFIG_OEFFENTLICH);
  const verboten = ["preis", "preise", "uvp", "rabatt", "rabattProzent", "veredelungPreis", "zuschlag", "listenpreis"];
  gleichJson("öffentliche Konfiguration: keine Schlüssel für Preise", verboten.filter((s) => schluessel.has(s)), []);
  pruefe("öffentliche Konfiguration: kein Betrag mit Nachkommastellen, kein „€“", !/\d[.,]\d{2}(?!\d)|€/.test(JSON.stringify({ ...KONFIG_OEFFENTLICH, preiseVerschluesselt: null })));
  pruefe("öffentliche Konfiguration: kein „preise“ (nur das verschlüsselte Paket)", KONFIG_OEFFENTLICH.preise === undefined && typeof KONFIG_OEFFENTLICH.preiseVerschluesselt === "object" && KONFIG_OEFFENTLICH.preiseVerschluesselt !== null);
  gleichJson("öffentliche Konfiguration: das Paket hat genau die Felder des Formats", Object.keys(KONFIG_OEFFENTLICH.preiseVerschluesselt), ["format", "kdf", "iter", "salt", "iv", "ct"]);
}

// ---------- Preise ----------

abschnitt("Preise");
{
  // Prüfung der Preisdaten
  gleichJson("Testpreise: vollständig, keine Probleme", pruefePreise(KONFIG_OEFFENTLICH, TESTPREISE), []);
  const mitZusatz = { ...kopieTestpreise(), pruefsummen: { "trikot.kinder": 1 }, _hinweis: "privat" };
  gleichJson("weitere Felder (Prüfsummen, Hinweis) werden ignoriert", pruefePreise(KONFIG_OEFFENTLICH, mitZusatz), []);
  const probleme = (aendere) => {
    const p = kopieTestpreise();
    aendere(p);
    return pruefePreise(KONFIG_OEFFENTLICH, p);
  };
  const nennt = (liste, teil) => liste.length === 1 && liste[0].includes(teil);
  pruefe("Prüfung: Listenpreis fehlt › nennt uvp.trikot.kinder", nennt(probleme((p) => delete p.uvp.trikot.kinder), "uvp.trikot.kinder"));
  pruefe("Prüfung: Artikel fehlt ganz › nennt uvp.shorts (null hieße Preis auf Anfrage)", nennt(probleme((p) => delete p.uvp.shorts), "uvp.shorts fehlt (null heißt: Preis auf Anfrage)"));
  pruefe("Prüfung: ‚null‘ ist erlaubt (Preis auf Anfrage)", probleme((p) => (p.uvp.shorts = null)).length === 0);
  pruefe("Prüfung: Gruppe „alle“ beim Rucksack fehlt", nennt(probleme((p) => (p.uvp.rucksack = { kinder: 20 })), "uvp.rucksack.alle"));
  pruefe("Prüfung: Zuschlag fehlt › nennt veredelungPreis.SP", nennt(probleme((p) => delete p.veredelungPreis.SP), "veredelungPreis.SP"));
  pruefe("Prüfung: Betrag mit drei Nachkommastellen", nennt(probleme((p) => (p.uvp.trikot.kinder = 12.345)), "uvp.trikot.kinder"));
  pruefe("Prüfung: negativer Betrag", nennt(probleme((p) => (p.veredelungPreis.W = -1)), "veredelungPreis.W"));
  pruefe("Prüfung: Betrag als Text", nennt(probleme((p) => (p.uvp.trikot.erwachsene = "24")), "uvp.trikot.erwachsene"));
  pruefe("Prüfung: Rabatt fehlt", nennt(probleme((p) => delete p.rabattProzent), "rabattProzent"));
  pruefe("Prüfung: Rabatt 100 oder mehr", nennt(probleme((p) => (p.rabattProzent = 100)), "rabattProzent"));
  pruefe("Prüfung: Rabatt negativ", nennt(probleme((p) => (p.rabattProzent = -5)), "rabattProzent"));
  pruefe("Prüfung: Stand kein Datum", nennt(probleme((p) => (p.stand = "24.11.2026")), "stand"));
  pruefe("Prüfung: Quelle fehlt", nennt(probleme((p) => (p.quelle = "  ")), "quelle"));
  pruefe("Prüfung: kein Objekt", pruefePreise(KONFIG_OEFFENTLICH, null).length === 1 && pruefePreise(KONFIG_OEFFENTLICH, []).length === 1);
  const mehrere = probleme((p) => {
    p.rabattProzent = 123;
    delete p.uvp.trikot;
    p.veredelungPreis.ZG = "x";
  });
  pruefe("Prüfung: mehrere Probleme auf einmal, die Meldungen nennen nur Schlüssel (nie den Wert 123)", mehrere.length === 3 && !mehrere.join(" ").includes("123"), mehrere.join(" | "));
  wirft("mitPreisen: unvollständige Preisdaten brechen mit der Liste der Probleme ab", () => mitPreisen(KONFIG_OEFFENTLICH, { ...kopieTestpreise(), uvp: {} }), "uvp.trikot fehlt");
  pruefe("mitPreisen: die übergebene Konfiguration bleibt ohne Preise (neues Objekt)", mitPreisen(KONFIG_OEFFENTLICH, TESTPREISE) !== KONFIG_OEFFENTLICH && KONFIG_OEFFENTLICH.preise === undefined);

  // Rechnung in Cent mit Rabatt 40 % (Grundpreis = Listenpreis × 0,6, gerundet), von Hand: [Kinder, Erwachsene]
  const LISTE = { trikot: [2190, 2540], shorts: [1730, 1980], stutzen: [670, 790], "praesi-jacke": [3840, 4490], "praesi-hose": [2998, 3370], rucksack: [2360, 2360], winterjacke: [5830, 6810], "tw-trikot": [3470, 3720], "tw-hose": [2799, 3160] };
  const GRUND = { trikot: [1314, 1524], shorts: [1038, 1188], stutzen: [402, 474], "praesi-jacke": [2304, 2694], "praesi-hose": [1799, 2022], rucksack: [1416, 1416], winterjacke: [3498, 4086], "tw-trikot": [2082, 2232], "tw-hose": [1679, 1896] };
  for (const id of Object.keys(LISTE)) {
    const gruppen = id === "rucksack" ? ["alle", "alle"] : ["kinder", "erwachsene"];
    gleich(`Listenpreis ${id} Kinder`, String(listenpreisCent(KONFIG, id, gruppen[0])), String(LISTE[id][0]));
    gleich(`Listenpreis ${id} Erwachsene`, String(listenpreisCent(KONFIG, id, gruppen[1])), String(LISTE[id][1]));
    gleich(`Grundpreis ${id} Kinder`, String(grundpreisCent(KONFIG, id, gruppen[0])), String(GRUND[id][0]));
    gleich(`Grundpreis ${id} Erwachsene`, String(grundpreisCent(KONFIG, id, gruppen[1])), String(GRUND[id][1]));
  }
  gleich("Rundung: 29,98 € × 0,6 = 17,988 € › 17,99 € (aufgerundet)", String(grundpreisCent(KONFIG, "praesi-hose", "kinder")), "1799");
  gleich("Rundung: 27,99 € × 0,6 = 16,794 € › 16,79 € (abgerundet)", String(grundpreisCent(KONFIG, "tw-hose", "kinder")), "1679");
  pruefe("Regenjacke: kein Listenpreis, kein Grundpreis, Preis auf Anfrage", listenpreisCent(KONFIG, "regenjacke", "kinder") === null && grundpreisCent(KONFIG, "regenjacke", "erwachsene") === null && istAufAnfrage(KONFIG, "regenjacke") && !istAufAnfrage(KONFIG, "trikot"));
  // Halbe Cent werden aufgerundet (Math.round): Rabatt 35 %, 26,30 € × 0,65 = 17,095 € › 17,10 €; 19,99 € × 0,65 = 12,9935 € › 12,99 €; 23,15 € × 0,65 = 15,0475 € › 15,05 €
  const preise35 = kopieTestpreise();
  preise35.rabattProzent = 35;
  preise35.uvp.trikot.kinder = 26.3;
  preise35.uvp.shorts.kinder = 19.99;
  preise35.uvp.stutzen.kinder = 23.15;
  const konfig35 = mitPreisen(KONFIG_OEFFENTLICH, preise35);
  gleich("Rundung: genau ein halber Cent (17,095 €) wird aufgerundet", String(grundpreisCent(konfig35, "trikot", "kinder")), "1710");
  gleich("Rundung: 12,9935 € › 12,99 €", String(grundpreisCent(konfig35, "shorts", "kinder")), "1299");
  gleich("Rundung: 15,0475 € › 15,05 € (aufgerundet)", String(grundpreisCent(konfig35, "stutzen", "kinder")), "1505");
  gleich("Rabatt 35 % im Text der Preiszeile", preisZeile(konfig35, "trikot", "140", []), "Listenpreis 26,30 € − 35 % = 17,10 €");
  const preise0 = kopieTestpreise();
  preise0.rabattProzent = 0;
  gleich("Rabatt 0 %: Grundpreis = Listenpreis", String(grundpreisCent(mitPreisen(KONFIG_OEFFENTLICH, preise0), "trikot", "kinder")), "2190");
  const preiseKomma = kopieTestpreise();
  preiseKomma.rabattProzent = 12.5;
  gleich("Rabatt mit Nachkommastelle: Komma im Text (12,5 %)", preisZeile(mitPreisen(KONFIG_OEFFENTLICH, preiseKomma), "shorts", "140", []), "Listenpreis 17,30 € − 12,5 % = 15,14 €");
  gleich("Hilfe: zahlDe", zahlDe(40) + "|" + zahlDe(12.5), "40|12,5");

  // Zuschläge und Stückpreise mit Standard-Aufdrucken: [Kinder, Erwachsene]
  gleichJson("Zuschläge als Text", ["W", "V", "SP", "ZG", "N", "ZK"].map((c) => zuschlagText(KONFIG, c)), ["+ 1,05 €", "+ 2,15 €", "+ 2,95 €", "+ 2,45 €", "+ 1,55 €", "+ 1,25 €"]);
  gleichJson("Summe der Zuschläge: Trikot, Trikot ohne Sponsorlogo, Präsi-Jacke, Rucksack, Winterjacke, Regenjacke, leer", [STANDARD.trikot, ["W", "V", "ZG"], STANDARD["praesi-jacke"], STANDARD.rucksack, STANDARD.winterjacke, STANDARD.regenjacke, []].map((c) => zuschlagSumme(KONFIG, c)), [860, 565, 600, 105, 495, 445, 0]);
  const STUECK = { trikot: [2174, 2384], shorts: [1038, 1188], stutzen: [402, 474], "praesi-jacke": [2904, 3294], "praesi-hose": [1799, 2022], rucksack: [1521, 1521], winterjacke: [3993, 4581], "tw-trikot": [2942, 3092], "tw-hose": [1679, 1896] };
  for (const [id, [kind, erw]] of Object.entries(STUECK)) {
    const kindGroesse = id === "stutzen" ? "M (Junior)" : id === "rucksack" ? "Einheitsgröße" : "140";
    const erwGroesse = id === "stutzen" ? "L (Senior)" : id === "rucksack" ? "Einheitsgröße" : "M";
    const s1 = stueckpreis(KONFIG, id, kindGroesse, STANDARD[id]);
    const s2 = stueckpreis(KONFIG, id, erwGroesse, STANDARD[id]);
    gleich(`Stückpreis ${id} Kinder mit Standard-Aufdrucken`, String(s1.cent), String(kind));
    gleich(`Stückpreis ${id} Erwachsene mit Standard-Aufdrucken`, String(s2.cent), String(erw));
    pruefe(`Stückpreis ${id}: Grundpreis + Zuschlag = Stückpreis, nur ganze Cent`, s1.cent === s1.grundCent + s1.zuschlagCent && [s1.listeCent, s1.grundCent, s1.zuschlagCent, s1.cent, s2.cent].every(Number.isInteger));
  }
  gleich("Stutzen S (Bambini) gilt als Kindergröße", String(stueckpreis(KONFIG, "stutzen", "S (Bambini)", []).cent), "402");
  gleich("ohne Aufdrucke nur der Grundpreis", String(stueckpreis(KONFIG, "trikot", "140", []).cent), "1314");
  gleich("ein Aufdruck: Wappen (1,05 €) dazu", String(stueckpreis(KONFIG, "trikot", "140", ["W"]).cent), "1419");
  gleichJson("Stückpreis: Bestandteile Trikot 140 mit Standard", (({ listeCent, grundCent, zuschlagCent, cent, anfrage }) => ({ listeCent, grundCent, zuschlagCent, cent, anfrage }))(stueckpreis(KONFIG, "trikot", "140")), { listeCent: 2190, grundCent: 1314, zuschlagCent: 860, cent: 2174, anfrage: false });
  gleichJson("Stückpreis: Regenjacke ist „Preis auf Anfrage“ (die Aufdrucke zählen nicht)", stueckpreis(KONFIG, "regenjacke", "M"), { anfrage: true, zuschlagCent: 445 });
  pruefe("Stückpreis: ohne Größe, mit unbekannter Größe, ohne Preisdaten › null", stueckpreis(KONFIG, "trikot", "") === null && stueckpreis(KONFIG, "trikot", "999") === null && stueckpreis(KONFIG_OEFFENTLICH, "trikot", "140") === null);

  // Anzeige
  gleich("Preisanzeige mit Größe (Standard-Aufdrucke)", preisText(KONFIG, "trikot", "140"), "21,74 €");
  gleich("Preisanzeige Erwachsene", preisText(KONFIG, "trikot", "M"), "23,84 €");
  gleich("Preisanzeige ohne Größe: verschiedene Preise › „ab“", preisText(KONFIG, "trikot", ""), "ab 21,74 €");
  gleich("Preisanzeige ohne Größe: Shorts", preisText(KONFIG, "shorts", ""), "ab 10,38 €");
  gleich("Preisanzeige ohne Größe: Rucksack hat nur einen Preis", preisText(KONFIG, "rucksack", ""), "15,21 €");
  gleich("Preisanzeige ohne Größe: Stutzen", preisText(KONFIG, "stutzen", ""), "ab 4,02 €");
  const gleichePreise = kopieTestpreise();
  gleichePreise.uvp.shorts = { kinder: 17.3, erwachsene: 17.3 };
  gleich("Preisanzeige ohne Größe: gleicher Preis für alle Größen", preisText(mitPreisen(KONFIG_OEFFENTLICH, gleichePreise), "shorts", ""), "10,38 €");
  gleich("Preisanzeige mit einem Aufdruck", preisText(KONFIG, "trikot", "140", ["W"]), "14,19 €");
  gleich("Preisanzeige ohne Aufdrucke", preisText(KONFIG, "trikot", "140", []), "13,14 €");
  gleich("Preisanzeige ohne Größe, mit einem Aufdruck: „ab“", preisText(KONFIG, "trikot", "", ["W"]), "ab 14,19 €");
  gleich("Regenjacke: „Preis auf Anfrage“ mit und ohne Größe", preisText(KONFIG, "regenjacke", "M") + "|" + preisText(KONFIG, "regenjacke", ""), `${PREIS_AUF_ANFRAGE}|${PREIS_AUF_ANFRAGE}`);
  gleich("Preisanzeige ohne Preisdaten bleibt leer", preisText(KONFIG_OEFFENTLICH, "trikot", "140"), "");
  gleich("Preiszeile Trikot mit Standard-Aufdrucken", preisZeile(KONFIG, "trikot", "140"), "Listenpreis 21,90 € − 40 % = 13,14 € · Aufdrucke + 8,60 €");
  gleich("Preiszeile Trikot Erwachsene", preisZeile(KONFIG, "trikot", "M"), "Listenpreis 25,40 € − 40 % = 15,24 € · Aufdrucke + 8,60 €");
  gleich("Preiszeile Trikot ohne Aufdrucke: ohne „Aufdrucke“", preisZeile(KONFIG, "trikot", "140", []), "Listenpreis 21,90 € − 40 % = 13,14 €");
  gleich("Preiszeile Shorts (kein Aufdruck möglich)", preisZeile(KONFIG, "shorts", "140"), "Listenpreis 17,30 € − 40 % = 10,38 €");
  gleich("Preiszeile Regenjacke", preisZeile(KONFIG, "regenjacke", "M"), PREIS_AUF_ANFRAGE);
  gleich("Preiszeile ohne Größe bleibt leer", preisZeile(KONFIG, "trikot", ""), "");
  gleich("Summe ohne Stück ohne Preis", summeText(4838, []), "48,38 €");
  gleich("Summe mit Regenjacke", summeText(4838, ["Regenjacke"]), "48,38 € (ohne Regenjacke, Preis auf Anfrage)");
  gleich("Summe mit zwei Artikeln ohne Preis", summeText(4838, ["Regenjacke", "Mütze"]), "48,38 € (ohne Regenjacke und Mütze, Preis auf Anfrage)");
  gleich("Quelle der Preise aus den Daten", preisQuelle(KONFIG), "Preise laut Angebot 11Teamsport vom 24.11.2026");
  gleich("Quelle der Preise ohne Preisdaten", preisQuelle(KONFIG_OEFFENTLICH), "Preise laut Angebot");
  gleich("Fußzeile aus den Daten", preisFussText(KONFIG), "Preise laut Angebot 11Teamsport vom 24.11.2026 (Listenpreis − 40 %, Aufdrucke einzeln).");

  // Die Summen einer Bestellung (a)
  const z = zusammenfassung(KONFIG, FALL_A.bestellung);
  gleich("Summe der Referenzbestellung", formatEuro(z.summeCent), "155,41 €");
  gleichJson("Referenzbestellung: Stücke ohne Preis", z.ohnePreis, ["Regenjacke"]);
  gleichJson("Referenzbestellung: Stücke ohne Preis je Person", z.personen.map((p) => p.ohnePreis), [[], [], ["Regenjacke"]]);
  gleich("Referenzbestellung: Regenjacke zählt bei den Teilen (11)", String(z.teile), "11");
  gleich("Preisanzeige der Regenjacke in der Zusammenfassung: kein Betrag", String(z.personen[2].zeilen.find((x) => x.artikel.id === "regenjacke").cent), "null");
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
  pruefe(`(${id}) ${fall.titel}: Lieferung an steht direkt nach „Bestellt von“`, (() => { const z = zeilen(m.text); const i = z.findIndex((x) => x.startsWith("Bestellt von: ")); return z[i + 1].startsWith("Lieferung an: "); })());
}
{
  const z = zusammenfassung(KONFIG, FALL_A.bestellung);
  gleich("(a) Teile", String(z.teile), "11");
  gleich("(a) Summe", formatEuro(z.summeCent), "155,41 €");
  gleich("(a) Personen", String(z.personen.length), "3");
  gleich("(a) Sponsorlogo trägt (Mia und Ben, nicht Emil)", String(z.sponsorStuecke), "2");
  gleich("(a) Blöcke für den Lieferanten (Trikot der Kinder zweimal: mit und ohne Sponsorlogo)", String(z.bloecke.length), "9");
  gleichJson("(a) Menge je Block", z.bloecke.map((b) => [b.artikel.id, b.variante.fuer, b.aufdrucke.length, b.menge]), [
    ["trikot", "kinder", 4, 1], ["trikot", "kinder", 3, 1], ["trikot", "erwachsene", 4, 1], ["shorts", "kinder", 0, 2], ["stutzen", "alle", 0, 2],
    ["praesi-jacke", "kinder", 4, 1], ["praesi-hose", "kinder", 0, 1], ["rucksack", "alle", 1, 1], ["regenjacke", "alle", 3, 1],
  ]);
  gleich("(a) Betrag je Person", z.personen.map((p) => formatEuro(p.summeCent)).join(" | "), "98,38 € | 33,19 € | 23,84 €");
  // Die Liste je Person und der Sponsor gehen nie an den Lieferanten: Namen stehen nur in Druckdaten und im internen Teil, Preise und Sponsor nur im internen Teil
  const m = mail(FALL_A.bestellung, FALL_A.jetzt).text;
  const teil1 = m.slice(m.indexOf("== 1."), m.indexOf("== 2."));
  const teil3 = m.slice(m.indexOf("== 3."));
  pruefe("(a) Teil 1 für den Lieferanten enthält keine Preise, keinen Sponsor und kein „Zuordnung“", !/€|Zuordnung|Eltern bzw|Autohaus|Frau Beispiel|autohaus|Sponsor \(|Firma/.test(teil1.replace("Werbeaufdruck M 1C (Sponsorlogo)", "")), teil1);
  pruefe("(a) Teil 1 nennt Emil und Ben Kuhn nicht (nur Stücke mit Daten tragen einen Namen)", !teil1.includes("Emil") && !teil1.includes("Ben Kuhn"));
  pruefe("(a) Teil 1: die Lieferanschrift steht direkt unter „Dieser Teil kann so weitergeleitet werden.“ (nach einer Leerzeile)", teil1.includes("Dieser Teil kann so weitergeleitet werden.\n\nLieferanschrift:\nLena Beispiel\nBeispielweg 12\n60439 Frankfurt\n\nJAKO One T-Shirt Kids"));
  pruefe("(a) Teil 3 steht ganz unten mit „NICHT WEITERLEITEN“", teil3.startsWith("== 3. NUR INTERN – NICHT WEITERLEITEN =="));
  pruefe("(a) Teil 3: der Block „Sponsor“ steht vor der Zuordnung", teil3.indexOf("Sponsor (für die Geschäftsstelle):") > 0 && teil3.indexOf("Sponsor (für die Geschäftsstelle):") < teil3.indexOf("Zuordnung je Person"));
  pruefe("(a) Teil 2 und Kopf enthalten keine Preise", !/€/.test(m.slice(0, m.indexOf("== 3."))));
}

// ---------- (d) 116 und Winterjacke ----------

abschnitt("(d) Winterjacke bei Größe 116");
{
  const b = klein({ personen: [person("p1", "Leo", "5", "116", ["winterjacke"])], zaehler: 1 });
  const text = mail(b).text;
  pruefe("(d) Lieferant: Gr. 128", text.includes("JAKO Team Coach Kapuzenjacke Kids Blau F400 (7103)\nDruck: Vereinsnamen XL (SPEUZER), Spielernamen S, Initialen / Zahlen 2-5cm\n- Gr. 128: 1 Stück\n"), text);
  pruefe("(d) kein Gr. 116 beim Lieferanten", !text.includes("- Gr. 116"));
  pruefe("(d) Druckdaten mit Gr. 128", text.includes("- Winterjacke 7103, Gr. 128: Name „Leo“, Nr. 5\n"));
  pruefe("(d) intern ohne Zusatz (128 ist die Vorauswahl), Größe der Person 116, Kinderpreis mit Standard-Aufdrucken", text.includes("- Leo, Nr. 5, Gr. 116: Winterjacke 39,93 € = 39,93 €\n"), text);
  const eigen = klein({ personen: [person("p1", "Leo", "5", "116", ["winterjacke"], { winterjacke: "140" })], zaehler: 1 });
  const text2 = mail(eigen).text;
  pruefe("(d) eigene Wahl 140: Lieferant Gr. 140, intern mit Zusatz", text2.includes("- Gr. 140: 1 Stück") && text2.includes("- Leo, Nr. 5, Gr. 116: Winterjacke (Gr. 140) 39,93 € = 39,93 €"), text2);
  pruefe("(d) Winterjacke hat keine Größe 116", !katalogVon(KONFIG).nachId.get("winterjacke").groessenNachWert.has("116"));
  const gross = klein({ personen: [person("p1", "Uwe", "12", "XL", ["winterjacke"])], zaehler: 1 });
  pruefe("(d) Erwachsene: Bezeichnung ohne Kids, Gr. XL, Erwachsenenpreis", mail(gross).text.includes("JAKO Team Coach Kapuzenjacke Blau F400 (7103)\n") && mail(gross).text.includes("- Gr. XL: 1 Stück") && mail(gross).text.includes("- Uwe, Nr. 12, Gr. XL: Winterjacke 45,81 € = 45,81 €"));
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
  pruefe("(e) intern: Preis auf Anfrage, die Summe nennt es", text.includes("- Ben Kuhn, Gr. 152: Regenjacke (Preis auf Anfrage) = 0,00 € (ohne Regenjacke, Preis auf Anfrage)\nSumme Kleidung: 0,00 € (ohne Regenjacke, Preis auf Anfrage)\n"), text);
  const eigen = klein({ personen: [person("p1", "Ben Kuhn", "", "152", ["regenjacke"], {}, "bk")], zaehler: 1 });
  pruefe("(e) eigene Initialen genau wie eingegeben („bk“, ohne Großschreibung)", mail(eigen).text.includes("- Regenjacke 7302, Gr. 152: Initialen „bk“\n"));
  // Kinder und Erwachsene in einem Block („eine Bezeichnung“), Größen in Leiterreihenfolge
  const gemischt = klein({ personen: [person("p1", "Ada", "", "M", ["regenjacke"]), person("p2", "Bo", "", "152", ["regenjacke"])], zaehler: 2 });
  pruefe("(e) Kinder- und Erwachsenengrößen im selben Block, Kinder zuerst", mail(gemischt).text.includes("(7302)\nDruck: Vereinswappen einfarbig, Vereinsnamen XL (SPEUZER), Initialen / Zahlen 2-5cm\n- Gr. 152: 1 Stück\n- Gr. M: 1 Stück\n"));
}

// ---------- (f) Bezahlung ----------

abschnitt("(f) Bezahlung");
{
  // Shorts tragen keinen Aufdruck: Der Block „Sponsor“ erscheint hier nur durch die Antwort „Sponsor“
  const mia = [person("p1", "Mia", "7", "140", ["shorts"])];
  const b = klein({
    personen: mia,
    zaehler: 1,
    teambedarf: { baelle: { n: 2, details: "" } },
    bezahlung: { kleidung: ["sponsor"], teambedarf: ["sponsor"] },
    sponsor: { ...FIRMA, firma: "  Autohaus\nBeispiel " },
  });
  const m = mail(b);
  pruefe("(f) Bezahlung Kleidung: Sponsor allein steht als „Sponsor (Firma)“", zeilen(m.text).includes("Bezahlung Kleidung: Sponsor (Autohaus Beispiel)"), m.text);
  pruefe("(f) Bezahlung Teambedarf: dieselbe Firma aus dem einen Block „Sponsor“, in einer Zeile", zeilen(m.text).includes("Bezahlung Teambedarf: Sponsor (Autohaus Beispiel)"));
  pruefe("(f) die alte Schreibweise „Sponsor: Name“ gibt es nicht mehr", !m.text.includes("Sponsor: "));
  pruefe("(f) der Block „Sponsor“ steht in Teil 3, ohne Sponsorlogo-Zeile (kein Stück trägt es)", m.text.includes("== 3. NUR INTERN – NICHT WEITERLEITEN ==\nSponsor (für die Geschäftsstelle):\nFirma: Autohaus Beispiel\n\nZuordnung je Person") && !m.text.includes("Sponsorlogo:"), m.text);
  gleichJson("(f) mit Firma keine Lücken", pruefeBestellung(KONFIG, b), []);
  for (const [id, text] of [["eltern", "Eltern bzw. Spieler"], ["vereinskasse", "Vereinskasse"], ["spenden", "Spenden / Mannschaftskasse"]]) {
    const x = mail(klein({ personen: mia, zaehler: 1, bezahlung: { kleidung: [id], teambedarf: [] } }));
    pruefe(`(f) Bezahlung ${id}: eine Antwort, ohne „und“`, zeilen(x.text).includes("Bezahlung Kleidung: " + text));
    pruefe(`(f) Bezahlung ${id}: kein Block „Sponsor“`, !x.text.includes("Sponsor"));
  }
  const ohneName = mail(klein({ personen: mia, zaehler: 1, bezahlung: { kleidung: ["sponsor"], teambedarf: [] } }));
  pruefe("(f) Sponsor ohne Firma: Zeile nur „Sponsor“, im Block „Firma: (fehlt noch)“ (die Prüfung lässt es nicht zu)", zeilen(ohneName.text).includes("Bezahlung Kleidung: Sponsor") && zeilen(ohneName.text).includes(`Firma: ${FEHLT}`));
  // Die Zeile „Bezahlung Teambedarf“ gibt es nur mit Teambedarf, „Bezahlung Kleidung“ nur mit Kleidung
  const nurKleidung = mail(klein({ personen: mia, zaehler: 1, bezahlung: { kleidung: ["eltern"], teambedarf: ["vereinskasse"] } }));
  pruefe("(f) ohne Teambedarf keine Zeile „Bezahlung Teambedarf“", !nurKleidung.text.includes("Bezahlung Teambedarf"));
  const nurTeam = mail(klein({ teambedarf: { baelle: { n: 2, details: "" } }, bezahlung: { kleidung: ["eltern"], teambedarf: ["vereinskasse"] } }));
  pruefe("(f) ohne Kleidung keine Zeile „Bezahlung Kleidung“", !nurTeam.text.includes("Bezahlung Kleidung") && nurTeam.text.includes("Bezahlung Teambedarf: Vereinskasse"));
}

// ---------- (k) zwei Antworten, auch mit Sponsor ----------

abschnitt("(k) zwei Antworten mit Sponsor");
{
  // Die Referenzbestellung (a) hat Eltern + Sponsor. Nur Eltern: nur diese Zeile ändert sich; der Block „Sponsor“ bleibt, weil Stücke das Sponsorlogo tragen.
  const nurEltern = bestellung({ ...FALL_A.bestellung, bezahlung: { kleidung: ["eltern"], teambedarf: ["vereinskasse"] } });
  const erwartet = FALL_A.text.replace("Bezahlung Kleidung: Eltern bzw. Spieler und Sponsor (Autohaus Beispiel)\n", "Bezahlung Kleidung: Eltern bzw. Spieler\n");
  pruefe("(k) die Vorlage hat die Zeile, die ersetzt wird", erwartet !== FALL_A.text);
  gleich("(k) nur Eltern: ganzer Text wie (a), nur die Zeile „Bezahlung Kleidung“ ist anders (der Block Sponsor bleibt wegen der Sponsorlogos)", mail(nurEltern, FALL_A.jetzt).text, erwartet);
  gleich("(k) Eltern + Sponsor: Betreff wie (a)", mail(FALL_A.bestellung, FALL_A.jetzt).betreff, FALL_A.betreff);
  gleichJson("(k) Eltern + Sponsor mit Firma: keine Lücken", pruefeBestellung(KONFIG, FALL_A.bestellung), []);
  pruefe("(k) die Zeile „Bezahlung Teambedarf: Vereinskasse“ bleibt", zeilen(mail(FALL_A.bestellung, FALL_A.jetzt).text).includes("Bezahlung Teambedarf: Vereinskasse"));
  // Weitere Paare, in Katalogreihenfolge (Eltern, Vereinskasse, Sponsor, Spenden), egal in welcher Reihenfolge sie ankommen
  const zeile = (ids, name = "Autohaus Beispiel") =>
    zeilen(mail(klein({ personen: [person("p1", "Mia", "7", "140", ["shorts"])], zaehler: 1, bezahlung: { kleidung: ids, teambedarf: [] }, sponsor: { ...FIRMA, firma: name } })).text).find((z) => z.startsWith("Bezahlung Kleidung: "));
  gleich("(k) Sponsor + Spenden", zeile(["sponsor", "spenden"]), "Bezahlung Kleidung: Sponsor (Autohaus Beispiel) und Spenden / Mannschaftskasse");
  gleich("(k) Vereinskasse + Sponsor", zeile(["vereinskasse", "sponsor"]), "Bezahlung Kleidung: Vereinskasse und Sponsor (Autohaus Beispiel)");
  gleich("(k) Eltern + Spenden (ohne Sponsor, die Firma im Entwurf zählt nicht)", zeile(["eltern", "spenden"]), "Bezahlung Kleidung: Eltern bzw. Spieler und Spenden / Mannschaftskasse");
  gleich("(k) Reihenfolge der Eingabe ist egal", zeile(["sponsor", "eltern"]), zeile(["eltern", "sponsor"]));
  gleich("(k) Eltern + Vereinskasse", zeile(["eltern", "vereinskasse"]), "Bezahlung Kleidung: Eltern bzw. Spieler und Vereinskasse");
  // Zwei Antworten im Teambedarf: Es gibt nur einen Block „Sponsor“, die Firma steht in beiden Zeilen
  const tb = mail(klein({ personen: [person("p1", "Mia", "7", "140", ["shorts"])], zaehler: 1, teambedarf: { baelle: { n: 2, details: "" } }, bezahlung: { kleidung: ["eltern"], teambedarf: ["sponsor", "spenden"] }, sponsor: { ...FIRMA, firma: "Bäckerei  Beispiel" } })).text;
  pruefe("(k) Teambedarf: zwei Antworten mit der Firma aus dem Block „Sponsor“", zeilen(tb).includes("Bezahlung Teambedarf: Sponsor (Bäckerei Beispiel) und Spenden / Mannschaftskasse") && zeilen(tb).includes("Bezahlung Kleidung: Eltern bzw. Spieler"), tb);
}

// ---------- (l) drei und mehr Antworten ----------

abschnitt("(l) drei und mehr Antworten");
{
  const mia = [person("p1", "Mia", "7", "140", ["shorts"])];
  const kleidung = (ids, name = "Autohaus Beispiel") => zeilen(mail(klein({ personen: mia, zaehler: 1, bezahlung: { kleidung: ids, teambedarf: [] }, sponsor: { ...FIRMA, firma: name } })).text).find((z) => z.startsWith("Bezahlung Kleidung: "));
  gleich("(l) drei Antworten: „A, B und C“", kleidung(["eltern", "vereinskasse", "spenden"]), "Bezahlung Kleidung: Eltern bzw. Spieler, Vereinskasse und Spenden / Mannschaftskasse");
  gleich("(l) drei Antworten mit Sponsor am Ende", kleidung(["eltern", "vereinskasse", "sponsor"]), "Bezahlung Kleidung: Eltern bzw. Spieler, Vereinskasse und Sponsor (Autohaus Beispiel)");
  gleich("(l) drei Antworten mit Sponsor in der Mitte", kleidung(["eltern", "sponsor", "spenden"]), "Bezahlung Kleidung: Eltern bzw. Spieler, Sponsor (Autohaus Beispiel) und Spenden / Mannschaftskasse");
  gleich("(l) vier Antworten: „A, B, C und D“ (Katalogreihenfolge, Sponsor an dritter Stelle)", kleidung(["eltern", "vereinskasse", "sponsor", "spenden"]), "Bezahlung Kleidung: Eltern bzw. Spieler, Vereinskasse, Sponsor (Autohaus Beispiel) und Spenden / Mannschaftskasse");
  gleich("(l) Reihenfolge der Eingabe ist egal", kleidung(["spenden", "sponsor", "vereinskasse", "eltern"]), kleidung(["eltern", "vereinskasse", "sponsor", "spenden"]));
  gleich("(l) doppelte Einträge zählen einmal", kleidung(["eltern", "eltern", "spenden", "spenden"]), "Bezahlung Kleidung: Eltern bzw. Spieler und Spenden / Mannschaftskasse");
  // Der ganze Text von (b) (nur Teambedarf) mit drei Antworten
  const dreiTb = bestellung({ ...FALL_B.bestellung, bezahlung: { kleidung: [], teambedarf: ["eltern", "vereinskasse", "spenden"] } });
  gleich("(l) Fall (b) mit drei Antworten: nur die Zeile „Bezahlung Teambedarf“ ist anders", mail(dreiTb, FALL_B.jetzt).text, FALL_B.text.replace("Bezahlung Teambedarf: Spenden / Mannschaftskasse\n", "Bezahlung Teambedarf: Eltern bzw. Spieler, Vereinskasse und Spenden / Mannschaftskasse\n"));
  // Die Aufzählung selbst
  gleich("(l) verbindeDeutsch: keine Angabe", verbindeDeutsch([]), "");
  gleich("(l) verbindeDeutsch: eine", verbindeDeutsch(["A"]), "A");
  gleich("(l) verbindeDeutsch: zwei", verbindeDeutsch(["A", "B"]), "A und B");
  gleich("(l) verbindeDeutsch: drei", verbindeDeutsch(["A", "B", "C"]), "A, B und C");
  gleich("(l) verbindeDeutsch: vier", verbindeDeutsch(["A", "B", "C", "D"]), "A, B, C und D");
}

// ---------- (m) Lücke ohne Haken ----------

abschnitt("(m) Lücke, wenn kein Haken gesetzt ist");
{
  // Shorts tragen keinen Aufdruck, also löst nur die Antwort „Sponsor“ den Block „Sponsor“ aus
  const mia = [person("p1", "Mia", "7", "140", ["shorts"])];
  const luecken = (bezahlung, extra = {}) => pruefeBestellung(KONFIG, klein({ personen: mia, zaehler: 1, bezahlung: { kleidung: [], teambedarf: [], ...bezahlung }, ...extra }));
  gleichJson("(m) Kleidung ohne Haken", luecken({}), [{ feld: "bezahlung:kleidung", text: "Bitte wähle, wer die Kleidung zahlt" }]);
  gleichJson("(m) Teambedarf ohne Haken", luecken({ kleidung: ["eltern"] }, { teambedarf: { baelle: { n: 1, details: "" } } }), [{ feld: "bezahlung:teambedarf", text: "Bitte wähle, wer den Teambedarf zahlt" }]);
  gleichJson("(m) beide Blöcke ohne Haken (Kleidung zuerst)", luecken({}, { teambedarf: { baelle: { n: 1, details: "" } } }).map((l) => l.feld), ["bezahlung:kleidung", "bezahlung:teambedarf"]);
  gleichJson("(m) nur Teambedarf: nur dessen Block wird verlangt", pruefeBestellung(KONFIG, bestellung({ team: "d1", name: "Tina", ...ANSCHRIFT, teambedarf: { baelle: { n: 1, details: "" } } })).map((l) => l.feld), ["bezahlung:teambedarf"]);
  gleichJson("(m) ein Haken genügt", luecken({ kleidung: ["spenden"] }), []);
  gleichJson("(m) unbekannte ids zählen nicht als Haken", luecken({ kleidung: ["bar", "x"] }).map((l) => l.feld), ["bezahlung:kleidung"]);
  // Sponsor angehakt: die Firma ist Pflicht (Leerzeichen zählen nicht), auch neben anderen Antworten
  gleichJson("(m) Sponsor allein ohne Firma", luecken({ kleidung: ["sponsor"] }), [{ feld: "sponsor:firma", text: "Bitte trage die Firma des Sponsors ein" }]);
  gleichJson("(m) Eltern + Sponsor ohne Firma (nur Leerzeichen)", luecken({ kleidung: ["eltern", "sponsor"] }, { sponsor: { ...FIRMA, firma: "   " } }).map((l) => l.feld), ["sponsor:firma"]);
  gleichJson("(m) Eltern + Sponsor mit Firma", luecken({ kleidung: ["eltern", "sponsor"] }, { sponsor: FIRMA }), []);
  gleichJson("(m) Sponsor im Teambedarf ohne Firma", luecken({ kleidung: ["eltern"], teambedarf: ["vereinskasse", "sponsor"] }, { teambedarf: { baelle: { n: 1, details: "" } } }), [{ feld: "sponsor:firma", text: "Bitte trage die Firma des Sponsors ein" }]);
  gleichJson("(m) Sponsor im Teambedarf und in der Kleidung ohne Firma: eine Lücke", luecken({ kleidung: ["sponsor"], teambedarf: ["sponsor"] }, { teambedarf: { baelle: { n: 1, details: "" } } }).map((l) => l.feld), ["sponsor:firma"]);
  // Haken weg: Block und Lücke verschwinden, die Firma darf im Entwurf bleiben, steht aber nicht in der Mail
  gleichJson("(m) Sponsor abgewählt: keine Lücke, auch ohne Firma", luecken({ kleidung: ["eltern"] }), []);
  const mitNameOhneHaken = klein({ personen: mia, zaehler: 1, bezahlung: { kleidung: ["eltern"], teambedarf: [] }, sponsor: FIRMA });
  gleichJson("(m) Firma bei abgewähltem Sponsor: keine Lücke", pruefeBestellung(KONFIG, mitNameOhneHaken), []);
  const mailOhneHaken = mail(mitNameOhneHaken);
  pruefe("(m) Firma bei abgewähltem Sponsor: nicht in der Mail, kein Block „Sponsor“", !mailOhneHaken.text.includes("Autohaus") && !mailOhneHaken.mailto.includes("Autohaus") && zeilen(mailOhneHaken.text).includes("Bezahlung Kleidung: Eltern bzw. Spieler") && !mailOhneHaken.text.includes("Sponsor"));
  const nurSponsorName = mail(klein({ personen: mia, zaehler: 1, bezahlung: { kleidung: ["spenden"], teambedarf: [] }, sponsor: FIRMA }));
  pruefe("(m) Firma im Entwurf, Sponsor nicht gewählt: Zeile nur mit der gewählten Antwort", zeilen(nurSponsorName.text).includes("Bezahlung Kleidung: Spenden / Mannschaftskasse") && !nurSponsorName.text.includes("Sponsor ("));
  // In der Vorschau ohne Haken fehlt die Zeile einfach (gesendet wird nicht)
  pruefe("(m) ohne Haken keine Zeile „Bezahlung Kleidung“ in der Vorschau", !mail(klein({ personen: mia, zaehler: 1, bezahlung: { kleidung: [], teambedarf: [] } })).text.includes("Bezahlung Kleidung"));
}

// ---------- (n) alter Entwurf aus den ersten Fassungen ----------

abschnitt("(n) alter Entwurf (Text je Block, kleidungSponsor, keine Aufdrucke, keine Lieferanschrift) lädt mit Standard-Aufdrucken");
{
  // So lagen Entwürfe in den ersten Fassungen auf den Geräten: ein Text je Block, ein Name je Block, keine Aufdrucke je Artikel, kein Block „Sponsor“,
  // keine Lieferanschrift
  const alt = (kleidung, teambedarf, kleidungSponsor = "", teambedarfSponsor = "") => {
    const e = JSON.parse(JSON.stringify(FALL_A.bestellung));
    delete e.lieferName;
    delete e.lieferStrasse;
    delete e.lieferOrt;
    delete e.sponsor;
    for (const p of e.personen) for (const a of Object.values(p.artikel)) delete a.aufdrucke;
    e.bezahlung = { kleidung, kleidungSponsor, teambedarf, teambedarfSponsor };
    return e;
  };
  // Erwartet: wie (a), aber mit Standard-Aufdrucken (auch bei Emil), nur die Firma als Sponsor und ohne Lieferanschrift
  const erwartet = bestellung({
    ...FALL_A.bestellung,
    lieferStrasse: "",
    lieferOrt: "",
    personen: FALL_A.bestellung.personen.map((p) => ({ ...p, artikel: Object.fromEntries(Object.keys(p.artikel).map((id) => [id, { groesse: p.artikel[id].groesse, aufdrucke: STANDARD[id].slice() }])) })),
    sponsor: { ...FIRMA },
    bezahlung: { kleidung: ["eltern", "sponsor"], teambedarf: ["vereinskasse"] },
  });
  const geladen = bereinigeEntwurf(alt(["eltern", "sponsor"], "vereinskasse", "Autohaus Beispiel"), KONFIG);
  gleichJson("(n) alter Entwurf: lädt mit Standard-Aufdrucken, Sponsor als Firma übernommen, Listen bei der Bezahlung", geladen, erwartet);
  gleichJson("(n) alter Entwurf: Emils Trikot trägt jetzt das Sponsorlogo (Standard)", geladen.personen[1].artikel.trikot.aufdrucke, ["W", "V", "SP", "ZG"]);
  gleichJson("(n) alter Entwurf: die Lieferanschrift fehlt (zwei Lücken), der Name der Lieferung folgt „Dein Name“", [geladen.lieferName, pruefeBestellung(KONFIG, geladen).map((l) => l.feld)], [null, ["lieferStrasse", "lieferOrt"]]);
  // Text statt Liste: wie die Liste
  const text = bereinigeEntwurf(alt("eltern", "vereinskasse"), KONFIG);
  gleichJson("(n) Text wird Liste: eltern › [eltern], vereinskasse › [vereinskasse]", text.bezahlung, { kleidung: ["eltern"], teambedarf: ["vereinskasse"] });
  gleichJson("(n) ohne Sponsor: die Firma bleibt leer", text.sponsor, { firma: "", ansprechpartner: "", email: "", telefon: "", anschrift: "" });
  // Der Sponsor aus der ersten Fassung (ein Name je Block): Kleidung gewinnt, sonst der Name des Teambedarfs
  gleich("(n) Name nur bei der Kleidung › Firma", bereinigeEntwurf(alt("sponsor", "spenden", "Autohaus Beispiel"), KONFIG).sponsor.firma, "Autohaus Beispiel");
  gleich("(n) Name nur beim Teambedarf › Firma", bereinigeEntwurf(alt("eltern", "sponsor", "", "Bäckerei Beispiel"), KONFIG).sponsor.firma, "Bäckerei Beispiel");
  gleich("(n) zwei Namen: die Kleidung gewinnt", bereinigeEntwurf(alt("sponsor", "sponsor", "Autohaus Beispiel", "Bäckerei Beispiel"), KONFIG).sponsor.firma, "Autohaus Beispiel");
  gleich("(n) Kleidung nur mit Leerzeichen: der Name des Teambedarfs", bereinigeEntwurf(alt("sponsor", "sponsor", "   ", "Bäckerei Beispiel"), KONFIG).sponsor.firma, "Bäckerei Beispiel");
  {
    const mitBeiden = alt("sponsor", "sponsor", "Autohaus Beispiel", "Bäckerei Beispiel");
    mitBeiden.sponsor = { firma: "Eigene Firma", ansprechpartner: "Frau Beispiel" };
    const x = bereinigeEntwurf(mitBeiden, KONFIG);
    gleich("(n) eine Firma im neuen Block geht den alten Namen vor", x.sponsor.firma + "|" + x.sponsor.ansprechpartner, "Eigene Firma|Frau Beispiel");
    pruefe("(n) die alten Felder kleidungSponsor und teambedarfSponsor gibt es nach dem Laden nicht mehr", !("kleidungSponsor" in x.bezahlung) && !("teambedarfSponsor" in x.bezahlung));
  }
  // Mit Sponsor: derselbe Text wie mit dem neuen Entwurf
  const sponsorAlt = bereinigeEntwurf(alt("sponsor", "spenden", "Autohaus Beispiel"), KONFIG);
  const sponsorNeu = bestellung({ ...erwartet, bezahlung: { kleidung: ["sponsor"], teambedarf: ["spenden"] } });
  gleichJson("(n) alter Entwurf mit Sponsor: Text wird [sponsor], die Firma bleibt", sponsorAlt.bezahlung, sponsorNeu.bezahlung);
  gleich("(n) alter Entwurf mit Sponsor: dieselbe Mail wie der neue Entwurf", mail(sponsorAlt, FALL_A.jetzt).text, mail(sponsorNeu, FALL_A.jetzt).text);
  pruefe("(n) alter Entwurf mit Sponsor: „Sponsor (Autohaus Beispiel)“ in der Mail", zeilen(mail(sponsorAlt, FALL_A.jetzt).text).includes("Bezahlung Kleidung: Sponsor (Autohaus Beispiel)"));
  // Leer und unbekannt
  gleichJson("(n) leerer Text › leere Liste", bereinigeEntwurf(alt("", ""), KONFIG).bezahlung, { kleidung: [], teambedarf: [] });
  gleichJson("(n) unbekannte id als Text › leere Liste", bereinigeEntwurf(alt("bar", "x"), KONFIG).bezahlung, { kleidung: [], teambedarf: [] });
  gleichJson("(n) Liste mit Unbekanntem, Doppeltem und falscher Reihenfolge › Katalogreihenfolge, nur Bekanntes", bereinigeEntwurf(alt(["spenden", "bar", "eltern", "eltern", 5, null, ["sponsor"]], ["sponsor", "vereinskasse"], "S"), KONFIG).bezahlung, { kleidung: ["eltern", "spenden"], teambedarf: ["vereinskasse", "sponsor"] });
  for (const [name, wert] of [["fehlt", undefined], ["null", null], ["Zahl", 7], ["Objekt", { eltern: true }], ["Wahrheitswert", true]]) {
    gleichJson(`(n) Wert ${name} › leere Liste (kein Fehler)`, bereinigeEntwurf(alt(wert, wert), KONFIG).bezahlung.kleidung, []);
  }
  gleichJson("(n) fehlender Schlüssel „bezahlung“ › beide Listen leer", bereinigeEntwurf({ team: "d3", name: "Lena" }, KONFIG).bezahlung, { kleidung: [], teambedarf: [] });
  gleichJson("(n) ganzer Block „bezahlung“ kaputt (Text statt Objekt) › beide Listen leer", bereinigeEntwurf({ team: "d3", bezahlung: "eltern" }, KONFIG).bezahlung, { kleidung: [], teambedarf: [] });
  // Auch ohne Bereinigung vertragen Prüfung und Mail den alten Entwurf (zur Sicherheit): dasselbe wie der geladene
  const rohAlt = alt("eltern", "vereinskasse", "Autohaus Beispiel");
  const geladen2 = bereinigeEntwurf(rohAlt, KONFIG);
  gleich("(n) Mail aus dem alten Entwurf ohne Bereinigung: derselbe Text wie nach dem Laden", mail(rohAlt, FALL_A.jetzt).text, mail(geladen2, FALL_A.jetzt).text);
  gleichJson("(n) Prüfung des alten Entwurfs ohne Bereinigung: dieselben Lücken wie nach dem Laden", pruefeBestellung(KONFIG, rohAlt), pruefeBestellung(KONFIG, geladen2));
  // Der neue Entwurf übersteht Speichern und Laden unverändert (JSON)
  const neu = bestellung({ ...FALL_A.bestellung, bezahlung: { kleidung: ["eltern", "sponsor"], teambedarf: ["vereinskasse", "spenden"] } });
  gleichJson("(n) neuer Entwurf: nach JSON und Bereinigung unverändert", bereinigeEntwurf(JSON.parse(JSON.stringify(neu)), KONFIG), neu);
  gleichJson("(n) bezahlungIds: Text, Liste, Leeres, Müll", [bezahlungIds(KONFIG, "eltern"), bezahlungIds(KONFIG, ""), bezahlungIds(KONFIG, undefined), bezahlungIds(KONFIG, 5), bezahlungIds(KONFIG, {}), bezahlungIds(KONFIG, ["sponsor", "eltern"]), bezahlungIds(KONFIG, ["gibt-es-nicht"])], [["eltern"], [], [], [], [], ["eltern", "sponsor"], []]);
  gleichJson("(n) leerer Entwurf: beide Listen leer, Sponsor leer, Lieferung folgt dem Namen", [leererEntwurf().bezahlung, leererEntwurf().sponsor, leererEntwurf().lieferName], [{ kleidung: [], teambedarf: [] }, { firma: "", ansprechpartner: "", email: "", telefon: "", anschrift: "" }, null]);
}

// ---------- (o) Aufdruck-Kombinationen ----------

abschnitt("(o) Aufdruck-Kombinationen: eigene Blöcke, Reihenfolge, Druckdaten");
{
  const kombi = (id, name, nummer, groesse, aufdrucke) => person(id, name, nummer, groesse, ["trikot"], {}, null, { trikot: aufdrucke });
  const b = klein({
    personen: [
      kombi("p1", "Anna", "1", "140", ["W", "V", "SP", "ZG"]),
      kombi("p2", "Ben", "2", "140", ["W", "V", "ZG"]),
      kombi("p3", "Cem", "3", "140", ["W", "V", "SP"]),
      kombi("p4", "Dora", "4", "140", ["V", "SP", "ZG"]),
      kombi("p5", "Zoe", "5", "152", ["ZG", "SP", "V", "W", "XX"]), // unsortiert und mit einem unbekannten Kürzel: gilt wie p1
      kombi("p6", "Lea", "6", "140", ["W"]),
      kombi("p7", "Tim", "7", "140", []),
      kombi("p8", "Uwe", "8", "M", ["ZG"]),
    ],
    zaehler: 8,
    sponsor: FIRMA,
  });
  const m = mail(b).text;
  const druck = (...codes) => "Druck: " + codes.join(", ");
  const W = "Vereinswappen einfarbig";
  const V = "Vereinsnamen XL (SPEUZER)";
  const SP = "Werbeaufdruck M 1C (Sponsorlogo)";
  const ZG = "Zahlen 20-26cm (Rückennummer)";
  const teil1 = m.slice(m.indexOf("JAKO One T-Shirt Kids"), m.indexOf("Druckdaten je Stück:"));
  gleich("(o) Blöcke: Kinder zuerst (mehr Aufdrucke zuerst, bei gleich vielen die früheren Kürzel), dann Erwachsene; ohne Aufdruck keine „Druck:“-Zeile", teil1, [
    "JAKO One T-Shirt Kids Weiß F0 (6101)", druck(W, V, SP, ZG), "- Gr. 140: 1 Stück", "- Gr. 152: 1 Stück", "",
    "JAKO One T-Shirt Kids Weiß F0 (6101)", druck(W, V, SP), "- Gr. 140: 1 Stück", "",
    "JAKO One T-Shirt Kids Weiß F0 (6101)", druck(W, V, ZG), "- Gr. 140: 1 Stück", "",
    "JAKO One T-Shirt Kids Weiß F0 (6101)", druck(V, SP, ZG), "- Gr. 140: 1 Stück", "",
    "JAKO One T-Shirt Kids Weiß F0 (6101)", druck(W), "- Gr. 140: 1 Stück", "",
    "JAKO One T-Shirt Kids Weiß F0 (6101)", "- Gr. 140: 1 Stück", "",
    "JAKO One T-Shirt Weiß F0 (6101)", druck(ZG), "- Gr. M: 1 Stück", "",
    "",
  ].join("\n"));
  gleich("(o) Druckdaten nur für Stücke, deren Aufdrucke Daten brauchen (ZG): ohne Cem (kein ZG), Lea und Tim", m.slice(m.indexOf("Druckdaten je Stück:"), m.indexOf("Summe:")), [
    "Druckdaten je Stück:",
    "- Trikot 6101, Gr. 140: Nr. 1",
    "- Trikot 6101, Gr. 140: Nr. 2",
    "- Trikot 6101, Gr. 140: Nr. 4",
    "- Trikot 6101, Gr. 152: Nr. 5",
    "- Trikot 6101, Gr. M: Nr. 8",
    "",
    "",
  ].join("\n"));
  gleich("(o) acht Teile, vier Sponsorlogos (Anna, Cem, Dora, Zoe)", String(zusammenfassung(KONFIG, b).teile) + "|" + String(zusammenfassung(KONFIG, b).sponsorStuecke), "8|4");
  gleichJson("(o) die Aufdrucke einer Person gelten in der Reihenfolge der Daten, Unbekanntes fällt weg", artikelAufdrucke(KONFIG, b.personen[4], "trikot"), ["W", "V", "SP", "ZG"]);
  gleichJson("(o) ohne eigene Wahl (alter Entwurf) gelten die Standard-Aufdrucke", artikelAufdrucke(KONFIG, { artikel: { trikot: { groesse: "" } } }, "trikot"), STANDARD.trikot);
  gleichJson("(o) eine leere Liste heißt: nichts drauf (nicht: Standard)", artikelAufdrucke(KONFIG, b.personen[6], "trikot"), []);
  gleichJson("(o) unbekannter Artikel: keine Aufdrucke", artikelAufdrucke(KONFIG, b.personen[0], "mantel"), []);
  gleichJson("(o) was die Aufdrucke brauchen: Trikot mit ZG, Trikot ohne ZG, Präsi-Jacke, Regenjacke, Shorts", [druckBedarf(KONFIG, "trikot", ["W", "ZG"]), druckBedarf(KONFIG, "trikot", ["W", "V"]), druckBedarf(KONFIG, "praesi-jacke", STANDARD["praesi-jacke"]), druckBedarf(KONFIG, "regenjacke", STANDARD.regenjacke), druckBedarf(KONFIG, "shorts", [])], [
    { name: false, nummer: true, initialen: false },
    { name: false, nummer: false, initialen: false },
    { name: true, nummer: true, initialen: false },
    { name: false, nummer: false, initialen: true },
    { name: false, nummer: false, initialen: false },
  ]);
  // Preis und Mail ändern sich mit dem Aufdruck: Emils Trikot (Referenz) ohne Sponsorlogo kostet 2,95 € weniger
  gleich("(o) Trikot ohne Sponsorlogo: Stückpreis 18,79 € statt 21,74 €", formatEuro(stueckpreis(KONFIG, "trikot", "140", ["W", "V", "ZG"]).cent) + "|" + formatEuro(stueckpreis(KONFIG, "trikot", "140", STANDARD.trikot).cent), "18,79 €|21,74 €");
}

// ---------- (p) Name, Nummer und Initialen nur, wenn ein gewählter Aufdruck sie braucht ----------

abschnitt("(p) Name, Nummer, Initialen nur bei Bedarf");
{
  const jacke = (name, nummer, aufdrucke, extra = {}) => klein({ personen: [person("p1", name, nummer, "140", ["praesi-jacke"], {}, null, { "praesi-jacke": aufdrucke })], zaehler: 1, ...extra });
  const luecken = (b) => pruefeBestellung(KONFIG, b).map((l) => l.text);
  // Abgewählter Name auf der Präsi-Jacke: kein Name nötig, keine „Spielernamen S“, kein Name in den Druckdaten
  const ohneN = jacke("", "7", ["W", "ZK", "V"]);
  gleichJson("(p) Präsi-Jacke ohne Name-Aufdruck: kein Name nötig", luecken(ohneN), []);
  const mOhneN = mail(ohneN).text;
  pruefe("(p) ohne Name-Aufdruck: Teil 1 ohne „Spielernamen S“, Druckdaten nur mit Nummer", mOhneN.includes("Druck: Vereinswappen einfarbig, Initialen / Zahlen 2-5cm, Vereinsnamen XL (SPEUZER)\n- Gr. 140: 1 Stück\n") && mOhneN.includes("Druckdaten je Stück:\n- Präsi-Jacke 9300, Gr. 140: Nr. 7\n") && !mOhneN.includes("Spielernamen"), mOhneN);
  gleichJson("(p) mit Name-Aufdruck, aber ohne Namen: Lücke nennt den Artikel", luecken(jacke("", "7", STANDARD["praesi-jacke"])), ["Bei Person 1 fehlt der Name (Präsi-Jacke)"]);
  // Nur der Name (Nummer abgewählt): Nummer nicht nötig, in den Druckdaten nur der Name
  const nurName = jacke("Mia", "", ["N"]);
  gleichJson("(p) nur Name-Aufdruck: keine Nummer nötig", luecken(nurName), []);
  pruefe("(p) nur Name-Aufdruck: Druckdaten nur mit Name", mail(nurName).text.includes("Druckdaten je Stück:\n- Präsi-Jacke 9300, Gr. 140: Name „Mia“\n"));
  gleichJson("(p) nur Name-Aufdruck mit ungültiger Nummer: die Nummer wird nicht gebraucht, also keine Lücke", luecken(jacke("Mia", "100", ["N"])), []);
  gleichJson("(p) kleine Nummer vorne ohne Nummer: Lücke nennt den Artikel", luecken(jacke("Mia", "", ["ZK"])), ["Bei Mia fehlt die Rückennummer (Präsi-Jacke)"]);
  gleichJson("(p) ungültige Nummer bei Bedarf: Lücke", luecken(jacke("Mia", "100", ["ZK"])), ["Bei Mia ist die Rückennummer ungültig (nur 1 bis 99)"]);
  // Weder Name noch Nummer: nichts nötig, keine Druckdaten
  const nichts = jacke("", "", ["W", "V"]);
  gleichJson("(p) Präsi-Jacke nur mit Wappen und Schriftzug: weder Name noch Nummer nötig", luecken(nichts), []);
  pruefe("(p) ohne Daten keine „Druckdaten je Stück“", !mail(nichts).text.includes("Druckdaten je Stück:"));
  pruefe("(p) ohne Daten steht die Person als „Person 1“ im internen Teil", mail(nichts).text.includes("- Person 1, Gr. 140: Präsi-Jacke 26,24 € = 26,24 €"), mail(nichts).text);
  // Trikot ohne Rückennummer groß: keine Nummer nötig; Regenjacke ohne kleine Initialen: keine Initialen nötig
  gleichJson("(p) Trikot ohne Rückennummer groß: keine Nummer nötig", luecken(klein({ personen: [person("p1", "", "", "140", ["trikot"], {}, null, { trikot: ["W", "V", "SP"] })], zaehler: 1, sponsor: FIRMA })), []);
  gleichJson("(p) Regenjacke ohne Initialen-Aufdruck: keine Initialen nötig, auch wenn sie leer sind", luecken(klein({ personen: [person("p1", "Ben", "", "M", ["regenjacke"], {}, "", { regenjacke: ["W", "V"] })], zaehler: 1 })), []);
  gleichJson("(p) Regenjacke mit Initialen-Aufdruck und leeren Initialen: Lücke", luecken(klein({ personen: [person("p1", "Ben", "", "M", ["regenjacke"], {}, "")], zaehler: 1 })), ["Bei Ben fehlen die Initialen (Regenjacke)"]);
  // Mehrere Artikel brauchen die Nummer: eine Lücke je Person, die alle Artikel nennt
  gleichJson("(p) Trikot und Präsi-Jacke ohne Nummer: eine Lücke mit beiden Artikeln", luecken(klein({ personen: [person("p1", "Mia", "", "140", ["trikot", "praesi-jacke"], {}, null, { trikot: ["ZG"] })], zaehler: 1 })), ["Bei Mia fehlt die Rückennummer (Trikot, Präsi-Jacke)"]);
  // Ohne jeden Aufdruck-Bedarf ist nicht einmal ein Name nötig
  gleichJson("(p) Shorts, Stutzen, Hosen: nie Name oder Nummer", luecken(klein({ personen: [person("p1", "", "", "140", ["shorts", "stutzen", "praesi-hose", "tw-hose"])], zaehler: 1 })), []);
  gleichJson("(p) Winterjacke und TW-Trikot brauchen eine Nummer (und die Winterjacke einen Namen)", luecken(klein({ personen: [person("p1", "", "", "140", ["winterjacke", "tw-trikot"], {}, null, { "tw-trikot": ["W", "V", "ZG"] })], zaehler: 1 })), ["Bei Person 1 fehlt der Name (Winterjacke)", "Bei Person 1 fehlt die Rückennummer (Winterjacke, TW-Trikot)"]);
}

// ---------- (q) doppelte Rückennummern ----------

abschnitt("(q) doppelte Rückennummern");
{
  // Trikots ohne Sponsorlogo (keine Lücke wegen der Firma), Nummer groß aktiv
  const trikot = (id, name, nummer, aufdrucke = ["W", "V", "ZG"]) => person(id, name, nummer, "140", ["trikot"], {}, null, { trikot: aufdrucke });
  const doppelt = (personen) => pruefeBestellung(KONFIG, klein({ personen, zaehler: personen.length })).filter((l) => l.text.includes("doppelt"));
  const einfach = doppelt([trikot("p1", "Mia", "7"), trikot("p2", "Ben", "7")]);
  gleichJson("(q) zwei Personen, dieselbe Nummer: Lücke mit beiden Namen (Sprung zum zweiten, beide markiert)", einfach, [{ feld: "p:p2:nummer", text: "Die Rückennummer 7 ist doppelt (Mia und Ben)", felder: ["p:p1:nummer", "p:p2:nummer"] }]);
  gleichJson("(q) gleicher Name heißt dasselbe Kind: keine Lücke", doppelt([trikot("p1", "Mia", "7"), trikot("p2", "Mia", "7")]), []);
  gleichJson("(q) gleicher Name, Groß- und Kleinschreibung und Ränder egal: keine Lücke", doppelt([trikot("p1", "Mia", "7"), trikot("p2", "  mIA ", "7")]), []);
  gleichJson("(q) drei Personen: „A, B und C“", doppelt([trikot("p1", "Mia", "7"), trikot("p2", "Ben", "7"), trikot("p3", "Max", "7")]).map((l) => [l.text, l.felder.length]), [["Die Rückennummer 7 ist doppelt (Mia, Ben und Max)", 3]]);
  gleichJson("(q) ein Kind zweimal und ein anderes mit derselben Nummer: der Name steht einmal", doppelt([trikot("p1", "Mia", "7"), trikot("p2", "mia", "7"), trikot("p3", "Ben", "7")]).map((l) => [l.text, l.felder.length]), [["Die Rückennummer 7 ist doppelt (Mia und Ben)", 3]]);
  gleichJson("(q) „07“ und „7“ sind dieselbe Nummer", doppelt([trikot("p1", "Mia", "07"), trikot("p2", "Ben", "7")]).map((l) => l.text), ["Die Rückennummer 7 ist doppelt (Mia und Ben)"]);
  gleichJson("(q) zwei Nummern doppelt: in der Reihenfolge der Seite", doppelt([trikot("p1", "Mia", "7"), trikot("p2", "Cem", "9"), trikot("p3", "Ben", "7"), trikot("p4", "Dora", "9")]).map((l) => l.text), ["Die Rückennummer 7 ist doppelt (Mia und Ben)", "Die Rückennummer 9 ist doppelt (Cem und Dora)"]);
  gleichJson("(q) verschiedene Nummern: keine Lücke", doppelt([trikot("p1", "Mia", "7"), trikot("p2", "Ben", "8")]), []);
  gleichJson("(q) ohne Namen sind es verschiedene Personen („Person 1 und Person 2“)", doppelt([trikot("p1", "", "7"), trikot("p2", "", "7")]).map((l) => l.text), ["Die Rückennummer 7 ist doppelt (Person 1 und Person 2)"]);
  // Nur, wenn ein gewählter Aufdruck die Nummer braucht
  gleichJson("(q) Shorts brauchen keine Nummer: keine Lücke", doppelt([trikot("p1", "Mia", "7"), person("p2", "Ben", "7", "140", ["shorts"])]), []);
  gleichJson("(q) Trikot ohne Rückennummer groß: keine Lücke", doppelt([trikot("p1", "Mia", "7"), trikot("p2", "Ben", "7", ["W", "V"])]), []);
  gleichJson("(q) beide ohne Nummer-Aufdruck: keine Lücke", doppelt([trikot("p1", "Mia", "7", ["W"]), trikot("p2", "Ben", "7", ["W"])]), []);
  gleichJson("(q) Trikot und Präsi-Jacke (kleine Nummer) zählen zusammen", doppelt([trikot("p1", "Mia", "7"), person("p2", "Ben", "7", "140", ["praesi-jacke"])]).map((l) => l.text), ["Die Rückennummer 7 ist doppelt (Mia und Ben)"]);
  gleichJson("(q) Trikot und TW-Trikot zählen zusammen", doppelt([trikot("p1", "Mia", "1"), person("p2", "Ben", "1", "140", ["tw-trikot"], {}, null, { "tw-trikot": ["W", "V", "ZG"] })]).map((l) => l.text), ["Die Rückennummer 1 ist doppelt (Mia und Ben)"]);
  gleichJson("(q) ungültige oder leere Nummern zählen nicht als doppelt", doppelt([trikot("p1", "Mia", "100"), trikot("p2", "Ben", "100"), trikot("p3", "Cem", ""), trikot("p4", "Dora", "")]), []);
  gleichJson("(q) Personen ohne Artikel zählen nicht", doppelt([trikot("p1", "Mia", "7"), person("p2", "Ben", "7", "140", [])]), []);
  gleichJson("(q) die Lücke steht nach den Lücken je Person und vor der Bezahlung", pruefeBestellung(KONFIG, klein({ personen: [trikot("p1", "Mia", "7"), trikot("p2", "Ben", "7"), person("p3", "Cem", "", "", ["shorts"])], zaehler: 3, bezahlung: { kleidung: [], teambedarf: [] } })).map((l) => l.feld), ["p:p3:groesse", "p:p2:nummer", "bezahlung:kleidung"]);
  // Die Mail wird nicht gebaut, weil die Lücke das Senden verhindert; die Vorschau zeigt beide Nummern weiter
  pruefe("(q) die Vorschau zeigt beide Nummern", mail(klein({ personen: [trikot("p1", "Mia", "7"), trikot("p2", "Ben", "7")], zaehler: 2 })).text.split("Gr. 140: Nr. 7\n").length === 3);
}

// ---------- (r) Lieferanschrift ----------

abschnitt("(r) Lieferanschrift");
{
  const mia = [person("p1", "Mia", "", "140", ["shorts"])];
  const luecken = (teil) => pruefeBestellung(KONFIG, klein({ personen: mia, zaehler: 1, ...teil })).map((l) => `${l.feld}: ${l.text}`);
  gleichJson("(r) Straße fehlt (nur Leerzeichen)", luecken({ lieferStrasse: "   " }), ["lieferStrasse: Bitte gib Straße und Hausnummer für die Lieferung an"]);
  gleichJson("(r) PLZ und Ort fehlen", luecken({ lieferOrt: "" }), ["lieferOrt: Bitte PLZ und Ort angeben (z. B. 60439 Frankfurt)"]);
  for (const falsch of ["Frankfurt", "6043 Frankfurt", "604390 Frankfurt", "60439", "60439 12", "6O439 Frankfurt", "Frankfurt 60439", "60439 -", "AB439 Frankfurt"]) {
    gleichJson(`(r) PLZ falsch: „${falsch}“ ergibt die Lücke mit dem Beispiel`, luecken({ lieferOrt: falsch }), ["lieferOrt: Bitte PLZ und Ort angeben (z. B. 60439 Frankfurt)"]);
  }
  for (const richtig of ["60439 Frankfurt", "60439  Frankfurt", " 60439 Frankfurt am Main ", "60439Frankfurt", "01067 Dresden", "60439 Bad Homburg v. d. Höhe", "60439 Ölsnitz"]) {
    gleichJson(`(r) „${richtig}“ ist in Ordnung`, luecken({ lieferOrt: richtig }), []);
  }
  gleichJson("(r) parseOrt zerlegt PLZ und Ort", [parseOrt("60439Frankfurt am  Main"), parseOrt("Frankfurt")], [{ plz: "60439", ort: "Frankfurt am Main" }, null]);
  // Name der Lieferung: folgt „Dein Name“, solange er nicht geändert wurde
  const folgt = lieferAnschrift(klein({ name: "Tina Beispiel" }));
  gleich("(r) Name der Lieferung folgt „Dein Name“ (null)", folgt.name, "Tina Beispiel");
  gleich("(r) … und ändert sich mit ihm", lieferAnschrift(klein({ name: "Karim Beispiel" })).name, "Karim Beispiel");
  gleich("(r) eigener Name der Lieferung gilt (getrimmt, in einer Zeile)", lieferAnschrift(klein({ name: "Tina Beispiel", lieferName: "  Platzwart \n Beispiel " })).name, "Platzwart Beispiel");
  gleichJson("(r) Name der Lieferung leer gelassen: Lücke (nicht mehr „Dein Name“)", luecken({ lieferName: "" }), ["lieferName: Bitte gib den Namen für die Lieferung an"]);
  gleichJson("(r) „Dein Name“ leer und Lieferung folgt ihm: nur eine Lücke, die für „Dein Name“", luecken({ name: "" }), ["name: Bitte trage deinen Namen ein"]);
  gleichJson("(r) „Dein Name“ leer, Lieferung mit eigenem Namen: nur die Lücke für „Dein Name“", luecken({ name: "", lieferName: "Platzwart Beispiel" }), ["name: Bitte trage deinen Namen ein"]);
  // Mail: Kopf und Teil 1
  const m = mail(klein({ personen: mia, zaehler: 1, lieferName: "Platzwart Beispiel", lieferOrt: "60439Frankfurt  am Main" })).text;
  pruefe("(r) Kopf: „Lieferung an: Name, Straße, PLZ Ort“ (PLZ und Ort mit einem Leerzeichen)", zeilen(m).includes("Lieferung an: Platzwart Beispiel, Beispielweg 12, 60439 Frankfurt am Main"), m);
  pruefe("(r) Teil 1: Lieferanschrift in drei Zeilen unter der Weiterleitungszeile", m.includes("Dieser Teil kann so weitergeleitet werden.\n\nLieferanschrift:\nPlatzwart Beispiel\nBeispielweg 12\n60439 Frankfurt am Main\n\nJAKO One Trainingshose Kids Blau F400 (4420)\n"), m);
  pruefe("(r) die Anschrift steht im Kopf und in Teil 1, nirgends sonst", m.split("Beispielweg 12").length === 3);
  const leer = mail(bestellung({ team: "e2", name: "", personen: mia, zaehler: 1 })).text;
  pruefe("(r) Vorschau ohne Anschrift: Platzhalter im Kopf und in Teil 1", leer.includes(`Lieferung an: ${FEHLT}, ${FEHLT}, ${FEHLT}\n`) && leer.includes(`Lieferanschrift:\n${FEHLT}\n${FEHLT}\n${FEHLT}\n`));
  pruefe("(r) Vorschau mit falscher PLZ: der Text steht, wie er eingegeben wurde", mail(klein({ personen: mia, zaehler: 1, lieferOrt: "Frankfurt" })).text.includes("Lieferung an: Tina Beispiel, Beispielweg 12, Frankfurt\n"));
  gleich("(r) Teambedarf allein: die Lieferung steht im Kopf, Teil 1 gibt es nicht", [zeileMit(mail(FALL_B.bestellung, FALL_B.jetzt).text, "Lieferung an: "), String(mail(FALL_B.bestellung, FALL_B.jetzt).text.includes("Lieferanschrift:"))].join("|"), "Lieferung an: Platzwart Beispiel, Beispielgasse 3, 60311 Frankfurt am Main|false");
  gleichJson("(r) lieferAnschrift: Teile und Gültigkeit", [lieferAnschrift(klein({})), lieferAnschrift(klein({ lieferOrt: "Frankfurt" }))].map((a) => [a.name, a.strasse, a.ort, a.ortGueltig]), [["Tina Beispiel", "Beispielweg 12", "60439 Frankfurt", true], ["Tina Beispiel", "Beispielweg 12", "Frankfurt", false]]);
  gleichJson("(r) leerer Entwurf: Lieferung folgt dem Namen, Straße und Ort leer", [leererEntwurf().lieferName, leererEntwurf().lieferStrasse, leererEntwurf().lieferOrt], [null, "", ""]);
}

// ---------- (s) Block „Sponsor“ ----------

abschnitt("(s) Block „Sponsor“ in Teil 3");
{
  const shorts = [person("p1", "Mia", "", "140", ["shorts"])];
  const trikotSP = [person("p1", "Mia", "7", "140", ["trikot"])];
  const trikotOhneSP = [person("p1", "Mia", "7", "140", ["trikot"], {}, null, { trikot: ["W", "V", "ZG"] })];
  const aktiv = (b) => sponsorAktiv(KONFIG, b, zusammenfassung(KONFIG, b));
  // Wann erscheint der Block?
  pruefe("(s) nicht ohne Sponsor-Antwort und ohne Sponsorlogo", !aktiv(klein({ personen: shorts, zaehler: 1 })) && !aktiv(klein({ personen: trikotOhneSP, zaehler: 1 })));
  pruefe("(s) bei der Antwort „Sponsor“ bei der Kleidung", aktiv(klein({ personen: shorts, zaehler: 1, bezahlung: { kleidung: ["sponsor"], teambedarf: [] } })));
  pruefe("(s) bei der Antwort „Sponsor“ beim Teambedarf", aktiv(klein({ teambedarf: { baelle: { n: 1, details: "" } }, bezahlung: { kleidung: [], teambedarf: ["eltern", "sponsor"] } })));
  pruefe("(s) bei einem Stück mit Sponsorlogo, auch ohne Antwort „Sponsor“", aktiv(klein({ personen: trikotSP, zaehler: 1 })) && aktiv(klein({ personen: [person("p1", "Mia", "7", "140", ["tw-trikot"])], zaehler: 1 })));
  pruefe("(s) nicht, wenn „Sponsor“ bei der Kleidung steht, aber keine Kleidung gewählt ist (die Frage ist dann verborgen)", !aktiv(klein({ teambedarf: { baelle: { n: 1, details: "" } }, bezahlung: { kleidung: ["sponsor"], teambedarf: ["eltern"] } })));
  pruefe("(s) nicht, wenn „Sponsor“ beim Teambedarf steht, aber nichts bestellt wird", !aktiv(klein({ personen: shorts, zaehler: 1, bezahlung: { kleidung: ["eltern"], teambedarf: ["sponsor"] } })));
  // Inhalt: alle Felder, Leerzeilen entfallen, Anschrift mehrzeilig
  const m = mail(FALL_A.bestellung, FALL_A.jetzt).text;
  pruefe("(s) alle Felder: Firma, Ansprechpartner, E-Mail, Telefon, Anschrift (Folgezeilen eingerückt), Sponsorlogo", m.includes("Sponsor (für die Geschäftsstelle):\nFirma: Autohaus Beispiel\nAnsprechpartner: Frau Beispiel\nE-Mail: info@autohaus-beispiel.example\nTelefon: 030 23125 456\nAnschrift: Beispielstraße 5\n  60439 Frankfurt\nSponsorlogo: 2 Stück × 2,95 € = 5,90 €\n\nZuordnung je Person"));
  const nurFirma = mail(klein({ personen: trikotSP, zaehler: 1, sponsor: FIRMA })).text;
  pruefe("(s) nur die Firma: alle übrigen Zeilen entfallen, die Sponsorlogo-Zeile bleibt (ein Stück)", nurFirma.includes("Sponsor (für die Geschäftsstelle):\nFirma: Autohaus Beispiel\nSponsorlogo: 1 Stück × 2,95 € = 2,95 €\n\nZuordnung je Person") && !/Ansprechpartner|E-Mail:|Telefon:|Anschrift:/.test(nurFirma), nurFirma);
  const einzelne = (feld, wert) => mail(klein({ personen: shorts, zaehler: 1, bezahlung: { kleidung: ["sponsor"], teambedarf: [] }, sponsor: { ...FIRMA, [feld]: wert } })).text;
  pruefe("(s) nur Ansprechpartner dazu: genau diese Zeile", einzelne("ansprechpartner", "Herr Beispiel").includes("Firma: Autohaus Beispiel\nAnsprechpartner: Herr Beispiel\n\nZuordnung"));
  pruefe("(s) nur E-Mail dazu: genau diese Zeile", einzelne("email", "info@autohaus-beispiel.example").includes("Firma: Autohaus Beispiel\nE-Mail: info@autohaus-beispiel.example\n\nZuordnung"));
  pruefe("(s) nur Telefon dazu: genau diese Zeile", einzelne("telefon", "030 23125 456").includes("Firma: Autohaus Beispiel\nTelefon: 030 23125 456\n\nZuordnung"));
  pruefe("(s) Anschrift mit Leerzeilen und Rändern: Leerzeilen entfallen, Folgezeilen eingerückt", einzelne("anschrift", "  Beispielstraße 5 \n\n\n 60439  Frankfurt \n Deutschland").includes("Firma: Autohaus Beispiel\nAnschrift: Beispielstraße 5\n  60439 Frankfurt\n  Deutschland\n\nZuordnung"));
  pruefe("(s) Angaben nur aus Leerzeichen zählen als leer", !/Ansprechpartner|E-Mail:|Telefon:|Anschrift:/.test(mail(klein({ personen: shorts, zaehler: 1, bezahlung: { kleidung: ["sponsor"], teambedarf: [] }, sponsor: { firma: "Autohaus Beispiel", ansprechpartner: "  ", email: " \n ", telefon: "", anschrift: "\n \n" } })).text));
  // Sponsorlogo: Anzahl der Stücke und Summe aus den Daten
  const drei = mail(klein({ personen: [person("p1", "Mia", "1", "140", ["trikot"]), person("p2", "Ben", "2", "M", ["trikot", "tw-trikot"]), person("p3", "Cem", "3", "140", ["trikot"], {}, null, { trikot: ["W", "V", "ZG"] })], zaehler: 3, sponsor: FIRMA })).text;
  pruefe("(s) Sponsorlogo zählt Stücke (Trikot Mia, Trikot und TW-Trikot Ben; Cems Trikot nicht): 3 × 2,95 € = 8,85 €", zeilen(drei).includes("Sponsorlogo: 3 Stück × 2,95 € = 8,85 €"), drei);
  const teurerPreis = kopieTestpreise();
  teurerPreis.veredelungPreis.SP = 4.25;
  const konfigTeurer = mitPreisen(KONFIG_OEFFENTLICH, teurerPreis);
  pruefe("(s) Zuschlag und Summe liefern die Daten: bei 4,25 € je Sponsorlogo „2 Stück × 4,25 € = 8,50 €“", zeilen(mail(FALL_A.bestellung, FALL_A.jetzt, konfigTeurer).text).includes("Sponsorlogo: 2 Stück × 4,25 € = 8,50 €"));
  pruefe("(s) ohne Sponsorlogo an einem Stück entfällt die Zeile (der Block bleibt wegen der Antwort „Sponsor“)", !zeilen(mail(klein({ personen: shorts, zaehler: 1, bezahlung: { kleidung: ["sponsor"], teambedarf: [] }, sponsor: FIRMA })).text).some((z) => z.startsWith("Sponsorlogo:")));
  // Nur Teambedarf mit Sponsor: Teil 3 enthält nur den Block „Sponsor“ (keine Zuordnung)
  const nurTb = mail(klein({ teambedarf: { ballpumpe: { n: 1, details: "" } }, bezahlung: { kleidung: [], teambedarf: ["sponsor"] }, sponsor: FIRMA })).text;
  pruefe("(s) Teambedarf mit Sponsor: Teil 3 nur mit dem Block „Sponsor“, ohne Zuordnung und ohne Sponsorlogo-Zeile", nurTb.includes("- 1 × Ballpumpe\n\n== 3. NUR INTERN – NICHT WEITERLEITEN ==\nSponsor (für die Geschäftsstelle):\nFirma: Autohaus Beispiel\n\nViele Grüße\n") && !nurTb.includes("Zuordnung") && !nurTb.includes("== 1."), nurTb);
  // Ohne Sponsor: kein Block, auch nicht, wenn im Entwurf eine Firma steht
  const ohne = mail(klein({ personen: shorts, zaehler: 1, sponsor: FIRMA })).text;
  pruefe("(s) ohne Sponsor-Anlass: nichts vom Sponsor in der Mail (auch nicht die Firma aus dem Entwurf)", !ohne.includes("Sponsor") && !ohne.includes("Autohaus") && !ohne.includes("Firma"));
  pruefe("(s) der Block steht nur in Teil 3 (nie in Teil 1 oder 2)", (() => { const t = mail(FALL_A.bestellung, FALL_A.jetzt).text; return t.indexOf("Sponsor (für die Geschäftsstelle):") > t.indexOf("== 3."); })());
  pruefe("(s) Vorschau: Firma fehlt › Platzhalter", mail(klein({ personen: trikotSP, zaehler: 1 })).text.includes(`Firma: ${FEHLT}\n`));
  gleichJson("(s) sponsorDaten: bereinigt, Firma aus dem alten Namen des Teambedarfs", [sponsorDaten({ sponsor: { firma: " A  B ", anschrift: " x \n\n y " }, bezahlung: {} }), sponsorDaten({ bezahlung: { teambedarfSponsor: "Bäcker" } })], [{ firma: "A B", ansprechpartner: "", email: "", telefon: "", anschrift: "x\ny" }, { firma: "Bäcker", ansprechpartner: "", email: "", telefon: "", anschrift: "" }]);
  // Lücke für die Firma
  gleichJson("(s) Firma fehlt beim Sponsorlogo: Lücke „Firma“", pruefeBestellung(KONFIG, klein({ personen: trikotSP, zaehler: 1 })), [{ feld: "sponsor:firma", text: "Bitte trage die Firma des Sponsors ein" }]);
  gleichJson("(s) Firma da: keine Lücke", pruefeBestellung(KONFIG, klein({ personen: trikotSP, zaehler: 1, sponsor: FIRMA })), []);
  gleichJson("(s) Sponsorlogo abgewählt: keine Lücke, auch ohne Firma", pruefeBestellung(KONFIG, klein({ personen: trikotOhneSP, zaehler: 1 })), []);
  gleich("(s) Hinweis für die Geschäftsstelle wörtlich", TEXT_HINWEIS_SPONSOR, "Für die Geschäftsstelle: Die Kosten für den Sponsordruck werden künftig getrennt in Rechnung gestellt. Dazu gibt es einen kurzen Sponsorenvertrag. Darum kümmert sich die Geschäftsstelle.");
}

// ---------- (t) Schnellwahl mit Standard-Aufdrucken ----------

abschnitt("(t) Schnellwahl setzt Artikel mit ihren Standard-Aufdrucken");
{
  const p = schnellwahlAnwenden(KONFIG, { id: "p1", name: "", nummer: "", groesse: "140", artikel: {}, initialen: null }, "grundausstattung");
  gleichJson("(t) Grundausstattung: sechs Artikel mit ihren Standard-Aufdrucken", Object.fromEntries(Object.entries(p.artikel).map(([id, a]) => [id, a.aufdrucke])), Object.fromEntries(GRUNDAUSSTATTUNG.map((id) => [id, STANDARD[id]])));
  gleichJson("(t) die Größe bleibt leer (Vorauswahl folgt der Person)", Object.values(p.artikel).map((a) => a.groesse), ["", "", "", "", "", ""]);
  p.artikel.trikot.aufdrucke.push("X");
  gleichJson("(t) die Liste ist eine Kopie: der Katalog bleibt unverändert", katalogVon(KONFIG).nachId.get("trikot").aufdrucke.standard, ["W", "V", "SP", "ZG"]);
  const q = schnellwahlAnwenden(KONFIG, { id: "p1", name: "", nummer: "", groesse: "140", artikel: { trikot: { groesse: "152", aufdrucke: ["W"] } }, initialen: null }, "grundausstattung");
  gleichJson("(t) schon gewählte Artikel behalten Größe und Aufdrucke, die übrigen kommen dazu", [q.artikel.trikot, Object.keys(q.artikel).length], [{ groesse: "152", aufdrucke: ["W"] }, 6]);
  const torwart = schnellwahlAnwenden(KONFIG, { id: "p1", name: "", nummer: "", groesse: "140", artikel: {}, initialen: null }, "torwartset");
  gleichJson("(t) Torwartset: TW-Trikot mit Sponsorlogo, Präsi-Jacke mit allen vier", [torwart.artikel["tw-trikot"].aufdrucke, torwart.artikel["praesi-jacke"].aufdrucke, torwart.artikel["tw-hose"].aufdrucke], [["W", "V", "SP", "ZG"], ["W", "ZK", "V", "N"], []]);
  const x = { id: "p1", artikel: {} };
  pruefe("(t) unbekannte Schnellwahl ändert nichts", schnellwahlAnwenden(KONFIG, x, "gibt-es-nicht") === x && Object.keys(x.artikel).length === 0);
  // Summen der Schnellwahlen (Kinder 140, Erwachsene M), mit Standard-Aufdrucken, ohne Sponsor-Prüfung
  const summe = (id, groesse) => formatEuro(zusammenfassung(KONFIG, klein({ personen: [schnellwahlAnwenden(KONFIG, person("p1", "X", "1", groesse, []), id)] })).summeCent);
  gleich("(t) Grundausstattung Kinder: 21,74 + 10,38 + 4,02 + 29,04 + 17,99 + 15,21 = 98,38 €", summe("grundausstattung", "140"), "98,38 €");
  gleich("(t) Grundausstattung Erwachsene: 23,84 + 11,88 + 4,74 + 32,94 + 20,22 + 15,21 = 108,83 €", summe("grundausstattung", "M"), "108,83 €");
  gleich("(t) Torwartset Kinder: 29,04 + 17,99 + 4,02 + 29,42 + 16,79 + 15,21 = 112,47 €", summe("torwartset", "140"), "112,47 €");
  gleich("(t) Torwartset Erwachsene: 32,94 + 20,22 + 4,74 + 30,92 + 18,96 + 15,21 = 122,99 €", summe("torwartset", "M"), "122,99 €");
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
  pruefe("(h) die mehrzeilige Anschrift des Sponsors kommt mit eingerückten Folgezeilen an", body.includes("\r\nAnschrift: Beispielstraße 5\r\n  60439 Frankfurt\r\n"));
  gleich("(h) mailtoLaenge = Länge des Links", String(m.mailtoLaenge), String(mt.length));
  gleich("(h) mailtoLink() direkt", mailtoLink("a@b.de", "Be treff", "x\ny"), "mailto:a@b.de?subject=Be%20treff&body=x%0D%0Ay");
  gleich("(h) mailtoLink() mit \\r\\n bleibt ein Umbruch", mailtoLink("a@b.de", "s", "x\r\ny"), "mailto:a@b.de?subject=s&body=x%0D%0Ay");
  gleich("(h) Text kopieren: Betreff, Leerzeile, Text", kopierText(m), "Betreff: " + m.betreff + "\n\n" + m.text);
}

// ---------- (i) Lückenliste ----------

abschnitt("(i) Lückenliste");
{
  const leer = leererEntwurf();
  gleichJson("(i) leere Eingaben (die Lieferung folgt „Dein Name“: keine eigene Lücke dafür)", pruefeBestellung(KONFIG, leer), [
    { feld: "team", text: "Bitte wähle deine Mannschaft aus" },
    { feld: "name", text: "Bitte trage deinen Namen ein" },
    { feld: "lieferStrasse", text: "Bitte gib Straße und Hausnummer für die Lieferung an" },
    { feld: "lieferOrt", text: "Bitte PLZ und Ort angeben (z. B. 60439 Frankfurt)" },
    { feld: "leer", text: "Du hast noch nichts ausgewählt: Füge eine Person mit Kleidung hinzu oder wähle Teambedarf" },
  ]);

  const b = bestellung({
    team: "",
    name: "   ",
    lieferName: "  ",
    lieferOrt: "Frankfurt",
    personen: [
      person("p1", "Mia", "", "140", ["trikot", "praesi-jacke", "shorts"]),
      person("p2", "Ben", "9", "M", ["regenjacke"], {}, ""),
      person("p3", "", "5", "152", ["praesi-jacke"]),
      person("p4", "Cem", "", "", ["rucksack"]),
      person("p5", "Dora", "100", "L", ["trikot"]),
      person("p6", "Leer", "", "", []),
    ],
    zaehler: 6,
    teambedarf: { baelle: { n: 3, details: "" } },
  });
  gleichJson("(i) alle Lücken in der Reihenfolge der Seite", pruefeBestellung(KONFIG, b), [
    { feld: "team", text: "Bitte wähle deine Mannschaft aus" },
    { feld: "name", text: "Bitte trage deinen Namen ein" },
    { feld: "lieferName", text: "Bitte gib den Namen für die Lieferung an" },
    { feld: "lieferStrasse", text: "Bitte gib Straße und Hausnummer für die Lieferung an" },
    { feld: "lieferOrt", text: "Bitte PLZ und Ort angeben (z. B. 60439 Frankfurt)" },
    { feld: "p:p1:nummer", text: "Bei Mia fehlt die Rückennummer (Trikot, Präsi-Jacke)" },
    { feld: "p:p2:initialen", text: "Bei Ben fehlen die Initialen (Regenjacke)" },
    { feld: "p:p3:name", text: "Bei Person 3 fehlt der Name (Präsi-Jacke)" },
    { feld: "p:p4:groesse", text: "Bei Cem fehlt die Größe" },
    { feld: "p:p5:nummer", text: "Bei Dora ist die Rückennummer ungültig (nur 1 bis 99)" },
    { feld: "bezahlung:kleidung", text: "Bitte wähle, wer die Kleidung zahlt" },
    { feld: "bezahlung:teambedarf", text: "Bitte wähle, wer den Teambedarf zahlt" },
    { feld: "sponsor:firma", text: "Bitte trage die Firma des Sponsors ein" },
  ]);

  // Keine Nummer, keine Initialen nötig ohne die passenden Aufdrucke: Shorts, Stutzen, Hosen, Rucksack
  gleichJson("(i) Shorts, Stutzen, Hosen, Rucksack brauchen weder Nummer noch Initialen", pruefeBestellung(KONFIG, klein({ personen: [person("p1", "Mia", "", "140", ["shorts", "stutzen", "praesi-hose", "rucksack", "tw-hose"])], zaehler: 1 })), []);
  // Teambedarf: nur Sonstiges reicht, aber dann ist die Bezahlung Pflicht
  gleichJson("(i) nur Sonstiges: Bezahlung des Teambedarfs ist Pflicht", pruefeBestellung(KONFIG, bestellung({ team: "d1", name: "Tina", ...ANSCHRIFT, sonstiges: "Pumpe" })).map((l) => l.feld), ["bezahlung:teambedarf"]);
  gleichJson("(i) Teambedarf mit Anzahl 0 und Details zählt nicht", pruefeBestellung(KONFIG, bestellung({ team: "d1", name: "Tina", ...ANSCHRIFT, teambedarf: { baelle: { n: 0, details: "Größe 4" } } })).map((l) => l.feld), ["leer"]);
  // Personen ohne Artikel zählen nicht und erzeugen keinen Fehler
  gleichJson("(i) Person ohne Artikel: kein Fehler, zählt nicht", pruefeBestellung(KONFIG, bestellung({ ...FALL_A.bestellung, personen: [...FALL_A.bestellung.personen, person("p4", "", "", "", [])] })), []);
  gleich("(i) Person ohne Artikel ändert den Text nicht", mail(bestellung({ ...FALL_A.bestellung, personen: [...FALL_A.bestellung.personen, person("p4", "", "", "", [])] }), FALL_A.jetzt).text, FALL_A.text);
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
  gleich("Euro ganz: immer zwei Nachkommastellen", formatEuro(12000), "120,00 €");
  gleich("Euro mit Cent", formatEuro(1250), "12,50 €");
  gleich("Euro mit einstelligen Cent", formatEuro(1205), "12,05 €");
  gleich("Euro unter einem Euro", formatEuro(5), "0,05 €");
  gleich("Euro Null", formatEuro(0), "0,00 €");
  gleich("Euro mit Tausenderpunkt", formatEuro(185000), "1.850,00 €");
  gleich("Euro mit Tausenderpunkt und Cent", formatEuro(123456), "1.234,56 €");
  gleich("Euro mit zwei Tausenderpunkten", formatEuro(123456789), "1.234.567,89 €");
  gleich("Euro knapp unter 1.000", formatEuro(99999), "999,99 €");
  gleich("Euro Rundung", formatEuro(1999.6), "20,00 €");
  gleich("Euro: kein Betrag wird 0,00 €", formatEuro(undefined) + "|" + formatEuro(NaN), "0,00 €|0,00 €");
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
  gleich("mehrzeilig: Ränder, Leerzeilen, Zeilenenden", mehrzeilig("\n\n a  b \r\n\r\n\r\n c d \n\n"), "a b\n\nc d");
  gleich("Anzahl: Text wird Zahl", String(ganzzahl("12")), "12");
  gleich("Anzahl: negativ wird 0", String(ganzzahl(-3)), "0");
  gleich("Anzahl: unsinnig wird 0", String(ganzzahl("abc")), "0");
  gleich("Anzahl: höchstens 999", String(ganzzahl(5000)), String(GRENZEN.anzahl));
}

// ---------- Texte, Reihenfolge, Sonderfälle ----------

abschnitt("Sonderfälle");
{
  // Ein Teil: „1 Teil“ im Betreff und in der Summe
  const eins = mail(klein({ personen: [person("p1", "Mia", "7", "140", ["trikot"])], zaehler: 1, sponsor: FIRMA }));
  gleich("ein Teil: Betreff", eins.betreff, "[TEST] Bestellung E2-Jugend – 1 Teil (E2-261125-1200)");
  pruefe("ein Teil: „Summe: 1 Teil“", zeilen(eins.text).includes("Summe: 1 Teil"));
  const einsMitTeam = mail(klein({ personen: [person("p1", "Mia", "7", "140", ["trikot"])], zaehler: 1, sponsor: FIRMA, teambedarf: { ballpumpe: { n: 1, details: "" } }, bezahlung: { kleidung: ["eltern"], teambedarf: ["eltern"] } }));
  gleich("ein Teil und Teambedarf: Betreff", einsMitTeam.betreff, "[TEST] Bestellung E2-Jugend – 1 Teil, Teambedarf (E2-261125-1200)");

  // Stutzen: eigene Größe, Reihenfolge S vor M, Zusatz bei der Person
  const stutzen = mail(klein({ personen: [person("p1", "Mia", "", "140", ["stutzen"], { stutzen: "S (Bambini)" }), person("p2", "Bo", "", "140", ["stutzen"]), person("p3", "Ada", "", "S", ["stutzen"])], zaehler: 3 }));
  pruefe("Stutzen: Größen S, M, L mit Klammer, in dieser Reihenfolge", stutzen.text.includes("JAKO Tube Stutzen Blau F04 (3401)\n- Gr. S (Bambini): 1 Stück\n- Gr. M (Junior): 1 Stück\n- Gr. L (Senior): 1 Stück\n"), stutzen.text);
  pruefe("Stutzen: Zusatz bei abweichender Größe, nicht bei der Vorauswahl; Kinder 4,02 €, Erwachsene 4,74 €", stutzen.text.includes("- Mia, Gr. 140: Stutzen (Gr. S (Bambini)) 4,02 € = 4,02 €\n") && stutzen.text.includes("- Bo, Gr. 140: Stutzen 4,02 € = 4,02 €\n") && stutzen.text.includes("- Ada, Gr. S: Stutzen 4,74 € = 4,74 €\n"), stutzen.text);
  pruefe("Stutzen: Summe 4,02 + 4,02 + 4,74 = 12,78 €", stutzen.text.includes("Summe Kleidung: 12,78 €\n"));

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
  pruefe("Namen genau wie eingegeben (keine Großschreibung), Leerzeichen zusammengezogen", klein_.includes("Name „mia müller“, Nr. 7") && klein_.includes("- mia müller, Nr. 7, Gr. 140: Präsi-Jacke 29,04 € = 29,04 €"));
  // Nummer „07“ wird „7“
  pruefe("Nummer 07 wird als 7 gedruckt", mail(klein({ personen: [person("p1", "Mia", "07", "140", ["trikot"])], zaehler: 1 })).text.includes("Gr. 140: Nr. 7\n"));
  // Nummer ohne Einzeldruck: steht intern trotzdem, wenn eingegeben
  pruefe("intern: „, Nr. N“ nur mit eingegebener Nummer", mail(klein({ personen: [person("p1", "Mia", "", "140", ["shorts"]), person("p2", "Bo", "8", "140", ["shorts"])], zaehler: 2 })).text.includes("- Mia, Gr. 140: Shorts 10,38 € = 10,38 €\n- Bo, Nr. 8, Gr. 140: Shorts 10,38 € = 10,38 €\n"));
  // Person ohne Namen: „Person n“ in der Vorschau
  pruefe("Person ohne Namen heißt in der Vorschau „Person 2“", mail(klein({ personen: [person("p1", "Mia", "", "140", ["shorts"]), person("p2", "", "", "140", ["shorts"])], zaehler: 2 })).text.includes("- Person 2, Gr. 140: Shorts 10,38 € = 10,38 €"));
  // Teambedarf: Details in einer Zeile, nur mit Anzahl > 0, Katalogreihenfolge, danach Sonstiges
  const tb = mail(klein({
    teambedarf: {
      trinkflaschen: { n: 12, details: "" },
      leibchen: { n: 2, details: "gelb,\n  Kinder " },
      baelle: { n: 0, details: "wird nicht gedruckt" },
      erste_hilfe: { n: 5, details: "unbekannter Posten" },
    },
    sonstiges: "  Tor aufbauen\n\n\n  Netz  ",
    bezahlung: { kleidung: [], teambedarf: ["eltern"] },
  })).text;
  pruefe("Teambedarf: Katalogreihenfolge, Details in einer Zeile, Anzahl 0 und unbekannte Posten fehlen", tb.includes("== 2. TEAMBEDARF (Preis bitte beim Lieferanten erfragen) ==\n- 2 × Leibchen: gelb, Kinder\n- 12 × Trinkflaschen\n- Sonstiges: Tor aufbauen\n\n  Netz\n\nViele Grüße"), tb);
  // Datum
  pruefe("Gebraucht bis: ungültiges Datum erscheint nicht", !mail(klein({ bis: "2027-02-30", personen: [person("p1", "Mia", "", "140", ["shorts"])], zaehler: 1 })).text.includes("Gebraucht bis"));
  // Telefon
  pruefe("Telefon in einer Zeile mit dem Namen", mail(klein({ tel: " 030 23125\n456 ", personen: [person("p1", "Mia", "", "140", ["shorts"])], zaehler: 1 })).text.includes("Bestellt von: Tina Beispiel, Tel. 030 23125 456\nLieferung an: "));
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
  const lang = mail(klein({ personen: viele, zaehler: 45, sponsor: FIRMA }));
  pruefe(`lange Bestellung: mailto länger als ${MAILTO_LAENGE_MAX} Zeichen`, lang.mailtoLaenge > MAILTO_LAENGE_MAX, String(lang.mailtoLaenge));
  gleich("lange Bestellung: der Text im Link ist vollständig (nicht gekürzt)", decodeURIComponent(lang.mailto.split("&body=")[1]).replace(/\r\n/g, "\n"), lang.text);
  pruefe("lange Bestellung: alle 45 Personen im internen Teil", (lang.text.match(/^- Spieler \d+, Nr\. /gm) || []).length === 45);
  pruefe("lange Bestellung: Sponsorlogo 45 × 2,95 € = 132,75 €", zeilen(lang.text).includes("Sponsorlogo: 45 Stück × 2,95 € = 132,75 €"));
  pruefe("kurze Bestellung bleibt unter der Grenze", mail(FALL_A.bestellung, FALL_A.jetzt).mailtoLaenge < MAILTO_LAENGE_MAX);
}

// ---------- Entwurf auf dem Gerät ----------

abschnitt("Entwurf");
{
  // Hin und zurück über JSON (so liegt er in localStorage): derselbe Text
  const zurueck = bereinigeEntwurf(JSON.parse(JSON.stringify(FALL_A.bestellung)), KONFIG);
  gleich("Entwurf: nach JSON und Bereinigung derselbe Text wie (a)", mail(zurueck, FALL_A.jetzt).text, FALL_A.text);
  gleichJson("Entwurf: Bereinigung ändert einen gültigen Entwurf nicht", zurueck, FALL_A.bestellung);
  for (const fall of [FALL_B, FALL_C]) gleichJson(`Entwurf: Bereinigung ändert auch „${fall.titel}“ nicht`, bereinigeEntwurf(JSON.parse(JSON.stringify(fall.bestellung)), KONFIG), fall.bestellung);
  // Müll
  for (const [name, roh] of [["null", null], ["Text", "x"], ["Zahl", 5], ["Liste", []], ["leeres Objekt", {}]]) {
    gleichJson(`Entwurf: ${name} ergibt einen leeren Entwurf`, bereinigeEntwurf(roh, KONFIG), leererEntwurf());
  }
  const muell = bereinigeEntwurf({
    team: "gibt-es-nicht", name: 5, tel: "x".repeat(500), bis: "kein Datum", sonstiges: "y".repeat(5000),
    lieferName: "n".repeat(500), lieferStrasse: "s".repeat(500), lieferOrt: 7,
    personen: [
      { id: "p1", name: "Mia", nummer: "7", groesse: "999", artikel: { trikot: { groesse: "999" }, mantel: {}, shorts: true, stutzen: { groesse: "L (Senior)" }, winterjacke: { groesse: "116", aufdrucke: ["N", "XX", "V", 7] }, regenjacke: { aufdrucke: [] }, "tw-trikot": { aufdrucke: "alle" } }, initialen: 5 },
      { id: "p1", name: "Doppelt", nummer: 7, groesse: "140", artikel: "kaputt" },
      "kein Objekt",
      null,
    ],
    zaehler: "viele",
    teambedarf: { baelle: { n: "12", details: "z".repeat(500) }, mantel: { n: 3 }, ballpumpe: { n: -4, details: "" }, leibchen: { n: 100000 } },
    bezahlung: { kleidung: "bar", kleidungSponsor: 7, teambedarf: "sponsor", teambedarfSponsor: "Bäcker" },
    sponsor: { firma: ["kein Text"], ansprechpartner: "a".repeat(500), email: "e".repeat(500), telefon: "t".repeat(500), anschrift: "x".repeat(5000) },
    bestellNr: "x", status: "mail",
  }, KONFIG);
  gleich("Entwurf: unbekannte Mannschaft wird leer", muell.team, "");
  gleich("Entwurf: Name kein Text wird leer", muell.name, "");
  gleich("Entwurf: Telefon wird gekürzt", String(muell.tel.length), String(GRENZEN.tel));
  gleich("Entwurf: ungültiges Datum wird leer", muell.bis, "");
  gleich("Entwurf: Sonstiges wird gekürzt", String(muell.sonstiges.length), String(GRENZEN.sonstiges));
  gleichJson("Entwurf: Lieferung wird gekürzt, ein Ort, der kein Text ist, wird leer", [muell.lieferName.length, muell.lieferStrasse.length, muell.lieferOrt], [GRENZEN.lieferName, GRENZEN.strasse, ""]);
  gleich("Entwurf: vier Einträge, zwei davon keine Personen", String(muell.personen.length), "4");
  pruefe("Entwurf: Personen-Nummern sind eindeutig", new Set(muell.personen.map((p) => p.id)).size === muell.personen.length && muell.personen.every((p) => /^p\d+$/.test(p.id)));
  pruefe("Entwurf: der Zähler liegt über allen Nummern", muell.personen.every((p) => Number(p.id.slice(1)) <= muell.zaehler));
  gleich("Entwurf: ungültige Größe der Person wird leer", muell.personen[0].groesse, "");
  gleichJson("Entwurf: Artikel nur aus dem Katalog, eigene Größe nur wenn gültig, Aufdrucke sortiert und bereinigt (keine Angabe = Standard, [] = nichts)", muell.personen[0].artikel, {
    trikot: { groesse: "", aufdrucke: ["W", "V", "SP", "ZG"] },
    shorts: { groesse: "", aufdrucke: [] },
    stutzen: { groesse: "L (Senior)", aufdrucke: [] },
    winterjacke: { groesse: "", aufdrucke: ["V", "N"] },
    regenjacke: { groesse: "", aufdrucke: [] },
    "tw-trikot": { groesse: "", aufdrucke: ["W", "V", "SP", "ZG"] },
  });
  gleich("Entwurf: Initialen kein Text werden „keine eigene Eingabe“", String(muell.personen[0].initialen), "null");
  gleichJson("Entwurf: Teambedarf bereinigt", muell.teambedarf, { baelle: { n: 12, details: "z".repeat(GRENZEN.details) }, leibchen: { n: GRENZEN.anzahl, details: "" } });
  gleichJson("Entwurf: Bezahlung bereinigt (alte Texte werden Listen, Unbekanntes fällt weg)", muell.bezahlung, { kleidung: [], teambedarf: ["sponsor"] });
  gleichJson("Entwurf: Sponsor bereinigt (Firma kein Text: der alte Name des Teambedarfs, Felder gekürzt)", [muell.sponsor.firma, muell.sponsor.ansprechpartner.length, muell.sponsor.email.length, muell.sponsor.telefon.length, muell.sponsor.anschrift.length], ["Bäcker", GRENZEN.ansprechpartner, GRENZEN.sponsorEmail, GRENZEN.sponsorTel, GRENZEN.anschrift]);
  gleich("Entwurf: ungültige Bestell-Nr. wird leer, Status damit auch", muell.bestellNr + "|" + muell.status, "|");
  const mitNr = bereinigeEntwurf({ bestellNr: "G-JUGEND-261125-0905", status: "kopiert" }, KONFIG);
  gleich("Entwurf: gültige Bestell-Nr. und Status bleiben", mitNr.bestellNr + "|" + mitNr.status, "G-JUGEND-261125-0905|kopiert");
  gleich("Entwurf: Status ohne Bestell-Nr. wird leer", bereinigeEntwurf({ status: "mail" }, KONFIG).status, "");
  gleich("Entwurf: mehr als 60 Personen werden abgeschnitten", String(bereinigeEntwurf({ personen: Array.from({ length: 200 }, (_, i) => ({ id: "p" + (i + 1), name: "x" })) }, KONFIG).personen.length), String(GRENZEN.personen));
  pruefe("Entwurf: ein bereinigter Müll-Entwurf lässt sich prüfen und in eine Mail verwandeln", Array.isArray(pruefeBestellung(KONFIG, muell)) && typeof mail(muell).text === "string");
  // Die Lieferung: leer gelassen bleibt leer (eigene Eingabe), „nie geändert“ bleibt null
  gleichJson("Entwurf: Name der Lieferung leer gelassen bleibt eine eigene (leere) Eingabe, nicht null", [bereinigeEntwurf({ lieferName: "" }, KONFIG).lieferName, bereinigeEntwurf({ lieferName: null }, KONFIG).lieferName, bereinigeEntwurf({}, KONFIG).lieferName], ["", null, null]);
  // Neue Bestellung: der Absender (mit Lieferanschrift) bleibt, alles andere ist leer
  const absender = { team: "d3", name: "Lena Beispiel", tel: "030 23125 123", lieferName: null, lieferStrasse: "Beispielweg 12", lieferOrt: "60439 Frankfurt" };
  const neu = Object.assign(leererEntwurf(), absender);
  gleichJson("Entwurf: leer außer Mannschaft, Name, Telefon und Lieferanschrift", neu, { ...leererEntwurf(), ...absender });
}

// ---------- Hülle der Seite (Bau) ----------

abschnitt("Seite");
{
  const s = seite(DATEN);
  gleich("Seite: URL", s.url, "/bestellung/");
  gleich("Seite: Titel", s.title, "Bestellung für dein Team");
  pruefe("Seite: noindex im Kopf, ohneSitemap gesetzt (nicht in der Sitemap)", /<meta name="robots" content="noindex">/.test(s.kopfZusatz) && s.ohneSitemap === true);
  pruefe("Seite: bindet CSS und Skript ein (Pfade für docs/ws/)", s.kopfZusatz.includes('href="../assets/css/bestellung.css"') && s.kopfZusatz.includes('<script type="module" src="../assets/js/bestellung/seite.js"></script>'));
  pruefe("Seite: lädt die Module vor (mailtext, zugang, formular)", ["mailtext", "zugang", "formular"].every((n) => s.kopfZusatz.includes(`<link rel="modulepreload" href="../assets/js/bestellung/${n}.js">`)));
  pruefe("Seite: Beschreibung 50 bis 170 Zeichen (Prüfung der Website)", s.description.length >= 50 && s.description.length <= 170, String(s.description.length));
  const m = /<script type="application\/json" id="bestellung-konfig">([\s\S]*?)<\/script>/.exec(s.inhalt);
  pruefe("Seite: Konfiguration eingebettet", !!m);
  gleichJson("Seite: eingebettete Konfiguration = öffentliche Konfiguration (mit dem verschlüsselten Paket, ohne Preise)", JSON.parse(m[1]), KONFIG_OEFFENTLICH);
  pruefe("Seite: Pflegehinweis der Datei nicht in der Seite", !s.inhalt.includes("_hinweis") && !s.inhalt.includes("Pflegedatei"));
  pruefe("Seite: kein „<“ und keine Skript-Ende-Marke in der eingebetteten Konfiguration", !m[1].includes("<"));
  pruefe("Seite: kein Betrag mit Nachkommastellen und kein „€“ im ausgelieferten Inhalt", !/\d[.,]\d{2}(?!\d)|€/.test(s.inhalt.replace(/"(salt|iv|ct)":"[^"]*"/g, "")), "Preis im HTML?");
  pruefe("Seite: ohne Code nur Kopf, Prototyp-Hinweis und Zugangsbox (kein Formular, keine Abschnitte, keine Felder außer dem Code)", !/id="bst-form"|<form class="bst-form"|<h2|bst-person|data-bezahlung|data-teamposten|<textarea/.test(s.inhalt) && (s.inhalt.match(/<input /g) || []).length === 1);
  for (const text of [
    "Bestellung für dein Team", "Diese Seite ist für Trainerinnen und Trainer. Gib den Code ein, den du vom Verein bekommen hast.",
    '<label for="bst-code">Code</label>', ">Öffnen</button>",
  ]) {
    pruefe(`Seite: Zugangsbox „${text.slice(0, 50)}${text.length > 50 ? "…" : ""}“`, s.inhalt.includes(text));
  }
  pruefe("Seite: Feld „Code“ ohne Autofill, groß geschrieben, ohne Rechtschreibprüfung", /<input type="text" id="bst-code" name="code" data-bst-code autocomplete="off" autocapitalize="characters" autocorrect="off" spellcheck="false"/.test(s.inhalt));
  pruefe("Seite: Meldung als Statusbereich, Formular der Zugangsbox", s.inhalt.includes('data-bst-zugang-meldung role="status"') && s.inhalt.includes('<form class="bst-zugang__form" data-bst-zugang-form novalidate>'));
  pruefe("Seite: Platz für das Formular ist verborgen und leer", s.inhalt.includes('<div class="bst-app" data-bst-app hidden></div>'));
  gleichJson("Seite: genau ein h1", [(s.inhalt.match(/<h1[ >]/g) || []).length], [1]);
  pruefe("Seite: keine TODO-Reste und kein console.log", !/TODO|FIXME|console\.log/.test(s.inhalt));
  wirft("Seite: ohne data/bestellung.json bricht der Bau ab", () => seite({ teams: DATEN.teams }), "data/bestellung.json fehlt");

  // Das Preispaket im Bau: aus den Daten, aus der Testvariable, beschädigt oder fehlend
  const paket = DATEN["bestellung-preise.enc"];
  gleichJson("Bau: das Paket aus data/bestellung-preise.enc.json steht in der Konfiguration (preiseVerschluesselt)", baueKonfig(DATEN).preiseVerschluesselt, paket);
  const alteVariable = process.env.BESTELLUNG_PREISE_ENC;
  const warnungen = [];
  const warnAlt = console.warn;
  const testDatei = path.join(ROOT, "tools", "cache", "bestellung-test", "paket-aus-variable.json");
  console.warn = (...a) => warnungen.push(a.join(" "));
  try {
    delete process.env.BESTELLUNG_PREISE_ENC;
    const ohne = baueKonfig({ ...DATEN, "bestellung-preise.enc": undefined });
    pruefe("Bau: fehlt das Paket, bricht der Bau nicht ab (preiseVerschluesselt ist null), meldet es aber", ohne.preiseVerschluesselt === null && warnungen.some((w) => w.includes("fehlt")), warnungen.join(" | "));
    warnungen.length = 0;
    const kaputtPaket = baueKonfig({ ...DATEN, "bestellung-preise.enc": { ...paket, iv: "zu kurz" } });
    pruefe("Bau: ein beschädigtes Paket bricht den Bau nicht ab, wird so eingebettet und gemeldet", kaputtPaket.preiseVerschluesselt.iv === "zu kurz" && warnungen.some((w) => w.includes("beschädigt")), warnungen.join(" | "));
    warnungen.length = 0;
    // Nur für Tests: BESTELLUNG_PREISE_ENC ersetzt die Datei im Repo
    mkdirSync(path.dirname(testDatei), { recursive: true });
    writeFileSync(testDatei, JSON.stringify({ ...paket, salt: "AAAAAAAAAAAAAAAAAAAAAA==" }));
    process.env.BESTELLUNG_PREISE_ENC = testDatei;
    gleich("Bau: BESTELLUNG_PREISE_ENC ersetzt das Paket aus data/ (nur für Tests)", baueKonfig(DATEN).preiseVerschluesselt.salt, "AAAAAAAAAAAAAAAAAAAAAA==");
    process.env.BESTELLUNG_PREISE_ENC = path.join(ROOT, "tools", "cache", "bestellung-test", "gibt-es-nicht.json");
    wirft("Bau: BESTELLUNG_PREISE_ENC zeigt auf eine fehlende Datei › Abbruch mit klarer Meldung", () => baueKonfig(DATEN), "lässt sich nicht lesen");
    writeFileSync(testDatei, "{kaputt");
    process.env.BESTELLUNG_PREISE_ENC = testDatei;
    wirft("Bau: BESTELLUNG_PREISE_ENC ist kein JSON › Abbruch mit klarer Meldung", () => baueKonfig(DATEN), "kein gültiges JSON");
  } finally {
    console.warn = warnAlt;
    rmSync(testDatei, { force: true });
    if (alteVariable === undefined) delete process.env.BESTELLUNG_PREISE_ENC;
    else process.env.BESTELLUNG_PREISE_ENC = alteVariable;
  }
}

// ---------- Formular nach dem Entschlüsseln ----------

abschnitt("Formular");
{
  const html = baueFormular(KONFIG);
  gleich("Formular: Einleitung", TEXT_LEAD, "Hier stellst du zusammen, was dein Team braucht. Am Ende öffnet sich dein Mailprogramm mit der fertigen Bestellung an den Verein – du musst nur noch auf „Senden“ tippen.");
  for (const text of [
    TEXT_LEAD, "Wer bestellt?", "Kleidung je Person", "Teambedarf", "Bezahlung", "Übersicht und Senden",
    "Name und Nummer werden nur gedruckt, wo du es anhakst.", "+ Person hinzufügen", "Preise klärt der Vorstand.",
    "Wer zahlt die Kleidung?", "Wer zahlt den Teambedarf?", "Hinweis zur Bezahlung (freiwillig)", "Sonstiger Hinweis (freiwillig)",
    "Mehrere möglich. Wie geteilt wird, kannst du unten bei „Hinweis zur Bezahlung“ schreiben.",
    "Dein Name", "Telefon (freiwillig)", "Gebraucht bis (freiwillig)", "Bestellung per Mail senden", "Text kopieren", "Mail ansehen", "Neue Bestellung beginnen", "Sonstiges",
    "Die Seite speichert nichts auf einem Server. Deine Eingaben bleiben auf diesem Gerät, bis du sie per Mail verschickst.",
    "Preise laut Angebot 11Teamsport vom 24.11.2026 (Listenpreis − 40 %, Aufdrucke einzeln).",
    "Code auf diesem Gerät vergessen",
    "Summe (Preise laut Angebot)",
    "Die Bestellung ist lang. Falls in der Mail etwas fehlt: „Text kopieren“ und einfügen.",
  ]) {
    pruefe(`Formular: Text „${text.slice(0, 50)}${text.length > 50 ? "…" : ""}“`, html.includes(text.replaceAll("&", "&amp;").replaceAll('"', "&quot;")));
  }
  pruefe("Formular: nicht mehr „Preise für Eltern bzw. Spieler“ und nicht mehr „Name des Sponsors“", !html.includes("Preise für Eltern") && !html.includes("Name des Sponsors") && !html.includes("data-sponsor-feld") && !html.includes("Name und Nummer werden auf Trikot"));
  gleich("Formular: Übersicht startet mit „0,00 €“", /<dd data-u="summe">([^<]*)<\/dd>/.exec(html)[1], "0,00 €");
  // Bezahlung: je Block Kontrollkästchen (mehrere Antworten möglich) in der Reihenfolge der Datei, der Hinweis steht unter der Legende
  const hinweisBezahlung = "Mehrere möglich. Wie geteilt wird, kannst du unten bei „Hinweis zur Bezahlung“ schreiben.";
  for (const [block, frage] of [["kleidung", "Wer zahlt die Kleidung?"], ["teambedarf", "Wer zahlt den Teambedarf?"]]) {
    const gruppe = new RegExp(`<fieldset class="bst-gruppe" data-bezahlung="${block}"[^>]*>[\\s\\S]*?</fieldset>`).exec(html);
    const g = gruppe ? gruppe[0] : "";
    pruefe(`Formular: Bezahlung ${block}: Legende „${frage}“, darunter der Satz „Mehrere möglich …“`, g.includes(`<legend>${frage}</legend>\n      <p class="bst-hinweis" id="bst-bez-${block}-hilfe">${hinweisBezahlung}</p>`), g.slice(0, 400));
    gleichJson(`Formular: Bezahlung ${block}: vier Kontrollkästchen in der Reihenfolge der Datei`, [...g.matchAll(/<input type="checkbox" name="bez-[a-z]+" value="([a-z-]+)" data-bez-wert>/g)].map((x) => x[1]), ["eltern", "vereinskasse", "sponsor", "spenden"]);
    pruefe(`Formular: Bezahlung ${block}: keine Auswahlknöpfe (radio), keine Rolle radiogroup, anfangs verborgen, kein Feld für den Namen mehr`, !g.includes('type="radio"') && !g.includes("radiogroup") && /^<fieldset[^>]* hidden>/.test(g) && !g.includes('type="text"'));
  }
  gleich("Formular: der Satz „Mehrere möglich …“ steht zweimal (je Block)", String(html.split(hinweisBezahlung).length - 1), "2");
  // Block „Sponsor“ im Abschnitt Bezahlung
  const sponsor = /<fieldset class="bst-gruppe bst-sponsorblock"[\s\S]*?<\/fieldset>/.exec(html);
  const sp = sponsor ? sponsor[0] : "";
  pruefe("Formular: Block „Sponsor“ im Abschnitt Bezahlung, anfangs verborgen, mit dem Hinweis wörtlich", !!sponsor && /^<fieldset[^>]* hidden>/.test(sp) && sp.includes("<legend>Sponsor</legend>") && sp.includes(TEXT_HINWEIS_SPONSOR) && html.indexOf(sp) > html.indexOf('id="bst-h-bezahlung"') && html.indexOf(sp) < html.indexOf('for="bst-hinweis-bezahlung"'), sp.slice(0, 300));
  gleichJson("Formular: Felder des Blocks „Sponsor“ in dieser Reihenfolge", [...sp.matchAll(/<label for="[^"]+">([^<]*)<\/label>/g)].map((x) => x[1]), ["Firma", "Ansprechpartner (freiwillig)", "E-Mail (freiwillig)", "Telefon (freiwillig)", "Anschrift für die Rechnung (freiwillig)"]);
  pruefe("Formular: Block „Sponsor“: die Anschrift ist ein mehrzeiliges Feld, die E-Mail hat den Typ email, nur die Firma trägt den Schlüssel für Lücken", /<textarea id="bst-sponsor-anschrift" data-feld="sponsor.anschrift" rows="3"/.test(sp) && sp.includes('type="email"') && (sp.match(/data-schluessel=/g) || []).length === 1 && sp.includes('data-schluessel="sponsor:firma"'));
  // Lieferanschrift
  const liefer = /<fieldset class="bst-gruppe bst-lieferung">[\s\S]*?<\/fieldset>/.exec(html);
  const li = liefer ? liefer[0] : "";
  gleichJson("Formular: Lieferanschrift mit Legende und den drei Feldern", [(/<legend>([^<]*)<\/legend>/.exec(li) || [])[1], ...[...li.matchAll(/<label for="[^"]+">([^<]*)<\/label>/g)].map((x) => x[1])], ["Lieferanschrift (die Bestellung kommt zu dir)", "Name", "Straße und Hausnummer", "PLZ und Ort"]);
  pruefe("Formular: Lieferanschrift im Abschnitt „Wer bestellt?“, gebunden an lieferName, lieferStrasse, lieferOrt, mit Schlüsseln für Lücken", !!liefer && html.indexOf(li) > html.indexOf('id="bst-h-wer"') && html.indexOf(li) < html.indexOf('id="bst-h-kleidung"') && ["lieferName", "lieferStrasse", "lieferOrt"].every((f) => li.includes(`data-feld="${f}" data-schluessel="${f}"`)));
  pruefe("Formular: nur Namen und Kürzel der Mannschaften (keine Trainer, Mails, Plätze)", KONFIG.mannschaften.every((x) => Object.keys(x).sort().join() === "name,slug"));
  for (const t of KONFIG.teambedarf) pruefe(`Formular: Teambedarf ${t.anzeige}`, html.includes(`>${t.anzeige.replaceAll("&", "&amp;")}<`) || html.includes(`${t.anzeige}</span>`));
  for (const m2 of KONFIG.mannschaften) pruefe(`Formular: Mannschaft ${m2.name}`, html.includes(`<option value="${m2.slug}">${m2.name}</option>`));
  pruefe("Formular: kein Skript, kein TODO, kein console.log", !/<script|TODO|FIXME|console\.log/.test(html));
  pruefe("Formular: Eingaben haben Beschriftungen (jedes Feld mit id hat ein label for)", [...html.matchAll(/<(?:input|select|textarea)[^>]* id="([^"]+)"/g)].filter((x) => !/^bst-d-/.test(x[1])).every((x) => html.includes(`for="${x[1]}"`)));
  pruefe("Formular: der Fuß nennt Quelle und Rabatt aus den Daten (40 %), ein anderer Rabatt ändert den Text", baueFormular(mitPreisen(KONFIG_OEFFENTLICH, { ...kopieTestpreise(), rabattProzent: 12.5 })).includes("(Listenpreis − 12,5 %, Aufdrucke einzeln)."));
}

// ---------- öffentliche Ausgabe: keine internen Daten, kein Grün, keine fremden Adressen ----------

abschnitt("Dateien");
{
  const dateien = [
    "data/bestellung.json",
    "src/seiten/bestellung.mjs",
    "assets/css/bestellung.css",
    "tools/bestellung-zugang.mjs",
    ...readdirSync(path.join(ROOT, "assets", "js", "bestellung")).map((n) => "assets/js/bestellung/" + n),
  ];
  const text = (d) => readFileSync(path.join(ROOT, d), "utf8");
  for (const d of dateien) {
    const t = text(d);
    pruefe(`${d}: keine Einkaufsdaten (Einkaufspreis, Kundenkonto, Angebot)`, !/Einkaufspreis|Kundenkonto|Kundennummer|Angebotsnummer|Angebotsnr/i.test(t.replace("Einkaufspreise, Kundenkonto und Angebotsnummern des Lieferanten gehören nie in diese Datei.", "")));
    pruefe(`${d}: keine TODO/FIXME`, !/TODO|FIXME/.test(t));
    pruefe(`${d}: keine fremden Adressen (https://) außer dem Link der Seite im Werkzeug`, d === "tools/bestellung-zugang.mjs" ? !/https?:\/\/(?!justolgay\.github\.io\/speuzer-website-prototyp\/)/.test(t) : !/https?:\/\//.test(t));
  }
  for (const d of dateien.filter((x) => x.startsWith("assets/js/"))) {
    const t = text(d);
    pruefe(`${d}: kein console.log`, !/console\.log/.test(t));
    pruefe(`${d}: kein dynamisches import()`, !/\bimport\s*\(/.test(t));
  }
  const css = text("assets/css/bestellung.css");
  pruefe("bestellung.css: keine Farbnamen (kein Grün, kein Rot)", !/\b(?:red|green|lime|crimson|orange|gold|silver)\b/i.test(css));
  pruefe("bestellung.css: Farben nur über Tokens (var(--…)) und ein Rahmengrau", (css.match(/#[0-9a-fA-F]{3,8}\b/g) || []).join(",") === "#858bae");
  // Das Preispaket: nur das verschlüsselte Format, kein Klartext
  const paketText = text("data/bestellung-preise.enc.json");
  const paket = JSON.parse(paketText);
  gleichJson("data/bestellung-preise.enc.json: genau die Felder des Formats", Object.keys(paket), ["format", "kdf", "iter", "salt", "iv", "ct"]);
  pruefe("data/bestellung-preise.enc.json: kein Klartext (kein „uvp“, „rabatt“, „quelle“, „€“)", !/uvp|rabatt|quelle|veredelung|Angebot|€/i.test(paketText.replace(/"(salt|iv|ct)": "[^"]*"/g, "")) && !/uvp|rabatt/i.test(Buffer.from(paket.ct, "base64").toString("latin1")));
  gleich("data/bestellung-preise.enc.json: Format, Verfahren und Runden", [paket.format, paket.kdf, paket.iter].join("|"), "speuzer-bestellung-preise-v1|PBKDF2-SHA256|600000");
}

// ---------- Zusammenfassung ----------

console.log("");
if (fehler.length) {
  console.log(`mailtext-test: ${anzahl} Prüfungen, ${fehler.length} FEHLER`);
  process.exit(1);
}
console.log(`mailtext-test: ${anzahl} Prüfungen, alle bestanden`);
