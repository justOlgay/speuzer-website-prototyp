/*
  Die Blätter der Trainerunterlagen (Paket-PDF der Seite „Neu im Trainerteam“), jedes als eigene Funktion:
    deckblatt            Übersicht für die Geschäftsstelle (Stand der Abgabe)
    anmeldung            Anmeldung als beitragsfreies Mitglied (eigene Seite, siehe Hinweis unten)
    kontaktdatenblatt    Kontaktdatenblatt für Trainer und Betreuer (Felder und Gruppen des Vereinsformulars)
    selbstauskunft       Selbstauskunft und Selbstverpflichtung (Wortlaut ap3/BERICHT.md 3.3)
    kodex                Erklärung zum Verhaltenskodex (nur die Erklärung, kein Volltext)
    datenschutz          Information nach Art. 13 DSGVO
    passfoto             das Passfoto der Person (letzte Seite der Datei, nur wenn abgegeben; freiwillig)
    fusszeilen           „Seite x von y“ und Kennzeile auf allen Seiten (außer dem Brief, siehe trainer-pdf-antrag.js)
  Aussehen: A4, Wappen als Vektor, Liberation Sans, Vereinsblau, wie die Beispiel-Blätter (ap1/beispiele). Alle Texte stehen in
  trainer-pdf-texte.js.

  Anmeldung beitragsfrei: Der Aufnahmeantrag des Vereins (assets/pdf/anmeldung/vereinsanmeldung-9-2026.pdf, 4 Seiten) lässt sich
  für Trainer und Betreuer nicht sauber überlagern: Er kennt keine Beitragsgruppe „beitragsfrei“ (data/anmeldung.json › beitragsgruppen
  und der Vordruck haben nur Jugendliche, Erwachsene, Passive/Frauen/Rentner, Familie und die Karneval-Gruppen), Seite 2 nennt Beiträge
  und eine Aufnahmegebühr, Seite 4 ist das SEPA-Mandat. Darum eine eigene Seite im Stil der übrigen Blätter; welche Fassung der Verein
  verlangt, entscheidet der Vorstand.
*/

import { ersetzePlatzhalter } from "./hilfen.js";
import { A4, FARBE, FUSS_Y, RAND, Schreiber } from "./trainer-pdf-hilfen.js";
import { T, jahreText } from "./trainer-pdf-texte.js";

const BREITE = A4[0] - 2 * RAND;

// Einfacher Umbruch für Titel (ohne Schreiber)
function titelZeilen(dok, titel, breite, size) {
  const worte = dok.sicher(titel, false).split(/ +/).filter(Boolean);
  const zeilen = [];
  let zeile = "";
  for (const w of worte) {
    const probe = zeile ? zeile + " " + w : w;
    if (zeile && dok.breite(probe, size) > breite) {
      zeilen.push(zeile);
      zeile = w;
    } else {
      zeile = probe;
    }
  }
  if (zeile) zeilen.push(zeile);
  return zeilen;
}

// Kopf: Wappen, Titel in Vereinsblau und blaue Linie (wie die Beispiel-Blätter). Folgeseiten: kleiner Kopf mit „(Fortsetzung)“.
function kopfBauen(dok, titel, o) {
  const opt = o || {};
  return (seite, folge) => {
    if (!folge) {
      const gross = opt.titelGroesse || 16;
      seite.wappen(RAND, 805, 39.7);
      const xTitel = RAND + 39.7 + 17;
      const zeilen = titelZeilen(dok, titel, A4[0] - RAND - xTitel, gross);
      const mitte = 805 - 19.4;
      const hoehe = gross * 1.22;
      zeilen.forEach((z, i) => seite.text(z, xTitel, mitte + ((zeilen.length - 1) / 2 - i) * hoehe - gross * 0.33, gross, { farbe: FARBE.blau }));
      seite.linie(RAND, 756.5, A4[0] - RAND, 756.5, 1.4, FARBE.blau);
      return 740;
    }
    seite.wappen(RAND, 805, 26);
    seite.text(titel + " " + T.fuss.fortsetzung, RAND + 26 + 12, 788, 12, { farbe: FARBE.blau });
    seite.linie(RAND, 774, A4[0] - RAND, 774, 0.9, FARBE.blau);
    return 760;
  };
}

// ---------------------------------------------------------------------------
// Deckblatt
// ---------------------------------------------------------------------------

