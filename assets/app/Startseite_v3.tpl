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
/* Speuzer Blau-Weiß – Startseite_v3.tpl (B1)
   appack-Vorlage fuer die Seite "Start" (Datenquelle "Start" im CMS).
   Kopf- und Tab-Leiste kommen von der App-Huelle und sind NICHT Teil
   dieser Vorlage (kein eigener Kopf, kein eigener Fuss). Farben/Schrift/
   Abstaende ausschliesslich aus assets/css/tokens.css; Bausteine (Karte,
   Zeile, Abschnittstitel, Knopf, Knopf leise, Tag, Hinweis, Datumsblock)
   aus assets/css/app-konzept.css uebernommen. Kein Foto, keine Kacheln,
   keine Sponsorenleiste, kein Eintracht-Design. */

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

/* [hidden] muss auch gegen die eigenen display:flex/inline-flex-Regeln unten
   gewinnen (Profil-Knopf/Registrieren-Pille, Schritt 1.1) – ohne diese Regel
   gewinnt die spezifischere Klassenregel gegen das UA-Stylesheet. */
[hidden] { display: none !important; }

.inhalt {
  padding: var(--sp-4);
  /* Die schwebende Tab-Leiste der App liegt über dem Seitenende (gemessen 21.09.2026) */
  padding-bottom: 96px;
}

/* === 4. Bausteine aus assets/css/app-konzept.css === */

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

/* Datumsblock (Baustein aus app-konzept.css, dort Teil von .app-termin-karte__datum) */

.datumsblock {
  flex: 0 0 auto;
  width: 52px;
  text-align: center;
}

.datumsblock__tag {
  display: block;
  font-family: var(--font-head);
  font-weight: 700;
  font-size: 28px;
  line-height: 1;
  color: var(--blau-950);
}

.datumsblock__monat {
  display: block;
  margin-top: 2px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--ink-3);
}

/* === 5. Begruessung === */

.gruss-zeile {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
}

.gruss-zeile h1 {
  margin: 0;
  font-family: var(--font-head);
  font-weight: 700;
  font-size: 26px;
  color: var(--blau-950);
}

.profil-knopf {
  flex: 0 0 auto;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
}

.profil-knopf__kreis {
  width: 36px;
  height: 36px;
  border-radius: var(--r-pill);
  background: var(--blau-700);
  color: var(--weiss);
  display: flex;
  align-items: center;
  justify-content: center;
}

.profil-knopf__kreis svg { width: 20px; height: 20px; }

.registrieren-pille {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding-inline: var(--sp-4);
  border-radius: var(--r-pill);
  background: var(--blau-700);
  color: var(--weiss);
  font-weight: 600;
  font-size: 14px;
  text-decoration: none;
}

/* === 6. Termine === */

.termine {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}

.termin-karte {
  display: flex;
  gap: var(--sp-4);
}

.termin-karte__inhalt {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.termin-karte__titel {
  margin: 4px 0 0;
  font-weight: 600;
  font-size: 15px;
}

.termin-karte__zeile {
  margin: 0;
  font-size: 13px;
  color: var(--ink-2);
}

.termin-karte__knoepfe {
  display: flex;
  gap: var(--sp-3);
  flex-wrap: wrap;
  margin-top: var(--sp-2);
}

.termin-karte__knoepfe .knopf {
  flex: 1 1 auto;
  min-width: 0;
  padding-inline: var(--sp-3);
}

.termine-leer p {
  margin: 0;
  font-size: 14px;
  color: var(--ink-2);
}

/* === 7. Aktuelles (News-Widget-Vorlage im Stil .karte) === */

.aktuelles { display: flex; flex-direction: column; gap: var(--sp-3); }

.news-karte {
  display: block;
}

.news-karte__titel {
  font-family: var(--font-text);
  font-weight: 600;
  font-size: 15px;
  margin: 0 0 4px;
}

.news-karte__datum {
  font-size: 13px;
  color: var(--ink-3);
  margin: 0 0 6px;
}

.news-karte__text {
  font-size: 14px;
  color: var(--ink-2);
  margin: 0 0 var(--sp-2);
}

.news-karte__fuss {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-2);
}

.news-karte__weiterlesen {
  font-weight: 600;
  font-size: 13px;
  color: var(--blau-700);
  text-decoration: none;
}

