#!/usr/bin/env node
// Speuzer Website Prototyp – appack-Upload-Paket (W1)
// Baut aus docs/ws/*.html und docs/assets/css/site.css das Upload-Paket für
// den appack-Workspace-Ordner "web" (dist/appack-paket/web/). Läuft NACH
// `npm run build` (liest ausschließlich aus docs/, schreibt ausschließlich
// nach dist/). Node 24, ohne neue Abhängigkeiten.
//
// Hintergrund (siehe assets/app/LIESMICH.md "Woher die Schriften kommen"):
// im appack-Workspace liegen die 37 Workspace-Seiten künftig als Dateien in
// einem Ordner "web" (ausgeliefert unter
// https://cdn.appack.de/sportfreunde04/workspace/web/<datei>), site.css im
// selben Ordner. Alle anderen Assets (Schriften, Bilder, Logos, Downloads)
// bleiben auf GitHub Pages
// (https://justolgay.github.io/speuzer-website-prototyp/assets/…, CORS *).
// Dieses Skript schreibt genau diese beiden Adressklassen um:
//   - "../assets/css/site.css" -> "site.css" (gleicher Ordner wie die Seite)
//   - alles andere "../assets/…" (in href/src/poster/content/data-*/srcset)
//     -> absolute GitHub-Pages-Adresse
//   - in site.css: url("../fonts/…") -> absolute GitHub-Pages-Adresse
// Alles andere (relative Seitenlinks wie "mannschaften-d3.html", mailto:,
// "#…", externe Links) bleibt unangetastet.

import {
  readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, rmSync, existsSync, cpSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { isDeepStrictEqual } from "node:util";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ANMELDUNG_LIVE, ANMELDUNG_SPRACHEN_LIVE } from "../src/vorlagen/hilfen.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DOCS = path.join(ROOT, "docs");
const WS_DIR = path.join(DOCS, "ws");
const SITE_CSS_QUELLE = path.join(DOCS, "assets", "css", "site.css");
const PAKET_DIR = path.join(ROOT, "dist", "appack-paket");
const WEB_DIR = path.join(PAKET_DIR, "web");
const MANIFEST_PFAD = path.join(PAKET_DIR, "manifest.json");
const LIESMICH_PFAD = path.join(PAKET_DIR, "LIESMICH.md");

const GH_PAGES_ASSETS = "https://justolgay.github.io/speuzer-website-prototyp/assets/";
const ZIEL_WORKSPACE_ORDNER = "https://cdn.appack.de/sportfreunde04/workspace/web/";

// W3, Abschnitt 3/7 (Prüfer-Befund, Schwere "blocker"): styleguide.html ist
// eine interne Seite (Übernahmepaket-Anhang, "Interner Anhang für das
// Übernahmepaket", Momentaufnahme-Datum, Beispiel-Kontaktdaten) und darf
// nicht öffentlich im Live-Ordner landen – aus dem Paket ausgeschlossen.
// docs/ws/ enthält jetzt 38 Workspace-Seiten (37 wie zuvor + neu
// verein-ueber-uns.html), das Paket entsprechend 37 (38 minus
// styleguide.html) statt 38.
const AUSGESCHLOSSENE_DATEIEN = new Set(["styleguide.html"]);
// 28.09.2026: 39 (+ formular-gesendet.html, Bestätigung nach dem Absenden
// der Mitgliedsbescheinigung), das Paket entsprechend 38. Am selben Tag 40
// (+ termine.html, Menüpunkt „Termine“), das Paket entsprechend 39, dann 41
// (+ aufnahmeantrag.html, Aufnahmeantrag online), das Paket entsprechend 40.
// Mit ANMELDUNG_LIVE (Livegang des Anmelde-Assistenten, M6) kommt anmeldung.html dazu: 42 und 41.
const ERWARTETE_WS_DATEIEN = 41 + (ANMELDUNG_LIVE ? 1 : 0);

// Skripte im Workspace-Ordner (28.09.2026, Aufnahmeantrag online): Anders
// als Schriften und Bilder (GitHub Pages) liegen die Skripte der Seite
// aufnahmeantrag.html selbst im Ordner web/ – eigener Code und pdf-lib/
// fontkit, keine Laufzeit-Abhängigkeit von einem fremden CDN. Quelle ist
// docs/assets/js/antrag/*.js (aus assets/js/antrag/, siehe LIZENZ.txt dort);
// Verweise "../assets/js/antrag/<datei>.js" in src/data-* werden auf
// "<datei>.js" umgeschrieben (gleicher Ordner wie die Seite), bevor das
// allgemeine Muster unten sie auf GitHub Pages umlenken würde.
const WEB_SKRIPTE_DIR = path.join(DOCS, "assets", "js", "antrag");
const WEB_SKRIPT_MUSTER = /(?<=[\s<])(src|data-[a-zA-Z-]+)="\.\.\/assets\/js\/antrag\/([a-z0-9][a-z0-9.-]*\.js)"/g;

// canonical/og:url: statt der GitHub-Pages-Prototyp-Adresse zeigt das Paket
// auf die künftige Live-Adresse im appack-Workspace (W3, Abschnitt 7,
// Prüfer-Befund "alle 37 Seiten – canonical/og:url"). og:image bleibt
// GitHub Pages (dieses Muster trifft nur auf "/ws/<datei>"-Adressen zu,
// og:image zeigt auf "/assets/og/…" und bleibt unverändert).
const CANONICAL_MUSTER = /href="https:\/\/justolgay\.github\.io\/speuzer-website-prototyp\/ws\/([a-z0-9-]+\.html)"/g;
const OG_URL_MUSTER = /(<meta property="og:url" content=")https:\/\/justolgay\.github\.io\/speuzer-website-prototyp\/ws\/([a-z0-9-]+\.html)(">)/g;

function schreibeCanonicalUndOgUrlUm(html, zaehler) {
  let ergebnis = html.replace(CANONICAL_MUSTER, (_treffer, datei) => {
    zaehler.canonical += 1;
    return `href="${ZIEL_WORKSPACE_ORDNER}${datei}"`;
  });
  ergebnis = ergebnis.replace(OG_URL_MUSTER, (_treffer, vor, datei, nach) => {
    zaehler.ogUrl += 1;
    return `${vor}${ZIEL_WORKSPACE_ORDNER}${datei}${nach}`;
  });
  return ergebnis;
}

// Attribute, in denen "../assets/…" durch die absolute GitHub-Pages-Adresse
// ersetzt wird (srcset wird gesondert behandelt, siehe unten). Das Muster
// verlangt ein Leerzeichen oder "<" direkt vor dem Attributnamen, damit z. B.
// "data-src" nicht versehentlich als "src" erkannt wird (Attributname würde
// sonst beim Zurückschreiben verstümmelt).
const ATTRIBUT_MUSTER = /(?<=[\s<])(href|src|poster|content|data-[a-zA-Z-]+)="(\.\.\/assets\/[^"]*)"/g;
const SRCSET_MUSTER = /(?<=[\s<])srcset="([^"]*)"/g;
const SITE_CSS_LINK_MUSTER = /href="\.\.\/assets\/css\/site\.css"/g;

function sha256(inhalt) {
  return createHash("sha256").update(inhalt).digest("hex");
}

// ---------- Zwei Ausgabemodi: Prototyp (GitHub Pages) und appack (Live), W2 ----------
// Die Seitenvorlagen markieren Inhalt, der nur in einem der beiden Modi
// erscheinen soll:
//   <div data-nur-appack hidden>…</div>   – nur Live-Website (Widgets, Generator)
//   <div data-nur-prototyp>…</div>        – nur Prototyp (eingefrorene Daten)
// Für das appack-Paket (dieses Skript) gilt: "hidden" bei data-nur-appack
// verschwindet (Inhalt wird sichtbar), data-nur-prototyp-Blöcke verschwinden
// vollständig (inklusive verschachtelter <div>, siehe tiefenbewusstes
// Entfernen unten). docs/ws/*.html selbst (der Prototyp) bleibt unangetastet
// – dort bleibt "hidden" stehen und der data-nur-prototyp-Block bleibt drin.

