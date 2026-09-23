// Gemeinsame Bausteine für mehrere Inhaltsseiten (P15) – ursprünglich lokal in
// src/seiten/index.mjs (Startseite, dort gelöscht: sie entfällt im
// appack-Rahmen, die Hülle kommt in P16 als docs/index.html). Beide Funktionen
// 1:1 aus src/seiten/index.mjs übernommen, statt der dortigen Konstante PFAD
// nehmen sie jetzt den Parameter `pfad` entgegen (siehe pfadZurWurzel() in
// tools/build.mjs). trainingszeitenAbschnitt() wird jetzt zusätzlich von
// src/seiten/mannschaften/index.mjs verwendet, ebenso probetrainingAbschnitt().

import { jahrgangText, PROBETRAINING_MAILTO, initialen, eMailSchreibenLink } from "./hilfen.mjs";
import { bild } from "./bild.mjs";

const TAG_KUERZEL = {
  Montag: "Mo",
  Dienstag: "Di",
  Mittwoch: "Mi",
  Donnerstag: "Do",
  Freitag: "Fr",
  Samstag: "Sa",
  Sonntag: "So",
};

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// ---------- Trainingszeiten (ursprünglich Startseite D3, P2-K/K7) ----------

export function trainingszeitenAbschnitt(daten, pfad, mitKnopf = true) {
  const verein = daten.verein ?? {};
  const zeilen = (daten.teams ?? [])
    .map((team) => {
      // quervergleich Nr. 10 (geprüft, W9-A): ausgeschriebene Wochentage
      // ("Montag" statt "Mo", wie auf den Mannschaftsseiten/in der App)
      // wurden versuchsweise eingesetzt, ließen dabei aber "1. Herrenmannschaft"
      // mobil zweizeilig umbrechen ("1." allein in der ersten Zeile) – ein
      // neuer Fehler anstelle des alten. Deshalb bewusst bei der Abkürzung
      // belassen (siehe Abschlussbericht).
      const einheiten = (team.training ?? [])
        .map((t) => `<span>${escapeHtml(TAG_KUERZEL[t.tag] ?? t.tag)} ${escapeHtml(t.von)}–${escapeHtml(t.bis)}</span>`)
        .join("\n        ");
      // W9-A-Nachprüfung (mannschaften-a-jugend-390-04.png): die Herren
      // trugen je nach Liste eine andere Zweitzeile ("–" hier, "Senioren" bei
      // "Weitere Mannschaften" in team.mjs/index.mjs über jahrgangPraefix()).
      // Jetzt überall "Senioren" (jahrgangText() liefert das schon für die
      // Kategorie "Senioren") – ein einziger Ersatzwert für die fehlende
      // Jahrgangsangabe, konsistent mit allen anderen Stellen der Seite.
      const jahrgangSpalte = jahrgangText(team);
      // Nachprüfung web-390 Nr. 24: Name und Jahrgang jetzt EIN Grid-Item
      // ".trainingsraster__team" (Block, oben ausgerichtet) statt zweier
      // über die Grid-Zeilen verteilter Items – siehe .trainingsraster__zeile
      // in komponenten.css für den Hintergrund.
      return `<li class="trainingsraster__zeile">
        <span class="trainingsraster__team">
          <a class="trainingsraster__name" href="${pfad}mannschaften/${team.slug}/">${escapeHtml(team.name)}</a>
          <span class="trainingsraster__jahrgang meta">${escapeHtml(jahrgangSpalte)}</span>
        </span>
        <span class="trainingsraster__einheiten">
        ${einheiten}
        </span>
      </li>`;
    })
    .join("\n      ");

  return `<section class="abschnitt--hell abschnitt">
  <div class="container fluss">
    <h2>Trainingszeiten</h2>
    <p class="inhalt">Alle Mannschaften trainieren auf dem Vereinsplatz an der Mainzer Landstraße 480 – nur die Herren auf der Bezirkssportanlage am Rebstock (SW&nbsp;Griesheim).</p>
    <ul class="trainingsraster" role="list">
      <li class="trainingsraster__kopf" aria-hidden="true">
        <span>Mannschaft</span><span>Jahrgang</span><span>Training</span>
      </li>
      ${zeilen}
    </ul>
    <div class="hinweis hinweis--info" style="max-width:880px;">
      <p style="margin:0;">${escapeHtml(verein.hinweise?.ferien ?? "")}</p>
    </div>
    ${mitKnopf ? `<p class="knopfzeile">
      <a class="knopf" href="${pfad}mannschaften/">Zu den Mannschaften</a>
    </p>` : ""}
  </div>
</section>`;
}

// ---------- Probetraining (ursprünglich Startseite D5, P2) ----------
// W8-Korrektur: gemeinsamer Baustein, überall gleich (Mannschaften, Mitglied
// werden, Geschäftsstelle & Anfahrt).
// W9-A, w9-a.md: Überschrift jetzt "Probetraining" (nicht mehr wortgleich mit
// dem Knopf "Probetraining vereinbaren" darunter, siehe Prüfbefund
// web-390-mannschaften Nr. 36/web-1440-mannschaften Nr. 25). Schritt 1 nennt
// zusätzlich das Trainerteam der Herren als Ansprechpartner (die Herren
// stehen auf derselben Seite /mannschaften/, haben aber keine Jugendleitung).
// W9-A-Nachprüfung (mannschaften-390-05.png): zwei Korrekturen an Schritt 1 –
// (a) der Text nennt zwar das Trainerteam der Herren, der einzige Knopf
// öffnete aber immer eine Mail an die Jugendleitung; `herrenMailtoHref`
// (von index.mjs übergeben, aus team.mail der Herren in data/teams.json)
// ergänzt einen eigenen Link dafür. (b) mit dem jetzt dreizeiligen Text stand
// die große Schrittziffer bei align-items:center (Standard für die
// einzeiligen Schritte 2/3, siehe .schritte li unten in komponenten.css)
// mittig statt auf Höhe der ersten Zeile – ".schritt__inhalt" (schon für
// mehrteilige Schritte vorgesehen, siehe .schritte li:has(.schritt__inhalt)
// in komponenten.css) bringt hier automatisch align-items:flex-start.
export function probetrainingAbschnitt(pfad, herrenMailtoHref = "") {
  const herrenLink = herrenMailtoHref
    ? `<p class="meta"><a href="${escapeHtml(herrenMailtoHref)}">Herren: E-Mail an das Trainerteam ›</a></p>`
    : "";
  return `<section class="abschnitt--hell abschnitt">
  <div class="container fluss">
    <h2>Probetraining</h2>
    <ol class="schritte">
      <li>
        <div class="schritt__inhalt">
          <p>E-Mail an die Jugendleitung (Jahrgang, Vorerfahrung) – für die Herren an das Trainerteam der Herren</p>
          ${herrenLink}
        </div>
      </li>
      <li><p>Probetraining beim Team</p></li>
      <li><p>Aufnahmeantrag stellen</p></li>
    </ol>
    <p class="knopfzeile">
      <a class="knopf" href="${escapeHtml(PROBETRAINING_MAILTO)}">Probetraining vereinbaren</a>
    </p>
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
