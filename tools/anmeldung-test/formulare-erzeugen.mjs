#!/usr/bin/env node
// Erzeugt data/anmeldung-formulare.json (AP-2, Stand 2026-09-29) aus den Formular-PDFs in assets/pdf/anmeldung/
// und den kuratierten Zuordnungen in diesem Skript (Bedeutung, füllt, quelle, Beschriftungen, Unterschriftsstellen).
//
//   node tools/anmeldung-test/formulare-erzeugen.mjs --ausgabe data/anmeldung-formulare.json
//   node tools/anmeldung-test/formulare-erzeugen.mjs                        (JSON nach stdout, Meldungen nach stderr)
//   node tools/anmeldung-test/formulare-erzeugen.mjs --bereinigen <original.pdf> <kopie.pdf> [--ohne-objektstroeme]
//   Zusatz: --pdf-ordner <ordner>   PDFs woanders lesen (Standard: assets/pdf/anmeldung)
//
// Wann man es braucht: der HFV (oder der Verein) veröffentlicht eine neue Fassung eines Vordrucks. Dann:
//   1. Neues Original laden (Adressen: META.*.quelle_url) und die Datei-Metadaten entfernen:
//        node tools/anmeldung-test/formulare-erzeugen.mjs --bereinigen <original.pdf> assets/pdf/anmeldung/<name>.pdf
//      Das Skript gibt SHA-256 und Größe des Originals aus (in META.*.quelle_sha256 und quelle_bytes eintragen; das
//      Original selbst kommt nicht ins Repo) und legt die Kopie ab. Entfernt werden die Info-Felder Author, Creator,
//      Producer, Title, Subject, Keywords, der XMP-Metadatenstrom und nicht mehr erreichbare Objekte älterer
//      Fassungen; Seiteninhalt, Formularfelder und Trailer-ID bleiben unverändert (Rendering pixelgleich).
//   2. META anpassen (quelle_stand, quelle_sha256, quelle_bytes) und die JSON neu erzeugen (Aufruf mit --ausgabe, siehe oben). Das Skript
//      bricht ab, wenn die Felder der PDF nicht zu den Tabellen ANTRAG, VOLLMACHT, ABMELDUNG, EINVERSTAENDNIS passen
//      (Feld neu oder weg), eine Beschriftung nicht mehr in der erwarteten Lage steht oder die Kopie noch
//      Datei-Metadaten enthält. Dann die Tabellen und STELLEN nachziehen.
//   3. node tools/anmeldung-test/formulare-pruefen.mjs (prüft die JSON gegen die PDFs, Linien, Belege und
//      läuft einen Beispiellauf für den Abmelde-Vordruck).
// Alles Geometrische (Feldtyp, Seite, Rechteck, maximale Länge, Textkoordinaten der Beschriftungen) liest das Skript aus
// den PDFs (pdf-lib, pdftotext -bbox-layout aus poppler); hier stehen nur Bedeutungen und Zuordnungen.
//
// F(bedeutung, fuellt, quelle, belege, extra)
//   belege: [[lage, "gedruckter Text"], …]   lage: rechts | links | zeile | oben | unten | bereich

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(path.join(REPO, "package.json"));
const { PDFDocument, PDFName, PDFDict, PDFArray, PDFStream, PDFRef } = require("pdf-lib");

const F = (bedeutung, fuellt, quelle, belege, extra = {}) => ({ bedeutung, fuellt, quelle, belege, ...extra });

const STATUS_WECHSEL = "e.status in [wechsel_hfv,wechsel_lv,wechsel_ausland]";

