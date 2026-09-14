// Speuzer Website Prototyp – P14 Vorstandsdokument „Website-Vergleich“
// Wörtliche Texte laut Spezifikation (tools/vorstand-pdf/bauen.mjs baut daraus
// das Dokument). Alle Textstellen in „…“ in der Spezifikation sind hier
// Zeichen für Zeichen übernommen (Tippfehler ausgeschlossen). Beschreibende
// Absätze ohne Anführungszeichen in der Spezifikation sind aus den dort
// genannten Fakten zusammengesetzt, ohne neue Zahlen zu erfinden.

// ---------- Titelseite ----------

export const TITEL = {
  titel: "Die Website der Sportfreunde 04",
  untertitel: "Ist-Zustand und Prototyp im Vergleich",
  zeile: "Entscheidungsgrundlage für den Vorstand · 14. September 2026",
  vorgelegt: "Vorgelegt von Olgay Özkan",
  qrText: "Prototyp ansehen: justolgay.github.io/speuzer-website-prototyp",
  hinweis:
    "Der Prototyp ist eine Testumgebung. Er zeigt mit den echten Inhalten des Vereins, wie der Webauftritt ohne die heutigen technischen Grenzen aussieht.",
};

// ---------- Seite 2 – Auf einen Blick ----------

export const BLICK_ABSATZ =
  "Unsere Website ist heute keine Website, sondern die Vereins-App in einem festen Browserfenster von 592 × 834 Pixeln. Daraus folgen die Probleme, die Besucher spüren: eine einzige Adresse für alles, Menüpunkte ohne Links, zwei Scrollbalken, abgeschnittene Inhalte und eine Startseite ohne Inhalt. Der Prototyp zeigt mit denselben Inhalten, wie der Auftritt aussieht, wenn diese Grenze wegfällt.";

export const BLICK_EMPFEHLUNG =
  "Die Struktur des Prototyps wird zum Zielbild für den Webauftritt: sechs Menüpunkte, eine eigene Adresse je Seite, Inhalte statt Rahmen, Vereinsadressen statt privater Nummern. Der Vorstand entscheidet über den Weg dahin (Kapitel 7) und über die Punkte in Kapitel 8.";

export const KAPITEL_NAMEN = [
  "Das Kernproblem",
  "Sieben Situationen aus Sicht der Besucher",
  "Messbar",
  "Datenschutz und Pflichtangaben",
  "Was gleich bleibt",
  "Was der Prototyp nicht ist",
  "Der Weg dahin",
  "Entscheidungen des Vorstands",
  "Prototyp ansehen",
];

export const ANHANG_NAMEN = [
  "Lighthouse je Seite",
  "Methodik",
  "Die 47 Seiten des Prototyps",
  "Quellen",
];

// ---------- Kapitel 1 – Das Kernproblem ----------

export const K1_TEXT =
  "Alle Schreibweisen von sportfreunde04.de leiten auf eine Adresse bei appack.de weiter. Dort läuft der gesamte Inhalt in einem Fenster von 592 × 834 Pixeln in der Bildschirmmitte. Bei 1 440 Pixeln Fensterbreite sind das 41 Prozent; die übrigen 59 Prozent zeigt auf jeder Unterseite dasselbe Begrüßungsfoto. Der Inhalt im Fenster ist viel höher als das Fenster: die Vorstandsseite 2 352 Pixel, der Mitgliedsantrag 2 195 Pixel, die Mannschaftsseite 8 978 Pixel. Besucher scrollen also lange Inhalte durch ein kleines Guckloch.";

export const K1_FOLGEN = [
  "Zwei Scrollbalken übereinander.",
  "Inhalte werden mitten im Element abgeschnitten.",
  "Auf „Sportangebote“ bleibt rund 450 Pixel (Rechner) bzw. 470 Pixel (Handy, über 60 Prozent des Bildschirms) leere Fläche.",
  "Beim Wechsel des Menüpunkts springt die Ansicht nicht nach oben.",
  "Keine teilbaren Links: eine einzige Adresse gilt für alle Seiten.",
  "Zurück-Knopf und Lesezeichen ohne Funktion.",
  "Bei der Suche nach dem Verein erscheinen Facebook, kicker.de, Ortsdienst, Gelbe Seiten, Stadtbranchenbuch und 11880 – nicht die eigene Website.",
  "„Mitglied werden“ ist je nach Fensterbreite hinter „Mehr“ versteckt.",
];

