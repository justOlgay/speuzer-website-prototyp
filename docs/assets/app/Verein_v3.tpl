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

/* Verein_v3.tpl – seitenspezifisch (C1). Gliederung/Reihenfolge seit W8 an
   die Website angeglichen (Zwischenüberschriften "Über den Verein",
   "Kontakt", "Mitmachen", "Service" – die Website selbst zeigt diese vier
   Gruppen seit einem eigenen Umbau nicht mehr als Überschriften, siehe
   W8-Spezifikation Abschnitt 6; die App behält sie zur Übersicht bei den
   Zeilen). Die Abteilungskacheln Fußball/Karneval sind seit 25.09.2026
   entfallen (eigene Menüpunkte, wie auf der Website). .visually-hidden und .zeile__untertitel
   sind hier definiert und nicht in v3-basis.css, weil Startseite_v3.tpl
   (B1) beide Klassen nicht verwendet. */

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
</style>
</head>
<body>
<main class="inhalt">

<h1 class="visually-hidden">Verein</h1>

<p class="seitenkopf-lead">Frankfurter Fußballverein Sportfreunde 1904&nbsp;e.&nbsp;V.&nbsp;– im Gallus sagt man einfach „die Speuzer“.</p>

<!-- 25.09.2026: Abteilungskarten Fußball/Karneval entfallen auch in der App –
     beide sind seit 24.09. eigene Menüpunkte (wie auf der Website, dort
     seit W7 ohne Karten, Entscheidung Olgay 23.09.2026). -->
<h2 class="abschnittstitel">Über den Verein</h2>
<div class="liste">
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
</div>

<h2 class="abschnittstitel">Kontakt</h2>
<div class="liste">
  <a class="zeile" href="nav://sportfreunde04_TextImage_1780401660340">
    <span class="zeile__text">
      <span class="zeile__titel">Vorstand</span>
      <span class="zeile__untertitel">Wer den Verein führt</span>
    </span>
    <svg class="zeile__pfeil" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7"/></svg>
  </a>
  <a class="zeile" href="nav://sportfreunde04_TextImage_1780401660324">
    <span class="zeile__text">
      <span class="zeile__titel">Kontakt &amp; Anfahrt</span>
      <span class="zeile__untertitel">Adresse, E-Mail, Anfahrt</span>
    </span>
    <svg class="zeile__pfeil" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7"/></svg>
  </a>
</div>

<h2 class="abschnittstitel">Mitmachen</h2>
<div class="liste">
  <a class="zeile" href="nav://sportfreunde04_TextImage_1780401660329">
    <span class="zeile__text">
      <span class="zeile__titel">Mitglied werden</span>
      <span class="zeile__untertitel">Beiträge, Ablauf, Antrag</span>
    </span>
    <svg class="zeile__pfeil" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7"/></svg>
  </a>
  <!-- Kein App-Modul (W8, Befund 6): normaler Link auf die Website-Seite,
       Verhalten innerhalb der App (appack öffnet externe Adressen ggf. im
       Systembrowser statt im Rahmen) noch nicht geprüft. -->
  <a class="zeile" href="https://cdn.appack.de/sportfreunde04/workspace/web/verein-mach-mit.html">
    <span class="zeile__text">
      <span class="zeile__titel">Mach mit &amp; Ehrenamt</span>
      <span class="zeile__untertitel">Trainer, Betreuer, Vorstand, Helfer</span>
    </span>
    <svg class="zeile__pfeil" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7"/></svg>
  </a>
</div>

<h2 class="abschnittstitel">Service</h2>
<div class="liste">
  <a class="zeile" href="nav://sportfreunde04_Application_1783064196311">
    <span class="zeile__text">
      <span class="zeile__titel">Downloads &amp; Anträge</span>
      <span class="zeile__untertitel">Satzung, Beiträge, Anträge</span>
    </span>
    <svg class="zeile__pfeil" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7"/></svg>
  </a>
  <!-- 25.09.2026 (Wunsch der 1. Vorsitzenden): Mitgliedsbescheinigung und
       Schwarzes Brett wieder erreichbar (vorher nur über „Allgemeine Infos“,
       das nicht mehr im Menü steht); auf der Website an derselben Stelle. -->
  <a class="zeile" href="nav://sportfreunde04_TextImage_1788434136790">
    <span class="zeile__text">
      <span class="zeile__titel">Mitgliedsbescheinigung</span>
      <span class="zeile__untertitel">Per Formular anfordern</span>
    </span>
    <svg class="zeile__pfeil" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7"/></svg>
  </a>
  <a class="zeile" href="nav://sportfreunde04_Application_1780401660387">
    <span class="zeile__text">
      <span class="zeile__titel">Schwarzes Brett</span>
      <span class="zeile__untertitel">Aushänge, Fundsachen, Gesuche</span>
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
  <!-- Kein App-Modul (W8, Befund 6): normaler Link auf die Website-Seite,
       Verhalten innerhalb der App noch nicht geprüft. -->
  <a class="zeile" href="https://cdn.appack.de/sportfreunde04/workspace/web/shop.html">
    <span class="zeile__text">
      <span class="zeile__titel">Fanshop &amp; Teamshop</span>
      <span class="zeile__untertitel">Fanartikel und Teamausstattung</span>
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
// Seit 25.09.2026 ohne eigenes Skript (die Zählung für die Abteilungskarten
// ist mit den Karten entfallen); tpl-bauen erwartet einen <script>-Block.
</script>
</body>
</html>
