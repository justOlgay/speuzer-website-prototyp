#!/usr/bin/env node
// Prüft die gebaute Konzeptseite docs/anmeldung-konzept/index.html gegen das Regelwerk
// (Arbeitspaket AP-6, Runde 3). Ohne Browser, ohne Abhängigkeiten: liest das HTML der Seite,
// data/anmeldung.json (offenePunkte, faelle, version) und die Namen der Papiere aus den
// deutschen Texten des Prototyps.
//
// Aufruf:   node tools/anmeldung-test/konzept-pruefen.mjs [Seite.html [Regelwerk.json]]
// Vorher:   sh tools/cache/bau-sperre.sh build   (baut docs/anmeldung-konzept/index.html)
// Ende:     Exit 0 nur bei 0 Fehlern. Hinweise (Zeilen mit „Hinweis“) zählen nicht als Fehler.
//
// Was geprüft wird
//   1  Rahmen        noindex, genau eine h1, interne Sprungmarken haben ein Ziel
//   2  Offene Punkte alle P1-Punkte des Regelwerks stehen sichtbar (nicht im Aufklapper) mit ihrer
//                    Nummer auf der Seite; keine Nummer ist unbekannt; jede Nummer hat genau eine Zeile
//                    (Anker #o26); die Priorität an der Zeile stimmt mit dem Regelwerk; der Text der
//                    Zeile passt zur Frage im Regelwerk; es gibt keine Zeile ohne O-Nummer und kein
//                    Kennzeichen „neu“ mehr (Hinweis); O67 (Rechtsgrundlage der Notfallkontakte) und
//                    O68 (Bildschirm-Unterschrift der Vereinsunterlagen) stehen sichtbar mit ihrem Inhalt da;
//                    Punkte mit Status „entschieden“ (O26, Jugendleitung 08.10.2026) tragen das Kennzeichen
//                    „Entschieden“ und den Wortlaut der Entscheidung, haben kein P-Kennzeichen mehr und zählen
//                    nicht als offene P1-Frage; O68 steht weiter offen mit dem Stand der Jugendleitung
//   3  Namen         die Namen der Papiere und die Teile A, B und C stehen so auf der Seite, wie sie im
//                    Prototyp heißen (assets/js/anmeldung/texte); die alten Namen kommen nicht vor;
//                    im Fließtext steht „Spielrecht“
//   4  Endstand      die Punkte a bis h aus dem Auftrag stehen in den Abschnitten „Assistent“, „PDF“ und
//                    „Unterschrift“
//   5  Personendaten keine Telefonnummern, E-Mail-Adressen, IBAN, Geburtsdaten (Muster wie tools/pii-check.py),
//                    keine Anrede mit Nachnamen; Regista-Regel: „Regista“ wird nicht genannt, und Namen aus
//                    der Umgebungsvariable KONZEPT_VERBOTENE_NAMEN (Namensteile, durch Komma getrennt; sie
//                    stehen nicht im Repo) kommen nicht vor
//   6  Stil          nur Vereinsblau (keine eigenen Farbwerte im Stilblock der Seite); mittlere Satzlänge
//                    im Fließtext höchstens 16 Wörter
//
// Die Prüfung nimmt das gebaute HTML, nicht den Quelltext: Was hier durchgeht, steht so auf der Seite.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SEITE = path.resolve(process.argv[2] || path.join(ROOT, "docs", "anmeldung-konzept", "index.html"));
const REGELWERK = path.resolve(process.argv[3] || path.join(ROOT, "data", "anmeldung.json"));
const TEXTE = path.join(ROOT, "assets", "js", "anmeldung", "texte");

// ---------- Ergebnis sammeln ----------

const ergebnis = { fehler: 0, hinweise: 0 };
let gruppeAktuell = "";

function gruppe(titel) {
  gruppeAktuell = titel;
  console.log("\n" + titel);
}

// ok: Bedingung erfüllt. detail: Zeilen, die bei einem Verstoß darunter stehen.
function pruefe(name, ok, detail = [], art = "Fehler") {
  if (ok) {
    console.log("  ok        " + name);
    return;
  }
  if (art === "Hinweis") ergebnis.hinweise += 1;
  else ergebnis.fehler += 1;
  console.log("  " + art.padEnd(9) + " " + name);
  for (const zeile of [].concat(detail).slice(0, 12)) console.log("              " + zeile);
  if ([].concat(detail).length > 12) console.log("              … und " + ([].concat(detail).length - 12) + " weitere");
}

const hinweis = (name, ok, detail) => pruefe(name, ok, detail, "Hinweis");

// ---------- Einlesen ----------

function lies(pfad, was) {
  if (!existsSync(pfad)) {
    console.error(`${was} fehlt: ${pfad}`);
    if (was === "Seite") console.error("Zuerst bauen: sh tools/cache/bau-sperre.sh build");
    process.exit(2);
  }
  return readFileSync(pfad, "utf8");
}