// ---------------------------------------------------------------------------------------------
// HFV – Antrag auf Spielerlaubnis / Vereinswechsel (3 Seiten, 38 Felder), in Lesereihenfolge
// ---------------------------------------------------------------------------------------------
const ANTRAG = {
  AntragVerein: F(
    "„Antrag stellender Verein:“ – Name des Vereins, der den Antrag stellt (Kopfbereich, breites Feld)",
    "assistent", "konfig.verein.name_register", [["links", "Antrag stellender Verein:"]],
    { hinweis: "Vereinsname wie im DFBnet geführt; Schreibweise (eingetragener Name oder Kurzform konfig.verein.name) vor dem Livegang mit der Geschäftsstelle abstimmen." },
  ),
  AntragNr: F(
    "„Vereinsnummer“ (Spaltenüberschrift rechts) – Nummer des antragstellenden Vereins, Zeile „Antrag stellender Verein:“",
    "assistent", "konfig.verein.vereinsnummer", [["oben", "Vereinsnummer"], ["zeile", "Antrag stellender Verein:"]],
  ),
  StammVerein: F(
    "„Stammverein (bei JFV):“ – nur für Spieler*innen eines Jugendfördervereins (JFV); der FFV ist kein JFV, daher leer",
    "verein", null, [["links", "Stammverein (bei JFV):"]],
  ),
  StammNr: F(
    "„Vereinsnummer“ (Spaltenüberschrift rechts) des Stammvereins, Zeile „Stammverein (bei JFV):“ – nur bei JFV, sonst leer",
    "verein", null, [["oben", "Vereinsnummer"], ["zeile", "Stammverein (bei JFV):"]],
  ),
  Familienname: F("„Familienname:“", "assistent", "a.nachname", [["links", "Familienname:"]]),
  Vorname: F("„Vorname:“", "assistent", "a.vorname", [["zeile", "Vorname:"]]),
  Strasse: F("„Straße, Hausnr.:“ – Straße und Hausnummer der Wohnanschrift", "assistent", "a.anschrift.strasse", [["links", "Straße, Hausnr.:"]]),
  PLZ: F("„PLZ, Ort:“ – linkes, kurzes Feld: Postleitzahl", "assistent", "a.anschrift.plz", [["zeile", "PLZ, Ort:"]]),
  Ort: F("„PLZ, Ort:“ – rechtes, langes Feld: Wohnort", "assistent", "a.anschrift.ort", [["zeile", "PLZ, Ort:"]]),
  Geburtsdatum: F("„Geburtsdatum:“ – Schreibweise TT.MM.JJJJ (höchstens 10 Zeichen)", "assistent", "a.geburtsdatum|TT.MM.JJJJ", [["links", "Geburtsdatum:"]]),
  "Staatsangeh#C3#B6rigkeit": F(
    "„Staatsangehörigkeit:“ (der Feldname im PDF lautet wörtlich „Staatsangeh#C3#B6rigkeit“ – Kodierungsfehler des Erstellers, nicht ändern)",
    "assistent", "a.staaten|STAATEN", [["links", "Staatsangehörigkeit:"]],
    { hinweis: "Bezeichnungen der Staatsangehörigkeiten auf Deutsch (Länderkürzel aus a.staaten umsetzen), mehrere durch Komma getrennt; höchstens 30 Zeichen, sonst kürzen." },
  ),
  K1: F("„Geschlecht:“ – Kästchen vor „männlich“", "assistent", "a.geschlecht=m", [["rechts", "männlich"], ["zeile", "Geschlecht:"]]),
  K2: F("„Geschlecht:“ – Kästchen vor „weiblich“", "assistent", "a.geschlecht=w", [["rechts", "weiblich"], ["zeile", "Geschlecht:"]]),
  K3: F(
    "„Geschlecht:“ – Kästchen vor „divers“", "assistent", "a.geschlecht=d", [["rechts", "divers"], ["zeile", "Geschlecht:"]],
    { hinweis: "Bei a.geschlecht=ohne_angabe bleiben K1 bis K3 leer (das Formular kennt „ohne Angabe“ nicht); dann gelten K7 bis K9, der Verein klärt das mit der Vertrauensperson des HFV (SpO § 91 Nr. 9)." },
  ),
  Antragsdatum: F(
    "„Tag der Antragstellung:“ – Tag, an dem der Verein den Antrag stellt (frühester Tag der Spielberechtigung ist der Tag des Antragseingangs beim Verband, SpO § 91 Nr. 1)",
    "verein", null, [["links", "Tag der Antragstellung:"]],
    { hinweis: "Trägt der Verein am Tag der Antragstellung (Eingabe im DFBnet) ein. Bewusst nicht vorausgefüllt: zwischen PDF-Erstellung, Unterschrift und Antrag können Tage liegen." },
  ),
  K4: F(
    "Kästchen vor „Erstmalige Spielerlaubnis“ („O.g. Spieler/in bestätigt, dass noch keine Spielberechtigung für einen anderen Verein besteht oder bestanden hat, auch nicht im Ausland.“)",
    "assistent", "e.status=neu", [["rechts", "Erstmalige Spielerlaubnis"]],
    { hinweis: "Bei e.status=ausland_unbekannt bleiben K4 und K5 leer: die Erklärung „auch nicht im Ausland“ wäre nicht sicher; der Verein klärt das. Unterlagen nennt Seite 2 des Vordrucks." },
  ),
  K5: F(
    "Kästchen vor „Vereinswechsel (Spieler*innen, die zuletzt einem Verein im Ausland angehört haben, bitte Seite 2 beachten)“",
    "assistent", STATUS_WECHSEL, [["rechts", "Vereinswechsel (Spieler*innen, die zuletzt einem Verein im Ausland angehört haben, bitte Seite 2 beachten)"]],
  ),
  "Pass-Wechsel": F(
    "„Pass-Nummer (soweit bekannt):“ – Spielerpass-Nummer beim bisherigen Verein (Block „Vereinswechsel“)",
    "familie_hand", null, [["links", "Pass-Nummer (soweit bekannt):"]],
    { hinweis: "Nur wenn bekannt; die Antworten enthalten keine Pass-Nummer. Höchstens 9 Zeichen." },
  ),
  letzterVerein: F(
    "„Letzte Vereinszugehörigkeit:“ – Name des bisherigen Vereins (Block „Vereinswechsel“)",
    "assistent", "a.alterVerein.name", [["links", "Letzte Vereinszugehörigkeit:"]], { bedingung: STATUS_WECHSEL },
  ),
  letzterVerband: F(
    "„Bisheriger Landesverband / Nationalverband:“ (Block „Vereinswechsel“)",
    "assistent", "a.alterVerein.verband", [["links", "Bisheriger Landesverband / Nationalverband:"]],
    { bedingung: STATUS_WECHSEL, hinweis: "Bei a.alterVerein.region=hessen und leerem Verband „Hessischer Fußball-Verband“ eintragen; bei region=ausland der Nationalverband bzw. das Land (a.alterVerein.land)." },
  ),
  Abmeldung: F(
    "„Tag der Abmeldung“ – Tag der Abmeldung beim bisherigen Verein (Block „Vereinswechsel“)",
    "assistent", "a.abmeldung.datum|TT.MM.JJJJ", [["links", "Tag der Abmeldung"]],
    { bedingung: "a.abmeldung.status=einschreiben", hinweis: "Tag der Abmeldung ist das Datum des Poststempels des Einschreibens (SpO § 93 Nr. 2). Bei Vollmacht oder wenn noch nicht abgemeldet leer: der Verein trägt den Tag der Eingabe im DFBnet ein (SpO § 92 Nr. 2)." },
  ),
  LetztesSpiel: F(
    "„Tag des letzten Spiels:“ – letztes Spiel im bisherigen Verein; daneben gedruckt: „Der/die Spieler*in erklärt nach der Abmeldung nicht mehr gespielt zu haben“",
    "assistent", "a.letztesSpiel|TT.MM.JJJJ", [["links", "Tag des letzten Spiels:"]], { bedingung: STATUS_WECHSEL },
  ),
  SperrVon: F(
    "„von:“ – Beginn einer laufenden Sperre („Läuft gegen den/die Spieler*in eine Sperre ? Wenn ja bitte angeben“)",
    "familie_hand", null, [["links", "von:"], ["bereich", "Läuft gegen den/die Spieler*in eine Sperre ? Wenn ja bitte angeben"]],
    { hinweis: "Nur bei a.sperre=ja; die Antworten enthalten nur das Ende der Sperre (SperreBis)." },
  ),
  SperreBis: F(
    "„bis:“ – Ende einer laufenden Sperre", "assistent", "a.sperreBis|TT.MM.JJJJ",
    [["links", "bis:"], ["bereich", "Läuft gegen den/die Spieler*in eine Sperre ? Wenn ja bitte angeben"]], { bedingung: "a.sperre=ja" },
  ),
  "Sperre-Spiel": F(
    "„oder Pflichtspiele:“ – Sperre nach Anzahl Pflichtspiele (höchstens 2 Ziffern)", "familie_hand", null,
    [["links", "oder Pflichtspiele:"], ["bereich", "Läuft gegen den/die Spieler*in eine Sperre ? Wenn ja bitte angeben"]],
    { hinweis: "Nur bei a.sperre=ja und Sperre nach Spielen." },
  ),
  K6: F(
    "Kästchen vor „Zusätzliche Spielberechtigung für A-Junioren und B-Juniorinnen in Seniorenmannschaften“",
    "assistent", "a.besonderes.herrenAushilfe", [["rechts", "Zusätzliche Spielberechtigung für A-Junioren und B-Juniorinnen in Seniorenmannschaften"]],
    { hinweis: "Nur zusammen mit dem Vordruck „Einverständnis gesetzlicher Vertreter“ (einverstaendnis_senioren) und dem Attest (Seite 2 des Antrags)." },
  ),
  "Pass-Zusatz": F(
    "„Pass-Nummer :“ (Block „Zusätzliche Spielberechtigung“) – „(Bitte aus Spielberechtigungsliste heraussuchen)“",
    "verein", null, [["links", "Pass-Nummer :"], ["rechts", "(Bitte aus Spielberechtigungsliste heraussuchen)"]],
    { hinweis: "Der Verein sucht die Nummer in seiner Spielberechtigungsliste heraus (Hinweis im Formular)." },
  ),
  K7: F(
    "Kästchen vor „Spielrecht für trans/intergeschlechtliche Menschen und divers für“ (Spielrecht nach SpO § 91 Nr. 8 und 9)",
    "assistent", "a.spielrechtFuer in [m,w]", [["rechts", "Spielrecht für trans/intergeschlechtliche Menschen und divers für"]],
    { hinweis: "Der Antrag wird gemeinsam mit der Vertrauensperson des HFV gestellt (SpO § 91 Nr. 9 und 10); bei Minderjährigen mit Zustimmung der Eltern (JO § 37 Nr. 3)." },
  ),
  K8: F(
    "„…und divers für“ – Kästchen vor „männlich“ (Spielrecht für eine Herren-Mannschaft, SpO § 91 Nr. 9.1)",
    "assistent", "a.spielrechtFuer=m", [["rechts", "männlich"], ["zeile", "Spielrecht für trans/intergeschlechtliche Menschen und divers für"]],
  ),
  K9: F(
    "„…und divers für“ – Kästchen vor „weiblich“ (Spielrecht für eine Frauen-Mannschaft, SpO § 91 Nr. 9.1)",
    "assistent", "a.spielrechtFuer=w", [["rechts", "weiblich"], ["zeile", "Spielrecht für trans/intergeschlechtliche Menschen und divers für"]],
  ),
  Text1: F(
    "„Bearbeitungsvermerke der Geschäftsstelle“ – Zeile „Abmeldung“ (Vermerk des HFV, nicht auszufüllen)",
    "verein", null, [["links", "Abmeldung"], ["bereich", "Bearbeitungsvermerke der Geschäftsstelle"]],
  ),
  Text3: F(
    "„Bearbeitungsvermerke der Geschäftsstelle“ – Zeile „Letztes Spiel:“ (Vermerk des HFV, nicht auszufüllen)",
    "verein", null, [["links", "Letztes Spiel:"], ["bereich", "Bearbeitungsvermerke der Geschäftsstelle"]],
  ),
  Text4: F(
    "„Bearbeitungsvermerke der Geschäftsstelle“ – „Freigabe:“ (Vermerk des HFV, nicht auszufüllen)",
    "verein", null, [["links", "Freigabe:"], ["bereich", "Bearbeitungsvermerke der Geschäftsstelle"]],
  ),
  Text5: F(
    "„Bearbeitungsvermerke der Geschäftsstelle“ – „Gemäß §“ (dahinter gedruckt „JO / SpO“; Vermerk des HFV, nicht auszufüllen)",
    "verein", null, [["links", "Gemäß §"], ["bereich", "Bearbeitungsvermerke der Geschäftsstelle"]],
  ),
  // Seite 3
  AntragVerein_2: F(
    "„Antragstellender Verein“ – Beschriftung unter der Linie (Seite 3, unten links), zweite Nennung des Vereins zu den Einwilligungen",
    "assistent", "konfig.verein.name_register", [["unten", "Antragstellender Verein"]],
  ),
  Spielername: F(
    "„Name, Vorname Spieler“ – Beschriftung unter der Linie (Seite 3, unten rechts), Name zu den Einwilligungen a) und b)",
    "assistent", `a.nachname + ", " + a.vorname`, [["unten", "Name, Vorname Spieler"]],
  ),
  Text2: F(
    "Datumsfeld der Einwilligung a) (Spieler*innendaten im Internet, für unter 16-Jährige) – links auf der Zeile „Datum, Unterschrift des/der gesetzlichen Vertreter/s“",
    "familie_hand", null,
    [["unten", "Datum, Unterschrift des/der gesetzlichen Vertreter/s"], ["bereich", "a) Spieler*innendaten im Internet - z.B. auf FUSSBALL.DE für unter 16-Jährige (empfohlen)"]],
    { hinweis: "Datum und Unterschrift nur, wenn eingewilligt wird (a.einwilligungen.hfvName); kein vorausgefülltes Datum." },
  ),
  Text6: F(
    "Datumsfeld der Einwilligung b) (Spieler*innenfotos im Internet) – links auf der Zeile „Datum, Unterschrift der Spielerin/des Spielers (bei Minderjährigen des/der gesetzlichen Vertreter/s)“",
    "familie_hand", null,
    [["unten", "Datum, Unterschrift der Spielerin/des Spielers (bei Minderjährigen des/der gesetzlichen Vertreter/s)"], ["bereich", "b) Spieler*innenfotos im Internet - z.B. auf FUSSBALL.DE (empfohlen)"]],
    { hinweis: "Datum und Unterschrift nur, wenn eingewilligt wird (a.einwilligungen.hfvFoto); kein vorausgefülltes Datum." },
  ),
};

