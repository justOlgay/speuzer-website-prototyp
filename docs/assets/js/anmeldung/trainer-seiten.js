/*
  Die 14 Seiten der Seite „Neu im Trainerteam“ (Aufbau und Aussehen wie im Entwurf ap1/ und wie die Seiten des Anmelde-Assistenten:
  seiten-person.js, seiten-verein.js, seiten-unterlagen.js, seiten-ende.js, seiten-zugang.js).

    code            Zugang mit Code (erster Bildschirm, solange der Zugang nicht frei ist)
    start           Willkommen, so läuft es
    person          Du: Name, Geburtsdatum, Anschrift, Handy, E-Mail
    einsatz         Abteilung, Mannschaft (Karneval: Gruppe), Rolle, seit wann, wann
    notfall         Notfallkontakt (freiwillig)
    erfahrung       Erfahrung und Qualifikationen, Erste-Hilfe-Kurs (alles freiwillig)
    ausstattung     Größen für die Trainerausstattung: Shirt, Pullover, Anzug, Regenjacke (alles freiwillig; seit 26.11.2026)
    foto            Passfoto
    kodex           Verhaltenskodex lesen und bestätigen
    selbstauskunft  Selbstauskunft zur Kinder- und Jugendarbeit
    zeugnis         erweitertes Führungszeugnis, Antrag auf Gebührenbefreiung
    unterschriften  Unterschrift, Ort und Datum, Satzung
    pruefen         Zusammenfassung mit „Ändern“
    fertig          Datei erstellen, teilen, herunterladen, so geht es weiter

  Eine Seite ist ein Objekt { id, abschnitt, voll?, ohneWeiter?, ohneLoeschen?, render(k), pruefe(k), vorPruefung?(k), beimVerlassen?(k) }:
    render(k)   liefert { titel, inhalt, weiterText?, nach? } (wie in seiten-person.js; nach steht hinter den Knöpfen)
    pruefe(k)   die Fehler [{ feld, meldung }] aus trainer-regeln.js; leer = „Weiter“ geht
    voll        Seitenkopf mit Überschrift und Lead (sonst der kompakte Kopf); abschnitt: Eintrag der Abschnittszeile oder null
  Der Kontext k kommt aus trainer.js (siehe dort). Alle Texte stehen in texte/trainer-de.js (k.t, k.tl). Die Namen der Einsichtnehmenden
  bildet nur trainer-einsicht.js.
*/

import { h, absaetze, textfeld, kartenAuswahl, kaestchenListe, datumFelder, knopf, hinweisKasten, anhaengen } from "./bausteine.js";
import { sauber } from "./hilfen.js";
import { verarbeiteSpielerfoto, BildFehler } from "./bilder.js";
import { unterschriftFeld } from "./unterschrift.js";
import { pruefeCode, normalisiereCode } from "./zugang.js";
import { einsichtNamen } from "./trainer-einsicht.js";
import { karte, punktListe, nummerierteListe, mitLink, sichereUrl, blattSinnbildUrl, auswahlFeld, dateiKnopf, pflichtKaestchen, speichern, teilenMoeglich, kopiereAdresse, kopiereBeimTeilen, oeffneFensterSofort, zeigeInFenster } from "./trainer-bausteine.js";
import { pruefeSeite, ABTEILUNGEN, ROLLEN, WOCHENTAGE, AUSSTATTUNG_ARTIKEL, GROESSEN, abteilungenFuer, mannschaftenFuer, datumText, fristVon, schnupperWoerter } from "./trainer-regeln.js";

// ---------- Reihenfolge und Abschnitte ----------

export const REIHENFOLGE = ["code", "start", "person", "einsatz", "notfall", "erfahrung", "ausstattung", "foto", "kodex", "selbstauskunft", "zeugnis", "unterschriften", "pruefen", "fertig"];

// Abschnitte der Zeile oben („Du · Einsatz · …“) in der Reihenfolge der Anzeige; code und start haben keinen.
export const ABSCHNITTE = ["du", "einsatz", "unterlagen", "zeugnis", "unterschrift", "fertig"];

export const ABSCHNITT_VON = {
  person: "du",
  einsatz: "einsatz", notfall: "einsatz", erfahrung: "einsatz", ausstattung: "einsatz",
  foto: "unterlagen", kodex: "unterlagen", selbstauskunft: "unterlagen",
  zeugnis: "zeugnis",
  unterschriften: "unterschrift",
  pruefen: "fertig", fertig: "fertig",
};

// ---------- Kleine Helfer ----------

// Kontext für die Regeln (trainer-regeln.js)
const regelKontext = (k) => ({ heute: k.heute, roh: k.roh, medien: k.medien, konfig: k.konfig, zugang: k.zugang });
const regelnFuer = (id) => (k) => pruefeSeite(id, k.a, regelKontext(k));

// Fehlertext zu einem Fehler beim Verkleinern des Fotos (bilder.js)
function bildFehlerText(k, fehler) {
  const art = fehler instanceof BildFehler ? fehler.art : "nicht-lesbar";
  const schluessel = { typ: "typ", heic: "heic", "nicht-lesbar": "nichtLesbar", "zu-gross": "zuGross", "zu-klein": "zuKlein", leer: "leer" }[art] || "nichtLesbar";
  return k.text("fehler.bild." + schluessel);
}

const verbinde = (trenner, ...teile) => teile.filter((x) => x !== null && x !== undefined && x !== "").join(trenner);

// Zwei Byte-Folgen mit gleichem Inhalt? (null gilt nur mit null als gleich)
function gleicheBytes(x, y) {
  if (!x || !y) return !x && !y;
  if (x.length !== y.length) return false;
  for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return false;
  return true;
}

// ---------- code ----------

