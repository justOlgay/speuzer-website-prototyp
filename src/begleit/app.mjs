// In der App /app/ (P17, aus dem Modul von P9 umgebaut) – Begleitseite für
// den Vorstand: zeigt, wie zwei Workspace-Seiten in der nativen Vereins-App
// von appack erscheinen (eingebettetes Browserfenster ohne Website-Kopf).
// Liegt außerhalb der Hülle (docs/index.html) und außerhalb der
// Workspace-Seiten (docs/ws/) – eigene Vorlage src/vorlagen/begleit.html
// (siehe tools/build.mjs), keine Workspace-Umschreibung der Verweise: die
// beiden iframe-Ziele werden hier direkt als "${PFAD}ws/<name>.html"
// geschrieben (P17, Schritt 2).
//
// Kein "?ansicht=app" und keine Tab-Leiste mehr (P15: das dafür gebaute
// nav.js/app-modus.css sind mit der Umstellung auf die appack-Hülle (P16)
// entfallen) – die beiden Telefonrahmen zeigen die Workspace-Seiten
// unverändert, wie appack sie auch in der App ausliefern würde.

// Diese Seite liegt immer unter "/app/" (Tiefe 1), daher immer "../" (siehe
// pfadZurWurzel() in tools/build.mjs).
const PFAD = "../";

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// ---------- Seitenkopf ----------

function seitenkopfAbschnitt() {
  return `<section class="abschnitt seitenkopf">
  <div class="container">
    <h1>In der App</h1>
    <p class="seitenkopf__lead">Die Vereins-App ist eine native App von appack mit eigener Startseite, eigenen Modulen (News, Kalender, Chat) und eigener Navigation. Workspace-Seiten erscheinen dort in einem eingebetteten Browserfenster ohne Website-Kopf, so wie hier. Die Kopfzeile der App mit Zurück-Pfeil ist nur angedeutet.</p>
  </div>
</section>`;
}

// ---------- Telefonrahmen ----------
// Baustein .telefon (P9) bleibt: derselbe gezeichnete Gerätefensterrahmen.
// Neu (P17): eine graue Leiste oben (.telefon-leiste, 44px, deutet die
// App-eigene Kopfzeile mit Zurück-Pfeil an) und darunter die Workspace-Seite
// als iframe fester Größe (390 × 780, .telefon-bildschirm), statt wie bisher
// eine Seite mit "?ansicht=app" über 100%/100% des Rahmens. Zwei Rahmen statt
// drei – Baustein .telefone-paar (P17) statt .telefone (P9): nebeneinander ab
// 900px, sonst untereinander, ohne die Seite horizontal scrollen zu lassen.
function telefonEintrag({ zurueck, ziel, titel, beschriftung }) {
  return `<div class="telefon-eintrag">
      <div class="telefon-skaliert">
        <div class="telefon">
          <div class="telefon-leiste">‹ ${escapeHtml(zurueck)}</div>
          <iframe class="telefon-bildschirm" loading="lazy" title="${escapeHtml(titel)}" src="${ziel}" width="390" height="780"></iframe>
        </div>
      </div>
      <p class="meta">${escapeHtml(beschriftung)}</p>
    </div>`;
}

function telefoneAbschnitt() {
  const rahmen = [
    telefonEintrag({
      zurueck: "Mannschaften",
      ziel: `${PFAD}ws/mannschaften-d2.html`,
      titel: "Mannschaft D2 als Workspace-Seite in der App",
      beschriftung: "Mannschaft D2 als Workspace-Seite in der App",
    }),
    // W6 (Entscheidung Olgay 23.09.2026): /spielplan/ ist jetzt eine
    // Weiterleitung auf /mannschaften/ (Spielplan & Tabelle stehen nur noch
    // je Mannschaftsseite) – das Beispiel zeigt deshalb die
    // Mannschaften-Übersicht statt der (sofort weiterleitenden) alten Seite.
    telefonEintrag({
      zurueck: "Mannschaften",
      ziel: `${PFAD}ws/mannschaften.html`,
      titel: "Mannschaften als Workspace-Seite in der App",
      beschriftung: "Mannschaften als Workspace-Seite in der App",
    }),
  ].join("\n      ");

  return `<section class="abschnitt">
  <div class="container">
    <div class="telefone-paar">
      ${rahmen}
    </div>
  </div>
</section>`;
}

// ---------- Hinweis CMS ----------

function hinweisAbschnitt() {
  return `<section class="abschnitt">
  <div class="container fluss">
    <p>Ob und an welcher Stelle die App diese Seiten einbindet, legt der Verein im CMS fest. Die Startseite der App (Kacheln) und die Module bleiben unverändert.</p>
  </div>
</section>`;
}

export function seite() {
  const inhalt = [
    seitenkopfAbschnitt(),
    telefoneAbschnitt(),
    hinweisAbschnitt(),
  ].join("\n");

  return {
    url: "/app/",
    title: "In der App",
    description:
      "Zwei Workspace-Seiten im Telefonrahmen, wie sie in der nativen Vereins-App von appack erscheinen: eingebettetes Browserfenster ohne Website-Kopf.",
    inhalt,
  };
}
