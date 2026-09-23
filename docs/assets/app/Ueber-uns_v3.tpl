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

/* Speuzer Blau-Weiß – Ueber-uns_v3.tpl (C2)
   appack-Vorlage für die Seite "Über uns". Kopf- und Tab-Leiste
   kommen von der App-Huelle und sind NICHT Teil dieser Vorlage (kein eigener
   Kopf, kein eigener Fuss). Erzeugt aus src/app/v3-basis.css + src/app/Ueber-uns_v3.html
   durch tools/app-optik/tpl-bauen.mjs (npm run tpl-bauen) – NICHT von Hand
   bearbeiten, sondern die Quelldateien unter src/app/ ändern und neu bauen.
   Details/Datenquellen: siehe assets/app/LIESMICH.md, Abschnitt "Stufe C2". */

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

/* Ueber-uns_v3.tpl – seitenspezifisch (C2). W9, Auftrag D: Einleitung und
   Gliederung wie die Website-Seite "Über uns"
   (src/seiten/verein/ueber-uns.mjs) – eigene Einleitung statt der Verein-Tab-
   Einleitung, ein Fließtext-Block (Geschichte, Zahlen-Absatz, Leitsatz,
   Downloads) ohne die frühere Doppel-Kennzahl "Gründung 1904"/"1904
   gegründet", "Der Verein in Zahlen" jetzt mit denselben vier Werten wie die
   Website, "Kinder- und Jugendschutz" als eigener Abschnitt mit Personenkarte
   (wie Vorstand/Karneval) statt einer bloßen Verweiszeile. Zahlen
   11/5 werden von
   tools/app-optik/tpl-bauen.mjs zur Bauzeit aus data/verein.json bzw.
   data/karneval.json eingesetzt, [{"name":"Melanie Seipp","funktion":"1. Vorsitzende","mail":"geschaeftsstelle@sportfreunde04.de","foto":{"quelle":"vorstand-melanie-seipp","bytes":525138}},{"name":"Uwe Korndörfer","funktion":"2. Vorsitzender","mail":"geschaeftsstelle@sportfreunde04.de","foto":{"quelle":"vorstand-uwe-korndorfer","bytes":517113}},{"name":"Wolfgang Schirmer","funktion":"1. Kassierer","mail":"kassierer@sportfreunde04.de","foto":{"quelle":"vorstand-wolfgang-schirmer","bytes":495840}},{"name":"Bernhard Henrich","funktion":"2. Kassierer","mail":"kassierer@sportfreunde04.de","foto":{"quelle":"vorstand-bernhard-henrich","bytes":135549}},{"name":"Ralf Schwager","funktion":"1. Jugendleiter","mail":"jugendleitung@sportfreunde04.de","foto":{"quelle":"vorstand-ralf-schwager","bytes":112402}},{"name":"Olgay Özkan","funktion":"2. Jugendleiter","mail":"jugendleitung@sportfreunde04.de","foto":{"quelle":"vorstand-olgay-ozkan","bytes":60038}},{"name":"Marcel Hogg","funktion":"Team Jugendleitung","mail":"jugendleitung@sportfreunde04.de","foto":{"quelle":"vorstand-marcel-hogg","bytes":125052}},{"name":"Vassilios Miamis","funktion":"Team Jugendleitung","mail":"jugendleitung@sportfreunde04.de","foto":{"quelle":"vorstand-vassilios-miamis","bytes":215395}},{"name":"Florian Müller","funktion":"Kinderschutzbeauftragter","mail":"kinderschutzbeauftragter@sportfreunde04.de","foto":{"quelle":"vorstand-florian-muller","bytes":69465}},{"name":null,"funktion":"Schriftführer","mail":null,"foto":null,"hinweis":"nicht besetzt"},{"name":"Wolfgang Krönung","funktion":"Sportliche Leitung Senioren","mail":"spielausschuss_senioren@sportfreunde04.de","foto":null},{"name":"Christine Rothe","funktion":"Spielausschuss Senioren","mail":"spielausschuss_senioren@sportfreunde04.de","foto":null},{"name":"Patrick Krösche","funktion":"Abteilungsleiter Karneval","mail":"karnevalabteilung@sportfreunde04.de","foto":{"quelle":"vorstand-patrick-krosche","bytes":221052}},{"name":"Sigrid Weber","funktion":"Kassiererin Karneval","mail":"karnevalabteilung@sportfreunde04.de","foto":null},{"name":"Bettina Leven-Grieb","funktion":"Schriftführerin Karneval","mail":"karnevalabteilung@sportfreunde04.de","foto":null}] (Kinderschutzbeauftragter)
   wie auf den anderen Vereinsseiten (kein appack-FreeMarker-Ausdruck an
   dieser Stelle, siehe Kopfkommentar von tpl-bauen.mjs). */

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

