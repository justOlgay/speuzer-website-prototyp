// Bau mit Testpreisen für die Browser-Tests der Bestellseite (nur Tests).
//
// Die Tests hängen nicht an der mitgelieferten Datei data/bestellung-preise.enc.json (die der Verein vor dem Livegang durch das Paket mit den
// echten Preisen ersetzt). Statt dessen wird die Seite in einem Wegwerf-Ordner unter tools/cache/ neu gebaut, und zwar mit einem frisch
// verschlüsselten Paket der erfundenen Testpreise (testdaten.mjs) über die Umgebungsvariable BESTELLUNG_PREISE_ENC (src/seiten/bestellung.mjs).
// Der Arbeitsordner bleibt unberührt: weder docs/ noch dist/ noch data/ ändern sich. Kopiert werden nur Quellen, Daten und Assets; node_modules
// ist ein Verweis auf das Original.

import { copyFileSync, cpSync, existsSync, mkdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { TESTPREISE, testPaket } from "./testdaten.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const BAU = path.join(ROOT, "tools", "cache", "bestellung-test", "bau");

// Baut mit dem Paket der Testpreise (Standard) oder einem anderen Paket (paket); gibt den docs-Ordner des Wegwerf-Baus zurück.
export async function baueMitTestdaten({ paket = null } = {}) {
  rmSync(BAU, { recursive: true, force: true });
  mkdirSync(path.join(BAU, "tools"), { recursive: true });
  for (const ordner of ["assets", "data", "src"]) cpSync(path.join(ROOT, ordner), path.join(BAU, ordner), { recursive: true });
  copyFileSync(path.join(ROOT, "package.json"), path.join(BAU, "package.json"));
  for (const datei of ["build.mjs", "og-standard.html"]) copyFileSync(path.join(ROOT, "tools", datei), path.join(BAU, "tools", datei));
  symlinkSync(realpathSync(path.join(ROOT, "node_modules")), path.join(BAU, "node_modules"));
  const paketDatei = path.join(BAU, "preise-test.enc.json");
  const inhalt = paket || (await testPaket({ preise: TESTPREISE }));
  writeFileSync(paketDatei, JSON.stringify(inhalt, null, 2) + "\n", "utf8");
  const r = spawnSync(process.execPath, ["tools/build.mjs"], { cwd: BAU, env: { ...process.env, BESTELLUNG_PREISE_ENC: paketDatei }, encoding: "utf8" });
  const ausgabe = (r.stdout || "") + (r.stderr || "");
  if (r.status !== 0 || !existsSync(path.join(BAU, "docs", "ws", "bestellung.html"))) {
    throw new Error(`Bau mit Testpreisen gescheitert (Exit ${r.status}):\n${ausgabe.slice(-1500)}`);
  }
  return { docs: path.join(BAU, "docs"), paketDatei, paket: inhalt, ausgabe };
}

// Als eigenes Programm: baut und nennt den Ordner (zum Ansehen mit tools/bestellung-test/testserver.mjs)
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = await baueMitTestdaten();
  console.log("Gebaut nach " + path.relative(ROOT, r.docs));
}
