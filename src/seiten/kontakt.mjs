// Kontakt & Anfahrt /kontakt/ (P8) – Ansprechpartner nach Anliegen,
// Geschäftsstelle (Adresse, Telefon, Social-Media) und Anfahrt zum
// Sportplatz Mainzer Landstraße (kein Kartenbild, kein externer Dienst
// eingebettet).

import { mailLink } from "../vorlagen/hilfen.mjs";

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

// ---------- Seitenkopf ----------

function seitenkopfAbschnitt() {
  return `<section class="abschnitt seitenkopf">
  <div class="container">
    <h1>Kontakt &amp; Anfahrt</h1>
    <p class="seitenkopf__lead">So erreichst du uns – per E-Mail an die passende Vereinsadresse oder telefonisch in der Geschäftsstelle.</p>
  </div>
</section>`;
}

// ---------- Ansprechpartner nach Anliegen ----------

// Reihenfolge und Inhalte exakt wie im Plan (Abschnitt C) vorgegeben. "text"
// (ein erläuternder Satz) und "betreff" sind nur dort gesetzt, wo der Plan
// sie ausdrücklich nennt – für die übrigen Karten wurde nichts erfunden
// (siehe Abschlussbericht, offene Frage).
function ansprechpartner(daten) {
  const verein = daten.verein ?? {};
  const mails = verein.mails ?? {};
  return [
    { titel: "Allgemeine Fragen", mail: verein.mail, betreff: "Anfrage über die Website" },
    {
      titel: "Probetraining & Jugend",
      mail: mails.jugendleitung,
      text: "Für Kinder und Jugendliche von der G- bis zur A-Jugend.",
      betreff: "Probetraining",
    },
    { titel: "Herren & Senioren", mail: mails.senioren },
    { titel: "Karnevalabteilung", mail: mails.karneval },
    { titel: "Beiträge & Rechnungen", mail: mails.kassierer },
    {
      titel: "Kinderschutz",
      mail: mails.kinderschutz,
      text: "Vertraulicher Kontakt zum Kinderschutzbeauftragten.",
    },
    { titel: "Sponsoring & Partner", mail: verein.mail, betreff: "Sponsoring" },
    { titel: "Trainer- und Ehrenamt", mail: verein.mail, betreff: "Ich helfe gern" },
  ];
}

function ansprechpartnerKarte(eintrag) {
  const textHtml = eintrag.text ? `<p>${escapeHtml(eintrag.text)}</p>` : "";
  return `<div class="karte fluss">
      <span class="karte__titel">${escapeHtml(eintrag.titel)}</span>
      ${textHtml}
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

function geschaeftsstelleAbschnitt(daten) {
  const verein = daten.verein ?? {};
  const sportstaette = verein.sportstaette ?? {};
  const post = verein.post ?? {};

  return `<section class="abschnitt--hell abschnitt">
  <div class="container fluss">
    <h2>Geschäftsstelle</h2>
    <div class="anfahrt__raster">
      <div>
        <address>
          <p>${escapeHtml(verein.name_register ?? "")}</p>
          <p class="meta">Sportstätte</p>
          <p>${escapeHtml(sportstaette.strasse ?? "")}<br>${escapeHtml(sportstaette.plz ?? "")} ${escapeHtml(sportstaette.ort ?? "")}</p>
          <p class="meta">Postanschrift</p>
          <p>${escapeHtml(post.postfach ?? "")}<br>${escapeHtml(post.plz ?? "")} ${escapeHtml(post.ort ?? "")}</p>
        </address>
        <p>${mailLink(verein.mail ?? "geschaeftsstelle@sportfreunde04.de")}</p>
        <p><a href="${telHref(verein.tel_geschaeftsstelle)}">Geschäftsstelle ${escapeHtml(verein.tel_geschaeftsstelle ?? "")}</a></p>
        <p><a href="${telHref(verein.tel_platzwart)}">Platzwart ${escapeHtml(verein.tel_platzwart ?? "")}</a></p>
        <p><a href="${escapeHtml(verein.instagram ?? "")}" rel="noopener" target="_blank">Instagram @speuzer_ffm</a></p>
        <p><a href="${escapeHtml(verein.facebook ?? "")}" rel="noopener" target="_blank">Facebook</a></p>
      </div>
      <div class="hinweis hinweis--offen">
        <p style="margin:0;">Öffnungszeiten der Geschäftsstelle: Angabe folgt.</p>
      </div>
    </div>
  </div>
</section>`;
}

// ---------- Anfahrt ----------

function anfahrtAbschnitt(daten) {
  const verein = daten.verein ?? {};
  const sportstaette = verein.sportstaette ?? {};
  const karten = verein.karten ?? {};
  const hinweise = verein.hinweise ?? {};
  const rebstockUrl = googleMapsUrl("Am Römerhof 9, 60486 Frankfurt am Main");

  return `<section class="abschnitt">
  <div class="container fluss">
    <h2>Anfahrt</h2>
    <address>
      <p>${escapeHtml(verein.name_register ?? "")}</p>
      <p>${escapeHtml(sportstaette.strasse ?? "")}</p>
      <p>${escapeHtml(sportstaette.plz ?? "")} ${escapeHtml(sportstaette.ort ?? "")}</p>
    </address>
    <p class="knopfzeile">
      <a class="knopf knopf--sekundaer" href="${escapeHtml(karten.apple ?? "")}" rel="noopener" target="_blank">Route in Apple Karten</a>
      <a class="knopf knopf--sekundaer" href="${escapeHtml(karten.google ?? "")}" rel="noopener" target="_blank">Route in Google Maps</a>
    </p>
    <div class="hinweis hinweis--info">
      <h3 style="margin:0 0 var(--sp-2);">Zugang &amp; Parken</h3>
      <p style="margin:0;">${escapeHtml(verein.anfahrt_hinweis ?? "")}</p>
      <p class="meta" style="margin-top:var(--sp-2);">Quelle: ${escapeHtml(hinweise.parken_quelle ?? "")}</p>
    </div>
    <div class="hinweis hinweis--offen">
      <p style="margin:0;">ÖPNV: Haltestelle und Fußweg folgen.</p>
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
    title: "Kontakt & Anfahrt",
    // Wörtlicher Plan-Text hat 172 Zeichen (Gate in tools/pruefen.mjs: max.
    // 170) – kleinstmögliche Korrektur nach dem Muster von P2/P5 (siehe
    // src/seiten/index.mjs, src/seiten/verein/index.mjs): "Vereinsadressen"
    // zu "Adressen" gekürzt und abschließenden Punkt entfernt (164 Zeichen),
    // Wortlaut sonst unverändert. Siehe Abschlussbericht, Abschnitt
    // „Abweichungen“.
    description:
      "Kontakt zum FFV Sportfreunde 04: Adressen nach Anliegen, Geschäftsstelle, Sportplatz Mainzer Landstraße 480 in Frankfurt-Gallus mit Anfahrt und Hinweisen zum Parken",
    inhalt,
    bodyclass: "kontakt",
  };
}
