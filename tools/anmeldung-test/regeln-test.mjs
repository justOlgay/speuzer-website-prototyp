// Tests des Regelwerks des Anmelde-Assistenten (AP-1).
// Aufruf: node tools/anmeldung-test/regeln-test.mjs   (Exit-Code 0 bei Erfolg, sonst 1)
// Keine neuen Pakete: nur node:assert und node:fs. Die Tests prüfen
//  - Datum, Alter und Altersklassen
//  - die Datendatei data/anmeldung.json (Vollständigkeit, Quellen, Übereinstimmung mit teams.json und beitraege.json)
//  - jedes Profil aus profile.mjs gegen seine erwarteten Kernergebnisse
//  - Wartefristen mit Rechenbeispielen, alle Fälle F01-F18 und alle Regeln R1-R9, R13-R15
//  - die Reihenfolge der Schritte
//  - die Texte (Vollständigkeit, Einfache Sprache, Platzhalter)
//  - Eigenschaften über tausende zufällige Antworten (Zufallsprüfung mit festem Startwert)
//  - keine DOM- und Zeit-Zugriffe, keine Personennamen, Unveränderlichkeit der Eingaben

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as R from "../../assets/js/anmeldung/regeln.js";
import { ladeKonfig, PROFILE, BAUSTEINE, HEUTE_STANDARD } from "./profile.mjs";

const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const konfig = ladeKonfig();
const cfg = konfig.anmeldung;

// ---------- kleine Prüf-Werkzeuge (zählen jede Einzelprüfung) ----------

let anzahl = 0;
const fehler = [];

function pruefe(name, fn) {
  anzahl += 1;
  try {
    fn();
  } catch (err) {
    fehler.push(name + " -> " + String(err && err.message ? err.message : err).split("\n")[0].slice(0, 400));
  }
}
function wahr(name, bedingung, hinweis) {
  pruefe(name, () => assert.ok(bedingung, hinweis || "nicht wahr"));
}
function gleich(name, ist, soll) {
  pruefe(name, () => {
    if (JSON.stringify(ist) !== JSON.stringify(soll)) throw new Error("ist=" + JSON.stringify(ist) + " soll=" + JSON.stringify(soll));
  });
}
function enthaelt(name, liste, wert) {
  pruefe(name, () => {
    if (!Array.isArray(liste) || liste.indexOf(wert) < 0) throw new Error("fehlt: " + JSON.stringify(wert) + " in " + JSON.stringify(liste));
  });
}
function enthaeltNicht(name, liste, wert) {
  pruefe(name, () => {
    if (Array.isArray(liste) && liste.indexOf(wert) >= 0) throw new Error("darf nicht enthalten sein: " + JSON.stringify(wert));
  });
}
function lies(relativ) {
  return readFileSync(path.join(WURZEL, relativ), "utf8");
}
function tiefKopie(x) {
  return JSON.parse(JSON.stringify(x));
}
function tiefEinfrieren(x) {
  if (x && typeof x === "object" && !Object.isFrozen(x)) {
    Object.freeze(x);
    Object.keys(x).forEach((k) => tiefEinfrieren(x[k]));
  }
  return x;
}

const ERSETZE = (text, werte) => String(text).replace(/\{(\w+)\}/g, (t, n) => (werte && n in werte && werte[n] !== undefined && werte[n] !== null ? String(werte[n]) : t));

// ---------- 1. Datum, Alter, Altersklassen ----------

function testeDatum() {
  gleich("alterAm: Geburtstag heute", R.alterAm("2016-09-29", "2026-09-29"), 10);
  gleich("alterAm: Geburtstag morgen", R.alterAm("2016-09-30", "2026-09-29"), 9);
  gleich("alterAm: Schalttag am 28. Februar", R.alterAm("2016-02-29", "2027-02-28"), 10);
  gleich("alterAm: Schalttag am 1. März", R.alterAm("2016-02-29", "2027-03-01"), 11);
  gleich("alterAm: ungültiges Datum", R.alterAm("2016-13-40", "2026-09-29"), null);
  gleich("alterAm: Geburt nach dem Stichtag", R.alterAm("2030-01-01", "2026-09-29"), null);
  gleich("alterAm: fehlendes Datum", R.alterAm("", "2026-09-29"), null);
  gleich("istMinderjaehrig: 17 Jahre", R.istMinderjaehrig({ geburtsdatum: "2008-10-15" }, HEUTE_STANDARD), true);
  gleich("istMinderjaehrig: 18 Jahre heute", R.istMinderjaehrig({ geburtsdatum: "2008-09-29" }, HEUTE_STANDARD), false);
  gleich("istMinderjaehrig: ohne Geburtsdatum", R.istMinderjaehrig({}, HEUTE_STANDARD), null);
  gleich("istMinderjaehrig: ohne Antworten", R.istMinderjaehrig(null, HEUTE_STANDARD), null);
  // Altersklassen 2026/27 (Kreis Frankfurt): G 2020 und jünger, F 2018/2019, E 2016/2017, D 2014/2015, C 2012/2013, B 2010/2011, A 2008/2009
  const klassen = { 2025: "G", 2021: "G", 2020: "G", 2019: "F", 2018: "F", 2017: "E", 2016: "E", 2015: "D", 2014: "D", 2013: "C", 2012: "C", 2011: "B", 2010: "B", 2009: "A", 2008: "A", 2007: "Herren", 1990: "Herren", 1940: "Herren" };
  Object.keys(klassen).forEach((j) => gleich("altersklasse Jahrgang " + j, R.altersklasse(j + "-06-15", konfig), klassen[j]));
  gleich("altersklasse: 1. Januar 2008", R.altersklasse("2008-01-01", konfig), "A");
  gleich("altersklasse: 31. Dezember 2007", R.altersklasse("2007-12-31", konfig), "Herren");
  gleich("altersklasse: ungültig", R.altersklasse("kein Datum", konfig), null);
  gleich("altersklasse: ohne Konfiguration", R.altersklasse("2014-05-10", {}), null);
  gleich("VERSION ist Text", typeof R.VERSION, "string");
  gleich("Exporte", Object.keys(R).sort().join(","), ["SCHLUESSEL", "VERSION", "alterAm", "altersklasse", "auswerten", "istMinderjaehrig", "optionenBesonderes", "schritte", "unbekannteSchluessel"].sort().join(","));
  pruefe("konfig.anmeldung fehlt: klare Fehlermeldung", () => assert.throws(() => R.auswerten({}, {}, HEUTE_STANDARD), /konfig\.anmeldung fehlt/));
  pruefe("schritte ohne Antworten läuft", () => assert.ok(R.schritte(null, konfig, HEUTE_STANDARD).length > 5));
}

// ---------- 2. Datendatei ----------

const U_IDS = Array.from({ length: 40 }, (_, i) => "U" + String(i + 1).padStart(2, "0"));
const F_IDS = Array.from({ length: 18 }, (_, i) => "F" + String(i + 1).padStart(2, "0"));
const R_IDS = Array.from({ length: 15 }, (_, i) => "R" + (i + 1));
const ART = ["pflicht", "verein", "freiwillig", "nur_wenn", "offen"];
const WER_U = ["familie", "arzt", "verein", "alter_verein"];
const WANN = ["anmeldung", "vor_erstem_spiel", "vor_erstem_training", "spaeter"];
const FORM = ["formular_im_pdf", "foto_oder_datei", "original_mitbringen", "unterschrift", "nichts"];
const FORMULARE = ["aufnahmeantrag", "hfv_antrag", "vollmacht", "abmeldung", "einverstaendnis_senioren", "attest", "datenschutz", "notfall", "einverstaendnis_fahrten", "einverstaendnis_maedchen", "karneval_auftritte", "familienliste"];
const WER_S = ["mitglied", "sorgeberechtigte", "sorgeberechtigte_beide", "kontoinhaber", "arzt", "verein", "spieler"];

