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

/* Speuzer Blau-Weiß – Mannschaften_v3.tpl (C1)
   appack-Vorlage für die Seite "Fußball: alle aktiven Mannschaften". Kopf- und Tab-Leiste
   kommen von der App-Huelle und sind NICHT Teil dieser Vorlage (kein eigener
   Kopf, kein eigener Fuss). Erzeugt aus src/app/v3-basis.css + src/app/Mannschaften_v3.html
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

/* Mannschaften_v3.tpl – seitenspezifisch (C1). */

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

.filterleiste {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
  margin-bottom: var(--sp-4);
}

.filter-knopf {
  min-height: 44px;
  border: none;
  cursor: pointer;
  font-family: inherit;
}

.filter-knopf--aktiv {
  background: var(--blau-700);
  color: var(--weiss);
}

.mannschaften-liste {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}

/* Fotos und Logos vollstaendig zeigen (kein Beschnitt von Koepfen oder
   Logos): feste Hoehe, Bild eingepasst, ruhige Flaeche in Vereinsblau-50. */
.team-karte__bild {
  display: block;
  width: 100%;
  height: 200px;
  object-fit: contain;
  object-position: center;
  background: var(--blau-50);
  border-radius: var(--r-md);
  margin-bottom: var(--sp-3);
}

.team-karte__titel {
  font-family: var(--font-head);
  font-weight: 700;
  font-size: 22px;
  margin: 0 0 4px;
  color: var(--blau-950);
}

.team-karte__untertitel {
  margin: 0 0 var(--sp-2);
  font-size: 13px;
  color: var(--ink-3);
}

.team-karte__details {
  margin-top: var(--sp-2);
  font-size: 14px;
  color: var(--ink-2);
}

.team-karte__details summary {
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  color: var(--blau-700);
}

.team-karte__details > div {
  margin-top: var(--sp-2);
}

.team-karte__zeiten {
  list-style: none;
  padding: 0;
  margin: var(--sp-3) 0 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  color: var(--ink-2);
}

.team-karte__kontakt {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
  flex-wrap: wrap;
  margin-top: var(--sp-3);
  padding-top: var(--sp-3);
  border-top: 1px solid var(--line);
}

.team-karte__kontakt-text {
  font-size: 14px;
  font-weight: 600;
  overflow-wrap: break-word;
}

.team-karte__kontakt-aktionen {
  display: flex;
  gap: var(--sp-2);
  flex-wrap: wrap;
}

.icon-knopf {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding-inline: var(--sp-3);
  border-radius: var(--r-md);
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--blau-800);
  font-weight: 600;
  font-size: 13px;
  text-decoration: none;
}

.icon-knopf svg { width: 18px; height: 18px; }

.team-karte__buttons {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
  margin-top: var(--sp-3);
}
</style>
</head>
<body>
<main class="inhalt">

<h1 class="visually-hidden">Mannschaften</h1>

<div id="filterleiste" class="filterleiste" hidden>
  <button type="button" class="tag filter-knopf filter-knopf--aktiv" data-gruppe="">Alle</button>
  <button type="button" class="tag filter-knopf" data-gruppe="herren" hidden>Herren</button>
  <button type="button" class="tag filter-knopf" data-gruppe="jugend" hidden>Jugend</button>
  <button type="button" class="tag filter-knopf" data-gruppe="schule" hidden>Fußballschule</button>
</div>

<div id="mannschaften-liste" class="mannschaften-liste"></div>

<h2 id="fussballschulen-titel" class="abschnittstitel" hidden>Fußballschulen (Zusatzangebot)</h2>
<div id="fussballschulen-liste" class="mannschaften-liste"></div>

<div class="aktionen">
  <a class="knopf" href="mailto:jugendleitung@sportfreunde04.de?subject=Probetraining%20beim%20FFV%20Sportfreunde%2004&amp;body=Hallo%2C%0A%0Awir%20interessieren%20uns%20f%C3%BCr%20ein%20Probetraining.%0AJahrgang%20des%20Kindes%3A%20%0AVorerfahrung%3A%20%0A%0AViele%20Gr%C3%BC%C3%9Fe">Probetraining vereinbaren</a>
