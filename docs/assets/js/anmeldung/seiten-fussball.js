/*
  Seiten des Assistenten zu Fußball und Karneval: abteilung, mannschaft,
  spielen, spielerpass, alter_verein, abmeldung, besonderes, karneval
  (SCHNITTSTELLEN Abschnitt 4). Aufbau der Seiten: siehe seiten-person.js.
*/

import { h, absaetze, textfeld, kartenAuswahl, kaestchen, datumFelder, pruefeDatumsfeld, landAuswahl, hinweisKasten, lateinFehler } from "./bausteine.js";
import { sauber, normalisiereUhrzeit } from "./hilfen.js";

function leer(x) {
  return x === null || x === undefined || x === "";
}

function fehlerWenn(bedingung, feld, meldung) {
  return bedingung ? [{ feld, meldung }] : [];
}

const JANEIN = (k) => [
  { wert: "ja", label: k.t("allgemein.ja") },
  { wert: "nein", label: k.t("allgemein.nein") },
];

const JANEINWEISS = (k) => [
  { wert: "ja", label: k.t("allgemein.ja") },
  { wert: "nein", label: k.t("allgemein.nein") },
  { wert: "weiss_nicht", label: k.t("allgemein.weissNicht") },
];

// ---------- abteilung ----------

export const abteilung = {
  id: "abteilung",
  teile: () => ["haupt"],
  render(k) {
    const opt = (wert) => ({ wert, label: k.t("abteilung." + wert), hinweis: k.t("abteilung." + wert + "Hinweis") });
    return {
      titel: k.t("abteilung.titel"),
      inhalt: [kartenAuswahl(k, { pfad: "abteilung", optionen: ["fussball", "karneval", "beides", "passiv"].map(opt) })],
    };
  },
  pruefe: (k) => fehlerWenn(!k.a.abteilung, "abteilung", k.t("fehler.abteilung")),
  beimVerlassen(k) {
    // Doppelmitgliedschaft folgt aus der Abteilung (SCHNITTSTELLEN Abschnitt 3).
    if (!k.a.beitrag || typeof k.a.beitrag !== "object") k.a.beitrag = { gruppe: null, familie: [], senator: false, doppel: false };
    k.a.beitrag.doppel = k.a.abteilung === "beides";
  },
};

// ---------- mannschaft (nur Information) ----------

export const mannschaft = {
  id: "mannschaft",
  teile: () => ["haupt"],
  render(k) {
    const e = k.ergebnis();
    const zeilen = [];
    if (e && e.alter !== null && e.alter !== undefined) {
      zeilen.push(k.t("mannschaft.alter", { alter: e.alter, jahrgang: e.jahrgang }));
      if (e.altersklasse === "Herren") zeilen.push(k.t("mannschaft.klasseHerren"));
      else if (e.altersklasse) zeilen.push(k.t("mannschaft.klasse", { klasse: e.altersklasse }));
    }
    const m = e && e.mannschaft;
    // Der Text des Regelwerks sagt, welche Mannschaft passt; fehlt er, stehen
    // hier die Namen aus dem Ergebnis.
    const regelText = m && m.hinweisKey ? k.rt("mannschaft", m.hinweisKey, { ...(m.werte || {}), name: k.name() }) : "";
    if (!regelText) {
      if (m && m.vorhanden && m.namen && m.namen.length) zeilen.push(k.t("mannschaft.mannschaften", { namen: k.datentext(k.liste(m.namen)) }));
      else if (m && m.vorhanden === false) zeilen.push(k.t("mannschaft.keine"), k.t("mannschaft.keineFolge"));
      else if (!m) zeilen.push(k.t("mannschaft.unbekannt"));
    }
    return {
      titel: k.t("mannschaft.titel"),
      inhalt: [
        ...zeilen.map((z) => h("p", { klasse: "anm-text anm-text--gross" }, z)),
        regelText ? hinweisKasten("info", k.t("pruefen.hinweisArt.info"), absaetze(regelText)) : null,
      ],
    };
  },
  pruefe: () => [],
};

// ---------- spielen ----------

