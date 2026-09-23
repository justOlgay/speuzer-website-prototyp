// Shop /shop/ (P8) – zwei externe Partnershops (Fanshop, Teamshop), keine
// eigene Bestellstrecke. Ab P9-Korrektur A5 zusätzlich ein Hinweisabschnitt
// zur Mannschafts-Vereinskleidung (Bestellung über das Trainerteam).

import { ruecklink } from "../vorlagen/hilfen.mjs";

// Diese Seite liegt immer unter "/shop/" (Tiefe 1), daher immer "../"
// (siehe pfadZurWurzel() in tools/build.mjs).
const PFAD = "../";

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function seitenkopfAbschnitt() {
  return `<section class="abschnitt seitenkopf">
  <div class="container">
    ${ruecklink(`${PFAD}verein/`, "Verein")}
    <h1>Shop</h1>
    <p class="seitenkopf__lead">Fanartikel und Teamausstattung – zwei Partner, ein Ort.</p>
  </div>
</section>`;
}

function shopsAbschnitt(daten) {
  const verein = daten.verein ?? {};
  return `<section class="abschnitt">
  <div class="container fluss">
    <div class="raster raster--2">
      <a class="karte karte--link" href="${escapeHtml(verein.fanshop ?? "")}" rel="noopener" target="_blank">
        <span class="karte__titel">Fanshop</span>
        <p>Schals, Shirts und mehr mit dem Wappen der Sportfreunde. Betrieben von fan12.</p>
        <span class="karte__mehr">sportfreunde04.fan12.de ›</span>
      </a>
      <a class="karte karte--link" href="${escapeHtml(verein.teamshop ?? "")}" rel="noopener" target="_blank">
        <span class="karte__titel">Teamshop</span>
        <p>Trikots, Trainingskleidung und Ausrüstung im Vereinsdesign für Spielerinnen, Spieler und Eltern. Betrieben von 11teamsports.</p>
        <span class="karte__mehr">11teamsports.com ›</span>
      </a>
    </div>
    <div class="hinweis hinweis--info">
      <p style="margin:0;">Beide Shops sind Angebote externer Partner. Bestellung, Bezahlung und Versand laufen dort; es gelten deren Datenschutzbestimmungen.</p>
    </div>
  </div>
</section>`;
}

// P9-Korrektur A5: Seite war sehr kurz (Fußbereich ab 650px) – Ergänzung
// unter den beiden Shop-Karten, Wortlaut wörtlich aus dem Plan.
function vereinskleidungAbschnitt() {
  return `<section class="abschnitt--hell abschnitt">
  <div class="container fluss">
    <h2>Vereinskleidung für Mannschaften</h2>
    <p>Trikots und Trainingsanzüge der Mannschaften werden über das Trainerteam gesammelt bestellt – Fragen dazu an das Trainerteam der jeweiligen Mannschaft oder an die Geschäftsstelle.</p>
    <p class="knopfzeile">
      <a class="knopf knopf--sekundaer" href="${PFAD}mannschaften/">Zu den Mannschaften</a>
    </p>
  </div>
</section>`;
}

export function seite(daten) {
  const inhalt = [
    seitenkopfAbschnitt(),
    shopsAbschnitt(daten),
    vereinskleidungAbschnitt(),
  ].join("\n");

  return {
    url: "/shop/",
    title: "Shop",
    description:
      "Fanshop und Teamshop des FFV Sportfreunde 04: Fanartikel bei fan12 und Trikots sowie Trainingskleidung im Vereinsdesign bei 11teamsports.",
    inhalt,
    bodyclass: "shop",
  };
}
