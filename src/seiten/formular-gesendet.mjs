// Bestätigung nach dem Absenden eines appack-Formulars (/formular-gesendet/,
// im Workspace web/formular-gesendet.html). Seit 28.09.2026 Ziel (forwardUrl)
// der Mitgliedsbescheinigung (CMS-Vorlage Mitgliedbescheinigung.tpl, Website
// und App): Die dort vorher eingetragene appack-Seite
// cdn.appack.de/00_Arbeitshilfe/html/Formular-Erfolg.html antwortete mit 403,
// man sah nach dem Absenden eine XML-Fehlermeldung.

import { APP_MODUS_SKRIPT } from "../vorlagen/hilfen.mjs";

// Diese Seite liegt immer unter "/formular-gesendet/" (Tiefe 1), daher "../"
// (siehe pfadZurWurzel() in tools/build.mjs).
const PFAD = "../";

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function seite(daten) {
  const mail = daten.verein?.mail ?? "geschaeftsstelle@sportfreunde04.de";
  const inhalt = `<section class="abschnitt seitenkopf">
  <div class="container">
    <h1>Vielen Dank!</h1>
    <p class="seitenkopf__lead">Ihre Anfrage ist bei der Geschäftsstelle angekommen. Wir melden uns per E-Mail.</p>
  </div>
</section>
<section class="abschnitt">
  <div class="container fluss">
    <p>Bei Fragen erreichen Sie die Geschäftsstelle unter <a href="mailto:${escapeHtml(mail)}">${escapeHtml(mail)}</a>.</p>
    <p class="knopfzeile">
      <a class="knopf knopf--sekundaer" href="${PFAD}verein/">Zurück zum Verein</a>
    </p>
  </div>
</section>`;

  return {
    url: "/formular-gesendet/",
    // App-Modus (?app=1): „Zurück zum Verein“ führt in die App-Seite Verein
    kopfZusatz: APP_MODUS_SKRIPT,
    title: "Vielen Dank",
    description: "Bestätigung: Ihre Anfrage an die Geschäftsstelle des FFV Sportfreunde 04 ist angekommen.",
    inhalt,
    bodyclass: "formular-gesendet",
  };
}
