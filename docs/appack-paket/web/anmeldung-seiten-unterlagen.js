import { h, absaetze, kartenAuswahl, hinweisKasten, vereinsKasten, knopf } from "./anmeldung-bausteine.js";
import { verarbeiteNachweis, verarbeiteSpielerfoto, BildFehler } from "./anmeldung-bilder.js";
import { unterschriftFeld } from "./anmeldung-unterschrift.js";
import { sauber, zweiterElternteilNoetig } from "./anmeldung-hilfen.js";

function fehlerWenn(bedingung, feld, meldung) {
  return bedingung ? [{ feld, meldung }] : [];
}

function dateiKnopf(k, { text, ariaLabel, accept, aufnehmen, beiDatei, aktion }) {
  const id = k.nextId("u");
  const eingabe = h("input", {
    type: "file",
    id,
    accept,
    capture: aufnehmen ? "environment" : null,
    klasse: "anm-datei__eingabe",
    "data-aktion": aktion,
    "aria-label": ariaLabel || text,
  });
  eingabe.addEventListener("change", () => {
    const datei = eingabe.files && eingabe.files[0];
    eingabe.value = "";
    if (datei) beiDatei(datei);
  });
  return h("label", { klasse: "knopf knopf--sekundaer anm-datei", for: id }, eingabe, h("span", { "aria-hidden": "true" }, text));
}

function bildFehlerText(k, fehler) {
  const art = fehler instanceof BildFehler ? fehler.art : "nicht-lesbar";
  const schluessel = { typ: "typ", heic: "heic", "nicht-lesbar": "nichtLesbar", "zu-gross": "zuGross", "zu-klein": "zuKlein", leer: "leer" }[art] || "nichtLesbar";
  return k.t("fehler.bild." + schluessel);
}

function fotoDaten(k) {
  if (!k.a.spielerfoto || typeof k.a.spielerfoto !== "object") k.a.spielerfoto = { weg: null };
  return k.a.spielerfoto;
}

export const spielerfoto = {
  id: "spielerfoto",
  teile: () => ["haupt"],
  render(k) {
    const daten = fotoDaten(k);
    const meldung = h("p", { klasse: "anm-fehler", id: k.nextId("m"), role: "alert", hidden: true });
    const status = h("p", { klasse: "anm-hinweis", role: "status" });
    const bild = h("img", { klasse: "anm-vorschau-foto", alt: k.t("spielerfoto.vorschau"), hidden: true });
    const fehlerBild = h("p", { klasse: "anm-fehler", id: k.nextId("f"), hidden: true });
    function zeige() {
      const foto = k.bilder.spielerfoto;
      bild.hidden = !foto;
      if (foto) bild.src = k.vorschauUrl("spielerfoto", foto.bytes, foto.typ);
      anderes.hidden = !foto;
      machen.hidden = !!foto;
      waehlen.hidden = !!foto;
    }
    async function neu(datei) {
      meldung.hidden = true;
      try {
        k.bilder.spielerfoto = await verarbeiteSpielerfoto(datei);
        status.textContent = k.t("spielerfoto.hinzugefuegt");
        zeige();
        k.aenderung();
      } catch (fehler) {
        meldung.textContent = bildFehlerText(k, fehler);
        meldung.hidden = false;
      }
    }
    const machen = dateiKnopf(k, { text: k.t("spielerfoto.machen"), accept: "image/*", aufnehmen: true, beiDatei: neu, aktion: "spielerfoto-machen" });
    const waehlen = dateiKnopf(k, { text: k.t("spielerfoto.waehlen"), accept: "image/*", beiDatei: neu, aktion: "spielerfoto-waehlen" });
    const anderes = dateiKnopf(k, { text: k.t("spielerfoto.anderes"), accept: "image/*", beiDatei: neu, aktion: "spielerfoto-anderes" });
    const block = h("div", { klasse: "anm-feld anm-block", "data-feld": "spielerfoto.bild" },
      fehlerBild,
      h("div", { klasse: "anm-knoepfe" }, machen, waehlen, anderes),
      meldung,
      status,
      h("div", { klasse: "anm-vorschau" }, bild),
      h("p", { klasse: "anm-hinweis" }, k.t("spielerfoto.zugeschnitten")));
    k.bedingt(block, () => ["foto", "datei"].includes(daten.weg));
    zeige();
    return {
      titel: k.t("spielerfoto.titel"),
      inhalt: [
        ...absaetze(k.t("spielerfoto.hinweis"), "anm-hinweis"),
        kartenAuswahl(k, {
          pfad: "spielerfoto.weg",
          optionen: ["foto", "datei", "verein"].map((w) => ({ wert: w, label: k.t("spielerfoto." + w), hinweis: k.hatT("spielerfoto." + w + "Hinweis") ? k.t("spielerfoto." + w + "Hinweis") : null })),
        }),
        block,
      ],
    };
  },
  pruefe(k) {
    const daten = fotoDaten(k);
    const f = fehlerWenn(!daten.weg, "spielerfoto.weg", k.t("fehler.spielerfoto"));
    if (["foto", "datei"].includes(daten.weg) && !k.bilder.spielerfoto) f.push({ feld: "spielerfoto.bild", meldung: k.t("fehler.spielerfotoBild") });
    return f;
  },
};

