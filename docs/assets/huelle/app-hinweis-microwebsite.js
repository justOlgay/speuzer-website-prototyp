/* Speuzer: Hinweis „Vereins-App laden“ auf der Website (25.09.2026).
   Skriptblock „speuzer-app-hinweis-js“ für Microwebsite.tpl (am Ende des
   head-Bereichs). Setzt den Abschnitt vor die Fußzeile der Hülle. QR-Codes
   (tools/app-qr.mjs) und Store-Adressen direkt je Store – der appack-
   Kurzlink qrcode.appack.de leitet iPhones derzeit nicht weiter. */
(function () {
  "use strict";

  var BASIS = "https://justolgay.github.io/speuzer-website-prototyp/assets/huelle/";
  var STORES = [
    {
      name: "App Store",
      url: "https://apps.apple.com/app/ffv-sportfreunde-04/id6805418783",
      qr: BASIS + "qr-app-store.svg",
      badge: "https://cdn.appack.de/00_Appack_TEMPLATE/images%2FDownload_on_the_App_Store_Badge_DE_RGB_blk_092917.png",
      alt: "Laden im App Store"
    },
    {
      name: "Google Play",
      url: "https://play.google.com/store/apps/details?id=de.appack.project.sportfreunde04",
      qr: BASIS + "qr-google-play.svg",
      badge: "https://cdn.appack.de/00_Appack_TEMPLATE/images%2Fgoogle-play-badge.png",
      alt: "Jetzt bei Google Play",
      rand: true
    }
  ];

  function element(tag, klasse, text) {
    var el = document.createElement(tag);
    if (klasse) el.className = klasse;
    if (text !== undefined) el.textContent = text;
    return el;
  }

  function start() {
    var fuss = document.querySelector(".footer");
    if (!fuss || document.getElementById("speuzer-app")) return;
    var abschnitt = element("section", "speuzer-app");
    abschnitt.id = "speuzer-app";
    abschnitt.setAttribute("aria-labelledby", "speuzer-app-titel");
    var rahmen = element("div", "speuzer-app__rahmen");
    var text = element("div", "speuzer-app__text");
    var titel = element("h2", "speuzer-app__titel", "Die Vereins-App");
    titel.id = "speuzer-app-titel";
    text.appendChild(titel);
    text.appendChild(element("p", "speuzer-app__satz", "Termine, News und Push-Nachrichten der Speuzer direkt aufs Handy – kostenlos für iPhone und Android."));
    text.appendChild(element("p", "speuzer-app__hinweis", "QR-Code mit der Handykamera scannen oder im Store suchen: „FFV Sportfreunde 04“."));
    var stores = element("div", "speuzer-app__stores");
    STORES.forEach(function (s) {
      var link = element("a", "speuzer-app__store");
      link.href = s.url;
      link.target = "_blank";
      link.rel = "noopener";
      var qr = document.createElement("img");
      qr.className = "speuzer-app__qr";
      qr.src = s.qr;
      qr.alt = "QR-Code " + s.name;
      qr.width = 112;
      qr.height = 112;
      qr.loading = "lazy";
      var badge = document.createElement("img");
      badge.className = s.rand ? "speuzer-app__badge speuzer-app__badge--rand" : "speuzer-app__badge";
      badge.src = s.badge;
      badge.alt = s.alt;
      badge.height = s.rand ? 60 : 40;
      badge.loading = "lazy";
      link.appendChild(qr);
      link.appendChild(badge);
      stores.appendChild(link);
    });
    rahmen.appendChild(text);
    rahmen.appendChild(stores);
    abschnitt.appendChild(rahmen);
    fuss.parentNode.insertBefore(abschnitt, fuss);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