function testeDaten() {
  ["stand", "saison", "quellenStand", "altersklassen", "mannschaften", "karnevalGruppen", "beitragsgruppen", "unterlagen", "faelle", "fristen", "kontakte", "offenePunkte"]
    .forEach((k) => wahr("Daten: Schlüssel " + k, cfg[k] !== undefined && cfg[k] !== null));
  // Die Version des Regelwerks steht im Modul und in der Datendatei und muss übereinstimmen (der Laufzettel druckt sie)
  gleich("Daten: Version in regeln.js und data/anmeldung.json gleich", cfg.version, R.VERSION);
  wahr("Daten: Version hat die Form JJJJ-MM-TT.N", /^\d{4}-\d{2}-\d{2}\.\d+$/.test(R.VERSION));
  gleich("Daten: Unterlagen U01 bis U40 vollständig", Object.keys(cfg.unterlagen).sort(), U_IDS.slice().sort());
  gleich("Daten: Fälle F01 bis F18 vollständig", Object.keys(cfg.faelle).sort(), F_IDS.slice().sort());
  U_IDS.forEach((id) => {
    const u = cfg.unterlagen[id];
    wahr("Daten " + id + ": Felder", u && ART.includes(u.art) && WER_U.includes(u.wer) && WANN.includes(u.wann) && FORM.includes(u.form) && (u.formular === null || FORMULARE.includes(u.formular)) && typeof u.nachweis === "boolean" && !!u.bedingung && !!u.titel);
  });
  // Quellen: Unterlagen, Fristregeln, Fälle, Gruppen, Beitragsgruppen, offene Punkte
  gleich("Quellen: Unterlagen ohne quelle", Object.values(cfg.unterlagen).filter((u) => !u.quelle).length, 0);
  gleich("Quellen: Fälle ohne quelle", Object.values(cfg.faelle).filter((f) => !f.quelle).length, 0);
  gleich("Quellen: Fristregeln R1 bis R15 vorhanden", Object.keys(cfg.fristen.regeln).sort(), R_IDS.slice().sort());
  gleich("Quellen: Fristregeln ohne quelle", Object.values(cfg.fristen.regeln).filter((r) => !r.quelle).length, 0);
  gleich("Quellen: Fristkonstanten ohne quelle", ["spieljahr", "alter", "vollmacht", "wiederholterWechsel", "gebuehren", "aufbewahrungJahre", "spielerfotoErneuernJahre", "stichprobenOnlineWechsel"].filter((k) => !cfg.fristen[k].quelle), []);
  gleich("Quellen: Wartefrist-Bausteine ohne quelle", Object.keys(cfg.fristen.jugend).filter((k) => !cfg.fristen.jugend[k].quelle), []);
  gleich("Quellen: Wechselperioden ohne quelle", ["wechselperiodeI", "wechselperiodeII"].filter((k) => !cfg.fristen.senioren[k].quelle), []);
  gleich("Quellen: Karnevalgruppen ohne quelle", cfg.karnevalGruppen.filter((g) => !g.quelle).length, 0);
  gleich("Quellen: Beitragsgruppen ohne quelle", Object.values(cfg.beitragsgruppen).filter((g) => !g.quelle).length, 0);
  gleich("Quellen: offene Punkte ohne quelle", cfg.offenePunkte.filter((o) => !o.quelle).length, 0);
  wahr("Quellen: quellenStand nennt Dokument und Stand", cfg.quellenStand.length >= 20 && cfg.quellenStand.every((q) => q.quelle && q.stand));
  wahr("Quellen: Jugendordnung Stand 2026-07-01", cfg.quellenStand.some((q) => /Jugendordnung/.test(q.quelle) && q.stand === "2026-07-01"));
  wahr("Quellen: Spielordnung Stand 2026-07-06", cfg.quellenStand.some((q) => /Spielordnung/.test(q.quelle) && q.stand === "2026-07-06"));
  // Karnevalgruppen: Alter nur aus Sekundärquelle, deshalb nicht bestätigt
  gleich("Karneval: Gruppen wie karneval.json", cfg.karnevalGruppen.map((g) => g.name).sort(), JSON.parse(lies("data/karneval.json")).gruppen.map((g) => g.name).sort());
  wahr("Karneval: bestaetigt false", cfg.karnevalGruppen.every((g) => g.bestaetigt === false));
  // Mannschaften stimmen mit teams.json überein (kein Auseinanderlaufen)
  const teams = JSON.parse(lies("data/teams.json"));
  gleich("Mannschaften: gleiche Anzahl wie teams.json", cfg.mannschaften.length, teams.length);
  teams.forEach((t) => {
    const m = cfg.mannschaften.find((x) => x.slug === t.slug);
    wahr("Mannschaft " + t.slug + " vorhanden", !!m);
    if (m) {
      gleich("Mannschaft " + t.slug + ": Name", m.name, t.name);
      const jg = t.jahrgang;
      const soll = !jg ? [] : /und jünger/.test(jg) ? [] : jg.split("/").map(Number);
      gleich("Mannschaft " + t.slug + ": Jahrgänge", m.jahrgaenge, soll);
    }
  });
  // Beiträge stimmen mit beitraege.json überein und zeigen auf vorhandene Felder des Aufnahmeantrags
  const beitraege = JSON.parse(lies("data/beitraege.json"));
  const felder = JSON.parse(lies("data/aufnahmeantrag-felder.json")).felder;
  Object.entries(cfg.beitragsgruppen).forEach(([key, g]) => {
    const zeilen = beitraege[g.abteilung];
    wahr("Beitragsgruppe " + key + ": Betrag steht in beitraege.json", zeilen.some((z) => z.jahr === g.jahr && (z.monat === g.monat || (z.monat === null && g.monat === null))));
    wahr("Beitragsgruppe " + key + ": Feld " + g.aufnahmeantragFeld + " im Aufnahmeantrag", !!felder[g.aufnahmeantragFeld]);
  });
  gleich("Beitrag: Aufnahmegebühr wie beitraege.json", cfg.beitragInfo.aufnahmegebuehr, beitraege.aufnahmegebuehr);
  gleich("Beitrag: Zuschlag wie beitraege.json", cfg.beitragInfo.zuschlagOhneSepa, beitraege.zuschlag_ohne_sepa);
  // Kontakte: nur Vereinsadressen
  const verein = JSON.parse(lies("data/verein.json"));
  gleich("Kontakte: Geschäftsstelle", cfg.kontakte.geschaeftsstelle.mail, verein.mail);
  gleich("Kontakte: Jugendleitung", cfg.kontakte.jugendleitung.mail, verein.mails.jugendleitung);
  gleich("Kontakte: Karneval", cfg.kontakte.karneval.mail, verein.mails.karneval);
  gleich("Kontakte: Spielausschuss", cfg.kontakte.spielausschuss.mail, verein.mails.senioren);
  gleich("Kontakte: Telefon", cfg.kontakte.telefon, verein.tel_geschaeftsstelle);
  // Fristen 2026/27: Wechselperioden mit Daten
  const w = cfg.fristen.wechselperioden2026_27;
  gleich("Fristen: Wechselperiode I endet 2026-08-31", w.I.antragBis, "2026-08-31");
  gleich("Fristen: Wechselperiode II endet 2027-01-31", w.II.antragBis, "2027-01-31");
  gleich("Fristen: Abmeldung Wechselperiode I bis 2026-06-30", w.I.abmeldungBis, "2026-06-30");
  gleich("Fristen: Juni-Fenster", [cfg.fristen.jugend.wechselzeitJuni.von, cfg.fristen.jugend.wechselzeitJuni.bis], ["06-01", "06-30"]);
  gleich("Fristen: Wartefrist Monate", [cfg.fristen.jugend.ausserhalbJuni.mitFreigabeMonate, cfg.fristen.jugend.ausserhalbJuni.ohneFreigabeMonate], [3, 6]);
  gleich("Fristen: internationale Grenze 10", cfg.fristen.alter.international, 10);
  gleich("Fristen: Gebühren Junioren und Herren", [cfg.fristen.gebuehren.wechselJunioren, cfg.fristen.gebuehren.wechselHerren], [10, 25]);
  gleich("Fristen: Entschädigung Herren ab Kreisliga", cfg.fristen.entschaedigung.herrenWechselperiodeI.abKreisliga, 250);
  gleich("Fristen: Entschädigung Mittelwert aus Verbandsliga", cfg.fristen.entschaedigung.herrenWechselperiodeI.mittelwertAusVerbandsliga, (1500 + 250) / 2);
  // Offene Punkte: Themen der Recherche sind aufgeführt
  const alleIds = new Set([].concat(U_IDS, F_IDS, R_IDS));
  cfg.offenePunkte.forEach((o) => {
    wahr("Offener Punkt " + o.id + ": Aufbau", !!o.frage && !!o.an && !!o.prioritaet && Array.isArray(o.betrifft));
    wahr("Offener Punkt " + o.id + ": betrifft nur bekannte Kennungen", o.betrifft.every((b) => alleIds.has(b)));
  });
  gleich("Offene Punkte: eindeutige Kennungen", new Set(cfg.offenePunkte.map((o) => o.id)).size, cfg.offenePunkte.length);
  const betroffen = new Set(); cfg.offenePunkte.forEach((o) => o.betrifft.forEach((b) => betroffen.add(b)));
  ["U07", "U09", "U10", "U12", "U13", "U16", "U18", "U23", "U25", "U26", "U27", "U31", "U32", "U34", "U35", "U38", "U39", "F04", "F07", "F08", "F14", "F15", "F16", "F17", "F18", "R2", "R4", "R5", "R13", "R15"]
    .forEach((id) => wahr("Offene Punkte betreffen " + id, betroffen.has(id)));
  ["Passstelle", "Vorstand"].forEach((wort) => wahr("Offene Punkte: Fragen an " + wort, cfg.offenePunkte.some((o) => (wort === "Passstelle" ? o.an === "hfv_passstelle" : o.an === "vorstand"))));
  wahr("Offene Punkte: Frage nach jüngerem D-Jahrgang", cfg.offenePunkte.some((o) => /D-Jahrgang/.test(o.frage)));
  wahr("Offene Punkte: Frage nach Meldebescheinigung mit einem Elternteil", cfg.offenePunkte.some((o) => /Elternteil/.test(o.frage) && o.betrifft.includes("U13")));
  wahr("Offene Punkte: Frage nach dem 10. Lebensjahr", cfg.offenePunkte.some((o) => /10\. Lebensjahr|9\. oder ab dem 10\./.test(o.frage)));
  wahr("Offene Punkte: Frage nach § 109a", cfg.offenePunkte.some((o) => /109a/.test(o.frage)));
  wahr("Offene Punkte: Frage nach Arzt oder Sportarzt", cfg.offenePunkte.some((o) => /Sportarzt/.test(o.frage)));
  wahr("Offene Punkte: Frage nach Beginn der Mitgliedschaft", cfg.offenePunkte.some((o) => /Beginn der Mitgliedschaft/.test(o.frage)));
  wahr("Offene Punkte: Frage nach Probemitgliedschaft", cfg.offenePunkte.some((o) => /Probemitgliedschaft/.test(o.frage)));
  // Runde 2 (Prüfung Orchestrator, 29.09.2026): zwei neue offene Punkte an den Vorstand
  const o65 = cfg.offenePunkte.find((o) => o.id === "O65");
  const o66 = cfg.offenePunkte.find((o) => o.id === "O66");
  wahr("Offener Punkt O65: Foto-Einwilligung bei Jugendlichen (an vorstand, P2, betrifft U04)",
    !!o65 && o65.an === "vorstand" && o65.prioritaet === "P2" && o65.betrifft.join(",") === "U04" && o65.status === "offen" && /Foto-Einwilligung bei Jugendlichen/.test(o65.frage) && /ab 14 oder ab 16/.test(o65.frage) && /Einsichtsfähigkeit/.test(o65.frage));
  wahr("Offener Punkt O65: Quelle nennt die Prüfung des Orchestrators", !!o65 && /Prüfung Orchestrator, 29\.09\.2026/.test(o65.quelle));
  wahr("Offener Punkt O65: Satz zum entfernten Hinweis", !!o65 && /Der Assistent lässt bisher nur die Eltern unterschreiben\. Der Hinweis dazu ist bis zur Entscheidung entfernt\.$/.test(o65.frage));
  wahr("Offener Punkt O66: Adresse der Satzung im Aufnahmeantrag (an vorstand, P1, betrifft U01)",
    !!o66 && o66.an === "vorstand" && o66.prioritaet === "P1" && o66.betrifft.join(",") === "U01" && o66.status === "offen" && /www\.sportfreunde04\.de\/satzung\.pdf/.test(o66.frage) && /Fehler 401/.test(o66.frage));
  wahr("Offener Punkt O66: Quelle nennt die Prüfung des Orchestrators", !!o66 && /Prüfung Orchestrator, 29\.09\.2026/.test(o66.quelle));
  // Runde 4 (Prüfung Orchestrator, 30.09.2026): fünf weitere offene Punkte, die auch die Konzeptseite (AP-6) führt
  const punkt = (id) => cfg.offenePunkte.find((o) => o.id === id);
  [
    ["O67", "datenschutz", "P1", "U28,U06", /Art\. 6 Abs\. 1 lit\. b DSGVO/, /oder lit\. f/],
    ["O68", "vorstand", "P1", "U01,U04,U05,U06,U29", /am Bildschirm unterschrieben/, /§ 127 BGB/],
    ["O69", "jugendleitung", "P2", "U18", /Vollmacht für die Abmeldung/, /in DFBnet ein/],
    ["O70", "jugendleitung", "P2", "U07", /Kreisjugendwart \(HFV-Jugendordnung § 7 Nr\. 2\)/, /Wer meldet, bis wann\?$/],
    ["O71", "vorstand", "P2", "", /Wer pflegt Fristen, Beträge und Gebühren/, /Beitragsordnung oder Verbandsordnungen ändern\?$/],
  ].forEach(([id, an, prio, betrifft, muster1, muster2]) => {
    const o = punkt(id);
    wahr("Offener Punkt " + id + ": an " + an + ", " + prio + ", betrifft " + (betrifft || "keine Unterlage") + ", status offen",
      !!o && o.an === an && o.prioritaet === prio && Array.isArray(o.betrifft) && o.betrifft.join(",") === betrifft && o.status === "offen");
    wahr("Offener Punkt " + id + ": Frage", !!o && muster1.test(o.frage) && muster2.test(o.frage));
    wahr("Offener Punkt " + id + ": Quelle nennt die Prüfung des Orchestrators vom 30.09.2026", !!o && /^Prüfung Orchestrator, 30\.09\.2026/.test(o.quelle));
  });
  wahr("Offener Punkt O68: Quelle nennt digitaleUnterschrift in data/anmeldung-formulare.json", /data\/anmeldung-formulare\.json \(digitaleUnterschrift\)/.test(punkt("O68").quelle));
  wahr("Offener Punkt O70: Quelle nennt HFV-Jugendordnung § 7 Nr. 2", /HFV-Jugendordnung § 7 Nr\. 2/.test(punkt("O70").quelle));
  // 07.10.2026 (Prüfung Orchestrator, Paket N-A2): zwei offene Punkte zur Übergabe des PDFs in der App und zum automatischen Versand
  [
    ["O72", "vorstand", "P1", "", /Wie übergibt die Familie das PDF in der Vereins-App\?/, /weist der Assistent in der App auf „Im Browser öffnen“ hin\.$/],
    ["O73", "datenschutz", "P1", "U10,U11,U12,U28", /Teil C enthält Gesundheitsdaten \(Art\. 9 DSGVO\)/, /nur verschlüsselt oder getrennt auf Papier\?$/],
  ].forEach(([id, an, prio, betrifft, muster1, muster2]) => {
    const o = punkt(id);
    wahr("Offener Punkt " + id + ": an " + an + ", " + prio + ", betrifft " + (betrifft || "keine Unterlage") + ", status offen",
      !!o && o.an === an && o.prioritaet === prio && Array.isArray(o.betrifft) && o.betrifft.join(",") === betrifft && o.status === "offen");
    wahr("Offener Punkt " + id + ": Frage", !!o && muster1.test(o.frage) && muster2.test(o.frage));
    wahr("Offener Punkt " + id + ": Quelle nennt die Prüfung des Orchestrators vom 07.10.2026", !!o && /^Prüfung Orchestrator, 07\.10\.2026$/.test(o.quelle));
  });
  // 08.10.2026 (Entscheidung der Jugendleitung): O26 ist entschieden, O68 bleibt offen und trägt den Stand; O65 bleibt offen
  const o26b = punkt("O26");
  const o68b = punkt("O68");
  wahr("Offener Punkt O26: Status entschieden (an vorstand, P1, betrifft U01 und U04)",
    !!o26b && o26b.status === "entschieden" && o26b.an === "vorstand" && o26b.prioritaet === "P1" && o26b.betrifft.join(",") === "U01,U04");
  gleich("Offener Punkt O26: Entscheidung", o26b.entscheidung,
    "Ein Elternteil reicht (Jugendleitung, 08.10.2026). Ausnahme: getrennt lebende Eltern ohne Einverständnis – dann unterschreibt der andere Elternteil mit Stift.");
  wahr("Offener Punkt O26: die Frage nennt keine Empfehlung „beide“ mehr", !/empfiehlt/.test(o26b.frage) && /Einer oder beide/.test(o26b.frage));
  wahr("Offener Punkt O68: Status bleibt offen, mit Stand der Jugendleitung",
    !!o68b && o68b.status === "offen" && o68b.stand === "Jugendleitung befürwortet (08.10.2026); Beschluss des Vorstands steht aus.");
  wahr("Offener Punkt O65: bleibt offen, ohne Entscheidung", punkt("O65").status === "offen" && !("entscheidung" in punkt("O65")));
  const STATUS_PUNKT = ["offen", "weitgehend_geklaert", "entschieden"];
  wahr("Offene Punkte: Status nur offen, weitgehend_geklaert oder entschieden", cfg.offenePunkte.every((o) => STATUS_PUNKT.includes(o.status)),
    cfg.offenePunkte.filter((o) => !STATUS_PUNKT.includes(o.status)).map((o) => o.id).join(","));
  gleich("Offene Punkte: nur entschiedene Punkte tragen eine Entscheidung", cfg.offenePunkte.filter((o) => "entscheidung" in o).map((o) => o.id + ":" + o.status), ["O26:entschieden"]);
  gleich("Offene Punkte: ein entschiedener Punkt ist genau O26", cfg.offenePunkte.filter((o) => o.status === "entschieden").map((o) => o.id), ["O26"]);
  gleich("Daten: Stand und Version 08.10.2026", [cfg.stand, cfg.version], ["2026-10-08", "2026-10-08.1"]);
  gleich("Offene Punkte: Kennungen O01 bis O73 lückenlos und in Reihenfolge", cfg.offenePunkte.map((o) => o.id), Array.from({ length: 73 }, (_, i) => "O" + String(i + 1).padStart(2, "0")));
  // Unterschriftsstellen: der Aufnahmeantrag nutzt die vermessenen Schlüssel
  ["s2.unterschrift", "s3.unterschrift", "s4.unterschrift"].forEach((k) => wahr("Unterschriftsstelle " + k, cfg.unterschriftStellen.aufnahmeantrag.some((s) => s.stelleKey === k) && !!felder[k]));
  wahr("Unterschriftsstelle s2.unterschrift_sorgeberechtigte (zusätzliche Zeile)", cfg.unterschriftStellen.aufnahmeantrag.some((s) => s.stelleKey === "s2.unterschrift_sorgeberechtigte"));
  wahr("Unterschriftsstelle abmeldung.unterschrift_vertreter", cfg.unterschriftStellen.abmeldung.some((s) => s.stelleKey === "unterschrift_vertreter"));
  // Abgleich mit den Vordrucken von AP-2: gleiche Stellen-Schlüssel (falls data/anmeldung-formulare.json vorliegt)
  if (konfig.formulare && konfig.formulare.formulare) {
    Object.entries(konfig.formulare.formulare).forEach(([formular, f]) => {
      if (!Array.isArray(f.unterschriften) || !cfg.unterschriftStellen[formular]) return;
      gleich("Stellen-Schlüssel " + formular + " wie in data/anmeldung-formulare.json",
        cfg.unterschriftStellen[formular].map((s) => s.stelleKey).sort(), f.unterschriften.map((s) => s.stelleKey).sort());
    });
  }
}

// ---------- 3. Profile ----------

const gesehen = { hinweise: new Set(), frist: new Set(), weiterleitung: new Set(), mannschaft: new Set(), beitrag: new Set(), faelle: new Set(), regeln: new Set(), unterlagen: new Set(),
  // Zufallsfälle mit U10 "offen": mit und ohne vorhandenes Attest (a.nachweise.U10 "habe")
  attestOffen: { habe: 0, sonst: 0 } };

function sammle(e) {
  e.hinweise.forEach((h) => gesehen.hinweise.add(h.key));
  gesehen.frist.add(e.frist.key);
  e.weiterleitung.forEach((w) => gesehen.weiterleitung.add(w.key));
  if (e.mannschaft.hinweisKey) gesehen.mannschaft.add(e.mannschaft.hinweisKey);
  gesehen.beitrag.add(e.beitrag.hinweisKey);
  e.faelle.forEach((f) => gesehen.faelle.add(f));
  if (e.frist.regel) gesehen.regeln.add(e.frist.regel);
  e.unterlagen.forEach((u) => gesehen.unterlagen.add(u.id));
}

