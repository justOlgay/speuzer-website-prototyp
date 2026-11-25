// Neu im Trainerteam – Live-Seite als Workspace-Seite (Stufe 2, 24.11.2026).
//
// Eine öffentlich erreichbare Seite, die sich nur mit einem Code öffnet. Neue Trainer, Co-Trainer und Betreuer des FFV Sportfreunde 04
// erledigen darin alles in einem Zug am Handy (Angaben, Passfoto, Verhaltenskodex, Selbstauskunft, Antrag auf Gebührenbefreiung für das
// erweiterte Führungszeugnis, Unterschrift) und schicken die erzeugten Dateien selbst per E-Mail an die Geschäftsstelle. Nichts wird
// übertragen, es gibt kein Backend. Die Seite selbst baut das Skript assets/js/anmeldung/trainer.js im Browser; dieses Modul baut nur den
// Rahmen (Seitenkopf, Platz für die Seite, Impressum und Datenschutz) und bettet die Konfiguration ein (#trainer-konfig).
//
// Anders als anmeldung.mjs gibt es hier nur die Live-Fassung: keine Begleitseite für die Vorführung (/trainerteam/ entsteht nicht),
// kein Eintrag in der Sitemap und keiner im Menü, noindex. tools/build.mjs nimmt die Seite nur auf, wenn der Schalter TRAINER_LIVE
// (src/vorlagen/hilfen.mjs) an ist, und ruft dafür seiteLive() auf. Dieses Modul darf auch ohne den Schalter geladen werden: Beim Laden
// geschieht nichts (tools/build.mjs überspringt Module in src/begleit/, die kein seite() haben, aber seiteLive()).
//
// Konfiguration (SCHNITTSTELLEN: GEMEINSAM.md 4.1, Kopfkommentar von assets/js/anmeldung/trainer.js). Quelle ist data/trainer.json; alles,
// was andere Dateien schon kennen, leitet baueKonfig() daraus ab und pflegt es nicht ein zweites Mal:
//   verein.name, name_register, mail   data/verein.json (name_kurz, name_register, mail)
//   verein.ort, verein.anschrift       data/verein.json (sportstaette = Besuchsadresse, post = Postfach; wie Impressum und Kontakt)
//   verein.satzungUrl                  data/downloads.json (Eintrag „Satzung …“, wie anmeldung.mjs)
//   mannschaften, abteilungen          data/teams.json (nur Kategorien aus data/trainer.json › mannschaften, Standard „Jugend“) und
//                                      data/karneval.json (Gruppen), abzüglich mannschaften › ausgenommen; abteilungen (Standard: nur „fussball“,
//                                      der Karneval fehlt vorerst) sagt, welche Abteilungen die Seite anbietet
//   quellen (pdf-lib, fontkit, Schrift) trägt erst tools/appack-paket.mjs ins Paket ein (wie beim Anmelde-Assistenten); die Fassung in
//                                      docs/ws/ hat keine „quellen“ und lädt die Werkzeuge von GitHub Pages aus assets/ (Standard von
//                                      trainer-pdf-lader.js)
// Der Bau bricht mit einer klaren Meldung ab (TrainerKonfigFehler), wenn die Konfiguration nicht stimmt: keine Prüfwerte oder einer, der kein
// SHA-256 ist, keine Einsichtnehmenden oder einer ohne Namen, schnupperMonate nicht von 1 bis 12, kein Unterzeichner, fehlende Vereinsdaten
// (Registername, Anschrift, E-Mail, Ort), keine Mannschaften. Eine leere Liste der Prüfwerte heißt hier NICHT „keine Abfrage“ (so beim
// Anmelde-Assistenten), sondern „die Seite bleibt für jeden Code zu“ (trainer.js); darum bricht der Bau dann ab.
//
// Nur für Tests: Die Umgebungsvariable TRAINER_DATEN=<Datei> ersetzt data/trainer.json für diesen Bau (Testprüfwert, absichtlich falsche
// Konfiguration), ohne dass die Datei im Repo angefasst wird. Das ausgelieferte Paket kennt keine Hintertür: Die Variable wirkt nur beim Bau.

