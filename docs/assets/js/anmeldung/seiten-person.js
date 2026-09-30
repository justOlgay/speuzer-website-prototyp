/*
  Seiten des Assistenten zur Person: start, wer, name, geburt, pass, ausland,
  wohnen, sorge (SCHNITTSTELLEN Abschnitt 4).

  Jede Seite ist ein Objekt mit
    id                     Schritt-Kennung
    teile(k)               Liste der Teilseiten (Standard ["haupt"]); je Teilseite
                           eine Frage – die Liste darf von den Antworten abhängen
    render(k, teil)        { titel, inhalt: [Knoten], weiterText? }
    pruefe(k, teil)        [{ feld, meldung }] – leer heißt: alles in Ordnung
    beimVerlassen(k, teil) optional: räumt Antworten auf, wenn die Teilseite
                           erfolgreich verlassen wird
  Ob und wann ein Schritt kommt, entscheidet allein regeln.schritte(); hier
  steht nur, was innerhalb eines Schritts passiert.
*/

import { h, absaetze, textfeld, kartenAuswahl, kaestchen, datumFelder, pruefeDatumsfeld, landAuswahl, knopf, hinweisKasten, lateinFehler } from "./bausteine.js";
import { hole, setze, sauber, zweiterElternteilNoetig } from "./hilfen.js";
import { pruefeLateinisch } from "./zeichen.js";

const JANEIN = (k, pfad) => [
  { wert: "ja", label: k.t("allgemein.ja") },
  { wert: "nein", label: k.t("allgemein.nein") },
];

const JANEINWEISS = (k) => [
  { wert: "ja", label: k.t("allgemein.ja") },
  { wert: "nein", label: k.t("allgemein.nein") },
  { wert: "weiss_nicht", label: k.t("allgemein.weissNicht") },
];

function leer(x) {
  return x === null || x === undefined || x === "";
}

function fehlerWenn(bedingung, feld, meldung) {
  return bedingung ? [{ feld, meldung }] : [];
}

// ---------- start ----------

export const start = {
  id: "start",
  teile: () => ["haupt"],
  render(k) {
    const sprachen = kartenAuswahl(k, {
      pfad: "sprache",
      legende: k.t("start.spracheTitel"),
      klasse: "anm-sprachwahl",
      optionen: k.sprachen.map((s) => ({ wert: s.code, label: s.name, lang: s.code, dir: s.dir })),
      beiWahl: (code) => k.wechsleSprache(code),
    });
    return {
      titel: k.t("start.titel"),
      weiterText: k.t("start.los"),
      inhalt: [
        ...absaetze(k.t("start.einleitung")),
        ...absaetze(k.t("start.ergebnis")),
        h("h3", { klasse: "anm-zwischentitel" }, k.t("start.brauchenTitel")),
        h("ul", { klasse: "anm-liste-punkte" }, k.tl("start.brauchen").map((x) => h("li", {}, x))),
        h("p", { klasse: "anm-text" }, k.t("start.dauer")),
        ...absaetze(k.t("start.datenschutz")),
        sprachen,
        h("p", { klasse: "anm-hinweis" }, k.t("start.hilfe")),
      ],
    };
  },
  pruefe: () => [],
};

// ---------- wer ----------

export const wer = {
  id: "wer",
  teile: () => ["haupt"],
  render(k) {
    return {
      titel: k.t("wer.titel"),
      inhalt: [
        kartenAuswahl(k, {
          pfad: "wer",
          optionen: [
            { wert: "kind", label: k.t("wer.kind"), hinweis: k.t("wer.kindHinweis") },
            { wert: "selbst", label: k.t("wer.selbst"), hinweis: k.t("wer.selbstHinweis") },
          ],
        }),
        ...absaetze(k.t("wer.mehrere"), "anm-hinweis"),
      ],
    };
  },
  pruefe: (k) => fehlerWenn(!k.a.wer, "wer", k.t("fehler.wer")),
};

// ---------- name ----------

