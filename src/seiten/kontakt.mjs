// Kontakt & Anfahrt /kontakt/ (P8) – Ansprechpartner nach Anliegen,
// Geschäftsstelle (Adresse, Telefon, Social-Media) und Anfahrt zum
// Sportplatz Mainzer Landstraße (kein Kartenbild, kein externer Dienst
// eingebettet).

import { mailLink, ruecklink } from "../vorlagen/hilfen.mjs";

// Diese Seite liegt immer unter "/kontakt/" (Tiefe 1), daher immer "../"
// (siehe pfadZurWurzel() in tools/build.mjs).
const PFAD = "../";

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

// Wie routeUrl() in src/seiten/mannschaften/team.mjs, hier lokal (nur für
// die eine feste Rebstock-Adresse gebraucht).
function googleMapsUrl(adresse) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresse)}`;
}

// mailto-Knopf mit optionalem Betreff (Plan-Abschnitt C nennt Betreffs nur
// für einen Teil der Ansprechpartner – ohne Angabe kein erfundener Betreff).
function mailKnopf({ adresse, betreff }) {
  if (!adresse) return "";
  const href = betreff ? `mailto:${adresse}?subject=${encodeURIComponent(betreff)}` : `mailto:${adresse}`;
  return `<a class="knopf knopf--sekundaer" href="${escapeHtml(href)}">E-Mail schreiben</a>`;
}

// ---------- Erreichbarkeit ----------
// Entscheidung Olgay 22.09.2026: Die Geschäftsstelle hat keine festen
// Öffnungszeiten. Website und App zeigen deshalb denselben festen Satz; das
// appack-Worksheet "Öffnungszeiten" (Beispieldaten der Vorlage, in der App
// per openingActive=false ausgeblendet) wird nicht mehr ausgewertet.
function erreichbarkeitHtml() {
  return `<p style="margin:0;"><strong>Keine festen Öffnungszeiten.</strong> Die Geschäftsstelle ist per E-Mail erreichbar, telefonisch nach Vereinbarung.</p>`;
}

// ---------- Seitenkopf ----------

function seitenkopfAbschnitt() {
  return `<section class="abschnitt seitenkopf">
  <div class="container">
    ${ruecklink(`${PFAD}verein/`, "Verein")}
    <h1>Geschäftsstelle &amp; Anfahrt</h1>
    <p class="seitenkopf__lead">So erreichst du uns – per E-Mail an die passende Vereinsadresse oder telefonisch in der Geschäftsstelle.</p>
  </div>
</section>`;
}

// ---------- Ansprechpartner nach Anliegen ----------

// Reihenfolge und Inhalte exakt wie im Plan (Abschnitt C, ursprünglich; Sätze
// und Betreffs ab P9-Korrektur A1) vorgegeben – wörtlich übernommen, nichts
// erfunden. Alle acht Karten haben jetzt einen Satz (P8-Abnahme: ungleiche
// Kartenhöhen/leere Flächen, weil einige Karten keinen Satz hatten).
function ansprechpartner(daten) {
  const verein = daten.verein ?? {};
  const mails = verein.mails ?? {};
  return [
    {
      titel: "Allgemeine Fragen",
      mail: verein.mail,
      text: "Alles, was sonst nirgends passt – die Geschäftsstelle leitet weiter.",
      betreff: "Anfrage über die Website",
    },
    {
      titel: "Probetraining & Jugend",
      mail: mails.jugendleitung,
      text: "Für Kinder und Jugendliche von der A- bis zur G-Jugend.",
      betreff: "Probetraining",
    },
    {
      titel: "Herren & Senioren",
      mail: mails.senioren,
      text: "Fragen zur 1. Herrenmannschaft, Spielausschuss und Seniorenfußball.",
      betreff: "Herren",
    },
    {
      titel: "Karnevalabteilung",
      mail: mails.karneval,
      text: "Die Schnauzer: Gruppen, Übungsstunden, Auftritte.",
      betreff: "Karnevalabteilung",
    },
    {
      titel: "Beiträge & Rechnungen",
      mail: mails.kassierer,
      text: "Beiträge, Lastschrift, Bescheinigungen für Bildung und Teilhabe.",
      betreff: "Beiträge",
    },
    {
      titel: "Kinderschutz",
      mail: mails.kinderschutz,
      text: "Vertraulicher Kontakt zum Kinderschutzbeauftragten.",
      // Bewusst kein Betreff (vertraulich, Plan-Abschnitt A1).
    },
    {
      titel: "Sponsoring & Partner",
      mail: verein.mail,
      text: "Trikot- und Bandenwerbung, Partnerschaften mit der Jugendabteilung.",
      betreff: "Sponsoring",
    },
    {
      titel: "Trainer- und Ehrenamt",
      mail: verein.mail,
      text: "Mitmachen als Trainer, Betreuer oder im Vorstand.",
      betreff: "Ich helfe gern",
    },
  ];
}

// P9-Korrektur A1: Karte als Flex-Spalte (.karte--anliegen in
// komponenten.css), Knopfzeile mit margin-top:auto unten ausgerichtet –
// dadurch sind alle acht Karten im Raster gleich hoch, unabhängig von der
// Satzlänge.
function ansprechpartnerKarte(eintrag) {
  return `<div class="karte karte--anliegen fluss">
      <span class="karte__titel">${escapeHtml(eintrag.titel)}</span>
      <p>${escapeHtml(eintrag.text)}</p>
      <p class="knopfzeile">
        ${mailKnopf({ adresse: eintrag.mail, betreff: eintrag.betreff })}
      </p>
    </div>`;
}

function ansprechpartnerAbschnitt(daten) {
  const karten = ansprechpartner(daten).map(ansprechpartnerKarte).join("\n    ");
  return `<section class="abschnitt">
  <div class="container fluss">
    <h2>Ansprechpartner nach Anliegen</h2>
    <div class="raster raster--3">
    ${karten}
    </div>
  </div>
