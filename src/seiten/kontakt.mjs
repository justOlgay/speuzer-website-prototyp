// Kontakt & Anfahrt /kontakt/ (P8) – Ansprechpartner nach Anliegen,
// Geschäftsstelle (Adresse, Telefon, Social-Media) und Anfahrt zum
// Sportplatz Mainzer Landstraße (kein Kartenbild, kein externer Dienst
// eingebettet).

import { mailLink, brotkrume, ruecklinkAbschnitt } from "../vorlagen/hilfen.mjs";

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

// ---------- Öffnungszeiten (W3, aus data/geschaeftsstelle.json,
// tools/appack-daten.mjs) ----------

const WOCHENTAGE_OEFFNUNG = [
  { feld: "monday", label: "Montag" },
  { feld: "tuesday", label: "Dienstag" },
  { feld: "wednesday", label: "Mittwoch" },
  { feld: "thursday", label: "Donnerstag" },
  { feld: "friday", label: "Freitag" },
  { feld: "saturday", label: "Samstag", hiderFeld: "saturdayhider" },
  { feld: "sunday", label: "Sonntag", hiderFeld: "sundayhider" },
];

// Wochentagszeile: "geschlossen" bei leeren Zeiten, sonst "09:30–16:00 Uhr"
// bzw. mit Mittagspause "08:30–12:30 Uhr, 13:00–16:00 Uhr". Ein Wochentag mit
// gesetztem *hider-Feld entfällt ganz (Quelle blendet ihn aus).
function oeffnungszeitenZeilen(oeffnungszeiten) {
  return WOCHENTAGE_OEFFNUNG.map(({ feld, label, hiderFeld }) => {
    if (hiderFeld && oeffnungszeiten?.[hiderFeld]) return null;
    const open = oeffnungszeiten?.[`${feld}open`];
    const close = oeffnungszeiten?.[`${feld}close`];
    const midStart = oeffnungszeiten?.[`${feld}midstart`];
    const midEnd = oeffnungszeiten?.[`${feld}midend`];
    let zeitText;
    if (!open || !close) {
      zeitText = "geschlossen";
    } else if (midStart && midEnd) {
      zeitText = `${open}–${midStart} Uhr, ${midEnd}–${close} Uhr`;
    } else {
      zeitText = `${open}–${close} Uhr`;
    }
    return `<li><span>${escapeHtml(label)}:</span> <span>${escapeHtml(zeitText)}</span></li>`;
  })
    .filter(Boolean)
    .join("\n          ");
}

// Ist das Worksheet leer (keine Zeile geladen, alle Felder fehlen), zeigt der
// Kasten stattdessen den Ausweichsatz aus der Spezifikation.
function oeffnungszeitenHtml(geschaeftsstelle) {
  const oeffnungszeiten = geschaeftsstelle?.oeffnungszeiten;
  if (!oeffnungszeiten || Object.keys(oeffnungszeiten).length === 0) {
    return `<p style="margin:0;">Die Geschäftsstelle ist per E-Mail erreichbar, telefonisch nach Vereinbarung.</p>`;
  }
  const zeilen = oeffnungszeitenZeilen(oeffnungszeiten);
  const textZusatz = oeffnungszeiten.openingtext
    ? `<p class="meta" style="margin-top:var(--sp-2);">${escapeHtml(oeffnungszeiten.openingtext)}</p>`
    : "";
  return `<p style="margin:0 0 var(--sp-2);font-weight:600;">Öffnungszeiten der Geschäftsstelle</p>
        <ul class="oeffnungszeiten" role="list" style="margin:0;padding:0;list-style:none;">
          ${zeilen}
        </ul>
        ${textZusatz}`;
}

// ---------- Seitenkopf ----------

function seitenkopfAbschnitt() {
  return `<section class="abschnitt seitenkopf">
  <div class="container">
    ${brotkrume([{ text: "Verein", href: `${PFAD}verein/` }, { text: "Geschäftsstelle & Anfahrt" }])}
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
function geschaeftsstelleAbschnitt(daten) {
  const verein = daten.verein ?? {};
  const sportstaette = verein.sportstaette ?? {};
  const post = verein.post ?? {};
  const geschaeftsstelle = daten.geschaeftsstelle ?? {};

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
          <dd><p style="margin:0;">${mailLink(verein.mail ?? "geschaeftsstelle@sportfreunde04.de")}</p></dd>

          <dt>Telefon</dt>
          <dd>
            <p style="margin:0;"><a href="${telHref(verein.tel_geschaeftsstelle)}">Geschäftsstelle ${escapeHtml(verein.tel_geschaeftsstelle ?? "")}</a></p>
            <p style="margin:0;"><a href="${telHref(verein.tel_platzwart)}">Platzwart ${escapeHtml(verein.tel_platzwart ?? "")}</a></p>
          </dd>

          <dt>Social</dt>
          <dd>
            <p style="margin:0;"><a href="${escapeHtml(verein.instagram ?? "")}" rel="noopener" target="_blank">Instagram @speuzer_ffm</a></p>
            <p style="margin:0;"><a href="${escapeHtml(verein.facebook ?? "")}" rel="noopener" target="_blank">Facebook</a></p>
          </dd>
        </dl>
      </div>
      <div class="hinweis hinweis--info">
        ${oeffnungszeitenHtml(geschaeftsstelle)}
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
    ruecklinkAbschnitt(`${PFAD}verein/`, "Verein"),
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
