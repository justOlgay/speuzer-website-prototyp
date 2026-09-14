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

// P9-Korrektur A3: h1 brach bei 390px mitten im Wort
// ("DATENSCHUTZERKLÄRUN/G"). &shy; nach "Datenschutz" markiert die einzige
// sprachlich saubere Trennstelle; zusammen mit hyphens:manual auf
// .seitenkopf h1 (komponenten.css) bricht der Browser dort statt beliebig
// mitten im Wort (das bisherige overflow-wrap:anywhere aus base.css bleibt
// als Sicherheitsnetz bestehen).
function seitenkopfAbschnitt(datenschutz) {
  return `<section class="abschnitt seitenkopf">
  <div class="container">
    <h1>Datenschutz&shy;erklärung</h1>
    <p class="seitenkopf__lead">Fassung der Vereins-App vom ${escapeHtml(datenschutz.stand ?? "")}</p>
    <div class="hinweis hinweis--offen">
      <p style="margin:0;">${escapeHtml(datenschutz.hinweis ?? "")}</p>
    </div>
  </div>
</section>`;
}

// P9-Korrektur A3: Inhaltsverzeichnis lief über die volle Containerbreite,
// der Text darunter war auf 720px (.inhalt) eingerückt – jetzt ebenfalls in
// .inhalt, Einträge in .meta-Größe mit Zeilenabstand --sp-2
// (.inhaltsverzeichnis in komponenten.css). <ol> ohne Listenzahlen
// (list-style:none), weil die Titel bereits "1. …" tragen; die zwei Einträge
// ohne eigene Nummer ("Datenschutzhinweise", "Unsere Datenschutzerklärung")
// bleiben unverändert ohne Nummer – hier wird nichts nachnummeriert.
function inhaltsverzeichnisAbschnitt(abschnitte) {
  const eintraege = abschnitte
    .map((a, i) => `<li><a href="#abschnitt-${i + 1}">${escapeHtml(a.titel)}</a></li>`)
    .join("\n      ");

  return `<nav aria-label="Abschnitte">
  <div class="container inhalt">
    <ol class="inhaltsverzeichnis">
      ${eintraege}
    </ol>
  </div>
</nav>`;
}

// P9-Korrektur A3: Im Abschnitt "Datenschutzhinweise" standen mehrere
// Aufzählungen (z. B. "Name des Smartphones", "Modellbezeichnung", …) als
// einzelne absaetze-Einträge, dadurch mit vollem Absatzabstand statt als
// Liste. Regel aus dem Plan: aufeinanderfolgende absaetze-Einträge mit
// ≤ 60 Zeichen und ohne Satzzeichen am Ende werden zu einer <ul>
// zusammengefasst (Schwellenwert und Zeichentest exakt wie im Plan
// beschrieben). Bewusst nur für den namentlich genannten Abschnitt
// angewendet, nicht global auf alle 13 Abschnitte: dieselbe rein mechanische
// Regel würde in Abschnitt "6. Routinemäßige Löschung …" die beiden
// aufeinanderfolgenden Kurzzeilen "Ihre Rechte als betroffene Person" /
// "Recht auf Bestätigung" ebenfalls zu einer <ul> zusammenfassen – dort sind
// das aber Zwischenüberschriften vor einem langen Absatz, keine Aufzählung.
// Siehe Abschlussbericht, Abschnitt "Offene Fragen".
const ABSAETZE_GRUPPIEREN_TITEL = "Datenschutzhinweise";

function qualifiziertFuerListe(text) {
  const t = text.trim();
  return t.length > 0 && t.length <= 60 && !/[.!?:;,]$/.test(t);
}

// Baut aus einem absaetze-Array eine Liste von Blöcken ({typ:"absatz"} oder
// {typ:"liste"}) – aufeinanderfolgende qualifizierende Einträge (mindestens
// zwei) werden zu einem "liste"-Block zusammengefasst, ein einzelner
// qualifizierender Eintrag ohne Nachbarn bleibt ein normaler Absatz.
function gruppiereAbsaetze(absaetze) {
  const bloecke = [];
  let lauf = [];

  function laufSchliessen() {
    if (lauf.length >= 2) {
      bloecke.push({ typ: "liste", eintraege: lauf });
    } else if (lauf.length === 1) {
      bloecke.push({ typ: "absatz", text: lauf[0] });
    }
    lauf = [];
  }

  for (const p of absaetze) {
    if (qualifiziertFuerListe(p)) {
      lauf.push(p);
    } else {
      laufSchliessen();
      bloecke.push({ typ: "absatz", text: p });
    }
  }
  laufSchliessen();
  return bloecke;
}

function absaetzeHtml(abschnitt) {
  const absaetze = abschnitt.absaetze ?? [];
  if (abschnitt.titel !== ABSAETZE_GRUPPIEREN_TITEL) {
    return absaetze.map((p) => `<p>${escapeHtml(p)}</p>`).join("\n      ");
  }
  return gruppiereAbsaetze(absaetze)
    .map((block) =>
      block.typ === "liste"
        ? `<ul>
        ${block.eintraege.map((li) => `<li>${escapeHtml(li)}</li>`).join("\n        ")}
      </ul>`
        : `<p>${escapeHtml(block.text)}</p>`
    )
    .join("\n      ");
}

function abschnittSection(abschnitt, index) {
  const absaetze = absaetzeHtml(abschnitt);
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