// ---------------------------------------------------------------------------------------------
// HFV – Vollmacht zur stellvertretenden Abmeldung (1 Seite, 6 Felder)
// ---------------------------------------------------------------------------------------------
const VOLLMACHT = {
  "Name Vorname SpielerinSpieler": F(
    "„Name, Vorname Spielerin/Spieler“ (nach „Hiermit bevollmächtige ich,“)", "assistent", `a.nachname + ", " + a.vorname`,
    [["unten", "Name, Vorname Spielerin/Spieler"]],
  ),
  GebDatum: F("„Geb.-Datum“ (rechts neben dem Namen)", "assistent", "a.geburtsdatum|TT.MM.JJJJ", [["unten", "Geb.-Datum"]]),
  "Name antragstellender VereinVertreten durch Person": F(
    "„Name antragstellender Verein/Vertreten durch Person“ (nach „den nachfolgend genannten Verein“)",
    "assistent", "konfig.verein.name_register", [["unten", "Name antragstellender Verein/Vertreten durch Person"]],
    { hinweis: "Der Zusatz „Vertreten durch Person“ (handelnde Person des Vereins) wird nicht vorausgefüllt; der Verein ergänzt ihn bei Bedarf von Hand." },
  ),
  "Name Verein": F(
    "„Name Verein“ (nach „mich bei meinem aktuellen Verein“) – bisheriger Verein, bei dem abgemeldet wird",
    "assistent", "a.alterVerein.name", [["unten", "Name Verein"], ["zeile", "mich bei meinem aktuellen Verein"]],
  ),
  "Ort Datum": F(
    "„Ort, Datum“ (unter der Erklärung „als Spieler abzumelden.“)", "familie_hand", null, [["unten", "Ort, Datum"]],
    { hinweis: "Von Hand; kein vorausgefülltes Datum (Unterschrift mit Stift auf Papier)." },
  ),
  "Unterschrift SpielerinSpielerbei Minderjährigen Unterschrift der gesetzlichen Vertreter": F(
    "„Unterschrift Spielerin/Spieler/bei Minderjährigen Unterschrift der gesetzlichen Vertreter“ – Unterschriftsfläche über der Linie",
    "familie_hand", null, [["unten", "Unterschrift Spielerin/Spieler/bei Minderjährigen Unterschrift der gesetzlichen Vertreter"]],
    { hinweis: "Textfeld als Unterschriftsfläche, leer lassen (siehe unterschriften, Stelle „unterschrift“)." },
  ),
};

// ---------------------------------------------------------------------------------------------
// HFV – Formular zur Abmeldung per Einschreiben (1 Seite, 14 Felder; Feldnamen teils irreführend)
// Der Vordruck dient auch dann zur Kündigung der Mitgliedschaft, wenn das Spielrecht per Vollmacht abgemeldet wird
// (dann nur das Kästchen „Mitgliedschaft“). Fehlt ein Wert, bleibt das Feld für die Hand leer (leerWennFehlt).
// ---------------------------------------------------------------------------------------------
const ABMELDUNG = {
  1: F("Abschnitt „Spieler/in“ – „Name:“ (Familienname)", "assistent", "a.nachname", [["zeile", "Name:"], ["bereich", "Spieler/in"]]),
  2: F("Abschnitt „Spieler/in“ – „Vorname:“", "assistent", "a.vorname", [["zeile", "Vorname:"], ["bereich", "Spieler/in"]]),
  3: F("Abschnitt „Spieler/in“ – „Geb.-Datum:“", "assistent", "a.geburtsdatum|TT.MM.JJJJ", [["zeile", "Geb.-Datum:"], ["bereich", "Spieler/in"]]),
  "Straße und Hausnummer": F(
    "Abschnitt „Spieler/in“ – „Straße und Hausnummer:“ (Wohnanschrift der Spielerin/des Spielers)", "assistent", "a.anschrift.strasse",
    [["zeile", "Straße und Hausnummer:"], ["bereich", "Spieler/in"]],
  ),
  "Postleitzahl und Wohnort": F(
    "Abschnitt „Spieler/in“ – „Postleitzahl und Wohnort:“", "assistent", `a.anschrift.plz + " " + a.anschrift.ort`,
    [["zeile", "Postleitzahl und Wohnort:"], ["bereich", "Spieler/in"]],
  ),
  undefined: F(
    "Abschnitt „Vereinsdaten“ – „Vereinsname:“ (bisheriger Verein, an den das Einschreiben geht); der Feldname im PDF lautet wörtlich „undefined“",
    "assistent", "a.alterVerein.name", [["zeile", "Vereinsname:"], ["bereich", "Vereinsdaten"]],
    { leerWennFehlt: true },
  ),
  "Empfänger Einschreiben": F(
    "Abschnitt „Vereinsdaten“ – „Empfänger Einschreiben:“ (Person oder Stelle im bisherigen Verein)", "assistent", "a.alterVerein.empfaenger",
    [["zeile", "Empfänger Einschreiben:"], ["bereich", "Vereinsdaten"]],
    { leerWennFehlt: true, hinweis: "Optionale Angabe der Familie (z. B. „Vorstand“); fehlt sie, bleibt das Feld für die Hand leer. Die Anschrift steht meist im Impressum des bisherigen Vereins." },
  ),
  "Straße und Hausnummer 1": F(
    "Abschnitt „Vereinsdaten“ – „Straße und Hausnummer:“ (Anschrift des bisherigen Vereins)", "assistent", "a.alterVerein.strasse",
    [["zeile", "Straße und Hausnummer:"], ["bereich", "Vereinsdaten"]],
    { leerWennFehlt: true, hinweis: "Optionale Angabe der Familie; fehlt sie, bleibt das Feld für die Hand leer." },
  ),
  "Straße und Hausnummer 2": F(
    "Abschnitt „Vereinsdaten“ – „Postleitzahl und Ort:“ (Anschrift des bisherigen Vereins); der Feldname „Straße und Hausnummer 2“ ist irreführend",
    "assistent", "a.alterVerein.plzOrt", [["zeile", "Postleitzahl und Ort:"], ["bereich", "Vereinsdaten"]],
    { leerWennFehlt: true, hinweis: "Postleitzahl und Ort in einem Wert (z. B. „12345 Beispielstadt“); fehlt er, bleibt das Feld für die Hand leer." },
  ),
  "Hiermit melde ich meine Spielberechtigung bei Ihrem Verein ab": F(
    "Kästchen vor „Hiermit melde ich meine Spielberechtigung bei Ihrem Verein ab.“ (unter „*Zutreffendes bitte ankreuzen“)",
    "assistent", "a.abmeldung.weg=einschreiben", [["rechts", "Hiermit melde ich meine Spielberechtigung bei Ihrem Verein ab."]],
    { leerWennFehlt: true, hinweis: "Nur beim Weg Einschreiben. Wird das Spielrecht per Vollmacht abgemeldet, bleibt das Kästchen leer: Der Vordruck dient dann nur zur Kündigung der Mitgliedschaft." },
  ),
  "Hiermit melde ich meine Mitgliedschaft bei Ihrem Verein ab": F(
    "Kästchen vor „Hiermit melde ich meine Mitgliedschaft bei Ihrem Verein ab.“", "assistent", "a.alterVerein.mitgliedschaft=kuendigen",
    [["rechts", "Hiermit melde ich meine Mitgliedschaft bei Ihrem Verein ab."]],
    { leerWennFehlt: true, hinweis: "Kündigung nach der Satzung des bisherigen Vereins (oft nur zum Jahresende). Bei weiss_nicht oder ohne Antwort bleibt das Kästchen leer; die Familie entscheidet dann von Hand." },
  ),
  "Ich bleibe weiterhin passives Mitglied im Verein": F(
    "Kästchen vor „Ich bleibe weiterhin passives Mitglied im Verein.“", "assistent", "a.alterVerein.mitgliedschaft=passiv",
    [["rechts", "Ich bleibe weiterhin passives Mitglied im Verein."]],
    { leerWennFehlt: true, hinweis: "Bei a.alterVerein.mitgliedschaft=passiv. Bei weiss_nicht oder ohne Antwort bleibt das Kästchen leer." },
  ),
  "Datum und Unterschrift SpielerSpielerin": F(
    "„Datum und Unterschrift Spieler/Spielerin“ – Unterschriftsfläche über der Linie (Datum und Unterschrift in einer Zeile)",
    "familie_hand", null, [["unten", "Datum und Unterschrift Spieler/Spielerin"]],
    { hinweis: "Von Hand, kein vorausgefülltes Datum (siehe unterschriften, Stelle „unterschrift“)." },
  ),
  "Bei Minderjährigen der gesetzliche Vertreter": F(
    "„Bei Minderjährigen der gesetzliche Vertreter“ – Unterschriftsfläche über der Linie", "familie_hand", null,
    [["unten", "Bei Minderjährigen der gesetzliche Vertreter"]],
    { hinweis: "Von Hand (siehe unterschriften, Stelle „unterschrift_vertreter“)." },
  ),
};

