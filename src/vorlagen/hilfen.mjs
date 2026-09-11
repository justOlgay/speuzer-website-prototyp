// Gemeinsame Hilfsfunktionen (P2) – Datum/Zeit-Formatierung, Spiel-Zeile,
// Trainings-Zeile, Mail-Link. Bewusst ohne Abhängigkeiten (auch nicht zu
// bild.mjs): bild() wird weiterhin direkt aus "./bild.mjs" importiert, wo es
// gebraucht wird.
//
// teaser()/absaetze() (P2-K4, hierher verschoben in P6): ursprünglich lokal in
// src/seiten/index.mjs definiert. Für /news/ (P6) muss "dieselbe
// teaser()-Funktion" (siehe Plan-Abschnitt E) auf der Startseite und den
// News-Seiten verwendet werden – daher jetzt hier zentral, index.mjs
// importiert sie von hier statt einer eigenen Kopie.

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// ---------- Probetraining (P2, ab P3 auch auf /mannschaften/ verwendet) ----------

export const PROBETRAINING_MAILTO =
  "mailto:jugendleitung@sportfreunde04.de?subject=Probetraining%20beim%20FFV%20Sportfreunde%2004&body=Hallo%2C%0A%0Awir%20interessieren%20uns%20f%C3%BCr%20ein%20Probetraining.%0AJahrgang%20des%20Kindes%3A%20%0AVorerfahrung%3A%20%0A%0AViele%20Gr%C3%BC%C3%9Fe";

// ---------- Jahrgang-Anzeige ----------

