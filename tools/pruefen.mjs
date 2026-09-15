#!/usr/bin/env node
// Speuzer Website Prototyp – Qualitätsgates (P0 + P1)
// Nutzt puppeteer-core mit lokalem Chrome, startet tools/server.mjs selbst.
// Prüft pro Seite aus docs/sitemap.xml: Layout (kein horizontales Scrollen),
// Semantik (lang, genau eine h1), Meta (title, description, og:*), Tippziele,
// axe-core (Kontrast, Alt-Texte, Labels, Landmarken), interne Links, Bildgrößen.
// P11 zusätzlich: Bildgrenze 200.000 Byte statt 200 KiB (Plan-Abschnitt B3).
// P15: Inhaltsseiten sind Workspace-Seiten (docs/ws/<name>.html) ohne Kopf,
// Menü und Fußbereich (appack liefert die Hülle, siehe P16) – die früheren
// P1/P9-Prüfungen (Burger-Menü, Header/Footer-Links, aria-current im Header,
// App-Modus) entfallen deshalb. "nav__bald" im gebauten HTML nur noch auf
// /ws/styleguide.html erlaubt (Plan-Abschnitt A1, P11).
// P16: sitemap.xml führt jetzt zuerst die Hülle (docs/index.html, "/")
// und danach die Workspace-Seiten (siehe tools/build.mjs). pruefeSeite()
// prüft h1/lang/description/axe – Eigenschaften der appack-Vorlage, nicht
// des Vereins – deshalb durchläuft die Hülle diese Prüfung NICHT; sie wird
// stattdessen unten aus der Schleife ausgenommen und von der eigenen
// pruefeHuelle() geprüft.
// P17: sitemap.xml führt zwischen Hülle und Workspace-Seiten zusätzlich die
// Begleitseiten (/vorher-nachher/, /app/) – Verzeichnis-URLs statt Dateien.
// Sie laufen durch dieselbe pruefeSeite() wie die Workspace-Seiten (keine
// Sonderbehandlung nötig); pruefeDateiExistiertFuerLink() unten löst ihre
// Verweise ("../ws/*.html", "../" zur Hülle) jetzt korrekt auf.