// ---------------------------------------------------------------------------------------------
// HFV – Einverständnis des gesetzlichen Vertreters zum vorzeitigen Senioren-Spielrecht (1 Seite, 5 Felder)
// ---------------------------------------------------------------------------------------------
const EINVERSTAENDNIS = {
  "Name Vorname SpielerSpielerin": F(
    "„Name, Vorname Spieler/Spielerin“ (nach „Hiermit ich erkläre ich mich einverstanden, dass mein/meine Sohn/Tochter“)",
    "assistent", `a.nachname + ", " + a.vorname`, [["unten", "Name, Vorname Spieler/Spielerin"]],
  ),
  GebDatum: F("„Geb.-Datum“ (rechts neben dem Namen)", "assistent", "a.geburtsdatum|TT.MM.JJJJ", [["unten", "Geb.-Datum"]]),
  "Name antragstellender Verein": F(
    "„Name antragstellender Verein“ (nach „für den nachfolgend genannten Verein“)", "assistent", "konfig.verein.name_register",
    [["unten", "Name antragstellender Verein"]],
  ),
  "Ort Datum": F(
    "„Ort, Datum“ (unter „das zusätzliche Spielrecht für eine Herren- oder Frauenmannschaft gemäß der Jugendordnung erhalten darf.“)",
    "familie_hand", null, [["unten", "Ort, Datum"]], { hinweis: "Von Hand; kein vorausgefülltes Datum." },
  ),
  "Unterschrift des gesetzlichen Vertreters": F(
    "„Unterschrift des gesetzlichen Vertreters“ – Unterschriftsfläche über der Linie", "familie_hand", null,
    [["unten", "Unterschrift des gesetzlichen Vertreters"]],
    { hinweis: "Textfeld als Unterschriftsfläche, leer lassen (siehe unterschriften, Stelle „unterschrift“)." },
  ),
};
// ---------------------------------------------------------------------------------------------
// Unterschriftsstellen und Handfelder je Formular (Messwerte: Linien per Pixelscan mit 288 dpi und aus den
// Vektordaten der PDFs, Textkoordinaten mit pdftotext -bbox-layout; das Prüfskript liest sie wieder nach).
// Der Aufnahmeantrag übernimmt Lage und Größe wörtlich aus data/aufnahmeantrag-felder.json.
// ---------------------------------------------------------------------------------------------
const V = JSON.parse(fs.readFileSync(path.join(REPO, "data/aufnahmeantrag-felder.json"), "utf8")).felder;
const lin = (l) => ({ x0: l.x0, x1: l.x1, y: l.y });

// Aufnahmeantrag: Werte wörtlich aus data/aufnahmeantrag-felder.json
const vUnter = (schluessel, extra) => {
  const v = V[schluessel];
  return { seite: v.seite, x: v.x, y: v.y, breite: v.breite, hoehe: v.hoehe, linie: lin(v.linie), bezug: "aufnahmeantrag-felder.json#" + schluessel, ...extra };
};
const vText = (schluessel, extra) => {
  const v = V[schluessel];
  return { seite: v.seite, typ: "text", art: "grundlinie", x: v.x, y: v.y, breite: v.breite, hoehe: 13, linie: lin(v.linie), bezug: "aufnahmeantrag-felder.json#" + schluessel, ...extra };
};

const STELLEN = {
  aufnahmeantrag: {
    unterschriften: [
      vUnter("s2.unterschrift", {
        stelleKey: "s2.unterschrift", wer: "mitglied", wennMinderjaehrig: "sorgeberechtigte", beschriftung: "Unterschrift:",
        belege: [["links", "Unterschrift:"]],
        hinweis: "Das Formular nennt hier niemanden; bei Minderjährigen unterschreibt ein Sorgeberechtigter (das Online-Formular druckt den Namen als Zusatz darunter, ZUSAETZE s2.zusatz_unterzeichner).",
      }),
      {
        stelleKey: "s2.unterschrift_sorgeberechtigte", seite: 2, x: 312, y: 72, breite: 232, hoehe: 30, wer: "sorgeberechtigte", bedingung: "e.minderjaehrig",
        beschriftung: "Unterschrift Erziehungsberechtigte/r (bei Minderjährigen)",
        gedruckt: false, linie: { x0: 310.87, x1: 545.12, y: 74 },
        hinweis: "Zusätzliche Stelle, im Vordruck nicht vorhanden: freie Fläche unter der Rahmenlinie (gemessen 2026-09-29: Seite 2 zwischen y 61 und 107 ist leer, Fußzeile beginnt bei y 58,9 rechts). Linie und Beschriftung muss der PDF-Baukasten mit zeichnen. Reicht für zwei Unterschriften nebeneinander (je etwa 112 pt).",
      },
      vUnter("s3.unterschrift", {
        stelleKey: "s3.unterschrift", wer: "mitglied", wennMinderjaehrig: "sorgeberechtigte", beschriftung: "Unterschrift Mitglied (Unterschrift Erziehungsberechtigte/r bei Minderjährigen)",
        belege: [["unten", "(Unterschrift Erziehungsberechtigte/r bei Minderjährigen)"]],
        hinweis: "Gedruckte Linie nur 96 pt lang (x 320,8 bis 416,6); der Kasten reicht bis zum Klammerhinweis darunter (x 501).",
      }),
      vUnter("s4.unterschrift", {
        stelleKey: "s4.unterschrift", wer: "kontoinhaber", beschriftung: "Unterschrift des Kontoinhabers",
        belege: [["unten", "Unterschrift des Kontoinhabers"]],
      }),
    ],
    handfelder: [
      vText("s2.ort_datum", { key: "s2.ort_datum", bedeutung: "„Ort, Datum:“ unter dem Aufnahmeantrag (Seite 2)", belege: [["links", "Ort, Datum:"]] }),
      vText("s3.ort_datum", { key: "s3.ort_datum", bedeutung: "„Ort, Datum:“ unter der Einwilligung zu Fotos (Seite 3)", belege: [["links", "Ort, Datum:"]] }),
      vText("s4.ort_datum", { key: "s4.ort_datum", bedeutung: "„Ort, Datum“ unter dem SEPA-Lastschriftmandat (Seite 4)", belege: [["unten", "Ort, Datum"]] }),
    ],
  },

  hfv_antrag: {
    unterschriften: [
      {
        stelleKey: "spieler", seite: 1, x: 56.3, y: 74.2, breite: 155.2, hoehe: 34, wer: "spieler",
        beschriftung: "Unterschrift des Spielers/der Spielerin", linie: { x0: 56.3, x1: 211.5, y: 74.2 },
        belege: [["unten", "Unterschrift des Spielers/der Spielerin"]],
        hinweis: "Die Spielerin bzw. der Spieler unterschreibt hier; bei Minderjährigen zusätzlich der gesetzliche Vertreter in der Mitte (Stelle „erziehungsberechtigte“).",
      },
      {
        stelleKey: "erziehungsberechtigte", seite: 1, x: 226, y: 74.2, breite: 154.8, hoehe: 34, wer: "sorgeberechtigte", bedingung: "e.minderjaehrig",
        beschriftung: "Unterschrift der Erziehungsberechtigten (nur bei Minderjährigen)", linie: { x0: 226, x1: 380.8, y: 74.2 },
        belege: [["unten", "Unterschrift der Erziehungsberechtigten"], ["unten", "(nur bei Minderjährigen)"]],
        hinweis: "JO § 37 Nr. 2: Beim Wechsel Minderjähriger ist die Zustimmung des gesetzlichen Vertreters durch eigenhändige Unterschrift auf dem Antragsformular zu bestätigen.",
      },
      {
        stelleKey: "verein", seite: 1, x: 395.8, y: 74.2, breite: 157, hoehe: 34, wer: "verein",
        beschriftung: "Unterschrift des Vereins mit Stempel", linie: { x0: 395.8, x1: 552.8, y: 74.2 },
        belege: [["unten", "Unterschrift des Vereins mit Stempel"]],
        hinweis: "Unterschreibt und stempelt der Verein, nicht die Familie.",
      },
      {
        stelleKey: "einwilligung_a", seite: 3, x: 200, y: 363.6, breite: 352.8, hoehe: 24, wer: "sorgeberechtigte", bedingung: "e.alter < 16 und a.einwilligungen.hfvName",
        beschriftung: "Datum, Unterschrift des/der gesetzlichen Vertreter/s (Einwilligung a)", linie: { x0: 68.1, x1: 552.8, y: 363.6 },
        belege: [["unten", "Datum, Unterschrift des/der gesetzlichen Vertreter/s"]],
        hinweis: "Rechts vom Datumsfeld Text2. Einwilligung a) gilt für Kinder und Jugendliche unter 16 Jahren (Veröffentlichung von Vor- und Nachnamen und Spielberichtsdaten).",
      },
      {
        stelleKey: "einwilligung_b", seite: 3, x: 200, y: 218, breite: 352.8, hoehe: 26, wer: "spieler", wennMinderjaehrig: "sorgeberechtigte", bedingung: "a.einwilligungen.hfvFoto",
        beschriftung: "Datum, Unterschrift der Spielerin/des Spielers (bei Minderjährigen des/der gesetzlichen Vertreter/s) (Einwilligung b)", linie: { x0: 68.1, x1: 552.8, y: 218 },
        belege: [["unten", "Datum, Unterschrift der Spielerin/des Spielers (bei Minderjährigen des/der gesetzlichen Vertreter/s)"]],
        hinweis: "Rechts vom Datumsfeld Text6. Einwilligung b) betrifft die Veröffentlichung des Spielerfotos im Internet.",
      },
    ],
    handfelder: [
      { key: "pass_wechsel", feld: "Pass-Wechsel", bedeutung: "Pass-Nummer beim bisherigen Verein, soweit bekannt (Block „Vereinswechsel“)", linie: { x0: 244.4, x1: 358.8, y: 437.1 } },
      { key: "sperre_von", feld: "SperrVon", bedeutung: "Beginn einer laufenden Sperre („von:“)", linie: { x0: 100.3, x1: 185.8, y: 320.8 } },
      { key: "sperre_pflichtspiele", feld: "Sperre-Spiel", bedeutung: "Sperre nach Anzahl Pflichtspiele („oder Pflichtspiele:“)", linie: { x0: 408.8, x1: 443.9, y: 320.8 } },
      { key: "datum_einwilligung_a", feld: "Text2", bedeutung: "Datum zur Einwilligung a) (links auf der Unterschriftszeile)", linie: { x0: 68.1, x1: 552.8, y: 363.6 } },
      { key: "datum_einwilligung_b", feld: "Text6", bedeutung: "Datum zur Einwilligung b) (links auf der Unterschriftszeile)", linie: { x0: 68.1, x1: 552.8, y: 218 } },
    ],
  },

  vollmacht: {
    unterschriften: [
      {
        stelleKey: "unterschrift", feld: "Unterschrift SpielerinSpielerbei Minderjährigen Unterschrift der gesetzlichen Vertreter", wer: "spieler", wennMinderjaehrig: "sorgeberechtigte",
        beschriftung: "Unterschrift Spielerin/Spieler/bei Minderjährigen Unterschrift der gesetzlichen Vertreter", linie: { x0: 70.8, x1: 523.5, y: 290.29 },
      },
    ],
    handfelder: [
      { key: "ort_datum", feld: "Ort Datum", bedeutung: "„Ort, Datum“ unter der Vollmacht", linie: { x0: 70.8, x1: 275, y: 340.29 } },
    ],
  },

  abmeldung: {
    unterschriften: [
      {
        stelleKey: "unterschrift", feld: "Datum und Unterschrift SpielerSpielerin", hoehe: 30, wer: "spieler",
        beschriftung: "Datum und Unterschrift Spieler/Spielerin", linie: { x0: 70.8, x1: 397, y: 148.29 },
        hinweis: "Datum und Unterschrift stehen in einer Zeile: Datum vorn von Hand, danach die Unterschrift.",
      },
      {
        stelleKey: "unterschrift_vertreter", feld: "Bei Minderjährigen der gesetzliche Vertreter", y: 93.67, hoehe: 30, wer: "sorgeberechtigte", bedingung: "e.minderjaehrig",
        beschriftung: "Bei Minderjährigen der gesetzliche Vertreter", linie: { x0: 70.8, x1: 398.5, y: 93.67 },
      },
    ],
    handfelder: [
      { key: "empfaenger", feld: "Empfänger Einschreiben", bedeutung: "„Empfänger Einschreiben:“ im bisherigen Verein", hinweis: "Von Hand nur, wenn der Assistent das Feld leer lässt (leerWennFehlt).", linie: { x0: 212.3, x1: 443, y: 397.04 } },
      { key: "verein_strasse", feld: "Straße und Hausnummer 1", bedeutung: "Straße und Hausnummer des bisherigen Vereins", hinweis: "Von Hand nur, wenn der Assistent das Feld leer lässt (leerWennFehlt).", linie: { x0: 212.3, x1: 443, y: 371.29 } },
      { key: "verein_plz_ort", feld: "Straße und Hausnummer 2", bedeutung: "Postleitzahl und Ort des bisherigen Vereins (Feldname irreführend)", hinweis: "Von Hand nur, wenn der Assistent das Feld leer lässt (leerWennFehlt).", linie: { x0: 212.3, x1: 443, y: 350.29 } },
      { key: "haken_mitgliedschaft", typ: "kreuz", feld: "Hiermit melde ich meine Mitgliedschaft bei Ihrem Verein ab", bedeutung: "Kästchen „Hiermit melde ich meine Mitgliedschaft bei Ihrem Verein ab.“", hinweis: "Von Hand nur, wenn a.alterVerein.mitgliedschaft nicht beantwortet ist (leerWennFehlt); sonst kreuzt der Assistent an." },
      { key: "haken_passiv", typ: "kreuz", feld: "Ich bleibe weiterhin passives Mitglied im Verein", bedeutung: "Kästchen „Ich bleibe weiterhin passives Mitglied im Verein.“", hinweis: "Von Hand nur, wenn a.alterVerein.mitgliedschaft nicht beantwortet ist (leerWennFehlt); sonst kreuzt der Assistent an." },
    ],
  },

  einverstaendnis_senioren: {
    unterschriften: [
      {
        stelleKey: "unterschrift", feld: "Unterschrift des gesetzlichen Vertreters", wer: "sorgeberechtigte",
        beschriftung: "Unterschrift des gesetzlichen Vertreters", linie: { x0: 70.8, x1: 327.3, y: 192.04 },
      },
    ],
    handfelder: [
      { key: "ort_datum", feld: "Ort Datum", bedeutung: "„Ort, Datum“ unter der Einverständniserklärung", linie: { x0: 70.8, x1: 327.5, y: 255.04 } },
    ],
  },
};