.karte p { margin: 0 0 var(--sp-2); font-size: 14px; color: var(--ink-2); }
.karte p:last-of-type { margin-bottom: 0; }

.karte p.leitsatz-quelle {
  margin: var(--sp-3) 0 4px;
  font-size: 12px;
  color: var(--ink-3);
}

/* W8, Befund 7: Zitat gut lesbar (normale Fließschrift, nicht schmal
   kursiv) statt der kondensierten, kursiven Kopfschrift. Selektor ".karte
   p.leitsatz" (statt nur ".leitsatz"), damit die Regel ".karte p" (Farbe/
   Schriftgröße) sie nicht überstimmt (beide gleich spezifisch wäre sonst
   die spätere Regel unwirksam). */
.karte p.leitsatz {
  font-family: var(--font-text);
  font-weight: 600;
  font-size: 16px;
  font-style: normal;
  color: var(--blau-950);
}

.liste--eingebettet { margin-top: var(--sp-3); }
.liste--eingebettet .zeile:last-child { border-bottom: none; }

.zahlen-raster {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sp-4) var(--sp-3);
}

.zahl { min-width: 0; text-align: center; }

.zahl__wert {
  display: block;
  font-family: var(--font-head);
  font-weight: 700;
  font-size: 28px;
  color: var(--blau-700);
}

.zahl__label {
  display: block;
  font-size: 12px;
  color: var(--ink-3);
  overflow-wrap: break-word;
}

.person-mini {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  margin: var(--sp-4) 0;
}

.person-mini__bild {
  flex: 0 0 auto;
  width: 56px;
  height: 56px;
  border-radius: var(--r-pill);
  object-fit: cover;
  object-position: 50% 0%;
  background: var(--blau-50);
  box-shadow: 0 0 0 1px var(--line);
}

.person-mini__bild--platzhalter {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--blau-800);
  font-family: var(--font-head);
  font-weight: 700;
  font-size: 18px;
}

.person-mini__text { display: flex; flex-direction: column; min-width: 0; }
.person-mini__name { font-weight: 600; font-size: 15px; overflow-wrap: break-word; }
.person-mini__funktion { margin: 2px 0 var(--sp-1); font-size: 13px; color: var(--ink-3); overflow-wrap: break-word; }
.person-mini__link { color: var(--blau-700); font-weight: 600; font-size: 13px; text-decoration: none; }
</style>
</head>
<body>
<main class="inhalt">

<h1 class="visually-hidden">Über uns</h1>

<p class="seitenkopf-lead">Seit 1904 im Frankfurter Gallus zu Hause: unsere Geschichte, unsere Werte und der Verein in Zahlen.</p>

<div class="karte">
  <p>Gegründet wurde der Verein am 15.&nbsp;Mai 1904 als Frankfurter FC Britannia. Nach dem Ersten Weltkrieg erhielt er 1919 seinen heutigen Namen. Der sportliche Höhepunkt war die Saison 1955/56 in der 1.&nbsp;Amateurliga Hessen; seit den 1960er Jahren spielen die Sportfreunde in den Klassen des Fußballkreises Frankfurt.</p>
  <!-- W9-Nachprüfung D-app Nr. 17: "elf"/"fünf" wörtlich wie
       src/seiten/verein/ueber-uns.mjs (nicht die __ANZAHL_…__-Platzhalter
       weiter unten in "Der Verein in Zahlen" – dort bleiben Ziffern, wie auf
       der Website). Heutiger Datenstand (data/verein.json/karneval.json):
       11 Mannschaften, 5 Karnevalgruppen. -->
  <p>Heute stellt der Verein elf Fußballmannschaften – von der 1.&nbsp;Herrenmannschaft bis zur G&#8209;Jugend – und die Karnevalabteilung „Die Schnauzer“ mit fünf Gruppen. Trainiert und gespielt wird auf dem eigenen Platz an der Mainzer Landstraße 480. Die Herren und die A&#8209;Jugend tragen ihre Heimspiele auf der Bezirkssportanlage am Rebstock (SW&nbsp;Griesheim), Am Römerhof 9, 60486&nbsp;Frankfurt am&nbsp;Main aus.</p>
  <p class="leitsatz-quelle">Unser Leitsatz aus der Vereinsphilosophie:</p>
  <p class="leitsatz">„Wir wollen nicht nur erfolgreiche Mannschaften entwickeln, sondern erfolgreiche Menschen und einen starken Verein für kommende Generationen.“</p>
  <p>Unsere Werte sind Gemeinschaft, Respekt, Wertschätzung, Verantwortung, Fairness, Entwicklung und Kinderschutz.</p>
  <div class="aktionen">
    <a class="knopf" href="nav://sportfreunde04_TextImage_1789020275334">Vereinschronik lesen</a>
  </div>
  <div class="liste liste--eingebettet">
    <a class="zeile" href="https://cdn.appack.de/sportfreunde04/pdf/Chronik-FFV-Sportfreunde-04-2026.pdf" target="_blank" rel="noopener">
      <span class="zeile__text"><span class="zeile__titel">Chronik (PDF, 53 Seiten)</span></span>
      <svg class="zeile__pfeil" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7"/></svg>
    </a>
    <a class="zeile" href="https://cdn.appack.de/sportfreunde04/pdf/vereinsphilosophie-und-zukunftskonzept.pdf" target="_blank" rel="noopener">
      <span class="zeile__text"><span class="zeile__titel">Vereinsphilosophie (PDF, 50 Seiten)</span></span>
      <svg class="zeile__pfeil" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7"/></svg>
    </a>
  </div>
