import { zeigeFehlerAnFeldern, fokusZiel, feldBezeichnung, h, anhaengen } from "./anmeldung-bausteine.js";
import { kopiere, mische, sauber, heuteIso, ersetzePlatzhalter, dateiteil, zerlegeIso } from "./anmeldung-hilfen.js";
import { neueAntworten } from "./anmeldung-antworten.js";
import { BEISPIELE, beispielAntworten } from "./anmeldung-beispiele.js";
import { SEITEN as REGELSEITEN, VORSEITEN, REIHENFOLGE, ABSCHNITTE, ABSCHNITT_VON } from "./anmeldung-seiten.js";
import { zugangAusKonfig, pruefeCode } from "./anmeldung-zugang.js";
import { umgebungshinweis } from "./anmeldung-umgebung.js";
import { neuerSpeicher } from "./anmeldung-unterschrift.js";
import { regelHinweise, erstelleDatei } from "./anmeldung-seiten-ende.js";
import { beitragsgruppen } from "./anmeldung-seiten-verein.js";

const SEITEN = { ...REGELSEITEN, ...VORSEITEN };

const SITZUNG = Math.random().toString(36).slice(2);

function zeigeLadefehler(wurzel) {
  const text = wurzel.getAttribute("data-anm-ladefehler") || "";
  wurzel.textContent = "";
  wurzel.append(h("div", { klasse: "hinweis hinweis--offen", role: "alert" }, h("p", {}, text)));
}

function quelleText(q) {
  if (!q) return "";
  if (typeof q === "string") return q;
  if (Array.isArray(q)) return q.map(quelleText).filter(Boolean).join("; ");
  if (typeof q === "object") return [q.dokument || q.name || q.titel, q.stelle || q.paragraph, q.stand].filter(Boolean).join(", ");
  return "";
}

function findeQuelle(daten, bereich, id) {
  if (!daten || typeof daten !== "object") return "";
  const suche = (knoten, tiefe) => {
    if (!knoten || typeof knoten !== "object" || tiefe > 6) return null;
    if (Array.isArray(knoten)) {
      for (const x of knoten) {
        const r = suche(x, tiefe + 1);
        if (r) return r;
      }
      return null;
    }
    if ((knoten.id === id || knoten.key === id || knoten.regel === id) && knoten.quelle) return knoten;
    if (knoten[id] && typeof knoten[id] === "object" && knoten[id].quelle) return knoten[id];
    for (const v of Object.values(knoten)) {
      const r = suche(v, tiefe + 1);
      if (r) return r;
    }
    return null;
  };
  const treffer = suche(daten[bereich], 0) || suche(daten, 0);
  return treffer ? quelleText(treffer.quelle) : "";
}

async function starte() {
  const wurzel = document.getElementById("anmeldung");
  const konfigElement = document.getElementById("anmeldung-konfig");
  if (!wurzel || !konfigElement) return;
  let konfig;
  try {
    konfig = JSON.parse(konfigElement.textContent);
  } catch (e) {
    console.error("Anmeldung: Konfiguration nicht lesbar", e);
    zeigeLadefehler(wurzel);
    return;
  }
  let regeln;
  let deDatei;
  let deRegelnDatei;
  try {
    [regeln, deDatei, deRegelnDatei] = await Promise.all([import("./anmeldung-regeln.js"), import("./anmeldung-texte-de-oberflaeche.js"), import("./anmeldung-texte-de-regeln.js")]);
  } catch (e) {
    console.error("Anmeldung: Modul nicht geladen", e);
    zeigeLadefehler(wurzel);
    return;
  }
  await baue(wurzel, konfig, regeln, deDatei.default, deRegelnDatei.default);
}

