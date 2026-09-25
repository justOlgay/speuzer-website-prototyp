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
   Tab-Leiste, keine Navigations-Fußzeile. Aufbau seit 25.09.2026 (Wunsch
   der 1. Vorsitzenden, Reihenfolge von oben nach unten; Termine-Entwurf C
   „Info-Panel“ mit den Nachbesserungen der Jury):
   1. ruhige Bühne in Vereinsblau wie die Website-Startseite (Wappen als
      Wasserzeichen, Satz „Fußball im Gallus – seit 1904.“), darin klein die
      Begrüßung (Gäste: Pille „Anmelden“);
   2. „Termine“: weiße Karte mit den nächsten drei Spielen/Veranstaltungen
      (ohne Trainings) in kompakten Zeilen, die über die gerundete
      Oberkante des hellen Blatts in die Bühne ragt (Info-Panel). Daten aus
      dem öffentlichen appack-Kalender mit dem Embedded-Token (gültig bis
      21.08.2027, Erneuern siehe Skript „Termine“); bei Ausfall nur die
      Zeile „Alle Termine im Kalender ›“;
   3. auf dem hellen Blatt der leise Parkplatzhinweis und zwei Handlungen;
   4. ganz unten die „Bande“ auf einem Fußstreifen im Blau der Bühne (das
      Blatt liegt unten genauso gerundet darauf): weiße Logo-Tafeln der
      Sponsoren laufen wie Bandenwerbung im Stadion durch (Daten aus dem
      Sponsoren-Worksheet, siehe Skript „Bande“); ohne Sponsoren klappt der
      Streifen weg.
   „Aktuelles“ (News-Widget) bleibt entfallen (Entscheidung der
   Jugendleitung, 24.09.2026). Farben/Schrift aus assets/css/tokens.css.
   Kein Rot, kein Grün, kein dekoratives Grau. */

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
  /* Übergänge Bühne → Blatt → Fußstreifen: das helle Blatt liegt mit
     gerundeten Ecken oben auf der Bühne und unten auf dem Fußstreifen
     (--blatt-radius). Die Termine-Karte ragt zusätzlich um --ueberlappung
     über die Oberkante des Blatts in die Bühne (Info-Panel); die Bühne hält
     dafür unten genau diesen Platz frei (siehe .buehne). */
  --blatt-radius: 24px;
  --ueberlappung: 28px;
  /* Schatten der schwebenden Karte: weich, nach unten, im Vereinsblau
     getönt – ein Panel über der Bühne, keine Kachel. */
  --sh-panel: 0 14px 32px -14px rgba(11, 14, 74, .5), 0 2px 6px rgba(11, 14, 74, .08);

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
  /* Fußstreifen um die Bande: Luft oben und unten (unten zusätzlich der
     Safe-Area-Bereich, siehe .bande) */
  --fuss-oben: 22px;
  --fuss-unten: 20px;
}

/* === 3. Grundregeln === */

*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }

/* Grund hinter der Seite (iOS-Überziehen oben und unten): Vereinsblau wie
   die Kopfleiste, die Oberkante der Bühne und die Unterkante des
   Fußstreifens – beim Ziehen blitzt kein heller Streifen auf. Die Seite
   selbst (body) bleibt hell und ist nie kürzer als der Bildschirm. */
html { background: var(--blau-800); }

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

/* Auf der blauen Bühne und im blauen Fußstreifen wäre der blaue
   Fokusrahmen kaum zu sehen. */
.buehne :focus-visible,
.bande :focus-visible { outline-color: var(--weiss); }

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

/* Bildschirm füllen (24.09.2026, Rückmeldung am iPhone: leere helle
   Fläche unter den Knöpfen „sieht unprofessionell aus“). Ist die Seite
   kürzer als der Bildschirm (große Telefone, Tablet), wächst die Bühne,
   und Termine, Hinweis, Knöpfe und Fußstreifen sitzen bündig am unteren
   Rand – unter dem letzten Element ist nie leere helle Fläche: mit
   Sponsoren schließt der blaue Fußstreifen die Seite ab, ohne Sponsoren
   das Blatt mit den Knöpfen. Der zusätzliche Platz der Bühne wird geteilt
   (25.09.2026, Jury): zwei Teile über dem Satz, ein Teil darunter – so
   steht auf hohen Bildschirmen nicht alles leere Blau zwischen Gruß und
   Satz. Ist der Bildschirm zu klein, greift nichts davon – die Seite
   scrollt. */
.inhalt {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
}

.inhalt > .buehne {
  flex: 1 0 auto;
  display: flex;
  flex-direction: column;
}

.buehne > .rahmen {
  width: 100%;
  flex: 1 0 auto;
  display: flex;
  flex-direction: column;
}

