// K1 – Klick-Prototyp der neu strukturierten Vereins-App (390 px), siehe
// scratchpad/k1-spec.md und "Speuzer App - Konzept 21.09.2026.md" (nur
// gelesen, liegt außerhalb des Repos). Fünf Tabs (Start · Termine · News ·
// Verein · Mehr), Start personalisiert, Karneval als eigener Bereich,
// Entscheidungen von Olgay (21.09.2026).
//
// Liefert bildschirme(daten) -> Liste { datei, html }: neun eigenständige
// Bildschirm-Attrappen (Bildschirmrahmen: Kopfleiste + Tab-Leiste, eigenes
// Stylesheet assets/css/app-konzept.css, KEIN site.css) plus die Rahmenseite
// index.html (nutzt dagegen die Begleit-Vorlage src/vorlagen/begleit.html
// und damit site.css, wie /app/ und /vorher-nachher/). tools/build.mjs
// schreibt die Liste unverändert nach docs/app-konzept/ und ergänzt die
// Sitemap nur um index.html.
//
// Keine personenbezogenen Daten: die Karneval-Gruppenliste zeigt nur
// Gruppenname und Übungszeit (bzw. "Übungszeit offen"), keine Trainernamen
// aus data/karneval.json (Feld "leitung" wird hier nicht gelesen).

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { datumLang, PROBETRAINING_MAILTO } from "../vorlagen/hilfen.mjs";

const HIER = path.dirname(fileURLToPath(import.meta.url));
const VORLAGEN = path.resolve(HIER, "..", "vorlagen");

const BASIS_URL = "https://justolgay.github.io/speuzer-website-prototyp/";
const VEREINSNAME = "FFV Sportfreunde 04";

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function appleMapsLink(adresse) {
  return "https://maps.apple.com/?q=" + encodeURIComponent(adresse).replace(/%20/g, "+");
}

// ---------- Icons (K1-Spezifikation, viewBox 0 0 24 24) ----------

const ICON = {
  start: '<path d="M4 11 12 4l8 7"/><path d="M6 10v10h12V10"/>',
  termine: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  news: '<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 9h8M8 12.5h8M8 16h5"/>',
  verein: '<path d="M12 3 20 12 12 21 4 12z"/>',
  mehr: '<circle cx="6" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="18" cy="12" r="1.6"/>',
  zurueck: '<path d="M15 5l-7 7 7 7"/>',
  weiter: '<path d="M9 5l7 7-7 7"/>',
};

function svg(name, klasse) {
  const klasseAttr = klasse ? ` class="${klasse}"` : "";
  return `<svg${klasseAttr} viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICON[name]}</svg>`;
}

// ---------- Tab-Leiste ----------

const TABS = [
  { key: "start", datei: "start.html", label: "Start", icon: "start" },
  { key: "termine", datei: "termine.html", label: "Termine", icon: "termine" },
  { key: "news", datei: "news.html", label: "News", icon: "news" },
  { key: "verein", datei: "verein.html", label: "Verein", icon: "verein" },
  { key: "mehr", datei: "mehr.html", label: "Mehr", icon: "mehr" },
];

function tabLeiste(aktiv) {
  const eintraege = TABS.map((tab) => {
    const istAktiv = tab.key === aktiv;
    const klasse = "app-tabs__eintrag" + (istAktiv ? " app-tabs__eintrag--aktiv" : "");
    const ariaCurrent = istAktiv ? ' aria-current="page"' : "";
    return `<a class="${klasse}" href="${tab.datei}"${ariaCurrent}>${svg(tab.icon)}<span>${tab.label}</span></a>`;
  }).join("\n    ");
  return `<!-- Tab-Leiste: Einträge im CMS konfigurierbar, Gestaltung appack -->
  <nav class="app-tabs" aria-label="Tab-Leiste">
    ${eintraege}
  </nav>`;
}

// ---------- Kopfleiste ----------

function kopfleiste({ titel, zurueck }) {
  const zurueckHtml = zurueck
    ? `<a class="app-kopf__zurueck" href="${zurueck.href}" aria-label="Zurück zu ${escapeHtml(zurueck.label)}"><span class="app-kopf__zurueck-kreis">${svg("zurueck")}</span></a>`
    : "";
  return `<!-- Kopfleiste: appack-Hülle, nur Farbe steuerbar -->
  <header class="app-kopf">
    <div class="app-kopf__status"></div>
    <div class="app-kopf__titel-zeile">
      ${zurueckHtml}
      <h1 class="app-kopf__titel">${escapeHtml(titel)}</h1>
    </div>
  </header>`;
}

