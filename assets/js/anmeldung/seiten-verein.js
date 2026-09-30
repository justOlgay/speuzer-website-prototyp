/*
  Seiten des Assistenten zu Kontakt, Beitrag und Einwilligungen: kontakt,
  beitrag, leistungen, zahlung, einwilligungen, notfall (SCHNITTSTELLEN
  Abschnitt 4). Aufbau der Seiten: siehe seiten-person.js.
*/

import { h, absaetze, textfeld, kartenAuswahl, kaestchen, kaestchenListe, datumFelder, pruefeDatumsfeld, knopf, hinweisKasten, lateinFehler } from "./bausteine.js";
import { hole, sauber, pruefeIban, bereinigeIban, gruppiereIban } from "./hilfen.js";

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

function ziffern(text) {
  return String(text || "").replace(/\D/g, "");
}

// ---------- kontakt ----------

export const kontakt = {
  id: "kontakt",
  teile: () => ["anschrift", "erreichen"],
  render(k, teil) {
    if (teil === "anschrift") {
      return {
        titel: k.t("kontakt.anschrift.titel"),
        inhalt: [
          textfeld(k, { pfad: "anschrift.strasse", label: k.t("kontakt.anschrift.strasse"), autocomplete: "address-line1", maxlength: 60 }),
          h("div", { klasse: "anm-zeile anm-zeile--plz" },
            textfeld(k, { pfad: "anschrift.plz", label: k.t("kontakt.anschrift.plz"), autocomplete: "postal-code", inputmode: "numeric", maxlength: 5, ltr: true, klasse: "anm-feld--plz" }),
            textfeld(k, { pfad: "anschrift.ort", label: k.t("kontakt.anschrift.ort"), autocomplete: "address-level2", maxlength: 50 })),
        ],
      };
    }
    return {
      titel: k.t("kontakt.erreichen.titel"),
      inhalt: [
        k.a.wer === "kind" ? h("p", { klasse: "anm-hinweis" }, k.t("kontakt.erreichen.hinweisKind")) : null,
        textfeld(k, { pfad: "email", label: k.t("kontakt.erreichen.email"), hinweis: k.t("kontakt.erreichen.emailHinweis"), typ: "email", autocomplete: "email", maxlength: 80, ltr: true }),
        h("p", { klasse: "anm-hinweis" }, k.t("kontakt.erreichen.telefonHinweis")),
        textfeld(k, { pfad: "mobil", label: k.t("kontakt.erreichen.mobil"), typ: "tel", autocomplete: "tel", maxlength: 30, ltr: true, pflicht: false }),
        textfeld(k, { pfad: "telefon", label: k.t("kontakt.erreichen.telefon"), typ: "tel", autocomplete: "off", maxlength: 30, ltr: true, pflicht: false }),
      ],
    };
  },
  pruefe(k, teil) {
    if (!k.a.anschrift || typeof k.a.anschrift !== "object") k.a.anschrift = { strasse: "", plz: "", ort: "" };
    if (teil === "anschrift") {
      return [
        ...fehlerWenn(!sauber(k.a.anschrift.strasse), "anschrift.strasse", k.t("fehler.strasse")),
        ...lateinFehler(k, k.a.anschrift.strasse, "anschrift.strasse", "anschrift"),
        ...fehlerWenn(!/^\d{5}$/.test(sauber(k.a.anschrift.plz)), "anschrift.plz", k.t("fehler.plz")),
        ...fehlerWenn(!sauber(k.a.anschrift.ort), "anschrift.ort", k.t("fehler.ort")),
        ...lateinFehler(k, k.a.anschrift.ort, "anschrift.ort", "anschrift"),
      ];
    }
    // E-Mail und Telefonnummern kommen ins PDF: lateinische Buchstaben und Ziffern 0 bis 9.
    // Je Feld höchstens ein Eintrag: erst das Format, dann die Schrift.
    const f = [];
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(sauber(k.a.email))) f.push({ feld: "email", meldung: k.t("fehler.email") });
    else f.push(...lateinFehler(k, k.a.email, "email", "text"));
    const mobil = lateinFehler(k, k.a.mobil, "mobil", "nummer");
    const telefon = lateinFehler(k, k.a.telefon, "telefon", "nummer");
    if (ziffern(k.a.mobil).length < 6 && ziffern(k.a.telefon).length < 6 && !mobil.length && !telefon.length) f.push({ feld: "mobil", meldung: k.t("fehler.telefon") });
    f.push(...mobil, ...telefon);
    return f;
  },
  beimVerlassen(k, teil) {
    // Wer die Anmeldung ausfüllt, ist die erste Person mit Sorgerecht: E-Mail
    // und Telefon nicht doppelt abfragen, sondern übernehmen.
    if (teil === "erreichen" && Array.isArray(k.a.sorgeberechtigte) && k.a.sorgeberechtigte[0]) {
      k.a.sorgeberechtigte[0].email = sauber(k.a.email);
      k.a.sorgeberechtigte[0].telefon = sauber(k.a.mobil) || sauber(k.a.telefon);
    }
  },
};

