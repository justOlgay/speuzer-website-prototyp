/*
  Seite „Neu im Trainerteam“ – Einstieg (Stand 24.11.2026).

  Eine öffentlich erreichbare Seite, die sich nur mit einem Code öffnet. Neue Trainer, Co-Trainer und Betreuer des FFV Sportfreunde 04
  erledigen darin alles in einem Zug am Handy: Angaben und Passfoto, Verhaltenskodex und Selbstauskunft bestätigen, den Antrag auf
  Gebührenbefreiung für das erweiterte Führungszeugnis ausgefüllt bekommen und am Bildschirm unterschreiben. Am Ende erzeugt die Seite
  Dateien (Paket-PDF, Antrag als eigene PDF, Passfoto als JPG); die Person schickt sie selbst per E-Mail an die Geschäftsstelle. Nichts
  wird übertragen, es gibt kein Backend. Das Führungszeugnis selbst wird nie hochgeladen: Die Person zeigt es persönlich den Einsichtnehmenden.

  Aufbau und Aussehen wie der Anmelde-Assistent (assistent.js; dessen Dateien bleiben unverändert): gleiche Stylesheets (site.css,
  anmeldung.css) und Klassen, dieselben Bausteine (bausteine.js, unterschrift.js, bilder.js, zugang.js, hilfen.js). Eigene Dateien:
    trainer.js            dieser Einstieg: Rahmen, Navigation, Zugang, Zustand, Löschen, Dateien erstellen
    trainer-seiten.js     die 13 Seiten (code, start, person, einsatz, notfall, erfahrung, foto, kodex, selbstauskunft, zeugnis,
                          unterschriften, pruefen, fertig)
    trainer-bausteine.js  Bausteine, die bausteine.js, seiten-unterlagen.js und seiten-ende.js nicht ausgeben
    trainer-regeln.js     Prüfregeln, leere Antworten, Datumshilfen (reine Funktionen, ohne DOM)
    trainer-einsicht.js   Namensteil der Einsichtnehmenden (vom Orchestrator; einsichtNamen, einsichtAnzahl)
    texte/trainer-de.js   alle Texte (nur Deutsch; ohne Browser lesbar, auch für den Bau der Seite)
    trainer-pdf.js        Erzeugung der Dateien (eigenes Paket; lädt mit der Seite, siehe unten)
  Alle Module werden statisch importiert (flaches Packaging), auch trainer-pdf.js. Grund: Safari (WebKit) merkt sich ein gescheitertes
  Laden eines Moduls für die ganze Sitzung (gemessen in Safari 26.5 am 24.11.2026: ein erneutes import() scheitert auch mit neuer Adresse
  am Hauptmodul, solange eine Abhängigkeit einmal gescheitert ist). Ein import() erst beim Erstellen der Dateien, nach etwa zehn Minuten
  Eingabe und mit der schlechtesten Verbindung, hülfe nach einem Ladefehler dort nie mehr; die Person verlöre ihre Angaben, das Foto und
  die Unterschrift, die nur im Speicher liegen. So zeigt sich ein Ladefehler beim Start, wenn noch nichts eingegeben ist („Ladefehler“
  der Seite). Es gibt keine Verweise auf Dateien außerhalb von assets/js/anmeldung/. Stylesheet: assets/css/trainer.css (nur Ergänzungen
  zu anmeldung.css).

  ---------- Aufruf und Seite (für den Bau, T3) ----------
  startTrainer(wurzel, konfig): wurzel ist das Element des Assistenten (wie <div class="anm" id="anmeldung"> auf der Seite des
  Anmelde-Assistenten), konfig das Objekt unten (JSON, vom Bau eingebettet). Die Seite braucht, wie docs/ws/anmeldung.html:
    <link> site.css, anmeldung.css und trainer.css (in dieser Reihenfolge)
    <main id="inhalt"> mit <section class="abschnitt seitenkopf"> (h1 und Lead aus texte/trainer-de.js › seite, ohne Sprachleiste) und
    <section class="abschnitt anm-assistent-abschnitt"> mit dem Element des Assistenten; das <main> bekommt die Klasse anm-kompakt, sobald
    die Fragen beginnen (nicht auf code, start und fertig).
  Titel, Überschrift, Lead, Texte für „lädt“, „ohne JavaScript“ und „Ladefehler“ stehen in texte/trainer-de.js › seite ({mail} ist die
  Adresse der Geschäftsstelle). Das Skript der Seite lädt dieses Modul (type="module") und ruft startTrainer auf; scheitert schon das Laden
  (dieses Moduls oder eines seiner Importe, auch trainer-pdf.js), zeigt es den Text „Ladefehler“ statt eines leeren Bildschirms.

  ---------- Konfiguration (JSON, vom Bau eingebettet; Quelle data/trainer.json) ----------
  A. Diese Felder liest die Seite selbst:
    zugang.parameter        Name des Adressparameters für den Code, Standard "code" (Link: …/trainerteam.html?code=<CODE>)
    zugang.pruefwerte       Liste der SHA-256-Prüfwerte (hex, klein) des normalisierten Codes (zugang.js); mehrere gelten nebeneinander.
                            Anders als beim Anmelde-Assistenten heißt eine leere Liste hier NICHT „keine Abfrage“: Die Seite bleibt zu
                            (kein Code passt), damit eine fehlende Konfiguration sie nicht öffnet.
    verein.mail             Adresse der Geschäftsstelle: Hilfe, „Code anfragen“ (E-Mail mit Betreff), Adresse auf der letzten Seite
                            (anzeigen, kopieren, E-Mail öffnen) und beim Teilen der Dateien. Fehlt sie, entfallen diese Stellen.
    verein.ort              Ort für „Ort und Datum“ auf der Seite „Unterschreiben“; fehlt er, steht nur das Datum
    verein.satzungUrl       optional: Adresse der Satzung (http(s) oder relativ); fehlt sie, steht ein Hinweis statt des Links „Satzung lesen“
    verein.kodexUrl         optional: Adresse des Verhaltenskodex als PDF (Landessportbund Hessen); fehlt sie, entfällt der Link
                            „Vollständig als PDF öffnen“
    einsicht                Liste { name, funktion } der Einsichtnehmenden (Standard: ein Eintrag); nur über trainer-einsicht.js gelesen
    mannschaften            Liste { abteilung: "fussball" | "karneval", name } für die Auswahl „Mannschaft“ (Karneval: „Gruppe“);
                            hat eine Abteilung keinen Eintrag, ist das Feld ein freier Text
    abteilungen             optional: Liste der Abteilungen, die die Seite anbietet ("fussball", "karneval"); fehlt sie, bieten sich beide an;
                            mit nur einer Abteilung entfällt die Frage danach (der Bau trägt sie aus data/trainer.json › mannschaften ein)
    schnupperMonate         Dauer der Schnupperphase in Monaten (ganze Zahl; die Seite nimmt 1 bis 12, sonst 1): Frist „Unterlagen fällig
                            am“ und die Sätze dazu
  B. Diese Felder braucht trainer-pdf.js (die Seite reicht die ganze Konfiguration unverändert durch; Genaueres im Kopf von trainer-pdf.js):
    Pflicht                 verein.name, verein.ort, schnupperMonate (ganze Zahl ab 0), verein.unterzeichner { name, funktion } (nur, wenn
                            ein Antrag entsteht, also bei „Ich muss es noch beantragen“)
    optional                verein.name_register, verein.mail, verein.anschrift { postfach, postfachPlz, postfachOrt, strasse, plz, ort }
                            (Information nach Art. 13 DSGVO), einsicht, zeugnisJahre, quellen { pdfLib, fontkit, schriftModul } (Orte der
                            Werkzeuge im flachen Paket, wie beim Anmelde-Assistenten)
  Nichts davon wird von der Seite verändert. live gilt für diese Seite nicht (es gibt keinen Entwurfsvermerk).

  ---------- Zustand ----------
  { antworten, medien }: antworten hat die Felder von trainer-regeln.js › neueAntworten (vorname, nachname, geburtsdatum (ISO), anschrift
  { strasse, plz, ort }, handy, email, abteilung, mannschaft, rolle, seit (ISO), tage[], notfall { name, beziehung, telefon }, beruf,
  erfahrung, ersteHilfe "ja" | "nein", ersteHilfeAm, ersteHilfeBis, sonstiges, foto (Boolean), kodexGelesen, selbstauskunft,
  zeugnis "beantragen" | "vorhanden", satzung); medien = { foto: Uint8Array | null (JPG, 3:4, höchstens 750 × 1000 Pixel),
  unterschrift: Uint8Array | null (PNG, auf die Striche zugeschnitten) }.
  Wie im Anmelde-Assistenten (übernommen): Alles liegt nur im Arbeitsspeicher; nichts im Speicher des Browsers, keine Cookies, nichts wird
  gesendet (nur das Laden der eigenen Dateien der Seite). Beim Schließen oder Neuladen sind die Angaben weg; der Browser warnt davor, solange
  etwas eingegeben und nichts gespeichert oder geteilt wurde. Der Code steht nicht in den Antworten und geht nie in die Dateien. Nach dem
  richtigen Code setzt die Seite ?code=… in die Adresse (replaceState), damit Neuladen nicht noch einmal fragt.

  ---------- Zugang ----------
  Ohne gültigen Code zeigt die Seite nur den Bildschirm „code“; die Inhalte der übrigen Bildschirme sind dann nicht im Dokument (es gibt
  immer nur den Bildschirm, der gerade gilt). Geprüft wird der SHA-256 des normalisierten Codes (Großbuchstaben, ohne Leerzeichen und
  Bindestriche) gegen die Liste. Ein Link mit ?code=<richtig> überspringt die Code-Seite; mit ?code=<falsch> steht der Code im Feld und die
  Meldung darunter. Es gibt keine Adresse, die einen Bildschirm ohne Code öffnet.

  ---------- Ablauf ----------
  code › start › person › einsatz › notfall › erfahrung › foto › kodex › selbstauskunft › zeugnis › unterschriften › pruefen › fertig.
  Jede Seite ist ein Eintrag im Verlauf des Browsers; „Zurück“ und die Zurück-Taste gehen eine Seite zurück. „Weiter“ prüft die Seite
  (trainer-regeln.js). Auf „pruefen“ führt „Ändern“ zur Seite der Zeile; „Weiter“ geht von dort wieder in der Reihenfolge weiter. „Alles
  stimmt – Dateien erstellen“ prüft vorher alle Seiten (führt bei einer Lücke zur ersten offenen Seite) und ruft trainer-pdf.js auf.
  Die Abschnittszeile: Du · Einsatz · Unterlagen · Führungszeugnis · Unterschrift · Fertig (nicht auf code und start).
  „Alle Angaben löschen“ fragt nach, leert Antworten, Foto, Unterschrift und erzeugte Dateien und führt zur Seite „start“ (der Zugang bleibt).

  ---------- Schnittstelle zu trainer-pdf.js (T2) ----------
    erzeugeDateien({ antworten, medien, konfig, heute })   heute: ISO "JJJJ-MM-TT"
        › { dateien: [{ name, typ, bytes: Uint8Array, beschreibung }], warnungen: [] }
        Die Seite zeigt Name und beschreibung genau so, wie sie zurückkommen (keine feste Beschreibung in der Seite), teilt und lädt die
        Dateien. Ist warnungen nicht leer (ein Zeichen fehlt in der PDF-Schrift, Text über dem Rand), steht auf dem Bildschirm ein
        kurzer Hinweis „Bitte prüfe die Vorschau …“; der Rest bleibt benutzbar. Die Texte der Warnungen zeigt die Seite nicht.
    vorschauAntrag({ antworten, konfig, heute })            › Uint8Array (PDF des Antrags), für „Antrag ansehen“
  antworten ist eine Kopie, medien enthält die Bytes selbst. Scheitert ein Aufruf, liest die Seite fehler.art und zeigt zu jeder Art eine
  verständliche Meldung mit „Noch einmal versuchen“ und „Hilfe“ (nie einen leeren Bildschirm): TrainerPdfFehler: angaben, konfig,
  unterschrift-fehlt, unterschrift-format, foto-fehlt, foto-format; LadeFehler (pdf-lader.js): bibliothek, pdf; jede andere Art zeigt die
  allgemeine Meldung. „Noch einmal versuchen“ ruft erzeugeDateien erneut auf: pdf-lib, fontkit und die Schrift werden dabei mit neuen
  Anfragen geholt (<script> und fetch; ein import() nur als Rückfall, siehe trainer-pdf-lader.js).
*/

