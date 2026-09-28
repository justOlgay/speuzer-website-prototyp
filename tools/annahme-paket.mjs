// Paket für den Vereins-Webspace (IONOS): Aufnahmeantrag-Annahme
// (server/aufnahmeantrag-annahme/) als ZIP zum Hochladen.
//
//   npm run annahme-paket
//
// Prüft vorher:
//  - Kennung der Vereinsvorlage: VORLAGE_ID in annahme.php muss die /ID der
//    Vorlage aus data/aufnahmeantrag-felder.json sein (die Annahme nimmt nur
//    PDFs aus dieser Vorlage an). Die Vorlage wird dafür geladen und per
//    SHA-256 mit der Vermessung verglichen.
//  - PHP-Syntax (php -l), falls PHP installiert ist.
// Ergebnis: dist/aufnahmeantrag-annahme.zip mit dem Ordner "formular/"
// (annahme.php, index.html, .htaccess, einstellungen.php mit Platzhalter für
// das Passwort, lib/PHPMailer, daten/). Anleitung für die Einrichtung:
// server/aufnahmeantrag-annahme/ANLEITUNG.md.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, copyFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const QUELLE = path.join(ROOT, "server", "aufnahmeantrag-annahme");
const AUS = path.join(ROOT, "dist", "aufnahmeantrag-annahme");
const ZIP = path.join(ROOT, "dist", "aufnahmeantrag-annahme.zip");
const VORLAGE_CACHE = path.join(ROOT, "tools", "cache", "antrag-pdf", "antrag.pdf");

function fehler(text) {
  console.error("annahme-paket: " + text);
  process.exit(1);
}

// 1. Vorlage und Kennung
const vermessung = JSON.parse(readFileSync(path.join(ROOT, "data", "aufnahmeantrag-felder.json"), "utf8"));
const { url, sha256 } = vermessung.quelle;
let vorlage = existsSync(VORLAGE_CACHE) ? readFileSync(VORLAGE_CACHE) : null;
const pruefsumme = (b) => createHash("sha256").update(b).digest("hex");
if (!vorlage || pruefsumme(vorlage) !== sha256) {
  const antwort = await fetch(url);
  if (!antwort.ok) fehler(`Vorlage nicht ladbar (${antwort.status}): ${url}`);
  vorlage = Buffer.from(await antwort.arrayBuffer());
  if (pruefsumme(vorlage) !== sha256) fehler("Vorlage im CMS passt nicht zur Vermessung (SHA-256) – erst die Website neu vermessen");
  mkdirSync(path.dirname(VORLAGE_CACHE), { recursive: true });
  writeFileSync(VORLAGE_CACHE, vorlage);
}
const idTreffer = [...vorlage.toString("latin1").matchAll(/\/ID\s*\[\s*<([0-9A-Fa-f]{32})>/g)];
if (!idTreffer.length) fehler("Vorlage hat keine /ID");
const vorlageId = idTreffer[idTreffer.length - 1][1].toUpperCase();
const php = readFileSync(path.join(QUELLE, "annahme.php"), "utf8");
const konstante = php.match(/const VORLAGE_ID = '([0-9A-F]{32})';/);
if (!konstante) fehler("VORLAGE_ID in annahme.php nicht gefunden");
if (konstante[1] !== vorlageId) fehler(`VORLAGE_ID in annahme.php (${konstante[1]}) ≠ /ID der Vorlage (${vorlageId}) – in annahme.php nachtragen`);
console.log(`Vorlage: /ID ${vorlageId} = VORLAGE_ID in annahme.php`);

// 2. PHP-Syntax
try {
  for (const d of ["annahme.php", "einstellungen.beispiel.php", "lib/PHPMailer/PHPMailer.php", "lib/PHPMailer/SMTP.php", "lib/PHPMailer/Exception.php"]) {
    execFileSync("php", ["-l", path.join(QUELLE, d)], { stdio: "pipe" });
  }
  console.log("PHP-Syntax: in Ordnung");
} catch (e) {
  if (e.code === "ENOENT") console.log("PHP-Syntax: nicht geprüft (php fehlt)");
  else fehler("PHP-Syntaxfehler: " + (e.stdout || e.message));
}

// 3. Ordner "formular/" zusammenstellen
rmSync(AUS, { recursive: true, force: true });
rmSync(ZIP, { force: true });
const ziel = path.join(AUS, "formular");
mkdirSync(path.join(ziel, "daten"), { recursive: true });
for (const d of ["annahme.php", "index.html", ".htaccess"]) copyFileSync(path.join(QUELLE, d), path.join(ziel, d));
copyFileSync(path.join(QUELLE, "einstellungen.beispiel.php"), path.join(ziel, "einstellungen.php"));
copyFileSync(path.join(QUELLE, "daten", ".htaccess"), path.join(ziel, "daten", ".htaccess"));
cpSync(path.join(QUELLE, "lib"), path.join(ziel, "lib"), { recursive: true });
execFileSync("zip", ["-q", "-r", "-X", ZIP, "formular"], { cwd: AUS });
const inhalt = execFileSync("unzip", ["-Z1", ZIP]).toString().trim().split("\n");
for (const muss of ["formular/annahme.php", "formular/.htaccess", "formular/einstellungen.php", "formular/lib/.htaccess", "formular/daten/.htaccess", "formular/lib/PHPMailer/PHPMailer.php"]) {
  if (!inhalt.includes(muss)) fehler("fehlt im ZIP: " + muss);
}
if (inhalt.some((d) => /test|beispiel|\.md$|\.DS_Store/.test(d))) fehler("ZIP enthält Test- oder Doku-Dateien: " + inhalt.filter((d) => /test|beispiel|\.md$|\.DS_Store/.test(d)).join(", "));
console.log(`ZIP: ${path.relative(ROOT, ZIP)} (${inhalt.filter((d) => !d.endsWith("/")).length} Dateien, Ordner formular/)`);
