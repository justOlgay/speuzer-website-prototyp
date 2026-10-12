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
// siehe istDomainFreigabeAdresse() unten. Alles andere bleibt ein echter Fehler.
//
// Livegang des Anmelde-Assistenten (M6): Enthält das Paket die Seite anmeldung.html (Bau mit ANMELDUNG_LIVE, siehe
// src/vorlagen/hilfen.mjs), kommen Prüfungen für den Assistenten dazu (pruefeAnmeldungDateien, pruefeAnmeldungImBrowser,
// pruefeMitgliedWerden): jede Datei, auf die etwas verweist, liegt im Paket und umgekehrt jede anmeldung*-Datei wird
// gebraucht; Namen für das CMS (Kleinbuchstaben, Ziffern, Bindestriche, genau ein Punkt, nur .html/.css/.js); Größe je
// Datei höchstens 800 000 Byte (bewährt: aufnahmeantrag-fontkit.js mit 760 110 Byte); node --check (als ES-Modul) für jedes Modul;
// keine Wörter wie Prototyp, Entwurf, Vorführung, justolgay, github; keine fremden Hosts außer cdn.appack.de und
// hfv-online.de (Quellenangaben der Vordrucke), dazu die gemeinsamen Adressen im Kopf jeder Seite; die Seite startet
// (#anmeldung[data-bereit]) ohne Fehler in der Konsole, mit der Sprachwahl aus der Konfiguration und ohne Begleitrahmen,
// Entwurfs-Band, Werkzeugkasten und noindex. Ohne anmeldung.html muss das Paket auch ohne Verweise darauf sein. Für eine
// Kopie des Ordners web/ (zum Beispiel einen Schnappschuss) gibt PAKET_WEB_DIR den Ort an; --statisch lässt den Browser weg.

import puppeteer from "puppeteer-core";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { spawnSync } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ANMELDUNG_LIVE } from "../src/vorlagen/hilfen.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WEB_DIR = process.env.PAKET_WEB_DIR ? path.resolve(process.env.PAKET_WEB_DIR) : path.join(ROOT, "dist", "appack-paket", "web");
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

// ---------- Anmelde-Assistent im Paket (Livegang, M6) ----------

