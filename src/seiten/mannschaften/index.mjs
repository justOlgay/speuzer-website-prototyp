// Mannschaften-Übersicht (P3) – drei Gruppen (Kinderfußball, Jugend,
// Senioren) als Karten mit Link auf die jeweilige Teamseite, dazu
// Zusatzangebote, Ferienhinweis + Karneval (wie auf der Startseite) und ein
// Aufruf zum Probetraining.

import {
  jahrgangText,
  datumLang,
  naechsteSpiele,
  spielZeile,
  FUSSBALLDE_WIDGET_LADER,
  spieleKastenHtml,
  SPIELE_KASTEN_SKRIPT,
  staffelLesbar,
  eMailSchreibenLink,
  deutscheAnfuehrungszeichen,
  teamNameHtml,
} from "../../vorlagen/hilfen.mjs";
// P15: gemeinsame Bausteine (ursprünglich Startseite, dort gelöscht – siehe
// src/vorlagen/bausteine.mjs).
import { probetrainingAbschnitt } from "../../vorlagen/bausteine.mjs";
import { bild } from "../../vorlagen/bild.mjs";

// Diese Seite liegt immer unter "/mannschaften/" (Tiefe 1), daher immer "../"
// (siehe pfadZurWurzel() in tools/build.mjs).
const PFAD = "../";

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// Platzhalter für Seiten, die im aktuellen Paket noch nicht existieren –
// gleiches Muster wie header.mjs/footer.mjs/index.mjs (siehe navigation.mjs).
function baldSpan(titel, { knopf = false } = {}) {
  const klassen = ["nav__bald", knopf ? "knopf" : null].filter(Boolean).join(" ");
  return `<span class="${klassen}" aria-disabled="true" title="Seite folgt">${escapeHtml(titel)}</span>`;
}

// W9-A-Nachprüfung (mannschaften-390-05.png): für den Herren-Link im
// Probetraining-Baustein (siehe seite() unten) – identischer Aufbau wie
// trainerMailtoHref() in team.mjs (dort lokal, hier nicht importiert, um
// team.mjs keine neue Export-Abhängigkeit für eine einzelne Einsatzstelle
// aufzuzwingen).
function trainerMailtoHref(team) {
  return `mailto:${team.mail}?subject=${team.kurz}%3A%20Anfrage%20%C3%BCber%20die%20Website`;
}

// "Jahrgang {jahrgang}" – bei den Herren nur "Senioren" (kein "Jahrgang"-
// Präfix, kein Jahrgangswert; P3, Korrektur A1 abgeleitet aus kategorie über
// jahrgangText() in hilfen.mjs). W9, Abschnitt 1: geschütztes Leerzeichen
// zwischen "Jahrgang" und dem Jahr, damit die Zeile nicht dort umbricht –
// das Ergebnis ist bereits HTML-sicher (escapeHtml auf den Jahrgangswert),
// an der Einsatzstelle also ohne weiteres escapeHtml() einsetzen.
function jahrgangPraefix(team) {
  const j = jahrgangText(team);
  if (j === "Senioren") return j;
  // W9-A-Nachprüfung (web-390 Nr. 14): auch Leerzeichen INNERHALB des
  // Jahrgangswerts schützen (z. B. "2021 und jünger" bei der G-Jugend), sonst
  // bricht die Zeile mitten im Wert um ("Jahrgang 2021 und" / "jünger").
  return `Jahrgang&nbsp;${escapeHtml(j).replace(/ /g, "&nbsp;")}`;
}

// W10, Entscheidung C (w10-gemeinsam.md, bestätigt durch quervergleich Nr. 2):
// die Trainingstage stehen jetzt direkt in jeder Teamkarte (wie in der App),
// der frühere separate Abschnitt "Trainingszeiten" mit eigener Tabelle
// entfällt auf dieser Seite (siehe seite() unten) – jedes Team stand vorher
// zweimal auf der Seite (Gruppenliste + Tabelle), das war eine Dopplung.
// Wiederverwendet die vorhandene (bisher ungenutzte) .karte__training-Klasse
// aus P3. Tagesnamen ausgeschrieben (Entscheidung C), nowrap je Zeile über
// ".karte__training li" (komponenten.css).
function trainingszeilenKarteHtml(team) {
  return (team.training ?? [])
    .map((t) => `<li><strong>${escapeHtml(t.tag)}</strong> ${escapeHtml(t.von)}–${escapeHtml(t.bis)} Uhr</li>`)
    .join("\n      ");
}

