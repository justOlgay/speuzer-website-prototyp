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
/* Speuzer Blau-Weiß – Startseite_v3.tpl (B1), „Website-Bühne“ (24.09.2026,
   Wunsch der 1. Vorsitzenden: clean und stilvoll, „ggf. so wie auf der
   Webseite“). appack-Vorlage fuer die Seite "Start" (Datenquelle "Start" im
   CMS). Kopfleiste und Menü (Navigationsstil "Sidebar") kommen von der
   App-Hülle und sind NICHT Teil dieser Vorlage – kein eigenes Menü, keine
   Tab-Leiste, keine Fußzeile. Aufbau: oben eine ruhige Bühne in Vereinsblau
   wie die Website-Startseite (Wappen als Wasserzeichen, Satz „Fußball im
   Gallus – seit 1904.“), darin klein die Begrüßung; darunter auf hellem
   Grund je höchstens ein Termin, eine Meldung, der Parkplatzhinweis und
   zwei Handlungen. Farben/Schrift aus assets/css/tokens.css. Kein Rot,
   kein Grün, kein dekoratives Grau. */

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
  --sp-7: 48px;

  --r-md: 12px;
  --r-lg: 16px;
  --r-pill: 999px;

  --sh-1: 0 1px 2px rgba(11, 14, 74, .06), 0 1px 1px rgba(11, 14, 74, .04);

  /* Seitenrand: 16px bei 320, wächst bis 24px */
  --rand: clamp(16px, 5vw, 24px);
  /* Übergang Bühne → heller Grund */
  --blatt-radius: 24px;
}

/* === 3. Grundregeln === */

*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }

body {
  background: var(--bg);
  color: var(--ink);
  font-family: var(--font-text);
  font-size: 15px;
  line-height: 1.45;
  -webkit-font-smoothing: antialiased;
  -webkit-tap-highlight-color: transparent;
  overflow-x: hidden;
}

a { color: inherit; }
p { margin: 0; }
svg { display: block; flex: 0 0 auto; }

/* [hidden] muss auch gegen die eigenen display:flex/inline-flex-Regeln unten
   gewinnen (Profil-Knopf/Registrieren-Pille, Schritt 1.1). */
[hidden] { display: none !important; }

:focus-visible {
  outline: 3px solid var(--blau-500);
  outline-offset: 2px;
}

