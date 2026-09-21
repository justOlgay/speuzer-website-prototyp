#!/usr/bin/env node
// Speuzer Website Prototyp – statischer Builder (P0)
// Node 24, ohne Abhängigkeiten. Liest src/ und data/, schreibt nach docs/.

import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, rmSync, cpSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { datumLang } from "../src/vorlagen/hilfen.mjs";
import { bildschirme } from "../src/appkonzept/bildschirme.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");
const DATA_DIR = path.join(ROOT, "data");
const ASSETS = path.join(ROOT, "assets");
const DOCS = path.join(ROOT, "docs");
const CACHE = path.join(ROOT, "tools", "cache");

const BASIS_URL = "https://justolgay.github.io/speuzer-website-prototyp/";
const VEREINSNAME = "FFV Sportfreunde 04";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const startZeit = Date.now();

// ---------- Daten laden ----------

function ladeDaten() {
  const daten = {};
  if (existsSync(DATA_DIR)) {
    for (const datei of readdirSync(DATA_DIR)) {
      if (datei.endsWith(".json")) {
        const schluessel = datei.slice(0, -".json".length);
        daten[schluessel] = JSON.parse(readFileSync(path.join(DATA_DIR, datei), "utf8"));
      }
    }
  }
  daten.stand = new Date().toISOString();
  return daten;
}

// ---------- Seitenmodule einsammeln ----------

function findeSeitenModule(dir) {
  const treffer = [];
  for (const eintrag of readdirSync(dir)) {
    const voll = path.join(dir, eintrag);
    const info = statSync(voll);
    if (info.isDirectory()) {
      treffer.push(...findeSeitenModule(voll));
    } else if (eintrag.endsWith(".mjs")) {
      treffer.push(voll);
    }
  }
  return treffer;
}

async function sammleSeiten(daten) {
  const seitenDir = path.join(SRC, "seiten");
  const module = existsSync(seitenDir) ? findeSeitenModule(seitenDir) : [];
  const alleSeiten = [];
  for (const modulPfad of module) {
    const modul = await import(pathToFileURL(modulPfad).href);
    if (typeof modul.seite === "function") {
      alleSeiten.push(modul.seite(daten));
    } else if (typeof modul.seiten === "function") {
      alleSeiten.push(...modul.seiten(daten));
    } else {
      console.warn(`  Warnung: ${path.relative(ROOT, modulPfad)} exportiert weder seite() noch seiten()`);
    }
  }
  return alleSeiten;
}

// ---------- Hilfsfunktionen ----------

function normUrl(url) {
  let u = url;
  if (!u.startsWith("/")) u = "/" + u;
  if (!u.endsWith("/")) u = u + "/";
  return u;
}

function pfadZurWurzel(url) {
  const tiefe = url.split("/").filter(Boolean).length;
  return tiefe === 0 ? "./" : "../".repeat(tiefe);
}

