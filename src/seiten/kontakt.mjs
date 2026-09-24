// Kontakt & Anfahrt /kontakt/ (P8) – Ansprechpartner nach Anliegen,
// Geschäftsstelle (Adresse, Telefon, Social-Media) und Anfahrt zum
// Sportplatz Mainzer Landstraße (kein Kartenbild, kein externer Dienst
// eingebettet).

import { mailLink, ruecklink, telefonAnzeige } from "../vorlagen/hilfen.mjs";

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

// W9-Korrektur (Entscheidung 15: "Routen überall als ein Knopf 'Route
// planen'", Google-Maps-Richtungslink statt der bisherigen Suchlink-URL).
function routePlanenUrl(adresse) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(adresse)}`;
}

// W9-Korrektur (Entscheidung 4/QA3 quer-28): E-Mail-Adressen dürfen nie
// mitten in der Domain umbrechen – wie mailLink() in hilfen.mjs ein <wbr>
// direkt vor dem "@", hier aber als reiner Text-Baustein (die ganze Zeile
// ".zeile" ist bereits selbst der Mail-Link, ein verschachteltes <a> wäre
// ungültiges HTML).
function mitWbrVorAt(adresse) {
  const escaped = escapeHtml(adresse ?? "");
  const atIndex = escaped.indexOf("@");
  if (atIndex === -1) return escaped;
  return `${escaped.slice(0, atIndex)}<wbr>${escaped.slice(atIndex)}`;
}

// W9-Korrektur (Entscheidung 13/quer-29): "Sportfreunde 1904 e. V." bricht
// sonst vor der Jahreszahl um. data/verein.json koppelt "1904"/"e."/"V."
// bereits mit geschützten Leerzeichen, nur die Lücke zwischen "Sportfreunde"
// und "1904" ist noch ein normales Leerzeichen (Grund, warum ein Ersatz des
// ganzen Ausdrucks mit normalen Leerzeichen zuvor nie traf) – data/verein.json
// ist tabu, daher hier nur diese eine Lücke an der Anzeige nachgezogen (wie
// in impressum.mjs).
function mitGeschuetztemVereinsnamen(text) {
  return String(text ?? "").replace("Sportfreunde 1904", "Sportfreunde 1904");
}

// mailto-Href mit optionalem Betreff (Plan-Abschnitt C nennt Betreffs nur
// für einen Teil der Ansprechpartner – ohne Angabe kein erfundener Betreff).
function mailHref({ adresse, betreff }) {
  if (!adresse) return "";
  return betreff ? `mailto:${adresse}?subject=${encodeURIComponent(betreff)}` : `mailto:${adresse}`;
}

// ---------- Seitenkopf ----------

// W9-Korrektur (QA3 1440-23/390-19): Die Einleitung wiederholte den
// Erreichbarkeits-Kasten fast wörtlich ("telefonisch nach Vereinbarung"
// zweimal) – jetzt kurz, wie in der App-Gliederung ("So erreichst du uns.").
// Seitentitel "Kontakt & Anfahrt" (Entscheidung 14, URL bleibt /kontakt/).
function seitenkopfAbschnitt() {
  return `<section class="abschnitt seitenkopf">
  <div class="container">
    ${ruecklink(`${PFAD}verein/`, "Verein")}
    <h1>Kontakt &amp; Anfahrt</h1>
    <p class="seitenkopf__lead">So erreichst du uns.</p>
  </div>
