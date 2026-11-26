/*
  Texte der Seite „Neu im Trainerteam“ (FFV Sportfreunde 04) – nur Deutsch, Anrede „du“, keine Ausrufezeichen
  außer wo der Entwurf sie hat. Stand 26.11.2026.

  Alle sichtbaren Texte der Seite stehen hier (Bildschirme, Fehlermeldungen, Dialoge, Meldungen am Ende). Sie sind aus dem
  abgenommenen Entwurf übernommen (Wortlaute in den Bildschirmen 01 bis 13, rechtlich geprüft in der Faktenprüfung AP-3);
  der Aufbau folgt den Textmodulen des Anmelde-Assistenten (de-oberflaeche.js). Das Modul braucht keinen Browser: Der Bau der
  Seite (Titel, Überschrift, Lead) und die Tests lesen es in Node. Die Nummern 01 bis 13 sind die des Entwurfs; der Bildschirm
  „Welche Größen hast du?“ (ausstattung) kam am 26.11.2026 dazu und heißt 06a, damit die übrigen Nummern gleich bleiben (die Seite
  hat jetzt 14 Bildschirme).

  Aufbau
    - seite          Rahmen der Seite (Bauzeit): Titel, Überschrift, Lead, Meldungen vor dem Start. {mail} ist die Adresse der
                     Geschäftsstelle aus der Konfiguration (verein.mail).
    - rahmen, allgemein, fehler, loeschen    Rahmen des Assistenten (Leiste, Abschnitte, Fuß), Kleinigkeiten, Fehlermeldungen
    - code … fertig  je Bildschirm ein Eintrag (code, start, person, einsatz, notfall, erfahrung, ausstattung, foto, kodex,
                     selbstauskunft, zeugnis, unterschriften, pruefen, fertig)
    - Platzhalter in geschweiften Klammern ({frist}, {datum}, {nachname}, {mail} …) setzt die Seite ein. Wo ein Text eine oder
      mehrere Einsichtnehmende nennt, steht {lang} (mit Funktion) oder {kurz} (nur Name): Den Namensteil bildet allein
      trainer-einsicht.js aus konfig.einsicht. Kein Name steht fest in einem Text.
    - Texte mit {dauer} und {zeitraum} (Schnupperphase) setzt die Seite aus konfig.schnupperMonate ein; die Wörter dafür stehen
      unter „schnupper“.

  Markierungen im Quelltext (stehen als Kommentar hinter dem Text; Herkunft: Entwurf, ap1/texte.mjs)
    ENTWURF_WORTLAUT   Wortlaut wird noch mit dem Vorstand abgestimmt (Selbstauskunft, Bildschirm 09)
    PRUEFEN_AP3        rechtliche Aussagen, die AP-3 gegen Gesetze und das Bundesamt für Justiz geprüft hat; bei neuem Wortlaut
                       die Faktenprüfung (ap3/BERICHT.md) beachten
    WORTLAUT_QUELLE    wörtlich aus einer Quelle (Verhaltenskodex des Landessportbundes Hessen): nicht ändern
*/

const WEITER = "Weiter";
const PRIVAT = "Alles bleibt auf deinem Gerät, bis du die Datei selbst schickst. Die Seite sendet nichts.";