export const K1_BILD_VORHER =
  "Live-Seite am Rechner, 1 440 px: Inhalt im 592 px breiten Rahmen, zwei Scrollbalken, rechts das Begrüßungsfoto. Fotos unkenntlich gemacht.";
export const K1_BILD_NACHHER =
  "Prototyp, dieselbe Seite: Inhalt über die Seitenbreite, ein Scrollbalken.";

export const K1_SCHLUSS =
  "Diese Grenze lässt sich innerhalb der Plattform nicht durch Pflege im CMS aufheben. Deshalb wurde der Prototyp außerhalb gebaut – mit den Inhalten aus dem CMS, dem Wappen und den Vereinsfarben.";

// ---------- Kapitel 2 – Sieben Situationen ----------
// Je Situation: titel (wörtlich in Anführungszeichen lt. Spezifikation),
// heute/prototyp (aus den Fakten zusammengesetzt), satz = Bildunterschrift
// (bei Paaren wörtlich aus PAARE in src/seiten/vorher-nachher.mjs).

export const SITUATIONEN = [
  {
    titel: "Ein Elternteil sucht die Trainingszeit",
    heute:
      "Die Mannschaftsseite zeigt 1 224 Zeichen Text für zwölf Einträge – ohne Wochentag, Uhrzeit oder Platz. Die Trainingszeiten stehen nur in einem Kalender auf der News-Seite, Kontakt läuft über 26 × 17 Pixel kleine Telefon- und Mail-Symbole.",
    prototyp:
      "Jede Mannschaft hat eine eigene Seite mit Wochentag, Uhrzeit, Platz, den nächsten Spielen, der Vereinsmail und einem Kalender-Abo für Spiele und Training.",
    paarKey: "mannschaften-handy",
  },
  {
    titel: "Der erste Blick am Handy",
    heute:
      "Der erste Bildschirm ist ein Foto ohne Text; erste lesbare Information ist die Postadresse. Das aufgeklappte Menü zeigt 13 gleichrangige Punkte übereinander, im Hintergrund blitzt das Seitenfoto durch.",
    prototyp:
      "Der erste Bildschirm zeigt Wappen, Claim, Probetraining, Mitglied werden und die nächsten Spiele. Das Menü hat sechs Punkte, vollflächig, mit Schließen-Kreuz und Tastaturbedienung.",
    paarKey: "start-handy",
    zweitesPaarKey: "menue-handy",
  },
  {
    titel: "Am Rechner",
    heute:
      "Am Rechner füllt auf der Startseite ein Foto die ganze Fläche, ohne Wappen, Claim oder Vereinsdaten; der Inhalt läuft weiterhin durch den 592 Pixel breiten Rahmen in der Bildschirmmitte. Auf der Seite „Sportangebote“ folgen auf zwei Kacheln rund 450 Pixel leere Fläche.",
    prototyp:
      "Der Prototyp zeigt am Rechner Wappen, Claim, Probetraining, Mitglied werden und die nächsten Spiele auf dem ersten Bildschirm, über die volle Seitenbreite. Die Mannschaftsübersicht zeigt alle elf Mannschaften in drei Gruppen mit ihren Trainingszeiten statt einer leeren Fläche.",
    paarKey: "start-desktop",
    zweitesPaarKey: "sportangebote-desktop",
  },
  {
    titel: "Jemand will den Spielplan per WhatsApp schicken",
    kastenAdresse: "appack.de/rest-api/drender/6a7c…",
    kastenSatz: "Heute führt jeder Link auf die Startseite, weil es nur eine Adresse gibt.",
    vorschauBildTitel: "D3-Jugend – FFV Sportfreunde 04",
    vorschauBeschreibung:
      "D3-Jugend des FFV Sportfreunde 04 (Frankfurt-Gallus): Jahrgang 2014/2015, Training Di 17:30–19:30, Fr 17:30–19:30, Ansprechpartner per Vereinsmail, Spielplan und Tabelle.",
    vorschauUnterschrift:
      "Schematische Darstellung der Vorschau, wie WhatsApp sie aus den Seitenangaben erzeugt.",
    satz:
      "Jede der 47 Seiten hat eine eigene Adresse, einen Titel, eine Beschreibung und ein Vorschaubild; jede Meldung einen Knopf „Per WhatsApp teilen“.",
    neuerScreenshot: "mannschaften-d3-handy",
  },
  {
    titel: "Jemand möchte Mitglied werden",
    heute:
      "Die Seite beginnt direkt mit dem Antragsformular: IBAN und Unterschrift, ohne Angabe der Beiträge, ohne Datenschutzhinweis und ohne Feld für Erziehungsberechtigte.",
    prototyp:
      "Vor dem Formular stehen die Beiträge (9/10/7/15 Euro monatlich, 20 Euro Aufnahme), der Ablauf in Schritten und die mitzubringenden Unterlagen. Der Formularentwurf enthält Datenschutzhinweis, SEPA-Mandatstext und den Block für Erziehungsberechtigte; der Entwurf im Prototyp versendet nichts.",
    paarKey: "mitglied-werden-handy",
  },
  {
    titel: "Ein Unternehmen überlegt zu sponsern",
    heute:
      "Die oberste Sponsorenkategorie zeigt ein Platzhalterbild mit dem Text „Hier könnte Ihr Logo stehen“; eine Kategorie erscheint doppelt, einmal als „App-Projektpartner“, einmal als „APP-Projektpartner“.",
    prototyp:
      "Die Sponsoren stehen in zwei klaren Kategorien mit den echten Logos, dazu ein Satz, wie man Sponsor wird, mit der Mailadresse der Geschäftsstelle.",
    paarKey: "sponsoren-handy",
  },
  {
    titel: "Service & Anträge",
    heute:
      "Die Seite zeigt drei unterschiedlich gestaltete Kacheln, zwei davon mit einem „Made with AI“-Wasserzeichen, dazu den Tippfehler „Mitgliedsbescheinigugen“.",
    prototyp:
      "Der Prototyp listet neun Downloads einheitlich mit Dateiformat, Größe und Seitenzahl je Dokument.",
    paarKey: "service-handy",
  },
];