// ---------- beitrag ----------

// Beitragsgruppen aus data/anmeldung.json (Objekt oder Liste), einheitlich.
export function beitragsgruppen(k) {
  const roh = k.konfig.anmeldung && k.konfig.anmeldung.beitragsgruppen;
  if (!roh) return [];
  const zahl = (x) => (typeof x === "number" ? x : null);
  const eintraege = Array.isArray(roh) ? roh.map((g) => ({ ...g, schluessel: g.schluessel || g.key || g.id })) : Object.entries(roh).map(([schluessel, g]) => ({ ...g, schluessel }));
  return eintraege
    .filter((g) => g.schluessel)
    .map((g) => ({
      schluessel: g.schluessel,
      abteilung: String(g.abteilung || "").toLowerCase(),
      bezeichnung: k.datentext(g.bezeichnung || g.name || g.label || g.titel || g.schluessel),
      jahr: zahl(g.jahr) ?? zahl(g.jahresbeitrag) ?? zahl(g.betrag),
      monat: zahl(g.monat),
    }));
}

const istFamilie = (g) => /famil/i.test(g.schluessel + " " + g.bezeichnung);
const istSenator = (g) => /senator/i.test(g.schluessel + " " + g.bezeichnung);

// Gruppen, aus denen die Familie wählen kann. Bei Fußball und Karneval
// zugleich gilt ein eigener Beitrag (der Verein sagt Bescheid): keine Wahl.
function gruppenFuer(k) {
  const abt = k.a.abteilung;
  if (abt === "beides") return [];
  return beitragsgruppen(k).filter((g) => {
    if (istSenator(g)) return false;
    if (abt === "karneval") return g.abteilung.includes("karneval") || !g.abteilung;
    return g.abteilung.includes("fussball") || g.abteilung.includes("fußball") || !g.abteilung;
  });
}

function beitragDaten(k) {
  if (!k.a.beitrag || typeof k.a.beitrag !== "object") k.a.beitrag = { gruppe: null, familie: [], senator: false, doppel: false };
  if (!Array.isArray(k.a.beitrag.familie)) k.a.beitrag.familie = [];
  return k.a.beitrag;
}

const MAX_FAMILIE = 6;