// ---------- Bildschirm-Rahmen (Attrappe der appack-Hülle) ----------

function bildschirm({ titel, beschreibung, zurueck, tabAktiv, inhaltKlasse, inhalt }) {
  const klasse = inhaltKlasse ? ` ${inhaltKlasse}` : "";
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(titel)} – App-Konzept · ${escapeHtml(VEREINSNAME)}</title>
<meta name="description" content="${escapeHtml(beschreibung)}">
<link rel="stylesheet" href="../assets/css/tokens.css">
<link rel="stylesheet" href="../assets/css/fonts.css">
<link rel="stylesheet" href="../assets/css/app-konzept.css">
</head>
<body>
${kopfleiste({ titel, zurueck })}
<main class="app-inhalt${klasse}">
${inhalt}
</main>
${tabLeiste(tabAktiv)}
</body>
</html>
`;
}

// ---------- Start ----------

function startBildschirm(daten) {
  const heute = "2026-09-21";
  const d2Spiel = (daten.spiele ?? [])
    .filter((s) => s.team === "d2" && !s.entfaellt && s.datum >= heute)
    .slice()
    .sort((a, b) => (a.datum + a.zeit).localeCompare(b.datum + b.zeit))[0];
  const spielstaette = d2Spiel?.spielstaette ?? "";
  const routeLink = appleMapsLink(spielstaette);
  const hinweisText = daten.verein?.hinweise?.parken ?? "";

  const inhalt = `<p class="app-gruss">Guten Tag!</p>
<!-- personalisiert aus den App-Gruppen -->
<p class="app-gruppen">Deine Gruppen: <span class="tag">D2-Jugend</span> <span class="tag">D3-Jugend</span></p>

<h2 class="abschnittstitel">Heute und demnächst</h2>
<div class="app-termine">
  <div class="karte app-termin-karte">
    <div class="app-termin-karte__datum">
      <span class="app-termin-karte__tag">23</span>
      <span class="app-termin-karte__monat">SEP</span>
    </div>
    <div class="app-termin-karte__inhalt">
      <span class="tag">Training</span>
      <p class="app-termin-karte__titel">D3-Jugend · Training</p>
      <p class="app-termin-karte__zeile">Dienstag, 23.09.2026 · 17:30–19:30 Uhr</p>
      <p class="app-termin-karte__zeile">Vereinsplatz Mainzer Landstraße 480</p>
      <div class="app-termin-karte__knoepfe">
        <button type="button" class="knopf">Ich komme</button>
        <button type="button" class="knopf knopf--leise">Absagen</button>
      </div>
      <!-- Zu-/Absage: Kalendermodul -->
    </div>
  </div>
  <div class="karte app-termin-karte">
    <div class="app-termin-karte__datum">
      <span class="app-termin-karte__tag">27</span>
      <span class="app-termin-karte__monat">SEP</span>
    </div>
    <div class="app-termin-karte__inhalt">
      <span class="tag">Spiel · Auswärts</span>
      <p class="app-termin-karte__titel">D2-Jugend bei FC Fortuna Frankfurt</p>
      <p class="app-termin-karte__zeile">Samstag, 27.09.2026 · 10:30 Uhr</p>
      <p class="app-termin-karte__zeile">${escapeHtml(spielstaette)}</p>
      <div class="app-termin-karte__knoepfe">
        <a class="knopf knopf--leise" href="${escapeHtml(routeLink)}" rel="noopener" target="_blank">Route</a>
      </div>
    </div>
  </div>
</div>
<a class="app-weiter-link" href="termine.html">Alle Termine ${svg("weiter")}</a>

<h2 class="abschnittstitel">Aktuelles</h2>
<!-- Quelle: News-Modul der App -->
<div class="app-aktuelles">
  <div class="zeile">
    <span class="zeile__text">
      <span class="zeile__titel">Arbeitstag erfolgreich beendet</span>
      <span class="zeile__untertitel">19.09.2026</span>
    </span>
  </div>
  <div class="zeile">
    <span class="zeile__text">
      <span class="zeile__titel">Auswärtssieg der 1. Mannschaft</span>
      <span class="zeile__untertitel">13.09.2026</span>
    </span>
  </div>
