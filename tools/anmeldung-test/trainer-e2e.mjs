#!/usr/bin/env node
// Ende-zu-Ende-Test der Seite „Neu im Trainerteam“ (Arbeitspaket T1 der Stufe 2).
//
// Baut nicht (kein npm run build): Der Test erzeugt die Testseite im Speicher (kein HTML im Repo) und liefert sie mit einem kleinen eigenen
// Server auf Port 4201 aus (nur 127.0.0.1). Stylesheets, Schriften und Module kommen aus assets/ (site.css wird aus den Quellen
// tokens.css, fonts.css, base.css und komponenten.css zusammengesetzt, wie tools/build.mjs es minifiziert); gesteuert wird Chrome
// (puppeteer-core, headless). Der PDF-Baustein trainer-pdf.js wird in den ersten Durchgängen durch eine Attrappe ersetzt, die die
// übergebenen Daten aufzeichnet und drei Beispieldateien zurückgibt; existiert assets/js/anmeldung/trainer-pdf.js, läuft danach ein
// zweiter Durchgang mit dem echten Modul (mit --ohne-echt übersprungen).
//
// Geprüft wird (Nummern wie in den Akzeptanzkriterien von T1):
//   [2]  alle 13 Bildschirme von „Code“ bis „Fertig“, zurück bis „Code“, „Ändern“ (Name) von „Prüfen“ aus und danach wieder in der
//        Reihenfolge weiter; die Abschnittszeile je Bildschirm; Kopf, Lead, Leiste
//   [3]  Zugangsschutz: ohne Code nur die Code-Seite (die übrigen Bildschirme sind nicht im Dokument), leer, falsch, richtig in jeder
//        Schreibweise, ?code=richtig, ?code=falsch, keine Adresse an der Code-Abfrage vorbei, leere Prüfwerteliste
//   [4]  Prüfregeln: Fehlerfälle je Seite im Browser (Meldung, „Weiter“ blockiert, gültige Eingabe geht weiter) und trainer-regeln.js
//        einzeln in Node
//   [5]  jede verbindliche Zeichenkette der 13 Bildschirme steht im sichtbaren Text (ohne die Stellen für Einsichtnehmende)
//   [6]  Einsichtnehmende aus der Konfiguration: eine Person (Standardfall), zwei, drei, keine; Wortlaut auf Bildschirm 10, 12 und 13
//   [7]  Handy (390 px, Faktor 2): Bildschirmfotos, scrollWidth, Tippflächen, Eingabeschrift, Konsole, Netz, axe-core
//   [8]  Foto (Datei, verkleinert, JPG, Vorschau, ersetzen, Fehler) und Unterschrift (Maus, Touch, löschen; Pixelprüfung)
//   [9]  Ende: Löschen, Dateien erstellen (Aufruf von erzeugeDateien), Namen und Beschreibung, Teilen, Herunterladen, Vorschau,
//        „Antrag ansehen“, Fehler beim Erstellen; trainer-pdf.js lädt mit der Seite (Anfrage beim Start mit Sec-Fetch-Dest: script, danach
//        keine weitere) und scheitert es (Antwort 503), steht der Text „Ladefehler“ da (T1b: Safari merkt sich ein gescheitertes import())
//   [11] Importe: alle eigenen Module statisch (auch trainer-pdf.js), einziges import() der Rückfall für die Schrift im Lader, der
//        Importgraph ab trainer.js ist geschlossen (keine Verweise auf andere Ordner)
//
// Aufruf: node tools/anmeldung-test/trainer-e2e.mjs [--ausgabe=<Ordner>] [--echt | --ohne-echt] [--nur-regeln] [--ohne-bilder] [--server]
//   --ausgabe     Ordner für Bildschirmfotos (bilder/NN-<name>-390.png) und das Protokoll (ergebnis.txt); Standard:
//                 tools/cache/anmeldung-test/trainer-e2e (git-ignoriert)
//   --echt        der Durchgang mit dem echten assets/js/anmeldung/trainer-pdf.js ist Pflicht (ohne die Datei: Fehler); ohne diesen
//                 Schalter läuft er trotzdem, sobald die Datei existiert
//   --ohne-echt   den Durchgang mit dem echten trainer-pdf.js überspringen (nur Attrappe)
//   --nur-regeln  nur trainer-regeln.js in Node prüfen (ohne Browser)
//   --server      kein Test: liefert nur die Testseite auf Port 4201 aus, für Stichproben von Hand im Browser (Adresse steht in der
//                 Ausgabe; Strg+C beendet den Server; startet kein Chrome und schreibt keine Dateien)
// Ausgabe: je Prüfung eine Zeile, am Ende die Zusammenfassung; Exit 0 nur, wenn alles bestanden ist.

import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import puppeteer from "puppeteer-core";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const JS_ORDNER = path.join(ROOT, "assets", "js", "anmeldung");
const CHROME = process.env.CHROME_PFAD || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const AXE = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const PORT = 4201;
const BASIS = "http://127.0.0.1:" + PORT;
const ARG = (name) => (process.argv.find((a) => a.startsWith("--" + name + "=")) || "").slice(name.length + 3);
const AUSGABE = path.resolve(ARG("ausgabe") || path.join(ROOT, "tools", "cache", "anmeldung-test", "trainer-e2e"));
// Der Durchgang mit dem echten PDF-Baustein läuft, sobald die Datei existiert; --echt macht ihn zur Pflicht, --ohne-echt lässt ihn aus.
const MIT_ECHT = !process.argv.includes("--ohne-echt") && (process.argv.includes("--echt") || fs.existsSync(path.join(JS_ORDNER, "trainer-pdf.js")));
const NUR_REGELN = process.argv.includes("--nur-regeln");
const NUR_SERVER = process.argv.includes("--server");
const OHNE_BILDER = process.argv.includes("--ohne-bilder");
const TESTBILDER = path.join(ROOT, "tools", "anmeldung-test", "testbilder");

// ---------- Ergebnisse ----------

const zeilen = [];
let fehlerAnzahl = 0;
function kriterium(nr, titel, ok, nachweis) {
  if (!ok) fehlerAnzahl += 1;
  const text = `${ok ? "OK    " : "FEHLER"}  [${nr}] ${titel}${nachweis ? "\n          " + String(nachweis).split("\n").join("\n          ") : ""}`;
  zeilen.push(text);
  console.log(text);
}
const info = (text) => {
  const t = "          " + text;
  zeilen.push(t);
  console.log(t);
};
const warte = (ms) => new Promise((ok) => setTimeout(ok, ms));
const norm = (text) => String(text).replace(/[\s ]+/g, " ").trim();
// Vergleich ohne Rücksicht auf die Reihenfolge der Schlüssel in Objekten
const stabil = (x) => JSON.stringify(x, (k, v) => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : 1))) : v));
const gleich = (x, y) => stabil(x) === stabil(y);

// ---------- Testdaten (alles erfunden) ----------

const HEUTE = "2026-11-23";
// Zugangscode nur für diesen Test (zufällig, kein echter Code); die Konfiguration kennt nur den Prüfwert
const TESTCODE = "K7M4-Q9XA-R2TZ";
const normalisiere = (c) => c.replace(/[\s-]/g, "").toUpperCase();
const PRUEFWERT = createHash("sha256").update(normalisiere(TESTCODE)).digest("hex");
const FREMDER_PRUEFWERT = createHash("sha256").update("NIEMANDKENNTMICH").digest("hex");

const BEISPIEL = {
  vorname: "Max",
  nachname: "Mustermann",
  geburtsdatum: "1988-03-14",
  anschrift: { strasse: "Musterstraße 12", plz: "60326", ort: "Frankfurt am Main" },
  handy: "0170 1234567",
  email: "max.mustermann@example.com",
  abteilung: "fussball",
  mannschaft: "D3-Jugend",
  rolle: "co-trainer",
  seit: "2026-11-02",
  tage: ["di", "do", "sa"],
  notfall: { name: "Erika Mustermann", beziehung: "Partnerin", telefon: "0170 7654321" },
  beruf: "Elektriker",
  erfahrung: "Drei Jahre Jugendtrainer bei einem anderen Verein (E-Jugend).",
  ersteHilfe: "ja",
  ersteHilfeAm: "2025-05-12",
  ersteHilfeBis: null,
  sonstiges: "",
  foto: true,
  kodexGelesen: true,
  selbstauskunft: true,
  zeugnis: "beantragen",
  satzung: true,
};

const MANNSCHAFTEN_FUSSBALL = ["G-Jugend (Bambinis)", "F1-Jugend", "F2-Jugend", "E1-Jugend", "E2-Jugend", "E3-Jugend", "D1-Jugend", "D2-Jugend", "D3-Jugend", "A-Jugend", "1. Herrenmannschaft", "Soma (Sondermannschaft)"];
const GRUPPEN_KARNEVAL = ["Kinderprinzenpaar-Garde", "Funkengarde Beispiel"];
const MAIL = "geschaeftsstelle@sportfreunde04.de";

const EINSICHT = {
  eine: [{ name: "Melanie Seipp", funktion: "1. Vorsitzende" }],
  zwei: [{ name: "Melanie Seipp", funktion: "1. Vorsitzende" }, { name: "Max Vertretung", funktion: "Vertretung" }],
  drei: [{ name: "Melanie Seipp", funktion: "1. Vorsitzende" }, { name: "Max Vertretung", funktion: "Vertretung" }, { name: "Erika Beispiel", funktion: "Schriftführerin" }],
  keine: [],
};

function testKonfig(einsicht, aenderung) {
  const k = {
    live: true,
    zugang: { parameter: "code", pruefwerte: [PRUEFWERT] },
    verein: {
      name: "FFV Sportfreunde 04",
      ort: "Frankfurt am Main",
      mail: MAIL,
      unterzeichner: { name: "Melanie Seipp", funktion: "Vorstand" },
      satzungUrl: "https://example.com/satzung.pdf",
      kodexUrl: "https://example.com/kodex.pdf",
    },
    einsicht,
    mannschaften: [
      ...MANNSCHAFTEN_FUSSBALL.map((name) => ({ abteilung: "fussball", name })),
      ...GRUPPEN_KARNEVAL.map((name) => ({ abteilung: "karneval", name })),
    ],
    schnupperMonate: 1,
    zeugnisJahre: 5,
    quellen: {},
  };
  return aenderung ? aenderung(k) || k : k;
}

// Varianten der Testseite (Pfad im Server): Konfiguration je Variante
const VARIANTEN = {
  standard: () => testKonfig(EINSICHT.eine),
  zwei: () => testKonfig(EINSICHT.zwei),
  drei: () => testKonfig(EINSICHT.drei),
  keine: () => testKonfig(EINSICHT.keine),
  // leere Liste der Prüfwerte: Die Seite bleibt zu
  ohnepruefwerte: () => testKonfig(EINSICHT.eine, (k) => { k.zugang.pruefwerte = []; }),
  // zwei Prüfwerte nebeneinander (Wechsel ohne Lücke), einer davon fremd
  zweipruefwerte: () => testKonfig(EINSICHT.eine, (k) => { k.zugang.pruefwerte = [FREMDER_PRUEFWERT, PRUEFWERT]; }),
  // Schnupperphase von zwei Monaten, ohne Mannschaften für Karneval, ohne Links und ohne Ort
  sonderfall: () => testKonfig(EINSICHT.eine, (k) => {
    k.schnupperMonate = 2;
    k.mannschaften = k.mannschaften.filter((m) => m.abteilung === "fussball");
    delete k.verein.satzungUrl;
    delete k.verein.kodexUrl;
    delete k.verein.ort;
  }),
  // ohne Adresse der Geschäftsstelle
  ohnemail: () => testKonfig(EINSICHT.eine, (k) => { delete k.verein.mail; }),
  // nur die Abteilung Fußball (Karneval vorerst außen vor, Melli 24.11.2026): keine Frage nach der Abteilung, keine Karneval-Gruppen
  nurfussball: () => testKonfig(EINSICHT.eine, (k) => {
    k.abteilungen = ["fussball"];
    k.mannschaften = k.mannschaften.filter((m) => m.abteilung === "fussball");
  }),
};

// ---------- Soll-Texte der 13 Bildschirme ----------
// Verbindliche Zeichenketten aus ap1/AUFTRAG.md (Abschnitt „Verbindliche Texte der 13 Bildschirme“, ausgelesen mit der Logik von ap1/pruefen.mjs).
// Ohne die Stellen für Einsichtnehmende (Bildschirm 10 Punkt 4, 12 „Das solltest du wissen“, 13 „So geht es weiter“): Sie stehen unter [6].

const SCHRITTE = ["code", "start", "person", "einsatz", "notfall", "erfahrung", "foto", "kodex", "selbstauskunft", "zeugnis", "unterschriften", "pruefen", "fertig"];
const nn = (schritt) => String(SCHRITTE.indexOf(schritt) + 1).padStart(2, "0");
const ABSCHNITT_VON = { person: "du", einsatz: "einsatz", notfall: "einsatz", erfahrung: "einsatz", foto: "unterlagen", kodex: "unterlagen", selbstauskunft: "unterlagen", zeugnis: "zeugnis", unterschriften: "unterschrift", pruefen: "fertig", fertig: "fertig" };
const ABSCHNITT_TEXTE = ["Du", "Einsatz", "Unterlagen", "Führungszeugnis", "Unterschrift", "Fertig"];
const VOLL = ["code", "start", "fertig"];

const SOLL = {
  code: [
    "Dein Zugangscode",
    "Diese Seite ist für neue Trainer, Co-Trainer und Betreuer des FFV Sportfreunde 04. Den Code bekommst du von der Vorsitzenden per E-Mail oder Nachricht.",
    "Zugangscode",
    "Zwölf Zeichen. Bindestriche und Leerzeichen sind egal.",
    "Weiter",
    "Noch keinen Code? Code anfragen",
    "Alles bleibt auf deinem Gerät, bis du die Dateien selbst schickst. Die Seite sendet nichts.",
  ],
  start: [
    "Schön, dass du dabei bist",
    "Hier erledigst du alles, was der Verein von neuen Trainern und Betreuern braucht. Das dauert etwa zehn Minuten.",
    "So läuft es",
    "Du trägst deine Angaben ein und machst ein Passfoto.",
    "Du liest den Verhaltenskodex und bestätigst ihn und die Selbstauskunft.",
    "Du bekommst den Antrag für dein erweitertes Führungszeugnis, ausgefüllt und gebührenfrei.",
    "Du unterschreibst am Bildschirm und schickst alles per E-Mail an die Geschäftsstelle.",
    "Das brauchst du",
    "Dein Handy oder einen Computer",
    "Ein Foto von dir (digital genügt)",
    "Deinen Finger oder die Maus zum Unterschreiben",
    "Gut zu wissen",
    "Im ersten Monat (Schnupperphase) bist du nie allein auf dem Platz: Ein gemeldeter Trainer des Vereins ist immer dabei.",
    "Trainer und Betreuer sind beitragsfrei Mitglied.",
    "Spätestens nach der Schnupperphase braucht der Verein deine Unterlagen.",
    "Los geht’s",
  ],
  person: [
    "Wer bist du?",
    "Vorname",
    "Nachname",
    "Geburtsdatum",
    "Straße und Hausnummer",
    "PLZ",
    "Ort",
    "Handynummer",
    "E-Mail-Adresse",
    "Bitte so, wie es in deinem Personalausweis steht. Damit füllen wir deine Unterlagen aus.",
    "Weiter",
  ],
  einsatz: [
    "Wo bist du im Einsatz?",
    "Abteilung",
    "Fußball",
    "Karneval",
    "Mannschaft",
    "D3-Jugend",
    "Deine Rolle",
    "Trainer",
    "Co-Trainer",
    "Betreuer",
    "Torwarttrainer",
    "Seit wann bist du dabei?",
    "Die Schnupperphase dauert einen Monat. Deine Unterlagen sind spätestens am 02.12.2026 fällig.",
    "Wann kannst du?",
    "Nur zur Planung, nicht verbindlich.",
    "Weiter",
  ],
  notfall: [
    "Wer ist im Notfall für dich da?",
    "Name des Notfallkontakts",
    "Beziehung zu dir",
    "Telefonnummer des Notfallkontakts",
    "Das Kontaktdatenblatt des Vereins fragt danach. Die Angaben gehen erst an den Verein, wenn du die Dateien selbst schickst. Sag der Person bitte Bescheid, dass du sie als Notfallkontakt angibst.",
    "Weiter",
  ],
  erfahrung: [
    "Was bringst du mit?",
    "Beruf oder Tätigkeit",
    "Erfahrung als Trainer oder Betreuer (falls vorhanden)",
    "Erste-Hilfe-Kurs",
    "Ja, absolviert am",
    "Nein, geplant bis",
    "Sonstige Qualifikationen oder Fortbildungen (freiwillig)",
    "Weiter",
  ],
  foto: [
    "Dein Passfoto",
    "Für die internen Vereinsunterlagen. Ein digitales Foto genügt. Bitte von vorne, mit gut sichtbarem Gesicht.",
    "Foto ist gespeichert",
    "Foto ist gespeichert.",
    "Anderes Foto wählen",
    "Foto machen",
    "Foto aus der Galerie wählen",
    "Das Foto geht als eigene Bilddatei mit der E-Mail mit.",
    "Weiter",
  ],
  kodex: [
    "Verhaltenskodex zum Kindeswohl",
    "Der Verhaltenskodex gilt für alle, die im Verein mit Kindern und Jugendlichen arbeiten. Bitte lies ihn in Ruhe.",
    "Verhaltenskodex lesen",
    "Grundsätze",
    "… weitere Grundsätze und Verhaltensregeln im vollständigen Text",
    "Vollständig als PDF öffnen",
    "Aktuelle Fassung des Landessportbundes Hessen.",
    "Ich habe den Verhaltenskodex gelesen und halte mich daran.",
    "Unterschrieben wird später in einem Zug.",
    "Weiter",
    // die ersten zwei Grundsätze, wörtlich aus dem Verhaltenskodex des Landessportbundes Hessen (Abschnitt A, Punkte 1 und 2)
    "Ich achte die Persönlichkeit jedes Kindes, Jugendlichen und jungen Erwachsenen und unterstütze dessen Entwicklung zu einer mündigen Person. Dies hat Vorrang vor meinen eigenen sowie sportlichen oder persönlichen Zielen Dritter (z.B. Eltern, Verein, Verband).",
    "Ich achte das Recht jedes Kindes, Jugendlichen und jungen Erwachsenen auf körperliche Unversehrtheit und Privatsphäre sowie individuelle Grenzen und übe keine Form der Gewalt aus, sei sie physischer, psychischer oder sexualisierter Art, weder im analogen noch im digitalen Raum. Ich bin mir der Verantwortung bewusst und werde meine Position nicht ausnutzen, insbesondere gegenüber Personen, die in einem Abhängigkeitsverhältnis zu mir stehen.",
  ],
  selbstauskunft: [
    "Selbstauskunft zur Kinder- und Jugendarbeit",
    "Der Verein schützt Kinder und Jugendliche. Dafür bitten wir alle neuen Trainer und Betreuer um diese Erklärung.",
    "Ich erkläre:",
    "Ich bin nicht wegen einer Straftat nach den §§ 171, 174 bis 174c, 176 bis 180a, 181a, 182 bis 184g, 184i, 184j, 184k, 184l, 201a Absatz 3, 225, 232 bis 233a, 234, 235 oder 236 des Strafgesetzbuchs (Straftaten nach § 72a Absatz 1 Satz 1 SGB VIII) rechtskräftig verurteilt.",
    "Gegen mich läuft wegen einer dieser Straftaten kein Ermittlungs- oder Strafverfahren.",
    "Wird gegen mich ein solches Verfahren eingeleitet oder werde ich verurteilt, teile ich das dem Vorstand des Vereins unverzüglich mit.",
    "Diese Erklärung ersetzt das erweiterte Führungszeugnis nicht.",
    "Das trifft auf mich zu.",
    "Weiter",
  ],
  zeugnis: [
    "Dein erweitertes Führungszeugnis",
    "Alle Trainer und Betreuer legen ein erweitertes Führungszeugnis vor. So steht es im Schutzkonzept des Vereins.",
    "Ich muss es noch beantragen",
    "Ich habe schon ein aktuelles erweitertes Führungszeugnis",
    "Antrag auf Gebührenbefreiung",
    "Für ehrenamtliche Trainer ist das erweiterte Führungszeugnis gebührenfrei (sonst 13 Euro). Der Verein bestätigt dir dazu schriftlich: Du bist ehrenamtlich für unseren gemeinnützigen Verein tätig, und er verlangt das Zeugnis von dir. Wir füllen den Antrag mit deinen Angaben aus.",
    "Antrag ansehen",
    "So geht es weiter",
    "Der Verein unterschreibt den Antrag und schickt ihn dir zurück.",
    "Mit dem unterschriebenen Antrag gehst du persönlich in ein Bürgeramt an deinem Wohnort (Ausweis mitbringen). Oder du beantragst das Zeugnis online beim Bundesamt für Justiz (fuehrungszeugnis.bund.de). Dafür brauchst du den Online-Ausweis, und du lädst den Antrag dort hoch.",
    "Das Zeugnis kommt per Post zu dir nach Hause. Beantragst du es online, kannst du es auf Wunsch digital als PDF bekommen.",
    "Das Zeugnis, auch das digitale, lädst du nirgends hoch und schickst es nicht per E-Mail. Du zeigst es nur persönlich.",
    "Weiter",
  ],
  unterschriften: [
    "Unterschreiben",
    "Mit deiner Unterschrift bestätigst du die Anmeldung, das Kontaktdatenblatt, den Verhaltenskodex und die Selbstauskunft.",
    "Deine Unterschrift",
    "Unterschrift löschen",
    "Ort und Datum: Frankfurt am Main, 23.11.2026",
    "Ich habe die Satzung zur Kenntnis genommen.",
    "Satzung lesen",
    "Weiter",
  ],
  pruefen: [
    "Du",
    "Name",
    "Geboren",
    "Adresse",
    "Handy",
    "E-Mail",
    "Einsatz",
    "Abteilung",
    "Mannschaft",
    "Rolle",
    "Dabei seit",
    "Wann kannst du",
    "Notfall",
    "Notfallkontakt",
    "Erfahrung",
    "Beruf",
    "Erste Hilfe",
    "Unterlagen",
    "Passfoto",
    "Foto ist gespeichert",
    "Verhaltenskodex",
    "Gelesen",
    "Selbstauskunft",
    "Bestätigt",
    "Führungszeugnis",
    "Unterschrift",
    "Satzung",
    "Ja",
    "Stimmt alles?",
    "Prüfe deine Angaben. Mit „Ändern“ korrigierst du etwas.",
    "Antrag auf Gebührenbefreiung",
    "Das solltest du wissen",
    "Alles stimmt – Dateien erstellen",
    "Alle Angaben löschen",
    // Werte aus den Beispieldaten
    "Max Mustermann",
    "14.03.1988",
    "Musterstraße 12, 60326 Frankfurt am Main",
    "0170 1234567",
    "max.mustermann@example.com",
    "D3-Jugend",
    "Co-Trainer",
    "02.11.2026",
    "Dienstag, Donnerstag, Samstag",
    "Erika Mustermann, Partnerin, 0170 7654321",
    "Elektriker",
    "Drei Jahre Jugendtrainer bei einem anderen Verein (E-Jugend).",
    "Ja, absolviert am 12.05.2025",
  ],
  fertig: [
    "Dein Paket ist fertig",
    "Das steht im Paket",
    "Dateien teilen",
    "Dateien herunterladen",
    "Vorschau",
    "So schickst du die Dateien an den Verein",
    "Tippe oben auf „Dateien teilen“.",
    "Wähle dein Mail-Programm.",
    "Schicke die E-Mail an die Adresse unten.",
    "Klicke oben auf „Dateien herunterladen“.",
    "Schreibe eine neue E-Mail. Hänge die Dateien an.",
    "Adresse kopieren",
    "E-Mail an die Geschäftsstelle öffnen",
    "Bitte schicke die Dateien nicht per WhatsApp. Sie enthalten persönliche Daten.",
    "So geht es weiter",
    "Verein: Unterschreibt deinen Antrag auf Gebührenbefreiung und schickt ihn dir zurück.",
    "Du: Beantragst damit dein Führungszeugnis.",
    "Bis zum 02.12.2026 sollte alles erledigt sein: Dateien geschickt, Zeugnis gezeigt.",
    "Alle Angaben löschen",
    "Alles bleibt auf deinem Gerät, bis du die Dateien selbst schickst. Die Seite sendet nichts.",
    // Dateinamen und Beschreibungen zeigt die Seite genau so, wie trainer-pdf.js sie zurückgibt: Sie werden gegen die Rückgabe der Attrappe
    // bzw. des echten Moduls verglichen (siehe [9]), nicht gegen feste Zeichenketten.
    MAIL,
  ],
};

// Die Sätze mit den Einsichtnehmenden nach GEMEINSAM.md Abschnitt 3 (pronomenfrei; nur der Namensteil wechselt), unabhängig von
// trainer-einsicht.js aufgeschrieben: lang = mit Funktion, kurz = ohne.
function einsichtErwartet(personen) {
  const verbinde = (teile) => (teile.length === 1 ? teile[0] : teile.slice(0, -1).join(", ") + " oder " + teile[teile.length - 1]);
  const lang = personen.length ? verbinde(personen.map((p) => `${p.name} (${p.funktion})`)) : "dem Vorstand";
  const kurz = personen.length ? verbinde(personen.map((p) => p.name)) : "dem Vorstand";
  return {
    lang,
    kurz,
    schritt10: `Du zeigst das Zeugnis persönlich ${lang}. Das Zeugnis wird nur angeschaut: Es wird nicht mitgenommen und nicht kopiert. Notiert werden nur: Datum der Einsicht, Datum des Zeugnisses und ob eine einschlägige Verurteilung darin steht (ja oder nein).`,
    kasten12: `Dein Führungszeugnis bringst du persönlich zu ${kurz}. Es wird nicht abgegeben.`,
    schritt13: `Du: Zeigst es persönlich ${kurz}.`,
  };
}

