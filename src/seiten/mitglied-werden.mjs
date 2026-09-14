// Mitglied werden /mitglied-werden/ (P7) – Beiträge, Ablauf, Unterlagen und
// ein Formularentwurf für den Aufnahmeantrag. Das Formular ist ein reiner
// Entwurf: es sendet nichts, speichert nichts, setzt keine Cookies (siehe
// assets/js/formular.js).

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

// Download-Eintrag per Titel-Teilstring finden (data/downloads.json), wie in
// src/seiten/verein/index.mjs.
function downloadEintrag(daten, titelTeil) {
  return (daten.downloads ?? []).find((d) => (d.titel ?? "").includes(titelTeil));
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
      <table>
        <thead>
          <tr>
            <th>Beitragsgruppe</th>
            <th class="zahl">monatlich</th>
            <th class="zahl">jährlich</th>
          </tr>
        </thead>
        <tbody>
        ${zeilen}
        </tbody>
      </table>
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
        <span class="karte__titel">Karnevalabteilung „Die Schnauzer“</span>
        ${beitragsTabelle(beitraege.karneval)}
      </div>
    </div>`;

  const hinweise = `<div class="raster raster--3">
      <div class="hinweis hinweis--info">
        <p style="margin:0;">Aufnahmegebühr: einmalig ${escapeHtml(String(beitraege.aufnahmegebuehr ?? ""))} €, wird mit dem ersten Beitrag eingezogen.</p>
      </div>
      <div class="hinweis hinweis--info">
        <p style="margin:0;">Ohne SEPA-Lastschrift: ${escapeHtml(String(beitraege.zuschlag_ohne_sepa ?? ""))} € zusätzlich pro Jahr.</p>
      </div>
      <div class="hinweis hinweis--info">
        <p style="margin:0;">Fälligkeit: ${escapeHtml(beitraege.faelligkeit ?? "")}</p>
      </div>
    </div>`;

  return `<section class="abschnitt">
  <div class="container fluss">
    <h2>Beiträge</h2>
    ${karten}
    ${hinweise}
    <p class="meta">Kündigung: ${escapeHtml(mitSchlusspunkt(beitraege.kuendigung))} · Doppelmitgliedschaft: ${escapeHtml(mitSchlusspunkt(beitraege.doppelmitgliedschaft))} · Quelle: ${escapeHtml(mitSchlusspunkt(beitraege.quelle))}</p>
    <p class="knopfzeile">
      ${downloadKnopf(beitragsuebersicht, "Beitragsübersicht (PDF)")}
    </p>
  </div>
</section>`;
}

// ---------- So wird man Mitglied ----------

function ablaufAbschnitt(daten) {
  const unterlagen = daten.unterlagen ?? {};
  const beitraege = daten.beitraege ?? {};

  return `<section class="abschnitt--hell abschnitt">
  <div class="container fluss">
    <h2>So wird man Mitglied</h2>
    <ol class="schritte">
      <li><p>Probetraining: ${escapeHtml(unterlagen.probetraining ?? "")} <a href="${escapeHtml(PROBETRAINING_MAILTO)}">Probetraining vereinbaren</a></p></li>
      <li><p>Aufnahmeantrag ausfüllen – als PDF ausdrucken oder unten den Online-Entwurf nutzen.</p></li>
      <li><p>Unterlagen abgeben: im Vereinsheim oder beim Trainerteam. Was dazugehört, steht unten.</p></li>
      <li><p>Spielerpass: Der Verein beantragt die Spielerlaubnis beim HFV. ${escapeHtml(beitraege.eintritt ?? "")}</p></li>
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

function unterlagenAbschnitt(daten) {
  const unterlagen = daten.unterlagen ?? {};
  const anmeldungDownloads = (daten.downloads ?? []).filter((d) => d.gruppe === "Anmeldung");
  const satzung = downloadEintrag(daten, "Satzung");

  // Gekürzte Beschriftungen laut Plan, zugeordnet über den exakten Titel aus
  // data/downloads.json (keine erfundenen Titel).
  const ANMELDUNG_TITEL_KURZ = {
    "Aufnahmeantrag / Vereinsanmeldung (Stand 9/2026)": "Aufnahmeantrag (PDF)",
    "Info-Blatt zur Anmeldung": "Info-Blatt (PDF)",
    "Wichtige Unterlagen, die mitzubringen sind": "Wichtige Unterlagen (PDF)",
    "Zusatzerklärung für Spieler zwischen 12 und 18 Jahren ohne deutsche Staatsbürgerschaft": "Zusatzerklärung 12–18 (PDF)",
  };

  const karten = `<div class="raster raster--3">
      ${unterlagenKarte("Neuanmeldung", unterlagen.neuanmeldung)}
      ${unterlagenKarte("Vereinswechsel", unterlagen.vereinswechsel)}
      ${unterlagenKarte(
        "Ohne deutsche Staatsangehörigkeit (zusätzlich)",
        unterlagen.ohne_deutsche_staatsangehoerigkeit,
        `<p class="meta">${escapeHtml(unterlagen.hinweis_ausland ?? "")}</p>`
      )}
    </div>`;

  const knoepfe = [
    ...anmeldungDownloads.map((d) => downloadKnopf(d, ANMELDUNG_TITEL_KURZ[d.titel] ?? d.titel)),
    downloadKnopf(satzung, "Satzung (PDF)"),
  ].join("\n      ");

  return `<section class="abschnitt">
  <div class="container fluss">
    <h2>Unterlagen</h2>
    ${karten}
    <p class="knopfzeile">
      ${knoepfe}
    </p>
  </div>
</section>`;
}

// ---------- Aufnahmeantrag online – Entwurf ----------

// Text-/Zahlenfeld mit Label, optionalem Pflicht-Stern und einer (per
// assets/js/formular.js befüllten) Fehlerzeile darunter.
function textFeld({ id, label, type = "text", required = false, pattern, inputmode, maxlength, autocomplete, hinweis }) {
  const attrTeile = [
    `type="${type}"`,
    `id="${id}"`,
    `name="${id}"`,
    required ? "required" : null,
    pattern ? `pattern="${pattern}"` : null,
    inputmode ? `inputmode="${inputmode}"` : null,
    maxlength ? `maxlength="${maxlength}"` : null,
    autocomplete !== undefined ? `autocomplete="${autocomplete}"` : null,
    `aria-describedby="${id}-fehler"`,
  ]
    .filter(Boolean)
    .join(" ");

  const pflichtHtml = required ? ` <span class="formular__pflicht">*</span>` : "";
  const hinweisHtml = hinweis ? `<p class="meta">${escapeHtml(hinweis)}</p>` : "";

  return `<div class="formular__feld">
        <label for="${id}">${escapeHtml(label)}${pflichtHtml}</label>
        <input ${attrTeile}>
        ${hinweisHtml}
        <p class="formular__fehler" id="${id}-fehler" hidden></p>
      </div>`;
}

// Einzelne Pflicht-/Freiwilligkeits-Checkbox mit eigener Fehlerzeile.
// labelHtml wird nicht escaped (kann z. B. das Sternchen-Span enthalten).
// P8-Korrektur A2: .formular__checkzeile ist jetzt selbst das <label> (statt
// eines <div> mit separatem <label for>) – Eingabe und Text liegen darin,
// das <label> ist damit die ganze, mindestens 44px hohe Zeile und zugleich
// das Tippziel, obwohl der sichtbare Kasten selbst nur noch 24×24px groß ist
// (siehe komponenten.css).
function checkboxFeld({ id, labelHtml, required = false, meta }) {
  const pflichtHtml = required ? ` <span class="formular__pflicht">*</span>` : "";
  const metaHtml = meta ? `<p class="meta">${escapeHtml(meta)}</p>` : "";

  return `<div class="formular__checkzeile-block">
      <label class="formular__checkzeile">
        <input type="checkbox" id="${id}" name="${id}"${required ? " required" : ""} aria-describedby="${id}-fehler">
        <span>${labelHtml}${pflichtHtml}</span>
      </label>
      ${metaHtml}
      <p class="formular__fehler" id="${id}-fehler" hidden></p>
    </div>`;
}

// Wie checkboxFeld(), aber die Beschriftung steht in einem <p> mit
// aria-labelledby statt in <label for>: Sie enthält einen Link (auf die
// Satzung), und ein Link innerhalb eines <label> wäre vom Tippziel-Gate in
// tools/pruefen.mjs nicht ausgenommen (das gilt nur für Links in <p>/<li>) –
// als Fließtext-Link in einem <p> dagegen schon.
function checkboxFeldMitLink({ id, textHtml, required = false }) {
  const pflichtHtml = required ? ` <span class="formular__pflicht">*</span>` : "";
  return `<div class="formular__checkzeile-block">
      <div class="formular__checkzeile">
        <input type="checkbox" id="${id}" name="${id}"${required ? " required" : ""} aria-describedby="${id}-fehler" aria-labelledby="${id}-text">
        <p id="${id}-text">${textHtml}${pflichtHtml}</p>
      </div>
      <p class="formular__fehler" id="${id}-fehler" hidden></p>
    </div>`;
}

function formularAbschnitt(daten) {
  const beitraege = daten.beitraege ?? {};
  const satzung = downloadEintrag(daten, "Satzung");
  const satzungHref = satzung ? escapeHtml(satzung.datei) : "#";

  const beitragsgruppenOptionen = (beitraege.fussball ?? [])
    .map(
      (g) =>
        `<option value="${escapeHtml(g.gruppe)}">${escapeHtml(g.gruppe)} – ${escapeHtml(String(g.monat))} € monatlich</option>`
    )
    .join("\n          ");

  const mandatstext = `Ich ermächtige den Frankfurter Fußballverein Sportfreunde 1904 e.V. (Gläubiger-ID ${escapeHtml(beitraege.glaeubiger_id ?? "")}, Mandatsreferenz „${escapeHtml(beitraege.mandatsreferenz ?? "")}“), Zahlungen von meinem Konto mittels Lastschrift einzuziehen. Zugleich weise ich mein Kreditinstitut an, die vom Verein auf mein Konto gezogenen Lastschriften einzulösen. Ich kann innerhalb von acht Wochen, beginnend mit dem Belastungsdatum, die Erstattung des belasteten Betrages verlangen. Es gelten dabei die mit meinem Kreditinstitut vereinbarten Bedingungen.`;

  return `<section class="abschnitt--hell abschnitt">
  <div class="container fluss">
    <h2>Aufnahmeantrag online – Entwurf</h2>
    <div class="hinweis hinweis--info">
      <p style="margin:0;">Dieses Formular ist ein Entwurf für den neuen Webauftritt. Im Prototyp wird nichts gesendet und nichts gespeichert. Der gültige Weg ist der Aufnahmeantrag als PDF.</p>
    </div>

    <form class="formular inhalt" novalidate>
      <p class="meta">* Pflichtfeld</p>

      <fieldset>
        <legend>Mitgliedschaft</legend>
        <div class="formular__checkgruppe">
          <label class="formular__checkzeile">
            <input type="checkbox" id="mw-abt-fussball" name="abteilung-fussball" aria-describedby="mw-abteilung-fehler">
            <span>Fußballabteilung</span>
          </label>
          <label class="formular__checkzeile">
            <input type="checkbox" id="mw-abt-karneval" name="abteilung-karneval" aria-describedby="mw-abteilung-fehler">
            <span>Karnevalabteilung</span>
          </label>
          <p class="formular__fehler" id="mw-abteilung-fehler" hidden>Bitte mindestens eine Abteilung wählen.</p>
        </div>
        <div class="formular__feld">
          <label for="mw-beitragsgruppe">Beitragsgruppe</label>
          <select id="mw-beitragsgruppe" name="beitragsgruppe">
            ${beitragsgruppenOptionen}
          </select>
        </div>
      </fieldset>

      <fieldset>
        <legend>Persönliche Angaben</legend>
        ${textFeld({ id: "mw-vorname", label: "Vorname", required: true, autocomplete: "given-name" })}
        ${textFeld({ id: "mw-nachname", label: "Nachname", required: true, autocomplete: "family-name" })}
        ${textFeld({ id: "mw-geburtsdatum", label: "Geburtsdatum", type: "date", required: true, autocomplete: "bday" })}
        ${textFeld({ id: "mw-strasse", label: "Straße und Hausnummer", required: true, autocomplete: "street-address" })}
        ${textFeld({ id: "mw-plz", label: "PLZ", required: true, inputmode: "numeric", pattern: "\\d{5}", maxlength: 5, autocomplete: "postal-code" })}
        ${textFeld({ id: "mw-ort", label: "Ort", required: true, autocomplete: "address-level2" })}
        ${textFeld({ id: "mw-email", label: "E-Mail", type: "email", required: true, autocomplete: "email" })}
        ${textFeld({ id: "mw-telefon", label: "Telefon", type: "tel", autocomplete: "tel", hinweis: "für Rückfragen, freiwillig" })}
      </fieldset>

      <fieldset>
        <legend>Gesetzliche Vertretung (bei Minderjährigen)</legend>
        <p>Bei Kindern und Jugendlichen unter 18 Jahren stellen die Erziehungsberechtigten den Antrag.</p>
        ${textFeld({ id: "mw-vertreter-name", label: "Name der/des Erziehungsberechtigten" })}
        ${textFeld({ id: "mw-vertreter-email", label: "E-Mail", type: "email" })}
        ${checkboxFeld({ id: "mw-volljaehrig", labelHtml: "Ich bin volljährig und zur Anmeldung berechtigt.", required: true })}
      </fieldset>

      <fieldset>
        <legend>Familienbeitrag (optional)</legend>
        <p class="meta">Bei Familienbeitrag bitte die weiteren Familienmitglieder mit Name und Geburtsdatum im PDF-Antrag angeben.</p>
      </fieldset>

      <fieldset>
        <legend>SEPA-Lastschriftmandat</legend>
        ${textFeld({ id: "mw-kontoinhaber", label: "Kontoinhaber/in", required: true, autocomplete: "cc-name" })}
        ${textFeld({ id: "mw-iban", label: "IBAN", required: true, inputmode: "text", pattern: "DE\\d{2}\\s?(\\d{4}\\s?){4}\\d{2}", autocomplete: "off" })}
        ${textFeld({ id: "mw-kreditinstitut", label: "Kreditinstitut", required: true })}
        <p class="meta">${mandatstext}</p>
        ${checkboxFeld({ id: "mw-sepa-mandat", labelHtml: "Ich erteile das SEPA-Lastschriftmandat.", required: true })}
      </fieldset>

      <fieldset>
        <legend>Einwilligungen</legend>
        ${checkboxFeldMitLink({
          id: "mw-einwilligung-satzung",
          // P8, Abschnitt F: "Datenschutzerklärung" ist jetzt ein echter Link
          // auf /datenschutz/ statt reinem Text.
          textHtml: `Ich habe die <a href="${satzungHref}" rel="noopener" target="_blank">Satzung (PDF)</a> und die <a href="${PFAD}datenschutz/">Datenschutzerklärung</a> gelesen und erkenne die Satzung, Ordnungen und Beiträge an.`,
          required: true,
        })}
        ${checkboxFeld({
          id: "mw-einwilligung-fotos",
          labelHtml: "Ich bin damit einverstanden, dass Fotos vom Vereinsleben, auf denen ich bzw. mein Kind zu sehen ist, in Vereinsmedien veröffentlicht werden. Diese Einwilligung ist freiwillig und jederzeit widerrufbar.",
          meta: "Die Foto-Einwilligung steht auch im Aufnahmeantrag (Seite 2).",
        })}
      </fieldset>

      <fieldset>
        <legend>Absenden</legend>
        <p class="knopfzeile">
          <button type="submit" class="knopf knopf--gross">Antrag prüfen</button>
        </p>
        <p class="meta">Der Antrag wird im Prototyp nicht gesendet.</p>
        <div class="hinweis hinweis--info formular__erfolg" role="status" hidden>
          <p style="margin:0;">Danke – im echten Auftritt geht der Antrag jetzt an die Geschäftsstelle. Im Prototyp wurde nichts gesendet.</p>
        </div>
      </fieldset>
    </form>
  </div>
</section>`;
}

// ---------- Abschluss ----------

function abschlussAbschnitt() {
  return `<section class="abschnitt--blau abschnitt abschnitt--eng">
  <div class="container fluss">
    <h2>Fragen zur Mitgliedschaft?</h2>
    <p>Die Geschäftsstelle hilft weiter.</p>
    <p class="knopfzeile">
      <a class="knopf knopf--weiss" href="mailto:geschaeftsstelle@sportfreunde04.de?subject=Mitgliedschaft">E-Mail an die Geschäftsstelle</a>
    </p>
  </div>
</section>`;
}

export function seite(daten) {
  // formular.js gehört nur zu dieser Seite (Validierungsanzeige des
  // Formularentwurfs) – daher hier als Teil von "inhalt" eingebunden statt
  // sitesweit über basis.html/nav.js, das jede Seite lädt.
  const inhalt = [
    seitenkopfAbschnitt(),
    beitraegeAbschnitt(daten),
    ablaufAbschnitt(daten),
    unterlagenAbschnitt(daten),
    formularAbschnitt(daten),
    abschlussAbschnitt(),
    `<script src="${PFAD}assets/js/formular.js" defer></script>`,
  ].join("\n");

  return {
    url: "/mitglied-werden/",
    title: "Mitglied werden",
    description:
      "Mitglied beim FFV Sportfreunde 04 werden: Beiträge für Fußball und Karneval, Ablauf von Probetraining bis Spielerpass, Unterlagen zum Download und der Aufnahmeantrag.",
    inhalt,
  };
}
