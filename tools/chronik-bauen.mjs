#!/usr/bin/env node
// Speuzer – Chronik: Word-Datei in Web- und App-Seiten übersetzen.
//
// Die Vereinschronik wird vom Verein in Word gepflegt
// (Chronik_FFV_Sportfreunde_04_2026.docx, Formatvorlagen Eyebrow/Heading1/
// Lead/Heading2/Caption/Source). Dieses Werkzeug liest die Datei und erzeugt
// daraus die Seiten für Website und App. Eine Quelle, keine Doppelpflege:
// geändert wird in Word, danach dieses Skript erneut laufen lassen.
//
// WICHTIG – Ausgabe liegt bewusst NICHT im Repo:
// Die Chronik nennt Namen aus Mannschaftsfotos, auch von damals
// Jugendlichen. Sie wird über appack veröffentlicht (dort greift die
// robots.txt-Sperre), soll aber nicht zusätzlich im öffentlichen
// GitHub-Repo liegen. Deshalb steht hier nur das Werkzeug; Quelle und
// Ergebnis bleiben außerhalb (Vereinsordner bzw. --ziel).
//
// Aufruf:
//   node tools/chronik-bauen.mjs --quelle <pfad.docx> --ziel <verzeichnis>
//
// Ergebnis im Zielverzeichnis:
//   web/chronik.html              Übersicht mit Vorwort und Zeitleiste
//   web/chronik-<slug>.html       je Kapitel eine Seite (Website)
//   web/bilder/…                  Bilder fürs Web (JPEG)
//   app/Chronik-App.html          eine Seite mit Kapitelumschaltung (App)
//   manifest.json                 Dateien, Größen, Prüfsummen

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, readdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PAGES = "https://justolgay.github.io/speuzer-website-prototyp";
const CDN = "https://cdn.appack.de/sportfreunde04";

// ---------- Aufrufparameter ----------

function parameter() {
  const args = process.argv.slice(2);
  const wert = (name) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : null;
  };
  const quelle = wert("--quelle");
  const ziel = wert("--ziel");
  if (!quelle || !ziel) {
    console.error("Aufruf: node tools/chronik-bauen.mjs --quelle <pfad.docx> --ziel <verzeichnis>");
    process.exit(2);
  }
  return { quelle: path.resolve(quelle), ziel: path.resolve(ziel) };
}

// ---------- Word-Datei lesen ----------

function entpacke(docx) {
  const temp = path.join(os.tmpdir(), "speuzer-chronik-" + Date.now());
  mkdirSync(temp, { recursive: true });
  execFileSync("unzip", ["-o", "-q", docx, "-d", temp]);
  return temp;
}

function beziehungen(temp) {
  const datei = path.join(temp, "word", "_rels", "document.xml.rels");
  const xml = readFileSync(datei, "utf8");
  const karte = new Map();
  for (const treffer of xml.matchAll(/Id="(rId\d+)"[^>]*Target="([^"]+)"/g)) {
    karte.set(treffer[1], treffer[2]);
  }
  return karte;
}

// ---------- XML-Bausteine ----------

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function entferneTags(xml) {
  return xml.replace(/<[^>]+>/g, "");
}

function xmlText(roh) {
  return roh
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'");
}

// Ein <w:r>-Lauf mit Auszeichnung: fett und kursiv werden übernommen, alles
// andere (Farben, Schriftgrößen) bewusst nicht – das Aussehen kommt aus dem
// Gestaltungssystem der Website.
function laufHtml(lauf) {
  const teile = [...lauf.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)].map((m) => xmlText(m[1]));
  let text = teile.join("");
  if (/<w:br\b/.test(lauf) && !text) text = " ";
  if (!text) return "";
  let html = escapeHtml(text);
  const eigenschaften = lauf.match(/<w:rPr>[\s\S]*?<\/w:rPr>/)?.[0] ?? "";
  if (/<w:i\/>|<w:i\s/.test(eigenschaften)) html = `<em>${html}</em>`;
  if (/<w:b\/>|<w:b\s/.test(eigenschaften)) html = `<strong>${html}</strong>`;
  return html;
}

