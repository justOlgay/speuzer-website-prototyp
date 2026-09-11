// Startseite – P0-Platzhalter. Wird in Paket P2 durch die echte Startseite
// (Hero, nächste Spiele, Trainingszeiten, Meldungen) ersetzt.

export function seite(daten) {
  return {
    url: "/",
    title: "Start",
    description:
      "Prototyp und Testumgebung für den künftigen Webauftritt des F.F.V. Sportfreunde 04 – noch im Aufbau, keine Live-Seite.",
    inhalt: `
<section class="container">
  <h1>FFV Sportfreunde 04 – Prototyp im Aufbau</h1>
  <p class="inhalt">Dies ist ein Prototyp / eine Testumgebung für den Vorstand des F.F.V. Sportfreunde 04. Hier entsteht Schritt für Schritt ein neuer Webauftritt – das ist nicht die Live-Seite und wird auch nicht automatisch dorthin übernommen.</p>
  <p><a class="knopf" href="styleguide/">Zum Gestaltungssystem</a></p>
</section>
`,
  };
}
