// Aufnahmeantrag online /aufnahmeantrag/ (28.09.2026, im Workspace
// web/aufnahmeantrag.html). appack nimmt Formulardaten nur aus der App an –
// Website-Besucher können dort nichts abschicken. Diese Seite füllt deshalb
// das Vereinsformular selbst aus: Formular in Schritten, Unterschrift mit
// Finger oder Maus, daraus erzeugt der Browser mit pdf-lib das vollständige,
// unterschriebene Vereins-PDF (Vorlage von cdn.appack.de, Feldpositionen aus
// data/aufnahmeantrag-felder.json). Danach herunterladen oder am Handy über
// das Teilen-Menü direkt in die Mail-App; dazu die vorbereitete E-Mail an
// die Geschäftsstelle. Keine Übertragung an einen Server: Die Angaben
// bleiben im Browser, bis der Nutzer selbst sendet. Der Versand ist in
// VERSAND gekapselt (heute "manuell", später "endpunkt" – z. B. eine eigene
// Annahme über die Vereinsdomain; die Entscheidung trifft die 1.
// Vorsitzende).
//
// Aufbau: Das Markup (alle Schritte, Beschriftungen, Beiträge aus
// data/beitraege.json) entsteht hier beim Bauen; Verhalten, Prüfungen,
// Unterschriftsfelder und PDF-Erzeugung stecken in
// assets/js/antrag/aufnahmeantrag.js. Die leere Vorlage prüft das Skript
// gleich beim Start im Hintergrund (Größe, SHA-256), pdf-lib lädt es nach dem
// ersten Schritt nach, fontkit und die Schrift nur für Namen mit Zeichen
// außerhalb von Helvetica (data-pdf-lib/data-fontkit/data-schrift am
// Formular, tools/appack-paket.mjs schreibt die Adressen für den
// Workspace-Ordner web/ um). In der Vereins-App (?app=1) bleibt es beim
// App-Formular (data-nur-app, siehe APP_MODUS_SKRIPT in hilfen.mjs).
//
// Nachbesserung 28.09.2026: Längenprüfung mit echten Zeichenbreiten
// (data/aufnahmeantrag-schriftbreiten.json) – was nicht in mindestens 6 pt
// ins Feld des Vereins-PDF passt, weist das Formular vorher ab; Pflichtfelder
// mit aria-required; Fehlerliste ohne Live-Region (Ansage über den Fokus).

import {
  ruecklink,
  mailLink,
  APP_MODUS_SKRIPT,
  AUFNAHMEANTRAG_MAILTO,
  AUFNAHMEANTRAG_ONLINE_MAILTO,
} from "../vorlagen/hilfen.mjs";

// Diese Seite liegt immer unter "/aufnahmeantrag/" (Tiefe 1), daher "../"
// (siehe pfadZurWurzel() in tools/build.mjs).
const PFAD = "../";

// Versand des fertigen PDF (gekapselt, siehe assets/js/antrag/aufnahmeantrag.js,
// Abschnitt "Versand"): "manuell" = Herunterladen/Teilen + vorbereitete
// E-Mail, der Nutzer sendet selbst. Für einen späteren eigenen Endpunkt hier
// { art: "endpunkt", url: "https://…" } eintragen – das Skript schickt das
// PDF dann per POST (multipart/form-data, Feld "antrag") dorthin.
const VERSAND = { art: "manuell" };

// Gleiche Adresse wie in mitglied-werden.mjs/downloads.mjs: das App-Formular,
// im App-Modus schreibt APP_MODUS_SKRIPT den Link auf nav:// um.
const APPACK_FORMULAR_URL = "https://appack.de/rest-api/drender/6a903758337cdc97f94f2655";

// Ergänzte Textstellen, die die Vermessung (data/aufnahmeantrag-felder.json)
// nicht enthält: Name der unterschreibenden erziehungsberechtigten Person
// unter der Unterschrift auf Seite 2 und 3 – das Formular fragt nach keiner
// Person, bei Minderjährigen unterschreibt aber nicht das Mitglied.
// Positionen am 28.09.2026 mit pdfplumber aus dem Original gemessen:
// Seite 2 zwischen Unterschriftslinie (y 127,9) und Rahmenlinie
// (y 108,0–109,4), Seite 3 unter dem Klammerhinweis „(Unterschrift
// Erziehungsberechtigte/r bei Minderjährigen)“ (Grundlinie 127,9, x
// 313,5–501,3), darunter frei bis „Seite 3 von 4“ (y 47,9).
// Seite 2 hat nur Platz für eine Zeile (Rahmenlinie darunter), Seite 3 für
// zwei (je schriftgroesse × zeilenabstand tiefer).
const ZUSAETZE = {
  "s2.zusatz_unterzeichner": {
    typ: "text", seite: 2, zusatz: true, beschriftung: "Zusatz: unterschreibende erziehungsberechtigte Person (Seite 2)",
    x: 312.0, y: 115.2, breite: 232.0, schriftgroesse: 8, min_schriftgroesse: 6, ausrichtung: "links",
  },
  "s3.zusatz_unterzeichner": {
    typ: "text", seite: 3, zusatz: true, beschriftung: "Zusatz: unterschreibende erziehungsberechtigte Person (Seite 3)",
    x: 313.5, y: 117.0, breite: 188.0, schriftgroesse: 8, min_schriftgroesse: 6, ausrichtung: "links",
    zeilen_max: 2, zeilenabstand: 1.2,
  },
};

