/*
  Alle Wortlaute der PDF-Dateien der Seite „Neu im Trainerteam“ an einer Stelle (trainer-pdf.js und die Blatt-Module lesen nur
  diese Datei; sichtbare Texte stehen nirgends sonst).

  Quellen und Markierungen (im Quelltext steht hinter dem Text ein Kommentar mit demselben Wort)
    WORTLAUT_QUELLE   wörtlich aus dem Entwurf (ap1/texte.mjs) oder dem Brief des Vereins: nicht ändern
    WORTLAUT_AP3      Wortlaut der Faktenprüfung (ap3/BERICHT.md, Abschnitt 3.3 Selbstauskunft): nicht ändern
    EINSICHT          Sätze zur Einsicht nach GEMEINSAM.md Abschnitt 3 (pronomenfrei, Namensteil aus trainer-einsicht.js)
    PRUEFEN_RECHT     eigener Wortlaut zu Datenschutz oder Form, vom Vorstand oder Datenschutzbeauftragten zu bestätigen
  Platzhalter in geschweiften Klammern setzt der Aufrufer ein (ersetzePlatzhalter aus hilfen.js).

  Anrede: Die Blätter, die die Person unterschreibt, sprechen in der ersten Person („Ich …“). Die Information nach Art. 13 spricht
  die Person mit „du“ an (wie die Bildschirme der Seite); das Vorbild (pdf.js) siezt.
*/

