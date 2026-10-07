/*
  Regelwerk des Anmelde-Assistenten FFV Sportfreunde 04 (Stand 2026-10-07, Saison 2026/27)

  Reine Funktionen ohne Browser- und Zeitzugriff: Das Heute-Datum kommt immer als
  Parameter "JJJJ-MM-TT" hinein, die Konfiguration (data/anmeldung.json und weitere
  Daten) als `konfig`. Das Modul läuft in Node und im Browser.

  Ausgabe:
    schritte(a, konfig, heute)   Liste der nötigen Seiten (SCHNITTSTELLEN Abschnitt 4)
    auswerten(a, konfig, heute)  Ergebnis e (SCHNITTSTELLEN Abschnitt 5) mit Fällen F01-F18,
                                 Unterlagen U01-U40, Unterschriften, Hinweisen, Fristen,
                                 Weiterleitung, Beitrag und Fehlend-Liste
    alterAm, altersklasse, istMinderjaehrig  kleine Hilfen

  Grundsätze:
  - Jede Regel nennt ihre Quelle (Dokument, Paragraph, Stand). Kürzel: JO = HFV-Jugendordnung
    (Stand 2026-07-01), SpO = HFV-Spielordnung (Stand 2026-07-06), RSTP = FIFA-Reglement zu Status
    und Transfer von Spielern (Ausgabe 2025-07), KJA = Kreisjugendausschuss Frankfurt
    (Durchführungsbestimmungen 2026/27, Stand 2026-08-09), Passstelle = Folien der HFV-Passstelle
    (Stand 2026-06-12), HFV-Antrag = Formular "Antrag auf Spielerlaubnis / Vereinswechsel"
    (PDF Stand 2026-06-16). Die Zahlen stehen in data/anmeldung.json (fristen), nicht hier.
  - Unsichere oder ungeklärte Regeln setzen art "offen" (Unterlagen, Hinweise) oder
    frist.unsicher = true. Es wird nie stillschweigend etwas angenommen; jede Annahme steht als
    Hinweis mit art "offen" im Ergebnis und als Eintrag in offenePunkte.
  - Fehlende Antworten führen nie zu einem Fehler. Was noch nicht entscheidbar ist, fehlt im
    Ergebnis (zum Beispiel erscheint ein Schritt erst, wenn seine Voraussetzung beantwortet ist).
  - Die Alterszählung nimmt als Stichtag den Tag der Anmeldung (heute). Ob der Verband denselben
    Tag nimmt, ist offen (offenePunkte, Frage an die Passstelle).

  Datenschutz: Das Modul liest nur die übergebenen Antworten. Es speichert und sendet nichts.
*/

export const VERSION = "2026-10-07.1";

// ---------------------------------------------------------------------------
// Schlüssel-Register: alle Schlüssel, die auswerten() zurückgeben kann. Zu jedem
// gibt es einen Text in texte/de-regeln.js (der Test regeln-test.mjs prüft das).
// ---------------------------------------------------------------------------

export const SCHLUESSEL = {
  hinweise: [
    // Warnungen
    "regelwerk_saison", "abmeldung_formlos", "abmeldung_nach_letztem_spiel", "abmeldung_vor_letztem_spiel",
    "nie_zwei_vereine", "kuendigung_extra", "vollmacht_eingabe_zeitnah", "wiederholter_wechsel", "antrag_zu_spaet",
    "ohne_zusage_spielen", "f17_wahrscheinlich_nicht", "aushilfe_nur_ausnahme", "getrennt_zustimmung",
    "karneval_tanzt_woanders", "beitrag_gruppe_pruefen",
    // Fristen
    "antrag_bis",
    // Infos
    "frist_annahme_heute", "probetraining_versicherung", "kuendigung_jahresende", "ohne_spielrecht_kein_spiel", "mitgliedschaft_zuerst",
    "spielerfoto_hinweis", "attest_kosten", "unterlagen_kein_whatsapp", "juni_wechselzeit", "vollmacht_ohne_kurze_frist",
    "wechsel_lv_anfrage", "entschaedigung_hinweis", "nachtraegliche_freigabe", "sperre_laeuft", "sonderwege_jugend",
    "e_aelter_juni", "international_dauer", "international_unter10", "zuzug_pruefen", "maedchen_jungenteam",
    "herren_aushilfe", "herren_ohne_antrag", "frau_herren", "keine_frauenmannschaft", "vertrauensperson",
    "sonderspielrecht", "beide_unterschreiben_empfohlen", "getrennt_einverstanden", "sorge_allein_nachweis",
    "vormund_hinweis", "pflege_hinweis", "f17_moeglich_5_jahre", "austausch_ein_jahr",
    "karneval_gruppe_vorschlag", "karneval_kein_attest", "karneval_abend", "passiv_hinweis", "senator_vorstand",
    "kontoinhaber_andere", "bildung_teilhabe", "beitragserlass", "medikamente_absprache", "passiv_alter_verein",
    // Offene Punkte
    "mitgliedschaft_beginn", "regelwerk_fifa_2027", "regelwerk_saison_2027", "attest_aktuell", "wechselgebuehr",
    "abmeldung_unklar", "freigabe_unklar", "sperre_unklar", "d_jahrgang_wartefrist_offen", "vollmacht_anderer_verband",
    "grenze_10_offen", "ausweis_deutsch_original", "meldebescheinigung_elternteil", "laenderformulare_offen",
    "ausland_erwachsen_wechselperiode", "doppelstaatler", "staatsangehoerigkeit_unklar", "spielerpass_unklar",
    "sportarzt_offen", "frau_herren_offen", "spieler_unterschrift_kind", "unterlagen_liste_offen",
    "wohnen_nicht_gemeinsam", "karneval_turnier_offen", "karneval_gruppe_alter_pruefen", "beitrag_familie_offen",
    "zuschlag_ohne_sepa", "iban_ausland_pruefen", "aufnahmegebuehr_offen", "beitrag_doppel", "kostueme_offen",
    "mitgliedschaft_alter_verein_unklar",
  ],
  frist: [
    "frist_kein_spiel", "frist_offen", "frist_neu", "frist_neu_unklar", "frist_neu_pruefung", "frist_international",
    "frist_ohne_zusage", "frist_wechsel_fg", "frist_wechsel_e_juni", "frist_wechsel_e", "frist_wechsel_juni_freigabe",
    "frist_wechsel_juni_ohne", "frist_wechsel_3monate", "frist_wechsel_6monate", "frist_freigabe_unklar",
    "frist_d_jung_offen", "frist_entfaellt", "frist_herren_wp1_zustimmung", "frist_herren_wp1_ohne",
    "frist_herren_wp2_zustimmung", "frist_herren_wp2_ohne", "frist_klasse_unbekannt",
  ],
  weiterleitung: [
    "keine_mannschaft", "sonderfall_kind", "aushilfe", "vertrauensperson", "sonderspielrecht", "sonderwege",
    "getrennte_eltern", "wohnen_nicht_gemeinsam", "spielerpass_unklar", "international_klaeren", "unter10_pruefung",
    "staatsangehoerigkeit_unklar", "abmeldung_unklar", "laenderformulare", "vollmacht_anderer_verband",
    "wiederholter_wechsel", "doppelstaatler", "offene_fragen_verband", "beitrag_doppel", "beitrag_familie", "senator",
    "beitragserlass", "gruppe_einteilung", "turnier", "kostueme", "herren_wechsel", "frau_herren",
  ],
  mannschaft: [
    "mannschaft_unbekannt", "keine_mannschaft", "mannschaft_gefunden", "mannschaft_mehrere", "mannschaft_2020_f2",
    "mannschaft_herren", "mannschaft_maedchen_bonus", "mannschaft_frau_herren", "mannschaft_frau_keine",
  ],
  beitrag: [
    "beitrag_offen", "beitrag_standard", "beitrag_familie", "beitrag_azubi", "beitrag_senator", "beitrag_doppel",
  ],
};

const unbekannteSchluesselMenge = new Set();

// Für Tests: Schlüssel, die ausgegeben wurden, aber nicht im Register stehen.
export function unbekannteSchluessel() {
  return Array.from(unbekannteSchluesselMenge);
}

function pruefeSchluessel(kategorie, key) {
  if (SCHLUESSEL[kategorie].indexOf(key) < 0) unbekannteSchluesselMenge.add(kategorie + ":" + key);
  return key;
}

// ---------------------------------------------------------------------------
// Datum: reine Zahlenrechnung, ohne Date-Objekt (kein Zeitzonen- und Sommerzeitfehler)
// ---------------------------------------------------------------------------

const MONATSTAGE = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function istSchaltjahr(j) {
  return (j % 4 === 0 && j % 100 !== 0) || j % 400 === 0;
}

function tageImMonat(j, m) {
  return m === 2 && istSchaltjahr(j) ? 29 : MONATSTAGE[m - 1];
}

