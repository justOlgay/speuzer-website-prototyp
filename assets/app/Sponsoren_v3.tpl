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

/* Speuzer Blau-Weiß – Sponsoren_v3.tpl (C1)
   appack-Vorlage für die Seite "Sponsoren & Partner". Kopf- und Tab-Leiste
   kommen von der App-Huelle und sind NICHT Teil dieser Vorlage (kein eigener
   Kopf, kein eigener Fuss). Erzeugt aus src/app/v3-basis.css + src/app/Sponsoren_v3.html
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

/* Sponsoren_v3.tpl – seitenspezifisch (C1). W8, Grundsatz Daten: Namen,
   Kategorie, Ort, Link, Instagram aus [{"firma":"SK SportConnects GbR","kategorie":"Partner","ort":"Hösbach","link":"www.sk-sportconnects.de","instagram":"sksportconnects","beschreibung":null,"logo":{"quelle":"sponsor-sk-sportconnects-gbr","bytes":34968},"hinweis":null},{"firma":"vmapit GmbH","kategorie":"App-Projektpartner","ort":"Mannheim","link":"https://www.appack.app/","instagram":null,"beschreibung":"Wir entwickeln Apps für die unterschiedlichsten Anwendungsbereiche z.B. Bürger-Apps, Schul-Apps, Kindergarten- u. Kita-Apps, Kirchengemeinde-Apps, Mitarbeiter-Apps, speziell für Ihr Business oder Event, um Menschen zu erreichen und die Chancen der Digitalisierung zu nutzen.  \nFür Sportvereine, Bürgervereine, Non-Profits und gemeinnützige Organisationen sogar gefördert, gemeinsam mit dem DOSB, Stifter Helfen und vmapit.  \nOder haben Sie eine eigene, individuelle App Idee? \nSprechen Sie uns an!","logo":{"quelle":"sponsor-vmapit-gmbh","bytes":20913},"hinweis":null},{"firma":"Bundeswehr","kategorie":"Partner","ort":null,"link":null,"instagram":null,"beschreibung":null,"logo":{"quelle":"sponsor-bundeswehr","bytes":71831},"hinweis":null},{"firma":"Fußballschule-Athletik VM Elite","kategorie":"Fußballschule","ort":null,"link":null,"instagram":null,"beschreibung":null,"logo":{"quelle":"sponsor-fuballschule-vm-elite","bytes":152104},"hinweis":"W3, Abschnitt 7 (Datenkorrektur): kategorie von 'App-Projektpartner' auf 'Fußballschule' geändert – VM Elite ist kein App-Projektpartner. Live-Link zeigt auf instagram.com/bundeswehrkarriere – falsch; ohne Link übernehmen"},{"firma":"11TeamSports","kategorie":"Partner","ort":null,"link":null,"instagram":null,"beschreibung":null,"logo":{"quelle":"sponsor-11teamsports","bytes":24700},"hinweis":null},{"firma":"Köhler","kategorie":"Partner","ort":null,"link":null,"instagram":null,"beschreibung":null,"logo":{"quelle":"sponsor-koehler","bytes":81838},"hinweis":null}] (data/sponsoren.json)
   – dieselbe Quelle wie verein/sponsoren.mjs, feste Reihenfolge Partner ›
   Fußballschule › App-Projektpartner statt der bisherigen dynamischen
   CMS-Gruppierung. Logos bleiben zur Laufzeit aus dem Sponsoren-Worksheet
   (Feld sponImg, per Namensgleichheit), nie im Repo. */

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

.sponsoren-gruppe { margin-top: var(--sp-6); }
.sponsoren-gruppe:first-child { margin-top: 0; }

/* W9, Auftrag D (Befund "app" Nr. 12): kompakte Zeilen statt des
   2-Spalten-Rasters, das bei einer ungeraden Anzahl Karten bzw. Logos ohne
   Ort/Link halbleer blieb und Karten unterschiedlich hoch streckte – Logo
   64 px links, Name/Ort und Links rechts, wie eine Karte je Sponsor. */
.sponsoren-liste {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

/* W10, Auftrag D (app Nr. 13): immer oben ausgerichtet statt vertikal
   zentriert – bei "align-items:center" stand der Name je nach Kartenhöhe
   (mit/ohne Link-Knöpfe) mal oben, mal mittig neben dem Logo. */
.sponsor-karte {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-3);
}