export const spielen = {
  id: "spielen",
  teile: () => ["haupt"],
  render(k) {
    return {
      titel: k.t("spielen.titel"),
      inhalt: [
        ...absaetze(k.t("spielen.erklaerung"), "anm-hinweis"),
        kartenAuswahl(k, {
          pfad: "spielen",
          optionen: [
            { wert: true, label: k.t("spielen.ja"), hinweis: k.t("spielen.jaHinweis") },
            { wert: false, label: k.t("spielen.nein"), hinweis: k.t("spielen.neinHinweis") },
          ],
        }),
      ],
    };
  },
  pruefe: (k) => fehlerWenn(typeof k.a.spielen !== "boolean", "spielen", k.t("fehler.spielen")),
};

// ---------- spielerpass ----------

export const spielerpass = {
  id: "spielerpass",
  teile: () => ["haupt"],
  render(k) {
    return {
      titel: k.t("spielerpass.titel"),
      inhalt: [
        h("p", { klasse: "anm-hinweis" }, k.t("spielerpass.hinweis")),
        h("p", { klasse: "anm-hinweis" }, k.t("spielerpass.erklaerung")),
        kartenAuswahl(k, {
          pfad: "spielerpass",
          optionen: [
            { wert: "ja", label: k.t("allgemein.ja") },
            { wert: "nein", label: k.t("allgemein.nein") },
            { wert: "weiss_nicht", label: k.t("allgemein.weissNicht"), hinweis: k.t("spielerpass.weissNichtHinweis") },
          ],
        }),
      ],
    };
  },
  pruefe: (k) => fehlerWenn(!k.a.spielerpass, "spielerpass", k.t("fehler.spielerpass")),
};

// ---------- alter_verein ----------

export const alter_verein = {
  id: "alter_verein",
  teile: () => ["haupt"],
  render(k) {
    if (!k.a.alterVerein || typeof k.a.alterVerein !== "object") k.a.alterVerein = { region: null, name: "", ort: "", land: null, verband: "" };
    const region = kartenAuswahl(k, {
      pfad: "alterVerein.region",
      feld: "alterVerein.region",
      legende: k.t("alterVerein.region"),
      optionen: ["hessen", "bundesland", "ausland"].map((w) => ({ wert: w, label: k.t("alterVerein." + w) })),
    });
    const land = h("div", { klasse: "anm-block" }, landAuswahl(k, { pfad: "alterVerein.land", label: k.t("alterVerein.land") }));
    k.bedingt(land, () => k.a.alterVerein.region === "ausland");
    const verband = h("div", { klasse: "anm-block" },
      textfeld(k, { pfad: "alterVerein.verband", label: k.t("alterVerein.verband"), hinweis: k.t("alterVerein.verbandHinweis"), freiwillig: true, maxlength: 60 }));
    k.bedingt(verband, () => ["bundesland", "ausland"].includes(k.a.alterVerein.region));
    return {
      titel: k.t("alterVerein.titel"),
      inhalt: [
        region,
        textfeld(k, { pfad: "alterVerein.name", label: k.t("alterVerein.name"), maxlength: 60 }),
        textfeld(k, { pfad: "alterVerein.ort", label: k.t("alterVerein.ort"), maxlength: 50 }),
        land,
        verband,
      ],
    };
  },
  pruefe(k) {
    const v = k.a.alterVerein || {};
    return [
      ...fehlerWenn(!v.region, "alterVerein.region", k.t("fehler.region")),
      ...fehlerWenn(!sauber(v.name), "alterVerein.name", k.t("fehler.vereinsname")),
      ...lateinFehler(k, v.name, "alterVerein.name", "verein"),
      ...fehlerWenn(!sauber(v.ort), "alterVerein.ort", k.t("fehler.vereinsort")),
      ...lateinFehler(k, v.ort, "alterVerein.ort", "verein"),
      ...fehlerWenn(v.region === "ausland" && leer(v.land), "alterVerein.land", k.t("fehler.vereinsland")),
      // Der Verband wird nur gefragt, wenn der alte Verein nicht in Hessen war.
      ...(["bundesland", "ausland"].includes(v.region) ? lateinFehler(k, v.verband, "alterVerein.verband", "verein") : []),
    ];
  },
  beimVerlassen(k) {
    const v = k.a.alterVerein;
    if (v.region === "hessen" || v.region === "bundesland") v.land = "DE";
    if (v.region === "hessen" || !v.region) v.verband = "";
  },
};

// ---------- abmeldung ----------

function holeAbmeldung(k) {
  if (!k.a.abmeldung || typeof k.a.abmeldung !== "object") k.a.abmeldung = { status: null, datum: null, weg: null };
  return k.a.abmeldung;
}

