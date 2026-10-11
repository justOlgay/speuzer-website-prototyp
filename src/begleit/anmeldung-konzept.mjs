// Anmeldung neu gedacht /anmeldung-konzept/ (AP-6, 29.09.2026; Runde 3 am 30.09.2026; Stand der Punkte am 11.10.2026) –
// Begleitseite für die 1. Vorsitzende und den Vorstand. Erklärt in etwa 10 Minuten,
// warum der Aufnahmeantrag nicht reicht, was der Anmelde-Assistent (Prototyp unter
// /anmeldung/) macht, was im PDF steht, welche Fälle es gibt, was an den bisherigen
// Unterlagen falsch oder veraltet ist, was der Verein entschieden hat und was noch offen ist,
// was beim Karneval nicht zur Anmeldung gehört und wie die Einführung in Schritten aussieht.
//
// Inhaltliche Grundlage (Stand der Recherche 29.09.2026): die Recherche-Synthese und
// die Vollständigkeitsprüfung; wo die Prüfung korrigiert, gilt die Prüfung. Was dort
// als „offen“ oder „unsicher“ steht, steht auch hier so, soweit es nicht inzwischen
// entschieden oder geregelt ist (Stand 11.10.2026, siehe unten).
//
// Runde 3 (30.09.2026): Abgleich mit dem fertigen Prototyp.
//   - Abschnitte 3 bis 5 (Assistent, PDF, Unterschrift) beschreiben den Endstand:
//     Teile A/B/C, einheitliche Namen der Papiere („Spielrecht“ im Fließtext),
//     Satzungs-Haken, zweiter Elternteil, keine leeren Erklärungsfelder unter einer
//     Bildschirm-Unterschrift, Notfall- und Gesundheitsbogen (mit und ohne Angaben zur
//     Gesundheit, Absprache zur Medikamentengabe), Attest beim Vereinswechsel,
//     lateinische Schrift, Vorführung, Datenschutz.
//
// Stand 11.10.2026 (Paket M2): Die Antworten der 1. Vorsitzenden sind eingearbeitet.
//   - Die Listen in den Abschnitten 10 bis 12 spiegeln data/anmeldung.json › offenePunkte
//     (Version 2026-10-11.2, O01 bis O73): jeder Punkt genau eine Zeile mit Kennzeichen und kleiner
//     Nummer (Anker #o01 …). Ein Punkt hat einen von fünf Ständen: entschieden, geregelt, entfällt,
//     später (Status „vorgemerkt“) oder offen. Nur „offen“ zählt als offene Frage und trägt P1, P2 oder P3.
//   - Die Seite liest die Punkte beim Bau (seite(daten), daten.anmeldung.offenePunkte). Stand, Priorität,
//     der Text zum Stand („entscheidung“ bei erledigten, „stand“ bei offenen Punkten) und die Zahlen im
//     Kasten „Stand“ kommen aus der Datei, nicht aus dieser Datei hier. Hier stehen nur die kurzen Fragen
//     je Zeile und der Hintergrund der offenen Punkte. Fehlt eine Zeile oder eine Angabe, bricht der Bau ab.
//   - Offene und entschiedene Zeilen stehen sichtbar, geregelte, entfallene und später geprüfte
//     in einem Aufklapper unter jeder Liste (<details>, in der Druckansicht offen).
//   - tools/anmeldung-test/konzept-pruefen.mjs vergleicht die gebaute Seite mit der Datei und schlägt an,
//     wenn beide auseinanderlaufen.
//   - Karneval gehört nicht zur Anmeldung (Entscheidung vom 11.10.2026): keine Gruppenwahl, keine Turniere,
//     keine Auftritte. Neu im Assistenten: das Blatt „Heimweg nach dem Training“. Beim Probetraining sind
//     Nichtmitglieder nicht über den Verein versichert; der Assistent weist darauf hin.
//   - Paket M9 (11.10.2026, Jugendleitung): Die Familie unterschreibt alles am Bildschirm, auch die Blätter des
//     Verbands (O68, O01). Ein Schalter in data/anmeldung.json (unterschriftHfv) stellt die Blätter des Verbands
//     auf Stift zurück, falls der Verband widerspricht. Abschnitt 5 „Unterschrift“ beschreibt beide Wege.
//
// Liegt wie /vorher-nachher/ und /app/ außerhalb der Hülle (docs/index.html) und
// außerhalb der Workspace-Seiten (docs/ws/) – eigene Vorlage src/vorlagen/begleit.html,
// keine Umschreibung der Verweise. Kommt NICHT ins appack-Paket. Keine Personennamen,
// nur Rollen (öffentliches Repo). Keine Telefonnummern, keine E-Mail-Adressen.
//
// Kleine Auszeichnungssprache in den Texten (siehe md()):
//   **fett**   [Text](#anker)   {pflicht} {verein} {offen}   {p1} {p2} {p3}   {br}
//   {entschieden} {geregelt} {entfaellt} {spaeter}   {a:id} = Verweis „Abschnitt N“   {o:O26} = kleine Nummer eines Punkts

// Diese Seite liegt immer unter "/anmeldung-konzept/" (Tiefe 1), daher "../".
const PFAD = "../";
const STAND_RECHERCHE = "29.09.2026";
const STAND_ABGLEICH = "11.10.2026";
const REGELWERK_VERSION = "2026-10-11.2";
const PROTOTYP = `${PFAD}anmeldung/`;

// ---------- Stand der Punkte (data/anmeldung.json › offenePunkte, beim Bau gesetzt) ----------

// Die fünf Stände eines Punkts, in der Reihenfolge, in der die Seite sie zählt und zeigt.
// kennzeichen: Schlüssel in KENNZEICHEN (offene Punkte tragen stattdessen P1, P2 oder P3).
// kurz: das Wort in „6 entschieden, 9 entfallen“.
const STATUS = {
  entschieden: { kennzeichen: "entschieden", kurz: "entschieden" },
  geregelt: { kennzeichen: "geregelt", kurz: "geregelt" },
  entfaellt: { kennzeichen: "entfaellt", kurz: "entfallen" },
  vorgemerkt: { kennzeichen: "spaeter", kurz: "später" },
  offen: { kennzeichen: "offen", kurz: "offen" },
};
const STATUS_REIHE = Object.keys(STATUS);

let PUNKTE = new Map(); // O-Nummer -> Punkt aus der Datei
const GEZEICHNET = new Set(); // Nummern, für die schon eine Zeile gebaut wurde (jede genau einmal)

// Nimmt die Punkte aus der Datei an und prüft sie so, wie es konzept-pruefen.mjs auch tut: gültiger Stand,
// „entscheidung“ bei erledigten Punkten, „stand“ bei offenen Punkten, nie beides.
function setzePunkte(liste) {
  if (!Array.isArray(liste) || liste.length === 0) {
    throw new Error("anmeldung-konzept: data/anmeldung.json › offenePunkte fehlt oder ist leer");
  }
  const neu = new Map();
  for (const x of liste) {
    if (!/^O\d{2}$/.test(x?.id ?? "")) throw new Error(`anmeldung-konzept: ungültige Nummer „${x?.id}“ in offenePunkte`);
    if (neu.has(x.id)) throw new Error(`anmeldung-konzept: ${x.id} steht doppelt in offenePunkte`);
    if (!STATUS[x.status]) throw new Error(`anmeldung-konzept: ${x.id} hat den unbekannten Status „${x.status}“`);
    if (!/^P[123]$/.test(x.prioritaet ?? "")) throw new Error(`anmeldung-konzept: ${x.id} hat keine Priorität P1 bis P3`);
    const feld = x.status === "offen" ? "stand" : "entscheidung";
    const anderes = x.status === "offen" ? "entscheidung" : "stand";
    if (typeof x[feld] !== "string" || !x[feld].trim()) {
      throw new Error(`anmeldung-konzept: ${x.id} (${x.status}) braucht das Feld „${feld}“`);
    }
    if (anderes in x) throw new Error(`anmeldung-konzept: ${x.id} (${x.status}) darf das Feld „${anderes}“ nicht haben`);
    neu.set(x.id, x);
  }
  PUNKTE = neu;
  GEZEICHNET.clear();
}

function punkt(oid) {
  const x = PUNKTE.get(oid);
  if (!x) throw new Error(`anmeldung-konzept: unbekannter offener Punkt "${oid}"`);
  return x;
}

// Zahl der Punkte je Stand, zum Beispiel { entschieden: 6, geregelt: 41, entfaellt: 9, vorgemerkt: 7, offen: 10 }.
function zaehle(oids) {
  const z = Object.fromEntries(STATUS_REIHE.map((s) => [s, 0]));
  for (const oid of oids) z[punkt(oid).status] += 1;
  return z;
}
const zaehleAlle = () => zaehle([...PUNKTE.keys()]);

// „24 geregelt“ oder „6 entschieden, 9 entfallen und 10 offen“ (nur Stände, die vorkommen).
function aufschluesselung(z) {
  const teile = STATUS_REIHE.filter((s) => z[s] > 0).map((s) => `${z[s]} ${STATUS[s].kurz}`);
  return teile.length > 1 ? `${teile.slice(0, -1).join(", ")} und ${teile.at(-1)}` : teile.join("");
}

// Ein Satz zur Zahl der Punkte: „Alle 3 Punkte der Abteilung sind entfallen.“ oder „Von 26 Fragen sind 24 geregelt und 2 offen.“
// nom: das Wort im Nominativ (Alle 3 …), dat: im Dativ (Von 3 …).
function zaehlSatz(oids, nom, dat = nom) {
  const z = zaehle(oids);
  const arten = STATUS_REIHE.filter((s) => z[s] > 0);
  if (arten.length === 1) return `Alle ${oids.length} ${nom} sind ${STATUS[arten[0]].kurz}.`;
  return `Von ${oids.length} ${dat} sind ${aufschluesselung(z)}.`;
}

// Sichtbar (nicht im Aufklapper) stehen offene und entschiedene Punkte. Verweise (Links) auf eine Nummer
// gibt es nur, wenn die Zeile sichtbar ist. Ein Link auf eine eingeklappte Zeile führt ins Leere.
const istSichtbar = (oid) => ["offen", "entschieden"].includes(punkt(oid).status);

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
// Auch „1. Vorsitzende“ bleibt zusammen (die Zeile soll nicht nach „1.“ umbrechen).
function typo(text) {
  return String(text)
    .replace(/\b(\d{1,2})\. (?=Vorsitzende)/g, "$1.\u00a0")
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
  entschieden: '<span class="tag tag--heim">Entschieden</span>',
  geregelt: '<span class="tag tag--geregelt">Geregelt</span>',
  entfaellt: '<span class="tag tag--entfaellt">Entfällt</span>',
  spaeter: '<span class="tag tag--spaeter">Später</span>',
};