export const code = {
  id: "code",
  abschnitt: null,
  voll: true,
  ohneLoeschen: true,
  render(k) {
    const z = k.zugang;
    const id = k.nextId("f");
    const hinweisId = id + "-h";
    // Das Feld liegt nicht in den Antworten (k.a): Der Code ist keine Angabe zur Person und geht nie in die Dateien.
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
      "aria-describedby": hinweisId,
      klasse: "anm-eingabe anm-eingabe--code",
    });
    eingabe.value = z.eingabe;
    eingabe.addEventListener("input", () => {
      // Wer tippt, korrigiert: Die alte Meldung verschwindet, die nächste Prüfung kommt mit „Weiter“.
      z.eingabe = eingabe.value;
      z.geprueft = "";
      z.gueltig = false;
      k.fehlerLoeschen();
    });
    const feld = h("div", { klasse: "anm-feld", "data-feld": "code" },
      h("label", { klasse: "anm-label", for: id }, k.text("code.label")),
      h("p", { klasse: "anm-fehler", id: id + "-f", hidden: true }),
      eingabe,
      h("p", { klasse: "anm-hinweis", id: hinweisId }, k.text("code.hinweis")));
    // „Noch keinen Code? Code anfragen“: eine E-Mail an die Geschäftsstelle mit Betreff, ohne Text und ohne Angaben zur Person
    const kein = k.mail
      ? h("p", { klasse: "anm-hinweis" }, mitLink(k.text("code.kein"), h("a", { href: "mailto:" + k.mail + "?subject=" + encodeURIComponent(k.text("code.anfrageBetreff")), "data-aktion": "code-anfragen" }, k.text("code.keinLink"))))
      : null;
    return {
      titel: k.text("code.titel"),
      weiterText: k.text("code.weiter"),
      inhalt: [...absaetze(k.text("code.text")), feld],
      nach: kein ? h("div", { klasse: "anm-block anm-code-hilfen" }, kein) : null,
    };
  },
  // Rechnet den Prüfwert (asynchron: crypto.subtle) und merkt sich das Ergebnis zum eingegebenen Text.
  async vorPruefung(k) {
    const z = k.zugang;
    const r = await pruefeCode(z.eingabe, z.pruefwerte);
    z.geprueft = r.code;
    z.gueltig = r.gueltig;
  },
  pruefe: regelnFuer("code"),
  beimVerlassen(k) {
    const z = k.zugang;
    if (z.gueltig && z.geprueft === normalisiereCode(z.eingabe)) k.zugangFreigeben(z.geprueft);
  },
};

// ---------- start ----------

export const start = {
  id: "start",
  abschnitt: null,
  voll: true,
  render(k) {
    const w = schnupperWoerter(k.konfig);
    return {
      titel: k.text("start.titel"),
      weiterText: k.text("start.los"),
      inhalt: [
        ...absaetze(k.text("start.text")),
        karte(k, k.text("start.ablaufTitel"), nummerierteListe(k.textListe("start.ablauf"))),
        karte(k, k.text("start.brauchstTitel"), punktListe(k.textListe("start.brauchst"))),
        karte(k, k.text("start.wissenTitel"), punktListe(k.textListe("start.wissen", { zeitraum: w.zeitraum }))),
      ],
    };
  },
  pruefe: regelnFuer("start"),
};

// ---------- person ----------

export const person = {
  id: "person",
  abschnitt: "du",
  render(k) {
    return {
      titel: k.text("person.titel"),
      weiterText: k.text("person.weiter"),
      inhalt: [
        ...absaetze(k.text("person.hinweis"), "anm-hinweis"),
        textfeld(k, { pfad: "vorname", label: k.text("person.vorname"), autocomplete: "given-name", maxlength: 40 }),
        textfeld(k, { pfad: "nachname", label: k.text("person.nachname"), autocomplete: "family-name", maxlength: 40 }),
        datumFelder(k, { pfad: "geburtsdatum", legende: k.text("person.geburtsdatum"), hinweis: k.text("allgemein.datumHinweis"), autocompleteVorsatz: "bday" }),
        textfeld(k, { pfad: "anschrift.strasse", label: k.text("person.strasse"), autocomplete: "address-line1", maxlength: 60 }),
        h("div", { klasse: "anm-zeile anm-zeile--plz" },
          textfeld(k, { pfad: "anschrift.plz", label: k.text("person.plz"), autocomplete: "postal-code", inputmode: "numeric", maxlength: 5, ltr: true, klasse: "anm-feld--plz" }),
          textfeld(k, { pfad: "anschrift.ort", label: k.text("person.ort"), autocomplete: "address-level2", maxlength: 50 })),
        textfeld(k, { pfad: "handy", label: k.text("person.handy"), typ: "tel", autocomplete: "tel", maxlength: 30, ltr: true }),
        textfeld(k, { pfad: "email", label: k.text("person.email"), typ: "email", autocomplete: "email", maxlength: 80, ltr: true }),
      ],
    };
  },
  pruefe: regelnFuer("person"),
};

// ---------- einsatz ----------

