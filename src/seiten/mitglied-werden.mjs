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
//
// Livegang (Paket P1, 12.10.2026, Entscheidung der 1. Vorsitzenden): Neue Mitglieder melden sich nur noch nach dem Probetraining an. Mit
// dem Schalter ANMELDUNG_LIVE (hilfen.mjs) bietet die Seite in Web und App nur diesen einen Weg: „Nach dem Probetraining bekommen Sie
// einen Code. Damit melden Sie sich hier an.“ mit dem Knopf „Jetzt anmelden“ (anmeldung.html, in der App im Browser). Entfallen sind der
// Aufnahmeantrag zum Ausfüllen (PDF), die Seite „Aufnahmeantrag online“, der Antrag per E-Mail und das Formular der App. Die Anrede ist
// „Sie“ (Stilregeln). Ohne den Schalter bleibt die Seite wie vor dem Livegang (docs/ws/* Byte für Byte). mitgliedWerdenAppSeite() baut
// dieselbe Seite als App-Datei assets/app/Mitglied-werden-App.html (tools/app-optik/tpl-bauen.mjs).

import { downloadZeile } from "../vorlagen/bausteine.mjs";
import { PROBETRAINING_MAILTO, APP_MODUS_SKRIPT, APP_MODUS_SKRIPT_APP_DATEI, AUFNAHMEANTRAG_MAILTO, AUFNAHMEANTRAG_VERSAND, ANMELDUNG_LIVE } from "../vorlagen/hilfen.mjs";

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

function seitenkopfAbschnitt(live = false) {
  // Live: Es gibt keinen „Antrag“ mehr zum Ausfüllen auf dieser Seite.
  const lead = live
    ? "Beiträge, Ablauf und Unterlagen auf einen Blick."
    : "Erst die Fakten, dann der Antrag: Beiträge, Ablauf und Unterlagen auf einen Blick.";
  return `<section class="abschnitt seitenkopf">
  <div class="container">
    <h1>Mitglied werden</h1>
    <p class="seitenkopf__lead">${lead}</p>
  </div>
</section>`;
}

// ---------- Beiträge ----------

