/*
  ATTRAPPE des Regelwerks – nur für tools/anmeldung-test/e2e.mjs.

  Ersetzt assets/js/anmeldung/regeln.js (Paket AP-1), solange es fehlt. Gleiche
  Schnittstelle (SCHNITTSTELLEN Abschnitte 4 und 5), aber stark vereinfachte
  Regeln: Sie sollen alle 27 Schritte der Oberfläche zum Laufen bringen, nicht
  die Regeln des Fußball-Verbands prüfen. Gehört NICHT in die Auslieferung.
*/

export const VERSION = "attrappe-1";

function zerlege(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  return m ? { j: +m[1], m: +m[2], t: +m[3] } : null;
}

export function alterAm(geburtsdatum, stichtag) {
  const g = zerlege(geburtsdatum);
  const s = zerlege(stichtag);
  if (!g || !s) return null;
  let alter = s.j - g.j;
  if (s.m < g.m || (s.m === g.m && s.t < g.t)) alter -= 1;
  return alter;
}

function spieljahr(heute) {
  const s = zerlege(heute);
  return s.m >= 7 ? s.j : s.j - 1;
}

export function altersklasse(geburtsdatum, konfig, heute) {
  const g = zerlege(geburtsdatum);
  if (!g) return null;
  const s = spieljahr(heute || new Date().toISOString().slice(0, 10));
  const d = s - g.j;
  if (d <= 6) return "G";
  if (d <= 8) return "F";
  if (d <= 10) return "E";
  if (d <= 12) return "D";
  if (d <= 14) return "C";
  if (d <= 16) return "B";
  if (d <= 18) return "A";
  return "Herren";
}

export function istMinderjaehrig(a, heute) {
  const alter = alterAm(a.geburtsdatum, heute);
  return alter === null ? null : alter < 18;
}

function fakten(a, heute) {
  const alter = alterAm(a.geburtsdatum, heute);
  const minder = alter === null ? null : alter < 18;
  const fussball = ["fussball", "beides"].includes(a.abteilung);
  const karneval = ["karneval", "beides"].includes(a.abteilung);
  const spielt = fussball && a.spielen === true;
  const klasse = altersklasse(a.geburtsdatum, null, heute);
  const frau = a.geschlecht === "w" || (["d", "ohne_angabe"].includes(a.geschlecht) && a.spielrechtFuer === "w");
  const wechsel = spielt && a.spielerpass === "ja";
  const wechselDe = wechsel && a.alterVerein && ["hessen", "bundesland"].includes(a.alterVerein.region);
  const nichtDeutsch = a.deutsch === "nein" || a.deutsch === "weiss_nicht";
  const international = spielt && nichtDeutsch && alter !== null && alter >= 10;
  return { alter, minder, fussball, karneval, spielt, klasse, frau, wechsel, wechselDe, nichtDeutsch, international };
}

// Unterlagen dieser Attrappe. Eine Unterlage mit nachweis: true bietet der
// Assistent als Foto/Datei an.
function unterlagenFuer(a, f) {
  const u = [];
  const eintrag = (id, art, wer, wann, form, formular, nachweis) => u.push({ id, art, wer, wann, form, formular, nachweis, textKey: id });
  eintrag("U01", "pflicht", "familie", "anmeldung", "formular_im_pdf", "aufnahmeantrag", false);
  eintrag("U06", "pflicht", "verein", "anmeldung", "formular_im_pdf", "datenschutz", false);
  if (f.spielt) eintrag("U07", "pflicht", "familie", "vor_erstem_spiel", "formular_im_pdf", "hfv_antrag", false);
  if (f.spielt && f.minder) eintrag("U09", "pflicht", "familie", "vor_erstem_spiel", "foto_oder_datei", null, true);
  if (f.spielt && f.minder) eintrag("U10", "pflicht", "arzt", "vor_erstem_spiel", "foto_oder_datei", "attest", true);
  if (f.international) eintrag("U12", "pflicht", "familie", "vor_erstem_spiel", "foto_oder_datei", null, true);
  if (f.international) eintrag("U13", "pflicht", "familie", "vor_erstem_spiel", "foto_oder_datei", null, true);
  if (f.wechselDe && a.abmeldung && a.abmeldung.weg === "vollmacht") eintrag("U18", "pflicht", "familie", "anmeldung", "formular_im_pdf", "vollmacht", false);
  if (f.wechselDe && a.abmeldung && a.abmeldung.status === "einschreiben") eintrag("U17", "pflicht", "familie", "anmeldung", "foto_oder_datei", "abmeldung", true);
  if (f.spielt) eintrag("U16", "pflicht", "familie", "vor_erstem_spiel", "foto_oder_datei", null, false);
  if (f.minder && a.gesundheitsbogen === true) eintrag("U28", "freiwillig", "familie", "anmeldung", "formular_im_pdf", "notfall", false);
  if (a.abteilung === "karneval" && f.minder && a.karneval && a.karneval.abendOhneEltern === "ja") eintrag("U30", "verein", "familie", "anmeldung", "unterschrift", "karneval_auftritte", false);
  return u;
}