// ---------- Prüfregeln in Node (trainer-regeln.js, ohne Browser) ----------

async function pruefeRegelnInNode() {
  const R = await import(pathToFileURL(path.join(JS_ORDNER, "trainer-regeln.js")).href);
  const T = (await import(pathToFileURL(path.join(JS_ORDNER, "texte", "trainer-de.js")).href)).default;
  const konfig = testKonfig(EINSICHT.eine);
  const gut = () => ({ ...R.neueAntworten(), ...JSON.parse(JSON.stringify(BEISPIEL)) });
  const ctxVoll = () => ({ heute: HEUTE, roh: {}, medien: { foto: new Uint8Array([255, 216, 255]), unterschrift: new Uint8Array([137, 80, 78, 71]) }, konfig, zugang: {} });
  const fehlt = [];
  let faelle = 0;
  // Ein Fall: Seite, Änderung an den Antworten (und am Kontext), erwartete Felder und Meldungen (oder [] für „keine Fehler“)
  const fall = (name, seite, aendere, erwartet, kontext) => {
    faelle += 1;
    const a = gut();
    const c = ctxVoll();
    if (aendere) aendere(a, c);
    const ist = R.pruefeSeite(seite, a, kontext ? { ...c, ...kontext(c) } : c);
    const sollFelder = erwartet.map((e) => e.feld);
    const istFelder = ist.map((e) => e.feld);
    let ok = gleich(sollFelder, istFelder);
    for (const e of erwartet) {
      const gefunden = ist.find((x) => x.feld === e.feld);
      if (e.meldung && (!gefunden || gefunden.meldung !== e.meldung)) ok = false;
    }
    if (!ok) fehlt.push(`${name}: erwartet ${JSON.stringify(erwartet)}, ist ${JSON.stringify(ist)}`);
  };
  const M = T.fehler;
  // gültige Beispieldaten: keine Fehler auf jeder Seite
  for (const s of ["person", "einsatz", "notfall", "erfahrung", "foto", "kodex", "selbstauskunft", "zeugnis", "unterschriften", "pruefen", "fertig", "start"]) fall("gültig " + s, s, null, []);
  // person
  fall("person: unter 18 (heute minus 17 Jahre)", "person", (a) => { a.geburtsdatum = "2009-11-24"; }, [{ feld: "geburtsdatum", meldung: M.unter18 }]);
  fall("person: genau 18 am Stichtag", "person", (a) => { a.geburtsdatum = "2008-11-23"; }, []);
  fall("person: PLZ mit vier Ziffern", "person", (a) => { a.anschrift.plz = "6032"; }, [{ feld: "anschrift.plz", meldung: M.plz }]);
  fall("person: PLZ mit Buchstaben", "person", (a) => { a.anschrift.plz = "6O326"; }, [{ feld: "anschrift.plz", meldung: M.plz }]);
  fall("person: E-Mail ohne Punkt", "person", (a) => { a.email = "max@example"; }, [{ feld: "email", meldung: M.email }]);
  fall("person: E-Mail mit Leerzeichen", "person", (a) => { a.email = "max mustermann@example.com"; }, [{ feld: "email", meldung: M.email }]);
  fall("person: Handy zu kurz", "person", (a) => { a.handy = "12345"; }, [{ feld: "handy", meldung: M.nummerKurz }]);
  fall("person: Handy mit Buchstaben", "person", (a) => { a.handy = "0170 abc 1234"; }, [{ feld: "handy", meldung: M.nummerZeichen }]);
  fall("person: Handy leer", "person", (a) => { a.handy = ""; }, [{ feld: "handy", meldung: M.handy }]);
  fall("person: Handy mit + - / und Leerzeichen", "person", (a) => { a.handy = "+49 170/123-4567"; }, []);
  fall("person: Vorname leer", "person", (a) => { a.vorname = "  "; }, [{ feld: "vorname", meldung: M.vorname }]);
  fall("person: Name in arabischer Schrift", "person", (a) => { a.nachname = "محمد"; }, [{ feld: "nachname", meldung: M.lateinisch }]);
  fall("person: Datum unvollständig (Rohtext)", "person", (a) => { a.geburtsdatum = null; }, [{ feld: "geburtsdatum", meldung: M.datumUnvollstaendig }], () => ({ roh: { geburtsdatum: { t: "14", m: "", j: "1988" } } }));
  fall("person: Datum gibt es nicht (31.02.)", "person", (a) => { a.geburtsdatum = null; }, [{ feld: "geburtsdatum", meldung: M.datumUngueltig }], () => ({ roh: { geburtsdatum: { t: "31", m: "02", j: "1988" } } }));
  // einsatz
  fall("einsatz: keine Abteilung", "einsatz", (a) => { a.abteilung = null; a.mannschaft = ""; a.rolle = null; }, [{ feld: "abteilung", meldung: M.abteilung }]);
  fall("einsatz: keine Mannschaft", "einsatz", (a) => { a.mannschaft = ""; }, [{ feld: "mannschaft", meldung: M.mannschaft }]);
  fall("einsatz: Mannschaft der anderen Abteilung", "einsatz", (a) => { a.abteilung = "karneval"; }, [{ feld: "mannschaft", meldung: M.gruppe }]);
  fall("einsatz: Torwarttrainer im Karneval", "einsatz", (a) => { a.abteilung = "karneval"; a.mannschaft = GRUPPEN_KARNEVAL[0]; a.rolle = "torwarttrainer"; }, [{ feld: "rolle", meldung: M.rolle }]);
  fall("einsatz: Karneval mit Gruppe und Trainer", "einsatz", (a) => { a.abteilung = "karneval"; a.mannschaft = GRUPPEN_KARNEVAL[0]; a.rolle = "trainer"; }, []);
  fall("einsatz: keine Rolle", "einsatz", (a) => { a.rolle = null; }, [{ feld: "rolle", meldung: M.rolle }]);
  fall("einsatz: „Seit wann“ vier Monate in der Zukunft", "einsatz", (a) => { a.seit = "2027-03-24"; }, [{ feld: "seit", meldung: M.seitZuSpaet }]);
  fall("einsatz: „Seit wann“ genau drei Monate in der Zukunft", "einsatz", (a) => { a.seit = "2027-02-23"; }, []);
  fall("einsatz: „Seit wann“ vor Jahren", "einsatz", (a) => { a.seit = "2019-09-01"; }, []);
  fall("einsatz: „Seit wann“ leer", "einsatz", (a) => { a.seit = null; }, [{ feld: "seit", meldung: M.datumLeer }]);
  fall("einsatz: Tage sind keine Pflicht", "einsatz", (a) => { a.tage = []; }, []);
  // notfall
  fall("notfall: Name leer", "notfall", (a) => { a.notfall.name = ""; }, [{ feld: "notfall.name", meldung: M.notfallName }]);
  fall("notfall: Beziehung leer", "notfall", (a) => { a.notfall.beziehung = ""; }, [{ feld: "notfall.beziehung", meldung: M.notfallBeziehung }]);
  fall("notfall: Telefon zu kurz", "notfall", (a) => { a.notfall.telefon = "0170"; }, [{ feld: "notfall.telefon", meldung: M.nummerKurz }]);
  fall("notfall: Telefon leer", "notfall", (a) => { a.notfall.telefon = ""; }, [{ feld: "notfall.telefon", meldung: M.notfallTelefon }]);
  // erfahrung
  fall("erfahrung: Beruf leer", "erfahrung", (a) => { a.beruf = ""; }, [{ feld: "beruf", meldung: M.beruf }]);
  fall("erfahrung: Erfahrung und Sonstiges leer", "erfahrung", (a) => { a.erfahrung = ""; a.sonstiges = ""; }, []);
  fall("erfahrung: keine Antwort zum Kurs", "erfahrung", (a) => { a.ersteHilfe = null; a.ersteHilfeAm = null; }, [{ feld: "ersteHilfe", meldung: M.ersteHilfe }]);
  fall("erfahrung: „ja“ mit Datum in der Zukunft", "erfahrung", (a) => { a.ersteHilfeAm = null; }, [{ feld: "ersteHilfeAm", meldung: M.datumZukunft }], () => ({ roh: { ersteHilfeAm: { t: "12", m: "05", j: "2027" } } }));
  fall("erfahrung: „ja“ ohne Datum", "erfahrung", (a) => { a.ersteHilfeAm = null; }, [{ feld: "ersteHilfeAm", meldung: M.datumLeer }]);
  fall("erfahrung: „nein“ mit geplantem Datum", "erfahrung", (a) => { a.ersteHilfe = "nein"; a.ersteHilfeAm = null; a.ersteHilfeBis = "2026-12-15"; }, []);
  fall("erfahrung: „nein“ mit Datum in der Vergangenheit", "erfahrung", (a) => { a.ersteHilfe = "nein"; a.ersteHilfeAm = null; a.ersteHilfeBis = "2026-10-01"; }, [{ feld: "ersteHilfeBis", meldung: M.datumVergangenheit }]);
  fall("erfahrung: „nein“ ohne Datum", "erfahrung", (a) => { a.ersteHilfe = "nein"; a.ersteHilfeAm = null; }, [{ feld: "ersteHilfeBis", meldung: M.datumLeer }]);
  // foto, kodex, selbstauskunft, zeugnis, unterschriften
  fall("foto: kein Foto", "foto", (a, c) => { c.medien.foto = null; }, [{ feld: "foto", meldung: M.foto }]);
  fall("foto: leere Bytes", "foto", (a, c) => { c.medien.foto = new Uint8Array(0); }, [{ feld: "foto", meldung: M.foto }]);
  fall("kodex: nicht angekreuzt", "kodex", (a) => { a.kodexGelesen = false; }, [{ feld: "kodexGelesen", meldung: M.kodex }]);
  fall("selbstauskunft: nicht angekreuzt", "selbstauskunft", (a) => { a.selbstauskunft = false; }, [{ feld: "selbstauskunft", meldung: M.selbstauskunft }]);
  fall("zeugnis: keine Wahl", "zeugnis", (a) => { a.zeugnis = null; }, [{ feld: "zeugnis", meldung: M.zeugnis }]);
  fall("zeugnis: schon vorhanden", "zeugnis", (a) => { a.zeugnis = "vorhanden"; }, []);
  fall("unterschriften: keine Unterschrift", "unterschriften", (a, c) => { c.medien.unterschrift = null; }, [{ feld: "unterschrift", meldung: M.unterschrift }]);
  fall("unterschriften: Satzung nicht angekreuzt", "unterschriften", (a) => { a.satzung = false; }, [{ feld: "satzung", meldung: M.satzung }]);
  fall("unterschriften: beides fehlt (Reihenfolge wie im Dokument)", "unterschriften", (a, c) => { a.satzung = false; c.medien.unterschrift = null; }, [{ feld: "unterschrift", meldung: M.unterschrift }, { feld: "satzung", meldung: M.satzung }]);
  // code
  fall("code: leer", "code", null, [{ feld: "code", meldung: T.code.fehlerLeer }], () => ({ zugang: { eingabe: "  - ", geprueft: "", gueltig: false } }));
  fall("code: nicht geprüft", "code", null, [{ feld: "code", meldung: T.code.fehlerFalsch }], () => ({ zugang: { eingabe: "ABC", geprueft: "", gueltig: false } }));
  fall("code: geprüft für anderen Text", "code", null, [{ feld: "code", meldung: T.code.fehlerFalsch }], () => ({ zugang: { eingabe: "ABC", geprueft: "XYZ", gueltig: true } }));
  fall("code: gültig (Schreibweise egal)", "code", null, [], () => ({ zugang: { eingabe: "ab-c d", geprueft: "ABCD", gueltig: true } }));
  // Ohne Namen in der Konfiguration ist die Mannschaft ein freier Text
  fall("einsatz: freier Text ohne Liste, leer", "einsatz", (a, c) => { a.abteilung = "karneval"; a.mannschaft = ""; a.rolle = "trainer"; c.konfig = testKonfig(EINSICHT.eine, (k) => { k.mannschaften = []; }); }, [{ feld: "mannschaft", meldung: M.gruppe }]);
  fall("einsatz: freier Text ohne Liste, ausgefüllt", "einsatz", (a, c) => { a.abteilung = "karneval"; a.mannschaft = "Tanzmäuse"; a.rolle = "trainer"; c.konfig = testKonfig(EINSICHT.eine, (k) => { k.mannschaften = []; }); }, []);

  // Datumshilfen
  const rechnen = [
    ["alterInJahren 14.03.1988 am 23.11.2026", R.alterInJahren("1988-03-14", HEUTE), 38],
    ["alterInJahren am Tag vor dem 18. Geburtstag", R.alterInJahren("2008-11-24", HEUTE), 17],
    ["alterInJahren am 18. Geburtstag", R.alterInJahren("2008-11-23", HEUTE), 18],
    ["alterInJahren ohne Datum", R.alterInJahren(null, HEUTE), null],
    ["plusMonate 02.11. + 1", R.plusMonate("2026-11-02", 1), "2026-12-02"],
    ["plusMonate 31.01. + 1 (Monatsende)", R.plusMonate("2026-01-31", 1), "2026-02-28"],
    ["plusMonate 15.12. + 1 (Jahreswechsel)", R.plusMonate("2026-12-15", 1), "2027-01-15"],
    ["plusMonate 30.11. + 3", R.plusMonate("2026-11-30", 3), "2027-02-28"],
    ["fristVon (zwei Monate)", R.fristVon("2026-11-02", { schnupperMonate: 2 }), "2027-01-02"],
    ["fristVon (ohne Angabe: ein Monat)", R.fristVon("2026-11-02", {}), "2026-12-02"],
    ["datumText", R.datumText("2026-12-02"), "02.12.2026"],
    ["datumText ohne Datum", R.datumText(null), ""],
    ["nummerProblem leer", R.nummerProblem(" "), "leer"],
    ["nummerProblem Zeichen", R.nummerProblem("0170(123)456"), "zeichen"],
    ["nummerProblem fünf Ziffern", R.nummerProblem("+49 12"), "kurz"],
    ["nummerProblem in Ordnung", R.nummerProblem("069/123456"), null],
    // Einzelregeln und Konstanten (Vorgaben aus dem Auftrag: PLZ fünf Ziffern, E-Mail-Format, mindestens 18 Jahre, höchstens drei Monate voraus)
    ["pruefePlz fünf Ziffern", [R.pruefePlz("60326"), R.pruefePlz(" 60326 ")], [true, true]],
    ["pruefePlz falsch (4 Ziffern, 6 Ziffern, Buchstabe, leer)", [R.pruefePlz("6032"), R.pruefePlz("603261"), R.pruefePlz("6032a"), R.pruefePlz("")], [false, false, false, false]],
    ["pruefeEmail in Ordnung", [R.pruefeEmail("max.mustermann@example.com"), R.pruefeEmail("a@b.de")], [true, true]],
    ["pruefeEmail falsch (ohne Punkt, doppeltes @, Leerzeichen, 1 Zeichen nach dem Punkt, leer)", [R.pruefeEmail("max@example"), R.pruefeEmail("max@@example.com"), R.pruefeEmail("max mustermann@example.com"), R.pruefeEmail("a@b.d"), R.pruefeEmail("")], [false, false, false, false, false]],
    ["datumProblem leer", R.datumProblem({ t: "", m: "", j: "" }, null, HEUTE, { zukunftErlaubt: false }), "datumLeer"],
    ["datumProblem unvollständig (ohne Monat)", R.datumProblem({ t: "14", m: "", j: "1988" }, null, HEUTE, { zukunftErlaubt: false }), "datumUnvollstaendig"],
    ["datumProblem ungültig (31.02.)", R.datumProblem({ t: "31", m: "02", j: "1988" }, null, HEUTE, { zukunftErlaubt: false }), "datumUngueltig"],
    ["datumProblem Zukunft (morgen)", R.datumProblem({ t: "24", m: "11", j: "2026" }, null, HEUTE, { zukunftErlaubt: false }), "datumZukunft"],
    ["datumProblem Zukunft erlaubt (morgen)", R.datumProblem({ t: "24", m: "11", j: "2026" }, null, HEUTE, { zukunftErlaubt: true }), null],
    ["datumProblem zu alt (1899)", R.datumProblem({ t: "01", m: "01", j: "1899" }, null, HEUTE, { zukunftErlaubt: false }), "datumZuAlt"],
    ["datumProblem in Ordnung", R.datumProblem({ t: "14", m: "03", j: "1988" }, "1988-03-14", HEUTE, { zukunftErlaubt: false }), null],
    ["datumProblem gespeicherter Wert ohne Rohtext", R.datumProblem(undefined, "1988-03-14", HEUTE, { zukunftErlaubt: false }), null],
    ["Konstanten: Mindestalter 18, höchstens 3 Monate voraus", [R.MIN_ALTER, R.MAX_MONATE_VORAUS], [18, 3]],
    ["PRUEF_SEITEN in der Reihenfolge des Ablaufs", R.PRUEF_SEITEN, ["person", "einsatz", "notfall", "erfahrung", "foto", "kodex", "selbstauskunft", "zeugnis", "unterschriften"]],
    ["mannschaftenFuer Karneval", R.mannschaftenFuer(konfig, "karneval"), GRUPPEN_KARNEVAL],
    ["mannschaftenFuer ohne Konfiguration", R.mannschaftenFuer(null, "fussball"), []],
    ["abteilungenFuer ohne Konfiguration (beide)", R.abteilungenFuer(null), ["fussball", "karneval"]],
    ["abteilungenFuer nur Fußball", R.abteilungenFuer({ abteilungen: ["fussball"] }), ["fussball"]],
    ["abteilungenFuer: unbekannte und doppelte Werte fallen weg", R.abteilungenFuer({ abteilungen: ["karneval", "handball", "karneval"] }), ["karneval"]],
    ["abteilungenFuer: leere Liste (beide)", R.abteilungenFuer({ abteilungen: [] }), ["fussball", "karneval"]],
    ["Einsatz: Abteilung Karneval ist bei „nur Fußball“ ein Fehler an „abteilung“", (() => { const a = gut(); a.abteilung = "karneval"; a.mannschaft = GRUPPEN_KARNEVAL[0]; a.rolle = "trainer"; const c = ctxVoll(); c.konfig = { ...c.konfig, abteilungen: ["fussball"] }; return R.pruefeSeite("einsatz", a, c).map((f) => f.feld); })(), ["abteilung"]],
    ["Einsatz: Abteilung Fußball ist bei „nur Fußball“ in Ordnung", (() => { const a = gut(); const c = ctxVoll(); c.konfig = { ...c.konfig, abteilungen: ["fussball"] }; return R.pruefeSeite("einsatz", a, c).length; })(), 0],
    ["ersteOffeneSeite (alles gut)", R.ersteOffeneSeite(gut(), ctxVoll()), null],
    ["ersteOffeneSeite (Notfall leer)", (() => { const a = gut(); a.notfall.name = ""; const r = R.ersteOffeneSeite(a, ctxVoll()); return r && r.seite; })(), "notfall"],
  ];
  const rechenFehler = rechnen.filter(([, ist, soll]) => !gleich(ist, soll)).map(([n, ist, soll]) => `${n}: ${JSON.stringify(ist)} statt ${JSON.stringify(soll)}`);
  return { faelle, fehlt, rechnen: rechnen.length, rechenFehler };
}

// ---------- Server (nur diese Prüfung, nur 127.0.0.1) ----------

const MIME = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2",
  ".ttf": "font/ttf", ".pdf": "application/pdf", ".txt": "text/plain; charset=utf-8",
};

// site.css wie tools/build.mjs (baueCssBuendel): tokens, fonts, base, komponenten (der Bau minifiziert nur)
function siteCss() {
  return ["tokens.css", "fonts.css", "base.css", "komponenten.css"].map((d) => fs.readFileSync(path.join(ROOT, "assets", "css", d), "utf8")).join("\n");
}

// Attrappe für trainer-pdf.js: zeichnet die übergebenen Daten auf (window.__attrappe) und gibt Beispieldateien zurück.
const ATTRAPPE = `
import { dateiteil } from "./hilfen.js";
const PDF = new TextEncoder().encode("%PDF-1.4\\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]>>endobj\\ntrailer<</Root 1 0 R>>\\n%%EOF\\n");
const WARNUNGEN = [];
const stand = (window.__attrappe = window.__attrappe || { erzeugt: [], vorschauen: [] });
const bytesInfo = (b) => (b ? { typ: Object.prototype.toString.call(b), laenge: b.length, kopf: Array.from(b.slice(0, 8)) } : null);
export async function erzeugeDateien(arg) {
  stand.erzeugt.push({
    antworten: JSON.parse(JSON.stringify(arg.antworten)),
    medien: { schluessel: Object.keys(arg.medien).sort(), foto: bytesInfo(arg.medien.foto), unterschrift: bytesInfo(arg.medien.unterschrift) },
    konfigSchluessel: Object.keys(arg.konfig).sort(),
    heute: arg.heute,
    schluessel: Object.keys(arg).sort(),
  });
  await new Promise((ok) => setTimeout(ok, 120));
  const teil = dateiteil(arg.antworten.nachname) + "_" + dateiteil(arg.antworten.vorname);
  // Beschreibungen wie im echten Modul (T2); die Seite zeigt, was zurückkommt
  const dateien = [{ name: "Trainerunterlagen_" + teil + ".pdf", typ: "application/pdf", bytes: PDF, beschreibung: "Deckblatt, Anmeldung, Kontaktdatenblatt, Selbstauskunft, Verhaltenskodex, Datenschutzinformation" }];
  if (arg.antworten.zeugnis === "beantragen") dateien.push({ name: "Antrag_Gebuehrenbefreiung_" + teil + ".pdf", typ: "application/pdf", bytes: PDF, beschreibung: "Antrag für dein Führungszeugnis" });
  dateien.push({ name: "Passfoto_" + teil + ".jpg", typ: "image/jpeg", bytes: arg.medien.foto, beschreibung: "Dein Passfoto" });
  const ergebnis = { dateien, warnungen: WARNUNGEN };
  stand.erzeugt[stand.erzeugt.length - 1].zurueck = { dateien: dateien.map((d) => ({ name: d.name, typ: d.typ, beschreibung: d.beschreibung })), warnungen: WARNUNGEN.length };
  return ergebnis;
}
export async function vorschauAntrag(arg) {
  stand.vorschauen.push({ antworten: JSON.parse(JSON.stringify(arg.antworten)), schluessel: Object.keys(arg).sort(), heute: arg.heute, mitMedien: "medien" in arg });
  await new Promise((ok) => setTimeout(ok, 80));
  return PDF;
}
`;

// Attrappe, die Warnungen zurückgibt (Zeichen außerhalb der Schrift): wie trainer-pdf.js › warnungen
const ATTRAPPE_WARNT = ATTRAPPE.replace("const WARNUNGEN = [];", 'const WARNUNGEN = ["Zeichen einer Angabe fehlt in der Schrift (steht als ? in der Datei): Test"];');

// Modul, das mit der Art wirft, die der Test vorher in window.__naechsteArt legt (leer: arbeitet wie die Attrappe): für die Meldungen je Art
const WIRFT_ART = ATTRAPPE.replace("export async function erzeugeDateien(arg) {", `export async function erzeugeDateien(arg) {
  if (window.__naechsteArt) { const f = new Error("Test: " + window.__naechsteArt); f.art = window.__naechsteArt === "ohne" ? undefined : window.__naechsteArt; throw f; }`);

// Modul, das beim Erstellen scheitert (Art wie pdf-lader.js › LadeFehler)
const WIRFT = `
export async function erzeugeDateien() { const f = new Error("Test: Bibliothek fehlt"); f.art = "bibliothek"; throw f; }
export async function vorschauAntrag() { const f = new Error("Test: Bibliothek fehlt"); f.art = "bibliothek"; throw f; }
`;

// Modul, das nur beim ersten Erstellen scheitert (danach wie die Attrappe): für „Noch einmal versuchen“
const WIRFT_EINMAL = ATTRAPPE.replace("export async function erzeugeDateien(arg) {", `export async function erzeugeDateien(arg) {
  window.__einmal = (window.__einmal || 0) + 1;
  if (window.__einmal === 1) { const f = new Error("Test: Bibliothek fehlt"); f.art = "bibliothek"; throw f; }`);

// Anhang für das echte trainer-pdf.js (nur im Test): zeichnet auf, was erzeugeDateien zurückgibt (window.__echt), ohne den Ablauf zu ändern.
const SPION = `
;try {
  const __orig = erzeugeDateien;
  erzeugeDateien = async function (arg) {
    const r = await __orig(arg);
    const stand = (window.__echt = window.__echt || { erzeugt: [] });
    stand.erzeugt.push({ dateien: r.dateien.map((d) => ({ name: d.name, typ: d.typ, beschreibung: d.beschreibung, laenge: d.bytes.length, kopf: Array.from(d.bytes.slice(0, 5)) })), warnungen: r.warnungen || [] });
    return r;
  };
} catch (e) { /* ohne Aufzeichnung */ }
`;

// anfragen: Pfade aller Anfragen; dest: je Anfrage Pfad, Kopfzeile Sec-Fetch-Dest (script für Module und <script>, empty für fetch) und Status
const server = { http: null, pdfModus: "attrappe", anfragen: [], dest: [] };