function pruefeProfil(pr) {
  const id = "Profil " + pr.id;
  const a = tiefKopie(pr.a);
  const e = R.auswerten(a, konfig, pr.heute);
  sammle(e);
  const x = pr.erwartet;
  const ids = e.unterlagen.map((u) => u.id);
  if (x.faelle) {
    if (x.faelle.length === 0) gleich(id + ": keine Fälle", e.faelle, []);
    x.faelle.forEach((f) => enthaelt(id + ": Fall " + f, e.faelle, f));
  }
  (x.keineFaelle || []).forEach((f) => enthaeltNicht(id + ": nicht Fall " + f, e.faelle, f));
  if (x.status !== undefined) gleich(id + ": Status", e.status, x.status);
  if (x.international !== undefined) gleich(id + ": international", e.international, x.international);
  if (x.altersklasse !== undefined) gleich(id + ": Altersklasse", e.altersklasse, x.altersklasse);
  if (x.mannschaft) {
    if (x.mannschaft.vorhanden !== undefined) gleich(id + ": Mannschaft vorhanden", e.mannschaft.vorhanden, x.mannschaft.vorhanden);
    if (x.mannschaft.namen !== undefined) gleich(id + ": Mannschaft Namen", e.mannschaft.namen, x.mannschaft.namen);
    if (x.mannschaft.hinweisKey !== undefined) gleich(id + ": Mannschaft Hinweis", e.mannschaft.hinweisKey, x.mannschaft.hinweisKey);
  }
  Object.entries(x.unterlagen || {}).forEach(([uid, art]) => {
    const u = e.unterlagen.find((y) => y.id === uid);
    wahr(id + ": Unterlage " + uid + " vorhanden", !!u);
    if (u) gleich(id + ": Unterlage " + uid + " Art", u.art, art);
  });
  (x.keineUnterlagen || []).forEach((uid) => enthaeltNicht(id + ": nicht Unterlage " + uid, ids, uid));
  (x.nachweis || []).forEach((uid) => { const u = e.unterlagen.find((y) => y.id === uid); wahr(id + ": Nachweis " + uid, !!u && u.nachweis === true); });
  (x.formulare || []).forEach((f) => enthaelt(id + ": Formular " + f, e.formulare, f));
  (x.keineFormulare || []).forEach((f) => enthaeltNicht(id + ": nicht Formular " + f, e.formulare, f));
  if (x.frist) {
    Object.entries(x.frist).forEach(([k, v]) => gleich(id + ": Frist " + k, e.frist[k], v));
  }
  (x.hinweise || []).forEach((k) => enthaelt(id + ": Hinweis " + k, e.hinweise.map((h) => h.key), k));
  (x.keineHinweise || []).forEach((k) => enthaeltNicht(id + ": nicht Hinweis " + k, e.hinweise.map((h) => h.key), k));
  (x.weiterleitung || []).forEach((k) => enthaelt(id + ": Weiterleitung " + k, e.weiterleitung.map((w) => w.an + ":" + w.key), k));
  if (x.beitrag) Object.entries(x.beitrag).forEach(([k, v]) => gleich(id + ": Beitrag " + k, e.beitrag[k], v));
  (x.unterschriften || []).forEach((s) => wahr(id + ": Unterschrift " + s.formular + " " + s.stelleKey + " " + s.wer,
    e.unterschriften.some((u) => u.formular === s.formular && u.stelleKey === s.stelleKey && u.wer === s.wer)));
  (x.keineUnterschriften || []).forEach((s) => wahr(id + ": keine Unterschrift " + s.formular + " " + s.stelleKey,
    !e.unterschriften.some((u) => u.formular === s.formular && u.stelleKey === s.stelleKey)));
  const schritte = R.schritte(a, konfig, pr.heute);
  (x.schritteMit || []).forEach((s) => enthaelt(id + ": Schritt " + s, schritte, s));
  (x.schritteOhne || []).forEach((s) => enthaeltNicht(id + ": ohne Schritt " + s, schritte, s));
  if (x.besonderesOptionen) gleich(id + ": Optionen der Seite besonderes", e.besonderesOptionen, x.besonderesOptionen);
  if (x.fehlend) gleich(id + ": fehlend", e.fehlend, x.fehlend);
  // Allgemeine Form je Profil
  gleich(id + ": Version", e.version, R.VERSION);
  wahr(id + ": Unterlagen sortiert und eindeutig", ids.every((u, i) => i === 0 || ids[i - 1] < u));
  wahr(id + ": textKey gleich Kennung", e.unterlagen.every((u) => u.textKey === u.id));
  wahr(id + ": Formulare aus der Liste", e.formulare.every((f) => FORMULARE.includes(f)));
  wahr(id + ": Unterschriften gehören zu Formularen", e.unterschriften.every((s) => e.formulare.includes(s.formular) && WER_S.includes(s.wer)));
  wahr(id + ": Stellen-Schlüssel gibt es in den Vordrucken von AP-2", stellenPassen(e.unterschriften), stellenFehler(e.unterschriften));
}

// Stellen-Schlüssel der Unterschriften müssen in data/anmeldung-formulare.json (AP-2) vorkommen, soweit dort ein Vordruck steht;
// für Blätter, die der Baukasten selbst zeichnet (Datenschutz, Attest, Notfall, ...), gilt nur der Schlüssel aus data/anmeldung.json.
function stellenFehler(unterschriften) {
  const vordrucke = (konfig.formulare && konfig.formulare.formulare) || {};
  return unterschriften.filter((u) => {
    const eigene = (cfg.unterschriftStellen[u.formular] || []).some((s) => s.stelleKey === u.stelleKey);
    const v = vordrucke[u.formular];
    const inVordruck = !v || !Array.isArray(v.unterschriften) || v.unterschriften.some((s) => s.stelleKey === u.stelleKey);
    return !(eigene && inVordruck);
  }).map((u) => u.formular + "." + u.stelleKey).join(", ") || "in Ordnung";
}
function stellenPassen(unterschriften) {
  return stellenFehler(unterschriften) === "in Ordnung";
}

// ---------- 4. Rechenbeispiele der Wartefrist (R5, R11) ----------

function fristD(abmeldung, freigabe, heute, zusatz) {
  const a = BAUSTEINE.wechselD(Object.assign({ abmeldung: { status: "einschreiben", datum: abmeldung, weg: null }, freigabe: freigabe, letztesSpiel: abmeldung, letztesPflichtspiel: abmeldung }, zusatz || {}));
  return R.auswerten(a, konfig, heute || abmeldung).frist;
}

function testeWartefristen() {
  // Wartefrist beginnt am Tag nach der Abmeldung; Pflichtspiele am Tag nach Ende der Frist nach Monaten (BGB 187, 188)
  const faelle3 = [
    ["2026-09-29", "2026-12-30"], ["2026-08-30", "2026-12-01"], ["2026-08-31", "2026-12-01"], ["2026-09-30", "2027-01-01"],
    ["2026-11-30", "2027-03-01"], ["2027-02-27", "2027-05-28"], ["2026-10-31", "2027-02-01"], ["2026-12-15", "2027-03-16"],
    ["2027-11-29", "2028-03-01"], ["2027-11-30", "2028-03-01"],
  ];
  faelle3.forEach(([abm, soll]) => gleich("Wartefrist 3 Monate ab Abmeldung " + abm, fristD(abm, "ja").pflichtspieleAb, soll));
  const faelle6 = [["2026-09-29", "2027-03-30"], ["2026-08-30", "2027-03-01"], ["2026-12-31", "2027-07-01"], ["2026-10-01", "2027-04-02"]];
  faelle6.forEach(([abm, soll]) => gleich("Wartefrist 6 Monate ab Abmeldung " + abm, fristD(abm, "nein").pflichtspieleAb, soll));
  // Juni-Fenster
  gleich("Juni mit Freigabe: ab 1. Juli", fristD("2027-06-01", "ja", "2027-06-02").pflichtspieleAb, "2027-07-01");
  gleich("Juni mit Freigabe am 30. Juni: ab 1. Juli", fristD("2027-06-30", "ja", "2027-06-30").pflichtspieleAb, "2027-07-01");
  gleich("Juni ohne Freigabe: ab 1. November", fristD("2027-06-15", "nein", "2027-06-16").pflichtspieleAb, "2027-11-01");
  gleich("31. Mai zählt nicht als Juni", fristD("2027-05-31", "ja", "2027-05-31").pflichtspieleAb, "2027-09-01");
  gleich("1. Juli zählt nicht als Juni", fristD("2026-07-01", "ja", "2026-07-01").pflichtspieleAb, "2026-10-02");
  // Eingang nach dem Fristende: Spielrecht erst ab dem Tag des Eingangs
  gleich("Abmeldung lange her: ab Eingang", fristD("2026-03-02", "ja", "2026-09-29").pflichtspieleAb, "2026-09-29");
  // Der Antrag kann nicht vor dem Eingang gelten
  wahr("Freundschaftsspiele ab Eingang", fristD("2026-09-29", "nein").freundschaftsspieleAb === "2026-09-29");
  // Freigabe unklar: der spätere Tag gilt als Schätzung, der frühere steht als Alternative
  const unklar = fristD("2026-09-29", "weiss_nicht");
  gleich("Freigabe unklar: Schätzung", unklar.pflichtspieleAb, "2027-03-30");
  gleich("Freigabe unklar: Alternative", unklar.alternativ && unklar.alternativ.pflichtspieleAb, "2026-12-30");
  gleich("Freigabe unklar: unsicher", unklar.unsicher, true);
  // Jüngerer D-Jahrgang: Frist offen (DFB gegen HFV)
  const jung = fristD("2026-09-29", "nein", "2026-09-29", { geburtsdatum: "2015-01-05" });
  gleich("Jüngerer D-Jahrgang ohne Freigabe: unsicher", jung.unsicher, true);
  gleich("Jüngerer D-Jahrgang ohne Freigabe: Schlüssel", jung.key, "frist_d_jung_offen");
  gleich("Jüngerer D-Jahrgang: Alternative 3 Monate", jung.alternativ.pflichtspieleAb, "2026-12-30");
  gleich("Jüngerer D-Jahrgang mit Freigabe: sicher", fristD("2026-09-29", "ja", "2026-09-29", { geburtsdatum: "2015-01-05" }).unsicher, false);
  gleich("Älterer D-Jahrgang ohne Freigabe: sicher", fristD("2026-09-29", "nein", "2026-09-29", { geburtsdatum: "2014-01-05" }).unsicher, false);
  // Wegfall der Wartefrist nach mehr als 6 Monaten ohne Pflichtspiel: letztes Spiel + 6 Monate + 1 Tag
  const wegfall = fristD("2026-09-29", "nein", "2026-09-29", { letztesPflichtspiel: "2026-03-15" });
  gleich("Wegfall: letztes Pflichtspiel 15. März, mehr als 6 Monate her: ab Eingang", wegfall.pflichtspieleAb, "2026-09-29");
  gleich("Wegfall: Schlüssel", wegfall.key, "frist_entfaellt");
  gleich("Wegfall: Kennzeichen", wegfall.wegfall, true);
  const knapp = fristD("2026-09-29", "nein", "2026-09-29", { letztesPflichtspiel: "2026-03-29" });
  gleich("Wegfall: letztes Pflichtspiel genau 6 Monate her: noch nicht länger als 6 Monate", knapp.key, "frist_wechsel_6monate");
  gleich("Wegfall: 6 Monate und ein Tag zählt", fristD("2026-09-29", "nein", "2026-09-29", { letztesPflichtspiel: "2026-03-28" }).key, "frist_entfaellt");
  gleich("Kein Wegfall bei kurz zurückliegendem Spiel: Schätzung bleibt", fristD("2026-09-29", "nein", "2026-09-29", { letztesPflichtspiel: "2026-09-20" }).pflichtspieleAb, "2027-03-30");
  // R3, R4
  gleich("F-Jugend: keine Wartefrist", fristD("2026-09-29", "nein", "2026-09-29", { geburtsdatum: "2018-06-06" }).pflichtspieleAb, "2026-09-29");
  gleich("G-Jugend: keine Wartefrist", fristD("2026-09-29", "nein", "2026-09-29", { geburtsdatum: "2021-06-06" }).regel, "R3");
  gleich("E-Jugend im Juni", fristD("2027-06-20", "nein", "2027-06-21", { geburtsdatum: "2017-01-05" }).pflichtspieleAb, "2027-07-01");
  gleich("E-Jugend im September ohne Freigabe: trotzdem 3 Monate", fristD("2026-09-29", "nein", "2026-09-29", { geburtsdatum: "2017-01-05" }).pflichtspieleAb, "2026-12-30");
  gleich("E-Jugend: Regel R4", fristD("2026-09-29", "nein", "2026-09-29", { geburtsdatum: "2017-01-05" }).regel, "R4");
  // Herren und älterer A-Jahrgang (R7)
  const herren = (abm, heute, freigabe, zusatz) => R.auswerten(BAUSTEINE.erwachsen(Object.assign({ spielerpass: "ja", alterVerein: { region: "hessen", name: "SV Beispieldorf" },
    abmeldung: { status: "einschreiben", datum: abm, weg: null }, freigabe: freigabe, letztesSpiel: abm, letztesPflichtspiel: abm, sperre: "nein", wechselLetzte6Monate: "nein" }, zusatz || {})), konfig, heute).frist;
  gleich("Herren WP I mit Zustimmung (Eingang im Juli)", herren("2026-06-30", "2026-07-05", "ja").pflichtspieleAb, "2026-07-05");
  gleich("Herren WP I mit Zustimmung (Eingang im Juni)", herren("2026-06-20", "2026-06-25", "ja").pflichtspieleAb, "2026-07-01");
  gleich("Herren WP I ohne Zustimmung", herren("2026-06-30", "2026-07-05", "nein").pflichtspieleAb, "2026-11-01");
  gleich("Herren WP I: Antrag bis 31. August", herren("2026-06-30", "2026-07-05", "nein").antragBis, "2026-08-31");
  gleich("Herren WP II ab 1. Juli: mit Zustimmung ab 1. Januar", herren("2026-07-01", "2026-07-02", "ja").pflichtspieleAb, "2027-01-01");
  gleich("Herren WP II: ohne Zustimmung erst 1. November des Folgejahres", herren("2026-07-01", "2026-07-02", "nein").pflichtspieleAb, "2027-11-01");
  gleich("Herren WP II: Antrag bis 31. Januar", herren("2026-07-01", "2026-07-02", "ja").antragBis, "2027-01-31");
  gleich("Herren Abmeldung am 31. August gehört zu WP II", herren("2026-08-31", "2026-09-01", "ja").pflichtspieleAb, "2027-01-01");
  gleich("Herren Abmeldung am 31. Dezember gehört zu WP II", herren("2026-12-31", "2026-12-31", "ja").pflichtspieleAb, "2027-01-01");
  gleich("Herren Abmeldung im Januar gehört zu WP I des Sommers", herren("2027-01-05", "2027-01-06", "ja").pflichtspieleAb, "2027-07-01");
  gleich("Herren: Wegfall nach 6 Monaten ohne Pflichtspiel (auch außerhalb der Wechselperioden)", herren("2026-09-25", "2026-09-29", "nein", { letztesPflichtspiel: "2026-03-01" }).pflichtspieleAb, "2026-09-29");
  gleich("Herren: Wegfall beginnt nach einer Sperre", herren("2026-09-25", "2026-09-29", "nein", { letztesPflichtspiel: "2026-03-01", sperre: "ja", sperreBis: "2026-08-01" }).key, "frist_herren_wp2_ohne");
  gleich("Herren: Antrag zu spät", herren("2026-09-25", "2027-02-10", "ja").zuSpaet, true);
  gleich("Herren: Antrag rechtzeitig", herren("2026-09-25", "2027-01-31", "ja").zuSpaet, false);
  gleich("Herren mit Entschädigung in WP I möglich", herren("2026-06-08", "2026-06-10", "nein").entschaedigungMoeglich, true);
  gleich("Herren in WP II: keine Entschädigung", herren("2026-09-25", "2026-09-29", "nein").entschaedigungMoeglich, false);
  // Älterer A-Jahrgang folgt den Regeln der Senioren (JO § 40), jüngerer erst ab 1. Juni 2027
  const aJugend = (geb, abm, heute, freigabe) => R.auswerten(BAUSTEINE.kind({ geburtsdatum: geb, geschlecht: "m", spielerpass: "ja", alterVerein: { region: "hessen", name: "SV X" },
    abmeldung: { status: "einschreiben", datum: abm, weg: null }, freigabe: freigabe, sorge: null, sorgeberechtigte: [] }), konfig, heute).frist;
  gleich("A-Jugend 2008 (älter): R7", aJugend("2008-01-10", "2026-09-25", "2026-09-29", "ja").regel, "R7");
  gleich("A-Jugend 2009 (jünger) im September: R5", aJugend("2009-05-10", "2026-09-25", "2026-09-29", "ja").regel, "R5");
  gleich("A-Jugend 2009 (jünger) im September: 3 Monate", aJugend("2009-05-10", "2026-09-25", "2026-09-29", "ja").pflichtspieleAb, "2026-12-26");
  gleich("A-Jugend 2009 ab 1. Juni 2027: R7", aJugend("2009-05-10", "2027-06-02", "2027-06-03", "ja").regel, "R7");
  gleich("A-Jugend 2009 ab 1. Juni 2027: ab 1. Juli", aJugend("2009-05-10", "2027-06-02", "2027-06-03", "ja").pflichtspieleAb, "2027-07-01");
  // Vollmacht (R13): Abmeldetag ist der Eingabetag = heute, auch wenn ein Datum eingetragen ist
  const voll = R.auswerten(BAUSTEINE.wechselD({ abmeldung: { status: "noch_nicht", datum: "2026-01-01", weg: "vollmacht" } }), konfig, "2026-09-29").frist;
  gleich("Vollmacht: Abmeldetag ist heute", voll.abmeldedatum, "2026-09-29");
  gleich("Vollmacht: Regel R13", voll.regel, "R13");
  // Wechsel innerhalb von 6 Monaten und Sperre machen die Schätzung unsicher
  gleich("Sperre: unsicher", fristD("2026-09-29", "ja", "2026-09-29", { sperre: "ja", sperreBis: "2026-12-01" }).unsicher, true);
  gleich("Sperre unklar: sicher (nur Hinweis)", fristD("2026-09-29", "ja", "2026-09-29", { sperre: "weiss_nicht" }).unsicher, false);
}