export function deckblatt(dok, d) {
  const t = T.deckblatt;
  const s = new Schreiber(dok, { kopf: kopfBauen(dok, t.titel, { titelGroesse: 18 }) });
  const seite = s.neueSeite();
  const x = RAND;
  const top = 722;

  // Steckbrief: Name, Mannschaft oder Gruppe, Rolle; rechts die Daten
  const padding = 23;
  const linksB = 280;
  let nameSize = 21;
  while (nameSize > 13 && dok.breite(dok.sicher(d.name, true), nameSize) > linksB) nameSize -= 1;
  const nameZeilen = s.umbruch([{ t: d.name, nutzer: true }], linksB, nameSize, { fett: true });
  const teamWert = d.mannschaft;
  const wertGroesse = 12;
  const w1 = Math.max(dok.breite(dok.sicher(d.teamLabel, false), 9), dok.breite(dok.sicher(teamWert, true), wertGroesse));
  const w2 = Math.max(dok.breite(t.rolle, 9), dok.breite(d.rolleText, wertGroesse));
  const nebeneinander = w1 + 26 + w2 <= linksB;
  const nameH = nameZeilen.length * nameSize * 1.2;
  const teamH = nebeneinander ? 33 : 66;
  const hoehe = Math.max(104, 20 + nameH + 6 + teamH + 22);
  seite.rechteck(x, top - hoehe, BREITE, hoehe, { fuellung: FARBE.flaeche, rand: FARBE.linie, randBreite: 0.85, radius: 5.7 });
  let by = top - 20;
  nameZeilen.forEach((z, i) => s.zeichneZeile(z, x + padding, by - nameSize * 0.92 - i * nameSize * 1.2, nameSize, {}));
  by -= nameH + 6;
  const block = (label, wert, bx, byo, nutzer) => {
    seite.text(label, bx, byo - 9 * 0.92, 9, { farbe: FARBE.tinte3 });
    seite.text(wert, bx, byo - 9 * 0.92 - 15, wertGroesse, { nutzer: nutzer });
  };
  block(d.teamLabel, teamWert, x + padding, by, true);
  if (nebeneinander) block(t.rolle, d.rolleText, x + padding + w1 + 26, by, false);
  else block(t.rolle, d.rolleText, x + padding, by - 33, false);
  const datenX = x + 313;
  const mitteY = top - hoehe / 2;
  [ersetzePlatzhalter(t.daBeiSeit, { datum: d.seitDe }), ersetzePlatzhalter(t.faelligAm, { datum: d.faelligDe }), ersetzePlatzhalter(t.erstelltAm, { datum: d.heuteDe })].forEach((z, i) =>
    seite.text(z, datenX, mitteY - 3.9 + (1 - i) * 21, 11, {})
  );

  // Tabelle „Stand der Abgabe“: Symbol und Wort (nicht nur Farbe)
  s.y = top - hoehe - 34;
  seite.text(t.tabelleTitel, x, s.y - 13 * 0.92, 13, { fett: true, farbe: FARBE.blau });
  s.y -= 13 * 1.25 + 4;
  seite.linie(x, s.y, x + BREITE, s.y, 0.85, FARBE.linie);
  const zeilen = [
    { erledigt: true, text: t.anmeldung },
    { erledigt: true, text: t.kontakt },
    { erledigt: true, text: t.selbstauskunft },
    { erledigt: true, text: t.kodex },
    { erledigt: !!d.hatFoto, text: d.hatFoto ? t.foto : t.fotoOffen },
    { erledigt: false, text: ersetzePlatzhalter(d.zeugnis === "beantragen" ? t.zeugnisBeantragen : t.zeugnisVorhanden, { kurz: d.einsichtKurz, seite: d.hatFoto ? t.antragSeiteMitFoto : t.antragSeiteOhneFoto }) },
  ];
  const textX = x + 113.7;
  const textB = BREITE - 113.7 - 5.7;
  const zh = 11.5 * 1.4;
  for (const z of zeilen) {
    const umb = s.umbruch(z.text, textB, 11.5, {});
    const h = umb.length * zh + 23.8;
    const unten = s.y - h;
    if (!z.erledigt) seite.rechteck(x, unten, BREITE, h, { fuellung: FARBE.flaeche });
    seite.linie(x, unten, x + BREITE, unten, 0.85, FARBE.linie);
    const my = unten + h / 2;
    if (z.erledigt) {
      seite.kreis(x + 13.2, my, 7.5, { fuellung: FARBE.blau });
      seite.haken(x + 13.2, my, 15, FARBE.weiss, 1.6);
    } else {
      seite.kreis(x + 13.2, my, 6.9, { fuellung: FARBE.weiss, rand: FARBE.tinte3, randBreite: 1.6 });
    }
    seite.text(z.erledigt ? t.markeErledigt : t.markeOffen, x + 26.9, my - 10 * 0.33, 10, { farbe: z.erledigt ? FARBE.tinte3 : FARBE.tinte, fett: !z.erledigt });
    umb.forEach((u, i) => s.zeichneZeile(u, textX, s.y - 11.9 - 11.5 * 0.92 - i * zh, 11.5, {}));
    s.y = unten;
  }

  // Hinweis zur fehlenden Vereinsunterschrift (nur mit Antrag)
  s.y -= 28;
  if (d.zeugnis === "beantragen") s.hinweisKasten(t.hinweis, { size: 11.5 });

  // Einsicht, Alter und Löschung des Zeugnisses (Begleitsätze nach GEMEINSAM.md 3; Namensteil aus trainer-einsicht.js)
  const e = T.einsicht;
  s.y -= 6;
  s.ueberschrift(e.titel, 3);
  s.absatz([{ t: ersetzePlatzhalter(e.leadPerson, { namen: d.einsichtLang }) + " " + e.angeschaut + " " + e.notiert }], { size: 10.5, nach: 4 });
  const frist = [e.alter];
  if (d.zeugnisJahre) frist.push(ersetzePlatzhalter(e.erneuern, { jahre: jahreText(d.zeugnisJahre) }));
  s.absatz(frist.join(" "), { size: 10.5, nach: 4 });
  s.absatz(e.loeschen, { size: 10.5, nach: 0 });
}

