import { h, zeigeFehlerAnFeldern, fokusZiel, feldBezeichnung, anhaengen, hinweisKasten } from "./anmeldung-bausteine.js";
import { kopiere, sauber, heuteIso, ersetzePlatzhalter } from "./anmeldung-hilfen.js";
import { zugangAusKonfig, pruefeCode } from "./anmeldung-zugang.js";
import { neuerSpeicher } from "./anmeldung-unterschrift.js";
import T from "./anmeldung-texte-trainer-de.js";
import { SEITEN, REIHENFOLGE, ABSCHNITTE, ABSCHNITT_VON } from "./anmeldung-trainer-seiten.js";
import { neueAntworten, ersteOffeneSeite } from "./anmeldung-trainer-regeln.js";

import * as pdfModul from "./anmeldung-trainer-pdf.js";

const SITZUNG = Math.random().toString(36).slice(2);

const FEHLER_SCHLUESSEL = {
  bibliothek: "bibliothek",
  konfig: "konfig",
  angaben: "angaben",
  "unterschrift-fehlt": "unterschrift",
  "unterschrift-format": "unterschrift",
  "foto-fehlt": "foto",
  "foto-format": "foto",
  pdf: "pdf",
};

const teilPfad = (wb, pfad) => String(pfad).split(".").reduce((x, teil) => (x === undefined || x === null ? undefined : x[teil]), wb);

function zeigeLadefehler(wurzel, mail) {
  wurzel.textContent = "";
  wurzel.append(h("div", { klasse: "hinweis hinweis--offen", role: "alert" }, h("p", {}, ersetzePlatzhalter(T.seite.ladefehler, { mail }))));
}

function dateienAus(ergebnis) {
  const liste = ergebnis && Array.isArray(ergebnis.dateien) ? ergebnis.dateien : [];
  if (!liste.length) throw new Error("erzeugeDateien lieferte keine Dateien");
  return liste.map((d) => {
    if (!d || typeof d.name !== "string" || !d.bytes || !d.bytes.length) throw new Error("erzeugeDateien lieferte eine ungültige Datei");
    const typ = d.typ || "application/octet-stream";
    let datei = null;
    try {
      datei = new File([d.bytes], d.name, { type: typ, lastModified: Date.now() });
    } catch (fehler) {
      datei = null;
    }
    return { name: d.name, typ, bytes: d.bytes, beschreibung: d.beschreibung || "", datei };
  });
}