import { readFileSync } from "node:fs";
import path from "node:path";
import T from "../../assets/js/anmeldung/texte/trainer-de.js";
import { ersetzePlatzhalter } from "../../assets/js/anmeldung/hilfen.js";
import { PRUEFWERT_MUSTER } from "../../assets/js/anmeldung/zugang.js";

// Die Seite liegt unter "/trainerteam/" (Workspace-Datei docs/ws/trainerteam.html, im Paket web/trainerteam.html).
export const TRAINER_URL = "/trainerteam/";

// Der Bau fängt diesen Fehler ab und zeigt nur die Meldung (kein Stapel von Aufrufen).
export class TrainerKonfigFehler extends Error {}

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// JSON sicher in ein <script type="application/json"> einbetten ("</script>" und "<!--" dürfen im Text nicht vorkommen).
function jsonImSkript(wert) {
  return JSON.stringify(wert).replace(/</g, "\\u003c");
}

const text = (x) => (typeof x === "string" ? x.trim() : "");
const istObjekt = (x) => !!x && typeof x === "object" && !Array.isArray(x);

// ---------- Quelle: data/trainer.json (oder, nur für Tests, TRAINER_DATEN) ----------

function ladeQuelle(daten) {
  const pfad = globalThis.process?.env?.TRAINER_DATEN;
  if (pfad) {
    const voll = path.resolve(pfad);
    let inhalt;
    try {
      inhalt = readFileSync(voll, "utf8");
    } catch (fehler) {
      throw new TrainerKonfigFehler(`TRAINER_DATEN: Die Datei ${voll} lässt sich nicht lesen (${fehler.code ?? fehler.message}).`);
    }
    try {
      return { quelle: JSON.parse(inhalt), herkunft: "TRAINER_DATEN " + voll, test: true };
    } catch {
      throw new TrainerKonfigFehler(`TRAINER_DATEN: ${voll} ist kein gültiges JSON.`);
    }
  }
  if (!istObjekt(daten?.trainer)) throw new TrainerKonfigFehler("data/trainer.json fehlt oder ist kein Objekt.");
  return { quelle: daten.trainer, herkunft: "data/trainer.json", test: false };
}

// ---------- abgeleitete Vereinsdaten ----------

// Adresse der Satzung aus data/downloads.json (Eintrag "Satzung …"), nie fest im Code und nicht noch einmal in data/trainer.json (wie
// anmeldung.mjs › satzungUrl). Die Adresse aus dem Papier-Vordruck führt ins Leere und wird nicht benutzt. Fehlt der Eintrag, bleibt die
// Adresse leer: Die Seite zeigt dann einen Hinweis statt des Links, und der Bau meldet es.
function satzungUrl(daten) {
  const liste = Array.isArray(daten.downloads) ? daten.downloads : [];
  const eintrag = liste.find((d) => d && /^satzung\b/i.test(String(d.titel ?? "")));
  const url = eintrag && typeof eintrag.datei === "string" ? eintrag.datei.trim() : "";
  if (!/^https:\/\//.test(url)) {
    console.warn('trainerteam.mjs: In data/downloads.json fehlt der Eintrag "Satzung" mit https-Adresse – die Seite zeigt keinen Link zur Satzung.');
    return "";
  }
  return url;
}

// Auswahl „Mannschaft“ (bei Karneval „Gruppe“), in der Reihenfolge der Dateien, mit den Namen, die der Verein auf Website und App nennt.
// Ein erweitertes Führungszeugnis gibt es nur für Tätigkeiten mit Kontakt zu Minderjährigen (§ 30a Abs. 1 Nr. 2 BZRG; Gegenprüfung vom
// 24.11.2026, Befund F2). Darum bietet die Seite aus data/teams.json nur Mannschaften an, deren Kategorie in data/trainer.json ›
// mannschaften › kategorien steht (Standard „Jugend“: Herren und Soma fehlen), dazu die Gruppen aus data/karneval.json. Namen in
// mannschaften › ausgenommen (Mannschaft oder Gruppe) fehlen zusätzlich. mannschaften › abteilungen sagt, welche Abteilungen die Seite überhaupt
// anbietet („fussball“, „karneval“): Seit 24.11.2026 nur „fussball“ (Melli: „KV erstmal außen vor lassen“); ohne die Abteilung gibt es weder
// ihre Mannschaften noch die Frage danach.
function mannschaftenAus(daten, abteilungen, kategorien, ausgenommen) {
  const teams = Array.isArray(daten.teams) ? daten.teams : [];
  const gruppen = Array.isArray(daten.karneval?.gruppen) ? daten.karneval.gruppen : [];
  const dabei = new Set(kategorien);
  const weg = new Set(ausgenommen);
  return [
    ...(abteilungen.includes("fussball") ? teams.filter((t) => dabei.has(text(t?.kategorie))).map((t) => ({ abteilung: "fussball", name: text(t?.name) })) : []),
    ...(abteilungen.includes("karneval") ? gruppen.map((g) => ({ abteilung: "karneval", name: text(g?.name) })) : []),
  ].filter((m) => m.name && !weg.has(m.name));
}

