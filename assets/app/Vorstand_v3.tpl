<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
<meta name="format-detection" content="telephone=no">
<meta name="format-detection" content="address=no">
<meta name="format-detection" content="email=no">
<meta name="format-detection" content="date=no">
<title>${userTitle}</title>
<style>

/* Speuzer Blau-Weiß – Vorstand_v3.tpl (C1)
   appack-Vorlage für die Seite "Vorstand & Ansprechpartner". Kopf- und Tab-Leiste
   kommen von der App-Huelle und sind NICHT Teil dieser Vorlage (kein eigener
   Kopf, kein eigener Fuss). Erzeugt aus src/app/v3-basis.css + src/app/Vorstand_v3.html
   durch tools/app-optik/tpl-bauen.mjs (npm run tpl-bauen) – NICHT von Hand
   bearbeiten, sondern die Quelldateien unter src/app/ ändern und neu bauen.
   Details/Datenquellen: siehe assets/app/LIESMICH.md, Abschnitt "Stufe C". */

/* Speuzer Blau-Weiß – v3-basis.css (C1)
   Gemeinsame Grundlage der appack-Vorlagen-Familie "_v3" (Startseite_v3.tpl
   [B1] und die fünf Vereinsseiten [C1]). Schriften, Tokens, Grundregeln und
   die gemeinsamen Bausteine (Karte, Zeile, Abschnittstitel, Knopf, Knopf
   leise, Tag, Hinweis, Aktionen, Fuß) sind wörtlich aus
   assets/app/Startseite_v3.tpl (Abschnitte 1–4 und 8) übernommen –
   inhaltlich identisch, nur hierher ausgelagert, damit tools/app-optik/
   tpl-bauen.mjs sie den fünf neuen Vorlagen voranstellen kann.
   Startseite_v3.tpl selbst bleibt unverändert (produktiv, siehe C1-Spezifikation)
   und wird NICHT auf dieses Bauskript umgestellt – dieser Block hier ist eine
   bewusste Kopie, keine gemeinsame Quelle mit Startseite_v3.tpl.
   Kopf- und Tab-Leiste kommen von der App-Hülle und sind NICHT Teil dieser
   Vorlagen (kein eigener Kopf, kein eigener Fuß). Farben/Schrift/Abstände
   ausschließlich aus assets/css/tokens.css. Kein Foto, keine Kacheln, keine
   Sponsorenleiste, kein Eintracht-Design. */

/* === 1. Schriften (absolute GitHub-Pages-Adressen, siehe assets/app/styles.css) === */

@font-face {
  font-family: 'Barlow Condensed';
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url("https://justolgay.github.io/speuzer-website-prototyp/assets/fonts/barlow-condensed-600.woff2") format('woff2');
}

@font-face {
  font-family: 'Barlow Condensed';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url("https://justolgay.github.io/speuzer-website-prototyp/assets/fonts/barlow-condensed-700.woff2") format('woff2');
}

@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 400 600;
  font-display: swap;
  src: url("https://justolgay.github.io/speuzer-website-prototyp/assets/fonts/inter.woff2") format('woff2');
}

/* === 2. Tokens (Teilmenge aus assets/css/tokens.css) === */

:root {
  --blau-950: #0B0E4A;
  --blau-900: #151A7A;
  --blau-800: #191793;
  --blau-700: #1F2DBE;
  --blau-500: #3D4FEA;
  --blau-100: #E4E7FA;
  --blau-50: #F3F5FC;
  --ink: #12142B;
  --ink-2: #3F4360;
  --ink-3: #5B6079;
  --line: #D8DBEA;
  --bg: #F5F6FB;
  --surface: #FFFFFF;
  --weiss: #FFFFFF;

  --font-head: "Barlow Condensed", "Arial Narrow", sans-serif;
  --font-text: "Inter", system-ui, sans-serif;

  --sp-1: 4px;
  --sp-2: 8px;
  --sp-3: 12px;
  --sp-4: 16px;
  --sp-5: 24px;
  --sp-6: 32px;

  --r-sm: 6px;
  --r-md: 12px;
  --r-lg: 20px;
  --r-pill: 999px;

  --sh-1: 0 1px 2px rgba(11, 14, 74, .06), 0 1px 1px rgba(11, 14, 74, .04);
  --sh-2: 0 8px 24px rgba(11, 14, 74, .10);
}

