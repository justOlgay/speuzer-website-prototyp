// Speuzer Website Prototyp – Vorstandsdokument „Website-Vergleich“ (P14,
// appack-Fassung seit P18). Wörtliche Texte laut Spezifikation (tools/
// vorstand-pdf/bauen.mjs baut daraus das Dokument). Alle Textstellen in „…“
// in der Spezifikation sind hier Zeichen für Zeichen übernommen (Tippfehler
// ausgeschlossen). Beschreibende Absätze ohne Anführungszeichen in der
// Spezifikation sind aus den dort genannten Fakten zusammengesetzt, ohne
// neue Zahlen zu erfinden.
//
// P18 Schritt 3, Ausnahme: Der Satz zu Situation 3 ("Am Rechner", heute)
// nennt laut Auftrag "unverändert" die alte Fenstermessung; die neue
// Vermessung vom 15.09.2026 (siehe K1_TEXT) ergibt 576 statt 592 Pixel. Damit
// der Pflichttest aus Schritt 6 ("592" → 0 Treffer) nicht mit der Vorgabe
// "unverändert" kollidiert, wurde nur die Zahl 592→576 an dieser einen Stelle
// nachgeführt (minimal nötige Korrektur, siehe Abschlussmeldung).

import { MESSBAR_ZEILEN } from "../../src/begleit/vorher-nachher.mjs";

// ---------- Titelseite ----------

export const TITEL = {
  titel: "Die Website der Sportfreunde 04",
  untertitel: "Ist-Zustand und appack-Fassung im Vergleich",
  zeile: "Entscheidungsgrundlage für den Vorstand · 15. September 2026",
  vorgelegt: "Vorgelegt von Olgay Özkan",
  qrText: "Prototyp ansehen: justolgay.github.io/speuzer-website-prototyp",
  hinweis:
    "Der Prototyp ist eine Testumgebung. Er zeigt mit den echten Inhalten des Vereins, wie der Webauftritt aussieht, wenn wir ihn innerhalb von appack so gut bauen, wie die Plattform es zulässt – nicht besser.",
};

// ---------- Seite 2 – Auf einen Blick ----------

export const BLICK_ABSATZ =
  "Unsere Website ist die Vorlage „Microwebseite“ des Anbieters appack: eine Kopfleiste mit Menü, ein Startbild und ein Inhaltsfenster, das am Rechner 40 Prozent der Fensterbreite einnimmt. Der Prototyp behält diese Vorlage bei und nutzt alles, was der Verein im CMS und im Workspace selbst einstellen kann: sechs Menüpunkte statt zwölf, Inhalt in voller Breite, Trainingszeiten für alle Mannschaften, Vereinsadressen statt privater Nummern. Was die Vorlage nicht kann, bleibt wie heute und steht in Kapitel 6.";

export const BLICK_EMPFEHLUNG =
  "Die appack-Fassung wird umgesetzt: Menü, Farben, Startbild und Fußbereich im CMS, die 36 Inhaltsseiten als Workspace-Dateien. Parallel bittet der Verein den Anbieter um eine verbindliche Aussage zu den Punkten in Kapitel 6. Der Vorstand entscheidet über die Punkte in Kapitel 8.";

export const KAPITEL_NAMEN = [
  "Die Vorlage und ihre Grenzen",
  "Sieben Situationen aus Sicht der Besucher",
  "Messbar",
  "Datenschutz und Pflichtangaben",
  "Was gleich bleibt",
  "Was nur der Anbieter ändern kann",
  "Der Weg: in appack umsetzen",
  "Entscheidungen des Vorstands",
  "Prototyp ansehen",
];

export const ANHANG_NAMEN = [
  "Lighthouse je Workspace-Seite",
  "Methodik",
  "Hülle und Workspace-Seiten",
  "Quellen",
];

// ---------- Kapitel 1 – Die Vorlage und ihre Grenzen ----------

