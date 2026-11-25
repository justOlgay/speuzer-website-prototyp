/*
  Antrag auf Gebührenbefreiung (Brief des Vereins), eine A4-Seite. zeichneAntrag setzt sie als Seite in die Datei der Trainerunterlagen
  (trainer-pdf.js: vorletzte Seite, vor dem Passfoto); baueAntrag macht daraus ein eigenes PDF für die Vorschau „Antrag ansehen“.

  Wortlaut und Aussehen wie ap1/beispiele/antrag-gebuehrenbefreiung (T.antrag in trainer-pdf-texte.js): Wappen oben links, Ort und
  Datum oben rechts, zwei Überschriften in Großbuchstaben, Anrede, vier Absätze im Blocksatz, die Angaben der Person (Name, Geburtsdatum,
  Anschrift, Funktion) auf Schreiblinien, Schluss und Fußblock. Einzige Abweichung vom Original des Vereins: die Fundstelle
  „§ 30a Abs. 1 Nr. 2 Buchst. a BZRG“ statt „Nr. 2b“ (Ergebnis der Faktenprüfung).

  Keine Unterschrift des Vereins: Der Fußblock trägt „FFV Sportfreunde 04 e.V.“, den Namen und die Funktion aus
  konfig.verein.unterzeichner und eine LEERE Linie hinter „i.A.“. Es gibt kein Unterschriftsbild und überhaupt kein Bild in der Datei
  (das Wappen ist Vektor).

  Die Abstände der Zeilen sind aus dem Beispiel-Blatt gemessen (150 dpi); bricht ein Absatz anders um, rücken die folgenden Zeilen mit.
*/

import { ersetzePlatzhalter } from "./hilfen.js";
import { A4, Dokument, FARBE, RAND, Schreiber } from "./trainer-pdf-hilfen.js";
import { T } from "./trainer-pdf-texte.js";

const S = 10.5; // Schriftgröße des Briefs
const LH = 15.75; // Zeilenabstand (1,5)

