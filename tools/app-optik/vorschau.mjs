#!/usr/bin/env node
// Speuzer Website Prototyp – A1 App-Optik: Vorher/Nachher-Vorschau der
// appack-Modulseiten mit assets/app/styles.css + app-color.css.
//
// Lädt jede Kopie aus tools/cache/app-optik/module/*.html direkt per
// file://. Die Kopien enthalten private Telefonnummern (siehe
// LIESMICH.md/Abschlussmeldung), sind gitignored (tools/cache/) und werden
// nie committet oder zitiert – dieses Skript liest sie nur zum Rendern.
//
// Modus "nachher": Anfragen auf .../workspace/styles.css bzw.
// .../workspace/app-color.css werden abgefangen und mit dem Inhalt der
// lokalen assets/app/-Dateien beantwortet. Modus "vorher": dieselben
// Anfragen laufen unverändert durch (reales Netz, appack liefert dort
// aktuell die praktisch leere Live-Datei, siehe styles-live.css).
//
// Sonderfall Service/Sportangebote/Über uns (Microwebsite-Kacheln): diese
// drei Kopien laden workspace/styles.css gar nicht selbst (das übernimmt
// laut appack-Vorlage erst die Website-Hülle, in der sie eingebettet
// werden) – ohne Gegenmaßnahme sähe "nachher" dort identisch zu "vorher"
// aus. Für diese drei wird die Datei im Modus "nachher" deshalb zusätzlich
// direkt per page.addStyleTag() eingespielt (Abweichung von der reinen
// Interception, siehe Abschlussmeldung/Offene Fragen).
//
// Externe Skripte der Vorlagen dürfen laden – die Datenanzeige hängt an
// Workbook.load (appack-eigenes Laden der CMS-Daten); scheitert das
// offline/CORS, bleibt der statische DOM der Kopie trotzdem da und wird
// gerendert (siehe Abschlussmeldung).

import puppeteer from "puppeteer-core";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const MODULE_DIR = path.join(ROOT, "tools", "cache", "app-optik", "module");
const ZIEL = path.join(ROOT, "tools", "cache", "app-optik", "vorschau");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const STYLES_CSS = readFileSync(path.join(ROOT, "assets", "app", "styles.css"), "utf8");
const APP_COLOR_CSS = readFileSync(path.join(ROOT, "assets", "app", "app-color.css"), "utf8");

const BREITE = 390;
const HOEHE = 760;

// Reihenfolge wie in der Spezifikation (a1-spec.md, Schritt 1.6) – Datei,
// appack-Vorlagenname, ob die Vorlage workspace/styles.css selbst lädt
// (siehe Kopf-Kommentar), und die CSS-Selektoren, deren Tippziele in
// Schritt 4 gemessen werden.
const VORLAGEN = [
  {
    datei: "abteilungen",
    tpl: "Abteilungen.tpl (Mannschaften)",
    laedtSelbst: true,
    tippziele: ["#entries-section .entry-field-icons a", "#searchbar-filter-button"],
  },
  {
    datei: "vorstand",
    tpl: "Ansprechpartner.tpl (Vorstand)",
    laedtSelbst: true,
    tippziele: [".social-media a"],
  },
  {
    datei: "sponsoren",
    tpl: "Sponsoren.tpl",
    laedtSelbst: true,
    tippziele: ['[id="SocialMedia"] a'],
  },
  {
    datei: "mitglied-werden",
    tpl: "Mitglied werden_3.tpl (Formular)",
    laedtSelbst: true,
    tippziele: [".button", "#clear-signature", "#save-signature", ".regForm fieldset .box"],
  },
  {
    datei: "spielplan-uebersicht",
    tpl: "Tabelle-Spielplan-Uebersicht.tpl (Liste)",
    laedtSelbst: true,
    tippziele: [".Item_erste_Ebene"],
  },
  {
    datei: "service",
    tpl: "Liste - Microwebsite (Service)",
    laedtSelbst: false,
    tippziele: [".Item_erste_Ebene"],
  },
  {
    datei: "sportangebote",
    tpl: "Liste - Microwebsite (Sportangebote)",
    laedtSelbst: false,
    tippziele: [".Item_erste_Ebene"],
  },
  {
    datei: "ueber-uns",
    tpl: "Liste - Microwebsite (Über uns)",
    laedtSelbst: false,
    tippziele: [".Item_erste_Ebene"],
  },
];

