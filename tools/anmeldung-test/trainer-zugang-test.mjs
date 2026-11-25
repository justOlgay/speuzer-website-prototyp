#!/usr/bin/env node
// Test des Zugangs zur Seite „Neu im Trainerteam“ und des Werkzeugs tools/trainer-zugang.mjs (Arbeitspaket T3 der Stufe 2) – ohne Browser.
//
// Geprüft wird:
//   1. Normalisierung, Prüfwert und Link: Die Seite und das Werkzeug normalisieren gleich (assets/js/anmeldung/zugang.js); der Prüfwert ist der
//      SHA-256 des normalisierten Codes (gegen node:crypto gerechnet); der Link zeigt auf cdn.appack.de, Seite trainerteam.html, Parameter code;
//      die Konfiguration data/trainer.json hat die Form, die zugangAusKonfig liest (leere Liste: kein Code passt).
//   2. --neu: zufällige Codes (12 Zeichen aus A–Z ohne I, O und L sowie 2–9, gleichverteilt, nie zweimal derselbe), der Prüfwert in der Datei ist der
//      des Codes auf dem Blatt, --pruefen nimmt ihn an; zusätzlich 2000 Codes im Speicher (Alphabet, Länge, Verteilung, keine Doppelten).
//   3. Werkzeug auf einer KOPIE der Daten (--daten): setzt und prüft Prüfwerte (--code, --neu, --behalten, --pruefen, --leeren); schreibt nur die Liste
//      (der Rest der Datei bleibt Zeichen für Zeichen); erzeugt Blatt (PDF, A4, Wappen, großer Code, Link), QR-Code (PNG) und den Textbaustein für die
//      Mail; verweigert Ordner im Repo außer unter tools/cache/ (auch über einen symbolischen Verweis); der Inhalt des QR-Codes wird maschinell gelesen
//      (CoreImage über tools/anmeldung-test/qr-dekodieren.swift) und ist die richtige Adresse, im PNG und im gerenderten PDF (pdftoppm).
//   4. Blatt für Codes von 8 bis 32 Zeichen: alles innerhalb der Ränder, nichts übereinander, der Code groß und vollständig, der QR-Code lesbar.
//   5. Falsche Eingaben: zu kurz, zu lang, leer, --neu ohne Blatt, zwei Aufgaben, unbekannte Angabe, beschädigte Daten, Ordner im Repo.
//   6. Das Repo bleibt sauber: data/trainer.json unberührt (Prüfsumme vorher und nachher); kein Klartext-Code des Testlaufs in einer Datei des Repos
//      (ohne tools/cache) und in keiner Ausgabe des Werkzeugs (außer mit --zeigen, wo er gewollt im Link steht); kein Prüfwert in der Ausgabe.
//
// Aufruf: node tools/anmeldung-test/trainer-zugang-test.mjs   (Exit 0 nur, wenn alles bestanden ist)
// Alle Codes in diesem Test sind erfunden oder zufällig erzeugt und gelten nirgends; die echte Datei wird nie geschrieben (immer --daten <Kopie>).

