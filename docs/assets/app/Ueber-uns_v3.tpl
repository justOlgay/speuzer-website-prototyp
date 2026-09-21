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

/* Ueber-uns_v3.tpl – seitenspezifisch (C2). Statischer Inhalt (keine
   Workbook-Aufrufe): Text aus der heutigen Workspace-Seite "Über uns.html"
   und docs/ws/verein.html, Zahlen 11/
   5 werden von tools/app-optik/tpl-bauen.mjs zur
   Bauzeit aus data/verein.json bzw. data/karneval.json eingesetzt (kein
   appack-FreeMarker-Ausdruck an dieser Stelle, siehe Kopfkommentar von
   tpl-bauen.mjs). */

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

.abschnittstitel + .karte { margin-top: 0; }

.ueber-uns-titel {
  margin: 0 0 var(--sp-2);
  font-family: var(--font-head);
  font-weight: 700;
  font-size: 26px;
  text-transform: uppercase;
  color: var(--blau-950);
}

.ueber-uns-lead {
  margin: 0;
  font-size: 15px;
  color: var(--ink-2);
}

.karte p { margin: 0 0 var(--sp-2); font-size: 14px; color: var(--ink-2); }
.karte p:last-child { margin-bottom: 0; }

.leitsatz {
  font-family: var(--font-head);
  font-weight: 700;
  font-size: 18px;
  text-transform: none;
  color: var(--blau-950);
  font-style: italic;
}

.zahlen-raster {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--sp-3);
  margin-bottom: var(--sp-3);
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
</style>
</head>
<body>
<main class="inhalt">

<h1 class="visually-hidden">Über uns</h1>

<div class="karte">
  <p class="ueber-uns-titel">Wer wir sind</p>
  <p class="ueber-uns-lead">Frankfurter Fußballverein Sportfreunde 1904 e.&nbsp;V. – im Gallus sagt man einfach „die Speuzer“.</p>
</div>

<h2 class="abschnittstitel">Gründung 1904</h2>
<div class="karte">
  <p>Gegründet wurde der Verein am 15. Mai 1904 als Frankfurter FC Britannia. Nach dem Ersten Weltkrieg erhielt er 1919 seinen heutigen Namen. Der sportliche Höhepunkt war die Saison 1955/56 in der 1. Amateurliga Hessen; seit den 1960er Jahren spielen die Sportfreunde in den Klassen des Fußballkreises Frankfurt.</p>
</div>

<h2 class="abschnittstitel">Die Speuzer heute</h2>
<div class="karte">
  <div class="zahlen-raster">
    <div class="zahl">
      <span class="zahl__wert">1904</span>
      <span class="zahl__label">gegründet</span>
    </div>
    <div class="zahl">
      <span class="zahl__wert">11</span>
      <span class="zahl__label">Mannschaften</span>
    </div>
    <div class="zahl">
      <span class="zahl__wert">5</span>
      <span class="zahl__label">Karnevalgruppen</span>
    </div>
  </div>
  <p>Heute stellt der Verein 11 Fußballmannschaften – von der 1. Herrenmannschaft bis zur G-Jugend – und die Karnevalabteilung „Die Schnauzer“ mit 5 Gruppen. Trainiert und gespielt wird auf dem eigenen Platz an der Mainzer Landstraße 480; die Herren tragen ihre Heimspiele auf der Anlage am Rebstock aus.</p>
</div>

<h2 class="abschnittstitel">Unsere Werte</h2>
<div class="karte">
  <p class="leitsatz">„Wir wollen nicht nur erfolgreiche Mannschaften entwickeln, sondern erfolgreiche Menschen und einen starken Verein für kommende Generationen.“</p>
  <p>Unsere Werte sind Gemeinschaft, Respekt, Wertschätzung, Verantwortung, Fairness, Entwicklung und Kinderschutz.</p>
</div>

<div class="liste">
  <a class="zeile" href="https://cdn.appack.de/sportfreunde04/pdf/Chronik%20Sportfreunde.pdf" target="_blank" rel="noopener">
    <span class="zeile__text"><span class="zeile__titel">Chronik (PDF)</span></span>
    <svg class="zeile__pfeil" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7"/></svg>
  </a>
  <a class="zeile" href="https://justolgay.github.io/speuzer-website-prototyp/assets/downloads/vereinsphilosophie-und-zukunftskonzept.pdf" target="_blank" rel="noopener">
    <span class="zeile__text"><span class="zeile__titel">Vereinsphilosophie (PDF)</span></span>
    <svg class="zeile__pfeil" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7"/></svg>
  </a>
  <a class="zeile" href="nav://sportfreunde04_Application_1783064196311">
    <span class="zeile__text"><span class="zeile__titel">Kinder- und Jugendschutz</span></span>
    <svg class="zeile__pfeil" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7"/></svg>
  </a>
</div>

<p class="fuss">F.F.V. Sportfreunde 04 · Vereins-App</p>

</main>

<script src="https://cdn.appack.de/modules/common/jquery-3.4.1.min.js"></script>
<script src="https://cdn.appack.de/modules/appack.workbook-1.4.1.js"></script>
<script>
// Ueber-uns_v3.tpl lädt keine Worksheets zur Laufzeit (statischer Inhalt,
// siehe C2-Spezifikation Abschnitt 4) – kein Skript nötig.
</script>
</body>
</html>