export const einsatz = {
  id: "einsatz",
  abschnitt: "einsatz",
  render(k) {
    const w = schnupperWoerter(k.konfig);
    // Welche Abteilungen die Seite anbietet (konfig.abteilungen). Gibt es nur eine, steht sie fest: Die Frage nach der Abteilung entfällt.
    const abteilungen = abteilungenFuer(k.konfig);
    if (abteilungen.length === 1 && k.a.abteilung !== abteilungen[0]) {
      k.a.abteilung = abteilungen[0];
      k.a.mannschaft = "";
      k.a.rolle = null;
    }
    const fristHinweis = () => {
      const frist = fristVon(k.a.seit, k.konfig);
      return frist ? k.text("einsatz.seitHinweis", { dauer: w.dauer, frist: datumText(frist) }) : k.text("einsatz.seitHinweisOhneFrist", { dauer: w.dauer });
    };
    // Die Frist folgt dem Datum: Beginn plus Schnupperphase. Ohne gültiges Datum steht nur die Dauer da.
    const seit = datumFelder(k, { pfad: "seit", legende: k.text("einsatz.seit"), hinweis: fristHinweis(), zukunftErlaubt: true });
    const hinweisEl = seit.querySelector(".anm-hinweis");
    k.aktualisierer.push(() => {
      const text = fristHinweis();
      if (hinweisEl.textContent !== text) hinweisEl.textContent = text;
    });

    // Mannschaft (Karneval: Gruppe) und Rolle gibt es erst mit der Abteilung; beide hängen von ihr ab. Wechselt sie, wird neu gezeichnet,
    // und was nicht mehr passt (eine Mannschaft der anderen Abteilung, Torwarttrainer im Karneval), ist wieder leer.
    const abhaengig = h("div", { klasse: "tr-abhaengig" });
    const zeichneAbhaengig = () => {
      abhaengig.textContent = "";
      const abteilung = k.a.abteilung;
      if (!ABTEILUNGEN.includes(abteilung)) return;
      const liste = mannschaftenFuer(k.konfig, abteilung);
      const label = k.text(abteilung === "karneval" ? "einsatz.gruppe" : "einsatz.mannschaft");
      anhaengen(abhaengig, [
        liste.length ? auswahlFeld(k, { pfad: "mannschaft", label, optionen: liste }) : textfeld(k, { pfad: "mannschaft", label, maxlength: 40 }),
        kartenAuswahl(k, { pfad: "rolle", legende: k.text("einsatz.rolle"), optionen: ROLLEN[abteilung].map((r) => ({ wert: r, label: k.text("einsatz.rollen." + r) })) }),
      ]);
    };
    const beiAbteilung = () => {
      const liste = mannschaftenFuer(k.konfig, k.a.abteilung);
      if (liste.length && !liste.includes(k.a.mannschaft)) k.a.mannschaft = "";
      if (!ROLLEN[k.a.abteilung].includes(k.a.rolle)) k.a.rolle = null;
      zeichneAbhaengig();
    };
    zeichneAbhaengig();
    return {
      titel: k.text("einsatz.titel"),
      weiterText: k.text("einsatz.weiter"),
      inhalt: [
        ...(abteilungen.length > 1 ? [kartenAuswahl(k, { pfad: "abteilung", legende: k.text("einsatz.abteilung"), beiWahl: beiAbteilung, optionen: abteilungen.map((a) => ({ wert: a, label: k.text("einsatz.abteilungen." + a) })) })] : []),
        abhaengig,
        seit,
        kaestchenListe(k, { pfad: "tage", legende: k.text("einsatz.tage"), hinweis: k.text("einsatz.tageHinweis"), optionen: WOCHENTAGE.map((t) => ({ wert: t, label: k.text("einsatz.wochentage." + t) })) }),
      ],
    };
  },
  pruefe: regelnFuer("einsatz"),
};

// ---------- notfall ----------

export const notfall = {
  id: "notfall",
  abschnitt: "einsatz",
  render(k) {
    return {
      titel: k.text("notfall.titel"),
      weiterText: k.text("notfall.weiter"),
      inhalt: [
        ...absaetze(k.text("notfall.hinweis"), "anm-hinweis"),
        textfeld(k, { pfad: "notfall.name", label: k.text("notfall.name"), maxlength: 60, pflicht: false }),
        textfeld(k, { pfad: "notfall.beziehung", label: k.text("notfall.beziehung"), maxlength: 40, pflicht: false }),
        textfeld(k, { pfad: "notfall.telefon", label: k.text("notfall.telefon"), typ: "tel", autocomplete: "off", maxlength: 30, ltr: true, pflicht: false }),
      ],
    };
  },
  pruefe: regelnFuer("notfall"),
};

// ---------- erfahrung ----------

export const erfahrung = {
  id: "erfahrung",
  abschnitt: "einsatz",
  // Alles auf dieser Seite ist freiwillig (25.11.2026): ein Textfeld statt Beruf, Erfahrung und sonstigen Qualifikationen, dazu das Datum des
  // Erste-Hilfe-Kurses (leer = keine Angabe).
  render(k) {
    return {
      titel: k.text("erfahrung.titel"),
      weiterText: k.text("erfahrung.weiter"),
      inhalt: [
        ...absaetze(k.text("erfahrung.hinweis"), "anm-hinweis"),
        textfeld(k, { pfad: "erfahrung", label: k.text("erfahrung.erfahrung"), hinweis: k.text("erfahrung.erfahrungHinweis"), zeilen: 3, maxlength: 300, freiwillig: true }),
        datumFelder(k, { pfad: "ersteHilfeAm", legende: k.text("erfahrung.ersteHilfe"), hinweis: k.text("allgemein.datumHinweisJetzt"), freiwillig: true }),
      ],
    };
  },
  pruefe: regelnFuer("erfahrung"),
};

// ---------- ausstattung ----------

export const ausstattung = {
  id: "ausstattung",
  abschnitt: "einsatz",
  // Alles auf dieser Seite ist freiwillig (26.11.2026): vier Auswahlfelder für die Größen der Trainerausstattung (Shirt, Pullover, Anzug,
  // Regenjacke), je Feld S bis 3XL oder „Bitte wählen“ (leer = keine Angabe). Die Felder tragen weder Pflicht noch „(freiwillig)“: Der Hinweis
  // darüber sagt es für die ganze Seite (wie auf „notfall“).
  render(k) {
    return {
      titel: k.text("ausstattung.titel"),
      weiterText: k.text("ausstattung.weiter"),
      inhalt: [
        ...absaetze(k.text("ausstattung.hinweis"), "anm-hinweis"),
        ...AUSSTATTUNG_ARTIKEL.map((artikel) => auswahlFeld(k, { pfad: "ausstattung." + artikel, label: k.text("ausstattung." + artikel), optionen: GROESSEN, pflicht: false })),
        h("p", { klasse: "anm-hinweis tr-fussnote" }, k.text("ausstattung.fussnote")),
      ],
    };
  },
  pruefe: regelnFuer("ausstattung"),
};