export const abmeldung = {
  id: "abmeldung",
  teile(k) {
    const status = (k.a.abmeldung || {}).status;
    const t = ["status"];
    if (status === "einschreiben") t.push("datum");
    if (["formlos", "noch_nicht", "weiss_nicht"].includes(status)) t.push("weg");
    t.push("mitgliedschaft");
    // Die Anschrift des alten Vereins braucht nur der Abmelde-Vordruck des Verbands.
    const e = k.ergebnis();
    if (e && Array.isArray(e.formulare) && e.formulare.includes("abmeldung")) t.push("anschrift");
    t.push("spiele", "sperre", "freigabe", "wechsel");
    return t;
  },
  render(k, teil) {
    holeAbmeldung(k);
    if (!k.a.alterVerein || typeof k.a.alterVerein !== "object") k.a.alterVerein = { region: null, name: "", ort: "", land: null, verband: "" };
    if (teil === "status") {
      const opt = (wert, hinweis) => ({ wert, label: k.t("abmeldung.status." + wert), hinweis: hinweis ? k.t("abmeldung.status." + wert + "Hinweis") : null });
      return {
        titel: k.t("abmeldung.status.titel"),
        inhalt: [
          ...absaetze(k.t("abmeldung.status.hinweis"), "anm-hinweis"),
          kartenAuswahl(k, { pfad: "abmeldung.status", optionen: [opt("einschreiben", true), opt("formlos", true), opt("noch_nicht"), opt("weiss_nicht")] }),
        ],
      };
    }
    if (teil === "datum") {
      return {
        titel: k.t("abmeldung.datum.titel"),
        inhalt: [datumFelder(k, { pfad: "abmeldung.datum", legende: k.t("abmeldung.datum.legende"), hinweis: k.t("abmeldung.datum.hinweis") })],
      };
    }
    if (teil === "weg") {
      return {
        titel: k.t("abmeldung.weg.titel"),
        inhalt: [
          kartenAuswahl(k, {
            pfad: "abmeldung.weg",
            optionen: [
              { wert: "vollmacht", label: k.t("abmeldung.weg.vollmacht"), hinweis: k.t("abmeldung.weg.vollmachtHinweis") },
              { wert: "einschreiben", label: k.t("abmeldung.weg.einschreiben"), hinweis: k.t("abmeldung.weg.einschreibenHinweis") },
            ],
          }),
        ],
      };
    }
    if (teil === "mitgliedschaft") {
      return {
        titel: k.t("abmeldung.mitgliedschaft.titel"),
        inhalt: [
          ...absaetze(k.t("abmeldung.mitgliedschaft.hinweis"), "anm-hinweis"),
          kartenAuswahl(k, {
            pfad: "alterVerein.mitgliedschaft",
            optionen: [
              { wert: "kuendigen", label: k.t("abmeldung.mitgliedschaft.kuendigen"), hinweis: k.t("abmeldung.mitgliedschaft.kuendigenHinweis") },
              { wert: "passiv", label: k.t("abmeldung.mitgliedschaft.passiv"), hinweis: k.t("abmeldung.mitgliedschaft.passivHinweis") },
              { wert: "weiss_nicht", label: k.t("abmeldung.mitgliedschaft.weiss_nicht") },
            ],
          }),
        ],
      };
    }
    if (teil === "anschrift") {
      return {
        titel: k.t("abmeldung.anschrift.titel"),
        inhalt: [
          ...absaetze(k.t("abmeldung.anschrift.hinweis"), "anm-hinweis"),
          textfeld(k, { pfad: "alterVerein.empfaenger", label: k.t("abmeldung.anschrift.empfaenger"), hinweis: k.t("abmeldung.anschrift.empfaengerHinweis"), freiwillig: true, maxlength: 60 }),
          textfeld(k, { pfad: "alterVerein.strasse", label: k.t("abmeldung.anschrift.strasse"), freiwillig: true, maxlength: 60 }),
          textfeld(k, { pfad: "alterVerein.plzOrt", label: k.t("abmeldung.anschrift.plzOrt"), freiwillig: true, maxlength: 40 }),
        ],
      };
    }
    if (teil === "spiele") {
      return {
        titel: k.t("abmeldung.spiele.titel"),
        inhalt: [
          h("p", { klasse: "anm-hinweis" }, k.t("abmeldung.spiele.hinweis")),
          datumFelder(k, { pfad: "letztesSpiel", legende: k.t("abmeldung.spiele.letztes"), freiwillig: true }),
          datumFelder(k, { pfad: "letztesPflichtspiel", legende: k.t("abmeldung.spiele.pflicht"), hinweis: k.t("abmeldung.spiele.pflichtHinweis"), freiwillig: true }),
        ],
      };
    }
    if (teil === "sperre") {
      const bis = h("div", { klasse: "anm-block" },
        datumFelder(k, { pfad: "sperreBis", legende: k.t("abmeldung.sperre.bis"), hinweis: k.t("abmeldung.sperre.bisHinweis"), freiwillig: true, zukunftErlaubt: true }));
      k.bedingt(bis, () => k.a.sperre === "ja");
      return {
        titel: k.t("abmeldung.sperre.titel"),
        inhalt: [h("p", { klasse: "anm-hinweis" }, k.t("abmeldung.sperre.hinweis")), kartenAuswahl(k, { pfad: "sperre", optionen: JANEINWEISS(k) }), bis],
      };
    }
    if (teil === "freigabe") {
      return {
        titel: k.t("abmeldung.freigabe.titel"),
        inhalt: [
          h("p", { klasse: "anm-hinweis" }, k.t("abmeldung.freigabe.hinweis")),
          kartenAuswahl(k, {
            pfad: "freigabe",
            optionen: [
              { wert: "ja", label: k.t("allgemein.ja"), hinweis: k.t("abmeldung.freigabe.jaHinweis") },
              { wert: "nein", label: k.t("allgemein.nein") },
              { wert: "weiss_nicht", label: k.t("allgemein.weissNicht") },
            ],
          }),
        ],
      };
    }
    return {
      titel: k.t("abmeldung.wechsel.titel"),
      inhalt: [h("p", { klasse: "anm-hinweis" }, k.t("abmeldung.wechsel.hinweis")), kartenAuswahl(k, { pfad: "wechselLetzte6Monate", optionen: JANEIN(k) })],
    };
  },
  pruefe(k, teil) {
    const ab = holeAbmeldung(k);
    if (teil === "status") return fehlerWenn(!ab.status, "abmeldung.status", k.t("fehler.abmeldung"));
    if (teil === "datum") {
      const m = pruefeDatumsfeld(k, "abmeldung.datum");
      if (m) return [{ feld: "abmeldung.datum", meldung: m }];
      return fehlerWenn(!ab.datum, "abmeldung.datum", k.t("fehler.datumLeer"));
    }
    if (teil === "weg") return fehlerWenn(!ab.weg, "abmeldung.weg", k.t("fehler.abmeldeweg"));
    if (teil === "mitgliedschaft") return fehlerWenn(!(k.a.alterVerein || {}).mitgliedschaft, "alterVerein.mitgliedschaft", k.t("fehler.mitgliedschaft"));
    if (teil === "anschrift") {
      // Alles freiwillig, aber was drinsteht, kommt ins PDF.
      const v = k.a.alterVerein || {};
      return [
        ...lateinFehler(k, v.empfaenger, "alterVerein.empfaenger", "anschrift"),
        ...lateinFehler(k, v.strasse, "alterVerein.strasse", "anschrift"),
        ...lateinFehler(k, v.plzOrt, "alterVerein.plzOrt", "anschrift"),
      ];
    }
    if (teil === "spiele") {
      const f = [];
      for (const pfad of ["letztesSpiel", "letztesPflichtspiel"]) {
        const m = pruefeDatumsfeld(k, pfad, { pflicht: false });
        if (m) f.push({ feld: pfad, meldung: m });
      }
      return f;
    }
    if (teil === "sperre") {
      const f = fehlerWenn(!k.a.sperre, "sperre", k.t("fehler.sperre"));
      if (k.a.sperre === "ja") {
        const m = pruefeDatumsfeld(k, "sperreBis", { pflicht: false, zukunftErlaubt: true });
        if (m) f.push({ feld: "sperreBis", meldung: m });
      }
      return f;
    }
    if (teil === "freigabe") return fehlerWenn(!k.a.freigabe, "freigabe", k.t("fehler.freigabe"));
    return fehlerWenn(!k.a.wechselLetzte6Monate, "wechselLetzte6Monate", k.t("fehler.wechsel"));
  },
  beimVerlassen(k, teil) {
    const ab = holeAbmeldung(k);
    if (teil === "status") {
      if (ab.status !== "einschreiben") ab.datum = null;
      if (ab.status === "einschreiben") ab.weg = "einschreiben";
      else if (ab.weg === "einschreiben" && ab.status !== "formlos" && ab.status !== "noch_nicht" && ab.status !== "weiss_nicht") ab.weg = null;
    }
    if (teil === "sperre" && k.a.sperre !== "ja") k.a.sperreBis = null;
  },
};

