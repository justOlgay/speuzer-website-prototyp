// Mitglied werden /mitglied-werden/ (P7) – Beiträge, Ablauf, Unterlagen und
// der Aufnahmeantrag. W2: der frühere Formularentwurf (assets/js/formular.js)
// ist ersetzt durch einen Knopf auf das appack-Formular des Vereins
// (speichert in ein Worksheet, Bestätigung per E-Mail an die
// Geschäftsstelle), siehe Schritt 2 der Ablauf-Liste unten.
//
// W9-Korrektur (QA3 1440-1/1440-2/390-8, w9-b.md): Die Seite erzählte den
// Ablauf bisher dreimal (Block "Probetraining vereinbaren", eigener
// Abschnitt "Aufnahmeantrag online stellen", dann noch einmal "So wird man
// Mitglied" mit "siehe oben"-Verweisen) und widersprach damit der eigenen
// Einleitung "Erst die Fakten, dann der Antrag". Jetzt genau eine
// nummerierte Schrittfolge "So wirst du Mitglied" direkt nach den
// Beiträgen; der generische probetrainingAbschnitt() (identisch auch auf
// /mannschaften/ und /kontakt/) entfällt hier.

import { downloadZeile } from "../vorlagen/bausteine.mjs";
import { PROBETRAINING_MAILTO } from "../vorlagen/hilfen.mjs";

