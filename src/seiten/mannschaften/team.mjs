// Teamseiten /mannschaften/<slug>/ (P3) – eine Seite je Mannschaft aus
// data/teams.json: Training, nächste Spiele, Ansprechpartner, Heimspiele,
// Kalender-Abos, Verweis auf weitere Mannschaften derselben Gruppe.

import {
  mailLink,
  jahrgangText,
  naechsteSpiele,
  spielZeile,
  trainingsZeilen,
  ruecklink,
  FUSSBALLDE_WIDGET_LADER,
  spieleKastenHtml,
  SPIELE_KASTEN_SKRIPT,
  reiterHtml,
  trainerZeileHtml,
  trainerRolleText,
  trainerFotosSkript,
  staffelLesbar,
  platzAufgeteilt,
  teamNameHtml,
} from "../../vorlagen/hilfen.mjs";
// W9, Abschnitt 7: bild() wird hier direkt importiert (nicht über hilfen.mjs,
// das bewusst ohne Abhängigkeit zu bild.mjs bleibt, siehe Kopf dieser Datei)
// für den Vorstandsfoto-Rückfall der Trainerkarte.
import { bild } from "../../vorlagen/bild.mjs";

// W6 (Entscheidung Olgay 23.09.2026): "Spielplan der Saison" und "Tabelle"
// gehören nur noch auf die Mannschaftsseite, keine eigene Seite/Sammelseite
// mehr dafür (/spielplan/<slug>/ und /tabellen/ wurden zu Weiterleitungen,
// siehe src/seiten/spielplan/team.mjs, src/seiten/tabellen.mjs und
// src/vorlagen/weiterleitung.mjs). Die Abschnittslogik unten ist 1:1 aus dem
// ehemaligen src/seiten/spielplan/team.mjs hierher verschoben (keine doppelte
// Logik mehr an zwei Stellen) – nur die vormalige "Zur Tabelle"/"Mannschaft"-
// Karte der Seitenspalte entfällt, weil sie auf genau diese (jetzt schon
// geöffnete) Seite zurückverlinkt hätte.

// Diese Seiten liegen immer unter "/mannschaften/<slug>/" (Tiefe 2), daher
// immer "../../" (siehe pfadZurWurzel() in tools/build.mjs).
const PFAD = "../../";

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// Platzhalter für Seiten, die im aktuellen Paket noch nicht existieren –
// gleiches Muster wie header.mjs/footer.mjs/index.mjs (siehe navigation.mjs),
// hier zusätzlich mit optionaler Sekundär-Variante (Knopf "Tabelle").
function baldSpan(titel, { knopf = false, sekundaer = false } = {}) {
  const klassen = ["nav__bald", knopf ? "knopf" : null, sekundaer ? "knopf--sekundaer" : null]
    .filter(Boolean)
    .join(" ");
  return `<span class="${klassen}" aria-disabled="true" title="Seite folgt">${escapeHtml(titel)}</span>`;
}

const TAG_KUERZEL = {
  Montag: "Mo",
  Dienstag: "Di",
  Mittwoch: "Mi",
  Donnerstag: "Do",
  Freitag: "Fr",
  Samstag: "Sa",
  Sonntag: "So",
};

// "Jahrgang {jahrgang}" – bei den Herren nur "Senioren" (P3, Korrektur A1
// abgeleitet aus kategorie über jahrgangText() in hilfen.mjs). W9,
// Abschnitt 1: geschütztes Leerzeichen zwischen "Jahrgang" und dem Jahr
// (Ergebnis bereits HTML-sicher, siehe staffelLesbar() in hilfen.mjs).
function jahrgangPraefix(team) {
  const j = jahrgangText(team);
  if (j === "Senioren") return j;
  // W9-A-Nachprüfung (web-390 Nr. 14): auch Leerzeichen INNERHALB des
  // Jahrgangswerts schützen (z. B. "2021 und jünger" bei der G-Jugend), sonst
  // bricht die Zeile mitten im Wert um ("Jahrgang 2021 und" / "jünger").
  return `Jahrgang&nbsp;${escapeHtml(j).replace(/ /g, "&nbsp;")}`;
}

