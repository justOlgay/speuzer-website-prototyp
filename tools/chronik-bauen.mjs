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

// Eine Textersetzung nur außerhalb bestehender <a>-Links anwenden – sonst
// könnte ein Treffer mitten in einem href oder Linktext ein <span> einfügen
// und das Markup zerbrechen (W9, Befunde web-chronik 8 und 22).
function nurAusserhalbVonLinks(html, ersetzung) {
  return html
    .split(/(<a\b[\s\S]*?<\/a>)/g)
    .map((teil, i) => (i % 2 === 1 ? teil : ersetzung(teil)))
    .join("");
}

// Initialen/Namenskürzel ("B.", "Gg.", "Fr.") nicht vom folgenden Namen
// trennen lassen (W9, Befund web-chronik 8): geschütztes Leerzeichen statt
// normalem Leerzeichen. Bewusst auf ein bis zwei Buchstaben vor dem Punkt
// begrenzt, damit normale, zufällig kurze Wörter am Satzende nicht
// mitgetroffen werden.
function initialenBinden(html) {
  return nurAusserhalbVonLinks(html, (teil) =>
    teil.replace(/\b([A-ZÄÖÜ][a-zäöüß]?\.) (?=[A-ZÄÖÜ])/g, "$1&nbsp;")
  );
}

// "A-Jugend" bis "G-Jugend"/"-Junioren" nicht am Bindestrich trennen lassen
// (W9-Nachprüfung, Befund zu chronik-1945-1969/chronik-quellen-und-anmerkungen,
// Entscheidung 13 aus w9-gemeinsam.md gilt auch hier): geschützter
// Bindestrich (U+2011) statt normalem Bindestrich, analog zu
// initialenBinden(). Auch abgeleitete Formen wie "B-Jugendlicher" oder
// "A-Juniorenmannschaft" (Wortende erst nach weiteren Kleinbuchstaben)
// sind vom selben Umbruchproblem betroffen, deshalb kein \b direkt nach
// "Jugend"/"Junioren", sondern optionale Kleinbuchstaben mit anschließender
// Wortgrenze.
function jugendBindestrichBinden(html) {
  return nurAusserhalbVonLinks(html, (teil) =>
    teil.replace(/\b([A-G])-(Jugend[a-zäöüß]*|Junioren[a-zäöüß]*)\b/g, "$1‑$2")
  );
}

// Roh im Fließtext getippte Adressen und Dateinamen (kein Word-Hyperlink,
// nur eingetippter Text) als eigenes Element mit kleinerer Schrift und
// overflow-wrap:anywhere setzen, statt sie am eigenen Bindestrich umbrechen
// zu lassen (W9, Befund web-chronik 22). overflow-wrap:anywhere allein
// verhindert das nicht: ein vorhandener Bindestrich ("eintracht-archiv.de")
// bleibt für den Browser eine gültige Umbruchstelle, unabhängig von
// overflow-wrap (das nur greift, wenn es sonst KEINE Umbruchstelle gibt).
// Deshalb zusätzlich, nur innerhalb dieser Adress-Spanne, geschützte
// Bindestriche (U+2011) statt normaler Bindestriche setzen – optisch
// identisch, aber keine Umbruchstelle mehr.
const ADRESSE_REGEX = /\b[A-Za-z0-9][A-Za-z0-9._~%+-]*\.(?:de|com|net|org|it|pdf|png|jpe?g|htm|html)\b(?:\/[^\s,;<]*)?/g;
// Innerhalb einer erkannten Adresse zusätzlich an Pfadgrenzen (nach "/" und
// "_") sowie vor der Dateiendung eine <wbr>-Umbruchstelle einfügen, damit
// lange Adressen dort umbrechen statt mitten in der Endung wie ".ht"/"ml"
// (W9-Nachprüfung, Befund web-chronik 22 auf dem Handy).
function adressenUmbruchstellen(treffer) {
  return treffer
    .replaceAll("-", "‑")
    .replaceAll("/", "/<wbr>")
    .replaceAll("_", "_<wbr>")
    .replace(/\.(?=(?:de|com|net|org|it|pdf|png|jpe?g|htm|html)\b)/g, ".<wbr>");
}
function adressenMarkieren(html) {
  return nurAusserhalbVonLinks(html, (teil) =>
    teil.replace(ADRESSE_REGEX, (treffer) => `<span class="chronik-adresse">${adressenUmbruchstellen(treffer)}</span>`)
  );
}

// Der Linktext "Nachweis" (Quellenverzeichnis, über 30-mal) soll nie allein
// in einer Zeile stehen: mit geschütztem Leerzeichen an das vorige Wort
// binden (W9, Befund web-chronik 23).
function nachweisBinden(html) {
  return html.replace(/\s+(<a\b[^>]*>Nachweis<\/a>)/g, "&nbsp;$1");
}

