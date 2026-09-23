// Weiterleitung /spielplan/ -> /mannschaften/ (W6, Entscheidung Olgay
// 23.09.2026): Spielplan und Tabelle gibt es nur noch je Mannschaftsseite,
// keine eigene Sammelseite mehr dafür. Diese Seite bleibt unter demselben
// Workspace-Namen (spielplan.html) bestehen, damit alte Verweise nicht ins
// Leere laufen, leitet aber sofort auf /mannschaften/ weiter. Logik in
// src/vorlagen/weiterleitung.mjs (gemeinsam mit spielplan/team.mjs und
// tabellen.mjs, keine doppelte Logik).

import { weiterleitungsSeite } from "../../vorlagen/weiterleitung.mjs";

// Diese Seite liegt immer unter "/spielplan/" (Tiefe 1), daher immer "../"
// (siehe pfadZurWurzel() in tools/build.mjs).
const PFAD = "../";

export function seite() {
  return weiterleitungsSeite({
    vonUrl: "/spielplan/",
    pfad: PFAD,
    zuPfadTeil: "mannschaften/",
    zuUrl: "/mannschaften/",
    zuTitel: "Mannschaften",
  });
}
