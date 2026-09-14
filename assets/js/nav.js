// Kopfzeile – Menü-Verhalten (kein Framework). Ohne dieses Skript bleibt die
// Navigation eine einfache, immer sichtbare Liste unterhalb der Kopfzeile.
document.documentElement.classList.add("js");

// App-Modus (P9, Plan-Abschnitt B1): ?ansicht=app auf einer beliebigen Seite
// schaltet die Klasse .ansicht-app auf <html>. Zusätzlich zu diesem Skript
// setzt ein 2-zeiliges Inline-Skript im <head> von basis.html (vor den
// Stylesheets) dieselbe Klasse so früh wie möglich, damit die App-Kopfzeile/
// Tab-Leiste nicht erst sichtbar umspringt, nachdem dieses (defer-geladene)
// Skript ausgeführt hat.
const istAppAnsicht = /(?:^|[?&])ansicht=app(?:&|$)/.test(location.search);
if (istAppAnsicht) {
  document.documentElement.classList.add("ansicht-app");

  // Alle internen Links (kein http/https, kein mailto:/tel:, kein reiner
  // Anker) um ?ansicht=app ergänzen, damit die Navigation im App-Modus
  // bleibt. Ein vorhandener Hash (#…) bleibt erhalten.
  for (const link of document.querySelectorAll("a[href]")) {
    const href = link.getAttribute("href");
    if (!href) continue;
    if (
      href.startsWith("http://") || href.startsWith("https://") ||
      href.startsWith("mailto:") || href.startsWith("tel:") ||
      href.startsWith("#")
    ) continue;
    if (/(?:^|[?&])ansicht=app(?:&|$)/.test(href)) continue;

    const trennstelle = href.indexOf("#");
    const ohneHash = trennstelle === -1 ? href : href.slice(0, trennstelle);
    const hash = trennstelle === -1 ? "" : href.slice(trennstelle);
    const trenner = ohneHash.includes("?") ? "&" : "?";
    link.setAttribute("href", `${ohneHash}${trenner}ansicht=app${hash}`);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const burger = document.querySelector(".kopf__burger");
  const nav = document.getElementById("hauptmenue");
  if (!burger || !nav) return;

  const schliessenKnopf = nav.querySelector(".kopf__schliessen");
  const body = document.body;

  function fokussierbareElemente() {
    return [...nav.querySelectorAll("a[href], button:not([disabled])")].filter(
      (el) => el.offsetParent !== null
    );
  }

  function oeffnen() {
    nav.classList.add("ist-offen");
    body.classList.add("menue-offen");
    burger.setAttribute("aria-expanded", "true");
    if (schliessenKnopf) schliessenKnopf.focus();
  }

  function schliessen(fokusZurueck) {
    nav.classList.remove("ist-offen");
    body.classList.remove("menue-offen");
    burger.setAttribute("aria-expanded", "false");
    if (fokusZurueck !== false) burger.focus();
  }

  burger.addEventListener("click", () => {
    if (nav.classList.contains("ist-offen")) {
      schliessen();
    } else {
      oeffnen();
    }
  });

  if (schliessenKnopf) {
    schliessenKnopf.addEventListener("click", () => schliessen());
  }

  nav.addEventListener("click", (ev) => {
    const link = ev.target.closest("a[href]");
    if (link) schliessen(false);
  });

  document.addEventListener("keydown", (ev) => {
    if (!nav.classList.contains("ist-offen")) return;

    if (ev.key === "Escape") {
      schliessen();
      return;
    }

    if (ev.key === "Tab") {
      const elemente = fokussierbareElemente();
      if (elemente.length === 0) return;
      const erster = elemente[0];
      const letzter = elemente[elemente.length - 1];
      if (ev.shiftKey && document.activeElement === erster) {
        ev.preventDefault();
        letzter.focus();
      } else if (!ev.shiftKey && document.activeElement === letzter) {
        ev.preventDefault();
        erster.focus();
      }
    }
  });
});