/* === 3. Grundregeln === */

*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }

body {
  background: var(--bg);
  color: var(--ink);
  font-family: var(--font-text);
  font-size: 14px;
  line-height: 1.4;
  -webkit-font-smoothing: antialiased;
}

a { color: inherit; }
svg { display: block; flex: 0 0 auto; }

/* [hidden] muss auch gegen eigene display:flex/inline-flex-Regeln gewinnen –
   ohne diese Regel gewinnt die spezifischere Klassenregel gegen das
   UA-Stylesheet (siehe Startseite_v3.tpl, Schritt 1.1). */
[hidden] { display: none !important; }

.inhalt {
  padding: var(--sp-4);
  /* Die schwebende Tab-Leiste der App liegt über dem Seitenende (gemessen 21.09.2026) */
  padding-bottom: 96px;
}

/* === 4. Bausteine === */

.karte {
  background: var(--surface);
  border-radius: var(--r-md);
  box-shadow: var(--sh-1);
  padding: var(--sp-4);
}

.zeile {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  min-height: 56px;
  padding-block: var(--sp-2);
  text-decoration: none;
  color: inherit;
  border-bottom: 1px solid var(--line);
}

.zeile:last-child { border-bottom: none; }

.zeile__text { flex: 1 1 auto; min-width: 0; }

.zeile__titel {
  margin: 0;
  font-weight: 600;
  font-size: 15px;
  overflow-wrap: break-word;
}

.zeile__pfeil {
  flex: 0 0 auto;
  width: 20px;
  height: 20px;
  color: var(--ink-3);
}

.abschnittstitel {
  font-family: var(--font-head);
  font-weight: 700;
  font-size: 20px;
  text-transform: uppercase;
  color: var(--blau-950);
  margin: var(--sp-6) 0 var(--sp-3);
  /* W9, Auftrag D (Entscheidung 13, App-weit): Überschriften nie
     automatisch trennen. */
  hyphens: manual;
  text-wrap: balance;
}

/* W9, Auftrag D (Entscheidung 13, App-weit): Fließtext mit ausgewogenerem
   Umbruch (unterstützende Browser; ohne Unterstützung normaler Umbruch). */
p { text-wrap: pretty; }

.inhalt > .abschnittstitel:first-child { margin-top: 0; }

/* Seitenkopf-Baustein (W8, App-weit): einheitlicher, kartenloser
   Einleitungssatz direkt unter dem (unsichtbaren) h1 jeder Seite – die
   App-Kopfleiste zeigt den Seitentitel bereits, ein eigener Kartentitel
   wäre doppelt. Gleicher Abstand nach unten wie ein Abschnittstitel. */
.seitenkopf-lead {
  margin: 0 0 var(--sp-5);
  font-size: 15px;
  color: var(--ink-2);
}

/* Aufklapper (W8, App-weit): kein natives Dreieck "▶" vor <summary> – der
   Chevron/"›" steht stattdessen im Text der jeweiligen Beschriftung. */
summary { list-style: none; cursor: pointer; }
summary::-webkit-details-marker { display: none; }
summary::marker { content: ""; }

.knopf {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding-inline: var(--sp-4);
  border-radius: var(--r-md);
  background: var(--blau-700);
  color: var(--weiss);
  font-weight: 600;
  font-size: 14px;
  text-decoration: none;
  border: none;
  cursor: pointer;
}

