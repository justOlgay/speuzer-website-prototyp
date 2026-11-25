#!/usr/bin/env node
// Zugang zur Bestellseite für Trainer: verschlüsselt die Preisdaten mit einem Code (Stand 25.11.2026).
//
// Die Bestellseite (docs/ws/bestellung.html) öffnet sich nur mit einem Code, nur für Trainerinnen und Trainer. Das Repo und GitHub Pages
// sind öffentlich: Die Preise laut Angebot (Listenpreise, Rabatt, Preise je Aufdruck) liegen darum nur verschlüsselt in
// data/bestellung-preise.enc.json (AES-GCM-256, Schlüssel per PBKDF2-HMAC-SHA256 aus dem Code, 600.000 Runden; Verfahren und Format
// in assets/js/bestellung/zugang.js). Dieses Werkzeug liest die private Preisdatei (gitignoriert, nie im Repo), prüft sie gegen den Katalog
// (data/bestellung.json), verschlüsselt sie, prüft das Ergebnis durch Entschlüsseln und schreibt das Paket. Es folgt
// tools/trainer-zugang.mjs und nutzt dessen Ordnerprüfung (tools/anmeldung-zugang.mjs).
//
// Aufruf
//   node tools/bestellung-zugang.mjs --preise <Datei> --neu --blatt <Ordner> [--zeigen]
//       Erzeugt einen zufälligen Code (10 Zeichen aus ABCDEFGHJKLMNPQRSTUVWXYZ23456789, gut abtippbar; Zufall aus crypto.getRandomValues),
//       verschlüsselt die Preise damit, schreibt data/bestellung-preise.enc.json und legt im Ordner die Datei
//       „Bestellseite – Zugang für Trainer.txt“ mit Code und Link ab. Ohne --blatt und ohne --zeigen verweigert --neu die Arbeit:
//       Der Code ginge verloren (das Paket lässt sich ohne ihn nicht mehr lesen).
//   node tools/bestellung-zugang.mjs --preise <Datei> --code <CODE> [--blatt <Ordner>] [--zeigen]
//       Nimmt einen vorgegebenen Code (Leerzeichen, Bindestriche und Unterstriche weg, Großbuchstaben; 8 bis 32 Zeichen) statt eines zufälligen.
//       --code - liest den Code von der Standardeingabe (er steht dann nicht in der Befehlszeile).
//   node tools/bestellung-zugang.mjs --hilfe
// Weitere Angaben
//   --preise <Datei>   Pflicht: die private JSON-Datei (rabattProzent, veredelungPreis, uvp, stand, quelle; „pruefsummen“ und „_hinweis“ bleiben
//                      draußen und gehen nicht ins Paket).
//   --blatt <Ordner>   legt zusätzlich die Datei mit Code und Link ab. Ein Ordner im Repo wird verweigert (außer unter tools/cache/).
//   --daten <Datei>    schreibt das Paket dorthin statt nach data/bestellung-preise.enc.json (für Tests).
//   --zeigen           zeigt den Code und den ganzen Link auf der Konsole. Ohne diese Angabe nennt das Werkzeug den Code nie
//                      (der Link steht dann als „…?code=***“ da, den Code zeigt die Datei im Ordner).
//   Die Ausgabe nennt nie einen Preis und keinen Rabatt, nur Anzahlen.
//
// Link: https://justolgay.github.io/speuzer-website-prototyp/ws/bestellung.html?code=<CODE>
// Der Code im Link ist der normalisierte Code (nur A–Z und 2–9); in der Datei steht er zusätzlich in Gruppen zu fünf Zeichen.
//
// Der Klartext-Code geht in keine Datei im Repo: Die Datei mit dem Code liegt im Ordner außerhalb des Repos (oder unter tools/cache/), und
// data/bestellung-preise.enc.json enthält nur das verschlüsselte Paket. Nur vorhandene Pakete (keine neuen Abhängigkeiten).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Eingabefehler, pruefeZielordner } from "./anmeldung-zugang.mjs";
import { entschluessele, normalisiereCode, verschluessele } from "../assets/js/bestellung/zugang.js";
import { pruefePreise } from "../assets/js/bestellung/mailtext.js";

export { Eingabefehler };

const HIER = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HIER, "..");
export const STANDARD_DATEN = path.join(ROOT, "data", "bestellung-preise.enc.json");
const KATALOG = path.join(ROOT, "data", "bestellung.json");
export const LINK_BASIS = "https://justolgay.github.io/speuzer-website-prototyp/ws/bestellung.html";
export const BLATT_NAME = "Bestellseite – Zugang für Trainer.txt";
// Zeichen eines neuen Codes: A–Z ohne I und O, dazu 2–9 (ohne 0 und 1): nichts, was sich auf dem Blatt oder am Handy leicht verwechseln lässt.
export const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const CODE_LAENGE = 10;
export const MIN_ZEICHEN = 8; // kürzere Codes ließen sich aus dem öffentlichen Paket erraten
export const MAX_ZEICHEN = 32; // längere Codes tippt keiner ab