// ---------------------------------------------------------------------------
// Anmeldung als beitragsfreies Mitglied
// ---------------------------------------------------------------------------

export function anmeldung(dok, d, sig) {
  const t = T.anmeldung;
  const s = new Schreiber(dok, { kopf: kopfBauen(dok, t.titel) });
  s.neueSeite();
  s.absatz(ersetzePlatzhalter(t.einleitung, { verein: d.verein.nameRegister }), { size: 11, nach: 4 });

  s.ueberschrift(t.einsatzTitel, 4);
  s.raster([
    { label: t.abteilung, wert: d.abteilungText, s: 2, nutzer: false },
    { label: d.teamLabel, wert: d.mannschaft, s: 2 },
    { label: t.rolle, wert: d.rolleText, s: 2, nutzer: false },
  ]);
  s.raster([
    { label: t.beitragsgruppe, wert: t.beitragsgruppeWert, s: 3, nutzer: false },
    { label: t.seit, wert: d.seitDe, s: 3, nutzer: false },
  ]);

  s.ueberschrift(t.angabenTitel, 4);
  s.raster([
    { label: t.nachname, wert: d.nachname, s: 3 },
    { label: t.vorname, wert: d.vorname, s: 3 },
  ]);
  s.raster([
    { label: t.strasse, wert: d.strasse, s: 3 },
    { label: t.plzOrt, wert: d.plz + " " + d.ort, s: 3 },
  ]);
  s.raster([
    { label: t.geburtsdatum, wert: d.geburt, s: 2, nutzer: false },
    { label: t.mobil, wert: d.handy, s: 4 },
  ]);
  s.raster([{ label: t.email, wert: d.email, s: 6 }]);

  s.ueberschrift(t.erklaerungenTitel, 4);
  s.kaestchenZeile(true, t.satzung, { size: 10.5 });
  s.absatz(t.datenschutz, { size: 10.5, nach: 14 });

  s.unterschriftBlock({ sig: sig, ortDatum: ersetzePlatzhalter(t.ortDatum, { ort: d.verein.ort, datum: d.heuteDe }), labelLinks: t.ortDatumLabel, labelRechts: t.unterschriftLabel });
}

// ---------------------------------------------------------------------------
// Kontaktdatenblatt
// ---------------------------------------------------------------------------