// ---------------------------------------------------------------------------------------------
// Beschreibung der Datei (steht als "_beschreibung" am Anfang von data/anmeldung-formulare.json)
// ---------------------------------------------------------------------------------------------
const BESCHREIBUNG = {
  zweck: "Amtliche Vordrucke und Schreibstellen für den Anmelde-Assistenten. Die Datei wird von tools/anmeldung-test/formulare-erzeugen.mjs aus den PDFs unter assets/pdf/anmeldung/ und den Zuordnungen in diesem Skript erzeugt; tools/anmeldung-test/formulare-pruefen.mjs prüft sie gegen die PDFs. Wird ein Vordruck ersetzt: Original mit --bereinigen umwandeln und als Kopie ablegen, quelle_sha256, quelle_bytes und quelle_stand in META anpassen, JSON neu erzeugen, Prüfskript ausführen und alle gemeldeten Abweichungen (Felder, Beschriftungen, Linien) nachziehen.",
  kopien: "Die PDFs unter assets/pdf/anmeldung/ sind Kopien der amtlichen Vordrucke ohne Datei-Metadaten (metadaten_entfernt: true): Die Info-Felder Author, Creator, Producer, Title, Subject und Keywords sowie der XMP-Metadatenstrom sind entfernt (CreationDate und ModDate bleiben), ebenso nicht mehr erreichbare Objekte älterer Fassungen. Seiteninhalt, Formularfelder und Trailer-ID sind unverändert, das Rendering ist pixelgleich. sha256 und bytes gelten für die Kopie im Repo, quelle_sha256 und quelle_bytes für die Originaldatei wie geliefert (sie liegt nicht im Repo).",
  koordinaten: "PDF-Punkte (1 pt = 1/72 Zoll), Ursprung unten links wie bei pdf-lib, Seiten 1-basiert (pdf-lib: getPage(seite - 1)). rect eines Formularfelds = [x, y, Breite, Höhe] mit x/y an der linken unteren Ecke. Kästen der Stellen (unterschriften, handfelder) = x, y (Unterkante), breite, hoehe; bei art „grundlinie“ (nur Aufnahmeantrag, Werte wörtlich aus data/aufnahmeantrag-felder.json) ist y die Textgrundlinie und der Kasten reicht von y - 3 um hoehe nach oben.",
  felder: "Schlüssel = exakter Feldname im PDF (pdf-lib: form.getField(name)); Sonderzeichen und irreführende Namen sind wörtlich übernommen (z. B. „undefined“, „Straße und Hausnummer 2“, „Staatsangeh#C3#B6rigkeit“). typ: text | checkbox. maxLaenge: höchstens erlaubte Zeichen (pdf-lib wirft sonst einen Fehler). bedeutung: gedruckter Wortlaut in „…“ plus Erläuterung. hinweis: Besonderheiten. beleg: gedruckte Beschriftung mit Lage zum Feld und Kasten [x0, y0, x1, y1] aus den Textkoordinaten der PDF (pdftotext -bbox-layout); das Prüfskript liest an derselben Stelle denselben Text wieder aus.",
  lagen: "rechts = Beschriftung rechts neben dem Feld; links = links, höchstens 60 pt entfernt; zeile = links in derselben Zeile (weiter entfernt); oben = direkt über dem Feld; unten = direkt darunter (z. B. unter der Schreiblinie); bereich = Abschnittsüberschrift weiter oben.",
  fuellt: "assistent = der Assistent füllt das Feld aus den Antworten; verein = Feld des Vereins oder des HFV, leer lassen; familie_hand = die Familie schreibt es von Hand, leer lassen.",
  quelle: "Wert bzw. Bedingung als kleiner Ausdruck. Pfade: a.… = Antworten (Schnittstellen Abschnitt 3), e.… = Ergebnis der Regeln (Abschnitt 5), konfig.… = Konfiguration (Abschnitt 2). Textfelder: Pfad, optional mit |Format (TT.MM.JJJJ = ISO-Datum in deutscher Schreibweise, z. B. 2026-12-31 als 31.12.2026; STAATEN = ISO-Länderkürzel als deutsche Bezeichnungen, mit Komma getrennt); Teile mit + verbinden (feste Texte in Anführungszeichen). Kästchen: Bedingung mit =, !=, <, in [x,y], enthält, und, oder, nicht; ein Pfad allein gilt bei Wahrheitswerten. bedingung (bei Textfeldern und Unterschriften): nur füllen bzw. nur nötig, wenn die Bedingung gilt. leerWennFehlt: true (nur bei fuellt=assistent) = fehlt der Wert (nicht beantwortet oder leer), bleibt das Feld bzw. Kästchen leer und wird von Hand ausgefüllt; ohne diese Angabe braucht der Assistent den Wert. Ist der Wert leer, bleibt das Feld leer. null = keine Quelle (Feld bleibt leer).",
  stellen: "unterschriften: Stellen für Unterschriften; stelleKey ist der Schlüssel, den e.unterschriften[].stelleKey verwendet. wer = wer laut Vordruck unterschreibt (mitglied, spieler, sorgeberechtigte, kontoinhaber, verein); wennMinderjaehrig = wer bei Minderjährigen stattdessen unterschreibt; bedingung = nur dann nötig. Kasten = Fläche über der gedruckten Linie für das Unterschriftsbild oder die Markierung; linie = gedruckte Schreiblinie (x0, x1, Höhe y); gedruckt: false = Linie und Beschriftung fehlen im Vordruck, der PDF-Baukasten zeichnet sie mit. handfelder: Stellen, die die Familie von Hand ausfüllt (typ text oder kreuz); feld = zugehöriges Formularfeld im PDF; hat es fuellt=assistent mit leerWennFehlt, schreibt die Familie nur dann von Hand, wenn der Assistent es leer lässt.",
  digitaleUnterschrift: "erlaubt = Vereinsformular, die Unterschrift darf am Bildschirm gezeichnet und als Bild eingesetzt werden; nicht_erlaubt = HFV-Vordruck, die Stellen bleiben leer und werden für die Unterschrift mit Stift markiert (digitaleUnterschriftGrund nennt die Regel; umstellbar, falls die HFV-Passstelle zustimmt).",
};

