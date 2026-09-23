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

/* Speuzer Blau-Weiß – Verein_v3.tpl (C1)
   appack-Vorlage für die Seite "Verteiler "Verein" (Tab 4 der neuen App)". Kopf- und Tab-Leiste
   kommen von der App-Huelle und sind NICHT Teil dieser Vorlage (kein eigener
   Kopf, kein eigener Fuss). Erzeugt aus src/app/v3-basis.css + src/app/Verein_v3.html
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

/* Verein_v3.tpl – seitenspezifisch (C1). .visually-hidden und
   .zeile__untertitel sind hier definiert und nicht in v3-basis.css, weil
   Startseite_v3.tpl (B1) beide Klassen nicht verwendet (Regel: die Basis
   ist wörtlich aus Startseite_v3.tpl extrahiert, keine neuen Klassen). */

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

.zeile__titel,
.zeile__untertitel {
  display: block;
}

.zeile__untertitel {
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--ink-3);
  overflow-wrap: break-word;
}

.abteilungen-raster {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--sp-4);
}

@media (min-width: 360px) {
  .abteilungen-raster { grid-template-columns: 1fr 1fr; }
}

.abteilung-karte {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--sp-2);
  min-width: 0;
  text-decoration: none;
  color: inherit;
}

.abteilung-karte svg {
  width: 32px;
  height: 32px;
  color: var(--blau-700);
}

.abteilung-karte__titel {
  margin: 0;
  font-weight: 700;
  font-size: 16px;
  overflow-wrap: break-word;
}

.abteilung-karte__untertitel {
  margin: 0;
  font-size: 13px;
  color: var(--ink-3);
  overflow-wrap: break-word;
}
</style>
</head>
<body>
<main class="inhalt">

<h1 class="visually-hidden">Verein</h1>

<h2 class="abschnittstitel">Abteilungen</h2>
<div class="abteilungen-raster">
  <a class="karte abteilung-karte" href="nav://sportfreunde04_TextImage_1783343147611">
    <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 3 20 12 12 21 4 12z"/></svg>
    <p class="abteilung-karte__titel">Fußball</p>
    <p class="abteilung-karte__untertitel"><span id="anzahl-fussball">Mannschaften</span></p>
  </a>
  <a class="karte abteilung-karte" href="nav://sportfreunde04_TextImage_1780401660343">
    <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 3 20 12 12 21 4 12z"/></svg>
    <p class="abteilung-karte__titel">Karneval</p>
    <p class="abteilung-karte__untertitel">Die Schnauzer · <span id="anzahl-karneval">Gruppen</span></p>
  </a>
</div>

<h2 class="abschnittstitel">Der Verein</h2>
<div class="liste">
  <a class="zeile" href="nav://sportfreunde04_TextImage_1780401660340">
    <span class="zeile__text">
      <span class="zeile__titel">Vorstand &amp; Kontakt</span>
      <span class="zeile__untertitel">Wer den Verein führt, wen du erreichst</span>
    </span>
    <svg class="zeile__pfeil" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7"/></svg>
  </a>
  <a class="zeile" href="nav://sportfreunde04_TextImage_1780401660329">
    <span class="zeile__text">
      <span class="zeile__titel">Mitglied werden</span>
      <span class="zeile__untertitel">Beiträge, Ablauf, Antrag</span>
    </span>
    <svg class="zeile__pfeil" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7"/></svg>
  </a>
  <a class="zeile" href="nav://sportfreunde04_TextImage_1780401660337">
    <span class="zeile__text">
      <span class="zeile__titel">Sponsoren &amp; Partner</span>
      <span class="zeile__untertitel">Wer uns unterstützt</span>
    </span>
    <svg class="zeile__pfeil" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7"/></svg>
  </a>
  <a class="zeile" href="nav://sportfreunde04_Application_1783064196311">
    <span class="zeile__text">
      <span class="zeile__titel">Downloads &amp; Anträge</span>
      <span class="zeile__untertitel">Satzung, Beiträge, Bescheinigungen</span>
    </span>
    <svg class="zeile__pfeil" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7"/></svg>
  </a>
  <a class="zeile" href="nav://sportfreunde04_TextImage_1783345459688">
    <span class="zeile__text">
      <span class="zeile__titel">Spielplan &amp; Tabellen</span>
      <span class="zeile__untertitel">Alle Mannschaften auf einen Blick</span>
    </span>
    <svg class="zeile__pfeil" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7"/></svg>
  </a>
  <a class="zeile" href="nav://sportfreunde04_TextImage_1784295208452">
    <span class="zeile__text">
      <span class="zeile__titel">Über uns</span>
      <span class="zeile__untertitel">Seit 1904 im Gallus</span>
    </span>
    <svg class="zeile__pfeil" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7"/></svg>
  </a>
  <a class="zeile" href="nav://sportfreunde04_TextImage_1789020275334">
    <span class="zeile__text">
      <span class="zeile__titel">Vereinschronik</span>
      <span class="zeile__untertitel">1904 bis 2026, Kapitel für Kapitel</span>
    </span>
    <svg class="zeile__pfeil" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7"/></svg>
  </a>
  <a class="zeile" href="nav://sportfreunde04_TextImage_1780401660324">
    <span class="zeile__text">
      <span class="zeile__titel">Geschäftsstelle &amp; Anfahrt</span>
      <span class="zeile__untertitel">Adresse, Zugang, Kontakt</span>
    </span>
    <svg class="zeile__pfeil" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7"/></svg>
  </a>