export const K1_TEXT =
  "Alle Schreibweisen von sportfreunde04.de leiten auf eine Adresse bei appack.de weiter. Dort liefert der Anbieter seine Vorlage „Microwebseite“ aus: Kopfleiste mit Menü, Startbild mit Begrüßungstext, darunter ein Inhaltsfenster. Am Rechner ist dieses Fenster in der Standardeinstellung 40 Prozent der Fensterbreite und 87 Prozent der Fensterhöhe groß, bei 1 440 × 900 Pixeln also 576 × 783 Pixel; die übrigen 60 Prozent zeigt auf jeder Unterseite dasselbe Begrüßungsfoto. Der Inhalt ist viel höher als das Fenster: die Vorstandsseite 2 371 Pixel in 783 Pixeln Höhe. Besucher scrollen lange Inhalte durch ein Guckloch.";

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
  "Live-Seite am Rechner, 1 440 px: Inhalt im 576 px breiten Rahmen, zwei Scrollbalken, rechts das Begrüßungsfoto. Fotos unkenntlich gemacht.";
export const K1_BILD_NACHHER =
  "appack-Fassung, dieselbe Vorlage: Menüpunkt mit Vollbild-Einstellung, Inhalt über die Fensterbreite; das Fenster bleibt 92 Prozent der Bildschirmhöhe hoch.";

export const K1_SCHLUSS =
  "Ein Teil dieser Grenzen lässt sich im CMS aufheben: Das Feld „Vollbild“ je Menüpunkt macht das Fenster so breit wie der Bildschirm, das Menü lässt sich auf sechs Punkte kürzen, Farben und Startbild sind frei. Der andere Teil steckt in der Vorlage selbst: eine Adresse für alles, die Landeansicht ohne Inhalt, die feste Höhe des Fensters, das Menü ohne Links. Der Prototyp zeigt genau die Fassung, die der Verein ohne den Anbieter erreichen kann.";

// ---------- Kapitel 2 – Sieben Situationen ----------
// Je Situation: titel (wörtlich in Anführungszeichen lt. Spezifikation),
// heute/prototyp (aus den Fakten zusammengesetzt), bleibt (P18, neu: was
// trotz appack-Fassung bestehen bleibt, weil es nur der Anbieter ändern
// kann), satz = Bildunterschrift (bei Paaren wörtlich aus PAARE in
// src/begleit/vorher-nachher.mjs).