function familienEditor(k) {
  const b = beitragDaten(k);
  if (!b.familie.length) b.familie.push({ vorname: "", nachname: "", geburtsdatum: null });
  const liste = h("div", { klasse: "anm-liste anm-liste--karten" });
  const voll = h("p", { klasse: "anm-hinweis", hidden: true }, k.t("beitrag.familie.voll"));
  const hinzu = knopf(k.t("beitrag.familie.hinzu"), {
    sekundaer: true,
    aktion: "familie-hinzu",
    beiKlick: () => {
      if (b.familie.length >= MAX_FAMILIE) return;
      b.familie.push({ vorname: "", nachname: "", geburtsdatum: null });
      zeichne();
      k.aenderung();
      const felder = liste.querySelectorAll("input[data-pfad$='.vorname']");
      felder[felder.length - 1].focus();
    },
  });
  function zeichne() {
    liste.textContent = "";
    for (const schluessel of Object.keys(k.roh)) if (schluessel.startsWith("beitrag.familie.")) delete k.roh[schluessel];
    b.familie.forEach((_, i) => {
      const p = "beitrag.familie." + i;
      const entfernen = knopf(k.t("allgemein.entfernen"), {
        sekundaer: true,
        ariaLabel: k.t("beitrag.familie.entfernen", { nummer: i + 1 }),
        beiKlick: () => { b.familie.splice(i, 1); zeichne(); k.aenderung(); },
      });
      entfernen.hidden = b.familie.length < 2;
      liste.append(h("fieldset", { klasse: "anm-gruppe anm-person" },
        h("legend", { klasse: "anm-legende" }, k.t("beitrag.familie.person", { nummer: i + 1 })),
        textfeld(k, { pfad: p + ".vorname", label: k.t("beitrag.familie.vorname"), maxlength: 40 }),
        textfeld(k, { pfad: p + ".nachname", label: k.t("beitrag.familie.nachname"), maxlength: 40 }),
        datumFelder(k, { pfad: p + ".geburtsdatum", legende: k.t("beitrag.familie.geburtsdatum") }),
        entfernen));
    });
    hinzu.hidden = b.familie.length >= MAX_FAMILIE;
    voll.hidden = b.familie.length < MAX_FAMILIE;
  }
  zeichne();
  return h("div", { klasse: "anm-block" }, liste, hinzu, voll);
}

