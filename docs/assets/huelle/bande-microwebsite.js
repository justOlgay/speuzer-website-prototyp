/* Speuzer: Sponsoren-„Bande“ auf der Website-Startseite (24.09.2026).
   Skriptblock für Microwebsite.tpl (<script id="speuzer-bande-js"> vor
   </head>, nach dem Stilblock speuzer-bande). Gleiche Daten und Regeln wie
   die Bande der App-Startseite (assets/app/Startseite_v3.tpl): Sponsoren-
   Worksheet, Häkchen „showSlider“, Reihenfolge „sponSort“, saubere
   Website-Logos mit Rückfall sponImg. Tippen öffnet „Sponsoren & Partner“
   im Rahmen der Hülle (wie ein Menüpunkt). Kommt nichts, bleibt die
   Startseite wie bisher. Braucht jQuery und die Workbook-API, die die
   Hülle im <head> bereits lädt. */
(function () {
  "use strict";

  var SPONSOREN_ID = "6a1ec5fcf68a05bf129cdbac";
  var ZIEL = "https://cdn.appack.de/sportfreunde04/workspace/web/verein-sponsoren.html";
  var LOGO_BASIS = "https://justolgay.github.io/speuzer-website-prototyp/assets/bilder/erzeugt/";
  // [Namensteil, Quelle] wie in der App (ganze Wörter, nur in diese Richtung)
  var WEBSITE_LOGOS = [
    ["SK SportConnects", "sponsor-sk-sportconnects-gbr"],
    ["vmapit", "sponsor-vmapit-gmbh"],
    ["Bundeswehr", "sponsor-bundeswehr"],
    ["VM Elite", "sponsor-fuballschule-vm-elite"],
    ["11TeamSports", "sponsor-11teamsports"],
    ["Köhler", "sponsor-koehler"]
  ];
  var TEMPO = 28;              // px pro Sekunde
  var BILD_WARTEZEIT = 6000;   // ms je Logo-Versuch
  var BANDE_WARTEZEIT = 8000;  // ms insgesamt; danach zählen die bis dahin geladenen Logos
  var PFEIL = '<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 6l6 6-6 6"/></svg>';

  function element(tag, klasse, text) {
    var el = document.createElement(tag);
    if (klasse) el.className = klasse;
    if (text !== undefined) el.textContent = text;
    return el;
  }

  function bildUrlGueltig(url) {
    return /^https?:\/\//i.test(url || "");
  }

  function cssZahl(el, name, ersatz) {
    try {
      var wert = parseFloat(window.getComputedStyle(el).getPropertyValue(name));
      return isFinite(wert) && wert > 0 ? wert : ersatz;
    } catch (e) {
      return ersatz;
    }
  }

  function woerter(text) {
    var s = String(text || "");
    if (s.normalize) s = s.normalize("NFC");
    return s.toLowerCase()
      .replace(/ä|ae/g, "a").replace(/ö|oe/g, "o").replace(/ü|ue/g, "u").replace(/ß/g, "ss")
      .split(/[^a-z0-9]+/)
      .filter(Boolean);
  }

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
      if (enthaeltNamensteil(firma, WEBSITE_LOGOS[i][0])) return LOGO_BASIS + WEBSITE_LOGOS[i][1] + "-480.jpg";
    }
    return "";
  }

  function sortWert(wert) {
    var zahl = Number(wert);
    return (wert === null || wert === undefined || wert === "" || !isFinite(zahl)) ? Infinity : zahl;
  }

  function sponsorenFuerBande(zeilen) {
    return (Array.isArray(zeilen) ? zeilen : [])
      .map(function (zeile, i) { return { zeile: zeile || {}, i: i }; })
      .filter(function (e) {
        return e.zeile.showSlider === true && e.zeile.sponActive !== false && String(e.zeile.sponFirma || "").trim() !== "";
      })
      .sort(function (a, b) {
        var sa = sortWert(a.zeile.sponSort), sb = sortWert(b.zeile.sponSort);
        if (sa !== sb) return sa < sb ? -1 : 1;
        return a.i - b.i;
      })
      .map(function (e) {
        return { firma: String(e.zeile.sponFirma).trim(), bild: String(e.zeile.sponImg || "").trim() };
      });
  }

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

  // Gleiche optische Fläche für alle Logos (Wurzel-Regel), Höchstmaße aus CSS.
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
        var hoehe = Math.sqrt(mass.flaeche / verhaeltnis);
        hoehe = Math.min(hoehe, mass.hoehe, mass.breite / verhaeltnis);
        return { firma: sponsor.firma, url: ergebnis.url, breite: Math.round(hoehe * verhaeltnis), hoehe: Math.round(hoehe) };
      });
  }

  function baueTafel(logo, stumm) {
    var tafel = element("span", stumm ? "speuzer-tafel speuzer-tafel--wdh" : "speuzer-tafel");
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

  // „Sponsoren & Partner“ im Rahmen der Hülle öffnen, wie ein Menüpunkt;
  // „Verein“ bleibt im Menü markiert (die Seite gehört dorthin). Ohne die
  // Hüllenfunktion folgt der Browser einfach dem Link.
  function oeffneSponsoren(ereignis) {
    if (typeof window.setFrameBar !== "function" || !window.jQuery) return;
    ereignis.preventDefault();
    var eintrag = document.createElement("div");
    eintrag.setAttribute("data-url", ZIEL);
    eintrag.setAttribute("data-fullscreen", "yes");
    eintrag.setAttribute("data-sidebar", "no");
    eintrag.setAttribute("data-targetblank", "no");
    window.setFrameBar(eintrag);
    window.jQuery(".menuBarElement, .menuElement").each(function () {
      if (window.jQuery(this).text().trim() !== "Verein") return;
      window.jQuery(this).addClass(this.classList.contains("menuBarElement") ? "menuBarSelected" : "menuSelected");
    });
    window.scrollTo(0, 0);
  }

  function baueGeruest(wide) {
    var bande = element("section", "speuzer-bande");
    bande.id = "speuzer-sponsorenbande";
    bande.setAttribute("aria-labelledby", "speuzer-bande-titel");
    bande.setAttribute("aria-hidden", "true");
    var link = element("a", "speuzer-bande__link");
    link.href = ZIEL;
    link.setAttribute("tabindex", "-1");
    link.addEventListener("click", oeffneSponsoren);
    var kopf = element("div", "speuzer-bande__kopf");
    var titel = element("h2", "speuzer-bande__titel", "Sponsoren & Partner");
    titel.id = "speuzer-bande-titel";
    var alle = element("span", "speuzer-bande__alle", "Alle");
    alle.appendChild(element("span", "speuzer-vh", " ansehen"));
    alle.insertAdjacentHTML("beforeend", PFEIL);
    kopf.appendChild(titel);
    kopf.appendChild(alle);
    var schiene = element("div", "speuzer-bande__schiene");
    var fenster = element("div", "speuzer-bande__fenster");
    var spur = element("div", "speuzer-bande__spur");
    fenster.appendChild(spur);
    schiene.appendChild(fenster);
    link.appendChild(kopf);
    link.appendChild(schiene);
    bande.appendChild(link);
    wide.appendChild(bande);
    return { bande: bande, link: link, spur: spur };
  }

  function platzMerken(wide, bande) {
    var unten = parseFloat(window.getComputedStyle(bande).bottom) || 0;
    wide.style.setProperty("--sb-platz", Math.round(bande.offsetHeight + unten) + "px");
  }

  function entfernen(wide, teile) {
    wide.classList.remove("speuzer-mit-bande");
    if (teile.bande.parentNode) teile.bande.parentNode.removeChild(teile.bande);
  }

  function zeigen(wide, teile, logos) {
    if (!logos.length) { entfernen(wide, teile); return; }
    var haelfte = element("div", "speuzer-bande__haelfte");
    logos.forEach(function (logo) { haelfte.appendChild(baueTafel(logo, false)); });
    teile.spur.appendChild(haelfte);
    if (logos.length === 1) {
      teile.bande.classList.add("speuzer-bande--still");
    } else {
      // Eine Hälfte mindestens so breit wie der breiteste Bildschirm, sonst
      // läuft bei wenigen Sponsoren eine Lücke durchs Bild.
      var satzBreite = haelfte.offsetWidth;
      var noetig = Math.max(window.innerWidth || 0, (window.screen && Math.max(screen.width, screen.height)) || 0, 600);
      for (var runde = 1; satzBreite > 0 && satzBreite * runde < noetig && runde < 16; runde++) {
        logos.forEach(function (logo) { haelfte.appendChild(baueTafel(logo, true)); });
      }
      var zweite = haelfte.cloneNode(true);
      zweite.setAttribute("aria-hidden", "true");
      [].forEach.call(zweite.querySelectorAll("img"), function (bild) { bild.alt = ""; });
      teile.spur.appendChild(zweite);
      var dauer = Math.max(12, Math.round(haelfte.offsetWidth / TEMPO));
      teile.spur.style.animationDuration = dauer + "s";
      teile.spur.style.animationDelay = "-" + (Math.random() * dauer).toFixed(1) + "s";
      teile.spur.classList.add("speuzer-bande__spur--laeuft");
    }
    teile.bande.removeAttribute("aria-hidden");
    teile.link.removeAttribute("tabindex");
    platzMerken(wide, teile.bande);
    var einblenden = function () { teile.bande.classList.add("speuzer-bande--bereit"); };
    if (window.requestAnimationFrame) window.requestAnimationFrame(einblenden); else setTimeout(einblenden, 16);
  }

  function start() {
    var wide = document.querySelector(".wide");
    if (!wide || document.getElementById("speuzer-sponsorenbande")) return;
    if (!window.Workbook || typeof window.Workbook.load !== "function") return;
    var teile = baueGeruest(wide);
    wide.classList.add("speuzer-mit-bande");
    platzMerken(wide, teile.bande);
    window.addEventListener("resize", function () { if (teile.bande.parentNode) platzMerken(wide, teile.bande); });
    var mass = {
      hoehe: cssZahl(teile.bande, "--sb-logo-max-hoehe", 44),
      breite: cssZahl(teile.bande, "--sb-logo-max-breite", 150),
      flaeche: cssZahl(teile.bande, "--sb-logo-flaeche", 3300)
    };
    var erledigt = false;
    var geladen = [];
    function fertig(logos) {
      if (erledigt) return;
      erledigt = true;
      clearTimeout(uhr);
      try { zeigen(wide, teile, logos); } catch (e) { entfernen(wide, teile); }
    }
    var uhr = setTimeout(function () { fertig(geladen.filter(Boolean)); }, BANDE_WARTEZEIT);
    Promise.resolve()
      .then(function () {
        return window.Workbook.load({ workbook: SPONSOREN_ID, filter: { sponActive: true }, offset: 0, limit: 500, sort: "_id", direction: "asc" });
      })
      .then(function (zeilen) {
        return Promise.all(sponsorenFuerBande(zeilen).map(function (sponsor, i) {
          return ladeLogo(sponsor, mass).then(function (logo) { geladen[i] = logo; return logo; });
        }));
      })
      .then(function (logos) { fertig(logos.filter(Boolean)); })
      .catch(function () { fertig([]); });
  }

  // iOS setzt :active (Anhalten, Tipp-Rückmeldung) nur mit touchstart-Listener.
  document.addEventListener("touchstart", function () {}, { passive: true });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