export const name = {
  id: "name",
  teile: () => ["haupt"],
  render(k) {
    const selbst = k.a.wer === "selbst";
    // Schon beim Tippen ein Hinweis (die harte Prüfung kommt beim Weiterklicken,
    // siehe pruefe): Namen brauchen lateinische Buchstaben wie im Pass. Sobald die
    // Fehlerliste da ist, sagt sie dasselbe – dann verschwindet dieser Hinweis.
    const warnung = h("p", { klasse: "anm-hinweis anm-hinweis--achtung", role: "status" }, k.t("fehler.lateinisch"));
    k.bedingt(warnung, () => !k.fehlerAktiv && !(pruefeLateinisch(k.a.vorname).ok && pruefeLateinisch(k.a.nachname).ok));
    return {
      titel: k.t("name.titel"),
      inhalt: [
        ...absaetze(k.t("name.hinweis"), "anm-hinweis"),
        textfeld(k, { pfad: "vorname", label: k.t("name.vorname"), hinweis: k.t("name.vornameHinweis"), autocomplete: selbst ? "given-name" : "off", maxlength: 40 }),
        textfeld(k, { pfad: "nachname", label: k.t("name.nachname"), autocomplete: selbst ? "family-name" : "off", maxlength: 40 }),
        warnung,
      ],
    };
  },
  pruefe(k) {
    return [
      ...fehlerWenn(!sauber(k.a.vorname), "vorname", k.t("fehler.vorname")),
      ...fehlerWenn(!sauber(k.a.nachname), "nachname", k.t("fehler.nachname")),
      ...lateinFehler(k, k.a.vorname, "vorname"),
      ...lateinFehler(k, k.a.nachname, "nachname"),
    ];
  },
};

// ---------- geburt ----------

export const geburt = {
  id: "geburt",
  teile: () => ["datum", "geschlecht"],
  render(k, teil) {
    if (teil === "datum") {
      return {
        titel: k.t("geburt.datum.titel"),
        inhalt: [
          datumFelder(k, { pfad: "geburtsdatum", legende: k.t("geburt.datum.legende"), autocompleteVorsatz: k.a.wer === "selbst" ? "bday" : null }),
          textfeld(k, { pfad: "geburtsort", label: k.t("geburt.datum.ort"), hinweis: k.t("geburt.datum.ortHinweis"), maxlength: 50 }),
          landAuswahl(k, { pfad: "geburtsland", label: k.t("geburt.datum.land") }),
        ],
      };
    }
    const spielrecht = h("div", { klasse: "anm-block" },
      kartenAuswahl(k, {
        pfad: "spielrechtFuer",
        legende: k.t("geburt.geschlecht.spielrechtTitel"),
        hinweis: k.t("geburt.geschlecht.spielrechtHinweis"),
        optionen: [
          { wert: "m", label: k.t("geburt.geschlecht.spielrechtM") },
          { wert: "w", label: k.t("geburt.geschlecht.spielrechtW") },
        ],
      }));
    k.bedingt(spielrecht, () => ["d", "ohne_angabe"].includes(k.a.geschlecht));
    return {
      titel: k.t("geburt.geschlecht.titel"),
      inhalt: [
        kartenAuswahl(k, {
          pfad: "geschlecht",
          hinweis: k.t("geburt.geschlecht.hinweis"),
          optionen: ["m", "w", "d", "ohne_angabe"].map((w) => ({ wert: w, label: k.t("geburt.geschlecht." + w) })),
        }),
        spielrecht,
      ],
    };
  },
  pruefe(k, teil) {
    if (teil === "datum") {
      const f = [];
      const datum = pruefeDatumsfeld(k, "geburtsdatum");
      if (datum) f.push({ feld: "geburtsdatum", meldung: datum });
      else if (!k.a.geburtsdatum) f.push({ feld: "geburtsdatum", meldung: k.t("fehler.datumLeer") });
      if (!sauber(k.a.geburtsort)) f.push({ feld: "geburtsort", meldung: k.t("fehler.geburtsort") });
      else f.push(...lateinFehler(k, k.a.geburtsort, "geburtsort", "ort"));
      if (leer(k.a.geburtsland)) f.push({ feld: "geburtsland", meldung: k.t("fehler.geburtsland") });
      return f;
    }
    const f = fehlerWenn(!k.a.geschlecht, "geschlecht", k.t("fehler.geschlecht"));
    if (["d", "ohne_angabe"].includes(k.a.geschlecht)) f.push(...fehlerWenn(!k.a.spielrechtFuer, "spielrechtFuer", k.t("fehler.spielrechtFuer")));
    return f;
  },
  beimVerlassen(k, teil) {
    if (teil === "geschlecht" && !["d", "ohne_angabe"].includes(k.a.geschlecht)) k.a.spielrechtFuer = null;
  },
};