/* W10-Nachprüfung (offen 5): breites Logofeld (96×64, wie
   .logo-reihe__kachel in komponenten.css) statt des quadratischen 64×64-
   Rahmens – darin waren breite Wortmarken (SK SportConnects, 11TeamSports,
   appack) auf 46×7–15px zusammengequetscht und kaum lesbar, obwohl dieselben
   Bilddateien auf der Website in der breiteren Kachel gut lesbar sind. */
.sponsor-karte__logo {
  flex: 0 0 96px;
  width: 96px;
  height: 64px;
  background: var(--weiss);
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  padding: 8px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.sponsor-karte__logo img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.sponsor-karte__inhalt { flex: 1 1 auto; min-width: 0; }

/* W9-Nachprüfung D-app Nr. 15: kein <a> mehr in .sponsor-karte__name (Namen
   immer in derselben Farbe, unabhängig von sponsor.link) – der Link liegt
   allein auf den Symbolknöpfen (.sponsor-karte__aktionen). */
.sponsor-karte__name {
  margin: 0;
  font-family: var(--font-text);
  font-weight: 600;
  font-size: 14px;
  overflow-wrap: break-word;
}

.sponsor-karte__text {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--ink-2);
}

.sponsor-karte__aktionen {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
  margin-top: var(--sp-2);
}

.icon-knopf {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 44px;
  min-height: 44px;
  padding-inline: var(--sp-2);
  border-radius: var(--r-md);
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--blau-800);
  text-decoration: none;
}

.icon-knopf svg { width: 18px; height: 18px; }
/* W10, Auftrag D (app Nr. 13/quervergleich Nr. 9, Entscheidung F): Knöpfe
   zeigen Symbol UND Text ("Website"/"Instagram") statt reiner Symbole –
   sonst nicht erkennbar, wofür ein Knopf steht (Kamera ≠ Instagram). */
.icon-knopf span { font-size: 13px; font-weight: 600; }
.icon-knopf { padding-inline: var(--sp-3); }
</style>
</head>
<body>
<main class="inhalt">

<h1 class="visually-hidden">Sponsoren &amp; Partner</h1>

<p class="seitenkopf-lead">Ohne Unterstützung kein Vereinsleben. Danke an alle, die die Sportfreunde tragen.</p>

<div id="sponsoren-bereich"></div>

<h2 class="abschnittstitel">Sponsor werden</h2>
<div class="karte fluss">
  <p style="margin:0 0 var(--sp-3);font-size:14px;color:var(--ink-2);">Sie möchten die Sportfreunde 04 unterstützen – als Trikotsponsor, mit einer Bandenwerbung oder als Partner der Jugendabteilung? Schreiben Sie uns, wir melden uns zeitnah.</p>
  <div class="aktionen">
    <a class="knopf" href="mailto:geschaeftsstelle@sportfreunde04.de?subject=Sponsoring%20FFV%20Sportfreunde%2004">E-Mail an die Geschäftsstelle</a>
  </div>
</div>

<p class="fuss">F.F.V. Sportfreunde 04 · Vereins-App</p>

</main>