// W3, Abschnitt 7 (Prüfer-Befund): unter 480px war die Spalte "jährlich"
// abgeschnitten ("JÄHR", "1…"). .beitragstabelle (komponenten.css) verkleinert
// dort Schrift/Innenabstand; die Kopfzeilen zeigen unter 480px die kurze Form
// ("Monat"/"Jahr" statt "monatlich"/"jährlich"), damit der Jahreswert nie
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
            <th class="zahl"><span class="beitragstabelle__lang">monatlich</span><span class="beitragstabelle__kurz">Monat</span></th>
            <th class="zahl"><span class="beitragstabelle__lang">jährlich</span><span class="beitragstabelle__kurz">Jahr</span></th>
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
// Dieser Ablauf gilt ohne den Anmelde-Assistenten (Schalter ANMELDUNG_LIVE aus). Mit dem Assistenten gilt ablaufAbschnittLive() unten
// (Paket P1): Der Hauptknopf „Schritt für Schritt anmelden“ der Vorstufe (M6) mit den Nebenwegen entfällt dort.
function ablaufAbschnitt(daten) {
  const beitraege = daten.beitraege ?? {};
  const karneval = daten.karneval ?? {};
  const karnevalMail = karneval.mail ?? "karnevalabteilung@sportfreunde04.de";
  const aufnahmeantrag = downloadEintrag(daten, "Aufnahmeantrag");
  const herrenHref = herrenMailtoHref(daten);
  const herrenLink = herrenHref
    ? `<p class="meta"><a href="${escapeHtml(herrenHref)}">Für die Herren: E-Mail an das Trainerteam der Herren ›</a></p>`
    : "";
  const eintritt = beitraege.eintritt ? `<p class="meta">${escapeHtml(mitGeschuetzterOrdnungszahl(beitraege.eintritt))}</p>` : "";
  const assistent = "";
  const webWeg = `online ausfüllen und am Bildschirm unterschreiben – daraus entsteht das fertige PDF${AUFNAHMEANTRAG_VERSAND.art === "endpunkt" ? ", das Sie direkt an die Geschäftsstelle senden" : " für die E-Mail an die Geschäftsstelle"}.`;
  const webAntrag = `<p>Aufnahmeantrag ${webWeg}</p>`;
  const appAntrag = `<p>Aufnahmeantrag ausfüllen – online oder als PDF.</p>`;
  const antragKnopf = "knopf";

  return `<section class="abschnitt--hell abschnitt">
  <div class="container fluss">
    <h2>So wirst du Mitglied</h2>
    <ol class="schritte" style="max-width:var(--inhalt);">
      <li>
        <div class="schritt__inhalt">
          <p>Probetraining vereinbaren (nur Fußball): E-Mail an die Jugendleitung mit Jahrgang und Vorerfahrung.</p>
          <p class="meta">Beim Probetraining ist man noch nicht über den Verein versichert.</p>
          <p class="knopfzeile">
            <a class="knopf" href="${escapeHtml(PROBETRAINING_MAILTO)}">E-Mail an die Jugendleitung</a>
          </p>
          ${herrenLink}
          <p class="meta">Karneval: E-Mail an die <a href="${escapeHtml(`mailto:${karnevalMail}`)}">Karnevalabteilung</a>.</p>
        </div>
      </li>
      <li>
        <div class="schritt__inhalt" data-nur-web>
          ${assistent}${webAntrag}
          <p class="knopfzeile">
            <a class="${antragKnopf}" href="${PFAD}aufnahmeantrag/">Online ausfüllen</a>
            ${downloadKnopf(aufnahmeantrag, "PDF zum Ausdrucken")}
          </p>
          <p class="meta">Lieber auf Papier? PDF ausdrucken, ausfüllen, unterschreiben und im Vereinsheim abgeben oder <a href="${escapeHtml(AUFNAHMEANTRAG_MAILTO)}">per E-Mail an die Geschäftsstelle senden</a>.</p>
          ${eintritt}
        </div>
        <div class="schritt__inhalt" data-nur-app hidden>
          ${assistent}${appAntrag}
          <p class="knopfzeile">
            <a class="${antragKnopf}" href="${escapeHtml(APPACK_FORMULAR_URL)}" target="_blank" rel="noopener">Aufnahmeantrag online ausfüllen</a>
            ${downloadKnopf(aufnahmeantrag, "Aufnahmeantrag (PDF)")}
          </p>
          ${eintritt}
        </div>
      </li>
      <li><div class="schritt__inhalt"><p>Unterlagen abgeben: im Vereinsheim oder beim Trainerteam. Was dazugehört, steht unten.</p></div></li>
      <li><div class="schritt__inhalt"><p>Spielerpass – nur Fußball: Der Verein beantragt die Spielerlaubnis beim HFV.</p></div></li>
    </ol>
  </div>
</section>`;
}