function nachweisKarte(k, u) {
  const texte = k.unterlage(u);
  const name = texte.name;
  if (!k.bilder.nachweise[u.id]) k.bilder.nachweise[u.id] = [];
  const dateien = k.bilder.nachweise[u.id];
  const status = h("p", { klasse: "anm-hinweis", role: "status" });
  const meldung = h("p", { klasse: "anm-fehler", id: k.nextId("m"), role: "alert", hidden: true });
  const liste = h("ul", { klasse: "anm-dateien", role: "list" });
  function zeige() {
    liste.textContent = "";
    dateien.forEach((d, i) => {
      const vorschau =
        d.typ === "application/pdf"
          ? h("span", { klasse: "anm-dateien__pdf", "aria-hidden": "true" }, "PDF")
          : h("img", { klasse: "anm-dateien__bild", src: k.vorschauUrl(d, d.bytes, d.typ), alt: k.t("nachweise.vorschau", { datei: d.name }) });
      const entfernen = knopf(k.t("nachweise.entfernen"), {
        sekundaer: true,
        ariaLabel: k.t("nachweise.entfernenLang", { datei: d.name }),
        beiKlick: () => {
          dateien.splice(i, 1);
          status.textContent = k.t("nachweise.entfernt");
          zeige();
          k.aenderung();
        },
      });
      liste.append(h("li", { klasse: "anm-dateien__eintrag" }, vorschau, h("span", { klasse: "anm-dateien__name" }, d.name), entfernen));
    });
  }
  async function neu(datei) {
    meldung.hidden = true;
    try {
      dateien.push(await verarbeiteNachweis(datei));

      k.a.nachweise[u.id] = "habe";
      status.textContent = k.t("nachweise.hinzugefuegt");
      zeige();
      k.aenderung();
    } catch (fehler) {
      meldung.textContent = bildFehlerText(k, fehler);
      meldung.hidden = false;
    }
  }
  const knoepfe = h("div", { klasse: "anm-block", "data-feld": "nachweis." + u.id },
    h("p", { klasse: "anm-fehler", id: k.nextId("f"), hidden: true }),
    h("div", { klasse: "anm-knoepfe" },
      dateiKnopf(k, { text: k.t("nachweise.foto"), ariaLabel: k.t("nachweise.foto") + ": " + name, accept: "image/*", aufnehmen: true, beiDatei: neu, aktion: "nachweis-foto" }),
      dateiKnopf(k, { text: k.t("nachweise.datei"), ariaLabel: k.t("nachweise.datei") + ": " + name, accept: "image/*,application/pdf", beiDatei: neu, aktion: "nachweis-datei" })),
    meldung,
    status,
    liste);
  k.bedingt(knoepfe, () => k.a.nachweise[u.id] === "habe");
  zeige();
  const einzelheiten = [texte.warum, texte.wie, texte.wo].some(Boolean)
    ? h("details", { klasse: "anm-einzelheiten" },
        h("summary", {}, k.t("allgemein.mehrErfahren")),
        texte.warum ? h("p", {}, texte.warum) : null,
        texte.wie ? h("p", {}, h("strong", {}, k.t("nachweise.wie") + " "), texte.wie) : null,
        texte.wo ? h("p", {}, h("strong", {}, k.t("nachweise.wo") + " "), texte.wo) : null)
    : null;
  return h("section", { klasse: "anm-nachweis", "data-unterlage": u.id },
    kartenAuswahl(k, {
      pfad: "nachweise." + u.id,
      legende: name,
      hinweis: [texte.kurz || "", k.hatT("nachweise.art." + u.art) ? k.t("nachweise.art." + u.art) : ""].filter(Boolean).join(" "),
      optionen: [
        { wert: "habe", label: k.t("nachweise.habe") },
        { wert: "fehlt", label: k.t("nachweise.fehlt") },
      ],
    }),
    einzelheiten,
    knoepfe,
    vereinsKasten(k, h("p", {}, [u.id, u.art, u.wann, u.quelle || k.quelleFuer("unterlagen", u.id) || k.t("demo.keineQuelle")].filter(Boolean).join(" · "))));
}