// ---------- Hilfen ----------

// Link mit dem normalisierten Code. encodeURIComponent schützt Zeichen, die in einer Adresse etwas bedeuten.
export function linkFuer(code) {
  return LINK_BASIS + "?code=" + encodeURIComponent(normalisiereCode(code));
}

// Anzeige in Gruppen zu fünf Zeichen, durch Bindestriche getrennt (die Seite ignoriert die Bindestriche).
export function anzeigeFuer(code) {
  return normalisiereCode(code).replace(/(.{5})(?=.)/g, "$1-");
}

// Ein zufälliger Code aus ALPHABET. 32 Zeichen teilen die 256 Werte eines Bytes ohne Rest: kein Modulo-Fehler, jedes Zeichen gleich wahrscheinlich.
export function neuerCode(laenge = CODE_LAENGE) {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(laenge));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

function liesJson(datei, name) {
  let text;
  try {
    text = fs.readFileSync(datei, "utf8");
  } catch (fehler) {
    throw new Eingabefehler(`${name}: Die Datei ${datei} lässt sich nicht lesen (${fehler.code ?? fehler.message}).`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Eingabefehler(`${name}: Die Datei ${datei} ist kein gültiges JSON.`);
  }
}

async function codeLesen(wert) {
  if (wert !== "-") return wert;
  const stuecke = [];
  for await (const s of process.stdin) stuecke.push(s);
  return Buffer.concat(stuecke).toString("utf8").replace(/\r?\n$/, "");
}

// Der Inhalt der Datei „Bestellseite – Zugang für Trainer.txt“ (nur im Ordner außerhalb des Repos, nie im Repo)
export function blattText(code) {
  return `Bestellseite für Trainer – Zugang

Code: ${anzeigeFuer(code)}
Link: ${linkFuer(code)}

Die Seite „Bestellung für dein Team“ öffnet sich nur mit diesem Code und ist für Trainerinnen und Trainer gedacht.
Der Code steckt im Link. Bitte gib ihn nur an Trainer weiter, nicht öffentlich und nicht in offene Gruppen.
Kommt der Code in falsche Hände: neuen Code erzeugen (node tools/bestellung-zugang.mjs --neu), neu bauen und veröffentlichen.
`;
}

function maskiert(link, zeigen) {
  return zeigen ? link : link.replace(/(\?code=).*$/, "$1***");
}

// ---------- Aufgabe ----------

export async function aufgabe(o) {
  if (!o.preise) throw new Eingabefehler("--preise <Datei> fehlt: die private JSON-Datei mit den Preisen laut Angebot.");
  let code;
  if (o.neu) {
    // Ohne Blatt und ohne --zeigen ginge der Code verloren: Das Paket lässt sich ohne ihn nicht mehr lesen, und er ließe sich nicht zurückholen.
    if (!o.blatt && !o.zeigen) throw new Eingabefehler("--neu braucht --blatt <Ordner> (dort liegt die Datei mit dem Code) oder --zeigen: Sonst ginge der neue Code verloren.");
    code = neuerCode();
  } else {
    code = normalisiereCode(await codeLesen(o.code));
    if (!code) throw new Eingabefehler("Der Code ist leer.");
    if (code.length < MIN_ZEICHEN) throw new Eingabefehler(`Der Code hat nur ${code.length} Zeichen. Das Paket liegt öffentlich im Repo, ein kurzer Code ließe sich daraus erraten. Nimm mindestens ${MIN_ZEICHEN}, besser ${CODE_LAENGE} Zeichen.`);
    if (code.length > MAX_ZEICHEN) throw new Eingabefehler(`Der Code hat ${code.length} Zeichen. Nimm höchstens ${MAX_ZEICHEN}: Er muss sich abtippen lassen.`);
  }
  const ziel = o.blatt ? pruefeZielordner(o.blatt) : null; // verweigert Ordner im Repo, bevor etwas geschrieben wird
  const datei = o.daten;

  // Preisdaten lesen und gegen den Katalog prüfen (die Meldungen nennen nur Schlüssel, nie Werte)
  const roh = liesJson(path.resolve(o.preise), "--preise");
  if (!roh || typeof roh !== "object" || Array.isArray(roh)) throw new Eingabefehler("--preise: Die Datei enthält kein JSON-Objekt.");
  const katalog = liesJson(KATALOG, "data/bestellung.json");
  const probleme = pruefePreise(katalog, roh);
  if (probleme.length) throw new Eingabefehler("Die Preisdaten passen nicht zum Katalog (data/bestellung.json):\n  - " + probleme.join("\n  - "));
  const { pruefsummen, _hinweis, ...klartext } = roh;

  // Verschlüsseln und vor dem Schreiben prüfen: derselbe Inhalt kommt zurück, ein falscher Code scheitert
  const paket = await verschluessele(klartext, code);
  const zurueck = await entschluessele(paket, code);
  if (JSON.stringify(zurueck) !== JSON.stringify(klartext)) throw new Error("Das Paket enthält nach dem Entschlüsseln etwas anderes als die Preisdaten. Abgebrochen, nichts geschrieben.");
  let falschGescheitert = false;
  try {
    await entschluessele(paket, code + "X");
  } catch {
    falschGescheitert = true;
  }
  if (!falschGescheitert) throw new Error("Ein falscher Code hat das Paket geöffnet. Abgebrochen, nichts geschrieben.");

  // Erst alles erzeugen, dann schreiben: Scheitert die Datei mit dem Code, bleibt das Paket, wie es war.
  let blattPfad = null;
  if (ziel) {
    fs.mkdirSync(ziel, { recursive: true });
    blattPfad = path.join(ziel, BLATT_NAME);
    fs.writeFileSync(blattPfad, blattText(code), "utf8");
  }
  fs.mkdirSync(path.dirname(datei), { recursive: true });
  fs.writeFileSync(datei, JSON.stringify(paket, null, 2) + "\n", "utf8");

  const anzahl = Object.keys(klartext.uvp || {}).length;
  console.log(`${path.relative(process.cwd(), datei) || datei}: Paket geschrieben (${anzahl} Artikel, ${paket.iter} Runden, geprüft durch Entschlüsseln).`);
  if (blattPfad) console.log("Code und Link: " + blattPfad);
  else console.log("Keine Datei mit dem Code erzeugt (mit --blatt <Ordner> entsteht sie).");
  console.log("Link:     " + maskiert(linkFuer(code), o.zeigen) + (o.zeigen ? "" : blattPfad ? "  (den Code zeigt die Datei im Ordner)" : ""));
  if (o.zeigen) console.log("Code:     " + anzeigeFuer(code));
  if (!o.neu && /[IO01]/.test(code)) console.log("Hinweis: Der Code enthält Zeichen, die sich verwechseln lassen (I, O, 0, 1).");
  console.log("Nächster Schritt: bauen (npm run build) und veröffentlichen, damit docs/ das neue Paket trägt.");
  return 0;
}

export const HILFE = `Zugang zur Bestellseite für Trainer (Preisdaten verschlüsseln)

  node tools/bestellung-zugang.mjs --preise <Datei> --neu --blatt <Ordner> [--zeigen]
  node tools/bestellung-zugang.mjs --preise <Datei> --code <CODE> [--blatt <Ordner>] [--zeigen]
  Weitere Angaben: --daten <Datei>, --code - (Code von der Standardeingabe)

Siehe den Kopf der Datei tools/bestellung-zugang.mjs.`;

export function liesAufruf(argv) {
  const o = { daten: STANDARD_DATEN };
  const wert = (i, name) => {
    if (i + 1 >= argv.length) throw new Eingabefehler(`${name} braucht einen Wert.`);
    return argv[i + 1];
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--preise") (o.preise = wert(i, a)), i++;
    else if (a === "--code") (o.code = wert(i, a)), i++;
    else if (a === "--blatt") (o.blatt = wert(i, a)), i++;
    else if (a === "--daten") (o.daten = path.resolve(wert(i, a))), i++;
    else if (a === "--neu") o.neu = true;
    else if (a === "--zeigen") o.zeigen = true;
    else if (a === "--hilfe" || a === "-h") o.hilfe = true;
    else throw new Eingabefehler(`Unbekannte Angabe: ${a}`);
  }
  return o;
}

export async function main(argv) {
  try {
    const o = liesAufruf(argv);
    if (o.hilfe || argv.length === 0) {
      console.log(HILFE);
      return argv.length === 0 ? 2 : 0;
    }
    if ((o.neu === true) === (o.code !== undefined)) throw new Eingabefehler("Genau eine Angabe: --neu (zufälliger Code) oder --code <CODE>.");
    return await aufgabe(o);
  } catch (fehler) {
    console.error((fehler instanceof Eingabefehler ? "Fehler: " : "Fehler (unerwartet): ") + fehler.message);
    return fehler instanceof Eingabefehler ? 2 : 1;
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  process.exitCode = await main(process.argv.slice(2));
}