<script src="https://cdn.appack.de/modules/common/jquery-3.4.1.min.js"></script>
<script src="https://cdn.appack.de/modules/appack.workbook-1.4.1.js"></script>
<script>
(function () {
  "use strict";

  var SPONSOREN = [{"firma":"SK SportConnects GbR","kategorie":"Partner","ort":"Hösbach","link":"www.sk-sportconnects.de","instagram":"sksportconnects","beschreibung":null,"logo":{"quelle":"sponsor-sk-sportconnects-gbr","bytes":34968},"hinweis":null},{"firma":"vmapit GmbH","kategorie":"App-Projektpartner","ort":"Mannheim","link":"https://www.appack.app/","instagram":null,"beschreibung":"Wir entwickeln Apps für die unterschiedlichsten Anwendungsbereiche z.B. Bürger-Apps, Schul-Apps, Kindergarten- u. Kita-Apps, Kirchengemeinde-Apps, Mitarbeiter-Apps, speziell für Ihr Business oder Event, um Menschen zu erreichen und die Chancen der Digitalisierung zu nutzen.  \nFür Sportvereine, Bürgervereine, Non-Profits und gemeinnützige Organisationen sogar gefördert, gemeinsam mit dem DOSB, Stifter Helfen und vmapit.  \nOder haben Sie eine eigene, individuelle App Idee? \nSprechen Sie uns an!","logo":{"quelle":"sponsor-vmapit-gmbh","bytes":20913},"hinweis":null},{"firma":"Bundeswehr","kategorie":"Partner","ort":null,"link":null,"instagram":null,"beschreibung":null,"logo":{"quelle":"sponsor-bundeswehr","bytes":71831},"hinweis":null},{"firma":"Fußballschule-Athletik VM Elite","kategorie":"Fußballschule","ort":null,"link":null,"instagram":null,"beschreibung":null,"logo":{"quelle":"sponsor-fuballschule-vm-elite","bytes":152104},"hinweis":"W3, Abschnitt 7 (Datenkorrektur): kategorie von 'App-Projektpartner' auf 'Fußballschule' geändert – VM Elite ist kein App-Projektpartner. Live-Link zeigt auf instagram.com/bundeswehrkarriere – falsch; ohne Link übernehmen"},{"firma":"11TeamSports","kategorie":"Partner","ort":null,"link":null,"instagram":null,"beschreibung":null,"logo":{"quelle":"sponsor-11teamsports","bytes":24700},"hinweis":null},{"firma":"Köhler","kategorie":"Partner","ort":null,"link":null,"instagram":null,"beschreibung":null,"logo":{"quelle":"sponsor-koehler","bytes":81838},"hinweis":null}];
  var SPONSOREN_ID = "6a1ec5fcf68a05bf129cdbac";

  var ICON_GLOBUS = '<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.5 3.8 5.5 3.8 8.5s-1.3 6-3.8 8.5c-2.5-2.5-3.8-5.5-3.8-8.5s1.3-6 3.8-8.5z"/></svg>';
  // W10, Auftrag D (app Nr. 13/quervergleich Nr. 9): echtes Instagram-Symbol
  // (Kamera war nicht eindeutig) – wortgleiches Icon wie ICON_INSTAGRAM in
  // src/seiten/verein/sponsoren.mjs.
  var ICON_INSTAGRAM = '<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none"/></svg>';

  function bildUrlGueltig(url) {
    return /^https?:\/\//i.test(url || "");
  }

  function mitSchema(url) {
    var u = String(url || "").trim();
    if (!u) return "";
    return /^https?:/i.test(u) ? u : "https://" + u;
  }

  function ladeWorkbook(id, filter) {
    if (!window.Workbook || typeof Workbook.load !== "function") {
      return Promise.reject(new Error("Workbook-API fehlt"));
    }
    return Workbook.load({ workbook: id, filter: filter || {}, offset: 0, limit: 5000, sort: "_id", direction: "asc" })
      .then(function (rows) { return Array.isArray(rows) ? rows : []; });
  }

  function logoUrlFuerFirma(sponsorenZeilen, firma) {
    for (var i = 0; i < sponsorenZeilen.length; i++) {
      var z = sponsorenZeilen[i];
      if (z.sponActive === true && String(z.sponFirma || "") === firma) {
        var url = String(z.sponImg || "");
        if (bildUrlGueltig(url)) return url;
      }
    }
    return null;
  }

  // W9, Auftrag D (Abschnitt "Sponsoren & Partner"): "Fußballschule VM
  // Elite" nie zwischen "VM" und "Elite" umbrechen.
  function nameMitSchutz(text) {
    return String(text || "").replace("VM Elite", "VM Elite");
  }

  function baueSponsorKarte(sponsor, sponsorenZeilen) {
    var karte = document.createElement("div");
    karte.className = "karte sponsor-karte";

    var logoBox = document.createElement("div");
    logoBox.className = "sponsor-karte__logo";
    karte.appendChild(logoBox);
    // Logos wie auf der Website (data/sponsoren.json logo.quelle, Varianten
    // auf GitHub Pages); das Worksheet-Bild nur als Rückfall.
    var logoUrl = (sponsor.logo && sponsor.logo.quelle)
      ? "https://justolgay.github.io/speuzer-website-prototyp/assets/bilder/erzeugt/" + sponsor.logo.quelle + "-480.jpg"
      : logoUrlFuerFirma(sponsorenZeilen, sponsor.firma);
    if (bildUrlGueltig(logoUrl)) {
      var testbild = new Image();
      testbild.onload = function () {
        var img = document.createElement("img");
        img.src = logoUrl;
        img.alt = "Logo " + sponsor.firma;
        img.loading = "lazy";
        logoBox.appendChild(img);
      };
      testbild.src = logoUrl;
    }

    var inhalt = document.createElement("div");
    inhalt.className = "sponsor-karte__inhalt";
    karte.appendChild(inhalt);

    // W9-Nachprüfung D-app Nr. 15: Name einheitlich als Marke, immer in
    // derselben Farbe (kein Link mehr auf dem Namen selbst) – der Link führt
    // stattdessen ausschließlich über die Symbolknöpfe (aktionen unten),
    // sonst wirkten Namen mit/ohne sponsor.link unterschiedlich eingefärbt
    // (blau verlinkt vs. schwarz).
    // W10, Auftrag D (quervergleich Nr. 9): Ort ergänzen, wenn gepflegt –
    // wortgleich mit logoEintrag() in src/seiten/verein/sponsoren.mjs
    // ("Name, Ort" in einer Zeile).
    var nameText = [nameMitSchutz(sponsor.firma), sponsor.ort].filter(Boolean).join(", ");
    var nameEl = document.createElement("p");
    nameEl.className = "sponsor-karte__name";
    nameEl.textContent = nameText;
    inhalt.appendChild(nameEl);

    // W10, Auftrag D (quervergleich Nr. 9, Entscheidung F): Beschreibungssatz
    // für vmapit – wortgleich mit dem Zusatz in sponsoren.mjs (die lange,
    // freie "beschreibung" aus data/sponsoren.json bleibt unbenutzt).
    if (sponsor.firma === "vmapit GmbH") {
      var vmapitText = document.createElement("p");
      vmapitText.className = "sponsor-karte__text";
      vmapitText.textContent = "Die Vereins-App und die Website laufen auf der Plattform appack der vmapit GmbH.";
      inhalt.appendChild(vmapitText);
    }

    var href = sponsor.link ? mitSchema(sponsor.link) : "";

    var aktionen = document.createElement("div");
    aktionen.className = "sponsor-karte__aktionen";
    if (href) {
      var globus = document.createElement("a");
      globus.className = "icon-knopf";
      globus.href = href;
      globus.target = "_blank";
      globus.rel = "noopener";
      globus.setAttribute("aria-label", "Website");
      globus.innerHTML = ICON_GLOBUS + "<span>Website</span>";
      aktionen.appendChild(globus);
    }
    if (sponsor.instagram) {
      var insta = document.createElement("a");
      insta.className = "icon-knopf";
      insta.href = "https://instagram.com/" + String(sponsor.instagram).replace(/^@/, "");
      insta.target = "_blank";
      insta.rel = "noopener";
      insta.setAttribute("aria-label", "Instagram");
      insta.innerHTML = ICON_INSTAGRAM + "<span>Instagram</span>";
      aktionen.appendChild(insta);
    }
    if (aktionen.children.length) inhalt.appendChild(aktionen);

    return karte;
  }

  var GRUPPEN = ["Partner", "Fußballschule", "App-Projektpartner"];
  var bereich = document.getElementById("sponsoren-bereich");

  ladeWorkbook(SPONSOREN_ID, { sponActive: true }).then(function (sponsorenZeilen) {
    GRUPPEN.forEach(function (kategorie) {
      var sponsoren = (SPONSOREN || []).filter(function (s) { return s.kategorie === kategorie; });
      if (!sponsoren.length) return;
      var abschnitt = document.createElement("section");
      abschnitt.className = "sponsoren-gruppe";
      var titel = document.createElement("h2");
      titel.className = "abschnittstitel";
      titel.textContent = kategorie;
      abschnitt.appendChild(titel);
      var raster = document.createElement("div");
      raster.className = "sponsoren-liste";
      sponsoren.forEach(function (s) { raster.appendChild(baueSponsorKarte(s, sponsorenZeilen)); });
      abschnitt.appendChild(raster);
      bereich.appendChild(abschnitt);
    });
  }).catch(function () {
    GRUPPEN.forEach(function (kategorie) {
      var sponsoren = (SPONSOREN || []).filter(function (s) { return s.kategorie === kategorie; });
      if (!sponsoren.length) return;
      var abschnitt = document.createElement("section");
      abschnitt.className = "sponsoren-gruppe";
      var titel = document.createElement("h2");
      titel.className = "abschnittstitel";
      titel.textContent = kategorie;
      abschnitt.appendChild(titel);
      var raster = document.createElement("div");
      raster.className = "sponsoren-liste";
      sponsoren.forEach(function (s) { raster.appendChild(baueSponsorKarte(s, [])); });
      abschnitt.appendChild(raster);
      bereich.appendChild(abschnitt);
    });
  });
})();
</script>
</body>
</html>