export function kontaktdatenblatt(dok, d, sig) {
  const t = T.kontakt;
  const s = new Schreiber(dok, { kopf: kopfBauen(dok, t.titel), unten: 54 });
  s.neueSeite();

  s.ueberschrift(t.persoenlich, 4);
  s.raster([
    { label: t.vorname, wert: d.vorname, s: 2 },
    { label: t.nachname, wert: d.nachname, s: 2 },
    { label: t.geburtsdatum, wert: d.geburt, s: 2, nutzer: false },
  ]);
  s.absatz([{ t: t.adresse, fett: true, farbe: FARBE.blau }], { size: 10, nach: 4 });
  s.raster([
    { label: t.strasse, wert: d.strasse, s: 2 },
    { label: t.plz, wert: d.plz, s: 1 },
    { label: t.ort, wert: d.ort, s: 3 },
  ]);
  s.raster([
    { label: t.mobil, wert: d.handy, s: 3 },
    { label: t.email, wert: d.email, s: 3 },
  ]);

  s.ueberschrift(t.notfallkontakt, 4);
  s.raster([
    { label: t.notfallName, wert: d.notfall.name, s: 2 },
    { label: t.notfallBeziehung, wert: d.notfall.beziehung, s: 2 },
    { label: t.notfallTelefon, wert: d.notfall.telefon, s: 2 },
  ]);

  // Erfahrung und Qualifikationen sowie der Erste-Hilfe-Kurs sind freiwillig: Ohne Angabe bleiben Feld und Kästchen leer.
  s.ueberschrift(t.qualifikationen, 4);
  s.raster([{ label: t.erfahrungen, wert: d.erfahrung, s: 6, kasten: true }]);

  // Erste-Hilfe-Kurs: ein Kästchen „Ja, absolviert am“ mit Datum
  s.platz(12 + 24 + 10);
  s.seite.text(t.ersteHilfe, s.x, s.y - 9 * 0.92, 9, { farbe: FARBE.tinte3 });
  s.y -= 9 * 1.22 + 4;
  s.seite.kaestchen(s.x, s.y - 12.5, 12.5, !!d.ersteHilfeAm);
  const lx = s.x + 12.5 + 6.8;
  const breite = s.seite.text(t.ersteHilfeJa, lx, s.y - 10.5 * 0.92 - 1.2, 10.5, {});
  const fx = lx + breite + 6.8;
  s.seite.linie(fx, s.y - 14.5, fx + 96.4, s.y - 14.5, 0.9, FARBE.tinte);
  if (d.ersteHilfeAm) s.seite.text(d.ersteHilfeAm, fx + 2.8, s.y - 10.5, 10.5, {});
  s.y -= 24 + 4;

  // Trainerausstattung (freiwillig, seit 26.11.2026): Der Abschnitt steht nur, wenn mindestens eine Größe angegeben ist, und zeigt nur die angegebenen
  // Größen: je Artikel ein Feld wie bei den übrigen Angaben (Beschriftung darüber, Größe auf der Linie), von links nach rechts; die Felder haben
  // immer dieselbe Breite (vier passen in eine Zeile). Ohne Angabe bleibt das Blatt, wie es war: kein Abschnitt, keine leere Zeile.
  if (d.ausstattung.length) {
    s.ueberschrift(T.ausstattung.abschnitt, 4);
    s.raster(d.ausstattung.map((x) => ({ label: x.artikel, wert: x.groesse, s: 1.5, nutzer: false })));
  }

  // Verfügbarkeit: vier Spalten zum Ankreuzen
  s.ueberschrift(t.verfuegbarkeit, 4);
  s.platz(2 * 20 + 6);
  T.tage.forEach(([code, name], i) => {
    const spalte = i % 4;
    const reihe = Math.floor(i / 4);
    const px = s.x + spalte * 118;
    const py = s.y - reihe * 20;
    s.seite.kaestchen(px, py - 12.5, 12.5, d.tage.includes(code));
    s.seite.text(name, px + 12.5 + 6.8, py - 10.5 * 0.92 - 1.2, 10.5, {});
  });
  s.y -= 2 * 20 + 2;

  s.ueberschrift(t.anmerkungen, 4);
  s.raster([{ label: "", wert: "", s: 6, kasten: true }], { nach: 12 });

  // Unterschrift der Person und Datum
  const hoeheSig = 46;
  s.platz(hoeheSig + 30);
  const yLinie = s.y - 9 * 1.22 - hoeheSig - 2;
  const datumB = 147.4;
  const sigB = BREITE - datumB - 28;
  s.seite.text(t.unterschrift, s.x, s.y - 9 * 0.92, 9, { farbe: FARBE.tinte3 });
  s.seite.unterschrift(sig, s.x + 6, yLinie + 2, sigB - 12, hoeheSig - 2);
  s.seite.linie(s.x, yLinie, s.x + sigB, yLinie, 0.9, FARBE.tinte);
  const dx = s.x + BREITE - datumB;
  s.seite.text(t.datum, dx, s.y - 9 * 0.92, 9, { farbe: FARBE.tinte3 });
  s.seite.text(d.heuteDe, dx + 2.8, yLinie + 4, 10.5, {});
  s.seite.linie(dx, yLinie, dx + datumB, yLinie, 0.9, FARBE.tinte);
  s.y = yLinie - 10;
}

