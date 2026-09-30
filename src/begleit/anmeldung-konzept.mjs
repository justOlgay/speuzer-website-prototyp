// Anmeldung neu gedacht /anmeldung-konzept/ (AP-6, 29.09.2026; Runde 3 am 30.09.2026) –
// Begleitseite für die 1. Vorsitzende und den Vorstand. Erklärt in etwa 10 Minuten,
// warum der Aufnahmeantrag nicht reicht, was der Anmelde-Assistent (Prototyp unter
// /anmeldung/) macht, was im PDF steht, welche Fälle es gibt, was an den bisherigen
// Unterlagen falsch oder veraltet ist, was der Verein entscheiden und beim HFV klären
// muss, was bei Karneval offen ist und wie die Einführung in Schritten aussieht.
//
// Inhaltliche Grundlage (Stand der Recherche 29.09.2026): die Recherche-Synthese und
// die Vollständigkeitsprüfung; wo die Prüfung korrigiert, gilt die Prüfung. Was dort
// als „offen“ oder „unsicher“ steht, steht auch hier als offen.
//
// Runde 3 (30.09.2026): Abgleich mit dem fertigen Prototyp.
//   - Abschnitte 3 bis 5 (Assistent, PDF, Unterschrift) beschreiben den Endstand:
//     Teile A/B/C, einheitliche Namen der Papiere („Spielrecht“ im Fließtext),
//     Satzungs-Haken, zweiter Elternteil, keine leeren Erklärungsfelder unter einer
//     Bildschirm-Unterschrift, Notfall- und Gesundheitsbogen (mit und ohne Angaben zur
//     Gesundheit, Absprache zur Medikamentengabe), Attest beim Vereinswechsel, Erlaubnis für Auftritte am Abend, lateinische Schrift,
//     Vorführung, Datenschutz.
//   - Die Listen in den Abschnitten 10 bis 12 spiegeln data/anmeldung.json ›
//     offenePunkte (Version 2026-09-29.2, O01 bis O71): jeder Punkt genau eine Zeile
//     mit der kleinen Nummer (Anker #o01 …). P1 steht immer sichtbar, P2 und P3 dürfen
//     in einem Aufklapper stehen. Die Prioritäten unten (PRIO) sind ein Abzug aus der
//     Datei; tools/anmeldung-test/konzept-pruefen.mjs vergleicht die gebaute Seite mit
//     der Datei und schlägt an, wenn beide auseinanderlaufen.
//   - Die Seite selbst liest nichts aus data/*.json: Regeln, Zahlen und offene Punkte
//     sind ein Datumsstand, kein Live-Wert.
//
// Liegt wie /vorher-nachher/ und /app/ außerhalb der Hülle (docs/index.html) und
// außerhalb der Workspace-Seiten (docs/ws/) – eigene Vorlage src/vorlagen/begleit.html,
// keine Umschreibung der Verweise. Kommt NICHT ins appack-Paket. Keine Personennamen,
// nur Rollen (öffentliches Repo). Keine Telefonnummern, keine E-Mail-Adressen.
//
// Kleine Auszeichnungssprache in den Texten (siehe md()):
//   **fett**   [Text](#anker)   {pflicht} {verein} {offen}   {p1} {p2} {p3}   {br}
//   {a:id} = Verweis „Abschnitt N“   {o:O26} = kleine Nummer eines offenen Punkts

// Diese Seite liegt immer unter "/anmeldung-konzept/" (Tiefe 1), daher "../".
const PFAD = "../";
const STAND_RECHERCHE = "29.09.2026";
const STAND_ABGLEICH = "30.09.2026";
const REGELWERK_VERSION = "2026-09-29.2";
const PROTOTYP = `${PFAD}anmeldung/`;

// Prioritäten der offenen Punkte (Abzug aus data/anmeldung.json › offenePunkte, Version 2026-09-29.2, O01 bis O71).
const PRIO = {
  O01: "P1", O02: "P1", O03: "P1", O04: "P1", O05: "P1", O06: "P1", O07: "P2", O08: "P1",
  O09: "P1", O10: "P1", O11: "P1", O12: "P1", O13: "P1", O14: "P1", O15: "P1", O16: "P1",
  O17: "P1", O18: "P1", O19: "P2", O20: "P1", O21: "P2", O22: "P2", O23: "P2", O24: "P1",
  O25: "P1", O26: "P1", O27: "P1", O28: "P1", O29: "P1", O30: "P1", O31: "P1", O32: "P2",
  O33: "P2", O34: "P2", O35: "P2", O36: "P2", O37: "P2", O38: "P2", O39: "P2", O40: "P2",
  O41: "P2", O42: "P2", O43: "P2", O44: "P2", O45: "P2", O46: "P2", O47: "P2", O48: "P2",
  O49: "P3", O50: "P3", O51: "P3", O52: "P3", O53: "P3", O54: "P2", O55: "P2", O56: "P3",
  O57: "P3", O58: "P2", O59: "P2", O60: "P2", O61: "P2", O62: "P1", O63: "P3", O64: "P3",
  O65: "P2", O66: "P1", O67: "P1", O68: "P1", O69: "P2", O70: "P2", O71: "P2",
};
const ANZAHL_PUNKTE = Object.keys(PRIO).length;

// Die Zeilen der Karnevalabteilung stehen im Abschnitt „Karneval“ und sind dort sichtbar;
// alle übrigen Punkte mit P2 oder P3 stehen in Aufklappern. Verweise (Links) auf eine Nummer
// gibt es nur, wenn die Zeile sichtbar ist. Ein Link auf eine eingeklappte Zeile führt ins Leere.
const IM_KARNEVAL = new Set(["O55", "O56", "O57"]);
const istSichtbar = (oid) => PRIO[oid] === "P1" || IM_KARNEVAL.has(oid);

