#!/usr/bin/env node
// Speuzer Website Prototyp – Fremdbibliotheken für den Aufnahmeantrag online
// (28.09.2026). Kopiert pdf-lib und @pdf-lib/fontkit (beide MIT,
// devDependencies in package.json) aus node_modules/ nach assets/js/antrag/
// und stellt jeder Datei ihren Lizenzhinweis voran. Der Programmcode bleibt
// unverändert, nur der Verweis auf die Source-Map am Dateiende entfällt (die
// .map-Dateien werden nicht mit ausgeliefert, der Browser würde sie sonst in
// den Entwicklerwerkzeugen vergeblich anfragen).
//
// Aufruf: npm install, dann npm run antrag-bibliotheken. Das Ergebnis wird
// committet (wie assets/huelle/ aus npm run huelle-bilder); npm run build
// kopiert es mit assets/ nach docs/, tools/appack-paket.mjs von dort in den
// Workspace-Ordner web/. Prüft außerdem die Schriftdatei
// assets/fonts/liberation-sans-regular.ttf gegen die dokumentierte Prüfsumme
// (assets/fonts/LIZENZ-liberation-sans.txt): Sie wird nicht umgewandelt,
// sondern unverändert ausgeliefert (SIL OFL 1.1 mit Reserved Font Name).
//
// Nachbesserung 28.09.2026: schreibt außerdem data/aufnahmeantrag-
// schriftbreiten.json – die Breite jedes Zeichens, das das Formular annimmt
// (gleicher Zeichenvorrat wie ERLAUBT in assets/js/antrag/aufnahmeantrag.js),
// je der größere Wert aus Liberation Sans und Helvetica (pdf-lib), in 1/1000
// em. Damit prüft das Formular schon beim Tippen, ob eine Angabe ins Feld des
// Vereins-PDF passt, ohne kleiner als 6 pt zu werden – pdf-lib wird dafür
// nicht gebraucht (lädt erst später). Der Build liest die Datei wie alle
// data/*.json und bettet sie in die Seite ein.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const NODE_MODULES = path.join(ROOT, "node_modules");
const ZIEL = path.join(ROOT, "assets", "js", "antrag");
const SCHRIFT = path.join(ROOT, "assets", "fonts", "liberation-sans-regular.ttf");
const SCHRIFT_SHA256 = "76d04c18ea243f426b7de1f3ad208e927008f961dc5945e5aad352d0dfde8ee8";
const BREITEN_ZIEL = path.join(ROOT, "data", "aufnahmeantrag-schriftbreiten.json");

// Zeichenvorrat des Formulars – muss zu ERLAUBT in
// assets/js/antrag/aufnahmeantrag.js passen (lateinische Schrift samt
// Erweiterungen und übliche Satzzeichen).
const ZEICHENBEREICHE = [
  [0x20, 0x7e], [0xa0, 0x24f], [0x1e00, 0x1e9b], [0x1e9e, 0x1e9e], [0x1ea0, 0x1ef9],
  [0x2010, 0x2010], [0x2012, 0x2015], [0x2018, 0x201e], [0x2020, 0x2022], [0x2026, 0x2026],
  [0x2030, 0x2030], [0x2039, 0x203a], [0x20ac, 0x20ac], [0x2122, 0x2122],
];

