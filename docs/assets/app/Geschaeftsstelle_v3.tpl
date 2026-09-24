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

/* Speuzer Blau-Weiß – Geschaeftsstelle_v3.tpl (C2)
   appack-Vorlage für die Seite "Geschäftsstelle & Anfahrt". Kopf- und Tab-Leiste
   kommen von der App-Huelle und sind NICHT Teil dieser Vorlage (kein eigener
   Kopf, kein eigener Fuss). Erzeugt aus src/app/v3-basis.css + src/app/Geschaeftsstelle_v3.html
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

/* W10, Auftrag D (Entscheidung G): Innenabstand oben/unten gilt auch, wenn
   eine lange Beschriftung umbricht (vorher nur min-height + flex-center –
   ein zweizeiliger Knopf hatte dadurch keinerlei Abstand zur Kante),
   text-align:center zusätzlich zu justify-content, weil das bei mehrzeiligem
   Text pro Zeile zählt (justify-content zentriert nur den Textblock als
   Ganzes). Wörtlich wie Startseite_v3.tpl (siehe Kopfkommentar dieser
   Datei). */
.knopf {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 12px 20px;
  line-height: 1.3;
  text-align: center;
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

/* W10-Nachprüfung (offen 10, Entscheidung 15): 2px Rand in Vereinsblau wie
   .knopf--sekundaer in base.css (Website) – der bisherige 1px hellgraue Rand
   war als Knopfkante kaum zu erkennen ("Nebenaktionen umrandet – auf
   Website und App gleich"). */
.knopf--leise {
  background: var(--surface);
  border: 2px solid var(--blau-700);
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

/* Geschaeftsstelle_v3.tpl – seitenspezifisch (C2). Seite heißt künftig
   "Kontakt & Anfahrt" (W9, Auftrag D, Abschnitt "Geschäftsstelle & Anfahrt";
   der appack-Modultitel wird vom Hauptagenten im CMS geändert). W8/W9,
   Grundsatz Daten: Bausteine/Reihenfolge wie kontakt.html der Website,
   Inhalte aus {"name_register":"Frankfurter Fußballverein Sportfreunde 1904 e. V.","name_kurz":"FFV Sportfreunde 04","spitzname":"Speuzer","gegruendet":"15. Mai 1904","gruendungsname":"Frankfurter FC Britannia","umbenannt":"1919","stadtteil":"Gallus","sportstaette":{"strasse":"Mainzer Landstraße 480","plz":"60326","ort":"Frankfurt am Main"},"post":{"postfach":"Postfach 190442","plz":"60091","ort":"Frankfurt am Main"},"mail":"geschaeftsstelle@sportfreunde04.de","tel_geschaeftsstelle":"069 736868","tel_platzwart":"069 732193","register":"Amtsgericht Frankfurt am Main, VR 4727","vorsitz":["Melanie Seipp (1. Vorsitzende)","Uwe Korndörfer (2. Vorsitzender)"],"vertretung":["Melanie Seipp (1. Vorsitzende)","Uwe Korndörfer (2. Vorsitzender)"],"instagram":"https://www.instagram.com/speuzer_ffm/","facebook":"https://www.facebook.com/groups/223133414377924/","fanshop":"https://sportfreunde04.fan12.de/","teamshop":"https://www.11teamsports.com/de-de/clubshop/frankfurter-fussballvereine-sportfreunde-04/","mails":{"jugendleitung":"jugendleitung@sportfreunde04.de","kassierer":"kassierer@sportfreunde04.de","kinderschutz":"kinderschutzbeauftragter@sportfreunde04.de","karneval":"karnevalabteilung@sportfreunde04.de","senioren":"spielausschuss_senioren@sportfreunde04.de","vorstand":"vorstand@sportfreunde04.de"},"hinweise":{"parken":"Der Parkplatz am Vereinsgelände ist wegen des Neubaus des Funktionsgebäudes voraussichtlich bis Ende Januar 2027 gesperrt. Der Zugang zum Gelände ist über den Hintereingang am „Haus der Jugend“ (Pavillon) möglich.","parken_quelle":"App-News vom 21.07.2026","ferien":"In den hessischen Schulferien und an Feiertagen findet in der Regel kein Training statt. Ausnahmen sagt das Trainerteam an."},"oepnv":null,"anfahrt_hinweis":"Zugang zum Vereinsgelände derzeit über den Hintereingang am „Haus der Jugend“ (Pavillon); der Parkplatz ist wegen des Neubaus bis voraussichtlich Ende Januar 2027 gesperrt.","gruendung_jahr":1904,"anzahl_mannschaften":11,"karten":{"apple":"https://maps.apple.com/?q=Mainzer+Landstra%C3%9Fe+480,+60326+Frankfurt+am+Main","google":"https://www.google.com/maps/search/?api=1&query=Mainzer+Landstra%C3%9Fe+480%2C+60326+Frankfurt+am+Main"},"kalender_basis":"https://justolgay.github.io/speuzer-spielplan/"} (data/verein.json) und
   {"_quelle":"appack public workbook API, Worksheet 6a1ec5fcf68a05bf129cdb9b (Kontakt der Geschäftsstelle), geholt am 2026-09-22 mit tools/appack-daten.mjs. Nur Adresse/Telefon/E-Mail/Website/Social; keine Personendaten, \"mobileNumber\" bewusst nicht übernommen. Öffnungszeiten werden seit 22.09.2026 nicht mehr übernommen (Entscheidung Olgay: es gibt keine festen Öffnungszeiten).","kontakt":{"address":" Postfach 190442 (postalisch)","postalCode":"60091","city":"Frankfurt","phoneNumber":"069 736868","email":"geschaeftsstelle@sportfreunde04.de","website":"https://www.sportfreunde04.de","insta":"https://www.instagram.com/speuzer_ffm/","face":"https://www.facebook.com/groups/223133414377924/"}} (data/geschaeftsstelle.json) – dieselbe Quelle
   wie die Website, von tools/app-optik/tpl-bauen.mjs zur Bauzeit eingesetzt.
   W9, Auftrag D: Gliederung wie die Website – Einleitung › Erreichbarkeit
   (fester Satz, E-Mail, Telefon Geschäftsstelle, Telefon Platzwart) ›
   Ansprechpartner nach Anliegen (Adresse in Zeile 2 statt Beschreibungstext)
   › Anfahrt mit zwei gleich aufgebauten, dreizeiligen Adressblöcken
   (Vereinsplatz / Bezirkssportanlage am Rebstock) mit je einem Knopf "Route
   planen" › ein gemeinsamer Kasten "Zugang & Parken" + "Bus & Bahn" ›
   Postanschrift und Social im selben Label-Stil wie "Erreichbarkeit". */

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

/* Bezeichnung über dem Wert: so bricht die lange Mailadresse nicht mitten
   im Wort um (W8-Sichtprüfung 390 px). */
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

/* W9, Auftrag D: dreizeiliger Adressblock (Platzname / Straße Nr. / PLZ
   Ort) für die beiden gleich aufgebauten Anfahrt-Karten. */
.adresse-block {
  margin: 0 0 var(--sp-3);
  font-size: 15px;
  line-height: 1.5;
  overflow-wrap: break-word;
}

.adresse-block strong {
  display: block;
  font-weight: 700;
}

.zeile__untertitel {
  display: block;
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--ink-3);
  overflow-wrap: break-word;
}

/* W9-Nachprüfung D-app Nr. 6: gleicher Kartenabstand zwischen den beiden
   Anfahrt-Karten wie bei anderen Kartengruppen der App (z. B.
   .gruppen-liste auf Karneval_v3). */
.anfahrt-liste {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}

/* W9-Nachprüfung D-app Nr. 7: "Zugang & Parken"/"Bus & Bahn" als kleine
   Zwischenüberschriften statt fetter Satzanfänge, wie die h3 im gleichen
   Kasten auf der Website (kontakt.mjs). */
.hinweis-untertitel {
  margin: 0 0 var(--sp-2);
  font-size: 14px;
  font-weight: 700;
  color: var(--ink);
}

/* W9-Nachprüfung D-app "neu_kaputt": der Hinweiskasten und die Karte
   Postanschrift/Social klebten ohne Abstand aneinander. */
.hinweis + .karte {
  margin-top: var(--sp-4);
}
</style>
</head>
<body>
<main class="inhalt">

<h1 class="visually-hidden">Kontakt &amp; Anfahrt</h1>

<p class="seitenkopf-lead">So erreichst du uns.</p>

<h2 class="abschnittstitel">Erreichbarkeit</h2>
<div class="karte">
  <p style="margin:0 0 var(--sp-3);"><strong>Keine festen Öffnungszeiten.</strong> Die Geschäftsstelle ist per E-Mail erreichbar, telefonisch nach Vereinbarung.</p>
  <dl class="angaben">
    <dt>E-Mail Geschäftsstelle</dt>
    <dd><a class="mail-link" id="gs-mail-link" href="#"></a></dd>
    <dt>Telefon Geschäftsstelle</dt>
    <dd><a class="mail-link" id="gs-tel-link" href="#"></a></dd>
    <dt>Telefon Platzwart</dt>
    <dd><a class="mail-link" id="gs-tel-platzwart-link" href="#"></a></dd>
  </dl>
</div>

<h2 class="abschnittstitel">Ansprechpartner nach Anliegen</h2>
<div id="anliegen-liste" class="liste"></div>

<h2 class="abschnittstitel">Anfahrt</h2>
<div class="anfahrt-liste">
  <div class="karte">
    <p class="adresse-block"><strong>Vereinsplatz</strong><span id="anfahrt-vereinsplatz-strasse"></span><br><span id="anfahrt-vereinsplatz-ort"></span></p>
    <div class="aktionen">
      <a id="route-vereinsplatz-knopf" class="knopf knopf--leise" href="#" target="_blank" rel="noopener">Route planen</a>
    </div>
  </div>

  <div class="karte">
    <p class="adresse-block"><strong>Bezirkssportanlage am Rebstock (SW&nbsp;Griesheim)</strong>Am Römerhof 9<br>60486&nbsp;Frankfurt am&nbsp;Main</p>
    <p style="margin:0 0 var(--sp-3);">Hier spielen die Herren und die A&#8209;Jugend ihre Heimspiele.</p>
    <div class="aktionen">
      <a id="route-rebstock-knopf" class="knopf knopf--leise" href="#" target="_blank" rel="noopener">Route planen</a>
    </div>
  </div>
</div>

<div class="hinweis">
  <p class="hinweis-untertitel">Zugang &amp; Parken</p>
  <p id="anfahrt-zugang-text" style="margin:0;"></p>
  <p class="hinweis-untertitel" style="margin-top:var(--sp-3);">Bus &amp; Bahn</p>
  <p style="margin:0;">Verbindung in der <a class="mail-link" href="https://www.rmv.de" target="_blank" rel="noopener">RMV&#8209;Auskunft</a>.</p>
</div>

<!-- W10, Auftrag D (app Nr. 8): eigene Überschrift, damit die Karte sichtbar
     vom Hinweiskasten "Zugang & Parken"/"Bus & Bahn" darüber abgesetzt ist,
     statt optisch noch zu ANFAHRT zu gehören. -->
<h2 class="abschnittstitel">Verein &amp; Postanschrift</h2>
<div class="karte">
  <dl class="angaben">
    <dt>Verein</dt>
    <dd id="anfahrt-verein"></dd>
    <dt>Postanschrift</dt>
    <dd id="anfahrt-postanschrift"></dd>
    <dt>Soziale Medien</dt>
    <dd>
      <p style="margin:0;"><a class="mail-link" id="anfahrt-instagram-link" href="#" rel="noopener" target="_blank">Instagram @speuzer_ffm</a></p>
      <p style="margin:4px 0 0;"><a class="mail-link" id="anfahrt-facebook-link" href="#" rel="noopener" target="_blank">Facebook-Gruppe</a></p>
    </dd>
  </dl>
</div>

<p class="fuss">F.F.V. Sportfreunde 04 · Vereins-App</p>

</main>

<script src="https://cdn.appack.de/modules/common/jquery-3.4.1.min.js"></script>
<script src="https://cdn.appack.de/modules/appack.workbook-1.4.1.js"></script>
<script>
(function () {
  "use strict";

  var VEREIN = {"name_register":"Frankfurter Fußballverein Sportfreunde 1904 e. V.","name_kurz":"FFV Sportfreunde 04","spitzname":"Speuzer","gegruendet":"15. Mai 1904","gruendungsname":"Frankfurter FC Britannia","umbenannt":"1919","stadtteil":"Gallus","sportstaette":{"strasse":"Mainzer Landstraße 480","plz":"60326","ort":"Frankfurt am Main"},"post":{"postfach":"Postfach 190442","plz":"60091","ort":"Frankfurt am Main"},"mail":"geschaeftsstelle@sportfreunde04.de","tel_geschaeftsstelle":"069 736868","tel_platzwart":"069 732193","register":"Amtsgericht Frankfurt am Main, VR 4727","vorsitz":["Melanie Seipp (1. Vorsitzende)","Uwe Korndörfer (2. Vorsitzender)"],"vertretung":["Melanie Seipp (1. Vorsitzende)","Uwe Korndörfer (2. Vorsitzender)"],"instagram":"https://www.instagram.com/speuzer_ffm/","facebook":"https://www.facebook.com/groups/223133414377924/","fanshop":"https://sportfreunde04.fan12.de/","teamshop":"https://www.11teamsports.com/de-de/clubshop/frankfurter-fussballvereine-sportfreunde-04/","mails":{"jugendleitung":"jugendleitung@sportfreunde04.de","kassierer":"kassierer@sportfreunde04.de","kinderschutz":"kinderschutzbeauftragter@sportfreunde04.de","karneval":"karnevalabteilung@sportfreunde04.de","senioren":"spielausschuss_senioren@sportfreunde04.de","vorstand":"vorstand@sportfreunde04.de"},"hinweise":{"parken":"Der Parkplatz am Vereinsgelände ist wegen des Neubaus des Funktionsgebäudes voraussichtlich bis Ende Januar 2027 gesperrt. Der Zugang zum Gelände ist über den Hintereingang am „Haus der Jugend“ (Pavillon) möglich.","parken_quelle":"App-News vom 21.07.2026","ferien":"In den hessischen Schulferien und an Feiertagen findet in der Regel kein Training statt. Ausnahmen sagt das Trainerteam an."},"oepnv":null,"anfahrt_hinweis":"Zugang zum Vereinsgelände derzeit über den Hintereingang am „Haus der Jugend“ (Pavillon); der Parkplatz ist wegen des Neubaus bis voraussichtlich Ende Januar 2027 gesperrt.","gruendung_jahr":1904,"anzahl_mannschaften":11,"karten":{"apple":"https://maps.apple.com/?q=Mainzer+Landstra%C3%9Fe+480,+60326+Frankfurt+am+Main","google":"https://www.google.com/maps/search/?api=1&query=Mainzer+Landstra%C3%9Fe+480%2C+60326+Frankfurt+am+Main"},"kalender_basis":"https://justolgay.github.io/speuzer-spielplan/"};
  var GESCHAEFTSSTELLE = {"_quelle":"appack public workbook API, Worksheet 6a1ec5fcf68a05bf129cdb9b (Kontakt der Geschäftsstelle), geholt am 2026-09-22 mit tools/appack-daten.mjs. Nur Adresse/Telefon/E-Mail/Website/Social; keine Personendaten, \"mobileNumber\" bewusst nicht übernommen. Öffnungszeiten werden seit 22.09.2026 nicht mehr übernommen (Entscheidung Olgay: es gibt keine festen Öffnungszeiten).","kontakt":{"address":" Postfach 190442 (postalisch)","postalCode":"60091","city":"Frankfurt","phoneNumber":"069 736868","email":"geschaeftsstelle@sportfreunde04.de","website":"https://www.sportfreunde04.de","insta":"https://www.instagram.com/speuzer_ffm/","face":"https://www.facebook.com/groups/223133414377924/"}};
  var kontakt = (GESCHAEFTSSTELLE && GESCHAEFTSSTELLE.kontakt) || {};

  // W9, Auftrag D (Abschnitt 4): "Frankfurt am Main" bzw. "PLZ Ort" nie
  // trennen – alle Leerzeichen der Orts-/Straßenangabe durch geschützte
  // Leerzeichen ersetzen (wie staffelLesbar()/jahrgangPraefix() an anderer
  // Stelle in der App).
  function nieTrennen(text) {
    return String(text || "").replace(/ /g, " ");
  }

  // ---------- Erreichbarkeit ----------

  var email = kontakt.email || VEREIN.mail || "";
  var gsMailLink = document.getElementById("gs-mail-link");
  gsMailLink.href = "mailto:" + email;
  gsMailLink.textContent = email;

  var telefon = kontakt.phoneNumber || VEREIN.tel_geschaeftsstelle || "";
  var gsTelLink = document.getElementById("gs-tel-link");
  gsTelLink.href = "tel:" + telefon.replace(/[^\d+]/g, "");
  gsTelLink.textContent = telefon;

  var telefonPlatzwart = VEREIN.tel_platzwart || "";
  var gsTelPlatzwartLink = document.getElementById("gs-tel-platzwart-link");
  gsTelPlatzwartLink.href = "tel:" + telefonPlatzwart.replace(/[^\d+]/g, "");
  gsTelPlatzwartLink.textContent = telefonPlatzwart;

  // ---------- Ansprechpartner nach Anliegen (wie ansprechpartnerAbschnitt()
  // in kontakt.mjs, als kompakte Liste statt Karten mit eigenem Knopf – W8,
  // Befund 2). W9, Auftrag D: Zeile 2 zeigt jetzt die Adresse selbst statt
  // eines Beschreibungstexts (wie auf der Website), Begriffe nach
  // Entscheidung 14 ("Kinder- und Jugendschutz", "Sponsoren & Partner"),
  // dazu ein neuer Eintrag "Vorstand". ----------

  var mails = VEREIN.mails || {};
  var ANLIEGEN = [
    { titel: "Allgemeine Fragen", mail: VEREIN.mail, betreff: "Anfrage über die Website" },
    { titel: "Vorstand", mail: mails.vorstand, betreff: "Vorstand" },
    { titel: "Probetraining & Jugend", mail: mails.jugendleitung, betreff: "Probetraining" },
    { titel: "Herren & Senioren", mail: mails.senioren, betreff: "Herren" },
    { titel: "Karnevalabteilung", mail: mails.karneval, betreff: "Karnevalabteilung" },
    { titel: "Beiträge & Rechnungen", mail: mails.kassierer, betreff: "Beiträge" },
    { titel: "Kinder- und Jugendschutz", mail: mails.kinderschutz, betreff: "" },
    { titel: "Sponsoren & Partner", mail: VEREIN.mail, betreff: "Sponsoring" },
    { titel: "Mach mit & Ehrenamt", mail: VEREIN.mail, betreff: "Ich helfe gern" }
  ];

  var anliegenListe = document.getElementById("anliegen-liste");
  ANLIEGEN.forEach(function (a) {
    if (!a.mail) return;
    var href = "mailto:" + a.mail + (a.betreff ? "?subject=" + encodeURIComponent(a.betreff) : "");
    var zeile = document.createElement("a");
    zeile.className = "zeile";
    zeile.href = href;
    var textSpan = document.createElement("span");
    textSpan.className = "zeile__text";
    var titelSpan = document.createElement("span");
    titelSpan.className = "zeile__titel";
    titelSpan.textContent = a.titel;
    textSpan.appendChild(titelSpan);
    var untertitelSpan = document.createElement("span");
    untertitelSpan.className = "zeile__untertitel";
    untertitelSpan.textContent = a.mail;
    textSpan.appendChild(untertitelSpan);
    zeile.appendChild(textSpan);
    // W10, Auftrag D (app Nr. 9/quervergleich Nr. 23): Brief-Symbol statt
    // Pfeil "›" – die Zeile öffnet eine E-Mail, keine Unterseite; wortgleiches
    // Icon wie ansprechpartnerZeile() in src/seiten/kontakt.mjs.
    var pfeil = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    pfeil.setAttribute("class", "zeile__pfeil");
    pfeil.setAttribute("viewBox", "0 0 24 24");
    pfeil.setAttribute("stroke", "currentColor");
    pfeil.setAttribute("stroke-width", "1.6");
    pfeil.setAttribute("fill", "none");
    pfeil.setAttribute("stroke-linecap", "round");
    pfeil.setAttribute("stroke-linejoin", "round");
    pfeil.setAttribute("aria-hidden", "true");
    pfeil.setAttribute("focusable", "false");
    var umschlag = document.createElementNS("http://www.w3.org/2000/svg", "path");
    umschlag.setAttribute("d", "M3 6h18v12H3z");
    pfeil.appendChild(umschlag);
    var klappe = document.createElementNS("http://www.w3.org/2000/svg", "path");
    klappe.setAttribute("d", "m3 7 9 6 9-6");
    pfeil.appendChild(klappe);
    zeile.appendChild(pfeil);
    anliegenListe.appendChild(zeile);
  });

  // ---------- Anfahrt (W9, Auftrag D: zwei gleich aufgebaute, dreizeilige
  // Adressblöcke mit je einem Knopf "Route planen" statt Apple/Google
  // nebeneinander bzw. der Rebstock-Adresse als bloßer Hinweistext) ----------

  function googleMapsUrl(adresse) {
    return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(adresse);
  }

  var s = VEREIN.sportstaette || {};
  document.getElementById("anfahrt-vereinsplatz-strasse").textContent = s.strasse || "";
  document.getElementById("anfahrt-vereinsplatz-ort").textContent = nieTrennen((s.plz || "") + " " + (s.ort || ""));
  var vereinsplatzAdresse = (s.strasse || "") + ", " + (s.plz || "") + " " + (s.ort || "");
  document.getElementById("route-vereinsplatz-knopf").href = VEREIN.karten && VEREIN.karten.google ? VEREIN.karten.google : googleMapsUrl(vereinsplatzAdresse);

  document.getElementById("route-rebstock-knopf").href = googleMapsUrl("Am Römerhof 9, 60486 Frankfurt am Main");

  // W9-Nachprüfung D-app Nr. 7: eigene "Verein"-Zeile wie postAbschnitt() in
  // kontakt.mjs (mitGeschuetztemVereinsnamen) – data/verein.json koppelt
  // "1904 e. V." schon mit geschützten Leerzeichen, nur die Lücke zwischen
  // "Sportfreunde" und "1904" ist noch ein normales Leerzeichen.
  document.getElementById("anfahrt-verein").textContent =
    (VEREIN.name_register || "").replace("Sportfreunde 1904", "Sportfreunde 1904");

  var post = VEREIN.post || {};
  document.getElementById("anfahrt-postanschrift").innerHTML = (post.postfach || "") + "<br>" + nieTrennen((post.plz || "") + " " + (post.ort || ""));

  document.getElementById("anfahrt-zugang-text").textContent = VEREIN.anfahrt_hinweis || "";

  document.getElementById("anfahrt-instagram-link").href = VEREIN.instagram || "";
  document.getElementById("anfahrt-facebook-link").href = VEREIN.facebook || "";
})();
</script>
</body>
</html>