// ---------- pass ----------

// Liste der Staatsangehörigkeiten: eine Auswahl je Zeile, weitere Zeilen mit
// einem Knopf. In a.staaten stehen die Codes; leere Zeilen ("") gibt es nur
// während der Eingabe und werden beim Weiterklicken abgewiesen.
function staatenEditor(k) {
  if (!Array.isArray(k.a.staaten)) k.a.staaten = [];
  if (!k.a.staaten.length) k.a.staaten = k.a.deutsch === "ja" ? ["DE"] : [""];
  const liste = h("div", { klasse: "anm-liste" });
  const fehler = h("p", { klasse: "anm-fehler", id: k.nextId("f"), hidden: true });
  const huelle = h("div", { klasse: "anm-feld", "data-feld": "staaten" }, fehler, liste);
  const hinzu = knopf(k.t("pass.staaten.hinzu"), { sekundaer: true, aktion: "staat-hinzu", beiKlick: () => { k.a.staaten.push(""); zeichne(); k.aenderung(); const ziel = liste.querySelectorAll("select"); ziel[ziel.length - 1].focus(); } });
  function zeichne() {
    liste.textContent = "";
    k.a.staaten.forEach((code, i) => {
      const zeile = landAuswahl(k, { pfad: "staaten." + i, feld: "staaten." + i, label: k.t("pass.staaten.label", { nummer: i + 1 }) });
      const entfernen = knopf(k.t("allgemein.entfernen"), {
        sekundaer: true,
        ariaLabel: k.t("pass.staaten.entfernen", { nummer: i + 1 }),
        beiKlick: () => { k.a.staaten.splice(i, 1); if (!k.a.staaten.length) k.a.staaten = [""]; zeichne(); k.aenderung(); },
      });
      entfernen.hidden = k.a.staaten.length < 2;
      liste.append(h("div", { klasse: "anm-zeile" }, zeile, entfernen));
    });
  }
  zeichne();
  return h("div", { klasse: "anm-block" }, huelle, hinzu);
}

export const pass = {
  id: "pass",
  teile: () => ["deutsch", "staaten"],
  render(k, teil) {
    if (teil === "deutsch") {
      return {
        titel: k.t("pass.deutsch.titel"),
        inhalt: [kartenAuswahl(k, { pfad: "deutsch", hinweis: k.t("pass.deutsch.hinweis"), optionen: JANEINWEISS(k) })],
      };
    }
    return {
      titel: k.t("pass.staaten.titel"),
      inhalt: [h("p", { klasse: "anm-hinweis" }, k.t("pass.staaten.hinweis")), staatenEditor(k)],
    };
  },
  pruefe(k, teil) {
    if (teil === "deutsch") return fehlerWenn(!k.a.deutsch, "deutsch", k.t("fehler.deutsch"));
    const liste = Array.isArray(k.a.staaten) ? k.a.staaten : [];
    const gefuellt = liste.filter((c) => !leer(c));
    const f = [];
    liste.forEach((c, i) => {
      if (leer(c) && gefuellt.length) f.push({ feld: "staaten." + i, meldung: k.t("fehler.staatLeer") });
    });
    if (!gefuellt.length && k.a.deutsch !== "weiss_nicht") f.push({ feld: "staaten.0", meldung: k.t("fehler.staaten") });
    else if (k.a.deutsch === "nein" && gefuellt.includes("DE")) f.push({ feld: "staaten.0", meldung: k.t("fehler.staatenNichtDeutsch") });
    else if (k.a.deutsch === "ja" && !gefuellt.includes("DE")) f.push({ feld: "staaten.0", meldung: k.t("fehler.staatenDeutsch") });
    return f;
  },
  beimVerlassen(k, teil) {
    if (teil === "staaten") k.a.staaten = Array.from(new Set((k.a.staaten || []).filter((c) => !leer(c))));
  },
};

