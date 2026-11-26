// Bestellung für dein Team /bestellung/ (25.11.2026) – Prototyp einer Bestellseite für Trainerinnen und Trainer.
// Am Handy wird für die eigene Mannschaft Vereinskleidung je Person und Teambedarf (Trainingsmaterial) zusammengestellt;
// ein Knopf öffnet das eigene Mailprogramm mit der fertigen Mail an die interne Bestelladresse (mailto). Es gibt keinen
// Server, kein Konto und keine Datenbank; der Entwurf bleibt nur auf dem Gerät (localStorage).
//
// Code-Schutz: Die Seite öffnet sich nur mit einem Code (nur für Trainerinnen und Trainer). Das Repo und GitHub Pages sind öffentlich; die
// Preise laut Angebot (Listenpreise, Rabatt, Preise je Aufdruck) liegen darum nur verschlüsselt im Paket data/bestellung-preise.enc.json
// (AES-GCM, Schlüssel aus dem Code per PBKDF2; assets/js/bestellung/zugang.js, erzeugt mit tools/bestellung-zugang.mjs). Der Bau bettet das
// Paket als „preiseVerschluesselt“ in die Konfiguration ein. Im ausgelieferten HTML stehen nur Kopf, Prototyp-Hinweis und Zugangsbox; das
// Formular und alle Texte mit Preisen baut seite.js erst nach dem Entschlüsseln (assets/js/bestellung/formular.js).
//
// Aufbau: Dieses Modul baut nur die Hülle (Kopf, Zugangsbox, leerer Platz für das Formular) und bettet die Konfiguration ein
// (#bestellung-konfig: data/bestellung.json ohne Preise, die Mannschaften aus data/teams.json und das verschlüsselte Preispaket). Die Karten
// je Person, die Prüfung und die Mail baut das Skript assets/js/bestellung/seite.js im Browser; Betreff, Text und mailto kommen aus
// assets/js/bestellung/mailtext.js (reine Funktionen, in Node getestet: tools/bestellung-test/).
//
// Ein Prototyp: nicht im Menü, nicht in der Sitemap (ohneSitemap in seite(), tools/build.mjs), nicht im appack-Paket
// (tools/appack-paket.mjs: AUSGESCHLOSSENE_DATEIEN). Den Prüfmodus (Hinweis oben, „[TEST]“ im Betreff, Testzeile in der
// Mail) schaltet data/bestellung.json › einstellungen › pruefmodus; zum Livegang auf false setzen und neu bauen.
//
// Nur für Tests: Die Umgebungsvariable BESTELLUNG_PREISE_ENC=<Datei> ersetzt data/bestellung-preise.enc.json für diesen Bau (ein mit einem
// Testcode verschlüsseltes Paket mit erfundenen Preisen), ohne dass die Datei im Repo angefasst wird. Sie wirkt nur beim Bau.

import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pruefeKonfig } from "../../assets/js/bestellung/mailtext.js";
import { pruefePaket } from "../../assets/js/bestellung/zugang.js";

// Diese Seite liegt als Workspace-Seite unter docs/ws/ (build.mjs schreibt nur den Inhalt um, nicht den Kopf):
// die Pfade in kopfZusatz gelten daher schon für docs/ws/.
const PFAD_WS = "../";

// JSON sicher in ein <script type="application/json"> einbetten ("</script>" und "<!--" dürfen im Text nicht vorkommen).
function jsonImSkript(wert) {
  return JSON.stringify(wert).replace(/</g, "\\u003c");
}