/* === 8. Aktionen und Fuss === */

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
</style>
</head>
<body>
<script>window.profileJSON = [#if profile_json?has_content]${profile_json}[#else]{}[/#if];</script>
<main class="inhalt">

<section class="gruss">
  <div class="gruss-zeile">
    <h1 id="gruss">Guten Tag!</h1>
    <a id="profil-knopf" class="profil-knopf" href="nav://sportfreunde04_Profile_1783059427823" aria-label="Profil">
      <span class="profil-knopf__kreis"><svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c0-4.1 3.4-6.5 7.5-6.5s7.5 2.4 7.5 6.5"/></svg></span>
    </a>
    <a id="registrieren-pille" class="registrieren-pille" href="nav://sportfreunde04_Profile_1783059427823" hidden>Registrieren</a>
  </div>
</section>

<h2 class="abschnittstitel">Heute und demnächst</h2>
<!-- Zu-/Absage passiert im Kalendermodul; die Vorlage kann sie nicht selbst auslösen. -->
<div id="termine" class="termine"></div>
<a class="zeile" href="nav://sportfreunde04_Application_1780401660369">
  <span class="zeile__text"><span class="zeile__titel">Alle Termine</span></span>
  <svg class="zeile__pfeil" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7"/></svg>
</a>

<h2 class="abschnittstitel">Aktuelles</h2>
<div
  class="news aktuelles"
  applicationId="sportfreunde04_Application_1780401660371"
  limit="2"
  sourceTag="true"
  maxBodyLength="90"
  news-widget>
  <div class="card mb-3 relative karte news-karte">
    <div class="newsWallTitle news-karte__titel"></div>
    <div class="newsWallDate news-karte__datum"></div>
    <div class="newsWallBody news-karte__text"></div>
    <div class="news-karte__fuss">
      <span class="readMore news-karte__weiterlesen">Weiterlesen</span>
      <span class="sourceTag tag"></span>
    </div>
  </div>
</div>
<a class="zeile" href="nav://sportfreunde04_Application_1780401660371">
  <span class="zeile__text"><span class="zeile__titel">Alle Meldungen</span></span>
  <svg class="zeile__pfeil" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7"/></svg>
</a>

<!-- HINWEIS: im CMS-Quelltext pflegen oder leeren -->
<div class="hinweis"><p>Der Parkplatz am Vereinsgelände ist wegen des Neubaus des Funktionsgebäudes voraussichtlich bis Ende Januar 2027 gesperrt. Der Zugang zum Gelände ist über den Hintereingang am „Haus der Jugend“ (Pavillon) möglich.</p></div>

<div class="aktionen">
  <a class="knopf" href="mailto:jugendleitung@sportfreunde04.de?subject=Probetraining%20beim%20FFV%20Sportfreunde%2004&amp;body=Hallo%2C%0A%0Awir%20interessieren%20uns%20f%C3%BCr%20ein%20Probetraining.%0AJahrgang%20des%20Kindes%3A%20%0AVorerfahrung%3A%20%0A%0AViele%20Gr%C3%BC%C3%9Fe">Probetraining vereinbaren</a>
  <!-- Ziel "Mitglied werden": erste passende Kachel aus der Liste der heutigen Startseite (sportfreunde04_List_1784632554073) -->
  [#assign mitgliedHref = ""]
  [#list db.loadList('sportfreunde04_List_1784632554073').entries as entry][#if entry.title?has_content && entry.title == "Mitglied werden"][#assign mitgliedHref][#if entry.contentUrl?has_content]${entry.contentUrl}[#elseif entry.componentLink?has_content]nav://${entry.componentLink}[/#if][/#assign][/#if][/#list]
  <a class="knopf knopf--leise" href="[#if mitgliedHref?has_content]${mitgliedHref}[#else]#[/#if]">Mitglied werden</a>
  [#if !mitgliedHref?has_content]<!-- kein Treffer für "Mitglied werden" in der Kachel-Liste: Ziel bleibt "#" -->[/#if]
</div>

<p class="fuss">F.F.V. Sportfreunde 04 · Vereins-App</p>
</main>

<script src="https://cdn.appack.de/modules/common/jquery-3.4.1.min.js"></script>
<script src="https://cdn.appack.de/modules/graph-api.js"></script>
<script src="https://cdn.appack.de/modules/widgets/component-news-widget.js"></script>
<script>
(function () {
  "use strict";

  var KALENDER_ID = "sportfreunde04_Application_1780401660369";
  var MONATE = ["JAN", "FEB", "MÄR", "APR", "MAI", "JUN", "JUL", "AUG", "SEP", "OKT", "NOV", "DEZ"];

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
    if (!angemeldet) {
      if (profilKnopf) profilKnopf.hidden = true;
      if (registrieren) registrieren.hidden = false;
    }
  }

  // ---------- Termine ----------

  function zweistellig(zahl) {
    return (zahl < 10 ? "0" : "") + zahl;
  }

  function uhrzeit(datum) {
    return zweistellig(datum.getHours()) + ":" + zweistellig(datum.getMinutes());
  }

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

  // Derzeit ungenutzt (siehe Details-Knopf): App.navigate öffnete im Test nichts.
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

  function baueTerminKarte(termin) {
    var start = new Date(termin.dateStart);
    var kategorie = (termin.categories && termin.categories.length && termin.categories[0].title) || "Termin";

    var karte = document.createElement("div");
    karte.className = "karte termin-karte";

    var datumsblock = document.createElement("div");
    datumsblock.className = "datumsblock";
    var tagSpan = document.createElement("span");
    tagSpan.className = "datumsblock__tag";
    tagSpan.textContent = zweistellig(start.getDate());
    var monatSpan = document.createElement("span");
    monatSpan.className = "datumsblock__monat";
    monatSpan.textContent = MONATE[start.getMonth()];
    datumsblock.appendChild(tagSpan);
    datumsblock.appendChild(monatSpan);

    var inhalt = document.createElement("div");
    inhalt.className = "termin-karte__inhalt";

    var tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = kategorie;
    inhalt.appendChild(tag);

    var titel = document.createElement("p");
    titel.className = "termin-karte__titel";
    titel.textContent = termin.title || "";
    inhalt.appendChild(titel);

    var zeile = document.createElement("p");
    zeile.className = "termin-karte__zeile";
    zeile.textContent = terminZeile(termin);
    inhalt.appendChild(zeile);

    if (termin.subTitle) {
      var ort = document.createElement("p");
      ort.className = "termin-karte__zeile";
      ort.textContent = termin.subTitle;
      inhalt.appendChild(ort);
    }

    var knoepfe = document.createElement("div");
    knoepfe.className = "termin-karte__knoepfe";

    // Zu-/Absage bewusst nicht auf der Startseite (Entscheidung 21.09.2026);
    // "Details" öffnet den Termin im Kalendermodul, dort ist die Rückmeldung.
    // Test in der echten App (21.09.2026): App.navigate(...) aus einem Skript
    // öffnete nichts, ein nav://-Link dagegen zuverlässig. Deshalb ein Link
    // auf das Kalendermodul; der Termin steht dort als nächster Eintrag.
    var details = document.createElement("a");
    details.className = "knopf knopf--leise";
    details.href = "nav://" + KALENDER_ID;
    details.setAttribute("data-termin", termin.id || "");
    details.textContent = "Details";

    knoepfe.appendChild(details);
    inhalt.appendChild(knoepfe);

    karte.appendChild(datumsblock);
    karte.appendChild(inhalt);
    return karte;
  }

  // Gast (nicht angemeldet): keine Kalender vorhanden, also kein
  // graphApi-Aufruf (der ohne Anmeldung mit HTTP 401 scheitert) – stattdessen
  // ein Hinweis mit Anmelden-Knopf (QA-Befund, C2 Abschnitt 7).
  function zeigeTermineHinweisGast() {
    var container = document.getElementById("termine");
    if (!container) return;
    container.innerHTML = "";
    var karte = document.createElement("div");
    karte.className = "hinweis";
    var p = document.createElement("p");
    p.textContent = "Nach der Anmeldung siehst du hier deine Termine.";
    karte.appendChild(p);
    var anmelden = document.createElement("a");
    anmelden.className = "knopf";
    anmelden.style.marginTop = "var(--sp-3)";
    anmelden.href = "nav://sportfreunde04_Profile_1783059427823";
    anmelden.textContent = "Anmelden";
    karte.appendChild(anmelden);
    container.appendChild(karte);
  }

  function zeigeTermine(termine) {
    var container = document.getElementById("termine");
    if (!container) return;
    container.innerHTML = "";
    if (!termine || !termine.length) {
      var leer = document.createElement("div");
      leer.className = "karte termine-leer";
      var p = document.createElement("p");
      p.textContent = "Keine anstehenden Termine in deinen Kalendern.";
      leer.appendChild(p);
      container.appendChild(leer);
      return;
    }
    var hoechstens = termine.slice(0, 2);
    for (var i = 0; i < hoechstens.length; i++) {
      container.appendChild(baueTerminKarte(hoechstens[i]));
    }
  }

  function ladeTermine() {
    if (!istAngemeldet()) {
      // Gast ohne eigene Kalender: kein graphApi-Aufruf (401), stattdessen
      // Hinweis + Anmelden-Knopf.
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
  // DOMContentLoaded-Lauf von component-news-widget.js entfernen; die Zeile
  // "Alle Meldungen" bleibt stehen (QA-Befund, C2 Abschnitt 7).
  function entferneNewsWidgetFuerGast() {
    if (istAngemeldet()) return;
    var widget = document.querySelector(".news.aktuelles[news-widget]");
    if (widget && widget.parentNode) widget.parentNode.removeChild(widget);
  }

  begruessung();
  profilKnopfUmschalten();
  ladeTermine();
  entferneNewsWidgetFuerGast();
})();
</script>
</body>
</html>
