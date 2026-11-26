// Statischer Testserver für die Bestellseite (nur Tests, nichts davon gehört in die Auslieferung).
//
// Bedient wird eine Kopie der Dateien, die die Seite braucht (Schnappschuss unter tools/cache/bestellung-test/site/), nicht
// docs/ selbst: Ein Bau, den jemand gleichzeitig ausführt, löscht docs/assets kurz und würde den Test stören. Der Schnappschuss kommt aus
// docs/ des Arbeitsordners oder aus einem anderen docs-Ordner (der Browser-Test baut mit Testpreisen in einem Wegwerf-Ordner).
// Port 0 = freier Port (nie 4173). Es werden nur diese Pfade ausgeliefert: ws/bestellung.html und assets/{css,fonts,logo,js/bestellung,bilder/bestellung}.
// Alles andere ist 404; die Anfragen werden mitgezählt (server.anfragen), damit der Test sieht, ob die Seite etwas Unerwartetes lädt.
// Die Seite ist auch unter /speuzer-website-prototyp/ws/bestellung.html erreichbar (server.seiteImUnterordner): So liegt sie auf GitHub Pages. Der Test
// prüft damit, dass CSS, Skripte und Produktbilder auch aus einem Unterordner geladen werden (die Adressen dürfen nicht an der Wurzel hängen).
//
// Aufruf allein: node tools/bestellung-test/testserver.mjs  (Adresse wird gezeigt)

import { createServer } from "node:http";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const DOCS = path.join(ROOT, "docs");
export const SCHNAPPSCHUSS = path.join(ROOT, "tools", "cache", "bestellung-test", "site");

const KOPIEREN = [
  ["ws/bestellung.html", "ws/bestellung.html"],
  ["assets/css", "assets/css"],
  ["assets/fonts", "assets/fonts"],
  ["assets/logo", "assets/logo"],
  ["assets/js/bestellung", "assets/js/bestellung"],
  ["assets/bilder/bestellung", "assets/bilder/bestellung"],
];

// Der Ordner, unter dem die Seite auf GitHub Pages liegt (https://justolgay.github.io/speuzer-website-prototyp/ws/bestellung.html)
export const UNTERORDNER = "/speuzer-website-prototyp";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};

function warte(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Kopiert die nötigen Teile von docs/ und wiederholt das, falls docs/ gerade neu gebaut wird.
export async function macheSchnappschuss(docs = DOCS) {
  if (!existsSync(path.join(docs, "ws", "bestellung.html"))) {
    throw new Error(`${path.relative(ROOT, docs)}/ws/bestellung.html fehlt – zuerst bauen: npm run build`);
  }
  for (let versuch = 0; versuch < 8; versuch++) {
    try {
      rmSync(SCHNAPPSCHUSS, { recursive: true, force: true });
      for (const [von, nach] of KOPIEREN) {
        mkdirSync(path.dirname(path.join(SCHNAPPSCHUSS, nach)), { recursive: true });
        cpSync(path.join(docs, von), path.join(SCHNAPPSCHUSS, nach), { recursive: true });
      }
      if (existsSync(path.join(SCHNAPPSCHUSS, "assets", "js", "bestellung", "seite.js"))) return SCHNAPPSCHUSS;
    } catch (e) {
      /* docs/ wird gerade neu gebaut – noch einmal */
    }
    await warte(1500);
  }
  throw new Error("docs/ ändert sich ständig (läuft gerade ein Bau?) – bitte später noch einmal");
}

export async function starteTestserver(docs = DOCS) {
  const wurzel = await macheSchnappschuss(docs);
  const anfragen = [];
  const server = createServer((req, res) => {
    const pfad = decodeURIComponent((req.url || "/").split("?")[0]);
    anfragen.push(pfad);
    // Unter dem Unterordner liegt dieselbe Ablage wie an der Wurzel (wie GitHub Pages); der Ordner selbst wird abgeschnitten
    const ziel = path.join(wurzel, pfad.startsWith(UNTERORDNER + "/") ? pfad.slice(UNTERORDNER.length) : pfad);
    if (!ziel.startsWith(wurzel) || !existsSync(ziel) || statSync(ziel).isDirectory()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Nicht gefunden");
      return;
    }
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(ziel).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(readFileSync(ziel));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const basis = `http://127.0.0.1:${server.address().port}`;
  return {
    basis,
    seite: basis + "/ws/bestellung.html",
    seiteImUnterordner: basis + UNTERORDNER + "/ws/bestellung.html",
    wurzel,
    anfragen,
    schliessen: () => new Promise((resolve) => server.close(resolve)),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const s = await starteTestserver();
  console.log("Testserver läuft: " + s.seite + "  (Strg+C beendet)");
}