// ---------- foto ----------

export const foto = {
  id: "foto",
  abschnitt: "unterlagen",
  render(k) {
    const bild = h("img", { klasse: "anm-vorschau-foto", alt: k.text("foto.vorschauAlt") });
    const status = h("p", { klasse: "anm-status", role: "status" });
    const meldung = h("p", { klasse: "anm-fehler", id: k.nextId("m"), role: "alert", hidden: true });
    const fehlerFeld = h("p", { klasse: "anm-fehler", id: k.nextId("f"), hidden: true });
    const machen = dateiKnopf(k, { text: k.text("foto.machen"), aufnehmen: true, beiDatei: neu, aktion: "foto-machen" });
    const galerie = dateiKnopf(k, { text: k.text("foto.galerie"), beiDatei: neu, aktion: "foto-galerie" });
    const anderes = dateiKnopf(k, { text: k.text("foto.anderes"), beiDatei: neu, aktion: "foto-anderes" });
    // Vorschau, Meldung „Foto ist gespeichert.“ und „Anderes Foto wählen“ gibt es erst mit einem Foto.
    const vorhanden = h("div", { klasse: "anm-block" }, h("div", { klasse: "anm-vorschau" }, bild), status, h("div", { klasse: "anm-knoepfe" }, anderes));
    function zeige() {
      const bytes = k.medien.foto;
      vorhanden.hidden = !bytes;
      if (bytes) bild.src = k.vorschauUrl("foto", bytes, "image/jpeg");
    }
    // Das Foto wird verkleinert und mittig auf 3:4 zugeschnitten (bilder.js); es bleibt im Arbeitsspeicher.
    async function neu(datei) {
      meldung.hidden = true;
      try {
        const ergebnis = await verarbeiteSpielerfoto(datei);
        k.medien.foto = ergebnis.bytes;
        k.a.foto = true;
        status.textContent = k.text("foto.gespeichert");
        zeige();
        k.aenderung();
      } catch (fehler) {
        meldung.textContent = bildFehlerText(k, fehler);
        meldung.hidden = false;
      }
    }
    if (k.medien.foto) status.textContent = k.text("foto.gespeichert");
    zeige();
    return {
      titel: k.text("foto.titel"),
      weiterText: k.text("foto.weiter"),
      inhalt: [
        ...absaetze(k.text("foto.text"), "anm-hinweis"),
        h("div", { klasse: "anm-block", "data-feld": "foto" },
          fehlerFeld,
          h("div", { klasse: "anm-knoepfe" }, machen, galerie),
          meldung,
          vorhanden),
        h("p", { klasse: "anm-hinweis tr-fussnote" }, k.text("foto.fussnote")),
      ],
    };
  },
  pruefe: regelnFuer("foto"),
};

// ---------- kodex ----------

export const kodex = {
  id: "kodex",
  abschnitt: "unterlagen",
  render(k) {
    // Die ersten zwei Grundsätze stehen wörtlich da (Landessportbund Hessen); der Volltext öffnet als PDF (konfig.verein.kodexUrl).
    const adresse = sichereUrl(k.konfig.verein && k.konfig.verein.kodexUrl);
    const pdf = adresse
      ? h("p", {}, h("a", { href: adresse, target: "_blank", rel: "noopener", "data-aktion": "kodex-pdf" }, k.text("kodex.pdf"), h("span", { klasse: "sr-only" }, " (" + k.text("allgemein.oeffnetNeu") + ")")))
      : null;
    const lesen = h("details", { klasse: "anm-einzelheiten anm-mehr", "data-mehr": "", open: true },
      h("summary", {}, k.text("kodex.lesen")),
      h("div", { klasse: "anm-mehr__inhalt" },
        nummerierteListe(k.textListe("kodex.grundsaetze")),
        h("p", {}, k.text("kodex.weitere")),
        h("p", { klasse: "anm-hinweis tr-fussnote" }, k.text("kodex.quelle")),
        pdf));
    return {
      titel: k.text("kodex.titel"),
      weiterText: k.text("kodex.weiter"),
      inhalt: [
        ...absaetze(k.text("kodex.text")),
        lesen,
        pflichtKaestchen(k, { pfad: "kodexGelesen", label: k.text("kodex.gelesen") }),
        h("p", { klasse: "anm-hinweis" }, k.text("kodex.hinweis")),
      ],
    };
  },
  pruefe: regelnFuer("kodex"),
};

// ---------- selbstauskunft ----------

export const selbstauskunft = {
  id: "selbstauskunft",
  abschnitt: "unterlagen",
  render(k) {
    return {
      titel: k.text("selbstauskunft.titel"),
      weiterText: k.text("selbstauskunft.weiter"),
      inhalt: [
        ...absaetze(k.text("selbstauskunft.text")),
        hinweisKasten("info", k.text("selbstauskunft.kastenTitel"), punktListe(k.textListe("selbstauskunft.punkte"))),
        h("p", { klasse: "anm-hinweis tr-fussnote" }, k.text("selbstauskunft.hinweis")),
        pflichtKaestchen(k, { pfad: "selbstauskunft", label: k.text("selbstauskunft.zutreffend") }),
      ],
    };
  },
  pruefe: regelnFuer("selbstauskunft"),
};

