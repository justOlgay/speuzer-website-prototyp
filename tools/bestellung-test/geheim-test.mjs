#!/usr/bin/env node
// Geheimhaltungs-Test der Bestellseite: Steht irgendwo im öffentlichen Repo oder in der Seite ein Wert aus der privaten Preisdatei?
//
// Die echten Preise (Listenpreise, Rabatt, Preise je Aufdruck, Prüfsummen aus dem Angebot) liegen nur verschlüsselt im Repo
// (data/bestellung-preise.enc.json) und in einer privaten, gitignorierten Datei. Dieser Test liest die private Datei, wenn die
// Umgebungsvariable BESTELLUNG_PREISE_PRIVAT auf sie zeigt, und prüft:
//   1. Aus allen Zahlen der Datei (Listenpreise, Grundpreise nach Rabatt, Zuschläge, Stückpreise mit Standard-Aufdrucken, Prüfsummen)
//      entstehen beide Schreibweisen mit zwei Nachkommastellen (Punkt und Komma: 12.34 und 12,34). Keine dieser Schreibweisen darf in einer von
//      git verfolgten Datei (auch nicht in einer neuen, noch nicht verfolgten) und in keiner Datei unter docs/ stehen. Dazu der Rabattsatz in der
//      Form „<Satz> %“ und als rabattProzent. In den Dateien der Bestellseite (Pfad mit „bestellung“) gilt es strenger: Dort zählen auch
//      die kurzen Schreibweisen (12.5 für 12,50 €; 12.0 und „12 €“ für volle Euro). In fremden Dateien sind sie zu unspezifisch (Versionsnummern wie 7.5).
//   2. Dasselbe gilt für die neuen Zeilen in der Ausgabe von „git log -p da77c2f..HEAD“ (Commit-Texte und hinzugefügte Zeilen; Hunk-Köpfe und
//      entfernte Zeilen zählen nicht): kein Wert in keinem Commit dieser Arbeit.
//   3. Mit mailtext.js wird je Artikel und Gruppe der Stückpreis mit den Standard-Aufdrucken nachgerechnet und mit den „pruefsummen“ der
//      Datei verglichen: Die Rechnung der Seite stimmt mit dem Angebot überein.
// Die Ausgabe nennt nie einen Wert, nur Anzahlen und Dateipfade: „n Werte geprüft, 0 Treffer, n Prüfsummen stimmen“.
//
// Nicht durchsucht werden nur Bilder, Schriften, PDF und andere Binärdateien (CSS und SVG sind Text und gehören zur Suche).
// Ein Treffer in einer Datei, die nachweislich nichts mit der Bestellseite zu tun hat (zum Beispiel eine alte Seite mit einer Uhrzeit „14.30“),
// würde unten in FREIGEGEBEN stehen müssen, mit Begründung; der Test nennt solche Dateien trotzdem in der Ausgabe.
//
// Ohne BESTELLUNG_PREISE_PRIVAT gibt der Test einen Hinweis aus und endet mit Exit 0 (wie tools/pii-check.py ohne private Namensliste);
// seine Suchfunktion prüft er dann gegen erfundene Zahlen (Selbsttest).
//
// Aufruf: BESTELLUNG_PREISE_PRIVAT=<Datei> node tools/bestellung-test/geheim-test.mjs
// Exit 0: kein Treffer und alle Prüfsummen stimmen (oder die private Datei gibt es nicht: Hinweis); 1: Treffer oder falsche Prüfsumme; 2: private Datei nicht lesbar.

import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { katalogVon, mitPreisen, stueckpreis } from "../../assets/js/bestellung/mailtext.js";
import { KONFIG_OEFFENTLICH, TESTPREISE } from "./faelle.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const BASIS_COMMIT = "da77c2f"; // Stand vor dieser Arbeit (AP-2): origin/main nach Runde 2 der Bestellseite

// Treffer in Dateien, die nachweislich nichts mit der Bestellseite zu tun haben, dürfen hier freigegeben werden: { pfad (Anfang), grund }.
// Jede Freigabe gehört in den Bericht (Liste der Pfade), nicht still dazu. Leer, solange es keinen solchen Treffer gibt.
const FREIGEGEBEN = [];

