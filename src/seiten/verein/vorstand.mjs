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

// W8-Korrektur: 4er-Raster auf volle Containerbreite (.raster--4 statt des
// engeren .raster--personen, das Karten auf max. 260px begrenzt und linksbündig
// stehen lässt). Der Eintrag "Schriftführer" hat name:null (unbesetzt) – der
// bekommt keine Karte mehr, sondern eine eigene Textzeile (unbesetztZeile()).
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
    <div class="raster raster--4">
      ${karten}
    </div>
    ${unbesetztHtml}
  </div>
</section>`;
}

function seitenkopfAbschnitt() {
  return `<section class="abschnitt seitenkopf">
  <div class="container">
    ${ruecklink(`${PFAD}verein/`, "Verein")}
    <h1>Vorstand &amp; Kontakt</h1>
    <p class="seitenkopf__lead">Wer den Verein führt. Der Kontakt läuft über die Vereinsadressen – ohne private Handynummern.</p>
  </div>
</section>`;
}

function hinweisAbschnitt() {
  return `<section class="abschnitt">
  <div class="container">
    <div class="hinweis hinweis--info">
      <p style="margin:0;">Anfragen an den Vorstand: ${mailLink("vorstand@sportfreunde04.de")} · Geschäftsstelle: ${mailLink("geschaeftsstelle@sportfreunde04.de")}</p>
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
      funktionen: ["Abteilungsleiter Karneval", "Kassiererin Abteilung Karneval", "Schriftführerin Abteilung Karneval"],
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
    ...gruppen,
    hinweisAbschnitt(),
  ].join("\n");

  return {
    url: "/verein/vorstand/",
    title: "Vorstand & Kontakt",
    description:
      "Vorstand & Kontakt des FFV Sportfreunde 04: Vorsitz, Kasse, Jugendleitung, Kinderschutzbeauftragter, Senioren und Karnevalabteilung – mit Funktion und Vereinsmail.",
    inhalt,
  };
}