// ---------- Kapitel 3 – Messbar: die elf Zeilen aus MESSBAR_ZEILEN ----------
// (src/seiten/vorher-nachher.mjs, wörtlich übernommen; "Adressen" mit der
// tatsächlichen Seitenzahl aus docs/sitemap.xml statt der Formel im Original)

export const K3_MESSBAR_ZEILEN = [
  { merkmal: "Menüpunkte", vorher: "12", nachher: "6" },
  { merkmal: "Adressen", vorher: "1 für alle Seiten", nachher: "47 eigene Adressen" },
  { merkmal: "Inhaltsrahmen", vorher: "fest 592 × 834 px", nachher: "volle Breite, 320–1920 px" },
  { merkmal: "Scrollbalken", vorher: "2", nachher: "1" },
  { merkmal: "Tippziele", vorher: "26 × 17 px", nachher: "mindestens 44 × 44 px" },
  { merkmal: "Überschriftenstruktur", vorher: "keine h1", nachher: "genau eine h1 je Seite" },
  { merkmal: "Sprachangabe", vorher: "fehlt", nachher: "lang=de" },
  { merkmal: "Alternativtexte", vorher: "alle leer", nachher: "alle Bilder beschrieben" },
  { merkmal: "Startbild", vorher: "296 KB, WhatsApp-Export", nachher: "kein Bild über 200 KB, sprechende Namen" },
  { merkmal: "Private Telefonlinks", vorher: "19", nachher: "0" },
  { merkmal: "Trainingszeiten auf Mannschaftsseiten", vorher: "keine", nachher: "alle elf Mannschaften" },
];

// Zusätzliche Zeilen laut Spezifikation (nach den elf MESSBAR_ZEILEN)