// ---------- 5. Fälle F01 bis F18 und Regeln R1 bis R15 ----------

function testeFaelleUndRegeln() {
  F_IDS.forEach((f) => wahr("Fall " + f + " kommt in einem Profil vor", gesehen.faelle.has(f)));
  ["R1", "R2", "R3", "R4", "R5", "R7", "R13", "R14"].forEach((r) => wahr("Regel " + r + " als Frist geprüft", gesehen.regeln.has(r)));
  // R6: Freundschaftsspiele - keine Wartefrist, ab Eingang (auch beim älteren A-Jahrgang und den Herren)
  ["wechsel-d-mit-freigabe", "wechsel-d-ohne-freigabe", "e-jugend-wechsel-september", "f-jugend-wechsel", "herren-wechsel-wp2-zustimmung", "a-jugend-18-wechsel"].forEach((id) => {
    const p = PROFILE.find((x) => x.id === id);
    const e = R.auswerten(tiefKopie(p.a), konfig, p.heute);
    gleich("R6 " + id + ": Freundschaftsspiele ab Eingang", e.frist.freundschaftsspieleAb, p.heute);
  });
  // R8: Sonderwege der Jugend gehen an die Jugendleitung
  const e8 = R.auswerten(BAUSTEINE.wechselD({}), konfig, HEUTE_STANDARD);
  wahr("R8: Weiterleitung sonderwege an die Jugendleitung", e8.weiterleitung.some((w) => w.an === "jugendleitung" && w.key === "sonderwege"));
  // R9: Warnungen
  const e9 = R.auswerten(BAUSTEINE.wechselD({ abmeldung: { status: "formlos", datum: null, weg: "einschreiben" } }), konfig, HEUTE_STANDARD);
  ["abmeldung_formlos", "abmeldung_nach_letztem_spiel", "nie_zwei_vereine", "kuendigung_extra"].forEach((k) => {
    const h = e9.hinweise.find((x) => x.key === k);
    wahr("R9: Warnung " + k, !!h && h.art === "warnung");
  });
  // Warnungen stehen vor den Fristen und Infos
  const arts = e9.hinweise.map((h) => h.art);
  const ordnung = { warnung: 0, frist: 1, info: 2, offen: 3 };
  wahr("Hinweise: Reihenfolge Warnung, Frist, Info, offen", arts.every((art, i) => i === 0 || ordnung[arts[i - 1]] <= ordnung[art]));
  // R10: Mitgliedschaft vor dem Antrag, Foto vor dem ersten Spiel, Attest aktuell
  const e10 = R.auswerten(BAUSTEINE.kind({}), konfig, HEUTE_STANDARD);
  ["mitgliedschaft_zuerst", "spielerfoto_hinweis", "attest_aktuell"].forEach((k) => enthaelt("R10: Hinweis " + k, e10.hinweise.map((h) => h.key), k));
  gleich("R10: Spielerfoto vor dem ersten Spiel", e10.unterlagen.find((u) => u.id === "U16").wann, "vor_erstem_spiel");
  // R11: Rechenbeispiel der Recherche
  gleich("R11: D-Jugend mit Freigabe ab 30.12.2026", fristD("2026-09-29", "ja").pflichtspieleAb, "2026-12-30");
  gleich("R11: D-Jugend ohne Freigabe ab 30.03.2027", fristD("2026-09-29", "nein").pflichtspieleAb, "2027-03-30");
  gleich("R11: E-Jugend ab 30.12.2026", fristD("2026-09-29", "nein", "2026-09-29", { geburtsdatum: "2016-03-05" }).pflichtspieleAb, "2026-12-30");
  // R12: Änderungen der Regeln erscheinen als Hinweis, sobald sie gelten
  const vorher = R.auswerten(BAUSTEINE.kind({}), konfig, "2026-12-15").hinweise.map((h) => h.key);
  const nachher = R.auswerten(BAUSTEINE.kind({}), konfig, "2027-01-05").hinweise.map((h) => h.key);
  enthaeltNicht("R12: FIFA-Hinweis vor 2027", vorher, "regelwerk_fifa_2027");
  enthaelt("R12: FIFA-Hinweis ab 2027-01-01", nachher, "regelwerk_fifa_2027");
  enthaelt("R12: Saison-Hinweis nach Saisonende", R.auswerten(BAUSTEINE.kind({}), konfig, "2027-07-05").hinweise.map((h) => h.key), "regelwerk_saison");
  enthaelt("R12: E-Jugend-Hinweis ab 2027-07-01", R.auswerten(BAUSTEINE.kind({}), konfig, "2027-07-05").hinweise.map((h) => h.key), "regelwerk_saison_2027");
  enthaeltNicht("R12: kein Saison-Hinweis mitten in der Saison", nachher, "regelwerk_saison");
  // R14: Kinder ohne Eltern - keine Zusage
  ["gefluechtet-ohne-eltern", "austauschschueler", "verwandte-fuenf-jahre", "eu-jugendlicher-16-ohne-eltern"].forEach((id) => {
    const p = PROFILE.find((x) => x.id === id);
    const e = R.auswerten(tiefKopie(p.a), konfig, p.heute);
    gleich("R14 " + id + ": keine Zusage", [e.frist.regel, e.frist.pflichtspieleAb, e.frist.freundschaftsspieleAb, e.frist.unsicher], ["R14", null, null, true]);
    enthaelt("R14 " + id + ": Warnung", e.hinweise.filter((h) => h.art === "warnung").map((h) => h.key), "ohne_zusage_spielen");
  });
  // R15: Beginn der Mitgliedschaft ist offen
  const e15 = R.auswerten(BAUSTEINE.kind({}), konfig, HEUTE_STANDARD);
  const h15 = e15.hinweise.find((h) => h.key === "mitgliedschaft_beginn");
  wahr("R15: Hinweis art offen", !!h15 && h15.art === "offen");
  // Probetraining und Versicherung
  enthaelt("Probetraining-Hinweis bei aktiven Mitgliedern", e15.hinweise.map((h) => h.key), "probetraining_versicherung");
  // Unterlagen: Wasserzeichen-Logik gehört zu AP-3; hier: Ausweise Deutscher werden nicht verlangt
  const deutsch = R.auswerten(BAUSTEINE.kind({ geburtsdatum: "2013-01-01" }), konfig, HEUTE_STANDARD);
  wahr("Deutsche Kinder: keine Ausweiskopie", !deutsch.unterlagen.some((u) => u.id === "U12"));
  // Gruppenvorschlag im Karneval nach Alter (Sekundärquelle, nicht bestätigt)
  const gruppeFuer = (geb) => R.auswerten(BAUSTEINE.kind({ geburtsdatum: geb, abteilung: "karneval", spielen: null, spielerpass: null, karneval: { gruppe: null, tanztWoanders: "nein", turnier: "nein", abendOhneEltern: "nein" } }), konfig, HEUTE_STANDARD).karneval.gruppenVorschlag;
  gleich("Karneval: 5 Jahre", gruppeFuer("2021-05-05"), ["Little Fruities"]);
  gleich("Karneval: 9 Jahre", gruppeFuer("2017-05-05"), ["Freaky Fruities"]);
  gleich("Karneval: 16 Jahre - beide Gruppen möglich", gruppeFuer("2010-05-05"), ["Freaky Fruities", "Flying Fruities"]);
  gleich("Karneval: 20 Jahre", gruppeFuer("2006-05-05"), ["Flying Fruities", "Pfläumchen", "Dreamboys"]);
  gleich("Karneval: 3 Jahre - keine Gruppe", gruppeFuer("2023-05-05"), []);
  // Karneval: keine HFV-Unterlagen und kein Attest
  const karneval = R.auswerten(BAUSTEINE.kind({ abteilung: "karneval", spielen: null, spielerpass: null, geburtsdatum: "2016-05-05" }), konfig, HEUTE_STANDARD);
  wahr("Karneval: kein Attest, keine HFV-Unterlagen", !karneval.unterlagen.some((u) => /^U(0[7-9]|1\d|2[0-7])$/.test(u.id) && u.id !== "U19" || ["U36", "U37", "U38", "U39", "U40"].includes(u.id)));
  // Beitrag: Doppelmitgliedschaft nennt zwei Gruppen
  const doppel = R.auswerten(BAUSTEINE.erwachsen({ abteilung: "beides" }), konfig, HEUTE_STANDARD);
  gleich("Doppelmitgliedschaft: zwei Gruppen", doppel.beitrag.gruppen, ["fussball_erwachsene", "karneval_erwachsene"]);
  gleich("Doppelmitgliedschaft: zwei Felder im Aufnahmeantrag", doppel.beitrag.felder, ["s1.fussball.erwachsener", "s1.karneval.erwachsener"]);
  // Beitragsvorschlag nach Alter
  const beitragFuer = (geb, zusatz) => R.auswerten(BAUSTEINE.erwachsen(Object.assign({ geburtsdatum: geb }, zusatz || {})), konfig, HEUTE_STANDARD).beitrag.gruppe;
  gleich("Beitrag: 17 Jahre Fußball", beitragFuer("2009-05-05"), "fussball_jugend");
  gleich("Beitrag: 18 Jahre in der A-Jugend", beitragFuer("2008-01-05"), "fussball_jugend");
  gleich("Beitrag: 19 Jahre Fußball", beitragFuer("2007-05-05"), "fussball_erwachsene");
  gleich("Beitrag: 65 Jahre Fußball", beitragFuer("1961-05-05"), "fussball_passiv");
  gleich("Beitrag: 64 Jahre Fußball", beitragFuer("1962-05-05"), "fussball_erwachsene");
  gleich("Beitrag: Karneval 65 Jahre", beitragFuer("1961-05-05", { abteilung: "karneval" }), "karneval_rentner");
  gleich("Beitrag: Karneval 40 Jahre", beitragFuer("1986-05-05", { abteilung: "karneval" }), "karneval_erwachsene");
  gleich("Beitrag: Wahl der Familie zählt", beitragFuer("1986-05-05", { beitrag: { gruppe: "fussball_passiv", familie: [], senator: false, doppel: false } }), "fussball_passiv");
  gleich("Beitrag: ungültige Wahl wird ignoriert", beitragFuer("1986-05-05", { beitrag: { gruppe: "gibt_es_nicht", familie: [], senator: false, doppel: false } }), "fussball_erwachsene");
  const falsch = R.auswerten(BAUSTEINE.erwachsen({ beitrag: { gruppe: "karneval_kinder", familie: [], senator: false, doppel: false }, abteilung: "karneval" }), konfig, HEUTE_STANDARD);
  enthaelt("Beitrag: Gruppe passt nicht zum Alter -> Warnung", falsch.hinweise.map((h) => h.key), "beitrag_gruppe_pruefen");
  // Unterschriften: Erwachsene selbst; Minderjährige Sorgeberechtigte; Kontoinhaber getrennt
  const uKind = R.auswerten(BAUSTEINE.kind({}), konfig, HEUTE_STANDARD).unterschriften.map((s) => s.wer);
  wahr("Unterschriften Kind: keine Mitglieds-Unterschrift", !uKind.includes("mitglied"));
  const uErw = R.auswerten(BAUSTEINE.erwachsen({}), konfig, HEUTE_STANDARD).unterschriften.map((s) => s.wer);
  wahr("Unterschriften Erwachsene: keine Sorgeberechtigten", !uErw.some((w) => w.indexOf("sorge") === 0));
  ["allein", "vormund", "pflege"].forEach((s) => {
    const ws = R.auswerten(BAUSTEINE.kind({ sorge: s }), konfig, HEUTE_STANDARD).unterschriften.filter((u) => u.formular === "aufnahmeantrag" && u.stelleKey === "s2.unterschrift").map((u) => u.wer);
    gleich("Sorge " + s + ": eine Person unterschreibt den Aufnahmeantrag", ws, ["sorgeberechtigte"]);
  });
  const getrenntJa = R.auswerten(BAUSTEINE.kind({ sorge: "getrennt_bei_mir", andererElternteilEinverstanden: true }), konfig, HEUTE_STANDARD).unterschriften.find((u) => u.stelleKey === "s2.unterschrift");
  gleich("Getrennte Eltern mit Einverständnis: eine Unterschrift", getrenntJa.wer, "sorgeberechtigte");
  // O26 (Jugendleitung, 08.10.2026): Ein Elternteil reicht. Nur getrennt lebende Eltern ohne Einverständnis: der andere Elternteil zusätzlich (mit Stift).
  const zweiteZeile = (antworten) => R.auswerten(BAUSTEINE.kind(antworten), konfig, HEUTE_STANDARD).unterschriften.filter((u) => u.stelleKey === "s2.unterschrift_sorgeberechtigte").map((u) => u.wer);
  ["beide", "allein", "vormund", "pflege"].forEach((sorge) => gleich("O26 Sorge " + sorge + ": keine zweite Zeile auf Seite 2, ein Elternteil reicht", zweiteZeile({ sorge: sorge }), []));
  gleich("O26 getrennt lebend mit Einverständnis: keine zweite Zeile", zweiteZeile({ sorge: "getrennt_bei_mir", andererElternteilEinverstanden: true }), []);
  gleich("O26 getrennt lebend ohne Einverständnis: der andere Elternteil unterschreibt zusätzlich", zweiteZeile({ sorge: "getrennt_bei_mir", andererElternteilEinverstanden: false }), ["sorgeberechtigte_beide"]);
  gleich("O26 getrennt lebend, Einverständnis unbeantwortet: der andere Elternteil unterschreibt zusätzlich", zweiteZeile({ sorge: "getrennt_bei_mir", andererElternteilEinverstanden: null }), ["sorgeberechtigte_beide"]);
  gleich("O26 Erwachsene: keine zweite Zeile", R.auswerten(BAUSTEINE.erwachsen({}), konfig, HEUTE_STANDARD).unterschriften.filter((u) => u.stelleKey === "s2.unterschrift_sorgeberechtigte").length, 0);
  const hinweiseSorge = (antworten) => R.auswerten(BAUSTEINE.kind(antworten), konfig, HEUTE_STANDARD).hinweise.map((h) => h.key);
  wahr("O26 Sorge beide: kein Hinweis „beide unterschreiben“ (Schlüssel beide_unterschreiben_empfohlen entfällt)",
    !hinweiseSorge({ sorge: "beide" }).includes("beide_unterschreiben_empfohlen") && !R.SCHLUESSEL.hinweise.includes("beide_unterschreiben_empfohlen"));
  // Einwilligungen a und b: Unterschriften nur bei Zustimmung, Namens-Einwilligung nur unter 16
  const einw = (alter, name, foto) => R.auswerten(BAUSTEINE.kind({ geburtsdatum: alter, einwilligungen: { hfvName: name, hfvFoto: foto } }), konfig, HEUTE_STANDARD).unterschriften.filter((u) => u.formular === "hfv_antrag").map((u) => u.stelleKey);
  wahr("HFV-Einwilligung a und b bei 9 Jahren", einw("2017-05-05", true, true).includes("einwilligung_a") && einw("2017-05-05", true, true).includes("einwilligung_b"));
  wahr("HFV-Einwilligung a entfällt ab 16", !einw("2010-05-05", true, true).includes("einwilligung_a"));
  wahr("HFV-Einwilligungen ohne Zustimmung: keine Unterschrift", !einw("2017-05-05", false, false).includes("einwilligung_b") && !einw("2017-05-05", false, false).includes("einwilligung_a"));
  // Fehlend-Liste
  const fehlt = R.auswerten(BAUSTEINE.kind({ nachweise: { U09: "habe", U10: "fehlt" } }), konfig, HEUTE_STANDARD).fehlend;
  gleich("Fehlend: Geburtsurkunde vorhanden, Attest fehlt", fehlt, ["U10"]);
  const fehltAlles = R.auswerten(BAUSTEINE.kind({ nachweise: { U09: "habe", U10: "habe" } }), konfig, HEUTE_STANDARD).fehlend;
  gleich("Fehlend: alles vorhanden", fehltAlles, []);
  const fehltFoto = R.auswerten(BAUSTEINE.kind({ nachweise: { U09: "habe", U10: "habe" }, spielerfoto: { weg: "" } }), konfig, HEUTE_STANDARD).fehlend;
  gleich("Fehlend: Spielerfoto ohne Angabe", fehltFoto, ["U16"]);
  // Bildung und Teilhabe
  wahr("Leistungen: nur für Minderjährige", !R.auswerten(BAUSTEINE.erwachsen({ leistungen: "ja" }), konfig, HEUTE_STANDARD).unterlagen.some((u) => u.id === "U33"));
  // Aushilfe: nur älterer Jahrgang bekommt die Auswahl
  gleich("Aushilfe: Jahrgang 2009 ohne Auswahl", R.optionenBesonderes(BAUSTEINE.kind({ geburtsdatum: "2009-11-11", geschlecht: "m" }), konfig, HEUTE_STANDARD), ["sonderspielrecht"].filter(() => false));
  gleich("Aushilfe: Jahrgang 2008, 18 Jahre: keine Auswahl (kein Antrag nötig)", R.optionenBesonderes(BAUSTEINE.kind({ geburtsdatum: "2008-01-10", geschlecht: "m" }), konfig, HEUTE_STANDARD), []);
  wahr("Aushilfe: Jahrgang 2009 mit Kennzeichen wird als Ausnahme gewarnt", R.auswerten(BAUSTEINE.kind({ geburtsdatum: "2009-11-11", geschlecht: "m", besonderes: { herrenAushilfe: true } }), konfig, HEUTE_STANDARD).hinweise.some((h) => h.key === "aushilfe_nur_ausnahme"));
  // Mädchen in der A-Jugend: kein Jungenteam
  const maedchenA = R.auswerten(BAUSTEINE.kind({ geburtsdatum: "2009-11-11", geschlecht: "w" }), konfig, HEUTE_STANDARD);
  gleich("Mädchen in der A-Jugend: keine Mannschaft", maedchenA.mannschaft.vorhanden, false);
  // Frau ohne Sonderspielrecht
  const frauOhne = R.auswerten(BAUSTEINE.erwachsen({ geschlecht: "w" }), konfig, HEUTE_STANDARD);
  gleich("Frau ohne Sonderspielrecht: keine Mannschaft", [frauOhne.mannschaft.vorhanden, frauOhne.mannschaft.hinweisKey], [false, "mannschaft_frau_keine"]);
  enthaelt("Frau ohne Sonderspielrecht: Hinweis", frauOhne.hinweise.map((h) => h.key), "keine_frauenmannschaft");
  // Geburtsdatum fehlt: nichts bricht, es fehlen nur die abhängigen Ergebnisse
  const leer = R.auswerten({}, konfig, HEUTE_STANDARD);
  gleich("Leere Antworten: Alter unbekannt", [leer.alter, leer.minderjaehrig, leer.altersklasse, leer.status], [null, null, null, null]);
  gleich("Leere Antworten: keine Fälle", leer.faelle, []);
  gleich("Leere Antworten: Frist offen", leer.frist.key, "frist_kein_spiel");
  // Fußball ohne Angabe zum Spielen: kein HFV-Zweig
  const ohneSpielen = R.auswerten(BAUSTEINE.kind({ spielen: null }), konfig, HEUTE_STANDARD);
  wahr("Spielen unbeantwortet: keine Verbandsunterlagen", !ohneSpielen.unterlagen.some((u) => u.id === "U07" || u.id === "U09"));
  // Nichtdeutsch ab 10: internationales Verfahren auch bei Erwachsenen (DFB: ab 10 Jahren, ohne Obergrenze)
  const erwInternational = R.auswerten(BAUSTEINE.erwachsen({ deutsch: "nein", staaten: ["GH"] }), konfig, HEUTE_STANDARD);
  gleich("Erwachsene ohne deutschen Pass: international", erwInternational.international, true);
  gleich("Nichtdeutsch am Tag vor dem 10. Geburtstag: noch nicht international", R.auswerten(BAUSTEINE.kind({ geburtsdatum: "2016-09-30", deutsch: "nein", staaten: ["TR"] }), konfig, HEUTE_STANDARD).international, false);
  gleich("Nichtdeutsch am 10. Geburtstag: international", R.auswerten(BAUSTEINE.kind({ geburtsdatum: "2016-09-29", deutsch: "nein", staaten: ["TR"] }), konfig, HEUTE_STANDARD).international, true);
  enthaelt("Am Tag vor dem 10. Geburtstag: Hinweis zur offenen Grenze", R.auswerten(BAUSTEINE.kind({ geburtsdatum: "2016-09-30", deutsch: "nein", staaten: ["TR"] }), konfig, HEUTE_STANDARD).hinweise.map((h) => h.key), "grenze_10_offen");
  // Länderformulare: nur bei den genannten Ländern
  const land = (l) => R.auswerten(BAUSTEINE.kind({ spielerpass: "ja", alterVerein: { region: "ausland", name: "FC X", land: l }, deutsch: "nein", staaten: ["XX"], auslandGewohnt: "ja", geburtsdatum: "2016-01-01" }), konfig, HEUTE_STANDARD).unterlagen.some((u) => u.id === "U27");
  wahr("Länderformular: USA", land("US")); wahr("Länderformular: Klartext Brasilien", land("Brasilien")); wahr("Länderformular: Serbien", land("RS"));
  wahr("Länderformular: Frankreich nicht", !land("FR")); wahr("Länderformular: Land unbekannt nicht", !land(""));
}