// Quellenverweise [13] oder [1, 2] im Fließtext auf das Quellenkapitel zeigen
// lassen. Auf der Chronik-Übersicht und in der App bleibt die Nummer stehen,
// verlinkt wird auf den Abschnitt "Quellen und Anmerkungen".
function verweiseVerlinken(html, quellenZiel) {
  if (!quellenZiel) return html;
  return html.replace(/\[(\d+[0-9a-z]?(?:,\s*\d+[0-9a-z]?)*)\]/g, (treffer, inhalt) => {
    const erste = inhalt.split(",")[0].trim();
    return `<a class="quellenverweis" href="${quellenZiel}#quelle-${erste}" title="Zu den Quellen">${escapeHtml(treffer)}</a>`;
  });
}

function absatzHtml(absatz, rels, quellenZiel) {
  // Hyperlinks zuerst: <w:hyperlink r:id> umschließt eigene Läufe
  let inhalt = "";
  const teile = absatz.split(/(<w:hyperlink[\s\S]*?<\/w:hyperlink>)/);
  for (const teil of teile) {
    if (teil.startsWith("<w:hyperlink")) {
      const id = teil.match(/r:id="(rId\d+)"/)?.[1];
      const ziel = id ? rels.get(id) : null;
      const text = [...teil.matchAll(/<w:r\b[\s\S]*?<\/w:r>/g)].map((m) => laufHtml(m[0])).join("");
      inhalt += ziel
        ? `<a href="${escapeHtml(ziel)}" target="_blank" rel="noopener">${text}</a>`
        : text;
    } else {
      inhalt += [...teil.matchAll(/<w:r\b[\s\S]*?<\/w:r>/g)].map((m) => laufHtml(m[0])).join("");
    }
  }
  return verweiseVerlinken(inhalt, quellenZiel);
}

function stilVon(absatz) {
  return absatz.match(/w:pStyle w:val="([^"]+)"/)?.[1] ?? "Standard";
}

function bildVon(absatz, rels) {
  const id = absatz.match(/r:embed="(rId\d+)"/)?.[1];
  if (!id) return null;
  const ziel = rels.get(id);
  return ziel ? path.basename(ziel) : null;
}

// ---------- Tabellen ----------

function tabelleHtml(tabelle, rels, quellenZiel) {
  const zeilen = [...tabelle.matchAll(/<w:tr\b[\s\S]*?<\/w:tr>/g)].map((m) => m[0]);
  if (!zeilen.length) return "";
  const zellenVon = (zeile) =>
    [...zeile.matchAll(/<w:tc\b[\s\S]*?<\/w:tc>/g)].map((m) =>
      [...m[0].matchAll(/<w:p\b[\s\S]*?<\/w:p>/g)]
        .map((p) => absatzHtml(p[0], rels, quellenZiel))
        .filter(Boolean)
        .join("<br>")
    );
  const kopf = zellenVon(zeilen[0]);
  const rumpf = zeilen.slice(1).map(zellenVon);
  const kopfHtml = kopf.map((z) => `<th scope="col">${z}</th>`).join("");
  const rumpfHtml = rumpf
    .map((zellen) => `<tr>${zellen.map((z) => `<td>${z}</td>`).join("")}</tr>`)
    .join("\n        ");
  return `<div class="tabelle-wrap">
      <table class="chronik-tabelle">
        <thead><tr>${kopfHtml}</tr></thead>
        <tbody>
        ${rumpfHtml}
        </tbody>
      </table>
    </div>`;
}

// ---------- Dokument in Kapitel zerlegen ----------

function leseKapitel(temp, rels) {
  const xml = readFileSync(path.join(temp, "word", "document.xml"), "utf8");
  // Absätze und Tabellen in Dokumentreihenfolge
  const bloecke = [...xml.matchAll(/<w:p\b[\s\S]*?<\/w:p>|<w:tbl>[\s\S]*?<\/w:tbl>/g)].map((m) => m[0]);

  const kapitel = [];
  let aktuell = null;
  let letzterEyebrow = null;

  for (const block of bloecke) {
    if (block.startsWith("<w:tbl")) {
      if (aktuell) aktuell.bloecke.push({ art: "tabelle", xml: block });
      continue;
    }
    const stil = stilVon(block);
    const text = entferneTags(block).trim();
    const bild = bildVon(block, rels);

    if (stil === "Title" || stil === "Subtitle") continue; // Deckblatt
    if (stil === "Eyebrow") {
      letzterEyebrow = xmlText(text);
      continue;
    }
    if (stil === "Heading1") {
      if (xmlText(text) === "Inhalt") {
        aktuell = null; // Inhaltsverzeichnis überspringen
        continue;
      }
      aktuell = {
        titel: xmlText(text),
        kicker: letzterEyebrow ?? "VEREINSGESCHICHTE",
        lead: null,
        bloecke: [],
      };
      kapitel.push(aktuell);
      continue;
    }
    if (!aktuell) continue; // alles vor dem ersten Kapitel (Inhaltsverzeichnis)

    if (stil === "Lead" && !aktuell.lead && !aktuell.bloecke.length) {
      aktuell.lead = xmlText(text);
      continue;
    }
    if (bild) {
      aktuell.bloecke.push({ art: "bild", datei: bild });
      continue;
    }
    if (!text) continue;
    aktuell.bloecke.push({ art: stil === "Heading2" ? "h2" : stil === "Caption" ? "caption" : stil === "Source" ? "source" : stil === "Lead" ? "zitat" : "p", xml: block });
  }
  return kapitel;
}

