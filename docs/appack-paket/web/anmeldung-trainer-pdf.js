import { LadeFehler } from "./anmeldung-pdf-lader.js";
import { bereiteVor, pruefeMedien } from "./anmeldung-trainer-pdf-daten.js";
import { Dokument, TrainerPdfFehler } from "./anmeldung-trainer-pdf-hilfen.js";
import { ladeWerkzeuge } from "./anmeldung-trainer-pdf-lader.js";
import { baueAntrag } from "./anmeldung-trainer-pdf-antrag.js";
import { anmeldung, datenschutz, deckblatt, fusszeilen, kontaktdatenblatt, kodex, selbstauskunft } from "./anmeldung-trainer-pdf-seiten.js";
import { T } from "./anmeldung-trainer-pdf-texte.js";

export { TrainerPdfFehler };

function warnungenVon(dok) {
  return dok.probleme.concat(
    dok.ersetzt.map((e) => (e.art === "angabe" ? "Zeichen einer Angabe fehlt in der Schrift (steht als ? in der Datei): " : "Zeichen eines Textes fehlt in der Schrift: ") + e.text)
  );
}

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
