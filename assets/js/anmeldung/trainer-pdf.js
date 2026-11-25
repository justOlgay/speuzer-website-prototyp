/*
  PDF-Erzeugung der Seite „Neu im Trainerteam“ (FFV Sportfreunde 04): aus den Angaben der Person entstehen im Browser die Dateien,
  die sie selbst per E-Mail an die Geschäftsstelle schickt. Nichts wird übertragen; das Modul hat keine Oberfläche und kennt
  weder DOM noch Uhrzeit (das Datum kommt als `heute`). Gleiche Eingaben ergeben dieselben Dateien.

  Schnittstelle (GEMEINSAM.md 4.3)
    erzeugeDateien({ antworten, medien, konfig, heute, werkzeuge? })
        → { dateien: [{ name, typ, bytes, beschreibung }], warnungen: [] }
        Trainerunterlagen_<Nachname>_<Vorname>.pdf             Deckblatt, Anmeldung, Kontaktdatenblatt, Selbstauskunft,
                                                                Erklärung zum Verhaltenskodex, Information nach Art. 13 DSGVO
        Antrag_Gebuehrenbefreiung_<Nachname>_<Vorname>.pdf      nur bei antworten.zeugnis === "beantragen"
        Passfoto_<Nachname>_<Vorname>.jpg                       medien.foto unverändert
    vorschauAntrag({ antworten, konfig, heute, werkzeuge? }) → Uint8Array (der Antrag, gleicher Inhalt wie in der Datei)
  heute: „JJJJ-MM-TT“. werkzeuge: nur ohne Browser (Node-Test): { PDFLib, fontkit, schrift } (siehe trainer-pdf-lader.js); im Browser
  lädt trainer-pdf-lader.js pdf-lib, fontkit und die Schrift nach konfig.quellen, wie der Assistent.

  Eingaben und Fehler
    antworten, medien   Felder wie im Zustand der Seite (GEMEINSAM.md 4.2): medien.foto JPEG, medien.unterschrift PNG
    konfig (Pflicht)    verein.name, verein.ort, schnupperMonate (ganze Zahl ab 0; Frist „Unterlagen fällig am“),
                        verein.unterzeichner { name, funktion } (Fußblock des Antrags; nur gebraucht, wenn ein Antrag entsteht)
    konfig (optional)   verein.name_register (Name des Verantwortlichen in der Information nach Art. 13, sonst verein.name),
                        verein.anschrift { postfach, postfachPlz, postfachOrt, strasse, plz, ort } und verein.mail (ebenda),
                        einsicht (Liste von { name, funktion }; leer: „dem Vorstand“, siehe trainer-einsicht.js),
                        zeugnisJahre (Satz zur Wiedervorlage auf dem Deckblatt), quellen { pdfLib, fontkit, schriftModul }
    Fehler              TrainerPdfFehler (Art: angaben, konfig, unterschrift-fehlt, unterschrift-format, foto-fehlt, foto-format)
                        und LadeFehler aus pdf-lader.js (Art „bibliothek“ für pdf-lib, fontkit und Schrift, „pdf“ für alles andere)
    warnungen           Texte zu Mängeln, die nichts abbrechen (Zeichen der Eingaben außerhalb der Schrift, Text über dem Rand)

  Einsichtnehmende: Der Namensteil kommt ausschließlich aus trainer-einsicht.js (konfig.einsicht); hier steht kein Name fest.
  Die Anmeldung als beitragsfreies Mitglied ist eine eigene Seite (Begründung in trainer-pdf-seiten.js).
*/

import { LadeFehler } from "./pdf-lader.js";
import { bereiteVor, pruefeMedien } from "./trainer-pdf-daten.js";
import { Dokument, TrainerPdfFehler } from "./trainer-pdf-hilfen.js";
import { ladeWerkzeuge } from "./trainer-pdf-lader.js";
import { baueAntrag } from "./trainer-pdf-antrag.js";
import { anmeldung, datenschutz, deckblatt, fusszeilen, kontaktdatenblatt, kodex, selbstauskunft } from "./trainer-pdf-seiten.js";
import { T } from "./trainer-pdf-texte.js";

export { TrainerPdfFehler };

function warnungenVon(dok) {
  return dok.probleme.concat(
    dok.ersetzt.map((e) => (e.art === "angabe" ? "Zeichen einer Angabe fehlt in der Schrift (steht als ? in der Datei): " : "Zeichen eines Textes fehlt in der Schrift: ") + e.text)
  );
}

// Fehler, die nicht schon TrainerPdfFehler oder LadeFehler sind, tragen die Art „pdf“ (wie im Assistenten)
function umhuellt(fehler) {
  if (fehler instanceof TrainerPdfFehler || fehler instanceof LadeFehler) return fehler;
  console.error("Trainerunterlagen: PDF-Erzeugung fehlgeschlagen", fehler);
  return new LadeFehler("pdf", fehler && fehler.message);
}

export async function erzeugeDateien({ antworten, medien, konfig, heute, werkzeuge }) {
  try {
    const d = bereiteVor({ antworten, konfig, heute }, "paket");
    pruefeMedien(medien);
    const wz = await ladeWerkzeuge(konfig, werkzeuge);
    const warnungen = [];

    const dok = await Dokument.neu(wz);
    const sig = await dok.bettePng(medien.unterschrift);
    deckblatt(dok, d);
    anmeldung(dok, d, sig);
    kontaktdatenblatt(dok, d, sig);
    selbstauskunft(dok, d, sig);
    kodex(dok, d, sig);
    datenschutz(dok, d);
    fusszeilen(dok, d);
    dok.setzeMetadaten({ titel: T.meta.titelPaket, betreff: T.meta.betreffPaket, ersteller: d.verein.name, heute: d.heute });
    const paket = await dok.speichern();
    warnungen.push(...warnungenVon(dok));

    const teile = d.dateiteile.nachname + "_" + d.dateiteile.vorname;
    const dateien = [{ name: "Trainerunterlagen_" + teile + ".pdf", typ: "application/pdf", bytes: paket, beschreibung: T.dateien.paket }];
    if (d.zeugnis === "beantragen") {
      const antrag = await baueAntrag(wz, d);
      warnungen.push(...warnungenVon(antrag.dok));
      dateien.push({ name: "Antrag_Gebuehrenbefreiung_" + teile + ".pdf", typ: "application/pdf", bytes: antrag.bytes, beschreibung: T.dateien.antrag });
    }
    dateien.push({ name: "Passfoto_" + teile + ".jpg", typ: "image/jpeg", bytes: medien.foto, beschreibung: T.dateien.foto });
    return { dateien, warnungen };
  } catch (fehler) {
    throw umhuellt(fehler);
  }
}

export async function vorschauAntrag({ antworten, konfig, heute, werkzeuge }) {
  try {
    const d = bereiteVor({ antworten, konfig, heute }, "antrag");
    const wz = await ladeWerkzeuge(konfig, werkzeuge);
    return (await baueAntrag(wz, d)).bytes;
  } catch (fehler) {
    throw umhuellt(fehler);
  }
}
