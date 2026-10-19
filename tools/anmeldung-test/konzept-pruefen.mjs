#!/usr/bin/env node
// Prüft die gebaute Konzeptseite docs/anmeldung-konzept/index.html gegen das Regelwerk
// (Arbeitspaket AP-6, Runde 3; Stand der Punkte am 11.10.2026, Paket M2). Ohne Browser, ohne Abhängigkeiten: liest das HTML der Seite,
// data/anmeldung.json (offenePunkte, faelle, version) und die Namen der Papiere aus den
// deutschen Texten des Prototyps.
//
// Aufruf:   node tools/anmeldung-test/konzept-pruefen.mjs [Seite.html [Regelwerk.json]]
// Vorher:   sh tools/cache/bau-sperre.sh build   (baut docs/anmeldung-konzept/index.html)
// Ende:     Exit 0 nur bei 0 Fehlern. Hinweise (Zeilen mit „Hinweis“) zählen nicht als Fehler.
//
// Was geprüft wird
//   1  Rahmen        noindex, genau eine h1, interne Sprungmarken haben ein Ziel
//   2  Stand der Punkte  Fünf Stände im Regelwerk: entschieden, geregelt, entfaellt, vorgemerkt („Später“) und offen.
//                    Nur „offen“ ist eine offene Frage. Pflicht im Regelwerk: „entscheidung“ bei entschieden, geregelt,
//                    entfaellt und vorgemerkt, „stand“ bei offen (nie beides). Jeder Punkt hat genau eine Zeile (Anker #o26);
//                    offene und entschiedene Zeilen stehen sichtbar, die übrigen dürfen im Aufklapper stehen. Jede Zeile trägt
//                    genau ein Kennzeichen (P1 bis P3 nur bei offenen Punkten, sonst Entschieden, Geregelt, Entfällt, Später),
//                    den passenden data-status und data-prio und den Text aus dem Regelwerk. Keine Zeile ohne Kennzeichen.
//                    Der Kasten „Stand“ ganz oben nennt Datum, Gesamtzahl und die Zahl je Stand wie das Regelwerk. Die Legende
//                    erklärt alle Kennzeichen. Der Text der Zeile passt zur Frage im Regelwerk; O45, O67 und O68 stehen sichtbar
//                    mit ihrem Inhalt da. Die Seite nennt Version und Zahl der Punkte.
//   3  Namen         die Namen der Papiere und die Teile A, B und C stehen so auf der Seite, wie sie im
//                    Prototyp heißen (assets/js/anmeldung/texte); die alten Namen kommen nicht vor (im Wortlaut aus
//                    dem Regelwerk – stand, entscheidung – nur als Hinweis); im Fließtext steht „Spielrecht“
//   4  Endstand      die Punkte a bis j aus dem Auftrag stehen in den Abschnitten „Assistent“, „PDF“ und
//                    „Unterschrift“ (Heimweg nach dem Training und der Hinweis zum Probetraining statt der Auftritte am Abend)
//                    sowie (M14, 12.10.2026) Punkt l: Der Verein beantragt für Fußball immer das Spielrecht, die Frage zu den Spielen entfällt
//   5  Personendaten keine Telefonnummern, E-Mail-Adressen, IBAN, Geburtsdaten (Muster wie tools/pii-check.py),
//                    keine Anrede mit Nachnamen; Regista-Regel: „Regista“ wird nicht genannt, und Namen aus
//                    der Umgebungsvariable KONZEPT_VERBOTENE_NAMEN (Namensteile, durch Komma getrennt; sie
//                    stehen nicht im Repo) kommen nicht vor
//   6  Stil          nur Vereinsblau (keine eigenen Farbwerte im Stilblock der Seite); mittlere Satzlänge
//                    im Fließtext höchstens 16 Wörter
//   7  Karneval      kein Karneval-Text beschreibt Gruppenwahl, Turniere, Auftritte, Kostüme oder den Fastnachtszug als Teil
//                    der Anmeldung; keine Verweise auf die entfernten Unterlagen U30 bis U32; Heimweg nach dem Training
//                    und der Hinweis zum Probetraining stehen im Ablauf
//   8  Zugang (P1)   Paket P1, 12.10.2026: Die Seite beschreibt den Zugang mit dem Code vom Probetraining (Code, Link, QR-Code, Blatt der
//                    Trainer, Prüfwert statt Code, leere Liste = aus), den Weg der App in den Browser und sagt, dass O45 und O67 entschieden
//                    sind und nichts mehr offen ist; kein Satz nennt O45 oder O67 noch offen.
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

// Fünf Stände: entschieden, geregelt, entfaellt, vorgemerkt (auf der Seite „Später“) und offen. Nur „offen“ ist eine offene Frage
// und trägt P1, P2 oder P3; alle anderen tragen ihr Kennzeichen und zeigen den Text aus „entscheidung“.
const STAENDE = ["entschieden", "geregelt", "entfaellt", "vorgemerkt", "offen"];
const KENNZEICHEN = { entschieden: "Entschieden", geregelt: "Geregelt", entfaellt: "Entfällt", vorgemerkt: "Später" };
const SICHTBAR_PFLICHT = ["offen", "entschieden"]; // alle anderen dürfen im Aufklapper stehen
const zahl = Object.fromEntries(STAENDE.map((s) => [s, punkte.filter((p) => p.status === s).length]));

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
console.log(`Regelwerk: ${path.relative(ROOT, REGELWERK)} (Version ${regelwerk.version}, ${punkte.length} Punkte: ${STAENDE.map((s) => `${zahl[s]} ${s}`).join(", ")})`);

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

// ---------- 2. Stand der Punkte ----------