import { h, zeigeFehlerAnFeldern, fokusZiel, feldBezeichnung, anhaengen, hinweisKasten } from "./bausteine.js";
import { kopiere, sauber, heuteIso, ersetzePlatzhalter } from "./hilfen.js";
import { zugangAusKonfig, pruefeCode } from "./zugang.js";
import { neuerSpeicher } from "./unterschrift.js";
import T from "./texte/trainer-de.js";
import { SEITEN, REIHENFOLGE, ABSCHNITTE, ABSCHNITT_VON } from "./trainer-seiten.js";
import { neueAntworten, ersteOffeneSeite } from "./trainer-regeln.js";
// Die Erzeugung der Dateien lädt mit der Seite (statisch, nicht erst beim Erstellen): Grund siehe Kopfkommentar und „Dateien erstellen“.
import * as pdfModul from "./trainer-pdf.js";

// Kennung dieses Aufrufs. Einträge im Verlauf des Browsers aus einem früheren Aufruf gehören nicht mehr zu diesen Antworten.
const SITZUNG = Math.random().toString(36).slice(2);

// Art des Fehlers beim Erstellen der Dateien (LadeFehler aus pdf-lader.js und TrainerPdfFehler aus trainer-pdf.js)
// › Schlüssel in fertig.fehler (texte/trainer-de.js); alles Übrige ist „pdf“.
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