/* W9-Nachprüfung D-app Nr. 5: ein <button class="knopf"> erbt ohne
   font-family: inherit nicht die App-Schrift (User-Agent-Standard, z. B.
   Arial), anders als ein <a class="knopf"> – "font: inherit" setzt Familie/
   Größe/Gewicht zurück, deshalb Gewicht/Größe direkt danach wie .knopf
   erneut gesetzt. */
button.knopf {
  font: inherit;
  font-weight: 600;
  font-size: 14px;
}

.knopf--leise {
  background: var(--surface);
  border: 1px solid var(--line);
  color: var(--blau-800);
}

.tag {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: var(--r-pill);
  background: var(--blau-100);
  color: var(--blau-800);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .02em;
}

.hinweis {
  display: block;
  border-left: 3px solid var(--blau-700);
  background: var(--blau-50);
  padding: var(--sp-3) var(--sp-4);
  border-radius: 0 var(--r-md) var(--r-md) 0;
  font-size: 14px;
  color: var(--ink-2);
  margin-top: var(--sp-5);
}

.hinweis p { margin: 0; }

/* === 8. Aktionen und Fuß === */

.aktionen {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  margin-top: var(--sp-5);
}

.fuss {
  margin: var(--sp-6) 0 0;
  font-size: 12px;
  color: var(--ink-3);
  text-align: center;
}

/* Vorstand_v3.tpl – seitenspezifisch (C1). W8, Grundsatz Daten: Personen
   und Gruppierung aus [{"name":"Melanie Seipp","funktion":"1. Vorsitzende","mail":"geschaeftsstelle@sportfreunde04.de","foto":{"quelle":"vorstand-melanie-seipp","bytes":525138}},{"name":"Uwe Korndörfer","funktion":"2. Vorsitzender","mail":"geschaeftsstelle@sportfreunde04.de","foto":{"quelle":"vorstand-uwe-korndorfer","bytes":517113}},{"name":"Wolfgang Schirmer","funktion":"1. Kassierer","mail":"kassierer@sportfreunde04.de","foto":{"quelle":"vorstand-wolfgang-schirmer","bytes":495840}},{"name":"Bernhard Henrich","funktion":"2. Kassierer","mail":"kassierer@sportfreunde04.de","foto":{"quelle":"vorstand-bernhard-henrich","bytes":135549}},{"name":"Ralf Schwager","funktion":"1. Jugendleiter","mail":"jugendleitung@sportfreunde04.de","foto":{"quelle":"vorstand-ralf-schwager","bytes":112402}},{"name":"Olgay Özkan","funktion":"2. Jugendleiter","mail":"jugendleitung@sportfreunde04.de","foto":{"quelle":"vorstand-olgay-ozkan","bytes":60038}},{"name":"Marcel Hogg","funktion":"Team Jugendleitung","mail":"jugendleitung@sportfreunde04.de","foto":{"quelle":"vorstand-marcel-hogg","bytes":125052}},{"name":"Vassilios Miamis","funktion":"Team Jugendleitung","mail":"jugendleitung@sportfreunde04.de","foto":{"quelle":"vorstand-vassilios-miamis","bytes":215395}},{"name":"Florian Müller","funktion":"Kinderschutzbeauftragter","mail":"kinderschutzbeauftragter@sportfreunde04.de","foto":{"quelle":"vorstand-florian-muller","bytes":69465}},{"name":null,"funktion":"Schriftführer","mail":null,"foto":null,"hinweis":"nicht besetzt"},{"name":"Wolfgang Krönung","funktion":"Sportliche Leitung Senioren","mail":"spielausschuss_senioren@sportfreunde04.de","foto":null},{"name":"Christine Rothe","funktion":"Spielausschuss Senioren","mail":"spielausschuss_senioren@sportfreunde04.de","foto":null},{"name":"Patrick Krösche","funktion":"Abteilungsleiter Karneval","mail":"karnevalabteilung@sportfreunde04.de","foto":{"quelle":"vorstand-patrick-krosche","bytes":221052}},{"name":"Sigrid Weber","funktion":"Kassiererin Karneval","mail":"karnevalabteilung@sportfreunde04.de","foto":null},{"name":"Bettina Leven-Grieb","funktion":"Schriftführerin Karneval","mail":"karnevalabteilung@sportfreunde04.de","foto":null}] (data/vorstand.json) – dieselbe
   Zuordnung wie GRUPPEN_DEFINITION in verein/vorstand.mjs, vier feste
   Abschnitte statt umbrechender Filterchips. Fotos bleiben zur Laufzeit aus
   dem Ansprechpartner-Worksheet (Feld ansImg, per Namensgleichheit), nie im
   Repo. */

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* W9, Auftrag D (Befund "app" Nr. 26): der Hinweiskasten steht jetzt VOR
   der Gruppenliste (gleicher Abstand wie zwischen den Gruppen selbst), die
   frühere Ausnahme "erste Gruppe ohne Abstand" entfällt deshalb – sonst
   klebte die erste Überschrift am Kasten. */
