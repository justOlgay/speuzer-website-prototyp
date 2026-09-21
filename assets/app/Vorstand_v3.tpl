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

/* Speuzer Blau-Weiß – Vorstand_v3.tpl (C1)
   appack-Vorlage für die Seite "Vorstand & Ansprechpartner". Kopf- und Tab-Leiste
   kommen von der App-Huelle und sind NICHT Teil dieser Vorlage (kein eigener
   Kopf, kein eigener Fuss). Erzeugt aus src/app/v3-basis.css + src/app/Vorstand_v3.html
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

/* Vorstand_v3.tpl – seitenspezifisch (C1). */

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

.kontakte-liste {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  margin-bottom: var(--sp-5);
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

.person-karte__inhalt {
  flex: 1 1 auto;
  min-width: 0;
}

.person-karte__name {
  margin: var(--sp-1) 0 0;
  font-family: var(--font-text);
  font-weight: 600;
  font-size: 16px;
  overflow-wrap: break-word;
}

.person-karte__info {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--ink-2);
}

.person-karte__aktionen {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
  margin-top: var(--sp-3);
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
</style>
</head>
<body>
<main class="inhalt">

<h1 class="visually-hidden">Vorstand &amp; Kontakt</h1>

<div id="filterleiste" class="filterleiste" hidden></div>

<div id="kontakte-liste" class="kontakte-liste"></div>

<div class="liste">
  <a class="zeile" href="nav://sportfreunde04_TextImage_1780401660324">
    <span class="zeile__text"><span class="zeile__titel">Geschäftsstelle &amp; Anfahrt</span></span>
    <svg class="zeile__pfeil" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7"/></svg>
  </a>
  <a class="zeile" href="nav://sportfreunde04_TextImage_1780401660329">
    <span class="zeile__text"><span class="zeile__titel">Mitglied werden</span></span>
    <svg class="zeile__pfeil" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7"/></svg>
  </a>
</div>

</main>

<script src="https://cdn.appack.de/modules/common/jquery-3.4.1.min.js"></script>
<script src="https://cdn.appack.de/modules/appack.workbook-1.4.1.js"></script>
<script>
(function () {
  "use strict";

  var KONTAKTE_ID = "6a1ec5fcf68a05bf129cdb8b";
  var KATEGORIEN_ID = "6a1ec5fcf68a05bf129cdb90";

  var ICON_MAIL = '<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M4 6.5l8 6 8-6"/></svg>';
  var ICON_PHONE = '<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4.5 3.5h3.2c.5 0 .9.3 1 .8l.9 3a1.1 1.1 0 0 1-.3 1.1L7.8 9.9a13 13 0 0 0 6.3 6.3l1.5-1.5c.3-.3.7-.4 1.1-.3l3 .9c.5.1.8.5.8 1v3.2c0 .8-.7 1.4-1.5 1.3-8-1-14.4-7.4-15.4-15.4-.1-.8.5-1.5 1.3-1.5z"/></svg>';
  var ICON_CHAT = '<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 5h16v11H8l-4 3z"/></svg>';
  var ICON_KAMERA = '<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 8h3l2-2h6l2 2h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/></svg>';
  var ICON_GLOBUS = '<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.5 3.8 5.5 3.8 8.5s-1.3 6-3.8 8.5c-2.5-2.5-3.8-5.5-3.8-8.5s1.3-6 3.8-8.5z"/></svg>';

  function textFeld(zeile, name) {
    var v = zeile && zeile[name];
    return (v === undefined || v === null) ? "" : String(v);
  }

  function sicheresHtml(html) {
    var div = document.createElement("div");
    div.innerHTML = String(html || "");
    var scripts = div.querySelectorAll("script");
    for (var i = 0; i < scripts.length; i++) scripts[i].remove();
    return div.innerHTML;
  }

  function telHref(nummer) {
    var extrahiert = String(nummer || "").replace(/[^\d+]/g, "");
    return "tel:" + (extrahiert || nummer);
  }

  function initialen(name) {
    var teile = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (!teile.length) return "";
    var erste = teile[0].charAt(0);
    var letzte = teile.length > 1 ? teile[teile.length - 1].charAt(0) : "";
    return (erste + letzte).toUpperCase();
  }

  function mitSchema(url) {
    var u = String(url || "").trim();
    if (!u) return "";
    return /^(https?:|mailto:|tel:)/i.test(u) ? u : "https://" + u;
  }

  function ladeWorkbook(id) {
    if (!window.Workbook || typeof Workbook.load !== "function") {
      return Promise.reject(new Error("Workbook-API fehlt"));
    }
    return Workbook.load({ workbook: id, filter: {}, offset: 0, limit: 5000, sort: "_id", direction: "asc" })
      .then(function (rows) { return Array.isArray(rows) ? rows : []; });
  }

  function vergleichePersonen(a, b) {
    var an = typeof a.ansSortNumber === "number" ? a.ansSortNumber : Infinity;
    var bn = typeof b.ansSortNumber === "number" ? b.ansSortNumber : Infinity;
    if (an !== bn) return an - bn;
    return textFeld(a, "ansName").localeCompare(textFeld(b, "ansName"), "de");
  }

  function kategorieReihenfolge(kontakte, kategorienZeilen) {
    var vorhandene = {};
    kontakte.forEach(function (k) {
      var kat = textFeld(k, "ansKat");
      if (kat) vorhandene[kat] = true;
    });
    var geordnet = [];
    if (vorhandene["Vorstand"]) geordnet.push("Vorstand");
    kategorienZeilen.forEach(function (k) {
      var name = textFeld(k, "katName");
      if (name && vorhandene[name] && geordnet.indexOf(name) === -1) geordnet.push(name);
    });
    Object.keys(vorhandene).forEach(function (name) {
      if (geordnet.indexOf(name) === -1) geordnet.push(name);
    });
    return geordnet;
  }

  function baueAktion(href, innerHtml, beschriftung, extern) {
    var link = document.createElement("a");
    link.className = "icon-knopf";
    link.href = href;
    link.innerHTML = innerHtml + "<span>" + beschriftung + "</span>";
    if (extern) {
      link.target = "_blank";
      link.rel = "noopener";
    }
    return link;
  }

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

  function bauePersonKarte(person) {
    var karte = document.createElement("div");
    karte.className = "karte person-karte";

    var bildUrl = textFeld(person, "ansImg");
    var kreis = document.createElement("div");
    kreis.className = "person-karte__initialen";
    kreis.setAttribute("aria-hidden", "true");
    kreis.textContent = initialen(textFeld(person, "ansName"));
    if (bildUrlGueltig(bildUrl)) {
      var bild = bildMitRueckbau(bildUrl, "person-karte__bild", "");
      // Laedt das Foto nicht, treten die Initialen an seine Stelle.
      bild.addEventListener("error", function () {
        if (!kreis.parentNode) karte.insertBefore(kreis, karte.firstChild);
      });
      karte.appendChild(bild);
    } else {
      karte.appendChild(kreis);
    }

    var inhalt = document.createElement("div");
    inhalt.className = "person-karte__inhalt";

    var funktion = textFeld(person, "ansFunc");
    if (funktion) {
      var tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = funktion;
      inhalt.appendChild(tag);
    }

    var name = document.createElement("p");
    name.className = "person-karte__name";
    name.textContent = textFeld(person, "ansName");
    inhalt.appendChild(name);

    var info = textFeld(person, "ansInfo");
    if (info) {
      var infoEl = document.createElement("div");
      infoEl.className = "person-karte__info";
      infoEl.innerHTML = sicheresHtml(info);
      inhalt.appendChild(infoEl);
    }

    var aktionen = document.createElement("div");
    aktionen.className = "person-karte__aktionen";

    var mail = textFeld(person, "ansMail");
    if (mail) aktionen.appendChild(baueAktion("mailto:" + mail, ICON_MAIL, "E-Mail"));

    // Anrufen nur ohne Mail-Adresse: Vorstandsämter laufen über
    // Vereinsadressen, private Handynummern bleiben sonst unsichtbar
    // (QA-Befund, C2 Abschnitt 7).
    var telNummer = textFeld(person, "ansHandy") || textFeld(person, "ansTel");
    if (!mail && telNummer) aktionen.appendChild(baueAktion(telHref(telNummer), ICON_PHONE, "Anrufen"));

    var whatsapp = textFeld(person, "ansWhatsApp");
    if (whatsapp) {
      var ziffern = whatsapp.replace(/\D/g, "");
      aktionen.appendChild(baueAktion("https://wa.me/" + (ziffern || whatsapp), ICON_CHAT, "WhatsApp", true));
    }

    var insta = textFeld(person, "ansInsta");
    if (insta) {
      var instaUrl = /^https?:/i.test(insta) ? insta : "https://instagram.com/" + insta.replace(/^@/, "");
      aktionen.appendChild(baueAktion(instaUrl, ICON_KAMERA, "Instagram", true));
    }

    var link = textFeld(person, "ansLink");
    if (link) aktionen.appendChild(baueAktion(mitSchema(link), ICON_GLOBUS, "Website", true));

    if (aktionen.children.length) inhalt.appendChild(aktionen);
    karte.appendChild(inhalt);
    return karte;
  }

  var listeContainer = document.getElementById("kontakte-liste");
  var filterleiste = document.getElementById("filterleiste");

  function zeigeFehler() {
    listeContainer.innerHTML = "";
    var hinweis = document.createElement("div");
    hinweis.className = "hinweis";
    var p = document.createElement("p");
    p.textContent = "Die Ansprechpartner konnten gerade nicht geladen werden.";
    hinweis.appendChild(p);
    listeContainer.appendChild(hinweis);
  }

  Promise.all([
    ladeWorkbook(KONTAKTE_ID),
    ladeWorkbook(KATEGORIEN_ID)
  ]).then(function (ergebnisse) {
    var kontakte = ergebnisse[0].slice().sort(vergleichePersonen);
    var kategorienZeilen = ergebnisse[1];

    if (!kontakte.length) {
      zeigeFehler();
      listeContainer.querySelector(".hinweis p").textContent = "Aktuell sind keine Ansprechpartner hinterlegt.";
      return;
    }

    var kategorien = kategorieReihenfolge(kontakte, kategorienZeilen);
    var aktuellerFilter = "";

    function rendern() {
      listeContainer.innerHTML = "";
      var sichtbar = aktuellerFilter
        ? kontakte.filter(function (k) { return textFeld(k, "ansKat") === aktuellerFilter; })
        : kontakte;
      for (var i = 0; i < sichtbar.length; i++) {
        listeContainer.appendChild(bauePersonKarte(sichtbar[i]));
      }
    }

    if (kategorien.length >= 2) {
      filterleiste.hidden = false;
      var alleKnopf = document.createElement("button");
      alleKnopf.type = "button";
      alleKnopf.className = "tag filter-knopf filter-knopf--aktiv";
      alleKnopf.textContent = "Alle";
      filterleiste.appendChild(alleKnopf);

      var knoepfe = [alleKnopf];
      kategorien.forEach(function (kat) {
        var knopf = document.createElement("button");
        knopf.type = "button";
        knopf.className = "tag filter-knopf";
        knopf.textContent = kat;
        filterleiste.appendChild(knopf);
        knoepfe.push(knopf);
      });

      alleKnopf.addEventListener("click", function () {
        aktuellerFilter = "";
        knoepfe.forEach(function (k) { k.classList.remove("filter-knopf--aktiv"); });
        alleKnopf.classList.add("filter-knopf--aktiv");
        rendern();
      });
      kategorien.forEach(function (kat, index) {
        knoepfe[index + 1].addEventListener("click", function () {
          aktuellerFilter = kat;
          knoepfe.forEach(function (k) { k.classList.remove("filter-knopf--aktiv"); });
          knoepfe[index + 1].classList.add("filter-knopf--aktiv");
          rendern();
        });
      });
    }

    rendern();
  }).catch(function () {
    zeigeFehler();
  });
})();
</script>
</body>
</html>