// ---------- besonderes ----------

export const besonderes = {
  id: "besonderes",
  teile: () => ["haupt"],
  render(k) {
    if (!k.a.besonderes || typeof k.a.besonderes !== "object") k.a.besonderes = {};
    const e = k.ergebnis() || {};
    // Welche Kästchen es gibt, nennt das Regelwerk (e.besonderesOptionen);
    // fehlt die Angabe, gibt es alle vier.
    const alle = ["maedchenJungenteam", "herrenAushilfe", "sonderspielrecht", "frauHerren"];
    const gewaehlt = Array.isArray(e.besonderesOptionen) ? alle.filter((x) => e.besonderesOptionen.includes(x)) : alle;
    const text = { maedchenJungenteam: "maedchen", herrenAushilfe: "herrenAushilfe", sonderspielrecht: "sonderspielrecht", frauHerren: "frauHerren" };
    return {
      titel: k.t("besonderes.titel"),
      inhalt: [
        h("p", { klasse: "anm-hinweis" }, k.t("besonderes.hinweis")),
        h("fieldset", { klasse: "anm-gruppe", role: "group" },
          h("legend", { klasse: "anm-legende" }, k.t("besonderes.legende")),
          h("div", { klasse: "anm-karten" }, gewaehlt.map((schluessel) =>
            kaestchen(k, { pfad: "besonderes." + schluessel, label: k.t("besonderes." + text[schluessel]), hinweis: k.t("besonderes." + text[schluessel] + "Hinweis") })))),
      ],
    };
  },
  pruefe: () => [],
  beimVerlassen(k) {
    for (const s of ["maedchenJungenteam", "herrenAushilfe", "sonderspielrecht", "frauHerren"]) k.a.besonderes[s] = k.a.besonderes[s] === true;
  },
};

