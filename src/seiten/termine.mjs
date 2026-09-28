// Termine (28.09.2026) – Spiele, Kinderfestivals und Vereinsveranstaltungen
// oben, darunter die Trainingswoche aller Mannschaften. Inhalt, Stil und
// Skript kommen aus src/vorlagen/termine.mjs; dieselbe Quelle ergibt die
// App-Seite assets/app/Termine-App.html (npm run tpl-bauen). Menüpunkt
// „Termine“ der Website-Hülle: web/termine.html.

import { termineInhalt, termineKopf } from "../vorlagen/termine.mjs";

export function seite(daten) {
  return {
    url: "/termine/",
    title: "Termine",
    description:
      "Spiele, Kinderfestivals und Veranstaltungen des FFV Sportfreunde 04 auf einen Blick – dazu die Trainingswoche aller elf Mannschaften.",
    inhalt: termineInhalt(daten),
    kopfZusatz: termineKopf(),
  };
}