import { createHash, randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const Z = await import(pathToFileURL(path.join(ROOT, "assets", "js", "anmeldung", "zugang.js")).href);
const W = await import(pathToFileURL(path.join(ROOT, "tools", "trainer-zugang.mjs")).href);
const DATEN = path.join(ROOT, "data", "trainer.json");
const CACHE = path.join(ROOT, "tools", "cache", "anmeldung-test", "trainer-zugang");
const BLATT_ORDNER = process.env.ZUGANG_BLATT_ORDNER ? path.resolve(process.env.ZUGANG_BLATT_ORDNER) : path.join(CACHE, "blatt");
const POPPLER = ["/opt/homebrew/bin", "/usr/local/bin"];
const PFAD = [...POPPLER, process.env.PATH].join(path.delimiter);
const ausfuehren = (befehl, args, o = {}) => spawnSync(befehl, args, { encoding: "utf8", env: { ...process.env, PATH: PFAD }, ...o });

let fehler = 0;
let anzahl = 0;
function ok(name, bedingung, detail) {
  anzahl++;
  if (!bedingung) fehler++;
  console.log((bedingung ? "OK      " : "FEHLER  ") + name + (detail ? " – " + detail : ""));
  return !!bedingung;
}
const sha = (t) => createHash("sha256").update(t, "utf8").digest("hex");
const sha256Datei = (p) => createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const datenVorher = sha256Datei(DATEN);
const alleAusgaben = []; // stdout und stderr jedes Aufrufs des Werkzeugs (für die Suche nach dem Klartext-Code)
const ALPHABET_NEU = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // A–Z ohne I, O, L, dazu 2–9 (laut Werkzeug)

// ---------- 1. Normalisierung, Prüfwert, Link, Konfiguration ----------

console.log("\n=== 1. Normalisierung, Prüfwert und Link ===");
{
  ok("Link: https-Adresse auf cdn.appack.de, Seite trainerteam.html, Parameter code", /^https:\/\/cdn\.appack\.de\/sportfreunde04\/workspace\/web\/trainerteam\.html\?code=[A-Z0-9]+$/.test(W.linkFuer("test-ab23-cd45")), W.linkFuer("test-ab23-cd45").replace(/code=.*/, "code=…"));
  ok("Link: LINK_BASIS wie vorgegeben (…/workspace/web/trainerteam.html)", W.LINK_BASIS === "https://cdn.appack.de/sportfreunde04/workspace/web/trainerteam.html");
  ok("Werkzeug: linkFuer und anzeigeFuer nutzen dieselbe Normalisierung wie die Seite (Leerzeichen und Bindestriche weg, Großbuchstaben)", W.linkFuer("ab cd-ef 23") === W.LINK_BASIS + "?code=ABCDEF23" && W.anzeigeFuer("ab cd-ef 23") === "ABCD-EF23" && W.anzeigeFuer("abcdefghjkmn") === "ABCD-EFGH-JKMN" && W.anzeigeFuer("abcde") === "ABCD-E");
  ok("Link und Normalisierung: Gedankenstriche, geschützte Leerzeichen und kleine Buchstaben wie bei der Seite", W.linkFuer("abcd–efgh abcd") === W.LINK_BASIS + "?code=ABCDEFGHABCD" && Z.normalisiereCode("abcd–efgh abcd") === "ABCDEFGHABCD");
  const h1 = sha("TESTAB23CD45");
  const z = Z.zugangAusKonfig({ zugang: { parameter: "code", pruefwerte: [h1] } });
  ok("Konfiguration: zugangAusKonfig liest zugang { parameter, pruefwerte } der Seite (ein Prüfwert, Parameter code)", z.aktiv === true && z.parameter === "code" && z.pruefwerte.join() === h1);
  ok("Konfiguration: eine leere Liste lässt keinen Code passieren (die Seite bleibt zu): pruefeCode gegen []", (await Z.pruefeCode("TESTAB23CD45", [])).gueltig === false && (await Z.pruefeCode("TESTAB23CD45", [h1])).gueltig === true);
  ok("Prüfwert: der SHA-256 des normalisierten Codes, 64 Kleinbuchstaben und Ziffern", Z.PRUEFWERT_MUSTER.test(h1) && (await Z.sha256Hex(Z.normalisiereCode("test-ab23 cd45"))) === h1);
  // data/trainer.json im Repo: Form, die das Werkzeug und der Bau erwarten
  const echt = JSON.parse(fs.readFileSync(DATEN, "utf8"));
  ok("data/trainer.json: „zugang“ mit parameter „code“ und der Liste „pruefwerte“; jeder Eintrag ein SHA-256", echt.zugang && echt.zugang.parameter === "code" && Array.isArray(echt.zugang.pruefwerte) && echt.zugang.pruefwerte.every((x) => Z.PRUEFWERT_MUSTER.test(x)), echt.zugang.pruefwerte.length + " Prüfwert(e)");
  console.log("        Hinweis: data/trainer.json hat " + echt.zugang.pruefwerte.length + " Prüfwert(e); bis zum Livegang bleibt die Liste leer (der echte Code entsteht erst bei der Vorbereitung des Livegangs).");
  ok("data/trainer.json: Einsichtnehmende als Liste mit Namen und Funktion (Standard: genau ein Eintrag)", Array.isArray(echt.einsicht) && echt.einsicht.length >= 1 && echt.einsicht.every((p) => p.name && p.funktion));
}

// ---------- 2. Zufall: neuerCode im Speicher ----------

console.log("\n=== 2. neuerCode: Alphabet, Länge, Verteilung, keine Doppelten (im Speicher) ===");
{
  ok("Alphabet: genau 31 Zeichen (A–Z ohne I, O, L, dazu 2–9), keine Doppelten, nichts Verwechselbares (kein I, O, L, 0, 1)", W.ALPHABET === ALPHABET_NEU && new Set(W.ALPHABET).size === 31 && !/[IOL01]/.test(W.ALPHABET));
  const codes = Array.from({ length: 2000 }, () => W.neuerCode());
  ok("2000 Codes: je 12 Zeichen, alle Zeichen aus dem Alphabet", codes.every((c) => c.length === 12 && [...c].every((z) => ALPHABET_NEU.includes(z))));
  ok("2000 Codes: keiner kommt zweimal vor (Zufall)", new Set(codes).size === 2000);
  const zaehler = new Map();
  for (const c of codes) for (const z of c) zaehler.set(z, (zaehler.get(z) || 0) + 1);
  const erwartet = (2000 * 12) / ALPHABET_NEU.length; // rund 774
  const werte = [...ALPHABET_NEU].map((z) => zaehler.get(z) || 0);
  ok(`2000 Codes: jedes der 31 Zeichen kommt vor, und die Häufigkeiten streuen um ${erwartet.toFixed(0)} (zwischen ${Math.min(...werte)} und ${Math.max(...werte)}; kein Zeichen fehlt oder dominiert)`, werte.every((n) => n > erwartet * 0.75 && n < erwartet * 1.25));
  ok("neuerCode(n): beliebige Länge, immer aus dem Alphabet", [8, 16, 32].every((n) => W.neuerCode(n).length === n && [...W.neuerCode(n)].every((z) => ALPHABET_NEU.includes(z))));
  ok("Der Code besteht nach dem Normalisieren aus denselben Zeichen (nur A–Z und 2–9: nichts, was die Normalisierung verändert)", codes.slice(0, 200).every((c) => Z.normalisiereCode(c) === c));
}

// ---------- 3. Werkzeug auf einer Kopie ----------

console.log("\n=== 3. Werkzeug tools/trainer-zugang.mjs (auf einer Kopie der Daten) ===");
fs.rmSync(CACHE, { recursive: true, force: true });
fs.mkdirSync(CACHE, { recursive: true });
const TESTCODE = "TEST-" + randomBytes(3).toString("hex").toUpperCase() + "-" + randomBytes(3).toString("hex").toUpperCase() + "-ZK7M";
const TESTNORM = TESTCODE.replace(/-/g, "");
const KOPIE = path.join(CACHE, "trainer-kopie.json");
const cli = (...args) => {
  const r = ausfuehren(process.execPath, [path.join(ROOT, "tools", "trainer-zugang.mjs"), ...args], { cwd: ROOT });
  alleAusgaben.push({ args: args.filter((a) => a.startsWith("--")).join(" "), text: (r.stdout || "") + (r.stderr || "") }); // nur die Angaben, nie ein Code
  return r;
};
let leser = null; // maschineller QR-Leser (CoreImage), nur auf dem Mac
{
  fs.copyFileSync(DATEN, KOPIE);
  fs.writeFileSync(KOPIE, W.setzePruefwerteImText(fs.readFileSync(KOPIE, "utf8"), [])); // Ausgangslage: leere Liste, unabhängig vom Stand im Repo
  const kopieText0 = fs.readFileSync(KOPIE, "utf8");

  // --code und --blatt
  const r1 = cli("--code", TESTCODE, "--blatt", BLATT_ORDNER, "--daten", KOPIE);
  ok("--code --blatt: Exit 0", r1.status === 0, (r1.stderr || "").trim());
  const text1 = fs.readFileSync(KOPIE, "utf8");
  const liste1 = W.lesePruefwerte(text1);
  ok("--code: die Liste hat genau einen Prüfwert, den SHA-256 des normalisierten Codes", liste1.length === 1 && liste1[0] === sha(TESTNORM), liste1.length + " Prüfwert(e)");
  ok("--code: außer der Liste hat sich in der Datei nichts geändert (Text Zeichen für Zeichen)", text1.replace(/"pruefwerte": \[[^\]]*\]/, '"pruefwerte": []') === kopieText0.replace(/"pruefwerte": \[[^\]]*\]/, '"pruefwerte": []'));
  ok("--code: der Klartext-Code steht nicht in der Datei und nicht in der Ausgabe, auch der Prüfwert steht nicht in der Ausgabe", !text1.includes(TESTCODE) && !text1.includes(TESTNORM) && !(r1.stdout + r1.stderr).includes(TESTNORM) && !(r1.stdout + r1.stderr).includes(TESTCODE) && !(r1.stdout + r1.stderr).includes(liste1[0]));
  ok("--code: die Ausgabe zeigt den Link mit „***“ statt des Codes", /trainerteam\.html\?code=\*\*\*/.test(r1.stdout), r1.stdout.split("\n").find((z) => z.startsWith("Link")) || "");
  const pdf = path.join(BLATT_ORDNER, W.BLATT_NAME + ".pdf");
  const png = path.join(BLATT_ORDNER, W.BLATT_NAME + ".png");
  const mail = path.join(BLATT_ORDNER, W.MAIL_NAME);
  ok("--blatt: PDF, PNG und Mail-Baustein liegen im Ordner (Dateinamen „Neu im Trainerteam – Zugang“ und „Mail an Melli – Zugang Trainerseite.txt“)", fs.existsSync(pdf) && fs.existsSync(png) && fs.existsSync(mail) && W.BLATT_NAME === "Neu im Trainerteam – Zugang" && W.MAIL_NAME === "Mail an Melli – Zugang Trainerseite.txt", BLATT_ORDNER);
  const info = ausfuehren("pdfinfo", [pdf]);
  ok("PDF: gültig (pdfinfo), genau eine Seite im Format A4 (595 × 842 pt)", info.status === 0 && /Pages:\s+1\b/.test(info.stdout || "") && /Page size:\s+595\.\d+ x 841\.\d+ pts \(A4\)/.test(info.stdout || ""), (info.stdout || "").split("\n").filter((z) => /Pages|Page size/.test(z)).join("; "));
  const text = ausfuehren("pdftotext", ["-layout", pdf, "-"]).stdout || "";
  const flach = text.replace(/\s+/g, " ");
  ok("PDF: Titel „Neu im Trainerteam“ und die Zeile zur Weitergabe", flach.includes("Neu im Trainerteam") && flach.includes("Zugang für neue Trainer, Co-Trainer und Betreuer. Bitte nur an sie weitergeben."));
  ok("PDF: der Code in großen Zeichen (in Gruppen zu vier Zeichen)", flach.includes(W.anzeigeFuer(TESTCODE)), W.anzeigeFuer(TESTCODE).slice(0, 4) + "…");
  ok("PDF: der Link steht darauf", flach.includes(W.linkFuer(TESTCODE)));
  ok("PDF: drei Schritte (Code scannen oder Link öffnen · Angaben machen und am Bildschirm unterschreiben · Dateien per E-Mail an die Geschäftsstelle schicken)", W.BLATT_TEXTE.schritte.length === 3 && W.BLATT_TEXTE.schritte.every((s) => flach.includes(s)));
  ok("PDF: Zeile zum Führungszeugnis (nie hochgeladen oder gemailt, persönlich gezeigt)", flach.includes("Das Führungszeugnis wird nie hochgeladen oder gemailt. Es wird persönlich gezeigt."));
  ok("PDF: kein „Prototyp“, kein „Entwurf“, kein Name einer Person", !/Prototyp|Entwurf|Seipp|Müller/.test(flach));
  const fonts = ausfuehren("pdffonts", [pdf]).stdout || "";
  ok("PDF: Schrift eingebettet (Liberation Sans), keine Standardschrift ohne Einbettung", /LiberationSans/.test(fonts) && !/\b(Helvetica|Arial|Times)\b/.test(fonts));
  // Farben im Inhalt der Seite: nur Vereinsblau (#191793) und die Neutraltöne der Speuzer-Seiten; weder Rot noch Grün (kein Eintracht-CD)
  {
    const PDFLib = await import("pdf-lib");
    const dok = await PDFLib.PDFDocument.load(fs.readFileSync(pdf));
    const inhalt = dok.getPage(0).node.Contents();
    const stroeme = inhalt instanceof PDFLib.PDFArray ? inhalt.asArray().map((r) => dok.context.lookup(r)) : [inhalt];
    const roh = stroeme.map((s) => Buffer.from(PDFLib.decodePDFRawStream(s).decode()).toString("latin1")).join("\n");
    const hex = (z) => Math.round(Number(z) * 255).toString(16).padStart(2, "0");
    const farben = new Set([...roh.matchAll(/(-?[0-9.]+) (-?[0-9.]+) (-?[0-9.]+) (?:rg|RG)\b/g)].map((m) => "#" + hex(m[1]) + hex(m[2]) + hex(m[3])));
    const ERLAUBT = ["#191793", "#12142b", "#3f4360", "#d8dbea", "#ffffff"]; // Vereinsblau, Tinte, Tinte 2, Linie, Weiß (assets/css/tokens.css)
    const fremd = [...farben].filter((f) => !ERLAUBT.includes(f));
    ok("PDF: nur Vereinsblau #191793 und die Neutraltöne der Seiten (Tinte, Linie, Weiß) – kein Rot, kein Grün, keine Farbe des Eintracht-CD", farben.has("#191793") && fremd.length === 0, [...farben].join(" "));
    // Das Wappen steht auf dem Blatt: oben links (Ausschnitt 40–160 pt von links, 30–110 pt von oben) viele Pixel in Vereinsblau
    const ausschnitt = path.join(CACHE, "wappen");
    ausfuehren("pdftoppm", ["-r", "72", "-x", "40", "-y", "30", "-W", "120", "-H", "80", "-singlefile", pdf, ausschnitt]);
    const ppm = fs.readFileSync(ausschnitt + ".ppm");
    const kopf = /^P6\s+(\d+)\s+(\d+)\s+255\s/.exec(ppm.subarray(0, 40).toString("latin1"));
    const daten = kopf ? ppm.subarray(kopf[0].length) : Buffer.alloc(0);
    let blau = 0;
    for (let i = 0; i + 2 < daten.length; i += 3) if (daten[i] < 90 && daten[i + 1] < 90 && daten[i + 2] > 100) blau++;
    ok("PDF: das Wappen (Vektorpfade in Vereinsblau) steht oben links", !!kopf && blau > 400, blau + " blaue Bildpunkte im Ausschnitt oben links");
  }

  // Textbaustein für die Mail
  {
    const m = fs.readFileSync(mail, "utf8");
    const zeilen = m.split("\n");
    const links = m.match(/https:\/\/\S+/g) || [];
    ok("Mail: Betreff, genau ein Link, und zwar der mit dem Code (…/trainerteam.html?code=<CODE>)", zeilen[0].startsWith("Betreff:") && links.length === 1 && links[0] === W.linkFuer(TESTCODE), links.join(" ").replace(/code=.*/, "code=…"));
    const rest = m.split(links[0])[1] || "";
    const saetze = rest.trim().split(/(?<=[.!?])\s+/).filter(Boolean); // nach dem Link: der Rest
    ok("Mail: nach dem Link genau drei Sätze (Zweck, Weitergabe, Wechsel des Codes)", saetze.length === 3, saetze.length + " Sätze");
    ok("Mail: sagt, wozu die Seite dient (alle Unterlagen am Handy, Dateien selbst per E-Mail an die Geschäftsstelle, nichts wird gesendet oder gespeichert)", /Unterlagen am Handy/.test(m) && /selbst per E-Mail an die Geschäftsstelle/.test(m) && /sendet und speichert nichts/.test(m));
    ok("Mail: sagt, an wen der Link geht (nur neue Trainer und Betreuer, nicht in Gruppen, nicht öffentlich), dass der Code im Link steckt, und was bei einem Missbrauch geschieht", /Der Code steckt im Link und gilt wie ein Passwort/.test(m) && /nur an neue Trainer und Betreuer/.test(m) && /nicht in Gruppen und nicht öffentlich/.test(m) && /tausche ich den Code aus/.test(m));
    ok("Mail: ohne Prüfwert, ohne Namen von Personen, ohne Ausrufezeichen", !m.includes(liste1[0]) && !/Seipp|Müller|!/.test(m));
  }

  // QR-Code maschinell lesen
  const swift = path.join(ROOT, "tools", "anmeldung-test", "qr-dekodieren.swift");
  if (process.platform === "darwin" && ausfuehren("which", ["swiftc"]).status === 0) {
    const exe = path.join(CACHE, "qr-dekodieren");
    const c = ausfuehren("swiftc", ["-O", "-o", exe, swift]);
    if (c.status === 0) leser = (bild) => ausfuehren(exe, [bild]);
    else console.log("        swiftc scheitert: " + (c.stderr || "").slice(0, 200));
  }
  if (!leser) {
    ok("QR-Code lesen: kein Leser auf diesem Rechner (Swift/CoreImage nur auf dem Mac) – übersprungen", true, "nicht geprüft");
  } else {
    const soll = W.linkFuer(TESTCODE);
    const a = leser(png);
    ok("QR-Code im PNG: maschinell gelesen (CoreImage CIDetector) = richtige Adresse mit Testcode", a.status === 0 && a.stdout.trim() === soll, a.stdout.trim().replace(/code=.*/, "code=…"));
    const bildPfad = path.join(CACHE, "blatt-seite");
    ausfuehren("pdftoppm", ["-png", "-r", "200", "-singlefile", pdf, bildPfad]);
    const b = leser(bildPfad + ".png");
    ok("QR-Code im PDF (gerendert mit pdftoppm, 200 dpi): maschinell gelesen = richtige Adresse", b.status === 0 && b.stdout.trim() === soll, b.stdout.trim().replace(/code=.*/, "code=…"));
    fs.copyFileSync(bildPfad + ".png", path.join(BLATT_ORDNER, "blatt-seite.png"));
    // Probe, dass der Leser nicht alles „bestätigt“: ein anderer Code ergibt eine andere Adresse
    const anderer = path.join(CACHE, "anderer.png");
    fs.writeFileSync(anderer, await W.qrPng(W.linkFuer(TESTCODE + "X")));
    ok("QR-Code lesen: Gegenprobe – ein anderer Code ergibt eine andere Adresse", leser(anderer).stdout.trim() === W.linkFuer(TESTCODE + "X") && leser(anderer).stdout.trim() !== soll);
  }

  // prüfen
  ok("--pruefen mit dem Code: Exit 0", cli("--pruefen", TESTCODE, "--daten", KOPIE).status === 0);
  ok("--pruefen mit dem Code in anderer Schreibweise (klein, Leerzeichen): Exit 0", cli("--pruefen", TESTCODE.toLowerCase().replace(/-/g, " "), "--daten", KOPIE).status === 0);
  ok("--pruefen mit falschem Code: Exit 1", cli("--pruefen", TESTCODE + "X", "--daten", KOPIE).status === 1);
  const stdinProbe = ausfuehren(process.execPath, [path.join(ROOT, "tools", "trainer-zugang.mjs"), "--pruefen", "-", "--daten", KOPIE], { input: TESTCODE + "\n" });
  ok("--pruefen - liest den Code von der Standardeingabe: Exit 0", stdinProbe.status === 0);
  const stdinSetzen = ausfuehren(process.execPath, [path.join(ROOT, "tools", "trainer-zugang.mjs"), "--code", "-", "--behalten", "--daten", KOPIE], { input: "STDIN-" + randomBytes(3).toString("hex").toUpperCase() + "-ABCDEF\n" });
  alleAusgaben.push({ args: "--code - (Standardeingabe)", text: (stdinSetzen.stdout || "") + (stdinSetzen.stderr || "") });
  ok("--code - liest den Code von der Standardeingabe und setzt den Prüfwert dazu (der Code steht nicht in der Befehlszeile)", stdinSetzen.status === 0 && W.lesePruefwerte(fs.readFileSync(KOPIE, "utf8")).length === 2);
  fs.writeFileSync(KOPIE, text1); // zurück auf den einen Prüfwert

  // behalten
  const ZWEIT = "ZWEI-" + randomBytes(3).toString("hex").toUpperCase() + "-MN4P-QR7S";
  const r2 = cli("--code", ZWEIT, "--behalten", "--blatt", path.join(CACHE, "blatt2"), "--daten", KOPIE);
  const liste2 = W.lesePruefwerte(fs.readFileSync(KOPIE, "utf8"));
  ok("--code --behalten: der alte Prüfwert bleibt, der neue kommt dazu (zwei Prüfwerte, beide Codes gelten)", r2.status === 0 && liste2.length === 2 && liste2.includes(sha(TESTNORM)) && liste2.includes(sha(ZWEIT.replace(/-/g, ""))) && cli("--pruefen", TESTCODE, "--daten", KOPIE).status === 0 && cli("--pruefen", ZWEIT, "--daten", KOPIE).status === 0);
  const r2b = cli("--code", ZWEIT, "--behalten", "--daten", KOPIE);
  ok("--code --behalten mit demselben Code noch einmal: kein doppelter Prüfwert", r2b.status === 0 && W.lesePruefwerte(fs.readFileSync(KOPIE, "utf8")).length === 2 && /Kein Blatt erzeugt/.test(r2b.stdout));
  const r3 = cli("--code", "NEUER-CODE-ZZ98-77XY", "--blatt", path.join(CACHE, "blatt3"), "--daten", KOPIE);
  const liste3 = W.lesePruefwerte(fs.readFileSync(KOPIE, "utf8"));
  ok("--code ohne --behalten: die Liste enthält nur den neuen Prüfwert; die alten Codes gelten nicht mehr", r3.status === 0 && liste3.length === 1 && cli("--pruefen", TESTCODE, "--daten", KOPIE).status === 1 && cli("--pruefen", "NEUER-CODE-ZZ98-77XY", "--daten", KOPIE).status === 0);

  // leeren: bei diesem Werkzeug heißt „leer“: Die Seite bleibt für jeden Code zu
  const r4 = cli("--leeren", "--daten", KOPIE);
  ok("--leeren: Liste leer, Datei sonst unverändert, die Ausgabe sagt „bleibt für jeden Code zu“", r4.status === 0 && W.lesePruefwerte(fs.readFileSync(KOPIE, "utf8")).length === 0 && fs.readFileSync(KOPIE, "utf8") === kopieText0 && /bleibt für jeden Code zu/.test(r4.stdout), (r4.stdout || "").trim().slice(0, 90));
  const leer = cli("--pruefen", TESTCODE, "--daten", KOPIE);
  ok("--pruefen bei leerer Liste: Exit 1 und der Hinweis „bleibt für jeden Code zu“ (nicht „keine Code-Abfrage“)", leer.status === 1 && /bleibt für jeden Code zu/.test(leer.stdout) && !/keine Code-Abfrage/.test(leer.stdout), (leer.stdout || "").trim().slice(0, 90));

  // --neu: mehrere Läufe, jeder mit eigenem Ordner; der Code wird aus dem Link der Mail gelesen
  const gesehen = new Set();
  let alleGueltig = true;
  let passtZumPruefwert = true;
  let ohneKlartextInAusgabe = true;
  let pruefenGeht = true;
  const neuCodes = [];
  for (let i = 0; i < 6; i++) {
    const ordner = path.join(CACHE, "neu-" + i);
    const r = cli("--neu", "--blatt", ordner, "--daten", KOPIE);
    const m = fs.existsSync(path.join(ordner, W.MAIL_NAME)) ? fs.readFileSync(path.join(ordner, W.MAIL_NAME), "utf8") : "";
    const code = (/[?]code=([A-Z0-9]+)/.exec(m) || [])[1] || "";
    neuCodes.push(code);
    if (r.status !== 0 || code.length !== 12 || ![...code].every((z) => ALPHABET_NEU.includes(z))) alleGueltig = false;
    const liste = W.lesePruefwerte(fs.readFileSync(KOPIE, "utf8"));
    if (liste.length !== 1 || liste[0] !== sha(code)) passtZumPruefwert = false;
    if ((r.stdout + r.stderr).includes(code) || (r.stdout + r.stderr).includes(liste[0])) ohneKlartextInAusgabe = false;
    if (cli("--pruefen", code, "--daten", KOPIE).status !== 0 || cli("--pruefen", code + "X", "--daten", KOPIE).status !== 1) pruefenGeht = false;
    gesehen.add(code);
  }
  ok("--neu (6 Läufe): Exit 0, jeder Code hat 12 Zeichen aus dem Alphabet (A–Z ohne I, O, L, dazu 2–9)", alleGueltig, neuCodes.map((c) => c.slice(0, 2) + "…").join(" "));
  ok("--neu (6 Läufe): kein Code kommt zweimal vor (Zufall)", gesehen.size === 6);
  ok("--neu: der Prüfwert in der Datei ist der des Codes auf Blatt und Mail (ein Prüfwert, ersetzt den alten), --pruefen nimmt den Code an und einen falschen nicht", passtZumPruefwert && pruefenGeht);
  ok("--neu: weder der Code noch der Prüfwert steht in der Ausgabe", ohneKlartextInAusgabe);
  {
    const ordner = path.join(CACHE, "neu-0");
    const m = fs.readFileSync(path.join(ordner, W.MAIL_NAME), "utf8");
    const code = (/[?]code=([A-Z0-9]+)/.exec(m) || [])[1];
    const pdftext = (ausfuehren("pdftotext", ["-layout", path.join(ordner, W.BLATT_NAME + ".pdf"), "-"]).stdout || "").replace(/\s+/g, " ");
    ok("--neu: Blatt, Mail und QR-Code tragen denselben Code, und der Code in Gruppen zu vier Zeichen steht groß auf dem Blatt", pdftext.includes(W.anzeigeFuer(code)) && pdftext.includes(W.linkFuer(code)) && (!leser || leser(path.join(ordner, W.BLATT_NAME + ".png")).stdout.trim() === W.linkFuer(code)));
  }
  const nb = cli("--neu", "--behalten", "--blatt", path.join(CACHE, "neu-b"), "--daten", KOPIE);
  ok("--neu --behalten: der bisherige Prüfwert bleibt, der neue kommt dazu (zwei Prüfwerte)", nb.status === 0 && W.lesePruefwerte(fs.readFileSync(KOPIE, "utf8")).length === 2);
  fs.writeFileSync(KOPIE, kopieText0);
  const nz = cli("--neu", "--zeigen", "--daten", KOPIE);
  const gezeigt = (/code=([A-Z0-9]+)/.exec(nz.stdout) || [])[1] || "";
  ok("--neu --zeigen (ohne Blatt): der Code steht im Link der Ausgabe (nur auf ausdrücklichen Wunsch), der Prüfwert passt zu ihm", nz.status === 0 && gezeigt.length === 12 && W.lesePruefwerte(fs.readFileSync(KOPIE, "utf8"))[0] === sha(gezeigt) && /Kein Blatt erzeugt/.test(nz.stdout));
  alleAusgaben.pop(); // diese Ausgabe darf den Code zeigen (--zeigen)
  fs.writeFileSync(KOPIE, kopieText0);
  const cz = cli("--code", TESTCODE, "--zeigen", "--daten", KOPIE);
  ok("--code --zeigen: der Code steht im Link der Ausgabe", cz.status === 0 && cz.stdout.includes("code=" + TESTNORM));
  alleAusgaben.pop();
  fs.writeFileSync(KOPIE, kopieText0);

  // setzePruefwerteImText: Formatierung
  const drei = [sha("a"), sha("b"), sha("c")];
  const t3 = W.setzePruefwerteImText(kopieText0, drei);
  ok("setzePruefwerteImText: drei Prüfwerte, jede in einer Zeile, Rest unverändert, lesbar (auf data/trainer.json)", JSON.stringify(W.lesePruefwerte(t3)) === JSON.stringify(drei) && /"pruefwerte": \[\n      "[0-9a-f]{64}",\n      "[0-9a-f]{64}",\n      "[0-9a-f]{64}"\n    \]/.test(t3) && W.setzePruefwerteImText(t3, []) === kopieText0);
  const nach = JSON.parse(t3);
  ok("data/trainer.json: nach dem Setzen sind alle übrigen Felder (Hinweis, Verein, Einsicht, Fristen) unverändert", JSON.stringify({ ...nach, zugang: null }) === JSON.stringify({ ...JSON.parse(kopieText0), zugang: null }));
}