// Eingabelängen je Feld. Richtwert aus der Vermessung
// (richtwert_zeichen.hoechstens, bei kleinster Schrift); das Skript
// verkleinert beim Zeichnen notfalls weiter, damit nie etwas über den Rand
// läuft; ob eine Angabe wirklich passt, prüft das Skript mit den
// Zeichenbreiten (data/aufnahmeantrag-schriftbreiten.json). Ort: Seite 3 hat
// für „Ort, Datum“ nur 114 pt (siehe data/aufnahmeantrag-felder.json,
// s3.ort_datum), mit „, TT.MM.JJJJ“ passen dort bis etwa 26 Zeichen Ort.
const MAX = {
  vorname: 40, nachname: 40, strasse: 60, ort: 50, email: 80, telefon: 30,
  kreditinstitut: 60, unterschriftOrt: 26,
};

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// JSON sicher in ein <script type="application/json"> einbetten ("</script>"
// und "<!--" dürfen im Text nicht vorkommen).
function jsonImSkript(wert) {
  return JSON.stringify(wert).replace(/</g, "\\u003c");
}

function euro(betrag) {
  return `${betrag}&nbsp;€`;
}

// Beitrag einer Gruppe aus data/beitraege.json (Feld "gruppe", wörtlich).
function jahresbeitrag(liste, gruppe) {
  const eintrag = (liste ?? []).find((g) => g.gruppe === gruppe);
  if (!eintrag) throw new Error(`aufnahmeantrag.mjs: Beitragsgruppe '${gruppe}' fehlt in data/beitraege.json`);
  return eintrag.jahr;
}

function downloadEintrag(daten, titelTeil) {
  return (daten.downloads ?? []).find((d) => (d.titel ?? "").includes(titelTeil));
}

// ---------- Bausteine ----------

// Eingabefeld mit Beschriftung, Hinweis und (leerer) Fehlermeldung. Das
// Skript ergänzt aria-describedby/aria-invalid, sobald eine Meldung steht.
// pflicht: aria-required="true" (Screenreader sagen „erforderlich“) – außer
// bei freiwilligen Feldern und bei Mobil/Festnetz (dort gilt „mindestens
// eine Nummer“ für die Gruppe).
function feld({ name, label, typ = "text", autocomplete, inputmode, maxlength, hinweis, freiwillig, pflicht = !freiwillig, klasse, zusatz = "" }) {
  const id = `a-${name}`;
  const hinweisHtml = hinweis ? `<p class="antrag__hinweis" id="${id}-hinweis">${hinweis}</p>` : "";
  const attrs = [
    `id="${id}"`, `name="${escapeHtml(name)}"`, `type="${typ}"`,
    autocomplete ? `autocomplete="${autocomplete}"` : "",
    inputmode ? `inputmode="${inputmode}"` : "",
    maxlength ? `maxlength="${maxlength}"` : "",
    hinweis ? `aria-describedby="${id}-hinweis"` : "",
    pflicht ? 'aria-required="true"' : "",
    zusatz,
  ].filter(Boolean).join(" ");
  return `<div class="formular__feld${klasse ? ` ${klasse}` : ""}" data-feld="${escapeHtml(name)}">
          <label for="${id}">${label}${freiwillig ? ' <span class="antrag__freiwillig">(freiwillig)</span>' : ""}</label>
          ${hinweisHtml}
          <p class="formular__fehler" id="${id}-fehler" hidden></p>
          <input ${attrs}>
        </div>`;
}

// Geburtsdatum als drei Felder (Tag, Monat, Jahr) – wie auf dem Formular
// (TT . MM . JJJJ) und leichter zu tippen als ein Datumswähler, der am Handy
// bei Geburtsjahren lange scrollen lässt.
function datumFelder(praefix, legende, autocompletePraefix) {
  const ac = (teil) => (autocompletePraefix ? ` autocomplete="${autocompletePraefix}-${teil}"` : ' autocomplete="off"');
  return `<fieldset class="antrag__gruppe antrag__datum" data-feld="${praefix}" aria-describedby="a-${praefix}-hinweis">
          <legend>${legende}</legend>
          <p class="antrag__hinweis" id="a-${praefix}-hinweis">Tag, Monat und Jahr, zum Beispiel 27 3 2015</p>
          <p class="formular__fehler" id="a-${praefix}-fehler" hidden></p>
          <div class="antrag__datum-felder">
            <div class="formular__feld antrag__datum-teil">
              <label for="a-${praefix}_tag">Tag</label>
              <input id="a-${praefix}_tag" name="${praefix}_tag" type="text" inputmode="numeric" aria-required="true" maxlength="2"${ac("day")}>
            </div>
            <div class="formular__feld antrag__datum-teil">
              <label for="a-${praefix}_monat">Monat</label>
              <input id="a-${praefix}_monat" name="${praefix}_monat" type="text" inputmode="numeric" aria-required="true" maxlength="2"${ac("month")}>
            </div>
            <div class="formular__feld antrag__datum-teil antrag__datum-teil--jahr">
              <label for="a-${praefix}_jahr">Jahr</label>
              <input id="a-${praefix}_jahr" name="${praefix}_jahr" type="text" inputmode="numeric" aria-required="true" maxlength="4"${ac("year")}>
            </div>
          </div>
        </fieldset>`;
}