// W10, Entscheidung A (w10-gemeinsam.md, bestätigt durch web-1440-mannschaften
// Nr. 4/web-390-mannschaften Nr. 7): Jahrgang und Liga/Staffel jetzt immer als
// zwei feste Zeilen OHNE Trennpunkt "·" (vorher stand der Punkt bei vielen
// Karten allein am Zeilenende). `ohneKategoriePraefix` (W9, Abschnitt 1): in
// der Senioren-Gruppe nennt schon die Gruppenüberschrift "Senioren" – die
// Karte zeigt dort keine zusätzliche Jahrgangszeile (nur die Staffel, ein
// Segment). W9, Abschnitt 2: zusätzliches <span class="team-karte__pfeil">
// für die kompakte Handy-Zeile (siehe .team-karte in komponenten.css) – der
// volle Text "Zur Mannschaft ›" bleibt für Desktop-Karten erhalten.
function teamKarte(team, { ohneKategoriePraefix = false } = {}) {
  const praefix = ohneKategoriePraefix ? "" : jahrgangPraefix(team);
  const staffel = `<span class="team-unterzeile-staffel">${staffelLesbar(team.staffel)}</span>`;
  const meta = praefix ? `<span class="team-unterzeile-jahrgang">${praefix}</span>${staffel}` : staffel;
  const training = trainingszeilenKarteHtml(team);
  return `<a class="karte karte--link team-karte" href="${PFAD}mannschaften/${team.slug}/">
      <span class="team-karte__haupt">
        <span class="karte__titel">${teamNameHtml(team.name)}</span>
        <span class="karte__meta">${meta}</span>
        ${training ? `<ul class="karte__training" role="list">
        ${training}
        </ul>` : ""}
      </span>
      <span class="karte__mehr">Zur Mannschaft ›</span>
      <span class="team-karte__pfeil" aria-hidden="true">›</span>
    </a>`;
}

// W9, Abschnitt 2: einheitliches Raster für alle drei Gruppen (auch
// "Senioren" mit nur einem Team) – .raster--mannschaften ist ab 640px ein
// 4-spaltiges Grid (wie .raster--4), darunter eine Liste kompakter,
// tippbarer Zeilen statt großer Karten (siehe komponenten.css).
function gruppenAbschnitt({ titel, satz, slugs, teamNachSlug, id, ohneKategoriePraefix }) {
  const karten = slugs
    .map((slug) => teamNachSlug[slug])
    .filter(Boolean)
    .map((team) => teamKarte(team, { ohneKategoriePraefix }))
    .join("\n    ");
  const idAttr = id ? ` id="${escapeHtml(id)}"` : "";
  return `<section class="abschnitt abschnitt--gruppe"${idAttr}>
  <div class="container fluss">
    <h2>${escapeHtml(titel)}</h2>
    <p class="meta">${escapeHtml(satz)}</p>
    <div class="raster raster--mannschaften">
    ${karten}
    </div>
  </div>
</section>`;
}

// W10, Entscheidung C (w10-gemeinsam.md, bestätigt durch quervergleich Nr. 2):
// ersetzt den früheren Abschnitt "Trainingszeiten" (Tabelle, jetzt
// entfernt – die Zeiten stehen direkt in den Teamkarten, siehe teamKarte()
// oben). Übrig bleibt nur der kurze Hinweis zum Trainingsort und der
// Ferienhinweis, wörtlich wie zuvor im Tabellen-Baustein (bausteine.mjs).
function trainingshinweisAbschnitt(daten) {
  const verein = daten.verein ?? {};
  // W10-Nachprüfung (neu_kaputt): der Satz hatte keine eigene max-width und
  // lief bei 1440px über die volle Containerbreite (1168px), während der
  // Ferien-Hinweiskasten direkt darunter schon auf 880px begrenzt war –
  // gleiche Breite wie der Kasten, damit beide fluchten und der Satz lesbar
  // bleibt.
  return `<section class="abschnitt">
  <div class="container fluss">
    <p class="meta" style="max-width:880px;">Alle Mannschaften trainieren auf dem Vereinsplatz an der Mainzer Landstraße 480 – nur die Herren auf der Bezirkssportanlage am&nbsp;Rebstock (SW&nbsp;Griesheim).</p>
    <div class="hinweis hinweis--info" style="max-width:880px;">
      <p style="margin:0;">${escapeHtml(verein.hinweise?.ferien ?? "")}</p>
    </div>
  </div>
</section>`;
}