// ---------- zeugnis ----------

export const zeugnis = {
  id: "zeugnis",
  abschnitt: "zeugnis",
  render(k) {
    const wahl = kartenAuswahl(k, {
      pfad: "zeugnis",
      optionen: [{ wert: "beantragen", label: k.text("zeugnis.wahl.beantragen") }, { wert: "vorhanden", label: k.text("zeugnis.wahl.vorhanden") }],
    });
    // „Antrag ansehen“: Der Antrag entsteht mit den Angaben der Person (trainer-pdf.js › vorschauAntrag) und öffnet in einem neuen Fenster.
    const status = h("p", { klasse: "anm-status", role: "status" });
    const meldung = h("p", { klasse: "anm-fehler", id: k.nextId("m"), role: "alert", hidden: true });
    const ansehen = knopf(k.text("zeugnis.ansehen"), {
      sekundaer: true,
      aktion: "antrag-ansehen",
      beiKlick: async () => {
        // Das Fenster öffnet sofort im Klick (sonst blockiert Safari es nach dem Warten), die Datei folgt.
        const fenster = oeffneFensterSofort();
        meldung.hidden = true;
        status.textContent = k.text("zeugnis.ansehenArbeit");
        try {
          const bytes = await k.antragVorschau();
          zeigeInFenster(fenster, bytes, "application/pdf", "Antrag_Gebuehrenbefreiung.pdf");
        } catch (fehler) {
          if (fenster && !fenster.closed) fenster.close();
          meldung.textContent = k.text("fertig.fehler." + k.fehlerSchluessel(fehler));
          meldung.hidden = false;
        }
        status.textContent = "";
      },
    });
    const antrag = karte(k, k.text("zeugnis.karteTitel"),
      h("p", { klasse: "anm-text" }, k.text("zeugnis.karteText")),
      h("img", { klasse: "tr-blatt-vorschau", src: blattSinnbildUrl(), alt: k.text("zeugnis.blattAlt"), width: 210, height: 297 }),
      h("div", { klasse: "anm-knoepfe" }, ansehen),
      meldung,
      status);
    // Hat die Person schon ein Zeugnis, entfallen Antrag und die Schritte davor: Es bleibt das persönliche Zeigen.
    const schritte = k.textListe("zeugnis.schritte", { lang: einsichtNamen(k.konfig, "lang") }).map((x) => h("li", {}, x));
    const vorhanden = () => k.a.zeugnis === "vorhanden";
    k.bedingt(antrag, () => !vorhanden());
    schritte.slice(0, 3).forEach((li) => k.bedingt(li, () => !vorhanden()));
    return {
      titel: k.text("zeugnis.titel"),
      weiterText: k.text("zeugnis.weiter"),
      inhalt: [
        ...absaetze(k.text("zeugnis.text")),
        wahl,
        antrag,
        h("div", { klasse: "anm-block" },
          h("h3", { klasse: "anm-zwischentitel" }, k.text("zeugnis.weiterTitel")),
          h("ol", { klasse: "anm-naechste" }, schritte)),
        h("p", { klasse: "anm-hinweis tr-fussnote" }, k.text("zeugnis.fussnote")),
      ],
    };
  },
  pruefe: regelnFuer("zeugnis"),
};

// ---------- unterschriften ----------

export const unterschriften = {
  id: "unterschriften",
  abschnitt: "unterschrift",
  // Das Bild der Unterschrift entsteht kurz nach dem letzten Strich.
  async vorPruefung(k) {
    await Promise.all(Array.from(k.wartend));
  },
  render(k) {
    const feld = unterschriftFeld({
      speicher: k.striche,
      id: k.nextId("s"),
      wer: "mitglied",
      feld: "unterschrift",
      titel: k.text("unterschriften.feldTitel"),
      texte: {
        ariaLabel: k.text("unterschriften.ariaLabel"),
        stand0: k.text("unterschriften.stand0"),
        standOk: k.text("unterschriften.standOk"),
        standZuKurz: k.text("unterschriften.standZuKurz"),
        loeschen: k.text("unterschriften.loeschen"),
        loeschenLang: k.text("unterschriften.loeschen"),
      },
      // Nach jedem Strich (und beim Löschen) wird das Bild neu berechnet und in k.medien.unterschrift gelegt; nur eine Änderung zählt.
      beiAenderung: () => {
        const p = feld.holePng().then(
          (png) => {
            const neu = png ? png.bytes : null;
            if (gleicheBytes(neu, k.medien.unterschrift)) return;
            k.medien.unterschrift = neu;
            k.aenderung();
          },
          (fehler) => {
            console.error("Trainerseite: Unterschrift nicht umgewandelt", fehler);
            k.medien.unterschrift = null;
          });
        k.wartend.add(p);
        p.then(() => k.wartend.delete(p));
      },
    });
    // Das Feld hat hier keine Zeile „Diese Unterschrift gilt für“ (der Satz steht darüber): kein Verweis ins Leere.
    feld.element.setAttribute("aria-describedby", feld.element.getAttribute("aria-describedby").replace(/\S+-hinweis\s*/, ""));
    k.nachRender(() => feld.nachEinfuegen());
    const ort = sauber(k.konfig.verein && k.konfig.verein.ort);
    const ortDatum = ort ? k.text("unterschriften.ortDatum", { ort, datum: datumText(k.heute) }) : k.text("unterschriften.nurDatum", { datum: datumText(k.heute) });
    // Satzung: Link (konfig.verein.satzungUrl, wie im Anmelde-Assistenten) und Kästchen. Ohne Adresse steht ein Hinweis statt des Links.
    const satzungUrl = sichereUrl(k.konfig.verein && k.konfig.verein.satzungUrl);
    const satzungLink = satzungUrl
      ? h("a", { href: satzungUrl, target: "_blank", rel: "noopener", "data-aktion": "satzung-lesen" }, k.text("unterschriften.satzungLink"), h("span", { klasse: "sr-only" }, " (" + k.text("allgemein.oeffnetNeu") + ")"))
      : k.text("unterschriften.satzungOhneLink");
    return {
      titel: k.text("unterschriften.titel"),
      weiterText: k.text("unterschriften.weiter"),
      inhalt: [
        ...absaetze(k.text("unterschriften.text")),
        feld.element,
        h("p", { klasse: "anm-text" }, ortDatum),
        h("div", { klasse: "anm-block anm-satzung" },
          h("p", { klasse: "anm-text anm-satzung__link" }, satzungLink),
          pflichtKaestchen(k, { pfad: "satzung", label: k.text("unterschriften.satzung") })),
      ],
    };
  },
  pruefe: regelnFuer("unterschriften"),
};