// ---------- ausland ----------

export const ausland = {
  id: "ausland",
  teile: () => ["haupt"],
  render(k) {
    const block = h("div", { klasse: "anm-block" },
      landAuswahl(k, { pfad: "auslandLand", label: k.t("ausland.land"), hinweis: k.t("ausland.landHinweis") }),
      textfeld(k, { pfad: "auslandStadt", label: k.t("ausland.stadt"), maxlength: 50 }));
    k.bedingt(block, () => k.a.auslandGewohnt === "ja");
    return {
      titel: k.t("ausland.titel"),
      inhalt: [
        kartenAuswahl(k, { pfad: "auslandGewohnt", hinweis: k.t("ausland.hinweis"), optionen: JANEIN(k) }),
        block,
      ],
    };
  },
  pruefe(k) {
    const f = fehlerWenn(!k.a.auslandGewohnt, "auslandGewohnt", k.t("fehler.ausland"));
    if (k.a.auslandGewohnt === "ja") {
      f.push(...fehlerWenn(leer(k.a.auslandLand), "auslandLand", k.t("fehler.auslandLand")));
      f.push(...fehlerWenn(!sauber(k.a.auslandStadt), "auslandStadt", k.t("fehler.auslandStadt")));
      f.push(...lateinFehler(k, k.a.auslandStadt, "auslandStadt", "text"));
    }
    return f;
  },
  beimVerlassen(k) {
    if (k.a.auslandGewohnt !== "ja") {
      k.a.auslandLand = null;
      k.a.auslandStadt = null;
    }
  },
};

// ---------- wohnen ----------

