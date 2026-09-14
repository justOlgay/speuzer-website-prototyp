#!/usr/bin/env node
// Speuzer Website Prototyp – Qualitätsgates (P0 + P1)
// Nutzt puppeteer-core mit lokalem Chrome, startet tools/server.mjs selbst.
// Prüft pro Seite aus docs/sitemap.xml: Layout (kein horizontales Scrollen),
// Semantik (lang, genau eine h1), Meta (title, description, og:*), Tippziele,
// axe-core (Kontrast, Alt-Texte, Labels, Landmarken), interne Links, Bildgrößen.
// P1 zusätzlich: Burger-Menü (öffnen, Fokus, ESC schließt), Header/Footer-Links
// mit href oder .nav__bald, aria-current="page" genau einmal im Header.
// P9 zusätzlich: App-Modus (?ansicht=app) bei 390px für "/", "/mannschaften/d2/"
// und "/spielplan/" – Tab-Leiste sichtbar, fünf Tabs ≥ 44px hoch, kein
// horizontales Scrollen, genau ein aria-current in der Tab-Leiste, alle
// internen Links mit ansicht=app.
// P11 zusätzlich: "nav__bald" im gebauten HTML nur noch auf /styleguide/
// erlaubt (Plan-Abschnitt A1); Bildgrenze 200.000 Byte statt 200 KiB
// (Plan-Abschnitt B3).

