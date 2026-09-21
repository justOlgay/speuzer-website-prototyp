#!/usr/bin/env node
// Speuzer Website Prototyp – Geschäftsstellen-Daten aus appack (W3)
// Holt Öffnungszeiten und Kontaktdaten der Geschäftsstelle über die
// öffentliche appack-Schnittstelle und schreibt NUR die in der
// W3-Spezifikation (Abschnitt 7, kontakt.html) genannten Felder nach
// data/geschaeftsstelle.json. Keine Personendaten: "mobileNumber" wird nicht
// übernommen (Vorgabe der Spezifikation).
//
// Worksheets:
//   Öffnungszeiten: 6a1ec5fcf68a05bf129cdb9d
//     Felder: mondayopen/mondayclose/mondaymidstart/mondaymidend … sundayopen …,
//     saturdayhider, sundayhider, openingtext
//   Kontakt: 6a1ec5fcf68a05bf129cdb9b
//     Felder: address, postalCode, city, phoneNumber, email, website, insta, face
//   Einstellungen (W3b, Prüfer-Befund "wichtig"): 6a1ec5fcf68a05bf129cdba2
//     Feld: openingActive – dasselbe Worksheet/Feld, mit dem die App
//     (src/app/Geschaeftsstelle_v3.html, EINSTELLUNGEN_ID) entscheidet, ob
//     die Öffnungszeiten überhaupt angezeigt werden. Live am 2026-09-21:
//     openingActive=false, d. h. die Geschäftsstelle hat die
//     Öffnungszeiten-Anzeige bewusst deaktiviert. Nur dieses eine Feld wird
//     übernommen, keine der Button-/Farbfelder dieses Worksheets.
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

const WORKSHEET_OEFFNUNGSZEITEN = "6a1ec5fcf68a05bf129cdb9d";
const WORKSHEET_KONTAKT = "6a1ec5fcf68a05bf129cdb9b";
const WORKSHEET_EINSTELLUNGEN = "6a1ec5fcf68a05bf129cdba2";

const OEFFNUNGSZEITEN_FELDER = [
  "mondayopen", "mondayclose", "mondaymidstart", "mondaymidend",
  "tuesdayopen", "tuesdayclose", "tuesdaymidstart", "tuesdaymidend",
  "wednesdayopen", "wednesdayclose", "wednesdaymidstart", "wednesdaymidend",
  "thursdayopen", "thursdayclose", "thursdaymidstart", "thursdaymidend",
  "fridayopen", "fridayclose", "fridaymidstart", "fridaymidend",
  "saturdayopen", "saturdayclose", "saturdaymidstart", "saturdaymidend",
  "sundayopen", "sundayclose", "sundaymidstart", "sundaymidend",
  "saturdayhider", "sundayhider", "openingtext",
];

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
  return ergebnis;
}

async function main() {
  console.log("Hole Öffnungszeiten (Worksheet " + WORKSHEET_OEFFNUNGSZEITEN + ") …");
  const oeffnungszeitenZeilen = await holeWorksheet(WORKSHEET_OEFFNUNGSZEITEN);
  console.log(`  ${oeffnungszeitenZeilen.length} Zeile(n).`);

  console.log("Hole Kontakt (Worksheet " + WORKSHEET_KONTAKT + ") …");
  const kontaktZeilen = await holeWorksheet(WORKSHEET_KONTAKT);
  console.log(`  ${kontaktZeilen.length} Zeile(n).`);

  console.log("Hole Einstellungen (Worksheet " + WORKSHEET_EINSTELLUNGEN + ") …");
  const einstellungenZeilen = await holeWorksheet(WORKSHEET_EINSTELLUNGEN);
  console.log(`  ${einstellungenZeilen.length} Zeile(n).`);

  // Erste Zeile je Worksheet (sortBy=_id, aufsteigend) – bei mehreren Zeilen
  // im Kontakt-Worksheet (hier: zwei, eine für die Postanschrift, eine für
  // die Sportstätte) ist unklar, welche für "die Kontaktzeile" auf
  // kontakt.html gilt; ohne weitere Vorgabe wird die erste genommen (siehe
  // Abschlussbericht, Abschnitt "Offene Fragen").
  const oeffnungszeiten = nurFelder(oeffnungszeitenZeilen[0], OEFFNUNGSZEITEN_FELDER);
  const kontakt = nurFelder(kontaktZeilen[0], KONTAKT_FELDER);
  // Einstellungen-Worksheet: erste Zeile, nur das Feld "openingActive"
  // (gleiche Bedeutung wie in der App – dort blendet
  // "if (einstellungen.openingActive !== true) return;" die
  // Öffnungszeiten-Anzeige aus).
  const oeffnungszeitenAktiv = einstellungenZeilen[0]?.openingActive === true;

  const ausgabe = {
    _quelle: `appack public workbook API, Worksheets ${WORKSHEET_OEFFNUNGSZEITEN} (Öffnungszeiten), ${WORKSHEET_KONTAKT} (Kontakt) und ${WORKSHEET_EINSTELLUNGEN} (Einstellungen, nur Feld openingActive), geholt am ${new Date().toISOString().slice(0, 10)} mit tools/appack-daten.mjs. Nur die in der W3-Spezifikation genannten Felder; keine Personendaten, "mobileNumber" bewusst nicht übernommen.`,
    oeffnungszeitenAktiv,
    oeffnungszeiten,
    kontakt,
  };

  writeFileSync(ZIEL, JSON.stringify(ausgabe, null, 2) + "\n", "utf8");
  console.log(`Geschrieben: ${path.relative(ROOT, ZIEL)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