/* über dem Satz: der Satz selbst wächst (Inhalt unten bündig) */
.buehne > .rahmen > .buehne__satz {
  flex: 2 0 auto;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

/* unter dem Satz: ein leerer Rest (ein Teil) */
.buehne > .rahmen::after {
  content: "";
  flex: 1 0 0px;
}

.inhalt > .blatt,
.inhalt > .bande { flex: 0 0 auto; }

/* === 4. Bühne (wie die Website-Startseite) === */

/* Oben beginnt die Bühne exakt im Blau der nativen Kopfleiste
   (--appack-color-main #191793), damit Kopfleiste und Bühne eine Fläche
   bilden; nach unten dunkelt sie wie das Startbild der Website ab. Unten
   schiebt sich das Blatt mit gerundeten Ecken darüber (--blatt-radius),
   die Termine-Karte ragt noch --ueberlappung höher. Zwischen Satz und
   Karte bleibt ein blauer Saum (--buehne-saum). */
.buehne {
  position: relative;
  overflow: hidden;
  isolation: isolate;
  color: var(--weiss);
  background: linear-gradient(180deg, var(--blau-800) 0%, #13137A 50%, #0E0F5E 100%);
  padding: var(--sp-2) var(--rand) calc(var(--buehne-saum) + var(--ueberlappung) + var(--blatt-radius));
  --buehne-saum: clamp(28px, 4.6vh, 40px);
}

/* Wappen als Wasserzeichen: weiße Silhouette, sehr zurückgenommen,
   angeschnitten am rechten Rand (wie auf der Website). Ein radialer
   Ausblend-Rahmen (mask-image) verhindert, dass die rechteckige Bildkante
   sichtbar wird, wenn die Bühne breiter ist als das Motiv (z. B. Tablet).
   Mittelpunkt in der Mitte der sichtbaren Bühne (ohne den Teil unter der
   Karte), damit das Wappen hinter dem Satz bleibt. */
.buehne::after {
  content: "";
  position: absolute;
  z-index: -1;
  width: clamp(460px, 140vw, 640px);
  height: clamp(460px, 140vw, 640px);
  left: 58%;
  top: calc((100% - var(--ueberlappung) - var(--blatt-radius)) / 2);
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

/* === 4a. Bande (Sponsoren-Laufband im Fußstreifen) === */

/* Bandenwerbung wie im Stadion: eine dunkle, randlose Schiene über die
   ganze Breite, darin weiße Logo-Tafeln, die ruhig nach links laufen. Weiß
   ist bewusst: die Logos sind JPGs mit weißem Grund und sehr
   unterschiedlich (farbig, schwarz, dunkelblau) – auf Weiß bleiben alle
   lesbar. Kopfzeile und Tafeln sind EIN Link auf „Sponsoren & Partner“
   (ein Tab-Stopp); die Überschrift ist eine echte h2, damit
   Bildschirmleser per Überschrift hierher springen.
   Ort (25.09.2026, Wunsch der 1. Vorsitzenden: Sponsoren „eher unten“):
   der Fußstreifen am Seitenende, vollbreit, im Blau der Bühne (Verlauf
   gespiegelt: dunkel am Blatt, heller zum Bildschirmrand) – das helle
   Blatt mit Terminen und Knöpfen liegt so zwischen zwei blauen Flächen und
   ist oben wie unten gleich gerundet (es schiebt sich um --blatt-radius
   über den Streifen). Der Streifen reicht bis in den Safe-Area-Bereich
   (Home-Indikator). Der Platz ist von Anfang an reserviert (feste Höhe),
   der Streifen steht sofort in Blau, Kopfzeile und Tafeln blenden erst
   ein, wenn Daten und Logos da sind – kein Platzhalter, kein Sprung. Kommt
   nichts (Workbook fehlt, leere Liste, Fehler, keine Logos, Frist
   abgelaufen), klappt der ganze Streifen weg (.bande--aus, danach hidden);
   dann schließt das Blatt mit den Knöpfen die Seite ab
   (.inhalt--ohne-bande). */
.bande {
  height: calc(var(--blatt-radius) + var(--fuss-oben) + var(--bande-hoehe) + var(--fuss-unten) + env(safe-area-inset-bottom, 0px));
  margin-top: calc(-1 * var(--blatt-radius));
  padding: calc(var(--blatt-radius) + var(--fuss-oben)) 0 calc(var(--fuss-unten) + env(safe-area-inset-bottom, 0px));
  background: linear-gradient(180deg, #0E0F5E 0%, #13137A 55%, var(--blau-800) 100%);
  color: var(--weiss);
  transition: height 240ms ease-out, padding 240ms ease-out, margin-top 240ms ease-out;
}

.bande__link {
  display: block;
  color: var(--weiss);
  text-decoration: none;
  opacity: 0;
  transition: opacity 360ms ease-out;
}

.bande--bereit .bande__link { opacity: 1; }

.bande.bande--aus {
  height: 0;
  margin-top: 0;
  padding-block: 0;
  overflow: hidden;
  visibility: hidden;
}

/* Solange die Bande unsichtbar ist, führt ein Tippen in den blauen
   Streifen nirgendwohin. */
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
   straffen, damit Termine, Parkplatzhinweis und Knöpfe näher an die Falz
   rücken (Rückmeldung der Jury zu Entwurf A). Zwei Stufen: ab 900px
   Bauhöhe leicht enger, ab 620px (z. B. 320×568) deutlich enger. Die
   Begrüßungszeile bleibt bei 44px Mindesthöhe (Tippziel Profil-Knopf). */
@media (max-height: 900px) {
  .buehne { --buehne-saum: clamp(24px, 3.6vh, 30px); }
  .buehne__satz { margin-top: clamp(18px, 4.4vh, 36px); }
  .buehne__claim { font-size: clamp(34px, 11vw, 50px); }
}

@media (max-height: 620px) {
  :root { --ueberlappung: 24px; }
  .buehne { --buehne-saum: 20px; }
  .buehne__satz { margin-top: 14px; }
  .buehne__claim { font-size: 30px; }
}

/* Querformat auf dem Telefon: der Satz in einer Zeile, sonst bestünde der
   erste Bildschirm fast nur aus der Bühne. */
@media (max-height: 620px) and (min-width: 560px) {
  .buehne__claim span { display: inline; }
}

/* === 5. Heller Grund („Blatt“) === */

/* Das Blatt schiebt sich oben mit gerundeten Ecken über die Bühne; sein
   erster Baustein, die Termine-Karte, ragt noch --ueberlappung höher in
   die Bühne. Unten liegt es genauso gerundet auf dem Fußstreifen. Ohne
   Fußstreifen ist es das letzte Element: unten gerade, bis an den
   Bildschirmrand, mit Safe-Area-Abstand. */
.blatt {
  position: relative;
  z-index: 1;
  margin-top: calc(-1 * var(--blatt-radius));
  border-radius: var(--blatt-radius);
  background: var(--bg);
  padding: 0 var(--rand) var(--sp-5);
}

.inhalt--ohne-bande .blatt {
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  padding-bottom: calc(var(--sp-5) + env(safe-area-inset-bottom, 0px));
}

.termine-karte + .hinweis-karte,
.hinweis-karte + .aktionen {
  margin-top: var(--sp-5);
}

/* === 5a. Termine (Info-Panel über dem Bühnenrand) === */

/* Wunsch der 1. Vorsitzenden (25.09.2026): Kalendertermine direkt unter
   der Bühne, „zumindest kleiner als vorher“ (vorher: eine große Karte „Als
   Nächstes“ mit einem Termin, gut 95px je Termin). Jetzt eine weiße Karte
   mit bis zu drei kompakten Zeilen (Datumskachel, Titel ein-/zweizeilig,
   Tag und Uhrzeit; 56–71px je Termin, Karte mit drei Terminen etwa
   215–260px), die wie ein Info-Panel über die Oberkante des Blatts in die
   Bühne ragt. Die ganze Karte ist Teil des Blatts (gleiche Breite wie
   Hinweis und Knöpfe). Mehrere Termine am selben Tag: Kachel nur beim
   ersten; ein Termin von heute hat eine gefüllte Kachel. Beim Laden drei
   ruhige Platzhalter-Zeilen in genau der Höhe echter Zeilen; bei Fehler
   oder ohne Termine schrumpft die Karte auf eine einzige Zeile „Alle
   Termine im Kalender ›“ (.termine-karte--kurz, kein leerer Kasten). */
.termine-karte {
  position: relative;
  margin-top: calc(-1 * var(--ueberlappung));
  background: var(--surface);
  border-radius: var(--r-lg);
  box-shadow: var(--sh-panel);
  overflow: hidden;
}

/* Fokusrahmen innen, die Karte schneidet außen ab */
.termine-karte a:focus-visible { outline-offset: -3px; border-radius: var(--r-lg); }

.termine-kopf {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
  min-height: 44px;
  padding: 0 6px 0 var(--sp-4);
}

.termine-kopf__titel {
  margin: 0;
  font-family: var(--font-head);
  font-weight: 700;
  font-size: 16px;
  line-height: 1.1;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--ink-2);
}

.termine-kopf__link {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 1px;
  min-height: 44px;
  padding: 0 var(--sp-2) 0 var(--sp-4);
  color: var(--blau-700);
  font-weight: 600;
  font-size: 14px;
  text-decoration: none;
}

.termine-kopf__link svg { width: 16px; height: 16px; }

.termine-liste {
  list-style: none;
  margin: 0;
  padding: 0 0 var(--sp-1);
}

.termin { position: relative; }

/* Trennlinie zwischen den Zeilen, eingerückt bis zur Textspalte.
   Maße (25.09.2026 gestrafft, Jury: Block „kleiner als vorher“): Zeile mit
   zweizeiligem Titel 71px, mit einzeiligem 56px (Tippziel ≥ 44px). */
.termin + .termin::before {
  content: "";
  position: absolute;
  top: 0;
  left: calc(var(--sp-4) + var(--kachel) + var(--sp-3));
  right: 0;
  border-top: 1px solid var(--line);
}

.termine-karte { --kachel: 40px; }

.termin__link,
.termin--platzhalter {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  min-height: 56px;
  padding: var(--sp-2) var(--sp-4);
  color: var(--ink);
  text-decoration: none;
  transition: background-color 120ms ease-out;
}

.termin__link:active { background: var(--blau-50); }

/* Datumskachel: Tag groß in der Überschriftenschrift, Monat klein */
.termin__datum {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: var(--kachel);
  height: 40px;
  border-radius: 10px;
  background: var(--blau-50);
  color: var(--blau-950);
}

/* Termin von heute: Kachel gefüllt im Vereinsblau (ruhiger Hinweis, fällt
   in der Liste sofort auf); „Morgen“ und spätere Tage bleiben hell. */
.termin__datum--heute {
  background: var(--blau-700);
  color: var(--weiss);
}

.termin__datum--heute .termin__monat { color: rgba(255, 255, 255, .86); }

.termin__tag {
  font-family: var(--font-head);
  font-weight: 700;
  font-size: 19px;
  line-height: 1;
}

.termin__monat {
  margin-top: 2px;
  font-size: 9.5px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: .07em;
  color: var(--blau-700);
}

.termin__text {
  flex: 1 1 auto;
  min-width: 0;
}

.termin__titel {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  font-weight: 600;
  font-size: 14.5px;
  line-height: 1.28;
  color: var(--ink);
  overflow-wrap: anywhere;
}

.termin__zeit {
  display: block;
  margin-top: 1px;
  font-size: 13px;
  line-height: 1.3;
  color: var(--ink-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Weiterer Termin am selben Tag: Kachel ausgespart (Platz bleibt) */
.termin--gleicher-tag .termin__datum { visibility: hidden; }

/* Platzhalter beim Laden (ruhig, ohne Animation) */
/* so hoch wie eine echte Zeile (zweizeiliger Titel + Zeitzeile), damit
   beim Eintreffen der Daten nichts springt; die dritte Zeile mit
   einzeiligem Titel wie echte kurze Zeilen */
.termin--platzhalter { min-height: 71px; }
.termin--platzhalter:nth-last-child(2) { min-height: 56px; }

.platzhalter-balken {
  display: block;
  height: 11px;
  border-radius: 6px;
  background: var(--blau-50);
}

.platzhalter-balken + .platzhalter-balken { margin-top: 8px; }
.platzhalter-balken--klein { height: 9px; }

/* Rückfall: eine ruhige Zeile statt der Liste */
.termine-karte--kurz .termine-kopf { display: none; }

.termine-ersatz {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  min-height: 52px;
  padding: 8px 10px 8px var(--sp-4);
  color: var(--blau-800);
  font-weight: 600;
  font-size: 15px;
  text-decoration: none;
  transition: background-color 120ms ease-out;
}

.termine-ersatz:active { background: var(--blau-50); }

.termine-ersatz__symbol {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 9px;
  background: var(--blau-50);
  color: var(--blau-700);
}

.termine-ersatz__symbol svg { width: 18px; height: 18px; }

.termine-ersatz__text { flex: 1 1 auto; }

.termine-ersatz > svg { width: 18px; height: 18px; color: var(--ink-3); }

/* === 6. Parkplatzhinweis === */

/* HINWEIS-Baustein: im CMS-Quelltext pflegen oder samt <aside> entfernen.
   Seit 24.09.2026 bewusst leise (Rückmeldung der Jugendleitung am iPhone:
   die getönte Karte war „deutlich zu prominent und groß“): keine Fläche,
   kein Rahmen, nur ein Absatz wie eine Fußnote über den Knöpfen, links von
   einer feinen Linie in Vereinsblau abgesetzt. Das „P“ steht klein im Satz,
   die Gültigkeit am Satzende. Textlänge: heute gut 130 Zeichen = 3 Zeilen
   ab 360 px Breite; deutlich länger wird vierzeilig. */
.hinweis-karte {
  padding: 1px 0 1px var(--sp-3);
  border-left: 2px solid var(--blau-500);
  font-size: 13px;
  line-height: 1.5;
  color: var(--ink-2);
  text-wrap: pretty;
}

.p-schild {
  display: inline-block;
  width: 17px;
  height: 17px;
  margin-right: 6px;
  border: 1.5px solid var(--blau-700);
  border-radius: 4px;
  color: var(--blau-700);
  font-family: var(--font-head);
  font-weight: 700;
  font-size: 12.5px;
  line-height: 14px;
  text-align: center;
  vertical-align: -3px;
}

.hinweis__titel {
  font-weight: 600;
  color: var(--blau-950);
}

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
</section>

<div class="blatt">
  <div class="rahmen">

    <!-- TERMINE: die nächsten drei Spiele/Veranstaltungen aus dem
         öffentlichen Kalender (ohne Trainings), siehe Skript „Termine“.
         Tippen öffnet den Kalender. Bis die Daten da sind, stehen drei
         ruhige Platzhalter-Zeilen; bei Fehler/ohne Termine eine Zeile
         „Alle Termine im Kalender ›“. -->
    <section id="termine" class="termine-karte" aria-labelledby="termine-titel">
      <div class="termine-kopf">
        <h2 id="termine-titel" class="termine-kopf__titel">Termine</h2>
        <a class="termine-kopf__link" href="nav://sportfreunde04_Application_1780401660369">Alle<span class="vh"> Termine</span><svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 6l6 6-6 6"/></svg></a>
      </div>
      <ul id="termine-liste" class="termine-liste" aria-busy="true">
        <li class="termin termin--platzhalter" aria-hidden="true"><span class="termin__datum"></span><span class="termin__text"><span class="platzhalter-balken" style="width:82%"></span><span class="platzhalter-balken" style="width:54%"></span><span class="platzhalter-balken platzhalter-balken--klein" style="width:34%"></span></span></li>
        <li class="termin termin--platzhalter" aria-hidden="true"><span class="termin__datum"></span><span class="termin__text"><span class="platzhalter-balken" style="width:76%"></span><span class="platzhalter-balken" style="width:48%"></span><span class="platzhalter-balken platzhalter-balken--klein" style="width:34%"></span></span></li>
        <li class="termin termin--platzhalter" aria-hidden="true"><span class="termin__datum"></span><span class="termin__text"><span class="platzhalter-balken" style="width:70%"></span><span class="platzhalter-balken platzhalter-balken--klein" style="width:34%"></span></span></li>
        <li class="vh">Termine werden geladen</li>
      </ul>
    <script>
    // ---------- Termine (öffentlicher Kalender) ----------
    // Direkt hinter der Karte statt im Skript am Seitenende: die Abfrage
    // startet so sofort und wartet nicht auf jQuery/Workbook vom cdn (kürzer
    // sichtbare Platzhalter).
    (function () {
      "use strict";

      // Quelle: appack-GraphQL, listUpcomingCalendarEvents für das
      // Kalendermodul der App. Nicht über graphApi – das braucht eine
      // Anmeldung (Gäste: HTTP 401) –, sondern mit dem ÖFFENTLICHEN
      // Embedded-Token, den appack selbst beim Aufruf der öffentlichen
      // Kalenderansicht https://shorturl.appack.de/sportfreunde04_Application_1780401660369
      // in die Weiterleitungsadresse schreibt (Scope „embedded“, technischer
      // Nutzer der App, keine Personendaten, geprüft 25.09.2026). Er liefert
      // nur die öffentlichen Kalender (heute: „Spielplan Mannschaften“ und
      // „Speuzer D3 – Spiele und Training (Pilot)“, künftig „Vereinstermine“
      // für Veranstaltungen). CORS: der Server erlaubt die Herkunft
      // https://appack.de (drender) samt Kopfzeile Authorization (Vorabfrage
      // geprüft 25.09.2026). Der Token ist öffentlich (appack liefert ihn
      // jedem Besucher der Kalenderansicht aus) und darf deshalb hier und im
      // Repo stehen. GÜLTIG BIS 21.08.2027 (Feld „exp“ im Token).
      // Erneuern: die Kurzadresse oben im Browser öffnen; die Adresse nach
      // der Weiterleitung enthält „jwt=eyJ…“ – den Teil nach „jwt=“ (bis zum
      // nächsten „&“) hier bei TERMINE_TOKEN einsetzen und das Ablaufdatum
      // in diesem Kommentar und in assets/app/LIESMICH.md nachziehen.
      // Abgelaufen oder gesperrt: die Karte zeigt nur „Alle Termine im
      // Kalender ›“ (kein Fehlerbild).
      var KALENDER_ID = "sportfreunde04_Application_1780401660369";
      var TERMINE_API = "https://api.appack.de/graphql";
      var TERMINE_TOKEN = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcHBJZCI6InNwb3J0ZnJldW5kZTA0IiwidXNlcm5hbWUiOiJzcG9ydGZyZXVuZGUwNCIsImlzcyI6ImFwcGFjayIsImV4cCI6MTgxODgzNzY4NywiaWF0IjoxNzg3MzAxNjg3LCJzY29wZSI6WyJlbWJlZGRlZCJdfQ.yUyf5TWInpjnkzWrQdVE6UuWJUCVQNl6r2nQtMbF3_0s7GvD8nVko4_ozutbSeVYddTGCJAi0o0SVt94uKYZgQqEBYv8fA4f8Qkj6zv0GjM9dSJK36j4DF-O3yz_Dd_udk60pXRdu_f7JL_B6wEEcVktNhEzrABUR3Gi2PcvMzLedDHW-PQy76il_nb0n7koVk60_M3m60MbPfRRyNS08p5ddraf1CzLNG7CxtWJqMim0yzIr-wDlH9x6Gf1d_rrqRB7kVYzjpt_d8wKvBqRvMxfxUQCY9KlzZ4Pzi7x9tPfqhTTIHKJ3zh6JbuIG6gfm5MenI9sn1hQOf2_tu4Akw";
      var TERMINE_ABFRAGE = 20;     // so viele kommende Termine holen (Trainings fallen danach heraus)
      var TERMINE_ANZAHL = 3;       // so viele zeigt die Startseite
      var TERMINE_WARTEZEIT = 6000; // ms; danach statt der Platzhalter die Zeile „Alle Termine im Kalender ›“

      var MONATE = ["JAN", "FEB", "MÄR", "APR", "MAI", "JUN", "JUL", "AUG", "SEP", "OKT", "NOV", "DEZ"];
      var MONATE_LANG = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
      var WOCHENTAGE = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
      var WOCHENTAGE_LANG = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
      var PFEIL_SVG = '<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 6l6 6-6 6"/></svg>';
      var KALENDER_SVG = '<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>';

      function element(tag, klasse, text) {
        var el = document.createElement(tag);
        if (klasse) el.className = klasse;
        if (text !== undefined) el.textContent = text;
        return el;
      }

      function zweistellig(zahl) {
        return (zahl < 10 ? "0" : "") + zahl;
      }

      // Kalenderteile eines Zeitpunkts in deutscher Zeit (Europe/Berlin):
      // die Termine finden in Frankfurt statt, auch wenn das Telefon gerade
      // auf eine andere Zeitzone steht. Ohne Intl-Zeitzonen: Gerätezeit.
      var berlinFormat = null;
      try {
        berlinFormat = new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", hour12: false });
      } catch (e) {
        berlinFormat = null;
      }

      function datumsTeile(datum) {
        if (berlinFormat && berlinFormat.formatToParts) {
          try {
            var t = {};
            berlinFormat.formatToParts(datum).forEach(function (teil) { t[teil.type] = parseInt(teil.value, 10); });
            if (isFinite(t.year) && isFinite(t.month) && isFinite(t.day) && isFinite(t.hour) && isFinite(t.minute)) {
              // manche Engines schreiben Mitternacht als „24“
              return { jahr: t.year, monat: t.month - 1, tag: t.day, stunde: t.hour % 24, minute: t.minute };
            }
          } catch (e) { /* Rückfall: Gerätezeit */ }
        }
        return { jahr: datum.getFullYear(), monat: datum.getMonth(), tag: datum.getDate(), stunde: datum.getHours(), minute: datum.getMinutes() };
      }

      function tagesNummer(teile) {
        return Math.round(Date.UTC(teile.jahr, teile.monat, teile.tag) / 86400000);
      }

      function wochentag(teile) {
        return new Date(Date.UTC(teile.jahr, teile.monat, teile.tag)).getUTCDay();
      }

      function uhrzeit(teile) {
        return zweistellig(teile.stunde) + ":" + zweistellig(teile.minute);
      }

      // Kalendertag aus einer Tagesnummer (Gegenstück zu tagesNummer)
      function teileAusNummer(nummer) {
        var d = new Date(nummer * 86400000);
        return { jahr: d.getUTCFullYear(), monat: d.getUTCMonth(), tag: d.getUTCDate(), stunde: 0, minute: 0 };
      }

      function datumKurz(teile) {
        return WOCHENTAGE[wochentag(teile)] + " " + zweistellig(teile.tag) + "." + zweistellig(teile.monat + 1) + ".";
      }

      function datumLang(teile) {
        return WOCHENTAGE_LANG[wochentag(teile)] + ", " + teile.tag + ". " + MONATE_LANG[teile.monat];
      }

      function kategorien(termin) {
        return (Array.isArray(termin.categories) ? termin.categories : []).map(function (k) {
          return String((k && k.title) || "").trim().toLowerCase();
        });
      }

      // Wörter eines Textes, klein, getrennt an allem, was kein Buchstabe
      // ist: „Probetraining-Tag“ → probetraining, tag.
      function woerterVon(text) {
        var s = String(text || "");
        if (s.normalize) s = s.normalize("NFC");
        return s.toLowerCase().split(/[^a-zäöüß]+/).filter(Boolean);
      }

      // Ein Trainingswort: „Training(s)“ und Zusammensetzungen auf
      // „…training“ (Torwarttraining, Hallentraining). Ausgenommen sind
      // Angebote für Neue (Probetraining, Schnuppertraining) – die gehören
      // gerade auf die Startseite – und Wörter, die nur mit „Training“
      // beginnen (Trainingslager).
      var KEIN_TRAINING = ["probetraining", "schnuppertraining"];
      function istTrainingWort(wort) {
        if (KEIN_TRAINING.indexOf(wort) !== -1) return false;
        return wort === "trainings" || /training$/.test(wort);
      }

      // Trainings gehören nicht auf die Startseite (Entscheidung 25.09.2026):
      // öffentlich gibt es nur die D3-Trainings („Freitag Training“) ohne
      // Teamnamen; alle Trainings stehen je Team unter „Mannschaften“ und im
      // Kalender. Erkannt an einem Trainingswort in Kategorie oder Titel –
      // Kategorie „Veranstaltung“ hat immer Vorrang (bleibt stehen).
      function istTraining(termin) {
        var k = kategorien(termin);
        if (k.some(function (titel) { return /veranstaltung/.test(titel); })) return false;
        if (k.some(function (titel) { return woerterVon(titel).some(istTrainingWort); })) return true;
        return woerterVon(termin.title).some(istTrainingWort);
      }

      // Titel behutsam aufräumen, nichts dazuerfinden: Leerraum glätten, die
      // Anhängsel aus dem DFBnet-Spielplan am Ende weg („ (26/27)“,
      // „ (D-Junioren)“, „ (Herren)“ …), Bindestrich zwischen zwei
      // Mannschaften als Gedankenstrich.
      function titelAufraeumen(titel) {
        var text = String(titel || "");
        if (text.normalize) text = text.normalize("NFC");
        text = text.replace(/\s+/g, " ").trim();
        var vorher;
        do {
          vorher = text;
          text = text.replace(/\s*\((?:\d{2}\/\d{2}|\d{4}\/\d{2,4}|[A-G]-Junior(?:inn)?en|Herren|Frauen|Senioren|Alte Herren)\)$/i, "");
        } while (text !== vorher);
        return text.replace(/ - /g, " – ");
      }

      // Letzter Kalendertag eines Termins (Berlin). Endet er genau um
      // Mitternacht, zählt der Vortag (übliche Schreibweise für ganztägige
      // Termine und für „bis 24 Uhr“).
      function letzterTag(e) {
        if (e.ende.getTime() <= e.start.getTime()) return e.startNr;
        var t = datumsTeile(e.ende);
        var nummer = tagesNummer(t);
        if (t.stunde === 0 && t.minute === 0) nummer -= 1;
        return Math.max(nummer, e.startNr);
      }

      // Die nächsten TERMINE_ANZAHL Spiele/Veranstaltungen: gültiges Datum,
      // Titel vorhanden, kein Training, noch nicht vorbei (mit Uhrzeit: bis
      // zum Ende; ganztags: bis zum Ende des letzten Tages, auch wenn
      // dateEnd = dateStart), jeder Termin nur einmal (Schlüssel id und
      // Titel|Beginn – derselbe Termin kann in zwei öffentlichen Kalendern
      // stehen); nach Beginn sortiert.
      function termineFuerStart(liste) {
        var jetzt = Date.now();
        var heuteNr = tagesNummer(datumsTeile(new Date(jetzt)));
        var gesehen = {};
        return (Array.isArray(liste) ? liste : [])
          .map(function (termin, i) {
            termin = termin || {};
            var start = new Date(termin.dateStart);
            var ende = termin.dateEnd ? new Date(termin.dateEnd) : start;
            if (isNaN(ende.getTime()) || ende.getTime() < start.getTime()) ende = start;
            return { termin: termin, i: i, start: start, ende: ende, titel: titelAufraeumen(termin.title) };
          })
          .filter(function (e) {
            if (isNaN(e.start.getTime()) || e.titel === "" || istTraining(e.termin)) return false;
            e.startNr = tagesNummer(datumsTeile(e.start));
            e.endNr = letzterTag(e);
            var aktuell = e.termin.allDay === true ? e.endNr >= heuteNr : e.ende.getTime() >= jetzt;
            if (!aktuell) return false;
            var schluessel = [e.titel.toLowerCase() + "|" + e.start.getTime()];
            if (e.termin.id) schluessel.push("id|" + e.termin.id);
            if (schluessel.some(function (s) { return gesehen[s]; })) return false;
            schluessel.forEach(function (s) { gesehen[s] = true; });
            return true;
          })
          .sort(function (a, b) {
            return (a.start.getTime() - b.start.getTime()) || (a.i - b.i);
          })
          .slice(0, TERMINE_ANZAHL);
      }

      // Eine Zeile: Datumskachel (Tag/Monat; heute gefüllt), Titel
      // (höchstens zwei Zeilen), darunter „Morgen · 09:00 Uhr“ bzw.
      // „Sa · 09:00 Uhr“, „Heute · ganztags“, mehrtägig „Fr bis So 25.10.“
      // oder, wenn schon begonnen, „Noch bis morgen“ bzw. „Noch bis So
      // 25.10.“ (Kachel = heute).
      // Ganze Zeile = Link ins Kalendermodul (nav://, zuverlässig in der
      // App; App.navigate öffnete im Test 21.09.2026 nichts).
      function baueTerminZeile(e, heute) {
        var start = datumsTeile(e.start);
        var laeuft = e.startNr < heute.nr;
        var mehrtaegig = e.endNr > e.startNr;
        var anzeigeNr = laeuft ? heute.nr : e.startNr;
        var anzeige = laeuft ? heute.teile : start;
        var abstand = anzeigeNr - heute.nr;
        var tagWort = abstand === 0 ? "Heute" : (abstand === 1 ? "Morgen" : WOCHENTAGE[wochentag(start)]);
        var ganztags = e.termin.allDay === true;
        var letzte = teileAusNummer(e.endNr);
        var kurzText, vorlesen;

        if (mehrtaegig && laeuft) {
          var rest = e.endNr - heute.nr;
          kurzText = rest === 0 ? "Heute letzter Tag" : (rest === 1 ? "Noch bis morgen" : "Noch bis " + datumKurz(letzte));
          vorlesen = rest === 0 ? "heute letzter Tag" : "läuft noch bis " + (rest === 1 ? "morgen, " : "") + datumLang(letzte);
        } else if (mehrtaegig) {
          kurzText = tagWort + " bis " + datumKurz(letzte);
          vorlesen = (abstand === 0 ? "ab heute, " : (abstand === 1 ? "ab morgen, " : "")) + datumLang(start) + " bis " + datumLang(letzte);
        } else {
          kurzText = tagWort + " · " + (ganztags ? "ganztags" : uhrzeit(start) + " Uhr");
          var bis = "";
          if (!ganztags && e.ende.getTime() > e.start.getTime()) {
            bis = " bis " + (tagesNummer(datumsTeile(e.ende)) > e.startNr ? "24:00" : uhrzeit(datumsTeile(e.ende)));
          }
          vorlesen = (abstand === 0 ? "heute, " : (abstand === 1 ? "morgen, " : "")) + datumLang(start) + ", " +
            (ganztags ? "ganztägig" : uhrzeit(start) + bis + " Uhr");
        }

        var zeile = element("li", "termin");
        var link = element("a", "termin__link");
        link.href = "nav://" + KALENDER_ID;
        link.setAttribute("data-termin", String(e.termin.id || ""));

        var kachel = element("span", abstand === 0 ? "termin__datum termin__datum--heute" : "termin__datum");
        kachel.setAttribute("aria-hidden", "true");
        kachel.appendChild(element("span", "termin__tag", zweistellig(anzeige.tag)));
        kachel.appendChild(element("span", "termin__monat", MONATE[anzeige.monat]));

        var text = element("span", "termin__text");
        text.appendChild(element("span", "termin__titel", e.titel));
        var kurz = element("span", "termin__zeit", kurzText);
        kurz.setAttribute("aria-hidden", "true");
        text.appendChild(kurz);
        // vollständig für Bildschirmleser, mit Trenner nach dem Titel, z. B.
        // „…, morgen, Samstag, 26. September, 09:00 bis 11:00 Uhr“
        text.appendChild(element("span", "vh", ", " + vorlesen));

        link.appendChild(kachel);
        link.appendChild(text);
        zeile.appendChild(link);
        zeile.setAttribute("data-tag", String(anzeigeNr));
        return zeile;
      }

      // Rückfall (Fehler, Zeitüberschreitung, keine passenden Termine): die
      // Karte schrumpft auf eine ruhige Zeile „Alle Termine im Kalender ›“ –
      // kein leerer Kasten, keine Fehlermeldung.
      function zeigeTermineErsatz() {
        var karte = document.getElementById("termine");
        var liste = document.getElementById("termine-liste");
        if (!karte || !liste || !liste.parentNode) return;
        var link = element("a", "termine-ersatz");
        link.href = "nav://" + KALENDER_ID;
        var symbol = element("span", "termine-ersatz__symbol");
        symbol.setAttribute("aria-hidden", "true");
        symbol.innerHTML = KALENDER_SVG;
        link.appendChild(symbol);
        link.appendChild(element("span", "termine-ersatz__text", "Alle Termine im Kalender"));
        link.insertAdjacentHTML("beforeend", PFEIL_SVG);
        karte.classList.add("termine-karte--kurz");
        liste.parentNode.replaceChild(link, liste);
      }

      function zeigeTermine(eintraege) {
        var liste = document.getElementById("termine-liste");
        if (!liste) return;
        if (!eintraege || !eintraege.length) { zeigeTermineErsatz(); return; }
        var heuteTeile = datumsTeile(new Date());
        var heute = { nr: tagesNummer(heuteTeile), teile: heuteTeile };
        var neu = document.createDocumentFragment();
        var letzterAnzeigeTag = null;
        eintraege.forEach(function (e) {
          var zeile = baueTerminZeile(e, heute);
          // Mehrere Termine am selben Tag (Spieltag-Samstag): die Kachel nur
          // beim ersten, darunter bleibt ihr Platz leer – liest sich wie ein
          // Kalender und wiederholt nicht dreimal „26 SEP“.
          var tag = zeile.getAttribute("data-tag");
          if (tag === letzterAnzeigeTag) zeile.classList.add("termin--gleicher-tag");
          letzterAnzeigeTag = tag;
          neu.appendChild(zeile);
        });
        liste.innerHTML = "";
        liste.appendChild(neu);
        liste.removeAttribute("aria-busy");
      }

      // Für alle, auch Gäste (öffentlicher Token). Antwort spätestens nach
      // TERMINE_WARTEZEIT, sonst Rückfall-Zeile; eine spätere Antwort wird
      // verworfen (kein nachträglicher Sprung).
      function ladeTermine() {
        if (!document.getElementById("termine-liste")) return;
        if (!window.fetch || !window.Promise) { zeigeTermineErsatz(); return; }
        var erledigt = false;
        var abbruch = null;
        try { abbruch = window.AbortController ? new AbortController() : null; } catch (e) { abbruch = null; }
        function fertig(eintraege) {
          if (erledigt) return;
          erledigt = true;
          clearTimeout(uhr);
          try { zeigeTermine(eintraege); } catch (e) { zeigeTermineErsatz(); }
        }
        var uhr = setTimeout(function () {
          if (abbruch) { try { abbruch.abort(); } catch (e) { /* egal */ } }
          fertig(null);
        }, TERMINE_WARTEZEIT);
        var abfrage = 'query { listUpcomingCalendarEvents(componentId: "' + KALENDER_ID + '", amount: ' + TERMINE_ABFRAGE +
          ') { id calendarId title subTitle dateStart dateEnd allDay categories { title color } } }';
        var optionen = {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": "Bearer " + TERMINE_TOKEN },
          body: JSON.stringify({ query: abfrage }),
          // keine Cookies mitschicken: der Token reicht, und die Antwort
          // braucht so keine Freigabe für Anmeldedaten
          credentials: "omit"
        };
        if (abbruch) optionen.signal = abbruch.signal;
        Promise.resolve()
          .then(function () { return fetch(TERMINE_API, optionen); })
          .then(function (antwort) {
            if (!antwort.ok) throw new Error("HTTP " + antwort.status);
            return antwort.json();
          })
          .then(function (json) {
            var liste = json && json.data && json.data.listUpcomingCalendarEvents;
            if (!Array.isArray(liste)) throw new Error("keine Termine");
            fertig(termineFuerStart(liste));
          })
          .catch(function () { fertig(null); });
      }

      ladeTermine();
    })();
    </script>
    </section>

    <!-- HINWEIS: im CMS-Quelltext pflegen oder samt <aside> entfernen -->
    <aside class="hinweis-karte" aria-label="Hinweis">
      <p><span class="p-schild" aria-hidden="true">P</span><strong class="hinweis__titel">Parkplatz wegen Neubau gesperrt.</strong> Zugang über den Hintereingang am „Haus&nbsp;der&nbsp;Jugend“ (Pavillon), voraussichtlich bis&nbsp;Ende&nbsp;Januar&nbsp;2027.</p>
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

<!-- BANDE: Logos aus dem Sponsoren-Worksheet (CMS, Häkchen „showSlider“,
     Reihenfolge „sponSort“), pflegt die 1. Vorsitzende selbst. Tippen
     öffnet „Sponsoren & Partner“. Fußstreifen am Seitenende; ohne Treffer
     klappt er ganz weg. -->
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
    // Eltern = <main class="inhalt">: das Blatt wird zum letzten Element
    // und bekommt unten den Safe-Area-Abstand (.inhalt--ohne-bande).
    if (bande.parentNode && bande.parentNode.classList) bande.parentNode.classList.add("inhalt--ohne-bande");
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
