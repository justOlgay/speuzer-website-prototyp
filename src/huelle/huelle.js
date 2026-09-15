/*
  Speuzer Website Prototyp – Hülle (P16)
  Nachbildung der appack-Vorlage "Microwebseite" (drender.html), Stand
  15.09.2026. Zweck dieser Datei ist Wahrheitstreue zur Vorlage, nicht
  Qualität: dieselbe Logik, Funktion für Funktion, nur jQuery durch
  Vanilla-JS ersetzt (kein externes Skript erlaubt) und die appack-CDN-
  Aufrufe (Workbook.load, app-color.css) durch das eingebettete
  window.APPACK (siehe {{daten}} in huelle.html) ersetzt. Absichtlich
  übernommene Schwächen der Vorlage: Menüpunkte sind <div onclick="…">
  ohne Links/href, kein Tastaturzugriff, Titel/Favicon werden erst hier
  per JavaScript gesetzt, eine Ladeanimation von mindestens 1000 ms.
*/

(function () {
  "use strict";

  var appName = "FFV Sportfreunde 04";

  var maincolor = "";
  var titlecolor = "";
  var secondcolor = "";
  var highlightcolor = "";

  var videoActive = false;
  var overlayActive = false;
  var loaderStartTime = Date.now();

  var startSettings = {};
  var footerSettings = {};

  var barMenuResizeHandler = null;

  // ---------- Icons (Inline-SVG statt Font Awesome der Vorlage) ----------

  var ICON_CHEVRON = '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
  var ICON_MAIL = '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>';
  var ICON_TEL = '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>';

  // Simple Icons (CC0), https://cdn.jsdelivr.net/npm/simple-icons@13/icons/facebook.svg
  // und …/instagram.svg, geladen am 15.09.2026 – role/title entfernt,
  // aria-hidden="true" sowie fill="currentColor" width="1em" height="1em"
  // ergänzt (siehe Abschlussbericht P16).
  var ICON_FACEBOOK = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor" width="1em" height="1em" aria-hidden="true"><path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z"/></svg>';
  var ICON_INSTAGRAM = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor" width="1em" height="1em" aria-hidden="true"><path d="M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077"/></svg>';

  // ---------- Hilfsfunktionen (1:1 aus der Vorlage) ----------

  function hasValue(value) {
    return value !== undefined && value !== null && String(value).trim() !== "";
  }

  function isTrue(value) {
    return value === true || value === "true" || value === 1 || value === "1" || value === "Ja" || value === "ja";
  }

  function fallback(value, fallbackValue) {
    return hasValue(value) ? value : fallbackValue;
  }

  function cssBackgroundImage(url) {
    return 'url("' + String(url).replace(/"/g, "%22") + '")';
  }

  // ---------- Farben ----------
  // Liest window.APPACK.appColor (entspricht app-color.css des Workspace,
  // siehe data/appack-app-color.json) statt – wie die Vorlage – ein externes
  // Stylesheet zu laden und dessen CSS-Variablen auszulesen.

  function readAppColors() {
    var farben = (window.APPACK && window.APPACK.appColor) || {};
    maincolor = fallback(farben.main, "#333333");
    titlecolor = fallback(farben.title, "#ffffff");
    secondcolor = fallback(farben.secondary, "#dddddd");
    highlightcolor = fallback(farben.secondaryHighlighted, "#000000");
  }

  function setDynamicStyle(css) {
    var styleTag = document.getElementById("dynamicWorkbookStyles");
    if (!styleTag) {
      styleTag = document.createElement("style");
      styleTag.id = "dynamicWorkbookStyles";
      document.head.appendChild(styleTag);
    }
    styleTag.innerHTML = css;
  }

  function buildDynamicCss() {
    var s = startSettings || {};
    var f = footerSettings || {};

    var headerBg, menuBg, burgerColor, normalMenuText;
    var activeBg, activeText, hoverBg, hoverText, burgerHover;

    // startAppcolor hat bewusst absolute Priorität: sobald true, werden
    // die händisch gepflegten Werte aus dem Startseiten-Sheet für Header,
    // Menü, aktive und Hover-Zustände ignoriert.
    if (isTrue(s.startAppcolor)) {
      headerBg = maincolor;
      menuBg = maincolor;
      burgerColor = titlecolor;
      normalMenuText = titlecolor;

      activeBg = secondcolor;
      activeText = maincolor;

      hoverBg = secondcolor;
      hoverText = highlightcolor;
      burgerHover = highlightcolor;
    } else {
      headerBg = hasValue(s.startHeadcolor) ? s.startHeadcolor : "#333333";
      menuBg = headerBg;
      burgerColor = hasValue(s.startText) ? s.startText : "#ffffff";
      normalMenuText = burgerColor;

      activeBg = hasValue(s.startActive) ? s.startActive : "#dddddd";
      activeText = hasValue(s.startTextactive) ? s.startTextactive : "#000000";

      hoverBg = hasValue(s.startHighlightcolor) ? s.startHighlightcolor : activeBg;
      hoverText = hasValue(s.startTextactive) ? s.startTextactive : "#000000";
      burgerHover = hasValue(s.startHighlightcolor) ? s.startHighlightcolor : "#000000";
    }

    var footerBg = hasValue(f.footerBG) ? f.footerBG : "#000000";
    var footerText = hasValue(f.footerTC) ? f.footerTC : "#ffffff";

    var css = "";

    css += ".headerBar{background-color:transparent !important;}";
    css += ".headerBar:before{background-color:" + headerBg + " !important;}";
    css += ".burgerMenu{background-color:" + menuBg + " !important;color:" + normalMenuText + " !important;}";
    css += ".burger{color:" + burgerColor + " !important;}";
    css += ".burger:hover,.burger:active{color:" + burgerHover + " !important;}";

    css += ".menuElement,.menuBarElement,.menuMore{color:" + normalMenuText + " !important;}";
    css += ".menuMoreDropdown{background-color:" + menuBg + " !important;}";
    css += ".menuSelected,.menuBarSelected{background-color:" + activeBg + " !important;color:" + activeText + " !important;}";
    css += ".menuElement:hover,.menuElement:active,.menuBarElement:hover,.menuBarElement:active,.menuMore:hover,.menuMore:active,.menuMore.open{background-color:" + hoverBg + " !important;color:" + hoverText + " !important;}";
    css += ".menuBarElement:hover,.menuBarElement:active{box-shadow:0 6px 18px rgba(0,0,0,.22) !important;}";
    css += ".menuBarSelected{box-shadow:0 6px 18px rgba(0,0,0,.18) !important;}";

    css += ".footer{background-color:" + footerBg + " !important;color:" + footerText + " !important;}";
    css += ".footer a{color:" + footerText + " !important;}";
    css += ".footerImprint,.DSGVO,.appBanner,.nomediaBanner{border-color:" + footerText + " !important;}";
    css += ".appBanner:hover,.appBanner:active,.nomediaBanner:hover,.nomediaBanner:active,.footerImprint:hover,.footerImprint:active,.DSGVO:hover,.DSGVO:active{background-color:" + footerText + " !important;color:" + footerBg + " !important;}";
    css += ".specialSelected{background-color:" + footerText + " !important;color:" + footerBg + " !important;}";

    setDynamicStyle(css);
  }

  // ---------- Loader ----------

  function applyLoaderColors() {
    var loaderBg = hasValue(maincolor) ? maincolor : "#000000";
    var loaderText = hasValue(titlecolor) ? titlecolor : "#ffffff";
    var loaderAccent = hasValue(secondcolor) ? secondcolor : loaderText;

    var loader = document.getElementById("pageLoader");
    if (loader) {
      loader.style.backgroundColor = loaderBg;
      loader.style.color = loaderText;
    }

    var spinner = document.querySelector(".loaderSpinner");
    if (spinner) {
      spinner.style.borderColor = "rgba(255, 255, 255, 0.35)";
      spinner.style.borderTopColor = loaderAccent;
    }
  }

  function hidePageLoader() {
    var minLoaderTime = 1000;
    var elapsed = Date.now() - loaderStartTime;
    var remaining = Math.max(0, minLoaderTime - elapsed);

    setTimeout(function () {
      var loader = document.getElementById("pageLoader");
      if (!loader) return;
      loader.classList.add("hide");
      setTimeout(function () {
        loader.remove();
      }, 450);
    }, remaining);
  }

  // ---------- Rahmen (#showFrame) leeren ----------
  // Nachbildung von safeClearFrame() der Vorlage: dort wird versucht, das
  // <body> im Frame direkt zu leeren, und nur im Fehlerfall (anderer
  // Ursprung) auf src="about:blank" ausgewichen – in der Praxis (Ziel immer
  // eine andere HTML-Datei) tritt fast immer der Fehlerfall ein, deshalb
  // hier direkt src="about:blank" vor dem eigentlichen Setzen.

  function safeClearFrame() {
    var frame = document.getElementById("showFrame");
    if (frame) frame.setAttribute("src", "about:blank");
  }

  function clearAllSelections() {
    var i;
    var menuElemente = document.querySelectorAll(".menuElement");
    for (i = 0; i < menuElemente.length; i++) menuElemente[i].classList.remove("menuSelected");
    var barElemente = document.querySelectorAll(".menuBarElement");
    for (i = 0; i < barElemente.length; i++) barElemente[i].classList.remove("menuBarSelected");

    var imprint = document.querySelector(".footerImprint");
    if (imprint) imprint.classList.remove("specialSelected");
    var dsgvo = document.querySelector(".DSGVO");
    if (dsgvo) dsgvo.classList.remove("specialSelected");
    var banner = document.querySelector(".appBanner");
    if (banner) banner.classList.remove("specialSelected");
    var nomedia = document.querySelector(".nomediaBanner");
    if (nomedia) nomedia.classList.remove("specialSelected");
  }

  // ---------- Burger-Menü auf-/zuklappen ----------
  // Nachbildung von $(".burgerMenu").slideToggle(150)/.slideUp(150) über
  // max-height mit CSS-Übergang (siehe huelle.css, .burgerMenu) statt
  // jQuery-Animation.

  function burgerMenuIstOffen() {
    var menu = document.querySelector(".burgerMenu");
    return !!menu && menu.classList.contains("burgerMenuOffen");
  }

  function burgerMenuAufklappen() {
    var menu = document.querySelector(".burgerMenu");
    if (!menu) return;
    menu.style.display = "block";
    menu.classList.add("burgerMenuOffen");
    requestAnimationFrame(function () {
      menu.style.maxHeight = menu.scrollHeight + "px";
    });
  }

  function burgerMenuZuklappen() {
    var menu = document.querySelector(".burgerMenu");
    if (!menu || !menu.classList.contains("burgerMenuOffen")) return;
    menu.style.maxHeight = menu.scrollHeight + "px";
    requestAnimationFrame(function () {
      menu.style.maxHeight = "0px";
    });
    menu.classList.remove("burgerMenuOffen");
    setTimeout(function () {
      menu.style.display = "none";
    }, 150);
  }

  function burgerMenuUmschalten() {
    if (burgerMenuIstOffen()) {
      burgerMenuZuklappen();
    } else {
      burgerMenuAufklappen();
    }
  }

  // ---------- Menüpunkte ----------

  function createMenuItem(col, zielSelector, klasse, handlerName) {
    var linkUrl = fallback(col.menuLink, "");
    var title = fallback(col.menuTitle, "Ohne Titel");
    var fullscreen = isTrue(col.menuFullscreen) ? "yes" : "no";
    var targetblank = isTrue(col.menuExt) ? "yes" : "no";
    var sidebar = isTrue(col.menuSidebar) ? "yes" : "no";

    var el = document.createElement("div");
    el.className = klasse;
    el.setAttribute("onclick", handlerName + "(this)");
    el.setAttribute("data-url", linkUrl);
    el.setAttribute("data-sidebar", sidebar);
    el.setAttribute("data-fullscreen", fullscreen);
    el.setAttribute("data-targetblank", targetblank);
    el.textContent = title;

    var ziel = document.querySelector(zielSelector);
    if (ziel) ziel.appendChild(el);
  }

  // ---------- "Mehr"-Überlauf der Leisten-Navigation ----------

  function ensureMoreMenu() {
    if (document.querySelector(".barMenu .menuMore")) return;

    var more = document.createElement("div");
    more.className = "menuMore";
    more.setAttribute("tabindex", "0");
    more.setAttribute("aria-haspopup", "true");
    more.setAttribute("aria-expanded", "false");
    more.innerHTML = "<span>Mehr</span>" + ICON_CHEVRON;

    var dropdown = document.createElement("div");
    dropdown.className = "menuMoreDropdown";
    more.appendChild(dropdown);

    // Wird erst NACHDEM die echten Menüpunkte im DOM stehen angehängt (siehe
    // loadMenuSettings) -> landet garantiert ganz rechts in .barMenu.
    var barMenu = document.querySelector(".barMenu");
    if (barMenu) barMenu.appendChild(more);

    more.addEventListener("click", function (e) {
      e.stopPropagation();
      var offen = more.classList.toggle("open");
      more.setAttribute("aria-expanded", offen ? "true" : "false");
    });

    document.addEventListener("click", function () {
      var alle = document.querySelectorAll(".menuMore");
      for (var i = 0; i < alle.length; i++) {
        alle[i].classList.remove("open");
        alle[i].setAttribute("aria-expanded", "false");
      }
    });
  }

  function elementBreiteMitRand(el) {
    var rect = el.getBoundingClientRect();
    var stil = window.getComputedStyle(el);
    return rect.width + (parseFloat(stil.marginLeft) || 0) + (parseFloat(stil.marginRight) || 0);
  }

  function summeBreiten(elemente, gap) {
    var breite = 0;
    for (var i = 0; i < elemente.length; i++) breite += elementBreiteMitRand(elemente[i]);
    if (elemente.length > 1) breite += gap * (elemente.length - 1);
    return breite;
  }

  function updateBarMenuOverflow() {
    var barMenu = document.querySelector(".barMenu");
    var more = barMenu ? barMenu.querySelector(".menuMore") : null;
    var moreMenu = more ? more.querySelector(".menuMoreDropdown") : null;

    if (!barMenu || !more || window.getComputedStyle(barMenu).display === "none") {
      return;
    }

    // Alle Punkte zuerst wieder in die Hauptnavigation holen. Dadurch wird
    // bei jeder Breitenänderung komplett neu berechnet. ":scope > …" statt
    // querySelectorAll(".menuBarElement") – nur DIREKTE Kinder, wie
    // jQuery .children() in der Vorlage; sonst zählen Punkte, die bereits im
    // (verschachtelten) Dropdown liegen, hier fälschlich weiter mit, und die
    // while-Schleife unten bricht nie über ihre Längenbedingung ab.
    var imDropdown = Array.prototype.slice.call(moreMenu.querySelectorAll(":scope > .menuBarElement"));
    for (var i = 0; i < imDropdown.length; i++) barMenu.insertBefore(imDropdown[i], more);
    more.classList.remove("open");
    more.setAttribute("aria-expanded", "false");

    var availableWidth = barMenu.clientWidth;
    var menuStyles = window.getComputedStyle(barMenu);
    var gap = parseFloat(menuStyles.columnGap || menuStyles.gap) || 0;

    var items = Array.prototype.slice.call(barMenu.querySelectorAll(":scope > .menuBarElement"));
    var itemsWidth = summeBreiten(items, gap);

    // Alles passt: "Mehr" wirklich ausblenden.
    if (itemsWidth <= availableWidth) {
      more.style.display = "none";
      more.style.visibility = "visible";
      return;
    }

    // "Mehr" muss zum Messen kurz im Layout liegen.
    more.style.display = "flex";
    more.style.visibility = "hidden";
    var moreWidth = elementBreiteMitRand(more);
    more.style.visibility = "visible";

    // Von rechts nach links Punkte in das Dropdown verschieben, bis
    // Hauptnavigation + Abstand + "Mehr" sicher hineinpassen.
    var visibleItems = Array.prototype.slice.call(barMenu.querySelectorAll(":scope > .menuBarElement"));

    while (visibleItems.length > 1) {
      var visibleWidth = summeBreiten(visibleItems, gap);
      var totalWidth = visibleWidth + gap + moreWidth;

      if (totalWidth <= availableWidth) break;

      var letztes = visibleItems[visibleItems.length - 1];
      moreMenu.insertBefore(letztes, moreMenu.firstChild);
      visibleItems = Array.prototype.slice.call(barMenu.querySelectorAll(":scope > .menuBarElement"));
    }

    // Sicherheitsfall bei extrem schmalen Breiten oberhalb des
    // Burger-Breakpoints: "Mehr" bleibt dabei immer sichtbar.
    more.style.display = "flex";
    more.style.visibility = "visible";
  }

  function applyBarMenuMode(enabled) {
    var barMenu = document.querySelector(".barMenu");
    var burger = document.querySelector(".burger");

    if (isTrue(enabled)) {
      var updateMenuDisplay = function () {
        if (window.innerWidth <= 800) {
          if (barMenu) barMenu.style.display = "none";
          if (burger) burger.style.display = "block";
        } else {
          // ensureMoreMenu() wird hier bewusst NICHT aufgerufen (Race
          // Condition, siehe Vorlage): das übernimmt ausschließlich
          // loadMenuSettings(), NACHDEM die echten Menüpunkte im DOM stehen.
          if (barMenu) barMenu.style.display = "flex";
          if (burger) burger.style.display = "none";
          requestAnimationFrame(updateBarMenuOverflow);
        }
      };

      updateMenuDisplay();
      if (barMenuResizeHandler) window.removeEventListener("resize", barMenuResizeHandler);
      barMenuResizeHandler = updateMenuDisplay;
      window.addEventListener("resize", barMenuResizeHandler);
    } else {
      if (barMenu) barMenu.style.display = "none";
      if (burger) burger.style.display = "block";
      if (barMenuResizeHandler) {
        window.removeEventListener("resize", barMenuResizeHandler);
        barMenuResizeHandler = null;
      }
    }
  }

  // ---------- Start-, Sidebar- und Footer-Einstellungen ----------

  function loadStartSettings() {
    var data = (window.APPACK && window.APPACK.start) || {};
    startSettings = data;

    var wide = document.querySelector(".wide");
    if (wide) {
      wide.style.backgroundImage = cssBackgroundImage(
        // Rückfallwert der Vorlage, hier ohne fremden Host (P17, Schritt 0).
        fallback(data.startBackground, "assets/huelle/startbild.jpg")
      );
    }

    if (hasValue(data.startBgColor)) {
      document.body.style.backgroundColor = data.startBgColor;
    }

    var logo = document.querySelector(".logoImage");
    if (logo && hasValue(data.startLogo)) {
      logo.setAttribute("src", data.startLogo);
    }

    var bestehendesOverlay = document.querySelector(".textOverlay");
    if (bestehendesOverlay) bestehendesOverlay.remove();
    overlayActive = false;

    // Video-Zweig der Vorlage entfällt hier: startVideo ist im Worksheet
    // START leer (siehe data/appack-start.json), und die Wiedergabe der
    // Vorlage hängt an video.js, einem externen Skript, das die Hülle laut
    // Vorgabe nicht laden darf (siehe Abschlussbericht, "Offene Fragen").
    if (hasValue(data.startVideo)) {
      videoActive = true;
    }

    if (hasValue(data.startTextoverlay) && wide) {
      overlayActive = true;
      var overlay = document.createElement("div");
      overlay.className = "textOverlay";
      overlay.innerHTML = data.startTextoverlay;
      wide.appendChild(overlay);

      if (hasValue(data.startOverlayColor)) {
        overlay.style.color = data.startOverlayColor;
      }

      setTimeout(function () {
        overlay.style.opacity = "1";
        overlay.style.transform = "translate(-50%, -50%)";
      }, 1200);
    }

    applyBarMenuMode(data.startBarMenu);
    buildDynamicCss();
  }

  function loadSidebarSettings() {
    var data = (window.APPACK && window.APPACK.sidebar) || {};
    var sideFrame = document.getElementById("sideFrame");
    if (!sideFrame) return;

    sideFrame.setAttribute("src", fallback(data.sidebarURL, ""));

    if (hasValue(data.sidebarColor)) {
      sideFrame.style.backgroundColor = data.sidebarColor;
    } else {
      sideFrame.style.backgroundColor = "transparent";
    }

    if (hasValue(data.sidebarImage)) {
      sideFrame.style.backgroundImage = cssBackgroundImage(data.sidebarImage);
    } else {
      sideFrame.style.backgroundImage = "none";
    }
  }

  function loadFooterSettings() {
    var data = (window.APPACK && window.APPACK.footer) || {};
    footerSettings = data;

    var footerLogoImg = document.querySelector(".footerlogoImage");
    if (footerLogoImg && hasValue(data.footerLogo)) {
      footerLogoImg.setAttribute("src", data.footerLogo);
    }

    var footerCopyEl = document.querySelector(".footerCopy");
    if (footerCopyEl) {
      if (hasValue(data.footerCopy)) {
        footerCopyEl.innerHTML = "&copy; " + data.footerCopy;
      } else {
        footerCopyEl.remove();
      }
    }

    var footerMailEl = document.querySelector(".footerMail");
    if (footerMailEl) {
      if (hasValue(data.footerMail)) {
        footerMailEl.innerHTML = ICON_MAIL + "&nbsp;<a href=\"mailto:" + data.footerMail + "\">" + data.footerMail + "</a>";
      } else {
        footerMailEl.remove();
      }
    }

    var footerTelEl = document.querySelector(".footerTel");
    if (footerTelEl) {
      if (hasValue(data.footerTel)) {
        footerTelEl.innerHTML = ICON_TEL + "&nbsp;<a href=\"tel:" + data.footerTel + "\">" + data.footerTel + "</a>";
      } else {
        footerTelEl.remove();
      }
    }

    var footerTextEl = document.querySelector(".footerText");
    if (footerTextEl) {
      if (hasValue(data.footerText)) {
        footerTextEl.innerHTML = data.footerText + "<br><br>";
      } else {
        footerTextEl.remove();
      }
    }

    var bestehendesDsgvo = document.querySelector(".DSGVO");
    if (bestehendesDsgvo) bestehendesDsgvo.remove();

    var footerImprintEl = document.querySelector(".footerImprint");
    if (footerImprintEl) {
      if (hasValue(data.footerImprint) && !hasValue(data.footerDatenschutz)) {
        footerImprintEl.setAttribute("onclick", "setImprint(this)");
        footerImprintEl.setAttribute("data-url", data.footerImprint);
        footerImprintEl.innerHTML = "Impressum";
      } else if (!hasValue(data.footerImprint) && hasValue(data.footerDatenschutz)) {
        footerImprintEl.setAttribute("onclick", "setImprint(this)");
        footerImprintEl.setAttribute("data-url", data.footerDatenschutz);
        footerImprintEl.innerHTML = "Datenschutz";
      } else if (hasValue(data.footerImprint) && hasValue(data.footerDatenschutz)) {
        footerImprintEl.setAttribute("onclick", "setImprint(this)");
        footerImprintEl.setAttribute("data-url", data.footerImprint);
        footerImprintEl.innerHTML = "Impressum";

        var dsgvo = document.createElement("div");
        dsgvo.className = "DSGVO";
        dsgvo.setAttribute("onclick", "setImprint(this)");
        dsgvo.setAttribute("data-url", data.footerDatenschutz);
        dsgvo.innerHTML = "Datenschutz";
        footerImprintEl.insertAdjacentElement("afterend", dsgvo);
      } else {
        footerImprintEl.remove();
      }
    }

    // TikTok/X/YouTube bleiben ohne Icon: footerTiktok/footerX/footerYoutube
    // sind im Worksheet FOOTER leer (siehe data/appack-footer.json), die
    // Vorgabe (Schritt 3) nennt SVGs nur für Facebook und Instagram.
    var socialItems = [
      { selector: ".footerFacebook", value: data.footerFacebook, icon: ICON_FACEBOOK },
      { selector: ".footerInsta", value: data.footerInsta, icon: ICON_INSTAGRAM },
      { selector: ".footerTiktok", value: data.footerTiktok, icon: "" },
      { selector: ".footerX", value: data.footerX, icon: "" },
      { selector: ".footerYoutube", value: data.footerYoutube, icon: "" }
    ];

    var hasSocial = false;
    for (var i = 0; i < socialItems.length; i++) {
      var item = socialItems[i];
      var el = document.querySelector(item.selector);
      if (!el) continue;
      if (hasValue(item.value)) {
        hasSocial = true;
        el.innerHTML = '<a href="' + item.value + '" target="_blank">' + item.icon + "</a>";
      } else {
        el.remove();
      }
    }

    if (!hasSocial) {
      var banner = document.querySelector(".appBanner");
      if (banner) {
        banner.classList.add("nomediaBanner");
        banner.classList.remove("appBanner");
      }
    }

    buildDynamicCss();
  }

  // ---------- Menü laden ----------

  function loadMenuSettings() {
    var alle = (window.APPACK && window.APPACK.menu) || [];
    var eintraege = alle
      .filter(function (col) {
        return col.menuActive === null || col.menuActive === undefined || col.menuActive === false;
      })
      .slice()
      .sort(function (a, b) {
        return (a.menuSort || 0) - (b.menuSort || 0);
      });

    for (var i = 0; i < eintraege.length; i++) {
      createMenuItem(eintraege[i], ".burgerMenu", "menuElement", "setFrame");
      createMenuItem(eintraege[i], ".barMenu", "menuBarElement", "setFrameBar");
    }

    // Erst NACHDEM alle echten Menüpunkte im DOM stehen, wird "Mehr"
    // angehängt -> landet garantiert ganz rechts.
    ensureMoreMenu();
    requestAnimationFrame(updateBarMenuOverflow);
    buildDynamicCss();
  }

  // ---------- Ereignisse ----------

  function bindEvents() {
    var burger = document.querySelector(".burger");
    if (burger) {
      burger.addEventListener("click", function () {
        burgerMenuUmschalten();
      });
    }

    var menuStart = document.getElementById("menuStart");
    if (menuStart) {
      menuStart.addEventListener("click", function () {
        if (overlayActive) {
          var overlay = document.querySelector(".textOverlay");
          if (overlay) overlay.style.display = "";
        }
        var sideFrame = document.getElementById("sideFrame");
        if (sideFrame) sideFrame.style.display = "none";
        clearAllSelections();
        this.classList.add("menuSelected");
        var showFrame = document.getElementById("showFrame");
        if (showFrame) {
          showFrame.setAttribute("src", "");
          showFrame.style.display = "none";
        }
        setTimeout(function () {
          burgerMenuZuklappen();
        }, 150);
      });
    }

    var menuBarStart = document.getElementById("menuBarStart");
    if (menuBarStart) {
      menuBarStart.addEventListener("click", function () {
        if (overlayActive) {
          var overlay = document.querySelector(".textOverlay");
          if (overlay) overlay.style.display = "";
        }
        var sideFrame = document.getElementById("sideFrame");
        if (sideFrame) sideFrame.style.display = "none";
        clearAllSelections();
        this.classList.add("menuBarSelected");
        var showFrame = document.getElementById("showFrame");
        if (showFrame) {
          showFrame.setAttribute("src", "");
          showFrame.style.display = "none";
        }
      });
    }

    document.addEventListener("click", function (e) {
      var ziel = e.target.closest(".appBanner, .nomediaBanner");
      if (!ziel) return;

      if (overlayActive) {
        var overlay = document.querySelector(".textOverlay");
        if (overlay) overlay.style.display = "none";
      }
      var sideFrame = document.getElementById("sideFrame");
      if (sideFrame) sideFrame.style.display = "none";
      clearAllSelections();
      ziel.classList.add("specialSelected");

      var storeUrl = "https://appack.de/rest-api-v2/advertise/embed-frame/sportfreunde04";
      var showFrame = document.getElementById("showFrame");
      if (showFrame) {
        showFrame.setAttribute("src", storeUrl);
        showFrame.style.border = "0";
        showFrame.style.height = "87vh";
        showFrame.style.width = "40vw";
        showFrame.style.margin = "3vh 30vw";
        showFrame.style.display = "block";
      }
    });
  }

  // ---------- Rahmen setzen ----------

  function setFrameGemeinsam(x, selektedKlasse) {
    var linkUrl = x.getAttribute("data-url");
    var screenSet = x.getAttribute("data-fullscreen");
    var linkSet = x.getAttribute("data-targetblank");
    var linkSidebar = x.getAttribute("data-sidebar");

    if (linkSet === "yes") {
      window.open(linkUrl, "_blank");
      return;
    }

    safeClearFrame();

    if (overlayActive) {
      var overlay = document.querySelector(".textOverlay");
      if (overlay) overlay.style.display = "none";
    }

    clearAllSelections();
    x.classList.add(selektedKlasse);

    var showFrame = document.getElementById("showFrame");
    var sideFrame = document.getElementById("sideFrame");

    if (screenSet === "yes" && linkSidebar === "no") {
      showFrame.setAttribute("src", linkUrl);
      showFrame.style.border = "0";
      showFrame.style.height = "92vh";
      showFrame.style.width = "100vw";
      showFrame.style.display = "block";
      showFrame.style.margin = "0";
      if (sideFrame) sideFrame.style.display = "none";
    } else if (screenSet === "yes" && linkSidebar === "yes") {
      showFrame.setAttribute("src", linkUrl);
      showFrame.style.border = "0";
      showFrame.style.height = "92vh";
      showFrame.style.width = "80vw";
      showFrame.style.display = "block";
      showFrame.style.margin = "0";
      if (sideFrame) {
        sideFrame.style.border = "0";
        sideFrame.style.display = "block";
      }
    } else if (screenSet === "no" && linkSidebar === "yes") {
      showFrame.setAttribute("src", linkUrl);
      showFrame.style.border = "0";
      showFrame.style.height = "87vh";
      showFrame.style.width = "40vw";
      showFrame.style.margin = "3vh 20vw";
      showFrame.style.display = "block";
      if (sideFrame) {
        sideFrame.style.border = "0";
        sideFrame.style.display = "block";
      }
    } else {
      showFrame.setAttribute("src", linkUrl);
      showFrame.style.border = "0";
      showFrame.style.height = "87vh";
      showFrame.style.width = "40vw";
      showFrame.style.margin = "3vh 30vw";
      showFrame.style.display = "block";
      if (sideFrame) sideFrame.style.display = "none";
    }
  }

  window.setFrame = function (x) {
    setFrameGemeinsam(x, "menuSelected");
    setTimeout(function () {
      burgerMenuZuklappen();
    }, 150);
  };

  window.setFrameBar = function (x) {
    setFrameGemeinsam(x, "menuBarSelected");
  };

  window.setImprint = function (x) {
    if (overlayActive) {
      var overlay = document.querySelector(".textOverlay");
      if (overlay) overlay.style.display = "none";
    }

    clearAllSelections();
    x.classList.add("specialSelected");

    var sideFrame = document.getElementById("sideFrame");
    if (sideFrame) sideFrame.style.display = "none";

    var linkUrl = x.getAttribute("data-url");
    var showFrame = document.getElementById("showFrame");
    showFrame.setAttribute("src", linkUrl);
    showFrame.style.border = "0";
    showFrame.style.height = "87vh";
    showFrame.style.width = "40vw";
    showFrame.style.margin = "3vh 30vw";
    showFrame.style.display = "block";
  };

  // ---------- Start ----------

  function initializePage() {
    document.title = appName;

    var favicon = document.getElementById("favicon");
    var start = (window.APPACK && window.APPACK.start) || {};
    if (favicon && hasValue(start.startLogo)) {
      favicon.setAttribute("href", start.startLogo);
    }

    bindEvents();

    readAppColors();
    applyLoaderColors();
    buildDynamicCss();

    loadStartSettings();
    loadSidebarSettings();
    loadFooterSettings();

    loadMenuSettings();

    buildDynamicCss();
    hidePageLoader();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializePage);
  } else {
    initializePage();
  }
})();