</section>`;
}

// ---------- Erreichbarkeit ----------
// W9-Korrektur (gleiche Gliederung wie die App, w9-b.md): eigener Abschnitt
// direkt nach dem Seitenkopf mit dem festen Öffnungszeiten-Satz (Entscheidung
// Olgay 22.09.2026: keine festen Öffnungszeiten, das appack-Worksheet
// "Öffnungszeiten" wird nicht ausgewertet) sowie E-Mail, Telefon
// Geschäftsstelle und Telefon Platzwart – vorher standen diese drei erst im
// Abschnitt "Geschäftsstelle" weiter unten, zusammen mit Vereinsname/
// Sportstätte/Postanschrift/Social (die jetzt auf Anfahrt bzw. den
// Seitenschluss verteilt sind, siehe unten).
function erreichbarkeitAbschnitt(daten) {
  const verein = daten.verein ?? {};
  const geschaeftsstelle = daten.geschaeftsstelle ?? {};
  const kontakt = geschaeftsstelle.kontakt ?? {};

  const telefonGeschaeftsstelle = ausWorksheetOderVerein(kontakt.phoneNumber, verein.tel_geschaeftsstelle);
  const email = ausWorksheetOderVerein(kontakt.email, verein.mail ?? "geschaeftsstelle@sportfreunde04.de");

  // W9-B-Nachprüfung (kontakt Website ↔ App, quer-2): unterschiedliche
  // Bausteine für denselben Inhalt – Website mit blauem Hinweiskasten +
  // gruppierten Beschriftungen "E-Mail"/"Telefon", App als Karte mit drei
  // Zeilen "E-Mail Geschäftsstelle"/"Telefon Geschäftsstelle"/"Telefon
  // Platzwart" (assets/app/Geschaeftsstelle_v3.tpl). Jetzt derselbe Baustein
  // wie die App: eine Karte, fetter Einleitungssatz, drei gleichrangige
  // Beschriftungen.
  return `<section class="abschnitt">
  <div class="container fluss">
    <h2>Erreichbarkeit</h2>
    <div class="karte fluss">
      <p style="margin:0;"><strong>Keine festen Öffnungszeiten.</strong> Die Geschäftsstelle ist per E-Mail erreichbar, telefonisch nach Vereinbarung.</p>
      <dl class="angaben">
        <dt>E-Mail Geschäftsstelle</dt>
        <dd><p style="margin:0;">${mailLink(email)}</p></dd>

        <dt>Telefon Geschäftsstelle</dt>
        <dd><p style="margin:0;"><a href="${telHref(telefonGeschaeftsstelle)}">${escapeHtml(telefonAnzeige(telefonGeschaeftsstelle))}</a></p></dd>

        <dt>Telefon Platzwart</dt>
        <dd><p style="margin:0;"><a href="${telHref(verein.tel_platzwart)}">${escapeHtml(telefonAnzeige(verein.tel_platzwart))}</a></p></dd>
      </dl>
    </div>
  </div>
</section>`;
}

// ---------- Ansprechpartner nach Anliegen ----------

// Reihenfolge und Inhalte exakt wie im Plan (Abschnitt C, ursprünglich; Sätze
// und Betreffs ab P9-Korrektur A1) vorgegeben – wörtlich übernommen, nichts
// erfunden. W9-Korrektur (w9-b.md): Eintrag "Vorstand" ergänzt (fehlte bisher
// in dieser Liste, obwohl die Vorstandsadresse auf /verein/vorstand/ genannt
// wird); Karneval-Text auf "Übungszeiten" vereinheitlicht (Entscheidung 14,
// vorher "Übungsstunden"); Probetraining-Text mit geschützten Bindestrichen.
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
      titel: "Vorstand",
      mail: mails.vorstand,
      text: "Anfragen an den Vorstand des Vereins.",
      betreff: "Anfrage an den Vorstand",
    },
    {
      titel: "Probetraining & Jugend",
      mail: mails.jugendleitung,
      text: "Für Kinder und Jugendliche von der A‑Jugend bis zur G‑Jugend.",
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
      text: "Die Schnauzer: Gruppen, Übungszeiten, Auftritte.",
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
      // W10-Korrektur (QA4 web-1440-verein-und-rest Nr. 19): Begriff an den
      // Seitennamen "Mach mit & Ehrenamt" angeglichen (verein/index.mjs,
      // verein/mach-mit.mjs) – "Trainer- und Ehrenamt" gab es sonst nirgends
      // auf der Website.
      titel: "Mach mit & Ehrenamt",
      mail: verein.mail,
      text: "Mitmachen als Trainer, Betreuer oder im Vorstand.",
      betreff: "Ich helfe gern",
    },
  ];
}

// W9-Korrektur (QA3 1440-22/390-2): Anliegen und Adresse standen bisher in
// einer Zeile, gleich fett, nur durch einen Gedankenstrich getrennt – dabei
// brach die Adresse teils mitten in der Domain um. Jetzt wie die übrigen
// Verteiler-Zeilen (".zeile__titel"/".zeile__untertitel"): Anliegen fett in
// Zeile 1, Adresse normal (kleiner, mit geschütztem Umbruch nur vor "@") in
// Zeile 2. Briefsymbol statt des Pfeils "›" (der auf eine Unterseite
// deutete, obwohl die Zeile eine Mail öffnet).
function ansprechpartnerZeile(eintrag) {
  if (!eintrag.mail) return "";
  return `<a class="zeile" href="${escapeHtml(mailHref({ adresse: eintrag.mail, betreff: eintrag.betreff }))}">
      <span class="zeile__text">
        <span class="zeile__titel">${escapeHtml(eintrag.titel)}</span>
        <span class="zeile__untertitel zeile__adresse">${mitWbrVorAt(eintrag.mail)}</span>
      </span>
      <svg class="zeile__pfeil" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3 6h18v12H3z"/><path d="m3 7 9 6 9-6"/></svg>
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