const NUR_APPACK_HIDDEN_MUSTER = /<div data-nur-appack hidden>/g;

// Entfernt jeden "<div data-nur-prototyp>…</div>"-Block vollständig,
// einschließlich beliebig tief verschachtelter <div>-Elemente darin (reines
// String-Matching mit Tiefenzähler statt eines HTML-Parsers, da die Vorlagen
// ausschließlich wohlgeformte <div>-Öffnungs-/Schluss-Tags enthalten).
function entferneNurPrototypBloecke(html) {
  const OEFFNER = "<div data-nur-prototyp>";
  const DIV_TAG_MUSTER = /<div\b[^>]*>|<\/div>/g;
  let ergebnis = "";
  let rest = html;
  let anzahl = 0;
  let start;

  while ((start = rest.indexOf(OEFFNER)) !== -1) {
    ergebnis += rest.slice(0, start);
    DIV_TAG_MUSTER.lastIndex = start + OEFFNER.length;
    let tiefe = 1;
    let treffer;
    let ende = -1;
    while ((treffer = DIV_TAG_MUSTER.exec(rest))) {
      tiefe += treffer[0].startsWith("</div") ? -1 : 1;
      if (tiefe === 0) {
        ende = treffer.index + treffer[0].length;
        break;
      }
    }
    if (ende === -1) {
      throw new Error(`data-nur-prototyp: kein passendes schließendes </div> gefunden (ab Position ${start})`);
    }
    anzahl += 1;
    rest = rest.slice(ende);
  }
  ergebnis += rest;
  return { html: ergebnis, anzahl };
}

// Schaltet eine Seite von "Prototyp" auf "appack" (Live) um: hidden weg bei
// data-nur-appack, data-nur-prototyp-Blöcke ganz weg. Zählt beide Typen in
// zaehler.nurAppackHidden / zaehler.nurPrototyp.
function wandleAusgabemodusUm(html, zaehler) {
  const nurAppackTreffer = html.match(NUR_APPACK_HIDDEN_MUSTER) ?? [];
  const ergebnisAppack = html.replace(NUR_APPACK_HIDDEN_MUSTER, "<div data-nur-appack>");
  const { html: ergebnis, anzahl: nurPrototypAnzahl } = entferneNurPrototypBloecke(ergebnisAppack);

  zaehler.nurAppackHidden += nurAppackTreffer.length;
  zaehler.nurPrototyp += nurPrototypAnzahl;

  return ergebnis;
}

// ---------- HTML-Seiten umschreiben ----------

function schreibeSeiteUm(html, dateiname, zaehler) {
  // 0) Ausgabemodus umschalten: data-nur-appack sichtbar machen,
  // data-nur-prototyp-Blöcke entfernen (W2, siehe oben).
  let ergebnis = wandleAusgabemodusUm(html, zaehler);

  // 0b) Skripte des Aufnahmeantrags: gleicher Ordner wie die Seite (siehe
  // WEB_SKRIPT_MUSTER oben).
  ergebnis = ergebnis.replace(WEB_SKRIPT_MUSTER, (_treffer, attribut, datei) => {
    zaehler.webSkripte.add(datei);
    zaehler.webSkriptVerweise += 1;
    return `${attribut}="${datei}"`;
  });

  // 0c) Anmelde-Assistent (nur anmeldung.html, nur mit ANMELDUNG_LIVE): Stylesheet und Einstiegsskript liegen im Ordner
  // der Seite (anmeldung.css, anmeldung-assistent.js; siehe baueAnmeldungDateien). Beide Verweise müssen genau einmal da sein.
  if (dateiname === ANM_SEITE) {
    let css = 0;
    let skript = 0;
    ergebnis = ergebnis.replace(ANM_CSS_MUSTER, () => {
      css += 1;
      return 'href="anmeldung.css"';
    });
    ergebnis = ergebnis.replace(ANM_SKRIPT_MUSTER, () => {
      skript += 1;
      return `src="${anmDateiname(ANM_EINSTIEG)}"`;
    });
    if (css !== 1 || skript !== 1) {
      throw new Error(`${dateiname}: erwartet je 1× Stylesheet und Skript des Assistenten, gefunden ${css}× und ${skript}×`);
    }
    zaehler.anmeldungVerweise += css + skript;
  }

  // 1) site.css: gleicher Ordner wie die Seite selbst, kein "../assets/" mehr.
  const cssTreffer = ergebnis.match(SITE_CSS_LINK_MUSTER) ?? [];
  if (cssTreffer.length !== 1) {
    throw new Error(
      `${dateiname}: erwartet genau 1× href="../assets/css/site.css", gefunden ${cssTreffer.length}×`
    );
  }
  ergebnis = ergebnis.replace(SITE_CSS_LINK_MUSTER, 'href="site.css"');
  zaehler.cssLink += 1;

  // 2) srcset zuerst (sonst würde das allgemeine Attribut-Muster unten den
  // Wert als Ganzes fälschlich als einzelne Adresse behandeln).
  ergebnis = ergebnis.replace(SRCSET_MUSTER, (_treffer, wert) => {
    const neu = wert
      .split(",")
      .map((teil) => {
        const t = teil.trim();
        if (!t.startsWith("../assets/")) return t;
        const [pfadTeil, ...deskriptor] = t.split(/\s+/);
        zaehler.srcset += 1;
        const neuerPfad = GH_PAGES_ASSETS + pfadTeil.slice("../assets/".length);
        return deskriptor.length ? `${neuerPfad} ${deskriptor.join(" ")}` : neuerPfad;
      })
      .join(", ");
    return `srcset="${neu}"`;
  });

  // 3) href/src/poster/content/data-* -> absolute GitHub-Pages-Adresse.
  ergebnis = ergebnis.replace(ATTRIBUT_MUSTER, (_treffer, attribut, wert) => {
    const rest = wert.slice("../assets/".length);
    const schluessel = attribut.startsWith("data-") ? "dataStern" : attribut;
    zaehler[schluessel] = (zaehler[schluessel] ?? 0) + 1;
    return `${attribut}="${GH_PAGES_ASSETS}${rest}"`;
  });

  // 4) canonical/og:url -> Live-Adresse im appack-Workspace (W3, siehe oben).
  ergebnis = schreibeCanonicalUndOgUrlUm(ergebnis, zaehler);

  return ergebnis;
}

// ---------- Prüfung im Skript selbst (Schritt 2 der Spezifikation) ----------

function pruefeAusgabe(dateiname, html, paketDateien) {
  if (html.includes("../assets/") || html.includes("../fonts/")) {
    throw new Error(`${dateiname}: enthält noch '../assets/' oder '../fonts/' nach dem Umschreiben`);
  }
  // W2: Selbstprüfung des Ausgabemodus – im Paket darf kein Marker des
  // Prototyp-Modus mehr vorkommen.
  if (html.includes("data-nur-prototyp")) {
    throw new Error(`${dateiname}: enthält noch 'data-nur-prototyp' nach dem Umschreiben`);
  }
  if (html.includes("data-nur-appack hidden")) {
    throw new Error(`${dateiname}: enthält noch 'data-nur-appack hidden' nach dem Umschreiben`);
  }
  const stylesheetTreffer = [...html.matchAll(/<link\s+rel="stylesheet"\s+href="site\.css">/g)];
  if (stylesheetTreffer.length !== 1) {
    throw new Error(
      `${dateiname}: erwartet genau 1× <link rel="stylesheet" href="site.css">, gefunden ${stylesheetTreffer.length}×`
    );
  }
  const seitenLinks = [...html.matchAll(/href="([a-z][a-z0-9-]*\.html)(?:[?#][^"]*)?"/g)].map((m) => m[1]);
  for (const ziel of seitenLinks) {
    if (!paketDateien.has(ziel)) {
      throw new Error(`${dateiname}: relativer Seitenlink 'href=\"${ziel}\"' zeigt auf keine Datei im Paket`);
    }
  }
  const skriptVerweise = [...html.matchAll(/(?<=[\s<])(?:src|data-[a-zA-Z-]+)="([a-z0-9][a-z0-9.-]*\.js)"/g)].map((m) => m[1]);
  for (const ziel of skriptVerweise) {
    if (!paketDateien.has(ziel)) {
      throw new Error(`${dateiname}: relativer Skriptverweis '${ziel}' zeigt auf keine Datei im Paket`);
    }
  }
}

