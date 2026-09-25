// Datenschutz /datenschutz/ (P8) – Datenschutzerklärung der Vereins-App
// (cdn.appack.de), für den Prototyp unverändert aus data/datenschutz.json
// übernommen (siehe dort: Stand, Quelle und Hinweis auf die noch fehlende
// juristische Prüfung).

import { mailLink, telefonAnzeige } from "../vorlagen/hilfen.mjs";

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
// W9-Korrektur (QA3 1440-7): Die Unterzeile "Fassung der Vereins-App und
// Website vom …" war schief formuliert ("Fassung … vom" – eine Fassung ist
// nicht "vom" einem Datum) – jetzt "Stand: … – gilt für Vereins-App und
// Website" (genauer Wortlaut aus w9-b.md).
// W10-Korrektur (QA4 web-1440-verein-und-rest Nr. 5/web-390-verein-und-rest
// Nr. 5): der Hinweiskasten stand nur ~6–8px unter der Unterzeile (auf
// anderen Seiten mit Hinweiskasten, z. B. verein-vorstand-01, sind es rund
// 70px) und wiederholte fast wörtlich, wofür die Erklärung gilt ("gilt für
// die Vereins-App und die Website …" gegen "gilt für Vereins‑App und
// Website" in der Unterzeile direkt darüber). Der Kasten (data/datenschutz.
// json, Feld "hinweis" – Seitengestaltung, kein Rechtstext) sagt jetzt nur
// noch, wer Fragen beantwortet.
// W10-Nachprüfung (offen 8): "margin-top:var(--sp-5)" (24px) reichte nicht
// – auf Vorstand (die genannte Vorlage) steht der Kasten nicht im Seitenkopf,
// sondern als eigener erster Inhaltsabschnitt danach (siehe hinweisAbschnitt()
// in vorstand.mjs), das ergibt den größeren Abstand zwischen zwei
// .abschnitt-Sektionen. Jetzt genauso: Kasten aus dem Seitenkopf gelöst.
function seitenkopfAbschnitt(datenschutz) {
  return `<section class="abschnitt seitenkopf">
  <div class="container">
    <h1>Datenschutz&shy;erklärung</h1>
    <p class="seitenkopf__lead">Stand: ${escapeHtml(datenschutz.stand ?? "")} – gilt für Vereins‑App und Website</p>
  </div>
</section>`;
}