// Alle Namen aus data/teams.json und data/karneval.json (zum Prüfen von „ausgenommen“)
function alleNamen(daten) {
  const teams = Array.isArray(daten.teams) ? daten.teams : [];
  const gruppen = Array.isArray(daten.karneval?.gruppen) ? daten.karneval.gruppen : [];
  return new Set([...teams, ...gruppen].map((x) => text(x?.name)).filter(Boolean));
}

// ---------- Konfiguration für die Seite ----------

// Baut die Konfiguration der Seite (ohne „quellen“, siehe oben) und nennt, woher sie kommt. Wirft TrainerKonfigFehler mit allen gefundenen
// Fehlern.
function baue(daten) {
  const { quelle, herkunft, test } = ladeQuelle(daten);
  const probleme = [];
  const fehler = (meldung) => probleme.push(meldung);
  const q = istObjekt(quelle) ? quelle : {};
  const wo = herkunft.startsWith("TRAINER_DATEN") ? "TRAINER_DATEN-Datei" : "data/trainer.json";

  // Zugang: mindestens ein Prüfwert, jeder ein SHA-256 in Hexschreibweise (64 Zeichen, klein)
  const z = istObjekt(q.zugang) ? q.zugang : null;
  const parameter = text(z?.parameter) || "code";
  const pruefwerte = Array.isArray(z?.pruefwerte) ? z.pruefwerte : null;
  if (!pruefwerte) {
    fehler(`${wo} › zugang › pruefwerte fehlt: Die Seite braucht die Liste der Prüfwerte (SHA-256 des Codes). Setzen mit: node tools/trainer-zugang.mjs --neu --blatt <Ordner>`);
  } else if (!pruefwerte.length) {
    fehler(`${wo} › zugang › pruefwerte ist leer: Die Seite bliebe für jeden Code zu. Code erzeugen und Prüfwert eintragen mit: node tools/trainer-zugang.mjs --neu --blatt <Ordner>`);
  } else {
    pruefwerte.forEach((wert, i) => {
      if (typeof wert !== "string" || !PRUEFWERT_MUSTER.test(wert)) fehler(`${wo} › zugang › pruefwerte: Eintrag ${i + 1} ist kein SHA-256 in Hexschreibweise (64 Zeichen, klein).`);
    });
  }
  if (!/^[A-Za-z][A-Za-z0-9_-]{0,31}$/.test(parameter)) fehler(`${wo} › zugang › parameter: "${parameter}" ist kein brauchbarer Name für den Adressparameter.`);

  // Einsichtnehmende: mindestens ein Eintrag, jeder mit Namen (die Funktion ist freiwillig, siehe trainer-einsicht.js)
  const einsichtListe = Array.isArray(q.einsicht) ? q.einsicht : null;
  if (!einsichtListe || !einsichtListe.length) fehler(`${wo} › einsicht ist leer oder fehlt: Es braucht mindestens eine Person, der das Führungszeugnis gezeigt wird (name, funktion).`);
  else {
    einsichtListe.forEach((p, i) => {
      if (!istObjekt(p) || !text(p.name)) fehler(`${wo} › einsicht: Eintrag ${i + 1} hat keinen Namen.`);
    });
  }

  // Fristen
  const schnupper = q.schnupperMonate;
  if (!Number.isInteger(schnupper) || schnupper < 1 || schnupper > 12) fehler(`${wo} › schnupperMonate muss eine ganze Zahl von 1 bis 12 sein (gefunden: ${JSON.stringify(schnupper)}).`);
  const zeugnisJahre = q.zeugnisJahre;
  if (!Number.isInteger(zeugnisJahre) || zeugnisJahre < 0 || zeugnisJahre > 20) fehler(`${wo} › zeugnisJahre muss eine ganze Zahl von 0 bis 20 sein (gefunden: ${JSON.stringify(zeugnisJahre)}).`);

  // Unterzeichner des Antrags auf Gebührenbefreiung
  const unterzeichner = istObjekt(q.verein?.unterzeichner) ? q.verein.unterzeichner : null;
  if (!unterzeichner || !text(unterzeichner.name) || !text(unterzeichner.funktion)) fehler(`${wo} › verein › unterzeichner fehlt oder ist unvollständig (name und funktion).`);

  // Vereinsdaten: aus data/verein.json abgeleitet, nicht in data/trainer.json
  const v = istObjekt(daten.verein) ? daten.verein : {};
  const sportstaette = istObjekt(v.sportstaette) ? v.sportstaette : {};
  const post = istObjekt(v.post) ? v.post : {};
  const name = text(v.name_kurz) || "FFV Sportfreunde 04";
  const nameRegister = text(v.name_register);
  const mail = text(v.mail);
  const ort = text(sportstaette.ort);
  const anschrift = {
    postfach: text(post.postfach),
    postfachPlz: text(post.plz),
    postfachOrt: text(post.ort),
    strasse: text(sportstaette.strasse),
    plz: text(sportstaette.plz),
    ort,
  };
  if (!nameRegister) fehler("data/verein.json › name_register fehlt (Name des Vereins im Register, steht in der Datenschutzinformation der PDF).");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) fehler("data/verein.json › mail fehlt oder ist keine E-Mail-Adresse (Geschäftsstelle).");
  if (!ort) fehler("data/verein.json › sportstaette › ort fehlt (Ort für „Ort und Datum“).");
  const fehlendeAnschrift = Object.entries(anschrift).filter(([, wert]) => !wert).map(([schluessel]) => schluessel);
  if (fehlendeAnschrift.length) fehler(`data/verein.json › sportstaette (strasse, plz, ort) und post (postfach, plz, ort): Es fehlt ${fehlendeAnschrift.join(", ")} (Anschrift des Vereins in der Datenschutzinformation der PDF).`);

  // Mannschaften: aus data/teams.json (nur die Kategorien aus data/trainer.json) und data/karneval.json abgeleitet
  const ma = istObjekt(q.mannschaften) ? q.mannschaften : null;
  const abteilungen = Array.isArray(ma?.abteilungen) ? ma.abteilungen : null;
  const kategorien = Array.isArray(ma?.kategorien) ? ma.kategorien : null;
  const ausgenommen = Array.isArray(ma?.ausgenommen) ? ma.ausgenommen : null;
  const nurText = (liste) => liste.every((x) => typeof x === "string" && text(x));
  let mannschaftenOk = true;
  if (!ma) {
    mannschaftenOk = false;
    fehler(`${wo} › mannschaften fehlt: abteilungen ("fussball", "karneval"), kategorien (Kategorien aus data/teams.json, zum Beispiel "Jugend") und ausgenommen (Namen, die fehlen sollen; leer erlaubt).`);
  } else {
    if (!abteilungen || !abteilungen.length || abteilungen.some((x) => x !== "fussball" && x !== "karneval") || new Set(abteilungen).size !== abteilungen.length) {
      mannschaftenOk = false;
      fehler(`${wo} › mannschaften › abteilungen muss eine nicht leere Liste aus "fussball" und "karneval" sein (jeder Wert höchstens einmal).`);
    }
    if (!kategorien || !kategorien.length || !nurText(kategorien)) {
      mannschaftenOk = false;
      fehler(`${wo} › mannschaften › kategorien muss eine nicht leere Liste von Kategorien aus data/teams.json sein (zum Beispiel "Jugend").`);
    }
    if (!ausgenommen || !nurText(ausgenommen)) {
      mannschaftenOk = false;
      fehler(`${wo} › mannschaften › ausgenommen muss eine Liste von Namen sein (leer erlaubt).`);
    } else {
      const bekannt = alleNamen(daten);
      ausgenommen.forEach((n) => {
        if (!bekannt.has(text(n))) {
          mannschaftenOk = false;
          fehler(`${wo} › mannschaften › ausgenommen: „${text(n)}“ gibt es weder in data/teams.json noch in data/karneval.json.`);
        }
      });
    }
  }
  const mannschaften = mannschaftenOk ? mannschaftenAus(daten, abteilungen, kategorien.map(text), ausgenommen.map(text)) : [];
  if (mannschaftenOk && !mannschaften.length) {
    fehler("Die Liste der Mannschaften ist leer: Mit den Kategorien und Ausnahmen aus data/trainer.json liefern data/teams.json und data/karneval.json keinen Namen.");
  }

  // Kodex: nur ein Link (kein Einbetten, nichts im Repo). Eine Adresse, die kein https ist, wird nicht eingetragen.
  const kodexUrl = text(q.verein?.kodexUrl);
  if (kodexUrl && !/^https:\/\//.test(kodexUrl)) fehler(`${wo} › verein › kodexUrl muss eine https-Adresse sein (gefunden: ${kodexUrl}).`);
  if (!kodexUrl) console.warn(`trainerteam.mjs: ${wo} › verein › kodexUrl fehlt – die Seite zeigt keinen Link zum vollständigen Verhaltenskodex.`);

  if (probleme.length) {
    throw new TrainerKonfigFehler(
      `Die Konfiguration der Seite „Neu im Trainerteam“ stimmt nicht (${probleme.length} Fehler):\n` + probleme.map((p) => "  - " + p).join("\n")
    );
  }

  const konfig = {
    live: true,
    zugang: { parameter, pruefwerte: [...pruefwerte] },
    verein: {
      name,
      name_register: nameRegister,
      mail,
      ort,
      anschrift,
      unterzeichner: { name: text(unterzeichner.name), funktion: text(unterzeichner.funktion) },
      satzungUrl: satzungUrl(daten),
      ...(kodexUrl ? { kodexUrl } : {}),
    },
    einsicht: einsichtListe.map((p) => ({ name: text(p.name), funktion: text(p.funktion) })),
    abteilungen: [...abteilungen],
    mannschaften,
    schnupperMonate: schnupper,
    zeugnisJahre,
  };
  return { konfig, herkunft, test };
}

