/*
  Anmelde-Assistent (Entwurf, 29.09.2026) – Einstieg.

  Führt eine Familie Schritt für Schritt durch die Anmeldung beim FFV
  Sportfreunde 04 und erzeugt am Ende ein PDF. Die Seite ist ein Entwurf zum
  Vorführen: Alles bleibt im Browser, nichts wird gesendet oder gespeichert
  (nichts im Speicher des Browsers, keine Cookies). Beim Schließen oder Neuladen sind die
  Angaben weg.

  Aufteilung
    regeln.js                       Seitenfolge und Ergebnis (Fälle, Unterlagen,
                                    Fristen …) – ohne DOM, Paket AP-1
    pdf.js                          PDF-Baustein, Paket AP-3 (geladen von pdf-lader.js)
    texte/<sprache>-oberflaeche.js  Texte der Oberfläche
    texte/<sprache>-regeln.js       Texte des Regelwerks
    seiten-*.js                     eine Seite je Schritt (27 Schritte, seiten.js)
    bausteine.js, unterschrift.js, bilder.js, hilfen.js, laender.js   Bausteine

  Ablauf
    - Die Seitenfolge kommt ausschließlich aus regeln.schritte(a, konfig, heute);
      "Weiter" geht zum nächsten Schritt der Liste (oder zur nächsten Teilseite
      des Schritts, wenn dieser mehrere Fragen stellt).
    - Jede Seite ist ein Eintrag im Verlauf des Browsers (history.pushState);
      "Zurück" und die Zurück-Taste des Browsers gehen eine Seite zurück.
    - Bei jedem Seitenwechsel bekommt die Überschrift den Fokus, und die Leiste
      mit Zurück, Sprache und Hilfe rückt oben ins Bild. Ab dem zweiten Schritt
      (nicht auf "start" und "fertig") ist der Seitenkopf kompakt (Klasse
      anm-kompakt am <main>, siehe anmeldung.css): So steht die Frage im ersten
      Bildschirm. Der Werkzeugkasten der Vorführung (Vereinssicht, Beispiele) fehlt
      dann; der Knopf "Vorführung" neben der Überschrift holt ihn zurück.
    - In der Fehlerliste steht vor jeder Meldung der Name des Feldes ("Vorname: …");
      am Feld selbst steht die Meldung allein.
    - "Ändern" auf der Prüfseite führt zur Seite; danach geht es zur
      nächsten unvollständigen Seite oder zurück zur Prüfung.
    - Am Ende erzeugt pdf-lader.js das PDF.
    - Die Sprachwahl steht nicht in einer Seite des Assistenten, sondern ganz oben im Seitenkopf
      (src/begleit/anmeldung.mjs, [data-anm-sprachleiste]): So ist sie im ersten Bildschirm zu sehen,
      vor dem deutschen Erklärtext. Nur der Startschritt zeigt sie (Klasse anm-ohne-sprachleiste am <main>).
    - App-Modus (Seite mit ?app=1, Klasse app-modus am <html>, vom Skript im Seitenkopf gesetzt): Der Assistent
      bleibt gleich; der Hinweis "Im Browser öffnen" steht oben auf dem Startschritt und auf der Fertig-Seite
      (k.appModus, k.browserUrl).
*/

import { zeigeFehlerAnFeldern, fokusZiel, feldBezeichnung, h, anhaengen } from "./bausteine.js";
import { kopiere, mische, sauber, heuteIso, ersetzePlatzhalter, dateiteil, zerlegeIso } from "./hilfen.js";
import { neueAntworten } from "./antworten.js";
import { BEISPIELE, beispielAntworten } from "./beispiele.js";
import { SEITEN, REIHENFOLGE, ABSCHNITTE, ABSCHNITT_VON } from "./seiten.js";
import { neuerSpeicher } from "./unterschrift.js";
import { regelHinweise, erstelleDatei } from "./seiten-ende.js";
import { beitragsgruppen } from "./seiten-verein.js";

// Kennung dieses Aufrufs. Einträge im Verlauf des Browsers aus einem früheren
// Aufruf gehören nicht mehr zu diesen Antworten und werden ignoriert.
const SITZUNG = Math.random().toString(36).slice(2);

function zeigeLadefehler(wurzel) {
  const text = wurzel.getAttribute("data-anm-ladefehler") || "";
  wurzel.textContent = "";
  wurzel.append(h("div", { klasse: "hinweis hinweis--offen", role: "alert" }, h("p", {}, text)));
}

// ---------- Quellen aus data/anmeldung.json (Vorführung für den Verein) ----------