</div>
<a class="app-weiter-link" href="news.html">Alle Meldungen ${svg("weiter")}</a>

<div class="hinweis"><p>${escapeHtml(hinweisText)}</p></div>

<div class="app-aktionen">
  <a class="knopf" href="${escapeHtml(PROBETRAINING_MAILTO)}">Probetraining vereinbaren</a>
  <a class="knopf knopf--leise" href="../ws/mitglied-werden.html">Mitglied werden</a>
</div>

<p class="app-fuss">Entwurf · Klick-Prototyp, keine Live-App</p>`;

  return bildschirm({
    titel: "Start",
    beschreibung: "Startbildschirm des App-Konzepts: Begrüßung, nächster Termin, aktuelle Meldungen und ein Hinweis, personalisiert für angemeldete Mitglieder.",
    tabAktiv: "start",
    inhalt,
  });
}

// ---------- Termine ----------

function termineBildschirm() {
  const inhalt = `<div class="karte app-modul-karte">
  <span class="tag">appack-Modul</span>
  <p>Hier liegt das Kalendermodul der App: Spiele und Training aller abonnierten Gruppen, Zu- und Absage, Orte mit Navigation. Dieser Bildschirm bleibt unverändert; die App gestaltet ihn selbst.</p>
</div>
<!-- Attrappe -->
<div class="app-liste">
  <div class="zeile zeile--attrappe">
    <span class="zeile__text">
      <span class="zeile__titel">D3-Jugend · Training</span>
      <span class="zeile__untertitel">Dienstag, 23.09.2026 · 17:30–19:30 Uhr</span>
    </span>
  </div>
  <div class="zeile zeile--attrappe">
    <span class="zeile__text">
      <span class="zeile__titel">D3-Jugend · Training</span>
      <span class="zeile__untertitel">Freitag, 26.09.2026 · 17:30–19:30 Uhr</span>
    </span>
  </div>
  <div class="zeile zeile--attrappe">
    <span class="zeile__text">
      <span class="zeile__titel">D2-Jugend bei FC Fortuna Frankfurt</span>
      <span class="zeile__untertitel">Samstag, 27.09.2026 · 10:30 Uhr</span>
    </span>
  </div>
</div>`;

  return bildschirm({
    titel: "Termine",
    beschreibung: "Bildschirm Termine im App-Konzept: Hinweis auf das native Kalendermodul der App, mit einer schlichten Attrappe der nächsten drei Termine.",
    tabAktiv: "termine",
    inhalt,
  });
}

// ---------- News ----------

function newsBildschirm() {
  const inhalt = `<div class="karte app-modul-karte">
  <span class="tag">appack-Modul</span>
  <p>Hier liegt das News-Modul der App mit Vereinsmeldungen und Instagram-Beiträgen. Bildschirmaufbau bleibt appack; der Verein pflegt Titel und Bilder.</p>
</div>
<div class="app-liste">
  <div class="zeile">
    <span class="zeile__text">
      <span class="zeile__titel">Arbeitstag erfolgreich beendet</span>
      <span class="zeile__untertitel">19.09.2026</span>
    </span>
  </div>
  <div class="zeile">
    <span class="zeile__text">
      <span class="zeile__titel">Auswärtssieg der 1. Mannschaft</span>
      <span class="zeile__untertitel">13.09.2026</span>
    </span>
  </div>
  <div class="zeile">
    <span class="zeile__text">
      <span class="zeile__titel">Großbaustelle: Parkplatz gesperrt</span>
      <span class="zeile__untertitel">21.07.2026</span>
    </span>
  </div>
</div>`;

  return bildschirm({
    titel: "News",
    beschreibung: "Bildschirm News im App-Konzept: Hinweis auf das native News-Modul der App, mit einer Attrappe aktueller Meldungen.",
    tabAktiv: "news",
    inhalt,
  });
}

// ---------- Verein ----------

function vereinBildschirm() {
  const inhalt = `<h2 class="abschnittstitel">Abteilungen</h2>