function slugVon(titel) {
  const jahre = titel.match(/(\d{4})\s*bis\s*(\d{4})/);
  if (jahre) return `${jahre[1]}-${jahre[2]}`;
  return titel
    .toLowerCase()
    .replaceAll("ä", "ae").replaceAll("ö", "oe").replaceAll("ü", "ue").replaceAll("ß", "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ---------- Bilder ----------

function bilderAufbereiten(temp, zielBilder, genutzte) {
  mkdirSync(zielBilder, { recursive: true });
  const karte = new Map();
  for (const datei of genutzte) {
    const quelle = path.join(temp, "word", "media", datei);
    if (!existsSync(quelle)) continue;
    const name = "chronik-" + path.basename(datei, path.extname(datei)) + ".jpg";
    const ziel = path.join(zielBilder, name);
    // Nur verkleinern, nie hochrechnen: die Bilder sind Scans aus der alten
    // Chronik (400 bis 690 px breit). Hochskalieren bläht die Datei auf, ohne
    // ein Detail mehr zu zeigen.
    const masse = execFileSync("sips", ["-g", "pixelWidth", quelle], { encoding: "utf8" });
    const breite = Number(masse.match(/pixelWidth:\s*(\d+)/)?.[1] ?? 1100);
    const zielBreite = Math.min(1100, breite);
    execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "72", "-Z", String(zielBreite), quelle, "--out", ziel], { stdio: "ignore" });
    karte.set(datei, name);
  }
  return karte;
}

// ---------- HTML: gemeinsame Bausteine ----------

// Tabellen müssen in Dokumentreihenfolge bleiben – dafür ein zweiter Durchlauf,
// der Absätze und Tabellen gemeinsam behandelt.
function kapitelHtml(kapitel, optionen) {
  const { rels, bildKarte, bildBasis, quellenZiel } = optionen;
  const teile = [];
  let offen = false;
  const schliesse = () => { if (offen) { teile.push(`  </div>\n</section>`); offen = false; } };
  const oeffne = () => { if (!offen) { teile.push(`<section class="abschnitt">\n  <div class="container fluss">`); offen = true; } };

  for (const block of kapitel.bloecke) {
    if (block.art === "tabelle") {
      oeffne();
      teile.push("    " + tabelleHtml(block.xml, rels, quellenZiel));
      continue;
    }
    if (block.art === "bild") {
      const name = bildKarte.get(block.datei);
      if (!name) continue;
      schliesse();
      teile.push(`<figure class="chronik-bild">
  <img src="${bildBasis}${name}" alt="Historische Aufnahme aus der Vereinschronik" loading="lazy" decoding="async">
  <figcaption class="chronik-bild__text" data-leer="ja"></figcaption>
</figure>`);
      continue;
    }
    const html = absatzHtml(block.xml, rels, quellenZiel);
    if (!html) continue;
    if (block.art === "caption") {
      for (let i = teile.length - 1; i >= 0; i--) {
        if (teile[i].includes('data-leer="ja"')) {
          teile[i] = teile[i].replace(
            `<figcaption class="chronik-bild__text" data-leer="ja"></figcaption>`,
            `<figcaption class="chronik-bild__text">${html}</figcaption>`
          );
          break;
        }
      }
      continue;
    }
    oeffne();
    const quellenNummer = (html.match(/^\[(\d+[0-9a-z]?)\]/) ?? [])[1];
    if (block.art === "h2") teile.push(`    <h2>${html}</h2>`);
    else if (block.art === "zitat") teile.push(`    <blockquote class="chronik-zitat">${html}</blockquote>`);
    else if (block.art === "source")
      teile.push(`    <p class="chronik-quelle"${quellenNummer ? ` id="quelle-${quellenNummer}"` : ""}>${html}</p>`);
    else teile.push(`    <p class="inhalt">${html}</p>`);
  }
  schliesse();
  return teile.join("\n");
}