// ---------- pruefen ----------

export const pruefen = {
  id: "pruefen",
  abschnitt: "fertig",
  render(k) {
    const a = k.a;
    const P = (pfad, werte) => k.text("pruefen." + pfad, werte);
    const offen = (ok, text) => (ok ? text : P("werte.offen"));
    const alsText = (...teile) => verbinde(", ", ...teile);
    const unterschrift = k.medien.unterschrift
      ? h("img", { klasse: "anm-vorschau-unterschrift", src: k.vorschauUrl("unterschrift", k.medien.unterschrift, "image/png"), alt: P("unterschriftAlt") })
      : k.text("unterschriften.stand0");
    const zeugnisText = a.zeugnis === "vorhanden" ? k.text("zeugnis.wahl.vorhanden") : a.zeugnis === "beantragen" ? P("werte.zeugnis") : P("werte.offen");
    // Freiwillige Angaben ohne Eintrag stehen als „Nicht angegeben (freiwillig)“ da (mit „Ändern“ lässt sich etwas nachtragen).
    const nichtAngegeben = P("werte.nichtAngegeben");
    const ersteHilfe = a.ersteHilfeAm ? P("werte.ersteHilfe", { datum: datumText(a.ersteHilfeAm) }) : nichtAngegeben;
    const an = a.anschrift || {};
    const n = a.notfall || {};
    // Größen der Trainerausstattung: nur die angegebenen, „Shirt: M, Anzug: L“; ohne Angabe „Nicht angegeben (freiwillig)“
    const ausstattungWerte = a.ausstattung || {};
    const groessen = alsText(...AUSSTATTUNG_ARTIKEL.filter((x) => ausstattungWerte[x]).map((x) => P("werte.groesse", { artikel: k.text("ausstattung." + x), groesse: ausstattungWerte[x] })));
    // Abschnitte der Zusammenfassung: [Bereich, [[Beschriftung, Wert, Seite für „Ändern“], …]]; leere Werte entfallen.
    const bereiche = [
      ["du", [
        [P("zeilen.name"), verbinde(" ", a.vorname, a.nachname), "person"],
        [P("zeilen.geboren"), datumText(a.geburtsdatum), "person"],
        [P("zeilen.adresse"), verbinde(", ", an.strasse, verbinde(" ", an.plz, an.ort)), "person"],
        [P("zeilen.handy"), a.handy, "person"],
        [P("zeilen.email"), a.email, "person"],
      ]],
      ["einsatz", [
        [P("zeilen.abteilung"), a.abteilung ? k.text("einsatz.abteilungen." + a.abteilung) : "", "einsatz"],
        [P(a.abteilung === "karneval" ? "zeilen.gruppe" : "zeilen.mannschaft"), a.mannschaft, "einsatz"],
        [P("zeilen.rolle"), a.rolle ? k.text("einsatz.rollen." + a.rolle) : "", "einsatz"],
        [P("zeilen.seit"), datumText(a.seit), "einsatz"],
        [P("zeilen.tage"), alsText(...WOCHENTAGE.filter((t) => (a.tage || []).includes(t)).map((t) => k.text("einsatz.wochentage." + t))), "einsatz"],
      ]],
      ["notfall", [
        [P("zeilen.notfall"), alsText(n.name, n.beziehung, n.telefon) || nichtAngegeben, "notfall"],
      ]],
      ["erfahrung", [
        [P("zeilen.erfahrung"), sauber(a.erfahrung) || nichtAngegeben, "erfahrung"],
        [P("zeilen.ersteHilfe"), ersteHilfe, "erfahrung"],
      ]],
      ["ausstattung", [
        [P("zeilen.groessen"), groessen || nichtAngegeben, "ausstattung"],
      ]],
      ["unterlagen", [
        [P("zeilen.foto"), k.medien.foto ? P("werte.foto") : nichtAngegeben, "foto"],
        [P("zeilen.kodex"), offen(a.kodexGelesen === true, P("werte.kodex")), "kodex"],
        [P("zeilen.selbstauskunft"), offen(a.selbstauskunft === true, P("werte.selbstauskunft")), "selbstauskunft"],
      ]],
      ["zeugnis", [
        [P("zeilen.zeugnis"), zeugnisText, "zeugnis"],
      ]],
      ["unterschrift", [
        [P("zeilen.unterschrift"), unterschrift, "unterschriften"],
        [P("zeilen.satzung"), offen(a.satzung === true, P("werte.ja")), "unterschriften"],
      ]],
    ];
    const teile = bereiche.map(([bereich, zeilen]) => {
      const titelId = k.nextId("bt");
      const liste = zeilen.filter(([, wert]) => wert !== "").map(([label, wert, ziel]) =>
        h("div", { klasse: "anm-pruefzeile" },
          h("dt", {}, label),
          h("dd", { klasse: "anm-pruefzeile__wert", dir: "ltr" }, wert),
          h("dd", { klasse: "anm-pruefzeile__aktion" },
            knopf(P("aendern"), { sekundaer: true, aktion: "aendern", ariaLabel: P("aendernLang", { bereich: label }), beiKlick: () => k.geheZu(ziel) }))));
      return h("section", { klasse: "anm-bereich", "aria-labelledby": titelId },
        h("h3", { klasse: "anm-zwischentitel", id: titelId }, P("bereiche." + bereich)),
        h("dl", { klasse: "anm-pruefliste" }, liste));
    });
    return {
      titel: P("titel"),
      weiterText: P("weiter"),
      inhalt: [
        ...absaetze(P("text"), "anm-hinweis"),
        ...teile,
        hinweisKasten("info", P("kastenTitel"), absaetze(P("kastenText", { kurz: einsichtNamen(k.konfig, "kurz") }))),
      ],
    };
  },
  pruefe: regelnFuer("pruefen"),
};

