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
    <p class="seitenkopf__lead">Fassung der Vereins-App und Website vom ${escapeHtml(datenschutz.stand ?? "")}</p>
    <div class="hinweis hinweis--info">
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
  <div class="container">
    <div class="inhalt">
    <ol class="inhaltsverzeichnis">
      ${eintraege}
    </ol>
    </div>
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
// angewendet, nicht global auf alle 13 Abschnitte.
const ABSAETZE_GRUPPIEREN_TITEL = "Datenschutzhinweise";

// W8-Korrektur: "Zwischenfragen/Unterbegriffe als h3" (z. B. die Glossarbegriffe
// in "1. Begrifflichkeiten", die "Recht auf …"-Zwischentitel in "6. Routinemäßige
// Löschung …" oder "Auf welche Weise erheben wir Ihre Daten?" in
// "Datenschutzhinweise"). Löst die frühere Ungenauigkeit der reinen
// Längen-Heuristik auf (sie hätte "Ihre Rechte als betroffene Person" /
// "Recht auf Bestätigung" fälschlich zu einer <ul> gruppiert): diese Zeilen
// werden jetzt in data/datenschutz.json explizit mit dem Präfix "§H§ "
// markiert, statt aus Länge/Interpunktion geraten zu werden.
const UEBERSCHRIFT_PRAEFIX = "§H§ ";

function alsUeberschrift(text) {
  return text.startsWith(UEBERSCHRIFT_PRAEFIX) ? text.slice(UEBERSCHRIFT_PRAEFIX.length) : null;
}

function qualifiziertFuerListe(text) {
  const t = text.trim();
  return t.length > 0 && t.length <= 60 && !/[.!?:;,]$/.test(t);
}

// Baut aus einem absaetze-Array eine Liste von Blöcken ({typ:"absatz"},
// {typ:"liste"} oder {typ:"ueberschrift"}) – aufeinanderfolgende
// qualifizierende Einträge (mindestens zwei) werden zu einem "liste"-Block
// zusammengefasst, ein einzelner qualifizierender Eintrag ohne Nachbarn bleibt
// ein normaler Absatz. Mit "§H§ " markierte Einträge unterbrechen einen
// laufenden Listenblock immer und werden nie gruppiert.
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
    const ueberschrift = alsUeberschrift(p);
    if (ueberschrift !== null) {
      laufSchliessen();
      bloecke.push({ typ: "ueberschrift", text: ueberschrift });
    } else if (qualifiziertFuerListe(p)) {
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
    return absaetze
      .map((p) => {
        const ueberschrift = alsUeberschrift(p);
        return ueberschrift !== null ? `<h3>${escapeHtml(ueberschrift)}</h3>` : `<p>${escapeHtml(p)}</p>`;
      })
      .join("\n      ");
  }
  return gruppiereAbsaetze(absaetze)
    .map((block) => {
      if (block.typ === "liste") {
        return `<ul>
        ${block.eintraege.map((li) => `<li>${escapeHtml(li)}</li>`).join("\n        ")}
      </ul>`;
      }
      if (block.typ === "ueberschrift") {
        return `<h3>${escapeHtml(block.text)}</h3>`;
      }
      return `<p>${escapeHtml(block.text)}</p>`;
    })
    .join("\n      ");
}

function abschnittSection(abschnitt, index) {
  const absaetze = absaetzeHtml(abschnitt);
  const listeHtml = abschnitt.liste
    ? `<ul>
        ${abschnitt.liste.map((li) => `<li>${escapeHtml(li)}</li>`).join("\n        ")}
      </ul>`
    : "";
  // "absaetzeNachListe" (z. B. Abschnitt "2. Erfassung von allgemeinen Daten /
  // Informationen"): Absätze, die inhaltlich erst nach der Aufzählung folgen
  // ("Erfasst werden können …" muss direkt vor seiner Liste stehen) – ohne
  // dieses Feld unverändert leer.
  const absaetzeNachListeHtml = (abschnitt.absaetzeNachListe ?? [])
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join("\n      ");

  return `<section id="abschnitt-${index + 1}" class="abschnitt">
  <div class="container fluss">
    <div class="inhalt prosa fluss">
    <h2>${escapeHtml(abschnitt.titel)}</h2>
    ${absaetze}
    ${listeHtml}
    ${absaetzeNachListeHtml}
    </div>
  </div>
</section>`;
}

function quelleAbschnitt(datenschutz) {
  return `<section class="abschnitt">
  <div class="container fluss">
    <div class="inhalt fluss">
    <p class="meta">Quelle: ${escapeHtml(datenschutz.quelle ?? "")}</p>
    <p><a href="https://cdn.appack.de/sportfreunde04/workspace/Datenschutzerklaerung.html" rel="noopener" target="_blank">Zur Live-Fassung auf cdn.appack.de</a></p>
    </div>
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
      "Datenschutzerklärung des FFV Sportfreunde 04 für Website und Vereins-App, Fassung vom 17. Juli 2026.",
    inhalt,
    bodyclass: "datenschutz",
  };
}
