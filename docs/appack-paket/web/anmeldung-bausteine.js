import { hole, setze, sauber, pruefeDatum, zerlegeIso } from "./anmeldung-hilfen.js";
import { laenderListe } from "./anmeldung-laender.js";
import { pruefeLateinisch } from "./anmeldung-zeichen.js";

export function h(tag, attribute, ...kinder) {
  const el = document.createElement(tag);
  for (const [name, wert] of Object.entries(attribute || {})) {
    if (wert === undefined || wert === null || wert === false) continue;
    if (name === "klasse") el.className = wert;
    else if (name === "text") el.textContent = wert;
    else if (name.startsWith("on") && typeof wert === "function") el.addEventListener(name.slice(2), wert);
    else if (wert === true) el.setAttribute(name, "");
    else el.setAttribute(name, String(wert));
  }
  anhaengen(el, kinder);
  return el;
}

export function anhaengen(el, kinder) {
  for (const kind of kinder.flat(Infinity)) {
    if (kind === null || kind === undefined || kind === false) continue;
    el.append(kind instanceof Node ? kind : document.createTextNode(String(kind)));
  }
  return el;
}

export function absaetze(text, klasse) {
  const zeilen = String(text).split("\n").filter((z) => z.trim());
  return [h("div", { klasse: "anm-absaetze" }, zeilen.map((z) => h("p", { klasse: klasse || "anm-text" }, z)))];
}

function felder(k, { pfad, name, klasse }) {
  const id = k.nextId("f");
  return { id, hinweisId: id + "-h", fehlerId: id + "-f", pfad: pfad || name, klasse: klasse || "" };
}

function hinweisZeile(id, text) {
  return text ? h("p", { klasse: "anm-hinweis", id }, text) : null;
}

function fehlerZeile(id) {
  return h("p", { klasse: "anm-fehler", id, hidden: true });
}

const LATEIN_MELDUNG = {
  name: "fehler.lateinisch",
  ort: "fehler.lateinischOrt",
  anschrift: "fehler.lateinischAnschrift",
  verein: "fehler.lateinischVerein",
  text: "fehler.lateinischText",
  nummer: "fehler.lateinischNummer",
};

export function lateinFehler(k, text, feld, art) {
  if (!sauber(text) || pruefeLateinisch(text).ok) return [];
  return [{ feld, meldung: k.t(LATEIN_MELDUNG[art || "name"] || LATEIN_MELDUNG.name) }];
}

export function zeigeFehlerAnFeldern(wurzel, liste) {
  for (const huelle of wurzel.querySelectorAll("[data-feld]")) {
    const eintrag = liste.find((f) => f.feld === huelle.getAttribute("data-feld"));
    const fehlerEl = huelle.querySelector(":scope > .anm-fehler, :scope > .anm-kopfzeile > .anm-fehler");
    huelle.classList.toggle("anm-feld--fehler", !!eintrag);
    const ziele = huelle.matches("[role=radiogroup]")
      ? [huelle]
      : Array.from(huelle.querySelectorAll("input:not([type=radio]):not([type=file]), select, textarea"));
    for (const ziel of ziele) {
      if (eintrag) {
        ziel.setAttribute("aria-invalid", "true");
        if (fehlerEl && fehlerEl.id) ergaenzeBeschreibung(ziel, fehlerEl.id);
      } else {
        ziel.removeAttribute("aria-invalid");
        if (fehlerEl && fehlerEl.id) entferneBeschreibung(ziel, fehlerEl.id);
      }
    }
    if (fehlerEl) {
      fehlerEl.hidden = !eintrag;
      const text = eintrag ? eintrag.meldung : "";
      if (fehlerEl.textContent !== text) fehlerEl.textContent = text;
    }
  }
}

function ergaenzeBeschreibung(el, id) {
  const liste = (el.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean);
  if (!liste.includes(id)) liste.push(id);
  el.setAttribute("aria-describedby", liste.join(" "));
}

