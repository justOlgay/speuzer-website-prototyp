// Platzbelegung (31.10.2026) – wann welcher Platzteil auf unserer Anlage belegt
// oder frei ist, Woche für Woche; „frei“ führt zu einer Anfrage per E-Mail an die
// Geschäftsstelle (gebucht wird nichts). Inhalt, Stil und Skript kommen aus
// src/vorlagen/platzbelegung.mjs; dieselbe Quelle ergibt die App-Seite
// assets/app/Platzbelegung-App.html (npm run tpl-bauen). Erreichbar über die Zeile
// „Platzbelegung“ der Seite Verein (Website: web/platzbelegung.html).

import { platzbelegungInhalt, platzbelegungKopf } from "../vorlagen/platzbelegung.mjs";

export function seite(daten) {
  return {
    url: "/platzbelegung/",
    title: "Platzbelegung",
    description:
      "Wann welcher Platzteil auf unserer Anlage in der Mainzer Landstraße belegt ist: Training, Heimspiele und freie Zeiten, Woche für Woche.",
    inhalt: platzbelegungInhalt(daten),
    kopfZusatz: platzbelegungKopf(),
  };
}