// ---------- Text-Helfer ----------

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// Geschützte Leerzeichen zwischen Zahl und Einheit sowie nach §, Art., Nr. usw.,
// damit die Zeile nie zwischen „43,8“ und „%“ oder „§“ und „9“ umbricht.
function typo(text) {
  return String(text)
    .replace(/§ (?=\d)/g, "§ ")
    .replace(/\b(Art\.|Nr\.|Abs\.|Anhang|Folie|Folien|Seite|Zeile) (?=\d)/g, "$1 ")
    .replace(/(\d) (%|€)/g, "$1 $2")
    .replace(
      /(\d) (Uhr|Tage|Tagen|Wochen|Monate|Monaten|Jahre|Jahren|Stunden|Minuten|Wörter|Pixel|Spieljahr|Spieljahre)\b/g,
      "$1 $2"
    )
    .replace(
      /(\d{1,2})\. (?=(?:Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\b)/g,
      "$1. "
    );
}

const KENNZEICHEN = {
  pflicht: '<span class="tag tag--heim">Pflicht</span>',
  verein: '<span class="tag">Verein</span>',
  offen: '<span class="tag tag--warn">offen</span>',
  p1: '<span class="tag tag--heim">P1</span>',
  p2: '<span class="tag">P2</span>',
  p3: '<span class="tag tag--auswaerts">P3</span>',
};

// Kleine Nummer eines offenen Punkts. Als Link nur, wenn die Zeile sichtbar ist.
function onrMarke(oid, mitLinks) {
  if (!PRIO[oid]) throw new Error(`anmeldung-konzept: unbekannter offener Punkt "${oid}"`);
  return mitLinks && istSichtbar(oid)
    ? `<a class="konzept-onr" href="#${oid.toLowerCase()}">${oid}</a>`
    : `<span class="konzept-onr">${oid}</span>`;
}

// Fließtext mit kleiner Auszeichnung. mitLinks=false (Tabellenzellen): Verweise
// bleiben reiner Text, weil Links in Zellen als Tippziel mindestens 44 px
// hoch sein müssten (tools/pruefen.mjs nimmt nur Links in p und li aus).
function md(text, mitLinks = true) {
  let t = escapeHtml(typo(text));
  t = t.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  t = t.replace(/\{a:([a-z-]+)\}/g, (_m, id) => {
    const nr = nummerVon(id);
    return mitLinks ? `<a href="#${id}">Abschnitt ${nr}</a>` : `Abschnitt ${nr}`;
  });
  t = t.replace(/\{o:(O\d{2})\}/g, (_m, oid) => onrMarke(oid, mitLinks));
  t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  t = t.replace(/\{(pflicht|verein|offen|p1|p2|p3)\}/g, (_m, k) => KENNZEICHEN[k]);
  t = t.replaceAll("{br}", "<br>");
  return t;
}

// ---------- Baustein-Helfer ----------

const p = (text) => `<p>${md(text)}</p>`;

function liste(punkte, { geordnet = false, klasse = "" } = {}) {
  const tag = geordnet ? "ol" : "ul";
  const zeilen = punkte.map((t) => `<li>${md(t)}</li>`).join("\n    ");
  return `<${tag} class="konzept-liste${klasse ? " " + klasse : ""}">
    ${zeilen}
  </${tag}>`;
}

// art: "" (weiß), "info" (blau) oder "offen" (Klärungsbedarf). inhalt: fertiges HTML.
function kasten(art, inhalt) {
  const zusatz = art ? ` hinweis--${art}` : "";
  return `<div class="hinweis${zusatz} inhalt fluss konzept-box">
    ${inhalt}
  </div>`;
}

// Aufklapper für Punkte mit P2 oder P3. Er ist ein normales <details>: ohne Skript,
// mit der Tastatur bedienbar, in der Druckansicht offen (siehe STIL).
function aufklapper(titel, inhalt) {
  return `<details class="konzept-mehr">
    <summary>${escapeHtml(titel)}</summary>
    ${inhalt}
  </details>`;
}

// „P2“, „P3“ oder „P2 und P3“ – je nachdem, was in der Liste vorkommt.
function prioText(oids) {
  const arten = [...new Set(oids.map((o) => PRIO[o]))].sort();
  return arten.join(" und ");
}

// Tabelle im horizontal scrollbaren Rahmen (.tabelle-wrap). Zellen sind Texte
// mit Auszeichnung (md) oder { html } (fertiges, sicheres HTML). breit: mehr Mindestbreite
// bei vielen Spalten oder Text.
// Eine Zeile ist eine Liste von Zellen oder ein Objekt { id, prio, zellen }.
// Zeilen mit id bekommen den Anker (#o26) und data-prio.
function tabelle({ beschriftung, spalten, zeilen, breit = false, ersteSpalte = "" }) {
  const kopf = spalten.map((s) => `<th scope="col">${escapeHtml(s)}</th>`).join("");
  const koerper = zeilen
    .map((z) => {
      const zellen = Array.isArray(z) ? z : z.zellen;
      const attr = Array.isArray(z)
        ? ""
        : `${z.id ? ` id="${z.id}"` : ""}${z.prio ? ` data-prio="${z.prio}"` : ""}`;
      return `<tr${attr}>${zellen.map((zelle) => `<td>${typeof zelle === "string" ? md(zelle, false) : zelle.html}</td>`).join("")}</tr>`;
    })
    .join("\n        ");
  const klasse = `tabelle-wrap konzept-tabelle${breit ? " konzept-tabelle--breit" : ""}${
    ersteSpalte ? " konzept-tabelle--" + ersteSpalte : ""
  }`;
  return `<div class="${klasse}" role="region" aria-label="${escapeHtml(beschriftung)}" tabindex="0">
      <table>
        <caption class="sr-only">${escapeHtml(beschriftung)}</caption>
        <thead><tr>${kopf}</tr></thead>
        <tbody>
        ${koerper}
        </tbody>
      </table>
    </div>`;
}

// Zweite Zelle einer Entscheidungszeile: die Entscheidung fett, das Warum darunter. So passt die
// Liste auch auf dem Handy in die Breite, ohne seitliches Wischen.
function frageUndWarum(entscheidung, warum) {
  return { html: `<p class="konzept-frage">${md(entscheidung, false)}</p><p class="konzept-warum">${md(warum, false)}</p>` };
}

// Zeile einer Entscheidungstabelle für einen offenen Punkt: Priorität und kleine Nummer
// in der ersten Zelle, dann die Entscheidung mit dem Warum.
function punktZeile(oid, entscheidung, warum) {
  if (!PRIO[oid]) throw new Error(`anmeldung-konzept: unbekannter offener Punkt "${oid}"`);
  return {
    id: oid.toLowerCase(),
    prio: PRIO[oid],
    zellen: [`{${PRIO[oid].toLowerCase()}}{br}{o:${oid}}`, frageUndWarum(entscheidung, warum)],
  };
}

// Liste mit kleiner Nummer vor jedem Text. punkte: [[oids, text], …]; oids ist eine Nummer oder eine
// Liste. Die erste Nummer in `eigene` (Menge) trägt den Anker der Zeile, alle anderen sind Verweise.
function nummernListe(punkte, { eigene = null } = {}) {
  const zeilen = punkte
    .map(([oids, text]) => {
      const liste2 = Array.isArray(oids) ? oids : [oids];
      const anker = eigene ? liste2.find((o) => eigene.has(o)) : liste2[0];
      const marken = liste2.map((o) => (o === anker ? `<span class="konzept-onr">${o}</span>` : onrMarke(o, true))).join(" ");
      const attr = anker ? ` id="${anker.toLowerCase()}" data-prio="${PRIO[anker]}"` : "";
      return `<li${attr}><span class="konzept-oliste__nr">${marken}</span> <span class="konzept-oliste__text">${md(text)}</span></li>`;
    })
    .join("\n    ");
  return `<ul class="konzept-oliste">
    ${zeilen}
  </ul>`;
}

// ---------- Gliederung ----------

const ABSCHNITTE = [
  { id: "kurz", titel: "Kurz gesagt" },
  { id: "warum", titel: "Warum der Aufnahmeantrag nicht reicht" },
  { id: "assistent", titel: "So funktioniert der Assistent" },
  { id: "pdf", titel: "Was im PDF steht" },
  { id: "unterschrift", titel: "Die Unterschrift" },
  { id: "faelle", titel: "Welche Fälle es gibt" },
  { id: "gelernt", titel: "Was wir an unserer bisherigen Liste gelernt haben" },
  { id: "wartefristen", titel: "Wartefristen in Kürze" },
  { id: "datenschutz", titel: "Datenschutz und Aufbewahrung" },
  { id: "entscheiden", titel: "Was der Verein entscheiden muss" },
  { id: "hfv-fragen", titel: "Was wir beim HFV (Passstelle) fragen sollten" },
  { id: "karneval", titel: "Karneval – KA Schnauzer" },
  { id: "einfuehrung", titel: "Einführung in Schritten" },
  { id: "quellen", titel: "Quellen mit Stand" },
];

function nummerVon(id) {
  const i = ABSCHNITTE.findIndex((a) => a.id === id);
  if (i < 0) throw new Error(`anmeldung-konzept: unbekannter Abschnitt "${id}"`);
  return i + 1;
}

// Rahmen eines Abschnitts: abwechselnd Seitenhintergrund und weiße Fläche,
// halber Abschnittsrand (.abschnitt--kompakt) wie bei langen Listen auf der Website.
function abschnitt(id, inhalt) {
  const nr = nummerVon(id);
  const titel = ABSCHNITTE[nr - 1].titel;
  const hell = nr % 2 === 0 ? " abschnitt--hell" : "";
  const nachOben = nr > 1 ? `\n    <p class="meta"><a href="#verzeichnis">Zum Inhaltsverzeichnis</a></p>` : "";
  return `<section class="abschnitt abschnitt--kompakt${hell}" id="${id}" aria-labelledby="${id}-titel">
  <div class="container fluss prosa konzept">
    <h2 id="${id}-titel">${nr}. ${escapeHtml(titel)}</h2>
    ${inhalt}${nachOben}
  </div>
</section>`;
}

// ---------- Fragen an den HFV (zuerst, weil andere Abschnitte darauf verweisen) ----------

// Alle offenen Punkte, die die Passstelle beantworten muss (an: "hfv_passstelle" in
// data/anmeldung.json, Version 2026-09-29.2), in der Reihenfolge der Nummern. Der Wortlaut
// folgt der Datei; O07 gilt als weitgehend geklärt.
const HFV_PUNKTE = [
  ["O01", "Reicht ein Scan oder eine digitale Unterschrift, oder muss das Papier-Original mit Stift vorliegen? Darf der Verein rein digital archivieren?"],
  ["O02", "Sind die Zusatzerklärung „To Player's Parents“ und die Länderformulare (USA, Mexiko, Argentinien, Brasilien, Balkan) noch nötig?"],
  ["O03", "Brauchen Nichtdeutsche unter 10 Jahren Ausweis und Meldebescheinigung? Zählt für die Grenze von 10 Jahren das Alter am Tag des Antrags?"],
  ["O04", "Sind beim Wechsel innerhalb Hessens Meldebescheinigung und Attest für Nichtdeutsche von 10 bis 17 Jahren wirklich nötig? Das Formular sagt ja, die Präsentation 2026 nennt sie nicht."],
  ["O05", "Braucht es beim Wechsel deutscher Minderjähriger Geburtsurkunde und Attest? Der Wortlaut von JO § 9 Nr. 1 und das Formular widersprechen sich."],
  ["O06", "Attest: Wie alt darf es höchstens sein? Welchen Inhalt muss es haben? Welche Rechtsgrundlage gilt für die Verarbeitung (Art. 9 DSGVO)? Werden Atteste aus dem Ausland angenommen?"],
  ["O07", "**Weitgehend geklärt.** Die Vollmacht für die Abmeldung ist außerhalb des Junis nutzbar, mit den normalen Wartefristen. Folie 4 der Präsentation 2026 ist mehrdeutig. Bitte kurz bestätigen lassen."],
  ["O08", "Welche Wartefrist gilt für den jüngeren D-Jahrgang: 6 Monate (HFV-JO) oder höchstens 3 Monate (DFB-JO § 3 Nr. 3 b)?"],
  ["O09", "Doppelstaatler mit deutschem Pass: Welche Staatsangehörigkeit wird im Verbandssystem eingetragen? Müssen ausländische Urkunden übersetzt werden?"],
  ["O10", "Deutscher Ausweis bei einem internationalen Wechsel oder bei Rückkehrern: Darf der Verein die Kopie hochladen, obwohl § 20 PAuswG die Weitergabe verbietet? Reicht die Bestätigung, dass der Verein das Original gesehen hat?"],
  ["O11", "Genügt ein Elternteil als Unterschrift, oder müssen beide unterschreiben? Muss ein kleines Kind selbst auf der Zeile „Spieler“ unterschreiben?"],
  ["O12", "Welche Nachweise braucht es bei Vormund, Pflegefamilie, Verwandten und unbegleiteten Geflüchteten?"],
  ["O13", "Wie lange dauert die Bearbeitung, national und international? Gibt es ein Mindestalter für die G-Jugend?"],
  ["O14", "Reicht eine Meldebescheinigung mit nur einem Elternteil, zum Beispiel bei Alleinerziehenden oder wenn ein Elternteil im Ausland lebt? Wie alt darf die Bescheinigung sein?"],
  ["O15", "Welche Nachweise braucht es genau bei geflüchteten Kindern ohne Eltern, Austauschschülern und Kindern bei Verwandten?"],
  ["O16", "Gilt die Grenze „10. Lebensjahr“ ab dem 9. oder ab dem 10. Geburtstag?"],
  ["O17", "Welche Nachweise braucht es bei Nichtdeutschen unter 10 Jahren für die Prüfung nach FIFA Art. 19 Abs. 6?"],
  ["O18", "Geht die Vollmacht für die Abmeldung auch beim Wechsel aus einem anderen Landesverband?"],
  ["O19", "Ist ein Spielerfoto mit religiöser Kopfbedeckung zulässig, wenn das Gesicht frei ist?"],
  ["O20", "A-Junioren unter 18 bei den Herren: Genügt ein Arzt, oder braucht es einen vom Verband anerkannten Sportarzt (DFB-JO § 6 Nr. 2)?"],
  ["O21", "Wie läuft das Sonderspielrecht für Frauen bei den Herren nach SpO § 109a ab, mit welchem Formular? Wird das Pilotprojekt verlängert?"],
  ["O22", "Wechsel von Herren aus einem anderen Landesverband: 20 Tage (DFB) oder 30 Tage (HFV), bis die Abmeldung als ordnungsgemäß gilt?"],
  ["O23", "Gilt für Altersgrenzen der Tag der Anmeldung oder der Tag des Antragseingangs beim Verband?"],
  ["O60", "Wartefrist nach Monaten: Die Passstelle rechnet „Abmeldedatum plus Monate plus 1 Tag“ (Folie 16). Die JO rechnet nach den Regeln des BGB (Beginn am Tag nach der Abmeldung). Beide Wege unterscheiden sich am Monatsende um einen Tag. Der Assistent nimmt den späteren Tag."],
  ["O61", "Wegfall der Wartefrist nach mehr als 6 Monaten ohne Pflichtspiel: Der Assistent rechnet nur, wenn der Zeitraum am Tag des Antrags schon vorbei ist. Darf der Verein den Antrag später stellen, um die Wartefrist zu vermeiden?"],
  ["O62", "Deutsche Rückkehrer ab 10 Jahren: Gilt „zuletzt Wohnsitz im Ausland“ auch, wenn das Kind seit vielen Jahren wieder in Deutschland lebt? Der Assistent löst das internationale Verfahren aus, sobald „im Ausland gewohnt“ mit Ja beantwortet wird."],
];
const HFV_P1 = HFV_PUNKTE.filter(([o]) => PRIO[o] === "P1");
const HFV_WEITERE = HFV_PUNKTE.filter(([o]) => PRIO[o] !== "P1");

// ---------- Kopf ----------

function kopfAbschnitt() {
  return `<section class="abschnitt seitenkopf konzept">
  <div class="container fluss">
    <p class="seitenkopf__kicker"><span class="tag tag--warn">Entwurf zur Abstimmung im Vorstand</span></p>
    <h1>Anmeldung neu gedacht – ein Assistent statt eines Formulars</h1>
    <p class="seitenkopf__lead">${md(
      "Heute meldet eine Familie ihr Kind mit dem Aufnahmeantrag an. Der Antrag fragt nur einen Teil dessen ab, was Verband und Verein wissen müssen. Ein Anmelde-Assistent stellt Schritt für Schritt nur die Fragen, die im jeweiligen Fall nötig sind. Am Ende steht ein vollständiges PDF für die Familie und den Verein."
    )}</p>
    <p class="knopfzeile"><a class="knopf" href="${PROTOTYP}">Prototyp ansehen</a></p>
    <p class="meta">${md(
      `Stand der Recherche: ${STAND_RECHERCHE}. Abgeglichen mit dem Prototyp am ${STAND_ABGLEICH} (Regelwerk Version ${REGELWERK_VERSION} mit ${ANZAHL_PUNKTE} offenen Punkten). Grundlage sind die Ordnungen des Hessischen Fußball-Verbands (HFV) für die Saison 2026/27, die Vereinsunterlagen und weitere Quellen ({a:quellen}). Der Prototyp ist ein Entwurf zum Anschauen. Er sendet und speichert nichts. Die Seite ersetzt keine Rechtsberatung.`
    )}</p>
    ${kasten(
      "",
      `<p><strong>So lesen Sie die Kennzeichen</strong></p>
    ${p("{pflicht} Verband, FIFA oder Gesetz schreiben es vor.")}
    ${p("{verein} Regel oder Praxis des Vereins.")}
    ${p("{offen} Nicht belegt oder unsicher. Wir müssen nachfragen.")}
    ${p("{p1} {p2} {p3} Dringlichkeit eines offenen Punkts. P1 muss vor dem Livegang geklärt sein.")}
    <p><span class="konzept-onr">O26</span> Nummer des offenen Punkts im Regelwerk des Prototyps. Damit können wir im Gespräch auf eine Zeile verweisen.</p>
    <p class="meta">${md(
      "Kürzel: JO = Jugendordnung des HFV. SpO = Spielordnung des HFV. DFB = Deutscher Fußball-Bund. DFBnet = Online-System des DFB, in dem Vereine Anträge einreichen. LSB = Landessportbund Hessen."
    )}</p>`
    )}
  </div>
</section>`;
}

// ---------- 1. Kurz gesagt ----------

function inhaltsverzeichnis() {
  const punkte = ABSCHNITTE.map(
    (a, i) => `<li><a href="#${a.id}">${i + 1}. ${escapeHtml(a.titel)}</a></li>`
  ).join("\n      ");
  return `<nav id="verzeichnis" aria-label="Inhalt dieser Seite">
      <p class="meta"><strong>Springen zu</strong></p>
      <ol class="inhaltsverzeichnis konzept-toc">
      ${punkte}
      </ol>
    </nav>`;
}

function kurzAbschnitt() {
  const inhalt = `${liste([
    "**Das Problem.** Der Aufnahmeantrag fragt vieles nicht ab, was der HFV für das Spielrecht braucht. Fehlende Angaben und Unterlagen müssen einzeln nachgefordert werden. Dazu sind Vereinsunterlagen von 2014 und 2021 veraltet. {a:warum}",
    "**Die Lösung.** Ein Assistent im Browser fragt Schritt für Schritt in Einfacher Sprache. Er bietet Übersetzungshilfe auf Englisch, Türkisch und Arabisch. Am Ende erzeugt er ein PDF mit allen Unterlagen. Ein Prototyp zum Ausprobieren liegt vor. {a:assistent}, {a:pdf}",
    "**Die Unterschrift.** Vereinsunterlagen unterschreibt die Familie am Bildschirm, nachdem sie die Satzung gelesen hat. Die Vordrucke des HFV unterschreibt sie mit Stift, denn der Verband verlangt die eigenhändige Unterschrift. {a:unterschrift}",
    "**Der Vorstand entscheidet zuerst:** Wie sichern wir den Unfallschutz beim Probetraining ({o:O27})? Wann beginnt die Mitgliedschaft ({o:O30})? Was gilt für die Unterschrift der Eltern ({o:O26})? Wo liegen die Originale ({o:O24})? Dazu kommen die Bildschirm-Unterschrift der Vereinsunterlagen ({o:O68}) und die Rechtsgrundlage für die Notfallkontakte ({o:O67}). {a:entscheiden}",
    `**Beim HFV zu klären:** ${HFV_PUNKTE.length} Fragen an die Passstelle, ${HFV_P1.length} davon mit P1. Die P1-Fragen sollten vor dem Livegang beantwortet sein. {a:hfv-fragen}`,
    "**Beim Karneval eilt es.** Der Meldeschluss für den Fastnachtszug 2027 ist der 30.09.2026 ({o:O29}). Dazu laufen zwei Anmeldewege parallel ({o:O28}). {a:karneval}",
  ])}
    ${kasten(
      "info",
      `${p("**Wenig Zeit?** In 10 Minuten lesen Sie die Abschnitte 1, 3, 5, 10 und 13.")}
    ${p("Die Abschnitte 6 bis 8 und 14 sind Tabellen zum Nachschlagen.")}`
    )}
    ${inhaltsverzeichnis()}`;
  return abschnitt("kurz", inhalt);
}

// ---------- 2. Warum ----------

function warumAbschnitt() {
  const inhalt = `${p(
    "Der Aufnahmeantrag ist richtig und nötig. Ohne Mitgliedschaft gibt es kein Spielrecht (JO § 9 Nr. 1). Für aktive Fußballer braucht es aber ein zweites Formular: den „Antrag auf Spielerlaubnis“ des Verbands. Der Vordruck heißt „Antrag auf Spielerlaubnis / Vereinswechsel“. Er gilt für Erstanmeldung und Wechsel. Den Antrag stellt immer der Verein. Die Familie liefert Unterschriften und Nachweise."
  )}
    ${p("Der Aufnahmeantrag fragt nicht ab, was der Antrag auf Spielerlaubnis und DFBnet brauchen:")}
    ${liste([
      "Staatsangehörigkeit und Geschlecht",
      "Geburtsort (in DFBnet ein Pflichtfeld)",
      "bisheriger Verein und Verband",
      "Abmeldetag, letztes Spiel und laufende Sperre",
      "die Sorgeberechtigten. Auf Seite 2 gibt es nur ein Unterschriftsfeld ohne Hinweis auf sie. Satzung § 6 und JO § 3 Nr. 1 verlangen die Zustimmung der Sorgeberechtigten.",
    ])}
    ${p(
      "So entsteht Nacharbeit. Dazu sind die Vereinsunterlagen veraltet: Das Info-Blatt und die Zusatzerklärung stammen von 2014, die Unterlagenliste von 2021. Sie widersprechen sich teils. Ein Beispiel ist die Aufnahmegebühr: Der Antrag 2026 zieht sie mit dem ersten Beitrag ein, die Liste von 2021 nennt Barzahlung. Auch die Satzungsadresse im Aufnahmeantrag führt ins Leere ({o:O66})."
    )}
    ${kasten(
      "info",
      `${p(
        "**Sprache.** Im Stadtteil Gallus hatten Ende 2025 rund 44 Prozent der Einwohner eine ausländische Staatsangehörigkeit (43,8 %). In ganz Frankfurt sind es 32,1 %. Weitere 28,0 % im Gallus sind Deutsche mit Migrationshintergrund."
      )}
    ${p(
      "Wir haben keine übersetzten HFV-Formulare gefunden. Die Zahl sagt aber nicht, welche Sprache zu Hause gesprochen wird. Deshalb legt der Verein die Sprachen selbst fest ({a:assistent})."
    )}
    <p class="meta">${md(
      "Quelle: Statistikportal Frankfurt, Tabelle „Migrationshintergrund (Stadtteile)“, Stadtteil Gallus, Stichtag 31.12.2025 (eigene Summe). Frankfurt insgesamt: Statistik aktuell 05/2026."
    )}</p>`
    )}`;
  return abschnitt("warum", inhalt);
}

// ---------- 3. So funktioniert der Assistent ----------

// Die sieben Abschnitte, die oben auf jeder Seite des Prototyps stehen (assets/js/anmeldung/seiten.js).
const SCHRITTE = [
  [
    "Person",
    "Wer wird angemeldet: das Kind oder Sie selbst? Der Assistent fragt nach Name und Geburtsdatum. Daraus berechnet er Alter und Altersklasse. Gibt es für den Jahrgang keine Mannschaft, verweist er an die Jugendleitung ({o:O54}).",
  ],
  [
    "Fußball oder Karneval",
    "Fußball, Karneval, beides oder nur Förderer. Bei Fußball fragt er nach Mannschaft, Spielen, Spielerpass und Wechsel, Pass und Wohnort, Sorgerecht und Besonderem. Die Antworten entscheiden, welche Unterlagen der Verband verlangt. Bei Karneval fragt er nach Gruppe, Turnieren und Abendauftritten.",
  ],
  [
    "Kontakt",
    "Anschrift, E-Mail und Telefon. Bei Kindern tragen die Eltern ihre eigenen Daten ein.",
  ],
  [
    "Beitrag",
    "Der Assistent schlägt die Beitragsgruppe vor und nennt den Beitrag. Er fragt nach Familienmitgliedern, nach Leistungen vom Amt (Bildung und Teilhabe) und nach der Zahlung: Lastschrift oder Rechnung.",
  ],
  [
    "Unterlagen",
    "Die Familie entscheidet über die Erlaubnis für Fotos, die Erlaubnis für Name und Foto im Internet, Fahrten und Messenger-Gruppe. Bei Kindern nennt sie einen Notfallkontakt und wählt, ob sie einen Gesundheitsbogen ausfüllt. Eine Liste zeigt „Habe ich“ und „Fehlt noch“. Die Familie fotografiert jeden Nachweis mit dem Handy oder wählt eine Datei. Auch das Spielerfoto entsteht hier.",
  ],
  [
    "Unterschrift",
    "Die Familie wählt: am Bildschirm oder auf Papier. Vor der Bildschirm-Unterschrift setzt sie den Haken bei der Satzung. Vereinsunterlagen unterschreibt sie am Bildschirm, die Vordrucke des HFV mit Stift ({a:unterschrift}).",
  ],
  [
    "Fertig",
    "Die Familie prüft alle Angaben und ändert, was nicht stimmt. Dann baut der Assistent das PDF ({a:pdf}). Es zeigt auch, was noch fehlt und wie es weitergeht.",
  ],
];

function assistentAbschnitt() {
  const schritte = SCHRITTE.map(
    ([titel, text]) => `<li>
        <div class="schritt__inhalt">
          <p><strong>${escapeHtml(titel)}</strong></p>
          <p>${md(text)}</p>
        </div>
      </li>`
  ).join("\n      ");
  const inhalt = `${p(
    `Der Assistent stellt eine Frage pro Seite. Er zeigt nur die Fragen, die im jeweiligen Fall nötig sind. Oben auf jeder Seite stehen sieben Abschnitte. Den Ablauf können Sie im [Prototyp](${PROTOTYP}) mit Beispielfällen durchklicken.`
  )}
    <ol class="schritte">
      ${schritte}
    </ol>
    <h3>Was der Assistent außerdem bietet</h3>
    ${liste([
      "**Einfache Sprache.** Kurze Sätze mit höchstens 12 Wörtern, Sie-Form, Fachwörter einmal erklärt. Der Text orientiert sich an DIN 8581-1 (Niveau A2 bis B1). „Leichte Sprache“ nennen wir ihn erst, wenn eine Prüfgruppe ihn getestet hat.",
      "**Sprachwahl.** Der deutsche Text ist verbindlich. Englisch, Türkisch und Arabisch sind eine Übersetzungshilfe. Arabisch läuft von rechts nach links. Das PDF bleibt deutsch. Muttersprachler sollen die Übersetzungen vor dem Livegang prüfen.",
      "**Nur lateinische Schrift.** Namen und alle Felder, die ins PDF gehen, schreibt die Familie mit lateinischen Buchstaben, so wie im Pass. Nummern schreibt sie mit den Ziffern 0 bis 9. Die Schrift im PDF kennt keine anderen Zeichen. Bei anderen Zeichen bittet der Assistent, die Angabe zu ändern.",
      "**Sprachen des Vereins.** Der Verein wählt die Sprachen aus. Als erste Stufe schlagen wir vor: Deutsch, Englisch, Türkisch, Arabisch, Ukrainisch, Rumänisch, Bulgarisch, Dari/Farsi und Kroatisch/Serbisch/Bosnisch. Zu prüfen sind Albanisch, Spanisch, Italienisch und Tigrinya. Die Rangfolge legen wir nach einer kurzen Abfrage bei den Trainern oder im Mitgliederbestand fest.",
      "**Hilfe-Knopf.** Auf jeder Seite steht an derselben Stelle ein Hilfe-Knopf mit den Kontaktdaten des Vereins. Ansprechpersonen, Sprachen und Sprechzeiten im Vereinsheim müssen wir noch festlegen, und die Ansprechpersonen müssen zustimmen. {o:O52} {offen}",
      "**Ehrliche Grenzen.** Wo eine Regel nicht sicher ist, sagt der Assistent das: „Vielleicht nötig – der Verein sagt Ihnen Bescheid.“ Auf dem Laufzettel steht der Punkt dann als „klären“. Fristen schätzt der Assistent nur ({a:wartefristen}).",
      "**Nichts wird gesendet oder gespeichert.** Alle Angaben und Fotos bleiben im Browser. Fotos werden dort neu kodiert, das entfernt Standort- und Kameradaten. Ein Knopf löscht alle Angaben. Ob ein Zwischenstand gespeichert werden soll, entscheidet der Verein später. Die Beispiele im Prototyp nutzen nur erfundene Daten. Ihre Telefonnummern stammen aus der Liste der Bundesnetzagentur für Medien.",
      "**Vorführung.** Der Knopf „Vorführung“ öffnet auf jeder Frageseite fünf Beispiele und die Sicht des Vereins. Ein Beispiel füllt alle Angaben aus. Die Sicht des Vereins zeigt bei Unterlagen und Fristen die Quelle. Der Knopf ist für die Vorführung gedacht, nicht für Familien.",
    ])}`;
  return abschnitt("assistent", inhalt);
}

// ---------- 4. Was im PDF steht ----------

function pdfAbschnitt() {
  const inhalt = `${p("Der Assistent erzeugt ein einziges PDF mit drei Teilen. Jeder Teil hat einen anderen Empfänger.")}
    ${tabelle({
      beschriftung: "Die drei Teile des PDF",
      spalten: ["Teil", "Für wen", "Was drinsteht"],
      breit: true,
      ersteSpalte: "label",
      zeilen: [
        [
          "**Teil A – Für Sie**",
          "Bleibt bei der Familie.",
          "Anleitung in Einfacher Sprache. Übersicht „Wo unterschreiben Sie?“. Liste „Das fehlt noch“. Wartezeit, Hinweise und Kontakte. „So geht es weiter“.",
        ],
        [
          "**Teil B – Für den Verein**",
          "Wird im Verein abgegeben.",
          "Laufzettel als Deckblatt. Aufnahmeantrag mit Erlaubnis für Fotos und Erlaubnis für die Lastschrift. Liste der Familienmitglieder. Information zum Datenschutz. Antrag auf Spielerlaubnis, ausgefüllt. Vollmacht für die Abmeldung oder Abmeldung beim alten Verein. Weitere Einverständnisse und Erlaubnisse: Einverständnis für Spiele bei den Herren, Einverständnis für Mädchen bei den Jungen, Einverständnis für Fahrten und Messenger-Gruppe, Erlaubnis für Auftritte am Abend. Seite mit dem Spielerfoto. Kopien der Nachweise mit Wasserzeichen.",
        ],
        [
          "**Teil C – Vertraulich, getrennt abgeben**",
          "Attest nur für das Passwesen. Notfall- und Gesundheitsbogen nur für Trainer und Betreuer.",
          "Trennblatt mit der Anleitung für den Umschlag. Attest vom Arzt: die Vorlage „Ärztliche Bescheinigung (Attest)“ oder die Kopie des Attests. Erlaubnis für das Attest. Notfall- und Gesundheitsbogen, freiwillig.",
        ],
      ],
    })}
    ${liste([
      "**Laufzettel.** Das Deckblatt für den Verein fasst den Fall zusammen. Es nennt Alter, Altersklasse, vorhandene und fehlende Unterlagen und die geschätzte Wartefrist. Dazu stehen dort alle Punkte, die der Verein klären muss. Auch das, was der Vorstand noch bestätigen muss: zum Beispiel die Bildschirm-Unterschrift und die Freigabe der Entwurfsblätter. Teil A für die Familie enthält keine Paragrafen. Die Quellen zeigt der Prototyp in der Sicht des Vereins.",
      "**Antrag auf Spielerlaubnis.** Das ist das offizielle, ausfüllbare PDF des Verbands. Der Assistent befüllt es. Die Felder des Vereins und die Bearbeitungsvermerke bleiben leer. Die Stellen für die Unterschrift sind blau markiert. Auf Seite 3 steht die freiwillige Erlaubnis für Name und Foto im Internet.",
      "**Attest vom Arzt.** Bei der Erstanmeldung Minderjähriger verlangt der Verband ein Attest (JO § 9 Nr. 1). Beim Vereinswechsel ist offen, ob er es verlangt ({o:O04}, {o:O05}). Hat die Familie ein Attest, kommt die Erlaubnis für das Attest mit ins PDF. Ist das Attest Pflicht und fehlt es, liegt die Vorlage für die Ärztin oder den Arzt bei. Auf dem Attest steht nur „keine Bedenken“. Diagnosen gehören nicht ins PDF.",
      "**Notfall- und Gesundheitsbogen.** Er ist freiwillig und nur für Kinder. Die Familie nennt zuerst einen Notfallkontakt und wählt dann, ob sie einen Gesundheitsbogen ausfüllt. Mit Angaben zur Gesundheit gilt die ausdrückliche Einwilligung nach Art. 9 DSGVO. Ohne Angaben zeigt der Bogen nur die Notfallkontakte. Die Rechtsgrundlage dafür klärt der Vorstand ({o:O67}). Die Absprache zur Medikamentengabe unterschreiben eine Person mit Sorgerecht und der Trainer immer getrennt mit Stift.",
      "**Erlaubnis für Auftritte am Abend.** Sie gehört zum Karneval. Die Eltern erlauben Auftritte am Abend. Sie geben an, wer das Kind abholt und ab wann es allein nach Hause darf („allein nach Hause ab … Uhr“). Beide Fragen sind freiwillig. Wer beim Heimweg „Ja“ wählt, nennt auch die Uhrzeit. Wer nicht antwortet, sieht auf dem Blatt „–“. So ergänzt später niemand etwas von Hand.",
      "**Wasserzeichen.** Jede Kopie eines Nachweises trägt den Vermerk „KOPIE“ mit dem Zweck, dem Namen des Vereins und dem Datum. So lässt sich die Kopie nicht anders verwenden.",
      "**Spielerfoto.** Es steht auf einer eigenen Seite. Zusätzlich gibt es das Foto als JPG-Datei für den Upload in DFBnet.",
    ])}
    ${p("Was aus Datenschutzgründen nicht ins PDF gehört, steht in {a:datenschutz}.")}`;
  return abschnitt("pdf", inhalt);
}

// ---------- 5. Unterschrift ----------

function unterschriftAbschnitt() {
  const inhalt = `${p("Nicht jede Unterschrift darf am Bildschirm stehen. Deshalb gibt es zwei Wege und einen Sonderfall.")}
    ${tabelle({
      beschriftung: "Wege für die Unterschrift",
      spalten: ["Unterlagen", "So wird unterschrieben", "Grund"],
      breit: true,
      ersteSpalte: "label",
      zeilen: [
        [
          "**Vereinsunterlagen:** Aufnahmeantrag mit Erlaubnis für Fotos und Erlaubnis für die Lastschrift, Information zum Datenschutz (Kenntnisnahme), Einverständnisse und Erlaubnisse des Vereins",
          "Am Bildschirm, mit Finger oder Maus.",
          "Die Form bestimmt der Verein selbst. Die Satzung verlangt Schriftform. Nach § 127 BGB kann dafür auch eine elektronische Übermittlung reichen. Der Online-Aufnahmeantrag arbeitet schon so. Der Vorstand muss es noch bestätigen ({o:O68}). {offen}",
        ],
        [
          "**Vordrucke des HFV:** Antrag auf Spielerlaubnis, Vollmacht für die Abmeldung, Abmeldung beim alten Verein, Einverständnis für Spiele bei den Herren",
          "Mit Stift auf Papier.",
          "Beim Wechsel Minderjähriger verlangt JO § 37 Nr. 2 die „eigenhändige Unterschrift auf dem Antragsformular“. SpO § 92 verlangt den „unterzeichneten Original-Antrag“ und 2 Jahre Aufbewahrung. Laut Passstelle 2026 (Folie 6) muss das Papier bei der Antragstellung vorliegen.",
        ],
        [
          "**Immer mit Stift:** Attest der Ärztin oder des Arztes, Stempel des Vereins, Absprache zur Medikamentengabe",
          "Mit Stift, durch die jeweilige Person.",
          "Die Ärztin oder der Arzt unterschreibt und stempelt das Attest. Der Verein unterschreibt und stempelt den Antrag auf Spielerlaubnis. Die Absprache zur Medikamentengabe unterschreiben Eltern und Trainer getrennt.",
        ],
      ],
    })}
    ${p(
      "Eine am Bildschirm gezeichnete Unterschrift ist rechtlich eine einfache elektronische Signatur. Gleichgestellt ist nur die qualifizierte elektronische Signatur (eIDAS Art. 25). Für den HFV-Teil reicht die gezeichnete Unterschrift deshalb nicht sicher."
    )}
    <h3>So läuft die Unterschrift im Assistenten</h3>
    ${liste([
      "**Wahl.** Die Familie wählt „Am Bildschirm, wo es erlaubt ist“ oder „Ich unterschreibe alles auf Papier“.",
      "**Satzung zuerst.** Vor der Bildschirm-Unterschrift liest die Familie die Satzung und setzt den Haken „Ich habe die Satzung gelesen.“ Der Haken ist Pflicht. Der Link führt auf die Satzung der Website, nicht auf die Adresse im Vordruck. Die Adresse im Vordruck ist defekt ({o:O66}). Auf dem Papierweg ist der Haken freiwillig. Dann kreuzt die Familie das Kästchen im Ausdruck von Hand an.",
      "**Zweiter Elternteil.** Seine Unterschrift ist freiwillig. Dem Verband reicht eine Unterschrift. Wir empfehlen beide. Leben die Eltern getrennt und der andere Elternteil ist nicht einverstanden, ist seine Unterschrift nötig. Sie geht nur mit Stift, und die Stelle im PDF ist markiert.",
      "**Keine leeren Erklärungsfelder.** Eine Bildschirm-Unterschrift steht nur unter Angaben, die schon dastehen. Auf den eigenen Blättern des Vereins steht „–“ oder ein Satz statt eines leeren Feldes. Fehlt auf dem Aufnahmeantrag eine Erklärung, zum Beispiel zu den Fotos, zur IBAN oder zur Liste der Familienmitglieder, wird die Stelle zur Stift-Stelle. So ergänzt nach der Unterschrift niemand etwas von Hand.",
      "**Stift-Blätter.** Die Vordrucke des HFV kommen vorausgefüllt ins PDF, die Stellen sind blau markiert. Die Familie wählt: Sie unterschreibt beim ersten Training und der Verein bringt die Blätter ausgedruckt mit, oder sie druckt selbst aus.",
      "**Umstellbar.** Jedes Formular hat einen Schalter. Erlaubt die Passstelle Bildschirm-Unterschriften, ändern wir nur den Schalter ({o:O01}).",
    ])}
    <h3>Wer unterschreibt?</h3>
    ${liste([
      "Für den Antrag auf Spielerlaubnis genügt ein gesetzlicher Vertreter (SpO § 92 Nr. 1). Ob auch ein kleines Kind selbst auf der Zeile „Spieler“ unterschreiben muss, ist offen ({o:O11}).",
      "Nach Zivilrecht vertreten Eltern ihr Kind gemeinsam (§ 1629 BGB).",
      "**Empfehlung:** Beide Eltern unterschreiben. Oder ein Elternteil bestätigt, dass der andere einverstanden ist. Bei „alleiniges Sorgerecht“ unterschreibt eine Person.",
      "Bei getrennt lebenden Eltern entscheidet der Elternteil, bei dem das Kind lebt, Alltagsfragen allein (§ 1687 BGB). Ob der Vereinsbeitritt dazu zählt, sagt das Gesetz nicht. {offen} Der Assistent fragt deshalb, ob der andere Elternteil einverstanden ist.",
      "Bei Vormund, Pflegefamilie oder Heim klärt die Jugendleitung persönlich ({a:faelle}).",
      "Die Regel für den Verein legt der Vorstand fest ({o:O26}, {a:entscheiden}).",
      "Die Erlaubnis für Fotos unterschreiben bisher nur die Eltern. Ob Jugendliche ab 14 oder ab 16 Jahren zusätzlich selbst unterschreiben, entscheidet der Vorstand ({o:O65}).",
    ])}`;
  return abschnitt("unterschrift", inhalt);
}

// ---------- 6. Fälle ----------

// F01–F18 heißen wie in data/anmeldung.json › faelle (Version 2026-09-29.2). Die Hinweise
// stammen aus der Synthese (Abschnitt 2.3) und der Vollständigkeitsprüfung (F15–F18 und die
// Korrekturen K3, K4, K6, K7); die Verweise O.. nennen den offenen Punkt zur jeweiligen Lücke.
const FAELLE = [
  [
    "**F01** Nur Karneval",
    "Aufnahmeantrag mit Erlaubnis für die Lastschrift und Erlaubnis für Fotos. Je nach Fall: Liste der Familienmitglieder, Nachweis für Azubis oder Studierende, Erlaubnis für Auftritte am Abend (die Eltern übertragen die Aufsicht an eine erwachsene Person), Leihvereinbarung für das Kostüm.",
    "Kein Antrag auf Spielerlaubnis und kein Attest. Nimmt eine Gruppe an Turnieren teil, kommen Tanzausweis und Zustimmung zu Aufnahmen dazu ({o:O56}). {offen}",
  ],
  [
    "**F02** Passive Mitgliedschaft, Förderer oder Senator",
    "Aufnahmeantrag mit Erlaubnis für die Lastschrift. Senator nur als Antrag.",
    "Der Vorstand entscheidet über Senatoren. Die Satzung kennt sie nicht ({o:O34}). {offen}",
  ],
  [
    "**F03** Kind neu im Fußball, deutsch",
    "Antrag auf Spielerlaubnis, Geburtsurkunde, Attest vom Arzt, digitales Spielerfoto.",
    "Keine Wartefrist. Im Kreis Frankfurt brauchen auch G- und F-Kinder ein Spielrecht, wenn sie an Spielen, Turnieren oder Festivals teilnehmen. Auch Doppelstaatler mit deutschem Pass gehören hierher. Welche Staatsangehörigkeit im Verbandssystem steht, ist zu klären ({o:O09}). {offen}",
  ],
  [
    "**F04** Kind neu im Fußball, nichtdeutsch, unter 10 Jahren",
    "Wie F03. Ob Ausweis und Meldebescheinigung (Bescheinigung des Bürgeramts über den Wohnsitz) nötig sind, ist unklar ({o:O03}). {offen}",
    "Ein Freigabeschein ist nicht nötig. Der Verband prüft vor der Registrierung, ob eine FIFA-Ausnahme oder die 5-Jahres-Regel greift (Art. 19 Abs. 6). Welche Nachweise er dafür will, ist noch zu klären ({o:O17}). {offen}",
  ],
  [
    "**F05** Kind neu im Fußball, nichtdeutsch (oder Rückkehrer) ab 10 Jahren",
    "Wie F03. Dazu Ausweiskopie und Meldebescheinigung (gemeinsamer Wohnsitz mit den Eltern in Deutschland).",
    "Der DFB gibt frei. Das Spielrecht kommt erst danach, das dauert länger. Ob ein Elternteil für die Meldebescheinigung reicht, ist noch zu klären ({o:O14}). {offen} Das Verfahren gilt ab 10 Jahren auch für Kinder mit deutschem Pass, die zuletzt im Ausland wohnten. Ob das auch gilt, wenn sie seit vielen Jahren wieder in Deutschland leben, ist offen ({o:O62}). {offen}",
  ],
  [
    "**F06** Wechsel innerhalb des HFV, Kind deutsch",
    "Antrag auf Spielerlaubnis, Abmeldung beim alten Verein (Einschreiben) oder Vollmacht für die Abmeldung, Foto. Dazu die Kündigung beim alten Verein.",
    "Freigabe (Zustimmung des alten Vereins) und Wartefrist nach JO §§ 35 und 38 ({a:wartefristen}). Ob Geburtsurkunde und Attest nötig sind, ist noch zu klären ({o:O05}). {offen}",
  ],
  [
    "**F07** Wechsel innerhalb des HFV, Kind nichtdeutsch",
    "Wie F06. Dazu Ausweiskopie. Bei 10 bis 17 Jahren auch Meldebescheinigung und Attest.",
    "Beim Wechsel innerhalb Hessens sind Meldebescheinigung und Attest unklar: Das Formular sagt ja, die Präsentation 2026 nennt sie nicht ({o:O04}). {offen}",
  ],
  [
    "**F08** Wechsel aus einem anderen Landesverband",
    "Wie F06. Standard ist das Einschreiben.",
    "Der HFV fragt beim Verband des alten Vereins an. Nach 20 Tagen ohne Antwort gilt die Abmeldung als ordnungsgemäß (JO § 43, Jugend). Bei den Herren nennt der HFV 30 Tage, der DFB 20 Tage ({o:O22}). {offen} Ob die Vollmacht für die Abmeldung hier geht, ist nicht belegt ({o:O18}). {offen}",
  ],
  [
    "**F09** Wechsel aus dem Ausland, Verein bekannt",
    "Ausweis und Angaben zum Auslandsverein (Name, Ort, Land, Status, letztes Spiel). Bei Junioren auch Geburtsurkunde, Attest und Meldebescheinigung.",
    "Im Ausland ist keine Abmeldung nötig (SpO § 99 Nr. 1). Ab 10 Jahren gibt der DFB frei (Freigabeschein, international „ITC“). Unter 10 ist kein Freigabeschein nötig. Ob der Verein die Kopie eines deutschen Ausweises hochladen darf, ist zu klären ({o:O10}). {offen}",
  ],
  [
    "**F10** Herren neu, deutsch",
    "Antrag auf Spielerlaubnis und Foto.",
    "Keine Wartefrist. Ein Attest ist nur eine Vereinsregel (Info-Blatt), keine Pflicht des Verbands ({o:O42}).",
  ],
  [
    "**F11** Herren neu, nichtdeutsch oder aus dem Ausland",
    "Wie F10. Dazu Ausweiskopie. Bei einem Auslandsverein ein internationaler Wechsel.",
    "Die Aufenthaltserlaubnis ist erst ab der Regionalliga Pflicht (SpO § 91 Nr. 6).",
  ],
  [
    "**F12** Herren, Wechsel",
    "Wie F06, nach den Regeln der Wechselperioden.",
    "Nächste Möglichkeit ist Wechselperiode II: Abmeldung bis 31.12.2026, Unterlagen bis 31.01.2027.",
  ],
  [
    "**F13** A-Jugend unter 18 hilft bei den Herren aus",
    "Einverständnis für Spiele bei den Herren (HFV-Vordruck vom 10.06.2025) und Attest.",
    "Grundsätzlich nur der ältere A-Jahrgang (2008), der Jahrgang 2009 nur in Ausnahmefällen. Ein Arzt ist Pflicht. Ob ein Sportarzt nötig ist, ist noch zu klären ({o:O20}). {offen}",
  ],
  [
    "**F14** Sonderfall bei Sorgerecht oder Aufenthalt",
    "Nachweis der Vormundschaft (Bestellungsurkunde oder schriftliche Übertragung). Bei Geflüchteten Nachweis des Schutzstatus.",
    "Die Jugendleitung klärt persönlich. Die Anmeldung wird nicht blockiert. Die genaue HFV-Liste ist noch zu klären ({o:O12}). {offen}",
  ],
  [
    "**F15** Geflüchtetes Kind ohne Eltern in Deutschland",
    "Nachweis von Schutzstatus oder Aufenthalt, Bestellung des Vormunds, Einwilligung des Vormunds.",
    "FIFA-Ausnahme d (Art. 19 Abs. 2 d). Welche Nachweise der HFV genau will, ist noch zu klären ({o:O12}, {o:O15}). {offen} Der Assistent macht keine Zusage zu Spielen.",
  ],
  [
    "**F16** Austauschschüler ohne Eltern",
    "Unterlagen zum Austauschprogramm mit Dauer, Einwilligung der Gasteltern und der Eltern, Bestätigung der Rückkehr.",
    "FIFA-Ausnahme e. Das Spielrecht gilt höchstens 1 Jahr, ein weiterer Wechsel ist nicht erlaubt. Nur bei einem reinen Amateurverein. Die genaue HFV-Liste ist noch zu klären ({o:O12}, {o:O15}). {offen}",
  ],
  [
    "**F17** Kind bei Verwandten oder in Pflegefamilie ohne Schutzstatus",
    "Nachweis, dass das Kind seit 5 Jahren ununterbrochen in Deutschland wohnt (Wohnsitznachweis, nicht älter als 3 Monate) und noch nie registriert war.",
    "Nur unter dieser Bedingung möglich. Sonst gilt: Training ja, Spiele wahrscheinlich erst mit 18. Auch Freundschaftsspiele gehen nicht. Der Umzug der Eltern (Ausnahme a) zählt nicht für Verwandte. Die genaue HFV-Liste ist noch zu klären ({o:O12}, {o:O15}). {offen}",
  ],
  [
    "**F18** EU-Jugendliche mit 16 oder 17 Jahren ohne Eltern",
    "Wie F17.",
    "Die FIFA-Ausnahme für 16- bis 18-Jährige in der EU kann der FFV nicht erfüllen: Der Verein müsste Ausbildung, Schule, Unterkunft und Betreuer stellen und einer der obersten FIFA-Ausbildungskategorien angehören.",
  ],
];

function faelleAbschnitt() {
  const inhalt = `${p(
    `Der Assistent kennt ${FAELLE.length} Fälle. Der Fall bestimmt, welche Unterlagen nötig sind. Zu jedem Fall gehören Aufnahmeantrag und Erlaubnis für die Lastschrift oder Rechnung. Bei Fußball kommt die freiwillige Erlaubnis für Name und Foto im Internet dazu. Für Kinder gibt es den freiwilligen Notfall- und Gesundheitsbogen. Die Tabelle nennt, was zusätzlich nötig ist.`
  )}
    ${tabelle({
      beschriftung: "Die 18 Fälle des Assistenten",
      spalten: ["Fall", "Was zusätzlich nötig ist", "Hinweis"],
      breit: true,
      ersteSpalte: "label",
      zeilen: FAELLE,
    })}
    ${kasten(
      "offen",
      `${p("**Kinder ohne Eltern in Deutschland (F15 bis F18).** Hier sagt der Assistent ehrlich, was möglich ist und was nicht.")}
    ${p(
      "Die FIFA kennt für Minderjährige fünf Ausnahmen. Verwandte zählen nicht dazu. Möglich ist es sonst nur mit der 5-Jahres-Regel: Das Kind lebt seit 5 Jahren ununterbrochen in Deutschland und war noch nie registriert."
    )}
    ${p(
      "Ist das nicht der Fall, sagt der Assistent klar: Training ja, Spiele vielleicht nicht. Im Kreis Frankfurt dürfen Spieler ohne Spielrecht auch keine Freundschaftsspiele bestreiten. Der Assistent macht keine Zusage. Die Jugendleitung spricht persönlich mit der Familie, und die Anmeldung läuft weiter."
    )}`
    )}
    <h3>Weitere Sonderfälle</h3>
    ${liste([
      "**Mädchen im Jungenteam der B- oder C-Jugend:** Die Eltern geben das Einverständnis für Mädchen bei den Jungen (JO § 14 Nr. 6).",
      "**Juniorinnen unter 18:** Für jedes Spielrecht braucht es ein ärztliches Attest (SpO § 110).",
      "**Frauen ab 18 bei den Herren:** Sonderspielrecht auf Antrag (SpO § 109a, Pilotprojekt bis 30.06.2028). Der FFV hat keine Frauenmannschaft. Der Ablauf ist zu klären ({o:O21}).",
      "**Geschlecht „divers“ oder „ohne Angabe“:** Die Person wählt Frauen- oder Herrenteam (SpO § 91 Nr. 8 und 9). Die Jugendleitung und die Vertrauensperson des HFV begleiten den Antrag.",
      "**Behinderung:** Sonderspielrecht in einer jüngeren Altersklasse mit fachärztlichem Gutachten (JO § 11 Nr. 5). Die HFV-Gebühr beträgt 25 €.",
      "**Wechsel in den letzten 6 Monaten oder laufende Sperre:** Die Wartefrist verschiebt sich ({a:wartefristen}).",
    ])}
    <h3>Altersklassen 2026/27</h3>
    ${p("Der Assistent rechnet den Jahrgang in die Altersklasse um (Kreisjugendausschuss Frankfurt). Für Altersgrenzen wie „unter 18“ oder „ab 10 Jahren“ zählt der Tag der Anmeldung. Ob der Verband denselben Tag nimmt, ist offen ({o:O23}). {offen}")}
    ${tabelle({
      beschriftung: "Altersklassen und Jahrgänge 2026/27",
      spalten: ["Altersklasse", "G", "F", "E", "D", "C", "B", "A"],
      zeilen: [["**Jahrgänge**", "2020 und jünger", "2018, 2019", "2016, 2017", "2014, 2015", "2012, 2013", "2010, 2011", "2008, 2009"]],
    })}
    ${p(
      "Für die Jahrgänge 2010 bis 2013 hat der Verein 2026/27 keine Mannschaft. Der Assistent verweist diese Familien an die Jugendleitung. Was er ihnen genau sagt, ist noch zu klären ({o:O54}). {offen}"
    )}`;
  return abschnitt("faelle", inhalt);
}

// ---------- 7. Was wir gelernt haben ----------

// Kurzfazit der Synthese (Abschnitt 1) mit den Korrekturen der Vollständigkeitsprüfung.
const GELERNT = [
  [
    "Geburtsurkunde brauchen nur ausländische Kinder.",
    "**Falsch.** Bei der Erstanmeldung ist sie Pflicht für alle Minderjährigen (JO § 9 Nr. 1). Sie belegt aber nicht die Staatsangehörigkeit. Beim Wechsel deutscher Kinder ist es noch zu klären ({o:O05}). {offen}",
  ],
  [
    "Das Attest verlangen wir als Verein.",
    "**Falsch.** Der HFV verlangt es bei Minderjährigen (JO § 9 Nr. 1). Jeder Arzt genügt. Es gilt außerdem für Juniorinnen unter 18 (SpO § 110) und für A-Junioren unter 18, die bei den Herren spielen (JO § 29). Bei Erwachsenen ist es nur eine Vereinsregel.",
  ],
  [
    "Meldebescheinigung und Pass für Nichtdeutsche jeden Alters bei der Erstanmeldung.",
    "**Der HFV verlangt sie nur von 10 bis 17 Jahren.** Die Meldebescheinigung muss den gemeinsamen Wohnsitz von Kind und Eltern zeigen. Für Kinder unter 10 ist beides noch zu klären ({o:O03}, {o:O17}). Beim Wechsel braucht der HFV den Ausweis von allen Nichtdeutschen, egal wie alt. {offen}",
  ],
  [
    "Eine Ausweiskopie gehört zur Anmeldung.",
    "**Nicht von deutschen Kindern.** Kopien deutscher Ausweise dürfen nicht weitergegeben werden (§ 20 PAuswG, § 18 PassG). Bei internationalen Wechseln ist die Frage noch zu klären ({o:O10}). {offen}",
  ],
  [
    "Ein Passbild auf Papier für den Spielerpass.",
    "**Überholt.** Den Spielerpass gibt es nur digital. Das Spielerfoto ist ein JPG oder PNG im Format 3:4, mindestens 375 Pixel breit. Es muss vor dem ersten Spiel in DFBnet liegen und kommt bei jedem Wechsel neu. Im Kreis Frankfurt gilt es 2 Jahre. Ein Papierfoto braucht der HFV nicht.",
  ],
  [
    "Zum Wechsel gehört die Vollmacht für die Abmeldung.",
    "**Eine von mehreren Varianten.** Die Vollmacht für die Abmeldung ist ein HFV-Vordruck für DFBnet Pass Online. Die andere Variante ist die Abmeldung beim alten Verein per Einschreiben: Der Einlieferungsbeleg genügt, ein Einwurf-Einschreiben zählt nicht. Der alte Verein kann auch selbst in DFBnet abmelden. Nach SpO § 92 Nr. 2 ist die Vollmacht das ganze Jahr nutzbar. Außerhalb des Junis gelten die normalen Wartefristen. Die Passstelle schreibt: Nutzung „nur bis zum 30. Juni mit verkürzter Wartefrist“. Das ist mehrdeutig, wir lassen es bestätigen ({o:O07}). Der Abmeldetag ist der Tag der Eingabe im System. Jeder Tag Verzögerung verlängert die Wartefrist.",
  ],
  [
    "Nicht auf der Liste: die Kündigung beim alten Verein.",
    "**Sie kommt extra.** Die Mitgliedschaft im alten Verein muss gesondert gekündigt werden. Der Vordruck „Abmeldung beim alten Verein“ hat dafür ein eigenes Kästchen. Der Austritt eines Minderjährigen gilt nur mit der Unterschrift des gesetzlichen Vertreters (JO § 3 Nr. 2). Der alte Verein darf bis zum Ende seiner Kündigungsfrist Beitrag verlangen.",
  ],
  [
    "Die Zusatzerklärung für Spieler von 12 bis 18 Jahren.",
    "**Überholt.** Der HFV nennt sie nicht mehr, und die Altersgrenze liegt heute bei 10. Sie ist ein Vordruck von 2014. Auf dem Antrag auf Spielerlaubnis steht: „weitere Dokumente sind ab sofort nicht einzureichen“. Ob die Passstelle sie doch anfordert, ist noch zu klären ({o:O02}). {offen}",
  ],
  [
    "Zusatzformulare für Spieler aus USA, Mexiko, Argentinien und Brasilien.",
    "**Unklar.** Sie stehen nicht auf der HFV-Formularseite. Wenn überhaupt, betreffen sie internationale Wechsel. Wir verlangen sie nur, wenn die Passstelle sie anfordert ({o:O02}). Die Anmeldung wird nicht blockiert. {offen}",
  ],
  [
    "Der Pass mit Freigabe und Stempel.",
    "**Überholt.** Den Spielerpass gibt es nur noch digital.",
  ],
  [
    "Die 20 € gehen an den HFV.",
    "**Falsch.** Die Erstausstellung beim HFV ist gebührenfrei. Die 20 € sind das Eintrittsgeld des Vereins ({o:O43}). Der HFV verlangt beim Wechsel Gebühren: 10 € für Junioren, 25 € für Herren. Die zahlt der Verein.",
  ],
  [
    "Der Aufnahmeantrag reicht für die Mitgliedschaft.",
    "**Richtig, mit einer Lücke.** Ohne Mitgliedschaft gibt es kein Spielrecht. Auf Seite 2 fehlt aber der Hinweis auf die Sorgeberechtigten (Satzung § 6, JO § 3 Nr. 1).",
  ],
  [
    "Die Erlaubnis für die Lastschrift (SEPA) gehört immer dazu.",
    "**Vereinssache, keine Pflicht des Verbands.** Ohne Erlaubnis für die Lastschrift bekommt die Familie eine Rechnung. Der Zuschlag von 3 € ohne Lastschrift steht im Info-Blatt von 2014, nicht im Aufnahmeantrag 9/2026. Der Verein muss ihn bestätigen ({o:O38}). {offen}",
  ],
];

const FEHLTE_GANZ = [
  "Die Erlaubnis für Name und Foto im Internet, Seite 3 des Antrags auf Spielerlaubnis. Sie betrifft den Namen auf FUSSBALL.DE bei Kindern unter 16 und das Foto. Beides ist freiwillig.",
  "Angaben zum Vereinswechsel: alter Verein, Abmeldetag, letztes Spiel, laufende Sperre.",
  "Der Weg bei Auslandsbezug: Ist ein Verein im Ausland bekannt, läuft ein internationaler Wechsel. Bei Nichtdeutschen ab 10 Jahren holt der HFV über den DFB eine Freigabe ein. Das Spielrecht kommt erst danach.",
  "Das Einverständnis für Spiele bei den Herren, mit Attest, für A-Jugendliche unter 18, die bei den Herren aushelfen.",
  "Die Information zum Datenschutz nach Art. 13 DSGVO, die Erlaubnis für das Attest und ein freiwilliger Notfall- und Gesundheitsbogen.",
  "Die Versicherungslücke beim Probetraining ({a:entscheiden}).",
  "Sonderfälle: Vormund, Pflegefamilie, Geflüchtete ohne Eltern, Mädchen im Jungenteam der B- oder C-Jugend, Sonderspielrecht bei Behinderung.",
  "Beitragsfälle: Liste der Familienmitglieder, Nachweis für Azubis und Studierende (nur Karneval), Beleg für Bildung und Teilhabe, Beitragserlass nach Satzung § 16.",
  "Ein eigener Zweig für die Karnevalabteilung ({a:karneval}).",
];

function gelerntAbschnitt() {
  const inhalt = `${p(
    "Wir haben unsere bisherige Liste gegen die Ordnungen des HFV geprüft. Vieles stimmt. Manches ist falsch oder überholt."
  )}
    ${tabelle({
      beschriftung: "Bisher gedacht und tatsächlich",
      spalten: ["Bisher gedacht", "Tatsächlich"],
      breit: true,
      ersteSpalte: "label",
      zeilen: GELERNT,
    })}
    <h3>Was auf der Liste ganz fehlte</h3>
    ${liste(FEHLTE_GANZ)}`;
  return abschnitt("gelernt", inhalt);
}

// ---------- 8. Wartefristen ----------

// Prüfregeln R1–R9, R11–R13 der Synthese, mit L2 (Vollmacht) der Prüfung.
const WARTEFRISTEN = [
  [
    "**Neu im Fußball** (noch nie ein Spielerpass)",
    "Keine Wartefrist. Jederzeit möglich.",
    "Pflichtspiele frühestens ab dem Tag, an dem der Antrag beim Verband eingeht (SpO § 91 Nr. 1). In internationalen Fällen erst nach der Rückmeldung über den DFB.",
  ],
  [
    "**G- und F-Jugend**, Wechsel",
    "Keine Freigabe und keine Wartefrist (JO §§ 35 und 38 Nr. 4).",
    "Im Kreis Frankfurt brauchen auch G- und F-Kinder ein Spielrecht, wenn sie an Spielen, Turnieren oder Festivals teilnehmen.",
  ],
  [
    "**E-Jugend**, Wechsel",
    "Abmeldung vom 1. bis 30. Juni: Pflichtspiele ab 1. Juli. Sonst 3 Monate ab dem Tag nach der Abmeldung.",
    "Freundschaftsspiele ab Eingang der vollständigen Unterlagen. Die E-Jugend spielt 2026/27 in der Kreisliga, also sind es Pflichtspiele. Ältere E-Jahrgänge müssen bei Abmeldung bis 30. Juni freigegeben werden. Ab 2027/28 spielt die E-Jugend nur noch 6 gegen 6 in Meldeligen. Die Regeln sind dann neu zu prüfen ({o:O59}).",
  ],
  [
    "**D- bis A-Jugend** (jüngerer A-Jahrgang), Wechsel",
    "Im Juni: mit Freigabe (Zustimmung des alten Vereins) oder Entschädigung ab 1. Juli, ohne beides ab 1. November. Außerhalb des Junis: mit Freigabe 3 Monate, ohne Freigabe 6 Monate ab dem Tag nach der Abmeldung.",
    "Liegt das letzte Pflichtspiel mehr als 6 Monate zurück, entfällt die Wartefrist (JO § 47 Nr. 1). Außerhalb des Junis ersetzt eine Entschädigung die Freigabe nicht. Die Entschädigung zahlt der neue Verein. Für uns (Herren in der Kreisliga A) sind es 200 € für A und B, 100 € für C und D, dazu 25 € je angefangenem Spieljahr, höchstens 6. Für den jüngeren D-Jahrgang erlaubt der DFB höchstens 3 Monate, der HFV sieht 6 vor ({o:O08}). {offen}",
  ],
  [
    "**Freundschaftsspiele** in der Jugend",
    "Keine Wartefrist.",
    "Ausnahme: der ältere A-Jahrgang (2008) und die älteren B-Juniorinnen (2010). Im Kreis Frankfurt dürfen Spieler ohne Spielrecht auch dort nicht eingesetzt werden.",
  ],
  [
    "**Herren**, älterer A-Jahrgang (2008), ältere B-Juniorinnen (2010)",
    "Wechselperiode I: Abmeldung bis 30.06., Unterlagen bis 31.08., 23:59 Uhr. Ohne Zustimmung Pflichtspiele erst ab 1. November. Wechselperiode II: Abmeldung vom 01.07. bis 31.12., Unterlagen bis 31.01. Nur mit Zustimmung, sonst Pflichtspiele erst ab 1. November des folgenden Spieljahres.",
    "Ab 1. Juni gelten für die älteren Jahrgänge die Regeln der Senioren. Liegt das letzte Pflichtspiel mehr als 6 Monate zurück, gibt es keine Wartefrist, auch außerhalb der Wechselperioden.",
  ],
  [
    "**Sonderwege in der Jugend**",
    "Rückkehr zum alten Verein bis 31.10. Fehlende Spielmöglichkeit: vom 01.07. bis 30.09. ohne Freigabe, vom 01.10. bis 31.03. nur mit Freigabe. Jugendspielgemeinschaft bis 14 Tage nach dem ersten Pflichtspiel. Härtefall (JO § 41).",
    "Diese Fälle gehen an die Jugendleitung.",
  ],
  [
    "**Internationale Fälle** (Nichtdeutsche ab 10, Rückkehrer ab 10, Auslandsverein bekannt)",
    "Spielrecht erst nach der Rückmeldung über den DFB. Der ausländische Verband hat 72 Stunden Zeit für den Freigabeschein. Dazu kommt die Bearbeitung bei HFV und DFB.",
    "Der HFV nennt keine Bearbeitungsdauer ({o:O13}). Ältere Angaben von 30 oder 7 Tagen sind überholt. Ab 01.01.2027 gilt ein neues FIFA-Transferreglement. Die Fristen müssen wir dann neu prüfen ({o:O58}). {offen}",
  ],
  [
    "**Mehrfach-Wechsel und Sperre**",
    "Ein neuer Wechsel während einer laufenden Wartefrist startet die neue Frist erst danach (SpO § 94 Nr. 1 b). Ein zweiter Wechsel im Juni zählt wie ein Wechsel außerhalb des Junis (JO § 39).",
    "Eine Wartefrist unterbricht eine Sperre. Der Rest der Sperre folgt danach.",
  ],
];

function wartefristenAbschnitt() {
  const inhalt = `${p(
    "Eine Wartefrist gibt es nur bei einem Vereinswechsel. „Pflichtspiel ab“ bedeutet: frühestens ab dem Tag, an dem der Antrag beim Verband eingeht."
  )}
    ${kasten(
      "info",
      `${p("**Der Assistent schätzt, der Verein prüft.** Die Schätzung ersetzt keine Auskunft des HFV.")}
    ${p("Sie rechnet ab dem Tag nach der Abmeldung. Bei unklaren Regeln kennzeichnet der Assistent die Schätzung als unsicher.")}
    ${p("Am Monatsende weicht die Passstelle um einen Tag ab: Sie rechnet Abmeldedatum plus Monate plus 1 Tag. Der Assistent nimmt den späteren Tag ({o:O60}).")}
    ${p("Die Wartefrist entfällt nach mehr als 6 Monaten ohne Pflichtspiel. Der Assistent rechnet damit nur, wenn dieser Zeitraum am Tag des Antrags schon vorbei ist. Ob der Verein den Antrag später stellen darf, um die Wartefrist zu vermeiden, ist offen ({o:O61}).")}`
    )}
    ${tabelle({
      beschriftung: "Wartefristen nach Altersgruppe",
      spalten: ["Wer", "Wartefrist", "Anmerkung"],
      breit: true,
      ersteSpalte: "label",
      zeilen: WARTEFRISTEN,
    })}
    ${kasten(
      "info",
      `${p(
        "**Rechenbeispiel** (unsere eigene Rechnung, keine Auskunft des HFV): Ein Kind meldet sich am 29.09.2026 ab. In der D-Jugend darf es mit Freigabe ab etwa 30.12.2026 Pflichtspiele bestreiten, ohne Freigabe ab etwa 30.03.2027. In der E-Jugend ist es ebenfalls etwa der 30.12.2026."
      )}`
    )}
    <h3>Drei Warnungen, die der Assistent zeigt</h3>
    ${liste([
      "Eine Abmeldung per Mail, WhatsApp oder einfachem Brief zählt nicht.",
      "Erst nach dem wirklich letzten Spiel abmelden.",
      "Nie für zwei Vereine gleichzeitig unterschreiben (SpO § 91 Nr. 3, § 93 Nr. 6).",
    ])}
    ${p(
      "Bei der Vollmacht für die Abmeldung zählt der Tag der Eingabe im System als Abmeldetag. Der Assistent bietet sie nur an, wenn der Verein sie am selben oder nächsten Tag eingibt. Sonst empfiehlt er ein Einschreiben. Beim Einschreiben zählt der Poststempel."
    )}`;
  return abschnitt("wartefristen", inhalt);
}

// ---------- 9. Datenschutz ----------

function datenschutzAbschnitt() {
  const inhalt = `${p(
    "Ausweise, Atteste und Angaben zur Gesundheit sind sensible Daten. Der Assistent soll davon so wenig wie möglich sammeln, weitergeben und aufbewahren."
  )}
    <h3>So gehen wir mit den Daten um</h3>
    ${liste([
      "**Originale bleiben 2 Jahre.** Der Verein bewahrt das Original des Antrags auf Spielerlaubnis und alle Unterlagen mindestens 2 Jahre ab Antrag auf (SpO § 92). Der HFV kann sie verlangen. Dann müssen sie binnen 14 Tagen im Original vorliegen. In einem Pilotprojekt prüft der HFV vom 01.07. bis Ende 2026 Online-Vereinswechsel stichprobenartig.",
      "**Danach löschen.** Nach der Frist werden Unterlagen vernichtet, auch Ausweiskopien (Art. 5 Abs. 1 lit. e DSGVO). Ob ein rein digitales Archiv reicht, ist noch zu klären ({o:O01}). Hamburg erlaubt es. {offen}",
      "**Keine Ausweiskopien deutscher Kinder.** Wo eine Kopie nötig ist, schwärzen wir Zugangsnummer (CAN) und Seriennummer und weisen darauf hin. Es gibt keine automatische Texterkennung und keine strukturierte Speicherung von Ausweisdaten. Was man auf ausländischen Pässen schwärzen darf, ist noch zu klären ({o:O10}). {offen}",
      "**Wasserzeichen.** Kopien tragen den Vermerk „KOPIE“ mit dem Zweck, dem Namen des Vereins und dem Datum.",
      "**Attest getrennt.** Im Attest steht nur „keine Bedenken“. Es ist ein Gesundheitsdatum (Art. 9 DSGVO). Welche Rechtsgrundlage der HFV annimmt, ist noch zu klären ({o:O06}). Deshalb holen wir mit der Erlaubnis für das Attest eine ausdrückliche Einwilligung ein. Verlangt der Verband das Attest nicht, vernichtet der Verein es sofort. {offen}",
      "**Notfall- und Gesundheitsbogen freiwillig.** Er liegt in Teil C, getrennt von den übrigen Unterlagen, und nur Trainer und Betreuer der Mannschaft sehen ihn. Mit Angaben zur Gesundheit gilt die ausdrückliche Einwilligung (Art. 9 Abs. 2 lit. a DSGVO). Ohne Angaben stehen nur die Notfallkontakte darauf. Die Rechtsgrundlage dafür klärt der Vorstand ({o:O67}). Die Absprache zur Medikamentengabe unterschreiben Eltern und Trainer getrennt mit Stift. Beim Austritt oder auf Widerruf wird alles gelöscht.",
      "**Information zum Datenschutz.** Eine eigene Seite im PDF informiert nach Art. 13 DSGVO. Sie verweist auf die Information zum Datenschutz des HFV (Stand 20.01.2026). Ob die Unterschrift zur Kenntnisnahme nötig ist, ist offen ({o:O63}). {offen}",
      "**Rechtsgrundlagen.** Stammdaten und Foto für den Spielerpass sind ohne Einwilligung zulässig (Art. 6 Abs. 1 lit. b DSGVO). Eine Veröffentlichung braucht die Einwilligung. Ab 16 Jahren darf der Verband Name und Spielberichtsdaten aus berechtigtem Interesse veröffentlichen. Darauf und auf das Widerspruchsrecht weisen wir hin.",
      "**DFBnet.** Das Häkchen „Adressweitergabe“ setzen wir nicht. Es ist eine Einwilligung zu Werbung.",
    ])}
    <h3>Versand und Übergabe</h3>
    ${liste([
      "Die Familie gibt die Originale im Verein ab, im Vereinsheim oder beim Trainer.",
      "Ausweiskopien und Atteste von Kindern gehen nicht per normaler Mail oder WhatsApp. Die Datenschutzkonferenz verlangt bei hohem Risiko Ende-zu-Ende-Verschlüsselung oder ein Webportal (Orientierungshilfe vom 16. Juni 2021).",
      "Die Familie schickt nichts an den HFV. Das E-Postfach der Passstelle ist nur aus DFBnet erreichbar.",
    ])}
    ${kasten(
      "offen",
      `${p(
        "**Offen: automatischer Versand.** Der geplante Versand läuft über die IONOS-Annahme des Vereins, die das PDF per E-Mail an die Geschäftsstelle weitergibt. Sie ist bisher für den Online-Aufnahmeantrag gebaut. Bevor Ausweiskopien und Atteste so übertragen werden, muss der Verein klären, ob das nach der Orientierungshilfe zulässig ist. Dann muss auch die Information zum Datenschutz angepasst werden: Sie sagt heute, die Angaben würden nicht an einen Server übertragen. {offen}"
      )}`
    )}
    <h3>Was der Verein festlegen muss</h3>
    ${liste([
      "Ein Löschkonzept für die Mitgliederdaten. Als Beispiel nennt der Landesdatenschutzbeauftragte Baden-Württemberg: 2 Jahre nach Ende der Mitgliedschaft, Beitragsdaten 10 Jahre. DFBnet löscht die Daten beim Verband frühestens 5 Jahre nach der letzten Saison.",
      "Ein Verarbeitungsverzeichnis. Wegen der Gesundheitsdaten greift die Ausnahme für kleine Stellen nicht ({o:O46}).",
      "Die Prüfung, ob ein Datenschutzbeauftragter nötig ist: ab 20 Personen, die in der Regel ständig automatisiert mit Daten umgehen (§ 38 BDSG). Trainer mit Listen oder Messenger-Gruppen zählen mit.",
      "Satzung § 23 überarbeiten. Sie verweist noch auf das BDSG.",
      "Die Information zum Datenschutz in Einfacher Sprache schreiben und übersetzen ({o:O45}).",
    ])}`;
  return abschnitt("datenschutz", inhalt);
}

// ---------- 10. Entscheidungen ----------

// Jede Zeile ist ein offener Punkt aus data/anmeldung.json › offenePunkte (Version 2026-09-29.2)
// und trägt seine kleine Nummer. Die Listen sind nach dem Empfänger geordnet (an: vorstand,
// kassierer, datenschutz, versicherung, kreis_frankfurt, grosser_rat_bdk, jugendleitung, regelwerk);
// das Passwesen sammelt die Punkte zum Betrieb von DFBnet (O24 und O25 an den Vorstand, O69 und O70
// an die Jugendleitung). Punkte der Karnevalabteilung (O55 bis O57) stehen im Abschnitt „Karneval“,
// die des HFV in „Fragen an den HFV“. P1 steht immer sichtbar, P2 und P3 im Aufklapper unter der Liste.

const SPALTEN_ENTSCHEIDUNG = ["Prio · Nr.", "Entscheidung"];

// ----- Vorstand: P1 -----
const VORSTAND_SICHTBAR = [
  punktZeile(
    "O26",
    "Unterschreibt ein Elternteil, oder müssen beide Eltern unterschreiben?",
    "Für den HFV genügt ein Elternteil, nach Zivilrecht vertreten beide gemeinsam. Der Assistent empfiehlt beide beim Aufnahmeantrag und bei der Erlaubnis für Fotos ({a:unterschrift})."
  ),
  punktZeile(
    "O27",
    "Wie sichern wir den Unfallschutz beim Probetraining? Schließen wir eine Nichtmitgliederversicherung ab, oder legen wir die Anmeldung vor das erste Training?",
    "Nichtmitglieder haben keinen persönlichen Unfallschutz. Die Website erlaubt heute ein- bis zweimal Probetraining ohne Anmeldung (siehe Kasten)."
  ),
  punktZeile(
    "O28",
    "Schalten wir das Online-Formular des FCV ab oder leiten wir es um? Wie kommt Karneval in die Satzung?",
    "Zwei Anmeldewege mit unterschiedlichen Regeln laufen parallel, und die Satzung nennt Karneval nicht ({a:karneval})."
  ),
  punktZeile(
    "O29",
    "Melden wir uns zum Fastnachtszug 2027 an?",
    "Meldeschluss beim Großen Rat ist der 30.09.2026. Teilnehmen dürfen nur Mitgliedsvereine."
  ),
  punktZeile(
    "O30",
    "Beginnt die Mitgliedschaft am Tag der Anmeldung? Wie berechnen wir den Beitrag im ersten Jahr?",
    "Die Satzung (§ 6) sagt ja. App und Website sagen „zum 1. des nächsten Monats“. Bis dahin ist das Kind kein Mitglied und nicht versichert. Der Aufnahmeantrag nennt bei Eintritt im Jahr nur „das restliche Kalenderjahr“, aber keinen Rechenweg."
  ),
  punktZeile(
    "O31",
    "Verzichten wir auf beitragsfreie oder befristete Probemitgliedschaften?",
    "Mitgliedschaften, die schon beim Eintritt auf weniger als 12 Monate angelegt sind, sind nicht versichert. Das gilt auch für eine Mitgliedschaft nur für die Karnevalskampagne."
  ),
  punktZeile(
    "O66",
    "Reparieren wir die Weiterleitung der Satzungsadresse im Aufnahmeantrag, oder ändern wir die Adresse im Vordruck?",
    "Die Adresse im Aufnahmeantrag führt ins Leere (Fehler 401, geprüft am 29.09.2026). Die Satzung liegt unter der Download-Adresse der Website. Der Assistent verlinkt dorthin ({a:unterschrift})."
  ),
  punktZeile(
    "O68",
    "Dürfen Vereinsunterlagen am Bildschirm unterschrieben werden?",
    "Das wäre eine einfache elektronische Unterschrift. Die Form bestimmt der Verein selbst: Die Satzung verlangt Schriftform, nach § 127 BGB kann eine elektronische Übermittlung reichen. HFV-Vordrucke bleiben Stift. Der Laufzettel im PDF bittet den Vorstand, das zu bestätigen ({a:unterschrift})."
  ),
];

// ----- Vorstand: P2 und P3 -----
const VORSTAND_WEITERE = [
  punktZeile(
    "O32",
    "Geben wir die HFV-Gebühr an die Familien weiter?",
    "Die Erstausstellung ist gebührenfrei. Ein Wechsel kostet 10 € für Junioren und 25 € für Herren. Die Gebühr zahlt der Verein."
  ),
  punktZeile(
    "O33",
    "Geben wir die Bescheinigung für Bildung und Teilhabe standardmäßig mit?",
    "Bei Grundsicherungsgeld gibt es für Kinder unter 18 pauschal 15 € im Monat für Sport und Verein (§ 28 Abs. 7 SGB II). Bei Wohngeld und Kinderzuschlag gilt dasselbe mit eigenem Antrag (§ 6b BKGG). Das deckt den Kinderbeitrag von 9 € voll. Wie der im Voraus fällige Jahresbeitrag bezahlt wird, ist noch zu klären. {offen}"
  ),
  punktZeile(
    "O34",
    "Senatorenmitgliedschaft: Welchen Status und welches Stimmrecht haben Senatoren?",
    "Der Vorstand entscheidet über die Aufnahme als Senator. Die Satzung kennt keine Senatoren. Der Beitrag beträgt 144 € im Jahr."
  ),
  punktZeile(
    "O35",
    "Kostüme im Karneval: Wem gehören sie, was kosten sie, gibt es eine Kaution? Was zahlen Familien noch dazu?",
    "Nebenkosten und Pflichtteile der Garde-Uniform sind offen. Eine Leihvereinbarung ist sinnvoll."
  ),
  punktZeile(
    "O36",
    "Aufsicht bei Abendauftritten, Umkleide und Kostümwechsel: Ergänzen wir das Schutzkonzept für den Karneval? Gilt die Erlaubnis für Auftritte am Abend je Kampagne oder einmalig?",
    "Das Schutzkonzept hat für den Karneval noch keine Regeln. Der Assistent formuliert die Erlaubnis bisher für eine Kampagne."
  ),
  punktZeile(
    "O52",
    "Legen wir Ansprechpersonen, Sprachen und Sprechzeiten im Vereinsheim für den Hilfe-Knopf fest?",
    "Die Ansprechpersonen müssen zustimmen. Sprachmittlung über das AmkA ist gegen Entgelt möglich."
  ),
  punktZeile(
    "O53",
    "Testen wir den Assistenten mit 3 bis 5 Eltern, die wenig Deutsch sprechen?",
    "Ergebnis: verbesserte Texte und die Sprachauswahl ({a:einfuehrung})."
  ),
  punktZeile(
    "O65",
    "Erlaubnis für Fotos bei Jugendlichen: Unterschreiben ab 14 oder ab 16 Jahren auch die Jugendlichen selbst?",
    "Es geht um die Einsichtsfähigkeit. Der Assistent lässt bisher nur die Eltern unterschreiben. Der Hinweis dazu ist bis zur Entscheidung entfernt."
  ),
  punktZeile(
    "O71",
    "Wer pflegt Fristen, Beträge und Gebühren im Regelwerk des Assistenten, wenn sich Beitragsordnung oder Verbandsordnungen ändern?",
    "Sie ändern sich: Ab 01.01.2027 gilt ein neues FIFA-Transferreglement ({o:O58}). Ab 2027/28 spielt die E-Jugend nur noch 6 gegen 6 in Meldeligen ({o:O59})."
  ),
];

// ----- Passwesen (DFBnet und Pass Online): P1 -----
const PASSWESEN_SICHTBAR = [
  punktZeile(
    "O24",
    "Wer hat die DFBnet-Kennung für Pass Online? Wo liegen die Originale 2 Jahre lang, und wer löscht sie danach?",
    "Über DFBnet reicht der Verein den Antrag auf Spielerlaubnis online ein und lädt das Spielerfoto hoch. Der HFV kann Unterlagen stichprobenartig verlangen. Sie müssen dann binnen 14 Tagen im Original vorliegen."
  ),
  punktZeile(
    "O25",
    "Wie kommen die Unterlagen zum Verein, und wer prüft sie auf Vollständigkeit?",
    "Vorschlag: Die Familie gibt die Originale im Verein ab, nicht per WhatsApp. Der Antrag kann erst mit vollständigem, von Hand unterschriebenem Original an den HFV gehen."
  ),
];

// ----- Passwesen: P2 (an: jugendleitung) -----
const PASSWESEN_WEITERE = [
  punktZeile(
    "O69",
    "Wer im Verein gibt eine Vollmacht für die Abmeldung am selben oder nächsten Tag in DFBnet ein?",
    "Bei der Vollmacht zählt der Tag der Eingabe als Abmeldetag. Jeder Tag Verzögerung verlängert die Wartefrist. Der Assistent bietet sie nur an, wenn die Eingabe am selben oder nächsten Tag klappt."
  ),
  punktZeile(
    "O70",
    "Wer meldet die Jugendspieler namentlich beim Kreisjugendwart, und bis wann?",
    "Das schreibt JO § 7 Nr. 2 vor, und zwar vor dem ersten Pflichtspieltag."
  ),
];

// ----- Geschäftsstelle und Kasse (an: kassierer): alle P2 -----
const KASSE_WEITERE = [
  punktZeile(
    "O37",
    "Wird die Aufnahmegebühr von 20 € bar oder per Einzug bezahlt? Gilt sie auch im Karneval und für passive Mitglieder?",
    "Der Antrag 2026 zieht sie mit dem ersten Beitrag ein, die Liste von 2021 nennt bar. Die Satzung (§ 16) nennt sie auch für Karneval."
  ),
  punktZeile(
    "O38",
    "Gilt der Zuschlag von 3 € ohne Lastschrift noch?",
    "Er steht im Info-Blatt von 2014, nicht im Aufnahmeantrag 9/2026."
  ),
  punktZeile(
    "O39",
    "Bekommt jede Erlaubnis für die Lastschrift eine eigene Mandatsreferenz? Nehmen wir IBANs aus allen SEPA-Ländern an?",
    "Heute haben alle Mitglieder dieselbe Referenz „Beitrag Sportfreunde 04“, und „DE“ ist im IBAN-Feld vorgedruckt. Ob zum Beispiel türkische IBANs SEPA-fähig sind, ist unbelegt. Die Länderliste des European Payments Council ist zu prüfen. Ausweg: Rechnung oder Überweisung. {offen}"
  ),
  punktZeile(
    "O40",
    "Wer gehört zur Familie? Welcher Beitrag gilt bei Doppelmitgliedschaft in Fußball und Karneval? Wie lange gilt der Nachweis für Azubis und Studierende?",
    "Der Antrag sagt nur, ein „gesonderter Beitrag“ sei zu erfragen."
  ),
  punktZeile(
    "O41",
    "Zählt bei der Kündigung bis 31.12. die Absendung oder der Eingang?",
    "Der Austritt geht nur zum Jahresende per Einschreiben. Beim Wechsel darf der alte Verein bis zum Ende seiner Kündigungsfrist Beitrag verlangen, also kann doppelt Beitrag anfallen."
  ),
  punktZeile(
    "O42",
    "Behalten wir das Attest bei Erwachsenen als Vereinsregel? Schaffen wir das Papier-Passbild ab? Wer macht das Spielerfoto, und wer lädt es hoch?",
    "Der HFV verlangt das Attest nur bei Minderjährigen. Er braucht ein digitales Spielerfoto, kein Papierbild. Das Foto muss vor dem Anstoß des ersten Spiels in DFBnet liegen. Im Kreis Frankfurt gilt es 2 Jahre."
  ),
  punktZeile(
    "O43",
    "Formulieren wir den Hinweis zu den 20 € neu?",
    "Die 20 € sind keine HFV-Gebühr, sondern die Aufnahmegebühr des Vereins. Der bisherige Hinweis „20 € für den HFV“ stimmt nicht."
  ),
  punktZeile(
    "O44",
    "Welche Altersgrenzen gelten für die Jugendbeiträge?",
    "Die Satzung nennt das vollendete 18. Lebensjahr. Im Fußball zählt die A-Jugend einschließlich 18-Jähriger, im Karneval gilt „bis 17“."
  ),
];

// ----- Datenschutz und Vereinsunterlagen (an: datenschutz): P1 -----
const DATENSCHUTZ_SICHTBAR = [
  punktZeile(
    "O67",
    "Welche Rechtsgrundlage gilt für die Notfallkontakte ohne Angaben zur Gesundheit: Art. 6 Abs. 1 lit. b oder lit. f DSGVO?",
    "Art. 9 DSGVO (ausdrückliche Einwilligung) passt nur zur Fassung mit Angaben zur Gesundheit. Für die Fassung „nur Notfallkontakte“ braucht die Information zum Datenschutz eine eigene Rechtsgrundlage. Der Entwurf im PDF nennt beide: lit. b für Mitgliedschaft und Fürsorge im Training, lit. f (berechtigtes Interesse) für weitere Kontaktpersonen. Der Vorstand bestätigt die Wahl."
  ),
];

// ----- Datenschutz und Vereinsunterlagen: P2 und P3 -----
const DATENSCHUTZ_WEITERE = [
  punktZeile(
    "O45",
    "Schreiben wir die Information zum Datenschutz in Einfacher Sprache, lassen sie übersetzen und vom Vorstand freigeben?",
    "Im PDF tragen die Information zum Datenschutz, alle Einverständnisse und Erlaubnisse die Fußzeile „Entwurf – vom Vorstand zu prüfen“."
  ),
  punktZeile(
    "O46",
    "Legen wir ein Verarbeitungsverzeichnis an, prüfen den Datenschutzbeauftragten und passen Satzung § 23 an?",
    "Wegen der Gesundheitsdaten ist ein Verzeichnis nötig. Satzung § 23 verweist noch auf das BDSG ({a:datenschutz})."
  ),
  punktZeile(
    "O47",
    "Stellen wir das Schutzkonzept fertig?",
    "Es hat noch Platzhalter „XXX“, fehlende Anlagen und private Kontaktadressen. Für den Karneval fehlen Regeln."
  ),
  punktZeile(
    "O48",
    "Ersetzen wir Info-Blatt, Unterlagenliste, Zusatzerklärung und den toten Satzungslink?",
    "Sie stammen von 2014 und 2021. Im Info-Blatt muss „ALG II“ ersetzt werden: Laut Bundesagentur für Arbeit heißt das Bürgergeld seit 01.07.2026 Grundsicherungsgeld."
  ),
  punktZeile(
    "O63",
    "Ist die Unterschrift zur Kenntnisnahme der Information zum Datenschutz nötig?",
    "Nach Art. 13 DSGVO genügt die Information. Der Assistent sieht eine Unterschrift zur Kenntnisnahme vor."
  ),
];

// ----- Weitere Stellen (an: versicherung, kreis_frankfurt, grosser_rat_bdk, jugendleitung, regelwerk) -----
const STELLEN_WEITERE = [
  punktZeile(
    "O49",
    "**ARAG-Versicherungsbüro und LSB:** Sind Karneval, Nichtmitglieder und neue Mitglieder vom ersten Tag an versichert? Ist die Karnevalabteilung beim LSB angemeldet?",
    "Der Schutz gilt nur, wenn die Abteilung beim LSB angemeldet ist und die Karnevalsmitglieder in der Bestandsmeldung stehen ({a:karneval})."
  ),
  punktZeile(
    "O50",
    "**Kreis Frankfurt:** Wie wird der Jahrgang 2020 zugeordnet, und wie wirkt die Funino-Regel in der F-Jugend?",
    "Der Verein führt den Jahrgang 2020 in der F2, der Kreis in der G-Jugend."
  ),
  punktZeile(
    "O51",
    "**Großer Rat und BDK:** Mitgliedschaft der Abteilung und Turnierfragen.",
    "Davon hängen Tanzausweis und Zustimmung zu Aufnahmen bei Turnieren ab ({a:karneval})."
  ),
  punktZeile(
    "O54",
    "**Jugendleitung:** Was sagt der Assistent Familien mit Kindern der Jahrgänge 2010 bis 2013?",
    "Für sie gibt es 2026/27 keine B- oder C-Jugend. Mädchen können bis zur C-Jugend ein Jahr älter sein und in Jungenteams spielen."
  ),
  punktZeile(
    "O58",
    "**Regelwerk:** Neues FIFA-Transferreglement ab 01.01.2027: Regeln für internationale Wechsel neu prüfen.",
    "Eine Kanzleimeldung nennt einen Freigabeschein in 5 Tagen. Das ist nicht an der FIFA-Quelle geprüft."
  ),
  punktZeile(
    "O59",
    "**Regelwerk:** Ab 2027/28 spielt die E-Jugend nur noch 6 gegen 6 in Meldeligen: Wartefrist-Regeln für die E-Jugend neu prüfen.",
    "Die heutigen Regeln gelten für 2026/27, wenn die E-Jugend Punktspiele spielt."
  ),
  punktZeile(
    "O64",
    "**Gesundheitsamt Frankfurt:** Gibt es ein kostenloses Attest für Kinder mit Frankfurt-Pass oder Grundsicherungsgeld?",
    "Die Seite war nicht prüfbar. Der Assistent nennt das deshalb nicht."
  ),
];

// Eine Liste der Entscheidungen: P1 sichtbar in einer Tabelle, der Rest im Aufklapper darunter.
function entscheidungsListe({ name, sichtbar, weitere, titelWeitere }) {
  const teile = [];
  if (sichtbar.length) {
    teile.push(
      tabelle({
        beschriftung: `Entscheidungen: ${name}, mit P1`,
        spalten: SPALTEN_ENTSCHEIDUNG,
        ersteSpalte: "prio",
        zeilen: sichtbar,
      })
    );
  } else {
    teile.push(p("Kein Punkt dieser Liste hat P1."));
  }
  if (weitere.length) {
    const arten = [...new Set(weitere.map((z) => z.prio))].sort().join(" und ");
    teile.push(
      aufklapper(
        `${titelWeitere}: ${weitere.length} (${arten})`,
        tabelle({
          beschriftung: `Entscheidungen: ${name}, weitere Punkte`,
          spalten: SPALTEN_ENTSCHEIDUNG,
          ersteSpalte: "prio",
          zeilen: weitere,
        })
      )
    );
  }
  return teile.join("\n    ");
}

function entscheidenAbschnitt() {
  const inhalt = `${p(
    "Die Listen sind nach Dringlichkeit geordnet. P1 muss vor dem Livegang geklärt sein und steht immer sichtbar. P2 und P3 eilen weniger und stehen unter jeder Liste in einem Aufklapper. Jede Zeile trägt ihre Nummer aus dem Regelwerk des Prototyps, zum Beispiel O26."
  )}
    ${kasten(
      "offen",
      `${p("**Versicherung beim Probetraining – der Befund in Kürze.**")}
    ${p(
      "Wer nur zum Probetraining kommt und kein Mitglied ist, hat über die Sportversicherung des LSB keinen persönlichen Unfall- und Haftpflichtschutz (ARAG-Merkblatt, Stand 01.01.2026). Die Haftpflicht des Vereins greift dagegen: Angebote für Nichtmitglieder gehören zur Mitgliederwerbung."
    )}
    ${p(
      "Es gibt zwei Fallen. Erstens: Eine beitragsfreie oder befristete Probemitgliedschaft schließt die Lücke nicht. Zweitens: Beginnt die Mitgliedschaft erst am 1. des Folgemonats, ist ein angemeldetes Kind bis dahin nicht versichert."
    )}
    ${p(
      "Zwei Wege sind möglich: Der Verein schließt über das Versicherungsbüro des LSB eine Zusatzversicherung für Nichtmitglieder ab. Oder er legt die Anmeldung vor das erste Training."
    )}
    ${p("Dazu gehören die Punkte {o:O27}, {o:O30}, {o:O31} und {o:O49}.")}`
    )}
    <h3>Vorstand</h3>
    ${entscheidungsListe({
      name: "Vorstand",
      sichtbar: VORSTAND_SICHTBAR,
      weitere: VORSTAND_WEITERE,
      titelWeitere: "Weitere Punkte des Vorstands",
    })}
    <h3>Passwesen (DFBnet und Pass Online)</h3>
    ${entscheidungsListe({
      name: "Passwesen",
      sichtbar: PASSWESEN_SICHTBAR,
      weitere: PASSWESEN_WEITERE,
      titelWeitere: "Weitere Punkte des Passwesens",
    })}
    <h3>Geschäftsstelle und Kasse</h3>
    ${entscheidungsListe({
      name: "Geschäftsstelle und Kasse",
      sichtbar: [],
      weitere: KASSE_WEITERE,
      titelWeitere: "Punkte für Geschäftsstelle und Kasse",
    })}
    <h3>Datenschutz und Vereinsunterlagen</h3>
    ${entscheidungsListe({
      name: "Datenschutz und Vereinsunterlagen",
      sichtbar: DATENSCHUTZ_SICHTBAR,
      weitere: DATENSCHUTZ_WEITERE,
      titelWeitere: "Punkte zu Datenschutz und Vereinsunterlagen",
    })}
    <h3>Weitere Stellen</h3>
    ${entscheidungsListe({
      name: "Weitere Stellen",
      sichtbar: [],
      weitere: STELLEN_WEITERE,
      titelWeitere: "Punkte für weitere Stellen",
    })}
    <p class="meta">${md(
      "Die Punkte der Karnevalabteilung (O55 bis O57) stehen in {a:karneval}, die Fragen an den HFV in {a:hfv-fragen}."
    )}</p>`;
  return abschnitt("entscheiden", inhalt);
}

// ---------- 11. Fragen an den HFV ----------

function hfvFragenAbschnitt() {
  const inhalt = `${p(
    "Die Fragen gehen schriftlich über das E-Postfach des Vereins in DFBnet an die Passstelle. Die Familie schreibt nie selbst an den HFV. Die Status-Hotline der Passstelle endet am 30.09.2026."
  )}
    ${p(
      "Bis die Antworten da sind, zeigt der Assistent die betroffenen Punkte als offen. Die P1-Fragen sollten vor dem Livegang beantwortet sein. Jede Frage trägt ihre Nummer aus dem Regelwerk."
    )}
    <h3>P1: vor dem Livegang klären (${HFV_P1.length})</h3>
    ${nummernListe(HFV_P1)}
    ${aufklapper(
      `Weitere Fragen: ${HFV_WEITERE.length} (${prioText(HFV_WEITERE.map(([o]) => o))})`,
      nummernListe(HFV_WEITERE)
    )}`;
  return abschnitt("hfv-fragen", inhalt);
}

// ---------- 12. Karneval ----------

const KARNEVAL_BELEGT = [
  [
    "**Anmeldung**",
    "Derselbe Aufnahmeantrag, Kreuz bei „Karnevalabteilung“.",
  ],
  [
    "**Beiträge pro Jahr**",
    "Kinder und Jugendliche bis 17: 108 €. Azubis und Studierende mit Nachweis: 108 €. Erwachsene: 120 €. Rentner ab 65: 84 €. Familie: 180 €. Senatoren: 144 €. Eine Gruppe „Passive/Frauen“ gibt es im Karneval nicht.",
  ],
  [
    "**HFV-Unterlagen und Attest**",
    "Nicht nötig. Weder BDK (Bund Deutscher Karneval) noch RKK noch der Große Rat verlangen ein Attest. Bei Turnieren gibt es einen Turnierarzt. Ein freiwilliger Notfall- und Gesundheitsbogen ist trotzdem sinnvoll.",
  ],
  [
    "**Versicherung**",
    "Mitglieder sind beim satzungsgemäßen Vereinsbetrieb versichert. Voraussetzung: Die Abteilung ist beim LSB angemeldet, und die Karnevalsmitglieder stehen in der Bestandsmeldung. Wer nur schnuppert, ist nicht versichert. Eine Mitgliedschaft „nur für die Kampagne“ wäre es auch nicht.",
  ],
  [
    "**Jugendschutz**",
    "Bei Brauchtumsveranstaltungen dürfen Kinder bis 22 Uhr, Jugendliche unter 16 bis 24 Uhr auch ohne Begleitung bleiben (§ 5 JuSchG). Sinnvoll: die Erlaubnis für Auftritte am Abend. Darin übertragen die Eltern die Aufsicht an eine erwachsene Person (Erziehungsbeauftragung). Jugendliche sollten einen Ausweis dabeihaben (§ 2 JuSchG). Das Jugendarbeitsschutzgesetz greift nur bei Auftritten gegen Gage. Dann braucht es eine Bewilligung beim Regierungspräsidium Darmstadt.",
  ],
  [
    "**Turniere**",
    "Großer Rat (Turnierordnung 06/2026): nur Mitgliedsvereine. Junioren 12 bis 15 Jahre, Hauptklasse ab 16, es zählt das Alter am Turniertag. Mindestens 4 Tänzer. Jede Tänzerin startet nur für einen Verein. Bei der Passkontrolle braucht jedes Kind einen Personal-, Kinder-, Schüler- oder Tanzausweis. BDK: nur mit Mitgliedschaft über die IGMK, mit Tanzturnierausweis und schriftlicher Zustimmung zu Aufnahmen. RKK: Tanzausweis für 5 € plus Versand, mit Passfoto.",
  ],
  [
    "**Fastnachtszug**",
    "Nur Mitgliedsvereine des Großen Rats dürfen teilnehmen. Mit der Teilnahme willigt man in Bild- und Tonaufnahmen ein (Zugordnung Nr. 9.3). Das gehört in die Elterninformation. Bei Kindergruppen müssen genug erwachsene Aufsichtspersonen mitgehen.",
  ],
  [
    "**Schutzkonzept**",
    "Es gilt für alle Trainer und Betreuer (erweitertes Führungszeugnis).",
  ],
];

// Die offenen Punkte zum Karneval. O55, O56 und O57 (an: karnevalabteilung) haben hier ihre Zeile mit Anker;
// alle anderen Nummern verweisen auf die Zeile in Abschnitt 10 (Vorstand, Kasse, weitere Stellen).
const KARNEVAL_OFFEN = [
  [["O28"], "Wie hängen der FCV und die FFV-Abteilung rechtlich zusammen? Was passiert mit den FCV-Mitgliedern? Kommt Karneval in die Satzung?"],
  [["O49"], "Ist die Abteilung beim LSB gemeldet? Den Versicherungsschutz für Sitzungen, Auswärtsauftritte und den Zug beim ARAG-Versicherungsbüro bestätigen lassen."],
  [["O57"], "Probetraining und Schnuppern regeln. Die Website widerspricht sich hier: Eine Seite sagt „Probetraining (nur Fußball)“, eine andere verweist zum Schnuppern an die Abteilung."],
  [["O55"], "Gruppen und Altersgrenzen: Laut FCV-Seite (Stand 2024) sind Little Fruities ab 4, Freaky Fruities 8 bis 16, Flying Fruities ab 16, Dreamboys und Pfläumchen ab 18. Aktuell gibt es fünf Gruppen. Der Verein muss die Grenzen bestätigen."],
  [["O35"], "Kostüme: Wem gehören sie, was kosten sie, gibt es eine Kaution? Dazu Nebenkosten und Pflichtteile der Garde-Uniform. Eine Leihvereinbarung ist sinnvoll."],
  [["O56", "O51"], "Welche Turniere und Mitgliedschaften (BDK, IGMK)? Davon hängen Tanzausweis, Passfoto und Turnier-Einwilligung ab. Ist die Gruppe „Freaky Fruities“ bis 16 oder bis 15 Jahre?"],
  [["O36"], "Aufsicht bei Abendauftritten, Umkleide und Kostümwechsel: Das Schutzkonzept braucht dafür Regeln für den Karneval."],
  [["O34"], "Senatorenmitgliedschaft: Status und Stimmrecht. Die FFV-Satzung kennt keine Senatoren."],
  [["O37", "O40"], "Gilt die Aufnahmegebühr von 20 € auch für Karneval? Und wie gelten der Beitrag bei Doppelmitgliedschaft, der Familienbeitrag über beide Abteilungen und der Nachweis für Azubis und Studierende?"],
];

const KARNEVAL_TERMINE = [
  [
    "**30.09.2026**",
    "Meldeschluss für den Großen Frankfurter Fastnachtszug 2027 beim Großen Rat. Teilnehmen dürfen nur Mitgliedsvereine ({o:O29}).",
  ],
  [
    "**31.10.2026**",
    "Meldeschluss beim Großen Rat für das Kindertanzfest (20.02.2027, nur bis 12 Jahre) und das Tanzfestival (21.02.2027).",
  ],
];

function karnevalAbschnitt() {
  const inhalt = `${p(
    "KA Schnauzer steht für die Karnevalabteilung „Die Schnauzer“ des Vereins. Für sie gibt es keine HFV-Unterlagen. Dafür sind mehrere Punkte offen."
  )}
    <h3>Eilige Termine</h3>
    ${tabelle({
      beschriftung: "Eilige Termine im Karneval",
      spalten: ["Datum", "Was"],
      ersteSpalte: "datum",
      zeilen: KARNEVAL_TERMINE,
    })}
    <h3>Was belegt ist</h3>
    ${tabelle({
      beschriftung: "Karneval: was belegt ist",
      spalten: ["Thema", "Stand"],
      breit: true,
      ersteSpalte: "label",
      zeilen: KARNEVAL_BELEGT,
    })}
    <h3>Zwei Anmeldewege stehen parallel online</h3>
    ${kasten(
      "offen",
      `${p(
        "Neben der FFV-Abteilung gibt es den Verein „Frankfurter Carneval Verein ‚Die Schnauzer‘ e.V.“ (FCV). Er ist nach eigener Angabe im Vereinsregister eingetragen (Amtsgericht Frankfurt, VR 8286). Den Registerstand haben wir nicht geprüft. Der FCV hat eine eigene Satzung (21. Oktober 2018) und ein aktives Online-Formular mit anderen Regeln."
      )}
    ${p(
      "Die Regeln des FCV-Formulars: Beiträge von 0 bis 111 €, Aufnahmegebühr 5 € oder 50 €, Probezeit 3 Monate, Geschäftsjahr vom 1. April bis 31. März."
    )}
    ${p(
      "Der Große Rat führt in seiner aktuellen Vereinsliste unter Nr. 52 die FFV-Abteilung. 2025 stand diese Nummer noch beim FCV. Das spricht für einen Übergang. Belegt ist er nicht. Der Große Rat nennt außerdem die FCV-Website als Adresse der Abteilung."
    )}
    ${p(
      "**Folge:** Das FCV-Formular abschalten oder auf den Assistenten umleiten ({o:O28}). Eigene Ableitung, nicht belegt: Bisherige FCV-Mitglieder brauchen einen Aufnahmeantrag des FFV und eine neue Erlaubnis für die Lastschrift, weil ein anderer Gläubiger abbucht. {offen}"
    )}`
    )}
    <h3>Karneval steht nicht ausdrücklich in der Satzung</h3>
    ${kasten(
      "offen",
      `${p(
        "Die FFV-Satzung (15. März 2024) nennt Sport sowie Kunst und Kultur. Karneval ist ein eigener gemeinnütziger Zweck (§ 52 Abs. 2 Nr. 23 AO). Die Satzung des Großen Rats (§ 3 Nr. 2a, 8. Oktober 2018) verlangt, dass der Mitgliedsverein das Brauchtum in seiner Satzung verankert."
      )}
    ${p(
      "Das berührt die Mitgliedschaft im Großen Rat, den Versicherungsschutz und die Gemeinnützigkeit. Ob es eine neuere Satzung gibt, ist zu klären ({o:O28}). {offen}"
    )}`
    )}
    <h3>Was offen ist</h3>
    ${nummernListe(KARNEVAL_OFFEN, { eigene: IM_KARNEVAL })}`;
  return abschnitt("karneval", inhalt);
}

// ---------- 13. Einführung ----------

const EINFUEHRUNG = [
  [
    "Prototyp durchgehen",
    "Die 1. Vorsitzende und die Jugendleitung gehen den [Prototyp](" + PROTOTYP + ") mit den Beispielfällen durch. Der Knopf „Vorführung“ öffnet die Beispiele. Ergebnis: Rückmeldungen zu Ablauf und Ton.",
  ],
  [
    "Fragen und Entscheidungen klären",
    "Die Fragen an die Passstelle ({a:hfv-fragen}) gehen über das E-Postfach des Vereins raus. Der Vorstand entscheidet die P1-Punkte ({a:entscheiden}).",
  ],
  [
    "Texte prüfen und testen",
    "Muttersprachler lesen Texte und Übersetzungen gegen. 3 bis 5 Eltern, die wenig Deutsch sprechen, testen den Assistenten ({o:O53}). Ergebnis: verbesserte Texte und die Sprachauswahl.",
  ],
  [
    "Einbau auf Website und in der App",
    "Der Assistent kommt auf die Website und in die App, in beiden gleich. Der automatische Versand läuft über die IONOS-Annahme des Vereins. Sie ist gebaut und geprüft und wartet auf den IONOS-Zugang. Für das größere PDF des Assistenten muss sie noch angepasst werden. Der Versand von Ausweisen und Attesten ist zu klären ({a:datenschutz}).",
  ],
  [
    "Vereinsunterlagen aktualisieren",
    "Info-Blatt, Unterlagenliste und Zusatzerklärung werden ersetzt ({o:O48}). Die Satzungsadresse im Aufnahmeantrag wird repariert oder geändert ({o:O66}). Im Info-Blatt steht statt „ALG II“ das Grundsicherungsgeld.",
  ],
];

function einfuehrungAbschnitt() {
  const schritte = EINFUEHRUNG.map(
    ([titel, text]) => `<li>
        <div class="schritt__inhalt">
          <p><strong>${escapeHtml(titel)}</strong></p>
          <p>${md(text)}</p>
        </div>
      </li>`
  ).join("\n      ");
  const inhalt = `${p("Die Einführung geht in fünf Schritten. Jeder Schritt baut auf dem vorigen auf.")}
    <ol class="schritte">
      ${schritte}
    </ol>
    ${p("Die Website und die App in der aktuellen Fassung bleiben bis zum Livegang unverändert. Der Prototyp liegt nur auf dieser Testseite.")}`;
  return abschnitt("einfuehrung", inhalt);
}

// ---------- 14. Quellen ----------

// Synthese Abschnitt 9 und Vollständigkeitsprüfung Abschnitt 5, ohne lokale Pfade.
const QUELLEN = [
  [
    "HFV und Kreis Frankfurt",
    [
      "Jugendordnung (JO), letzte Änderung 1. Juli 2026",
      "Spielordnung (SpO), 6. Juli 2026",
      "Strafordnung, 1. Juli 2026",
      "Antrag auf Spielerlaubnis / Vereinswechsel, PDF vom 12./16. Juni 2026",
      "Vordrucke: Vollmacht stellvertretende Abmeldung (16. Mai 2024), Abmeldung bei Verein per Einschreiben (18. April 2024), nachträgliche Freigabe (04/2024), Einverständnis gesetzlicher Vertreter (10. Juni 2025)",
      "Passstelle: Infoveranstaltung Wechselperiode I am 27./28. Mai 2026, Präsentation vom 12. Juni 2026",
      "Finanz-, Beitrags- und Gebührenordnung § 7, 13. September 2025",
      "Durchführungsbestimmungen G/F/E 2026/27, 10. Juli 2026, und Stichtage Junioren und Juniorinnen 2026/27, 12. Juni 2026",
      "Kreisjugendausschuss Frankfurt 2026/27, 9. August 2026",
      "Nutzungsbedingungen Pass Online; Information zum Datenschutz des HFV, 20. Januar 2026",
      "Seiten „Passstelle“ und „Antragstellung“, abgerufen 29. September 2026",
      "Ältere Hilfen (Fristen darin überholt): Tipps zur Antragstellung 5. Mai 2019, internationale Anträge 23. Januar 2019, Fußball mit Flüchtlingen 17. März 2022",
    ],
  ],
  [
    "DFB, DFBnet und FIFA",
    [
      "DFB-Jugendordnung, 21. August 2026; DFB-Spielordnung, 1. Juli 2026",
      "DFB-Übersichten zu Art. 19 (19a, 19e, 19.3), 8. Dezember 2025 und 15. Juli 2026",
      "DFB-Seiten „Transfers von Minderjährigen“ und „Internationale Transfers“, abgerufen 29. September 2026",
      "DFB: Information zum Datenschutz, 15. April 2024",
      "DFBnet: Leitfaden Spielerfotos (5. Juli 2020), Online-Hilfe Pass Online (ohne Datum), Handbuch 2009",
      "FIFA-Reglement zum Status und Transfer von Spielern (RSTP), Ausgabe Juli 2025 (Art. 1, 9, 19, Anhänge 3 und 7). Das neue RSTP gilt ab 1. Januar 2027 (beschlossen am 10. Juni 2026)",
      "DFB-Broschüren „Willkommen im Verein!“ (2015) und „Im Fußball zu Hause!“ (2016)",
    ],
  ],
  [
    "Gesetze (gesetze-im-internet.de, abgerufen 29. September 2026)",
    [
      "BGB §§ 107, 126, 127, 832, 1629, 1687, 1688, 1797",
      "PAuswG § 20; PassG § 18; StAG § 4; BMG § 18",
      "JuSchG §§ 1, 2, 4, 5; JArbSchG §§ 1, 6; KUG §§ 22, 23",
      "DSGVO Art. 5, 6, 7, 9, 12, 13, 30; BDSG § 38; eIDAS Art. 25",
      "SGB II §§ 19, 28, 37; BKGG §§ 6b, 9; AO § 52",
    ],
  ],
  [
    "Datenschutz und Versicherung",
    [
      "HBDI (Hessischer Beauftragter für Datenschutz und Informationsfreiheit): Handreichung „Datenschutz im Verein“, 21. November 2024",
      "Datenschutzkonferenz: Orientierungshilfe E-Mail, 16. Juni 2021",
      "BfDI: Datenschutz beim Personalausweis, abgerufen 29. September 2026",
      "Stiftung Datenschutz: Praxisratgeber Gesundheitsdaten (ohne Datum)",
      "LSB Hessen: Muster-Datenschutzordnung, 09/2019",
      "ARAG-Merkblatt Sportversicherung LSB Hessen, Stand 1. Januar 2026",
      "Bundesärztekammer: GOÄ-Ratgeber (2010); Bundestag, hib-Meldung vom 24. September 2025",
      "Stadt Frankfurt, Gesundheitsamt: Attest für Sportverein (abgerufen 29. September 2026). Die Seite war nicht prüfbar, die Angaben sind nicht bestätigt.",
    ],
  ],
  [
    "Karneval",
    [
      "Großer Rat: Vereinsliste, Zugordnung (6. Dezember 2017), Satzung (8. Oktober 2018), Tanzturnierordnung (06/2026), Ausschreibungen 2027 (08/2026)",
      "BDK-Tanzturnierordnung vom 21. September 2019; RKK-Richtlinien 01-2023; IGMK-Satzung vom 23. September 2018",
      "FCV-Satzung vom 21. Oktober 2018 und FCV-Formular „Mitglied werden“ (Seite 2024)",
    ],
  ],
  [
    "Verein",
    [
      "Aufnahmeantrag 9/2026 (PDF vom 31. August 2026); Beitragsübersicht, 4. September 2026",
      "Satzung, ausgestellt 15. März 2024 (PDF vom 4. Februar 2025)",
      "Info-Blatt, 8. Januar 2014; Unterlagenliste, 14. Juni 2021; Zusatzerklärung, 8. Januar 2014",
      "Schutzkonzept, Stand Mai 2025",
      "Vereinsdaten (Mannschaften, Unterlagen, Karneval), Stand 22. bis 28. September 2026",
      `Regelwerk des Anmelde-Assistenten (Prototyp), Version ${REGELWERK_VERSION}, mit den offenen Punkten O01 bis O${String(ANZAHL_PUNKTE).padStart(2, "0")}`,
    ],
  ],
  [
    "Einfache Sprache und Statistik",
    [
      "DIN SPEC 33429:2025-03; Servicestandard des Bundes, 2. September 2025",
      "BITV 2.0, Anlage 2; BFIT-Handreichung vom 22. September 2026",
      "GOV.UK Design System; WCAG 2.2 vom 12. Dezember 2024; W3C Internationalization",
      "Stadt Frankfurt, Statistik aktuell 05/2026 (Stichtag 31. Dezember 2025); Statistikportal Frankfurt, Tabelle „Migrationshintergrund (Stadtteile)“ (Stichtag 31. Dezember 2025, abgerufen 29. September 2026)",
      "BAMF, Integrationskursgeschäftsstatistik 2025; LEO-Studie 2018; DOSB-Meldung zur Sportwörterbuch-App, 1. März 2026",
    ],
  ],
  [
    "Sekundärquellen und andere Landesverbände (nur ergänzend, für Hessen nicht maßgeblich)",
    [
      "Hamburger FV: Leitfaden 7. Oktober 2025, Hinweis zum internationalen Vereinswechsel 27. April 2022",
      "SWFV-Handbuch, 7. Juli 2026; NFV-Antrag 06/2024; Bremer FV, Beschlüsse des Verbandstags vom 20. Juni 2026",
      "FV Rheinland; SFV-Formular 01/2026; Rhein Main Verlag, 3. April 2024; Kanzlei Withers, 29. Juni 2026",
      "Beispiel-Aufnahmeantrag eines anderen Vereins (ab 2024)",
    ],
  ],
];

function quellenAbschnitt() {
  const gruppen = QUELLEN.map(
    ([titel, eintraege]) => `<h3>${escapeHtml(titel)}</h3>
    ${liste(eintraege, { klasse: "konzept-quellen" })}`
  ).join("\n    ");
  const inhalt = `${p(
    "Alle Quellen sind mit ihrem Stand genannt. Quellen anderer Landesverbände gelten in Hessen nicht. Sie zeigen nur, wie andere es machen."
  )}
    ${gruppen}`;
  return abschnitt("quellen", inhalt);
}

// ---------- Stil (nur für diese Seite, nur Tokens aus tokens.css) ----------

const STIL = `<style>
.konzept-liste { padding-left: 1.4rem; }
.konzept-liste > li { padding-left: var(--sp-1); }
.konzept-liste > li + li { margin-top: var(--sp-2); }
.konzept-quellen { font-size: var(--fs-sm); color: var(--ink-2); }
.konzept-quellen > li + li { margin-top: var(--sp-1); }
.konzept-box { --fluss: var(--sp-3); }
/* Tabellen: weißer Grund und Schatten am Rand zeigen, dass man seitlich wischen kann */
.konzept-tabelle {
  background:
    linear-gradient(to right, var(--surface) 30%, rgba(255, 255, 255, 0)) left center / 40px 100% no-repeat local,
    linear-gradient(to left, var(--surface) 30%, rgba(255, 255, 255, 0)) right center / 40px 100% no-repeat local,
    radial-gradient(farthest-side at 0 50%, rgba(11, 14, 74, .22), rgba(11, 14, 74, 0)) left center / 14px 100% no-repeat scroll,
    radial-gradient(farthest-side at 100% 50%, rgba(11, 14, 74, .22), rgba(11, 14, 74, 0)) right center / 14px 100% no-repeat scroll,
    var(--surface);
}
.konzept-tabelle table { min-width: 34rem; }
.konzept-tabelle--breit table { min-width: 46rem; }
.konzept-tabelle td { vertical-align: top; font-size: var(--fs-sm); line-height: 1.5; }
.konzept-tabelle--label td:first-child { min-width: 9rem; }
.konzept-tabelle--prio { max-width: 60rem; }
.konzept-tabelle--prio table { min-width: 0; }
.konzept-tabelle--prio td:first-child { width: 4.75rem; }
.konzept-frage { margin: 0; font-weight: 600; }
.konzept-warum { margin: var(--sp-1) 0 0; color: var(--ink-2); }
.konzept-tabelle--datum td:first-child { width: 7rem; white-space: nowrap; }
.konzept-toc { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 17rem), 1fr)); gap: 0 var(--sp-5); }
.konzept-toc a { display: inline-block; padding-block: var(--sp-1); }
.konzept .tag { vertical-align: 1px; }
.konzept-tabelle .tag { white-space: nowrap; }
/* Kleine Nummer eines offenen Punkts (O26 …): als Marke, als Link nur bei sichtbaren Zeilen */
.konzept .konzept-onr {
  display: inline-block;
  font-size: var(--fs-xs);
  font-weight: 700;
  letter-spacing: .04em;
  line-height: 1.5;
  padding: 0 4px;
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  background: var(--blau-50);
  color: var(--blau-900);
  white-space: nowrap;
  vertical-align: 1px;
}
.konzept a.konzept-onr { text-decoration: none; }
.konzept a.konzept-onr:hover { background: var(--blau-100); }
.konzept-tabelle td:first-child .konzept-onr { margin-top: var(--sp-1); }
/* Listen mit Nummer vor jedem Text (Fragen an den HFV, offene Punkte im Karneval) */
.konzept .konzept-oliste { list-style: none; margin: 0; padding: 0; max-width: calc(var(--measure) + 5rem); }
.konzept .konzept-oliste > li {
  display: grid;
  grid-template-columns: 3.4rem minmax(0, 1fr);
  gap: var(--sp-2);
  align-items: start;
  padding-block: var(--sp-2);
  border-top: 1px solid var(--line);
  max-width: none;
}
.konzept .konzept-oliste > li:first-child { border-top: 0; }
.konzept .konzept-oliste__nr { display: flex; flex-wrap: wrap; gap: var(--sp-1); align-content: flex-start; padding-top: 2px; }
.konzept .konzept-oliste__text { max-width: var(--measure); }
/* Aufklapper für P2 und P3 */
.konzept-mehr > summary {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  min-height: 44px;
  padding: var(--sp-2) var(--sp-4);
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: var(--surface);
  font-weight: 700;
  color: var(--blau-900);
  cursor: pointer;
  list-style: none;
}
.konzept-mehr > summary::-webkit-details-marker { display: none; }
.konzept-mehr > summary::before {
  content: "\\203A";
  font-size: 1.4em;
  line-height: 1;
  transition: transform var(--t-kurz);
}
.konzept-mehr[open] > summary::before { transform: rotate(90deg); }
.konzept-mehr[open] > summary { margin-bottom: var(--sp-3); }
@media print {
  .konzept-mehr > summary::before { content: ""; }
}
@media print {
  .konzept-mehr::details-content { content-visibility: visible; display: block; }
}
</style>`;

// ---------- Seite ----------

export function seite() {
  const inhalt = [
    STIL,
    kopfAbschnitt(),
    kurzAbschnitt(),
    warumAbschnitt(),
    assistentAbschnitt(),
    pdfAbschnitt(),
    unterschriftAbschnitt(),
    faelleAbschnitt(),
    gelerntAbschnitt(),
    wartefristenAbschnitt(),
    datenschutzAbschnitt(),
    entscheidenAbschnitt(),
    hfvFragenAbschnitt(),
    karnevalAbschnitt(),
    einfuehrungAbschnitt(),
    quellenAbschnitt(),
  ].join("\n");

  return {
    url: "/anmeldung-konzept/",
    title: "Anmeldung neu gedacht",
    description:
      "Entwurf für den Vorstand: Ein Anmelde-Assistent statt Formular. Ablauf, PDF, Fälle, Entscheidungen, Fragen an den HFV, Karneval und Einführungsplan.",
    // Interne Vorlage für den Vorstand: nicht in Suchmaschinen (noindex). Die
    // Sitemap-Aufnahme bleibt unverändert. Führendes "\n": begleit.html setzt
    // "{{kopfZusatz}}" ans Ende der Stylesheet-Zeile (gleiche Schreibweise wie
    // in src/begleit/anmeldung.mjs).
    kopfZusatz: '\n<meta name="robots" content="noindex">',
    inhalt,
  };
}