// Auswahlzeile (Kästchen oder Knopf) mit optionaler Zusatzangabe rechts
// (z. B. Jahresbeitrag). Das umschließende <label> ist das Tippziel (≥ 44 px,
// siehe .formular__checkzeile).
function auswahl({ typ, name, wert, label, meta, idZusatz, pflicht }) {
  const id = `a-${name}${wert ? `-${wert}` : ""}${idZusatz ?? ""}`;
  const metaHtml = meta ? ` <span class="antrag__option-meta">${meta}</span>` : "";
  return `<label class="formular__checkzeile antrag__option" for="${id}">
            <input id="${id}" type="${typ}" name="${escapeHtml(name)}"${wert ? ` value="${escapeHtml(wert)}"` : ""}${pflicht ? ' aria-required="true"' : ""}>
            <span class="antrag__option-text">${label}${metaHtml}</span>
          </label>`;
}

// radio: Pflichtauswahl aus Knöpfen – role="radiogroup" mit aria-required
// (an einzelnen Knöpfen ist aria-required nicht erlaubt).
function gruppe({ name, legende, hinweis, inhalt, attrs = "", radio = false }) {
  const hinweisHtml = hinweis ? `<p class="antrag__hinweis" id="a-${name}-hinweis">${hinweis}</p>` : "";
  const rolle = radio ? ' role="radiogroup" aria-required="true"' : "";
  return `<fieldset class="antrag__gruppe" data-feld="${escapeHtml(name)}"${rolle}${hinweis ? ` aria-describedby="a-${name}-hinweis"` : ""}${attrs ? ` ${attrs}` : ""}>
          <legend>${legende}</legend>
          ${hinweisHtml}
          <p class="formular__fehler" id="a-${name}-fehler" hidden></p>
          <div class="formular__checkgruppe">
          ${inhalt}
          </div>
        </fieldset>`;
}

function schritt(name, titel, inhalt) {
  return `<section class="antrag__schritt" id="schritt-${name}" data-schritt="${name}" aria-labelledby="schritt-${name}-titel" hidden>
        <h2 id="schritt-${name}-titel" tabindex="-1">${titel}</h2>
        ${inhalt}
      </section>`;
}

// loeschName: Zusatz für Screenreader am Knopf „Neu“, damit die beiden
// Knöpfe unterscheidbar sind (sichtbar bleibt „Neu“).
function unterschriftsFeld(name, titel, hinweis, loeschName) {
  return `<div class="unterschrift" data-unterschrift="${name}" data-feld="unterschrift_${name}" role="group" aria-labelledby="a-unterschrift_${name}-titel" aria-describedby="a-unterschrift_${name}-hinweis a-unterschrift_${name}-stand">
          <p class="unterschrift__titel" id="a-unterschrift_${name}-titel">${titel}</p>
          <p class="antrag__hinweis" id="a-unterschrift_${name}-hinweis">${hinweis}</p>
          <p class="formular__fehler" id="a-unterschrift_${name}-fehler" hidden></p>
          <div class="unterschrift__flaeche">
            <canvas class="unterschrift__leinwand" role="img" aria-label="Unterschriftsfeld – mit dem Finger, einem Stift oder der Maus unterschreiben"></canvas>
            <span class="unterschrift__linie" aria-hidden="true"></span>
          </div>
          <div class="unterschrift__leiste">
            <p class="unterschrift__stand" id="a-unterschrift_${name}-stand" aria-live="polite">Noch nicht unterschrieben</p>
            <button type="button" class="knopf knopf--sekundaer unterschrift__neu">Neu<span class="sr-only"> – ${loeschName}</span></button>
          </div>
        </div>`;
}

// ---------- Schritte ----------

function schrittMitgliedschaft(daten) {
  const b = daten.beitraege ?? {};
  const fu = b.fussball;
  const ka = b.karneval;
  const jahr = (betrag) => `${euro(betrag)} im Jahr`;
  const fussball = [
    auswahl({ typ: "radio", name: "beitrag_fussball", wert: "jugendlicher", label: "Kinder und Jugendliche (inkl. A-Jugend)", meta: jahr(jahresbeitrag(fu, "Kinder und Jugendliche")) }),
    auswahl({ typ: "radio", name: "beitrag_fussball", wert: "erwachsener", label: "Erwachsene", meta: jahr(jahresbeitrag(fu, "Erwachsene")) }),
    auswahl({ typ: "radio", name: "beitrag_fussball", wert: "passiv", label: "Passive, Frauen, Rentner (ab 65)", meta: jahr(jahresbeitrag(fu, "Passive, Frauen, Rentner")) }),
    auswahl({ typ: "radio", name: "beitrag_fussball", wert: "familie", label: "Familienbeitrag", meta: jahr(jahresbeitrag(fu, "Familien")) }),
  ].join("\n          ");
  const kinderKarneval = jahresbeitrag(ka, "Kinder, Jugendliche, Auszubildende und Studierende (mit Nachweis)");
  const karneval = [
    auswahl({ typ: "radio", name: "beitrag_karneval", wert: "kinder", label: "Kinder und Jugendliche (bis 17)", meta: jahr(kinderKarneval) }),
    auswahl({ typ: "radio", name: "beitrag_karneval", wert: "azubi", label: "Auszubildende und Studierende (mit Nachweis)", meta: jahr(kinderKarneval) }),
    auswahl({ typ: "radio", name: "beitrag_karneval", wert: "erwachsener", label: "Erwachsene", meta: jahr(jahresbeitrag(ka, "Erwachsene")) }),
    auswahl({ typ: "radio", name: "beitrag_karneval", wert: "rentner", label: "Rentner (ab 65)", meta: jahr(jahresbeitrag(ka, "Rentner ab 65")) }),
    auswahl({ typ: "radio", name: "beitrag_karneval", wert: "familie", label: "Familienbeitrag", meta: jahr(jahresbeitrag(ka, "Familien")) }),
    auswahl({ typ: "radio", name: "beitrag_karneval", wert: "senator", label: "Senatorenmitgliedschaft", meta: jahr(jahresbeitrag(ka, "Senatoren")) }),
  ].join("\n          ");

  const inhalt = `<p class="antrag__hinweis">Alle Angaben sind Pflicht, außer sie sind als „freiwillig“ gekennzeichnet.</p>
        ${gruppe({
          name: "abteilung",
          legende: "In welche Abteilung?",
          hinweis: "Beides ist möglich.",
          inhalt: [
            auswahl({ typ: "checkbox", name: "abteilung_fussball", label: "Fußball" }),
            auswahl({ typ: "checkbox", name: "abteilung_karneval", label: "Karneval – „Die&nbsp;Schnauzer“" }),
          ].join("\n          "),
        })}
        <div data-wenn="fussball" hidden>
        ${gruppe({ name: "beitrag_fussball", legende: "Beitrag Fußballabteilung", inhalt: fussball, radio: true })}
        </div>
        <div data-wenn="karneval" hidden>
        ${gruppe({ name: "beitrag_karneval", legende: "Beitrag Karnevalabteilung", inhalt: karneval, radio: true })}
        </div>
        <div class="hinweis hinweis--info" data-wenn="azubi" hidden>
          <p>Bitte den Ausbildungs- oder Studiennachweis mit dem Antrag an die Geschäftsstelle schicken.</p>
        </div>
        <div class="hinweis hinweis--info" data-wenn="doppel" hidden>
          <p>${escapeHtml(b.doppelmitgliedschaft ?? "")}</p>
        </div>
        <p class="antrag__hinweis">Dazu kommt einmalig die Aufnahmegebühr von ${euro(b.aufnahmegebuehr)}. Fälligkeit und Kündigung: <a href="${PFAD}mitglied-werden/">Mitglied werden</a>.</p>`;
  return schritt("mitgliedschaft", "Mitgliedschaft", inhalt);
}