.gruppe-abschnitt { margin-top: var(--sp-6); }

.kontakte-liste {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

/* W9-Nachprüfung D-app Nr. 13: gleicher Label-Stil wie .angaben auf
   "Kontakt & Anfahrt" (Geschaeftsstelle_v3.html) – wortgleiche Regeln. */
.angaben {
  margin: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 2px 0;
}
.angaben dd + dt { margin-top: var(--sp-3); }

.angaben dt {
  font-size: 13px;
  color: var(--ink-3);
}

.angaben dd {
  margin: 0;
  min-width: 0;
  font-size: 14px;
  font-weight: 600;
  overflow-wrap: break-word;
}

.mail-link { display: inline-block; max-width: 100%; overflow-wrap: break-word; color: var(--blau-800); text-decoration: none; }

/* W9-Nachprüfung D-app "neu_kaputt": seit der Hinweiskasten vor die
   Gruppenliste gewandert ist (Befund "app" Nr. 26), klebte die Linkliste am
   Seitenende ohne Abstand an der letzten Personenkarte – jetzt derselbe
   Abstand wie zwischen zwei Gruppen (.gruppe-abschnitt). */
#gruppen-bereich + .liste {
  margin-top: var(--sp-6);
}

.person-karte {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-3);
}

.person-karte__bild {
  flex: 0 0 auto;
  width: 56px;
  height: 56px;
  border-radius: var(--r-pill);
  object-fit: cover;
  object-position: 50% 0%;
  background: var(--blau-50);
  box-shadow: 0 0 0 1px var(--line);
}

.person-karte__initialen {
  flex: 0 0 auto;
  width: 56px;
  height: 56px;
  border-radius: var(--r-pill);
  background: var(--blau-100);
  color: var(--blau-800);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-head);
  font-weight: 700;
  font-size: 18px;
}

.person-karte__inhalt { flex: 1 1 auto; min-width: 0; }

.person-karte__name {
  margin: 0;
  font-weight: 600;
  font-size: 16px;
  overflow-wrap: break-word;
}

/* W8, Befund 4: Rolle als kleine Textzeile unter dem Namen statt Pille
   (bricht bei langen Funktionsnamen sonst zum Oval um). */
.person-karte__funktion {
  margin: 2px 0 var(--sp-2);
  font-size: 13px;
  color: var(--ink-3);
  overflow-wrap: break-word;
}

.person-karte__link {
  color: var(--blau-700);
  font-weight: 600;
  font-size: 13px;
  text-decoration: none;
}

/* W8, Befund 4: unbesetztes Amt ohne Initialen-Avatar – reine Textzeile mit
   Verweis auf "Mach mit". */
.person-zeile-unbesetzt {
  /* W9, Auftrag D (Befund "app" Nr. 26): ohne margin:0 addierte sich der
     UA-Absatzabstand des <p> zum Gruppenabstand darunter (rund 64 statt
     40 px). */
  margin: 0;
  padding: var(--sp-2) 0;
  font-size: 14px;
  color: var(--ink-2);
}