// Die Herren haben kein Jahrgang-Feld (kategorie "Senioren", jahrgang null) –
// dort erscheint "Senioren" statt "–" (P3, Korrektur A1). Sonst unverändert.
export function jahrgangText(team) {
  if (team?.kategorie === "Senioren") return "Senioren";
  return team?.jahrgang ?? "–";
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

// "September 2026" (P4)
export function monatName(iso) {
  const d = alsDatum(iso);
  return `${MONATE_LANG[d.getMonth()]} ${d.getFullYear()}`;
}

// Vergangen = Datum liegt vor dem Stand-Tag (heutiges Datum zählt noch nicht
// als vergangen, siehe naechsteSpiele(), das denselben Tag noch als kommend
// behandelt) (P4).
export function istVergangen(spiel, stand) {
  const heute = String(stand ?? "").slice(0, 10);
  return String(spiel?.datum ?? "") < heute;
}

// Tag-Text für den Wettbewerb, sonst null bei "Meisterschaft" (P4).
export function wettbewerbTag(spiel) {
  const w = spiel?.wettbewerb ?? "";
  if (w.includes("Pokal")) return "Pokal";
  if (w.includes("Freundschaft")) return "Freundschaftsspiel";
  if (w.includes("Kinderfestival")) return "Kinderfestival";
  return null;
}

// Tabellen-Link auf fussball.de für ein Team, nur wenn fussballde_id bekannt (P4).
export function fussballdeTeamUrl(team) {
  if (!team?.fussballde_id) return null;
  return `https://www.fussball.de/mannschaft/x/-/saison/2627/team-id/${team.fussballde_id}`;
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
export function spielZeile(spiel, { pfad, mitTeam, naechstes, ohneDatum, vergangen } = {}) {
  const tagKlasse = spiel.heimspiel ? "tag--heim" : "tag--auswaerts";
  const tagText = spiel.heimspiel ? "Heim" : "Auswärts";
  const klassen = [
    "spiel",
    naechstes ? "spiel--naechstes" : null,
    vergangen ? "spiel--vergangen" : null,
    spiel.entfaellt ? "spiel--entfaellt" : null,
  ]
    .filter(Boolean)
    .join(" ");

  const ort = spiel.spielstaette ? escapeHtml(spiel.spielstaette) : "Ort folgt";
  const teamTag =
    mitTeam && spiel.teamName ? `<span class="tag">${escapeHtml(spiel.teamName)}</span> ` : "";

  // Kinderfestivals ohne festen Gegner (Feld "gegner" leer): benennen statt
  // leer lassen (P2-K/K2). "heim" ist dann der gastgebende Verein.
  const istKinderfestivalOhneGegner = !spiel.gegner && spiel.wettbewerb === "Kinderfestival";
  const gegnerText = istKinderfestivalOhneGegner
    ? spiel.heimspiel
      ? "Kinderfestival – Heimspieltag"
      : `Kinderfestival bei ${spiel.heim ?? ""}`
    : spiel.gegner ?? "";

  // Der Wettbewerbs-Zusatz entfällt, wenn "Kinderfestival" schon im Titel steht (K2).
  const wettbewerbZusatz =
    !istKinderfestivalOhneGegner && spiel.wettbewerb && spiel.wettbewerb !== "Meisterschaft"
      ? `<span class="meta spiel__wettbewerb">${escapeHtml(spiel.wettbewerb)}</span>`
      : "";

  // Kein Strich mehr bei fehlendem Ergebnis – leere Spalte (K3). Bei
  // vergangenen Spielen ohne Ergebnis stattdessen ein Textlink auf
  // FUSSBALL.DE, wenn vorhanden (P4) – kein Ergebnis wird erfunden. Als
  // .meta-Link (Inter, --fs-sm, --blau-700, Unterstrich nur bei Hover/Fokus)
  // statt in der großen Ergebnis-Schrift (P5, Korrektur A2) – siehe
  // ".spiel__ergebnis a" in komponenten.css.
  const ergebnisInhalt = spiel.entfaellt
    ? `<span class="spiel__hinweis">entfällt</span>`
    : spiel.ergebnis
      ? escapeHtml(spiel.ergebnis)
      : vergangen && spiel.fussballde_link
        ? `<a class="meta" href="${escapeHtml(spiel.fussballde_link)}" rel="noopener" target="_blank">Ergebnis auf FUSSBALL.DE</a>`
        : "";

  // Bei ohneDatum:true nur die Uhrzeit (das Datum steht schon in der
  // umschließenden Zwischenüberschrift, siehe /spielplan/, P4).
  const datumInhalt = ohneDatum ? zeit(spiel.zeit) : `${datumKurz(spiel.datum)} · ${zeit(spiel.zeit)}`;

  return `<li class="${klassen}">
      <span class="spiel__datum">${datumInhalt}</span>
      <span class="tag ${tagKlasse}">${tagText}</span>
      <span class="spiel__gegner-block">
        <span class="spiel__gegner">${teamTag}${escapeHtml(gegnerText)}</span>
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

// ---------- Teaser- und Absatz-Regel (P2-K4, ab P6 auch auf /news/) ----------

function istKomplettVersal(text) {
  const buchstaben = text.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, "");
  return buchstaben.length > 0 && buchstaben === buchstaben.toUpperCase() && buchstaben !== buchstaben.toLowerCase();
}

// Text in Sätze zerlegen: "." "!" "?" zählen nur als Satzende, wenn ihnen ein
// Leerzeichen/Textende folgt (sonst z. B. "19.09.2026" mitten im Satz) und
// ihnen kein einzelner Buchstabe nach einem Punkt/Leerzeichen vorausgeht
// (Abkürzungen wie "F.F.V." oder "e.V.").
function teiltSaetze(text) {
  const saetze = [];
  let start = 0;
  const re = /[.!?]+/g;
  let treffer;
  while ((treffer = re.exec(text))) {
    const ende = treffer.index + treffer[0].length;
    const danach = text.slice(ende, ende + 1);
    if (danach !== "" && !/\s/.test(danach)) continue;

    const davor1 = text[treffer.index - 1] ?? "";
    const davor2 = text[treffer.index - 2] ?? "";
    const istAbkuerzung =
      /[A-Za-zÀ-ÖØ-öø-ÿ]/.test(davor1) && (davor2 === "" || davor2 === "." || /\s/.test(davor2));
    if (istAbkuerzung) continue;

    saetze.push(text.slice(start, ende).trim());
    start = ende;
  }
  const rest = text.slice(start).trim();
  if (rest) saetze.push(rest);
  return saetze;
}

// Ersten Satz, der (a) nicht komplett in Versalien steht und (b) mindestens
// 40 Zeichen hat; Ausrufezeichen-Ketten auf eines gekürzt; auf `max` Zeichen
// an Wortgrenze mit „…" gekürzt.
export function teaser(text, max = 160) {
  const bereinigt = String(text ?? "")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, "")
    .replace(/!{2,}/g, "!")
    .replace(/\s+/g, " ")
    .trim();

  const saetze = teiltSaetze(bereinigt);
  let gewaehlt =
    saetze.find((s) => s.length >= 40 && !istKomplettVersal(s)) ??
    saetze.find((s) => s.length > 0) ??
    bereinigt;

  if (gewaehlt.length > max) {
    const abschnitt = gewaehlt.slice(0, max);
    const letzterRaum = abschnitt.lastIndexOf(" ");
    gewaehlt = (letzterRaum > 0 ? abschnitt.slice(0, letzterRaum) : abschnitt).trim() + "…";
  }
  return gewaehlt;
}

// ---------- Absätze (P6) ----------

// Für die Artikelseiten /news/<slug>/ (kein Feld "absaetze" in news.json,
// siehe Plan-Abschnitt B): Text an Satzenden aufteilen, jeweils 2–3 Sätze je
// Absatz. Regel: neuer Absatz nach jedem zweiten Satzende – außer der Rest ab
// dort ist kürzer als 60 Zeichen, dann bleibt der dritte Satz noch im
// laufenden Absatz (kein einsamer Kurz-Absatz am Ende).
export function absaetze(text) {
  const bereinigt = String(text ?? "").replace(/\s+/g, " ").trim();
  const saetze = teiltSaetze(bereinigt);
  const ergebnis = [];
  let laufend = [];

  for (let i = 0; i < saetze.length; i++) {
    laufend.push(saetze[i]);
    const restLaenge = saetze.slice(i + 1).join(" ").length;
    // Nach dem zweiten Satz schließen, wenn der Rest noch ≥ 60 Zeichen hat
    // (sonst wandert der dritte Satz noch mit in diesen Absatz); spätestens
    // nach dem dritten Satz wird in jedem Fall geschlossen ("jeweils 2–3
    // Sätze je <p>").
    if ((laufend.length === 2 && restLaenge >= 60) || laufend.length === 3) {
      ergebnis.push(laufend.join(" "));
      laufend = [];
    }
  }
  if (laufend.length) ergebnis.push(laufend.join(" "));
  return ergebnis;
}
