// Vorher/Nachher /vorher-nachher/ (P10) – neun Bildpaare Live-Seite/Prototyp
// mit je einem Satz zum gelösten Problem, dazu eine Messtabelle aus der
// Qualitätsprüfung vom 04.09.2026 gegen die automatische Prüfung des
// Prototyps (npm run pruefen).

import { bild } from "../vorlagen/bild.mjs";
import { datumLang } from "../vorlagen/hilfen.mjs";

// Diese Seite liegt immer unter "/vorher-nachher/" (Tiefe 1), daher immer
// "../" (siehe pfadZurWurzel() in tools/build.mjs).
const PFAD = "../";

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// ---------- Seitenanzahl für die Messbar-Tabelle ("Adressen") ----------
//
// Analog zu tools/build.mjs (sammleSeiten()): jedes Seitenmodul unter
// src/seiten liefert genau eine Seite, außer den drei datengetriebenen
// Modulen mit variabler Seitenzahl. EINZELSEITEN_MODULE zählt die Module mit
// genau einer Seite (Stand P10, diese Seite eingeschlossen): app, datenschutz,
// impressum, index, kontakt, mitglied-werden, shop, spielplan/index,
// styleguide, tabellen, mannschaften/index, verein/downloads, verein/index,
// verein/karneval, verein/mach-mit, verein/sponsoren, verein/vorstand,
// news/index, vorher-nachher (diese Seite selbst) = 19. Dazu je eine Seite
// pro Team (daten.teams) in mannschaften/team.mjs UND spielplan/team.mjs
// (also × 2) sowie eine Seite je Meldung (daten.news) in news/artikel.mjs.
// Ergibt zum Build-Zeitpunkt dieses Pakets 19 + 11×2 + 6 = 47, siehe
// Abschlussbericht (Gegenprobe: docs/sitemap.xml nach dem Build).
const EINZELSEITEN_MODULE = 19;

function seitenAnzahl(daten) {
  const teams = daten.teams?.length ?? 0;
  const news = daten.news?.length ?? 0;
  return EINZELSEITEN_MODULE + teams * 2 + news;
}

// ---------- Seitenkopf ----------

function seitenkopfAbschnitt(daten) {
  return `<section class="abschnitt seitenkopf">
  <div class="container">
    <h1>Vorher / Nachher</h1>
    <p class="seitenkopf__lead">Links die Website, wie sie heute ist. Rechts der Prototyp. Zu jedem Paar ein Satz, welches Problem gelöst wird.</p>
    <p class="meta">Vorher-Bilder: sportfreunde04.de am 11.09.2026, Fotos mit Kindern unkenntlich gemacht. Nachher-Bilder: Prototyp, Stand ${datumLang(daten.stand)}.</p>
  </div>
</section>`;
}

// ---------- Ein Vergleichspaar ----------

function vergleichPaar(daten, { titel, handy, vorher, nachher, satz }) {
  const sizes = handy ? "390px" : "(min-width: 768px) 50vw, 100vw";
  const vorherHtml = bild({ pfad: PFAD, daten, name: vorher.name, alt: vorher.alt, sizes });
  const nachherHtml = bild({ pfad: PFAD, daten, name: nachher.name, alt: nachher.alt, sizes });

  return `<figure class="vergleich${handy ? " vergleich--handy" : ""}">
  <h2>${escapeHtml(titel)}</h2>
  <div class="vergleich__raster">
    <div class="vergleich__seite">
      <span class="tag tag--warn">Vorher</span>
      ${vorherHtml}
    </div>
    <div class="vergleich__seite">
      <span class="tag tag--ok">Nachher</span>
      ${nachherHtml}
    </div>
  </div>
  <figcaption>${satz}</figcaption>
</figure>`;
}

