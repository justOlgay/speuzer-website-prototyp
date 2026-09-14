// Shop /shop/ (P8) – zwei externe Partnershops (Fanshop, Teamshop), keine
// eigene Bestellstrecke.

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
        <span class="karte__mehr">sportfreunde04.fan12.de →</span>
      </a>
      <a class="karte karte--link" href="${escapeHtml(verein.teamshop ?? "")}" rel="noopener" target="_blank">
        <span class="karte__titel">Teamshop</span>
        <p>Trikots, Trainingskleidung und Ausrüstung im Vereinsdesign für Spielerinnen, Spieler und Eltern. Betrieben von 11teamsports.</p>
        <span class="karte__mehr">11teamsports.com →</span>
      </a>
    </div>
    <div class="hinweis hinweis--info">
      <p style="margin:0;">Beide Shops sind Angebote externer Partner. Bestellung, Bezahlung und Versand laufen dort; es gelten deren Datenschutzbestimmungen.</p>
    </div>
  </div>
</section>`;
}

export function seite(daten) {
  const inhalt = [seitenkopfAbschnitt(), shopsAbschnitt(daten)].join("\n");

  return {
    url: "/shop/",
    title: "Shop",
    description:
      "Fanshop und Teamshop des FFV Sportfreunde 04: Fanartikel bei fan12 und Trikots sowie Trainingskleidung im Vereinsdesign bei 11teamsports.",
    inhalt,
    bodyclass: "shop",
  };
}