// Mit dem Assistenten (Paket P1): Schritt 2 hat genau einen Weg. Nach dem Probetraining bekommen die Eltern einen Code; damit
// melden sie sich im Assistenten an (anmeldung.html; in der App öffnet APP_MODUS_SKRIPT den Link im Browser, auf der Website öffnet er in einem
// neuen Fenster: target="_blank" rel="noopener", denn die Hülle zeigt die Seiten in einem Rahmen ohne allow-Angaben, in dem Teilen, Kopieren und
// Herunterladen nicht verlässlich sind; die Weiche der App nimmt target wieder weg). Schritt 1 (Probetraining)
// trägt den Anker #probetraining: Die Code-Seite des Assistenten verlinkt „Probetraining vereinbaren“ dorthin. Schritt 3 sagt, wie die
// Datei zum Verein kommt (per E-Mail an die Geschäftsstelle, Entscheidung der 1. Vorsitzenden vom 11.10.2026); „im Vereinsheim abgeben“
// gilt nicht mehr. „HFV“ steht ausgeschrieben (Stilregeln). Gleiche Schritte in Web und App: keine Teile nur für Web oder nur für die App.
// Runde 2 (12.10.2026): Schritt 1 sagt nicht mehr „(nur Fußball)“ (der Code gilt für alle, auch Karneval braucht vorher ein Probetraining; die Zeilen
// für die Herren und für Karneval bleiben). Schritt 3 sagt nur noch, dass die Datei per E-Mail kommt: Was dazugehört, steht gleich darunter bei den
// Unterlagen („Die Anmeldung sagt Ihnen genau, was Sie brauchen.“), ein zweiter Satz dazu wäre doppelt (Stilregel 5).
function ablaufAbschnittLive(daten) {
  const beitraege = daten.beitraege ?? {};
  const karneval = daten.karneval ?? {};
  const karnevalMail = karneval.mail ?? "karnevalabteilung@sportfreunde04.de";
  const herrenHref = herrenMailtoHref(daten);
  const herrenLink = herrenHref
    ? `<p class="meta"><a href="${escapeHtml(herrenHref)}">Für die Herren: E-Mail an das Trainerteam der Herren ›</a></p>`
    : "";
  const eintritt = beitraege.eintritt ? `<p class="meta">${escapeHtml(mitGeschuetzterOrdnungszahl(beitraege.eintritt))}</p>` : "";

  return `<section class="abschnitt--hell abschnitt">
  <div class="container fluss">
    <h2>So werden Sie Mitglied</h2>
    <ol class="schritte" style="max-width:var(--inhalt);">
      <li id="probetraining">
        <div class="schritt__inhalt">
          <p>Probetraining vereinbaren: E-Mail an die Jugendleitung mit Jahrgang und Vorerfahrung.</p>
          <p class="meta">Beim Probetraining ist man noch nicht über den Verein versichert.</p>
          <p class="knopfzeile">
            <a class="knopf" href="${escapeHtml(PROBETRAINING_MAILTO)}">E-Mail an die Jugendleitung</a>
          </p>
          ${herrenLink}
          <p class="meta">Karneval: E-Mail an die <a href="${escapeHtml(`mailto:${karnevalMail}`)}">Karnevalabteilung</a>.</p>
        </div>
      </li>
      <li>
        <div class="schritt__inhalt">
          <p>Nach dem Probetraining bekommen Sie einen Code. Damit melden Sie sich hier an.</p>
          <p class="knopfzeile">
            <a class="knopf" href="${PFAD}anmeldung/" target="_blank" rel="noopener">Jetzt anmelden</a>
          </p>
          ${eintritt}
        </div>
      </li>
      <li><div class="schritt__inhalt"><p>Datei schicken: Am Ende schicken Sie die Datei per E-Mail an die Geschäftsstelle.</p></div></li>
      <li><div class="schritt__inhalt"><p>Spielerpass – nur Fußball: Der Verein beantragt das Spielrecht (Erlaubnis zum Spielen) beim Hessischen Fußball-Verband.</p></div></li>
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

// Seit 28.09.2026 nur noch im App-Modus verlinkt. Auf der Website führt
// „Online ausfüllen“ auf die eigene Seite /aufnahmeantrag/
// (src/seiten/aufnahmeantrag.mjs: Formular, Unterschrift, fertiges PDF),
// daneben stehen das PDF zum Ausdrucken und der E-Mail-Weg
// (AUFNAHMEANTRAG_MAILTO in hilfen.mjs). W2: löst den früheren Formularentwurf (assets/js/formular.js) ab – der
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
// Mit dem Assistenten (Paket P1) trägt die Familie nichts mehr von Hand in den Antrag auf Spielerlaubnis ein: Der Assistent füllt ihn aus.
// Der Zusatz „(nur Name und Unterschriften eintragen, den Rest füllt der Verein aus)“ entfällt dann (data/unterlagen.json bleibt, wie sie ist).
const ZUSATZ_VON_HAND = / \(nur Name und Unterschriften eintragen[^)]*\)$/;
// Runde 2 (12.10.2026): Mit dem Assistenten stehen in „Zum Herunterladen“ nur noch die Zusatzerklärung und die Satzung (die Beitragsübersicht steht bei den
// Beiträgen). Das Info-Blatt und die Liste „Wichtige Unterlagen, die mitzubringen sind“ gehören zum alten Papierweg („mitbringen“ passt nicht zu „per E-Mail
// schicken“); sie bleiben auf der Seite „Downloads“ (src/seiten/verein/downloads.mjs, unverändert).
const NUR_AUF_DER_DOWNLOADSEITE = ["Info-Blatt", "Wichtige Unterlagen"];

function unterlagenAbschnitt(daten, live = false) {
  const unterlagen = daten.unterlagen ?? {};
  const neuanmeldung = live ? (unterlagen.neuanmeldung ?? []).map((e) => e.replace(ZUSATZ_VON_HAND, "")) : unterlagen.neuanmeldung;
  // Aufnahmeantrag bewusst ausgenommen: der steht bereits als Knopf in
  // Schritt 2 der Ablauf-Liste (jede PDF nur einmal auf der Seite). Mit dem
  // Assistenten (P1) gibt es den Antrag zum Ausfüllen auf der Seite nicht mehr;
  // die übrigen Dokumente zum Lesen und das Zusatzformular bleiben.
  const anmeldungDownloads = (daten.downloads ?? []).filter(
    (d) => d.gruppe === "Anmeldung" && !d.titel.startsWith("Aufnahmeantrag") && !(live && NUR_AUF_DER_DOWNLOADSEITE.some((anfang) => d.titel.startsWith(anfang)))
  );
  const satzung = downloadEintrag(daten, "Satzung");

  const karten = `<div class="raster raster--3">
      ${unterlagenKarte("Neuanmeldung", neuanmeldung)}
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

  // Mit dem Assistenten (Runde 2): Die drei Listen sind für die Seite zu viel (Stilregeln 2 und 3) und stehen in einem zugeklappten Bereich
  // (<details>, mit der Tastatur auf- und zuklappbar). Davor ein Satz: Die Anmeldung sagt, was man braucht. Die Listen selbst bleiben, wie sie waren.
  if (live) {
    return `<section class="abschnitt">
  <div class="container fluss">
    <h2>Unterlagen (Fußball)</h2>
    <p class="inhalt">Die Anmeldung sagt Ihnen genau, was Sie brauchen.</p>
    <details class="aufklapper">
      <summary>Welche Unterlagen brauche ich?</summary>
      <div class="aufklapper__inhalt">
        ${karten}
      </div>
    </details>
    <h3 class="inhalt">Zum Herunterladen</h3>
    <ul class="downloads inhalt" role="list">
      ${zeilen}
    </ul>
  </div>
</section>`;
  }

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

// Mit dem Assistenten (Paket P1): Hilfe-Zeile „Fragen? Die Geschäftsstelle hilft.“ in der Anrede „Sie“.
function abschlussAbschnittLive() {
  return `<section class="abschnitt--blau abschnitt abschnitt--eng">
  <div class="container fluss">
    <h2>Fragen?</h2>
    <p>Die Geschäftsstelle hilft. Oder möchten Sie sich als Trainer, Betreuer oder Helfer <a href="${PFAD}verein/mach-mit/">einbringen</a>?</p>
    <p class="knopfzeile">
      <a class="knopf knopf--weiss" href="mailto:geschaeftsstelle@sportfreunde04.de?subject=Mitgliedschaft">E-Mail an die Geschäftsstelle</a>
    </p>
  </div>
</section>`;
}

// Stil des zugeklappten Bereichs „Welche Unterlagen brauche ich?“ (Runde 2). Nur in der Fassung mit dem Assistenten und nur auf dieser Seite: Das Stylesheet der Website
// (site.css) und damit alle übrigen Seiten bleiben, wie sie sind. Die App-Datei bekommt dieselben Regeln in ihrem <style>. Vereinsblau, Fokusring wie überall.
export const AUFKLAPPER_CSS = `.aufklapper { margin-block: var(--sp-4); border: 1px solid var(--line); border-radius: var(--r-md); background: var(--surface); }
.aufklapper > summary { display: flex; align-items: center; gap: var(--sp-2); min-height: 48px; padding: var(--sp-2) var(--sp-4); cursor: pointer; font-weight: 700; color: var(--blau-800); list-style: none; }
.aufklapper > summary::-webkit-details-marker { display: none; }
.aufklapper > summary::before { content: ""; flex: none; width: .5em; height: .5em; border-right: 2px solid currentColor; border-bottom: 2px solid currentColor; transform: rotate(-45deg); transition: transform var(--t-kurz, .15s); }
.aufklapper[open] > summary::before { transform: rotate(45deg); }
.aufklapper > summary:focus-visible { outline: var(--fokus, 3px solid currentColor); outline-offset: 2px; border-radius: var(--r-md); }
.aufklapper__inhalt { padding: 0 var(--sp-4) var(--sp-4); }`;
const AUFKLAPPER_STYLE = `\n<style>\n${AUFKLAPPER_CSS}\n</style>`;

// Alle Abschnitte der Seite. live = true: Livegang (Paket P1), siehe Kopfkommentar; sonst der Stand ohne Assistenten.
export function mitgliedWerdenInhalt(daten, live) {
  // W9-Korrektur (w9-b.md): Seitenreihenfolge jetzt Beiträge › Ablauf ("So
  // wirst du Mitglied", enthält Antrag online/PDF direkt in Schritt 2) ›
  // Unterlagen. Kein separater Probetraining- oder Online-Antrag-Block mehr.
  return [
    seitenkopfAbschnitt(live),
    beitraegeAbschnitt(daten),
    live ? ablaufAbschnittLive(daten) : ablaufAbschnitt(daten),
    unterlagenAbschnitt(daten, live),
    live ? abschlussAbschnittLive() : abschlussAbschnitt(),
  ].join("\n");
}

export function seite(daten) {
  const live = ANMELDUNG_LIVE;
  const inhalt = mitgliedWerdenInhalt(daten, live);

  return {
    url: "/mitglied-werden/",
    // App-Modus (?app=1): Links führen in die App-Seiten, siehe hilfen.mjs
    kopfZusatz: live ? APP_MODUS_SKRIPT + AUFKLAPPER_STYLE : APP_MODUS_SKRIPT,
    title: "Mitglied werden",
    description: live
      ? "Mitglied beim FFV Sportfreunde 04 werden: Beiträge für Fußball und Karneval, Ablauf von Probetraining bis Spielerpass und die Anmeldung nach dem Probetraining."
      : "Mitglied beim FFV Sportfreunde 04 werden: Beiträge für Fußball und Karneval, Ablauf von Probetraining bis Spielerpass, Unterlagen zum Download und der Aufnahmeantrag.",
    inhalt,
  };
}

// ---------- App-Datei (assets/app/Mitglied-werden-App.html) ----------

// Dieselbe Seite wie web/mitglied-werden.html (mit dem Assistenten, live = true) als statische Workspace-Seite für das Seitenmodul
// „Mitglied werden“ der App (Seitenlink Mitglied-werden-App.html an der Workspace-Wurzel). Der App-Modus ist fest eingeschaltet
// (<html class="app-modus" data-app-seite>, wie Termine-App.html): Das Skript APP_MODUS_SKRIPT_APP_DATEI schreibt Links auf Seiten
// des Ordners web/ in nav:// bzw. mit ?app=1 um, externe Adressen und den Assistenten (anmeldung.html) in ext:// (Browser).
// Die Datei liegt an der Workspace-Wurzel, nicht im Ordner web/: Alle Verweise der Seite sind deshalb absolute Adressen.
const WEB_ORDNER = "https://cdn.appack.de/sportfreunde04/workspace/web/";
const GH_PAGES_ASSETS = "https://justolgay.github.io/speuzer-website-prototyp/assets/";

// Verweise der Seite (relativ zu /mitglied-werden/: "../anmeldung/", "../verein/mach-mit/", "../assets/…") als absolute Adressen:
// Seiten wie im Paket (docs/ws/<segmente-mit-bindestrich>.html im Ordner web/), Assets wie auf GitHub Pages.
function absoluteVerweise(html) {
  const ergebnis = html.replace(/(href|src)="(\.\.\/[^"]*)"/g, (_treffer, attribut, wert) => {
    if (wert.startsWith("../assets/")) return `${attribut}="${GH_PAGES_ASSETS}${wert.slice("../assets/".length)}"`;
    const seite = /^\.\.\/([a-z0-9-]+(?:\/[a-z0-9-]+)*)\/$/.exec(wert);
    if (!seite) throw new Error(`mitglied-werden: Verweis "${wert}" lässt sich nicht in eine absolute Adresse umschreiben`);
    return `${attribut}="${WEB_ORDNER}${seite[1].split("/").join("-")}.html"`;
  });
  if (/(?:href|src)="\.\.?\//.test(ergebnis)) throw new Error("mitglied-werden: relativer Verweis nach dem Umschreiben");
  return ergebnis;
}