export const K3_ZUSATZ_ZEILEN = [
  { merkmal: "Sponsorenlogos", vorher: "1 500 × 1 000 px für 150 × 100 px Anzeige", nachher: "passende Größenstufen, AVIF/WebP" },
  { merkmal: "Tastaturbedienung", vorher: "fünf fokussierbare Elemente, Menü nicht erreichbar", nachher: "vollständig, Sprungmarke, Fokusrahmen 3 px" },
  { merkmal: "Vorschau beim Teilen", vorher: "keine Beschreibung", nachher: "Titel, Beschreibung, Bild je Seite" },
  { merkmal: "News", vorher: "5 Einträge in 9 Monaten, neuester überholt", nachher: "6 Meldungen mit Überschrift, Datum, Bild, Teilen-Knopf" },
  { merkmal: "Kalender abonnieren", vorher: "nicht vorhanden", nachher: "je Mannschaft Spiele und Training als ICS" },
  { merkmal: "Vereinsname", vorher: "sechs Schreibweisen", nachher: "Registerfassung, Kurzform im Kopf" },
];



export const MESSBAR_FUSSNOTE =
  "Live-Werte: Qualitätsprüfung vom 04.09.2026 und Lighthouse-Messung der Startseite am 14.09.2026 (mobil, ein Lauf). Prototyp-Werte: automatische Prüfung über alle 47 Seiten am 14.09.2026 (Werkzeuge im Repository), Lighthouse je Seite; Stand und Messbasis aus data/lighthouse.json genannt.";

export const MESSBAR_ERKLAERKASTEN_TITEL = "Was Lighthouse ist";
export const MESSBAR_ERKLAERKASTEN =
  "Lighthouse ist das frei verfügbare Prüfwerkzeug von Google, das in jedem Chrome-Browser steckt. Es bewertet eine Seite in vier Kategorien von 0 bis 100: Performance (Ladezeit auf einem simulierten Mittelklasse-Handy im Mobilfunknetz), Barrierefreiheit, Best Practices und SEO (Auffindbarkeit). Werte ab 90 gelten als gut.";

// ---------- Kapitel 4 – Datenschutz und Pflichtangaben ----------

export const K4_HEUTE = [
  "19 Anruf-Links zu Trainerinnen und Trainern (am 04.09.2026 entfernt, laut CMS-Stand 11.09.2026 wieder vorhanden).",
  "Mitgliedsantrag erhebt IBAN und Unterschrift ohne Datenschutzhinweis, Beitragshöhe, Satzungslink, Kündigungsfrist und ohne Feld für Erziehungsberechtigte.",
  "Datenschutzerklärung ist die der App („Bei Aufruf und Nutzung dieser App“) ohne die Begriffe IBAN, Mitgliedsantrag, Instagram, Minderjährige.",
  "Impressum und Datenschutz sind Klick-Elemente ohne eigene Adresse.",
];

export const K4_PROTOTYP = [
  "Keine Telefonlinks zu Trainerinnen und Trainern – Kontakt läuft über Vereinsmailadressen.",
  "Formularentwurf mit Datenschutzhinweis, Beiträgen, Satzungslink, Kündigungsfrist, SEPA-Mandatstext mit Gläubiger-ID und einem Block für Erziehungsberechtigte.",
  "Datenschutzerklärung unverändert aus der App übernommen (siehe Hinweis unten).",
  "Impressum und Datenschutz als eigene Seiten mit eigener Adresse.",
];

export const K4_KASTEN =
  "Dieses Dokument ist keine Rechtsberatung. Die Datenschutzerklärung wurde im Prototyp unverändert übernommen; die juristische Prüfung von Datenschutzerklärung und Mitgliedsantrag steht seit dem Start der Android-App aus und ist unabhängig vom Weg der Website zu erledigen.";

// ---------- Kapitel 5 – Was gleich bleibt ----------

export const K5_ABSATZ =
  "Der Prototyp ersetzt nicht die App und erfindet keine Inhalte. Mannschaften, Vorstand, Sponsoren, Meldungen, Downloads und Texte stammen aus dem appack-CMS; Spielpläne und Tabellen aus dem DFBnet; Wappen und Vereinsfarben sind dieselben. Was fehlt, ist sichtbar als ‚offen‘ gekennzeichnet.";

export const K5_OFFEN = [
  "ÖPNV-Anfahrt",
  "Öffnungszeiten der Geschäftsstelle",
  "Übungszeiten von vier Karnevalgruppen",
  "App-Store-Links",
  "Ergebnisse vergangener Spiele",
  "Fotos ohne Kinder",
];