function warte(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Manche Vorlagen zeigen ihre Kontakt-Icons erst nach dem Aufklappen eines
// Akkordeons (Abteilungen: .entry-content, Sponsoren: .sponElement +
// .panel-body) – zunächst per Vorlage/JS eingeklappt bzw. ausgeblendet
// (Rundenprüfung 1 zeigte sonst 0 gemessene Tippziele). Für Screenshot +
// Messung wird deshalb jeweils der erste Eintrag direkt aufgeklappt – das
// ändert nur den Klapp-/Sichtbarkeitszustand dieses einen Testeintrags,
// nicht die ausgelieferte styles.css selbst (Regel 3 bleibt unberührt).
const AUFKLAPPEN = {
  abteilungen() {
    const entry = document.querySelector("#entries-section .entry");
    const content = entry?.querySelector(".entry-content");
    if (entry && content) {
      entry.setAttribute("aria-expanded", "true");
      content.style.display = "block";
    }
  },
  sponsoren() {
    // .sponElement ist per Vorlage/JS ("$('.sponElement').hide()", erst
    // Workbook.load/Filter zeigen es wieder) unabhängig von unserem CSS
    // ausgeblendet – ohne echtes CMS-Datenladen (offline nicht möglich,
    // siehe Kopf-Kommentar) bleibt das so. Für Screenshot/Messung werden
    // deshalb alle realen Sponsoren (nicht #vorlagenElement) samt
    // Kontakt-Icons hier zwangsweise sichtbar gemacht.
    const echte = Array.from(document.querySelectorAll(".sponElement")).filter(
      (el) => el.id !== "vorlagenElement"
    );
    for (const real of echte) {
      real.style.setProperty("display", "block", "important");
      const clickBox = real.querySelector(".clickBox.hide-panel-body") || real.querySelector(".clickBox");
      const body = clickBox?.nextElementSibling;
      if (clickBox) clickBox.classList.remove("hide-panel-body");
      if (body && body.classList.contains("panel-body")) {
        body.style.setProperty("height", "auto", "important");
        body.style.padding = "5px 15px";
      }
    }
  },
};

async function screenshotSeite(browser, vorlage, modus) {
  const { datei, laedtSelbst, tippziele } = vorlage;
  const dateiPfad = path.join(MODULE_DIR, `${datei}.html`);
  if (!existsSync(dateiPfad)) {
    console.warn(`  (übersprungen: ${dateiPfad} fehlt)`);
    return null;
  }

  const page = await browser.newPage();
  await page.setViewport({ width: BREITE, height: HOEHE });
  await page.setRequestInterception(true);

  page.on("request", (req) => {
    const url = req.url();
    if (modus === "nachher" && url.includes("sportfreunde04/workspace/styles.css")) {
      req.respond({ status: 200, contentType: "text/css; charset=utf-8", body: STYLES_CSS });
      return;
    }
    if (modus === "nachher" && url.includes("sportfreunde04/workspace/app-color.css")) {
      req.respond({ status: 200, contentType: "text/css; charset=utf-8", body: APP_COLOR_CSS });
      return;
    }
    req.continue();
  });

  try {
    await page.goto(pathToFileURL(dateiPfad).href, { waitUntil: "load", timeout: 30000 });
  } catch (err) {
    console.warn(`  (Ladefehler ${datei} @ ${modus}: ${err.message})`);
  }

  // Microwebsite-Kacheln laden workspace/styles.css nicht selbst (siehe
  // Kopf-Kommentar) – im Modus "nachher" hier direkt einspielen.
  if (modus === "nachher" && !laedtSelbst) {
    await page.addStyleTag({ content: STYLES_CSS }).catch((err) => {
      console.warn(`  (addStyleTag fehlgeschlagen ${datei}: ${err.message})`);
    });
  }

  if (AUFKLAPPEN[datei]) {
    await page.evaluate(AUFKLAPPEN[datei]).catch((err) => {
      console.warn(`  (Aufklappen fehlgeschlagen ${datei}: ${err.message})`);
    });
  }

  await warte(3000);

  mkdirSync(ZIEL, { recursive: true });
  const zielViewport = path.join(ZIEL, `${datei}-${modus}.png`);
  const zielFull = path.join(ZIEL, `${datei}-${modus}-full.png`);
  await page.screenshot({ path: zielViewport });
  await page.screenshot({ path: zielFull, fullPage: true });
  console.log(`  Screenshot: ${datei} @ ${modus} -> ${path.relative(ROOT, zielViewport)}`);

  // Schritt 4: Tippziele messen (Breite/Höhe jedes sichtbaren Treffers je
  // Selektor). Kein display:none o. Ä. nötig – reine Messung.
  const messung = await page.evaluate((selektoren) => {
    const ergebnis = [];
    for (const sel of selektoren) {
      const els = Array.from(document.querySelectorAll(sel));
      const sichtbar = els
        .map((el) => el.getBoundingClientRect())
        .filter((r) => r.width > 0 && r.height > 0);
      if (sichtbar.length === 0) {
        ergebnis.push({ selektor: sel, anzahl: 0, minBreite: null, minHoehe: null, zuKlein: 0 });
        continue;
      }
      const minBreite = Math.min(...sichtbar.map((r) => r.width));
      const minHoehe = Math.min(...sichtbar.map((r) => r.height));
      const zuKlein = sichtbar.filter((r) => r.width < 44 || r.height < 44).length;
      ergebnis.push({
        selektor: sel,
        anzahl: sichtbar.length,
        minBreite: Math.round(minBreite),
        minHoehe: Math.round(minHoehe),
        zuKlein,
      });
    }
    return ergebnis;
  }, tippziele);

  await page.close();
  return { datei, modus, messung, zielViewport, zielFull };
}

// ---------- Kontaktbogen ----------
// Eine HTML-Seite mit allen Vorher/Nachher-Paaren nebeneinander, dann
// selbst per Puppeteer fotografiert – kein zusätzliches Bild-Paket nötig
// (Node 24, keine neuen Abhängigkeiten, siehe a1-spec.md Kopf).
async function baueKontaktbogen(browser, vorlagen) {
  const zeilen = vorlagen
    .map(({ datei, tpl }) => {
      const vorherUrl = pathToFileURL(path.join(ZIEL, `${datei}-vorher.png`)).href;
      const nachherUrl = pathToFileURL(path.join(ZIEL, `${datei}-nachher.png`)).href;
      return `
        <div class="zeile">
          <div class="beschriftung">${tpl}</div>
          <div class="paar">
            <figure><img src="${vorherUrl}" width="${BREITE}" height="${HOEHE}"><figcaption>vorher</figcaption></figure>
            <figure><img src="${nachherUrl}" width="${BREITE}" height="${HOEHE}"><figcaption>nachher</figcaption></figure>
          </div>
        </div>`;
    })
    .join("\n");

  const html = `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; }
  body { margin: 0; background: #eee; font-family: sans-serif; }
  .zeile { padding: 16px; border-bottom: 2px solid #ccc; }
  .beschriftung { font-weight: 700; margin-bottom: 8px; }
  .paar { display: flex; gap: 16px; }
  figure { margin: 0; }
  figure img { display: block; width: ${BREITE}px; height: ${HOEHE}px; object-fit: cover; border: 1px solid #999; }
  figcaption { text-align: center; font-size: 12px; padding-top: 4px; }
</style></head>
<body>${zeilen}</body></html>`;

  const htmlPfad = path.join(ZIEL, "_bogen.html");
  writeFileSync(htmlPfad, html, "utf8");

  const page = await browser.newPage();
  await page.setViewport({ width: BREITE * 2 + 80, height: 100 });
  await page.goto(pathToFileURL(htmlPfad).href, { waitUntil: "load" });
  await warte(500);
  const zielBogen = path.join(ZIEL, "bogen.png");
  await page.screenshot({ path: zielBogen, fullPage: true });
  await page.close();
  console.log(`Kontaktbogen: ${path.relative(ROOT, zielBogen)}`);
  return zielBogen;
}

function druckeTippzielTabelle(ergebnisse) {
  console.log("\nTippziele (Breite/Höhe in px, Ziel ≥44):");
  console.log("Vorlage | Modus | Selektor | Anzahl | min. Breite | min. Höhe | zu klein");
  for (const e of ergebnisse) {
    if (!e) continue;
    for (const m of e.messung) {
      console.log(
        `${e.datei} | ${e.modus} | ${m.selektor} | ${m.anzahl} | ${m.minBreite ?? "-"} | ${m.minHoehe ?? "-"} | ${m.zuKlein}`
      );
    }
  }
}

async function main() {
  mkdirSync(ZIEL, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  const ergebnisse = [];
  try {
    for (const vorlage of VORLAGEN) {
      console.log(`Vorlage: ${vorlage.tpl}`);
      for (const modus of ["vorher", "nachher"]) {
        const r = await screenshotSeite(browser, vorlage, modus);
        if (r) ergebnisse.push(r);
      }
    }
    await baueKontaktbogen(browser, VORLAGEN);
  } finally {
    await browser.close();
  }

  druckeTippzielTabelle(ergebnisse);

  // Für die spätere Abschlussmeldung als Textdatei sichern (gitignored,
  // tools/cache/ – kein Commit-Risiko).
  const tabellenText = ergebnisse
    .flatMap((e) => e.messung.map((m) => `${e.datei}\t${e.modus}\t${m.selektor}\t${m.anzahl}\t${m.minBreite ?? "-"}\t${m.minHoehe ?? "-"}\t${m.zuKlein}`))
    .join("\n");
  writeFileSync(path.join(ZIEL, "tippziele.tsv"), `datei\tmodus\tselektor\tanzahl\tminBreite\tminHoehe\tzuKlein\n${tabellenText}\n`, "utf8");

  console.log(`\nFertig. Screenshots + Kontaktbogen liegen in ${path.relative(ROOT, ZIEL)}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