export const nachweise = {
  id: "nachweise",
  teile: () => ["haupt"],
  render(k) {
    const e = k.ergebnis() || {};
    const liste = (e.unterlagen || []).filter((u) => u.nachweis);
    if (!k.a.nachweise || typeof k.a.nachweise !== "object") k.a.nachweise = {};
    for (const u of liste) if (!k.a.nachweise[u.id]) k.a.nachweise[u.id] = "fehlt";
    return {
      titel: k.t("nachweise.titel"),
      inhalt: [
        ...absaetze(k.t("nachweise.hinweis"), "anm-hinweis"),
        liste.length ? h("div", { klasse: "anm-nachweise" }, liste.map((u) => nachweisKarte(k, u))) : h("p", { klasse: "anm-text" }, k.t("nachweise.leer")),
      ],
    };
  },
  pruefe(k) {
    const e = k.ergebnis() || {};
    const f = [];
    for (const u of (e.unterlagen || []).filter((x) => x.nachweis)) {
      if (k.a.nachweise && k.a.nachweise[u.id] === "habe" && !(k.bilder.nachweise[u.id] || []).length) {
        f.push({ feld: "nachweis." + u.id, meldung: k.t("fehler.nachweisDatei") });
      }
    }
    return f;
  },
};

const FAMILIE = ["mitglied", "sorgeberechtigte", "sorgeberechtigte_beide", "kontoinhaber", "spieler"];

const REIHENFOLGE = ["mitglied", "sorgeberechtigte", "sorgeberechtigte_2", "kontoinhaber", "spieler"];
const FREIWILLIG = ["spieler", "sorgeberechtigte_2"];

const OHNE_MARKIERUNG = ["hfv_antrag.spieler"];

