// Vorher/Nachher /vorher-nachher/ (P17, aus dem Modul von P10 umgebaut) –
// Begleitseite für den Vorstand: neun Bildpaare Live-Seite/Prototyp in
// appack-Fassung, je mit zwei Zeilen ("Besser:"/"Bleibt:"), dazu eine
// Messtabelle mit vier Spalten (Merkmal, Live heute, appack-Fassung, wer kann
// es ändern) und ein Abschnitt, was nur der Anbieter (appack/vmapit) noch
// ändern kann. Liegt außerhalb der Hülle (docs/index.html) und außerhalb der
// Workspace-Seiten (docs/ws/) – eigene Vorlage src/vorlagen/begleit.html
// (siehe tools/build.mjs), keine Workspace-Umschreibung der Verweise.

import { bild } from "../vorlagen/bild.mjs";
import { datumLang } from "../vorlagen/hilfen.mjs";

// Diese Seite liegt immer unter "/vorher-nachher/" (Tiefe 1), daher immer
// "../" (siehe pfadZurWurzel() in tools/build.mjs). Verweise auf
// Workspace-Seiten schreibt dieses Modul direkt als "${PFAD}ws/<name>.html"
// (P17, Schritt 2) – hier ungenutzt, die Seite verlinkt keine Workspace-Seite.
const PFAD = "../";

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// ---------- Seitenkopf ----------

function seitenkopfAbschnitt(daten) {
  return `<section class="abschnitt seitenkopf">
  <div class="container">
    <h1>Vorher / Nachher</h1>
    <p class="seitenkopf__lead">Links die Website, wie sie heute ist. Rechts der Prototyp in appack-Fassung: dieselbe Vorlage, dieselben Rahmen, aber sechs Menüpunkte, Vollbild-Inhalt und alle Inhalte des Vereins. Zu jedem Paar steht, was besser wird und was gleich bleibt, weil nur der Anbieter es ändern kann.</p>
    <p class="meta">Vorher-Bilder: sportfreunde04.de am 11.09.2026, Fotos mit Kindern unkenntlich gemacht. Nachher-Bilder: Prototyp, Stand ${datumLang(daten.stand)}.</p>
  </div>
</section>`;
}

// ---------- Ein Vergleichspaar ----------
// Bildpaar (Baustein .vergleich, P10, unverändert) und darunter zwei Zeilen
// mit fett gesetztem Vorsatz "Besser:"/"Bleibt:" statt (wie bisher) einem
// einzelnen Fazit-Satz – kein eigener Titel je Paar mehr (P17, Schritt 4
// zählt für jedes Paar nur Bildpaar + zwei Zeilen auf).
function vergleichPaar(daten, { handy, vorher, nachher, besser, bleibt }) {
  const sizes = handy ? "390px" : "(min-width: 768px) 560px, 100vw";
  const vorherHtml = bild({ pfad: PFAD, daten, name: vorher.name, alt: vorher.alt, sizes });
  const nachherHtml = bild({ pfad: PFAD, daten, name: nachher.name, alt: nachher.alt, sizes });

  return `<figure class="vergleich${handy ? " vergleich--handy" : ""}">
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
  <figcaption class="fluss">
    <p><strong>Besser:</strong> ${escapeHtml(besser)}</p>
    <p><strong>Bleibt:</strong> ${escapeHtml(bleibt)}</p>
  </figcaption>
</figure>`;
}

