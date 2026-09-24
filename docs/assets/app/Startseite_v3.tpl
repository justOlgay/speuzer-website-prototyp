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
   Gallus – seit 1904.“), darin klein die Begrüßung (Gäste: Pille
   „Anmelden“); am Fuß der Bühne die „Bande“ (Entwurf C, 24.09.2026): weiße
   Logo-Tafeln der Sponsoren laufen wie Bandenwerbung im Stadion durch
   (Wunsch der 1. Vorsitzenden: „Sponsorenbilder, die durchlaufen“; Daten
   aus dem Sponsoren-Worksheet, siehe Skript „Bande“). Darunter auf hellem
   Grund nur der Parkplatzhinweis und zwei Handlungen. „Als Nächstes“
   (Termin-Karte, Gast-Karte „Deine Termine“) und „Aktuelles“
   (News-Widget) sind entfallen (Entscheidung der Jugendleitung,
   24.09.2026). Farben/Schrift aus
   assets/css/tokens.css. Kein Rot, kein Grün, kein dekoratives Grau. */

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

  /* Bande: Logo-Höchstmaß NUR HIER pflegen. Das Skript liest
     --logo-max-hoehe und --logo-max-breite (logoMass()); Tafelhöhe und die
     von Anfang an reservierte Höhe der Bande ergeben sich daraus. */
  --logo-max-hoehe: 44px;
  --logo-max-breite: 150px;
  --tafel-luft: 8px;
  --tafel-hoehe: calc(var(--logo-max-hoehe) + 2 * var(--tafel-luft));
  --tafel-abstand: 10px;
  --schiene-luft: 9px;
  --bande-kopf: 20px;
  --bande-luft: 10px;
  /* Kopf + Luft + Schiene (Innenabstand oben/unten, Tafel, 2 × 1px Haarlinie) */
  --bande-hoehe: calc(var(--bande-kopf) + var(--bande-luft) + var(--tafel-hoehe) + 2 * var(--schiene-luft) + 2px);
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
   gewinnen (Profil-Knopf/Anmelden-Pille, Bande). */
[hidden] { display: none !important; }

:focus-visible {
  outline: 3px solid var(--blau-500);
  outline-offset: 2px;
}

/* Auf der blauen Bühne wäre der blaue Fokusrahmen kaum zu sehen. */
.buehne :focus-visible { outline-color: var(--weiss); }

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
   bilden; nach unten dunkelt sie wie das Startbild der Website ab. Unter
   der Bande bleibt ein blauer Saum in der Breite des Seitenrands, dann
   schiebt sich das Blatt darüber. */