// W9-A-Nachprüfung (Entscheidung 15/quervergleich Nr. 14): Google-Maps-
// RICHTUNGSlink ("Route planen") statt des bisherigen Suchlinks – wie auf der
// Website-Seite Kontakt (routePlanenUrl() in kontakt.mjs) und in der App.
function routePlanenUrl(adresse) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(adresse)}`;
}

// Herren und A-Jugend spielen ihre Heimspiele am Römerhof (Anlage SW
// Griesheim), alle anderen auf dem Vereinsplatz Mainzer Landstraße 480.
function routeUrl(team, verein) {
  if ((team.heimspiele ?? "").includes("Römerhof")) {
    return routePlanenUrl("Am Römerhof 9, 60486 Frankfurt am Main");
  }
  const s = verein.sportstaette ?? {};
  return routePlanenUrl(`${s.strasse ?? ""}, ${s.plz ?? ""} ${s.ort ?? ""}`.trim());
}

// W9-A, Entscheidung 4 (w9-gemeinsam.md): Adresse dreizeilig (Platzname /
// Straße Nr. / PLZ Ort), PLZ und Ort sowie "SW Griesheim" mit geschütztem
// Leerzeichen, damit nichts an ungünstiger Stelle umbricht (Prüfbefunde
// web-390-mannschaften Nr. 17, quervergleich Nr. 28). data/teams.json hat
// "heimspiele" seit der Datenaktualisierung einheitlich als "Platzname,
// Straße Nr., PLZ Ort" (Entscheidung 3) – genau drei durch ", " getrennte
// Teile. Nur lokal in team.mjs (kein Mannschafts-Helfer aus hilfen.mjs), die
// Karte "Heimspiele"/"Unser Platz" ist die einzige Stelle in diesem Auftrag,
// die eine vollständige Adresse zeigt.
function adresseDreizeiligHtml(adresse) {
  const teile = String(adresse ?? "").split(", ").map((t) => t.trim());
  if (teile.length !== 3) {
    return `<p>${escapeHtml(adresse ?? "")}</p>`;
  }
  const [platz, strasse, plzOrt] = teile;
  const platzHtml = escapeHtml(platz).replace(/SW Griesheim/, "SW&nbsp;Griesheim");
  const plzOrtHtml = escapeHtml(plzOrt)
    .replace(/^(\d{5})\s/, "$1&nbsp;")
    .replace(/\sam\s(Main)\b/, "&nbsp;am&nbsp;$1");
  return `<p class="adresse-dreizeilig">
        <span>${platzHtml}</span>
        <span>${escapeHtml(strasse)}</span>
        <span>${plzOrtHtml}</span>
      </p>`;
}

function trainerMailtoHref(team) {
  return `mailto:${team.mail}?subject=${team.kurz}%3A%20Anfrage%20%C3%BCber%20die%20Website`;
}

function trainingVollListe(team) {
  return (team.training ?? [])
    .map((t) => `${TAG_KUERZEL[t.tag] ?? t.tag} ${t.von}–${t.bis}`)
    .join(", ");
}

// Meta-description: voller Trainingsteil, sonst (wenn > 170 Zeichen) auf
// "Training n-mal pro Woche" gekürzt (P3). Herren: "Senioren" statt Jahrgang.
// W9-Hinweis: bewusst NICHT jahrgangPraefix() (die enthält seit W9,
// Abschnitt 1, ein geschütztes Leerzeichen als HTML-Entity "&nbsp;" und ist
// schon escapeHtml()-sicher) – die Meta-description ist reiner Text, den
// tools/build.mjs selbst noch escapeHtml()t (sonst stünde dort sichtbar
// "&amp;nbsp;" statt eines Leerzeichens).
function beschreibung(team) {
  const j = jahrgangText(team);
  const jahrgangTeil = j === "Senioren" ? j : `Jahrgang ${j}`;
  // W9-A-Nachprüfung (mannschaften-f1-1440-01.png): Kinderfußball (F1, F2,
  // G-Jugend) hat laut Seite ausdrücklich weder Ligaspielplan noch Tabelle
  // (siehe kinderfestivalAbschnitt() unten) – die Meta-description endete
  // trotzdem auf "Spielplan und Tabelle.", das widerspricht der Seite selbst.
  // "Kinderfestivals." statt des längeren "Kinderfestival-Termine." (bei der
  // G-Jugend – Jahrgang "2021 und jünger", nur ein Trainingstermin – reißt
  // sonst das 170-Zeichen-Gate in tools/pruefen.mjs, siehe Abschlussbericht).
  const schluss = team.tabelle ? "Spielplan und Tabelle." : "Kinderfestivals.";
  const bauen = (trainingTeil) =>
    `${team.name} des FFV Sportfreunde 04 (Frankfurt-Gallus): ${jahrgangTeil}, Training ${trainingTeil}, Ansprechpartner per Vereinsmail, ${schluss}`;
  let text = bauen(trainingVollListe(team));
  if (text.length > 170) {
    const n = (team.training ?? []).length;
    text = bauen(`${n}-mal pro Woche`);
  }
  return text;
}

// ---------- Spielplan der Saison (Generator-iframe, W2/W6, aus dem
// ehemaligen src/seiten/spielplan/team.mjs übernommen) ----------

// Team -> Gruppe des Spielplan-Generators (https://justolgay.github.io/
// speuzer-spielplan/app-<gruppe>.html). Der Generator bietet keine
// Team-Vorauswahl per URL (kein #<Team>/?team=<Team> im Quelltext, "aktiv"
// ist dort fest auf den ersten Tab der Gruppe gesetzt) – deshalb wird immer
// die ganze Gruppen-Seite eingebettet, siehe spielplanDerSaisonInhalt() unten.
const GRUPPE_JE_TEAM = {
  herren: "herren",
  "a-jugend": "a-jugend",
  d1: "d-jugend",
  d2: "d-jugend",
  d3: "d-jugend",
  e1: "e-jugend",
  e2: "e-jugend",
  e3: "e-jugend",
  f1: "f-jugend",
  f2: "f-jugend",
  "g-jugend": "g-jugend",
};

const GENERATOR_BASIS = "https://justolgay.github.io/speuzer-spielplan/";

// Im appack-Modus (Live-Website) zeigt "Spielplan der Saison" bei Teams mit
// FUSSBALL.DE-Widget (alle außer F1, F2, G-Jugend – Kinderfußball, dort gibt
// es kein Widget) das Widget "team-matches" (vergangene Spiele mit Ergebnis,
// kommende Spiele, live) statt des Generator-iframes; im Prototyp-Modus
// bleibt für alle Teams der Generator-iframe (Widgets laden auf GitHub Pages
// nicht).
// W9, Abschnitt 6: der frühere Hinweissatz "Die Übersicht öffnet auf …; die
// Reiter zeigen …" beschrieb, WIE der Generator zu bedienen ist (klang wie
// ein technischer Hinweis, der in den Nutzertext gerutscht ist) – entfernt
// (globale Regel: keine Bedienungsanleitungen für fremde Widgets). Ebenso
// entfernt: der eigene Quellenhinweis "Quelle: DFBnet, täglich
// aktualisiert. Tippen auf ein Spiel öffnet FUSSBALL.DE." – der eingebettete
// Generator zeigt seine Quelle selbst an, ein zweiter Hinweis darunter wäre
// doppelt. Übrig bleibt nur der kurze, einmalige Hinweis auf das
// hervorgehobene nächste Spiel.
function generatorIframe(team, daten) {
  const gruppe = GRUPPE_JE_TEAM[team.slug];
  // Team-Vorauswahl des Generators: #<Reiter> öffnet den Reiter des Teams.
  const reiter = daten.widgets?.[team.slug]?.reiter ?? "";
  // W9-A, Entscheidung 8 (w9-gemeinsam.md): "?einzeln" zeigt nur dieses Team
  // (ohne Umschalter/Kopfzeile/eigenen Kinderfestival-Hinweis des Generators)
  // – behebt auch den F1/F2-Umschalter, der bisher jeweils den Plan des
  // anderen Teams öffnete (Prüfbefund web-1440-mannschaften Nr. 14).
  const generatorUrl = `${GENERATOR_BASIS}app-${gruppe}.html?einzeln${reiter ? "#" + encodeURIComponent(reiter) : ""}`;
  // W9-A, Entscheidung 8: eigene Legende je nach Team – "Termin" im
  // Kinderfußball (Kinderfestival statt Spiel), sonst "Spiel".
  const legende = team.tabelle
    ? "Das nächste Spiel ist hervorgehoben."
    : "Der nächste Termin ist hervorgehoben. Kurzfristige Absagen kommen vom Trainerteam.";

  return `<iframe src="${escapeHtml(generatorUrl)}" title="${escapeHtml(`Spielplan ${team.name} (Generator, DFBnet)`)}" loading="lazy" data-generator-iframe style="width:100%;border:0;border-radius:var(--r-lg);display:block;"></iframe>
    <p class="meta">${legende}</p>
    <script>
    (function () {
      var iframe = document.querySelector('[data-generator-iframe]');
      if (!iframe) return;
      window.addEventListener('message', function (event) {
        if (event.origin !== 'https://justolgay.github.io') return;
        if (event.source !== iframe.contentWindow) return;
        var h = event.data && event.data.speuzerHeight;
        if (typeof h !== 'number' || h < 200 || h > 20000) return;
        iframe.style.height = h + 'px';
      });
    })();
    </script>`;
}

// h2 + Inhalt (kein eigener .fluss-Wrapper): reiht sich als weiterer
// Abschnitt in denselben .fluss der Hauptspalte ein wie "Training" und
// "Nächste Spiele" (siehe hauptspalte() unten, CSS-Regeln ".fluss > * + h2"
// / ".fluss > h2 + *" in komponenten.css sind genau für mehrere
// h2-Abschnitte in einem gemeinsamen .fluss gedacht).
//
// W7 (Entscheidung Olgay 23.09.2026, Abschnitt 4): der frühere eigene
// "Nächstes Spiel"-Abschnitt (next-match-Widget) entfällt – der Kasten hier
// (team-matches) beginnt ohnehin mit den nächsten Spielen. Deshalb heißt der
// Abschnitt jetzt "Spiele" statt "Spielplan der Saison" und ist auf rund
// fünf Spiele begrenzt (spieleKastenHtml(), kein inneres Scrollen). Für
// Teams ohne Widget (Kinderfußball F1, F2, G-Jugend) bleibt der
// Generator-Spielplan unter der alten Überschrift unverändert.
function spielplanDerSaisonInhalt(team, daten) {
  const spieleWidgetId = daten.widgets?.[team.slug]?.spiele ?? "";
  const iframeHtml = generatorIframe(team, daten);

  if (!spieleWidgetId) {
    // Kinderfußball (F1, F2, G-Jugend): kein FUSSBALL.DE-Widget, Generator in
    // beiden Modi – bleibt wie bisher (W7-Spezifikation Abschnitt 4).
    return `<h2>Spielplan der Saison</h2>
    ${iframeHtml}`;
  }

  const widgetHtml = `<div class="fussballde-wrap">
        <div class="fussballde_widget" data-id="${escapeHtml(spieleWidgetId)}" data-type="team-matches"></div>
      </div>`;

  // W9, Abschnitt 5: ein einziger, wörtlicher Satz (keine Bedienungsanleitung
  // mehr davor/danach, siehe spieleUndTabelleInhalt() unten für denselben
  // Wortlaut). W10, quervergleich Nr. 17 (bestätigt): der Satz steht jetzt
  // ÜBER dem Kasten (spieleKastenHtml()-Parameter, hilfen.mjs), wie in der
  // App, statt als eigener Absatz danach. W10, web-1440-mannschaften Nr. 15
  // (bestätigt): "im Kasten" gestrichen (unglücklicher Umbruch "im | Kasten"
  // bei schmaler Spalte) – der Kasten ist ohnehin gemeint, wenn direkt
  // darunter der Knopf "Alle Spiele anzeigen" folgt.
  return `<h2>Spiele</h2>
    <div data-nur-appack hidden>
      ${spieleKastenHtml(widgetHtml, "Nächste Spiele zuerst, frühere Ergebnisse über die Pfeile. Live&nbsp;von&nbsp;FUSSBALL.DE.")}
    </div>
    <div data-nur-prototyp>
      ${iframeHtml}
    </div>`;
}

// ---------- Tabelle (W2/W6, aus dem ehemaligen src/seiten/spielplan/team.mjs
// übernommen; die dortige "Zur Tabelle"/"Mannschaft"-Karte entfällt, weil sie
// auf genau diese Seite zurückverlinkt hätte) ----------

// W9-A, Entscheidung 8 (w9-gemeinsam.md): geschützte Leerzeichen, fertige
// HTML-Fragmente (kein escapeHtml() mehr nötig, reine Ziffern/Wörter).
const KINDERFESTIVAL_SPIELFORM = {
  f1: "4&nbsp;gegen&nbsp;4&nbsp;plus&nbsp;Torwart",
  f2: "4&nbsp;gegen&nbsp;4",
  "g-jugend": "3&nbsp;gegen&nbsp;3",
};

// W9, Abschnitt 6: die Kinderfestival-Erklärung (F1/F2/G-Jugend) steht jetzt
// EINMAL, VOR dem Spielplan (siehe kinderfestivalAbschnitt() und
// spieleUndTabelleInhalt() unten) – hierher (nach der Tabelle) gehört sie
// nicht mehr, tabelleInhalt() behandelt deshalb nur noch Teams mit echter
// Tabelle (team.tabelle === true).
// W10, web-1440-mannschaften Nr. 13 (bestätigt): der Wisch-Hinweis passt nur
// auf schmalen/Touch-Bildschirmen (auf dem Desktop sind bei 1440px alle
// Tabellenspalten ohnehin ohne Wischen zu sehen). Das "Wischen"-Segment steckt
// jetzt in einem eigenen <span>, das ab 1024px (derselbe Umbruch wie
// .zweispaltig, ab dort ist genug Breite für die volle Tabelle) per CSS
// ausgeblendet wird (siehe .tabelle-wisch-hinweis in komponenten.css) – auf
// dem Desktop bleibt nur "Live von FUSSBALL.DE." stehen.
function tabelleWischHinweisHtml() {
  return `<span class="tabelle-wisch-hinweis">Die Tabelle lässt sich seitlich wischen. </span>Live&nbsp;von&nbsp;FUSSBALL.DE.`;
}

function tabelleInhalt(team, daten) {
  const tabelleEintrag = daten.tabellen?.teams?.[team.slug];
  const eigene = tabelleEintrag?.zeilen?.find((z) => z.eigene);
  const tabelleWidgetId = daten.widgets?.[team.slug]?.tabelle ?? "";

  // W7, Abschnitt 4: die Tabelle bleibt vollständig (eigene Platzierung darf
  // nie abgeschnitten sein) und ohne zusätzliche Karte/Schatten um das
  // Widget herum.
  // W9-A, Entscheidung 12 (w9-gemeinsam.md): ein ganzer, wörtlicher Satz
  // "Die Tabelle lässt sich seitlich wischen. Live&nbsp;von&nbsp;FUSSBALL.DE." statt
  // der bisherigen zwei Zeilen (Prüfbefund web-390-mannschaften Nr. 33).
  // W10-Nachprüfung (neu_kaputt, dieselbe Korrektur wie in
  // spieleUndTabelleInhalt()/tabelleHtml oben): Quellensatz über dem Kasten,
  // für Teams, die diesen eigenständigen Tabellen-Abschnitt statt des
  // Umschalters zeigen (kein Spiele- ODER kein Tabellen-Widget).
  return `<h2>Tabelle</h2>
    <div data-nur-appack hidden>
      <p class="meta">${tabelleWischHinweisHtml()}</p>
      <div class="fussballde-wrap">
        <div class="fussballde_widget" data-id="${escapeHtml(tabelleWidgetId)}" data-type="table"></div>
      </div>
    </div>
    <div data-nur-prototyp>
      ${eigene ? `<p class="meta">Platz ${eigene.platz} von ${tabelleEintrag.zeilen.length} · ${eigene.punkte} Punkte</p>` : ""}
      <p class="meta">Auf der Vereinswebsite kommen Spielplan und Tabellen live aus dem DFBnet.</p>
    </div>`;
}

// W9-A, Entscheidung 8 (w9-gemeinsam.md): EINE Kinderfestival-Erklärung im
// verbindlichen Wortlaut statt der bisherigen zwei Sätze – das Thema stand
// sonst bis zu dreimal auf derselben Seite (Kopf, dieser Abschnitt,
// Kleingedrucktes unter dem Plan; Prüfbefunde web-1440-mannschaften Nr. 15,
// web-390-mannschaften Nr. 21).
function kinderfestivalAbschnitt(team) {
  const spielform = KINDERFESTIVAL_SPIELFORM[team.slug] ?? "";
  return `<h2>Kinderfestivals</h2>
    <p>Im Kinderfußball gibt es keine Ligaspiele und keine Tabellen, sondern Kinderfestivals – bei uns oder bei einem anderen Verein. Gespielt wird ${spielform}. Der Kreis setzt die Termine in Blöcken an, deshalb reicht der Plan nur wenige Wochen voraus.</p>`;
}

// ---------- Spiele & Tabelle mit Umschalter (W7b, Olgay 23.09.2026) ----------
// Beide FUSSBALL.DE-Kästen untereinander waren „zu groß und zu präsent“.
// Teams mit Spiele- UND Tabellen-Widget bekommen einen Abschnitt mit
// Umschalter; sichtbar ist immer nur ein Kasten, „Spiele“ zuerst und auf
// rund drei Spiele begrenzt. Kinderfußball (kein Widget) bleibt wie bisher,
// mit der Kinderfestival-Erklärung einmal vor dem Spielplan (W9, Abschnitt 6).
function spieleUndTabelleInhalt(team, daten) {
  const spieleWidgetId = daten.widgets?.[team.slug]?.spiele ?? "";
  const tabelleWidgetId = daten.widgets?.[team.slug]?.tabelle ?? "";
  if (!team.tabelle) {
    // W9-A-Nachprüfung (web-1440 Nr. 15): "Spielplan der Saison" widersprach
    // dem Satz direkt darüber ("… reicht der Plan nur wenige Wochen voraus")
    // und der Überschrift "BISHER ANGESETZT" im eingebetteten Generator –
    // beide sagen, dass hier kein voller Saisonplan steht, sondern die bisher
    // angesetzten Termine.
    // W10, quervergleich Nr. 16 (bestätigt): in der App ist "Bisher
    // angesetzt" nur eine kleine Unterbeschriftung innerhalb der
    // Kinderfestival-Karte, auf der Website stand hier zusätzlich ein
    // eigenes <h3>"Bisher angesetzt"> – das verdoppelte sich mit der
    // gleichlautenden, kleinen Kopfzeile, die der eingebettete Generator
    // selbst schon zeigt (W10-Nachprüfung, offen Nr. 1: bestätigt, "wirkt
    // eher wie ein Echo"). Entfernt: die kleine Kopfzeile des Generators ist
    // jetzt die einzige Unterbeschriftung innerhalb des Kinderfestival-
    // Blocks, wie in der App.
    return `${kinderfestivalAbschnitt(team)}
    ${generatorIframe(team, daten)}`;
  }
  if (!spieleWidgetId || !tabelleWidgetId) {
    return `${spielplanDerSaisonInhalt(team, daten)}
    ${tabelleInhalt(team, daten)}`;
  }
  const tabelleEintrag = daten.tabellen?.teams?.[team.slug];
  const eigene = tabelleEintrag?.zeilen?.find((z) => z.eigene);
  const spieleHtml = spieleKastenHtml(
    `<div class="fussballde-wrap">
        <div class="fussballde_widget" data-id="${escapeHtml(spieleWidgetId)}" data-type="team-matches"></div>
      </div>`,
    "Nächste Spiele zuerst, frühere Ergebnisse über die Pfeile. Live&nbsp;von&nbsp;FUSSBALL.DE."
  );
  // W10-Nachprüfung (neu_kaputt): im Reiter "Tabelle" stand der Quellensatz
  // bisher UNTER dem Kasten, im Reiter "Spiele" (spieleKastenHtml()) schon
  // DARÜBER – beim Umschalten sprang die Zeile dadurch von oben nach unten.
  // Jetzt auch hier über dem Kasten, wie im Reiter "Spiele".
  const tabelleHtml = `<p class="meta">${tabelleWischHinweisHtml()}</p>
        <div class="fussballde-wrap">
          <div class="fussballde_widget" data-id="${escapeHtml(tabelleWidgetId)}" data-type="table"></div>
        </div>`;
  return `<h2>Spiele &amp; Tabelle</h2>
    <div data-nur-appack hidden>
      ${reiterHtml(team.slug, [
        { id: "spiele", titel: "Spiele", inhalt: spieleHtml },
        { id: "tabelle", titel: "Tabelle", inhalt: tabelleHtml },
      ])}
    </div>
    <div data-nur-prototyp>
      ${generatorIframe(team, daten)}
      ${eigene ? `<p class="meta">Tabelle: Platz ${eigene.platz} von ${tabelleEintrag.zeilen.length} · ${eigene.punkte} Punkte</p>` : ""}
    </div>`;
}

// ---------- Seitenkopf ----------

// W9-A, Entscheidung 2 (w9-gemeinsam.md): Unterzeile Teamseite. Herren nur
// die Staffel (kein "Senioren" davor, die Dachzeile "Mannschaft · Senioren"
// direkt darüber nennt die Kategorie schon, siehe Prüfbefunde
// web-1440-mannschaften Nr. 34/web-390-mannschaften Nr. 32). Alle anderen:
// Jahrgang · Staffel wie bisher (staffelLesbar() lässt bei Kinderfußball-
// Staffeln seit W9-A das Wort "Kinderfußball" selbst schon weg, siehe
// hilfen.mjs).
// W10, Entscheidung A (w10-gemeinsam.md, bestätigt durch quervergleich Nr. 14/
// web-390-mannschaften Nr. 6): Jahrgang und Liga/Staffel jetzt immer als zwei
// feste Zeilen OHNE Trennpunkt "·" (vorher stand der Punkt bei vielen Teams
// allein am Zeilenende). Herren bleiben einzeilig (nur die Staffel, kein
// Jahrgang). Beide Segmente sind eigene Blockelemente (siehe
// .team-unterzeile-jahrgang/.team-unterzeile-staffel in komponenten.css).
function unterzeileTeam(team) {
  // W9-A-Nachprüfung (tools/pruefen.mjs, 320px, mannschaften-f1): das Staffel-
  // Segment in ein eigenes Sicherheitsnetz-Span verpackt (siehe
  // .team-unterzeile-staffel in komponenten.css) – die Segmente sind jetzt
  // vollständig umbruchfrei (web-390 Nr. 14), das reißt bei sehr langen
  // Kombinationen wie F1 ("4 gegen 4 plus Torwart, Gruppe 2") sonst die
  // 320px-Mindestbreite.
  const staffel = `<span class="team-unterzeile-staffel">${staffelLesbar(team.staffel)}</span>`;
  if (team.kategorie === "Senioren") return staffel;
  return `<span class="team-unterzeile-jahrgang">${jahrgangPraefix(team)}</span>${staffel}`;
}

// W10, Entscheidung B (w10-gemeinsam.md, bestätigt durch web-1440-mannschaften
// Nr. 3): ein Teamsatz der Form "Das ist unsere <Team>, Jahrgang <Jahr>."
// sagt nicht mehr als Name und Jahrgang (die schon in Dachzeile/H1/Unterzeile
// stehen) – aktuell betrifft das F1 und F2. Regel im Code (nicht in den
// Daten, data/teams.json bleibt unverändert), der Verein ergänzt die Sätze
// später.
const GENERISCHER_TEAMSATZ = /^Das ist unsere [^,]+, Jahrgang [\d/]+( und jünger)?\.$/;

function seitenkopfAbschnitt(team) {
  // W9-A, Entscheidung 8 (w9-gemeinsam.md): "Spielbetrieb: …" entfällt im
  // Kinderfußball (F1/F2/G-Jugend) – dort gibt es keinen Ligabetrieb, die
  // Spielform steht schon in der Unterzeile, siehe Prüfbefund
  // web-390-mannschaften Nr. 21. Sonst fester Abstand von 12px zum Teamsatz
  // (.seitenkopf .teamtext + .meta in komponenten.css), unabhängig vom
  // aktiven Reiter weiter unten (siehe Prüfbefund web-390-mannschaften
  // Nr. 26). "ab Oktober" geschützt (w9-a.md), damit "Oktober" nicht allein
  // in der zweiten Zeile steht (Prüfbefund web-390-mannschaften Nr. 26).
  const spielbetriebText = String(team.spielbetrieb ?? "").replace(/ab Oktober/, "ab Oktober");
  const spielbetriebZeile = team.tabelle
    ? `<p class="meta">Spielbetrieb: ${escapeHtml(spielbetriebText)}.</p>`
    : "";
  const teamsatz = team.beschreibung && !GENERISCHER_TEAMSATZ.test(team.beschreibung) ? team.beschreibung : "";
  return `<section class="abschnitt seitenkopf">
  <div class="container">
    ${ruecklink(`${PFAD}mannschaften/`, "Mannschaften")}
    <p class="meta">Mannschaft · ${escapeHtml(team.gruppe ?? "")}</p>
    <h1>${escapeHtml(team.name)}</h1>
    <p class="seitenkopf__lead">${unterzeileTeam(team)}</p>
    ${teamsatz ? `<p class="inhalt teamtext">${escapeHtml(teamsatz)}</p>` : ""}
    ${spielbetriebZeile}
  </div>