// Das verschlüsselte Preispaket: data/bestellung-preise.enc.json (in den Daten des Baus unter „bestellung-preise.enc“) oder, nur für Tests,
// die Datei aus BESTELLUNG_PREISE_ENC. Ein beschädigtes oder fehlendes Paket bricht den Bau nicht ab: Die Seite zeigt dann einen klaren
// Hinweis (seite.js), und der Bau meldet es hier. Eine unlesbare Datei aus der Testvariable bricht ab.
function ladePreisPaket(daten) {
  const pfad = globalThis.process?.env?.BESTELLUNG_PREISE_ENC;
  let paket;
  let herkunft = "data/bestellung-preise.enc.json";
  if (pfad) {
    const voll = path.resolve(pfad);
    let inhalt;
    try {
      inhalt = readFileSync(voll, "utf8");
    } catch (fehler) {
      throw new Error(`BESTELLUNG_PREISE_ENC: Die Datei ${voll} lässt sich nicht lesen (${fehler.code ?? fehler.message}).`);
    }
    try {
      paket = JSON.parse(inhalt);
    } catch {
      throw new Error(`BESTELLUNG_PREISE_ENC: ${voll} ist kein gültiges JSON.`);
    }
    herkunft = "BESTELLUNG_PREISE_ENC " + voll;
  } else {
    paket = daten ? daten["bestellung-preise.enc"] : undefined;
  }
  if (paket === undefined) {
    console.warn(`Bestellseite: ${herkunft} fehlt – die Seite zeigt statt des Zugangs einen Hinweis. Erzeugen mit: node tools/bestellung-zugang.mjs`);
    return null;
  }
  try {
    pruefePaket(paket);
  } catch (fehler) {
    console.warn(`Bestellseite: ${herkunft}: ${fehler.message} Die Seite zeigt dann einen Hinweis statt des Zugangs.`);
  }
  return paket;
}

// Die Bilder der Artikelzeilen (Kacheln 144 x 144, erzeugt mit tools/bestellung-bilder.py) liegen unter assets/bilder/bestellung/; kopiereAssets()
// (tools/build.mjs) nimmt sie mit nach docs/assets/bilder/bestellung/. Der Ordner wird vom Modul aus gesucht (nicht vom Arbeitsordner des Prozesses
// aus): So stimmt er auch im Wegwerf-Bau der Tests, der src/ und assets/ zusammen kopiert.
const BILDER_ORDNER = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "assets", "bilder", "bestellung");

// Jedes „bild“ in data/bestellung.json muss als Datei da sein (der Name selbst ist schon von pruefeKonfig geprüft: nur a–z, 0–9, „-“ und .webp,
// also kein Pfad nach außen). Sonst bräche die Seite mit leeren Kacheln aus: Der Bau bricht ab und sagt, was fehlt und wie man es erzeugt.
function pruefeBilder(konfig) {
  for (const a of konfig.artikel) {
    if (a.bild === undefined) continue;
    let vorhanden = false;
    try {
      const info = statSync(path.join(BILDER_ORDNER, a.bild));
      vorhanden = info.isFile() && info.size > 0;
    } catch {
      vorhanden = false;
    }
    if (!vorhanden) {
      throw new Error(
        `Bestellseite: Das Bild „${a.bild}“ von Artikel „${a.id}“ (data/bestellung.json) fehlt oder ist leer: assets/bilder/bestellung/${a.bild}. ` +
          "Erzeugen mit: python3 tools/bestellung-bilder.py <Quellordner> (oder den Eintrag „bild“ bei dem Artikel entfernen)."
      );
    }
  }
}

// Konfiguration der Seite: data/bestellung.json (ohne den Pflegehinweis) plus die Mannschaften aus data/teams.json
// (Reihenfolge der Datei; angezeigt wird name, die Bestell-Nr. nutzt slug) und das verschlüsselte Preispaket (preiseVerschluesselt).
// Preise stehen nie darin. Wird auch von den Tests benutzt.
export function baueKonfig(daten) {
  const roh = daten && daten.bestellung;
  if (!roh) throw new Error("bestellung.mjs: data/bestellung.json fehlt");
  const { _hinweis, ...rest } = roh;
  const teams = Array.isArray(daten.teams) ? daten.teams : [];
  const konfig = { ...rest, mannschaften: teams.map((t) => ({ slug: t.slug, name: t.name })), preiseVerschluesselt: ladePreisPaket(daten) };
  if (konfig.mannschaften.length === 0) console.warn("Bestellseite: data/teams.json enthält keine Mannschaften – die Auswahl auf der Seite bleibt leer.");
  pruefeKonfig(konfig);
  pruefeBilder(konfig);
  return konfig;
}