import puppeteer from "puppeteer-core";
import { readFileSync, existsSync, statSync, mkdirSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { HAUPT } from "../src/vorlagen/navigation.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DOCS = path.join(ROOT, "docs");
const CACHE = path.join(ROOT, "tools", "cache");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const AXE_PFAD = path.join(ROOT, "node_modules", "axe-core", "axe.min.js");
const PORT = 4173;
const BASIS = `http://localhost:${PORT}`;
const BASIS_URL = "https://justolgay.github.io/speuzer-website-prototyp/";

const BREITEN = [320, 360, 390, 768, 1024, 1440, 1920];
// P9, Plan-Abschnitt B3: App-Modus (?ansicht=app) zusätzlich bei 390px prüfen
// – nur für diese drei Seiten (Startseite, eine Team- und die
// Spielplan-Seite).
const APP_MODUS_SEITEN = ["/", "/mannschaften/d2/", "/spielplan/"];
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

function pruefeDateiExistiertFuerLink(aktuellerSeitenPfad, href) {
  // aktuellerSeitenPfad z.B. "/styleguide/" -> Verzeichnis docs/styleguide/
  const aktuellesVerzeichnis = path.join(DOCS, aktuellerSeitenPfad.replace(/^\//, ""));
  let ziel;
  if (href.startsWith("/")) {
    ziel = path.join(DOCS, href.replace(/^\//, ""));
  } else {
    ziel = path.join(aktuellesVerzeichnis, href);
  }
  ziel = ziel.split("?")[0].split("#")[0];
  if (existsSync(ziel) && statSync(ziel).isDirectory()) {
    ziel = path.join(ziel, "index.html");
  }
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

  // --- P11, Plan-Abschnitt A1: "nav__bald" darf im gebauten HTML nur noch auf
  // /styleguide/ vorkommen (dort nur als Text in einem <code>-Element, das
  // die Konvention beschreibt) – alle anderen Seiten haben inzwischen echte
  // Ziel-Seiten für jeden ehemaligen Platzhalter. ---
  if (seitenPfad !== "/styleguide/") {
    const enthaeltNavBald = await page.evaluate(() => document.documentElement.outerHTML.includes("nav__bald"));
    if (enthaeltNavBald) {
      ergebnisSeite.fehler.push(`"nav__bald" im gebauten HTML gefunden (erlaubt nur auf /styleguide/)`);
    }
  }

  // --- Header/Footer: jeder <a> hat href oder trägt .nav__bald ---
  const kaputteNavLinks = await page.evaluate(() => {
    const treffer = [];
    for (const el of document.querySelectorAll("header a, footer a")) {
      const hatHref = !!el.getAttribute("href");
      const istBald = el.classList.contains("nav__bald");
      if (!hatHref && !istBald) {
        treffer.push((el.textContent || "").trim().slice(0, 40));
      }
    }
    return treffer;
  });
  for (const text of kaputteNavLinks) {
    ergebnisSeite.fehler.push(`Header/Footer: <a> ohne href und ohne .nav__bald: "${text}"`);
  }

  // --- aria-current="page" genau einmal im Header, sofern die Seite in HAUPT vorkommt ---
  const inHauptnav = HAUPT.some((eintrag) => eintrag.url === seitenPfad);
  if (inHauptnav) {
    const anzahlAriaCurrent = await page.evaluate(() => {
      const header = document.querySelector("header");
      return header ? header.querySelectorAll('[aria-current="page"]').length : 0;
    });
    if (anzahlAriaCurrent !== 1) {
      ergebnisSeite.fehler.push(
        `aria-current="page" im Header: ${anzahlAriaCurrent}×, erwartet genau 1× (Seite ist Teil von HAUPT)`
      );
    }
  }

  // --- Burger-Menü bei 390px: öffnen, Fokus im Panel, ESC schließt ---
  await page.setViewport({ width: 390, height: 844 });
  const hatBurger = (await page.$(".kopf__burger")) !== null;
  if (!hatBurger) {
    ergebnisSeite.fehler.push("Burger-Menü: .kopf__burger nicht gefunden");
  } else {
    await page.click(".kopf__burger");
    await warte(300); // Übergang 240ms abwarten
    const nachOeffnen = await page.evaluate(() => {
      const nav = document.getElementById("hauptmenue");
      if (!nav) return { vorhanden: false };
      const stil = getComputedStyle(nav);
      const aktiv = document.activeElement;
      return {
        vorhanden: true,
        istOffen: nav.classList.contains("ist-offen"),
        sichtbar: stil.visibility !== "hidden" && stil.display !== "none",
        fokusImPanel: !!aktiv && aktiv !== document.body && nav.contains(aktiv),
      };
    });
    if (!nachOeffnen.vorhanden) {
      ergebnisSeite.fehler.push("Burger-Menü: #hauptmenue nicht im DOM gefunden");
    } else {
      if (!nachOeffnen.istOffen || !nachOeffnen.sichtbar) {
        ergebnisSeite.fehler.push("Burger-Menü: #hauptmenue öffnet sich nach Klick auf .kopf__burger nicht sichtbar");
      }
      if (!nachOeffnen.fokusImPanel) {
        ergebnisSeite.fehler.push("Burger-Menü: Fokus liegt nach dem Öffnen nicht innerhalb von #hauptmenue");
      }

      await page.keyboard.press("Escape");
      await warte(300);
      const nachEsc = await page.evaluate(() => {
        const nav = document.getElementById("hauptmenue");
        return !nav || !nav.classList.contains("ist-offen");
      });
      if (!nachEsc) {
        ergebnisSeite.fehler.push("Burger-Menü: ESC schließt #hauptmenue nicht");
      }
    }
  }
  await page.setViewport({ width: 1440, height: 900 });

  // --- App-Modus (?ansicht=app, P9 Plan-Abschnitt B3): Tab-Leiste, Tippziele,
  // kein horizontales Scrollen, genau ein aria-current, interne Links mit
  // ansicht=app – bei 390px, nur für die drei genannten Seiten ---
  if (APP_MODUS_SEITEN.includes(seitenPfad)) {
    await page.goto(url + "?ansicht=app", { waitUntil: "networkidle0", timeout: 30000 });
    await page.setViewport({ width: 390, height: 844 });

    const appErgebnis = await page.evaluate(() => {
      const tabbar = document.querySelector(".tabbar");
      const stilTabbar = tabbar ? getComputedStyle(tabbar) : null;
      const tabbarSichtbar = !!tabbar && stilTabbar.display !== "none" && stilTabbar.visibility !== "hidden";
      const tabs = tabbar ? [...tabbar.querySelectorAll(".tabbar__tab")] : [];
      const tabHoehen = tabs.map((t) => t.getBoundingClientRect().height);
      const anzahlAriaCurrent = tabbar ? tabbar.querySelectorAll('[aria-current="page"]').length : 0;
      const links = [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href"));
      return {
        tabbarSichtbar,
        anzahlTabs: tabs.length,
        tabHoehen,
        anzahlAriaCurrent,
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
        links,
      };
    });

    if (!appErgebnis.tabbarSichtbar) {
      ergebnisSeite.fehler.push("App-Modus: Tab-Leiste (.tabbar) bei ?ansicht=app nicht sichtbar");
    }
    if (appErgebnis.anzahlTabs !== 5) {
      ergebnisSeite.fehler.push(`App-Modus: ${appErgebnis.anzahlTabs} Tabs in der Tab-Leiste gefunden, erwartet 5`);
    }
    appErgebnis.tabHoehen.forEach((hoehe, i) => {
      if (hoehe < 44) {
        ergebnisSeite.fehler.push(`App-Modus: Tab ${i + 1} ist ${Math.round(hoehe)}px hoch, erwartet ≥ 44px`);
      }
    });
    if (appErgebnis.scrollWidth > appErgebnis.innerWidth + 1) {
      ergebnisSeite.fehler.push(
        `App-Modus: horizontales Scrollen bei 390px (scrollWidth ${appErgebnis.scrollWidth} > innerWidth ${appErgebnis.innerWidth})`
      );
    }
    if (appErgebnis.anzahlAriaCurrent !== 1) {
      ergebnisSeite.fehler.push(
        `App-Modus: aria-current="page" in der Tab-Leiste ${appErgebnis.anzahlAriaCurrent}×, erwartet genau 1×`
      );
    }
    for (const href of appErgebnis.links) {
      if (!href) continue;
      if (
        href.startsWith("http://") || href.startsWith("https://") ||
        href.startsWith("mailto:") || href.startsWith("tel:") ||
        href.startsWith("#")
      ) continue;
      if (!href.includes("ansicht=app")) {
        ergebnisSeite.fehler.push(`App-Modus: interner Link ohne ansicht=app: '${href}'`);
      }
    }

    await page.setViewport({ width: 1440, height: 900 });
  }

  await page.close();
  ergebnisSeite.bestanden = ergebnisSeite.fehler.length === 0;
  bericht.seiten.push(ergebnisSeite);
  return ergebnisSeite.bestanden;
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
      const pfade = leseSitemapPfade();
      for (const seitenPfad of pfade) {
        console.log(`Prüfe ${seitenPfad} …`);
        const ok = await pruefeSeite(browser, seitenPfad, axeSkript, bericht);
        if (!ok) allesOk = false;
      }
    } finally {
      await browser.close();
    }

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
  if (bericht.bilder.verstoesse.length) {
    console.log("Bildgrößen-Verstöße:");
    for (const v of bericht.bilder.verstoesse) console.log(`  - ${v}`);
  } else {
    console.log("Bildgrößen: alle ≤ 200 KB.");
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