const MIT_TEXT = `Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

const BIBLIOTHEKEN = [
  {
    paket: "pdf-lib",
    quelle: "dist/pdf-lib.min.js",
    ziel: "aufnahmeantrag-pdf-lib.js",
    globalName: "PDFLib",
    kopf: [
      "Copyright (c) 2019 Andrew Dillon (pdf-lib, https://github.com/Hopding/pdf-lib)",
      "Enthält: pako 1.0.11 – Copyright (C) 2014-2017 by Vitaly Puzrin and Andrei Tuputcyn (MIT);",
      "@pdf-lib/standard-fonts 1.0.0 – Copyright (c) 2018 Andrew Dillon (MIT);",
      "@pdf-lib/upng 1.0.1 – Copyright (c) 2017 Photopea (MIT);",
      "tslib 1.x – Copyright (c) Microsoft Corporation (Apache License 2.0, Hinweis unten im Bündel).",
    ],
  },
  {
    paket: "@pdf-lib/fontkit",
    quelle: "dist/fontkit.umd.min.js",
    ziel: "aufnahmeantrag-fontkit.js",
    globalName: "fontkit",
    kopf: [
      "Copyright (c) 2014 Devon Govett (fontkit, https://github.com/foliojs/fontkit)",
      "Anpassungen Copyright (c) 2019 Andrew Dillon (@pdf-lib/fontkit, https://github.com/Hopding/fontkit)",
      "Enthält gebündelt weitere Hilfsbibliotheken aus dem Bau des Pakets (u. a. restructure,",
      "unicode-properties, unicode-trie, tiny-inflate, brotli, dfa, clone, deep-equal, buffer,",
      "pako) unter MIT- bzw. BSD-Lizenz; maßgeblich ist das Quellpaket bei npm.",
    ],
  },
];

function sha256(inhalt) {
  return createHash("sha256").update(inhalt).digest("hex");
}

function main() {
  mkdirSync(ZIEL, { recursive: true });

  for (const b of BIBLIOTHEKEN) {
    const paketDir = path.join(NODE_MODULES, ...b.paket.split("/"));
    const quellPfad = path.join(paketDir, b.quelle);
    if (!existsSync(quellPfad)) {
      console.error(`${path.relative(ROOT, quellPfad)} fehlt – zuerst 'npm install' ausführen.`);
      process.exit(1);
    }
    const version = JSON.parse(readFileSync(path.join(paketDir, "package.json"), "utf8")).version;
    const code = readFileSync(quellPfad, "utf8").replace(/\n?\/\/# sourceMappingURL=\S+\s*$/, "\n");
    if (!code.includes(b.globalName)) {
      throw new Error(`${b.paket}: globaler Name '${b.globalName}' nicht im Bündel gefunden`);
    }
    const kopf = [
      `/*! ${b.ziel} – ${b.paket} ${version} (npm, ${b.quelle}), unverändert übernommen`,
      "    für den Aufnahmeantrag online des F.F.V. Sportfreunde 04 (siehe LIZENZ.txt).",
      "",
      "MIT License",
      "",
      ...b.kopf,
      "",
      MIT_TEXT,
      "*/",
    ].join("\n");
    const ausgabe = `${kopf}\n${code}`;
    writeFileSync(path.join(ZIEL, b.ziel), ausgabe, "utf8");
    console.log(`${b.ziel}: ${b.paket} ${version}, ${Buffer.byteLength(ausgabe)} Byte, sha256 ${sha256(ausgabe)}`);
  }

  if (!existsSync(SCHRIFT)) {
    console.error(`${path.relative(ROOT, SCHRIFT)} fehlt (siehe assets/fonts/LIZENZ-liberation-sans.txt).`);
    process.exit(1);
  }
  const schriftHash = sha256(readFileSync(SCHRIFT));
  if (schriftHash !== SCHRIFT_SHA256) {
    console.error(`${path.relative(ROOT, SCHRIFT)}: sha256 ${schriftHash}, erwartet ${SCHRIFT_SHA256} (Datei verändert?)`);
    process.exit(1);
  }
  console.log(`liberation-sans-regular.ttf: unverändert (sha256 ${schriftHash})`);

  schreibeSchriftbreiten();
}

// Zeichenbreiten für die Längenprüfung im Formular (siehe Kopf). Aufgerundet
// und je Zeichen der größere Wert aus beiden Schriften, damit die Prüfung
// nie zu großzügig ist. Gruppiert nach Breite: { "278": " !,./:;I…", … }.
function schreibeSchriftbreiten() {
  const require = createRequire(import.meta.url);
  const fontkit = require("@pdf-lib/fontkit");
  const { Font, FontNames, Encodings } = require("@pdf-lib/standard-fonts");
  const ttf = fontkit.create(readFileSync(SCHRIFT));
  const helvetica = Font.load(FontNames.Helvetica);
  const gruppen = new Map();
  const fehlend = [];
  let anzahl = 0;
  for (const [von, bis] of ZEICHENBEREICHE) {
    for (let cp = von; cp <= bis; cp++) {
      let breite = null;
      if (ttf.hasGlyphForCodePoint(cp)) breite = (ttf.glyphForCodePoint(cp).advanceWidth * 1000) / ttf.unitsPerEm;
      if (Encodings.WinAnsi.canEncodeUnicodeCodePoint(cp)) {
        const h = helvetica.getWidthOfGlyph(Encodings.WinAnsi.encodeUnicodeCodePoint(cp).name);
        if (typeof h === "number") breite = Math.max(breite ?? 0, h);
      }
      if (breite === null) { fehlend.push(cp.toString(16)); continue; }
      const schluessel = String(Math.ceil(breite - 1e-6));
      gruppen.set(schluessel, (gruppen.get(schluessel) ?? "") + String.fromCodePoint(cp));
      anzahl += 1;
    }
  }
  if (fehlend.length) throw new Error(`Liberation Sans: keine Glyphe für U+${fehlend.join(", U+")}`);
  const breiten = Object.fromEntries([...gruppen.entries()].sort((a, b) => Number(a[0]) - Number(b[0])));
  const ausgabe = {
    _beschreibung:
      "Zeichenbreiten für die Längenprüfung im Formular „Aufnahmeantrag online“ (assets/js/antrag/aufnahmeantrag.js): " +
      "je Breite in 1/1000 em die Zeichen mit dieser Breite. Erzeugt mit npm run antrag-bibliotheken " +
      "(tools/antrag-bibliotheken.mjs) aus Liberation Sans 2.1.5 (assets/fonts/liberation-sans-regular.ttf) " +
      "und der PDF-Standardschrift Helvetica (pdf-lib 1.17.1), je Zeichen der größere Wert, aufgerundet. Nicht von Hand ändern.",
    einheit_je_em: 1000,
    zeichen: anzahl,
    ersatz: 1000,
    breiten,
  };
  writeFileSync(BREITEN_ZIEL, JSON.stringify(ausgabe, null, 2) + "\n", "utf8");
  console.log(`${path.relative(ROOT, BREITEN_ZIEL)}: ${anzahl} Zeichen in ${gruppen.size} Breiten`);
}

main();