function entferneBeschreibung(el, id) {
  const liste = (el.getAttribute("aria-describedby") || "").split(/\s+/).filter((x) => x && x !== id);
  if (liste.length) el.setAttribute("aria-describedby", liste.join(" "));
  else el.removeAttribute("aria-describedby");
}

export function feldBezeichnung(wurzel, feld) {
  const huelle = Array.from(wurzel.querySelectorAll("[data-feld]")).find((x) => x.getAttribute("data-feld") === feld);
  if (!huelle) return "";
  const beschriftung = huelle.querySelector(":scope > label.anm-label") || (huelle.classList.contains("anm-datum") ? huelle.querySelector(":scope > legend.anm-legende") : null);
  const lesen = (el) => {
    const kopie = el.cloneNode(true);
    for (const x of kopie.querySelectorAll(".anm-freiwillig, .sr-only")) x.remove();
    return kopie.textContent.replace(/\s+/g, " ").replace(/[:\uff1a]\s*$/, "").trim();
  };
  const name = beschriftung ? lesen(beschriftung) : "";
  const kurz = !!name && name.length <= 60 && !/[?\u061f:]/.test(name);
  const gruppe = huelle.closest("fieldset.anm-person");
  const legende = gruppe ? gruppe.querySelector(":scope > legend") : null;
  const gruppenName = legende ? lesen(legende) : "";
  if (!kurz) return gruppenName;
  return gruppenName && gruppenName !== name ? gruppenName + " \u2013 " + name : name;
}

export function fokusZiel(wurzel, feld) {
  const huelle = Array.from(wurzel.querySelectorAll("[data-feld]")).find((x) => x.getAttribute("data-feld") === feld);
  if (!huelle) return null;
  if (huelle.hasAttribute("tabindex")) return huelle;
  return huelle.querySelector("input:not([type=hidden]):not(:disabled), select, textarea, canvas, button") || huelle;
}

export function textfeld(k, o) {
  const f = felder(k, { pfad: o.pfad });
  const mehrzeilig = !!o.zeilen;
  const eingabe = h(mehrzeilig ? "textarea" : "input", {
    id: f.id,
    name: o.pfad,
    "data-pfad": o.pfad,
    type: mehrzeilig ? null : o.typ || "text",
    rows: mehrzeilig ? o.zeilen : null,
    autocomplete: o.autocomplete || "off",
    inputmode: o.inputmode,
    maxlength: o.maxlength,
    dir: o.ltr ? "ltr" : null,
    spellcheck: o.ltr ? "false" : null,
    autocapitalize: o.grossbuchstaben ? "characters" : null,
    "aria-required": o.freiwillig || o.pflicht === false ? null : "true",
    "aria-describedby": o.hinweis ? f.hinweisId : null,
    klasse: "anm-eingabe" + (mehrzeilig ? " anm-eingabe--mehrzeilig" : ""),
  });
  const start = hole(k.a, o.pfad);
  eingabe.value = start === null || start === undefined ? "" : o.anzeige ? o.anzeige(String(start)) : String(start);

  const speichere = o.speichereAls || sauber;
  eingabe.addEventListener("input", () => {
    setze(k.a, o.pfad, speichere(eingabe.value));
    k.aenderung();
  });
  eingabe.addEventListener("blur", () => {
    const bereinigt = o.beimVerlassen ? o.beimVerlassen(eingabe.value) : sauber(eingabe.value);
    if (bereinigt !== eingabe.value) eingabe.value = bereinigt;
    setze(k.a, o.pfad, speichere(bereinigt));
    k.aenderung();
  });
  const beschriftung = h("label", { klasse: "anm-label", for: f.id }, o.label, o.freiwillig ? h("span", { klasse: "anm-freiwillig" }, " " + k.t("allgemein.freiwillig")) : null);
  return h("div", { klasse: "anm-feld " + f.klasse, "data-feld": o.feld || o.pfad }, beschriftung, hinweisZeile(f.hinweisId, o.hinweis), fehlerZeile(f.fehlerId), eingabe);
}

