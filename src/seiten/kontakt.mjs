// Kontakt & Anfahrt /kontakt/ (P8) – Ansprechpartner nach Anliegen,
// Geschäftsstelle (Adresse, Telefon, Social-Media) und Anfahrt zum
// Sportplatz Mainzer Landstraße (kein Kartenbild, kein externer Dienst
// eingebettet).

import { mailLink, ruecklink, telefonAnzeige } from "../vorlagen/hilfen.mjs";
import { probetrainingAbschnitt } from "../vorlagen/bausteine.mjs";

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

// mailto-Href mit optionalem Betreff (Plan-Abschnitt C nennt Betreffs nur
// für einen Teil der Ansprechpartner – ohne Angabe kein erfundener Betreff).
function mailHref({ adresse, betreff }) {
  if (!adresse) return "";
  return betreff ? `mailto:${adresse}?subject=${encodeURIComponent(betreff)}` : `mailto:${adresse}`;
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

// W8-Korrektur: Einleitung widersprach dem Hinweiskasten weiter unten
// ("telefonisch in der Geschäftsstelle" vs. "keine festen Öffnungszeiten …
// telefonisch nach Vereinbarung") – jetzt derselbe Zusatz wie dort.
function seitenkopfAbschnitt() {
  return `<section class="abschnitt seitenkopf">
  <div class="container">
    ${ruecklink(`${PFAD}verein/`, "Verein")}
    <h1>Geschäftsstelle &amp; Anfahrt</h1>
    <p class="seitenkopf__lead">So erreichst du uns – per E-Mail an die passende Adresse, telefonisch nach Vereinbarung.</p>
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
      titel: "Kinder- und Jugendschutz",
      mail: mails.kinderschutz,
      text: "Vertraulicher Kontakt zum Kinderschutzbeauftragten.",
      // Bewusst kein Betreff (vertraulich, Plan-Abschnitt A1).
    },
    {
      titel: "Sponsoren & Partner",
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

// W8-Korrektur: acht ungleich hohe Karten (unterschiedlich lange Sätze) →
// kompakte Liste "Anliegen – adresse@… ›", ganze Zeile als Link (".zeile",
// gleicher Baustein wie /verein/ und der Mach-mit-Verweis unten).
function ansprechpartnerZeile(eintrag) {
  if (!eintrag.mail) return "";
  return `<a class="zeile" href="${escapeHtml(mailHref({ adresse: eintrag.mail, betreff: eintrag.betreff }))}">
      <span class="zeile__text">
        <span class="zeile__titel">${escapeHtml(eintrag.titel)} – ${escapeHtml(eintrag.mail)}</span>
      </span>
      <svg class="zeile__pfeil" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7"/></svg>
    </a>`;
}

function ansprechpartnerAbschnitt(daten) {
  const zeilen = ansprechpartner(daten).map(ansprechpartnerZeile).join("\n    ");
  return `<section class="abschnitt">
  <div class="container fluss">
    <h2>Ansprechpartner nach Anliegen</h2>
    <div class="zeilen-liste">
    ${zeilen}
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
// Kontaktzeile (Telefon, E-Mail, Instagram): W3-Spezifikation Abschnitt 7
// verlangt, dass kontakt.html aus data/geschaeftsstelle.json "die
// Öffnungszeiten … und die Kontaktzeile" rendert (W3b, Prüfer-Befund
// "wichtig" – bislang kamen diese Felder nur aus data/verein.json).
// data/verein.json bleibt Fallback, falls das appack-Worksheet ein Feld
// nicht liefert. Facebook: Der Verein hat keine Facebook-Seite, nur die
// Gruppe (Entscheidung Olgay 22.09.2026); data/verein.json und das
// Worksheet nennen dieselbe Gruppen-Adresse. Die eigene Website wird hier
// bewusst nicht mehr verlinkt (W8-Korrektur: Selbstverweis auf die Seite,
// auf der man gerade liest, ergab keinen Sinn).
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
            <p style="margin:0;"><a href="${telHref(telefonGeschaeftsstelle)}">Geschäftsstelle ${escapeHtml(telefonAnzeige(telefonGeschaeftsstelle))}</a></p>
            <p style="margin:0;"><a href="${telHref(verein.tel_platzwart)}">Platzwart ${escapeHtml(telefonAnzeige(verein.tel_platzwart))}</a></p>
          </dd>

          <dt>Social</dt>
          <dd>
            <p style="margin:0;"><a href="${escapeHtml(instagram ?? "")}" rel="noopener" target="_blank">Instagram @speuzer_ffm</a></p>
            <p style="margin:0;"><a href="${escapeHtml(verein.facebook ?? "")}" rel="noopener" target="_blank">Facebook-Gruppe</a></p>
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
// W8-Korrektur: Vereinsname und Sportstätten-Adresse standen hier ein
// zweites Mal (direkt darüber im Abschnitt "Geschäftsstelle" bereits
// vollständig genannt) – hier jetzt nur noch die Routen-Knöpfe und die
// Rebstock-Adresse (Herren + A-Jugend, einheitliche Schreibweise wie unter
// "Über uns").
function anfahrtAbschnitt(daten) {
  const verein = daten.verein ?? {};
  const karten = verein.karten ?? {};
  const rebstockUrl = googleMapsUrl("Am Römerhof 9, 60486 Frankfurt am Main");

  return `<section class="abschnitt">
  <div class="container fluss">
    <h2>Anfahrt</h2>
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
    <p>Die Herren und die A-Jugend tragen ihre Heimspiele auf der Bezirkssportanlage am Rebstock aus (Anlage von SW Griesheim, Am Römerhof 9, 60486 Frankfurt). <a href="${escapeHtml(rebstockUrl)}" rel="noopener" target="_blank">Route</a></p>
  </div>
</section>`;
}

export function seite(daten) {
  const inhalt = [
    seitenkopfAbschnitt(),
    ansprechpartnerAbschnitt(daten),
    // W8-Korrektur: derselbe Probetraining-Baustein wie auf /mannschaften/
    // und /mitglied-werden/ (siehe src/vorlagen/bausteine.mjs) – direkt nach
    // der Anliegen-Liste, in der "Probetraining & Jugend" schon verlinkt ist.
    probetrainingAbschnitt(PFAD),
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