export const K5_BILD_UNTERSCHRIFT =
  "Website und App als ein Auftritt: dieselben Inhalte im App-Format.";

// ---------- Kapitel 6 – Was der Prototyp nicht ist ----------

export const K6_PUNKTE = [
  "Testumgebung auf GitHub Pages, keine Live-Seite.",
  "Jede Seite trägt den Hinweis „Prototyp · Testumgebung“.",
  "Das Formular versendet nichts.",
  "Die Daten sind eine Momentaufnahme vom 14.09.2026.",
  "Ergebnisse vergangener Spiele fehlen.",
  "Keine Fotos mit Kindern.",
];

// ---------- Kapitel 7 – Der Weg dahin ----------

export const K7_BLOCK_A_TITEL = "Direkt in appack nachbaubar";
export const K7_BLOCK_A = [
  "Menü auf sechs Punkte: Start · Mannschaften · Spielplan & Tabellen · News · Verein · Mitglied werden.",
  "Trainingszeiten für alle Mannschaften im CMS eintragen.",
  "Mannschaften absteigend nach Alter ordnen (Herren zuerst, G-Jugend zuletzt).",
  "Team-Beschreibungen vereinheitlichen: „G-Jugend (Bambinis)“, „Fußball“ statt „Fussball“.",
  "Sponsorenkategorien bereinigen: Platzhalter entfernen, „App-Projektpartner“ zusammenführen, fehlerhaften Link entfernen, Text „Sponsor werden“ ergänzen.",
  "Feld für Handynummern im Vorstand leeren.",
  "Tippfehler „Mitgliedsbescheinigugen“ korrigieren, KI-Bilder durch Kacheln ohne Bild ersetzen.",
  "News-Überschriften sauber tippen, abgelaufene Instagram-Zugänge erneuern.",
  "Mitgliedsantrag um Datenschutzhinweis, Beiträge, Satzungslink, Kündigungsfrist, SEPA-Mandatstext und Erziehungsberechtigte ergänzen.",
  "Bilder vor dem Hochladen verkleinern und sprechend benennen.",
  "Vereinsphilosophie-PDF neu hochladen.",
  "Kontaktseite mit Vereinsadressen nach Anliegen anlegen.",
];

export const K7_BLOCK_B_TITEL = "Als Workspace-HTML auf cdn.appack.de";
export const K7_BLOCK_B = [
  "Startseite mit Inhalt (nächste Spiele, Trainingsraster, Meldungen) als Workspace-Seite.",
  "Tabellen live über das FUSSBALL.DE-Widget statt als Momentaufnahme.",
  "Mannschaftsseiten mit Training, nächsten Spielen und Kalender-Abo.",
  "Vereinsseiten: Wer wir sind, Kinderschutz, Sponsor werden, Karneval, Downloads, Kontakt nach Anliegen.",
  "Gestaltungssystem (CSS, Schriften) 1:1 in den Workspace übernehmen.",
  "App-Modus: Workspace-Seiten ohne eigenen Kopf und Fuß bauen, damit App und Website gleich aussehen.",
];

