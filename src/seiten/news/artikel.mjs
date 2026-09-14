// Artikelseiten /news/<slug>/ (P6) – eine Seite je Meldung aus
// data/news.json: Bild, Text als Absätze, ggf. Tore/Ergebnis/Fakten,
// Byline, Instagram-Original, Teilen (WhatsApp) und weitere Meldungen.

import { bild } from "../../vorlagen/bild.mjs";
import { datumLang, mailLink, teaser, absaetze } from "../../vorlagen/hilfen.mjs";

// Diese Seiten liegen immer unter "/news/<slug>/" (Tiefe 2), daher immer
// "../../" (siehe pfadZurWurzel() in tools/build.mjs).
const PFAD = "../../";

// Für den WhatsApp-Teilen-Link wird eine absolute URL gebraucht (siehe
// tools/build.mjs, wo dieselbe Basis-URL für Canonical/Sitemap/OG-Bild
// verwendet wird – hier wie in tools/pruefen.mjs und tools/screenshots.mjs
// als eigene Konstante, da die Seitenmodule nicht aus tools/ importieren).
const BASIS_URL = "https://justolgay.github.io/speuzer-website-prototyp/";

const EMAIL_GESCHAEFTSSTELLE = "geschaeftsstelle@sportfreunde04.de";

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function newsUrl(eintrag) {
  return `/news/${String(eintrag.datum).slice(0, 10)}-${eintrag.slug}/`;
}

// "Rückmeldung an: geschaeftsstelle@sportfreunde04.de" im Text als mailLink
// rendern (Plan-Abschnitt B: Markup-Regel, keine Datenänderung) – restlicher
// Absatz-Text bleibt normal escaped, nur die Adresse wird zu mailLink().
function absatzHtml(text) {
  if (!text.includes(EMAIL_GESCHAEFTSSTELLE)) return escapeHtml(text);
  return text
    .split(EMAIL_GESCHAEFTSSTELLE)
    .map((teil) => escapeHtml(teil))
    .join(mailLink(EMAIL_GESCHAEFTSSTELLE));
}

function absaetzeHtml(text) {
  return absaetze(text)
    .map((p) => `<p>${absatzHtml(p)}</p>`)
    .join("\n    ");
}

// ---------- Bild (Grafik "contain" auf --blau-900, Foto in natürlicher
// Proportion – siehe .artikel__bild/.artikel__bild--contain in
// komponenten.css) ----------

function bildAbschnitt(eintrag, daten) {
  if (!eintrag.bild) return "";
  const passungKlasse = eintrag.bild_passung === "contain" ? " artikel__bild--contain" : "";
  const bildHtml = bild({
    pfad: PFAD,
    daten,
    name: eintrag.bild.replace(/\.[^./]+$/, ""),
    alt: eintrag.alt ?? "",
    sizes: "(min-width: 720px) 720px, 100vw",
    prioritaet: true,
  });
  return `<figure class="artikel__bild${passungKlasse}">
    ${bildHtml}
    <figcaption class="meta">${escapeHtml(eintrag.alt ?? "")}</figcaption>
  </figure>`;
}

// ---------- Ergebniszeile (P7-Korrektur A2): dreiteilige Zeile statt
// Überschrift – links der eigene Verein, Mitte das Ergebnis, rechts der
// Gegner. Kein h2 (das Ergebnis ist keine Überschrift), stattdessen
// aria-label="Endstand" auf dem Container. ----------

function ergebnisAbschnitt(eintrag) {
  if (!eintrag.ergebnis) return "";
  return `<div class="ergebnis" aria-label="Endstand">
    <span class="ergebnis__team">FFV Sportfreunde 04</span>
    <span class="ergebnis__resultat">${escapeHtml(eintrag.ergebnis)}</span>
    <span class="ergebnis__team">${escapeHtml(eintrag.gegner ?? "")}</span>
  </div>`;
}

// ---------- Fakten (Termin, Uhrzeit, Ort als Tags/Zeilen vor dem Text) ----------

function faktenAbschnitt(eintrag) {
  if (!eintrag.fakten?.length) return "";
  const zeilen = eintrag.fakten.map((f) => `<li>${escapeHtml(f)}</li>`).join("\n      ");
  return `<ul class="fakten" role="list">
      ${zeilen}
    </ul>`;
}

// ---------- Tore ----------

function toreAbschnitt(eintrag) {
  if (!eintrag.tore?.length) return "";
  const zeilen = eintrag.tore
    .map(
      (t) => `<li><span class="tore__minute">${escapeHtml(String(t.minute))}'</span> ${escapeHtml(t.name)}${t.stand ? ` · ${escapeHtml(t.stand)}` : ""}</li>`
    )
    .join("\n      ");
  return `<h2>Tore</h2>
    <ul class="tore" role="list">
      ${zeilen}
    </ul>`;
}