// Kleine Nummer eines Punkts. Als Link nur, wenn die Zeile sichtbar ist.
function onrMarke(oid, mitLinks) {
  punkt(oid); // wirft bei einer unbekannten Nummer
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
  t = t.replace(/\{(pflicht|verein|offen|p1|p2|p3|entschieden|geregelt|entfaellt|spaeter)\}/g, (_m, k) => KENNZEICHEN[k]);
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

// art: "" (weiß), "info" (blau) oder "offen" (Klärungsbedarf). inhalt: fertiges HTML. id: Anker des Kastens (optional).
function kasten(art, inhalt, id = "") {
  const zusatz = art ? ` hinweis--${art}` : "";
  return `<div${id ? ` id="${id}"` : ""} class="hinweis${zusatz} inhalt fluss konzept-box">
    ${inhalt}
  </div>`;
}

// Aufklapper für geregelte, entfallene und später geprüfte Punkte. Er ist ein normales <details>: ohne Skript,
// mit der Tastatur bedienbar, in der Druckansicht offen (siehe STIL).
function aufklapper(titel, inhalt) {
  return `<details class="konzept-mehr">
    <summary>${escapeHtml(titel)}</summary>
    ${inhalt}
  </details>`;
}

// Tabelle im horizontal scrollbaren Rahmen (.tabelle-wrap). Zellen sind Texte
// mit Auszeichnung (md) oder { html } (fertiges, sicheres HTML). breit: mehr Mindestbreite
// bei vielen Spalten oder Text.
// Eine Zeile ist eine Liste von Zellen oder ein Objekt { id, prio, zellen }.
// Zeilen mit id bekommen den Anker (#o26), data-prio und data-status (Stand des Punkts).
function tabelle({ beschriftung, spalten, zeilen, breit = false, ersteSpalte = "" }) {
  const kopf = spalten.map((s) => `<th scope="col">${escapeHtml(s)}</th>`).join("");
  const koerper = zeilen
    .map((z) => {
      const zellen = Array.isArray(z) ? z : z.zellen;
      const attr = Array.isArray(z)
        ? ""
        : `${z.id ? ` id="${z.id}"` : ""}${z.prio ? ` data-prio="${z.prio}"` : ""}${z.status ? ` data-status="${z.status}"` : ""}`;
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

// Zeile einer Liste für einen Punkt aus data/anmeldung.json. Erste Zelle: das Kennzeichen (P1 bis P3 bei einem offenen
// Punkt, sonst Entschieden, Geregelt, Entfällt oder Später) und die kleine Nummer. Zweite Zelle: die kurze Frage, darunter
// der Text aus der Datei – „entscheidung“ bei erledigten Punkten, „stand“ bei offenen –, bei offenen Punkten zuletzt der
// Hintergrund (warum). Alte Hintergründe erledigter Punkte stehen nicht mehr da: Sie widersprächen oft dem neuen Stand.
// Die Zeile steht sichtbar, wenn der Punkt offen oder entschieden ist, sonst im Aufklapper (sichtbar, siehe entscheidungsListe).
// Die Priorität bleibt als data-prio an der Zeile (sie steht so im Regelwerk), der Stand als data-status.
function punktZeile(oid, frage, warum = "") {
  const x = punkt(oid);
  if (GEZEICHNET.has(oid)) throw new Error(`anmeldung-konzept: die Zeile für ${oid} kommt doppelt vor`);
  GEZEICHNET.add(oid);
  const offen = x.status === "offen";
  const kennzeichen = offen ? x.prioritaet.toLowerCase() : STATUS[x.status].kennzeichen;
  const antwort = offen ? x.stand : x.entscheidung;
  return {
    oid,
    id: oid.toLowerCase(),
    prio: x.prioritaet,
    status: x.status,
    sichtbar: istSichtbar(oid),
    zellen: [
      `{${kennzeichen}}{br}{o:${oid}}`,
      {
        html: `<p class="konzept-frage">${md(frage, false)}</p><p class="konzept-antwort">${md(antwort, false)}</p>${
          offen && warum ? `<p class="konzept-warum">${md(warum, false)}</p>` : ""
        }`,
      },
    ],
  };
}

const SPALTEN_PUNKT = ["Stand · Nr.", "Punkt und Stand"];

// Eine Liste: Offene und entschiedene Punkte stehen sichtbar in einer Tabelle, die übrigen (geregelt, entfällt,
// später) darunter in einem Aufklapper; beide nach Stand und Nummer geordnet.
// punkte: [[Nummer, kurze Frage, Hintergrund (nur bei offenen Punkten)], …].
function entscheidungsListe({ name, punkte, titelWeitere }) {
  const zeilen = punkte
    .map(([oid, frage, warum]) => punktZeile(oid, frage, warum))
    // erst nach Stand in der Reihenfolge von STATUS (entschieden vor offen), dann nach Nummer
    .sort((a, b) => STATUS_REIHE.indexOf(a.status) - STATUS_REIHE.indexOf(b.status) || a.oid.localeCompare(b.oid));
  const sichtbar = zeilen.filter((z) => z.sichtbar);
  const weitere = zeilen.filter((z) => !z.sichtbar);
  const teile = [];
  if (sichtbar.length) {
    teile.push(
      tabelle({
        beschriftung: `Punkte: ${name}, offen oder entschieden`,
        spalten: SPALTEN_PUNKT,
        ersteSpalte: "prio",
        zeilen: sichtbar,
      })
    );
  } else {
    teile.push(p("Kein Punkt dieser Liste ist offen."));
  }
  if (weitere.length) {
    const z = zaehle(weitere.map((x) => x.oid));
    const arten = STATUS_REIHE.filter((s) => z[s] > 0);
    // Nur ein Stand in der Gruppe: „24 geregelt“, sonst „12 (4 geregelt, 6 entfallen und 2 später)“
    const zahlen = arten.length === 1 ? `${weitere.length} ${STATUS[arten[0]].kurz}` : `${weitere.length} (${aufschluesselung(z)})`;
    teile.push(
      aufklapper(
        `${titelWeitere}: ${zahlen}`,
        tabelle({
          beschriftung: `Punkte: ${name}, geregelt, entfallen oder später`,
          spalten: SPALTEN_PUNKT,
          ersteSpalte: "prio",
          zeilen: weitere,
        })
      )
    );
  }
  return teile.join("\n    ");
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
  { id: "entscheiden", titel: "Entscheidungen und offene Punkte" },
  { id: "hfv-fragen", titel: "Fragen zum HFV (Passwesen)" },
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

// Alle Punkte, die die Passstelle betreffen (an: "hfv_passstelle" in data/anmeldung.json, Version 2026-10-11.2),
// in der Reihenfolge der Nummern. Der Wortlaut der Frage folgt der Datei; Stand und Text dazu kommen aus der Datei
// (punktZeile). Seit dem 11.10.2026 gilt: Der Assistent folgt den Vordrucken des HFV, das Passwesen klärt Sonderfälle.
const HFV_PUNKTE = [
  ["O01", "Reicht ein Scan oder eine digitale Unterschrift, oder muss das Papier-Original mit Stift vorliegen? Darf der Verein rein digital archivieren?"],
  ["O02", "Sind die Zusatzerklärung „To Player's Parents“ und die Länderformulare (USA, Mexiko, Argentinien, Brasilien, Balkan) noch nötig?"],
  ["O03", "Brauchen Nichtdeutsche unter 10 Jahren Ausweis und Meldebescheinigung? Zählt für die Grenze von 10 Jahren das Alter am Tag des Antrags?"],
  ["O04", "Sind beim Wechsel innerhalb Hessens Meldebescheinigung und Attest für Nichtdeutsche von 10 bis 17 Jahren wirklich nötig? Das Formular sagt ja, die Präsentation 2026 nennt sie nicht."],
  ["O05", "Braucht es beim Wechsel deutscher Minderjähriger Geburtsurkunde und Attest? Der Wortlaut von JO § 9 Nr. 1 und das Formular widersprechen sich."],
  ["O06", "Attest: Wie alt darf es höchstens sein? Welchen Inhalt muss es haben? Welche Rechtsgrundlage gilt für die Verarbeitung (Art. 9 DSGVO)? Werden Atteste aus dem Ausland angenommen?"],
  ["O07", "Die Vollmacht für die Abmeldung ist außerhalb des Junis nutzbar, mit den normalen Wartefristen. Folie 4 der Präsentation 2026 ist mehrdeutig."],
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
// ---------- Kopf ----------

// Kasten „Stand 11.10.2026“ ganz oben: die Zahlen je Stand kommen aus den Daten (zaehleAlle), nicht aus dem Text.
function standKasten() {
  const z = zaehleAlle();
  const zeilen = STATUS_REIHE.map(
    (s) => `<li data-status="${s}">${KENNZEICHEN[STATUS[s].kennzeichen]} <strong>${z[s]}</strong></li>`
  ).join("\n      ");
  return kasten(
    "info",
    `<p><strong>Stand ${STAND_ABGLEICH}</strong></p>
    ${p("Die Antworten der 1. Vorsitzenden sind eingearbeitet.")}
    <p>Von ${PUNKTE.size} Punkten sind:</p>
    <ul class="konzept-zahlen" role="list" aria-label="Zahl der Punkte je Stand">
      ${zeilen}
    </ul>
    ${p("Offen sind nur noch die Fragen im Excel an die 1. Vorsitzende.")}
    ${p("Die Zeilen stehen in {a:entscheiden}, {a:hfv-fragen} und {a:karneval}. Offene und entschiedene Punkte stehen sichtbar. Alle anderen stehen darunter im Aufklapper.")}`,
    "stand"
  );
}

function kopfAbschnitt() {
  const z = zaehleAlle();
  return `<section class="abschnitt seitenkopf konzept">
  <div class="container fluss">
    <p class="seitenkopf__kicker"><span class="tag tag--warn">Entwurf zur Abstimmung im Vorstand</span></p>
    <h1>Anmeldung neu gedacht – ein Assistent statt eines Formulars</h1>
    <p class="seitenkopf__lead">${md(
      "Heute meldet eine Familie ihr Kind mit dem Aufnahmeantrag an. Der Antrag fragt nur einen Teil dessen ab, was Verband und Verein wissen müssen. Ein Anmelde-Assistent stellt Schritt für Schritt nur die Fragen, die im jeweiligen Fall nötig sind. Am Ende steht ein vollständiges PDF für die Familie und den Verein."
    )}</p>
    <p class="knopfzeile"><a class="knopf" href="${PROTOTYP}">Prototyp ansehen</a></p>
    ${standKasten()}
    <p class="meta">${md(
      `Stand der Recherche: ${STAND_RECHERCHE}. Abgeglichen mit dem Prototyp am ${STAND_ABGLEICH} (Regelwerk Version ${REGELWERK_VERSION} mit ${PUNKTE.size} Punkten, davon ${z.offen} offen). Grundlage sind die Ordnungen des Hessischen Fußball-Verbands (HFV) für die Saison 2026/27, die Vereinsunterlagen und weitere Quellen ({a:quellen}). Der Prototyp ist ein Entwurf zum Anschauen. Er sendet und speichert nichts. Die Seite ersetzt keine Rechtsberatung.`
    )}</p>
    ${kasten(
      "",
      `<p><strong>So lesen Sie die Kennzeichen</strong></p>
    ${p("{pflicht} Verband, FIFA oder Gesetz schreiben es vor.")}
    ${p("{verein} Regel oder Praxis des Vereins.")}
    ${p("{offen} Nicht belegt oder unsicher. Wir müssen nachfragen.")}
    ${p("{entschieden} Der Punkt ist entschieden. Die Zeile nennt die Entscheidung und zählt nicht mehr als offene Frage.")}
    ${p("{geregelt} So machen wir es. Die Regel steht fest. Einzelfälle klärt der Verein.")}
    ${p("{entfaellt} Der Punkt gehört nicht zur Anmeldung. Er entfällt.")}
    ${p("{spaeter} Für den Start nicht nötig. Wir prüfen den Punkt später.")}
    ${p("{p1} {p2} {p3} Dringlichkeit eines offenen Punkts. P1 muss vor dem Livegang geklärt sein.")}
    <p><span class="konzept-onr">O26</span> Nummer des Punkts im Regelwerk des Prototyps. Damit können wir im Gespräch auf eine Zeile verweisen.</p>
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
  const z = zaehleAlle();
  const hfv = HFV_PUNKTE.map(([oid]) => oid);
  const inhalt = `${liste([
    "**Das Problem.** Der Aufnahmeantrag fragt vieles nicht ab, was der HFV für das Spielrecht braucht. Fehlende Angaben und Unterlagen müssen einzeln nachgefordert werden. Dazu sind Vereinsunterlagen von 2014 und 2021 veraltet. {a:warum}",
    "**Die Lösung.** Ein Assistent im Browser fragt Schritt für Schritt in Einfacher Sprache. Er bietet Übersetzungshilfe auf Englisch, Türkisch und Arabisch. Am Ende erzeugt er ein PDF mit allen Unterlagen. Ein Prototyp zum Ausprobieren liegt vor. {a:assistent}, {a:pdf}",
    "**Die Unterschrift.** Die Familie unterschreibt alles am Bildschirm, nachdem sie die Satzung gelesen hat. Das gilt auch für die Blätter des Verbands. Das hat die Jugendleitung am 11.10.2026 entschieden ({o:O68}). Widerspricht der Verband, stellen wir diese Blätter wieder auf Stift um. Es reicht ein Elternteil ({o:O26}). Das Kind und der andere Elternteil bei getrennt lebenden Eltern haben ein freiwilliges Feld. {a:unterschrift}",
    "**Entschieden am 11.10.2026.** Die 1. Vorsitzende hat die Fragen beantwortet. Nichtmitglieder sind beim Probetraining nicht über den Verein versichert ({o:O27}). Die Mitgliedschaft beginnt am Tag der Anmeldung ({o:O30}). Es gibt keine Probemitgliedschaft ({o:O31}). {a:entscheiden}",
    `**Noch offen: ${z.offen} Punkte.** Sie stehen im Excel an die 1. Vorsitzende. Zum Beispiel: Wo liegen die Originale ({o:O24})? Wie übergibt die Familie das PDF in der Vereins-App ({o:O72})? Welche Rechtsgrundlage gilt für die Notfallkontakte ({o:O67})?`,
    `**Beim HFV.** Der Assistent folgt den Vordrucken des HFV. Sonderfälle klärt das Passwesen im Einzelfall. Von ${hfv.length} Fragen sind ${zaehle(hfv).offen} offen. {a:hfv-fragen}`,
    "**Karneval.** Karneval gehört nicht zur Anmeldung im Assistenten. Die Karnevalabteilung klärt ihre Fragen selbst ({o:O28}). {a:karneval}",
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
    "Fußball, Karneval, beides oder nur Förderer. Bei Fußball fragt er nach Mannschaft, Spielen, Spielerpass und Wechsel, Pass und Wohnort, Sorgerecht und Besonderem. Die Antworten entscheiden, welche Unterlagen der Verband verlangt. Bei Karneval entfallen diese Fragen. Eine Gruppenwahl gibt es nicht. Die Trainer ordnen die Kinder einer Gruppe zu.",
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
    "Die Familie entscheidet über die Erlaubnis für Fotos, die Erlaubnis für Name und Foto im Internet, Fahrten und Messenger-Gruppe. Bei Kindern klärt sie den Heimweg nach dem Training: allein oder abgeholt. Dann nennt sie einen Notfallkontakt und wählt, ob sie einen Gesundheitsbogen ausfüllt. Eine Liste zeigt „Habe ich“ und „Fehlt noch“. Die Familie fotografiert jeden Nachweis mit dem Handy oder wählt eine Datei. Auch das Spielerfoto entsteht hier.",
  ],
  [
    "Unterschrift",
    "Die Familie wählt: am Bildschirm oder auf Papier. Vor der Bildschirm-Unterschrift setzt sie den Haken bei der Satzung. Am Bildschirm unterschreibt sie alles, auch die Blätter des Verbands ({a:unterschrift}).",
  ],
  [
    "Fertig",
    "Die Familie prüft alle Angaben und ändert, was nicht stimmt. Dann baut der Assistent das PDF ({a:pdf}). Es zeigt auch, was noch fehlt und wie es weitergeht. Dort steht auch: Beim Probetraining sind Nichtmitglieder nicht über den Verein versichert.",
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
      "**Hilfe-Knopf.** Auf jeder Seite steht an derselben Stelle ein Hilfe-Knopf mit den Kontaktdaten des Vereins. Die Geschäftsstelle hilft per Telefon und E-Mail. Feste Sprechzeiten gibt es nicht. {o:O52}",
      "**Ehrliche Grenzen.** Wo eine Regel nicht sicher ist, sagt der Assistent das: „Vielleicht nötig – der Verein sagt Ihnen Bescheid.“ Auf dem Laufzettel steht der Punkt dann als „klären“. Fristen schätzt der Assistent nur ({a:wartefristen}).",
      "**Nichts wird gesendet oder gespeichert.** Alle Angaben und Fotos bleiben im Browser. Fotos werden dort neu kodiert, das entfernt Standort- und Kameradaten. Ein Knopf löscht alle Angaben. Ob ein Zwischenstand gespeichert werden soll, entscheidet der Verein später. Die Beispiele im Prototyp nutzen nur erfundene Daten. Ihre Telefonnummern stammen aus der Liste der Bundesnetzagentur für Medien.",
      "**Website und App aus einem Guss.** Der Assistent ist in Website und Vereins-App dieselbe Seite. In der App fällt nur der Begleitrahmen weg. Offen ist die Übergabe der Datei in der App ({o:O72}). Dafür ist der automatische Versand über die eigene Annahme vorgesehen, mit Schutz für die Gesundheitsdaten ({o:O73}).",
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
          "Laufzettel als Deckblatt. Aufnahmeantrag mit Erlaubnis für Fotos und Erlaubnis für die Lastschrift. Liste der Familienmitglieder. Information zum Datenschutz. Antrag auf Spielerlaubnis, ausgefüllt. Vollmacht für die Abmeldung oder Abmeldung beim alten Verein. Weitere Einverständnisse und Erlaubnisse: Einverständnis für Spiele bei den Herren, Einverständnis für Mädchen bei den Jungen, Einverständnis für Fahrten und Messenger-Gruppe, Heimweg nach dem Training. Seite mit dem Spielerfoto. Kopien der Nachweise mit Wasserzeichen.",
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
      "**Antrag auf Spielerlaubnis.** Das ist das offizielle, ausfüllbare PDF des Verbands. Der Assistent befüllt es. Die Felder des Vereins und die Bearbeitungsvermerke bleiben leer. Die Unterschriften der Familie stehen als Bild im Formular, auf Seite 3 mit dem Datum der Anmeldung. Blau markiert sind die Stellen für den Verein (Unterschrift und Stempel) und leer gebliebene Felder. Die Zeile des Kindes bleibt ohne Markierung, wenn das Kind nicht unterschreibt. Auf Seite 3 steht die freiwillige Erlaubnis für Name und Foto im Internet.",
      "**Attest vom Arzt.** Bei der Erstanmeldung Minderjähriger verlangt der Verband ein Attest (JO § 9 Nr. 1). Beim Vereinswechsel folgt der Assistent dem Vordruck des HFV ({o:O04}, {o:O05}). Hat die Familie ein Attest, kommt die Erlaubnis für das Attest mit ins PDF. Ist das Attest Pflicht und fehlt es, liegt die Vorlage für die Ärztin oder den Arzt bei. Auf dem Attest steht nur „keine Bedenken“. Diagnosen gehören nicht ins PDF.",
      "**Notfall- und Gesundheitsbogen.** Er ist freiwillig und nur für Kinder. Die Familie nennt zuerst einen Notfallkontakt und wählt dann, ob sie einen Gesundheitsbogen ausfüllt. Mit Angaben zur Gesundheit gilt die ausdrückliche Einwilligung nach Art. 9 DSGVO. Ohne Angaben zeigt der Bogen nur die Notfallkontakte. Die Rechtsgrundlage dafür klärt der Vorstand ({o:O67}). Die Absprache zur Medikamentengabe unterschreiben eine Person mit Sorgerecht und der Trainer immer getrennt mit Stift.",
      "**Heimweg nach dem Training.** Dieses Blatt gehört zu Teil B, wenn Minderjährige Fußball spielen oder tanzen. Die Eltern kreuzen an: allein nach Hause oder abgeholt. Das klärt die Aufsichtspflicht. Der Verein gibt eine Kopie an das Trainerteam. Ohne Antwort wird die Stelle zur Stift-Stelle.",
      "**Wasserzeichen.** Jede Kopie eines Nachweises trägt den Vermerk „KOPIE“ mit dem Zweck, dem Namen des Vereins und dem Datum. So lässt sich die Kopie nicht anders verwenden.",
      "**Spielerfoto.** Es steht auf einer eigenen Seite. Zusätzlich gibt es das Foto als JPG-Datei für den Upload in DFBnet.",
    ])}
    ${p("Was aus Datenschutzgründen nicht ins PDF gehört, steht in {a:datenschutz}.")}`;
  return abschnitt("pdf", inhalt);
}

// ---------- 5. Unterschrift ----------

function unterschriftAbschnitt() {
  const inhalt = `${p("Seit dem 11.10.2026 unterschreibt die Familie alles am Bildschirm, auch die Blätter des Verbands. Das hat die Jugendleitung entschieden ({o:O68}). Nur die Ärztin oder der Arzt und der Verein unterschreiben immer mit Stift. Ein Schalter in den Daten stellt die Blätter des Verbands auf Stift zurück.")}
    ${tabelle({
      beschriftung: "Wege für die Unterschrift",
      spalten: ["Unterlagen", "So wird unterschrieben", "Grund"],
      breit: true,
      ersteSpalte: "label",
      zeilen: [
        [
          "**Vereinsunterlagen:** Aufnahmeantrag mit Erlaubnis für Fotos und Erlaubnis für die Lastschrift, Information zum Datenschutz (Kenntnisnahme), Einverständnisse und Erlaubnisse des Vereins",
          "Am Bildschirm, mit Finger oder Maus.",
          "Die Form bestimmt der Verein selbst. Die Satzung verlangt Schriftform. Nach § 127 BGB kann dafür auch eine elektronische Übermittlung reichen. Der Online-Aufnahmeantrag arbeitet schon so. Die Jugendleitung hat es am 11.10.2026 entschieden ({o:O68}).",
        ],
        [
          "**Blätter des Verbands:** Antrag auf Spielerlaubnis, Vollmacht für die Abmeldung, Abmeldung beim alten Verein, Einverständnis für Spiele bei den Herren",
          "Am Bildschirm, mit Finger oder Maus. Mit dem Schalter „stift“: mit Stift auf Papier.",
          "Beim Wechsel Minderjähriger verlangt JO § 37 Nr. 2 die „eigenhändige Unterschrift auf dem Antragsformular“. SpO § 92 verlangt den „unterzeichneten Original-Antrag“ und 2 Jahre Aufbewahrung. Laut Passstelle 2026 (Folie 6) muss das Papier bei der Antragstellung vorliegen. Die Jugendleitung hat trotzdem entschieden: Wir beginnen am Bildschirm. Die Antwort der Passstelle steht aus ({o:O01}). Verlangt der Verband das Original mit Stift, stellen wir den Schalter zurück.",
        ],
        [
          "**Immer mit Stift:** Attest der Ärztin oder des Arztes, Stempel des Vereins, Absprache zur Medikamentengabe",
          "Mit Stift, durch die jeweilige Person.",
          "Die Ärztin oder der Arzt unterschreibt und stempelt das Attest. Der Verein unterschreibt und stempelt den Antrag auf Spielerlaubnis. Die Absprache zur Medikamentengabe unterschreiben Eltern und Trainer getrennt.",
        ],
      ],
    })}
    ${p(
      "Eine am Bildschirm gezeichnete Unterschrift ist rechtlich eine einfache elektronische Signatur. Gleichgestellt ist nur die qualifizierte elektronische Signatur (eIDAS Art. 25). Ob die gezeichnete Unterschrift für den HFV-Teil reicht, ist deshalb nicht sicher. Die Jugendleitung nimmt das in Kauf ({o:O68}). Der Laufzettel im PDF sagt dem Verein, was zu tun ist, wenn der Verband ein Original mit Stift verlangt."
    )}
    <h3>So läuft die Unterschrift im Assistenten</h3>
    ${liste([
      "**Wahl.** Die Familie wählt „Am Bildschirm“ oder „Ich unterschreibe alles auf Papier“. Mit dem Schalter „stift“ heißt die erste Wahl „Am Bildschirm, wo es erlaubt ist“.",
      "**Satzung zuerst.** Vor der Bildschirm-Unterschrift liest die Familie die Satzung und setzt den Haken „Ich habe die Satzung gelesen.“ Der Haken ist Pflicht. Der Link führt auf die Satzung der Website, nicht auf die Adresse im Vordruck. Die Adresse im Vordruck ist defekt ({o:O66}). Auf dem Papierweg ist der Haken freiwillig. Dann kreuzt die Familie das Kästchen im Ausdruck von Hand an.",
      "**Ein Elternteil reicht.** Der Assistent zeigt nur ein Unterschriftsfeld für die Eltern, auch wenn beide Eltern das Sorgerecht haben. Das hat die Jugendleitung am 08.10.2026 entschieden ({o:O26}).",
      "**Zweiter Elternteil (nötig).** Das gilt nur, wenn die Eltern getrennt leben und der andere Elternteil nicht einverstanden ist. Dann muss auch er unterschreiben. Er hat ein eigenes Feld am Bildschirm. Das Feld ist freiwillig. Bleibt es leer, ist die Stelle im PDF mit Stift markiert, und der Laufzettel nennt es. Mit dem Schalter „stift“ gibt es kein Feld, er unterschreibt mit Stift. Grund ist die gemeinsame Vertretung nach § 1629 BGB: Ohne Zustimmung darf ein Elternteil nicht allein für beide handeln.",
      "**Das Kind als Spielerin oder Spieler.** Der Antrag auf Spielerlaubnis und die Abmeldung beim alten Verein haben eine Zeile für die Spielerin oder den Spieler. Bei Minderjährigen zeigt der Assistent dafür ein freiwilliges Feld: „Kann Ihr Kind schon schreiben? Dann unterschreibt es hier selbst.“ Kleine Kinder können das noch nicht. Bleibt das Feld leer, bleibt die Zeile im Antrag auf Spielerlaubnis ohne Markierung. Teil A nennt das Blatt dann nicht bei „Ausdrucken müssen Sie nur“, die Prüfseite zeigt „Nicht unterschrieben (freiwillig)“, und der Laufzettel sagt: „Das Kind hat den Antrag nicht unterschrieben. Das Passwesen entscheidet, ob das nötig ist.“ Nur die Abmeldung beim alten Verein bekommt bei leerem Feld die Stift-Markierung, denn sie geht ohnehin auf Papier per Einschreiben. Ob ein kleines Kind unterschreiben muss, fragen wir die Passstelle ({o:O11}).",
      "**Keine leeren Erklärungsfelder.** Eine Bildschirm-Unterschrift steht nur unter Angaben, die schon dastehen. Auf den eigenen Blättern des Vereins steht „–“ oder ein Satz statt eines leeren Feldes. Fehlt auf dem Aufnahmeantrag eine Erklärung, zum Beispiel zu den Fotos, zur IBAN oder zur Liste der Familienmitglieder, wird die Stelle zur Stift-Stelle. So ergänzt nach der Unterschrift niemand etwas von Hand.",
      "**Datum.** Eine Unterschrift am Bildschirm trägt Ort und Datum der Anmeldung. Das gilt auch auf den Blättern des Verbands, wo der Vordruck ein Datumsfeld neben der Unterschrift hat.",
      "**Was auf Papier bleibt.** Teil A nennt nur Blätter, die wirklich auf Papier müssen. Das sind die Vorlage für die Ärztin oder den Arzt und die Abmeldung beim alten Verein (Einschreiben). Dazu kommen Stellen, an denen ein freiwilliges Feld leer blieb: der zweite Elternteil und das Kind bei der Abmeldung. Die leere Zeile des Kindes im Antrag auf Spielerlaubnis zählt nicht dazu. Sonst steht dort: „Sie müssen nichts ausdrucken.“",
      "**Schalter.** Ein Wert in den Daten (unterschriftHfv in data/anmeldung.json) steht auf „bildschirm“. Auf „stift“ gestellt gilt wieder der Stand bis 11.10.2026: Die Blätter des Verbands kommen vorausgefüllt ins PDF, die Stellen sind blau markiert. Die Familie wählt, ob sie beim ersten Training unterschreibt und der Verein die Blätter ausgedruckt mitbringt, oder ob sie selbst ausdruckt. Im Programm ändert sich dafür nichts ({o:O68}, {o:O01}).",
    ])}
    <h3>Wer unterschreibt?</h3>
    ${liste([
      "Für den Antrag auf Spielerlaubnis genügt ein gesetzlicher Vertreter (SpO § 92 Nr. 1). Ob auch ein kleines Kind selbst auf der Zeile „Spieler“ unterschreiben muss, ist offen ({o:O11}). Bis dahin bietet der Assistent dem Kind ein freiwilliges Feld. Bleibt es leer, bleibt die Zeile im Antrag ohne Markierung, und das Passwesen entscheidet.",
      "Nach Zivilrecht vertreten Eltern ihr Kind gemeinsam (§ 1629 BGB).",
      "**Entscheidung der Jugendleitung (08.10.2026):** Ein Elternteil reicht. Bei „alleiniges Sorgerecht“, Vormund und Pflegeperson unterschreibt eine Person. {o:O26}",
      "Bei getrennt lebenden Eltern entscheidet der Elternteil, bei dem das Kind lebt, Alltagsfragen allein (§ 1687 BGB). Ob der Vereinsbeitritt dazu zählt, sagt das Gesetz nicht. {offen} Der Assistent fragt deshalb, ob der andere Elternteil einverstanden ist. Ohne Einverständnis unterschreibt der andere Elternteil zusätzlich, am Bildschirm oder mit Stift.",
      "Bei Vormund, Pflegefamilie oder Heim klärt die Jugendleitung persönlich ({a:faelle}).",
      "Die Erlaubnis für Fotos unterschreiben nur die Eltern. Jugendliche unterschreiben nicht zusätzlich. Das hat die 1. Vorsitzende am 11.10.2026 entschieden ({o:O65}).",
    ])}`;
  return abschnitt("unterschrift", inhalt);
}

// ---------- 6. Fälle ----------

// F01–F18 heißen wie in data/anmeldung.json › faelle (Version 2026-10-08.1). Die Hinweise
// stammen aus der Synthese (Abschnitt 2.3) und der Vollständigkeitsprüfung (F15–F18 und die
// Korrekturen K3, K4, K6, K7); die Verweise O.. nennen den offenen Punkt zur jeweiligen Lücke.
const FAELLE = [
  [
    "**F01** Nur Karneval",
    "Aufnahmeantrag mit Erlaubnis für die Lastschrift und Erlaubnis für Fotos. Je nach Fall: Liste der Familienmitglieder, Nachweis für Azubis oder Studierende. Bei Minderjährigen: Heimweg nach dem Training.",
    "Kein Antrag auf Spielerlaubnis und kein Attest. Gruppenwahl, Turniere, Auftritte und Kostüme gehören nicht zur Anmeldung. Die Abteilung klärt sie selbst ({o:O56}).",
  ],
  [
    "**F02** Passive Mitgliedschaft, Förderer oder Senator",
    "Aufnahmeantrag mit Erlaubnis für die Lastschrift. Senator nur als Antrag.",
    "Die Satzung kennt keine Senatoren. Der Vorstand entscheidet über die Aufnahme. Der Beitrag steht in der Beitragsübersicht: 144 € im Jahr ({o:O34}).",
  ],
  [
    "**F03** Kind neu im Fußball, deutsch",
    "Antrag auf Spielerlaubnis, Geburtsurkunde, Attest vom Arzt, digitales Spielerfoto.",
    "Keine Wartefrist. Im Kreis Frankfurt brauchen auch G- und F-Kinder ein Spielrecht, wenn sie an Spielen, Turnieren oder Festivals teilnehmen. Auch Doppelstaatler mit deutschem Pass gehören hierher. Dafür folgt der Assistent dem Vordruck des HFV. Sonderfälle klärt das Passwesen im Einzelfall ({o:O09}).",
  ],
  [
    "**F04** Kind neu im Fußball, nichtdeutsch, unter 10 Jahren",
    "Wie F03. Für Ausweis und Meldebescheinigung (Bescheinigung des Bürgeramts über den Wohnsitz) folgt der Assistent dem Vordruck des HFV ({o:O03}).",
    "Ein Freigabeschein ist nicht nötig. Der Verband prüft vor der Registrierung, ob eine FIFA-Ausnahme oder die 5-Jahres-Regel greift (Art. 19 Abs. 6). Dafür folgt der Assistent dem Vordruck des HFV. Sonderfälle klärt das Passwesen im Einzelfall ({o:O17}).",
  ],
  [
    "**F05** Kind neu im Fußball, nichtdeutsch (oder Rückkehrer) ab 10 Jahren",
    "Wie F03. Dazu Ausweiskopie und Meldebescheinigung (gemeinsamer Wohnsitz mit den Eltern in Deutschland).",
    "Der DFB gibt frei. Das Spielrecht kommt erst danach, das dauert länger. Bei der Meldebescheinigung mit nur einem Elternteil folgt der Assistent dem Vordruck des HFV ({o:O14}). Das Verfahren gilt ab 10 Jahren auch für Kinder mit deutschem Pass, die zuletzt im Ausland wohnten. Leben sie seit vielen Jahren wieder in Deutschland, klärt das Passwesen den Einzelfall ({o:O62}).",
  ],
  [
    "**F06** Wechsel innerhalb des HFV, Kind deutsch",
    "Antrag auf Spielerlaubnis, Abmeldung beim alten Verein (Einschreiben) oder Vollmacht für die Abmeldung, Foto. Dazu die Kündigung beim alten Verein.",
    "Freigabe (Zustimmung des alten Vereins) und Wartefrist nach JO §§ 35 und 38 ({a:wartefristen}). Für Geburtsurkunde und Attest folgt der Assistent dem Vordruck des HFV ({o:O05}).",
  ],
  [
    "**F07** Wechsel innerhalb des HFV, Kind nichtdeutsch",
    "Wie F06. Dazu Ausweiskopie. Bei 10 bis 17 Jahren auch Meldebescheinigung und Attest.",
    "Beim Wechsel innerhalb Hessens sagt das Formular ja, die Präsentation 2026 nennt Meldebescheinigung und Attest nicht. Der Assistent folgt dem Formular ({o:O04}).",
  ],
  [
    "**F08** Wechsel aus einem anderen Landesverband",
    "Wie F06. Standard ist das Einschreiben.",
    "Der HFV fragt beim Verband des alten Vereins an. Nach 20 Tagen ohne Antwort gilt die Abmeldung als ordnungsgemäß (JO § 43, Jugend). Bei den Herren nennt der HFV 30 Tage, der DFB 20 Tage. Der Assistent bleibt bei seiner Rechnung. Das Passwesen prüft im Einzelfall ({o:O22}). Ob die Vollmacht für die Abmeldung hier geht, ist nicht belegt. Das Passwesen klärt es im Einzelfall ({o:O18}).",
  ],
  [
    "**F09** Wechsel aus dem Ausland, Verein bekannt",
    "Ausweis und Angaben zum Auslandsverein (Name, Ort, Land, Status, letztes Spiel). Bei Junioren auch Geburtsurkunde, Attest und Meldebescheinigung.",
    "Im Ausland ist keine Abmeldung nötig (SpO § 99 Nr. 1). Ab 10 Jahren gibt der DFB frei (Freigabeschein, international „ITC“). Unter 10 ist kein Freigabeschein nötig. Ob der Verein die Kopie eines deutschen Ausweises hochladen darf, klärt das Passwesen im Einzelfall ({o:O10}).",
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
    "Grundsätzlich nur der ältere A-Jahrgang (2008), der Jahrgang 2009 nur in Ausnahmefällen. Ein Arzt ist Pflicht. Ob ein Sportarzt nötig ist, klärt das Passwesen im Einzelfall ({o:O20}).",
  ],
  [
    "**F14** Sonderfall bei Sorgerecht oder Aufenthalt",
    "Nachweis der Vormundschaft (Bestellungsurkunde oder schriftliche Übertragung). Bei Geflüchteten Nachweis des Schutzstatus.",
    "Die Jugendleitung klärt persönlich. Die Anmeldung wird nicht blockiert. Die genaue HFV-Liste klärt das Passwesen im Einzelfall ({o:O12}).",
  ],
  [
    "**F15** Geflüchtetes Kind ohne Eltern in Deutschland",
    "Nachweis von Schutzstatus oder Aufenthalt, Bestellung des Vormunds, Einwilligung des Vormunds.",
    "FIFA-Ausnahme d (Art. 19 Abs. 2 d). Welche Nachweise der HFV genau will, klärt das Passwesen im Einzelfall ({o:O12}, {o:O15}). Der Assistent macht keine Zusage zu Spielen.",
  ],
  [
    "**F16** Austauschschüler ohne Eltern",
    "Unterlagen zum Austauschprogramm mit Dauer, Einwilligung der Gasteltern und der Eltern, Bestätigung der Rückkehr.",
    "FIFA-Ausnahme e. Das Spielrecht gilt höchstens 1 Jahr, ein weiterer Wechsel ist nicht erlaubt. Nur bei einem reinen Amateurverein. Die genaue HFV-Liste klärt das Passwesen im Einzelfall ({o:O12}, {o:O15}).",
  ],
  [
    "**F17** Kind bei Verwandten oder in Pflegefamilie ohne Schutzstatus",
    "Nachweis, dass das Kind seit 5 Jahren ununterbrochen in Deutschland wohnt (Wohnsitznachweis, nicht älter als 3 Monate) und noch nie registriert war.",
    "Nur unter dieser Bedingung möglich. Sonst gilt: Training ja, Spiele wahrscheinlich erst mit 18. Auch Freundschaftsspiele gehen nicht. Der Umzug der Eltern (Ausnahme a) zählt nicht für Verwandte. Die genaue HFV-Liste klärt das Passwesen im Einzelfall ({o:O12}, {o:O15}).",
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
      "**Frauen ab 18 bei den Herren:** Sonderspielrecht auf Antrag (SpO § 109a, Pilotprojekt bis 30.06.2028). Der FFV hat keine Frauenmannschaft. Den Ablauf klärt das Passwesen im Einzelfall ({o:O21}).",
      "**Geschlecht „divers“ oder „ohne Angabe“:** Die Person wählt Frauen- oder Herrenteam (SpO § 91 Nr. 8 und 9). Die Jugendleitung und die Vertrauensperson des HFV begleiten den Antrag.",
      "**Behinderung:** Sonderspielrecht in einer jüngeren Altersklasse mit fachärztlichem Gutachten (JO § 11 Nr. 5). Die HFV-Gebühr beträgt 25 €.",
      "**Wechsel in den letzten 6 Monaten oder laufende Sperre:** Die Wartefrist verschiebt sich ({a:wartefristen}).",
    ])}
    <h3>Altersklassen 2026/27</h3>
    ${p("Der Assistent rechnet den Jahrgang in die Altersklasse um (Kreisjugendausschuss Frankfurt). Für Altersgrenzen wie „unter 18“ oder „ab 10 Jahren“ zählt der Tag der Anmeldung. Ob der Verband denselben Tag nimmt, prüft das Passwesen im Einzelfall ({o:O23}).")}
    ${tabelle({
      beschriftung: "Altersklassen und Jahrgänge 2026/27",
      spalten: ["Altersklasse", "G", "F", "E", "D", "C", "B", "A"],
      zeilen: [["**Jahrgänge**", "2020 und jünger", "2018, 2019", "2016, 2017", "2014, 2015", "2012, 2013", "2010, 2011", "2008, 2009"]],
    })}
    ${p(
      "Für die Jahrgänge 2010 bis 2013 hat der Verein 2026/27 keine Mannschaft. Der Assistent verweist diese Familien an die Jugendleitung. Einzelfälle klärt der Verein mit der Familie ({o:O54})."
    )}`;
  return abschnitt("faelle", inhalt);
}

// ---------- 7. Was wir gelernt haben ----------

// Kurzfazit der Synthese (Abschnitt 1) mit den Korrekturen der Vollständigkeitsprüfung.
const GELERNT = [
  [
    "Geburtsurkunde brauchen nur ausländische Kinder.",
    "**Falsch.** Bei der Erstanmeldung ist sie Pflicht für alle Minderjährigen (JO § 9 Nr. 1). Sie belegt aber nicht die Staatsangehörigkeit. Beim Wechsel deutscher Kinder folgt der Assistent dem Vordruck des HFV ({o:O05}).",
  ],
  [
    "Das Attest verlangen wir als Verein.",
    "**Falsch.** Der HFV verlangt es bei Minderjährigen (JO § 9 Nr. 1). Jeder Arzt genügt. Es gilt außerdem für Juniorinnen unter 18 (SpO § 110) und für A-Junioren unter 18, die bei den Herren spielen (JO § 29). Bei Erwachsenen ist es nur eine Vereinsregel.",
  ],
  [
    "Meldebescheinigung und Pass für Nichtdeutsche jeden Alters bei der Erstanmeldung.",
    "**Der HFV verlangt sie nur von 10 bis 17 Jahren.** Die Meldebescheinigung muss den gemeinsamen Wohnsitz von Kind und Eltern zeigen. Für Kinder unter 10 folgt der Assistent dem Vordruck des HFV ({o:O03}, {o:O17}). Beim Wechsel braucht der HFV den Ausweis von allen Nichtdeutschen, egal wie alt.",
  ],
  [
    "Eine Ausweiskopie gehört zur Anmeldung.",
    "**Nicht von deutschen Kindern.** Kopien deutscher Ausweise dürfen nicht weitergegeben werden (§ 20 PAuswG, § 18 PassG). Bei internationalen Wechseln klärt das Passwesen die Frage im Einzelfall ({o:O10}).",
  ],
  [
    "Ein Passbild auf Papier für den Spielerpass.",
    "**Überholt.** Den Spielerpass gibt es nur digital. Das Spielerfoto ist ein JPG oder PNG im Format 3:4, mindestens 375 Pixel breit. Es muss vor dem ersten Spiel in DFBnet liegen und kommt bei jedem Wechsel neu. Im Kreis Frankfurt gilt es 2 Jahre. Ein Papierfoto braucht der HFV nicht.",
  ],
  [
    "Zum Wechsel gehört die Vollmacht für die Abmeldung.",
    "**Eine von mehreren Varianten.** Die Vollmacht für die Abmeldung ist ein HFV-Vordruck für DFBnet Pass Online. Die andere Variante ist die Abmeldung beim alten Verein per Einschreiben: Der Einlieferungsbeleg genügt, ein Einwurf-Einschreiben zählt nicht. Der alte Verein kann auch selbst in DFBnet abmelden. Nach SpO § 92 Nr. 2 ist die Vollmacht das ganze Jahr nutzbar. Außerhalb des Junis gelten die normalen Wartefristen. Die Passstelle schreibt: Nutzung „nur bis zum 30. Juni mit verkürzter Wartefrist“. Das ist mehrdeutig. Das Passwesen prüft es im Einzelfall ({o:O07}). Der Abmeldetag ist der Tag der Eingabe im System. Jeder Tag Verzögerung verlängert die Wartefrist.",
  ],
  [
    "Nicht auf der Liste: die Kündigung beim alten Verein.",
    "**Sie kommt extra.** Die Mitgliedschaft im alten Verein muss gesondert gekündigt werden. Der Vordruck „Abmeldung beim alten Verein“ hat dafür ein eigenes Kästchen. Der Austritt eines Minderjährigen gilt nur mit der Unterschrift des gesetzlichen Vertreters (JO § 3 Nr. 2). Der alte Verein darf bis zum Ende seiner Kündigungsfrist Beitrag verlangen.",
  ],
  [
    "Die Zusatzerklärung für Spieler von 12 bis 18 Jahren.",
    "**Überholt.** Der HFV nennt sie nicht mehr, und die Altersgrenze liegt heute bei 10. Sie ist ein Vordruck von 2014. Auf dem Antrag auf Spielerlaubnis steht: „weitere Dokumente sind ab sofort nicht einzureichen“. Fordert die Passstelle sie doch an, klärt das Passwesen den Einzelfall ({o:O02}).",
  ],
  [
    "Zusatzformulare für Spieler aus USA, Mexiko, Argentinien und Brasilien.",
    "**Unklar.** Sie stehen nicht auf der HFV-Formularseite. Wenn überhaupt, betreffen sie internationale Wechsel. Wir verlangen sie nur, wenn die Passstelle sie anfordert ({o:O02}). Die Anmeldung wird nicht blockiert.",
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
    "**Vereinssache, keine Pflicht des Verbands.** Ohne Erlaubnis für die Lastschrift bekommt die Familie eine Rechnung. Der Zuschlag von 3 € ohne Lastschrift steht im Info-Blatt von 2014. Im Aufnahmeantrag 9/2026 und in der Beitragsübersicht steht er nicht. Der Assistent nennt ihn nicht mehr ({o:O38}).",
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
  "Ein eigener Weg für die Karnevalabteilung, ohne HFV-Unterlagen ({a:karneval}).",
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
    "Liegt das letzte Pflichtspiel mehr als 6 Monate zurück, entfällt die Wartefrist (JO § 47 Nr. 1). Außerhalb des Junis ersetzt eine Entschädigung die Freigabe nicht. Die Entschädigung zahlt der neue Verein. Für uns (Herren in der Kreisliga A) sind es 200 € für A und B, 100 € für C und D, dazu 25 € je angefangenem Spieljahr, höchstens 6. Für den jüngeren D-Jahrgang erlaubt der DFB höchstens 3 Monate, der HFV sieht 6 vor. Der Assistent bleibt bei seiner Rechnung. Das Passwesen prüft im Einzelfall ({o:O08}).",
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
    "Der HFV nennt keine Bearbeitungsdauer. Der Assistent nennt auch keine ({o:O13}). Ältere Angaben von 30 oder 7 Tagen sind überholt. Ab 01.01.2027 gilt ein neues FIFA-Transferreglement. Die Fristen prüfen wir dann neu ({o:O58}).",
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
    ${p("Die Wartefrist entfällt nach mehr als 6 Monaten ohne Pflichtspiel. Der Assistent rechnet damit nur, wenn dieser Zeitraum am Tag des Antrags schon vorbei ist. Ob der Verein den Antrag später stellen darf, um die Wartefrist zu vermeiden, prüft das Passwesen im Einzelfall ({o:O61}).")}`
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
      "**Keine Ausweiskopien deutscher Kinder.** Wo eine Kopie nötig ist, schwärzen wir Zugangsnummer (CAN) und Seriennummer und weisen darauf hin. Es gibt keine automatische Texterkennung und keine strukturierte Speicherung von Ausweisdaten. Was man auf ausländischen Pässen schwärzen darf, klärt das Passwesen im Einzelfall ({o:O10}).",
      "**Wasserzeichen.** Kopien tragen den Vermerk „KOPIE“ mit dem Zweck, dem Namen des Vereins und dem Datum.",
      "**Attest getrennt.** Im Attest steht nur „keine Bedenken“. Es ist ein Gesundheitsdatum (Art. 9 DSGVO). Welche Rechtsgrundlage der HFV annimmt, klärt das Passwesen im Einzelfall ({o:O06}). Deshalb holen wir mit der Erlaubnis für das Attest eine ausdrückliche Einwilligung ein. Verlangt der Verband das Attest nicht, vernichtet der Verein es sofort.",
      "**Notfall- und Gesundheitsbogen freiwillig.** Er liegt in Teil C, getrennt von den übrigen Unterlagen, und nur Trainer und Betreuer der Mannschaft sehen ihn. Mit Angaben zur Gesundheit gilt die ausdrückliche Einwilligung (Art. 9 Abs. 2 lit. a DSGVO). Ohne Angaben stehen nur die Notfallkontakte darauf. Die Rechtsgrundlage dafür klärt der Vorstand ({o:O67}). Die Absprache zur Medikamentengabe unterschreiben Eltern und Trainer getrennt mit Stift. Beim Austritt oder auf Widerruf wird alles gelöscht.",
      "**Information zum Datenschutz.** Eine eigene Seite im PDF informiert nach Art. 13 DSGVO. Sie verweist auf die Information zum Datenschutz des HFV (Stand 20.01.2026). Der Assistent sieht eine Unterschrift zur Kenntnisnahme vor. Nach Art. 13 DSGVO genügt die Information ({o:O63}).",
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
      "Ein Verarbeitungsverzeichnis. Wegen der Gesundheitsdaten greift die Ausnahme für kleine Stellen nicht. Für den Start ist es nicht nötig. Wir prüfen es später ({o:O46}).",
      "Die Prüfung, ob ein Datenschutzbeauftragter nötig ist: ab 20 Personen, die in der Regel ständig automatisiert mit Daten umgehen (§ 38 BDSG). Trainer mit Listen oder Messenger-Gruppen zählen mit.",
      "Satzung § 23 überarbeiten. Sie verweist noch auf das BDSG.",
      "Die Information zum Datenschutz in Einfacher Sprache schreiben und übersetzen. Die 1. Vorsitzende liest die neuen Texte einmal und gibt sie frei ({o:O45}).",
    ])}`;
  return abschnitt("datenschutz", inhalt);
}

// ---------- 10. Entscheidungen und offene Punkte ----------

// Jede Zeile ist ein Punkt aus data/anmeldung.json › offenePunkte (Version 2026-10-11.2). Hier steht nur die kurze Frage
// (bei offenen Punkten dazu der Hintergrund). Stand, Priorität und der Text zum Stand kommen aus der Datei (punktZeile).
// Die Listen sind nach dem Empfänger geordnet (an: vorstand, kassierer, datenschutz, versicherung, kreis_frankfurt,
// grosser_rat_bdk, jugendleitung, regelwerk); das Passwesen sammelt die Punkte zum Betrieb von DFBnet (O24 und O25 an den
// Vorstand, O69 und O70 an die Jugendleitung). Die Punkte der Karnevalabteilung (O55 bis O57) stehen im Abschnitt „Karneval“,
// die des HFV in „Fragen zum HFV“. Offene und entschiedene Zeilen stehen sichtbar, die übrigen im Aufklapper unter der Liste.

// ----- Vorstand -----
const VORSTAND = [
  ["O26", "Unterschreibt ein Elternteil, oder müssen beide Eltern unterschreiben?"],
  ["O27", "Wie sichern wir den Unfallschutz beim Probetraining? Schließen wir eine Nichtmitgliederversicherung ab, oder legen wir die Anmeldung vor das erste Training?"],
  ["O28", "Schalten wir das Online-Formular des Frankfurter Carneval Vereins (FCV) ab oder leiten wir es um? Wie hängen FCV und die FFV-Abteilung zusammen? Kommt Karneval in die Satzung?"],
  ["O29", "Melden wir uns zum Fastnachtszug 2027 an?"],
  ["O30", "Beginnt die Mitgliedschaft am Tag der Anmeldung? Wie berechnen wir den Beitrag im ersten Jahr?"],
  ["O31", "Verzichten wir auf beitragsfreie oder befristete Probemitgliedschaften?"],
  ["O66", "Reparieren wir die Weiterleitung der Satzungsadresse im Aufnahmeantrag, oder ändern wir die Adresse im Vordruck?"],
  [
    "O68",
    "Dürfen alle Unterlagen am Bildschirm unterschrieben werden, auch die Blätter des Verbands?",
    "Das ist eine einfache elektronische Unterschrift. Die Form bestimmt der Verein selbst: Die Satzung verlangt Schriftform, nach § 127 BGB kann eine elektronische Übermittlung reichen. Für die Blätter des Verbands verlangt JO § 37 Nr. 2 die eigenhändige Unterschrift. Der Laufzettel im PDF nennt das dem Verein ({a:unterschrift}).",
  ],
  [
    "O72",
    "Wie übergibt die Familie das PDF in der Vereins-App?",
    "In der App-Webansicht klappt Speichern oder Teilen der Datei vielleicht nicht. Für Website und App gleich wäre der automatische Versand an den Verein über die eigene Annahme (IONOS), wie beim Online-Aufnahmeantrag. Bis dahin weist der Assistent in der App auf „Im Browser öffnen“ hin.",
  ],
  ["O32", "Geben wir die HFV-Gebühr an die Familien weiter?"],
  ["O33", "Geben wir die Bescheinigung für Bildung und Teilhabe standardmäßig mit?"],
  ["O34", "Senatorenmitgliedschaft: Welchen Status und welches Stimmrecht haben Senatoren?"],
  ["O35", "Kostüme im Karneval: Wem gehören sie, was kosten sie, gibt es eine Kaution? Was zahlen Familien noch dazu?"],
  ["O36", "Aufsicht bei Abendauftritten, Umkleide und Kostümwechsel: Ergänzen wir das Schutzkonzept für den Karneval?"],
  ["O52", "Legen wir Ansprechpersonen, Sprachen und Sprechzeiten im Vereinsheim für den Hilfe-Knopf fest?"],
  ["O53", "Testen wir den Assistenten mit 3 bis 5 Eltern, die wenig Deutsch sprechen?"],
  ["O65", "Erlaubnis für Fotos bei Jugendlichen: Unterschreiben ab 14 oder ab 16 Jahren auch die Jugendlichen selbst?"],
  ["O71", "Wer pflegt Fristen, Beträge und Gebühren im Regelwerk des Assistenten, wenn sich Beitragsordnung oder Verbandsordnungen ändern?"],
];

// ----- Passwesen (DFBnet und Pass Online) -----
const PASSWESEN = [
  [
    "O24",
    "Wer hat die DFBnet-Kennung für Pass Online? Wo liegen die Originale 2 Jahre lang, und wer löscht sie danach?",
    "Über DFBnet reicht der Verein den Antrag auf Spielerlaubnis online ein und lädt das Spielerfoto hoch. Der HFV kann Unterlagen stichprobenartig verlangen. Sie müssen dann binnen 14 Tagen im Original vorliegen.",
  ],
  [
    "O25",
    "Wie kommen die Unterlagen zum Verein, und wer prüft sie auf Vollständigkeit?",
    "Der Antrag kann erst mit vollständigem, von Hand unterschriebenem Original an den HFV gehen.",
  ],
  [
    "O69",
    "Wer im Verein gibt eine Vollmacht für die Abmeldung am selben oder nächsten Tag in DFBnet ein?",
    "Bei der Vollmacht zählt der Tag der Eingabe als Abmeldetag. Jeder Tag Verzögerung verlängert die Wartefrist. Der Assistent bietet sie nur an, wenn die Eingabe am selben oder nächsten Tag klappt.",
  ],
  ["O70", "Wer meldet die Jugendspieler namentlich beim Kreisjugendwart, und bis wann?"],
];

// ----- Geschäftsstelle und Kasse -----
const KASSE = [
  ["O37", "Wird die Aufnahmegebühr von 20 € bar oder per Einzug bezahlt? Gilt sie auch im Karneval und für passive Mitglieder?"],
  ["O38", "Gilt der Zuschlag von 3 € ohne Lastschrift noch?"],
  ["O39", "Bekommt jede Erlaubnis für die Lastschrift eine eigene Mandatsreferenz? Nehmen wir IBANs aus allen SEPA-Ländern an?"],
  ["O40", "Wer gehört zur Familie? Welcher Beitrag gilt bei Doppelmitgliedschaft in Fußball und Karneval? Wie lange gilt der Nachweis für Azubis und Studierende?"],
  ["O41", "Zählt bei der Kündigung bis 31.12. die Absendung oder der Eingang?"],
  ["O42", "Behalten wir das Attest bei Erwachsenen als Vereinsregel? Schaffen wir das Papier-Passbild ab? Wer macht das Spielerfoto, und wer lädt es hoch?"],
  ["O43", "Formulieren wir den Hinweis zu den 20 € neu?"],
  ["O44", "Welche Altersgrenzen gelten für die Jugendbeiträge: das vollendete 18. Lebensjahr (Satzung), die A-Jugend einschließlich 18-Jähriger (Fußball) oder bis 17 (Karneval)?"],
];

// ----- Datenschutz und Vereinsunterlagen -----
const DATENSCHUTZ = [
  [
    "O67",
    "Welche Rechtsgrundlage gilt für die Notfallkontakte ohne Angaben zur Gesundheit: Art. 6 Abs. 1 lit. b oder lit. f DSGVO?",
    "Art. 9 DSGVO (ausdrückliche Einwilligung) passt nur zur Fassung mit Angaben zur Gesundheit. Für die Fassung „nur Notfallkontakte“ braucht die Information zum Datenschutz eine eigene Rechtsgrundlage. Der Entwurf im PDF nennt beide: lit. b für Mitgliedschaft und Fürsorge im Training, lit. f (berechtigtes Interesse) für weitere Kontaktpersonen. Der Vorstand bestätigt die Wahl.",
  ],
  [
    "O73",
    "Dürfen Gesundheitsdaten aus Teil C sowie Ausweis- und Passkopien per E-Mail an den Verein gehen?",
    "Beim automatischen Versand kämen sie mit. Möglich ist: nur verschlüsselt, oder Teil C und die Kopien getrennt auf Papier. Gesundheitsdaten brauchen besonderen Schutz (Art. 9 DSGVO).",
  ],
  [
    "O45",
    "Schreiben wir die Information zum Datenschutz in Einfacher Sprache, lassen sie übersetzen und vom Vorstand freigeben?",
    "Im PDF tragen die Information zum Datenschutz, alle Einverständnisse und Erlaubnisse die Fußzeile „Entwurf – vom Vorstand zu prüfen“.",
  ],
  ["O46", "Legen wir ein Verarbeitungsverzeichnis an, prüfen den Datenschutzbeauftragten und passen Satzung § 23 an?"],
  ["O47", "Stellen wir das Schutzkonzept fertig? Platzhalter „XXX“, fehlende Anlagen und private Kontaktadressen sind zu ersetzen."],
  ["O48", "Ersetzen wir Info-Blatt, Unterlagenliste, Zusatzerklärung und den toten Satzungslink?"],
  ["O63", "Ist die Unterschrift zur Kenntnisnahme der Information zum Datenschutz nötig?"],
];

// ----- Weitere Stellen (an: versicherung, kreis_frankfurt, grosser_rat_bdk, jugendleitung, regelwerk) -----
const STELLEN = [
  ["O49", "**ARAG-Versicherungsbüro und LSB:** Sind Karneval, Nichtmitglieder und neue Mitglieder vom ersten Tag an versichert? Ist die Karnevalabteilung beim LSB angemeldet?"],
  ["O50", "**Kreis Frankfurt:** Wie wird der Jahrgang 2020 zugeordnet, und wie wirkt die Funino-Regel in der F-Jugend?"],
  ["O51", "**Großer Rat und BDK:** Mitgliedschaft der Abteilung und Turnierfragen."],
  ["O54", "**Jugendleitung:** Was sagt der Assistent Familien mit Kindern der Jahrgänge 2010 bis 2013?"],
  ["O58", "**Regelwerk:** Neues FIFA-Transferreglement ab 01.01.2027: Regeln für internationale Wechsel neu prüfen."],
  ["O59", "**Regelwerk:** Ab 2027/28 spielt die E-Jugend nur noch 6 gegen 6 in Meldeligen: Wartefrist-Regeln für die E-Jugend neu prüfen."],
  ["O64", "**Gesundheitsamt Frankfurt:** Gibt es ein kostenloses Attest für Kinder mit Frankfurt-Pass oder Grundsicherungsgeld?"],
];

function entscheidenAbschnitt() {
  const inhalt = `${p(
    "Die Listen sind nach Empfängern geordnet. Offene und entschiedene Punkte stehen sichtbar. Geregelte, entfallene und später geprüfte Punkte stehen darunter in einem Aufklapper. Jede Zeile trägt Kennzeichen und Nummer, zum Beispiel O26. Bei erledigten Punkten steht die Entscheidung da. Bei offenen steht der Stand."
  )}
    ${kasten(
      "info",
      `${p("**Versicherung beim Probetraining: entschieden am 11.10.2026.**")}
    ${p(
      "Wer nur zum Probetraining kommt und kein Mitglied ist, hat über die Sportversicherung des LSB keinen persönlichen Unfall- und Haftpflichtschutz (ARAG-Merkblatt, Stand 01.01.2026). Die Haftpflicht des Vereins greift dagegen. Angebote für Nichtmitglieder gehören zur Mitgliederwerbung."
    )}
    ${p(
      "Eine Versicherung für Nichtmitglieder ist zu teuer. Der Verein schließt sie nicht ab ({o:O27}). Assistent, Website und App weisen stattdessen darauf hin. Beim Probetraining ist man nicht über den Verein versichert."
    )}
    ${p(
      "Die Mitgliedschaft beginnt am Tag der Anmeldung ({o:O30}). Es gibt keine Probemitgliedschaft ({o:O31}). Wer sich vor dem ersten Training anmeldet, ist ab diesem Tag Mitglied."
    )}`
    )}
    <h3>Vorstand</h3>
    ${entscheidungsListe({ name: "Vorstand", punkte: VORSTAND, titelWeitere: "Weitere Punkte des Vorstands" })}
    <h3>Passwesen (DFBnet und Pass Online)</h3>
    ${entscheidungsListe({ name: "Passwesen", punkte: PASSWESEN, titelWeitere: "Weitere Punkte des Passwesens" })}
    <h3>Geschäftsstelle und Kasse</h3>
    ${entscheidungsListe({ name: "Geschäftsstelle und Kasse", punkte: KASSE, titelWeitere: "Punkte für Geschäftsstelle und Kasse" })}
    <h3>Datenschutz und Vereinsunterlagen</h3>
    ${entscheidungsListe({ name: "Datenschutz und Vereinsunterlagen", punkte: DATENSCHUTZ, titelWeitere: "Weitere Punkte zu Datenschutz und Vereinsunterlagen" })}
    <h3>Weitere Stellen</h3>
    ${entscheidungsListe({ name: "Weitere Stellen", punkte: STELLEN, titelWeitere: "Punkte für weitere Stellen" })}
    <p class="meta">${md(
      "Die Punkte der Karnevalabteilung (O55 bis O57) stehen in {a:karneval}, die Fragen zum HFV in {a:hfv-fragen}."
    )}</p>`;
  return abschnitt("entscheiden", inhalt);
}

// ---------- 11. Fragen zum HFV ----------

function hfvFragenAbschnitt() {
  const oids = HFV_PUNKTE.map(([oid]) => oid);
  const z = zaehle(oids);
  const inhalt = `${p(
    "Die 1. Vorsitzende hat am 11.10.2026 entschieden. Der Assistent folgt den Vordrucken des HFV. Sonderfälle klärt das Passwesen im Einzelfall."
  )}
    ${p(
      `${zaehlSatz(oids, "Fragen")} ${
        z.offen ? "Die offenen Fragen gehen an das Passwesen. " : ""
      }Die Familie schreibt nie selbst an den HFV. Die Status-Hotline der Passstelle endete am 30.09.2026.`
    )}
    ${entscheidungsListe({ name: "Fragen zum HFV", punkte: HFV_PUNKTE, titelWeitere: "Weitere Fragen" })}`;
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
    "Nicht nötig. Weder BDK (Bund Deutscher Karneval) noch RKK noch der Große Rat verlangen ein Attest. Ein freiwilliger Notfall- und Gesundheitsbogen ist trotzdem sinnvoll.",
  ],
  [
    "**Versicherung**",
    "Mitglieder sind beim satzungsgemäßen Vereinsbetrieb versichert. Voraussetzung: Die Abteilung ist beim LSB angemeldet, und die Karnevalsmitglieder stehen in der Bestandsmeldung. Das klärt die Abteilung ({o:O49}). Wer nur schnuppert, ist nicht versichert ({o:O27}). Eine Probemitgliedschaft gibt es nicht ({o:O31}).",
  ],
  [
    "**Schutzkonzept**",
    "Es gilt für alle Trainer und Betreuer (erweitertes Führungszeugnis).",
  ],
];

// Die Punkte der Karnevalabteilung (an: karnevalabteilung). Die übrigen Punkte zum Karneval haben ihre Zeile in Abschnitt 10.
const KARNEVAL_PUNKTE = [
  ["O55", "Gruppen und Altersgrenzen der Karnevalabteilung bestätigen. Die Angaben stammen von der Internetseite des FCV (Stand 2024)."],
  ["O56", "Welche Turniere tanzen die Gruppen, und in welchen Verbänden (BDK, IGMK)? Ist die Gruppe „Freaky Fruities“ bis 16 oder bis 15 Jahre?"],
  ["O57", "Probetraining und Schnuppern im Karneval regeln. Die Website widerspricht sich hier."],
];

// Hintergrund aus der Recherche: gehört nicht zur Anmeldung, steht deshalb im Aufklapper.
const KARNEVAL_HINTERGRUND = [
  [
    "**Turniere**",
    "Großer Rat (Turnierordnung 06/2026): nur Mitgliedsvereine. Junioren 12 bis 15 Jahre, Hauptklasse ab 16, es zählt das Alter am Turniertag. Mindestens 4 Tänzer. Jede Tänzerin startet nur für einen Verein. Bei der Passkontrolle braucht jedes Kind einen Personal-, Kinder-, Schüler- oder Tanzausweis. BDK: nur mit Mitgliedschaft über die IGMK, mit Tanzturnierausweis und schriftlicher Zustimmung zu Aufnahmen. RKK: Tanzausweis für 5 € plus Versand, mit Passfoto.",
  ],
  [
    "**Fastnachtszug**",
    "Nur Mitgliedsvereine des Großen Rats dürfen teilnehmen. Mit der Teilnahme willigt man in Bild- und Tonaufnahmen ein (Zugordnung Nr. 9.3). Das gehört in die Elterninformation. Bei Kindergruppen müssen genug erwachsene Aufsichtspersonen mitgehen.",
  ],
  [
    "**Jugendschutz bei Auftritten**",
    "Bei Brauchtumsveranstaltungen dürfen Kinder bis 22 Uhr, Jugendliche unter 16 bis 24 Uhr auch ohne Begleitung bleiben (§ 5 JuSchG). Jugendliche sollten einen Ausweis dabeihaben (§ 2 JuSchG). Das Jugendarbeitsschutzgesetz greift nur bei Auftritten gegen Gage. Dann braucht es eine Bewilligung beim Regierungspräsidium Darmstadt.",
  ],
];

function karnevalAbschnitt() {
  const hintergrund = `${p("Diese Angaben stammen aus der Recherche. Sie gehören nicht zur Anmeldung. Die Karnevalabteilung kann sie nutzen.")}
    ${tabelle({
      beschriftung: "Karneval: Hintergrund zu Turnieren, Fastnachtszug und Jugendschutz",
      spalten: ["Thema", "Stand"],
      breit: true,
      ersteSpalte: "label",
      zeilen: KARNEVAL_HINTERGRUND,
    })}
    <h3>Zwei Anmeldewege stehen parallel online</h3>
    ${kasten(
      "",
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
      "Was mit dem FCV-Formular und den FCV-Mitgliedern geschieht, klärt die Karnevalabteilung ({o:O28}). Das ist unsere Ableitung und nicht belegt: Bisherige FCV-Mitglieder brauchen einen Aufnahmeantrag des FFV. Sie brauchen auch eine neue Erlaubnis für die Lastschrift, weil ein anderer Gläubiger abbucht. {offen}"
    )}`
    )}
    <h3>Karneval steht nicht ausdrücklich in der Satzung</h3>
    ${kasten(
      "",
      `${p(
        "Die FFV-Satzung (15. März 2024) nennt Sport sowie Kunst und Kultur. Karneval ist ein eigener gemeinnütziger Zweck (§ 52 Abs. 2 Nr. 23 AO). Die Satzung des Großen Rats (§ 3 Nr. 2a, 8. Oktober 2018) verlangt, dass der Mitgliedsverein das Brauchtum in seiner Satzung verankert."
      )}
    ${p(
      "Das berührt die Mitgliedschaft im Großen Rat, den Versicherungsschutz und die Gemeinnützigkeit. Ob es eine neuere Satzung gibt, klärt die Karnevalabteilung ({o:O28})."
    )}`
    )}`;
  const inhalt = `${p(
    "KA Schnauzer steht für die Karnevalabteilung „Die Schnauzer“ des Vereins. Karneval gehört nicht zur Anmeldung im Assistenten. Die Karnevalabteilung klärt ihre Fragen selbst. Das hat die 1. Vorsitzende am 11.10.2026 entschieden ({o:O28}, {o:O29})."
  )}
    <h3>Was der Assistent bei Karneval tut</h3>
    ${liste([
      "**Aufnahmeantrag.** Der Assistent fragt nach Person, Kontakt, Beitrag und Zahlung, wie im Fußball. Es gibt kein HFV-Formular und kein Attest.",
      "**Keine Gruppenwahl.** Die Trainer ordnen die Kinder einer Gruppe zu ({o:O55}).",
      "**Heimweg nach dem Training.** Bei Minderjährigen sagen die Eltern, ob das Kind allein nach Hause darf. Das Blatt gilt für Fußball und Karneval.",
      "**Notfall und Fahrten.** Der Notfall- und Gesundheitsbogen ist freiwillig. Das Einverständnis für Fahrten und Messenger-Gruppe gibt es auch im Karneval.",
      "**Nicht im Assistenten:** Turniere, Auftritte am Abend, Kostüme und der Fastnachtszug. Der Assistent fragt dazu nichts ({o:O29}, {o:O35}, {o:O36}, {o:O56}).",
    ])}
    <h3>Was belegt ist</h3>
    ${tabelle({
      beschriftung: "Karneval: was belegt ist",
      spalten: ["Thema", "Stand"],
      breit: true,
      ersteSpalte: "label",
      zeilen: KARNEVAL_BELEGT,
    })}
    <h3>Punkte der Karnevalabteilung</h3>
    ${p(
      `${zaehlSatz(KARNEVAL_PUNKTE.map(([oid]) => oid), "Punkte der Abteilung", "Punkten der Abteilung")} Weitere Punkte zum Karneval ({o:O28}, {o:O29}, {o:O35}, {o:O36}, {o:O49}, {o:O51}) stehen in {a:entscheiden}.`
    )}
    ${entscheidungsListe({ name: "Karnevalabteilung", punkte: KARNEVAL_PUNKTE, titelWeitere: "Punkte der Karnevalabteilung" })}
    ${aufklapper("Hintergrund für die Karnevalabteilung (gehört nicht zur Anmeldung)", hintergrund)}`;
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
    "Die 1. Vorsitzende hat am 11.10.2026 geantwortet. Offen sind nur noch die Fragen im Excel an sie ({a:entscheiden}). Die offenen Fragen zum HFV gehen an das Passwesen ({a:hfv-fragen}).",
  ],
  [
    "Texte prüfen und testen",
    "Muttersprachler lesen Texte und Übersetzungen gegen. 3 bis 5 Eltern, die wenig Deutsch sprechen, testen den Assistenten ({o:O53}). Das geschieht vor oder kurz nach dem Start. Ergebnis: verbesserte Texte und die Sprachauswahl.",
  ],
  [
    "Einbau auf Website und in der App",
    "Der Assistent kommt auf die Website und in die App, in beiden gleich. Der automatische Versand läuft über die IONOS-Annahme des Vereins. Sie ist gebaut und geprüft und wartet auf den IONOS-Zugang. Für das größere PDF des Assistenten muss sie noch angepasst werden. Der Versand von Ausweisen und Attesten ist zu klären ({a:datenschutz}).",
  ],
  [
    "Vereinsunterlagen aktualisieren",
    "Die alten Info-Blätter ersetzen wir später ({o:O48}). Die Satzungsadresse im Aufnahmeantrag wird neu mit der Website verknüpft ({o:O66}). Im Info-Blatt steht statt „ALG II“ das Grundsicherungsgeld.",
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
      `Regelwerk des Anmelde-Assistenten (Prototyp), Version ${REGELWERK_VERSION}, mit den Punkten O01 bis O{letzte}`,
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
    ${liste(
      eintraege.map((e) => e.replace("O{letzte}", `O${String(PUNKTE.size).padStart(2, "0")}`)),
      { klasse: "konzept-quellen" }
    )}`
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
/* Silbentrennung nur bei langen Wörtern (zum Beispiel „Nichtmitgliederversicherung“ auf dem Handy) */
.konzept-frage, .konzept-antwort, .konzept-warum { hyphens: auto; hyphenate-limit-chars: 12 4 4; }
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
/* Text zum Stand einer Zeile (aus den Daten); die Kennzeichen für Geregelt, Entfällt und Später nutzen nur Farbmarken der Website */
.konzept-antwort { margin: var(--sp-1) 0 0; }
.konzept .tag--geregelt { padding: 2px 7px; border: 1px solid var(--blau-700); background: var(--surface); color: var(--blau-900); }
.konzept .tag--entfaellt { padding: 2px 7px; border: 1px solid var(--line); background: transparent; color: var(--ink-3); }
.konzept .tag--spaeter { padding: 2px 7px; border: 1px dashed var(--blau-700); background: var(--surface); color: var(--blau-700); }
/* Zahlen je Stand im Kasten ganz oben */
.konzept .konzept-zahlen { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: var(--sp-2) var(--sp-5); max-width: none; }
.konzept .konzept-zahlen > li { display: inline-flex; align-items: center; gap: var(--sp-2); margin: 0; padding: 0; max-width: none; }
.konzept .konzept-zahlen strong { font-size: var(--fs-lg); line-height: 1; }
/* Aufklapper für geregelte, entfallene und später geprüfte Punkte */
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

// daten: alle Dateien aus data/*.json (tools/build.mjs). Gebraucht wird daten.anmeldung.offenePunkte.
export function seite(daten) {
  setzePunkte(daten?.anmeldung?.offenePunkte);
  if (daten.anmeldung.version !== REGELWERK_VERSION) {
    console.warn(
      `  Warnung: anmeldung-konzept nennt die Regelwerk-Version ${REGELWERK_VERSION}, data/anmeldung.json hat ${daten.anmeldung.version}`
    );
  }
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

  // Jeder Punkt der Datei hat genau eine Zeile auf der Seite (punktZeile prüft „doppelt“, hier „fehlt“).
  const ohneZeile = [...PUNKTE.keys()].filter((oid) => !GEZEICHNET.has(oid));
  if (ohneZeile.length) {
    throw new Error(`anmeldung-konzept: Diese Punkte aus data/anmeldung.json haben keine Zeile auf der Seite: ${ohneZeile.join(", ")}`);
  }

  return {
    url: "/anmeldung-konzept/",
    title: "Anmeldung neu gedacht",
    description:
      "Entwurf für den Vorstand: Ein Anmelde-Assistent statt Formular. Ablauf, PDF, Fälle, Entscheidungen und offene Punkte, Fragen zum HFV, Karneval und Einführungsplan.",
    // Interne Vorlage für den Vorstand: nicht in Suchmaschinen (noindex). Die
    // Sitemap-Aufnahme bleibt unverändert. Führendes "\n": begleit.html setzt
    // "{{kopfZusatz}}" ans Ende der Stylesheet-Zeile (gleiche Schreibweise wie
    // in src/begleit/anmeldung.mjs).
    kopfZusatz: '\n<meta name="robots" content="noindex">',
    inhalt,
  };
}
