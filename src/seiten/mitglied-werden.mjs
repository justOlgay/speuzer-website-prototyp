// Mitglied werden /mitglied-werden/ (P7) – Beiträge, Ablauf, Unterlagen und
// der Aufnahmeantrag. W2: der frühere Formularentwurf (assets/js/formular.js)
// ist ersetzt durch einen Knopf auf das appack-Formular des Vereins
// (speichert in ein Worksheet, Bestätigung per E-Mail an die
// Geschäftsstelle), siehe antragOnlineAbschnitt() unten.

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
    <p class="meta">Kündigung: ${escapeHtml(mitSchlusspunkt(beitraege.kuendigung))} · Doppelmitgliedschaft: ${escapeHtml(mitSchlusspunkt(beitraege.doppelmitgliedschaft))}</p>
    <p class="meta">Beiträge laut Beitragsordnung 2026; verbindlich ist der Aufnahmeantrag.</p>
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
      <li><p>Aufnahmeantrag ausfüllen – online oder als PDF.</p></li>
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

// ---------- Aufnahmeantrag online stellen ----------

// W2: löst den früheren Formularentwurf (assets/js/formular.js) ab – der
// Antrag läuft jetzt über das appack-Formular des Vereins (speichert in ein
// Worksheet, Bestätigung per E-Mail an die Geschäftsstelle). W3, Abschnitt 7:
// öffnet in einem neuen Fenster (target="_blank" rel="noopener") – das
// appack-Formular hat keinen Rückweg –, daneben unverändert der bestehende
// PDF-Knopf für den Aufnahmeantrag.
const APPACK_FORMULAR_URL = "https://appack.de/rest-api/drender/6a903758337cdc97f94f2655";

function antragOnlineAbschnitt(daten) {
  const aufnahmeantrag = downloadEintrag(daten, "Aufnahmeantrag");

  return `<section class="abschnitt--hell abschnitt">
  <div class="container fluss">
    <h2>Aufnahmeantrag online stellen</h2>
    <div class="karte fluss">
      <p>Der Antrag läuft über das Formular des Vereins: Angaben, Abteilung, Beitragsgruppe, SEPA-Mandat und Unterschrift in einem Schritt. Die Geschäftsstelle bestätigt per E-Mail.</p>
      <p class="knopfzeile">
        <a class="knopf knopf--gross" href="${escapeHtml(APPACK_FORMULAR_URL)}" target="_blank" rel="noopener">Antrag online ausfüllen</a>
        ${downloadKnopf(aufnahmeantrag, "Aufnahmeantrag (PDF)")}
      </p>
    </div>
  </div>
</section>`;
}

// ---------- Mach mit (W3b, Prüfer-Befund "wichtig") ----------

// Spezifikation Abschnitt 1: am Ende der Seite auf verein-mach-mit.html
// verweisen, Baustein wie ".zeile" in src/seiten/verein/index.mjs.
function machMitAbschnitt() {
  return `<section class="abschnitt">
  <div class="container fluss">
    <div class="zeilen-liste">
      <a class="zeile" href="${PFAD}verein/mach-mit/">
        <span class="zeile__text">
          <span class="zeile__titel">Mach mit: Trainer, Betreuer, Helfer</span>
          <span class="zeile__untertitel">So kannst du den Verein unterstützen</span>
        </span>
        <svg class="zeile__pfeil" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7"/></svg>
      </a>
    </div>
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
  const inhalt = [
    seitenkopfAbschnitt(),
    beitraegeAbschnitt(daten),
    ablaufAbschnitt(daten),
    unterlagenAbschnitt(daten),
    antragOnlineAbschnitt(daten),
    abschlussAbschnitt(),
    machMitAbschnitt(),
  ].join("\n");

  return {
    url: "/mitglied-werden/",
    title: "Mitglied werden",
    description:
      "Mitglied beim FFV Sportfreunde 04 werden: Beiträge für Fußball und Karneval, Ablauf von Probetraining bis Spielerpass, Unterlagen zum Download und der Aufnahmeantrag.",
    inhalt,
  };
}