// ---------- site.css umschreiben ----------

function schreibeCssUm(css, zaehler) {
  return css.replace(/url\("\.\.\/fonts\/([^"]*)"\)/g, (_treffer, dateiname) => {
    zaehler.cssUrl += 1;
    return `url("${GH_PAGES_ASSETS}fonts/${dateiname}")`;
  });
}

// ---------- Anmelde-Assistent im Paket (Livegang, M6) ----------
// Nur mit ANMELDUNG_LIVE (src/vorlagen/hilfen.mjs). Zur Seite docs/ws/anmeldung.html (wird wie alle Seiten umgeschrieben,
// siehe schreibeSeiteUm) kommen dann diese Dateien in den Ordner web/:
//   anmeldung.css                                  Stylesheet (assets/css/anmeldung.css, ohne Kommentare)
//   anmeldung-<modul>.js                           die ES-Module des Assistenten (assets/js/anmeldung/<modul>.js, ohne
//                                                  Kommentare, Importe auf die neuen Namen umgeschrieben)
//   anmeldung-texte-<sprache>-oberflaeche.js,
//   anmeldung-texte-<sprache>-regeln.js            Texte, nur die Sprachen der Live-Seite
//   anmeldung-schrift.js, anmeldung-vorlage-<name>.js   Schrift und HFV-Vordrucke als Module mit Base64-Text
// pdf-lib und fontkit liegen schon im Ordner (aufnahmeantrag-pdf-lib.js, aufnahmeantrag-fontkit.js) und werden mitbenutzt.
//
// Warum flach, nur mit .html/.css/.js und ohne Dateien mit Binärinhalt: Im Workspace des CMS ist bisher nur ein flacher
// Ordner web/ mit Textdateien der Typen HTML, CSS und JS bewährt (Namen mit genau einem Punkt, "…min.js" wird abgelehnt).
// Unterordner, .json, .ttf und .pdf im Workspace sind ungeprüft. Schrift und Vordrucke liegen deshalb als JavaScript-
// Module mit Base64-Text vor (Zeilen zu 100 Zeichen, "export default `…`") und werden erst beim Erstellen der PDF-Datei
// geladen (assets/js/anmeldung/pdf-lader.js, konfig.quellen).
//
// Ohne Kommentare (und ohne Beispiel-Profile) kommen die Module ins Paket, damit auf der Live-Seite nichts von Entwurf,
// Vorführung und Werkzeugen steht. Das Entfernen der Kommentare prüft dieses Skript mit node --check (ES-Modul), ebenso tools/appack-paket-pruefen.mjs,
// tools/anmeldung-test/e2e-paket.mjs im Browser.

const ANM_SEITE = "anmeldung.html";
const ANM_EINSTIEG = "assistent.js";
const ANM_QUELLE_JS = path.join(DOCS, "assets", "js", "anmeldung");
const ANM_QUELLE_CSS = path.join(DOCS, "assets", "css", "anmeldung.css");
const ANM_QUELLE_SCHRIFT = path.join(DOCS, "assets", "fonts", "liberation-sans-regular.ttf");
const ANM_QUELLE_SCHRIFT_LIZENZ = path.join(DOCS, "assets", "fonts", "LIZENZ-liberation-sans.txt");
const ANM_PDFLIB = "aufnahmeantrag-pdf-lib.js";
const ANM_FONTKIT = "aufnahmeantrag-fontkit.js";
const ANM_CSS_MUSTER = /href="\.\.\/assets\/css\/anmeldung\.css"/g;
const ANM_SKRIPT_MUSTER = /(?<=[\s<])src="\.\.\/assets\/js\/anmeldung\/assistent\.js"/g;
const ANM_KONFIG_MUSTER = /(<script type="application\/json" id="anmeldung-konfig">)([\s\S]*?)(<\/script>)/;

// Schlüssel der Textmodule, die nur die Begleitseite braucht: Titel und Beschreibung der Begleitseite, Entwurfs-Band,
// Werkzeugkasten für die Vorführung. Die Live-Fassung lässt sie weg. Die übrigen demo-Schlüssel (vereinTitel, quelle, …)
// bleiben, weil die ausgeblendeten Hinweiskästen "Für den Verein" sie lesen.
const ANM_NUR_BEGLEIT = [
  "seite.titel", "seite.beschreibung", "band",
  "demo.werkzeugTitel", "demo.vorfuehrung", "demo.vereinssichtTitel", "demo.vereinssichtText", "demo.vereinssichtAn",
  "demo.vereinssichtAus", "demo.beispieleTitel", "demo.beispieleText", "demo.konzeptLink", "demo.beispielGeladen",
];

// assistent.js liest aus beispiele.js nur BEISPIELE und beispielAntworten, die Live-Seite hat keine Knöpfe dafür.
const ANM_BEISPIELE_ERSATZ = `export const BEISPIELE = [];

export function beispielAntworten() {
  return {};
}
`;