// ---------------------------------------------------------------------------------------------
// Formulare: Titel, Herkunft, Stand, Original (quelle_sha256/quelle_bytes: Datei wie geliefert, liegt nicht im Repo)
// ---------------------------------------------------------------------------------------------
const META = {
  aufnahmeantrag: {
    datei: "vereinsanmeldung-9-2026.pdf",
    titel: "Aufnahmeantrag – Vereinsanmeldung für neue Mitglieder (mit Einwilligung zu Fotos und SEPA-Lastschriftmandat), F.F.V. Sportfreunde 1904 e.V.",
    quelle_url: "https://cdn.appack.de/sportfreunde04/pdf/Vereinsanmeldung%20allgemein_NEU_9-2026%20%20(1).pdf",
    quelle_stand: "Vereinsformular 9/2026, PDF vom 2026-08-31; Kopie ins Repo am 2026-09-29",
    quelle_sha256: "ce9c37c0f01b6cfffeb09f9c306d403e48ea2220b3f4178315a75ff245866edf",
    quelle_bytes: 217968,
    digitaleUnterschrift: "erlaubt",
    digitaleUnterschriftGrund: "Vereinsformular: Die Form der Erklärung bestimmt der Verein (Satzung verlangt Schriftform; § 127 BGB); Vorstand bestätigt. Der Online-Aufnahmeantrag der Vereinswebsite unterschreibt schon am Bildschirm.",
  },
  hfv_antrag: {
    datei: "hfv-antrag-spielerlaubnis.pdf",
    titel: "Antrag auf Spielerlaubnis / Vereinswechsel (Hessischer Fußball-Verband, Pass-Stelle), mit Datenschutz und Einwilligungen auf Seite 3",
    quelle_url: "https://hfv-online.de/wp-content/uploads/2026/01/Vereinswechsel.pdf",
    quelle_stand: "Antrag Stand 06/2026: PDF erstellt 2026-06-12, zuletzt geändert 2026-06-16 (auf hfv-online.de/formulare-2/ verlinkt mit ?ver=1781606961); Kopie ins Repo am 2026-09-29",
    quelle_sha256: "141193a74971f987d8f26bc0f33ac82c7c1283bfef70577d16b0001c3f9a3af8",
    quelle_bytes: 278105,
    digitaleUnterschrift: "nicht_erlaubt",
    digitaleUnterschriftGrund: "HFV-Vordruck: JO § 37 Nr. 2 verlangt beim Wechsel Minderjähriger die „eigenhändige Unterschrift auf dem Antragsformular“; SpO § 92: unterzeichneter Original-Antrag, mindestens 2 Jahre aufbewahren. Umstellbar, falls die HFV-Passstelle Bildschirm-Unterschriften zulässt.",
  },
  vollmacht: {
    datei: "hfv-vollmacht-abmeldung.pdf",
    titel: "Vollmacht zur Nutzung der stellvertretenden Abmeldung durch den aufnehmenden Verein beim Vereinswechsel über das DFBnet Pass-Online (HFV)",
    quelle_url: "https://hfv-online.de/wp-content/uploads/2026/01/Vollmacht_stellvertretende_Abmeldung.pdf",
    quelle_stand: "Vordruck Stand 2024-05-16 (PDF-Erstellungsdatum); am 2026-09-29 auf hfv-online.de/formulare-2/ verlinkt; Kopie ins Repo am 2026-09-29",
    quelle_sha256: "735087e1b40a14ca468b6406ac503c2a575ba76c123ca5505000b53aa3944bab",
    quelle_bytes: 83757,
    digitaleUnterschrift: "nicht_erlaubt",
    digitaleUnterschriftGrund: "HFV-Vordruck: gilt nur in Verbindung mit dem unterschriebenen Antrag auf Spielerlaubnis; SpO § 92 Nr. 2 (schriftliche Zustimmung des Spielers), Unterlagen mindestens 2 Jahre aufbewahren; Passstelle 2026: unterschriebene Unterlagen in Papierform. Umstellbar, falls die Passstelle zustimmt.",
  },
  abmeldung: {
    datei: "hfv-abmeldung-verein.pdf",
    titel: "Formular zur Abmeldung der Spielberechtigung und/oder der Mitgliedschaft im Verein per Einschreiben (HFV)",
    quelle_url: "https://hfv-online.de/wp-content/uploads/2026/01/Abmeldung_bei_Verein.pdf",
    quelle_stand: "Vordruck Stand 2024-04-18 (PDF-Erstellungsdatum); am 2026-09-29 auf hfv-online.de/formulare-2/ verlinkt; Kopie ins Repo am 2026-09-29",
    quelle_sha256: "26e6319bfb81788c6eac2e74cc1d1c8279240fd6b603201d28cd9a258e7e53fd",
    quelle_bytes: 98665,
    digitaleUnterschrift: "nicht_erlaubt",
    digitaleUnterschriftGrund: "HFV-Vordruck, geht als Einschreiben im Original an den bisherigen Verein (SpO § 93 Nr. 2: Poststempel ist der Abmeldetag); JO § 37 Nr. 2: eigenhändige Unterschrift; SpO § 92: Originale aufbewahren. Umstellbar, falls die Passstelle zustimmt.",
  },
  einverstaendnis_senioren: {
    datei: "hfv-einverstaendnis-senioren.pdf",
    titel: "Vorgangsdokument für die schriftliche Einverständniserklärung des gesetzlichen Vertreters zum vorzeitigen Herren- oder Frauenspielrecht gemäß Jugendordnung (HFV)",
    quelle_url: "https://hfv-online.de/wp-content/uploads/2026/01/Einverstaendnis_gesetzlicher_Vertreters.pdf",
    quelle_stand: "Vordruck Stand 2025-06-10 (PDF-Erstellungsdatum); am 2026-09-29 auf hfv-online.de/formulare-2/ verlinkt; Kopie ins Repo am 2026-09-29",
    quelle_sha256: "fbc68d12333a84220776e8f2f53fd658aa1b4470636de0cfcfbb3e54ce049b8b",
    quelle_bytes: 67664,
    digitaleUnterschrift: "nicht_erlaubt",
    digitaleUnterschriftGrund: "HFV-Vordruck: JO § 29 Nr. 5 b und § 30 Nr. 1 b verlangen die „schriftliche Einverständniserklärung des gesetzlichen Vertreters“ als Antragsunterlage; SpO § 92: Originale aufbewahren. Umstellbar, falls die Passstelle zustimmt.",
  },
};


// ---------------------------------------------------------------------------------------------
// Datei-Metadaten entfernen (--bereinigen) und prüfen
// ---------------------------------------------------------------------------------------------
const ENTFERNTE_INFO_SCHLUESSEL = ["Author", "Creator", "Producer", "Title", "Subject", "Keywords"];

// Alle Objekte, die von Katalog oder Info aus erreichbar sind (Verweise in Wörterbüchern, Feldern, Stream-Köpfen).
function erreichbar(ctx, wurzeln) {
  const gesehen = new Set();
  const stapel = [...wurzeln];
  while (stapel.length) {
    const o = stapel.pop();
    if (!o) continue;
    if (o instanceof PDFRef) {
      const k = o.toString();
      if (gesehen.has(k)) continue;
      gesehen.add(k);
      stapel.push(ctx.lookup(o));
    } else if (o instanceof PDFStream) stapel.push(o.dict);
    else if (o instanceof PDFDict) for (const [, v] of o.entries()) stapel.push(v);
    else if (o instanceof PDFArray) for (let i = 0; i < o.size(); i++) stapel.push(o.get(i));
  }
  return gesehen;
}