// ---------- Hinweis (nur App-Start-Eintrag): der offene Punkt aus dem
// Hinweis, ohne die Herkunfts-/Zusammenfassungs-Anmerkung "Original war ein
// Instagram-Countdown." – siehe Plan-Abschnitt D. ----------

function hinweisAbschnitt(eintrag) {
  if (!eintrag.hinweis) return "";
  return `<div class="hinweis hinweis--offen">
    <p style="margin:0;">Store-Links folgen, sobald die App im Apple App Store freigegeben ist.</p>
  </div>`;
}

function instagramOriginalAbschnitt(eintrag) {
  if (!eintrag.link) return "";
  return `<p><a href="${escapeHtml(eintrag.link)}" rel="noopener" target="_blank">Original auf Instagram</a></p>`;
}

// ---------- Teilen (WhatsApp) + Zurück zur Übersicht ----------

function teilenAbschnitt(eintrag) {
  const absoluteUrl = BASIS_URL.replace(/\/$/, "") + newsUrl(eintrag);
  const whatsappText = encodeURIComponent(`${eintrag.titel} – ${absoluteUrl}`);
  return `<p class="knopfzeile">
    <a class="knopf knopf--sekundaer" href="https://wa.me/?text=${whatsappText}" rel="noopener" target="_blank">Per WhatsApp teilen</a>
    <a href="${PFAD}news/">Alle Meldungen</a>
  </p>`;
}

// ---------- Weitere Meldungen (die zwei nächsten Einträge in der nach Datum
// absteigend sortierten Liste, ohne Bild, Titel + Datum) ----------

function weitereMeldungenAbschnitt(eintrag, alleSortiert) {
  const index = alleSortiert.findIndex((n) => n.slug === eintrag.slug);
  const weitere = alleSortiert.slice(index + 1, index + 3);
  if (!weitere.length) return "";

  const karten = weitere
    .map(
      (n) => `<a class="karte karte--link" href="${PFAD}${newsUrl(n).replace(/^\//, "")}">
      <span class="karte__titel">${escapeHtml(n.titel)}</span>
      <span class="karte__meta">${datumLang(n.datum)}</span>
    </a>`
    )
    .join("\n    ");

  return `<section class="abschnitt--hell abschnitt">
  <div class="container fluss">
    <h2>Weitere Meldungen</h2>
    <div class="raster raster--3">
    ${karten}
    </div>
  </div>
</section>`;
}

function seiteFuerEintrag(eintrag, alleSortiert, daten) {
  const inhalt = [
    `<section class="abschnitt">
  <div class="container">
    <article class="inhalt fluss">
      <p class="seitenkopf__kicker">${escapeHtml(eintrag.quelle)} · ${datumLang(eintrag.datum)}</p>
      <h1>${escapeHtml(eintrag.titel)}</h1>
      ${bildAbschnitt(eintrag, daten)}
      ${ergebnisAbschnitt(eintrag)}
      ${faktenAbschnitt(eintrag)}
      ${absaetzeHtml(eintrag.text)}
      ${toreAbschnitt(eintrag)}
      ${hinweisAbschnitt(eintrag)}
      <p class="meta">${escapeHtml(eintrag.autor ?? "")}</p>
      ${instagramOriginalAbschnitt(eintrag)}
      ${teilenAbschnitt(eintrag)}
    </article>
  </div>
</section>`,
    weitereMeldungenAbschnitt(eintrag, alleSortiert),
  ]
    .filter(Boolean)
    .join("\n");

  const beschreibungKurz = teaser(eintrag.text, 160);
  const description =
    beschreibungKurz.length >= 50
      ? beschreibungKurz
      : `${eintrag.titel} – Meldung des FFV Sportfreunde 04 vom ${datumLang(eintrag.datum)}.`;

  const ogImage = eintrag.bild
    ? `assets/bilder/erzeugt/${eintrag.bild.replace(/\.[^./]+$/, "")}-960.jpg`
    : undefined;

  return {
    url: newsUrl(eintrag),
    title: eintrag.titel,
    description,
    ogImage,
    ogType: "article",
    inhalt,
  };
}

export function seiten(daten) {
  const alleSortiert = (daten.news ?? [])
    .slice()
    .sort((a, b) => String(b.datum).localeCompare(String(a.datum)));

  return alleSortiert.map((eintrag) => seiteFuerEintrag(eintrag, alleSortiert, daten));
}