// Die Konfiguration der Seite (für Tests und für seiteLive).
export function baueKonfig(daten) {
  return baue(daten).konfig;
}

// ---------- Abschnitte der Seite ----------

// Seitenkopf: Überschrift und Lead (ohne Sprachleiste). trainer.js macht den Kopf klein (Klasse anm-kompakt am <main>), sobald die Fragen
// beginnen.
function seitenkopfAbschnitt() {
  return `<section class="abschnitt seitenkopf">
  <div class="container">
    <div class="anm-titelzeile">
      <h1>${escapeHtml(T.seite.h1)}</h1>
    </div>
    <p class="seitenkopf__lead">${escapeHtml(T.seite.lead)}</p>
  </div>
</section>`;
}

// Platz für die Seite. Bis trainer.js startet, steht „wird geladen“ da; ohne JavaScript der Hinweis; scheitert das Laden des Moduls, der Text
// aus data-ladefehler (das Skript im Kopf, siehe unten). {mail} ist die Adresse der Geschäftsstelle.
function assistentAbschnitt(mail) {
  const mit = (satz) => escapeHtml(ersetzePlatzhalter(satz, { mail }));
  return `<section class="abschnitt anm-assistent-abschnitt" aria-labelledby="anm-assistent-titel">
  <div class="container">
    <h2 class="sr-only" id="anm-assistent-titel">${escapeHtml(T.seite.assistentTitel)}</h2>
    <div class="anm" id="anmeldung" data-anm-wurzel data-ladefehler="${mit(T.seite.ladefehler)}">
      <p class="anm-laden" data-anm-laden>${mit(T.seite.laedt)}</p>
      <noscript><div class="hinweis hinweis--offen"><p>${mit(T.seite.ohneSkript)}</p></div></noscript>
    </div>
  </div>
</section>`;
}