// Was an Datei-Metadaten noch in der PDF steht (leere Liste = sauber)
function metadatenBefunde(doc) {
  const ctx = doc.context;
  const befunde = [];
  const info = ctx.trailerInfo.Info ? ctx.lookup(ctx.trailerInfo.Info, PDFDict) : undefined;
  if (info) for (const k of ENTFERNTE_INFO_SCHLUESSEL) if (info.has(PDFName.of(k))) befunde.push(`Info-Feld ${k}`);
  if (doc.catalog.has(PDFName.of("Metadata"))) befunde.push("XMP-Verweis im Katalog");
  for (const [ref, o] of ctx.enumerateIndirectObjects()) {
    const d = o instanceof PDFStream ? o.dict : o instanceof PDFDict ? o : null;
    if (d && d.get(PDFName.of("Type"))?.toString() === "/Metadata") befunde.push(`Objekt ${ref} vom Typ /Metadata`);
  }
  return befunde;
}

// pdf-lib laden, Info-Felder und XMP entfernen, nicht erreichbare Objekte verwerfen, ohne Formularfelder neu zu zeichnen speichern.
// Seiteninhalte, Formularfelder und die Trailer-ID bleiben unverändert; das Ergebnis ist bei gleicher Eingabe byte-gleich.
async function bereinige(bytes, { objektstroeme }) {
  const doc = await PDFDocument.load(bytes, { updateMetadata: false });
  const ctx = doc.context;
  const info = ctx.trailerInfo.Info ? ctx.lookup(ctx.trailerInfo.Info, PDFDict) : undefined;
  if (info) for (const k of ENTFERNTE_INFO_SCHLUESSEL) info.delete(PDFName.of(k));
  const meta = doc.catalog.get(PDFName.of("Metadata"));
  doc.catalog.delete(PDFName.of("Metadata"));
  if (meta instanceof PDFRef) ctx.delete(meta);
  const erreicht = erreichbar(ctx, [ctx.trailerInfo.Root, ctx.trailerInfo.Info].filter(Boolean));
  let waisenEntfernt = 0;
  for (const [ref] of ctx.enumerateIndirectObjects()) if (!erreicht.has(ref.toString())) { ctx.delete(ref); waisenEntfernt++; }
  const ausgabe = await doc.save({ useObjectStreams: objektstroeme, updateFieldAppearances: false });
  return { bytes: ausgabe, waisenEntfernt };
}

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

async function bereinigenAufrufen(originalPfad, kopiePfad, ohneObjektstroeme) {
  if (!originalPfad || !kopiePfad) throw new Error("Aufruf: --bereinigen <original.pdf> <kopie.pdf> [--ohne-objektstroeme]");
  if (path.resolve(originalPfad) === path.resolve(kopiePfad)) throw new Error("Original und Kopie dürfen nicht dieselbe Datei sein.");
  const original = fs.readFileSync(originalPfad);
  // Objektströme wie im Original beibehalten (Word-Dateien nutzen sie, ältere Werkzeuge oft nicht)
  const objektstroeme = !ohneObjektstroeme && /\/Type\s*\/ObjStm/.test(original.toString("latin1"));
  const { bytes, waisenEntfernt } = await bereinige(original, { objektstroeme });
  const befunde = metadatenBefunde(await PDFDocument.load(bytes, { updateMetadata: false }));
  if (befunde.length) throw new Error("Kopie enthält noch Datei-Metadaten: " + befunde.join(", "));
  fs.writeFileSync(kopiePfad, bytes);
  console.log(`Original: quelle_sha256 ${sha256(original)}, quelle_bytes ${original.length}  (in META eintragen)`);
  console.log(`Kopie:    sha256 ${sha256(bytes)}, bytes ${bytes.length}  (${kopiePfad})`);
  console.log(`Objektströme ${objektstroeme ? "ja" : "nein"}, nicht erreichbare Objekte entfernt: ${waisenEntfernt}, Info-Felder ${ENTFERNTE_INFO_SCHLUESSEL.join("/")} und XMP entfernt.`);
}

// ---------------------------------------------------------------------------------------------
// Textkoordinaten (pdftotext -bbox-layout)
// ---------------------------------------------------------------------------------------------
const r2 = (n) => Math.round(n * 100) / 100;
const norm = (s) => s.replace(/\s+/g, "");