<div class="app-abteilungen">
  <a class="karte app-abteilung-karte" href="verein-mannschaften.html">
    ${svg("verein")}
    <p class="app-abteilung-karte__titel">Fußball</p>
    <p class="app-abteilung-karte__untertitel">11 Mannschaften, Herren bis G-Jugend</p>
  </a>
  <a class="karte app-abteilung-karte" href="karneval.html">
    ${svg("verein")}
    <p class="app-abteilung-karte__titel">Karneval</p>
    <p class="app-abteilung-karte__untertitel">Die Schnauzer, fünf Gruppen</p>
  </a>
</div>

<h2 class="abschnittstitel">Der Verein</h2>
<div class="app-liste">
  <a class="zeile" href="verein-vorstand.html">
    <span class="zeile__text">
      <span class="zeile__titel">Vorstand &amp; Kontakt</span>
      <span class="zeile__untertitel">Wer den Verein führt, wen du erreichst</span>
    </span>
    ${svg("weiter", "zeile__pfeil")}
  </a>
  <a class="zeile" href="../ws/mitglied-werden.html">
    <span class="zeile__text">
      <span class="zeile__titel">Mitglied werden</span>
      <span class="zeile__untertitel">Beiträge, Ablauf, Antrag</span>
    </span>
    ${svg("weiter", "zeile__pfeil")}
  </a>
  <a class="zeile" href="../ws/verein-sponsoren.html">
    <span class="zeile__text">
      <span class="zeile__titel">Sponsoren &amp; Partner</span>
      <span class="zeile__untertitel">Wer uns unterstützt</span>
    </span>
    ${svg("weiter", "zeile__pfeil")}
  </a>
  <a class="zeile" href="../ws/verein-downloads.html">
    <span class="zeile__text">
      <span class="zeile__titel">Downloads &amp; Anträge</span>
      <span class="zeile__untertitel">Satzung, Beiträge, Bescheinigungen</span>
    </span>
    ${svg("weiter", "zeile__pfeil")}
  </a>
  <a class="zeile" href="../ws/verein.html">
    <span class="zeile__text">
      <span class="zeile__titel">Über uns</span>
      <span class="zeile__untertitel">Seit 1904 im Gallus</span>
    </span>
    ${svg("weiter", "zeile__pfeil")}
  </a>
  <a class="zeile" href="verein-kontakt.html">
    <span class="zeile__text">
      <span class="zeile__titel">Anfahrt</span>
      <span class="zeile__untertitel">Mainzer Landstraße 480, Zugang und Parken</span>
    </span>
    ${svg("weiter", "zeile__pfeil")}
  </a>
</div>
<!-- Alle Ziele sind dieselben Seiten wie im Website-Menü (eine Quelle). -->`;

  return bildschirm({
    titel: "Verein",
    beschreibung: "Bildschirm Verein im App-Konzept: Abteilungen Fußball und Karneval sowie Vorstand, Mitgliedschaft, Sponsoren, Downloads, Über uns und Anfahrt.",
    tabAktiv: "verein",
    inhalt,
  });
}

// ---------- Karneval ----------

function karnevalBildschirm(daten) {
  const gruppen = daten.karneval?.gruppen ?? [];
  const gruppenHtml = gruppen
    .map((g) => {
      const untertitel = g.uebungszeit ?? "Übungszeit offen";
      return `<div class="zeile zeile--ohne-link">
    <span class="zeile__text">
      <span class="zeile__titel">${escapeHtml(g.name)}</span>
      <span class="zeile__untertitel">${escapeHtml(untertitel)}</span>
    </span>
  </div>`;
    })
    .join("\n  ");

  const inhalt = `<div class="karte">
  <span class="tag">Abteilung</span>
  <p class="app-karneval-titel">Die Schnauzer</p>
  <p class="app-karneval-text">Die Karnevalabteilung der Sportfreunde 04 mit fünf Gruppen von den Little Fruities bis zu den Dreamboys.</p>
</div>
<div class="app-karneval-gruppen">
  ${gruppenHtml}
</div>
<div class="app-aktionen">
  <a class="knopf" href="mailto:karnevalabteilung@sportfreunde04.de">Kontakt Karnevalabteilung</a>
  <a class="app-weiter-link" href="../ws/verein-karneval.html">Zur Karneval-Seite ${svg("weiter")}</a>