// "JJJJ-MM-TT" -> { j, m, t } oder null
function zerlege(iso) {
  if (typeof iso !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return null;
  const j = Number(m[1]);
  const mo = Number(m[2]);
  const t = Number(m[3]);
  if (mo < 1 || mo > 12 || t < 1 || t > tageImMonat(j, mo)) return null;
  return { j: j, m: mo, t: t };
}

function zweistellig(n) {
  return (n < 10 ? "0" : "") + n;
}

function baueIso(j, m, t) {
  return String(j).padStart(4, "0") + "-" + zweistellig(m) + "-" + zweistellig(t);
}

// Tage seit 1970-01-01 (Verfahren "days from civil")
function tageNummer(j, m, t) {
  const y = m <= 2 ? j - 1 : j;
  const era = Math.floor(y / 400);
  const yoe = y - era * 400;
  const mp = (m + 9) % 12;
  const doy = Math.floor((153 * mp + 2) / 5) + t - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

function ausTageNummer(z) {
  const zz = z + 719468;
  const era = Math.floor(zz / 146097);
  const doe = zz - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const y = yoe + era * 400;
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const t = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const m = mp < 10 ? mp + 3 : mp - 9;
  return { j: m <= 2 ? y + 1 : y, m: m, t: t };
}

function plusTage(iso, n) {
  const d = zerlege(iso);
  if (!d) return null;
  const r = ausTageNummer(tageNummer(d.j, d.m, d.t) + n);
  return baueIso(r.j, r.m, r.t);
}

// Gleicher Tag im Monat, n Monate später; fehlt der Tag, gilt der letzte Tag des Monats.
function plusMonate(iso, n) {
  const d = zerlege(iso);
  if (!d) return null;
  const m0 = d.m - 1 + n;
  const j = d.j + Math.floor(m0 / 12);
  const m = ((m0 % 12) + 12) % 12 + 1;
  return baueIso(j, m, Math.min(d.t, tageImMonat(j, m)));
}

// Erster Tag, an dem Pflichtspiele erlaubt sind, wenn die Wartefrist nach `monate` Monaten endet.
// Die Wartefrist beginnt am Tag nach der Abmeldung (JO § 38 Nr. 2 c und d, SpO § 94 Nr. 1 b).
// Eine Frist nach Monaten endet mit Ablauf des Tages, der dem Anfangstag der Frist nach Zahl
// entspricht, minus einen Tag (BGB §§ 187 Abs. 2, 188 Abs. 2). Fehlt dieser Tag im Zielmonat,
// endet die Frist am letzten Tag des Monats (BGB § 188 Abs. 3). Pflichtspiele sind dann am
// Tag nach dem Fristende erlaubt. Beispiel: Abmeldung 2026-09-29, 3 Monate -> ab 2026-12-30.
// Die Passstelle rechnet vereinfacht "Abmeldedatum plus Monate plus 1 Tag" (Folie 16); beide
// Wege unterscheiden sich nur am Monatsende um einen Tag. Hier gilt der spätere Tag.
function erstePflichtspieleNachMonaten(abmeldeIso, monate) {
  const start = plusTage(abmeldeIso, 1);
  const s = zerlege(start);
  if (!s) return null;
  const m0 = s.m - 1 + monate;
  const j = s.j + Math.floor(m0 / 12);
  const m = ((m0 % 12) + 12) % 12 + 1;
  if (s.t <= tageImMonat(j, m)) return baueIso(j, m, s.t);
  return plusTage(baueIso(j, m, tageImMonat(j, m)), 1);
}

function maxIso(a, b) {
  if (!a) return b;
  if (!b) return a;
  return a >= b ? a : b;
}

function minIso(a, b) {
  if (!a) return b;
  if (!b) return a;
  return a <= b ? a : b;
}

function jahrVon(iso) {
  const d = zerlege(iso);
  return d ? d.j : null;
}

// "MM-TT" eines Datums
function monatTag(iso) {
  const d = zerlege(iso);
  return d ? zweistellig(d.m) + "-" + zweistellig(d.t) : null;
}

const MONATE = {
  de: ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  tr: ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"],
};

// Datum für Texte: "30. Dezember 2026" (Deutsch), passend zur Sprache der Antworten.
// Arabisch nutzt Intl mit lateinischen Ziffern; fehlt Intl, bleibt die deutsche Form.
function datumText(iso, sprache) {
  const d = zerlege(iso);
  if (!d) return "";
  const s = sprache || "de";
  if (s === "en") return d.t + " " + MONATE.en[d.m - 1] + " " + d.j;
  if (s === "tr") return d.t + " " + MONATE.tr[d.m - 1] + " " + d.j;
  if (s === "ar") {
    try {
      const arabisch = new Intl.DateTimeFormat("ar-u-nu-latn", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
        .format(Date.UTC(d.j, d.m - 1, d.t));
      if (arabisch) return arabisch;
    } catch (e) {
      // Intl fehlt oder kennt die Sprache nicht: deutsche Form
    }
  }
  return d.t + ". " + MONATE.de[d.m - 1] + " " + d.j;
}

// ---------------------------------------------------------------------------
// Öffentliche kleine Hilfen
// ---------------------------------------------------------------------------

// Alter in vollen Jahren am Stichtag; null bei ungültigem Datum oder Geburtsdatum nach dem Stichtag.
export function alterAm(geburtsdatum, stichtag) {
  const g = zerlege(geburtsdatum);
  const s = zerlege(stichtag);
  if (!g || !s) return null;
  let alter = s.j - g.j;
  if (s.m < g.m || (s.m === g.m && s.t < g.t)) alter -= 1;
  return alter < 0 ? null : alter;
}

function klassenListe(konfig) {
  const ak = konfig && konfig.anmeldung && konfig.anmeldung.altersklassen;
  return ak && Array.isArray(ak.klassen) ? ak.klassen : [];
}

// Altersklasse nach Geburtsjahr für das Spieljahr der Konfiguration:
// "G" | "F" | "E" | "D" | "C" | "B" | "A" | "Herren" | null.
// Quelle: JO § 11 (Jungen) und § 14 (Mädchen), KJA Frankfurt 2026/27 Seite 2: G ab 2020, F 2018/2019,
// E 2016/2017, D 2014/2015, C 2012/2013, B 2010/2011, A 2008/2009, davor Herren.
export function altersklasse(geburtsdatum, konfig) {
  const g = zerlege(geburtsdatum);
  if (!g) return null;
  const treffer = klassenListe(konfig).find((k) =>
    (k.von === null || k.von === undefined || g.j >= k.von) && (k.bis === null || k.bis === undefined || g.j <= k.bis));
  return treffer ? treffer.klasse : null;
}

// true unter 18 Jahren am Heute-Datum, false ab 18, null wenn das Geburtsdatum fehlt oder ungültig ist.
export function istMinderjaehrig(a, heute) {
  const alter = alterAm(a && a.geburtsdatum, heute);
  return alter === null ? null : alter < 18;
}

// ---------------------------------------------------------------------------
// Antworten lesen
// ---------------------------------------------------------------------------

function text(x) {
  return x === undefined || x === null ? "" : String(x).trim();
}

function hatText(x) {
  return text(x) !== "";
}

function liste(x) {
  return Array.isArray(x) ? x : [];
}

function objekt(x) {
  return x && typeof x === "object" && !Array.isArray(x) ? x : {};
}

// EU- und EWR-Staaten ohne Deutschland (für FIFA Art. 19 Abs. 2 b, F18)
const EU_EWR = ["AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT",
  "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE", "IS", "LI", "NO"];

// Länder, bei denen die Passstelle Zusatzformulare oder Abmeldebestätigungen anfordern kann (U27).
// Quelle: Hamburger FV, Hinweis internationaler Vereinswechsel (2022-04-27, Sekundärquelle); offen.
const LAENDER_ZUSATZFORMULAR = ["US", "MX", "AR", "BR", "RS", "BA", "MK", "HR"];

const LAND_KLARTEXT = {
  usa: "US", "vereinigte staaten": "US", "vereinigte staaten von amerika": "US", mexiko: "MX", argentinien: "AR",
  brasilien: "BR", serbien: "RS", bosnien: "BA", "bosnien-herzegowina": "BA", "bosnien und herzegowina": "BA",
  nordmazedonien: "MK", mazedonien: "MK", kroatien: "HR", deutschland: "DE", "türkei": "TR", tuerkei: "TR", syrien: "SY",
};

// ISO-3166-Alpha-2 oder Klartext -> Großbuchstaben-Code oder ""
function landCode(x) {
  const t = text(x);
  if (/^[A-Za-z]{2}$/.test(t)) return t.toUpperCase();
  return LAND_KLARTEXT[t.toLowerCase()] || "";
}

// ---------------------------------------------------------------------------
// Profil: alles, was aus den Antworten abgeleitet wird
// ---------------------------------------------------------------------------

function holeCfg(konfig) {
  if (!konfig || !konfig.anmeldung) {
    throw new Error("konfig.anmeldung fehlt (data/anmeldung.json wird als konfig.anmeldung übergeben).");
  }
  return konfig.anmeldung;
}

function leiteAb(a0, konfig, heute) {
  const a = objekt(a0);
  const cfg = holeCfg(konfig);
  const F = cfg.fristen;
  const p = { a: a, konfig: konfig, cfg: cfg, F: F, heute: heute, sprache: text(a.sprache) || "de" };

  p.geburtsdatum = zerlege(a.geburtsdatum) ? a.geburtsdatum : null;
  p.alter = p.geburtsdatum ? alterAm(p.geburtsdatum, heute) : null;
  p.jahrgang = p.geburtsdatum ? jahrVon(p.geburtsdatum) : null;
  p.minor = p.alter === null ? null : p.alter < F.alter.volljaehrig;
  p.adult = p.alter === null ? null : p.alter >= F.alter.volljaehrig;
  p.klasse = p.geburtsdatum ? altersklasse(p.geburtsdatum, konfig) : null;
  p.klasseInfo = klassenListe(konfig).find((k) => k.klasse === p.klasse) || null;

  // Abteilung
  p.abt = ["fussball", "karneval", "beides", "passiv"].indexOf(a.abteilung) >= 0 ? a.abteilung : null;
  p.fussball = p.abt === "fussball" || p.abt === "beides";
  p.karneval = p.abt === "karneval" || p.abt === "beides";
  p.passiv = p.abt === "passiv";
  p.aktiv = p.fussball || p.karneval;
  p.spielen = p.fussball && a.spielen === true;
  p.nurTraining = p.fussball && a.spielen === false;

  // Geschlecht. Bei "divers" und "ohne Angabe" wählt die Person, für welche Teams sie spielt (SpO § 91 Nr. 8 und 9).
  p.geschlecht = ["m", "w", "d", "ohne_angabe"].indexOf(a.geschlecht) >= 0 ? a.geschlecht : null;
  p.divers = p.geschlecht === "d" || p.geschlecht === "ohne_angabe";
  p.geschlechtEff = p.geschlecht === "m" || p.geschlecht === "w" ? p.geschlecht
    : (p.divers && (a.spielrechtFuer === "m" || a.spielrechtFuer === "w") ? a.spielrechtFuer : null);
  p.weiblich = p.geschlechtEff === "w";

  // Staatsangehörigkeit. Doppelstaatler mit deutschem Pass zählen wie Deutsche (RSTP Art. 19 Abs. 3
  // gilt nur für Personen ohne die Staatsangehörigkeit des Landes; Korrektur K11 der Vollständigkeitsprüfung).
  const staaten = liste(a.staaten).map((s) => text(s).toUpperCase()).filter(Boolean);
  p.staaten = staaten;
  if (a.deutsch === "ja") p.deutsch = true;
  else if (a.deutsch === "nein") p.deutsch = staaten.indexOf("DE") >= 0 ? true : false;
  else if (a.deutsch === "weiss_nicht") p.deutsch = staaten.length > 0 ? staaten.indexOf("DE") >= 0 : null;
  else p.deutsch = staaten.indexOf("DE") >= 0 ? true : null;
  p.deutschUnklar = a.deutsch === "weiss_nicht" && p.deutsch === null;
  p.nichtdeutsch = p.deutsch === false;
  p.doppelstaatler = p.deutsch === true && staaten.some((s) => s !== "DE");
  p.auslandGewohnt = a.auslandGewohnt === "ja";
  p.zuzug = p.nichtdeutsch || p.auslandGewohnt;

  // Sorgerecht
  p.sorge = ["beide", "getrennt_bei_mir", "allein", "vormund", "pflege"].indexOf(a.sorge) >= 0 ? a.sorge : null;

  // Aufenthalt ohne Eltern (nur für Minderjährige ohne deutschen Pass wichtig: RSTP Art. 19)
  p.wohnen = ["gemeinsam", "nicht_gemeinsam", "verwandte", "ohne_eltern"].indexOf(a.wohnen) >= 0 ? a.wohnen : null;
  p.grund = ["gefluechtet", "austausch", "verwandte", "pflege"].indexOf(a.ohneElternGrund) >= 0 ? a.ohneElternGrund : null;
  p.ohneEltern = p.wohnen === "verwandte" || p.wohnen === "ohne_eltern";
  const jahre = typeof a.jahreInDe === "number" ? a.jahreInDe : (a.jahreInDe !== undefined && a.jahreInDe !== null && a.jahreInDe !== "" && !isNaN(Number(a.jahreInDe)) ? Number(a.jahreInDe) : null);
  p.jahreInDe = jahre !== null ? jahre : (a.geborenInDe === "ja" && p.alter !== null ? p.alter : null);
  p.fuenfJahre = p.jahreInDe !== null && p.jahreInDe >= F.alter.fuenfJahre;

  // Besonderheiten
  const bes = objekt(a.besonderes);
  p.maedchenJungenteam = bes.maedchenJungenteam === true;
  p.frauHerren = bes.frauHerren === true;
  p.sonderspielrecht = bes.sonderspielrecht === true;
  const aeltererA = (klassenListe(konfig).find((k) => k.klasse === "A") || {}).aeltererJahrgang || null;
  p.aeltererA = aeltererA;
  p.aushilfe = p.spielen && bes.herrenAushilfe === true && p.minor === true;

  // Zahlung und Beitrag
  const zahl = objekt(a.zahlung);
  p.zahlungArt = zahl.art === "sepa" || zahl.art === "rechnung" ? zahl.art : null;
  const beitrag = objekt(a.beitrag);
  p.familie = liste(beitrag.familie).filter((m) => hatText(objekt(m).vorname) || hatText(objekt(m).nachname));
  p.senator = beitrag.senator === true || beitrag.gruppe === "karneval_senator";
  p.doppel = beitrag.doppel === true;

  // Status beim Spielrecht, internationales Verfahren
  p.spielerpass = ["ja", "nein", "weiss_nicht"].indexOf(a.spielerpass) >= 0 ? a.spielerpass : null;
  p.status = bestimmeStatus(p);
  p.neu = p.status === "neu" || p.status === "ausland_unbekannt";
  p.wechselInland = p.status === "wechsel_hfv" || p.status === "wechsel_lv";
  p.wechselAusland = p.status === "wechsel_ausland";
  p.international = bestimmeInternational(p);

  // Rechtlich besondere Lagen von Kindern ohne Eltern (FIFA Art. 19; F14 bis F18)
  p.sondersorge = p.sorge === "vormund" || p.sorge === "pflege";
  const fifaBetroffen = p.minor === true && p.spielen && p.deutsch !== true;
  p.f15 = fifaBetroffen && p.ohneEltern && p.grund === "gefluechtet";
  p.f16 = fifaBetroffen && p.ohneEltern && p.grund === "austausch";
  p.f17 = fifaBetroffen && p.ohneEltern && (p.grund === "verwandte" || p.grund === "pflege" || (p.wohnen === "verwandte" && !p.grund));
  p.f18 = fifaBetroffen && p.wohnen === "ohne_eltern" && (p.alter === 16 || p.alter === 17)
    && p.grund !== "gefluechtet" && p.grund !== "austausch" && staaten.some((s) => EU_EWR.indexOf(s) >= 0);
  p.ohneZusage = p.f15 || p.f16 || p.f17 || p.f18;
  p.f14 = p.minor === true && (p.sondersorge || p.wohnen === "nicht_gemeinsam" || p.ohneEltern);

  // Abmeldung beim alten Verein
  const ab = objekt(a.abmeldung);
  p.abmeldungStatus = ["einschreiben", "formlos", "noch_nicht", "weiss_nicht"].indexOf(ab.status) >= 0 ? ab.status : null;
  p.abmeldungWeg = ab.weg === "vollmacht" ? "vollmacht" : "einschreiben";
  p.vollmacht = p.wechselInland && p.abmeldungStatus !== "einschreiben" && p.abmeldungWeg === "vollmacht";
  p.abmeldeDatum = p.abmeldungStatus === "einschreiben" && zerlege(ab.datum) ? ab.datum : null;
  // Die Mitgliedschaft im alten Verein endet nicht mit der Abmeldung des Spielrechts (HFV-Vordruck Vollmacht und
  // HFV-Vordruck Abmeldung bei Verein per Einschreiben, SpO § 93): kündigen, passiv bleiben oder unklar.
  const alt = objekt(a.alterVerein);
  p.mitgliedschaftAlt = ["kuendigen", "passiv", "weiss_nicht"].indexOf(alt.mitgliedschaft) >= 0 ? alt.mitgliedschaft : null;

  return p;
}

// Status beim Spielrecht (nur bei Fußball mit Spielen):
//   neu               noch nie ein Spielerpass (auch nicht im Ausland)
//   wechsel_hfv       Spielerpass bei einem Verein in Hessen
//   wechsel_lv        Spielerpass in einem anderen Bundesland
//   wechsel_ausland   Spielerpass im Ausland, Verein bekannt
//   ausland_unbekannt Spielerpass im Ausland, Verein unbekannt (dann internationale Erstausstellung)
// "Weiß nicht" wird abgeleitet: war das Kind im Ausland, dann ausland_unbekannt, sonst neu; in beiden
// Fällen prüft der Verein im Verbandssystem (Hinweis spielerpass_unklar und Weiterleitung an das Passwesen).
// Quelle: HFV-Passstelle Folie 44 (internationaler Vereinswechsel nur, wenn Angaben zu einem Verein im Ausland
// bekannt sind, sonst Erstausstellung); HFV-Antrag Seite 1 (Kästchen erstmalig / Vereinswechsel).
function bestimmeStatus(p) {
  if (!p.spielen) return null;
  const av = objekt(p.a.alterVerein);
  if (p.spielerpass === "nein") return "neu";
  if (p.spielerpass === "weiss_nicht") return p.auslandGewohnt ? "ausland_unbekannt" : "neu";
  if (p.spielerpass === "ja") {
    if (av.region === "hessen") return "wechsel_hfv";
    if (av.region === "bundesland") return "wechsel_lv";
    if (av.region === "ausland") return hatText(av.name) ? "wechsel_ausland" : "ausland_unbekannt";
  }
  return null;
}

// Internationales Verfahren (Freigabe über den DFB): ab 10 Jahren bei bekanntem Auslandsverein, bei
// unbekanntem Auslandsverein, bei Nichtdeutschen und bei Deutschen, die zuletzt im Ausland gewohnt haben.
// Unter 10 Jahren ist kein Freigabeschein nötig (RSTP Art. 9 Abs. 4); bei Nichtdeutschen prüft der Verband
// vor der Registrierung (RSTP Art. 19 Abs. 6). Quelle: DFB-Seite Internationale Transfers (abgerufen 2026-09-29);
// RSTP Art. 19 Abs. 4 und 5; HFV-Passstelle Folien 41 und 44; Korrektur K7 der Vollständigkeitsprüfung.
// Die Altersgrenze zählt hier ab dem 10. Geburtstag (Frage an die Passstelle offen, Korrektur K9).
function bestimmeInternational(p) {
  if (!p.status || p.alter === null) return false;
  if (p.alter < p.F.alter.international) return false;
  if (p.status === "wechsel_ausland" || p.status === "ausland_unbekannt") return true;
  return p.status === "neu" && p.zuzug;
}

// ---------------------------------------------------------------------------
// Fälle F01 bis F18
// ---------------------------------------------------------------------------

function bestimmeFaelle(p) {
  const f = [];
  if (p.abt === "karneval") f.push("F01");
  if (p.abt === "passiv") f.push("F02");
  if (p.spielen && p.status && p.minor !== null) {
    if (p.minor) {
      if (p.neu) {
        if (p.nichtdeutsch && p.alter < p.F.alter.international) f.push("F04");
        else if (p.alter >= p.F.alter.international && (p.nichtdeutsch || p.auslandGewohnt || p.status === "ausland_unbekannt")) f.push("F05");
        else f.push("F03");
      }
      if (p.status === "wechsel_hfv") f.push(p.nichtdeutsch ? "F07" : "F06");
    } else {
      if (p.neu) f.push(p.nichtdeutsch ? "F11" : "F10");
      if (p.wechselInland || p.wechselAusland) f.push("F12");
    }
    if (p.status === "wechsel_lv") f.push("F08");
    if (p.status === "wechsel_ausland") f.push("F09");
  }
  if (p.aushilfe) f.push("F13");
  if (p.f14) f.push("F14");
  if (p.f15) f.push("F15");
  if (p.f16) f.push("F16");
  if (p.f17) f.push("F17");
  if (p.f18) f.push("F18");
  return Array.from(new Set(f)).sort();
}

// ---------------------------------------------------------------------------
// Mannschaft
// ---------------------------------------------------------------------------

function jahrgangPasst(team, jahrgang) {
  if (jahrgang === null) return false;
  if (team.klasse === "Herren") return team.jahrgangBis !== null && jahrgang <= team.jahrgangBis;
  if (liste(team.jahrgaenge).indexOf(jahrgang) >= 0) return true;
  return team.jahrgangAb !== null && team.jahrgangAb !== undefined && jahrgang >= team.jahrgangAb;
}

// Mannschaft nach Jahrgang. Der Verein führt den Jahrgang 2020 in der F2, der Kreis zählt ihn zur G-Jugend.
// Für die Jahrgänge 2010 bis 2013 hat der Verein 2026/27 keine Mannschaft (teams.json).
// Mädchen dürfen in Jungenteams spielen, bis einschließlich B-Jugend; bis einschließlich C-Jugend dürfen sie
// ein Jahr älter sein als die Jungen (JO § 14 Nr. 6). Erwachsene Frauen: SpO § 109a (nur bei den Herren, Antrag).
function bestimmeMannschaft(p) {
  const leer = { vorhanden: false, namen: [], hinweisKey: null, werte: {} };
  if (!p.fussball) return leer;
  const teams = liste(p.cfg.mannschaften);
  if (p.jahrgang === null) return { vorhanden: false, namen: [], hinweisKey: "mannschaft_unbekannt", werte: {} };
  const werte = { klasse: p.klasse || "", jahrgang: p.jahrgang };
  const herren = teams.filter((t) => t.klasse === "Herren");
  // Frauen ab 18: Der Verein hat keine Frauenmannschaft; möglich ist nur das Sonderspielrecht bei den Herren (SpO § 109a).
  if (p.weiblich && p.adult === true) {
    if (p.frauHerren && herren.length) {
      return { vorhanden: true, namen: herren.map((t) => t.name), hinweisKey: "mannschaft_frau_herren", werte: Object.assign(werte, { mannschaft: herren[0].name }) };
    }
    return { vorhanden: false, namen: [], hinweisKey: "mannschaft_frau_keine", werte: werte };
  }
  // Männer (und Personen ohne Angabe zum Geschlecht) der Herrenklasse
  if (p.klasse === "Herren") {
    return { vorhanden: herren.length > 0, namen: herren.map((t) => t.name), hinweisKey: "mannschaft_herren", werte: Object.assign(werte, { mannschaft: herren.length ? herren[0].name : "" }) };
  }
  let passend = teams.filter((t) => t.klasse !== "Herren" && jahrgangPasst(t, p.jahrgang));
  // Mädchen dürfen nur bis einschließlich B-Jugend in Jungenteams spielen (JO § 14 Nr. 6): in der A-Jugend nicht.
  if (p.weiblich && p.klasse === "A") passend = [];
  let bonus = false;
  if (!passend.length && p.weiblich && p.minor === true && p.klasse !== "A") {
    // Mädchen ein Jahr älter als die Jungen in den Klassen bis einschließlich C (JO § 14 Nr. 6)
    const klasseBonus = altersklasse(baueIso(p.jahrgang + 1, 1, 1), p.konfig);
    if (klasseBonus && ["C", "D", "E", "F", "G"].indexOf(klasseBonus) >= 0) {
      passend = teams.filter((t) => t.klasse !== "Herren" && jahrgangPasst(t, p.jahrgang + 1));
      bonus = passend.length > 0;
    }
  }
  const namen = passend.map((t) => t.name);
  werte.mannschaften = namen.join(", ");
  werte.mannschaft = namen[0] || "";
  if (!namen.length) return { vorhanden: false, namen: [], hinweisKey: "keine_mannschaft", werte: werte };
  let key = namen.length > 1 ? "mannschaft_mehrere" : "mannschaft_gefunden";
  if (bonus) key = "mannschaft_maedchen_bonus";
  else if (p.jahrgang === 2020 && p.klasse === "G") key = "mannschaft_2020_f2";
  return { vorhanden: true, namen: namen, hinweisKey: key, werte: werte };
}

// ---------------------------------------------------------------------------
// Beitrag
// ---------------------------------------------------------------------------

function fussballGruppe(p) {
  if (p.familie.length > 0) return "fussball_familie";
  if (p.alter === null) return null;
  // Fußball: "Jugendlicher (inkl. A-Jugend)" - auch 18-jährige A-Jugendliche (Aufnahmeantrag FFV Seite 1)
  if (p.alter < p.F.alter.volljaehrig || p.klasse === "A") return "fussball_jugend";
  // "Passive/Frauen/Rentner (ab 65. Lebensj.)" (Aufnahmeantrag FFV Seite 1)
  if (p.alter >= p.F.alter.rentner || p.weiblich) return "fussball_passiv";
  return "fussball_erwachsene";
}

function karnevalGruppe(p) {
  if (p.senator) return "karneval_senator";
  if (p.familie.length > 0) return "karneval_familie";
  if (objekt(p.a.beitrag).gruppe === "karneval_azubi") return "karneval_azubi";
  if (p.alter === null) return null;
  if (p.alter < p.F.alter.volljaehrig) return "karneval_kinder";
  if (p.alter >= p.F.alter.rentner) return "karneval_rentner";
  return "karneval_erwachsene";
}

// Passt die gewählte Beitragsgruppe zum Alter? (null = nicht prüfbar)
function gruppePasstZumAlter(p, key) {
  if (p.alter === null) return null;
  const jung = p.alter < p.F.alter.volljaehrig;
  switch (key) {
    case "fussball_jugend": return jung || p.klasse === "A";
    case "fussball_erwachsene": return !jung;
    case "karneval_kinder": return jung;
    case "karneval_erwachsene": return !jung;
    case "karneval_rentner": return p.alter >= p.F.alter.rentner;
    case "karneval_azubi": return !jung || p.alter >= 16;
    default: return true;
  }
}

function bestimmeBeitrag(p) {
  const cfg = p.cfg;
  const G = cfg.beitragsgruppen;
  const info = cfg.beitragInfo || {};
  const gewaehlt = objekt(p.a.beitrag).gruppe;
  const gewaehltGueltig = hatText(gewaehlt) && G[gewaehlt] ? gewaehlt : null;
  const ergebnis = {
    gruppe: null, jahr: null, monat: null, aufnahmegebuehr: info.aufnahmegebuehr === undefined ? null : info.aufnahmegebuehr,
    zuschlagOhneSepa: p.zahlungArt === "rechnung" && info.zuschlagOhneSepa !== undefined ? info.zuschlagOhneSepa : null,
    hinweisKey: "beitrag_offen", vorschlag: null, gewaehlt: false, gruppen: [], felder: [], werte: {},
  };
  if (!p.abt) return ergebnis;
  let fuss = null;
  let karn = null;
  if (p.abt === "passiv") {
    karn = p.senator ? "karneval_senator" : null;
    fuss = p.senator ? null : (p.familie.length > 0 ? "fussball_familie" : "fussball_passiv");
  } else {
    if (p.fussball) fuss = fussballGruppe(p);
    if (p.karneval) karn = karnevalGruppe(p);
  }
  // Wahl der Familie berücksichtigen
  if (gewaehltGueltig) {
    if (G[gewaehltGueltig].abteilung === "fussball" && (p.fussball || p.passiv)) { fuss = gewaehltGueltig; if (p.passiv) karn = null; }
    else if (G[gewaehltGueltig].abteilung === "karneval" && (p.karneval || p.passiv)) { karn = gewaehltGueltig; if (p.passiv) fuss = null; }
  }
  const gruppen = [fuss, karn].filter(Boolean);
  ergebnis.vorschlag = gruppen[0] || null;
  ergebnis.gewaehlt = !!gewaehltGueltig;
  ergebnis.gruppen = gruppen;
  ergebnis.felder = gruppen.map((g) => G[g].aufnahmeantragFeld);
  ergebnis.gruppe = gruppen[0] || null;
  ergebnis.doppel = (p.abt === "beides" || p.doppel) && gruppen.length > 0;
  if (gruppen.length === 1 && !ergebnis.doppel) {
    const g = G[gruppen[0]];
    ergebnis.jahr = g.jahr;
    ergebnis.monat = g.monat === undefined ? null : g.monat;
    ergebnis.hinweisKey = gruppen[0].indexOf("familie") >= 0 ? "beitrag_familie"
      : gruppen[0] === "karneval_senator" ? "beitrag_senator"
        : gruppen[0] === "karneval_azubi" ? "beitrag_azubi" : "beitrag_standard";
  } else if (gruppen.length > 0) {
    ergebnis.hinweisKey = "beitrag_doppel";
    ergebnis.einzeln = gruppen.map((g) => ({ gruppe: g, jahr: G[g].jahr, monat: G[g].monat === undefined ? null : G[g].monat }));
  }
  ergebnis.werte = {
    jahr: ergebnis.jahr === null ? "" : ergebnis.jahr,
    monat: ergebnis.monat === null ? "" : ergebnis.monat,
    aufnahmegebuehr: ergebnis.aufnahmegebuehr === null ? "" : ergebnis.aufnahmegebuehr,
    zuschlag: ergebnis.zuschlagOhneSepa === null ? "" : ergebnis.zuschlagOhneSepa,
  };
  return ergebnis;
}

// ---------------------------------------------------------------------------
// Karneval: Gruppenvorschlag nach Alter (Altersangaben nur aus Sekundärquelle, bestaetigt false)
// ---------------------------------------------------------------------------

function bestimmeKarneval(p) {
  const leer = { gruppenVorschlag: [], gruppe: null, passt: null, bestaetigt: false };
  if (!p.karneval) return leer;
  const gruppen = liste(p.cfg.karnevalGruppen);
  const vorschlag = p.alter === null ? [] : gruppen.filter((g) =>
    p.alter >= g.altersVon && (g.altersBis === null || g.altersBis === undefined || p.alter <= g.altersBis)).map((g) => g.name);
  const gewaehlt = text(objekt(p.a.karneval).gruppe);
  const gruppe = gewaehlt && gewaehlt !== "weiss_nicht" ? gewaehlt : null;
  let passt = null;
  if (gruppe && p.alter !== null) {
    const g = gruppen.find((x) => x.name === gruppe);
    passt = g ? vorschlag.indexOf(gruppe) >= 0 : null;
  }
  return { gruppenVorschlag: vorschlag, gruppe: gruppe, passt: passt, bestaetigt: false };
}

// ---------------------------------------------------------------------------
// Frist (Wartefristen R1 bis R9 und R13 bis R14) - Schätzung, der Verein prüft genau
// ---------------------------------------------------------------------------

function abmeldeInfo(p) {
  // Tag der Abmeldung: angegebenes Datum bei Einschreiben, sonst frühestens heute.
  // Bei der Vollmacht ist der Abmeldetag der Tag der Eingabe im System (SpO § 92 Nr. 2, R13).
  if (p.abmeldeDatum) return { datum: p.abmeldeDatum, basis: "angegeben" };
  return { datum: p.heute, basis: "heute" };
}

function fristGrundgeruest(p) {
  return {
    pflichtspieleAb: null, freundschaftsspieleAb: null, regel: null, unsicher: false, key: "frist_kein_spiel",
    basisRegel: null, abmeldedatum: null, basis: null, alternativ: null, entschaedigungMoeglich: false,
    wegfall: false, antragBis: null, werte: {},
  };
}

function fristWerte(p, fr) {
  const s = p.sprache;
  const w = fr.werte;
  w.pflichtspiele = fr.pflichtspieleAb ? datumText(fr.pflichtspieleAb, s) : "";
  w.freundschaftsspiele = fr.freundschaftsspieleAb ? datumText(fr.freundschaftsspieleAb, s) : "";
  w.abmeldung = fr.abmeldedatum ? datumText(fr.abmeldedatum, s) : "";
  w.antragBis = fr.antragBis ? datumText(fr.antragBis, s) : "";
  if (fr.alternativ && fr.alternativ.pflichtspieleAb) w.alternativ = datumText(fr.alternativ.pflichtspieleAb, s);
  return fr;
}

function berechneFrist(p) {
  const fr = fristGrundgeruest(p);
  const F = p.F;
  if (!p.spielen) { fr.key = "frist_kein_spiel"; return fristWerte(p, fr); }
  if (!p.status) { fr.key = "frist_offen"; return fristWerte(p, fr); }

  // R14: Kinder ohne Eltern in Deutschland - keine Zusage zu Spielen (RSTP Art. 19; DFB-Übersichten; HFV-Liste offen)
  if (p.ohneZusage) {
    fr.regel = "R14"; fr.unsicher = true; fr.key = "frist_ohne_zusage";
    return fristWerte(p, fr);
  }
  // R2: internationales Verfahren - Spielrecht erst nach Rückmeldung über den DFB, Dauer offen
  // (RSTP Art. 9 Abs. 4 und Art. 19 Abs. 4 und 5; SpO §§ 99 und 106; Passstelle Folien 41 bis 44).
  if (p.international) {
    fr.regel = "R2"; fr.unsicher = true; fr.key = "frist_international";
    return fristWerte(p, fr);
  }
  // R1: Erstanmeldung - keine Wartefrist, keine Wechselperiode; Spielrecht frühestens am Tag, an dem der Antrag
  // beim Verband eingeht (SpO § 91 Nr. 1). Freundschaftsspiele ebenfalls ab Eingang (R6, SpO § 94 Nr. 5).
  if (p.neu) {
    fr.regel = "R1"; fr.pflichtspieleAb = p.heute; fr.freundschaftsspieleAb = p.heute;
    fr.key = "frist_neu";
    if (p.spielerpass === "weiss_nicht" || p.deutschUnklar) { fr.unsicher = true; fr.key = "frist_neu_unklar"; }
    // Nichtdeutsche unter 10: Der Verband prüft vor der Registrierung (RSTP Art. 19 Abs. 6).
    if (p.nichtdeutsch && p.alter < F.alter.international) { fr.unsicher = true; fr.key = "frist_neu_pruefung"; }
    return fristWerte(p, fr);
  }
  // Wechsel in Deutschland
  if (p.wechselInland) return berechneWechselFrist(p, fr);
  fr.key = "frist_offen";
  return fristWerte(p, fr);
}

function berechneWechselFrist(p, fr) {
  const F = p.F;
  const ab = abmeldeInfo(p);
  const abm = ab.datum;
  const eingang = p.heute;
  fr.abmeldedatum = abm;
  fr.basis = ab.basis;
  fr.freundschaftsspieleAb = eingang; // R6: JO § 38 Nr. 1, SpO § 94 Nr. 5: ab Eingang der vollständigen Unterlagen
  const klasse = p.klasse;
  if (!klasse || p.alter === null) { fr.key = "frist_klasse_unbekannt"; fr.freundschaftsspieleAb = null; return fristWerte(p, fr); }

  const freigabe = p.a.freigabe;
  const mit = freigabe === "ja";
  const unklar = freigabe !== "ja" && freigabe !== "nein";
  const monatTagAbm = monatTag(abm);
  const jahrAbm = jahrVon(abm);
  const imJuni = monatTagAbm >= F.jugend.wechselzeitJuni.von && monatTagAbm <= F.jugend.wechselzeitJuni.bis;

  // Wegfall der Wartefrist: letztes Pflichtspiel länger als 6 Monate her (JO § 47 Nr. 1; SpO § 95 Nr. 2 f).
  // Bei Herren beginnt die Rechnung frühestens mit dem Ablauf einer Sperre.
  let wegfallAb = null;
  const lp = zerlege(p.a.letztesPflichtspiel) ? p.a.letztesPflichtspiel : null;
  const sperreBis = p.a.sperre === "ja" && zerlege(p.a.sperreBis) ? p.a.sperreBis : null;
  const senioren = klasse === "Herren" || aeltererJahrgangFuerWechsel(p, abm);
  if (lp) {
    const basisLetztes = senioren && sperreBis ? maxIso(lp, sperreBis) : lp;
    wegfallAb = plusTage(plusMonate(basisLetztes, F.jugend.wegfallMonateOhnePflichtspiel.wert), 1);
  }

  let regelDatum = null;
  let regel = null;
  let key = null;

  if (klasse === "F" || klasse === "G") {
    // R3: keine Freigabe, keine Wartefrist (JO § 35 Nr. 4, § 38 Nr. 4)
    regel = "R3"; key = "frist_wechsel_fg"; regelDatum = eingang;
  } else if (klasse === "E" && !senioren) {
    // R4: E-Jugend: Juni -> ab 1. Juli; sonst 3 Monate ab dem Tag nach der Abmeldung (JO § 38 Nr. 3)
    regel = "R4";
    if (imJuni) { regelDatum = baueIso(jahrAbm, 7, 1); key = "frist_wechsel_e_juni"; }
    else { regelDatum = erstePflichtspieleNachMonaten(abm, F.jugend.eJugend.ausserhalbJuniMonate); key = "frist_wechsel_e"; fr.werte.monate = F.jugend.eJugend.ausserhalbJuniMonate; }
  } else if (senioren) {
    // R7: Herren und älterer A-Jahrgang: Wechselperioden I und II (SpO § 94 Nr. 2 und 3)
    regel = "R7";
    const r = herrenRegelDatum(p, abm, freigabe);
    regelDatum = r.datum; key = r.key; fr.antragBis = r.antragBis; fr.entschaedigungMoeglich = r.entschaedigungMoeglich;
    if (r.alternativ) fr.alternativ = r.alternativ;
    if (r.zuSpaet) fr.zuSpaet = true;
  } else {
    // R5: A (jüngerer Jahrgang) bis D: JO § 38 Nr. 2 a bis d
    regel = "R5";
    const monateMit = F.jugend.ausserhalbJuni.mitFreigabeMonate;
    const monateOhne = F.jugend.ausserhalbJuni.ohneFreigabeMonate;
    const datumMit = imJuni ? baueIso(jahrAbm, 7, 1) : erstePflichtspieleNachMonaten(abm, monateMit);
    const datumOhne = imJuni ? baueIso(jahrAbm, 11, 1) : erstePflichtspieleNachMonaten(abm, monateOhne);
    if (mit) { regelDatum = datumMit; key = imJuni ? "frist_wechsel_juni_freigabe" : "frist_wechsel_3monate"; fr.werte.monate = monateMit; }
    else {
      // Ohne Freigabe oder Freigabe unklar: der spätere Tag gilt als Schätzung, der frühere steht als Alternative.
      regelDatum = datumOhne; key = imJuni ? "frist_wechsel_juni_ohne" : "frist_wechsel_6monate"; fr.werte.monate = monateOhne;
      if (unklar) { fr.unsicher = true; key = "frist_freigabe_unklar"; fr.alternativ = { pflichtspieleAb: maxIso(eingang, datumMit), freigabe: "ja" }; }
      fr.entschaedigungMoeglich = imJuni; // Außerhalb des Junis ersetzt eine Entschädigung die Freigabe nicht (JO § 36).
    }
    // Offen: Für den jüngeren D-Jahrgang nennt die DFB-Jugendordnung höchstens 3 Monate ohne Freigabepflicht (§ 3 Nr. 3 b),
    // die HFV-Jugendordnung verlangt die Freigabe und bis zu 6 Monate. Deshalb unsicher markieren.
    const jungerD = klasse === "D" && p.klasseInfo && p.jahrgang === p.klasseInfo.bis;
    if (jungerD && !mit) {
      fr.unsicher = true; key = "frist_d_jung_offen";
      if (!fr.alternativ) fr.alternativ = { pflichtspieleAb: maxIso(eingang, erstePflichtspieleNachMonaten(abm, monateMit)), freigabe: "ja" };
    }
  }

  // Wegfall der Wartefrist nach mehr als 6 Monaten ohne Pflichtspiel: gilt nur, wenn das letzte Pflichtspiel am Tag des
  // Antrags schon länger als 6 Monate zurückliegt (JO § 47 Nr. 1; SpO § 95 Nr. 2 f). Die Schätzung nimmt an, dass der
  // Verein die Unterlagen heute einreicht; ein späterer Antrag könnte früher frei sein, das steht nicht in der Schätzung.
  // (in der F- und G-Jugend gibt es ohnehin keine Wartefrist)
  if (wegfallAb && regelDatum && regel !== "R3" && wegfallAb <= eingang && wegfallAb < regelDatum) {
    regelDatum = wegfallAb; key = "frist_entfaellt"; fr.wegfall = true;
    fr.unsicher = false;
    fr.alternativ = null;
    fr.entschaedigungMoeglich = false;
  }
  fr.regel = regel;
  fr.basisRegel = regel;
  fr.key = key;
  fr.pflichtspieleAb = maxIso(eingang, regelDatum);
  if (fr.alternativ && fr.alternativ.pflichtspieleAb) fr.alternativ.pflichtspieleAb = maxIso(eingang, fr.alternativ.pflichtspieleAb);

  // R13: Vollmacht - Abmeldetag ist der Tag der Eingabe im System (SpO § 92 Nr. 2)
  if (p.vollmacht && regel !== "R3") fr.regel = "R13";

  // Unsicherheiten, die jede Schätzung betreffen
  if (p.a.wechselLetzte6Monate === "ja") fr.unsicher = true; // SpO § 94 Nr. 1 b; JO § 39
  if (p.a.sperre === "ja") fr.unsicher = true; // Wartefristen hemmen Sperrstrafen (SpO § 94 Nr. 1 b)
  if (p.abmeldungStatus === "einschreiben" && !p.abmeldeDatum) fr.unsicher = true;
  return fristWerte(p, fr);
}

// Gehört die Person beim Wechsel zu den älteren Jahrgängen mit den Regeln der Senioren?
// Älterer A-Jahrgang und ältere B-Juniorinnen; ab 1. Juni des laufenden Spieljahres auch der Jahrgang, der im
// folgenden Spieljahr zum älteren Jahrgang gehört (JO § 40).
function aeltererJahrgangFuerWechsel(p, abm) {
  const F = p.F;
  if (p.klasse === "A" && p.klasseInfo) {
    if (p.jahrgang === p.klasseInfo.aeltererJahrgang) return true;
    if (p.jahrgang === p.klasseInfo.aeltererJahrgang + 1 && abm) {
      const spieljahrEnde = jahrVon(F.spieljahr.bis);
      return abm >= baueIso(spieljahrEnde, 6, 1);
    }
  }
  if (p.klasse === "B" && p.weiblich && p.klasseInfo && p.jahrgang === p.klasseInfo.aeltererJahrgang) return true;
  return false;
}

// R7: Wechselperioden der Senioren (SpO § 94 Nr. 2 und 3, Stand 2026-07-06)
//  I:  Abmeldung bis 30. Juni, Antrag bis 31. August. Mit Zustimmung oder nachgewiesener Entschädigung ab Eingang,
//      frühestens 1. Juli, sonst 1. November.
//  II: Abmeldung 1. Juli bis 31. Dezember, Antrag bis 31. Januar. Nur mit Zustimmung ab Eingang, frühestens 1. Januar;
//      sonst erst 1. November des folgenden Spieljahres.
function herrenRegelDatum(p, abm, freigabe) {
  const S = p.F.senioren;
  const mit = freigabe === "ja";
  const unklar = freigabe !== "ja" && freigabe !== "nein";
  const j = jahrVon(abm);
  const md = monatTag(abm);
  const eingang = p.heute;
  let mitDatum; let ohneDatum; let antragBis; let wp; let entsch = false;
  if (md <= S.wechselperiodeI.abmeldungBis) {
    wp = "wp1";
    mitDatum = baueIso(j, 7, 1); ohneDatum = baueIso(j, 11, 1); antragBis = baueIso(j, 8, 31); entsch = true;
  } else {
    wp = "wp2";
    mitDatum = baueIso(j + 1, 1, 1); ohneDatum = baueIso(j + 1, 11, 1); antragBis = baueIso(j + 1, 1, 31);
  }
  const datum = mit ? mitDatum : ohneDatum;
  const key = "frist_herren_" + wp + (mit ? "_zustimmung" : "_ohne");
  const ergebnis = {
    datum: datum, key: key, antragBis: antragBis, entschaedigungMoeglich: entsch && !mit, zuSpaet: eingang > antragBis,
  };
  if (unklar) ergebnis.alternativ = { pflichtspieleAb: mitDatum, freigabe: "ja" };
  return ergebnis;
}

// ---------------------------------------------------------------------------
// Unterlagen U01 bis U40
// ---------------------------------------------------------------------------

function eintrag(p, id, o) {
  const opt = o || {};
  const d = p.cfg.unterlagen[id] || {};
  return {
    id: id,
    art: opt.art || d.art,
    wer: opt.wer || d.wer,
    wann: opt.wann || d.wann,
    form: opt.form || d.form,
    formular: opt.formular !== undefined ? opt.formular : (d.formular === undefined ? null : d.formular),
    nachweis: opt.nachweis !== undefined ? opt.nachweis : !!d.nachweis,
    textKey: id,
    quelle: d.quelle || "",
    grund: opt.grund || null,
    werte: opt.werte || {},
  };
}

function bestimmeUnterlagen(p, gruppenKeys, fr) {
  const liste0 = [];
  const add = (id, o) => { liste0.push(eintrag(p, id, o)); };
  const minor = p.minor === true;
  const adult = p.adult === true;

  // ---- Für alle ----
  add("U01", { grund: "mitgliedschaft" }); // Quelle: Aufnahmeantrag FFV 2026-09; Satzung § 6; JO §§ 3 und 9 Nr. 1
  if (p.familie.length > 0 || gruppenKeys.some((g) => g.indexOf("familie") >= 0)) add("U02", { grund: "familienbeitrag" });
  if (gruppenKeys.indexOf("karneval_azubi") >= 0) add("U03", { grund: "azubi" });
  add("U04", { grund: "fotos" });
  if (p.zahlungArt === "sepa") add("U05", { grund: "lastschrift" });
  add("U06", { grund: "datenschutz" }); // DSGVO Art. 13
  add("U35", { art: p.fussball ? "verein" : "offen", grund: "aufnahmegebuehr", werte: { betrag: (p.cfg.beitragInfo || {}).aufnahmegebuehr } });
  if (p.senator) add("U34", { grund: "senator" });

  // ---- Fußball mit Spielrecht ----
  if (p.spielen) {
    add("U07", { grund: "spielrechtsantrag" }); // HFV-Antrag; SpO § 92; JO § 37 Nr. 2
    add("U08", { grund: "hfv_einwilligungen" });
    add("U15", { grund: "dfbnet_angaben" });
    const foto = objekt(p.a.spielerfoto).weg;
    const fotoWerte = { jahre: p.F.spielerfotoErneuernJahre.kreisFrankfurt };
    add("U16", foto === "verein" ? { wer: "verein", form: "nichts", grund: "spielerfoto_verein", werte: fotoWerte } : { grund: "spielerfoto", werte: fotoWerte }); // JO § 9 Nr. 2

    // U09 Geburtsurkunde: Erstanmeldung Minderjähriger (JO § 9 Nr. 1; HFV-Antrag Seite 2) und internationale Fälle
    // Minderjähriger (Passstelle Folien 41 und 44). Beim Wechsel Minderjähriger offen (Wortlaut JO § 9 gegen Formular).
    if (minor) {
      if (p.neu || p.international) add("U09", { art: "pflicht", grund: "erstanmeldung_minderjaehrig" });
      else if (p.wechselInland || p.wechselAusland) add("U09", { art: "offen", grund: "wechsel_minderjaehrig" });
    }

    // U10 Attest: Erstanmeldung Minderjähriger, internationale Fälle Minderjähriger, Juniorinnen unter 18 (SpO § 110),
    // A-Jugend unter 18 bei den Herren (JO § 29 Nr. 5 c). Beim Wechsel offen (P1 der Fragen an die Passstelle).
    // Erwachsene: nur Vereinsregel (Info-Blatt), deshalb art "verein".
    let art10 = null; let grund10 = null;
    if (minor) {
      if (p.neu || p.international) { art10 = "pflicht"; grund10 = "erstanmeldung_minderjaehrig"; }
      else if (p.weiblich) { art10 = "pflicht"; grund10 = "juniorin_unter_18"; }
      else if (p.wechselInland || p.wechselAusland) { art10 = "offen"; grund10 = "wechsel_minderjaehrig"; }
      if (p.aushilfe) { art10 = "pflicht"; grund10 = "herren_aushilfe"; }
    } else if (adult && p.neu) { art10 = "verein"; grund10 = "vereinsregel_erwachsene"; }
    if (art10) {
      add("U10", { art: art10, grund: grund10 });
      // U10 bleibt "offen", solange unklar ist, ob der Verband das Attest beim Wechsel verlangt (O04, O05). Hat die Familie
      // aber schon eines (a.nachweise.U10 "habe") und gibt es ab, ist die Einwilligung zur Verarbeitung von Gesundheitsdaten
      // (Art. 9 DSGVO) sicher nötig. Dann gilt U11 als Vereinsvorgabe. Damit gehört das Formular "attest" in e.formulare
      // und seine Stellen (arzt, einwilligung) kommen in e.unterschriften. Bei "fehlt" oder ohne Antwort bleibt U11 "offen".
      const attestDa = art10 === "offen" && objekt(p.a.nachweise).U10 === "habe";
      add("U11", attestDa ? { art: "verein", grund: "attest_vorhanden" } : { art: art10 === "offen" ? "offen" : "verein", grund: grund10 });
    }

    // U12 Ausweiskopie
    // Deutsche (auch Doppelstaatler): nicht verlangen (PAuswG § 20, PassG § 18); nach Wechsel aus dem Ausland oder bei
    // Rückkehrern offen, weil das Formular sie verlangt (HFV-Antrag Seite 2).
    // Nichtdeutsche: neu 10 bis 17 pflicht, unter 10 offen; beim Wechsel jedes Alters; Erwachsene immer.
    if (p.deutsch !== false) {
      if (p.wechselAusland || p.status === "ausland_unbekannt" || p.international) {
        add("U12", { art: "offen", form: "original_mitbringen", nachweis: false, grund: "deutscher_ausweis_ausland" });
      }
    } else if (minor) {
      if (p.neu && p.alter < p.F.alter.international) add("U12", { art: "offen", grund: "nichtdeutsch_unter_10" });
      else add("U12", { art: "pflicht", grund: p.neu ? "nichtdeutsch_erstanmeldung" : "nichtdeutsch_wechsel" });
    } else if (adult) {
      add("U12", { art: "pflicht", grund: "nichtdeutsch_erwachsen" });
    }

    // U13 Meldebescheinigung (gemeinsamer Wohnsitz mit den Erziehungsberechtigten): nur Minderjährige
    if (minor) {
      if (p.international) add("U13", { art: "pflicht", grund: "international_minderjaehrig" });
      else if (p.nichtdeutsch && p.wechselInland && p.alter >= p.F.alter.international) add("U13", { art: "offen", grund: "wechsel_nichtdeutsch_10_17" });
      else if (p.nichtdeutsch && p.alter < p.F.alter.international) add("U13", { art: "offen", grund: "nichtdeutsch_unter_10" });
    }

    // U14 Auslandsverein
    if (p.wechselAusland) add("U14", { grund: "wechsel_ausland" });

    // Abmeldung beim alten Verein (nur Wechsel innerhalb Deutschlands)
    if (p.wechselInland) {
      if (p.abmeldungStatus === "einschreiben") {
        add("U17", { formular: null, form: "foto_oder_datei", nachweis: true, grund: "einschreiben_erledigt" });
      } else if (p.vollmacht && p.status === "wechsel_hfv") {
        add("U18", { grund: "vollmacht" });
      } else if (p.vollmacht && p.status === "wechsel_lv") {
        add("U17", { grund: "einschreiben_standard" });
        add("U18", { art: "offen", grund: "vollmacht_anderer_verband" });
      } else {
        add("U17", { grund: "einschreiben_noch_offen" });
      }
      // Beim Weg "Vollmacht" braucht es das Formular Abmeldung nur für die Mitgliedschaft (kündigen oder passiv bleiben);
      // beim Weg "Einschreiben" steht die Mitgliedschaft auf demselben Blatt wie die Abmeldung des Spielrechts.
      if (p.mitgliedschaftAlt === "kuendigen" || p.mitgliedschaftAlt === "passiv") {
        add("U19", { art: "nur_wenn", grund: p.mitgliedschaftAlt === "passiv" ? "passiv_bleiben" : "kuendigung_mitgliedschaft" });
      } else {
        add("U19", { art: "offen", formular: null, form: "nichts", grund: "mitgliedschaft_unklar" });
      }
      if (p.a.freigabe !== "ja" && !fr.wegfall && (p.klasse === "Herren" || ["A", "B", "C", "D"].indexOf(p.klasse) >= 0)) {
        add("U20", { grund: "keine_zustimmung" });
      }
      if (fr.entschaedigungMoeglich) add("U21", { grund: "entschaedigung" });
      if (fr.wegfall) add("U22", { grund: "sechs_monate_ohne_pflichtspiel" });
    }

    // U23 Seniorenspielrecht (A-Jugend unter 18)
    if (p.aushilfe) add("U23", { grund: "herren_aushilfe" });
    // U24 Mädchen im Jungenteam der B- oder C-Jugend
    if (p.maedchenJungenteam && minor && p.weiblich) add("U24", { grund: "maedchen_b_c" });

    // U26/U27 offen
    if (p.international && minor && p.nichtdeutsch) add("U26", { grund: "zusatzerklaerung_offen" });
    if (p.wechselAusland && LAENDER_ZUSATZFORMULAR.indexOf(landCode(objekt(p.a.alterVerein).land)) >= 0) add("U27", { grund: "laenderformular_offen" });

    // U36 bis U38 Kinder ohne Eltern
    if (p.f15) add("U36", { grund: "gefluechtet_ohne_eltern" });
    if (p.f16) add("U37", { grund: "austausch" });
    if (p.f17 || p.f18) add("U38", { art: p.fuenfJahre ? "pflicht" : "offen", grund: p.fuenfJahre ? "fuenf_jahre" : "fuenf_jahre_fehlen" });

    // U39/U40 Geschlecht
    if (p.frauHerren && p.weiblich && adult) add("U39", { grund: "frau_bei_herren" });
    if (p.divers) add("U40", { grund: "divers_ohne_angabe" });
  }

  // U25 Vormund oder Pflegeperson (auch ohne Fußball); F15 (Schutzstatus, Vormund)
  if (minor && (p.sondersorge || p.f15)) add("U25", { grund: p.sorge === "pflege" ? "pflege" : "vormund" });

  // ---- Gesundheit, Einverständnisse ----
  if (minor && p.aktiv) {
    add("U28", { grund: "notfallbogen" });
    const einw = objekt(p.a.einwilligungen);
    if (!(einw.fahrten === false && einw.messenger === false)) add("U29", { grund: "fahrten_messenger" });
  }

  // ---- Karneval ----
  if (p.karneval) {
    // Keine HFV-Unterlagen, kein Attest (Recherche Abschnitt 6: weder BDK noch RKK noch Großer Rat verlangen es).
    const k = objekt(p.a.karneval);
    if (minor && k.abendOhneEltern === "ja") add("U30", { grund: "abendauftritt" });
    add("U31", { grund: "kostueme" });
    if (k.turnier === "ja" || k.turnier === "weiss_nicht") add("U32", { grund: "turnier" });
  }

  // ---- Beitrag ----
  if (minor && p.a.leistungen === "ja") add("U33", { grund: "leistungen", werte: { betrag: (p.cfg.beitragInfo || {}).teilhabePauschaleMonat } });

  liste0.sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
  return liste0;
}

// ---------------------------------------------------------------------------
// Formulare und Unterschriften
// ---------------------------------------------------------------------------

const FORMULAR_REIHENFOLGE = ["aufnahmeantrag", "familienliste", "datenschutz", "hfv_antrag", "vollmacht", "abmeldung",
  "einverstaendnis_senioren", "einverstaendnis_maedchen", "einverstaendnis_fahrten", "karneval_auftritte", "attest", "notfall"];

// Formulare im PDF: alle Formulare der Unterlagen, die sicher oder als Vereinsvorgabe gelten (nicht "offen").
function bestimmeFormulare(unterlagen) {
  const menge = new Set();
  unterlagen.forEach((u) => { if (u.formular && u.art !== "offen") menge.add(u.formular); });
  return FORMULAR_REIHENFOLGE.filter((f) => menge.has(f));
}

// Wer unterschreibt? Erwachsene selbst. Bei Minderjährigen die Sorgeberechtigten: Der HFV verlangt einen gesetzlichen
// Vertreter (SpO § 92 Nr. 1, JO § 37 Nr. 2). Nach Zivilrecht vertreten Eltern gemeinsam (BGB § 1629); deshalb die
// Empfehlung "beide" beim Aufnahmeantrag (Vorstandsentscheidung offen). Bei getrennt lebenden Eltern entscheidet der
// Elternteil, bei dem das Kind lebt, im Alltag allein (BGB § 1687), sofern der andere einverstanden ist.
//   erste     wer unterschreibt die gedruckte Zeile des Aufnahmeantrags (Seite 2) und die Foto-Einwilligung (Seite 3)
//   zweite    zusätzliche Zeile für beide Eltern auf Seite 2 (nur bei Empfehlung "beide"), sonst null
//   einer     wer unterschreibt die übrigen Blätter
function rollen(p) {
  if (p.minor !== true) return { erste: "mitglied", zweite: null, einer: "mitglied" };
  switch (p.sorge) {
    case "beide": return { erste: "sorgeberechtigte", zweite: "sorgeberechtigte_beide", einer: "sorgeberechtigte" };
    case "getrennt_bei_mir":
      return { erste: "sorgeberechtigte", zweite: p.a.andererElternteilEinverstanden === true ? null : "sorgeberechtigte_beide", einer: "sorgeberechtigte" };
    default: return { erste: "sorgeberechtigte", zweite: null, einer: "sorgeberechtigte" };
  }
}

function bestimmeUnterschriften(p, formulare) {
  const r = rollen(p);
  const minor = p.minor === true;
  const einw = objekt(p.a.einwilligungen);
  const aus = [];
  const st = (formular, stelleKey, wer) => { aus.push({ formular: formular, stelleKey: stelleKey, wer: wer }); };
  formulare.forEach((f) => {
    switch (f) {
      case "aufnahmeantrag":
        st(f, "s2.unterschrift", r.erste);
        if (r.zweite) st(f, "s2.unterschrift_sorgeberechtigte", r.zweite);
        st(f, "s3.unterschrift", r.erste);
        if (p.zahlungArt === "sepa") st(f, "s4.unterschrift", "kontoinhaber");
        break;
      case "datenschutz": st(f, "kenntnisnahme", r.einer); break;
      case "hfv_antrag":
        // HFV-Vordrucke nur mit Stift (JO § 37 Nr. 2: eigenhändige Unterschrift; SpO § 92: Original 2 Jahre aufbewahren)
        st(f, "spieler", minor ? "spieler" : "mitglied");
        if (minor) st(f, "erziehungsberechtigte", r.einer);
        st(f, "verein", "verein");
        if (einw.hfvName === true && p.alter !== null && p.alter < p.F.alter.hfvNameEinwilligungUnter) st(f, "einwilligung_a", r.einer);
        if (einw.hfvFoto === true) st(f, "einwilligung_b", minor ? r.einer : "mitglied");
        break;
      case "vollmacht": st(f, "unterschrift", r.einer); break;
      case "abmeldung":
        // Zwei Zeilen im Vordruck: Spielerin oder Spieler, bei Minderjährigen zusätzlich der gesetzliche Vertreter
        // (JO § 3 Nr. 2: Der Austritt Minderjähriger gilt nur mit der Unterschrift des gesetzlichen Vertreters).
        st(f, "unterschrift", minor ? "spieler" : "mitglied");
        if (minor) st(f, "unterschrift_vertreter", r.einer);
        break;
      case "einverstaendnis_senioren": st(f, "unterschrift", r.einer); break;
      case "einverstaendnis_maedchen": st(f, "unterschrift", r.einer); break;
      case "einverstaendnis_fahrten": st(f, "unterschrift", r.einer); break;
      case "karneval_auftritte": st(f, "unterschrift", r.einer); break;
      case "attest":
        st(f, "arzt", "arzt");
        st(f, "einwilligung", minor ? r.einer : "mitglied");
        break;
      case "notfall": st(f, "unterschrift", r.einer); break;
      default: break;
    }
  });
  return aus;
}

// ---------------------------------------------------------------------------
// Hinweise und Weiterleitung
// ---------------------------------------------------------------------------

const ART_REIHENFOLGE = { warnung: 0, frist: 1, info: 2, offen: 3 };

function sammler() {
  const hw = [];
  const wl = [];
  return {
    hw: hw,
    wl: wl,
    h(art, key, werte) {
      pruefeSchluessel("hinweise", key);
      if (!hw.some((x) => x.key === key)) hw.push({ art: art, key: key, werte: werte || {} });
    },
    w(an, key) {
      pruefeSchluessel("weiterleitung", key);
      if (!wl.some((x) => x.key === key && x.an === an)) wl.push({ an: an, key: key });
    },
  };
}

function sammleHinweise(p, e) {
  const S = sammler();
  const h = S.h;
  const w = S.w;
  const F = p.F;
  const minor = p.minor === true;
  const sp = p.sprache;
  const ids = e.unterlagen.map((u) => u.id);
  const hat = (id) => ids.indexOf(id) >= 0;
  const art = (id) => { const u = e.unterlagen.find((x) => x.id === id); return u ? u.art : null; };

  // --- Regelwerk selbst (R12) ---
  if (zerlege(p.heute) && (p.heute < F.spieljahr.von || p.heute > F.spieljahr.bis)) {
    h("warnung", "regelwerk_saison", { saison: F.spieljahr.gilt });
  }
  liste(F.aenderungen).forEach((x) => { if (p.heute >= x.ab) h("offen", x.key, { datum: datumText(x.ab, sp) }); });

  // --- Für alle ---
  if (p.aktiv) h("info", "probetraining_versicherung"); // ARAG-Merkblatt A.II.2.1, Stand 2026-01-01: Nichtmitglieder nicht versichert
  h("offen", "mitgliedschaft_beginn"); // R15: Satzung § 6 (Tag der Anmeldung) gegen Website und App (1. des Folgemonats)
  h("info", "kuendigung_jahresende"); // Aufnahmeantrag FFV Seite 1, Satzung § 8: Austritt nur zum 31. Dezember per Einschreiben
  if (p.passiv) h("info", "passiv_hinweis");
  if (p.senator) { h("info", "senator_vorstand"); w("geschaeftsstelle", "senator"); }

  // --- Fußball mit Spielrecht ---
  if (p.spielen) {
    if (minor) h("info", "ohne_spielrecht_kein_spiel"); // KJA Frankfurt 2026/27 (Jugend): freie Spieler auch nicht in Freundschaftsspielen
    h("info", "mitgliedschaft_zuerst"); // R10: JO § 9 Nr. 1: Voraussetzung der Spielberechtigung ist die Mitgliedschaft
    if (hat("U16")) h("info", "spielerfoto_hinweis"); // JO § 9 Nr. 2
    if (hat("U10")) { h("offen", "attest_aktuell"); if (art("U10") === "pflicht") h("info", "attest_kosten"); }
    if (e.unterlagen.some((u) => u.nachweis)) h("info", "unterlagen_kein_whatsapp"); // DSK-Orientierungshilfe 2021-06-16
    if (p.wechselInland || p.wechselAusland) h("offen", "wechselgebuehr", { betrag: minor ? F.gebuehren.wechselJunioren : F.gebuehren.wechselHerren });
    if (p.spielerpass === "weiss_nicht") { h("offen", "spielerpass_unklar"); w("passwesen", "spielerpass_unklar"); }
    if (p.deutschUnklar) { h("offen", "staatsangehoerigkeit_unklar"); w("passwesen", "staatsangehoerigkeit_unklar"); }
    if (p.doppelstaatler) { h("offen", "doppelstaatler"); w("passwesen", "doppelstaatler"); }
    if (hat("U12") && art("U12") === "offen" && p.deutsch !== false) h("offen", "ausweis_deutsch_original");
    if (hat("U13")) h("offen", "meldebescheinigung_elternteil"); // Korrektur K2
    if (hat("U27")) { h("offen", "laenderformulare_offen"); w("passwesen", "laenderformulare"); }
    if (e.unterlagen.some((u) => u.art === "offen" && ["U09", "U10", "U12", "U13", "U26"].indexOf(u.id) >= 0)) w("passwesen", "offene_fragen_verband");

    // Internationales Verfahren (R2)
    if (p.international) {
      h("info", "international_dauer");
      w("passwesen", "international_klaeren");
      if (p.alter >= 18) h("offen", "ausland_erwachsen_wechselperiode");
    }
    if (p.nichtdeutsch && p.alter !== null && p.alter < F.alter.international && p.neu) {
      h("info", "international_unter10");
      w("passwesen", "unter10_pruefung");
    }
    if (p.alter === 9 && (p.nichtdeutsch || p.zuzug || p.wechselAusland)) h("offen", "grenze_10_offen"); // Korrektur K9
    if (p.deutsch === true && p.auslandGewohnt && p.alter !== null && p.alter >= F.alter.international && p.neu) h("info", "zuzug_pruefen");

    // Wechsel innerhalb Deutschlands (R9, R13)
    if (p.wechselInland) {
      if (p.abmeldungStatus === "formlos") h("warnung", "abmeldung_formlos");
      if (p.abmeldungStatus !== "einschreiben") h("warnung", "abmeldung_nach_letztem_spiel");
      if (p.abmeldungStatus === "weiss_nicht") { h("offen", "abmeldung_unklar"); w("passwesen", "abmeldung_unklar"); }
      if (zerlege(p.a.letztesSpiel) && p.abmeldeDatum && p.a.letztesSpiel > p.abmeldeDatum) h("warnung", "abmeldung_vor_letztem_spiel");
      h("warnung", "nie_zwei_vereine");
      // Die Mitgliedschaft im alten Verein endet nicht mit der Abmeldung des Spielrechts (Vordrucke der Passstelle).
      if (p.mitgliedschaftAlt === "passiv") h("info", "passiv_alter_verein");
      else h("warnung", "kuendigung_extra");
      if (p.mitgliedschaftAlt === null || p.mitgliedschaftAlt === "weiss_nicht") h("offen", "mitgliedschaft_alter_verein_unklar");
      if (p.vollmacht) {
        h("warnung", "vollmacht_eingabe_zeitnah");
        if (e.frist.abmeldedatum && monatTag(e.frist.abmeldedatum) > F.vollmacht.kurzeWartefristNurBis && p.klasse !== "F" && p.klasse !== "G") h("info", "vollmacht_ohne_kurze_frist");
        if (p.status === "wechsel_lv") { h("offen", "vollmacht_anderer_verband"); w("passwesen", "vollmacht_anderer_verband"); }
      }
      if (p.status === "wechsel_lv") h("info", "wechsel_lv_anfrage", { tage: minor ? F.jugend.uebergebietlichAntwortTage.wert : F.senioren.uebergebietlichAntwortTage.wert });
      // Ohne angegebenes Datum rechnet die Schätzung mit einer Abmeldung heute (bei der Vollmacht: Eingabe heute).
      if (e.frist.basis === "heute" && ["R4", "R5", "R7", "R13"].indexOf(e.frist.regel) >= 0 && !e.frist.wegfall) {
        h("info", "frist_annahme_heute", { abmeldung: datumText(e.frist.abmeldedatum, sp) });
      }
      if (p.a.wechselLetzte6Monate === "ja") { h("warnung", "wiederholter_wechsel"); w("passwesen", "wiederholter_wechsel"); }
      if (p.a.sperre === "ja") h("info", "sperre_laeuft");
      if (p.a.sperre === "weiss_nicht") h("offen", "sperre_unklar");
      if ((e.frist.basisRegel === "R5" || e.frist.basisRegel === "R7") && p.a.freigabe !== "ja" && p.a.freigabe !== "nein" && !e.frist.wegfall) h("offen", "freigabe_unklar");
      if (e.frist.key === "frist_d_jung_offen") h("offen", "d_jahrgang_wartefrist_offen");
      if (hat("U20")) h("info", "nachtraegliche_freigabe");
      if (e.frist.entschaedigungMoeglich) {
        const jugendBetrag = ["A", "B"].indexOf(p.klasse) >= 0 ? F.entschaedigung.jugendBeiKreisligaA.aBJugend : F.entschaedigung.jugendBeiKreisligaA.cDJugend;
        h("info", "entschaedigung_hinweis", { betrag: minor ? jugendBetrag : F.entschaedigung.herrenWechselperiodeI.abKreisliga });
      }
      if (e.frist.antragBis) h("frist", "antrag_bis", { datum: datumText(e.frist.antragBis, sp) });
      if (e.frist.zuSpaet) h("warnung", "antrag_zu_spaet", { datum: datumText(e.frist.antragBis, sp) });
      if (minor) {
        w("jugendleitung", "sonderwege"); // R8
        h("info", "sonderwege_jugend");
        const kl = p.klasse;
        const imJuni = e.frist.abmeldedatum && monatTag(e.frist.abmeldedatum) >= F.jugend.wechselzeitJuni.von && monatTag(e.frist.abmeldedatum) <= F.jugend.wechselzeitJuni.bis;
        if (["E", "D", "C", "B", "A"].indexOf(kl) >= 0 && !imJuni && e.frist.regel !== "R7") h("info", "juni_wechselzeit");
        if (kl === "E" && imJuni && p.klasseInfo && p.jahrgang === p.klasseInfo.aeltererJahrgang) h("info", "e_aelter_juni");
      } else {
        w("spielausschuss", "herren_wechsel");
      }
    }
  }

  // --- Mädchen (JO § 14 Nr. 6, SpO § 110) ---
  if (p.spielen && p.weiblich && minor) {
    h("info", "maedchen_jungenteam");
  }
  // --- A-Jugend bei den Herren (JO § 29) ---
  if (p.aushilfe) {
    h("info", "herren_aushilfe");
    h("offen", "sportarzt_offen"); // Korrektur K3
    w("jugendleitung", "aushilfe");
    if (p.jahrgang !== p.aeltererA) { h("warnung", "aushilfe_nur_ausnahme"); }
  }
  if (p.spielen && p.klasse === "A" && p.jahrgang === p.aeltererA && p.adult === true) h("info", "herren_ohne_antrag");
  // --- Frauen bei den Herren (SpO § 109a) ---
  if (p.spielen && p.weiblich && p.adult === true) {
    if (p.frauHerren) { h("info", "frau_herren"); h("offen", "frau_herren_offen"); w("spielausschuss", "frau_herren"); }
    else h("info", "keine_frauenmannschaft");
  }
  // --- divers / ohne Angabe (SpO § 91 Nr. 8 bis 10; JO § 37 Nr. 3) ---
  if (p.spielen && p.divers) { h("info", "vertrauensperson"); w("jugendleitung", "vertrauensperson"); }
  // --- Sonderspielrecht (JO § 11 Nr. 5 und 6) ---
  if (p.spielen && p.sonderspielrecht) { h("info", "sonderspielrecht"); w("jugendleitung", "sonderspielrecht"); }

  // --- Mannschaft ---
  if (e.mannschaft.hinweisKey === "keine_mannschaft") w("jugendleitung", "keine_mannschaft");

  // --- Sorgerecht und Unterschriften ---
  if (minor) {
    if (p.sorge === "beide") h("info", "beide_unterschreiben_empfohlen");
    if (p.sorge === "getrennt_bei_mir") {
      if (p.a.andererElternteilEinverstanden === true) h("info", "getrennt_einverstanden");
      else { h("warnung", "getrennt_zustimmung"); w("jugendleitung", "getrennte_eltern"); }
    }
    if (p.sorge === "allein") h("info", "sorge_allein_nachweis");
    if (p.sorge === "vormund") h("info", "vormund_hinweis");
    if (p.sorge === "pflege") h("info", "pflege_hinweis");
    // Kein Hinweis, dass Jugendliche bei den Fotos mit unterschreiben: Der Vorstand hat noch nicht entschieden, ob ab 14 oder
    // ab 16 (O65). Bis dahin unterschreiben bei der Foto-Einwilligung nur die Sorgeberechtigten (aufnahmeantrag, s3.unterschrift).
    if (p.spielen) h("offen", "spieler_unterschrift_kind");
    if (p.f14) w("jugendleitung", "sonderfall_kind");
    if (p.wohnen === "nicht_gemeinsam") { h("offen", "wohnen_nicht_gemeinsam"); w("jugendleitung", "wohnen_nicht_gemeinsam"); }
    if (p.ohneZusage) {
      h("warnung", "ohne_zusage_spielen"); // R14
      h("offen", "unterlagen_liste_offen");
      if (p.f17 || p.f18) h(p.fuenfJahre ? "info" : "warnung", p.fuenfJahre ? "f17_moeglich_5_jahre" : "f17_wahrscheinlich_nicht");
      if (p.f16) h("info", "austausch_ein_jahr");
    }
  }

  // --- Karneval ---
  if (p.karneval) {
    const k = objekt(p.a.karneval);
    h("info", "karneval_kein_attest");
    if (e.karneval.gruppenVorschlag.length) h("info", "karneval_gruppe_vorschlag", { gruppen: e.karneval.gruppenVorschlag.join(", ") });
    if (e.karneval.passt === false) h("offen", "karneval_gruppe_alter_pruefen", { gruppe: e.karneval.gruppe });
    if (k.abendOhneEltern === "ja" && minor) h("info", "karneval_abend");
    if (k.tanztWoanders === "ja") h("warnung", "karneval_tanzt_woanders");
    if (k.turnier === "ja" || k.turnier === "weiss_nicht") { h("offen", "karneval_turnier_offen"); w("karneval", "turnier"); }
    h("offen", "kostueme_offen");
    w("karneval", "kostueme");
    w("karneval", "gruppe_einteilung");
  }

  // --- Beitrag und Zahlung ---
  const b = e.beitrag;
  b.gruppen.forEach((g) => {
    const ok = gruppePasstZumAlter(p, g);
    if (ok === false) h("warnung", "beitrag_gruppe_pruefen", { gruppe: p.cfg.beitragsgruppen[g].bezeichnung });
  });
  if (p.familie.length > 0 || b.gruppen.some((g) => g.indexOf("familie") >= 0)) { h("offen", "beitrag_familie_offen"); w("geschaeftsstelle", "beitrag_familie"); }
  if (b.doppel) { h("offen", "beitrag_doppel"); w("geschaeftsstelle", "beitrag_doppel"); }
  if (p.zahlungArt === "rechnung" && b.zuschlagOhneSepa !== null) h("offen", "zuschlag_ohne_sepa", { betrag: b.zuschlagOhneSepa });
  const zahl = objekt(p.a.zahlung);
  if (p.zahlungArt === "sepa" && hatText(zahl.iban) && text(zahl.iban).replace(/\s/g, "").slice(0, 2).toUpperCase() !== "DE") h("offen", "iban_ausland_pruefen");
  if (p.zahlungArt === "sepa" && zahl.kontoinhaber === "andere") h("info", "kontoinhaber_andere");
  if (hat("U35") && art("U35") === "offen") h("offen", "aufnahmegebuehr_offen");
  if (minor && p.a.leistungen === "ja") { h("info", "bildung_teilhabe", { betrag: (p.cfg.beitragInfo || {}).teilhabePauschaleMonat }); h("info", "beitragserlass"); w("geschaeftsstelle", "beitragserlass"); }

  // --- Gesundheit ---
  if (hatText(objekt(p.a.gesundheit).medikamente)) h("info", "medikamente_absprache");

  S.hw.sort((x, y) => ART_REIHENFOLGE[x.art] - ART_REIHENFOLGE[y.art]);
  return { hinweise: S.hw, weiterleitung: S.wl };
}

// ---------------------------------------------------------------------------
// Fehlend
// ---------------------------------------------------------------------------

// Nötig, aber in a.nachweise als "fehlt" oder unbeantwortet. "Offen" zählt nicht (nur vielleicht nötig).
function bestimmeFehlend(p, unterlagen) {
  const nachweise = objekt(p.a.nachweise);
  const f = unterlagen.filter((u) => u.nachweis && ["pflicht", "verein", "nur_wenn"].indexOf(u.art) >= 0 && nachweise[u.id] !== "habe").map((u) => u.id);
  // Das Spielerfoto hat einen eigenen Schritt: fehlt die Angabe, wie es entsteht, fehlt es noch.
  if (p.spielen && !hatText(objekt(p.a.spielerfoto).weg)) f.push("U16");
  return Array.from(new Set(f)).sort();
}

// ---------------------------------------------------------------------------
// Besondere Wahlmöglichkeiten (Seite "besonderes")
// ---------------------------------------------------------------------------

function besonderesOptionen(p) {
  const o = [];
  if (!p.spielen) return o;
  const bc = liste(p.cfg.altersklassen.maedchenImJungenteam && p.cfg.altersklassen.maedchenImJungenteam.einverstaendnisKlassen);
  const jahreBC = [];
  klassenListe(p.konfig).filter((k) => bc.indexOf(k.klasse) >= 0).forEach((k) => { if (k.von) jahreBC.push(k.von); if (k.bis) jahreBC.push(k.bis); });
  const vonBC = jahreBC.length ? Math.min.apply(null, jahreBC) : null;
  const bisBC = jahreBC.length ? Math.max.apply(null, jahreBC) : null;
  // Mädchen in einem Jungenteam der B- oder C-Jugend brauchen das Einverständnis der Eltern (JO § 14 Nr. 6)
  if (p.weiblich && p.minor === true && vonBC !== null && p.jahrgang >= vonBC && p.jahrgang <= bisBC) o.push("maedchenJungenteam");
  // A-Jugend unter 18 bei den Herren: grundsätzlich nur der ältere Jahrgang (JO § 29 Nr. 1; Korrektur K4)
  if (p.minor === true && p.aeltererA !== null && p.jahrgang === p.aeltererA) o.push("herrenAushilfe");
  // Frauen ab 18 bei den Herren (SpO § 109a)
  if (p.weiblich && p.adult === true) o.push("frauHerren");
  // Sonderspielrecht bei Behinderung (JO § 11 Nr. 5): nur mit anzeigen, wenn die Seite ohnehin erscheint
  if (o.length && p.minor === true && ["A", "B", "C", "D", "E"].indexOf(p.klasse) >= 0) o.push("sonderspielrecht");
  return o;
}

// Extra-Export für die Oberfläche: welche Kästchen die Seite "besonderes" zeigt.
export function optionenBesonderes(a, konfig, heute) {
  return besonderesOptionen(leiteAb(a, konfig, heute));
}

// ---------------------------------------------------------------------------
// Schritte des Assistenten
// ---------------------------------------------------------------------------

// Reihenfolge und Bedingungen wie SCHNITTSTELLEN Abschnitt 4. Ein Schritt erscheint erst, wenn seine
// Voraussetzung beantwortet ist. Entscheidungen von AP-1:
//  - "pass" (deutscher Pass, Staatsangehörigkeiten) nur bei Fußball mit Spielen: Nur der HFV-Antrag braucht sie
//    (Datensparsamkeit, DSGVO Art. 5 Abs. 1 lit. c). Karneval und Passive brauchen sie nicht.
//  - "notfall" nur für Minderjährige, die trainieren (nicht für passive Mitglieder).
export function schritte(a, konfig, heute) {
  const p = leiteAb(a, konfig, heute);
  const s = ["start", "wer", "name", "geburt", "abteilung"];
  if (p.fussball) s.push("mannschaft", "spielen");
  if (p.spielen) s.push("spielerpass");
  const av = objekt(p.a.alterVerein);
  if (p.spielen && p.spielerpass === "ja") s.push("alter_verein");
  if (p.spielen && p.spielerpass === "ja" && (av.region === "hessen" || av.region === "bundesland")) s.push("abmeldung");
  if (p.spielen) s.push("pass", "ausland");
  // wohnen: minderjährig, Fußball mit Spielen, und (nicht deutsch oder im Ausland gewohnt).
  // Solange "deutscher Pass" und "im Ausland gewohnt" nicht beantwortet sind, ist der Schritt nicht entscheidbar
  // und erscheint noch nicht.
  if (p.spielen && p.minor === true && (p.nichtdeutsch || p.deutschUnklar || p.auslandGewohnt)) s.push("wohnen");
  if (p.minor === true) s.push("sorge");
  if (besonderesOptionen(p).length) s.push("besonderes");
  if (p.karneval) s.push("karneval");
  s.push("kontakt", "beitrag");
  if (p.minor === true) s.push("leistungen");
  s.push("zahlung", "einwilligungen");
  if (p.minor === true && p.aktiv) s.push("notfall");
  if (p.spielen) s.push("spielerfoto");
  if (brauchtNachweise(p)) s.push("nachweise");
  s.push("unterschriften", "pruefen", "fertig");
  return s;
}

function brauchtNachweise(p) {
  const gruppen = bestimmeBeitrag(p).gruppen;
  const fr = berechneFrist(p);
  return bestimmeUnterlagen(p, gruppen, fr).some((u) => u.nachweis);
}

// ---------------------------------------------------------------------------
// Auswertung
// ---------------------------------------------------------------------------

export function auswerten(a, konfig, heute) {
  const p = leiteAb(a, konfig, heute);
  const beitrag = bestimmeBeitrag(p);
  const frist = berechneFrist(p);
  const faelle = bestimmeFaelle(p);
  const unterlagen = bestimmeUnterlagen(p, beitrag.gruppen, frist);
  const formulare = bestimmeFormulare(unterlagen);
  const e = {
    version: VERSION,
    alter: p.alter,
    minderjaehrig: p.minor,
    jahrgang: p.jahrgang,
    altersklasse: p.klasse,
    mannschaft: bestimmeMannschaft(p),
    faelle: faelle,
    status: p.status,
    international: p.international,
    unterlagen: unterlagen,
    formulare: formulare,
    unterschriften: bestimmeUnterschriften(p, formulare),
    hinweise: [],
    frist: {
      pflichtspieleAb: frist.pflichtspieleAb,
      freundschaftsspieleAb: frist.freundschaftsspieleAb,
      regel: frist.regel,
      unsicher: frist.unsicher,
      key: pruefeSchluessel("frist", frist.key),
      basisRegel: frist.basisRegel,
      abmeldedatum: frist.abmeldedatum,
      basis: frist.basis,
      alternativ: frist.alternativ,
      entschaedigungMoeglich: frist.entschaedigungMoeglich,
      wegfall: frist.wegfall,
      antragBis: frist.antragBis,
      zuSpaet: !!frist.zuSpaet,
      werte: frist.werte,
    },
    weiterleitung: [],
    beitrag: beitrag,
    karneval: bestimmeKarneval(p),
    besonderesOptionen: besonderesOptionen(p),
    fehlend: bestimmeFehlend(p, unterlagen),
  };
  if (e.mannschaft.hinweisKey !== null) pruefeSchluessel("mannschaft", e.mannschaft.hinweisKey);
  pruefeSchluessel("beitrag", e.beitrag.hinweisKey);
  const s = sammleHinweise(p, e);
  e.hinweise = s.hinweise;
  e.weiterleitung = s.weiterleitung;
  return e;
}
