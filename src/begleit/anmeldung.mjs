// Anmeldung (Entwurf) /anmeldung/ – Begleitseite mit dem Anmelde-Assistenten
// (29.09.2026). Eine Familie wird Schritt für Schritt durch die Anmeldung beim
// FFV Sportfreunde 04 geführt; am Ende steht ein vollständiges PDF. Die Seite
// ist ein Entwurf zum Vorführen für die 1. Vorsitzende und den Vorstand: Sie
// überträgt nichts, speichert nichts und nimmt keine echten Daten an.
//
// Aufbau: Dieses Modul baut nur den Rahmen (Seitenkopf, Entwurfs-Band, Schalter
// für die Vereinssicht, Knöpfe für die Beispiel-Profile, Platz für den
// Assistenten) und bettet die Konfiguration ein (#anmeldung-konfig, siehe
// SCHNITTSTELLEN Abschnitt 2). Den Assistenten selbst baut das Skript
// assets/js/anmeldung/assistent.js im Browser: Seitenfolge und Ergebnis kommen
// aus assets/js/anmeldung/regeln.js, die Texte aus
// assets/js/anmeldung/texte/<sprache>-oberflaeche.js.
//
// Liegt außerhalb der Hülle und der Workspace-Seiten (eigene Vorlage
// src/vorlagen/begleit.html, siehe tools/build.mjs). Fehlen data/anmeldung.json
// oder data/anmeldung-formulare.json noch, baut die Seite trotzdem – dann
// stehen leere Objekte in der Konfiguration.

import de from "../../assets/js/anmeldung/texte/de-oberflaeche.js";
import { BEISPIELE } from "../../assets/js/anmeldung/beispiele.js";

// Diese Seite liegt immer unter "/anmeldung/" (Tiefe 1), daher "../".
const PFAD = "../";

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// JSON sicher in ein <script type="application/json"> einbetten ("</script>"
// und "<!--" dürfen im Text nicht vorkommen).
function jsonImSkript(wert) {
  return JSON.stringify(wert).replace(/</g, "\\u003c");
}

// data/anmeldung-formulare.json ist groß (Feldbeschreibungen der Vordrucke).
// Zur Laufzeit braucht die Seite nur, was die Oberfläche und pdf.js lesen:
// Dateipfad, Größe, Prüfsumme, Felder, Unterschriftsstellen, Regel zur digitalen
// Unterschrift. Die Beschreibung der Datei und die Belege/Hinweise je Feld
// bleiben in der Datei, gehen aber nicht in die Seite.
function bereinigeFormulare(daten) {
  if (!daten || typeof daten !== "object") return {};
  const weglassen = new Set(["beleg", "hinweis"]);
  const kopie = (x) => {
    if (Array.isArray(x)) return x.map(kopie);
    if (x && typeof x === "object") {
      const o = {};
      for (const [name, wert] of Object.entries(x)) if (!weglassen.has(name)) o[name] = kopie(wert);
      return o;
    }
    return x;
  };
  const { _beschreibung, ...rest } = daten;
  return kopie(rest);
}

// Adresse der Satzung: aus data/downloads.json (Eintrag "Satzung …"), nie fest im
// Code. Die Adresse, die im Papier-Vordruck steht, führt ins Leere (401) und wird
// nicht benutzt. Fehlt der Eintrag, bleibt die Adresse leer: Der Assistent zeigt
// dann den Hinweis ohne Link, und der Bau meldet es.
function satzungUrl(daten) {
  const liste = Array.isArray(daten.downloads) ? daten.downloads : [];
  const eintrag = liste.find((d) => d && /^satzung\b/i.test(String(d.titel ?? "")));
  const url = eintrag && typeof eintrag.datei === "string" ? eintrag.datei.trim() : "";
  if (!/^https:\/\//.test(url)) {
    console.warn("anmeldung.mjs: In data/downloads.json fehlt der Eintrag \"Satzung\" mit https-Adresse – der Assistent zeigt keinen Link.");
    return "";
  }
  return url;
}

// Konfiguration für den Assistenten (SCHNITTSTELLEN Abschnitt 2). Die
// Karnevalgruppen enthalten nur Name und Übungszeit, keine Personennamen aus
// data/karneval.json (dort stehen die Trainerinnen und Trainer).
function baueKonfig(daten) {
  const verein = daten.verein ?? {};
  const sportstaette = verein.sportstaette ?? null;
  return {
    anmeldung: daten.anmeldung ?? {},
    formulare: bereinigeFormulare(daten["anmeldung-formulare"]),
    aufnahmeantragFelder: daten["aufnahmeantrag-felder"] ?? {},
    beitraege: daten.beitraege ?? {},
    verein: {
      name: verein.name_kurz ?? "FFV Sportfreunde 04",
      name_register: verein.name_register ?? "",
      mail: verein.mail ?? "",
      tel_geschaeftsstelle: verein.tel_geschaeftsstelle ?? "",
      vereinsnummer: verein.vereinsnummer ?? "",
      satzungUrl: satzungUrl(daten),
      anschrift: sportstaette
        ? { strasse: sportstaette.strasse, plz: sportstaette.plz, ort: sportstaette.ort }
        : null,
    },
    karnevalGruppen: (daten.karneval?.gruppen ?? []).map((g) => ({
      name: g.name,
      uebungszeit: g.uebungszeit ?? "",
    })),
    // Stand der Regeldaten; ohne data/anmeldung.json der Tag des Baus (nur das
    // Datum, damit die Seite bei mehreren Bauten am selben Tag gleich bleibt).
    stand: daten.anmeldung?.stand ?? String(daten.stand ?? "").slice(0, 10),
  };
}

// ---------- Abschnitte ----------

