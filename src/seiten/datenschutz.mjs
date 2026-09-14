// Datenschutz /datenschutz/ (P8) – Datenschutzerklärung der Vereins-App
// (cdn.appack.de), für den Prototyp unverändert aus data/datenschutz.json
// übernommen (siehe dort: Stand, Quelle und Hinweis auf die noch fehlende
// juristische Prüfung).

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function seitenkopfAbschnitt(datenschutz) {
  return `<section class="abschnitt seitenkopf">
  <div class="container">
    <h1>Datenschutzerklärung</h1>
    <p class="seitenkopf__lead">Fassung der Vereins-App vom ${escapeHtml(datenschutz.stand ?? "")}</p>
    <div class="hinweis hinweis--offen">
      <p style="margin:0;">${escapeHtml(datenschutz.hinweis ?? "")}</p>
    </div>
  </div>
</section>`;
}

function inhaltsverzeichnisAbschnitt(abschnitte) {
  const eintraege = abschnitte
    .map((a, i) => `<li><a href="#abschnitt-${i + 1}">${escapeHtml(a.titel)}</a></li>`)
    .join("\n      ");

  return `<nav aria-label="Abschnitte">
  <div class="container">
    <ol>
      ${eintraege}
    </ol>
  </div>
</nav>`;
}

function abschnittSection(abschnitt, index) {
  const absaetze = (abschnitt.absaetze ?? []).map((p) => `<p>${escapeHtml(p)}</p>`).join("\n      ");
  const listeHtml = abschnitt.liste
    ? `<ul>
        ${abschnitt.liste.map((li) => `<li>${escapeHtml(li)}</li>`).join("\n        ")}
      </ul>`
    : "";

  return `<section id="abschnitt-${index + 1}" class="abschnitt">
  <div class="container inhalt prosa fluss">
    <h2>${escapeHtml(abschnitt.titel)}</h2>
    ${absaetze}
    ${listeHtml}
  </div>
</section>`;
}

function quelleAbschnitt(datenschutz) {
  return `<section class="abschnitt">
  <div class="container inhalt fluss">
    <p class="meta">Quelle: ${escapeHtml(datenschutz.quelle ?? "")}</p>
    <p><a href="https://cdn.appack.de/sportfreunde04/workspace/Datenschutzerklaerung.html" rel="noopener" target="_blank">Zur Live-Fassung auf cdn.appack.de</a></p>
  </div>
</section>`;
}

export function seite(daten) {
  const datenschutz = daten.datenschutz ?? {};
  const abschnitte = datenschutz.abschnitte ?? [];

  const inhalt = [
    seitenkopfAbschnitt(datenschutz),
    inhaltsverzeichnisAbschnitt(abschnitte),
    ...abschnitte.map(abschnittSection),
    quelleAbschnitt(datenschutz),
  ].join("\n");

  return {
    url: "/datenschutz/",
    title: "Datenschutz",
    description:
      "Datenschutzerklärung des FFV Sportfreunde 04 – Fassung der Vereins-App vom 17. Juli 2026, im Prototyp unverändert übernommen und zur juristischen Prüfung vorgemerkt.",
    inhalt,
    bodyclass: "datenschutz",
  };
}
