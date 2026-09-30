/*
  ATTRAPPE der Regeltexte – nur für tools/anmeldung-test/e2e.mjs.
  Ersetzt assets/js/anmeldung/texte/de-regeln.js (Paket AP-1), solange es fehlt.
*/

export default {
  unterlagen: {
    U09: { name: "Geburtsurkunde", kurz: "Kopie der Geburtsurkunde Ihres Kindes.", warum: "Der Verband verlangt sie bei der ersten Anmeldung.", wie: "Fotografieren Sie die Urkunde.", wo: "Sie haben sie zu Hause." },
    U10: { name: "Bescheinigung vom Arzt", kurz: "Der Arzt bestätigt: Ihr Kind darf Fußball spielen.", warum: "Das verlangt der Fußball-Verband.", wie: "Nehmen Sie unsere Vorlage mit zum Arzt.", wo: "Jeder Arzt reicht." },
    U12: { name: "Kopie vom Pass", kurz: "Ein Foto vom Pass oder Aufenthaltsdokument.", warum: "Bei Kindern ab 10 Jahren ohne deutschen Pass nötig.", wie: "Fotografieren Sie die Seite mit Foto.", wo: "" },
    U13: { name: "Meldebescheinigung", kurz: "Sie zeigt: Sie wohnen mit Ihrem Kind in Deutschland.", warum: "Der Verband prüft den Wohnort.", wie: "Das Bürgeramt stellt sie aus.", wo: "Bürgeramt oder online" },
    U17: { name: "Beleg vom Einschreiben", kurz: "Der Einlieferungsbeleg der Post.", warum: "Er zeigt den Tag der Abmeldung.", wie: "Fotografieren Sie den Beleg.", wo: "" },
    U18: { name: "Vollmacht", kurz: "Sie erlauben uns, Ihr Kind abzumelden.", warum: "", wie: "", wo: "" },
    U28: { name: "Gesundheitsbogen", kurz: "Freiwillige Angaben zur Gesundheit.", warum: "", wie: "", wo: "" },
  },
  hinweise: {
    abmeldung_mail: "Eine Mail an den alten Verein reicht nicht. Schicken Sie ein Einschreiben.",
    vollmacht_tag: "Mit der Vollmacht meldet der Verein am selben Tag ab.",
    erst_spielen_wenn_recht: "{name} darf trainieren. Spielen darf {name} erst, wenn der Verband Ja sagt.",
    international_dauer: "Ein Wechsel aus dem Ausland dauert länger.",
    versicherung_probetraining: "Ohne Mitgliedschaft ist Ihr Kind beim Probetraining nicht versichert.",
  },
  faelle: { F01: "Nur Karneval", F02: "Nur unterstützen", F03: "Fußball, neu", F06: "Wechsel im Verband" },
  weiterleitung: { keine_mannschaft: "Für diesen Jahrgang gibt es keine Mannschaft. Die Jugendleitung meldet sich." },
  frist: { wartefrist: "Bei Pflichtspielen darf Ihr Kind ab {pflichtspieleAb} mitspielen.", keine_frist: "" },
  mannschaft: { keine_mannschaft: "Sie können trotzdem mit uns sprechen." },
  beitrag: {},
};