// "regeln.js" -> "anmeldung-regeln.js", "texte/de-regeln.js" -> "anmeldung-texte-de-regeln.js"
function anmDateiname(rel) {
  return "anmeldung-" + rel.replace(/\//g, "-");
}

// Wörter vor einem "/", nach denen ein Regex-Literal beginnt (sonst ist es eine Division).
const ANM_REGEX_VOR_WORT = new Set(["return", "typeof", "instanceof", "in", "of", "new", "delete", "void", "throw", "case", "do", "else", "yield", "await"]);
const ANM_REGEX_NACH_ZEICHEN = "(,=:[!&|?{;+-*%<>~^";

// Entfernt Kommentare (// … und /* … */) aus JavaScript. Zeichenketten, Schablonenzeichenketten (auch mit ${ … }) und
// Regex-Literale bleiben unangetastet; ein Regex-Literal erkennt die Funktion am letzten Zeichen oder Wort davor. Ein
// Blockkommentar mit Zeilenumbruch wird zu einem Zeilenumbruch (das Einfügen von Semikolons bleibt wie vorher), sonst zu einem
// Leerzeichen. Aufgeräumt wird nur im Code: Leerzeichen am Zeilenende und mehr als eine Leerzeile hintereinander fallen weg;
// der Inhalt von Zeichenketten und Schablonen bleibt Zeichen für Zeichen, wie er ist. Ob das Ergebnis gültig ist, prüft
// node --check.
function anmEntferneJsKommentare(quelle) {
  if (quelle.includes("\u0000")) throw new Error("anmEntferneJsKommentare: Quelltext enthält ein NUL-Zeichen");
  const n = quelle.length;
  const aus = [];
  const schablonen = []; // je offenes ${ … }: Zahl der darin geöffneten {
  let modus = "code";
  let davor = ""; // letztes Zeichen oder Wort außerhalb von Kommentaren und Leerraum
  let i = 0;
  const regexErlaubt = () => davor === "" || (davor.length === 1 && ANM_REGEX_NACH_ZEICHEN.includes(davor)) || ANM_REGEX_VOR_WORT.has(davor);
  while (i < n) {
    const c = quelle[i];
    if (modus === "schablone") {
      if (c === "\\") {
        aus.push(quelle.slice(i, i + 2));
        i += 2;
      } else if (c === "`") {
        aus.push(c);
        i += 1;
        modus = "code";
        davor = "`";
      } else if (c === "$" && quelle[i + 1] === "{") {
        aus.push("${");
        i += 2;
        schablonen.push(0);
        modus = "code";
        davor = "{";
      } else {
        aus.push(c);
        i += 1;
      }
      continue;
    }
    if (c === "/") {
      const d = quelle[i + 1];
      if (d === "/") {
        while (i < n && quelle[i] !== "\n") i += 1;
        continue;
      }
      if (d === "*") {
        const ende = quelle.indexOf("*/", i + 2);
        const stueck = quelle.slice(i, ende < 0 ? n : ende + 2);
        i = ende < 0 ? n : ende + 2;
        aus.push(stueck.includes("\n") ? "\u0000" : " ");
        continue;
      }
      if (regexErlaubt()) {
        let j = i + 1;
        let klasse = false;
        while (j < n) {
          const e = quelle[j];
          if (e === "\\") {
            j += 2;
            continue;
          }
          if (e === "\n") break;
          if (klasse) {
            if (e === "]") klasse = false;
          } else if (e === "[") klasse = true;
          else if (e === "/") break;
          j += 1;
        }
        if (quelle[j] === "/") {
          j += 1;
          while (j < n && /[a-z]/i.test(quelle[j])) j += 1;
          aus.push(quelle.slice(i, j));
          i = j;
          davor = "/";
          continue;
        }
      }
      aus.push(c);
      i += 1;
      davor = "/";
      continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && quelle[j] !== c) j += quelle[j] === "\\" ? 2 : 1;
      aus.push(quelle.slice(i, j + 1));
      i = j + 1;
      davor = c;
      continue;
    }
    if (c === "`") {
      aus.push(c);
      i += 1;
      modus = "schablone";
      continue;
    }
    if (c === "{" && schablonen.length) schablonen[schablonen.length - 1] += 1;
    if (c === "}" && schablonen.length) {
      if (schablonen[schablonen.length - 1] === 0) {
        schablonen.pop();
        aus.push(c);
        i += 1;
        modus = "schablone";
        continue;
      }
      schablonen[schablonen.length - 1] -= 1;
    }
    if (/\s/.test(c)) {
      aus.push(c === "\n" ? "\u0000" : c); // Zeilenumbruch im Code: als Marke, siehe unten
      i += 1;
      continue;
    }
    if (/[\w$]/.test(c)) {
      let j = i + 1;
      while (j < n && /[\w$]/.test(quelle[j])) j += 1;
      davor = quelle.slice(i, j);
      aus.push(davor);
      i = j;
      continue;
    }
    aus.push(c);
    i += 1;
    davor = c;
  }
  // Marken (Zeilenumbrüche im Code): Leerraum davor weg, höchstens eine Leerzeile, keine Leerzeilen am Anfang.
  return aus
    .join("")
    .replace(/[ \t]+(?=\u0000)/g, "")
    .replace(/\u0000{3,}/g, "\u0000\u0000")
    .replace(/^\u0000+/, "")
    .replace(/\u0000/g, "\n");
}

function anmEntferneCssKommentare(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/[ \t]+$/gm, "").replace(/\n{3,}/g, "\n\n").replace(/^\n+/, "");
}

