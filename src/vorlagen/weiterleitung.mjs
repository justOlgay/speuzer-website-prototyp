// Weiterleitungsseiten (W6, Entscheidung Olgay 23.09.2026): Tabellen und
// Spielpläne gibt es nur noch auf der jeweiligen Mannschaftsseite, keine
// eigene Seite und keine Sammelseite mehr dafür. Die alten Adressen
// (/spielplan/, /spielplan/<team>/, /tabellen/) bleiben unter demselben
// Workspace-Namen bestehen (keine toten Links für gespeicherte Adressen),
// zeigen aber sofort auf die Mannschaftsseite weiter, die die Inhalte
// übernommen hat. Gemeinsamer Baustein für src/seiten/spielplan/index.mjs,
// src/seiten/spielplan/team.mjs und src/seiten/tabellen.mjs – keine doppelte
// Logik in den drei Modulen (siehe W6-Spezifikation, Abschnitt A3).

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// docs/ws/<name>.html – dieselbe Regel wie wsName() in tools/build.mjs (dort
// nicht exportiert). Nur für den Ziel-Dateinamen von <meta http-equiv=
// "refresh"> und den canonical-Verweis gebraucht: die liegen außerhalb von
// seite.inhalt und laufen deshalb NICHT durch relativiereFuerWorkspace()
// (die nur href/src/poster/data-src innerhalb von seite.inhalt umschreibt,
// siehe tools/build.mjs) – beide Zieldateien liegen nach dem Bau ohnehin
// flach im selben Ordner docs/ws/.
function wsDateiname(url) {
  return url.split("/").filter(Boolean).join("-") + ".html";
}

// vonUrl/zuUrl: alte bzw. neue Seiten-URL (z. B. "/spielplan/d3/",
// "/mannschaften/d3/"). pfad: pfadZurWurzel() der abgebenden Seite ("../"
// bzw. "../../", wie die PFAD-Konstante in den drei aufrufenden Modulen).
// zuPfadTeil: das Linkziel relativ zur Wurzel, ohne führenden aber mit
// abschließendem Schrägstrich (z. B. "mannschaften/d3/") – für den
// sichtbaren Link, der wie jeder andere Seitenverweis durch
// relativiereFuerWorkspace() läuft und dadurch automatisch auf den
// geflachten Workspace-Dateinamen umgeschrieben wird (identisch mit
// wsDateiname(zuUrl) unten, siehe Prüfung in tools/pruefen.mjs).
export function weiterleitungsSeite({ vonUrl, pfad, zuPfadTeil, zuUrl, zuTitel }) {
  const zuHref = `${pfad}${zuPfadTeil}`;
  const wsZiel = wsDateiname(zuUrl);

  // Führendes "\n": src/vorlagen/workspace.html setzt "{{kopfZusatz}}"
  // direkt hinter den site.css-Link (keine eigene Zeile im Rohtext), damit
  // Seiten ohne kopfZusatz (leerer String) keine überflüssige Leerzeile vor
  // "</head>" bekommen.
  const kopfZusatz = "\n" + [
    `<meta http-equiv="refresh" content="0; url=${escapeHtml(wsZiel)}">`,
    `<meta name="robots" content="noindex">`,
  ].join("\n");

  // Kein weiterer Inhalt (W6-Spezifikation A3): nur die sichtbare h1 und der
  // Weiter-Link.
  const inhalt = `<section class="abschnitt seitenkopf">
  <div class="container fluss">
    <h1>Diese Seite ist umgezogen</h1>
    <p class="seitenkopf__lead">${escapeHtml(zuTitel)} findest du jetzt auf der Mannschaftsseite.</p>
    <p><a href="${escapeHtml(zuHref)}">Weiter zu ${escapeHtml(zuTitel)}</a></p>
  </div>
</section>`;

  return {
    url: vonUrl,
    title: `Umgezogen: ${zuTitel}`,
    description: `Diese Seite ist umgezogen. ${zuTitel} findest du jetzt auf der jeweiligen Mannschaftsseite.`,
    inhalt,
    kopfZusatz,
    wsZiel,
    // tools/build.mjs lässt Seiten mit istWeiterleitung beim Sitemap-Eintrag
    // aus (W6-Spezifikation A3: "Weiterleitungsseiten nicht in
    // docs/sitemap.xml"); tools/pruefen.mjs prüft sie deshalb nicht über die
    // sitemap-gesteuerte Schleife, sondern über eine eigene, schlankere
    // Prüfung (siehe pruefeWeiterleitungsseiten() dort).
    istWeiterleitung: true,
  };
}