export const SITUATIONEN = [
  {
    titel: "Ein Elternteil sucht die Trainingszeit",
    heute:
      "Die Mannschaftsseite zeigt 1 224 Zeichen Text für zwölf Einträge – ohne Wochentag, Uhrzeit oder Platz. Die Trainingszeiten stehen nur in einem Kalender auf der News-Seite, Kontakt läuft über 26 × 17 Pixel kleine Telefon- und Mail-Symbole.",
    prototyp:
      "Die Mannschaftsübersicht zeigt alle elf Teams mit Wochentag, Uhrzeit und Platz; jede Mannschaft hat eine eigene Workspace-Seite mit den nächsten Spielen, der Vereinsmail und einem Kalender-Abo.",
    bleibt: "Die Seite läuft im Fenster der Vorlage; der Menüpunkt bleibt auf „Mannschaften“ stehen.",
    paarKey: "mannschaften-handy",
  },
  {
    titel: "Der erste Blick am Handy",
    heute:
      "Der erste Bildschirm ist ein Foto ohne Text; erste lesbare Information ist die Postadresse. Das aufgeklappte Menü zeigt 13 gleichrangige Punkte übereinander, im Hintergrund blitzt das Seitenfoto durch.",
    prototyp:
      "Der erste Bildschirm bleibt ein Bild mit Text, jetzt ohne Kinderfoto und mit dem Satz „Fußball im Gallus – seit 1904.“ Das Menü hat sechs Punkte.",
    bleibt: "Inhalt erst nach einem Klick; die Menüpunkte sind keine Links.",
    paarKey: "start-handy",
    zweitesPaarKey: "menue-handy",
  },
  {
    titel: "Am Rechner",
    heute:
      "Am Rechner füllt auf der Startseite ein Foto die ganze Fläche, ohne Wappen, Claim oder Vereinsdaten; der Inhalt läuft weiterhin durch den 576 Pixel breiten Rahmen in der Bildschirmmitte. Auf der Seite „Sportangebote“ folgen auf zwei Kacheln rund 450 Pixel leere Fläche.",
    prototyp:
      "Die Landeansicht bleibt das Startbild. Nach dem Klick auf „Mannschaften“ füllt der Inhalt die Fensterbreite: elf Mannschaften in drei Gruppen mit Trainingszeiten statt zwei Kacheln und Leerfläche.",
    bleibt: "Das Fenster ist 92 Prozent der Bildschirmhöhe hoch; die Seite scrollt innen und außen.",
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
    satz:
      "Auch in der appack-Fassung führt jeder geteilte Link auf die Startseite, weil die Vorlage für alle Seiten eine Adresse hat. Teilbar ist nur der Direktlink einer Workspace-Seite ohne Menü, zum Beispiel cdn.appack.de/sportfreunde04/workspace/mannschaften-d3.html; dort liefert die Seite Titel, Beschreibung und Vorschaubild.",
    vorschauUnterschrift:
      "Schematische Vorschau eines Direktlinks auf die Workspace-Seite, ohne das Menü der Website.",
    bleibt: "Eigene Adressen je Seite mit Menü kann nur der Anbieter einrichten.",
  },
  {
    titel: "Jemand möchte Mitglied werden",
    heute:
      "Die Seite beginnt direkt mit dem Antragsformular: IBAN und Unterschrift, ohne Angabe der Beiträge, ohne Datenschutzhinweis und ohne Feld für Erziehungsberechtigte.",
    prototyp:
      "Vor dem Formular stehen die Beiträge (9/10/7/15 Euro monatlich, 20 Euro Aufnahme), der Ablauf in Schritten und die mitzubringenden Unterlagen. Der Formularentwurf enthält Datenschutzhinweis, SEPA-Mandatstext und den Block für Erziehungsberechtigte; der Entwurf im Prototyp versendet nichts.",
    bleibt:
      "Das Formular des Prototyps versendet nichts. Ob das echte Formular als eigene Workspace-Seite mit Versand gebaut oder das appack-Formularmodul ergänzt wird, entscheidet der Vorstand (Kapitel 8).",
    paarKey: "mitglied-werden-handy",
  },
  {
    titel: "Ein Unternehmen überlegt zu sponsern",
    heute:
      "Die oberste Sponsorenkategorie zeigt ein Platzhalterbild mit dem Text „Hier könnte Ihr Logo stehen“; eine Kategorie erscheint doppelt, einmal als „App-Projektpartner“, einmal als „APP-Projektpartner“.",
    prototyp:
      "Die Sponsoren stehen in zwei klaren Kategorien mit den echten Logos, dazu ein Satz, wie man Sponsor wird, mit der Mailadresse der Geschäftsstelle.",
    bleibt: "Erreichbar über den Menüpunkt Verein, nicht über einen eigenen Menüpunkt.",
    paarKey: "sponsoren-handy",
  },
  {
    titel: "Service & Anträge",
    heute:
      "Die Seite zeigt drei unterschiedlich gestaltete Kacheln, zwei davon mit einem „Made with AI“-Wasserzeichen, dazu den Tippfehler „Mitgliedsbescheinigugen“.",
    prototyp:
      "Die Seite Downloads listet alle Dokumente einheitlich mit Dateiformat, Größe und Seitenzahl.",
    bleibt: "Impressum und Datenschutz öffnen weiter im schmalen Fenster der Vorlage.",
    paarKey: "service-handy",
  },
];

// ---------- Kapitel 3 – Messbar ----------
// Die 14 Zeilen der Messtabelle auf /vorher-nachher/ (src/begleit/
// vorher-nachher.mjs, nach P18 Schritt 0 mit der Beschriftung "Workspace- und
// Begleitseiten"), importiert statt dupliziert. Die Lighthouse-Zeile
// (appackFn) rechnet mit den Werten aus data/lighthouse.json (Schritt 1).

export const K3_MESSBAR_ZEILEN = MESSBAR_ZEILEN;

// Zusätzliche Zeilen laut Spezifikation (P18 Schritt 3)

export const K3_ZUSATZ_ZEILEN = [
  {
    merkmal: "Sponsorenlogos",
    live: "1 500 × 1 000 px für 150 × 100 px Anzeige",
    appack: "passende Größenstufen, AVIF/WebP",
    wer: "Verein (Workspace)",
  },
  {
    merkmal: "Kalender abonnieren",
    live: "nicht vorhanden",
    appack: "je Mannschaft Spiele und Training als ICS",
    wer: "Verein (Workspace)",
  },
  {
    merkmal: "Vorschau beim Teilen",
    live: "keine Beschreibung",
    appack: "nur bei Direktlinks auf Workspace-Seiten",
    wer: "Verein (Workspace) / Anbieter (Website-Adresse)",
  },
  {
    merkmal: "News",
    live: "5 Einträge in 9 Monaten, neuester überholt",
    appack: "News-Modul der App, unverändert",
    wer: "Verein im CMS (Überschriften, Instagram-Zugang)",
  },
  {
    merkmal: "Vereinsname",
    live: "sechs Schreibweisen",
    appack: "Registerfassung im Fuß und auf den Seiten",
    wer: "Verein im CMS und Workspace",
  },
];