import puppeteer from "puppeteer-core";
import { readFileSync, existsSync, statSync, mkdirSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DOCS = path.join(ROOT, "docs");
const CACHE = path.join(ROOT, "tools", "cache");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const AXE_PFAD = path.join(ROOT, "node_modules", "axe-core", "axe.min.js");
const PORT = 4173;
const BASIS = `http://localhost:${PORT}`;
const BASIS_URL = "https://justolgay.github.io/speuzer-website-prototyp/";

// P15: 576 ergänzt (40vw bei 1440px, der schmale appack-Rahmen für
// Impressum/Datenschutz).
const BREITEN = [320, 360, 390, 576, 768, 1024, 1280, 1440, 1920];
const AXE_REGELN = [
  "color-contrast", "image-alt", "label", "link-name",
  "button-name", "landmark-one-main", "page-has-heading-one",
];
const BILD_ENDUNGEN = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif", ".svg"]);
const MAX_BILD_BYTES = 200_000; // P11, Plan-Abschnitt B3: 200.000 Byte, nicht 200 KiB (vorher 200 * 1024)

function warte(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function starteServer() {
  const proc = spawn(process.execPath, [path.join(ROOT, "tools", "server.mjs")], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  // Warten, bis der Server antwortet
  for (let i = 0; i < 50; i++) {
    try {
      const resp = await fetch(BASIS + "/");
      if (resp.ok || resp.status === 404) return proc;
    } catch {
      // noch nicht bereit
    }
    await warte(100);
  }
  throw new Error("Server ist nach 5s nicht erreichbar");
}

function leseSitemapPfade() {
  const sitemap = readFileSync(path.join(DOCS, "sitemap.xml"), "utf8");
  const treffer = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
  return treffer.map((loc) => {
    const pfad = loc.replace(BASIS_URL.replace(/\/$/, ""), "");
    return pfad || "/";
  });
}

// P15: Workspace-Seiten liegen flach als Dateien in docs/ws/ (kein
// index.html mehr in einem Unterverzeichnis je Seite) – interne Verweise
// zeigen jetzt auf ".html"-Dateien in docs/ws/ oder auf "../assets/…".
// aktuellerSeitenPfad z. B. "/ws/mannschaften.html" -> Verzeichnis docs/ws/.
// P17: Begleitseiten haben dagegen einen Verzeichnis-Pfad ("/vorher-nachher/",
// "/app/", jeweils mit abschließendem "/") – path.dirname() eines solchen
// Pfads springt eine Ebene zu hoch (path.dirname("/app/") ist "/", nicht
// "/app"), das hätte Verweise wie "../ws/mannschaften-d2.html" oder "../"
// (Hülle) falsch (eine Ebene zu weit nach oben) aufgelöst. Endet der
// Seiten-Pfad selbst auf "/", ist er bereits das Verzeichnis. Ebenso für das
// Linkziel: endet href auf "/" (z. B. "../", "../app/"), ist das eigentliche
// Ziel dessen index.html.
function pruefeDateiExistiertFuerLink(aktuellerSeitenPfad, href) {
  const seitenVerzeichnis = aktuellerSeitenPfad.endsWith("/")
    ? aktuellerSeitenPfad
    : path.dirname(aktuellerSeitenPfad);
  const aktuellesVerzeichnis = path.join(DOCS, seitenVerzeichnis.replace(/^\//, ""));
  const hrefOhneRest = href.split("?")[0].split("#")[0];
  let ziel = hrefOhneRest.startsWith("/")
    ? path.join(DOCS, hrefOhneRest.replace(/^\//, ""))
    : path.join(aktuellesVerzeichnis, hrefOhneRest);
  if (hrefOhneRest.endsWith("/")) ziel = path.join(ziel, "index.html");
  return existsSync(ziel);
}

function sammleBilddateien(dir, treffer = []) {
  for (const eintrag of readdirSync(dir)) {
    const voll = path.join(dir, eintrag);
    const info = statSync(voll);
    if (info.isDirectory()) {
      sammleBilddateien(voll, treffer);
    } else if (BILD_ENDUNGEN.has(path.extname(eintrag).toLowerCase())) {
      treffer.push({ pfad: voll, groesse: info.size });
    }
  }
  return treffer;
}

// --- P13, Schritt 3b: 404-Seite (Befund 1) – docs/404.html darf keine
// relative Referenz "./…" mehr enthalten; site.css muss absolut (BASIS_URL)
// eingebunden sein. Liest die Datei direkt, ohne den lokalen
// Server/Puppeteer (404.html steht nicht in der sitemap.xml und wird sonst
// nicht als eigene Seite geprüft).
// P15: kein nav.js mehr (Datei gelöscht) – die Prüfung darauf entfällt. Die
// Workspace-Vorlage (workspace.html) bindet kein Wappen-Bild mehr ein (kein
// Kopf-/Fußbereich) – die Wappen-Prüfung ist daher optional: nur wenn ein
// Wappen-Bild gefunden wird, muss es absolut sein. ---
function pruefe404Seite() {
  const fehler = [];
  const pfad404 = path.join(DOCS, "404.html");
  if (!existsSync(pfad404)) {
    fehler.push("docs/404.html nicht gefunden");
    return fehler;
  }
  const html = readFileSync(pfad404, "utf8");
  if (html.includes('="./')) {
    fehler.push(`404.html enthält noch relative Referenzen ('="./' gefunden)`);
  }
  const pruefeAbsolut = (bezeichnung, regex, { optional = false } = {}) => {
    const treffer = html.match(regex);
    if (!treffer) {
      if (!optional) fehler.push(`404.html: ${bezeichnung} nicht gefunden`);
    } else if (!treffer[1].startsWith(BASIS_URL)) {
      fehler.push(`404.html: ${bezeichnung} ist nicht absolut ('${treffer[1]}')`);
    }
  };
  pruefeAbsolut("site.css", /href="([^"]*site\.css)"/);
  pruefeAbsolut("Wappen-Bild", /src="([^"]*wappen[^"]*\.(?:svg|png))"/, { optional: true });
  return fehler;
}

async function pruefeSeite(browser, seitenPfad, axeSkript, bericht) {
  const page = await browser.newPage();
  const url = BASIS + seitenPfad;
  const ergebnisSeite = { seite: seitenPfad, fehler: [] };

  await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });

  // --- Semantik & Meta ---
  const meta = await page.evaluate(() => {
    const h1e = document.querySelectorAll("h1");
    const get = (sel, attr) => {
      const el = document.querySelector(sel);
      return el ? el.getAttribute(attr) : null;
    };
    return {
      lang: document.documentElement.getAttribute("lang"),
      title: document.title,
      anzahlH1: h1e.length,
      description: get('meta[name="description"]', "content"),
      ogTitle: get('meta[property="og:title"]', "content"),
      ogDescription: get('meta[property="og:description"]', "content"),
      ogImage: get('meta[property="og:image"]', "content"),
      ogUrl: get('meta[property="og:url"]', "content"),
      canonical: get('link[rel="canonical"]', "href"),
    };
  });

  if (meta.lang !== "de") ergebnisSeite.fehler.push(`lang ist '${meta.lang}', erwartet 'de'`);
  if (meta.anzahlH1 !== 1) ergebnisSeite.fehler.push(`h1-Anzahl ist ${meta.anzahlH1}, erwartet 1`);
  if (!meta.title || meta.title.trim() === "") ergebnisSeite.fehler.push("title ist leer");
  if (!meta.description || meta.description.length < 50 || meta.description.length > 170) {
    ergebnisSeite.fehler.push(`meta description Länge ${meta.description?.length ?? 0}, erwartet 50–170`);
  }
  if (!meta.ogTitle) ergebnisSeite.fehler.push("og:title fehlt");
  if (!meta.ogDescription) ergebnisSeite.fehler.push("og:description fehlt");
  if (!meta.ogImage) ergebnisSeite.fehler.push("og:image fehlt");
  if (!meta.ogUrl) ergebnisSeite.fehler.push("og:url fehlt");

  // --- Layout: kein horizontales Scrollen bei allen Breiten ---
  for (const breite of BREITEN) {
    await page.setViewport({ width: breite, height: 900 });
    const scroll = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    if (scroll.scrollWidth > scroll.innerWidth + 1) {
      ergebnisSeite.fehler.push(
        `horizontales Scrollen bei ${breite}px (scrollWidth ${scroll.scrollWidth} > innerWidth ${scroll.innerWidth})`
      );
    }
  }
  await page.setViewport({ width: 1440, height: 900 });
  // P11-Korrektur (außerhalb des eigentlichen P11-Auftrags, siehe
  // Abschlussbericht "Abweichungen"): kurz auf CSS-Übergänge warten, bevor
  // Tippziele/axe-core gemessen werden. Der Breiten-Zyklus oben springt über
  // die 1024px-Grenze, an der .knopf seinen Hintergrund wechselt
  // (transparent im Menü-Panel <1024px vs. --blau-700 ab 1024px, ".knopf {
  // transition: background var(--t-kurz) }" in base.css, vorbestehend/
  // unverändert) – ohne Wartezeit hat axe-core diesen Übergang schon beim
  // ersten Lauf nach P11 gelegentlich mitten in der Animation gemessen
  // (halbtransparenter Zwischenwert, schlechter Kontrast). Gleiches Muster
  // wie die Wartezeit nach dem Burger-Menü-Klick weiter unten.
  await warte(200);

  // --- Tippziele ≥ 44×44 (Ausnahme: Links im Fließtext von p/li) ---
  const tippzieleFehler = await page.evaluate(() => {
    const fehler = [];
    const elemente = document.querySelectorAll("a, button, input, select");
    for (const el of elemente) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue; // unsichtbar/nicht gerendert
      const istFliesstextLink =
        el.tagName === "A" && (el.closest("p") || el.closest("li"));
      if (istFliesstextLink) continue;

      // P8-Korrektur A2: Checkbox-Kästen sind bewusst nur noch 24×24px groß
      // (siehe .formular__checkzeile input[type="checkbox"] in
      // komponenten.css) – das tatsächliche Tippziel ist die umschließende
      // Beschriftung: entweder das <label>, das Eingabe und Text umschließt
      // (checkboxFeld() bzw. die Abteilungs-Checkboxen in
      // mitglied-werden.mjs), oder – wenn die Beschriftung einen
      // Fließtext-Link enthält (checkboxFeldMitLink()) – das per
      // aria-labelledby verknüpfte <p> (siehe Kommentar dort, warum dort
      // bewusst kein <label> verwendet wird). Ist diese Beschriftung
      // mindestens 44px hoch, gilt das Tippziel als erreicht, auch wenn das
      // <input> selbst kleiner ist.
      if (el.tagName === "INPUT" && el.type === "checkbox") {
        let beschriftung = el.labels && el.labels.length ? el.labels[0] : null;
        if (!beschriftung) {
          const labelledby = el.getAttribute("aria-labelledby");
          const ersteId = labelledby ? labelledby.split(/\s+/)[0] : null;
          beschriftung = ersteId ? document.getElementById(ersteId) : null;
        }
        if (beschriftung && beschriftung.getBoundingClientRect().height >= 44) continue;
      }

      if (rect.height < 44 || rect.width < 44) {
        fehler.push(
          `${el.tagName.toLowerCase()} "${(el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 40)}" ist ${Math.round(rect.width)}×${Math.round(rect.height)}px`
        );
      }
    }
    return fehler;
  });
  for (const f of tippzieleFehler) ergebnisSeite.fehler.push(`Tippziel zu klein: ${f}`);

  // --- axe-core ---
  await page.evaluate(axeSkript);
  const axeErgebnis = await page.evaluate((regeln) => {
    return window.axe.run(document, { runOnly: { type: "rule", values: regeln } });
  }, AXE_REGELN);
  for (const verstoss of axeErgebnis.violations) {
    ergebnisSeite.fehler.push(
      `axe-core [${verstoss.id}]: ${verstoss.help} (${verstoss.nodes.length}×)`
    );
  }

  // --- interne Links ---
  const linksImDom = await page.evaluate(() => {
    return [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href"));
  });
  for (const href of linksImDom) {
    if (!href) continue;
    if (
      href.startsWith("http://") || href.startsWith("https://") ||
      href.startsWith("mailto:") || href.startsWith("tel:") ||
      href.startsWith("#")
    ) continue;
    if (!pruefeDateiExistiertFuerLink(seitenPfad, href)) {
      ergebnisSeite.fehler.push(`interner Link ohne Ziel: '${href}'`);
    }
  }

  // --- P11, Plan-Abschnitt A1 (P15: Ziel-Seite jetzt /ws/styleguide.html):
  // "nav__bald" darf im gebauten HTML nur noch auf der Styleguide-Seite
  // vorkommen (dort nur als Text in einem <code>-Element, das die Konvention
  // beschreibt) – alle anderen Seiten haben inzwischen echte Ziel-Seiten für
  // jeden ehemaligen Platzhalter. ---
  if (seitenPfad !== "/ws/styleguide.html") {
    const enthaeltNavBald = await page.evaluate(() => document.documentElement.outerHTML.includes("nav__bald"));
    if (enthaeltNavBald) {
      ergebnisSeite.fehler.push(`"nav__bald" im gebauten HTML gefunden (erlaubt nur auf /ws/styleguide.html)`);
    }
  }

  // P15: Kopfzeile, Hauptnavigation und Fußbereich entfallen auf den
  // Workspace-Seiten (appack liefert die Hülle, siehe P16) – damit entfallen
  // auch die Prüfungen auf Burger-Menü, Header/Footer-Links, aria-current im
  // Header sowie den App-Modus (?ansicht=app, Tab-Leiste).

  await page.close();
  ergebnisSeite.bestanden = ergebnisSeite.fehler.length === 0;
  bericht.seiten.push(ergebnisSeite);
  return ergebnisSeite.bestanden;
}

// ---------- Hülle (P16, Schritt 5) ----------
// Prüft docs/index.html (die Nachbildung der appack-Vorlage "Microwebseite")
// gesondert von den Workspace-Seiten: Ladeanimation, Leisten-/Burger-Menü,
// Textüberlagerung, Rahmenmaße bei Klicks, Fußbereich, kein horizontales
// Scrollen bei mehreren Breiten sowie die Existenz aller internen
// Menü-/Fußbereich-Ziele unter docs/. Absichtlich NICHT geprüft: h1, lang,
// description, axe-core – das sind Eigenschaften der appack-Vorlage, nicht
// des Vereins (siehe pruefeSeite()), die Hülle bildet sie 1:1 nach.

async function istSichtbar(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    const stil = getComputedStyle(el);
    if (stil.display === "none" || stil.visibility === "hidden") return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }, selector);
}

async function warteBisLoaderWeg(page) {
  return page
    .waitForFunction(() => !document.getElementById("pageLoader"), { timeout: 4000 })
    .then(() => true)
    .catch(() => false);
}

async function pruefeHuelle(browser) {
  const fehler = [];
  const push = (text) => fehler.push(text);
  const page = await browser.newPage();

  // --- 1440 × 900 ---
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(BASIS + "/index.html", { waitUntil: "domcontentloaded", timeout: 30000 });

  if (!(await warteBisLoaderWeg(page))) {
    push("1440px: #pageLoader nicht innerhalb von 4s entfernt");
  }

  const titel = await page.title();
  if (titel !== "FFV Sportfreunde 04") {
    push(`1440px: document.title ist '${titel}', erwartet 'FFV Sportfreunde 04'`);
  }

  if (!(await istSichtbar(page, ".barMenu"))) {
    push("1440px: .barMenu nicht sichtbar");
  }
  const anzahlBarElemente = await page.evaluate(() => document.querySelectorAll(".menuBarElement").length);
  if (anzahlBarElemente !== 6) {
    push(`1440px: ${anzahlBarElemente} .menuBarElement, erwartet 6 (Start + 5)`);
  }
  if (await istSichtbar(page, ".menuMore")) {
    push("1440px: .menuMore sichtbar, erwartet unsichtbar (6 Punkte passen in die Leiste)");
  }

  await warte(1600);
  const overlay = await page.evaluate(() => {
    const el = document.querySelector(".textOverlay");
    if (!el) return null;
    return { text: el.textContent.trim(), opacity: getComputedStyle(el).opacity };
  });
  if (!overlay) {
    push("1440px: .textOverlay nicht gefunden");
  } else {
    if (overlay.text !== "Fußball im Gallus – seit 1904.") {
      push(`1440px: .textOverlay-Text ist '${overlay.text}', erwartet 'Fußball im Gallus – seit 1904.'`);
    }
    if (overlay.opacity !== "1") {
      push(`1440px: .textOverlay-opacity ist '${overlay.opacity}', erwartet '1' (nach 1,6s)`);
    }
  }

  if (await istSichtbar(page, "#showFrame")) {
    push("1440px: #showFrame sichtbar vor jedem Klick, erwartet unsichtbar");
  }

  // Klick auf "Mannschaften" (.barMenu)
  const geklicktMannschaften = await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll(".menuBarElement")).find((e) => e.textContent.trim() === "Mannschaften");
    if (!el) return false;
    el.click();
    return true;
  });
  if (!geklicktMannschaften) {
    push("1440px: Menüpunkt 'Mannschaften' in .barMenu nicht gefunden");
  } else {
    await warte(300);
    const frame = await page.evaluate(() => {
      const f = document.getElementById("showFrame");
      const r = f.getBoundingClientRect();
      return { src: f.getAttribute("src"), x: r.x, y: r.y, width: r.width, height: r.height };
    });
    if (!frame.src || !frame.src.endsWith("ws/mannschaften.html")) {
      push(`1440px: #showFrame.src ist '${frame.src}', erwartet Ende 'ws/mannschaften.html'`);
    }
    if (Math.abs(frame.width - 1440) > 2) push(`1440px (Mannschaften): Breite ${frame.width}, erwartet 1440±2`);
    if (Math.abs(frame.height - 828) > 2) push(`1440px (Mannschaften): Höhe ${frame.height}, erwartet 828±2 (92vh)`);
    if (Math.abs(frame.y - 72) > 2) push(`1440px (Mannschaften): y ${frame.y}, erwartet 72±2 (8vh)`);
  }

  // Klick auf "Start" (.barMenu)
  await page.evaluate(() => {
    const el = document.getElementById("menuBarStart");
    if (el) el.click();
  });
  await warte(300);
  const nachStart = await page.evaluate(() => {
    const f = document.getElementById("showFrame");
    const overlayEl = document.querySelector(".textOverlay");
    return {
      showFrameSichtbar: getComputedStyle(f).display !== "none",
      overlaySichtbar: overlayEl ? getComputedStyle(overlayEl).display !== "none" : false,
    };
  });
  if (nachStart.showFrameSichtbar) {
    push("1440px: #showFrame nach Klick auf 'Start' sichtbar, erwartet unsichtbar");
  }
  if (!nachStart.overlaySichtbar) {
    push("1440px: .textOverlay nach Klick auf 'Start' unsichtbar, erwartet sichtbar");
  }

  // Klick auf .footerImprint
  const geklicktImprint = await page.evaluate(() => {
    const el = document.querySelector(".footerImprint");
    if (!el) return false;
    el.click();
    return true;
  });
  if (!geklicktImprint) {
    push("1440px: .footerImprint nicht gefunden");
  } else {
    await warte(300);
    const frame = await page.evaluate(() => {
      const f = document.getElementById("showFrame");
      const r = f.getBoundingClientRect();
      return { src: f.getAttribute("src"), x: r.x, width: r.width };
    });
    if (!frame.src || !frame.src.endsWith("ws/impressum.html")) {
      push(`1440px: #showFrame.src nach Klick auf Impressum ist '${frame.src}', erwartet Ende 'ws/impressum.html'`);
    }
    if (Math.abs(frame.width - 576) > 2) push(`1440px (Impressum): Breite ${frame.width}, erwartet 576±2`);
    if (Math.abs(frame.x - 432) > 2) push(`1440px (Impressum): x ${frame.x}, erwartet 432±2`);
  }

  // Fußbereich
  const fussbereich = await page.evaluate(() => {
    const socialSelectors = [".footerFacebook a", ".footerInsta a", ".footerTiktok a", ".footerX a", ".footerYoutube a"];
    let socialLinks = 0;
    for (const sel of socialSelectors) socialLinks += document.querySelectorAll(sel).length;
    const bannerEl = document.querySelector(".appBanner, .nomediaBanner");
    return {
      mailLinks: document.querySelectorAll('a[href^="mailto:"]').length,
      telLinks: document.querySelectorAll('a[href^="tel:"]').length,
      socialLinks,
      bannerText: bannerEl ? bannerEl.textContent.trim() : null,
    };
  });
  if (fussbereich.mailLinks < 1) push("1440px: kein a[href^=\"mailto:\"] im Fußbereich");
  if (fussbereich.telLinks < 1) push("1440px: kein a[href^=\"tel:\"] im Fußbereich");
  if (fussbereich.socialLinks !== 2) push(`1440px: ${fussbereich.socialLinks} Social-Links im Fußbereich, erwartet genau 2`);
  if (fussbereich.bannerText !== "Jetzt unsere App laden!") {
    push(`1440px: .appBanner-Text ist '${fussbereich.bannerText}', erwartet 'Jetzt unsere App laden!'`);
  }

  // --- 390 × 844 ---
  // Kein erneutes goto(): dieselbe geladene Seite nur auf schmal skaliert
  // (wie ein Nutzer, der das Fenster schmaler zieht) – applyBarMenuMode() in
  // huelle.js reagiert selbst per resize-Ereignis (siehe dort).
  await page.setViewport({ width: 390, height: 844 });
  await warte(300); // resize-Handler/requestAnimationFrame abwarten

  if (!(await istSichtbar(page, ".burger"))) push("390px: .burger nicht sichtbar");
  if (await istSichtbar(page, ".barMenu")) push("390px: .barMenu sichtbar, erwartet unsichtbar");

  await page.evaluate(() => document.querySelector(".burger").click());
  await warte(300);
  if (!(await istSichtbar(page, ".burgerMenu"))) {
    push("390px: .burgerMenu nach Klick auf den Burger nicht sichtbar");
  }
  const anzahlMenuElemente = await page.evaluate(() => document.querySelectorAll(".menuElement").length);
  if (anzahlMenuElemente !== 6) {
    push(`390px: ${anzahlMenuElemente} .menuElement, erwartet 6 (Start + 5)`);
  }

  const geklicktVerein = await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll(".menuElement")).find((e) => e.textContent.trim() === "Verein");
    if (!el) return false;
    el.click();
    return true;
  });
  if (!geklicktVerein) {
    push("390px: Menüpunkt 'Verein' in .burgerMenu nicht gefunden");
  } else {
    await warte(300);
    const frame = await page.evaluate(() => {
      const f = document.getElementById("showFrame");
      const r = f.getBoundingClientRect();
      return { src: f.getAttribute("src"), width: r.width, height: r.height, y: r.y };
    });
    if (!frame.src || !frame.src.endsWith("ws/verein.html")) {
      push(`390px: #showFrame.src ist '${frame.src}', erwartet Ende 'ws/verein.html'`);
    }
    if (Math.abs(frame.width - 390) > 2) push(`390px (Verein): Breite ${frame.width}, erwartet 390±2`);
    if (Math.abs(frame.height - 785) > 2) push(`390px (Verein): Höhe ${frame.height}, erwartet 785±2`);
    if (Math.abs(frame.y - 68) > 2) push(`390px (Verein): y ${frame.y}, erwartet 68±2`);

    // burgerMenu schließt sich 150ms nach dem Klick (siehe setFrame() in huelle.js)
    await warte(300);
    if (await istSichtbar(page, ".burgerMenu")) {
      push("390px: .burgerMenu nach Klick auf 'Verein' noch sichtbar, erwartet unsichtbar");
    }
  }

  // --- 840 × 900: Leisten-Überlauf ("Mehr") ---
  // Wieder kein erneutes goto() (siehe 390px-Abschnitt oben).
  await page.setViewport({ width: 840, height: 900 });
  await warte(300); // resize-Handler/updateBarMenuOverflow() per requestAnimationFrame

  if (!(await istSichtbar(page, ".barMenu"))) push("840px: .barMenu nicht sichtbar");

  const ueberlauf = await page.evaluate(() => {
    const barMenu = document.querySelector(".barMenu");
    const items = Array.from(document.querySelectorAll(".barMenu .menuBarElement"));
    const sichtbareBreite = items.reduce((summe, el) => summe + el.getBoundingClientRect().width, 0);
    const sichtbareAnzahl = items.filter((el) => el.getBoundingClientRect().width > 0).length;
    const more = barMenu.querySelector(".menuMore");
    const moreSichtbar = !!more && getComputedStyle(more).display !== "none";
    const dropdownEintraege = more ? more.querySelectorAll(".menuMoreDropdown .menuBarElement").length : 0;
    return {
      gesamtAnzahl: items.length,
      sichtbareAnzahl,
      sichtbareBreite,
      moreSichtbar,
      dropdownEintraege,
      barMenuBreite: barMenu.clientWidth,
    };
  });
  if (ueberlauf.gesamtAnzahl !== 6) {
    push(`840px: ${ueberlauf.gesamtAnzahl} .menuBarElement insgesamt (Leiste + Dropdown), erwartet 6`);
  }
  const alleSechsSichtbar = ueberlauf.sichtbareAnzahl === 6 && !ueberlauf.moreSichtbar;
  const mehrMitEintraegen = ueberlauf.moreSichtbar && ueberlauf.dropdownEintraege >= 1;
  if (!alleSechsSichtbar && !mehrMitEintraegen) {
    push(
      `840px: weder alle 6 Punkte sichtbar (${ueberlauf.sichtbareAnzahl}/6, .menuMore sichtbar: ${ueberlauf.moreSichtbar}) noch .menuMore mit ≥1 Dropdown-Eintrag (${ueberlauf.dropdownEintraege})`
    );
  }
  if (ueberlauf.sichtbareBreite > ueberlauf.barMenuBreite + 2) {
    push(`840px: Summe sichtbarer Punktbreiten ${Math.round(ueberlauf.sichtbareBreite)} > Leistenbreite ${ueberlauf.barMenuBreite}`);
  }

  // --- kein horizontales Scrollen der Hülle bei mehreren Breiten ---
  for (const breite of [320, 360, 390, 768, 1024, 1440, 1920]) {
    await page.setViewport({ width: breite, height: 900 });
    const scroll = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    if (scroll.scrollWidth > scroll.innerWidth + 1) {
      push(`horizontales Scrollen bei ${breite}px (scrollWidth ${scroll.scrollWidth} > innerWidth ${scroll.innerWidth})`);
    }
  }

  // --- alle internen Menü-/Fußbereich-Ziele existieren unter docs/ ---
  const appackDaten = await page.evaluate(() => window.APPACK);
  const ziele = [
    ...(appackDaten.menu ?? []).map((m) => m.menuLink),
    appackDaten.footer?.footerImprint,
    appackDaten.footer?.footerDatenschutz,
  ];
  for (const ziel of ziele) {
    if (!ziel || ziel.startsWith("http")) continue;
    const dateiPfad = path.join(DOCS, ziel.split("?")[0].split("#")[0]);
    if (!existsSync(dateiPfad)) {
      push(`Ziel '${ziel}' existiert nicht unter docs/`);
    }
  }

  await page.close();
  return { fehler, bestanden: fehler.length === 0 };
}