</div>
<a class="zeile" href="nav://sportfreunde04_TextImage_1783345459688">
  <span class="zeile__text"><span class="zeile__titel">Spielplan &amp; Tabellen</span></span>
  <svg class="zeile__pfeil" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7"/></svg>
</a>

</main>

<script src="https://cdn.appack.de/modules/common/jquery-3.4.1.min.js"></script>
<script src="https://cdn.appack.de/modules/appack.workbook-1.4.1.js"></script>
<script>
(function () {
  "use strict";

  var UEBERSICHT_ID = "6a1ec5fcf68a05bf129cdb7a";
  var TRAININGSZEITEN_ID = "6a1ec5fcf68a05bf129cdb7e";
  var BUTTONS_ID = "6a1ec5fcf68a05bf129cdb82";
  var KATEGORIEN_ID = "6a1ec5fcf68a05bf129cdb85";
  var EINSTELLUNGEN_ID = "6a1ec5fcf68a05bf129cdb89";

  var ICON_MAIL = '<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M4 6.5l8 6 8-6"/></svg>';
  var ICON_PHONE = '<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4.5 3.5h3.2c.5 0 .9.3 1 .8l.9 3a1.1 1.1 0 0 1-.3 1.1L7.8 9.9a13 13 0 0 0 6.3 6.3l1.5-1.5c.3-.3.7-.4 1.1-.3l3 .9c.5.1.8.5.8 1v3.2c0 .8-.7 1.4-1.5 1.3-8-1-14.4-7.4-15.4-15.4-.1-.8.5-1.5 1.3-1.5z"/></svg>';

  // ---------- Hilfsfunktionen (defensiv: Felder können fehlen/null/leer sein) ----------

  function textFeld(zeile, name) {
    var v = zeile && zeile[name];
    return (v === undefined || v === null) ? "" : String(v);
  }

  function hatFeld(zeile, name) {
    return textFeld(zeile, name) !== "";
  }

  function sicheresHtml(html) {
    var div = document.createElement("div");
    div.innerHTML = String(html || "");
    var scripts = div.querySelectorAll("script");
    for (var i = 0; i < scripts.length; i++) scripts[i].remove();
    return div.innerHTML;
  }

  // Kein eigenes Nummernformat, nur Ziffern/"+" extrahieren, wenn vorhanden –
  // sonst den Rohwert übernehmen (Testfall "tel-platzhalter" o. Ä.).
  function telHref(nummer) {
    var extrahiert = String(nummer || "").replace(/[^\d+]/g, "");
    return "tel:" + (extrahiert || nummer);
  }

  function ladeWorkbook(id) {
    if (!window.Workbook || typeof Workbook.load !== "function") {
      return Promise.reject(new Error("Workbook-API fehlt"));
    }
    return Workbook.load({ workbook: id, filter: {}, offset: 0, limit: 5000, sort: "_id", direction: "asc" })
      .then(function (rows) { return Array.isArray(rows) ? rows : []; });
  }

  // ---------- Gruppierung für die Filterpillen ----------

  // Fußballschulen (externes, kostenpflichtiges Zusatzangebot) tragen im
  // Worksheet dieselbe Kategorie "fussball", zählen aber nicht als
  // Mannschaft und erscheinen als eigener Abschnitt (QA-Befund, C2
  // Abschnitt 7).
  function istFussballschule(team) {
    var t = String(team || "");
    return /^fu[ßs]{1,2}ballschule/i.test(t) || /academy/i.test(t) || /athletik/i.test(t);
  }

  function gruppeVonTeam(team) {
    var t = String(team || "");
    if (istFussballschule(t)) return "schule";
    if (/herren/i.test(t) || /soma/i.test(t)) return "herren";
    return "jugend";
  }

  // ---------- Sortierung: sortNumber aufsteigend (fehlend ans Ende), dann team ----------

  function vergleicheTeams(a, b) {
    var an = typeof a.sortNumber === "number" ? a.sortNumber : Infinity;
    var bn = typeof b.sortNumber === "number" ? b.sortNumber : Infinity;
    if (an !== bn) return an - bn;
    return textFeld(a, "team").localeCompare(textFeld(b, "team"), "de");
  }

  // ---------- Trainingszeile ----------

  function trainingszeitenZeilen(team, trainingszeiten) {
    var id = textFeld(team, "id");
    return trainingszeiten.filter(function (z) {
      return textFeld(z, "trainingID") === id && (hatFeld(z, "day") || hatFeld(z, "time"));
    });
  }

  function trainingszeitText(z) {
    var teile = [];
    if (hatFeld(z, "day")) teile.push(textFeld(z, "day"));
    if (hatFeld(z, "time")) {
      var zeitText = textFeld(z, "time");
      if (!/uhr\s*$/i.test(zeitText)) zeitText += " Uhr";
      teile.push(zeitText);
    }
    var ort = textFeld(z, "locationDescription") || textFeld(z, "location");
    if (ort) teile.push(ort);
    return teile.join(" · ");
  }

  // ---------- Kontaktzeile (Trainer/in o. Ä.) ----------

  function baueKontaktZeile(zeile, titelFeld, nameFeld, mailFeld, phoneFeld, handyFeld) {
    var titel = textFeld(zeile, titelFeld);
    var name = textFeld(zeile, nameFeld);
    if (!titel && !name) return null;

    var kontakt = document.createElement("div");
    kontakt.className = "team-karte__kontakt";

    var text = document.createElement("span");
    text.className = "team-karte__kontakt-text";
    text.textContent = [titel, name].filter(Boolean).join(" ");
    kontakt.appendChild(text);

    var aktionen = document.createElement("span");
    aktionen.className = "team-karte__kontakt-aktionen";

    var mail = textFeld(zeile, mailFeld);
    if (mail) {
      var mailLink = document.createElement("a");
      mailLink.className = "icon-knopf";
      mailLink.href = "mailto:" + mail;
      mailLink.innerHTML = ICON_MAIL + "<span>E-Mail</span>";
      aktionen.appendChild(mailLink);
    }

    // Anrufen nur ohne Mail-Adresse: Trainer-Kontakte laufen über die
    // Vereinsmail, private Handynummern bleiben sonst unsichtbar
    // (QA-Befund, C2 Abschnitt 7). Handy vor Festnetz, falls beides gefüllt ist.
    var telNummer = textFeld(zeile, handyFeld) || textFeld(zeile, phoneFeld);
    if (!mail && telNummer) {
      var telLink = document.createElement("a");
      telLink.className = "icon-knopf";
      telLink.href = telHref(telNummer);
      telLink.innerHTML = ICON_PHONE + "<span>Anrufen</span>";
      aktionen.appendChild(telLink);
    }

    if (mail || telNummer) kontakt.appendChild(aktionen);
    return kontakt;
  }

  // ---------- Buttons (Modul-Buttons-Worksheet) ----------

  function baueButtons(team, buttons) {
    var id = textFeld(team, "id");
    var passende = buttons.filter(function (b) {
      if (textFeld(b, "buttonID") !== id) return false;
      var link = textFeld(b, "buttonLink");
      return /^(https?:|nav:\/\/|mailto:|tel:)/i.test(link);
    });
    if (!passende.length) return null;

    var wrapper = document.createElement("div");
    wrapper.className = "team-karte__buttons";
    for (var i = 0; i < passende.length; i++) {
      var b = passende[i];
      var buttonLink = textFeld(b, "buttonLink");
      var link = document.createElement("a");
      link.className = "knopf knopf--leise";
      link.href = buttonLink;
      link.textContent = textFeld(b, "buttonText") || "Mehr";
      if (b.externalLink === true || /^https?:/i.test(buttonLink)) {
        link.target = "_blank";
        link.rel = "noopener";
      }
      wrapper.appendChild(link);
    }
    return wrapper;
  }

  // ---------- Teamkarte ----------

  // Bild-URLs aus den Worksheets: nur absolute http(s)-Adressen verwenden
  // (im Feld stehen gelegentlich Ids oder Reste), und ein Bild, das nicht
  // laedt, wieder aus der Karte nehmen statt eine leere Flaeche zu lassen.
  function bildUrlGueltig(url) {
    return /^https?:\/\//i.test(url || "");
  }
  function bildMitRueckbau(url, klasse, alt) {
    var bild = document.createElement("img");
    bild.className = klasse;
    bild.src = url;
    bild.alt = alt || "";
    bild.loading = "lazy";
    bild.addEventListener("error", function () {
      if (bild.parentNode) bild.parentNode.removeChild(bild);
    });
    return bild;
  }

  function baueTeamKarte(team, trainingszeiten, buttons, beschreibungOffen, istZusatzangebot) {
    var karte = document.createElement("div");
    karte.className = "karte team-karte";

    var bildUrl = [textFeld(team, "sliderImage1"), textFeld(team, "categoryImage")].filter(bildUrlGueltig)[0];
    if (bildUrl) {
      karte.appendChild(bildMitRueckbau(bildUrl, "team-karte__bild", ""));
    }

    if (istZusatzangebot) {
      var zusatzTag = document.createElement("span");
      zusatzTag.className = "tag";
      zusatzTag.textContent = "Zusatzangebot, kostenpflichtig";
      karte.appendChild(zusatzTag);
    }

    var titel = document.createElement("p");
    titel.className = "team-karte__titel";
    titel.textContent = textFeld(team, "team");
    karte.appendChild(titel);

    var trainingTitle = textFeld(team, "trainingTitle");
    if (trainingTitle) {
      var untertitel = document.createElement("p");
      untertitel.className = "team-karte__untertitel";
      untertitel.textContent = trainingTitle;
      karte.appendChild(untertitel);
    }

    var beschreibung = textFeld(team, "description");
    if (beschreibung) {
      var details = document.createElement("details");
      details.className = "team-karte__details";
      if (beschreibungOffen) details.open = true;
      var summary = document.createElement("summary");
      summary.textContent = "Mehr zur Mannschaft";
      details.appendChild(summary);
      var inhalt = document.createElement("div");
      inhalt.innerHTML = sicheresHtml(beschreibung);
      details.appendChild(inhalt);
      karte.appendChild(details);
    }

    var zeiten = trainingszeitenZeilen(team, trainingszeiten);
    if (zeiten.length) {
      var liste = document.createElement("ul");
      liste.className = "team-karte__zeiten";
      for (var i = 0; i < zeiten.length; i++) {
        var li = document.createElement("li");
        li.textContent = trainingszeitText(zeiten[i]);
        liste.appendChild(li);
      }
      karte.appendChild(liste);
    }

    var kontakt1 = baueKontaktZeile(team, "firstContactTitle", "firstContactName", "firstContactMail", "firstContactPhone", "firstContactHandy");
    if (kontakt1) karte.appendChild(kontakt1);
    var kontakt2 = baueKontaktZeile(team, "secondContactTitle", "secondContactName", "secondContactMail", "secondContactPhone", "secondContactHandy");
    if (kontakt2) karte.appendChild(kontakt2);

    var buttonsBlock = baueButtons(team, buttons);
    if (buttonsBlock) karte.appendChild(buttonsBlock);

    return karte;
  }

  // ---------- Fehlerhinweis ----------

  function zeigeFehler(container) {
    container.innerHTML = "";
    var hinweis = document.createElement("div");
    hinweis.className = "hinweis";
    var p = document.createElement("p");
    p.textContent = "Die Mannschaften konnten gerade nicht geladen werden.";
    hinweis.appendChild(p);
    container.appendChild(hinweis);
  }

  // ---------- Hauptablauf ----------

  var listeContainer = document.getElementById("mannschaften-liste");
  var fussballschulenTitel = document.getElementById("fussballschulen-titel");
  var fussballschulenContainer = document.getElementById("fussballschulen-liste");
  var filterleiste = document.getElementById("filterleiste");

  Promise.all([
    ladeWorkbook(UEBERSICHT_ID),
    ladeWorkbook(TRAININGSZEITEN_ID),
    ladeWorkbook(BUTTONS_ID),
    ladeWorkbook(KATEGORIEN_ID),
    ladeWorkbook(EINSTELLUNGEN_ID)
  ]).then(function (ergebnisse) {
    var uebersicht = ergebnisse[0];
    var trainingszeiten = ergebnisse[1];
    var buttons = ergebnisse[2];
    var einstellungenZeilen = ergebnisse[4];
    var einstellungen = einstellungenZeilen[0] || {};
    var beschreibungOffen = einstellungen.showContent === true;

    var teams = uebersicht
      .filter(function (z) { return z.isActive === true && String(z.category || "").toLowerCase() === "fussball"; })
      .slice()
      .sort(vergleicheTeams);

    if (!teams.length) {
      listeContainer.innerHTML = "";
      fussballschulenTitel.hidden = true;
      fussballschulenContainer.innerHTML = "";
      var hinweis = document.createElement("div");
      hinweis.className = "hinweis";
      var p = document.createElement("p");
      p.textContent = "Aktuell sind keine Mannschaften hinterlegt.";
      hinweis.appendChild(p);
      listeContainer.appendChild(hinweis);
      return;
    }

    // Mannschaften und Fußballschulen (externes, kostenpflichtiges
    // Zusatzangebot, tragen dieselbe Worksheet-Kategorie "fussball")
    // getrennt halten (QA-Befund, C2 Abschnitt 7).
    var mannschaften = teams.filter(function (t) { return !istFussballschule(textFeld(t, "team")); });
    var fussballschulen = teams.filter(function (t) { return istFussballschule(textFeld(t, "team")); });

    // Belegung der drei Filtergruppen für die "≥ 2 Gruppen belegt"-Regel.
    var zaehler = { herren: 0, jugend: 0, schule: 0 };
    teams.forEach(function (t) { zaehler[gruppeVonTeam(textFeld(t, "team"))]++; });
    var belegteGruppen = Object.keys(zaehler).filter(function (g) { return zaehler[g] > 0; }).length;

    var aktuellerFilter = "";

    function rendern() {
      listeContainer.innerHTML = "";
      fussballschulenContainer.innerHTML = "";

      var mannschaftenSichtbar = aktuellerFilter === "schule" ? [] :
        (aktuellerFilter ? mannschaften.filter(function (t) { return gruppeVonTeam(textFeld(t, "team")) === aktuellerFilter; }) : mannschaften);
      for (var i = 0; i < mannschaftenSichtbar.length; i++) {
        listeContainer.appendChild(baueTeamKarte(mannschaftenSichtbar[i], trainingszeiten, buttons, beschreibungOffen, false));
      }

      var schuleSichtbar = (aktuellerFilter === "" || aktuellerFilter === "schule") ? fussballschulen : [];
      fussballschulenTitel.hidden = schuleSichtbar.length === 0;
      for (var j = 0; j < schuleSichtbar.length; j++) {
        fussballschulenContainer.appendChild(baueTeamKarte(schuleSichtbar[j], trainingszeiten, buttons, beschreibungOffen, true));
      }
    }

    if (belegteGruppen >= 2) {
      filterleiste.hidden = false;
      var knoepfe = filterleiste.querySelectorAll(".filter-knopf");
      for (var i = 0; i < knoepfe.length; i++) {
        var knopf = knoepfe[i];
        var gruppe = knopf.getAttribute("data-gruppe");
        if (gruppe && zaehler[gruppe] === 0) continue; // Gruppe ohne Treffer: kein Pill dafür
        knopf.hidden = false;
        knopf.addEventListener("click", function () {
          aktuellerFilter = this.getAttribute("data-gruppe");
          for (var j = 0; j < knoepfe.length; j++) knoepfe[j].classList.remove("filter-knopf--aktiv");
          this.classList.add("filter-knopf--aktiv");
          rendern();
        });
      }
    }

    rendern();
  }).catch(function () {
    fussballschulenTitel.hidden = true;
    fussballschulenContainer.innerHTML = "";
    zeigeFehler(listeContainer);
  });
})();
</script>
</body>
</html>