export const MESSBAR_FUSSNOTE =
  "Live-Werte: Qualitätsprüfung vom 04.09.2026, Lighthouse-Messung der Startseite am 14.09.2026 (mobil) und Vermessung der Vorlage am 15.09.2026. appack-Fassung: automatische Prüfung über alle Workspace- und Begleitseiten (Werkzeuge im Repository) und Lighthouse je Seite per Direktlink über GitHub Pages; Datum und Messbasis aus data/lighthouse.json.";

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
  "Impressum und Datenschutz bleiben Klick-Elemente der Vorlage; die Texte selbst sind Workspace-Seiten mit eigener Direktadresse.",
];

export const K4_KASTEN =
  "Dieses Dokument ist keine Rechtsberatung. Die Datenschutzerklärung wurde im Prototyp unverändert übernommen; die juristische Prüfung von Datenschutzerklärung und Mitgliedsantrag steht seit dem Start der Android-App aus und ist unabhängig vom Weg der Website zu erledigen.";

// ---------- Kapitel 5 – Was gleich bleibt ----------

export const K5_ABSATZ =
  "Der Prototyp behält die Plattform, die Vorlage und die App. Mannschaften, Vorstand, Sponsoren, Downloads und Texte stammen aus dem appack-CMS; Spielpläne und Tabellen aus dem DFBnet; News bleiben im News-Modul der App; Wappen und Vereinsfarben sind dieselben. Was fehlt, ist sichtbar als ‚offen‘ gekennzeichnet.";

export const K5_OFFEN = [
  "ÖPNV-Anfahrt",
  "Öffnungszeiten der Geschäftsstelle",
  "Übungszeiten von vier Karnevalgruppen",
  "App-Store-Links",
  "Ergebnisse vergangener Spiele",
  "Fotos ohne Kinder",
];

export const K5_BILD_UNTERSCHRIFT =
  "Workspace-Seiten in der App: dieselben Inhalte in einem eingebetteten Browserfenster; die Navigation bleibt die der App.";

// "Was der Prototyp nicht ist" – wandert laut P18 Schritt 3 als Kasten ans
// Ende von Kapitel 5 (siehe baueKapitel5 in bauen.mjs); Punkt 4 aktualisiert.
export const K6_PUNKTE = [
  "Testumgebung auf GitHub Pages, keine Live-Seite.",
  "Jede Seite trägt den Hinweis „Prototyp · Testumgebung“.",
  "Das Formular versendet nichts.",
  "Die Daten sind eine Momentaufnahme vom 15.09.2026.",
  "Ergebnisse vergangener Spiele fehlen.",
  "Keine Fotos mit Kindern.",
];

// ---------- Kapitel 6 – Was nur der Anbieter ändern kann ----------
// Tabelle (Punkt · Problem heute · Wunsch), aus den bisherigen
// K7_BLOCK_C_ZEILEN korrigiert und ergänzt (P18 Schritt 3).