// ---------- 4. Blatt für Codes von 8 bis 32 Zeichen ----------

console.log("\n=== 4. Blatt für Codes von 8 bis 32 Zeichen: Ränder, keine Überlappung, Code groß und vollständig, QR-Code lesbar ===");
{
  const alphabet = ALPHABET_NEU;
  const zufall = (n) => Array.from(randomBytes(n), (b) => alphabet[b % alphabet.length]).join("");
  const ordner = path.join(CACHE, "laengen");
  fs.mkdirSync(ordner, { recursive: true });
  const ueberlappen = (a, b) => {
    const h = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
    const v = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
    return h > 1 && v > 0.25 * Math.min(a.y1 - a.y0, b.y1 - b.y0);
  };
  for (const n of [8, 12, 16, 20, 24, 28, 32]) {
    const code = zufall(n);
    const datei = path.join(ordner, "blatt-" + n + ".pdf");
    fs.writeFileSync(datei, await W.baueBlatt(code));
    const bbox = ausfuehren("pdftotext", ["-bbox", datei, "-"]).stdout || "";
    const woerter = [...bbox.matchAll(/<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)<\/word>/g)].map((m) => ({ x0: +m[1], y0: +m[2], x1: +m[3], y1: +m[4], t: m[5] }));
    const aussen = woerter.filter((w) => w.x0 < 50 || w.x1 > 595.28 - 50 || w.y0 < 20 || w.y1 > 822);
    ok(`Blatt mit Code aus ${n} Zeichen: alle ${woerter.length} Wörter und Zeichen liegen innerhalb der Ränder (mindestens 50 pt von den Seitenkanten)`, woerter.length > 40 && aussen.length === 0, aussen.slice(0, 3).map((w) => `${w.t} x ${w.x0.toFixed(0)}–${w.x1.toFixed(0)}`).join("; "));
    let kollisionen = 0;
    for (let i = 0; i < woerter.length; i++) for (let j = i + 1; j < woerter.length; j++) if (ueberlappen(woerter[i], woerter[j])) kollisionen++;
    ok(`Blatt mit Code aus ${n} Zeichen: kein Text liegt über anderem Text`, kollisionen === 0, kollisionen + " Überlappungen");
    const fussWoerter = woerter.filter((w) => w.y0 > 775);
    const restWoerter = woerter.filter((w) => w.y0 <= 775);
    ok(`Blatt mit Code aus ${n} Zeichen: die drei Schritte enden über der Linie vor der Fußzeile (Fußzeile: ${fussWoerter.map((w) => w.t).join(" ").slice(0, 20)}…)`, fussWoerter.length >= 5 && Math.max(...restWoerter.map((w) => w.y1)) < 841.89 - 74 - 2, "unterste Kante des Textes darüber: " + Math.max(...restWoerter.map((w) => w.y1)).toFixed(0));
    const text = ausfuehren("pdftotext", ["-layout", datei, "-"]).stdout || "";
    ok(`Blatt mit Code aus ${n} Zeichen: der Code steht vollständig auf dem Blatt (in Gruppen zu vier Zeichen)`, text.replace(/\s+/g, "").includes(W.anzeigeFuer(code)), W.anzeigeFuer(code).slice(0, 4) + "…");
    const codeWoerter = woerter.filter((w) => /^[A-Z2-9-]+$/.test(w.t) && w.y1 - w.y0 > 22);
    const hoehe = codeWoerter.length ? Math.min(...codeWoerter.map((w) => w.y1 - w.y0)) : 0;
    const zeilenY = new Set(codeWoerter.map((w) => Math.round(w.y0 / 4)));
    ok(`Blatt mit Code aus ${n} Zeichen: der Code steht in großen Zeichen (Zeichenhöhe ${hoehe.toFixed(0)} pt, mindestens 28) und in ${zeilenY.size} Zeile${zeilenY.size === 1 ? "" : "n"}`, codeWoerter.length >= 1 && hoehe >= 28 && zeilenY.size <= 2, "");
    if (leser) {
      const bild = path.join(ordner, "blatt-" + n);
      ausfuehren("pdftoppm", ["-png", "-r", "200", "-singlefile", datei, bild]);
      const gelesen = leser(bild + ".png");
      ok(`Blatt mit Code aus ${n} Zeichen: der QR-Code lässt sich aus dem gerenderten PDF maschinell lesen = richtige Adresse`, gelesen.status === 0 && gelesen.stdout.trim() === W.linkFuer(code), gelesen.stdout.trim().replace(/code=.*/, "code=…"));
    }
  }
  fs.copyFileSync(path.join(ordner, "blatt-32.pdf"), path.join(BLATT_ORDNER, "blatt-code-32-zeichen.pdf"));
}