async function baue(wurzel, konfig, regeln, deTexte, deRegelTexte) {

  const k = {
    konfig,
    regeln,
    heute: heuteIso(),

    sprachen: Array.isArray(konfig.sprachen) ? deTexte.sprachen.filter((s) => s.code === "de" || konfig.sprachen.includes(s.code)) : deTexte.sprachen,
    a: neueAntworten("de"),
    bilder: { spielerfoto: null, nachweise: {}, unterschriften: {} },
    roh: {},
    striche: {},
    wartend: new Set(),
    pdf: { zustand: "leer", veraltet: false, ergebnis: null, datei: null, fehlerArt: null },
    sprache: "de",

    zugang: { ...zugangAusKonfig(konfig.anmeldung), frei: false, eingabe: "", geprueft: "", gueltig: false },

    umgebung: umgebungshinweis(navigator.userAgent, window),
    dicts: { de: deTexte },
    regelDicts: { de: deRegelTexte },
    version: 0,
    schritt: "start",
    teil: "haupt",
    tiefe: 0,
    rueckkehr: false,
    fehlerAktiv: false,
    gesichert: false,
    dirty: false,
    idZaehler: 0,
    bedingungen: [],
    aktualisierer: [],
    nachListe: [],
    vorschauen: new Map(),
    titelId: "anm-titel",
  };

  let ersteSeite = "start";
  let codeFehler = false;
  k.zugang.frei = !k.zugang.aktiv;
  if (document.documentElement.classList.contains("app-modus")) ersteSeite = "uebergabe";
  else if (!k.zugang.frei) {
    ersteSeite = "code";
    let ausLink = null;
    try {
      ausLink = new URL(location.href).searchParams.get(k.zugang.parameter);
    } catch (e) {
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
  }

  const teilPfad = (dict, pfad) => pfad.split(".").reduce((x, teil) => (x === undefined || x === null ? undefined : x[teil]), dict);

  function sucheHerkunft(pfad) {
    const w = teilPfad(k.dicts[k.sprache], pfad);
    if (w !== undefined || k.sprache === "de") return { w, fallback: false };
    const de = teilPfad(deTexte, pfad);
    return { w: de, fallback: de !== undefined };
  }
  const suche = (pfad) => sucheHerkunft(pfad).w;

  const istRtl = () => {
    const s = k.sprachen.find((x) => x.code === k.sprache);
    return !!s && s.dir === "rtl";
  };
  const alsErsatz = (text) =>
    istRtl()
      ? String(text)
          .split("\n")
          .map((zeile) => (zeile.trim() ? "\u2066" + zeile + "\u2069" : zeile))
          .join("\n")
      : text;

  k.richtung = () => (istRtl() ? "rtl" : "ltr");

  k.appModus = () => document.documentElement.classList.contains("app-modus");

  k.browserUrl = () => {
    try {
      const u = new URL(location.href);
      u.searchParams.delete("app");
      u.hash = "";
      return u.toString();
    } catch (e) {
      return location.href.split("#")[0].replace(/([?&])app=1(&|$)/, "$1").replace(/[?&]$/, "");
    }
  };

  k.datentext = (text) => alsErsatz(text);

  k.liste = (teile) => teile.filter((x) => x !== null && x !== undefined && x !== "").join(k.t("liste.trenner"));

  function variante(w) {
    if (w && typeof w === "object" && !Array.isArray(w) && ("kind" in w || "selbst" in w)) {
      return k.a.wer === "selbst" ? (w.selbst ?? w.kind) : (w.kind ?? w.selbst);
    }
    return w;
  }

  function standardWerte() {
    const vorname = sauber(k.a.vorname);
    const ersatz = variante(suche(k.a.wer === "selbst" ? "allgemein.diePerson" : "allgemein.dasKind"));
    return { name: vorname || ersatz || "", verein: konfig.verein.name, tel: konfig.verein.tel_geschaeftsstelle, mail: konfig.verein.mail };
  }

  k.hatT = (pfad) => suche(pfad) !== undefined;
  k.t = (pfad, werte) => {
    const { w, fallback } = sucheHerkunft(pfad);
    const wert = variante(w);
    if (wert === undefined) {
      console.warn("Anmeldung: Text fehlt: " + pfad);
      return pfad;
    }
    if (typeof wert !== "string") return wert;
    const text = ersetzePlatzhalter(wert, { ...standardWerte(), ...werte });
    return fallback ? alsErsatz(text) : text;
  };
  k.tl = (pfad) => {
    const { w, fallback } = sucheHerkunft(pfad);
    return Array.isArray(w) ? w.map((x) => (typeof x === "string" ? (fallback ? alsErsatz(ersetzePlatzhalter(x, standardWerte())) : ersetzePlatzhalter(x, standardWerte())) : x)) : [];
  };

  k.rt = (bereich, key, werte) => {
    if (key === null || key === undefined) return "";
    const eigen = k.regelDicts[k.sprache] && k.regelDicts[k.sprache][bereich];
    const de = k.regelDicts.de && k.regelDicts.de[bereich];
    let w = eigen ? eigen[key] : undefined;
    let fallback = false;
    if (w === undefined && de && k.sprache !== "de") {
      w = de[key];
      fallback = w !== undefined;
    } else if (w === undefined && de) w = de[key];
    if (w === undefined || w === null) return "";
    const eingesetzt = { ...standardWerte(), ...werte };
    const fasse = (t) => (fallback ? alsErsatz(t) : t);
    if (typeof w === "string") return fasse(ersetzePlatzhalter(w, eingesetzt));
    if (typeof w === "object") {
      const r = {};
      for (const [n, v] of Object.entries(w)) r[n] = typeof v === "string" ? fasse(ersetzePlatzhalter(v, eingesetzt)) : v;
      return r;
    }
    return "";
  };

  let memoE = { schluessel: null, wert: null };
  let memoListe = { schluessel: null, wert: ["start"] };
  const fingerabdruck = () => JSON.stringify(k.a);

  k.ergebnis = () => {
    const fa = fingerabdruck();
    if (memoE.schluessel !== fa) {
      let wert = null;
      try {
        wert = regeln.auswerten(kopiere(k.a), konfig, k.heute);
      } catch (e) {
        console.error("Anmeldung: Regelwerk (auswerten) meldet einen Fehler", e);
      }
      memoE = { schluessel: fa, wert };
    }
    return memoE.wert;
  };
  k.schrittListe = () => {
    const fa = fingerabdruck();
    if (memoListe.schluessel !== fa) {
      let wert = ["start"];
      k.regelFehler = false;
      try {
        const liste = regeln.schritte(kopiere(k.a), konfig, k.heute);
        if (Array.isArray(liste)) wert = liste.filter((id) => typeof id === "string");
      } catch (e) {
        k.regelFehler = true;
        console.error("Anmeldung: Regelwerk (schritte) meldet einen Fehler", e);
      }
      memoListe = { schluessel: fa, wert };
    }
    return memoListe.wert;
  };
  k.minderjaehrig = () => {
    try {
      const r = regeln.istMinderjaehrig(kopiere(k.a), k.heute);
      return typeof r === "boolean" ? r : null;
    } catch (e) {
      return null;
    }
  };

  k.hfvAmBildschirm = () => {
    try {
      return regeln.unterschriftHfv(konfig) === "bildschirm";
    } catch (e) {
      return false;
    }
  };
  k.name = () => standardWerte().name;

  k.unterlage = (u) => {
    const t = k.rt("unterlagen", u.textKey || u.id, u.werte || {});
    const text = t && typeof t === "object" ? t : {};
    const daten = konfig.anmeldung && konfig.anmeldung.unterlagen;
    const eintrag = Array.isArray(daten) ? daten.find((x) => x && x.id === u.id) : daten && daten[u.id];
    return { name: text.name || (eintrag && eintrag.titel) || u.id, kurz: text.kurz || "", warum: text.warum || "", wie: text.wie || "", wo: text.wo || "" };
  };
  k.quelleFuer = (bereich, id) => findeQuelle(konfig.anmeldung, bereich, id);
  k.beitragsText = (schluessel) => {
    const g = beitragsgruppen(k).find((x) => x.schluessel === schluessel);
    if (!g) return schluessel;
    return g.jahr !== null ? k.t("pruefen.werte.betragJahr", { gruppe: g.bezeichnung, jahr: g.jahr }) : g.bezeichnung;
  };
  k.formatDatum = (iso) => {
    const z = zerlegeIso(iso);
    if (!z) return String(iso || "");
    try {

      const ort = { en: "en-GB", ar: "ar-u-nu-latn" }[k.sprache] || k.sprache;
      return new Intl.DateTimeFormat(ort, { dateStyle: "long", timeZone: "UTC" }).format(new Date(Date.UTC(z.jahr, z.monat - 1, z.tag)));
    } catch (e) {
      return z.tag + "." + z.monat + "." + z.jahr;
    }
  };
  k.fotoDateiname = () => "Spielerfoto_" + dateiteil(k.a.nachname) + "_" + dateiteil(k.a.vorname) + ".jpg";

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
  k.nachRenderSofort = () => {
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
  k.strichSpeicher = (schluessel) => {
    if (!k.striche[schluessel]) k.striche[schluessel] = neuerSpeicher();
    return k.striche[schluessel];
  };

  const meldung = h("p", { klasse: "anm-meldung", role: "status" });
  const zurueckKnopf = h("button", { type: "button", klasse: "anm-zurueck", "data-aktion": "zurueck" });

  const seitenZurueck = h("a", { klasse: "anm-zurueck anm-zurueck--seite", "data-aktion": "zurueck-seite", hidden: true });
  const spracheEtikett = h("label", { klasse: "sr-only", for: "anm-sprache" });
  const spracheAuswahl = h("select", { id: "anm-sprache", klasse: "anm-sprache__auswahl", "data-aktion": "sprache" });
  const hilfeKnopf = h("button", { type: "button", klasse: "anm-hilfe", "data-aktion": "hilfe" });
  const kopf = h("header", { klasse: "anm-kopf" },
    zurueckKnopf,
    seitenZurueck,
    h("div", { klasse: "anm-kopf__werkzeuge" }, h("div", { klasse: "anm-sprache" }, spracheEtikett, spracheAuswahl), hilfeKnopf));
  const abschnittTitel = h("p", { klasse: "sr-only", id: "anm-abschnitte-titel" });
  const abschnittListe = h("ol", { klasse: "anm-abschnitte__liste" }, ABSCHNITTE.map((id) => h("li", { klasse: "anm-abschnitte__punkt", "data-abschnitt": id })));
  const abschnitte = h("nav", { klasse: "anm-abschnitte", "aria-labelledby": "anm-abschnitte-titel" }, abschnittTitel, abschnittListe);
  const uebersetzung = h("p", { klasse: "anm-uebersetzung", role: "note", hidden: true });
  const formular = h("form", { klasse: "anm-seite", novalidate: true });
  const fussText = h("p", { klasse: "anm-fuss__text" });
  const loeschenKnopf = h("button", { type: "button", klasse: "knopf knopf--sekundaer anm-fuss__loeschen", "data-aktion": "loeschen-alles" });
  const fuss = h("footer", { klasse: "anm-fuss" }, fussText, loeschenKnopf);
  const hilfeDialog = h("dialog", { klasse: "anm-dialog anm-dialog--hilfe", "aria-labelledby": "anm-hilfe-titel" });
  const loeschenDialog = h("dialog", { klasse: "anm-dialog anm-dialog--loeschen", "aria-labelledby": "anm-loeschen-titel" });
  wurzel.textContent = "";
  wurzel.append(kopf, abschnitte, uebersetzung, meldung, formular, fuss, hilfeDialog, loeschenDialog);
  wurzel.classList.add("anm--bereit");

  const seitenwurzel = wurzel.closest("main") || document.body;

  const sprachleiste = document.querySelector("[data-anm-sprachleiste]");
  const entwurfsband = document.querySelector("[data-anm-band]");

  const umgebungsKasten = document.querySelector("[data-anm-umgebungshinweis]");

  function fuelleSprachen() {
    spracheAuswahl.textContent = "";
    for (const s of k.sprachen) spracheAuswahl.append(h("option", { value: s.code, lang: s.code, dir: s.dir || "ltr" }, s.name));
    spracheAuswahl.value = k.sprache;
  }

  function zeigeSprachwahl() {
    if (!sprachleiste) return;
    for (const b of sprachleiste.querySelectorAll("[data-sprache]")) b.setAttribute("aria-pressed", String(b.getAttribute("data-sprache") === k.sprache));
  }
  if (sprachleiste) {
    sprachleiste.addEventListener("click", (e) => {
      const knopfEl = e.target.closest("[data-sprache]");
      if (knopfEl && sprachleiste.contains(knopfEl)) wechsleSprache(knopfEl.getAttribute("data-sprache"));
    });
  }

  function aktualisiereUmgebungshinweis() {
    if (!umgebungsKasten) return;
    const art = k.appModus() ? null : k.umgebung;
    const zeigen = !!art && (k.schritt === "code" || k.schritt === "start");
    umgebungsKasten.hidden = !zeigen;
    umgebungsKasten.textContent = "";
    if (!zeigen) {
      umgebungsKasten.removeAttribute("data-art");
      return;
    }
    const info = k.sprachen.find((x) => x.code === k.sprache) || {};
    umgebungsKasten.setAttribute("data-art", art);
    umgebungsKasten.setAttribute("lang", k.sprache);
    umgebungsKasten.setAttribute("dir", info.dir || "ltr");
    if (art === "inapp") {
      anhaengen(umgebungsKasten, [h("p", { "data-anm-umgebung": "text" }, k.t("umgebung.inApp")), h("p", { "data-anm-umgebung": "so" }, k.t("umgebung.inAppSo"))]);
    } else {
      anhaengen(umgebungsKasten, [
        h("p", { "data-anm-umgebung": "text" }, k.t("umgebung.rahmen"), " ", h("a", { href: k.browserUrl(), target: "_blank", rel: "noopener", "data-aktion": "neues-fenster" }, k.t("umgebung.rahmenLink"))),
      ]);
    }
  }

  function aktualisiereKopf() {
    aktualisiereUmgebungshinweis();

    const vorFragen = k.schritt === "code" || k.schritt === "uebergabe";

    seitenwurzel.classList.toggle("anm-kompakt", k.schritt !== "start" && k.schritt !== "fertig");

    seitenwurzel.classList.toggle("anm-ohne-sprachleiste", k.schritt !== "start" && !vorFragen);
    abschnitte.hidden = vorFragen;
    fuss.hidden = vorFragen;
    zeigeSprachwahl();
    zurueckKnopf.textContent = k.t("kopf.zurueck");
    zurueckKnopf.setAttribute("aria-label", k.t("kopf.zurueckLang"));
    zurueckKnopf.hidden = k.tiefe <= 0;

    const seitenZiel = (konfig.seiten && konfig.seiten.zurueck) || "";
    const mitSeitenZurueck = !!seitenZiel && k.schritt === "code" && !k.appModus();
    seitenZurueck.hidden = !mitSeitenZurueck;
    if (mitSeitenZurueck) {
      seitenZurueck.setAttribute("href", seitenZiel);
      seitenZurueck.textContent = k.t("code.zurueck");
    } else {
      seitenZurueck.removeAttribute("href");
      seitenZurueck.textContent = "";
    }
    hilfeKnopf.textContent = k.t("kopf.hilfe");
    spracheEtikett.textContent = k.t("kopf.sprache");
    spracheAuswahl.value = k.sprache;
    spracheAuswahl.parentElement.hidden = k.schritt === "start" || vorFragen;
    abschnittTitel.textContent = k.t("kopf.abschnitte");
    const aktuell = ABSCHNITT_VON[k.schritt];
    for (const li of abschnittListe.children) {
      const id = li.getAttribute("data-abschnitt");
      li.textContent = k.t("abschnitte." + id);
      if (id === aktuell) {
        li.setAttribute("aria-current", "step");
        li.append(h("span", { klasse: "sr-only" }, " (" + k.t("kopf.hierSindSie").replace(/:$/, "") + ")"));
      } else li.removeAttribute("aria-current");
    }
    fussText.textContent = k.t("fuss.privat");
    loeschenKnopf.textContent = k.t("fuss.loeschen");
    uebersetzung.hidden = k.sprache === "de";
    uebersetzung.textContent = k.sprache === "de" ? "" : k.t("sprache.uebersetzungshilfe");
  }

  function aktualisiereSeitentexte() {
    const info = k.sprachen.find((x) => x.code === k.sprache) || {};
    for (const el of document.querySelectorAll("[data-anm-t]")) {
      el.textContent = k.t(el.getAttribute("data-anm-t"));
      el.setAttribute("lang", k.sprache);
      el.setAttribute("dir", info.dir || "ltr");
    }

    if (entwurfsband) {
      entwurfsband.setAttribute("lang", k.sprache);
      entwurfsband.setAttribute("dir", info.dir || "ltr");
    }
    zeigeSprachwahl();
  }

  k.melde = (text) => {
    meldung.textContent = text || "";
  };

  let fehlerBox = null;

  function zeigeFehler(fehler, fokus) {
    zeigeFehlerAnFeldern(formular, fehler);
    if (!fehlerBox) return;
    fehlerBox.textContent = "";
    fehlerBox.hidden = !fehler.length;
    if (!fehler.length) return;
    fehlerBox.append(
      h("p", { klasse: "anm-fehlerbox__titel", id: "anm-fehlerbox-titel" }, fehler.length === 1 ? k.t("fehler.titelEins") : k.t("fehler.titelMehr", { anzahl: fehler.length })),
      h("ul", { klasse: "anm-fehlerbox__liste" }, fehler.map((f) => {

        const vorsatz = feldBezeichnung(formular, f.feld);
        const a = h("a", { href: "#" + (fokusZiel(formular, f.feld)?.id || "") }, vorsatz ? vorsatz + ": " + f.meldung : f.meldung);
        a.addEventListener("click", (e) => {
          e.preventDefault();
          const ziel = fokusZiel(formular, f.feld);
          if (ziel) {
            ziel.focus();
            ziel.scrollIntoView({ block: "center" });
          }
        });
        return h("li", {}, a);
      })));
    if (fokus) {
      fehlerBox.focus({ preventScroll: true });
      fehlerBox.scrollIntoView({ block: "start" });
    }
  }

  function pruefeNochmal() {
    const seite = SEITEN[k.schritt];
    if (!seite) return;
    const fehler = seite.pruefe(k, k.teil);
    zeigeFehler(fehler, false);
    if (!fehler.length) k.fehlerAktiv = false;
  }

  k.fehlerLoeschen = () => {
    zeigeFehler([], false);
    k.fehlerAktiv = false;
  };

  k.zugangFreigeben = (code) => {
    k.zugang.frei = true;
    try {
      const u = new URL(location.href);
      u.searchParams.set(k.zugang.parameter, code);
      history.replaceState(history.state, "", u.toString());
    } catch (e) {

    }
  };

  k.aenderung = () => {
    k.version++;
    k.dirty = true;
    k.gesichert = false;
    if (k.pdf.zustand === "fertig") k.pdf.veraltet = true;
    wendeBedingungenAn();
    if (k.fehlerAktiv) pruefeNochmal();
  };

  function erstesTeil(schrittId) {
    const seite = SEITEN[schrittId];
    const teile = seite ? seite.teile(k) : ["haupt"];
    return teile[0];
  }

  function zeigeSeite(schrittId, teil, optionen) {
    const o = optionen || {};
    const seite = SEITEN[schrittId];
    if (!seite) return;
    const teile = seite.teile(k);
    const t = teile.includes(teil) ? teil : teile[0];
    k.schritt = schrittId;
    k.teil = t;
    k.bedingungen = [];
    k.aktualisierer = [];
    k.nachListe = [];
    let ergebnis;
    try {
      ergebnis = seite.render(k, t);
    } catch (fehler) {
      console.error("Anmeldung: Seite " + schrittId + "/" + t + " ließ sich nicht bauen", fehler);
      ergebnis = { titel: k.t("kopf.hilfe"), inhalt: [h("div", { klasse: "hinweis hinweis--offen", role: "alert" }, h("p", {}, k.t("fehler.seite")))], ohneWeiter: true };
    }
    fehlerBox = h("div", { klasse: "anm-fehlerbox", role: "group", tabindex: "-1", "aria-labelledby": "anm-fehlerbox-titel", hidden: true });
    const titel = h("h2", { id: k.titelId, klasse: "anm-titel", tabindex: "-1" }, ergebnis.titel);
    const knoepfe = [];
    if (!seite.ohneWeiter && !ergebnis.ohneWeiter) {
      const text = ergebnis.weiterText || (k.rueckkehr ? k.t("nav.zurPruefung") : k.t("nav.weiter"));
      knoepfe.push(h("button", { type: "submit", klasse: "knopf anm-weiter", "data-aktion": "weiter" }, text));
    }

    const hinweisBereich = h("div", { klasse: "anm-block anm-regelhinweise", "aria-live": "polite" });
    if (schrittId !== "pruefen" && schrittId !== "fertig") {

      let letzte = null;
      k.aktualisierer.push(() => {
        const liste = regelHinweise(k, k.ergebnis(), schrittId + "/" + t);
        const signatur = liste.map((el) => el.textContent).join("\u0001");
        if (signatur === letzte) return;
        letzte = signatur;
        hinweisBereich.textContent = "";
        hinweisBereich.append(...liste);
        hinweisBereich.hidden = !liste.length;
      });
    } else hinweisBereich.hidden = true;
    formular.textContent = "";
    anhaengen(formular, [titel, fehlerBox, ergebnis.inhalt, hinweisBereich, knoepfe.length ? h("div", { klasse: "anm-navigation" }, ...knoepfe) : null, ergebnis.nach]);
    wurzel.setAttribute("data-schritt", schrittId);
    wurzel.setAttribute("data-teil", t);
    if (o.fokus !== false) vorfuehrungOffen(false);
    aktualisiereKopf();
    wendeBedingungenAn();
    k.nachRenderSofort();
    k.fehlerAktiv = false;
    if (o.fokus !== false) {
      titel.focus({ preventScroll: true });

      kopf.scrollIntoView({ block: "start" });
    }
  }

  function geheZu(schrittId, teil, optionen) {
    const o = optionen || {};
    if (!SEITEN[schrittId]) return;
    k.melde("");
    const t = teil || erstesTeil(schrittId);
    if (o.ersetzen) history.replaceState({ anm: SITZUNG, tiefe: k.tiefe, schritt: schrittId, teil: t }, "");
    else {
      k.tiefe += 1;
      history.pushState({ anm: SITZUNG, tiefe: k.tiefe, schritt: schrittId, teil: t }, "");
    }
    if (schrittId === "pruefen" || schrittId === "fertig" || schrittId === "start") k.rueckkehr = false;
    zeigeSeite(schrittId, t, { fokus: o.fokus });
  }

  function naechstesZiel() {

    if (k.schritt === "code") return { schritt: "start", teil: "haupt", ersetzen: true };
    const seite = SEITEN[k.schritt];
    const teile = seite.teile(k);
    const i = teile.indexOf(k.teil);
    if (i >= 0 && i < teile.length - 1) return { schritt: k.schritt, teil: teile[i + 1] };
    if (k.rueckkehr) return ersteOffeneSeite() || { schritt: "pruefen", teil: "haupt" };
    const liste = k.schrittListe();
    let idx = liste.indexOf(k.schritt);
    if (idx < 0) {

      const eigene = REIHENFOLGE.indexOf(k.schritt);
      idx = liste.reduce((best, id, n) => (REIHENFOLGE.indexOf(id) <= eigene ? n : best), 0);
    }
    for (let j = idx + 1; j < liste.length; j++) {
      if (SEITEN[liste[j]]) return { schritt: liste[j], teil: erstesTeil(liste[j]) };
    }
    return { schritt: "fertig", teil: "haupt" };
  }

  function ersteOffeneSeite() {
    for (const id of k.schrittListe()) {
      const seite = SEITEN[id];
      if (!seite || id === "start" || id === "pruefen" || id === "fertig") continue;
      for (const teil of seite.teile(k)) {
        if (seite.pruefe(k, teil).length) return { schritt: id, teil };
      }
    }
    return null;
  }

  let beschaeftigt = false;
  async function weiter() {
    if (beschaeftigt) return;
    beschaeftigt = true;
    try {
      const seite = SEITEN[k.schritt];
      if (seite.vorPruefung) await seite.vorPruefung(k, k.teil);
      const fehler = seite.pruefe(k, k.teil);
      zeigeFehler(fehler, true);
      if (fehler.length) {
        k.fehlerAktiv = true;
        wendeBedingungenAn();
        return;
      }
      k.fehlerAktiv = false;
      if (seite.beimVerlassen) seite.beimVerlassen(k, k.teil);
      k.version++;
      const ziel = naechstesZiel();
      if (k.regelFehler) {

        k.melde(k.t("fehler.seite"));
        return;
      }
      geheZu(ziel.schritt, ziel.teil, { ersetzen: ziel.ersetzen });
    } finally {
      beschaeftigt = false;
    }
  }

  k.geheZuAendern = (schritt, teil) => {
    k.rueckkehr = true;
    geheZu(schritt, teil);
  };

  formular.addEventListener("submit", (e) => {
    e.preventDefault();
    weiter();
  });

  zurueckKnopf.addEventListener("click", () => {
    if (k.tiefe > 0) history.back();
  });

  const kommtVonDerselbenHerkunft = () => {
    try {
      return history.length > 1 && !!document.referrer && new URL(document.referrer).origin === location.origin;
    } catch (e) {
      return false;
    }
  };
  seitenZurueck.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (!kommtVonDerselbenHerkunft()) return;
    e.preventDefault();
    history.back();
  });

  window.addEventListener("popstate", (e) => {
    const s = e.state;
    if (!s || s.anm !== SITZUNG || !SEITEN[s.schritt]) return;
    k.tiefe = s.tiefe;
    let schritt = s.schritt;
    const liste = k.schrittListe();
    if (!liste.includes(schritt) && schritt !== "fertig") {
      const eigene = REIHENFOLGE.indexOf(schritt);
      schritt = liste.filter((id) => SEITEN[id] && REIHENFOLGE.indexOf(id) <= eigene).pop() || "start";
    }
    k.rueckkehr = false;
    k.melde("");
    zeigeSeite(schritt, s.teil, {});
  });

  async function wechsleSprache(code) {
    const info = k.sprachen.find((s) => s.code === code);
    if (!info) return;
    k.melde("");
    if (k.dicts[code] === undefined) {
      try {
        k.dicts[code] = (await import(`./anmeldung-texte-${code}-oberflaeche.js`)).default;
      } catch (e) {
        k.dicts[code] = null;
      }
    }
    if (!k.dicts[code]) {

      k.a.sprache = k.sprache;
      k.melde(k.t("sprache.fehlt"));
      zeigeSeite(k.schritt, k.teil, { fokus: false });
      return;
    }
    let teilweise = false;
    if (k.regelDicts[code] === undefined) {
      try {
        k.regelDicts[code] = (await import(`./anmeldung-texte-${code}-regeln.js`)).default;
      } catch (e) {
        k.regelDicts[code] = null;
      }
    }
    if (!k.regelDicts[code]) teilweise = true;
    k.sprache = code;
    k.a.sprache = code;
    wurzel.setAttribute("lang", code);
    wurzel.setAttribute("dir", info.dir || "ltr");
    wurzel.setAttribute("data-sprache", code);
    aktualisiereSeitentexte();
    zeigeSeite(k.schritt, k.teil, { fokus: false });
    if (teilweise) k.melde(k.t("sprache.teilweise"));
    if (!hatEingaben()) k.dirty = false;
  }
  k.wechsleSprache = wechsleSprache;
  spracheAuswahl.addEventListener("change", () => wechsleSprache(spracheAuswahl.value));

  function oeffne(dialog) {
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function schliesse(dialog) {
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }

  k.zeigeHilfe = () => {
    hilfeDialog.textContent = "";
    const kontakte = k.tl("hilfe.kontakte").map((c) => {
      const zeile = [];

      if (c.tel) {
        const ziffern = c.tel.replace(/[^\d+]/g, "");
        const telAdresse = /^0[1-9]/.test(ziffern) ? "+49" + ziffern.slice(1) : ziffern;
        zeile.push(h("a", { klasse: "knopf", href: "tel:" + telAdresse }, k.t("hilfe.anrufen") + ":\u00a0", h("span", { klasse: "anm-tel", dir: "ltr" }, c.tel)));
      }
      if (c.mail) {

        const adresse = [];
        c.mail.split(/(?=[@.])/).forEach((stueck, i) => adresse.push(i ? h("wbr") : null, stueck));
        zeile.push(h("a", { klasse: "knopf knopf--sekundaer knopf--mail", href: "mailto:" + c.mail }, h("span", { klasse: "anm-knopf-name" }, k.t("hilfe.schreiben")), " ", h("span", { klasse: "anm-knopf-adresse", dir: "ltr" }, adresse)));
      }
      return h("li", { klasse: "anm-kontakt" }, h("p", { klasse: "anm-kontakt__name" }, h("strong", {}, k.t("hilfe." + c.schluessel)), " – ", k.t("hilfe." + c.schluessel + "Wofuer")), h("div", { klasse: "anm-knoepfe" }, zeile));
    });
    hilfeDialog.append(
      h("h2", { id: "anm-hilfe-titel", klasse: "anm-dialog__titel" }, k.t("hilfe.titel")),
      h("p", {}, k.t("hilfe.einleitung")),
      h("ul", { klasse: "anm-kontakte", role: "list" }, kontakte),
      h("p", {}, k.t("hilfe.uebersetzen")),
      h("div", { klasse: "anm-knoepfe" }, h("button", { type: "button", klasse: "knopf", "data-aktion": "hilfe-schliessen", autofocus: true, onclick: () => schliesse(hilfeDialog) }, k.t("allgemein.schliessen"))));
    oeffne(hilfeDialog);
  };
  hilfeKnopf.addEventListener("click", () => k.zeigeHilfe());

  k.frageLoeschen = () => {
    loeschenDialog.textContent = "";
    loeschenDialog.append(
      h("h2", { id: "anm-loeschen-titel", klasse: "anm-dialog__titel" }, k.t("loeschen.titel")),
      h("p", {}, k.t("loeschen.text")),
      h("div", { klasse: "anm-knoepfe" },
        h("button", { type: "button", klasse: "knopf", "data-aktion": "loeschen-ja", onclick: () => { schliesse(loeschenDialog); datenLoeschen(); } }, k.t("loeschen.ja")),
        h("button", { type: "button", klasse: "knopf knopf--sekundaer", "data-aktion": "loeschen-nein", autofocus: true, onclick: () => schliesse(loeschenDialog) }, k.t("loeschen.nein"))));
    oeffne(loeschenDialog);
  };
  loeschenKnopf.addEventListener("click", () => k.frageLoeschen());

  function leereAlles(behalten) {
    const alt = k.a;
    k.a = neueAntworten(k.sprache);
    for (const p of behalten || []) k.a[p] = kopiere(alt[p]);
    for (const v of k.vorschauen.values()) URL.revokeObjectURL(v.url);
    k.vorschauen.clear();
    k.bilder = { spielerfoto: null, nachweise: {}, unterschriften: {} };
    k.gezeigteHinweise = new Set();
    k.roh = {};
    k.striche = {};
    k.wartend.clear();
    k.pdf = { zustand: "leer", veraltet: false, ergebnis: null, datei: null, fehlerArt: null };
    k.version++;
    k.gesichert = false;
    k.dirty = false;
    k.rueckkehr = false;
    k.fehlerAktiv = false;
  }

  function datenLoeschen() {
    leereAlles();
    geheZu("start", "haupt", {});
    k.melde(k.t("loeschen.fertig"));
  }

  k.weiterePerson = () => {
    const behalten = ["anschrift", "email", "telefon", "mobil", "sorge", "andererElternteilEinverstanden", "sorgeberechtigte", "zahlung", "satzung", "unterschriftWeg", "hfvUnterschrift"];
    const wer = k.a.wer;
    leereAlles(behalten);
    k.a.wer = wer === "kind" ? "kind" : null;
    geheZu("wer", "haupt", {});
    k.melde(k.t("fertig.neuePerson"));
  };

  k.starteErstellen = (erzwingen) => {
    if (k.pdf.zustand === "arbeit") return;
    if (erzwingen) k.pdf.zustand = "leer";
    const beendet = erstelleDatei(k);
    if (erzwingen && k.schritt === "fertig") zeigeSeite("fertig", "haupt", {});
    beendet.then(() => {
      if (k.schritt === "fertig") zeigeSeite("fertig", "haupt", {});
    });
  };

  function ladeBeispiel(id) {
    const b = BEISPIELE.find((x) => x.id === id);
    if (!b) return;

    if (k.appModus()) return;
    if (!k.zugang.frei) {
      k.melde(k.t("demo.codeZuerst"));
      return;
    }
    leereAlles();
    mische(k.a, b.antworten(k.heute, konfig));
    k.a.sprache = k.sprache;
    k.version++;
    k.dirty = false;
    geheZu("start", "haupt", {});
    k.melde(k.t("demo.beispielGeladen", { titel: b.titel }));
  }

  const werkzeuge = document.querySelector("[data-anm-werkzeuge]");
  if (werkzeuge && window.matchMedia) werkzeuge.open = window.matchMedia("(min-width: 720px)").matches;

  for (const knopfEl of document.querySelectorAll("[data-beispiel]")) {
    knopfEl.addEventListener("click", () => ladeBeispiel(knopfEl.getAttribute("data-beispiel")));
  }

  const schalter = document.querySelector("[data-anm-vereinssicht]");
  if (schalter) {
    schalter.addEventListener("click", () => {
      const an = !wurzel.classList.contains("anm--verein");
      wurzel.classList.toggle("anm--verein", an);
      schalter.setAttribute("aria-pressed", String(an));
      schalter.textContent = k.t(an ? "demo.vereinssichtAus" : "demo.vereinssichtAn");
    });
  }

  const vorfuehrKnopf = document.querySelector("[data-anm-vorfuehrung]");
  function vorfuehrungOffen(auf) {
    seitenwurzel.classList.toggle("anm-vorfuehrung-offen", auf);
    if (auf && werkzeuge) werkzeuge.open = true;
    if (vorfuehrKnopf) vorfuehrKnopf.setAttribute("aria-expanded", String(auf));
  }
  if (vorfuehrKnopf) {
    vorfuehrKnopf.addEventListener("click", () => vorfuehrungOffen(!seitenwurzel.classList.contains("anm-vorfuehrung-offen")));
  }

  function hatInhalt() {
    const a = kopiere(k.a);
    a.sprache = null;
    const leer = neueAntworten("de");
    leer.sprache = null;
    return (
      JSON.stringify(a) !== JSON.stringify(leer) ||
      !!k.bilder.spielerfoto ||
      Object.values(k.bilder.nachweise).some((l) => l.length) ||
      Object.keys(k.bilder.unterschriften).length > 0
    );
  }
  function hatEingaben() {
    return k.dirty && hatInhalt();
  }
  window.addEventListener("beforeunload", (e) => {
    if (!hatEingaben() || k.gesichert) return;
    e.preventDefault();
    e.returnValue = "";
  });

  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  fuelleSprachen();
  aktualisiereSeitentexte();
  history.replaceState({ anm: SITZUNG, tiefe: 0, schritt: ersteSeite, teil: "haupt" }, "");
  zeigeSeite(ersteSeite, "haupt", { fokus: false });
  if (codeFehler) zeigeFehler(SEITEN.code.pruefe(k), false);
  wurzel.setAttribute("lang", "de");
  wurzel.setAttribute("dir", "ltr");
  wurzel.setAttribute("data-sprache", "de");
  wurzel.setAttribute("data-bereit", "");
}

starte();
