// Kopfzeile – P0: nur Wappen + Vereinsname als Link zur Startseite.
// Die eigentliche Navigation (6 Menüpunkte, Burger-Menü) kommt in Paket P1.

export function header({ pfad, daten }) {
  const name = daten.verein?.name_kurz ?? "FFV Sportfreunde 04";
  return `<header class="kopf">
  <div class="container kopf__zeile">
    <a class="kopf__marke" href="${pfad}">
      <img src="${pfad}assets/logo/wappen-blau.svg" width="40" height="39" alt="" />
      <span>${name}</span>
    </a>
  </div>
</header>`;
}