// Binärdateien (und Quellkarten): kein durchsuchbarer Text
const UEBERSPRINGEN = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif", ".ico", ".bmp", ".woff", ".woff2", ".ttf", ".otf", ".eot", ".pdf", ".zip", ".gz", ".mp4", ".mov", ".map"]);

// ---------- Suche ----------

const maskiere = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Die Schreibweisen der Beträge (Cent) als Suchmuster, in zwei Stufen. Eine Zahl zählt nur als Ganzes: nicht innerhalb längerer Ziffernfolgen
// („112,34“, „12,345“) und nicht vor „.<Ziffer>“ („24.11.2026“, „4.13.0“).
//   normal: zwei Nachkommastellen mit Komma oder Punkt (12,34 und 12.34)
//   streng: zusätzlich 12,5 und 12.5 (für 12,50 €), bei vollen Euro 12.0, 12,0 und „12 €“, „12 EUR“, „12 Euro“
export function baueSuche(centWerte, rabatte = []) {
  const normal = new Set();
  const zusatz = new Set();
  for (const c of new Set(centWerte)) {
    const euro = String(Math.floor(c / 100));
    const cc = String(c % 100).padStart(2, "0");
    normal.add(`${euro}[.,]${cc}`);
    if (cc[1] === "0") zusatz.add(`${euro}[.,]${cc[0]}`);
    if (cc === "00") {
      zusatz.add(`${euro}[.,]0`);
      zusatz.add(`${euro}\\s?(?:€|EUR\\b|Euro\\b)`);
    }
  }
  const muster = (teile) => (teile.length ? new RegExp(`(?<![0-9])(?:${teile.join("|")})(?![0-9])(?!\\.[0-9])`) : null);
  const rabattTeile = [];
  for (const r of new Set(rabatte)) {
    const satz = maskiere(String(r)).replace("\\.", "[.,]");
    rabattTeile.push(`(?<![0-9.,])${satz}\\s?(?:%|Prozent)`, `rabattProzent\\W{0,6}${satz}(?![0-9])`);
  }
  return {
    normal: muster([...normal]),
    streng: muster([...normal, ...zusatz]),
    rabatt: rabattTeile.length ? new RegExp(rabattTeile.join("|"), "i") : null,
    werte: new Set(centWerte).size + new Set(rabatte).size,
  };
}

// Anzahl der Zeilen im Text, in denen ein Wert steht (streng: auch die kurzen Schreibweisen)
export function zaehleTreffer(text, suche, streng = false) {
  const zahlen = streng ? suche.streng : suche.normal;
  let n = 0;
  for (const zeile of text.split("\n")) {
    if ((zahlen && zahlen.test(zeile)) || (suche.rabatt && suche.rabatt.test(zeile))) n += 1;
  }
  return n;
}

// Gehört die Datei zur Bestellseite? Dort gilt die strenge Suche.
const gehoertZurBestellseite = (rel) => /bestellung/i.test(rel);

// ---------- Dateien ----------

function git(args, opt = {}) {
  return spawnSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 512 * 1024 * 1024, ...opt });
}

function alleDateien() {
  const dateien = new Set();
  const verfolgt = git(["ls-files", "-z"]);
  const neu = git(["ls-files", "-z", "--others", "--exclude-standard"]);
  for (const r of [verfolgt, neu]) for (const p of (r.stdout || "").split("\0")) if (p) dateien.add(p);
  const geheDocs = (ordner) => {
    for (const e of readdirSync(path.join(ROOT, ordner), { withFileTypes: true })) {
      const rel = path.join(ordner, e.name);
      if (e.isDirectory()) geheDocs(rel);
      else dateien.add(rel);
    }
  };
  try {
    geheDocs("docs");
  } catch {
    /* ohne docs/ nichts zu prüfen */
  }
  return [...dateien].sort();
}

function liesText(rel) {
  if (UEBERSPRINGEN.has(path.extname(rel).toLowerCase())) return null;
  const voll = path.join(ROOT, rel);
  let info;
  try {
    info = statSync(voll);
  } catch {
    return null; // gelöscht, aber noch verfolgt
  }
  if (!info.isFile() || info.size > 64 * 1024 * 1024) return null;
  const daten = readFileSync(voll);
  if (daten.subarray(0, 8000).includes(0)) return null;
  return daten.toString("utf8");
}

