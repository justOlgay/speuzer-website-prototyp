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
}

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

/* Geschaeftsstelle_v3.tpl – seitenspezifisch (C2). W8, Grundsatz Daten:
   Bausteine/Reihenfolge wie kontakt.html der Website, Inhalte aus
   {"name_register":"Frankfurter Fußballverein Sportfreunde 1904 e. V.","name_kurz":"FFV Sportfreunde 04","spitzname":"Speuzer","gegruendet":"15. Mai 1904","gruendungsname":"Frankfurter FC Britannia","umbenannt":"1919","stadtteil":"Gallus","sportstaette":{"strasse":"Mainzer Landstraße 480","plz":"60326","ort":"Frankfurt am Main"},"post":{"postfach":"Postfach 190442","plz":"60091","ort":"Frankfurt am Main"},"mail":"geschaeftsstelle@sportfreunde04.de","tel_geschaeftsstelle":"+49 69 736868","tel_platzwart":"+49 69 732193","register":"Amtsgericht Frankfurt am Main, VR 4727","vorsitz":["Melanie Seipp (1. Vorsitzende)","Uwe Korndörfer (2. Vorsitzender)"],"vertretung":["Melanie Seipp (1. Vorsitzende)","Uwe Korndörfer (2. Vorsitzender)"],"instagram":"https://www.instagram.com/speuzer_ffm/","facebook":"https://www.facebook.com/groups/223133414377924/","fanshop":"https://sportfreunde04.fan12.de/","teamshop":"https://www.11teamsports.com/de-de/clubshop/frankfurter-fussballvereine-sportfreunde-04/","mails":{"jugendleitung":"jugendleitung@sportfreunde04.de","kassierer":"kassierer@sportfreunde04.de","kinderschutz":"kinderschutzbeauftragter@sportfreunde04.de","karneval":"karnevalabteilung@sportfreunde04.de","senioren":"spielausschuss_senioren@sportfreunde04.de","vorstand":"vorstand@sportfreunde04.de"},"hinweise":{"parken":"Der Parkplatz am Vereinsgelände ist wegen des Neubaus des Funktionsgebäudes voraussichtlich bis Ende Januar 2027 gesperrt. Der Zugang zum Gelände ist über den Hintereingang am „Haus der Jugend“ (Pavillon) möglich.","parken_quelle":"App-News vom 21.07.2026","ferien":"In den hessischen Schulferien und an Feiertagen findet in der Regel kein Training statt. Ausnahmen sagt das Trainerteam an."},"oepnv":null,"anfahrt_hinweis":"Zugang zum Vereinsgelände derzeit über den Hintereingang am „Haus der Jugend“ (Pavillon); der Parkplatz ist wegen des Neubaus bis voraussichtlich Ende Januar 2027 gesperrt.","gruendung_jahr":1904,"anzahl_mannschaften":11,"karten":{"apple":"https://maps.apple.com/?q=Mainzer+Landstra%C3%9Fe+480,+60326+Frankfurt+am+Main","google":"https://www.google.com/maps/search/?api=1&query=Mainzer+Landstra%C3%9Fe+480%2C+60326+Frankfurt+am+Main"},"kalender_basis":"https://justolgay.github.io/speuzer-spielplan/"} (data/verein.json) und {"_quelle":"appack public workbook API, Worksheet 6a1ec5fcf68a05bf129cdb9b (Kontakt der Geschäftsstelle), geholt am 2026-09-22 mit tools/appack-daten.mjs. Nur Adresse/Telefon/E-Mail/Website/Social; keine Personendaten, \"mobileNumber\" bewusst nicht übernommen. Öffnungszeiten werden seit 22.09.2026 nicht mehr übernommen (Entscheidung Olgay: es gibt keine festen Öffnungszeiten).","kontakt":{"address":" Postfach 190442 (postalisch)","postalCode":"60091","city":"Frankfurt","phoneNumber":"069-736868","email":"geschaeftsstelle@sportfreunde04.de","website":"https://www.sportfreunde04.de","insta":"https://www.instagram.com/speuzer_ffm/","face":"https://www.facebook.com/groups/223133414377924/"}}
   (data/geschaeftsstelle.json) – dieselbe Quelle wie die Website, von
   tools/app-optik/tpl-bauen.mjs zur Bauzeit eingesetzt. Kein Workbook-Aufruf
   mehr auf dieser Seite (die frühere rohe "Hinweis:"-Karte aus dem
   Beschreibung-Worksheet, die dynamische Öffnungszeiten-Tabelle, die
   generischen Kontakt-Icons und die generische Ansprechpartner-Liste
   entfallen – ersetzt durch Erreichbarkeit/Anliegen/Anfahrt wie auf der
   Website, siehe W8-Spezifikation Abschnitt 2). */

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

