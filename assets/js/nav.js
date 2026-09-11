// Kopfzeile – Menü-Verhalten (kein Framework). Ohne dieses Skript bleibt die
// Navigation eine einfache, immer sichtbare Liste unterhalb der Kopfzeile.
document.documentElement.classList.add("js");

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