export function kartenAuswahl(k, o) {
  const f = felder(k, { pfad: o.pfad });
  const gewaehlt = hole(k.a, o.pfad);
  const name = k.nextId("g");
  const karte = (opt) => {
    const eingabe = h("input", {
      type: "radio",
      name,
      value: String(opt.wert),
      "data-pfad": o.pfad,
      "data-wert": String(opt.wert),
      id: k.nextId("o"),
      klasse: "anm-karte__eingabe",
    });
    if (gewaehlt === opt.wert) eingabe.checked = true;
    eingabe.addEventListener("change", () => {
      if (!eingabe.checked) return;
      setze(k.a, o.pfad, opt.wert);
      if (o.beiWahl) o.beiWahl(opt.wert);
      k.aenderung();
    });
    return h(
      "label",
      { klasse: "anm-karte", for: eingabe.id },
      eingabe,
      h("span", { klasse: "anm-karte__text" },
        h("span", { klasse: "anm-karte__titel", lang: opt.lang, dir: opt.dir }, opt.label, opt.meta ? h("span", { klasse: "anm-karte__meta" }, " " + opt.meta) : null),
        opt.hinweis ? h("span", { klasse: "anm-karte__hinweis" }, opt.hinweis) : null)
    );
  };
  const karten = o.optionen.map(karte);
  const weitere = o.weitere && o.weitere.optionen && o.weitere.optionen.length
    ? h("details", { klasse: "anm-einzelheiten anm-karten-weitere", "data-weitere-karten": "", open: o.weitere.optionen.some((opt) => opt.wert === gewaehlt) || null },
        h("summary", {}, o.weitere.titel),
        h("div", { klasse: "anm-karten" }, o.weitere.optionen.map(karte)))
    : null;
  const beschriftung = o.legende
    ? { legende: h("legend", { klasse: "anm-legende" }, o.legende) }
    : { "aria-labelledby": k.titelId };
  return h(
    "fieldset",
    Object.assign({ klasse: "anm-gruppe anm-feld " + (o.klasse || ""), role: "radiogroup", "data-feld": o.feld || o.pfad, "aria-required": o.freiwillig ? null : "true" },
      o.legende ? {} : beschriftung, o.hinweis ? { "aria-describedby": f.hinweisId } : {}),
    o.legende ? beschriftung.legende : null,
    hinweisZeile(f.hinweisId, o.hinweis),
    fehlerZeile(f.fehlerId),
    h("div", { klasse: "anm-karten" }, karten),
    weitere
  );
}

export function kaestchen(k, o) {
  const id = k.nextId("c");
  const eingabe = h("input", { type: "checkbox", id, name: o.pfad, "data-pfad": o.pfad, klasse: "anm-karte__eingabe anm-karte__eingabe--kasten" });
  eingabe.checked = hole(k.a, o.pfad) === true;
  eingabe.addEventListener("change", () => {
    setze(k.a, o.pfad, eingabe.checked);
    if (o.beiWahl) o.beiWahl(eingabe.checked);
    k.aenderung();
  });
  return h(
    "label",
    { klasse: "anm-karte anm-karte--kasten", for: id, "data-feld": o.feld || o.pfad },
    eingabe,
    h("span", { klasse: "anm-karte__text" },
      h("span", { klasse: "anm-karte__titel" }, o.label),
      o.hinweis ? h("span", { klasse: "anm-karte__hinweis" }, o.hinweis) : null)
  );
}