// ---------- 5a. Attest beim Wechsel Minderjähriger (U10 offen, U11, Formular attest) ----------
// Beim Wechsel Minderjähriger steht U10 auf "offen" (O04, O05). Bringt die Familie trotzdem ein Attest mit
// (a.nachweise.U10 "habe"), ist die Einwilligung zur Verarbeitung sicher nötig: U11 wird Vereinsvorgabe, das Formular
// "attest" gehört in e.formulare, und die Stellen attest/arzt und attest/einwilligung stehen in e.unterschriften.
// Bei "fehlt", leer oder ohne Angabe bleibt alles wie bisher. Geprüft für F06, F07 und F08 in beiden Varianten.

function testeAttestBeiWechsel() {
  const faelle = [["F06", "wechsel-d-mit-freigabe"], ["F07", "wechsel-nichtdeutsch-11"], ["F08", "wechsel-lv-e-jugend"]];
  const art = (e, uid) => (e.unterlagen.find((u) => u.id === uid) || {}).art;
  const stellen = (e) => e.unterschriften.filter((u) => u.formular === "attest");
  faelle.forEach(([fall, id]) => {
    const p = PROFILE.find((x) => x.id === id);
    const mit = (nachweise) => {
      const a = tiefKopie(p.a);
      a.nachweise = nachweise;
      return { e: R.auswerten(a, konfig, p.heute), s: R.schritte(a, konfig, p.heute) };
    };
    const name = "Attest beim Wechsel " + fall + " (" + id + ")";
    const ohne = mit({});
    const habe = mit({ U10: "habe" });

    // Ausgangslage: Fall und U10 "offen"
    enthaelt(name + ": Fall", ohne.e.faelle, fall);
    gleich(name + ": ohne Angabe -> U10 offen", art(ohne.e, "U10"), "offen");
    gleich(name + ": ohne Angabe -> U11 offen", art(ohne.e, "U11"), "offen");
    enthaeltNicht(name + ": ohne Angabe -> kein Formular attest", ohne.e.formulare, "attest");
    gleich(name + ": ohne Angabe -> keine Stellen des Attests", stellen(ohne.e), []);

    // Variante "habe": Einwilligung ist nötig
    gleich(name + ": habe -> U10 bleibt offen", art(habe.e, "U10"), "offen");
    gleich(name + ": habe -> U11 ist Vereinsvorgabe", art(habe.e, "U11"), "verein");
    enthaelt(name + ": habe -> Formular attest", habe.e.formulare, "attest");
    wahr(name + ": habe -> Unterschrift attest/einwilligung durch die Sorgeberechtigten",
      habe.e.unterschriften.some((u) => u.formular === "attest" && u.stelleKey === "einwilligung" && u.wer === "sorgeberechtigte"));
    wahr(name + ": habe -> Unterschrift attest/arzt durch den Arzt",
      habe.e.unterschriften.some((u) => u.formular === "attest" && u.stelleKey === "arzt" && u.wer === "arzt"));
    gleich(name + ": habe -> genau zwei Stellen des Attests", stellen(habe.e).length, 2);
    wahr(name + ": habe -> Stellen-Schlüssel gibt es in den Vordrucken von AP-2", stellenPassen(habe.e.unterschriften), stellenFehler(habe.e.unterschriften));
    wahr(name + ": habe -> Formulare in der Reihenfolge des PDF (attest vor notfall)", habe.e.formulare.indexOf("attest") < habe.e.formulare.indexOf("notfall"));
    wahr(name + ": habe -> Unterschriften nur zu Formularen der Liste", habe.e.unterschriften.every((u) => habe.e.formulare.includes(u.formular)));
    gleich(name + ": habe -> Schritte unverändert", habe.s, ohne.s);
    // Sonst ändert sich nichts: U11 (art, grund), formulare und unterschriften abgeglichen, dann ist alles andere gleich
    const abgeglichen = tiefKopie(habe.e);
    const u11 = abgeglichen.unterlagen.find((u) => u.id === "U11");
    const u11Ohne = ohne.e.unterlagen.find((u) => u.id === "U11");
    u11.art = u11Ohne.art;
    u11.grund = u11Ohne.grund;
    abgeglichen.formulare = ohne.e.formulare;
    abgeglichen.unterschriften = ohne.e.unterschriften;
    gleich(name + ": habe -> nur U11, formulare und unterschriften ändern sich", JSON.stringify(abgeglichen), JSON.stringify(ohne.e));
    // Die Stellen des Attests kommen zu den übrigen Unterschriften hinzu, keine geht verloren
    gleich(name + ": habe -> übrige Unterschriften bleiben", habe.e.unterschriften.filter((u) => u.formular !== "attest"), ohne.e.unterschriften);

    // Varianten ohne vorhandenes Attest: alles wie bisher
    [["fehlt", { U10: "fehlt" }], ["leerer Text", { U10: "" }], ["null", { U10: null }], ["anderer Wert", { U10: "vielleicht" }], ["Nachweis nur für ein anderes Papier", { U09: "habe" }]].forEach(([wie, nachweise]) => {
      const v = mit(nachweise);
      gleich(name + ": " + wie + " -> U10 offen", art(v.e, "U10"), "offen");
      gleich(name + ": " + wie + " -> U11 offen", art(v.e, "U11"), "offen");
      enthaeltNicht(name + ": " + wie + " -> kein Formular attest", v.e.formulare, "attest");
      gleich(name + ": " + wie + " -> keine Stellen des Attests", stellen(v.e), []);
      gleich(name + ": " + wie + " -> Ergebnis wie ohne Angabe", JSON.stringify(v.e), JSON.stringify(ohne.e));
    });
  });

  // Nicht betroffen: Ist das Attest schon Pflicht oder Vereinsregel, ändert "habe" nichts an Formular und Unterschriften
  [["Erstanmeldung eines Kindes", BAUSTEINE.kind({})], ["Erwachsene (Vereinsregel)", BAUSTEINE.erwachsen({})]].forEach(([wie, a0]) => {
    const ohne = R.auswerten(tiefKopie(a0), konfig, HEUTE_STANDARD);
    const a1 = tiefKopie(a0);
    a1.nachweise = { U10: "habe" };
    const habe = R.auswerten(a1, konfig, HEUTE_STANDARD);
    gleich("Attest bei " + wie + ": U10 keine Offenheit", art(ohne, "U10") !== "offen", true);
    gleich("Attest bei " + wie + ": Formulare gleich mit und ohne Attest", habe.formulare, ohne.formulare);
    gleich("Attest bei " + wie + ": Unterschriften gleich mit und ohne Attest", habe.unterschriften, ohne.unterschriften);
    gleich("Attest bei " + wie + ": U11 gleich mit und ohne Attest", art(habe, "U11"), art(ohne, "U11"));
  });
}

// ---------- 5b. Foto-Einwilligung Jugendlicher (O65 offen) ----------
// Der Vorstand hat noch nicht entschieden, ob ab 14 oder ab 16 Jahren auch die Jugendlichen bei den Fotos mit
// unterschreiben (O65). Bis dahin gibt es den Hinweis "jugendlicher_unterschreibt_mit" nicht mehr, und bei der
// Foto-Einwilligung (aufnahmeantrag, s3.unterschrift) unterschreiben nur die Sorgeberechtigten.

function testeFotoEinwilligungJugendlicher() {
  const HINWEIS = "jugendlicher_unterschreibt_mit";
  enthaeltNicht("O65: Hinweis nicht im Schlüsselregister", R.SCHLUESSEL.hinweise, HINWEIS);
  [["14 Jahre", "2012-05-05"], ["15 Jahre", "2011-05-05"], ["16 Jahre", "2010-05-05"], ["17 Jahre", "2009-06-01"]].forEach(([wie, geb]) => {
    const e = R.auswerten(BAUSTEINE.kind({ geburtsdatum: geb, geschlecht: "m" }), konfig, HEUTE_STANDARD);
    gleich("O65 " + wie + ": minderjährig", e.minderjaehrig, true);
    enthaeltNicht("O65 " + wie + ": kein Hinweis zur Unterschrift der Jugendlichen", e.hinweise.map((h) => h.key), HINWEIS);
    const s3 = e.unterschriften.filter((u) => u.formular === "aufnahmeantrag" && u.stelleKey === "s3.unterschrift");
    gleich("O65 " + wie + ": Foto-Einwilligung nur durch die Sorgeberechtigten", s3.map((u) => u.wer), ["sorgeberechtigte"]);
  });
}

// ---------- 6. Schritte ----------

const KANON = ["start", "wer", "name", "geburt", "abteilung", "mannschaft", "spielen", "spielerpass", "alter_verein", "abmeldung", "pass", "ausland", "wohnen", "sorge", "besonderes", "karneval",
  "kontakt", "beitrag", "leistungen", "zahlung", "einwilligungen", "notfall", "spielerfoto", "nachweise", "unterschriften", "pruefen", "fertig"];

function pruefeSchrittForm(name, s) {
  wahr(name + ": beginnt mit start, wer, name, geburt, abteilung", s.slice(0, 5).join(",") === "start,wer,name,geburt,abteilung");
  wahr(name + ": endet mit unterschriften, pruefen, fertig", s.slice(-3).join(",") === "unterschriften,pruefen,fertig");
  wahr(name + ": nur bekannte Schritte in fester Reihenfolge ohne Doppelte", s.every((x, i) => KANON.includes(x) && (i === 0 || KANON.indexOf(s[i - 1]) < KANON.indexOf(x))));
}