function schrittPerson() {
  const inhalt = `${feld({ name: "vorname", label: "Vorname", autocomplete: "given-name", maxlength: MAX.vorname })}
        ${feld({ name: "nachname", label: "Nachname", autocomplete: "family-name", maxlength: MAX.nachname })}
        ${datumFelder("geb", "Geburtsdatum", "bday")}
        <div class="hinweis hinweis--offen" data-wenn="beitrag-alter" hidden>
          <p><span data-text="beitrag-hinweis"></span> Den Beitrag können Sie im ersten Schritt ändern (mit „Zurück“).</p>
        </div>
        <div class="hinweis hinweis--info" data-wenn="minderjaehrig" hidden>
          <p>Das neue Mitglied ist unter 18. Den Antrag unterschreibt deshalb eine erziehungsberechtigte Person – ihren Namen tragen Sie im nächsten Schritt ein.</p>
        </div>
        ${feld({ name: "strasse", label: "Straße und Hausnummer", autocomplete: "address-line1", maxlength: MAX.strasse })}
        <div class="antrag__zeile">
          ${feld({ name: "plz", label: "Postleitzahl", autocomplete: "postal-code", inputmode: "numeric", maxlength: 5, klasse: "antrag__plz" })}
          ${feld({ name: "ort", label: "Wohnort", autocomplete: "address-level2", maxlength: MAX.ort })}
        </div>`;
  return schritt("person", "Neues Mitglied", inhalt);
}

function schrittKontakt() {
  const inhalt = `<fieldset class="antrag__gruppe" data-wenn="minderjaehrig" hidden aria-describedby="a-eb-hinweis">
          <legend>Erziehungsberechtigte Person</legend>
          <p class="antrag__hinweis" id="a-eb-hinweis">Sie unterschreibt den Antrag und die Einwilligung zu Fotos.</p>
          ${feld({ name: "eb_vorname", label: "Vorname", autocomplete: "given-name", maxlength: MAX.vorname })}
          ${feld({ name: "eb_nachname", label: "Nachname", autocomplete: "family-name", maxlength: MAX.nachname })}
        </fieldset>
        <p class="antrag__hinweis" data-wenn="minderjaehrig" hidden>Bei Kindern und Jugendlichen bitte die Kontaktdaten der Eltern eintragen.</p>
        ${feld({ name: "email", label: "E-Mail", typ: "email", autocomplete: "email", maxlength: MAX.email, zusatz: 'spellcheck="false" autocapitalize="off"' })}
        <fieldset class="antrag__gruppe" data-feld="telefon_gruppe" aria-describedby="a-telefon_gruppe-hinweis">
          <legend>Telefon</legend>
          <p class="antrag__hinweis" id="a-telefon_gruppe-hinweis">Mindestens eine Nummer – für Rückfragen der Geschäftsstelle und des Trainerteams.</p>
          <p class="formular__fehler" id="a-telefon_gruppe-fehler" hidden></p>
          ${feld({ name: "mobil", label: "Mobil", typ: "tel", autocomplete: "tel", maxlength: MAX.telefon, pflicht: false })}
          ${feld({ name: "telefon", label: "Festnetz", typ: "tel", autocomplete: "off", maxlength: MAX.telefon, pflicht: false })}
        </fieldset>`;
  return schritt("kontakt", "Kontakt", inhalt);
}

