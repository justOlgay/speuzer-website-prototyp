import { LadeFehler } from "./anmeldung-pdf-lader.js";
import { bereiteVor, pruefeMedien } from "./anmeldung-trainer-pdf-daten.js";
import { Dokument, TrainerPdfFehler } from "./anmeldung-trainer-pdf-hilfen.js";
import { ladeWerkzeuge } from "./anmeldung-trainer-pdf-lader.js";
import { baueAntrag, zeichneAntrag } from "./anmeldung-trainer-pdf-antrag.js";
import { anmeldung, datenschutz, deckblatt, fusszeilen, kontaktdatenblatt, kodex, passfoto, selbstauskunft } from "./anmeldung-trainer-pdf-seiten.js";
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
    d.hatFoto = !!medien.foto;
    const wz = await ladeWerkzeuge(konfig, werkzeuge);

    const dok = await Dokument.neu(wz);
    const sig = await dok.bettePng(medien.unterschrift);
    const foto = d.hatFoto ? await dok.betteJpeg(medien.foto) : null;
    deckblatt(dok, d);
    anmeldung(dok, d, sig);
    kontaktdatenblatt(dok, d, sig);
    selbstauskunft(dok, d, sig);
    kodex(dok, d, sig);
    datenschutz(dok, d);

    const ohneFuss = [];
    if (d.zeugnis === "beantragen") ohneFuss.push(zeichneAntrag(dok, d));
    if (foto) passfoto(dok, d, foto);
    fusszeilen(dok, d, { ohne: ohneFuss });
    dok.setzeMetadaten({ titel: T.meta.titelPaket, betreff: T.meta.betreffPaket, ersteller: d.verein.name, heute: d.heute });
    const bytes = await dok.speichern();

    const teile = d.dateiteile.nachname + "_" + d.dateiteile.vorname;
    const beschreibung = [T.dateien.basis, d.zeugnis === "beantragen" ? T.dateien.antrag : "", d.hatFoto ? T.dateien.foto : ""].filter(Boolean).join(", ");
    const dateien = [{ name: "Trainerunterlagen_" + teile + ".pdf", typ: "application/pdf", bytes, beschreibung }];
    return { dateien, warnungen: warnungenVon(dok) };
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