export const K6_TABELLE_ZEILEN = [
  {
    punkt: "Eigene Adressen",
    problem:
      "Alle Varianten von sportfreunde04.de leiten auf appack.de/rest-api/drender/6a7c… um; eine Adresse für alles, auch in der appack-Fassung.",
    wunsch:
      "Domain-Mapping auf sportfreunde04.de und eine eigene Adresse je Menüpunkt und Seite (Deep Links, Zurück-Knopf, Lesezeichen, Suchmaschinen, WhatsApp-Vorschau).",
  },
  {
    punkt: "Landeansicht",
    problem: "Die Vorlage zeigt zuerst Bild und Text; Inhalt erscheint erst nach einem Klick.",
    wunsch: "Erste Ansicht mit Inhalt (nächste Spiele, Training, Meldungen) oder frei wählbare Startseite.",
  },
  {
    punkt: "Rahmenhöhe",
    problem:
      "Inhaltsfenster fest 87 bzw. 92 Prozent der Fensterhöhe, zwei Scrollbereiche, Inhalte brechen ab.",
    wunsch: "Fenster wächst mit dem Inhalt oder entfällt; ein Scrollbereich.",
  },
  {
    punkt: "Menü",
    problem: "Div mit Klick-Skript, ohne Links, ohne Tastatur, „Mehr“ versteckt „Mitglied werden“.",
    wunsch: "Echte Links, Tastaturbedienung, kein Abschneiden, Menü schließt mit Escape.",
  },
  {
    punkt: "Grundgerüst",
    problem: "Kein h1, kein lang-Attribut, keine Meta-Beschreibung, alt=\"\" überall.",
    wunsch:
      "lang=\"de\", Überschriftenstruktur, Meta-Beschreibung und Open-Graph je Seite, Alternativtexte aus dem CMS.",
  },
  {
    punkt: "Ladeanimation",
    problem: "Vor jedem Aufruf mindestens eine Sekunde Vollbild-Ladeanzeige.",
    wunsch: "Entfällt oder nur bei tatsächlicher Wartezeit.",
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
    problem: "Klick-Elemente statt Links, öffnen im schmalen Fenster, keine eigene Adresse.",
    wunsch: "Echte Links mit eigener Adresse, Vollbild.",
  },
  {
    punkt: "Suchmaschinen",
    problem: "cdn.appack.de/robots.txt sperrt alle Workspace-Seiten für Suchmaschinen.",
    wunsch: "Freigabe für den Ordner des Vereins oder Auslieferung unter sportfreunde04.de.",
  },
  {
    punkt: "Datenschutzerklärung",
    problem: "Eine Fassung für App und Website, Überschrift „…der App“.",
    wunsch:
      "Eigene Fassung für die Website oder gemeinsame Fassung mit passender Überschrift (juristische Prüfung offen, A4).",
  },
];

export const K6_SATZ =
  "Diese Punkte gehören in dieselbe Anfrage wie das laufende Ticket 2623142. Solange der Anbieter sie nicht ändert, bleiben sie auch in der appack-Fassung bestehen.";

// ---------- Kapitel 7 – Der Weg: in appack umsetzen ----------