export function kaestchenListe(k, o) {
  const f = felder(k, { pfad: o.pfad });
  const aktuell = new Set(hole(k.a, o.pfad) || []);
  const eintraege = o.optionen.map((opt) => {
    const id = k.nextId("c");
    const eingabe = h("input", { type: "checkbox", id, value: opt.wert, "data-pfad": o.pfad, "data-wert": opt.wert, klasse: "anm-karte__eingabe anm-karte__eingabe--kasten" });
    eingabe.checked = aktuell.has(opt.wert);
    eingabe.addEventListener("change", () => {
      const jetzt = new Set(hole(k.a, o.pfad) || []);
      if (eingabe.checked) jetzt.add(opt.wert);
      else jetzt.delete(opt.wert);
      setze(k.a, o.pfad, o.optionen.map((x) => x.wert).filter((w) => jetzt.has(w)));
      k.aenderung();
    });
    return h("label", { klasse: "anm-karte anm-karte--kasten", for: id },
      eingabe,
      h("span", { klasse: "anm-karte__text" }, h("span", { klasse: "anm-karte__titel" }, opt.label)));
  });
  return h(
    "fieldset",
    { klasse: "anm-gruppe anm-feld", role: "group", "data-feld": o.feld || o.pfad, "aria-describedby": o.hinweis ? f.hinweisId : null },
    h("legend", { klasse: "anm-legende" }, o.legende),
    hinweisZeile(f.hinweisId, o.hinweis),
    fehlerZeile(f.fehlerId),
    h("div", { klasse: "anm-karten" }, eintraege)
  );
}

export function datumFelder(k, o) {
  const f = felder(k, { pfad: o.pfad });
  const iso = hole(k.a, o.pfad);
  const zerlegt = zerlegeIso(iso);
  const roh = k.roh[o.pfad] || (zerlegt ? { t: String(zerlegt.tag).padStart(2, "0"), m: String(zerlegt.monat).padStart(2, "0"), j: String(zerlegt.jahr) } : { t: "", m: "", j: "" });
  if (o.ohneTag && zerlegt && !k.roh[o.pfad]) roh.t = "";
  k.roh[o.pfad] = roh;
  const eingaben = {};
  const teil = (schluessel, label, breite, maxlaenge, ac) => {
    const id = k.nextId("d");
    const eingabe = h("input", {
      id,
      type: "text",
      inputmode: "numeric",
      maxlength: maxlaenge,
      autocomplete: ac || "off",
      dir: "ltr",
      "aria-required": o.freiwillig ? null : "true",
      "data-pfad": o.pfad + "." + schluessel,
      klasse: "anm-eingabe anm-eingabe--datum anm-eingabe--" + breite,
    });
    eingabe.value = roh[schluessel];
    eingabe.addEventListener("input", () => {
      roh[schluessel] = eingabe.value.replace(/\D/g, "");
      const ergebnis = pruefeDatum(roh.t, roh.m, roh.j, k.heute, { ohneTag: o.ohneTag, zukunftErlaubt: o.zukunftErlaubt });
      setze(k.a, o.pfad, ergebnis.iso || null);
      k.aenderung();
    });
    eingaben[schluessel] = eingabe;
    return h("div", { klasse: "anm-datum__teil" }, h("label", { klasse: "anm-label", for: id }, label), eingabe);
  };
  const ac = o.autocompleteVorsatz;
  const teile = [];
  if (!o.ohneTag) teile.push(teil("t", k.t("allgemein.tag"), "schmal", 2, ac ? ac + "-day" : null));
  teile.push(teil("m", k.t("allgemein.monat"), "schmal", 2, ac ? ac + "-month" : null));
  teile.push(teil("j", k.t("allgemein.jahr"), "breit", 4, ac ? ac + "-year" : null));
  return h(
    "fieldset",
    { klasse: "anm-gruppe anm-feld anm-datum", "data-feld": o.feld || o.pfad, "aria-describedby": f.hinweisId },
    h("legend", { klasse: "anm-legende" }, o.legende, o.freiwillig ? h("span", { klasse: "anm-freiwillig" }, " " + k.t("allgemein.freiwillig")) : null),
    h("p", { klasse: "anm-hinweis", id: f.hinweisId }, o.hinweis || k.t(o.ohneTag ? "allgemein.datumHinweisMonat" : "allgemein.datumHinweis")),
    fehlerZeile(f.fehlerId),
    h("div", { klasse: "anm-datum__felder" }, teile)
  );
}