</div>

<h2 class="abschnittstitel">Der Verein in Zahlen</h2>
<div class="karte">
  <div class="zahlen-raster">
    <div class="zahl">
      <span class="zahl__wert">1904</span>
      <span class="zahl__label">gegründet</span>
    </div>
    <div class="zahl">
      <span class="zahl__wert">11</span>
      <span class="zahl__label">Fußballmannschaften</span>
    </div>
    <div class="zahl">
      <span class="zahl__wert">5</span>
      <span class="zahl__label">Karnevalgruppen</span>
    </div>
    <div class="zahl">
      <span class="zahl__wert">2</span>
      <span class="zahl__label">Abteilungen</span>
    </div>
  </div>
</div>

<h2 class="abschnittstitel">Kinder- und Jugendschutz</h2>
<div class="karte fluss">
  <p style="margin:0;">Das Wohl von Kindern und Jugendlichen steht für uns über allem. Unser Präventions- und Schutzkonzept sowie die Vorgaben von HFV und DFB bilden den verbindlichen Rahmen.</p>
  <div id="kinderschutz-person"></div>
  <!-- W9-Nachprüfung D-app Nr. 17: Download-Zeile im selben Stil wie
       "Chronik (PDF, 53 Seiten)" oben (kinderschutzAbschnitt() in
       ueber-uns.mjs stellte aus demselben Grund von einem Umrandungsknopf
       auf denselben Download-Baustein um wie Chronik/Vereinsphilosophie –
       sonst zwei Formen für dieselbe Aufgabe auf einer Seite). -->
  <div class="liste liste--eingebettet">
    <a class="zeile" href="https://cdn.appack.de/sportfreunde04/pdf/Pr%C3%A4ventions-%20und%20Schutzkonzept%20FFV%20Sportfreunde%2004%20Stand%20Mai%202025%20(1).pdf" target="_blank" rel="noopener">
      <span class="zeile__text"><span class="zeile__titel">Präventions- und Schutzkonzept (PDF)</span></span>
      <svg class="zeile__pfeil" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7"/></svg>
    </a>
  </div>
</div>

<p class="fuss">F.F.V. Sportfreunde 04 · Vereins-App</p>

</main>