export function unterschriftenPlan(k) {
  const e = k.ergebnis() || {};
  const formulare = (k.konfig.formulare && k.konfig.formulare.formulare) || {};
  const papier = k.a.unterschriftWeg === "papier";
  const hfvBildschirm = k.hfvAmBildschirm();
  const personen = new Map();
  const stift = [];
  const merke = (schluessel, stelle) => {
    if (!personen.has(schluessel)) personen.set(schluessel, []);
    if (!personen.get(schluessel).includes(stelle)) personen.get(schluessel).push(stelle);
  };
  for (const s of Array.isArray(e.unterschriften) ? e.unterschriften : []) {
    if (!FAMILIE.includes(s.wer)) continue;

    const eintrag = formulare[s.formular];
    const digital = !papier && (eintrag && eintrag.digitaleUnterschrift ? eintrag.digitaleUnterschrift === "erlaubt" || hfvBildschirm : !eintrag);
    if (!digital) {
      if (!stift.includes(s.formular)) stift.push(s.formular);
      continue;
    }

    if (s.wer === "sorgeberechtigte_beide") {
      if (hfvBildschirm) merke("sorgeberechtigte_2", s.formular + "." + s.stelleKey);
      continue;
    }

    merke(s.wer, s.formular + "." + s.stelleKey);
  }

  let alias = null;
  if (personen.has("kontoinhaber")) {
    const ziel = { mitglied: "mitglied", sorgeberechtigt: "sorgeberechtigte" }[(k.a.zahlung || {}).kontoinhaber];
    if (ziel && personen.has(ziel)) {
      alias = ziel;
      for (const stelle of personen.get("kontoinhaber")) merke(ziel, stelle);
      personen.delete("kontoinhaber");
    }
  }

  const liste = REIHENFOLGE.filter((s) => personen.has(s)).map((schluessel) => {
    const stellen = personen.get(schluessel);
    const freiwillig = FREIWILLIG.includes(schluessel);

    return { schluessel, stellen, freiwillig, stiftBeiLeer: freiwillig && stellen.some((x) => !OHNE_MARKIERUNG.includes(x)), stiftBeiLeerBlatt: freiwillig && stellen.some((x) => !OHNE_MARKIERUNG.includes(x) && !x.startsWith("abmeldung.")) };
  });
  return { liste, stift, alias, papier, hfvBildschirm };
}

function personenName(k, schluessel) {
  const sorge = k.a.sorgeberechtigte || [];
  const voll = (p) => sauber([p && p.vorname, p && p.nachname].filter(Boolean).join(" "));
  if (schluessel === "sorgeberechtigte") return voll(sorge[0]) || k.t("unterschriften.person.ersteSorge");
  if (schluessel === "sorgeberechtigte_2") return voll(sorge[1]);
  if (schluessel === "kontoinhaber") return sauber([(k.a.zahlung || {}).kiVorname, (k.a.zahlung || {}).kiNachname].filter(Boolean).join(" "));
  return "";
}

export function unterschriftTitel(k, schluessel) {
  if (schluessel === "mitglied") return k.t("unterschriften.person.mitglied");
  if (schluessel === "spieler") return k.t("unterschriften.person.spieler");
  if (schluessel === "sorgeberechtigte") {
    return k.a.sorge === "beide" ? k.t("unterschriften.person.ersteEltern") : k.t("unterschriften.person.sorgeberechtigte", { person: personenName(k, schluessel) });
  }
  if (schluessel === "sorgeberechtigte_2") return k.t("unterschriften.person.zweiteEltern");
  return k.t("unterschriften.person.kontoinhaber", { person: personenName(k, schluessel) });
}

function formularName(k, id) {
  return k.rt("formulare", id) || id;
}

function stelleName(k, schluessel) {
  return k.rt("unterschriften", schluessel) || formularName(k, schluessel.split(".")[0]);
}

function hatVerbandsblaetter(k) {
  const e = k.ergebnis() || {};
  const defs = (k.konfig.formulare && k.konfig.formulare.formulare) || {};
  return (Array.isArray(e.formulare) ? e.formulare : []).some((f) => defs[f] && defs[f].digitaleUnterschrift === "nicht_erlaubt");
}