</div>`;

  return bildschirm({
    titel: "Karneval",
    beschreibung: "Bildschirm Karneval im App-Konzept: die Karnevalabteilung Die Schnauzer mit ihren fünf Gruppen und Übungszeiten, ohne Trainernamen.",
    zurueck: { href: "verein.html", label: "Verein" },
    tabAktiv: "verein",
    inhalt,
  });
}

// ---------- Mehr ----------

function mehrBildschirm() {
  const eintraege = ["Profil", "Gruppen &amp; Chat", "Galerie", "Schwarzes Brett", "Push-Historie", "Impressum", "Datenschutz"];
  const liste = eintraege
    .map(
      (titel) => `<a class="zeile" href="#" aria-disabled="true">
    <span class="zeile__text"><span class="zeile__titel">${titel}</span></span>
    ${svg("weiter", "zeile__pfeil")}
  </a>`
    )
    .join("\n  ");

  const inhalt = `<div class="karte">
  <span class="tag">appack-Module</span>
  <p>Persönliches und Werkzeuge. Bildschirme der App, Reihenfolge im CMS.</p>
</div>
<div class="app-liste">
  ${liste}
</div>
<p class="app-fussnote">Admin-Dashboard und Push-Versand erscheinen nur für Rollen, die sie brauchen.</p>`;

  return bildschirm({
    titel: "Mehr",
    beschreibung: "Bildschirm Mehr im App-Konzept: appack-Module Profil, Gruppen und Chat, Galerie, Schwarzes Brett, Push-Historie, Impressum und Datenschutz.",
    tabAktiv: "mehr",
    inhalt,
  });
}

// ---------- Verein-Unterseiten mit eingebetteter Workspace-Seite ----------

function iframeBildschirm({ titel, beschreibung, ziel, iframeTitel }) {
  const inhalt = `<!-- Dieselbe Seite wie auf der Website (Stufe C: eine Quelle). -->
<iframe class="app-iframe" src="${ziel}" title="${escapeHtml(iframeTitel)}" loading="lazy"></iframe>`;

  return bildschirm({
    titel,
    beschreibung,
    zurueck: { href: "verein.html", label: "Verein" },
    tabAktiv: "verein",
    inhaltKlasse: "app-inhalt--voll",
    inhalt,
  });
}

// ---------- index.html (Rahmenseite, Begleit-Vorlage) ----------

function baueOgBlock({ title, description, canonical, ogImageAbs }) {
  const volltitel = `${title} – ${VEREINSNAME}`;
  return [
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="${escapeHtml(VEREINSNAME)}">`,
    `<meta property="og:title" content="${escapeHtml(volltitel)}">`,
    `<meta property="og:description" content="${escapeHtml(description)}">`,
    `<meta property="og:url" content="${escapeHtml(canonical)}">`,
    `<meta property="og:image" content="${escapeHtml(ogImageAbs)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
  ].join("\n");
}

function fuelleVorlage(basis, werte) {
  let html = basis;
  for (const [schluessel, wert] of Object.entries(werte)) {
    html = html.replaceAll(`{{${schluessel}}}`, wert ?? "");
  }
  return html;
}

// Liste der neun Bildschirme für die Linkliste neben dem Telefonrahmen.
const BILDSCHIRME_LISTE = [
  { datei: "start.html", label: "Start" },
  { datei: "termine.html", label: "Termine" },
  { datei: "news.html", label: "News" },
  { datei: "verein.html", label: "Verein" },
  { datei: "karneval.html", label: "Karneval" },
  { datei: "verein-mannschaften.html", label: "Verein · Mannschaften" },
  { datei: "verein-vorstand.html", label: "Verein · Vorstand & Kontakt" },
  { datei: "verein-kontakt.html", label: "Verein · Anfahrt" },
  { datei: "mehr.html", label: "Mehr" },
];

function indexBildschirm(daten) {
  const begleitVorlage = readFileSync(path.join(VORLAGEN, "begleit.html"), "utf8");

  const title = "App-Konzept";
  const description =
    "Klick-Prototyp der neu strukturierten Speuzer-App: fünf Tabs, personalisierter Start und Vereinsbereich, appack-Hülle als Attrappe.";
  const canonical = `${BASIS_URL}app-konzept/`;
  const ogImageAbs = `${BASIS_URL}assets/og/standard.png`;
  const og = baueOgBlock({ title, description, canonical, ogImageAbs });

  const liste = BILDSCHIRME_LISTE.map(
    (b) => `<li><a href="${b.datei}" data-appkonzept-ziel="${b.datei}">${escapeHtml(b.label)}</a></li>`
  ).join("\n        ");

  const inhalt = `<section class="abschnitt seitenkopf">
  <div class="container">
    <h1>App-Konzept</h1>
    <p class="seitenkopf__lead">Klick-Prototyp der neu strukturierten Vereins-App: fünf Tabs, ein Startbildschirm, der arbeitet, und Vereinsseiten, die App und Website gemeinsam nutzen. Kopf- und Tab-Leiste sind Attrappen der appack-Hülle; Termine, News und Mehr bleiben appack-Bildschirme.</p>
  </div>