.adresse-text {
  margin: 0 0 var(--sp-3);
  font-size: 15px;
  font-weight: 600;
  overflow-wrap: break-word;
}

.aktionen--inline {
  flex-direction: row;
  flex-wrap: wrap;
  margin-top: 0;
  margin-bottom: var(--sp-4);
}

.zeile__untertitel {
  display: block;
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--ink-3);
  overflow-wrap: break-word;
}
</style>
</head>
<body>
<main class="inhalt">

<h1 class="visually-hidden">Geschäftsstelle &amp; Anfahrt</h1>

<p class="seitenkopf-lead">So erreichst du uns – per E-Mail an die passende Vereinsadresse oder telefonisch in der Geschäftsstelle.</p>

<h2 class="abschnittstitel">Erreichbarkeit</h2>
<div class="karte">
  <p style="margin:0 0 var(--sp-3);"><strong>Keine festen Öffnungszeiten.</strong> Die Geschäftsstelle ist per E-Mail erreichbar, telefonisch nach Vereinbarung.</p>
  <dl class="angaben">
    <dt>E-Mail Geschäftsstelle</dt>
    <dd><a class="mail-link" id="gs-mail-link" href="#"></a></dd>
    <dt>Telefon Geschäftsstelle</dt>
    <dd><a class="mail-link" id="gs-tel-link" href="#"></a></dd>
  </dl>
</div>

<h2 class="abschnittstitel">Anliegen</h2>
<div id="anliegen-liste" class="liste"></div>

<h2 class="abschnittstitel">Anfahrt</h2>
<div class="karte">
  <p id="anfahrt-adresse" class="adresse-text"></p>
  <div class="aktionen aktionen--inline">
    <a id="route-apple-knopf" class="knopf knopf--leise" href="#" target="_blank" rel="noopener">Route in Apple Karten</a>
    <a id="route-google-knopf" class="knopf knopf--leise" href="#" target="_blank" rel="noopener">Route in Google Maps</a>
  </div>
  <a class="zeile" href="nav://sportfreunde04_Map_1783059375623">
    <span class="zeile__text"><span class="zeile__titel">Karte anzeigen</span></span>
    <svg class="zeile__pfeil" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7"/></svg>
  </a>
</div>

<div class="karte">
  <p class="beschreibung-titel" style="font-size:16px;margin:0 0 var(--sp-2);">Postanschrift</p>
  <p id="anfahrt-postanschrift" class="adresse-text" style="margin-bottom:0;"></p>
</div>

<div class="hinweis">
  <p><strong>Zugang &amp; Parken.</strong> <span id="anfahrt-zugang-text"></span></p>
</div>
<div class="hinweis">
  <p>Mit Bus und Bahn: <a href="https://www.rmv.de" target="_blank" rel="noopener">Verbindung in der RMV-Auskunft</a></p>
</div>
<div class="hinweis">
  <p id="anfahrt-rebstock-text"></p>
  <div class="aktionen" style="margin-top:var(--sp-3);">
    <a id="route-rebstock-knopf" class="knopf knopf--leise" href="#" target="_blank" rel="noopener">Route</a>
  </div>
</div>

<p class="fuss">F.F.V. Sportfreunde 04 · Vereins-App</p>

</main>