export default {
  // ---------- Rahmen der Seite (Bauzeit) ----------

  seite: {
    titel: "Neu im Trainerteam – FFV Sportfreunde 04",
    beschreibung: "Unterlagen für neue Trainer, Co-Trainer und Betreuer des FFV Sportfreunde 04: Angaben, Verhaltenskodex und Unterschrift in einem Zug. Zugang nur mit Code.",
    h1: "Neu im Trainerteam",
    lead: "Alle Unterlagen in einem Zug. Am Handy dauert das etwa zehn Minuten.",
    assistentTitel: "Assistent für neue Trainer und Betreuer",
    laedt: "Die Seite wird geladen. Wenn nichts passiert, schreib an {mail}.",
    ohneSkript: "Diese Seite braucht JavaScript. Bitte schalte es ein. Oder schreib an {mail}.",
    ladefehler: "Die Seite lässt sich nicht laden. Bitte schreib an {mail}.",
  },

  // ---------- Rahmen des Assistenten (Leiste, Abschnitte, Fuß) ----------

  rahmen: {
    zurueck: "Zurück",
    zurueckLang: "Einen Schritt zurück",
    hilfe: "Hilfe",
    hilfeText: "Fragen? Schreib an {mail}.",
    abschnittTitel: "Abschnitte",
    hierBistDu: "Du bist hier",
    abschnitte: {
      du: "Du",
      einsatz: "Einsatz",
      unterlagen: "Unterlagen",
      zeugnis: "Führungszeugnis",
      unterschrift: "Unterschrift",
      fertig: "Fertig",
    },
    fuss: {
      privat: PRIVAT,
      loeschen: "Alle Angaben löschen",
    },
  },

  allgemein: {
    freiwillig: "(freiwillig)",
    tag: "Tag",
    monat: "Monat",
    jahr: "Jahr",
    datumHinweis: "Zum Beispiel: 27 3 1988",
    datumHinweisJetzt: "Zum Beispiel: 27 3 2026",
    bitteWaehlen: "Bitte wählen",
    oeffnetNeu: "öffnet in einem neuen Tab",
  },

  // Schnupperphase: Beginn plus konfig.schnupperMonate Monate. {dauer} und {zeitraum} setzt die Seite aus diesen Wörtern ein.
  schnupper: {
    dauerEins: "einen Monat",
    dauerMehr: "{n} Monate",
    zeitraumEins: "Im ersten Monat",
    zeitraumMehr: "In den ersten {n} Monaten",
  },

  // ---------- Fehlermeldungen (Stil und Wortwahl wie im Anmelde-Assistenten, in der Du-Form) ----------

  fehler: {
    titelEins: "Bitte prüfe diese Angabe:",
    titelMehr: "Bitte prüfe diese {anzahl} Angaben:",
    seite: "Diese Seite lässt sich nicht anzeigen. Bitte schreib an {mail}.",
    vorname: "Bitte trage deinen Vornamen ein.",
    nachname: "Bitte trage deinen Nachnamen ein.",
    // Die Dateien werden mit der Schrift Liberation Sans erzeugt: Was sie nicht kennt, würde als „?“ im PDF stehen (zeichen.js).
    lateinisch: "Bitte schreibe den Namen mit lateinischen Buchstaben, so wie im Ausweis.",
    lateinischOrt: "Bitte schreibe den Ort mit lateinischen Buchstaben, so wie im Ausweis.",
    lateinischAnschrift: "Bitte schreibe die Adresse mit lateinischen Buchstaben.",
    lateinischText: "Bitte schreibe mit lateinischen Buchstaben.",
    datumLeer: "Bitte trage das Datum ein.",
    datumUnvollstaendig: "Bitte trage Tag, Monat und Jahr ein.",
    datumUngueltig: "Dieses Datum gibt es nicht. Bitte prüfe es.",
    datumZukunft: "Das Datum liegt in der Zukunft. Bitte prüfe es.",
    datumZuAlt: "Das Jahr liegt zu weit zurück. Bitte prüfe es.",
    unter18: "Diese Seite ist für Erwachsene. Wenn du unter 18 bist, melde dich bitte bei der Geschäftsstelle.",
    strasse: "Bitte trage Straße und Hausnummer ein.",
    plz: "Die Postleitzahl hat 5 Ziffern.",
    ort: "Bitte trage den Ort ein.",
    email: "Bitte trage eine gültige E-Mail-Adresse ein.",
    handy: "Bitte trage deine Handynummer ein.",
    nummerZeichen: "Die Nummer darf nur Ziffern, Leerzeichen und die Zeichen + - / enthalten.",
    nummerKurz: "Die Nummer ist zu kurz. Sie braucht mindestens 6 Ziffern.",
    abteilung: "Bitte wähle eine Abteilung.",
    mannschaft: "Bitte wähle deine Mannschaft.",
    gruppe: "Bitte wähle deine Gruppe.",
    rolle: "Bitte wähle deine Rolle.",
    seitZuSpaet: "Das Datum liegt mehr als drei Monate in der Zukunft. Bitte prüfe es.",
    notfallName: "Bitte trage den Namen ein.",
    notfallBeziehung: "Bitte trage ein, wer die Person für dich ist.",
    notfallTelefon: "Bitte trage die Telefonnummer ein.",
    // Größen für die Trainerausstattung: Der Wert ist keine Größe der Liste (das Auswahlfeld erzeugt so etwas nicht; die Regel schützt vor veränderten Werten)
    ausstattungGroesse: "Bitte wähle eine Größe aus der Liste.",
    kodex: "Bitte lies den Verhaltenskodex und setze den Haken.",
    selbstauskunft: "Bitte setze den Haken. Trifft die Erklärung nicht auf dich zu, melde dich bitte bei der Geschäftsstelle.",
    zeugnis: "Bitte wähle eine Antwort.",
    unterschrift: "Bitte unterschreibe im Feld.",
    satzung: "Bitte lies die Satzung und setze den Haken.",
    // Fehler beim Verkleinern des Fotos (bilder.js, BildFehler.art)
    bild: {
      typ: "Diese Datei ist kein Foto.",
      heic: "Dieses Bildformat kann der Browser nicht lesen. Bitte mach das Foto neu.",
      nichtLesbar: "Das Bild lässt sich nicht öffnen. Bitte wähle ein anderes.",
      zuGross: "Die Datei ist zu groß. Bitte wähle eine kleinere Datei.",
      zuKlein: "Das Bild ist zu klein. Bitte mach ein größeres Foto.",
      leer: "Die Datei ist leer. Bitte wähle eine andere.",
    },
  },

  loeschen: {
    titel: "Alle Angaben löschen?",
    text: "Dann sind alle Angaben und Fotos weg. Das geht nicht rückgängig.",
    ja: "Ja, alles löschen",
    nein: "Nein, behalten",
    fertig: "Alle Angaben sind gelöscht.",
  },

  // ---------- 01 code ----------

  code: {
    titel: "Dein Zugangscode",
    text: "Diese Seite ist für neue Trainer, Co-Trainer und Betreuer des FFV Sportfreunde 04. Den Code bekommst du von der Vorsitzenden per E-Mail oder Nachricht.",
    label: "Zugangscode",
    hinweis: "Zwölf Zeichen. Bindestriche und Leerzeichen sind egal.",
    weiter: WEITER,
    kein: "Noch keinen Code? {link}",
    keinLink: "Code anfragen",
    // Betreff der E-Mail an die Geschäftsstelle („Code anfragen“): ohne Text und ohne Angaben zur Person
    anfrageBetreff: "Code für Neu im Trainerteam",
    fehlerLeer: "Bitte gib deinen Code ein.",
    fehlerFalsch: "Der Code stimmt nicht. Bitte prüfe ihn.",
  },

  // ---------- 02 start ----------

  start: {
    titel: "Schön, dass du dabei bist",
    text: "Hier erledigst du alles, was der Verein von neuen Trainern und Betreuern braucht. Das dauert etwa zehn Minuten.",
    ablaufTitel: "So läuft es",
    ablauf: [
      "Du trägst deine Angaben ein. Ein Passfoto ist freiwillig.",
      "Du liest den Verhaltenskodex und bestätigst ihn und die Selbstauskunft.",
      "Du bekommst den Antrag für dein erweitertes Führungszeugnis, ausgefüllt und gebührenfrei.", // PRUEFEN_AP3
      "Du unterschreibst am Bildschirm und schickst alles per E-Mail an die Geschäftsstelle.",
    ],
    brauchstTitel: "Das brauchst du",
    brauchst: [
      "Dein Handy oder einen Computer",
      "Wenn du magst: ein Foto von dir (digital genügt)",
      "Deinen Finger oder die Maus zum Unterschreiben",
    ],
    wissenTitel: "Gut zu wissen",
    wissen: [
      "{zeitraum} (Schnupperphase) bist du nie allein auf dem Platz: Ein gemeldeter Trainer des Vereins ist immer dabei.",
      "Trainer und Betreuer sind beitragsfrei Mitglied.",
      "Spätestens nach der Schnupperphase braucht der Verein deine Unterlagen.",
      "Es gibt auch Trainerausstattung vom Verein: Shirt, Pullover, Anzug und Regenjacke. Dafür trägst du später deine Größen ein.",
    ],
    los: "Los geht’s",
  },

  // ---------- 03 person ----------

  person: {
    titel: "Wer bist du?",
    hinweis: "Bitte so, wie es in deinem Personalausweis steht. Damit füllen wir deine Unterlagen aus.",
    vorname: "Vorname",
    nachname: "Nachname",
    geburtsdatum: "Geburtsdatum",
    strasse: "Straße und Hausnummer",
    plz: "PLZ",
    ort: "Ort",
    handy: "Handynummer",
    email: "E-Mail-Adresse",
    weiter: WEITER,
  },

  // ---------- 04 einsatz ----------

  einsatz: {
    titel: "Wo bist du im Einsatz?",
    abteilung: "Abteilung",
    abteilungen: { fussball: "Fußball", karneval: "Karneval" },
    // Bei der Abteilung Karneval heißt die Auswahl „Gruppe“; die Namen stehen in konfig.mannschaften
    mannschaft: "Mannschaft",
    gruppe: "Gruppe",
    rolle: "Deine Rolle",
    rollen: { trainer: "Trainer", "co-trainer": "Co-Trainer", betreuer: "Betreuer", torwarttrainer: "Torwarttrainer" },
    seit: "Seit wann bist du dabei?",
    seitHinweis: "Die Schnupperphase dauert {dauer}. Deine Unterlagen sind spätestens am {frist} fällig.",
    seitHinweisOhneFrist: "Die Schnupperphase dauert {dauer}.",
    tage: "Wann kannst du?",
    tageHinweis: "Nur zur Planung, nicht verbindlich.",
    wochentage: { mo: "Montag", di: "Dienstag", mi: "Mittwoch", do: "Donnerstag", fr: "Freitag", sa: "Samstag", so: "Sonntag" },
    weiter: WEITER,
  },

  // ---------- 05 notfall ----------

  notfall: {
    titel: "Wer ist im Notfall für dich da?",
    hinweis: "Das ist freiwillig. Du kannst diese Seite überspringen. Wenn du einen Notfallkontakt angibst, brauchen wir alle drei Angaben. Die Angaben gehen erst an den Verein, wenn du die Datei selbst schickst. Sag der Person bitte Bescheid, dass du sie angibst.",
    name: "Name des Notfallkontakts",
    beziehung: "Beziehung zu dir",
    telefon: "Telefonnummer des Notfallkontakts",
    weiter: WEITER,
  },

  // ---------- 06 erfahrung ----------

  erfahrung: {
    titel: "Was bringst du mit?",
    hinweis: "Alles auf dieser Seite ist freiwillig. Du kannst sie überspringen.",
    erfahrung: "Erfahrung und Qualifikationen",
    erfahrungHinweis: "Zum Beispiel Trainerlizenz, frühere Vereine oder Fortbildungen.",
    ersteHilfe: "Erste-Hilfe-Kurs absolviert am",
    weiter: WEITER,
  },

  // ---------- 06a ausstattung (neu seit 26.11.2026; die Nummern 07 bis 13 des Entwurfs bleiben, wie sie sind) ----------
  // Alles freiwillig: vier Auswahlfelder für die Größen der Trainerausstattung des Vereins. Die Namen der Artikel (shirt … regenjacke) sind
  // zugleich die Beschriftungen der Felder, der Zeilen auf „Prüfen“ und (in trainer-pdf-texte.js) des Kontaktdatenblatts.

  ausstattung: {
    titel: "Welche Größen hast du?",
    hinweis: "Das ist freiwillig. Du kannst diese Seite überspringen. Die Größen brauchen wir für die Trainerausstattung des Vereins: Shirt, Pullover, Anzug und Regenjacke.",
    shirt: "Shirt",
    pullover: "Pullover",
    anzug: "Anzug",
    regenjacke: "Regenjacke",
    fussnote: "Weißt du eine Größe nicht? Lass das Feld leer.",
    weiter: WEITER,
  },

  // ---------- 07 foto ----------

  foto: {
    titel: "Dein Passfoto",
    text: "Das Foto ist freiwillig. Es ist für die internen Vereinsunterlagen. Ein digitales Foto genügt. Bitte von vorne, mit gut sichtbarem Gesicht.",
    machen: "Foto machen",
    galerie: "Foto aus der Galerie wählen",
    anderes: "Anderes Foto wählen",
    gespeichert: "Foto ist gespeichert.",
    vorschauAlt: "Vorschau deines Passfotos",
    fussnote: "Das Foto steht auf der letzten Seite deiner Datei.",
    weiter: WEITER,
  },

  // ---------- 08 kodex ----------

  kodex: {
    titel: "Verhaltenskodex zum Kindeswohl",
    text: "Der Verhaltenskodex gilt für alle, die im Verein mit Kindern und Jugendlichen arbeiten. Bitte lies ihn in Ruhe.",
    lesen: "Verhaltenskodex lesen",
    // WORTLAUT_QUELLE: Verhaltenskodex des Landessportbundes Hessen, Abschnitt A „Grundsätze“, Punkte 1 und 2. Die Datei trägt „Dezember 2023“ nur
    // in den PDF-Eigenschaften; auf dem Bildschirm steht deshalb „aktuelle Fassung“ (Ergebnis der Faktenprüfung).
    grundsaetze: [
      "Ich achte die Persönlichkeit jedes Kindes, Jugendlichen und jungen Erwachsenen und unterstütze dessen Entwicklung zu einer mündigen Person. Dies hat Vorrang vor meinen eigenen sowie sportlichen oder persönlichen Zielen Dritter (z.B. Eltern, Verein, Verband).", // WORTLAUT_QUELLE
      "Ich achte das Recht jedes Kindes, Jugendlichen und jungen Erwachsenen auf körperliche Unversehrtheit und Privatsphäre sowie individuelle Grenzen und übe keine Form der Gewalt aus, sei sie physischer, psychischer oder sexualisierter Art, weder im analogen noch im digitalen Raum. Ich bin mir der Verantwortung bewusst und werde meine Position nicht ausnutzen, insbesondere gegenüber Personen, die in einem Abhängigkeitsverhältnis zu mir stehen.", // WORTLAUT_QUELLE
    ],
    weitere: "… weitere Grundsätze und Verhaltensregeln im vollständigen Text",
    quelle: "Aktuelle Fassung des Landessportbundes Hessen.",
    pdf: "Vollständig als PDF öffnen",
    gelesen: "Ich habe den Verhaltenskodex gelesen und halte mich daran.",
    hinweis: "Unterschrieben wird später in einem Zug.",
    weiter: WEITER,
  },

  // ---------- 09 selbstauskunft (ENTWURF_WORTLAUT) ----------

  selbstauskunft: {
    titel: "Selbstauskunft zur Kinder- und Jugendarbeit", // ENTWURF_WORTLAUT
    text: "Der Verein schützt Kinder und Jugendliche. Dafür bitten wir alle neuen Trainer und Betreuer um diese Erklärung.", // ENTWURF_WORTLAUT
    kastenTitel: "Ich erkläre:", // ENTWURF_WORTLAUT
    punkte: [
      // Seit 24.11.2026 (Gegenprüfung F4, Olgay: „Umsetzen“) steht hier derselbe Wortlaut wie in der unterschriebenen Datei (T.selbstauskunft.punkte
      // in trainer-pdf-texte.js): Die Person bestätigt, was sie unterschreibt. trainer-pdf-test.mjs prüft, dass beide gleich bleiben.
      "Ich bin nicht wegen einer Straftat nach den §§ 171, 174 bis 174c, 176 bis 180a, 181a, 182 bis 184g, 184i, 184j, 184k, 184l, 201a Absatz 3, 225, 232 bis 233a, 234, 235 oder 236 des Strafgesetzbuchs (Straftaten nach § 72a Absatz 1 Satz 1 SGB VIII) rechtskräftig verurteilt.", // ENTWURF_WORTLAUT
      "Gegen mich läuft wegen einer dieser Straftaten kein Ermittlungs- oder Strafverfahren.", // ENTWURF_WORTLAUT
      "Wird gegen mich ein solches Verfahren eingeleitet oder werde ich verurteilt, teile ich das dem Vorstand des Vereins unverzüglich mit.", // ENTWURF_WORTLAUT
    ],
    hinweis: "Diese Erklärung ersetzt das erweiterte Führungszeugnis nicht.", // ENTWURF_WORTLAUT
    zutreffend: "Das trifft auf mich zu.", // ENTWURF_WORTLAUT
    weiter: WEITER,
  },

  // ---------- 10 zeugnis (PRUEFEN_AP3) ----------

  zeugnis: {
    titel: "Dein erweitertes Führungszeugnis",
    text: "Alle Trainer und Betreuer legen ein erweitertes Führungszeugnis vor. So steht es im Schutzkonzept des Vereins.", // PRUEFEN_AP3
    wahl: {
      beantragen: "Ich muss es noch beantragen",
      vorhanden: "Ich habe schon ein aktuelles erweitertes Führungszeugnis",
    },
    karteTitel: "Antrag auf Gebührenbefreiung",
    karteText: "Für ehrenamtliche Trainer ist das erweiterte Führungszeugnis gebührenfrei (sonst 13 Euro). Der Verein bestätigt dir dazu schriftlich: Du bist ehrenamtlich für unseren gemeinnützigen Verein tätig, und er verlangt das Zeugnis von dir. Wir füllen den Antrag mit deinen Angaben aus.", // PRUEFEN_AP3
    // Sinnbild des Briefes (kein Bild des echten Antrags): Der Antrag entsteht erst mit den Angaben der Person und lässt sich mit „Antrag ansehen“ öffnen.
    blattAlt: "Sinnbild eines Briefes: Der Antrag wird mit deinen Angaben ausgefüllt.",
    ansehen: "Antrag ansehen",
    ansehenArbeit: "Der Antrag wird erstellt …",
    weiterTitel: "So geht es weiter",
    // Die ersten drei Schritte gelten nur, wenn das Zeugnis noch beantragt werden muss. {lang}: Namensteil der Einsichtnehmenden
    // (trainer-einsicht.js, form „lang“: mit Funktion).
    schritte: [
      "Der Verein unterschreibt den Antrag und schickt ihn dir zurück.", // PRUEFEN_AP3
      "Mit dem unterschriebenen Antrag gehst du persönlich in ein Bürgeramt an deinem Wohnort (Ausweis mitbringen). Oder du beantragst das Zeugnis online beim Bundesamt für Justiz (fuehrungszeugnis.bund.de). Dafür brauchst du den Online-Ausweis, und du lädst den Antrag dort hoch.", // PRUEFEN_AP3
      "Das Zeugnis kommt per Post zu dir nach Hause. Beantragst du es online, kannst du es auf Wunsch digital als PDF bekommen.", // PRUEFEN_AP3
      "Du zeigst das Zeugnis persönlich {lang}. Das Zeugnis wird nur angeschaut: Es wird nicht mitgenommen und nicht kopiert. Notiert werden nur: Datum der Einsicht, Datum des Zeugnisses und ob eine einschlägige Verurteilung darin steht (ja oder nein).", // PRUEFEN_AP3
    ],
    fussnote: "Das Zeugnis, auch das digitale, lädst du nirgends hoch und schickst es nicht per E-Mail. Du zeigst es nur persönlich.", // PRUEFEN_AP3
    weiter: WEITER,
  },

  // ---------- 11 unterschriften ----------

  unterschriften: {
    titel: "Unterschreiben",
    text: "Mit deiner Unterschrift bestätigst du die Anmeldung, das Kontaktdatenblatt, den Verhaltenskodex und die Selbstauskunft.",
    feldTitel: "Deine Unterschrift",
    loeschen: "Unterschrift löschen",
    stand0: "Noch nicht unterschrieben",
    standOk: "Unterschrieben",
    standZuKurz: "Zu kurz. Bitte unterschreibe ganz.",
    ariaLabel: "Unterschriftsfeld. Zeichne mit Finger, Stift oder Maus.",
    // {ort} ist der Ort des Vereins (konfig.verein.ort); fehlt er, steht nur das Datum.
    ortDatum: "Ort und Datum: {ort}, {datum}",
    nurDatum: "Datum: {datum}",
    satzung: "Ich habe die Satzung zur Kenntnis genommen.",
    satzungLink: "Satzung lesen",
    satzungOhneLink: "Die Satzung findest du auf der Internetseite des Vereins.",
    weiter: WEITER,
  },

  // ---------- 12 pruefen ----------

  pruefen: {
    titel: "Stimmt alles?",
    text: "Prüfe deine Angaben. Mit „Ändern“ korrigierst du etwas.",
    aendern: "Ändern",
    aendernLang: "{bereich} ändern",
    bereiche: {
      du: "Du",
      einsatz: "Einsatz",
      notfall: "Notfall",
      erfahrung: "Erfahrung",
      ausstattung: "Trainerausstattung",
      unterlagen: "Unterlagen",
      zeugnis: "Führungszeugnis",
      unterschrift: "Unterschrift",
    },
    zeilen: {
      name: "Name",
      geboren: "Geboren",
      adresse: "Adresse",
      handy: "Handy",
      email: "E-Mail",
      abteilung: "Abteilung",
      mannschaft: "Mannschaft",
      gruppe: "Gruppe",
      rolle: "Rolle",
      seit: "Dabei seit",
      tage: "Wann kannst du",
      notfall: "Notfallkontakt",
      erfahrung: "Erfahrung und Qualifikationen",
      ersteHilfe: "Erste-Hilfe-Kurs",
      groessen: "Größen",
      foto: "Passfoto",
      kodex: "Verhaltenskodex",
      selbstauskunft: "Selbstauskunft",
      zeugnis: "Zeugnis",
      unterschrift: "Unterschrift",
      satzung: "Satzung",
    },
    werte: {
      foto: "Foto ist gespeichert",
      kodex: "Gelesen",
      selbstauskunft: "Bestätigt",
      zeugnis: "Antrag auf Gebührenbefreiung", // PRUEFEN_AP3
      ja: "Ja",
      offen: "Noch offen",
      nichtAngegeben: "Nicht angegeben (freiwillig)",
      ersteHilfe: "Absolviert am {datum}",
      // eine Größe auf „Prüfen“: „Shirt: M“ ({artikel} ist die Beschriftung aus ausstattung.shirt …, {groesse} die gewählte Größe)
      groesse: "{artikel}: {groesse}",
    },
    unterschriftAlt: "Deine Unterschrift",
    kastenTitel: "Das solltest du wissen",
    // {kurz}: Namensteil der Einsichtnehmenden ohne Funktion (trainer-einsicht.js)
    kastenText: "Dein Führungszeugnis bringst du persönlich zu {kurz}. Es wird nicht abgegeben.", // PRUEFEN_AP3
    weiter: "Alles stimmt – Datei erstellen",
  },

  // ---------- 13 fertig ----------

  fertig: {
    titel: "Dein Paket ist fertig",
    titelArbeit: "Wir erstellen deine Datei",
    titelFehler: "Das hat nicht geklappt",
    arbeitet: "Einen Moment bitte. Die Datei wird erstellt.",
    nochmal: "Noch einmal versuchen",
    paketTitel: "Das steht im Paket",
    teilen: "Datei teilen",
    herunterladen: "Datei herunterladen",
    vorschau: "Vorschau",
    // Am iPhone zeigt Safari eine PDF oft nur an, statt sie zu speichern: Dann hilft „Teilen“ in der Ansicht.
    gespeichert: "Die Datei wird gespeichert. Sie liegt meist im Ordner „Downloads“. Zeigt dein Handy sie nur an, tippe dort auf „Teilen“.",
    geteilt: "Geteilt.",
    // „Datei teilen“ legt die Adresse der Geschäftsstelle in die Zwischenablage (das Teilen kann keinen Empfänger mitgeben);
    // die Meldung nennt das nur, wenn es geklappt hat.
    geteiltMitAdresse: "Geteilt. Die Adresse ist kopiert.",
    teilenFehler: "Teilen geht hier nicht. Die Datei wurde stattdessen gespeichert.",
    // Hinweis, wenn die Erzeugung Mängel meldet (trainer-pdf.js › warnungen, zum Beispiel ein Zeichen, das die PDF-Schrift nicht kennt)
    warnungTitel: "Bitte prüfen",
    warnung: "Bitte prüfe die Vorschau: In der Datei fehlen vielleicht einzelne Zeichen.",
    // Meldungen, wenn das Erstellen scheitert (je Art des Fehlers, siehe trainer.js › FEHLER_SCHLUESSEL; {mail} ist die Adresse der Geschäftsstelle)
    fehler: {
      bibliothek: "Ein Programmteil lässt sich nicht laden. Bitte prüfe die Internetverbindung.",
      konfig: "Die Seite ist noch nicht ganz eingerichtet. Bitte schreib an {mail}.",
      angaben: "Eine Angabe fehlt oder passt nicht. Bitte gehe zurück und prüfe deine Angaben.",
      unterschrift: "Deine Unterschrift fehlt oder lässt sich nicht lesen. Bitte gehe zurück und unterschreibe noch einmal.",
      foto: "Dein Passfoto fehlt oder lässt sich nicht lesen. Bitte gehe zurück und wähle das Foto noch einmal.",
      pdf: "Die Datei konnte nicht erstellt werden. Bitte versuche es noch einmal.",
    },
    fehlerTitel: "Achtung",
    // Betreff und Text der E-Mail beim Teilen und beim Link „E-Mail öffnen“ (wie im Anmelde-Assistenten auf Deutsch)
    mail: {
      betreff: "Trainerunterlagen {vorname} {nachname}",
      text: "Guten Tag,\n\nanbei meine Unterlagen für das Trainerteam als PDF.\n\nViele Grüße",
    },
    sendenTitel: "So schickst du die Datei an den Verein",
    handy: "Am Handy",
    handySchritte: [
      "Tippe oben auf „Datei teilen“.",
      "Wähle dein Mail-Programm.",
      "Schicke die E-Mail an die Adresse unten.",
    ],
    computer: "Am Computer",
    computerSchritte: [
      "Klicke oben auf „Datei herunterladen“.",
      "Schreibe eine neue E-Mail. Hänge die Datei an.",
      "Schicke die E-Mail an die Adresse unten.",
    ],
    adresseTitel: "Die E-Mail-Adresse der Geschäftsstelle:",
    kopieren: "Adresse kopieren",
    kopiert: "Die Adresse ist kopiert.",
    kopierenFehler: "Kopieren geht hier nicht. Die Adresse ist markiert. Kopiere die Adresse selbst.",
    oeffnen: "E-Mail an die Geschäftsstelle öffnen",
    nichtWhatsapp: "Bitte schicke die Datei nicht per WhatsApp. Sie enthält persönliche Daten.",
    weiterTitel: "So geht es weiter",
    // nur: "beantragen" = der Schritt gilt nur, wenn das Zeugnis noch beantragt werden muss. {kurz}: Namensteil der Einsichtnehmenden
    // ohne Funktion (trainer-einsicht.js); {frist}: Beginn plus Schnupperphase.
    schritte: [
      { wer: "Verein:", text: "Unterschreibt deinen Antrag auf Gebührenbefreiung und schickt ihn dir zurück.", nur: "beantragen" }, // PRUEFEN_AP3
      { wer: "Du:", text: "Beantragst damit dein Führungszeugnis.", nur: "beantragen" }, // PRUEFEN_AP3
      { wer: "Du:", text: "Zeigst es persönlich {kurz}.", nur: null }, // PRUEFEN_AP3
      { wer: null, text: "Bis zum {frist} sollte alles erledigt sein: Datei geschickt, Zeugnis gezeigt.", nur: null },
    ],
    fussnote: PRIVAT,
  },
};
