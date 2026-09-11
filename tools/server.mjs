#!/usr/bin/env node
// Kleiner statischer Server für docs/ – ohne Abhängigkeiten.
// Port 4173. Wird von pruefen.mjs selbst gestartet, kann aber auch
// eigenständig über `npm run serve` laufen.

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DOCS = path.join(ROOT, "docs");
const PORT = 4173;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".ics": "text/calendar; charset=utf-8",
  ".pdf": "application/pdf",
  ".webmanifest": "application/manifest+json",
};

function mimeFuer(dateiPfad) {
  const ext = path.extname(dateiPfad).toLowerCase();
  return MIME[ext] ?? "application/octet-stream";
}

async function loese(urlPfad) {
  let ziel = path.join(DOCS, decodeURIComponent(urlPfad.split("?")[0]));
  if (!ziel.startsWith(DOCS)) return null; // Pfadausbruch verhindern

  try {
    let info = await stat(ziel);
    if (info.isDirectory()) {
      ziel = path.join(ziel, "index.html");
      info = await stat(ziel);
    }
    return ziel;
  } catch {
    return null;
  }
}

const server = createServer(async (req, res) => {
  const gefunden = await loese(req.url ?? "/");
  if (!gefunden) {
    try {
      const seite404 = await readFile(path.join(DOCS, "404.html"));
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      res.end(seite404);
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Nicht gefunden");
    }
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

server.listen(PORT, () => {
  console.log(`Server läuft: http://localhost:${PORT}/  (Quelle: docs/)`);
});
