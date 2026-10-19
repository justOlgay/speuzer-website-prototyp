#!/usr/bin/env node
// Textmenge im Anmelde-Assistenten messen (Arbeitspaket P3, Runde P, 12.10.2026).
//
// Anlass: Olgay (12.10.2026): „achte … auf einfache Wortwahl und nicht zu viel Text, teilweise wirkt es ganz schön überladen.“
// Das Werkzeug zählt, wie viel Text eine Familie im Assistenten und in den Begleittexten der PDF-Datei liest, und prüft jeden
// Bildschirm gegen die Stilregeln (tools/cache/orchestrierung-anmeldung/STILREGELN.md). Es liest nur: Es baut nichts, schreibt
// nichts nach docs/ und ändert keine Datei des Repos. Ausgaben liegen im Ausgabeordner (Standard:
// tools/cache/orchestrierung-anmeldung/pruefung/p3/).
//
// Aufruf (vom Wurzelordner des Repos):
//   node tools/anmeldung-test/textmenge.mjs [--basis <Ordner>] [--ausgabe <Ordner>] [--name <Name>]
//        [--faelle id,id,…] [--nur-pflicht] [--ohne-pdf] [--ohne-zugang] [--fotos schritt[/teil],…] [--vorschlag <Datei.json>]
//   node tools/anmeldung-test/textmenge.mjs --vergleich vorher,nachher [--ausgabe <Ordner>]
//
//   --basis      Ordner mit dem gebauten Stand (docs/-Aufbau mit anmeldung/index.html und assets/). Standard: docs/.
//                Das Werkzeug startet dafür einen eigenen kleinen Server auf einem freien Port (nie 4173). Für die Messung
//                „vorher“ gibt es die eingefrorene Kopie tools/cache/orchestrierung-anmeldung/p3-basis-docs/ (Stand c4c62dc):
//                So stört ein Bau von docs/ die Messung nicht.
//   --name       Name der Ausgabedateien: textmenge-<Name>.json und .md. Standard: „vorher“, wenn der Basisordner
//                p3-basis-docs heißt, mit --vorschlag „vorschlag“, sonst „nachher“.
//   --faelle     nur diese Fälle (Kennungen siehe unten). --nur-pflicht lässt die Ergänzungsfälle weg.
//   --ohne-pdf   keine PDF-Messung.
//   --fotos      Bildschirme (Schritt oder Schritt/Teil), von denen ein Bildschirmfoto (390 Pixel breit, ganze Seite)
//                <Name>-<schritt>[-<teil>]-390.png entsteht. Standard: spielerpass, abmeldung/status, heimweg,
//                einwilligungen/fahrten, leistungen, mannschaft, pruefen, fertig. „--fotos aus“ schaltet sie ab.
//   --ohne-zugang  keine Messung der Seiten vor dem Assistenten (siehe „Zugang“ unten). Gibt es im Basisordner die Seite
//                seiten-zugang.js nicht (Stand vor Paket P1), entfällt sie von selbst.
//   --vergleich  misst nichts, sondern legt zwei fertige Messungen nebeneinander: --vergleich vorher,nachher liest
//                textmenge-vorher.json und textmenge-nachher.json aus dem Ausgabeordner und schreibt
//                textmenge-vergleich-vorher-nachher.md (Summen je Fall, Änderung je Bildschirm, Verstöße je Regel, die
//                schwersten Bildschirme, Begleittexte der PDF-Datei, die übrig gebliebenen Verstöße).
//   --vorschlag  Überlagerung zum Ausprobieren eines Kürzungsvorschlags, ohne eine Datei zu ändern (nur im Arbeitsspeicher des
//                Messservers). Aufbau der Datei:
//                  { "texte": [ { "datei": "de-oberflaeche" | "de-regeln", "schluessel": "spielerpass.spielrecht", "neu": "…", "anlegen": false } ],
//                    "code":  [ { "datei": "pdf.js", "suche": "…", "ersetze": "…", "anzahl": 1 } ] }
//                „neu“ leer heißt streichen. „code“ ersetzt Text im Quelltext einer Datei unter assets/js/anmeldung/ (zum Beispiel
//                Sätze in pdf.js oder eine Grenze in seiten-ende.js); die Zahl der Treffer muss „anzahl“ entsprechen (Standard 1).
//                „mehr“: [ { "bildschirm": "spielerpass/haupt", "texte": [ { "datei": "de-oberflaeche", "schluessel": "…", "zeilen": [2, 3] } ], "literal": ["…"] } ]
//                bildet einen zugeklappten Bereich „Mehr erfahren“ rechnerisch nach: Der Bildschirm bekommt die Aufklapper-Zeile
//                „Mehr erfahren“ (2 sichtbare Wörter) und die genannten Texte (Wörter aus dem Originaltext, optional nur diese
//                Zeilen) als zugeklappten Inhalt. Den eigentlichen Bereich baut erst Teil b des Pakets; die Zahl der sichtbaren
//                Wörter stimmt, weil zugeklappter Text nicht sichtbar ist.
//
// Gemessen wird bei 390 × 844 (Handy), auf Deutsch, mit festem Datum (29.09.2026, wie in e2e.mjs). Die Fälle laufen mit den
// Beispielen des Assistenten (assets/js/anmeldung/beispiele.js) und mit Profilen aus tools/anmeldung-test/profile.mjs; für diese
// legt der Messserver im Arbeitsspeicher zusätzliche Beispiel-Knöpfe an (die Datei beispiele.js und die Seite bleiben unverändert).
//
// Was „sichtbar“ heißt: Text, den eine Person auf dem Bildschirm sieht. Nicht gezählt werden Text mit hidden/display:none, Text nur für
// Screenreader (sr-only) und der Inhalt zugeklappter Bereiche (details); den zählt das Werkzeug getrennt als „zugeklappt“.
// Der Rahmen (Kopf mit Zurück und Hilfe, Abschnittsleiste, Fuß mit „Alles bleibt auf Ihrem Gerät“) steht auf jedem Bildschirm gleich
// und zählt nicht mit; er wird einmal getrennt gemessen. Der Weiter-Knopf zählt nicht mit.
//
// Arten von Text je Bildschirm (Spalten der Tabelle):
//   titel          die Überschrift (h2)
//   erklaer        Erklärtext: Absätze, Listen (ohne Zwischenüberschriften), auch Hinweise zu einer Auswahl; „vor“ = vor der ersten
//                  Eingabe, „nach“ = danach
//   kaesten        Hinweiskästen (Kasten mit Art „Achtung“, „Zur Information“, „Frist“), Zahl und Wörter einschließlich der Art
//   antworten      Antwortmöglichkeiten (Karten und Ankreuzfelder), nur die Beschriftung
//   zusatz         Zusatzzeile unter einer Antwortmöglichkeit
//   feldHinweis    Hinweiszeile unter der Beschriftung eines Eingabefeldes
//   felder         Beschriftungen von Feldern und Gruppen (Legenden, Namen der Unterschriftsfelder)
//   zwischentitel  Zwischenüberschriften (h3 bis h5)
//   knoepfe        Knöpfe und Links, die wie Knöpfe aussehen (ohne Weiter)
//   aufklapper     Beschriftung zugeklappter Bereiche („Weitere Hinweise (3)“)
//   pruef          Zeilen der Prüfseite (Bezeichnung und Wert)
//   sonst          alles andere
//   gesamt         Summe aller Arten (ohne Rahmen und ohne Weiter-Knopf)
// Sätze trennt das Werkzeug wie tools/anmeldung-test/sprache-check.mjs (an . ! ? : … und Zeilenumbrüchen). „Absätze“ sind die
// Textblöcke (p, li, dt) in Erklärtext und Hinweiskästen.
//
// Fälle (Pflicht): kind-neu (Beispiel „Kind neu (F-Jugend)“), kind-wechsel (Beispiel „Wechsel in Hessen“, Abmeldung und Wartezeit),
// herren-wechsel (Beispiel „Erwachsener wechselt zu den Herren“), karneval-kind (Beispiel), passiv (Profil passiv-foerderer).
// Ergänzung (damit jeder Bildschirm einmal vorkommt): kind-ausland, ohne-eltern, besonderes, familie, senator, konto-andere,
// divers, gesundheit.
//
// Zugang (Paket P1, 12.10.2026; Teil b des Pakets P3): Vor dem Assistenten stehen die Code-Seite („Anmeldung nach dem Probetraining“, nur wenn
// data/anmeldung.json › zugang › pruefwerte nicht leer ist) und, in der Vereins-App, die Übergabe in den Browser; oben auf dem ersten Bildschirm
// kann ein Hinweis zur Umgebung stehen (Browser einer anderen App, Rahmen). Im Repo ist die Liste der Prüfwerte leer, die Fälle laufen also
// ohne Code-Seite. Für die Zugangsfälle startet das Werkzeug einen zweiten Messserver, der der eingebetteten Konfiguration (nur im Arbeitsspeicher)
// einen Prüfwert für einen Messcode gibt. Gemessen werden: zugang-code (erster Bildschirm mit Code-Abfrage), zugang-start (Startschritt nach dem
// richtigen Code), zugang-app (?app=1: Übergabe in den Browser), zugang-inapp (Hinweis oben, Browser einer anderen App) und zugang-rahmen (Hinweis oben,
// Seite in einem Rahmen). Der Startschritt hat eine eigene Regel (S1): höchstens 40 sichtbare Wörter (Vorgabe des Auftraggebers zu P1).
//
// Ausgabe: textmenge-<Name>.json (alle Zahlen und alle gemessenen Texte), textmenge-<Name>.md (Tabellen), Bildschirmfotos und die
// erzeugten PDF-Dateien in pdf-<Name>/. Exit 0, wenn alle Pflichtfälle bis „fertig“ kamen.

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import puppeteer from "puppeteer-core";
import { PROFILE } from "./profile.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CHROME = process.env.CHROME_PFAD || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const JS_ORDNER = "assets/js/anmeldung/";
const HEUTE = "2026-09-29";
const BILDSCHIRM = { name: "390x844", breite: 390, hoehe: 844 };
const TEXT_VERSION = 2;
// Der Startschritt (erster Bildschirm nach dem Code) soll höchstens so viele sichtbare Wörter haben (Vorgabe zu P1, 12.10.2026).
const START_MAX_WOERTER = 40;

// ---------- Aufruf ----------

function arg(name, standard) {
  const i = process.argv.indexOf("--" + name);
  if (i < 0) return standard;
  const wert = process.argv[i + 1];
  return wert !== undefined && !wert.startsWith("--") ? wert : standard;
}
const flag = (name) => process.argv.includes("--" + name);

function ordner(pfad) {
  const kandidaten = [path.resolve(process.cwd(), pfad), path.resolve(ROOT, pfad)];
  return kandidaten.find((p) => fs.existsSync(p)) || kandidaten[0];
}

const BASIS = ordner(arg("basis", "docs"));
const VORSCHLAG_DATEI = arg("vorschlag", null) ? ordner(arg("vorschlag")) : null;
const NAME = arg("name", VORSCHLAG_DATEI ? "vorschlag" : /p3-basis-docs/.test(BASIS) ? "vorher" : "nachher");
const AUSGABE = path.resolve(process.cwd(), arg("ausgabe", path.join(ROOT, "tools", "cache", "orchestrierung-anmeldung", "pruefung", "p3")));
const OHNE_PDF = flag("ohne-pdf");
const OHNE_ZUGANG = flag("ohne-zugang");
const VERGLEICH = arg("vergleich", null);
const NUR_PFLICHT = flag("nur-pflicht");
const FAELLE_AUSWAHL = arg("faelle", "").split(",").map((x) => x.trim()).filter(Boolean);
const FOTO_STANDARD = "spielerpass,abmeldung/status,heimweg,einwilligungen/fahrten,leistungen,mannschaft,pruefen,fertig";
const FOTOS = arg("fotos", FOTO_STANDARD) === "aus" ? [] : arg("fotos", FOTO_STANDARD).split(",").map((x) => x.trim()).filter(Boolean);

// ---------- Zählen (wie tools/anmeldung-test/sprache-check.mjs; hier kopiert, damit „vorher“ und „nachher“ gleich zählen) ----------