// ---------- fertig ----------

// Umbruchstellen hinter den Unterstrichen: Lange Dateinamen brechen dort, nicht mitten im Wort.
function dateiname(name) {
  return String(name).split("_").flatMap((teil, i) => (i ? ["_", h("wbr"), teil] : [teil]));
}

// mailto-Adresse mit Betreff und Text (ohne Anhang: Ein Link kann keine Datei anhängen; die Person hängt sie selbst an)
function mailtoVerein(k) {
  const kodiere = (text) => encodeURIComponent(String(text).replace(/\n/g, "\r\n"));
  return "mailto:" + k.mail + "?subject=" + kodiere(mailBetreff(k)) + "&body=" + kodiere(k.text("fertig.mail.text"));
}

function mailBetreff(k) {
  return k.text("fertig.mail.betreff", { vorname: sauber(k.a.vorname), nachname: sauber(k.a.nachname) });
}

// Die Datei ist da: Name und Beschreibung, Knöpfe zum Teilen, Herunterladen und für die Vorschau, die Wege zum Verein.
function ergebnisAnsicht(k) {
  const dateien = k.erzeugung.dateien;
  const status = h("p", { klasse: "anm-status", role: "status" });
  const zeigeStatus = (text) => {
    status.textContent = text;
  };
  // Die Seite liefert genau eine Datei (trainer-pdf.js). Mehrere Downloads aus einem Klick gehen nicht zuverlässig: Safari am iPhone zeigt nur den
  // ersten, Browser am Computer fragen nach, und beim Teilen nehmen Apps nicht immer alle Dateien (Fund vom 25.11.2026).
  const speichereAlle = async () => {
    dateien.forEach((d) => speichern(d.bytes, d.typ, d.name));
  };
  const laden = knopf(k.text("fertig.herunterladen"), {
    aktion: "herunterladen",
    beiKlick: async () => {
      await speichereAlle();
      k.gesichert = true;
      zeigeStatus(k.text("fertig.gespeichert"));
    },
  });
  const teilDateien = dateien.map((d) => d.datei);
  const teilen = knopf(k.text("fertig.teilen"), {
    sekundaer: true,
    aktion: "teilen",
    beiKlick: () => {
      // Beides im selben Klick, in dieser Reihenfolge und ohne await dazwischen (navigator.share braucht die Nutzergeste): zuerst die Adresse
      // der Geschäftsstelle in die Zwischenablage (still), sofort danach die Datei teilen, mit Betreff und Text der E-Mail.
      const kopiert = kopiereBeimTeilen(k.mail);
      let versprechen;
      try {
        versprechen = Promise.resolve(navigator.share({ files: teilDateien, title: mailBetreff(k), text: k.text("fertig.mail.text") }));
      } catch (fehler) {
        versprechen = Promise.reject(fehler);
      }
      versprechen
        .then(() => {
          k.gesichert = true;
          return kopiert.then((geklappt) => zeigeStatus(k.text(geklappt ? "fertig.geteiltMitAdresse" : "fertig.geteilt")));
        })
        .catch(async (fehler) => {
          if (fehler && fehler.name === "AbortError") return;
          // Teilen geht nicht: Die Datei wird stattdessen gespeichert.
          await speichereAlle();
          k.gesichert = true;
          zeigeStatus(k.text("fertig.teilenFehler"));
        });
    },
  });
  teilen.hidden = !teilenMoeglich(teilDateien);
  // Am Handy ist Teilen der Hauptweg, sonst das Herunterladen.
  const handy = !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
  const knoepfe = [];
  if (!teilen.hidden && handy) {
    teilen.classList.remove("knopf--sekundaer");
    laden.classList.add("knopf--sekundaer");
    knoepfe.push(teilen, laden);
  } else knoepfe.push(laden, teilen);
  // Vorschau: das Paket als PDF (die erste PDF-Datei) in einem neuen Fenster
  knoepfe.push(knopf(k.text("fertig.vorschau"), {
    sekundaer: true,
    aktion: "ansehen",
    beiKlick: () => {
      const d = dateien.find((x) => x.typ === "application/pdf") || dateien[0];
      zeigeInFenster(oeffneFensterSofort(), d.bytes, d.typ, d.name);
    },
  }));

  // Die Wege zum Verein: am Handy „Datei teilen“, am Computer „Datei herunterladen“ und eine neue E-Mail. Beide stehen da.
  const weg = (titel, schritte, art) =>
    h("div", { klasse: "anm-senden__weg", "data-weg": art },
      h("h4", { klasse: "anm-zwischentitel anm-zwischentitel--klein" }, titel),
      h("ol", { klasse: "anm-senden__schritte" }, schritte.map((s) => h("li", {}, s))));
  let adressBlock = null;
  if (k.mail) {
    const [lokal, domain] = k.mail.split("@");
    // Die Adresse steht von links nach rechts; die Umbruchstelle liegt vor dem „@“. Ein Tipp markiert sie ganz.
    const adresseText = h("span", { klasse: "anm-senden__adresse-text", dir: "ltr", "data-mail-adresse": "" }, lokal, h("wbr"), "@" + domain);
    const adressStatus = h("p", { klasse: "anm-status", role: "status", "data-mail-status": "" });
    adressBlock = h("div", { klasse: "anm-senden__adressblock", "data-adressblock": "" },
      h("p", { klasse: "anm-senden__label" }, k.text("fertig.adresseTitel")),
      h("p", { klasse: "anm-senden__adresse" }, adresseText),
      h("div", { klasse: "anm-knoepfe" },
        knopf(k.text("fertig.kopieren"), {
          sekundaer: true,
          aktion: "adresse-kopieren",
          beiKlick: async () => {
            const geklappt = await kopiereAdresse(adresseText, k.mail);
            adressStatus.textContent = k.text(geklappt ? "fertig.kopiert" : "fertig.kopierenFehler");
          },
        }),
        h("a", { klasse: "knopf knopf--sekundaer", href: mailtoVerein(k), "data-aktion": "mail-oeffnen" }, k.text("fertig.oeffnen"))),
      adressStatus);
  }
  const senden = h("div", { klasse: "anm-senden", "data-senden": "" },
    h("h3", { klasse: "anm-zwischentitel" }, k.text("fertig.sendenTitel")),
    h("div", { klasse: "anm-senden__wege" },
      weg(k.text("fertig.handy"), k.textListe("fertig.handySchritte"), "handy"),
      weg(k.text("fertig.computer"), k.textListe("fertig.computerSchritte"), "computer")),
    adressBlock,
    h("p", { klasse: "anm-hinweis anm-hinweis--achtung" }, k.text("fertig.nichtWhatsapp")));

  // Hinweise der Erzeugung (zum Beispiel Zeichen außerhalb der PDF-Schrift): Die Person soll die Vorschau ansehen. Der Rest bleibt benutzbar.
  const warnungen = k.erzeugung.warnungen.length
    ? hinweisKasten("warnung", k.text("fertig.warnungTitel"), h("p", {}, k.text("fertig.warnung")))
    : null;
  if (warnungen) warnungen.setAttribute("data-warnungen", String(k.erzeugung.warnungen.length));

  return h("div", { klasse: "anm-ergebnis", "data-status": "fertig" },
    h("h3", { klasse: "anm-zwischentitel" }, k.text("fertig.paketTitel")),
    h("ul", { klasse: "anm-liste-punkte", "data-dateien": "" }, dateien.map((d) => h("li", { "data-datei": d.name }, h("strong", {}, dateiname(d.name)), " – " + d.beschreibung))),
    warnungen,
    h("div", { klasse: "anm-knoepfe" }, knoepfe),
    status,
    senden);
}