function quelleText(q) {
  if (!q) return "";
  if (typeof q === "string") return q;
  if (Array.isArray(q)) return q.map(quelleText).filter(Boolean).join("; ");
  if (typeof q === "object") return [q.dokument || q.name || q.titel, q.stelle || q.paragraph, q.stand].filter(Boolean).join(", ");
  return "";
}

// Sucht im Bereich (zum Beispiel "unterlagen") einen Eintrag zur Kennung und
// gibt seine Quelle als Text zurück. Der Aufbau von data/anmeldung.json ist
// mit Listen und Objekten möglich; gesucht wird deshalb in beiden Formen.
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

// ---------- Start ----------

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
    [regeln, deDatei, deRegelnDatei] = await Promise.all([import("./regeln.js"), import("./texte/de-oberflaeche.js"), import("./texte/de-regeln.js")]);
  } catch (e) {
    console.error("Anmeldung: Modul nicht geladen", e);
    zeigeLadefehler(wurzel);
    return;
  }
  baue(wurzel, konfig, regeln, deDatei.default, deRegelnDatei.default);
}

function baue(wurzel, konfig, regeln, deTexte, deRegelTexte) {
  // ---------- Zustand und Kontext ----------
  const k = {
    konfig,
    regeln,
    heute: heuteIso(),
    sprachen: deTexte.sprachen,
    a: neueAntworten("de"),
    bilder: { spielerfoto: null, nachweise: {}, unterschriften: {} },
    roh: {},
    striche: {},
    wartend: new Set(),
    pdf: { zustand: "leer", veraltet: false, ergebnis: null, datei: null, fehlerArt: null },
    sprache: "de",
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

  // ---------- Texte ----------
  const teilPfad = (dict, pfad) => pfad.split(".").reduce((x, teil) => (x === undefined || x === null ? undefined : x[teil]), dict);

  // Sucht einen Text in der gewählten Sprache, sonst auf Deutsch. `fallback`
  // sagt, dass der deutsche Text einspringt.
  function sucheHerkunft(pfad) {
    const w = teilPfad(k.dicts[k.sprache], pfad);
    if (w !== undefined || k.sprache === "de") return { w, fallback: false };
    const de = teilPfad(deTexte, pfad);
    return { w: de, fallback: de !== undefined };
  }
  const suche = (pfad) => sucheHerkunft(pfad).w;

  // Deutscher Ersatztext in einer Sprache mit Schrift von rechts nach links:
  // in Unicode-Isolate gefasst, damit Satzzeichen und Wortfolge nicht durcheinandergeraten.
  // Jede Zeile bekommt ihr eigenes Paar, denn jede Zeile wird ein eigener Absatz.
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

  // Schreibrichtung der gewählten Sprache ("ltr" oder "rtl").
  k.richtung = () => (istRtl() ? "rtl" : "ltr");

  // App-Modus: Die Vereins-App öffnet die Seite mit ?app=1; ein Skript im Seitenkopf setzt die Klasse app-modus
  // am <html>, bevor etwas gezeichnet wird. Der Assistent bleibt gleich, nur ein Hinweis kommt dazu.
  k.appModus = () => document.documentElement.classList.contains("app-modus");
  // Dieselbe Seite ohne ?app=1: Dort klappt Speichern und Teilen der Datei im Browser.
  k.browserUrl = () => {
    try {
      const u = new URL(location.href);
      u.searchParams.delete("app");
      u.hash = "";
      return u.toString();
    } catch (e) {
      return "./";
    }
  };
  // Link "Im Browser öffnen" (neuer Tab, ohne Rückbezug auf die App).
  k.browserLink = () => h("a", { href: k.browserUrl(), target: "_blank", rel: "noopener", klasse: "anm-browserlink", "data-aktion": "im-browser-oeffnen" }, k.t("app.browser"));

  // Deutsche Angaben aus der Konfiguration (Namen der Beitragsgruppen und der
  // Karnevalsgruppen, Übungszeiten): in Sprachen von rechts nach links in Isolaten.
  k.datentext = (text) => alsErsatz(text);

  // Aufzählung mit dem Trenner der Sprache (liste.trenner: Deutsch ", ", Arabisch "، ").
  k.liste = (teile) => teile.filter((x) => x !== null && x !== undefined && x !== "").join(k.t("liste.trenner"));

  // Bei Texten mit den Schlüsseln kind und selbst gilt der zur Antwort "wer".
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
  // Texte des Regelwerks (texte/<sprache>-regeln.js): Text oder Objekt, sonst "".
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

  // ---------- Regelwerk ----------
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
  k.name = () => standardWerte().name;
  // Texte einer Unterlage: aus den Regeltexten der Sprache; fehlt der Name dort,
  // gilt der deutsche Titel aus data/anmeldung.json, zuletzt die Kennung.
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
      return new Intl.DateTimeFormat(k.sprache, { dateStyle: "long", timeZone: "UTC" }).format(new Date(Date.UTC(z.jahr, z.monat - 1, z.tag)));
    } catch (e) {
      return z.tag + "." + z.monat + "." + z.jahr;
    }
  };
  k.fotoDateiname = () => "Spielerfoto_" + dateiteil(k.a.nachname) + "_" + dateiteil(k.a.vorname) + ".jpg";

  // ---------- Kleine Dienste für die Seiten ----------
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

  // ---------- Rahmen ----------
  const meldung = h("p", { klasse: "anm-meldung", role: "status" });
  const zurueckKnopf = h("button", { type: "button", klasse: "anm-zurueck", "data-aktion": "zurueck" });
  const spracheEtikett = h("label", { klasse: "sr-only", for: "anm-sprache" });
  const spracheAuswahl = h("select", { id: "anm-sprache", klasse: "anm-sprache__auswahl", "data-aktion": "sprache" });
  const hilfeKnopf = h("button", { type: "button", klasse: "anm-hilfe", "data-aktion": "hilfe" });
  const kopf = h("header", { klasse: "anm-kopf" },
    zurueckKnopf,
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
  // Der Seitenkopf über dem Assistenten (h1, Lead, Entwurfs-Band, Werkzeuge) wird
  // kompakt, sobald die Fragen beginnen: Die Klasse sitzt am umgebenden <main>.
  const seitenwurzel = wurzel.closest("main") || document.body;
  // Sprachwahl im Seitenkopf (siehe oben) und Hinweis für die App
  const sprachleiste = document.querySelector("[data-anm-sprachleiste]");
  const appHinweis = document.querySelector("[data-anm-apphinweis]");
  const entwurfsband = document.querySelector("[data-anm-band]");

  function fuelleSprachen() {
    spracheAuswahl.textContent = "";
    for (const s of k.sprachen) spracheAuswahl.append(h("option", { value: s.code, lang: s.code, dir: s.dir || "ltr" }, s.name));
    spracheAuswahl.value = k.sprache;
  }

  // Knöpfe der Sprachleiste: gewählte Sprache markieren
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

  function aktualisiereKopf() {
    // Kompakter Seitenkopf bei allen Fragen; auf "start" und "fertig" steht er voll da.
    seitenwurzel.classList.toggle("anm-kompakt", k.schritt !== "start" && k.schritt !== "fertig");
    // Sprachwahl und App-Hinweis oben stehen nur auf dem Startschritt.
    seitenwurzel.classList.toggle("anm-ohne-sprachleiste", k.schritt !== "start");
    zeigeSprachwahl();
    zurueckKnopf.textContent = k.t("kopf.zurueck");
    zurueckKnopf.setAttribute("aria-label", k.t("kopf.zurueckLang"));
    zurueckKnopf.hidden = k.tiefe <= 0;
    hilfeKnopf.textContent = k.t("kopf.hilfe");
    spracheEtikett.textContent = k.t("kopf.sprache");
    spracheAuswahl.value = k.sprache;
    spracheAuswahl.parentElement.hidden = k.schritt === "start";
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

  // Elemente der umgebenden Seite mit data-anm-t="Schlüssel" folgen der Sprache.
  function aktualisiereSeitentexte() {
    const info = k.sprachen.find((x) => x.code === k.sprache) || {};
    for (const el of document.querySelectorAll("[data-anm-t]")) {
      el.textContent = k.t(el.getAttribute("data-anm-t"));
      el.setAttribute("lang", k.sprache);
      el.setAttribute("dir", info.dir || "ltr");
    }
    // Das Entwurfs-Band und der Hinweis für die App folgen der Sprache als Ganzes (Balken und Text auf der Seite, wo der
    // Text beginnt), nicht nur ihre Sätze.
    for (const kasten of [entwurfsband, appHinweis]) {
      if (!kasten) continue;
      kasten.setAttribute("lang", k.sprache);
      kasten.setAttribute("dir", info.dir || "ltr");
    }
    // Link "Im Browser öffnen": dieselbe Seite ohne ?app=1
    for (const a of document.querySelectorAll("[data-anm-browserlink]")) a.setAttribute("href", k.browserUrl());
    zeigeSprachwahl();
  }

  k.melde = (text) => {
    meldung.textContent = text || "";
  };

  // ---------- Fehler ----------
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
        // In der Liste steht der Name des Feldes vor der Meldung ("Vorname: …"): Gleiche Meldungen
        // (zum Beispiel zweimal "Bitte schreiben Sie den Namen …") lassen sich so unterscheiden.
        // Am Feld selbst bleibt die Meldung allein (zeigeFehlerAnFeldern).
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

  k.aenderung = () => {
    k.version++;
    k.dirty = true;
    k.gesichert = false;
    if (k.pdf.zustand === "fertig") k.pdf.veraltet = true;
    wendeBedingungenAn();
    if (k.fehlerAktiv) pruefeNochmal();
  };

  // ---------- Seiten zeigen ----------
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
    // Hinweise des Regelwerks zu diesem Schritt: ändern sich mit den Antworten.
    const hinweisBereich = h("div", { klasse: "anm-block anm-regelhinweise", "aria-live": "polite" });
    if (schrittId !== "pruefen" && schrittId !== "fertig") {
      // Nur neu bauen, wenn sich die Hinweise ändern – sonst läse ein Screenreader
      // bei jedem Tastendruck alles noch einmal vor.
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
    anhaengen(formular, [titel, fehlerBox, ergebnis.inhalt, hinweisBereich, knoepfe.length ? h("div", { klasse: "anm-navigation" }, ...knoepfe) : null]);
    wurzel.setAttribute("data-schritt", schrittId);
    wurzel.setAttribute("data-teil", t);
    if (o.fokus !== false) vorfuehrungOffen(false);
    aktualisiereKopf();
    wendeBedingungenAn();
    k.nachRenderSofort();
    k.fehlerAktiv = false;
    if (o.fokus !== false) {
      titel.focus({ preventScroll: true });
      // Bei jedem Seitenwechsel kommt die Leiste mit Zurück, Sprache und Hilfe nach
      // oben ins Bild; gleich darunter stehen die Abschnittsnamen und die Frage.
      kopf.scrollIntoView({ block: "start" });
    }
  }

  // Verlauf des Browsers: jede Seite ein Eintrag.
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

  // Nächste Seite nach der aktuellen: erst die weiteren Teilseiten des
  // Schritts, dann der nächste Schritt der Liste aus regeln.schritte().
  function naechstesZiel() {
    const seite = SEITEN[k.schritt];
    const teile = seite.teile(k);
    const i = teile.indexOf(k.teil);
    if (i >= 0 && i < teile.length - 1) return { schritt: k.schritt, teil: teile[i + 1] };
    if (k.rueckkehr) return ersteOffeneSeite() || { schritt: "pruefen", teil: "haupt" };
    const liste = k.schrittListe();
    let idx = liste.indexOf(k.schritt);
    if (idx < 0) {
      // Schritt ist aus der Liste gefallen: der letzte Schritt davor, der noch gilt.
      const eigene = REIHENFOLGE.indexOf(k.schritt);
      idx = liste.reduce((best, id, n) => (REIHENFOLGE.indexOf(id) <= eigene ? n : best), 0);
    }
    for (let j = idx + 1; j < liste.length; j++) {
      if (SEITEN[liste[j]]) return { schritt: liste[j], teil: erstesTeil(liste[j]) };
    }
    return { schritt: "fertig", teil: "haupt" };
  }

  // Erste Seite in der Liste, deren Prüfung Fehler meldet (nach einer Änderung
  // können neue Fragen entstanden sein).
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
        wendeBedingungenAn(); // Hinweise, die nur bis zur Fehlerliste gelten, ausblenden
        return;
      }
      k.fehlerAktiv = false;
      if (seite.beimVerlassen) seite.beimVerlassen(k, k.teil);
      k.version++;
      const ziel = naechstesZiel();
      if (k.regelFehler) {
        // Das Regelwerk ist ausgefallen: lieber ehrlich sagen als falsch weiterführen.
        k.melde(k.t("fehler.seite"));
        return;
      }
      geheZu(ziel.schritt, ziel.teil);
    } finally {
      beschaeftigt = false;
    }
  }

  // "Ändern" auf der Prüfseite.
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

  // ---------- Sprache ----------
  async function wechsleSprache(code) {
    const info = k.sprachen.find((s) => s.code === code);
    if (!info) return;
    k.melde("");
    if (k.dicts[code] === undefined) {
      try {
        k.dicts[code] = (await import(`./texte/${code}-oberflaeche.js`)).default;
      } catch (e) {
        k.dicts[code] = null;
      }
    }
    if (!k.dicts[code]) {
      // Datei fehlt: es bleibt bei der bisherigen Sprache.
      k.a.sprache = k.sprache;
      k.melde(k.t("sprache.fehlt"));
      zeigeSeite(k.schritt, k.teil, { fokus: false });
      return;
    }
    let teilweise = false;
    if (k.regelDicts[code] === undefined) {
      try {
        k.regelDicts[code] = (await import(`./texte/${code}-regeln.js`)).default;
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

  // ---------- Hilfe und Löschen ----------
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
      // Die Rufnummer ist ein eigener Block von links nach rechts, auch im arabischen Satz ("069 736868").
      if (c.tel) zeile.push(h("a", { klasse: "knopf", href: "tel:" + c.tel.replace(/\D/g, "") }, k.t("hilfe.anrufen") + ": ", h("span", { klasse: "anm-tel", dir: "ltr" }, c.tel)));
      if (c.mail) {
        // Zwei Zeilen im Knopf: die Aufgabe und darunter die Adresse (mit Umbruchstellen vor "@" und vor Punkten).
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

  // Setzt alle Antworten, Bilder und Unterschriften zurück. `behalten`: Felder
  // von a, die bleiben (zum Beispiel für die nächste Person der Familie).
  function leereAlles(behalten) {
    const alt = k.a;
    k.a = neueAntworten(k.sprache);
    for (const p of behalten || []) k.a[p] = kopiere(alt[p]);
    for (const v of k.vorschauen.values()) URL.revokeObjectURL(v.url);
    k.vorschauen.clear();
    k.bilder = { spielerfoto: null, nachweise: {}, unterschriften: {} };
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

  // ---------- Erstellen der Datei ----------
  k.starteErstellen = (erzwingen) => {
    if (k.pdf.zustand === "arbeit") return;
    if (erzwingen) k.pdf.zustand = "leer";
    const beendet = erstelleDatei(k);
    if (erzwingen && k.schritt === "fertig") zeigeSeite("fertig", "haupt", {});
    beendet.then(() => {
      if (k.schritt === "fertig") zeigeSeite("fertig", "haupt", {});
    });
  };

  // ---------- Beispiele und Vorführung ----------
  function ladeBeispiel(id) {
    const b = BEISPIELE.find((x) => x.id === id);
    if (!b) return;
    leereAlles();
    mische(k.a, b.antworten(k.heute, konfig));
    k.a.sprache = k.sprache;
    k.version++;
    k.dirty = false;
    geheZu("start", "haupt", {});
    k.melde(k.t("demo.beispielGeladen", { titel: b.titel }));
  }

  // Werkzeugkasten der Vorführung: auf breiten Bildschirmen offen, auf dem Handy zu.
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

  // Knopf "Vorführung" im kompakten Kopf: Ab dem zweiten Schritt ist der Werkzeugkasten weg, damit die
  // Frage gleich oben steht. Der Knopf holt ihn zurück (Vereinssicht, Beispiele) und schließt ihn wieder.
  // Mit dem nächsten Seitenwechsel klappt er von selbst zu; die Vereinssicht bleibt, bis man sie ausschaltet.
  // Der Knopf ist Teil der Vorführung: deutsch, Texte unter "demo" (de-oberflaeche.js).
  const vorfuehrKnopf = document.querySelector("[data-anm-vorfuehrung]");
  function vorfuehrungOffen(auf) {
    seitenwurzel.classList.toggle("anm-vorfuehrung-offen", auf);
    if (auf && werkzeuge) werkzeuge.open = true;
    if (vorfuehrKnopf) vorfuehrKnopf.setAttribute("aria-expanded", String(auf));
  }
  if (vorfuehrKnopf) {
    vorfuehrKnopf.addEventListener("click", () => vorfuehrungOffen(!seitenwurzel.classList.contains("anm-vorfuehrung-offen")));
  }

  // ---------- Verlassen ----------
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

  // ---------- Los ----------
  // Nach "Zurück" holt der Browser sonst die alte Bildlaufposition; die Seite
  // scrollt selbst (siehe zeigeSeite).
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  fuelleSprachen();
  aktualisiereSeitentexte();
  history.replaceState({ anm: SITZUNG, tiefe: 0, schritt: "start", teil: "haupt" }, "");
  zeigeSeite("start", "haupt", { fokus: false });
  wurzel.setAttribute("lang", "de");
  wurzel.setAttribute("dir", "ltr");
  wurzel.setAttribute("data-sprache", "de");
  wurzel.setAttribute("data-bereit", "");
}

starte();