// ---------- Hülle ----------

function kopfAbschnitt(konfig) {
  const pruefmodus = konfig.einstellungen.pruefmodus
    ? `
    <div class="hinweis hinweis--info bst-pruefmodus" role="note">
      <p><strong>Prototyp:</strong> Die Mail geht als TEST an die Bestelladresse und löst keine Bestellung aus.</p>
    </div>`
    : "";
  return `<header class="bst-kopf">${pruefmodus}
    <h1 id="bst-titel" tabindex="-1">Bestellung für dein Team</h1>
  </header>
  <noscript><div class="hinweis hinweis--offen"><p>Diese Seite braucht JavaScript. Bitte schalte es in deinem Browser ein.</p></div></noscript>
  <div class="hinweis hinweis--offen bst-ladefehler" data-bst-ladefehler hidden role="alert"><p>Die Seite konnte nicht geladen werden. Bitte lade sie neu.</p></div>`;
}

// Die Zugangsbox: das Einzige, was man ohne Code sieht (seite.js blendet sie nach dem Entschlüsseln aus und das Formular ein).
function zugangsbox() {
  return `<section class="bst-zugang" data-bst-zugang aria-labelledby="bst-titel">
    <p class="bst-lead">Diese Seite ist für Trainerinnen und Trainer. Gib den Code ein, den du vom Verein bekommen hast.</p>
    <form class="bst-zugang__form" data-bst-zugang-form novalidate>
      <div class="bst-feld">
        <label for="bst-code">Code</label>
        <input type="text" id="bst-code" name="code" data-bst-code autocomplete="off" autocapitalize="characters" autocorrect="off" spellcheck="false" maxlength="40">
      </div>
      <p class="bst-zugang__meldung" data-bst-zugang-meldung role="status"></p>
      <button type="submit" class="knopf knopf--gross bst-zugang__knopf" data-bst-oeffnen>Öffnen</button>
    </form>
  </section>`;
}

export function seite(daten) {
  const konfig = baueKonfig(daten);
  const inhalt = `<div class="bst" id="bestellung" data-bst-wurzel data-zustand="zu">
  ${kopfAbschnitt(konfig)}
  ${zugangsbox()}
  <div class="bst-app" data-bst-app hidden></div>
</div>
<script type="application/json" id="bestellung-konfig">${jsonImSkript(konfig)}</script>`;

  return {
    url: "/bestellung/",
    title: "Bestellung für dein Team",
    description:
      "Bestellung für dein Team: Vereinskleidung je Person und Trainingsmaterial zusammenstellen und als fertige Mail an den Verein schicken.",
    // Führendes "\n": workspace.html setzt "{{kopfZusatz}}" ans Ende der Stylesheet-Zeile. noindex: Prototyp, nicht in Suchmaschinen.
    // ohneSitemap: tools/build.mjs lässt die Seite aus docs/sitemap.xml weg (wie die Trainerseite).
    ohneSitemap: true,
    kopfZusatz:
      "\n" +
      [
        `<meta name="robots" content="noindex">`,
        `<link rel="stylesheet" href="${PFAD_WS}assets/css/bestellung.css">`,
        `<link rel="modulepreload" href="${PFAD_WS}assets/js/bestellung/mailtext.js">`,
        `<link rel="modulepreload" href="${PFAD_WS}assets/js/bestellung/zugang.js">`,
        `<link rel="modulepreload" href="${PFAD_WS}assets/js/bestellung/formular.js">`,
        `<script type="module" src="${PFAD_WS}assets/js/bestellung/seite.js"></script>`,
      ].join("\n"),
    inhalt,
    bodyclass: "bestellung",
  };
}