// Familienmitglieder: Einträge entstehen im Skript aus der <template>
// (bis zu sechs, so viele passen auf Seite 2 des Formulars, siehe
// s2.familie in data/aufnahmeantrag-felder.json).
function familienEintragVorlage() {
  return `<template id="antrag-familie-vorlage">
        <fieldset class="antrag__gruppe antrag__familie-eintrag" data-familie-eintrag>
          <legend>Familienmitglied <span data-familie-nummer>1</span></legend>
          ${feld({ name: "fam_vorname___N__", label: "Vorname", autocomplete: "off", maxlength: MAX.vorname })}
          ${feld({ name: "fam_nachname___N__", label: "Nachname", autocomplete: "off", maxlength: MAX.nachname })}
          ${datumFelder("fam_geb___N__", "Geburtsdatum", null)}
          <p><button type="button" class="knopf knopf--sekundaer antrag__entfernen" data-familie-entfernen><span>Familienmitglied <span data-familie-nummer>1</span> entfernen</span></button></p>
        </fieldset>
      </template>`;
}

function schrittFamilie() {
  const inhalt = `<p>Der Familienbeitrag gilt für die ganze Familie. Bitte tragen Sie die weiteren Familienmitglieder ein, die darüber Mitglied werden – bis zu sechs.</p>
        <div data-feld="familie">
          <p class="formular__fehler" id="a-familie-fehler" hidden></p>
          <div class="antrag__familie-liste" data-familie-liste></div>
        </div>
        <p><button type="button" class="knopf knopf--sekundaer" data-familie-hinzu>Weiteres Familienmitglied hinzufügen</button></p>
        <p class="antrag__hinweis" data-familie-voll hidden>Mehr als sechs Familienmitglieder passen nicht auf das Formular – bitte melden Sie sich dafür bei der Geschäftsstelle.</p>`;
  return schritt("familie", "Familienmitglieder", inhalt);
}

function schrittEinwilligungen(daten) {
  const satzung = downloadEintrag(daten, "Satzung");
  const satzungLink = satzung
    ? `<p class="antrag__hinweis"><a href="${escapeHtml(satzung.datei)}" target="_blank" rel="noopener">Satzung lesen (PDF, öffnet in neuem Fenster)</a></p>`
    : "";
  const medien = [
    auswahl({ typ: "checkbox", name: "medien_intern", label: "Vereinsinterne Publikationen (z. B. Rundbriefe, Aushänge, Mitgliederzeitungen)" }),
    auswahl({ typ: "checkbox", name: "medien_web", label: "Vereinswebsite, Social-Media-Kanäle und Vereins-App" }),
    auswahl({ typ: "checkbox", name: "medien_presse", label: "Lokale Presseberichte über Vereinsaktivitäten" }),
    auswahl({ typ: "checkbox", name: "medien_dokumentation", label: "Dokumentationen von Vereinsveranstaltungen (z. B. Chroniken, Jubiläumshefte)" }),
  ].join("\n          ");
  const inhalt = `${gruppe({
          name: "satzung_gruppe",
          legende: "Satzung",
          inhalt: auswahl({
            typ: "checkbox",
            name: "satzung",
            label: "Ich habe die Satzung des Vereins zur Kenntnis genommen, insbesondere, dass die Abmeldung nur mit Wirkung zum Ende eines Kalenderjahres per Einschreiben an die Postanschrift des Vereins möglich ist.",
            pflicht: true,
          }),
        })}
        ${satzungLink}
        ${gruppe({
          name: "fotos",
          legende: "Fotos und Namen veröffentlichen?",
          hinweis: `Darf der Verein im Rahmen seiner satzungsgemäßen Aufgaben Fotos, Videoaufnahmen und den Namen <span data-text="mitglied-dativ">des neuen Mitglieds</span> veröffentlichen? Die Einwilligung ist freiwillig und kann jederzeit mit Wirkung für die Zukunft widerrufen werden, schriftlich oder per E-Mail.`,
          inhalt: [
            auswahl({ typ: "radio", name: "fotos", wert: "ja", label: "Ja, ich willige in die Veröffentlichung ein." }),
            auswahl({ typ: "radio", name: "fotos", wert: "nein", label: "Nein, ich willige nicht ein." }),
          ].join("\n          "),
          radio: true,
        })}
        <div data-wenn="fotos-ja" hidden>
        ${gruppe({ name: "medien", legende: "In welchen Medien?", hinweis: "Bitte mindestens eines auswählen.", inhalt: medien })}
        </div>
        <p class="antrag__hinweis">Nach einem Widerruf werden keine weiteren Veröffentlichungen vorgenommen; bereits veröffentlichte Inhalte bleiben bestehen, soweit eine Löschung nicht möglich oder unzumutbar ist. Grundlage ist Art. 6 Abs. 1 lit. a DSGVO.</p>`;
  return schritt("einwilligungen", "Satzung und Fotos", inhalt);
}