// ---------------------------------------------------------------------------
// Selbstauskunft und Selbstverpflichtung (Wortlaut ap3/BERICHT.md 3.3)
// ---------------------------------------------------------------------------

export function selbstauskunft(dok, d, sig) {
  const t = T.selbstauskunft;
  const s = new Schreiber(dok, { kopf: kopfBauen(dok, t.titel) });
  s.neueSeite();
  s.absatz(ersetzePlatzhalter(t.an, { verein: d.verein.kurzEV }), { size: 11, nach: 8 });
  s.raster([
    { label: t.name, wert: d.name, s: 4 },
    { label: t.geburtsdatum, wert: d.geburt, s: 2, nutzer: false },
  ], { nach: 14 });
  s.liste(t.punkte, { marker: "nummer", size: 11, nach: 9, zeilenhoehe: 1.4 });
  s.y -= 4;
  s.hinweisKasten(t.hinweis, { size: 11, nach: 22 });
  s.unterschriftBlock({ sig: sig, ortDatum: ersetzePlatzhalter(t.ortDatum, { ort: d.verein.ort, datum: d.heuteDe }), labelLinks: t.ortDatumLabel, labelRechts: t.unterschriftLabel });
}

// ---------------------------------------------------------------------------
// Erklärung zum Verhaltenskodex
// ---------------------------------------------------------------------------

export function kodex(dok, d, sig) {
  const t = T.kodex;
  const s = new Schreiber(dok, { kopf: kopfBauen(dok, t.titel) });
  s.neueSeite();
  s.absatz(t.lead, { size: 11, nach: 6 });
  s.absatz(t.quelle, { size: 10.5, farbe: FARBE.tinte3, nach: 16 });
  s.kaestchenZeile(true, t.erklaerung, { size: 12, seite: 12, nach: 18 });
  s.raster([
    { label: t.name, wert: d.name, s: 4 },
    { label: t.geburtsdatum, wert: d.geburt, s: 2, nutzer: false },
  ]);
  s.raster([{ label: t.verein, wert: d.verein.nameRegister, s: 6 }], { nach: 16 });
  s.unterschriftBlock({ sig: sig, ortDatum: ersetzePlatzhalter(t.ortDatum, { ort: d.verein.ort, datum: d.heuteDe }), labelLinks: t.ortDatumLabel, labelRechts: t.unterschriftLabel });
}

// ---------------------------------------------------------------------------
// Information nach Art. 13 DSGVO
// ---------------------------------------------------------------------------

// Anschriftszeilen des Vereins wie pdf.js › vereinAnschrift (Postfach und Besuchsadresse, soweit in der Konfiguration)
function anschriftZeilen(an) {
  const text = (x) => (x === undefined || x === null ? "" : String(x).trim());
  const zeilen = [];
  if (text(an.postfach)) zeilen.push("Postanschrift: " + [text(an.postfach), [text(an.postfachPlz), text(an.postfachOrt)].filter(Boolean).join(" ")].filter(Boolean).join(", "));
  if (text(an.strasse)) zeilen.push("Besuchsadresse: " + [text(an.strasse), [text(an.plz), text(an.ort)].filter(Boolean).join(" ")].filter(Boolean).join(", "));
  return zeilen;
}