</div>

<div class="aktionen">
  <a class="knopf" href="mailto:jugendleitung@sportfreunde04.de?subject=Probetraining%20beim%20FFV%20Sportfreunde%2004&amp;body=Hallo%2C%0A%0Awir%20interessieren%20uns%20f%C3%BCr%20ein%20Probetraining.%0AJahrgang%20des%20Kindes%3A%20%0AVorerfahrung%3A%20%0A%0AViele%20Gr%C3%BC%C3%9Fe">Probetraining vereinbaren</a>
</div>

<p class="fuss">F.F.V. Sportfreunde 04 · Vereins-App</p>

</main>

<script src="https://cdn.appack.de/modules/common/jquery-3.4.1.min.js"></script>
<script src="https://cdn.appack.de/modules/appack.workbook-1.4.1.js"></script>
<script>
(function () {
  "use strict";

  var UEBERSICHT_ID = "6a1ec5fcf68a05bf129cdb7a";

  function ladeWorkbook(id) {
    if (!window.Workbook || typeof Workbook.load !== "function") {
      return Promise.reject(new Error("Workbook-API fehlt"));
    }
    return Workbook.load({ workbook: id, filter: {}, offset: 0, limit: 5000, sort: "_id", direction: "asc" })
      .then(function (rows) { return Array.isArray(rows) ? rows : []; });
  }

  function zaehlungText(anzahl, einzahl, mehrzahl) {
    return String(anzahl) + " " + (anzahl === 1 ? einzahl : mehrzahl);
  }

  // Fußballschulen (externes, kostenpflichtiges Zusatzangebot) tragen im
  // Worksheet dieselbe Kategorie "fussball", zählen aber nicht als
  // Mannschaft (QA-Befund, C2 Abschnitt 7).
  function istFussballschule(team) {
    var t = String(team || "");
    return /^fu[ßs]{1,2}ballschule/i.test(t) || /academy/i.test(t) || /athletik/i.test(t);
  }

  ladeWorkbook(UEBERSICHT_ID)
    .then(function (zeilen) {
      var fussball = 0;
      var karneval = 0;
      for (var i = 0; i < zeilen.length; i++) {
        var z = zeilen[i] || {};
        if (z.isActive !== true) continue;
        var kategorie = String(z.category || "").toLowerCase();
        if (kategorie === "fussball") {
          if (!istFussballschule(z.team)) fussball++;
        } else if (kategorie === "karnevalabteilung") karneval++;
      }
      var fussballEl = document.getElementById("anzahl-fussball");
      if (fussballEl) fussballEl.textContent = zaehlungText(fussball, "Mannschaft", "Mannschaften");
      var karnevalEl = document.getElementById("anzahl-karneval");
      if (karnevalEl) karnevalEl.textContent = zaehlungText(karneval, "Gruppe", "Gruppen");
    })
    .catch(function () {
      // Kein Treffer/Fehler: die statischen Texte aus dem Markup
      // ("Mannschaften" / "Gruppen") bleiben stehen.
    });
})();
</script>
</body>
</html>
