// Navigationsdaten – Kopfzeile (Hauptnavigation) und Fußbereich (P1).
// Zwischenstand ohne tote Links: build.mjs kennt nach dem Sammeln aller
// Seitenmodule die Liste der existierenden URLs und übergibt sie an
// header()/footer(). Ein Eintrag, dessen URL (noch) nicht existiert, wird
// dort als <span class="nav__bald"> statt als Link ausgegeben – sobald die
// Seite existiert, wird automatisch ein Link daraus.

export const HAUPT = [
  { titel: "Start", url: "/" },
  { titel: "Mannschaften", url: "/mannschaften/" },
  { titel: "Spielplan & Tabellen", url: "/spielplan/" },
  { titel: "News", url: "/news/" },
  { titel: "Verein", url: "/verein/" },
  { titel: "Mitglied werden", url: "/mitglied-werden/", knopf: true },
];

export const FUSS = [
  {
    gruppe: "Verein",
    links: [
      { titel: "Wer wir sind", url: "/verein/" },
      { titel: "Vorstand", url: "/verein/vorstand/" },
      { titel: "Sponsoren & Partner", url: "/verein/sponsoren/" },
      { titel: "Mach mit", url: "/verein/mach-mit/" },
      { titel: "Downloads", url: "/verein/downloads/" },
    ],
  },
  {
    gruppe: "Sport",
    links: [
      { titel: "Mannschaften & Training", url: "/mannschaften/" },
      { titel: "Spielplan", url: "/spielplan/" },
      { titel: "Tabellen", url: "/tabellen/" },
      { titel: "News", url: "/news/" },
      { titel: "Mitglied werden", url: "/mitglied-werden/" },
    ],
  },
  {
    gruppe: "Service",
    links: [
      { titel: "Kontakt & Anfahrt", url: "/kontakt/" },
      { titel: "Shop", url: "/shop/" },
      { titel: "App-Ansicht", url: "/app/" },
      { titel: "Vorher / Nachher", url: "/vorher-nachher/" },
      { titel: "Impressum", url: "/impressum/" },
      { titel: "Datenschutz", url: "/datenschutz/" },
    ],
  },
];
