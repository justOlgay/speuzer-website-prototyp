// Gemeinsame Bausteine für mehrere Inhaltsseiten (P15) – ursprünglich lokal in
// src/seiten/index.mjs (Startseite, dort gelöscht: sie entfällt im
// appack-Rahmen, die Hülle kommt in P16 als docs/index.html). Beide Funktionen
// 1:1 aus src/seiten/index.mjs übernommen, statt der dortigen Konstante PFAD
// nehmen sie jetzt den Parameter `pfad` entgegen (siehe pfadZurWurzel() in
// tools/build.mjs). trainingszeitenAbschnitt() wird jetzt zusätzlich von
// src/seiten/mannschaften/index.mjs verwendet, ebenso probetrainingAbschnitt().

import { jahrgangText, PROBETRAINING_MAILTO } from "./hilfen.mjs";

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

export function trainingszeitenAbschnitt(daten, pfad) {
  const verein = daten.verein ?? {};
  const zeilen = (daten.teams ?? [])
    .map((team) => {
      const einheiten = (team.training ?? [])
        .map((t) => `<span>${escapeHtml(TAG_KUERZEL[t.tag] ?? t.tag)} ${escapeHtml(t.von)}–${escapeHtml(t.bis)}</span>`)
        .join("\n        ");
      return `<li class="trainingsraster__zeile">
        <a class="trainingsraster__name" href="${pfad}mannschaften/${team.slug}/">${escapeHtml(team.name)}</a>
        <span class="trainingsraster__jahrgang meta">${escapeHtml(jahrgangText(team))}</span>
        <span class="trainingsraster__einheiten">
        ${einheiten}
        </span>
      </li>`;
    })
    .join("\n      ");

  return `<section class="abschnitt--hell abschnitt">
  <div class="container fluss">
    <h2>Trainingszeiten</h2>
    <p class="inhalt">Alle Mannschaften trainieren auf dem Vereinsplatz an der Mainzer Landstraße 480 – nur die Herren auf der Anlage von SW Griesheim am Rebstock.</p>
    <ul class="trainingsraster" role="list">
      <li class="trainingsraster__kopf" aria-hidden="true">
        <span>Mannschaft</span><span>Jahrgang</span><span>Training</span>
      </li>
      ${zeilen}
    </ul>
    <div class="hinweis hinweis--info">
      <p style="margin:0;">${escapeHtml(verein.hinweise?.ferien ?? "")}</p>
    </div>
    <p class="knopfzeile">
      <a class="knopf" href="${pfad}mannschaften/">Zu den Mannschaften</a>
    </p>
  </div>
</section>`;
}

// ---------- Probetraining (ursprünglich Startseite D5, P2) ----------

export function probetrainingAbschnitt(pfad) {
  return `<section class="abschnitt--hell abschnitt">
  <div class="container fluss">
    <h2>Einfach vorbeikommen und mittrainieren</h2>
    <p class="inhalt">Kinder und Jugendliche können ein- oder zweimal ohne Anmeldung mittrainieren. Vorher klären wir, ob in der passenden Mannschaft Platz ist – am einfachsten per E-Mail an die Jugendleitung mit dem Jahrgang des Kindes. Danach ist der Aufnahmeantrag Pflicht.</p>
    <ol class="schritte">
      <li><p>E-Mail an die Jugendleitung mit Jahrgang und Vorerfahrung</p></li>
      <li><p>Termin fürs Probetraining bekommen und ein- bis zweimal mitmachen</p></li>
      <li><p>Aufnahmeantrag ausfüllen – Beiträge und Unterlagen stehen unter „Mitglied werden“</p></li>
    </ol>
    <p class="knopfzeile">
      <a class="knopf" href="${escapeHtml(PROBETRAINING_MAILTO)}">Probetraining vereinbaren</a>
    </p>
  </div>
</section>`;
}