function besonderesNoetig(f) {
  return f.spielt && ((f.frau && ["C", "B"].includes(f.klasse)) || (f.minder === true && f.klasse === "A") || (f.frau && f.minder === false));
}

export function schritte(a, konfig, heute) {
  const f = fakten(a, heute);
  const liste = ["start", "wer", "name", "geburt", "abteilung"];
  if (f.fussball) liste.push("mannschaft", "spielen");
  if (f.spielt) liste.push("spielerpass");
  if (f.wechsel) liste.push("alter_verein");
  if (f.wechselDe) liste.push("abmeldung");
  liste.push("pass");
  if (f.spielt) liste.push("ausland");
  if (f.minder && f.fussball && (f.nichtDeutsch || a.auslandGewohnt === "ja")) liste.push("wohnen");
  if (f.minder) liste.push("sorge");
  if (besonderesNoetig(f)) liste.push("besonderes");
  if (f.karneval) liste.push("karneval");
  liste.push("kontakt", "beitrag");
  if (f.minder) liste.push("leistungen");
  liste.push("zahlung", "einwilligungen");
  if (f.minder) liste.push("notfall");
  if (f.spielt) liste.push("spielerfoto");
  if (unterlagenFuer(a, f).some((u) => u.nachweis)) liste.push("nachweise");
  liste.push("unterschriften", "pruefen", "fertig");
  return liste;
}

const TEAMS = {
  G: ["G-Jugend"],
  F: ["F1", "F2"],
  E: ["E1", "E2", "E3"],
  D: ["D1", "D2", "D3"],
  A: ["A-Jugend"],
  Herren: ["Herren"],
};

function beitragFuer(a, f) {
  if (f.karneval && !f.fussball) return f.minder ? "karneval_kinder" : "karneval_erwachsene";
  if (a.abteilung === "passiv") return "fussball_passiv";
  return f.minder ? "fussball_jugend" : "fussball_erwachsene";
}

const PREISE = {
  fussball_jugend: [108, 9],
  fussball_erwachsene: [120, 10],
  fussball_passiv: [84, 7],
  karneval_kinder: [108, 9],
  karneval_erwachsene: [120, 10],
};

function addTage(iso, tage) {
  const s = zerlege(iso);
  const d = new Date(Date.UTC(s.j, s.m - 1, s.t));
  d.setUTCDate(d.getUTCDate() + tage);
  return d.toISOString().slice(0, 10);
}

