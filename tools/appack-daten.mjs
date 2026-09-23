#!/usr/bin/env node
// Speuzer Website Prototyp – Geschäftsstellen-Kontakt aus appack (W3/W4)
// Holt die Kontaktzeile der Geschäftsstelle (Worksheet 6a1ec5fcf68a05bf129cdb9b)
// über die öffentliche appack-Schnittstelle und schreibt nur Adresse,
// Telefon, E-Mail, Website und Social nach data/geschaeftsstelle.json.
// Keine Personendaten: "mobileNumber" wird nicht übernommen.
// Öffnungszeiten: seit 22.09.2026 bewusst nicht mehr (Entscheidung Olgay:
// keine festen Öffnungszeiten; Website und App zeigen einen festen Satz).
//
// Aufruf: POST https://appack.de/rest-api/public/workbook/worksheet/<id>?sortBy=_id&sortDirection=1&skip=0&limit=50
// Body: {} (leer)
//
// npm run appack-daten

import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ZIEL = path.join(ROOT, "data", "geschaeftsstelle.json");

const WORKSHEET_KONTAKT = "6a1ec5fcf68a05bf129cdb9b";

const KONTAKT_FELDER = [
  "address", "postalCode", "city", "phoneNumber", "email", "website", "insta", "face",
];

async function holeWorksheet(id) {
  const url = `https://appack.de/rest-api/public/workbook/worksheet/${id}?sortBy=_id&sortDirection=1&skip=0&limit=50`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  if (!resp.ok) {
    throw new Error(`Worksheet ${id}: HTTP ${resp.status}`);
  }
  return resp.json();
}

function nurFelder(zeile, felder) {
  const ergebnis = {};
  for (const f of felder) {
    if (zeile && Object.prototype.hasOwnProperty.call(zeile, f)) {
      ergebnis[f] = zeile[f];
    }
  }
  // W9: Telefonnummern überall in derselben Schreibweise ("069 736868"),
  // das Worksheet liefert "069-736868".
  if (typeof ergebnis.phoneNumber === "string") {
    ergebnis.phoneNumber = ergebnis.phoneNumber.replace(/^(0\d{2,4})[-\/ ]+/, "$1 ");
  }
  return ergebnis;
}

async function main() {
  console.log("Hole Kontakt (Worksheet " + WORKSHEET_KONTAKT + ") …");
  const kontaktZeilen = await holeWorksheet(WORKSHEET_KONTAKT);
  console.log(`  ${kontaktZeilen.length} Zeile(n).`);

  // Erste Zeile je Worksheet (sortBy=_id, aufsteigend) – bei mehreren Zeilen
  // im Kontakt-Worksheet (hier: zwei, eine für die Postanschrift, eine für
  // die Sportstätte) ist unklar, welche für "die Kontaktzeile" auf
  // kontakt.html gilt; ohne weitere Vorgabe wird die erste genommen (siehe
  // Abschlussbericht, Abschnitt "Offene Fragen").
  const kontakt = nurFelder(kontaktZeilen[0], KONTAKT_FELDER);
  const ausgabe = {
    _quelle: `appack public workbook API, Worksheet ${WORKSHEET_KONTAKT} (Kontakt der Geschäftsstelle), geholt am ${new Date().toISOString().slice(0, 10)} mit tools/appack-daten.mjs. Nur Adresse/Telefon/E-Mail/Website/Social; keine Personendaten, "mobileNumber" bewusst nicht übernommen. Öffnungszeiten werden seit 22.09.2026 nicht mehr übernommen (Entscheidung Olgay: es gibt keine festen Öffnungszeiten).`,
    kontakt,
  };

  writeFileSync(ZIEL, JSON.stringify(ausgabe, null, 2) + "\n", "utf8");
  console.log(`Geschrieben: ${path.relative(ROOT, ZIEL)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