// Sätze: Trennung an . ! ? : … und an Zeilenumbrüchen.
export function saetze(text) {
  return String(text)
    .split(/\n+/)
    .flatMap((zeile) => zeile.split(/(?<=[.!?:…])\s+/))
    .map((s) => s.trim())
    .filter(Boolean);
}

// Wörter: durch Leerraum getrennt, Satzzeichen am Rand zählen nicht, „–“ und „/“ allein zählen nicht.
export function woerter(satz) {
  return String(satz)
    .split(/\s+/)
    .map((w) => w.replace(/^[„“"'»«(]+|[„“"'»«).,;:!?…]+$/g, ""))
    .filter((w) => /[\p{L}\p{N}]/u.test(w));
}

const zaehle = (text) => woerter(text).length;

// ---------- Stilregeln, soweit sich maschinell prüfen lässt ----------
// Regeln 5, 6 und 9 (nichts doppelt, keine Begründungen, Fachwörter erklären) prüft ein Mensch.

const ABKUERZUNGEN = [
  [/\bz\.\s?B\./i, "z. B."], [/\bggf\./i, "ggf."], [/\bbzw\./i, "bzw."], [/\bu\.\s?a\./i, "u. a."], [/\bd\.\s?h\./i, "d. h."],
  [/\bca\./i, "ca."], [/\betc\./i, "etc."], [/\busw\./i, "usw."], [/\bNr\./, "Nr."], [/\bHFV\b/, "HFV"], [/\bDFB\b/, "DFB"], [/\bFIFA\b/, "FIFA"],
  [/§/, "§"], [/\bAbs\./, "Abs."],
];
// Amtsdeutsch und Hauptwortketten (Regel 8): Muster → Ersatz
const AMTSWOERTER = [
  [/\bErziehungsberechtigt/i, "Eltern"], [/\bben(ö|oe)tig/i, "brauchen"], [/\bübermittel/i, "schicken"], [/\bmit Wirkung\b/i, "ab"],
  [/\bseitens\b/i, "von"], [/\bhinsichtlich\b/i, "bei / zu"], [/\bbezüglich\b/i, "zu"], [/\bgemäß\b/i, "nach"], [/\bumgehend\b/i, "sofort"],
  [/\bAnschrift\b/, "Adresse"], [/\bvorliegen\b/i, "da sein"], [/\bzeitnah\b/i, "bald"], [/\bverpflichtet\b/i, "muss"],
  [/\bGesundheitsdaten\b/, "Angaben zur Gesundheit"], [/\bnachreichen\b/i, "später schicken"],
];
const GENDERN = /[*]|:innen|\/innen|_innen|\(in\)/i;

function regelpruefung(s) {
  const v = [];
  const merke = (regel, text, wert) => v.push({ regel, text, wert });
  if (s.titelWoerter > 8) merke(1, s.titel, s.titelWoerter + " Wörter (höchstens 8)");
  if (s.eingaben > 0 && (s.vorWoerter > 30 || s.vorSaetze > 2)) merke(2, null, s.vorWoerter + " Wörter in " + s.vorSaetze + " Sätzen vor den Eingaben (höchstens 30 in 2)");
  if (s.kaestenSichtbar > 1) merke(3, null, s.kaestenSichtbar + " sichtbare Hinweiskästen (höchstens 1)");
  for (const b of s.bloecke) {
    if (b.kat === "antwort" && b.woerter > 5) merke(4, b.text, b.woerter + " Wörter in der Antwort (höchstens 5)");
    if ((b.kat === "zusatz" || b.kat === "feldhinweis") && b.woerter > 8) merke(4, b.text, b.woerter + " Wörter in der Zusatzzeile (höchstens 8)");
  }
  for (const x of s.satzListe) if (x.woerter > 12) merke(7, x.text, x.woerter + " Wörter im Satz (höchstens 12)");
  if (s.schluessel === "start/haupt" && s.gesamt > START_MAX_WOERTER) merke("S1", s.titel, s.gesamt + " sichtbare Wörter im Startschritt (Ziel höchstens " + START_MAX_WOERTER + ")");
  const sichtbarerText = s.bloecke.filter((b) => !["pruef", "knopf", "weiter"].includes(b.kat)).map((b) => (b.kat === "kasten" ? b.absaetze.join(" ") : b.text)).join("\n");
  for (const [muster, name] of ABKUERZUNGEN) if (muster.test(sichtbarerText)) merke(10, name, "Abkürzung „" + name + "“");
  for (const [muster, ersatz] of AMTSWOERTER) {
    const t = muster.exec(sichtbarerText);
    if (t) merke(8, t[0], "Amtsdeutsch „" + t[0] + "“ (besser: " + ersatz + ")");
  }
  if (GENDERN.test(sichtbarerText)) merke(11, null, "Sternchen oder Gender-Schreibung");
  return v;
}

// ---------- Messfunktion im Browser ----------
// Läuft in der Seite (page.evaluate). Liefert die sichtbaren Textblöcke des Formulars (Reihenfolge wie im Dokument),
// die Blöcke in zugeklappten Bereichen und versteckten Elementen sowie den Rahmen. Gezählt wird später in Node.

function messeImBrowser() {
  const wurzel = document.getElementById("anmeldung");
  const form = wurzel.querySelector("form.anm-seite");
  const norm = (s) => String(s).replace(/\s+/g, " ").trim();
  const AUSLASSEN = new Set(["SCRIPT", "STYLE", "TEMPLATE", "CANVAS", "SELECT", "TEXTAREA", "INPUT", "IMG", "SVG", "NOSCRIPT"]);
  const FELDTYP = "input:not([type=radio]):not([type=checkbox]):not([type=file]):not([type=hidden]), select, textarea";
  const bloecke = [];
  const zu = [];
  const versteckt = [];
  let eingaben = 0;
  let gesehen = false;

  const unsichtbar = (n) => {
    if (n.hidden || (n.classList && n.classList.contains("sr-only"))) return true;
    const cs = getComputedStyle(n);
    return cs.display === "none" || cs.visibility === "hidden";
  };

  // Sichtbarer Text eines Elements: ohne unsichtbare Teile; ein zugeklappter Aufklapper zählt nur mit seiner Überschrift.
  // Elemente, die nicht „inline“ sind (Absätze, Listenpunkte, Knöpfe …), trennen Wörter; Inline-Elemente (strong, span …) nicht.
  const sichtText = (el) => {
    let t = "";
    const gehe = (n) => {
      if (n.nodeType === 3) {
        t += n.nodeValue;
        return;
      }
      if (n.nodeType !== 1 || AUSLASSEN.has(n.tagName.toUpperCase()) || unsichtbar(n)) return;
      if (n.tagName === "BR") {
        t += " ";
        return;
      }
      const d = getComputedStyle(n).display;
      const trenner = d !== "inline" && d !== "contents";
      if (trenner) t += " ";
      if (n.tagName === "DETAILS" && !n.open) {
        const s = n.querySelector(":scope > summary");
        if (s) gehe(s);
      } else for (const c of n.childNodes) gehe(c);
      if (trenner) t += " ";
    };
    gehe(el);
    return norm(t);
  };

  const ablegen = (zuFlag, eintrag) => (zuFlag ? zu : bloecke).push(eintrag);
  const add = (kat, el, zuFlag, extra) => {
    const text = sichtText(el);
    if (!text) return;
    ablegen(zuFlag, Object.assign({ kat, text, tag: el.tagName.toLowerCase(), klasse: String(el.getAttribute("class") || ""), vor: !gesehen }, extra || {}));
  };
  const merkeVersteckt = (el) => {
    const t = norm(el.textContent);
    if (t) versteckt.push({ text: t, klasse: String(el.getAttribute("class") || "") });
  };

  const hatBlockKinder = (el) => !!el.querySelector(":scope > p, :scope > ul, :scope > ol, :scope > div, :scope > h3, :scope > h4, :scope > h5");
  const feldHinweis = (el) => {
    const f = el.closest(".anm-feld");
    return !!f && !!f.querySelector(FELDTYP);
  };

  function katVon(el) {
    if (el.matches("h2.anm-titel")) return "titel";
    if (el.matches("legend, label.anm-label, .anm-unterschrift__titel")) return "feld";
    if (el.matches("button, a.knopf, label.anm-datei")) return el.matches('[data-aktion="weiter"]') ? "weiter" : "knopf";
    if (el.matches(".anm-pruefzeile > dt, .anm-pruefzeile > dd.anm-pruefzeile__wert")) return "pruef";
    if (el.matches("dd.anm-pruefzeile__aktion")) return null; // enthält nur den Knopf „Ändern“
    if (el.matches("p.anm-unterschrift__stand, p[role=status]")) return "sonst";
    if (el.matches("h3, h4, h5")) return "zwischentitel";
    if (el.matches("p, li, dt, dd") && !hatBlockKinder(el)) return el.matches("p.anm-hinweis") && feldHinweis(el) ? "feldhinweis" : "erklaer";
    return null;
  }

  function kasten(el, zuFlag) {
    const label = el.querySelector(".anm-hinweiskasten__label");
    const labelText = label ? sichtText(label) : "";
    const teile = Array.from(el.querySelectorAll("p, li"))
      .filter((p) => p !== label && !p.querySelector("p, li") && !unsichtbar(p))
      .map(sichtText)
      .filter(Boolean);
    const art = el.getAttribute("data-hinweis-art") || ((String(el.getAttribute("class")).match(/anm-hinweiskasten--(\w+)/) || [])[1] || "");
    ablegen(zuFlag, { kat: "kasten", art, schluessel: el.getAttribute("data-hinweis-key"), label: labelText, absaetze: teile, text: [labelText, ...teile].filter(Boolean).join(" "), vor: !gesehen });
  }

  function karte(el, zuFlag) {
    gesehen = true;
    eingaben++;
    const eingabe = el.querySelector("input");
    const art = eingabe ? eingabe.type : "radio";
    const t = el.querySelector(".anm-karte__titel");
    const h = el.querySelector(".anm-karte__hinweis");
    add("antwort", t || el, zuFlag, { art });
    if (h) add("zusatz", h, zuFlag, { art });
  }

  function verarbeite(el, zuFlag) {
    const tag = el.tagName;
    if (AUSLASSEN.has(tag.toUpperCase())) {
      if (!zuFlag && (tag === "SELECT" || tag === "TEXTAREA" || tag === "CANVAS" || (tag === "INPUT" && !["radio", "checkbox", "file", "hidden"].includes(el.type))) && !unsichtbar(el)) {
        eingaben++;
        gesehen = true;
      }
      return;
    }
    if (el.hidden || el.classList.contains("sr-only") || getComputedStyle(el).display === "none") {
      if (!el.classList.contains("sr-only")) merkeVersteckt(el);
      return;
    }
    if (getComputedStyle(el).visibility === "hidden") return;
    if (tag === "DETAILS") {
      const summary = el.querySelector(":scope > summary");
      if (summary) add("aufklapper", summary, zuFlag, { offen: el.open });
      for (const c of el.children) if (c !== summary) verarbeite(c, zuFlag || !el.open);
      return;
    }
    if (el.classList.contains("anm-hinweiskasten")) return kasten(el, zuFlag);
    if (el.matches("label.anm-karte")) return karte(el, zuFlag);
    // Eine Liste von Fragen (Nachweise): Der Text je Unterlage gehört zu ihrer Frage, nicht zur Einleitung der Seite.
    if (el.matches("section[data-unterlage]")) gesehen = true;
    const kat = katVon(el);
    if (kat) return add(kat, el, zuFlag, null);
    // Container: eigener Text und Kinder in der Reihenfolge des Dokuments
    for (const n of el.childNodes) {
      if (n.nodeType === 3) {
        const t = norm(n.nodeValue);
        if (t) ablegen(zuFlag, { kat: "sonst", text: t, tag: "#text", klasse: "", vor: !gesehen });
      } else if (n.nodeType === 1) {
        if (["SPAN", "STRONG", "EM", "B", "I", "A", "SMALL", "BDI"].includes(n.tagName)) add("sonst", n, zuFlag, null);
        else verarbeite(n, zuFlag);
      }
    }
  }

  // Der Weiter-Knopf liegt nach dem Inhalt; er steht in der Liste, zählt aber nicht mit (kat „weiter“).
  for (const kind of Array.from(form.children)) verarbeite(kind, false);

  const rahmen = [];
  for (const sel of [":scope > header.anm-kopf", ":scope > nav.anm-abschnitte", ":scope > footer.anm-fuss"]) {
    const e = wurzel.querySelector(sel);
    if (e && !unsichtbar(e)) {
      const t = sichtText(e);
      if (t) rahmen.push(t);
    }
  }
  const titel = form.querySelector("h2.anm-titel");
  return {
    schritt: wurzel.dataset.schritt,
    teil: wurzel.dataset.teil,
    titel: titel ? sichtText(titel) : "",
    eingaben,
    bloecke,
    zu,
    versteckt,
    rahmen,
  };
}

// ---------- Auswertung eines Bildschirms (Node) ----------

function wertAus(roh) {
  const zuB = (liste) => liste.map((b) => ({ ...b, woerter: zaehle(b.text) }));
  const bloecke = zuB(roh.bloecke);
  const zu = zuB(roh.zu);
  const summe = (kat, filter) => bloecke.filter((b) => b.kat === kat && (!filter || filter(b))).reduce((n, b) => n + b.woerter, 0);
  const kaesten = bloecke.filter((b) => b.kat === "kasten");
  const erklaer = bloecke.filter((b) => b.kat === "erklaer");
  // Sätze des Fließtexts: Erklärtext, Absätze der Kästen, Zusatzzeilen, Feldhinweise, Antworten und Titel
  const satzQuellen = [];
  for (const b of bloecke) {
    if (["erklaer", "zusatz", "feldhinweis", "antwort", "titel"].includes(b.kat)) satzQuellen.push({ kat: b.kat, text: b.text });
    if (b.kat === "kasten") for (const a of b.absaetze) satzQuellen.push({ kat: "kasten", text: a });
  }
  const satzListe = [];
  for (const q of satzQuellen) for (const s of saetze(q.text)) satzListe.push({ kat: q.kat, text: s, woerter: zaehle(s) });
  const fliess = satzListe.filter((x) => x.kat === "erklaer" || x.kat === "kasten");
  const laengster = satzListe.reduce((m, x) => (x.woerter > m.woerter ? x : m), { woerter: 0, text: "" });
  const vorErklaer = erklaer.filter((b) => b.vor);
  const vorSaetze = vorErklaer.reduce((n, b) => n + saetze(b.text).length, 0);
  const absaetze = erklaer.length + kaesten.reduce((n, b) => n + b.absaetze.length, 0);
  const kaestenWoerter = kaesten.reduce((n, b) => n + b.woerter, 0);
  const antworten = bloecke.filter((b) => b.kat === "antwort");
  const zusatz = bloecke.filter((b) => b.kat === "zusatz");
  const s = {
    schritt: roh.schritt,
    teil: roh.teil,
    schluessel: roh.schritt + "/" + roh.teil,
    titel: roh.titel,
    titelWoerter: zaehle(roh.titel),
    eingaben: roh.eingaben,
    erklaerWoerter: summe("erklaer"),
    vorWoerter: erklaer.filter((b) => b.vor).reduce((n, b) => n + b.woerter, 0),
    nachWoerter: erklaer.filter((b) => !b.vor).reduce((n, b) => n + b.woerter, 0),
    vorSaetze,
    kaestenAnzahl: kaesten.length,
    kaestenSichtbar: kaesten.length,
    kaestenWoerter,
    antwortAnzahl: antworten.length,
    antwortWoerter: summe("antwort"),
    antwortMax: antworten.reduce((m, b) => Math.max(m, b.woerter), 0),
    zusatzWoerter: summe("zusatz"),
    zusatzMax: zusatz.reduce((m, b) => Math.max(m, b.woerter), 0),
    feldHinweisWoerter: summe("feldhinweis"),
    felderWoerter: summe("feld"),
    zwischentitelWoerter: summe("zwischentitel"),
    knoepfeWoerter: summe("knopf"),
    aufklapperWoerter: summe("aufklapper"),
    pruefWoerter: summe("pruef"),
    sonstWoerter: summe("sonst"),
    saetze: fliess.length,
    absaetze,
    laengsterSatz: laengster.woerter,
    laengsterSatzText: laengster.text,
    satzUeber8: satzListe.filter((x) => x.woerter > 8).length,
    satzUeber12: satzListe.filter((x) => x.woerter > 12).length,
    zugeklapptWoerter: zu.reduce((n, b) => n + b.woerter, 0),
    zugeklapptBloecke: zu.length,
    versteckteWoerter: roh.versteckt.reduce((n, b) => n + zaehle(b.text), 0),
    rahmenWoerter: roh.rahmen.reduce((n, t) => n + zaehle(t), 0),
    bloecke,
    zu,
    versteckt: roh.versteckt,
    satzListe,
  };
  s.gesamt = s.titelWoerter + s.erklaerWoerter + s.kaestenWoerter + s.antwortWoerter + s.zusatzWoerter + s.feldHinweisWoerter + s.felderWoerter + s.zwischentitelWoerter + s.knoepfeWoerter + s.aufklapperWoerter + s.pruefWoerter + s.sonstWoerter;
  // Abschnitte (nach Zwischenüberschriften), für Prüf- und Fertig-Seite
  const abschnitte = [];
  let aktuell = { titel: "(oben)", woerter: 0 };
  for (const b of bloecke) {
    if (b.kat === "weiter") continue;
    if (b.kat === "titel") continue;
    if (b.kat === "zwischentitel") {
      if (aktuell.woerter) abschnitte.push(aktuell);
      aktuell = { titel: b.text, woerter: b.woerter };
      continue;
    }
    aktuell.woerter += b.kat === "kasten" ? b.woerter : b.woerter;
  }
  if (aktuell.woerter) abschnitte.push(aktuell);
  s.abschnitte = abschnitte;
  s.verstoesse = regelpruefung(s);
  // schwere Bildschirme: nur Zahlen, ohne die Textlisten, für Tabellen
  return s;
}

// ---------- Fälle ----------

const PFLICHT = [
  { id: "kind-neu", titel: "Kind neu im Fußball (F-Jugend)", beispiel: "kind-neu" },
  { id: "kind-wechsel", titel: "Kind mit Vereinswechsel (D-Jugend, Abmeldung, Wartezeit)", beispiel: "wechsel-hessen" },
  { id: "herren-wechsel", titel: "Herren mit Vereinswechsel", beispiel: "herren-wechsel" },
  { id: "karneval-kind", titel: "Karneval, Kind", beispiel: "karneval-kind" },
  { id: "passiv", titel: "Passives Mitglied (Erwachsener)", profil: "passiv-foerderer" },
];
const ERGAENZUNG = [
  { id: "kind-ausland", titel: "Kind ohne deutschen Pass (12 Jahre)", beispiel: "ausland-kind" },
  { id: "ohne-eltern", titel: "Kind ohne Eltern in Deutschland (Flucht)", profil: "gefluechtet-ohne-eltern" },
  { id: "besonderes", titel: "A-Jugend hilft bei den Herren aus", profil: "a-jugend-aushilfe-herren" },
  { id: "familie", titel: "Familienbeitrag (drei Mitglieder)", profil: "familie-drei-mitglieder" },
  { id: "senator", titel: "Senator im Karneval", profil: "senator-karneval" },
  { id: "konto-andere", titel: "Lastschrift, Konto einer anderen Person", profil: "sepa-anderer-kontoinhaber" },
  { id: "divers", titel: "Geschlecht „ohne Angabe“", profil: "geschlecht-ohne-angabe" },
  { id: "gesundheit", titel: "Kind neu mit Gesundheitsbogen", profil: "kind-neu-deutsch-f", ueberschreibe: { gesundheitsbogen: true, gesundheit: { allergien: "Pollen", erkrankungen: "", medikamente: "", sonstiges: "" } } },
];

// Alle Bildschirme (Schritt/Teil), die der Assistent kennt; dient der Abdeckungsprüfung.
const ALLE_BILDSCHIRME = [
  "start/haupt", "wer/haupt", "name/haupt", "geburt/datum", "geburt/geschlecht", "abteilung/haupt", "mannschaft/haupt", "spielerpass/haupt", "alter_verein/haupt",
  "abmeldung/status", "abmeldung/datum", "abmeldung/weg", "abmeldung/mitgliedschaft", "abmeldung/anschrift", "abmeldung/spiele", "abmeldung/sperre", "abmeldung/freigabe", "abmeldung/wechsel",
  "pass/deutsch", "pass/staaten", "ausland/haupt", "wohnen/ort", "wohnen/seit", "wohnen/grund", "wohnen/dauer", "sorge/recht", "sorge/personen", "besonderes/haupt",
  "kontakt/anschrift", "kontakt/erreichen", "beitrag/gruppe", "beitrag/familie", "beitrag/senator", "leistungen/haupt", "zahlung/art", "zahlung/inhaber", "zahlung/iban",
  "einwilligungen/fotos", "einwilligungen/hfv", "einwilligungen/fahrten", "heimweg/haupt", "notfall/kontakt", "notfall/bogen", "notfall/gesundheit",
  "spielerfoto/haupt", "nachweise/haupt", "unterschriften/haupt", "pruefen/haupt", "fertig/haupt",
];
// Die zwei Seiten vor dem Assistenten (Paket P1): Sie kommen nur in den Zugangsfällen vor.
const ZUGANG_BILDSCHIRME = ["code/haupt", "uebergabe/haupt"];
const ZUGANG_FAELLE = [
  { id: "zugang-code", titel: "Code-Seite (erster Bildschirm, wenn ein Code verlangt wird)", art: "code" },
  { id: "zugang-start", titel: "Startschritt nach dem richtigen Code", art: "start" },
  { id: "zugang-app", titel: "Vereins-App: Übergabe in den Browser (?app=1)", art: "app" },
  { id: "zugang-inapp", titel: "Browser einer anderen App: Hinweis oben auf der Code-Seite", art: "inapp" },
  { id: "zugang-rahmen", titel: "Seite in einem Rahmen: Hinweis oben auf der Code-Seite", art: "rahmen" },
];

function antwortenVon(fall) {
  if (!fall.profil) return null;
  const p = PROFILE.find((x) => x.id === fall.profil);
  if (!p) throw new Error("Profil unbekannt: " + fall.profil);
  const a = JSON.parse(JSON.stringify(p.a));
  // Foto und Nachweise werden hier nicht hochgeladen: Der Verein macht das Foto.
  if (a.spielerfoto && ["foto", "datei"].includes(a.spielerfoto.weg)) a.spielerfoto = { weg: "verein" };
  a.nachweise = {};
  Object.assign(a, fall.ueberschreibe || {});
  return a;
}

// ---------- Messserver ----------

const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2", ".ttf": "font/ttf", ".pdf": "application/pdf", ".txt": "text/plain; charset=utf-8" };

// Zeichnet den Aufruf von erzeugePdf() auf und gibt die Datei und die Seitenarten an die Seite weiter (window.__mess).
// Ändert nichts am Ablauf. Wie der Spion in testserver.mjs; die Datei auf der Platte bleibt unverändert.
const SPION = `
;try {
  const __orig = erzeugePdf;
  erzeugePdf = async function (opts) {
    opts.bericht = opts.bericht || {};
    const r = await __orig(opts);
    let bin = "";
    for (let i = 0; i < r.bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, r.bytes.subarray(i, i + 0x8000));
    window.__mess = { b64: btoa(bin), seiten: r.seiten, teile: r.teile, dateiname: r.dateiname, bericht: { seiten: opts.bericht.seiten || null } };
    return r;
  };
} catch (e) { /* kein Spion möglich */ }
`;

async function ladeWoerterbuch(basis, name) {
  const datei = path.join(basis, JS_ORDNER, "texte", name + ".js");
  return JSON.parse(JSON.stringify((await import(pathToFileURL(datei).href + "?t=" + Date.now())).default));
}

// „anlegen“: legt einen neuen Schlüssel an (nur die letzte Stufe darf fehlen); sonst muss der Schlüssel schon da sein.
function setzeText(objekt, schluessel, neu, anlegen) {
  const teile = String(schluessel).split(".");
  let x = objekt;
  for (let i = 0; i < teile.length - 1; i++) {
    if (!x || typeof x !== "object" || !(teile[i] in x)) throw new Error("Vorschlag: Schlüssel nicht gefunden: " + schluessel);
    x = x[teile[i]];
  }
  const letzter = teile[teile.length - 1];
  if (!x || typeof x !== "object" || (!(letzter in x) && !anlegen)) throw new Error("Vorschlag: Schlüssel nicht gefunden: " + schluessel);
  x[letzter] = neu === null || neu === undefined ? "" : neu;
}

// Text zu einem Schlüssel aus einem Wörterbuch; bei Varianten (kind/selbst) gilt „kind“.
function holeText(woerterbuch, schluessel) {
  let x = woerterbuch;
  for (const teil of String(schluessel).split(".")) {
    if (!x || typeof x !== "object" || !(teil in x)) throw new Error("Vorschlag (mehr): Schlüssel nicht gefunden: " + schluessel);
    x = x[teil];
  }
  if (x && typeof x === "object" && ("kind" in x || "selbst" in x)) x = x.kind ?? x.selbst;
  if (typeof x !== "string") throw new Error("Vorschlag (mehr): kein Text: " + schluessel);
  return x;
}

// Bildschirm → Texte, die im zugeklappten Bereich „Mehr erfahren“ stehen sollen (rechnerisch, siehe oben)
async function baueMehr(basis, vorschlag) {
  const karte = new Map();
  if (!vorschlag || !Array.isArray(vorschlag.mehr)) return karte;
  const buecher = {};
  for (const m of vorschlag.mehr) {
    const liste = karte.get(m.bildschirm) || [];
    for (const z of m.literal || []) if (String(z).trim()) liste.push(String(z).trim());
    for (const t of m.texte || []) {
      if (!buecher[t.datei]) buecher[t.datei] = await ladeWoerterbuch(basis, t.datei);
      const zeilen = holeText(buecher[t.datei], t.schluessel).split("\n");
      const gewaehlt = Array.isArray(t.zeilen) ? t.zeilen.map((n) => zeilen[n - 1]).filter((z) => z !== undefined) : zeilen;
      for (const z of gewaehlt) if (z.trim()) liste.push(z.trim());
    }
    karte.set(m.bildschirm, liste);
  }
  return karte;
}
let MEHR = new Map();

async function baueEingriffe(basis, vorschlag, extra) {
  const e = new Map();
  const lies = (rel) => fs.readFileSync(path.join(basis, rel), "utf8");
  // 1. zusätzliche Beispiele (Profile aus profile.mjs)
  const mitProfil = extra.filter((f) => f.profil);
  if (mitProfil.length) {
    e.set("/anmeldung/", (inhalt) => beispielKnoepfe(inhalt.toString("utf8"), mitProfil));
    e.set("/anmeldung/index.html", (inhalt) => beispielKnoepfe(inhalt.toString("utf8"), mitProfil));
    e.set("/" + JS_ORDNER + "beispiele.js", (inhalt) => inhalt.toString("utf8") + "\n;BEISPIELE.push(" + mitProfil.map((f) => "{ id: " + JSON.stringify("mess-" + f.id) + ", titel: " + JSON.stringify(f.titel) + ", antworten: () => (" + JSON.stringify(antwortenVon(f)) + ") }").join(", ") + ");\n");
  }
  // 2. Vorschlag: Texte und Code
  const code = new Map();
  if (vorschlag) {
    const texte = vorschlag.texte || [];
    for (const datei of ["de-oberflaeche", "de-regeln"]) {
      const eigene = texte.filter((t) => t.datei === datei);
      if (!eigene.length) continue;
      const w = await ladeWoerterbuch(basis, datei);
      for (const t of eigene) setzeText(w, t.schluessel, t.neu, t.anlegen === true);
      e.set("/" + JS_ORDNER + "texte/" + datei + ".js", () => "export default " + JSON.stringify(w) + ";\n");
    }
    for (const c of vorschlag.code || []) {
      if (!code.has(c.datei)) code.set(c.datei, []);
      code.get(c.datei).push(c);
    }
    for (const [datei, liste] of code) {
      let quelle = lies(JS_ORDNER + datei);
      for (const c of liste) {
        const treffer = quelle.split(c.suche).length - 1;
        if (treffer !== (c.anzahl || 1)) throw new Error("Vorschlag: „" + String(c.suche).slice(0, 60) + "“ kommt in " + datei + " " + treffer + "-mal vor, erwartet " + (c.anzahl || 1));
        quelle = quelle.split(c.suche).join(c.ersetze);
      }
      const url = "/" + JS_ORDNER + datei;
      const vorher = e.get(url);
      e.set(url, (inhalt) => (vorher ? vorher(Buffer.from(quelle)) : quelle));
    }
  }
  // 3. Spion am PDF-Baustein (immer; nach einer Ersetzung im Quelltext)
  const pdfUrl = "/" + JS_ORDNER + "pdf.js";
  const vorherPdf = e.get(pdfUrl);
  e.set(pdfUrl, (inhalt) => (vorherPdf ? vorherPdf(inhalt) : inhalt.toString("utf8")) + SPION);
  return e;
}

function beispielKnoepfe(html, faelle) {
  const li = faelle.map((f) => '<li><button type="button" class="knopf knopf--sekundaer anm-beispiel" data-beispiel="' + "mess-" + f.id + '">' + f.titel + "</button></li>").join("");
  if (html.includes('class="anm-beispiele">')) return html.replace('class="anm-beispiele">', 'class="anm-beispiele">' + li);
  return html.replace("</main>", "<div hidden>" + li + "</div></main>");
}

// virtuell: Pfad → { typ, inhalt }, Seiten, die es im Basisordner nicht gibt (zum Beispiel die Seite mit dem Rahmen der Zugangsmessung)
function starteServer(basis, eingriffe, virtuell = new Map()) {
  const server = http.createServer((req, res) => {
    try {
      const url = new URL(req.url, "http://127.0.0.1");
      const pfad = decodeURIComponent(url.pathname);
      const rel = pfad.endsWith("/") ? pfad + "index.html" : pfad;
      if (virtuell.has(pfad)) {
        res.writeHead(200, { "Content-Type": virtuell.get(pfad).typ, "Cache-Control": "no-store" });
        res.end(virtuell.get(pfad).inhalt);
        return;
      }
      const datei = path.resolve(basis, "." + rel);
      if (!datei.startsWith(basis + path.sep) || !fs.existsSync(datei) || fs.statSync(datei).isDirectory()) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("nicht gefunden: " + pfad);
        return;
      }
      let inhalt = fs.readFileSync(datei);
      const eingriff = eingriffe.get(pfad) || eingriffe.get(rel);
      if (eingriff) inhalt = Buffer.from(eingriff(inhalt));
      res.writeHead(200, { "Content-Type": MIME[path.extname(datei)] || "application/octet-stream", "Cache-Control": "no-store" });
      res.end(inhalt);
    } catch (fehler) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(String(fehler && fehler.message));
    }
  });
  return new Promise((ok) => server.listen(0, "127.0.0.1", () => ok({ server, port: server.address().port })));
}

// ---------- Lauf durch den Assistenten ----------

const UHR = `(() => {
  const feste = new Date("2026-09-29T10:00:00").getTime();
  const Echt = Date;
  class Uhr extends Echt {
    constructor(...a) { if (a.length === 0) super(feste); else super(...a); }
    static now() { return feste; }
  }
  window.Date = Uhr;
})();`;

const warte = (ms) => new Promise((r) => setTimeout(r, ms));

async function stand(page) {
  return page.$eval("#anmeldung", (e) => ({ schritt: e.dataset.schritt, teil: e.dataset.teil }));
}

async function warteAufWechsel(page, vorher, timeout = 8000) {
  try {
    await page.waitForFunction(
      (v) => {
        const w = document.getElementById("anmeldung");
        const box = w.querySelector(".anm-fehlerbox");
        return w.dataset.schritt !== v.schritt || w.dataset.teil !== v.teil || (box && !box.hidden);
      },
      { timeout },
      vorher
    );
  } catch (e) {
    /* der Aufrufer prüft den Stand */
  }
}

async function zeichneUnterschriften(page) {
  const haken = await page.$('#anmeldung input[data-pfad="satzung"]');
  if (haken && !(await haken.evaluate((e) => e.checked))) {
    const id = await haken.evaluate((e) => e.id);
    await page.click('#anmeldung label[for="' + id + '"]');
  }
  const felder = await page.$$eval("#anmeldung .anm-unterschrift", (l) => l.map((e) => e.getAttribute("data-unterschrift")));
  for (const wer of felder) {
    const canvas = await page.$('#anmeldung .anm-unterschrift[data-unterschrift="' + wer + '"] canvas');
    await canvas.evaluate((e) => e.scrollIntoView({ block: "center" }));
    const box = await canvas.boundingBox();
    const p = [];
    for (let i = 0; i <= 14; i++) p.push({ x: box.x + 24 + (i * (box.width - 48)) / 14, y: box.y + box.height * (0.45 + 0.25 * Math.sin(i * 1.3)) });
    await page.mouse.move(p[0].x, p[0].y);
    await page.mouse.down();
    for (const q of p.slice(1)) await page.mouse.move(q.x, q.y, { steps: 2 });
    await page.mouse.up();
  }
  await page.waitForFunction((n) => document.querySelectorAll("#anmeldung .anm-unterschrift--fertig").length >= n, { timeout: 5000 }, felder.length).catch(() => {});
}

function fotoName(schluessel) {
  const [schritt, teil] = schluessel.split("/");
  return NAME + "-" + schritt + (teil && teil !== "haupt" ? "-" + teil : "") + "-390.png";
}

async function laufeFall(browser, server, fall, geseheneFotos) {
  const ergebnis = { id: fall.id, titel: fall.titel, quelle: fall.beispiel ? "Beispiel " + fall.beispiel : "Profil " + fall.profil + (fall.ueberschreibe ? " (angepasst)" : ""), pflicht: !!fall.pflicht, seiten: [], fehler: null, textFehlt: [], konsole: [] };
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: BILDSCHIRM.breite, height: BILDSCHIRM.hoehe, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await page.evaluateOnNewDocument(UHR);
    page.on("console", (m) => {
      const t = m.text();
      if (m.type() === "error") ergebnis.konsole.push(t);
      if (m.type() === "warning" && /Text fehlt/.test(t)) ergebnis.textFehlt.push(t);
    });
    page.on("pageerror", (e) => ergebnis.konsole.push("pageerror: " + e.message));
    await page.goto(server.basis + "/anmeldung/", { waitUntil: "networkidle0" });
    await page.waitForSelector("#anmeldung[data-bereit]", { timeout: 15000 });
    const beispielId = fall.beispiel || "mess-" + fall.id;
    await page.evaluate((id) => {
      const b = document.querySelector('[data-beispiel="' + id + '"]');
      if (!b) throw new Error("Beispiel nicht gefunden: " + id);
      b.click();
    }, beispielId);
    await page.waitForFunction(() => /Beispiel geladen/.test((document.querySelector(".anm-meldung") || {}).textContent || ""), { timeout: 5000 }).catch(() => {});

    const gesehen = new Set();
    for (let i = 0; i < 120; i++) {
      let s = await stand(page);
      let schluessel = s.schritt + "/" + s.teil;
      if (gesehen.has(schluessel)) {
        ergebnis.fehler = "Schleife bei " + schluessel;
        break;
      }
      gesehen.add(schluessel);
      if (s.schritt === "fertig") {
        const ende = await page.waitForSelector('#anmeldung [data-status="fertig"], #anmeldung [data-status="fehler"]', { timeout: 120000 }).catch(() => null);
        const art = ende ? await ende.evaluate((e) => e.getAttribute("data-status")) : "zeit";
        if (art !== "fertig") ergebnis.fehler = "Die Datei wurde nicht erstellt (Zustand: " + art + ")";
      }
      await warte(60);
      const roh = await page.evaluate(messeImBrowser);
      const nachgebildet = MEHR.get(roh.schritt + "/" + roh.teil);
      if (nachgebildet && nachgebildet.length) {
        roh.bloecke.push({ kat: "aufklapper", text: "Mehr erfahren", tag: "summary", klasse: "simuliert", vor: false, simuliert: true });
        for (const z of nachgebildet) roh.zu.push({ kat: "erklaer", text: z, tag: "p", klasse: "simuliert", vor: false, simuliert: true });
      }
      const seite = wertAus(roh);
      ergebnis.seiten.push(seite);
      if (FOTOS.includes(schluessel) || FOTOS.includes(s.schritt)) {
        if (!geseheneFotos.has(schluessel)) {
          geseheneFotos.add(schluessel);
          await page.screenshot({ path: path.join(AUSGABE, fotoName(schluessel)), fullPage: true });
          seite.foto = fotoName(schluessel);
        }
      }
      if (s.schritt === "fertig") {
        if (!OHNE_PDF && !ergebnis.fehler) ergebnis.pdfRoh = await page.evaluate(() => window.__mess || null);
        break;
      }
      if (s.schritt === "unterschriften") await zeichneUnterschriften(page);
      const knopf = await page.$('#anmeldung [data-aktion="weiter"]');
      if (!knopf) {
        ergebnis.fehler = "Kein Weiter-Knopf auf " + schluessel;
        break;
      }
      await knopf.evaluate((e) => e.scrollIntoView({ block: "center" }));
      await knopf.click();
      await warteAufWechsel(page, s);
      const danach = await stand(page);
      if (danach.schritt === s.schritt && danach.teil === s.teil) {
        const meldungen = await page.evaluate(() => Array.from(document.querySelectorAll("#anmeldung .anm-fehlerbox li")).map((li) => li.textContent.trim()));
        ergebnis.fehler = "Weiter auf " + schluessel + " führt nicht weiter: " + (meldungen.join(" | ") || "keine Meldung");
        break;
      }
    }
    if (ergebnis.seiten.length && ergebnis.seiten[ergebnis.seiten.length - 1].schritt !== "fertig" && !ergebnis.fehler) ergebnis.fehler = "Ende nicht erreicht";
  } catch (fehler) {
    ergebnis.fehler = String(fehler && fehler.message ? fehler.message : fehler);
  } finally {
    await page.close();
  }
  return ergebnis;
}