function seitenkopfAbschnitt() {
  return `<section class="abschnitt seitenkopf">
  <div class="container">
    <div class="anm-titelzeile">
      <h1 data-anm-t="seite.h1">${escapeHtml(de.seite.h1)}</h1>
      <button type="button" class="knopf knopf--sekundaer anm-vorfuehrknopf" data-anm-vorfuehrung aria-expanded="false" aria-controls="anm-werkzeugkasten">${escapeHtml(de.demo.vorfuehrung)}</button>
    </div>
    <p class="seitenkopf__lead" data-anm-t="seite.lead">${escapeHtml(de.seite.lead)}</p>
  </div>
</section>`;
}

// Entwurfs-Band, Schalter für die Vereinssicht und Beispiel-Profile. Der Text
// des Bandes steht in de-oberflaeche.js; das Skript tauscht ihn bei einem
// Sprachwechsel aus (data-anm-t). Schalter und Beispiele sind Werkzeuge zum
// Vorführen und bleiben deutsch.
// Kompakter Kopf: Auf "start" und "fertig" steht alles wie hier gebaut da. Ab
// dem zweiten Schritt setzt assistent.js die Klasse anm-kompakt an <main>
// (anmeldung.css): Die h1 bleibt im Dokument, wird aber klein und einzeilig;
// Lead, Werkzeugkasten und Konzept-Link verschwinden, das Band zeigt statt
// band.text nur band.kurz. So beginnt die Frage gleich oben im Bild. Damit die
// Vereinssicht und die Beispiele trotzdem auf jedem Schritt erreichbar bleiben,
// erscheint im kompakten Kopf neben der h1 der Knopf "Vorführung" (Text unter demo in
// de-oberflaeche.js, deutsch): Er öffnet den Werkzeugkasten und schließt ihn wieder.
function vorfuehrAbschnitt() {
  const beispiele = BEISPIELE.map(
    (b) => `<li><button type="button" class="knopf knopf--sekundaer anm-beispiel" data-beispiel="${escapeHtml(b.id)}">${escapeHtml(b.titel)}</button></li>`
  ).join("\n          ");
  // Die Werkzeuge stehen in einem aufklappbaren Kasten: auf dem Handy zu, damit
  // der Assistent gleich zu sehen ist; ab 720 px öffnet ihn assistent.js.
  return `<section class="abschnitt anm-vorfuehren">
  <div class="container fluss">
    <div class="hinweis hinweis--offen anm-band" data-anm-band>
      <p><strong class="anm-band__lang" data-anm-t="band.text">${escapeHtml(de.band.text)}</strong><strong class="anm-band__kurz" data-anm-t="band.kurz">${escapeHtml(de.band.kurz)}</strong></p>
    </div>
    <details class="anm-werkzeugkasten" id="anm-werkzeugkasten" data-anm-werkzeuge>
      <summary class="anm-werkzeugkasten__titel">${escapeHtml(de.demo.werkzeugTitel)}</summary>
      <div class="anm-werkzeuge">
        <div class="anm-werkzeug">
          <h2 class="anm-werkzeug__titel">${escapeHtml(de.demo.vereinssichtTitel)}</h2>
          <p class="anm-hinweis">${escapeHtml(de.demo.vereinssichtText)}</p>
          <p><button type="button" class="knopf knopf--sekundaer anm-schalter" data-anm-vereinssicht aria-pressed="false">${escapeHtml(de.demo.vereinssichtAn)}</button></p>
        </div>
        <div class="anm-werkzeug">
          <h2 class="anm-werkzeug__titel">${escapeHtml(de.demo.beispieleTitel)}</h2>
          <p class="anm-hinweis">${escapeHtml(de.demo.beispieleText)}</p>
          <ul role="list" class="anm-beispiele">
          ${beispiele}
          </ul>
        </div>
      </div>
    </details>
    <p class="meta"><a href="${PFAD}anmeldung-konzept/">${escapeHtml(de.demo.konzeptLink)}</a></p>
  </div>
</section>`;
}

function assistentAbschnitt() {
  return `<section class="abschnitt anm-assistent-abschnitt" aria-labelledby="anm-assistent-titel">
  <div class="container">
    <h2 class="sr-only" id="anm-assistent-titel">${escapeHtml(de.seite.assistentTitel)}</h2>
    <div class="anm" id="anmeldung" data-anm-wurzel data-anm-ladefehler="${escapeHtml(de.seite.ladefehler)}">
      <p class="anm-laden" data-anm-laden>${escapeHtml(de.seite.laedt)}</p>
      <noscript><div class="hinweis hinweis--offen"><p>${escapeHtml(de.seite.ohneSkript)}</p></div></noscript>
    </div>
  </div>
</section>`;
}

export function seite(daten) {
  const konfig = baueKonfig(daten);
  const inhalt = [
    seitenkopfAbschnitt(),
    vorfuehrAbschnitt(),
    assistentAbschnitt(),
    `<script type="application/json" id="anmeldung-konfig">${jsonImSkript(konfig)}</script>`,
  ].join("\n");

  return {
    url: "/anmeldung/",
    title: de.seite.titel,
    description: de.seite.beschreibung,
    // Entwurf: nicht in Suchmaschinen (noindex). Stylesheet und Skript des
    // Assistenten. Führendes "\n": begleit.html setzt "{{kopfZusatz}}" ans Ende
    // der Stylesheet-Zeile (wie workspace.html), Seiten ohne Zusatz bekommen so
    // keine überflüssige Leerzeile.
    kopfZusatz: "\n" + [
      `<meta name="robots" content="noindex">`,
      `<link rel="stylesheet" href="${PFAD}assets/css/anmeldung.css">`,
      `<script type="module" src="${PFAD}assets/js/anmeldung/assistent.js"></script>`,
    ].join("\n"),
    inhalt,
  };
}
