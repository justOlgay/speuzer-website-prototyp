// Weiterleitung /tabellen/ -> /mannschaften/ (W6, Entscheidung Olgay
// 23.09.2026): keine eigene Tabellen-Sammelseite mehr, jede Tabelle steht auf
// der jeweiligen Mannschaftsseite. Diese Seite bleibt unter demselben
// Workspace-Namen (tabellen.html) bestehen, damit alte Verweise nicht ins
// Leere laufen, leitet aber sofort auf /mannschaften/ weiter. Logik in
// src/vorlagen/weiterleitung.mjs (gemeinsam mit spielplan/index.mjs und
// spielplan/team.mjs, keine doppelte Logik).

import { weiterleitungsSeite } from "../vorlagen/weiterleitung.mjs";

// Diese Seite liegt immer unter "/tabellen/" (Tiefe 1), daher immer "../"
// (siehe pfadZurWurzel() in tools/build.mjs).
const PFAD = "../";

export function seite() {
  return weiterleitungsSeite({
    vonUrl: "/tabellen/",
    pfad: PFAD,
    zuPfadTeil: "mannschaften/",
    zuUrl: "/mannschaften/",
    zuTitel: "Mannschaften",
  });
}