// Die Titelzeile der App zeigt „Mitglied werden“: Die Überschrift bleibt nur für Bildschirmleser, der Kopf rückt zusammen.
const APP_CSS = `.app-modus .seitenkopf { padding-block: var(--sp-4) 0; }
.app-modus .seitenkopf h1 {
  position: absolute;
  width: 1px; height: 1px;
  margin: -1px; padding: 0; border: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}
.app-modus .seitenkopf__lead { margin-top: 0; font-size: .9375rem; }
.app-modus .ws-fuss { display: none; }
${AUFKLAPPER_CSS}`;

export function mitgliedWerdenAppSeite(daten) {
  const schrift = (datei) => `<link rel="preload" href="${GH_PAGES_ASSETS}fonts/${datei}" as="font" type="font/woff2" crossorigin>`;
  const inhalt = absoluteVerweise(mitgliedWerdenInhalt(daten, true));
  return `<!DOCTYPE html>
<html lang="de" class="app-modus" data-app-seite>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
<meta name="format-detection" content="telephone=no">
<meta name="format-detection" content="address=no">
<meta name="format-detection" content="email=no">
<meta name="format-detection" content="date=no">
<title>Mitglied werden</title>
<!-- Speuzer Blau-Weiß – Mitglied-werden-App.html
     Statische Workspace-Seite für das Seitenmodul „Mitglied werden“ der App
     (Seitenlink Mitglied-werden-App.html an der Workspace-Wurzel, ausgeliefert unter
     https://cdn.appack.de/sportfreunde04/workspace/Mitglied-werden-App.html).
     Gleicher Inhalt wie web/mitglied-werden.html (Quelle src/seiten/mitglied-werden.mjs),
     braucht dessen site.css im Ordner web. Erzeugt durch
     tools/app-optik/tpl-bauen.mjs (npm run tpl-bauen) – NICHT von Hand
     bearbeiten. Details: assets/app/LIESMICH.md, Abschnitt „Mitglied werden“. -->
<link rel="canonical" href="${WEB_ORDNER}mitglied-werden.html">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#191793">
${schrift("inter.woff2")}
${schrift("barlow-condensed-600.woff2")}
${schrift("barlow-condensed-700.woff2")}
<link rel="stylesheet" href="${WEB_ORDNER}site.css">
<style>
${APP_CSS}
</style>${APP_MODUS_SKRIPT_APP_DATEI}
</head>
<body class="ws">
<main id="inhalt">
${inhalt}
</main>
</body>
</html>
`;
}