// ---------- Zugang und Umgebung (Paket P1) ----------

// Der Messcode steht nur hier im Werkzeug, nie im Repo; im Messserver trägt die eingebettete Konfiguration (nur im Arbeitsspeicher) seinen Prüfwert.
const MESS_CODE = "MESS-CODE-2026";
const messPruefwert = () => createHash("sha256").update(MESS_CODE.replace(/[\s-]/g, "").toUpperCase(), "utf8").digest("hex");
// Kennung eines In-App-Browsers (Instagram auf dem iPhone): umgebung.js erkennt ihn im User-Agent.
const IN_APP_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 330.0.0.20.113";

// Gibt der eingebetteten Konfiguration einen Prüfwert: Dann zeigt der Assistent zuerst die Code-Seite.
function mitPruefwert(html) {
  const muster = /(<script type="application\/json" id="anmeldung-konfig">)([\s\S]*?)(<\/script>)/;
  if (!muster.test(html)) throw new Error("anmeldung/index.html enthält keine eingebettete Konfiguration");
  return html.replace(muster, (m, a, json, c) => {
    const k = JSON.parse(json);
    k.anmeldung = k.anmeldung || {};
    k.anmeldung.zugang = { parameter: "code", pruefwerte: [messPruefwert()] };
    return a + JSON.stringify(k).replace(/</g, "\\u003c") + c;
  });
}