export function auswerten(a, konfig, heute) {
  const f = fakten(a, heute);
  const unterlagen = unterlagenFuer(a, f);
  const formulare = Array.from(new Set(["aufnahmeantrag", "datenschutz", ...unterlagen.map((u) => u.formular).filter(Boolean)]));
  const digitalErlaubt = (formular) => ((konfig.formulare && konfig.formulare.formulare && konfig.formulare.formulare[formular]) || {}).digitaleUnterschrift === "erlaubt";
  void digitalErlaubt;
  const unterschriften = [];
  const wer = f.minder ? "sorgeberechtigte_beide" : "mitglied";
  unterschriften.push({ formular: "aufnahmeantrag", stelleKey: "s2.unterschrift", wer });
  unterschriften.push({ formular: "datenschutz", stelleKey: "unterschrift", wer });
  if (a.zahlung && a.zahlung.art === "sepa") unterschriften.push({ formular: "aufnahmeantrag", stelleKey: "s4.unterschrift", wer: "kontoinhaber" });
  if (f.spielt) {
    unterschriften.push({ formular: "hfv_antrag", stelleKey: "seite2.eltern", wer: f.minder ? "sorgeberechtigte" : "spieler" });
    if (f.minder) unterschriften.push({ formular: "hfv_antrag", stelleKey: "seite2.spieler", wer: "spieler" });
  }
  if (formulare.includes("vollmacht")) unterschriften.push({ formular: "vollmacht", stelleKey: "unterschrift", wer: "sorgeberechtigte" });
  const hinweise = [];
  if (f.wechselDe) {
    hinweise.push({ art: "warnung", key: "abmeldung_mail", werte: {}, schritt: "abmeldung" });
    hinweise.push({ art: "info", key: "vollmacht_tag", werte: {}, schritt: "abmeldung" });
  }
  if (f.spielt) hinweise.push({ art: "info", key: "erst_spielen_wenn_recht", werte: { name: a.vorname } });
  if (f.international) hinweise.push({ art: "info", key: "international_dauer", werte: {} });
  hinweise.push({ art: "offen", key: "versicherung_probetraining", werte: {} });
  const klasse = f.klasse;
  const namen = f.spielt || f.fussball ? TEAMS[klasse] || [] : [];
  const gruppe = beitragFuer(a, f);
  const status = !f.spielt ? null : f.wechselDe ? "wechsel_hfv" : f.wechsel ? "wechsel_ausland" : "neu";
  const fehlend = unterlagen.filter((u) => u.nachweis && !(a.nachweise && a.nachweise[u.id] === "habe")).map((u) => u.id);
  return {
    version: VERSION,
    alter: f.alter,
    minderjaehrig: f.minder,
    jahrgang: a.geburtsdatum ? +a.geburtsdatum.slice(0, 4) : null,
    altersklasse: klasse,
    mannschaft: { vorhanden: namen.length > 0, namen, hinweisKey: namen.length ? null : "keine_mannschaft" },
    faelle: f.spielt ? [status === "neu" ? "F03" : "F06"] : a.abteilung === "karneval" ? ["F01"] : ["F02"],
    status,
    international: f.international,
    unterlagen,
    formulare,
    unterschriften,
    hinweise,
    frist: f.wechselDe
      ? { pflichtspieleAb: addTage(heute, 90), freundschaftsspieleAb: addTage(heute, 1), regel: "R5", unsicher: true, key: "wartefrist" }
      : { pflichtspieleAb: null, freundschaftsspieleAb: null, regel: "R1", unsicher: false, key: "keine_frist" },
    weiterleitung: namen.length || !f.fussball ? [] : [{ an: "jugendleitung", key: "keine_mannschaft" }],
    beitrag: { gruppe, gruppen: [gruppe], jahr: PREISE[gruppe][0], monat: PREISE[gruppe][1], aufnahmegebuehr: 20, zuschlagOhneSepa: 3, hinweisKey: null, vorschlag: gruppe, gewaehlt: false, werte: {} },
    karneval: { gruppenVorschlag: f.karneval ? ["Freaky Fruities"] : [], gruppe: null, passt: null, bestaetigt: false },
    besonderesOptionen: besonderesNoetig(f) ? ["maedchenJungenteam", "frauHerren", "herrenAushilfe"].filter((o) => (o === "maedchenJungenteam" ? f.frau && ["C", "B"].includes(f.klasse) : o === "herrenAushilfe" ? f.minder === true && f.klasse === "A" : f.frau && f.minder === false)) : [],
    fehlend,
  };
}
