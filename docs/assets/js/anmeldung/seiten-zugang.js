/*
  Die beiden Seiten vor dem Assistenten (Paket P1, 12.10.2026):

    code        Zugang mit dem Code vom Probetraining. Erster Bildschirm, solange kein gültiger Code da ist
                (data/anmeldung.json › zugang › pruefwerte nicht leer), vor jeder persönlichen Frage.
    uebergabe   Nur in der Vereins-App (Seite mit ?app=1): Die Anmeldung läuft nie in der Webansicht der App,
                sondern im Browser. Ein Knopf öffnet dieselbe Seite dort (ext://https://…, ohne ?app=1, mit code).

  Beide sind keine Schritte des Regelwerks (SCHNITTSTELLEN Abschnitt 4 nennt 26 Schritte) und stehen darum nicht in
  SEITEN (seiten.js), sondern in VORSEITEN. Aufbau einer Seite: siehe seiten-person.js (zusätzlich: render darf
  `nach` liefern, das hinter den Knöpfen steht). Der Zustand des Zugangs liegt in k.zugang (assistent.js).
*/

import { h, absaetze } from "./bausteine.js";
import { normalisiereCode, pruefeCode } from "./zugang.js";
import { mailtoCode } from "./hilfen.js";

// "Noch kein Probetraining? {link}": der Text steht mit {link} im Wörterbuch, der Link als eigener Text. So passt die
// Wortstellung in jeder Sprache. Fehlt {link}, stehen Text und Link hintereinander.
function mitLink(text, link) {
  const teile = String(text).split("{link}");
  return teile.length === 2 ? [teile[0], link, teile[1]] : [text, " ", link];
}

// ---------- code ----------

export const code = {
  id: "code",
  teile: () => ["haupt"],
  render(k) {
    const z = k.zugang;
    const id = k.nextId("f");
    const fehlerId = id + "-f";
    // Das Feld liegt nicht in den Antworten (k.a): Der Code ist keine Angabe zur Person und geht nie ins PDF.
    // lang="en": Der Code besteht aus lateinischen Buchstaben; die Versalien der Anzeige folgen so nicht dem türkischen Punkt-i.
    const eingabe = h("input", {
      id,
      name: "zugang",
      type: "text",
      "data-pfad": "zugang.code",
      autocomplete: "off",
      autocapitalize: "characters",
      autocorrect: "off",
      spellcheck: "false",
      enterkeyhint: "go",
      maxlength: 64,
      dir: "ltr",
      lang: "en",
      "aria-required": "true",
      klasse: "anm-eingabe anm-eingabe--code",
    });
    eingabe.value = z.eingabe;
    eingabe.addEventListener("input", () => {
      // Wer tippt, korrigiert: Die alte Meldung verschwindet, die nächste Prüfung kommt mit "Weiter".
      z.eingabe = eingabe.value;
      z.geprueft = "";
      z.gueltig = false;
      k.fehlerLoeschen();
    });
    const feld = h("div", { klasse: "anm-feld", "data-feld": "code" },
      h("label", { klasse: "anm-label", for: id }, k.t("code.label")),
      h("p", { klasse: "anm-fehler", id: fehlerId, hidden: true }),
      eingabe);

    // Zwei kleine Hinweise unter dem Knopf: Wer noch kein Probetraining hatte, und wer als passives Mitglied den Code braucht.
    const hilfen = [];
    const seiten = (k.konfig && k.konfig.seiten) || {};
    if (seiten.probetraining) {
      hilfen.push(h("p", { klasse: "anm-hinweis" }, mitLink(k.t("code.kein"), h("a", { href: seiten.probetraining, "data-aktion": "probetraining" }, k.t("code.keinLink")))));
    }
    const adresse = k.konfig && k.konfig.verein && k.konfig.verein.mail;
    if (adresse) {
      hilfen.push(h("p", { klasse: "anm-hinweis" }, mitLink(k.t("code.passiv"), h("a", { href: mailtoCode(adresse), "data-aktion": "code-anfragen" }, k.t("code.passivLink")))));
    }
    return {
      titel: k.t("code.titel"),
      inhalt: [...absaetze(k.t("code.einleitung")), feld],
      nach: hilfen.length ? h("div", { klasse: "anm-block anm-code-hilfen" }, hilfen) : null,
    };
  },
  // Rechnet den Prüfwert (asynchron: crypto.subtle) und merkt sich das Ergebnis zum eingegebenen Text.
  async vorPruefung(k) {
    const z = k.zugang;
    const r = await pruefeCode(z.eingabe, z.pruefwerte);
    z.geprueft = r.code;
    z.gueltig = r.gueltig;
  },
  // Weiter geht nur ein Code, der für genau diesen Text als gültig geprüft ist. Leer und falsch haben je eine Meldung.
  pruefe(k) {
    const z = k.zugang;
    const norm = normalisiereCode(z.eingabe);
    if (!norm) return [{ feld: "code", meldung: k.t("code.fehlerLeer") }];
    if (z.gueltig && z.geprueft === norm) return [];
    return [{ feld: "code", meldung: k.t("code.fehlerFalsch") }];
  },
  beimVerlassen(k) {
    const z = k.zugang;
    if (z.gueltig && z.geprueft === normalisiereCode(z.eingabe)) k.zugangFreigeben(z.geprueft);
  },
};

// ---------- uebergabe ----------

export const uebergabe = {
  id: "uebergabe",
  teile: () => ["haupt"],
  ohneWeiter: true,
  render(k) {
    // ext:// + die Adresse dieser Seite ohne ?app=1 (mit code, falls einer da ist): Die Vereins-App öffnet sie im Browser.
    const link = h("a", { klasse: "knopf anm-browserlink", href: "ext://" + k.browserUrl(), "data-aktion": "im-browser-oeffnen" }, k.t("app.browser"));
    return { titel: k.t("app.uebergabe"), inhalt: [h("p", {}, link)] };
  },
  pruefe: () => [],
};