const htmlText = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function seitenHtml(konfig, T) {
  const json = JSON.stringify(konfig).replace(/</g, "\\u003c");
  // „Ladefehler“ wie src/begleit/trainerteam.mjs: Text mit der Adresse der Geschäftsstelle (oder „die Geschäftsstelle“)
  const mail = konfig.verein && konfig.verein.mail ? konfig.verein.mail : "die Geschäftsstelle";
  const ladefehler = htmlText(T.seite.ladefehler.split("{mail}").join(mail));
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${T.seite.titel}</title>
<link rel="icon" href="data:,">
<link rel="stylesheet" href="/assets/css/site.css">
<link rel="stylesheet" href="/assets/css/anmeldung.css">
<link rel="stylesheet" href="/assets/css/trainer.css">
<script type="module">
// wie src/begleit/trainerteam.mjs › STARTSKRIPT: scheitert etwas beim Laden (auch trainer-pdf.js, das statisch an trainer.js hängt), steht
// der Text „Ladefehler“ da und nicht ein leerer Bildschirm
(async () => {
  const wurzel = document.getElementById("anmeldung");
  try {
    const { startTrainer } = await import("/assets/js/anmeldung/trainer.js");
    await startTrainer(wurzel, JSON.parse(document.getElementById("trainer-konfig").textContent));
  } catch (fehler) {
    console.error("Trainerseite: Start fehlgeschlagen", fehler);
    wurzel.textContent = wurzel.getAttribute("data-ladefehler") || "";
  }
})();
</script>
</head>
<body class="ws">
<main id="inhalt">
<section class="abschnitt seitenkopf">
  <div class="container">
    <div class="anm-titelzeile">
      <h1>${T.seite.h1}</h1>
    </div>
    <p class="seitenkopf__lead">${T.seite.lead}</p>
  </div>
</section>
<section class="abschnitt anm-assistent-abschnitt" aria-labelledby="anm-assistent-titel">
  <div class="container">
    <h2 class="sr-only" id="anm-assistent-titel">${T.seite.assistentTitel}</h2>
    <div class="anm" id="anmeldung" data-anm-wurzel data-ladefehler="${ladefehler}"></div>
  </div>
</section>
</main>
<footer class="ws-fuss"><div><p>Testseite für den Ende-zu-Ende-Test (nicht Teil des Baus)</p></div></footer>
<script type="application/json" id="trainer-konfig">${json}</script>
</body>
</html>`;
}

async function starteServer(T) {
  const css = siteCss();
  const assets = path.join(ROOT, "assets");
  server.http = http.createServer((req, res) => {
    try {
      const url = new URL(req.url, BASIS);
      const pfad = decodeURIComponent(url.pathname);
      server.anfragen.push(pfad);
      const aufzeichnung = { pfad, methode: req.method, dest: req.headers["sec-fetch-dest"] || "", status: null };
      server.dest.push(aufzeichnung);
      res.on("finish", () => {
        aufzeichnung.status = res.statusCode;
      });
      // Seiten: /<variante>/ (jede mit der Konfiguration der Variante)
      const seite = /^\/([a-z0-9]+)\/(?:index\.html)?$/.exec(pfad);
      if (seite && VARIANTEN[seite[1]]) {
        res.writeHead(200, { "Content-Type": MIME[".html"], "Cache-Control": "no-store" }).end(seitenHtml(VARIANTEN[seite[1]](), T));
        return;
      }
      if (pfad === "/assets/css/site.css") {
        res.writeHead(200, { "Content-Type": MIME[".css"] }).end(css);
        return;
      }
      if (pfad === "/assets/js/anmeldung/trainer-pdf.js") {
        const modus = server.pdfModus;
        if (modus === "attrappe") res.writeHead(200, { "Content-Type": MIME[".js"], "Cache-Control": "no-store" }).end(ATTRAPPE);
        else if (modus === "wirft") res.writeHead(200, { "Content-Type": MIME[".js"], "Cache-Control": "no-store" }).end(WIRFT);
        else if (modus === "wirft-einmal") res.writeHead(200, { "Content-Type": MIME[".js"], "Cache-Control": "no-store" }).end(WIRFT_EINMAL);
        else if (modus === "wirft-art") res.writeHead(200, { "Content-Type": MIME[".js"], "Cache-Control": "no-store" }).end(WIRFT_ART);
        else if (modus === "warnt") res.writeHead(200, { "Content-Type": MIME[".js"], "Cache-Control": "no-store" }).end(ATTRAPPE_WARNT);
        // nicht erreichbar (wie ein Netz oder Server, der gerade nicht antwortet): scheitert das Laden der Seite beim Start
        else if (modus === "503") res.writeHead(503, { "Content-Type": "text/plain", "Cache-Control": "no-store" }).end("nicht erreichbar");
        else if (modus === "echt" && fs.existsSync(path.join(JS_ORDNER, "trainer-pdf.js"))) res.writeHead(200, { "Content-Type": MIME[".js"], "Cache-Control": "no-store" }).end(fs.readFileSync(path.join(JS_ORDNER, "trainer-pdf.js")) + SPION);
        else res.writeHead(404, { "Cache-Control": "no-store" }).end("nicht gefunden");
        return;
      }
      if (pfad.startsWith("/assets/")) {
        const datei = path.join(assets, pfad.slice("/assets/".length));
        if (!datei.startsWith(assets + path.sep) || !fs.existsSync(datei) || fs.statSync(datei).isDirectory()) {
          res.writeHead(404).end("nicht gefunden");
          return;
        }
        res.writeHead(200, { "Content-Type": MIME[path.extname(datei)] || "application/octet-stream", "Cache-Control": "no-store" }).end(fs.readFileSync(datei));
        return;
      }
      res.writeHead(404).end("nicht gefunden");
    } catch (fehler) {
      res.writeHead(500).end(String(fehler));
    }
  });
  await new Promise((ok, fehler) => {
    server.http.once("error", fehler);
    server.http.listen(PORT, "127.0.0.1", ok);
  });
}

// ---------- Browser und Seite ----------

const UHR = `(() => {
  const feste = new Date("${HEUTE}T10:00:00").getTime();
  const Echt = Date;
  class Uhr extends Echt {
    constructor(...a) { if (a.length === 0) super(feste); else super(...a); }
    static now() { return feste; }
  }
  window.Date = Uhr;
})();`;

// Stellvertreter für Teilen, Zwischenablage und neue Fenster; sie zeichnen die Aufrufe auf (window.__stub). Optionen: teilen ("ja" | "nein" |
// "fehler" | "abbruch"), zwischenablage ("ja" | "nein").
const stubs = (o) => `(() => {
  const s = (window.__stub = { share: [], canShare: [], schreibe: [], oeffne: [], reihenfolge: [] });
  const teilen = ${JSON.stringify(o.teilen || "ja")};
  const zwischen = ${JSON.stringify(o.zwischenablage || "ja")};
  if (teilen !== "nein") {
    navigator.canShare = (d) => { s.canShare.push(!!(d && d.files && d.files.length)); return !!(d && d.files && d.files.length); };
    navigator.share = async (d) => {
      s.reihenfolge.push("share");
      s.share.push({ dateien: (d.files || []).map((f) => ({ name: f.name, typ: f.type, groesse: f.size })), title: d.title, text: d.text });
      if (teilen === "fehler") { const e = new Error("Test: Teilen geht nicht"); e.name = "NotAllowedError"; throw e; }
      if (teilen === "abbruch") { const e = new Error("abgebrochen"); e.name = "AbortError"; throw e; }
    };
  } else { try { delete Navigator.prototype.share; delete Navigator.prototype.canShare; } catch (e) {} try { Object.defineProperty(navigator, "share", { value: undefined, configurable: true }); Object.defineProperty(navigator, "canShare", { value: undefined, configurable: true }); } catch (e) {} }
  if (zwischen === "ja") {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (t) => { s.reihenfolge.push("kopiert"); s.schreibe.push(t); } } });
  } else {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async () => { throw new Error("verweigert"); } } });
    document.execCommand = () => false;
  }
  window.open = (url, ziel) => {
    const f = { closed: false, close() { f.closed = true; }, location: { set href(v) { s.oeffne.push({ url: v, ziel }); }, get href() { return ""; } } };
    s.oeffne.push({ url: url, ziel, fenster: true });
    return f;
  };
})();`;

const geoeffnet = []; // alle Seiten, die der Test geöffnet hat (zum Aufräumen)

async function neueSeite(browser, variante, abfrage, optionen) {
  const o = optionen || {};
  const page = await browser.newPage();
  geoeffnet.push(page);
  const vp = o.desktop ? { width: 1280, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false } : { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
  await page.setViewport(vp);
  await page.evaluateOnNewDocument(UHR);
  if (!o.ohneStubs) await page.evaluateOnNewDocument(stubs(o));
  if (o.initScript) await page.evaluateOnNewDocument(o.initScript);
  // erwartetKonsole, erwartetNetz und erwartetAntwort (Optionen oder später am Objekt): Fehler, die der Test mit Absicht auslöst
  // (Muster für Konsole, Adresse einer abgebrochenen Anfrage, „<Status> <Adresse>“ einer Antwort ab 400)
  const st = { name: "Seite " + (geoeffnet.length) + " (" + variante + (abfrage || "") + ")", konsole: [], hosts: new Set(), antworten: [], fehlgeschlagen: [], dialoge: 0, erwartet404: 0, erwartetKonsole: o.erwartetKonsole || [], erwartetNetz: o.erwartetNetz || [], erwartetAntwort: o.erwartetAntwort || [] };
  page.on("console", (m) => {
    const t = m.text();
    if (m.type() === "error" || m.type() === "warning") {
      if (st.erwartet404 > 0 && /Failed to load resource.*404/.test(t)) return;
      if (st.erwartetKonsole.some((r) => r.test(t))) return;
      st.konsole.push(m.type() + ": " + t);
    }
  });
  page.on("pageerror", (e) => st.konsole.push("pageerror: " + e.message));
  page.on("request", (r) => {
    const u = r.url();
    if (/^https?:/.test(u)) st.hosts.add(new URL(u).host);
  });
  page.on("requestfailed", (r) => {
    if (st.erwartetNetz.some((x) => x.test(r.url()))) return;
    st.fehlgeschlagen.push((r.failure() && r.failure().errorText) + " " + r.url());
  });
  page.on("response", (r) => {
    if (r.status() === 404 && st.erwartet404 > 0) return;
    if (st.erwartetAntwort.some((x) => x.test(r.status() + " " + r.url()))) return;
    if (r.status() >= 400) st.antworten.push(r.status() + " " + r.url());
  });
  page.on("dialog", (d) => {
    st.dialoge++;
    d.accept();
  });
  page.__st = st;
  await page.goto(`${BASIS}/${variante}/${abfrage || ""}`, { waitUntil: "networkidle0" });
  if (!o.ohneBereit) await page.waitForSelector("#anmeldung[data-bereit]", { timeout: 10000 });
  return page;
}

async function schliesseSeite(page) {
  try {
    await page.close();
  } catch (fehler) {
    /* schon zu */
  }
}

// ---------- Eingabe-Helfer (wie ein Mensch: klicken und tippen) ----------

const feldSel = (pfad) => `#anmeldung [data-pfad="${pfad}"]`;

async function schritt(page) {
  return page.$eval("#anmeldung", (e) => e.getAttribute("data-schritt"));
}

async function warteSchritt(page, id, timeout = 6000) {
  try {
    await page.waitForFunction((x) => document.getElementById("anmeldung").getAttribute("data-schritt") === x, { timeout }, id);
  } catch (fehler) {
    /* unten gemeldet */
  }
  return schritt(page);
}

// Ins Feld tippen: hineinklicken, den Inhalt auswählen (mit der Mobil-Emulation wählt ein Dreifachklick nichts aus) und überschreiben.
async function text(page, pfad, wert) {
  const sel = feldSel(pfad);
  await page.click(sel);
  await page.$eval(sel, (e) => e.select());
  await page.keyboard.press("Backspace");
  if (wert) await page.keyboard.type(wert);
}

async function datum(page, pfad, iso) {
  const teile = iso ? iso.split("-") : ["", "", ""];
  for (const [i, teil] of [[2, "t"], [1, "m"], [0, "j"]]) await text(page, pfad + "." + teil, teile[i]);
}

async function karte(page, pfad, wert) {
  const id = await page.$eval(`${feldSel(pfad)}[data-wert="${wert}"]`, (e) => e.id);
  await page.click(`#anmeldung label[for="${id}"]`);
}

async function kreuze(page, pfad, wert) {
  const sel = wert ? `${feldSel(pfad)}[data-wert="${wert}"]` : feldSel(pfad);
  const id = await page.$eval(sel, (e) => e.id);
  await page.click(`#anmeldung label[for="${id}"]`);
}

async function weiter(page, erwartet) {
  await page.click('#anmeldung [data-aktion="weiter"]');
  return erwartet ? warteSchritt(page, erwartet) : null;
}

const zickzack = (box) => {
  const p = [];
  for (let i = 0; i <= 14; i++) p.push({ x: box.x + 24 + (i * (box.width - 48)) / 14, y: box.y + box.height * (0.45 + 0.25 * Math.sin(i * 1.3)) });
  return p;
};

async function unterschreibe(page, art) {
  const canvas = await page.$("#anmeldung canvas.anm-unterschrift__leinwand");
  await canvas.evaluate((e) => e.scrollIntoView({ block: "center" }));
  const box = await canvas.boundingBox();
  const p = zickzack(box);
  if (art === "touch") {
    const finger = await page.touchscreen.touchStart(p[0].x, p[0].y);
    for (const q of p.slice(1)) await finger.move(q.x, q.y);
    await finger.end();
  } else {
    await page.mouse.move(p[0].x, p[0].y);
    await page.mouse.down();
    for (const q of p.slice(1)) await page.mouse.move(q.x, q.y, { steps: 2 });
    await page.mouse.up();
  }
  await page.waitForSelector("#anmeldung .anm-unterschrift--fertig", { timeout: 5000 }).catch(() => {});
  // Das Bild der Unterschrift entsteht asynchron; mit sichtbaren Fehlermeldungen verschiebt sich danach das Layout: kurz warten
  await warte(300);
}

// Füllt die Seite mit den Beispieldaten (art: "maus" oder "touch" für die Unterschrift)
async function fuelle(page, s, d, art) {
  if (s === "person") {
    await text(page, "vorname", d.vorname);
    await text(page, "nachname", d.nachname);
    await datum(page, "geburtsdatum", d.geburtsdatum);
    await text(page, "anschrift.strasse", d.anschrift.strasse);
    await text(page, "anschrift.plz", d.anschrift.plz);
    await text(page, "anschrift.ort", d.anschrift.ort);
    await text(page, "handy", d.handy);
    await text(page, "email", d.email);
  } else if (s === "einsatz") {
    await karte(page, "abteilung", d.abteilung);
    await page.select(feldSel("mannschaft"), d.mannschaft);
    await karte(page, "rolle", d.rolle);
    await datum(page, "seit", d.seit);
    for (const t of d.tage) await kreuze(page, "tage", t);
  } else if (s === "notfall") {
    await text(page, "notfall.name", d.notfall.name);
    await text(page, "notfall.beziehung", d.notfall.beziehung);
    await text(page, "notfall.telefon", d.notfall.telefon);
  } else if (s === "erfahrung") {
    await text(page, "beruf", d.beruf);
    await text(page, "erfahrung", d.erfahrung);
    await karte(page, "ersteHilfe", d.ersteHilfe);
    await datum(page, d.ersteHilfe === "ja" ? "ersteHilfeAm" : "ersteHilfeBis", d.ersteHilfe === "ja" ? d.ersteHilfeAm : d.ersteHilfeBis);
    if (d.sonstiges) await text(page, "sonstiges", d.sonstiges);
  } else if (s === "foto") {
    const eingabe = await page.$('#anmeldung input[data-aktion="foto-galerie"]');
    await eingabe.uploadFile(path.join(TESTBILDER, "foto-3x4.jpg"));
    await page.waitForSelector("#anmeldung .anm-vorschau-foto", { visible: true, timeout: 8000 });
  } else if (s === "kodex") {
    await kreuze(page, "kodexGelesen");
  } else if (s === "selbstauskunft") {
    await kreuze(page, "selbstauskunft");
  } else if (s === "zeugnis") {
    await karte(page, "zeugnis", d.zeugnis);
  } else if (s === "unterschriften") {
    await unterschreibe(page, art || "maus");
    await kreuze(page, "satzung");
  }
}

// Von „start“ bis „pruefen“ mit den Beispieldaten (jede Seite lesen, füllen, „Weiter“)
async function bisPruefen(page, d, art) {
  for (const s of SCHRITTE.slice(1, 11)) {
    await warteSchritt(page, s);
    await fuelle(page, s, d || BEISPIEL, art || "maus");
    await weiter(page, SCHRITTE[SCHRITTE.indexOf(s) + 1]);
  }
  return warteSchritt(page, "pruefen");
}

// ---------- Messungen auf einer Seite ----------

// Sichtbarer Text (ohne Skripte, geschlossene <details>, „nur für Screenreader“) und die Werte der Eingabefelder; wie ap1/pruefen.mjs.
function sichtbarerTextImSeite() {
  const teile = [];
  const werte = [];
  const sichtbar = (el) => {
    try {
      if (!el.checkVisibility({ checkVisibilityCSS: true })) return false;
    } catch (e) {
      /* ältere Browser */
    }
    return !el.closest(".sr-only") && !el.closest(".tr-nur-vorlesen");
  };
  const geh = (knoten) => {
    if (knoten.nodeType === 3) {
      teile.push(knoten.nodeValue);
      return;
    }
    if (knoten.nodeType !== 1) return;
    const el = knoten;
    const tag = el.tagName.toLowerCase();
    if (["script", "style", "svg", "canvas", "noscript", "template"].includes(tag)) return;
    if (!sichtbar(el)) return;
    if (tag === "select") {
      const o = el.selectedOptions && el.selectedOptions[0];
      if (o && o.value) werte.push(o.textContent);
      return;
    }
    if (tag === "input" || tag === "textarea") {
      const typ = (el.getAttribute("type") || "text").toLowerCase();
      if (!["radio", "checkbox", "file", "hidden", "submit", "button"].includes(typ) && el.value) werte.push(el.value);
      return;
    }
    if (tag === "br") {
      teile.push("\n");
      return;
    }
    const block = !getComputedStyle(el).display.startsWith("inline");
    if (block) teile.push("\n");
    for (const kind of el.childNodes) geh(kind);
    if (block) teile.push("\n");
  };
  geh(document.body);
  return { text: teile.join(""), werte };
}

async function sichtbarerText(page) {
  const { text: t, werte } = await page.evaluate(sichtbarerTextImSeite);
  return norm(t + "\n" + werte.join("\n"));
}

async function messeTipp(page) {
  return page.evaluate(() => {
    const sichtbar = (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden" && !el.closest(".sr-only") && !el.closest(".tr-nur-vorlesen");
    const zu = [];
    for (const el of document.querySelectorAll("#anmeldung button, #anmeldung a.knopf, #anmeldung label.knopf, #anmeldung .anm-karte, #anmeldung summary, #anmeldung input:not([type=radio]):not([type=checkbox]):not([type=file]), #anmeldung select, #anmeldung textarea")) {
      if (!sichtbar(el)) continue;
      const h = el.getBoundingClientRect().height;
      if (h < 43.5) zu.push(`${el.tagName.toLowerCase()}.${el.className} ${h.toFixed(1)} px: ${(el.textContent || el.getAttribute("data-pfad") || "").trim().slice(0, 30)}`);
    }
    const klein = [];
    for (const el of document.querySelectorAll("#anmeldung input:not([type=radio]):not([type=checkbox]):not([type=file]), #anmeldung select, #anmeldung textarea")) {
      if (!sichtbar(el)) continue;
      const f = parseFloat(getComputedStyle(el).fontSize);
      if (f < 16) klein.push(`${el.tagName.toLowerCase()} ${f}px`);
    }
    return { zu, klein };
  });
}

async function messeAxe(page) {
  await page.evaluate(AXE);
  return page.evaluate(async () => (await axe.run(document, { resultTypes: ["violations"] })).violations.map((v) => ({ id: v.id, impact: v.impact, knoten: v.nodes.length })));
}

async function messeKopf(page) {
  return page.evaluate(() => {
    const sichtbar = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";
    const aktiv = document.querySelector(".anm-abschnitte__punkt[aria-current]");
    return {
      h1: document.querySelector("h1").textContent,
      lead: document.querySelector(".seitenkopf__lead").textContent,
      leadSichtbar: sichtbar(document.querySelector(".seitenkopf__lead")),
      kompakt: document.getElementById("inhalt").classList.contains("anm-kompakt"),
      zurueck: sichtbar(document.querySelector('[data-aktion="zurueck"]')),
      hilfe: sichtbar(document.querySelector('[data-aktion="hilfe"]')),
      abschnitteSichtbar: sichtbar(document.querySelector(".anm-abschnitte")),
      abschnittTexte: Array.from(document.querySelectorAll(".anm-abschnitte__punkt")).map((li) => li.firstChild.textContent),
      aktiv: aktiv ? aktiv.getAttribute("data-abschnitt") : null,
      sprachleiste: !!document.querySelector(".anm-sprachleiste, .anm-sprache"),
      scrollWidth: document.documentElement.scrollWidth,
      schriften: document.fonts.check("16px Inter") && document.fonts.check('700 20px "Barlow Condensed"'),
      lokalHilfe: null,
    };
  });
}

// Bytes einer Blob-Adresse (aus dem Dokument)
async function bytesVon(page, url) {
  return page.evaluate(async (u) => Array.from(new Uint8Array(await (await fetch(u)).arrayBuffer())), url);
}

// Pixelprüfung eines PNG: Anzahl der nicht durchsichtigen Pixel, Umriss, mittlere Farbe der Tinte, Größe
async function pngPixel(page, bytes) {
  return page.evaluate(async (liste) => {
    const bild = await createImageBitmap(new Blob([new Uint8Array(liste)], { type: "image/png" }));
    const c = document.createElement("canvas");
    c.width = bild.width;
    c.height = bild.height;
    const x = c.getContext("2d", { willReadFrequently: true });
    x.drawImage(bild, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data;
    let n = 0, r = 0, g = 0, b = 0, minX = c.width, maxX = -1, minY = c.height, maxY = -1;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] > 128) {
        n++;
        r += d[i]; g += d[i + 1]; b += d[i + 2];
        const px = (i / 4) % c.width, py = Math.floor(i / 4 / c.width);
        minX = Math.min(minX, px); maxX = Math.max(maxX, px); minY = Math.min(minY, py); maxY = Math.max(maxY, py);
      }
    }
    return { breite: c.width, hoehe: c.height, deckend: n, anteil: n / (c.width * c.height), umriss: [minX, minY, maxX, maxY], farbe: n ? [Math.round(r / n), Math.round(g / n), Math.round(b / n)] : null, durchsichtigeEcke: d[3] };
  }, bytes);
}

async function jpgInfo(page, bytes) {
  return page.evaluate(async (liste) => {
    const bild = await createImageBitmap(new Blob([new Uint8Array(liste)], { type: "image/jpeg" }));
    return { breite: bild.width, hoehe: bild.height };
  }, bytes);
}

// ---------- Hauptlauf: alle 13 Bildschirme mit Messungen ----------

