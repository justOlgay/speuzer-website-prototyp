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

/* Speuzer Blau-Weiß – Karneval_v3.tpl (C1)
   appack-Vorlage für die Seite "Karnevalabteilung mit ihren Gruppen". Kopf- und Tab-Leiste
   kommen von der App-Huelle und sind NICHT Teil dieser Vorlage (kein eigener
   Kopf, kein eigener Fuss). Erzeugt aus src/app/v3-basis.css + src/app/Karneval_v3.html
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

/* Karneval_v3.tpl – seitenspezifisch (C1). W8, Grundsatz Daten: Gruppen
   (Name/Leitung/Übungszeit) aus {"name":"Karnevalabteilung „Die Schnauzer“","mail":"karnevalabteilung@sportfreunde04.de","leitung":"Patrick Krösche (Abteilungsleiter)","gruppen":[{"name":"Dreamboys","leitung":["Alexandra Schrödl (Trainerin)","Melanie Seipp (Co-Trainerin)"],"uebungszeit":"Mittwoch 19:00–21:00 Uhr, Turnhalle Fridtjof-Nansen-Schule","offen":null},{"name":"Little Fruities","leitung":["Stephanie Künstler (Trainerin)","Melanie Seipp (Co-Trainerin)"],"uebungszeit":null,"offen":"Übungszeit nicht belegt"},{"name":"Freaky Fruities","leitung":["Stephanie Künstler (Trainerin)","Melanie Seipp (Co-Trainerin)"],"uebungszeit":null,"offen":"Übungszeit nicht belegt"},{"name":"Flying Fruities","leitung":["Simone Bechstein (Trainerin)"],"uebungszeit":null,"offen":"Übungszeit nicht belegt"},{"name":"Pfläumchen","leitung":["Simone Bechstein (Trainerin)","Stephanie Künstler (Co-Trainerin)"],"uebungszeit":null,"offen":"Übungszeit nicht belegt"}],"hinweis":"Live-Seite nennt 'Fridjof-Nansen-Schule' (Schreibweise der Schule: Fridtjof-Nansen-Schule)"} (data/karneval.json),
   Ansprechpartner (Abteilungsleiter/Kassiererin/Schriftführerin) aus
   [{"name":"Melanie Seipp","funktion":"1. Vorsitzende","mail":"geschaeftsstelle@sportfreunde04.de","foto":{"quelle":"vorstand-melanie-seipp","bytes":525138}},{"name":"Uwe Korndörfer","funktion":"2. Vorsitzender","mail":"geschaeftsstelle@sportfreunde04.de","foto":{"quelle":"vorstand-uwe-korndorfer","bytes":517113}},{"name":"Wolfgang Schirmer","funktion":"1. Kassierer","mail":"kassierer@sportfreunde04.de","foto":{"quelle":"vorstand-wolfgang-schirmer","bytes":495840}},{"name":"Bernhard Henrich","funktion":"2. Kassierer","mail":"kassierer@sportfreunde04.de","foto":{"quelle":"vorstand-bernhard-henrich","bytes":135549}},{"name":"Ralf Schwager","funktion":"1. Jugendleiter","mail":"jugendleitung@sportfreunde04.de","foto":{"quelle":"vorstand-ralf-schwager","bytes":112402}},{"name":"Olgay Özkan","funktion":"2. Jugendleiter","mail":"jugendleitung@sportfreunde04.de","foto":{"quelle":"vorstand-olgay-ozkan","bytes":60038}},{"name":"Marcel Hogg","funktion":"Team Jugendleitung","mail":"jugendleitung@sportfreunde04.de","foto":{"quelle":"vorstand-marcel-hogg","bytes":125052}},{"name":"Vassilios Miamis","funktion":"Team Jugendleitung","mail":"jugendleitung@sportfreunde04.de","foto":{"quelle":"vorstand-vassilios-miamis","bytes":215395}},{"name":"Florian Müller","funktion":"Kinderschutzbeauftragter","mail":"kinderschutzbeauftragter@sportfreunde04.de","foto":{"quelle":"vorstand-florian-muller","bytes":69465}},{"name":null,"funktion":"Schriftführer","mail":null,"foto":null,"hinweis":"nicht besetzt"},{"name":"Wolfgang Krönung","funktion":"Sportliche Leitung Senioren","mail":"spielausschuss_senioren@sportfreunde04.de","foto":null},{"name":"Christine Rothe","funktion":"Spielausschuss Senioren","mail":"spielausschuss_senioren@sportfreunde04.de","foto":null},{"name":"Patrick Krösche","funktion":"Abteilungsleiter Karneval","mail":"karnevalabteilung@sportfreunde04.de","foto":{"quelle":"vorstand-patrick-krosche","bytes":221052}},{"name":"Sigrid Weber","funktion":"Kassiererin Abteilung Karneval","mail":"karnevalabteilung@sportfreunde04.de","foto":null},{"name":"Bettina Leven-Grieb","funktion":"Schriftführerin Abteilung Karneval","mail":"karnevalabteilung@sportfreunde04.de","foto":null}] (data/vorstand.json) – dieselben Daten wie
   verein/karneval.mjs. Keine Gruppenbilder mehr (uneinheitlich, teils
   private Porträts, siehe W8-Spezifikation Abschnitt 3) – nur noch das
   Ansprechpartner-Foto wird zur Laufzeit aus dem Ansprechpartner-Worksheet
   geladen (Feld ansImg, per Namensgleichheit), nie im Repo. */

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