// ---------- 5. Falsche Eingaben ----------

console.log("\n=== 5. Falsche Eingaben ===");
{
  const text0 = fs.readFileSync(KOPIE, "utf8");
  const zufall = (n) => Array.from(randomBytes(n), (b) => ALPHABET_NEU[b % ALPHABET_NEU.length]).join("");
  const zuLang = cli("--code", zufall(33), "--blatt", path.join(CACHE, "blatt5"), "--daten", KOPIE);
  ok("--code mit zu langem Code (über 32 Zeichen): Exit 2, nichts geschrieben, kein Blatt", zuLang.status === 2 && /höchstens 32/.test(zuLang.stderr) && !fs.existsSync(path.join(CACHE, "blatt5")) && fs.readFileSync(KOPIE, "utf8") === text0, (zuLang.stderr || "").trim().slice(0, 80));
  const kurz = cli("--code", "ABC-1234", "--blatt", path.join(CACHE, "blatt4"), "--daten", KOPIE);
  ok("--code mit zu kurzem Code (unter 8 Zeichen): Exit 2, nichts geschrieben, kein Blatt", kurz.status === 2 && !fs.existsSync(path.join(CACHE, "blatt4")) && fs.readFileSync(KOPIE, "utf8") === text0, (kurz.stderr || "").trim().slice(0, 80));
  ok("--code mit leerem Code (nur Leerzeichen und Bindestriche): Exit 2, nichts geschrieben", cli("--code", " - - ", "--daten", KOPIE).status === 2 && fs.readFileSync(KOPIE, "utf8") === text0);
  const ohneBlatt = cli("--neu", "--daten", KOPIE);
  ok("--neu ohne --blatt und ohne --zeigen: Exit 2 (der Code ginge verloren), nichts geschrieben", ohneBlatt.status === 2 && /ginge der neue Code verloren/.test(ohneBlatt.stderr) && fs.readFileSync(KOPIE, "utf8") === text0, (ohneBlatt.stderr || "").trim().slice(0, 90));
  ok("--neu zusammen mit --code, --pruefen oder --leeren (zwei Aufgaben): Exit 2", cli("--neu", "--code", "ABCDEFGH23", "--daten", KOPIE).status === 2 && cli("--neu", "--leeren", "--daten", KOPIE).status === 2 && cli("--leeren", "--pruefen", "x", "--daten", KOPIE).status === 2 && fs.readFileSync(KOPIE, "utf8") === text0);
  ok("--code ohne Wert, --blatt ohne Wert, unbekannte Angabe, --behalten allein: Exit 2", cli("--code").status === 2 && cli("--neu", "--blatt").status === 2 && cli("--unbekannt").status === 2 && cli("--behalten", "--daten", KOPIE).status === 2);
  const hilfe = cli();
  ok("ohne Angaben: Hilfe und Exit 2; --hilfe: Hilfe und Exit 0", hilfe.status === 2 && /--neu --blatt/.test(hilfe.stdout) && cli("--hilfe").status === 0 && /trainer-zugang\.mjs --pruefen/.test(cli("--hilfe").stdout));

  // Ordner im Repo verweigern
  const repoOrdner = [
    ["Wurzel des Repos", ROOT],
    ["docs/", path.join(ROOT, "docs", "x-blatt")],
    ["assets/", path.join(ROOT, "assets", "x-blatt")],
    ["data/", path.join(ROOT, "data")],
    ["tools/ (nicht cache)", path.join(ROOT, "tools", "x-blatt")],
    ["tools/cache-x (nur ein ähnlicher Name)", path.join(ROOT, "tools", "cache-x")],
    ["mit ..", path.join(ROOT, "tools", "cache", "..", "..", "src", "x")],
  ];
  for (const [name, ordner] of repoOrdner) {
    const r = cli("--code", TESTCODE, "--blatt", ordner, "--daten", KOPIE);
    ok("Ordner im Repo wird verweigert: " + name, r.status === 2 && /liegt im Repo/.test(r.stderr) && !fs.existsSync(path.join(ordner, W.BLATT_NAME + ".pdf")) && fs.readFileSync(KOPIE, "utf8") === text0, (r.stderr || "").trim().slice(0, 70));
    const rn = cli("--neu", "--blatt", ordner, "--daten", KOPIE);
    if (!(rn.status === 2 && /liegt im Repo/.test(rn.stderr) && fs.readFileSync(KOPIE, "utf8") === text0)) ok("Ordner im Repo wird auch bei --neu verweigert: " + name, false, (rn.stderr || "").trim().slice(0, 70));
  }
  ok("Ordner im Repo wird auch bei --neu verweigert (alle sieben Fälle: nichts geschrieben, Datei unverändert)", fs.readFileSync(KOPIE, "utf8") === text0);
  const rel = ausfuehren(process.execPath, [path.join(ROOT, "tools", "trainer-zugang.mjs"), "--code", TESTCODE, "--blatt", ".", "--daten", KOPIE], { cwd: ROOT });
  ok("Ordner im Repo wird verweigert: relativer Pfad „.“ (Arbeitsordner = Repo)", rel.status === 2 && /liegt im Repo/.test(rel.stderr));
  // symbolischer Verweis unter tools/cache, der ins Repo zeigt
  const verweis = path.join(CACHE, "verweis-ins-repo");
  try {
    fs.symlinkSync(path.join(ROOT, "docs"), verweis);
    const r = cli("--code", TESTCODE, "--blatt", path.join(verweis, "x"), "--daten", KOPIE);
    ok("Ordner im Repo wird verweigert: symbolischer Verweis unter tools/cache, der nach docs/ zeigt", r.status === 2 && /liegt im Repo/.test(r.stderr) && !fs.existsSync(path.join(ROOT, "docs", "x")));
  } finally {
    fs.rmSync(verweis, { force: true });
  }
  // erlaubt: unter tools/cache und außerhalb des Repos
  const aussen = fs.mkdtempSync(path.join(os.tmpdir(), "trainer-zugang-blatt-"));
  const r5 = cli("--code", TESTCODE, "--blatt", path.join(aussen, "Vereinsordner"), "--daten", KOPIE);
  ok("Ordner außerhalb des Repos (Systemordner für Temporäres) wird angenommen", r5.status === 0 && fs.existsSync(path.join(aussen, "Vereinsordner", W.BLATT_NAME + ".pdf")) && fs.existsSync(path.join(aussen, "Vereinsordner", W.BLATT_NAME + ".png")) && fs.existsSync(path.join(aussen, "Vereinsordner", W.MAIL_NAME)));
  fs.rmSync(aussen, { recursive: true, force: true });
  ok("Ordner unter tools/cache/ wird angenommen (oben benutzt)", fs.existsSync(path.join(BLATT_ORDNER, W.BLATT_NAME + ".pdf")));
  fs.writeFileSync(KOPIE, text0);

  // beschädigte Daten
  const kaputt = path.join(CACHE, "kaputt.json");
  fs.writeFileSync(kaputt, JSON.stringify({ stand: "x" }));
  const r6 = cli("--code", TESTCODE, "--daten", kaputt);
  ok("Daten ohne „zugang › pruefwerte“: Exit 2, nichts geschrieben", r6.status === 2 && fs.readFileSync(kaputt, "utf8") === JSON.stringify({ stand: "x" }));
  const mitUnsinn = path.join(CACHE, "unsinn.json");
  const unsinnText = text0.replace('"pruefwerte": []', '"pruefwerte": ["unsinn"]');
  fs.writeFileSync(mitUnsinn, unsinnText);
  const r7 = cli("--code", TESTCODE, "--behalten", "--daten", mitUnsinn);
  ok("Ein Eintrag in der Liste, der kein SHA-256 ist: Exit 2, nichts geschrieben", r7.status === 2 && fs.readFileSync(mitUnsinn, "utf8") === unsinnText);
  const fehlt = cli("--code", TESTCODE, "--daten", path.join(CACHE, "gibt-es-nicht.json"));
  ok("Datei der Daten fehlt: Exit 2 mit verständlicher Meldung, kein Blatt, keine Datei angelegt", fehlt.status === 2 && /lässt sich nicht lesen/.test(fehlt.stderr) && !fs.existsSync(path.join(CACHE, "gibt-es-nicht.json")), (fehlt.stderr || "").trim().slice(-60));
  const keinJson = path.join(CACHE, "kein-json.json");
  fs.writeFileSync(keinJson, "{ das ist kein JSON");
  const rk = cli("--pruefen", TESTCODE, "--daten", keinJson);
  ok("Datei der Daten ist kein JSON: Exit 2 mit verständlicher Meldung, Datei unverändert", rk.status === 2 && /kein gültiges JSON/.test(rk.stderr) && fs.readFileSync(keinJson, "utf8") === "{ das ist kein JSON");
}