const html = lies(SEITE, "Seite");
const regelwerk = JSON.parse(lies(REGELWERK, "Regelwerk"));
const punkte = regelwerk.offenePunkte || [];

// Namen der Papiere und Teile aus den Texten des Prototyps (eine Quelle für Oberfläche, PDF und diese Seite)
let deRegeln = null;
let deOberflaeche = null;
try {
  deRegeln = (await import(pathToFileURL(path.join(TEXTE, "de-regeln.js")).href)).default;
  deOberflaeche = (await import(pathToFileURL(path.join(TEXTE, "de-oberflaeche.js")).href)).default;
} catch (fehler) {
  console.error("Die Texte des Prototyps lassen sich nicht laden: " + fehler.message);
  process.exit(2);
}

// ---------- Kleines HTML-Modell (die Seite ist erzeugt und wohlgeformt) ----------

const VOID = new Set(["meta", "link", "br", "img", "hr", "input", "source", "col", "area", "base", "wbr", "embed", "param", "track"]);
const BLOCK = new Set(["p", "li", "td", "th", "tr", "div", "section", "h1", "h2", "h3", "h4", "ul", "ol", "table", "thead", "tbody", "summary", "details", "nav", "header", "footer", "main", "caption", "br"]);

function entitaeten(text) {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_m, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_m, d) => String.fromCodePoint(Number(d)))
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function attribute(roh) {
  const aus = {};
  const re = /([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let m;
  while ((m = re.exec(roh))) aus[m[1].toLowerCase()] = entitaeten(m[2] ?? m[3] ?? m[4] ?? "");
  return aus;
}

function parse(quelle) {
  const wurzel = { tag: "#wurzel", attrs: {}, kinder: [], eltern: null };
  let aktuell = wurzel;
  const re = /<!--[\s\S]*?-->|<!doctype[^>]*>|<\/([a-zA-Z][\w:-]*)\s*>|<([a-zA-Z][\w:-]*)((?:\s+[^\s"'<>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*(\/?)>|[^<]+|</gi;
  const klein = quelle.toLowerCase();
  let m;
  while ((m = re.exec(quelle))) {
    const roh = m[0];
    if (roh.startsWith("<!--") || /^<!doctype/i.test(roh)) continue;
    if (m[1]) {
      const name = m[1].toLowerCase();
      let k = aktuell;
      while (k && k.tag !== name) k = k.eltern;
      if (k && k.eltern) aktuell = k.eltern;
      continue;
    }
    if (m[2]) {
      const name = m[2].toLowerCase();
      const el = { tag: name, attrs: attribute(m[3] || ""), kinder: [], eltern: aktuell };
      aktuell.kinder.push(el);
      if (name === "style" || name === "script") {
        const ende = klein.indexOf("</" + name, re.lastIndex);
        const stop = ende < 0 ? quelle.length : ende;
        el.kinder.push({ text: quelle.slice(re.lastIndex, stop), roh: true, eltern: el });
        re.lastIndex = stop;
        continue;
      }
      if (!VOID.has(name) && !m[4]) aktuell = el;
      continue;
    }
    aktuell.kinder.push({ text: entitaeten(roh), eltern: aktuell });
  }
  return wurzel;
}

function alle(k, pred, aus = []) {
  if (k.tag && pred(k)) aus.push(k);
  for (const c of k.kinder || []) alle(c, pred, aus);
  return aus;
}

function textStuecke(k, aus = []) {
  if (k.text !== undefined) {
    if (!k.roh) aus.push(k.text);
    return aus;
  }
  if (k.tag === "style" || k.tag === "script") return aus;
  const block = BLOCK.has(k.tag);
  if (block) aus.push("\n");
  for (const c of k.kinder) textStuecke(c, aus);
  if (block) aus.push("\n");
  return aus;
}

const normal = (s) => s.replace(/[  ]/g, " ").replace(/\s+/g, " ").trim();
const textVon = (k) => normal(textStuecke(k).join(""));
const hatVorfahr = (k, pred) => {
  for (let e = k.eltern; e; e = e.eltern) if (e.tag && pred(e)) return true;
  return false;
};

const baum = parse(html);
const seiteText = textVon(baum);
const abschnittText = (id) => {
  const k = alle(baum, (x) => x.tag === "section" && x.attrs.id === id)[0];
  return k ? textVon(k) : "";
};

// Text samt Attributen wie aria-label (ohne Stilblock), für die Suche nach Namen
const alleTexte = normal(
  textStuecke(baum).join("") +
    " " +
    alle(baum, (k) => k.attrs["aria-label"] || k.attrs.title)
      .map((k) => (k.attrs["aria-label"] || "") + " " + (k.attrs.title || ""))
      .join(" ")
);

console.log(`Konzeptseite prüfen: ${path.relative(ROOT, SEITE)}`);
console.log(`Regelwerk: ${path.relative(ROOT, REGELWERK)} (Version ${regelwerk.version}, ${punkte.length} Punkte, davon ${punkte.filter((x) => x.status === "entschieden").length} entschieden)`);

// ---------- 1. Rahmen ----------

gruppe("1  Rahmen");
{
  const robots = alle(baum, (k) => k.tag === "meta" && (k.attrs.name || "").toLowerCase() === "robots");
  pruefe("noindex ist gesetzt (genau ein meta robots mit noindex)", robots.length === 1 && /noindex/i.test(robots[0].attrs.content || ""),
    [`gefunden: ${robots.length} meta-robots-Tag(s)`]);
  const h1 = alle(baum, (k) => k.tag === "h1");
  pruefe("genau eine Überschrift der Ebene 1", h1.length === 1, [`gefunden: ${h1.length}`]);
  const h2 = alle(baum, (k) => k.tag === "h2");
  hinweis("14 Abschnitte mit Überschrift der Ebene 2", h2.length === 14, [`gefunden: ${h2.length}`]);
  const ids = new Set(alle(baum, (k) => k.attrs.id).map((k) => k.attrs.id));
  const ohneZiel = alle(baum, (k) => k.tag === "a" && /^#./.test(k.attrs.href || ""))
    .map((k) => k.attrs.href.slice(1))
    .filter((id) => !ids.has(id));
  pruefe("alle Sprungmarken (#…) haben ein Ziel", ohneZiel.length === 0, [...new Set(ohneZiel)].map((id) => "kein Ziel für #" + id));
  const doppelt = alle(baum, (k) => k.attrs.id).map((k) => k.attrs.id).filter((id, i, a) => a.indexOf(id) !== i);
  pruefe("keine Anker-Kennung kommt doppelt vor", doppelt.length === 0, [...new Set(doppelt)]);
}

// ---------- 2. Offene Punkte ----------

gruppe("2  Offene Punkte gegen data/anmeldung.json");
{
  const bekannt = new Map(punkte.map((p) => [p.id, p]));
  const imText = [...seiteText.matchAll(/\bO\d{2}\b/g)].map((m) => m[0]);
  const unbekannt = [...new Set(imText.filter((o) => !bekannt.has(o)))];
  pruefe("keine O-Nummer auf der Seite ist unbekannt", unbekannt.length === 0, unbekannt.map((o) => `${o} steht nicht im Regelwerk`));

  const zeilen = alle(baum, (k) => /^o\d\d$/.test(k.attrs.id || ""));
  const nachId = new Map();
  for (const z of zeilen) nachId.set(z.attrs.id, [...(nachId.get(z.attrs.id) || []), z]);

  // Status „entschieden“ (O26): Der Punkt zählt nicht mehr als offene P1-Frage, seine Zeile zeigt die Entscheidung.
  const entschieden = punkte.filter((p) => p.status === "entschieden");
  const p1 = punkte.filter((p) => p.prioritaet === "P1");
  const p1Offen = p1.filter((p) => p.status !== "entschieden");
  const p1FehltImText = p1.filter((p) => !imText.includes(p.id)).map((p) => p.id);
  pruefe(`alle ${p1.length} P1-Punkte (${p1Offen.length} offen, ${p1.length - p1Offen.length} entschieden) stehen mit ihrer O-Nummer auf der Seite`, p1FehltImText.length === 0, p1FehltImText.map((o) => `${o} fehlt`));

  const p1Versteckt = [];
  const p1OhneZeile = [];
  for (const p of p1) {
    const z = nachId.get(p.id.toLowerCase());
    if (!z || z.length === 0) p1OhneZeile.push(p.id);
    else if (hatVorfahr(z[0], (e) => e.tag === "details")) p1Versteckt.push(p.id);
  }
  pruefe("jeder P1-Punkt hat eine Zeile mit Anker", p1OhneZeile.length === 0, p1OhneZeile.map((o) => `${o}: keine Zeile mit id="${o.toLowerCase()}"`));
  pruefe("kein P1-Punkt steht im Aufklapper", p1Versteckt.length === 0, p1Versteckt.map((o) => `${o} steht in einem <details>`));

  const doppelteZeilen = [...nachId.entries()].filter(([, z]) => z.length > 1).map(([id]) => id.toUpperCase());
  pruefe("jede Nummer hat höchstens eine Zeile", doppelteZeilen.length === 0, doppelteZeilen.map((o) => `${o} hat mehrere Zeilen`));

  const fehlenAnderer = punkte.filter((p) => p.prioritaet !== "P1" && !nachId.has(p.id.toLowerCase())).map((p) => `${p.id} (${p.prioritaet})`);
  hinweis(`alle ${punkte.length - p1.length} Punkte mit P2 oder P3 haben ebenfalls eine Zeile`, fehlenAnderer.length === 0, fehlenAnderer.map((o) => `${o} fehlt`));

  const prioFalsch = [];
  for (const p of punkte) {
    const z = nachId.get(p.id.toLowerCase());
    if (z && z[0].attrs["data-prio"] !== p.prioritaet) prioFalsch.push(`${p.id}: Seite ${z[0].attrs["data-prio"] || "ohne"}, Regelwerk ${p.prioritaet}`);
  }
  pruefe("die Priorität an jeder Zeile stimmt mit dem Regelwerk überein", prioFalsch.length === 0, prioFalsch);

  const ohneMarke = punkte
    .filter((p) => nachId.has(p.id.toLowerCase()))
    .filter((p) => !new RegExp("\\b" + p.id + "\\b").test(textVon(nachId.get(p.id.toLowerCase())[0])))
    .map((p) => p.id);
  pruefe("jede Zeile nennt ihre Nummer im Text (kleine Marke)", ohneMarke.length === 0, ohneMarke.map((o) => `${o}: Nummer steht nicht in der Zeile`));

  // Passt der Text der Zeile zur Frage im Regelwerk? Anteil der Wörter (ab 5 Buchstaben, auf 5 Buchstaben gekürzt)
  const stamm = (text) => new Set((normal(text).toLowerCase().match(/[a-zäöüß]{5,}/g) || []).map((w) => w.slice(0, 5)));
  const zuWenig = [];
  const grenzfall = [];
  for (const p of punkte) {
    const z = nachId.get(p.id.toLowerCase());
    if (!z) continue;
    const frage = stamm(p.frage);
    const seite = stamm(textVon(z[0]));
    if (!frage.size) continue;
    const anteil = [...frage].filter((w) => seite.has(w)).length / frage.size;
    if (anteil < 0.2) zuWenig.push(`${p.id}: nur ${Math.round(anteil * 100)} % der Wörter aus der Frage im Regelwerk stehen in der Zeile`);
    else if (anteil < 0.35) grenzfall.push(`${p.id}: ${Math.round(anteil * 100)} % der Wörter passen`);
  }
  pruefe("der Text jeder Zeile passt zur Frage im Regelwerk (keine falsch zugeordnete Nummer)", zuWenig.length === 0, zuWenig);
  hinweis("kein Grenzfall bei der Übereinstimmung von Zeile und Frage (unter 35 %)", grenzfall.length === 0, grenzfall);

  // Jede Zeile stammt aus dem Regelwerk: keine Zeile ohne O-Nummer, kein Kennzeichen „neu“ mehr
  const tabellenZeilen = alle(baum, (k) => k.tag === "tr" && hatVorfahr(k, (e) => (e.attrs.class || "").includes("konzept-tabelle--prio")) && hatVorfahr(k, (e) => e.tag === "tbody"));
  const ohneKennung = tabellenZeilen.filter((z) => !/^o\d\d$/.test(z.attrs.id || ""));
  pruefe("jede Zeile der Entscheidungslisten hat eine O-Nummer aus dem Regelwerk", ohneKennung.length === 0,
    ohneKennung.map((z) => textVon(z).slice(0, 80)));
  const neuMarken = alle(baum, (k) => k.attrs["data-neu"] !== undefined ||
    ((k.attrs.class || "").split(/\s+/).includes("tag") && textVon(k).toLowerCase() === "neu"));
  const neuText = [...seiteText.matchAll(/(?:Punkt|Zeilen?) (?:ohne Nummer|mit dem Kennzeichen)[^.]*\./g)].map((m) => m[0]);
  hinweis("keine Zeile und kein Text mit dem Kennzeichen „neu“ (Punkte ohne O-Nummer gibt es nicht mehr)", neuMarken.length === 0 && neuText.length === 0,
    [...neuMarken.map((k) => `Kennzeichen „neu“: ${textVon(k.tag === "tr" ? k : k.eltern || k).slice(0, 80)}`), ...neuText.map((t) => `Text: ${t}`)]);

  // O67 und O68 (30.09.2026 ins Regelwerk aufgenommen) stehen sichtbar mit ihrem Inhalt auf der Seite
  const sichtbarMit = (oid, muster) => {
    const z = (nachId.get(oid.toLowerCase()) || [])[0];
    if (!z) return false;
    const t = textVon(z);
    return muster.every((m) => m.test(t)) && !hatVorfahr(z, (e) => e.tag === "details");
  };
  pruefe("O67: Rechtsgrundlage der Notfallkontakte (Art. 6 Abs. 1 lit. b oder f) steht sichtbar auf der Seite",
    sichtbarMit("O67", [/Notfallkontakte/, /Art\. 6/, /lit\. b/, /lit\. f/]));
  pruefe("O68: Bildschirm-Unterschrift der Vereinsunterlagen (§ 127 BGB) steht sichtbar auf der Seite, mit dem Stand der Jugendleitung (befürwortet, Beschluss des Vorstands steht aus)",
    sichtbarMit("O68", [/Bildschirm/, /§ 127 BGB/, /Stift/, /Jugendleitung befürwortet \(08\.10\.2026\)/, /Beschluss des Vorstands steht aus/]));

  // Entschiedene Punkte: sichtbar, Kennzeichen „Entschieden“ statt P-Kennzeichen, Wortlaut der Entscheidung aus dem Regelwerk
  const entschiedenFehler = [];
  for (const p of entschieden) {
    const z = (nachId.get(p.id.toLowerCase()) || [])[0];
    if (!z) {
      entschiedenFehler.push(`${p.id}: keine Zeile mit Anker`);
      continue;
    }
    const marken = alle(z, (k) => (k.attrs.class || "").split(/\s+/).includes("tag")).map((k) => textVon(k));
    if (hatVorfahr(z, (e) => e.tag === "details")) entschiedenFehler.push(`${p.id}: steht im Aufklapper`);
    if (!marken.some((m) => m.toLowerCase() === "entschieden")) entschiedenFehler.push(`${p.id}: das Kennzeichen „Entschieden“ fehlt (gefunden: ${marken.join(", ") || "keins"})`);
    if (marken.some((m) => /^P[123]$/.test(m))) entschiedenFehler.push(`${p.id}: trägt noch ein P-Kennzeichen und zählt damit als offene Frage`);
    if (!p.entscheidung || !textVon(z).includes(normal(p.entscheidung))) entschiedenFehler.push(`${p.id}: der Wortlaut der Entscheidung aus dem Regelwerk steht nicht in der Zeile`);
  }
  pruefe(`jeder entschiedene Punkt (${entschieden.map((p) => p.id).join(", ") || "keiner"}) steht sichtbar mit dem Kennzeichen „Entschieden“ und dem Wortlaut der Entscheidung, ohne P-Kennzeichen`, entschiedenFehler.length === 0, entschiedenFehler);
  const aufSeiteEntschieden = zeilen.filter((z) => z.attrs["data-status"] === "entschieden").map((z) => z.attrs.id.toUpperCase()).sort();
  pruefe("die Seite kennzeichnet genau die Punkte als entschieden, die im Regelwerk entschieden sind (O68 und die anderen bleiben offen)",
    JSON.stringify(aufSeiteEntschieden) === JSON.stringify(entschieden.map((p) => p.id).sort()),
    [`Seite: ${aufSeiteEntschieden.join(", ") || "keiner"}`, `Regelwerk: ${entschieden.map((p) => p.id).join(", ") || "keiner"}`]);
  const kopfMarken = alle(baum, (k) => (k.attrs.class || "").split(/\s+/).includes("tag")).map((k) => textVon(k).toLowerCase());
  pruefe("die Legende „So lesen Sie die Kennzeichen“ erklärt das Kennzeichen „Entschieden“", entschieden.length === 0 || (kopfMarken.includes("entschieden") && /Der Punkt ist entschieden/.test(seiteText)));
  pruefe("keine Empfehlung „beide Eltern unterschreiben“ mehr (O26 ist entschieden: ein Elternteil reicht)", !/Wir empfehlen beide|empfiehlt beide|Empfehlung:\s*Beide Eltern|Seine Unterschrift ist freiwillig/.test(seiteText));

  // Stand des Regelwerks
  const version = /Regelwerk Version (\d{4}-\d{2}-\d{2}(?:\.\d+)?)/.exec(seiteText);
  hinweis(`die Seite nennt die Version des Regelwerks (${regelwerk.version})`, !!version && version[1] === regelwerk.version,
    [`Seite: ${version ? version[1] : "keine Angabe"}, Regelwerk: ${regelwerk.version}`]);
  const anzahl = /mit (\d+) offenen Punkten(?:, davon (\d+) entschieden)?/.exec(seiteText);
  hinweis(`die Seite nennt die Zahl der Punkte (${punkte.length}) und wie viele davon entschieden sind (${entschieden.length})`,
    !!anzahl && Number(anzahl[1]) === punkte.length && Number(anzahl[2] || 0) === entschieden.length,
    [`Seite: ${anzahl ? anzahl[1] + ", davon entschieden: " + (anzahl[2] || "keine Angabe") : "keine Angabe"}, Regelwerk: ${punkte.length}, davon entschieden: ${entschieden.length}`]);

  // Fälle heißen wie im Regelwerk
  const faelle = Object.entries(regelwerk.faelle || {});
  const faelleFehlen = faelle.filter(([id, f]) => !seiteText.includes(f.name)).map(([id, f]) => `${id}: „${f.name}“`);
  hinweis(`alle ${faelle.length} Fälle stehen mit dem Namen aus dem Regelwerk auf der Seite`, faelleFehlen.length === 0, faelleFehlen);
}

// ---------- 3. Namen und Begriffe ----------

gruppe("3  Namen der Papiere (Abschnitt 9) und Begriffe");
{
  const erwartet = new Map();
  for (const name of Object.values(deRegeln.formulare || {})) erwartet.set(name, "formulare");
  for (const id of ["U08", "U11"]) if (deRegeln.unterlagen?.[id]?.name) erwartet.set(deRegeln.unterlagen[id].name, "unterlagen." + id);
  const fehlend = [...erwartet].filter(([name]) => !seiteText.includes(name)).map(([name, wo]) => `„${name}“ (${wo})`);
  pruefe(`die ${erwartet.size} Namen der Papiere aus dem Prototyp kommen auf der Seite vor`, fehlend.length === 0, fehlend);

  const teile = Object.values(deOberflaeche.fertig?.teilTitel || {});
  const teileFehlen = teile.filter((t) => !seiteText.includes(t));
  pruefe("die Teile heißen „Teil A – Für Sie“, „Teil B – Für den Verein“ und „Teil C – Vertraulich, getrennt abgeben“",
    teile.length === 3 && teileFehlen.length === 0 &&
      ["Teil A – Für Sie", "Teil B – Für den Verein", "Teil C – Vertraulich, getrennt abgeben"].every((t) => teile.includes(t)),
    teileFehlen.map((t) => `„${t}“ fehlt`));

  const alt = [
    ["Fotoerlaubnis", "Erlaubnis für Fotos"],
    ["Foto-Einwilligung", "Erlaubnis für Fotos"],
    ["Einwilligung zum Attest", "Erlaubnis für das Attest"],
    ["Einwilligung zur Verarbeitung der ärztlichen Bescheinigung", "Erlaubnis für das Attest"],
    ["Attest-Einwilligung", "Erlaubnis für das Attest"],
    ["Abmeldung und Kündigung", "Abmeldung beim alten Verein"],
    ["für ein Mädchen bei den Jungen", "Einverständnis für Mädchen bei den Jungen"],
    ["Blatt für Abendauftritte", "Erlaubnis für Auftritte am Abend"],
    ["Erziehungsbeauftragung für Abendauftritte", "Erlaubnis für Auftritte am Abend"],
    ["Notfallbogen", "Notfall- und Gesundheitsbogen"],
    ["Notfallbögen", "Notfall- und Gesundheitsbogen"],
    ["HFV-Antrag", "Antrag auf Spielerlaubnis"],
    ["Datenschutzinformation", "Information zum Datenschutz"],
    ["SEPA-Lastschriftmandat", "Erlaubnis für die Lastschrift"],
  ];
  const gefunden = alt.filter(([a]) => alleTexte.includes(a)).map(([a, neu]) => `„${a}“ steht auf der Seite, richtig ist „${neu}“`);
  pruefe("die alten Namen kommen nicht vor", gefunden.length === 0, gefunden);

  // „Antrag auf Spielerlaubnis“ ist ein Name; er darf gebeugt stehen („des Antrags auf Spielerlaubnis“)
  const ohneAntrag = alleTexte.replace(/Antrags? auf Spielerlaubnis/g, "");
  const begriffe = [...ohneAntrag.matchAll(/[A-Za-zÄÖÜäöüß-]*(?:Spielberechtigung|[Ss]pielberechtigt|Spielerlaubnis)[A-Za-zäöüß-]*/g)].map((m) => m[0]);
  pruefe("im Fließtext steht „Spielrecht“ (nicht Spielberechtigung oder Spielerlaubnis; „Antrag auf Spielerlaubnis“ ist ein Name)",
    begriffe.length === 0, [...new Set(begriffe)].map((b) => `„${b}“`));
  hinweis("„Spielrecht“ kommt vor", /Spielrecht/.test(alleTexte));
}

// ---------- 4. Endstand der Abschnitte 3 bis 5 ----------

gruppe("4  Endstand in den Abschnitten „Assistent“, „PDF“ und „Unterschrift“");
{
  const A = abschnittText("assistent");
  const P = abschnittText("pdf");
  const U = abschnittText("unterschrift");
  const alleEnthalten = (text, muster) => muster.filter((m) => !(m instanceof RegExp ? m.test(text) : text.includes(m))).map(String);
  const kriterium = (name, text, muster) => pruefe(name, text.length > 0 && alleEnthalten(text, muster).length === 0,
    text.length ? alleEnthalten(text, muster).map((m) => "fehlt: " + m) : ["Abschnitt nicht gefunden"]);

  kriterium("a  Teile und Namen: Teil A, B und C stehen im Abschnitt „Was im PDF steht“", P, ["Teil A – Für Sie", "Teil B – Für den Verein", "Teil C – Vertraulich, getrennt abgeben"]);
  kriterium("b1 Unterschrift: Vereinsunterlagen am Bildschirm, Vordrucke des HFV mit Stift", U, [/Am Bildschirm/, /Mit Stift/, /Vordrucke des HFV/]);
  kriterium("b2 Satzungs-Haken ist Pflicht; der Link führt auf die Satzung der Website, die Adresse im Vordruck ist defekt (O66)", U,
    [/Satzung/, /Haken/, /Pflicht/, /Satzung der Website/, /Adresse im Vordruck/, /defekt/, /O66/]);
  kriterium("b3 ein Elternteil reicht (Jugendleitung, O26); Ausnahme zweiter Elternteil: getrennt lebende Eltern ohne Einverständnis, Stift-Unterschrift nötig", U,
    [/Ein Elternteil reicht/, /Jugendleitung/, /08\.10\.2026/, /O26/, /Zweiter Elternteil \(nötig\)/, /getrennt/, /nicht einverstanden/, /nur mit Stift/]);
  pruefe("b3 der zweite Elternteil ist nicht mehr freiwillig oder empfohlen", U.length > 0 && !/Seine Unterschrift ist freiwillig|Wir empfehlen beide|Empfehlung/.test(U), ["Abschnitt „Die Unterschrift“ nennt noch eine freiwillige oder empfohlene zweite Unterschrift"]);
  kriterium("b4 keine leeren Erklärungsfelder unter einer Bildschirm-Unterschrift; sonst wird die Stelle zur Stift-Stelle", U,
    [/leeren Erklärungsfelder/, /Stift-Stelle/, /Bildschirm-Unterschrift/]);
  kriterium("c  Notfall- und Gesundheitsbogen: Art. 9 mit Angaben, nur Notfallkontakte ohne Angaben, Absprache immer getrennt mit Stift", P,
    [/Notfall- und Gesundheitsbogen/, /Art\. 9/, /nur die Notfallkontakte/, /Medikamentengabe/, /getrennt mit Stift/]);
  kriterium("d  Attest beim Vereinswechsel: offen (O04, O05); Erlaubnis für das Attest kommt mit ins PDF", P,
    [/Vereinswechsel ist offen/, /O04/, /O05/, /Erlaubnis für das Attest/]);
  kriterium("e  Karneval: Erlaubnis für Auftritte am Abend mit Abholung und „allein nach Hause ab … Uhr“; ohne Antwort „–“", P,
    [/Erlaubnis für Auftritte am Abend/, /abholt/, /allein nach Hause ab … Uhr/, /„–“/]);
  kriterium("f  Eingaben nur in lateinischer Schrift; Deutsch verbindlich, Englisch, Türkisch, Arabisch als Übersetzungshilfe, PDF bleibt deutsch", A,
    [/lateinischen Buchstaben/, /so wie im Pass/, /Deutsch/, /Englisch/, /Türkisch/, /Arabisch/, /Übersetzungshilfe/, /PDF bleibt deutsch/]);
  kriterium("g  Knopf „Vorführung“ mit Beispielen und Sicht des Vereins, gedacht für die Vorführung", A,
    [/Vorführung/, /Beispiele/, /Sicht des Vereins/, /für die Vorführung gedacht/]);
  kriterium("h  Datenschutz: nichts gesendet oder gespeichert; erfundene Beispieldaten; Telefonnummern der Bundesnetzagentur für Medien", A,
    [/Nichts wird gesendet oder gespeichert/, /erfundene Daten/, /Bundesnetzagentur für Medien/]);
}

// ---------- 5. Personendaten ----------

gruppe("5  Keine Personendaten");
{
  const telefon = [
    /(?<![\d.\/-])(?:\+49|0049)[\s\d()\/-]{6,}/g,
    /(?<![\d.\/-])0\d{2,5}[\s\/-]?\d{3,}(?:[\s\/-]?\d{2,})*/g,
    /(?<![\d.\/-])0\d{2,5}(?:[\s\/-]\d{2,4}){2,}/g,
  ];
  const nummern = telefon.flatMap((re) => [...seiteText.matchAll(re)].map((m) => m[0].trim()));
  pruefe("keine Telefonnummern", nummern.length === 0, [...new Set(nummern)].map((n) => `„${n}“`));
  const mails = [...alleTexte.matchAll(/[\w.+-]+@[\w-]+\.[\w.-]+|@/g)].map((m) => m[0]);
  pruefe("keine E-Mail-Adressen", mails.length === 0, [...new Set(mails)]);
  const iban = [...alleTexte.matchAll(/\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){3,}\b/g)].map((m) => m[0]);
  pruefe("keine IBAN", iban.length === 0, iban);
  const geburt = [...alleTexte.matchAll(/\b\d{2}\.\d{2}\.(?:19\d{2}|20[01]\d|202[0-4])\b/g)].map((m) => m[0]);
  pruefe("keine geburtsdatumsähnlichen Angaben (TT.MM.JJJJ bis 2024, Muster wie in tools/pii-check.py)", geburt.length === 0, [...new Set(geburt)]);
  const anrede = [...alleTexte.matchAll(/\b(?:Frau|Herr)\s+(?:Dr\.\s+|Prof\.\s+)?[A-ZÄÖÜ][a-zäöüß]+/g)].map((m) => m[0]);
  pruefe("keine Anrede mit Nachnamen (nur Rollen)", anrede.length === 0, anrede);
  pruefe("Regista-Regel: „Regista“ wird auf dieser Seite nicht genannt", !/regista/i.test(alleTexte));
  const zusatz = (process.env.KONZEPT_VERBOTENE_NAMEN || "").split(",").map((s) => s.trim()).filter(Boolean);
  const namenGefunden = zusatz.filter((n) => alleTexte.toLowerCase().includes(n.toLowerCase()));
  pruefe(zusatz.length ? `verbotene Namen (Umgebungsvariable, ${zusatz.length} ${zusatz.length === 1 ? "Namensteil" : "Namensteile"}) kommen nicht vor` : "verbotene Namen: keine gesetzt (KONZEPT_VERBOTENE_NAMEN)",
    namenGefunden.length === 0, namenGefunden.map(() => "ein verbotener Namensteil steht auf der Seite"));
}

// ---------- 6. Stil ----------

gruppe("6  Stil");
{
  const stile = alle(baum, (k) => k.tag === "style").map((k) => k.kinder.map((c) => c.text).join(""));
  const farben = stile.flatMap((s) => [...s.matchAll(/#[0-9a-fA-F]{3,8}\b|\b(?:red|orange|gold|silver|green|yellow)\b/g)].map((m) => m[0]));
  pruefe("der Stilblock der Seite hat keine eigenen Farbwerte (nur Farbmarken der Website, Vereinsblau)", farben.length === 0, farben);
  const tabu = /#E30613|#CFB257|#B3B6B9/i.test(html);
  pruefe("keine Farbe aus dem Eintracht-Design auf der Seite", !tabu);

  const bloecke = alle(baum, (k) => ["p", "li"].includes(k.tag) &&
    !hatVorfahr(k, (e) => e.tag === "table" || e.tag === "nav" || e.attrs.id === "quellen") &&
    !alle(k, (x) => x !== k && ["p", "li", "ul", "ol", "table"].includes(x.tag)).length);
  const ordinal = "Vorsitzende|Vorsitzender|Jugendleiter|Lebensjahr|Geburtstag|Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember";
  const saetze = (text) => {
    let t = text;
    t = t.replace(/(\d)\.(?=\d)/g, "$1\u0001");
    t = t.replace(new RegExp(`\\b(\\d{1,2})\\.(?=\\s+(?:${ordinal})\\b)`, "g"), "$1\u0001");
    t = t.replace(/\b(Nr|Abs|Art|lit|Anh)\.(?=\s)/g, "$1\u0001");
    t = t.replace(/([.!?])(["“”»)]*)\s+(?=[A-ZÄÖÜ„"(])/g, "$1$2\u0002");
    return t.split("\u0002").map((x) => x.replaceAll("\u0001", ".").trim()).filter(Boolean);
  };
  const woerter = (s) => s.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
  const alleSaetze = bloecke.flatMap((b) => saetze(textVon(b)));
  const summe = alleSaetze.reduce((n, s) => n + woerter(s), 0);
  const mittel = alleSaetze.length ? summe / alleSaetze.length : 0;
  pruefe(`mittlere Satzlänge im Fließtext höchstens 16 Wörter (gemessen: ${mittel.toFixed(2).replace(".", ",")} bei ${alleSaetze.length} Sätzen)`, mittel <= 16);
  const lang = alleSaetze.filter((s) => woerter(s) > 30).map((s) => `${woerter(s)} Wörter: ${s.slice(0, 90)} …`);
  hinweis("kein Satz im Fließtext hat mehr als 30 Wörter", lang.length === 0, lang);
}

// ---------- Ergebnis ----------

console.log(`\nErgebnis: ${ergebnis.fehler} Fehler, ${ergebnis.hinweise} Hinweis${ergebnis.hinweise === 1 ? "" : "e"}`);
process.exitCode = ergebnis.fehler > 0 ? 1 : 0;