export const beitrag = {
  id: "beitrag",
  teile(k) {
    const b = beitragDaten(k);
    const t = ["gruppe"];
    const g = beitragsgruppen(k).find((x) => x.schluessel === b.gruppe);
    if (g && istFamilie(g)) t.push("familie");
    if (["karneval", "beides"].includes(k.a.abteilung) && k.minderjaehrig() === false) t.push("senator");
    return t;
  },
  render(k, teil) {
    const b = beitragDaten(k);
    if (teil === "familie") {
      return {
        titel: k.t("beitrag.familie.titel"),
        inhalt: [...absaetze(k.t("beitrag.familie.hinweis"), "anm-hinweis"), familienEditor(k)],
      };
    }
    if (teil === "senator") {
      return {
        titel: k.t("beitrag.senator.titel"),
        inhalt: [
          ...absaetze(k.t("beitrag.senator.hinweis"), "anm-hinweis"),
          kartenAuswahl(k, { pfad: "beitrag.senator", optionen: [{ wert: true, label: k.t("beitrag.senator.ja") }, { wert: false, label: k.t("beitrag.senator.nein") }] }),
        ],
      };
    }
    const e = k.ergebnis();
    const vorschlag = e && e.beitrag;
    if (!b.gruppe && vorschlag && vorschlag.gruppe && k.a.abteilung !== "beides") b.gruppe = vorschlag.gruppe;
    const gruppen = gruppenFuer(k);
    const alle = beitragsgruppen(k);
    const bezeichnung = (schluessel) => (alle.find((g) => g.schluessel === schluessel) || {}).bezeichnung || schluessel;
    const inhalt = [];
    if (vorschlag && vorschlag.gruppe) {
      const doppel = Array.isArray(vorschlag.gruppen) && vorschlag.gruppen.length > 1;
      const werte = { ...(vorschlag.werte || {}), name: k.name(), gruppe: bezeichnung(vorschlag.gruppe), jahr: vorschlag.jahr, monat: vorschlag.monat };
      // Erst der Text des Regelwerks (er nennt Betrag und Besonderheiten); fehlt
      // er, rechnet die Oberfläche selbst.
      const regelText = vorschlag.hinweisKey ? k.rt("beitrag", vorschlag.hinweisKey, werte) : "";
      if (!doppel) inhalt.push(h("p", { klasse: "anm-text anm-text--gross" }, k.t("beitrag.gruppe.vorschlagKopf", werte)));
      if (regelText) inhalt.push(...absaetze(regelText, "anm-text"));
      else if (doppel) inhalt.push(hinweisKasten("info", k.t("pruefen.hinweisArt.info"), absaetze(k.t("beitrag.gruppe.doppel"))));
      else {
        inhalt.push(...absaetze(k.t(vorschlag.monat ? "beitrag.gruppe.vorschlag" : "beitrag.gruppe.vorschlagOhneMonat", werte), "anm-text"));
        if (vorschlag.aufnahmegebuehr) inhalt.push(h("p", { klasse: "anm-text" }, k.t("beitrag.gruppe.aufnahme", { betrag: vorschlag.aufnahmegebuehr })));
      }
    }
    if (gruppen.length) {
      inhalt.push(h("p", { klasse: "anm-hinweis" }, k.t("beitrag.gruppe.andere")));
      inhalt.push(kartenAuswahl(k, {
        pfad: "beitrag.gruppe",
        legende: k.t("beitrag.gruppe.legende"),
        optionen: gruppen.map((g) => ({
          wert: g.schluessel,
          label: g.bezeichnung,
          meta: g.jahr !== null ? k.t("beitrag.gruppe.proJahr", { jahr: g.jahr }) : null,
          hinweis: vorschlag && vorschlag.vorschlag === g.schluessel && !vorschlag.gewaehlt ? k.t("beitrag.gruppe.vorgeschlagen") : null,
        })),
      }));
    }
    return { titel: k.t("beitrag.gruppe.titel"), inhalt };
  },
  pruefe(k, teil) {
    const b = beitragDaten(k);
    if (teil === "gruppe") return gruppenFuer(k).length ? fehlerWenn(!b.gruppe, "beitrag.gruppe", k.t("fehler.beitragGruppe")) : [];
    if (teil === "senator") return fehlerWenn(typeof b.senator !== "boolean", "beitrag.senator", k.t("fehler.senator"));
    const f = [];
    b.familie.forEach((m, i) => {
      const p = "beitrag.familie." + i;
      if (!sauber(m.vorname)) f.push({ feld: p + ".vorname", meldung: k.t("fehler.vorname") });
      else f.push(...lateinFehler(k, m.vorname, p + ".vorname"));
      if (!sauber(m.nachname)) f.push({ feld: p + ".nachname", meldung: k.t("fehler.nachname") });
      else f.push(...lateinFehler(k, m.nachname, p + ".nachname"));
      const d = pruefeDatumsfeld(k, p + ".geburtsdatum");
      if (d) f.push({ feld: p + ".geburtsdatum", meldung: d });
      else if (!m.geburtsdatum) f.push({ feld: p + ".geburtsdatum", meldung: k.t("fehler.datumLeer") });
    });
    return f;
  },
  beimVerlassen(k, teil) {
    const b = beitragDaten(k);
    b.doppel = k.a.abteilung === "beides";
    if (teil === "gruppe") {
      const g = beitragsgruppen(k).find((x) => x.schluessel === b.gruppe);
      if (!g || !istFamilie(g)) b.familie = [];
      if (!(["karneval", "beides"].includes(k.a.abteilung) && k.minderjaehrig() === false)) b.senator = false;
    }
  },
};

// ---------- leistungen ----------

export const leistungen = {
  id: "leistungen",
  teile: () => ["haupt"],
  render(k) {
    const ja = h("div", { klasse: "anm-block" }, hinweisKasten("info", k.t("pruefen.hinweisArt.info"), h("p", {}, k.t("leistungen.jaHinweis"))));
    k.bedingt(ja, () => k.a.leistungen === "ja");
    return {
      titel: k.t("leistungen.titel"),
      inhalt: [
        ...absaetze(k.t("leistungen.hinweis"), "anm-hinweis"),
        kartenAuswahl(k, { pfad: "leistungen", optionen: [{ wert: "ja", label: k.t("leistungen.ja") }, { wert: "nein", label: k.t("leistungen.nein") }] }),
        ja,
        h("p", { klasse: "anm-hinweis" }, k.t("leistungen.wenigGeld")),
      ],
    };
  },
  pruefe: (k) => fehlerWenn(!k.a.leistungen, "leistungen", k.t("fehler.leistungen")),
};