function absatzHtml(absatz, rels, quellenZiel) {
  // Hyperlinks zuerst: <w:hyperlink r:id> umschließt eigene Läufe
  let inhalt = "";
  const teile = absatz.split(/(<w:hyperlink[\s\S]*?<\/w:hyperlink>)/);
  for (const teil of teile) {
    if (teil.startsWith("<w:hyperlink")) {
      const id = teil.match(/r:id="(rId\d+)"/)?.[1];
      const ziel = id ? rels.get(id) : null;
      const roh = [...teil.matchAll(/<w:r\b[\s\S]*?<\/w:r>/g)].map((m) => laufHtml(m[0])).join("");
      // Ein führendes/folgendes Leerzeichen im Hyperlink-Feld (z. B. Word-
      // Text " Nachweis") gehört nicht mit unter die Unterstreichung des
      // Links – sonst reicht die Unterstreichung optisch bis vor das Wort.
      const text = roh.trim();
      const vor = roh.slice(0, roh.indexOf(text));
      const nach = text ? roh.slice(roh.indexOf(text) + text.length) : roh;
      inhalt += ziel
        ? `${vor}<a href="${escapeHtml(ziel)}" target="_blank" rel="noopener">${text}</a>${nach}`
        : roh;
    } else {
      const stueck = [...teil.matchAll(/<w:r\b[\s\S]*?<\/w:r>/g)].map((m) => laufHtml(m[0])).join("");
      inhalt += urlAlsLink(stueck);
    }
  }
  return nachweisBinden(
    adressenMarkieren(jugendBindestrichBinden(initialenBinden(verweiseVerlinken(inhalt, quellenZiel))))
  );
}

// Roh im Fließtext getippte Adressen (kein Word-Hyperlinkfeld, sondern eine
// nur eingetippte URL) nicht als lange Rohadresse zeigen, sondern als Link
// mit dem Text "Quelle".
function urlAlsLink(html) {
  return html.replace(/https?:\/\/[^\s<]+/g, (url) => `<a href="${url}" target="_blank" rel="noopener">Quelle</a>`);
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

// Ein Wort komplett fett gesetzte Word-Zellen (Artefakt der Vorlage) auf
// normale Schriftstärke zurücksetzen (W9, Befund web-chronik 18): nur die
// erste Spalte bleibt halbfett.
function ohneFett(html) {
  return html.replace(/<\/?strong>/g, "");
}

function tabelleHtml(tabelle, rels, quellenZiel, { mitKarten = false } = {}) {
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
  const kopfText = kopf.map((z) => entferneTags(z).trim());
  const rumpf = zeilen.slice(1).map(zellenVon);
  const kopfHtml = kopf.map((z) => `<th scope="col">${z}</th>`).join("");
  const rumpfHtml = rumpf
    .map((zellen) => `<tr>${zellen.map((z, i) => `<td>${i === 0 ? z : ohneFett(z)}</td>`).join("")}</tr>`)
    .join("\n        ");
  const tabelleTeil = `<div class="tabelle-wrap">
      <table class="chronik-tabelle">
        <thead><tr>${kopfHtml}</tr></thead>
        <tbody>
        ${rumpfHtml}
        </tbody>
      </table>
    </div>`;
  if (!mitKarten) return tabelleTeil;

  // Handy (< 600 px): Zeilen als Karten statt einer abgeschnittenen Tabelle
  // (W9, Befunde web-chronik 1 und 2). Zwei Spalten (z. B. Aufgabe/Name):
  // erste Spalte klein als Label, zweite darunter. Drei oder mehr Spalten
  // (Saisontabellen): alle außer der letzten zu einer Kopfzeile zusammen-
  // gefasst ("2013/14 · Kreisoberliga Frankfurt · Platz 7"), die letzte
  // Spalte als Fließtext darunter (Einordnung/Erfolg). Die Karten liegen
  // zusätzlich im Markup, per CSS ist immer nur eine der beiden Ansichten
  // sichtbar (kein doppelt vorgelesener Inhalt für Screenreader).
  const spalten = kopfText.length;
  const karten = rumpf
    .map((zellen) => {
      if (spalten <= 1) {
        return `<li class="tabelle-karte">${zellen.map((z) => `<p class="tabelle-karte__zeile">${ohneFett(z)}</p>`).join("")}</li>`;
      }
      if (spalten === 2) {
        return `<li class="tabelle-karte">
          <p class="tabelle-karte__label">${ohneFett(zellen[0])}</p>
          <p class="tabelle-karte__haupt">${ohneFett(zellen[1])}</p>
        </li>`;
      }
      // Geschütztes Leerzeichen vor dem Trennpunkt, normales danach: so
      // bleibt der Punkt am Ende der vorigen Zeile stehen, statt einen
      // Zeilenumbruch mit dem Punkt als Aufzählungszeichen zu beginnen
      // (W9-Nachprüfung, Befund chronik-mannschaften-und-ehrenamt 390).
      const meta = zellen
        .slice(0, -1)
        .map((z, i) => (kopfText[i] === "Platz" ? `Platz&nbsp;${ohneFett(z)}` : ohneFett(z)))
        .join("&nbsp;· ");
      const beschreibung = ohneFett(zellen[zellen.length - 1]);
      return `<li class="tabelle-karte">
          <p class="tabelle-karte__kopf">${meta}</p>
          <p class="tabelle-karte__text">${beschreibung}</p>
        </li>`;
    })
    .join("\n        ");
  return `${tabelleTeil}
    <ul class="tabelle-karten">
        ${karten}
    </ul>`;
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

// "Mannschaften und Ehrenamt" und "Quellen und Anmerkungen" haben in der
// Word-Chronik keine Lead-Unterzeile (kein eigener Lead-Absatz angelegt),
// die Spezifikation (W9-C) verlangt für den Anhang aber ausdrücklich "je
// mit kurzer Unterzeile" – auf der Zeitleiste der Übersicht UND unter der
// H1 der beiden Kapitelseiten. Solange das Word-Dokument dafür keinen Lead
// liefert, fest hinterlegt (W9-Nachprüfung, Befund Chronik-Übersicht/
// -Kapitelseiten).
const ANHANG_UNTERZEILEN = {
  "Mannschaften und Ehrenamt": "Saisonübersichten und Vorstand",
  "Quellen und Anmerkungen": "Nachweise und Korrekturen",
};
function leadVon(kapitel) {
  return kapitel.lead ?? ANHANG_UNTERZEILEN[kapitel.titel] ?? null;
}

// ---------- Bilder ----------

// Textspaltenbreite der Website (assets/css/tokens.css, --inhalt: 720px) –
// bestimmt, ab welcher nativen Breite ein Querformat-Foto die volle Spalte
// füllen kann (W9, Befund web-chronik 7).
const TEXTSPALTE = 720;

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
    // Tatsächliche Maße der geschriebenen Datei merken (nicht nur die
    // angeforderte Breite): daraus bestimmt kapitelHtml später eine
    // einheitliche Anzeigebreite für Querformat-Fotos im selben Kapitel.
    const ausMasse = execFileSync("sips", ["-g", "pixelWidth", "-g", "pixelHeight", ziel], { encoding: "utf8" });
    const ausBreite = Number(ausMasse.match(/pixelWidth:\s*(\d+)/)?.[1] ?? zielBreite);
    const ausHoehe = Number(ausMasse.match(/pixelHeight:\s*(\d+)/)?.[1] ?? zielBreite);
    karte.set(datei, { name, breite: ausBreite, hoehe: ausHoehe });
  }
  return karte;
}

