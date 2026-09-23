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
const DATA_DIR = path.join(ROOT, "data");

const BASIS_CSS = readFileSync(path.join(SRC_APP, "v3-basis.css"), "utf8").trim();

// Reihenfolge wie in der C1-Spezifikation (Tabelle "Ziel"), C2 hängt die
// beiden neuen dynamischen Seiten (Geschäftsstelle & Anfahrt, Über uns) an.
const SEITEN = [
  { name: "Verein_v3", beschreibung: "Verteiler \"Verein\" (Tab 4 der neuen App)", stufe: "C1" },
  { name: "Mannschaften_v3", beschreibung: "Fußball: alle aktiven Mannschaften", stufe: "C1" },
  { name: "Karneval_v3", beschreibung: "Karnevalabteilung mit ihren Gruppen", stufe: "C1" },
  { name: "Vorstand_v3", beschreibung: "Vorstand & Ansprechpartner", stufe: "C1" },
  { name: "Sponsoren_v3", beschreibung: "Sponsoren & Partner", stufe: "C1" },
  { name: "Geschaeftsstelle_v3", beschreibung: "Geschäftsstelle & Anfahrt", stufe: "C2" },
  { name: "Ueber-uns_v3", beschreibung: "Über uns", stufe: "C2" },
];

// C2, Abschnitt 5: statische Workspace-Seite (kein ${userTitle}, kein
// appack-Kopf) – FUSSBALL.DE-Widgets sind nur für cdn.appack.de freigegeben,
// siehe LIESMICH.md. W6: Mannschaften-App.html löst Spielplan-App.html als
// verlinkte Seite ab (Spielplan & Tabelle stehen jetzt in der Detailansicht
// je Mannschaft, siehe src/app/Mannschaften-App.html); Spielplan-App.html
// bleibt als Rückweg im Repo und wird weiterhin mitgebaut.
// workbook:true (W6, Mannschaften-App): anders als Spielplan-App.html liest
// diese Seite die Abteilungen-Worksheets zur Laufzeit über die
// Workbook-API – geprüft am 23.09.2026: cdn.appack.de darf die öffentliche
// Worksheet-Schnittstelle per POST lesen (CORS erlaubt), Workbook.load aus
// https://cdn.appack.de/modules/appack.workbook-1.4.1.js funktioniert also
// auch auf einer statischen Workspace-Seite dort. baueStatischeVorlage()
// bindet deshalb für solche Seiten zusätzlich jQuery + appack.workbook ein
// (dieselben zwei <script>-Adressen wie bei den dynamischen _v3.tpl-Seiten).
const STATISCHE_SEITEN = [
  { name: "Spielplan-App", titel: "Spielplan & Tabellen" },
  { name: "Mannschaften-App", titel: "Mannschaften", workbook: true },
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

function kopfKommentar(name, beschreibung, stufe) {
  const abschnitt = stufe === "C2" ? "Stufe C2" : "Stufe C";
  return [
    "/* Speuzer Blau-Weiß – " + name + ".tpl (" + stufe + ")",
    "   appack-Vorlage für die Seite \"" + beschreibung + "\". Kopf- und Tab-Leiste",
    "   kommen von der App-Huelle und sind NICHT Teil dieser Vorlage (kein eigener",
    "   Kopf, kein eigener Fuss). Erzeugt aus src/app/v3-basis.css + src/app/" + name + ".html",
    "   durch tools/app-optik/tpl-bauen.mjs (npm run tpl-bauen) – NICHT von Hand",
    "   bearbeiten, sondern die Quelldateien unter src/app/ ändern und neu bauen.",
    "   Details/Datenquellen: siehe assets/app/LIESMICH.md, Abschnitt \"" + abschnitt + "\". */",
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

function baueVorlage(name, beschreibung, stufe, teile) {
  const teileHtml = [
    KOPF,
    "",
    kopfKommentar(name, beschreibung, stufe),
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

// ---------- Bauzeit-Werte (C2): Zahlen für Ueber-uns_v3 aus data/*.json ----------
// Kein appack-"${" – eigene Platzhalter (__NAME__), hier per String.replace
// ersetzt, bevor die Vorlage zusammengesetzt wird.

function bauzeitWerte() {
  const verein = JSON.parse(readFileSync(path.join(DATA_DIR, "verein.json"), "utf8"));
  const karneval = JSON.parse(readFileSync(path.join(DATA_DIR, "karneval.json"), "utf8"));
  return {
    __ANZAHL_MANNSCHAFTEN__: String(verein.anzahl_mannschaften ?? ""),
    __ANZAHL_KARNEVALGRUPPEN__: String((karneval.gruppen ?? []).length),
  };
}

function ersetzeBauzeitWerte(html, werte) {
  let ergebnis = html;
  for (const [platzhalter, wert] of Object.entries(werte)) {
    ergebnis = ergebnis.split(platzhalter).join(wert);
  }
  return ergebnis;
}

// ---------- W8: dieselben Daten wie die Website (Grundsatz Daten) ----------
// Wo die Website ihre Inhalte aus data/*.json bezieht (Mannschaften,
// Zusatzangebote/Fußballschulen, Verein-/Geschäftsstellen-Angaben, Karneval,
// Vorstand, Sponsoren), sollen die App-Vorlagen dieselben Daten verwenden –
// wie __WIDGETS_JSON__ per String.replace() zur Bauzeit eingesetzt, bevor
// die Vorlage zusammengesetzt wird. Nur öffentlich unbedenkliche Felder
// (keine privaten Telefonnummern) – die Quell-JSONs enthalten ohnehin keine.
// Ein Platzhalter, der in einer Datei nicht vorkommt, bleibt folgenlos
// (String.split().join() auf einen nicht vorhandenen Text ändert nichts).
function datenPlatzhalter() {
  const laden = (datei) => JSON.parse(readFileSync(path.join(DATA_DIR, datei), "utf8"));
  return {
    __TEAMS_JSON__: JSON.stringify(laden("teams.json")),
    __ZUSATZANGEBOTE_JSON__: JSON.stringify(laden("zusatzangebote.json")),
    __VEREIN_JSON__: JSON.stringify(laden("verein.json")),
    __GESCHAEFTSSTELLE_JSON__: JSON.stringify(laden("geschaeftsstelle.json")),
    __KARNEVAL_JSON__: JSON.stringify(laden("karneval.json")),
    __VORSTAND_JSON__: JSON.stringify(laden("vorstand.json")),
    __SPONSOREN_JSON__: JSON.stringify(laden("sponsoren.json")),
  };
}

// ---------- Statische Seite (C2, Abschnitt 5) ----------

function htmlEscapen(text) {
  return text
    .split("&").join("&amp;")
    .split("<").join("&lt;")
    .split(">").join("&gt;");
}

const KOPF_STATISCH_ZEILEN = (titel) => [
  "<!DOCTYPE html>",
  '<html lang="de">',
  "<head>",
  '<meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">',
  '<meta name="format-detection" content="telephone=no">',
  '<meta name="format-detection" content="address=no">',
  '<meta name="format-detection" content="email=no">',
  '<meta name="format-detection" content="date=no">',
  `<title>${htmlEscapen(titel)}</title>`,
  "<style>",
];

function kopfKommentarStatisch(name) {
  return [
    "<!-- Speuzer Blau-Weiß – " + name + ".html (C2)",
    "     Statische Workspace-Seite (kein appack-Modul, kein FreeMarker-Titelausdruck): FUSSBALL.DE-",
    "     Widgets sind nur für die Domain cdn.appack.de freigegeben, eine dynamische",
    "     .tpl-Seite (appack.de/rest-api/drender/...) könnte sie nicht zeigen. Wird 1:1 in",
    "     den appack-Workspace hochgeladen und unter",
    "     https://cdn.appack.de/sportfreunde04/workspace/" + name + ".html ausgeliefert.",
    "     Erzeugt aus src/app/" + name + ".html durch tools/app-optik/tpl-bauen.mjs",
    "     (npm run tpl-bauen) – NICHT von Hand bearbeiten. Details: assets/app/LIESMICH.md,",
    "     Abschnitt \"Stufe C2\". -->",
    "",
  ].join("\n");
}

function baueStatischeVorlage(name, titel, teile, braucheWorkbook) {
  // W6 (Mannschaften-App): braucheWorkbook bindet dieselben zwei
  // <script>-Adressen ein wie die dynamischen _v3.tpl-Seiten (siehe
  // baueVorlage() oben) – nötig, weil diese Seite die Übersicht/
  // Trainingszeiten/Buttons/Kategorien/Einstellungen-Worksheets zur
  // Laufzeit per Workbook.load() liest (siehe STATISCHE_SEITEN oben).
  const workbookSkripte = braucheWorkbook
    ? [
        '<script src="https://cdn.appack.de/modules/common/jquery-3.4.1.min.js"></script>',
        '<script src="https://cdn.appack.de/modules/appack.workbook-1.4.1.js"></script>',
        "",
      ]
    : [];
  const teileHtml = [
    KOPF_STATISCH_ZEILEN(titel).join("\n"),
    "",
    kopfKommentarStatisch(name),
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
    ...workbookSkripte,
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
  const werte = bauzeitWerte();
  const datenWerte = datenPlatzhalter();
  for (const { name, beschreibung, stufe } of SEITEN) {
    const quellDatei = path.join(SRC_APP, `${name}.html`);
    let html = readFileSync(quellDatei, "utf8");
    if (name === "Ueber-uns_v3") html = ersetzeBauzeitWerte(html, werte);
    html = ersetzeBauzeitWerte(html, datenWerte);
    const teile = teileQuelle(html, `${name}.html`);
    const vorlage = baueVorlage(name, beschreibung, stufe, teile);
    const zielDatei = path.join(ZIEL_APP, `${name}.tpl`);
    writeFileSync(zielDatei, vorlage, "utf8");
    console.log(`  assets/app/${name}.tpl geschrieben (${vorlage.length} Zeichen)`);
  }

  const widgets = JSON.parse(readFileSync(path.join(DATA_DIR, "widgets.json"), "utf8"));
  delete widgets._hinweis;
  for (const { name, titel, workbook } of STATISCHE_SEITEN) {
    const quellDatei = path.join(SRC_APP, `${name}.html`);
    let html = readFileSync(quellDatei, "utf8");
    html = html.split("__WIDGETS_JSON__").join(JSON.stringify(widgets));
    html = ersetzeBauzeitWerte(html, datenWerte);
    const teile = teileQuelle(html, `${name}.html`);
    const vorlage = baueStatischeVorlage(name, titel, teile, workbook === true);
    const zielDatei = path.join(ZIEL_APP, `${name}.html`);
    writeFileSync(zielDatei, vorlage, "utf8");
    console.log(`  assets/app/${name}.html geschrieben (${vorlage.length} Zeichen)`);
  }

  console.log("Fertig.");
}

main();