async function hauptlauf(browser, ergebnis) {
  const page = await neueSeite(browser, "standard", "");
  const bilderOrdner = path.join(AUSGABE, "bilder");
  if (!OHNE_BILDER) fs.mkdirSync(bilderOrdner, { recursive: true });
  const reihenfolge = [];
  const messung = [];
  const textFehlt = [];
  const kopfFehler = [];
  const tippFehler = [];
  const axeFehler = [];
  const ueberlauf = [];
  const bilder = [];
  for (let i = 0; i < SCHRITTE.length; i++) {
    const s = SCHRITTE[i];
    const ist = await warteSchritt(page, s);
    reihenfolge.push(ist);
    if (s === "code") {
      // 01: Bildschirm mit leerem Feld fotografieren, dann den Code eingeben
      await page.waitForFunction(() => document.fonts.status === "loaded");
    } else await fuelle(page, s, BEISPIEL, "maus");
    if (s === "fertig") await page.waitForSelector('#anmeldung [data-status="fertig"]', { timeout: 8000 });
    if (s === "unterschriften") await page.waitForSelector("#anmeldung .anm-unterschrift--fertig", { timeout: 5000 });
    await warte(250);
    // Text
    const korpus = await sichtbarerText(page);
    const fehlt = SOLL[s].filter((z) => !korpus.includes(norm(z)));
    if (s === "code") {
      // der leere Zustand des Codefeldes: Der Text steht schon da, geprüft wird auch ohne Code
    }
    textFehlt.push(...fehlt.map((z) => `${nn(s)}-${s}: „${z}“`));
    // Kopf, Leiste, Abschnittszeile
    const k = await messeKopf(page);
    const voll = VOLL.includes(s);
    const erwartetAbschnitt = ABSCHNITT_VON[s] || null;
    if (k.h1 !== "Neu im Trainerteam") kopfFehler.push(`${s}: H1 „${k.h1}“`);
    if (k.lead !== "Alle Unterlagen in einem Zug. Am Handy dauert das etwa zehn Minuten.") kopfFehler.push(`${s}: Lead „${k.lead}“`);
    if (k.leadSichtbar !== voll) kopfFehler.push(`${s}: Lead ${k.leadSichtbar ? "sichtbar" : "nicht sichtbar"}, erwartet ${voll ? "sichtbar" : "nicht sichtbar"}`);
    if (k.kompakt === voll) kopfFehler.push(`${s}: Kopf ${k.kompakt ? "kompakt" : "voll"}, erwartet ${voll ? "voll" : "kompakt"}`);
    if (k.zurueck !== (s !== "code")) kopfFehler.push(`${s}: „Zurück“ ${k.zurueck ? "sichtbar" : "fehlt"}`);
    if (!k.hilfe) kopfFehler.push(`${s}: „Hilfe“ fehlt`);
    if (k.sprachleiste) kopfFehler.push(`${s}: Sprachleiste vorhanden`);
    if (k.abschnitteSichtbar !== !!erwartetAbschnitt) kopfFehler.push(`${s}: Abschnittszeile ${k.abschnitteSichtbar ? "sichtbar" : "nicht sichtbar"}`);
    if (k.aktiv !== erwartetAbschnitt) kopfFehler.push(`${s}: aktiver Abschnitt „${k.aktiv}“, erwartet „${erwartetAbschnitt}“`);
    if (!gleich(k.abschnittTexte, ABSCHNITT_TEXTE)) kopfFehler.push(`${s}: Abschnittszeile ${k.abschnittTexte.join(" · ")}`);
    if (k.scrollWidth > 390) ueberlauf.push(`${s}: ${k.scrollWidth}`);
    if (!k.schriften) kopfFehler.push(`${s}: Schriften Inter/Barlow Condensed nicht geladen`);
    messung.push(k.scrollWidth);
    // Tippflächen und Eingabeschrift
    const tipp = await messeTipp(page);
    if (tipp.zu.length || tipp.klein.length) tippFehler.push(`${nn(s)}-${s}: ${[...tipp.zu, ...tipp.klein].join("; ")}`);
    // Barrierefreiheit
    const axe = await messeAxe(page);
    if (axe.length) axeFehler.push(`${nn(s)}-${s}: ${axe.map((v) => `${v.id} (${v.impact}, ${v.knoten}×)`).join(", ")}`);
    // Bildschirmfoto der ganzen Seite
    if (!OHNE_BILDER) {
      // ohne Fokusrahmen vom letzten Tippen oder Klicken
      await page.evaluate(() => {
        if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
        window.scrollTo(0, 0);
      });
      const datei = path.join(bilderOrdner, `${nn(s)}-${s}-390.png`);
      await page.screenshot({ path: datei, fullPage: true });
      const b = fs.readFileSync(datei);
      bilder.push({ datei: path.basename(datei), breite: b.readUInt32BE(16), hoehe: b.readUInt32BE(20) });
    }
    if (s === "code") {
      // Hilfe öffnen und schließen (Kasten mit der Adresse)
      await page.click('[data-aktion="hilfe"]');
      const hilfe = await page.$eval("[data-hilfe]", (e) => ({ sichtbar: e.getClientRects().length > 0, text: e.textContent.trim(), expanded: document.querySelector('[data-aktion="hilfe"]').getAttribute("aria-expanded") }));
      ergebnis.hilfe = hilfe;
      await page.click('[data-aktion="hilfe"]');
      const zu = await page.$eval("[data-hilfe]", (e) => e.getClientRects().length === 0);
      ergebnis.hilfeZu = zu;
      await text(page, "zugang.code", TESTCODE);
    }
    if (s === "fertig") break;
    const naechster = SCHRITTE[i + 1];
    const nach = await weiter(page, naechster);
    if (nach !== naechster) {
      reihenfolge.push("FEHLT: " + naechster + " (ist " + nach + ")");
      break;
    }
  }
  ergebnis.reihenfolge = reihenfolge;
  ergebnis.textFehlt = textFehlt;
  ergebnis.kopfFehler = kopfFehler;
  ergebnis.tippFehler = tippFehler;
  ergebnis.axeFehler = axeFehler;
  ergebnis.ueberlauf = ueberlauf;
  ergebnis.scrollWidth = messung;
  ergebnis.bilder = bilder;
  ergebnis.sollAnzahl = Object.values(SOLL).reduce((n, l) => n + l.length, 0);
  return page;
}

// ---------- Hilfen für Prüfungen am Ende ----------

async function attrappe(page) {
  return page.evaluate(() => window.__attrappe || null);
}

// Beschriftungen und Fehler eines Feldes (Meldung am Feld, Liste oben)
async function fehlerAnzeige(page) {
  return page.evaluate(() => {
    const sichtbar = (e) => !!e && e.getClientRects().length > 0;
    const amFeld = Array.from(document.querySelectorAll("#anmeldung .anm-fehler")).filter((e) => sichtbar(e) && e.textContent.trim()).map((e) => ({ feld: e.closest("[data-feld]") ? e.closest("[data-feld]").getAttribute("data-feld") : null, text: e.textContent.trim() }));
    const box = document.querySelector("#anmeldung .anm-fehlerbox");
    const liste = box && sichtbar(box) ? Array.from(box.querySelectorAll("li")).map((l) => l.textContent.trim()) : [];
    const invalid = Array.from(document.querySelectorAll('#anmeldung [aria-invalid="true"]')).map((e) => e.getAttribute("data-pfad") || e.closest("[data-feld]")?.getAttribute("data-feld") || e.tagName);
    return { amFeld, liste, invalid };
  });
}

const ladeErfolg = (st) => st.konsole.length === 0 && st.antworten.length === 0 && st.fehlgeschlagen.length === 0;

// ---------- Hauptprogramm ----------

// --server: nur die Testseite ausliefern (Stichproben von Hand); läuft bis Strg+C
async function zeigeTestseite() {
  const T = (await import(pathToFileURL(path.join(JS_ORDNER, "texte", "trainer-de.js")).href)).default;
  await starteServer(T);
  server.pdfModus = MIT_ECHT ? "echt" : "attrappe";
  console.log(`Testseite „Neu im Trainerteam“ (nur 127.0.0.1, Strg+C beendet den Server):\n  ${BASIS}/standard/?code=${TESTCODE}`);
  console.log(`  Der Code gilt nur für diese Testseite. PDF-Baustein: ${MIT_ECHT ? "echtes trainer-pdf.js" : "Attrappe (drei Beispieldateien)"}.`);
  console.log(`  Weitere Varianten der Konfiguration: ${Object.keys(VARIANTEN).filter((v) => v !== "standard").map((v) => `${BASIS}/${v}/`).join("  ")}`);
  await new Promise(() => {});
}