// Impressum und Datenschutz am Ende der Seite (wie anmeldung.mjs › rechtlichesAbschnitt): Die Seite steht ohne Hülle da (Link aus einer
// E-Mail, QR-Code) und hätte sonst keinen Weg dorthin. Die Zielseiten liegen im selben Ordner (docs/ws, im Paket web/).
function rechtlichesAbschnitt() {
  return `<section class="abschnitt anm-rechtliches" lang="de">
  <div class="container">
    <p class="anm-rechtliches__zeile" dir="ltr"><a href="impressum.html" target="_blank" rel="noopener">Impressum</a> · <a href="datenschutz.html" target="_blank" rel="noopener">Datenschutz</a></p>
  </div>
</section>`;
}

// Start der Seite: lädt trainer.js und ruft startTrainer mit der Konfiguration auf. Der Import steht in dieser Schreibweise, weil
// tools/appack-paket.mjs ihn für das flache Paket auf ./anmeldung-trainer.js umschreibt (genau eine Stelle, sonst bricht der Bau ab).
// Scheitert etwas (Modul nicht erreichbar, Konfiguration nicht lesbar), steht der Text „Ladefehler“ da und nicht ein leerer Bildschirm.
const STARTSKRIPT = `<script type="module">
(async () => {
  const wurzel = document.getElementById("anmeldung");
  try {
    const { startTrainer } = await import("../assets/js/anmeldung/trainer.js");
    await startTrainer(wurzel, JSON.parse(document.getElementById("trainer-konfig").textContent));
  } catch (fehler) {
    console.error("Trainerseite: Start fehlgeschlagen", fehler);
    wurzel.textContent = wurzel.getAttribute("data-ladefehler") || "";
  }
})();
</script>`;