function schrittZahlung(daten) {
  const b = daten.beitraege ?? {};
  const inhalt = `${gruppe({
          name: "zahlung",
          legende: "Wie soll der Beitrag bezahlt werden?",
          inhalt: [
            auswahl({ typ: "radio", name: "zahlung", wert: "sepa", label: "Per SEPA-Lastschrift (empfohlen)", meta: "Einzug einmal im Jahr" }),
            auswahl({ typ: "radio", name: "zahlung", wert: "rechnung", label: "Per Rechnung", meta: `${euro(b.zuschlag_ohne_sepa)} Zuschlag im Jahr` }),
          ].join("\n          "),
          radio: true,
        })}
        <div class="hinweis hinweis--info" data-wenn="rechnung" hidden>
          <p>Seite 4 des Formulars (SEPA-Lastschriftmandat) bleibt dann leer. Die Geschäftsstelle schickt eine Rechnung.</p>
        </div>
        <div class="antrag__block" data-wenn="sepa" hidden>
        ${gruppe({
          name: "kontoinhaber",
          legende: "Wer ist Kontoinhaber?",
          inhalt: [
            `<div data-wenn="volljaehrig" hidden>${auswahl({ typ: "radio", name: "kontoinhaber", wert: "mitglied", label: "Das neue Mitglied" })}</div>`,
            `<div data-wenn="minderjaehrig" hidden>${auswahl({ typ: "radio", name: "kontoinhaber", wert: "erziehungsberechtigt", label: '<span data-text="eb-name">Die erziehungsberechtigte Person</span> (erziehungsberechtigt)' })}</div>`,
            auswahl({ typ: "radio", name: "kontoinhaber", wert: "andere", label: "Eine andere Person" }),
          ].join("\n          "),
          radio: true,
        })}
        <fieldset class="antrag__gruppe" data-wenn="konto-andere" hidden>
          <legend>Kontoinhaberin oder Kontoinhaber</legend>
          ${feld({ name: "ki_vorname", label: "Vorname", autocomplete: "off", maxlength: MAX.vorname })}
          ${feld({ name: "ki_nachname", label: "Nachname", autocomplete: "off", maxlength: 38 })}
        </fieldset>
        <div class="antrag__block" data-wenn="konto-fremd" hidden>
          ${gruppe({
            name: "ki_anschrift",
            legende: "Anschrift der Kontoinhaberin oder des Kontoinhabers",
            inhalt: auswahl({ typ: "checkbox", name: "ki_anschrift_gleich", label: "Wie beim neuen Mitglied" }),
          })}
          <div class="antrag__block" data-wenn="ki-anschrift-eigene" hidden>
            ${feld({ name: "ki_strasse", label: "Straße und Hausnummer", autocomplete: "off", maxlength: MAX.strasse })}
            <div class="antrag__zeile">
              ${feld({ name: "ki_plz", label: "Postleitzahl", autocomplete: "off", inputmode: "numeric", maxlength: 5, klasse: "antrag__plz" })}
              ${feld({ name: "ki_ort", label: "Ort", autocomplete: "off", maxlength: MAX.ort })}
            </div>
          </div>
        </div>
        ${feld({
          name: "iban",
          label: "IBAN",
          autocomplete: "off",
          // Platz für Leerzeichen und eine mitkopierte Vorsilbe „IBAN“ – das
          // Skript entfernt beides beim Verlassen des Feldes.
          maxlength: 48,
          hinweis: "Deutsche IBAN: DE und 20 Ziffern. Leerzeichen sind egal.",
          zusatz: 'spellcheck="false" autocapitalize="characters" autocorrect="off"',
        })}
        ${feld({ name: "bic", label: "BIC", autocomplete: "off", maxlength: 24, freiwillig: true, zusatz: 'spellcheck="false" autocapitalize="characters" autocorrect="off"' })}
        ${feld({ name: "kreditinstitut", label: "Kreditinstitut", autocomplete: "off", maxlength: MAX.kreditinstitut, freiwillig: true })}
        <p class="antrag__hinweis">Gläubiger: ${escapeHtml(daten.verein?.name_kurz ?? "FFV Sportfreunde 04")}, Gläubiger-ID ${escapeHtml(b.glaeubiger_id ?? "")}, Mandatsreferenz „${escapeHtml(b.mandatsreferenz ?? "")}“. Der Jahresbeitrag wird im Februar abgebucht, bei Eintritt im laufenden Jahr im Monat nach dem Beitritt. Innerhalb von acht Wochen ab der Belastung können Sie die Erstattung verlangen.</p>
        </div>`;
  return schritt("zahlung", "Beitragszahlung", inhalt);
}

// Wer von Hand unterschreibt, trägt Ort und Datum beim Unterschreiben selbst
// ein – dann entfällt das Ort-Feld, und im PDF bleiben Ort/Datum leer.
function schrittUnterschrift() {
  const inhalt = `<div class="antrag__block" data-wenn="digital">
        ${feld({
          name: "unterschrift_ort",
          label: "Ort",
          autocomplete: "off",
          maxlength: MAX.unterschriftOrt,
          hinweis: 'Steht mit dem heutigen Datum (<span data-text="heute">heute</span>) neben jeder Unterschrift. Auf Seite 3 ist dafür wenig Platz – bitte ohne Zusätze, z. B. „Kelkheim“ statt „Kelkheim (Taunus)“.',
        })}
        ${unterschriftsFeld(
          "antrag",
          '<span data-text="unterschrift-antrag-titel">Unterschrift des neuen Mitglieds</span>',
          '<span data-text="unterschrift-antrag-hinweis">Gilt für den Aufnahmeantrag (Seite 2) und die Einwilligung zu Fotos (Seite 3).</span>',
          "Unterschrift für Antrag und Fotos löschen"
        )}
        </div>
        <div data-wenn="unterschrift-konto" hidden>
        ${unterschriftsFeld(
          "konto",
          '<span data-text="unterschrift-konto-titel">Unterschrift der Kontoinhaberin oder des Kontoinhabers</span>',
          "Gilt für das SEPA-Lastschriftmandat (Seite 4).",
          "Unterschrift für das SEPA-Mandat löschen"
        )}
        </div>
        ${gruppe({
          name: "papier",
          legende: "Lieber von Hand unterschreiben?",
          hinweis: "Dann entsteht das PDF ohne Unterschrift, Ort und Datum. Sie drucken es aus, tragen Ort und Datum ein, unterschreiben auf Papier und geben es ab oder schicken es eingescannt.",
          inhalt: auswahl({ typ: "checkbox", name: "unterschrift_papier", label: "Ich unterschreibe den Ausdruck von Hand." }),
        })}`;
  return schritt("unterschrift", "Unterschreiben", inhalt);
}

