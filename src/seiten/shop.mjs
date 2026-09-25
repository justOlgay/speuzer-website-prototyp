// Shop /shop/ (P8) – zwei externe Partnershops (Fanshop, Teamshop), keine
// eigene Bestellstrecke. Ab P9-Korrektur A5 zusätzlich ein Hinweisabschnitt
// zur Mannschafts-Vereinskleidung (Bestellung über das Trainerteam).

import { ruecklink, APP_MODUS_SKRIPT } from "../vorlagen/hilfen.mjs";

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
    <h1>Fanshop &amp; Teamshop</h1>
    <p class="seitenkopf__lead">Fanartikel und Teamausstattung – zwei getrennte Online-Shops unserer Partner.</p>
  </div>
</section>`;
}

// W8-Korrektur: vorher die ganze Karte als Link mit der nackten Domain als
// "mehr"-Text ("sportfreunde04.fan12.de ›") – jetzt ein Knopf mit dem Namen
// des Partners statt der Domain (Prüfer-Befund). Die Karte selbst ist damit
// kein Link mehr (sonst verschachtelte Links), der Knopf trägt die Adresse.
// W9-Korrektur (QA3 390-10): "Zum Teamshop bei 11TeamSports" brach auf zwei
// Zeilen um, "Zum Fanshop bei fan12" blieb einzeilig – beide Knöpfe sahen
// dadurch unterschiedlich aus. Kürzere Beschriftung (der Anbieter steht
// schon im Fließtext darüber), white-space:nowrap, gleich gebaut.
function shopsAbschnitt(daten) {
  const verein = daten.verein ?? {};
  return `<section class="abschnitt">
  <div class="container fluss">
    <div class="raster raster--2">
      <div class="karte fluss">
        <span class="karte__titel">Fanshop</span>
        <p>Schals, Shirts und mehr mit dem Wappen der Sportfreunde. Betrieben von fan12.</p>
        <p class="knopfzeile knopfzeile--voll">
          <a class="knopf knopf--sekundaer" style="white-space:nowrap;" href="${escapeHtml(verein.fanshop ?? "")}" rel="noopener" target="_blank">Zum Fanshop</a>
        </p>
      </div>
      <div class="karte fluss">
        <span class="karte__titel">Teamshop</span>
        <p>Trikots, Trainingskleidung und Ausrüstung im Vereinsdesign für Spielerinnen, Spieler und Eltern. Betrieben von 11TeamSports.</p>
        <p class="knopfzeile knopfzeile--voll">
          <a class="knopf knopf--sekundaer" style="white-space:nowrap;" href="${escapeHtml(verein.teamshop ?? "")}" rel="noopener" target="_blank">Zum Teamshop</a>
        </p>
      </div>
    </div>
    <div class="hinweis hinweis--info">
      <p style="margin:0;">Beide Shops sind Angebote externer Partner. Bestellung, Bezahlung und Versand laufen dort; es gelten deren Datenschutzbestimmungen.</p>
    </div>
  </div>
</section>`;
}

// P9-Korrektur A5: Seite war sehr kurz (Fußbereich ab 650px) – Ergänzung
// unter den beiden Shop-Karten. W9-Korrektur (QA3 1440-31): Der Satz stand
// im Widerspruch zur Teamshop-Karte oben ("Trikots … für Spielerinnen,
// Spieler und Eltern" klang nach Bestellung im Teamshop, dieser Absatz sagte
// "über das Trainerteam gesammelt bestellt") – jetzt klar getrennt, exakter
// Wortlaut aus w9-b.md.
function vereinskleidungAbschnitt() {
  return `<section class="abschnitt--hell abschnitt">
  <div class="container fluss">
    <h2>Vereinskleidung für Mannschaften</h2>
    <p>Mannschaftstrikots bestellt das Trainerteam gesammelt; einzelne Teile und Ersatz gibt es im Teamshop.</p>
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
    // App-Modus (?app=1): Links führen in die App-Seiten, siehe hilfen.mjs
    kopfZusatz: APP_MODUS_SKRIPT,
    // W8-Korrektur: H1/Title an den Verein-Verteiler angeglichen (dort schon
    // "Fanshop & Teamshop" verlinkt, siehe src/seiten/verein/index.mjs).
    title: "Fanshop & Teamshop",
    description:
      "Fanshop und Teamshop des FFV Sportfreunde 04: Fanartikel bei fan12 und Trikots sowie Trainingskleidung im Vereinsdesign bei 11TeamSports.",
    inhalt,
    bodyclass: "shop",
  };
}