// Läuft in der Seite: Der Hinweis zur Umgebung oben auf dem ersten Bildschirm (null, wenn keiner da ist).
function messeUmgebungskasten() {
  const el = document.querySelector("[data-anm-umgebungshinweis]");
  if (!el || el.hidden) return null;
  const norm = (t) => String(t).replace(/\s+/g, " ").trim();
  return { art: el.getAttribute("data-art"), absaetze: Array.from(el.querySelectorAll("p")).map((p) => norm(p.textContent)).filter(Boolean) };
}

// Der Hinweis zur Umgebung als Messwert: Wörter, Sätze, längster Satz (Regel 7), Zahl der Absätze
function wertKasten(roh) {
  if (!roh) return null;
  const satzListe = [];
  for (const a of roh.absaetze) for (const t of saetze(a)) satzListe.push({ text: t, woerter: zaehle(t) });
  const laengster = satzListe.reduce((m, x) => (x.woerter > m.woerter ? x : m), { woerter: 0, text: "" });
  return {
    art: roh.art,
    absaetze: roh.absaetze,
    woerter: roh.absaetze.reduce((n, a) => n + zaehle(a), 0),
    saetze: satzListe.length,
    laengsterSatz: laengster.woerter,
    verstoesse: satzListe.filter((x) => x.woerter > 12).map((x) => ({ regel: 7, text: x.text, wert: x.woerter + " Wörter im Satz (höchstens 12)" })),
  };
}