const MIT_ANMELDUNG = existsSync(path.join(WEB_DIR, "anmeldung.html"));
const ANM_GROESSE_MAX = 800 * 1000; // bewährt im CMS: aufnahmeantrag-fontkit.js mit 760 110 Byte
const ANM_NAME_MUSTER = /^[a-z0-9]+(?:-[a-z0-9]+)*\.(?:html|css|js)$/;
// Groß geschrieben wie im sichtbaren Text; Namen im Code (entwurf, vorfuehrung, Array.prototype) treffen nicht.
const ANM_VERBOTEN = /Prototyp|Entwurf|Entw\u00fcrfe|Vorf\u00fchr|Vorfuehr|justolgay|github/;
// Fremdsprachige Textmodule: dieselben Begriffe in ihrer Sprache (die Module enthalten nur Text, "prototype" als Code gibt es dort nicht).
const ANM_VERBOTEN_SPRACHE = { en: /\b(?:draft|prototype)\b/i, tr: /taslak|prototip/i, ar: /\u0645\u0633\u0648\u062f\u0629/ };
// Pflichtausnahmen in pdf.js: Der Vermerk steht dort als Zeichenkette, die nur mit opts.entwurf = true gezeichnet wird (die Live-Fassung
// gibt false, siehe pdf-lader.js; tools/anmeldung-test/e2e-paket.mjs prüft den PDF-Text und hat eine Gegenprobe mit true).
const ANM_AUSNAHMEN = {
  "anmeldung-pdf.js": [
    "Entwurf \u2013 vom Vorstand zu pr\u00fcfen",
    "sind Entw\u00fcrfe. Der Vorstand gibt die Texte frei (Fu\u00dfzeile \u201eEntwurf\u201c).",
  ],
};
const ANM_ERLAUBTE_HOSTS = ["cdn.appack.de", "hfv-online.de", "www.hfv-online.de"];
// Adressen im Kopf jeder Seite des Pakets (Favicon, Schriften, Bild für die Vorschau): GitHub Pages, nur unter assets/.
const ANM_GEMEINSAME_ADRESSE = /https:\/\/justolgay\.github\.io\/speuzer-website-prototyp\/assets\/[^"'\s)]+/g;

function leseKonfigAnmeldung() {
  const html = readFileSync(path.join(WEB_DIR, "anmeldung.html"), "utf8");
  const treffer = /<script type="application\/json" id="anmeldung-konfig">([\s\S]*?)<\/script>/.exec(html);
  if (!treffer) return null;
  try {
    return JSON.parse(treffer[1]);
  } catch {
    return null;
  }
}

// Statische Prüfungen der Dateien des Assistenten. Gibt die Fehler als Liste zurück und druckt je Prüfung eine Zeile.
function pruefeAnmeldungDateien() {
  const fehler = [];
  const melde = (name, ok, detail) => {
    console.log(`${ok ? "OK  " : "FEHLER"} ${name}${detail ? " – " + detail : ""}`);
    if (!ok) fehler.push(name + (detail ? ": " + detail : ""));
  };
  const namen = readdirSync(WEB_DIR).filter((n) => /^anmeldung[.-]/.test(n)).sort();
  const lies = (n) => readFileSync(path.join(WEB_DIR, n), "utf8");
  const konfig = leseKonfigAnmeldung();
  melde("anmeldung.html: Konfiguration lesbar, live = true, Sprachen mit Deutsch zuerst, Quellen für Schrift und Vordrucke", !!konfig && konfig.live === true && Array.isArray(konfig.sprachen) && konfig.sprachen[0] === "de" && !!konfig.quellen && !!konfig.quellen.schriftModul && !!konfig.quellen.vorlagenModule, konfig ? JSON.stringify(konfig.sprachen) : "nicht lesbar");
  if (!konfig) return fehler;
  melde("anmeldung.html: Konfiguration ohne das Kapitel offenePunkte (interne Fragen an den Vorstand)", !("offenePunkte" in (konfig.anmeldung || {})));

  // 1. Namen und Größe
  const schlechteNamen = namen.filter((n) => !ANM_NAME_MUSTER.test(n));
  melde(`${namen.length} Dateien des Assistenten: Namen für das CMS (Kleinbuchstaben, Ziffern, Bindestriche, genau ein Punkt, .html/.css/.js)`, schlechteNamen.length === 0, schlechteNamen.join(", "));
  const zuGross = namen.filter((n) => statSync(path.join(WEB_DIR, n)).size > ANM_GROESSE_MAX || statSync(path.join(WEB_DIR, n)).size === 0);
  const groessen = namen.map((n) => [n, statSync(path.join(WEB_DIR, n)).size]).sort((a, b) => b[1] - a[1]);
  melde(`Größe je Datei höchstens ${ANM_GROESSE_MAX} Byte`, zuGross.length === 0, `größte: ${groessen.slice(0, 3).map(([n, g]) => n + " " + g).join(", ")}; zusammen ${groessen.reduce((a, [, g]) => a + g, 0)} Byte`);

  // 2. Syntax jedes Moduls
  // Über stdin als ES-Modul: Das Ergebnis hängt nicht vom Ordner ab (außerhalb eines Pakets mit "type": "module" prüft
  // node --check eine .js-Datei nicht verlässlich).
  const syntax = namen
    .filter((n) => n.endsWith(".js"))
    .filter((n) => spawnSync(process.execPath, ["--input-type=module", "--check"], { input: readFileSync(path.join(WEB_DIR, n)), encoding: "utf8" }).status !== 0);
  melde("node --check (als ES-Modul) für jedes Modul", syntax.length === 0, syntax.join(", "));

  // 3. Verweise: alles, worauf etwas zeigt, liegt im Paket; jede Datei wird gebraucht
  const fehlen = [];
  const erreichbar = new Set(["anmeldung.html"]);
  const html = lies("anmeldung.html");
  for (const m of html.matchAll(/(?:href|src)="([^"#?]+)"/g)) {
    if (/^(?:https?:|mailto:|tel:|data:|ext:|nav:|\/)/.test(m[1])) continue;
    if (!existsSync(path.join(WEB_DIR, m[1]))) fehlen.push(`anmeldung.html -> ${m[1]}`);
    erreichbar.add(m[1]);
  }
  const warteschlange = ["anmeldung-assistent.js"];
  for (const q of [konfig.quellen.pdfLib, konfig.quellen.fontkit, konfig.quellen.schriftModul, ...Object.values(konfig.quellen.vorlagenModule)]) {
    if (!q || !existsSync(path.join(WEB_DIR, q))) fehlen.push(`konfig.quellen -> ${q}`);
    else if (q.startsWith("anmeldung-")) warteschlange.push(q);
  }
  let schablonenImport = false;
  while (warteschlange.length) {
    const n = warteschlange.shift();
    if (erreichbar.has(n) && n !== "anmeldung-assistent.js") continue;
    erreichbar.add(n);
    if (!n.endsWith(".js") || !existsSync(path.join(WEB_DIR, n)) || /^anmeldung-(?:schrift|vorlage-)/.test(n)) continue;
    const code = lies(n);
    for (const m of code.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(["'`])\.\/([^"'`\n$]+)\1/g)) {
      if (!existsSync(path.join(WEB_DIR, m[2]))) fehlen.push(`${n} -> ./${m[2]}`);
      else if (!erreichbar.has(m[2])) warteschlange.push(m[2]);
    }
    if (/import\(`\.\/anmeldung-texte-\$\{[^}]+\}-(?:oberflaeche|regeln)\.js`\)/.test(code)) {
      schablonenImport = true;
      for (const sprache of konfig.sprachen) {
        for (const art of ["oberflaeche", "regeln"]) {
          const t = `anmeldung-texte-${sprache}-${art}.js`;
          if (!existsSync(path.join(WEB_DIR, t))) fehlen.push(`${n} -> ${t} (Sprache ${sprache})`);
          else if (!erreichbar.has(t)) warteschlange.push(t);
        }
      }
    }
  }
  melde("jede referenzierte Datei liegt im Paket (Seite, Importe, Textmodule je Sprache, Quellen in der Konfiguration)", fehlen.length === 0 && schablonenImport, fehlen.join("; ") || (schablonenImport ? "" : "kein Import der Textmodule gefunden"));
  const verwaist = namen.filter((n) => !erreichbar.has(n));
  melde("jede Datei des Assistenten wird gebraucht (keine verwaisten, zum Beispiel Texte einer nicht freigegebenen Sprache)", verwaist.length === 0, verwaist.join(", "));
  const fremdeSprachen = namen.filter((n) => { const m = /^anmeldung-texte-([a-z]{2})-/.exec(n); return m && !konfig.sprachen.includes(m[1]); });
  melde(`Texte nur für die Live-Sprachen (${konfig.sprachen.join(", ")})`, fremdeSprachen.length === 0, fremdeSprachen.join(", "));
  melde("pdf-lib und fontkit (aufnahmeantrag-pdf-lib.js, aufnahmeantrag-fontkit.js) liegen im Ordner", ["aufnahmeantrag-pdf-lib.js", "aufnahmeantrag-fontkit.js"].every((n) => existsSync(path.join(WEB_DIR, n))));

  // 4. verbotene Wörter
  const treffer = [];
  for (const n of namen) {
    let text = lies(n);
    if (/^anmeldung-(?:schrift|vorlage-)/.test(n)) text = text.slice(0, Math.max(0, text.indexOf("export default")));
    if (n === "anmeldung.html") text = text.replace(ANM_GEMEINSAME_ADRESSE, "");
    for (const ausnahme of ANM_AUSNAHMEN[n] || []) text = text.split(ausnahme).join("");
    const w = text.match(ANM_VERBOTEN);
    if (w) treffer.push(`${n}: „${w[0]}“ …${text.slice(Math.max(0, w.index - 30), w.index + 40).replace(/\s+/g, " ")}…`);
    const sprache = /^anmeldung-texte-([a-z]{2})-/.exec(n);
    const sw = sprache && ANM_VERBOTEN_SPRACHE[sprache[1]] && text.match(ANM_VERBOTEN_SPRACHE[sprache[1]]);
    if (sw) treffer.push(`${n}: „${sw[0]}“`);
  }
  melde("keine Wörter wie Prototyp, Entwurf, Vorführung, justolgay, github (Ausnahme: der Entwurfsvermerk in pdf.js, nur mit entwurf = true gezeichnet)", treffer.length === 0, treffer.slice(0, 3).join(" | "));
  const gemeinsam = [...html.matchAll(ANM_GEMEINSAME_ADRESSE)].map((m) => m[0]);
  const mw = lies("mitglied-werden.html");
  const nurHier = gemeinsam.filter((a) => !mw.includes(a));
  melde("GitHub-Pages-Adressen in anmeldung.html nur die gemeinsamen des Seitenkopfs (auch auf mitglied-werden.html)", nurHier.length === 0, nurHier.slice(0, 3).join(", "));

  // 5. fremde Hosts
  const fremd = new Set();
  for (const n of namen) {
    let text = lies(n);
    if (/^anmeldung-(?:schrift|vorlage-)/.test(n)) continue;
    if (n === "anmeldung.html") text = text.replace(ANM_GEMEINSAME_ADRESSE, "");
    for (const m of text.matchAll(/https?:\/\/([A-Za-z0-9.-]+)/g)) if (!ANM_ERLAUBTE_HOSTS.includes(m[1])) fremd.add(`${n}: ${m[1]}`);
    for (const m of text.matchAll(/[\s"'(=]\/\/([A-Za-z0-9.-]+\.[a-z]{2,})/g)) fremd.add(`${n}: ${m[1]}`);
  }
  melde(`keine fremden Hosts außer ${ANM_ERLAUBTE_HOSTS.join(", ")} (und den gemeinsamen Adressen im Seitenkopf)`, fremd.size === 0, [...fremd].slice(0, 5).join(" | "));
  return fehler;
}

// "Mitglied werden": mit Assistent der Hauptknopf (Web und App) und die Nebenwege, ohne ihn kein Verweis auf die Seite.
function pruefeMitgliedWerden() {
  const fehler = [];
  const melde = (name, ok, detail) => {
    console.log(`${ok ? "OK  " : "FEHLER"} ${name}${detail ? " – " + detail : ""}`);
    if (!ok) fehler.push(name + (detail ? ": " + detail : ""));
  };
  const html = readFileSync(path.join(WEB_DIR, "mitglied-werden.html"), "utf8");
  const knoepfe = [...html.matchAll(/<a class="knopf" href="anmeldung\.html">Schritt f\u00fcr Schritt anmelden<\/a>/g)].length;
  const verweise = [...html.matchAll(/href="anmeldung\.html"/g)].length;
  if (MIT_ANMELDUNG) {
    melde("mitglied-werden.html: Hauptknopf „Schritt für Schritt anmelden“ in der Web- und in der App-Fassung (Schritt 2)", knoepfe === 2 && verweise === 2, `${knoepfe} Knöpfe, ${verweise} Verweise`);
    melde("mitglied-werden.html: Nebenwege bleiben (Online ausfüllen, PDF zum Ausdrucken, App-Formular)", /href="aufnahmeantrag\.html"/.test(html) && /PDF zum Ausdrucken/.test(html) && /Aufnahmeantrag online ausfüllen/.test(html));
  } else {
    melde("mitglied-werden.html: ohne Assistent kein Verweis auf anmeldung.html und kein Hauptknopf", verweise === 0 && !/Schritt f\u00fcr Schritt anmelden/.test(html), `${verweise} Verweise`);
    const uebrig = readdirSync(WEB_DIR).filter((n) => /^anmeldung[.-]/.test(n));
    melde("ohne Assistent liegen keine anmeldung*-Dateien im Paket", uebrig.length === 0, uebrig.slice(0, 3).join(", "));
  }
  return fehler;
}

// ---------- Prüfung je Seite und Breite ----------

// W2: die FUSSBALL.DE-Widgets sind bei FUSSBALL.DE nur für die Domain
// cdn.appack.de freigegeben (siehe LIESMICH). Lokal (dieser Mini-Server) und
// auf GitHub Pages liefert fussball.de deshalb eine Fehlermeldung bzw.
// HTTP-Fehler für seine Adressen (www.fussball.de/widgets.js,
// next.fussball.de/widget/…) – das ist erwartet (Domain-Freigabe) und kein
// Seitenfehler. Alle anderen Fehler (auch von justolgay.github.io, dem
// Spielplan-Generator) bleiben echte Fehler.
//
// W7, Abschnitt 3: dieselbe Domain-Freigabe gilt für den öffentlichen
// appack.de-REST-Aufruf der Trainerfotos (trainerFotosSkript(), siehe
// hilfen.mjs) – auch die appack-API ist per CORS nur für cdn.appack.de und
// github.io freigegeben, lokal also erwartet ein HTTP-403/CORS-Fehler.
function istDomainFreigabeAdresse(url) {
  try {
    const host = new URL(url).hostname;
    if (host === "fussball.de" || host.endsWith(".fussball.de")) return true;
    if (host === "appack.de" || host.endsWith(".appack.de")) return true;
    return false;
  } catch {
    return false;
  }
}

// Die Live-Seite des Assistenten: Er startet, die Sprachwahl stimmt mit der Konfiguration überein, und vom Rahmen der
// Begleitseite, vom Entwurfs-Band, vom Werkzeugkasten und von noindex ist nichts da.
async function pruefeAnmeldungImBrowser(page) {
  const fehler = [];
  try {
    await page.waitForSelector("#anmeldung[data-bereit]", { timeout: 15000 });
  } catch {
    return ["Assistent startet nicht (#anmeldung[data-bereit] fehlt nach 15 s)"];
  }
  const konfig = leseKonfigAnmeldung();
  const d = await page.evaluate(() => ({
    sprachen: Array.from(document.querySelectorAll("[data-anm-sprachleiste] [data-sprache]")).map((b) => b.getAttribute("data-sprache")),
    optionen: Array.from(document.querySelectorAll("#anm-sprache option")).map((o) => o.value),
    werkzeuge: !!document.querySelector("[data-anm-band], [data-anm-werkzeuge], [data-anm-vorfuehrung], [data-anm-vereinssicht], [data-beispiel]"),
    rahmen: !!document.querySelector(".begleit-kopf"),
    noindex: !!document.querySelector('meta[name="robots"]'),
    schritt: document.getElementById("anmeldung").dataset.schritt,
    titel: document.title,
  }));
  if (JSON.stringify(d.sprachen) !== JSON.stringify(konfig.sprachen)) fehler.push(`Sprachwahl oben ${JSON.stringify(d.sprachen)} weicht von der Konfiguration ${JSON.stringify(konfig.sprachen)} ab`);
  if (JSON.stringify(d.optionen) !== JSON.stringify(konfig.sprachen)) fehler.push(`Sprachwahl im Assistenten ${JSON.stringify(d.optionen)} weicht von der Konfiguration ab`);
  if (d.werkzeuge) fehler.push("Entwurfs-Band, Werkzeugkasten, Knopf „Vorführung“ oder Beispiel-Knöpfe auf der Live-Seite");
  if (d.rahmen) fehler.push("Rahmen der Begleitseite (.begleit-kopf) auf der Live-Seite");
  if (d.noindex) fehler.push("meta robots (noindex) auf der Live-Seite");
  if (d.schritt !== "start") fehler.push(`Assistent steht auf "${d.schritt}" statt auf "start"`);
  if (/Entwurf|Prototyp/.test(d.titel)) fehler.push(`Titel enthält Entwurf oder Prototyp: ${d.titel}`);
  return fehler;
}

async function pruefeSeiteBeiBreite(browser, dateiname, breite) {
  const page = await browser.newPage();
  const fehler = [];
  const erwartet = [];

  page.on("pageerror", (err) => fehler.push(`pageerror: ${err.message}`));
  // Der Assistent meldet Ladefehler mit console.error; auf den übrigen Seiten gibt es dort erwartete Meldungen (Domain-Freigabe).
  if (dateiname === "anmeldung.html") {
    page.on("console", (m) => {
      if (m.type() === "error") fehler.push(`console.error: ${m.text()}`);
      if (m.type() === "warning" && /Text fehlt/.test(m.text())) fehler.push(`console.warn: ${m.text()}`);
    });
    // Außer dem Paket selbst und den gemeinsamen Assets im Seitenkopf (GitHub Pages) darf die Seite nichts anfragen.
    page.on("request", (req) => {
      const u = req.url();
      if (/^(?:data|blob|about):/.test(u) || u.startsWith(`${BASIS}/`) || u.startsWith("https://justolgay.github.io/speuzer-website-prototyp/assets/")) return;
      fehler.push(`Anfrage an einen fremden Host: ${u}`);
    });
  }
  page.on("requestfailed", (req) => {
    const eintrag = `requestfailed: ${req.url()} (${req.failure()?.errorText ?? "unbekannt"})`;
    if (istDomainFreigabeAdresse(req.url())) {
      erwartet.push(`erwartet (Domain-Freigabe): ${eintrag}`);
    } else {
      fehler.push(eintrag);
    }
  });
  page.on("response", (resp) => {
    if (resp.status() >= 400) {
      const eintrag = `HTTP ${resp.status()}: ${resp.url()}`;
      if (istDomainFreigabeAdresse(resp.url())) {
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

  if (dateiname === "anmeldung.html") fehler.push(...(await pruefeAnmeldungImBrowser(page)));

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
  // 28.09.2026: 38 (+ formular-gesendet.html), dann 39 (+ termine.html),
  // dann 40 (+ aufnahmeantrag.html), dann 41 (+ verein-organigramm.html, M13, 11.10.2026);
  // mit dem Assistenten (ANMELDUNG_LIVE) 42 (+ anmeldung.html)
  const erwarteteSeiten = 41 + (MIT_ANMELDUNG ? 1 : 0);
  if (seiten.length !== erwarteteSeiten) {
    console.error(`Erwartet ${erwarteteSeiten} Seiten in ${path.relative(ROOT, WEB_DIR)}/, gefunden ${seiten.length}.`);
    process.exit(1);
  }
  // Schalter und Paket müssen zusammenpassen (bei einer Kopie des Ordners über PAKET_WEB_DIR entfällt das).
  if (!process.env.PAKET_WEB_DIR && ANMELDUNG_LIVE !== MIT_ANMELDUNG) {
    console.error(`Der Schalter ANMELDUNG_LIVE ist ${ANMELDUNG_LIVE ? "an" : "aus"}, das Paket enthält anmeldung.html ${MIT_ANMELDUNG ? "" : "nicht "}– zuerst mit demselben Schalter neu bauen (sh tools/cache/bau-sperre.sh build).`);
    process.exit(1);
  }

  let allesOk = true;
  const bericht = [];

  // Prüfungen, die ohne Browser auskommen: der Assistent (nur mit anmeldung.html) und der Verweis von "Mitglied werden"
  console.log(`\n=== Anmelde-Assistent im Paket: ${MIT_ANMELDUNG ? "enthalten (ANMELDUNG_LIVE)" : "nicht enthalten (Schalter aus)"} ===`);
  const statisch = [...(MIT_ANMELDUNG ? pruefeAnmeldungDateien() : []), ...pruefeMitgliedWerden()];
  if (statisch.length) allesOk = false;
  console.log("");
  // --statisch: nur diese Prüfungen ohne Browser (schnell, zum Beispiel für eine Kopie des Ordners web/ über PAKET_WEB_DIR)
  if (process.argv.includes("--statisch")) {
    if (statisch.length) {
      console.error(`appack-paket-pruefen.mjs --statisch: FEHLGESCHLAGEN (${statisch.length} Fehler)`);
      process.exit(1);
    }
    console.log("appack-paket-pruefen.mjs --statisch: alle Prüfungen ohne Browser bestanden.");
    return;
  }

  const server = await starteMiniServer();
  console.log(`Mini-Server läuft: ${BASIS}/  (Quelle: ${path.relative(ROOT, WEB_DIR)}/)`);

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
  if (statisch.length) {
    console.error(`${statisch.length} Fehler bei den Prüfungen zum Anmelde-Assistenten:`);
    for (const f of statisch) console.error(`  - ${f}`);
  }
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