// ---------- Website ----------

const CHRONIK_CSS = `<style>
.chronik-bild { margin: 0 0 var(--sp-4); }
.chronik-bild img { width: 100%; height: auto; border-radius: var(--radius, 12px); background: var(--blau-50, #eef0fb); display: block; }
.chronik-bild__text { font-size: 0.86rem; line-height: 1.5; color: var(--ink-2, #55607a); margin-top: var(--sp-2); }
.chronik-zitat { margin: 0 0 var(--sp-3); padding-left: var(--sp-3); border-left: 3px solid var(--blau, #191793); font-style: italic; color: var(--ink-2, #55607a); }
.chronik-quelle { font-size: 0.86rem; line-height: 1.55; color: var(--ink-2, #55607a); margin: 0 0 var(--sp-2); }
.quellenverweis { text-decoration: none; font-variant-numeric: tabular-nums; }
.tabelle-wrap { overflow-x: auto; margin: 0 0 var(--sp-4); }
.chronik-tabelle { width: 100%; border-collapse: collapse; font-size: 0.94rem; min-width: 420px; }
.chronik-tabelle th { background: var(--blau, #191793); color: #fff; text-align: left; padding: 10px 12px; font-weight: 600; }
.chronik-tabelle td { padding: 9px 12px; border-bottom: 1px solid var(--linie, #e3e6f0); vertical-align: top; }
.chronik-tabelle tbody tr:nth-child(odd) { background: var(--blau-50, #f4f6fd); }
.zeitleiste { list-style: none; margin: 0; padding: 0; }
.zeitleiste__punkt { position: relative; padding: 0 0 var(--sp-4) var(--sp-4); border-left: 2px solid var(--linie, #e3e6f0); }
.zeitleiste__punkt:last-child { border-left-color: transparent; padding-bottom: 0; }
.zeitleiste__punkt::before { content: ""; position: absolute; left: -7px; top: 4px; width: 12px; height: 12px; border-radius: 50%; background: var(--blau, #191793); }
.zeitleiste__jahre { display: block; font-family: var(--schrift-headline, inherit); font-size: 1.15rem; font-weight: 700; color: var(--blau, #191793); text-decoration: none; }
.zeitleiste__punkt a.zeitleiste__jahre:hover { text-decoration: underline; }
.zeitleiste__text { display: block; color: var(--ink-2, #55607a); margin-top: 2px; }
/* Zeitleiste auf blauem Grund: heller Text, sonst nicht lesbar */
.abschnitt--blau .zeitleiste__punkt { border-left-color: rgba(255,255,255,0.28); }
.abschnitt--blau .zeitleiste__punkt::before { background: #fff; }
.abschnitt--blau .zeitleiste__jahre { color: #fff; }
.abschnitt--blau .zeitleiste__text { color: rgba(255,255,255,0.82); }
.kapitelnav { display: flex; flex-wrap: wrap; gap: var(--sp-3); justify-content: space-between; }
.kapitelnav a { text-decoration: none; }
</style>`;