function satzungBlock(k) {
  const bildschirm = k.a.unterschriftWeg !== "papier";
  const url = (k.konfig.verein && k.konfig.verein.satzungUrl) || "";
  const id = k.nextId("c");
  const hinweisId = id + "-h";
  const eingabe = h("input", {
    type: "checkbox",
    id,
    name: "satzung",
    "data-pfad": "satzung",
    klasse: "anm-karte__eingabe anm-karte__eingabe--kasten",
    "aria-describedby": bildschirm ? null : hinweisId,
    "aria-required": bildschirm ? "true" : null,
  });
  eingabe.checked = k.a.satzung === true;
  eingabe.addEventListener("change", () => {
    k.a.satzung = eingabe.checked;
    k.aenderung();
  });

  const karte = h("label", { klasse: "anm-karte anm-karte--kasten", for: id },
    eingabe,
    h("span", { klasse: "anm-karte__text" },
      h("span", { klasse: "anm-karte__titel" }, k.t("unterschriften.satzung.label")),
      bildschirm ? null : h("span", { klasse: "anm-karte__hinweis", id: hinweisId }, k.t("unterschriften.satzung.freiwillig"))));
  const link = url
    ? h("a", { href: url, target: "_blank", rel: "noopener", "data-aktion": "satzung-lesen" }, k.t("unterschriften.satzung.link"), h("span", { klasse: "sr-only" }, " (" + k.t("unterschriften.satzung.linkZusatz") + ")"))
    : k.t("unterschriften.satzung.ohneLink");
  return h("div", { klasse: "anm-block anm-satzung" },
    h("p", { klasse: "anm-hinweis" }, k.t("unterschriften.satzung.erklaerung")),
    h("p", { klasse: "anm-text anm-satzung__link" }, link),
    h("div", { klasse: "anm-feld", "data-feld": "satzung" }, h("p", { klasse: "anm-fehler", id: id + "-f", hidden: true }), karte));
}

