/*
  ATTRAPPE des PDF-Bausteins – nur für tools/anmeldung-test/e2e.mjs.

  Ersetzt assets/js/anmeldung/pdf.js (Paket AP-3), solange es fehlt. Gleiche
  Schnittstelle (SCHNITTSTELLEN Abschnitt 7): benoetigteVorlagen(e) und
  erzeugePdf(opts). Das PDF hat nur eine Kurzfassung der Angaben und die
  eingesetzten Unterschriften – genug, um zu prüfen, dass die Oberfläche alles
  richtig übergibt. Was erzeugePdf() bekommen hat, legt die Attrappe in
  window.__attrappePdf ab, damit der E2E-Test es prüfen kann.
*/

const VORLAGEN = ["aufnahmeantrag", "hfv_antrag", "vollmacht", "abmeldung", "einverstaendnis_senioren"];

export function benoetigteVorlagen(e) {
  return (e.formulare || []).filter((f) => VORLAGEN.includes(f));
}

const PNG_KOPF = [137, 80, 78, 71, 13, 10, 26, 10];

function istPng(bytes) {
  return PNG_KOPF.every((b, i) => bytes[i] === b);
}

export async function erzeugePdf(opts) {
  const { PDFLib, fontkit, schrift, vorlagen, a, e, bilder } = opts;
  window.__attrappePdf = {
    vorlagen: Object.fromEntries(Object.entries(vorlagen).map(([k, v]) => [k, v.length])),
    schriftBytes: schrift.length,
    hatFontkit: !!fontkit,
    a: JSON.parse(JSON.stringify(a)),
    formulare: e.formulare,
    unterschriften: Object.fromEntries(Object.entries(bilder.unterschriften || {}).map(([k, u]) => [k, { bytes: u.bytes.length, png: istPng(u.bytes), breitePx: u.breitePx, hoehePx: u.hoehePx, pixelBreite: new DataView(u.bytes.buffer, u.bytes.byteOffset, u.bytes.byteLength).getUint32(16), pixelHoehe: new DataView(u.bytes.buffer, u.bytes.byteOffset, u.bytes.byteLength).getUint32(20) }])),
    nachweise: Object.fromEntries(Object.entries(bilder.nachweise || {}).map(([k, l]) => [k, l.map((x) => ({ typ: x.typ, bytes: x.bytes.length, name: x.name }))])),
    spielerfoto: bilder.spielerfoto ? { typ: bilder.spielerfoto.typ, bytes: bilder.spielerfoto.bytes.length } : null,
  };
  const doc = await PDFLib.PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(schrift, { subset: true });
  const seite = () => doc.addPage([595, 842]);
  let p = seite();
  let y = 800;
  const zeile = (text, groesse) => {
    p.drawText(text, { x: 50, y, size: groesse || 11, font });
    y -= (groesse || 11) + 6;
  };
  zeile("Teil A – Für Sie (Attrappe)", 16);
  zeile("Name: " + a.vorname + " " + a.nachname);
  zeile("Formulare: " + (e.formulare || []).join(", "));
  const teilB = doc.getPageCount() + 1;
  p = seite();
  y = 800;
  zeile("Teil B – Für den Verein (Attrappe)", 16);
  for (const [wer, u] of Object.entries(bilder.unterschriften || {})) {
    const bild = await doc.embedPng(u.bytes);
    const faktor = Math.min(200 / u.breitePx, 60 / u.hoehePx, 0.6);
    zeile("Unterschrift " + wer + ":");
    y -= 50;
    p.drawImage(bild, { x: 50, y, width: u.breitePx * faktor, height: u.hoehePx * faktor });
    y -= 20;
  }
  const teile = [
    { teil: "A", titel: "Für Sie", vonSeite: 1, bisSeite: 1 },
    { teil: "B", titel: "Für den Verein", vonSeite: teilB, bisSeite: doc.getPageCount() },
  ];
  if (a.gesundheitsbogen === true) {
    p = seite();
    y = 800;
    zeile("Teil C – Vertraulich, getrennt abgeben (Attrappe)", 16);
    teile.push({ teil: "C", titel: "Vertraulich – getrennt abgeben", vonSeite: doc.getPageCount(), bisSeite: doc.getPageCount() });
  }
  const bytes = await doc.save();
  const teil = (s) => String(s || "x").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]+/g, "-");
  const ergebnis = { bytes, seiten: doc.getPageCount(), teile, dateiname: "Anmeldung_" + teil(a.nachname) + "_" + teil(a.vorname) + ".pdf" };
  window.__attrappePdf.ergebnis = { seiten: ergebnis.seiten, teile: ergebnis.teile, dateiname: ergebnis.dateiname };
  return ergebnis;
}