// Jedes Foto bekommt eine feste Zielbreite auf der figure selbst (nicht nur
// auf dem img): Nur so bestimmt allein diese Breite die Größe der figure,
// und die Bildunterschrift – deren Textlänge sonst bei einem width:
// fit-content ebenfalls in die Breitenberechnung der figure eingeht und sie
// breiter als das Foto ziehen kann – füllt exakt dieselbe Breite (W9,
// Befund web-chronik 7: "Bildunterschrift so breit wie das Bild").
// Querformat-Fotos (breiter als hoch) sollen websiteweit einheitlich wirken,
// nicht nur je Kapitel (W9-Nachprüfung: 400/467/609/672/690/720 px
// nebeneinander über die Kapitel hinweg sahen weiterhin zufällig aus, weil
// jedes Kapitel für sich auf sein schmalstes Foto herunterskaliert wurde).
// Deshalb eine einzige Regel für die ganze Website statt eines Vergleichs
// innerhalb des Kapitels: volle Textspaltenbreite (720px), wenn das Foto
// dafür höchstens rund 10% hochskaliert werden müsste; deutlich kleinere
// Vorlagen (z. B. D1-Fotos, Hochformate) bleiben als erklärte Ausnahme in
// ihrer eigenen nativen Breite, statt auf das schmalste Foto im Kapitel
// heruntergerechnet zu werden.
const MAX_HOCHSKALIEREN = 1.1;
function bildbreitenVon(kapitel, bildDaten) {
  const alle = kapitel.bloecke
    .filter((b) => b.art === "bild")
    .map((b) => bildDaten.get(b.datei))
    .filter(Boolean);
  const ergebnis = new Map();
  for (const d of alle) {
    const istQuer = d.breite > d.hoehe;
    const breite =
      istQuer && d.breite * MAX_HOCHSKALIEREN >= TEXTSPALTE ? TEXTSPALTE : Math.min(d.breite, TEXTSPALTE);
    ergebnis.set(d.name, breite);
  }
  return ergebnis;
}

