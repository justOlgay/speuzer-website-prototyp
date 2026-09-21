#!/usr/bin/env node
// Speuzer Website Prototyp – Gate für das appack-Upload-Paket (W1)
// Startet einen Mini-Static-Server auf dist/appack-paket/web/ (site.css und
// die 37 Seiten liegen dort im selben Ordner, wie im appack-Workspace) und
// öffnet jede Seite mit puppeteer-core bei 390px und 1440px. Zählt
// pageerror, fehlgeschlagene Requests (requestfailed und HTTP >= 400) –
// einschließlich der absoluten GitHub-Pages-Adressen, also echte
// Netzverbindung, keine Interception/Mocks. Prüft
// document.fonts.check("600 16px 'Barlow Condensed'") nach
// document.fonts.ready sowie scrollWidth === innerWidth.
// Hinweis: cdn.appack.de ist im lokalen Test nicht im Spiel (das Paket wird
// nicht hochgeladen) – site.css kommt aus dem Paketordner selbst, exakt wie
// die Seiten es nach dem Umschreiben (href="site.css") erwarten.
// W2: fehlgeschlagene Requests und HTTP-Fehler (>= 400) von fussball.de-
// Adressen (die FUSSBALL.DE-Widgets sind dort nur für cdn.appack.de
// freigegeben, siehe LIESMICH) sind erwartet und zählen nicht als Fehler –
// siehe istFussballdeAdresse() unten. Alles andere bleibt ein echter Fehler.

import puppeteer from "puppeteer-core";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WEB_DIR = path.join(ROOT, "dist", "appack-paket", "web");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 4174; // eigener Port, unabhängig von tools/server.mjs (4173)
const BASIS = `http://localhost:${PORT}`;
const BREITEN = [390, 1440];
const SCHRIFT_PROBE = "600 16px 'Barlow Condensed'";

// ---------- Mini-Static-Server (Muster: tools/server.mjs, aber auf
// dist/appack-paket/web/ statt docs/ verwurzelt) ----------

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

function mimeFuer(dateiPfad) {
  const ext = path.extname(dateiPfad).toLowerCase();
  return MIME[ext] ?? "application/octet-stream";
}

async function loese(urlPfad) {
  const ziel = path.join(WEB_DIR, decodeURIComponent(urlPfad.split("?")[0]));
  if (!ziel.startsWith(WEB_DIR)) return null; // Pfadausbruch verhindern
  try {
    const info = await stat(ziel);
    if (info.isDirectory()) return null;
    return ziel;
  } catch {
    return null;
  }
}

function warte(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function starteMiniServer() {
  const server = createServer(async (req, res) => {
    const gefunden = await loese(req.url ?? "/");
    if (!gefunden) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Nicht gefunden");
      return;
    }
    try {
      const inhalt = await readFile(gefunden);
      res.writeHead(200, { "Content-Type": mimeFuer(gefunden) });
      res.end(inhalt);
    } catch (err) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Serverfehler: " + err.message);
    }
  });
  return new Promise((resolve) => {
    server.listen(PORT, () => resolve(server));
  });
}

// ---------- Prüfung je Seite und Breite ----------

// W2: die FUSSBALL.DE-Widgets sind bei FUSSBALL.DE nur für die Domain
// cdn.appack.de freigegeben (siehe LIESMICH). Lokal (dieser Mini-Server) und
// auf GitHub Pages liefert fussball.de deshalb eine Fehlermeldung bzw.
// HTTP-Fehler für seine Adressen (www.fussball.de/widgets.js,
// next.fussball.de/widget/…) – das ist erwartet (Domain-Freigabe) und kein
// Seitenfehler. Alle anderen Fehler (auch von justolgay.github.io, dem
// Spielplan-Generator) bleiben echte Fehler.
function istFussballdeAdresse(url) {
  try {
    const host = new URL(url).hostname;
    return host === "fussball.de" || host.endsWith(".fussball.de");
  } catch {
    return false;
  }
}

