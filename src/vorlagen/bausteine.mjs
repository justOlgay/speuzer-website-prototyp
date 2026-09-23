// Gemeinsame Bausteine für mehrere Inhaltsseiten (P15) – ursprünglich lokal in
// src/seiten/index.mjs (Startseite, dort gelöscht: sie entfällt im
// appack-Rahmen, die Hülle kommt in P16 als docs/index.html). Beide Funktionen
// 1:1 aus src/seiten/index.mjs übernommen, statt der dortigen Konstante PFAD
// nehmen sie jetzt den Parameter `pfad` entgegen (siehe pfadZurWurzel() in
// tools/build.mjs). probetrainingAbschnitt() wird zusätzlich von
// src/seiten/mannschaften/index.mjs verwendet.
//
// W10, Entscheidung C (w10-gemeinsam.md, bestätigt durch quervergleich Nr. 2):
// trainingszeitenAbschnitt() (Tabelle "Trainingszeiten") ist hier entfallen –
// die einzige Aufrufstelle war die Mannschaften-Übersicht, die die
// Trainingstage jetzt direkt in den Teamkarten zeigt (teamKarte() in
// src/seiten/mannschaften/index.mjs) statt in einer zweiten, doppelten Liste.

import { PROBETRAINING_MAILTO, initialen, eMailSchreibenLink } from "./hilfen.mjs";
import { bild } from "./bild.mjs";

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// ---------- Probetraining (ursprünglich Startseite D5, P2) ----------
// W8-Korrektur: gemeinsamer Baustein, überall gleich (Mannschaften, Mitglied
// werden, Geschäftsstelle & Anfahrt).
// W9-A, w9-a.md: Überschrift jetzt "Probetraining" (nicht mehr wortgleich mit
// dem Knopf "Probetraining vereinbaren" darunter, siehe Prüfbefund
// web-390-mannschaften Nr. 36/web-1440-mannschaften Nr. 25). Schritt 1 nennt
// zusätzlich das Trainerteam der Herren als Ansprechpartner (die Herren
// stehen auf derselben Seite /mannschaften/, haben aber keine Jugendleitung).
// W9-A-Nachprüfung (mannschaften-390-05.png): `herrenMailtoHref` (von
// index.mjs übergeben, aus team.mail der Herren in data/teams.json) ergänzt
// einen eigenen Mailto-Link dafür, der Standard-Knopf erreicht sonst immer
// nur die Jugendleitung.
// W10, Entscheidung D (w10-gemeinsam.md, bestätigt durch web-1440-mannschaften
// Nr. 6/web-390-mannschaften Nr. 13): die Herren standen bisher doppelt
// (Satz in Schritt 1 UND eigener Link darunter), der Hauptfall
// (Jugendleitung) hatte keinen eigenen Link, und der Knopf "Probetraining
// vereinbaren" sagte nicht, an wen er geht. Jetzt: Schritt 1 kurz (nur
// Jugendleitung), Hauptknopf "E-Mail an die Jugendleitung" (das Ziel steht
// jetzt im Knopftext selbst), Textlink für die Herren direkt darunter statt
// in Schritt 1 – keine doppelte Nennung mehr.
export function probetrainingAbschnitt(pfad, herrenMailtoHref = "") {
  // W10-Nachprüfung (offen Nr. 9, zoom/herrenlink-390.png): "Herren ›" brach
  // auf dem Handy als eigene zweite Zeile ab dem Wort "Herren" ab – Wort und
  // Pfeil jetzt mit geschützten Leerzeichen zusammengehalten.
  const herrenLink = herrenMailtoHref
    ? `<p class="meta"><a class="probetraining-herrenlink" href="${escapeHtml(herrenMailtoHref)}">Für die Herren: E-Mail an das Trainerteam der&nbsp;Herren&nbsp;›</a></p>`
    : "";
  return `<section class="abschnitt--hell abschnitt">
  <div class="container fluss">
    <h2>Probetraining</h2>
    <ol class="schritte">
      <li><p>E-Mail an die Jugendleitung (Jahrgang, Vorerfahrung)</p></li>
      <li><p>Probetraining beim Team</p></li>
      <li><p>Aufnahmeantrag stellen</p></li>
    </ol>
    <p class="knopfzeile">
      <a class="knopf" href="${escapeHtml(PROBETRAINING_MAILTO)}">E-Mail an die Jugendleitung</a>
    </p>
    ${herrenLink}
  </div>
</section>`;
}