.buehne {
  position: relative;
  overflow: hidden;
  isolation: isolate;
  color: var(--weiss);
  background: linear-gradient(180deg, var(--blau-800) 0%, #13137A 50%, #0E0F5E 100%);
  padding: var(--sp-2) var(--rand) calc(var(--bande-saum) + var(--blatt-radius));
  /* Abstand Satz → Bande, Saum unter der Bande und Platz der Bande (für
     das Wasserzeichen); ohne Bande wie früher (Klasse buehne--ohne-bande,
     siehe bandeAusblenden). */
  --bande-abstand: clamp(24px, 4.5vh, 40px);
  --bande-saum: clamp(22px, 3.2vh, 28px);
  --bande-zone: calc(var(--bande-abstand) + var(--bande-hoehe));
}

.buehne--ohne-bande { --bande-zone: 0px; --bande-saum: clamp(32px, 6.5vh, 52px); }

/* Wappen als Wasserzeichen: weiße Silhouette, sehr zurückgenommen,
   angeschnitten am rechten Rand (wie auf der Website). Ein radialer
   Ausblend-Rahmen (mask-image) verhindert, dass die rechteckige Bildkante
   sichtbar wird, wenn die Bühne breiter ist als das Motiv (z. B. Tablet).
   Mittelpunkt wie bisher in der Mitte der Bühne – aber ohne die Bande
   gerechnet, damit das Wappen hinter dem Satz bleibt. */
.buehne::after {
  content: "";
  position: absolute;
  z-index: -1;
  width: clamp(460px, 140vw, 640px);
  height: clamp(460px, 140vw, 640px);
  left: 58%;
  top: calc((100% - var(--bande-zone) - var(--blatt-radius)) / 2);
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

/* Anmelde-Einstieg für Gäste (vorher nur in der Karte „Deine Termine“, die
   mit „Als Nächstes“ entfallen ist): an der Stelle des Profil-Knopfs, in
   derselben Formensprache (weißer Umriss auf Blau), aber mit Wort – ein
   Kreis allein wäre für Gäste nicht eindeutig. Tippfläche 44px hoch, die
   sichtbare Pille 36px wie der Profil-Kreis. Die Id bleibt
   "registrieren-pille" (Vorschau-Messung tpl-vorschau.mjs, QA-Verweise). */
.registrieren-pille {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  margin-right: -4px;
  color: var(--weiss);
  text-decoration: none;
}

.registrieren-pille__form {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 14px 0 11px;
  border-radius: var(--r-pill);
  border: 1.5px solid rgba(255, 255, 255, .45);
  background: rgba(255, 255, 255, .06);
  font-weight: 600;
  font-size: 14px;
  line-height: 1;
  white-space: nowrap;
  transition: background-color 120ms ease-out;
}

.registrieren-pille__form svg { width: 17px; height: 17px; }

.registrieren-pille:active .registrieren-pille__form { background: rgba(255, 255, 255, .16); }

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

/* === 4a. Bande (Sponsoren-Laufband am Fuß der Bühne) === */

/* Bandenwerbung wie im Stadion: eine dunkle, randlose Schiene über die
   ganze Breite, darin weiße Logo-Tafeln, die ruhig nach links laufen. Weiß
   ist bewusst: die Logos sind JPGs mit weißem Grund und sehr
   unterschiedlich (farbig, schwarz, dunkelblau) – auf Weiß bleiben alle
   lesbar. Kopfzeile und Tafeln sind EIN Link auf „Sponsoren & Partner“
   (ein Tab-Stopp); die Überschrift ist eine echte h2, damit
   Bildschirmleser per Überschrift hierher springen.
   Der Platz ist von Anfang an reserviert (feste Höhe, unsichtbar, nicht
   antippbar), die Tafeln blenden erst ein, wenn Daten und Logos da sind –
   kein Platzhalter, kein Sprung. Kommt nichts (Workbook fehlt, leere
   Liste, Fehler, keine Logos, Frist abgelaufen), klappt die Bande ganz weg
   (.bande--aus, danach hidden). */
.bande {
  height: var(--bande-hoehe);
  margin: var(--bande-abstand) calc(-1 * var(--rand)) 0;
  opacity: 0;
  transition: opacity 360ms ease-out, height 240ms ease-out, margin-top 240ms ease-out;
}

.bande--bereit { opacity: 1; }

.bande.bande--aus {
  height: 0;
  margin-top: 0;
  overflow: hidden;
  visibility: hidden;
}

.bande__link {
  display: block;
  color: var(--weiss);
  text-decoration: none;
}

/* Solange die Bande unsichtbar ist, führt ein Tippen in die blaue Fläche
   nirgendwohin. */
.bande:not(.bande--bereit) .bande__link { pointer-events: none; }

.bande__link:focus-visible { outline-offset: -3px; }

.bande__kopf {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
  height: var(--bande-kopf);
  max-width: calc(600px + 2 * var(--rand));
  margin-inline: auto;
  padding-inline: var(--rand);
}

.bande__titel {
  margin: 0;
  font-family: var(--font-head);
  font-weight: 600;
  font-size: 14px;
  line-height: 1;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, .84);
}

.bande__alle {
  display: inline-flex;
  align-items: center;
  gap: 1px;
  margin-right: -4px;
  font-weight: 600;
  font-size: 14px;
  line-height: 1;
  color: var(--weiss);
}

.bande__alle svg { width: 16px; height: 16px; }

/* Die Schiene: leicht abgedunkelt, oben und unten eine Haarlinie – wie der
   Rahmen einer Bandenanlage. */
.bande__schiene {
  margin-top: var(--bande-luft);
  padding-block: var(--schiene-luft);
  background: rgba(4, 5, 38, .34);
  border-top: 1px solid rgba(255, 255, 255, .12);
  border-bottom: 1px solid rgba(255, 255, 255, .08);
}

/* Fenster: die Tafeln laufen hart an der Bildschirmkante aus wie eine
   echte Bande (ein weicher Verlauf ließ die weißen Tafeln verschmiert
   wirken). */
.bande__fenster { overflow: hidden; }

/* Spur = zwei gleiche Hälften nebeneinander; -50 % ist genau eine Hälfte,
   dadurch schließt die Schleife nahtlos. Abstand über margin-right je
   Tafel (nicht gap), damit auch zwischen den Hälften derselbe Abstand
   steht und -50 % exakt stimmt. Dauer setzt das Skript aus der Breite. */
.bande__spur {
  display: flex;
  width: max-content;
}

.bande__spur--laeuft {
  animation: bande-lauf 30s linear infinite;
  will-change: transform;
}

.bande__haelfte {
  display: flex;
  flex: 0 0 auto;
}

@keyframes bande-lauf {
  from { transform: translate3d(0, 0, 0); }
  to { transform: translate3d(-50%, 0, 0); }
}

/* Anhalten, solange der Finger/Zeiger auf der Bande liegt oder sie den
   Tastaturfokus hat (ein Tippen öffnet die Sponsorenseite). :active
   braucht in iOS-WebViews einen touchstart-Listener (siehe Skript). Maus:
   Anhalten beim Darüberfahren – nur bei echtem Zeiger, damit das Band auf
   Touch-Geräten nach dem Zurückkehren nicht stehen bleibt. */
.bande__link:active .bande__spur,
.bande__link:focus-visible .bande__spur { animation-play-state: paused; }

@media (hover: hover) {
  .bande__link:hover .bande__spur { animation-play-state: paused; }
}

.tafel {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  height: var(--tafel-hoehe);
  min-width: 84px;
  padding-inline: 16px;
  margin-right: var(--tafel-abstand);
  background: var(--weiss);
  border-radius: 8px;
  transition: opacity 120ms ease-out;
}

/* Tipp-Rückmeldung zusätzlich zum Anhalten */
.bande__link:active .tafel { opacity: .8; }

.tafel img {
  display: block;
  max-width: none;
  object-fit: contain;
}

/* Stillstand – nur ein Laufband-Sponsor (.bande--still) oder „Bewegung
   reduzieren“ (Regel am Ende): keine Animation, jedes Logo genau einmal,
   bündig mit dem Seitenrand der Kopfzeile (auch auf dem Tablet) und mit
   Endabstand; mehrere Logos lassen sich waagerecht wischen. */
.bande--still .bande__spur {
  padding-inline: max(var(--rand), calc(50% - 300px)) calc(var(--rand) - var(--tafel-abstand));
}

/* Auf niedrigen Bildschirmen (kleine Telefone, Querformat) die Bühne
   straffen, damit Parkplatzhinweis und Knöpfe näher an die Falz rücken
   (Rückmeldung der Jury zu Entwurf A). Zwei Stufen: ab 900px Bauhöhe leicht
   enger, ab 620px (z. B. 320×568) deutlich enger. Die Begrüßungszeile
   bleibt bei 44px Mindesthöhe (Tippziel Profil-Knopf). */
@media (max-height: 900px) {
  .buehne { --bande-abstand: clamp(22px, 3.6vh, 30px); --bande-saum: 22px; }
  .buehne--ohne-bande { --bande-saum: 24px; }
  .buehne__satz { margin-top: clamp(18px, 4.4vh, 36px); }
  .buehne__claim { font-size: clamp(34px, 11vw, 50px); }
}

@media (max-height: 620px) {
  .buehne { --bande-abstand: 18px; --bande-saum: 16px; }
  .buehne--ohne-bande { --bande-saum: 16px; }
  .buehne__satz { margin-top: 14px; }
  .buehne__claim { font-size: 30px; }
}

/* Querformat auf dem Telefon: der Satz in einer Zeile, sonst bestünde der
   erste Bildschirm fast nur aus Bühne und Bande. */
@media (max-height: 620px) and (min-width: 560px) {
  .buehne__claim span { display: inline; }
}

/* === 5. Heller Grund („Blatt“) === */

.blatt {
  position: relative;
  z-index: 1;
  margin-top: calc(-1 * var(--blatt-radius));
  border-radius: var(--blatt-radius) var(--blatt-radius) 0 0;
  background: var(--bg);
  /* oben gleicher Luftraum wie seitlich: erster Baustein ist seit dem
     Wegfall von „Aktuelles“ die Hinweis-Karte ohne eigenen Kopf */
  padding: var(--sp-5) var(--rand) calc(24px + env(safe-area-inset-bottom));
}

.hinweis-karte + .aktionen {
  margin-top: var(--sp-5);
}

/* === 6. Parkplatzhinweis === */

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

/* === 7. Handlungen === */

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

/* Bewegung reduzieren: keine Animation, auch nicht in der Bande. Die Bande
   wird rein per CSS zur wischbaren Reihe (greift auch, wenn die
   Einstellung erst nach dem Laden umgestellt wird): Wiederholungen und
   zweite Hälfte aus, jedes Logo genau einmal, Einrasten am Seitenrand,
   Endabstand wie bei .bande--still. */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    transition: none !important;
    animation: none !important;
    scroll-behavior: auto !important;
  }
  .bande__fenster {
    overflow-x: auto;
    overscroll-behavior-x: contain;
    -webkit-overflow-scrolling: touch;
    scroll-snap-type: x proximity;
    scroll-padding-inline: max(var(--rand), calc(50% - 300px));
    scrollbar-width: none;
  }
  .bande__fenster::-webkit-scrollbar { display: none; }
  .bande__haelfte[aria-hidden="true"],
  .tafel--wdh { display: none; }
  .bande__spur {
    padding-inline: max(var(--rand), calc(50% - 300px)) calc(var(--rand) - var(--tafel-abstand));
  }
  .tafel { scroll-snap-align: start; }
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
      <a id="registrieren-pille" class="registrieren-pille" href="nav://sportfreunde04_Profile_1783059427823" hidden>
        <span class="registrieren-pille__form"><svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c0-4.1 3.4-6.5 7.5-6.5s7.5 2.4 7.5 6.5"/></svg>Anmelden</span>
      </a>
    </div>
    <script>
    // Profil / Anmelden sofort umschalten, nicht erst nach den cdn-Skripten
    // am Seitenende – sonst sähen Gäste kurz den Profil-Kreis. Angemeldet:
    // runder Profil-Knopf. Gast (ohne profileJSON.id): an seiner Stelle die
    // Pille „Anmelden“ (gleiches Ziel, die Profilseite führt zu Anmeldung
    // und Registrierung) – einziger Anmelde-Einstieg der Seite, seit „Als
    // Nächstes“ mit der Karte „Deine Termine“ entfallen ist.
    (function () {
      "use strict";
      var angemeldet = !!(window.profileJSON && window.profileJSON.id);
      var profilKnopf = document.getElementById("profil-knopf");
      var anmelden = document.getElementById("registrieren-pille");
      if (profilKnopf) profilKnopf.hidden = !angemeldet;
      if (anmelden) anmelden.hidden = angemeldet;
    })();
    </script>
    <div class="buehne__satz">
      <span class="buehne__strich" aria-hidden="true"></span>
      <p class="buehne__claim"><span>Fußball</span> <span>im Gallus</span> <span>– seit 1904.</span></p>
    </div>
  </div>

  <!-- BANDE: Logos aus dem Sponsoren-Worksheet (CMS, Häkchen „showSlider“,
       Reihenfolge „sponSort“), pflegt die 1. Vorsitzende selbst. Tippen
       öffnet „Sponsoren & Partner“. Ohne Treffer klappt die Bande weg. -->
  <section id="bande" class="bande" aria-labelledby="bande-titel" aria-hidden="true">
    <a id="bande-link" class="bande__link" href="nav://sportfreunde04_TextImage_1780401660337" tabindex="-1">
      <div class="bande__kopf">
        <h2 id="bande-titel" class="bande__titel">Sponsoren &amp; Partner</h2>
        <span class="bande__alle">Alle<span class="vh"> ansehen</span><svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 6l6 6-6 6"/></svg></span>
      </div>
      <div class="bande__schiene">
        <div class="bande__fenster">
          <div id="bande-spur" class="bande__spur"></div>
        </div>
      </div>
    </a>
  </section>