function schrittPruefen(daten) {
  const mail = daten.verein?.mail ?? "geschaeftsstelle@sportfreunde04.de";
  const inhalt = `<p>Bitte prüfen Sie Ihre Angaben. Mit „Ändern“ kommen Sie zum jeweiligen Schritt – nichts geht dabei verloren.</p>
        <div class="antrag__zusammenfassung" data-zusammenfassung></div>
        <div class="antrag__ergebnis" data-ergebnis hidden tabindex="-1" aria-labelledby="antrag-ergebnis-titel">
          <h3 id="antrag-ergebnis-titel">Ihr Antrag ist fertig</h3>
          <p><span data-text="datei-name"></span> <span class="meta" data-text="datei-info"></span></p>
          <p class="knopfzeile">
            <button type="button" class="knopf" data-aktion="teilen" hidden>PDF teilen, z. B. per Mail</button>
            <button type="button" class="knopf" data-aktion="herunterladen">PDF herunterladen</button>
            <button type="button" class="knopf knopf--sekundaer" data-aktion="ansehen">PDF ansehen</button>
          </p>
          <p class="antrag__meldung" data-meldung aria-live="polite"></p>
          <h3>So kommt der Antrag zum Verein</h3>
          <ol class="antrag__anleitung">
            <li>Sehen Sie sich das PDF einmal an und speichern Sie es – herunterladen oder am Handy teilen.</li>
            <li>Schreiben Sie eine E-Mail an ${mailLink(mail)} mit dem Betreff „Aufnahmeantrag“. Der Knopf unten bereitet sie vor.</li>
            <li>Hängen Sie das PDF an und senden Sie die E-Mail ab. Die vorbereitete E-Mail enthält den Anhang noch nicht.</li>
          </ol>
          <p class="knopfzeile">
            <a class="knopf knopf--sekundaer" href="${escapeHtml(AUFNAHMEANTRAG_ONLINE_MAILTO)}" data-aktion="mail">E-Mail an die Geschäftsstelle vorbereiten</a>
          </p>
          <div class="hinweis hinweis--info" data-wenn="papier" hidden>
            <p>Sie unterschreiben von Hand: Bitte das PDF ausdrucken, auf Seite 2 und 3 <span data-wenn="sepa" hidden>sowie für das SEPA-Mandat auf Seite 4</span> Ort und Datum eintragen und unterschreiben, dann im Vereinsheim abgeben oder eingescannt per E-Mail schicken.</p>
          </div>
          <div class="hinweis hinweis--info" data-wenn="azubi" hidden>
            <p>Bitte den Ausbildungs- oder Studiennachweis mitschicken.</p>
          </div>
          <p class="antrag__hinweis">Das gespeicherte PDF enthält alle Angaben, auch IBAN und Unterschrift. Es bleibt auf Ihrem Gerät, bis Sie es löschen – nach dem Senden können Sie es löschen.</p>
          <p><button type="button" class="knopf knopf--sekundaer" data-aktion="loeschen">Alle Angaben löschen</button></p>
        </div>`;
  return schritt("pruefen", "Prüfen und PDF erstellen", inhalt);
}

// ---------- Seite ----------

