// Erfundene Testpreise und Testcode der Bestellseite (nur für Tests, nichts davon ist echt).
//
// Die echten Preise liegen nur verschlüsselt im Repo (data/bestellung-preise.enc.json) und in einer privaten, gitignorierten Datei. Die Tests
// rechnen darum mit diesen erfundenen Zahlen und einem Testcode, der hier im Klartext steht. Der Rabatt ist bewusst nicht der echte Rabattsatz.
// Beträge in Euro wie in der privaten Datei; hier ist alles nur zum Nachrechnen von Hand gedacht (siehe faelle.mjs).
//
// Aufruf allein: node tools/bestellung-test/testdaten.mjs <Datei> [Runden]
//   schreibt das mit dem Testcode verschlüsselte Paket der Testpreise (das Format von data/bestellung-preise.enc.json), mit der
//   Rundenzahl (Standard 600000). Damit wird die mitgelieferte Datei data/bestellung-preise.enc.json erzeugt, solange der Verein
//   noch nicht den echten Code und die echten Preise eingespielt hat.

import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ITERATIONEN, verschluessele } from "../../assets/js/bestellung/zugang.js";

export const TESTCODE = "BAUMHAUS23";

// Rabatt 40 % auf den Listenpreis (UVP); die Zuschläge gelten je Stück und Aufdruck.
export const TESTPREISE = {
  stand: "2026-11-24",
  quelle: "Angebot 11Teamsport vom 24.11.2026",
  rabattProzent: 40,
  veredelungPreis: { W: 1.05, V: 2.15, SP: 2.95, ZG: 2.45, N: 1.55, ZK: 1.25 },
  uvp: {
    trikot: { kinder: 21.9, erwachsene: 25.4 },
    shorts: { kinder: 17.3, erwachsene: 19.8 },
    stutzen: { kinder: 6.7, erwachsene: 7.9 },
    "praesi-jacke": { kinder: 38.4, erwachsene: 44.9 },
    "praesi-hose": { kinder: 29.98, erwachsene: 33.7 },
    rucksack: { alle: 23.6 },
    winterjacke: { kinder: 58.3, erwachsene: 68.1 },
    regenjacke: null,
    "tw-trikot": { kinder: 34.7, erwachsene: 37.2 },
    "tw-hose": { kinder: 27.99, erwachsene: 31.6 },
  },
};

// Eine Kopie der Testpreise, die man gefahrlos ändern darf
export function kopieTestpreise() {
  return JSON.parse(JSON.stringify(TESTPREISE));
}

// Das verschlüsselte Paket der Testpreise (mit dem Testcode); iter kleiner machen beschleunigt Tests, die die Rundenzahl nicht prüfen.
export async function testPaket({ iter = ITERATIONEN, preise = TESTPREISE, code = TESTCODE } = {}) {
  return verschluessele(preise, code, { iter });
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const ziel = process.argv[2];
  if (!ziel) {
    console.error("Aufruf: node tools/bestellung-test/testdaten.mjs <Datei> [Runden]");
    process.exit(2);
  }
  const iter = process.argv[3] ? Number(process.argv[3]) : ITERATIONEN;
  writeFileSync(ziel, JSON.stringify(await testPaket({ iter }), null, 2) + "\n", "utf8");
  console.log(`${ziel}: Testpaket geschrieben (${iter} Runden).`);
}
