/*
  Texte der Oberfläche des Anmelde-Assistenten - Englisch (British English).
  Übersetzungshilfe: Verbindlich ist der deutsche Text (de-oberflaeche.js), das PDF bleibt deutsch.
  Stand 08.10.2026. Dieselbe Schlüsselstruktur wie de-oberflaeche.js, aber ohne "sprachen" und
  ohne "demo" (die Vorführung bleibt deutsch). Fehlt hier ein Eintrag, gilt der deutsche.
  Prüfung: node tools/anmeldung-test/uebersetzung-pruefen.mjs

  Stil: einfach und kurz wie das Deutsche - ein Gedanke pro Satz, kurze Wörter, aktiv, höfliches "you".
  Zahlen als westliche Ziffern 0-9. Platzhalter wie {name}, {datum}, {jahr} bleiben unverändert;
  die Varianten kind/selbst und die Zeilenumbrüche \n stehen wie im Deutschen.
  Deutsche Dokumentnamen stehen in Klammern hinter der Übersetzung, damit die Familie bei einer
  deutschen Stelle danach fragen kann, zum Beispiel: birth certificate (Geburtsurkunde).
  Den Verband nennen wir beim ersten Vorkommen auf einer Seite so: Hessian Football Association
  (Hessischer Fußball-Verband, HFV). Danach steht kurz: the association.
  Altersklassen (D-Jugend, Herren ...) und Gruppennamen des Karnevals sind Eigennamen und bleiben deutsch.

  Begriffsliste (Deutsch = English) - gilt für Oberfläche und Regeltexte:
  Verein = club
  alter Verein = old club
  neuer Verein = new club
  Verband (Hessischer Fußball-Verband, HFV) = association (Hessian Football Association)
  Mannschaft = team
  Abteilung = department
  Training = training
  Spiel = match
  Pflichtspiel (Liga oder Pokal) = league or cup match
  Freundschaftsspiel = friendly match
  Wartezeit = waiting period
  Spielrecht, Spielberechtigung = permission to play
  Spielerpass = player pass
  Freigabe = release
  Sperre = suspension
  Abmeldung = deregistration
  Kündigung = cancellation of the membership
  Mitgliedschaft = membership
  Mitglied = member
  passives Mitglied = passive member
  Beitrag = membership fee
  Aufnahmegebühr = joining fee
  Lastschrift = direct debit
  Rechnung = invoice
  Kontoinhaber = account holder
  Sorgerecht = custody
  Sorgeberechtigte = person with custody
  Elternteil = parent
  Vormund = legal guardian
  Unterschrift = signature
  mit Stift unterschreiben = sign with a pen
  am Bildschirm unterschreiben = sign on the screen
  Unterlagen = documents
  Nachweis = proof
  Kopie = copy
  Foto machen = Take a photo
  Datei wählen = Choose a file
  Habe ich = I have it
  Fehlt noch = Still missing
  Hilfe = Help
  Zurück = Back
  Weiter = Next
  Prüfen = check
  Ändern = Change
  PDF-Datei = PDF file
  Ausdrucken = print out
  Vereinsheim = clubhouse
  Geschäftsstelle = club office
  Jugendleitung = youth department
  Karnevalabteilung = carnival department
  Einschreiben = registered letter
  Vollmacht = authorisation
  Attest = medical certificate
  Geburtsurkunde = birth certificate
  Meldebescheinigung = residence certificate
  Reisepass = passport
  Personalausweis = ID card
  Aufenthaltstitel = residence permit
  Bürgeramt = registration office
  Jobcenter = Jobcenter
  Sozialamt = social welfare office
  Bildung und Teilhabe = Education and Participation
  Jugendamt = youth welfare office
  Aufnahmeantrag = membership application
  Datenschutz = data protection
  Erlaubnis = permission
  Einverständnis, Einwilligung = consent
  Staatsangehörigkeit = nationality
  Notfallkontakt = emergency contact
  Gesundheitsbogen = health form
  Erlaubnis für Fotos = permission for photos
  Erlaubnis für die Lastschrift = permission for direct debit
  Satzung = statutes (the rules of the club)
*/

