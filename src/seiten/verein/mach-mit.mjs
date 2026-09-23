// Mach mit /verein/mach-mit/ (P5) – Aufruf zu ehrenamtlichem Engagement,
// Text von der Live-Seite übernommen (ohne Emojis). W3, Abschnitt 7: je
// Karte ein Satz (statt leerer Platzhalter) und Links zu Mannschaften und
// Vorstand & Kontakt, dafür jetzt PFAD nötig (siehe pfadZurWurzel() in
// tools/build.mjs).

import { ruecklink } from "../../vorlagen/hilfen.mjs";

// Diese Seite liegt immer unter "/verein/mach-mit/" (Tiefe 2), daher immer
// "../../" (siehe pfadZurWurzel() in tools/build.mjs).
const PFAD = "../../";

function seitenkopfAbschnitt() {
  return `<section class="abschnitt seitenkopf">
  <div class="container">
    ${ruecklink(`${PFAD}verein/`, "Verein")}
    <h1>Mach mit &amp; Ehrenamt</h1>
    <p class="seitenkopf__lead">Wir brauchen dich! Werde Teil unseres Vereins-Teams.</p>
  </div>
</section>`;
}

// W9-Korrektur (QA3 1440-30/390-29): Briefanrede gestrichen (wirkte wie ein
// eingefügter Rundbrief statt Website-Text); "G-Jugend"/"A-Jugend" mit
// geschütztem Bindestrich (U+2011), damit sie nicht am Zeilenende brechen;
// "jede Hand zählt" (Karte) und "jede helfende Hand ist wertvoll" (Absatz
// danach) waren dieselbe Aussage doppelt – der Absatz sagt es jetzt nur noch
// einmal, ohne die Kartenformulierung zu wiederholen.
function einleitungAbschnitt() {
  return `<section class="abschnitt">
  <div class="container fluss">
    <p class="inhalt">Ein Verein lebt nicht nur vom Sport auf dem Platz, sondern vor allem von den Menschen dahinter. Damit wir auch in Zukunft unseren Kindern, Jugendlichen und Erwachsenen ein attraktives Vereinsleben bieten können, suchen wir engagierte Unterstützung.</p>
    <div class="raster raster--4">
      <div class="karte fluss">
        <span class="karte__titel">Trainer</span>
        <p>Jugendteams von der G‑Jugend bis zur A‑Jugend; eine Lizenz ist keine Voraussetzung, der Verein unterstützt die Ausbildung.</p>
      </div>
      <div class="karte fluss">
        <span class="karte__titel">Betreuer</span>
        <p>Spieltage begleiten, Eltern koordinieren, Trikots und Getränke im Blick.</p>
      </div>
      <div class="karte fluss">
        <span class="karte__titel">Vorstand</span>
        <p>Mitarbeit in Ausschüssen und Projekten, Wahl in der Mitgliederversammlung.</p>
      </div>
      <div class="karte fluss">
        <span class="karte__titel">Helfer</span>
        <p>Arbeitstage, Turniere, Feste – jede Hand zählt.</p>
      </div>
    </div>
    <p class="inhalt">Du musst kein Profi sein. Wichtig sind vor allem Freude am Vereinsleben, Teamgeist und die Bereitschaft, sich einzubringen. Ob regelmäßig oder gelegentlich – so sorgen wir dafür, dass unser Verein auch in Zukunft ein Ort für Sport, Gemeinschaft und Freundschaft bleibt.</p>
    <p class="knopfzeile">
      <a class="knopf knopf--sekundaer" href="${PFAD}mannschaften/">Zu den Mannschaften</a>
      <a class="knopf knopf--sekundaer" href="${PFAD}verein/vorstand/">Zum Vorstand</a>
    </p>
  </div>
</section>`;
}

// W9-Korrektur (QA3 1440-30/390-29): Schlusssatz war unlogisch ("Gemeinsam
// bewegen wir mehr – oder möchtest du mehr erfahren?" fragt nach mehr
// Information, obwohl direkt darunter schon der Kontakt-Knopf steht) und
// wiederholte "Gemeinsam"/"mehr" doppelt – jetzt der von Olgay/Verein
// festgelegte Wortlaut.
function aufrufAbschnitt() {
  return `<section class="abschnitt--blau abschnitt abschnitt--eng">
  <div class="container fluss">
    <h2>Wir freuen uns auf deine Unterstützung</h2>
    <p>Gemeinsam bewegen wir mehr. Schreib uns, wie du helfen möchtest.</p>
    <p class="knopfzeile">
      <a class="knopf knopf--weiss" href="mailto:geschaeftsstelle@sportfreunde04.de?subject=Ich%20helfe%20gern">Ich helfe gern – E-Mail schreiben</a>
    </p>
  </div>
</section>`;
}

export function seite() {
  const inhalt = [
    seitenkopfAbschnitt(),
    einleitungAbschnitt(),
    aufrufAbschnitt(),
  ].join("\n");

  return {
    url: "/verein/mach-mit/",
    // W9-Korrektur (QA3 390-30/quer-33): Trenner einheitlich "&" statt "·"
    // (alle übrigen Seitentitel/Verteiler-Einträge trennen mit "&"), H1/Title
    // weiter an den Verein-Verteiler angeglichen (src/seiten/verein/index.mjs).
    title: "Mach mit & Ehrenamt",
    description:
      "Trainer, Betreuer, Vorstand oder Ehrenamt mit Herz: Der FFV Sportfreunde 04 sucht Menschen, die mit anpacken – eine E-Mail an die Geschäftsstelle genügt.",
    inhalt,
  };
}