async function haupt() {
  if (NUR_SERVER) return zeigeTestseite();
  console.log("Ende-zu-Ende-Test „Neu im Trainerteam“ (T1)\n");
  fs.mkdirSync(AUSGABE, { recursive: true });
  const T = (await import(pathToFileURL(path.join(JS_ORDNER, "texte", "trainer-de.js")).href)).default;

  // ---------- [4] Regeln in Node ----------
  const node = await pruefeRegelnInNode();
  kriterium(4, "Prüfregeln in Node (trainer-regeln.js ohne Browser)", node.fehlt.length === 0 && node.rechenFehler.length === 0,
    `${node.faelle} Fälle (Seite, Änderung, erwartete Felder und Meldungen) und ${node.rechnen} Rechen- und Einzelfälle (Alter, Frist, Nummer, PLZ, E-Mail, Datum, Konstanten, Mannschaften): ${node.fehlt.length + node.rechenFehler.length} Abweichungen` +
    (node.fehlt.length || node.rechenFehler.length ? "\n" + [...node.fehlt, ...node.rechenFehler].join("\n") : ""));

  // ---------- [5] Markierungen im Textmodul (Herkunft: Entwurf, ap1/texte.mjs) ----------
  {
    const quelle = fs.readFileSync(path.join(JS_ORDNER, "texte", "trainer-de.js"), "utf8");
    const zaehle = (name) => quelle.split("\n").filter((z) => new RegExp("//\\s*" + name + "\\s*$").test(z)).length;
    const ist = { ENTWURF_WORTLAUT: zaehle("ENTWURF_WORTLAUT"), PRUEFEN_AP3: zaehle("PRUEFEN_AP3"), WORTLAUT_QUELLE: zaehle("WORTLAUT_QUELLE") };
    // Selbstauskunft: 8 Texte; Führungszeugnis, Antrag, Kasten auf „Prüfen“ und „So geht es weiter“: 13 Texte (ohne die Blätter, die T2 liefert); Kodex: 2 Grundsätze
    const soll = { ENTWURF_WORTLAUT: 8, PRUEFEN_AP3: 13, WORTLAUT_QUELLE: 2 };
    kriterium(5, "Markierungen ENTWURF_WORTLAUT, PRUEFEN_AP3, WORTLAUT_QUELLE bleiben als Kommentar an den Texten", gleich(ist, soll),
      `Kommentare an Texten in texte/trainer-de.js: ${JSON.stringify(ist)} (erwartet ${JSON.stringify(soll)})`);
  }

  // ---------- [11] Importe ----------
  // Alle eigenen Module sind statisch importiert, auch trainer-pdf.js (Safari merkt sich ein gescheitertes import() für die ganze Sitzung); das
  // einzige import() ist der Rückfall für die Schrift im Lader, nach einem erfolgreichen fetch. Der Importgraph ab trainer.js ist geschlossen:
  // nur ./x.js im Ordner assets/js/anmeldung (und ./texte/x.js), keine Verweise auf andere Ordner.
  {
    const ohneKommentare = (q) => q.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
    const lies = (rel) => ohneKommentare(fs.readFileSync(path.join(JS_ORDNER, rel), "utf8"));
    const statischIn = (code) => [...code.matchAll(/(?:\bfrom\s*|\bimport\s+)(["'`])([^"'`\n]+)\1/g)].map((m) => m[2]);
    const dynamischIn = (code) => [...code.matchAll(/\bimport\s*\(\s*([^)]*)\)/g)].map((m) => m[1].trim());
    const muster = /^\.\/[\w.\-\/]+\.js$/;
    const STANDARDQUELLEN = { "trainer-pdf-lader.js": ["../antrag/aufnahmeantrag-pdf-lib.js", "../antrag/aufnahmeantrag-fontkit.js", "../../fonts/liberation-sans-regular.ttf"] };
    const eigene = fs.readdirSync(JS_ORDNER).filter((d) => /^trainer(-[a-z0-9]+)*\.js$/.test(d)).sort().concat("texte/trainer-de.js");
    const fremd = [];
    const dynamisch = [];
    let statischAnzahl = 0;
    for (const rel of eigene) {
      const code = lies(rel);
      for (const ziel of statischIn(code)) {
        statischAnzahl += 1;
        if (!muster.test(ziel)) fremd.push(`${rel} › ${ziel}`);
      }
      for (const arg of dynamischIn(code)) dynamisch.push(`${rel} › import(${arg})`);
      // keine Verweise auf andere Ordner in Zeichenketten (../, absolute Pfade zu Dateien); erlaubt sind nur die Standardquellen des Laders
      // (pdf-lib, fontkit, Schrift unter assets/), die gelten ohne konfig.quellen, also nicht im Paket (dort liegen alle Dateien im Ordner der Seite)
      for (const m of code.matchAll(/["'`](\.\.\/[^"'`]+)["'`]/g)) {
        if (!(STANDARDQUELLEN[rel] || []).includes(m[1])) fremd.push(`${rel}: Verweis „${m[1]}“`);
      }
    }
    // Importgraph ab trainer.js: nur statische Importe, also alles, was der Browser beim Start der Seite laden muss
    const graph = new Map();
    const fehlend = [];
    const warte = ["trainer.js"];
    while (warte.length) {
      const rel = warte.shift();
      if (graph.has(rel)) continue;
      if (!fs.existsSync(path.join(JS_ORDNER, rel))) {
        fehlend.push(rel);
        graph.set(rel, []);
        continue;
      }
      const ziele = [];
      for (const ziel of statischIn(lies(rel))) {
        if (!muster.test(ziel)) {
          fremd.push(`${rel} › ${ziel}`);
          continue;
        }
        const voll = path.posix.normalize(path.posix.join(path.posix.dirname(rel), ziel));
        ziele.push(voll);
        warte.push(voll);
      }
      graph.set(rel, ziele);
    }
    const module = [...graph.keys()].filter((rel) => !fehlend.includes(rel));
    const bytes = module.reduce((summe, rel) => summe + fs.statSync(path.join(JS_ORDNER, rel)).size, 0);
    const trainerImportiertPdf = graph.get("trainer.js").includes("trainer-pdf.js");
    const dynTrainer = dynamisch.filter((x) => x.startsWith("trainer.js"));
    // genau ein import() in den eigenen Dateien: im Lader, mit einer Variablen (nicht mit einer Adresse im Quelltext)
    const nurRueckfall = dynamisch.length === 1 && dynamisch[0].startsWith("trainer-pdf-lader.js") && !/import\(\s*["'`]/.test(dynamisch[0]);
    const holeModul = (lies("trainer-pdf-lader.js").match(/async function holeModulBytes[\s\S]*?\n}\n/) || [""])[0];
    const fetchVorImport = holeModul.includes("fetch(") && holeModul.includes("import(") && holeModul.indexOf("fetch(") < holeModul.indexOf("import(");
    const imGraph = ["trainer-pdf.js", "trainer-pdf-lader.js", "trainer-seiten.js", "trainer-regeln.js", "texte/trainer-de.js", "pdf-lader.js"].filter((rel) => !module.includes(rel));
    const assistentDyn = dynamischIn(lies("pdf-lader.js")).filter((x) => /["'`]\.\//.test(x));
    kriterium(11, "Importe: alle eigenen Module statisch (auch trainer-pdf.js), einziges import() der Rückfall für die Schrift im Lader; Importgraph ab trainer.js geschlossen, keine Verweise auf andere Ordner",
      trainerImportiertPdf && dynTrainer.length === 0 && nurRueckfall && fetchVorImport && fremd.length === 0 && fehlend.length === 0 && imGraph.length === 0,
      `statische Importe: ${statischAnzahl} in ${eigene.length} Dateien; trainer.js importiert trainer-pdf.js statisch: ${trainerImportiertPdf ? "ja" : "NEIN"}; import() in trainer.js: ${dynTrainer.length}; import() in den eigenen Dateien: ${dynamisch.join("; ") || "keines"} (Rückfall nach fetch: ${fetchVorImport ? "ja" : "NEIN"}); ` +
        `Importgraph ab trainer.js: ${module.length} Module, ${bytes} Byte (Quelltext), fehlende Dateien: ${fehlend.length ? fehlend.join(", ") : "keine"}; Importe oder Verweise außerhalb von ./: ${fremd.length ? fremd.join("; ") : "keine"}; ` +
        `pdf-lader.js des Assistenten hat eigene import(${assistentDyn.join(", ")}), die auf der Trainerseite nicht laufen (nicht im statischen Graph: ${assistentDyn.every((a) => !module.includes(a.replace(/["'`]\.\/|["'`]/g, ""))) ? "ja" : "NEIN"})`);
  }

  if (NUR_REGELN) {
    console.log(`\n${fehlerAnzahl === 0 ? "ALLES OK (nur Regeln)" : fehlerAnzahl + " Kriterium/Kriterien mit FEHLER"}`);
    return;
  }

  // ---------- Server und Browser ----------
  await starteServer(T);
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-first-run", "--no-default-browser-check", "--hide-scrollbars"] });
  const chromePid = browser.process() && browser.process().pid;
  const downloads = fs.mkdtempSync(path.join(os.tmpdir(), "trainer-e2e-"));
  try {
    // Ordner und Dateien für Tests (kleine Textdatei als „Foto“)
    const textdatei = path.join(downloads, "kein-foto.txt");
    fs.writeFileSync(textdatei, "weder Bild noch PDF");

    // =====================================================================
    // [3] Zugangsschutz
    // =====================================================================
    {
      const fremdeTexte = ["Wer bist du?", "Schön, dass du dabei bist", "Verhaltenskodex zum Kindeswohl", "Stimmt alles?", "Dein Paket ist fertig", "Unterschreiben", "Wo bist du im Einsatz?", "Selbstauskunft zur Kinder- und Jugendarbeit", "Dein erweitertes Führungszeugnis", "Dein Passfoto", "Was bringst du mit?", "Wer ist im Notfall für dich da?"];
      const nurCode = (page) => page.evaluate((fremd) => {
        const html = document.documentElement.outerHTML;
        return {
          schritt: document.getElementById("anmeldung").getAttribute("data-schritt"),
          fremdeTexte: fremd.filter((t) => html.includes(t)),
          felder: Array.from(document.querySelectorAll("[data-pfad]")).map((e) => e.getAttribute("data-pfad")),
          formulare: document.querySelectorAll("#anmeldung form").length,
          knoepfeWeiter: document.querySelectorAll('[data-aktion="weiter"]').length,
          abschnitteSichtbar: !!document.querySelector(".anm-abschnitte") && document.querySelector(".anm-abschnitte").getClientRects().length > 0,
        };
      }, fremdeTexte);
      const fehler = [];
      const belege = [];

      // Ohne Code: nur die Code-Seite
      let page = await neueSeite(browser, "standard", "");
      let z = await nurCode(page);
      if (z.schritt !== "code" || z.fremdeTexte.length || !gleich(z.felder, ["zugang.code"]) || z.abschnitteSichtbar) fehler.push("ohne Code: " + JSON.stringify(z));
      belege.push(`ohne Code: Bildschirm ${z.schritt}, Felder ${z.felder.join(",")}, Texte der übrigen Bildschirme im Dokument: ${z.fremdeTexte.length}`);

      // leeres Feld
      await weiter(page);
      await warte(200);
      let anz = await fehlerAnzeige(page);
      if (!(anz.amFeld.length === 1 && anz.amFeld[0].text === "Bitte gib deinen Code ein." && anz.liste.length === 1 && anz.invalid.includes("zugang.code")) || (await schritt(page)) !== "code") fehler.push("leeres Feld: " + JSON.stringify(anz));
      belege.push(`leeres Feld: „${anz.amFeld[0] && anz.amFeld[0].text}“ am Feld und in der Liste oben, aria-invalid gesetzt, bleibt auf „code“`);
      // nur Leerzeichen und Bindestriche gelten als leer
      await text(page, "zugang.code", " - - ");
      await weiter(page);
      await warte(150);
      anz = await fehlerAnzeige(page);
      if (!(anz.amFeld.length === 1 && anz.amFeld[0].text === "Bitte gib deinen Code ein.")) fehler.push("nur Leerzeichen und Bindestriche: " + JSON.stringify(anz));

      // falscher Code
      await text(page, "zugang.code", "FALSCH-CODE-1234");
      anz = await fehlerAnzeige(page);
      if (anz.amFeld.length !== 0) fehler.push("Meldung bleibt nach dem Tippen stehen");
      await weiter(page);
      await warte(300);
      anz = await fehlerAnzeige(page);
      z = await nurCode(page);
      if (!(anz.amFeld.length === 1 && anz.amFeld[0].text === "Der Code stimmt nicht. Bitte prüfe ihn." && anz.liste.length === 1) || z.schritt !== "code" || z.fremdeTexte.length || !gleich(z.felder, ["zugang.code"])) fehler.push("falscher Code: " + JSON.stringify({ anz, z }));
      belege.push(`falscher Code: „${anz.amFeld[0] && anz.amFeld[0].text}“, kein Weiterkommen, Texte der übrigen Bildschirme im Dokument: ${z.fremdeTexte.length}`);
      // ein Code, der nur mit einem Zeichen mehr oder weniger gleich ist
      for (const fast of [TESTCODE + "X", TESTCODE.slice(0, -1), TESTCODE.replace("K", "H")]) {
        await text(page, "zugang.code", fast);
        await weiter(page);
        await warte(150);
        if ((await schritt(page)) !== "code") fehler.push("fast richtiger Code kommt weiter: " + fast);
      }
      // Kein Weg an der Code-Abfrage vorbei: Adressen mit Schritt, Hash, Parameter
      const abgesichert = [];
      for (const abfrage of ["#/pruefen", "#pruefen", "#/12-pruefen", "?schritt=pruefen", "?schritt=fertig&code=falsch", "?pruefen=1#fertig"]) {
        const p2 = await neueSeite(browser, "standard", abfrage);
        const z2 = await nurCode(p2);
        if (z2.schritt !== "code" || z2.fremdeTexte.length) fehler.push("Adresse " + abfrage + ": " + JSON.stringify(z2));
        abgesichert.push(abfrage);
        await schliesseSeite(p2);
      }
      belege.push(`Adressen ohne Weg am Code vorbei: ${abgesichert.join("  ")}: immer nur „code“`);

      // richtiger Code in jeder Schreibweise
      const schreibweisen = [TESTCODE, TESTCODE.toLowerCase(), TESTCODE.replace(/-/g, ""), TESTCODE.toLowerCase().replace(/-/g, " "), "  " + TESTCODE.replace(/-/g, " – ") + "  ", TESTCODE.split("").join(" ")];
      for (const eingabe of schreibweisen) {
        await text(page, "zugang.code", eingabe);
        await weiter(page);
        const s = await warteSchritt(page, "start", 3000);
        if (s !== "start") fehler.push("richtiger Code „" + eingabe + "“ kommt nicht weiter (" + s + ")");
        // zurück zur Code-Seite für die nächste Schreibweise
        await page.click('[data-aktion="zurueck"]');
        await warteSchritt(page, "code", 3000);
      }
      belege.push(`richtiger Code in ${schreibweisen.length} Schreibweisen (Groß-/Kleinschreibung, Leerzeichen, Bindestriche, Gedankenstrich): kommt weiter`);

      // nach dem richtigen Code trägt die Adresse code=…; Neuladen fragt nicht noch einmal
      await text(page, "zugang.code", TESTCODE.toLowerCase());
      await weiter(page, "start");
      const urlNach = await page.evaluate(() => location.search);
      if (!urlNach.includes("code=" + normalisiere(TESTCODE))) fehler.push("Adresse ohne code=: " + urlNach);
      await page.reload({ waitUntil: "networkidle0" });
      await page.waitForSelector("#anmeldung[data-bereit]");
      if ((await schritt(page)) !== "start") fehler.push("Neuladen fragt wieder nach dem Code");
      belege.push(`nach dem Code: Adresse „${urlNach}“, Neuladen führt direkt zu „start“`);
      await schliesseSeite(page);

      // ?code=richtig führt direkt zum Start (in verschiedenen Schreibweisen), Zurück gibt es dort nicht
      for (const wert of [normalisiere(TESTCODE), TESTCODE, TESTCODE.toLowerCase(), encodeURIComponent(TESTCODE.replace(/-/g, " "))]) {
        const p2 = await neueSeite(browser, "standard", "?code=" + wert);
        const s = await schritt(p2);
        const zurueck = await p2.$eval('[data-aktion="zurueck"]', (e) => e.getClientRects().length > 0);
        if (s !== "start" || zurueck) fehler.push("?code=" + wert + ": Bildschirm " + s + ", Zurück " + zurueck);
        await schliesseSeite(p2);
      }
      belege.push("?code=<richtig> (4 Schreibweisen) öffnet direkt „start“, ohne Zurück");

      // ?code=falsch: Code-Seite mit Fehlermeldung, Code steht im Feld
      page = await neueSeite(browser, "standard", "?code=FALSCH");
      anz = await fehlerAnzeige(page);
      const imFeld = await page.$eval(feldSel("zugang.code"), (e) => e.value);
      z = await nurCode(page);
      if (z.schritt !== "code" || imFeld !== "FALSCH" || !(anz.amFeld.length === 1 && anz.amFeld[0].text === "Der Code stimmt nicht. Bitte prüfe ihn.") || z.fremdeTexte.length) fehler.push("?code=falsch: " + JSON.stringify({ z, imFeld, anz }));
      belege.push(`?code=<falsch>: Code-Seite, „${anz.amFeld[0] && anz.amFeld[0].text}“, der Code steht im Feld`);
      await schliesseSeite(page);
      // ?code= (leer): Code-Seite ohne Meldung
      page = await neueSeite(browser, "standard", "?code=");
      anz = await fehlerAnzeige(page);
      if ((await schritt(page)) !== "code" || anz.amFeld.length) fehler.push("?code= (leer): " + JSON.stringify(anz));
      await schliesseSeite(page);

      // zwei Prüfwerte nebeneinander (einer fremd): der richtige gilt
      page = await neueSeite(browser, "zweipruefwerte", "?code=" + TESTCODE);
      if ((await schritt(page)) !== "start") fehler.push("zwei Prüfwerte: ?code=richtig öffnet nicht");
      await schliesseSeite(page);
      // leere Liste der Prüfwerte: Die Seite bleibt zu (kein Code passt), auch mit ?code=
      page = await neueSeite(browser, "ohnepruefwerte", "?code=" + TESTCODE);
      z = await nurCode(page);
      await text(page, "zugang.code", TESTCODE);
      await weiter(page);
      await warte(200);
      z.nachEingabe = await schritt(page);
      if (z.schritt !== "code" || z.nachEingabe !== "code" || z.fremdeTexte.length) fehler.push("leere Prüfwerteliste: " + JSON.stringify(z));
      belege.push("leere Prüfwerteliste: Die Seite bleibt zu (auch mit richtigem Code und ?code=)");
      await schliesseSeite(page);

      kriterium(3, "Zugangsschutz: ohne Code nur die Code-Seite, leer, falsch, richtig in jeder Schreibweise, ?code=", fehler.length === 0, belege.join("\n") + (fehler.length ? "\nFEHLER:\n" + fehler.join("\n") : ""));
    }

    // =====================================================================
    // [2] [5] [7] Hauptlauf mit allen 13 Bildschirmen, dann zurück, „Ändern“
    // =====================================================================
    const haupt1 = {};
    const hp = await hauptlauf(browser, haupt1);
    // Kopf und Abschnittszeile: Der Test hat schon je Bildschirm geprüft (kopfFehler)
    // Hilfe
    const hilfeOk = haupt1.hilfe && haupt1.hilfe.sichtbar && haupt1.hilfe.text === "Fragen? Schreib an " + MAIL + "." && haupt1.hilfe.expanded === "true" && haupt1.hilfeZu === true;
    // Antworten und Medien, die die Attrappe beim Erstellen bekam
    const erstellt = await attrappe(hp);
    const aufruf = erstellt && erstellt.erzeugt && erstellt.erzeugt[0];

    kriterium(5, "Texte vollständig: jede verbindliche Zeichenkette ist im sichtbaren Text des Bildschirms", haupt1.textFehlt.length === 0 && haupt1.kopfFehler.length === 0 && hilfeOk,
      `${haupt1.sollAnzahl} Zeichenketten (aus ap1/AUFTRAG.md, ohne die Stellen für Einsichtnehmende) auf 13 Bildschirmen geprüft: ${haupt1.textFehlt.length} fehlende${haupt1.textFehlt.length ? "\n" + haupt1.textFehlt.join("\n") : ""}\n` +
      `Kopf (Überschrift, Lead nur auf code/start/fertig, kompakt sonst), Leiste (Zurück nie auf code, Hilfe), Abschnittszeile „Du · Einsatz · Unterlagen · Führungszeugnis · Unterschrift · Fertig“ mit richtigem aktivem Abschnitt, keine Sprachleiste: ${haupt1.kopfFehler.length === 0 ? "stimmt auf allen 13" : "\n" + haupt1.kopfFehler.join("\n")}\n` +
      `Hilfe: ${haupt1.hilfe ? "„" + haupt1.hilfe.text + "“ (aria-expanded " + haupt1.hilfe.expanded + "), schließt wieder: " + haupt1.hilfeZu : "nicht geprüft"}`);

    // ---- [2] Reihenfolge, zurück, Ändern ----
    {
      const fehler = [];
      const belege = [];
      const vorwaerts = haupt1.reihenfolge;
      if (!gleich(vorwaerts, SCHRITTE)) fehler.push("vorwärts: " + vorwaerts.join(" > "));
      belege.push("Weiter von „code“ (mit Code) bis „fertig“: " + vorwaerts.map((s, i) => nn(SCHRITTE[i]) + "-" + s).join(" > "));
      const weiterAmEnde = await hp.$('#anmeldung [data-aktion="weiter"]');
      if (weiterAmEnde) fehler.push("„fertig“ hat einen Weiter-Knopf");
      // zurück bis „code“
      const rueck = [await schritt(hp)];
      for (let i = SCHRITTE.length - 2; i >= 0; i--) {
        await hp.click('[data-aktion="zurueck"]');
        rueck.push(await warteSchritt(hp, SCHRITTE[i]));
      }
      if (!gleich(rueck, [...SCHRITTE].reverse())) fehler.push("rückwärts: " + rueck.join(" > "));
      belege.push("Zurück von „fertig“ bis „code“: " + rueck.map((s) => s).join(" > "));
      const zurueckAufCode = await hp.$eval('[data-aktion="zurueck"]', (e) => e.getClientRects().length > 0);
      if (zurueckAufCode) fehler.push("„Zurück“ auf „code“ sichtbar");
      // die Angaben sind noch da: Code-Seite zeigt den Code, „Weiter“ geht wieder bis „pruefen“ ohne neue Eingabe
      const imFeld = await hp.$eval(feldSel("zugang.code"), (e) => e.value);
      if (normalisiere(imFeld) !== normalisiere(TESTCODE)) fehler.push("Code nach „Zurück“ nicht mehr im Feld: " + imFeld);
      const wieder = [await schritt(hp)];
      for (let i = 1; i <= 11; i++) {
        await weiter(hp, SCHRITTE[i]);
        wieder.push(await schritt(hp));
      }
      if (!gleich(wieder, SCHRITTE.slice(0, 12))) fehler.push("wieder vorwärts: " + wieder.join(" > "));
      belege.push("danach wieder Weiter ohne neue Eingabe bis „pruefen“: " + (gleich(wieder, SCHRITTE.slice(0, 12)) ? "ja (Angaben blieben erhalten)" : wieder.join(" > ")));
      // Ändern (Name) → Du, danach in der Reihenfolge weiter
      const erstes = await hp.$eval('#anmeldung .anm-pruefzeile [data-aktion="aendern"]', (e) => ({ label: e.getAttribute("aria-label"), zeile: e.closest(".anm-pruefzeile").querySelector("dt").textContent }));
      await hp.click('#anmeldung .anm-pruefzeile [data-aktion="aendern"]');
      const nachAendern = await warteSchritt(hp, "person");
      const aktivAendern = (await messeKopf(hp)).aktiv;
      const vorname = await hp.$eval(feldSel("vorname"), (e) => e.value);
      await weiter(hp, "einsatz");
      const nachWeiter = await schritt(hp);
      await weiter(hp, "notfall");
      await weiter(hp, "erfahrung");
      belege.push(`„Ändern“ (${erstes.zeile}, Beschriftung „${erstes.label}“) von „pruefen“ › ${nachAendern} (Abschnitt ${aktivAendern}, Vorname noch „${vorname}“); „Weiter“ › ${nachWeiter} › notfall › erfahrung (in der Reihenfolge)`);
      if (nachAendern !== "person" || aktivAendern !== "du" || vorname !== "Max" || nachWeiter !== "einsatz") fehler.push(`Ändern: ${nachAendern}, ${aktivAendern}, ${vorname}, ${nachWeiter}`);
      // jede Zeile der Zusammenfassung führt zu ihrer Seite
      for (const s of ["foto", "kodex", "selbstauskunft", "zeugnis", "unterschriften"]) await weiter(hp, s);
      await weiter(hp, "pruefen");
      const ziele = [];
      const anzahl = await hp.$$eval('#anmeldung .anm-pruefzeile [data-aktion="aendern"]', (l) => l.length);
      for (let i = 0; i < anzahl; i++) {
        const zeile = await hp.evaluate((n) => {
          const knopf = document.querySelectorAll('#anmeldung .anm-pruefzeile [data-aktion="aendern"]')[n];
          const dt = knopf.closest(".anm-pruefzeile").querySelector("dt").textContent;
          knopf.click();
          return dt;
        }, i);
        await warte(120);
        ziele.push(`${zeile} › ${await schritt(hp)}`);
        // zurück zu „pruefen“ (Zurück)
        await hp.click('[data-aktion="zurueck"]');
        await warteSchritt(hp, "pruefen");
      }
      const erwartet = ["person", "person", "person", "person", "person", "einsatz", "einsatz", "einsatz", "einsatz", "einsatz", "notfall", "erfahrung", "erfahrung", "erfahrung", "foto", "kodex", "selbstauskunft", "zeugnis", "unterschriften", "unterschriften"];
      const istZiele = ziele.map((z) => z.split(" › ")[1]);
      if (!gleich(istZiele, erwartet)) fehler.push("Ändern-Ziele: " + ziele.join("; "));
      belege.push(`jede Zeile der Zusammenfassung hat „Ändern“ (${anzahl} Zeilen) und führt zur passenden Seite: ${ziele.map((z) => z.split(" › ")[1]).join(", ")}`);
      kriterium(2, "13 Bildschirme durchlaufbar: Weiter, Zurück bis Code, Ändern und wieder in der Reihenfolge weiter", fehler.length === 0, belege.join("\n") + (fehler.length ? "\nFEHLER:\n" + fehler.join("\n") : ""));
    }

    // ---- [7] Aussehen und Handy ----
    {
      const fehler = [];
      const bildOk = OHNE_BILDER || (haupt1.bilder.length === 13 && haupt1.bilder.every((b) => b.breite === 780));
      if (!bildOk) fehler.push("Bildschirmfotos: " + JSON.stringify(haupt1.bilder));
      kriterium(7, "Aussehen und Handy (390 px, Faktor 2): Bildschirmfotos, Überlauf, Tippflächen, Schrift, Barrierefreiheit",
        bildOk && haupt1.ueberlauf.length === 0 && haupt1.tippFehler.length === 0 && haupt1.axeFehler.length === 0,
        (OHNE_BILDER ? "Bildschirmfotos übersprungen (--ohne-bilder)\n" : `Bildschirmfotos: ${haupt1.bilder.length} in ${path.join(AUSGABE, "bilder")} (${haupt1.bilder.map((b) => b.datei + " " + b.breite + "×" + b.hoehe).join(", ")})\n`) +
        `scrollWidth je Bildschirm: ${haupt1.scrollWidth.join(", ")} (Grenze 390)${haupt1.ueberlauf.length ? " – ÜBERLAUF: " + haupt1.ueberlauf.join("; ") : ""}\n` +
        `Knöpfe, Karten, Eingaben mindestens 44 px hoch und Eingabeschrift mindestens 16 px: ${haupt1.tippFehler.length === 0 ? "ja, auf allen 13" : "NEIN\n" + haupt1.tippFehler.join("\n")}\n` +
        `axe-core (Standardregeln): ${haupt1.axeFehler.length === 0 ? "0 Verstöße auf allen 13 Bildschirmen" : "\n" + haupt1.axeFehler.join("\n")}`);
    }

    // =====================================================================
    // [9] Dateien erstellen, Teilen, Herunterladen, Vorschau, Löschen (Attrappe)
    // =====================================================================
    // Wieder auf „pruefen“ mit allen Angaben: Dateien erstellen
    let ende;
    {
      const fehler = [];
      const belege = [];
      // Seite 11 hat die Unterschrift noch (Striche bleiben): Prüfen › Fertig
      const page = hp;
      await page.evaluate(() => window.__stub.reihenfolge.splice(0));
      // zurück auf „pruefen“ (nach den Ändern-Läufen)
      let ist = await schritt(page);
      for (let g = 0; g < 4 && ist !== "pruefen"; g++) {
        await page.click('[data-aktion="zurueck"]');
        ist = await warteSchritt(page, "pruefen", 2000);
      }
      if (ist !== "pruefen") fehler.push("nicht auf „pruefen“: " + ist);
      // Unterschrift der Vorschau: PNG, Pixelprüfung
      const vorschauUrl = await page.$eval("#anmeldung img.anm-vorschau-unterschrift", (e) => e.src);
      const png = await bytesVon(page, vorschauUrl);
      const pngKopf = png.slice(0, 8).join(",");
      const pixel = await pngPixel(page, png);
      // Erstellen: Die Dateien sind schon beim ersten Besuch von „fertig“ entstanden (Hauptlauf) und bleiben gültig, solange sich nichts ändert
      // (Zurück, „Ändern“ ohne Änderung und neues Zeichnen derselben Unterschrift lösen kein zweites Erstellen aus).
      await weiter(page);
      await page.waitForSelector('#anmeldung [data-status="fertig"]', { timeout: 8000 });
      const a2 = await attrappe(page);
      const neuerAufruf = a2.erzeugt[a2.erzeugt.length - 1];
      if (a2.erzeugt.length !== 1) fehler.push("erzeugeDateien wurde " + a2.erzeugt.length + "× aufgerufen (erwartet: einmal, solange sich nichts ändert)");
      const erwarteteAntworten = JSON.parse(JSON.stringify(BEISPIEL));
      if (!gleich(neuerAufruf.antworten, erwarteteAntworten)) fehler.push("Antworten weichen ab: " + JSON.stringify(neuerAufruf.antworten));
      if (!gleich(neuerAufruf.schluessel, ["antworten", "heute", "konfig", "medien"])) fehler.push("Aufruf-Schlüssel: " + neuerAufruf.schluessel.join(","));
      if (neuerAufruf.heute !== HEUTE) fehler.push("heute: " + neuerAufruf.heute);
      if (!gleich(neuerAufruf.medien.schluessel, ["foto", "unterschrift"])) fehler.push("medien-Schlüssel: " + neuerAufruf.medien.schluessel.join(","));
      const fotoOk = neuerAufruf.medien.foto && neuerAufruf.medien.foto.typ === "[object Uint8Array]" && gleich(neuerAufruf.medien.foto.kopf.slice(0, 3), [255, 216, 255]);
      const unterOk = neuerAufruf.medien.unterschrift && neuerAufruf.medien.unterschrift.typ === "[object Uint8Array]" && gleich(neuerAufruf.medien.unterschrift.kopf, [137, 80, 78, 71, 13, 10, 26, 10]);
      if (!fotoOk) fehler.push("medien.foto: " + JSON.stringify(neuerAufruf.medien.foto));
      if (!unterOk) fehler.push("medien.unterschrift: " + JSON.stringify(neuerAufruf.medien.unterschrift));
      if (!gleich(neuerAufruf.konfigSchluessel, Object.keys(VARIANTEN.standard()).sort())) fehler.push("konfig wurde verändert: " + neuerAufruf.konfigSchluessel.join(","));
      belege.push(`„Alles stimmt – Dateien erstellen“ ruft erzeugeDateien einmal auf (und bei unveränderten Angaben kein zweites Mal): Schlüssel ${neuerAufruf.schluessel.join(", ")}; antworten = Beispieldaten (alle ${Object.keys(BEISPIEL).length} Felder gleich, foto=true); heute ${neuerAufruf.heute}`);
      belege.push(`medien.foto: Uint8Array, ${neuerAufruf.medien.foto && neuerAufruf.medien.foto.laenge} Byte, Anfang ${neuerAufruf.medien.foto && neuerAufruf.medien.foto.kopf.slice(0, 3).join(" ")} (JPEG); medien.unterschrift: Uint8Array, ${neuerAufruf.medien.unterschrift && neuerAufruf.medien.unterschrift.laenge} Byte, PNG-Kopf ${unterOk ? "ja" : "NEIN"}`);
      // Anzeige: Namen mit Beschreibung
      const anzeige = await page.$$eval("#anmeldung [data-dateien] li", (l) => l.map((e) => e.textContent.replace(/\s+/g, " ").trim()));
      // Die Anzeige ist genau die Rückgabe von erzeugeDateien (Name – Beschreibung); keine feste Zeichenkette in der Seite
      const sollAnzeige = neuerAufruf.zurueck.dateien.map((d) => d.name + " – " + d.beschreibung);
      if (!gleich(anzeige, sollAnzeige) || anzeige.length !== 3) fehler.push("Anzeige der Dateien: " + JSON.stringify(anzeige) + " statt " + JSON.stringify(sollAnzeige));
      const keinWarnkasten = await page.$("#anmeldung [data-warnungen]");
      if (keinWarnkasten) fehler.push("Hinweiskasten zu Warnungen sichtbar, obwohl die Rückgabe keine hat");
      belege.push("Bildschirm 13 zeigt genau die zurückgegebenen Dateien (Name – beschreibung der Rückgabe): " + anzeige.join(" | ") + "; ohne Warnungen kein Hinweiskasten");
      // Das Passfoto ist dasselbe wie in medien.foto (Bytes gleich): über den Download geprüft (unten)
      // Herunterladen: Ordner einrichten
      const sitzung = await page.createCDPSession();
      await sitzung.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: downloads, eventsEnabled: true });
      await page.click('#anmeldung [data-aktion="herunterladen"]');
      let dateien = [];
      for (let g = 0; g < 40; g++) {
        await warte(250);
        dateien = fs.readdirSync(downloads).filter((d) => /\.(pdf|jpg)$/.test(d)).sort();
        if (dateien.length >= 3) break;
      }
      const sollNamen = ["Antrag_Gebuehrenbefreiung_Mustermann_Max.pdf", "Passfoto_Mustermann_Max.jpg", "Trainerunterlagen_Mustermann_Max.pdf"];
      if (!gleich(dateien, sollNamen)) fehler.push("heruntergeladene Dateien: " + dateien.join(", "));
      const gespeichert = dateien.map((d) => ({ name: d, bytes: fs.readFileSync(path.join(downloads, d)) }));
      const pdfOk = gespeichert.filter((g) => g.name.endsWith(".pdf")).every((g) => g.bytes.slice(0, 5).toString() === "%PDF-");
      const jpg = gespeichert.find((g) => g.name.endsWith(".jpg"));
      const jpgOk = jpg && jpg.bytes[0] === 0xff && jpg.bytes[1] === 0xd8 && jpg.bytes[2] === 0xff;
      if (!pdfOk || !jpgOk) fehler.push("Inhalt der Dateien: pdf " + pdfOk + ", jpg " + jpgOk);
      const statusSpeichern = await page.$eval("#anmeldung [data-status=fertig] .anm-status", (e) => e.textContent);
      if (!/Die Dateien werden gespeichert/.test(statusSpeichern)) fehler.push("Meldung nach dem Herunterladen: " + statusSpeichern);
      belege.push(`„Dateien herunterladen“: ${dateien.length} Dateien gespeichert (${dateien.join(", ")}), PDF mit %PDF-, JPG mit FF D8 FF; Meldung „${statusSpeichern}“`);
      // Teilen (Stellvertreter für canShare, share und Zwischenablage)
      await page.evaluate(() => { window.__stub.share.length = 0; window.__stub.schreibe.length = 0; window.__stub.reihenfolge.length = 0; });
      const teilenSichtbar = await page.$eval('#anmeldung [data-aktion="teilen"]', (e) => e.getClientRects().length > 0);
      await page.click('#anmeldung [data-aktion="teilen"]');
      await warte(300);
      const stub = await page.evaluate(() => window.__stub);
      const t0 = stub.share[0];
      if (!teilenSichtbar || stub.share.length !== 1 || !t0 || !gleich(t0.dateien.map((d) => d.name), ["Trainerunterlagen_Mustermann_Max.pdf", "Antrag_Gebuehrenbefreiung_Mustermann_Max.pdf", "Passfoto_Mustermann_Max.jpg"]) || !gleich(t0.dateien.map((d) => d.typ), ["application/pdf", "application/pdf", "image/jpeg"])) fehler.push("Teilen: " + JSON.stringify(stub.share));
      if (!(t0 && t0.title === "Trainerunterlagen Max Mustermann" && /anbei meine Unterlagen/.test(t0.text))) fehler.push("Betreff/Text beim Teilen: " + JSON.stringify(t0 && [t0.title, t0.text]));
      if (!gleich(stub.reihenfolge, ["kopiert", "share"]) || !gleich(stub.schreibe, [MAIL])) fehler.push("Adresse beim Teilen kopiert? " + JSON.stringify(stub.reihenfolge) + JSON.stringify(stub.schreibe));
      const statusTeilen = await page.$eval("#anmeldung [data-status=fertig] .anm-status", (e) => e.textContent);
      if (statusTeilen !== "Geteilt. Die Adresse ist kopiert.") fehler.push("Meldung nach dem Teilen: " + statusTeilen);
      belege.push(`„Dateien teilen“: navigator.share einmal mit ${t0 && t0.dateien.length} Dateien (${t0 && t0.dateien.map((d) => d.name + " " + d.typ).join("; ")}), Betreff „${t0 && t0.title}“; die Adresse wird vorher in die Zwischenablage gelegt (${stub.reihenfolge.join(" › ")}); Meldung „${statusTeilen}“`);
      // Vorschau: neues Fenster mit der PDF
      await page.evaluate(() => { window.__stub.oeffne.length = 0; });
      await page.click('#anmeldung [data-aktion="ansehen"]');
      await warte(200);
      const offen = await page.evaluate(() => window.__stub.oeffne);
      const blobUrl = offen.find((o) => !o.fenster && /^blob:/.test(o.url));
      const vorschauBytes = blobUrl ? await bytesVon(page, blobUrl.url) : [];
      if (!blobUrl || String.fromCharCode(...vorschauBytes.slice(0, 5)) !== "%PDF-") fehler.push("Vorschau: " + JSON.stringify(offen));
      belege.push(`„Vorschau“: öffnet ein neues Fenster (sofort im Klick) und zeigt die PDF (${vorschauBytes.length} Byte, %PDF-)`);
      // Adresse kopieren, E-Mail öffnen
      await page.evaluate(() => { window.__stub.schreibe.length = 0; });
      await page.click('#anmeldung [data-aktion="adresse-kopieren"]');
      await warte(150);
      const kopiert = await page.evaluate(() => ({ schreibe: window.__stub.schreibe, status: document.querySelector("[data-mail-status]").textContent }));
      const mailto = await page.$eval('#anmeldung [data-aktion="mail-oeffnen"]', (e) => e.getAttribute("href"));
      if (!gleich(kopiert.schreibe, [MAIL]) || kopiert.status !== "Die Adresse ist kopiert.") fehler.push("Adresse kopieren: " + JSON.stringify(kopiert));
      if (!mailto.startsWith("mailto:" + MAIL + "?subject=Trainerunterlagen%20Max%20Mustermann&body=")) fehler.push("mailto: " + mailto);
      belege.push(`„Adresse kopieren“ legt ${MAIL} in die Zwischenablage („${kopiert.status}“); „E-Mail an die Geschäftsstelle öffnen“ = ${mailto.slice(0, 80)}…`);

      // „Antrag ansehen“ auf Bildschirm 10 ruft vorschauAntrag auf
      await page.click('[data-aktion="zurueck"]');
      for (let g = 0; g < 2; g++) {
        await warteSchritt(page, g === 0 ? "pruefen" : "unterschriften", 2000);
        await page.click('[data-aktion="zurueck"]');
      }
      await warteSchritt(page, "zeugnis", 2000);
      await page.evaluate(() => { window.__stub.oeffne.length = 0; });
      await page.click('#anmeldung [data-aktion="antrag-ansehen"]');
      await warte(500);
      const a3 = await attrappe(page);
      const vorschau = a3.vorschauen[a3.vorschauen.length - 1];
      const offen2 = await page.evaluate(() => window.__stub.oeffne);
      const blob2 = offen2.find((o) => !o.fenster && /^blob:/.test(o.url));
      const bytes2 = blob2 ? await bytesVon(page, blob2.url) : [];
      if (!vorschau || !gleich(vorschau.schluessel, ["antworten", "heute", "konfig"]) || vorschau.mitMedien || !gleich(vorschau.antworten, erwarteteAntworten) || vorschau.heute !== HEUTE) fehler.push("vorschauAntrag: " + JSON.stringify(vorschau));
      if (!offen2.some((o) => o.fenster && o.ziel === "_blank") || !blob2 || String.fromCharCode(...bytes2.slice(0, 5)) !== "%PDF-") fehler.push("Antrag ansehen: " + JSON.stringify(offen2));
      belege.push(`„Antrag ansehen“ (Bildschirm 10): ruft vorschauAntrag({ ${vorschau && vorschau.schluessel.join(", ")} }) auf (${a3.vorschauen.length}×), das Fenster öffnet sofort im Klick und zeigt danach die PDF (${bytes2.length} Byte)`);
      // Eine Änderung nach dem Erstellen (Vorname über „Ändern“) macht die Dateien ungültig: Beim nächsten Besuch von „fertig“ entstehen sie neu.
      await weiter(page, "unterschriften");
      await weiter(page, "pruefen");
      await page.click('#anmeldung .anm-pruefzeile [data-aktion="aendern"]');
      await warteSchritt(page, "person");
      await text(page, "vorname", "Moritz");
      for (const s of ["einsatz", "notfall", "erfahrung", "foto", "kodex", "selbstauskunft", "zeugnis", "unterschriften", "pruefen"]) await weiter(page, s);
      await weiter(page, "fertig");
      await page.waitForSelector('#anmeldung [data-status="fertig"]', { timeout: 8000 });
      const a4 = await attrappe(page);
      const zweiter = a4.erzeugt[1];
      const neueNamen = await page.$$eval("#anmeldung [data-dateien] li", (l) => l.map((e) => e.getAttribute("data-datei")));
      if (a4.erzeugt.length !== 2 || !zweiter || zweiter.antworten.vorname !== "Moritz" || !gleich(neueNamen, ["Trainerunterlagen_Mustermann_Moritz.pdf", "Antrag_Gebuehrenbefreiung_Mustermann_Moritz.pdf", "Passfoto_Mustermann_Moritz.jpg"])) fehler.push("Neuerstellen nach einer Änderung: " + a4.erzeugt.length + " Aufrufe, " + JSON.stringify(neueNamen));
      belege.push(`Änderung nach dem Erstellen (Vorname „Moritz“): zweiter Aufruf von erzeugeDateien, neue Namen ${neueNamen.join(", ")}`);
      ende = { fehler, belege, pngKopf, pixel, png };
    }

    // =====================================================================
    // [8] Foto und Unterschrift
    // =====================================================================
    {
      const fehler = [];
      const belege = [];
      const page = await neueSeite(browser, "standard", "?code=" + TESTCODE);
      // bis zur Seite „foto“ mit den Beispieldaten
      for (const s of ["start", "person", "einsatz", "notfall", "erfahrung"]) {
        if (s !== "start") await fuelle(page, s, BEISPIEL);
        await weiter(page, SCHRITTE[SCHRITTE.indexOf(s) + 1]);
      }
      if ((await schritt(page)) !== "foto") fehler.push("nicht auf „foto“");
      const vorzustand = await page.evaluate(() => ({ vorschau: !!document.querySelector("#anmeldung .anm-vorschau-foto") && document.querySelector("#anmeldung .anm-vorschau-foto").getClientRects().length > 0, anderes: !!document.querySelector('[data-aktion="foto-anderes"]') && document.querySelector('[data-aktion="foto-anderes"]').closest(".anm-block").getClientRects().length > 0 }));
      if (vorzustand.vorschau || vorzustand.anderes) fehler.push("vor dem Foto sind Vorschau oder „Anderes Foto“ sichtbar: " + JSON.stringify(vorzustand));
      // Fehler: Datei ist kein Bild; Bild ist kaputt; ohne Foto kommt man nicht weiter
      const galerie = await page.$('#anmeldung input[data-aktion="foto-galerie"]');
      await galerie.uploadFile(textdatei);
      await page.waitForSelector("#anmeldung .anm-fehler[role=alert]:not([hidden])", { timeout: 3000 });
      const m1 = await page.$eval("#anmeldung .anm-fehler[role=alert]", (e) => e.textContent);
      await galerie.uploadFile(path.join(TESTBILDER, "kaputt.jpg"));
      await warte(400);
      const m2 = await page.$eval("#anmeldung .anm-fehler[role=alert]", (e) => e.textContent);
      if (m1 !== "Diese Datei ist kein Foto." || m2 !== "Das Bild lässt sich nicht öffnen. Bitte wähle ein anderes.") fehler.push("Fehlermeldungen beim Foto: " + m1 + " | " + m2);
      belege.push(`Fehler beim Foto: Textdatei › „${m1}“; kaputtes Bild › „${m2}“`);
      // Foto aus Datei: verkleinert, JPG, Vorschau
      await galerie.uploadFile(path.join(TESTBILDER, "foto-3x4.jpg"));
      await page.waitForSelector("#anmeldung .anm-vorschau-foto", { visible: true, timeout: 8000 });
      const vorschau1 = await page.$eval("#anmeldung .anm-vorschau-foto", (e) => ({ src: e.src, breite: e.naturalWidth, hoehe: e.naturalHeight, alt: e.alt }));
      const bytes1 = await bytesVon(page, vorschau1.src);
      const original = fs.readFileSync(path.join(TESTBILDER, "foto-3x4.jpg"));
      const jpg1 = await jpgInfo(page, bytes1);
      if (!(bytes1[0] === 255 && bytes1[1] === 216 && bytes1[2] === 255) || bytes1[bytes1.length - 2] !== 255 || bytes1[bytes1.length - 1] !== 217) fehler.push("Foto ist kein JPG (Magic Bytes)");
      if (jpg1.breite !== 375 || jpg1.hoehe !== 500) fehler.push("Maße des Fotos: " + jpg1.breite + "×" + jpg1.hoehe);
      const status1 = await page.$eval("#anmeldung .anm-status", (e) => e.textContent);
      const meldungWeg = await page.$eval("#anmeldung .anm-fehler[role=alert]", (e) => e.getClientRects().length === 0);
      if (status1 !== "Foto ist gespeichert." || !meldungWeg) fehler.push("Status nach dem Foto: " + status1);
      belege.push(`Foto aus Datei (foto-3x4.jpg, ${original.length} Byte, 375×500): als JPG gespeichert (${bytes1.length} Byte, FF D8 FF … FF D9, ${jpg1.breite}×${jpg1.hoehe}), Vorschau sichtbar (${vorschau1.breite}×${vorschau1.hoehe}), „${status1}“`);
      // Anderes Foto: ersetzt (PNG, 450×600), das alte ist weg
      const anderes = await page.$('#anmeldung input[data-aktion="foto-anderes"]');
      await anderes.uploadFile(path.join(TESTBILDER, "nachweis-hoch.png"));
      await page.waitForFunction((alt) => document.querySelector("#anmeldung .anm-vorschau-foto").src !== alt, { timeout: 8000 }, vorschau1.src);
      const vorschau2 = await page.$eval("#anmeldung .anm-vorschau-foto", (e) => ({ src: e.src, breite: e.naturalWidth, hoehe: e.naturalHeight }));
      const bytes2 = await bytesVon(page, vorschau2.src);
      const jpg2 = await jpgInfo(page, bytes2);
      if (vorschau2.src === vorschau1.src || bytes2[0] !== 255 || bytes2[1] !== 216 || jpg2.breite !== 450 || jpg2.hoehe !== 600) fehler.push("Anderes Foto: " + JSON.stringify({ vorschau2, jpg2 }));
      belege.push(`„Anderes Foto wählen“ (nachweis-hoch.png, 450×600) ersetzt das Foto: neue Vorschau, JPG ${bytes2.length} Byte, ${jpg2.breite}×${jpg2.hoehe}`);
      // Wieder das erste Foto (für den Rest); Weiter
      await anderes.uploadFile(path.join(TESTBILDER, "foto-3x4.jpg"));
      await page.waitForFunction((alt) => document.querySelector("#anmeldung .anm-vorschau-foto").src !== alt, { timeout: 8000 }, vorschau2.src);
      await weiter(page, "kodex");
      for (const s of ["kodex", "selbstauskunft", "zeugnis"]) {
        await fuelle(page, s, BEISPIEL);
        await weiter(page, SCHRITTE[SCHRITTE.indexOf(s) + 1]);
      }
      if ((await schritt(page)) !== "unterschriften") fehler.push("nicht auf „unterschriften“");
      // Unterschrift mit der Maus
      const stand0 = await page.$eval("#anmeldung .anm-unterschrift__stand", (e) => e.textContent);
      await unterschreibe(page, "maus");
      const standMaus = await page.$eval("#anmeldung .anm-unterschrift__stand", (e) => e.textContent);
      // Löschen
      await page.click("#anmeldung .anm-unterschrift__loeschen");
      await warte(200);
      const standLeer = await page.$eval("#anmeldung .anm-unterschrift__stand", (e) => e.textContent);
      await weiter(page);
      await warte(200);
      const anzLeer = await fehlerAnzeige(page);
      const noch = await schritt(page);
      if (stand0 !== "Noch nicht unterschrieben" || standMaus !== "Unterschrieben" || standLeer !== "Noch nicht unterschrieben" || noch !== "unterschriften" || !anzLeer.amFeld.some((f) => f.text === "Bitte unterschreibe im Feld.")) fehler.push("Unterschrift löschen: " + JSON.stringify({ stand0, standMaus, standLeer, noch, anzLeer }));
      belege.push(`Unterschrift mit der Maus: „${stand0}“ › „${standMaus}“; „Unterschrift löschen“ › „${standLeer}“; ohne Unterschrift kein Weiter („${(anzLeer.amFeld.find((f) => f.feld === "unterschrift") || {}).text}“)`);
      // Touch (Fingereingabe)
      await unterschreibe(page, "touch");
      const standTouch = await page.$eval("#anmeldung .anm-unterschrift__stand", (e) => e.textContent);
      if (standTouch !== "Unterschrieben") fehler.push("Touch: " + standTouch);
      // Zu kurz (nur ein Punkt): „Zu kurz“
      await page.click("#anmeldung .anm-unterschrift__loeschen");
      const canvas = await page.$("#anmeldung canvas.anm-unterschrift__leinwand");
      const box = await canvas.boundingBox();
      await page.mouse.click(box.x + 40, box.y + 40);
      await warte(150);
      const standKurz = await page.$eval("#anmeldung .anm-unterschrift__stand", (e) => e.textContent);
      if (standKurz !== "Zu kurz. Bitte unterschreibe ganz.") fehler.push("Zu kurz: " + standKurz);
      await page.click("#anmeldung .anm-unterschrift__loeschen");
      await unterschreibe(page, "touch");
      await kreuze(page, "satzung");
      const nachTouch = await weiter(page, "pruefen");
      if (nachTouch !== "pruefen") fehler.push("Weiter nach der Touch-Unterschrift: " + nachTouch + " " + JSON.stringify(await fehlerAnzeige(page)));
      const url2 = (await page.$("#anmeldung img.anm-vorschau-unterschrift")) ? await page.$eval("#anmeldung img.anm-vorschau-unterschrift", (e) => e.src) : "";
      const png2 = url2 ? await bytesVon(page, url2) : [];
      const pixel2 = png2.length ? await pngPixel(page, png2) : null;
      belege.push(`Unterschrift per Touch-Ereignis (touchStart/touchMove/touchEnd): „${standTouch}“; ein einzelner Punkt: „${standKurz}“`);
      const pruefePixel = (name, p, kopf) => {
        if (!p) {
          fehler.push(`Pixelprüfung ${name}: kein Bild`);
          return `${name}: kein Bild`;
        }
        const ok = kopf === "137,80,78,71,13,10,26,10" && p.deckend > 150 && p.anteil < 0.5 && p.durchsichtigeEcke === 0 && p.farbe && p.farbe[2] > p.farbe[0] + 40 && p.farbe[0] < 90 && p.umriss[2] - p.umriss[0] > p.breite * 0.8;
        if (!ok) fehler.push(`Pixelprüfung ${name}: ${JSON.stringify(p)} Kopf ${kopf}`);
        return `${name}: PNG ${p.breite}×${p.hoehe}, ${p.deckend} deckende Pixel (${(p.anteil * 100).toFixed(1)} %), durchsichtiger Grund, Tinte rgb(${p.farbe && p.farbe.join(",")}), Striche über ${(((p.umriss[2] - p.umriss[0]) / p.breite) * 100).toFixed(0)} % der Breite`;
      };
      belege.push("Pixelprüfung (Vorschau auf „pruefen“ = medien.unterschrift): " + pruefePixel("Maus", ende.pixel, ende.pngKopf) + "; " + pruefePixel("Touch", pixel2, png2.slice(0, 8).join(",")));
      await schliesseSeite(page);
      kriterium(8, "Foto (Datei, verkleinert, JPG, Vorschau, ersetzen) und Unterschrift (Maus, Touch, löschen, Pixelprüfung)", fehler.length === 0, belege.join("\n") + (fehler.length ? "\nFEHLER:\n" + fehler.join("\n") : ""));
    }

    // =====================================================================
    // [4] Prüfregeln im Browser: Fehlerfälle je Seite
    // =====================================================================
    {
      const fehler = [];
      const belege = [];
      let faelle = 0;
      const page = await neueSeite(browser, "standard", "?code=" + TESTCODE);
      const erwarte = async (name, s, erwartet) => {
        // „Weiter“ blockiert: Meldung am Feld und in der Liste, Bildschirm bleibt
        await weiter(page);
        await warte(150);
        const anz = await fehlerAnzeige(page);
        const geblieben = (await schritt(page)) === s;
        const amFeld = anz.amFeld.map((f) => f.feld + ": " + f.text);
        faelle += erwartet.length;
        for (const [feld, meldung] of erwartet) {
          const hat = anz.amFeld.some((f) => f.feld === feld && f.text === meldung);
          const inListe = anz.liste.some((l) => l.endsWith(meldung));
          if (!hat || !inListe) fehler.push(`${name}: erwartet ${feld} › „${meldung}“, am Feld: ${JSON.stringify(amFeld)}, Liste: ${JSON.stringify(anz.liste)}`);
          const markiert = await page.evaluate((f) => { const h = Array.from(document.querySelectorAll("[data-feld]")).find((e) => e.getAttribute("data-feld") === f); return !!h && h.classList.contains("anm-feld--fehler"); }, feld);
          if (!markiert) fehler.push(`${name}: ${feld} nicht als Fehler markiert`);
        }
        if (!geblieben) fehler.push(`${name}: Weiter ging trotz Fehler weiter (${await schritt(page)})`);
        if (anz.liste.length !== erwartet.length) fehler.push(`${name}: ${anz.liste.length} Einträge in der Liste, erwartet ${erwartet.length}: ${JSON.stringify(anz.liste)}`);
        return anz;
      };
      const M = T.fehler;
      // start › person
      await weiter(page, "person");
      // alles leer
      await erwarte("person leer", "person", [["vorname", M.vorname], ["nachname", M.nachname], ["geburtsdatum", M.datumLeer], ["anschrift.strasse", M.strasse], ["anschrift.plz", M.plz], ["anschrift.ort", M.ort], ["handy", M.handy], ["email", M.email]]);
      // unter 18: Geburtsdatum 24.11.2008 (am Stichtag 17 Jahre)
      await text(page, "vorname", "Max");
      await text(page, "nachname", "Mustermann");
      await datum(page, "geburtsdatum", "2008-11-24");
      await text(page, "anschrift.strasse", "Musterstraße 12");
      await text(page, "anschrift.plz", "6032");
      await text(page, "anschrift.ort", "Frankfurt am Main");
      await text(page, "handy", "12345");
      await text(page, "email", "max@example");
      await erwarte("person: unter 18, PLZ, Handy, E-Mail", "person", [["geburtsdatum", M.unter18], ["anschrift.plz", M.plz], ["handy", M.nummerKurz], ["email", M.email]]);
      // Fehler verschwinden beim Korrigieren (die Meldung eines Feldes geht weg, sobald es stimmt)
      await text(page, "anschrift.plz", "60326");
      await warte(100);
      let anz = await fehlerAnzeige(page);
      if (anz.amFeld.some((f) => f.feld === "anschrift.plz")) fehler.push("Meldung zur PLZ bleibt nach der Korrektur stehen");
      await text(page, "handy", "0170 abc");
      await datum(page, "geburtsdatum", "1988-03-14");
      await erwarte("person: Handy mit Buchstaben", "person", [["handy", M.nummerZeichen], ["email", M.email]]);
      await text(page, "handy", "0170 1234567");
      await text(page, "email", "max.mustermann@example.com");
      anz = await fehlerAnzeige(page);
      if (anz.amFeld.length || anz.liste.length) fehler.push("person: Fehler bleiben nach der Korrektur: " + JSON.stringify(anz));
      await weiter(page, "einsatz");
      // einsatz: nichts gewählt; Abteilung ohne Mannschaft und Rolle; „Seit wann“ zu weit in der Zukunft
      await erwarte("einsatz leer", "einsatz", [["abteilung", M.abteilung], ["seit", M.datumLeer]]);
      await karte(page, "abteilung", "fussball");
      await datum(page, "seit", "2027-03-24");
      await erwarte("einsatz: ohne Mannschaft und Rolle, Datum in vier Monaten", "einsatz", [["mannschaft", M.mannschaft], ["rolle", M.rolle], ["seit", M.seitZuSpaet]]);
      // Abteilung wechseln: Karneval heißt „Gruppe“, Torwarttrainer gibt es nicht
      await karte(page, "abteilung", "karneval");
      const karnevalFeld = await page.evaluate(() => ({ label: document.querySelector('#anmeldung [data-feld="mannschaft"] label').textContent, rollen: Array.from(document.querySelectorAll('#anmeldung input[data-pfad="rolle"]')).map((e) => e.getAttribute("data-wert")), optionen: Array.from(document.querySelectorAll('#anmeldung select[data-pfad="mannschaft"] option')).map((o) => o.textContent) }));
      if (karnevalFeld.label !== "Gruppe" || karnevalFeld.rollen.includes("torwarttrainer") || !gleich(karnevalFeld.optionen, ["Bitte wählen", ...GRUPPEN_KARNEVAL])) fehler.push("Karneval: " + JSON.stringify(karnevalFeld));
      belege.push(`Abteilung Karneval: Auswahl heißt „${karnevalFeld.label}“ mit den Gruppen aus der Konfiguration, Rollen ${karnevalFeld.rollen.join("/")} (kein Torwarttrainer)`);
      await karte(page, "abteilung", "fussball");
      await page.select(feldSel("mannschaft"), "D3-Jugend");
      await karte(page, "rolle", "torwarttrainer");
      await datum(page, "seit", "2026-11-02");
      await weiter(page, "notfall");
      // Wechsel der Abteilung leert die Rolle (Torwarttrainer fiel weg): hier unverändert, weil nach Fußball zurück gewählt wurde
      await erwarte("notfall leer", "notfall", [["notfall.name", M.notfallName], ["notfall.beziehung", M.notfallBeziehung], ["notfall.telefon", M.notfallTelefon]]);
      await text(page, "notfall.name", "Erika Mustermann");
      await text(page, "notfall.beziehung", "Partnerin");
      await text(page, "notfall.telefon", "0170");
      await erwarte("notfall: Telefon zu kurz", "notfall", [["notfall.telefon", M.nummerKurz]]);
      await text(page, "notfall.telefon", "0170 7654321");
      await weiter(page, "erfahrung");
      // erfahrung
      await erwarte("erfahrung leer", "erfahrung", [["beruf", M.beruf], ["ersteHilfe", M.ersteHilfe]]);
      await text(page, "beruf", "Elektriker");
      await karte(page, "ersteHilfe", "ja");
      await datum(page, "ersteHilfeAm", "2027-05-12");
      await erwarte("erfahrung: Kurs „ja“ mit Datum in der Zukunft", "erfahrung", [["ersteHilfeAm", M.datumZukunft]]);
      await karte(page, "ersteHilfe", "nein");
      await datum(page, "ersteHilfeBis", "2026-10-01");
      await erwarte("erfahrung: Kurs „nein“ mit Datum in der Vergangenheit", "erfahrung", [["ersteHilfeBis", M.datumVergangenheit]]);
      await datum(page, "ersteHilfeBis", "2026-12-15");
      await weiter(page, "foto");
      // Der Rest des Datums von „ja“ (2027-05-12) darf nicht mitgehen: Die Seite hat es beim Verlassen verworfen (siehe Aufruf unten)
      // foto
      await erwarte("foto leer", "foto", [["foto", M.foto]]);
      const eingabe = await page.$('#anmeldung input[data-aktion="foto-machen"]');
      await eingabe.uploadFile(path.join(TESTBILDER, "foto-3x4.jpg"));
      await page.waitForSelector("#anmeldung .anm-vorschau-foto", { visible: true, timeout: 8000 });
      await warte(100);
      anz = await fehlerAnzeige(page);
      if (anz.amFeld.length || anz.liste.length) fehler.push("Fehler zum Foto bleibt nach dem Foto stehen");
      await weiter(page, "kodex");
      await erwarte("kodex nicht angekreuzt", "kodex", [["kodexGelesen", M.kodex]]);
      await kreuze(page, "kodexGelesen");
      await weiter(page, "selbstauskunft");
      await erwarte("selbstauskunft nicht angekreuzt", "selbstauskunft", [["selbstauskunft", M.selbstauskunft]]);
      await kreuze(page, "selbstauskunft");
      await weiter(page, "zeugnis");
      await erwarte("zeugnis ohne Wahl", "zeugnis", [["zeugnis", M.zeugnis]]);
      await karte(page, "zeugnis", "beantragen");
      await weiter(page, "unterschriften");
      await erwarte("unterschriften leer", "unterschriften", [["unterschrift", M.unterschrift], ["satzung", M.satzung]]);
      await unterschreibe(page, "maus");
      await erwarte("unterschriften: nur die Satzung fehlt", "unterschriften", [["satzung", M.satzung]]);
      await kreuze(page, "satzung");
      await weiter(page, "pruefen");
      // Sicherung vor „Dateien erstellen“: Wer über „Zurück“ bis zur Seite „person“ geht, dort den Nachnamen löscht und mit der Vorwärts-Taste des
      // Browsers nach „fertig“ springt, kommt nicht an: Die erste Seite mit einer Lücke öffnet mit ihren Meldungen.
      await weiter(page, "fertig");
      await page.waitForSelector('#anmeldung [data-status="fertig"]', { timeout: 8000 });
      await page.evaluate(() => history.go(-10));
      await warteSchritt(page, "person");
      await text(page, "nachname", "");
      await page.evaluate(() => history.go(10));
      await warte(400);
      const nachVor = await schritt(page);
      const luecke = await fehlerAnzeige(page);
      belege.push(`Sicherung vor „Dateien erstellen“: Nachname gelöscht und die Vorwärts-Taste des Browsers › Bildschirm „${nachVor}“ mit „${luecke.liste.join(" | ")}“`);
      if (nachVor !== "person" || !luecke.liste.some((l) => l.endsWith(M.nachname))) fehler.push("Sicherung: " + nachVor + " " + JSON.stringify(luecke));
      faelle += 1;
      // Rohtext eines unvollständigen Datums (Tag fehlt) zählt als Fehler
      await text(page, "nachname", "Mustermann");
      await text(page, "geburtsdatum.t", "");
      await erwarte("person: Datum unvollständig", "person", [["geburtsdatum", M.datumUnvollstaendig]]);
      await text(page, "geburtsdatum.t", "31");
      await text(page, "geburtsdatum.m", "02");
      await erwarte("person: Datum gibt es nicht", "person", [["geburtsdatum", M.datumUngueltig]]);
      const alleFaelle = faelle + node.faelle;
      belege.push(`${faelle} Fehlermeldungen im Browser (je Seite 1 bis 3; Meldung am Feld und in der Liste oben, Feld markiert, „Weiter“ blockiert, Meldung verschwindet nach der Korrektur) und ${node.faelle} Fälle in Node = ${alleFaelle} Prüfungen`);
      kriterium(4, "Prüfregeln im Browser: Fehlerfälle zeigen die Meldung und blockieren „Weiter“; gültige Eingaben lassen weiter", fehler.length === 0 && faelle >= 15, belege.join("\n") + (fehler.length ? "\nFEHLER:\n" + fehler.join("\n") : ""));
      await schliesseSeite(page);
    }

    // =====================================================================
    // [6] Einsichtnehmende aus der Konfiguration: eine Person, zwei, drei, keine
    // =====================================================================
    {
      const fehler = [];
      const belege = [];
      for (const [variante, personen] of [["standard", EINSICHT.eine], ["zwei", EINSICHT.zwei], ["drei", EINSICHT.drei], ["keine", EINSICHT.keine]]) {
        const sollen = einsichtErwartet(personen);
        const page = await neueSeite(browser, variante, "?code=" + TESTCODE);
          const texte = {};
        for (const s of SCHRITTE.slice(1)) {
          await warteSchritt(page, s);
          if (s === "zeugnis" || s === "pruefen" || s === "fertig") {
            if (s === "fertig") await page.waitForSelector('#anmeldung [data-status="fertig"]', { timeout: 8000 });
            texte[s] = await page.evaluate(() => ({ listen: Array.from(document.querySelectorAll("#anmeldung li, #anmeldung .anm-hinweiskasten p")).filter((e) => e.getClientRects().length > 0).map((e) => e.textContent.replace(/\s+/g, " ").trim()), alles: document.getElementById("anmeldung").innerText.replace(/\s+/g, " ") }));
            if (s === "zeugnis") texte[s].gesamt = await sichtbarerText(page);
          }
          if (s === "fertig") break;
          await fuelle(page, s, BEISPIEL, "maus");
          await weiter(page, SCHRITTE[SCHRITTE.indexOf(s) + 1]);
        }
        const ok10 = texte.zeugnis && texte.zeugnis.listen.includes(sollen.schritt10);
        const ok12 = texte.pruefen && texte.pruefen.listen.some((t) => t.endsWith(sollen.kasten12));
        const ok13 = texte.fertig && texte.fertig.listen.some((t) => t.endsWith(sollen.schritt13) || t === sollen.schritt13);
        if (!ok10) fehler.push(`${variante}: Bildschirm 10, Punkt 4 – erwartet „${sollen.schritt10}“, Liste: ${JSON.stringify(texte.zeugnis && texte.zeugnis.listen.filter((t) => /zeigst das Zeugnis/.test(t)))}`);
        if (!ok12) fehler.push(`${variante}: Bildschirm 12 – erwartet „${sollen.kasten12}“, ist ${JSON.stringify(texte.pruefen && texte.pruefen.listen.filter((t) => /Führungszeugnis bringst/.test(t)))}`);
        if (!ok13) fehler.push(`${variante}: Bildschirm 13 – erwartet „${sollen.schritt13}“, ist ${JSON.stringify(texte.fertig && texte.fertig.listen.filter((t) => /Zeigst es/.test(t)))}`);
        // kein Name außerhalb der Konfiguration: Bei einer anderen Besetzung steht kein Name der Standardbesetzung, wo er nicht hingehört
        const fremdeNamen = ["Florian", "Müller", "Kindeswohlbeauftragte"].filter((n) => ["zeugnis", "pruefen", "fertig"].some((s) => (texte[s] ? texte[s].alles : "").includes(n)));
        if (fremdeNamen.length) fehler.push(`${variante}: Namen aus dem Entwurf auf den Bildschirmen: ${fremdeNamen.join(", ")}`);
        if (variante === "keine" && /undefined|\{lang\}|\{kurz\}|null/.test(["zeugnis", "pruefen", "fertig"].map((s) => texte[s] ? texte[s].alles : "").join(" "))) fehler.push("keine Personen: Platzhalter oder undefined sichtbar");
        const kl = ["Melanie", "Seipp", "Vertretung", "Erika Beispiel"].filter((n) => ["zeugnis", "pruefen", "fertig"].some((s) => (texte[s] ? texte[s].alles : "").includes(n)));
        const erwartetKl = personen.flatMap((p) => p.name.split(" ")).filter((n) => ["Melanie", "Seipp", "Vertretung", "Erika"].includes(n));
        for (const n of kl) if (!erwartetKl.some((e) => n.includes(e))) fehler.push(`${variante}: „${n}“ steht auf den Bildschirmen, ist aber nicht in der Konfiguration`);
        belege.push(`${variante} (${personen.length} ${personen.length === 1 ? "Person" : "Personen"}): 10 › „${sollen.schritt10.slice(0, 95)}…“ ${ok10 ? "ok" : "FEHLER"}; 12 › „${sollen.kasten12}“ ${ok12 ? "ok" : "FEHLER"}; 13 › „${sollen.schritt13}“ ${ok13 ? "ok" : "FEHLER"}`);
        await schliesseSeite(page);
      }
      // Zeugnis schon vorhanden: nur das persönliche Zeigen bleibt (Bildschirm 10) und auf 13 entfallen die Schritte zum Antrag
      {
        const page = await neueSeite(browser, "standard", "?code=" + TESTCODE);
          const d = { ...BEISPIEL, zeugnis: "vorhanden" };
        for (const s of SCHRITTE.slice(1)) {
          await warteSchritt(page, s);
          if (s === "zeugnis") {
            await fuelle(page, s, d);
            await warte(100);
            const z = await page.evaluate(() => ({ antrag: Array.from(document.querySelectorAll("#anmeldung section.anm-nachweis")).some((e) => e.getClientRects().length > 0 && /Gebührenbefreiung/.test(e.textContent)), schritte: Array.from(document.querySelectorAll("#anmeldung ol.anm-naechste li")).filter((e) => e.getClientRects().length > 0).map((e) => e.textContent.trim().slice(0, 40)) }));
            if (z.antrag || z.schritte.length !== 1 || !/^Du zeigst das Zeugnis persönlich/.test(z.schritte[0])) fehler.push("Zeugnis vorhanden, Bildschirm 10: " + JSON.stringify(z));
            belege.push(`„Ich habe schon ein aktuelles erweitertes Führungszeugnis“: Bildschirm 10 ohne Antrag und ohne die Schritte davor (bleibt: ${z.schritte[0]}…)`);
          }
          if (s === "pruefen") {
            const zeile = await page.evaluate(() => Array.from(document.querySelectorAll("#anmeldung .anm-pruefzeile")).filter((e) => e.querySelector("dt").textContent === "Zeugnis").map((e) => e.querySelector("dd").textContent)[0]);
            if (zeile !== "Ich habe schon ein aktuelles erweitertes Führungszeugnis") fehler.push("Zeile Zeugnis auf 12: " + zeile);
          }
          if (s === "fertig") {
            await page.waitForSelector('#anmeldung [data-status="fertig"]', { timeout: 8000 });
            const z = await page.evaluate(() => ({ dateien: Array.from(document.querySelectorAll("#anmeldung [data-dateien] li")).map((e) => e.getAttribute("data-datei")), schritte: Array.from(document.querySelectorAll("#anmeldung .anm-ergebnis ol.anm-naechste li")).map((e) => e.textContent.trim()) }));
            if (z.dateien.length !== 2 || z.dateien.some((n) => /Antrag/.test(n)) || z.schritte.length !== 2 || !/^Du: Zeigst es persönlich/.test(z.schritte[0])) fehler.push("Zeugnis vorhanden, Bildschirm 13: " + JSON.stringify(z));
            belege.push(`Bildschirm 13 bei vorhandenem Zeugnis: ${z.dateien.length} Dateien (ohne Antrag), ${z.schritte.length} Schritte (${z.schritte.map((t) => t.slice(0, 18)).join(" | ")})`);
            break;
          }
          await fuelle(page, s, d);
          await weiter(page, SCHRITTE[SCHRITTE.indexOf(s) + 1]);
        }
        await schliesseSeite(page);
      }
      kriterium(6, "Einsichtnehmende aus der Konfiguration (eine Person, zwei, drei, keine) auf Bildschirm 10, 12 und 13 im Wortlaut von GEMEINSAM.md 3", fehler.length === 0, belege.join("\n") + (fehler.length ? "\nFEHLER:\n" + fehler.join("\n") : ""));
    }

    // =====================================================================
    // [9] Löschen, Teilen ohne Unterstützung, Fehler beim Laden von trainer-pdf.js, Sonderfälle
    // =====================================================================
    {
      const fehler = [];
      const belege = [];

      // ---- Alle Angaben löschen (mit Rückfrage), dann leer ----
      {
        const page = await neueSeite(browser, "standard", "?code=" + TESTCODE);
          const nichtVerlassen = () => page.evaluate(() => { const e = new Event("beforeunload", { cancelable: true }); window.dispatchEvent(e); return e.defaultPrevented; });
        const frisch = await nichtVerlassen();
        for (const s of SCHRITTE.slice(1)) {
          await warteSchritt(page, s);
          if (s === "pruefen") break;
          await fuelle(page, s, BEISPIEL, "maus");
          await weiter(page, SCHRITTE[SCHRITTE.indexOf(s) + 1]);
        }
        const mitDaten = await nichtVerlassen();
        if (frisch || !mitDaten) fehler.push(`beforeunload: frisch ${frisch}, mit Daten ${mitDaten}`);
        // Löschen fragt nach; „Nein, behalten“ ändert nichts
        await page.click('#anmeldung [data-aktion="loeschen-alles"]');
        const dialog = await page.$eval("dialog.anm-dialog--loeschen", (d) => ({ offen: d.open, titel: d.querySelector("h2").textContent, text: d.querySelector("p").textContent, knoepfe: Array.from(d.querySelectorAll("button")).map((b) => b.textContent) }));
        if (!dialog.offen || dialog.titel !== "Alle Angaben löschen?" || dialog.text !== "Dann sind alle Angaben und Fotos weg. Das geht nicht rückgängig." || !gleich(dialog.knoepfe, ["Ja, alles löschen", "Nein, behalten"])) fehler.push("Löschen-Dialog: " + JSON.stringify(dialog));
        await page.click('[data-aktion="loeschen-nein"]');
        const zu = await page.$eval("dialog.anm-dialog--loeschen", (d) => !d.open);
        const nochDa = await page.$$eval("#anmeldung .anm-pruefzeile", (l) => l.length);
        if (!zu || (await schritt(page)) !== "pruefen" || nochDa < 15) fehler.push("„Nein, behalten“ ändert etwas");
        // „Ja“: Zustand und Anzeige leer
        await page.click('#anmeldung [data-aktion="loeschen-alles"]');
        await page.click('[data-aktion="loeschen-ja"]');
        await warteSchritt(page, "start");
        const meldung = await page.$eval(".anm-meldung", (e) => e.textContent);
        const nachLoeschen = await nichtVerlassen();
        if (meldung !== "Alle Angaben sind gelöscht." || nachLoeschen) fehler.push("nach dem Löschen: Meldung „" + meldung + "“, beforeunload " + nachLoeschen);
        const leer = {};
        await weiter(page, "person");
        leer.person = await page.$$eval("#anmeldung input[data-pfad], #anmeldung textarea[data-pfad]", (l) => l.filter((e) => e.value !== "").map((e) => e.getAttribute("data-pfad")));
        // Die übrigen Seiten sind nur über „Weiter“ erreichbar: Jede wird erst im leeren Zustand gelesen, dann mit den Beispieldaten gefüllt.
        await fuelle(page, "person", BEISPIEL);
        await weiter(page, "einsatz");
        leer.einsatz = await page.evaluate(() => ({ gewaehlt: Array.from(document.querySelectorAll("#anmeldung input[type=radio]:checked, #anmeldung input[type=checkbox]:checked")).length, auswahl: !!document.querySelector('#anmeldung select[data-pfad="mannschaft"]'), datum: Array.from(document.querySelectorAll("#anmeldung input[data-pfad^='seit.']")).map((e) => e.value) }));
        await fuelle(page, "einsatz", BEISPIEL);
        await weiter(page, "notfall");
        await fuelle(page, "notfall", BEISPIEL);
        await weiter(page, "erfahrung");
        leer.erfahrung = await page.evaluate(() => ({ beruf: document.querySelector('[data-pfad="beruf"]').value, gewaehlt: document.querySelectorAll("#anmeldung input[type=radio]:checked").length }));
        await fuelle(page, "erfahrung", BEISPIEL);
        await weiter(page, "foto");
        leer.foto = await page.evaluate(() => ({ vorschau: document.querySelector("#anmeldung .anm-vorschau-foto").getClientRects().length > 0 }));
        await fuelle(page, "foto", BEISPIEL);
        await weiter(page, "kodex");
        leer.kodex = await page.evaluate(() => document.querySelectorAll("#anmeldung input[type=checkbox]:checked").length);
        await fuelle(page, "kodex", BEISPIEL);
        await weiter(page, "selbstauskunft");
        leer.selbst = await page.evaluate(() => document.querySelectorAll("#anmeldung input[type=checkbox]:checked").length);
        await fuelle(page, "selbstauskunft", BEISPIEL);
        await weiter(page, "zeugnis");
        leer.zeugnis = await page.evaluate(() => document.querySelectorAll("#anmeldung input[type=radio]:checked").length);
        await fuelle(page, "zeugnis", BEISPIEL);
        await weiter(page, "unterschriften");
        leer.unterschrift = await page.evaluate(() => ({ stand: document.querySelector("#anmeldung .anm-unterschrift__stand").textContent, satzung: document.querySelector('[data-pfad="satzung"]').checked }));
        const gesamtLeer = leer.person.length === 0 && leer.einsatz.gewaehlt === 0 && !leer.einsatz.auswahl && leer.einsatz.datum.every((v) => v === "") && leer.erfahrung.beruf === "" && leer.erfahrung.gewaehlt === 0 && leer.foto.vorschau === false && leer.kodex === 0 && leer.selbst === 0 && leer.zeugnis === 0 && leer.unterschrift.stand === "Noch nicht unterschrieben" && !leer.unterschrift.satzung;
        if (!gesamtLeer) fehler.push("nach dem Löschen nicht leer: " + JSON.stringify(leer));
        belege.push(`„Alle Angaben löschen“: Rückfrage („Nein, behalten“ ändert nichts); „Ja, alles löschen“ › Bildschirm „start“ mit „${meldung}“; danach sind alle Felder leer (Person, Einsatz, Notfall, Erfahrung, Foto, Kodex, Selbstauskunft, Zeugnis, Unterschrift, Satzung), die Warnung vor dem Verlassen entfällt (vorher: ${mitDaten ? "ja" : "nein"}, frisch: ${frisch ? "ja" : "nein"})`);
        // Neues Foto und Unterschrift nach dem Löschen kommen frisch an (nicht die alten Bytes): komplett durchlaufen, Attrappe prüft
        await unterschreibe(page, "touch");
        await kreuze(page, "satzung");
        await weiter(page, "pruefen");
        await weiter(page, "fertig");
        await page.waitForSelector('#anmeldung [data-status="fertig"]', { timeout: 8000 });
        const a = await attrappe(page);
        const letzter = a.erzeugt[a.erzeugt.length - 1];
        if (a.erzeugt.length !== 1 || !letzter.medien.foto || !letzter.medien.unterschrift) fehler.push("Erstellen nach dem Löschen: " + JSON.stringify(a.erzeugt.map((x) => x.medien)));
        // Speicher des Browsers: nichts abgelegt
        const speicher = await page.evaluate(async () => ({ local: localStorage.length, session: sessionStorage.length, cookie: document.cookie, dbs: indexedDB.databases ? (await indexedDB.databases()).length : 0, caches: typeof caches !== "undefined" ? (await caches.keys()).length : 0 }));
        if (speicher.local || speicher.session || speicher.cookie || speicher.dbs || speicher.caches) fehler.push("Speicher des Browsers nicht leer: " + JSON.stringify(speicher));
        belege.push(`Speicher des Browsers nach einem ganzen Durchlauf: localStorage ${speicher.local}, sessionStorage ${speicher.session}, Cookies „${speicher.cookie}“, IndexedDB ${speicher.dbs}, Caches ${speicher.caches} (nichts abgelegt)`);
        // Anfragen: nur Laden der eigenen Dateien per GET
        await schliesseSeite(page);
      }

      // ---- Teilen: Rückfälle ----
      for (const [modus, erwartung] of [["fehler", "gespeichert"], ["abbruch", "nichts"], ["nein", "ohne"]]) {
        const page = await neueSeite(browser, "standard", "?code=" + TESTCODE, { teilen: modus });
          const sitzung = await page.createCDPSession();
        const ziel = fs.mkdtempSync(path.join(downloads, "t-"));
        await sitzung.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: ziel, eventsEnabled: true });
        await bisPruefen(page);
        await weiter(page, "fertig");
        await page.waitForSelector('#anmeldung [data-status="fertig"]', { timeout: 8000 });
        const teilenSichtbar = await page.$eval('#anmeldung [data-aktion="teilen"]', (e) => e.getClientRects().length > 0);
        if (erwartung === "ohne") {
          const primaer = await page.$eval('#anmeldung [data-aktion="herunterladen"]', (e) => !e.classList.contains("knopf--sekundaer"));
          if (teilenSichtbar || !primaer) fehler.push("ohne Teilen: Knopf sichtbar " + teilenSichtbar + ", Herunterladen primär " + primaer);
          belege.push("Browser ohne navigator.share: „Dateien teilen“ ist verborgen, „Dateien herunterladen“ ist der Hauptknopf");
        } else {
          if (!teilenSichtbar) fehler.push(modus + ": Teilen nicht sichtbar");
          await page.click('#anmeldung [data-aktion="teilen"]');
          await warte(2500);
          const status = await page.$eval("#anmeldung [data-status=fertig] .anm-status", (e) => e.textContent);
          const dateien = fs.readdirSync(ziel);
          if (erwartung === "gespeichert") {
            if (dateien.length !== 3 || status !== "Teilen geht hier nicht. Die Dateien wurden stattdessen gespeichert.") fehler.push("Teilen scheitert: " + dateien.join(",") + " / " + status);
            belege.push(`Teilen scheitert (Fehler des Browsers): ${dateien.length} Dateien stattdessen gespeichert, Meldung „${status}“`);
          } else {
            if (dateien.length !== 0 || status !== "") fehler.push("Abbruch beim Teilen: " + dateien.join(",") + " / " + status);
            belege.push("Teilen abgebrochen (AbortError): nichts gespeichert, keine Meldung");
          }
        }
        await schliesseSeite(page);
      }
      // Zwischenablage verweigert: Teilen geht trotzdem, die Meldung nennt die Adresse nicht
      {
        const page = await neueSeite(browser, "standard", "?code=" + TESTCODE, { zwischenablage: "nein" });
          await bisPruefen(page);
        await weiter(page, "fertig");
        await page.waitForSelector('#anmeldung [data-status="fertig"]', { timeout: 8000 });
        await page.click('#anmeldung [data-aktion="teilen"]');
        await warte(400);
        const status = await page.$eval("#anmeldung [data-status=fertig] .anm-status", (e) => e.textContent);
        await page.click('#anmeldung [data-aktion="adresse-kopieren"]');
        await warte(200);
        const statusAdresse = await page.$eval("[data-mail-status]", (e) => e.textContent);
        if (status !== "Geteilt." || statusAdresse !== "Kopieren geht hier nicht. Die Adresse ist markiert. Kopiere die Adresse selbst.") fehler.push("Zwischenablage verweigert: " + status + " / " + statusAdresse);
        belege.push(`Zwischenablage verweigert: Teilen › „${status}“ (ohne Adresse); „Adresse kopieren“ › „${statusAdresse}“`);
        await schliesseSeite(page);
      }

      // ---- trainer-pdf.js ist geladen, wirft aber beim Erstellen (Art bibliothek, zum Beispiel pdf-lib oder die Schrift nicht erreichbar) ----
      for (const [modus, sollText, sollArt] of [["wirft-einmal", "Ein Programmteil lässt sich nicht laden. Bitte prüfe die Internetverbindung.", "bibliothek"], ["wirft", "Ein Programmteil lässt sich nicht laden. Bitte prüfe die Internetverbindung.", "bibliothek"]]) {
        server.pdfModus = modus;
        const page = await neueSeite(browser, "standard", "?code=" + TESTCODE);
        page.__st.erwartetKonsole = [/Trainerseite: Dateien nicht erstellt/, /Test: Bibliothek fehlt/];
        await bisPruefen(page);
        // „Antrag ansehen“, wenn das Erstellen scheitert: Meldung statt nichts (Bildschirm 10)
        await page.click('[data-aktion="zurueck"]');
        await warteSchritt(page, "unterschriften");
        await page.click('[data-aktion="zurueck"]');
        await warteSchritt(page, "zeugnis");
        let meldungAntrag = { text: "(nicht geprüft: Das Modul wirft nur beim Erstellen)", sichtbar: true };
        if (modus !== "wirft-einmal") {
          await page.click('#anmeldung [data-aktion="antrag-ansehen"]');
          await warte(500);
          meldungAntrag = await page.$eval("#anmeldung .anm-fehler[role=alert]", (e) => ({ text: e.textContent, sichtbar: e.getClientRects().length > 0 }));
          if (!meldungAntrag.sichtbar || !meldungAntrag.text) fehler.push(modus + ": „Antrag ansehen“ ohne Meldung");
        }
        await weiter(page, "unterschriften");
        await weiter(page, "pruefen");
        await weiter(page, "fertig");
        await page.waitForSelector('#anmeldung [data-status="fehler"]', { timeout: 8000 });
        const ansicht = await page.evaluate(() => ({ titel: document.querySelector("#anmeldung h2").textContent, text: document.querySelector('#anmeldung [data-status="fehler"] .hinweis p:last-child').textContent.replace(/\s+/g, " ").trim(), knoepfe: Array.from(document.querySelectorAll('#anmeldung [data-status="fehler"] button')).map((b) => b.textContent), dateien: document.querySelectorAll("#anmeldung [data-dateien] li").length }));
        if (ansicht.titel !== "Das hat nicht geklappt" || !ansicht.text.endsWith(sollText) || !ansicht.knoepfe.includes("Noch einmal versuchen") || ansicht.dateien !== 0) fehler.push(`${modus}: ${JSON.stringify(ansicht)} statt „${sollText}“`);
        belege.push(`trainer-pdf.js ${modus === "wirft-einmal" ? "wirft beim ersten Erstellen (Art " + sollArt + ")" : "wirft immer (Art " + sollArt + ")"}: „${ansicht.titel}“ – „${ansicht.text}“ mit „Noch einmal versuchen“ und „Hilfe“ (kein leerer Bildschirm); „Antrag ansehen“ meldet „${meldungAntrag.text}“`);
        // Hilfe aus der Fehleransicht
        await page.click('#anmeldung [data-aktion="hilfe-fehler"]');
        const hilfeOffen = await page.$eval("[data-hilfe]", (e) => e.getClientRects().length > 0);
        if (!hilfeOffen) fehler.push(modus + ": „Hilfe“ in der Fehleransicht öffnet nichts");
        // „Noch einmal versuchen“ ruft erzeugeDateien noch einmal auf: wirft-einmal (zweiter Aufruf gelingt) erholt sich; wirft scheitert weiter (gleiche Meldung)
        await page.click('#anmeldung [data-aktion="nochmal"]');
        const erholt = await page.waitForSelector('#anmeldung [data-status="fertig"]', { timeout: modus === "wirft" ? 1500 : 6000 }).then(() => true, () => false);
        const nach = await page.evaluate(() => document.querySelector("#anmeldung h2").textContent);
        if (modus === "wirft" ? erholt || nach !== "Das hat nicht geklappt" : !erholt) fehler.push(`${modus}: nach „Noch einmal versuchen“ ${erholt ? "Dateien erstellt" : "weiterhin „" + nach + "“"}`);
        belege.push(`  „Noch einmal versuchen“ danach: ${erholt ? "Dateien erstellt" : "weiterhin „" + nach + "“ (Modul wirft immer)"}`);
        await schliesseSeite(page);
      }
      server.pdfModus = "attrappe";

      // ---- trainer-pdf.js lädt mit der Seite (T1b): Anfrage beim Start, danach keine weitere; scheitert sie (503), steht „Ladefehler“ da ----
      // Grund: Safari merkt sich ein gescheitertes import() für die ganze Sitzung. Ein Laden erst beim Erstellen, nach zehn Minuten Eingabe, hülfe
      // nach einem Fehler dort nie mehr; so zeigt sich ein Fehler beim Start, wenn noch nichts eingegeben ist. Chrome zeigt den Unterschied nicht
      // (er wiederholt richtig), darum prüft der Test die Anfrage selbst: Zeitpunkt und Sec-Fetch-Dest.
      {
        const PDF = "/assets/js/anmeldung/trainer-pdf.js";
        const anfragenPdf = () => server.dest.filter((a) => a.pfad === PDF);
        // beim Start angefordert, vor jeder Eingabe, als Skript (Sec-Fetch-Dest: script), einmal
        server.pdfModus = "attrappe";
        server.dest.length = 0;
        const page = await neueSeite(browser, "standard", "?code=" + TESTCODE);
        const beimStart = anfragenPdf().map((a) => `${a.methode} ${a.dest || "(ohne Sec-Fetch-Dest)"} ${a.status}`);
        const alleModule = server.dest.filter((a) => /^\/assets\/js\/anmeldung\/.*\.js$/.test(a.pfad));
        const keinSkript = alleModule.filter((a) => a.dest !== "script");
        if (!gleich(beimStart, ["GET script 200"])) fehler.push("trainer-pdf.js beim Start angefordert: " + JSON.stringify(beimStart) + " statt [GET script 200]");
        if (keinSkript.length) fehler.push("Module des Starts nicht als Skript angefordert: " + keinSkript.map((a) => a.pfad + " " + a.dest).join(", "));
        belege.push(`trainer-pdf.js beim Start der Seite angefordert, noch vor jeder Eingabe: ${beimStart.join("; ")} (Sec-Fetch-Dest script; alle ${alleModule.length} Module des Starts als Skript, keines per fetch)`);
        // danach alle Bildschirme bis zu den fertigen Dateien: keine weitere Anfrage an trainer-pdf.js
        await bisPruefen(page);
        await weiter(page, "fertig");
        const erstellt = await page.waitForSelector('#anmeldung [data-status="fertig"]', { timeout: 6000 }).then(() => true, () => false);
        const nachErstellen = anfragenPdf().length;
        if (!erstellt) fehler.push("trainer-pdf.js beim Start geladen: die Dateien wurden danach nicht erstellt");
        if (nachErstellen !== 1) fehler.push(`trainer-pdf.js nach dem Erstellen ${nachErstellen}× angefordert statt 1×`);
        belege.push(`  nach dem Erstellen der Dateien (Bildschirm „fertig“): trainer-pdf.js insgesamt ${nachErstellen}× angefordert (kein Laden zur Laufzeit)`);
        await schliesseSeite(page);

        // scheitert trainer-pdf.js beim Start (503): Text „Ladefehler“ (wie die echte Seite) statt eines leeren Bildschirms
        server.pdfModus = "503";
        server.dest.length = 0;
        const p2 = await neueSeite(browser, "standard", "?code=" + TESTCODE, {
          ohneBereit: true,
          erwartetKonsole: [/Failed to load resource.*503/, /Trainerseite: Start fehlgeschlagen/, /Failed to fetch dynamically imported module/],
          erwartetAntwort: [/^503 .*\/assets\/js\/anmeldung\/trainer-pdf\.js$/],
          // Chrome bricht die Anfrage nach der Antwort 503 ab (net::ERR_ABORTED), weil ein Modul mit Fehlerstatus nicht ausgeführt wird
          erwartetNetz: [/\/assets\/js\/anmeldung\/trainer-pdf\.js$/],
        });
        const ladefehler = "Die Seite lässt sich nicht laden. Bitte schreib an " + MAIL + ".";
        const ansicht = await p2.evaluate(() => {
          const w = document.getElementById("anmeldung");
          return { text: w.textContent.trim(), bereit: w.hasAttribute("data-bereit"), schritt: w.getAttribute("data-schritt"), formulare: w.querySelectorAll("form").length, knoepfe: w.querySelectorAll("button").length, sichtbar: w.getClientRects().length > 0 };
        });
        const antworten503 = anfragenPdf().map((a) => a.status);
        if (ansicht.text !== ladefehler || ansicht.bereit || ansicht.schritt || ansicht.formulare || ansicht.knoepfe || !ansicht.sichtbar) fehler.push("trainer-pdf.js 503 beim Start: " + JSON.stringify(ansicht) + " statt „" + ladefehler + "“");
        if (!antworten503.length || antworten503.some((x) => x !== 503)) fehler.push("trainer-pdf.js 503: Antworten des Servers " + JSON.stringify(antworten503));
        belege.push(`trainer-pdf.js nicht erreichbar (Server antwortet ${antworten503.join(", ")}): beim Start steht „${ansicht.text}“ (kein leerer Bildschirm, kein Formular, keine Knöpfe; Seite nicht „bereit“)`);
        // Der Server ist wieder erreichbar: Neuladen startet die Seite normal (es war noch nichts eingegeben, nichts geht verloren)
        server.pdfModus = "attrappe";
        await p2.reload({ waitUntil: "networkidle0" });
        const bereit = await p2.waitForSelector("#anmeldung[data-bereit]", { timeout: 10000 }).then(() => true, () => false);
        const nachNeuladen = bereit ? await schritt(p2) : null;
        if (!bereit || nachNeuladen !== "start") fehler.push(`trainer-pdf.js 503: nach dem Neuladen ${bereit ? "Bildschirm „" + nachNeuladen + "“" : "nicht bereit"} statt „start“`);
        belege.push(`  Server wieder erreichbar, Seite neu geladen: Bildschirm „${nachNeuladen}“ (normaler Start)`);
        await schliesseSeite(p2);
        server.pdfModus = "attrappe";
      }

      // ---- Warnungen der Erzeugung: Hinweiskasten, der Rest bleibt benutzbar ----
      {
        server.pdfModus = "warnt";
        const page = await neueSeite(browser, "standard", "?code=" + TESTCODE);
        const sitzung = await page.createCDPSession();
        const ziel = fs.mkdtempSync(path.join(downloads, "w-"));
        await sitzung.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: ziel, eventsEnabled: true });
        await bisPruefen(page);
        await weiter(page, "fertig");
        await page.waitForSelector('#anmeldung [data-status="fertig"]', { timeout: 8000 });
        const w = await page.evaluate(() => {
          const k = document.querySelector("#anmeldung [data-warnungen]");
          return k ? { n: k.getAttribute("data-warnungen"), sichtbar: k.getClientRects().length > 0, titel: k.querySelector("p:first-child").textContent, text: k.querySelector("p:last-child").textContent, klasse: k.className, alles: document.getElementById("anmeldung").innerText } : null;
        });
        if (!w || !w.sichtbar || w.titel !== "Bitte prüfen" || w.text !== "Bitte prüfe die Vorschau: In den Dateien fehlen vielleicht einzelne Zeichen." || w.n !== "1") fehler.push("Hinweiskasten zu Warnungen: " + JSON.stringify(w));
        if (w && /steht als \?|Zeichen einer Angabe/.test(w.alles)) fehler.push("Der Text der Warnung steht auf dem Bildschirm");
        // Der Rest ist unverändert benutzbar: Dateien, Herunterladen, Wege zum Verein
        const rest = await page.evaluate(() => ({ dateien: document.querySelectorAll("#anmeldung [data-dateien] li").length, herunterladen: !!document.querySelector('#anmeldung [data-aktion="herunterladen"]'), senden: !!document.querySelector("#anmeldung [data-senden]"), weiter: !!document.querySelector("#anmeldung ol.anm-naechste") }));
        await page.click('#anmeldung [data-aktion="herunterladen"]');
        let dl = [];
        for (let g = 0; g < 30 && dl.length < 3; g++) {
          await warte(250);
          dl = fs.readdirSync(ziel);
        }
        if (rest.dateien !== 3 || !rest.herunterladen || !rest.senden || !rest.weiter || dl.length !== 3) fehler.push("Bildschirm mit Warnung nicht voll benutzbar: " + JSON.stringify({ rest, dl }));
        belege.push(`Warnungen in der Rückgabe (${w && w.n}): Hinweiskasten „${w && w.titel}“ – „${w && w.text}“ (Klasse ${w && w.klasse.split(" ")[0]}), der Text der Warnung selbst steht nicht auf dem Bildschirm; Dateiliste, Knöpfe und Wege zum Verein unverändert, Herunterladen gibt ${dl.length} Dateien`);
        await schliesseSeite(page);
        server.pdfModus = "attrappe";
      }

      // ---- Meldung zu jeder Art von Fehler (TrainerPdfFehler, LadeFehler, unbekannt) ----
      {
        server.pdfModus = "wirft-art";
        const page = await neueSeite(browser, "standard", "?code=" + TESTCODE, { initScript: 'window.__naechsteArt = "angaben";' });
        page.__st.erwartetKonsole = [/Trainerseite: Dateien nicht erstellt/, /Test: /];
        await bisPruefen(page);
        await weiter(page, "fertig");
        const meldungen = {
          angaben: "Eine Angabe fehlt oder passt nicht. Bitte gehe zurück und prüfe deine Angaben.",
          konfig: "Die Seite ist noch nicht ganz eingerichtet. Bitte schreib an " + MAIL + ".",
          "unterschrift-fehlt": "Deine Unterschrift fehlt oder lässt sich nicht lesen. Bitte gehe zurück und unterschreibe noch einmal.",
          "unterschrift-format": "Deine Unterschrift fehlt oder lässt sich nicht lesen. Bitte gehe zurück und unterschreibe noch einmal.",
          "foto-fehlt": "Dein Passfoto fehlt oder lässt sich nicht lesen. Bitte gehe zurück und wähle das Foto noch einmal.",
          "foto-format": "Dein Passfoto fehlt oder lässt sich nicht lesen. Bitte gehe zurück und wähle das Foto noch einmal.",
          bibliothek: "Ein Programmteil lässt sich nicht laden. Bitte prüfe die Internetverbindung.",
          pdf: "Die Dateien konnten nicht erstellt werden. Bitte versuche es noch einmal.",
          intern: "Die Dateien konnten nicht erstellt werden. Bitte versuche es noch einmal.",
          ohne: "Die Dateien konnten nicht erstellt werden. Bitte versuche es noch einmal.",
        };
        const lesen = () => page.evaluate(() => {
          const v = document.querySelector('#anmeldung [data-status="fehler"]');
          return v ? { titel: document.querySelector("#anmeldung h2").textContent, text: v.querySelector(".hinweis p:last-child").textContent.trim(), knoepfe: Array.from(v.querySelectorAll("button")).map((b) => b.textContent) } : null;
        });
        const arten = Object.keys(meldungen);
        const ok = [];
        for (let i = 0; i < arten.length; i++) {
          const art = arten[i];
          if (i > 0) {
            await page.evaluate((a) => { window.__naechsteArt = a; }, art);
            await page.click('#anmeldung [data-aktion="nochmal"]');
          }
          await page.waitForFunction((t) => { const v = document.querySelector('#anmeldung [data-status="fehler"] .hinweis p:last-child'); return !!v && v.textContent.trim() === t; }, { timeout: 3000 }, meldungen[art]).catch(() => {});
          const m = await lesen();
          const gut = !!m && m.titel === "Das hat nicht geklappt" && m.text === meldungen[art] && m.knoepfe.includes("Noch einmal versuchen") && m.knoepfe.includes("Hilfe");
          if (!gut) fehler.push(`Fehlerart „${art}“: ${JSON.stringify(m)} statt „${meldungen[art]}“`);
          ok.push(art + (gut ? "" : " (FEHLER)"));
        }
        belege.push(`Meldung je Fehlerart (immer mit „Noch einmal versuchen“ und „Hilfe“, nie ein leerer Bildschirm): ${ok.join(", ")}`);
        // Danach gelingt es wieder
        await page.evaluate(() => { window.__naechsteArt = ""; });
        await page.click('#anmeldung [data-aktion="nochmal"]');
        const wieder = await page.waitForSelector('#anmeldung [data-status="fertig"]', { timeout: 6000 }).then(() => true, () => false);
        if (!wieder) fehler.push("nach den Fehlern gelingt „Noch einmal versuchen“ nicht");
        await schliesseSeite(page);
        server.pdfModus = "attrappe";
      }

      // ---- Sonderfälle der Konfiguration ----
      {
        const page = await neueSeite(browser, "sonderfall", "?code=" + TESTCODE);
          await weiter(page, "person");
        await fuelle(page, "person", BEISPIEL);
        await weiter(page, "einsatz");
        // Karneval ohne Gruppen in der Konfiguration: freier Text
        await karte(page, "abteilung", "karneval");
        const feldArt = await page.evaluate(() => ({ select: !!document.querySelector('#anmeldung select[data-pfad="mannschaft"]'), eingabe: !!document.querySelector('#anmeldung input[data-pfad="mannschaft"]'), label: document.querySelector('#anmeldung [data-feld="mannschaft"] label').textContent }));
        await text(page, "mannschaft", "Tanzmäuse");
        await karte(page, "rolle", "trainer");
        await datum(page, "seit", "2026-11-02");
        const hinweis = await page.evaluate(() => Array.from(document.querySelectorAll("#anmeldung .anm-hinweis")).map((e) => e.textContent).find((t) => /Schnupperphase/.test(t)));
        if (!feldArt.eingabe || feldArt.select || feldArt.label !== "Gruppe") fehler.push("Karneval ohne Gruppen: " + JSON.stringify(feldArt));
        if (hinweis !== "Die Schnupperphase dauert 2 Monate. Deine Unterlagen sind spätestens am 02.01.2027 fällig.") fehler.push("Schnupperphase 2 Monate: " + hinweis);
        belege.push(`Sonderfall: Karneval ohne Gruppen in der Konfiguration › freies Textfeld „${feldArt.label}“; zwei Monate Schnupperphase › „${hinweis}“`);
        for (const s of ["einsatz", "notfall", "erfahrung", "foto", "kodex", "selbstauskunft", "zeugnis", "unterschriften"]) {
          if (s !== "einsatz") {
            await warteSchritt(page, s);
            await fuelle(page, s, BEISPIEL);
          }
          if (s === "unterschriften") break;
          await weiter(page, SCHRITTE[SCHRITTE.indexOf(s) + 1]);
        }
        // ohne Links und ohne Ort: Hinweis statt „Satzung lesen“, nur das Datum
        const u = await page.evaluate(() => ({ text: document.getElementById("anmeldung").innerText.replace(/\s+/g, " "), links: Array.from(document.querySelectorAll('#anmeldung a[target="_blank"]')).length }));
        if (!/Die Satzung findest du auf der Internetseite des Vereins\./.test(u.text) || /Satzung lesen/.test(u.text) || !/Datum: 23\.11\.2026/.test(u.text) || /Ort und Datum/.test(u.text) || u.links !== 0) fehler.push("ohne Satzungslink und Ort: " + JSON.stringify(u));
        belege.push("ohne Satzungsadresse und ohne Ort: „Die Satzung findest du auf der Internetseite des Vereins.“ statt des Links, „Datum: 23.11.2026“ statt „Ort und Datum“");
        await schliesseSeite(page);
      }
      // ---- Nur die Abteilung Fußball (Karneval vorerst außen vor, Melli 24.11.2026) ----
      {
        const page = await neueSeite(browser, "nurfussball", "?code=" + TESTCODE);
        await weiter(page, "person");
        await fuelle(page, "person", BEISPIEL);
        await weiter(page, "einsatz");
        const bild = await page.evaluate((sel) => {
          const wurzel = document.getElementById("anmeldung");
          return {
            frage: !!wurzel.querySelector(sel),
            text: wurzel.innerText.replace(/\s+/g, " "),
            labels: Array.from(wurzel.querySelectorAll("label")).map((l) => l.textContent.trim()),
            optionen: Array.from(wurzel.querySelectorAll('select[data-pfad="mannschaft"] option')).map((o) => o.textContent.trim()).filter(Boolean),
          };
        }, feldSel("abteilung"));
        if (bild.frage || /Abteilung/.test(bild.text)) fehler.push("nur Fußball: Die Frage nach der Abteilung steht auf dem Bildschirm");
        if (/Karneval|Gruppe/.test(bild.text) || bild.optionen.some((o) => GRUPPEN_KARNEVAL.includes(o))) fehler.push("nur Fußball: Karneval oder eine Gruppe erscheint auf dem Bildschirm: " + JSON.stringify(bild.optionen));
        if (!bild.labels.includes("Mannschaft") || !bild.optionen.includes("D3-Jugend")) fehler.push("nur Fußball: Auswahl „Mannschaft“ fehlt oder ohne D3-Jugend: " + JSON.stringify(bild));
        // ohne Frage weiter: Die Abteilung steht schon auf Fußball, der Bildschirm lässt sich verlassen
        await page.select(feldSel("mannschaft"), "D3-Jugend");
        await karte(page, "rolle", "co-trainer");
        await datum(page, "seit", "2026-11-02");
        await weiter(page, "notfall");
        belege.push(`nur Abteilung Fußball (Karneval vorerst außen vor): keine Frage nach der Abteilung, kein Karneval, ${bild.optionen.length} Mannschaften zur Auswahl, „Weiter“ führt zum Bildschirm „Notfall“`);
        await schliesseSeite(page);
      }
      {
        const page = await neueSeite(browser, "ohnemail", "?code=" + TESTCODE);
          await page.click('[data-aktion="hilfe"]');
        const hilfe = await page.$eval("[data-hilfe]", (e) => e.textContent.trim());
        if (hilfe !== "Fragen? Schreib an die Geschäftsstelle.") fehler.push("ohne Adresse: Hilfe „" + hilfe + "“");
        belege.push(`ohne Adresse der Geschäftsstelle: Hilfe sagt „${hilfe}“ (kein „undefined“, keine leere Stelle)`);
        await schliesseSeite(page);
      }
      // „Code anfragen“: E-Mail mit Betreff
      {
        const page = await neueSeite(browser, "standard", "");
          const href = await page.$eval('[data-aktion="code-anfragen"]', (e) => e.getAttribute("href"));
        if (href !== "mailto:" + MAIL + "?subject=Code%20f%C3%BCr%20Neu%20im%20Trainerteam") fehler.push("Code anfragen: " + href);
        belege.push(`„Code anfragen“: ${href}`);
        await schliesseSeite(page);
      }
      kriterium(9, "Ende: Löschen, Dateien erstellen und anzeigen, Teilen (mit Rückfall), Herunterladen, Vorschau, Antrag ansehen, Fehler beim Laden von trainer-pdf.js", fehler.length === 0 && ende.fehler.length === 0,
        [...ende.belege, ...belege].join("\n") + (fehler.length || ende.fehler.length ? "\nFEHLER:\n" + [...ende.fehler, ...fehler].join("\n") : ""));
    }

    // =====================================================================
    // Echter PDF-Baustein (T2), sobald trainer-pdf.js existiert (nicht mit --ohne-echt)
    // =====================================================================
    if (MIT_ECHT) {
      const fehler = [];
      const belege = [];
      if (!fs.existsSync(path.join(JS_ORDNER, "trainer-pdf.js"))) {
        fehler.push("assets/js/anmeldung/trainer-pdf.js fehlt");
      } else {
        server.pdfModus = "echt";
        // pdftotext (poppler), wenn vorhanden: Zeichenketten in den erzeugten PDF suchen
        const pdftotext = ["/opt/homebrew/bin/pdftotext", "/usr/local/bin/pdftotext", "/usr/bin/pdftotext"].find((x) => fs.existsSync(x));
        const lang = (n, wort) => (wort.repeat(Math.ceil(n / wort.length))).slice(0, n).trim();
        const BEISPIEL_LANG = {
          ...BEISPIEL,
          vorname: lang(40, "Maximilian-Alexander-"),
          nachname: lang(40, "Mustermann-Musterfrau-"),
          anschrift: { strasse: lang(60, "Allerheiligenstraße-Musterweg "), plz: "60326", ort: lang(50, "Frankfurt am Main-Sachsenhausen ") },
          handy: "+49 170 / 123-4567 890 12",
          email: "maximilian.alexander.mustermann.musterfrau@beispiel-adresse.example.com",
          notfall: { name: lang(60, "Erika Mustermann-Musterfrau "), beziehung: lang(40, "Lebensgefährtin und Mutter "), telefon: "0170 7654321" },
          beruf: lang(60, "Elektroniker für Energie- und Gebäudetechnik "),
          erfahrung: lang(300, "Jugendtrainer bei einem anderen Verein, E-Jugend und D-Jugend, Torwarttraining, Turnierleitung, Elternarbeit. "),
          sonstiges: lang(300, "DFB-Basislizenz, Fortbildung Kinderschutz, Schiedsrichterschein, Übungsleiter C Breitensport. "),
        };
        const faelle = [
          { name: "Beispiel (Fußball, Co-Trainer, Antrag)", d: BEISPIEL, antrag: true, suche: ["Mustermann", "Max", "D3-Jugend", "Elektriker", "Erika Mustermann", "Melanie Seipp", "02.12.2026"] },
          { name: "Torwarttrainer, Zeugnis vorhanden", d: { ...BEISPIEL, rolle: "torwarttrainer", zeugnis: "vorhanden" }, antrag: false, suche: ["Torwarttrainer", "D3-Jugend"] },
          { name: "Karneval, Betreuer, Erste Hilfe geplant", d: { ...BEISPIEL, abteilung: "karneval", mannschaft: GRUPPEN_KARNEVAL[0], rolle: "betreuer", ersteHilfe: "nein", ersteHilfeAm: null, ersteHilfeBis: "2026-12-15" }, antrag: true, suche: ["Betreuer", GRUPPEN_KARNEVAL[0], "15.12.2026"] },
          { name: "längste Eingaben (alle Felder an der Grenze)", d: BEISPIEL_LANG, antrag: true, suche: [] },
        ];
        for (const f of faelle) {
          const page = await neueSeite(browser, "standard", "?code=" + TESTCODE, { ohneStubs: false });
          const sitzung = await page.createCDPSession();
          const ziel = fs.mkdtempSync(path.join(downloads, "echt-"));
          await sitzung.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: ziel, eventsEnabled: true });
          await bisPruefen(page, f.d, "maus");
          if (f.antrag === true && f.d === BEISPIEL) {
            // Antrag ansehen (Bildschirm 10) mit dem echten Modul
            await page.click('[data-aktion="zurueck"]');
            await warteSchritt(page, "unterschriften");
            await page.click('[data-aktion="zurueck"]');
            await warteSchritt(page, "zeugnis");
            await page.evaluate(() => { window.__stub.oeffne.length = 0; });
            await page.click('#anmeldung [data-aktion="antrag-ansehen"]');
            await page.waitForFunction(() => window.__stub.oeffne.some((o) => !o.fenster && /^blob:/.test(o.url)), { timeout: 30000 }).catch(() => {});
            const offen = await page.evaluate(() => window.__stub.oeffne);
            const blob = offen.find((o) => !o.fenster && /^blob:/.test(o.url));
            const antragBytes = blob ? await bytesVon(page, blob.url) : [];
            if (!blob || String.fromCharCode(...antragBytes.slice(0, 5)) !== "%PDF-") fehler.push("echtes vorschauAntrag: " + JSON.stringify(offen) + " " + (await page.$eval("#anmeldung .anm-fehler[role=alert]", (e) => e.textContent).catch(() => "")));
            belege.push(`„Antrag ansehen“ mit dem echten Modul: ${antragBytes.length} Byte, %PDF-`);
            await weiter(page, "unterschriften");
            await weiter(page, "pruefen");
          }
          const t0 = Date.now();
          await weiter(page, "fertig");
          await page.waitForSelector('#anmeldung [data-status="fertig"], #anmeldung [data-status="fehler"]', { timeout: 60000 });
          const ms = Date.now() - t0;
          const art = await page.$eval("#anmeldung [data-status]", (e) => e.getAttribute("data-status"));
          if (art !== "fertig") {
            fehler.push(`${f.name}: Fehleransicht „${await page.$eval("#anmeldung", (e) => e.innerText.replace(/\s+/g, " ").slice(0, 260))}“`);
            await schliesseSeite(page);
            continue;
          }
          const anzeige = await page.$$eval("#anmeldung [data-dateien] li", (l) => l.map((e) => e.textContent.replace(/\s+/g, " ").trim()));
          const echt = await page.evaluate(() => (window.__echt && window.__echt.erzeugt[window.__echt.erzeugt.length - 1]) || null);
          if (!echt) {
            fehler.push(`${f.name}: keine Aufzeichnung des echten Moduls`);
            await schliesseSeite(page);
            continue;
          }
          // Die Anzeige ist genau die Rückgabe des echten Moduls (Name – beschreibung)
          const soll = echt.dateien.map((x) => x.name + " – " + x.beschreibung);
          if (!gleich(anzeige, soll)) fehler.push(`${f.name}: Anzeige ${JSON.stringify(anzeige)} statt der Rückgabe ${JSON.stringify(soll)}`);
          if (echt.dateien.length !== (f.d.zeugnis === "beantragen" ? 3 : 2) || echt.dateien.some((x) => x.laenge < 500)) fehler.push(`${f.name}: Dateien der Rückgabe ${JSON.stringify(echt.dateien.map((x) => x.name + " " + x.laenge))}`);
          const warnkasten = !!(await page.$("#anmeldung [data-warnungen]"));
          if (warnkasten !== echt.warnungen.length > 0) fehler.push(`${f.name}: Hinweiskasten ${warnkasten}, Warnungen der Rückgabe ${echt.warnungen.length}`);
          // Herunterladen: Dateien da, PDF mit %PDF-, JPG mit FF D8 FF
          await page.click('#anmeldung [data-aktion="herunterladen"]');
          let dateien = [];
          for (let g = 0; g < 60; g++) {
            await warte(250);
            dateien = fs.readdirSync(ziel).filter((d) => /\.(pdf|jpg)$/.test(d)).sort();
            if (dateien.length >= echt.dateien.length) break;
          }
          const gross = dateien.map((d) => d + " " + fs.statSync(path.join(ziel, d)).size + " Byte");
          const pdfOk = dateien.filter((d) => d.endsWith(".pdf")).every((d) => fs.readFileSync(path.join(ziel, d)).slice(0, 5).toString() === "%PDF-");
          const jpgDatei = dateien.find((d) => d.endsWith(".jpg"));
          const jpgOk = jpgDatei && fs.readFileSync(path.join(ziel, jpgDatei)).slice(0, 3).toString("hex") === "ffd8ff";
          if (!gleich(dateien, echt.dateien.map((x) => x.name).sort()) || !pdfOk || !jpgOk) fehler.push(`${f.name}: heruntergeladen ${gross.join(", ")}`);
          // Inhalt der Paket-PDF mit pdftotext (wenn vorhanden): Die Angaben der Seite stehen in der Datei
          let textInfo = "pdftotext nicht gefunden";
          if (pdftotext) {
            const paket = dateien.find((d) => d.startsWith("Trainerunterlagen_"));
            const r = spawnSync(pdftotext, ["-layout", path.join(ziel, paket), "-"], { encoding: "utf8" });
            const txt = (r.stdout || "").replace(/\s+/g, " ");
            const fehlen = f.suche.filter((x) => !txt.includes(x));
            if (fehlen.length) fehler.push(`${f.name}: in der Paket-PDF fehlen ${JSON.stringify(fehlen)}`);
            const antragDatei = dateien.find((d) => d.startsWith("Antrag_"));
            if (antragDatei) {
              const ra = spawnSync(pdftotext, ["-layout", path.join(ziel, antragDatei), "-"], { encoding: "utf8" });
              const ta = (ra.stdout || "").replace(/\s+/g, " ");
              if (!ta.includes(f.d.nachname.slice(0, 20)) || !/Nr\. 2 Buchst\. a/.test(ta)) fehler.push(`${f.name}: Antrag ohne Name oder ohne „Nr. 2 Buchst. a“`);
            }
            textInfo = `Paket-PDF enthält ${f.suche.length - fehlen.length} von ${f.suche.length} gesuchten Angaben${antragDatei ? "; Antrag enthält Name und „Nr. 2 Buchst. a“" : ""}`;
          }
          belege.push(`${f.name}: ${anzeige.length} Dateien nach ${ms} ms (${anzeige.map((x) => x.split(" – ")[0]).join(", ")}); Anzeige = Rückgabe; Warnungen ${echt.warnungen.length} (Hinweiskasten ${warnkasten ? "ja" : "nein"}); heruntergeladen: ${gross.join(", ")}; ${textInfo}`);
          await schliesseSeite(page);
        }
      }
      server.pdfModus = "attrappe";
      kriterium(9, "Ende mit dem echten trainer-pdf.js: Dateien erstellen, anzeigen (= Rückgabe), herunterladen, Antrag ansehen, Warnungen", fehler.length === 0, belege.join("\n") + (fehler.length ? "\nFEHLER:\n" + fehler.join("\n") : ""));
    }

    // =====================================================================
    // [7] Konsole, Netz, Hosts über alle Läufe
    // =====================================================================
    {
      const konsole = [];
      const netz = [];
      const hosts = new Set();
      for (const p of geoeffnet) {
        const st = p.__st;
        konsole.push(...st.konsole.map((x) => `[${st.name}] ${x}`));
        netz.push(...[...st.antworten, ...st.fehlgeschlagen].map((x) => `[${st.name}] ${x}`));
        for (const h of st.hosts) hosts.add(h);
      }
      const fremd = [...hosts].filter((h) => h !== "127.0.0.1:" + PORT);
      const nichtGet = server.anfragen.filter((a) => /trainer\/senden|\/api\//.test(a));
      kriterium(7, "Konsole ohne Fehler und Warnungen, keine fehlgeschlagene Netzanfrage, keine externen Hosts (über alle Läufe)", konsole.length === 0 && netz.length === 0 && fremd.length === 0 && nichtGet.length === 0,
        `${geoeffnet.length} Seitenaufrufe beobachtet; Konsole (Fehler und Warnungen der Seite): ${konsole.length}${konsole.length ? "\n" + [...new Set(konsole)].join("\n") : ""}\n` +
        `Netz (HTTP ab 400 oder fehlgeschlagen): ${netz.length}${netz.length ? "\n" + [...new Set(netz)].join("\n") : ""}\n` +
        `Hosts: ${[...hosts].join(", ") || "keine"}${fremd.length ? " – FREMD: " + fremd.join(", ") : " (nur der Testserver)"}; Anfragen an den Server: ${server.anfragen.length}, nur GET der eigenen Dateien`);
    }
  } finally {
    for (const p of geoeffnet) await schliesseSeite(p);
    await browser.close().catch(() => {});
    await new Promise((ok) => server.http.close(ok));
    fs.rmSync(downloads, { recursive: true, force: true });
    // Aufräumen: Port frei, kein Chrome von diesem Lauf
    let chromeNoch = false;
    try {
      process.kill(chromePid, 0);
      chromeNoch = true;
    } catch (fehler) {
      chromeNoch = false;
    }
    const lsof = spawnSync("lsof", ["-nP", `-iTCP:${PORT}`, "-sTCP:LISTEN"], { encoding: "utf8" });
    const portFrei = !(lsof.stdout || "").trim();
    kriterium(12, "Aufräumen: Server auf Port " + PORT + " beendet, Chrome dieses Laufs beendet", portFrei && !chromeNoch, `lsof -iTCP:${PORT}: ${portFrei ? "leer" : lsof.stdout.trim()}; Chrome-Prozess ${chromePid}: ${chromeNoch ? "läuft noch" : "beendet"}`);
  }
}

haupt()
  .then(() => {
    const zusammen = `\n${fehlerAnzahl === 0 ? "ALLES OK" : fehlerAnzahl + " Prüfung(en) mit FEHLER"}`;
    console.log(zusammen);
    zeilen.push(zusammen);
    try {
      fs.mkdirSync(AUSGABE, { recursive: true });
      fs.writeFileSync(path.join(AUSGABE, "ergebnis.txt"), zeilen.join("\n") + "\n");
    } catch (fehler) {
      /* Protokoll ist nur eine Zugabe */
    }
    process.exitCode = fehlerAnzahl === 0 ? 0 : 1;
  })
  .catch(async (fehler) => {
    console.error("Abbruch:", fehler);
    try {
      if (server.http) server.http.close();
    } catch (e) {
      /* egal */
    }
    process.exit(2);
  });