</section>
<section class="abschnitt">
  <div class="container">
    <div class="telefone-paar">
      <div class="telefon-eintrag">
        <div class="telefon">
          <iframe id="appkonzept-rahmen" src="start.html" title="Vorschau der Bildschirm-Attrappe" loading="lazy"></iframe>
        </div>
      </div>
      <div class="fluss">
        <h2>Bildschirme</h2>
        <ul>
        ${liste}
        </ul>
      </div>
    </div>
  </div>
</section>
<section class="abschnitt">
  <div class="container fluss">
    <h2>Was hier Attrappe ist</h2>
    <p>Kopfleiste: appack liefert Höhe, Aufbau und Schrift der Kopfleiste vor; der Verein steuert nur ihre Farbe.</p>
    <p>Tab-Leiste: Anzahl, Reihenfolge, Ziele und Beschriftung der fünf Einträge legt der Verein im CMS fest, Icon-Stil, Höhe und Schrift der Leiste bleiben appack.</p>
    <p>Native Module: Termine, Mehr und die einzelnen App-Bildschirme darin (Kalender, News, Chat, Galerie, Schwarzes Brett, Profil) bleiben appack-Bildschirme; der Verein liefert nur Inhalte, Reihenfolge und Farben.</p>
  </div>
</section>
<script>
(function () {
  var rahmen = document.getElementById("appkonzept-rahmen");
  if (!rahmen) return;
  var links = document.querySelectorAll("[data-appkonzept-ziel]");
  for (var i = 0; i < links.length; i++) {
    links[i].addEventListener("click", function (ereignis) {
      ereignis.preventDefault();
      rahmen.src = this.getAttribute("data-appkonzept-ziel");
    });
  }
})();
</script>`;

  const pfad = "../";
  const stand = datumLang(daten.stand);

  return fuelleVorlage(begleitVorlage, {
    title: escapeHtml(`${title} – ${VEREINSNAME}`),
    description: escapeHtml(description),
    canonical,
    og,
    pfad,
    inhalt,
    stand,
    navAktuellVorherNachher: "",
    navAktuellApp: "",
  });
}

// ---------- Zusammenstellung ----------

export function bildschirme(daten) {
  return [
    { datei: "start.html", html: startBildschirm(daten) },
    { datei: "termine.html", html: termineBildschirm() },
    { datei: "news.html", html: newsBildschirm() },
    { datei: "verein.html", html: vereinBildschirm() },
    { datei: "karneval.html", html: karnevalBildschirm(daten) },
    { datei: "mehr.html", html: mehrBildschirm() },
    {
      datei: "verein-mannschaften.html",
      html: iframeBildschirm({
        titel: "Mannschaften",
        beschreibung: "Bildschirm Mannschaften im App-Konzept: eingebettete Workspace-Seite der Website innerhalb der App.",
        ziel: "../ws/mannschaften.html",
        iframeTitel: "Mannschaften",
      }),
    },
    {
      datei: "verein-vorstand.html",
      html: iframeBildschirm({
        titel: "Vorstand & Kontakt",
        beschreibung: "Bildschirm Vorstand und Kontakt im App-Konzept: eingebettete Workspace-Seite der Website innerhalb der App.",
        ziel: "../ws/verein-vorstand.html",
        iframeTitel: "Vorstand & Kontakt",
      }),
    },
    {
      datei: "verein-kontakt.html",
      html: iframeBildschirm({
        titel: "Anfahrt",
        beschreibung: "Bildschirm Anfahrt im App-Konzept: eingebettete Workspace-Seite der Website innerhalb der App.",
        ziel: "../ws/kontakt.html",
        iframeTitel: "Anfahrt",
      }),
    },
    { datei: "index.html", html: indexBildschirm(daten) },
  ];
}