function webSeite({ titel, beschreibung, datei, inhalt }) {
  const t = escapeHtml(titel + " – FFV Sportfreunde 04");
  const b = escapeHtml(beschreibung);
  const url = `${CDN}/workspace/web/${datei}`;
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${t}</title>
<meta name="description" content="${b}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="FFV Sportfreunde 04">
<meta property="og:title" content="${t}">
<meta property="og:description" content="${b}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${PAGES}/assets/og/standard.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#191793">
<link rel="icon" href="${PAGES}/assets/logo/favicon.svg" type="image/svg+xml">
<link rel="icon" href="${PAGES}/assets/logo/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="${PAGES}/assets/logo/apple-touch-icon.png">
<link rel="preload" href="${PAGES}/assets/fonts/inter.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${PAGES}/assets/fonts/barlow-condensed-600.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${PAGES}/assets/fonts/barlow-condensed-700.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="site.css">
${CHRONIK_CSS}
</head>
<body class="ws ">
<main id="inhalt">
${inhalt}
</main>
<footer class="ws-fuss">
</footer>
</body>
</html>
`;
}

function brotkrumeHtml(teile) {
  const inner = teile
    .map((teil, i) => {
      const eintrag = teil.href
        ? `<li><a href="${escapeHtml(teil.href)}">${escapeHtml(teil.text)}</a></li>`
        : `<li><span aria-current="page">${escapeHtml(teil.text)}</span></li>`;
      return i === 0 ? eintrag : `<li aria-hidden="true">›</li>${eintrag}`;
    })
    .join("");
  return `<nav aria-label="Brotkrumen"><ol class="brotkrumen">${inner}</ol></nav>`;
}

function seitenkopf(brotkrume, titel, lead) {
  return `<section class="abschnitt seitenkopf">
  <div class="container">
    ${brotkrume}
    <h1>${escapeHtml(titel)}</h1>
    ${lead ? `<p class="seitenkopf__lead">${escapeHtml(lead)}</p>` : ""}
  </div>
</section>`;
}

// ---------- App ----------
//
// Die App nutzt dieselben Bausteine wie die übrigen v3-Seiten (siehe
// src/app/Ueber-uns_v3.html und Spielplan-App.html): <main class="inhalt">
// als Seitenrahmen, .abschnittstitel für Überschriften, .karte für
// Textblöcke, .filterleiste mit .tag.filter-knopf für die Kapitelwahl.
// Eigene Klassen gibt es nur dort, wo die Chronik etwas Neues braucht
// (Abbildungen, Quellenabsätze, Tabellen).

function appKapitelHtml(kapitel, { rels, bildKarte, bildBasis }) {
  const teile = [];
  let karteOffen = false;
  const schliesse = () => {
    if (karteOffen) { teile.push(`      </div>`); karteOffen = false; }
  };
  const oeffne = () => {
    if (!karteOffen) { teile.push(`      <div class="karte">`); karteOffen = true; }
  };

  for (const block of kapitel.bloecke) {
    if (block.art === "tabelle") {
      schliesse();
      teile.push(`      <div class="karte tabelle-wrapper">\n        ${tabelleHtml(block.xml, rels, "")}\n      </div>`);
      continue;
    }
    if (block.art === "bild") {
      const name = bildKarte.get(block.datei);
      if (!name) continue;
      schliesse();
      teile.push(`      <figure class="chronik-bild">
        <img src="${bildBasis}${name}" alt="Historische Aufnahme aus der Vereinschronik" loading="lazy" decoding="async">
        <figcaption class="chronik-bild__text" data-leer="ja"></figcaption>
      </figure>`);
      continue;
    }
    const html = absatzHtml(block.xml, rels, "");
    if (!html) continue;
    if (block.art === "caption") {
      for (let i = teile.length - 1; i >= 0; i--) {
        if (teile[i].includes('data-leer="ja"')) {
          teile[i] = teile[i].replace(
            `<figcaption class="chronik-bild__text" data-leer="ja"></figcaption>`,
            `<figcaption class="chronik-bild__text">${html}</figcaption>`
          );
          break;
        }
      }
      continue;
    }
    if (block.art === "h2") {
      schliesse();
      teile.push(`      <h2 class="abschnittstitel">${html}</h2>`);
      continue;
    }
    oeffne();
    if (block.art === "zitat") teile.push(`        <blockquote class="chronik-zitat">${html}</blockquote>`);
    else if (block.art === "source") teile.push(`        <p class="chronik-quelle">${html}</p>`);
    else teile.push(`        <p>${html}</p>`);
  }
  schliesse();
  return teile.join("\n");
}

function appSeite({ kapitel, bildKarte, rels, basisCss }) {
  const bildBasis = `${CDN}/images/`;
  const pillen = kapitel
    .map(
      (k, i) =>
        `    <button class="tag filter-knopf${i === 0 ? " filter-knopf--aktiv" : ""}" type="button" data-kapitel="${escapeHtml(k.slug)}">${escapeHtml(k.kurz)}</button>`
    )
    .join("\n");
  const abschnitte = kapitel
    .map(
      (k, i) => `  <div class="kapitel" id="kapitel-${escapeHtml(k.slug)}"${i === 0 ? "" : " hidden"}>
      <h2 class="abschnittstitel">${escapeHtml(k.titel)}</h2>
${k.lead ? `      <p class="kapitel-lead">${escapeHtml(k.lead)}</p>\n` : ""}${appKapitelHtml(k, { rels, bildKarte, bildBasis })}
  </div>`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
<meta name="format-detection" content="telephone=no">
<meta name="format-detection" content="address=no">
<meta name="format-detection" content="email=no">
<meta name="format-detection" content="date=no">
<title>Vereinschronik</title>
<style>
<!-- Speuzer Blau-Weiß – Chronik-App.html
     Statische Workspace-Seite, erzeugt aus der Word-Chronik des Vereins durch
     tools/chronik-bauen.mjs (Repo speuzer-website-prototyp) – NICHT von Hand
     bearbeiten. Geändert wird die Word-Datei, danach das Werkzeug erneut
     laufen lassen. Ausgeliefert unter
     https://cdn.appack.de/sportfreunde04/workspace/Chronik-App.html -->
${basisCss}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Kapitelwahl: gleiche Bausteine wie die Teamwahl auf Spielplan-App.html
   (dort im Seiten-CSS definiert, nicht in v3-basis.css). Die 15 Kapitel
   brechen bewusst um, damit alle auf einen Blick sichtbar sind. */
.filterleiste {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
  margin-bottom: var(--sp-4);
}

.filter-knopf {
  min-height: 44px;
  justify-content: center;
  border: none;
  cursor: pointer;
  font-family: inherit;
}

.filter-knopf--aktiv {
  background: var(--blau-700);
  color: var(--weiss);
}

.kapitel-lead { color: var(--ink-2); margin: calc(var(--sp-3) * -1) 0 var(--sp-4); }

.chronik-bild { margin: 0 0 var(--sp-4); }
.chronik-bild img { width: 100%; height: auto; border-radius: var(--r-md); background: var(--blau-50); display: block; }
.chronik-bild__text { font-size: 12px; line-height: 1.5; color: var(--ink-2); margin-top: var(--sp-2); }
.chronik-zitat { margin: 0 0 var(--sp-3); padding-left: var(--sp-3); border-left: 3px solid var(--blau-700); font-style: italic; color: var(--ink-2); }
.chronik-quelle { font-size: 12px; line-height: 1.55; color: var(--ink-2); margin: 0 0 var(--sp-2); }
.chronik-tabelle { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 380px; }
.chronik-tabelle th { background: var(--blau-700); color: var(--weiss); text-align: left; padding: 8px 10px; font-weight: 600; }
.chronik-tabelle td { padding: 7px 10px; border-bottom: 1px solid var(--line); vertical-align: top; }
.chronik-tabelle tbody tr:nth-child(odd) { background: var(--blau-50); }
.chronik-pdf { margin-top: var(--sp-6); }
</style>
</head>
<body>
<main class="inhalt">

<h1 class="visually-hidden">Vereinschronik</h1>

<div class="karte">
  <p>1904 bis 2026 – die Geschichte der Speuzer. Kapitel wählen und lesen.</p>
</div>

<div class="filterleiste" aria-label="Kapitel">
${pillen}
</div>

${abschnitte}

<div class="karte chronik-pdf">
  <p>Die vollständige Chronik gibt es auch als PDF zum Lesen und Ausdrucken.</p>
  <a class="knopf" href="${CDN}/pdf/Chronik-FFV-Sportfreunde-04-2026.pdf" target="_blank" rel="noopener">Chronik als PDF öffnen</a>
</div>

<p class="fuss">F.F.V. Sportfreunde 04 · Vereins-App</p>

</main>

<script>
(function () {
  "use strict";
  var knoepfe = [].slice.call(document.querySelectorAll(".filterleiste .filter-knopf"));
  var kapitel = [].slice.call(document.querySelectorAll(".kapitel"));

  function zeige(slug, scrollen) {
    var gefunden = false;
    kapitel.forEach(function (k) {
      var passt = k.id === "kapitel-" + slug;
      k.hidden = !passt;
      if (passt) gefunden = true;
    });
    if (!gefunden) return false;
    knoepfe.forEach(function (b) {
      var passt = b.getAttribute("data-kapitel") === slug;
      if (passt) b.classList.add("filter-knopf--aktiv");
      else b.classList.remove("filter-knopf--aktiv");
      if (passt && b.scrollIntoView) {
        b.scrollIntoView({ block: "nearest", inline: "center" });
      }
    });
    if (scrollen) window.scrollTo(0, 0);
    return true;
  }

  knoepfe.forEach(function (b) {
    b.addEventListener("click", function () {
      var slug = b.getAttribute("data-kapitel");
      zeige(slug, true);
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, "", "#" + slug);
      }
    });
  });

  var start = (window.location.hash || "").replace("#", "");
  if (start) zeige(start, false);
})();
</script>
</body>
</html>
`;
}