async function laufeZugang(browser, server, z) {
  const ergebnis = { id: z.id, titel: z.titel, quelle: "Zugangsfall", pflicht: false, zugang: true, seiten: [], kasten: null, fehler: null, konsole: [], textFehlt: [] };
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: BILDSCHIRM.breite, height: BILDSCHIRM.hoehe, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await page.evaluateOnNewDocument(UHR);
    if (z.art === "inapp") await page.setUserAgent(IN_APP_UA);
    page.on("console", (m) => {
      const t = m.text();
      if (m.type() === "error") ergebnis.konsole.push(t);
      if (m.type() === "warning" && /Text fehlt/.test(t)) ergebnis.textFehlt.push(t);
    });
    page.on("pageerror", (e) => ergebnis.konsole.push("pageerror: " + e.message));
    // ziel: die Seite oder, beim Rahmen, der Rahmen, in dem der Assistent läuft
    let ziel = page;
    if (z.art === "rahmen") {
      await page.goto(server.basis + "/rahmen-messung.html", { waitUntil: "networkidle0" });
      ziel = page.frames().find((fr) => fr !== page.mainFrame());
      if (!ziel) throw new Error("Der Rahmen ist nicht da");
    } else {
      await page.goto(server.basis + "/anmeldung/" + (z.art === "app" ? "?app=1" : ""), { waitUntil: "networkidle0" });
    }
    await ziel.waitForSelector("#anmeldung[data-bereit]", { timeout: 15000 });
    if (z.art === "start") {
      const feld = await ziel.$('#anmeldung input[data-pfad="zugang.code"]');
      if (!feld) throw new Error("Keine Code-Seite: Der Messserver hat den Prüfwert nicht gesetzt");
      await feld.type(MESS_CODE);
      await (await ziel.$('#anmeldung [data-aktion="weiter"]')).click();
      await ziel.waitForFunction(() => document.getElementById("anmeldung").dataset.schritt === "start", { timeout: 8000 });
    }
    await warte(120);
    const roh = await ziel.evaluate(messeImBrowser);
    const erwartet = { code: "code", start: "start", app: "uebergabe", inapp: "code", rahmen: "code" }[z.art];
    if (roh.schritt !== erwartet) throw new Error("Erwartet wurde der Bildschirm „" + erwartet + "“, gezeigt wird „" + roh.schritt + "“");
    ergebnis.seiten.push(wertAus(roh));
    ergebnis.kasten = wertKasten(await ziel.evaluate(messeUmgebungskasten));
    if ((z.art === "inapp" || z.art === "rahmen") && !ergebnis.kasten) throw new Error("Kein Hinweis zur Umgebung auf dem ersten Bildschirm");
    if (z.art !== "inapp" && z.art !== "rahmen" && ergebnis.kasten) throw new Error("Unerwartet: ein Hinweis zur Umgebung (" + ergebnis.kasten.art + ")");
    if (FOTOS.length) {
      const name = NAME + "-" + z.id + "-390.png";
      await page.screenshot({ path: path.join(AUSGABE, name), fullPage: true });
      ergebnis.seiten[0].foto = name;
    }
  } catch (fehler) {
    ergebnis.fehler = String(fehler && fehler.message ? fehler.message : fehler);
  } finally {
    await page.close();
  }
  return ergebnis;
}

// ---------- PDF ----------

// Klasse einer Seite der Datei. Begleittexte = Teil A, Laufzettel, Trennblatt (alles, was weder Vordruck noch Datenschutz-Text ist).
function klasseDerSeite(s) {
  if (!s) return "unbekannt";
  if (s.art === "teil-a") return "teilA";
  if (s.art === "laufzettel") return "laufzettel";
  if (s.art === "trennblatt") return "trennblatt";
  if (s.art === "eigen" && s.schluessel === "datenschutz") return "datenschutz";
  if (s.art === "eigen") return "vereinsblatt";
  if (s.art === "vorlage") return "vordruck";
  if (s.art === "foto") return "foto";
  return "nachweise";
}

const KLASSEN_NAMEN = {
  teilA: "Teil A (Anleitung für die Familie)",
  laufzettel: "Laufzettel für den Verein",
  trennblatt: "Trennblatt Teil C",
  datenschutz: "Information zum Datenschutz (unverändert)",
  vereinsblatt: "Blätter des Vereins mit Einverständnissen (Einwilligungen, unverändert)",
  vordruck: "Vordrucke (unverändert)",
  foto: "Spielerfoto",
  nachweise: "Kopien der Nachweise",
  unbekannt: "unbekannt",
};