// Erste zwei Sätze eines Rohtexts, ohne dafür die gemeinsam genutzte (an
// dieser Stelle nicht robuste) teiltSaetze()/absaetze()-Logik aus hilfen.mjs
// zu ändern – die dort verwendete Abkürzungs-Erkennung erwartet ein
// Leerzeichen/einen Punkt/den Textanfang direkt vor dem Einzelbuchstaben,
// nicht eine öffnende Klammer wie in "(u. a." (data/zusatzangebote.json,
// Regista-Beschreibung) und bricht den Satz dort fälschlich mitten im Wort
// ab. Lokal hier deshalb ein einfacherer, für diesen Anwendungsfall robuster
// Test: ein Punkt beendet einen Satz nur, wenn ihm ein Leerzeichen und ein
// Großbuchstabe folgen (Fortsetzungen wie "u. a." haben danach einen
// Kleinbuchstaben und werden so schon ausgeschlossen).
function ersteZweiSaetze(text) {
  const bereinigt = String(text ?? "").replace(/\s+/g, " ").trim();
  const saetze = [];
  let start = 0;
  const re = /\.(\s+)(?=[A-ZÀ-ÖØ-Þ])/g;
  let treffer;
  while (saetze.length < 2 && (treffer = re.exec(bereinigt))) {
    const ende = treffer.index + 1;
    saetze.push(bereinigt.slice(start, ende).trim());
    start = ende;
  }
  if (saetze.length < 2) {
    const rest = bereinigt.slice(start).trim();
    if (rest) saetze.push(rest);
  }
  return saetze.join(" ");
}

// W9, Abschnitt 3: beide Karten gleich aufgebaut (Name, zwei Sätze,
// "Leitung: …", gleicher Kontaktknopf). Zwei Sätze über ersteZweiSaetze()
// oben statt eines neu erfundenen Kürzungstexts. Kontakt einheitlich als
// "E-Mail schreiben ›"-Textlink (eMailSchreibenLink(), schmale Karte – siehe
// hilfen.mjs) auf a.mail bzw. die Geschäftsstelle, statt vorher zwei
// unterschiedlicher mailLink()-Formen (einmal Textlink, einmal nackte
// Adresse). Deutsche Anführungszeichen über deutscheAnfuehrungszeichen().
// "kostenpflichtig" steht nur im Badge.
function zusatzangeboteAbschnitt(daten) {
  const angebote = daten.zusatzangebote ?? [];
  // W9-A, quervergleich Nr. 26: "VM Elite" bricht sonst zwischen "VM" und
  // "Elite" um (geschütztes Leerzeichen) – auf dem rohen Text vor
  // escapeHtml() angewendet (echtes U+00A0-Zeichen, kein escapeHtml()-
  // Sonderzeichen, bleibt also unverändert erhalten).
  // W9-A-Nachprüfung (web-1440 Nr. 18): "TuS Makkabi" (Regista-Beschreibung)
  // bricht bei 1440px zwischen "TuS" und "Makkabi" um – ebenfalls geschützt.
  // W10-Korrektur (web-1440-mannschaften Nr. 8, bestätigt): "Vassilios
  // Miamis" (VM-Elite-Beschreibung) trennte den Namen zwischen Vor- und
  // Nachname – ebenfalls geschützt.
  const vmEliteSchuetzen = (text) =>
    String(text ?? "")
      .replace(/VM Elite/g, "VM\u00A0Elite")
      .replace(/TuS Makkabi/g, "TuS\u00A0Makkabi")
      .replace(/Vassilios Miamis/g, "Vassilios\u00A0Miamis");
  const karten = angebote
    .map((a) => {
      const kontakt = eMailSchreibenLink(a.mail ?? "geschaeftsstelle@sportfreunde04.de");
      // "C-Lizenz-Trainer" und "D1-Jugend" nicht an den Bindestrichen trennen
      // (geschützte Bindestriche) – W9-A-Nachprüfung (web-1440 Nr. 18): die
      // bisherige Regel schützte nur den ersten Bindestrich in "C-Lizenz",
      // nicht den zweiten in "…-Trainer" bzw. den in "D1-Jugend" (Card VM
      // Elite, 390px: "C-Lizenz-" / "Trainer" und "…D1-" / "Jugend").
      const zweiSaetze = vmEliteSchuetzen(
        deutscheAnfuehrungszeichen(ersteZweiSaetze(a.text ?? ""))
          .replace(/\b([A-Z])-Lizenz/g, "$1\u2011Lizenz")
          .replace(/Lizenz-Trainer/g, "Lizenz\u2011Trainer")
          .replace(/D1-Jugend/g, "D1\u2011Jugend")
      );
      // Logo klein neben Badge und Name (Olgay 23.09.2026: Logos gehören
      // dazu); "Leitung" nur, wenn ein Name freigegeben ist (Regista: bewusst
      // ohne Namen, Kontakt über die Geschäftsstelle).
      const logo = a.logo?.quelle
        ? `<span class="angebot__logo">${bild({ pfad: PFAD, daten, name: a.logo.quelle, alt: `Logo ${a.name}`, sizes: "80px" })}</span>`
        : "";
      return `<article class="karte fluss angebot">
      <div class="angebot__kopf">
        ${logo}
        <h3 class="karte__titel">${escapeHtml(vmEliteSchuetzen(a.name))}</h3>
      </div>
      <span class="tag">Externes Angebot · kostenpflichtig</span>
      <p>${escapeHtml(zweiSaetze)}</p>
      ${a.leitung ? `<p class="meta">Leitung: ${escapeHtml(a.leitung)}</p>` : ""}
      <p>${kontakt}</p>
    </article>`;
    })
    .join("\n    ");

  return `<section class="abschnitt--hell abschnitt">
  <div class="container fluss">
    <h2>Zusatzangebote</h2>
    <p class="inhalt">Zwei Fußballschulen nutzen unseren Platz. Sie sind kostenpflichtige Angebote externer Anbieter und stehen auch Spielerinnen und Spielern anderer Vereine offen.</p>
    <div class="raster raster--2">
    ${karten}
    </div>
  </div>
</section>`;
}