// ---------- Hauptlauf ----------

function main() {
  const { quelle, ziel } = parameter();
  if (!existsSync(quelle)) {
    console.error("Quelle nicht gefunden: " + quelle);
    process.exit(2);
  }
  console.log("Lese " + path.basename(quelle) + " …");
  const temp = entpacke(quelle);
  const rels = beziehungen(temp);
  const roh = leseKapitel(temp, rels);

  // Kapitel einteilen: Vorwort separat, Epochen als eigene Seiten,
  // Mannschaften/Ehrenamt und Quellen ans Ende.
  const vorwort = roh.find((k) => k.titel === "Vorwort") ?? null;
  const kapitel = roh
    .filter((k) => k !== vorwort)
    .map((k) => {
      const jahre = k.titel.match(/(\d{4})\s*bis\s*(\d{4})/);
      return {
        ...k,
        slug: slugVon(k.titel),
        kurz: jahre ? `${jahre[1]}–${jahre[2]}` : k.titel.replace(" und Anmerkungen", "").replace(" und Ehrenamt", ""),
        epoche: Boolean(jahre),
      };
    });

  console.log(`  ${roh.length} Kapitel, davon ${kapitel.filter((k) => k.epoche).length} Zeitabschnitte.`);

  const genutzteBilder = new Set();
  for (const k of roh) for (const b of k.bloecke) if (b.art === "bild") genutzteBilder.add(b.datei);

  rmSync(ziel, { recursive: true, force: true });
  const webDir = path.join(ziel, "web");
  const appDir = path.join(ziel, "app");
  const bilderDir = path.join(ziel, "bilder");
  mkdirSync(webDir, { recursive: true });
  mkdirSync(appDir, { recursive: true });

  console.log(`  ${genutzteBilder.size} Bilder aufbereiten …`);
  const bildKarte = bilderAufbereiten(temp, bilderDir, genutzteBilder);

  const quellenKapitel = kapitel.find((k) => k.titel.startsWith("Quellen"));
  const quellenDatei = quellenKapitel ? `chronik-${quellenKapitel.slug}.html` : "";
  const bildBasisWeb = `${CDN}/images/`;

  // Kapitelseiten
  const dateien = [];
  kapitel.forEach((k, i) => {
    const vorher = kapitel[i - 1];
    const nachher = kapitel[i + 1];
    const nav = `<section class="abschnitt">
  <div class="container">
    <p class="kapitelnav">
      ${vorher ? `<a href="chronik-${vorher.slug}.html">‹ ${escapeHtml(vorher.kurz)}</a>` : `<a href="chronik.html">‹ Übersicht</a>`}
      <a href="chronik.html">Alle Kapitel</a>
      ${nachher ? `<a href="chronik-${nachher.slug}.html">${escapeHtml(nachher.kurz)} ›</a>` : `<a href="verein-ueber-uns.html">Über uns ›</a>`}
    </p>
  </div>
</section>`;
    const inhalt = [
      seitenkopf(
        brotkrumeHtml([
          { text: "Verein", href: "verein.html" },
          { text: "Chronik", href: "chronik.html" },
          { text: k.kurz },
        ]),
        k.titel,
        k.lead
      ),
      kapitelHtml(k, { rels, bildKarte, bildBasis: bildBasisWeb, quellenZiel: quellenDatei }),
      nav,
    ].join("\n");
    const datei = `chronik-${k.slug}.html`;
    writeFileSync(
      path.join(webDir, datei),
      webSeite({
        titel: `${k.titel} – Chronik`,
        beschreibung: `Vereinschronik FFV Sportfreunde 04, Kapitel ${k.titel}${k.lead ? ": " + k.lead : ""}`.slice(0, 168),
        datei,
        inhalt,
      }),
      "utf8"
    );
    dateien.push(path.join("web", datei));
  });

  // Übersichtsseite mit Vorwort und Zeitleiste
  const zeitleiste = kapitel
    .map(
      (k) => `      <li class="zeitleiste__punkt">
        <a class="zeitleiste__jahre" href="chronik-${k.slug}.html">${escapeHtml(k.titel)}</a>
        <span class="zeitleiste__text">${escapeHtml(k.lead ?? "")}</span>
      </li>`
    )
    .join("\n");
  const vorwortHtml = vorwort
    ? kapitelHtml(vorwort, { rels, bildKarte, bildBasis: bildBasisWeb, quellenZiel: quellenDatei })
    : "";
  const uebersicht = [
    seitenkopf(
      brotkrumeHtml([{ text: "Verein", href: "verein.html" }, { text: "Chronik" }]),
      "Vereinschronik",
      "1904 bis 2026 – die Geschichte der Speuzer, Kapitel für Kapitel."
    ),
    vorwortHtml,
    `<section class="abschnitt abschnitt--blau">
  <div class="container">
    <h2>Die Kapitel</h2>
    <ul class="zeitleiste">
${zeitleiste}
    </ul>
  </div>
</section>`,
    `<section class="abschnitt">
  <div class="container fluss">
    <h2>Zum Lesen und Ausdrucken</h2>
    <p class="inhalt">Die vollständige Chronik gibt es auch als PDF mit allen Kapiteln, Tabellen und Bildern.</p>
    <p class="knopfzeile">
      <a class="knopf knopf--sekundaer" href="${CDN}/pdf/Chronik-FFV-Sportfreunde-04-2026.pdf" target="_blank" rel="noopener">Chronik als PDF (53 Seiten)</a>
    </p>
    <p><a href="verein-ueber-uns.html">‹ Zurück zu Über uns</a></p>
  </div>
</section>`,
  ].join("\n");
  writeFileSync(
    path.join(webDir, "chronik.html"),
    webSeite({
      titel: "Vereinschronik",
      beschreibung:
        "Die Geschichte des FFV Sportfreunde 04 von der Gründung 1904 als Frankfurter FC Britannia bis 2026: Kapitel, Mannschaften, Ehrenamt und Quellen.",
      datei: "chronik.html",
      inhalt: uebersicht,
    }),
    "utf8"
  );
  dateien.push(path.join("web", "chronik.html"));

  // App-Seite
  const basisCss = readFileSync(path.join(ROOT, "src", "app", "v3-basis.css"), "utf8").trim();
  const appKapitel = vorwort
    ? [{ ...vorwort, slug: "vorwort", kurz: "Vorwort", epoche: false }, ...kapitel]
    : kapitel;
  writeFileSync(
    path.join(appDir, "Chronik-App.html"),
    appSeite({ kapitel: appKapitel, bildKarte, rels, basisCss }),
    "utf8"
  );
  dateien.push(path.join("app", "Chronik-App.html"));
  for (const name of bildKarte.values()) dateien.push(path.join("bilder", name));

  // Manifest
  const manifest = {
    _quelle: path.basename(quelle),
    erzeugt: "tools/chronik-bauen.mjs",
    hinweis:
      "Ausgabe bewusst außerhalb des Repos: die Chronik nennt Namen aus Mannschaftsfotos. Veröffentlichung nur über appack.",
    dateien: dateien.map((rel) => {
      const voll = path.join(ziel, rel);
      const inhalt = readFileSync(voll);
      return {
        datei: rel,
        bytes: statSync(voll).size,
        sha256: createHash("sha256").update(inhalt).digest("hex"),
      };
    }),
  };
  writeFileSync(path.join(ziel, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");

  rmSync(temp, { recursive: true, force: true });

  console.log(`\nGeschrieben nach ${ziel}:`);
  console.log(`  ${kapitel.length} Kapitelseiten + Übersicht (web/)`);
  console.log(`  1 App-Seite mit ${appKapitel.length} Kapiteln (app/Chronik-App.html)`);
  console.log(`  ${bildKarte.size} Bilder (bilder/)`);
  const gesamt = manifest.dateien.reduce((s, d) => s + d.bytes, 0);
  console.log(`  ${(gesamt / 1024 / 1024).toFixed(2)} MB gesamt`);
}

main();
