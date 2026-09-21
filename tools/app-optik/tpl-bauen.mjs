#!/usr/bin/env node
// Speuzer Website Prototyp – C1: Bauskript für die fünf Vereinsseiten-Vorlagen
// (Verein_v3, Mannschaften_v3, Karneval_v3, Vorstand_v3, Sponsoren_v3).
//
// Setzt aus src/app/v3-basis.css (Schriften, Tokens, Grundregeln, gemeinsame
// Bausteine – wörtlich aus assets/app/Startseite_v3.tpl extrahiert) und je
// einer src/app/<Name>.html (Body-Markup + seitenspezifisches <style> +
// <script>) die appack-Vorlagen assets/app/<Name>.tpl zusammen. Derselbe
// <head> wie Startseite_v3.tpl (meta viewport, format-detection-Metas,
// <title>${userTitle}</title>).
//
// Startseite_v3.tpl (B1) bleibt unverändert und wird NICHT von diesem
// Skript gebaut/berührt – sie ist produktiv (siehe assets/app/LIESMICH.md).
//
// Aufruf: npm run tpl-bauen

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SRC_APP = path.join(ROOT, "src", "app");
const ZIEL_APP = path.join(ROOT, "assets", "app");

const BASIS_CSS = readFileSync(path.join(SRC_APP, "v3-basis.css"), "utf8").trim();

// Reihenfolge wie in der C1-Spezifikation (Tabelle "Ziel").
const SEITEN = [
  { name: "Verein_v3", beschreibung: "Verteiler \"Verein\" (Tab 4 der neuen App)" },
  { name: "Mannschaften_v3", beschreibung: "Fußball: alle aktiven Mannschaften" },
  { name: "Karneval_v3", beschreibung: "Karnevalabteilung mit ihren Gruppen" },
  { name: "Vorstand_v3", beschreibung: "Vorstand & Ansprechpartner" },
  { name: "Sponsoren_v3", beschreibung: "Sponsoren & Partner" },
];

// Kopf der Vorlage als Zeilen-Array statt Template-Literal: "${userTitle}"
// muss WÖRTLICH in der erzeugten .tpl-Datei stehen (appack-FreeMarker-
// Ausgabe), ein JS-Template-Literal würde das als JS-Ausdruck auswerten.
const KOPF_ZEILEN = [
  "<!DOCTYPE html>",
  '<html lang="de">',
  "<head>",
  '<meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">',
  '<meta name="format-detection" content="telephone=no">',
  '<meta name="format-detection" content="address=no">',
  '<meta name="format-detection" content="email=no">',
  '<meta name="format-detection" content="date=no">',
  "<title>" + "$" + "{userTitle}" + "</title>",
  "<style>",
];
const KOPF = KOPF_ZEILEN.join("\n");

function kopfKommentar(name, beschreibung) {
  return [
    "/* Speuzer Blau-Weiß – " + name + ".tpl (C1)",
    "   appack-Vorlage für die Seite \"" + beschreibung + "\". Kopf- und Tab-Leiste",
    "   kommen von der App-Huelle und sind NICHT Teil dieser Vorlage (kein eigener",
    "   Kopf, kein eigener Fuss). Erzeugt aus src/app/v3-basis.css + src/app/" + name + ".html",
    "   durch tools/app-optik/tpl-bauen.mjs (npm run tpl-bauen) – NICHT von Hand",
    "   bearbeiten, sondern die Quelldateien unter src/app/ ändern und neu bauen.",
    "   Details/Datenquellen: siehe assets/app/LIESMICH.md, Abschnitt \"Stufe C\". */",
    "",
  ].join("\n");
}

// ---------- Quelle in Body/Style/Script zerlegen ----------

function teileQuelle(html, dateiname) {
  const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!styleMatch) throw new Error(`${dateiname}: kein <style>-Block gefunden`);
  if (!scriptMatch) throw new Error(`${dateiname}: kein <script>-Block gefunden`);
  if (scriptMatch.index < styleMatch.index) {
    throw new Error(`${dateiname}: <script> vor <style> – Reihenfolge Body/Style/Script erwartet`);
  }
  const body = html.slice(0, styleMatch.index).trim();
  return { body, style: styleMatch[1].trim(), script: scriptMatch[1].trim() };
}

// ---------- Vorlage zusammensetzen ----------

function baueVorlage(name, beschreibung, teile) {
  const teileHtml = [
    KOPF,
    "",
    kopfKommentar(name, beschreibung),
    BASIS_CSS,
    "",
    teile.style,
    "</style>",
    "</head>",
    "<body>",
    '<main class="inhalt">',
    "",
    teile.body,
    "",
    "</main>",
    "",
    '<script src="https://cdn.appack.de/modules/common/jquery-3.4.1.min.js"></script>',
    '<script src="https://cdn.appack.de/modules/appack.workbook-1.4.1.js"></script>',
    "<script>",
    teile.script,
    "</script>",
    "</body>",
    "</html>",
    "",
  ];
  return teileHtml.join("\n");
}

function main() {
  for (const { name, beschreibung } of SEITEN) {
    const quellDatei = path.join(SRC_APP, `${name}.html`);
    const html = readFileSync(quellDatei, "utf8");
    const teile = teileQuelle(html, `${name}.html`);
    const vorlage = baueVorlage(name, beschreibung, teile);
    const zielDatei = path.join(ZIEL_APP, `${name}.tpl`);
    writeFileSync(zielDatei, vorlage, "utf8");
    console.log(`  assets/app/${name}.tpl geschrieben (${vorlage.length} Zeichen)`);
  }
  console.log("Fertig.");
}

main();