function hinweisAbschnitt(datenschutz) {
  return `<section class="abschnitt">
  <div class="container">
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
// W9-Korrektur (QA3 1440-6/390-15): Die Punkte 1–11 sind inhaltlich
// Unterpunkte von "Unsere Datenschutzerklärung", standen im Verzeichnis aber
// gleichrangig – jetzt mit ".inhaltsverzeichnis__unterpunkt" eingerückt
// (rein optisch, gleiche flache <ol>, kein verschachteltes Markup nötig).
// W10-Korrektur (QA4 web-1440-verein-und-rest Nr. 4): "Ihre Rechte als
// betroffene Person" (Zwischenüberschrift in Kapitel 6, siehe
// GRUPPENUEBERSCHRIFT_PRAEFIX/IHRE_RECHTE_ANKER unten) fehlte bisher im
// Verzeichnis – der lange Abschnitt ließ sich nicht direkt anspringen. Jetzt
// als eigener, noch tiefer eingerückter Eintrag unter Kapitel 6.
// W10-Nachprüfung (offen 6, web-1440-verein-und-rest Nr. 4, zweiter Teil):
// das Verzeichnis rückte 1–11 unter "Unsere Datenschutzerklärung" ein – im
// Text sind "Datenschutzhinweise", "Unsere Datenschutzerklärung" und
// "1. …"–"11. …" aber gleich große H2 (keine echte Hierarchie). Verzeichnis
// jetzt flach, wie der Text; nur die echte Unterebene ("Ihre Rechte als
// betroffene Person" unter "6. …", ein h3 im Text) bleibt eingerückt.
function inhaltsverzeichnisAbschnitt(abschnitte) {
  const eintraege = abschnitte
    .map((a, i) => {
      const ihreRechteZusatz = a.titel.startsWith("6. Routinemäßige Löschung")
        ? `\n      <li class="inhaltsverzeichnis__unterpunkt inhaltsverzeichnis__unterpunkt--tief"><a href="#${IHRE_RECHTE_ANKER}">Ihre Rechte als betroffene Person</a></li>`
        : "";
      return `<li><a href="#abschnitt-${i + 1}">${escapeHtml(a.titel)}</a></li>${ihreRechteZusatz}`;
    })
    .join("\n      ");

  return `<nav id="inhaltsverzeichnis" aria-label="Abschnitte">
  <div class="container">
    <div class="inhalt">
    <ol class="inhaltsverzeichnis">
      ${eintraege}
    </ol>
    </div>
  </div>
</nav>`;
}

// W9-Korrektur (QA3 1440-19/390-15): Auf der sehr langen Seite gab es keinen
// Weg zurück zum Inhaltsverzeichnis – ein Link "Nach oben ›" am Ende jedes
// Abschnitts (zum <nav id="inhaltsverzeichnis"> oben, siehe seite()).
// W10-Korrektur (QA4 web-1440-verein-und-rest Nr. 8/web-390-verein-und-rest
// Nr. 9): "›" bedeutet auf der Website sonst "weiter/hin zu" (z. B. "E-Mail
// schreiben ›"), für einen Sprung NACH OBEN zeigt der Pfeil damit in die
// falsche Richtung. "↑" statt dessen.
function nachObenLink() {
  return `<p class="meta"><a href="#inhaltsverzeichnis">↑ Nach oben</a></p>`;
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

// W9-B-Nachprüfung (1440-18, zweiter Teil): "Ihre Rechte als betroffene
// Person" (Abschnitt "6. Routinemäßige Löschung …") ist eine Gruppen-
// überschrift für die folgenden Zwischentitel "Recht auf Bestätigung",
// "Recht auf Auskunft" usw. – stand bisher als gleich große "§H§"-Überschrift
// direkt über der ersten von ihnen, ohne eigenen Text und ohne optische
// Abstufung, wirkte dadurch wie ein weiterer gleichrangiger Zwischentitel
// statt wie deren gemeinsame Klammer. "§H2§ " markiert diese eine Zeile jetzt
// separat – bleibt aus Gründen der Dokument-Gliederung ein <h3> (kein
// zusätzliches <h2> mitten im Abschnitt), aber optisch eine Stufe größer,
// mit mehr Abstand nach oben.
const GRUPPENUEBERSCHRIFT_PRAEFIX = "§H2§ ";

function alsGruppenUeberschrift(text) {
  return text.startsWith(GRUPPENUEBERSCHRIFT_PRAEFIX) ? text.slice(GRUPPENUEBERSCHRIFT_PRAEFIX.length) : null;
}

// W10-Korrektur (QA4 web-1440-verein-und-rest Nr. 4): Sprungziel für den
// neuen Inhaltsverzeichnis-Eintrag (siehe inhaltsverzeichnisAbschnitt()
// oben) – es gibt in data/datenschutz.json nur eine "§H2§"-Zeile, ein
// einzelner fester Anker genügt.
const IHRE_RECHTE_ANKER = "ihre-rechte-als-betroffene-person";

// W9-Korrektur (QA3 1440-18/390-… "Aufzählungen als Listen", w9-b.md): die
// echten Aufzählungen unter "Recht auf Auskunft", "Recht auf Löschung" und
// "Recht auf Einschränkung der Verarbeitung" (Abschnitt "6. Routinemäßige
// Löschung …") standen als lose Absätze ohne Aufzählungszeichen – anders als
// bei "Datenschutzhinweise" reicht hier die Längen-Heuristik nicht (die
// DSGVO-Listenpunkte sind oft lang und enden mit einem Punkt). Die 18
// betroffenen Einträge sind in data/datenschutz.json deshalb von Hand mit
// dem Präfix "§L§ " markiert (gleiches Prinzip wie "§H§ " für Überschriften)
// – reine Formatierung, der Wortlaut ist unverändert.
const LISTENPUNKT_PRAEFIX = "§L§ ";

function alsListenpunkt(text) {
  return text.startsWith(LISTENPUNKT_PRAEFIX) ? text.slice(LISTENPUNKT_PRAEFIX.length) : null;
}

// W10-Korrektur (QA4 web-390-verein-und-rest Nr. 6): die "§H§"-Zwischentitel
// ("Recht auf Bestätigung", "Auf welche Weise erheben wir Ihre Daten?" u. a.)
// waren als einfaches <h3> praktisch gleich groß wie die nummerierten
// Kapitelüberschriften (<h2>, beide in derselben versalen Display-Schrift) –
// auf der sehr langen Rechtsseite ließ sich die Gliederung kaum noch
// erkennen. Jetzt als dritte Ebene deutlich kleiner, in der Fließtextschrift,
// halbfett, nicht versal (Vorschlag aus dem Befund). Gemeinsamer Baustein für
// beide Rendering-Pfade (allgemeineBloeckeHtml() unten und der
// "Datenschutzhinweise"-Zweig in absaetzeHtml()), damit beide gleich
// aussehen.
function unterUeberschriftHtml(text) {
  return `<h3 style="font-family:var(--font-text); text-transform:none; letter-spacing:normal; font-size:1.0625rem; font-weight:700;">${escapeHtml(text)}</h3>`;
}

// W9-Korrektur (QA3 1440-4/390-13, w9-b.md "Anschrift der verantwortlichen
// Stelle als Adressblock wie im Impressum"): Der Absatz mit Name, Anschrift,
// E-Mail, Telefon und Website der verantwortlichen Stelle (Abschnitt "1.
// Begrifflichkeiten") stand bisher als ein einziger Fließtext-Satz und brach
// mitten in der Adresse/Telefonnummer um, mit von Impressum/Kontakt
// abweichenden Schreibweisen ("Email:", "Webseite:", "+49 (0) 69 736868",
// "e.V."). In data/datenschutz.json markiert "§ADR§" diese Stelle jetzt nur
// noch (der Rohtext stand dort doppelt zu data/verein.json und war schon
// veraltet) – der Adressblock wird stattdessen aus derselben Quelle wie das
// Impressum gebaut, damit beide nie auseinanderlaufen können.
const ADRESSE_MARKER = "§ADR§";

function verantwortlicheStelleHtml(daten) {
  const verein = daten.verein ?? {};
  const sportstaette = verein.sportstaette ?? {};
  const name = String(verein.name_register ?? "").replace("Sportfreunde 1904", "Sportfreunde 1904");
  return `<dl class="angaben">
      <dt>Verantwortliche Stelle</dt>
      <dd>${escapeHtml(name)}<br>${escapeHtml(sportstaette.strasse ?? "")}<br>${escapeHtml(sportstaette.plz ?? "")} ${escapeHtml(sportstaette.ort ?? "")}</dd>

      <dt>E-Mail</dt>
      <dd><p style="margin:0;">${mailLink(verein.mail ?? "geschaeftsstelle@sportfreunde04.de")}</p></dd>

      <dt>Telefon</dt>
      <dd><p style="margin:0;"><a href="tel:${escapeHtml(String(verein.tel_geschaeftsstelle ?? "").replace(/[^\d+]/g, ""))}">${escapeHtml(telefonAnzeige(verein.tel_geschaeftsstelle))}</a></p></dd>

      <dt>Website</dt>
      <dd>www.sportfreunde04.de</dd>
    </dl>`;
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
    // W9-B-Nachprüfung (Datenschutzhinweise): "Push-Token je Betriebssystem,
    // APNs Token (iOS) bzw. FCM Token (Android)" ist inhaltlich derselbe
    // Aufzählungspunkt wie "Name des Smartphones" usw. davor, überschreitet
    // aber mit 73 Zeichen die 60-Zeichen-Schwelle von qualifiziertFuerListe()
    // – stand deshalb als loser Absatz nach der Liste, obwohl derselbe Punkt
    // in Abschnitt 2 (data/datenschutz.json, §L§-Mechanik) in der Liste
    // steht. "§L§ " erzwingt hier denselben Listenplatz, unabhängig von der
    // Länge – gleiches Prinzip wie "§H§ " für Überschriften.
    const listenpunkt = alsListenpunkt(p);
    if (ueberschrift !== null) {
      laufSchliessen();
      bloecke.push({ typ: "ueberschrift", text: ueberschrift });
    } else if (listenpunkt !== null) {
      lauf.push(listenpunkt);
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

// Für alle Abschnitte außer "Datenschutzhinweise" (siehe unten): §H§-
// Überschriften, §L§-Listenpunkte (zu einer <ul> zusammengefasst) und der
// §ADR§-Adressblock werden erkannt, alles andere bleibt ein normaler <p>.
function allgemeineBloeckeHtml(absaetze, daten) {
  const teile = [];
  let listenLauf = [];

  function listeSchliessen() {
    if (listenLauf.length) {
      teile.push(`<ul>
        ${listenLauf.map((li) => `<li>${escapeHtml(li)}</li>`).join("\n        ")}
      </ul>`);
      listenLauf = [];
    }
  }

  for (const p of absaetze) {
    const listenpunkt = alsListenpunkt(p);
    if (listenpunkt !== null) {
      listenLauf.push(listenpunkt);
      continue;
    }
    listeSchliessen();

    if (p === ADRESSE_MARKER) {
      teile.push(verantwortlicheStelleHtml(daten));
      continue;
    }
    const gruppenUeberschrift = alsGruppenUeberschrift(p);
    if (gruppenUeberschrift !== null) {
      // W10-Nachprüfung (offen 5, NEU): "1.7rem" fest war auf dem Handy
      // (390px) mit 27,5px größer als die Kapitel-H2 (26,3px, siehe
      // "@media (max-width:479.98px) h2" in base.css) – die Hierarchie kehrte
      // sich um. Jetzt eine eigene, auf beiden Breiten kleinere Klasse
      // (body.datenschutz h3.gruppenueberschrift, komponenten.css).
      teile.push(`<h3 id="${IHRE_RECHTE_ANKER}" class="gruppenueberschrift">${escapeHtml(gruppenUeberschrift)}</h3>`);
      continue;
    }
    const ueberschrift = alsUeberschrift(p);
    teile.push(ueberschrift !== null ? unterUeberschriftHtml(ueberschrift) : `<p>${escapeHtml(p)}</p>`);
  }
  listeSchliessen();
  return teile.join("\n      ");
}

function absaetzeHtml(abschnitt, daten) {
  const absaetze = abschnitt.absaetze ?? [];
  if (abschnitt.titel !== ABSAETZE_GRUPPIEREN_TITEL) {
    return allgemeineBloeckeHtml(absaetze, daten);
  }
  return gruppiereAbsaetze(absaetze)
    .map((block) => {
      if (block.typ === "liste") {
        return `<ul>
        ${block.eintraege.map((li) => `<li>${escapeHtml(li)}</li>`).join("\n        ")}
      </ul>`;
      }
      if (block.typ === "ueberschrift") {
        return unterUeberschriftHtml(block.text);
      }
      return `<p>${escapeHtml(block.text)}</p>`;
    })
    .join("\n      ");
}

function abschnittSection(abschnitt, index, daten) {
  const absaetze = absaetzeHtml(abschnitt, daten);
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
    ${nachObenLink()}
    </div>
  </div>
</section>`;
}

function quelleAbschnitt(datenschutz) {
  return `<section class="abschnitt">
  <div class="container fluss">
    <div class="inhalt fluss">
    <p class="meta">Quelle: ${escapeHtml(datenschutz.quelle ?? "")}</p>
    </div>
  </div>
</section>`;
}

export function seite(daten) {
  const datenschutz = daten.datenschutz ?? {};
  const abschnitte = datenschutz.abschnitte ?? [];

  const inhalt = [
    seitenkopfAbschnitt(datenschutz),
    hinweisAbschnitt(datenschutz),
    inhaltsverzeichnisAbschnitt(abschnitte),
    ...abschnitte.map((abschnitt, index) => abschnittSection(abschnitt, index, daten)),
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