function textKoordinaten(datei) {
  const res = spawnSync("pdftotext", ["-bbox-layout", datei, "-"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (res.error) throw new Error("pdftotext (poppler) nicht gefunden – bitte installieren (brew install poppler).");
  if (res.status !== 0) throw new Error("pdftotext: " + res.stderr);
  return res.stdout.split("<page ").slice(1).map((s) => {
    const h = Number(/height="([\d.]+)"/.exec(s)[1]);
    const zeilen = [...s.matchAll(/<line [^>]*>([\s\S]*?)<\/line>/g)].map((z) =>
      [...z[1].matchAll(/<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([\s\S]*?)<\/word>/g)].map((k) => ({
        x0: +k[1], x1: +k[3], y0: h - +k[4], y1: h - +k[2],
        t: k[5].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'"),
      })));
    return { h, zeilen };
  });
}

// Alle Fundstellen eines Textes (Wortfolge innerhalb einer Zeile), als Kasten {x0,y0,x1,y1}.
function fundstellen(seite, text) {
  const ziel = norm(text);
  const treffer = [];
  for (const zeile of seite.zeilen) {
    for (let i = 0; i < zeile.length; i++) {
      let acc = "";
      for (let j = i; j < zeile.length; j++) {
        acc += norm(zeile[j].t);
        if (acc === ziel) {
          const ws = zeile.slice(i, j + 1);
          treffer.push({ x0: Math.min(...ws.map((w) => w.x0)), x1: Math.max(...ws.map((w) => w.x1)), y0: Math.min(...ws.map((w) => w.y0)), y1: Math.max(...ws.map((w) => w.y1)) });
          break;
        }
        if (acc.length >= ziel.length) break;
      }
    }
  }
  return treffer;
}

const ueberlappV = (a, b) => Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
const ueberlappH = (a, b) => Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);

// Liegt ein Textkasten in der behaupteten Lage zum Rechteck? Liefert den Abstand oder null (dieselben Regeln wie im Prüfskript).
function lageAbstand(lage, k, rr) {
  switch (lage) {
    case "rechts": return k.x0 >= rr.x1 - 1.5 && k.x0 - rr.x1 <= 20 && ueberlappV(k, rr) >= 3 ? k.x0 - rr.x1 : null;
    case "links": return k.x1 <= rr.x0 + 1.5 && rr.x0 - k.x1 <= 60 && ueberlappV(k, rr) >= 3 ? rr.x0 - k.x1 : null;
    case "zeile": return k.x1 <= rr.x0 + 1.5 && ueberlappV(k, rr) >= 3 ? rr.x0 - k.x1 : null;
    case "oben": return k.y0 >= rr.y1 - 2 && k.y0 - rr.y1 <= 80 && ueberlappH(k, rr) >= 3 ? k.y0 - rr.y1 : null;
    case "unten": return k.y1 <= rr.y0 + 2 && rr.y0 - k.y1 <= 40 && ueberlappH(k, rr) >= 3 ? rr.y0 - k.y1 : null;
    case "bereich": return k.y0 >= rr.y1 - 2 && k.y0 - rr.y1 <= 130 ? k.y0 - rr.y1 : null;
    default: throw new Error("unbekannte Lage " + lage);
  }
}

const FEHLER = [];
function belegFinden(seiteText, lage, text, rechteck, kontext) {
  const treffer = fundstellen(seiteText, text)
    .map((k) => ({ k, d: lageAbstand(lage, k, rechteck) }))
    .filter((c) => c.d !== null)
    .sort((a, b) => a.d - b.d);
  if (!treffer.length) {
    FEHLER.push(`${kontext}: Beschriftung „${text}“ nicht in Lage „${lage}“ gefunden (Rechteck ${JSON.stringify(rechteck)})`);
    return { lage, text, box: null };
  }
  const k = treffer[0].k;
  return { lage, text, box: [r2(k.x0), r2(k.y0), r2(k.x1), r2(k.y1)] };
}

// ---------------------------------------------------------------------------------------------
// PDF-Felder
// ---------------------------------------------------------------------------------------------
async function ladePdf(pdfOrdner, datei) {
  const bytes = fs.readFileSync(path.join(pdfOrdner, datei));
  const doc = await PDFDocument.load(bytes, { updateMetadata: false });
  const seiten = doc.getPages();
  const refs = seiten.map((p) => p.ref.toString());
  const felder = doc.getForm().getFields().map((f) => {
    const ws = f.acroField.getWidgets();
    if (ws.length !== 1) throw new Error(`${f.getName()}: ${ws.length} Widgets`);
    const w = ws[0];
    const rc = w.getRectangle();
    let seite = w.P() ? refs.indexOf(w.P().toString()) + 1 : 0;
    if (!seite) seiten.forEach((p, i) => { const an = p.node.Annots(); if (an) for (let k = 0; k < an.size(); k++) if (an.lookup(k) === w.dict) seite = i + 1; });
    const typ = f.constructor.name === "PDFCheckBox" ? "checkbox" : f.constructor.name === "PDFTextField" ? "text" : "?" + f.constructor.name;
    return { name: f.getName(), typ, seite, rect: [r2(rc.x), r2(rc.y), r2(rc.width), r2(rc.height)], maxLaenge: typ === "text" ? f.getMaxLength() : undefined };
  });
  const s0 = seiten[0].getSize();
  return { bytes, doc, sha256: sha256(bytes), seiten: seiten.length, breite: r2(s0.width), hoehe: r2(s0.height), felder };
}

function feldBauen(pdfFeld, kur, textSeiten) {
  const [x, y, b, h] = pdfFeld.rect;
  const rechteck = { x0: x, y0: y, x1: x + b, y1: y + h };
  const beleg = kur.belege.map(([lage, text]) => belegFinden(textSeiten[pdfFeld.seite - 1], lage, text, rechteck, pdfFeld.name));
  const o = { typ: pdfFeld.typ, seite: pdfFeld.seite, rect: pdfFeld.rect };
  if (pdfFeld.maxLaenge) o.maxLaenge = pdfFeld.maxLaenge;
  o.bedeutung = kur.bedeutung;
  o.fuellt = kur.fuellt;
  o.quelle = kur.quelle;
  if (kur.bedingung) o.bedingung = kur.bedingung;
  if (kur.leerWennFehlt) o.leerWennFehlt = true;
  if (kur.hinweis) o.hinweis = kur.hinweis;
  o.beleg = beleg;
  return o;
}

// Die Reihenfolge der kuratierten Objekte ist die Lesereihenfolge im Formular.
function felderZusammenfuehren(pdf, kuratiert, textSeiten, name) {
  const pdfNamen = pdf.felder.map((f) => f.name);
  const kurNamen = Object.keys(kuratiert);
  const fehlt = pdfNamen.filter((n) => !kurNamen.includes(n));
  const zuviel = kurNamen.filter((n) => !pdfNamen.includes(n));
  if (fehlt.length || zuviel.length) throw new Error(`${name}: Felder passen nicht – im PDF ohne Angabe: ${JSON.stringify(fehlt)}; Angabe ohne PDF-Feld: ${JSON.stringify(zuviel)}`);
  const out = {};
  for (const n of kurNamen) out[n] = feldBauen(pdf.felder.find((f) => f.name === n), kuratiert[n], textSeiten);
  return out;
}

// ---------------------------------------------------------------------------------------------
// Unterschrifts- und Handfelder
// ---------------------------------------------------------------------------------------------
function stelleAusFeld(pdf, feldName) {
  const f = pdf.felder.find((k) => k.name === feldName);
  if (!f) throw new Error("Feld für Stelle nicht gefunden: " + feldName);
  return f;
}

function stellenBauen(pdf, textSeiten, formName, defs, art) {
  return defs.map((d) => {
    const o = {};
    if (art === "unterschrift") o.stelleKey = d.stelleKey; else o.key = d.key;
    let x = d.x, y = d.y, b = d.breite, h = d.hoehe, seite = d.seite;
    if (d.feld) {
      const f = stelleAusFeld(pdf, d.feld);
      seite = f.seite;
      x = d.x ?? f.rect[0]; y = d.y ?? f.rect[1]; b = d.breite ?? f.rect[2]; h = d.hoehe ?? f.rect[3];
    }
    o.seite = seite;
    if (art === "handfeld") o.typ = d.typ ?? "text";
    o.x = r2(x); o.y = r2(y); o.breite = r2(b); o.hoehe = r2(h);
    if (art === "unterschrift") {
      o.wer = d.wer;
      if (d.wennMinderjaehrig) o.wennMinderjaehrig = d.wennMinderjaehrig;
      if (d.bedingung) o.bedingung = d.bedingung;
      o.beschriftung = d.beschriftung;
    } else {
      o.art = d.art ?? "kasten";
      o.bedeutung = d.bedeutung;
    }
    if (d.bezug) o.bezug = d.bezug;
    if (d.feld) o.feld = d.feld;
    if (d.linie) o.linie = d.linie;
    if (d.gedruckt === false) o.gedruckt = false;
    if (d.hinweis) o.hinweis = d.hinweis;
    if (d.belege?.length) {
      const rech = d.art === "grundlinie"
        ? { x0: o.x, y0: o.y - 3, x1: o.x + o.breite, y1: o.y - 3 + o.hoehe }
        : { x0: o.x, y0: o.y, x1: o.x + o.breite, y1: o.y + o.hoehe };
      o.beleg = d.belege.map(([lage, text]) => belegFinden(textSeiten[o.seite - 1], lage, text, rech, `${formName}.${d.stelleKey ?? d.key}`));
    }
    return o;
  });
}

// ---------------------------------------------------------------------------------------------
// JSON zusammenbauen und ausgeben
// ---------------------------------------------------------------------------------------------
const FORMULAR_SCHLUESSEL = ["aufnahmeantrag", "hfv_antrag", "vollmacht", "abmeldung", "einverstaendnis_senioren"];
const KURATIERT = { hfv_antrag: ANTRAG, vollmacht: VOLLMACHT, abmeldung: ABMELDUNG, einverstaendnis_senioren: EINVERSTAENDNIS };

async function erzeugeDaten(pdfOrdner) {
  const formulare = {};
  for (const key of FORMULAR_SCHLUESSEL) {
    const m = META[key];
    const pdf = await ladePdf(pdfOrdner, m.datei);
    const befunde = metadatenBefunde(pdf.doc);
    if (befunde.length) throw new Error(`${key}: ${m.datei} enthält noch Datei-Metadaten (${befunde.join(", ")}) – erst mit --bereinigen umwandeln.`);
    if (pdf.sha256 === m.quelle_sha256) throw new Error(`${key}: ${m.datei} ist mit dem Original identisch, obwohl metadaten_entfernt gelten soll – quelle_sha256 prüfen.`);
    const textSeiten = textKoordinaten(path.join(pdfOrdner, m.datei));
    const o = {
      titel: m.titel,
      datei: "assets/pdf/anmeldung/" + m.datei,
      quelle_url: m.quelle_url,
      quelle_stand: m.quelle_stand,
      sha256: pdf.sha256,
      bytes: pdf.bytes.length,
      quelle_sha256: m.quelle_sha256,
      quelle_bytes: m.quelle_bytes,
      metadaten_entfernt: true,
      seiten: pdf.seiten,
      seitenformat: { breite: pdf.breite, hoehe: pdf.hoehe, name: "A4" },
      formularfelder: pdf.felder.length,
    };
    if (key === "aufnahmeantrag") {
      o.vermessung = "data/aufnahmeantrag-felder.json";
      if (pdf.felder.length) throw new Error("Aufnahmeantrag hat unerwartet Formularfelder");
    } else o.felder = felderZusammenfuehren(pdf, KURATIERT[key], textSeiten, key);
    o.unterschriften = stellenBauen(pdf, textSeiten, key, STELLEN[key].unterschriften, "unterschrift");
    o.handfelder = stellenBauen(pdf, textSeiten, key, STELLEN[key].handfelder, "handfeld");
    o.digitaleUnterschrift = m.digitaleUnterschrift;
    o.digitaleUnterschriftGrund = m.digitaleUnterschriftGrund;
    formulare[key] = o;
  }
  if (FEHLER.length) throw new Error(FEHLER.length + " Beschriftung(en) nicht gefunden:\n- " + FEHLER.join("\n- "));
  return { _beschreibung: BESCHREIBUNG, stand: "2026-09-29", formulare };
}

// Zahlenlisten und kurze Wörterbücher in einer Zeile, sonst zwei Leerzeichen Einzug
function json(wert, einzug = "") {
  const naechst = einzug + "  ";
  if (Array.isArray(wert)) {
    if (wert.every((v) => typeof v === "number" || typeof v === "string") && wert.join("").length < 120) return "[" + wert.map((v) => JSON.stringify(v)).join(", ") + "]";
    if (!wert.length) return "[]";
    return "[\n" + wert.map((v) => naechst + json(v, naechst)).join(",\n") + "\n" + einzug + "]";
  }
  if (wert && typeof wert === "object") {
    const ks = Object.keys(wert);
    if (!ks.length) return "{}";
    const einfach = (v) => v === null || ["number", "string", "boolean"].includes(typeof v) || (Array.isArray(v) && v.every((n) => typeof n === "number"));
    const flach = ks.every((k) => einfach(wert[k])) && JSON.stringify(wert).length <= 200;
    if (flach) return "{ " + ks.map((k) => JSON.stringify(k) + ": " + json(wert[k])).join(", ") + " }";
    return "{\n" + ks.map((k) => naechst + JSON.stringify(k) + ": " + json(wert[k], naechst)).join(",\n") + "\n" + einzug + "}";
  }
  return JSON.stringify(wert);
}

// ---------------------------------------------------------------------------------------------
// Aufruf
// ---------------------------------------------------------------------------------------------
const args = process.argv.slice(2);
const wertNach = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
try {
  if (args.includes("--bereinigen")) {
    const i = args.indexOf("--bereinigen");
    await bereinigenAufrufen(args[i + 1], args[i + 2], args.includes("--ohne-objektstroeme"));
  } else {
    const pdfOrdner = path.resolve(wertNach("--pdf-ordner") ?? path.join(REPO, "assets/pdf/anmeldung"));
    const text = json(await erzeugeDaten(pdfOrdner)) + "\n";
    JSON.parse(text); // muss gültig sein
    const ziel = wertNach("--ausgabe");
    if (ziel) {
      fs.writeFileSync(ziel, text);
      console.error(`geschrieben: ${ziel} (${text.length} Zeichen)`);
    } else process.stdout.write(text);
  }
} catch (fehler) {
  console.error("FEHLER: " + fehler.message);
  process.exit(1);
}