const PAARE = [
  {
    titel: "Startseite am Rechner",
    handy: false,
    vorher: {
      name: "vorher-start-desktop",
      alt: "Live-Startseite am Rechner: Foto über die gesamte Breite, Menüleiste mit zwölf Punkten",
    },
    nachher: {
      name: "nachher-start-desktop",
      alt: "Prototyp-Startseite am Rechner: Wappen, Claim und Vereinsdaten oben, darunter die nächsten Spiele",
    },
    satz: "Vorher füllt ein Foto den Bildschirm und beantwortet keine Frage; nachher stehen Wappen, Claim, Probetraining und die nächsten Spiele auf dem ersten Bildschirm.",
  },
  {
    titel: "Startseite am Handy",
    handy: true,
    vorher: {
      name: "vorher-start-handy",
      alt: "Live-Startseite am Handy: ganzseitiges Foto ohne Text, nur Burger-Menü und Wappen oben",
    },
    nachher: {
      name: "nachher-start-handy",
      alt: "Prototyp-Startseite am Handy: Wappen, Vereinsname und Knöpfe für Probetraining und Mitgliedschaft auf dem ersten Bildschirm",
    },
    satz: "Vorher ist der erste Bildschirm ein Bild ohne Text; nachher sieht man sofort, wer der Verein ist und was man tun kann.",
  },
  {
    titel: "Menü am Handy",
    handy: true,
    vorher: {
      name: "vorher-menue-handy",
      alt: "Aufgeklapptes Live-Menü am Handy: 13 gleich gestaltete Punkte übereinander, im Hintergrund scheint das Seitenfoto durch",
    },
    nachher: {
      name: "nachher-menue-handy",
      alt: "Aufgeklapptes Prototyp-Menü am Handy: sechs Punkte vollflächig auf Blau, oben ein Schließen-Kreuz",
    },
    satz: "Vorher 13 gleichrangige Punkte mit Doppelungen, der Hintergrund blitzt durch; nachher sechs Punkte, vollflächig, mit Schließen-Kreuz und Tastaturbedienung.",
  },
  {
    titel: "Inhaltsrahmen am Rechner",
    handy: false,
    vorher: {
      name: "vorher-vorstand-rahmen-desktop",
      alt: "Live-Unterseite am Rechner: schmaler Inhaltsrahmen in der Seitenmitte mit eigenem Scrollbalken, daneben leere Fläche",
    },
    nachher: {
      name: "nachher-vorstand-desktop",
      alt: "Prototyp-Unterseite am Rechner: Inhalt über die volle Seitenbreite, ein Scrollbalken",
    },
    satz: "Vorher läuft der Inhalt durch ein 592 Pixel breites Guckloch mit zwei Scrollbalken; nachher nutzt er die Seitenbreite mit einem Scrollbalken.",
  },
  {
    titel: "Mannschaftsseite am Handy",
    handy: true,
    vorher: {
      name: "vorher-mannschaften-handy",
      alt: "Live-Mannschaftsliste am Handy: Kacheln mit Trainerfoto und kurzem Text, ohne Trainingszeiten",
    },
    nachher: {
      name: "nachher-mannschaft-d3-handy",
      alt: "Prototyp-Mannschaftsseite D3 am Handy: Trainingszeiten, nächste Spiele und Vereinsmail auf einer eigenen Seite",
    },
    satz: "Vorher fehlen Wochentag, Uhrzeit und Platz, Kontakt läuft über 26 × 17 Pixel kleine Symbole; nachher stehen Training, nächste Spiele und die Vereinsmail auf einer eigenen Seite je Mannschaft.",
  },
  {
    titel: "Sponsoren am Handy",
    handy: true,
    vorher: {
      name: "vorher-sponsoren-handy",
      alt: "Live-Sponsorenseite am Handy: oberste Kategorie zeigt ein Platzhalterbild, „App-Projektpartner“ erscheint zweimal",
    },
    nachher: {
      name: "nachher-sponsoren-handy",
      alt: "Prototyp-Sponsorenseite am Handy: zwei Kategorien mit echten Logos und ein Satz zum Sponsor werden",
    },
    satz: "Vorher zeigt die oberste Kategorie einen Platzhalter und eine Kategorie gibt es doppelt; nachher zwei Kategorien und ein Satz, wie man Sponsor wird.",
  },
  {
    titel: "Mitglied werden am Handy",
    handy: true,
    vorher: {
      name: "vorher-mitglied-werden-handy",
      alt: "Live-Formular am Handy: Antragsformular beginnt direkt mit den persönlichen Angaben, keine Beitragsangaben sichtbar",
    },
    nachher: {
      name: "nachher-mitglied-werden-handy",
      alt: "Prototyp-Seite Mitglied werden am Handy: Beitragstabelle für Fußball und Karneval vor dem Formular",
    },
    satz: "Vorher beginnt die Seite mit dem Formular und nennt keine Beiträge; nachher stehen Beiträge, Ablauf und Unterlagen vor dem Antrag.",
  },
  {
    titel: "Service & Anträge am Handy",
    handy: true,
    vorher: {
      name: "vorher-service-handy",
      alt: "Live-Serviceseite am Handy: drei unterschiedlich gestaltete Kacheln, eine mit KI-Wasserzeichen und dem Tippfehler „Mitgliedsbescheinigugen“",
    },
    nachher: {
      name: "nachher-downloads-handy",
      alt: "Prototyp-Downloadseite am Handy: einheitliche Liste mit Dateiformat, Größe und Seitenzahl je Dokument",
    },
    satz: "Vorher drei unterschiedlich gestaltete Kacheln, ein KI-Bild mit Wasserzeichen und ein Tippfehler; nachher eine Downloadliste mit Dateigröße und Seitenzahl.",
  },
  {
    titel: "Sportangebote am Rechner",
    handy: false,
    vorher: {
      name: "vorher-sportangebote-desktop",
      alt: "Live-Sportangebote am Rechner: zwei Kacheln (Fußball, Karneval), darunter eine große leere Fläche",
    },
    nachher: {
      name: "nachher-mannschaften-desktop",
      alt: "Prototyp-Mannschaftsübersicht am Rechner: elf Mannschaften in drei Gruppen mit Trainingszeiten",
    },
    satz: "Vorher zwei Kacheln und darunter rund 450 Pixel Leere; nachher elf Mannschaften in drei Gruppen mit Trainingszeiten.",
  },
];