// ---------- 6. Das Repo bleibt sauber ----------

console.log("\n=== 6. data/trainer.json unberührt, kein Klartext-Code im Repo und in den Ausgaben ===");
{
  ok("data/trainer.json: Prüfsumme vor und nach dem Test gleich (der Test fasst die echte Datei nie an: immer --daten <Kopie>)", sha256Datei(DATEN) === datenVorher);
  // Suche im Repo (ohne node_modules, .git, tools/cache): kein Vorkommen eines Codes dieses Laufs in irgendeiner Textdatei
  const codes = [TESTCODE, TESTNORM, ...fs.readdirSync(CACHE).filter((n) => /^neu-/.test(n)).map((n) => (/[?]code=([A-Z0-9]+)/.exec(fs.readFileSync(path.join(CACHE, n, W.MAIL_NAME), "utf8")) || [])[1]).filter(Boolean)];
  const treffer = [];
  const suche = (ordner) => {
    for (const e of fs.readdirSync(ordner, { withFileTypes: true })) {
      if (e.name === "node_modules" || e.name === ".git") continue;
      const p = path.join(ordner, e.name);
      if (p === path.join(ROOT, "tools", "cache")) continue;
      if (e.isDirectory()) suche(p);
      else if (e.isFile() && fs.statSync(p).size < 5 * 1024 * 1024 && /\.(js|mjs|json|html|css|md|txt|csv|svg|py|sh|xml)$/.test(e.name)) {
        const text = fs.readFileSync(p, "utf8");
        if (codes.some((c) => text.includes(c))) treffer.push(path.relative(ROOT, p));
      }
    }
  };
  suche(ROOT);
  ok(`Repo (ohne node_modules, .git und tools/cache; mit docs/ und dist/): keiner der ${codes.length} Codes dieses Laufs steht in einer Textdatei`, treffer.length === 0, treffer.slice(0, 3).join(", "));
  const inAusgabe = alleAusgaben.filter((a) => codes.some((c) => a.text.includes(c)) || /[0-9a-f]{64}/.test(a.text));
  ok(`Ausgaben des Werkzeugs (${alleAusgaben.length} Aufrufe, stdout und stderr): weder ein Code noch ein Prüfwert (ohne --zeigen)`, inAusgabe.length === 0, inAusgabe.slice(0, 3).map((a) => a.args).join(" | "));
  const pruefwerteImRepo = JSON.parse(fs.readFileSync(DATEN, "utf8")).zugang.pruefwerte;
  ok("data/trainer.json: kein Prüfwert eines Codes dieses Laufs", !pruefwerteImRepo.some((w) => codes.some((c) => sha(c.replace(/-/g, "")) === w)));
}

console.log("\n=== Zusammenfassung ===");
console.log(anzahl + " Prüfungen, " + fehler + " Fehler.");
console.log(fehler ? "trainer-zugang-test.mjs: FEHLER" : "trainer-zugang-test.mjs: alles bestanden.");
process.exit(fehler ? 1 : 0);