.gruppen-liste {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}

.gruppe-karte__titel {
  font-family: var(--font-head);
  font-weight: 700;
  font-size: 20px;
  margin: 0 0 4px;
  color: var(--blau-950);
}

.gruppe-karte__untertitel {
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--ink-3);
}

.karneval-hinweistext {
  margin: var(--sp-5) 0 0;
  font-size: 14px;
  color: var(--ink-2);
}

.ansprechpartner-liste {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
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
  font-size: 15px;
  overflow-wrap: break-word;
}

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
</style>
</head>
<body>
<main class="inhalt">

<h1 class="visually-hidden">Karneval</h1>

<p class="seitenkopf-lead">Fünf Gruppen, eine Bühne: Die Karnevalabteilung des Frankfurter Fußballvereins Sportfreunde 1904 e.&nbsp;V.</p>

<div id="gruppen-liste" class="gruppen-liste"></div>

<p class="karneval-hinweistext">Übungszeiten und Ort erfährst du bei der Karnevalabteilung.</p>
<div class="aktionen">
  <a id="karneval-mail-knopf" class="knopf" href="mailto:karnevalabteilung@sportfreunde04.de">E-Mail an die Karnevalabteilung</a>
</div>

<h2 class="abschnittstitel">Ansprechpartner</h2>
<div id="ansprechpartner-liste" class="ansprechpartner-liste"></div>

<p class="fuss">F.F.V. Sportfreunde 04 · Vereins-App</p>

</main>