// Diese Seite liegt immer unter "/mitglied-werden/" (Tiefe 1), daher immer
// "../" (siehe pfadZurWurzel() in tools/build.mjs).
const PFAD = "../";

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// P8-Korrektur A1: Schlusspunkt in den drei Meta-Sätzen unter den
// Beitragshinweisen im Template setzen statt in den Daten – und nur, wenn
// der Wert nicht schon selbst mit einem Satzzeichen endet (der Datenwert
// "doppelmitgliedschaft" endet im Original bereits mit einem Punkt).
function mitSchlusspunkt(text) {
  const t = String(text ?? "").trim();
  if (t === "") return t;
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

// W10-Korrektur (QA4 web-1440-verein-und-rest Nr. 21/web-390-verein-und-rest
// Nr. 12): "Fälligkeit" und "Kündigung" (data/beitraege.json, tabu) beginnen
// im Rohtext klein, "Aufnahmegebühr" und "Doppelmitgliedschaft" groß – reine
// Anzeige-Korrektur wie bei mitGeschuetzterOrdnungszahl() unten, der
// Rohwert bleibt unverändert.
function mitGrossAnfang(text) {
  const t = String(text ?? "");
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
}

// W9-B-Nachprüfung (mitglied-werden 390): "Der Eintritt … erfolgt zum 1.
// des nächsten Monats." (data/beitraege.json, tabu – nur Anzeige-Korrektur)
// bricht sonst zwischen der Ordnungszahl und dem Folgewort um. Geschütztes
// Leerzeichen nach "N." vor dem nächsten Wort.
function mitGeschuetzterOrdnungszahl(text) {
  return String(text ?? "").replace(/(\d+\.) /g, "$1 ");
}

// Download-Eintrag per Titel-Teilstring finden (data/downloads.json), wie in
// src/seiten/verein/index.mjs.
function downloadEintrag(daten, titelTeil) {
  return (daten.downloads ?? []).find((d) => (d.titel ?? "").includes(titelTeil));
}

// W10-Korrektur (QA4 web-1440-verein-und-rest Nr. 3/web-390-verein-und-rest
// Nr. 4, Entscheidung D, w10-gemeinsam.md): Schritt 1 nannte für erwachsene
// Spieler (Herren/Senioren) keinen Weg – nur die Jugendleitung war
// verlinkt, obwohl Kontakt & Anfahrt dafür eine eigene Adresse führt.
// data/teams.json (Herren, Feld "mail") ist dieselbe Quelle, aus der auch
// der gleichlautende Textlink auf /mannschaften/ gespeist wird (Entscheidung
// D gilt für Website-Mannschaften, App-Mannschaften und Mitglied werden
// gleich).
function herrenMailtoHref(daten) {
  const herren = (daten.teams ?? []).find((t) => t.slug === "herren");
  return herren?.mail ? `mailto:${herren.mail}` : "";
}

// Link auf einen Download-Eintrag: intern (Pfad beginnt mit "/") ohne
// target/rel, extern (cdn.appack.de) mit rel="noopener" target="_blank" –
// wie in src/seiten/verein/index.mjs.
function downloadKnopf(eintrag, text) {
  if (!eintrag) return "";
  const istIntern = (eintrag.datei ?? "").startsWith("/");
  const href = istIntern ? PFAD + eintrag.datei.replace(/^\//, "") : eintrag.datei;
  const attrs = istIntern ? "" : ' rel="noopener" target="_blank"';
  return `<a class="knopf knopf--sekundaer" href="${escapeHtml(href)}"${attrs}>${escapeHtml(text)}</a>`;
}

// ---------- Seitenkopf ----------

function seitenkopfAbschnitt() {
  return `<section class="abschnitt seitenkopf">
  <div class="container">
    <h1>Mitglied werden</h1>
    <p class="seitenkopf__lead">Erst die Fakten, dann der Antrag: Beiträge, Ablauf und Unterlagen auf einen Blick.</p>
  </div>
</section>`;
}

// ---------- Beiträge ----------

// W3, Abschnitt 7 (Prüfer-Befund): unter 480px war die Spalte "jährlich"
// abgeschnitten ("JÄHR", "1…"). .beitragstabelle (komponenten.css) verkleinert
// dort Schrift/Innenabstand; die Kopfzeilen zeigen unter 480px die kurze Form
// ("mtl."/"jährl." statt "monatlich"/"jährlich"), damit der Jahreswert nie
// abgeschnitten wird.
function beitragsTabelle(gruppen) {
  const zeilen = (gruppen ?? [])
    .map(
      (g) => `<tr>
          <td>${escapeHtml(g.gruppe)}</td>
          <td class="zahl">${g.monat != null ? `${g.monat} €` : "–"}</td>
          <td class="zahl">${g.jahr} €</td>
        </tr>`
    )
    .join("\n        ");

  return `<div class="tabelle-wrap">
      <table class="beitragstabelle">
        <thead>
          <tr>
            <th>Beitragsgruppe</th>
            <th class="zahl"><span class="beitragstabelle__lang">monatlich</span><span class="beitragstabelle__kurz">mtl.</span></th>
            <th class="zahl"><span class="beitragstabelle__lang">jährlich</span><span class="beitragstabelle__kurz">jährl.</span></th>
          </tr>
        </thead>
        <tbody>
        ${zeilen}
        </tbody>
      </table>
    </div>`;
}

// W9-Korrektur (QA3 1440-15/390-21): Aufnahmegebühr, Ohne-SEPA-Zuschlag und
// Fälligkeit standen in drei hervorgehobenen Kästen, die ebenso verbindliche
// Kündigungsregel und die Doppelmitgliedschaft dagegen als kleiner grauer
// Text darunter ("Kleingedrucktes"). Jetzt alle fünf Beitragsregeln
// gleichrangig in einer Liste "Gut zu wissen" (".angaben", derselbe Baustein
// wie Impressum/Kontakt).
function gutZuWissenAbschnitt(beitraege) {
  return `<div class="karte">
      <h3 style="margin:0 0 var(--sp-4);">Gut zu wissen</h3>
      <dl class="angaben">
        <dt>Aufnahmegebühr</dt>
        <dd>Einmalig ${escapeHtml(String(beitraege.aufnahmegebuehr ?? ""))} €, wird mit dem ersten Beitrag eingezogen.</dd>

        <dt>Ohne SEPA-Lastschrift</dt>
        <dd>${escapeHtml(String(beitraege.zuschlag_ohne_sepa ?? ""))} € zusätzlich pro Jahr.</dd>

        <dt>Fälligkeit</dt>
        <dd>${escapeHtml(mitGrossAnfang(mitSchlusspunkt(beitraege.faelligkeit)))}</dd>

        <dt>Kündigung</dt>
        <dd>${escapeHtml(mitGrossAnfang(mitSchlusspunkt(beitraege.kuendigung)))}</dd>

        <dt>Doppelmitgliedschaft</dt>
        <dd>${escapeHtml(mitSchlusspunkt(beitraege.doppelmitgliedschaft))}</dd>
      </dl>
    </div>`;
}

function beitraegeAbschnitt(daten) {
  const beitraege = daten.beitraege ?? {};
  const beitragsuebersicht = downloadEintrag(daten, "Beitragsübersicht");

  const karten = `<div class="raster raster--2">
      <div class="karte fluss">
        <span class="karte__titel">Fußballabteilung</span>
        ${beitragsTabelle(beitraege.fussball)}
      </div>
      <div class="karte fluss">
        <span class="karte__titel">Karnevalabteilung „Die&nbsp;Schnauzer“</span>
        ${beitragsTabelle(beitraege.karneval)}
      </div>
    </div>`;

  // W9-B-Nachprüfung: "Beitragsübersicht (PDF)" war ein umrandeter Knopf mit
  // "(PDF)" im Text – widerspricht "ein Download-Baustein für die ganze
  // Website" (Entscheidung, w9-b.md). Jetzt dieselbe downloadZeile() wie auf
  // "Downloads & Anträge" (Titel + "PDF · Seiten · Größe").
  // W10-Nachprüfung (offen 12): Trennlinie lief über die volle
  // .container-Breite statt der Lesebreite wie auf /verein/ueber-uns/ –
  // derselbe Download-Baustein soll überall gleich breit sein.
  const beitragsuebersichtHtml = beitragsuebersicht
    ? `<ul class="downloads inhalt" role="list">
      ${downloadZeile(beitragsuebersicht, PFAD)}
    </ul>`
    : "";

  return `<section class="abschnitt">
  <div class="container fluss">
    <h2>Beiträge</h2>
    ${karten}
    ${gutZuWissenAbschnitt(beitraege)}
    <p class="meta">Beiträge laut Beitragsordnung 2026; verbindlich ist der Aufnahmeantrag.</p>
    ${beitragsuebersichtHtml}
  </div>
</section>`;
}

// ---------- So wirst du Mitglied ----------

// W9-Korrektur (QA3 1440-1/1440-2/390-8, w9-b.md): eine einzige
// Schrittfolge statt der bisherigen drei sich widersprechenden Abläufe
// (Block "Probetraining vereinbaren", Abschnitt "Aufnahmeantrag online
// stellen", "So wird man Mitglied" mit "siehe oben"-Verweisen). Schritt 1
// und 4 gelten nur für Fußball (Karneval hat kein Probetraining/keinen
// Spielerpass, dafür eine eigene Zeile); Schritt 2 enthält beide Antrags-
// Knöpfe direkt im Schritt (online + PDF), Schritt 3 verweist auf die
// Unterlagen-Karten weiter unten.
// W10-Nachprüfung (offen 13): Schritt 1 sagte "eine E-Mail an die
// Jugendleitung genügt" und widersprach sich direkt mit dem Herren-Link
// darunter; Wortlaut jetzt an Entscheidung D (w10-gemeinsam.md) angeglichen
// ("Jahrgang, Vorerfahrung"), wie auf den Mannschaftsseiten.
function ablaufAbschnitt(daten) {
  const beitraege = daten.beitraege ?? {};
  const karneval = daten.karneval ?? {};
  const karnevalMail = karneval.mail ?? "karnevalabteilung@sportfreunde04.de";
  const aufnahmeantrag = downloadEintrag(daten, "Aufnahmeantrag");
  const herrenHref = herrenMailtoHref(daten);
  const herrenLink = herrenHref
    ? `<p class="meta"><a href="${escapeHtml(herrenHref)}">Für die Herren: E-Mail an das Trainerteam der Herren ›</a></p>`
    : "";

  return `<section class="abschnitt--hell abschnitt">
  <div class="container fluss">
    <h2>So wirst du Mitglied</h2>
    <ol class="schritte" style="max-width:var(--inhalt);">
      <li>
        <div class="schritt__inhalt">
          <p>Probetraining vereinbaren (nur Fußball): E-Mail an die Jugendleitung mit Jahrgang und Vorerfahrung.</p>
          <p class="knopfzeile">
            <a class="knopf" href="${escapeHtml(PROBETRAINING_MAILTO)}">E-Mail an die Jugendleitung</a>
          </p>
          ${herrenLink}
          <p class="meta">Karneval: E-Mail an die <a href="${escapeHtml(`mailto:${karnevalMail}`)}">Karnevalabteilung</a>.</p>
        </div>
      </li>
      <li>
        <div class="schritt__inhalt">
          <p>Aufnahmeantrag ausfüllen – online oder als PDF.</p>
          <p class="knopfzeile">
            <a class="knopf" href="${escapeHtml(APPACK_FORMULAR_URL)}" target="_blank" rel="noopener">Aufnahmeantrag online ausfüllen</a>
            ${downloadKnopf(aufnahmeantrag, "Aufnahmeantrag (PDF)")}
          </p>
        </div>
      </li>
      <li><div class="schritt__inhalt"><p>Unterlagen abgeben: im Vereinsheim oder beim Trainerteam. Was dazugehört, steht unten.</p></div></li>
      <li><div class="schritt__inhalt"><p>Spielerpass – nur Fußball: Der Verein beantragt die Spielerlaubnis beim HFV. ${escapeHtml(mitGeschuetzterOrdnungszahl(beitraege.eintritt ?? ""))}</p></div></li>
    </ol>
  </div>
</section>`;
}

// ---------- Unterlagen ----------

function unterlagenKarte(titel, liste, extraHtml = "") {
  const zeilen = (liste ?? []).map((e) => `<li>${escapeHtml(e)}</li>`).join("\n        ");
  return `<div class="karte fluss">
      <span class="karte__titel">${escapeHtml(titel)}</span>
      <ul>
        ${zeilen}
      </ul>
      ${extraHtml}
    </div>`;
}

// W2: löst den früheren Formularentwurf (assets/js/formular.js) ab – der
// Antrag läuft über das appack-Formular des Vereins (speichert in ein
// Worksheet, Bestätigung per E-Mail an die Geschäftsstelle), verlinkt direkt
// in Schritt 2 der Ablauf-Liste (siehe ablaufAbschnitt() oben).
const APPACK_FORMULAR_URL = "https://appack.de/rest-api/drender/6a903758337cdc97f94f2655";

// W9-Korrektur (QA3 1440-14/390-23, w9-b.md): Überschrift "Unterlagen
// (Fußball)" – die Karten (Spielerpass/HFV-Formulare) gelten nur für die
// Fußballabteilung, die Seite spricht aber auch Karneval-Mitglieder an
// (Beiträge oben). Kartentitel "Ohne deutschen Pass" statt "Ohne deutsche
// Staatsangehörigkeit (zusätzlich)" (brach zuvor in drei Zeilen um);
// "zusätzlich" steht jetzt im Einleitungssatz der Karte.
// W10-Korrektur (QA4 web-1440-verein-und-rest Nr. 24): "Formulare zum
// Herunterladen" passte nicht zum Listeninhalt (Info-Blatt, Unterlagenliste,
// Satzung sind keine Formulare) – Überschrift auf "Zum Herunterladen"
// verkürzt (dieselbe wie auf /verein/ueber-uns/). Den Aufnahmeantrag
// zusätzlich in diese Liste aufzunehmen (zweiter Teil des Vorschlags) würde
// die von QA3/W9 behobene Doppelung (Knopf in Schritt 2 UND PDF-Zeile hier)
// wieder einführen – bewusst nicht umgesetzt, siehe Abschlussbericht.
function unterlagenAbschnitt(daten) {
  const unterlagen = daten.unterlagen ?? {};
  // Aufnahmeantrag bewusst ausgenommen: der steht bereits als Knopf in
  // Schritt 2 der Ablauf-Liste (jede PDF nur einmal auf der Seite).
  const anmeldungDownloads = (daten.downloads ?? []).filter(
    (d) => d.gruppe === "Anmeldung" && !d.titel.startsWith("Aufnahmeantrag")
  );
  const satzung = downloadEintrag(daten, "Satzung");

  const karten = `<div class="raster raster--3">
      ${unterlagenKarte("Neuanmeldung", unterlagen.neuanmeldung)}
      ${unterlagenKarte("Vereinswechsel", unterlagen.vereinswechsel)}
      ${unterlagenKarte(
        "Ohne deutschen Pass",
        unterlagen.ohne_deutsche_staatsangehoerigkeit,
        `<p class="meta">Zusätzlich zu Neuanmeldung oder Vereinswechsel. ${escapeHtml(unterlagen.hinweis_ausland ?? "")}</p>`
      )}
    </div>`;

  // W9-Korrektur (QA3 1440-13/390-9/quer-35, w9-b.md): keine gekürzten
  // Titel mehr – dieselbe Quelle (data/downloads.json) wie "Downloads &
  // Anträge" (src/seiten/verein/downloads.mjs), damit beide Seiten identische
  // Titel/Angaben (PDF · Seiten · Größe) zeigen. Eigene Zwischenüberschrift
  // "Formulare zum Herunterladen" statt der Liste ohne Abstand direkt unter
  // den Karten.
  const zeilen = [...anmeldungDownloads.map((d) => downloadZeile(d, PFAD)), downloadZeile(satzung, PFAD)].join(
    "\n      "
  );
  // W10-Nachprüfung (offen 12): Liste/Überschrift jetzt auf die Lesebreite
  // (.inhalt) begrenzt statt der vollen .container-Breite – gleich wie auf
  // /verein/ueber-uns/.

  return `<section class="abschnitt">
  <div class="container fluss">
    <h2>Unterlagen (Fußball)</h2>
    ${karten}
    <h3 class="inhalt">Zum Herunterladen</h3>
    <ul class="downloads inhalt" role="list">
      ${zeilen}
    </ul>
  </div>
</section>`;
}

// ---------- Abschluss ----------

// W8-Korrektur: Der Mach-mit-Verweis (W3b, Prüfer-Befund "wichtig") stand als
// eigener, grauer Abschnitt ganz am Seitenende – jetzt als zusätzlicher Satz
// im ohnehin letzten Abschnitt "Fragen zur Mitgliedschaft?" statt eines
// weiteren eigenen Blocks.
function abschlussAbschnitt() {
  return `<section class="abschnitt--blau abschnitt abschnitt--eng">
  <div class="container fluss">
    <h2>Fragen zur Mitgliedschaft?</h2>
    <p>Die Geschäftsstelle hilft weiter. Oder möchtest du dich als Trainer, Betreuer oder Helfer <a href="${PFAD}verein/mach-mit/">einbringen</a>?</p>
    <p class="knopfzeile">
      <a class="knopf knopf--weiss" href="mailto:geschaeftsstelle@sportfreunde04.de?subject=Mitgliedschaft">E-Mail an die Geschäftsstelle</a>
    </p>
  </div>
</section>`;
}

export function seite(daten) {
  // W9-Korrektur (w9-b.md): Seitenreihenfolge jetzt Beiträge › Ablauf ("So
  // wirst du Mitglied", enthält Antrag online/PDF direkt in Schritt 2) ›
  // Unterlagen. Kein separater Probetraining- oder Online-Antrag-Block mehr.
  const inhalt = [
    seitenkopfAbschnitt(),
    beitraegeAbschnitt(daten),
    ablaufAbschnitt(daten),
    unterlagenAbschnitt(daten),
    abschlussAbschnitt(),
  ].join("\n");

  return {
    url: "/mitglied-werden/",
    title: "Mitglied werden",
    description:
      "Mitglied beim FFV Sportfreunde 04 werden: Beiträge für Fußball und Karneval, Ablauf von Probetraining bis Spielerpass, Unterlagen zum Download und der Aufnahmeantrag.",
    inhalt,
  };
}