export const K7_BLOCK_C_TITEL = "Nur der Anbieter (vmapit/appack) kann es ändern";
export const K7_BLOCK_C_ZEILEN = [
  {
    punkt: "Eigene Adressen",
    problem:
      "Alle Varianten von sportfreunde04.de leiten auf appack.de/rest-api/drender/6a7c… um; eine Adresse für alles.",
    wunsch:
      "Domain-Mapping auf sportfreunde04.de und eine eigene Adresse je Menüpunkt und Seite (Deep Links, Zurück-Knopf, Lesezeichen, Suchmaschinen, WhatsApp-Vorschau).",
  },
  {
    punkt: "Rahmenhöhe",
    problem: "Inhaltsfenster fest 592 × 834 px, zwei Scrollbalken, Inhalte brechen ab.",
    wunsch: "Rahmen wächst mit dem Inhalt oder entfällt; ein Scrollbalken.",
  },
  {
    punkt: "Menü",
    problem: "Div mit Klick-Skript, ohne Links, ohne Tastatur, „Mehr“ versteckt „Mitglied werden“.",
    wunsch: "Echte Links, Tastaturbedienung, kein Abschneiden, Menü schließt mit Escape.",
  },
  {
    punkt: "Grundgerüst",
    problem: "Kein h1, kein lang-Attribut, keine Meta-Beschreibung, alt=\"\" überall.",
    wunsch: "lang=\"de\", Überschriftenstruktur, Meta-Beschreibung und Open-Graph je Seite, Alternativtexte aus dem CMS.",
  },
  {
    punkt: "Bilder",
    problem: "1 500 px große Logos für 150 px Anzeige.",
    wunsch: "Größenstufen bei der Auslieferung, moderne Formate.",
  },
  {
    punkt: "Formular",
    problem: "Telefon und PLZ als Zahlenfelder.",
    wunsch: "type=\"tel\" / type=\"text\" (Ticket läuft laut Mellis Punkt 8).",
  },
  {
    punkt: "Impressum/Datenschutz",
    problem: "Div statt Link, keine eigene Adresse.",
    wunsch: "Echte Links mit eigener Adresse.",
  },
  {
    punkt: "Datenschutzerklärung",
    problem: "Eine Fassung für App und Website, Überschrift „…der App“.",
    wunsch: "Eigene Fassung für die Website oder gemeinsame Fassung mit passender Überschrift (juristische Prüfung offen, A4).",
  },
];
export const K7_BLOCK_C_SATZ =
  "Diese Punkte gehören in dieselbe Anfrage wie das laufende Ticket 2623142.";

export const K7_WEG1_TITEL = "Weg 1 – In appack nachbauen";
export const K7_WEG1_TEXT =
  "A und B lassen sich sofort umsetzen. C entscheidet, ob die Kernprobleme verschwinden: Ohne eigene Adressen je Seite und ohne mitwachsenden Rahmen bleiben die Punkte aus Kapitel 1 bestehen. Vorteil: ein System für App und Website, gewohnte Pflege im CMS.";

export const K7_WEG2_TITEL = "Weg 2 – Website eigenständig betreiben, App bleibt appack";
export const K7_WEG2_TEXT =
  "Die Technik des Prototyps wird die Website; sportfreunde04.de zeigt auf die neue Seite, die App läuft weiter bei appack. Spielpläne kommen automatisch aus dem DFBnet, Inhalte werden in einfachen Dateien gepflegt. Vorteil: alle Kernprobleme sind gelöst, Betrieb ohne laufende Kosten. Zu klären: wer Inhalte pflegt und wie News und Vorstand in App und Website nicht doppelt gepflegt werden.";

export const K7_EMPFEHLUNG =
  "Das Zielbild aus Kapitel 2 und 3 beschließen. Den Anbieter mit Block C konfrontieren und um eine verbindliche Aussage bitten, ob und bis wann eigene Adressen je Seite und ein mitwachsender Rahmen möglich sind. Parallel Block A umsetzen, weil er in jedem Fall nötig ist. Fällt die Antwort des Anbieters negativ aus oder bleibt sie offen, ist Weg 2 der einzige, der die Kernprobleme löst.";

// ---------- Kapitel 8 – Entscheidungen des Vorstands ----------

export const K8_ENTSCHEIDUNGEN = [
  "Zielbild freigeben (sechs Menüpunkte, eigene Adresse je Seite, Inhalte des Prototyps).",
  "Telefonnummern der Trainerinnen und Trainer öffentlich – ja oder nein (Empfehlung des Dokuments: nein, Vereinsadressen genügen; 18 Team-Mailadressen sind vorhanden).",
  "Anfrage an vmapit mit Block C stellen; Frist für die Antwort festlegen.",
  "Datenschutzerklärung und Mitgliedsantrag juristisch prüfen lassen.",
  "Offene Inhalte liefern (ÖPNV-Anfahrt, Öffnungszeiten, Übungszeiten Karneval, Fotos ohne Kinder).",
  "Nach der Antwort des Anbieters: Weg 1 oder Weg 2.",
];

// ---------- Kapitel 9 – Prototyp ansehen ----------

export const K9_HINWEIS =
  "Am Handy und am Rechner öffnen; Zurück-Knopf und Teilen ausprobieren. Die Seite ‚Vorher / Nachher‘ im Fußbereich zeigt die Bildpaare dieses Dokuments mit Messtabelle.";