.person-zeile-unbesetzt a {
  color: var(--blau-700);
  font-weight: 600;
  text-decoration: none;
}
</style>
</head>
<body>
<main class="inhalt">

<h1 class="visually-hidden">Vorstand</h1>

<p class="seitenkopf-lead">Wer den Verein führt – erreichbar über die Vereinsadressen.</p>

<div class="hinweis">
  <dl id="vorstand-hinweis" class="angaben"></dl>
</div>

<div id="gruppen-bereich"></div>

<div class="liste">
  <a class="zeile" href="nav://sportfreunde04_TextImage_1780401660324">
    <span class="zeile__text"><span class="zeile__titel">Kontakt &amp; Anfahrt</span></span>
    <svg class="zeile__pfeil" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7"/></svg>
  </a>
  <a class="zeile" href="nav://sportfreunde04_TextImage_1780401660329">
    <span class="zeile__text"><span class="zeile__titel">Mitglied werden</span></span>
    <svg class="zeile__pfeil" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7"/></svg>
  </a>
</div>

<p class="fuss">F.F.V. Sportfreunde 04 · Vereins-App</p>

</main>

<script src="https://cdn.appack.de/modules/common/jquery-3.4.1.min.js"></script>
<script src="https://cdn.appack.de/modules/appack.workbook-1.4.1.js"></script>
<script>
(function () {
  "use strict";

  var VORSTAND = [{"name":"Melanie Seipp","funktion":"1. Vorsitzende","mail":"geschaeftsstelle@sportfreunde04.de","foto":{"quelle":"vorstand-melanie-seipp","bytes":525138}},{"name":"Uwe Korndörfer","funktion":"2. Vorsitzender","mail":"geschaeftsstelle@sportfreunde04.de","foto":{"quelle":"vorstand-uwe-korndorfer","bytes":517113}},{"name":"Wolfgang Schirmer","funktion":"1. Kassierer","mail":"kassierer@sportfreunde04.de","foto":{"quelle":"vorstand-wolfgang-schirmer","bytes":495840}},{"name":"Bernhard Henrich","funktion":"2. Kassierer","mail":"kassierer@sportfreunde04.de","foto":{"quelle":"vorstand-bernhard-henrich","bytes":135549}},{"name":"Ralf Schwager","funktion":"1. Jugendleiter","mail":"jugendleitung@sportfreunde04.de","foto":{"quelle":"vorstand-ralf-schwager","bytes":112402}},{"name":"Olgay Özkan","funktion":"2. Jugendleiter","mail":"jugendleitung@sportfreunde04.de","foto":{"quelle":"vorstand-olgay-ozkan","bytes":60038}},{"name":"Marcel Hogg","funktion":"Team Jugendleitung","mail":"jugendleitung@sportfreunde04.de","foto":{"quelle":"vorstand-marcel-hogg","bytes":125052}},{"name":"Vassilios Miamis","funktion":"Team Jugendleitung","mail":"jugendleitung@sportfreunde04.de","foto":{"quelle":"vorstand-vassilios-miamis","bytes":215395}},{"name":"Florian Müller","funktion":"Kinderschutzbeauftragter","mail":"kinderschutzbeauftragter@sportfreunde04.de","foto":{"quelle":"vorstand-florian-muller","bytes":69465}},{"name":null,"funktion":"Schriftführer","mail":null,"foto":null,"hinweis":"nicht besetzt"},{"name":"Wolfgang Krönung","funktion":"Sportliche Leitung Senioren","mail":"spielausschuss_senioren@sportfreunde04.de","foto":null},{"name":"Christine Rothe","funktion":"Spielausschuss Senioren","mail":"spielausschuss_senioren@sportfreunde04.de","foto":null},{"name":"Patrick Krösche","funktion":"Abteilungsleiter Karneval","mail":"karnevalabteilung@sportfreunde04.de","foto":{"quelle":"vorstand-patrick-krosche","bytes":221052}},{"name":"Sigrid Weber","funktion":"Kassiererin Karneval","mail":"karnevalabteilung@sportfreunde04.de","foto":null},{"name":"Bettina Leven-Grieb","funktion":"Schriftführerin Karneval","mail":"karnevalabteilung@sportfreunde04.de","foto":null}];
  var VEREIN = {"name_register":"Frankfurter Fußballverein Sportfreunde 1904 e. V.","name_kurz":"FFV Sportfreunde 04","spitzname":"Speuzer","gegruendet":"15. Mai 1904","gruendungsname":"Frankfurter FC Britannia","umbenannt":"1919","stadtteil":"Gallus","sportstaette":{"strasse":"Mainzer Landstraße 480","plz":"60326","ort":"Frankfurt am Main"},"post":{"postfach":"Postfach 190442","plz":"60091","ort":"Frankfurt am Main"},"mail":"geschaeftsstelle@sportfreunde04.de","tel_geschaeftsstelle":"069 736868","tel_platzwart":"069 732193","register":"Amtsgericht Frankfurt am Main, VR 4727","vorsitz":["Melanie Seipp (1. Vorsitzende)","Uwe Korndörfer (2. Vorsitzender)"],"vertretung":["Melanie Seipp (1. Vorsitzende)","Uwe Korndörfer (2. Vorsitzender)"],"instagram":"https://www.instagram.com/speuzer_ffm/","facebook":"https://www.facebook.com/groups/223133414377924/","fanshop":"https://sportfreunde04.fan12.de/","teamshop":"https://www.11teamsports.com/de-de/clubshop/frankfurter-fussballvereine-sportfreunde-04/","mails":{"jugendleitung":"jugendleitung@sportfreunde04.de","kassierer":"kassierer@sportfreunde04.de","kinderschutz":"kinderschutzbeauftragter@sportfreunde04.de","karneval":"karnevalabteilung@sportfreunde04.de","senioren":"spielausschuss_senioren@sportfreunde04.de","vorstand":"vorstand@sportfreunde04.de"},"hinweise":{"parken":"Der Parkplatz am Vereinsgelände ist wegen des Neubaus des Funktionsgebäudes voraussichtlich bis Ende Januar 2027 gesperrt. Der Zugang zum Gelände ist über den Hintereingang am „Haus der Jugend“ (Pavillon) möglich.","parken_quelle":"App-News vom 21.07.2026","ferien":"In den hessischen Schulferien und an Feiertagen findet in der Regel kein Training statt. Ausnahmen sagt das Trainerteam an."},"oepnv":null,"anfahrt_hinweis":"Zugang zum Vereinsgelände derzeit über den Hintereingang am „Haus der Jugend“ (Pavillon); der Parkplatz ist wegen des Neubaus bis voraussichtlich Ende Januar 2027 gesperrt.","gruendung_jahr":1904,"anzahl_mannschaften":11,"karten":{"apple":"https://maps.apple.com/?q=Mainzer+Landstra%C3%9Fe+480,+60326+Frankfurt+am+Main","google":"https://www.google.com/maps/search/?api=1&query=Mainzer+Landstra%C3%9Fe+480%2C+60326+Frankfurt+am+Main"},"kalender_basis":"https://justolgay.github.io/speuzer-spielplan/"};
  var ANSPRECHPARTNER_ID = "6a1ec5fcf68a05bf129cdb8b";

  // Porträts wie auf der Website: dieselben, einheitlich zugeschnittenen
  // Vorstandsfotos (data/vorstand.json foto.quelle, Varianten auf GitHub
  // Pages). Das Bild aus dem Ansprechpartner-Worksheet ist nur Rückfall für
  // Personen ohne Website-Foto (W8, Olgays Rückmeldung zum Zuschnitt).
  var FOTO_BASIS = "https://justolgay.github.io/speuzer-website-prototyp/assets/bilder/erzeugt/";
  function vereinsFotoUrl(name) {
    var p = (VORSTAND || []).find(function (x) { return x.name === name; });
    return p && p.foto && p.foto.quelle ? FOTO_BASIS + p.foto.quelle + "-480.jpg" : null;
  }

  var MACH_MIT_URL = "https://cdn.appack.de/sportfreunde04/workspace/web/verein-mach-mit.html";

  // Textzeile für ein unbesetztes Amt (W8, Befund 4) – "Schriftführer" (die
  // einzige derzeit unbesetzte Funktion in data/vorstand.json) wird zur
  // Tätigkeit "Schriftführung"; sonst die Funktion unverändert.
  var UNBESETZT_LABEL = { "Schriftführer": "Schriftführung" };

  // Wie GRUPPEN_DEFINITION in verein/vorstand.mjs (wörtlich übernommen).
  var GRUPPEN_DEFINITION = [
    { titel: "Geschäftsführender Vorstand", funktionen: ["1. Vorsitzende", "2. Vorsitzender", "1. Kassierer", "2. Kassierer", "Schriftführer"] },
    { titel: "Jugendleitung", funktionen: ["1. Jugendleiter", "2. Jugendleiter", "Team Jugendleitung", "Kinderschutzbeauftragter"] },
    { titel: "Senioren", funktionen: ["Sportliche Leitung Senioren", "Spielausschuss Senioren"] },
    { titel: "Karnevalabteilung", funktionen: ["Abteilungsleiter Karneval", "Kassiererin Karneval", "Schriftführerin Karneval"] }
  ];

  function textFeld(zeile, name) {
    var v = zeile && zeile[name];
    return (v === undefined || v === null) ? "" : String(v);
  }

  function bildUrlGueltig(url) {
    return /^https?:\/\//i.test(url || "");
  }

  function initialenAus(name) {
    var teile = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (!teile.length) return "";
    if (teile.length === 1) return teile[0].slice(0, 1).toUpperCase();
    return (teile[0].slice(0, 1) + teile[teile.length - 1].slice(0, 1)).toUpperCase();
  }

  function ladeWorkbook(id) {
    if (!window.Workbook || typeof Workbook.load !== "function") {
      return Promise.reject(new Error("Workbook-API fehlt"));
    }
    return Workbook.load({ workbook: id, filter: {}, offset: 0, limit: 5000, sort: "_id", direction: "asc" })
      .then(function (rows) { return Array.isArray(rows) ? rows : []; });
  }

  function findeBildFuerName(ansprechpartner, name) {
    for (var i = 0; i < ansprechpartner.length; i++) {
      if (textFeld(ansprechpartner[i], "ansName") === name) {
        var url = textFeld(ansprechpartner[i], "ansImg");
        if (bildUrlGueltig(url)) return url;
      }
    }
    return null;
  }

  function bauePersonKarte(person) {
    var karte = document.createElement("div");
    karte.className = "karte person-karte";

    var kreis = document.createElement("div");
    kreis.className = "person-karte__initialen";
    kreis.setAttribute("aria-hidden", "true");
    kreis.textContent = initialenAus(person.name);
    karte.appendChild(kreis);

    var inhalt = document.createElement("div");
    inhalt.className = "person-karte__inhalt";
    var name = document.createElement("p");
    name.className = "person-karte__name";
    name.textContent = person.name;
    inhalt.appendChild(name);
    var funktion = document.createElement("p");
    funktion.className = "person-karte__funktion";
    funktion.textContent = person.funktion;
    inhalt.appendChild(funktion);
    if (person.mail) {
      var mail = document.createElement("a");
      mail.className = "person-karte__link";
      mail.href = "mailto:" + person.mail;
      mail.textContent = "E-Mail schreiben ›";
      inhalt.appendChild(mail);
    }
    karte.appendChild(inhalt);
    return karte;
  }

  function baueUnbesetztZeile(person) {
    var p = document.createElement("p");
    p.className = "person-zeile-unbesetzt";
    var label = UNBESETZT_LABEL[person.funktion] || person.funktion;
    p.innerHTML = label + ": derzeit nicht besetzt – Interesse? <a href=\"" + MACH_MIT_URL + "\">Mach mit ›</a>";
    return p;
  }

  var bereich = document.getElementById("gruppen-bereich");
  var alleKarten = []; // { person, karteEl, kreisEl } – für den Foto-Nachlader

  GRUPPEN_DEFINITION.forEach(function (gruppe) {
    var personen = [];
    gruppe.funktionen.forEach(function (f) {
      var treffer = (VORSTAND || []).filter(function (p) { return p.funktion === f; });
      personen = personen.concat(treffer);
    });
    if (!personen.length) return;

    var abschnitt = document.createElement("section");
    abschnitt.className = "gruppe-abschnitt";
    var titel = document.createElement("h2");
    titel.className = "abschnittstitel";
    titel.textContent = gruppe.titel;
    abschnitt.appendChild(titel);
    var liste = document.createElement("div");
    liste.className = "kontakte-liste";
    personen.forEach(function (person) {
      if (!person.name) {
        liste.appendChild(baueUnbesetztZeile(person));
        return;
      }
      var karte = bauePersonKarte(person);
      liste.appendChild(karte);
      alleKarten.push({ person: person, karteEl: karte });
    });
    abschnitt.appendChild(liste);
    bereich.appendChild(abschnitt);
  });

  var vorstandMail = (VEREIN.mails && VEREIN.mails.vorstand) || "vorstand@sportfreunde04.de";
  var gsMail = VEREIN.mail || "geschaeftsstelle@sportfreunde04.de";
  // W9-Nachprüfung D-app Nr. 13: Label über der Adresse (wie .angaben auf
  // "Kontakt & Anfahrt"), statt "Vorstand: <Adresse>" in einer Zeile und
  // "Geschäftsstelle:" mit der (längeren) Adresse in der nächsten – beide
  // Zeilen jetzt gleich aufgebaut, unabhängig von der Textlänge.
  var vorstandHinweis = document.getElementById("vorstand-hinweis");
  [
    { label: "Vorstand", mail: vorstandMail },
    { label: "Geschäftsstelle", mail: gsMail }
  ].forEach(function (eintrag) {
    var dt = document.createElement("dt");
    dt.textContent = eintrag.label;
    var dd = document.createElement("dd");
    var link = document.createElement("a");
    link.className = "mail-link";
    link.href = "mailto:" + eintrag.mail;
    link.textContent = eintrag.mail;
    dd.appendChild(link);
    vorstandHinweis.appendChild(dt);
    vorstandHinweis.appendChild(dd);
  });

  function zeigeBild(eintrag, bildUrl) {
    var kreis = eintrag.karteEl.querySelector(".person-karte__initialen");
    if (!kreis || !bildUrl) return;
    var bild = document.createElement("img");
    bild.className = "person-karte__bild";
    bild.src = bildUrl;
    bild.alt = "";
    bild.loading = "lazy";
    bild.addEventListener("error", function () {
      if (bild.parentNode) bild.replaceWith(kreis);
    });
    kreis.replaceWith(bild);
    eintrag.hatBild = true;
  }

  alleKarten.forEach(function (eintrag) { zeigeBild(eintrag, vereinsFotoUrl(eintrag.person.name)); });

  ladeWorkbook(ANSPRECHPARTNER_ID).then(function (ansprechpartner) {
    alleKarten.forEach(function (eintrag) {
      if (!eintrag.hatBild) zeigeBild(eintrag, findeBildFuerName(ansprechpartner, eintrag.person.name));
    });
  }).catch(function () {
    // Kein Netz/CORS: Initialen bleiben stehen.
  });
})();
</script>
</body>
</html>
