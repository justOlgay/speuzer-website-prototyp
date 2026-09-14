// Vorstand /verein/vorstand/ (P5) – vier Gruppen (Geschäftsführender
// Vorstand, Jugendleitung, Senioren, Karnevalabteilung) mit Personen-Karten
// aus data/vorstand.json, zugeordnet über das Feld "funktion".

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bild } from "../../vorlagen/bild.mjs";
import { mailLink } from "../../vorlagen/hilfen.mjs";

// Diese Seite liegt immer unter "/verein/vorstand/" (Tiefe 2), daher immer
// "../../" (siehe pfadZurWurzel() in tools/build.mjs).
const PFAD = "../../";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

function liesWappenBlau() {
  return readFileSync(path.join(ROOT, "assets", "logo", "wappen-blau.svg"), "utf8");
}

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// Personen-Karte – mit Foto oder Wappen-Platzhalter bei --blau-100 (siehe
// .person__bild--platzhalter in komponenten.css). Der Eintrag "Schriftführer"
// hat name: null – dann steht "derzeit nicht besetzt" statt des Namens.
// prioritaet (P11, Plan-Abschnitt B3): für die ersten vier Personen-Karten
// dieser Seite gesetzt (siehe seite() unten, prioritaetsSet).
function personKarte(person, daten, { prioritaet = false } = {}) {
  const bildHtml = person?.foto
    ? bild({
        pfad: PFAD,
        daten,
        name: person.foto.quelle,
        alt: person.name ? `Porträt ${person.name}` : "",
        sizes: "(min-width: 640px) 260px, 50vw",
        klasse: "person__bild",
        prioritaet,
      })
    : `<span class="person__bild person__bild--platzhalter" aria-hidden="true">${liesWappenBlau()}</span>`;
  const nameHtml = person?.name ? escapeHtml(person.name) : "derzeit nicht besetzt";
  const mailHtml = person?.mail ? `<p class="person__mail">${mailLink(person.mail)}</p>` : "";

  return `<div class="person">
      ${bildHtml}
      <p class="person__name">${nameHtml}</p>
      <p class="person__funktion">${escapeHtml(person?.funktion ?? "")}</p>
      ${mailHtml}
    </div>`;
}

// Personen nach "funktion" gruppieren (Team Jugendleitung kommt zweimal vor).
function gruppierenNachFunktion(vorstand) {
  const map = {};
  for (const p of vorstand ?? []) {
    (map[p.funktion] ??= []).push(p);
  }
  return map;
}

function gruppenAbschnitt({ titel, funktionen, nachFunktion, daten, hell, prioritaetsSet }) {
  const personen = funktionen.flatMap((f) => nachFunktion[f] ?? []);
  const karten = personen
    .map((p) => personKarte(p, daten, { prioritaet: prioritaetsSet.has(p) }))
    .join("\n      ");
  const hellKlasse = hell ? " abschnitt--hell" : "";

  return `<section class="abschnitt${hellKlasse}">
  <div class="container fluss">
    <h2>${escapeHtml(titel)}</h2>
    <div class="raster raster--personen">
      ${karten}
    </div>
  </div>
</section>`;
}

function seitenkopfAbschnitt() {
  return `<section class="abschnitt seitenkopf">
  <div class="container">
    <h1>Vorstand</h1>
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

  const inhalt = [seitenkopfAbschnitt(), ...gruppen, hinweisAbschnitt()].join("\n");

  return {
    url: "/verein/vorstand/",
    title: "Vorstand",
    description:
      "Der Vorstand des FFV Sportfreunde 04: Vorsitz, Kasse, Jugendleitung, Kinderschutzbeauftragter, Senioren und Karnevalabteilung – mit Funktion und Vereinsmail.",
    inhalt,
  };
}