// Importe auf die flachen Namen umschreiben: "./regeln.js" -> "./anmeldung-regeln.js", "./texte/…" ->
// "./anmeldung-texte-…" (statisch, import() und Schablone mit ${…}). Verweise auf andere Ordner gibt es nicht.
function anmSchreibeModulPfadeUm(code) {
  let anzahl = 0;
  const neu = code.replace(/(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(["'`])\.\/([^"'`\n]+)\2/g, (_treffer, vor, anf, pfad) => {
    anzahl += 1;
    return `${vor}${anf}./${anmDateiname(pfad)}${anf}`;
  });
  return { code: neu, anzahl };
}

// Alle Importe ("./name.js") eines Moduls außer denen mit ${…}; der Quelltext darf keine Kommentare mehr enthalten.
function anmImporteVon(codeOhneKommentare) {
  return [...codeOhneKommentare.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(["'`])\.\/([^"'`\n$]+)\1/g)].map((m) => m[2]);
}

// Von assistent.js aus erreichbare Module (Quelle: docs/assets/js/anmeldung/), dazu die Texte der Live-Sprachen.
function anmSammleModule(sprachen) {
  const warteschlange = [ANM_EINSTIEG];
  for (const code of sprachen) warteschlange.push(`texte/${code}-oberflaeche.js`, `texte/${code}-regeln.js`);
  const reihenfolge = [];
  const gesehen = new Set();
  while (warteschlange.length) {
    const rel = warteschlange.shift();
    if (gesehen.has(rel)) continue;
    gesehen.add(rel);
    reihenfolge.push(rel);
    const pfad = path.join(ANM_QUELLE_JS, rel);
    if (!existsSync(pfad)) throw new Error(`Anmelde-Assistent: docs/assets/js/anmeldung/${rel} fehlt`);
    if (rel.startsWith("texte/") || rel === "beispiele.js") continue; // Blätter bzw. wird ersetzt
    for (const ziel of anmImporteVon(anmEntferneJsKommentare(readFileSync(pfad, "utf8")))) warteschlange.push(ziel);
  }
  return reihenfolge;
}

function anmLoescheSchluessel(objekt, pfad) {
  let knoten = objekt;
  for (const teil of pfad.slice(0, -1)) {
    if (!knoten || typeof knoten !== "object") return;
    knoten = knoten[teil];
  }
  if (knoten && typeof knoten === "object") delete knoten[pfad[pfad.length - 1]];
}

// Textmodul der Live-Fassung: Begleit-Schlüssel (ANM_NUR_BEGLEIT) weg, sonst unverändert. Die Module sind reine Daten
// ("export default {…}"); die Funktion prüft das (JSON-Rundlauf) und schreibt sie neu.
async function anmBaueTextModul(rel) {
  const modul = await import(pathToFileURL(path.join(ANM_QUELLE_JS, rel)).href);
  if (Object.keys(modul).join() !== "default") throw new Error(`${rel}: erwartet nur "export default"`);
  const text = JSON.parse(JSON.stringify(modul.default));
  if (!isDeepStrictEqual(text, modul.default)) throw new Error(`${rel}: enthält mehr als JSON-Daten (Funktionen o. Ä.)`);
  if (rel.endsWith("-oberflaeche.js")) for (const schluessel of ANM_NUR_BEGLEIT) anmLoescheSchluessel(text, schluessel.split("."));
  const json = JSON.stringify(text, null, 1).replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  return `export default ${json};\n`;
}

function anmBaueBase64Modul(bytes, kopf) {
  const zeilen = Buffer.from(bytes).toString("base64").match(/.{1,100}/g) ?? [];
  return `${kopf}export default \`\n${zeilen.join("\n")}\n\`;\n`;
}

// Kopf der Schrift: Urheberrechtsvermerk und Lizenztext (SIL Open Font License 1.1, Bedingung 2) aus
// assets/fonts/LIZENZ-liberation-sans.txt, ohne die Adresszeilen.
function anmSchriftKopf() {
  const text = readFileSync(ANM_QUELLE_SCHRIFT_LIZENZ, "utf8");
  const ab = text.indexOf("Digitized data copyright");
  if (ab < 0) throw new Error("LIZENZ-liberation-sans.txt: Urheberrechtsvermerk nicht gefunden");
  const lizenz = text
    .slice(ab)
    .replace(/This license is copied below, and is also available with a FAQ at:\s*\nhttp:\/\/scripts\.sil\.org\/OFL\s*\n/, "This license is copied below.\n")
    .trimEnd();
  if (lizenz.includes("*/") || /https?:\/\//.test(lizenz)) throw new Error("LIZENZ-liberation-sans.txt: unerwarteter Inhalt (Kommentarende oder Adresse)");
  const bytes = readFileSync(ANM_QUELLE_SCHRIFT);
  return `/*\n  Liberation Sans Regular 2.1.5 als Base64-Text (${bytes.length} Byte, SHA-256 ${sha256(bytes)}).\n\n${lizenz}\n*/\n`;
}

function anmLeseKonfig(html) {
  const treffer = html.match(ANM_KONFIG_MUSTER);
  if (!treffer) throw new Error(`${ANM_SEITE}: <script id="anmeldung-konfig"> fehlt`);
  return JSON.parse(treffer[2]);
}

// Schreibt die Konfiguration in die Seite zurück (wie jsonImSkript in src/begleit/anmeldung.mjs: "<" als <).
function anmSchreibeKonfig(html, konfig) {
  return html.replace(ANM_KONFIG_MUSTER, (_treffer, vor, _alt, nach) => vor + JSON.stringify(konfig).replace(/</g, "\\u003c") + nach);
}

// Erzeugt alle Dateien des Assistenten für den Ordner web/ (noch nicht geschrieben): { dateien: Map(Name -> Text|Buffer),
// quellen, sprachen, module }. `quellen` trägt der Aufruf in die Konfiguration der Seite ein.
async function baueAnmeldungDateien() {
  const seitenPfad = path.join(WS_DIR, ANM_SEITE);
  if (!existsSync(seitenPfad)) throw new Error(`${path.relative(ROOT, seitenPfad)} fehlt – zuerst "npm run build" mit ANMELDUNG_LIVE ausführen`);
  const konfig = anmLeseKonfig(readFileSync(seitenPfad, "utf8"));
  if (konfig.live !== true) throw new Error(`${ANM_SEITE}: Konfiguration ohne live = true`);
  const sprachen = konfig.sprachen;
  if (!Array.isArray(sprachen) || sprachen[0] !== "de" || !isDeepStrictEqual(sprachen, ANMELDUNG_SPRACHEN_LIVE)) {
    throw new Error(`${ANM_SEITE}: Sprachen der Konfiguration (${JSON.stringify(sprachen)}) weichen von ANMELDUNG_SPRACHEN_LIVE ab`);
  }

  const dateien = new Map();
  const modulListe = anmSammleModule(sprachen);
  for (const rel of modulListe) {
    const name = anmDateiname(rel);
    if (rel === "beispiele.js") {
      dateien.set(name, ANM_BEISPIELE_ERSATZ);
    } else if (rel.startsWith("texte/")) {
      dateien.set(name, await anmBaueTextModul(rel));
    } else {
      const { code } = anmSchreibeModulPfadeUm(anmEntferneJsKommentare(readFileSync(path.join(ANM_QUELLE_JS, rel), "utf8")));
      dateien.set(name, code);
    }
  }
  dateien.set("anmeldung.css", anmEntferneCssKommentare(readFileSync(ANM_QUELLE_CSS, "utf8")));

  // Schrift und Vordrucke als Module mit Base64-Text. Jeder Vordruck wird gegen Größe und SHA-256 aus der Konfiguration
  // geprüft (die Feldpositionen gelten nur für genau diese Dateien).
  dateien.set("anmeldung-schrift.js", anmBaueBase64Modul(readFileSync(ANM_QUELLE_SCHRIFT), anmSchriftKopf()));
  const vorlagenModule = {};
  for (const [schluessel, eintrag] of Object.entries(konfig.formulare?.formulare ?? {})) {
    if (!eintrag?.datei) throw new Error(`Vordruck "${schluessel}": kein Dateipfad in der Konfiguration`);
    const quelle = path.join(DOCS, eintrag.datei);
    if (!existsSync(quelle)) throw new Error(`Vordruck "${schluessel}": docs/${eintrag.datei} fehlt`);
    const bytes = readFileSync(quelle);
    if (eintrag.bytes && bytes.length !== eintrag.bytes) throw new Error(`Vordruck "${schluessel}": ${bytes.length} Byte statt ${eintrag.bytes}`);
    if (eintrag.sha256 && sha256(bytes) !== eintrag.sha256) throw new Error(`Vordruck "${schluessel}": SHA-256 weicht von der Konfiguration ab`);
    const name = `anmeldung-vorlage-${schluessel.replace(/_/g, "-")}.js`;
    dateien.set(name, anmBaueBase64Modul(bytes, `// Vordruck "${schluessel}" (${path.basename(eintrag.datei)}, ${bytes.length} Byte, SHA-256 ${sha256(bytes)}) als Base64-Text\n`));
    vorlagenModule[schluessel] = name;
  }
  if (!Object.keys(vorlagenModule).length) throw new Error("Anmelde-Assistent: keine Vordrucke in der Konfiguration");

  const quellen = { pdfLib: ANM_PDFLIB, fontkit: ANM_FONTKIT, schriftModul: "anmeldung-schrift.js", vorlagenModule };
  anmPruefeVerweise(dateien, sprachen);
  return { dateien, quellen, sprachen, module: modulListe };
}

// Jeder Import eines Moduls und jede Quelle in konfig.quellen muss auf eine Datei zeigen, die es gibt (im Paket oder, für
// pdf-lib und fontkit, schon im Ordner).
function anmPruefeVerweise(dateien, sprachen) {
  for (const [name, inhalt] of dateien) {
    if (!name.endsWith(".js") || typeof inhalt !== "string") continue;
    const ohne = anmEntferneJsKommentare(inhalt);
    for (const ziel of anmImporteVon(ohne)) {
      if (!dateien.has(ziel)) throw new Error(`${name}: Import "./${ziel}" zeigt auf keine Datei im Paket`);
    }
    if (/import\(`\.\/anmeldung-texte-\$\{/.test(ohne)) {
      for (const code of sprachen) {
        for (const art of ["oberflaeche", "regeln"]) {
          if (!dateien.has(`anmeldung-texte-${code}-${art}.js`)) throw new Error(`${name}: Textmodul fuer "${code}" (${art}) fehlt`);
        }
      }
    }
    if (/\.\/texte\//.test(ohne)) throw new Error(`${name}: enthält noch "./texte/" nach dem Umschreiben`);
  }
}

// Die Seite anmeldung.html: Konfiguration um die Quellen von pdf-lib, fontkit, Schrift und Vordrucken ergänzen.
function anmTraegeQuellenEin(html, quellen) {
  const konfig = anmLeseKonfig(html);
  konfig.quellen = quellen;
  return anmSchreibeKonfig(html, konfig);
}

// node --check als ES-Modul für jede .js-Datei des Assistenten (über stdin, damit das Ergebnis nicht vom Ordner abhängt).
function anmPruefeSyntax(dateien) {
  for (const [name, inhalt] of dateien) {
    if (!name.endsWith(".js")) continue;
    const ergebnis = spawnSync(process.execPath, ["--input-type=module", "--check"], { input: inhalt, encoding: "utf8" });
    if (ergebnis.status !== 0) throw new Error(`${name}: node --check meldet einen Fehler\n${ergebnis.stderr}`);
  }
}

// ---------- LIESMICH.md ----------

// Abschnitt zum Anmelde-Assistenten (nur mit ANMELDUNG_LIVE; sonst leer, dann bleibt die LIESMICH wie vorher).
function baueLiesmichAnmeldung(anmeldung) {
  if (!anmeldung) return "";
  const namen = [...anmeldung.dateien.keys()];
  const module = namen.filter((n) => /^anmeldung-(?!texte-|schrift|vorlage-).+\.js$/.test(n));
  const texte = namen.filter((n) => n.startsWith("anmeldung-texte-"));
  const binaer = namen.filter((n) => n === "anmeldung-schrift.js" || n.startsWith("anmeldung-vorlage-"));
  return `## Anmelde-Assistent (Livegang, M6)

Dieser Abschnitt steht nur im Paket, das mit dem Schalter \`ANMELDUNG_LIVE\`
(\`src/vorlagen/hilfen.mjs\`) gebaut wurde. Ohne den Schalter gibt es diese
Dateien nicht, und \`mitglied-werden.html\` führt nicht auf die Seite.

\`${ANM_SEITE}\` ist die Live-Seite des Anmelde-Assistenten („Schritt für Schritt
anmelden“, von \`mitglied-werden.html\` aus verlinkt, in der App mit \`?app=1\`).
Sprachen: ${anmeldung.sprachen.join(", ")} (Schalter \`ANMELDUNG_SPRACHEN_LIVE\`). Alle Dateien liegen flach im
Ordner \`web\` (keine Unterordner), nur als .html, .css und .js:

- \`anmeldung.css\` – Stylesheet (ohne Kommentare)
- ${module.length} Module \`anmeldung-<name>.js\` – Code des Assistenten (ES-Module; Einstieg
  \`anmeldung-assistent.js\`; ohne Kommentare, Importe auf diese Namen umgeschrieben;
  \`anmeldung-beispiele.js\` ist ein leerer Ersatz ohne Beispiel-Profile)
- ${texte.length} Textmodule \`anmeldung-texte-<sprache>-oberflaeche.js\` und \`…-regeln.js\`
- ${binaer.length} Module mit Base64-Text: \`anmeldung-schrift.js\` (Liberation Sans, SIL OFL 1.1, Lizenztext im
  Kopf der Datei) und \`anmeldung-vorlage-<name>.js\` (die HFV-Vordrucke und der Aufnahmeantrag des Vereins; Größe und
  SHA-256 prüft der Assistent beim Laden gegen die Konfiguration). Beide Arten werden erst beim Erstellen der
  PDF-Datei geladen.
- \`${ANM_PDFLIB}\` und \`${ANM_FONTKIT}\` (schon im Ordner, Teil des Aufnahmeantrags) werden mitbenutzt.

Reihenfolge beim Einspielen: erst alle \`anmeldung-*.js\` (Base64-Module, Texte, Code) und \`anmeldung.css\`, dann
\`anmeldung.html\`, zuletzt \`mitglied-werden.html\` (erst sie verlinkt die neue Seite). So ist nie eine Seite
sichtbar, deren Dateien noch fehlen. Prüfen nach dem Einspielen: \`node tools/appack-paket-pruefen.mjs\` für das
Paket und der Abgleich der SHA-256 aus \`manifest.json\` mit den Dateien im CMS.

Im CMS zu prüfen: Dateien dieser Größe (bis ${Math.round(Math.max(...[...anmeldung.dateien.values()].map((v) => Buffer.byteLength(v))) / 1024)} KB; Schrift und Vordrucke in
Zeilen zu 100 Zeichen) im Quellcode-Editor; \`cdn.appack.de\` muss \`.js\` als JavaScript ausliefern (ES-Module verlangen
das; bei \`aufnahmeantrag.js\` ist es \`application/javascript\`). Rückweg: die \`anmeldung*\`-Dateien löschen und die
vorherige \`mitglied-werden.html\` wieder einspielen.

`;
}

function baueLiesmich(dateiliste, anmeldung = null) {
  const heute = new Date().toISOString().slice(0, 10);
  return `# appack-Upload-Paket – Ordner "web" (W1)

Stand: ${heute}. Erzeugt von \`tools/appack-paket.mjs\` (\`npm run appack-paket\`)
aus \`docs/ws/*.html\` und \`docs/assets/css/site.css\` (Ergebnis von
\`npm run build\`). Dieses Paket liegt unter \`dist/appack-paket/\` und wird
nicht committet.

## Zielordner im appack-Workspace

Der Inhalt von \`web/\` (37 HTML-Seiten + \`site.css\`, siehe Dateiliste unten)
wird 1:1 in den appack-Workspace-Ordner **\`web\`** hochgeladen und dort unter
\`${ZIEL_WORKSPACE_ORDNER}<datei>\` ausgeliefert. \`site.css\` liegt im selben
Ordner wie die Seiten.

## Adressschema

- Seite ↔ Seite (z. B. \`mannschaften.html\` -> \`mannschaften-d3.html\`) und
  Sprungmarken (\`#…\`) bleiben unverändert relativ – beide Dateien liegen im
  selben Workspace-Ordner \`web\`.
- \`<link rel="stylesheet" href="site.css">\`: ebenfalls relativ, \`site.css\`
  liegt im selben Ordner.
- Alle anderen Assets – Schriften, Bilder, Wappen/Favicons, PDF-Downloads –
  sind auf **absolute GitHub-Pages-Adressen** umgeschrieben
  (\`${GH_PAGES_ASSETS}…\`), ebenso die Schriftadressen in \`site.css\`
  (\`url(…)\`).

## Abhängigkeit von GitHub Pages

Das Paket funktioniert nur, solange
\`https://justolgay.github.io/speuzer-website-prototyp/assets/…\` erreichbar
bleibt und CORS \`*\` setzt (wie heute schon bei den App-Vorlagen, siehe
\`assets/app/LIESMICH.md\`, Abschnitt „Woher die Schriften kommen"). Wird der
Prototyp unter einer anderen Adresse veröffentlicht, muss das Paket neu
gebaut werden.

## Zwei Ausgabemodi (W2)

Die Seitenvorlagen (\`src/vorlagen/workspace.html\`,
\`src/seiten/mannschaften/index.mjs\`, \`src/seiten/mannschaften/team.mjs\`)
markieren Inhalt, der nur in einem der beiden Ausgabemodi erscheinen soll:

- \`data-nur-appack\` – nur für die Live-Website. Dieses Skript macht den
  Inhalt sichtbar (entfernt das Sichtbarkeits-Attribut \`hidden\`).
- Prototyp-Markierung (der genaue Attributname dafür steht in
  \`tools/appack-paket.mjs\`, Abschnitt "Zwei Ausgabemodi", und wird hier
  bewusst nicht wörtlich wiederholt, damit er nach dem Umschreiben nicht
  fälschlich als stehengebliebene Markierung erscheint) – nur für den
  GitHub-Pages-Prototyp (eingefrorene Daten mit Stand-Angabe). Dieses Skript
  entfernt den ganzen Block.

Seit W6 (Entscheidung Olgay 23.09.2026: Tabellen und Spielpläne nur noch je
Mannschaftsseite, keine eigene Seite/Sammelseite dafür) enthält \`web/\`
ausschließlich Live-Inhalt: FUSSBALL.DE-Widgets für die Vereinsspiele
(\`mannschaften.html\`, ganz unten, Typ \`club-matches\`), das nächste Spiel
und die Spiele der Saison je Team (\`mannschaften-<team>.html\`, Typen
\`next-match\`/\`team-matches\`, IDs aus \`data/widgets.json\`) sowie die
Tabellen (ebenfalls \`mannschaften-<team>.html\`, Typ \`table\`). Das betrifft
acht der elf Mannschaften; nur die drei Teams ohne FUSSBALL.DE-Widget (F1,
F2, G-Jugend – Kinderfußball, kein Ligabetrieb) behalten die
\`<iframe>\`-Einbettung der Gruppen-Seite des Spielplan-Generators
(\`https://justolgay.github.io/speuzer-spielplan/app-<gruppe>.html\`) auch im
Live-Paket, auf \`mannschaften-<team>.html\` wie bisher auf
\`spielplan-<team>.html\`. Die früheren Seiten \`spielplan.html\`,
\`spielplan-<team>.html\` und \`tabellen.html\` sind seit W6 schlanke
Weiterleitungen (\`<meta http-equiv="refresh">\`) auf die jeweilige
Mannschaftsseite (siehe \`src/vorlagen/weiterleitung.mjs\`) – sie bleiben unter
demselben Workspace-Namen bestehen, damit alte Verweise nicht ins Leere
laufen, tragen aber keine Widgets mehr und stehen nicht in \`docs/sitemap.xml\`.
Das FUSSBALL.DE-Skript \`widgets.js\` wird clientseitig nur nachgeladen, wenn
ein sichtbares FUSSBALL.DE-Widget – gleich welchen Typs (\`next-match\`,
\`team-matches\`, \`table\`, \`club-matches\`) – im Dokument steht (siehe
\`FUSSBALLDE_WIDGET_LADER\` in \`src/vorlagen/hilfen.mjs\`). Die FUSSBALL.DE-
Widgets sind bei FUSSBALL.DE nur für die Domain \`cdn.appack.de\` freigegeben –
lokal oder auf GitHub Pages zeigen sie eine Fehlermeldung von FUSSBALL.DE, das
ist kein Seitenfehler (siehe \`tools/appack-paket-pruefen.mjs\`).

## Skripte für den Aufnahmeantrag online (28.09.2026)

\`aufnahmeantrag.html\` lädt ihre Skripte aus demselben Ordner \`web\`:
\`aufnahmeantrag.js\` (Formular, Unterschriften, PDF-Erzeugung) sofort,
\`aufnahmeantrag-pdf-lib.js\` (pdf-lib 1.17.1, MIT) nach dem ersten
Schritt im Hintergrund und \`aufnahmeantrag-fontkit.js\` (@pdf-lib/fontkit
1.1.1, MIT) nur beim Erstellen des PDF, wenn ein Name Zeichen außerhalb von
Helvetica enthält. Lizenzhinweise stehen jeweils am Dateianfang, Herkunft in
\`assets/js/antrag/LIZENZ.txt\`. Die Schrift für Namen mit Zeichen
außerhalb von Helvetica (\`liberation-sans-regular.ttf\`, SIL OFL 1.1) kommt
wie alle Schriften von GitHub Pages. Die Vorlage selbst ist das
Vereins-PDF in der Mediathek
(\`cdn.appack.de/sportfreunde04/pdf/Vereinsanmeldung…\`); die Seite prüft
Größe und SHA-256 gegen \`data/aufnahmeantrag-felder.json\` gleich beim
Aufruf; wurde die Datei im CMS ersetzt, blendet sie das Formular aus und
bietet den Papierweg an (dann Vermessung erneuern). Beim Anlegen
der Skripte im Workspace darauf achten, dass cdn.appack.de sie als
JavaScript ausliefert (\`curl -I …/web/aufnahmeantrag.js\`, Content-Type).

${baueLiesmichAnmeldung(anmeldung)}## Datenschutz

\`datenschutz.html\` nennt seit W3b die FUSSBALL.DE-Widgets als Drittanbieter
(eigener Absatz, Rechtsgrundlage Art. 6 Abs. 1 lit. f DSGVO). Der Wortlaut
ist redaktionell übernommen (W3-Spezifikation Abschnitt 7) – eine
juristische Prüfung des Datenschutztexts ist offen, bevor die Seite live
geht.

## Rückweg

Der Ordner \`web\` im appack-Workspace ist von der Live-Website unabhängig,
solange die appack-Vorlagen START/MENU/FOOTER nicht auf diesen Ordner
umgestellt sind – bis dahin kann er ohne Wirkung auf die Live-Seite gelöscht
oder neu hochgeladen werden.

## Ausgeschlossen (W3)

\`styleguide.html\` (interne Seite, "Interner Anhang für das
Übernahmepaket", Momentaufnahme-Datum, Beispiel-Kontaktdaten) ist NICHT im
Paket – \`docs/ws/styleguide.html\` bleibt nur lokal/auf GitHub Pages
(Gestaltungssystem), \`tools/appack-paket.mjs\` nimmt sie aus der
Dateiliste. Die gleichnamige Live-Datei im appack-Workspace (falls aus
einem früheren Upload noch vorhanden) sollte geleert bzw. gelöscht werden –
das macht der Verein im CMS.

## Nur vmapit

Diese Befunde betreffen die Hülle (appack-Vorlage "Microwebseite",
vmapit/appack) selbst, nicht die hier gebauten Workspace-Seiten – sie sind
hier nur dokumentiert (W3-Spezifikation Abschnitt 5), nicht umgesetzt:

- Startseite der Hülle ohne Inhalt (nur Claim + Fußbereich).
- Fester Rahmen 92\`vh\` für Inhaltsseiten (\`#showFrame\`), darunter sofort
  der Hüllen-Fußbereich – kein Rahmen, der die Inhaltshöhe übernimmt.
- Fußzeile: Impressum/Datenschutz öffnen in einem 40\`vw\`-Rahmen (1440px),
  anderes Layout als alle Menüseiten.
- Nicht ladende Stylesheets des appack-Terminmoduls
  (\`application.appack.de/appointment-module/…/preloading.css\`,
  \`theme-light.css\`, \`layout.css\`, HTTP 404) – appack melden.
- Facebook-Link der Fußzeile zeigt auf eine andere Adresse als
  \`kontakt.html\` (Worksheet-Pflege, macht der Auftraggeber im CMS).

## Dateien (${dateiliste.length})

${dateiliste.map((d) => `- ${d}`).join("\n")}
`;
}

// ---------- Hauptablauf ----------

async function main() {
  if (!existsSync(WS_DIR)) {
    console.error(`${WS_DIR} nicht gefunden – zuerst 'npm run build' ausführen.`);
    process.exit(1);
  }
  if (!existsSync(SITE_CSS_QUELLE)) {
    console.error(`${SITE_CSS_QUELLE} nicht gefunden – zuerst 'npm run build' ausführen.`);
    process.exit(1);
  }

  const alleHtmlDateien = readdirSync(WS_DIR)
    .filter((d) => d.endsWith(".html"))
    .sort();
  if (alleHtmlDateien.length !== ERWARTETE_WS_DATEIEN) {
    console.error(`Erwartet ${ERWARTETE_WS_DATEIEN} Workspace-Seiten in docs/ws/, gefunden ${alleHtmlDateien.length}.`);
    process.exit(1);
  }
  // styleguide.html bleibt draußen (siehe AUSGESCHLOSSENE_DATEIEN oben).
  const htmlDateien = alleHtmlDateien.filter((d) => !AUSGESCHLOSSENE_DATEIEN.has(d));

  rmSync(PAKET_DIR, { recursive: true, force: true });
  mkdirSync(WEB_DIR, { recursive: true });

  const webSkripte = existsSync(WEB_SKRIPTE_DIR)
    ? readdirSync(WEB_SKRIPTE_DIR).filter((d) => d.endsWith(".js")).sort()
    : [];
  // Livegang des Anmelde-Assistenten (M6, nur mit ANMELDUNG_LIVE): Die Dateien entstehen vor den Seiten, denn die Seite
  // anmeldung.html verweist auf sie und pruefeAusgabe() prüft das. pdf-lib und fontkit kommen aus dem Aufnahmeantrag.
  const anmeldung = ANMELDUNG_LIVE ? await baueAnmeldungDateien() : null;
  if (anmeldung) {
    for (const datei of [ANM_PDFLIB, ANM_FONTKIT]) {
      if (!webSkripte.includes(datei)) throw new Error(`Anmelde-Assistent: ${datei} fehlt in docs/assets/js/antrag/ (wird mitbenutzt)`);
    }
  }
  const paketDateien = new Set([...htmlDateien, "site.css", ...webSkripte, ...(anmeldung ? anmeldung.dateien.keys() : [])]);
  const zaehler = {
    cssLink: 0, href: 0, src: 0, srcset: 0, content: 0, poster: 0, dataStern: 0, cssUrl: 0,
    nurAppackHidden: 0, nurPrototyp: 0, canonical: 0, ogUrl: 0,
    webSkripte: new Set(), webSkriptVerweise: 0, anmeldungVerweise: 0,
  };
  const manifestEintraege = [];
  let gesamtBytes = 0;

  for (const dateiname of htmlDateien) {
    const quellPfad = path.join(WS_DIR, dateiname);
    const html = readFileSync(quellPfad, "utf8");
    let umgeschrieben = schreibeSeiteUm(html, dateiname, zaehler);
    if (anmeldung && dateiname === ANM_SEITE) umgeschrieben = anmTraegeQuellenEin(umgeschrieben, anmeldung.quellen);
    pruefeAusgabe(dateiname, umgeschrieben, paketDateien);

    const zielPfad = path.join(WEB_DIR, dateiname);
    writeFileSync(zielPfad, umgeschrieben, "utf8");

    const bytes = Buffer.byteLength(umgeschrieben, "utf8");
    gesamtBytes += bytes;
    manifestEintraege.push({ datei: `web/${dateiname}`, bytes, sha256: sha256(umgeschrieben) });
  }

  // Skripte des Aufnahmeantrags unverändert in den Ordner web/ (siehe
  // WEB_SKRIPTE_DIR oben); jede Datei muss von einer Seite verwendet werden.
  for (const datei of webSkripte) {
    if (!zaehler.webSkripte.has(datei)) {
      throw new Error(`docs/assets/js/antrag/${datei}: von keiner Seite verwendet – nicht ins Paket`);
    }
    const inhalt = readFileSync(path.join(WEB_SKRIPTE_DIR, datei));
    writeFileSync(path.join(WEB_DIR, datei), inhalt);
    gesamtBytes += inhalt.length;
    manifestEintraege.push({ datei: `web/${datei}`, bytes: inhalt.length, sha256: sha256(inhalt) });
  }

  const css = readFileSync(SITE_CSS_QUELLE, "utf8");
  const cssUmgeschrieben = schreibeCssUm(css, zaehler);
  if (cssUmgeschrieben.includes("../fonts/") || cssUmgeschrieben.includes("../assets/")) {
    throw new Error("site.css: enthält noch '../fonts/' oder '../assets/' nach dem Umschreiben");
  }
  writeFileSync(path.join(WEB_DIR, "site.css"), cssUmgeschrieben, "utf8");
  const cssBytes = Buffer.byteLength(cssUmgeschrieben, "utf8");
  gesamtBytes += cssBytes;
  manifestEintraege.push({ datei: "web/site.css", bytes: cssBytes, sha256: sha256(cssUmgeschrieben) });

  // Dateien des Anmelde-Assistenten (nur mit ANMELDUNG_LIVE, siehe baueAnmeldungDateien): alle sind Text.
  if (anmeldung) {
    for (const name of [...anmeldung.dateien.keys()].sort()) {
      const inhalt = anmeldung.dateien.get(name);
      writeFileSync(path.join(WEB_DIR, name), inhalt, "utf8");
      const bytes = Buffer.byteLength(inhalt, "utf8");
      gesamtBytes += bytes;
      manifestEintraege.push({ datei: `web/${name}`, bytes, sha256: sha256(inhalt) });
    }
    anmPruefeSyntax(anmeldung.dateien);
  }

  // W3b, Prüfer-Befund "klein": kein Zeitstempel im Manifest – die
  // committete Kopie docs/appack-paket/manifest.json (DOCS_KOPIE unten)
  // änderte sich sonst bei jedem "npm run build", ohne dass sich am Inhalt
  // etwas geändert hätte (git status nach dem Build nicht leer).
  const manifest = {
    zielOrdner: "web",
    quelle: { build: "npm run build", stand: "docs/ws/*.html + docs/assets/css/site.css" },
    dateien: manifestEintraege,
  };
  writeFileSync(MANIFEST_PFAD, JSON.stringify(manifest, null, 2), "utf8");

  const liesmich = baueLiesmich(manifestEintraege.map((e) => e.datei), anmeldung);
  writeFileSync(LIESMICH_PFAD, liesmich, "utf8");

  console.log("=== appack-paket.mjs: Zusammenfassung ===");
  console.log(`Dateien: ${manifestEintraege.length} (${htmlDateien.length} HTML + 1 site.css + ${webSkripte.length} Skripte)`);
  console.log(`Bytes gesamt: ${gesamtBytes}`);
  console.log("Ausgabemodus (W2):");
  console.log(`  data-nur-appack: "hidden" entfernt (jetzt sichtbar): ${zaehler.nurAppackHidden}×`);
  console.log(`  data-nur-prototyp: Blöcke vollständig entfernt: ${zaehler.nurPrototyp}×`);
  console.log("Ersetzte Verweise je Typ:");
  console.log(`  site.css-Verweis (href) auf "site.css" umgeschrieben: ${zaehler.cssLink}`);
  console.log(`  href="../assets/…" -> absolute Adresse: ${zaehler.href}`);
  console.log(`  src="../assets/…" -> absolute Adresse: ${zaehler.src}`);
  console.log(`  srcset-Einträge "../assets/…" -> absolute Adresse: ${zaehler.srcset}`);
  console.log(`  content="../assets/…" -> absolute Adresse: ${zaehler.content}`);
  console.log(`  poster="../assets/…" -> absolute Adresse: ${zaehler.poster}`);
  console.log(`  data-*="../assets/…" -> absolute Adresse: ${zaehler.dataStern}`);
  console.log(`  site.css: url("../fonts/…") -> absolute Adresse: ${zaehler.cssUrl}`);
  console.log(`  Skripte "../assets/js/antrag/…" -> gleicher Ordner: ${zaehler.webSkriptVerweise} (${[...zaehler.webSkripte].join(", ")})`);
  console.log(`  canonical -> ${ZIEL_WORKSPACE_ORDNER}<datei>: ${zaehler.canonical}`);
  console.log(`  og:url -> ${ZIEL_WORKSPACE_ORDNER}<datei>: ${zaehler.ogUrl}`);
  if (anmeldung) {
    const anmBytes = [...anmeldung.dateien.values()].reduce((summe, inhalt) => summe + Buffer.byteLength(inhalt, "utf8"), 0);
    console.log(`Anmelde-Assistent (ANMELDUNG_LIVE): ${anmeldung.dateien.size} Dateien (${anmBytes} Bytes), Sprachen ${anmeldung.sprachen.join(", ")}, ${zaehler.anmeldungVerweise} Verweise in ${ANM_SEITE} auf den Ordner web/ umgeschrieben, node --check ohne Fehler`);
  }
  console.log(`Ausgeschlossen: ${[...AUSGESCHLOSSENE_DATEIEN].join(", ")} (${AUSGESCHLOSSENE_DATEIEN.size} Datei(en), nicht im Paket)`);
  console.log(`Paket: ${path.relative(ROOT, PAKET_DIR)}/`);
  console.log(`Manifest: ${path.relative(ROOT, MANIFEST_PFAD)}`);
  console.log(`LIESMICH: ${path.relative(ROOT, LIESMICH_PFAD)}`);
  // Öffentliche Kopie unter docs/appack-paket/ (GitHub Pages): von dort holt
  // sich der CMS-Import (fetch aus dem eingebauten Browser, CORS *) die Dateien.
  // Inhalt = docs/ws/ mit umgeschriebenen Adressen, also nichts Neues öffentlich.
  const DOCS_KOPIE = path.join(ROOT, "docs", "appack-paket");
  rmSync(DOCS_KOPIE, { recursive: true, force: true });
  cpSync(PAKET_DIR, DOCS_KOPIE, { recursive: true });
  console.log(`Öffentliche Kopie: ${path.relative(ROOT, DOCS_KOPIE)}/`);
}

main().catch((fehler) => {
  console.error(fehler);
  process.exit(1);
});
