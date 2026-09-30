// ATTRAPPEN der Daten für tools/anmeldung-test/e2e.mjs: ersetzen
// data/anmeldung.json (AP-1) und data/anmeldung-formulare.json (AP-2), solange
// sie fehlen. Gehören nicht in die Auslieferung.

import { createHash } from "node:crypto";

// Kleine Vorlagen-PDFs (leere Seiten) mit echter Prüfsumme.
export async function baueVorlagen(PDFLib) {
  const vorlagen = {};
  for (const [schluessel, seiten] of Object.entries({ aufnahmeantrag: 4, hfv_antrag: 3, vollmacht: 1, abmeldung: 1, einverstaendnis_senioren: 1 })) {
    const doc = await PDFLib.PDFDocument.create();
    for (let i = 0; i < seiten; i++) doc.addPage([595, 842]);
    const bytes = Buffer.from(await doc.save());
    vorlagen[schluessel] = { bytes, sha256: createHash("sha256").update(bytes).digest("hex"), seiten };
  }
  return vorlagen;
}

export function baueFormulare(vorlagen) {
  const erlaubt = { aufnahmeantrag: "erlaubt", hfv_antrag: "nicht_erlaubt", vollmacht: "nicht_erlaubt", abmeldung: "nicht_erlaubt", einverstaendnis_senioren: "nicht_erlaubt" };
  const formulare = {};
  for (const [schluessel, v] of Object.entries(vorlagen)) {
    formulare[schluessel] = {
      datei: "assets/pdf/anmeldung/" + schluessel.replace(/_/g, "-") + ".pdf",
      quelle_url: "https://beispiel.invalid/" + schluessel,
      quelle_stand: "Attrappe",
      sha256: v.sha256,
      bytes: v.bytes.length,
      seiten: v.seiten,
      digitaleUnterschrift: erlaubt[schluessel],
      digitaleUnterschriftGrund: erlaubt[schluessel] === "erlaubt" ? "Vereinsformular, Schriftform nach Satzung (Attrappe)" : "Eigenhändige Unterschrift verlangt (Attrappe)",
    };
  }
  // Das Formular "datenschutz" gehört zum Aufnahmeantrag-Teil und ist digital erlaubt.
  formulare.datenschutz = { datei: null, digitaleUnterschrift: "erlaubt", digitaleUnterschriftGrund: "Information des Vereins (Attrappe)" };
  return { stand: "attrappe", formulare };
}

export function baueAnmeldung() {
  return {
    stand: "attrappe",
    saison: "2026/27",
    beitragsgruppen: {
      fussball_jugend: { abteilung: "fussball", bezeichnung: "Kinder und Jugendliche", jahr: 108, monat: 9 },
      fussball_erwachsene: { abteilung: "fussball", bezeichnung: "Erwachsene", jahr: 120, monat: 10 },
      fussball_passiv: { abteilung: "fussball", bezeichnung: "Passive, Frauen, Rentner", jahr: 84, monat: 7 },
      fussball_familie: { abteilung: "fussball", bezeichnung: "Familie", jahr: 180, monat: 15 },
      karneval_kinder: { abteilung: "karneval", bezeichnung: "Kinder und Jugendliche", jahr: 108, monat: 9 },
      karneval_erwachsene: { abteilung: "karneval", bezeichnung: "Erwachsene", jahr: 120, monat: 10 },
      karneval_familie: { abteilung: "karneval", bezeichnung: "Familie", jahr: 180, monat: 15 },
      karneval_senator: { abteilung: "karneval", bezeichnung: "Senatoren", jahr: 144, monat: null },
    },
    unterlagen: [
      { id: "U09", quelle: { dokument: "Attrappe Jugendordnung", stelle: "§ 9", stand: "2026" } },
      { id: "U10", quelle: "Attrappe Jugendordnung, Stand 2026" },
    ],
    fristen: { regeln: { R5: { quelle: "Attrappe Jugendordnung §§ 35, 38" }, R1: { quelle: "Attrappe Spielordnung § 91" } } },
    kontakte: {},
    offenePunkte: [],
  };
}