</section>`;
}

// ---------- Hauptspalte: Training + Nächste Spiele ----------

function hauptspalte(team, daten) {
  const verein = daten.verein ?? {};

  // W9-A, Entscheidung 9 (w9-gemeinsam.md): überall dieselbe graue Zeile
  // "Trainingsort: …" – keine zusätzlichen blauen Hinweiskästen mehr für
  // Herren/A-Jugend (Prüfbefunde web-1440-mannschaften Nr. 10, Nr. 16;
  // web-390-mannschaften Nr. 29). Der Heimspielort steht nur noch in der
  // Karte "Heimspiele" (siehe heimspieleKarte() unten) – die A-Jugend
  // trainiert wie alle Jugendteams auf dem Vereinsplatz und braucht deshalb
  // keinen Sonderfall mehr, nur die Herren trainieren extern am Rebstock
  // (team.platz hat dort keinen Komma-getrennten Platzteil, eigene externe
  // Anlage ohne Halb-/Tor-Aufteilung, siehe platzAufgeteilt()).
  let ortHinweis;
  let trainingsPlatzteil;
  if (team.slug === "herren") {
    // W10-Nachprüfung (offen Nr. 3, web-390-mannschaften Nr. 12): "am
    // Rebstock" stand hier mit einem normalen Leerzeichen und brach deshalb
    // mitten im Namen um, obwohl der gleiche Satz im Trainingsort-Hinweis
    // der Übersicht (trainingshinweisAbschnitt(), index.mjs) schon
    // "am&nbsp;Rebstock" verwendet. Zusätzliche Klasse "trainingsort"
    // (siehe .trainingsort in komponenten.css) schaltet text-wrap:pretty
    // lokal ab – die Zeile brach sonst trotz freien Platzes vorzeitig um.
    ortHinweis = `<p class="meta trainingsort">Trainingsort: Bezirkssportanlage am&nbsp;Rebstock (SW&nbsp;Griesheim).</p>`;
    trainingsPlatzteil = "Rebstock";
  } else {
    const { ort, teil } = platzAufgeteilt(team);
    ortHinweis = ort ? `<p class="meta">Trainingsort: ${escapeHtml(ort)}.</p>` : "";
    trainingsPlatzteil = teil;
  }

  const spiele = naechsteSpiele(daten, { team: team.slug, anzahl: 3 });
  const spieleHtml = spiele.length
    ? `<ul class="spiele" role="list">
    ${spiele.map((s, i) => spielZeile(s, { pfad: PFAD, mitTeam: false, naechstes: i === 0 })).join("\n    ")}
  </ul>`
    : `<div class="hinweis hinweis--info">
      <p style="margin:0;">Zurzeit sind keine Spiele angesetzt.</p>
    </div>`;

  // W7 (Entscheidung Olgay 23.09.2026, Abschnitt 4): der frühere eigene
  // Appack-Abschnitt "Nächstes Spiel" (next-match-Widget) entfällt – der
  // "Spiele"-Kasten weiter unten (team-matches) beginnt ohnehin mit den
  // nächsten Spielen, der Abschnitt war doppelt und machte die Seite
  // widgetlastig. Die eingefrorene Liste bleibt wie bisher nur im Prototyp
  // (dort gibt es keine Widgets); auf der Live-Website übernimmt allein der
  // "Spiele"-Kasten (siehe spielplanDerSaisonInhalt()).
  const naechsteSpieleAbschnitt = `<div data-nur-prototyp>
      <h2>Nächste Spiele</h2>
      ${spieleHtml}
    </div>`;

  return `<div class="fluss">
    <h2>Training</h2>
    ${ortHinweis}
    <ul class="trainings" role="list">
    ${trainingsZeilen(team, trainingsPlatzteil)}
    </ul>
    <div class="hinweis hinweis--info">
      <p style="margin:0;">${escapeHtml(verein.hinweise?.ferien ?? "")}</p>
    </div>
    ${naechsteSpieleAbschnitt}
    ${spieleUndTabelleInhalt(team, daten)}
  </div>`;
}

// W9, Abschnitt 7: Rückfall-Platzhalter fürs Trainerfoto – Vorstandsfoto
// derselben Person (voller Namensabgleich gegen data/vorstand.json), sofern
// eines hinterlegt ist. Über den vorhandenen bild()-Baustein (kleine
// Variante, 48px wie .person-mini__bild), mit data-trainer-foto="index" wie
// der Initialen-Platzhalter, damit trainerFotosSkript() ein echtes
// Worksheet-Foto zur Laufzeit weiterhin bevorzugt einsetzen kann (Reihenfolge
// Worksheet-Bild → Vorstandsfoto → Initialen). Ohne Treffer: null (dann
// bleibt es bei den Initialen, siehe trainerZeileHtml() in hilfen.mjs).
function trainerVorstandsBildHtml(name, index, daten, pfad) {
  const eintrag = (daten.vorstand ?? []).find((p) => p.name === name && p.foto);
  if (!eintrag) return null;
  const html = bild({
    pfad,
    daten,
    name: eintrag.foto.quelle,
    alt: "",
    sizes: "48px",
    klasse: "person-mini__bild",
  });
  return html.replace("<picture", `<picture data-trainer-foto="${index}" aria-hidden="true"`);
}

// ---------- Seitenspalte: Ansprechpartner, Heimspiele, Kalender ----------

function seitenspalte(team, daten) {
  const verein = daten.verein ?? {};
  // W7, Abschnitt 3: Trainer als Zeilen mit Porträt (Initialen statisch
  // gebaut, echte Fotos lädt trainerFotosSkript() zur Laufzeit nach – siehe
  // hilfen.mjs). Die frühere feste Überschrift "Trainerteam" über der Liste
  // entfällt, weil jede Zeile jetzt ihre eigene (statisch ermittelte) Rolle
  // zeigt.
  // W7b: Rolle einmal als Kartentitel („Trainer“ bzw. „Trainerteam“) statt
  // unter jedem Namen; die Mailadresse steht einmal im Hinweissatz, der Knopf
  // öffnet sie (vorher doppelt als Link und Knopf).
  // W9, Abschnitt 7: Kartentitel jetzt immer "Trainerteam" (trainerRolleText()
  // in hilfen.mjs), auch bei einer Person.
  const kartenTitel = trainerRolleText((team.trainer ?? []).length);
  const trainerZeilen = (team.trainer ?? [])
    .map((name, i) => trainerZeileHtml(name, i, "", trainerVorstandsBildHtml(name, i, daten, PFAD)))
    .join("\n        ");

  // W10, Entscheidung E (w10-gemeinsam.md, bestätigt durch quervergleich
  // Nr. 13): jede Abschnittsüberschrift jetzt als echtes h2 ÜBER der Karte
  // (vorher ".karte__titel" INNERHALB der Karte) – Website und App sollen
  // hier gleich aussehen, und die Überschrift bekommt dieselbe Typografie
  // wie "Training"/"Spiele" auf derselben Seite (globale h2-Regel,
  // base.css) statt der Karten-eigenen Versal-Schrift.
  // W9-A, Entscheidung 10 (w9-gemeinsam.md): "Die Nachricht geht an:" und die
  // Adresse in einer eigenen Zeile (weißer statt hinter einem Doppelpunkt
  // im Fließtext versteckt), nowrap + größerer text-underline-offset gegen
  // das Umbrechen/die schwer erkennbaren Unterstriche vor dem "@"
  // (Prüfbefunde web-1440-mannschaften Nr. 11, web-390-mannschaften Nr. 16).
  const ansprechpartnerAbschnitt = `<h2>${escapeHtml(kartenTitel)}</h2>
    <div class="karte fluss">
      <div class="person-mini-liste">
        ${trainerZeilen}
      </div>
      <p class="knopfzeile knopfzeile--voll">
        <a class="knopf" href="${escapeHtml(trainerMailtoHref(team))}">E-Mail an das Trainerteam</a>
      </p>
      <p class="meta">Die Nachricht geht an:<br><span class="trainerteam-adresse">${mailLink(team.mail)}</span></p>
    </div>`;

  // W9-A, Entscheidung 8: die Karte heißt im Kinderfußball (kein Ligabetrieb,
  // kein "Heimspiel") "Unser Platz" statt "Heimspiele" (Prüfbefund
  // web-1440-mannschaften Nr. 29).
  // W9-A, Entscheidung 4: Adresse dreizeilig (Platzname / Straße Nr. / PLZ
  // Ort), siehe adresseDreizeiligHtml() unten (Prüfbefunde
  // web-390-mannschaften Nr. 17, quervergleich Nr. 28).
  const heimspieleTitel = team.tabelle ? "Heimspiele" : "Unser Platz";
  const heimspieleAbschnitt = `<h2>${heimspieleTitel}</h2>
    <div class="karte fluss">
      ${adresseDreizeiligHtml(team.heimspiele)}
      <p class="knopfzeile knopfzeile--voll">
        <a class="knopf knopf--sekundaer" href="${escapeHtml(routeUrl(team, verein))}" rel="noopener" target="_blank">Route planen</a>
      </p>
    </div>`;

  // W10, Entscheidung E: "Kalender abonnieren" jetzt zwei Listenzeilen mit
  // "›" OHNE Karte (vorher Karte mit zwei Textlinks) – wie in der App und
  // wie die übrigen Listenbausteine der Seite (Training, Weitere
  // Mannschaften). Wiederverwendet die vorhandene, seitenweite
  // .zeile/.zeilen-liste-Komponente (W3, /verein/) statt einer neuen.
  // W9-A, Entscheidung 7 (w9-gemeinsam.md): Linktexte ohne Team-Kürzel (die
  // Seite nennt das Team schon im Titel). Hinweissatz wörtlich, geschütztes
  // Leerzeichen vor dem letzten Wort.
  const kalenderBasis = verein.kalender_basis ?? "";
  const kalenderAbschnitt = `<h2>Kalender abonnieren</h2>
    <div class="zeilen-liste">
      <a class="zeile" href="${escapeHtml(kalenderBasis + (team.kalender ?? ""))}">
        <span class="zeile__text"><span class="zeile__titel">Spielplan abonnieren</span></span>
        <span class="zeile__pfeil" aria-hidden="true">›</span>
      </a>
      <a class="zeile" href="${escapeHtml(kalenderBasis + (team.trainingsKalender ?? ""))}">
        <span class="zeile__text"><span class="zeile__titel">Trainingszeiten abonnieren</span></span>
        <span class="zeile__pfeil" aria-hidden="true">›</span>
      </a>
    </div>
    <p class="meta">Einmal abonnieren – Verlegungen kommen automatisch&nbsp;an.</p>`;

  return `<aside class="fluss">
    ${ansprechpartnerAbschnitt}
    ${heimspieleAbschnitt}
    ${kalenderAbschnitt}
  </aside>`;
}

// ---------- Weitere Mannschaften derselben Gruppe (W7: bleibt als natürliche
// Navigation unten auf der Seite; der frühere zusätzliche "‹ Zurück zu
// Mannschaften"-Link direkt darunter entfällt – der Rücklink oben im
// Seitenkopf reicht, siehe ruecklink() und W7-Spezifikation Abschnitt 1)
// ----------

// P4, Korrektur A2 / W9, Abschnitt 10: feste Reihenfolge nach Alter wie auf
// der Übersicht (Herren, A, D1, D2, D3, E1, E2, E3, F1, F2, G – exakt die
// Reihenfolge in data/teams.json, geprüft). Nachbarn zuerst: sortiert nach
// Abstand des Index zum aktuellen Team (aufsteigend, stabil – bei gleichem
// Abstand bleibt die Array-Reihenfolge erhalten, das bringt "vorheriges vor
// nächstes" bei Gleichstand), dann die ersten vier. W9-Korrektur: die frühere
// Beschränkung auf dieselbe Gruppe (t.gruppe === team.gruppe) entfiel – sie
// ließ diesen Abschnitt auf der Herrenseite komplett leer (die Herren sind
// die einzigen in ihrer Gruppe "Senioren", "andere" war dort immer leer).
// Jetzt zeigt jede Teamseite ihre vier Alters-Nachbarn unabhängig von der
// Gruppe, auch die Herren (dort: A-Jugend, D1, D2, D3 – kein "vorheriges"
// Team, da die Herren die ältesten sind).
function weitereMannschaftenAbschnitt(team, daten) {
  const alleTeams = daten.teams ?? [];
  const aktuellerIndex = alleTeams.findIndex((t) => t.slug === team.slug);
  // W9-A, Entscheidung 6 (w9-gemeinsam.md): Auswahl bleibt wie bisher (vier
  // Alters-Nachbarn, nach Abstand sortiert), aber angezeigt in der
  // Reihenfolge der Übersicht (zweiter, stabiler Sortierschritt nach dem
  // ursprünglichen Index) – vorher sprang die Reihenfolge abwechselnd
  // −1/+1/−2/+2 (Prüfbefunde web-1440-mannschaften Nr. 8, web-390-
  // mannschaften Nr. 13, quervergleich Nr. 23).
  const andere = alleTeams
    .map((t, index) => ({ t, index, abstand: Math.abs(index - aktuellerIndex) }))
    .filter(({ t }) => t.slug !== team.slug)
    .sort((a, b) => a.abstand - b.abstand)
    .slice(0, 4)
    .sort((a, b) => a.index - b.index)
    .map(({ t }) => t);

  // W9-A, Entscheidung 6: auf dem Handy dieselben kompakten Listenzeilen wie
  // auf der Mannschaften-Übersicht (Name, Jahrgang, "›", ganze Zeile
  // tippbar) statt eigener, unruhiger 137px-Karten (Prüfbefund
  // web-390-mannschaften Nr. 12) – über dieselben Klassen wie teamKarte() in
  // index.mjs (.team-karte/.raster--mannschaften). W10, Entscheidung E
  // (w10-gemeinsam.md, bestätigt durch quervergleich Nr. 13): "Weitere
  // Mannschaften" bleibt auf ALLEN Breiten eine Listenzeile (Name fett,
  // Jahrgang klein, "›") statt der großen Versal-Karte, die die
  // Mannschafts-Übersicht für ihre Hauptkarten verwendet – der Zusatz
  // "team-karte--zeile" schaltet ab 640px auf dieselbe schlanke Zeilenoptik
  // wie unter 640px um (siehe komponenten.css); das Desktop-Raster
  // (.raster--mannschaften) ordnet diese Zeilen weiterhin in bis zu vier
  // Spalten an.
  // W10-Nachprüfung (offen Nr. 7): Entscheidung 2/A gilt ausdrücklich auch
  // hier – Teams ohne Jahrgang (die Herren, kategorie "Senioren") zeigen
  // keine Kategorie-Bezeichnung ("Senioren"), sondern die Staffel ("Kreisliga
  // A, Gruppe 1"), wie schon auf der eigenen Übersichtskarte derselben
  // Mannschaft. jahrgangPraefix(t) gäbe hier sonst wörtlich "Senioren" aus
  // (siehe jahrgangPraefix() oben).
  const weitereMetaHtml = (t) => (t.kategorie === "Senioren" ? staffelLesbar(t.staffel) : jahrgangPraefix(t));
  const karten = andere
    .map(
      (t) => `<a class="karte karte--link team-karte team-karte--zeile" href="${PFAD}mannschaften/${t.slug}/">
      <span class="team-karte__haupt">
        <span class="karte__titel">${teamNameHtml(t.name)}</span>
        <span class="karte__meta">${weitereMetaHtml(t)}</span>
      </span>
      <span class="karte__mehr">Zur Mannschaft ›</span>
      <span class="team-karte__pfeil" aria-hidden="true">›</span>
    </a>`
    )
    .join("\n    ");

  const weitereBlock = andere.length
    ? `<h2>Weitere Mannschaften</h2>
    <div class="raster raster--mannschaften">
    ${karten}
    </div>`
    : "";

  return `<section class="abschnitt">
  <div class="container fluss">
    ${weitereBlock}
  </div>