export const unterschriften = {
  id: "unterschriften",
  teile: () => ["haupt"],
  async vorPruefung(k) {

    await Promise.all(Array.from(k.wartend));
  },
  render(k) {
    if (!k.a.unterschriftWeg) k.a.unterschriftWeg = "bildschirm";
    if (!k.a.hfvUnterschrift) k.a.hfvUnterschrift = "training";
    const unten = h("div", { klasse: "anm-unterschriften" });

    const hfvBildschirm = k.hfvAmBildschirm();

    function zeichne() {
      unten.textContent = "";
      const plan = unterschriftenPlan(k);
      const nachEinfuegen = [];

      unten.append(satzungBlock(k));
      if (zweiterElternteilNoetig(k.a)) {
        unten.append(h("div", { klasse: "anm-block", "data-zweiter-elternteil": "" }, hinweisKasten("offen", k.t("pruefen.hinweisArt.warnung"), absaetze(k.t(hfvBildschirm ? "sorge.zweiterAmBildschirm" : "sorge.zweiterMitStift")))));
      }
      if (plan.liste.length) {
        unten.append(h("p", { klasse: "anm-hinweis" }, k.t("unterschriften.hierHinweis")));
        for (const person of plan.liste) {
          const name = personenName(k, person.schluessel);
          const titel = unterschriftTitel(k, person.schluessel);

          const giltPunkte = Array.from(new Set(person.stellen.map((s) => stelleName(k, s))));
          const gilt = { titel: k.t("unterschriften.giltFuer"), mehrere: k.t("unterschriften.giltFuerBlaetter", { n: giltPunkte.length }), punkte: giltPunkte };

          const hinweisKey = { spieler: "unterschriften.person.spielerHinweis", sorgeberechtigte_2: "unterschriften.person.zweiteHinweis" }[person.schluessel];
          const feld = unterschriftFeld({
            speicher: k.strichSpeicher(person.schluessel),
            id: k.nextId("s"),
            wer: person.schluessel,
            feld: "unterschrift." + person.schluessel,
            titel: person.schluessel === "spieler" ? titel + " " + k.t("allgemein.freiwillig") : titel,
            hinweisListe: gilt,
            zusatz: person.freiwillig && hinweisKey ? k.t(hinweisKey).replace(/\n/g, " ") : null,
            texte: {
              ariaLabel: k.t("unterschriften.ariaLabel"),
              stand0: k.t("unterschriften.stand0"),
              standOk: k.t("unterschriften.standOk"),
              standZuKurz: k.t("unterschriften.standZuKurz"),
              loeschen: k.t("unterschriften.loeschen"),
              loeschenLang: k.t("unterschriften.loeschenLang", { person: name || titel }),
            },
            beiAenderung: () => {
              const p = feld.holePng().then((png) => {
                if (png) k.bilder.unterschriften[person.schluessel] = png;
                else delete k.bilder.unterschriften[person.schluessel];
                k.aenderung();
              });
              k.wartend.add(p);
              p.then(() => k.wartend.delete(p), () => k.wartend.delete(p));
            },
          });
          unten.append(feld.element);
          nachEinfuegen.push(() => feld.nachEinfuegen());
        }
      }
      if (plan.stift.length) {
        unten.append(
          h("h3", { klasse: "anm-zwischentitel" }, k.t("unterschriften.stiftTitel")),
          h("p", { klasse: "anm-hinweis" }, k.t(plan.papier ? "unterschriften.stiftHinweisPapier" : "unterschriften.stiftHinweis")),
          h("p", { klasse: "anm-hinweis" }, k.t("unterschriften.stiftListe")),
          h("ul", { klasse: "anm-liste-punkte" }, plan.stift.map((f) => h("li", {}, formularName(k, f)))),
          kartenAuswahl(k, {
            pfad: "hfvUnterschrift",
            legende: k.t("unterschriften.hfvTitel"),
            optionen: [
              { wert: "training", label: k.t("unterschriften.training") },
              { wert: "selbst_drucken", label: k.t("unterschriften.selbst_drucken"), hinweis: k.t("unterschriften.selbst_druckenHinweis") },
            ],
          }));
      }
      if (!plan.liste.length && !plan.stift.length) unten.append(h("p", { klasse: "anm-text" }, k.t("unterschriften.nichts")));

      const defs = (k.konfig.formulare && k.konfig.formulare.formulare) || {};
      const zeilen = Object.keys(defs).filter((id) => defs[id].digitaleUnterschriftGrund).map((id) =>
        h("li", {}, id + ": " + defs[id].digitaleUnterschrift + (defs[id].digitaleUnterschrift === "erlaubt" ? "" : " (Schalter unterschriftHfv: " + (hfvBildschirm ? "bildschirm" : "stift") + ")") + " – " + defs[id].digitaleUnterschriftGrund));
      if (zeilen.length) unten.append(vereinsKasten(k, h("ul", {}, zeilen)));
      k.nachRender(() => nachEinfuegen.forEach((f) => f()));
    }

    const inhalt = [
      kartenAuswahl(k, {
        pfad: "unterschriftWeg",
        optionen: [
          hfvBildschirm
            ? { wert: "bildschirm", label: k.t("unterschriften.weg.bildschirmAlles"), hinweis: k.t(hatVerbandsblaetter(k) ? "unterschriften.weg.bildschirmAllesHinweis" : "unterschriften.weg.bildschirmHinweis") }
            : { wert: "bildschirm", label: k.t("unterschriften.weg.bildschirm"), hinweis: k.t("unterschriften.weg.bildschirmHinweis") },
          { wert: "papier", label: k.t("unterschriften.weg.papier"), hinweis: k.t("unterschriften.weg.papierHinweis") },
        ],
        beiWahl: () => {
          zeichne();

          k.nachRenderSofort();
        },
      }),
      unten,
    ];
    zeichne();
    return { titel: k.t("unterschriften.titel"), inhalt };
  },
  pruefe(k) {
    const plan = unterschriftenPlan(k);
    const f = fehlerWenn(!k.a.unterschriftWeg, "unterschriftWeg", k.t("fehler.unterschriftWeg"));

    if (k.a.unterschriftWeg === "bildschirm" && k.a.satzung !== true) f.push({ feld: "satzung", meldung: k.t("fehler.satzung") });
    for (const person of plan.liste) {
      if (person.freiwillig) continue;
      if (!k.bilder.unterschriften[person.schluessel]) f.push({ feld: "unterschrift." + person.schluessel, meldung: k.t("fehler.unterschrift") });
    }
    if (plan.stift.length && !k.a.hfvUnterschrift) f.push({ feld: "hfvUnterschrift", meldung: k.t("fehler.hfvUnterschrift") });
    return f;
  },
  beimVerlassen(k) {
    const plan = unterschriftenPlan(k);
    const u = k.bilder.unterschriften;

    const erlaubt = new Set(plan.liste.map((p) => p.schluessel));
    for (const schluessel of Object.keys(u)) if (!erlaubt.has(schluessel)) delete u[schluessel];
  },
};