// data/verein.json bleibt Fallback, falls das appack-Worksheet ein Feld
// nicht liefert (W3-Spezifikation Abschnitt 7).
function ausWorksheetOderVerein(wert, fallback) {
  const text = String(wert ?? "").trim();
  return text || fallback;
}

// ---------- Anfahrt ----------
// W9-Korrektur (w9-b.md, QA3 1440-24/390-12/quer-20): Vereinsplatz und
// Rebstock waren bisher ungleich gebaut (Vereinsplatz zwei Routen-Knöpfe
// ohne eigene Adresszeilen, Rebstock nur ein kleiner Textlink "Route" im
// Fließtext, Adresse brach mitten im Straßennamen um). Jetzt zwei gleiche,
// dreizeilige Adressblöcke (Platzname/Straße Nr./PLZ Ort, Entscheidung 4)
// mit je einem Knopf "Route planen" (Entscheidung 15); der Rebstock-Name ist
// jetzt "Bezirkssportanlage am Rebstock (SW Griesheim)" (Entscheidung 3,
// löst auch die abweichenden Klammer-Schreibweisen aus quer-20).
// `ort` ist der reine Text ("60326 Frankfurt am Main") für die Route-URL;
// die Anzeige koppelt PLZ und Ortsname mit echten (nicht als "&nbsp;"-Entity
// geschriebenen) geschützten Leerzeichen – escapeHtml() liefe sonst über das
// "&" der Entity und würde daraus sichtbares "&amp;nbsp;" machen.
function mitGeschuetztenLeerzeichen(ort) {
  return escapeHtml(ort).replace(/ /g, " ");
}

// W9-B-Nachprüfung (kontakt 390/1440): "Route planen" war gefüllt (Primär-
// aktion) statt umrandet (Entscheidung 15: Anfahrt ist eine Nebenaktion,
// App-Vorbild knopf--leise), auf dem Handy nicht vollbreit, und stand bei
// den beiden Karten auf unterschiedlicher Höhe (nur Rebstock hat den
// Zusatzsatz) – jetzt ".karte--anliegen" (Knopfzeile per margin-top:auto am
// Kartenfuß) und ".knopfzeile--voll" (Knopf volle Kartenbreite, Entscheidung
// 15, bereits vorhanden für Trainerteam/Heimspiele).
function anfahrtBlock(name, strasse, ort, zusatzHtml) {
  const adresse = `${strasse}, ${ort}`;
  return `<div class="karte karte--anliegen fluss">
      <p style="margin:0;">
        <strong>${escapeHtml(name)}</strong><br>
        ${escapeHtml(strasse)}<br>
        ${mitGeschuetztenLeerzeichen(ort)}
      </p>
      ${zusatzHtml ?? ""}
      <p class="knopfzeile knopfzeile--voll">
        <a class="knopf knopf--sekundaer" href="${escapeHtml(routePlanenUrl(adresse))}" rel="noopener" target="_blank">Route planen</a>
      </p>
    </div>`;
}

function anfahrtAbschnitt(daten) {
  const verein = daten.verein ?? {};
  const sportstaette = verein.sportstaette ?? {};
  // "60326 Frankfurt am Main" nie trennen (Entscheidung 4).
  const vereinsplatzOrt = `${sportstaette.plz ?? ""} Frankfurt am Main`;
  const rebstockOrt = "60486 Frankfurt am Main";

  return `<section class="abschnitt">
  <div class="container fluss">
    <h2>Anfahrt</h2>
    <div class="raster raster--2">
      ${anfahrtBlock("Vereinsplatz", sportstaette.strasse ?? "Mainzer Landstraße 480", vereinsplatzOrt)}
      ${anfahrtBlock(
        "Bezirkssportanlage am Rebstock (SW Griesheim)",
        "Am Römerhof 9",
        rebstockOrt,
        `<p class="meta">Hier spielen die Herren und die A‑Jugend ihre Heimspiele.</p>`
      )}
    </div>
  </div>
</section>`;
}