export const K7_BLOCK_A_TITEL = "Im CMS eintragen";
export const K7_BLOCK_A = [
  "Menü: fünf Einträge Mannschaften · Spielplan & Tabellen · News · Verein · Mitglied werden, jeweils mit Vollbild; alle anderen Einträge deaktivieren (Start ist fest).",
  "Farben: Kopf und Hintergrund #191793, Schrift weiß, aktiver Punkt weiß mit blauer Schrift, Hover #E4E7FA.",
  "Startbild ohne Kinderfoto hochladen und Text „Fußball im Gallus – seit 1904.“ eintragen.",
  "Fußbereich: Registername, Anschrift, Postfach, Vereinsmail, Vereinsnummer, „F.F.V. Sportfreunde 04, 2026“, Impressum und Datenschutz auf die Workspace-Seiten.",
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

export const K7_BLOCK_B_TITEL = "Als Workspace-Dateien hochladen";
export const K7_BLOCK_B = [
  "36 Inhaltsseiten (Liste in Anhang C), das Stylesheet site.css und die Bilder aus dem Prototyp.",
  "Schriften Barlow Condensed und Inter: in den Workspace hochladen, falls die Plattform woff2 annimmt, sonst von einem Host des Vereins laden (GitHub Pages, wie heute die Spielpläne).",
  "Spielpläne und Tabellen: im Prototyp zum Bauzeitpunkt eingefroren; in appack entweder als eingebettete Seiten des Spielplan-Generators (wie heute Spielplan-*.html) oder durch regelmäßiges Neu-Hochladen aktuell halten.",
  "Formular Mitglied werden: eigene Workspace-Seite mit Versand oder appack-Modul ergänzen (Kapitel 8).",
];

export const K7_BLOCK_C_TITEL = "Beim Anbieter anfragen";
export const K7_BLOCK_C_SATZ = "Siehe Kapitel 6 – Was nur der Anbieter ändern kann.";

export const K7_EMPFEHLUNG =
  "A und B umsetzen, weil sie in jedem Fall nötig sind und der Verein sie selbst kann. Gleichzeitig die Anfrage aus Kapitel 6 stellen und eine Frist setzen. Was der Anbieter bejaht, verbessert die Seite weiter; was er ablehnt, bleibt wie heute. Der Prototyp verspricht nichts darüber hinaus.";

// ---------- Kapitel 8 – Entscheidungen des Vorstands ----------

export const K8_ENTSCHEIDUNGEN = [
  "appack-Fassung freigeben (sechs Menüpunkte, Vollbild-Inhalt, Startbild ohne Kinderfoto, Inhalte des Prototyps).",
  "Telefonnummern der Trainerinnen und Trainer öffentlich – ja oder nein (Empfehlung des Dokuments: nein, Vereinsadressen genügen; 18 Team-Mailadressen sind vorhanden).",
  "Anfrage an vmapit mit Kapitel 6 stellen; Frist für die Antwort festlegen.",
  "Datenschutzerklärung und Mitgliedsantrag juristisch prüfen lassen.",
  "Offene Inhalte liefern (ÖPNV-Anfahrt, Öffnungszeiten, Übungszeiten Karneval, Fotos ohne Kinder).",
  "Formular: eigene Workspace-Seite mit Versand oder appack-Modul ergänzen.",
  "Spielpläne und Tabellen: Spielplan-Generator einbetten (wie heute) oder Seiten regelmäßig neu hochladen.",
  "Wer pflegt die Workspace-Dateien nach Änderungen?",
];

// ---------- Kapitel 9 – Prototyp ansehen ----------

export const K9_HINWEIS =
  "Am Handy und am Rechner öffnen. Die Begleitseite „Vorher / Nachher“ zeigt die Bildpaare dieses Dokuments mit Messtabelle, die Begleitseite „In der App“ zwei Workspace-Seiten im App-Format; beide sind unter der Adresse des Prototyps mit /vorher-nachher/ und /app/ erreichbar.";

export const K9_MENUEPUNKTE = [
  {
    name: "Start",
    satz: "Startbild mit Text, wie die Vorlage es vorgibt; Inhalte hinter den Menüpunkten.",
  },
  {
    name: "Mannschaften",
    satz:
      "Alle elf Mannschaften mit Trainingszeiten, Probetraining in drei Schritten, je Team eine Seite mit nächsten Spielen und Kalender-Abo.",
  },
  { name: "Spielplan & Tabellen", satz: "Spielpläne aus dem DFBnet und acht Tabellen als Momentaufnahme." },
  { name: "News", satz: "Der Newsfeed der App, wie heute, im Vollbild." },
  {
    name: "Verein",
    satz: "Wer wir sind, Vorstand, Sponsoren, Mach mit, Karnevalabteilung, Downloads, Kontakt & Anfahrt, Shop.",
  },
  { name: "Mitglied werden", satz: "Beiträge, Ablauf, Unterlagen und der Formularentwurf." },
];

// ---------- Anhang B – Methodik ----------
// "<Datum aus data/lighthouse.json>" wird in baueAnhangB() (bauen.mjs) durch
// das Datum aus dem "stand"-Feld der Schritt-1-Messung ersetzt.

export const ANHANG_B_ABSAETZE = [
  "Prüfdaten: 04.09.2026 (Live-Seite, Qualitätsprüfung), 14.09.2026 (Lighthouse der Live-Startseite), 15.09.2026 (Vermessung der Vorlage: Fenstermaße, Menü, Verhalten) und <Datum aus data/lighthouse.json> (appack-Fassung, automatische Prüfung über alle Workspace- und Begleitseiten, Lighthouse öffentlich über GitHub Pages).",
  "Werkzeuge: Chrome, Lighthouse 13, axe-core, eigene Prüfskripte im Repository (tools/pruefen.mjs, tools/lighthouse.mjs).",
  "Geprüfte Breiten: 320–1920 Pixel; zusätzlich 576 Pixel für das schmale Fenster der Vorlage.",
  "Lighthouse: ein Lauf je Seite; bei Performance unter 90 zwei weitere Läufe und Median.",
  "Die Hülle des Prototyps ist eine Nachbildung der Vorlage und wird nicht mit Lighthouse bewertet; die Werte der Adresse sportfreunde04.de bestimmt der Anbieter.",
  "Fotos auf den Vorher-Bildern wurden unkenntlich gemacht.",
];

// ---------- Bildpaare (aus src/begleit/vorher-nachher.mjs, PAARE) ----------
// Dateinamen, Alt-Texte wörtlich aus PAARE übernommen. satz = "Besser:"-Zeile
// der Begleitseite plus "Bleibt: " und die "Bleibt:"-Zeile, ebenfalls
// wörtlich aus PAARE übernommen (P18 Schritt 3).

export const PAARE_BILDER = {
  "vorstand-rahmen-desktop": {
    handy: false,
    vorher: {
      name: "vorher-vorstand-rahmen-desktop",
      alt: "Live-Unterseite am Rechner: schmaler Inhaltsrahmen in der Seitenmitte mit eigenem Scrollbalken, daneben leere Fläche",
    },
    nachher: {
      name: "nachher-vorstand-desktop",
      alt: "Prototyp-Vorstandsseite am Rechner im Inhaltsrahmen der appack-Fassung: Personenkarten mit Funktion und Vereinsmail",
    },
    satz:
      "Vorstand mit Funktion und Vereinsmail, Porträts in passender Größe, keine Mobilnummern. Bleibt: Menüpunkt bleibt auf „Verein“ stehen, weil die Vorlage Unterseiten nicht kennt; kein Zurück-Knopf.",
  },
  "mannschaften-handy": {
    handy: true,
    vorher: {
      name: "vorher-mannschaften-handy",
      alt: "Live-Mannschaftsliste am Handy: Kacheln mit Trainerfoto und kurzem Text, ohne Trainingszeiten",
    },
    nachher: {
      name: "nachher-mannschaften-handy",
      alt: "Prototyp-Mannschaftsübersicht am Handy im Inhaltsrahmen der appack-Fassung: Gruppe Senioren mit der 1. Herrenmannschaft und Trainingszeiten, darunter der Beginn der Gruppe Jugend",
    },
    satz:
      "Elf Mannschaften absteigend nach Alter, jede mit Trainingstag, Uhrzeit und Platz; keine privaten Telefonnummern. Bleibt: Rahmen 93 Prozent der Bildschirmhöhe, darunter der Fußbereich.",
  },
  "start-handy": {
    handy: true,
    vorher: {
      name: "vorher-start-handy",
      alt: "Live-Startseite am Handy: ganzseitiges Foto ohne Text, nur Burger-Menü und Wappen oben",
    },
    nachher: {
      name: "nachher-start-handy",
      alt: "Prototyp-Startseite am Handy in appack-Fassung: Kopfleiste mit Wappen und Burger-Symbol über dem Startbild mit dem Satz „Fußball im Gallus – seit 1904.“",
    },
    satz:
      "Ruhiges Startbild, kürzerer Text, Menü mit sechs Punkten hinter dem Burger. Bleibt: Inhalt erst nach einem Klick, keine eigene Adresse.",
  },
  "menue-handy": {
    handy: true,
    vorher: {
      name: "vorher-menue-handy",
      alt: "Aufgeklapptes Live-Menü am Handy: 13 gleich gestaltete Punkte übereinander, im Hintergrund scheint das Seitenfoto durch",
    },
    nachher: {
      name: "nachher-menue-handy",
      alt: "Aufgeklapptes Prototyp-Menü am Handy in appack-Fassung: sechs Punkte in Weiß und Blau unterhalb der Kopfleiste, „Start“ weiß hervorgehoben",
    },
    satz:
      "Sechs Punkte statt zwölf, keine Doppelungen (Fanshop, Teamshop, Sponsoren, Vorstand, Mach mit, Service werden Unterseiten). Bleibt: Menüpunkte sind keine Links, keine Tastaturbedienung.",
  },
  "start-desktop": {
    handy: false,
    vorher: {
      name: "vorher-start-desktop",
      alt: "Live-Startseite am Rechner: Foto über die gesamte Breite, Menüleiste mit zwölf Punkten",
    },
    nachher: {
      name: "nachher-start-desktop",
      alt: "Prototyp-Startseite am Rechner in appack-Fassung: Kopfleiste mit Wappen und sechs Menüpunkten über dem Startbild mit dem Satz „Fußball im Gallus – seit 1904.“",
    },
    satz:
      "Sechs Menüpunkte statt zwölf, kein „Mehr“-Ausklapper, Startbild ohne Kinderfotos, aktiver Menüpunkt mit lesbarem Kontrast. Bleibt: Landeansicht aus Bild und Text ohne Inhalt, Ladeanimation vor jedem Aufruf.",
  },
  "sportangebote-desktop": {
    handy: false,
    vorher: {
      name: "vorher-sportangebote-desktop",
      alt: "Live-Sportangebote am Rechner: zwei Kacheln (Fußball, Karneval), darunter eine große leere Fläche",
    },
    nachher: {
      name: "nachher-mannschaften-desktop",
      alt: "Prototyp-Mannschaftsübersicht am Rechner im Inhaltsrahmen der appack-Fassung: Gruppe Senioren mit der 1. Herrenmannschaft und Trainingszeiten, darunter der Beginn der Gruppe Jugend",
    },
    satz:
      "Inhalt in voller Breite statt in einem 40-Prozent-Rahmen; Trainingszeiten, Jahrgänge und Ansprechpartner auf einer Seite. Bleibt: Feste Rahmenhöhe, die Seite scrollt innen und außen.",
  },
  "mitglied-werden-handy": {
    handy: true,
    vorher: {
      name: "vorher-mitglied-werden-handy",
      alt: "Live-Formular am Handy: Antragsformular beginnt direkt mit den persönlichen Angaben, keine Beitragsangaben sichtbar",
    },
    nachher: {
      name: "nachher-mitglied-werden-handy",
      alt: "Prototyp-Seite Mitglied werden am Handy im Inhaltsrahmen der appack-Fassung: Beitragstabelle der Fußballabteilung vor dem Formular",
    },
    satz:
      "Beiträge und Ablauf vor dem Formular, richtige Feldtypen, Datenschutzhinweis, SEPA-Text, Erziehungsberechtigte. Bleibt: Das Formular des Prototyps versendet nichts; das echte Formular bleibt das appack-Modul.",
  },
  "sponsoren-handy": {
    handy: true,
    vorher: {
      name: "vorher-sponsoren-handy",
      alt: "Live-Sponsorenseite am Handy: oberste Kategorie zeigt ein Platzhalterbild, „App-Projektpartner“ erscheint zweimal",
    },
    nachher: {
      name: "nachher-sponsoren-handy",
      alt: "Prototyp-Sponsorenseite am Handy im Inhaltsrahmen der appack-Fassung: Kategorie Partner mit Logos, darunter der Beginn der Kategorie App-Projektpartner",
    },
    satz:
      "Zwei Kategorien statt drei, kein Platzhalter „Hier könnte Ihre Werbung stehen“, Logos verkleinert, „Sponsor werden“ mit Vereinsmail. Bleibt: Erreichbar nur über Verein, nicht über einen eigenen Menüpunkt oder Link.",
  },
  "service-handy": {
    handy: true,
    vorher: {
      name: "vorher-service-handy",
      alt: "Live-Serviceseite am Handy: drei unterschiedlich gestaltete Kacheln, eine mit KI-Wasserzeichen und dem Tippfehler „Mitgliedsbescheinigugen“",
    },
    nachher: {
      name: "nachher-downloads-handy",
      alt: "Prototyp-Downloadseite am Handy im Inhaltsrahmen der appack-Fassung: einheitliche Liste mit Dateiformat, Größe und Seitenzahl je Dokument",
    },
    satz:
      "Downloads mit Größe und Seitenzahl, kein KI-Bild, kein Tippfehler. Bleibt: Impressum und Datenschutz öffnen weiterhin im schmalen Rahmen der Vorlage.",
  },
};

// ---------- Anhang D – Quellen ----------

export const ANHANG_D_QUELLEN = [
  "Speuzer Website – Qualitätsprüfung 04.09.2026 (internes Dokument, Ordner Verein)",
  "Speuzer Website – Übernahme nach appack, Stand 14.09.2026 (internes Dokument, Ordner Verein)",
  "Lighthouse-Messung der Live-Startseite am 14.09.2026, mobil und Desktop, Lighthouse 13",
  "Repository und Prototyp: github.com/justOlgay/speuzer-website-prototyp, Stand 15.09.2026",
  "Speuzer Website – Umbauplan appack-Fassung 15.09.2026 (internes Dokument, Ordner Verein)",
  "Vermessung der appack-Vorlage am 15.09.2026 (Rahmenmaße, Menüverhalten, Worksheets START/MENU/FOOTER)",
];