// Die neuen Zeilen des Verlaufs „git log -p BASIS..HEAD“: Commit-Texte (datei "") und hinzugefügte Zeilen mit ihrer Datei. Hunk-Köpfe
// („@@ -12,34 +12,34 @@“ enthält Zahlen mit Komma), Datei-Köpfe und entfernte Zeilen (sie stehen schon im Basis-Stand) zählen nicht.
function verlaufZeilen() {
  const vorhanden = git(["rev-parse", "--verify", "--quiet", `${BASIS_COMMIT}^{commit}`]);
  if (vorhanden.status !== 0) return null;
  const r = git(["log", "-p", "--no-color", "--no-ext-diff", `${BASIS_COMMIT}..HEAD`]);
  if (r.status !== 0) return null;
  const zeilen = [];
  let datei = "";
  for (const z of r.stdout.split("\n")) {
    if (z.startsWith("commit ")) datei = "";
    else if (z.startsWith("diff --git ")) datei = (/ b\/(.+)$/.exec(z) || [])[1] || "?";
    else if (z.startsWith("+++ ") || z.startsWith("--- ") || z.startsWith("@@")) continue;
    else if (z.startsWith("+") && datei !== "") zeilen.push({ datei, text: z.slice(1) });
    else if (datei === "" && z.startsWith("    ")) zeilen.push({ datei: "", text: z.trim() });
  }
  return zeilen;
}

// ---------- Prüfsummen ----------

// Rechnet mit mailtext.js den Stückpreis mit Standard-Aufdrucken nach (je Artikel und Gruppe, erste Größe der Gruppe) und vergleicht ihn mit
// den „pruefsummen“ der Datei (Schlüssel „<artikel>.<gruppe>“, Beträge in Euro). Gibt nur die Schlüssel der falschen Prüfsummen zurück.
function pruefePruefsummen(privat) {
  const konfig = mitPreisen(KONFIG_OEFFENTLICH, privat);
  const katalog = katalogVon(konfig);
  const schluessel = Object.keys(privat.pruefsummen || {}).filter((s) => s !== "_hinweis");
  const falsch = [];
  const stueckCent = [];
  for (const s of schluessel) {
    const [id, gruppe] = s.split(".");
    const a = katalog.nachId.get(id);
    const e = a && a.groessen.find((g) => g.gruppe === gruppe);
    const preis = e ? stueckpreis(konfig, id, e.wert, a.aufdrucke.standard) : null;
    if (!preis || preis.anfrage || preis.cent !== Math.round(privat.pruefsummen[s] * 100)) falsch.push(s);
  }
  // Alle Stückpreise mit Standard-Aufdrucken (auch ohne Prüfsumme) gehören zu den gesuchten Werten
  for (const a of katalog.artikel) {
    for (const g of a.gruppen) {
      const e = a.groessen.find((x) => x.gruppe === g);
      const preis = stueckpreis(konfig, a.id, e.wert, a.aufdrucke.standard);
      if (preis && !preis.anfrage) stueckCent.push(preis.cent);
    }
  }
  return { anzahl: schluessel.length, falsch, stueckCent, konfig };
}

// Alle Beträge (Cent) der privaten Datei und die daraus abgeleiteten (Grundpreise, Stückpreise)
function sammleBetraege(privat, abgeleitet) {
  const cent = new Set();
  const sammle = (v) => {
    if (typeof v === "number") cent.add(Math.round(v * 100));
    else if (v && typeof v === "object") Object.values(v).forEach(sammle);
  };
  sammle(privat.uvp);
  sammle(privat.veredelungPreis);
  sammle(privat.pruefsummen);
  for (const c of abgeleitet.stueckCent) cent.add(c);
  const katalog = katalogVon(abgeleitet.konfig);
  for (const a of katalog.artikel) {
    for (const g of a.gruppen) {
      const liste = abgeleitet.konfig.preise.uvpCent[a.id];
      if (liste && typeof liste[g] === "number") cent.add(Math.round((liste[g] * (100 - privat.rabattProzent)) / 100));
    }
  }
  return [...cent].filter((c) => Number.isInteger(c) && c >= 0);
}