const PAARE = [
  {
    handy: false,
    vorher: {
      name: "vorher-start-desktop",
      alt: "Live-Startseite am Rechner: Foto über die gesamte Breite, Menüleiste mit zwölf Punkten",
    },
    nachher: {
      name: "nachher-start-desktop",
      alt: "Prototyp-Startseite am Rechner in appack-Fassung: Kopfleiste mit Wappen und sechs Menüpunkten über dem Startbild mit dem Satz „Fußball im Gallus – seit 1904.“",
    },
    besser:
      "Sechs Menüpunkte statt zwölf, kein „Mehr“-Ausklapper, Startbild ohne Kinderfotos, aktiver Menüpunkt mit lesbarem Kontrast.",
    bleibt: "Landeansicht aus Bild und Text ohne Inhalt, Ladeanimation vor jedem Aufruf.",
  },
  {
    handy: true,
    vorher: {
      name: "vorher-start-handy",
      alt: "Live-Startseite am Handy: ganzseitiges Foto ohne Text, nur Burger-Menü und Wappen oben",
    },
    nachher: {
      name: "nachher-start-handy",
      alt: "Prototyp-Startseite am Handy in appack-Fassung: Kopfleiste mit Wappen und Burger-Symbol über dem Startbild mit dem Satz „Fußball im Gallus – seit 1904.“",
    },
    besser: "Ruhiges Startbild, kürzerer Text, Menü mit sechs Punkten hinter dem Burger.",
    bleibt: "Inhalt erst nach einem Klick, keine eigene Adresse.",
  },
  {
    handy: true,
    vorher: {
      name: "vorher-menue-handy",
      alt: "Aufgeklapptes Live-Menü am Handy: 13 gleich gestaltete Punkte übereinander, im Hintergrund scheint das Seitenfoto durch",
    },
    nachher: {
      name: "nachher-menue-handy",
      alt: "Aufgeklapptes Prototyp-Menü am Handy in appack-Fassung: sechs Punkte in Weiß und Blau unterhalb der Kopfleiste, „Start“ weiß hervorgehoben",
    },
    besser:
      "Sechs Punkte statt zwölf, keine Doppelungen (Fanshop, Teamshop, Sponsoren, Vorstand, Mach mit, Service werden Unterseiten).",
    bleibt: "Menüpunkte sind keine Links, keine Tastaturbedienung.",
  },
  {
    handy: false,
    vorher: {
      name: "vorher-sportangebote-desktop",
      alt: "Live-Sportangebote am Rechner: zwei Kacheln (Fußball, Karneval), darunter eine große leere Fläche",
    },
    nachher: {
      name: "nachher-mannschaften-desktop",
      alt: "Prototyp-Mannschaftsübersicht am Rechner im Inhaltsrahmen der appack-Fassung: Gruppe Senioren mit der 1. Herrenmannschaft und Trainingszeiten, darunter der Beginn der Gruppe Jugend",
    },
    besser:
      "Inhalt in voller Breite statt in einem 40-Prozent-Rahmen; Trainingszeiten, Jahrgänge und Ansprechpartner auf einer Seite.",
    bleibt: "Feste Rahmenhöhe, die Seite scrollt innen und außen.",
  },
  {
    handy: true,
    vorher: {
      name: "vorher-mannschaften-handy",
      alt: "Live-Mannschaftsliste am Handy: Kacheln mit Trainerfoto und kurzem Text, ohne Trainingszeiten",
    },
    nachher: {
      name: "nachher-mannschaften-handy",
      alt: "Prototyp-Mannschaftsübersicht am Handy im Inhaltsrahmen der appack-Fassung: Gruppe Senioren mit der 1. Herrenmannschaft und Trainingszeiten, darunter der Beginn der Gruppe Jugend",
    },
    besser:
      "Elf Mannschaften absteigend nach Alter, jede mit Trainingstag, Uhrzeit und Platz; keine privaten Telefonnummern.",
    bleibt: "Rahmen 93 Prozent der Bildschirmhöhe, darunter der Fußbereich.",
  },
  {
    handy: false,
    vorher: {
      name: "vorher-vorstand-rahmen-desktop",
      alt: "Live-Unterseite am Rechner: schmaler Inhaltsrahmen in der Seitenmitte mit eigenem Scrollbalken, daneben leere Fläche",
    },
    nachher: {
      name: "nachher-vorstand-desktop",
      alt: "Prototyp-Vorstandsseite am Rechner im Inhaltsrahmen der appack-Fassung: Personenkarten mit Funktion und Vereinsmail",
    },
    besser: "Vorstand mit Funktion und Vereinsmail, Porträts in passender Größe, keine Mobilnummern.",
    bleibt:
      "Menüpunkt bleibt auf „Verein“ stehen, weil die Vorlage Unterseiten nicht kennt; kein Zurück-Knopf.",
  },
  {
    handy: true,
    vorher: {
      name: "vorher-sponsoren-handy",
      alt: "Live-Sponsorenseite am Handy: oberste Kategorie zeigt ein Platzhalterbild, „App-Projektpartner“ erscheint zweimal",
    },
    nachher: {
      name: "nachher-sponsoren-handy",
      alt: "Prototyp-Sponsorenseite am Handy im Inhaltsrahmen der appack-Fassung: Kategorie Partner mit Logos, darunter der Beginn der Kategorie App-Projektpartner",
    },
    besser:
      "Zwei Kategorien statt drei, kein Platzhalter „Hier könnte Ihre Werbung stehen“, Logos verkleinert, „Sponsor werden“ mit Vereinsmail.",
    bleibt: "Erreichbar nur über Verein, nicht über einen eigenen Menüpunkt oder Link.",
  },
  {
    handy: true,
    vorher: {
      name: "vorher-mitglied-werden-handy",
      alt: "Live-Formular am Handy: Antragsformular beginnt direkt mit den persönlichen Angaben, keine Beitragsangaben sichtbar",
    },
    nachher: {
      name: "nachher-mitglied-werden-handy",
      alt: "Prototyp-Seite Mitglied werden am Handy im Inhaltsrahmen der appack-Fassung: Beitragstabelle der Fußballabteilung vor dem Formular",
    },
    besser:
      "Beiträge und Ablauf vor dem Formular, richtige Feldtypen, Datenschutzhinweis, SEPA-Text, Erziehungsberechtigte.",
    bleibt: "Das Formular des Prototyps versendet nichts; das echte Formular bleibt das appack-Modul.",
  },
  {
    handy: true,
    vorher: {
      name: "vorher-service-handy",
      alt: "Live-Serviceseite am Handy: drei unterschiedlich gestaltete Kacheln, eine mit KI-Wasserzeichen und dem Tippfehler „Mitgliedsbescheinigugen“",
    },
    nachher: {
      name: "nachher-downloads-handy",
      alt: "Prototyp-Downloadseite am Handy im Inhaltsrahmen der appack-Fassung: einheitliche Liste mit Dateiformat, Größe und Seitenzahl je Dokument",
    },
    besser: "Downloads mit Größe und Seitenzahl, kein KI-Bild, kein Tippfehler.",
    bleibt: "Impressum und Datenschutz öffnen weiterhin im schmalen Rahmen der Vorlage.",
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

// ---------- Was messbar ist ----------
// {{LH_MIN}}/{{LH_N}} aus data/lighthouse.json (daten.lighthouse, siehe
// ladeDaten() in tools/build.mjs) – Minimum der vier Kategorien als
// "P / A / BP / SEO" und Seitenzahl (P17, Schritt 4). Gleiches Datenfeld wie
// src/seiten/styleguide.mjs#seitePruefung().
// P18: exportiert, damit tools/vorstand-pdf/texte.mjs dieselbe Messtabelle
// importieren kann (Kapitel 3 des Vorstandsdokuments).
export const MESSBAR_ZEILEN = [
  { merkmal: "Menüpunkte", live: "12, dazu „Mehr“", appack: "6", wer: "Verein im CMS (MENU)" },
  {
    merkmal: "Trainingszeiten",
    live: "0 Mannschaften",
    appack: "11 Mannschaften",
    wer: "Verein (Workspace-Seiten)",
  },
  {
    merkmal: "Inhaltsbreite Desktop",
    live: "40 % der Fensterbreite (576 px bei 1440 px)",
    appack: "100 %",
    wer: "Verein im CMS (menuFullscreen)",
  },
  {
    merkmal: "Rahmenhöhe",
    live: "fest 87 % der Fensterhöhe, zwei Scrollbereiche",
    appack: "fest 92 %, zwei Scrollbereiche",
    wer: "nur vmapit",
  },
  {
    merkmal: "Eigene Adresse je Seite, Zurück-Knopf, Lesezeichen",
    live: "nein",
    appack: "nein (Direktlinks ohne Menü)",
    wer: "nur vmapit",
  },
  { merkmal: "Landeansicht mit Inhalt", live: "nein", appack: "nein", wer: "nur vmapit" },
  {
    merkmal: "Kontrast aktiver Menüpunkt",
    live: "2,3:1 (weiß auf #9e9cf0)",
    appack: "12,3:1 (#191793 auf weiß)",
    wer: "Verein im CMS (START)",
  },
  {
    merkmal: "Tippziele im Inhalt",
    live: "26 × 17 px",
    appack: "mindestens 44 × 44 px",
    wer: "Verein (Workspace-Seiten)",
  },
  {
    merkmal: "Bilder",
    live: "bis 1500 px für 150 px Anzeige",
    appack: "höchstens 200 KB, passende Größen",
    wer: "Verein (Mediathek/Workspace)",
  },
  {
    merkmal: "lang, Überschrift, Meta an sportfreunde04.de",
    live: "nein",
    appack: "nein",
    wer: "nur vmapit",
  },
  {
    merkmal: "Lighthouse mobil sportfreunde04.de",
    live: "33 / 50 / 78 / 82 (14.09.2026)",
    appack: "unverändert (Vorlage)",
    wer: "nur vmapit",
  },
  {
    merkmal: "Lighthouse mobil Workspace- und Begleitseiten per Direktlink",
    live: "keine eigenen Seiten",
    appackFn: (daten) => {
      const lh = daten.lighthouse;
      if (!lh) return "–";
      const min = lh.minimum ?? {};
      return `${min.performance} / ${min.accessibility} / ${min.bestPractices} / ${min.seo} (Minimum über ${lh.seiten?.length ?? 0} Seiten)`;
    },
    wer: "Verein",
  },
  {
    merkmal: "Private Mobilnummern öffentlich",
    live: "19 (Stand 11.09.2026)",
    appack: "0",
    wer: "Verein im CMS",
  },
  {
    merkmal: "Fußzeile",
    live: "„© appack 2026“",
    appack: "„© F.F.V. Sportfreunde 04, 2026“",
    wer: "Verein im CMS (FOOTER)",
  },
];

function messbarAbschnitt(daten) {
  const zeilen = MESSBAR_ZEILEN.map((z) => {
    const appackText = z.appackFn ? z.appackFn(daten) : z.appack;
    return `<tr>
          <td>${escapeHtml(z.merkmal)}</td>
          <td>${escapeHtml(z.live)}</td>
          <td>${escapeHtml(appackText)}</td>
          <td>${escapeHtml(z.wer)}</td>
        </tr>`;
  }).join("\n        ");

  return `<section class="abschnitt--hell abschnitt">
  <div class="container fluss">
    <h2>Was messbar ist</h2>
    <div class="tabelle-wrap">
      <table>
        <thead>
          <tr>
            <th>Merkmal</th>
            <th>Live heute</th>
            <th>appack-Fassung</th>
            <th>Wer kann es ändern</th>
          </tr>
        </thead>
        <tbody>
        ${zeilen}
        </tbody>
      </table>
    </div>
    <p class="meta">Die Werte der Adresse sportfreunde04.de bestimmt die appack-Vorlage. Der Prototyp verspricht dort nichts, was der Verein nicht selbst im CMS oder im Workspace anlegen kann.</p>
  </div>
</section>`;
}

// ---------- Was nur der Anbieter ändern kann ----------

const ANBIETER_PUNKTE = [
  "Eigene Adresse je Seite und Zurück-Knopf",
  "Landeansicht mit Inhalt",
  "Rahmen, der mit dem Inhalt wächst",
  "Menü als echte Links mit Tastaturbedienung",
  "lang, Überschriften, Meta-Angaben und Vorschaubild an der Vereinsadresse",
  "Impressum und Datenschutz als eigene Adressen",
  "Suchmaschinen-Freigabe für Workspace-Seiten (cdn.appack.de/robots.txt sperrt sie)",
];

function anbieterAbschnitt() {
  const punkte = ANBIETER_PUNKTE.map((p) => `<li>${escapeHtml(p)}</li>`).join("\n      ");
  return `<section class="abschnitt">
  <div class="container fluss">
    <h2>Was nur der Anbieter ändern kann</h2>
    <ul role="list">
      ${punkte}
    </ul>
  </div>
</section>`;
}

export function seite(daten) {
  const inhalt = [
    seitenkopfAbschnitt(daten),
    vergleicheAbschnitt(daten),
    messbarAbschnitt(daten),
    anbieterAbschnitt(),
  ].join("\n");

  return {
    url: "/vorher-nachher/",
    title: "Vorher / Nachher",
    description:
      "Neun Bildpaare Live-Seite gegen Prototyp in appack-Fassung, dazu eine Messtabelle: was besser wird, was gleich bleibt und was nur appack/vmapit noch ändern kann.",
    inhalt,
  };
}