function testeSchritte() {
  gleich("Schritte ohne Antworten", R.schritte({}, konfig, HEUTE_STANDARD), ["start", "wer", "name", "geburt", "abteilung", "kontakt", "beitrag", "zahlung", "einwilligungen", "unterschriften", "pruefen", "fertig"]);
  const karneval = R.schritte(BAUSTEINE.kind({ abteilung: "karneval", spielen: null }), konfig, HEUTE_STANDARD);
  gleich("Schritte Karneval-Kind", karneval, ["start", "wer", "name", "geburt", "abteilung", "sorge", "karneval", "kontakt", "beitrag", "leistungen", "zahlung", "einwilligungen", "notfall", "unterschriften", "pruefen", "fertig"]);
  const passivKind = R.schritte(BAUSTEINE.kind({ abteilung: "passiv", spielen: null, geburtsdatum: "2010-05-05" }), konfig, HEUTE_STANDARD);
  enthaeltNicht("Passives Kind braucht keinen Notfallbogen", passivKind, "notfall");
  enthaelt("Passives Kind braucht Sorgerecht", passivKind, "sorge");
  const nurAbteilung = R.schritte({ abteilung: "fussball", geburtsdatum: "2014-05-10" }, konfig, HEUTE_STANDARD);
  gleich("Fußball ohne Antwort zu Spielen: mannschaft und spielen, sonst nichts", nurAbteilung.filter((s) => ["mannschaft", "spielen", "spielerpass", "pass", "ausland", "spielerfoto"].includes(s)), ["mannschaft", "spielen"]);
  const nurTraining = R.schritte(BAUSTEINE.kind({ spielen: false }), konfig, HEUTE_STANDARD);
  gleich("Nur Training: kein HFV-Zweig", nurTraining.filter((s) => ["spielerpass", "alter_verein", "abmeldung", "pass", "ausland", "wohnen", "spielerfoto", "nachweise"].includes(s)), []);
  enthaeltNicht("Spielerpass nein: kein alter_verein", R.schritte(BAUSTEINE.kind({}), konfig, HEUTE_STANDARD), "alter_verein");
  enthaelt("Spielerpass ja: alter_verein", R.schritte(BAUSTEINE.kind({ spielerpass: "ja" }), konfig, HEUTE_STANDARD), "alter_verein");
  enthaeltNicht("Spielerpass ja ohne Region: noch keine Abmeldung", R.schritte(BAUSTEINE.kind({ spielerpass: "ja", alterVerein: { region: null } }), konfig, HEUTE_STANDARD), "abmeldung");
  enthaelt("Wechsel in Hessen: Abmeldung", R.schritte(BAUSTEINE.kind({ spielerpass: "ja", alterVerein: { region: "hessen" } }), konfig, HEUTE_STANDARD), "abmeldung");
  enthaelt("Wechsel in ein anderes Bundesland: Abmeldung", R.schritte(BAUSTEINE.kind({ spielerpass: "ja", alterVerein: { region: "bundesland" } }), konfig, HEUTE_STANDARD), "abmeldung");
  enthaeltNicht("Wechsel aus dem Ausland: keine Abmeldung", R.schritte(BAUSTEINE.kind({ spielerpass: "ja", alterVerein: { region: "ausland", name: "FC X" } }), konfig, HEUTE_STANDARD), "abmeldung");
  enthaeltNicht("Deutsches Kind ohne Auslandsbezug: kein wohnen", R.schritte(BAUSTEINE.kind({}), konfig, HEUTE_STANDARD), "wohnen");
  enthaelt("Nichtdeutsches Kind: wohnen", R.schritte(BAUSTEINE.kind({ deutsch: "nein", staaten: ["TR"] }), konfig, HEUTE_STANDARD), "wohnen");
  enthaelt("Deutsches Kind, im Ausland gewohnt: wohnen", R.schritte(BAUSTEINE.kind({ auslandGewohnt: "ja" }), konfig, HEUTE_STANDARD), "wohnen");
  enthaelt("Pass unklar: wohnen", R.schritte(BAUSTEINE.kind({ deutsch: "weiss_nicht", staaten: [] }), konfig, HEUTE_STANDARD), "wohnen");
  enthaeltNicht("Erwachsene: kein wohnen, keine Sorge", R.schritte(BAUSTEINE.erwachsen({ deutsch: "nein", staaten: ["TR"] }), konfig, HEUTE_STANDARD), "wohnen");
  enthaeltNicht("Deutsch noch nicht beantwortet: wohnen noch nicht entscheidbar", R.schritte(BAUSTEINE.kind({ deutsch: null, staaten: [], auslandGewohnt: null }), konfig, HEUTE_STANDARD), "wohnen");
  enthaelt("Mädchen 2011 (B/C): besonderes", R.schritte(BAUSTEINE.kind({ geburtsdatum: "2011-05-05", geschlecht: "w" }), konfig, HEUTE_STANDARD), "besonderes");
  enthaeltNicht("Mädchen 2016: kein besonderes", R.schritte(BAUSTEINE.kind({ geburtsdatum: "2016-05-05", geschlecht: "w" }), konfig, HEUTE_STANDARD), "besonderes");
  enthaeltNicht("Junge 2011: kein besonderes", R.schritte(BAUSTEINE.kind({ geburtsdatum: "2011-05-05", geschlecht: "m" }), konfig, HEUTE_STANDARD), "besonderes");
  enthaelt("Nachweise: bei Erstanmeldung Minderjähriger", R.schritte(BAUSTEINE.kind({}), konfig, HEUTE_STANDARD), "nachweise");
  enthaeltNicht("Nachweise: nicht, wenn nichts nachzuweisen ist", R.schritte(BAUSTEINE.erwachsen({ abteilung: "passiv", spielen: null, spielerpass: null }), konfig, HEUTE_STANDARD), "nachweise");
  PROFILE.forEach((pr) => pruefeSchrittForm("Schritte " + pr.id, R.schritte(tiefKopie(pr.a), konfig, pr.heute)));
}

// ---------- 7. Texte ----------

const KURZ_ABK = /(z\.\s?B\.|ggf\.|bzw\.|usw\.|etc\.|\bca\.|inkl\.|evtl\.|d\.\s?h\.|u\.\s?a\.|sog\.|vgl\.|\bNr\.|\bAbs\.|bspw\.|zzgl\.|i\.\s?d\.\s?R\.)/;
const VERBOTENE_KUERZEL = /\b(HFV|DFB|DFBnet|FIFA|DSGVO|SpO|RSTP|SGB|BGB|KJA|LSB|ARAG|PAuswG|StAG|JuSchG|PDF|SEPA|IBAN|USA|SMS|PLZ|QR)\b|\bJO\b|\bEU\b/;

function saetze(t) {
  return String(t).split(/[.!?:]+(?:\s+|$)/).map((s) => s.trim()).filter(Boolean);
}
function woerter(s) {
  return s.split(/\s+/).filter(Boolean).length;
}

async function testeTexte() {
  let texte;
  try {
    texte = (await import("../../assets/js/anmeldung/texte/de-regeln.js")).default;
  } catch (err) {
    wahr("Texte: de-regeln.js lässt sich laden (" + err.message + ")", false);
    return;
  }
  ["unterlagen", "hinweise", "faelle", "weiterleitung", "frist", "mannschaft", "beitrag", "formulare", "unterschriften", "wer", "art", "status"].forEach((k) => wahr("Texte: Abschnitt " + k, texte[k] && typeof texte[k] === "object"));
  // Unterlagen: alle U01 bis U40 mit name, kurz, warum, wie, wo
  U_IDS.forEach((id) => {
    const t = texte.unterlagen[id];
    wahr("Texte " + id + ": vorhanden", !!t);
    ["name", "kurz", "warum", "wie", "wo"].forEach((f) => wahr("Texte " + id + "." + f + " nicht leer", !!t && typeof t[f] === "string" && t[f].trim().length > 3));
  });
  F_IDS.forEach((id) => wahr("Texte Fall " + id, typeof texte.faelle[id] === "string" && texte.faelle[id].length > 3));
  // Alle Schlüssel des Registers haben einen Text (und umgekehrt: keine Texte ohne Schlüssel)
  ["hinweise", "frist", "weiterleitung", "mannschaft", "beitrag"].forEach((kat) => {
    R.SCHLUESSEL[kat].forEach((k) => wahr("Texte " + kat + "." + k, typeof texte[kat][k] === "string" && texte[kat][k].trim().length > 3));
    // beitrag.gruppen sind keine Hinweise des Registers, sondern die Namen der Beitragsgruppen (siehe unten, N-A2)
    gleich("Texte " + kat + ": keine überzähligen Texte", Object.keys(texte[kat]).filter((k) => R.SCHLUESSEL[kat].indexOf(k) < 0 && !(kat === "beitrag" && k === "gruppen")), []);
    gleich("Register " + kat + ": keine doppelten Schlüssel", new Set(R.SCHLUESSEL[kat]).size, R.SCHLUESSEL[kat].length);
  });
  // N-A2 (sprache-16): Namen der Beitragsgruppen in den Regeltexten (übersetzbar), auf Deutsch wortgleich mit data/anmeldung.json › bezeichnung
  const gruppenTexte = texte.beitrag.gruppen || {};
  Object.entries(cfg.beitragsgruppen).forEach(([schluessel, g]) => gleich("Texte beitrag.gruppen." + schluessel + ": wortgleich mit data/anmeldung.json › bezeichnung", gruppenTexte[schluessel], g.bezeichnung));
  gleich("Texte beitrag.gruppen: keine Texte für unbekannte Beitragsgruppen", Object.keys(gruppenTexte).filter((k) => !(k in cfg.beitragsgruppen)), []);
  // O26 (Jugendleitung, 08.10.2026): Ein Elternteil reicht; der Hinweis „Beide Eltern unterschreiben“ entfällt
  wahr("Texte hinweise: beide_unterschreiben_empfohlen ist entfernt (O26)", !("beide_unterschreiben_empfohlen" in texte.hinweise));
  // O65: Der Hinweis zur Unterschrift von Jugendlichen bei den Fotos ist bis zur Entscheidung des Vorstands entfernt
  wahr("Texte hinweise: jugendlicher_unterschreibt_mit ist entfernt (O65)", !("jugendlicher_unterschreibt_mit" in texte.hinweise));
  // Hilfstexte für die Oberfläche
  FORMULARE.forEach((f) => wahr("Texte Formular " + f, typeof texte.formulare[f] === "string"));
  ART.forEach((x) => wahr("Texte Art " + x, typeof texte.art[x] === "string"));
  WER_S.forEach((x) => wahr("Texte Rolle " + x, typeof texte.wer[x] === "string"));
  ["neu", "wechsel_hfv", "wechsel_lv", "wechsel_ausland", "ausland_unbekannt"].forEach((x) => wahr("Texte Status " + x, typeof texte.status[x] === "string"));
  Object.entries(cfg.unterschriftStellen).forEach(([formular, stellen]) => stellen.forEach((s) => wahr("Texte Unterschrift " + formular + "." + s.stelleKey, typeof texte.unterschriften[formular + "." + s.stelleKey] === "string")));

  // Einfache Sprache: höchstens 12 Wörter pro Satz, keine Paragraphen, keine Abkürzungen
  const alle = [];
  U_IDS.forEach((id) => ["name", "kurz", "warum", "wie", "wo"].forEach((f) => alle.push(["Unterlagen " + id + "." + f, String((texte.unterlagen[id] || {})[f] || "")])));
  ["faelle", "hinweise", "frist", "weiterleitung", "mannschaft", "beitrag", "formulare", "unterschriften", "wer", "art", "status"].forEach((kat) =>
    Object.entries(texte[kat]).forEach(([k, t]) => {
      if (typeof t === "object") Object.entries(t).forEach(([k2, t2]) => alle.push([kat + "." + k + "." + k2, t2])); // beitrag.gruppen.<Schlüssel>
      else alle.push([kat + "." + k, t]);
    })
  );
  alle.forEach(([name, t]) => {
    const langer = saetze(t).filter((s) => woerter(s) > 12);
    pruefe("Einfache Sprache " + name + ": Sätze mit höchstens 12 Wörtern", () => assert.equal(langer.length, 0, "zu lang: " + langer.map((s) => '"' + s + '" (' + woerter(s) + ")").join(" | ")));
    pruefe("Einfache Sprache " + name + ": kein Paragraphenzeichen", () => assert.ok(t.indexOf("§") < 0, "enthält §"));
    pruefe("Einfache Sprache " + name + ": keine Abkürzungen", () => assert.ok(!KURZ_ABK.test(t) && !VERBOTENE_KUERZEL.test(t), "Abkürzung in: " + t));
    pruefe("Einfache Sprache " + name + ": Sie-Form (kein 'du' und 'dein')", () => assert.ok(!/\b(du|dein|deine|deinen|dich)\b/i.test(t), "Du-Form in: " + t));
  });
  // Platzhalter: zu jedem Text liefert das Ergebnis alle Werte (in Profilen und Zufallsprüfung geprüft)
  return texte;
}

// ---------- 7a. Einheitliche Namen und Begriffe (SCHNITTSTELLEN Abschnitt 9, Nachtrag 29.09.) ----------
// Ein Papier heißt überall gleich. Die Tabelle steht hier wörtlich; Oberfläche, PDF und Laufzettel lesen die Namen aus
// de-regeln.js (formulare und unterlagen.<U>.name). Im Fließtext heißt es "Spielrecht"; "Spielerlaubnis" gibt es nur im
// Namen "Antrag auf Spielerlaubnis". Der Hessische Fußball-Verband heißt so oder "Verband"; zwei Verbände heißen beide.

const NAMEN_FORMULARE = {
  aufnahmeantrag: "Aufnahmeantrag",
  foto_einwilligung: "Erlaubnis für Fotos",
  sepa: "Erlaubnis für die Lastschrift",
  familienliste: "Liste der Familienmitglieder",
  datenschutz: "Information zum Datenschutz",
  hfv_antrag: "Antrag auf Spielerlaubnis",
  vollmacht: "Vollmacht für die Abmeldung",
  abmeldung: "Abmeldung beim alten Verein",
  einverstaendnis_senioren: "Einverständnis für Spiele bei den Herren",
  einverstaendnis_maedchen: "Einverständnis für Mädchen bei den Jungen",
  einverstaendnis_fahrten: "Einverständnis für Fahrten und Messenger-Gruppe",
  karneval_auftritte: "Erlaubnis für Auftritte am Abend",
  attest: "Attest vom Arzt",
  notfall: "Notfall- und Gesundheitsbogen",
};
const NAMEN_UNTERLAGEN = {
  U01: "Aufnahmeantrag", U02: "Liste der Familienmitglieder", U04: "Erlaubnis für Fotos", U05: "Erlaubnis für die Lastschrift",
  U06: "Information zum Datenschutz", U07: "Antrag auf Spielerlaubnis", U08: "Erlaubnis für Name und Foto im Internet",
  U10: "Attest vom Arzt", U11: "Erlaubnis für das Attest", U17: "Abmeldung beim alten Verein", U18: "Vollmacht für die Abmeldung",
  U19: "Kündigung beim alten Verein oder passiv bleiben", U23: "Einverständnis für Spiele bei den Herren",
  U24: "Einverständnis für Mädchen bei den Jungen", U28: "Notfall- und Gesundheitsbogen",
  U29: "Einverständnis für Fahrten und Messenger-Gruppe", U30: "Erlaubnis für Auftritte am Abend",
};

function alleTextwerte(wert, pfad, aus) {
  if (typeof wert === "string") aus.push([pfad, wert]);
  else if (wert && typeof wert === "object") Object.keys(wert).forEach((k) => alleTextwerte(wert[k], pfad ? pfad + "." + k : k, aus));
  return aus;
}

