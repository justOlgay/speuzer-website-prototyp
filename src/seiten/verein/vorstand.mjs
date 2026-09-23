// Vorstand /verein/vorstand/ (P5) – vier Gruppen (Geschäftsführender
// Vorstand, Jugendleitung, Senioren, Karnevalabteilung) mit Personen-Karten
// aus data/vorstand.json, zugeordnet über das Feld "funktion".

import { mailLink, ruecklink } from "../../vorlagen/hilfen.mjs";
import { personKarte, unbesetztZeile } from "../../vorlagen/bausteine.mjs";

// Diese Seite liegt immer unter "/verein/vorstand/" (Tiefe 2), daher immer
// "../../" (siehe pfadZurWurzel() in tools/build.mjs).
const PFAD = "../../";

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// Personen nach "funktion" gruppieren (Team Jugendleitung kommt zweimal vor).
function gruppierenNachFunktion(vorstand) {
  const map = {};
  for (const p of vorstand ?? []) {
    (map[p.funktion] ??= []).push(p);
  }
  return map;
}

// W9-Korrektur (QA3 1440-11/390-5/390-6/quer-6): ".raster--personen" statt
// ".raster--4" – "raster--4" ist ein auto-fit-Raster, das sich je nach
// Personenzahl anders verteilt (4 Spalten bei 4 Personen, 2 breite Spalten
// bei den Senioren, 3 breite Spalten im Karneval) – ".raster--personen" ist
// jetzt ab 640px ein festes 4-Spalten-Raster mit gleicher Bildgröße, auch
// wenn eine Gruppe nicht voll ist (siehe komponenten.css), und liefert auf
// dem Handy die kompakte Zeilenansicht. Der frühere maxWidth:260px-Zweck von
// ".raster--personen" (der ein einzelnes Kind sonst gestreckt hätte) entfällt
// dadurch – ein fixes Raster streckt leere Spalten nicht.
function gruppenAbschnitt({ titel, funktionen, nachFunktion, daten, hell, prioritaetsSet }) {
  const personen = funktionen.flatMap((f) => nachFunktion[f] ?? []);
  const besetzt = personen.filter((p) => p.name);
  const unbesetzt = personen.filter((p) => !p.name);
  const karten = besetzt
    .map((p) => personKarte(p, daten, { pfad: PFAD, prioritaet: prioritaetsSet.has(p) }))
    .join("\n      ");
  const hellKlasse = hell ? " abschnitt--hell" : "";
  const unbesetztHtml = unbesetzt
    .map((p) => unbesetztZeile(p.funktion === "Schriftführer" ? "Schriftführung" : p.funktion, PFAD))
    .join("\n    ");

  return `<section class="abschnitt${hellKlasse}">
  <div class="container fluss">
    <h2>${escapeHtml(titel)}</h2>
    <div class="raster raster--personen">
      ${karten}
    </div>
    ${unbesetztHtml}
  </div>
</section>`;
}

// W9-Korrektur (QA3 1440-28/390-28): Einleitung war als "Ohne private
// Handynummern." formuliert – interne Regel statt Besuchertext, brach dazu
// mit "Handynummern." allein in Zeile 2. Neuer, kürzerer Wortlaut (Entscheidung
// aus w9-gemeinsam.md). Seitentitel jetzt "Vorstand" (Entscheidung 14,
// Dateiname/URL bleiben /verein/vorstand/).
function seitenkopfAbschnitt() {
  return `<section class="abschnitt seitenkopf">
  <div class="container">
    ${ruecklink(`${PFAD}verein/`, "Verein")}
    <h1>Vorstand</h1>
    <p class="seitenkopf__lead">Wer den Verein führt – erreichbar über die Vereinsadressen.</p>
  </div>
</section>`;
}

// W9-Korrektur (QA3 1440-29/390-3): Der Hinweiskasten stand bisher allein in
// einem fast leeren Abschnitt ganz am Seitenende (wirkte angehängt) und
// brach die Vorstandsadresse am "@" um, während die Geschäftsstellen-Adresse
// in einer Zeile stand – jetzt direkt unter der Einleitung, je Adresse eine
// eigene Zeile ("Vorstand: …" / "Geschäftsstelle: …").
// W9-B-Nachprüfung (390-3 weiterhin offen): Beschriftung und Adresse standen
// noch in derselben Zeile – bei der längeren Geschäftsstellen-Adresse brach
// die Zeile deshalb weiterhin mitten in der Adresse um (am "@", trotz <wbr>
// davor). Jetzt wie im Vorschlag: Beschriftung und Adresse in eigenen
// Zeilen, Adresse mit white-space:nowrap (App-Vorbild: assets/app/
// Vorstand_v3.tpl, #vorstand-hinweis). Die frühere Kopfzeile "Anfragen an
// den Vorstand:" entfällt (die App hat sie auch nicht, die Einleitung
// darüber gibt den Kontext schon).
function hinweisAbschnitt() {
  return `<section class="abschnitt">
  <div class="container">
    <div class="hinweis hinweis--info">
      <p style="margin:0;">Vorstand:</p>
      <p style="margin:0 0 var(--sp-2); white-space:nowrap;">${mailLink("vorstand@sportfreunde04.de")}</p>
      <p style="margin:0;">Geschäftsstelle:</p>
      <p style="margin:0; white-space:nowrap;">${mailLink("geschaeftsstelle@sportfreunde04.de")}</p>
    </div>
  </div>
</section>`;
}

export function seite(daten) {
  const nachFunktion = gruppierenNachFunktion(daten.vorstand);

  const GRUPPEN_DEFINITION = [
    {
      titel: "Geschäftsführender Vorstand",
      funktionen: ["1. Vorsitzende", "2. Vorsitzender", "1. Kassierer", "2. Kassierer", "Schriftführer"],
      hell: false,
    },
    {
      titel: "Jugendleitung",
      funktionen: ["1. Jugendleiter", "2. Jugendleiter", "Team Jugendleitung", "Kinderschutzbeauftragter"],
      hell: true,
    },
    {
      titel: "Senioren",
      funktionen: ["Sportliche Leitung Senioren", "Spielausschuss Senioren"],
      hell: false,
    },
    {
      titel: "Karnevalabteilung",
      funktionen: ["Abteilungsleiter Karneval", "Kassiererin Karneval", "Schriftführerin Karneval"],
      hell: true,
    },
  ];

  // P11, Plan-Abschnitt B3: "die ersten vier Personen-Karten auf
  // /verein/vorstand/" bekommen prioritaet:true – in derselben Reihenfolge,
  // in der die Karten später gerendert werden (Gruppen- und
  // Funktionsreihenfolge wie oben).
  const alleInReihenfolge = GRUPPEN_DEFINITION.flatMap((g) => g.funktionen.flatMap((f) => nachFunktion[f] ?? []));
  const prioritaetsSet = new Set(alleInReihenfolge.slice(0, 4));

  const gruppen = GRUPPEN_DEFINITION.map((g) => gruppenAbschnitt({ ...g, nachFunktion, daten, prioritaetsSet }));

  const inhalt = [
    seitenkopfAbschnitt(),
    hinweisAbschnitt(),
    ...gruppen,
  ].join("\n");

  return {
    url: "/verein/vorstand/",
    title: "Vorstand",
    description:
      "Vorstand des FFV Sportfreunde 04: Vorsitz, Kasse, Jugendleitung, Kinderschutzbeauftragter, Senioren und Karnevalabteilung – mit Funktion und Vereinsmail.",
    inhalt,
  };
}