// ---------- Nächste Spiele des Vereins (W6, ganz unten: Zusatzinformation,
// keine Kerninfo) ----------
// Aus dem ehemaligen src/seiten/spielplan/index.mjs übernommen (dort
// "Nächste Spiele", jetzt hier "Nächste Spiele des Vereins" – Entscheidung
// Olgay 23.09.2026: Tabellen und Spielpläne nur noch je Mannschaftsseite,
// die vereinsweite Spielübersicht wandert ganz nach unten auf die Seite
// "Mannschaften"). appack-Modus zeigt das FUSSBALL.DE-Widget "club-matches"
// (alle Teams, live aus dem DFBnet, siehe data/widgets.json "verein.spiele"),
// der Prototyp weiterhin die eingefrorene, nach Tag gruppierte Liste.
function naechsteSpieleDesVereinsAbschnitt(daten) {
  const spiele = naechsteSpiele(daten, { anzahl: 12 });

  const gruppen = [];
  for (const s of spiele) {
    let gruppe = gruppen.find((g) => g.datum === s.datum);
    if (!gruppe) {
      gruppe = { datum: s.datum, spiele: [] };
      gruppen.push(gruppe);
    }
    gruppe.spiele.push(s);
  }

  const inhalt = gruppen
    .map((gruppe, gi) => {
      const zeilen = gruppe.spiele
        .map((s, i) => spielZeile(s, { pfad: PFAD, mitTeam: true, naechstes: gi === 0 && i === 0, ohneDatum: true }))
        .join("\n      ");
      return `<h3>${datumLang(gruppe.datum)}</h3>
    <ul class="spiele" role="list">
      ${zeilen}
    </ul>`;
    })
    .join("\n    ");

  const vereinSpieleWidgetId = daten.widgets?.verein?.spiele ?? "";
  const widgetHtml = `<div class="fussballde-wrap">
        <div class="fussballde_widget" data-id="${escapeHtml(vereinSpieleWidgetId)}" data-type="club-matches"></div>
      </div>`;

  // W7, Abschnitt 4: wie auf der Mannschaftsseite auf rund fünf Spiele
  // begrenzt (spieleKastenHtml(), kein inneres Scrollen mehr).
  // W9-A-Nachprüfung (Entscheidung 12: "überall"): der Quellsatz fehlte auf
  // dieser Übersichtsseite ganz, obwohl er unter demselben Baustein auf allen
  // Teamseiten steht.
  // W10, quervergleich Nr. 17 (bestätigt): der Quellsatz steht jetzt wie auf
  // den Teamseiten ÜBER dem Kasten (spieleKastenHtml()-Parameter, hilfen.mjs)
  // statt als eigener Absatz danach.
  // W10-Nachprüfung (neu_kaputt): der Einleitungssatz stand als eigener,
  // gemeinsamer Absatz VOR dem appack-Block – im appack-Modus kam dadurch
  // "Live von FUSSBALL.DE." (aus spieleKastenHtml()) als zweiter, eigener
  // grauer Absatz knapp darunter hinzu ("wirkt wie eine verirrte Zeile").
  // Der Einleitungssatz ist jetzt je Modus eigenständig: im appack-Modus an
  // "Live von FUSSBALL.DE." angehängt (ein einziger Satz über dem Kasten,
  // wie spieleKastenHtml() es auf den Teamseiten schon macht), im
  // Prototyp-Modus unverändert vor der eingefrorenen Liste.
  const einleitungssatz =
    "Alle Spiele unserer Mannschaften der nächsten Tage. Spielplan und Tabelle je Team findest du auf der jeweiligen Mannschaftsseite.";
  return `<section class="abschnitt">
  <div class="container fluss">
    <h2>Nächste Spiele des Vereins</h2>
    <div data-nur-appack hidden>
      ${spieleKastenHtml(widgetHtml, `${einleitungssatz} Live&nbsp;von&nbsp;FUSSBALL.DE.`)}
    </div>
    <div data-nur-prototyp>
      <p class="meta">${einleitungssatz}</p>
      ${inhalt || `<p class="meta">Keine kommenden Spiele ab dem Build-Datum in data/spiele.json gefunden.</p>`}
      <p class="meta">Auf der Vereinswebsite kommen die Spiele live aus dem DFBnet.</p>
    </div>
  </div>
</section>`;
}

