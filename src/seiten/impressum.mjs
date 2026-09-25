// Impressum /impressum/ (P8) – Angaben gemäß § 5 DDG. Kein appack/DOSB-
// Werbeblock (das ist der Live-App-Fußtext, nicht Teil dieses Prototyps).

import { mailLink, telefonAnzeige } from "../vorlagen/hilfen.mjs";

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function telHref(nummer) {
  return "tel:" + String(nummer ?? "").replace(/[^\d+]/g, "");
}

// W9-Korrektur (Entscheidung 13/390-17, w9-b.md): "Sportfreunde 1904 e. V."
// bricht sonst vor der Jahreszahl um ("Frankfurter Fußballverein
// Sportfreunde" / "1904 e. V."), auf schmalen Screens (verein-karneval-01)
// sogar "1904 e. V." allein in der letzten Zeile. data/verein.json koppelt
// "1904"/"e."/"V." bereits mit geschützten Leerzeichen, nur die Lücke
// zwischen "Sportfreunde" und "1904" ist noch ein normales Leerzeichen –
// data/verein.json ist tabu (nur Titel/Metadaten von downloads/unterlagen/
// datenschutz dürfen geändert werden), daher hier nur diese eine Lücke an
// der Anzeige nachgezogen.
function mitGeschuetztemVereinsnamen(text) {
  return String(text ?? "").replace("Sportfreunde 1904", "Sportfreunde 1904");
}

function seitenkopfAbschnitt() {
  return `<section class="abschnitt seitenkopf">
  <div class="container">
    <h1>Impressum</h1>
    <p class="seitenkopf__lead">Angaben gemäß § 5 DDG</p>
  </div>
</section>`;
}

// W10-Korrektur (QA4 web-1440-verein-und-rest Nr. 30/web-390-verein-und-rest
// Nr. 15): dieselbe Adresse (Mainzer Landstraße 480) hieß hier "Sportstätte",
// auf /kontakt/ (Anfahrt-Karte) "Vereinsplatz" – jetzt einheitlich
// "Vereinsplatz" auf beiden Seiten.
function angabenAbschnitt(daten) {
  const verein = daten.verein ?? {};
  const sportstaette = verein.sportstaette ?? {};
  const post = verein.post ?? {};
  const vertretung = verein.vertretung ?? [];

  const vertretungHtml = vertretung.map((v) => `<li>${escapeHtml(v)}</li>`).join("\n          ");

  return `<section class="abschnitt">
  <div class="container">
    <div class="inhalt">
    <dl class="angaben">
      <dt>Anbieter</dt>
      <dd>${escapeHtml(mitGeschuetztemVereinsnamen(verein.name_register ?? ""))}</dd>

      <dt>Vereinsplatz</dt>
      <dd>${escapeHtml(sportstaette.strasse ?? "")}<br>${escapeHtml(sportstaette.plz ?? "")} ${escapeHtml(sportstaette.ort ?? "")}</dd>

      <dt>Postanschrift</dt>
      <dd>${escapeHtml(post.postfach ?? "")}<br>${escapeHtml(post.plz ?? "")} ${escapeHtml(post.ort ?? "")}</dd>

      <dt>Telefon</dt>
      <dd>
        <p style="margin:0;"><a href="${telHref(verein.tel_geschaeftsstelle)}">Geschäftsstelle ${escapeHtml(telefonAnzeige(verein.tel_geschaeftsstelle))}</a></p>
        <p style="margin:0;"><a href="${telHref(verein.tel_platzwart)}">Platzwart ${escapeHtml(telefonAnzeige(verein.tel_platzwart))}</a></p>
      </dd>

      <dt>E-Mail</dt>
      <dd><p style="margin:0;">${mailLink(verein.mail ?? "geschaeftsstelle@sportfreunde04.de")}</p></dd>

      <dt>Website</dt>
      <dd>www.sportfreunde04.de</dd>

      <dt>Vertretungsberechtigter Vorstand</dt>
      <dd>
        <ul>
          ${vertretungHtml}
        </ul>
      </dd>

      <dt>Registergericht / Registernummer</dt>
      <dd>${escapeHtml(verein.register ?? "")}</dd>
${verein.vereinsnummer ? `
      <dt>Vereinsnummer</dt>
      <dd>${escapeHtml(verein.vereinsnummer)}</dd>
` : ""}
      <dt>Verantwortlich für den Inhalt nach §&nbsp;18 Abs.&nbsp;2 MStV</dt>
      <dd>${escapeHtml(vertretung[0] ?? "")}<br>${escapeHtml(sportstaette.strasse ?? "")}<br>${escapeHtml(sportstaette.plz ?? "")} ${escapeHtml(sportstaette.ort ?? "")}</dd>
    </dl>
    </div>
  </div>
</section>`;
}

function haftungAbschnitt() {
  return `<section class="abschnitt--hell abschnitt">
  <div class="container fluss">
    <div class="inhalt fluss">
    <h2>Haftungshinweis</h2>
    <p>Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Inhalte externer Links. Für den Inhalt der verlinkten Seiten sind ausschließlich deren Betreiber verantwortlich.</p>
    </div>
  </div>
</section>`;
}

// Nur im Prototyp auf GitHub Pages; die Live-Website (appack) trägt diesen
// Hinweis nicht (data-nur-prototyp, siehe tools/appack-paket.mjs).
function prototypHinweisAbschnitt() {
  return `<div data-nur-prototyp>
<section class="abschnitt">
  <div class="container fluss">
    <div class="inhalt fluss">
    <h2>Hinweis zum Prototyp</h2>
    <div class="hinweis hinweis--info">
      <p style="margin:0;">Diese Seite ist ein Prototyp und keine veröffentlichte Vereinswebsite. Sie dient der internen Abstimmung des Vorstands. Verbindliche Angaben stehen unter www.sportfreunde04.de.</p>
    </div>
    </div>
  </div>
</section>
</div>`;
}

export function seite(daten) {
  const inhalt = [
    seitenkopfAbschnitt(),
    angabenAbschnitt(daten),
    haftungAbschnitt(),
    prototypHinweisAbschnitt(),
  ].join("\n");

  return {
    url: "/impressum/",
    title: "Impressum",
    description:
      "Impressum des Frankfurter Fußballvereins Sportfreunde 1904 e. V.: Anschrift, Vertretung, Registergericht und Kontakt der Geschäftsstelle.",
    inhalt,
    bodyclass: "impressum",
  };
}