export const wohnen = {
  id: "wohnen",
  teile(k) {
    const t = ["ort"];
    if (k.a.wohnen === "gemeinsam") t.push("seit");
    if (k.a.wohnen === "verwandte" || k.a.wohnen === "ohne_eltern") t.push("grund", "dauer");
    return t;
  },
  render(k, teil) {
    if (teil === "ort") {
      const opt = (wert, hinweis) => ({ wert, label: k.t("wohnen.ort." + wert), hinweis: hinweis ? k.t("wohnen.ort." + wert + "Hinweis") : null });
      return {
        titel: k.t("wohnen.ort.titel"),
        inhalt: [kartenAuswahl(k, { pfad: "wohnen", optionen: [opt("gemeinsam", true), opt("nicht_gemeinsam", true), opt("verwandte"), opt("ohne_eltern")] })],
      };
    }
    if (teil === "seit") {
      return {
        titel: k.t("wohnen.seit.titel"),
        inhalt: [datumFelder(k, { pfad: "wohnenSeit", legende: k.t("wohnen.seit.legende"), ohneTag: true })],
      };
    }
    if (teil === "grund") {
      return {
        titel: k.t("wohnen.grund.titel"),
        inhalt: [kartenAuswahl(k, { pfad: "ohneElternGrund", optionen: ["gefluechtet", "austausch", "verwandte", "pflege"].map((w) => ({ wert: w, label: k.t("wohnen.grund." + w) })) })],
      };
    }
    const jahre = h("div", { klasse: "anm-block" },
      textfeld(k, {
        pfad: "jahreInDe",
        label: k.t("wohnen.dauer.jahre"),
        hinweis: k.t("wohnen.dauer.jahreHinweis"),
        inputmode: "numeric",
        maxlength: 2,
        ltr: true,
        speichereAls: (v) => {
          const n = parseInt(String(v).replace(/\D/g, ""), 10);
          return Number.isFinite(n) ? n : null;
        },
      }));
    k.bedingt(jahre, () => k.a.geborenInDe === "nein");
    return {
      titel: k.t("wohnen.dauer.titel"),
      inhalt: [kartenAuswahl(k, { pfad: "geborenInDe", legende: k.t("wohnen.dauer.geboren"), optionen: JANEIN(k) }), jahre],
    };
  },
  pruefe(k, teil) {
    if (teil === "ort") return fehlerWenn(!k.a.wohnen, "wohnen", k.t("fehler.wohnen"));
    if (teil === "seit") {
      const m = pruefeDatumsfeld(k, "wohnenSeit", { ohneTag: true });
      return m ? [{ feld: "wohnenSeit", meldung: m }] : [];
    }
    if (teil === "grund") return fehlerWenn(!k.a.ohneElternGrund, "ohneElternGrund", k.t("fehler.ohneElternGrund"));
    const f = fehlerWenn(!k.a.geborenInDe, "geborenInDe", k.t("fehler.geborenInDe"));
    if (k.a.geborenInDe === "nein") {
      const j = k.a.jahreInDe;
      f.push(...fehlerWenn(!(Number.isInteger(j) && j >= 0 && j <= 18), "jahreInDe", k.t("fehler.jahreInDe")));
    }
    return f;
  },
  beimVerlassen(k, teil) {
    if (teil === "ort") {
      if (k.a.wohnen !== "gemeinsam") k.a.wohnenSeit = null;
      if (!["verwandte", "ohne_eltern"].includes(k.a.wohnen)) {
        k.a.ohneElternGrund = null;
        k.a.geborenInDe = null;
        k.a.jahreInDe = null;
      }
    }
    if (teil === "dauer" && k.a.geborenInDe !== "nein") k.a.jahreInDe = null;
  },
};

// ---------- sorge ----------

const ROLLEN = ["mutter", "vater", "vormund", "pflege", "andere"];

// Wie viele Personen mit Sorgerecht: beide Eltern zwei, sonst eine.
function anzahlSorge(k) {
  return k.a.sorge === "beide" ? 2 : 1;
}

function normalisiereSorge(k) {
  if (!Array.isArray(k.a.sorgeberechtigte)) k.a.sorgeberechtigte = [];
  const n = anzahlSorge(k);
  while (k.a.sorgeberechtigte.length < n) k.a.sorgeberechtigte.push({ rolle: "", vorname: "", nachname: "", telefon: "", email: "" });
  if (k.a.sorgeberechtigte.length > n) k.a.sorgeberechtigte.length = n;
}

function rollenAuswahl(k, i) {
  const id = k.nextId("r");
  const auswahl = h("select", { id, "data-pfad": "sorgeberechtigte." + i + ".rolle", klasse: "anm-eingabe anm-eingabe--auswahl", "aria-required": "true" },
    h("option", { value: "" }, k.t("allgemein.bitteWaehlen")),
    ROLLEN.map((r) => h("option", { value: r }, k.t("sorge.personen." + r))));
  auswahl.value = hole(k.a, "sorgeberechtigte." + i + ".rolle") || "";
  auswahl.addEventListener("change", () => {
    setze(k.a, "sorgeberechtigte." + i + ".rolle", auswahl.value);
    k.aenderung();
  });
  const fehler = h("p", { klasse: "anm-fehler", id: id + "-f", hidden: true });
  return h("div", { klasse: "anm-feld", "data-feld": "sorgeberechtigte." + i + ".rolle" },
    h("label", { klasse: "anm-label", for: id }, k.t("sorge.personen.rolle")), fehler, auswahl);
}

