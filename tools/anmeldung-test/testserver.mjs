#!/usr/bin/env node
// Statischer Testserver für den Anmelde-Assistenten (nur Tests, nichts davon
// gehört in die Auslieferung).
//
// Liefert docs/ aus (Port 0 = freier Port, nie 4173). Alle Teile sind inzwischen echt:
//   regeln.js + data/anmeldung.json   (AP-1)      texte/de-regeln.js   (AP-1)
//   Formular-Daten + Vorlagen-PDF     (AP-2)      pdf.js               (AP-3)
//   texte/{en,tr,ar}-oberflaeche.js   (AP-5)
// Attrappen aus tools/anmeldung-test/attrappen/ gibt es nur noch per Schalter
// (ANM_ATTRAPPEN=pdf,ar,regeln,de-regeln,formulare). Fehlt eine echte Datei und
// ist keine Attrappe verlangt, bricht der Server mit einer klaren Meldung ab.
// Bei der echten pdf.js hängt der Server ein kleines Stück Aufzeichnung an (SPION
// unten; ausschaltbar mit starteTestserver({ spion: false })): So bleiben die
// Prüfungen, was der Assistent an erzeugePdf() übergibt und was zurückkommt,
// auch mit dem echten Baustein gültig.
//
// Test-Option hfv (starteTestserver({ hfv: "stift" }) oder ANM_HFV=stift): überschreibt den Schalter
// unterschriftHfv (data/anmeldung.json, Jugendleitung 11.10.2026) in der eingebetteten Konfiguration
// dieses Servers. So lässt sich der Modus „stift“ (Stand bis 11.10.2026) prüfen, ohne die Datei zu ändern.
//
// Zugang mit Code vom Probetraining (Paket P1, 12.10.2026): Die Prüfwerte in data/anmeldung.json › zugang gehören nicht zum Test. Der
// Server setzt sie in der eingebetteten Konfiguration selbst: Standard ist eine leere Liste (keine Code-Abfrage), so laufen alle Tests
// unabhängig davon, was im Repo steht (auch mit dem echten Prüfwert oder einem fremden). Die Tests zum Code schalten mit
// server.setzeZugang([...Prüfwerte]) um; server.testCode ist ein Zufallscode dieses Laufs, server.testPruefwert sein Prüfwert,
// server.fremderPruefwert ein Prüfwert, zu dem kein bekannter Code passt. Im ausgelieferten Code gibt es dafür keine Hintertür.
//
// Aufruf allein: node tools/anmeldung-test/testserver.mjs  (Adresse wird gezeigt)

import { createServer } from "node:http";
import { existsSync, readFileSync, readdirSync, statSync, cpSync, rmSync, mkdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { createHash, randomBytes } from "node:crypto";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const QUELLE_DOCS = path.join(ROOT, "docs");
const SCHNAPPSCHUSS = path.join(ROOT, "tools", "cache", "anmeldung-test", "docs-schnappschuss");
// Bedient wird eine Kopie von docs/ (Schnappschuss): Ein Bau, den ein anderes
// Paket gleichzeitig ausführt, schreibt docs/ neu und löscht dabei kurz Dateien.
let DOCS = QUELLE_DOCS;
const ATTRAPPEN = path.join(ROOT, "tools", "anmeldung-test", "attrappen");
const JS = "/assets/js/anmeldung/";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8",
};

const istDa = (pfad) => existsSync(path.join(DOCS, pfad));

// Liste aller Dateien mit Größe und Zeitstempel – zum Erkennen, ob docs/ sich beim Kopieren verändert hat.
function verzeichnisStand(ordner) {
  const zeilen = [];
  const gehe = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const voll = path.join(d, e.name);
      if (e.isDirectory()) gehe(voll);
      else {
        const i = statSync(voll);
        zeilen.push(path.relative(ordner, voll) + ":" + i.size + ":" + Math.round(i.mtimeMs));
      }
    }
  };
  gehe(ordner);
  return zeilen.sort().join("\n");
}