// ---------- zahlung ----------

function zahlungDaten(k) {
  if (!k.a.zahlung || typeof k.a.zahlung !== "object") k.a.zahlung = { art: null, kontoinhaber: null, iban: "", bic: "", bank: "", kiVorname: "", kiNachname: "", kiAnschriftGleich: true };
  return k.a.zahlung;
}

export const zahlung = {
  id: "zahlung",
  teile(k) {
    return zahlungDaten(k).art === "rechnung" ? ["art"] : ["art", "inhaber", "iban"];
  },
  render(k, teil) {
    const z = zahlungDaten(k);
    if (teil === "art") {
      const e = k.ergebnis();
      const zuschlag = (e && e.beitrag && e.beitrag.zuschlagOhneSepa) || (k.konfig.beitraege || {}).zuschlag_ohne_sepa;
      return {
        titel: k.t("zahlung.art.titel"),
        inhalt: [
          kartenAuswahl(k, {
            pfad: "zahlung.art",
            optionen: [
              { wert: "sepa", label: k.t("zahlung.art.sepa"), hinweis: k.t("zahlung.art.sepaHinweis") },
              { wert: "rechnung", label: k.t("zahlung.art.rechnung"), hinweis: k.t("zahlung.art.rechnungHinweis") + (zuschlag ? " " + k.t("zahlung.art.zuschlag", { zuschlag }) : "") },
            ],
          }),
        ],
      };
    }
    if (teil === "inhaber") {
      const ich = k.minderjaehrig() ? "sorgeberechtigt" : "mitglied";
      const andere = h("div", { klasse: "anm-block" },
        h("fieldset", { klasse: "anm-gruppe anm-person" },
          h("legend", { klasse: "anm-legende" }, k.t("zahlung.inhaber.person")),
          textfeld(k, { pfad: "zahlung.kiVorname", label: k.t("zahlung.inhaber.vorname"), maxlength: 40 }),
          textfeld(k, { pfad: "zahlung.kiNachname", label: k.t("zahlung.inhaber.nachname"), maxlength: 38 }),
          kaestchen(k, { pfad: "zahlung.kiAnschriftGleich", label: k.t("zahlung.inhaber.anschriftGleich") })));
      const anschrift = h("div", { klasse: "anm-block" },
        textfeld(k, { pfad: "zahlung.kiStrasse", label: k.t("zahlung.inhaber.strasse"), maxlength: 60 }),
        h("div", { klasse: "anm-zeile anm-zeile--plz" },
          textfeld(k, { pfad: "zahlung.kiPlz", label: k.t("zahlung.inhaber.plz"), inputmode: "numeric", maxlength: 5, ltr: true, klasse: "anm-feld--plz" }),
          textfeld(k, { pfad: "zahlung.kiOrt", label: k.t("zahlung.inhaber.ort"), maxlength: 50 })));
      andere.querySelector("fieldset").append(anschrift);
      k.bedingt(andere, () => z.kontoinhaber === "andere");
      k.bedingt(anschrift, () => z.kiAnschriftGleich !== true);
      return {
        titel: k.t("zahlung.inhaber.titel"),
        inhalt: [
          kartenAuswahl(k, { pfad: "zahlung.kontoinhaber", optionen: [{ wert: ich, label: k.t("zahlung.inhaber.ich") }, { wert: "andere", label: k.t("zahlung.inhaber.andere") }] }),
          andere,
        ],
      };
    }
    return {
      titel: k.t("zahlung.iban.titel"),
      inhalt: [
        textfeld(k, {
          pfad: "zahlung.iban",
          label: k.t("zahlung.iban.iban"),
          hinweis: k.t("zahlung.iban.ibanHinweis").replace("\n", " "),
          autocomplete: "off",
          maxlength: 48,
          ltr: true,
          grossbuchstaben: true,
          speichereAls: bereinigeIban,
          anzeige: (v) => gruppiereIban(bereinigeIban(v)),
          beimVerlassen: (v) => gruppiereIban(bereinigeIban(v)),
        }),
        textfeld(k, { pfad: "zahlung.bic", label: k.t("zahlung.iban.bic"), maxlength: 24, ltr: true, grossbuchstaben: true, freiwillig: true }),
        textfeld(k, { pfad: "zahlung.bank", label: k.t("zahlung.iban.bank"), maxlength: 60, freiwillig: true }),
      ],
    };
  },
  pruefe(k, teil) {
    const z = zahlungDaten(k);
    if (teil === "art") return fehlerWenn(!z.art, "zahlung.art", k.t("fehler.zahlungArt"));
    if (teil === "inhaber") {
      const ich = k.minderjaehrig() ? "sorgeberechtigt" : "mitglied";
      const f = fehlerWenn(![ich, "andere"].includes(z.kontoinhaber), "zahlung.kontoinhaber", k.t("fehler.kontoinhaber"));
      if (z.kontoinhaber === "andere") {
        f.push(...fehlerWenn(!sauber(z.kiVorname), "zahlung.kiVorname", k.t("fehler.kiVorname")));
        f.push(...lateinFehler(k, z.kiVorname, "zahlung.kiVorname"));
        f.push(...fehlerWenn(!sauber(z.kiNachname), "zahlung.kiNachname", k.t("fehler.kiNachname")));
        f.push(...lateinFehler(k, z.kiNachname, "zahlung.kiNachname"));
        if (z.kiAnschriftGleich !== true) {
          f.push(...fehlerWenn(!sauber(z.kiStrasse), "zahlung.kiStrasse", k.t("fehler.strasse")));
          f.push(...lateinFehler(k, z.kiStrasse, "zahlung.kiStrasse", "anschrift"));
          f.push(...fehlerWenn(!/^\d{5}$/.test(sauber(z.kiPlz)), "zahlung.kiPlz", k.t("fehler.plz")));
          f.push(...fehlerWenn(!sauber(z.kiOrt), "zahlung.kiOrt", k.t("fehler.ort")));
          f.push(...lateinFehler(k, z.kiOrt, "zahlung.kiOrt", "anschrift"));
        }
      }
      return f;
    }
    const f = [];
    const r = pruefeIban(z.iban);
    if (!r.ok) {
      const schluessel = { leer: "ibanLeer", format: "ibanFormat", land: "ibanLand", laenge: "ibanLaenge", pruefziffer: "ibanPruefziffer" }[r.grund];
      f.push({ feld: "zahlung.iban", meldung: k.t("fehler." + schluessel) });
    }
    // BIC und Bank sind freiwillig, aber was drinsteht, kommt ins PDF.
    f.push(...lateinFehler(k, z.bic, "zahlung.bic", "text"), ...lateinFehler(k, z.bank, "zahlung.bank", "text"));
    return f;
  },
  beimVerlassen(k, teil) {
    const z = zahlungDaten(k);
    if (teil === "art" && z.art === "rechnung") {
      z.kontoinhaber = null;
      z.iban = "";
      z.bic = "";
      z.bank = "";
    }
    if (teil === "inhaber" && z.kontoinhaber !== "andere") {
      z.kiVorname = "";
      z.kiNachname = "";
      z.kiAnschriftGleich = true;
    }
    if (teil === "iban") z.iban = bereinigeIban(z.iban);
  },
};