export const sorge = {
  id: "sorge",
  teile: () => ["recht", "personen"],
  render(k, teil) {
    if (teil === "recht") {
      const einverstanden = h("div", { klasse: "anm-block" },
        kaestchen(k, { pfad: "andererElternteilEinverstanden", label: k.t("sorge.recht.einverstanden"), hinweis: k.t("sorge.recht.einverstandenHinweis") }));
      k.bedingt(einverstanden, () => k.a.sorge === "getrennt_bei_mir");
      // Ohne Zustimmung des anderen Elternteils muss er selbst mit Stift unterschreiben. Dieser Kasten ist
      // der einzige "Achtung"-Kasten der Seite (der Hinweis "getrennt_zustimmung" des Regelwerks steht hier
      // nicht, siehe HINWEIS_ORT in seiten-ende.js).
      const zweiter = h("div", { klasse: "anm-block", "data-zweiter-elternteil": "" }, hinweisKasten("offen", k.t("pruefen.hinweisArt.warnung"), absaetze(k.t("sorge.zweiterMitStift"))));
      k.bedingt(zweiter, () => zweiterElternteilNoetig(k.a));
      return {
        titel: k.t("sorge.recht.titel"),
        inhalt: [
          kartenAuswahl(k, {
            pfad: "sorge",
            hinweis: k.t("sorge.recht.hinweis"),
            optionen: [
              { wert: "beide", label: k.t("sorge.recht.beide") },
              { wert: "getrennt_bei_mir", label: k.t("sorge.recht.getrennt_bei_mir"), hinweis: k.t("sorge.recht.getrennt_bei_mirHinweis") },
              { wert: "allein", label: k.t("sorge.recht.allein") },
              { wert: "vormund", label: k.t("sorge.recht.vormund"), hinweis: k.t("sorge.recht.vormundHinweis") },
              { wert: "pflege", label: k.t("sorge.recht.pflege") },
            ],
          }),
          einverstanden,
          zweiter,
        ],
      };
    }
    normalisiereSorge(k);
    const person = (i) => {
      const legende = i === 0 ? k.t("sorge.personen.erste") : k.t("sorge.personen.zweite");
      return h("fieldset", { klasse: "anm-gruppe anm-person" },
        h("legend", { klasse: "anm-legende" }, legende),
        rollenAuswahl(k, i),
        textfeld(k, { pfad: "sorgeberechtigte." + i + ".vorname", label: k.t("sorge.personen.vorname"), maxlength: 40 }),
        textfeld(k, { pfad: "sorgeberechtigte." + i + ".nachname", label: k.t("sorge.personen.nachname"), maxlength: 40 }));
    };
    return {
      titel: k.t("sorge.personen.titel"),
      inhalt: [h("p", { klasse: "anm-hinweis" }, k.t("sorge.personen.hinweis")), ...Array.from({ length: anzahlSorge(k) }, (_, i) => person(i))],
    };
  },
  pruefe(k, teil) {
    if (teil === "recht") return fehlerWenn(!k.a.sorge, "sorge", k.t("fehler.sorge"));
    normalisiereSorge(k);
    const f = [];
    k.a.sorgeberechtigte.forEach((p, i) => {
      if (leer(p.rolle)) f.push({ feld: "sorgeberechtigte." + i + ".rolle", meldung: k.t("fehler.rolle") });
      if (!sauber(p.vorname)) f.push({ feld: "sorgeberechtigte." + i + ".vorname", meldung: k.t("fehler.vorname") });
      else f.push(...lateinFehler(k, p.vorname, "sorgeberechtigte." + i + ".vorname"));
      if (!sauber(p.nachname)) f.push({ feld: "sorgeberechtigte." + i + ".nachname", meldung: k.t("fehler.nachname") });
      else f.push(...lateinFehler(k, p.nachname, "sorgeberechtigte." + i + ".nachname"));
    });
    return f;
  },
  beimVerlassen(k, teil) {
    if (teil === "recht" && k.a.sorge !== "getrennt_bei_mir") k.a.andererElternteilEinverstanden = false;
    if (teil === "personen") normalisiereSorge(k);
  },
};