/* nur für Bildschirmleser */
.vh {
  position: absolute !important;
  width: 1px; height: 1px;
  margin: -1px; padding: 0; border: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.rahmen {
  max-width: 600px;
  margin-inline: auto;
}

/* === 4. Bühne (wie die Website-Startseite) === */

/* Oben beginnt die Bühne exakt im Blau der nativen Kopfleiste
   (--appack-color-main #191793), damit Kopfleiste und Bühne eine Fläche
   bilden; nach unten dunkelt sie wie das Startbild der Website ab. */
.buehne {
  position: relative;
  overflow: hidden;
  isolation: isolate;
  color: var(--weiss);
  background: linear-gradient(180deg, var(--blau-800) 0%, #13137A 50%, #0E0F5E 100%);
  padding: var(--sp-2) var(--rand) calc(clamp(32px, 6.5vh, 52px) + var(--blatt-radius));
}

/* Wappen als Wasserzeichen: weiße Silhouette, sehr zurückgenommen,
   angeschnitten am rechten Rand (wie auf der Website). Ein radialer
   Ausblend-Rahmen (mask-image) verhindert, dass die rechteckige Bildkante
   sichtbar wird, wenn die Bühne breiter ist als das Motiv (z. B. Tablet). */
.buehne::after {
  content: "";
  position: absolute;
  z-index: -1;
  width: clamp(460px, 140vw, 640px);
  height: clamp(460px, 140vw, 640px);
  left: 58%;
  top: calc(50% - var(--blatt-radius) / 2);
  transform: translateY(-50%);
  background: url("https://justolgay.github.io/speuzer-website-prototyp/assets/huelle/wappen-512.png") center / contain no-repeat;
  opacity: .1;
  -webkit-mask-image: radial-gradient(closest-side, rgba(0, 0, 0, 1) 58%, rgba(0, 0, 0, 0) 100%);
  mask-image: radial-gradient(closest-side, rgba(0, 0, 0, 1) 58%, rgba(0, 0, 0, 0) 100%);
  pointer-events: none;
}

.gruss-zeile {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
  min-height: 44px;
}

.gruss {
  margin: 0;
  font-family: var(--font-text);
  font-weight: 600;
  font-size: 16px;
  line-height: 1.3;
  letter-spacing: .005em;
  color: var(--weiss);
  overflow-wrap: anywhere;
}

.profil-knopf {
  flex: 0 0 auto;
  width: 44px;
  height: 44px;
  margin-right: -4px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  color: var(--weiss);
  border-radius: var(--r-pill);
}

.profil-knopf__kreis {
  width: 36px;
  height: 36px;
  border-radius: var(--r-pill);
  border: 1.5px solid rgba(255, 255, 255, .45);
  display: flex;
  align-items: center;
  justify-content: center;
}

.profil-knopf__kreis svg { width: 19px; height: 19px; }

/* Wird von der Vorlage nie eingeblendet (siehe profilKnopfUmschalten),
   bleibt aber als Element erhalten. */
.registrieren-pille {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding-inline: var(--sp-4);
  border-radius: var(--r-pill);
  background: var(--weiss);
  color: var(--blau-800);
  font-weight: 600;
  font-size: 14px;
  text-decoration: none;
}

.buehne__satz {
  margin-top: clamp(28px, 7vh, 64px);
}

.buehne__strich {
  display: block;
  width: 40px;
  height: 3px;
  border-radius: 2px;
  background: var(--weiss);
  margin-bottom: var(--sp-4);
}

.buehne__claim {
  margin: 0;
  font-family: var(--font-head);
  font-weight: 700;
  font-size: clamp(40px, 12.4vw, 60px);
  line-height: .98;
  letter-spacing: .01em;
  text-transform: uppercase;
  color: var(--weiss);
}

.buehne__claim span { display: block; }

/* Auf niedrigen Bildschirmen (kleine Telefone, Querformat) die Bühne
   straffen, damit Termin, Meldung und Parkplatz näher an die Falz rücken
   (Rückmeldung der Jury zu Entwurf A). Zwei Stufen: ab 900px Bauhöhe leicht
   enger, ab 620px (z. B. 320×568) deutlich enger. Die Begrüßungszeile
   bleibt bei 44px Mindesthöhe (Tippziel Profil-Knopf). */
@media (max-height: 900px) {
  .buehne { padding-bottom: calc(24px + var(--blatt-radius)); }
  .buehne__satz { margin-top: clamp(18px, 5vh, 40px); }
  .buehne__claim { font-size: clamp(34px, 11vw, 50px); }
}

@media (max-height: 620px) {
  .buehne { padding-bottom: calc(16px + var(--blatt-radius)); }
  .buehne__satz { margin-top: 14px; }
  .buehne__claim { font-size: 30px; }
}

/* === 5. Heller Grund („Blatt“) === */

.blatt {
  position: relative;
  z-index: 1;
  margin-top: calc(-1 * var(--blatt-radius));
  border-radius: var(--blatt-radius) var(--blatt-radius) 0 0;
  background: var(--bg);
  padding: var(--sp-3) var(--rand) calc(24px + env(safe-area-inset-bottom));
}

.abschnitt + .abschnitt,
.abschnitt + .hinweis-karte,
.hinweis-karte + .abschnitt,
.hinweis-karte + .aktionen {
  margin-top: var(--sp-5);
}

.kopf {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
  min-height: 44px;
  margin-bottom: var(--sp-1);
}

.kopf__titel {
  margin: 0;
  font-family: var(--font-head);
  font-weight: 700;
  font-size: 16px;
  line-height: 1.1;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--ink-2);
}

.kopf__link {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  min-height: 44px;
  padding-left: var(--sp-3);
  margin-right: -6px;
  color: var(--blau-700);
  font-weight: 600;
  font-size: 14px;
  text-decoration: none;
}

.kopf__link svg { width: 18px; height: 18px; }

/* === 6. Karten (Termin, Meldung, Gast-Einstieg) === */

.karte {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 64px;
  padding: 14px 12px 14px var(--sp-4);
  background: var(--surface);
  border-radius: var(--r-lg);
  box-shadow: var(--sh-1);
  color: var(--ink);
  text-decoration: none;
  transition: background-color 120ms ease-out;
}

a.karte:active,
.news-karte:active { background: var(--blau-50); }

.karte__text {
  flex: 1 1 auto;
  min-width: 0;
}

.pfeil {
  width: 20px;
  height: 20px;
  color: var(--ink-3);
}

/* Termin */

.termin-karte { gap: var(--sp-3); }

.ohne-umbruch { white-space: nowrap; }

.datum {
  flex: 0 0 auto;
  width: 46px;
  padding-right: var(--sp-3);
  border-right: 1px solid var(--line);
  text-align: center;
}

.datum__tag {
  display: block;
  font-family: var(--font-head);
  font-weight: 700;
  font-size: 30px;
  line-height: 1;
  color: var(--blau-950);
}

.datum__monat {
  display: block;
  margin-top: 3px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .06em;
  text-transform: uppercase;
  color: var(--ink-3);
}

.termin__art {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .07em;
  text-transform: uppercase;
  color: var(--blau-700);
  margin-bottom: 2px;
}

.karte__titel {
  font-weight: 600;
  font-size: 16px;
  line-height: 1.3;
  color: var(--ink);
  overflow-wrap: anywhere;
}

.karte__zeile {
  margin-top: 2px;
  font-size: 14px;
  color: var(--ink-2);
}

/* Kleiner Titel vor einem leisen Satz (Gast-Karten, Leerzustand Termine):
   gibt der Karte mehr Gewicht als ein einzelner Satz (Jury-Empfehlung aus
   Entwurf B: „Deine Termine“ / „Neues aus dem Verein“ / „Nichts geplant“). */
.karte__minititel {
  font-weight: 600;
  font-size: 15px;
  line-height: 1.3;
  color: var(--ink);
  margin-bottom: 2px;
}

.karte__leise {
  font-size: 14px;
  color: var(--ink-2);
  text-wrap: pretty;
}

.karte__aufforderung {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-top: 6px;
  font-weight: 600;
  font-size: 14px;
  color: var(--blau-700);
}

.karte__aufforderung svg { width: 16px; height: 16px; }

/* Platzhalter, solange Termine/Meldungen laden (ruhig, ohne Animation) */
.platzhalter-balken {
  display: block;
  height: 12px;
  border-radius: 6px;
  background: var(--blau-50);
}

.platzhalter-balken + .platzhalter-balken { margin-top: 10px; }

/* Meldung (Vorlage für das News-Widget; das Widget klont .card.mb-3.relative
   und legt den Klick auf die ganze Karte) */
.news-karte { cursor: pointer; }

.termin-karte .karte__titel,
.news-karte .news-karte__titel {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.news-karte__datum {
  margin-top: 2px;
  font-size: 13px;
  color: var(--ink-3);
}

/* leere Vorlage vor dem Laden: zwei ruhige Balken statt einer leeren Karte */
.news-karte .newsWallTitle:empty::before,
.news-karte .newsWallDate:empty::before {
  content: "";
  display: block;
  height: 12px;
  border-radius: 6px;
  background: var(--blau-50);
}

.news-karte .newsWallTitle:empty::before { width: 72%; margin: 4px 0 6px; }
.news-karte .newsWallDate:empty::before { width: 32%; }

/* Leerzustand/Fehlerfall der Meldungen: siehe pruefeMeldungen() im Skript
   (Karte im gleichen Aufbau wie „Nichts geplant“ bei den Terminen). */

/* === 7. Parkplatzhinweis === */

/* HINWEIS-Baustein: im CMS-Quelltext pflegen oder samt <aside> entfernen.
   Getönte Fläche mit umrandetem "P" statt vollflächigem Schild (Jury-
   Empfehlung aus Entwurf C: ruhiger als die kräftigste Farbfläche der
   Seite). Eigene Gültigkeitszeile, damit sie leicht zu pflegen ist. */
.hinweis-karte {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: var(--sp-4);
  background: var(--blau-50);
  border: 1px solid var(--blau-100);
  border-radius: var(--r-lg);
}

.p-schild {
  flex: 0 0 auto;
  width: 34px;
  height: 34px;
  border: 2px solid var(--blau-700);
  border-radius: 8px;
  background: transparent;
  color: var(--blau-700);
  font-family: var(--font-head);
  font-weight: 700;
  font-size: 20px;
  line-height: 30px;
  text-align: center;
}

.hinweis__titel {
  font-weight: 600;
  font-size: 15px;
  line-height: 1.3;
  color: var(--blau-950);
  text-wrap: balance;
}

.hinweis__text {
  margin-top: 3px;
  font-size: 14px;
  line-height: 1.45;
  color: var(--ink-2);
  text-wrap: pretty;
}

.hinweis__gueltig {
  display: flex;
  align-items: flex-start;
  gap: 5px;
  margin-top: 6px;
  font-size: 13px;
  color: var(--ink-3);
}

.hinweis__gueltig svg { flex: 0 0 auto; width: 15px; height: 15px; margin-top: 1px; }

/* === 8. Handlungen === */

.aktionen {
  display: grid;
  gap: 10px;
  margin-top: var(--sp-5);
}

.knopf {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  padding: 12px 20px;
  line-height: 1.3;
  text-align: center;
  border-radius: var(--r-md);
  background: var(--blau-700);
  color: var(--weiss);
  font-weight: 600;
  font-size: 15px;
  text-decoration: none;
  border: 1px solid var(--blau-700);
  cursor: pointer;
  transition: background-color 120ms ease-out;
}

.knopf:active { background: var(--blau-800); }

.knopf--leise {
  background: var(--surface);
  border-color: var(--line);
  color: var(--blau-800);
}

.knopf--leise:active { background: var(--blau-50); }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    transition: none !important;
    animation: none !important;
    scroll-behavior: auto !important;
  }
}
</style>
</head>
<body>
<script>window.profileJSON = [#if profile_json?has_content]${profile_json}[#else]{}[/#if];</script>
<main class="inhalt">

<section class="buehne">
  <div class="rahmen">
    <div class="gruss-zeile">
      <h1 id="gruss" class="gruss">Guten Tag!</h1>
      <a id="profil-knopf" class="profil-knopf" href="nav://sportfreunde04_Profile_1783059427823" aria-label="Profil">
        <span class="profil-knopf__kreis"><svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c0-4.1 3.4-6.5 7.5-6.5s7.5 2.4 7.5 6.5"/></svg></span>
      </a>
      <a id="registrieren-pille" class="registrieren-pille" href="nav://sportfreunde04_Profile_1783059427823" hidden>Registrieren</a>
    </div>
    <div class="buehne__satz">
      <span class="buehne__strich" aria-hidden="true"></span>
      <p class="buehne__claim"><span>Fußball</span> <span>im Gallus</span> <span>– seit 1904.</span></p>
    </div>
  </div>
</section>

<div class="blatt">
  <div class="rahmen">

    <section class="abschnitt" aria-labelledby="titel-naechstes">
      <div class="kopf">
        <h2 id="titel-naechstes" class="kopf__titel">Als Nächstes</h2>
        <a id="termine-kopflink" class="kopf__link" href="nav://sportfreunde04_Application_1780401660369">Alle Termine<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 6l6 6-6 6"/></svg></a>
      </div>
      <!-- Zu-/Absage passiert im Kalendermodul; die Vorlage kann sie nicht selbst auslösen. -->
      <div id="termine" class="termine">
        <div class="karte" aria-busy="true">
          <div class="karte__text">
            <span class="platzhalter-balken" style="width:68%"></span>
            <span class="platzhalter-balken" style="width:44%"></span>
            <span class="vh">Termine werden geladen</span>
          </div>
        </div>
      </div>
    </section>

    <section class="abschnitt" aria-labelledby="titel-aktuelles">
      <div class="kopf">
        <h2 id="titel-aktuelles" class="kopf__titel">Aktuelles</h2>
        <a id="meldungen-kopflink" class="kopf__link" href="nav://sportfreunde04_Application_1780401660371">Alle Meldungen<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 6l6 6-6 6"/></svg></a>
      </div>
      <div
        class="news aktuelles"
        applicationId="sportfreunde04_Application_1780401660371"
        limit="1"
        sourceTag="false"
        maxBodyLength="90"
        news-widget>
        <div class="card mb-3 relative karte news-karte">
          <div class="karte__text">
            <div class="newsWallTitle karte__titel news-karte__titel"></div>
            <div class="newsWallDate news-karte__datum"></div>
          </div>
        </div>
      </div>
    </section>

    <!-- HINWEIS: im CMS-Quelltext pflegen oder samt <aside> entfernen -->
    <aside class="hinweis-karte" aria-label="Hinweis">
      <span class="p-schild" aria-hidden="true">P</span>
      <div>
        <p class="hinweis__titel">Parkplatz wegen Neubau gesperrt</p>
        <p class="hinweis__text">Zugang über den Hintereingang am „Haus der Jugend“ (Pavillon).</p>
        <p class="hinweis__gueltig"><svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg><span>Voraussichtlich bis Ende&nbsp;Januar&nbsp;2027</span></p>
      </div>
    </aside>

    <div class="aktionen">
      <a class="knopf" href="mailto:jugendleitung@sportfreunde04.de?subject=Probetraining%20beim%20FFV%20Sportfreunde%2004&amp;body=Hallo%2C%0A%0Awir%20interessieren%20uns%20f%C3%BCr%20ein%20Probetraining.%0AJahrgang%20des%20Kindes%3A%20%0AVorerfahrung%3A%20%0A%0AViele%20Gr%C3%BC%C3%9Fe">Probetraining vereinbaren</a>
      <!-- Ziel "Mitglied werden": erste passende Kachel aus der Liste der heutigen Startseite (sportfreunde04_List_1784632554073) -->
      [#assign mitgliedHref = ""]
      [#list db.loadList('sportfreunde04_List_1784632554073').entries as entry][#if entry.title?has_content && entry.title == "Mitglied werden"][#assign mitgliedHref][#if entry.contentUrl?has_content]${entry.contentUrl}[#elseif entry.componentLink?has_content]nav://${entry.componentLink}[/#if][/#assign][/#if][/#list]
      <a class="knopf knopf--leise" href="[#if mitgliedHref?has_content]${mitgliedHref}[#else]#[/#if]">Mitglied werden</a>
      [#if !mitgliedHref?has_content]<!-- kein Treffer für "Mitglied werden" in der Kachel-Liste: Ziel bleibt "#" -->[/#if]
    </div>

  </div>
</div>
</main>

<script src="https://cdn.appack.de/modules/common/jquery-3.4.1.min.js"></script>
<script src="https://cdn.appack.de/modules/graph-api.js"></script>
<script src="https://cdn.appack.de/modules/widgets/component-news-widget.js"></script>
<script>
(function () {
  "use strict";

  var KALENDER_ID = "sportfreunde04_Application_1780401660369";
  var NEWS_ID = "sportfreunde04_Application_1780401660371";
  var PROFIL_ID = "sportfreunde04_Profile_1783059427823";
  var MONATE = ["JAN", "FEB", "MÄR", "APR", "MAI", "JUN", "JUL", "AUG", "SEP", "OKT", "NOV", "DEZ"];
  var PFEIL_SVG = '<svg class="pfeil" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 6l6 6-6 6"/></svg>';
  var PFEIL_KLEIN_SVG = '<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 6l6 6-6 6"/></svg>';

  // ---------- Begrüßung ----------

  // Ob ein Gast (ohne profileJSON.id) unterwegs ist: einmal zentral
  // bestimmen, damit Termine/Aktuelles denselben Gast-Fall behandeln
  // (QA-Befund, C2 Abschnitt 7 – keine graphql-Aufrufe/401 für Gäste).
  function istAngemeldet() {
    var profil = window.profileJSON || {};
    return !!profil.id;
  }

  function begruessung() {
    var el = document.getElementById("gruss");
    if (!el) return;
    var stunde = new Date().getHours();
    var gruss = stunde < 11 ? "Guten Morgen" : (stunde < 18 ? "Guten Tag" : "Guten Abend");
    var profil = window.profileJSON || {};
    var name = profil.firstname ? (", " + profil.firstname) : "";
    el.textContent = gruss + name + "!";
  }

  // ---------- Profil / Registrieren ----------

  function profilKnopfUmschalten() {
    var angemeldet = istAngemeldet();
    var profilKnopf = document.getElementById("profil-knopf");
    var registrieren = document.getElementById("registrieren-pille");
    // Gast: oben kein Profil-Knopf und keine Registrieren-Pille – einziger
    // Einstieg ist "Anmelden" unter "Als Nächstes" (QA W8, Abschnitt 8).
    if (!angemeldet) {
      if (profilKnopf) profilKnopf.hidden = true;
      if (registrieren) registrieren.hidden = true;
    }
  }

  // ---------- Termine ----------

  function zweistellig(zahl) {
    return (zahl < 10 ? "0" : "") + zahl;
  }

  function uhrzeit(datum) {
    return zweistellig(datum.getHours()) + ":" + zweistellig(datum.getMinutes());
  }

  // Vollständige Zeile (Wochentag, Datum, Uhrzeit) – für Bildschirmleser.
  function terminZeile(termin) {
    var start = new Date(termin.dateStart);
    var wochentag = new Intl.DateTimeFormat("de-DE", { weekday: "long" }).format(start);
    var datumText = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(start);
    if (termin.allDay) {
      return wochentag + ", " + datumText + " · ganztags";
    }
    var zeit = uhrzeit(start);
    if (termin.dateEnd) {
      zeit += "–" + uhrzeit(new Date(termin.dateEnd));
    }
    return wochentag + ", " + datumText + " · " + zeit + " Uhr";
  }

  // Sichtbare Kurzzeile: "Heute · 17:30–19:30 Uhr", "Morgen · …" oder der
  // Wochentag – das Datum selbst steht schon im Datumsblock.
  function tagesWort(start, kurzform) {
    var heute = new Date();
    heute.setHours(0, 0, 0, 0);
    var tag = new Date(start.getTime());
    tag.setHours(0, 0, 0, 0);
    var abstand = Math.round((tag.getTime() - heute.getTime()) / 86400000);
    if (abstand === 0) return "Heute";
    if (abstand === 1) return "Morgen";
    return new Intl.DateTimeFormat("de-DE", { weekday: kurzform ? "short" : "long" }).format(start);
  }

  // [Tag, " · Zeit"] – der Trennpunkt steht zusammen mit der Uhrzeit in
  // einem Block, der nie umbricht: so kann nie nur "Mittwoch ·" mit
  // hängendem Punkt am Zeilenende stehen (bei 320 px), sondern bricht bei
  // Bedarf der ganze " · Zeit"-Block in die nächste Zeile.
  function terminKurz(termin) {
    var start = new Date(termin.dateStart);
    if (termin.allDay) return [tagesWort(start), "ganztags"];
    var zeit = uhrzeit(start);
    if (termin.dateEnd) zeit += "–" + uhrzeit(new Date(termin.dateEnd));
    return [tagesWort(start), zeit + " Uhr"];
  }

  // Derzeit ungenutzt (siehe Termin-Karte): App.navigate öffnete im Test nichts.
  function oeffneTermin(id) {
    if (window.App) {
      if (App.isNativeAndroid && App.isNativeAndroid()) {
        App.navigate(KALENDER_ID, JSON.stringify({ event: id }), "Application");
      } else {
        App.navigate(KALENDER_ID, { event: id });
      }
    } else {
      window.location.href = "nav://" + KALENDER_ID;
    }
  }

  function element(tag, klasse, text) {
    var el = document.createElement(tag);
    if (klasse) el.className = klasse;
    if (text !== undefined) el.textContent = text;
    return el;
  }

  // Die ganze Karte ist der Link ins Kalendermodul (vorher ein eigener
  // "Details"-Knopf). Test in der echten App (21.09.2026): App.navigate(...)
  // aus einem Skript öffnete nichts, ein nav://-Link dagegen zuverlässig;
  // der Termin steht dort als nächster Eintrag. Zu-/Absage bewusst nicht
  // auf der Startseite (Entscheidung 21.09.2026).
  function baueTerminKarte(termin) {
    var start = new Date(termin.dateStart);
    var kategorie = (termin.categories && termin.categories.length && termin.categories[0].title) || "Termin";

    var karte = element("a", "karte termin-karte");
    karte.href = "nav://" + KALENDER_ID;
    karte.setAttribute("data-termin", termin.id || "");

    var datum = element("div", "datum");
    datum.setAttribute("aria-hidden", "true");
    datum.appendChild(element("span", "datum__tag", zweistellig(start.getDate())));
    datum.appendChild(element("span", "datum__monat", MONATE[start.getMonth()]));

    var text = element("div", "karte__text");
    text.appendChild(element("p", "termin__art", kategorie));
    text.appendChild(element("p", "karte__titel", termin.title || ""));
    var teile = terminKurz(termin);
    var kurz = element("p", "karte__zeile", teile[0]);
    kurz.setAttribute("data-kurzform", tagesWort(start, true));
    kurz.appendChild(element("span", "ohne-umbruch", " · " + teile[1]));
    kurz.setAttribute("aria-hidden", "true");
    text.appendChild(kurz);
    text.appendChild(element("span", "vh", terminZeile(termin)));

    karte.appendChild(datum);
    karte.appendChild(text);
    karte.insertAdjacentHTML("beforeend", PFEIL_SVG);
    return karte;
  }

  // Gast (nicht angemeldet): keine Kalender vorhanden, also kein
  // graphApi-Aufruf (der ohne Anmeldung mit HTTP 401 scheitert) – stattdessen
  // ein kleiner Titel plus dezenter Satz (Jury-Empfehlung aus Entwurf B), die
  // ganze Karte führt zur Anmeldung (Profil-Link wie bisher; einziger
  // Anmelde-Einstieg der Seite). Der gleichlautende Kopflink "Alle Termine"
  // wird für Gäste ausgeblendet, damit er nicht doppelt steht.
  function zeigeTermineHinweisGast() {
    var container = document.getElementById("termine");
    if (!container) return;
    container.innerHTML = "";
    var karte = element("a", "karte gast-karte");
    karte.href = "nav://" + PROFIL_ID;
    var text = element("div", "karte__text");
    text.appendChild(element("p", "karte__minititel", "Deine Termine"));
    text.appendChild(element("p", "karte__leise", "Nach der Anmeldung steht hier dein nächster Termin."));
    var auff = element("span", "karte__aufforderung", "Anmelden");
    auff.insertAdjacentHTML("beforeend", PFEIL_KLEIN_SVG);
    text.appendChild(auff);
    karte.appendChild(text);
    container.appendChild(karte);
    var kopflink = document.getElementById("termine-kopflink");
    if (kopflink) kopflink.hidden = true;
  }

  // Bricht "Mittwoch · 17:30–19:30 Uhr" um (z. B. bei 320 px), steht dort
  // stattdessen "Mi. · 17:30–19:30 Uhr" – kein Punkt am Zeilenende.
  function kuerzeWochentag(container) {
    var zeile = container.querySelector(".karte__zeile[data-kurzform]");
    if (!zeile || !zeile.firstChild) return;
    var zeilenhoehe = parseFloat(window.getComputedStyle(zeile).lineHeight) || 20;
    if (zeile.offsetHeight > zeilenhoehe * 1.5) {
      zeile.firstChild.nodeValue = zeile.getAttribute("data-kurzform");
    }
  }

  function zeigeTermine(termine) {
    var container = document.getElementById("termine");
    if (!container) return;
    container.innerHTML = "";
    if (!termine || !termine.length) {
      var leer = element("div", "karte termine-leer");
      var text = element("div", "karte__text");
      text.appendChild(element("p", "karte__minititel", "Nichts geplant"));
      text.appendChild(element("p", "karte__leise", "In deinen Kalendern stehen gerade keine Termine an."));
      leer.appendChild(text);
      container.appendChild(leer);
      return;
    }
    // Höchstens EIN Termin auf der Startseite; alle weiteren über "Alle Termine".
    container.appendChild(baueTerminKarte(termine[0]));
    kuerzeWochentag(container);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { kuerzeWochentag(container); });
    }
  }

  function ladeTermine() {
    if (!istAngemeldet()) {
      // Gast ohne eigene Kalender: kein graphApi-Aufruf (401), stattdessen
      // Hinweis + Anmelden.
      zeigeTermineHinweisGast();
      return;
    }
    if (!window.graphApi) {
      zeigeTermine([]);
      return;
    }
    graphApi.calendar
      .listUpcomingCalendarEvents(KALENDER_ID, 3, ["id", "title", "dateStart", "subTitle", "dateEnd", "allDay", "categories{title, color}"])
      .then(function (r) { return r.json(); })
      .then(function (antwort) {
        var termine = (antwort && antwort.data && antwort.data.listUpcomingCalendarEvents) || [];
        zeigeTermine(termine);
      })
      .catch(function () { zeigeTermine([]); });
  }

  // ---------- Aktuelles (News-Widget) ----------

  // Gast ohne Anmeldung: das News-Widget-Skript ruft beim Start selbst eine
  // graphql-API auf, die ohne Anmeldung 401 liefert (leere Karte,
  // Skript-Fehler). Den Widget-Container deshalb vor dem
  // DOMContentLoaded-Lauf von component-news-widget.js entfernen. An seine
  // Stelle tritt eine Karte mit kleinem Titel (Jury-Empfehlung aus Entwurf
  // B: „Neues aus dem Verein“) plus "Alle Meldungen"-Aufforderung, damit der
  // Abschnitt nicht leer wirkt; der gleichlautende Link im Abschnittskopf
  // wird für Gäste ausgeblendet, damit er nicht doppelt steht.
  function entferneNewsWidgetFuerGast() {
    if (istAngemeldet()) return;
    var widget = document.querySelector(".news.aktuelles[news-widget]");
    if (!widget || !widget.parentNode) return;
    var karte = element("a", "karte gast-karte");
    karte.href = "nav://" + NEWS_ID;
    var text = element("div", "karte__text");
    text.appendChild(element("p", "karte__minititel", "Neues aus dem Verein"));
    text.appendChild(element("p", "karte__leise", "Berichte und Neuigkeiten aus dem Vereinsleben."));
    var auff = element("span", "karte__aufforderung", "Alle Meldungen");
    auff.insertAdjacentHTML("beforeend", PFEIL_KLEIN_SVG);
    text.appendChild(auff);
    karte.appendChild(text);
    widget.parentNode.replaceChild(karte, widget);
    var kopflink = document.getElementById("meldungen-kopflink");
    if (kopflink) kopflink.hidden = true;
  }

  // Angemeldet: Kommt vom News-Widget nach kurzer Zeit keine Meldung (keine
  // Treffer, abgelaufene Anmeldung, offline), stehen statt der Lade-Balken
  // ein ruhiger Leerzustand in derselben Kartenform wie bei den Terminen.
  function pruefeMeldungen(versuch) {
    var widget = document.querySelector(".news.aktuelles[news-widget]");
    if (!widget) return;
    var gefuellt = [].some.call(widget.querySelectorAll(".newsWallTitle"), function (t) { return t.textContent.trim() !== ""; });
    if (gefuellt) return;
    if (versuch < 8) { setTimeout(function () { pruefeMeldungen(versuch + 1); }, 1000); return; }
    var leer = element("div", "karte termine-leer");
    var text = element("div", "karte__text");
    text.appendChild(element("p", "karte__minititel", "Keine neuen Meldungen"));
    text.appendChild(element("p", "karte__leise", "Ältere Berichte findest du unter „Alle Meldungen“."));
    leer.appendChild(text);
    widget.parentNode.replaceChild(leer, widget);
  }

  begruessung();
  profilKnopfUmschalten();
  ladeTermine();
  entferneNewsWidgetFuerGast();
  if (istAngemeldet()) pruefeMeldungen(0);
})();
</script>
</body>
</html>