function messePdf(fall, pdfPfad) {
  const roh = fall.pdfRoh;
  fs.mkdirSync(path.dirname(pdfPfad), { recursive: true });
  fs.writeFileSync(pdfPfad, Buffer.from(roh.b64, "base64"));
  const r = spawnSync("pdftotext", ["-enc", "UTF-8", "-layout", pdfPfad, "-"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error("pdftotext: " + (r.stderr || r.status));
  const seiten = r.stdout.split("\f");
  if (seiten.length && !seiten[seiten.length - 1].trim()) seiten.pop();
  const arten = (roh.bericht && roh.bericht.seiten) || [];
  const liste = seiten.map((text, i) => {
    // Fußzeilen („Seite 3 von 12“, Entwurfsvermerk) zählen nicht
    const zeilen = text.split("\n").filter((z) => !/^\s*(Seite \d+ von \d+)?\s*$/.test(z) && !/^\s*Entwurf – vom Vorstand zu prüfen\s*(Seite \d+ von \d+)?\s*$/.test(z) && !/^\s*Entwurf – vom Vorstand zu prüfen/.test(z));
    const bereinigt = zeilen.map((z) => z.replace(/\s*Seite \d+ von \d+\s*$/, "")).join("\n");
    const art = arten[i];
    return { nr: i + 1, art: art ? art.art : null, schluessel: art ? art.schluessel : null, titel: art ? art.titel : "", klasse: klasseDerSeite(art), woerter: zaehle(bereinigt), text: bereinigt };
  });
  const summe = (klasse) => {
    const l = liste.filter((x) => x.klasse === klasse);
    return { seiten: l.length, woerter: l.reduce((n, x) => n + x.woerter, 0) };
  };
  const klassen = {};
  for (const k of Object.keys(KLASSEN_NAMEN)) klassen[k] = summe(k);
  const begleit = { seiten: klassen.teilA.seiten + klassen.laufzettel.seiten + klassen.trennblatt.seiten, woerter: klassen.teilA.woerter + klassen.laufzettel.woerter + klassen.trennblatt.woerter };
  return { datei: path.relative(AUSGABE, pdfPfad), seiten: seiten.length, teile: roh.teile, klassen, begleit, seitenListe: liste.map((x) => ({ nr: x.nr, art: x.art, schluessel: x.schluessel, titel: x.titel, klasse: x.klasse, woerter: x.woerter, text: ["teilA", "laufzettel", "trennblatt"].includes(x.klasse) ? x.text : undefined })) };
}

// ---------- Ausgabe ----------

const f = (n) => String(n);
// „R7“ für eine Regel der Stilregeln, „S1“ für die Regel zum Startschritt
const regelKurz = (v) => (typeof v.regel === "number" ? "R" : "") + v.regel;
const tabelle = (kopf, zeilen) => ["| " + kopf.join(" | ") + " |", "| " + kopf.map(() => "---").join(" | ") + " |", ...zeilen.map((z) => "| " + z.join(" | ") + " |")].join("\n");

function fallSumme(fall) {
  const s = { bildschirme: fall.seiten.length, gesamt: 0, titel: 0, erklaer: 0, kaesten: 0, kaestenAnzahl: 0, antworten: 0, zusatz: 0, feldHinweis: 0, felder: 0, zwischentitel: 0, knoepfe: 0, aufklapper: 0, pruef: 0, sonst: 0, zugeklappt: 0, saetze: 0, absaetze: 0, laengsterSatz: 0, verstoesse: 0, regeln: {} };
  for (const x of fall.seiten) {
    s.gesamt += x.gesamt;
    s.titel += x.titelWoerter;
    s.erklaer += x.erklaerWoerter;
    s.kaesten += x.kaestenWoerter;
    s.kaestenAnzahl += x.kaestenAnzahl;
    s.antworten += x.antwortWoerter;
    s.zusatz += x.zusatzWoerter;
    s.feldHinweis += x.feldHinweisWoerter;
    s.felder += x.felderWoerter;
    s.zwischentitel += x.zwischentitelWoerter;
    s.knoepfe += x.knoepfeWoerter;
    s.aufklapper += x.aufklapperWoerter;
    s.pruef += x.pruefWoerter;
    s.sonst += x.sonstWoerter;
    s.zugeklappt += x.zugeklapptWoerter;
    s.saetze += x.saetze;
    s.absaetze += x.absaetze;
    s.laengsterSatz = Math.max(s.laengsterSatz, x.laengsterSatz);
    for (const v of x.verstoesse) {
      s.verstoesse++;
      s.regeln[v.regel] = (s.regeln[v.regel] || 0) + 1;
    }
  }
  return s;
}

function baueMarkdown(daten) {
  const faelle = daten.faelle;
  const pflicht = faelle.filter((x) => x.pflicht);
  const z = [];
  z.push("# Textmenge im Anmelde-Assistenten – " + daten.name);
  z.push("");
  z.push("Erzeugt von `tools/anmeldung-test/textmenge.mjs` (Paket P3). Basis: `" + daten.basis + "`" + (daten.vorschlag ? ", mit Überlagerung `" + daten.vorschlag + "`" : "") + ". Bildschirm " + daten.bildschirm + ", Deutsch, Datum " + daten.heute + ".");
  z.push("");
  z.push("**Was gezählt wird:** sichtbarer Text im Formular des Assistenten (Titel, Erklärtext, Hinweiskästen, Antworten und Zusatzzeilen, Feldbeschriftungen, Knöpfe), Wörter wie `sprache-check.mjs`. Nicht gezählt: Rahmen (Kopf, Abschnittsleiste, Fuß: " + daten.rahmen.woerter + " Wörter auf jedem Bildschirm), Weiter-Knopf, Text nur für Screenreader. Der Inhalt zugeklappter Bereiche steht in der Spalte „zu“.");
  z.push("");
  z.push("## 1. Summen je Fall (sichtbare Wörter)");
  z.push("");
  z.push(tabelle(["Fall", "Bildschirme", "Wörter", "Titel", "Erklärtext", "Kästen (Anz.)", "Antworten", "Zusatz", "Felder, Hinweise", "Knöpfe", "Prüfzeilen", "zu", "Sätze", "Absätze", "längster Satz", "Verstöße"],
    faelle.map((x) => {
      const s = x.summe;
      return [(x.pflicht ? "" : "(Ergänzung) ") + x.titel + (x.fehler ? " – FEHLER: " + x.fehler : ""), f(s.bildschirme), "**" + s.gesamt + "**", f(s.titel), f(s.erklaer), s.kaesten + " (" + s.kaestenAnzahl + ")", f(s.antworten), f(s.zusatz), f(s.felder + s.feldHinweis + s.zwischentitel), f(s.knoepfe + s.aufklapper), f(s.pruef), f(s.zugeklappt), f(s.saetze), f(s.absaetze), f(s.laengsterSatz), f(s.verstoesse)];
    })));
  const sp = pflicht.reduce((n, x) => n + x.summe.gesamt, 0);
  z.push("");
  z.push("Summe der Pflichtfälle: **" + sp + " Wörter** in " + pflicht.reduce((n, x) => n + x.summe.bildschirme, 0) + " Bildschirmen.");
  z.push("");
  // 10 schwerste Bildschirme
  z.push("## 2. Die 10 schwersten Bildschirme (höchste Wörterzahl in einem Pflichtfall)");
  z.push("");
  const einzigartig = new Map();
  for (const x of pflicht) for (const s of x.seiten) if (!einzigartig.has(s.schluessel) || einzigartig.get(s.schluessel).gesamt < s.gesamt) einzigartig.set(s.schluessel, { ...s, fall: x.id });
  const schwer = Array.from(einzigartig.values()).sort((a, b) => b.gesamt - a.gesamt).slice(0, 10);
  z.push(tabelle(["Bildschirm", "Fall", "Wörter", "Erklärtext (vor/nach)", "Kästen", "Antworten + Zusatz", "zu", "längster Satz", "Verstöße"],
    schwer.map((s) => [s.schluessel + " – " + s.titel, s.fall, "**" + s.gesamt + "**", s.erklaerWoerter + " (" + s.vorWoerter + "/" + s.nachWoerter + ")", s.kaestenWoerter + " (" + s.kaestenAnzahl + ")", s.antwortWoerter + " + " + s.zusatzWoerter, f(s.zugeklapptWoerter), f(s.laengsterSatz), f(s.verstoesse.length)])));
  z.push("");
  // Regelverstöße
  z.push("## 3. Verstöße gegen die Stilregeln (maschinell prüfbare Regeln) je Fall");
  z.push("");
  const regelNamen = { 1: "R1 Titel höchstens 8 Wörter", 2: "R2 vor den Eingaben höchstens 30 Wörter in 2 Sätzen", 3: "R3 höchstens 1 sichtbarer Kasten", 4: "R4 Antwort höchstens 5, Zusatzzeile höchstens 8 Wörter", 7: "R7 Satz höchstens 12 Wörter", 8: "R8 Amtsdeutsch", 10: "R10 Abkürzungen", 11: "R11 Gendern", S1: "S1 Startschritt höchstens " + START_MAX_WOERTER + " Wörter" };
  z.push(tabelle(["Regel", ...faelle.map((x) => x.id)], Object.keys(regelNamen).map((r) => [regelNamen[r], ...faelle.map((x) => f(x.summe.regeln[r] || 0))])));
  z.push("");
  z.push("Zahl der Sätze über 8 Wörter (Regel 7: „besser 8“) je Fall: " + faelle.map((x) => x.id + " " + x.seiten.reduce((n, s) => n + s.satzUeber8, 0)).join(", ") + ".");
  z.push("");
  // Alle Bildschirme je Fall
  z.push("## 4. Alle Bildschirme je Fall");
  for (const x of faelle) {
    z.push("");
    z.push("### " + (x.pflicht ? "" : "(Ergänzung) ") + x.titel + " – " + x.quelle);
    if (x.fehler) z.push("\n**FEHLER:** " + x.fehler);
    z.push("");
    z.push(tabelle(["Bildschirm", "Titel (Wörter)", "Wörter", "Erklärtext vor/nach", "Kästen (Wörter)", "Antw. (max)", "Zusatz (max)", "Felder, Hinweise", "Sätze", "Absätze", "längster Satz", "zu", "Verstöße"],
      x.seiten.map((s) => [s.schluessel, s.titelWoerter + "", "**" + s.gesamt + "**", s.vorWoerter + "/" + s.nachWoerter, s.kaestenAnzahl + " (" + s.kaestenWoerter + ")", s.antwortWoerter + " (" + s.antwortMax + ")", s.zusatzWoerter + " (" + s.zusatzMax + ")", f(s.felderWoerter + s.feldHinweisWoerter + s.zwischentitelWoerter + s.knoepfeWoerter + s.aufklapperWoerter), f(s.saetze), f(s.absaetze), f(s.laengsterSatz), f(s.zugeklapptWoerter), s.verstoesse.map(regelKurz).join(" ")])));
  }
  // Prüfseite und Fertig-Seite: Abschnitte
  z.push("");
  z.push("## 5. Prüfseite und Fertig-Seite nach Abschnitten (Wörter, Fall kind-neu)");
  const kn = faelle.find((x) => x.id === "kind-neu");
  if (kn) for (const sk of ["pruefen/haupt", "fertig/haupt"]) {
    const s = kn.seiten.find((x) => x.schluessel === sk);
    if (!s) continue;
    z.push("");
    z.push("**" + sk + "** – " + s.gesamt + " Wörter sichtbar, " + s.zugeklapptWoerter + " zugeklappt");
    z.push("");
    z.push(tabelle(["Abschnitt", "Wörter"], s.abschnitte.map((a) => [a.titel, f(a.woerter)])));
  }
  // PDF
  z.push("");
  z.push("## 6. Begleittexte in der PDF-Datei");
  z.push("");
  z.push("Begleittexte sind Teil A (Anleitung), Laufzettel und Trennblatt Teil C. Nicht gezählt als Begleittext: Vordrucke, Datenschutz-Information, die Blätter des Vereins mit Einverständnissen und Kopien der Nachweise. Fußzeilen („Seite x von y“, Entwurfsvermerk) zählen nicht.");
  z.push("");
  const mitPdf = faelle.filter((x) => x.pdf);
  if (mitPdf.length) {
    z.push(tabelle(["Fall", "Seiten gesamt", "Teil A (S./Wörter)", "Laufzettel (S./Wörter)", "Trennblatt C (S./Wörter)", "**Begleittexte (S./Wörter)**", "Datenschutz (S.)", "Vereinsblätter (S.)", "Vordrucke (S.)", "Nachweise, Foto (S.)"],
      mitPdf.map((x) => {
        const k = x.pdf.klassen;
        return [(x.pflicht ? "" : "(Ergänzung) ") + x.titel, f(x.pdf.seiten), k.teilA.seiten + " / " + k.teilA.woerter, k.laufzettel.seiten + " / " + k.laufzettel.woerter, k.trennblatt.seiten + " / " + k.trennblatt.woerter, "**" + x.pdf.begleit.seiten + " / " + x.pdf.begleit.woerter + "**", f(k.datenschutz.seiten), f(k.vereinsblatt.seiten), f(k.vordruck.seiten), f(k.nachweise.seiten + k.foto.seiten)];
      })));
    const pf = mitPdf.filter((x) => x.pflicht);
    z.push("");
    z.push("Summe der Pflichtfälle: " + pf.reduce((n, x) => n + x.pdf.begleit.seiten, 0) + " Seiten, " + pf.reduce((n, x) => n + x.pdf.begleit.woerter, 0) + " Wörter Begleittext.");
  } else z.push("(keine PDF-Messung)");
  // Zugang und Umgebung (Paket P1)
  if ((daten.zugang || []).length) {
    z.push("");
    z.push("## 6a. Zugang und Umgebung (Paket P1)");
    z.push("");
    z.push("Die Seiten vor dem Assistenten und der Startschritt (gemessen an einem zweiten Messserver, dessen Konfiguration einen Prüfwert für einen Messcode trägt; siehe Kopf des Werkzeugs). Für den Startschritt gilt die Regel S1: höchstens " + START_MAX_WOERTER + " sichtbare Wörter.");
    z.push("");
    z.push(tabelle(["Fall", "Bildschirm", "Titel (Wörter)", "Wörter", "Erklärtext vor/nach", "Felder, Hinweise, Zwischentitel, Knöpfe", "Sätze", "längster Satz", "Verstöße"],
      daten.zugang.map((x) => {
        const sk = x.seiten[0];
        if (!sk) return [x.titel + " – FEHLER: " + x.fehler, "", "", "", "", "", "", "", ""];
        return [x.titel + (x.fehler ? " – FEHLER: " + x.fehler : ""), sk.schluessel, sk.titelWoerter + "", "**" + sk.gesamt + "**", sk.vorWoerter + "/" + sk.nachWoerter, f(sk.felderWoerter + sk.feldHinweisWoerter + sk.zwischentitelWoerter + sk.knoepfeWoerter), f(sk.saetze), f(sk.laengsterSatz), sk.verstoesse.map(regelKurz).join(" ") || "–"];
      })));
    for (const x of daten.zugang) {
      if (x.kasten) {
        z.push("");
        z.push("**Hinweis oben (Art „" + x.kasten.art + "“, " + x.id + "):** " + x.kasten.woerter + " Wörter, " + x.kasten.saetze + " Sätze, längster Satz " + x.kasten.laengsterSatz + " Wörter" + (x.kasten.verstoesse.length ? ", Verstöße: " + x.kasten.verstoesse.map(regelKurz).join(" ") : "") + ". Text: " + x.kasten.absaetze.map((a) => "„" + a + "“").join(" "));
      }
    }
    const start = daten.zugang.find((x) => x.id === "zugang-start");
    const sSeite = start && start.seiten[0];
    if (sSeite) {
      z.push("");
      z.push("Startschritt – alle sichtbaren Blöcke (" + sSeite.gesamt + " Wörter): " + sSeite.bloecke.filter((b) => b.kat !== "weiter").map((b) => b.kat + " „" + b.text + "“ (" + b.woerter + ")").join("; ") + ".");
    }
  }
  // Abdeckung
  z.push("");
  z.push("## 7. Abdeckung");
  z.push("");
  const besucht = new Set();
  for (const x of faelle) for (const s of x.seiten) besucht.add(s.schluessel);
  const zugang = daten.zugang || [];
  for (const x of zugang) for (const s of x.seiten) besucht.add(s.schluessel);
  const bekannt = ALLE_BILDSCHIRME.concat(zugang.length ? ZUGANG_BILDSCHIRME : []);
  const fehlend = bekannt.filter((k) => !besucht.has(k));
  const unbekannt = Array.from(besucht).filter((k) => !bekannt.includes(k));
  z.push(besucht.size + " verschiedene Bildschirme besucht von " + bekannt.length + " bekannten." + (fehlend.length ? " Nicht besucht: " + fehlend.join(", ") + "." : " Alle bekannten Bildschirme kamen mindestens einmal vor.") + (unbekannt.length ? " Neu (nicht in der Liste): " + unbekannt.join(", ") + "." : ""));
  const fotos = faelle.concat(zugang).flatMap((x) => x.seiten.filter((s) => s.foto).map((s) => s.foto + " (" + x.id + ", " + s.schluessel + ")"));
  if (fotos.length) {
    z.push("");
    z.push("Bildschirmfotos (390 Pixel breit, ganze Seite): " + fotos.join("; ") + ".");
  }
  const textFehlt = faelle.filter((x) => x.textFehlt.length);
  if (textFehlt.length) {
    z.push("");
    z.push("**Warnung „Text fehlt“** in: " + textFehlt.map((x) => x.id + " (" + x.textFehlt.slice(0, 3).join("; ") + ")").join(", "));
  }
  z.push("");
  return z.join("\n");
}

// ---------- Vergleich zweier Messungen ----------

const pfeil = (a, b) => a + " → " + b;
const vorzeichen = (n) => (n > 0 ? "+" + n : String(n));
const prozent = (a, b) => (a ? (((b - a) / a) * 100 >= 0 ? "+" : "") + Math.round(((b - a) / a) * 100) + " %" : "–");

function vergleiche(spec) {
  const [namV, namN] = String(spec).split(",").map((x) => x.trim());
  if (!namV || !namN) throw new Error("--vergleich braucht zwei Namen: --vergleich vorher,nachher");
  const lade = (n) => JSON.parse(fs.readFileSync(path.join(AUSGABE, "textmenge-" + n + ".json"), "utf8"));
  const v = lade(namV);
  const n = lade(namN);
  const faelleN = n.faelle;
  const paare = faelleN.map((fn) => ({ id: fn.id, n: fn, v: v.faelle.find((x) => x.id === fn.id) })).filter((x) => x.v);
  const pflicht = paare.filter((x) => x.n.pflicht);
  const satzUeber12 = (fall) => fall.seiten.reduce((a, s) => a + s.satzUeber12, 0);
  const startWoerter = (fall) => {
    const sk = fall.seiten.find((s) => s.schluessel === "start/haupt");
    return sk ? sk.gesamt : 0;
  };
  const z = [];
  z.push("# Textmenge im Anmelde-Assistenten – Vergleich „" + namV + "“ und „" + namN + "“");
  z.push("");
  z.push("Erzeugt von `tools/anmeldung-test/textmenge.mjs --vergleich " + namV + "," + namN + "` (Paket P3). Vorher: `" + v.basis + "` (" + v.erzeugt.slice(0, 16).replace("T", " ") + "), nachher: `" + n.basis + "` (" + n.erzeugt.slice(0, 16).replace("T", " ") + "). Gleiche Zählweise (390 × 844, Deutsch, Datum " + n.heute + "). „sichtbar“ = ohne Rahmen, ohne Weiter-Knopf, ohne zugeklappte Bereiche.");
  z.push("");
  z.push("**Zwischen den beiden Messungen** liegen zwei Änderungen: der neue Startschritt aus Paket P1 (Spalte „davon Startschritt“) und die Kürzungen aus Paket P3 Teil b. Die Spalte „ohne Startschritt“ zeigt die Wirkung von Teil b allein, soweit sie die Bildschirme betrifft.");
  z.push("");
  // 1. Summen je Fall
  z.push("## 1. Summen je Fall (sichtbare Wörter im Assistenten)");
  z.push("");
  z.push(tabelle(["Fall", "Bildschirme", namV, namN, "Änderung", "%", "davon Startschritt", "ohne Startschritt", "zugeklappt", "Sätze über 12 Wörter", "Verstöße"],
    paare.map((x) => {
      const a = x.v.summe;
      const b = x.n.summe;
      const dStart = startWoerter(x.n) - startWoerter(x.v);
      const d = b.gesamt - a.gesamt;
      return [(x.n.pflicht ? "" : "(Ergänzung) ") + x.n.titel, pfeil(a.bildschirme, b.bildschirme), f(a.gesamt), "**" + b.gesamt + "**", vorzeichen(d), prozent(a.gesamt, b.gesamt), vorzeichen(dStart), vorzeichen(d - dStart) + " (" + prozent(a.gesamt - startWoerter(x.v), b.gesamt - startWoerter(x.n)) + ")", pfeil(a.zugeklappt, b.zugeklappt), pfeil(satzUeber12(x.v), satzUeber12(x.n)), pfeil(a.verstoesse, b.verstoesse)];
    })));
  const sv = pflicht.reduce((a, x) => a + x.v.summe.gesamt, 0);
  const sn = pflicht.reduce((a, x) => a + x.n.summe.gesamt, 0);
  const startV = pflicht.reduce((a, x) => a + startWoerter(x.v), 0);
  const startN = pflicht.reduce((a, x) => a + startWoerter(x.n), 0);
  z.push("");
  z.push("Summe der Pflichtfälle: **" + sv + " → " + sn + " Wörter** (" + vorzeichen(sn - sv) + ", " + prozent(sv, sn) + "). Davon Startschritt (" + pflicht.length + "-mal gezählt, einmal je Fall): " + startV + " → " + startN + "; ohne Startschritt: " + (sv - startV) + " → " + (sn - startN) + " (" + vorzeichen(sn - startN - (sv - startV)) + ", " + prozent(sv - startV, sn - startN) + ").");
  const zv = pflicht.reduce((a, x) => a + x.v.summe.zugeklappt, 0);
  const zn = pflicht.reduce((a, x) => a + x.n.summe.zugeklappt, 0);
  z.push("");
  z.push("Zugeklappter Text der Pflichtfälle (steht im Assistenten, aber nicht auf dem ersten Blick): " + zv + " → " + zn + " Wörter. Verstöße gegen die maschinell prüfbaren Stilregeln: " + pflicht.reduce((a, x) => a + x.v.summe.verstoesse, 0) + " → " + pflicht.reduce((a, x) => a + x.n.summe.verstoesse, 0) + ".");
  z.push("");
  // 2. Änderung je Bildschirm
  z.push("## 2. Änderung je Bildschirm");
  for (const x of pflicht) {
    const zeilen = [];
    const schluessel = new Set([...x.v.seiten.map((s) => s.schluessel), ...x.n.seiten.map((s) => s.schluessel)]);
    for (const k of schluessel) {
      const a = x.v.seiten.find((s) => s.schluessel === k);
      const b = x.n.seiten.find((s) => s.schluessel === k);
      const wa = a ? a.gesamt : 0;
      const wb = b ? b.gesamt : 0;
      const za = a ? a.zugeklapptWoerter : 0;
      const zb = b ? b.zugeklapptWoerter : 0;
      if (a && b && wa === wb && za === zb && a.verstoesse.length === b.verstoesse.length) continue;
      zeilen.push({ k, titel: (b || a).titel, wa, wb, za, zb, va: a ? a.verstoesse.length : "–", vb: b ? b.verstoesse.length : "–", nur: !a ? "nur " + namN : !b ? "nur " + namV : "" });
    }
    zeilen.sort((p, q) => p.wb - p.wa - (q.wb - q.wa));
    z.push("");
    z.push("### " + x.n.titel + " (" + x.id + "): " + zeilen.length + " Bildschirme geändert von " + schluessel.size);
    z.push("");
    if (!zeilen.length) {
      z.push("Keine Änderung.");
      continue;
    }
    z.push(tabelle(["Bildschirm", "Titel", namV, namN, "Änderung", "zugeklappt", "Verstöße", ""], zeilen.map((r) => [r.k, r.titel, f(r.wa), f(r.wb), vorzeichen(r.wb - r.wa), pfeil(r.za, r.zb), pfeil(r.va, r.vb), r.nur])));
  }
  z.push("");
  // 3. Verstöße je Regel
  z.push("## 3. Verstöße gegen die Stilregeln je Regel und Fall (" + namV + " → " + namN + ")");
  z.push("");
  const regeln = new Set();
  for (const x of paare) for (const r of [...Object.keys(x.v.summe.regeln), ...Object.keys(x.n.summe.regeln)]) regeln.add(r);
  const regelNamen = { 1: "R1 Titel höchstens 8 Wörter", 2: "R2 vor den Eingaben höchstens 30 Wörter in 2 Sätzen", 3: "R3 höchstens 1 sichtbarer Kasten", 4: "R4 Antwort höchstens 5, Zusatzzeile höchstens 8 Wörter", 7: "R7 Satz höchstens 12 Wörter", 8: "R8 Amtsdeutsch", 10: "R10 Abkürzungen", 11: "R11 Gendern", S1: "S1 Startschritt höchstens " + START_MAX_WOERTER + " Wörter" };
  z.push(tabelle(["Regel", ...paare.map((x) => x.id)], Array.from(regeln).sort((a, b) => String(a).localeCompare(String(b), "de", { numeric: true })).map((r) => [regelNamen[r] || r, ...paare.map((x) => pfeil(x.v.summe.regeln[r] || 0, x.n.summe.regeln[r] || 0))])));
  z.push("");
  z.push("Sätze über 8 Wörter (Regel 7: „besser 8“): " + paare.map((x) => x.id + " " + pfeil(x.v.seiten.reduce((a, s) => a + s.satzUeber8, 0), x.n.seiten.reduce((a, s) => a + s.satzUeber8, 0))).join(", ") + ".");
  z.push("");
  // 4. Die schwersten Bildschirme
  z.push("## 4. Die 10 schwersten Bildschirme (höchste Wörterzahl in einem Pflichtfall)");
  z.push("");
  const schwer = (liste) => {
    const e = new Map();
    for (const x of liste) for (const s of x.seiten) if (!e.has(s.schluessel) || e.get(s.schluessel).gesamt < s.gesamt) e.set(s.schluessel, { ...s, fall: x.id });
    return Array.from(e.values()).sort((a, b) => b.gesamt - a.gesamt).slice(0, 10);
  };
  const sa = schwer(pflicht.map((x) => x.v));
  const sb = schwer(pflicht.map((x) => x.n));
  z.push(tabelle(["Rang", namV, "Wörter", namN, "Wörter"], Array.from({ length: 10 }, (_, i) => [String(i + 1), sa[i] ? sa[i].schluessel + " – " + sa[i].titel : "", sa[i] ? f(sa[i].gesamt) : "", sb[i] ? sb[i].schluessel + " – " + sb[i].titel : "", sb[i] ? f(sb[i].gesamt) : ""])));
  z.push("");
  // 5. Begleittexte der PDF-Datei
  z.push("## 5. Begleittexte in der PDF-Datei (Teil A, Laufzettel, Trennblatt Teil C)");
  z.push("");
  const mitPdf = paare.filter((x) => x.v.pdf && x.n.pdf);
  if (mitPdf.length) {
    z.push(tabelle(["Fall", "Begleittexte Seiten", "Begleittexte Wörter", "Änderung", "Teil A (Wörter)", "Laufzettel (Wörter)", "Trennblatt C (Wörter)", "Seiten der ganzen Datei"],
      mitPdf.map((x) => {
        const a = x.v.pdf;
        const b = x.n.pdf;
        return [(x.n.pflicht ? "" : "(Ergänzung) ") + x.n.titel, pfeil(a.begleit.seiten, b.begleit.seiten), pfeil(a.begleit.woerter, b.begleit.woerter), vorzeichen(b.begleit.woerter - a.begleit.woerter) + " (" + prozent(a.begleit.woerter, b.begleit.woerter) + ")", pfeil(a.klassen.teilA.woerter, b.klassen.teilA.woerter), pfeil(a.klassen.laufzettel.woerter, b.klassen.laufzettel.woerter), pfeil(a.klassen.trennblatt.woerter, b.klassen.trennblatt.woerter), pfeil(a.seiten, b.seiten)];
      })));
    const pp = mitPdf.filter((x) => x.n.pflicht);
    z.push("");
    z.push("Summe der Pflichtfälle: " + pfeil(pp.reduce((a, x) => a + x.v.pdf.begleit.seiten, 0), pp.reduce((a, x) => a + x.n.pdf.begleit.seiten, 0)) + " Seiten, " + pfeil(pp.reduce((a, x) => a + x.v.pdf.begleit.woerter, 0), pp.reduce((a, x) => a + x.n.pdf.begleit.woerter, 0)) + " Wörter Begleittext.");
  } else z.push("(keine PDF-Messung in beiden Dateien)");
  z.push("");
  // 6. Übrig gebliebene Verstöße
  z.push("## 6. Verstöße, die in „" + namN + "“ geblieben sind (Pflichtfälle)");
  z.push("");
  const rest = new Map();
  for (const x of pflicht) for (const s of x.n.seiten) for (const vv of s.verstoesse) {
    const key = s.schluessel + "|" + vv.regel + "|" + (vv.text || "");
    const eintrag = rest.get(key) || { k: s.schluessel, titel: s.titel, regel: vv, faelle: [] };
    eintrag.faelle.push(x.id);
    rest.set(key, eintrag);
  }
  const alt = new Set();
  for (const x of pflicht) for (const s of x.v.seiten) for (const vv of s.verstoesse) alt.add(s.schluessel + "|" + vv.regel + "|" + (vv.text || ""));
  if (rest.size) {
    z.push(tabelle(["Bildschirm", "Regel", "Wert", "Text", "Fälle", "auch " + namV], Array.from(rest.entries()).map(([key, r]) => [r.k, regelKurz(r.regel), r.regel.wert, r.regel.text ? "„" + String(r.regel.text).slice(0, 110) + "“" : "", r.faelle.join(", "), alt.has(key) ? "ja" : "neu"])));
  } else z.push("Keine.");
  // 7. Zugang
  if ((n.zugang || []).length) {
    z.push("");
    z.push("## 7. Seiten vor dem Assistenten (nur in „" + namN + "“; Paket P1)");
    z.push("");
    z.push(tabelle(["Fall", "Bildschirm", "Wörter", "längster Satz", "Verstöße", "Hinweis oben (Wörter)"], n.zugang.map((x) => {
      const sk = x.seiten[0];
      return [x.titel + (x.fehler ? " – FEHLER: " + x.fehler : ""), sk ? sk.schluessel : "", sk ? "**" + sk.gesamt + "**" : "", sk ? f(sk.laengsterSatz) : "", sk ? sk.verstoesse.map(regelKurz).join(" ") || "–" : "", x.kasten ? x.kasten.woerter + " (" + (x.kasten.verstoesse.length ? "Verstoß R7" : "ohne Verstoß") + ")" : "–"];
    })));
  }
  z.push("");
  const ziel = path.join(AUSGABE, "textmenge-vergleich-" + namV + "-" + namN + ".md");
  fs.writeFileSync(ziel, z.join("\n"));
  console.log("Geschrieben: " + path.relative(process.cwd(), ziel));
}

// ---------- Hauptprogramm ----------

async function main() {
  if (VERGLEICH) return vergleiche(VERGLEICH);
  if (!fs.existsSync(path.join(BASIS, "anmeldung", "index.html"))) {
    console.error("Basisordner ohne anmeldung/index.html: " + BASIS);
    process.exit(2);
  }
  if (BASIS === path.join(ROOT, "docs") && /^(vorher)$/.test(NAME)) console.error("Hinweis: Name „vorher“ mit docs/ als Basis – gemeint ist wohl --basis tools/cache/orchestrierung-anmeldung/p3-basis-docs");
  fs.mkdirSync(AUSGABE, { recursive: true });
  let faelle = [...PFLICHT.map((x) => ({ ...x, pflicht: true })), ...(NUR_PFLICHT ? [] : ERGAENZUNG)];
  if (FAELLE_AUSWAHL.length) faelle = faelle.filter((x) => FAELLE_AUSWAHL.includes(x.id));
  // Zugangsfälle (Paket P1): nur, wenn der Basisordner die Seiten vor dem Assistenten hat und --ohne-zugang fehlt; mit --faelle nur die genannten
  const zugangsFaelle = OHNE_ZUGANG || !fs.existsSync(path.join(BASIS, JS_ORDNER, "seiten-zugang.js")) ? [] : ZUGANG_FAELLE.filter((x) => !FAELLE_AUSWAHL.length || FAELLE_AUSWAHL.includes(x.id));
  if (!faelle.length && !zugangsFaelle.length) throw new Error("Kein Fall gewählt");

  const vorschlag = VORSCHLAG_DATEI ? JSON.parse(fs.readFileSync(VORSCHLAG_DATEI, "utf8")) : null;
  MEHR = await baueMehr(BASIS, vorschlag);
  const eingriffe = await baueEingriffe(BASIS, vorschlag, faelle);
  const { server, port } = await starteServer(BASIS, eingriffe);
  const basisUrl = "http://127.0.0.1:" + port;
  console.log("Messserver " + basisUrl + " für " + path.relative(process.cwd(), BASIS) + (vorschlag ? " mit Vorschlag " + path.relative(process.cwd(), VORSCHLAG_DATEI) : ""));

  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-first-run"] });
  const ergebnisse = [];
  const zugangErgebnisse = [];
  const geseheneFotos = new Set();
  try {
    for (const fall of faelle) {
      const t0 = Date.now();
      const r = await laufeFall(browser, { basis: basisUrl }, fall, geseheneFotos);
      r.pflicht = !!fall.pflicht;
      if (r.pdfRoh) {
        try {
          r.pdf = messePdf(r, path.join(AUSGABE, "pdf-" + NAME, fall.id + ".pdf"));
        } catch (fehler) {
          r.pdfFehler = String(fehler && fehler.message ? fehler.message : fehler);
        }
        delete r.pdfRoh;
      }
      r.summe = fallSumme(r);
      ergebnisse.push(r);
      console.log((r.fehler ? "FEHLER   " : "ok       ") + fall.id.padEnd(15) + String(r.summe.bildschirme).padStart(3) + " Bildschirme, " + String(r.summe.gesamt).padStart(5) + " Wörter sichtbar, " + String(r.summe.zugeklappt).padStart(4) + " zu" + (r.pdf ? ", PDF " + r.pdf.seiten + " S., Begleittext " + r.pdf.begleit.seiten + " S./" + r.pdf.begleit.woerter + " W." : "") + (r.fehler ? " – " + r.fehler : "") + "  (" + Math.round((Date.now() - t0) / 1000) + " s)");
      if (r.pdfFehler) console.log("         PDF-Messung: " + r.pdfFehler);
    }
    if (zugangsFaelle.length) {
      // Zweiter Messserver: Die eingebettete Konfiguration bekommt einen Prüfwert (nur im Arbeitsspeicher), damit die Code-Seite erscheint.
      const mitCode = (inhalt) => mitPruefwert(inhalt.toString("utf8"));
      const eingriffeZ = new Map([["/anmeldung/", mitCode], ["/anmeldung/index.html", mitCode]]);
      const rahmenSeite = '<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Rahmen</title></head><body style="margin:0"><iframe src="/anmeldung/" title="Anmeldung" style="border:0;width:390px;height:844px"></iframe></body></html>';
      const virtuell = new Map([["/rahmen-messung.html", { typ: MIME[".html"], inhalt: rahmenSeite }]]);
      const z = await starteServer(BASIS, eingriffeZ, virtuell);
      try {
        for (const zf of zugangsFaelle) {
          const r = await laufeZugang(browser, { basis: "http://127.0.0.1:" + z.port }, zf);
          r.summe = fallSumme(r);
          zugangErgebnisse.push(r);
          const sk = r.seiten[0];
          console.log((r.fehler ? "FEHLER   " : "ok       ") + zf.id.padEnd(15) + (sk ? String(sk.gesamt).padStart(5) + " Wörter sichtbar auf " + sk.schluessel : "") + (r.kasten ? ", Hinweis oben " + r.kasten.woerter + " Wörter" : "") + (r.fehler ? " – " + r.fehler : "") + (sk && sk.verstoesse.length ? " – Verstöße: " + sk.verstoesse.map(regelKurz).join(" ") : ""));
        }
      } finally {
        z.server.close();
      }
    }
  } finally {
    await browser.close();
    server.close();
  }

  const rahmenQuelle = ergebnisse.find((x) => x.seiten.length);
  const rahmenWoerter = rahmenQuelle ? rahmenQuelle.seiten[1 % rahmenQuelle.seiten.length].rahmenWoerter : 0;
  const daten = {
    werkzeug: "tools/anmeldung-test/textmenge.mjs",
    version: TEXT_VERSION,
    name: NAME,
    erzeugt: new Date().toISOString(),
    basis: path.relative(ROOT, BASIS) || BASIS,
    vorschlag: VORSCHLAG_DATEI ? path.relative(ROOT, VORSCHLAG_DATEI) : null,
    bildschirm: BILDSCHIRM.name,
    heute: HEUTE,
    rahmen: { woerter: rahmenWoerter },
    faelle: ergebnisse,
    zugang: zugangErgebnisse,
  };
  // Die Textlisten gehören in die JSON-Datei (Beleg für jede Zahl); die Tabellen kommen in die .md-Datei.
  fs.writeFileSync(path.join(AUSGABE, "textmenge-" + NAME + ".json"), JSON.stringify(daten, null, 1) + "\n");
  fs.writeFileSync(path.join(AUSGABE, "textmenge-" + NAME + ".md"), baueMarkdown(daten));
  console.log("\nGeschrieben: " + path.relative(process.cwd(), path.join(AUSGABE, "textmenge-" + NAME + ".json")) + " und .md");
  const kaputt = ergebnisse.filter((x) => x.pflicht && x.fehler);
  const alle = ergebnisse.filter((x) => x.fehler);
  if (alle.length) console.log("Hinweis: " + alle.length + " Fall/Fälle nicht bis „fertig“: " + alle.map((x) => x.id).join(", "));
  const zugangKaputt = zugangErgebnisse.filter((x) => x.fehler);
  if (zugangKaputt.length) console.log("Hinweis: " + zugangKaputt.length + " Zugangsfall/-fälle ohne Messung: " + zugangKaputt.map((x) => x.id + " (" + x.fehler + ")").join("; "));
  process.exit(kaputt.length || zugangKaputt.length ? 1 : 0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((fehler) => {
    console.error(fehler);
    process.exit(2);
  });
}