function vergleicheAbschnitt(daten) {
  const figuren = PAARE.map((paar) => vergleichPaar(daten, paar)).join("\n  ");
  return `<section class="abschnitt">
  <div class="container fluss">
    ${figuren}
  </div>
</section>`;
}

// ---------- Messbar ----------

const MESSBAR_ZEILEN = [
  { merkmal: "Menüpunkte", vorher: "12", nachher: "6" },
  { merkmal: "Adressen", vorher: "1 für alle Seiten", nachherFn: (n) => `${n} eigene Adressen` },
  { merkmal: "Inhaltsrahmen", vorher: "fest 592 × 834 px", nachher: "volle Breite, 320–1920 px" },
  { merkmal: "Scrollbalken", vorher: "2", nachher: "1" },
  { merkmal: "Tippziele", vorher: "26 × 17 px", nachher: "mindestens 44 × 44 px" },
  { merkmal: "Überschriftenstruktur", vorher: "keine h1", nachher: "genau eine h1 je Seite" },
  { merkmal: "Sprachangabe", vorher: "fehlt", nachher: "lang=de" },
  { merkmal: "Alternativtexte", vorher: "alle leer", nachher: "alle Bilder beschrieben" },
  { merkmal: "Startbild", vorher: "296 KB, WhatsApp-Export", nachher: "kein Bild über 200 KB, sprechende Namen" },
  { merkmal: "Private Telefonlinks", vorher: "19", nachher: "0" },
  { merkmal: "Trainingszeiten auf Mannschaftsseiten", vorher: "keine", nachher: "alle elf Mannschaften" },
];

function messbarAbschnitt(daten) {
  const anzahl = seitenAnzahl(daten);
  const zeilen = MESSBAR_ZEILEN.map(
    (z) => `<tr>
          <td>${escapeHtml(z.merkmal)}</td>
          <td>${escapeHtml(z.vorher)}</td>
          <td>${escapeHtml(z.nachherFn ? z.nachherFn(anzahl) : z.nachher)}</td>
        </tr>`
  ).join("\n        ");

  return `<section class="abschnitt--hell abschnitt">
  <div class="container fluss">
    <h2>Messbar</h2>
    <div class="tabelle-wrap">
      <table>
        <thead>
          <tr>
            <th>Merkmal</th>
            <th>Vorher (Prüfung 04.09.2026)</th>
            <th>Nachher (Prototyp)</th>
          </tr>
        </thead>
        <tbody>
        ${zeilen}
        </tbody>
      </table>
    </div>
    <p class="meta">Vorher-Werte aus der Qualitätsprüfung vom 04.09.2026, Nachher-Werte aus der automatischen Prüfung des Prototyps (npm run pruefen).</p>
  </div>
</section>`;
}

// ---------- Was der Prototyp nicht zeigen kann ----------

function grenzenAbschnitt() {
  return `<section class="abschnitt">
  <div class="container inhalt fluss">
    <h2>Was der Prototyp nicht zeigen kann</h2>
    <div class="hinweis hinweis--info">
      <p style="margin:0;">Zwei Punkte lassen sich nur mit dem Anbieter appack/vmapit lösen: eigene Adressen unter sportfreunde04.de und ein Inhaltsrahmen, der mit dem Inhalt wächst. Beides steht im Übernahmepaket.</p>
    </div>
  </div>
</section>`;
}

export function seite(daten) {
  const inhalt = [
    seitenkopfAbschnitt(daten),
    vergleicheAbschnitt(daten),
    messbarAbschnitt(daten),
    grenzenAbschnitt(),
  ].join("\n");

  return {
    url: "/vorher-nachher/",
    title: "Vorher / Nachher",
    // Wörtlicher Text lt. Plan hat 178 Zeichen (hartes Gate in
    // tools/pruefen.mjs bei > 170, wie schon bei der Startseite in P2, siehe
    // dort) – kleinstmögliche Korrektur: "gelösten" gestrichen (169 Zeichen),
    // Wortlaut sonst unverändert. Siehe Abschlussbericht, Abschnitt
    // „Abweichungen".
    description:
      "Website des FFV Sportfreunde 04 heute und als Prototyp im Vergleich: Startseite, Menü, Inhaltsrahmen, Mannschaften, Sponsoren, Mitgliedsantrag – je ein Satz zum Problem.",
    inhalt,
  };
}