// ---------- karneval ----------

// Antworten zum Karneval mit allen Feldern (SCHNITTSTELLEN Abschnitt 3). Die
// drei letzten sind freiwillig und gelten nur für Minderjährige, die abends
// ohne Eltern auftreten dürfen (abendOhneEltern = "ja"). Antwortet die Familie
// bei "allein nach Hause" mit "Ja", ist die Uhrzeit (alleinAb) Pflicht.
function karnevalDaten(k) {
  const leerDaten = { gruppe: null, tanztWoanders: null, turnier: null, abendOhneEltern: null, abholung: "", alleinNachHause: null, alleinAb: "" };
  if (!k.a.karneval || typeof k.a.karneval !== "object") k.a.karneval = { ...leerDaten };
  for (const [feld, wert] of Object.entries(leerDaten)) if (!(feld in k.a.karneval)) k.a.karneval[feld] = wert;
  return k.a.karneval;
}

export const karneval = {
  id: "karneval",
  teile(k) {
    const t = ["gruppe", "woanders", "turnier"];
    if (k.minderjaehrig()) {
      t.push("abend");
      // Zwei freiwillige Fragen, je eine Seite, nur nach "Ja" bei den Abendauftritten.
      if (karnevalDaten(k).abendOhneEltern === "ja") t.push("abholung", "allein");
    }
    return t;
  },
  render(k, teil) {
    const kv = karnevalDaten(k);
    if (teil === "gruppe") {
      const e = k.ergebnis() || {};
      const vorschlag = e.karneval && Array.isArray(e.karneval.gruppenVorschlag) ? e.karneval.gruppenVorschlag : [];
      const gruppen = (k.konfig.karnevalGruppen || []).map((g) => ({
        wert: g.name,
        label: k.datentext(g.name),
        hinweis: [g.uebungszeit ? k.t("karneval.gruppe.uebung", { zeit: k.datentext(g.uebungszeit) }) : "", vorschlag.includes(g.name) ? k.t("karneval.gruppe.passt") : ""].filter(Boolean).join(" · ") || null,
      }));
      gruppen.push({ wert: "weiss_nicht", label: k.t("karneval.gruppe.weissNicht"), hinweis: k.t("karneval.gruppe.weissNichtHinweis") });
      return { titel: k.t("karneval.gruppe.titel"), inhalt: [kartenAuswahl(k, { pfad: "karneval.gruppe", optionen: gruppen })] };
    }
    if (teil === "woanders") return { titel: k.t("karneval.woanders.titel"), inhalt: [kartenAuswahl(k, { pfad: "karneval.tanztWoanders", optionen: JANEIN(k) })] };
    if (teil === "turnier") {
      return {
        titel: k.t("karneval.turnier.titel"),
        inhalt: [h("p", { klasse: "anm-hinweis" }, k.t("karneval.turnier.hinweis")), kartenAuswahl(k, { pfad: "karneval.turnier", optionen: JANEINWEISS(k) })],
      };
    }
    if (teil === "abholung") {
      return {
        titel: k.t("karneval.abholung.titel"),
        inhalt: [
          ...absaetze(k.t("karneval.abholung.hinweis"), "anm-hinweis"),
          textfeld(k, { pfad: "karneval.abholung", label: k.t("karneval.abholung.name"), hinweis: k.t("karneval.abholung.nameHinweis"), maxlength: 80, pflicht: false }),
        ],
      };
    }
    if (teil === "allein") {
      const ab = h("div", { klasse: "anm-block" },
        textfeld(k, {
          pfad: "karneval.alleinAb",
          label: k.t("karneval.allein.ab"),
          hinweis: k.t("karneval.allein.abHinweis"),
          inputmode: "numeric",
          maxlength: 10,
          ltr: true,
          beimVerlassen: (v) => normalisiereUhrzeit(v) || sauber(v),
        }));
      k.bedingt(ab, () => kv.alleinNachHause === "ja");
      return {
        titel: k.t("karneval.allein.titel"),
        inhalt: [
          ...absaetze(k.t("karneval.allein.hinweis"), "anm-hinweis"),
          kartenAuswahl(k, { pfad: "karneval.alleinNachHause", freiwillig: true, optionen: JANEIN(k) }),
          ab,
        ],
      };
    }
    return {
      titel: k.t("karneval.abend.titel"),
      inhalt: [...absaetze(k.t("karneval.abend.hinweis"), "anm-hinweis"), kartenAuswahl(k, { pfad: "karneval.abendOhneEltern", optionen: JANEIN(k) })],
    };
  },
  pruefe(k, teil) {
    const kv = karnevalDaten(k);
    if (teil === "gruppe") return fehlerWenn(leer(kv.gruppe), "karneval.gruppe", k.t("fehler.wahl"));
    if (teil === "woanders") return fehlerWenn(leer(kv.tanztWoanders), "karneval.tanztWoanders", k.t("fehler.wahl"));
    if (teil === "turnier") return fehlerWenn(leer(kv.turnier), "karneval.turnier", k.t("fehler.wahl"));
    // Freiwillig: leer ist erlaubt; was dasteht, muss aber passen.
    if (teil === "abholung") return lateinFehler(k, kv.abholung, "karneval.abholung");
    // Die Frage ist freiwillig: "Nein" und keine Antwort gehen. Bei "Ja" gehört die Uhrzeit dazu (Pflicht):
    // Ohne gültige Uhrzeit stünde auf der Erlaubnis im PDF nur "–", und die Erlaubnis wäre unvollständig.
    // Dieselbe Meldung für leer und für ungültig.
    if (teil === "allein") return kv.alleinNachHause === "ja" && !normalisiereUhrzeit(kv.alleinAb) ? [{ feld: "karneval.alleinAb", meldung: k.t("fehler.uhrzeit") }] : [];
    return fehlerWenn(leer(kv.abendOhneEltern), "karneval.abendOhneEltern", k.t("fehler.wahl"));
  },
  beimVerlassen(k, teil) {
    const kv = karnevalDaten(k);
    if (teil === "abend" && kv.abendOhneEltern !== "ja") {
      // Ohne Abendauftritte entfallen die Fragen zu Abholung und Heimweg.
      kv.abholung = "";
      kv.alleinNachHause = null;
      kv.alleinAb = "";
    }
    if (teil === "abholung") kv.abholung = sauber(kv.abholung);
    if (teil === "allein") kv.alleinAb = kv.alleinNachHause === "ja" ? normalisiereUhrzeit(kv.alleinAb) || "" : "";
  },
};