export const K9_MENUEPUNKTE = [
  { name: "Start", satz: "Nächste Spiele aller Teams, Trainingsraster, Meldungen, Probetraining, Adresse mit Parkhinweis." },
  { name: "Mannschaften", satz: "Alle elf Mannschaften mit Training, nächsten Spielen und Kalender-Abo." },
  { name: "Spielplan & Tabellen", satz: "Spielpläne aus dem DFBnet und acht Tabellen als Momentaufnahme." },
  { name: "News", satz: "Sechs Meldungen mit Bild, Datum und dem Knopf „Per WhatsApp teilen“." },
  { name: "Verein", satz: "Vorstand, Sponsoren, Mach mit, Karnevalabteilung, Downloads." },
  { name: "Mitglied werden", satz: "Beiträge, Ablauf, Unterlagen und der Formularentwurf." },
];

// ---------- Anhang B – Methodik ----------

export const ANHANG_B_ABSAETZE = [
  "Prüfdaten: 04.09.2026 (Live-Seite, Qualitätsprüfung und ein Lighthouse-Lauf der Startseite), 14.09.2026 (Prototyp, automatische Prüfung über alle 47 Seiten, öffentlich über GitHub Pages gemessen).",
  "Werkzeuge: Chrome, Lighthouse 13, axe-core, eigene Prüfskripte im Repository (tools/pruefen.mjs, tools/lighthouse.mjs).",
  "Geprüfte Breiten: 320–1920 Pixel.",
  "Ein Lighthouse-Lauf je Seite.",
  "Fotos auf den Vorher-Bildern wurden unkenntlich gemacht.",
];

// ---------- Bildpaare (aus src/seiten/vorher-nachher.mjs, PAARE) ----------
// Dateinamen, Alt-Texte und Sätze wörtlich aus PAARE übernommen (die Sätze
// werden in Kapitel 2 als Bildunterschrift verwendet).

