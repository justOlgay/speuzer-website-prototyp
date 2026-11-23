// Weiterleitung /spielplan/<slug>/ -> /mannschaften/<slug>/ (W6, Entscheidung
// Olgay 23.09.2026): "Spielplan der Saison" und "Tabelle" stehen jetzt auf
// der Mannschaftsseite des Teams (siehe src/seiten/mannschaften/team.mjs).
// Diese Seiten bleiben unter denselben Workspace-Namen
// (spielplan-<slug>.html) bestehen, damit alte Verweise nicht ins Leere
// laufen, leiten aber sofort weiter. Logik in src/vorlagen/weiterleitung.mjs
// (gemeinsam mit spielplan/index.mjs und tabellen.mjs, keine doppelte
// Logik).
// 23.11.2026 (Soma, Entscheidung E7): Mannschaften mit "freizeit": true (Soma) hatten nie einen Spielplan auf der Website,
// es gibt also auch keine alten Verweise, die weiterzuleiten wären – für sie entsteht keine Weiterleitungsseite.

import { weiterleitungsSeite } from "../../vorlagen/weiterleitung.mjs";

// Diese Seiten liegen immer unter "/spielplan/<slug>/" (Tiefe 2), daher immer
// "../../" (siehe pfadZurWurzel() in tools/build.mjs).
const PFAD = "../../";

function seiteFuerTeam(team) {
  return weiterleitungsSeite({
    vonUrl: `/spielplan/${team.slug}/`,
    pfad: PFAD,
    zuPfadTeil: `mannschaften/${team.slug}/`,
    zuUrl: `/mannschaften/${team.slug}/`,
    zuTitel: team.name,
  });
}

export function seiten(daten) {
  return (daten.teams ?? []).filter((team) => !team.freizeit).map(seiteFuerTeam);
}