function testeNamen(texte) {
  if (!texte) return;
  // Namen der Papiere laut Tabelle
  gleich("Namen: formulare hat genau die Schlüssel der Tabelle", Object.keys(texte.formulare).sort(), Object.keys(NAMEN_FORMULARE).sort());
  Object.entries(NAMEN_FORMULARE).forEach(([f, name]) => gleich("Namen: formulare." + f, texte.formulare[f], name));
  Object.entries(NAMEN_UNTERLAGEN).forEach(([u, name]) => gleich("Namen: unterlagen." + u + ".name", texte.unterlagen[u].name, name));
  // Unterlage und Formular tragen denselben Namen, wenn die Unterlage das ganze Blatt ist
  [["U01", "aufnahmeantrag"], ["U02", "familienliste"], ["U06", "datenschutz"], ["U07", "hfv_antrag"], ["U10", "attest"], ["U17", "abmeldung"],
    ["U18", "vollmacht"], ["U23", "einverstaendnis_senioren"], ["U24", "einverstaendnis_maedchen"], ["U28", "notfall"],
    ["U29", "einverstaendnis_fahrten"], ["U30", "karneval_auftritte"], ["U04", "foto_einwilligung"], ["U05", "sepa"]]
    .forEach(([u, f]) => gleich("Namen: " + u + " heißt wie " + f, texte.unterlagen[u].name, texte.formulare[f]));
  // Beschriftungen der Unterschriften beginnen mit demselben Namen
  const stelleZuFormular = {
    "aufnahmeantrag.s2.unterschrift": "aufnahmeantrag", "aufnahmeantrag.s2.unterschrift_sorgeberechtigte": "aufnahmeantrag",
    "aufnahmeantrag.s3.unterschrift": "foto_einwilligung", "aufnahmeantrag.s4.unterschrift": "sepa",
    "hfv_antrag.spieler": "hfv_antrag", "hfv_antrag.erziehungsberechtigte": "hfv_antrag", "hfv_antrag.verein": "hfv_antrag",
    "vollmacht.unterschrift": "vollmacht", "abmeldung.unterschrift": "abmeldung", "abmeldung.unterschrift_vertreter": "abmeldung",
    "einverstaendnis_senioren.unterschrift": "einverstaendnis_senioren", "einverstaendnis_maedchen.unterschrift": "einverstaendnis_maedchen",
    "einverstaendnis_fahrten.unterschrift": "einverstaendnis_fahrten", "karneval_auftritte.unterschrift": "karneval_auftritte",
    "attest.arzt": "attest", "notfall.unterschrift": "notfall",
  };
  Object.entries(stelleZuFormular).forEach(([stelle, f]) => wahr("Namen: Beschriftung " + stelle + " beginnt mit '" + texte.formulare[f] + "'",
    String(texte.unterschriften[stelle]).indexOf(texte.formulare[f]) === 0, String(texte.unterschriften[stelle])));
  gleich("Namen: Beschriftung attest.einwilligung heißt wie U11", texte.unterschriften["attest.einwilligung"], texte.unterlagen.U11.name);
  wahr("Namen: Beschriftung datenschutz.kenntnisnahme nennt den Namen des Papiers", texte.unterschriften["datenschutz.kenntnisnahme"].indexOf(texte.formulare.datenschutz) >= 0);

  const alle = alleTextwerte(texte, "", []);
  // Alte und abweichende Namen kommen nirgends mehr vor
  ["Fotoerlaubnis", "Einwilligung zum Attest", "Einwilligung zur Verarbeitung der ärztlichen Bescheinigung", "Abmeldung und Kündigung", "für ein Mädchen bei den Jungen"]
    .forEach((alt) => wahr("Namen: abweichender Name '" + alt + "' kommt nicht vor", !alle.some(([, t]) => t.indexOf(alt) >= 0)));
  wahr("Namen: 'Messenger' steht in Namen nur als Messenger-Gruppe",
    alle.filter(([p]) => /^(formulare|unterschriften)\./.test(p) || /^unterlagen\.U\d+\.name$/.test(p)).every(([, t]) => !/Messenger(?!-Gruppe)/.test(t)));
  // Begriffe im Fließtext: Spielrecht statt Spielberechtigung und Spielerlaubnis (außer im Namen des Antrags);
  // Verbände: Hessischer Fußball-Verband oder Verband, nie nur Fußball-Verband
  alle.forEach(([pfad, t]) => {
    const rest = t.split("Antrag auf Spielerlaubnis").join("");
    pruefe("Begriffe " + pfad + ": Spielrecht statt Spielerlaubnis oder Spielberechtigung", () => assert.ok(!/Spielerlaubnis|Spielberechtigung|[Ss]pielberechtigt/.test(rest), "abweichender Begriff in: " + t));
    const ohneHfv = t.replace(/Hessische[nrms]? Fußball-Verband(s)?/g, "");
    pruefe("Begriffe " + pfad + ": Hessischer Fußball-Verband vollständig benannt", () => assert.ok(ohneHfv.indexOf("Fußball-Verband") < 0, "verkürzter Name in: " + t));
  });
  // Zwei Verbände: beide werden benannt (Wechsel aus einem anderen Bundesland)
  wahr("Begriffe: wechsel_lv_anfrage nennt den Hessischen Fußball-Verband und den Verband des alten Vereins",
    /^Der Hessische Fußball-Verband fragt beim Verband des alten Vereins nach\./.test(texte.hinweise.wechsel_lv_anfrage));
  // Pilotprojekt für Frauen bei den Herren: Projekt des HFV (HFV-Spielordnung § 109a Nr. 1 und 6), nicht des DFB
  wahr("Begriffe: frau_herren_offen nennt das Pilotprojekt des Hessischen Fußball-Verbands bis Mitte 2028",
    /Das Pilotprojekt des Hessischen Fußball-Verbands läuft bis Mitte 2028\.$/.test(texte.hinweise.frau_herren_offen));
  wahr("Begriffe: Quelle des Pilotprojekts ist die HFV-Spielordnung § 109a (Daten U39)",
    /HFV-Spielordnung § 109a/.test(cfg.unterlagen.U39.quelle) && /Pilotprojekt bis 2028-06-30/.test(cfg.unterlagen.U39.bedingung));
}

// ---------- 8. Zufallsprüfung ----------