<script src="https://cdn.appack.de/modules/common/jquery-3.4.1.min.js"></script>
<script src="https://cdn.appack.de/modules/appack.workbook-1.4.1.js"></script>
<script>
(function () {
  "use strict";

  var KARNEVAL = {"name":"Karnevalabteilung „Die Schnauzer“","mail":"karnevalabteilung@sportfreunde04.de","leitung":"Patrick Krösche (Abteilungsleiter)","gruppen":[{"name":"Dreamboys","leitung":["Alexandra Schrödl (Trainerin)","Melanie Seipp (Co-Trainerin)"],"uebungszeit":"Mittwoch 19:00–21:00 Uhr, Turnhalle Fridtjof-Nansen-Schule","offen":null},{"name":"Little Fruities","leitung":["Stephanie Künstler (Trainerin)","Melanie Seipp (Co-Trainerin)"],"uebungszeit":null,"offen":"Übungszeit nicht belegt"},{"name":"Freaky Fruities","leitung":["Stephanie Künstler (Trainerin)","Melanie Seipp (Co-Trainerin)"],"uebungszeit":null,"offen":"Übungszeit nicht belegt"},{"name":"Flying Fruities","leitung":["Simone Bechstein (Trainerin)"],"uebungszeit":null,"offen":"Übungszeit nicht belegt"},{"name":"Pfläumchen","leitung":["Simone Bechstein (Trainerin)","Stephanie Künstler (Co-Trainerin)"],"uebungszeit":null,"offen":"Übungszeit nicht belegt"}],"hinweis":"Live-Seite nennt 'Fridjof-Nansen-Schule' (Schreibweise der Schule: Fridtjof-Nansen-Schule)"};
  var VORSTAND = [{"name":"Melanie Seipp","funktion":"1. Vorsitzende","mail":"geschaeftsstelle@sportfreunde04.de","foto":{"quelle":"vorstand-melanie-seipp","bytes":525138}},{"name":"Uwe Korndörfer","funktion":"2. Vorsitzender","mail":"geschaeftsstelle@sportfreunde04.de","foto":{"quelle":"vorstand-uwe-korndorfer","bytes":517113}},{"name":"Wolfgang Schirmer","funktion":"1. Kassierer","mail":"kassierer@sportfreunde04.de","foto":{"quelle":"vorstand-wolfgang-schirmer","bytes":495840}},{"name":"Bernhard Henrich","funktion":"2. Kassierer","mail":"kassierer@sportfreunde04.de","foto":{"quelle":"vorstand-bernhard-henrich","bytes":135549}},{"name":"Ralf Schwager","funktion":"1. Jugendleiter","mail":"jugendleitung@sportfreunde04.de","foto":{"quelle":"vorstand-ralf-schwager","bytes":112402}},{"name":"Olgay Özkan","funktion":"2. Jugendleiter","mail":"jugendleitung@sportfreunde04.de","foto":{"quelle":"vorstand-olgay-ozkan","bytes":60038}},{"name":"Marcel Hogg","funktion":"Team Jugendleitung","mail":"jugendleitung@sportfreunde04.de","foto":{"quelle":"vorstand-marcel-hogg","bytes":125052}},{"name":"Vassilios Miamis","funktion":"Team Jugendleitung","mail":"jugendleitung@sportfreunde04.de","foto":{"quelle":"vorstand-vassilios-miamis","bytes":215395}},{"name":"Florian Müller","funktion":"Kinderschutzbeauftragter","mail":"kinderschutzbeauftragter@sportfreunde04.de","foto":{"quelle":"vorstand-florian-muller","bytes":69465}},{"name":null,"funktion":"Schriftführer","mail":null,"foto":null,"hinweis":"nicht besetzt"},{"name":"Wolfgang Krönung","funktion":"Sportliche Leitung Senioren","mail":"spielausschuss_senioren@sportfreunde04.de","foto":null},{"name":"Christine Rothe","funktion":"Spielausschuss Senioren","mail":"spielausschuss_senioren@sportfreunde04.de","foto":null},{"name":"Patrick Krösche","funktion":"Abteilungsleiter Karneval","mail":"karnevalabteilung@sportfreunde04.de","foto":{"quelle":"vorstand-patrick-krosche","bytes":221052}},{"name":"Sigrid Weber","funktion":"Kassiererin Abteilung Karneval","mail":"karnevalabteilung@sportfreunde04.de","foto":null},{"name":"Bettina Leven-Grieb","funktion":"Schriftführerin Abteilung Karneval","mail":"karnevalabteilung@sportfreunde04.de","foto":null}];
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

  // ---------- Gruppen (wie gruppenKarte() in verein/karneval.mjs: Name,
  // Leitung mit Komma verbunden, Übungsstunde nur wenn gepflegt) ----------

  var gruppenListe = document.getElementById("gruppen-liste");
  (KARNEVAL.gruppen || []).forEach(function (g) {
    var karte = document.createElement("div");
    karte.className = "karte";
    var titel = document.createElement("p");
    titel.className = "gruppe-karte__titel";
    titel.textContent = g.name;
    karte.appendChild(titel);
    var leitung = document.createElement("p");
    leitung.className = "gruppe-karte__untertitel";
    leitung.textContent = "Leitung: " + (g.leitung || []).join(", ");
    karte.appendChild(leitung);
    if (g.uebungszeit) {
      var zeit = document.createElement("p");
      zeit.className = "gruppe-karte__untertitel";
      zeit.textContent = "Übungsstunde: " + g.uebungszeit;
      karte.appendChild(zeit);
    }
    gruppenListe.appendChild(karte);
  });

  document.getElementById("karneval-mail-knopf").href = "mailto:" + (KARNEVAL.mail || "karnevalabteilung@sportfreunde04.de");

  // ---------- Ansprechpartner (wie ansprechpartnerAbschnitt() in
  // verein/karneval.mjs: Abteilungsleiter/Kassiererin/Schriftführerin aus
  // data/vorstand.json, Foto zur Laufzeit per Namensgleichheit) ----------

  var FUNKTIONEN = ["Abteilungsleiter Karneval", "Kassiererin Abteilung Karneval", "Schriftführerin Abteilung Karneval"];
  var personen = FUNKTIONEN
    .map(function (f) { return (VORSTAND || []).find(function (p) { return p.funktion === f; }); })
    .filter(Boolean);

  var liste = document.getElementById("ansprechpartner-liste");

  function bauePersonKarte(person, bildUrl) {
    var karte = document.createElement("div");
    karte.className = "karte person-karte";

    if (bildUrlGueltig(bildUrl)) {
      var bild = document.createElement("img");
      bild.className = "person-karte__bild";
      bild.src = bildUrl;
      bild.alt = "";
      bild.loading = "lazy";
      karte.appendChild(bild);
    } else {
      var kreis = document.createElement("div");
      kreis.className = "person-karte__initialen";
      kreis.setAttribute("aria-hidden", "true");
      kreis.textContent = initialenAus(person.name);
      karte.appendChild(kreis);
    }

    var inhalt = document.createElement("div");
    inhalt.className = "person-karte__inhalt";
    var name = document.createElement("p");
    name.className = "person-karte__name";
    name.textContent = person.name || "derzeit nicht besetzt";
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

  personen.forEach(function (p) { liste.appendChild(bauePersonKarte(p, null)); });

  var karten = liste.querySelectorAll(".person-karte");
  var hatBild = [];
  function zeigeBild(i, bildUrl) {
    var kreis = karten[i] && karten[i].querySelector(".person-karte__initialen");
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
    hatBild[i] = true;
  }
  personen.forEach(function (p, i) { zeigeBild(i, vereinsFotoUrl(p.name)); });

  ladeWorkbook(ANSPRECHPARTNER_ID).then(function (ansprechpartner) {
    personen.forEach(function (p, i) {
      if (!hatBild[i]) zeigeBild(i, findeBildFuerName(ansprechpartner, p.name));
    });
  }).catch(function () {
    // Kein Netz/CORS: Initialen bleiben stehen.
  });
})();
</script>
</body>
</html>