// ---------- HTML: gemeinsame Bausteine ----------
// Zurück-Link oben wie auf allen Unterseiten der Website (.ruecklink aus
// assets/css/komponenten.css, W7 23.09.2026); keine Brotkrume, kein
// Rücklink unten – unten bleibt nur das Blättern zwischen den Kapiteln.

// Manche Word-Absätze enthalten mehrere Fußnoten in einem Fließtext
// ("* Satz eins. ** Satz zwei."), weil im Original kein eigener Absatz
// dafür angelegt wurde. Jede Fußnote bekommt eine eigene Zeile, das
// Sternchen wird mit &nbsp; an das erste Wort gebunden (W9, Befund
// web-chronik 17).
function fussnotenAufteilen(html) {
  const treffer = [...html.matchAll(/(?<=^|\s)\*+(?=\s)/g)];
  if (treffer.length < 2) return [html];
  const grenzen = treffer.map((m) => m.index);
  grenzen.push(html.length);
  const teile = [];
  for (let i = 0; i < grenzen.length - 1; i++) {
    const stueck = html.slice(grenzen[i], grenzen[i + 1]).trim();
    if (stueck) teile.push(stueck.replace(/^(\*+)\s+/, "$1&nbsp;"));
  }
  return teile;
}

// Tabellen müssen in Dokumentreihenfolge bleiben – dafür ein zweiter Durchlauf,
// der Absätze und Tabellen gemeinsam behandelt.
function kapitelHtml(kapitel, optionen) {
  const { rels, bildKarte, bildBasis, quellenZiel, bildbreiten } = optionen;
  const teile = [];
  let offen = false;
  const schliesse = () => { if (offen) { teile.push(`  </div>\n</section>`); offen = false; } };
  const oeffne = () => { if (!offen) { teile.push(`<section class="abschnitt">\n  <div class="container fluss">`); offen = true; } };

  for (const block of kapitel.bloecke) {
    if (block.art === "tabelle") {
      oeffne();
      teile.push("    " + tabelleHtml(block.xml, rels, quellenZiel, { mitKarten: true }));
      continue;
    }
    if (block.art === "bild") {
      const daten = bildKarte.get(block.datei);
      if (!daten) continue;
      // Bild bleibt im Satzspiegel: nicht aus dem offenen .container.fluss
      // herauslösen (das erzeugte randlose Vollbreite-Bilder außerhalb jedes
      // Containers), sondern wie Absätze/Tabellen im Container öffnen.
      oeffne();
      // Feste Zielbreite auf der figure selbst (siehe bildbreitenVon), damit
      // Foto UND Bildunterschrift exakt dieselbe Breite bekommen; min(100%, …)
      // lässt die figure auf dem Handy trotzdem auf die verfügbare Breite
      // schrumpfen.
      const breite = bildbreiten.get(daten.name);
      const stil = breite ? ` style="max-width:min(100%,${breite}px)"` : "";
      teile.push(`    <figure class="chronik-bild"${stil}>
      <img src="${bildBasis}${daten.name}" alt="Historische Aufnahme aus der Vereinschronik" loading="lazy" decoding="async">
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
    if (block.art === "h2") teile.push(`    <h2>${html}</h2>`);
    else if (block.art === "zitat") teile.push(`    <blockquote class="chronik-zitat">${html}</blockquote>`);
    else if (block.art === "source") {
      for (const zeile of fussnotenAufteilen(html)) {
        const zeilenNummer = (zeile.match(/^\[(\d+[0-9a-z]?)\]/) ?? [])[1];
        teile.push(`    <p class="chronik-quelle"${zeilenNummer ? ` id="quelle-${zeilenNummer}"` : ""}>${zeile}</p>`);
      }
    } else teile.push(`    <p class="inhalt">${html}</p>`);
  }
  schliesse();
  return teile.join("\n");
}

// ---------- Website ----------

const CHRONIK_CSS = `<style>
/* Bild bleibt im Satzspiegel: höchstens so breit wie der Fließtext
   (--inhalt, sonst 720px). Die tatsächliche Breite kommt als fester
   max-width-Wert von bildbreitenVon (inline auf der figure, nie über die
   eigene native Breite hinaus hochskaliert) – so bestimmt allein diese
   Zahl die Größe der figure, und img (width:100%) wie figcaption (Block,
   volle Breite) füllen exakt dieselbe Breite. Ein bloßes width:fit-content
   auf der figure hätte stattdessen die – oft längere – Bildunterschrift
   mit in die Breitenberechnung einbezogen (W9, Befund web-chronik 7:
   "Bildunterschrift so breit wie das Bild"). Außenabstand oben UND unten
   mindestens im Absatzabstand (32px, wie die übrigen großzügigen
   Ausnahmen vom 16px-Fluss-Rhythmus in komponenten.css) – kein
   margin-top:0, das ließ Fotos bislang am vorangehenden Text kleben (W9,
   Befund web-chronik 6). */
.chronik-bild { margin: var(--sp-6, 32px) 0; width: 100%; max-width: var(--inhalt, 720px); }
.chronik-bild img { width: 100%; height: auto; border-radius: var(--radius, 12px); background: var(--blau-50, #eef0fb); display: block; }
.chronik-bild__text { font-size: 0.86rem; line-height: 1.5; color: var(--ink-2, #55607a); margin-top: var(--sp-2); }
.chronik-zitat { margin: 0 0 var(--sp-3); padding-left: var(--sp-3); border-left: 3px solid var(--blau, #191793); font-style: italic; color: var(--ink-2, #55607a); max-width: var(--inhalt, 720px); }
/* Kleindruck (Vorwort-Anmerkung, Quellenangaben): eigener, sichtbarer
   Abstand zum vorigen Absatz – kein margin-top:0 setzen, sonst überschreibt
   das den Fluss-Rhythmus (.fluss > * + *) der Seite und der Absatz klebt am
   vorigen Text. */
.chronik-quelle { font-size: 0.86rem; line-height: 1.55; color: var(--ink-2, #55607a); margin-bottom: var(--sp-2); max-width: var(--inhalt, 720px); }
.quellenverweis { text-decoration: none; font-variant-numeric: tabular-nums; white-space: nowrap; }
/* Roh getippte Adressen/Dateinamen: kleiner und mit overflow-wrap:anywhere
   statt am eigenen Bindestrich umzubrechen (W9, Befund web-chronik 22). */
.chronik-adresse { font-size: 0.9em; overflow-wrap: anywhere; }
/* Oberer Außenabstand wie der übrige Absatzrhythmus der Seite (24px), damit
   Tabelle bzw. Kartenliste nicht ohne Abstand am Einleitungsabsatz kleben
   (W9-Nachprüfung, Befund chronik-mannschaften-und-ehrenamt). */
.tabelle-wrap { overflow-x: auto; margin: var(--sp-5, 24px) 0 var(--sp-4); }
.chronik-tabelle { width: 100%; border-collapse: collapse; font-size: 0.94rem; min-width: 420px; }
.chronik-tabelle th { background: var(--blau, #191793); color: #fff; text-align: left; padding: 10px 12px; font-weight: 600; }
.chronik-tabelle td { padding: 9px 12px; border-bottom: 1px solid var(--linie, #e3e6f0); vertical-align: top; }
.chronik-tabelle tbody tr:nth-child(odd) { background: var(--blau-50, #f4f6fd); }
/* Handy (< 600px): Tabelle durch gestapelte Karten ersetzen statt
   abzuschneiden (W9, Befunde web-chronik 1 und 2). Beide Ansichten liegen
   im Markup, aber nie gleichzeitig sichtbar. */
/* Oberer Außenabstand wie .tabelle-wrap, dazu eine Linie am Anfang der
   Liste (wie zwischen den Karten), damit die erste Karte nicht wie eine
   Fortsetzung des Einleitungsabsatzes wirkt (W9-Nachprüfung). */
.tabelle-karten { display: none; list-style: none; margin: var(--sp-5, 24px) 0 var(--sp-4); padding: 0; border-top: 1px solid var(--linie, #e3e6f0); }
.tabelle-karte { padding: var(--sp-3) 0; border-bottom: 1px solid var(--linie, #e3e6f0); }
.tabelle-karte__label { font-size: 0.82rem; color: var(--ink-2, #55607a); margin: 0 0 2px; }
.tabelle-karte__haupt { font-weight: 600; margin: 0; }
.tabelle-karte__kopf { font-weight: 600; margin: 0 0 2px; }
.tabelle-karte__text { color: var(--ink-2, #55607a); margin: 0; }
.tabelle-karte__zeile { margin: 0; }
@media (max-width: 599px) {
  .tabelle-wrap { display: none; }
  .tabelle-karten { display: block; }
}
/* Auf die Textspaltenbreite begrenzt: sonst läuft die Trennlinie des
   Anhangs (.zeitleiste--anhang) am Desktop über die volle, deutlich
   breitere Containerbreite, während die Zeitleiste selbst schmal wirkt
   (W9-Nachprüfung, Befund Chronik-Übersicht). */
.zeitleiste { list-style: none; margin: 0; padding: 0; max-width: var(--inhalt, 720px); }
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
/* "Mannschaften und Ehrenamt" / "Quellen und Anmerkungen" sind keine
   Zeiträume: abgesetzt als "Anhang", ohne Punkt auf der Achse (W9, Befund
   web-chronik 14). */
/* Mindestens 32px Abstand nach oben – mehr als zwischen den Epochen –
   damit das Label nicht wie ein Teil der letzten Epoche wirkt
   (W9-Nachprüfung, Befund Chronik-Übersicht). */
.zeitleiste__anhang-label { margin: var(--sp-6, 32px) 0 var(--sp-2); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.03em; color: var(--ink-2, #55607a); }
.abschnitt--blau .zeitleiste__anhang-label { color: rgba(255,255,255,0.7); }
.zeitleiste--anhang { padding-top: var(--sp-2); border-top: 1px solid var(--linie, #e3e6f0); }
.abschnitt--blau .zeitleiste--anhang { border-top-color: rgba(255,255,255,0.28); }
.zeitleiste--anhang .zeitleiste__punkt { border-left: none; padding-left: 0; }
.zeitleiste--anhang .zeitleiste__punkt::before { content: none; }
/* Blätter-Leiste: überall derselbe dreiteilige Baustein (Zurück links,
   "Alle Kapitel" exakt mittig, Weiter rechts). Ein Grid statt
   justify-content:space-between hält die Mitte fest, unabhängig von der
   Länge der Kapiteltitel links/rechts (W9, Befunde web-chronik 3, 4, 12).
   Auf die Textspaltenbreite begrenzt, damit die Leiste nicht über die volle
   Containerbreite läuft. Bündig mit der Textspalte (margin-left 0, nicht
   auto/zentriert) – sonst steht die Leiste ab 768px in der Seite zentriert
   statt an der Textkante (W9-Nachprüfung, neu entdeckt). */
.kapitelnav { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: var(--sp-2) var(--sp-3); max-width: var(--inhalt, 720px); margin: 0; }
.kapitelnav a { text-decoration: none; }
.kapitelnav__weiter { text-align: right; }
.kapitelnav__alle { text-align: center; white-space: nowrap; }
/* Handy: Zurück/Weiter als zwei gleich breite Felder nebeneinander, "Alle
   Kapitel" als eigene Zeile darunter (W9, Befund web-chronik 5). */
@media (max-width: 599px) {
  .kapitelnav { grid-template-columns: 1fr 1fr; }
  .kapitelnav__zurueck, .kapitelnav__platz--zurueck { grid-column: 1; grid-row: 1; text-align: left; }
  .kapitelnav__weiter, .kapitelnav__platz--weiter { grid-column: 2; grid-row: 1; text-align: right; }
  .kapitelnav__alle { grid-column: 1 / -1; grid-row: 2; }
}
/* Überschriften nie automatisch trennen, auf dem Handy ausgewogen umbrechen
   statt zufällig (W9, Befund web-chronik 9). */
.seitenkopf h1, .fluss h2 { hyphens: manual; text-wrap: balance; }
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
      // Wie auf der Website: gestapelte Karten für die schmale App statt
      // einer über den Kartenrand hinaus scrollenden Tabelle (W9-Nachprüfung,
      // App-Gegenstück zu web-chronik 1/2).
      teile.push(
        `      <div class="karte tabelle-wrapper">\n        ${tabelleHtml(block.xml, rels, "", { mitKarten: true })}\n      </div>`
      );
      continue;
    }
    if (block.art === "bild") {
      const daten = bildKarte.get(block.datei);
      if (!daten) continue;
      schliesse();
      teile.push(`      <figure class="chronik-bild">
        <img src="${bildBasis}${daten.name}" alt="Historische Aufnahme aus der Vereinschronik" loading="lazy" decoding="async">
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
    else if (block.art === "source") {
      // Wie auf der Website: jede Fußnote als eigene Zeile (W9-Nachprüfung,
      // web-chronik 17 war bislang nur auf den Website-Kapitelseiten
      // umgesetzt, nicht in der App).
      for (const zeile of fussnotenAufteilen(html)) teile.push(`        <p class="chronik-quelle">${zeile}</p>`);
    } else teile.push(`        <p>${html}</p>`);
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
  // Blättern am Kapitelende wie auf der Website (‹ vorheriges · nächstes ›),
  // damit niemand zum Weiterlesen bis zur Kapitelwahl hochscrollen muss.
  // Beschriftung mit dem vollen Titel ("1904 bis 1918"), nicht der kurzen
  // Gedankenstrich-Form – dieselbe Schreibweise wie die Kapitelüberschrift
  // und die Blätter-Leiste der Website (W9-Nachprüfung, Befund App: die
  // kompakten Filter-Chips oben dürfen die Kurzform (k.kurz) behalten).
  const blaettern = (i) => {
    const vorher = kapitel[i - 1];
    const nachher = kapitel[i + 1];
    const knopf = (k, text) =>
      `<button class="tag filter-knopf kapitel-blaettern__knopf" type="button" data-kapitel="${escapeHtml(k.slug)}">${escapeHtml(text)}</button>`;
    return `      <div class="kapitel-blaettern">
        ${vorher ? knopf(vorher, "‹ " + vorher.titel) : "<span></span>"}
        ${nachher ? knopf(nachher, nachher.titel + " ›") : "<span></span>"}
      </div>`;
  };
  const abschnitte = kapitel
    .map(
      (k, i) => `  <div class="kapitel" id="kapitel-${escapeHtml(k.slug)}"${i === 0 ? "" : " hidden"}>
      <h2 class="abschnittstitel kapitel-titel">${escapeHtml(k.titel)}</h2>
${k.lead ? `      <p class="kapitel-lead">${escapeHtml(k.lead)}</p>\n` : ""}${appKapitelHtml(k, { rels, bildKarte, bildBasis })}
${blaettern(i)}
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

/* Abstand oben wie unten (16px) – vorher stieß das Foto ohne Zwischenraum
   an die vorangehende Karte (W9-Nachprüfung, App-Gegenstück zu
   web-chronik 6). */
.chronik-bild { margin: var(--sp-4) 0; }
.chronik-bild img { width: 100%; height: auto; border-radius: var(--r-md); background: var(--blau-50); display: block; }
.chronik-bild__text { font-size: 12px; line-height: 1.5; color: var(--ink-2); margin-top: var(--sp-2); }
.chronik-zitat { margin: 0 0 var(--sp-3); padding-left: var(--sp-3); border-left: 3px solid var(--blau-700); font-style: italic; color: var(--ink-2); }
.chronik-quelle { font-size: 12px; line-height: 1.55; color: var(--ink-2); margin: 0 0 var(--sp-2); }
/* Roh getippte Adressen/Dateinamen: kleiner und mit overflow-wrap:anywhere,
   wie auf der Website (W9-Nachprüfung, neu entdeckt: ohne diese Regel
   liefen die neuen .chronik-adresse-Spannen über den Kartenrand hinaus,
   weil sie hier keinen Umbruch bekamen). */
.chronik-adresse { font-size: .9em; overflow-wrap: anywhere; }
.chronik-tabelle { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 380px; }
.chronik-tabelle th { background: var(--blau-700); color: var(--weiss); text-align: left; padding: 8px 10px; font-weight: 600; }
.chronik-tabelle td { padding: 7px 10px; border-bottom: 1px solid var(--line); vertical-align: top; }
.chronik-tabelle tbody tr:nth-child(odd) { background: var(--blau-50); }
/* Wie auf der Website: Tabelle auf der schmalen App durch gestapelte Karten
   ersetzen statt sie über den Kartenrand hinauslaufen zu lassen
   (W9-Nachprüfung, App-Gegenstück zu web-chronik 1/2). */
.tabelle-wrapper .tabelle-wrap { overflow-x: auto; margin: 0; }
.tabelle-karten { display: none; list-style: none; margin: 0; padding: 0; }
.tabelle-karte { padding: var(--sp-3) 0; border-bottom: 1px solid var(--line); }
.tabelle-karte:first-child { padding-top: 0; }
.tabelle-karte__label { font-size: 12px; color: var(--ink-2); margin: 0 0 2px; }
.tabelle-karte__haupt { font-weight: 600; margin: 0; }
.tabelle-karte__kopf { font-weight: 600; margin: 0 0 2px; }
.tabelle-karte__text { color: var(--ink-2); margin: 0; }
.tabelle-karte__zeile { margin: 0; }
@media (max-width: 599px) {
  .tabelle-wrapper .tabelle-wrap { display: none; }
  .tabelle-karten { display: block; }
}
.chronik-pdf { margin-top: var(--sp-6); }
/* Gleichmäßige Innenabstände: erster und letzter Absatz ohne Außenrand */
.kapitel .karte > :first-child { margin-top: 0; }
.kapitel .karte > :last-child { margin-bottom: 0; }
.kapitel .karte + .karte { margin-top: var(--sp-3); }
.kapitel-blaettern { display: flex; justify-content: space-between; gap: var(--sp-3); margin-top: var(--sp-5); }
.kapitel-blaettern__knopf { min-height: 44px; font-family: inherit; cursor: pointer; }
</style>
</head>
<body>
<main class="inhalt">

<h1 class="visually-hidden">Vereinschronik</h1>

<p class="seitenkopf-lead">1904 bis 2026 – die Geschichte der Speuzer. Kapitel wählen und lesen.</p>

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
    });
    if (scrollen) {
      var ziel = document.getElementById("kapitel-" + slug);
      var y = ziel ? ziel.getBoundingClientRect().top + window.pageYOffset - 12 : 0;
      window.scrollTo(0, Math.max(0, y));
    }
    return true;
  }

  var alleWahl = knoepfe.concat([].slice.call(document.querySelectorAll(".kapitel-blaettern__knopf")));
  alleWahl.forEach(function (b) {
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
  // Blätter-Leiste: überall dieselbe Schreibweise wie in Übersicht und
  // Kapitelüberschrift ("1919 bis 1933"), nicht die kurze
  // Gedankenstrich-Form (W9, Befund web-chronik 13).
  const navTitel = (k) => k.titel;
  // Immer derselbe dreiteilige Baustein (Zurück / Alle Kapitel / Weiter):
  // fehlt eine Seite (erstes bzw. letztes Kapitel), bleibt die Position als
  // unsichtbarer Platzhalter leer, statt auf einen doppelten oder anderen
  // Baustein auszuweichen (W9, Befunde web-chronik 3 und 4).
  const kapitelnavHtml = (vorher, nachher) => {
    const links = vorher
      ? `<a class="kapitelnav__zurueck" href="chronik-${vorher.slug}.html">‹ ${escapeHtml(navTitel(vorher))}</a>`
      : `<span class="kapitelnav__platz kapitelnav__platz--zurueck" aria-hidden="true"></span>`;
    const rechts = nachher
      ? `<a class="kapitelnav__weiter" href="chronik-${nachher.slug}.html">${escapeHtml(navTitel(nachher))} ›</a>`
      : `<span class="kapitelnav__platz kapitelnav__platz--weiter" aria-hidden="true"></span>`;
    return `<section class="abschnitt">
  <div class="container">
    <p class="kapitelnav">
      ${links}
      <a class="kapitelnav__alle" href="chronik.html">Alle Kapitel</a>
      ${rechts}
    </p>
  </div>
</section>`;
  };
  const dateien = [];
  kapitel.forEach((k, i) => {
    const vorher = kapitel[i - 1];
    const nachher = kapitel[i + 1];
    const inhalt = [
      seitenkopf(
        `<a class="ruecklink" href="chronik.html">‹ Vereinschronik</a>`,
        k.titel,
        leadVon(k)
      ),
      kapitelHtml(k, {
        rels,
        bildKarte,
        bildBasis: bildBasisWeb,
        quellenZiel: quellenDatei,
        bildbreiten: bildbreitenVon(k, bildKarte),
      }),
      kapitelnavHtml(vorher, nachher),
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
  // "›" macht jeden Eintrag als Link erkennbar (CD-Glyphe statt "→", siehe
  // auch die Blätter-Leiste), statt sich allein auf :hover zu verlassen.
  // "Mannschaften und Ehrenamt" und "Quellen und Anmerkungen" sind keine
  // Zeiträume: eigene Liste unter der Zeitachse, abgesetzt als "Anhang"
  // (W9, Befund web-chronik 14).
  const epochenKapitel = kapitel.filter((k) => k.epoche);
  const anhangKapitel = kapitel.filter((k) => !k.epoche);
  // Dieselbe Vorlage für Epochen UND Anhang: beide Listen bekommen je eine
  // Unterzeile (leadVon liefert für den Anhang den festen Ersatztext, siehe
  // ANHANG_UNTERZEILEN), zuvor fehlte sie beim Anhang (W9-Nachprüfung,
  // Befund Chronik-Übersicht).
  const zeitleisteEintrag = (k) => `      <li class="zeitleiste__punkt">
        <a class="zeitleiste__jahre" href="chronik-${k.slug}.html">${escapeHtml(k.titel)} ›</a>
        <span class="zeitleiste__text">${escapeHtml(leadVon(k) ?? "")}</span>
      </li>`;
  const zeitleiste = epochenKapitel.map(zeitleisteEintrag).join("\n");
  const anhangListe = anhangKapitel.map(zeitleisteEintrag).join("\n");
  const vorwortHtml = vorwort
    ? kapitelHtml(vorwort, {
        rels,
        bildKarte,
        bildBasis: bildBasisWeb,
        quellenZiel: quellenDatei,
        bildbreiten: bildbreitenVon(vorwort, bildKarte),
      })
    : "";
  const uebersicht = [
    seitenkopf(
      `<a class="ruecklink" href="verein.html">‹ Verein</a>`,
      "Vereinschronik",
      "1904 bis 2026 – die Geschichte der Speuzer, Kapitel für Kapitel."
    ),
    vorwortHtml,
    // abschnitt--kompakt (halber Abschnittsrand, sonst für lange Listen
    // gedacht, siehe komponenten.css): die Zeitleiste ist selbst schon eine
    // lange Liste, der volle --sektion-Rand oben/unten erzeugte unnötigen
    // Leerraum im blauen Band.
    `<section class="abschnitt abschnitt--blau abschnitt--kompakt">
  <div class="container">
    <h2>Die Kapitel</h2>
    <ul class="zeitleiste">
${zeitleiste}
    </ul>
    <p class="zeitleiste__anhang-label">Anhang</p>
    <ul class="zeitleiste zeitleiste--anhang">
${anhangListe}
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
  for (const { name } of bildKarte.values()) dateien.push(path.join("bilder", name));

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