// ---------- Workspace-Dateiname (P15) ----------
// Baut aus einer normalisierten URL (führender und abschließender
// Schrägstrich, siehe normUrl()) den Dateinamen einer Workspace-Seite: die
// Segmente mit "-" verbunden. "/mannschaften/" -> "mannschaften",
// "/mannschaften/d2/" -> "mannschaften-d2", "/verein/vorstand/" ->
// "verein-vorstand". Die Ausgabedatei liegt unter docs/ws/<wsName>.html.
function wsName(url) {
  return url.split("/").filter(Boolean).join("-");
}

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function baueOgBlock({ title, description, canonical, ogImageAbs, ogType }) {
  const volltitel = `${title} – ${VEREINSNAME}`;
  return [
    `<meta property="og:type" content="${escapeHtml(ogType ?? "website")}">`,
    `<meta property="og:site_name" content="${escapeHtml(VEREINSNAME)}">`,
    `<meta property="og:title" content="${escapeHtml(volltitel)}">`,
    `<meta property="og:description" content="${escapeHtml(description)}">`,
    `<meta property="og:url" content="${escapeHtml(canonical)}">`,
    `<meta property="og:image" content="${escapeHtml(ogImageAbs)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
  ].join("\n");
}

function fuelleVorlage(basis, werte) {
  let html = basis;
  for (const [schluessel, wert] of Object.entries(werte)) {
    html = html.replaceAll(`{{${schluessel}}}`, wert ?? "");
  }
  return html;
}

// ---------- Link- und Pfad-Umschreibung für Workspace-Seiten (P15) ----------
// Die Seitenmodule bauen ihre Verweise weiterhin relativ zur alten,
// verschachtelten URL (pfad = pfadZurWurzel(url), z. B. "../../assets/…" oder
// "${pfad}spielplan/d2/") – diese Funktion schreibt sie nach dem Rendern auf
// die flache Workspace-Struktur (docs/ws/<wsName>.html) um. Betroffen sind die
// Attribute href/src/poster/data-src sowie jeder Eintrag in srcset, sofern der
// Wert mit "./" oder "../" beginnt (alles andere – http(s):, mailto:, tel:,
// "#…", data:, webcal: – bleibt unangetastet, weil es nie mit "./"/"../"
// beginnt). Der Wert wird gegen die alte Seiten-URL aufgelöst: führt er auf
// eine andere Seiten-URL aus `seitenUrls`, wird er zu "<wsName>.html" plus
// ?…/#…; führt er auf "/assets/…", wird er zu "../assets/…"; alles andere ist
// ein verwaister Verweis und bricht den Bau ab (exit 1).
function zielFuerWorkspaceVerweis(wert, aktuelleUrl, seitenUrls) {
  const aufgeloest = new URL(wert, "https://x.invalid" + aktuelleUrl);
  const pathname = aufgeloest.pathname;
  const rest = aufgeloest.search + aufgeloest.hash;
  const pathnameMitSchraegstrich = pathname.endsWith("/") ? pathname : pathname + "/";

  if (seitenUrls.has(pathnameMitSchraegstrich)) {
    return wsName(pathnameMitSchraegstrich) + ".html" + rest;
  }
  if (pathname.startsWith("/assets/")) {
    return "../" + pathname.slice(1) + rest;
  }

  console.error(`Verweis ohne Ziel in ${aktuelleUrl}: ${wert}`);
  process.exit(1);
  return wert; // unerreichbar, nur damit die Funktion einen Rückgabetyp hat
}

function relativiereFuerWorkspace(html, url, seitenUrls) {
  let ergebnis = html.replace(
    /(href|src|poster|data-src)="(\.\.?\/[^"]*)"/g,
    (_treffer, attribut, wert) => `${attribut}="${zielFuerWorkspaceVerweis(wert, url, seitenUrls)}"`
  );

  ergebnis = ergebnis.replace(/srcset="([^"]*)"/g, (_treffer, wert) => {
    const neu = wert
      .split(",")
      .map((teil) => {
        const t = teil.trim();
        if (!/^\.\.?\//.test(t)) return t;
        const [pfadTeil, ...deskriptor] = t.split(/\s+/);
        const neuerPfad = zielFuerWorkspaceVerweis(pfadTeil, url, seitenUrls);
        return deskriptor.length ? `${neuerPfad} ${deskriptor.join(" ")}` : neuerPfad;
      })
      .join(", ");
    return `srcset="${neu}"`;
  });

  return ergebnis;
}

// ---------- OG-Standardbild erzeugen (nur wenn nötig) ----------

function stelleOgStandardbildSicher() {
  const ziel = path.join(ASSETS, "og", "standard.png");
  if (existsSync(ziel)) return;

  mkdirSync(path.dirname(ziel), { recursive: true });
  mkdirSync(CACHE, { recursive: true });

  const vorlage = readFileSync(path.join(ROOT, "tools", "og-standard.html"), "utf8");
  const wappen = readFileSync(path.join(ASSETS, "logo", "wappen-weiss.svg"), "utf8");
  const html = vorlage.replace("<!--WAPPEN-->", wappen);
  const tempHtml = path.join(CACHE, "og-standard-render.html");
  writeFileSync(tempHtml, html, "utf8");

  const tempPng = path.join(CACHE, "og-standard-render.png");
  execFileSync(CHROME, [
    "--headless",
    "--disable-gpu",
    `--screenshot=${tempPng}`,
    "--window-size=1200,630",
    "--force-device-scale-factor=1",
    pathToFileURL(tempHtml).href,
  ], { stdio: "pipe" });

  cpSync(tempPng, ziel);
  console.log("  assets/og/standard.png erzeugt (1200×630)");
}

// ---------- CSS-Bündel (P11, Plan-Abschnitt B2) ----------
// tokens.css + fonts.css + base.css + komponenten.css in dieser Reihenfolge
// zu docs/assets/css/site.css zusammenfügen und einfach minifizieren
// (Kommentare entfernen, Zeilenumbrüche/Mehrfach-Leerzeichen zusammenziehen,
// Leerzeichen um { } : ; , entfernen – keine Wert-Umschreibung).
// workspace.html (P15, ersetzt basis.html) lädt nur noch site.css als
// render-blockendes Stylesheet; die Einzeldateien liegen unverändert weiter
// unter docs/assets/css/ (kopiereAssets() kopiert den ganzen assets/-Ordner),
// der Styleguide verweist weiterhin auf sie als Quelltext. url("../fonts/…")
// bleibt gültig, weil site.css im selben Ordner liegt wie die Einzeldateien.
// P15: "app-modus.css" entfällt (Datei gelöscht, siehe Abschlussbericht).
const CSS_BUENDEL_DATEIEN = ["tokens.css", "fonts.css", "base.css", "komponenten.css"];

function minifiziereCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "") // Kommentare entfernen
    .replace(/\s+/g, " ") // Zeilenumbrüche/Mehrfach-Leerzeichen zusammenziehen
    .replace(/\s*([{}:;,])\s*/g, "$1") // Leerzeichen um { } : ; , entfernen
    .trim();
}

function baueCssBuendel() {
  const teile = CSS_BUENDEL_DATEIEN.map((datei) =>
    minifiziereCss(readFileSync(path.join(ASSETS, "css", datei), "utf8"))
  );
  const zielDir = path.join(DOCS, "assets", "css");
  mkdirSync(zielDir, { recursive: true });
  writeFileSync(path.join(zielDir, "site.css"), teile.join("\n"), "utf8");
}

// ---------- docs/ bereinigen (P15) ----------
// Vor dem Schreiben alles in docs/ außer assets/ (wird von kopiereAssets()
// ohnehin neu geschrieben) und .nojekyll löschen – so bleiben keine alten
// Ausgabeverzeichnisse (docs/mannschaften/, docs/news/, …) aus früheren
// Bau-Läufen zurück.
function bereinigeDocs() {
  if (!existsSync(DOCS)) return;
  for (const eintrag of readdirSync(DOCS)) {
    if (eintrag === "assets" || eintrag === ".nojekyll") continue;
    rmSync(path.join(DOCS, eintrag), { recursive: true, force: true });
  }
}

// ---------- Hülle (P16) ----------
// Nachbildung der appack-Vorlage "Microwebseite" (docs/index.html): liest
// src/huelle/{huelle.html,huelle.css,huelle.js} und die fünf appack-*.json-
// Dateien (siehe data/), entfernt jeweils den Schlüssel "_hinweis" und setzt
// {{css}}/{{daten}}/{{js}} in der Vorlage ein. assets/huelle/ wird von
// kopiereAssets() automatisch mitkopiert (Teil von assets/).

const APPACK_DATEIEN = {
  start: "appack-start.json",
  menu: "appack-menu.json",
  footer: "appack-footer.json",
  sidebar: "appack-sidebar.json",
  appColor: "appack-app-color.json",
};

function ladeAppackDaten(dateiname) {
  const daten = JSON.parse(readFileSync(path.join(DATA_DIR, dateiname), "utf8"));
  if (Array.isArray(daten)) return daten;
  const { _hinweis, ...rest } = daten;
  return rest;
}

function baueHuelle() {
  const html = readFileSync(path.join(SRC, "huelle", "huelle.html"), "utf8");
  const css = readFileSync(path.join(SRC, "huelle", "huelle.css"), "utf8");
  const js = readFileSync(path.join(SRC, "huelle", "huelle.js"), "utf8");

  const appack = {};
  for (const [schluessel, dateiname] of Object.entries(APPACK_DATEIEN)) {
    appack[schluessel] = ladeAppackDaten(dateiname);
  }

  const datenBlock = `<script>\nwindow.APPACK = ${JSON.stringify(appack)};\n</script>`;
  const cssBlock = `<style>\n${css}\n</style>`;
  const jsBlock = `<script>\n${js}\n</script>`;

  const ausgabe = fuelleVorlage(html, { css: cssBlock, daten: datenBlock, js: jsBlock });
  writeFileSync(path.join(DOCS, "index.html"), ausgabe, "utf8");
}

// ---------- Assets kopieren ----------

function kopiereAssets() {
  const zielAssets = path.join(DOCS, "assets");
  rmSync(zielAssets, { recursive: true, force: true });
  mkdirSync(zielAssets, { recursive: true });
  for (const eintrag of readdirSync(ASSETS)) {
    if (eintrag === "bilder") {
      // bilder/quelle nicht mitkopieren, andere bilder-Unterordner (falls vorhanden) schon
      const bilderQuelle = path.join(ASSETS, "bilder");
      const bilderZiel = path.join(zielAssets, "bilder");
      mkdirSync(bilderZiel, { recursive: true });
      for (const unterordner of readdirSync(bilderQuelle)) {
        if (unterordner === "quelle") continue;
        cpSync(path.join(bilderQuelle, unterordner), path.join(bilderZiel, unterordner), { recursive: true });
      }
      continue;
    }
    cpSync(path.join(ASSETS, eintrag), path.join(zielAssets, eintrag), { recursive: true });
  }
}

// ---------- Hauptablauf ----------

async function main() {
  const daten = ladeDaten();

  stelleOgStandardbildSicher();

  // P15: appack-Fassung – Inhaltsseiten sind eigenständige Workspace-Seiten
  // (docs/ws/<wsName>.html) ohne Kopf, Menü und Fußbereich; die Hülle kommt
  // in P16 als docs/index.html. workspace.html ersetzt basis.html, es gibt
  // kein header()/footer()-Modul mehr.
  const workspaceVorlage = readFileSync(path.join(SRC, "vorlagen", "workspace.html"), "utf8");
  const standLang = datumLang(daten.stand);

  // P17: Begleitseiten (src/begleit/*.mjs) – Begleitmaterial für den Vorstand
  // außerhalb der Hülle UND außerhalb der Workspace-Seiten, eigene Vorlage
  // (begleit.html, mit {{pfad}} statt fest "../assets/…", siehe dort).
  const begleitVorlage = readFileSync(path.join(SRC, "vorlagen", "begleit.html"), "utf8");

  const seiten = await sammleSeiten(daten);
  const seitenUrls = new Set(seiten.map((seite) => normUrl(seite.url)));

  // docs/ bereinigen, bevor neu geschrieben wird (Schritt 9.2).
  bereinigeDocs();
  mkdirSync(DOCS, { recursive: true });
  mkdirSync(path.join(DOCS, "ws"), { recursive: true });

  const geschrieben = []; // { url (alt), name (wsName), title } je Workspace-Seite

  for (const seite of seiten) {
    const url = normUrl(seite.url);
    const name = wsName(url);
    const canonical = `${BASIS_URL.replace(/\/$/, "")}/ws/${name}.html`;
    const ogImageAbs = seite.ogImage
      ? (seite.ogImage.startsWith("http") ? seite.ogImage : BASIS_URL.replace(/\/$/, "") + "/" + seite.ogImage.replace(/^\//, ""))
      : BASIS_URL + "assets/og/standard.png";

    const titelVoll = `${seite.title} – ${VEREINSNAME}`;
    const og = baueOgBlock({ title: seite.title, description: seite.description, canonical, ogImageAbs, ogType: seite.ogType });

    // Schritt 3: die vom Seitenmodul relativ zur alten (verschachtelten) URL
    // gebauten Verweise (pfad = pfadZurWurzel(url)) auf die flache
    // Workspace-Struktur umschreiben – nur der Inhalt, nicht die Vorlage: die
    // Kopf-Referenzen der Vorlage (favicon, Preloads, site.css) sind bereits
    // korrekt fest auf "../assets/…" gesetzt (siehe workspace.html) und
    // dürfen nicht nochmals gegen die alte URL aufgelöst werden.
    const inhaltUmgeschrieben = relativiereFuerWorkspace(seite.inhalt, url, seitenUrls);

    const html = fuelleVorlage(workspaceVorlage, {
      title: escapeHtml(titelVoll),
      description: escapeHtml(seite.description),
      canonical,
      og,
      inhalt: inhaltUmgeschrieben,
      bodyclass: seite.bodyclass ?? "",
      stand: standLang,
    });

    writeFileSync(path.join(DOCS, "ws", `${name}.html`), html, "utf8");
    geschrieben.push({ url, name, title: seite.title });
  }

  // P17: Begleitseiten (/vorher-nachher/, /app/) – docs/<url>/index.html,
  // eigene Vorlage (begleit.html), pfad = pfadZurWurzel(url) (hier immer "../",
  // beide Seiten liegen in Tiefe 1). Anders als bei den Workspace-Seiten oben
  // KEINE relativiereFuerWorkspace(): die Begleitseiten liegen selbst in der
  // alten (unverschachtelten, aber weiterhin "echten") Verzeichnisstruktur,
  // ihre Module schreiben Verweise auf Workspace-Seiten bereits direkt als
  // "${pfad}ws/<name>.html" (siehe dort). aria-current="page" am jeweils
  // passenden Kopfleisten-Link (begleit.html: {{navAktuellVorherNachher}} /
  // {{navAktuellApp}}) – die Hülle selbst nutzt diese Vorlage nicht, deshalb
  // gibt es dafür keinen dritten Platzhalter.
  const begleitModule = existsSync(path.join(SRC, "begleit")) ? findeSeitenModule(path.join(SRC, "begleit")) : [];
  const begleitGeschrieben = []; // { url, title } je Begleitseite

  for (const modulPfad of begleitModule) {
    const modul = await import(pathToFileURL(modulPfad).href);
    if (typeof modul.seite !== "function") {
      console.warn(`  Warnung: ${path.relative(ROOT, modulPfad)} exportiert kein seite()`);
      continue;
    }
    const seite = modul.seite(daten);
    const url = normUrl(seite.url);
    const pfad = pfadZurWurzel(url);
    const canonical = BASIS_URL.replace(/\/$/, "") + url;
    const ogImageAbs = seite.ogImage
      ? (seite.ogImage.startsWith("http") ? seite.ogImage : BASIS_URL.replace(/\/$/, "") + "/" + seite.ogImage.replace(/^\//, ""))
      : BASIS_URL + "assets/og/standard.png";

    const titelVoll = `${seite.title} – ${VEREINSNAME}`;
    const og = baueOgBlock({ title: seite.title, description: seite.description, canonical, ogImageAbs, ogType: seite.ogType });

    const html = fuelleVorlage(begleitVorlage, {
      title: escapeHtml(titelVoll),
      description: escapeHtml(seite.description),
      canonical,
      og,
      pfad,
      inhalt: seite.inhalt,
      stand: standLang,
      navAktuellVorherNachher: url === "/vorher-nachher/" ? ' aria-current="page"' : "",
      navAktuellApp: url === "/app/" ? ' aria-current="page"' : "",
    });

    mkdirSync(path.join(DOCS, url), { recursive: true });
    writeFileSync(path.join(DOCS, url, "index.html"), html, "utf8");
    begleitGeschrieben.push({ url, title: seite.title });
  }

  // K1: Klick-Prototyp der App (docs/app-konzept/) – neun eigenständige
  // Bildschirm-Attrappen (eigenes Stylesheet app-konzept.css, kein site.css)
  // plus die Rahmenseite index.html (nutzt wie die Begleitseiten oben die
  // Begleit-Vorlage, siehe src/appkonzept/bildschirme.mjs). Nur index.html
  // bekommt einen Sitemap-Eintrag (unten) – die neun Bildschirme sind kein
  // eigenständiges Prüfziel der allgemeinen Begleitseiten-Prüfung, siehe
  // tools/pruefen.mjs (eigene, schlankere Prüfschleife für docs/app-konzept/).
  const appKonzeptDateien = bildschirme(daten);
  mkdirSync(path.join(DOCS, "app-konzept"), { recursive: true });
  for (const { datei, html } of appKonzeptDateien) {
    writeFileSync(path.join(DOCS, "app-konzept", datei), html, "utf8");
  }

  // docs/index.html – die Hülle (P16): Nachbildung der appack-Vorlage
  // "Microwebseite", siehe baueHuelle() oben. Erster Eintrag der Sitemap
  // (unten).
  baueHuelle();

  // 404-Seite (kein Verzeichnis, liegt direkt in docs/) – P17, Schritt 2: jetzt
  // aus der Begleit-Vorlage (begleit.html) statt der Workspace-Vorlage; pfad =
  // "./" (404.html liegt wie index.html direkt in docs/, Tiefe 0), dadurch
  // erzeugt fuelleVorlage() bereits "./assets/…" – die frühere Nachbehandlung
  // ("../assets/" -> "./assets/", nötig wegen der in workspace.html fest
  // codierten "../"-Pfade) entfällt. Keiner der drei Kopfleisten-Links ist auf
  // 404.html "aktuell" (die Seite ist selbst kein Navigationsziel) – beide
  // {{navAktuell…}}-Platzhalter bleiben leer.
  {
    const pfad = "./";
    const canonical = BASIS_URL.replace(/\/$/, "") + "/404.html";
    const title = "Seite nicht gefunden";
    const description = "Diese Seite gibt es im Prototyp nicht. Zurück zur Startseite.";
    const og = baueOgBlock({ title, description, canonical, ogImageAbs: BASIS_URL + "assets/og/standard.png" });
    const inhalt = `<section class="abschnitt seitenkopf">
  <div class="container">
    <h1>Seite nicht gefunden</h1>
    <p class="seitenkopf__lead">Diese Adresse gibt es im Prototyp nicht.</p>
  </div>
</section>
<section class="abschnitt">
  <div class="container fluss">
    <p class="knopfzeile">
      <a class="knopf" href="${pfad}">Zur appack-Fassung</a>
      <a class="knopf knopf--sekundaer" href="${pfad}vorher-nachher/">Vorher / Nachher</a>
    </p>
  </div>
</section>`;
    let html = fuelleVorlage(begleitVorlage, {
      title: escapeHtml(`${title} – ${VEREINSNAME}`),
      description: escapeHtml(description),
      canonical,
      og,
      pfad,
      inhalt,
      stand: standLang,
      navAktuellVorherNachher: "",
      navAktuellApp: "",
    });

    // Befund 1 (P13, Sichtprüfung): GitHub Pages liefert docs/404.html für
    // JEDEN nicht existierenden Pfad aus, auch verschachtelte (z. B.
    // /gibt-es-nicht/x/). Die relativen "./"-Referenzen der Seite lösen dann
    // falsch relativ zum nicht-existierenden Verzeichnis auf. Deshalb hier –
    // nur für 404.html – jede href="./…", src="./…" sowie jeden
    // srcset-Eintrag auf eine absolute BASIS_URL-Adresse umschreiben. <link
    // rel="canonical"> ist bereits absolut.
    html = html.replace(/(href|src)="\.\//g, `$1="${BASIS_URL}`);
    html = html.replace(/srcset="([^"]*)"/g, (_treffer, wert) => {
      const neu = wert
        .split(",")
        .map((teil) => {
          const t = teil.trim();
          if (!t.startsWith("./")) return t;
          const [url, ...deskriptor] = t.split(/\s+/);
          return BASIS_URL + url.slice(2) + (deskriptor.length ? " " + deskriptor.join(" ") : "");
        })
        .join(", ");
      return `srcset="${neu}"`;
    });

    writeFileSync(path.join(DOCS, "404.html"), html, "utf8");
  }

  kopiereAssets();
  baueCssBuendel();

  writeFileSync(path.join(DOCS, ".nojekyll"), "", "utf8");
  // P11, Plan-Abschnitt B4: indexierbar statt komplett gesperrt, damit die
  // Lighthouse-SEO-Prüfung (is-crawlable) besteht – der Prototyp kennzeichnet
  // sich stattdessen auf jeder Seite als Testumgebung (siehe README.md).
  writeFileSync(
    path.join(DOCS, "robots.txt"),
    `User-agent: *\nAllow: /\nSitemap: ${BASIS_URL.replace(/\/$/, "")}/sitemap.xml\n`,
    "utf8"
  );

  // Schritt 7 (P16, Schritt 4), erweitert in P17: Sitemap listet zuerst die
  // Hülle (docs/index.html, BASIS_URL), danach die Begleitseiten
  // (/vorher-nachher/, /app/), danach alle ws/<name>.html (absolute
  // BASIS_URL) – tools/pruefen.mjs und tools/lighthouse.mjs behandeln nur den
  // ersten Eintrag (die Hülle) gesondert (siehe dort), Begleit- und
  // Workspace-Seiten laufen in derselben allgemeinen Schleife durch dieselben
  // Prüfungen bzw. Messungen; tools/screenshots.mjs nimmt beide ebenso in der
  // allgemeinen Schleife mit und screenshottet die Hülle zusätzlich gezielt
  // (siehe screenshotHuelle() dort).
  const sitemapEintraege = [
    `  <url><loc>${BASIS_URL}</loc></url>`,
    ...begleitGeschrieben.map((s) => `  <url><loc>${BASIS_URL.replace(/\/$/, "")}${s.url}</loc></url>`),
    // K1: Sitemap-Eintrag nur für die Rahmenseite (docs/app-konzept/index.html),
    // nicht für die neun Bildschirm-Attrappen (siehe oben).
    `  <url><loc>${BASIS_URL}app-konzept/</loc></url>`,
    ...geschrieben.map((s) => `  <url><loc>${BASIS_URL.replace(/\/$/, "")}/ws/${s.name}.html</loc></url>`),
  ].join("\n");
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEintraege}\n</urlset>\n`;
  writeFileSync(path.join(DOCS, "sitemap.xml"), sitemap, "utf8");

  const dauer = ((Date.now() - startZeit) / 1000).toFixed(2);
  console.log(`Gebaute Begleitseiten (${begleitGeschrieben.length}):`);
  for (const s of begleitGeschrieben) console.log(`  ${s.url}  (${s.title})`);
  console.log(`Gebaute Workspace-Seiten (${geschrieben.length}):`);
  for (const s of geschrieben) console.log(`  ws/${s.name}.html  (${s.url})`);
  console.log(`Gebaute App-Konzept-Bildschirme (${appKonzeptDateien.length}):`);
  for (const s of appKonzeptDateien) console.log(`  app-konzept/${s.datei}`);
  console.log(`docs/index.html, 404.html, robots.txt, sitemap.xml, .nojekyll geschrieben.`);
  console.log(`Fertig in ${dauer}s.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