// ---------- Selbsttest der Suche (erfundene Zahlen) ----------

function selbsttest() {
  const fehler = [];
  const pruefe = (name, bedingung) => {
    if (!bedingung) fehler.push(name);
  };
  // Erfundene, absichtlich ungewöhnliche Zahlen (kein echter Preis liegt bei 77,77 oder 91 €)
  const s = baueSuche([7777, 9100, 9150, 7], [73]);
  const treffer = (text) => zaehleTreffer(text, s, true) > 0; // streng: auch die kurzen Schreibweisen
  const normalTreffer = (text) => zaehleTreffer(text, s, false) > 0;
  pruefe("Komma und Punkt", treffer("Preis 77,77 €") && treffer('"preis": 77.77') && treffer("(77.77)"));
  pruefe("ein Wert je Zeile genügt, mehrere Zeilen zählen einzeln", zaehleTreffer("a 77,77\nb\nc 77.77 und 91,00", s, true) === 2 && zaehleTreffer("a 77,77\nb\nc 77.77 und 91,00", s, false) === 2);
  pruefe("normal: nur zwei Nachkommastellen (77,77 und 91,00 ja, 91.0 und 91 € nein, 91,5 nein, 91,50 ja)", normalTreffer("77,77") && normalTreffer("91.00") && normalTreffer("91,50") && !normalTreffer("91.0") && !normalTreffer("91 €") && !normalTreffer("91,5") && !normalTreffer("0,7"));
  pruefe("nicht innerhalb längerer Zahlen", !treffer("177,77") && !treffer("77,775") && !treffer("277.77") && !treffer("77,77567"));
  pruefe("nicht in Datumsangaben und Versionen", !treffer("am 77.77.5") && !treffer("v1.77.77.0"));
  pruefe("volle Euro: 91,00 / 91.00 / 91.0 / 91 € / 91€ / 91 EUR / 91 Euro", ["91,00", "91.00", "91.0", "91 €", "91€", "91 EUR", "91 Euro"].every(treffer));
  pruefe("volle Euro nur als Ganzes (191 € und „91 Europa“ nicht)", !treffer("191 €") && !treffer("91 Europa"));
  pruefe("ein Zehntel: 91,5 / 91.5 für 91,50 €", treffer("91,5") && treffer("91.5") && treffer("91,50"));
  pruefe("unter einem Euro: 0,07", treffer("0,07") && treffer("0.07") && !treffer("10,07"));
  pruefe("Rabatt: „73 %“, „73%“, „73 Prozent“, rabattProzent", treffer("minus 73 %") && treffer("73%") && treffer("73 Prozent") && treffer('"rabattProzent": 73') && !treffer("173 %") && !treffer("0,73 %"));
  pruefe("kein Treffer in gewöhnlichem Text", !treffer("Bestellung für dein Team, Größe 140, Nr. 7, 2026-11-25, 60439 Frankfurt"));
  // Prüfsummen und Preise der erfundenen Testpreise: die Rechnung stimmt mit den von Hand gerechneten Werten (faelle.mjs) überein
  const klartext = JSON.parse(JSON.stringify(TESTPREISE));
  klartext.pruefsummen = { "trikot.kinder": 21.74, "trikot.erwachsene": 23.84, "shorts.kinder": 10.38, "stutzen.kinder": 4.02, "rucksack.alle": 15.21, "tw-hose.kinder": 16.79 };
  const p = pruefePruefsummen(klartext);
  pruefe("Prüfsummen der Testpreise stimmen (6)", p.anzahl === 6 && p.falsch.length === 0);
  klartext.pruefsummen["trikot.kinder"] = 21.75;
  klartext.pruefsummen["regenjacke.kinder"] = 1;
  pruefe("falsche Prüfsummen werden gefunden (Trikot um einen Cent, Regenjacke ohne Preis)", pruefePruefsummen(klartext).falsch.join(",") === "trikot.kinder,regenjacke.kinder");
  return fehler;
}