function prng(startwert) {
  let z = startwert >>> 0;
  return function () {
    z = (z + 0x6d2b79f5) >>> 0;
    let t = z;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HEUTE_MENGE = ["2026-09-29", "2026-09-29", "2026-09-29", "2026-06-10", "2026-07-01", "2027-06-10", "2027-01-15", "2027-02-10", "2026-12-31", "2027-07-05", "2026-10-15"];
const GEB_MENGE = ["2025-03-03", "2022-05-05", "2021-01-01", "2020-12-31", "2019-06-15", "2018-02-02", "2017-09-01", "2016-09-29", "2016-09-30", "2016-03-05", "2015-12-12", "2015-01-01",
  "2014-05-10", "2013-07-07", "2012-04-04", "2011-01-20", "2010-10-10", "2010-05-01", "2009-11-11", "2009-03-03", "2008-10-15", "2008-09-29", "2008-01-10", "2007-12-31", "2005-05-05",
  "1997-03-14", "1980-06-06", "1962-05-05", "1961-05-05", "1950-01-01", "", "kein Datum"];

function auswahl(r, liste) {
  return liste[Math.floor(r() * liste.length)];
}

function zufallsAntworten(r, heute) {
  const datumNahe = () => auswahl(r, ["2026-01-05", "2026-03-01", "2026-06-08", "2026-06-30", "2026-08-30", "2026-09-01", "2026-09-25", "2026-09-29", "2027-06-09", "2027-06-30", "2027-01-05", "", null, "kaputt"]);
  const a = {
    schema: 1, sprache: auswahl(r, ["de", "en", "tr", "ar", undefined]), wer: auswahl(r, ["kind", "selbst", null]),
    vorname: "Test", nachname: "Mustermann", geburtsdatum: auswahl(r, GEB_MENGE), geburtsland: auswahl(r, ["DE", "TR", "US", "", null]),
    geschlecht: auswahl(r, ["m", "w", "d", "ohne_angabe", null]), spielrechtFuer: auswahl(r, ["m", "w", null]),
    geborenInDe: auswahl(r, ["ja", "nein", null]), jahreInDe: auswahl(r, [0, 2, 5, 9, null, "7", ""]),
    abteilung: auswahl(r, ["fussball", "fussball", "fussball", "karneval", "beides", "passiv", null]),
    spielen: auswahl(r, [true, true, true, false, null]),
    spielerpass: auswahl(r, ["ja", "ja", "nein", "nein", "weiss_nicht", null]),
    alterVerein: { region: auswahl(r, ["hessen", "hessen", "bundesland", "ausland", null]), name: auswahl(r, ["", "SV Beispieldorf"]), ort: "", land: auswahl(r, ["DE", "US", "Serbien", "TR", "FR", ""]), verband: "" },
    abmeldung: { status: auswahl(r, ["einschreiben", "einschreiben", "formlos", "noch_nicht", "noch_nicht", "weiss_nicht", null]), datum: datumNahe(), weg: auswahl(r, ["vollmacht", "einschreiben", null]) },
    letztesSpiel: datumNahe(), letztesPflichtspiel: datumNahe(), sperre: auswahl(r, ["ja", "nein", "weiss_nicht", null]), sperreBis: datumNahe(),
    freigabe: auswahl(r, ["ja", "nein", "weiss_nicht", null]), wechselLetzte6Monate: auswahl(r, ["ja", "nein", null]),
    deutsch: auswahl(r, ["ja", "ja", "nein", "weiss_nicht", null]), staaten: auswahl(r, [[], ["DE"], ["TR"], ["DE", "TR"], ["RO"], ["SY"], ["XX"]]),
    auslandGewohnt: auswahl(r, ["ja", "nein", "nein", null]),
    wohnen: auswahl(r, ["gemeinsam", "nicht_gemeinsam", "verwandte", "ohne_eltern", null]), ohneElternGrund: auswahl(r, ["gefluechtet", "austausch", "verwandte", "pflege", null]),
    sorge: auswahl(r, ["beide", "beide", "getrennt_bei_mir", "allein", "vormund", "pflege", null]), andererElternteilEinverstanden: auswahl(r, [true, false, null]),
    besonderes: { maedchenJungenteam: r() < 0.3, herrenAushilfe: r() < 0.3, sonderspielrecht: r() < 0.2, frauHerren: r() < 0.3 },
    karneval: { gruppe: auswahl(r, ["Freaky Fruities", "Dreamboys", "weiss_nicht", null]), tanztWoanders: auswahl(r, ["ja", "nein", null]), turnier: auswahl(r, ["ja", "nein", "weiss_nicht", null]), abendOhneEltern: auswahl(r, ["ja", "nein", null]) },
    beitrag: { gruppe: auswahl(r, [null, null, "fussball_jugend", "fussball_passiv", "karneval_azubi", "karneval_senator", "karneval_kinder", "karneval_rentner", "gibt_es_nicht"]),
      familie: auswahl(r, [[], [], [{ vorname: "A", nachname: "B", geburtsdatum: "2018-01-01" }]]), senator: r() < 0.15, doppel: r() < 0.15 },
    leistungen: auswahl(r, ["ja", "nein", null]),
    zahlung: { art: auswahl(r, ["sepa", "rechnung", null]), kontoinhaber: auswahl(r, ["mitglied", "sorgeberechtigt", "andere", null]), iban: auswahl(r, ["DE00", "TR00", "", "FR7630006000011234567890189"]) },
    einwilligungen: { fotos: auswahl(r, ["ja", "nein", null]), hfvName: auswahl(r, [true, false, null]), hfvFoto: auswahl(r, [true, false, null]), fahrten: auswahl(r, [true, false, null]), messenger: auswahl(r, [true, false, null]) },
    gesundheit: { medikamente: auswahl(r, ["", "Asthmaspray", null]) },
    spielerfoto: { weg: auswahl(r, ["foto", "datei", "verein", "", null]) },
    nachweise: { U09: auswahl(r, ["habe", "fehlt", undefined]), U10: auswahl(r, ["habe", "fehlt", undefined]), U12: auswahl(r, ["habe", undefined]), U25: auswahl(r, ["habe", undefined]) },
  };
  return { a: a, heute: heute };
}

function pruefeZufall(fall, texte, nr) {
  const name = "Zufall " + nr;
  const a = tiefEinfrieren(tiefKopie(fall.a));
  const heute = fall.heute;
  let e; let s;
  try {
    e = R.auswerten(a, konfig, heute);
    s = R.schritte(a, konfig, heute);
  } catch (err) {
    fehler.push(name + ": Ausnahme " + err.message + " bei " + JSON.stringify(fall).slice(0, 300));
    anzahl += 1;
    return;
  }
  sammle(e);
  const ids = e.unterlagen.map((u) => u.id);
  const lokal = (b, meldung) => { if (!b) fehler.push(name + ": " + meldung + " bei " + JSON.stringify({ heute: heute, a: fall.a }).slice(0, 600)); };
  anzahl += 1;
  lokal(ids.every((u, i) => i === 0 || ids[i - 1] < u), "Unterlagen nicht sortiert oder doppelt");
  lokal(e.unterlagen.every((u) => U_IDS.includes(u.id) && ART.includes(u.art) && WER_U.includes(u.wer) && WANN.includes(u.wann) && FORM.includes(u.form) && (u.formular === null || FORMULARE.includes(u.formular)) && typeof u.nachweis === "boolean" && u.textKey === u.id), "Unterlage mit ungültigen Werten");
  lokal(e.formulare.every((f) => FORMULARE.includes(f)) && new Set(e.formulare).size === e.formulare.length, "Formulare ungültig");
  lokal(e.unterschriften.every((u) => e.formulare.includes(u.formular) && WER_S.includes(u.wer) && !!u.stelleKey), "Unterschrift ungültig");
  lokal(stellenPassen(e.unterschriften), "Stellen-Schlüssel unbekannt: " + stellenFehler(e.unterschriften));
  lokal(e.unterschriften.length === new Set(e.unterschriften.map((u) => u.formular + "|" + u.stelleKey)).size, "Unterschriftsstelle doppelt");
  lokal(e.faelle.every((f) => F_IDS.includes(f)), "unbekannter Fall");
  lokal(e.hinweise.every((h) => ["warnung", "info", "frist", "offen"].includes(h.art) && typeof h.key === "string" && h.werte && typeof h.werte === "object"), "Hinweis ungültig");
  lokal(new Set(e.hinweise.map((h) => h.key)).size === e.hinweise.length, "Hinweise doppelt");
  lokal(!e.hinweise.some((h) => h.key === "jugendlicher_unterschreibt_mit"), "entfernter Hinweis jugendlicher_unterschreibt_mit erscheint (O65)");
  lokal(e.weiterleitung.every((w) => ["jugendleitung", "passwesen", "geschaeftsstelle", "karneval", "spielausschuss"].includes(w.an)), "Weiterleitung ungültig");
  lokal(["neu", "wechsel_hfv", "wechsel_lv", "wechsel_ausland", "ausland_unbekannt", null].includes(e.status), "Status ungültig");
  lokal(e.fehlend.every((f) => U_IDS.includes(f)), "Fehlend ungültig");
  // Alter und Minderjährigkeit hängen zusammen
  lokal(e.alter === null ? e.minderjaehrig === null : e.minderjaehrig === (e.alter < 18), "Alter und Minderjährigkeit widersprüchlich");
  // Frist: nie vor dem Heute-Datum, Freundschaftsspiele nie nach den Pflichtspielen
  lokal(e.frist.pflichtspieleAb === null || e.frist.pflichtspieleAb >= heute, "Pflichtspiele vor heute");
  lokal(e.frist.freundschaftsspieleAb === null || e.frist.freundschaftsspieleAb >= heute, "Freundschaftsspiele vor heute");
  lokal(e.frist.pflichtspieleAb === null || e.frist.freundschaftsspieleAb === null || e.frist.freundschaftsspieleAb <= e.frist.pflichtspieleAb, "Freundschaftsspiele nach Pflichtspielen");
  lokal(!e.international || e.frist.regel === "R2" || e.frist.regel === "R14", "international ohne R2 oder R14");
  lokal(e.frist.regel !== "R1" || e.frist.pflichtspieleAb === heute, "R1 mit Wartefrist");
  lokal(e.frist.regel !== "R14" || (e.frist.pflichtspieleAb === null && e.frist.unsicher === true), "R14 mit Zusage");
  lokal(e.frist.regel !== "R2" || (e.frist.pflichtspieleAb === null && e.frist.unsicher === true), "R2 mit Datum");
  lokal(e.frist.alternativ === null || e.frist.alternativ.pflichtspieleAb <= e.frist.pflichtspieleAb || e.frist.pflichtspieleAb === null, "Alternative später als die Schätzung");
  // Karneval und passive Mitglieder: nichts vom Verband
  const nurKarnevalOderPassiv = (e.faelle.includes("F01") || e.faelle.includes("F02")) && !e.faelle.some((f) => !["F01", "F02", "F14"].includes(f));
  const hfvIds = /^U(0[7-9]|1\d|2[0-4]|26|27|36|37|38|39|40)$/;
  if (a.abteilung === "karneval" || a.abteilung === "passiv") {
    lokal(!ids.some((u) => hfvIds.test(u)), "HFV-Unterlage bei Karneval oder Passiv: " + ids.filter((u) => hfvIds.test(u)).join(","));
    lokal(e.status === null && e.international === false, "Status bei Karneval oder Passiv");
    lokal(!e.formulare.some((f) => ["hfv_antrag", "attest", "vollmacht", "abmeldung", "einverstaendnis_senioren", "einverstaendnis_maedchen"].includes(f)), "Formular des Verbands bei Karneval oder Passiv");
    lokal(nurKarnevalOderPassiv || e.faelle.length === 0 || e.faelle.every((f) => ["F01", "F02", "F14"].includes(f)), "Fall bei Karneval oder Passiv");
  }
  // Erwachsene: keine Sorgeberechtigten; Minderjährige: keine Mitglieds-Unterschrift und keine Erwachsenen-Unterlagen
  if (e.minderjaehrig === false) {
    lokal(!e.unterschriften.some((u) => u.wer.indexOf("sorge") === 0 || u.wer === "spieler"), "Sorgeberechtigte bei Erwachsenen");
    lokal(!ids.some((u) => ["U28", "U29", "U33", "U30", "U24", "U23", "U25"].includes(u)), "Kinder-Unterlage bei Erwachsenen: " + ids.join(","));
    lokal(!e.faelle.some((f) => ["F13", "F14", "F15", "F16", "F17", "F18", "F03", "F04", "F05", "F06", "F07"].includes(f)), "Kinderfall bei Erwachsenen");
  }
  // O26 (Jugendleitung, 08.10.2026): Ein Elternteil reicht. Den zweiten Elternteil gibt es nur bei getrennt lebenden Eltern ohne Einverständnis.
  lokal(e.unterschriften.some((u) => u.wer === "sorgeberechtigte_beide") === (e.minderjaehrig === true && a.sorge === "getrennt_bei_mir" && a.andererElternteilEinverstanden !== true),
    "zweiter Elternteil nur bei getrennt lebenden Eltern ohne Einverständnis");
  lokal(!e.hinweise.some((h) => h.key === "beide_unterschreiben_empfohlen"), "entfernter Hinweis beide_unterschreiben_empfohlen erscheint (O26)");
  if (e.minderjaehrig === true) {
    lokal(!e.unterschriften.some((u) => u.wer === "mitglied"), "Mitglieds-Unterschrift bei Minderjährigen");
    lokal(!e.faelle.some((f) => ["F10", "F11", "F12"].includes(f)), "Erwachsenen-Fall bei Minderjährigen");
  }
  // Ohne deutschen Pass keine Ausweiskopie von Deutschen; Deutsche nie 'pflicht'
  const u12 = e.unterlagen.find((u) => u.id === "U12");
  if (u12 && a.deutsch === "ja") lokal(u12.art === "offen" && u12.nachweis === false, "Ausweiskopie eines Deutschen ist keine Pflicht");
  // Attest: Das Formular "attest" gehört genau dann in e.formulare, wenn U10 oder U11 nicht "offen" ist.
  // U10 "offen" (Wechsel Minderjähriger): Mit vorhandenem Attest (a.nachweise.U10 "habe") ist U11 Vereinsvorgabe, und beide Stellen
  // des Attests (arzt, einwilligung) stehen in e.unterschriften; sonst bleibt alles offen.
  const u10 = e.unterlagen.find((u) => u.id === "U10");
  const u11 = e.unterlagen.find((u) => u.id === "U11");
  lokal(e.formulare.includes("attest") === [u10, u11].some((u) => !!u && u.art !== "offen"), "Formular attest passt nicht zu U10 und U11");
  lokal(["arzt", "einwilligung"].every((k) => e.unterschriften.some((x) => x.formular === "attest" && x.stelleKey === k)) === e.formulare.includes("attest"), "Stellen des Attests passen nicht zum Formular");
  if (u10 && u10.art === "offen") {
    const habe = !!a.nachweise && a.nachweise.U10 === "habe";
    gesehen.attestOffen[habe ? "habe" : "sonst"] += 1;
    lokal(!!u11 && u11.art === (habe ? "verein" : "offen"), "U11 passt nicht zu U10 offen (Attest " + (habe ? "vorhanden" : "nicht vorhanden") + ")");
    lokal(e.formulare.includes("attest") === habe, "Formular attest bei U10 offen (Attest " + (habe ? "vorhanden" : "nicht vorhanden") + ")");
    lokal(e.unterschriften.some((x) => x.formular === "attest" && x.stelleKey === "einwilligung" && x.wer === "sorgeberechtigte") === habe, "Einwilligung zum Attest bei U10 offen (Attest " + (habe ? "vorhanden" : "nicht vorhanden") + ")");
  }
  // Beitrag
  lokal(e.beitrag.gruppe === null || (!!cfg.beitragsgruppen[e.beitrag.gruppe] && !!konfig.aufnahmeantragFelder.felder[cfg.beitragsgruppen[e.beitrag.gruppe].aufnahmeantragFeld]), "Beitragsgruppe ungültig");
  lokal(e.beitrag.gruppen.length <= 2 && e.beitrag.gruppen.every((g) => !!cfg.beitragsgruppen[g]), "Beitragsgruppen ungültig");
  lokal(e.beitrag.gruppen.length === e.beitrag.felder.length, "Felder und Gruppen ungleich");
  // Mannschaft
  lokal(e.mannschaft.vorhanden === (e.mannschaft.namen.length > 0), "Mannschaft vorhanden widerspricht den Namen");
  lokal(e.mannschaft.vorhanden === false || e.mannschaft.namen.every((n) => cfg.mannschaften.some((m) => m.name === n)), "unbekannte Mannschaft");
  // Schritte
  const okForm = s.slice(0, 5).join(",") === "start,wer,name,geburt,abteilung" && s.slice(-3).join(",") === "unterschriften,pruefen,fertig" && s.every((x, i) => KANON.includes(x) && (i === 0 || KANON.indexOf(s[i - 1]) < KANON.indexOf(x)));
  lokal(okForm, "Schritte ungültig: " + s.join(","));
  lokal(!s.includes("spielerfoto") || e.unterlagen.some((u) => u.id === "U16"), "Schritt spielerfoto ohne U16");
  lokal(s.includes("nachweise") === e.unterlagen.some((u) => u.nachweis), "Schritt nachweise passt nicht zu den Unterlagen");
  lokal(!s.includes("wohnen") || a.spielen === true, "wohnen ohne Spielen");
  lokal(!s.includes("abmeldung") || e.status === "wechsel_hfv" || e.status === "wechsel_lv", "abmeldung ohne Inlandswechsel");
  // Texte: alle Platzhalter werden durch Werte ersetzt
  if (texte) {
    e.hinweise.forEach((h) => lokal(ERSETZE(texte.hinweise[h.key], h.werte).indexOf("{") < 0, "Platzhalter offen in Hinweis " + h.key + ": " + texte.hinweise[h.key]));
    lokal(ERSETZE(texte.frist[e.frist.key], e.frist.werte).indexOf("{") < 0, "Platzhalter offen in Frist " + e.frist.key);
    if (e.mannschaft.hinweisKey) lokal(ERSETZE(texte.mannschaft[e.mannschaft.hinweisKey], e.mannschaft.werte).indexOf("{") < 0, "Platzhalter offen in Mannschaft " + e.mannschaft.hinweisKey);
    lokal(ERSETZE(texte.beitrag[e.beitrag.hinweisKey], e.beitrag.werte).indexOf("{") < 0, "Platzhalter offen in Beitrag " + e.beitrag.hinweisKey);
    e.unterlagen.forEach((u) => ["name", "kurz", "warum", "wie", "wo"].forEach((f) => lokal(ERSETZE((texte.unterlagen[u.id] || {})[f], u.werte).indexOf("{") < 0, "Platzhalter offen in " + u.id + "." + f)));
  }
  // Wiederholung liefert dasselbe Ergebnis (rein, ohne Zustand), und die Eingabe blieb unverändert
  lokal(JSON.stringify(R.auswerten(a, konfig, heute)) === JSON.stringify(e), "Ergebnis nicht wiederholbar");
  lokal(JSON.stringify(a) === JSON.stringify(fall.a), "Eingabe verändert");
}

async function testeZufall(texte) {
  const r = prng(20260929);
  const N = 6000;
  for (let i = 0; i < N; i += 1) pruefeZufall(zufallsAntworten(r, auswahl(r, HEUTE_MENGE)), texte, i);
  // Auf Eingaben in fremdem Format bricht nichts
  [undefined, null, {}, [], "text", 5].forEach((x, i) => pruefe("Fremde Eingabe " + i, () => { R.auswerten(x, konfig, HEUTE_STANDARD); R.schritte(x, konfig, HEUTE_STANDARD); }));
  ["", null, undefined, "kein Datum", "2026-13-01"].forEach((h, i) => pruefe("Fremdes Heute-Datum " + i, () => { R.auswerten(BAUSTEINE.kind({}), konfig, h); R.schritte(BAUSTEINE.kind({}), konfig, h); }));
  gleich("Zufallsprüfung: keine unbekannten Schlüssel", R.unbekannteSchluessel(), []);
}

// ---------- 9. Abdeckung der Schlüssel ----------

function testeAbdeckung() {
  ["hinweise", "frist", "weiterleitung", "mannschaft", "beitrag"].forEach((kat) => {
    const nicht = R.SCHLUESSEL[kat].filter((k) => !gesehen[kat].has(k));
    gleich("Abdeckung: jeder Schlüssel " + kat + " wurde in Profilen oder Zufallsfällen ausgegeben", nicht, []);
  });
  U_IDS.forEach((id) => wahr("Abdeckung: " + id + " wurde in Profilen oder Zufallsfällen ausgegeben", gesehen.unterlagen.has(id)));
  F_IDS.forEach((id) => wahr("Abdeckung: " + id, gesehen.faelle.has(id)));
  R_IDS.filter((x) => ["R1", "R2", "R3", "R4", "R5", "R7", "R13", "R14"].includes(x)).forEach((id) => wahr("Abdeckung: Frist-Regel " + id, gesehen.regeln.has(id)));
  wahr("Abdeckung: Zufallsprüfung mit U10 offen und vorhandenem Attest (" + gesehen.attestOffen.habe + " Fälle)", gesehen.attestOffen.habe >= 20);
  wahr("Abdeckung: Zufallsprüfung mit U10 offen ohne vorhandenes Attest (" + gesehen.attestOffen.sonst + " Fälle)", gesehen.attestOffen.sonst >= 20);
}

// ---------- 10. Quelltext-Prüfungen ----------

function testeQuelltext() {
  const quelle = lies("assets/js/anmeldung/regeln.js");
  wahr("regeln.js: kein document, window, Date.now, new Date()", !/document|window|Date\.now|new Date\(\)/.test(quelle));
  wahr("regeln.js: keine Importe (läuft in Node und Browser)", !/^\s*import\s/m.test(quelle));
  wahr("regeln.js: kein localStorage, fetch, XMLHttpRequest", !/localStorage|sessionStorage|fetch\(|XMLHttpRequest|process\./.test(quelle));
  wahr("regeln.js: kein console", !/console\./.test(quelle));
  // Personennamen aus den Vereinsdaten kommen in keiner neuen Datei vor
  const namen = new Set();
  JSON.parse(lies("data/teams.json")).forEach((t) => (t.trainer || []).forEach((n) => namen.add(n)));
  const karneval = JSON.parse(lies("data/karneval.json"));
  (karneval.gruppen || []).forEach((g) => (g.leitung || []).forEach((n) => namen.add(n.replace(/\s*\(.*\)\s*$/, ""))));
  if (karneval.leitung) namen.add(karneval.leitung.replace(/\s*\(.*\)\s*$/, ""));
  const verein = JSON.parse(lies("data/verein.json"));
  (verein.vorsitz || []).concat(verein.vertretung || []).forEach((n) => namen.add(n.replace(/\s*\(.*\)\s*$/, "")));
  wahr("Personennamen: Liste nicht leer", namen.size > 10);
  const dateien = ["data/anmeldung.json", "assets/js/anmeldung/regeln.js", "assets/js/anmeldung/texte/de-regeln.js", "tools/anmeldung-test/profile.mjs", "tools/anmeldung-test/regeln-test.mjs"];
  dateien.forEach((d) => {
    const inhalt = lies(d);
    namen.forEach((n) => {
      pruefe("Personenname '" + n + "' nicht in " + d, () => {
        const nachname = n.trim().split(/\s+/).slice(-1)[0];
        assert.ok(inhalt.indexOf(n) < 0, "voller Name gefunden");
        if (nachname.length >= 5 && nachname !== "Mustermann") assert.ok(inhalt.indexOf(nachname) < 0, "Nachname gefunden: " + nachname);
      });
    });
    // Keine E-Mail-Adressen (außer Vereinsadressen), keine Telefonnummern außer der Nummer der Geschäftsstelle, keine Geburtsdaten im Punktformat
    if (d === "data/anmeldung.json" || d.indexOf("assets/") === 0) {
      pruefe("Datenschutz in " + d + ": nur Vereinsadressen", () => {
        const adressen = inhalt.match(/[\w.+-]+@[\w-]+\.[\w.-]+/g) || [];
        assert.ok(adressen.every((x) => /@sportfreunde04\.de$/.test(x)), "fremde Adresse: " + adressen.filter((x) => !/@sportfreunde04\.de$/.test(x)).join(","));
      });
      pruefe("Datenschutz in " + d + ": keine IBAN, keine Geburtsdaten, nur die Vereins-Telefonnummer", () => {
        assert.ok(!/\bDE\d{2}\s?\d{4}/.test(inhalt), "IBAN-Muster");
        assert.ok(!/\b\d{2}\.\d{2}\.(19\d{2}|20[01]\d|202[0-4])\b/.test(inhalt), "Geburtsdatum-Muster");
        const nummern = (inhalt.match(/\b0\d{2,5}[ /-]?\d{3,}\b/g) || []).filter((x) => x !== "069 736868" && x !== "0123456789");
        assert.equal(nummern.length, 0, "Telefonmuster: " + nummern.join(","));
        assert.ok(!/\+49/.test(inhalt), "+49");
      });
    }
  });
}

// ---------- Ablauf ----------

testeDatum();
testeDaten();
PROFILE.forEach(pruefeProfil);
gleich("Profile: mindestens 26", PROFILE.length >= 26, true);
gleich("Profile: eindeutige Kennungen", new Set(PROFILE.map((p) => p.id)).size, PROFILE.length);
testeWartefristen();
testeSchritte();
const texte = await testeTexte();
testeNamen(texte);
await testeZufall(texte);
testeFaelleUndRegeln();
testeAttestBeiWechsel();
testeFotoEinwilligungJugendlicher();
testeAbdeckung();
testeQuelltext();

if (fehler.length) {
  console.error("regeln-test: " + fehler.length + " Fehler bei " + anzahl + " Prüfungen\n");
  fehler.slice(0, Number(process.env.MAX_FEHLER || 80)).forEach((f) => console.error(" - " + f));
  if (fehler.length > Number(process.env.MAX_FEHLER || 80)) console.error(" ... und " + (fehler.length - Number(process.env.MAX_FEHLER || 80)) + " weitere");
  process.exit(1);
}
console.log("regeln-test: " + anzahl + " Prüfungen bestanden (" + PROFILE.length + " Profile, 6000 Zufallsfälle), 0 Fehler. Version " + R.VERSION);