export async function startTrainer(wurzel, konfig) {
  if (!wurzel) return;
  const verein = konfig && typeof konfig === "object" && konfig.verein && typeof konfig.verein === "object" ? konfig.verein : {};

  const mail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sauber(verein.mail)) ? sauber(verein.mail) : "";
  const mailText = mail || "die Geschäftsstelle";
  if (!konfig || typeof konfig !== "object") {
    console.error("Trainerseite: Konfiguration fehlt oder ist nicht lesbar");
    zeigeLadefehler(wurzel, mailText);
    return;
  }

  const k = {
    konfig,
    mail,
    heute: heuteIso(),
    a: neueAntworten(),
    medien: { foto: null, unterschrift: null },

    striche: neuerSpeicher(),
    roh: {},
    wartend: new Set(),

    zugang: { ...zugangAusKonfig(konfig), frei: false, eingabe: "", geprueft: "", gueltig: false },

    erzeugung: { zustand: "leer", veraltet: false, dateien: null, warnungen: [], fehler: null },
    vorschauen: new Map(),
    version: 0,
    schritt: "code",
    tiefe: 0,
    fehlerAktiv: false,
    gesichert: false,
    dirty: false,
    idZaehler: 0,
    bedingungen: [],
    aktualisierer: [],
    nachListe: [],
    titelId: "anm-titel",
  };

  k.text = (pfad, werte) => {
    const w = teilPfad(T, pfad);
    if (w === undefined) {
      console.warn("Trainerseite: Text fehlt: " + pfad);
      return pfad;
    }
    return typeof w === "string" ? ersetzePlatzhalter(w, { mail: mailText, ...werte }) : w;
  };
  k.t = k.text;

  k.textListe = (pfad, werte) => {
    const w = teilPfad(T, pfad);
    return Array.isArray(w) ? w.map((x) => (typeof x === "string" ? ersetzePlatzhalter(x, { mail: mailText, ...werte }) : x)) : [];
  };

  k.nextId = (vorsatz) => "anm-" + vorsatz + ++k.idZaehler;
  k.bedingt = (el, fn) => {
    k.bedingungen.push([el, fn]);
    el.hidden = !fn();
  };
  const wendeBedingungenAn = () => {
    for (const [el, fn] of k.bedingungen) {
      const zeigen = !!fn();
      if (el.hidden === zeigen) el.hidden = !zeigen;
    }
    for (const f of k.aktualisierer) f();
  };
  k.nachRender = (fn) => k.nachListe.push(fn);
  const nachRenderSofort = () => {
    const liste = k.nachListe;
    k.nachListe = [];
    liste.forEach((f) => f());
  };

  k.vorschauUrl = (schluessel, bytes, typ) => {
    const alt = k.vorschauen.get(schluessel);
    if (alt && alt.bytes === bytes) return alt.url;
    if (alt) URL.revokeObjectURL(alt.url);
    const url = URL.createObjectURL(new Blob([bytes], { type: typ }));
    k.vorschauen.set(schluessel, { bytes, url });
    return url;
  };
  k.fehlerSchluessel = (fehler) => FEHLER_SCHLUESSEL[fehler && fehler.art] || "pdf";
  const regelKontext = () => ({ heute: k.heute, roh: k.roh, medien: k.medien, konfig, zugang: k.zugang });

  let ersteSeite = "code";
  let codeFehler = false;
  let ausLink = null;
  try {
    ausLink = new URL(location.href).searchParams.get(k.zugang.parameter);
  } catch (fehler) {
    ausLink = null;
  }
  if (ausLink !== null) {
    k.zugang.eingabe = ausLink;
    const r = await pruefeCode(ausLink, k.zugang.pruefwerte);
    k.zugang.geprueft = r.code;
    k.zugang.gueltig = r.gueltig;
    if (r.gueltig) {
      k.zugang.frei = true;
      ersteSeite = "start";
    } else codeFehler = !r.leer;
  }

  const meldung = h("p", { klasse: "anm-meldung", role: "status" });
  const zurueckKnopf = h("button", { type: "button", klasse: "anm-zurueck", "data-aktion": "zurueck", "aria-label": k.text("rahmen.zurueckLang") }, k.text("rahmen.zurueck"));
  const hilfeKnopf = h("button", { type: "button", klasse: "anm-hilfe", "data-aktion": "hilfe", "aria-expanded": "false" }, k.text("rahmen.hilfe"));
  const kopf = h("header", { klasse: "anm-kopf" }, zurueckKnopf, h("div", { klasse: "anm-kopf__werkzeuge" }, hilfeKnopf));
  const abschnittListe = h("ol", { klasse: "anm-abschnitte__liste" }, ABSCHNITTE.map((id) => h("li", { klasse: "anm-abschnitte__punkt", "data-abschnitt": id }, k.text("rahmen.abschnitte." + id))));
  const abschnitte = h("nav", { klasse: "anm-abschnitte", "aria-labelledby": "anm-abschnitte-titel" }, h("p", { klasse: "sr-only", id: "anm-abschnitte-titel" }, k.text("rahmen.abschnittTitel")), abschnittListe);

  const hilfeTeile = T.rahmen.hilfeText.split("{mail}");
  const hilfeAdresse = mail ? h("a", { href: "mailto:" + mail, "data-aktion": "hilfe-mail" }, mail) : mailText;
  const hilfeKasten = h("div", { klasse: "tr-hilfe", role: "status", "data-hilfe": "", hidden: true },
    hinweisKasten("info", null, h("p", {}, hilfeTeile[0], hilfeAdresse, hilfeTeile[1] || "")));
  const formular = h("form", { klasse: "anm-seite", novalidate: true });
  const fussText = h("p", { klasse: "anm-fuss__text" }, k.text("rahmen.fuss.privat"));
  const loeschenKnopf = h("button", { type: "button", klasse: "knopf knopf--sekundaer anm-fuss__loeschen", "data-aktion": "loeschen-alles" }, k.text("rahmen.fuss.loeschen"));
  const fuss = h("footer", { klasse: "anm-fuss" }, fussText, loeschenKnopf);
  const loeschenDialog = h("dialog", { klasse: "anm-dialog anm-dialog--loeschen", "aria-labelledby": "anm-loeschen-titel" });
  wurzel.textContent = "";
  wurzel.append(kopf, abschnitte, hilfeKasten, meldung, formular, fuss, loeschenDialog);
  wurzel.classList.add("anm--bereit");
  wurzel.setAttribute("lang", "de");
  wurzel.setAttribute("dir", "ltr");

  const seitenwurzel = wurzel.closest("main") || document.body;

  k.melde = (text) => {
    meldung.textContent = text || "";
  };

  function aktualisiereKopf() {
    const seite = SEITEN[k.schritt];

    seitenwurzel.classList.toggle("anm-kompakt", !seite.voll);
    const aktuell = ABSCHNITT_VON[k.schritt] || null;
    abschnitte.hidden = !aktuell;
    zurueckKnopf.hidden = k.tiefe <= 0;
    loeschenKnopf.hidden = !!seite.ohneLoeschen;
    hilfeKasten.hidden = true;
    hilfeKnopf.setAttribute("aria-expanded", "false");
    for (const li of abschnittListe.children) {
      const id = li.getAttribute("data-abschnitt");
      li.textContent = k.text("rahmen.abschnitte." + id);
      if (id === aktuell) {
        li.setAttribute("aria-current", "step");
        li.append(h("span", { klasse: "sr-only" }, " (" + k.text("rahmen.hierBistDu") + ")"));
      } else li.removeAttribute("aria-current");
    }
  }

  let fehlerBox = null;

  function zeigeFehler(fehler, fokus) {
    zeigeFehlerAnFeldern(formular, fehler);
    if (!fehlerBox) return;
    fehlerBox.textContent = "";
    fehlerBox.hidden = !fehler.length;
    if (!fehler.length) return;
    fehlerBox.append(
      h("p", { klasse: "anm-fehlerbox__titel", id: "anm-fehlerbox-titel" }, fehler.length === 1 ? k.text("fehler.titelEins") : k.text("fehler.titelMehr", { anzahl: fehler.length })),
      h("ul", { klasse: "anm-fehlerbox__liste" }, fehler.map((f) => {

        const vorsatz = feldBezeichnung(formular, f.feld);
        const link = h("a", { href: "#" + (fokusZiel(formular, f.feld)?.id || "") }, vorsatz ? vorsatz + ": " + f.meldung : f.meldung);
        link.addEventListener("click", (e) => {
          e.preventDefault();
          const ziel = fokusZiel(formular, f.feld);
          if (ziel) {
            ziel.focus();
            ziel.scrollIntoView({ block: "center" });
          }
        });
        return h("li", {}, link);
      })));
    if (fokus) {
      fehlerBox.focus({ preventScroll: true });
      fehlerBox.scrollIntoView({ block: "start" });
    }
  }

  k.fehlerLoeschen = () => {
    zeigeFehler([], false);
    k.fehlerAktiv = false;
  };

  k.aenderung = () => {
    k.version++;
    k.dirty = true;
    k.gesichert = false;
    if (k.erzeugung.zustand === "fertig") k.erzeugung.veraltet = true;
    wendeBedingungenAn();
    if (k.fehlerAktiv) {
      const fehler = SEITEN[k.schritt].pruefe(k);
      zeigeFehler(fehler, false);
      if (!fehler.length) k.fehlerAktiv = false;
    }
  };

  k.zugangFreigeben = (code) => {
    k.zugang.frei = true;
    try {
      const u = new URL(location.href);
      u.searchParams.set(k.zugang.parameter, code);
      history.replaceState(history.state, "", u.toString());
    } catch (fehler) {

    }
  };

  function zeigeSeite(id, optionen) {
    const o = optionen || {};

    if (!k.zugang.frei) id = "code";
    const seite = SEITEN[id];
    k.schritt = id;
    k.bedingungen = [];
    k.aktualisierer = [];
    k.nachListe = [];
    let ergebnis;
    try {
      ergebnis = seite.render(k);
    } catch (fehler) {
      console.error("Trainerseite: Seite " + id + " ließ sich nicht bauen", fehler);
      ergebnis = { titel: k.text("rahmen.hilfe"), inhalt: [h("div", { klasse: "hinweis hinweis--offen", role: "alert" }, h("p", {}, k.text("fehler.seite")))], ohneWeiter: true };
    }
    fehlerBox = h("div", { klasse: "anm-fehlerbox", role: "group", tabindex: "-1", "aria-labelledby": "anm-fehlerbox-titel", hidden: true });
    const titel = h("h2", { id: k.titelId, klasse: "anm-titel", tabindex: "-1" }, ergebnis.titel);
    const knoepfe = seite.ohneWeiter || ergebnis.ohneWeiter ? [] : [h("button", { type: "submit", klasse: "knopf anm-weiter", "data-aktion": "weiter" }, ergebnis.weiterText)];
    formular.textContent = "";
    anhaengen(formular, [titel, fehlerBox, ergebnis.inhalt, knoepfe.length ? h("div", { klasse: "anm-navigation" }, ...knoepfe) : null, ergebnis.nach]);
    wurzel.setAttribute("data-schritt", id);
    aktualisiereKopf();
    wendeBedingungenAn();
    nachRenderSofort();
    k.fehlerAktiv = false;
    if (o.fokus !== false) {
      titel.focus({ preventScroll: true });

      kopf.scrollIntoView({ block: "start" });
    }
  }

  k.geheZu = (id, optionen) => {
    const o = optionen || {};
    if (!SEITEN[id]) return;
    k.melde("");
    if (o.ersetzen) history.replaceState({ anm: SITZUNG, tiefe: k.tiefe, schritt: id }, "");
    else {
      k.tiefe += 1;
      history.pushState({ anm: SITZUNG, tiefe: k.tiefe, schritt: id }, "");
    }
    zeigeSeite(id, { fokus: o.fokus });
  };

  function leiteBeiLueckeUm(ersetzen) {
    const offen = ersteOffeneSeite(k.a, regelKontext());
    if (!offen) return false;
    k.geheZu(offen.seite, { ersetzen });
    zeigeFehler(offen.fehler, true);
    k.fehlerAktiv = true;
    return true;
  }

  let beschaeftigt = false;
  async function weiter() {
    if (beschaeftigt) return;
    beschaeftigt = true;
    try {
      const seite = SEITEN[k.schritt];
      if (seite.vorPruefung) await seite.vorPruefung(k);
      const fehler = seite.pruefe(k);
      zeigeFehler(fehler, true);
      if (fehler.length) {
        k.fehlerAktiv = true;
        wendeBedingungenAn();
        return;
      }
      k.fehlerAktiv = false;
      if (seite.beimVerlassen) seite.beimVerlassen(k);
      if (seite.id === "pruefen" && leiteBeiLueckeUm(false)) return;
      const i = REIHENFOLGE.indexOf(seite.id);
      if (i < REIHENFOLGE.length - 1) k.geheZu(REIHENFOLGE[i + 1]);
    } finally {
      beschaeftigt = false;
    }
  }

  formular.addEventListener("submit", (e) => {
    e.preventDefault();
    weiter();
  });

  zurueckKnopf.addEventListener("click", () => {
    if (k.tiefe > 0) history.back();
  });

  window.addEventListener("popstate", (e) => {
    const s = e.state;
    if (!s || s.anm !== SITZUNG || !SEITEN[s.schritt]) return;
    k.tiefe = s.tiefe;
    k.melde("");

    if (s.schritt === "fertig" && leiteBeiLueckeUm(true)) return;
    zeigeSeite(s.schritt, {});
  });

  k.zeigeHilfe = () => {
    const an = hilfeKasten.hidden;
    hilfeKasten.hidden = !an;
    hilfeKnopf.setAttribute("aria-expanded", String(an));
    if (an) hilfeKasten.scrollIntoView({ block: "nearest" });
  };
  hilfeKnopf.addEventListener("click", () => k.zeigeHilfe());

  function oeffne(dialog) {
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function schliesse(dialog) {
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }

  function leereAlles() {
    k.a = neueAntworten();
    k.medien = { foto: null, unterschrift: null };
    k.striche = neuerSpeicher();
    k.roh = {};
    k.wartend.clear();
    for (const v of k.vorschauen.values()) URL.revokeObjectURL(v.url);
    k.vorschauen.clear();
    k.erzeugung = { zustand: "leer", veraltet: false, dateien: null, warnungen: [], fehler: null };
    k.version++;
    k.gesichert = false;
    k.dirty = false;
    k.fehlerAktiv = false;
  }

  function datenLoeschen() {
    leereAlles();
    k.geheZu("start");
    k.melde(k.text("loeschen.fertig"));
  }

  loeschenKnopf.addEventListener("click", () => {
    loeschenDialog.textContent = "";
    loeschenDialog.append(
      h("h2", { id: "anm-loeschen-titel", klasse: "anm-dialog__titel" }, k.text("loeschen.titel")),
      h("p", {}, k.text("loeschen.text")),
      h("div", { klasse: "anm-knoepfe" },
        h("button", { type: "button", klasse: "knopf", "data-aktion": "loeschen-ja", onclick: () => { schliesse(loeschenDialog); datenLoeschen(); } }, k.text("loeschen.ja")),
        h("button", { type: "button", klasse: "knopf knopf--sekundaer", "data-aktion": "loeschen-nein", autofocus: true, onclick: () => schliesse(loeschenDialog) }, k.text("loeschen.nein"))));
    oeffne(loeschenDialog);
  });

  k.pdfModul = async () => pdfModul;

  k.antragVorschau = async () => {
    const modul = await k.pdfModul();
    return modul.vorschauAntrag({ antworten: kopiere(k.a), konfig, heute: k.heute });
  };

  async function erstelleDateien() {
    const e = k.erzeugung;
    e.zustand = "arbeit";
    e.veraltet = false;
    e.fehler = null;
    e.warnungen = [];
    const version = k.version;
    try {
      const modul = await k.pdfModul();
      const ergebnis = await modul.erzeugeDateien({ antworten: kopiere(k.a), medien: { foto: k.medien.foto, unterschrift: k.medien.unterschrift }, konfig, heute: k.heute });
      if (version !== k.version || e !== k.erzeugung) {

        if (e === k.erzeugung) e.zustand = "leer";
        return;
      }
      e.dateien = dateienAus(ergebnis);
      e.warnungen = Array.isArray(ergebnis.warnungen) ? ergebnis.warnungen : [];
      e.zustand = "fertig";
    } catch (fehler) {
      if (e !== k.erzeugung) return;
      e.zustand = "fehler";
      e.fehler = fehler;
      console.error("Trainerseite: Dateien nicht erstellt", fehler);
    }
  }

  k.starteErstellen = (erzwingen) => {
    if (k.erzeugung.zustand === "arbeit") return;
    if (erzwingen) k.erzeugung.zustand = "leer";
    const beendet = erstelleDateien();
    if (erzwingen && k.schritt === "fertig") zeigeSeite("fertig", { fokus: false });
    beendet.then(() => {
      if (k.schritt === "fertig") zeigeSeite("fertig", { fokus: false });
    });
  };

  const hatInhalt = () => JSON.stringify(k.a) !== JSON.stringify(neueAntworten()) || !!k.medien.foto || !!k.medien.unterschrift;
  window.addEventListener("beforeunload", (e) => {
    if (!(k.dirty && hatInhalt()) || k.gesichert) return;
    e.preventDefault();
    e.returnValue = "";
  });

  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  history.replaceState({ anm: SITZUNG, tiefe: 0, schritt: ersteSeite }, "");
  zeigeSeite(ersteSeite, { fokus: false });
  if (codeFehler) zeigeFehler(SEITEN.code.pruefe(k), false);
  wurzel.setAttribute("data-bereit", "");
}