// ---------- einwilligungen ----------

function holeEinwilligungen(k) {
  if (!k.a.einwilligungen || typeof k.a.einwilligungen !== "object") k.a.einwilligungen = {};
  return k.a.einwilligungen;
}

function fussballerMitSpiel(k) {
  return ["fussball", "beides"].includes(k.a.abteilung) && k.a.spielen === true;
}

export const einwilligungen = {
  id: "einwilligungen",
  teile(k) {
    return ["fotos", ...(fussballerMitSpiel(k) ? ["hfv"] : []), ...(k.minderjaehrig() ? ["fahrten"] : [])];
  },
  render(k, teil) {
    const ein = holeEinwilligungen(k);
    if (teil === "fotos") {
      const medien = h("div", { klasse: "anm-block" },
        kaestchenListe(k, {
          pfad: "einwilligungen.medien",
          legende: k.t("einwilligungen.fotos.medienLegende"),
          hinweis: k.t("einwilligungen.fotos.medienHinweis"),
          optionen: ["intern", "web", "presse", "dokumentation"].map((w) => ({ wert: w, label: k.t("einwilligungen.fotos." + w) })),
        }));
      k.bedingt(medien, () => ein.fotos === "ja");
      return {
        titel: k.t("einwilligungen.fotos.titel"),
        inhalt: [
          h("p", { klasse: "anm-hinweis" }, k.t("einwilligungen.fotos.hinweis")),
          kartenAuswahl(k, {
            pfad: "einwilligungen.fotos",
            optionen: [
              { wert: "ja", label: k.t("einwilligungen.fotos.ja"), hinweis: k.t("einwilligungen.fotos.jaHinweis") },
              { wert: "nein", label: k.t("einwilligungen.fotos.nein") },
            ],
          }),
          medien,
        ],
      };
    }
    if (teil === "hfv") {
      const e = k.ergebnis();
      const alter = e && typeof e.alter === "number" ? e.alter : null;
      const unter16 = alter === null || alter < 16;
      return {
        titel: k.t("einwilligungen.hfv.titel"),
        inhalt: [
          h("p", { klasse: "anm-hinweis" }, k.t("einwilligungen.hfv.hinweis")),
          h("div", { klasse: "anm-karten" },
            unter16 ? kaestchen(k, { pfad: "einwilligungen.hfvName", label: k.t("einwilligungen.hfv.name"), hinweis: k.t("einwilligungen.hfv.nameHinweis") }) : null,
            kaestchen(k, { pfad: "einwilligungen.hfvFoto", label: k.t("einwilligungen.hfv.foto"), hinweis: k.t("einwilligungen.hfv.fotoHinweis") })),
          unter16 ? null : h("p", { klasse: "anm-hinweis" }, k.t("einwilligungen.hfv.ab16")),
        ],
      };
    }
    return {
      titel: k.t("einwilligungen.fahrten.titel"),
      inhalt: [
        h("p", { klasse: "anm-hinweis" }, k.t("einwilligungen.fahrten.hinweis")),
        h("div", { klasse: "anm-karten" },
          kaestchen(k, { pfad: "einwilligungen.fahrten", label: k.t("einwilligungen.fahrten.fahrten"), hinweis: k.t("einwilligungen.fahrten.fahrtenHinweis") }),
          kaestchen(k, { pfad: "einwilligungen.messenger", label: k.t("einwilligungen.fahrten.messenger"), hinweis: k.t("einwilligungen.fahrten.messengerHinweis") })),
      ],
    };
  },
  pruefe(k, teil) {
    const ein = holeEinwilligungen(k);
    if (teil !== "fotos") return [];
    const f = fehlerWenn(!ein.fotos, "einwilligungen.fotos", k.t("fehler.fotos"));
    if (ein.fotos === "ja") f.push(...fehlerWenn(!(ein.medien && ein.medien.length), "einwilligungen.medien", k.t("fehler.medien")));
    return f;
  },
  beimVerlassen(k, teil) {
    const ein = holeEinwilligungen(k);
    if (teil === "fotos" && ein.fotos !== "ja") ein.medien = [];
    if (teil === "hfv") {
      ein.hfvName = ein.hfvName === true;
      ein.hfvFoto = ein.hfvFoto === true;
    }
    if (teil === "fahrten") {
      ein.fahrten = ein.fahrten === true;
      ein.messenger = ein.messenger === true;
    }
  },
};

