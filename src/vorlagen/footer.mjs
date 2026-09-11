// Fußbereich – P0: nur Vereinsname + Hinweis, dass es sich um einen Prototyp handelt.
// Kontakt, Anfahrt, Shop, Impressum, Datenschutz kommen in P1/P8.

export function footer({ pfad, daten }) {
  const name = daten.verein?.name_register ?? daten.verein?.name_kurz ?? "FFV Sportfreunde 04";
  return `<footer class="fuss">
  <div class="container">
    <p>${name}</p>
    <p>Prototyp – Testumgebung, keine Live-Seite.</p>
  </div>
</footer>`;
}