</section>`;
}

// ---------- Geschäftsstelle ----------

// P9-Korrektur A2: Adresszeilen und Links klebten aneinander (Zeilenhöhe wie
// Fließtext ohne Abstände), Beschriftungen "Sportstätte"/"Postanschrift"
// gingen darin unter – jetzt als <dl class="angaben"> (Baustein aus P8, siehe
// komponenten.css und /impressum/). Der Hinweiskasten rechts bekommt über
// align-items:start (statt des Grid-Standards stretch) nur noch die Höhe
// seines eigenen Inhalts (siehe .anfahrt__raster in komponenten.css).
// Kontaktzeile (Telefon, E-Mail, Website, Instagram): W3-Spezifikation
// Abschnitt 7 verlangt, dass kontakt.html aus data/geschaeftsstelle.json
// "die Öffnungszeiten … und die Kontaktzeile" rendert (W3b, Prüfer-Befund
// "wichtig" – bislang kamen diese vier Felder nur aus data/verein.json).
// data/verein.json bleibt Fallback, falls das appack-Worksheet ein Feld
// nicht liefert. Facebook: Der Verein hat keine Facebook-Seite, nur die
// Gruppe (Entscheidung Olgay 22.09.2026); data/verein.json und das
// Worksheet nennen dieselbe Gruppen-Adresse.
function ausWorksheetOderVerein(wert, fallback) {
  const text = String(wert ?? "").trim();
  return text || fallback;
}

function geschaeftsstelleAbschnitt(daten) {
  const verein = daten.verein ?? {};
  const sportstaette = verein.sportstaette ?? {};
  const post = verein.post ?? {};
  const geschaeftsstelle = daten.geschaeftsstelle ?? {};
  const kontakt = geschaeftsstelle.kontakt ?? {};

  const telefonGeschaeftsstelle = ausWorksheetOderVerein(kontakt.phoneNumber, verein.tel_geschaeftsstelle);
  const email = ausWorksheetOderVerein(kontakt.email, verein.mail ?? "geschaeftsstelle@sportfreunde04.de");
  const website = ausWorksheetOderVerein(kontakt.website, "");
  const instagram = ausWorksheetOderVerein(kontakt.insta, verein.instagram);

  return `<section class="abschnitt--hell abschnitt">
  <div class="container fluss">
    <h2>Geschäftsstelle</h2>
    <div class="anfahrt__raster">
      <div>
        <p>${escapeHtml(verein.name_register ?? "")}</p>
        <dl class="angaben">
          <dt>Sportstätte</dt>
          <dd>${escapeHtml(sportstaette.strasse ?? "")}<br>${escapeHtml(sportstaette.plz ?? "")} ${escapeHtml(sportstaette.ort ?? "")}</dd>

          <dt>Postanschrift</dt>
          <dd>${escapeHtml(post.postfach ?? "")}<br>${escapeHtml(post.plz ?? "")} ${escapeHtml(post.ort ?? "")}</dd>

          <dt>E-Mail</dt>
          <dd><p style="margin:0;">${mailLink(email)}</p></dd>

          <dt>Telefon</dt>
          <dd>
            <p style="margin:0;"><a href="${telHref(telefonGeschaeftsstelle)}">Geschäftsstelle ${escapeHtml(telefonGeschaeftsstelle ?? "")}</a></p>
            <p style="margin:0;"><a href="${telHref(verein.tel_platzwart)}">Platzwart ${escapeHtml(verein.tel_platzwart ?? "")}</a></p>
          </dd>

          ${
            website
              ? `<dt>Website</dt>
          <dd><p style="margin:0;"><a href="${escapeHtml(website)}" rel="noopener" target="_blank">${escapeHtml(website.replace(/^https?:\/\//, ""))}</a></p></dd>`
              : ""
          }

          <dt>Social</dt>
          <dd>
            <p style="margin:0;"><a href="${escapeHtml(instagram ?? "")}" rel="noopener" target="_blank">Instagram @speuzer_ffm</a></p>
            <p style="margin:0;"><a href="${escapeHtml(verein.facebook ?? "")}" rel="noopener" target="_blank">Facebook</a></p>
          </dd>
        </dl>
      </div>
      <div class="hinweis hinweis--info">
        ${erreichbarkeitHtml()}
      </div>
    </div>
  </div>