export function seite(daten) {
  const teamNachSlug = Object.fromEntries((daten.teams ?? []).map((t) => [t.slug, t]));

  const seitenkopf = `<section class="abschnitt seitenkopf">
  <div class="container">
    <h1>Mannschaften</h1>
    <!-- W9, Abschnitt 2: "Ansprechpartner" entfernt – die stehen nur auf den
         einzelnen Teamseiten, nicht auf dieser Übersicht (nichts versprechen,
         was die Seite nicht bietet). -->
    <p class="seitenkopf__lead">Elf Fußballmannschaften von den Herren bis zur G-Jugend. Für jedes Team findest du hier Jahrgang, Trainingszeiten und den Weg zum Spielplan.</p>
  </div>
</section>`;

  // P10, Korrektur A2 (Olgay, 14.09.2026): Reihenfolge überall, wo alle
  // Mannschaften dargestellt werden, beginnt bei den ältesten (Herren) und
  // geht absteigend zu den jüngsten (G-Jugend) – Gruppenreihenfolge Senioren
  // → Jugend → Kinderfußball, innerhalb der Gruppen wie in data/teams.json
  // (a-jugend, d1, d2, d3, e1, e2, e3; f1, f2, g-jugend). Vorher stand hier
  // Kinderfußball → Jugend → Senioren mit jeweils nach Alter aufsteigender
  // slugs-Reihenfolge (jüngste zuerst) – exakt umgekehrt.
  const gruppen = [
    {
      titel: "Senioren",
      // W9-A, Entscheidung 3 (w9-gemeinsam.md): einheitliche Rebstock-Formel
      // (siehe auch hauptspalte()/heimspieleKarte() in team.mjs) statt der
      // bisherigen eigenen Formulierung (Prüfbefund web-1440-mannschaften
      // Nr. 16 nennt diese Zeile als eine der abweichenden Varianten). Satz
      // wird unten über escapeHtml() ausgegeben – deshalb hier ein echtes
      // U+00A0-Zeichen statt der Entity-Schreibweise "&nbsp;" (die würde zu
      // "&amp;nbsp;" verunstaltet).
      // W9-A-Nachprüfung (web-390 Nr. 32): "Kreisliga A" am Satzanfang
      // entfällt – die Liga steht schon direkt darüber in der Teamzeile
      // "Kreisliga A, Gruppe 1", ein zweites Mal im Gruppensatz wäre doppelt.
      satz: "Heimspiele auf der Bezirkssportanlage am Rebstock (SW Griesheim).",
      slugs: ["herren"],
      // W3, Abschnitt 4: Sprungziel der Fußball-Abteilungskarte im Kopfbereich.
      id: "mannschaften-liste",
      // W9, Abschnitt 1: die Gruppenüberschrift "SENIOREN" nennt die
      // Kategorie schon – die Karte selbst zeigt keinen zusätzlichen
      // "Senioren"-Präfix mehr (sonst doppelt), nur die lesbare Staffel.
      ohneKategoriePraefix: true,
    },
    {
      titel: "Jugend",
      // W9-A, w9-a.md: "Kreis Frankfurt" stimmte für die A-Jugend nicht (sie
      // spielt Gruppenliga, siehe Prüfbefund web-1440-mannschaften Nr. 27);
      // Quelle einheitlich "FUSSBALL.DE" benannt (Entscheidung 12).
      // W10-Korrektur (web-1440-mannschaften Nr. 11/web-390-mannschaften
      // Nr. 17, bestätigt): "Kreis- und Gruppenliga" passte nicht zu den
      // Karten darunter – fünf der sieben Jugendteams (D2, D3, E1–E3) spielen
      // in der 1. Kreisklasse, nur D1 in der Kreisliga A und die A-Jugend in
      // der Gruppenliga.
      satz: "Ligabetrieb von der Kreisklasse bis zur Gruppenliga, Spielplan und Tabellen live von FUSSBALL.DE.",
      slugs: ["a-jugend", "d1", "d2", "d3", "e1", "e2", "e3"],
    },
    {
      titel: "Kinderfußball",
      satz: "Kinderfestivals statt Ligabetrieb, keine Tabellen.",
      slugs: ["f1", "f2", "g-jugend"],
    },
  ].map((g) => gruppenAbschnitt({ ...g, teamNachSlug }));

  // Olgay 23.09.2026: Karten „Fußball“/„Karneval“ gehören nicht auf die
  // Fußballseite. Karneval hat einen eigenen Menüpunkt, die Abteilungen
  // stehen im Verein-Verteiler (wie in der App). Reihenfolge:
  // Mannschaftsübersicht → Trainingsort-/Ferienhinweis → Probetraining →
  // Zusatzangebote.
  const inhalt = [
    seitenkopf,
    ...gruppen,
    // W10, Entscheidung C (w10-gemeinsam.md, bestätigt durch quervergleich
    // Nr. 2): der frühere separate Abschnitt "Trainingszeiten" mit eigener
    // Tabelle (trainingszeitenAbschnitt() aus bausteine.mjs) entfällt auf
    // dieser Seite – die Trainingstage stehen jetzt direkt in jeder
    // Teamkarte (siehe teamKarte() oben). Nur der kurze Trainingsort-Satz und
    // der Ferienhinweis bleiben, direkt unter den Gruppen.
    trainingshinweisAbschnitt(daten),
    // P15: ersetzt den vorherigen eigenen Aufruf ("Lust mitzuspielen?") durch
    // denselben Probetraining-Baustein wie auf den anderen Seiten (siehe
    // src/vorlagen/bausteine.mjs).
    // W9-A-Nachprüfung: eigener Mailto-Link für die Herren (team.mail aus
    // data/teams.json), der Standard-Knopf des Bausteins erreicht sonst immer
    // nur die Jugendleitung.
    probetrainingAbschnitt(PFAD, teamNachSlug.herren ? trainerMailtoHref(teamNachSlug.herren) : ""),
    zusatzangeboteAbschnitt(daten),
    // W6, ganz unten (Zusatzinformation, keine Kerninfo): vereinsweite
    // "Nächste Spiele" (ehemals eigener Abschnitt auf /spielplan/, siehe
    // naechsteSpieleDesVereinsAbschnitt() oben).
    naechsteSpieleDesVereinsAbschnitt(daten),
    FUSSBALLDE_WIDGET_LADER,
    SPIELE_KASTEN_SKRIPT,
  ].join("\n");

  return {
    url: "/mannschaften/",
    title: "Mannschaften",
    // W3b, Prüfer-Befund "klein": "Spielpläne" -> "Spielplan & Tabellen"
    // (einheitlicher Begriff) machte den Satz mit 175 Zeichen zu lang (Gate
    // in tools/pruefen.mjs: max. 170) – kleinstmögliche Korrektur nach dem
    // Muster von P2/verein/karneval.mjs: "von den Herren bis zur G-Jugend"
    // zu "von Herren bis G-Jugend" gekürzt (167 Zeichen), Wortlaut sonst
    // unverändert.
    description:
      "Alle elf Fußballmannschaften des FFV Sportfreunde 04 in Frankfurt-Gallus: Jahrgänge, Trainingszeiten, Ansprechpartner und Spielplan & Tabellen von Herren bis G-Jugend.",
    inhalt,
  };
}
