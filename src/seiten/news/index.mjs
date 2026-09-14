// News-Übersicht /news/ (P6) – alle Meldungen aus data/news.json als Karten,
// dazu ein Verweis auf Instagram (nur verlinkt, nicht eingebettet).

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bild } from "../../vorlagen/bild.mjs";
import { datumLang, teaser } from "../../vorlagen/hilfen.mjs";

// Diese Seite liegt immer unter "/news/" (Tiefe 1), daher immer "../" (siehe
// pfadZurWurzel() in tools/build.mjs).
const PFAD = "../";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

function liesWappenBlau() {
  return readFileSync(path.join(ROOT, "assets", "logo", "wappen-blau.svg"), "utf8");
}

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// Gleiches Bild-Muster wie im Abschnitt "Aktuelles" auf der Startseite (siehe
// src/seiten/index.mjs#aktuellesAbschnitt): bild_passung "contain" auf
// --blau-900, sonst zugeschnitten. Ohne Bild: Kopfzeile in --blau-100 mit
// zentriertem Wappen (.karte__bild--leer, P6-Ergänzung in komponenten.css).
// prioritaet (P11, Plan-Abschnitt B3): nur beim ersten Bild dieser Seite
// gesetzt (siehe listeAbschnitt() unten).
function newsBildHtml(eintrag, daten, { prioritaet = false } = {}) {
  if (eintrag.bild) {
    const passungKlasse = eintrag.bild_passung === "contain" ? " karte__bild--contain" : "";
    return bild({
      pfad: PFAD,
      daten,
      name: eintrag.bild.replace(/\.[^./]+$/, ""),
      alt: eintrag.alt ?? "",
      sizes: "(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw",
      klasse: `karte__bild${passungKlasse}`,
      prioritaet,
    });
  }
  return `<span class="karte__bild--leer" aria-hidden="true">${liesWappenBlau()}</span>`;
}

function newsKarte(eintrag, daten, { prioritaet = false } = {}) {
  const ziel = `${PFAD}news/${String(eintrag.datum).slice(0, 10)}-${eintrag.slug}/`;
  return `<a class="karte karte--link" href="${ziel}">
      ${newsBildHtml(eintrag, daten, { prioritaet })}
      <p class="karte__meta">${datumLang(eintrag.datum)} · ${escapeHtml(eintrag.quelle)}</p>
      <h2 class="karte__titel">${escapeHtml(eintrag.titel)}</h2>
      <p>${escapeHtml(teaser(eintrag.text))}</p>
      <span class="karte__mehr">Weiterlesen →</span>
    </a>`;
}

function seitenkopfAbschnitt() {
  return `<section class="abschnitt seitenkopf">
  <div class="container">
    <h1>News</h1>
    <p class="seitenkopf__lead">Spielberichte, Termine und Aktionen aus dem Verein.</p>
    <p class="meta">Quelle: Vereins-App (App-News) · Instagram-Beiträge sind verlinkt</p>
  </div>
</section>`;
}

function listeAbschnitt(daten) {
  const eintraege = (daten.news ?? [])
    .slice()
    .sort((a, b) => String(b.datum).localeCompare(String(a.datum)));

  const karten = eintraege.map((n, i) => newsKarte(n, daten, { prioritaet: i === 0 })).join("\n    ");

  return `<section class="abschnitt">
  <div class="container fluss">
    <div class="raster raster--3">
    ${karten}
    </div>
  </div>
</section>`;
}

function instagramAbschnitt(daten) {
  const verein = daten.verein ?? {};
  return `<section class="abschnitt--hell abschnitt">
  <div class="container fluss">
    <h2>Mehr auf Instagram</h2>
    <p class="inhalt">Kurzmeldungen, Bilder und Stories gibt es auf unserem Instagram-Kanal.</p>
    <p class="knopfzeile">
      <a class="knopf knopf--sekundaer" href="${escapeHtml(verein.instagram ?? "https://www.instagram.com/speuzer_ffm/")}" rel="noopener" target="_blank">@speuzer_ffm auf Instagram</a>
    </p>
    <div class="hinweis hinweis--info">
      <p style="margin:0;">Im Prototyp sind Instagram-Beiträge nicht eingebettet, sondern nur verlinkt – so werden keine Daten an Instagram übertragen, bevor jemand dorthin wechselt.</p>
    </div>
  </div>
</section>`;
}

export function seite(daten) {
  const inhalt = [
    seitenkopfAbschnitt(),
    listeAbschnitt(daten),
    instagramAbschnitt(daten),
  ].join("\n");

  return {
    url: "/news/",
    title: "News",
    description:
      "Aktuelle Meldungen des FFV Sportfreunde 04: Spielberichte der Herren, Arbeitstag am 19. September, REWE Scheine für Vereine, Vereins-App und Baustelle am Vereinsgelände.",
    inhalt,
  };
}