async function main() {
  mkdirSync(CACHE, { recursive: true });

  if (!existsSync(AXE_PFAD)) {
    console.error("axe-core nicht gefunden unter node_modules/axe-core/axe.min.js – `npm install` ausführen.");
    process.exit(1);
  }
  const axeSkript = readFileSync(AXE_PFAD, "utf8");

  const serverProc = await starteServer();
  const bericht = { erstellt: new Date().toISOString(), seiten: [], bilder: { verstoesse: [] } };
  let allesOk = true;

  try {
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
    try {
      // P16: erster Sitemap-Eintrag ("/") ist die Hülle, nicht geprüft von
      // pruefeSeite() (siehe Kommentar oben) – stattdessen unten pruefeHuelle().
      const pfade = leseSitemapPfade().filter((p) => p !== "/");
      for (const seitenPfad of pfade) {
        console.log(`Prüfe ${seitenPfad} …`);
        const ok = await pruefeSeite(browser, seitenPfad, axeSkript, bericht);
        if (!ok) allesOk = false;
      }

      console.log("Prüfe Hülle (/) …");
      const huelleErgebnis = await pruefeHuelle(browser);
      bericht.huelle = huelleErgebnis;
      if (!huelleErgebnis.bestanden) allesOk = false;
    } finally {
      await browser.close();
    }

    // --- 404-Seite: absolute Referenzen (P13, Befund 1) ---
    const fehler404 = pruefe404Seite();
    bericht.seite404 = { fehler: fehler404 };
    if (fehler404.length) allesOk = false;

    // --- Bildgrößen ---
    const bilderDir = path.join(DOCS, "assets");
    if (existsSync(bilderDir)) {
      const bilder = sammleBilddateien(bilderDir);
      for (const bild of bilder) {
        if (bild.groesse > MAX_BILD_BYTES) {
          const meldung = `${path.relative(ROOT, bild.pfad)}: ${Math.round(bild.groesse / 1024)} KB > 200 KB`;
          bericht.bilder.verstoesse.push(meldung);
          allesOk = false;
        }
      }
    }
  } finally {
    serverProc.kill();
  }

  writeFileSync(path.join(CACHE, "pruefbericht.json"), JSON.stringify(bericht, null, 2), "utf8");

  console.log("\n=== Zusammenfassung ===");
  for (const s of bericht.seiten) {
    console.log(`${s.bestanden ? "OK  " : "FEHLER"} ${s.seite} (${s.fehler.length} Fehler)`);
    for (const f of s.fehler) console.log(`  - ${f}`);
  }
  console.log(`${bericht.huelle.bestanden ? "OK  " : "FEHLER"} / (Hülle) (${bericht.huelle.fehler.length} Fehler)`);
  for (const f of bericht.huelle.fehler) console.log(`  - ${f}`);
  if (bericht.bilder.verstoesse.length) {
    console.log("Bildgrößen-Verstöße:");
    for (const v of bericht.bilder.verstoesse) console.log(`  - ${v}`);
  } else {
    console.log("Bildgrößen: alle ≤ 200 KB.");
  }
  if (bericht.seite404.fehler.length) {
    console.log("404-Seite (absolute Referenzen) – Verstöße:");
    for (const f of bericht.seite404.fehler) console.log(`  - ${f}`);
  } else {
    console.log("404-Seite: alle Referenzen absolut.");
  }
  console.log(`\nBericht: tools/cache/pruefbericht.json`);

  if (!allesOk) {
    console.error("\npruefen.mjs: FEHLGESCHLAGEN");
    process.exit(1);
  } else {
    console.log("\npruefen.mjs: alle Gates bestanden.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
