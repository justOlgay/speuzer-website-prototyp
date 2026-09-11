// Mach mit /verein/mach-mit/ (P5) – Aufruf zu ehrenamtlichem Engagement,
// Text von der Live-Seite übernommen (ohne Emojis). Diese Seite verlinkt
// weder Bilder noch andere interne Seiten, daher kein PFAD-Konstante nötig
// (siehe pfadZurWurzel() in tools/build.mjs für Seiten, die eine brauchen).

function seitenkopfAbschnitt() {
  return `<section class="abschnitt seitenkopf">
  <div class="container">
    <h1>Mach mit</h1>
    <p class="seitenkopf__lead">Wir brauchen Dich! Werde Teil unseres Vereins-Teams.</p>
  </div>
</section>`;
}

function einleitungAbschnitt() {
  return `<section class="abschnitt">
  <div class="container fluss">
    <p class="inhalt">Liebe Vereinsmitglieder, Eltern und Freunde des Vereins, ein Verein lebt nicht nur vom Sport auf dem Platz, sondern vor allem von den Menschen dahinter. Damit wir auch in Zukunft unseren Kindern, Jugendlichen und Erwachsenen ein attraktives Vereinsleben bieten können, suchen wir engagierte Unterstützung.</p>
    <div class="raster raster--4">
      <div class="karte">
        <span class="karte__titel">Trainer</span>
      </div>
      <div class="karte">
        <span class="karte__titel">Betreuer</span>
      </div>
      <div class="karte">
        <span class="karte__titel">Vorstand</span>
      </div>
      <div class="karte">
        <span class="karte__titel">Ehrenamt mit Herz</span>
      </div>
    </div>
    <p class="inhalt">Du musst kein Profi sein. Wichtig sind vor allem Freude am Vereinsleben, Teamgeist und die Bereitschaft, sich einzubringen. Ob regelmäßig oder gelegentlich, jede helfende Hand ist wertvoll und trägt dazu bei, unseren Verein weiterzuentwickeln. Gemeinsam können wir dafür sorgen, dass unser Verein auch in Zukunft ein Ort für Sport, Gemeinschaft und Freundschaft bleibt.</p>
  </div>
</section>`;
}

function aufrufAbschnitt() {
  return `<section class="abschnitt--blau abschnitt abschnitt--eng">
  <div class="container fluss">
    <h2>Hast Du Interesse oder möchtest mehr erfahren?</h2>
    <p class="knopfzeile">
      <a class="knopf knopf--weiss" href="mailto:geschaeftsstelle@sportfreunde04.de?subject=Ich%20helfe%20gern">Ich helfe gern – E-Mail schreiben</a>
    </p>
    <p class="meta" style="color:var(--blau-100);">Wir freuen uns auf Deine Unterstützung! Gemeinsam sind wir Verein. Gemeinsam bewegen wir mehr.</p>
  </div>
</section>`;
}

export function seite() {
  const inhalt = [seitenkopfAbschnitt(), einleitungAbschnitt(), aufrufAbschnitt()].join("\n");

  return {
    url: "/verein/mach-mit/",
    title: "Mach mit",
    description:
      "Trainer, Betreuer, Vorstand oder Ehrenamt mit Herz: Der FFV Sportfreunde 04 sucht Menschen, die mit anpacken – eine E-Mail an die Geschäftsstelle genügt.",
    inhalt,
  };
}