<script src="https://cdn.appack.de/modules/common/jquery-3.4.1.min.js"></script>
<script src="https://cdn.appack.de/modules/appack.workbook-1.4.1.js"></script>
<script>
(function () {
  "use strict";

  var VORSTAND = [{"name":"Melanie Seipp","funktion":"1. Vorsitzende","mail":"geschaeftsstelle@sportfreunde04.de","foto":{"quelle":"vorstand-melanie-seipp","bytes":525138}},{"name":"Uwe Korndörfer","funktion":"2. Vorsitzender","mail":"geschaeftsstelle@sportfreunde04.de","foto":{"quelle":"vorstand-uwe-korndorfer","bytes":517113}},{"name":"Wolfgang Schirmer","funktion":"1. Kassierer","mail":"kassierer@sportfreunde04.de","foto":{"quelle":"vorstand-wolfgang-schirmer","bytes":495840}},{"name":"Bernhard Henrich","funktion":"2. Kassierer","mail":"kassierer@sportfreunde04.de","foto":{"quelle":"vorstand-bernhard-henrich","bytes":135549}},{"name":"Ralf Schwager","funktion":"1. Jugendleiter","mail":"jugendleitung@sportfreunde04.de","foto":{"quelle":"vorstand-ralf-schwager","bytes":112402}},{"name":"Olgay Özkan","funktion":"2. Jugendleiter","mail":"jugendleitung@sportfreunde04.de","foto":{"quelle":"vorstand-olgay-ozkan","bytes":60038}},{"name":"Marcel Hogg","funktion":"Team Jugendleitung","mail":"jugendleitung@sportfreunde04.de","foto":{"quelle":"vorstand-marcel-hogg","bytes":125052}},{"name":"Vassilios Miamis","funktion":"Team Jugendleitung","mail":"jugendleitung@sportfreunde04.de","foto":{"quelle":"vorstand-vassilios-miamis","bytes":215395}},{"name":"Florian Müller","funktion":"Kinderschutzbeauftragter","mail":"kinderschutzbeauftragter@sportfreunde04.de","foto":{"quelle":"vorstand-florian-muller","bytes":69465}},{"name":null,"funktion":"Schriftführer","mail":null,"foto":null,"hinweis":"nicht besetzt"},{"name":"Wolfgang Krönung","funktion":"Sportliche Leitung Senioren","mail":"spielausschuss_senioren@sportfreunde04.de","foto":null},{"name":"Christine Rothe","funktion":"Spielausschuss Senioren","mail":"spielausschuss_senioren@sportfreunde04.de","foto":null},{"name":"Patrick Krösche","funktion":"Abteilungsleiter Karneval","mail":"karnevalabteilung@sportfreunde04.de","foto":{"quelle":"vorstand-patrick-krosche","bytes":221052}},{"name":"Sigrid Weber","funktion":"Kassiererin Karneval","mail":"karnevalabteilung@sportfreunde04.de","foto":null},{"name":"Bettina Leven-Grieb","funktion":"Schriftführerin Karneval","mail":"karnevalabteilung@sportfreunde04.de","foto":null}];
  var ANSPRECHPARTNER_ID = "6a1ec5fcf68a05bf129cdb8b";

  // Vorstandsporträts wie auf den übrigen Vereinsseiten (Vorstand_v3,
  // Karneval_v3): dieselben, einheitlich zugeschnittenen Fotos, Rückfall auf
  // das Ansprechpartner-Worksheet, sonst Initialen.
  var FOTO_BASIS = "https://justolgay.github.io/speuzer-website-prototyp/assets/bilder/erzeugt/";
  function vereinsFotoUrl(name) {
    var p = (VORSTAND || []).find(function (x) { return x.name === name; });
    return p && p.foto && p.foto.quelle ? FOTO_BASIS + p.foto.quelle + "-480.jpg" : null;
  }

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

  var beauftragter = (VORSTAND || []).find(function (p) { return p.funktion === "Kinderschutzbeauftragter"; });
  if (beauftragter) {
    var karte = document.createElement("div");
    karte.className = "person-mini";

    var kreis = document.createElement("span");
    kreis.className = "person-mini__bild person-mini__bild--platzhalter";
    kreis.setAttribute("aria-hidden", "true");
    kreis.textContent = initialenAus(beauftragter.name);
    karte.appendChild(kreis);

    var inhalt = document.createElement("span");
    inhalt.className = "person-mini__text";
    var name = document.createElement("span");
    name.className = "person-mini__name";
    name.textContent = beauftragter.name;
    inhalt.appendChild(name);
    var funktion = document.createElement("span");
    funktion.className = "person-mini__funktion";
    funktion.textContent = beauftragter.funktion;
    inhalt.appendChild(funktion);
    if (beauftragter.mail) {
      var mail = document.createElement("a");
      mail.className = "person-mini__link";
      mail.href = "mailto:" + beauftragter.mail;
      mail.textContent = "E-Mail schreiben ›";
      inhalt.appendChild(mail);
    }
    karte.appendChild(inhalt);

    document.getElementById("kinderschutz-person").appendChild(karte);

    function zeigeBild(bildUrl) {
      if (!bildUrl) return;
      var bild = document.createElement("img");
      bild.className = "person-mini__bild";
      bild.src = bildUrl;
      bild.alt = "";
      bild.loading = "lazy";
      bild.addEventListener("error", function () {
        if (bild.parentNode) bild.replaceWith(kreis);
      });
      kreis.replaceWith(bild);
    }

    var fotoUrl = vereinsFotoUrl(beauftragter.name);
    if (fotoUrl) {
      zeigeBild(fotoUrl);
    } else {
      ladeWorkbook(ANSPRECHPARTNER_ID).then(function (ansprechpartner) {
        zeigeBild(findeBildFuerName(ansprechpartner, beauftragter.name));
      }).catch(function () {
        // Kein Netz/CORS: Initialen bleiben stehen.
      });
    }
  }
})();
</script>
</body>
</html>