</section>

<div class="blatt">
  <div class="rahmen">

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
<!-- Workbook-API (braucht jQuery) für die Sponsoren-Bande -->
<script src="https://cdn.appack.de/modules/appack.workbook-1.4.1.js"></script>
<script>
(function () {
  "use strict";

  // Sponsoren-Worksheet (pflegt die 1. Vorsitzende selbst im CMS). Der
  // öffentliche Endpunkt liefert auch ohne Anmeldung (geprüft 24.09.2026):
  // showSlider/sponActive als Boolean, sponSort als Zahl.
  var SPONSOREN_ID = "6a1ec5fcf68a05bf129cdbac";
  // Saubere Website-Logos (GitHub Pages, data/sponsoren.json logo.quelle):
  // [Namensteil, Quelle]. Zuordnung: der Firmenname aus dem Worksheet muss
  // den Namensteil als GANZE Wörter enthalten (normalisiert, Leerzeichen
  // egal: „SK SportConnects GbR“, „SKSportConnects“ passen; „Sport Elite“
  // oder „Köhlerei“ nicht). Nur in diese Richtung – eine neue Firma bekommt
  // nie das Logo eines anderen Sponsors, sondern ihr eigenes sponImg.
  var LOGO_BASIS = "https://justolgay.github.io/speuzer-website-prototyp/assets/bilder/erzeugt/";
  var WEBSITE_LOGOS = [
    ["SK SportConnects", "sponsor-sk-sportconnects-gbr"],
    ["vmapit", "sponsor-vmapit-gmbh"],
    ["Bundeswehr", "sponsor-bundeswehr"],
    ["VM Elite", "sponsor-fuballschule-vm-elite"],
    ["11TeamSports", "sponsor-11teamsports"],
    ["Köhler", "sponsor-koehler"]
  ];
  // Logo-Maße: gleiche optische Fläche für alle Logos (Wurzel-Regel), damit
  // das sehr breite 11TeamSports (≈ 6,7 : 1) nicht riesig und die fast
  // quadratischen Bundeswehr/VM Elite nicht winzig wirken. Höchstmaße
  // kommen aus dem CSS (--logo-max-hoehe/--logo-max-breite), die Zahlen
  // hier sind nur der Rückfall, falls das CSS sie nicht liefert.
  var LOGO_FLAECHE = 3300;     // px²
  var TEMPO = 28;              // px pro Sekunde – ruhig, Logos bleiben lesbar
  var BILD_WARTEZEIT = 6000;   // ms je Logo-Versuch
  var BANDE_WARTEZEIT = 8000;  // ms insgesamt (Daten + Logos); danach wird nichts mehr nachgeschoben

  // iOS-WebViews setzen :active (Anhalten der Bande, Tipp-Rückmeldung der
  // Knöpfe) nur, wenn ein touchstart-Listener existiert.
  document.addEventListener("touchstart", function () {}, { passive: true });

  // ---------- Begrüßung ----------

  function begruessung() {
    var el = document.getElementById("gruss");
    if (!el) return;
    var stunde = new Date().getHours();
    var gruss = stunde < 11 ? "Guten Morgen" : (stunde < 18 ? "Guten Tag" : "Guten Abend");
    var profil = window.profileJSON || {};
    var name = profil.firstname ? (", " + profil.firstname) : "";
    el.textContent = gruss + name + "!";
  }

  function element(tag, klasse, text) {
    var el = document.createElement(tag);
    if (klasse) el.className = klasse;
    if (text !== undefined) el.textContent = text;
    return el;
  }

  // ---------- Bande (Sponsoren-Laufband) ----------

  // Ablauf: Workbook.load (Filter sponActive: true) -> nur Zeilen mit
  // Häkchen showSlider, nach sponSort -> je Firma Website-Logo, sonst
  // sponImg (nur http/https) -> alle Logos vorladen -> Bande einblenden.
  // Kommt nichts oder läuft die Frist ab: Bande ausblenden.

  function bildUrlGueltig(url) {
    return /^https?:\/\//i.test(url || "");
  }

  // Liest ein Pixelmaß aus den CSS-Tokens (:root), sonst der Rückfall.
  function cssPixel(name, ersatz) {
    try {
      var wert = parseFloat(window.getComputedStyle(document.documentElement).getPropertyValue(name));
      return isFinite(wert) && wert > 0 ? wert : ersatz;
    } catch (e) {
      return ersatz;
    }
  }

  // Wörter eines Namens, normalisiert: "Köhler" = "Koehler" -> ["kohler"],
  // "SK SportConnects GbR" -> ["sk", "sportconnects", "gbr"]. NFC zuerst:
  // das CMS kann Umlaute zerlegt liefern (o + Trema).
  function woerter(text) {
    var s = String(text || "");
    if (s.normalize) s = s.normalize("NFC");
    return s.toLowerCase()
      .replace(/ä|ae/g, "a").replace(/ö|oe/g, "o").replace(/ü|ue/g, "u").replace(/ß/g, "ss")
      .split(/[^a-z0-9]+/)
      .filter(Boolean);
  }

  // true, wenn aufeinanderfolgende ganze Wörter des Firmennamens zusammen
  // genau den Namensteil ergeben.
  function enthaeltNamensteil(firma, namensteil) {
    var name = woerter(firma);
    var teil = woerter(namensteil).join("");
    if (!teil) return false;
    for (var i = 0; i < name.length; i++) {
      var zusammen = "";
      for (var j = i; j < name.length && zusammen.length < teil.length; j++) {
        zusammen += name[j];
        if (zusammen === teil) return true;
      }
    }
    return false;
  }

  function websiteLogo(firma) {
    for (var i = 0; i < WEBSITE_LOGOS.length; i++) {
      if (enthaeltNamensteil(firma, WEBSITE_LOGOS[i][0])) {
        return LOGO_BASIS + WEBSITE_LOGOS[i][1] + "-480.jpg";
      }
    }
    return "";
  }

  function sortWert(wert) {
    var zahl = Number(wert);
    return (wert === null || wert === undefined || wert === "" || !isFinite(zahl)) ? Infinity : zahl;
  }

  // Nur Zeilen mit Häkchen „showSlider“ (und nicht ausdrücklich inaktiv –
  // Schutz, falls der Server den Filter sponActive einmal nicht anwendet;
  // die Platzhalterzeile „Hier könnte Ihre Werbung stehen“ hat
  // showSlider=true, sponActive=false), aufsteigend nach „sponSort“ (ohne
  // Wert ans Ende, bei Gleichstand Reihenfolge des Worksheets).
  function sponsorenFuerBande(zeilen) {
    return (Array.isArray(zeilen) ? zeilen : [])
      .map(function (zeile, i) { return { zeile: zeile || {}, i: i }; })
      .filter(function (e) {
        return e.zeile.showSlider === true && e.zeile.sponActive !== false && String(e.zeile.sponFirma || "").trim() !== "";
      })
      .sort(function (a, b) {
        var sa = sortWert(a.zeile.sponSort);
        var sb = sortWert(b.zeile.sponSort);
        if (sa !== sb) return sa < sb ? -1 : 1;
        return a.i - b.i;
      })
      .map(function (e) {
        return { firma: String(e.zeile.sponFirma).trim(), bild: String(e.zeile.sponImg || "").trim() };
      });
  }

  // Lädt ein Bild vor; liefert { url, breite, hoehe } oder null (Fehler,
  // Zeitüberschreitung, keine http(s)-Adresse).
  function ladeBild(url) {
    return new Promise(function (fertig) {
      if (!bildUrlGueltig(url)) { fertig(null); return; }
      var bild = new Image();
      var erledigt = false;
      function ende(ergebnis) {
        if (erledigt) return;
        erledigt = true;
        clearTimeout(uhr);
        fertig(ergebnis);
      }
      var uhr = setTimeout(function () { ende(null); }, BILD_WARTEZEIT);
      bild.onload = function () {
        ende(bild.naturalWidth && bild.naturalHeight ? { url: url, breite: bild.naturalWidth, hoehe: bild.naturalHeight } : null);
      };
      bild.onerror = function () { ende(null); };
      bild.src = url;
    });
  }

  // Erst das Website-Logo, bei Fehler das Worksheet-Bild; ohne beides
  // entfällt der Sponsor in der Bande (kein leeres Feld).
  function ladeLogo(sponsor, mass) {
    var website = websiteLogo(sponsor.firma);
    var ersatz = bildUrlGueltig(sponsor.bild) ? sponsor.bild : "";
    return ladeBild(website || ersatz)
      .then(function (ergebnis) {
        if (ergebnis || !website || !ersatz) return ergebnis;
        return ladeBild(ersatz);
      })
      .then(function (ergebnis) {
        if (!ergebnis) return null;
        var verhaeltnis = ergebnis.breite / ergebnis.hoehe;
        var hoehe = Math.sqrt(LOGO_FLAECHE / verhaeltnis);
        hoehe = Math.min(hoehe, mass.hoehe, mass.breite / verhaeltnis);
        return { firma: sponsor.firma, url: ergebnis.url, breite: Math.round(hoehe * verhaeltnis), hoehe: Math.round(hoehe) };
      });
  }

  // Eine weiße Tafel; "stumm" = Wiederholung für die Endlosschleife (für
  // Bildschirmleser unsichtbar, jedes Logo wird nur einmal vorgelesen; bei
  // reduzierter Bewegung per CSS ausgeblendet).
  function baueTafel(logo, stumm) {
    var tafel = element("span", stumm ? "tafel tafel--wdh" : "tafel");
    var bild = document.createElement("img");
    bild.src = logo.url;
    bild.alt = stumm ? "" : "Logo " + logo.firma;
    bild.width = logo.breite;
    bild.height = logo.hoehe;
    bild.decoding = "async";
    bild.draggable = false;
    if (stumm) tafel.setAttribute("aria-hidden", "true");
    tafel.appendChild(bild);
    return tafel;
  }

  function bandeAusblenden() {
    var bande = document.getElementById("bande");
    var link = document.getElementById("bande-link");
    if (!bande) return;
    if (bande.parentNode && bande.parentNode.classList) bande.parentNode.classList.add("buehne--ohne-bande");
    bande.classList.remove("bande--bereit");
    bande.classList.add("bande--aus");
    bande.setAttribute("aria-hidden", "true");
    if (link) link.setAttribute("tabindex", "-1");
    setTimeout(function () { bande.hidden = true; }, 260);
  }

  function zeigeBande(logos) {
    var bande = document.getElementById("bande");
    var link = document.getElementById("bande-link");
    var spur = document.getElementById("bande-spur");
    if (!bande || !spur) return;
    if (!logos.length) { bandeAusblenden(); return; }

    var haelfte = element("div", "bande__haelfte");
    logos.forEach(function (logo) { haelfte.appendChild(baueTafel(logo, false)); });
    spur.appendChild(haelfte);

    if (logos.length === 1) {
      // Ein einzelnes Logo läuft nicht endlos im Kreis, es steht still.
      bande.classList.add("bande--still");
    } else {
      // Eine Hälfte muss mindestens so breit sein wie der breiteste
      // denkbare Bildschirm (auch nach dem Drehen), sonst läuft bei
      // wenigen Sponsoren eine Lücke durchs Bild.
      var satzBreite = haelfte.offsetWidth;
      var noetig = Math.max(window.innerWidth || 0, (window.screen && Math.max(screen.width, screen.height)) || 0, 600);
      for (var runde = 1; satzBreite > 0 && satzBreite * runde < noetig && runde < 12; runde++) {
        logos.forEach(function (logo) { haelfte.appendChild(baueTafel(logo, true)); });
      }
      var zweite = haelfte.cloneNode(true);
      zweite.setAttribute("aria-hidden", "true");
      [].forEach.call(zweite.querySelectorAll("img"), function (bild) { bild.alt = ""; });
      spur.appendChild(zweite);
      var dauer = Math.max(12, Math.round(haelfte.offsetWidth / TEMPO));
      spur.style.animationDuration = dauer + "s";
      // Zufälliger Einstieg in die Schleife (Reihenfolge bleibt sponSort):
      // bei jedem Öffnen stehen andere Sponsoren vorn, nicht immer Platz 1.
      spur.style.animationDelay = "-" + (Math.random() * dauer).toFixed(1) + "s";
      spur.classList.add("bande__spur--laeuft");
    }

    bande.removeAttribute("aria-hidden");
    if (link) link.removeAttribute("tabindex");
    // erst im nächsten Bild einblenden, damit der Übergang greift
    var einblenden = function () { bande.classList.add("bande--bereit"); };
    if (window.requestAnimationFrame) window.requestAnimationFrame(einblenden); else setTimeout(einblenden, 16);
  }

  // Daten + Logos laden; die Bande erscheint, wenn alles da ist oder
  // spätestens nach BANDE_WARTEZEIT mit den bis dahin geladenen Logos
  // (keine geladen: klappt weg). Gäste sehen die Bande genauso (Worksheet ist öffentlich,
  // wie auf der Seite „Sponsoren & Partner“).
  function ladeBande() {
    if (!window.Workbook || typeof Workbook.load !== "function") {
      bandeAusblenden();
      return;
    }
    var mass = {
      hoehe: cssPixel("--logo-max-hoehe", 44),
      breite: cssPixel("--logo-max-breite", 150)
    };
    var erledigt = false;
    function fertig(logos) {
      if (erledigt) return;
      erledigt = true;
      clearTimeout(uhr);
      try { zeigeBande(logos); } catch (e) { bandeAusblenden(); }
    }
    // Bei Fristablauf zählen die Logos, die bis dahin geladen sind (in
    // sponSort-Reihenfolge) – ein einzelnes hängendes Logo verhindert so
    // nicht die ganze Bande.
    var geladen = [];
    var uhr = setTimeout(function () { fertig(geladen.filter(Boolean)); }, BANDE_WARTEZEIT);
    Promise.resolve()
      .then(function () {
        return Workbook.load({ workbook: SPONSOREN_ID, filter: { sponActive: true }, offset: 0, limit: 500, sort: "_id", direction: "asc" });
      })
      .then(function (zeilen) {
        return Promise.all(sponsorenFuerBande(zeilen).map(function (sponsor, i) {
          return ladeLogo(sponsor, mass).then(function (logo) { geladen[i] = logo; return logo; });
        }));
      })
      .then(function (logos) { fertig(logos.filter(Boolean)); })
      .catch(function () { fertig([]); });
  }

  begruessung();
  ladeBande();
})();
</script>
</body>
</html>