// Datei-Objekte und Beschreibung der erzeugten Dateien (trainer-pdf.js › erzeugeDateien); eine unbrauchbare Antwort ist ein Fehler.
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
  // Adresse der Geschäftsstelle (nur eine gültige Adresse zählt); ohne sie steht in den Sätzen „die Geschäftsstelle“.
  const mail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sauber(verein.mail)) ? sauber(verein.mail) : "";
  const mailText = mail || "die Geschäftsstelle";
  if (!konfig || typeof konfig !== "object") {
    console.error("Trainerseite: Konfiguration fehlt oder ist nicht lesbar");
    zeigeLadefehler(wurzel, mailText);
    return;
  }

  // ---------- Zustand und Kontext ----------
  // Der Kontext k geht an die Bausteine (bausteine.js) und die Seiten (trainer-seiten.js).
  const k = {
    konfig,
    mail,
    heute: heuteIso(),
    a: neueAntworten(),
    medien: { foto: null, unterschrift: null },
    // Striche der Unterschrift (der Speicher übersteht ein neues Zeichnen der Seite) und Rohtext der Datumsfelder
    striche: neuerSpeicher(),
    roh: {},
    wartend: new Set(),
    // Zugang mit Code (zugang.js). frei: die Seiten dürfen öffnen. eingabe: der Text im Feld. geprueft und gueltig: das Ergebnis der
    // letzten Prüfung für den normalisierten Text. Ohne Prüfwerte in der Konfiguration bleibt die Seite zu.
    zugang: { ...zugangAusKonfig(konfig), frei: false, eingabe: "", geprueft: "", gueltig: false },
    // Dateien (trainer-pdf.js): zustand "leer" | "arbeit" | "fertig" | "fehler"; veraltet: Nach der Erstellung hat sich etwas geändert
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

  // ---------- Texte ----------
  // Text zu einem Pfad ("start.titel"); {mail} ist immer eingesetzt. Fehlt der Text, steht der Pfad da und die Konsole meldet es.
  // Die eigenen Dateien rufen k.text und k.textListe auf, nicht k.t: tools/anmeldung-test/sprache-check.mjs prüft jeden Aufruf t("…") in
  // assets/js/anmeldung/*.js gegen das Wörterbuch des Anmelde-Assistenten. k.t gibt es trotzdem: bausteine.js ruft es auf.
  k.text = (pfad, werte) => {
    const w = teilPfad(T, pfad);
    if (w === undefined) {
      console.warn("Trainerseite: Text fehlt: " + pfad);
      return pfad;
    }
    return typeof w === "string" ? ersetzePlatzhalter(w, { mail: mailText, ...werte }) : w;
  };
  k.t = k.text;
  // Liste von Texten zu einem Pfad ("start.ablauf")
  k.textListe = (pfad, werte) => {
    const w = teilPfad(T, pfad);
    return Array.isArray(w) ? w.map((x) => (typeof x === "string" ? ersetzePlatzhalter(x, { mail: mailText, ...werte }) : x)) : [];
  };

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
  const nachRenderSofort = () => {
    const liste = k.nachListe;
    k.nachListe = [];
    liste.forEach((f) => f());
  };
  // Adresse für die Vorschau eines Bildes; ein neues Bild unter demselben Schlüssel gibt die alte Adresse frei.
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

  // ---------- Erste Seite ----------
  // Ein Link mit ?code=… wird schon hier geprüft, vor dem Aufbau der Seite: Bei einem gültigen Code erscheint die Code-Seite nie. Bei einem
  // ungültigen stehen der Code im Feld und die Meldung darunter (codeFehler).
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

  // ---------- Rahmen: Kopf, Leiste, Abschnitte, Fuß, Dialog ----------
  const meldung = h("p", { klasse: "anm-meldung", role: "status" });
  const zurueckKnopf = h("button", { type: "button", klasse: "anm-zurueck", "data-aktion": "zurueck", "aria-label": k.text("rahmen.zurueckLang") }, k.text("rahmen.zurueck"));
  const hilfeKnopf = h("button", { type: "button", klasse: "anm-hilfe", "data-aktion": "hilfe", "aria-expanded": "false" }, k.text("rahmen.hilfe"));
  const kopf = h("header", { klasse: "anm-kopf" }, zurueckKnopf, h("div", { klasse: "anm-kopf__werkzeuge" }, hilfeKnopf));
  const abschnittListe = h("ol", { klasse: "anm-abschnitte__liste" }, ABSCHNITTE.map((id) => h("li", { klasse: "anm-abschnitte__punkt", "data-abschnitt": id }, k.text("rahmen.abschnitte." + id))));
  const abschnitte = h("nav", { klasse: "anm-abschnitte", "aria-labelledby": "anm-abschnitte-titel" }, h("p", { klasse: "sr-only", id: "anm-abschnitte-titel" }, k.text("rahmen.abschnittTitel")), abschnittListe);
  // „Hilfe“: ein Hinweiskasten unter der Abschnittszeile mit der Adresse der Geschäftsstelle (als Link, wenn es eine gibt)
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
  // Der Seitenkopf über dem Assistenten (h1, Lead) wird kompakt, sobald die Fragen beginnen: Die Klasse sitzt am umgebenden <main>.
  const seitenwurzel = wurzel.closest("main") || document.body;

  k.melde = (text) => {
    meldung.textContent = text || "";
  };

  function aktualisiereKopf() {
    const seite = SEITEN[k.schritt];
    // Voller Seitenkopf (Überschrift und Lead) auf Code, Start und Fertig; sonst kompakt, damit die Frage im ersten Bildschirm steht.
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

  // ---------- Fehler (wie im Anmelde-Assistenten: Liste oben und Meldung am Feld) ----------
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
        // In der Liste steht der Name des Feldes vor der Meldung („Vorname: …“); am Feld selbst steht die Meldung allein.
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

  // Entfernt die Fehlermeldungen der Seite (am Feld und in der Liste), zum Beispiel wenn jemand im Feld weitertippt.
  k.fehlerLoeschen = () => {
    zeigeFehler([], false);
    k.fehlerAktiv = false;
  };

  // Nach jeder Änderung einer Eingabe: Bedingungen neu anwenden, erzeugte Dateien als veraltet merken, Fehler nach dem Stand neu prüfen.
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

  // Der Code stimmt: Die Seiten dürfen öffnen, und die Adresse trägt den Code (andere Angaben der Adresse bleiben), damit Neuladen nicht
  // noch einmal fragt. Der Eintrag im Verlauf bleibt derselbe (replaceState).
  k.zugangFreigeben = (code) => {
    k.zugang.frei = true;
    try {
      const u = new URL(location.href);
      u.searchParams.set(k.zugang.parameter, code);
      history.replaceState(history.state, "", u.toString());
    } catch (fehler) {
      /* ohne Adresse: Neuladen fragt dann noch einmal nach dem Code */
    }
  };

  // ---------- Seiten zeigen ----------
  function zeigeSeite(id, optionen) {
    const o = optionen || {};
    // Ohne Zugang gibt es nur die Code-Seite, auch wenn ein Aufruf (Verlauf des Browsers, „Ändern“) etwas anderes verlangt.
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
      // Bei jedem Seitenwechsel rückt die Leiste mit „Zurück“ und „Hilfe“ oben ins Bild (wie im Anmelde-Assistenten).
      kopf.scrollIntoView({ block: "start" });
    }
  }

  // Verlauf des Browsers: jede Seite ein Eintrag (wie im Anmelde-Assistenten). Die Adresse bleibt, wie sie ist (mit ?code=…); kein
  // Bildschirm hat eine eigene Adresse, also gibt es keinen Weg an der Code-Abfrage vorbei.
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

  // Sicherung: Auf „fertig“ kommt nur, wer alle Angaben gemacht hat (zum Beispiel nicht über die Vorwärts-Taste des Browsers nach einer
  // Änderung zurück). Gibt es eine Lücke, öffnet die erste offene Seite mit ihren Meldungen. Rückgabe: ob umgeleitet wurde.
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
    // „fertig“ nur bei vollständigen Angaben
    if (s.schritt === "fertig" && leiteBeiLueckeUm(true)) return;
    zeigeSeite(s.schritt, {});
  });

  // ---------- Hilfe ----------
  k.zeigeHilfe = () => {
    const an = hilfeKasten.hidden;
    hilfeKasten.hidden = !an;
    hilfeKnopf.setAttribute("aria-expanded", String(an));
    if (an) hilfeKasten.scrollIntoView({ block: "nearest" });
  };
  hilfeKnopf.addEventListener("click", () => k.zeigeHilfe());

  // ---------- Alle Angaben löschen ----------
  function oeffne(dialog) {
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function schliesse(dialog) {
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }

  // Setzt alle Antworten, das Foto, die Unterschrift und die erzeugten Dateien zurück (der Zugang bleibt).
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

  // ---------- Dateien erstellen ----------
  // trainer-pdf.js ist ein statischer Import (Kopf der Datei) und lädt mit der Seite; hier gibt es kein Laden mehr, das scheitern könnte.
  // Grund: Safari (WebKit) merkt sich ein gescheitertes Laden eines Moduls für die ganze Sitzung (Messung im Kopfkommentar). Ein
  // import() erst hier, nach etwa zehn Minuten Eingabe, hätte nach einem Ladefehler nie mehr geklappt; die Person hätte neu laden müssen
  // und alle Angaben verloren. Scheitert das Laden jetzt, zeigt sich das beim Start (Text „Ladefehler“ der Seite), wenn noch nichts
  // eingegeben ist. k.pdfModul bleibt als dünne Hülle, damit Aufrufer und Testattrappen unverändert funktionieren.
  k.pdfModul = async () => pdfModul;

  // Der Antrag auf Gebührenbefreiung als PDF (ohne Unterschrift des Vereins) für „Antrag ansehen“ auf der Seite „zeugnis“.
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
        // Die Angaben haben sich inzwischen geändert (oder wurden gelöscht): Das Ergebnis passt nicht mehr.
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

  // erzwingen: noch einmal versuchen (nach einem Fehler oder mit „Noch einmal versuchen“)
  k.starteErstellen = (erzwingen) => {
    if (k.erzeugung.zustand === "arbeit") return;
    if (erzwingen) k.erzeugung.zustand = "leer";
    const beendet = erstelleDateien();
    if (erzwingen && k.schritt === "fertig") zeigeSeite("fertig", { fokus: false });
    beendet.then(() => {
      if (k.schritt === "fertig") zeigeSeite("fertig", { fokus: false });
    });
  };

  // ---------- Verlassen ----------
  const hatInhalt = () => JSON.stringify(k.a) !== JSON.stringify(neueAntworten()) || !!k.medien.foto || !!k.medien.unterschrift;
  window.addEventListener("beforeunload", (e) => {
    if (!(k.dirty && hatInhalt()) || k.gesichert) return;
    e.preventDefault();
    e.returnValue = "";
  });

  // ---------- Los ----------
  // Nach „Zurück“ holt der Browser sonst die alte Bildlaufposition; die Seite scrollt selbst (siehe zeigeSeite).
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  history.replaceState({ anm: SITZUNG, tiefe: 0, schritt: ersteSeite }, "");
  zeigeSeite(ersteSeite, { fokus: false });
  if (codeFehler) zeigeFehler(SEITEN.code.pruefe(k), false);
  wurzel.setAttribute("data-bereit", "");
}