</section>`;
}

// ---------- Anfahrt ----------

// P9-Korrektur A2: Adresse ebenfalls als <dl class="angaben"> (gleiche
// Korrektur wie im Abschnitt Geschäftsstelle) statt als <address> ohne
// Zeilenabstände.
function anfahrtAbschnitt(daten) {
  const verein = daten.verein ?? {};
  const sportstaette = verein.sportstaette ?? {};
  const karten = verein.karten ?? {};
  const rebstockUrl = googleMapsUrl("Am Römerhof 9, 60486 Frankfurt am Main");

  return `<section class="abschnitt">
  <div class="container fluss">
    <h2>Anfahrt</h2>
    <p>${escapeHtml(verein.name_register ?? "")}</p>
    <dl class="angaben">
      <dt>Sportstätte</dt>
      <dd>${escapeHtml(sportstaette.strasse ?? "")}<br>${escapeHtml(sportstaette.plz ?? "")} ${escapeHtml(sportstaette.ort ?? "")}</dd>
    </dl>
    <p class="knopfzeile">
      <a class="knopf knopf--sekundaer" href="${escapeHtml(karten.apple ?? "")}" rel="noopener" target="_blank">Route in Apple Karten</a>
      <a class="knopf knopf--sekundaer" href="${escapeHtml(karten.google ?? "")}" rel="noopener" target="_blank">Route in Google Maps</a>
    </p>
    <div class="hinweis hinweis--info">
      <h3 style="margin:0 0 var(--sp-2);">Zugang &amp; Parken</h3>
      <p style="margin:0;">${escapeHtml(verein.anfahrt_hinweis ?? "")}</p>
    </div>
    <div class="hinweis hinweis--info">
      <p style="margin:0;">Mit Bus und Bahn: <a href="https://www.rmv.de" target="_blank" rel="noopener">Verbindung in der RMV-Auskunft</a></p>
    </div>
    <p>Die Herren spielen ihre Heimspiele auf der Anlage von SW Griesheim am Rebstock, Am Römerhof 9, 60486 Frankfurt. <a href="${escapeHtml(rebstockUrl)}" rel="noopener" target="_blank">Route</a></p>
  </div>
</section>`;
}

export function seite(daten) {
  const inhalt = [
    seitenkopfAbschnitt(),
    ansprechpartnerAbschnitt(daten),
    geschaeftsstelleAbschnitt(daten),
    anfahrtAbschnitt(daten),
  ].join("\n");

  return {
    url: "/kontakt/",
    // W3, Abschnitt 2: einheitlicher Begriff wie in der App ("Geschäftsstelle
    // & Anfahrt" statt "Kontakt & Anfahrt").
    title: "Geschäftsstelle & Anfahrt",
    description:
      "Geschäftsstelle & Anfahrt zum FFV Sportfreunde 04: Adressen nach Anliegen, Öffnungszeiten, Sportplatz Mainzer Landstraße 480 in Frankfurt-Gallus mit Anfahrt und Parken",
    inhalt,
    bodyclass: "kontakt",
  };
}