</section>`;
}

function seiteFuerTeam(team, daten) {
  const inhalt = [
    seitenkopfAbschnitt(team),
    `<section class="abschnitt">
  <div class="container">
    <div class="zweispaltig">
      ${hauptspalte(team, daten)}
      ${seitenspalte(team, daten)}
    </div>
  </div>
</section>`,
    weitereMannschaftenAbschnitt(team, daten),
    // W6: jetzt auch die Tabelle (team.tabelle) auf dieser Seite – Lader wie
    // im ehemaligen src/seiten/spielplan/team.mjs bei Spiel- ODER
    // Tabellen-Widget einbinden.
    team.tabelle || daten.widgets?.[team.slug]?.spiele ? FUSSBALLDE_WIDGET_LADER : "",
    // W7: der Spiele-Kasten-Knopf braucht sein Skript nur bei Teams mit
    // Spiele-Widget (spieleKastenHtml() wird nur dort verwendet).
    daten.widgets?.[team.slug]?.spiele ? SPIELE_KASTEN_SKRIPT : "",
    // W7, Abschnitt 3: lädt bei Bedarf echte Trainerporträts nach (Initialen
    // sind schon statisch gebaut, siehe seitenspalte()).
    trainerFotosSkript(team),
  ].join("\n");

  return {
    url: `/mannschaften/${team.slug}/`,
    title: team.name,
    description: beschreibung(team),
    inhalt,
  };
}

export function seiten(daten) {
  return (daten.teams ?? []).map((team) => seiteFuerTeam(team, daten));
}