export const T = {
  rollen: { trainer: "Trainer", "co-trainer": "Co-Trainer", betreuer: "Betreuer", torwarttrainer: "Torwarttrainer" }, // WORTLAUT_QUELLE (ap1/texte.mjs › einsatz.rollen)
  abteilungen: { fussball: "Fußball", karneval: "Karneval" }, // WORTLAUT_QUELLE
  // Bei Karneval heißt die Auswahl „Gruppe“ (GEMEINSAM.md 4.1)
  teamLabel: { fussball: "Mannschaft", karneval: "Gruppe" },
  tage: [
    ["mo", "Montags"],
    ["di", "Dienstags"],
    ["mi", "Mittwochs"],
    ["do", "Donnerstags"],
    ["fr", "Freitags"],
    ["sa", "Samstags"],
    ["so", "Sonntags"],
  ], // WORTLAUT_QUELLE (ap1/texte.mjs › blaetter.kontaktdatenblatt.tage)

  // ---------- Einsicht (EINSICHT): pronomenfreie Sätze; {namen} ist einsichtNamen(konfig, "lang") ----------
  einsicht: {
    titel: "So läuft die Einsicht",
    leadPerson: "Die Person zeigt das Zeugnis persönlich {namen}.",
    leadDu: "Du zeigst das Zeugnis persönlich {namen}.",
    angeschaut: "Das Zeugnis wird nur angeschaut: Es wird nicht mitgenommen und nicht kopiert.",
    notiert: "Notiert werden nur: Datum der Einsicht, Datum des Zeugnisses und ob eine einschlägige Verurteilung darin steht (ja oder nein).",
    // Frist- und Löschhinweise (ap3/BERICHT.md, A4 und A10)
    alter: "Das Zeugnis darf bei der Einsicht höchstens drei Monate alt sein.",
    erneuern: "Nach {jahre} zeigt die Person ein neues.",
    loeschen: "Der Verein löscht die Vermerke unverzüglich, wenn die Tätigkeit nicht aufgenommen wird, sonst spätestens sechs Monate nach der letzten Ausübung der Tätigkeit.",
  },

  // ---------- Deckblatt (WORTLAUT_QUELLE: ap1/texte.mjs › blaetter.deckblatt; Zeile „Führungszeugnis“ nach dem Auftrag T2) ----------
  deckblatt: {
    titel: "Trainerunterlagen – Übersicht",
    rolle: "Rolle",
    daBeiSeit: "Dabei seit {datum}",
    faelligAm: "Unterlagen fällig am {datum}",
    erstelltAm: "Erstellt am {datum}",
    tabelleTitel: "Stand der Abgabe",
    markeErledigt: "erledigt",
    markeOffen: "offen",
    anmeldung: "Anmeldung (beitragsfrei), unterschrieben",
    kontakt: "Kontaktdatenblatt",
    selbstauskunft: "Selbstauskunft, unterschrieben",
    kodex: "Verhaltenskodex, unterschrieben",
    foto: "Passfoto (letzte Seite)",
    fotoOffen: "Passfoto: nicht abgegeben (freiwillig)",
    antragSeiteMitFoto: "vorletzte Seite", // der Brief steht vor dem Passfoto
    antragSeiteOhneFoto: "letzte Seite", // ohne Passfoto ist der Brief die letzte Seite der Datei
    zeugnisBeantragen: "Erweitertes Führungszeugnis: Antrag auf Gebührenbefreiung ({seite}); Einsicht bei {kurz} steht aus", // EINSICHT
    zeugnisVorhanden: "Erweitertes Führungszeugnis: liegt der Person vor; Einsicht bei {kurz} steht aus", // EINSICHT
    hinweis: "Die Unterschrift des Vereins auf dem Antrag auf Gebührenbefreiung fehlt noch.",
  },

  // ---------- Anmeldung als beitragsfreies Mitglied (eigene Seite; PRUEFEN_RECHT: Form noch mit dem Vorstand abstimmen) ----------
  anmeldung: {
    titel: "Anmeldung als Mitglied (beitragsfrei)",
    einleitung: "Ich bitte um Aufnahme in den {verein} als beitragsfreies Mitglied.", // PRUEFEN_RECHT
    angabenTitel: "Angaben zur Person",
    einsatzTitel: "Einsatz im Verein",
    abteilung: "Abteilung",
    rolle: "Rolle",
    seit: "Dabei seit",
    beitragsgruppe: "Beitragsgruppe",
    beitragsgruppeWert: "Trainer/Betreuer, beitragsfrei", // Auftrag T2
    nachname: "Nachname",
    vorname: "Vorname",
    geburtsdatum: "Geburtsdatum",
    strasse: "Straße und Haus-Nr.",
    plzOrt: "PLZ und Wohnort",
    mobil: "Telefon (mobil)",
    email: "E-Mail",
    erklaerungenTitel: "Erklärungen",
    // Satz und Fundort wie auf dem Aufnahmeantrag des Vereins (vereinsanmeldung-9-2026.pdf, Seite 1); ohne den Zusatz zur Abmeldung,
    // den die Person am Bildschirm nicht bestätigt hat (Bildschirm 11: „Ich habe die Satzung zur Kenntnis genommen.“)
    satzung: "Ich habe die Satzung des Vereins (einsehbar unter www.sportfreunde04.de, Verein, Downloads) zur Kenntnis genommen.",
    datenschutz: "Datenschutz: Wie der Verein meine Daten verarbeitet, steht in der Information nach Artikel 13 DSGVO in dieser Datei.", // PRUEFEN_RECHT
    ortDatum: "{ort}, {datum}",
    ortDatumLabel: "Ort, Datum",
    unterschriftLabel: "Unterschrift",
  },

  // ---------- Kontaktdatenblatt (WORTLAUT_QUELLE: ap1/texte.mjs › blaetter.kontaktdatenblatt; Felder und Gruppen des Vereinsformulars) ----------
  kontakt: {
    titel: "Kontaktdatenblatt für Trainer und Betreuer",
    persoenlich: "Persönliche Angaben",
    vorname: "Vorname",
    nachname: "Nachname",
    geburtsdatum: "Geburtsdatum",
    adresse: "Adresse",
    strasse: "Straße",
    plz: "PLZ",
    ort: "Ort",
    mobil: "Telefonnummer (mobil)",
    email: "E-Mail-Adresse",
    notfallkontakt: "Notfallkontakt (freiwillig)",
    notfallName: "Name des Notfallkontakts",
    notfallBeziehung: "Beziehung zum Trainer/Betreuer",
    notfallTelefon: "Telefonnummer des Notfallkontakts",
    // Seit 25.11.2026 ein freiwilliger Abschnitt: ein Feld statt Beruf, Erfahrungen und sonstigen Qualifikationen, der Erste-Hilfe-Kurs nur als „Ja, absolviert am“
    qualifikationen: "Erfahrung und Qualifikationen (freiwillig)",
    erfahrungen: "Erfahrung als Trainer/Betreuer, Lizenzen, Fortbildungen",
    ersteHilfe: "Erste-Hilfe-Kurs (freiwillig)",
    ersteHilfeJa: "Ja, absolviert am:",
    verfuegbarkeit: "Verfügbarkeit (bitte ankreuzen)",
    anmerkungen: "Zusätzliche Informationen / Anmerkungen",
    unterschrift: "Unterschrift Trainer/Betreuer",
    datum: "Datum",
  },

  // ---------- Selbstauskunft (WORTLAUT_AP3: ap3/BERICHT.md, Abschnitt 3.3; bis zur Abstimmung mit dem Vorstand nutzbar) ----------
  // Bildschirm 09 (texte/trainer-de.js › selbstauskunft.punkte, ENTWURF_WORTLAUT) und die Datei haben seit 24.11.2026 denselben Wortlaut
  // (Gegenprüfung F4): Die Person bestätigt auf dem Bildschirm, was sie unterschreibt. trainer-pdf-test.mjs prüft die Gleichheit.
  selbstauskunft: {
    titel: "Selbstauskunft und Selbstverpflichtung (Kinder- und Jugendarbeit)",
    an: "An den Vorstand des {verein}",
    name: "Name",
    geburtsdatum: "Geburtsdatum",
    punkte: [
      "Ich bin nicht wegen einer Straftat nach den §§ 171, 174 bis 174c, 176 bis 180a, 181a, 182 bis 184g, 184i, 184j, 184k, 184l, 201a Absatz 3, 225, 232 bis 233a, 234, 235 oder 236 des Strafgesetzbuchs (Straftaten nach § 72a Absatz 1 Satz 1 SGB VIII) rechtskräftig verurteilt.",
      "Gegen mich läuft wegen einer dieser Straftaten kein Ermittlungs- oder Strafverfahren.",
      "Wird gegen mich ein solches Verfahren eingeleitet oder werde ich verurteilt, teile ich das dem Vorstand des Vereins unverzüglich mit.",
    ],
    hinweis: "Diese Erklärung ersetzt das erweiterte Führungszeugnis nicht.",
    ortDatum: "{ort}, {datum}",
    ortDatumLabel: "Ort, Datum",
    unterschriftLabel: "Unterschrift",
  },

  // ---------- Erklärung zum Verhaltenskodex (nur die Erklärung; der Volltext des Landessportbundes liegt nicht bei) ----------
  kodex: {
    titel: "Verhaltenskodex zum Kindeswohl – Erklärung",
    lead: "Der Verhaltenskodex gilt für alle, die im Verein mit Kindern und Jugendlichen arbeiten.", // WORTLAUT_QUELLE (ap1/texte.mjs › kodex.text, erster Satz)
    quelle: "Verhaltenskodex zum Kindeswohl von Landessportbund Hessen und Sportjugend Hessen (aktuelle Fassung). Der vollständige Text ist nicht Teil dieser Datei.", // WORTLAUT_AP3 (A6: „Landessportbund und Sportjugend Hessen (aktuelle Fassung)“)
    erklaerung: "Ich habe den Verhaltenskodex gelesen und halte mich daran.", // WORTLAUT_QUELLE (ap1/texte.mjs › kodex.gelesen)
    name: "Name",
    geburtsdatum: "Geburtsdatum",
    verein: "Verein",
    ortDatum: "{ort}, {datum}",
    ortDatumLabel: "Ort, Datum",
    unterschriftLabel: "Unterschrift",
  },

  // ---------- Information nach Art. 13 DSGVO (PRUEFEN_RECHT; Muster: pdf.js › seiteDatenschutz, Mitgliederfassung) ----------
  datenschutz: {
    titel: "Information zum Datenschutz",
    untertitel: "nach Artikel 13 der Datenschutz-Grundverordnung (DSGVO) für Trainer, Co-Trainer und Betreuer",
    person: "Name: {name}, geboren am {geburt}",
    verantwortlichTitel: "1. Wer ist verantwortlich?",
    verantwortlich: "Verantwortlich für die Verarbeitung deiner Daten ist der {verein}, vertreten durch den Vorstand.",
    kontakt: "E-Mail: {mail}. Bei Fragen zum Datenschutz wende dich an die Geschäftsstelle.",
    kontaktOhneMail: "Bei Fragen zum Datenschutz wende dich an die Geschäftsstelle.",
    datenTitel: "2. Welche Daten verarbeiten wir?",
    daten: [
      "Stammdaten: Name, Anschrift, Geburtsdatum, E-Mail-Adresse und Handynummer.",
      "Angaben zum Einsatz: Abteilung, Mannschaft oder Gruppe, Rolle, Beginn der Tätigkeit und, freiwillig, die Wochentage, an denen du kannst.",
      "Notfallkontakt (freiwillig): Name, Beziehung und Telefonnummer einer Person, die wir im Notfall anrufen dürfen (Daten Dritter, siehe Punkt 9).",
      "Angaben zu deiner Erfahrung (freiwillig): Erfahrung und Qualifikationen als Trainer oder Betreuer und das Datum deines Erste-Hilfe-Kurses.",
      "Ein Passfoto für die internen Vereinsunterlagen (freiwillig).",
      "Selbstauskunft zur Kinder- und Jugendarbeit (Angaben zu Straftaten nach § 72a Absatz 1 Satz 1 SGB VIII) und Erklärung zum Verhaltenskodex.",
      "Erweitertes Führungszeugnis: nur das Datum der Einsicht, das Datum des Zeugnisses und die Angabe, ob eine einschlägige Verurteilung darin steht (ja oder nein). Das Zeugnis selbst bleibt bei dir.",
    ],
    zweckTitel: "3. Wofür verarbeiten wir die Daten, und auf welcher Rechtsgrundlage?",
    zweckSpalten: ["Zweck", "Rechtsgrundlage"],
    zweck: [
      ["Mitgliedschaft (beitragsfrei), Organisation von Training und Betreuung, Kontakt zu dir (Anmeldung und Kontaktdatenblatt)", "Art. 6 Abs. 1 lit. b DSGVO (Mitgliedschaft)"],
      ["Planung deines Einsatzes (Mannschaft oder Gruppe, Rolle, Zeiten, Erfahrung)", "Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der Organisation des Trainingsbetriebs)"],
      ["Notfallkontakt (freiwillig)", "Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse: im Notfall Angehörige erreichen)"],
      ["Passfoto für die internen Vereinsunterlagen (freiwillig)", "Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse, Widerspruch möglich)"],
      ["Selbstauskunft und Erklärung zum Verhaltenskodex (Schutz von Kindern und Jugendlichen)", "Art. 6 Abs. 1 lit. f in Verbindung mit Art. 10 DSGVO (berechtigtes Interesse am Schutz der Kinder; verlangt nach dem Schutzkonzept des Vereins)"],
      ["Einsicht in das erweiterte Führungszeugnis (nur die drei Vermerke)", "Art. 6 Abs. 1 lit. f in Verbindung mit Art. 10 DSGVO (berechtigtes Interesse am Schutz der Kinder); § 30a Abs. 3 BZRG; Umfang der Vermerke und Löschfrist auch nach § 72a Abs. 5 SGB VIII"],
      ["Antrag auf Gebührenbefreiung (Bestätigung deiner ehrenamtlichen Tätigkeit)", "Art. 6 Abs. 1 lit. f DSGVO (Aufforderung und Bestätigung nach § 30a Abs. 2 BZRG)"],
      ["Fotos von dir in Internetseite, App und Presse des Vereins (nur, wenn du gesondert einwilligst)", "Art. 6 Abs. 1 lit. a DSGVO (Einwilligung)"],
    ],
    empfaengerTitel: "4. An wen geben wir Daten weiter?",
    empfaenger: [
      "Vorstand und Geschäftsstelle des Vereins: für die Mitgliederverwaltung und die Organisation des Trainingsbetriebs.",
      // EINSICHT: derselbe Wortlaut wie auf Bildschirm 10, hier in der Du-Form
      "{einsichtLead} {einsichtAngeschaut} {einsichtNotiert}",
      "Landessportbund Hessen: Der Verein meldet jährlich seinen Mitgliederbestand (Bestandsmeldung).",
      "Eine Weitergabe an weitere Empfänger oder in Länder außerhalb der Europäischen Union ist nicht vorgesehen.",
    ],
    speicherTitel: "5. Wie lange speichern wir die Daten?",
    speicher: [
      "Angaben zum Führungszeugnis (Datum der Einsicht, Datum des Zeugnisses, ja oder nein): Der Verein löscht sie unverzüglich, wenn du die Tätigkeit nicht aufnimmst, sonst spätestens sechs Monate nach der letzten Ausübung deiner Tätigkeit (§ 30a Abs. 3 BZRG, § 72a Abs. 5 SGB VIII).",
      "Kontaktdatenblatt, Notfallkontakt, Selbstauskunft, Erklärung zum Verhaltenskodex und Passfoto: so lange du im Verein tätig bist. Danach löscht der Verein sie spätestens sechs Monate nach der letzten Ausübung deiner Tätigkeit, soweit keine Pflicht zur Aufbewahrung besteht.",
      "Mitgliederdaten: bis zwei Jahre nach dem Ende der Mitgliedschaft.",
      "Fotos in den Vereinsmedien: bis du deine Einwilligung widerrufst.",
    ],
    rechteTitel: "6. Deine Rechte",
    rechte:
      "Du hast das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18) und Datenübertragbarkeit (Art. 20). Du kannst der Verarbeitung aus berechtigtem Interesse widersprechen (Art. 21). Eine Einwilligung kannst du jederzeit mit Wirkung für die Zukunft widerrufen (Art. 7 Abs. 3). Die Verarbeitung bis zum Widerruf bleibt rechtmäßig. Eine E-Mail an die Geschäftsstelle genügt.",
    beschwerdeTitel: "7. Beschwerde bei der Aufsichtsbehörde",
    beschwerde: "Du kannst dich bei der Datenschutzaufsicht beschweren: Der Hessische Beauftragte für Datenschutz und Informationsfreiheit, Wilhelmstraße 7, 65185 Wiesbaden, datenschutz.hessen.de.",
    pflichtTitel: "8. Musst du die Daten angeben?",
    pflicht:
      "Pflicht sind: Name, Anschrift, Geburtsdatum, Handynummer, E-Mail-Adresse und die Angaben zum Einsatz (Mannschaft oder Gruppe, Rolle, Beginn). Ohne sie kann der Verein dich nicht aufnehmen und nicht als Trainer oder Betreuer einsetzen. Freiwillig sind dein Passfoto, ein Notfallkontakt, deine Erfahrung und Qualifikationen, das Datum deines Erste-Hilfe-Kurses und die Wochentage, an denen du kannst. Der Verein verlangt die Selbstauskunft, die Erklärung zum Verhaltenskodex und die Einsicht in das erweiterte Führungszeugnis von allen neuen Trainern und Betreuern. Ohne sie kann er dich nicht in der Kinder- und Jugendarbeit einsetzen. Eine automatisierte Entscheidung einschließlich Profiling findet nicht statt.",
    dritteTitel: "9. Daten deines Notfallkontakts",
    dritte:
      "Wenn du einen Notfallkontakt nennst, informierst du die Person bitte darüber, dass der Verein ihren Namen, ihre Beziehung zu dir und ihre Telefonnummer speichert (Art. 14 DSGVO). Sie kann sich mit Fragen zum Datenschutz an die Geschäftsstelle wenden.",
    entstehungTitel: "10. So entsteht deine Datei",
    entstehung:
      "Die Seite für neue Trainer arbeitet nur in deinem Browser. Deine Angaben, dein Foto und deine Unterschrift werden nicht an einen Server übertragen. Der Verein erhält die Datei erst, wenn du sie selbst per E-Mail schickst. Dein erweitertes Führungszeugnis lädst du nirgends hoch und schickst es nicht per E-Mail.",
  },

  // ---------- Antrag auf Gebührenbefreiung (WORTLAUT_QUELLE: Brief des Vereins, ap1/texte.mjs › blaetter.antrag) ----------
  antrag: {
    ortDatumLabel: "Ort, Datum",
    ortDatum: "{ort}, {datum}",
    ueberschrift1: "Ausstellung eines erweiterten Führungszeugnisses für die ehrenamtliche und unentgeltliche Tätigkeit",
    ueberschrift2: "Antrag auf Gebührenbefreiung",
    anrede: "Sehr geehrte Damen und Herren,",
    absatz1:
      "unser Verein bietet Kindern und Jugendlichen die Möglichkeit zur Ausübung des Fußballsports in entsprechenden Altersklassen und hat sich dem Kinderschutz verpflichtet. Wir sind ein als gemeinnützig anerkannter Verein.",
    herrFrau: "Herr/Frau",
    gebAm: ", geb. am",
    wohnhaft: "wohnhaft",
    adresseLabel: "[vollständige Adresse]",
    istBeiUnsAls: "ist bei uns als",
    taetig: "ehrenamtlich und unentgeltlich tätig.",
    funktion: "{rolle} {abteilung} / Jugend",
    // einzige Abweichung vom Original: die Fundstelle (Nr. 2 Buchst. a statt Nr. 2b; Nr. 2b ist eine veraltete Zählung, Ergebnis der Faktenprüfung)
    absatz2:
      "Im Rahmen seines/ihres Ehrenamts gehört u.a. die Beaufsichtigung, Betreuung, Erziehung und Ausbildung von Minderjährigen (§ 30a Abs. 1 Nr. 2 Buchst. a BZRG) zu seinem/ihrem Aufgabenbereich.",
    // 24.11.2026 (Gegenprüfung F1 und F10, Olgay: „Umsetzen“): § 30a Abs. 2 BZRG verlangt die Bestätigung des Vereins, dass die Voraussetzungen
    // nach Absatz 1 vorliegen; sie steht jetzt in Absatz 3 (kein eigener Absatz: die Seite hat keinen Platz für weitere Zeilen). In
    // Absatz 4 steht statt der veralteten „Richtlinien des Bundesamtes für Justiz“ die Vorbemerkung 1.1.3 zum Kostenverzeichnis des JVKostG.
    absatz3: "Wir bestätigen, dass die Voraussetzungen des § 30a Abs. 1 BZRG vorliegen, und bitten mit Bezug auf das Bundeszentralregistergesetz (§ 30a) um Erstellung eines erweiterten Führungszeugnisses zur Vorlage bei uns.",
    absatz4: "Unter Hinweis auf die Vorbemerkung 1.1.3 zum Kostenverzeichnis des JVKostG beantragen wir zugleich die Gebührenfreiheit.",
    dank: "Wir bedanken uns für Ihre Unterstützung und verbleiben",
    gruss: "mit freundlichen Grüßen",
    eV: "e.V.",
    iA: "i.A.",
  },

  // ---------- Passfoto (letzte Seite der Datei; seit 25.11.2026 liegt das Foto in der PDF, nicht mehr als eigene Bilddatei) ----------
  passfoto: {
    titel: "Passfoto",
    zeile: "Passfoto von {name}",
  },

  // ---------- Die eine Datei (Bildschirm 13 „Das steht im Paket“; 25.11.2026 auf eine Datei umgestellt: Safari am iPhone zeigt von mehreren
  // Downloads nur den ersten, Browser am Computer fragen nach, und beim Teilen nehmen Apps nicht immer alle Dateien) ----------
  // Die Beschreibung setzt trainer-pdf.js aus diesen Teilen zusammen: basis, dazu der Antrag (nur bei „beantragen“) und das Passfoto (nur mit Foto).
  dateien: {
    basis: "Deckblatt, Anmeldung, Kontaktdatenblatt, Selbstauskunft, Verhaltenskodex, Datenschutzinformation",
    antrag: "Antrag für dein Führungszeugnis",
    foto: "Passfoto",
  },

  // ---------- Metadaten und Fuß ----------
  meta: {
    titelPaket: "Trainerunterlagen",
    betreffPaket: "Unterlagen für neue Trainer und Betreuer",
    titelAntrag: "Antrag auf Gebührenbefreiung",
    betreffAntrag: "Erweitertes Führungszeugnis für die ehrenamtliche Tätigkeit",
  },
  fuss: {
    links: "{verein} · Trainerunterlagen · {name}",
    seite: "Seite {nr} von {gesamt}",
    fortsetzung: "(Fortsetzung)",
  },
};

// Zahlwort für die Jahre der Wiedervorlage („fünf Jahren“); ab 13 Ziffern
const ZAHLWORT = ["", "einem", "zwei", "drei", "vier", "fünf", "sechs", "sieben", "acht", "neun", "zehn", "elf", "zwölf"];

export function jahreText(n) {
  const z = ZAHLWORT[n] || String(n);
  return z + (n === 1 ? " Jahr" : " Jahren");
}