// ---------- notfall ----------

function notfallDaten(k) {
  if (!k.a.notfall || typeof k.a.notfall !== "object") k.a.notfall = { name: "", telefon: "", beziehung: "" };
  return k.a.notfall;
}

export const notfall = {
  id: "notfall",
  teile: (k) => ["kontakt", "bogen", ...(k.a.gesundheitsbogen === true ? ["gesundheit"] : [])],
  render(k, teil) {
    notfallDaten(k);
    if (teil === "kontakt") {
      return {
        titel: k.t("notfall.kontakt.titel"),
        inhalt: [
          h("p", { klasse: "anm-hinweis" }, k.t("notfall.kontakt.hinweis")),
          textfeld(k, { pfad: "notfall.name", label: k.t("notfall.kontakt.name"), maxlength: 60 }),
          textfeld(k, { pfad: "notfall.telefon", label: k.t("notfall.kontakt.telefon"), typ: "tel", autocomplete: "off", maxlength: 30, ltr: true }),
          textfeld(k, { pfad: "notfall.beziehung", label: k.t("notfall.kontakt.beziehung"), hinweis: k.t("notfall.kontakt.beziehungHinweis"), maxlength: 40, freiwillig: true }),
        ],
      };
    }
    if (teil === "bogen") {
      return {
        titel: k.t("notfall.bogen.titel"),
        inhalt: [
          ...absaetze(k.t("notfall.bogen.hinweis"), "anm-hinweis"),
          kartenAuswahl(k, { pfad: "gesundheitsbogen", optionen: [{ wert: true, label: k.t("notfall.bogen.ja") }, { wert: false, label: k.t("notfall.bogen.nein") }] }),
        ],
      };
    }
    if (!k.a.gesundheit || typeof k.a.gesundheit !== "object") k.a.gesundheit = { allergien: "", erkrankungen: "", medikamente: "", sonstiges: "" };
    return {
      titel: k.t("notfall.gesundheit.titel"),
      inhalt: [
        ...absaetze(k.t("notfall.gesundheit.hinweis"), "anm-hinweis"),
        textfeld(k, { pfad: "gesundheit.allergien", label: k.t("notfall.gesundheit.allergien"), zeilen: 2, maxlength: 300, freiwillig: true }),
        textfeld(k, { pfad: "gesundheit.erkrankungen", label: k.t("notfall.gesundheit.erkrankungen"), zeilen: 2, maxlength: 300, freiwillig: true }),
        textfeld(k, { pfad: "gesundheit.medikamente", label: k.t("notfall.gesundheit.medikamente"), hinweis: k.t("notfall.gesundheit.medikamenteHinweis"), zeilen: 2, maxlength: 300, freiwillig: true }),
        textfeld(k, { pfad: "gesundheit.sonstiges", label: k.t("notfall.gesundheit.sonstiges"), zeilen: 2, maxlength: 300, freiwillig: true }),
      ],
    };
  },
  pruefe(k, teil) {
    const n = notfallDaten(k);
    if (teil === "kontakt") {
      const nummer = lateinFehler(k, n.telefon, "notfall.telefon", "nummer");
      return [
        ...fehlerWenn(!sauber(n.name), "notfall.name", k.t("fehler.notfallName")),
        ...lateinFehler(k, n.name, "notfall.name"),
        ...(nummer.length ? nummer : fehlerWenn(ziffern(n.telefon).length < 6, "notfall.telefon", k.t("fehler.notfallTelefon"))),
        ...lateinFehler(k, n.beziehung, "notfall.beziehung", "text"),
      ];
    }
    if (teil === "bogen") return fehlerWenn(typeof k.a.gesundheitsbogen !== "boolean", "gesundheitsbogen", k.t("fehler.gesundheitsbogen"));
    // Gesundheitsangaben: freiwillig, aber was drinsteht, kommt ins PDF.
    const g = k.a.gesundheit || {};
    return ["allergien", "erkrankungen", "medikamente", "sonstiges"].flatMap((feld) => lateinFehler(k, g[feld], "gesundheit." + feld, "text"));
  },
  beimVerlassen(k, teil) {
    if (teil === "bogen" && k.a.gesundheitsbogen !== true) k.a.gesundheit = { allergien: "", erkrankungen: "", medikamente: "", sonstiges: "" };
  },
};