// Zeichnet den Brief auf eine neue Seite des Dokuments (ohne Fußzeile: Der Brief geht, vom Verein unterschrieben, an das Bürgeramt).
export function zeichneAntrag(dok, d) {
  const t = T.antrag;
  const seite = dok.neueSeite();
  const s = new Schreiber(dok, { kopf: () => 0, unten: 20 });
  s.seite = seite;
  s.seitenAnzahl = 1;
  const X0 = RAND;
  const XR = A4[0] - RAND;

  // Wert auf einer Schreiblinie: fett, so klein wie nötig (nicht unter 9 pt); passt er auch dann nicht, steht er auf mehreren
  // Zeilen im Feld (nie abgeschnitten). Linie bei Grundlinie der letzten Zeile − 4,9. Ergebnis: Höhe der zusätzlichen Zeilen.
  const feld = (x0, x1, wert, b) => {
    const sicher = dok.sicher(wert, true);
    const breite = x1 - x0 - 6.8;
    let g = S;
    while (g > 9 && dok.breite(sicher, g) > breite) g -= 0.25;
    let extra = 0;
    if (dok.breite(sicher, g) <= breite) {
      seite.text(sicher, x0 + 3.4, b, g, { fett: true, nutzer: false });
    } else {
      const zeilen = s.umbruch(sicher, breite, 9, { fett: true });
      zeilen.forEach((z, i) => s.zeichneZeile(z, x0 + 3.4, b - i * LH, 9, {}));
      extra = (zeilen.length - 1) * LH;
    }
    seite.linie(x0, b - extra - 4.9, x1, b - extra - 4.9, 1.1, FARBE.tinte);
    return extra;
  };
  // Absatz im Blocksatz ab einer Grundlinie; Ergebnis: Grundlinie der letzten Zeile
  const absatzAb = (text, b) => {
    s.y = b + S * 0.92;
    s.absatz(text, { size: S, zeilenhoehe: 1.5, blocksatz: true, dehnung: 5, nach: 0 });
    return s.letzteBasis;
  };

  // Kopf: Wappen, Ort und Datum
  seite.wappen(X0, 805.5, 48.2);
  const ortDatum = ersetzePlatzhalter(t.ortDatum, { ort: d.verein.ort, datum: d.heuteDe });
  const blockB = Math.max(176, dok.breite(dok.sicher(ortDatum, true), S) + 8);
  seite.text(ortDatum, XR - blockB + 0.5, 714.5, S, { fett: true, nutzer: true });
  seite.linie(XR - blockB, 708.5, XR, 708.5, 1.1, FARBE.tinte);
  seite.textRechts(t.ortDatumLabel, XR, 697, 9, { farbe: FARBE.tinte3 });

  // Überschriften: Großbuchstaben mit weitem Buchstabenabstand in Vereinsblau
  let b = 648.9;
  const titelOpt = { fett: true, abstand: 1.6, farbe: FARBE.blau };
  const zeilen1 = s.umbruch(t.ueberschrift1.toLocaleUpperCase("de"), XR - X0, 10, titelOpt);
  zeilen1.forEach((z, i) => s.zeichneZeile(z, X0, b - i * 13.5, 10, titelOpt));
  b -= (zeilen1.length - 1) * 13.5 + 26.3;
  const zeilen2 = s.umbruch(t.ueberschrift2.toLocaleUpperCase("de"), XR - X0, 10, titelOpt);
  zeilen2.forEach((z, i) => s.zeichneZeile(z, X0, b - i * 13.5, 10, titelOpt));
  b -= (zeilen2.length - 1) * 13.5 + 46;

  // Anrede und erster Absatz
  seite.text(t.anrede, X0, b, S, {});
  b -= 28.3;
  b = absatzAb(t.absatz1, b);

  // Herr/Frau [Name], geb. am [Datum]
  b -= 29.3;
  const wHerr = dok.breite(t.herrFrau, S);
  const wGeb = dok.breite(t.gebAm, S);
  const datumB = 147.4;
  const gebX = XR - datumB - 5.7 - wGeb;
  seite.text(t.herrFrau, X0, b, S, {});
  const extraName = feld(X0 + wHerr + 5.7, gebX - 5.7, d.name, b);
  seite.text(t.gebAm, gebX, b, S, {});
  feld(XR - datumB, XR, d.geburt, b);
  b -= extraName;

  // wohnhaft [Anschrift]
  b -= 30.7;
  const wWohn = dok.breite(t.wohnhaft, S);
  seite.text(t.wohnhaft, X0, b, S, {});
  b -= feld(X0 + wWohn + 5.7, XR, d.adresse, b);
  b -= 15.9;
  seite.text(t.adresseLabel, X0, b, 9, { farbe: FARBE.tinte3 });

  // ist bei uns als [Funktion] ehrenamtlich und unentgeltlich tätig.
  b -= 28.1;
  const funktion = ersetzePlatzhalter(t.funktion, { rolle: d.rolleText, abteilung: d.abteilungText });
  const wIst = dok.breite(t.istBeiUnsAls, S);
  const wTaetig = dok.breite(t.taetig, S);
  const funktionB = Math.min(Math.max(147.4, dok.breite(funktion, S) + 8), XR - X0 - wIst - wTaetig - 11.4);
  seite.text(t.istBeiUnsAls, X0, b, S, {});
  const extraFunktion = feld(X0 + wIst + 5.7, X0 + wIst + 5.7 + funktionB, funktion, b);
  seite.text(t.taetig, X0 + wIst + 5.7 + funktionB + 5.7, b, S, {});
  b -= extraFunktion;

  // weitere Absätze
  b = absatzAb(t.absatz2, b - 29.4);
  b = absatzAb(t.absatz3, b - 29.3);
  b = absatzAb(t.absatz4, b - 28.7);

  // Schluss
  b -= 32.6;
  seite.text(t.dank, X0, b, S, {});
  b -= 28.8;
  seite.text(t.gruss, X0, b, S, {});

  // Fußblock: Verein, Unterzeichner (Name und Funktion aus der Konfiguration) und eine leere Linie hinter „i.A.“
  const blockBreite = 297.6;
  b -= 41.3;
  const wEV = dok.breite(t.eV, S);
  seite.linie(X0, b - 4.9, X0 + blockBreite - wEV - 7.1, b - 4.9, 1.1, FARBE.tinte);
  seite.text(d.verein.ohneEV, X0 + 3.4, b, S, { nutzer: false });
  seite.text(t.eV, X0 + blockBreite - wEV, b, S, {});
  b -= 37.9;
  seite.linie(X0, b - 4.9, X0 + blockBreite, b - 4.9, 1.1, FARBE.tinte);
  seite.text(d.verein.unterzeichner.name, X0 + 3.4, b, S, { nutzer: false });
  b -= 18.7;
  seite.text(d.verein.unterzeichner.funktion, X0, b, S, { nutzer: false });
  b -= 46.1;
  const iaX = X0 + 62.4;
  const wIA = seite.text(t.iA, iaX, b, S, {});
  seite.linie(iaX + wIA + 8.5, b - 4.4, iaX + 235.3, b - 4.4, 1.1, FARBE.tinte);
  return seite;
}

// Der Brief als eigenes PDF (Vorschau „Antrag ansehen“ vor dem Erstellen der Datei)
export async function baueAntrag(werkzeuge, d) {
  const dok = await Dokument.neu(werkzeuge);
  zeichneAntrag(dok, d);
  dok.setzeMetadaten({ titel: T.meta.titelAntrag, betreff: T.meta.betreffAntrag, ersteller: d.verein.name, heute: d.heute });
  return { bytes: await dok.speichern(), dok: dok };
}