export default {
  // ---------- Rahmen der Seite (Bauzeit) ----------

  seite: {
    h1: "Register with FFV Sportfreunde 04",
    titel: "Registration (draft)",
    beschreibung:
      "Draft of the registration assistant for FFV Sportfreunde 04. You register step by step. At the end you get a PDF file.",
    lead: "We ask step by step. At the end you get a file with all the documents.",
    assistentTitel: "Registration assistant",
    laedt: "The assistant is loading. If nothing happens, please call us: 069 736868.",
    ohneSkript: "The assistant needs JavaScript. Please turn it on. Or call us: 069 736868.",
    ladefehler: "The assistant cannot be loaded. Please call us: 069 736868.",
  },

  band: {
    text: "Draft for viewing only. Please do not enter real data. Nothing is sent.",
    kurz: "Draft – please no real data.",
  },

  // ---------- Allgemeines ----------

  allgemein: {
    freiwillig: "(optional)",
    tag: "Day",
    monat: "Month",
    jahr: "Year",
    datumHinweis: "For example: 27 3 2015",
    datumHinweisMonat: "For example: 3 2019",
    bitteWaehlen: "Please choose",
    haeufigeLaender: "Common countries",
    alleLaender: "All countries",
    ja: "Yes",
    nein: "No",
    weissNicht: "I do not know",
    dasKind: "the child",
    diePerson: "the person",
    entfernen: "Remove",
    schliessen: "Close",
    aendern: "Change",
    moment: "One moment, please …",
    datei: "File",
    keineAngabe: "not specified",
    jahre: "years",
    wochentag: {
      montag: "Monday",
      dienstag: "Tuesday",
      mittwoch: "Wednesday",
      donnerstag: "Thursday",
      freitag: "Friday",
      samstag: "Saturday",
      sonntag: "Sunday",
    },
  },

  kopf: {
    zurueck: "Back",
    zurueckLang: "Go back one step",
    hilfe: "Help",
    sprache: "Language",
    abschnitte: "Sections",
    hierSindSie: "You are here:",
  },

  // Trenner zwischen den Teilen einer Aufzählung (Arabisch: "، ").
  liste: {
    trenner: ", ",
  },

  abschnitte: {
    person: "Person",
    fussballKarneval: "Football / carnival",
    kontakt: "Contact",
    beitrag: "Fee",
    unterlagen: "Documents",
    unterschrift: "Signature",
    fertig: "Done",
  },

  nav: {
    weiter: "Next",
    zurPruefung: "Save and go back to the check",
  },

  fuss: {
    privat: "Everything stays on your device. We do not send anything.",
    loeschen: "Delete all entries",
  },

  loeschen: {
    titel: "Delete all entries?",
    text: "Then all entries and photos are gone. This cannot be undone.",
    ja: "Yes, delete everything",
    nein: "No, keep them",
    fertig: "All entries are deleted.",
  },

  sprache: {
    fehlt: "This language is not available yet. It stays in German.",
    teilweise: "Part of this is not translated yet. There it stays in German.",
    uebersetzungshilfe: "Translation aid. The German text is the binding one.",
  },

  hilfe: {
    titel: "Help",
    einleitung: "We are happy to help you. Call us or write to us.",
    uebersetzen: "You can bring someone to translate.",
    kontakte: [
      { schluessel: "geschaeftsstelle", tel: "069 736868", mail: "geschaeftsstelle@sportfreunde04.de" },
      { schluessel: "jugendleitung", mail: "jugendleitung@sportfreunde04.de" },
      { schluessel: "karneval", mail: "karnevalabteilung@sportfreunde04.de" },
    ],
    geschaeftsstelle: "Club office (Geschäftsstelle)",
    geschaeftsstelleWofuer: "All questions about registration",
    jugendleitung: "Youth department (Jugendleitung)",
    jugendleitungWofuer: "Questions about football and the teams",
    karneval: "Carnival department (Karnevalabteilung)",
    karnevalWofuer: "Questions about dancing",
    anrufen: "Call",
    schreiben: "Write an email",
  },

  // ---------- App ----------
  // In der Vereins-App (Seite mit ?app=1) klappt Speichern oder Teilen der Datei manchmal nicht.
  // Der Link "Im Browser öffnen" führt auf dieselbe Seite ohne ?app=1.

  app: {
    hinweisStart: "In the app, saving the PDF file sometimes does not work. Then open the registration in the browser.",
    hinweisFertig: "Is saving not working? Then open the registration in the browser.",
    fehler: "Saving did not work. Open the registration in the browser.",
    browser: "Open in browser",
  },

  // ---------- Fehlermeldungen ----------

  fehler: {
    seite: "This page cannot be shown. Please call us: 069 736868.",
    titelEins: "Please check this entry:",
    titelMehr: "Please check these {anzahl} entries:",
    wahl: "Please choose an answer.",
    text: "Please fill in this field.",
    wer: "Please choose who wants to become a member.",
    vorname: "Please enter the first name.",
    nachname: "Please enter the last name.",
    lateinisch: "Please write the name in Latin letters, as in the passport.",
    lateinischOrt: "Please write the place name in Latin letters, as in the passport.",
    lateinischAnschrift: "Please write the address in Latin letters.",
    lateinischVerein: "Please write the details about the club in Latin letters.",
    lateinischText: "Please write in Latin letters.",
    lateinischNummer: "Please write the number with the digits 0 to 9.",
    satzung: "Please read the statutes (Satzung) and tick the box.",
    uhrzeit: "Please write the time like this: 21:30.",
    datumLeer: "Please enter the date.",
    datumUnvollstaendig: "Please enter the day, month and year.",
    datumUnvollstaendigMonat: "Please enter the month and year.",
    datumUngueltig: "This date does not exist. Please check it.",
    datumZukunft: "The date is in the future. Please check it.",
    datumZuAlt: "The year is too far back. Please check it.",
    geburtsort: "Please enter the place of birth.",
    geburtsland: "Please choose the country of birth.",
    geschlecht: "Please choose the gender.",
    spielrechtFuer: "Please choose the teams.",
    abteilung: "Please choose a department.",
    spielen: "Please choose an answer.",
    spielerpass: "Please choose an answer.",
    region: "Please choose where the club is.",
    vereinsname: "Please enter the name of the club.",
    vereinsort: "Please enter the town of the club.",
    vereinsland: "Please choose the country.",
    abmeldung: "Please choose an answer.",
    abmeldeweg: "Please choose how you deregister.",
    mitgliedschaft: "Please choose an answer.",
    sperre: "Please choose an answer.",
    freigabe: "Please choose an answer.",
    wechsel: "Please choose an answer.",
    deutsch: "Please choose an answer.",
    staaten: "Please choose at least one nationality.",
    staatLeer: "Please choose a country or remove the line.",
    staatenNichtDeutsch: "Germany does not fit “no German passport”. Please check this.",
    staatenDeutsch: "You said there is a German passport. Please choose Germany.",
    ausland: "Please choose an answer.",
    auslandLand: "Please choose the country.",
    auslandStadt: "Please enter the city.",
    wohnen: "Please choose an answer.",
    ohneElternGrund: "Please choose the reason.",
    geborenInDe: "Please choose an answer.",
    jahreInDe: "Please enter a number from 0 to 18.",
    sorge: "Please choose an answer.",
    rolle: "Please choose who this person is.",
    strasse: "Please enter the street and house number.",
    plz: "The postcode has 5 digits.",
    ort: "Please enter the town.",
    email: "Please enter a valid email address.",
    telefon: "Please enter at least one phone number.",
    beitragGruppe: "Please choose a fee group.",
    familie: "Please enter at least one family member.",
    senator: "Please choose an answer.",
    leistungen: "Please choose an answer.",
    zahlungArt: "Please choose how you pay.",
    kontoinhaber: "Please choose an answer.",
    kiVorname: "Please enter the first name of the account holder.",
    kiNachname: "Please enter the last name of the account holder.",
    ibanLeer: "Please enter the IBAN.",
    ibanFormat: "The IBAN has the wrong format. Please check it.",
    ibanLand: "For direct debit (Lastschrift) we need an account in Europe. Otherwise choose “Invoice”.",
    ibanLaenge: "The IBAN has too few or too many characters. Please check it.",
    ibanPruefziffer: "The IBAN is not correct. Please check the digits.",
    fotos: "Please choose an answer.",
    medien: "Please choose at least one option.",
    notfallName: "Please enter the name.",
    notfallTelefon: "Please enter the phone number.",
    gesundheitsbogen: "Please choose an answer.",
    spielerfoto: "Please choose how we get the photo.",
    spielerfotoBild: "Please add a photo. Or choose “The club takes the photo”.",
    nachweisDatei: "Please add a photo or a file. Or choose “Still missing”.",
    unterschriftWeg: "Please choose how you sign.",
    unterschrift: "Please sign in the box. Or choose “I sign everything on paper” above.",
    hfvUnterschrift: "Please choose when you sign the pages.",
    bild: {
      typ: "This file is not a photo and not a PDF.",
      heic: "The browser cannot read this image format. Please take the photo again.",
      nichtLesbar: "The image cannot be opened. Please choose another one.",
      zuGross: "The file is too big. Please choose a smaller file.",
      zuKlein: "The image is too small. Please take a bigger photo.",
      leer: "The file is empty. Please choose another one.",
    },
  },

  // ---------- Schritte ----------

  start: {
    titel: "Welcome",
    einleitung: "Here you register yourself or your child with the club.\nWe ask you step by step.",
    ergebnis: "At the end you get a PDF file.\nThis is a file to view and print.\nIt contains all the documents for the club.",
    brauchenTitel: "You need:",
    brauchen: [
      "Name and date of birth",
      "Your address, email and phone number",
      "For direct debit (Lastschrift): the IBAN (bank account number)",
      "A phone with a camera for photos of documents",
    ],
    dauer: "You need about 15 minutes.",
    datenschutz: "Your details stay on your device.\nWe do not send anything.",
    hilfe: "Do you need help? Tap “Help” at the top.",
    spracheTitel: "Choose a language",
    los: "Let’s start",
  },

  wer: {
    titel: "Who would like to become a member?",
    kind: "My child",
    kindHinweis: "You fill in everything for your child.",
    selbst: "Myself",
    selbstHinweis: "You register yourself.",
    mehrere: "Do you want to register several people?\nAt the end you can register the next person.\nWe then keep your address and your payment details.",
  },

  name: {
    titel: { kind: "What is your child’s name?", selbst: "What is your name?" },
    hinweis: "Write the name as it is in the passport.\nUse Latin letters.",
    vorname: "First name",
    vornameHinweis: "All first names, as in the passport.",
    nachname: "Last name",
  },

  geburt: {
    datum: {
      titel: { kind: "When and where was your child born?", selbst: "When and where were you born?" },
      legende: "Date of birth",
      ort: "Place of birth",
      ortHinweis: "The town or city.",
      land: "Country of birth",
    },
    geschlecht: {
      titel: { kind: "What gender does your child have?", selbst: "What gender do you have?" },
      hinweis: "The entry in the passport or ID card counts.",
      m: "Male",
      w: "Female",
      d: "Diverse",
      ohne_angabe: "Not specified",
      spielrechtTitel: "For which teams should the player play?",
      spielrechtHinweis: "The person decides this. For children, the parents decide too.",
      spielrechtM: "Boys and men",
      spielrechtW: "Girls and women",
    },
  },

  abteilung: {
    titel: { kind: "Where should your child take part?", selbst: "Where would you like to take part?" },
    fussball: "Football",
    fussballHinweis: "Training and matches",
    karneval: "Carnival",
    karnevalHinweis: "Dancing with the Schnauzer",
    beides: "Football and carnival",
    beidesHinweis: "Both in one club",
    passiv: "Support only",
    passivHinweis: "You are a member. You do not do any sport.",
  },

  mannschaft: {
    titel: { kind: "Which team fits your child?", selbst: "Which team fits you?" },
    alter: "{name} is {alter} years old. This is birth year {jahrgang}.",
    klasse: "This fits the {klasse}-Jugend (youth team).",
    klasseHerren: "This fits the Herren (men’s team).",
    mannschaften: "Teams at the club: {namen}.",
    keine: "The club has no team of its own for this birth year.",
    keineFolge: "The youth department will contact you.",
    unbekannt: "We cannot work out the team yet.",
  },

  spielen: {
    titel: { kind: "Should your child take part in matches?", selbst: "Would you like to take part in matches?" },
    erklaerung: "Anyone who wants to play needs permission to play (Spielrecht) from the Hessian Football Association (Hessischer Fußball-Verband, HFV).\nThe club applies for this for you.\nThis sometimes takes a few weeks.",
    ja: { kind: "Yes, in matches and football festivals (Spielfeste)", selbst: "Yes, in matches" },
    jaHinweis: "The club applies for the permission to play (Spielrecht).",
    nein: "No, training only",
    neinHinweis: "You can still change this later.",
  },

  spielerpass: {
    titel: { kind: "Has your child ever had a player pass (Spielerpass)?", selbst: "Have you ever had a player pass (Spielerpass)?" },
    hinweis: { kind: "Even if the child only trained. Also abroad.", selbst: "Even if you only trained. Also abroad." },
    erklaerung: "A player pass (Spielerpass) is the ID card for matches in a club.",
    weissNichtHinweis: "The club checks this for you.",
  },

  alterVerein: {
    titel: "Which club was that?",
    region: "Where is the club?",
    hessen: "In Hesse",
    bundesland: "In another German state",
    ausland: "In another country",
    name: "Name of the club",
    ort: "Town of the club",
    land: "Country of the club",
    verband: "Football association there",
    verbandHinweis: "Only if you know it.",
  },

  abmeldung: {
    status: {
      titel: { kind: "Has your child been deregistered from the old club?", selbst: "Have you been deregistered from the old club?" },
      hinweis: "We mean deregistration as a player.\nThis does not end the membership in the old club.\nAn email to the old club is not enough.\nThe Hessian Football Association (Hessischer Fußball-Verband, HFV) needs a registered letter (Einschreiben).\nOr you sign the authorisation for the deregistration (Vollmacht für die Abmeldung).",
      einschreiben: "Yes, by registered letter (Einschreiben)",
      einschreibenHinweis: "You have the receipt from the post office.",
      formlos: "Yes, but only by email or message",
      formlosHinweis: "This does not count as deregistration.",
      noch_nicht: "No, not yet",
      weiss_nicht: "I do not know",
    },
    datum: {
      titel: "When did you deregister?",
      legende: "Date of deregistration",
      hinweis: "For a registered letter (Einschreiben), the date on the receipt counts.",
    },
    weg: {
      titel: "How do you deregister?",
      vollmacht: "With an authorisation (Vollmacht)",
      vollmachtHinweis: "You sign the authorisation for the deregistration (Vollmacht für die Abmeldung). Then the club deregisters you.",
      einschreiben: "With a registered letter (Einschreiben)",
      einschreibenHinweis: "You send the registered letter (Einschreiben) to the old club yourself.",
    },
    mitgliedschaft: {
      titel: { kind: "Does your child stay a member of the old club?", selbst: "Do you stay a member of the old club?" },
      hinweis: "The membership does not end by itself.\nIt also does not end when you deregister from playing.",
      kuendigen: "No, I cancel",
      kuendigenHinweis: "You cancel the membership (Kündigung) at the old club.",
      passiv: "Yes, as a passive member",
      passivHinweis: { kind: "Your child no longer plays there. Your child stays a member.", selbst: "You no longer play there. You stay a member." },
      weiss_nicht: "I do not know",
    },
    anschrift: {
      titel: "Where does the registered letter (Einschreiben) to the old club go?",
      hinweis: "You do not have to enter anything. The club helps you.\nWe enter the address in the form for deregistration from the old club (Abmeldung).",
      empfaenger: "Name of the recipient",
      empfaengerHinweis: "For example: board of the club",
      strasse: "Street and house number",
      plzOrt: "Postcode and town",
    },
    spiele: {
      titel: "When was the last match?",
      hinweis: "If you do not know a date, leave the field empty.",
      letztes: "Last match",
      pflicht: "Last league or cup match",
      pflichtHinweis: "Friendly matches do not count here.",
    },
    sperre: {
      titel: "Is there a suspension?",
      hinweis: "With a suspension, the person may not play some matches.",
      bis: "Until when does the suspension last?",
      bisHinweis: "If you do not know, leave the field empty.",
    },
    freigabe: {
      titel: { kind: "Does the old club release your child?", selbst: "Does the old club release you?" },
      hinweis: "Release (Freigabe) means: the old club agrees to the move.",
      jaHinweis: "The old club has agreed.",
    },
    wechsel: {
      titel: { kind: "Has your child already changed clubs in the last 6 months?", selbst: "Have you already changed clubs in the last 6 months?" },
      hinweis: "This means a move from one club to another.",
    },
  },

  pass: {
    deutsch: {
      titel: { kind: "Does your child have a German passport or ID card?", selbst: "Do you have a German passport or ID card?" },
      hinweis: "A German child passport (Kinderreisepass) also counts.",
    },
    staaten: {
      titel: { kind: "Which nationalities does {name} have?", selbst: "Which nationalities do you have?" },
      hinweis: "Name all of them. They are in the passport.",
      label: "Nationality {nummer}",
      hinzu: "Add another nationality",
      entfernen: "Remove nationality {nummer}",
    },
  },

  ausland: {
    titel: { kind: "Has your child ever lived abroad?", selbst: "Have you ever lived abroad?" },
    hinweis: "Abroad means: not in Germany.",
    land: "Country",
    landHinweis: "The last place of residence before Germany.",
    stadt: "City",
  },

  wohnen: {
    ort: {
      titel: { kind: "Where does your child live?", selbst: "Where do you live?" },
      gemeinsam: { kind: "With me at the same address", selbst: "With my parents at the same address" },
      gemeinsamHinweis: { kind: "We are registered with the authorities at the same address.", selbst: "We are registered with the authorities at the same address." },
      nicht_gemeinsam: { kind: "In Germany, but at a different address", selbst: "In Germany, but not with my parents" },
      nicht_gemeinsamHinweis: { kind: "We are registered with the authorities at different addresses.", selbst: "We are registered with the authorities at different addresses." },
      verwandte: "With relatives in Germany",
      ohne_eltern: "Without parents in Germany",
    },
    seit: {
      titel: { kind: "Since when have you lived in Germany with {name}?", selbst: "Since when have you lived in Germany with your parents?" },
      legende: "Since when",
    },
    grund: {
      titel: { kind: "Why does {name} live in Germany without parents?", selbst: "Why do you live in Germany without parents?" },
      gefluechtet: "Because of fleeing",
      austausch: "For a school exchange",
      verwandte: "With relatives",
      pflege: "In a foster family",
    },
    dauer: {
      titel: { kind: "How long has {name} lived in Germany?", selbst: "How long have you lived in Germany?" },
      geboren: { kind: "Was {name} born in Germany?", selbst: "Were you born in Germany?" },
      jahre: "How many years without a break?",
      jahreHinweis: "A number, for example: 5",
    },
  },

  sorge: {
    recht: {
      titel: { kind: "Who has custody of {name}?", selbst: "Who has custody of you?" },
      hinweis: "Custody (Sorgerecht) means: who may decide for the child.",
      beide: "Both parents",
      getrennt_bei_mir: "The parents live apart",
      getrennt_bei_mirHinweis: "The child lives with me.",
      allein: "I have sole custody",
      vormund: "A legal guardian (Vormund)",
      vormundHinweis: "A court has appointed the guardian (Vormund).",
      pflege: "Foster parents or carers",
      einverstanden: "The other parent agrees.",
      einverstandenHinweis: "Please ask them first.",
    },
    zweiterMitStift: "Has the other parent agreed? Then tick the box.\nIf not: he or she signs the membership application (Aufnahmeantrag) too.\nThis only works with a pen. The spot is marked in the PDF.",
    personen: {
      titel: { kind: "Who decides for {name}?", selbst: "Who decides for you?" },
      hinweis: "We ask for the phone number later.",
      erste: { kind: "Your details", selbst: "First person" },
      zweite: "Second person",
      rolle: "Who is this?",
      mutter: "Mother",
      vater: "Father",
      vormund: "Legal guardian (Vormund)",
      pflege: "Foster parents or carers",
      andere: "Other person",
      vorname: "First name",
      nachname: "Last name",
    },
  },

  besonderes: {
    titel: "Is there anything special?",
    hinweis: "Tick what applies. If nothing applies, go on.",
    legende: "What applies?",
    maedchen: "A girl should play in a boys’ team.",
    maedchenHinweis: "This works in the C-Jugend and B-Jugend. The parents must agree.",
    herrenAushilfe: "The young person should also help out in the men’s team (Herren).",
    herrenAushilfeHinweis: "This needs the parents’ consent and a medical certificate (Attest).",
    sonderspielrecht: "Playing should be in a younger age group.",
    sonderspielrechtHinweis: "This is possible, for example, with a disability. It needs an application.",
    frauHerren: "A woman wants to play in the men’s team (Herren).",
    frauHerrenHinweis: "This needs an application to the association.",
  },

  karneval: {
    gruppe: {
      titel: { kind: "Which group should {name} dance in?", selbst: "Which group would you like to dance in?" },
      weissNicht: "I do not know",
      weissNichtHinweis: "The club will tell you.",
      uebung: "Practice time: {zeit}",
      // Wochentag und "Uhr" folgen der Sprache; der Ort steht, wie im Verein üblich, auf Deutsch (siehe seiten-fussball.js).
      uebungszeit: "{tag} {zeit}, {ort}",
      uebungszeitOhneOrt: "{tag} {zeit}",
      passt: "Fits the age",
    },
    woanders: {
      titel: { kind: "Does {name} already dance in another club?", selbst: "Do you already dance in another club?" },
    },
    turnier: {
      titel: { kind: "Should {name} take part in tournaments?", selbst: "Would you like to take part in tournaments?" },
      hinweis: "At tournaments the groups dance against each other.",
    },
    abend: {
      titel: { kind: "May {name} perform in the evening without parents?", selbst: "May you perform in the evening?" },
      hinweis: "In the evening there are performances at parties and carnival shows.\nFor evening performances there is an extra form.",
    },
    abholung: {
      titel: { kind: "Who will pick up your child?", selbst: "Who will pick you up?" },
      hinweis: "This question is voluntary.\nThen the club knows who will pick up after the performance.",
      name: "Name of the person who picks up",
      nameHinweis: "If several people pick up, write all the names.",
    },
    allein: {
      titel: { kind: "May your child go home alone?", selbst: "May you go home alone?" },
      hinweis: "This question is voluntary.\nThe answer appears later on the permission for evening performances.",
      ab: "From what time?",
      abHinweis: "Write the time like this: 21:30.",
    },
  },

  kontakt: {
    anschrift: {
      titel: { kind: "Where does {name} live?", selbst: "Where do you live?" },
      strasse: "Street and house number",
      plz: "Postcode",
      ort: "Town",
    },
    erreichen: {
      titel: "How can we reach you?",
      hinweisKind: "Please enter your details as a parent here.",
      email: "Email",
      emailHinweis: "We send important messages there.",
      mobil: "Mobile number",
      telefon: "Landline number",
      telefonHinweis: "Please give at least one phone number.",
    },
  },

  beitrag: {
    gruppe: {
      titel: { kind: "Which membership fee do you pay for {name}?", selbst: "Which membership fee do you pay?" },
      vorschlagKopf: "We suggest: {gruppe}.",
      vorschlag: "This costs {jahr} euros a year.\nThat is {monat} euros a month.",
      vorschlagOhneMonat: "This costs {jahr} euros a year.",
      aufnahme: "There is also a one-time joining fee of {betrag} euros.",
      andere: "You can choose a different group.",
      legende: "Fee group",
      proJahr: "{jahr} euros a year",
      doppel: "You are in football and carnival.\nA separate fee may apply.\nThe club will tell you.",
      vorgeschlagen: "Suggestion",
    },
    familie: {
      titel: "Who else belongs to the family?",
      hinweis: "Name the other members in the family fee.\nYou can enter up to 6 people.",
      person: "Family member {nummer}",
      vorname: "First name",
      nachname: "Last name",
      geburtsdatum: "Date of birth",
      hinzu: "Add another family member",
      entfernen: "Remove family member {nummer}",
      voll: "More than 6 people do not fit on the list. Please call us.",
      fehlerVorname: "Please enter the first name.",
      fehlerNachname: "Please enter the last name.",
    },
    senator: {
      titel: "Would you like to become a senator?",
      hinweis: "Senators support the carnival department.\nThey pay a special fee.\nThe board decides on the application.",
      ja: "Yes, I apply",
      nein: "No",
    },
  },

  leistungen: {
    titel: { kind: "Does your family receive money from the authorities?", selbst: "Do you receive money from the authorities?" },
    hinweis: "For example basic income support (Grundsicherungsgeld), social assistance (Sozialhilfe), housing benefit (Wohngeld), child supplement (Kinderzuschlag) or asylum seeker benefits (Asylbewerberleistungen).\nThen the office often pays the membership fee.\nThis is called Education and Participation (Bildung und Teilhabe).",
    ja: "Yes",
    nein: "No",
    jaHinweis: "Talk to us. We issue a certificate.",
    wenigGeld: "Do you have little money? Talk to us.",
  },

  zahlung: {
    art: {
      titel: "How would you like to pay?",
      sepa: "Direct debit (Lastschrift), recommended",
      sepaHinweis: "The club collects the membership fee once a year.",
      rechnung: "Invoice",
      rechnungHinweis: "You transfer the membership fee yourself.",
      zuschlag: "A surcharge of {zuschlag} euros a year may apply.",
    },
    inhaber: {
      titel: "Who owns the account?",
      ich: "Me",
      andere: "Another person",
      person: "Account holder",
      vorname: "First name",
      nachname: "Last name",
      anschriftGleich: "The person lives at the same address.",
      strasse: "Street and house number",
      plz: "Postcode",
      ort: "Town",
    },
    iban: {
      titel: "What is the IBAN?",
      iban: "IBAN",
      ibanHinweis: "The IBAN is on your bank card.\nSpaces do not matter.",
      bank: "Name of the bank",
    },
  },

  einwilligungen: {
    fotos: {
      titel: { kind: "May we show photos of your child?", selbst: "May we show photos of you?" },
      hinweis: "You decide freely. You can change this later.",
      ja: "Yes",
      jaHinweis: "You choose where in a moment.",
      nein: "No",
      medienLegende: "Where may we show photos?",
      medienHinweis: "Choose at least one option.",
      intern: "In the club: notice boards and newsletters",
      web: "On the internet: website, social media and club app",
      presse: "In the newspaper: reports about the club",
      dokumentation: "In anniversary books and chronicles",
    },
    hfv: {
      titel: "What may the Hessian Football Association (Hessischer Fußball-Verband, HFV) publish?",
      hinweis: "Both are voluntary. You can change this later.",
      name: "The name may appear on FUSSBALL.DE.",
      nameHinweis: "This applies to children under 16.",
      foto: "The photo may appear on the internet.",
      fotoHinweis: "For example on FUSSBALL.DE.",
      ab16: "From age 16 the association may show the name without consent. You can object.",
    },
    fahrten: {
      titel: "Trips and messages",
      hinweis: "Both are voluntary. You can change this later.",
      fahrten: "{name} may travel to matches and tournaments.",
      fahrtenHinweis: "For example in the cars of other parents.",
      messenger: "{name} may join the messenger group of the team.",
      messengerHinweis: "Dates and arrangements are posted there.",
    },
  },

  notfall: {
    kontakt: {
      titel: "Who do we call in an emergency?",
      hinweis: "Name a person who can be reached quickly.",
      name: "Name",
      telefon: "Phone number",
      beziehung: "Who is this?",
      beziehungHinweis: "For example: grandma or neighbour",
    },
    bogen: {
      titel: "Would you like to fill in a health form (Gesundheitsbogen)?",
      hinweis: "It is voluntary.\nIt helps with allergies and illnesses.\nOnly coaches and team supervisors see it.",
      ja: "Yes, I fill it in",
      nein: "No",
    },
    gesundheit: {
      titel: "Health of {name}",
      hinweis: "All fields are voluntary.\nThe details are kept separately in their own part of the file.",
      allergien: "Allergies",
      erkrankungen: "Illnesses",
      medikamente: "Medication",
      medikamenteHinweis: "Does your child need emergency medication? For example an asthma spray or an adrenaline pen. Talk to the coach. The emergency and health form (Notfall- und Gesundheitsbogen) in Part C has lines for this.",
      sonstiges: "Other",
    },
  },

  spielerfoto: {
    titel: "How do we get the photo for the player pass (Spielerpass)?",
    hinweis: "The Hessian Football Association (Hessischer Fußball-Verband, HFV) needs a photo of head and shoulders.\nThe face must be clearly visible.",
    foto: "I take a photo now",
    fotoHinweis: "With the camera of the phone.",
    datei: "I choose a photo from my device",
    dateiHinweis: "A photo you already have.",
    verein: "The club takes the photo",
    vereinHinweis: "At the first training.",
    machen: "Take a photo",
    waehlen: "Choose a photo",
    anderes: "Another photo",
    vorschau: "Preview of the photo",
    zugeschnitten: "We crop the photo to fit.",
    hinzugefuegt: "Photo added.",
  },

  nachweise: {
    titel: "Which documents do you already have?",
    hinweis: "Take a photo of every document you have.\nYou can hand in what is missing later.\nThe photo stays on your device.",
    habe: "I have it",
    fehlt: "Still missing",
    foto: "Take a photo",
    datei: "Choose a file",
    entfernen: "Remove",
    entfernenLang: "Remove {datei}",
    hinzugefuegt: "File added.",
    entfernt: "File removed.",
    vorschau: "Preview: {datei}",
    pdf: "PDF file",
    warum: "Why?",
    wie: "How to get it:",
    wo: "Where?",
    dateien: "Your files:",
    art: {
      pflicht: "This is required.",
      verein: "The club would like this.",
      freiwillig: "This is voluntary.",
      nur_wenn: "Required if it applies to you.",
      offen: "Maybe required. The club will tell you.",
    },
    leer: "No documents are needed.",
  },

  unterschriften: {
    titel: "How would you like to sign?",
    weg: {
      bildschirm: "On the screen, where allowed",
      bildschirmHinweis: "You sign club documents here with your finger.",
      papier: "I sign everything on paper",
      papierHinweis: "You print the file and sign with a pen.",
    },
    satzung: {
      titel: "The club’s statutes (Satzung)",
      erklaerung: "The statutes (Satzung) are the rules of the club.",
      link: "Read the statutes (Satzung)",
      linkZusatz: "PDF, opens in a new tab",
      ohneLink: "You can find the statutes (Satzung) on the club’s website.",
      label: "I have read the statutes (Satzung).",
      pflicht: "Without a tick you cannot sign on the screen.",
      freiwillig: "Voluntary. Without a tick here, you mark it by hand on the printout.",
    },
    hierTitel: "You sign these here",
    hierHinweis: "Draw with your finger, a pen or the mouse.",
    giltFuer: "This signature applies to:",
    person: {
      mitglied: { kind: "Signature of {name}", selbst: "Your signature" },
      sorgeberechtigte: "Signature of {person}",
      ersteEltern: "Signature: mother or father",
      zweiteEltern: "Signature: second parent",
      zweiteHinweis: "This signature is voluntary.\nWe recommend: both parents sign.",
      kontoinhaber: "Signature of the account holder: {person}",
      spieler: "Signature of the player",
      ersteSorge: "Your signature",
    },
    stand0: "Not signed yet",
    standOk: "Signed",
    standZuKurz: "Too short. Please sign fully.",
    loeschen: "Delete",
    loeschenLang: "Delete signature: {person}",
    ariaLabel: "Signature field. Draw with your finger, a pen or the mouse.",
    stiftTitel: "You sign these pages with a pen",
    stiftHinweis: "The Hessian Football Association (Hessischer Fußball-Verband, HFV) requires a signature with a pen on its forms.",
    stiftHinweisPapier: "You sign all pages with a pen.",
    stiftListe: "These are the pages:",
    hfvTitel: "When do you sign these pages?",
    training: "At the first training – we bring the pages",
    selbst_drucken: "I print them myself",
    selbst_druckenHinweis: "You print the pages and sign them.",
    nichts: "Your registration needs no signatures.",
  },

  pruefen: {
    titel: "Is everything correct?",
    hinweis: "Check your details.\nUse “Change” to correct something.",
    weiter: "Everything is correct – create file",
    aendern: "Change",
    aendernLang: "Change {bereich}",
    bereiche: {
      person: "Person",
      abteilung: "Football and carnival",
      pass: "Passport and place of residence",
      sorge: "Custody",
      kontakt: "Contact",
      beitrag: "Fee and payment",
      einwilligungen: "Consents",
      notfall: "Emergency",
      foto: "Photo",
      unterlagen: "Documents",
      unterschriften: "Signatures",
    },
    zeilen: {
      name: "Name",
      geboren: "Born",
      geburtsort: "Place of birth",
      geschlecht: "Gender",
      abteilung: "Department",
      mannschaft: "Team",
      spielen: "Matches",
      spielenJa: "Yes, with permission to play (Spielrecht)",
      spielenNein: "Training only",
      alterVerein: "Previous club",
      alteMitgliedschaft: "Membership in the old club",
      abmeldung: "Deregistration",
      karneval: "Carnival group",
      abendauftritte: "Evening performances",
      abholung: "Who picks up",
      alleinNachHause: "Going home alone",
      staaten: "Nationality",
      ausland: "Last lived abroad",
      wohnen: "Place of residence",
      sorge: "Custody",
      sorgePersonen: "People",
      anschrift: "Address",
      email: "Email",
      telefon: "Phone",
      beitrag: "Membership fee",
      leistungen: "Benefits from the authorities",
      zahlung: "Payment",
      kontoinhaber: "Account holder",
      iban: "IBAN",
      fotos: "Photos",
      hfv: "Hessian Football Association (HFV)",
      fahrten: "Trips",
      messenger: "Messenger group",
      notfall: "Emergency contact",
      gesundheitsbogen: "Health form",
      spielerfoto: "Player photo",
      unterschriftWeg: "Signature",
      satzung: "Statutes (Satzung) read",
      hfvUnterschrift: "Pages for the association",
      dateiEins: "1 file",
      dateiMehr: "{anzahl} files",
    },
    werte: {
      ja: "Yes",
      nein: "No",
      weissNicht: "Do not know",
      satzungVonHand: "No – you mark it by hand",
      alleinAb: "Yes, from {zeit}",
      geschlecht: { m: "Male", w: "Female", d: "Diverse", ohne_angabe: "Not specified" },
      abteilung: { fussball: "Football", karneval: "Carnival", beides: "Football and carnival", passiv: "Support only" },
      abmeldung: {
        einschreiben: "By registered letter (Einschreiben) on {datum}",
        formlos: "Only by email or message",
        noch_nicht: "Not yet",
        weiss_nicht: "Do not know",
        vollmacht: "with authorisation (Vollmacht)",
        weg: "Method: {weg}",
      },
      mitgliedschaft: { kuendigen: "I cancel", passiv: "Stays as a passive member", weiss_nicht: "Do not know" },
      sorge: {
        beide: "Both parents",
        getrennt_bei_mir: "Parents live apart, the child lives with me",
        allein: "Sole custody",
        vormund: "Legal guardian (Vormund)",
        pflege: "Foster parents or carers",
      },
      wohnen: {
        gemeinsam: "With the parents in Germany",
        nicht_gemeinsam: "With the parents, not registered together",
        verwandte: "With relatives",
        ohne_eltern: "Without parents",
      },
      zahlung: { sepa: "Direct debit (Lastschrift)", rechnung: "Invoice" },
      kontoinhaber: { mitglied: "Myself", sorgeberechtigt: "Myself", andere: "Another person" },
      unterschriftWeg: { bildschirm: "On the screen, where allowed", papier: "All on paper" },
      hfvUnterschrift: { training: "At the first training", selbst_drucken: "Print out myself" },
      habe: "I have it",
      fehlt: "Still missing",
      vereinMacht: "The club takes the photo",
      fotoDa: "Photo is there",
      unterschrieben: "Signed",
      nichtUnterschrieben: "Not signed yet",
      betragJahr: "{gruppe}, {jahr} euros a year",
    },
    hinweiseTitel: "Good to know",
    weitereHinweise: "More notes ({anzahl})",
    klaertVerein: "The club will clarify this",
    fristUnsicher: "This is an estimate. The club checks it exactly.",
    weiterleitungTitel: "These offices will contact you:",
    weiterleitungAn: {
      jugendleitung: "Youth department (Jugendleitung)",
      passwesen: "Player pass office (Passwesen; handles the player passes; reachable through the club office)",
      geschaeftsstelle: "Club office (Geschäftsstelle)",
      karneval: "Carnival department (Karnevalabteilung)",
      spielausschuss: "Match committee of the men’s team (Spielausschuss der Herren; checks club changes and deadlines; reachable through the club office)",
    },
    hinweisArt: {
      warnung: "Attention",
      info: "For your information",
      frist: "Deadline",
      offen: "The club will clarify this",
    },
  },

  fertig: {
    titelArbeit: "We are creating your file",
    titelFertig: "Your file is ready",
    titelFehler: "That did not work",
    arbeitet: "One moment, please. The file is being created.",
    nochmal: "Try again",
    datei: "File: {name}",
    info: "{seiten} pages, {groesse}",
    teileTitel: "What is in the file:",
    teil: "{titel} (page {von} to {bis})",
    // Titel der Teile des PDF (SCHNITTSTELLEN Abschnitt 9)
    teilTitel: {
      A: "Part A – For you",
      B: "Part B – For the club",
      C: "Part C – Confidential, hand in separately",
    },
    herunterladen: "Download file",
    teilen: "Share file",
    ansehen: "View file",
    fotoSpeichern: "Save player photo as an image",
    gespeichert: "The file is being saved. It is usually in the “Downloads” folder.",
    geteilt: "Shared.",
    teilenFehler: "Sharing does not work here. The file was saved instead.",
    fehler: {
      bibliothek: "A part of the program cannot be loaded. Please check your internet connection.",
      vorlageNetz: "A template cannot be loaded. Please check your internet connection.",
      vorlageGeaendert: "A template of the club was changed. Please call the club office (Geschäftsstelle).",
      modul: "The file cannot be created yet. Please call the club office (Geschäftsstelle).",
      pdf: "The file could not be created. Please try again.",
    },
    naechsteTitel: "What happens next",
    unterschriftTraining: "You sign the pages for the Hessian Football Association (Hessischer Fußball-Verband, HFV) with a pen at the first training.",
    unterschriftDrucken: "Print the file. Sign at all blue marks with a pen.",
    unterschriftDruckenTeil: "Print the pages for the Hessian Football Association (Hessischer Fußball-Verband, HFV). Sign at the blue marks with a pen.",
    unterschriftTrainingAlle: "You sign all pages with a pen at the first training. The club prints them.",
    unterschriftFertig: "You have signed everything on the screen. What you have to print out is in Part A of the file.",
    fehltTitel: "These documents are still missing:",
    fehltHinweis: "Bring them as soon as you have them.",
    abgeben: "Hand in the documents at the club.\nBring the file on your phone. Or hand it in printed.",
    nichtWhatsapp: "Please do not send the file by WhatsApp. It contains private data.",
    teilC: "Part C (Teil C) contains health data. Hand it in separately.",
    weiterePerson: "Register another person",
    weiterePersonHinweis: "We keep the address, contact, parents and payment details.",
    neuePerson: "You are now registering the next person.",
  },
};