// ---------- Personen-Karte (W8) ----------
// Gemeinsamer Baustein für Vorstand, Karnevalabteilung und die
// Kinderschutz-Person auf "Über uns" – vorher drei fast identische, lokal
// duplizierte personKarte()-Funktionen in den jeweiligen Seiten. Mit Foto:
// echtes Bild (bild()). Ohne Foto: Initialen-Kreis wie bei den
// Trainerporträts (siehe initialen()/.person-mini__bild--platzhalter in
// hilfen.mjs/komponenten.css) statt des früheren großen Wappen-Platzhalters
// (Prüfer-Befund: "kein großes Wappen"). E-Mail als Textlink "E-Mail
// schreiben ›" (eMailSchreibenLink()) statt der nackten Adresse.
// `einzeln` (W8): true außerhalb eines Mehrspalten-Rasters (siehe
// .person--einzeln in komponenten.css) – ohne Begrenzung würde die einzige
// Karte in einem Grid mit nur einem Kind auf die volle Containerbreite
// gestreckt (Kinderschutzbeauftragter auf /verein/ueber-uns/).
export function personKarte(person, daten, { pfad, prioritaet = false, einzeln = false } = {}) {
  const bildHtml = person?.foto
    ? bild({
        pfad,
        daten,
        name: person.foto.quelle,
        alt: person.name ? `Porträt ${person.name}` : "",
        sizes: "(min-width: 640px) 260px, 50vw",
        klasse: "person__bild",
        prioritaet,
      })
    : `<span class="person__bild person__bild--initialen" aria-hidden="true">${escapeHtml(initialen(person?.name))}</span>`;
  const mailHtml = person?.mail ? `<p class="person__mail">${eMailSchreibenLink(person.mail)}</p>` : "";
  const klasse = einzeln ? "person person--einzeln" : "person";

  return `<div class="${klasse}">
      ${bildHtml}
      <p class="person__name">${escapeHtml(person?.name ?? "")}</p>
      <p class="person__funktion">${escapeHtml(person?.funktion ?? "")}</p>
      ${mailHtml}
    </div>`;
}

// Unbesetztes Amt als Textzeile statt Karte (W8, z. B. Schriftführung im
// Geschäftsführenden Vorstand) – kein leerer Kartenkörper mit
// Initialen-Platzhalter für eine Person, die es nicht gibt, stattdessen ein
// Satz mit Link auf "Mach mit".
export function unbesetztZeile(bezeichnung, pfad) {
  return `<p class="meta">${escapeHtml(bezeichnung)}: derzeit nicht besetzt – Interesse? <a href="${pfad}verein/mach-mit/">Mach mit ›</a></p>`;
}

// ---------- Download-Zeile (W8) ----------
// Gemeinsamer Baustein für eine PDF-Zeile wie auf /verein/downloads/: Titel
// als Link, darunter Meta "PDF · Seiten · KB" (fehlende Werte weggelassen).
// Vorher fast identisch dreifach lokal definiert (downloads.mjs,
// mitglied-werden.mjs, ueber-uns.mjs). `kurzTitel` überschreibt optional den
// angezeigten Linktext (z. B. gekürzte Beschriftungen), der volle Titel aus
// data/downloads.json bleibt beim href/Dateibezug maßgeblich. W3, Abschnitt
// 7: alle PDF-Links öffnen in einem neuen Fenster (target="_blank"
// rel="noopener"), unabhängig davon, ob intern oder auf cdn.appack.de.
export function downloadZeile(eintrag, pfad, kurzTitel) {
  if (!eintrag) return "";
  const istIntern = (eintrag.datei ?? "").startsWith("/");
  const href = istIntern ? pfad + eintrag.datei.replace(/^\//, "") : eintrag.datei;

  const teile = ["PDF"];
  if (eintrag.seiten) teile.push(`${eintrag.seiten} ${eintrag.seiten === 1 ? "Seite" : "Seiten"}`);
  if (eintrag.kb) {
    const groesse = eintrag.kb >= 1000 ? `${(eintrag.kb / 1000).toFixed(1).replace(".", ",")} MB` : `${eintrag.kb} KB`;
    teile.push(groesse);
  }

  return `<li class="download">
      <a href="${escapeHtml(href)}" target="_blank" rel="noopener">${escapeHtml(kurzTitel ?? eintrag.titel)}</a>
      <span class="meta">${escapeHtml(teile.join(" · "))}</span>
    </li>`;
}