export function seite(daten) {
  const felderDaten = daten["aufnahmeantrag-felder"];
  if (!felderDaten?.felder || !felderDaten?.quelle) {
    throw new Error("aufnahmeantrag.mjs: data/aufnahmeantrag-felder.json fehlt oder ist unvollständig");
  }
  // Die Vorlage muss dieselbe Datei sein, die „Downloads & Anträge“ als
  // Aufnahmeantrag verlinkt – sonst passen die Feldpositionen nicht.
  const antragPdf = downloadEintrag(daten, "Aufnahmeantrag");
  if (!antragPdf || antragPdf.datei !== felderDaten.quelle.url) {
    throw new Error(
      `aufnahmeantrag.mjs: Vorlage in data/aufnahmeantrag-felder.json (${felderDaten.quelle.url}) passt nicht zum Aufnahmeantrag in data/downloads.json (${antragPdf?.datei})`
    );
  }
  for (const schluessel of Object.keys(ZUSAETZE)) {
    if (felderDaten.felder[schluessel]) throw new Error(`aufnahmeantrag.mjs: ${schluessel} steht schon in der Vermessung`);
  }
  // Zeichenbreiten für die Längenprüfung (npm run antrag-bibliotheken).
  const breitenDaten = daten["aufnahmeantrag-schriftbreiten"];
  if (!breitenDaten?.breiten || !breitenDaten?.ersatz) {
    throw new Error("aufnahmeantrag.mjs: data/aufnahmeantrag-schriftbreiten.json fehlt – npm run antrag-bibliotheken");
  }

  const konfiguration = {
    vorlage: felderDaten.quelle,
    vorgaben: felderDaten.vorgaben,
    felder: { ...felderDaten.felder, ...ZUSAETZE },
    schriftbreiten: { breiten: breitenDaten.breiten, ersatz: breitenDaten.ersatz },
    versand: VERSAND,
    verein: daten.verein?.name_kurz ?? "FFV Sportfreunde 04",
    mail: daten.verein?.mail ?? "geschaeftsstelle@sportfreunde04.de",
  };

  const pdfLink = `<a href="${escapeHtml(antragPdf.datei)}" target="_blank" rel="noopener">Aufnahmeantrag als PDF</a>`;

  // Sprungmarke auf den Datenschutz-Abschnitt zum Online-Aufnahmeantrag
  // (datenschutz.mjs nummeriert die Abschnitte als #abschnitt-<n>).
  const dsIndex = (daten.datenschutz?.abschnitte ?? []).findIndex((a) => (a.titel ?? "").includes("Online-Aufnahmeantrag"));
  const datenschutzHref = `${PFAD}datenschutz/${dsIndex === -1 ? "" : `#abschnitt-${dsIndex + 1}`}`;

  const inhalt = `<section class="abschnitt seitenkopf">
  <div class="container">
    ${ruecklink(`${PFAD}mitglied-werden/`, "Mitglied werden")}
    <h1>Aufnahmeantrag online</h1>
    <p class="seitenkopf__lead">Ausfüllen, am Bildschirm unterschreiben – daraus entsteht der vollständige Aufnahmeantrag des Vereins als PDF. Den schicken Sie per E-Mail an die Geschäftsstelle.</p>
  </div>
</section>
<section class="abschnitt">
  <div class="container">
    <div class="antrag" data-nur-app hidden>
      <p>In der Vereins-App gibt es dafür das App-Formular.</p>
      <p class="knopfzeile"><a class="knopf" href="${escapeHtml(APPACK_FORMULAR_URL)}" target="_blank" rel="noopener">Aufnahmeantrag in der App ausfüllen</a></p>
    </div>
    <div class="antrag fluss" id="antrag" data-nur-web
      data-pdf-lib="../assets/js/antrag/aufnahmeantrag-pdf-lib.js"
      data-fontkit="../assets/js/antrag/aufnahmeantrag-fontkit.js"
      data-schrift="../assets/fonts/liberation-sans-regular.ttf">
      <div class="hinweis hinweis--info antrag__einleitung">
        <p><strong>Etwa 10 Minuten.</strong> Für die Lastschrift brauchen Sie die IBAN. Ihre Angaben bleiben auf diesem Gerät: Das PDF entsteht in Ihrem Browser, der Verein erhält den Antrag erst, wenn Sie ihn selbst senden (<a href="${datenschutzHref}">Datenschutz</a>).</p>
      </div>
      <div class="hinweis hinweis--offen antrag__stoerung" data-stoerung tabindex="-1" hidden>
        <p><strong data-text="stoerung-titel"></strong> <span data-text="stoerung"></span></p>
        <p>Den ${pdfLink} können Sie ausdrucken, ausfüllen und unterschreiben – und im Vereinsheim abgeben oder <a href="${escapeHtml(AUFNAHMEANTRAG_MAILTO)}">per E-Mail senden</a>.</p>
      </div>
      <div class="antrag__ohne-skript" data-ohne-skript>
        <p>Das Online-Formular braucht JavaScript. Alternativ können Sie den ${pdfLink} herunterladen, ausdrucken, ausfüllen und unterschreiben – und ihn im Vereinsheim abgeben oder <a href="${escapeHtml(AUFNAHMEANTRAG_MAILTO)}">per E-Mail senden</a>.</p>
      </div>
      <form class="formular antrag__formular" id="antrag-formular" novalidate hidden>
        <div class="antrag__stand" aria-hidden="true">
          <p class="antrag__stand-text"><span data-text="schritt-nummer">Schritt 1 von 8</span></p>
          <div class="antrag__balken"><span data-balken></span></div>
        </div>
        <div class="antrag__fehlerliste" data-fehlerliste role="group" aria-labelledby="antrag-fehler-titel" tabindex="-1" hidden>
          <p class="antrag__fehlerliste-titel" id="antrag-fehler-titel" data-text="fehler-titel">Bitte prüfen Sie diese Angaben:</p>
          <ul data-fehler-eintraege></ul>
        </div>
      ${schrittMitgliedschaft(daten)}
      ${schrittPerson()}
      ${schrittKontakt()}
      ${schrittFamilie()}
      ${schrittEinwilligungen(daten)}
      ${schrittZahlung(daten)}
      ${schrittUnterschrift()}
      ${schrittPruefen(daten)}
        <p class="antrag__arbeitet" data-arbeitet aria-live="polite" hidden></p>
        <div class="antrag__navigation">
          <button type="button" class="knopf knopf--sekundaer" data-zurueck hidden>Zurück</button>
          <button type="submit" class="knopf" data-weiter>Weiter</button>
        </div>
      </form>
      ${familienEintragVorlage()}
      <p class="antrag__hinweis antrag__alternative">Lieber auf Papier? ${pdfLink} (zum Ausdrucken).</p>
    </div>
  </div>
</section>
<script type="application/json" id="antrag-konfiguration">${jsonImSkript(konfiguration)}</script>
<script src="${PFAD}assets/js/antrag/aufnahmeantrag.js" defer></script>`;

  return {
    url: "/aufnahmeantrag/",
    // App-Modus (?app=1): Formular aus, Hinweis auf das App-Formular an
    // (data-nur-web/data-nur-app), siehe APP_MODUS_SKRIPT in hilfen.mjs.
    kopfZusatz: APP_MODUS_SKRIPT,
    title: "Aufnahmeantrag online",
    description:
      "Aufnahmeantrag des FFV Sportfreunde 04 online ausfüllen und unterschreiben: Daraus entsteht das Vereins-PDF für die E-Mail an die Geschäftsstelle.",
    inhalt,
    bodyclass: "aufnahmeantrag",
  };
}