// ---------- Hauptteil ----------

const selbst = selbsttest();
if (selbst.length) {
  console.log(`geheim-test: Selbsttest der Suche FEHLGESCHLAGEN: ${selbst.join("; ")}`);
  process.exit(1);
}

const pfad = process.env.BESTELLUNG_PREISE_PRIVAT;
if (!pfad) {
  console.log("geheim-test: Hinweis – BESTELLUNG_PREISE_PRIVAT ist nicht gesetzt, die Prüfung gegen die private Preisdatei wird übersprungen (Selbsttest der Suche bestanden).");
  process.exit(0);
}

let privat;
try {
  privat = JSON.parse(readFileSync(path.resolve(pfad), "utf8"));
} catch (e) {
  if (e.code === "ENOENT") {
    // Wie bei tools/pii-check.py ohne private Namensliste: fehlt die Datei, gibt es einen Hinweis und keinen Fehler.
    console.log("geheim-test: Hinweis – die private Preisdatei, auf die BESTELLUNG_PREISE_PRIVAT zeigt, gibt es nicht; die Prüfung wird übersprungen (Selbsttest der Suche bestanden).");
    process.exit(0);
  }
  console.error(`geheim-test: Die private Preisdatei lässt sich nicht lesen (${e.code || "kein gültiges JSON"}).`);
  process.exit(2);
}

let abgeleitet;
try {
  abgeleitet = pruefePruefsummen(privat);
} catch (e) {
  // Die Meldung nennt nur Schlüssel, nie Werte (mitPreisen)
  console.error(`geheim-test: Die private Preisdatei passt nicht zum Katalog: ${e.message}`);
  process.exit(2);
}
const suche = baueSuche(sammleBetraege(privat, abgeleitet), [privat.rabattProzent]);

// Dateien: von git verfolgte (und neue, nicht ignorierte) und alles unter docs/
const treffer = []; // { rel, n }
for (const rel of alleDateien()) {
  const text = liesText(rel);
  if (text === null) continue;
  const n = zaehleTreffer(text, suche, gehoertZurBestellseite(rel));
  if (n > 0) treffer.push({ rel, n });
}
// Verlauf: git log -p BASIS..HEAD (neue Zeilen)
const verlauf = verlaufZeilen();
const verlaufTreffer = verlauf === null ? null : verlauf.filter((z) => zaehleTreffer(z.text, suche, z.datei === "" || gehoertZurBestellseite(z.datei)) > 0).length;

const frei = (t) => FREIGEGEBEN.some((f) => t.rel.startsWith(f.pfad));
const echte = treffer.filter((t) => !frei(t));
const freigegeben = treffer.filter(frei);
const anzahlTreffer = echte.reduce((s, t) => s + t.n, 0) + (verlaufTreffer || 0);

console.log(`${suche.werte} Werte geprüft, ${anzahlTreffer} Treffer, ${abgeleitet.anzahl - abgeleitet.falsch.length} Prüfsummen stimmen`);
if (verlauf === null) console.log(`Hinweis: Der Basis-Commit ${BASIS_COMMIT} ist hier nicht vorhanden, der Verlauf wurde nicht geprüft.`);
if (echte.length) console.log("Dateien mit Treffern (ohne Werte):\n" + echte.map((t) => `  ${t.rel} (${t.n} Zeile${t.n === 1 ? "" : "n"})`).join("\n"));
if (verlaufTreffer) console.log(`Im Verlauf ${BASIS_COMMIT}..HEAD: ${verlaufTreffer} Zeile${verlaufTreffer === 1 ? "" : "n"} mit Treffern (git log -p).`);
if (freigegeben.length) console.log("Freigegebene Treffer (nachweislich ohne Bezug zur Bestellseite, siehe FREIGEGEBEN):\n" + freigegeben.map((t) => `  ${t.rel} (${t.n})`).join("\n"));
if (abgeleitet.falsch.length) console.log(`Prüfsummen, die NICHT stimmen: ${abgeleitet.falsch.join(", ")}`);
process.exit(anzahlTreffer > 0 || abgeleitet.falsch.length > 0 ? 1 : 0);