// „So geht es weiter“: Die ersten zwei Schritte (Antrag) gelten nur, wenn das Zeugnis noch beantragt werden muss.
function weiterKarte(k) {
  const frist = datumText(fristVon(k.a.seit, k.konfig));
  const werte = { kurz: einsichtNamen(k.konfig, "kurz"), frist };
  const eintraege = k.text("fertig.schritte").map((s, i) => ({ ...s, text: k.text("fertig.schritte." + i + ".text", werte) }))
    .filter((s) => !s.nur || s.nur === k.a.zeugnis);
  return h("div", { klasse: "anm-ergebnis" },
    h("h3", { klasse: "anm-zwischentitel" }, k.text("fertig.weiterTitel")),
    h("ol", { klasse: "anm-naechste" }, eintraege.map((s) => h("li", {}, s.wer ? [h("strong", {}, s.wer), " " + s.text] : s.text))));
}

function fehlerAnsicht(k) {
  const schluessel = k.fehlerSchluessel(k.erzeugung.fehler);
  return h("div", { klasse: "anm-ergebnis anm-ergebnis--fehler", "data-status": "fehler" },
    hinweisKasten("offen", k.text("fertig.fehlerTitel"), h("p", {}, k.text("fertig.fehler." + schluessel))),
    h("div", { klasse: "anm-knoepfe" },
      knopf(k.text("fertig.nochmal"), { aktion: "nochmal", beiKlick: () => k.starteErstellen(true) }),
      knopf(k.text("rahmen.hilfe"), { sekundaer: true, aktion: "hilfe-fehler", beiKlick: () => k.zeigeHilfe() })));
}

export const fertig = {
  id: "fertig",
  abschnitt: "fertig",
  voll: true,
  ohneWeiter: true,
  render(k) {
    const e = k.erzeugung;
    // Beim ersten Anzeigen und nach Änderungen die Dateien (neu) erstellen.
    if (e.zustand === "leer" || (e.zustand === "fertig" && e.veraltet)) k.starteErstellen(false);
    if (e.zustand === "fertig" && !e.veraltet) return { titel: k.text("fertig.titel"), inhalt: [ergebnisAnsicht(k), weiterKarte(k)] };
    if (e.zustand === "fehler") return { titel: k.text("fertig.titelFehler"), inhalt: [fehlerAnsicht(k)] };
    return { titel: k.text("fertig.titelArbeit"), inhalt: [h("p", { klasse: "anm-text anm-text--gross", role: "status", "data-status": "arbeit" }, k.text("fertig.arbeitet"))] };
  },
  pruefe: regelnFuer("fertig"),
};

// ---------- Alle Seiten ----------

export const SEITEN = { code, start, person, einsatz, notfall, erfahrung, ausstattung, foto, kodex, selbstauskunft, zeugnis, unterschriften, pruefen, fertig };
