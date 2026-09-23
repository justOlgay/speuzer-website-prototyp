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
      <div class="karte fluss">
        <span class="karte__titel">Trainer</span>
        <p>Jugendteams von der G- bis zur A-Jugend; eine Lizenz ist keine Voraussetzung, der Verein unterstützt die Ausbildung.</p>
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
        <p>Arbeitstage, Turniere, Feste – jede Hand zählt.</p>
      </div>
    </div>
    <p class="inhalt">Du musst kein Profi sein. Wichtig sind vor allem Freude am Vereinsleben, Teamgeist und die Bereitschaft, sich einzubringen. Ob regelmäßig oder gelegentlich, jede helfende Hand ist wertvoll und trägt dazu bei, unseren Verein weiterzuentwickeln. Gemeinsam können wir dafür sorgen, dass unser Verein auch in Zukunft ein Ort für Sport, Gemeinschaft und Freundschaft bleibt.</p>
    <p class="knopfzeile">
      <a class="knopf knopf--sekundaer" href="${PFAD}mannschaften/">Zu den Mannschaften</a>
      <a class="knopf knopf--sekundaer" href="${PFAD}verein/vorstand/">Zum Vorstand &amp; Kontakt</a>
    </p>
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
  const inhalt = [
    seitenkopfAbschnitt(),
    einleitungAbschnitt(),
    aufrufAbschnitt(),
  ].join("\n");

  return {
    url: "/verein/mach-mit/",
    title: "Mach mit",
    description:
      "Trainer, Betreuer, Vorstand oder Ehrenamt mit Herz: Der FFV Sportfreunde 04 sucht Menschen, die mit anpacken – eine E-Mail an die Geschäftsstelle genügt.",
    inhalt,
  };
}