// ---------- Hinweiskasten: Zugang & Parken / Bus & Bahn ----------
// W9-Korrektur (QA3 1440-24/390-19): vorher zwei gleich aussehende Kästen
// direkt übereinander, nur einer mit Überschrift – jetzt ein Kasten mit zwei
// betitelten Absätzen (w9-b.md). "RMV-Auskunft" mit geschütztem Bindestrich
// (Entscheidung 13).
// W9-B-Nachprüfung (kontakt Website ↔ App, quer-2): Website setzte
// "Zugang & Parken"/"Bus & Bahn" als große H3-Versalüberschriften in der Box
// – die App (assets/app/Geschaeftsstelle_v3.tpl) setzte beide damals als
// fetten Satzanfang im Fließtext.
// W10-Nachprüfung (offen 16, quervergleich Nr. 23): die App steht inzwischen
// wieder auf einer eigenen, betitelten Zwischenzeile ohne Punkt
// (.hinweis-untertitel) – das trifft auch den Auftragswortlaut "zwei
// betitelte Absätze" (w10-b.md) genauer als der fette Satzanfang. Jetzt
// wieder derselbe Baustein wie die App.
function hinweisAbschnitt(daten) {
  const verein = daten.verein ?? {};
  return `<section class="abschnitt">
  <div class="container fluss">
    <div class="hinweis hinweis--info">
      <p class="hinweis-untertitel">Zugang &amp; Parken</p>
      <p style="margin:0;">${escapeHtml(verein.anfahrt_hinweis ?? "")}</p>
      <p class="hinweis-untertitel" style="margin-top:var(--sp-3);">Bus &amp; Bahn</p>
      <p style="margin:0;">Verbindung in der <a href="https://www.rmv.de" target="_blank" rel="noopener">RMV‑Auskunft</a>.</p>
    </div>
  </div>
</section>`;
}

// ---------- Postanschrift und Social ----------
// W9-Korrektur (QA3 1440-27/quer-29/390-11): Vereinsname stand bisher ohne
// eigene Beschriftung und mit deutlich weniger Abstand direkt über
// "Sportstätte" (die jetzt in den Anfahrt-Block gewandert ist, siehe oben) –
// jetzt eine eigene <dl class="angaben">-Gruppe "Verein" mit demselben
// Gruppenabstand wie Postanschrift und Social.
// W10-Korrektur (QA4 web-1440-verein-und-rest Nr. 17/web-390-verein-und-rest
// Nr. 11/quervergleich Nr. 24): der Abschnitt stand als einziger ohne eigene
// Überschrift da (rund 100px leerer Raum, wo sonst der Titel sitzt) und als
// einziger auf weißem Grund (abschnitt--hell) – während alle vorherigen
// Kontakt-Abschnitte getönt sind, verschwand die ebenfalls weiße Karte fast
// vollständig. Jetzt eine Überschrift und derselbe getönte Grund wie der
// Rest der Seite. "Social" (Englisch) durch "Soziale Medien" ersetzt.
function postAbschnitt(daten) {
  const verein = daten.verein ?? {};
  const post = verein.post ?? {};
  const geschaeftsstelle = daten.geschaeftsstelle ?? {};
  const kontakt = geschaeftsstelle.kontakt ?? {};
  const instagram = ausWorksheetOderVerein(kontakt.insta, verein.instagram);

  return `<section class="abschnitt">
  <div class="container fluss">
    <h2>Verein &amp; Postanschrift</h2>
    <div class="karte">
      <dl class="angaben">
        <dt>Verein</dt>
        <dd>${escapeHtml(mitGeschuetztemVereinsnamen(verein.name_register ?? ""))}</dd>

        <dt>Postanschrift</dt>
        <dd>${escapeHtml(post.postfach ?? "")}<br>${escapeHtml(post.plz ?? "")} ${escapeHtml(post.ort ?? "")}</dd>

        <dt>Soziale Medien</dt>
        <dd>
          <p style="margin:0;"><a href="${escapeHtml(instagram ?? "")}" rel="noopener" target="_blank">Instagram @speuzer_ffm</a></p>
          <p style="margin:0;"><a href="${escapeHtml(verein.facebook ?? "")}" rel="noopener" target="_blank">Facebook-Gruppe</a></p>
        </dd>
      </dl>
    </div>
  </div>
</section>`;
}

export function seite(daten) {
  // W9-Korrektur (w9-b.md): gleiche Gliederung wie die App – Einleitung ›
  // Erreichbarkeit › Ansprechpartner nach Anliegen › Anfahrt › Hinweiskasten
  // › Postanschrift und Social. Der frühere Probetraining-Block entfällt auf
  // dieser Seite (die Anliegen-Zeile "Probetraining & Jugend" genügt).
  const inhalt = [
    seitenkopfAbschnitt(),
    erreichbarkeitAbschnitt(daten),
    ansprechpartnerAbschnitt(daten),
    anfahrtAbschnitt(daten),
    hinweisAbschnitt(daten),
    postAbschnitt(daten),
  ].join("\n");

  return {
    url: "/kontakt/",
    // W9-Korrektur (Entscheidung 14): "Kontakt & Anfahrt" statt
    // "Geschäftsstelle & Anfahrt" (URL bleibt /kontakt/).
    title: "Kontakt & Anfahrt",
    description:
      "Kontakt & Anfahrt zum FFV Sportfreunde 04: Ansprechpartner nach Anliegen, Erreichbarkeit, Vereinsplatz und Bezirkssportanlage am Rebstock mit Anfahrt und Parken",
    inhalt,
    bodyclass: "kontakt",
  };
}