export function pruefeDatumsfeld(k, pfad, { pflicht = true, ohneTag = false, zukunftErlaubt = false, frueh } = {}) {
  const roh = k.roh[pfad];
  const iso = hole(k.a, pfad);
  if (!roh && iso) return null;
  const r = roh ? pruefeDatum(roh.t, roh.m, roh.j, k.heute, { ohneTag, zukunftErlaubt, frueh }) : { leer: true };
  if (r.leer) return pflicht ? k.t("fehler.datumLeer") : null;
  if (r.fehler === "unvollstaendig") return k.t(ohneTag ? "fehler.datumUnvollstaendigMonat" : "fehler.datumUnvollstaendig");
  if (r.fehler === "ungueltig") return k.t("fehler.datumUngueltig");
  if (r.fehler === "zukunft") return k.t("fehler.datumZukunft");
  if (r.fehler === "zu-alt") return k.t("fehler.datumZuAlt");
  return null;
}

export function landAuswahl(k, o) {
  const f = felder(k, { pfad: o.pfad });
  const { haeufig, alle } = laenderListe(k.sprache);
  const auswahl = h("select", {
    id: f.id,
    name: o.pfad,
    "data-pfad": o.pfad,
    autocomplete: o.autocomplete || "off",
    "aria-required": o.freiwillig ? null : "true",
    "aria-describedby": o.hinweis ? f.hinweisId : null,
    klasse: "anm-eingabe anm-eingabe--auswahl",
  });
  auswahl.append(h("option", { value: "" }, k.t("allgemein.bitteWaehlen")));
  const gruppe = (titel, liste) => auswahl.append(h("optgroup", { label: titel }, liste.map((l) => h("option", { value: l.code }, l.name))));
  gruppe(k.t("allgemein.haeufigeLaender"), haeufig);
  gruppe(k.t("allgemein.alleLaender"), alle);
  const start = hole(k.a, o.pfad);
  auswahl.value = start || "";
  auswahl.addEventListener("change", () => {
    setze(k.a, o.pfad, auswahl.value || null);
    k.aenderung();
  });
  return h("div", { klasse: "anm-feld", "data-feld": o.feld || o.pfad },
    h("label", { klasse: "anm-label", for: f.id }, o.label, o.freiwillig ? h("span", { klasse: "anm-freiwillig" }, " " + k.t("allgemein.freiwillig")) : null),
    hinweisZeile(f.hinweisId, o.hinweis),
    fehlerZeile(f.fehlerId),
    auswahl);
}

export function mehrErfahren(k, inhalt) {
  return h("details", { klasse: "anm-einzelheiten anm-mehr", "data-mehr": "" },
    h("summary", {}, k.t("allgemein.mehrErfahren")),
    h("div", { klasse: "anm-mehr__inhalt" }, inhalt));
}

export function knopf(text, o) {
  const opt = o || {};
  return h(
    "button",
    {
      type: opt.typ || "button",
      klasse: "knopf" + (opt.sekundaer ? " knopf--sekundaer" : "") + (opt.klasse ? " " + opt.klasse : ""),
      "data-aktion": opt.aktion,
      "aria-label": opt.ariaLabel,
      disabled: opt.deaktiviert,
      onclick: opt.beiKlick,
    },
    text
  );
}

export function hinweisKasten(art, label, inhalt) {
  const klasse = art === "info" ? "hinweis hinweis--info" : art === "offen" || art === "warnung" ? "hinweis hinweis--offen" : "hinweis";
  return h("div", { klasse: klasse + " anm-hinweiskasten anm-hinweiskasten--" + art },
    label ? h("p", { klasse: "anm-hinweiskasten__label" }, label) : null,
    inhalt);
}

export function vereinsKasten(k, inhalt) {
  return h("div", { klasse: "anm-vereinshinweis", role: "note" },
    h("p", { klasse: "anm-vereinshinweis__titel" }, k.t("demo.vereinTitel")),
    inhalt);
}