<script src="https://cdn.appack.de/modules/common/jquery-3.4.1.min.js"></script>
<script src="https://cdn.appack.de/modules/appack.workbook-1.4.1.js"></script>
<script>
(function () {
  "use strict";

  var VEREIN = {"name_register":"Frankfurter Fußballverein Sportfreunde 1904 e. V.","name_kurz":"FFV Sportfreunde 04","spitzname":"Speuzer","gegruendet":"15. Mai 1904","gruendungsname":"Frankfurter FC Britannia","umbenannt":"1919","stadtteil":"Gallus","sportstaette":{"strasse":"Mainzer Landstraße 480","plz":"60326","ort":"Frankfurt am Main"},"post":{"postfach":"Postfach 190442","plz":"60091","ort":"Frankfurt am Main"},"mail":"geschaeftsstelle@sportfreunde04.de","tel_geschaeftsstelle":"+49 69 736868","tel_platzwart":"+49 69 732193","register":"Amtsgericht Frankfurt am Main, VR 4727","vorsitz":["Melanie Seipp (1. Vorsitzende)","Uwe Korndörfer (2. Vorsitzender)"],"vertretung":["Melanie Seipp (1. Vorsitzende)","Uwe Korndörfer (2. Vorsitzender)"],"instagram":"https://www.instagram.com/speuzer_ffm/","facebook":"https://www.facebook.com/groups/223133414377924/","fanshop":"https://sportfreunde04.fan12.de/","teamshop":"https://www.11teamsports.com/de-de/clubshop/frankfurter-fussballvereine-sportfreunde-04/","mails":{"jugendleitung":"jugendleitung@sportfreunde04.de","kassierer":"kassierer@sportfreunde04.de","kinderschutz":"kinderschutzbeauftragter@sportfreunde04.de","karneval":"karnevalabteilung@sportfreunde04.de","senioren":"spielausschuss_senioren@sportfreunde04.de","vorstand":"vorstand@sportfreunde04.de"},"hinweise":{"parken":"Der Parkplatz am Vereinsgelände ist wegen des Neubaus des Funktionsgebäudes voraussichtlich bis Ende Januar 2027 gesperrt. Der Zugang zum Gelände ist über den Hintereingang am „Haus der Jugend“ (Pavillon) möglich.","parken_quelle":"App-News vom 21.07.2026","ferien":"In den hessischen Schulferien und an Feiertagen findet in der Regel kein Training statt. Ausnahmen sagt das Trainerteam an."},"oepnv":null,"anfahrt_hinweis":"Zugang zum Vereinsgelände derzeit über den Hintereingang am „Haus der Jugend“ (Pavillon); der Parkplatz ist wegen des Neubaus bis voraussichtlich Ende Januar 2027 gesperrt.","gruendung_jahr":1904,"anzahl_mannschaften":11,"karten":{"apple":"https://maps.apple.com/?q=Mainzer+Landstra%C3%9Fe+480,+60326+Frankfurt+am+Main","google":"https://www.google.com/maps/search/?api=1&query=Mainzer+Landstra%C3%9Fe+480%2C+60326+Frankfurt+am+Main"},"kalender_basis":"https://justolgay.github.io/speuzer-spielplan/"};
  var GESCHAEFTSSTELLE = {"_quelle":"appack public workbook API, Worksheet 6a1ec5fcf68a05bf129cdb9b (Kontakt der Geschäftsstelle), geholt am 2026-09-22 mit tools/appack-daten.mjs. Nur Adresse/Telefon/E-Mail/Website/Social; keine Personendaten, \"mobileNumber\" bewusst nicht übernommen. Öffnungszeiten werden seit 22.09.2026 nicht mehr übernommen (Entscheidung Olgay: es gibt keine festen Öffnungszeiten).","kontakt":{"address":" Postfach 190442 (postalisch)","postalCode":"60091","city":"Frankfurt","phoneNumber":"069-736868","email":"geschaeftsstelle@sportfreunde04.de","website":"https://www.sportfreunde04.de","insta":"https://www.instagram.com/speuzer_ffm/","face":"https://www.facebook.com/groups/223133414377924/"}};
  var kontakt = (GESCHAEFTSSTELLE && GESCHAEFTSSTELLE.kontakt) || {};

  // ---------- Erreichbarkeit ----------

  var email = kontakt.email || VEREIN.mail || "";
  var gsMailLink = document.getElementById("gs-mail-link");
  gsMailLink.href = "mailto:" + email;
  gsMailLink.textContent = email;

  var telefon = kontakt.phoneNumber || VEREIN.tel_geschaeftsstelle || "";
  var gsTelLink = document.getElementById("gs-tel-link");
  gsTelLink.href = "tel:" + telefon.replace(/[^\d+]/g, "");
  gsTelLink.textContent = telefon;

  // ---------- Anliegen (wie ansprechpartnerAbschnitt() in kontakt.mjs,
  // als kompakte Liste statt Karten mit eigenem Knopf – W8, Befund 2) ----------

  var mails = VEREIN.mails || {};
  var ANLIEGEN = [
    { titel: "Allgemeine Fragen", text: "Alles, was sonst nirgends passt – die Geschäftsstelle leitet weiter.", mail: VEREIN.mail, betreff: "Anfrage über die Website" },
    { titel: "Probetraining & Jugend", text: "Für Kinder und Jugendliche von der A- bis zur G-Jugend.", mail: mails.jugendleitung, betreff: "Probetraining" },
    { titel: "Herren & Senioren", text: "Fragen zur 1. Herrenmannschaft, Spielausschuss und Seniorenfußball.", mail: mails.senioren, betreff: "Herren" },
    { titel: "Karnevalabteilung", text: "Die Schnauzer: Gruppen, Übungsstunden, Auftritte.", mail: mails.karneval, betreff: "Karnevalabteilung" },
    { titel: "Beiträge & Rechnungen", text: "Beiträge, Lastschrift, Bescheinigungen für Bildung und Teilhabe.", mail: mails.kassierer, betreff: "Beiträge" },
    { titel: "Kinderschutz", text: "Vertraulicher Kontakt zum Kinderschutzbeauftragten.", mail: mails.kinderschutz, betreff: "" },
    { titel: "Sponsoring & Partner", text: "Trikot- und Bandenwerbung, Partnerschaften mit der Jugendabteilung.", mail: VEREIN.mail, betreff: "Sponsoring" },
    { titel: "Trainer- und Ehrenamt", text: "Mitmachen als Trainer, Betreuer oder im Vorstand.", mail: VEREIN.mail, betreff: "Ich helfe gern" }
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
    untertitelSpan.textContent = a.text;
    textSpan.appendChild(untertitelSpan);
    zeile.appendChild(textSpan);
    var pfeil = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    pfeil.setAttribute("class", "zeile__pfeil");
    pfeil.setAttribute("viewBox", "0 0 24 24");
    pfeil.setAttribute("stroke", "currentColor");
    pfeil.setAttribute("stroke-width", "1.8");
    pfeil.setAttribute("fill", "none");
    pfeil.setAttribute("stroke-linecap", "round");
    pfeil.setAttribute("stroke-linejoin", "round");
    pfeil.setAttribute("aria-hidden", "true");
    pfeil.setAttribute("focusable", "false");
    var pfad = document.createElementNS("http://www.w3.org/2000/svg", "path");
    pfad.setAttribute("d", "M9 5l7 7-7 7");
    pfeil.appendChild(pfad);
    zeile.appendChild(pfeil);
    anliegenListe.appendChild(zeile);
  });

  // ---------- Anfahrt ----------

  function googleMapsUrl(adresse) {
    return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(adresse);
  }

  var s = VEREIN.sportstaette || {};
  var sportstaetteAdresse = (s.strasse || "") + ", " + (s.plz || "") + " " + (s.ort || "");
  document.getElementById("anfahrt-adresse").textContent = sportstaetteAdresse;
  document.getElementById("route-apple-knopf").href = VEREIN.karten && VEREIN.karten.apple ? VEREIN.karten.apple : "https://maps.apple.com/?q=" + encodeURIComponent(sportstaetteAdresse);
  document.getElementById("route-google-knopf").href = VEREIN.karten && VEREIN.karten.google ? VEREIN.karten.google : googleMapsUrl(sportstaetteAdresse);

  var post = VEREIN.post || {};
  document.getElementById("anfahrt-postanschrift").textContent = (post.postfach || "") + ", " + (post.plz || "") + " " + (post.ort || "");

  document.getElementById("anfahrt-zugang-text").textContent = VEREIN.anfahrt_hinweis || "";

  document.getElementById("anfahrt-rebstock-text").textContent = "Die Herren und die A-Jugend spielen ihre Heimspiele auf der Anlage von SW Griesheim am Rebstock, Am Römerhof 9, 60486 Frankfurt am Main.";
  document.getElementById("route-rebstock-knopf").href = googleMapsUrl("Am Römerhof 9, 60486 Frankfurt am Main");
})();
</script>
</body>
</html>