async function pruefeSeiteBeiBreite(browser, dateiname, breite) {
  const page = await browser.newPage();
  const fehler = [];
  const erwartet = [];

  page.on("pageerror", (err) => fehler.push(`pageerror: ${err.message}`));
  page.on("requestfailed", (req) => {
    const eintrag = `requestfailed: ${req.url()} (${req.failure()?.errorText ?? "unbekannt"})`;
    if (istFussballdeAdresse(req.url())) {
      erwartet.push(`erwartet (Domain-Freigabe): ${eintrag}`);
    } else {
      fehler.push(eintrag);
    }
  });
  page.on("response", (resp) => {
    if (resp.status() >= 400) {
      const eintrag = `HTTP ${resp.status()}: ${resp.url()}`;
      if (istFussballdeAdresse(resp.url())) {
        erwartet.push(`erwartet (Domain-Freigabe): ${eintrag}`);
      } else {
        fehler.push(eintrag);
      }
    }
  });

  await page.setViewport({ width: breite, height: 900 });
  try {
    await page.goto(`${BASIS}/${dateiname}`, { waitUntil: "networkidle0", timeout: 30000 });
  } catch (err) {
    fehler.push(`goto fehlgeschlagen: ${err.message}`);
  }

  try {
    // document.fonts.ready allein löst nur Schriften aus, die die Seite beim
    // Rendern tatsächlich braucht (z. B. keine Barlow-Condensed-Überschrift
    // auf dieser Seite) – document.fonts.load() erzwingt den Abruf, damit die
    // Prüfung tatsächlich testet, ob die (auf GitHub-Pages-Adressen
    // umgeschriebene) Schriftdatei noch ladbar ist, unabhängig davon, ob ein
    // Element auf der Seite sie im Moment der Messung schon verwendet.
    const ergebnis = await page.evaluate(async (probe) => {
      try {
        await document.fonts.load(probe);
      } catch (err) {
        return { ok: false, fehler: err.message };
      }
      await document.fonts.ready;
      return { ok: document.fonts.check(probe), fehler: null };
    }, SCHRIFT_PROBE);
    if (ergebnis.fehler) {
      fehler.push(`document.fonts.load("${SCHRIFT_PROBE}") fehlgeschlagen: ${ergebnis.fehler}`);
    } else if (!ergebnis.ok) {
      fehler.push(`Schrift nicht geladen: document.fonts.check("${SCHRIFT_PROBE}") === false`);
    }
  } catch (err) {
    fehler.push(`document.fonts-Prüfung fehlgeschlagen: ${err.message}`);
  }

  const scroll = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  if (scroll.scrollWidth !== scroll.innerWidth) {
    fehler.push(
      `scrollWidth (${scroll.scrollWidth}) !== innerWidth (${scroll.innerWidth}) bei ${breite}px`
    );
  }

  await page.close();
  return { fehler, erwartet };
}

// ---------- Hauptablauf ----------

async function main() {
  if (!existsSync(WEB_DIR)) {
    console.error(`${WEB_DIR} nicht gefunden – zuerst 'npm run appack-paket' ausführen.`);
    process.exit(1);
  }
  const seiten = readdirSync(WEB_DIR).filter((d) => d.endsWith(".html")).sort();
  if (seiten.length !== 37) {
    console.error(`Erwartet 37 Seiten in dist/appack-paket/web/, gefunden ${seiten.length}.`);
    process.exit(1);
  }

  const server = await starteMiniServer();
  console.log(`Mini-Server läuft: ${BASIS}/  (Quelle: dist/appack-paket/web/)`);

  let allesOk = true;
  const bericht = [];

  try {
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
    try {
      for (const dateiname of seiten) {
        const fehlerJeSeite = [];
        const erwartetJeSeite = [];
        for (const breite of BREITEN) {
          const { fehler, erwartet } = await pruefeSeiteBeiBreite(browser, dateiname, breite);
          for (const f of fehler) fehlerJeSeite.push(`${breite}px: ${f}`);
          for (const e of erwartet) erwartetJeSeite.push(`${breite}px: ${e}`);
        }
        const bestanden = fehlerJeSeite.length === 0;
        if (!bestanden) allesOk = false;
        bericht.push({ seite: dateiname, bestanden, fehler: fehlerJeSeite, erwartet: erwartetJeSeite });
        console.log(`${bestanden ? "OK  " : "FEHLER"} ${dateiname} (${fehlerJeSeite.length} Fehler, ${erwartetJeSeite.length} erwartet/Domain-Freigabe)`);
        for (const f of fehlerJeSeite) console.log(`  - ${f}`);
        for (const e of erwartetJeSeite) console.log(`  · ${e}`);
      }
    } finally {
      await browser.close();
    }
  } finally {
    server.close();
  }

  console.log("\n=== Zusammenfassung ===");
  const bestandene = bericht.filter((b) => b.bestanden).length;
  console.log(`${bestandene}/${bericht.length} Seiten ohne Fehler (je ${BREITEN.join("px und ")}px).`);
  if (!allesOk) {
    console.error("\nappack-paket-pruefen.mjs: FEHLGESCHLAGEN");
    process.exit(1);
  } else {
    console.log("\nappack-paket-pruefen.mjs: alle Gates bestanden.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