export const PAARE_BILDER = {
  "vorstand-rahmen-desktop": {
    handy: false,
    vorher: { name: "vorher-vorstand-rahmen-desktop", alt: "Live-Unterseite am Rechner: schmaler Inhaltsrahmen in der Seitenmitte mit eigenem Scrollbalken, daneben leere Fläche" },
    nachher: { name: "nachher-vorstand-desktop", alt: "Prototyp-Unterseite am Rechner: Inhalt über die volle Seitenbreite, ein Scrollbalken" },
    satz: "Vorher läuft der Inhalt durch ein 592 Pixel breites Guckloch mit zwei Scrollbalken; nachher nutzt er die Seitenbreite mit einem Scrollbalken.",
  },
  "mannschaften-handy": {
    handy: true,
    vorher: { name: "vorher-mannschaften-handy", alt: "Live-Mannschaftsliste am Handy: Kacheln mit Trainerfoto und kurzem Text, ohne Trainingszeiten" },
    nachher: { name: "nachher-mannschaft-d3-handy", alt: "Prototyp-Mannschaftsseite D3 am Handy: Trainingszeiten, nächste Spiele und Vereinsmail auf einer eigenen Seite" },
    satz: "Vorher fehlen Wochentag, Uhrzeit und Platz, Kontakt läuft über 26 × 17 Pixel kleine Symbole; nachher stehen Training, nächste Spiele und die Vereinsmail auf einer eigenen Seite je Mannschaft.",
  },
  "start-handy": {
    handy: true,
    vorher: { name: "vorher-start-handy", alt: "Live-Startseite am Handy: ganzseitiges Foto ohne Text, nur Burger-Menü und Wappen oben" },
    nachher: { name: "nachher-start-handy", alt: "Prototyp-Startseite am Handy: Wappen, Vereinsname und Knöpfe für Probetraining und Mitgliedschaft auf dem ersten Bildschirm" },
    satz: "Vorher ist der erste Bildschirm ein Bild ohne Text; nachher sieht man sofort, wer der Verein ist und was man tun kann.",
  },
  "menue-handy": {
    handy: true,
    vorher: { name: "vorher-menue-handy", alt: "Aufgeklapptes Live-Menü am Handy: 13 gleich gestaltete Punkte übereinander, im Hintergrund scheint das Seitenfoto durch" },
    nachher: { name: "nachher-menue-handy", alt: "Aufgeklapptes Prototyp-Menü am Handy: sechs Punkte vollflächig auf Blau, oben ein Schließen-Kreuz" },
    satz: "Vorher 13 gleichrangige Punkte mit Doppelungen, der Hintergrund blitzt durch; nachher sechs Punkte, vollflächig, mit Schließen-Kreuz und Tastaturbedienung.",
  },
  "start-desktop": {
    handy: false,
    vorher: { name: "vorher-start-desktop", alt: "Live-Startseite am Rechner: Foto über die gesamte Breite, Menüleiste mit zwölf Punkten" },
    nachher: { name: "nachher-start-desktop", alt: "Prototyp-Startseite am Rechner: Wappen, Claim und Vereinsdaten oben, darunter die nächsten Spiele" },
    satz: "Vorher füllt ein Foto den Bildschirm und beantwortet keine Frage; nachher stehen Wappen, Claim, Probetraining und die nächsten Spiele auf dem ersten Bildschirm.",
  },
  "sportangebote-desktop": {
    handy: false,
    vorher: { name: "vorher-sportangebote-desktop", alt: "Live-Sportangebote am Rechner: zwei Kacheln (Fußball, Karneval), darunter eine große leere Fläche" },
    nachher: { name: "nachher-mannschaften-desktop", alt: "Prototyp-Mannschaftsübersicht am Rechner: elf Mannschaften in drei Gruppen mit Trainingszeiten" },
    satz: "Vorher zwei Kacheln und darunter rund 450 Pixel Leere; nachher elf Mannschaften in drei Gruppen mit Trainingszeiten.",
  },
  "mitglied-werden-handy": {
    handy: true,
    vorher: { name: "vorher-mitglied-werden-handy", alt: "Live-Formular am Handy: Antragsformular beginnt direkt mit den persönlichen Angaben, keine Beitragsangaben sichtbar" },
    nachher: { name: "nachher-mitglied-werden-handy", alt: "Prototyp-Seite Mitglied werden am Handy: Beitragstabelle für Fußball und Karneval vor dem Formular" },
    satz: "Vorher beginnt die Seite mit dem Formular und nennt keine Beiträge; nachher stehen Beiträge, Ablauf und Unterlagen vor dem Antrag.",
  },
  "sponsoren-handy": {
    handy: true,
    vorher: { name: "vorher-sponsoren-handy", alt: "Live-Sponsorenseite am Handy: oberste Kategorie zeigt ein Platzhalterbild, „App-Projektpartner“ erscheint zweimal" },
    nachher: { name: "nachher-sponsoren-handy", alt: "Prototyp-Sponsorenseite am Handy: zwei Kategorien mit echten Logos und ein Satz zum Sponsor werden" },
    satz: "Vorher zeigt die oberste Kategorie einen Platzhalter und eine Kategorie gibt es doppelt; nachher zwei Kategorien und ein Satz, wie man Sponsor wird.",
  },
  "service-handy": {
    handy: true,
    vorher: { name: "vorher-service-handy", alt: "Live-Serviceseite am Handy: drei unterschiedlich gestaltete Kacheln, eine mit KI-Wasserzeichen und dem Tippfehler „Mitgliedsbescheinigugen“" },
    nachher: { name: "nachher-downloads-handy", alt: "Prototyp-Downloadseite am Handy: einheitliche Liste mit Dateiformat, Größe und Seitenzahl je Dokument" },
    satz: "Vorher drei unterschiedlich gestaltete Kacheln, ein KI-Bild mit Wasserzeichen und ein Tippfehler; nachher eine Downloadliste mit Dateigröße und Seitenzahl.",
  },
};

// ---------- Anhang D – Quellen ----------

export const ANHANG_D_QUELLEN = [
  "Speuzer Website – Qualitätsprüfung 04.09.2026 (internes Dokument, Ordner Verein)",
  "Speuzer Website – Übernahme nach appack, Stand 14.09.2026 (internes Dokument, Ordner Verein)",
  "Lighthouse-Messung der Live-Startseite am 14.09.2026, mobil und Desktop, Lighthouse 13",
  "Repository und Prototyp: github.com/justOlgay/speuzer-website-prototyp, Stand 14.09.2026",
];