// Kopiert docs/ nach tools/cache/anmeldung-test/docs-schnappschuss und wiederholt
// das, bis docs/ währenddessen unverändert blieb.
export async function macheSchnappschuss() {
  for (let versuch = 0; versuch < 8; versuch++) {
    let vorher;
    try {
      vorher = verzeichnisStand(QUELLE_DOCS);
      rmSync(SCHNAPPSCHUSS, { recursive: true, force: true });
      mkdirSync(path.dirname(SCHNAPPSCHUSS), { recursive: true });
      cpSync(QUELLE_DOCS, SCHNAPPSCHUSS, { recursive: true });
      if (vorher === verzeichnisStand(QUELLE_DOCS) && existsSync(path.join(SCHNAPPSCHUSS, "anmeldung", "index.html"))) return SCHNAPPSCHUSS;
    } catch (e) {
      /* docs/ wird gerade neu gebaut – noch einmal */
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error("docs/ ändert sich ständig (läuft gerade ein Bau?) – bitte später noch einmal");
}

// Aufzeichnung der Aufrufe der ECHTEN pdf.js (Paket AP-3): Das Testprogramm hängt
// dieses Stück hinter die ausgelieferte Datei. Es ändert nichts am Ablauf, es merkt
// sich nur, was der Assistent an erzeugePdf() übergibt und was zurückkommt, und legt
// es unter window.__attrappePdf ab (derselbe Name und dieselbe Form wie bei der
// Attrappe, damit die Prüfungen in e2e.mjs für beide gelten).
// Ist erzeugePdf keine veränderbare Funktion, bleibt die Datei unverändert.
const SPION = `
;try {
  const __orig = erzeugePdf;
  const __png = (b) => [137, 80, 78, 71, 13, 10, 26, 10].every((x, i) => b[i] === x);
  const __ihdr = (b, ab) => { try { const d = new DataView(b.buffer, b.byteOffset, b.byteLength); return ab === 0 ? d.getUint32(16) : d.getUint32(20); } catch (e) { return 0; } };
  erzeugePdf = async function (opts) {
    const b = opts.bilder || {};
    window.__attrappePdf = {
      spion: true,
      vorlagen: Object.fromEntries(Object.entries(opts.vorlagen || {}).map(([k, v]) => [k, v.length])),
      schriftBytes: opts.schrift ? opts.schrift.length : 0,
      hatFontkit: !!opts.fontkit,
      a: JSON.parse(JSON.stringify(opts.a)),
      formulare: opts.e && opts.e.formulare,
      unterschriften: Object.fromEntries(Object.entries(b.unterschriften || {}).map(([k, u]) => [k, { bytes: u.bytes.length, png: __png(u.bytes), breitePx: u.breitePx, hoehePx: u.hoehePx, pixelBreite: __ihdr(u.bytes, 0), pixelHoehe: __ihdr(u.bytes, 1) }])),
      nachweise: Object.fromEntries(Object.entries(b.nachweise || {}).map(([k, l]) => [k, l.map((x) => ({ typ: x.typ, bytes: x.bytes.length, name: x.name }))])),
      spielerfoto: b.spielerfoto ? { typ: b.spielerfoto.typ, bytes: b.spielerfoto.bytes.length } : null,
    };
    const r = await __orig(opts);
    window.__attrappePdf.ergebnis = { seiten: r.seiten, teile: r.teile, dateiname: r.dateiname };
    return r;
  };
} catch (e) { /* kein Spion möglich */ }
`;

export async function starteTestserver(optionen) {
  const o = optionen || {};
  // Standard: mit Schnappschuss. Ohne (schnappschuss: false) direkt aus docs/.
  DOCS = o.schnappschuss === false || process.env.ANM_QUELLE === "assets" ? QUELLE_DOCS : await macheSchnappschuss();
  const require = createRequire(import.meta.url);
  const PDFLib = require(path.join(ROOT, "node_modules", "pdf-lib"));
  const daten = await import(pathToFileURL(path.join(ATTRAPPEN, "daten.mjs")).href);

  // Was ist schon echt?
  const seite = readFileSync(path.join(DOCS, "anmeldung", "index.html"), "utf8");
  const treffer = /<script type="application\/json" id="anmeldung-konfig">([\s\S]*?)<\/script>/.exec(seite);
  if (!treffer) throw new Error("docs/anmeldung/index.html enthält keine Konfiguration – zuerst bauen (sh tools/cache/bau-sperre.sh build)");
  const konfig = JSON.parse(treffer[1]);
  const reich = (x) => x && typeof x === "object" && Object.keys(x).length > 0;
  // Attrappen gibt es nur noch per Schalter: ANM_ATTRAPPEN=pdf,ar (oder
  // starteTestserver({ attrappen: ["pdf"] })). Namen: regeln, de-regeln, pdf,
  // formulare, ar. Wer eine Attrappe verlangt, bekommt sie auch dann, wenn die echte
  // Datei da ist (zum Vergleichen). Fehlt eine echte Datei und ist ihre Attrappe nicht
  // verlangt, bricht der Server ab, statt still etwas anderes zu testen.
  const verlangt = new Set([...(o.attrappen || []), ...String(process.env.ANM_ATTRAPPEN || "").split(",")].map((x) => String(x).trim()).filter(Boolean));
  const echt = {
    regeln: istDa(JS.slice(1) + "regeln.js") && reich(konfig.anmeldung),
    "de-regeln": istDa(JS.slice(1) + "texte/de-regeln.js"),
    pdf: istDa(JS.slice(1) + "pdf.js"),
    formulare: reich(konfig.formulare) && reich(konfig.formulare.formulare) && Object.values(konfig.formulare.formulare).every((f) => !f.datei || istDa(f.datei)),
    ar: istDa(JS.slice(1) + "texte/ar-oberflaeche.js"),
  };
  const fehlend = Object.keys(echt).filter((name) => !echt[name] && !verlangt.has(name));
  if (fehlend.length) {
    throw new Error("Echte Datei fehlt in docs/: " + fehlend.join(", ") + ". Zuerst bauen (sh tools/cache/bau-sperre.sh build). Eine Attrappe gibt es nur mit ANM_ATTRAPPEN=" + fehlend.join(",") + ".");
  }
  const status = {
    regeln: echt.regeln && !verlangt.has("regeln"),
    deRegeln: echt["de-regeln"] && !verlangt.has("de-regeln"),
    pdf: echt.pdf && !verlangt.has("pdf"),
    formulare: echt.formulare && !verlangt.has("formulare"),
    en: istDa(JS.slice(1) + "texte/en-oberflaeche.js"),
    ar: echt.ar && !verlangt.has("ar"),
  };
  const erzwungen = verlangt;

  // Attrappen bereitstellen (nur die verlangten)
  const vorlagen = await daten.baueVorlagen(PDFLib);
  const attrappen = new Map(); // URL-Pfad -> { datei | inhalt, typ }
  const datei = (name) => ({ datei: path.join(ATTRAPPEN, name), typ: MIME[".js"] });
  if (!status.regeln) attrappen.set(JS + "regeln.js", datei("regeln.js"));
  if (!status.deRegeln) attrappen.set(JS + "texte/de-regeln.js", datei("de-regeln.js"));
  if (!status.pdf) attrappen.set(JS + "pdf.js", datei("pdf.js"));
  if (!status.ar) attrappen.set(JS + "texte/ar-oberflaeche.js", datei("ar-oberflaeche.js"));
  const neueKonfig = JSON.parse(JSON.stringify(konfig));
  if (!status.regeln) neueKonfig.anmeldung = daten.baueAnmeldung();
  if (!status.formulare) {
    neueKonfig.formulare = daten.baueFormulare(vorlagen);
    for (const [schluessel, v] of Object.entries(vorlagen)) {
      attrappen.set("/" + neueKonfig.formulare.formulare[schluessel].datei, { inhalt: v.bytes, typ: MIME[".pdf"] });
    }
  }
  const hfv = o.hfv || process.env.ANM_HFV || "";
  if (hfv) {
    if (!["bildschirm", "stift"].includes(hfv)) throw new Error('Test-Option hfv: "bildschirm" oder "stift", nicht "' + hfv + '"');
    neueKonfig.anmeldung = neueKonfig.anmeldung || {};
    neueKonfig.anmeldung.unterschriftHfv = Object.assign({}, neueKonfig.anmeldung.unterschriftHfv, { wert: hfv });
  }
  // Zugang (P1): Prüfwerte nur aus dem Test, nie aus data/anmeldung.json. Der Zufallscode dieses Laufs besteht nur aus A–Z, 0–9 und "-"
  // (so ist sein Prüfwert unabhängig vom Code des Assistenten zu rechnen).
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const zufallsTeil = () => Array.from(randomBytes(4), (b) => alphabet[b % alphabet.length]).join("");
  const testCode = o.testCode || "TEST-" + zufallsTeil() + "-" + zufallsTeil();
  const sha = (text) => createHash("sha256").update(text, "utf8").digest("hex");
  const testPruefwert = sha(testCode.replace(/[\s-]/g, "").toUpperCase());
  const fremderPruefwert = sha("FREMD-" + zufallsTeil() + zufallsTeil() + zufallsTeil());
  let zugangListe = Array.isArray(o.zugang) ? o.zugang.slice() : [];
  const seiteMitZugang = () => {
    const k = JSON.parse(JSON.stringify(neueKonfig));
    k.anmeldung = k.anmeldung || {};
    k.anmeldung.zugang = { parameter: "code", pruefwerte: zugangListe.slice() };
    const json = JSON.stringify(k).replace(/</g, "\\u003c");
    return seite.replace(treffer[1], () => json);
  };

  const gesperrt = new Set(o.gesperrt || []);
  const anfragen = [];

  const server = createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    const pfad = decodeURIComponent(url.pathname);
    anfragen.push(pfad);
    if (gesperrt.has(pfad)) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("gesperrt");
      return;
    }
    if (pfad === "/anmeldung/" || pfad === "/anmeldung/index.html") {
      res.writeHead(200, { "Content-Type": MIME[".html"], "Cache-Control": "no-store" });
      res.end(seiteMitZugang());
      return;
    }
    // Nur zum Entwickeln (ANM_QUELLE=assets): Dateien unter /assets/ direkt aus
    // dem Arbeitsordner, ohne vorher zu bauen. Der eigentliche Testlauf nimmt docs/.
    const vorrang = attrappen.get(pfad);
    if (vorrang && (pfad === JS + "regeln.js" ? erzwungen.has("regeln") : pfad === JS + "texte/de-regeln.js" ? erzwungen.has("de-regeln") : pfad === JS + "pdf.js" ? erzwungen.has("pdf") : pfad === JS + "texte/ar-oberflaeche.js" ? erzwungen.has("ar") : false)) {
      res.writeHead(200, { "Content-Type": vorrang.typ, "Cache-Control": "no-store" });
      res.end(vorrang.inhalt || (await readFile(vorrang.datei)));
      return;
    }
    let echt = path.join(DOCS, pfad);
    if (process.env.ANM_QUELLE === "assets" && pfad.startsWith("/assets/") && existsSync(path.join(ROOT, pfad))) echt = path.join(ROOT, pfad);
    if ((echt.startsWith(DOCS) || echt.startsWith(path.join(ROOT, "assets"))) && existsSync(echt) && !echt.endsWith(path.sep)) {
      try {
        let inhalt = await readFile(echt.endsWith("/") ? path.join(echt, "index.html") : echt);
        if (pfad === JS + "pdf.js" && o.spion !== false) inhalt = Buffer.concat([inhalt, Buffer.from(SPION)]);
        res.writeHead(200, { "Content-Type": MIME[path.extname(echt)] || "application/octet-stream", "Cache-Control": "no-store" });
        res.end(inhalt);
        return;
      } catch (e) {
        /* Verzeichnis: weiter zu 404 */
      }
    }
    const a = attrappen.get(pfad);
    if (a) {
      const inhalt = a.inhalt || (await readFile(a.datei));
      res.writeHead(200, { "Content-Type": a.typ, "Cache-Control": "no-store" });
      res.end(inhalt);
      return;
    }
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("nicht gefunden: " + pfad);
  });

  await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
  const port = server.address().port;
  return {
    port,
    basis: "http://127.0.0.1:" + port,
    status,
    hfv: neueKonfig.anmeldung && neueKonfig.anmeldung.unterschriftHfv ? neueKonfig.anmeldung.unterschriftHfv.wert : null,
    konfig: neueKonfig,
    anfragen,
    testCode,
    testPruefwert,
    fremderPruefwert,
    setzeZugang: (liste) => {
      zugangListe = Array.isArray(liste) ? liste.slice() : [];
    },
    sperre: (pfad) => gesperrt.add(pfad),
    freigabe: (pfad) => gesperrt.delete(pfad),
    stop: () => new Promise((ok) => server.close(ok)),
    attrappen: Array.from(attrappen.keys()),
  };
}

// Allein aufgerufen: Server laufen lassen.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const s = await starteTestserver();
  console.log("Testserver: " + s.basis + "/anmeldung/");
  console.log("Echt: " + JSON.stringify(s.status));
  console.log("Attrappen: " + s.attrappen.join(", "));
}