// ---------- Live-Seite ----------

// Titel: Der Bau hängt „ – FFV Sportfreunde 04“ selbst an; steht es schon im Text (seite.titel), wird es hier abgeschnitten, damit es nicht
// doppelt im <title> steht.
const VEREINS_SUFFIX = " – FFV Sportfreunde 04";
const TITEL = T.seite.titel.endsWith(VEREINS_SUFFIX) ? T.seite.titel.slice(0, -VEREINS_SUFFIX.length) : T.seite.titel;

// Workspace-Seite docs/ws/trainerteam.html (tools/build.mjs, wenn TRAINER_LIVE an ist; Name aus url "/trainerteam/").
// Der Rahmen kommt von workspace.html (wie bei den übrigen Seiten des Pakets, ohne Kopfleiste und Begleitfuß). Die Pfade in kopfZusatz
// gelten schon für docs/ws/ ("../assets/…"): tools/build.mjs schreibt nur den Inhalt um, nicht den Kopf. Das Paket
// (tools/appack-paket.mjs) setzt Stylesheets und Skript auf die Dateien im Ordner web/ und trägt die Quellen von pdf-lib, fontkit und Schrift
// in die Konfiguration ein; docs/ws/trainerteam.html selbst läuft auch auf GitHub Pages (Standardpfade, keine „quellen“).
// ohneSitemap: tools/build.mjs lässt die Seite aus docs/sitemap.xml weg (geschützt, nicht zum Auffinden gedacht).
export function seiteLive(daten) {
  const { konfig, herkunft, test } = baue(daten);
  if (test) console.log(`  Trainerseite: Konfiguration aus ${herkunft} (nur für Tests)`);
  const inhalt = [
    seitenkopfAbschnitt(),
    assistentAbschnitt(konfig.verein.mail),
    rechtlichesAbschnitt(),
    `<script type="application/json" id="trainer-konfig">${jsonImSkript(konfig)}</script>`,
  ].join("\n");

  return {
    url: TRAINER_URL,
    title: TITEL,
    description: T.seite.beschreibung,
    ohneSitemap: true,
    // Führendes "\n": workspace.html setzt "{{kopfZusatz}}" ans Ende der Stylesheet-Zeile.
    kopfZusatz: "\n" + [
      `<meta name="robots" content="noindex">`,
      `<link rel="stylesheet" href="../assets/css/anmeldung.css">`,
      `<link rel="stylesheet" href="../assets/css/trainer.css">`,
      STARTSKRIPT,
    ].join("\n"),
    inhalt,
  };
}