export function datenschutz(dok, d) {
  const t = T.datenschutz;
  const s = new Schreiber(dok, { kopf: kopfBauen(dok, t.titel) });
  s.neueSeite();
  const g = { size: 9.5, nach: 4 };
  s.absatz(t.untertitel, { size: 10, farbe: FARBE.tinte3, nach: 4 });
  s.absatz([{ t: ersetzePlatzhalter(t.person, { name: d.name, geburt: d.geburt }), nutzer: true }], { size: 9.5, nach: 2 });

  s.ueberschrift(t.verantwortlichTitel, 3);
  s.absatz(ersetzePlatzhalter(t.verantwortlich, { verein: d.verein.nameRegister }), g);
  anschriftZeilen(d.verein.anschrift).forEach((z) => s.absatz(z, Object.assign({}, g, { nach: 1.5 })));
  s.absatz(d.verein.mail ? ersetzePlatzhalter(t.kontakt, { mail: d.verein.mail }) : t.kontaktOhneMail, g);

  s.ueberschrift(t.datenTitel, 3);
  s.liste(t.daten, { size: 9.5, nach: 2 });

  s.ueberschrift(t.zweckTitel, 3);
  s.tabelle([{ w: 52, titel: t.zweckSpalten[0] }, { w: 48, titel: t.zweckSpalten[1] }], t.zweck, { size: 9 });

  s.ueberschrift(t.empfaengerTitel, 3);
  const e = T.einsicht;
  const einsicht = [ersetzePlatzhalter(e.leadDu, { namen: d.einsichtLang }), e.angeschaut, e.notiert].join(" ");
  s.liste(
    t.empfaenger.map((z) => (z.indexOf("{einsichtLead}") >= 0 ? einsicht : z)),
    { size: 9.5, nach: 2 }
  );

  s.ueberschrift(t.speicherTitel, 3);
  s.liste(t.speicher, { size: 9.5, nach: 2 });

  s.ueberschrift(t.rechteTitel, 3);
  s.absatz(t.rechte, g);

  s.ueberschrift(t.beschwerdeTitel, 3);
  s.absatz(t.beschwerde, g);

  s.ueberschrift(t.pflichtTitel, 3);
  s.absatz(t.pflicht, g);

  s.ueberschrift(t.dritteTitel, 3);
  s.absatz(t.dritte, g);

  s.ueberschrift(t.entstehungTitel, 3);
  s.absatz(t.entstehung, g);
}

// ---------------------------------------------------------------------------
// Passfoto: letzte Seite der Datei
// ---------------------------------------------------------------------------

// Das Foto der Person, wie es die Seite abgegeben hat (JPEG, unverändert eingebettet), 60 × 80 mm groß (im Seitenverhältnis des Fotos);
// darunter ihr Name. Die Geschäftsstelle bekommt das Foto so in derselben Datei wie die Unterlagen.
export function passfoto(dok, d, foto) {
  const t = T.passfoto;
  const s = new Schreiber(dok, { kopf: kopfBauen(dok, t.titel) });
  const seite = s.neueSeite();
  const oben = s.y - 6;
  const groesse = seite.foto(foto, RAND, oben, 170.1, 226.8);
  seite.text(ersetzePlatzhalter(t.zeile, { name: d.name }), RAND, oben - groesse.h - 22, 11, { nutzer: true });
}

// ---------------------------------------------------------------------------
// Fußzeilen: Kennzeile links, „Seite x von y“ rechts (Fußzeilen dürfen kleiner als 9 pt sein)
// ---------------------------------------------------------------------------

// o.ohne: Seiten (Rückgabe von neueSeite), die keine Fußzeile bekommen (der Brief des Vereins), aber mitgezählt werden
export function fusszeilen(dok, d, o) {
  const ohne = (o && o.ohne) || [];
  const gesamt = dok.seiten.length;
  const links = ersetzePlatzhalter(T.fuss.links, { verein: d.verein.name, name: d.name });
  dok.seiten.forEach((seite, i) => {
    if (ohne.includes(seite)) return;
    seite.text(links, RAND, FUSS_Y, 8, { farbe: FARBE.tinte3, fuss: true, nutzer: true });
    seite.textRechts(ersetzePlatzhalter(T.fuss.seite, { nr: i + 1, gesamt: gesamt }), A4[0] - RAND, FUSS_Y, 8, { farbe: FARBE.tinte3, fuss: true });
  });
}
