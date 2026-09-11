// Gemeinsame Hilfsfunktionen (P2) – Datum/Zeit-Formatierung, Spiel-Zeile,
// Trainings-Zeile, Mail-Link. Bewusst ohne Abhängigkeiten (auch nicht zu
// bild.mjs): bild() wird weiterhin direkt aus "./bild.mjs" importiert, wo es
// gebraucht wird.

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// ---------- Datum und Zeit ----------

const WOCHENTAGE_KURZ = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"]; // Index = Date#getDay()
const WOCHENTAGE_LANG = [
  "Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag",
];
const MONATE_LANG = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

function alsDatum(iso) {
  // akzeptiert sowohl "YYYY-MM-DD" als auch volle ISO-Zeitstempel (z. B. daten.stand)
  return new Date(`${String(iso).slice(0, 10)}T00:00:00`);
}

// "Sa 13.09."
export function datumKurz(iso) {
  const d = alsDatum(iso);
  const tag = WOCHENTAGE_KURZ[d.getDay()];
  const tt = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${tag} ${tt}.${mm}.`;
}

// "Samstag, 13. September 2026"
export function datumLang(iso) {
  const d = alsDatum(iso);
  const tag = WOCHENTAGE_LANG[d.getDay()];
  const monat = MONATE_LANG[d.getMonth()];
  return `${tag}, ${d.getDate()}. ${monat} ${d.getFullYear()}`;
}

// "10:00 Uhr"
export function zeit(hhmm) {
  return `${hhmm} Uhr`;
}

// ---------- Mail-Link mit <wbr> vor "@" und vor jedem "." danach ----------

export function mailLink(adresse, text) {
  const anzeigeRoh = text ?? adresse ?? "";
  const anzeigeEscaped = escapeHtml(anzeigeRoh);
  const atIndex = anzeigeEscaped.indexOf("@");
  let anzeige = anzeigeEscaped;
  if (atIndex !== -1) {
    const vorAt = anzeigeEscaped.slice(0, atIndex);
    const nachAt = anzeigeEscaped.slice(atIndex + 1).replaceAll(".", "<wbr>.");
    anzeige = `${vorAt}<wbr>@${nachAt}`;
  }
  return `<a class="mail" href="mailto:${escapeHtml(adresse ?? "")}">${anzeige}</a>`;
}

// ---------- Nächste Spiele ----------

// daten.spiele mit datum >= ab (Standard: daten.stand als YYYY-MM-DD), nicht
// entfaellt, sortiert nach datum+zeit, optional nach Team gefiltert, auf
// `anzahl` gekürzt. Ergänzt teamName (Kürzel aus daten.teams) und teamSlug.
export function naechsteSpiele(daten, { ab, anzahl, team } = {}) {
  const abDatum = ab ?? (daten.stand ? String(daten.stand).slice(0, 10) : "0000-00-00");
  const teamNachSlug = Object.fromEntries((daten.teams ?? []).map((t) => [t.slug, t]));

  let spiele = (daten.spiele ?? []).filter((s) => !s.entfaellt && s.datum >= abDatum);
  if (team) spiele = spiele.filter((s) => s.team === team);
  spiele = spiele
    .slice()
    .sort((a, b) => (a.datum + a.zeit).localeCompare(b.datum + b.zeit));
  if (typeof anzahl === "number") spiele = spiele.slice(0, anzahl);

  return spiele.map((s) => ({
    ...s,
    teamName: teamNachSlug[s.team]?.kurz ?? s.team,
    teamSlug: s.team,
  }));
}

// ---------- Spiel-Zeile ----------

// HTML einer .spiel-Zeile (Klassen aus P1). `pfad` wird für zukünftige
// Verlinkung (z. B. Team-Seiten, sobald diese existieren) entgegengenommen,
// in P2 aber noch nicht verwendet – die Ziel-Seiten gibt es noch nicht, und
// ohne bekannte seitenUrls ließe sich ein toter Link nicht verlässlich
// vermeiden.
export function spielZeile(spiel, { pfad, mitTeam, naechstes } = {}) {
  const tagKlasse = spiel.heimspiel ? "tag--heim" : "tag--auswaerts";
  const tagText = spiel.heimspiel ? "Heim" : "Auswärts";
  const klassen = [
    "spiel",
    naechstes ? "spiel--naechstes" : null,
    spiel.entfaellt ? "spiel--entfaellt" : null,
  ]
    .filter(Boolean)
    .join(" ");

  const ort = spiel.spielstaette ? escapeHtml(spiel.spielstaette) : "Ort folgt";
  const teamTag =
    mitTeam && spiel.teamName ? `<span class="tag">${escapeHtml(spiel.teamName)}</span> ` : "";
  const wettbewerbZusatz =
    spiel.wettbewerb && spiel.wettbewerb !== "Meisterschaft"
      ? `<span class="meta spiel__wettbewerb">${escapeHtml(spiel.wettbewerb)}</span>`
      : "";
  const ergebnisInhalt = spiel.entfaellt
    ? `<span class="spiel__hinweis">entfällt</span>`
    : escapeHtml(spiel.ergebnis) || "–";

  return `<li class="${klassen}">
      <span class="spiel__datum">${datumKurz(spiel.datum)} · ${zeit(spiel.zeit)}</span>
      <span class="tag ${tagKlasse}">${tagText}</span>
      <span class="spiel__gegner-block">
        <span class="spiel__gegner">${teamTag}${escapeHtml(spiel.gegner ?? "")}</span>
        <span class="spiel__ort meta">${ort}</span>
        ${wettbewerbZusatz}
      </span>
      <span class="spiel__ergebnis">${ergebnisInhalt}</span>
    </li>`;
}

// ---------- Trainings-Zeilen ----------

// Liste von <li class="training"> aus team.training + team.platz, zum
// Einsetzen in ein umschließendes <ul class="trainings" role="list">.
export function trainingsZeilen(team) {
  return (team?.training ?? [])
    .map(
      (t) => `<li class="training">
      <span class="training__tag">${escapeHtml(t.tag)}</span>
      <span class="training__zeit">${escapeHtml(t.von)}–${escapeHtml(t.bis)} Uhr</span>
      <span class="training__platz">${escapeHtml(team.platz ?? "")}</span>
    </li>`
    )
    .join("\n    ");
}