gruppe("2  Stand der Punkte gegen data/anmeldung.json");
{
  const bekannt = new Map(punkte.map((p) => [p.id, p]));
  const textFeld = (p) => (p.status === "offen" ? "stand" : "entscheidung");

  // 2.1 Das Regelwerk selbst: gültiger Stand; „entscheidung“ bei erledigten, „stand“ bei offenen Punkten, nie beides
  const datenFehler = [];
  for (const p of punkte) {
    if (!STAENDE.includes(p.status)) {
      datenFehler.push(`${p.id}: unbekannter Stand „${p.status}“`);
      continue;
    }
    const noetig = textFeld(p);
    const anderes = noetig === "stand" ? "entscheidung" : "stand";
    if (typeof p[noetig] !== "string" || !p[noetig].trim()) datenFehler.push(`${p.id} (${p.status}): Feld „${noetig}“ fehlt`);
    if (anderes in p) datenFehler.push(`${p.id} (${p.status}): Feld „${anderes}“ darf nicht stehen`);
    if (!/^P[123]$/.test(p.prioritaet || "")) datenFehler.push(`${p.id}: Priorität P1 bis P3 fehlt`);
  }
  pruefe("Regelwerk: jeder Punkt hat einen gültigen Stand; „entscheidung“ bei entschieden, geregelt, entfällt und später, „stand“ bei offen (nie beides)", datenFehler.length === 0, datenFehler);

  // 2.2 Nummern und Zeilen
  const imText = [...seiteText.matchAll(/\bO\d{2}\b/g)].map((m) => m[0]);
  const unbekannt = [...new Set(imText.filter((o) => !bekannt.has(o)))];
  pruefe("keine O-Nummer auf der Seite ist unbekannt", unbekannt.length === 0, unbekannt.map((o) => `${o} steht nicht im Regelwerk`));

  const zeilen = alle(baum, (k) => /^o\d\d$/.test(k.attrs.id || ""));
  const nachId = new Map();
  for (const z of zeilen) nachId.set(z.attrs.id, [...(nachId.get(z.attrs.id) || []), z]);
  const zeileVon = (p) => (nachId.get(p.id.toLowerCase()) || [])[0];
  const imAufklapper = (z) => hatVorfahr(z, (e) => e.tag === "details");

  const ohneZeile = punkte.filter((p) => !zeileVon(p)).map((p) => `${p.id} (${p.status}): keine Zeile mit id="${p.id.toLowerCase()}"`);
  pruefe(`jeder der ${punkte.length} Punkte hat eine Zeile mit Anker`, ohneZeile.length === 0, ohneZeile);
  const doppelteZeilen = [...nachId.entries()].filter(([, z]) => z.length > 1).map(([id]) => id.toUpperCase());
  pruefe("jede Nummer hat höchstens eine Zeile", doppelteZeilen.length === 0, doppelteZeilen.map((o) => `${o} hat mehrere Zeilen`));

  // 2.3 Offene und entschiedene Punkte stehen sichtbar; erledigte dürfen im Aufklapper stehen
  const versteckt = punkte.filter((p) => SICHTBAR_PFLICHT.includes(p.status) && zeileVon(p) && imAufklapper(zeileVon(p))).map((p) => `${p.id} (${p.status}) steht in einem <details>`);
  const sichtbarN = punkte.filter((p) => SICHTBAR_PFLICHT.includes(p.status)).length;
  pruefe(`alle offenen (${zahl.offen}) und entschiedenen (${zahl.entschieden}) Punkte stehen sichtbar, nicht im Aufklapper (${sichtbarN} Zeilen)`, versteckt.length === 0, versteckt);
  const offeneP1 = punkte.filter((p) => p.status === "offen" && p.prioritaet === "P1").length;
  console.log(`  Zählung    ${punkte.length} Punkte: ${STAENDE.map((s) => `${zahl[s]} ${s}`).join(", ")} (davon offen mit P1: ${offeneP1})`);
  console.log(`  Zeilen     ${punkte.filter((p) => zeileVon(p) && !imAufklapper(zeileVon(p))).length} sichtbar, ${punkte.filter((p) => zeileVon(p) && imAufklapper(zeileVon(p))).length} im Aufklapper`);

  // 2.4 Kennzeichen, Stand und Text je Zeile
  const kennzeichenFehler = [];
  const stand = [];
  const textFehler = [];
  const prioFalsch = [];
  for (const p of punkte) {
    const z = zeileVon(p);
    if (!z) continue;
    const ersteZelle = alle(z, (k) => k.tag === "td")[0];
    const marken = ersteZelle ? alle(ersteZelle, (k) => (k.attrs.class || "").split(/\s+/).includes("tag")).map((k) => textVon(k)) : [];
    const soll = p.status === "offen" ? p.prioritaet : KENNZEICHEN[p.status];
    if (marken.length !== 1) kennzeichenFehler.push(`${p.id}: ${marken.length} Kennzeichen (${marken.join(", ") || "keins"}), erwartet genau eins: ${soll}`);
    else if (marken[0] !== soll) kennzeichenFehler.push(`${p.id}: Kennzeichen „${marken[0]}“, erwartet „${soll}“ (Stand im Regelwerk: ${p.status})`);
    if (z.attrs["data-status"] !== p.status) stand.push(`${p.id}: Seite ${z.attrs["data-status"] || "ohne"}, Regelwerk ${p.status}`);
    if (z.attrs["data-prio"] !== p.prioritaet) prioFalsch.push(`${p.id}: Seite ${z.attrs["data-prio"] || "ohne"}, Regelwerk ${p.prioritaet}`);
    const antwort = alle(z, (k) => k.tag === "p" && (k.attrs.class || "").split(/\s+/).includes("konzept-antwort"))[0];
    if (!antwort || textVon(antwort) !== normal(String(p[textFeld(p)] ?? ""))) {
      textFehler.push(`${p.id} (${p.status}): der Wortlaut aus „${textFeld(p)}“ steht nicht in der Zeile (${antwort ? "abweichend: " + textVon(antwort).slice(0, 60) : "kein Absatz mit dem Text"})`);
    }
  }
  pruefe("jede Zeile trägt genau ein Kennzeichen, das zum Stand passt: P1 bis P3 nur bei offenen Punkten, sonst Entschieden, Geregelt, Entfällt oder Später", kennzeichenFehler.length === 0, kennzeichenFehler);
  pruefe("der Stand (data-status) an jeder Zeile stimmt mit dem Regelwerk überein", stand.length === 0, stand);
  pruefe("die Priorität (data-prio) an jeder Zeile stimmt mit dem Regelwerk überein", prioFalsch.length === 0, prioFalsch);
  pruefe("jede Zeile zeigt den Text aus dem Regelwerk: „entscheidung“ bei entschieden, geregelt, entfällt und später, „stand“ bei offen", textFehler.length === 0, textFehler);
  const nachStand = STAENDE.map((s) => [s, zeilen.filter((z) => z.attrs["data-status"] === s).map((z) => z.attrs.id.toUpperCase()).sort()]);
  const sollStand = STAENDE.map((s) => [s, punkte.filter((p) => p.status === s).map((p) => p.id).sort()]);
  pruefe("die Seite führt unter jedem Stand genau die Punkte, die das Regelwerk dort führt",
    JSON.stringify(nachStand) === JSON.stringify(sollStand),
    STAENDE.filter((s, i) => JSON.stringify(nachStand[i][1]) !== JSON.stringify(sollStand[i][1])).map((s) => `${s}: Seite ${nachStand[STAENDE.indexOf(s)][1].length}, Regelwerk ${sollStand[STAENDE.indexOf(s)][1].length}`));

  const ohneMarke = punkte
    .filter((p) => zeileVon(p))
    .filter((p) => !new RegExp("\\b" + p.id + "\\b").test(textVon(zeileVon(p))))
    .map((p) => p.id);
  pruefe("jede Zeile nennt ihre Nummer im Text (kleine Marke)", ohneMarke.length === 0, ohneMarke.map((o) => `${o}: Nummer steht nicht in der Zeile`));

  // Passt der Text der Zeile zur Frage im Regelwerk? Anteil der Wörter (ab 5 Buchstaben, auf 5 Buchstaben gekürzt)
  const stamm = (text) => new Set((normal(text).toLowerCase().match(/[a-zäöüß]{5,}/g) || []).map((w) => w.slice(0, 5)));
  const zuWenig = [];
  const grenzfall = [];
  for (const p of punkte) {
    const z = zeileVon(p);
    if (!z) continue;
    const frage = stamm(p.frage);
    const seite = stamm(textVon(z));
    if (!frage.size) continue;
    const anteil = [...frage].filter((w) => seite.has(w)).length / frage.size;
    if (anteil < 0.2) zuWenig.push(`${p.id}: nur ${Math.round(anteil * 100)} % der Wörter aus der Frage im Regelwerk stehen in der Zeile`);
    else if (anteil < 0.35) grenzfall.push(`${p.id}: ${Math.round(anteil * 100)} % der Wörter passen`);
  }
  pruefe("der Text jeder Zeile passt zur Frage im Regelwerk (keine falsch zugeordnete Nummer)", zuWenig.length === 0, zuWenig);
  hinweis("kein Grenzfall bei der Übereinstimmung von Zeile und Frage (unter 35 %)", grenzfall.length === 0, grenzfall);

  // Jede Zeile der Listen stammt aus dem Regelwerk: keine Zeile ohne O-Nummer und ohne Kennzeichen, kein Kennzeichen „neu“
  const tabellenZeilen = alle(baum, (k) => k.tag === "tr" && hatVorfahr(k, (e) => (e.attrs.class || "").includes("konzept-tabelle--prio")) && hatVorfahr(k, (e) => e.tag === "tbody"));
  const ohneKennung = tabellenZeilen.filter((z) => !/^o\d\d$/.test(z.attrs.id || ""));
  pruefe("jede Zeile der Listen hat eine O-Nummer aus dem Regelwerk", ohneKennung.length === 0, ohneKennung.map((z) => textVon(z).slice(0, 80)));
  const ohneTag = tabellenZeilen.filter((z) => !alle(z, (k) => (k.attrs.class || "").split(/\s+/).includes("tag")).length);
  pruefe(`keine Zeile ohne Kennzeichen (${tabellenZeilen.length} Zeilen in den Listen)`, ohneTag.length === 0, ohneTag.map((z) => textVon(z).slice(0, 80)));
  pruefe(`die Listen führen alle ${punkte.length} Punkte (${tabellenZeilen.length} Zeilen)`, tabellenZeilen.length === punkte.length, [`Zeilen in den Listen: ${tabellenZeilen.length}, Punkte im Regelwerk: ${punkte.length}`]);
  const neuMarken = alle(baum, (k) => k.attrs["data-neu"] !== undefined ||
    ((k.attrs.class || "").split(/\s+/).includes("tag") && textVon(k).toLowerCase() === "neu"));
  const neuText = [...seiteText.matchAll(/(?:Punkt|Zeilen?) (?:ohne Nummer|mit dem Kennzeichen)[^.]*\./g)].map((m) => m[0]);
  hinweis("keine Zeile und kein Text mit dem Kennzeichen „neu“ (Punkte ohne O-Nummer gibt es nicht mehr)", neuMarken.length === 0 && neuText.length === 0,
    [...neuMarken.map((k) => `Kennzeichen „neu“: ${textVon(k.tag === "tr" ? k : k.eltern || k).slice(0, 80)}`), ...neuText.map((t) => `Text: ${t}`)]);

  // O45 und O67 (seit dem 12.10.2026, Paket P1) sowie O68 und O01 (11.10.2026, Jugendleitung) stehen entschieden und sichtbar mit ihrem Inhalt auf der Seite
  const sichtbarMit = (oid, muster) => {
    const z = (nachId.get(oid.toLowerCase()) || [])[0];
    if (!z) return false;
    const t = textVon(z);
    return muster.every((m) => m.test(t)) && !hatVorfahr(z, (e) => e.tag === "details");
  };
  pruefe("O67: Rechtsgrundlage der Notfallkontakte (Art. 6 Abs. 1 lit. b und f) steht entschieden und sichtbar auf der Seite, mit der Freigabe vom 12.10.2026",
    sichtbarMit("O67", [/Notfallkontakte/, /Art\. 6/, /lit\. b/, /lit\. f/, /Freigegeben von der 1\. Vorsitzenden am 12\.10\.2026/]) && (nachId.get("o67") || [])[0].attrs["data-status"] === "entschieden");
  pruefe("O45: Freigabe der Datenschutz-Texte steht entschieden und sichtbar auf der Seite (1. Vorsitzende, 12.10.2026)",
    sichtbarMit("O45", [/Information zum Datenschutz/, /Freigegeben von der 1\. Vorsitzenden am 12\.10\.2026/]) && (nachId.get("o45") || [])[0].attrs["data-status"] === "entschieden");
  pruefe("O68: Entscheidung der Jugendleitung steht sichtbar auf der Seite (alles am Bildschirm, auch die Blätter des Verbands; sonst wieder auf Stift)",
    sichtbarMit("O68", [/Bildschirm/, /Blätter des Verbands/, /Stift/, /Jugendleitung, 11\.10\.2026/, /Widerspricht der Verband/]));
  pruefe("O68 und O01 sind entschieden: Kennzeichen „Entschieden“, nicht „offen“; O01 verweist auf O68, die Antwort der Passstelle und den Schalter",
    sichtbarMit("O01", [/Vorerst gilt O68/, /Antwort der Passstelle steht aus/, /unterschriftHfv/, /„stift“/]) &&
      ["O01", "O68"].every((id) => (nachId.get(id.toLowerCase()) || [])[0] && nachId.get(id.toLowerCase())[0].attrs["data-status"] === "entschieden"));

  // 2.5 Kasten „Stand“ ganz oben: Datum, Gesamtzahl und Zahl je Stand kommen aus den Daten
  const kasten = alle(baum, (k) => k.attrs.id === "stand")[0];
  const kastenText = kasten ? textVon(kasten) : "";
  const kastenFehler = [];
  if (!kasten) kastenFehler.push('kein Kasten mit id="stand" auf der Seite');
  else {
    if (!/Stand \d{2}\.\d{2}\.\d{4}/.test(kastenText)) kastenFehler.push("kein Datum („Stand TT.MM.JJJJ“) im Kasten");
    const gesamt = /Von (\d+) Punkten sind/.exec(kastenText);
    if (!gesamt || Number(gesamt[1]) !== punkte.length) kastenFehler.push(`Gesamtzahl: Seite ${gesamt ? gesamt[1] : "keine Angabe"}, Regelwerk ${punkte.length}`);
    let summe = 0;
    for (const s of STAENDE) {
      const li = alle(kasten, (k) => k.tag === "li" && k.attrs["data-status"] === s)[0];
      const n = li ? Number((/(\d+)\s*$/.exec(textVon(li)) || [])[1]) : NaN;
      if (Number.isNaN(n)) kastenFehler.push(`${s}: keine Zahl im Kasten`);
      else {
        summe += n;
        if (n !== zahl[s]) kastenFehler.push(`${s}: Seite ${n}, Regelwerk ${zahl[s]}`);
      }
      const marke = li ? alle(li, (k) => (k.attrs.class || "").split(/\s+/).includes("tag")).map((k) => textVon(k).toLowerCase())[0] : "";
      const sollMarke = s === "offen" ? "offen" : KENNZEICHEN[s].toLowerCase();
      if (li && marke !== sollMarke) kastenFehler.push(`${s}: Kennzeichen „${marke}“ statt „${sollMarke}“`);
    }
    if (summe !== punkte.length) kastenFehler.push(`die Zahlen im Kasten ergeben ${summe}, das Regelwerk hat ${punkte.length} Punkte`);
    if (!/Die Antworten der 1\. Vorsitzenden sind eingearbeitet/.test(kastenText)) kastenFehler.push("der Satz „Die Antworten der 1. Vorsitzenden sind eingearbeitet.“ fehlt");
    // Mit offenen Punkten steht der Satz zu den Fragen im Excel, ohne offene Punkte (seit 12.10.2026) der Satz „Nichts ist mehr offen.“
    if (zahl.offen > 0 && !/Offen sind nur noch die Fragen im Excel an die 1\. Vorsitzende/.test(kastenText)) kastenFehler.push("der Satz „Offen sind nur noch die Fragen im Excel an die 1. Vorsitzende.“ fehlt");
    if (zahl.offen === 0 && !/Nichts ist mehr offen/.test(kastenText)) kastenFehler.push("der Satz „Nichts ist mehr offen.“ fehlt");
    if (zahl.offen === 0 && /Offen sind nur noch/.test(kastenText)) kastenFehler.push("der Kasten sagt noch, es seien Fragen offen");
  }
  pruefe("Kasten „Stand“: Datum, Gesamtzahl und Zahl je Stand stimmen mit dem Regelwerk überein; er nennt die Antworten der 1. Vorsitzenden und, was offen ist (seit 12.10.2026: nichts)", kastenFehler.length === 0, kastenFehler);
  pruefe("der Kasten „Stand“ steht ganz oben im Seitenkopf, vor dem Inhaltsverzeichnis", !!kasten && hatVorfahr(kasten, (e) => (e.attrs.class || "").split(/\s+/).includes("seitenkopf")));

  // 2.6 Legende: alle Kennzeichen sind erklärt
  const legende = alle(baum, (k) => (k.attrs.class || "").split(/\s+/).includes("konzept-box") && /^So lesen Sie die Kennzeichen/.test(textVon(k)))[0];
  const legendeText = legende ? textVon(legende) : "";
  const legendeMarken = legende ? alle(legende, (k) => (k.attrs.class || "").split(/\s+/).includes("tag")).map((k) => textVon(k).toLowerCase()) : [];
  const legendeFehler = [];
  for (const [marke, muster] of [
    ["pflicht", /Verband, FIFA oder Gesetz schreiben es vor/],
    ["verein", /Regel oder Praxis des Vereins/],
    ["offen", /Nicht belegt oder unsicher/],
    ["entschieden", /Der Punkt ist entschieden\. Die Zeile nennt die Entscheidung und zählt nicht mehr als offene Frage/],
    ["geregelt", /So machen wir es/],
    ["entfällt", /Der Punkt gehört nicht zur Anmeldung/],
    ["später", /Für den Start nicht nötig/],
    ["p1", /P1 muss vor dem Livegang geklärt sein/],
    ["p2", /Dringlichkeit eines offenen Punkts/],
    ["p3", /Dringlichkeit eines offenen Punkts/],
  ]) {
    if (!legendeMarken.includes(marke)) legendeFehler.push(`Kennzeichen „${marke}“ fehlt in der Legende`);
    if (!muster.test(legendeText)) legendeFehler.push(`Erklärung zu „${marke}“ fehlt: ${muster}`);
  }
  pruefe("die Legende „So lesen Sie die Kennzeichen“ erklärt alle Kennzeichen: Pflicht, Verein, offen, Entschieden, Geregelt, Entfällt, Später und P1 bis P3", !!legende && legendeFehler.length === 0, legende ? legendeFehler : ["Legende nicht gefunden"]);
  pruefe("keine Empfehlung „beide Eltern unterschreiben“ mehr (O26 ist entschieden: ein Elternteil reicht)", !/Wir empfehlen beide|empfiehlt beide|Empfehlung:\s*Beide Eltern|Seine Unterschrift ist freiwillig/.test(seiteText));

  // 2.7 Stand des Regelwerks im Seitenkopf
  const version = /Regelwerk Version (\d{4}-\d{2}-\d{2}(?:\.\d+)?)/.exec(seiteText);
  hinweis(`die Seite nennt die Version des Regelwerks (${regelwerk.version})`, !!version && version[1] === regelwerk.version,
    [`Seite: ${version ? version[1] : "keine Angabe"}, Regelwerk: ${regelwerk.version}`]);
  const anzahl = /mit (\d+) Punkten, davon (\d+) offen/.exec(seiteText);
  pruefe(`die Seite nennt die Zahl der Punkte (${punkte.length}) und wie viele davon offen sind (${zahl.offen})`,
    !!anzahl && Number(anzahl[1]) === punkte.length && Number(anzahl[2]) === zahl.offen,
    [`Seite: ${anzahl ? anzahl[1] + ", davon offen: " + anzahl[2] : "keine Angabe"}, Regelwerk: ${punkte.length}, davon offen: ${zahl.offen}`]);
  const abgleich = /Abgeglichen mit dem Prototyp am (\d{2}\.\d{2}\.\d{4})/.exec(seiteText);
  const datumRegelwerk = /^(\d{4})-(\d{2})-(\d{2})$/.exec(regelwerk.stand || "");
  hinweis("das Abgleich-Datum der Seite ist der Stand des Regelwerks", !!abgleich && !!datumRegelwerk && abgleich[1] === `${datumRegelwerk[3]}.${datumRegelwerk[2]}.${datumRegelwerk[1]}`,
    [`Seite: ${abgleich ? abgleich[1] : "keine Angabe"}, Regelwerk: ${regelwerk.stand}`]);

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
  pruefe("die Teile heißen „Teil A – Für Sie“, „Teil B – Für den Verein“ und „Teil C – Vertraulich“ (M11: nicht mehr „… getrennt abgeben“)",
    teile.length === 3 && teileFehlen.length === 0 &&
      ["Teil A – Für Sie", "Teil B – Für den Verein", "Teil C – Vertraulich"].every((t) => teile.includes(t)),
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
  // Der Wortlaut aus den Daten (stand, entscheidung) kommt aus dem Regelwerk. Alte Namen darin sind nur ein Hinweis;
  // alles andere auf der Seite muss die neuen Namen nutzen.
  const datenTexte = punkte.flatMap((p) => [p.stand, p.entscheidung]).filter(Boolean).map(normal);
  const ohneDatenTexte = datenTexte.reduce((text, wortlaut) => text.split(wortlaut).join(" "), alleTexte);
  const gefunden = alt.filter(([a]) => ohneDatenTexte.includes(a)).map(([a, neu]) => `„${a}“ steht auf der Seite, richtig ist „${neu}“`);
  pruefe("die alten Namen kommen nicht vor (ausgenommen der Wortlaut aus dem Regelwerk, siehe Hinweis)", gefunden.length === 0, gefunden);
  const inDaten = punkte.flatMap((p) => alt.filter(([a]) => normal(p.stand || p.entscheidung || "").includes(a)).map(([a, neu]) => `${p.id}: der Text im Regelwerk nennt „${a}“, richtig wäre „${neu}“`));
  hinweis("auch im Wortlaut aus dem Regelwerk (stand, entscheidung) steht kein alter Name", inDaten.length === 0, inDaten);

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

  kriterium("a  Teile und Namen: Teil A, B und C stehen im Abschnitt „Was im PDF steht“", P, ["Teil A – Für Sie", "Teil B – Für den Verein", "Teil C – Vertraulich"]);
  kriterium("b1 Unterschrift: alles am Bildschirm, auch die Blätter des Verbands (Jugendleitung, 11.10.2026, O68); Schalter „stift“ als Weg zurück; Antwort der Passstelle O01", U,
    [/Am Bildschirm/, /Blätter des Verbands/, /11\.10\.2026/, /O68/, /Schalter/, /„stift“/, /O01/, /Mit Stift/, /Ärztin oder der Arzt/, /Stempel des Vereins/]);
  pruefe("b1 die Seite sagt nicht mehr, die Vordrucke des HFV würden mit Stift unterschrieben (ohne Schalter „stift“)",
    U.length > 0 && !/Vordrucke des HFV unterschreibt sie mit Stift|Vordrucke des HFV\W{1,4}Mit Stift auf Papier|Die Vordrucke des HFV unterschreibt/.test(U) && !/Jugendleitung befürwortet/.test(U),
    ["Abschnitt „Die Unterschrift“ beschreibt noch den Stand bis 11.10.2026 als aktuell"]);
  kriterium("b1 Recht: einfache elektronische Signatur, § 127 BGB, eIDAS; der Laufzettel nennt dem Verein den Weg bei einem Original mit Stift", U,
    [/einfache elektronische Signatur/, /§ 127 BGB/, /eIDAS/, /JO § 37 Nr\. 2/, /SpO § 92/, /Laufzettel/, /Original mit Stift/]);
  kriterium("b2 Satzungs-Haken ist Pflicht; der Link führt auf die Satzung der Website, die Adresse im Vordruck ist defekt (O66)", U,
    [/Satzung/, /Haken/, /Pflicht/, /Satzung der Website/, /Adresse im Vordruck/, /defekt/, /O66/]);
  kriterium("b3 ein Elternteil reicht (Jugendleitung, O26); Ausnahme zweiter Elternteil: getrennt lebende Eltern ohne Einverständnis, eigenes freiwilliges Feld am Bildschirm, leer: Stift-Markierung", U,
    [/Ein Elternteil reicht/, /Jugendleitung/, /08\.10\.2026/, /O26/, /Zweiter Elternteil \(nötig\)/, /getrennt/, /nicht einverstanden/, /eigenes Feld am Bildschirm/, /freiwillig/, /mit Stift markiert/, /Laufzettel nennt es/]);
  kriterium("b3 das Kind als Spielerin oder Spieler: freiwilliges Feld „Kann Ihr Kind schreiben? Dann unterschreibt es selbst.“, leer: Zeile im Antrag ohne Markierung, Laufzettel sagt, dass das Passwesen entscheidet; nur die Abmeldung bekommt die Stift-Markierung; O11 ist geregelt (das Passwesen entscheidet im Einzelfall)", U,
    [/Das Kind als Spielerin oder Spieler/, /Kann Ihr Kind schreiben\? Dann unterschreibt es selbst\./, /freiwilliges Feld/, /Zeile im Antrag auf Spielerlaubnis ohne Markierung/, /Nicht unterschrieben \(freiwillig\)/,
      /Das Kind hat den Antrag nicht unterschrieben\. Das Passwesen entscheidet, ob das nötig ist\./, /Nur die Abmeldung beim alten Verein bekommt bei leerem Feld die Stift-Markierung/, /O11/]);
  pruefe("b3 das leere Kinderfeld heißt nicht mehr „mit Stift markiert“ (nur der zweite Elternteil und die Abmeldung)",
    U.length > 0 && !/Bleibt es leer, ist die Stelle im PDF mit Stift markiert, und der Laufzettel nennt es\. Ob ein kleines Kind/.test(U) && !/Sonst unterschreibt es später mit Stift/.test(U),
    ["Abschnitt „Die Unterschrift“ sagt beim Kind noch, die leere Stelle sei mit Stift markiert"]);
  kriterium("b3 Datum und Papier: Ort und Datum der Anmeldung auch auf den Blättern des Verbands; Teil A nennt nur, was auf Papier muss („Sie müssen nichts ausdrucken.“); Schalter unterschriftHfv in data/anmeldung.json", U,
    [/Ort und Datum der Anmeldung/, /Datumsfeld/, /Sie müssen nichts ausdrucken/, /Abmeldung beim alten Verein \(Einschreiben\)/, /unterschriftHfv/, /data\/anmeldung\.json/, /bildschirm/, /stift/]);
  pruefe("b3 der zweite Elternteil ist nicht mehr freiwillig oder empfohlen", U.length > 0 && !/Seine Unterschrift ist freiwillig|Wir empfehlen beide|Empfehlung/.test(U), ["Abschnitt „Die Unterschrift“ nennt noch eine freiwillige oder empfohlene zweite Unterschrift"]);
  kriterium("b4 keine leeren Erklärungsfelder unter einer Bildschirm-Unterschrift; sonst wird die Stelle zur Stift-Stelle", U,
    [/leeren Erklärungsfelder/, /Stift-Stelle/, /Bildschirm-Unterschrift/]);
  kriterium("c  Notfall- und Gesundheitsbogen: Art. 9 mit Angaben, nur Notfallkontakte ohne Angaben, Absprache immer getrennt mit Stift", P,
    [/Notfall- und Gesundheitsbogen/, /Art\. 9/, /nur die Notfallkontakte/, /Medikamentengabe/, /getrennt mit Stift/]);
  kriterium("d  Attest beim Vereinswechsel: der Assistent folgt dem Vordruck des HFV (O04, O05); Erlaubnis für das Attest kommt mit ins PDF", P,
    [/Beim Vereinswechsel folgt der Assistent dem Vordruck des HFV/, /O04/, /O05/, /Erlaubnis für das Attest/]);
  kriterium("e  Heimweg nach dem Training (Aufsichtspflicht): Eltern kreuzen an, ob das Kind allein nach Hause darf oder abgeholt wird; Kopie an das Trainerteam; ohne Antwort wird die Stelle zur Stift-Stelle", P,
    [/Heimweg nach dem Training/, /allein nach Hause/, /abgeholt/, /Aufsichtspflicht/, /Kopie an das Trainerteam/, /Stift-Stelle/]);
  pruefe("e2 die Erlaubnis für Auftritte am Abend gibt es im PDF nicht mehr (Karneval ohne Auftritte)", P.length > 0 && !/Erlaubnis für Auftritte am Abend/.test(P), ["Abschnitt „Was im PDF steht“ nennt noch die Erlaubnis für Auftritte am Abend"]);
  kriterium("f  Eingaben nur in lateinischer Schrift; Deutsch verbindlich, Englisch, Türkisch, Arabisch als Übersetzungshilfe, PDF bleibt deutsch", A,
    [/lateinischen Buchstaben/, /so wie im Pass/, /Deutsch/, /Englisch/, /Türkisch/, /Arabisch/, /Übersetzungshilfe/, /PDF bleibt deutsch/]);
  kriterium("g  Knopf „Vorführung“ mit Beispielen und Sicht des Vereins, gedacht für die Vorführung", A,
    [/Vorführung/, /Beispiele/, /Sicht des Vereins/, /für die Vorführung gedacht/]);
  kriterium("h  Datenschutz: nichts gesendet oder gespeichert; erfundene Beispieldaten; Telefonnummern der Bundesnetzagentur für Medien", A,
    [/Nichts wird gesendet oder gespeichert/, /erfundene Daten/, /Bundesnetzagentur für Medien/]);
  kriterium("i  Ablauf: Heimweg nach dem Training (allein oder abgeholt) im Schritt „Unterlagen“", A,
    [/Heimweg nach dem Training/, /allein oder abgeholt/]);
  // P3 Teil b (12.10.2026): Der Assistent sagt nichts mehr zur Versicherung beim Probetraining (die Anmeldung gibt es erst danach); der Ablauf nennt es nicht mehr.
  pruefe("i2 Ablauf: kein Satz mehr zur Versicherung beim Probetraining im Schritt „Fertig“", !/Beim Probetraining sind Nichtmitglieder nicht über den Verein versichert/.test(A),
    ["Der Ablauf nennt den Hinweis zur Versicherung beim Probetraining noch; der Assistent zeigt ihn nicht mehr"]);
  kriterium("j  Ablauf: bei Karneval keine Gruppenwahl, die Trainer ordnen die Kinder einer Gruppe zu", A,
    [/Bei Karneval entfallen diese Fragen/, /Eine Gruppenwahl gibt es nicht/, /Die Trainer ordnen die Kinder einer Gruppe zu/]);
  // Paket M14 (12.10.2026): Für Fußball beantragt der Verein immer das Spielrecht (Entscheidung der 1. Vorsitzenden). Die Frage, ob das Kind bei Spielen mitmacht,
  // und der Schritt „spielen“ entfallen; die Erklärung steht kurz beim Spielerpass.
  const KURZ = abschnittText("kurz");
  kriterium("l  Spielrecht: für Fußball beantragt der Verein es immer, die Frage zu den Spielen gibt es nicht mehr, die Erklärung steht beim Spielerpass (Abschnitt „Assistent“)", A,
    [/Bei Fußball zeigt er die Mannschaft und fragt nach Spielerpass und Wechsel/, /Das Spielrecht beantragt der Verein immer/, /Eine Frage, ob das Kind bei Spielen mitmacht, gibt es nicht/]);
  kriterium("l  Spielrecht: der Abschnitt „Kurz gesagt“ nennt die Entscheidung der 1. Vorsitzenden vom 12.10.2026", KURZ,
    [/Das Spielrecht\./, /Für Fußball beantragt der Verein immer das Spielrecht/, /Die Frage „Soll Ihr Kind bei Spielen mitmachen\?“ gibt es nicht mehr/, /1\. Vorsitzende am 12\.10\.2026 entschieden/, /Die Erklärung steht kurz beim Spielerpass/]);
  pruefe("l  die Seite beschreibt die Frage zu den Spielen und die frühere Antwort (Training ohne Spiele) nirgends mehr als Möglichkeit",
    !/Mannschaft, Spielen, Spielerpass|nur\s+(beim\s+|zum\s+)?Training\b|Training ohne Spiele|Bei Kindern nur\sTraining/.test(seiteText.replace(/Frage „Soll Ihr Kind bei Spielen mitmachen\?“ (gibt es nicht mehr|entfallen)/g, "")),
    ["die Seite nennt noch die Frage „Spielen“ oder die frühere Antwort (Training ohne Spiele) als Möglichkeit"]);
  // Paket M11 (12.10.2026): Versand und Übergabe. Die ganze Datei geht per E-Mail an die Geschäftsstelle, auch Teil C (O25, O73); der Verein
  // bewahrt Teil C getrennt auf; kein Server-Versand zum Start (O72); Spielerpässe: Jugend 1. Kassierer, Herren Spielausschuss Senioren (O24).
  const D = abschnittText("datenschutz");
  kriterium("k  Versand und Übergabe: die ganze Datei geht per E-Mail an die Geschäftsstelle, auch Teil C; der Verein bewahrt Teil C getrennt auf; der 1. Kassierer prüft beim Erfassen; kein Server-Versand zum Start", D,
    [/Die Familie schickt die ganze Datei per E-Mail an die Geschäftsstelle, auch Teil C/, /1\. Vorsitzende am 11\.10\.2026/, /O25/, /O73/, /Der Verein bewahrt Teil C getrennt von den übrigen Unterlagen auf/,
      /1\. Kassierer prüft beim Erfassen, ob alles da ist/, /Kein automatischer Versand zum Start/, /O72/, /Spielausschuss Senioren/, /O24/, /Tag des Eingangs/, /O69/]);
  kriterium("k  Teil B geht per E-Mail an die Geschäftsstelle, Teil C heißt „Vertraulich“ und liegt beim Verein getrennt", P,
    [/Geht per E-Mail an die Geschäftsstelle/, /Teil C – Vertraulich/, /Der Verein bewahrt ihn getrennt auf/, /Trennblatt: Was mit Teil C geschieht/]);
  pruefe("k  die Seite sagt nirgends mehr, die Familie gebe die Unterlagen im Verein ab, gebe Teil C getrennt ab, brauche einen Umschlag oder müsse auf den automatischen Versand warten",
    !/getrennt abgeben|im Verein abgegeben|gibt die Originale im Verein ab|Umschlag|nicht per normaler Mail|Offen: automatischer Versand|Passwesen noch zu klären/.test(seiteText),
    ["die Seite sagt noch, die Unterlagen würden im Verein abgegeben, Teil C getrennt abgegeben oder der automatische Versand sei offen"]);
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

// ---------- 7. Karneval, Heimweg und Probetraining ----------

gruppe("7  Karneval ohne Gruppenwahl, Turniere und Auftritte; Heimweg und Probetraining");
{
  const K = abschnittText("karneval");
  const alt = [
    [/\bU3[012]\b/, "Verweis auf die entfernten Unterlagen U30 bis U32"],
    [/karnevalGruppen/, "Zugriff auf karnevalGruppen (in den Daten entfernt)"],
    [/Nimmt eine Gruppe an Turnieren teil/, "Turniere als Teil des Falls „Nur Karneval“"],
    [/Leihvereinbarung/, "Leihvereinbarung für das Kostüm als Unterlage"],
    [/Bei Karneval fragt er nach Gruppe/, "Gruppenwahl, Turniere und Abendauftritte als Fragen des Assistenten"],
    [/Beim Karneval eilt es/, "eilige Termine im Karneval (Meldeschluss des Fastnachtszugs ist vorbei und nicht Sache der Anmeldung)"],
    [/Meldeschluss für den Großen Frankfurter Fastnachtszug/, "Tabelle der eiligen Termine im Karneval"],
    [/laufen zwei Anmeldewege parallel/, "zwei Anmeldewege als dringende Frage der Anmeldung"],
  ];
  const gefunden = alt.filter(([muster]) => muster.test(seiteText)).map(([, grund]) => grund);
  pruefe("kein Text beschreibt Gruppenwahl, Turniere, Auftritte, Kostüme oder den Fastnachtszug als Teil der Anmeldung; keine Verweise auf U30 bis U32", gefunden.length === 0, gefunden);
  const noetig = (name, muster) => pruefe(name, K.length > 0 && muster.every((m) => m.test(K)), K.length ? muster.filter((m) => !m.test(K)).map((m) => "fehlt: " + m) : ["Abschnitt nicht gefunden"]);
  noetig("der Abschnitt „Karneval“ sagt: gehört nicht zur Anmeldung, die Abteilung klärt es selbst, keine Gruppenwahl, Trainer ordnen zu", [
    /Karneval gehört nicht zur Anmeldung/, /klärt ihre Fragen selbst/, /Keine Gruppenwahl/, /Die Trainer ordnen die Kinder einer Gruppe zu/,
  ]);
  noetig("der Abschnitt „Karneval“ nennt, was der Assistent bei Karneval tut: Aufnahmeantrag, Heimweg nach dem Training, Notfall und Fahrten", [
    /Aufnahmeantrag/, /Heimweg nach dem Training/, /Notfall- und Gesundheitsbogen/, /Fahrten und Messenger-Gruppe/,
  ]);
  noetig("der Abschnitt „Karneval“ nennt Turniere, Auftritte am Abend, Kostüme und Fastnachtszug als nicht im Assistenten", [
    /Nicht im Assistenten: Turniere, Auftritte am Abend, Kostüme und der Fastnachtszug/,
  ]);
  const karnevalPunkte = punkte.filter((p) => p.an === "karnevalabteilung");
  const karnevalZeilen = karnevalPunkte.map((p) => alle(baum, (k) => k.attrs.id === p.id.toLowerCase())[0]);
  const imKarneval = karnevalZeilen.map((z, i) => z && hatVorfahr(z, (e) => e.tag === "section" && e.attrs.id === "karneval") ? null : karnevalPunkte[i].id).filter(Boolean);
  pruefe(`die ${karnevalPunkte.length} Punkte der Karnevalabteilung (${karnevalPunkte.map((p) => p.id).join(", ")}) haben ihre Zeile im Abschnitt „Karneval“`, imKarneval.length === 0, imKarneval.map((o) => `${o}: Zeile steht nicht im Abschnitt „Karneval“`));
  const probe = abschnittText("entscheiden");
  pruefe("Probetraining: der Abschnitt „Entscheidungen“ nennt die Entscheidung (keine Versicherung für Nichtmitglieder, Hinweis auf Website und in der App, der Assistent sagt es nicht mehr, Beginn am Tag der Anmeldung)",
    /Versicherung beim Probetraining: entschieden am 11\.10\.2026/.test(probe) && /Der Verein schließt sie nicht ab/.test(probe) && /Website und App weisen stattdessen darauf hin/.test(probe) && /Der Assistent sagt es nicht mehr: Die Anmeldung gibt es erst nach dem Probetraining/.test(probe) && /Die Mitgliedschaft beginnt am Tag der Anmeldung/.test(probe),
    ["Der Kasten zur Versicherung beim Probetraining nennt die Entscheidung vom 11.10.2026 nicht vollständig"]);
}

// ---------- 8. Zugang mit Code vom Probetraining (Paket P1, 12.10.2026) ----------

gruppe("8  Zugang mit Code vom Probetraining, App im Browser, nichts mehr offen (Paket P1)");
{
  const K = abschnittText("kurz");
  const A = abschnittText("assistent");
  const D = abschnittText("datenschutz");
  const E = abschnittText("einfuehrung");
  const noetig = (name, text, muster) => pruefe(name, text.length > 0 && muster.every((m) => m.test(text)), text.length ? muster.filter((m) => !m.test(text)).map((m) => "fehlt: " + m) : ["Abschnitt nicht gefunden"]);
  noetig("„Kurz gesagt“ nennt den Zugang: nur nach dem Probetraining, Code, Link oder QR-Code, in Website und App, Entscheidung vom 12.10.2026", K,
    [/Der Zugang\./, /nur nach dem Probetraining/, /Code, einen Link oder einen QR-Code/, /in der Website und in der App/, /12\.10\.2026/]);
  noetig("„Kurz gesagt“ sagt, dass nichts mehr offen ist: O45 und O67 sind entschieden (Datenschutz-Texte freigegeben)", K,
    [/Nichts mehr offen/, /12\.10\.2026/, /O45/, /O67/]);
  pruefe("„Kurz gesagt“ nennt keinen Punkt mehr als offene Frage („Noch offen“)", K.length > 0 && !/Noch offen/.test(K));
  noetig("„So funktioniert der Assistent“ beschreibt den Schritt „Zugang“: Code beim Probetraining, Seite „Anmeldung nach dem Probetraining“ vor jeder persönlichen Frage, Link überspringt sie, ein Code für alle, passive Mitglieder über die Geschäftsstelle", A,
    [/Zugang/, /Anmeldung nach dem Probetraining/, /vor jeder persönlichen Frage/, /Ein Link mit Code überspringt sie/, /Fußball, Karneval und passive Mitglieder/, /Geschäftsstelle/, /Neuladen/]);
  noetig("„So funktioniert der Assistent“: Blatt mit QR-Code für die Trainer; im Programm steht nur der Prüfwert, nie der Code; der Code ist ein Zugang, kein Geheimnis", A,
    [/Blatt/, /QR-Code/, /Prüfwert \(SHA-256\)/, /nie der Code/, /Zugang, kein Geheimnis/]);
  noetig("„So funktioniert der Assistent“: In der App öffnet ein Link den Browser; die Seite zeigt dort nur den Knopf „Im Browser öffnen“", A,
    [/In der App läuft er nicht in der Webansicht/, /öffnet den Browser/, /Im Browser öffnen/]);
  pruefe("„So funktioniert der Assistent“ sagt nicht mehr, in der App klappe das Speichern manchmal nicht (der Hinweis auf der Fertig-Seite entfällt)", A.length > 0 && !/Klappt Speichern oder Teilen in der App nicht/.test(A));
  noetig("„So funktioniert der Assistent“ (Zusätze zu P1): Auf der Website öffnet „Jetzt anmelden“ ein neues Fenster (die Seiten laufen in einem Rahmen); läuft der Assistent doch in einem Rahmen oder im Browser einer anderen App (Facebook, Instagram), steht oben ein Hinweis, die Anmeldung im Browser zu öffnen", A,
    [/öffnet der Knopf „Jetzt anmelden“ ein neues Fenster/, /in einem Rahmen/, /Rahmen oder im Browser einer anderen App/, /Facebook oder Instagram/, /steht oben ein Hinweis/, /im Browser zu öffnen/, /bleibt dabei bedienbar/]);
  noetig("„Datenschutz“: Rechtsgrundlage der Notfallkontakte (Art. 6 Abs. 1 lit. b und lit. f DSGVO) und Freigabe der 1. Vorsitzenden am 12.10.2026 (O67, O45); der Vorstand „klärt“ nichts mehr", D,
    [/Art\. 6 Abs\. 1 lit\. b DSGVO \(Mitgliedschaft, Fürsorge im Training\) und lit\. f DSGVO \(weitere Kontaktpersonen\)/, /12\.10\.2026 freigegeben \(O67\)/, /Texte der Information und der Einverständnisse am 12\.10\.2026 freigegeben/, /O45/]);
  pruefe("„Datenschutz“: keine offene Frage mehr zu O45 und O67 (kein „klärt der Vorstand“, keine Aufgabe „Information in Einfacher Sprache schreiben“)", D.length > 0 && !/klärt der Vorstand \(\{?o?:?O67/.test(D) && !/Die Rechtsgrundlage dafür klärt der Vorstand/.test(D) && !/Die Information zum Datenschutz in Einfacher Sprache schreiben und übersetzen/.test(D));
  noetig("„Einführung in Schritten“: Trainer geben nach dem Probetraining einen Link oder QR-Code mit dem Code; in der App öffnet der Assistent im Browser; nichts ist mehr offen", E,
    [/nach dem Probetraining einen Link oder QR-Code mit dem Code/, /In der App öffnet der Assistent im Browser/, /Nichts ist mehr offen/]);
  pruefe("die ganze Seite nennt O45 und O67 nirgends offen (kein „Offen“-Kennzeichen, kein Excel-Hinweis auf offene Fragen)", !/Offen sind nur noch|Noch offen:/.test(seiteText) && alle(baum, (k) => k.tag === "tr" && ["o45", "o67"].includes(k.attrs.id) && k.attrs["data-status"] !== "entschieden").length === 0);
}

// ---------- Ergebnis ----------

console.log(`\nErgebnis: ${ergebnis.fehler} Fehler, ${ergebnis.hinweise} Hinweis${ergebnis.hinweise === 1 ? "" : "e"}`);
process.exitCode = ergebnis.fehler > 0 ? 1 : 0;
